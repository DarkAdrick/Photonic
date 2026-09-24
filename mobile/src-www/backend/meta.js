// Photonic mobile — Metadata, settings, cleaning & misc endpoint handlers
"use strict";

self.ApiHandlers = self.ApiHandlers || {};

(function () {
  var N = self.NativeApi;
  var all = N.all;
  var one = N.one;
  var run = N.run;

  // ── Settings (in-memory with defaults) ──────────────────────────────────

  self.settings = self.settings || { language: "en-US", telemetry_enabled: true };

  // ── Collection aggregation helper ───────────────────────────────────────

  function aggregateCollectionItems(db, includeHidden, hiddenOnly) {
    var rows = all(db, "SELECT id, parent_id FROM collections");
    var children = {};
    var allIds = [];
    var i, r, cid;

    rows.forEach(function (r) {
      allIds.push(r.id);
      var key = r.parent_id !== null ? r.parent_id : null;
      if (!children[key]) children[key] = [];
      children[key].push(r.id);
    });

    var excluded = {};
    if (!includeHidden) {
      var exclRows = all(db, "SELECT id FROM photos WHERE is_hidden = " + (hiddenOnly ? "0" : "1"));
      exclRows.forEach(function (r) { excluded[r.id] = true; });
    }

    var direct = {};
    var pcRows = all(db, "SELECT collection_id, photo_id FROM photo_collections");
    pcRows.forEach(function (r) {
      if (excluded[r.photo_id]) return;
      if (!direct[r.collection_id]) direct[r.collection_id] = {};
      direct[r.collection_id][r.photo_id] = true;
    });

    var memo = {};

    function subtreeIds(cId, visiting) {
      if (memo[cId] !== undefined) return memo[cId];
      if (visiting[cId]) { memo[cId] = {}; return memo[cId]; }
      visiting[cId] = true;
      var ids = Object.assign({}, direct[cId] || {});
      (children[cId] || []).forEach(function (ch) {
        var childIds = subtreeIds(ch, visiting);
        Object.keys(childIds).forEach(function (k) { ids[k] = true; });
      });
      delete visiting[cId];
      memo[cId] = ids;
      return ids;
    }

    var aggCount = {}, aggSamples = {};
    allIds.forEach(function (cId) {
      var ids = subtreeIds(cId, {});
      var keys = Object.keys(ids).map(Number).sort(function (a, b) { return b - a; });
      aggCount[cId] = keys.length;
      aggSamples[cId] = keys.slice(0, 4);
    });
    return { count: aggCount, samples: aggSamples };
  }

  // ── GET /api/collections ────────────────────────────────────────────────

  function listCollections(db, url, body, match) {
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";

    var cond = N.hiddenSql("ph.", showHidden, hiddenOnly);
    var hidden = cond ? " AND " + cond : "";

    var rows = all(db,
      "WITH RECURSIVE path_cte(id, name, parent_id, path_str) AS (" +
      "  SELECT id, name, parent_id, name FROM collections WHERE parent_id IS NULL " +
      "  UNION ALL " +
      "  SELECT c.id, c.name, c.parent_id, p.path_str || ' › ' || c.name " +
      "  FROM collections c JOIN path_cte p ON c.parent_id = p.id" +
      ") " +
      "SELECT c.id, p.path_str as name, c.color, c.icon, c.parent_id, " +
      "(SELECT COUNT(*) FROM photo_collections pc " +
      "  JOIN photos ph ON ph.id = pc.photo_id " +
      "  WHERE pc.collection_id = c.id" + hidden + ") as photo_count " +
      "FROM collections c " +
      "JOIN path_cte p ON c.id = p.id " +
      "GROUP BY c.id ORDER BY p.path_str"
    );

    return rows.map(function (r) {
      return {
        id: r.id, name: r.name, color: r.color, icon: r.icon,
        parent_id: r.parent_id, photo_count: r.photo_count
      };
    });
  }

  // ── GET /api/collections/tree ───────────────────────────────────────────

  function listCollectionsTree(db, url, body, match) {
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";

    var rows = all(db,
      "SELECT c.id, c.name, c.color, c.icon, c.parent_id FROM collections c ORDER BY c.name"
    );
    var agg = aggregateCollectionItems(db, showHidden, hiddenOnly);

    var entries = {};
    var roots = [];
    rows.forEach(function (r) {
      entries[r.id] = {
        id: r.id, name: r.name, color: r.color, icon: r.icon,
        parent_id: r.parent_id, photo_count: agg.count[r.id] || 0, children: []
      };
    });

    rows.forEach(function (r) {
      var e = entries[r.id];
      if (r.parent_id && entries[r.parent_id]) {
        entries[r.parent_id].children.push(e);
      } else {
        roots.push(e);
      }
    });

    function flatten(nodes, depth) {
      var result = [];
      nodes.forEach(function (n) {
        result.push({
          id: n.id, name: n.name, color: n.color, icon: n.icon,
          parent_id: n.parent_id, photo_count: n.photo_count,
          depth: depth, has_children: n.children.length > 0
        });
        result = result.concat(flatten(n.children, depth + 1));
      });
      return result;
    }

    return flatten(roots, 0);
  }

  // ── GET /api/collections/browse ─────────────────────────────────────────

  function browseCollections(db, url, body, match) {
    var parentId = url.searchParams.get("parent_id");
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";

    var rows;
    if (parentId !== null) {
      rows = all(db,
        "SELECT c.id, c.name, c.color, c.icon FROM collections c WHERE c.parent_id = ? ORDER BY c.name",
        [parseInt(parentId)]
      );
    } else {
      rows = all(db,
        "SELECT c.id, c.name, c.color, c.icon FROM collections c WHERE c.parent_id IS NULL ORDER BY c.name"
      );
    }

    var agg = aggregateCollectionItems(db, showHidden, hiddenOnly);

    return rows.map(function (r) {
      return {
        id: r.id, name: r.name, color: r.color, icon: r.icon,
        photo_count: agg.count[r.id] || 0, sample_ids: agg.samples[r.id] || []
      };
    });
  }

  // ── POST /api/collections ───────────────────────────────────────────────

  function createCollection(db, url, body, match) {
    var name = (body && body.name || "").trim();
    var parentId = body && body.parent_id !== undefined ? body.parent_id : null;
    var color = body && body.color !== undefined ? body.color : null;
    var icon = body && body.icon !== undefined ? body.icon : null;
    if (!name) return { error: "name is required" };

    try {
      run(db, "INSERT INTO collections (name, parent_id, color, icon) VALUES (?, ?, ?, ?)", [name, parentId, color, icon]);
      var idRow = one(db, "SELECT last_insert_rowid() AS id");
      return { ok: true, id: idRow.id };
    } catch (e) {
      return { error: "collection already exists" };
    }
  }

  // ── PUT /api/collections/{id} ───────────────────────────────────────────

  function updateCollection(db, url, body, match) {
    var collectionId = parseInt(match[1]);
    var name = body && body.name !== undefined ? (body.name || "").trim() : null;
    var color = body && body.color !== undefined ? body.color : null;
    var icon = body && body.icon !== undefined ? body.icon : null;
    var parentId = body && "parent_id" in body ? body.parent_id : null;

    try {
      if (name !== null && name !== undefined) {
        run(db, "UPDATE collections SET name = ? WHERE id = ?", [name, collectionId]);
      }
      if (color !== null && color !== undefined) {
        run(db, "UPDATE collections SET color = ? WHERE id = ?", [color, collectionId]);
      }
      if (icon !== null && icon !== undefined) {
        run(db, "UPDATE collections SET icon = ? WHERE id = ?", [icon, collectionId]);
      }
      if (body && "parent_id" in body) {
        run(db, "UPDATE collections SET parent_id = ? WHERE id = ?", [parentId, collectionId]);
      }
    } catch (e) {
      return { error: "collection name already exists at this level" };
    }
    return { ok: true };
  }

  // ── DELETE /api/collections/{id} ────────────────────────────────────────

  function deleteCollection(db, url, body, match) {
    var id = parseInt(match[1]);
    run(db, "DELETE FROM collections WHERE id = ?", [id]);
    return { ok: true };
  }

  // ── GET /api/tags ───────────────────────────────────────────────────────

  function listTags(db, url, body, match) {
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";

    var cond = N.hiddenSql("ph.", showHidden, hiddenOnly);
    var hf = cond ? "AND " + cond + " " : "";

    return all(db,
      "SELECT t.id, t.name, t.color, t.parent_id, " +
      "(SELECT COUNT(*) FROM photo_tags pt JOIN photos ph ON ph.id = pt.photo_id " +
      "  WHERE pt.tag_id = t.id " + hf + ") as photo_count " +
      "FROM tags t GROUP BY t.id ORDER BY t.name"
    ).map(function (r) {
      return {
        id: r.id, name: r.name, color: r.color, parent_id: r.parent_id,
        photo_count: r.photo_count
      };
    });
  }

  // ── GET /api/tags/browse ────────────────────────────────────────────────

  function browseTags(db, url, body, match) {
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";

    var cond = N.hiddenSql("ph.", showHidden, hiddenOnly);
    var wh = cond ? "WHERE " + cond + " " : "";
    var hf2 = cond ? "AND " + cond + " " : "";

    var rows = all(db,
      "SELECT t.id, t.name, t.color, COUNT(pt.photo_id) as photo_count " +
      "FROM tags t " +
      "LEFT JOIN photo_tags pt ON t.id = pt.tag_id " +
      "LEFT JOIN photos ph ON ph.id = pt.photo_id " +
      wh +
      "GROUP BY t.id HAVING COUNT(pt.photo_id) > 0 ORDER BY t.name"
    );

    return rows.map(function (r) {
      var samples = all(db,
        "SELECT pt.photo_id FROM photo_tags pt JOIN photos ph ON ph.id = pt.photo_id " +
        "WHERE pt.tag_id = ? " + hf2 + "ORDER BY pt.photo_id DESC LIMIT 4",
        [r.id]
      ).map(function (x) { return x.photo_id; });

      return {
        id: r.id, name: r.name, color: r.color,
        photo_count: r.photo_count, sample_ids: samples
      };
    });
  }

  // ── POST /api/tags ──────────────────────────────────────────────────────

  function createTag(db, url, body, match) {
    var name = (body && body.name || "").trim();
    var parentId = body && body.parent_id !== undefined ? body.parent_id : null;
    var color = body && body.color !== undefined ? body.color : null;
    if (!name) return { error: "name is required" };

    try {
      run(db, "INSERT INTO tags (name, parent_id, color) VALUES (?, ?, ?)", [name, parentId, color]);
      var idRow = one(db, "SELECT last_insert_rowid() AS id");
      return { ok: true, id: idRow.id };
    } catch (e) {
      return { error: "tag already exists" };
    }
  }

  // ── PUT /api/tags/{id} ──────────────────────────────────────────────────

  function updateTag(db, url, body, match) {
    var tagId = parseInt(match[1]);
    var name = body && body.name !== undefined ? (body.name || "").trim() : null;
    var color = body && body.color !== undefined ? body.color : null;

    try {
      if (name !== null && name !== undefined) {
        run(db, "UPDATE tags SET name = ? WHERE id = ?", [name, tagId]);
      }
      if (color !== null && color !== undefined) {
        run(db, "UPDATE tags SET color = ? WHERE id = ?", [color, tagId]);
      }
    } catch (e) {
      return { error: "tag name already exists" };
    }
    return { ok: true };
  }

  // ── DELETE /api/tags/{id} ───────────────────────────────────────────────

  function deleteTag(db, url, body, match) {
    var id = parseInt(match[1]);
    run(db, "DELETE FROM tags WHERE id = ?", [id]);
    return { ok: true };
  }

  // ── GET /api/countries ──────────────────────────────────────────────────

  function listCountries(db, url, body, match) {
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";

    var cond = N.hiddenSql("", showHidden, hiddenOnly);
    var hf = cond ? "AND " + cond + " " : "";

    try { db.exec("PRAGMA group_concat_limit = 1000000"); } catch (e) { /* not supported, ignore */ }

    var rows = all(db,
      "SELECT country, COUNT(*) as photo_count, GROUP_CONCAT(id) as ids " +
      "FROM photos WHERE country IS NOT NULL " + hf +
      "GROUP BY country ORDER BY country"
    );

    return rows.map(function (r) {
      var ids = r.ids ? r.ids.split(",").map(Number) : [];
      return {
        code: r.country,
        name: N.COUNTRY_NAMES[r.country] || r.country,
        photo_count: r.photo_count,
        sample_ids: ids.slice(0, 4)
      };
    });
  }

  // ── GET /api/cameras/browse ─────────────────────────────────────────────

  function browseCameras(db, url, body, match) {
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";

    var cond = N.hiddenSql("", showHidden, hiddenOnly);
    var hf = cond ? "AND " + cond + " " : "";

    var rows = all(db,
      "SELECT camera_model, COUNT(*) as photo_count, GROUP_CONCAT(id) as ids " +
      "FROM photos WHERE camera_model IS NOT NULL " + hf +
      "GROUP BY camera_model ORDER BY photo_count DESC"
    );

    return rows.map(function (r) {
      var ids = r.ids ? r.ids.split(",").map(Number) : [];
      return {
        name: r.camera_model,
        photo_count: r.photo_count,
        sample_ids: ids.slice(0, 4)
      };
    });
  }

  // ── GET /api/stats ──────────────────────────────────────────────────────

  function getStats(db, url, body, match) {
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";

    var cond = N.hiddenSql("", showHidden, hiddenOnly);
    var hf = cond ? "WHERE " + cond + " " : "";
    var hfa = cond ? "AND " + cond + " " : "";
    var hid = cond ? cond + " AND " : "";

    var totalPhotos = N.count1(db, "SELECT COUNT(*) AS c FROM photos " + hf);
    var totalSizeRow = one(db, "SELECT COALESCE(SUM(size), 0) AS s FROM photos " + hf);
    var totalSize = totalSizeRow ? totalSizeRow.s : 0;

    var extRows = all(db,
      "SELECT extension, COUNT(*) as cnt, COALESCE(SUM(size), 0) as sz " +
      "FROM photos " + hf + "GROUP BY extension ORDER BY cnt DESC"
    );
    var formats = extRows.map(function (r) {
      return { ext: r.extension, count: r.cnt, size: r.sz };
    });

    var geoRow = one(db,
      "SELECT COUNT(*) AS c FROM photos WHERE latitude IS NOT NULL AND longitude IS NOT NULL " + hfa
    );
    var geoCount = geoRow ? geoRow.c : 0;

    var timelineRows = all(db,
      "SELECT SUBSTR(date_taken, 1, 7) as month, COUNT(*) as cnt " +
      "FROM photos WHERE date_taken IS NOT NULL " + hfa +
      "GROUP BY month ORDER BY month"
    );
    var timeline = timelineRows.map(function (r) { return { month: r.month, count: r.cnt }; });

    var countryRows = all(db,
      "SELECT country, COUNT(*) as cnt FROM photos WHERE country IS NOT NULL " + hfa +
      "GROUP BY country ORDER BY cnt DESC LIMIT 15"
    );
    var countries = countryRows.map(function (r) {
      return { code: r.country, name: N.COUNTRY_NAMES[r.country] || r.country, count: r.cnt };
    });

    var videoExts = N.VIDEO_EXT_SET;
    var videoFormats = formats.filter(function (f) { return videoExts[f.ext.toLowerCase()]; });
    var videoCount = videoFormats.reduce(function (s, f) { return s + f.count; }, 0);

    var count360Row = one(db,
      "SELECT COUNT(*) AS c FROM photos WHERE " + hid +
      "(camera_model LIKE '%THETA%' OR camera_make LIKE '%THETA%' " +
      "OR camera_model LIKE '%INSTA360%' OR camera_make LIKE '%INSTA360%' " +
      "OR (camera_model LIKE '%MAX%' AND camera_make LIKE '%GOPRO%') " +
      "OR (width IS NOT NULL AND height IS NOT NULL AND (width * 1.0 / height) BETWEEN 1.95 AND 2.05))"
    );
    var count360 = count360Row ? count360Row.c : 0;

    return {
      total_photos: totalPhotos,
      total_size: totalSize,
      formats: formats,
      geo_count: geoCount,
      geo_total: totalPhotos,
      count_360: count360,
      timeline: timeline,
      countries: countries,
      video_count: videoCount
    };
  }

  // ── GET /api/status ─────────────────────────────────────────────────────

  function getStatus(db, url, body, match) {
    var count = N.countPhotos(db, false, false);
    return { status: "running", version: N.APP_VERSION, photo_count: count };
  }

  // ── GET /api/changelog ──────────────────────────────────────────────────

  var CHIP_MAP = {
    "ADD": "chip-add",
    "FIX": "chip-fix",
    "EDIT": "chip-edit",
    "REMOVE": "chip-remove",
  };

  function mdToChangelogHtml(md) {
    var lines = md.trim().split("\n");
    var html = [];
    var inList = false;
    var versions = [];
    var current = null;

    for (var i = 0; i < lines.length; i++) {
      var stripped = lines[i].replace(/\s+$/, "");
      if (stripped.indexOf("## ") === 0) {
        if (inList && current) { current.content.push("</ul>"); inList = false; }
        if (current) versions.push(current);
        var title = stripped.slice(3);
        // Group headers (e.g. "## v0.2.x") have no " — " date separator
        if (title.indexOf(" — ") === -1) {
          versions.push({ group: title });
          current = null;
        } else {
          current = { title: title, content: [] };
        }
      } else if (stripped.indexOf("### ") === 0) {
        if (!current) continue;
        if (inList) { current.content.push("</ul>"); inList = false; }
        current.content.push("<h5>" + stripped.slice(4) + "</h5>");
      } else if (stripped.indexOf("- ") === 0) {
        if (!inList) { current.content.push("<ul>"); inList = true; }
        var content = stripped.slice(2);
        content = content.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
        var chipMatch = content.match(/^\[(\w+)\]\s*(.*)$/);
        if (chipMatch) {
          var tag = chipMatch[1].toUpperCase();
          content = '<span class="cl-chip ' + (CHIP_MAP[tag] || "chip-default") + '">' + tag + "</span> " + chipMatch[2];
        }
        current.content.push("<li>" + content + "</li>");
      } else {
        if (inList) { current.content.push("</ul>"); inList = false; }
      }
    }
    if (inList && current) current.content.push("</ul>");
    if (current) versions.push(current);

    var versionIndex = 0;
    for (var v = 0; v < versions.length; v++) {
      var ver = versions[v];
      if (ver.group) {
        html.push('<div class="cl-group-header">' + ver.group + "</div>");
        continue;
      }
      // open the first real version by default (skip group headers)
      var openAttr = versionIndex === 0 ? " open" : "";
      versionIndex++;
      var titleText = ver.title;
      var sep = titleText.lastIndexOf(" — ");
      var nameHtml = sep >= 0
        ? titleText.slice(0, sep) + ' <span class="cl-version-date">' + titleText.slice(sep + 3) + "</span>"
        : titleText;
      var chevron = '<svg class="cl-chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>';
      html.push('<details class="cl-version"' + openAttr + ">");
      html.push("<summary>" + chevron + '<span class="cl-version-title">' + nameHtml + "</span></summary>");
      html.push('<div class="cl-version-body">');
      html.push.apply(html, ver.content);
      html.push("</div></details>");
    }

    return html.join("\n");
  }

  var changelogCache = null;

  async function getChangelog(db, url, body, match) {
    if (!changelogCache) {
      try {
        var res = await fetch("./CHANGELOG.md");
        if (res.ok) changelogCache = mdToChangelogHtml(await res.text());
      } catch (e) { /* keep null → fallback below */ }
    }
    return { html: changelogCache || "<p>No changelog available.</p>" };
  }

  // ── GET /api/settings/language ──────────────────────────────────────────

  function getLanguageSetting(db, url, body, match) {
    return { language: self.settings.language || "en-US" };
  }

  // ── POST /api/settings/language ─────────────────────────────────────────

  function setLanguageSetting(db, url, body, match) {
    var language = String((body && body.language) || "en-US");
    self.settings.language = language;
    return { language: language };
  }

  // ── GET /api/settings/telemetry ─────────────────────────────────────────

  function getTelemetrySetting(db, url, body, match) {
    return { enabled: !!self.settings.telemetry_enabled };
  }

  // ── POST /api/settings/telemetry ────────────────────────────────────────

  function setTelemetrySetting(db, url, body, match) {
    var enabled = !!(body && body.enabled !== undefined ? body.enabled : true);
    self.settings.telemetry_enabled = enabled;
    return { enabled: enabled };
  }

  // ── Cleaning ────────────────────────────────────────────────────────────

  var _analysisState = {
    running: false,
    done: 0,
    total: 0,
    phase: ""
  };

  // ── POST /api/cleaning/analyze ──────────────────────────────────────────

  function cleaningAnalyze(db, url, body, match) {
    // Blur/quality analysis requires image decoding (Pillow/OpenCV).
    // On mobile this is not available via sql.js. Return "not available" gracefully.
    return { ok: false, message: "blur analysis not available in mobile (native bridge required)" };
  }

  // ── GET /api/cleaning/status ────────────────────────────────────────────

  function cleaningStatus(db, url, body, match) {
    return {
      running: _analysisState.running,
      done: _analysisState.done,
      total: _analysisState.total,
      phase: _analysisState.phase
    };
  }

  // ── GET /api/cleaning/duplicates ────────────────────────────────────────

  function cleaningDuplicates(db, url, body, match) {
    var rows = all(db,
      "SELECT id, filename, path, hash, size, width, height, date_taken " +
      "FROM photos WHERE hash IS NOT NULL AND hash != '' AND is_hidden = 0 " +
      "ORDER BY hash, date_taken"
    );
    var groups = {};
    rows.forEach(function (r) {
      var h = r.hash;
      if (!groups[h]) groups[h] = [];
      groups[h].push({
        id: r.id, filename: r.filename, path: r.path, hash: r.hash,
        size: r.size, width: r.width, height: r.height, date_taken: r.date_taken
      });
    });
    var result = [];
    Object.keys(groups).forEach(function (h) {
      if (groups[h].length > 1) result.push(groups[h]);
    });
    return {
      groups: result,
      count: result.reduce(function (s, g) { return s + g.length; }, 0)
    };
  }

  // ── GET /api/cleaning/blurry ────────────────────────────────────────────

  function cleaningBlurry(db, url, body, match) {
    // Blur analysis requires Pillow — not available in sql.js
    return { photos: [], count: 0, note: "blur analysis requires native image processing" };
  }

  // ── GET /api/cleaning/similar ───────────────────────────────────────────

  function cleaningSimilar(db, url, body, match) {
    // Similar detection requires perceptual hash comparison.
    // This can work if perceptual_hash is populated, but computing it requires image access.
    var rows = all(db,
      "SELECT id, filename, path, perceptual_hash, size, width, height, date_taken " +
      "FROM photos WHERE perceptual_hash IS NOT NULL AND perceptual_hash != '' AND is_hidden = 0 " +
      "ORDER BY perceptual_hash"
    );
    var photos = rows.map(function (r) {
      return {
        id: r.id, filename: r.filename, path: r.path,
        perceptual_hash: r.perceptual_hash, size: r.size,
        width: r.width, height: r.height, date_taken: r.date_taken
      };
    });

    var threshold = parseInt(url.searchParams.get("threshold")) || 10;
    var visited = {};
    var groups = [];

    for (var i = 0; i < photos.length; i++) {
      if (visited[i]) continue;
      var group = [photos[i]];
      visited[i] = true;
      for (var j = i + 1; j < photos.length; j++) {
        if (visited[j]) continue;
        if (hammingDistance(photos[i].perceptual_hash, photos[j].perceptual_hash) <= threshold) {
          group.push(photos[j]);
          visited[j] = true;
        }
      }
      if (group.length > 1) groups.push(group);
    }

    return {
      groups: groups,
      count: groups.reduce(function (s, g) { return s + g.length; }, 0)
    };
  }

  function hammingDistance(h1, h2) {
    try {
      var v1 = parseInt(h1, 16);
      var v2 = parseInt(h2, 16);
      var xor = v1 ^ v2;
      var count = 0;
      while (xor) { count += xor & 1; xor >>= 1; }
      return count;
    } catch (e) {
      return 64;
    }
  }

  // ── GET /api/cleaning/bad ───────────────────────────────────────────────

  function cleaningBad(db, url, body, match) {
    var rows = all(db,
      "SELECT id, filename, path, quality_flags, width, height, date_taken " +
      "FROM photos WHERE quality_flags IS NOT NULL AND quality_flags != '' AND is_hidden = 0 " +
      "ORDER BY filename"
    );
    var bad = [];
    rows.forEach(function (r) {
      try {
        var flags = JSON.parse(r.quality_flags);
        if (flags.is_black || flags.is_white || flags.is_underexposed || flags.is_overexposed) {
          bad.push({
            id: r.id, filename: r.filename, path: r.path,
            width: r.width, height: r.height, date_taken: r.date_taken,
            flags: flags
          });
        }
      } catch (e) { /* invalid JSON, skip */ }
    });
    return { photos: bad, count: bad.length };
  }

  // ── POST /api/cleaning/delete ───────────────────────────────────────────

  function cleaningDelete(db, url, body, match) {
    var ids = body && body.ids;
    if (!Array.isArray(ids) || !ids.length) return { error: "ids required" };
    var deleted = 0;
    ids.forEach(function (pid) {
      var row = one(db, "SELECT path FROM photos WHERE id = ?", [pid]);
      if (!row) return;
      run(db, "DELETE FROM photo_tags WHERE photo_id = ?", [pid]);
      run(db, "DELETE FROM photo_collections WHERE photo_id = ?", [pid]);
      run(db, "DELETE FROM _thumb_done WHERE photo_id = ?", [pid]);
      run(db, "DELETE FROM photos WHERE id = ?", [pid]);
      deleted++;
      // Note: actual file deletion requires native bridge on mobile
    });
    return { ok: true, deleted: deleted };
  }

  // ── GET /api/sponsors ───────────────────────────────────────────────────

  var sponsorsCache = null;

  var DEFAULT_CREDITS = {
    sponsors: [
      { name: "The Phoenix Factory", reason: "Of course \u{1F917}", url: "https://thephoenixfactory.com/" }
    ],
    thanks: [
      { name: "My Parents", reason: "For making my existence possible." }
    ]
  };

  async function getSponsors(db, url, body, match) {
    if (!sponsorsCache) {
      sponsorsCache = { sponsors: [], thanks: [], checked_at: Date.now(), error: null };
      try {
        var res = await fetch("./credits.json");
        if (res.ok) {
          var data = JSON.parse(await res.text());
          sponsorsCache.sponsors = (data && data.sponsors) || [];
          sponsorsCache.thanks = (data && data.thanks) || [];
        } else {
          throw new Error("HTTP " + res.status);
        }
      } catch (e) {
        sponsorsCache.sponsors = DEFAULT_CREDITS.sponsors.slice();
        sponsorsCache.thanks = DEFAULT_CREDITS.thanks.slice();
        sponsorsCache.error = String((e && e.message) || e);
      }
    }
    return sponsorsCache;
  }

  // ── GET /api/update/status ──────────────────────────────────────────────

  function getUpdateStatus(db, url, body, match) {
    return {
      current_version: N.APP_VERSION,
      latest_version: null,
      update_available: false,
      release_url: null,
      release_name: null,
      published_at: null,
      checked_at: null,
      error: null
    };
  }

  // ── POST /api/update/check ──────────────────────────────────────────────

  function checkUpdate(db, url, body, match) {
    return {
      current_version: N.APP_VERSION,
      latest_version: null,
      update_available: false,
      release_url: null,
      release_name: null,
      published_at: null,
      checked_at: null,
      error: null
    };
  }

  // ── Export ──────────────────────────────────────────────────────────────

  self.ApiHandlers.listCollections = listCollections;
  self.ApiHandlers.listCollectionsTree = listCollectionsTree;
  self.ApiHandlers.browseCollections = browseCollections;
  self.ApiHandlers.createCollection = createCollection;
  self.ApiHandlers.updateCollection = updateCollection;
  self.ApiHandlers.deleteCollection = deleteCollection;
  self.ApiHandlers.listTags = listTags;
  self.ApiHandlers.browseTags = browseTags;
  self.ApiHandlers.createTag = createTag;
  self.ApiHandlers.updateTag = updateTag;
  self.ApiHandlers.deleteTag = deleteTag;
  self.ApiHandlers.listCountries = listCountries;
  self.ApiHandlers.browseCameras = browseCameras;
  self.ApiHandlers.getStats = getStats;
  self.ApiHandlers.getStatus = getStatus;
  self.ApiHandlers.getChangelog = getChangelog;
  self.ApiHandlers.getLanguageSetting = getLanguageSetting;
  self.ApiHandlers.setLanguageSetting = setLanguageSetting;
  self.ApiHandlers.getTelemetrySetting = getTelemetrySetting;
  self.ApiHandlers.setTelemetrySetting = setTelemetrySetting;
  self.ApiHandlers.cleaningAnalyze = cleaningAnalyze;
  self.ApiHandlers.cleaningStatus = cleaningStatus;
  self.ApiHandlers.cleaningDuplicates = cleaningDuplicates;
  self.ApiHandlers.cleaningBlurry = cleaningBlurry;
  self.ApiHandlers.cleaningSimilar = cleaningSimilar;
  self.ApiHandlers.cleaningBad = cleaningBad;
  self.ApiHandlers.cleaningDelete = cleaningDelete;
  self.ApiHandlers.getSponsors = getSponsors;
  self.ApiHandlers.getUpdateStatus = getUpdateStatus;
  self.ApiHandlers.checkUpdate = checkUpdate;
})();
