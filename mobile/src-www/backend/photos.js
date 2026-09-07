// Photonic mobile — Photo endpoint handlers
"use strict";

self.ApiHandlers = self.ApiHandlers || {};

(function () {
  var N = self.NativeApi;
  var all = N.all;
  var one = N.one;
  var run = N.run;

  // ── GET /api/photos ─────────────────────────────────────────────────────

  function listPhotos(db, url, body, match) {
    var page = parseInt(url.searchParams.get("page")) || 1;
    var perPage = parseInt(url.searchParams.get("per_page")) || 80;
    if (perPage < 10) perPage = 10;
    if (perPage > 500) perPage = 500;
    var folderId = url.searchParams.get("folder_id");
    var q = url.searchParams.get("q");
    var camera = url.searchParams.get("camera");
    var lens = url.searchParams.get("lens");
    var dateFrom = url.searchParams.get("date_from");
    var dateTo = url.searchParams.get("date_to");
    var ext = url.searchParams.get("ext");
    var type = url.searchParams.get("type");
    var rating = url.searchParams.get("rating");
    var tagId = url.searchParams.get("tag_id");
    var collectionId = url.searchParams.get("collection_id");
    var country = url.searchParams.get("country");
    var city = url.searchParams.get("city");
    var nearCity = url.searchParams.get("near_city");
    var nearKm = url.searchParams.get("near_km");
    var geo = url.searchParams.get("geo");
    var is360 = url.searchParams.get("is_360");
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";

    var nearLat = null, nearLng = null;
    if (nearCity && nearKm !== null) {
      var cityRow = one(db,
        "SELECT latitude, longitude FROM photos WHERE city = ? AND latitude IS NOT NULL LIMIT 1",
        [nearCity]
      );
      if (cityRow) { nearLat = cityRow.latitude; nearLng = cityRow.longitude; }
    }

    var offset = (page - 1) * perPage;
    var whereParts = [];
    var params = [];

    var hc = N.hiddenSql("p.", showHidden, hiddenOnly);
    if (hc) whereParts.push(hc);

    if (folderId) {
      var folderRow = one(db, "SELECT path FROM folders WHERE id = ?", [parseInt(folderId)]);
      if (folderRow) {
        whereParts.push("p.path LIKE ? ESCAPE '\\'");
        params.push(N.underPattern(folderRow.path));
      }
    }

    if (collectionId !== null) {
      whereParts.push("p.id IN (SELECT pc.photo_id FROM photo_collections pc JOIN (WITH RECURSIVE descendants AS (SELECT id FROM collections WHERE id = ? UNION ALL SELECT c.id FROM collections c JOIN descendants d ON c.parent_id = d.id) SELECT id FROM descendants) d ON pc.collection_id = d.id)");
      params.push(parseInt(collectionId));
    }

    if (q) {
      whereParts.push("(p.filename LIKE ? OR p.camera_model LIKE ? OR p.camera_make LIKE ? OR p.lens LIKE ?)");
      var like = "%" + q + "%";
      params.push(like, like, like, like);
    }

    if (camera) {
      whereParts.push("p.camera_model = ?");
      params.push(camera);
    }

    if (lens) {
      whereParts.push("p.lens LIKE ?");
      params.push("%" + lens + "%");
    }

    if (dateFrom) {
      whereParts.push("REPLACE(p.date_taken, ':', '-') >= ?");
      params.push(dateFrom);
    }

    if (dateTo) {
      whereParts.push("REPLACE(p.date_taken, ':', '-') <= ?");
      params.push(dateTo + " 23:59:59");
    }

    var ec = N.extClause(ext, "p.");
    if (ec) { whereParts.push(ec.clause); params = params.concat(ec.params); }

    var tc = N.typeExts(type);
    if (tc) {
      whereParts.push(tc.clause.replace("extension", "p.extension"));
      params = params.concat(tc.params);
    }

    if (rating !== null) {
      whereParts.push("p.rating >= ?");
      params.push(parseInt(rating));
    }

    if (tagId !== null) {
      whereParts.push("p.id IN (SELECT photo_id FROM photo_tags WHERE tag_id = ?)");
      params.push(parseInt(tagId));
    }

    if (country) {
      whereParts.push("p.country = ?");
      params.push(country);
    }

    if (city) {
      whereParts.push("p.city = ?");
      params.push(city);
    }

    if (geo === "1") {
      whereParts.push("p.latitude IS NOT NULL AND p.longitude IS NOT NULL");
    } else if (geo === "0") {
      whereParts.push("(p.latitude IS NULL OR p.longitude IS NULL)");
    }

    if (is360 === "1") {
      whereParts.push(N._360_SQL_TRUE);
    } else if (is360 === "0") {
      whereParts.push(N._360_SQL_FALSE);
    }

    if (nearLat !== null && nearLng !== null && nearKm !== null) {
      var radLat = nearLat * Math.PI / 180;
      var radLng = nearLng * Math.PI / 180;
      whereParts.push(
        "(6371 * acos(cos(?1) * cos(radians(p.latitude)) * cos(radians(p.longitude) - ?2) + sin(?1) * sin(radians(p.latitude)))) <= ?3"
      );
      params.push(radLat, radLng, parseFloat(nearKm));
    }

    var where = whereParts.length ? "WHERE " + whereParts.join(" AND ") : "";

    var totalRow = one(db, "SELECT COUNT(*) AS c FROM photos p " + where, params);
    var total = totalRow ? totalRow.c : 0;

    var qParams = params.concat([perPage, offset]);
    var rows = all(db,
      "SELECT p.id, p.filename, p.width, p.height, p.camera_model, p.date_taken, p.is_hidden, " +
      "(SELECT COUNT(*) FROM photo_tags pt WHERE pt.photo_id = p.id) AS tag_count, " +
      "(SELECT COUNT(*) FROM photo_collections pc WHERE pc.photo_id = p.id) AS collection_count " +
      "FROM photos p " + where + " ORDER BY p.date_taken DESC, p.filename ASC LIMIT ? OFFSET ?",
      qParams
    );

    return {
      total: total,
      page: page,
      per_page: perPage,
      photos: rows.map(function (r) {
        return {
          id: r.id,
          filename: r.filename,
          width: r.width,
          height: r.height,
          camera: r.camera_model,
          date: r.date_taken,
          hidden: r.is_hidden === 1,
          tag_count: r.tag_count,
          collection_count: r.collection_count,
          thumb: "/api/photos/" + r.id + "/thumb/medium"
        };
      })
    };
  }

  // ── GET /api/filters ────────────────────────────────────────────────────

  function getFilters(db, url, body, match) {
    var showHidden = url.searchParams.get("show_hidden") === "true" || url.searchParams.get("show_hidden") === "1";
    var hiddenOnly = url.searchParams.get("hidden_only") === "true" || url.searchParams.get("hidden_only") === "1";
    var camFilterParam = url.searchParams.get("camera");
    var lensFilterParam = url.searchParams.get("lens");
    var countryFilter = url.searchParams.get("country");

    var cond = N.hiddenSql("", showHidden, hiddenOnly);
    var andf = cond ? "AND " + cond + " " : "";
    var whf = cond ? "WHERE " + cond + " " : "";

    var lensFilter = camFilterParam ? " AND camera_model = ?" : "";
    var camFilter = lensFilterParam ? " AND lens = ?" : "";
    var cityFilter = countryFilter ? " AND country = ?" : "";

    var cameras = all(db,
      "SELECT DISTINCT camera_model FROM photos WHERE camera_model IS NOT NULL AND camera_model != '' " + andf + camFilter + " ORDER BY camera_model",
      lensFilterParam ? [lensFilterParam] : []
    ).map(function (r) { return r.camera_model; });

    var lenses = all(db,
      "SELECT DISTINCT lens FROM photos WHERE lens IS NOT NULL AND lens != '' " + andf + lensFilter + " ORDER BY lens",
      camFilterParam ? [camFilterParam] : []
    ).map(function (r) { return r.lens; });

    var extensions = all(db,
      "SELECT DISTINCT extension FROM photos " + whf + "ORDER BY extension"
    ).map(function (r) { return r.extension; });

    var extensionsImage = extensions.filter(function (e) {
      return N.IMAGE_EXT_SET[e.toLowerCase()];
    }).sort();

    var extensionsVideo = extensions.filter(function (e) {
      return N.VIDEO_EXT_SET[e.toLowerCase()];
    }).sort();

    var dateRange = one(db,
      "SELECT MIN(date_taken) AS dmin, MAX(date_taken) AS dmax FROM photos WHERE date_taken IS NOT NULL " + andf
    );

    var countries = all(db,
      "SELECT DISTINCT country FROM photos WHERE country IS NOT NULL " + andf + "ORDER BY country"
    ).map(function (r) { return r.country; });

    var cities = all(db,
      "SELECT DISTINCT city FROM photos WHERE city IS NOT NULL " + andf + cityFilter + " ORDER BY city",
      countryFilter ? [countryFilter] : []
    ).map(function (r) { return r.city; });

    return {
      cameras: cameras,
      lenses: lenses,
      extensions: extensions,
      extensions_image: extensionsImage,
      extensions_video: extensionsVideo,
      date_min: dateRange ? dateRange.dmin : null,
      date_max: dateRange ? dateRange.dmax : null,
      countries: countries,
      cities: cities
    };
  }

  // ── GET /api/photos/geo/bounds ──────────────────────────────────────────

  function geoBounds(db, url, body, match) {
    var geotagOnly = url.searchParams.get("geotag_only");
    var where = geotagOnly !== "0"
      ? "WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
      : "WHERE 1=1";
    var params = [];

    var cond = N.hiddenSql("", url.searchParams.get("show_hidden") === "true", url.searchParams.get("hidden_only") === "true");
    if (cond) where += " AND " + cond;

    var v;
    v = url.searchParams.get("country"); if (v) { where += " AND country = ?"; params.push(v); }
    v = url.searchParams.get("city"); if (v) { where += " AND city = ?"; params.push(v); }
    v = url.searchParams.get("camera"); if (v) { where += " AND camera_model = ?"; params.push(v); }
    v = url.searchParams.get("lens"); if (v) { where += " AND lens LIKE ?"; params.push("%" + v + "%"); }

    var ec = N.extClause(url.searchParams.get("ext"));
    if (ec) { where += " AND " + ec.clause; params = params.concat(ec.params); }

    var tc = N.typeExts(url.searchParams.get("type"));
    if (tc) { where += " AND " + tc.clause; params = params.concat(tc.params); }

    v = url.searchParams.get("date_from"); if (v) { where += " AND REPLACE(date_taken, ':', '-') >= ?"; params.push(v); }
    v = url.searchParams.get("date_to"); if (v) { where += " AND REPLACE(date_taken, ':', '-') <= ?"; params.push(v + " 23:59:59"); }

    v = url.searchParams.get("rating");
    if (v !== null) { where += " AND rating >= ?"; params.push(parseInt(v)); }

    v = url.searchParams.get("q");
    if (v) {
      where += " AND (filename LIKE ? OR camera_model LIKE ? OR camera_make LIKE ? OR lens LIKE ?)";
      var like = "%" + v + "%";
      params.push(like, like, like, like);
    }

    v = url.searchParams.get("folder_id");
    if (v !== null) {
      var folderRow = one(db, "SELECT path FROM folders WHERE id = ?", [parseInt(v)]);
      if (folderRow) { where += " AND path LIKE ? ESCAPE '\\'"; params.push(N.underPattern(folderRow.path)); }
    }

    v = url.searchParams.get("collection_id");
    if (v !== null) {
      where += " AND id IN (SELECT pc.photo_id FROM photo_collections pc JOIN (WITH RECURSIVE descendants AS (SELECT id FROM collections WHERE id = ? UNION ALL SELECT c.id FROM collections c JOIN descendants d ON c.parent_id = d.id) SELECT id FROM descendants) d ON pc.collection_id = d.id)";
      params.push(parseInt(v));
    }

    var row = one(db,
      "SELECT MIN(latitude) AS south, MIN(longitude) AS west, MAX(latitude) AS north, MAX(longitude) AS east, COUNT(*) AS cnt FROM photos " + where,
      params
    );

    if (row && row.cnt > 0) {
      return { south: row.south, west: row.west, north: row.north, east: row.east, count: row.cnt };
    }
    return { count: 0 };
  }

  // ── GET /api/photos/geo ─────────────────────────────────────────────────

  function geoPhotos(db, url, body, match) {
    var geotagOnly = url.searchParams.get("geotag_only");
    var where = geotagOnly !== "0"
      ? "WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
      : "WHERE 1=1";
    var params = [];

    var cond = N.hiddenSql("", url.searchParams.get("show_hidden") === "true", url.searchParams.get("hidden_only") === "true");
    if (cond) where += " AND " + cond;

    var v;
    v = url.searchParams.get("country"); if (v) { where += " AND country = ?"; params.push(v); }
    v = url.searchParams.get("city"); if (v) { where += " AND city = ?"; params.push(v); }
    v = url.searchParams.get("camera"); if (v) { where += " AND camera_model = ?"; params.push(v); }
    v = url.searchParams.get("lens"); if (v) { where += " AND lens LIKE ?"; params.push("%" + v + "%"); }

    var ec = N.extClause(url.searchParams.get("ext"));
    if (ec) { where += " AND " + ec.clause; params = params.concat(ec.params); }

    v = url.searchParams.get("date_from"); if (v) { where += " AND REPLACE(date_taken, ':', '-') >= ?"; params.push(v); }
    v = url.searchParams.get("date_to"); if (v) { where += " AND REPLACE(date_taken, ':', '-') <= ?"; params.push(v + " 23:59:59"); }

    v = url.searchParams.get("rating");
    if (v !== null) { where += " AND rating >= ?"; params.push(parseInt(v)); }

    var tc = N.typeExts(url.searchParams.get("type"));
    if (tc) { where += " AND " + tc.clause; params = params.concat(tc.params); }

    v = url.searchParams.get("q");
    if (v) {
      where += " AND (filename LIKE ? OR camera_model LIKE ? OR camera_make LIKE ? OR lens LIKE ?)";
      var like = "%" + v + "%";
      params.push(like, like, like, like);
    }

    v = url.searchParams.get("is_360");
    if (v === "1") {
      where += " AND (camera_model LIKE '%THETA%' OR camera_make LIKE '%THETA%' OR camera_model LIKE '%INSTA360%' OR camera_make LIKE '%INSTA360%' OR (camera_model LIKE '%MAX%' AND camera_make LIKE '%GOPRO%') OR (width IS NOT NULL AND height IS NOT NULL AND (width * 1.0 / height) BETWEEN 1.95 AND 2.05))";
    } else if (v === "0") {
      where += " AND NOT (camera_model LIKE '%THETA%' OR camera_make LIKE '%THETA%' OR camera_model LIKE '%INSTA360%' OR camera_make LIKE '%INSTA360%' OR (camera_model LIKE '%MAX%' AND camera_make LIKE '%GOPRO%') OR (width IS NOT NULL AND height IS NOT NULL AND (width * 1.0 / height) BETWEEN 1.95 AND 2.05))";
    }

    v = url.searchParams.get("south");
    var south = v !== null ? parseFloat(v) : null;
    v = url.searchParams.get("west");
    var west = v !== null ? parseFloat(v) : null;
    v = url.searchParams.get("north");
    var north = v !== null ? parseFloat(v) : null;
    v = url.searchParams.get("east");
    var east = v !== null ? parseFloat(v) : null;

    if (south !== null && west !== null && north !== null && east !== null) {
      where += " AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?";
      params.push(south, north, west, east);
    }

    v = url.searchParams.get("folder_id");
    if (v !== null) {
      var folderRow = one(db, "SELECT path FROM folders WHERE id = ?", [parseInt(v)]);
      if (folderRow) { where += " AND path LIKE ? ESCAPE '\\'"; params.push(N.underPattern(folderRow.path)); }
    }

    v = url.searchParams.get("collection_id");
    if (v !== null) {
      where += " AND id IN (SELECT pc.photo_id FROM photo_collections pc JOIN (WITH RECURSIVE descendants AS (SELECT id FROM collections WHERE id = ? UNION ALL SELECT c.id FROM collections c JOIN descendants d ON c.parent_id = d.id) SELECT id FROM descendants) d ON pc.collection_id = d.id)";
      params.push(parseInt(v));
    }

    var totalRow = one(db, "SELECT COUNT(*) AS c FROM photos " + where, params);
    var total = totalRow ? totalRow.c : 0;

    var rows = all(db,
      "SELECT id, filename, latitude, longitude, camera_model, date_taken, width, height, is_hidden, " +
      "(SELECT COUNT(*) FROM photo_tags pt WHERE pt.photo_id = photos.id) AS tag_count, " +
      "(SELECT COUNT(*) FROM photo_collections pc WHERE pc.photo_id = photos.id) AS collection_count " +
      "FROM photos " + where,
      params
    );

    return {
      total: total,
      photos: rows.map(function (r) {
        return {
          id: r.id,
          filename: r.filename,
          lat: r.latitude,
          lng: r.longitude,
          camera: r.camera_model,
          date: r.date_taken,
          width: r.width,
          height: r.height,
          hidden: r.is_hidden === 1,
          tag_count: r.tag_count,
          collection_count: r.collection_count,
          thumb: "/api/photos/" + r.id + "/thumb/small"
        };
      })
    };
  }

  // ── GET /api/photos/{id} ────────────────────────────────────────────────

  function getPhoto(db, url, body, match) {
    var id = parseInt(match[1]);
    var row = one(db, "SELECT * FROM photos WHERE id = ?", [id]);
    if (!row) return { error: "not found" };
    return row;
  }

  // ── POST /api/photos/{id}/rate ──────────────────────────────────────────

  function ratePhoto(db, url, body, match) {
    var id = parseInt(match[1]);
    var rating = (body && body.rating !== undefined) ? body.rating : 0;
    run(db, "UPDATE photos SET rating = ? WHERE id = ?", [rating, id]);
    return { ok: true };
  }

  // ── POST /api/photos/{id}/rotate ────────────────────────────────────────

  function rotatePhoto(db, url, body, match) {
    return { error: "rotation not available in mobile (native bridge required)" };
  }

  // ── POST /api/photos/{id}/open ──────────────────────────────────────────

  function openPhoto(db, url, body, match) {
    return { error: "open not available in mobile" };
  }

  // ── POST /api/photos/{id}/reveal ────────────────────────────────────────

  function revealPhoto(db, url, body, match) {
    return { error: "reveal not available in mobile" };
  }

  // ── GET /api/photos/{id}/tags ───────────────────────────────────────────

  function photoTags(db, url, body, match) {
    var id = parseInt(match[1]);
    return all(db,
      "SELECT t.id, t.name, t.color FROM tags t " +
      "JOIN photo_tags pt ON t.id = pt.tag_id " +
      "WHERE pt.photo_id = ? ORDER BY t.name",
      [id]
    );
  }

  // ── POST /api/photos/{id}/tags ──────────────────────────────────────────

  function addTagToPhoto(db, url, body, match) {
    var photoId = parseInt(match[1]);
    var tagId = body && body.tag_id;
    if (!tagId) return { error: "tag_id is required" };
    try {
      run(db, "INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)", [photoId, tagId]);
    } catch (e) { /* duplicate, ignore */ }
    return { ok: true };
  }

  // ── DELETE /api/photos/{id}/tags/{tagId} ────────────────────────────────

  function removeTagFromPhoto(db, url, body, match) {
    var photoId = parseInt(match[1]);
    var tagId = parseInt(match[2]);
    run(db, "DELETE FROM photo_tags WHERE photo_id = ? AND tag_id = ?", [photoId, tagId]);
    return { ok: true };
  }

  // ── GET /api/photos/{id}/collections ────────────────────────────────────

  function photoCollections(db, url, body, match) {
    var id = parseInt(match[1]);
    return all(db,
      "WITH RECURSIVE path_cte(id, name, parent_id, path_str) AS (" +
      "  SELECT id, name, parent_id, name FROM collections WHERE parent_id IS NULL " +
      "  UNION ALL " +
      "  SELECT c.id, c.name, c.parent_id, p.path_str || ' › ' || c.name " +
      "  FROM collections c JOIN path_cte p ON c.parent_id = p.id" +
      ") " +
      "SELECT c.id, p.path_str AS name, c.color, c.icon FROM collections c " +
      "JOIN path_cte p ON c.id = p.id " +
      "JOIN photo_collections pc ON c.id = pc.collection_id " +
      "WHERE pc.photo_id = ? ORDER BY p.path_str",
      [id]
    );
  }

  // ── POST /api/photos/{id}/collections ───────────────────────────────────

  function addCollectionToPhoto(db, url, body, match) {
    var photoId = parseInt(match[1]);
    var collectionId = body && body.collection_id;
    if (!collectionId) return { error: "collection_id is required" };
    try {
      run(db, "INSERT OR IGNORE INTO photo_collections (photo_id, collection_id) VALUES (?, ?)", [photoId, collectionId]);
    } catch (e) { /* duplicate */ }
    return { ok: true };
  }

  // ── DELETE /api/photos/{id}/collections/{collId} ────────────────────────

  function removeCollectionFromPhoto(db, url, body, match) {
    var photoId = parseInt(match[1]);
    var collectionId = parseInt(match[2]);
    run(db, "DELETE FROM photo_collections WHERE photo_id = ? AND collection_id = ?", [photoId, collectionId]);
    return { ok: true };
  }

  // ── POST /api/photos/bulk-tags ──────────────────────────────────────────

  function bulkAddTag(db, url, body, match) {
    var photoIds = body && body.photo_ids;
    var tagId = body && body.tag_id;
    if (!Array.isArray(photoIds) || !photoIds.length || !tagId) {
      return { error: "photo_ids (list) and tag_id are required" };
    }
    var added = 0;
    photoIds.forEach(function (pid) {
      try {
        run(db, "INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)", [pid, tagId]);
        added++;
      } catch (e) { /* duplicate or error */ }
    });
    return { ok: true, added: added };
  }

  // ── POST /api/photos/bulk-collections ───────────────────────────────────

  function bulkAddToCollection(db, url, body, match) {
    var photoIds = body && body.photo_ids;
    var collectionId = body && body.collection_id;
    if (!Array.isArray(photoIds) || !photoIds.length || !collectionId) {
      return { error: "photo_ids (list) and collection_id are required" };
    }
    var added = 0;
    photoIds.forEach(function (pid) {
      try {
        run(db, "INSERT OR IGNORE INTO photo_collections (photo_id, collection_id) VALUES (?, ?)", [pid, collectionId]);
        added++;
      } catch (e) { /* duplicate */ }
    });
    return { ok: true, added: added };
  }

  // ── POST /api/photos/bulk-hide ──────────────────────────────────────────

  function bulkHide(db, url, body, match) {
    var photoIds = body && body.photo_ids;
    var hidden = body && body.hidden !== undefined ? body.hidden : true;
    if (!Array.isArray(photoIds) || !photoIds.length) {
      return { error: "photo_ids (list) is required" };
    }
    var val = hidden ? 1 : 0;
    photoIds.forEach(function (pid) {
      run(db, "UPDATE photos SET is_hidden = ? WHERE id = ?", [val, pid]);
    });
    return { ok: true, updated: photoIds.length };
  }

  // ── GET /api/photos/location-status ─────────────────────────────────────

  function locationStatus(db, url, body, match) {
    var idsStr = url.searchParams.get("ids") || "";
    var idList = idsStr.split(",").map(function (x) { return parseInt(x); }).filter(function (x) { return !isNaN(x); });
    if (!idList.length) return { with_location: [], without_location: [], has_location: false };

    var placeholders = idList.map(function () { return "?"; }).join(",");
    var rows = all(db,
      "SELECT id, latitude, longitude FROM photos WHERE id IN (" + placeholders + ")",
      idList
    );
    var withLoc = [], withoutLoc = [];
    rows.forEach(function (r) {
      if (r.latitude !== null && r.longitude !== null) withLoc.push(r.id);
      else withoutLoc.push(r.id);
    });
    return {
      with_location: withLoc,
      without_location: withoutLoc,
      has_location: withLoc.length > 0
    };
  }

  // ── POST /api/photos/set-location ───────────────────────────────────────

  function setLocation(db, url, body, match) {
    var photoIds = body && body.photo_ids;
    var latitude = body && body.latitude !== undefined ? body.latitude : null;
    var longitude = body && body.longitude !== undefined ? body.longitude : null;
    if (!Array.isArray(photoIds) || !photoIds.length) {
      return { error: "photo_ids (list) is required" };
    }

    var lat = latitude !== null ? parseFloat(latitude) : null;
    var lng = longitude !== null ? parseFloat(longitude) : null;

    var placeholders = photoIds.map(function () { return "?"; }).join(",");
    var rows = all(db,
      "SELECT id, path FROM photos WHERE id IN (" + placeholders + ")",
      photoIds
    );

    var fileWritten = 0;
    // Native file writing happens via the native bridge; record DB-only for now

    var i, r, rid;
    if (lat !== null && lng !== null) {
      for (i = 0; i < rows.length; i++) {
        r = rows[i];
        run(db,
          "UPDATE photos SET latitude = ?, longitude = ?, country = NULL, city = NULL WHERE id = ?",
          [lat, lng, r.id]
        );
      }
    } else {
      for (i = 0; i < rows.length; i++) {
        run(db,
          "UPDATE photos SET latitude = NULL, longitude = NULL, country = NULL, city = NULL WHERE id = ?",
          [rows[i].id]
        );
      }
    }

    return { ok: true, updated: rows.length, file_written: fileWritten };
  }

  // ── Export ──────────────────────────────────────────────────────────────

  self.ApiHandlers.listPhotos = listPhotos;
  self.ApiHandlers.getFilters = getFilters;
  self.ApiHandlers.geoBounds = geoBounds;
  self.ApiHandlers.geoPhotos = geoPhotos;
  self.ApiHandlers.getPhoto = getPhoto;
  self.ApiHandlers.ratePhoto = ratePhoto;
  self.ApiHandlers.rotatePhoto = rotatePhoto;
  self.ApiHandlers.openPhoto = openPhoto;
  self.ApiHandlers.revealPhoto = revealPhoto;
  self.ApiHandlers.photoTags = photoTags;
  self.ApiHandlers.addTagToPhoto = addTagToPhoto;
  self.ApiHandlers.removeTagFromPhoto = removeTagFromPhoto;
  self.ApiHandlers.photoCollections = photoCollections;
  self.ApiHandlers.addCollectionToPhoto = addCollectionToPhoto;
  self.ApiHandlers.removeCollectionFromPhoto = removeCollectionFromPhoto;
  self.ApiHandlers.bulkAddTag = bulkAddTag;
  self.ApiHandlers.bulkAddToCollection = bulkAddToCollection;
  self.ApiHandlers.bulkHide = bulkHide;
  self.ApiHandlers.locationStatus = locationStatus;
  self.ApiHandlers.setLocation = setLocation;
})();
