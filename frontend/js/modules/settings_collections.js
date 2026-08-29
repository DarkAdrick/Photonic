// Photonic module: settings_collections
(function (P) {
    const t = P.t;
        // ── Settings — Collections ─────────────────────────────────────────────
    
        async function loadSettingsCollections() {
            const collections = await P.fn.api("GET", "/api/collections/tree");
            const el = document.getElementById("settings-collections-p");
    
            let totalCount = 0;
            function countNodes(nodes) { for (const n of nodes) { totalCount++; if (n.children) countNodes(n.children); } }
            countNodes(collections);
            document.getElementById("settings-collections-count").textContent = totalCount;
    
            el.innerHTML = `
                <div class="settings-section-title">${t("settings.collections")}</div>
                <div class="settings-section-desc">${t("settings.collections.desc")}</div>
                <div class="settings-section-header">
                    <div></div>
                    <button class="settings-action-btn primary" id="btn-add-collection-setting"><i data-lucide="plus"></i> ${t("settings.collections.new")}</button>
                </div>
                <div class="settings-card">
                    <div id="settings-collections-list"></div>
                </div>
            `;
    
            document.getElementById("btn-add-collection-setting").addEventListener("click", () => P.fn.openCollectionDialog());
    
            const listEl = document.getElementById("settings-collections-list");
    
            if (!collections.length) {
                listEl.innerHTML = `<div class="settings-list-empty"><i data-lucide="layers"></i><div>${t("settings.collections.none")}</div></div>`;
                lucide.createIcons({ root: el });
                return;
            }
    
            function renderNode(n) {
                const color = n.color || P.TAG_COLORS[Math.abs(P.fn.hashStr(n.name)) % P.TAG_COLORS.length];
                const row = document.createElement("div");
                row.className = "settings-row";
                const indent = n.depth > 0 ? `margin-left: ${n.depth * 20}px;` : "";
                const iconName = n.icon || "library";
                row.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0; ${indent}">
                        <span class="tag-dot collection-dot" style="background:${color}"><i data-lucide="${iconName}"></i></span>
                        <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${n.name}</span>
                    </div>
                    <div class="settings-row-actions">
                        <button class="settings-row-btn settings-row-btn-edit" title="${t("settings.collections.edit_title")}" data-id="${n.id}"><i data-lucide="pencil"></i></button>
                        <button class="settings-row-btn delete" title="${t("settings.collections.delete_title")}" data-id="${n.id}"><i data-lucide="trash-2"></i></button>
                    </div>
                `;
                listEl.appendChild(row);
    
                row.querySelector(".settings-row-btn-edit").addEventListener("click", () => P.fn.openCollectionDialog(n));
                row.querySelector(".settings-row-btn.delete").addEventListener("click", async () => {
                    if (!await P.fn.showConfirm(t("settings.collections.delete_title"), t("settings.collections.delete_msg", { name: n.name }), t("confirm.delete"))) return;
                    await P.fn.api("DELETE", `/api/collections/${n.id}`);
                    loadSettingsCollections();
                    P.fn.loadSidebar();
                });
    
                if (n.children) {
                    for (const c of n.children) renderNode(c);
                }
            }
    
            for (const c of collections) renderNode(c);
            lucide.createIcons({ root: el });
        }
    
    
    // --- exports ---
        P.fn.loadSettingsCollections = loadSettingsCollections;
})(window.PhotoApp = window.PhotoApp || {});
