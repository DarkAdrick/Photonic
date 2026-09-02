// Photonic module: layout
(function (P) {
        // ── Thumb size slider + Ctrl+Scroll ────────────────────────────────────
    
         P.thumbSlider  = document.getElementById("thumb-size");
        const thumbMin = 20;
        const thumbMax = 450;
        const thumbDefault = 150;
    
        function setThumbSize(px) {
            px = Math.round(Math.max(thumbMin, Math.min(thumbMax, px)));
            const prev = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || thumbDefault;
            if (px !== prev) {
                P.photoGrid.classList.remove("zoom-pulse");
                void P.photoGrid.offsetWidth;
                P.photoGrid.classList.add("zoom-pulse");
                setTimeout(() => P.photoGrid.classList.remove("zoom-pulse"), 300);
            }
            document.documentElement.style.setProperty("--thumb-size", px + "px");
            document.documentElement.style.setProperty("--thumb-gap", (px <= 20 ? 2 : px <= 100 ? 3 : 6) + "px");
            document.documentElement.classList.toggle("thumbs-tiny", px <= 90);
            P.thumbSlider.value = px;
            localStorage.setItem("photonic.thumbnailSize", px);
            if (currentLayout === "masonry") requestAnimationFrame(() => layoutMasonry());
            if (P.hasMore && !P.loadingMore) {
                requestAnimationFrame(() => {
                    if (P.photoGrid.scrollTop + P.photoGrid.clientHeight >= P.photoGrid.scrollHeight - 10) P.fn.loadPhotos(false);
                });
            }
        }
    
        P.thumbSlider.addEventListener("input", () => setThumbSize(+P.thumbSlider.value));
    
        const btnZoomOut = document.getElementById("btn-zoom-out");
        if (btnZoomOut) {
            btnZoomOut.addEventListener("click", () => {
                const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || thumbDefault;
                setThumbSize(cur - 20);
            });
        }
    
        const btnZoomIn = document.getElementById("btn-zoom-in");
        if (btnZoomIn) {
            btnZoomIn.addEventListener("click", () => {
                const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || thumbDefault;
                setThumbSize(cur + 20);
            });
        }
    
        P.photoGrid.addEventListener("wheel", (e) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || thumbDefault;
            setThumbSize(cur + (e.deltaY < 0 ? 20 : -20));
        }, { passive: false });
    
        // ── Layout Toggle (Grid / Masonry) ────────────────────────────────────
    
        const btnLayoutGrid    = document.getElementById("btn-layout-grid");
        const btnLayoutMasonry = document.getElementById("btn-layout-masonry");
        let currentLayout = "grid";
        let masonryResizeObs = null;
    
        function layoutMasonry() {
            if (currentLayout !== "masonry") return;
            const cards = P.photoGrid.querySelectorAll(".photo-card, .country-card");
            if (cards.length === 0) return;
    
            const gap = 6;
            const pad = 12;
            const headerBar = document.getElementById("header-photo-grid");
            const topPad = pad + (headerBar ? headerBar.offsetHeight : 0);
            const thumbPx = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--thumb-size")) || 150;
            const contentWidth = P.photoGrid.clientWidth - pad * 2;
            const cols = Math.max(1, Math.floor((contentWidth + gap) / (thumbPx + gap)));
            const colWidth = (contentWidth - gap * (cols - 1)) / cols;
            const colHeights = new Array(cols).fill(0);
    
            for (const card of cards) {
                card.style.width = colWidth + "px";
                if (card.classList.contains("country-card")) {
                    card.style.height = colWidth + "px";
                }
                let shortest = 0;
                for (let c = 1; c < cols; c++) {
                    if (colHeights[c] < colHeights[shortest]) shortest = c;
                }
                card.style.left = (pad + shortest * (colWidth + gap)) + "px";
                card.style.top = (topPad + colHeights[shortest]) + "px";
                colHeights[shortest] += card.offsetHeight + gap;
            }
    
            const maxH = Math.max(...colHeights) + topPad + pad;
            P.photoGrid.style.height = maxH + "px";
        }
    
        function setLayout(mode) {
            currentLayout = mode;
            P.photoGrid.classList.toggle("masonry", mode === "masonry");
            btnLayoutGrid.classList.toggle("active", mode === "grid");
            btnLayoutMasonry.classList.toggle("active", mode === "masonry");
            localStorage.setItem("layout-mode", mode);
            localStorage.setItem("photonic.defaultView", mode);
    
            if (mode === "masonry") {
                P.photoGrid.style.height = "";
                requestAnimationFrame(() => layoutMasonry());
                if (!masonryResizeObs) {
                    masonryResizeObs = new ResizeObserver(() => layoutMasonry());
                    masonryResizeObs.observe(P.photoGrid);
                }
            } else {
                P.photoGrid.style.height = "";
                if (masonryResizeObs) { masonryResizeObs.disconnect(); masonryResizeObs = null; }
                const cards = P.photoGrid.querySelectorAll(".photo-card, .country-card");
                for (const card of cards) {
                    card.style.position = "";
                    card.style.left = "";
                    card.style.top = "";
                    card.style.width = "";
                    card.style.height = "";
                }
            }
        }
    
        const _origLoadPhotos = P.fn.loadPhotos;
        const _origClearGrid = P.fn.clearGrid;
        P.fn.clearGrid = function() {
            _origClearGrid();
            P.photoGrid.style.height = "";
        };
    
        btnLayoutGrid.addEventListener("click", () => setLayout("grid"));
        btnLayoutMasonry.addEventListener("click", () => setLayout("masonry"));
    
        P.photoGrid.addEventListener("load", (e) => {
            if (currentLayout === "masonry" && e.target.tagName === "IMG") layoutMasonry();
        }, true);
    
        const savedLayout = localStorage.getItem("photonic.defaultView") || localStorage.getItem("layout-mode") || "grid";
        setLayout(savedLayout);
    
        const savedThumbSize = localStorage.getItem("photonic.thumbnailSize");
        setThumbSize(savedThumbSize ? +savedThumbSize : thumbDefault);
    
    
    // --- exports ---
        P.fn.setLayout = setLayout;
})(window.PhotoApp = window.PhotoApp || {});
