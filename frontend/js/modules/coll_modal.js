// Photonic module: coll_modal
(function (P) {
    const t = P.t;
        // ── Collection Modals ──────────────────────────────────────────────────
    
        async function openCollectionDialog(collection = null) {
            // Fetch all collections for parent selection
            const collections = await P.fn.api("GET", "/api/collections/tree");
            P.collectionParentSelect.innerHTML = '<option value="">(None)</option>';
            function recurseAdd(nodes) {
                for (const n of nodes) {
                    if (collection && collection.id === n.id) continue;
                    const opt = document.createElement("option");
                    opt.value = n.id;
                    opt.textContent = "   ".repeat(n.depth) + n.name;
                    P.collectionParentSelect.appendChild(opt);
                    if (n.children) recurseAdd(n.children);
                }
            }
            recurseAdd(collections);
    
            if (collection) {
                P.collectionDialogTitle.textContent = t("collection_dialog.edit");
                P.collectionInput.value = collection.name || "";
                P.collectionParentSelect.value = collection.parent_id || "";
                P.collectionModalSelectedColor = collection.color || P.TAG_COLORS[6];
                P.collectionDialogOk.dataset.id = collection.id;
            } else {
                P.collectionDialogTitle.textContent = P.pendingCollectionAssignIds ? t("collection_dialog.add_to") : t("collection_dialog.add");
                P.collectionInput.value = "";
                P.collectionParentSelect.value = "";
                P.collectionModalSelectedColor = P.TAG_COLORS[6];
                delete P.collectionDialogOk.dataset.id;
            }
    
            const assignMode = !collection && !!P.pendingCollectionAssignIds;
            document.getElementById("collection-dialog-tabs").hidden = !!collection;
            if (collection) {
                document.getElementById("collection-existing-section").hidden = true;
                document.getElementById("collection-create-section").hidden = false;
                P.collectionDialogOk.classList.remove("hidden");
                P.collectionDialogCancel.textContent = t("confirm.cancel");
            } else {
                setCollectionTab(assignMode ? "existing" : "new");
            }
    
            const currentIcon = (collection && collection.icon) ? collection.icon : "library";
            P.fn.renderIconPicker(P.collectionIconPicker, currentIcon, (name) => {
                P.fn.updateIconSelectedDisplay(name);
            });
            P.fn.updateIconSelectedDisplay(currentIcon);
            P.collectionColorPicker.value = P.collectionModalSelectedColor;
            P.collectionColorHex.value = P.collectionModalSelectedColor.toUpperCase();
    
            P.fn.renderColorPalette(P.collectionColorPalette, P.collectionModalSelectedColor, (c) => {
                P.collectionModalSelectedColor = c;
                P.collectionColorPicker.value = c;
                P.collectionColorHex.value = c.toUpperCase();
            });
    
            function onCollPickerInput(e) {
                P.collectionModalSelectedColor = e.target.value;
                P.collectionColorHex.value = e.target.value.toUpperCase();
                P.collectionColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
            }
            function onCollHexInput(e) {
                let v = e.target.value.trim();
                if (!v.startsWith("#")) v = "#" + v;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    P.collectionModalSelectedColor = v;
                    P.collectionColorPicker.value = v;
                    P.collectionColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
                }
            }
            P.collectionColorPicker.addEventListener("input", onCollPickerInput);
            P.collectionColorHex.addEventListener("input", onCollHexInput);
    
            P.collectionDialog.classList.remove("hidden");
            if (!assignMode) P.collectionInput.focus();
        }
    
        function setCollectionTab(tab) {
            const isExisting = tab === "existing";
            document.getElementById("collection-existing-section").hidden = !isExisting;
            document.getElementById("collection-create-section").hidden = isExisting;
            document.querySelectorAll("#collection-dialog-tabs .dialog-tab").forEach((b) => {
                b.classList.toggle("active", b.dataset.tab === tab);
            });
            P.collectionDialogOk.classList.toggle("hidden", isExisting);
            P.collectionDialogCancel.textContent = isExisting ? t("common.close") : t("confirm.cancel");
            if (isExisting) {
                P.collectionInput.blur();
            } else {
                P.collectionInput.focus();
            }
        }
    
        function onCollectionDialogCancel() {
            P.collectionDialog.classList.add("hidden");
            P.pendingCollectionAssignIds = null;
        }
    
        P.collectionDialogCancel.addEventListener("click", onCollectionDialogCancel);
        document.getElementById("collection-dialog-close").addEventListener("click", onCollectionDialogCancel);
        document.querySelectorAll("#collection-dialog-tabs .dialog-tab").forEach((btn) => {
            btn.addEventListener("click", () => setCollectionTab(btn.dataset.tab));
        });
    
        P.collectionDialogOk.addEventListener("click", async () => {
            const name = P.collectionInput.value.trim();
            if (!name) return;
            const payload = {
                name,
                color: P.collectionModalSelectedColor,
                icon: P.collectionIconInput.value.trim() || null,
                parent_id: P.collectionParentSelect.value ? parseInt(P.collectionParentSelect.value) : null
            };
            const id = P.collectionDialogOk.dataset.id;
            if (id) {
                await P.fn.api("PUT", `/api/collections/${id}`, payload);
            } else {
                const res = await P.fn.api("POST", "/api/collections", payload);
                if (res && res.ok && res.id && P.pendingCollectionAssignIds) {
                    for (const pid of P.pendingCollectionAssignIds) {
                        await P.fn.api("POST", `/api/photos/${pid}/collections`, { collection_id: res.id });
                    }
                    P.pendingCollectionAssignIds = null;
                }
            }
            P.collectionDialog.classList.add("hidden");
            P.fn.loadSidebar();
            if (P.activeView === "collections") P.fn.loadCollectionsBrowse();
            if (P.collectionModalPhotoId != null) await P.fn.loadDetail(P.collectionModalPhotoId);
            if (!P.settingsPage.classList.contains("hidden")) {
                const activeSection = P.settingsPageNav.querySelector(".settings-nav-item.active");
                if (activeSection) {
                    const target = activeSection.dataset.section;
                    if (target === "settings-tags-p") P.fn.loadSettingsTags();
                    else if (target === "settings-collections-p") P.fn.loadSettingsCollections();
                    else if (target === "settings-folders-p") P.fn.loadSettingsFolders();
                }
            }
        });
    
        async function openCollectionModal(photoId) {
            P.collectionModalPhotoId = photoId;
            P.collectionModalBatchIds = null;
            P.pendingCollectionAssignIds = [photoId];
            await openAssignCollectionsDialog();
        }
    
        async function openCollectionModalBatch(photoIds) {
            P.collectionModalBatchIds = photoIds;
            P.collectionModalPhotoId = null;
            P.pendingCollectionAssignIds = photoIds;
            await openAssignCollectionsDialog();
        }
    
        async function openAssignCollectionsDialog() {
            P.collectionModalExistingCollections = await P.fn.api("GET", "/api/collections");
            renderCollectionExistingList();
            await openCollectionDialog();
        }
    
        function renderCollectionExistingList() {
            if (P.collectionModalExistingCollections.length === 0) {
                P.collectionExistingList.innerHTML = `<div style="font-size:12px;color:var(--text-secondary);padding:4px">${t("collections.none_found")}</div>`;
                return;
            }
            P.collectionExistingList.innerHTML = "";
            for (const c of P.collectionModalExistingCollections) {
                const el = document.createElement("div");
                el.className = "tag-existing-item";
                const color = c.color || P.TAG_COLORS[Math.abs(P.fn.hashStr(c.name)) % P.TAG_COLORS.length];
                el.style.setProperty("--tag-color", color);
                el.innerHTML = c.name;
                el.addEventListener("click", async () => {
                    const ids = P.pendingCollectionAssignIds || [];
                    for (const pid of ids) {
                        await P.fn.api("POST", `/api/photos/${pid}/collections`, { collection_id: c.id });
                    }
                    P.pendingCollectionAssignIds = null;
                    P.collectionDialog.classList.add("hidden");
                    if (P.activeView === "collections") P.fn.loadCollectionsBrowse();
                    P.fn.loadSidebar();
                    P.fn.renderSelection();
                    if (P.collectionModalPhotoId != null) await P.fn.loadDetail(P.collectionModalPhotoId);
                });
                P.collectionExistingList.appendChild(el);
            }
        }
    
        async function removeCollectionsFromTargets(targets) {
            const collections = await P.fn.api("GET", "/api/collections");
            if (collections.length === 0) return;
            
            let html = `<div style="padding: 10px;">${t("collection_dialog.select_to_remove")}</div><div class="tag-existing-list">`;
            for (const c of collections) {
                const color = c.color || P.TAG_COLORS[Math.abs(P.fn.hashStr(c.name)) % P.TAG_COLORS.length];
                html += `<div class="tag-existing-item" data-id="${c.id}" style="--tag-color: ${color}">${c.name}</div>`;
            }
            html += '</div>';
    
            const confirmDialogWrapper = document.getElementById("confirm-dialog");
            document.getElementById("confirm-title").textContent = t("collection_dialog.remove_title");
            document.getElementById("confirm-message").innerHTML = html;
            document.getElementById("confirm-ok").classList.add("hidden"); // We will just use the list
            document.getElementById("confirm-cancel").textContent = t("common.close");
            confirmDialogWrapper.classList.remove("hidden");
    
            const listItems = confirmDialogWrapper.querySelectorAll(".tag-existing-item");
            listItems.forEach(el => {
                el.addEventListener("click", async () => {
                    const cid = parseInt(el.dataset.id);
                    for (const id of targets) {
                        await P.fn.api("DELETE", `/api/photos/${id}/collections/${cid}`);
                    }
                    confirmDialogWrapper.classList.add("hidden");
                    document.getElementById("confirm-ok").classList.remove("hidden");
                    if (P.activeView === "collections") P.fn.loadCollectionsBrowse();
                    P.fn.loadSidebar();
                });
            });
        }
    
    
    // --- exports ---
        P.fn.openCollectionDialog = openCollectionDialog;
        P.fn.openCollectionModal = openCollectionModal;
        P.fn.openCollectionModalBatch = openCollectionModalBatch;
        P.fn.removeCollectionsFromTargets = removeCollectionsFromTargets;
})(window.PhotoApp = window.PhotoApp || {});
