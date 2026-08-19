Photonic

Build Photonic, a lightweight but powerful Windows desktop photo management application.

Core Philosophy
KEEP IT SIMPLE

This is the most important rule of the project.

Prefer:

One process over multiple processes.
Simple architecture over enterprise architecture.
SQLite over an external database.
Simple functions over unnecessary abstraction layers.
Proven libraries over custom implementations.
Few dependencies.
Few moving parts.
Code that is easy to understand and modify.

Do not over-engineer the project.

Photonic should be understandable and maintainable by a single developer.

1. Product Vision

Photonic is a local-first photo library manager for Windows.

It should be able to manage very large photo libraries:

10,000 photos
100,000 photos
500,000 photos
Ideally 1,000,000+ files

The user should be able to:

Add one or more photo folders.
Browse photos.
Search quickly.
Filter photos.
Manage tags.
View metadata.
Search by camera.
Search by lens.
Search by location.
Search by date.
Detect exact duplicates.
Detect visually similar images.
Display photos on a map.
Create collections.
Eventually create smart collections.

Everything should work locally on the user's PC.

No mandatory cloud services.

2. Technology Stack

Use this stack unless there is a strong technical reason not to.

Backend

Python

Frontend

Svelte + HTML + CSS

Database

SQLite

Communication

Use a simple local HTTP server running inside the Python application.

Use FastAPI if it genuinely simplifies development, but do not build a complicated backend architecture around it.

Packaging

The final application should run as a normal Windows application.

Use a simple packaging solution such as PyInstaller.

The eventual goal is a standalone application similar to:

Photonic.exe

3. Architecture

Keep the architecture deliberately small.

A possible structure:

Photonic/

backend/
app.py
database.py
models.py
scanner.py
metadata.py
thumbnails.py
search.py
duplicates.py
frontend/
src/
components/
views/
stores/
data/
README.md

This structure is only a guideline.

Do not create dozens of modules just to make the architecture look clean.

If two related features can reasonably live in the same file, that is perfectly acceptable.

4. No Microservices

Do NOT introduce:

Microservices.
Redis.
PostgreSQL.
Docker as a requirement.
Message brokers.
External APIs.
Cloud services.
Separate Windows services.
Distributed architecture.

Photonic is a local desktop application.

Ideally, one Python process should handle:

UI server
API
SQLite
Indexing
Metadata
Thumbnails
Search
Duplicate detection

Keep it simple.

5. SQLite

SQLite is the primary database.

At minimum, the database should represent:

Photos
id
path
filename
extension
size
modified_date
created_date
width
height
mime_type
camera_make
camera_model
lens
focal_length
aperture
shutter_speed
iso
date_taken
latitude
longitude
orientation
rating
hash
perceptual_hash
Tags
id
name
parent_id
Photo Tags
photo_id
tag_id
Folders
id
path

Add appropriate SQLite indexes.

Do not load the entire photo library into memory.

6. Photo Indexing

Indexing is one of Photonic's core features.

When the user adds a folder:

Folder → Scan → Find images → Read metadata → Store in SQLite → Generate thumbnails

Indexing must be:

Asynchronous.
Progressive.
Cancelable.
Resumable.
Robust.

A corrupted or unsupported image must never stop the entire indexing process.

Example progress:

Indexing photos...

12,438 / 84,201

The user must be able to continue using Photonic while indexing is running.

7. Performance

Performance matters, but do not turn the project into a premature optimization exercise.

Start with a simple and correct architecture.

Important principles:

Proper SQLite indexes.
Pagination.
Virtualized photo grid.
Thumbnail caching.
Background processing.
No massive in-memory collections.

The photo grid must use efficient virtualization.

If the library contains 500,000 photos, the application must NOT create 500,000 DOM elements.

Only the photos actually needed for the visible viewport should be rendered.

8. Thumbnails

Never load a full-resolution original just to display a thumbnail.

Use a local thumbnail cache.

Example:

cache/

thumbnails/
small/
medium/
large/

Generate thumbnails on demand or during indexing, whichever is simpler and performs well.

Thumbnails should be easily addressable using a stable photo ID or hash.

9. Metadata

Read as much useful metadata as practical:

EXIF
IPTC
XMP when appropriate

Important fields include:

Camera manufacturer
Camera model
Lens
Focal length
Aperture
Shutter speed
ISO
Date/time
GPS
Orientation
Width
Height

A metadata parsing error for one image must never interrupt the entire indexing process.

10. Image Formats

Start with common formats:

JPEG
PNG
WebP
TIFF
HEIC when practical

Design the code so RAW support can be added later.

Do not spend weeks trying to support every RAW format in the MVP.

11. Search

Search must be fast.

Examples:

Canon
Canon Paris
vacation
Sony A7 IV
2024

Support filters for:

Date
Camera
Lens
Tag
Location
Format
Rating
Dimensions

Later, support combined queries such as:

Canon + Paris + 2024 + ISO > 1600

But do NOT build a complicated query language in the MVP.

Start simple.

12. Tags

Tags should support hierarchy.

Example:

Travel

France
Paris
Lyon
Italy
Rome
Milan

MVP functionality:

Create
Rename
Delete
Apply
Remove
Search
13. Duplicate Detection

Implement duplicate detection progressively.

Level 1 — Exact Hash

Two files with identical content are exact duplicates.

Level 2 — Perceptual Hash

Detect:

Resized copies
Different compression versions
Slightly modified copies

Do not start with complex AI-based similarity detection.

