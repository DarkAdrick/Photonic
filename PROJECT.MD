# Photonic — Specification

Build Photonic, a lightweight but powerful Windows desktop photo management application.

---

## Core Philosophy — Keep It Simple

This is the most important rule of the project.

Prefer:

- One process over multiple processes
- Simple architecture over enterprise architecture
- SQLite over an external database
- Simple functions over unnecessary abstraction layers
- Proven libraries over custom implementations
- Few dependencies
- Few moving parts
- Code that is easy to understand and modify

Do not over-engineer the project. Photonic should be understandable and maintainable by a single developer.

---

## 1. Product Vision

Photonic is a **local-first** photo library manager for Windows.

It should be able to manage very large photo libraries:

- 10,000 photos
- 100,000 photos
- 500,000 photos
- Ideally 1,000,000+ files

The user should be able to:

- Add one or more photo folders
- Browse photos
- Search quickly
- Filter photos
- Manage tags
- View metadata
- Search by camera, lens, location, date
- Detect exact duplicates
- Detect visually similar images
- Display photos on a map
- Create collections
- Eventually create smart collections

Everything should work **locally** on the user's PC. No mandatory cloud services.

---

## 2. Technology Stack

| Layer      | Tech                          |
|------------|-------------------------------|
| Backend    | Python + FastAPI              |
| Frontend   | Vanilla HTML/CSS/JS           |
| Database   | SQLite (WAL mode)             |
| Server     | uvicorn                       |
| Packaging  | PyInstaller                   |

Use a simple local HTTP server running inside the Python application.

> **Note:** The original spec called for Svelte. Vanilla HTML/CSS/JS was chosen instead — fewer dependencies, simpler build, no Node.js required. Svelte can be added later if the UI grows complex enough to justify it.

---

## 3. Architecture

Keep the architecture deliberately small.

```
Photonic/
├── backend/
│   ├── __init__.py
│   ├── main.py           # FastAPI app, API routes, static file serving
│   ├── database.py       # SQLite schema + connection helpers
│   ├── scanner.py        # Folder scanning, EXIF extraction, file hashing
│   ├── thumbnails.py     # Thumbnail generation (small/medium/large)
│   ├── cleaning.py       # Database cleanup utilities
│   └── paths.py          # Path helpers
├── frontend/
│   ├── index.html        # App shell
│   ├── css/style.css     # Dark theme + photo grid styles
│   └── js/app.js         # API calls, photo grid rendering, folder dialog
├── data/                 # Runtime: SQLite DB (photonic.db)
├── cache/
│   └── thumbnails/       # small/ medium/ large/ (auto-generated)
├── screenshots/          # Project screenshots for README
├── requirements.txt
├── #Build.bat            # PyInstaller build script
├── run.py                # Entry point
├── PROJECT.MD            # This file
└── README.md
```

Do not create dozens of modules just to make the architecture look clean. If two related features can reasonably live in the same file, that is perfectly acceptable.

---

## 4. No Microservices

Do **NOT** introduce:

- Microservices
- Redis
- PostgreSQL
- Docker as a requirement
- Message brokers
- External APIs
- Cloud services
- Separate Windows services
- Distributed architecture

Photonic is a local desktop application. One Python process handles everything: UI server, API, SQLite, indexing, metadata, thumbnails, search, duplicate detection.

---

## 5. SQLite

SQLite is the primary database (WAL mode).

### Schema

**photos**

| Column           | Type    | Description                    |
|------------------|---------|--------------------------------|
| id               | INTEGER | Primary key                    |
| path             | TEXT    | Full file path                 |
| filename         | TEXT    | File name                      |
| extension        | TEXT    | File extension                 |
| size             | INTEGER | File size in bytes             |
| modified_date    | TEXT    | Last modified date             |
| created_date     | TEXT    | Creation date                  |
| width            | INTEGER | Image width in pixels          |
| height           | INTEGER | Image height in pixels         |
| mime_type        | TEXT    | MIME type                      |
| camera_make      | TEXT    | Camera manufacturer            |
| camera_model     | TEXT    | Camera model                   |
| lens             | TEXT    | Lens model                     |
| focal_length     | REAL    | Focal length in mm             |
| aperture         | REAL    | Aperture value                 |
| shutter_speed    | TEXT    | Shutter speed                  |
| iso              | INTEGER | ISO value                      |
| date_taken       | TEXT    | Date photo was taken           |
| latitude         | REAL    | GPS latitude                   |
| longitude        | REAL    | GPS longitude                  |
| orientation      | INTEGER | EXIF orientation               |
| rating           | INTEGER | User rating (1-5)              |
| hash             | TEXT    | MD5 hash for exact duplicate   |
| perceptual_hash  | TEXT    | Perceptual hash (future)       |

**tags**

| Column    | Type    | Description              |
|-----------|---------|--------------------------|
| id        | INTEGER | Primary key              |
| name      | TEXT    | Tag name                 |
| parent_id | INTEGER | Self-reference for hierarchy |

**photo_tags**

