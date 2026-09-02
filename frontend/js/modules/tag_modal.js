// Photonic module: tag_modal
(function (P) {
    const t = P.t;
        // ── Tag Modal ──────────────────────────────────────────────────────────
    
        async function openTagModal(photoId) {
            P.tagModalPhotoId = photoId;
            P.tagModalBatchIds = null;
            P.tagModalExistingTags = await P.fn.api("GET", "/api/tags");
            P.tagDialogTitle.textContent = t("tag_dialog.add_tag");
            P.tagInput.value = "";
            P.tagModalSelectedColor = P.TAG_COLORS[6];
            P.tagColorPicker.value = P.tagModalSelectedColor;
            P.tagColorHex.value = P.tagModalSelectedColor.toUpperCase();
    
            P.fn.renderColorPalette(P.tagColorPalette, P.tagModalSelectedColor, (c) => {
                P.tagModalSelectedColor = c;
                P.tagColorPicker.value = c;
                P.tagColorHex.value = c.toUpperCase();
            });
    
            P.tagColorPicker.addEventListener("input", onTagPickerInput);
            P.tagColorHex.addEventListener("input", onTagHexInput);
    
            setTagTab("existing");
            renderTagExistingList();
            P.tagDialog.classList.remove("hidden");
        }
    
        function setTagTab(tab) {
            const isNew = tab === "new";
            document.getElementById("tag-existing-list").hidden = isNew;
            document.getElementById("tag-create-section").hidden = !isNew;
            document.querySelectorAll("#tag-dialog-tabs .dialog-tab").forEach((b) => {
                b.classList.toggle("active", b.dataset.tab === tab);
            });
            P.tagDialogOk.classList.toggle("hidden", !isNew);
            P.tagDialogCancel.textContent = isNew ? t("confirm.cancel") : t("common.close");
            if (isNew) {
                P.tagInput.focus();
            } else {
                P.tagInput.blur();
            }
        }
    
        function onTagPickerInput(e) {
            P.tagModalSelectedColor = e.target.value;
            P.tagColorHex.value = e.target.value.toUpperCase();
            P.tagColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
        }
    
        function onTagHexInput(e) {
            let v = e.target.value.trim();
            if (!v.startsWith("#")) v = "#" + v;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                P.tagModalSelectedColor = v;
                P.tagColorPicker.value = v;
                P.tagColorPalette.querySelectorAll(".tag-color-swatch").forEach(s => s.classList.remove("active"));
            }
        }
    
        function renderTagExistingList() {
            let assignedNames = new Set();
            if (!P.tagModalBatchIds) {
                const photoTags = P.detailTags.querySelectorAll(".tag-pill:not(.tag-add)");
                assignedNames = new Set(Array.from(photoTags).map(p => p.textContent.trim().replace(" ✕", "")));
            }
            const filtered = P.tagModalExistingTags.filter(t => !assignedNames.has(t.name));
            if (filtered.length === 0) {
                P.tagExistingList.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);padding:4px">No more tags to add</div>';
                return;
            }
            P.tagExistingList.innerHTML = "";
            for (const t of filtered) {
                const el = document.createElement("div");
                el.className = "tag-existing-item";
                const color = t.color || P.TAG_COLORS[Math.abs(hashStr(t.name)) % P.TAG_COLORS.length];
                el.style.setProperty("--tag-color", color);
                el.innerHTML = t.name;
                el.addEventListener("click", async () => {
                    if (P.tagModalBatchIds) {
                        for (const pid of P.tagModalBatchIds) {
                            await P.fn.api("POST", `/api/photos/${pid}/tags`, { tag_id: t.id });
                        }
                    } else {
                        await P.fn.api("POST", `/api/photos/${P.tagModalPhotoId}/tags`, { tag_id: t.id });
                        await P.fn.loadDetail(P.tagModalPhotoId);
                    }
                    P.tagDialog.classList.add("hidden");
                    if (P.activeView === "tags") P.fn.loadTagsBrowse();
                    P.fn.loadSidebar();
                    P.fn.renderSelection();
                });
                P.tagExistingList.appendChild(el);
            }
        }
    
        function hexToRgb(hex) {
            const h = hex.replace("#", "");
            return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
        }
    
        function hashStr(s) {
            let h = 0;
            for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
            return h;
        }
    
        async function submitTagModal() {
            const name = P.tagInput.value.trim();
            if (!name) return;
    
            let existing = P.tagModalExistingTags.find(t => t.name.toLowerCase() === name.toLowerCase());
            if (!existing) {
                const color = P.tagModalSelectedColor;
                const res = await P.fn.api("POST", "/api/tags", { name, color });
                existing = { id: res.id, name, color };
            } else if (!existing.color) {
                await P.fn.api("PUT", `/api/tags/${existing.id}`, { color: P.tagModalSelectedColor });
            }
    
            const ids = P.tagModalBatchIds || [P.tagModalPhotoId];
            for (const pid of ids) {
                await P.fn.api("POST", `/api/photos/${pid}/tags`, { tag_id: existing.id });
            }
            P.tagDialog.classList.add("hidden");
            if (!P.tagModalBatchIds) await P.fn.loadDetail(P.tagModalPhotoId);
            if (P.activeView === "tags") P.fn.loadTagsBrowse();
            P.fn.loadSidebar();
            P.fn.renderSelection();
        }
    
        async function openTagModalBatch(photoIds) {
            P.tagModalBatchIds = photoIds;
            P.tagModalPhotoId = null;
            P.tagModalExistingTags = await P.fn.api("GET", "/api/tags");
            P.tagDialogTitle.textContent = t("tag_dialog.add_tag_to", { count: photoIds.length });
            P.tagInput.value = "";
            P.tagModalSelectedColor = P.TAG_COLORS[6];
            P.tagColorPicker.value = P.tagModalSelectedColor;
            P.tagColorHex.value = P.tagModalSelectedColor.toUpperCase();
    
            P.fn.renderColorPalette(P.tagColorPalette, P.tagModalSelectedColor, (c) => {
                P.tagModalSelectedColor = c;
                P.tagColorPicker.value = c;
                P.tagColorHex.value = c.toUpperCase();
            });
    
            P.tagColorPicker.addEventListener("input", onTagPickerInput);
            P.tagColorHex.addEventListener("input", onTagHexInput);
    
            setTagTab("existing");
            renderTagExistingList();
            P.tagDialog.classList.remove("hidden");
        }
    
        function closeTagModal() {
            P.tagColorPicker.removeEventListener("input", onTagPickerInput);
            P.tagColorHex.removeEventListener("input", onTagHexInput);
            P.tagDialog.classList.add("hidden");
        }
    
    
    // --- exports ---
        P.fn.openTagModal = openTagModal;
        P.fn.setTagTab = setTagTab;
        P.fn.hashStr = hashStr;
        P.fn.submitTagModal = submitTagModal;
        P.fn.openTagModalBatch = openTagModalBatch;
        P.fn.closeTagModal = closeTagModal;
})(window.PhotoApp = window.PhotoApp || {});
