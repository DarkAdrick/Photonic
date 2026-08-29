// Photonic module: settings_tags
(function (P) {
    const t = P.t;
        // ── Settings — Tags ────────────────────────────────────────────────────
    
        function settingsTagColor(t) {
            return t.color || P.TAG_COLORS[Math.abs(P.fn.hashStr(t.name)) % P.TAG_COLORS.length];
        }
    
        async function loadSettingsTags() {
            const tags = await P.fn.api("GET", "/api/tags");
            const el = document.getElementById("settings-tags-p");
            document.getElementById("settings-tags-count").textContent = tags.length;
    
            el.innerHTML = `
                <div class="settings-section-title">${t("settings.tags")}</div>
                <div class="settings-section-desc">${t("settings.tags.desc")}</div>
                <div class="settings-section-header">
                    <div></div>
                    <button class="settings-action-btn primary" id="btn-add-tag-setting"><i data-lucide="plus"></i> ${t("settings.tags.new")}</button>
                </div>
                <div class="settings-card">
                    <div id="settings-tags-list"></div>
                </div>
            `;
            const listEl = document.getElementById("settings-tags-list");
    
            document.getElementById("btn-add-tag-setting").addEventListener("click", () => {
                if (document.getElementById("new-tag-row")) return;
                const row = document.createElement("div");
                row.className = "settings-row";
                row.id = "new-tag-row";
                row.innerHTML = `
                    <input type="color" value="${TAG_COLORS[3]}" id="new-tag-color">
                    <input type="text" placeholder="${t("tag_dialog.name_placeholder")}" id="new-tag-name">
                    <div class="settings-row-actions">
                        <button class="settings-row-btn" title="${t("settings.tags.create")}" id="new-tag-ok"><i data-lucide="check"></i></button>
                        <button class="settings-row-btn delete" title="${t("confirm.cancel")}" id="new-tag-cancel"><i data-lucide="x"></i></button>
                    </div>
                `;
                listEl.prepend(row);
                lucide.createIcons({ root: row });
                const nameInput = row.querySelector("#new-tag-name");
                nameInput.focus();
                const cancel = () => row.remove();
                const submit = async () => {
                    const name = nameInput.value.trim();
                    if (!name) { nameInput.focus(); return; }
                    await P.fn.api("POST", "/api/tags", { name, color: row.querySelector("#new-tag-color").value });
                    loadSettingsTags();
                    P.fn.loadSidebar();
                };
                row.querySelector("#new-tag-ok").addEventListener("click", submit);
                row.querySelector("#new-tag-cancel").addEventListener("click", cancel);
                nameInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") submit();
                    else if (e.key === "Escape") cancel();
                });
            });
    
            if (!tags.length) {
                listEl.innerHTML = `<div class="settings-list-empty"><i data-lucide="tag"></i><div>${t("settings.tags.none")}</div></div>`;
                lucide.createIcons({ root: el });
                return;
            }
    
            for (const tag of tags) {
                const color = settingsTagColor(tag);
                const row = document.createElement("div");
                row.className = "settings-row";
                row.innerHTML = `
                    <span class="tag-dot" style="background:${color}"></span>
                    <input type="color" value="${color}" data-tag-id="${tag.id}">
                    <input type="text" value="${tag.name}" data-tag-id="${tag.id}">
                    <div class="settings-row-actions">
                        <button class="settings-row-btn delete" title="${t("settings.tags.delete")}" data-tag-id="${tag.id}"><i data-lucide="trash-2"></i></button>
                    </div>
                `;
                listEl.appendChild(row);
            }
            lucide.createIcons({ root: el });
    
            listEl.querySelectorAll('input[type="color"]').forEach(inp => {
                inp.addEventListener("input", async () => {
                    const tid = parseInt(inp.dataset.tagId);
                    await P.fn.api("PUT", `/api/tags/${tid}`, { color: inp.value });
                    inp.closest(".settings-row").querySelector(".tag-dot").style.background = inp.value;
                    P.fn.loadSidebar();
                });
            });
    
            listEl.querySelectorAll('input[type="text"]').forEach(inp => {
                let debounce = null;
                inp.addEventListener("input", () => {
                    clearTimeout(debounce);
                    debounce = setTimeout(async () => {
                        const tid = parseInt(inp.dataset.tagId);
                        const newName = inp.value.trim();
                        if (!newName) return;
                        await P.fn.api("PUT", `/api/tags/${tid}`, { name: newName });
                        P.fn.loadSidebar();
                    }, 400);
                });
            });
    
            listEl.querySelectorAll(".settings-row-btn.delete").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const tid = parseInt(btn.dataset.tagId);
                    const name = btn.closest(".settings-row").querySelector('input[type="text"]').value;
                    if (!await P.fn.showConfirm(t("settings.tags.delete_title"), t("settings.tags.delete_msg", { name }), t("confirm.delete"))) return;
                    await P.fn.api("DELETE", `/api/tags/${tid}`);
                    loadSettingsTags();
                    P.fn.loadSidebar();
                });
            });
        }
    
    
    // --- exports ---
        P.fn.loadSettingsTags = loadSettingsTags;
})(window.PhotoApp = window.PhotoApp || {});