| Column  | Type    | Description |
|---------|---------|-------------|
| photo_id| INTEGER | FK → photos |
| tag_id  | INTEGER | FK → tags   |

**folders**

| Column | Type    | Description         |
|--------|---------|---------------------|
| id     | INTEGER | Primary key         |
| path   | TEXT    | Indexed folder path |

Indexes on: filename, extension, camera_make + model, date_taken, hash, perceptual_hash, tag parent.

Do not load the entire photo library into memory.

---

## 6. Photo Indexing

Indexing is one of Photonic's core features.

When the user adds a folder:

```
Folder → Scan → Find images → Read metadata → Store in SQLite → Generate thumbnails
```

Indexing must be:

- Asynchronous
- Progressive
- Cancelable
- Resumable
- Robust

A corrupted or unsupported image must never stop the entire indexing process.

Example progress:

```
Indexing photos... 12,438 / 84,201
```

The user must be able to continue using Photonic while indexing is running.

---

## 7. Performance

Performance matters, but do not turn the project into a premature optimization exercise. Start with a simple and correct architecture.

Important principles:

- Proper SQLite indexes
- Pagination
- Virtualized photo grid
- Thumbnail caching
- Background processing
- No massive in-memory collections

The photo grid must use efficient virtualization. If the library contains 500,000 photos, the application must **NOT** create 500,000 DOM elements. Only the photos actually needed for the visible viewport should be rendered.

---

## 8. Thumbnails

Never load a full-resolution original just to display a thumbnail.

Use a local thumbnail cache:

```
cache/
└── thumbnails/
    ├── small/     # 160px
    ├── medium/    # 400px
    └── large/     # 1024px
```

Generate thumbnails on demand or during indexing, whichever is simpler and performs well. Thumbnails should be easily addressable using a stable photo ID or hash.

---

## 9. Metadata

Read as much useful metadata as practical: EXIF, IPTC, XMP when appropriate.

Important fields:

- Camera manufacturer / model
- Lens
- Focal length
- Aperture
- Shutter speed
- ISO
- Date/time
- GPS
- Orientation
- Width / Height

A metadata parsing error for one image must never interrupt the entire indexing process.

---

## 10. Image Formats

Start with common formats:

- JPEG
- PNG
- WebP
- TIFF
- BMP
- GIF

Design the code so RAW support can be added later. Do not spend weeks trying to support every RAW format in the MVP.

---

## 11. Search

Search must be fast.

Support filters for:

- Date (from / to)
- Camera
- Lens
- Tag
- Location
- Format (extension)
- Rating
- Folder

Later, support combined queries such as: `Canon + Paris + 2024 + ISO > 1600`

But do NOT build a complicated query language in the MVP. Start simple.

---

## 12. Tags

Tags should support hierarchy.

Example:

```
Travel
├── France
│   ├── Paris
│   └── Lyon
└── Italy
    ├── Rome
    └── Milan
```

MVP functionality:

- Create / Rename / Delete
- Apply / Remove
- Search

---

## 13. Duplicate Detection

Implement duplicate detection progressively.

### Level 1 — Exact Hash

Two files with identical content are exact duplicates (MD5).

### Level 2 — Perceptual Hash

Detect: resized copies, different compression versions, slightly modified copies.

Use a simple progressive strategy:

```
Cheap test → Exact hash → Perceptual hash → More advanced similarity later
```

Do not start with complex AI-based similarity detection.

---

## 14. GPS / Location

If GPS metadata is available:

- Store latitude and longitude
- Allow location-based filtering
- Provide a map view (Leaflet.js + OpenStreetMap, no API key)

The map can be developed after the core photo management functionality. Do not make the MVP dependent on an external map service.

---

## 15. User Interface

The UI should be:

- Modern
- Dark by default
- Professional
- Minimal
- Fast
- Productivity-focused

Avoid:

- Unnecessary animations
- Heavy visual effects
- Excessive glassmorphism / gradients
- Huge buttons
- Overly complicated interfaces

Basic layout:

```
Photonic — Search — Settings

┌──────────┬─────────────────────────┐
│ Sidebar  │ Main area               │
│          │                         │
│ Library  │  Virtualized photo grid │
│ Folders  │                         │
│ Collections                        │
│ Tags     │                         │
│ Cameras  │                         │
│ Lenses   │                         │
│ Locations│                         │
│ Duplicates                        │
└──────────┴─────────────────────────┘
```

Keep the UI focused on the photos.

---

## 16. Photo Details

When a photo is selected, show:

- Image preview
- Filename / Full path
- Date
- Camera / Lens
- Focal length / Aperture / Shutter speed / ISO
- Dimensions / File size
- GPS coordinates
- Tags
- Rating

---

## 17. Future Features

Do not implement these yet:

- AI recognition
- Face recognition
- Embeddings / Semantic search
- Cloud synchronization
- Photo editing / RAW editing
- AI image generation

However, keep the code clean enough that these features can be added later. Do not create complicated abstractions specifically for hypothetical future features.

---

## 18. Privacy

Photonic is **LOCAL FIRST**.

