// Photonic module: i18n
(function (P) {
        // ── Internationalization (i18n) ───────────────────────────────────────
    
        function refreshLangHeader() {
            const cur = I18n.getCurrent();
            const flagEl = document.getElementById("lang-flag-current");
            if (flagEl) {
                const l = I18n.availableLanguages.find(x => x.code === cur);
                const src = l ? l.flag : "/i18n/flags/us.svg";
                flagEl.innerHTML = `<img src="${src}" alt="">`;
            }
            const menu = document.getElementById("lang-menu");
            if (menu) {
                menu.innerHTML = I18n.availableLanguages.map(l => {
                    const cls = l.code === cur ? " lang-menu-item active" : " lang-menu-item";
                    return `<button class="${cls.trim()}" data-lang="${l.code}"><span class="lang-menu-flag"><img src="${l.flag}" alt=""></span>${l.name}</button>`;
                }).join("");
            }
            const langSelect = document.getElementById("setting-language");
            if (langSelect) {
                const l = I18n.availableLanguages.find(x => x.code === cur);
                if (l) {
                    langSelect.innerHTML = `<span class="lang-menu-flag"><img src="${l.flag}" alt=""></span><span>${l.name}</span>`;
                }
            }
            const settingsMenu = document.getElementById("setting-lang-menu");
            if (settingsMenu) {
                settingsMenu.innerHTML = I18n.availableLanguages.map(l => {
                    const cls = l.code === cur ? " lang-menu-item active" : " lang-menu-item";
                    return `<button class="${cls.trim()}" data-lang="${l.code}"><span class="lang-menu-flag"><img src="${l.flag}" alt=""></span>${l.name}</button>`;
                }).join("");
            }
        }
    
        function refreshAfterLangChange() {
            I18n.applyI18n();
            const settingsPageEl = document.getElementById("settings-page");
            const settingsOpen = settingsPageEl && !settingsPageEl.classList.contains("hidden");
            if (settingsOpen) {
                const active = document.querySelector(".settings-nav-item.active");
                const target = active ? active.dataset.section : "settings-application";
                if (target === "settings-application") P.fn.renderApplicationSettings();
                else if (target === "settings-tags-p") P.fn.loadSettingsTags();
                else if (target === "settings-collections-p") P.fn.loadSettingsCollections();
                else if (target === "settings-folders-p") P.fn.loadSettingsFolders();
                P.fn.loadSidebar();
            } else {
                if (P.activeView === "locations") P.fn.loadMapPhotos();
                else if (P.activeView === "countries" && !P.activeCountryCode) P.fn.loadCountries();
                else if (P.activeView === "cameras" && !P.activeCameraBrowseId) P.fn.loadCamerasBrowse();
                else if (P.activeView === "folders" && !P.activeFolderId) P.fn.loadFolderBrowse();
                else if (P.activeView === "tags" && !P.activeTagBrowseId) P.fn.loadTagsBrowse();
                else if (P.activeView === "collections") P.fn.loadCollectionsBrowse();
                else if (P.activeView === "stats") P.fn.loadStats();
                else P.fn.loadPhotos();
                P.fn.loadSidebar();
                P.fn.loadFilters();
            }
            refreshLangHeader();
            lucide.createIcons();
        }
    
        function initLangDropdown() {
            const btn = document.getElementById("btn-lang");
            const menu = document.getElementById("lang-menu");
            refreshLangHeader();
            if (!btn || !menu) return;
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                menu.classList.toggle("hidden");
            });
            document.addEventListener("click", () => menu.classList.add("hidden"));
            menu.addEventListener("click", (e) => {
                const item = e.target.closest(".lang-menu-item");
                if (!item) return;
                const code = item.dataset.lang;
                menu.classList.add("hidden");
                if (code !== I18n.getCurrent()) {
                    I18n.setLanguage(code).then(() => refreshAfterLangChange());
                }
            });
        }
    
    
    // --- exports ---
        P.fn.refreshLangHeader = refreshLangHeader;
        P.fn.refreshAfterLangChange = refreshAfterLangChange;
        P.fn.initLangDropdown = initLangDropdown;
})(window.PhotoApp = window.PhotoApp || {});
