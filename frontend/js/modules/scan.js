// Photonic module: scan
(function (P) {
    const t = P.t;

        // ── Scan detail modal ────────────────────────────────────────────────

        const scanModal = document.getElementById("scan-detail-modal");
        const scanDetailPct = document.getElementById("scan-detail-pct");
        const scanModalFill = document.getElementById("scan-modal-fill");
        const scanDetailFolder = document.getElementById("scan-detail-folder");
        const scanDetailFile = document.getElementById("scan-detail-file");
        const scanDetailStats = document.getElementById("scan-detail-stats");
        const scanLogEl = document.getElementById("scan-log");

        function openScanModal() {
            if (scanModal) scanModal.classList.remove("hidden");
            lucide.createIcons({ root: scanModal });
        }

        function closeScanModal() {
            if (scanModal) scanModal.classList.add("hidden");
        }

        if (P.scanProgress) P.scanProgress.addEventListener("click", (e) => {
            if (e.target.closest("#btn-scan-cancel")) return;
            e.stopPropagation();
            openScanModal();
        });
        const btnScanDetailClose = document.getElementById("scan-detail-close");
        if (btnScanDetailClose) btnScanDetailClose.addEventListener("click", closeScanModal);
        if (scanModal) scanModal.addEventListener("click", (e) => { if (e.target === scanModal) closeScanModal(); });
        const btnScanCancelModal = document.getElementById("btn-scan-cancel-modal");
        if (btnScanCancelModal) btnScanCancelModal.addEventListener("click", async () => {
            btnScanCancelModal.disabled = true;
            await P.fn.api("POST", "/api/scan/cancel");
            btnScanCancelModal.disabled = false;
            closeScanModal();
        });

        function baseName(p) {
            if (!p) return "";
            const parts = String(p).split(/[\\/]/);
            return parts[parts.length - 1] || p;
        }

        function addLogItem(name, isIndexed) {
            if (!scanLogEl) return;
            const item = document.createElement("div");
            item.className = "scan-log-item " + (isIndexed ? "scan-log-indexed" : "scan-log-skipped");
            const icon = document.createElement("span");
            icon.className = "scan-log-icon";
            icon.textContent = isIndexed ? "✓" : "–";
            const text = document.createElement("span");
            text.textContent = name;
            item.appendChild(icon);
            item.appendChild(text);
            scanLogEl.prepend(item);
        }

        function updateScanModal(data) {
            if (!scanModal) return;
            const total = data.total || 0;
            const pct = total > 0 ? Math.round((data.done / total) * 100) : 0;
            if (scanDetailPct) scanDetailPct.textContent = pct + "%";
            if (scanModalFill) scanModalFill.style.width = pct + "%";
            if (scanDetailFolder) {
                const folder = data.folder === "all" ? t("scan.all_folders") : (data.folder || "");
                scanDetailFolder.textContent = folder;
                scanDetailFolder.title = folder;
            }
            if (scanDetailFile) {
                scanDetailFile.textContent = data.active_file ? baseName(data.active_file) : "";
                scanDetailFile.title = data.active_file || "";
            }
            if (scanDetailStats) {
                scanDetailStats.textContent = t("scan.stats_text", {
                    indexed: (data.indexed || 0).toLocaleString(P.locale()),
                    skipped: (data.skipped || 0).toLocaleString(P.locale()),
                });
            }
            if (scanLogEl && Array.isArray(data.logs) && data.logs.length > 0) {
                scanLogEl.innerHTML = "";
                const logs = data.logs.slice().reverse();
                for (const entry of logs) {
                    addLogItem(baseName(entry.f || ""), (entry.a || "") === "indexed");
                }
            }
        }

        // ── Scan polling ──────────────────────────────────────────────────────

        async function pollScan() {
            if (P.scanPolling) return;
            P.scanPolling = true;
            pollScanLoop();
        }

        async function pollScanLoop() {
            let data;
            try {
                data = await P.fn.api("GET", "/api/scan/status");
            } catch (e) {
                setTimeout(pollScanLoop, 2000);
                return;
            }
            if (data.running && data.total > 0) {
                const pct = Math.round((data.done / data.total) * 100);
                P.scanProgress.classList.remove("hidden");
                P.scanFill.style.width = pct + "%";
                P.scanStatus.textContent = data.cancel
                    ? t("scan.cancelling", { done: data.done.toLocaleString(P.locale()), total: data.total.toLocaleString(P.locale()) })
                    : t("scan.progress", { done: data.done.toLocaleString(P.locale()), total: data.total.toLocaleString(P.locale()), pct: pct });
                P.btnRescan.disabled = true;
                if (P.btnScanCancel) P.btnScanCancel.classList.toggle("hidden", !!data.cancel);
                updateScanModal(data);
                P.scanPollCount++;
                const now = Date.now();
                if (now - P.lastScanRefresh >= 5000) {
                    P.lastScanRefresh = now;
                    try {
                        await P.fn.loadFilters();
                        await P.fn.checkStatus();
                    } catch (e) { /* non-fatal */ }
                }
                setTimeout(pollScanLoop, 500);
            } else if (data.running) {
                P.scanProgress.classList.remove("hidden");
                P.scanFill.style.width = "0%";
                P.scanStatus.textContent = t("scan.preparing");
                P.btnRescan.disabled = true;
                if (P.btnScanCancel) P.btnScanCancel.classList.remove("hidden");
                updateScanModal(data);
                setTimeout(pollScanLoop, 500);
            } else {
                P.scanPollCount = 0;
                P.lastScanRefresh = 0;
                P.scanProgress.classList.add("hidden");
                if (P.btnScanCancel) P.btnScanCancel.classList.add("hidden");
                P.scanFill.style.width = "0%";
                P.scanStatus.textContent = data.cancelled ? t("scan.cancelled") : "";
                if (data.cancelled) setTimeout(() => { if (!P.scanStatus.textContent.startsWith(t("scan.starting"))) P.scanStatus.textContent = ""; }, 4000);
                P.btnRescan.disabled = false;
                closeScanModal();
                document.querySelectorAll(".settings-row-btn.scan").forEach(btn => {
                    btn.disabled = false;
                    btn.querySelector("svg")?.classList.remove("spinning");
                });
                try {
                    P.fn.onFilterChange();
                    await P.fn.loadSidebar();
                    await P.fn.loadFilters();
                    await P.fn.checkStatus();
                } catch (e) { /* keep flag clear even if refresh fails */ }
                P.scanPolling = false;
            }
        }


    // --- exports ---
        P.fn.pollScan = pollScan;
        P.fn.openScanModal = openScanModal;
        P.fn.closeScanModal = closeScanModal;
})(window.PhotoApp = window.PhotoApp || {});