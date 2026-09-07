// Photonic mobile — Native API helpers & shared utilities
"use strict";

self.NativeApi = self.NativeApi || {};
self.ApiHandlers = self.ApiHandlers || {};

(function () {
  // ── sql.js helpers ──────────────────────────────────────────────────────

  function all(db, sql, params) {
    var stmt = db.prepare(sql);
    if (params && params.length) {
      try { stmt.bind(params); } catch (e) { /* param binding failed, continue */ }
    }
    var rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  function one(db, sql, params) {
    var rows = all(db, sql, params);
    return rows.length ? rows[0] : null;
  }

  function run(db, sql, params) {
    var stmt = db.prepare(sql);
    if (params && params.length) {
      try { stmt.bind(params); } catch (e) { /* bind failed */ }
    }
    stmt.step();
    stmt.free();
  }

  function count1(db, sql, params) {
    var r = one(db, sql, params);
    return r ? (r[Object.keys(r)[0]] || 0) : 0;
  }

  // ── Extension sets ──────────────────────────────────────────────────────

  var VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".3gp"];
  var IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp", ".gif"];

  var VIDEO_EXT_SET = {};
  VIDEO_EXTENSIONS.forEach(function (e) { VIDEO_EXT_SET[e] = 1; });
  var IMAGE_EXT_SET = {};
  IMAGE_EXTENSIONS.forEach(function (e) { IMAGE_EXT_SET[e] = 1; });

  // ── Filter helpers (return {clause, params}) ────────────────────────────

  function typeExts(type) {
    if (type === "video") {
      var sorted = VIDEO_EXTENSIONS.slice().sort();
      var clause = sorted.length === 1
        ? "LOWER(extension) = ?"
        : "LOWER(extension) IN (" + sorted.map(function () { return "?"; }).join(",") + ")";
      return { clause: clause, params: sorted };
    }
    if (type === "image") {
      var sorted2 = IMAGE_EXTENSIONS.slice().sort();
      var clause2 = sorted2.length === 1
        ? "LOWER(extension) = ?"
        : "LOWER(extension) IN (" + sorted2.map(function () { return "?"; }).join(",") + ")";
      return { clause: clause2, params: sorted2 };
    }
    return null;
  }

  function extClause(ext, prefix) {
    prefix = prefix || "p.";
    if (!ext) return null;
    var exts = ext.split(",").map(function (e) { return e.trim().toLowerCase(); }).filter(Boolean);
    if (!exts.length) return null;
    var clause = exts.length === 1
      ? prefix + "extension = ?"
      : prefix + "extension IN (" + exts.map(function () { return "?"; }).join(",") + ")";
    return { clause: clause, params: exts };
  }

  // ── LIKE escape ─────────────────────────────────────────────────────────

  function likeEscape(s) {
    return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  }

  // ── Path helpers ────────────────────────────────────────────────────────

  function normPath(p) {
    return p.replace(/\\/g, "/");
  }

  function underPattern(pathStr) {
    var base = likeEscape(normPath(pathStr).replace(/\/+$/, ""));
    return base + "/%";
  }

  function deeperPattern(pathStr) {
    return underPattern(pathStr) + "/%";
  }

  function nameFromPath(pathStr) {
    var parts = normPath(pathStr).replace(/\/+$/, "").split("/");
    return parts[parts.length - 1] || pathStr;
  }

  // ── Hidden filter ───────────────────────────────────────────────────────

  function hiddenSql(alias, showHidden, hiddenOnly) {
    var col = alias ? alias + "is_hidden" : "is_hidden";
    if (hiddenOnly) return col + " = 1";
    if (showHidden) return "";
    return col + " = 0";
  }

  // ── Version ─────────────────────────────────────────────────────────────

  var APP_VERSION = "1.1.1";

  // ── Stats helper ────────────────────────────────────────────────────────

  function countPhotos(db, showHidden, hiddenOnly) {
    var cond = hiddenSql("", showHidden, hiddenOnly);
    if (cond) return count1(db, "SELECT COUNT(*) AS c FROM photos WHERE " + cond);
    return count1(db, "SELECT COUNT(*) AS c FROM photos");
  }

  // ── Country names ───────────────────────────────────────────────────────

  var COUNTRY_NAMES = {
    "AF":"Afghanistan","AL":"Albania","DZ":"Algeria","AD":"Andorra",
    "AO":"Angola","AR":"Argentina","AM":"Armenia","AU":"Australia",
    "AT":"Austria","AZ":"Azerbaijan","BS":"Bahamas","BH":"Bahrain",
    "BD":"Bangladesh","BB":"Barbados","BY":"Belarus","BE":"Belgium",
    "BZ":"Belize","BJ":"Benin","BT":"Bhutan","BO":"Bolivia",
    "BA":"Bosnia and Herzegovina","BW":"Botswana","BR":"Brazil",
    "BN":"Brunei","BG":"Bulgaria","BF":"Burkina Faso","BI":"Burundi",
    "KH":"Cambodia","CM":"Cameroon","CA":"Canada","CF":"Central African Republic",
    "TD":"Chad","CL":"Chile","CN":"China","CO":"Colombia",
    "KM":"Comoros","CG":"Congo","CR":"Costa Rica","HR":"Croatia",
    "CU":"Cuba","CY":"Cyprus","CZ":"Czech Republic","DK":"Denmark",
    "DJ":"Djibouti","DO":"Dominican Republic","EC":"Ecuador","EG":"Egypt",
    "SV":"El Salvador","GQ":"Equatorial Guinea","ER":"Eritrea","EE":"Estonia",
    "ET":"Ethiopia","FJ":"Fiji","FI":"Finland","FR":"France",
    "GA":"Gabon","GM":"Gambia","GE":"Georgia","DE":"Germany",
    "GH":"Ghana","GR":"Greece","GT":"Guatemala","GN":"Guinea",
    "GW":"Guinea-Bissau","GY":"Guyana","HT":"Haiti","HN":"Honduras",
    "HK":"Hong Kong","HU":"Hungary","IS":"Iceland","IN":"India",
    "ID":"Indonesia","IR":"Iran","IQ":"Iraq","IE":"Ireland",
    "IL":"Israel","IT":"Italy","JM":"Jamaica","JP":"Japan",
    "JO":"Jordan","KZ":"Kazakhstan","KE":"Kenya","KI":"Kiribati",
    "KP":"North Korea","KR":"South Korea","KW":"Kuwait","KG":"Kyrgyzstan",
    "LA":"Laos","LV":"Latvia","LB":"Lebanon","LS":"Lesotho",
    "LR":"Liberia","LY":"Libya","LI":"Liechtenstein","LT":"Lithuania",
    "LU":"Luxembourg","MO":"Macao","MK":"North Macedonia","MG":"Madagascar",
    "MW":"Malawi","MY":"Malaysia","MV":"Maldives","ML":"Mali",
    "MT":"Malta","MH":"Marshall Islands","MR":"Mauritania","MU":"Mauritius",
    "MX":"Mexico","FM":"Micronesia","MD":"Moldova","MC":"Monaco",
    "MN":"Mongolia","ME":"Montenegro","MA":"Morocco","MZ":"Mozambique",
    "MM":"Myanmar","NA":"Namibia","NR":"Nauru","NP":"Nepal",
    "NL":"Netherlands","NZ":"New Zealand","NI":"Nicaragua","NE":"Niger",
    "NG":"Nigeria","NO":"Norway","OM":"Oman","PK":"Pakistan",
    "PW":"Palau","PA":"Panama","PG":"Papua New Guinea","PY":"Paraguay",
    "PE":"Peru","PH":"Philippines","PL":"Poland","PT":"Portugal",
    "QA":"Qatar","RO":"Romania","RU":"Russia","RW":"Rwanda",
    "KN":"Saint Kitts and Nevis","LC":"Saint Lucia","WS":"Samoa",
    "SM":"San Marino","ST":"Sao Tome and Principe","SA":"Saudi Arabia",
    "SN":"Senegal","RS":"Serbia","SC":"Seychelles","SL":"Sierra Leone",
    "SG":"Singapore","SK":"Slovakia","SI":"Slovenia","SB":"Solomon Islands",
    "SO":"Somalia","ZA":"South Africa","SS":"South Sudan","ES":"Spain",
    "LK":"Sri Lanka","SD":"Sudan","SR":"Suriname","SE":"Sweden",
    "CH":"Switzerland","SY":"Syria","TW":"Taiwan","TJ":"Tajikistan",
    "TZ":"Tanzania","TH":"Thailand","TL":"Timor-Leste","TG":"Togo",
    "TO":"Tonga","TT":"Trinidad and Tobago","TN":"Tunisia","TR":"Turkey",
    "TM":"Turkmenistan","TV":"Tuvalu","UG":"Uganda","UA":"Ukraine",
    "AE":"United Arab Emirates","GB":"United Kingdom","US":"United States",
    "UY":"Uruguay","UZ":"Uzbekistan","VU":"Vanuatu","VE":"Venezuela",
    "VN":"Vietnam","YE":"Yemen","ZM":"Zambia","ZW":"Zimbabwe"
  };

  // ── 360 detection ───────────────────────────────────────────────────────

  var _360_SQL_TRUE =
    "(p.camera_model LIKE '%THETA%' OR p.camera_make LIKE '%THETA%' " +
    "OR p.camera_model LIKE '%INSTA360%' OR p.camera_make LIKE '%INSTA360%' " +
    "OR (p.camera_model LIKE '%MAX%' AND p.camera_make LIKE '%GOPRO%') " +
    "OR (p.width IS NOT NULL AND p.height IS NOT NULL AND " +
    "(p.width * 1.0 / p.height) BETWEEN 1.95 AND 2.05))";

  var _360_SQL_FALSE = "NOT " + _360_SQL_TRUE;

  // ── Export ──────────────────────────────────────────────────────────────

  self.NativeApi.all = all;
  self.NativeApi.one = one;
  self.NativeApi.run = run;
  self.NativeApi.count1 = count1;
  self.NativeApi.VIDEO_EXTENSIONS = VIDEO_EXTENSIONS;
  self.NativeApi.IMAGE_EXTENSIONS = IMAGE_EXTENSIONS;
  self.NativeApi.VIDEO_EXT_SET = VIDEO_EXT_SET;
  self.NativeApi.IMAGE_EXT_SET = IMAGE_EXT_SET;
  self.NativeApi.typeExts = typeExts;
  self.NativeApi.extClause = extClause;
  self.NativeApi.likeEscape = likeEscape;
  self.NativeApi.normPath = normPath;
  self.NativeApi.underPattern = underPattern;
  self.NativeApi.deeperPattern = deeperPattern;
  self.NativeApi.nameFromPath = nameFromPath;
  self.NativeApi.hiddenSql = hiddenSql;
  self.NativeApi.APP_VERSION = APP_VERSION;
  self.NativeApi.countPhotos = countPhotos;
  self.NativeApi.COUNTRY_NAMES = COUNTRY_NAMES;
  self.NativeApi._360_SQL_TRUE = _360_SQL_TRUE;
  self.NativeApi._360_SQL_FALSE = _360_SQL_FALSE;
})();
