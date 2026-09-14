// Photonic mobile — sync frontend/ (desktop web assets) into Capacitor www/
// and replace external CDN references with local vendored copies.
//
// IMPORTANT: this script only touches mobile/www/ and mobile/vendor-src/.
// It NEVER modifies the desktop frontend/, guaranteeing zero desktop regression.
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const FRONTEND = path.join(ROOT, "..", "frontend");
const SRC_WWW = path.join(ROOT, "src-www");
const WWW = path.join(ROOT, "www");
const VENDOR_SRC = path.join(ROOT, "vendor-src");
const VENDOR_DST = path.join(WWW, "vendor");

// ---------------------------------------------------------------- helpers
function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// download a file (follows redirects), returns a promise
function download(url, dest) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));
    const handle = (u) => {
      const req = https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          handle(new URL(res.headers.location, u).toString());
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        const ws = fs.createWriteStream(dest);
        res.pipe(ws);
        ws.on("finish", () => ws.close(resolve));
        ws.on("error", reject);
      });
      req.on("error", reject);
    };
    handle(url);
  });
}

// ---------------------------------------------------------------- vendored libs
const VENDORED = [
  {
    name: "leaflet",
    files: [
      ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "leaflet/leaflet.js"],
      ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "leaflet/leaflet.css"],
    ],
  },
  {
    name: "leaflet-markercluster",
    files: [
      ["https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js", "leaflet-markercluster/leaflet.markercluster.js"],
      ["https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css", "leaflet-markercluster/MarkerCluster.css"],
      ["https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css", "leaflet-markercluster/MarkerCluster.Default.css"],
    ],
  },
  {
    name: "chart.js",
    files: [
      ["https://unpkg.com/chart.js@4.4.4/dist/chart.umd.js", "chartjs/chart.umd.js"],
    ],
  },
  {
    name: "lucide",
    files: [
      // pinned lucide bundle (0.4xx). unpkg/@isomorphic? lucide ships a UMD for browsers.
      ["https://unpkg.com/lucide@0.454.0/dist/umd/lucide.min.js", "lucide/lucide.min.js"],
    ],
  },
  {
    name: "pannellum",
    files: [
      ["https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js", "pannellum/pannellum.js"],
      ["https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css", "pannellum/pannellum.css"],
    ],
  },
  {
    name: "sql.js",
    files: [
      ["https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/sql-wasm.js", "sqljs/sql-wasm.js"],
      ["https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/sql-wasm.wasm", "sqljs/sql-wasm.wasm"],
    ],
  },
];

// ---------------------------------------------------------------- main
async function main() {
  console.log("Syncing frontend → www ...");
  rmDir(WWW);
  copyTree(FRONTEND, WWW);

  // Add mobile-only files (service worker, local backend JS) on top of frontend
  if (fs.existsSync(SRC_WWW)) {
    console.log("Adding mobile src-www files ...");
    copyTree(SRC_WWW, WWW);
  }

  // Bundle the changelog so the mobile backend can serve /api/changelog
  const changelogSrc = path.join(ROOT, "..", "CHANGELOG.md");
  if (fs.existsSync(changelogSrc)) {
    fs.copyFileSync(changelogSrc, path.join(WWW, "CHANGELOG.md"));
    console.log("Bundling CHANGELOG.md ...");
  }

  console.log("Vendoring CDN libraries ...");
  ensureDir(VENDOR_DST);
  for (const lib of VENDORED) {
    for (const [url, rel] of lib.files) {
      const dest = path.join(VENDOR_SRC, rel);
      const out = path.join(VENDOR_DST, rel);
      if (!fs.existsSync(dest)) {
        console.log(`  downloading ${url}`);
        await download(url, dest);
      } else {
        console.log(`  cached ${rel}`);
      }
      copyTree(path.dirname(dest), path.dirname(out));
    }
  }

  // Leaflet css references url(images/...) — download default marker & control images
  const leafletImages = [
    "https://unpkg.com/leaflet@1.9.4/dist/images/layers.png",
    "https://unpkg.com/leaflet@1.9.4/dist/images/layers-2x.png",
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  ];
  for (const url of leafletImages) {
    const name = path.basename(url);
    const dest = path.join(VENDOR_SRC, "leaflet", "images", name);
    const out = path.join(VENDOR_DST, "leaflet", "images", name);
    if (!fs.existsSync(dest)) {
      console.log(`  downloading ${name}`);
      try { await download(url, dest); } catch (e) { console.log(`    (skip ${name}: ${e.message})`); }
    }
    if (fs.existsSync(dest)) copyTree(path.dirname(dest), path.dirname(out));
  }

  // pannellum.css build is self-contained (inline SVG/data-URI icons), no textures needed.

  // Inline the backend JS modules + sql.js directly inside sw.js. Android
  // WebView Service Workers cannot reliably run importScripts() against the
  // Capacitor local server, so we embed everything to make sw.js
  // self-contained (no runtime importScripts calls at all). Must run after
  // vendoring so sql-wasm.js exists under www/vendor/sqljs/.
  inlineBackend();

  console.log("Rewriting index.html to use local vendored libs ...");
  rewriteIndexHtml();

  console.log("Done.");
}

