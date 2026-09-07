// Photonic mobile — Folder & scan endpoint handlers
"use strict";

self.ApiHandlers = self.ApiHandlers || {};

(function () {
  var N = self.NativeApi;
  var all = N.all;
  var one = N.one;
  var run = N.run;

  // ── Scan state (in-memory, shared across handlers) ──────────────────────

  self.scanState = {
    running: false,
    folder: "",
    done: 0,
    total: 0,
    indexed: 0,
    skipped: 0,
    cancel: false,
    cancelled: false
  };

  // ── GET /api/folders ────────────────────────────────────────────────────

  function listFolders(db, url, body, match) {
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";

    var rows = all(db, "SELECT id, path FROM folders ORDER BY path");
    var cond = N.hiddenSql("", showHidden, hiddenOnly);
    var hf = cond ? "AND " + cond + " " : "";

    return rows.map(function (r) {
      var base = r.path.replace(/\/+$/, "").replace(/\\+$/, "");
      var cnt = N.count1(db,
        "SELECT COUNT(*) AS c FROM photos WHERE path LIKE ? ESCAPE '\\' " + hf,
        [N.underPattern(base)]
      );
      return { id: r.id, path: r.path, photo_count: cnt };
    });
  }

  // ── GET /api/folders/tree ───────────────────────────────────────────────

  function listFoldersTree(db, url, body, match) {
    var rows = all(db, "SELECT id, path FROM folders ORDER BY path");

    var entries = rows.map(function (r) {
      return { id: r.id, path: r.path, children: [] };
    });
    var roots = [];

    entries.forEach(function (entry) {
      var parent = null;
      entries.forEach(function (other) {
        if (other.id === entry.id) return;
        var prefix = N.normPath(other.path).replace(/\/+$/, "") + "/";
        if (N.normPath(entry.path).toLowerCase().startsWith(prefix.toLowerCase())) {
          if (!parent || other.path.length > parent.path.length) {
            parent = other;
          }
        }
      });
      if (parent) {
        parent.children.push(entry);
      } else {
        roots.push(entry);
      }
    });

    function flatten(nodes, depth) {
      var result = [];
      nodes.forEach(function (n) {
        result.push({
          id: n.id,
          path: n.path,
          name: N.nameFromPath(n.path),
          depth: depth,
          has_children: n.children.length > 0
        });
        result = result.concat(flatten(n.children, depth + 1));
      });
      return result;
    }

    return flatten(roots, 0);
  }

  // ── GET /api/folders/browse ─────────────────────────────────────────────

  function browseFolder(db, url, body, match) {
    var folderPath = url.searchParams.get("folder_path");
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";

    var cond = N.hiddenSql("", showHidden, hiddenOnly);
    var hf = cond ? "AND " + cond + " " : "";

    function firstSegment(rel) {
      var parts = N.normPath(rel).split("/");
      return parts[0] || rel;
    }

    var db2 = db;

    if (folderPath !== null) {
      var parentPath = folderPath.replace(/\/+$/, "").replace(/\\+$/, "");
      var allFolders = all(db2, "SELECT id, path FROM folders ORDER BY path");

      var childMap = {};
      var parentNorm = N.normPath(parentPath).toLowerCase();

      allFolders.forEach(function (f) {
        var fp = N.normPath(f.path).replace(/\/+$/, "");
        if (fp.toLowerCase() === parentNorm) return;
        if (!fp.toLowerCase().startsWith(parentNorm + "/")) return;
        var rel = fp.substring(N.normPath(parentPath).length).replace(/^\/+/, "");
        if (!rel) return;
        var seg = firstSegment(rel);
        if (!childMap[seg] || f.path < childMap[seg].path) {
          childMap[seg] = f;
        }
      });

      var subfolderEntries = Object.keys(childMap).sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
      }).map(function (name) {
        var f = childMap[name];
        var subPath = f.path.replace(/\/+$/, "").replace(/\\+$/, "");
        var pat = N.underPattern(subPath);
        var cnt = N.count1(db2,
          "SELECT COUNT(*) AS c FROM photos WHERE path LIKE ? ESCAPE '\\' " + hf,
          [pat]
        );
        var sampleRows = all(db2,
          "SELECT id FROM photos WHERE path LIKE ? ESCAPE '\\' " + hf + "ORDER BY date_taken DESC LIMIT 4",
          [pat]
        );
        var samples = sampleRows.map(function (r) { return r.id; });
        var fid = f.id !== undefined ? f.id : (-Math.abs(hashStr(subPath)) % 100000);
        return {
          id: fid,
          name: name,
          path: subPath,
          photo_count: cnt,
          sample_ids: samples
        };
      });

      var underPat = N.underPattern(parentPath);
      var deeperPat = underPat + "/%";
      var directPhotos = all(db2,
        "SELECT id, filename, width, height, camera_model, date_taken, is_hidden " +
        "FROM photos WHERE path LIKE ? ESCAPE '\\' AND path NOT LIKE ? ESCAPE '\\' " + hf +
        "ORDER BY date_taken DESC LIMIT 200",
        [underPat, deeperPat]
      );

      return {
        folder: { id: null, path: parentPath, name: N.nameFromPath(parentPath) },
        folders: subfolderEntries,
        photos: directPhotos
      };
    }

    // Root browse: top-level folders
    var allFolders2 = all(db2, "SELECT id, path FROM folders ORDER BY path");
    var childMap2 = {};

    allFolders2.forEach(function (f) {
      var fp = N.normPath(f.path).replace(/\/+$/, "");
      var isChild = false;
      for (var j = 0; j < allFolders2.length; j++) {
        if (allFolders2[j].id === f.id) continue;
        var prefix = N.normPath(allFolders2[j].path).replace(/\/+$/, "") + "/";
        if (fp.toLowerCase().startsWith(prefix.toLowerCase())) {
          isChild = true;
          break;
        }
      }
      if (!isChild) {
        var name = N.nameFromPath(f.path);
        childMap2[name] = f;
      }
    });

    var entries = Object.keys(childMap2).sort(function (a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    }).map(function (name) {
      var f = childMap2[name];
      var fp = f.path.replace(/\/+$/, "").replace(/\\+$/, "");
      var pat = N.underPattern(fp);
      var cnt = N.count1(db2,
        "SELECT COUNT(*) AS c FROM photos WHERE path LIKE ? ESCAPE '\\' " + hf,
        [pat]
      );
      var sampleRows = all(db2,
        "SELECT id FROM photos WHERE path LIKE ? ESCAPE '\\' " + hf + "ORDER BY date_taken DESC LIMIT 4",
        [pat]
      );
      var samples = sampleRows.map(function (r) { return r.id; });
      return {
        id: f.id,
        name: name,
        path: fp,
        photo_count: cnt,
        sample_ids: samples
      };
    });

    return { folder: null, folders: entries, photos: [] };
  }

  // Simple deterministic hash for synthetic folder IDs
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h;
  }

  // ── POST /api/folders ───────────────────────────────────────────────────

  function addFolder(db, url, body, match) {
    var path = (body && body.path || "").trim();
    if (!path) return { error: "path is required" };
    try {
      run(db, "INSERT INTO folders (path) VALUES (?)", [path]);
    } catch (e) {
      return { error: "folder already exists" };
    }
    return { ok: true };
  }

  // ── DELETE /api/folders/{id} ────────────────────────────────────────────

  function deleteFolder(db, url, body, match) {
    var id = parseInt(match[1]);
    run(db, "DELETE FROM folders WHERE id = ?", [id]);
    return { ok: true };
  }

  // ── POST /api/scan ──────────────────────────────────────────────────────

  function scanFolder(db, url, body, match) {
    var folderPath = (body && body.path || "").trim();
    if (self.scanState.running) {
      return { ok: false, error: "scan_already_running", folder: self.scanState.folder };
    }
    if (folderPath && folderPath !== "all") {
      return { error: "folder scans unsupported on mobile; rescan all instead" };
    }
    self.scanState = {
      running: true, folder: "all", done: 0, total: 0,
      indexed: 0, skipped: 0, cancel: false, cancelled: false
    };
    // Fire-and-forget: page performs the native library scan and streams
    // batches back to the SW via postMessage({kind:'scan-insert'}).
    triggerPageScan();
    return { ok: true, message: "rescan all started" };
  }

  function triggerPageScan() {
    try {
      self.clients.matchAll({ includeUncontrolled: true }).then(function (clients) {
        if (!clients || !clients.length) return;
        clients[0].postMessage({ type: "photonic-page", payload: { kind: "scan-request" } });
      });
    } catch (e) { /* no-op */ }
  }

  // ── GET /api/scan/status ────────────────────────────────────────────────

  function scanStatus(db, url, body, match) {
    return {
      running: self.scanState.running,
      folder: self.scanState.folder,
      done: self.scanState.done,
      total: self.scanState.total,
      indexed: self.scanState.indexed,
      skipped: self.scanState.skipped,
      cancel: self.scanState.cancel,
      cancelled: self.scanState.cancelled
    };
  }

  // ── POST /api/scan/cancel ───────────────────────────────────────────────

  function cancelScan(db, url, body, match) {
    if (!self.scanState.running) return { ok: false, error: "no scan running" };
    self.scanState.cancel = true;
    return { ok: true };
  }

  // ── Export ──────────────────────────────────────────────────────────────

  self.ApiHandlers.listFolders = listFolders;
  self.ApiHandlers.listFoldersTree = listFoldersTree;
  self.ApiHandlers.browseFolder = browseFolder;
  self.ApiHandlers.addFolder = addFolder;
  self.ApiHandlers.deleteFolder = deleteFolder;
  self.ApiHandlers.scanFolder = scanFolder;
  self.ApiHandlers.scanStatus = scanStatus;
  self.ApiHandlers.cancelScan = cancelScan;
})();