Photos should never leave the user's computer unless the user explicitly chooses to export or upload something.

- No mandatory cloud
- No automatic image uploads
- No intrusive telemetry

The only outbound data besides the update check is an **anonymous launch ping**: a single request at startup containing nothing but an anonymous random install ID, the app version and the OS. It never includes any photo, path or personal data, and it can be disabled at any time in Settings > Application ("Anonymous usage statistics").

---

## 19. Filesystem Monitoring

Photonic should eventually detect changes in configured folders:

- New files
- Deleted files
- Renamed files
- Moved files (when reasonably detectable)

Do not attempt to perfectly solve every filesystem edge case in the MVP. Always provide a simple **Rescan Library** action.

Reliability and simplicity are more important than perfect filesystem intelligence.

---

## 20. Background Processing

Long-running operations must never block the UI:

- Scanning
- Metadata extraction
- Thumbnail generation
- Hashing
- Heavy searches

Use simple Python concurrency or background workers. Do not create a sophisticated job scheduler.

---

## 21. Logging

Use a simple logging system. Errors should include:

- Timestamp
- Log level
- Operation
- File involved (when relevant)
- Error message

A single problematic image must be isolated from the rest of the indexing process.

---

## 22. Testing

Focus tests on important functionality:

- SQLite operations
- Indexing
- Metadata extraction
- Duplicate detection
- Search
- Thumbnail generation

Do not chase artificial 100% test coverage. Test the important parts well.

---

## 23. Windows Packaging

The final goal is a normal Windows application. The user should not need to install Python manually.

Use PyInstaller or another simple packaging solution. Eventually support:

- Installer
- Desktop / start menu shortcut
- Optional file associations

Do not solve the installer before the application itself works.

---

## 24. Development Order

### Phase 1 — Skeleton ✅

- [x] Python + FastAPI project
- [x] Vanilla HTML/CSS/JS frontend
- [x] SQLite with full schema (photos, tags, folders)
- [x] API endpoints (status, folders)
- [x] Dark-themed UI shell with sidebar
- [x] Frontend ↔ backend communication
- [x] Browser auto-open on startup

### Phase 2 — First Photo Library ✅

- [x] Folder scan (recursive, async, background thread)
- [x] Image file detection (JPEG, PNG, WebP, TIFF, BMP, GIF)
- [x] EXIF metadata extraction (camera, lens, GPS, date, aperture, ISO...)
- [x] File hashing (MD5 for exact duplicate detection later)
- [x] Thumbnail generation (small 160px, medium 400px, large 1024px)
- [x] Photo grid with thumbnails (CSS Grid, lazy loading)
- [x] Add Folder dialog
- [x] Scan progress polling
- [x] Sidebar folder list

### Phase 3 — Search & Filters ✅

- [x] Text search (filename, camera, lens)
- [x] Filter by camera / lens
- [x] Filter by date range
- [x] Filter by file extension
- [x] Filter by rating
- [x] Filter dropdowns populated from DB
- [x] Live search with debounce
- [x] Clear filters button

### Phase 4 — Organization (next)

- [ ] Hierarchical tags
- [ ] Collections
- [ ] Favorites
- [ ] Ratings management

### Phase 5 — Duplicates (future)

- [ ] Exact hash duplicate detection
- [ ] Perceptual hash for similar images

### Phase 6 — GPS & Map ✅

- [x] Leaflet.js + OpenStreetMap (no API key)
- [x] Map view toggle via "Locations" sidebar item
- [x] Photo markers with popup previews
- [x] Bbox filtering — markers refresh on map move
- [x] Photo strip below map for geo-tagged photos
- [x] Click photo in strip → map centers on location

### Phase 7+ (future)

- [ ] Filesystem monitoring

---

## 25. Absolute Coding Rule

Before adding anything, ask: **Does Photonic actually need this complexity right now?**

If the answer is no, do not add it.

Avoid:

- An abstraction for a single implementation
- An interface that has no real alternative
- A separate service without a concrete need
- A complex architecture "for the future"
- Dependencies that solve a problem we do not currently have

Follow: **YAGNI** · **KISS** · **DRY** (but do not turn DRY into over-abstraction).

---

## 26. Development Behavior

Do not generate hundreds of files at once. Work incrementally.

After every significant step: Build → Run → Test → Fix → Verify → Then move to the next step.

Keep the application working throughout development.

If there are two reasonable technical options, prefer the simpler one. If a dependency can be avoided without meaningful loss, avoid it. If 20 lines of straightforward code are better than 5 layers of abstraction, use the 20 lines.

---

## 27. Final Product Philosophy

Photonic should feel like this:

> I point Photonic at my photo folder, and it just works.

It should be:

- Simple enough to understand
- Fast enough to handle a huge library
- Powerful enough for serious photographers
- Light enough to leave running all day
- Local enough that my photos stay mine

The goal is NOT to build the most technically impressive architecture. The goal is to build an **excellent photo management application**.

---

**PHOTONIC** — Simple enough to understand. Powerful enough for a million photos.