// Inline the backend JS modules + sql.js source directly into www/sw.js.
// Android WebView Service Workers cannot reliably importScripts() against the
// Capacitor local server, so we embed all backend code into sw.js to make it
// fully self-contained (no runtime importScripts calls for backend files).
function inlineBackend() {
  const swPath = path.join(WWW, "sw.js");
  const MARKER = "/*__PHOTONIC_BACKEND__*/";
  let sw = fs.readFileSync(swPath, "utf8");
  if (!sw.includes(MARKER)) {
    throw new Error("sw.js missing inline marker; cannot inject backend");
  }

  const order = [
    "schema.js",
    "photosdb.js",
    "native_api.js",
    "photos.js",
    "folders.js",
    "meta.js",
    "routes.js",
  ];
  let blob = [];
  for (const name of order) {
    const src = path.join(SRC_WWW, "backend", name);
    if (!fs.existsSync(src)) throw new Error("missing backend module: " + src);
    blob.push("// ---- backend/" + name + " ----\n" + fs.readFileSync(src, "utf8"));
  }

  // sql.js loader: defines self.initSqlJs when evaluated in the worker scope.
  // sql-wasm.js uses implicit globals (e.g. `module = undefined`) that are only
  // legal in sloppy mode. Since sw.js is "use strict", we evaluate its source
  // via `new Function(...)`, which always creates a sloppy-mode function scope
  // regardless of the surrounding strict-mode script, then bind the resolved
  // initSqlJs onto self.
  const sqljs = path.join(WWW, "vendor", "sqljs", "sql-wasm.js");
  if (fs.existsSync(sqljs)) {
    const sqlSrc = fs.readFileSync(sqljs, "utf8");
    blob.push(
      "// ---- sql.js (evaluated in a sloppy-mode function scope) ----\n" +
      "(function(){\n" +
      "  var _sqljsBind = new Function(\"self\",\n" +
      JSON.stringify(sqlSrc) + "\n" +
      "    + \"\\nif (typeof initSqlJs === 'function') { self.initSqlJs = initSqlJs; }\\n\"\n" +
      "  );\n" +
      "  _sqljsBind.call(self, self);\n" +
      "}).call(self);\n"
    );
  }

  sw = sw.replace(MARKER, blob.join("\n\n"));
  fs.writeFileSync(swPath, sw);
  console.log("Inlined backend modules + sql.js into sw.js");
}

function rewriteIndexHtml() {
  const htmlPath = path.join(WWW, "index.html");  let html = fs.readFileSync(htmlPath, "utf8");

  // CSS replacements
  html = html.replace(
    'href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"',
    'href="vendor/leaflet/leaflet.css"'
  );
  html = html.replace(
    'href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"',
    'href="vendor/leaflet-markercluster/MarkerCluster.css"'
  );
  html = html.replace(
    'href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"',
    'href="vendor/leaflet-markercluster/MarkerCluster.Default.css"'
  );
  html = html.replace(
    'href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"',
    'href="vendor/pannellum/pannellum.css"'
  );

  // JS replacements
  html = html.replace(
    'src="https://unpkg.com/chart.js@4.4.4/dist/chart.umd.js"',
    'src="vendor/chartjs/chart.umd.js"'
  );
  html = html.replace(
    'src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"',
    'src="vendor/leaflet/leaflet.js"'
  );
  html = html.replace(
    'src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"',
    'src="vendor/leaflet-markercluster/leaflet.markercluster.js"'
  );
  html = html.replace(
    'src="https://unpkg.com/lucide@latest"',
    'src="vendor/lucide/lucide.min.js"'
  );
  html = html.replace(
    'src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"',
    'src="vendor/pannellum/pannellum.js"'
  );

  fs.writeFileSync(htmlPath, html);

  injectMobile(htmlPath);
}

// Inject mobile-only bits into the copied www/index.html (the desktop
// frontend/index.html is NEVER modified). Adds the PWA manifest link and
// bootstraps the SW + native bridge.
function injectMobile(htmlPath) {
  let html = fs.readFileSync(htmlPath, "utf8");

  // PWA manifest link in <head>
  if (!html.includes('rel="manifest"')) {
    html = html.replace(/<head[^>]*>/, (m) => m + '\n  <link rel="manifest" href="manifest.webmanifest">');
  }

  const bridgeScript =
    '<script src="page/bridge.js?v=1.2.0"></script>\n' +
    '<script>\n' +
    '/* Photonic mobile boot */\n' +
    '(function () {\n' +
    '  function bootScan() {\n' +
    '    if (!window.Photonic || !window.Photonic.isNative()) return; // plain browser\n' +
    '    if (window.Photonic.scanRoots && window.Photonic.scanRoots().length === 0) return; // no library root configured\n' +
    '    fetch("/api/status").then(function (r) { return r.json(); }).then(function (s) {\n' +
    '      if (s && s.photo_count === 0) { window.Photonic.scan(); }\n' +
    '    }).catch(function () {});\n' +
    '  }\n' +
    '  window.addEventListener("photonic-ready", bootScan);\n' +
    '  if (document.readyState !== "loading") {\n' +
    '    window.addEventListener("load", function () { bootScan(); });\n' +
    '  }\n' +
    '  window.addEventListener("photonic-scan-complete", function () {\n' +
    '    try { if (window.location.hash) window.location.reload(); } catch (e) {}\n' +
    '  });\n' +
    '})();\n' +
    '</script>';

  if (!html.includes('page/bridge.js')) {
    html = html.replace(/<\/body>/, bridgeScript + '\n</body>');
  }

  fs.writeFileSync(htmlPath, html);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
