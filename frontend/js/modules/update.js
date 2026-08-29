// Photonic module: update
(function (P) {
    const t = P.t;
        // ── Update checker (GitHub releases) ─────────────────────────────────
    
         P.RELEASES_PAGE = "https://github.com/DarkAdrick/Photonic/releases";
        const updatePill = document.getElementById("update-pill");
         P.lastUpdateState = null;
    
        function lastCheckLabel(data) {
            if (!data || !data.checked_at) return "";
            const d = new Date(data.checked_at);
            const s = P.fn.formatDateTime(d);
            return s ? `<span class="update-last-check">${t("update.last_check", { s })}</span>` : "";
        }
    
        function describeUpdateState(data) {
            if (!data) return t("update.not_checked");
            if (data.update_available) return t("update.new_available", { v: `v${data.latest_version}` }) + lastCheckLabel(data);
            if (data.error) return t("update.check_failed") + lastCheckLabel(data);
            if (data.checked_at) return t("update.up_to_date") + lastCheckLabel(data);
            return t("update.not_checked") + lastCheckLabel(data);
        }
    
        function applyUpdateState(data, notify) {
            P.lastUpdateState = data;
            if (data && data.update_available && data.latest_version) {
                updatePill.classList.remove("hidden");
                updatePill.href = data.release_url || P.RELEASES_PAGE;
                updatePill.title = t("update.new_available_title", { v: `v${data.latest_version}` });
                updatePill.querySelector("#update-pill-text").textContent = "v" + data.latest_version;
                lucide.createIcons();
                if (notify) {
                    P.fn.showToast(
                        t("update.view_release_toast", { v: `v${data.latest_version}`, url: data.release_url || P.RELEASES_PAGE }),
                        { icon: "arrow-up-circle", duration: 12000 }
                    );
                }
            } else {
                updatePill.classList.add("hidden");
            }
            refreshUpdateSettingsCard();
        }
    
        function refreshUpdateSettingsCard() {
            const label = document.getElementById("setting-update-status");
            if (label) label.innerHTML = describeUpdateState(P.lastUpdateState);
        }
    
        async function initUpdateChecker() {
            // Poll until the backend has completed its startup GitHub check,
            // so the badge appears on first load without requiring a refresh.
            const deadline = Date.now() + 30000;
            while (Date.now() < deadline) {
                try {
                    const data = await P.fn.api("GET", "/api/update/status");
                    if (data.checked_at) {
                        applyUpdateState(data, true);
                        return;
                    }
                } catch { /* offline or older backend — stay silent */ }
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    
        // ── Changelog ───────────────────────────────────────────────────────
    
        const changelogDialog = document.getElementById("changelog-dialog");
        const changelogClose  = document.getElementById("changelog-close");
        const changelogBody   = document.getElementById("changelog-body");
         P.versionBadge    = document.getElementById("version-badge");
    
        async function loadChangelog() {
            const data = await P.fn.api("GET", "/api/changelog");
            if (data.html) changelogBody.innerHTML = data.html;
        }
    
        // ── Credits drawer (scrolling supporters & contributors) ──────────
    
        const clCreditsDrawer = document.getElementById("cl-credits");
        const clSponsorsSection = document.getElementById("cl-credits-section-sponsors");
        const clSponsorsTrack   = document.getElementById("cl-credits-sponsors");
        const clThanksSection   = document.getElementById("cl-credits-section-thanks");
        const clThanksTrack     = document.getElementById("cl-credits-thanks-track");
        const creditsAnims      = [];
        const CREDIT_SPEED  = 0.45; // px per frame at ~60fps
    
        // build a single credit row: name (optionally linked) + optional reason
        function buildCreditRow(entry) {
            const row = document.createElement("div");
            row.className = "cl-credits-thanks-item";
            const nameEl = document.createElement(entry && entry.url ? "a" : "span");
            nameEl.className = "cl-credits-name";
            nameEl.textContent = (entry && entry.name) || "";
            if (entry && entry.url) {
                nameEl.href = entry.url;
                nameEl.target = "_blank";
                nameEl.rel = "noopener";
                row.classList.add("cl-credits-item-link");
            }
            row.appendChild(nameEl);
            if (entry && entry.reason) {
                const reasonEl = document.createElement("span");
                reasonEl.className = "cl-credits-thanks-reason";
                reasonEl.textContent = entry.reason;
                row.appendChild(reasonEl);
            }
            return row;
        }
    
        function scrollCredits(track, rows) {
            track.innerHTML = "";
            if (!rows || rows.length === 0) { track.style.transform = "translateY(0px)"; return; }
    
            const viewport = track.parentElement;
            const viewportH = viewport.clientHeight || 200;
            const count = rows.length;
    
            // measure the packed block of names (natural gap from .cl-credits-track)
            track.append(...rows);
            const rowH = Math.max(16, rows[0].offsetHeight);
            const blockHeight = track.offsetHeight || (count * (rowH + 8));
            track.innerHTML = "";
    
            // one loop unit = packed block of names + a FULL blank screen afterwards.
            // When the last credit exits the top, a whole empty screen scrolls by,
            // and only then the first name re-enters from the bottom.
            rows.forEach(r => track.appendChild(r));
            const spacer = document.createElement("div");
            spacer.style.height = Math.floor(viewportH) + "px";
            spacer.style.flexShrink = "0";
            track.appendChild(spacer);
            const unitH = track.offsetHeight || Math.max(blockHeight + viewportH, viewportH);
            const oneUnit = track.innerHTML;
    
            const copies = Math.max(2, Math.ceil((viewportH + unitH) / unitH));
            for (let i = 1; i < copies; i++) track.innerHTML += oneUnit;
    
            stopCredits(track);
            // start with the first row at the bottom edge, rise one full unit,
            // then the (identical) next copy takes over seamlessly
            const startY = viewportH - rowH;
            const endY   = startY - unitH;
            const state = { track, y: startY, startY, endY, paused: false, handle: null };
            state.handle = setInterval(() => stepCredit(state), 16);
            creditsAnims.push(state);
    
            // pause while hovering so links can be clicked comfortably
            viewport.addEventListener("mouseenter", () => { if (!state.paused) { state.paused = true; clearInterval(state.handle); } });
            viewport.addEventListener("mouseleave", () => {
                if (state.paused) { state.paused = false; state.handle = setInterval(() => stepCredit(state), 16); }
            });
        }
    
        function stepCredit(a) {
            a.y -= CREDIT_SPEED;
            if (a.y <= a.endY) a.y = a.startY;
            a.track.style.transform = `translateY(${a.y}px)`;
        }
    
        function stopCredits(track) {
            for (let i = creditsAnims.length - 1; i >= 0; i--) {
                const a = creditsAnims[i];
                if (!track || a.track === track) {
                    clearInterval(a.handle);
                    creditsAnims.splice(i, 1);
                }
            }
            if (track) track.style.transform = "translateY(0px)";
        }
    
        function stopAllCredits() {
            while (creditsAnims.length) {
                const a = creditsAnims.pop();
                clearInterval(a.handle);
                a.track.style.transform = "translateY(0px)";
            }
        }
    
        function fillCredits({ names, thanks }) {
            stopAllCredits();
    
            // sponsors (GitHub + manual credits.json)
            const sponsorRows = (names || []).map(n => buildCreditRow(n));
            if (sponsorRows.length) clSponsorsSection.classList.remove("hidden");
            else clSponsorsSection.classList.add("hidden");
            scrollCredits(clSponsorsTrack, sponsorRows);
    
            // contributors (thanks from credits.json / manual)
            const thanksRows = (thanks || []).map(t => buildCreditRow(t));
            if (thanksRows.length) clThanksSection.classList.remove("hidden");
            else clThanksSection.classList.add("hidden");
            scrollCredits(clThanksTrack, thanksRows);
    
            // hide the whole drawer if nothing to show
            if (sponsorRows.length === 0 && thanksRows.length === 0) clCreditsDrawer.classList.add("hidden");
            else clCreditsDrawer.classList.remove("hidden");
    
            lucide.createIcons();
        }
    
        async function loadCredits(retries = 5) {
            const data = await P.fn.api("GET", "/api/sponsors");
            const names  = data.sponsors || [];
            const thanks = data.thanks || [];
            // local credits.json returns immediately; keep a short poll so the
            // GitHub public-login merge can arrive and start the animation too
            if (names.length === 0 && thanks.length === 0 && retries > 0) {
                await new Promise(r => setTimeout(r, 500));
                return loadCredits(retries - 1);
            }
            return { names, thanks };
        }
    
        async function openChangelog() {
            await loadChangelog();
            changelogDialog.classList.remove("hidden");
            lucide.createIcons();
            try {
                const data = await loadCredits();
                fillCredits(data);
            } catch {
                clCreditsDrawer.classList.add("hidden");
            }
        }
        P.versionBadge.addEventListener("click", openChangelog);
        changelogClose.addEventListener("click", () => { stopAllCredits(); changelogDialog.classList.add("hidden"); });
        changelogDialog.addEventListener("click", (e) => { if (e.target === changelogDialog) { stopAllCredits(); changelogDialog.classList.add("hidden"); } });
    
    
    // --- exports ---
        P.fn.applyUpdateState = applyUpdateState;
        P.fn.describeUpdateState = describeUpdateState;
        P.fn.initUpdateChecker = initUpdateChecker;
        P.fn.openChangelog = openChangelog;
})(window.PhotoApp = window.PhotoApp || {});
