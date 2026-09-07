// Photonic mobile — Service Worker
// Intercepts /api/* requests and serves them from a local backend implemented
// in JS with SQLite (sql.js / WASM). Native operations (photo library scan,
// EXIF, thumbnails) are delegated to the page, which routes them to the
// native Capacitor bridge.
"use strict";

const CACHE = "photonic-v1";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.png"];

const VENDOR_JS = [
  "./vendor/leaflet/leaflet.js",
  "./vendor/leaflet-markercluster/leaflet.markercluster.js",
  "./vendor/chartjs/chart.umd.js",
  "./vendor/lucide/lucide.min.js",
  "./vendor/pannellum/pannellum.js",
  "./vendor/sqljs/sql-wasm.js",
];
const VENDOR_CSS = [
  "./vendor/leaflet/leaflet.css",
  "./vendor/leaflet-markercluster/MarkerCluster.css",
  "./vendor/leaflet-markercluster/MarkerCluster.Default.css",
  "./vendor/pannellum/pannellum.css",
];

// ---------------------------------------------------------------------------
// Install / activate
// ---------------------------------------------------------------------------
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.concat(VENDOR_JS, VENDOR_CSS)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  const keep = [CACHE];
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (keep.includes(k) ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

const isApiRequest = (url) => url.pathname.startsWith("/api/");
const isThumbRequest = (url) => /\/api\/photos\/\d+\/thumb\//.test(url.pathname);
const isRawRequest = (url) => /\/api\/photos\/\d+\/raw$/.test(url.pathname);
const isStreamRequest = (url) => /\/api\/photos\/\d+\/stream$/.test(url.pathname);

// ---------------------------------------------------------------------------
// Fetch handler
// ---------------------------------------------------------------------------
const isInnerScript = (pathname) =>
  pathname.startsWith("/backend/") ||
  pathname.startsWith("/vendor/sqljs/") ||
  pathname === "/sw.js";

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Same-origin only
  if (url.origin !== self.location.origin) return;

  // Service-worker-internal scripts (loaded via importScripts): let the
  // browser fetch these directly. Intercepting them makes importScripts()
  // self-fetch and fail with a network error.
  if (isInnerScript(url.pathname)) return;

  // API request → route to local backend
  if (isApiRequest(url)) {
    e.respondWith(handleApi(req, url));
    return;
  }

  // Static assets: cache-first, fallback to network
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok && req.method === "GET") {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone));
      }
      return res;
    }).catch(() => cached))
  );
});

// ---------------------------------------------------------------------------
// Inlined local backend (source injected by scripts/sync-www.js)
// ---------------------------------------------------------------------------
/*__PHOTONIC_BACKEND__*/

// ---------------------------------------------------------------------------
// Local backend entry point
// ---------------------------------------------------------------------------
let backendPromise = null;

function getBackend() {
  if (!backendPromise) {
    backendPromise = Promise.resolve()
      .then(() => self.initSqlJs({
        locateFile: () => "./vendor/sqljs/sql-wasm.wasm",
      }))
      .then((SQL) => {
        self.__SQL = SQL;
        return self.PhotosDb.load(SQL);
      });
  }
  return backendPromise;
}

// placeholder DB persistence (IndexedDB-backed); fulfilled by backend modules

async function handleApi(req, url) {
  const db = await getBackend();
  const persist = self.PhotosDb.persist;

  // Binary-ish endpoints to native
  if (isThumbRequest(url) || isRawRequest(url) || isStreamRequest(url)) {
    return delegateNative(req, url, db);
  }

  const method = req.method;
  const pathname = url.pathname;

  // catch-all → try registered route handlers
  const handler = route(method, pathname);
  if (handler) {
    try {
      const body = method !== "GET" ? await req.json().catch(() => ({})) : null;
      const result = await handler(db, url, body);
      if (method !== "GET") persist(db);
      return json(result);
    } catch (err) {
      return json({ error: err.message || String(err) }, 500);
    }
  }

  return json({ error: "not found" }, 404);
}

function route(method, pathname) {
  const table = ApiRoutes[method];
  if (!table) return null;
  for (const [pattern, fn] of table) {
    const match = pathname.match(pattern);
    if (match) {
      return (db, url, body) => fn(db, url, body, match);
    }
  }
  return null;
}