Use a simple progressive strategy:

Cheap test → Exact hash → Perceptual hash → More advanced similarity later

14. GPS / Location

If GPS metadata is available:

Store latitude and longitude.
Allow location-based filtering.
Provide a map view.

The map can be developed after the core photo management functionality.

Do not make the MVP dependent on an external map service.

15. User Interface

The UI should be:

Modern
Dark by default
Professional
Minimal
Fast
Productivity-focused

Avoid:

Unnecessary animations
Heavy visual effects
Excessive glassmorphism
Excessive gradients
Huge buttons
Overly complicated interfaces

Basic layout:

Photonic — Search — Settings

Sidebar:

Library
Folders
Collections
Tags
Cameras
Lenses
Locations
Duplicates

Main area:

Virtualized photo grid

Keep the UI focused on the photos.

16. Photo Details

When a photo is selected, show:

Image preview
Filename
Full path
Date
Camera
Lens
Focal length
Aperture
Shutter speed
ISO
Dimensions
File size
GPS
Tags
Rating
17. Future Features

Do not implement these yet:

AI recognition
Face recognition
Embeddings
Semantic search
Cloud synchronization
Photo editing
RAW editing
AI image generation

However, keep the code clean enough that these features can be added later.

Do not create complicated abstractions specifically for hypothetical future features.

18. Privacy

Photonic is:

LOCAL FIRST

Photos should never leave the user's computer unless the user explicitly chooses to export or upload something.

No mandatory cloud.

No automatic image uploads.

No intrusive telemetry.

19. Filesystem Monitoring

Photonic should eventually detect changes in configured folders:

New files
Deleted files
Renamed files
Moved files when reasonably detectable

Do not attempt to perfectly solve every filesystem edge case in the MVP.

Always provide a simple:

Rescan Library

action.

Reliability and simplicity are more important than perfect filesystem intelligence.

20. Background Processing

Long-running operations must never block the UI:

Scanning
Metadata extraction
Thumbnail generation
Hashing
Heavy searches

Use simple Python concurrency or background workers.

Do not create a sophisticated job scheduler.

21. Logging

Use a simple logging system.

Errors should include:

Timestamp
Log level
Operation
File involved when relevant
Error message

A single problematic image must be isolated from the rest of the indexing process.

22. Testing

Focus tests on important functionality:

SQLite operations
Indexing
Metadata extraction
Duplicate detection
Search
Thumbnail generation

Do not chase artificial 100% test coverage.

Test the important parts well.

23. Windows Packaging

The final goal is a normal Windows application.

The user should not need to install Python manually.

Use PyInstaller or another simple packaging solution.

Eventually support:

Installer
Desktop/start menu shortcut
Optional file associations

Do not solve the installer before the application itself works.

24. Development Order

Do not build everything at once.

Phase 1 — Skeleton

Create:

Python project
Svelte project
Local server
SQLite
First application window
Frontend/backend communication

Goal:

Photonic starts → UI appears → Python works → SQLite works

Phase 2 — First Photo Library

Implement:

Add folder
Scan folder
Detect image files
Store files in SQLite
Extract EXIF
Generate thumbnails
Display photo grid

At the end of this phase:

I should be able to point Photonic at a folder containing my photos and immediately browse them inside Photonic.

Phase 3 — Search

Implement:

Search
Filters
Dates
Cameras
Lenses
Tags
Phase 4 — Organization

Implement:

Hierarchical tags
Collections
Favorites
Ratings
Phase 5 — Duplicate Detection

Implement:

Exact hash
Duplicate groups
Perceptual hash
Phase 6 — GPS

Implement:

Coordinates
Location filtering
Map view
25. Absolute Coding Rule

Before adding anything, ask:

Does Photonic actually need this complexity right now?

If the answer is no:

Do not add it.

Avoid:

An abstraction for a single implementation.
An interface that has no real alternative.
A separate service without a concrete need.
A complex architecture "for the future".
Dependencies that solve a problem we do not currently have.

Follow:

YAGNI

KISS

DRY — but do not turn DRY into over-abstraction.

26. Development Behavior

Do not generate hundreds of files at once.

Work incrementally.

After every significant step:

Build.
Run.
Test.
Fix issues.
Verify the result.
Only then move to the next step.

Keep the application working throughout development.

If there are two reasonable technical options, prefer the simpler one.

If a dependency can be avoided without meaningful loss, avoid it.

If 20 lines of straightforward code are better than 5 layers of abstraction, use the 20 lines.

27. First Task

Do NOT immediately build the entire application.

Your first task is to:

Analyze this specification.
Verify the Python + Svelte + SQLite approach.
Propose the minimal project structure.
Propose the minimal SQLite schema.
List only the dependencies that are actually necessary.
Explain how the development environment will run.
Create the minimal project skeleton.
Make Photonic start successfully.
Display the first UI.
Verify frontend-to-Python communication.
Verify SQLite works.

Then stop and report what was created and how it works.

Do not move on to the complete photo indexing system until the foundation is working.

28. Final Product Philosophy

Photonic should feel like this:

I point Photonic at my photo folder, and it just works.

It should be:

Simple enough to understand.
Fast enough to handle a huge library.
Powerful enough for serious photographers.
Light enough to leave running all day.
Local enough that my photos stay mine.

The goal is NOT to build the most technically impressive architecture.

The goal is to build an excellent photo management application.

PHOTONIC

Simple enough to understand.

Powerful enough for a million photos.