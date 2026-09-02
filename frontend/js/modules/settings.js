// Photonic module: settings
(function (P) {
    const t = P.t;
        // ── Settings Page ────────────────────────────────────────────────────
    
         P.settingsPage      = document.getElementById("settings-page");
         P.settingsPageNav   = P.settingsPage.querySelector(".settings-nav-items");
        const settingsSections  = P.settingsPage.querySelectorAll(".settings-section");
        const btnSettings       = document.getElementById("btn-settings");
        const settingsBack      = document.getElementById("settings-back");
        let previousView        = "library";
    
        function openSettings() {
            previousView = P.activeView;
            document.getElementById("empty-state").classList.add("hidden");
            document.getElementById("photo-grid").classList.add("hidden");
            document.getElementById("stats-view").classList.add("hidden");
            document.getElementById("map-view").classList.add("hidden");
            document.getElementById("map-resize").classList.add("hidden");
            document.getElementById("map-photos").classList.add("hidden");
            P.mapPhotosHeader.classList.add("hidden");
            P.cleaningToolbar.classList.add("hidden");
            document.getElementById("sidebar").classList.add("hidden");
            document.getElementById("filter-drawer").classList.add("hidden");
            P.settingsPage.classList.remove("hidden");
            btnSettings.classList.add("active");

            P.settingsPageNav.querySelectorAll(".settings-nav-item").forEach(t => t.classList.remove("active"));
            P.settingsPageNav.querySelector('.settings-nav-item[data-section="settings-application"]').classList.add("active");
            settingsSections.forEach(s => s.classList.add("hidden"));
            document.getElementById("settings-application").classList.remove("hidden");
            renderApplicationSettings();
            lucide.createIcons();
            P.settingsSection = "settings-application";
            P.fn.saveRestoreState();
        }

        P.fn.activateSettingsSection = function (section) {
            if (!section || section === "settings-application") return;
            const item = P.settingsPageNav.querySelector(`.settings-nav-item[data-section="${section}"]`);
            if (!item) return;
            P.settingsPageNav.querySelectorAll(".settings-nav-item").forEach(t => t.classList.remove("active"));
            item.classList.add("active");
            const target = item.dataset.section;
            P.settingsSection = target;
            settingsSections.forEach(s => s.classList.add("hidden"));
            document.getElementById(target).classList.remove("hidden");
            if (target === "settings-application") renderApplicationSettings();
            else if (target === "settings-tags-p") P.fn.loadSettingsTags();
            else if (target === "settings-collections-p") P.fn.loadSettingsCollections();
            else if (target === "settings-folders-p") P.fn.loadSettingsFolders();
            lucide.createIcons();
        };
    
        function closeSettings() {
            P.settingsPage.classList.add("hidden");
            btnSettings.classList.remove("active");
            document.getElementById("sidebar").classList.remove("hidden");
            document.getElementById("filter-drawer").classList.remove("hidden");
            P.fn.setView(previousView);
        }
    
        btnSettings.addEventListener("click", () => {
            if (!P.settingsPage.classList.contains("hidden")) closeSettings();
            else openSettings();
        });
        settingsBack.addEventListener("click", closeSettings);
    
        P.settingsPageNav.querySelectorAll(".settings-nav-item").forEach(item => {
            item.addEventListener("click", () => {
                P.settingsPageNav.querySelectorAll(".settings-nav-item").forEach(t => t.classList.remove("active"));
                item.classList.add("active");
                const target = item.dataset.section;
                P.settingsSection = target;
                P.fn.saveRestoreState();
                settingsSections.forEach(s => s.classList.add("hidden"));
                document.getElementById(target).classList.remove("hidden");
                if (target === "settings-application") renderApplicationSettings();
                else if (target === "settings-tags-p") P.fn.loadSettingsTags();
                else if (target === "settings-collections-p") P.fn.loadSettingsCollections();
                else if (target === "settings-folders-p") P.fn.loadSettingsFolders();
                lucide.createIcons();
            });
        });
    
        // ── Application Settings ──────────────────────────────────────────────
    
         P.THEME_VARS = ["bg-primary", "bg-secondary", "bg-tertiary", "accent", "border", "text-primary", "text-secondary"];
    
        const THEME_PALETTES = [
            { id: "midnight",      name: "Midnight",      mode: "dark",  colors: { "bg-primary": "#0A0D3A", "bg-secondary": "#0F1248", "bg-tertiary": "#181C58", "accent": "#28A8D8", "border": "#2A2E68", "text-primary": "#E6E6F0", "text-secondary": "#8488A8" } },
            { id: "phoenix-dark",  name: "Phoenix Dark",  mode: "dark",  colors: { "bg-primary": "#0c0604", "bg-secondary": "#241209", "bg-tertiary": "#301A0D", "accent": "#FF7A29", "border": "#3D2413", "text-primary": "#F5E9DF", "text-secondary": "#A88B76" } },
            { id: "forest",        name: "Forest",        mode: "dark",  colors: { "bg-primary": "#0c0604", "bg-secondary": "#10291F", "bg-tertiary": "#173527", "accent": "#4ADE80", "border": "#1F4030", "text-primary": "#E3F0E8", "text-secondary": "#82A893" } },
            { id: "daylight",      name: "Daylight",      mode: "light", colors: { "bg-primary": "#F4F5FA", "bg-secondary": "#FFFFFF", "bg-tertiary": "#EAECF4", "accent": "#2563EB", "border": "#D8DBE8", "text-primary": "#191D30", "text-secondary": "#686E8C" } },
            { id: "phoenix-light", name: "Phoenix Light", mode: "light", colors: { "bg-primary": "#FBF3EA", "bg-secondary": "#FFFFFF", "bg-tertiary": "#F6E8D8", "accent": "#E85D04", "border": "#EBDCC9", "text-primary": "#2B1A10", "text-secondary": "#8C7361" } },
            { id: "forest-light",  name: "Forest Light",  mode: "light", colors: { "bg-primary": "#f4faf4", "bg-secondary": "#FFFFFF", "bg-tertiary": "#dff6d8", "accent": "#39df76", "border": "#cdebc9", "text-primary": "#162b10", "text-secondary": "#658c61" } }
        ];
    
        function renderApplicationSettings() {
            const staleMenu = document.getElementById("setting-lang-menu");
            if (staleMenu && staleMenu.parentNode === document.body) staleMenu.remove();
            const el = document.getElementById("settings-application");
            const confirmDelete = localStorage.getItem("photonic.confirmDelete") !== "false";
            const confirmGeotagOverwrite = localStorage.getItem("photonic.confirmGeotagOverwrite") !== "false";
            const showExts = localStorage.getItem("photonic.showExtensions") === "true";
            const showHiddenDefault = localStorage.getItem("photonic.showHiddenDefault") === "true";
            const thumbSize = parseInt(localStorage.getItem("photonic.thumbnailSize") || "150");
            const defaultView = localStorage.getItem("photonic.defaultView") || "grid";
            const clusterThreshold = parseInt(localStorage.getItem("photonic.clusterThreshold") || "1");
            const clusterGlobalThreshold = parseInt(localStorage.getItem("photonic.clusterGlobalThreshold") || "500");
            const savedPalette = localStorage.getItem("photonic.palette");
    
            el.innerHTML = `
                <div class="settings-app-info">
                    <div class="settings-app-icon"><i data-lucide="aperture"></i></div>
                    <div class="settings-app-details">
                        <div class="settings-app-name">PHOTONIC</div>
                        <span class="settings-app-version" id="settings-page-version"></span>
                        <p class="settings-app-desc">${t("settings.app.desc")}</p>
                        <button class="settings-action-btn" id="setting-open-changelog"><i data-lucide="scroll-text"></i> ${t("settings.app.whats_new")}</button>
                    </div>
                </div>
    
                <div class="settings-card settings-card-gradient">
                    <div class="settings-card-header">
                        <i data-lucide="arrow-up-circle"></i>
                        <h3>${t("settings.updates.title")}</h3>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label" id="setting-update-status">${P.fn.describeUpdateState(P.lastUpdateState)}</div>
                            <div class="setting-desc">${P.lastUpdateState && P.lastUpdateState.current_version ? t("settings.updates.current_version", { v: P.lastUpdateState.current_version }) : ""}${t("settings.updates.desc")}</div>
                        </div>
                        <div class="setting-control" style="display:flex; gap:8px;">
                            <button class="settings-action-btn" id="setting-update-check"><i data-lucide="refresh-cw"></i> ${t("settings.updates.check")}</button>
                            <a class="settings-action-btn" href="${P.RELEASES_PAGE}" target="_blank" rel="noopener"><i data-lucide="download"></i> ${t("settings.updates.releases")}</a>
                        </div>
                    </div>
                </div>
    
                <div class="settings-card settings-card-gradient">
                    <div class="settings-card-header">
                        <i data-lucide="sliders-horizontal"></i>
                        <h3>${t("settings.general.title")}</h3>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.general.confirm_delete")}</div>
                            <div class="setting-desc">${t("settings.general.confirm_delete_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-confirm-delete" ${confirmDelete ? "checked" : ""}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.general.confirm_geotag_overwrite")}</div>
                            <div class="setting-desc">${t("settings.general.confirm_geotag_overwrite_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-confirm-geotag" ${confirmGeotagOverwrite ? "checked" : ""}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.general.show_extensions")}</div>
                            <div class="setting-desc">${t("settings.general.show_extensions_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-show-extensions" ${showExts ? "checked" : ""}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label" data-i18n="settings.general.language">${t("settings.general.language")}</div>
                            <div class="setting-desc" data-i18n="settings.general.language_desc">${t("settings.general.language_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <div class="lang-settings-wrap">
                                <button class="settings-select lang-settings-btn" id="setting-language" type="button"></button>
                                <div class="lang-menu lang-settings-menu hidden" id="setting-lang-menu"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.general.telemetry")}</div>
                            <div class="setting-desc">${t("settings.general.telemetry_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-telemetry" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
    
                <div class="settings-card settings-card-gradient">
                    <div class="settings-card-header">
                        <i data-lucide="layout-grid"></i>
                        <h3>${t("settings.display.title")}</h3>
                    </div>
                    <div class="settings-sub-header">
                        <span class="section-dot"></span>
                        <h4>${t("settings.display.general_sub")}</h4>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.general.show_hidden_default")}</div>
                            <div class="setting-desc">${t("settings.general.show_hidden_default_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <label class="toggle-switch">
                                <input type="checkbox" id="setting-show-hidden-default" ${showHiddenDefault ? "checked" : ""}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.thumb_label")}</div>
                            <div class="setting-desc">${t("settings.display.thumb_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <div class="settings-range-wrap">
                                <input type="range" class="settings-range" id="setting-thumb-size" min="20" max="450" value="${thumbSize}">
                                <input type="number" class="settings-range-label settings-range-input" id="setting-thumb-size-label" value="${thumbSize}" min="20" max="450" step="1" aria-label="${t("settings.display.thumb_label")}">
                                <span class="settings-range-unit">px</span>
                            </div>
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.default_view")}</div>
                            <div class="setting-desc" id="default-view-desc">${t("settings.display.default_view_desc")}${defaultView === "masonry" ? " " + t("settings.display.default_view_masonry") : ""}</div>
                        </div>
                        <div class="setting-control">
                            <div class="settings-layout-toggle" id="setting-default-view">
                                <button class="layout-btn${defaultView === "grid" ? " active" : ""}" data-view="grid" title="${t("settings.display.grid")}"><i data-lucide="grid-3x3"></i></button>
                                <button class="layout-btn${defaultView === "masonry" ? " active" : ""}" data-view="masonry" title="${t("settings.display.masonry")}"><i data-lucide="layout-dashboard"></i><span class="btn-beta-tag">BETA</span></button>
                            </div>
                        </div>
                    </div>
                    <div class="settings-sub-header">
                        <span class="section-dot"></span>
                        <h4>${t("settings.display.locations_sub")}</h4>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.cluster_label")}</div>
                            <div class="setting-desc" id="setting-cluster-threshold-desc">${t("settings.display.cluster_desc")}<br>${t("settings.display.cluster_1")}</div>
                        </div>
                        <div class="setting-control">
                            <div class="settings-range-wrap">
                                <input type="range" class="settings-range" id="setting-cluster-threshold" min="1" max="5000" step="1" value="${clusterThreshold}">
                                <input type="number" class="settings-range-label settings-range-input" id="setting-cluster-threshold-label" value="${clusterThreshold}" min="1" max="5000" step="1" aria-label="${t("settings.display.cluster_label")}">
                            </div>
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.cluster_global_label")}</div>
                            <div class="setting-desc" id="setting-cluster-global-desc">${t("settings.display.cluster_global_desc")}<br>${t("settings.display.cluster_global_ex")}</div>
                        </div>
                        <div class="setting-control">
                            <div class="settings-range-wrap">
                                <input type="range" class="settings-range" id="setting-cluster-global" min="300" max="5000" step="1" value="${clusterGlobalThreshold}">
                                <input type="number" class="settings-range-label settings-range-input" id="setting-cluster-global-label" value="${clusterGlobalThreshold}" min="300" max="5000" step="1" aria-label="${t("settings.display.cluster_global_label")}">
                            </div>
                        </div>
                    </div>
                    <div class="settings-sub-header">
                        <span class="section-dot"></span>
                        <h4>${t("settings.display.appearance_sub")}</h4>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.palettes_label")}</div>
                            <div class="setting-desc">${t("settings.display.palettes_desc")}</div>
                        </div>
                        <div class="setting-control palette-groups">
                            ${["dark", "light"].map(mode => `
                                <div class="palette-group">
                                    <span class="palette-group-label">${mode === "dark" ? t("settings.display.dark") : t("settings.display.light")}</span>
                                    <div class="palette-row">
                                        ${THEME_PALETTES.filter(p => p.mode === mode).map(p => `
                                            <button class="palette-swatch${savedPalette === p.id ? " active" : ""}" data-palette="${p.id}" title="${p.name}">
                                                <span class="palette-dots">
                                                    <i style="background:${p.colors["bg-secondary"]}"></i>
                                                    <i style="background:${p.colors["bg-tertiary"]}"></i>
                                                    <i style="background:${p.colors["accent"]}"></i>
                                                </span>
                                                <span class="palette-name">${p.name}</span>
                                            </button>
                                        `).join("")}
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.bg_primary")}</div>
                            <div class="setting-desc">${t("settings.display.bg_primary_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <input type="color" class="settings-color" id="setting-bg-primary" value="${localStorage.getItem("photonic.bg-primary") || "#0A0D3A"}">
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.bg_secondary")}</div>
                            <div class="setting-desc">${t("settings.display.bg_secondary_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <input type="color" class="settings-color" id="setting-bg-secondary" value="${localStorage.getItem("photonic.bg-secondary") || "#0F1248"}">
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.bg_tertiary")}</div>
                            <div class="setting-desc">${t("settings.display.bg_tertiary_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <input type="color" class="settings-color" id="setting-bg-tertiary" value="${localStorage.getItem("photonic.bg-tertiary") || "#181C58"}">
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.accent")}</div>
                            <div class="setting-desc">${t("settings.display.accent_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <input type="color" class="settings-color" id="setting-accent" value="${localStorage.getItem("photonic.accent") || "#28A8D8"}">
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.borders")}</div>
                            <div class="setting-desc">${t("settings.display.borders_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <input type="color" class="settings-color" id="setting-border" value="${localStorage.getItem("photonic.border") || "#2A2E68"}">
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.text_primary")}</div>
                            <div class="setting-desc">${t("settings.display.text_primary_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <input type="color" class="settings-color" id="setting-text-primary" value="${localStorage.getItem("photonic.text-primary") || "#E6E6F0"}">
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.text_secondary")}</div>
                            <div class="setting-desc">${t("settings.display.text_secondary_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <input type="color" class="settings-color" id="setting-text-secondary" value="${localStorage.getItem("photonic.text-secondary") || "#8488A8"}">
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.display.reset_colors")}</div>
                            <div class="setting-desc">${t("settings.display.reset_colors_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <button class="settings-action-btn" id="setting-reset-colors"><i data-lucide="rotate-ccw"></i> ${t("settings.display.reset")}</button>
                        </div>
                    </div>
                </div>
    
                <div class="settings-card settings-card-gradient">
                    <div class="settings-card-header">
                        <i data-lucide="database"></i>
                        <h3>${t("settings.data.title")}</h3>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <div class="setting-label">${t("settings.data.rescan_label")}</div>
                            <div class="setting-desc">${t("settings.data.rescan_desc")}</div>
                        </div>
                        <div class="setting-control">
                            <button class="settings-action-btn" id="setting-rescan"><i data-lucide="refresh-cw"></i> ${t("settings.data.rescan")}</button>
                        </div>
                    </div>
                </div>
            `;
    
            const versionBadge = document.getElementById("version-badge");
            const ver = document.getElementById("settings-page-version");
            if (ver && versionBadge) ver.textContent = versionBadge.textContent.trim();
    
            document.getElementById("setting-confirm-delete").addEventListener("change", (e) => {
                localStorage.setItem("photonic.confirmDelete", e.target.checked);
            });
            document.getElementById("setting-confirm-geotag").addEventListener("change", (e) => {
                localStorage.setItem("photonic.confirmGeotagOverwrite", e.target.checked);
            });
            document.getElementById("setting-show-extensions").addEventListener("change", (e) => {
                localStorage.setItem("photonic.showExtensions", e.target.checked);
            });
            document.getElementById("setting-show-hidden-default").addEventListener("change", (e) => {
                localStorage.setItem("photonic.showHiddenDefault", e.target.checked);
            });
    
            const telemetryToggle = document.getElementById("setting-telemetry");
            let telemetryDirty = false;
            telemetryToggle.addEventListener("change", (e) => {
                telemetryDirty = true;
                P.fn.api("POST", "/api/settings/telemetry", { enabled: e.target.checked });
            });
            P.fn.api("GET", "/api/settings/telemetry").then(d => {
                if (!telemetryDirty && d && typeof d.enabled === "boolean") telemetryToggle.checked = d.enabled;
            }).catch(() => {});
    
            const langSelect = document.getElementById("setting-language");
            const settingsMenu = document.getElementById("setting-lang-menu");
            if (langSelect && settingsMenu) {
                P.fn.refreshLangHeader();
                function openSettingsLangMenu() {
                    if (settingsMenu.parentNode !== document.body) {
                        document.body.appendChild(settingsMenu);
                    }
                    const r = langSelect.getBoundingClientRect();
                    settingsMenu.style.position = "fixed";
                    settingsMenu.style.left = Math.min(r.left, window.innerWidth - settingsMenu.offsetWidth - 8) + "px";
                    settingsMenu.style.top = (r.bottom + 6) + "px";
                    settingsMenu.classList.remove("hidden");
                }
                langSelect.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (settingsMenu.classList.contains("hidden")) {
                        openSettingsLangMenu();
                    } else {
                        settingsMenu.classList.add("hidden");
                    }
                    const headerMenu = document.getElementById("lang-menu");
                    if (headerMenu) headerMenu.classList.add("hidden");
                });
                document.addEventListener("click", () => settingsMenu.classList.add("hidden"));
                settingsMenu.addEventListener("click", (e) => {
                    const item = e.target.closest(".lang-menu-item");
                    if (!item) return;
                    const code = item.dataset.lang;
                    settingsMenu.classList.add("hidden");
                    if (code !== I18n.getCurrent()) {
                        I18n.setLanguage(code).then(() => {
                            P.fn.refreshAfterLangChange();
                        });
                    }
                });
            }
    
            const thumbSlider = document.getElementById("setting-thumb-size");
            const thumbLabel = document.getElementById("setting-thumb-size-label");
            const mainThumb = document.getElementById("thumb-size");
            function applyThumbSize(v) {
                v = Math.max(20, Math.min(450, +v || 20));
                thumbSlider.value = v;
                thumbLabel.value = v;
                localStorage.setItem("photonic.thumbnailSize", v);
                document.documentElement.style.setProperty("--thumb-size", v + "px");
                document.documentElement.style.setProperty("--thumb-gap", (v <= 20 ? 2 : v <= 100 ? 3 : 6) + "px");
                document.documentElement.classList.toggle("thumbs-tiny", +v <= 90);
                if (mainThumb) mainThumb.value = v;
            }
            thumbSlider.addEventListener("input", (e) => applyThumbSize(e.target.value));
            thumbLabel.addEventListener("change", (e) => applyThumbSize(e.target.value));
    
            document.querySelectorAll("#setting-default-view .layout-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const v = btn.dataset.view;
                    localStorage.setItem("photonic.defaultView", v);
                    P.fn.setLayout(v);
                    document.querySelectorAll("#setting-default-view .layout-btn").forEach(b => b.classList.toggle("active", b === btn));
                    const desc = document.getElementById("default-view-desc");
                    if (desc) desc.textContent = t("settings.display.default_view_desc") + (v === "masonry" ? " " + t("settings.display.default_view_masonry") : "");
                });
            });
    
            const clusterSlider = document.getElementById("setting-cluster-threshold");
            const clusterLabel = document.getElementById("setting-cluster-threshold-label");
            const clusterDesc = document.getElementById("setting-cluster-threshold-desc");
            const clusterDescBase = clusterDesc ? clusterDesc.innerHTML : "";
            if (clusterSlider && clusterLabel) {
                const setClusterWarn = (v) => {
                    clusterLabel.classList.toggle("warn", +v > 100);
                    if (clusterDesc) {
                        clusterDesc.innerHTML = clusterDescBase + (+v > 100
                            ? `<div class="setting-desc-warn">⚠ ${t("settings.display.cluster_warn")}</div>`
                            : "");
                    }
                };
                const applyCluster = (v) => {
                    v = Math.max(1, Math.min(5000, +v || 1));
                    clusterSlider.value = v;
                    clusterLabel.value = v;
                    localStorage.setItem("photonic.clusterThreshold", v);
                    setClusterWarn(v);
                    if (P.activeView === "locations") { P.lastMapQueryUrl = null; P.fn.loadMapPhotos(); }
                };
                clusterSlider.addEventListener("input", (e) => applyCluster(e.target.value));
                clusterLabel.addEventListener("change", (e) => applyCluster(e.target.value));
                setClusterWarn(clusterSlider.value);
            }
    
            const clusterGlobalSlider = document.getElementById("setting-cluster-global");
            const clusterGlobalLabel = document.getElementById("setting-cluster-global-label");
            const clusterGlobalDesc = document.getElementById("setting-cluster-global-desc");
            const clusterGlobalDescBase = clusterGlobalDesc ? clusterGlobalDesc.innerHTML : "";
            if (clusterGlobalSlider && clusterGlobalLabel) {
                const setClusterGlobalWarn = (v) => {
                    clusterGlobalLabel.classList.toggle("warn", +v > 1000);
                    if (clusterGlobalDesc) {
                        clusterGlobalDesc.innerHTML = clusterGlobalDescBase + (+v > 1000
                            ? `<div class="setting-desc-warn">⚠ ${t("settings.display.cluster_global_warn")}</div>`
                            : "");
                    }
                };
                const applyClusterGlobal = (v) => {
                    v = Math.max(300, Math.min(5000, +v || 300));
                    clusterGlobalSlider.value = v;
                    clusterGlobalLabel.value = v;
                    localStorage.setItem("photonic.clusterGlobalThreshold", v);
                    setClusterGlobalWarn(v);
                    if (P.activeView === "locations") { P.lastMapQueryUrl = null; P.fn.loadMapPhotos(); }
                };
                clusterGlobalSlider.addEventListener("input", (e) => applyClusterGlobal(e.target.value));
                clusterGlobalLabel.addEventListener("change", (e) => applyClusterGlobal(e.target.value));
                setClusterGlobalWarn(clusterGlobalSlider.value);
            }
    
            document.getElementById("setting-rescan").addEventListener("click", () => {
                const btn = document.getElementById("btn-rescan");
                if (btn) btn.click();
            });
    
            document.getElementById("setting-update-check").addEventListener("click", async (e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                btn.innerHTML = `<i data-lucide="loader-circle"></i> ${t("settings.updates.checking")}`;
                lucide.createIcons({ root: btn });
                try {
                    const data = await P.fn.api("POST", "/api/update/check");
                    P.fn.applyUpdateState(data, false);
                    if (data.update_available) {
                        P.fn.showToast(
                            t("update.view_release_toast", { v: `v${data.latest_version}`, url: data.release_url || P.RELEASES_PAGE }),
                            { icon: "arrow-up-circle", duration: 12000 }
                        );
                    }
                } catch {
                    P.fn.applyUpdateState({ ...(P.lastUpdateState || {}), error: "network" }, false);
                }
                btn.disabled = false;
                btn.innerHTML = `<i data-lucide="refresh-cw"></i> ${t("settings.updates.check")}`;
                lucide.createIcons({ root: btn });
            });
    
            for (const name of P.THEME_VARS) {
                document.getElementById(`setting-${name}`).addEventListener("input", (e) => {
                    applyThemeColor(name, e.target.value);
                    localStorage.setItem("photonic.palette", "custom");
                    document.querySelectorAll(".palette-swatch").forEach(s => s.classList.remove("active"));
                });
            }
    
            document.querySelectorAll(".palette-swatch").forEach(swatch => {
                swatch.addEventListener("click", () => {
                    const palette = THEME_PALETTES.find(p => p.id === swatch.dataset.palette);
                    if (!palette) return;
                    for (const [name, value] of Object.entries(palette.colors)) {
                        applyThemeColor(name, value);
                        document.getElementById(`setting-${name}`).value = value;
                    }
                    localStorage.setItem("photonic.palette", palette.id);
                    document.querySelectorAll(".palette-swatch").forEach(s => s.classList.toggle("active", s === swatch));
                });
            });
    
            const swatches = Array.from(document.querySelectorAll(".palette-swatch"));
            if (swatches.length) {
                const maxW = Math.max(...swatches.map(s => s.offsetWidth));
                swatches.forEach(s => { s.style.minWidth = maxW + "px"; });
            }
    
            document.getElementById("setting-reset-colors").addEventListener("click", () => {
                const midnight = THEME_PALETTES.find(p => p.id === "midnight");
                for (const [name, value] of Object.entries(midnight.colors)) {
                    localStorage.removeItem(`photonic.${name}`);
                    document.getElementById(`setting-${name}`).value = value;
                    applyThemeColor(name, value);
                }
                localStorage.setItem("photonic.palette", "midnight");
                document.querySelectorAll(".palette-swatch").forEach(s => s.classList.toggle("active", s.dataset.palette === "midnight"));
            });
    
            document.getElementById("setting-open-changelog").addEventListener("click", P.fn.openChangelog);
        }
    
        function applyThemeColor(name, value) {
            localStorage.setItem(`photonic.${name}`, value);
            document.documentElement.style.setProperty(`--${name}`, value);
        }
    
    
    // --- exports ---
        P.fn.renderApplicationSettings = renderApplicationSettings;
        P.fn.openSettings = openSettings;
})(window.PhotoApp = window.PhotoApp || {});
