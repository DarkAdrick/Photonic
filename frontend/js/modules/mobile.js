// Photonic module: mobile (responsive nav + touch interactions)
(function () {
    function isMobile() {
        return window.innerWidth <= 800;
    }

    // On mobile, promote .search-line to a direct child of #header so the
    // search row can span the full header width on line 2 while the action
    // buttons stay beside the logo on line 1. Restored on desktop.
    function reorderHeaderLayout() {
        const header = document.getElementById("header");
        const headerRight = header && header.querySelector(".header-right");
        const searchLine = header && header.querySelector(".search-line");
        if (!header || !headerRight || !searchLine) return;

        if (isMobile()) {
            if (searchLine.parentElement === headerRight) {
                header.appendChild(searchLine);
            }
        } else {
            if (searchLine.parentElement !== headerRight) {
                const donate = headerRight.querySelector(".donate-header-btn");
                headerRight.insertBefore(searchLine, donate);
            }
        }
    }

    function toggleSidebar(open) {
        const sidebar = document.getElementById("sidebar");
        if (!sidebar) return;
        if (open === undefined) open = !sidebar.classList.contains("mobile-open");
        sidebar.classList.toggle("mobile-open", open);
        const backdrop = document.getElementById("sidebar-backdrop");
        if (backdrop) backdrop.classList.toggle("mobile-open", open);
        const btnMenu = document.getElementById("btn-menu");
        if (btnMenu) btnMenu.classList.toggle("active", open);
        document.body.classList.toggle("sidebar-open", open);
    }

    function closeSidebar() {
        toggleSidebar(false);
    }

    // ── Android hardware-back handler ──────────────────────────────────────
    // Called via MainActivity → bridge.eval("window.__photonicHandleBack()").
    // Returns true when the press was consumed (an overlay/panel was closed),
    // false at the root screen so the native side moves the app to background.
    function handleAndroidBack() {
        const P = window.PhotoApp;
        const isShown = (el) => el && !el.classList.contains("hidden");

        // 1. Changelog dialog (opened from settings or the version badge)
        const changelogDlg = document.getElementById("changelog-dialog");
        if (isShown(changelogDlg)) {
            if (typeof P.fn.closeChangelog === "function") P.fn.closeChangelog();
            else changelogDlg.classList.add("hidden");
            return true;
        }

        // 2. Confirm dialog (delete confirmations, cleaning, etc.)
        const confirmDlg = document.getElementById("confirm-dialog");
        if (isShown(confirmDlg)) {
            const cancel = document.getElementById("confirm-cancel");
            if (cancel) cancel.click();
            else confirmDlg.classList.add("hidden");
            return true;
        }

        // 3. Geotag dialog (+ its inner confirm bar first)
        const geotagDlg = document.getElementById("geotag-dialog");
        if (isShown(geotagDlg)) {
            const geotagConfirmBar = document.getElementById("geotag-confirm-bar");
            if (geotagConfirmBar && !geotagConfirmBar.classList.contains("hidden")) {
                const gBack = document.getElementById("geotag-confirm-back");
                if (gBack) { gBack.click(); return true; }
            }
            if (typeof P.fn.closeGeotagModal === "function") P.fn.closeGeotagModal();
            else geotagDlg.classList.add("hidden");
            return true;
        }

        // 4. Collection dialog
        const collDlg = document.getElementById("collection-dialog");
        if (isShown(collDlg)) {
            if (typeof P.fn.closeCollectionDialog === "function") P.fn.closeCollectionDialog();
            else collDlg.classList.add("hidden");
            return true;
        }

        // 5. Folder rename dialog (Settings > Folders)
        const renameDlg = document.getElementById("folder-rename-dialog");
        if (isShown(renameDlg)) {
            if (typeof P.fn.closeRenameDialog === "function") P.fn.closeRenameDialog();
            else renameDlg.classList.add("hidden");
            return true;
        }

        // 6. Tag dialog
        const tagDlg = document.getElementById("tag-dialog");
        if (isShown(tagDlg)) {
            if (typeof P.fn.closeTagModal === "function") P.fn.closeTagModal();
            else tagDlg.classList.add("hidden");
            return true;
        }

        // 7. Scan detail modal
        const scanModal = document.getElementById("scan-detail-modal");
        if (isShown(scanModal)) {
            if (typeof P.fn.closeScanModal === "function") P.fn.closeScanModal();
            else scanModal.classList.add("hidden");
            return true;
        }

        // 8. Add-folder dialog
        const folderDlg = document.getElementById("folder-dialog");
        if (isShown(folderDlg)) {
            if (typeof P.fn.closeDialog === "function") P.fn.closeDialog();
            else folderDlg.classList.add("hidden");
            return true;
        }

        // 9. Context menu (floating photo actions)
        if (P && P.contextMenu && !P.contextMenu.classList.contains("hidden")) {
            if (typeof P.fn.hideContextMenu === "function") P.fn.hideContextMenu();
            else P.contextMenu.classList.add("hidden");
            return true;
        }

        // 10. Photo detail "more" menu
        const detailMenu = document.getElementById("detail-more-menu");
        if (isShown(detailMenu)) {
            if (typeof P.fn.hideDetailMenu === "function") P.fn.hideDetailMenu();
            else detailMenu.classList.add("hidden");
            return true;
        }

        // 11. Photo detail overlay (exit CSS fullscreen before closing)
        if (P && P.detailOverlay && isShown(P.detailOverlay)) {
            if (document.body.classList.contains("photonic-detail-fs")) {
                document.body.classList.remove("photonic-detail-fs");
                if (typeof P.fn.setDetailFullscreenIcon === "function") P.fn.setDetailFullscreenIcon(false);
                return true;
            }
            if (typeof P.fn.closeDetail === "function") P.fn.closeDetail();
            else P.detailOverlay.classList.add("hidden");
            return true;
        }

        // 12. Settings page
        if (P && P.settingsPage && isShown(P.settingsPage)) {
            if (typeof P.fn.closeSettings === "function") P.fn.closeSettings();
            else P.settingsPage.classList.add("hidden");
            return true;
        }

        // 13. Sidebar (left menu on mobile)
        const sidebar = document.getElementById("sidebar");
        if (sidebar && sidebar.classList.contains("mobile-open")) {
            toggleSidebar(false);
            return true;
        }

        // 14. Filter drawer
        if (P && P.filterDrawer && !P.filterDrawer.classList.contains("drawer-closed")) {
            P.filterDrawer.classList.add("drawer-closed");
            if (P.btnToggleFilters) P.btnToggleFilters.classList.remove("active");
            return true;
        }

        // 15. Touch selection mode (grid checkmarks)
        if (P && typeof P.fn.isTouchSelectionMode === "function" && P.fn.isTouchSelectionMode()) {
            P.fn.exitTouchSelectionMode();
            return true;
        }

        // 16. Any sub-view (folders, collections, tags, cameras, countries, map…) → back to library
        if (P && P.activeView && P.activeView !== "library") {
            P.fn.setView("library");
            return true;
        }

        // 17. Root screen → not handled, native moves the task to background.
        return false;
    }
    window.__photonicHandleBack = handleAndroidBack;

    function init() {
        const btnMenu = document.getElementById("btn-menu");
        const backdrop = document.getElementById("sidebar-backdrop");

        if (btnMenu) {
            btnMenu.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleSidebar();
            });
        }

        if (backdrop) {
            backdrop.addEventListener("click", closeSidebar);
        }

        // Close sidebar when a nav item is clicked (mobile only)
        document.querySelectorAll("#sidebar nav ul li, #sidebar-filters .folder-item, #sidebar-filters .collection-item, #sidebar-filters .tag-item").forEach(el => {
            el.addEventListener("click", () => {
                if (isMobile()) closeSidebar();
            });
        });

        // Close sidebar on Escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && isMobile()) closeSidebar();
        });

        // Close sidebar when resizing to desktop
        window.addEventListener("resize", () => {
            reorderHeaderLayout();
            if (!isMobile()) closeSidebar();
        });

        reorderHeaderLayout();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
