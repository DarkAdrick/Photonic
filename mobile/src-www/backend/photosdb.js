// Photonic mobile — SQLite database lifecycle (sql.js) with IndexedDB persistence
"use strict";

self.PhotosDb = self.PhotosDb || {};

(function () {
  const DB_NAME = "photonic";
  const STORE = "kv";
  const DB_KEY = "db-bytes";

  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function idbGet(key) {
    return openIDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => { resolve(req.result); db.close(); };
      req.onerror = () => { reject(req.error); db.close(); };
    }));
  }

  function idbSet(key, val) {
    return openIDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => { resolve(); db.close(); };
      tx.onerror = () => { reject(tx.error); db.close(); };
    }));
  }

  async function load(SQL) {
    let db;
    const bytes = await idbGet(DB_KEY).catch(() => null);
    if (bytes && bytes.byteLength > 0) {
      try { db = new SQL.Database(bytes); }
      catch (e) { db = null; }
    }
    if (!db) {
      db = new SQL.Database();
      db.exec(self.PhotosSchema.SQL);
      await persist(db);
    } else {
      // Migration: ensure the "folder" column exists on databases created
      // before the per-photo relative-path column was added.
      var tableInfo = (db.exec("PRAGMA table_info(photos)") || [])[0];
      var cols = tableInfo ? tableInfo.values.map(function (r) { return r[1]; }) : [];
      if (cols.indexOf("folder") < 0) {
        try {
          db.exec("ALTER TABLE photos ADD COLUMN folder TEXT;");
          await persist(db);
        } catch (e) { /* migration best-effort */ }
      }
    }
    return db;
  }

  // Debounced persistence (export → IndexedDB)
  let pending = null;
  function persist(db) {
    if (pending) return pending;
    pending = new Promise((resolve) => {
      setTimeout(() => {
        try {
          const bytes = db.export();
          idbSet(DB_KEY, bytes).then(() => resolve()).catch(() => resolve());
        } catch (e) {
          resolve();
        } finally {
          pending = null;
        }
      }, 1500);
    });
    return pending;
  }

  self.PhotosDb.load = load;
  self.PhotosDb.persist = persist;
})();
