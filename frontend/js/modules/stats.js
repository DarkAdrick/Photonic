import { api } from './api.js';

let statsChartFormat = null;
let statsChartTimeline = null;
let statsChartCountries = null;

function formatSizeShort(bytes) {
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(0) + " MB";
    return (bytes / 1073741824).toFixed(1) + " GB";
}

export function initStats(context) {
    const { statsView, photoCountH } = context;

    async function loadStats() {
        const d = await api("GET", "/api/stats");
        if (statsChartFormat) { statsChartFormat.destroy(); statsChartFormat = null; }
        if (statsChartTimeline) { statsChartTimeline.destroy(); statsChartTimeline = null; }
        if (statsChartCountries) { statsChartCountries.destroy(); statsChartCountries = null; }

        const geoPct = d.geo_total > 0 ? ((d.geo_count / d.geo_total) * 100).toFixed(1) : 0;

        statsView.innerHTML = `
            <div class="stats-summary">
                <div class="stat-card">
                    <div class="stat-value">${d.total_photos.toLocaleString()}</div>
                    <div class="stat-label">Photos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatSizeShort(d.total_size)}</div>
                    <div class="stat-label">Total Size</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${d.geo_count.toLocaleString()} / ${d.geo_total.toLocaleString()}</div>
                    <div class="stat-label">Geolocalized (${geoPct}%)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${d.count_360.toLocaleString()}</div>
                    <div class="stat-label">Photos 360°</div>
                </div>
            </div>
            <div class="stats-charts">
                <div class="stats-chart-box">
                    <h4>Formats</h4>
                    <canvas id="chart-format"></canvas>
                </div>
                <div class="stats-chart-box">
                    <h4>Top Countries</h4>
                    <canvas id="chart-countries"></canvas>
                </div>
                <div class="stats-chart-box stats-chart-wide">
                    <h4>Photos over time</h4>
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
                                    return ` ${f.count.toLocaleString()} files (${formatSizeShort(f.size)})`;
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
                            label: "Monthly",
                            data: counts,
                            borderColor: "#5b9fd6",
                            backgroundColor: "rgba(91,159,214,0.15)",
                            fill: true,
                            tension: 0.3,
                            pointRadius: 1,
                            borderWidth: 2,
                        },
                        {
                            label: "Cumulative",
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
                        context.setActiveCountryCode(code);
                        context.setView("countries");
                    },
                },
            });
        }

        photoCountH.textContent = "Statistics";
    }

    return { loadStats };
}
