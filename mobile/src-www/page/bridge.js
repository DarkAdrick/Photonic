// Photonic mobile — page bridge
// Runs on the page (inside the Capacitor WebView, and optionally in a plain
// browser for development). It:
//   1. Registers the Service Worker.
//   2. Replies to Service Worker "photonic-bridge" messages that need the
//      native layer: thumbnails, raw files and video streams.
//   3. Drives library scans: the native plugin enumerates MediaStore, then the
//      metadata is streamed to the SW (which persists it into sql.js).
"use strict";

(function () {
  if (window.__photonicBridgeLoaded) return;
  window.__photonicBridgeLoaded = true;

  const scope = window.location.pathname.replace(/[^/]*$/, "");
  let swRegistered = false;
  if ("serviceWorker" in navigator) {
    swRegistered = true;
    navigator.serviceWorker.register("sw.js", { scope }).catch((err) => {
      console.warn("[Photonic] SW registration failed:", err);
    });
  }

  // Native plugin (Capacitor injects window.Capacitor.Plugins.PhotonicBackend)
  const native = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PhotonicBackend) || null;

  // Flag the document as running inside the native app (mobile-only layout).
  if (native()) document.body.classList.add("photonic-native");

  // ── System bars (status + navigation) ─────────────────────────────────
  // The app is edge-to-edge, so the bars draw over the app's own surface.
  // Mirror the theme's background tint onto the system icon color: dark
  // icons over light backgrounds (Daylight / *-light), light icons over
  // the dark palettes.
  function systemBarLuminance() {
    const html = document.documentElement;
    const bg = html && getComputedStyle(html).getPropertyValue("--bg-primary").trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(bg || "");
    if (!m) return 1; // no explicit color → fall back to Daylight (light)
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function syncSystemBars() {
    const plugin = native();
    if (!plugin || typeof plugin.setSystemBarStyle !== "function") return;
    const dark = systemBarLuminance() > 0.5;
    plugin.setSystemBarStyle({ dark: dark }).catch(() => {});
  }

  if (native()) {
    window.addEventListener("load", syncSystemBars);
    try {
      // Theme colors are applied as inline CSS custom properties on <html>.
      new MutationObserver(syncSystemBars).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["style"],
      });
    } catch (e) { /* observer unsupported: initial sync is enough */ }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Decode base64 → Uint8Array
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // MIME per media sub-kind
  function mimeFor(photo, sub) {
    if (photo && photo.mime) return photo.mime;
    return "image/jpeg";
  }

  // ── SW → page: fetch delegation (thumb / raw / stream) ──────────────────
  async function handleFetch(msg) {
    const pl = msg.photo || {};
    const plugin = native();
    if (!plugin) return { status: 501, headers: {}, body: "" };
    const uri = pl.uri;
    const mime = pl.mime || mimeFor(pl, msg.sub);
    try {
      let result;
      if (msg.sub === "raw") {
        result = await plugin.rawBytes({ uri: uri, mime: mime });
        const data = result && result.data;
        if (!data) return { status: 404, headers: {}, body: "" };
        return {
          status: 200,
          headers: { "Content-Type": result.mime || mime },
          body: b64ToBytes(data).buffer,
        };
      }
      if (msg.sub === "stream") {
        // Return raw bytes as a streamable body for the video player.
        result = await plugin.rawBytes({ uri: uri, mime: mime });
        const data = result && result.data;
        if (!data) return { status: 404, headers: {}, body: "" };
        return {
          status: 200,
          headers: { "Content-Type": result.mime || mime },
          body: b64ToBytes(data).buffer,
        };
      }
      // thumbnail
      const size = msg.size || "medium";
      const maxDim = size === "small" ? 360 : (size === "large" ? 1600 : 720);
      result = await plugin.thumbnail({ uri: uri, mime: mime, maxDim: maxDim });
      const data = result && result.data;
      if (!data) return { status: 404, headers: {}, body: "" };
      return {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
        body: b64ToBytes(data).buffer,
      };
    } catch (err) {
      console.warn("[Photonic] native fetch failed:", err);
      return { status: 500, headers: {}, body: "" };
    }
  }

  // ── Picked folders ────────────────────────────────────────────────────
  // The user adds a library root through the native SAF folder picker. Picked
  // roots are persisted locally and filter scanMedia() to those folders.
  function pickedFolders() {
    try {
      const arr = JSON.parse(localStorage.getItem("photonic.mobileFolders") || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function savePickedFolders(folders) {
    localStorage.setItem("photonic.mobileFolders", JSON.stringify(folders));
  }

  function addPickedFolder(folder) {
    const list = pickedFolders();
    const key = String(folder.path || "").trim().toLowerCase();
    if (!key) return null;
    if (list.some((f) => String(f.path || "").trim().toLowerCase() === key)) {
      return list.find((f) => String(f.path || "").trim().toLowerCase() === key);
    }
    const entry = { name: folder.name, path: String(folder.path), uri: String(folder.uri) };
    list.push(entry);
    savePickedFolders(list);
    // Register the root so it shows in the folders list in the app.
    fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: entry.path }),
    }).catch((e) => console.warn("[Photonic] register folder failed:", e));
    return entry;
  }

  // Pick a library folder via the system SAF picker, persist it and rescan.
  async function pickFolder() {
    const plugin = native();
    if (!plugin || typeof plugin.pickFolder !== "function") return null;
    const res = await plugin.pickFolder().catch((e) => ({ error: String(e) }));
    if (!res || res.error) return null;
    const entry = addPickedFolder(res);
    if (entry) {
      runScan();
      window.dispatchEvent(new CustomEvent("photonic-folder-picked", { detail: entry }));
    }
    return entry;
  }

  // ── Scan orchestration ──────────────────────────────────────────────────
  function scanRoots() {
    return pickedFolders().map((f) => f.path).filter(Boolean);
  }

  async function runScan() {
    if (window.__photonicScanning) return; // never run two scans at once
    const plugin = native();
    if (!plugin) {
      const ctrl = toSW();
      if (ctrl) {
        ctrl.postMessage({ type: "photonic-page", payload: { kind: "scan-begin" } });
        ctrl.postMessage({ type: "photonic-page", payload: { kind: "scan-end" } });
      }
      return;
    }

    let perm = await plugin.checkPermission().catch(() => ({ granted: false }));

    const roots = scanRoots();
    if (roots.length === 0) {
      console.warn("[Photonic] scan aborted: no folder selected in Settings -> Folders");
      return;
    }
    // Request permission when the media reads are missing, AND when they are
    // fine but ACCESS_MEDIA_LOCATION isn't granted yet: without it Android
    // redacts the EXIF GPS of every photo/video.
    perm = perm.granted && perm.locationGranted
      ? perm
      : await plugin.requestPermission().catch(() => ({ granted: false }));
    if (!perm.granted) {
      notifyScanError("permission denied");
      return;
    }
    // Wait out the SW install/claim dance: on cold launch a brand new SW takes
    // control right after registering, and sending messages to the pre-claim
    // controller silently drops them. Only proceed once the current controller
    // is the one the page is actually bound to.
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      await navigator.serviceWorker.ready;
    }
    let ctrl = toSW();
    if (!ctrl) {
      notifyScanError("service worker not ready");
      return;
    }

    const token = ++scanToken;
    window.__photonicScanning = true;
    ctrl.postMessage({ type: "photonic-page", payload: { kind: "scan-begin" } });

    // Stream the scan in small native pages so the grid fills progressively
    // instead of appearing all at once when the whole query has finished.
    const PAGE = 400;
    const BATCH = 200;
    let insertedCount = 0;

    async function pump(kind) {
      let afterId = 0;
      let pages = 0;
      for (;;) {
        if (token !== scanToken) return false; // superseded by a SW-claim restart
        if (++pages > 2000) { notifyScanError(kind + ": page cap reached"); return false; }
        const res = await plugin.scanPage({ roots: roots, kind: kind, afterId: afterId, limit: PAGE })
          .catch((e) => ({ error: String(e) }));
        if (!res || res.error) {
          notifyScanError((res && res.error) || kind + " scan failed");
          return false;
        }
        const photos = res.photos || [];
        console.log("[Photonic] pump " + kind + " sentAfterId=" + afterId +
          " resKeys=" + (res ? Object.keys(res).join(",") : "null") +
          " next_after=" + res.next_after +
          " lastId=" + (photos.length ? String(photos[photos.length - 1].id) : "none"));
        insertedCount += photos.length;

        for (let i = 0; i < photos.length; i += BATCH) {
          const batch = photos.slice(i, i + BATCH);
          let w = toSW();
          if (!w || token !== scanToken) return false;
          const ack = new Promise((resolve) => {
            const chan = new MessageChannel();
            chan.port1.onmessage = (e) => { chan.port1.onmessage = null; resolve(e.data); };
            w.postMessage({ type: "photonic-page", payload: { kind: "scan-insert", photos: batch } }, [chan.port2]);
            setTimeout(() => resolve(null), 30000);
          });
          await ack;
          if (token !== scanToken) return false;
          console.log("[Photonic] insert ack=" + JSON.stringify(ack));
          // let the SW persist/digest between batches
          await sleep(0);
        }

        window.dispatchEvent(new CustomEvent("photonic-scan-progress", {
          detail: { inserted: insertedCount }
        }));

        if (res.done || photos.length === 0) return true;
        // next page key, transported as a string by the plugin; fall back to the
        // last photo id if the key was ever dropped by the bridge
        const next = parseInt(res.next_after, 10) || 0;
        const last = photos[photos.length - 1];
        const fallback = last && parseInt(String(last.id), 10) || 0;
        if (!next && !fallback) { notifyScanError(kind + ": cannot paginate (next_after=0)"); return false; }
        afterId = next || fallback;
      }
    }

    try {
      const okImages = await pump("image");
      const okVideos = await pump("video");
      if (token === scanToken) {
        let w = toSW();
        if (w) w.postMessage({ type: "photonic-page", payload: { kind: "scan-end" } });
      }
      if (!okImages || !okVideos) return;
      controllerRestarts = 0;
      // Signal the app to refresh its views
      window.dispatchEvent(new CustomEvent("photonic-scan-complete", { detail: { scanned: insertedCount } }));
    } finally {
      if (token === scanToken) window.__photonicScanning = false;
    }
  }

  function notifyScanError(err) {
    console.warn("[Photonic] scan:", err);
    window.dispatchEvent(new CustomEvent("photonic-scan-error", { detail: { error: err } }));
  }

  function toSW() {
    return (navigator.serviceWorker && navigator.serviceWorker.controller) || null;
  }

  // A running scan must survive a Service Worker update: when a new SW takes
  // control (skipWaiting + clients.claim), the controller the scan was bound
  // to is dead and its messages are silently dropped. Abort the in-flight scan
  // via a token and re-run it once under the new controller.
  let scanToken = 0;
  let controllerRestarts = 0;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (navigator.serviceWorker.controller && window.__photonicScanning && controllerRestarts < 3) {
      controllerRestarts += 1;
      scanToken += 1; // invalidate the running pump at its next check
      window.__photonicScanning = false;
      runScan();
    }
  });

  // ── Message handling ────────────────────────────────────────────────────
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (!e.data) return;
    if (e.data.type === "photonic-bridge" && e.data.payload) {
      const msg = e.data.payload;
      const port = e.ports && e.ports[0];
      if (msg.kind === "fetch") {
        handleFetch(msg).then((res) => { if (port) port.postMessage(res); });
      }
    } else if (e.data.type === "photonic-page" && e.data.payload) {
      const pl = e.data.payload;
      if (pl.kind === "scan-request") {
        runScan();
      }
    }
  });

  // Auto-scan on first load (only when a native plugin exists and DB empty).
  // Also, on the very first launch the Service Worker does not yet control the
  // page, so the frontend's initial /api/* fetches would hit the Capacitor
  // asset server (returning the index.html fallback) instead of the local
  // backend. Once the SW activates and claims the page, reload once so the
  // subsequent load is fully SW-controlled and the API works.
  if (swRegistered) {
    let reloaded = false;
    navigator.serviceWorker.ready
      .then(() => navigator.serviceWorker.controller)
      .then((ctrl) => {
        if (!ctrl && !reloaded && location.protocol !== "file:") {
          reloaded = true;
          location.reload();
          return null;
        }
        return ctrl;
      })
      .then((ctrl) => {
        if (!ctrl) return;
        if (!native()) return; // plain browser: no native library
        window.dispatchEvent(new CustomEvent("photonic-ready"));
      });
  }

  window.Photonic = {
    scan: runScan,
    pickFolder: pickFolder,
    pickedFolders: pickedFolders,
    scanRoots: scanRoots,
    isNative: () => !!native(),
    nativePlugin: () => native(),
    syncSystemBars: syncSystemBars,
  };
})();
