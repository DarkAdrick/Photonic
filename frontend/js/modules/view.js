// Photonic module: view
(function (P) {
        // ── View switching ────────────────────────────────────────────────────
    
        function setView(view, opts) {
            const o = opts || {};
            P.activeView = view;
            P.fn.saveRestoreState();
            P.isDragging = false;
            P.dragHighlightIds.clear();
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
        }
    
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

    
    // --- exports ---
        P.fn.setView = setView;
})(window.PhotoApp = window.PhotoApp || {});
