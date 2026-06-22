import { DataService } from '../services/dataService.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { showLoader } from '../shared/loader.js';

// page state 
let currentView = 'graph';            
let leaderboardMetric = 'body_weight'; 
let volumeRange = 8;                   
let heatmapRange = 8;                  
let selectedTraineeId = null;          
let trainerId = null;

const charts = {};   
const store = {};    
const CARD_KEYS = ['atRisk', 'attendance', 'leaderboard', 'volume', 'heatmap'];

const GREEN = '#00800F';
const RED = '#C0392B';
const MUTED = '#999999';
const hasChart = () => typeof Chart !== 'undefined';

// For the leaderboard: an "improvement" depends on the metric. Body-weight goes
// DOWN (weight loss) so a negative pct_change is good; strength goes UP.
// Returns true (good), false (regressed), or null (no/!numeric change).
function isImprovement(metric, pct) {
    const n = Number(pct);
    if (pct == null || isNaN(n) || n === 0) return null;
    return metric === 'body_weight' ? n < 0 : n > 0;
}

//  tiny DOM helpers 
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

function bodyOf(key) { return document.getElementById(`body_${key}`); }

// Destroys a card's chart so we can safely redraw it later.
function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

// Empties a card's body (and kills its chart) before re-rendering it.
function resetBody(key) {
    destroyChart(key);
    const b = bodyOf(key);
    if (b) b.innerHTML = '';
    return b;
}

// Builds a table from a list of headers and rows. Cells can be plain text or DOM nodes.
function makeTable(headers, rows) {
    const table = el('table', 'analytics-table');
    const thead = document.createElement('thead');
    const htr = document.createElement('tr');
    headers.forEach(h => htr.appendChild(el('th', null, h)));
    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(cells => {
        const tr = document.createElement('tr');
        cells.forEach(c => {
            const td = document.createElement('td');
            if (c instanceof Node) td.appendChild(c);
            else td.textContent = c;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
}

// Makes the wrapper div + <canvas> that a Chart.js chart gets drawn into.
function chartWrap() {
    const wrap = el('div', 'analytics-chart-wrap');
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    return { wrap, canvas };
}

function note(text) { return el('p', 'analytics-note', text); }

// ---- formatters ----
function fmtDate(v) {
    if (!v) return '—';
    const d = new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleDateString();
}
function fmtNum(v) { return v == null ? '—' : String(v); }
function fmtPct(v) {
    if (v == null) return '—';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}
// Parses an ISO week token like "2026-W13" into { year, week }.
function parseIsoWeek(token) {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(String(token));
    return m ? { year: Number(m[1]), week: Number(m[2]) } : null;
}
// Works out the Monday date for a given ISO year + week number.
function isoWeekMonday(year, week) {
    // ISO-8601: week 1 contains Jan 4th; weeks start on Monday.
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Dow = (jan4.getUTCDay() + 6) % 7; // 0=Mon … 6=Sun
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - jan4Dow + (week - 1) * 7);
    return monday;
}
function fmtMonD(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
// "2026-W13" -> "Mar 23" (Monday of that ISO week); falls back to the raw token
function weekLabel(token) {
    const p = parseIsoWeek(token);
    return p ? fmtMonD(isoWeekMonday(p.year, p.week)) : String(token);
}
// "2026-W13" -> "Mar 23 – Mar 29" (Mon–Sun) for tooltips
function weekRange(token) {
    const p = parseIsoWeek(token);
    if (!p) return String(token);
    const mon = isoWeekMonday(p.year, p.week);
    const sun = new Date(mon);
    sun.setUTCDate(mon.getUTCDate() + 6);
    return `${fmtMonD(mon)} – ${fmtMonD(sun)}`;
}
function fmtThousands(n) {
    const x = Number(n);
    return isNaN(x) ? String(n) : x.toLocaleString('en-US');
}
function sliceLastN(arr, range) {
    return range === 'all' ? arr.slice() : arr.slice(-range);
}
// Picks a green shade for a heatmap cell based on how busy that week was.
function heatColor(c, max) {
    if (!c || c <= 0) return '#F1F1F1';
    const a = 0.18 + 0.82 * (c / max);
    return `rgba(0, 128, 15, ${a.toFixed(2)})`;
}

// Shared Chart.js options for our bar charts (vertical or horizontal).
function barOptions(horizontal) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: { legend: { display: false } },
        scales: {
            x: { beginAtZero: true, grid: { color: '#EEE' } },
            y: { beginAtZero: true, grid: { color: '#EEE' } },
        },
    };
}

// Shows the shared loader while a card's data is loading.
function renderLoading(key) {
    destroyChart(key);
    showLoader(bodyOf(key), { className: 'loader--fill' });
}
// Shows a "no data yet" message for an empty card.
function renderEmpty(key, msg) {
    const b = resetBody(key);
    const wrap = el('div', 'analytics-state');
    wrap.appendChild(el('p', 'analytics-state-title', msg || 'No data yet'));
    b.appendChild(wrap);
}
// Shows an error message when a card fails to load.
function renderErrorState(key) {
    const b = resetBody(key);
    const wrap = el('div', 'analytics-state');
    wrap.appendChild(el('p', 'analytics-state-text', "Couldn't load this analysis."));
    b.appendChild(wrap);
}

// At-risk card: a big count in graph mode, or a name / last-session table in list mode.
function renderAtRisk(view) {
    const b = resetBody('atRisk');
    const rows = store.atRisk.data;
    if (view === 'list' || !hasChart()) {
        b.appendChild(makeTable(
            ['Name', 'Last completed', 'Days since'],
            rows.map(r => [
                r.name,
                r.last_completed_at ? fmtDate(r.last_completed_at) : 'Never',
                r.days_since == null ? 'Never trained' : fmtNum(r.days_since),
            ])
        ));
    } else {
        const badge = el('div', 'analytics-badge');
        badge.append(
            el('div', 'analytics-badge-num', String(rows.length)),
            el('div', 'analytics-badge-label', 'trainees with no session in 7+ days')
        );
        b.appendChild(badge);
    }
}

// Attendance card: bar chart (or table) of how many trainees fall in each adherence bucket.
function renderAttendance(view) {
    const b = resetBody('attendance');
    const d = store.attendance.data;
    const keys = ['<50', '50-80', '80+'];
    const labels = ['<50%', '50–80%', '80%+'];
    const vals = keys.map(k => (d.buckets && d.buckets[k]) || 0);

    if (view === 'graph' && hasChart()) {
        const { wrap, canvas } = chartWrap();
        b.appendChild(wrap);
        charts.attendance = new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets: [{ data: vals, backgroundColor: GREEN, borderRadius: 6 }] },
            options: barOptions(false),
        });
    } else {
        b.appendChild(makeTable(['Adherence', 'Trainees'], keys.map((k, i) => [labels[i], String(vals[i])])));
    }
    b.appendChild(note(
        `${d.trainees_without_plan ?? 0} trainee(s) without a plan · ${d.total_trainees ?? 0} total · window: ${d.window_weeks ?? '—'} weeks`
    ));
}

