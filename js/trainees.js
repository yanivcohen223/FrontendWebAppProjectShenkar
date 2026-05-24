/* trainees.js — Trainees List page only
   Loads trainer + trainee data from ListOfTrainees.JSON,
   wires search/filter, and renders the table. */

/* ---------- Module-level state ---------- */
let allTrainees = [];
let currentFilter = 'all';

/* ---------- Stub handlers ---------- */
function onTraineeClick(id) {
    console.log('Trainee clicked:', id);
    // TODO: navigate to trainee profile
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
            t.status.toLowerCase() === currentFilter
        );
    }

    if (searchQuery.trim()) {
        filtered = filtered.filter(t =>
            t.name.toLowerCase().includes(
                searchQuery.toLowerCase().trim()
            )
        );
    }

    renderTrainees(filtered);
}

/* ---------- Row rendering ---------- */
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

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'trainee-avatar';
        if (t.avatarUrl) {
            avatar.style.background = `#D9D9D9 url("${t.avatarUrl}") center/cover no-repeat`;
        } else if (t.avatarColor) {
            avatar.style.background = t.avatarColor;
        }

        // Name of the trainee
        const nameCol = document.createElement('div');
        nameCol.className = 'trainee-name';
        nameCol.style.display = 'flex';
        nameCol.style.flexDirection = 'column';
        nameCol.style.alignItems = 'flex-start';
        nameCol.style.gap = '4px';

        const nameText = document.createElement('span');
        nameText.textContent = t.name ?? '';
        nameCol.appendChild(nameText);

        // Status badge
        const status = document.createElement('span');
        const statusKey = (t.status || '').toLowerCase();
        status.className = `trainee-status status-${statusKey}`;
        status.textContent = statusKey;

        // Goal
        const goal = document.createElement('span');
        goal.className = 'trainee-goal';
        goal.textContent = t.goal ?? '';

        // Progress — append "%" since JSON stores a raw number
        const progress = document.createElement('span');
        progress.className = 'trainee-progress';
        progress.textContent = t.progress != null ? `${t.progress}%` : '';

        // Last activity
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

/* ---------- DOM wiring ---------- */
function wireTrainees() {
    const searchInput = document.querySelector('.trainees-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', e =>
            onSearchTrainees(e.target.value)
        );
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

    // Close when clicking outside the dropdown or the filter button
    document.addEventListener('click', (e) => {
        if (
            !dropdown.contains(e.target) &&
            !filterBtn?.contains(e.target)
        ) {
            dropdown.classList.remove('open');
        }
    });
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
    wireTrainees();

    const session = window.sportieSession;
    if (!session) return;

    allTrainees = session.trainees;
    renderTrainees(allTrainees);
});
