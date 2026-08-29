// Photonic module: window
(function (P) {
        // ── Frameless desktop window (drag / resize / controls) ───────────────
    
        function initDesktopWindow() {
            if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.resize_window) return;
            document.body.classList.add("pywebview");
            const desktopApi = window.pywebview.api;
    
            // Resize handles: JS tracks the drag (WebView2 swallows native input
            // while a press starts inside the page) and feeds deltas to the API.
            function beginResize(e, edge) {
                const sx = e.screenX, sy = e.screenY;
                const sw = window.innerWidth, sh = window.innerHeight;
                let raf = 0;
    
                function onMove(ev) {
                    if (raf) return;
                    raf = requestAnimationFrame(() => {
                        raf = 0;
                        const dx = ev.screenX - sx, dy = ev.screenY - sy;
                        let w = sw, h = sh;
                        if (edge.indexOf("right") !== -1) w += dx;
                        else if (edge.indexOf("left") !== -1) w -= dx;
                        if (edge.indexOf("bottom") !== -1) h += dy;
                        else if (edge.indexOf("top") !== -1) h -= dy;
                        desktopApi.resize_window(
                            Math.max(Math.round(w), 800),
                            Math.max(Math.round(h), 600),
                            edge
                        );
                    });
                }
    
                function onUp() {
                    if (raf) { cancelAnimationFrame(raf); raf = 0; }
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                }
    
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
            }
    
            document.getElementById("win-resize").addEventListener("mousedown", (e) => {
                const edge = e.target.dataset && e.target.dataset.edge;
                if (!edge || document.body.classList.contains("maximized")) return;
                e.preventDefault();
                beginResize(e, edge);
            });
    
            // Window controls
            document.getElementById("wc-minimize").addEventListener("click", () => desktopApi.minimize());
    
            const maxBtn = document.getElementById("wc-maximize");
            function applyMaximized(m) {
                document.body.classList.toggle("maximized", !!m);
                maxBtn.title = m ? "Restore" : "Maximize";
                maxBtn.innerHTML = `<i data-lucide="${m ? "copy" : "square"}"></i>`;
                lucide.createIcons();
            }
    
            maxBtn.addEventListener("click", async () => {
                try { applyMaximized(await desktopApi.toggle_maximize()); } catch (_) {}
            });
    
            document.getElementById("titlebar-drag").addEventListener("dblclick", () => maxBtn.click());
    
            document.getElementById("wc-close").addEventListener("click", () => desktopApi.close_app());
    
            const controls = document.getElementById("window-controls");
            controls.classList.remove("hidden");
            lucide.createIcons();
        }
    
        if (window.pywebview && window.pywebview.api) {
            initDesktopWindow();
        } else {
            window.addEventListener("pywebviewready", initDesktopWindow);
        }
})(window.PhotoApp = window.PhotoApp || {});
