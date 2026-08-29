// Photonic module: stats
(function (P) {
    const t = P.t;
        // ── Stats ─────────────────────────────────────────────────────────────
    
        let statsChartFormat = null;
        let statsChartTimeline = null;
        let statsChartCountries = null;
    
        function formatBytes(bytes) {
            if (bytes < 1024) return bytes + " B";
            if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
            if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
            return (bytes / 1073741824).toFixed(2) + " GB";
        }
    
        function formatSizeShort(bytes) {
            if (bytes < 1073741824) return (bytes / 1048576).toFixed(0) + " MB";
            return (bytes / 1073741824).toFixed(1) + " GB";
        }
    
        async function loadStats() {
            const d = await P.fn.api("GET", "/api/stats");
            if (statsChartFormat) { statsChartFormat.destroy(); statsChartFormat = null; }
            if (statsChartTimeline) { statsChartTimeline.destroy(); statsChartTimeline = null; }
            if (statsChartCountries) { statsChartCountries.destroy(); statsChartCountries = null; }
    
            const geoPct = d.geo_total > 0 ? ((d.geo_count / d.geo_total) * 100).toFixed(1) : 0;
    
            P.statsView.innerHTML = `
                <div class="stats-summary">
                    <div class="stat-card">
                        <div class="stat-value">${d.total_photos.toLocaleString()}</div>
                        <div class="stat-label">${t("stats.photos")}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatSizeShort(d.total_size)}</div>
                        <div class="stat-label">${t("stats.total_size")}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${d.geo_count.toLocaleString()} / ${d.geo_total.toLocaleString()}</div>
                        <div class="stat-label">${t("stats.geolocalized", { pct: geoPct })}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${d.formats.length}</div>
                        <div class="stat-label">${t("stats.formats")}</div>
                    </div>
                </div>
                <div class="stats-charts">
                    <div class="stats-chart-box">
                        <h4>${t("stats.formats")}</h4>
                        <canvas id="chart-format"></canvas>
                    </div>
                    <div class="stats-chart-box">
                        <h4>${t("stats.top_countries")}</h4>
                        <canvas id="chart-countries"></canvas>
                    </div>
                    <div class="stats-chart-box stats-chart-wide">
                        <h4>${t("stats.photos_over_time")}</h4>
                        <canvas id="chart-timeline"></canvas>
                    </div>
                </div>
            `;
    
            const extColors = [
                "#5b9fd6","#e74c3c","#2ecc71","#f1c40f","#9b59b6",
                "#e67e22","#1abc9c","#e84393","#00cec9","#636e72",
                "#fd79a8","#74b9ff","#55efc4","#fab1a0","#a29bfe",
            ];
    
            const fmtCtx = document.getElementById("chart-format");
            if (fmtCtx) {
                statsChartFormat = new Chart(fmtCtx, {
                    type: "doughnut",
                    data: {
                        labels: d.formats.map(f => f.ext.toUpperCase()),
                        datasets: [{
                            data: d.formats.map(f => f.count),
                            backgroundColor: d.formats.map((_, i) => extColors[i % extColors.length]),
                            borderWidth: 0,
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: "right", labels: { color: "#888", font: { size: 11 }, padding: 8, boxWidth: 14 } },
                            tooltip: {
                                callbacks: {
                                    label: function(ctx) {
                                        const f = d.formats[ctx.dataIndex];
                                        return ` ${t("stats.files_with_size", { count: f.count.toLocaleString(), size: formatSizeShort(f.size) })}`;
                                    }
                                }
                            }
                        },
                    },
                });
            }
    
            const timeCtx = document.getElementById("chart-timeline");
            if (timeCtx && d.timeline.length > 0) {
                const months = d.timeline.map(t => t.month);
                const counts = d.timeline.map(t => t.count);
                let cumulative = [];
                let sum = 0;
                for (const c of counts) { sum += c; cumulative.push(sum); }
    
                statsChartTimeline = new Chart(timeCtx, {
                    type: "line",
                    data: {
                        labels: months,
                        datasets: [
                            {
                                label: t("stats.monthly"),
                                data: counts,
                                borderColor: "#5b9fd6",
                                backgroundColor: "rgba(91,159,214,0.15)",
                                fill: true,
                                tension: 0.3,
                                pointRadius: 1,
                                borderWidth: 2,
                            },
                            {
                                label: t("stats.cumulative"),
                                data: cumulative,
                                borderColor: "#2ecc71",
                                borderDash: [4, 3],
                                fill: false,
                                tension: 0.3,
                                pointRadius: 0,
                                borderWidth: 1.5,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: "index", intersect: false },
                        scales: {
                            x: { ticks: { color: "#666", maxRotation: 45, font: { size: 10 }, maxTicksLimit: 24 }, grid: { color: "rgba(255,255,255,0.04)" } },
                            y: { ticks: { color: "#666", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
                        },
                        plugins: { legend: { labels: { color: "#888", font: { size: 11 } } } },
                    },
                });
            }
    
            const ctryCtx = document.getElementById("chart-countries");
            if (ctryCtx && d.countries.length > 0) {
                statsChartCountries = new Chart(ctryCtx, {
                    type: "bar",
                    data: {
                        labels: d.countries.map(c => c.name),
                        datasets: [{
                            data: d.countries.map(c => c.count),
                            backgroundColor: d.countries.map((_, i) => extColors[i % extColors.length] + "cc"),
                            borderWidth: 0,
                            borderRadius: 3,
                        }],
                    },
                    options: {
                        indexAxis: "y",
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { ticks: { color: "#666", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
                            y: { ticks: { color: "#aaa", font: { size: 11 }, cursor: "pointer" }, grid: { display: false } },
                        },
                        plugins: { legend: { display: false } },
                        onClick(e, elements) {
                            if (elements.length === 0) return;
                            const idx = elements[0].index;
                            const code = d.countries[idx]?.code;
                            if (!code) return;
                            P.activeCountryCode = code;
                            P.fn.setView("countries");
                        },
                    },
                });
            }
    
            P.photoCountH.textContent = t("stats.title");
        }
    
    
    // --- exports ---
        P.fn.loadStats = loadStats;
})(window.PhotoApp = window.PhotoApp || {});