// Leaderboard card: ranks trainees by body-weight or strength change, colored good/bad.
function renderLeaderboard(view) {
    const b = resetBody('leaderboard');
    const data = store.leaderboard.data || {};
    const metric = data.metric || leaderboardMetric;
    const ranking = data.ranking || [];
    const colorFor = (pct) => {
        const imp = isImprovement(metric, pct);
        return imp === true ? GREEN : imp === false ? RED : MUTED;
    };

    if (view === 'graph' && hasChart()) {
        const { wrap, canvas } = chartWrap();
        b.appendChild(wrap);
        charts.leaderboard = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: ranking.map(r => r.name),
                datasets: [{
                    data: ranking.map(r => Number(r.pct_change)),
                    backgroundColor: ranking.map(r => colorFor(r.pct_change)),
                    borderRadius: 6,
                }],
            },
            options: barOptions(true),
        });
    } else {
        b.appendChild(makeTable(
            ['#', 'Name', 'Start', 'Latest', '% change'],
            ranking.map(r => {
                const pct = el('span', null, fmtPct(r.pct_change));
                pct.style.color = colorFor(r.pct_change);
                pct.style.fontWeight = '600';
                return [String(r.rank), r.name, fmtNum(r.start_value), fmtNum(r.latest_value), pct];
            })
        ));
    }

    const direction = metric === 'body_weight'
        ? 'Lower is better — body-weight change shows weight loss.'
        : 'Higher is better — strength gain.';
    b.appendChild(note(`${direction} Trainees with only one data point are excluded from this ranking.`));
}

