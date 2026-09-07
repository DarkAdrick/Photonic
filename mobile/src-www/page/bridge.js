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
      if (msg.sub === "stream" || (mime && mime.startsWith("video/"))) {
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

  // ── Scan orchestration ──────────────────────────────────────────────────
  async function runScan() {
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
    if (!perm.granted) {
      perm = await plugin.requestPermission().catch(() => ({ granted: false }));
      if (!perm.granted) {
        notifyScanError("permission denied");
        return;
      }
    }

    const res = await plugin.scanMedia().catch((e) => ({ error: String(e) }));
    if (!res || res.error) {
      notifyScanError((res && res.error) || "scan failed");
      return;
    }
    const photos = res.photos || [];
    const ctrl = toSW();
    if (!ctrl) {
      notifyScanError("service worker not ready");
      return;
    }

    ctrl.postMessage({ type: "photonic-page", payload: { kind: "scan-begin" } });
    ctrl.postMessage({ type: "photonic-page", payload: { kind: "scan-total", total: photos.length } });

    const BATCH = 200;
    for (let i = 0; i < photos.length; i += BATCH) {
      const batch = photos.slice(i, i + BATCH);
      const ack = new Promise((resolve) => {
        const chan = new MessageChannel();
        chan.port1.onmessage = (e) => { chan.port1.onmessage = null; resolve(e.data); };
        ctrl.postMessage({ type: "photonic-page", payload: { kind: "scan-insert", photos: batch } }, [chan.port2]);
        setTimeout(() => resolve(null), 30000);
      });
      await ack;
      // let the SW persist/digest between batches
      await sleep(0);
    }

    ctrl.postMessage({ type: "photonic-page", payload: { kind: "scan-end" } });

    // Signal the app to refresh its views
    window.dispatchEvent(new CustomEvent("photonic-scan-complete", { detail: { scanned: photos.length } }));
  }

  function notifyScanError(err) {
    console.warn("[Photonic] scan:", err);
    window.dispatchEvent(new CustomEvent("photonic-scan-error", { detail: { error: err } }));
  }

  function toSW() {
    return (navigator.serviceWorker && navigator.serviceWorker.controller) || null;
  }

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
    isNative: () => !!native(),
    nativePlugin: () => native(),
  };
})();
