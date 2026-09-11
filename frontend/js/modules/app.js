// Photonic module: app
(function (P) {
        // ── Init ──────────────────────────────────────────────────────────────
    
        for (const name of P.THEME_VARS) {
            const v = localStorage.getItem(`photonic.${name}`);
            if (v) document.documentElement.style.setProperty(`--${name}`, v);
        }
    
        lucide.createIcons();
        P.fn.restoreView({ load: false });
        window.addEventListener("beforeunload", () => P.fn.saveRestoreState());
        I18n.ready().then(() => {
            I18n.applyI18n();
            P.fn.refreshLangHeader();
            P.fn.initLangDropdown();
            lucide.createIcons();
            P.fn.checkStatus();
            P.fn.loadSidebar();
            if (P.filterHidden) P.filterHidden.value = P.hiddenFilter;
            P.fn.loadFilters();
            P.fn.pollScan();
            P.fn.initUpdateChecker();
            P.fn.restoreView();
            P.fn.ensureMapSize();

            // Mobile: a native library scan runs in the background (outside the
            // desktop poll loop), so reload the views when it finishes.
            if (window.Photonic && window.Photonic.isNative && window.Photonic.isNative()) {
                window.addEventListener("photonic-scan-progress", () => {
                    if (window.__photonicScanRefreshTimer) return;
                    window.__photonicScanRefreshTimer = setTimeout(async () => {
                        window.__photonicScanRefreshTimer = null;
                        try {
                            // During the scan we only refresh the off-canvas sidebar and
                            // filters. Reloading the photo grid would erase it, flash the
                            // background white and reset the scroll position.
                            await P.fn.loadSidebar();
                            await P.fn.loadFilters();
                        } catch (e) { /* non-fatal */ }
                    }, 800);
                });
                window.addEventListener("photonic-scan-complete", async () => {
                    try {
                        console.log("[Photonic] scan-complete fired, reloading grid");
                        await P.fn.loadPhotos();
                        await P.fn.loadSidebar();
                        await P.fn.loadFilters();
                        await P.fn.checkStatus();
                        console.log("[Photonic] scan-complete refresh OK");
                    } catch (e) { console.warn("[Photonic] refresh after scan error:", e); }
                });
                window.addEventListener("photonic-scan-error", (e) => {
                    if (P.scanStatus) P.scanStatus.textContent = (e.detail && e.detail.error) || "scan failed";
                });
            }
        });
})(window.PhotoApp = window.PhotoApp || {});
