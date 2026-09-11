// Photonic module: dialog
(function (P) {
    const t = P.t;
        // ── Dialog ────────────────────────────────────────────────────────────
    
        function openDialog() {
            if (window.Photonic && window.Photonic.isNative && window.Photonic.isNative()) {
                // Mobile: choose the folder with the native SAF picker instead of
                // the physical-path input used by the desktop app.
                if (window.__photonicPickingFolder) return;
                if (window.Photonic.pickFolder) {
                    window.__photonicPickingFolder = true;
                    const p = window.Photonic.pickFolder();
                    if (p && typeof p.finally === "function") p.finally(() => { window.__photonicPickingFolder = false; });
                    else window.__photonicPickingFolder = false;
                }
                return;
            }
            P.dialog.classList.remove("hidden");
            P.folderInput.value = "";
            P.folderInput.focus();
        }
    
        function closeDialog() {
            P.dialog.classList.add("hidden");
        }
    
        async function addFolder() {
            const path = P.folderInput.value.trim();
            if (!path) return;
            closeDialog();
            await P.fn.api("POST", "/api/folders", { path });
            await P.fn.loadSidebar();
            await P.fn.loadFilters();
            P.btnRescan.disabled = false;
            P.scanStatus.textContent = t("scan.starting");
            const res = await P.fn.api("POST", "/api/scan", { path });
            if (res.error === "scan_already_running") {
                P.scanStatus.textContent = t("scan.running_next");
                P.fn.pollScan();
                return;
            }
P.scanPollCount = 0;
            P.fn.pollScan();
            if (P.fn.openScanModal) P.fn.openScanModal();
        }

        async function rescanAll() {
            P.btnRescan.disabled = true;
            P.scanStatus.textContent = t("scan.starting");
            const res = await P.fn.api("POST", "/api/scan", { path: "all" });
            if (res.error === "scan_already_running") {
                P.scanStatus.textContent = t("scan.running");
                P.btnRescan.disabled = false;
                P.fn.pollScan();
                return;
            }
            P.scanPollCount = 0;
            P.fn.pollScan();
            if (P.fn.openScanModal) P.fn.openScanModal();
        }
    
    
    // --- exports ---
        P.fn.openDialog = openDialog;
        P.fn.closeDialog = closeDialog;
        P.fn.addFolder = addFolder;
        P.fn.rescanAll = rescanAll;
})(window.PhotoApp = window.PhotoApp || {});