// helpers assigned on import
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function delegateNative(req, url, db) {
  // Resolve photo id + content URI/mime from the local DB so the page bridge
  // can fulfil the request via the native plugin.
  let photo = null;
  try {
    const m = url.pathname.match(/\/api\/photos\/(\d+)\//);
    if (m && db) {
      photo = self.NativeApi.one(db, "SELECT id, path, mime_type, filename FROM photos WHERE id = ?", [parseInt(m[1])]);
    }
  } catch (e) { photo = null; }

  const kind = isThumbRequest(url)
    ? "thumbnail"
    : (isRawRequest(url) ? "raw" : "stream");

  let size = "medium";
  if (isThumbRequest(url)) {
    const sm = url.pathname.match(/thumb\/(small|medium|large)/);
    if (sm) size = sm[1];
  }

  // Ask the page to call the native bridge, awaited message round-trip.
  return messageClient({
    kind: "fetch",
    url: url.pathname + url.search,
    method: req.method,
    photo: photo ? { uri: photo.path, mime: photo.mime_type, filename: photo.filename } : null,
    sub: kind,
    size: size,
  })
    .then((res) => {
      if (!res) return json({ error: "no native support" }, 501);
      return new Response(res.body, { status: res.status, headers: res.headers });
    });
}

function messageClient(msg) {
  return new Promise((resolve) => {
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      if (!clients.length) return resolve(null);
      const client = clients[0];
      const channel = new MessageChannel();
      channel.port1.onmessage = (e) => {
        clearTimeout(timer);
        resolve(e.data);
      };
      const timer = setTimeout(() => { channel.port1.onmessage = null; resolve(null); }, 15000);
      client.postMessage({ type: "photonic-bridge", payload: msg }, [channel.port2]);
    });
  });
}

// ---------------------------------------------------------------------------
// Page → SW messages (native scan orchestration)
// ---------------------------------------------------------------------------
self.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "photonic-page") return;
  const payload = e.data.payload || {};
  const port = e.ports && e.ports[0];
  const reply = (obj) => { if (port) port.postMessage(obj); };

  if (payload.kind === "scan-begin") {
    self.scanState = {};
    self.scanState.running = true;
    self.scanState.folder = "all";
    self.scanState.done = 0;
    self.scanState.total = 0;
    self.scanState.indexed = 0;
    self.scanState.skipped = 0;
    self.scanState.cancel = false;
    self.scanState.cancelled = false;
    reply({ ok: true });
    return;
  }

  if (payload.kind === "scan-total") {
    if (self.scanState) self.scanState.total = payload.total;
    reply({ ok: true });
    return;
  }

  if (payload.kind === "scan-insert") {
    getBackend()
      .then((db) => {
        const photos = payload.photos || [];
        let inserted = 0;
        for (const p of photos) {
          try {
            if (insertPhoto(db, p)) inserted++;
          } catch (err) { /* skip */ }
        }
        if (self.scanState) self.scanState.indexed += photos.length;
        if (self.scanState) self.scanState.done += photos.length;
        self.PhotosDb.persist(db);
        reply({ ok: true, inserted });
      })
      .catch(() => reply({ ok: false, error: "backend not ready" }));
    return;
  }

  if (payload.kind === "scan-end") {
    if (self.scanState) self.scanState.running = false;
    reply({ ok: true });
    return;
  }
});

function insertPhoto(db, p) {
  const path = p.uri || p.path || "";
  const existing = self.NativeApi.one(
    db, "SELECT id FROM photos WHERE path = ?", [path]
  );
  const filename = p.filename || "";
  const ext = (path.split("?")[0].match(/\.([a-zA-Z0-9]+)$/) || [])[1]
    ? "." + path.split("?")[0].match(/\.([a-zA-Z0-9]+)$/)[1].toLowerCase()
    : (p.ext ? "." + String(p.ext).toLowerCase() : (filename.indexOf(".") >= 0 ? "." + filename.split(".").pop().toLowerCase() : ""));
  const mime = p.mime || (p.kind === "video" ? "video/mp4" : "image/jpeg");
  const size = p.size || 0;
  const rating = 0;
  const dateTaken = p.date_taken || "";

  let isHidden = 0;
  const camMake = p.camera_make || "";
  const camModel = p.camera_model || "";
  const lens = "";
  const lat = (p.latitude !== null && p.latitude !== undefined && !Number.isNaN(p.latitude)) ? p.latitude : null;
  const lng = (p.longitude !== null && p.longitude !== undefined && !Number.isNaN(p.longitude)) ? p.longitude : null;
  const width = p.width || 0;
  const height = p.height || 0;
  const hash = p.hash || "";

  if (existing) {
    self.NativeApi.run(db,
      "UPDATE photos SET filename=?, extension=?, size=?, width=?, height=?, mime_type=?, " +
      "camera_make=?, camera_model=?, date_taken=?, latitude=?, longitude=?, hash=? WHERE id=?",
      [filename, ext, size, width, height, mime, camMake, camModel, dateTaken, lat, lng, hash, existing.id]
    );
    return false; // updated, not new
  }

  const info = self.NativeApi.run(db,
    "INSERT INTO photos (path, filename, extension, size, modified_date, created_date, width, height, " +
    "mime_type, camera_make, camera_model, lens, date_taken, latitude, longitude, orientation, rating, is_hidden, hash) " +
    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [path, filename, ext, size, null, null, width, height, mime, camMake, camModel, lens, dateTaken, lat, lng, p.orientation || 0, rating, isHidden, hash]
  );
  return true;
}
