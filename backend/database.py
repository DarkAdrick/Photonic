import sqlite3
import os
from pathlib import Path

from backend.paths import DB_DIR, DB_PATH


def get_connection() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_connection()
    conn.executescript(SCHEMA)
    cols = [r[1] for r in conn.execute("PRAGMA table_info(tags)").fetchall()]
    if "color" not in cols:
        conn.execute("ALTER TABLE tags ADD COLUMN color TEXT")
    photo_cols = [r[1] for r in conn.execute("PRAGMA table_info(photos)").fetchall()]
    if "country" not in photo_cols:
        conn.execute("ALTER TABLE photos ADD COLUMN country TEXT")
    if "city" not in photo_cols:
        conn.execute("ALTER TABLE photos ADD COLUMN city TEXT")
    if "blur_score" not in photo_cols:
        conn.execute("ALTER TABLE photos ADD COLUMN blur_score REAL")
    if "quality_flags" not in photo_cols:
        conn.execute("ALTER TABLE photos ADD COLUMN quality_flags TEXT")
    conn.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS folders (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS photos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    path           TEXT    NOT NULL UNIQUE,
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
    hash           TEXT,
    perceptual_hash TEXT
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

CREATE TABLE IF NOT EXISTS _thumb_done (
    photo_id INTEGER PRIMARY KEY REFERENCES photos(id) ON DELETE CASCADE
);
"""
