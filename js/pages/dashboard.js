import { DataService } from '../services/dataService.js';
import { showOverlayLoader } from '../shared/loader.js';

let overviewChart = null;

// Opens a trainee's profile page when their client row is clicked.
function onClientClick(id) {
    if (id) window.location.href = `trainee-profile.html?id=${id}`;
}

// Wires up the stat cards along the top. "Total clients" opens the trainees list.
function wireStatCards() {
    const totalClientsLabel = document.querySelector('[data-action="total-clients"]');
    if (totalClientsLabel) totalClientsLabel.addEventListener('click', () => { window.location.href = 'trainees.html'; });
}

// Wires up the clients panel and its "view all" link (opens the trainees list).
function wireClientsPanel() {
    const viewAll = document.querySelector('[data-action="view-all-clients"]');
    if (viewAll) viewAll.addEventListener('click', () => { window.location.href = 'trainees.html'; });
    document.querySelectorAll('.client-row').forEach(row => {
        row.addEventListener('click', () => onClientClick(row.dataset.id));
    });
}

// Draws the monthly "active trainees" line chart (starts empty) with Chart.js.
function renderOverviewChart() {
    const canvas = document.getElementById('overviewChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const data   = [0,0,0,0,0,0,0,0,0,0,0,0];

    overviewChart = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets: [{
            data, borderColor: '#00800F', borderWidth: 3, tension: 0, fill: false,
            pointStyle: 'circle', pointRadius: 7.5, pointBorderColor: '#00800F',
            pointBorderWidth: 2.5, pointBackgroundColor: 'rgba(0,0,0,0)',
            pointHoverRadius: 8.5, pointHoverBackgroundColor: 'rgba(0,0,0,0)',
            pointHoverBorderColor: '#00800F'
        }]},
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { left: 0, right: 12, top: 8, bottom: 0 } },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} active trainees` } }
            },
            scales: {
                x: {
                    grid: { color: '#A8A8A8', lineWidth: 1, drawTicks: false },
                    ticks: { font: { family: "'Inter', sans-serif", size: 14 }, color: '#000', padding: 8 },
                    border: { color: '#A8A8A8' }
                },
                y: {
                    min: 0,
                    title: { display: true, text: 'Active Trainees', font: { family: "'Inter', sans-serif", size: 12 }, color: '#000' },
                    ticks: { stepSize: 1, font: { family: "'Inter', sans-serif", size: 10 }, color: '#000', padding: 6, callback: v => v },
                    grid: { color: '#A8A8A8', lineWidth: 1, drawTicks: false },
                    border: { color: '#A8A8A8' }
                }
            }
        }
    });
}

// Renders the top client rows in the side panel, or the empty state if there are none.
function renderClients(clientsArray) {
    const empty = document.getElementById('clientsEmpty');
    const list  = document.getElementById('clientsList');
    if (!list) return;
    list.innerHTML = '';

    if (!Array.isArray(clientsArray) || clientsArray.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    const rowTops = [125, 210, 294, 379, 464, 549, 634, 719];
    clientsArray.slice(0, rowTops.length).forEach((client, i) => {
        const row = document.createElement('div');
        row.className = 'client-row';
        row.style.top = `${rowTops[i]}px`;
        row.dataset.name = client.name;
        row.dataset.id = client.id;

        const avatar = document.createElement('div');
        avatar.className = 'client-avatar';
        if (client.avatarUrl) {
            avatar.style.background = `#F3F3F3 url("${client.avatarUrl}") center/cover no-repeat`;
        } else {
            avatar.style.background = client.avatarColor || '#D9D9D9';
        }

        const name = document.createElement('span');
        name.className = 'client-name';
        name.textContent = client.name;

        row.appendChild(avatar);
        row.appendChild(name);
        row.addEventListener('click', () => onClientClick(client.id));
        list.appendChild(row);
    });
}

// Drops real monthly numbers into the chart and hides the "no data" overlay.
function updateChartData(newDataArray) {
    if (!overviewChart || !Array.isArray(newDataArray)) return;
    overviewChart.data.datasets[0].data = newDataArray.slice(0, 12);
    overviewChart.update();
    const overlay = document.getElementById('chartEmptyOverlay');
    if (overlay) overlay.classList.add('hidden');
}

// Fills the stat cards with real numbers once they're loaded.
function updateStatCards(stats) {
    if (!stats || typeof stats !== 'object') return;
    document.querySelectorAll('.stat-value').forEach(el => {
        const key = el.dataset.stat;
        if (key && stats[key] != null) {
            el.textContent = stats[key];
            el.classList.add('has-data');
            const subtitle = el.parentElement?.querySelector('.stat-subtitle');
            if (subtitle) subtitle.classList.add('hidden');
        }
    });
}

// Sets up the dashboard: draws the chart, then loads the trainer's trainees and stats.
document.addEventListener('DOMContentLoaded', async () => {
    wireStatCards();
    wireClientsPanel();
    renderOverviewChart();

    const session = DataService.getSession();
    if (!session) return;
    const { trainer } = session;

    // Show the shared loader over the content area while the initial data loads.
    const hideLoader = showOverlayLoader(document.querySelector('.canvas'));
    try {
        // Trainees are now fetched from the backend, not read from the session
        const trainees = await DataService.getTraineesByTrainer(trainer.id);

        const avgProgress = trainees.length
            ? Math.round(trainees.reduce((sum, t) => sum + (t.progress || 0), 0) / trainees.length)
            : 0;

        // Completed workouts this week (Sun–Sat) across all of this trainer's trainees.
        const workoutsThisWeek = await DataService.getWorkoutsThisWeek(trainer.id).catch(() => 0);

        updateStatCards({
            totalClients:  trainees.length,
            activeClients: trainees.length,   // no 'status' field in DB; treat all as active for now
            workouts:      workoutsThisWeek,
            avgProgress:   avgProgress + '%'
        });

        const topClients = [...trainees]
            .sort((a, b) => (b.progress || 0) - (a.progress || 0))
            .slice(0, 8);
        renderClients(topClients);

        const monthlyData = await DataService.getMonthlyActiveTrainees(trainer.id);
        updateChartData(monthlyData);
    } catch (err) {
        console.error('Failed to load dashboard data:', err);
    } finally {
        // Reveal the page (populated, or with its empty states) once loading ends.
        hideLoader();
    }
});