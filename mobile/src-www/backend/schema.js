// Photonic mobile — SQLite schema (mirrors backend/database.py)
// Reused verbatim so the on-device database matches the desktop one.
"use strict";

self.PhotosSchema = self.PhotosSchema || {};

self.PhotosSchema.SQL = `
CREATE TABLE IF NOT EXISTS folders (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS photos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    path           TEXT    NOT NULL UNIQUE,
    folder         TEXT,
    filename       TEXT    NOT NULL,
    extension      TEXT    NOT NULL,
    size           INTEGER NOT NULL,
    modified_date  TEXT,
    created_date   TEXT,
    width          INTEGER,
    height         INTEGER,
    mime_type      TEXT,
    camera_make    TEXT,
    camera_model   TEXT,
    lens           TEXT,
    focal_length   TEXT,
    aperture       TEXT,
    shutter_speed  TEXT,
    iso            INTEGER,
    date_taken     TEXT,
    latitude       REAL,
    longitude      REAL,
    orientation    INTEGER,
    rating         INTEGER DEFAULT 0,
    is_hidden      INTEGER DEFAULT 0,
    hash           TEXT,
    perceptual_hash TEXT,
    country        TEXT,
    city           TEXT,
    blur_score     REAL,
    quality_flags  TEXT
);

CREATE TABLE IF NOT EXISTS tags (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    color     TEXT,
    parent_id INTEGER REFERENCES tags(id) ON DELETE SET NULL,
    UNIQUE(name, parent_id)
);

CREATE TABLE IF NOT EXISTS collections (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    color     TEXT,
    icon      TEXT,
    parent_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
    UNIQUE(name, parent_id)
);

CREATE TABLE IF NOT EXISTS photo_collections (
    photo_id      INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    PRIMARY KEY (photo_id, collection_id)
);

CREATE TABLE IF NOT EXISTS photo_tags (
    photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
    PRIMARY KEY (photo_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_photos_filename   ON photos(filename);
CREATE INDEX IF NOT EXISTS idx_photos_extension  ON photos(extension);
CREATE INDEX IF NOT EXISTS idx_photos_camera     ON photos(camera_make, camera_model);
CREATE INDEX IF NOT EXISTS idx_photos_date       ON photos(date_taken);
CREATE INDEX IF NOT EXISTS idx_photos_hash       ON photos(hash);
CREATE INDEX IF NOT EXISTS idx_photos_phash      ON photos(perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_tags_parent       ON tags(parent_id);
CREATE INDEX IF NOT EXISTS idx_collections_parent ON collections(parent_id);
`;
