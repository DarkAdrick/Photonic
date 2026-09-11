// Photonic mobile — Service Worker
// Intercepts /api/* requests and serves them from a local backend implemented
// in JS with SQLite (sql.js / WASM). Native operations (photo library scan,
// EXIF, thumbnails) are delegated to the page, which routes them to the
// native Capacitor bridge.
"use strict";

const CACHE = "photonic-v24";
// Persistent thumbnail cache: survives SW shell version bumps so already-seen
// photos stay instant across releases, view switches and re-renders.
const THUMB_CACHE = "photonic-thumbs";
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
  const keep = [CACHE, THUMB_CACHE];
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

  // The native bridge script must NEVER be served from a stale cache entry:
  // it is fetch-on-demand, and the page URL stayed stable across releases.
  if (url.pathname.startsWith("/page/bridge.js") || url.pathname.startsWith("page/bridge.js")) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Thumbnail pipeline — bounded native concurrency + in-flight dedup + abort
// ---------------------------------------------------------------------------
// Every thumbnail is a SW → page → native plugin round-trip, and the native
// decoder is single-threaded. Scrolling fast fires dozens of <img> requests at
// once; without a bound they all pile up in the native queue, exceed the
// message round-trip timeout and come back as errors (broken images).
const THUMB_MAX_CONCURRENT = 3;
let thumbActive = 0;
const thumbQueue = [];
const thumbInflight = new Map(); // url -> Promise, dedups concurrent identical requests

function isAborted(req) {
  return req.signal && req.signal.aborted;
}

async function handleThumb(req, url, db) {
  // Serve already-decoded thumbnails from the persistent cache (fast, no
  // native round-trip). Only delegate to the native plugin on a miss.
  const cached = await caches.match(req);
  if (cached && cached.status === 200) return cached;

  // The same URL is often requested while a first response is still in flight
  // (re-render, adjacent grid cells): share one native round-trip.
  const key = req.url;
  if (thumbInflight.has(key)) return thumbInflight.get(key);

  const promise = enqueueThumb(req, url, db);
  thumbInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    thumbInflight.delete(key);
  }
}

function enqueueThumb(req, url, db) {
  return new Promise((resolve) => {
    const job = async () => {
      try {
        // Aborted while queued (scrolled out of view): skip the native
        // round-trip and free the slot right away.
        if (isAborted(req)) { resolve(json({ error: "aborted" }, 499)); return; }

        let res = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          if (attempt > 0) await sleep(150);
          if (isAborted(req)) { resolve(json({ error: "aborted" }, 499)); return; }
          try {
            res = await delegateNative(req, url, db);
          } catch (e) {
            res = null;
          }
          if (res && res.status === 200) break;
          // Transient native/timeout failures: one retry, then give up.
        }

        if (isAborted(req)) { resolve(json({ error: "aborted" }, 499)); return; }

        if (res && res.status === 200) {
          try {
            const cache = await caches.open(THUMB_CACHE);
            await cache.put(req, res.clone());
            const keys = await cache.keys();
            if (keys.length > 2200) {
              await Promise.all(keys.slice(0, keys.length - 2000).map((k) => cache.delete(k)));
            }
          } catch (e) { /* cache failure must never break thumbnails */ }
        }
        resolve(res || json({ error: "thumbnail unavailable" }, 502));
      } finally {
        thumbActive -= 1;
        pumpThumbQueue();
      }
    };
    thumbQueue.push(job);
    pumpThumbQueue();
  });
}

function pumpThumbQueue() {
  while (thumbActive < THUMB_MAX_CONCURRENT && thumbQueue.length) {
    const job = thumbQueue.shift();
    thumbActive += 1;
    job().catch(() => { /* job guards its own errors */ });
  }
}

async function handleApi(req, url) {
  const db = await getBackend();
  const persist = self.PhotosDb.persist;

  // Binary-ish endpoints to native
  if (isThumbRequest(url)) {
    return handleThumb(req, url, db);
  }
  if (isRawRequest(url) || isStreamRequest(url)) {
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
  }, isThumbRequest(url) ? 45000 : 15000)
    .then((res) => {
      if (!res) return json({ error: "no native support" }, 501);
      return new Response(res.body, { status: res.status, headers: res.headers });
    });
}

function messageClient(msg, timeoutMs = 15000) {
  return new Promise((resolve) => {
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      if (!clients.length) return resolve(null);
      const client = clients[0];
      const channel = new MessageChannel();
      channel.port1.onmessage = (e) => {
        clearTimeout(timer);
        resolve(e.data);
      };
      const timer = setTimeout(() => { channel.port1.onmessage = null; resolve(null); }, timeoutMs);
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
          } catch (err) { console.warn("[Photonic] insertPhoto error:", err); }
        }
        if (self.scanState) self.scanState.indexed += photos.length;
        if (self.scanState) self.scanState.done += photos.length;
        try {
          self.PhotosDb.persist(db);
        } catch (err) {
          console.warn("[Photonic] persist error:", err);
        }
        console.log("[Photonic] insert batch=" + photos.length + " inserted=" + inserted + " total=" + ((self.scanState && self.scanState.indexed) || 0));
        reply({ ok: true, inserted });
      })
      .catch((err) => {
        console.warn("[Photonic] getBackend failed:", err);
        reply({ ok: false, error: "backend not ready" });
      });
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
  const folder = p.folder || "";
  const mime = p.mime || (p.kind === "video" ? "video/mp4" : "image/jpeg");
  const size = p.size || 0;
  const rating = 0;
  const dateTaken = p.date_taken || "";

  let isHidden = 0;
  const camMake = p.camera_make || "";
  const camModel = p.camera_model || "";
  const lens = p.lens || "";
  const focalLength = p.focal_length || "";
  const aperture = p.aperture || "";
  const shutterSpeed = p.shutter_speed || "";
  const iso = (p.iso !== null && p.iso !== undefined) ? p.iso : null;
  const lat = (p.latitude !== null && p.latitude !== undefined && !Number.isNaN(p.latitude)) ? p.latitude : null;
  const lng = (p.longitude !== null && p.longitude !== undefined && !Number.isNaN(p.longitude)) ? p.longitude : null;
  const width = p.width || 0;
  const height = p.height || 0;
  const hash = p.hash || "";

  if (existing) {
    self.NativeApi.run(db,
      "UPDATE photos SET filename=?, extension=?, folder=?, size=?, width=?, height=?, mime_type=?, " +
      "camera_make=?, camera_model=?, lens=?, focal_length=?, aperture=?, shutter_speed=?, iso=?, " +
      "date_taken=?, latitude=?, longitude=?, hash=? WHERE id=?",
      [filename, ext, folder, size, width, height, mime, camMake, camModel, lens, focalLength, aperture, shutterSpeed, iso, dateTaken, lat, lng, hash, existing.id]
    );
    return false; // updated, not new
  }

  const info = self.NativeApi.run(db,
    "INSERT INTO photos (path, filename, folder, extension, size, modified_date, created_date, width, height, " +
    "mime_type, camera_make, camera_model, lens, focal_length, aperture, shutter_speed, iso, date_taken, " +
    "latitude, longitude, orientation, rating, is_hidden, hash) " +
    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [path, filename, folder, ext, size, null, null, width, height, mime, camMake, camModel, lens, focalLength, aperture, shutterSpeed, iso, dateTaken, lat, lng, p.orientation || 0, rating, isHidden, hash]
  );
  return true;
}
