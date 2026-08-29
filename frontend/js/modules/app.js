// Photonic module: app
(function (P) {
        // ── Init ──────────────────────────────────────────────────────────────
    
        for (const name of P.THEME_VARS) {
            const v = localStorage.getItem(`photonic.${name}`);
            if (v) document.documentElement.style.setProperty(`--${name}`, v);
        }
    
        lucide.createIcons();
        I18n.ready().then(() => {
            I18n.applyI18n();
            P.fn.refreshLangHeader();
            P.fn.initLangDropdown();
            lucide.createIcons();
            P.fn.checkStatus();
            P.fn.loadSidebar();
            P.fn.loadPhotos();
            P.fn.loadFilters();
            P.fn.pollScan();
            P.fn.initUpdateChecker();
        });
})(window.PhotoApp = window.PhotoApp || {});
