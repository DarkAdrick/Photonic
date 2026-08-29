// Photonic module: cleaning
(function (P) {
    const t = P.t;
        // ── Cleaning ─────────────────────────────────────────────────────────
    
        function togglePhotoSelect(id, cb) {
            if (cb.checked) {
                P.selectedIds.add(id);
            } else {
                P.selectedIds.delete(id);
            }
            P.fn.renderSelection();
        }
    
        function renderCleaningCards(photos, selectable) {
            for (const p of photos) {
                const card = document.createElement("div");
                card.className = "photo-card cleaning-card";
                card.dataset.photoId = p.id;
                card.title = p.filename;
                let extra = "";
                if (selectable) {
                    extra = `<div class="cleaning-check"><input type="checkbox" data-id="${p.id}"></div>`;
                }
                if (p.blur_score != null && p.blur_score < 15) {
                    extra += `<div class="cleaning-badge blur">Very blurry</div>`;
                } else if (p.blur_score != null && p.blur_score < 50) {
                    extra += `<div class="cleaning-badge blur">Blurry</div>`;
                }
                if (p.flags) {
                    if (p.flags.is_black) extra += `<div class="cleaning-badge bad">Black</div>`;
                    else if (p.flags.is_white) extra += `<div class="cleaning-badge bad">White</div>`;
                    else if (p.flags.is_underexposed) extra += `<div class="cleaning-badge bad">Underexposed</div>`;
                    else if (p.flags.is_overexposed) extra += `<div class="cleaning-badge bad">Overexposed</div>`;
                }
                card.innerHTML = extra +
                    `<img src="/api/photos/${p.id}/thumb/medium" alt="${p.filename}" loading="lazy">` +
                    `<div class="photo-label">${p.filename}</div>`;
                card.addEventListener("click", (e) => {
                    if (e.target.closest(".cleaning-check")) return;
                    P.fn.openDetail(p.id);
                });
                if (selectable) {
                    const cb = card.querySelector("input[type=checkbox]");
                    cb.addEventListener("change", () => togglePhotoSelect(p.id, cb));
                }
                P.photoGrid.appendChild(card);
            }
        }
    
        async function loadCleaningTab() {
            P.selectedIds.clear();
    
            P.cleaningTab = document.querySelector(".cleaning-tab.active")?.dataset.tab || "duplicates";
            P.fn.clearGrid();
            P.emptyState.classList.add("hidden");
            P.photoGrid.classList.remove("hidden");
    
            if (P.cleaningTab === "duplicates") {
                const data = await P.fn.api("GET", "/api/cleaning/duplicates");
                if (data.count === 0) {
                    P.photoCountH.textContent = t("cleaning.no_duplicates");
                    P.emptyState.classList.remove("hidden");
                    P.photoGrid.classList.add("hidden");
                    return;
                }
                P.photoCountH.textContent = t("cleaning.duplicates_count", { count: data.count, groups: data.groups.length });
                for (const group of data.groups) {
                    const sep = document.createElement("div");
                    sep.className = "cleaning-separator";
                    sep.innerHTML = `<span>${t("cleaning.identical_files", { count: group.length, size: (group[0].size / 1048576).toFixed(1) })}</span>`;
                    P.photoGrid.appendChild(sep);
                    renderCleaningCards(group, true);
                }
            } else if (P.cleaningTab === "blurry") {
                const data = await P.fn.api("GET", "/api/cleaning/blurry");
                if (data.count === 0) {
                    P.photoCountH.textContent = t("cleaning.no_blurry");
                    P.emptyState.classList.remove("hidden");
                    P.photoGrid.classList.add("hidden");
                    return;
                }
                P.photoCountH.textContent = t("cleaning.blurry_count", { count: data.count });
                renderCleaningCards(data.photos, true);
            } else if (P.cleaningTab === "similar") {
                const data = await P.fn.api("GET", "/api/cleaning/similar");
                if (data.count === 0) {
                    P.photoCountH.textContent = t("cleaning.no_similar");
                    P.emptyState.classList.remove("hidden");
                    P.photoGrid.classList.add("hidden");
                    return;
                }
                P.photoCountH.textContent = t("cleaning.similar_count", { count: data.count, groups: data.groups.length });
                for (const group of data.groups) {
                    const sep = document.createElement("div");
                    sep.className = "cleaning-separator";
                    sep.innerHTML = `<span>${t("cleaning.similar_sep", { count: group.length })}</span>`;
                    P.photoGrid.appendChild(sep);
                    renderCleaningCards(group, true);
                }
            } else if (P.cleaningTab === "bad") {
                const data = await P.fn.api("GET", "/api/cleaning/bad");
                if (data.count === 0) {
                    P.photoCountH.textContent = t("cleaning.no_bad");
                    P.emptyState.classList.remove("hidden");
                    P.photoGrid.classList.add("hidden");
                    return;
                }
                P.photoCountH.textContent = t("cleaning.bad_count", { count: data.count });
                renderCleaningCards(data.photos, true);
            }
        }
    
        let analyzePollTimer = null;
        async function startAnalysis() {
            P.btnAnalyze.disabled = true;
            P.cleaningStatus.classList.remove("hidden");
            P.cleaningStatus.textContent = t("cleaning.starting");
            await P.fn.api("POST", "/api/cleaning/analyze");
            pollAnalysis();
        }
    
        async function pollAnalysis() {
            const data = await P.fn.api("GET", "/api/cleaning/status");
            if (data.running) {
                const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
                P.cleaningStatus.textContent = `${data.phase} ${data.done}/${data.total} (${pct}%)`;
                analyzePollTimer = setTimeout(pollAnalysis, 1000);
            } else {
                P.cleaningStatus.classList.add("hidden");
                P.btnAnalyze.disabled = false;
                clearTimeout(analyzePollTimer);
                loadCleaningTab();
            }
        }
    
        async function deleteSelected() {
            if (P.selectedIds.size === 0) return;
            const ids = Array.from(P.selectedIds);
            await P.fn.api("POST", "/api/cleaning/delete", { ids });
            P.selectedIds.clear();
            P.fn.renderSelection();
            loadCleaningTab();
        }
    
        async function confirmDelete(ids) {
            const n = ids.length;
            const ok = await P.fn.showConfirm(
                n === 1 ? t("confirm.delete_photo") : t("confirm.delete_photos", { count: n }),
                n === 1 ? t("confirm.delete_photo_msg") : t("confirm.delete_photos_msg", { count: n }),
                t("confirm.delete")
            );
            if (!ok) return false;
            for (const id of ids) P.selectedIds.add(id);
            await P.fn.api("POST", "/api/cleaning/delete", { ids });
            P.selectedIds.clear();
            P.fn.renderSelection();
            P.fn.onFilterChange();
            return true;
        }
    
        async function removeTagsFromTargets(ids) {
            const ok = await P.fn.showConfirm(
                t("confirm.remove_all_tags_title", { count: ids.length }),
                t("confirm.remove_all_tags_msg"),
                t("context.remove_tags")
            );
            if (!ok) return;
            for (const id of ids) {
                const tags = await P.fn.api("GET", `/api/photos/${id}/tags`);
                if (Array.isArray(tags)) {
                    for (const t of tags) {
                        await P.fn.api("DELETE", `/api/photos/${id}/tags/${t.id}`);
                    }
                }
            }
            if (P.activeView === "tags") P.fn.loadTagsBrowse();
            P.fn.loadSidebar();
            P.fn.renderSelection();
        }
    
    
    // --- exports ---
        P.fn.loadCleaningTab = loadCleaningTab;
        P.fn.startAnalysis = startAnalysis;
        P.fn.confirmDelete = confirmDelete;
        P.fn.removeTagsFromTargets = removeTagsFromTargets;
})(window.PhotoApp = window.PhotoApp || {});
