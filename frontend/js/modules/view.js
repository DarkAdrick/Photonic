// Photonic module: view
(function (P) {
        // ── View switching ────────────────────────────────────────────────────
    
        function setView(view) {
            P.activeView = view;
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
                P.fn.initMap();
                P.fn.fitMapToFolder();
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
                P.fn.loadTagsBrowse();
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
                P.fn.loadCountries();
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
                P.fn.loadCamerasBrowse();
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
                P.fn.loadCollectionsBrowse();
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
                P.fn.loadFolderBrowse();
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
                P.fn.loadCleaningTab();
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
                P.fn.loadStats();
            } else {
                P.breadcrumbBar.classList.add("hidden");
                P.statsView.classList.add("hidden");
                P.cleaningToolbar.classList.add("hidden");
    
                P.selectedIds.clear();
                P.mapView.classList.add("hidden");
                P.mapResize.classList.add("hidden");
                P.mapPhotos.classList.add("hidden");
                P.mapPhotosHeader.classList.add("hidden");
                if (P.activeTagId) { P.activeTagId = null; P.fn.loadSidebar(); }
                if (P.activeCountryCode) { P.activeCountryCode = null; P.fn.loadSidebar(); }
                P.activeCameraBrowseId = null;
                P.fn.loadPhotos();
            }
        }
    
    
    // --- exports ---
        P.fn.setView = setView;
})(window.PhotoApp = window.PhotoApp || {});
