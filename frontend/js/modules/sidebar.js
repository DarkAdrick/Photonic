// Photonic module: sidebar
(function (P) {
    const t = P.t;
        // ── Sidebar (Folders + Tags always visible) ────────────────────────────
    
        async function loadSidebar() {
            const [rawFolders, rawCollections, rawTags] = await Promise.all([
                P.fn.api("GET", "/api/folders/tree"),
                P.fn.api("GET", "/api/collections/tree"),
                P.fn.api("GET", "/api/tags"),
            ]);
            const folders = Array.isArray(rawFolders) ? rawFolders : [];
            const collections = Array.isArray(rawCollections) ? rawCollections : [];
            const tags = Array.isArray(rawTags) ? rawTags : [];
            P.btnRescan.disabled = folders.length === 0;
    
            let html = "";
            if (folders.length > 0 || collections.length > 0 || tags.length > 0) {
                html += '<div class="sb-quick-title">' + t("sidebar.quick_filters") + '</div>';
            }
            if (folders.length > 0) {
                const fCollapsed = localStorage.getItem("sb-folders") === "1";
                html += '<h4 class="sb-section-header' + (fCollapsed ? " collapsed" : "") + '" data-section="sb-folders"><span class="sb-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></span> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path></svg> ' + t("sidebar.folders") + '</h4>';
                html += '<div class="sb-section-content' + (fCollapsed ? " collapsed" : "") + '">';
                 html += '<div class="folder-item' + (P.activeFolderId === null ? " active" : "") + '" data-folder-id="all">' + t("sidebar.all_items") + '</div>';
                for (const f of folders) {
                    const active = P.activeFolderId === f.id ? " active" : "";
                    const indent = f.depth > 0 ? ` style="padding-left:${24 + f.depth * 16}px"` : "";
                    html += `<div class="folder-item${active}" data-folder-id="${f.id}" title="${f.path}"${indent}>${f.name}</div>`;
                }
                html += '</div>';
            }
    
            if (collections.length > 0) {
                const cCollapsed = localStorage.getItem("sb-collections") === "1";
                html += '<h4 class="sb-section-header' + (cCollapsed ? " collapsed" : "") + '" data-section="sb-collections"><span class="sb-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></span> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg> ' + t("sidebar.collections") + '</h4>';
                html += '<div class="sb-section-content' + (cCollapsed ? " collapsed" : "") + '">';
                for (const c of collections) {
                    const active = P.activeCollectionId === c.id ? " active" : "";
                    const indent = c.depth > 0 ? ` style="padding-left:${24 + c.depth * 16}px"` : "";
                    const color = c.color || P.TAG_COLORS[Math.abs(P.fn.hashStr(c.name)) % P.TAG_COLORS.length];
                    const iconName = c.icon || "library";
                    html += `<div class="collection-item${active}" data-collection-id="${c.id}"${indent}><span class="tag-dot collection-dot" style="background:${color}"><i data-lucide="${iconName}"></i></span>${c.name} <span class="tag-count">${c.photo_count}</span></div>`;
                }
                html += '</div>';
            }
    
            if (tags.length > 0) {
                const tCollapsed = localStorage.getItem("sb-tags") === "1";
                html += '<h4 class="sb-section-header' + (tCollapsed ? " collapsed" : "") + '" data-section="sb-tags"><span class="sb-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg></span> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"></path><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"></circle></svg> ' + t("sidebar.tags") + '</h4>';
                html += '<div class="sb-section-content' + (tCollapsed ? " collapsed" : "") + '">';
                for (const t of tags) {
                    const active = P.activeTagId === t.id ? " active" : "";
                    const color = t.color || P.TAG_COLORS[Math.abs(P.fn.hashStr(t.name)) % P.TAG_COLORS.length];
                    html += `<div class="tag-item${active}" data-tag-id="${t.id}"><span class="tag-dot" style="background:${color}"></span>${t.name} <span class="tag-count">${t.photo_count}</span></div>`;
                }
                html += '</div>';
            }
    
            P.sidebarFilters.innerHTML = html;
            lucide.createIcons({ root: P.sidebarFilters });
    
            P.sidebarFilters.querySelectorAll(".sb-section-header").forEach(h => {
                h.addEventListener("click", () => {
                    const key = h.dataset.section;
                    const content = h.nextElementSibling;
                    const collapsed = h.classList.toggle("collapsed");
                    content.classList.toggle("collapsed", collapsed);
                    localStorage.setItem(key, collapsed ? "1" : "0");
                });
            });
    
            P.sidebarFilters.querySelectorAll(".folder-item").forEach(el => {
                el.addEventListener("click", () => {
                    const fid = el.dataset.folderId;
                    P.activeFolderId = fid === "all" ? null : parseInt(fid);
                    loadSidebar();
                    if (P.activeView === "locations") {
                        P.fn.fitMapToFolder();
                    } else {
                        P.fn.loadPhotos();
                    }
                });
            });
    
            const getItemLabel = (el) => {
                const clone = el.cloneNode(true);
                clone.querySelectorAll(".tag-count, .tag-dot").forEach(n => n.remove());
                return clone.textContent.replace(/\s+/g, " ").trim();
            };
    
            const bindDropTarget = (el) => {
                el.addEventListener("dragenter", (e) => {
                    if (!P.fn.isPhotoDnd(e)) return;
                    e.preventDefault();
                    el.classList.add("drop-target");
                });
                el.addEventListener("dragover", (e) => {
                    if (!P.fn.isPhotoDnd(e)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    el.classList.add("drop-target");
                });
                el.addEventListener("dragleave", (e) => {
                    if (el.contains(e.relatedTarget)) return;
                    el.classList.remove("drop-target");
                });
                el.addEventListener("drop", async (e) => {
                    if (!P.fn.isPhotoDnd(e)) return;
                    e.preventDefault();
                    el.classList.remove("drop-target");
                    const ids = P.fn.parsePhotoDnd(e);
                    if (ids.length === 0) return;
                    const tid = el.dataset.tagId ? parseInt(el.dataset.tagId) : null;
                    const cid = el.dataset.collectionId ? parseInt(el.dataset.collectionId) : null;
                    const res = (tid !== null)
                        ? await P.fn.api("POST", "/api/photos/bulk-tags", { photo_ids: ids, tag_id: tid })
                        : await P.fn.api("POST", "/api/photos/bulk-collections", { photo_ids: ids, collection_id: cid });
                    if (res && res.ok) {
                        const target = getItemLabel(el);
                        P.fn.showToast(t(tid !== null ? "toast.tagged" : "toast.added_to", { count: ids.length, target }), { icon: "check" });
                        loadSidebar();
                        if ((tid !== null && P.activeTagId === tid) || (cid !== null && P.activeCollectionId === cid)) {
                            if (P.activeView === "collections") P.fn.loadCollectionsBrowse();
                            else P.fn.loadPhotos();
                        }
                    } else {
                        P.fn.showToast((res && res.error) || "Failed to assign");
                    }
                });
            };
    
            P.sidebarFilters.querySelectorAll(".collection-item").forEach(el => {
                bindDropTarget(el);
                el.addEventListener("click", () => {
                    const cid = parseInt(el.dataset.collectionId);
                    P.activeCollectionId = P.activeCollectionId === cid ? null : cid;
                    loadSidebar();
                    if (P.activeView === "collections") {
                        P.fn.loadCollectionsBrowse();
                    } else {
                        P.fn.loadPhotos();
                    }
                });
            });
    
            P.sidebarFilters.querySelectorAll(".tag-item").forEach(el => {
                bindDropTarget(el);
                el.addEventListener("click", () => {
                    const tid = parseInt(el.dataset.tagId);
                    P.activeTagId = P.activeTagId === tid ? null : tid;
                    loadSidebar();
                    P.fn.loadPhotos();
                });
            });
        }
    
    
    // --- exports ---
        P.fn.loadSidebar = loadSidebar;
})(window.PhotoApp = window.PhotoApp || {});