// Volume card: weekly line chart (or table) of total training volume; the latest week may be partial.
function renderVolume(view) {
    const b = resetBody('volume');
    const rows = sliceLastN(store.volume.data, volumeRange); // client-side range slice
    const lastIndex = rows.length - 1;

    if (view === 'graph' && hasChart()) {
        const { wrap, canvas } = chartWrap();
        b.appendChild(wrap);
        charts.volume = new Chart(canvas, {
            type: 'line',
            data: {
                labels: rows.map(r => weekLabel(r.week)),
                datasets: [{
                    data: rows.map(r => Number(r.total_volume)),
                    borderColor: GREEN,
                    backgroundColor: GREEN,
                    tension: 0.3,
                    fill: false,
                    // Mark the most-recent (often partial) week: bigger diamond + dashed leading segment
                    pointRadius: rows.map((_, i) => (i === lastIndex ? 5 : 3)),
                    pointStyle: rows.map((_, i) => (i === lastIndex ? 'rectRot' : 'circle')),
                    segment: {
                        borderDash: ctx => (ctx.p1DataIndex === lastIndex ? [6, 6] : undefined),
                    },
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: items => weekRange(rows[items[0].dataIndex].week),
                            label: ctx => `Volume: ${fmtThousands(ctx.parsed.y)}`,
                        },
                    },
                },
                scales: {
                    x: { grid: { color: '#EEE' } },
                    y: { beginAtZero: true, grid: { color: '#EEE' }, ticks: { callback: v => fmtThousands(v) } },
                },
            },
        });
        b.appendChild(note('The most recent week may be partial (shown dashed).'));
    } else {
        b.appendChild(makeTable(
            ['Week', 'Total volume'],
            rows.map((r, i) => [
                i === lastIndex ? `${weekLabel(r.week)} (partial)` : weekLabel(r.week),
                fmtThousands(r.total_volume),
            ])
        ));
        b.appendChild(note('The most recent week may be partial.'));
    }
}

// Heatmap card: a week-by-trainee grid; clicking a row shows that trainee's weekly sessions.
function renderHeatmap(view) {
    const b = resetBody('heatmap');
    const d = store.heatmap.data;
    const weeksAll = d.weeks || [];
    const rowsAll = d.rows || [];

    // Slice weeks (and each row's aligned counts) to the last N — client-side
    const startIdx = heatmapRange === 'all' ? 0 : Math.max(0, weeksAll.length - heatmapRange);
    const weeks = weeksAll.slice(startIdx);
    const rows = rowsAll.map(r => ({ ...r, counts: (r.counts || []).slice(startIdx) }));

    if (view === 'graph') {
        const grid = el('div', 'analytics-heatmap');
        grid.style.gridTemplateColumns = `160px repeat(${weeks.length}, minmax(34px, 1fr))`;
        grid.appendChild(el('div', 'analytics-heatmap-corner', ''));
        weeks.forEach(w => grid.appendChild(el('div', 'analytics-heatmap-col', weekLabel(w))));

        const max = Math.max(1, ...rows.flatMap(r => r.counts.map(Number)));
        rows.forEach(r => {
            const isSel = r.trainee_id === selectedTraineeId;
            const selectRow = () => { selectedTraineeId = r.trainee_id; renderCard('heatmap'); };

            const label = el('div', `analytics-heatmap-rowlabel${isSel ? ' selected' : ''}`, r.name);
            label.addEventListener('click', selectRow);
            grid.appendChild(label);

            r.counts.forEach((c, i) => {
                const n = Number(c);
                const cell = el('div', `analytics-heatmap-cell${isSel ? ' selected' : ''}`, n > 0 ? String(n) : '');
                cell.style.background = heatColor(n, max);
                cell.title = `${r.name} · ${weekRange(weeks[i])} · ${n} session${n === 1 ? '' : 's'}`;
                cell.addEventListener('click', selectRow);
                grid.appendChild(cell);
            });
        });
        b.appendChild(grid);

        // Per-trainee drilldown for the selected row
        const sel = rows.find(r => r.trainee_id === selectedTraineeId);
        if (sel && hasChart()) {
            const detail = el('div', 'analytics-heatmap-detail');
            detail.appendChild(el('h3', 'analytics-detail-title', `Sessions — ${sel.name}`));
            const { wrap, canvas } = chartWrap();
            detail.appendChild(wrap);
            b.appendChild(detail);
            charts.heatmap = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: weeks.map(weekLabel),
                    datasets: [{
                        data: sel.counts.map(Number),
                        borderColor: GREEN, backgroundColor: GREEN, tension: 0.3, fill: false, pointRadius: 3,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: items => weekRange(weeks[items[0].dataIndex]),
                                label: ctx => `${ctx.parsed.y} session${ctx.parsed.y === 1 ? '' : 's'}`,
                            },
                        },
                    },
                    scales: {
                        x: { grid: { color: '#EEE' } },
                        y: { beginAtZero: true, grid: { color: '#EEE' }, ticks: { precision: 0, stepSize: 1 } },
                    },
                },
            });
        } else if (!sel) {
            b.appendChild(note('Click a trainee row to see their weekly sessions.'));
        }
    } else {
        const headers = ['Trainee', ...weeks.map(weekLabel)];
        b.appendChild(makeTable(headers, rows.map(r => [r.name, ...r.counts.map(String)])));
    }
}

