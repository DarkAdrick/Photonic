#!/usr/bin/env python3
"""Regenerate Photonic icon asset files from the master render (logo-1024.png).

Outputs:
  - repo root:    icon.ico (multi-size), icon.png
  - frontend/:    icon.png (favicon)
  - android res:  mipmap-*/ic_launcher*.png, drawable*/splash.png
Run from anywhere; paths are absolute. Re-run after exporting a new logo.
"""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = os.path.join(ROOT, "build-ico", "logo-1024.png")
RES = os.path.join(ROOT, "mobile", "android", "app", "src", "main", "res")
FRONTEND = os.path.join(ROOT, "frontend")

master = Image.open(MASTER).convert("RGBA")


def canvas_logo(canvas, scale):
    """Logo centered on a transparent `canvas` (px), occupying `scale` of its width."""
    size = int(round(canvas * scale))
    logo = master.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    off = (canvas - size) // 2
    out.paste(logo, (off, off), logo)
    return out


# ── Desktop / web ─────────────────────────────────────────────────────────
master.save(os.path.join(ROOT, "icon.png"))
ico = master.copy()
ico.save(os.path.join(ROOT, "icon.ico"), format="ICO",
         sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
favicon = master.resize((512, 512), Image.LANCZOS)
favicon.save(os.path.join(FRONTEND, "icon.png"))

# ── Android launcher icons ────────────────────────────────────────────────
LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
for dpi, px in LEGACY.items():
    d = os.path.join(RES, "mipmap-" + dpi)
    canvas_logo(px, 0.92).save(os.path.join(d, "ic_launcher.png"))
    canvas_logo(px, 0.92).save(os.path.join(d, "ic_launcher_round.png"))
for dpi, px in FOREGROUND.items():
    d = os.path.join(RES, "mipmap-" + dpi)
    canvas_logo(px, 0.66).save(os.path.join(d, "ic_launcher_foreground.png"))

# ── Android splash (solid Daylight background + centered logo) ─────────────
SPLASH_BG = (244, 245, 250)  # Daylight --bg-primary


def splash(size):
    w, h = size
    dim = 0.24 * min(w, h)
    logo = master.resize((int(round(dim)), int(round(dim))), Image.LANCZOS)
    out = Image.new("RGB", (w, h), SPLASH_BG)
    off = ((w - logo.width) // 2, (h - logo.height) // 2)
    out.paste(logo, off, logo)
    return out


SPLASHES = [
    ("drawable", (480, 320)),
    ("drawable-land-mdpi", (480, 320)),
    ("drawable-land-hdpi", (800, 480)),
    ("drawable-land-xhdpi", (1280, 720)),
    ("drawable-land-xxhdpi", (1600, 960)),
    ("drawable-land-xxxhdpi", (1920, 1280)),
    ("drawable-port-mdpi", (320, 480)),
    ("drawable-port-hdpi", (480, 800)),
    ("drawable-port-xhdpi", (720, 1280)),
    ("drawable-port-xxhdpi", (960, 1600)),
    ("drawable-port-xxxhdpi", (1280, 1920)),
]
for folder, size in SPLASHES:
    splash(size).save(os.path.join(RES, folder, "splash.png"))

print("done")