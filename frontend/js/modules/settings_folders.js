// Photonic module: settings_folders
(function (P) {
    const t = P.t;
        // ── Settings — Folders ─────────────────────────────────────────────────
    
        async function loadSettingsFolders() {
            const folders = await P.fn.api("GET", "/api/folders");
            const el = document.getElementById("settings-folders-p");
            document.getElementById("settings-folders-count").textContent = folders.length;
    
            el.innerHTML = `
                <div class="settings-section-title">${t("settings.folders")}</div>
                <div class="settings-section-desc">${t("settings.folders.desc")}</div>
                <div class="settings-card">
                    <div id="settings-folders-list"></div>
                </div>
            `;
            const listEl = document.getElementById("settings-folders-list");
    
            if (!folders.length) {
                listEl.innerHTML = `<div class="settings-list-empty"><i data-lucide="folder-open"></i><div>${t("settings.folders.none")}</div></div>`;
                lucide.createIcons({ root: el });
                return;
            }
    
            // Build tree: a folder is nested under its longest path prefix
            const nodes = folders.map(f => ({ ...f, key: f.path.replace(/[\\/]+$/, "").toLowerCase(), children: [], _collapsed: false }));
            const parented = new Set();
            for (const n of nodes) {
                let best = null;
                for (const c of nodes) {
                    if (c === n) continue;
                    if (n.key.startsWith(c.key + "\\") || n.key.startsWith(c.key + "/")) {
                        if (!best || c.key.length > best.key.length) best = c;
                    }
                }
                if (best) { best.children.push(n); parented.add(n); }
            }
            nodes.sort((a, b) => a.path.toLowerCase().localeCompare(b.path.toLowerCase()));
            for (const n of nodes) n.children.sort((a, b) => a.path.toLowerCase().localeCompare(b.path.toLowerCase()));
    
            function applyCollapse(n) {
                for (const c of n.children) {
                    c.row.classList.toggle("hidden", n._collapsed);
                    applyCollapse(c);
                }
            }
    
            function renderFolderNode(node, depth) {
                const row = document.createElement("div");
                row.className = "settings-row settings-folder-row";
                row.style.paddingLeft = (12 + depth * 24) + "px";
                const hasChildren = node.children.length > 0;
                row.innerHTML = `
                    ${hasChildren
                        ? `<button class="folder-toggle" title="${t("settings.folders.collapse")}"><i data-lucide="chevron-down"></i></button>`
                        : '<span class="folder-toggle-spacer"></span>'}
                    <i data-lucide="${hasChildren ? "folder-open" : "folder"}" style="width:16px;height:16px;color:var(--accent);flex-shrink:0"></i>
                    <span class="settings-folder-path" title="${node.path}">${node.path}</span>
                    <span class="settings-folder-count" title="${t("common.items", { count: (node.photo_count || 0).toLocaleString() })}">${(node.photo_count || 0).toLocaleString()}</span>
                    <div class="settings-row-actions">
                        <button class="settings-row-btn scan" title="${t("settings.folders.scan")}" data-folder-path="${node.path}"><i data-lucide="refresh-cw"></i></button>
                        <button class="settings-row-btn delete" title="${t("settings.folders.remove")}" data-folder-id="${node.id}"><i data-lucide="trash-2"></i></button>
                    </div>
                `;
                listEl.appendChild(row);
                node.row = row;
    
                if (hasChildren) {
                    const toggle = row.querySelector(".folder-toggle");
                    toggle.addEventListener("click", () => {
                        node._collapsed = !node._collapsed;
                        toggle.classList.toggle("collapsed", node._collapsed);
                        applyCollapse(node);
                    });
                }
    
                for (const c of node.children) renderFolderNode(c, depth + 1);
                return row;
            }
    
            for (const n of nodes) {
                if (!parented.has(n)) renderFolderNode(n, 0);
            }
            lucide.createIcons({ root: el });
    
            listEl.querySelectorAll(".settings-row-btn.scan").forEach(btn => {
                btn.addEventListener("click", async () => {
                    if (btn.disabled) return;
                    btn.disabled = true;
                    btn.querySelector("svg")?.classList.add("spinning");
                    const res = await P.fn.api("POST", "/api/scan", { path: btn.dataset.folderPath });
                    if (res.error === "scan_already_running") {
                        btn.disabled = false;
                        btn.querySelector("svg")?.classList.remove("spinning");
                        P.scanStatus.textContent = t("settings.folders.scan_running");
                        P.fn.pollScan();
                        return;
                    }
                    P.scanPollCount = 0;
                    P.fn.pollScan();
                });
            });
    
            listEl.querySelectorAll(".settings-row-btn.delete").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const fid = parseInt(btn.dataset.folderId);
                    const path = btn.closest(".settings-row").querySelector(".settings-folder-path").textContent;
                    if (!await P.fn.showConfirm(t("settings.folders.remove_title"), t("settings.folders.remove_msg", { path }), t("settings.folders.remove"))) return;
                    await P.fn.api("DELETE", `/api/folders/${fid}`);
                    loadSettingsFolders();
                    P.fn.loadSidebar();
                });
            });
        }
    
    
    // --- exports ---
        P.fn.loadSettingsFolders = loadSettingsFolders;
})(window.PhotoApp = window.PhotoApp || {});
