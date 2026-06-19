import { DataService } from '../services/dataService.js';

let overviewChart = null;

function onClientClick(name) { console.log('Client clicked:', name); }

function wireStatCards() {
    const totalClientsLabel = document.querySelector('[data-action="total-clients"]');
    if (totalClientsLabel) totalClientsLabel.addEventListener('click', () => console.log('Total clients clicked'));
}

function wireClientsPanel() {
    const viewAll = document.querySelector('[data-action="view-all-clients"]');
    if (viewAll) viewAll.addEventListener('click', () => console.log('View all clients'));
    document.querySelectorAll('.client-row').forEach(row => {
        row.addEventListener('click', () => onClientClick(row.dataset.name));
    });
}

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
        row.addEventListener('click', () => onClientClick(client.name));
        list.appendChild(row);
    });
}

function updateChartData(newDataArray) {
    if (!overviewChart || !Array.isArray(newDataArray)) return;
    overviewChart.data.datasets[0].data = newDataArray.slice(0, 12);
    overviewChart.update();
    const overlay = document.getElementById('chartEmptyOverlay');
    if (overlay) overlay.classList.add('hidden');
}

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

document.addEventListener('DOMContentLoaded', async () => {
    wireStatCards();
    wireClientsPanel();
    renderOverviewChart();

    const session = DataService.getSession();
    if (!session) return;
    const { trainer } = session;

    try {
        // Trainees are now fetched from the backend, not read from the session
        const trainees = await DataService.getTraineesByTrainer(trainer.id);

        const avgProgress = trainees.length
            ? Math.round(trainees.reduce((sum, t) => sum + (t.progress || 0), 0) / trainees.length)
            : 0;

        updateStatCards({
            totalClients:  trainees.length,
            activeClients: trainees.length,   // no 'status' field in DB; treat all as active for now
            workouts:      '--',
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
    }
});