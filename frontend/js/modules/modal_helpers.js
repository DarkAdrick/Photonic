// Photonic module: modal_helpers
(function (P) {
        // ── Color Palette Helper ────────────────────────────────────────────────
    
        function renderColorPalette(container, selectedColor, onSelect) {
            container.innerHTML = "";
            for (const c of P.TAG_COLORS) {
                const swatch = document.createElement("div");
                swatch.className = "tag-color-swatch" + (c === selectedColor ? " active" : "");
                swatch.style.background = c;
                swatch.addEventListener("click", () => {
                    container.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
                    swatch.classList.add("active");
                    onSelect(c);
                });
                container.appendChild(swatch);
            }
        }
    
        // ── Icon Picker Helper ──────────────────────────────────────────────────
    
        const COLLECTION_ICONS = [
            "folder", "folder-open", "image", "images", "camera", "aperture",
            "heart", "star", "bookmark", "archive", "album", "grid-3x3",
            "layers", "map", "globe", "compass", "clock", "calendar",
            "music", "film", "book-open", "briefcase", "home", "users",
            "palette", "sparkles", "zap", "flame", "diamond", "crown",
            "gem", "trophy", "target", "rocket", "sun", "moon",
            "cloud", "tree-pine", "mountain", "waves", "feather", "pen-tool"
        ];
    
        function renderIconPicker(container, selectedIcon, onSelect) {
            container.innerHTML = "";
            for (const name of COLLECTION_ICONS) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "icon-picker-item" + (name === selectedIcon ? " active" : "");
                btn.title = name;
                btn.innerHTML = `<i data-lucide="${name}"></i>`;
                btn.addEventListener("click", () => {
                    container.querySelectorAll(".icon-picker-item").forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    onSelect(name);
                });
                container.appendChild(btn);
            }
            lucide.createIcons({ root: container });
        }
    
        function updateIconSelectedDisplay(iconName) {
            const name = iconName || "library";
            P.collectionIconSelected.innerHTML = `<i data-lucide="${name}"></i> <span>${name}</span>`;
            P.collectionIconInput.value = name;
            lucide.createIcons({ root: P.collectionIconSelected });
        }
    
    
    // --- exports ---
        P.fn.renderColorPalette = renderColorPalette;
        P.fn.renderIconPicker = renderIconPicker;
        P.fn.updateIconSelectedDisplay = updateIconSelectedDisplay;
})(window.PhotoApp = window.PhotoApp || {});
