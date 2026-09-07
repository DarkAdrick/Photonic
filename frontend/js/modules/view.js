// Photonic module: view
(function (P) {
        // ── View switching ────────────────────────────────────────────────────
    
        function setView(view, opts) {
            const o = opts || {};
            P.activeView = view;
            P.fn.saveRestoreState();
            P.isDragging = false;
            P.dragHighlightIds.clear();
            P.activeTagBrowseId = null;
            P.activeCameraBrowseId = null;
            P.activeCollectionId = null;
            P.fn.hideContextMenu();
            P.navItems.forEach(li => {
                li.classList.toggle("active", li.dataset.view === view);
            });
            if (view === "locations") {
                P.breadcrumbBar.classList.add("hidden");
                P.statsView.classList.add("hidden");
                P.cleaningToolbar.classList.add("hidden");
                P.emptyState.classList.add("hidden");
                P.photoGrid.classList.add("hidden");
                P.mapView.classList.remove("hidden");
                P.mapResize.classList.remove("hidden");
                P.mapPhotosHeader.classList.remove("hidden");
                P.mapPhotos.classList.remove("hidden");
                P.fn.ensureMapSize();
                if (o.load !== false) {
                    P.fn.initMap();
                    P.fn.fitMapToFolder();
                }
            } else if (view === "tags") {
                P.breadcrumbBar.classList.add("hidden");
                P.statsView.classList.add("hidden");
                P.cleaningToolbar.classList.add("hidden");
                P.selectedIds.clear();
                P.emptyState.classList.add("hidden");
                P.mapView.classList.add("hidden");
                P.mapResize.classList.add("hidden");
                P.mapPhotos.classList.add("hidden");
                P.mapPhotosHeader.classList.add("hidden");
                P.photoGrid.classList.remove("hidden");
                P.activeFolderId = null;
                P.activeCountryCode = null;
                if (o.load !== false) P.fn.loadTagsBrowse();
            } else if (view === "countries") {
                P.breadcrumbBar.classList.add("hidden");
                P.statsView.classList.add("hidden");
                P.cleaningToolbar.classList.add("hidden");
    
                P.selectedIds.clear();
                P.emptyState.classList.add("hidden");
                P.mapView.classList.add("hidden");
                P.mapResize.classList.add("hidden");
                P.mapPhotos.classList.add("hidden");
                P.mapPhotosHeader.classList.add("hidden");
                P.photoGrid.classList.remove("hidden");
                P.activeFolderId = null;
                P.activeTagId = null;
                if (o.load !== false) P.fn.loadCountries();
            } else if (view === "cameras") {
                P.breadcrumbBar.classList.add("hidden");
                P.statsView.classList.add("hidden");
                P.cleaningToolbar.classList.add("hidden");
                P.selectedIds.clear();
                P.emptyState.classList.add("hidden");
                P.mapView.classList.add("hidden");
                P.mapResize.classList.add("hidden");
                P.mapPhotos.classList.add("hidden");
                P.mapPhotosHeader.classList.add("hidden");
                P.photoGrid.classList.remove("hidden");
                P.activeFolderId = null;
                P.activeTagId = null;
                P.activeCountryCode = null;
                P.activeCameraBrowseId = null;
                if (o.load !== false) P.fn.loadCamerasBrowse();
            } else if (view === "collections") {
                P.breadcrumbBar.classList.add("hidden");
                P.statsView.classList.add("hidden");
                P.cleaningToolbar.classList.add("hidden");
    
                P.selectedIds.clear();
                P.emptyState.classList.add("hidden");
                P.mapView.classList.add("hidden");
                P.mapResize.classList.add("hidden");
                P.mapPhotos.classList.add("hidden");
                P.mapPhotosHeader.classList.add("hidden");
                P.photoGrid.classList.remove("hidden");
                P.activeFolderId = null;
                P.activeTagId = null;
                P.activeCountryCode = null;
                if (o.load !== false) P.fn.loadCollectionsBrowse();
            } else if (view === "folders") {
                P.breadcrumbBar.classList.add("hidden");
                P.statsView.classList.add("hidden");
                P.cleaningToolbar.classList.add("hidden");
    
                P.selectedIds.clear();
                P.emptyState.classList.add("hidden");
                P.mapView.classList.add("hidden");
                P.mapResize.classList.add("hidden");
                P.mapPhotos.classList.add("hidden");
                P.mapPhotosHeader.classList.add("hidden");
                P.photoGrid.classList.remove("hidden");
                P.activeTagId = null;
                P.activeCountryCode = null;
                if (o.load !== false) P.fn.loadFolderBrowse();
            } else if (view === "cleaning") {
                P.breadcrumbBar.classList.add("hidden");
                P.statsView.classList.add("hidden");
                P.mapView.classList.add("hidden");
                P.mapResize.classList.add("hidden");
                P.mapPhotos.classList.add("hidden");
                P.mapPhotosHeader.classList.add("hidden");
                P.photoGrid.classList.remove("hidden");
                P.cleaningToolbar.classList.remove("hidden");
                P.selectedIds.clear();
        
                P.activeFolderId = null;
                P.activeTagId = null;
                P.activeCountryCode = null;
                if (o.load !== false) P.fn.loadCleaningTab();
            } else if (view === "stats") {
                P.breadcrumbBar.classList.add("hidden");
                P.cleaningToolbar.classList.add("hidden");
    
                P.mapView.classList.add("hidden");
                P.mapResize.classList.add("hidden");
                P.mapPhotos.classList.add("hidden");
                P.mapPhotosHeader.classList.add("hidden");
                P.photoGrid.classList.add("hidden");
                P.emptyState.classList.add("hidden");
                P.statsView.classList.remove("hidden");
                if (o.load !== false) P.fn.loadStats();
            } else {
                P.breadcrumbBar.classList.add("hidden");
                P.statsView.classList.add("hidden");
                P.cleaningToolbar.classList.add("hidden");
    
                P.selectedIds.clear();
                P.mapView.classList.add("hidden");
                P.mapResize.classList.add("hidden");
                P.mapPhotos.classList.add("hidden");
                P.mapPhotosHeader.classList.add("hidden");
                if (P.activeTagId) { P.activeTagId = null; if (o.load !== false) P.fn.loadSidebar(); }
                if (P.activeCountryCode) { P.activeCountryCode = null; if (o.load !== false) P.fn.loadSidebar(); }
                P.activeCameraBrowseId = null;
                if (o.load !== false) P.fn.loadPhotos();
            }
            P.fn.updateViewTitle();
        }
    
        function updateViewTitle() {
            if (!P.viewTitleBar) return;
            const labels = {
                library: "sidebar.library",
                cleaning: "sidebar.cleaning",
                locations: "sidebar.locations",
                stats: "sidebar.stats"
            };
            const key = labels[P.activeView];
            if (!key) {
                P.viewTitleBar.classList.add("hidden");
                return;
            }
            P.viewTitleBar.textContent = P.t(key);
            P.viewTitleBar.classList.remove("hidden");
        }
    
        P.fn.updateViewTitle = updateViewTitle;
    
        P.fn.saveRestoreState = function () {
            try {
                localStorage.setItem("photonic.restore", JSON.stringify({
                    view: P.activeView,
                    folderBrowsePath: P.folderBrowsePath || [],
                    collectionBrowsePath: P.collectionBrowsePath || [],
                    activeTagBrowseId: P.activeTagBrowseId,
                    activeCountryCode: P.activeCountryCode,
                    activeCameraBrowseId: P.activeCameraBrowseId,
                    settingsOpen: !!(P.settingsPage && !P.settingsPage.classList.contains("hidden")),
                    settingsSection: P.settingsSection || "settings-application"
                }));
            } catch (_) {}
        };

        P.fn.readRestoreState = function () {
            try {
                const raw = localStorage.getItem("photonic.restore");
                if (!raw) return null;
                const d = JSON.parse(raw);
                return (d && typeof d === "object") ? d : null;
            } catch (_) {
                return null;
            }
        };

        P.fn.restoreView = function (opts) {
            const o = opts || {};
            const r = P.fn.readRestoreState();
            const validViews = ["library", "folders", "collections", "countries", "tags", "cameras", "locations", "cleaning", "stats"];
            const startView = (r && validViews.includes(r.view)) ? r.view : "library";

            P.folderBrowsePath = (r && Array.isArray(r.folderBrowsePath)) ? r.folderBrowsePath : [];
            P.collectionBrowsePath = (r && Array.isArray(r.collectionBrowsePath)) ? r.collectionBrowsePath : [];
            P.activeTagBrowseId = (r && r.activeTagBrowseId) || null;
            P.activeCountryCode = (r && r.activeCountryCode) || null;
            P.activeCameraBrowseId = (r && r.activeCameraBrowseId) || null;

            P.fn.setView(startView, o);

            if (startView === "cameras" && P.activeCameraBrowseId && o.load !== false) {
                P.fn.loadCamerasBrowse();
            }

            if (r && r.settingsOpen && o.load !== false) {
                P.fn.openSettings();
                P.fn.activateSettingsSection(r.settingsSection);
            }
        };

    
    P.fn.ensureMapSize = function () {
            if (!P.map) return;
            P.map.invalidateSize();
            requestAnimationFrame(() => { if (P.map) P.map.invalidateSize(); });
            setTimeout(() => { if (P.map) P.map.invalidateSize(); }, 250);
        };

    let savedVert = {};
    let savedHor  = {};

    P.fn.setLocationsLayout = function (mode) {
        if (!P.locationsLayout) return;
        const el = P.locationsLayout;
        const btn = document.getElementById("map-btn-layout");
        const isHor = el.classList.contains("horizontal");
        const next = mode || (isHor ? "vertical" : "horizontal");
        if ((next === "horizontal") === isHor) { return; }
        const mainH = document.getElementById("main").clientHeight;
        const mainW = document.getElementById("main").clientWidth;
        if (next === "horizontal") {
            savedVert.map = P.mapView ? P.mapView.style.height : "";
            savedVert.photos = P.mapPhotos ? P.mapPhotos.style.height : "";
            if (P.mapView) P.mapView.style.height = "";
            if (P.mapPhotos) P.mapPhotos.style.height = "";
            el.classList.add("horizontal");
            if (savedHor.map && savedHor.panel && (savedHor.map + savedHor.panel <= mainW - 5)) {
                el.style.gridTemplateColumns = savedHor.map + "px 5px " + savedHor.panel + "px";
            } else {
                el.style.gridTemplateColumns = "";
            }
            if (btn) { btn.title = P.t("map.layout_vertical"); btn.innerHTML = '<i data-lucide="rows-2"></i>'; if (window.lucide) lucide.createIcons({ root: btn }); }
        } else {
            const cols = el.style.gridTemplateColumns;
            const m = cols && cols.match(/^(-?\d+(?:\.\d+)?)px 5px (-?\d+(?:\.\d+)?)px$/);
            if (m) { savedHor.map = parseFloat(m[1]); savedHor.panel = parseFloat(m[2]); }
            el.classList.remove("horizontal");
            el.style.gridTemplateColumns = "";
            if (P.mapView && savedVert.map) P.mapView.style.height = savedVert.map;
            if (P.mapPhotos && savedVert.photos) P.mapPhotos.style.height = savedVert.photos;
            if (btn) { btn.title = P.t("map.layout_horizontal"); btn.innerHTML = '<i data-lucide="columns-2"></i>'; if (window.lucide) lucide.createIcons({ root: btn }); }
        }
        localStorage.setItem("photonic.locationsLayout", next);
        setTimeout(() => P.fn.ensureMapSize(), 0);
    };

    P.fn.toggleLocationsLayout = function () {
        P.fn.setLocationsLayout();
    };

    var btnLayout = document.getElementById("map-btn-layout");
    if (btnLayout) btnLayout.addEventListener("click", () => P.fn.toggleLocationsLayout());
    P.fn.setLocationsLayout(localStorage.getItem("photonic.locationsLayout") === "horizontal" ? "horizontal" : "vertical");

    
    // --- exports ---
        P.fn.setView = setView;
})(window.PhotoApp = window.PhotoApp || {});
