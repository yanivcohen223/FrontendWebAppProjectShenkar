import { DataService } from '../services/dataService.js';

let allTrainees = [];
let currentFilter = 'all';

function onTraineeClick(id) {
    console.log('Trainee clicked:', id);
    window.location.href = `trainee-profile.html?id=${id}`;
}

function onSearchTrainees(value) {
    applyFilters(value);
}

function onFilterTrainees() {
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown) dropdown.classList.toggle('open');
}

function applyFilters(searchQuery = '') {
    let filtered = [...allTrainees];

    if (currentFilter !== 'all') {
        filtered = filtered.filter(t =>
            (t.status || '').toLowerCase() === currentFilter
        );
    }

    if (searchQuery.trim()) {
        filtered = filtered.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        );
    }

    renderTrainees(filtered);
}

function renderTrainees(traineesArray) {
    const empty = document.getElementById('traineesEmpty');
    const list  = document.getElementById('traineesList');
    if (!list) return;

    list.innerHTML = '';

    if (!Array.isArray(traineesArray) || traineesArray.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }

    if (empty) empty.classList.add('hidden');

    traineesArray.forEach(t => {
        const row = document.createElement('div');
        row.className = 'trainee-row';
        row.dataset.id = t.id;

        const avatar = document.createElement('div');
        avatar.className = 'trainee-avatar';
        if (t.avatarUrl) {
            avatar.style.background = `#D9D9D9 url("${t.avatarUrl}") center/cover no-repeat`;
        } else if (t.avatarColor) {
            avatar.style.background = t.avatarColor;
        }

        const nameCol = document.createElement('div');
        nameCol.className = 'trainee-name';
        nameCol.style.display = 'flex';
        nameCol.style.flexDirection = 'column';
        nameCol.style.alignItems = 'flex-start';
        nameCol.style.gap = '4px';

        const nameText = document.createElement('span');
        nameText.textContent = t.name ?? '';
        nameCol.appendChild(nameText);

        const status = document.createElement('span');
        const statusKey = (t.status || '').toLowerCase();
        status.className = `trainee-status status-${statusKey}`;
        status.textContent = statusKey;

        const goal = document.createElement('span');
        goal.className = 'trainee-goal';
        goal.textContent = t.goal ?? '';

        const progress = document.createElement('span');
        progress.className = 'trainee-progress';
        progress.textContent = t.progress != null ? `${t.progress}%` : '';

        const last = document.createElement('span');
        last.className = 'trainee-last-activity';
        last.textContent = t.lastActivity ?? '';

        const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        chevron.setAttribute('class', 'trainee-chevron');
        chevron.setAttribute('viewBox', '0 0 16 16');
        chevron.setAttribute('fill', 'none');
        chevron.innerHTML =
            '<path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" ' +
            'stroke-linecap="round" stroke-linejoin="round"/>';

        row.append(avatar, nameCol, status, goal, progress, last, chevron);
        row.addEventListener('click', () => onTraineeClick(t.id));

        list.appendChild(row);
    });
}

function wireTrainees() {
    const searchInput = document.querySelector('.trainees-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', e => onSearchTrainees(e.target.value));
    }

    const filterBtn = document.querySelector('.trainees-filter');
    if (filterBtn) {
        filterBtn.addEventListener('click', onFilterTrainees);
    }

    wireFilterDropdown();
}

function wireFilterDropdown() {
    const dropdown = document.getElementById('filterDropdown');
    const filterBtn = document.querySelector('.trainees-filter');
    if (!dropdown) return;

    dropdown.querySelectorAll('.filter-option').forEach(btn => {
        btn.addEventListener('click', () => {
            dropdown.querySelectorAll('.filter-option')
                .forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilter = btn.dataset.status;

            if (filterBtn) {
                if (currentFilter === 'all') {
                    filterBtn.classList.remove('filter-btn-active');
                } else {
                    filterBtn.classList.add('filter-btn-active');
                }
            }

            dropdown.classList.remove('open');

            const searchInput = document.querySelector('.trainees-search-input');
            applyFilters(searchInput?.value || '');
        });
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !filterBtn?.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    wireTrainees();

    const session = DataService.getSession();
    if (!session) return;

    try {
        allTrainees = await DataService.getTraineesByTrainer(session.trainer.id);
        renderTrainees(allTrainees);
    } catch (err) {
        console.error('Failed to load trainees:', err);
    }
});