const RENDERERS = {
    atRisk: renderAtRisk,
    attendance: renderAttendance,
    leaderboard: renderLeaderboard,
    volume: renderVolume,
    heatmap: renderHeatmap,
};

// Renders one card based on its current status (loading / error / empty / ready).
function renderCard(key) {
    const s = store[key];
    if (!s || s.status === 'loading') return renderLoading(key);
    if (s.status === 'error') return renderErrorState(key);
    if (s.status === 'empty') return renderEmpty(key);
    RENDERERS[key](currentView);
}

// Decides whether a card's data counts as "empty" — the rule is different per card.
function isEmpty(key, d) {
    switch (key) {
        case 'atRisk':      return !Array.isArray(d) || d.length === 0;
        case 'attendance':  return !d || (d.total_trainees ?? 0) === 0;
        case 'leaderboard': return !d || !Array.isArray(d.ranking) || d.ranking.length === 0;
        case 'volume':      return !Array.isArray(d) || d.length === 0;
        case 'heatmap':     return !d || !Array.isArray(d.rows) || d.rows.length === 0;
        default:            return !d;
    }
}

// Fetches one card's data, tracks its status, and re-renders it when done.
async function loadCard(key, fetcher) {
    store[key] = { status: 'loading' };
    renderCard(key);
    try {
        const data = await fetcher();
        store[key] = { status: isEmpty(key, data) ? 'empty' : 'ready', data };
    } catch (err) {
        console.error(`Analytics "${key}" failed:`, err);
        store[key] = { status: 'error' };
    }
    renderCard(key);
}

// Reloads just the leaderboard card — used when its metric toggle changes.
function loadLeaderboard() {
    loadCard('leaderboard', () => AnalyticsService.getLeaderboard(trainerId, leaderboardMetric));
}

// Kicks off loading for every card on the page.
function loadAll() {
    loadCard('atRisk', () => AnalyticsService.getAtRisk(trainerId));
    loadCard('attendance', () => AnalyticsService.getAttendanceDistribution(trainerId));
    loadLeaderboard();
    loadCard('volume', () => AnalyticsService.getVolumeOverTime(trainerId));
    loadCard('heatmap', () => AnalyticsService.getEngagementHeatmap(trainerId));
}

//  toggles 
// Wires up a segmented toggle and calls onChange with the picked button's data attributes.
function wireSegToggle(id, onChange) {
    const group = document.getElementById(id);
    if (!group) return;
    group.querySelectorAll('.analytics-seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('active')) return;
            group.querySelectorAll('.analytics-seg-btn').forEach(b => b.classList.toggle('active', b === btn));
            onChange(btn.dataset);
        });
    });
}

// Boots the analytics page: reads the session, wires up the toggles, and loads every card.
document.addEventListener('DOMContentLoaded', () => {
    const session = DataService.getSession();
    if (!session) return; // base.js redirects to login when unauthenticated
    trainerId = session.trainer.id;

    // Global Graph/List toggle → re-render every card from cached data
    wireSegToggle('viewToggle', ({ view }) => {
        currentView = view;
        CARD_KEYS.forEach(renderCard);
    });

    // Leaderboard's own metric toggle → re-fetch just that card
    wireSegToggle('metricToggle', ({ metric }) => {
        leaderboardMetric = metric;
        loadLeaderboard();
    });

    // Volume / heatmap range toggles → re-slice cached data client-side (no re-fetch)
    wireSegToggle('volumeRangeToggle', ({ range }) => {
        volumeRange = range === 'all' ? 'all' : Number(range);
        renderCard('volume');
    });
    wireSegToggle('heatmapRangeToggle', ({ range }) => {
        heatmapRange = range === 'all' ? 'all' : Number(range);
        renderCard('heatmap');
    });

    loadAll();
});
