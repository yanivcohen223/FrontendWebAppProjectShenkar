import { initTopbarBreadcrumb } from '../shared/topbar.js';
import { DataService } from '../services/dataService.js';
import { showToast, showInputModal } from '../shared/toast.js';
import { openExerciseModal } from '../shared/exerciseModal.js';

let days = [
    { title: 'Sunday', exercises: [] },
    { title: 'Monday', exercises: [] },
    { title: 'Tuesday', exercises: [] },
    { title: 'Wednesday', exercises: [] },
    { title: 'Thursday', exercises: [] },
    { title: 'Friday', exercises: [] },
    { title: 'Saturday', exercises: [] },
];

const deleteSVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <polyline points="3 6 5 6 21 6" stroke="#E53935" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#E53935" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="#E53935" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

let traineeId = '';
let traineeName = '';
let planId = '';
let selectedBodyPart = '';

function makeExercise(name) {
    return { id: null, name, sets: 3, reps: 10, restSeconds: 60 };
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    traineeId = params.get('id') || '';
    traineeName = params.get('name') || '';
    planId = params.get('planId') || '';

    initTopbarBreadcrumb([
        { label: 'Trainees List', href: 'trainees.html' },
        { label: traineeName || 'Trainee', href: `trainee-profile.html?id=${encodeURIComponent(traineeId)}` },
        { label: 'Edit Training Plan' }
    ]);

    await loadExistingPlanDetails(planId);
    await Promise.all([loadBodyPartFilter(), loadExerciseLibrary()]);
    setupEventListeners();
});

function setSelectValue(selectEl, val) {
    if (!selectEl || val == null) return;
    const str = String(val).toLowerCase();
    const match = [...selectEl.options].find(o => o.value.toLowerCase() === str || o.text.toLowerCase() === str);
    if (match) selectEl.value = match.value;
}

async function loadExistingPlanDetails(planId) {
    setGridLoading(true);
    try {
        const plan = await DataService.getPlanById(planId);
        if (!plan) return;

        const nameEl = document.getElementById('cpPlanName');
        if (nameEl) nameEl.value = plan.name || plan.planName || '';

        setSelectValue(document.getElementById('cpGoal'), plan.goal);
        setSelectValue(document.getElementById('cpDays'), plan.daysPerWeek);

        plan.days.forEach((serverDay) => {
            const dayIdx = (serverDay.dayNumber ?? serverDay.day_number) - 1;
            if (dayIdx >= 0 && dayIdx < days.length) {
                days[dayIdx].exercises = serverDay.exercises.map(ex => ({
                    id: ex.id ?? null,
                    name: ex.name,
                    sets: Number(ex.sets) || 3,
                    reps: Number(ex.reps) || 10,
                    restSeconds: Number(ex.restSeconds) || 60,
                }));
            }
        });

        renderWeeklyGrid();
    } catch (error) {
        console.error('Error loading plan details', error);
        showToast('Failed to load training plan details', 'error');
    } finally {
        setGridLoading(false);
    }
}

function setGridLoading(isLoading) {
    const grid = document.getElementById('cpWeekGrid');
    if (!grid) return;
    if (isLoading) {
        grid.classList.add('is-loading');
        grid.innerHTML = `
            <div class="cp-grid-spinner"></div>
            <span class="cp-grid-loading-text">Loading…</span>`;
    } else {
        grid.classList.remove('is-loading');
    }
}

function renderWeeklyGrid() {
    const grid = document.getElementById('cpWeekGrid');
    if (!grid) return;
    grid.classList.remove('is-loading');
    grid.innerHTML = '';
    days.forEach((day, i) => grid.appendChild(renderDayCard(day, i)));
}

async function loadBodyPartFilter() {
    const select = document.getElementById('cpBodyPartFilter');
    if (!select) return;
    try {
        const parts = await DataService.getBodyParts();
        parts.forEach(part => {
            const opt = document.createElement('option');
            opt.value = part;
            opt.textContent = part.charAt(0).toUpperCase() + part.slice(1);
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to load body parts:', err);
    }
}

async function loadExerciseLibrary(query = '', bodyPart = '') {
    const list = document.getElementById('cpLibList');
    if (!list) return;
    list.innerHTML = '<div class="cp-lib-loading">Loading…</div>';
    try {
        const exercises = await DataService.searchExercises(query, bodyPart);
        if (!Array.isArray(exercises)) throw new Error('Unexpected response from exercise search');
        renderLibrary(exercises);
    } catch (err) {
        console.error('Exercise library load failed:', err);
        list.innerHTML = `
            <div class="cp-lib-error">
                <span>Failed to load exercises</span>
                <button class="cp-lib-retry-btn">Retry</button>
            </div>`;
        list.querySelector('.cp-lib-retry-btn')?.addEventListener('click', () => loadExerciseLibrary(query, bodyPart));
    }
}

function setupEventListeners() {
    let debounceTimer;

    document.getElementById('cpLibSearch')?.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadExerciseLibrary(e.target.value.trim(), selectedBodyPart), 300);
    });

    document.getElementById('cpBodyPartFilter')?.addEventListener('change', (e) => {
        selectedBodyPart = e.target.value;
        const query = document.getElementById('cpLibSearch')?.value.trim() || '';
        loadExerciseLibrary(query, selectedBodyPart);
    });

    document.getElementById('cpBackBtn')?.addEventListener('click', () => history.back());
    document.getElementById('cpSaveBtn')?.addEventListener('click', handleSavePlan);
}

function renderDayCard(day, idx) {
    const card = document.createElement('div');
    card.className = 'cp-day-card';
    card.dataset.dayIdx = idx;

    const header = document.createElement('div');
    header.className = 'cp-day-header';
    const titleEl = document.createElement('span');
    titleEl.className = 'cp-day-title';
    titleEl.contentEditable = 'plaintext-only';
    titleEl.spellcheck = false;
    titleEl.textContent = day.title;
    titleEl.addEventListener('blur', () => { days[idx].title = titleEl.textContent.trim() || days[idx].title; });
    titleEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
        if (e.key === 'Escape') { titleEl.textContent = days[idx].title; titleEl.blur(); }
    });
    header.appendChild(titleEl);

    const body = document.createElement('div');
    body.className = 'cp-day-body';

    if (day.exercises && day.exercises.length > 0) {
        const table = document.createElement('table');
        table.className = 'cp-ex-table';
        table.innerHTML = `<thead><tr>
            <th class="cp-ex-td-name">Exercise</th>
            <th class="cp-ex-td-num">Sets</th>
            <th class="cp-ex-td-num">Reps</th>
            <th class="cp-ex-td-rest">Rest (s)</th>
            <th class="cp-ex-td-acts"></th>
        </tr></thead>`;

        const tbody = document.createElement('tbody');
        day.exercises.forEach((ex, exIdx) => {
            const tr = document.createElement('tr');

            // Name cell — contenteditable
            const nameTd = document.createElement('td');
            nameTd.className = 'cp-ex-td-name';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'cp-ex-name-cell';
            nameSpan.contentEditable = 'plaintext-only';
            nameSpan.spellcheck = false;
            nameSpan.title = ex.name;
            nameSpan.textContent = ex.name;
            nameSpan.addEventListener('blur', () => { days[idx].exercises[exIdx].name = nameSpan.textContent.trim() || ex.name; });
            nameSpan.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameSpan.blur(); } });
            nameTd.appendChild(nameSpan);

            // Sets input
            const setsTd = document.createElement('td');
            setsTd.className = 'cp-ex-td-num';
            const setsInput = document.createElement('input');
            setsInput.type = 'number';
            setsInput.className = 'cp-ex-input';
            setsInput.min = 1; setsInput.max = 20;
            setsInput.value = ex.sets;
            setsInput.addEventListener('change', () => { days[idx].exercises[exIdx].sets = Math.max(1, parseInt(setsInput.value, 10) || 3); setsInput.value = days[idx].exercises[exIdx].sets; });
            setsTd.appendChild(setsInput);

            // Reps input
            const repsTd = document.createElement('td');
            repsTd.className = 'cp-ex-td-num';
            const repsInput = document.createElement('input');
            repsInput.type = 'number';
            repsInput.className = 'cp-ex-input';
            repsInput.min = 1; repsInput.max = 200;
            repsInput.value = ex.reps;
            repsInput.addEventListener('change', () => { days[idx].exercises[exIdx].reps = Math.max(1, parseInt(repsInput.value, 10) || 10); repsInput.value = days[idx].exercises[exIdx].reps; });
            repsTd.appendChild(repsInput);

            // Rest input
            const restTd = document.createElement('td');
            restTd.className = 'cp-ex-td-rest';
            const restInput = document.createElement('input');
            restInput.type = 'number';
            restInput.className = 'cp-ex-input';
            restInput.min = 0; restInput.max = 600;
            restInput.value = ex.restSeconds;
            restInput.addEventListener('change', () => { days[idx].exercises[exIdx].restSeconds = Math.max(0, parseInt(restInput.value, 10) || 60); restInput.value = days[idx].exercises[exIdx].restSeconds; });
            restTd.appendChild(restInput);

            // Delete button
            const actsTd = document.createElement('td');
            actsTd.className = 'cp-ex-td-acts';
            const delBtn = document.createElement('button');
            delBtn.className = 'cp-ex-icon-btn';
            delBtn.title = 'Delete';
            delBtn.innerHTML = deleteSVG;
            delBtn.addEventListener('click', () => { days[idx].exercises.splice(exIdx, 1); replaceCard(idx); });
            actsTd.appendChild(delBtn);

            tr.append(nameTd, setsTd, repsTd, restTd, actsTd);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        body.appendChild(table);
    } else {
        const empty = document.createElement('div');
        empty.className = 'cp-day-empty';
        empty.innerHTML = 'Drag and drop from the library<br>or click <strong>+ Add Exercise</strong>';
        body.appendChild(empty);
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'cp-day-add-btn';
    addBtn.type = 'button';
    addBtn.dataset.day = idx;
    addBtn.textContent = '+ Add Exercise';
    addBtn.addEventListener('click', async () => {
        const name = await showInputModal('Exercise name:');
        if (name?.trim()) {
            day.exercises.push(makeExercise(name.trim()));
            replaceCard(idx);
        }
    });
    body.appendChild(addBtn);

    card.appendChild(header);
    card.appendChild(body);

    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const name = e.dataTransfer.getData('text/plain');
        if (name) { day.exercises.push(makeExercise(name)); replaceCard(idx); }
    });

    return card;
}

function replaceCard(idx) {
    const grid = document.getElementById('cpWeekGrid');
    const old = grid.querySelector(`[data-day-idx="${idx}"]`);
    if (old) grid.replaceChild(renderDayCard(days[idx], idx), old);
}

function renderLibrary(exercises) {
    const list = document.getElementById('cpLibList');
    if (!list) return;
    list.innerHTML = '';
    if (!exercises.length) {
        list.innerHTML = '<div class="cp-lib-empty">No exercises found</div>';
        return;
    }
    exercises.forEach(ex => {
        const item = document.createElement('div');
        item.className = 'cp-lib-item';
        item.draggable = true;
        item.innerHTML = `
            <div class="cp-lib-item-info">
                <span class="cp-lib-item-name">${ex.name}</span>
                ${ex.target ? `<span class="cp-lib-item-target">${ex.target}</span>` : ''}
            </div>
            <span class="cp-lib-drag-handle">⠿</span>`;
        let wasDragging = false;
        item.addEventListener('dragstart', e => {
            wasDragging = true;
            e.dataTransfer.setData('text/plain', ex.name);
            e.dataTransfer.effectAllowed = 'copy';
        });
        item.addEventListener('dragend', () => { setTimeout(() => { wasDragging = false; }, 50); });
        item.addEventListener('click', () => { if (!wasDragging) openExerciseModal(ex); });
        list.appendChild(item);
    });
}

function setButtonLoadingState(buttonEl, isLoading, text) {
    if (!buttonEl) return;
    buttonEl.disabled = isLoading;
    if (isLoading) {
        buttonEl.dataset.originalHtml = buttonEl.innerHTML;
        buttonEl.textContent = text;
    } else {
        buttonEl.innerHTML = buttonEl.dataset.originalHtml || text;
    }
}

async function handleSavePlan() {
    const saveBtn = document.getElementById('cpSaveBtn');
    const name = document.getElementById('cpPlanName')?.value.trim() || '';
    const goal = document.getElementById('cpGoal')?.value || '';
    const daysPerWeek = parseInt(document.getElementById('cpDays')?.value, 10);

    if (!goal) { showToast('Please select a goal.', 'warning'); return; }
    if (isNaN(daysPerWeek) || daysPerWeek <= 0) { showToast('Please select days per week.', 'warning'); return; }

    const formattedDays = days.map((day, idx) => ({
        dayNumber: idx + 1,
        exercises: (day.exercises || []).map(ex => ({
            id: ex.id || null,
            name: (ex.name || '').trim(),
            sets: Math.max(1, Number(ex.sets) || 3),
            reps: Math.max(1, Number(ex.reps) || 10),
            restSeconds: Math.max(0, Number(ex.restSeconds) || 60),
        })),
    }));

    const totalExercises = formattedDays.reduce((sum, d) => sum + d.exercises.length, 0);
    if (totalExercises === 0) { showToast('Add at least one exercise before saving.', 'warning'); return; }

    try {
        setButtonLoadingState(saveBtn, true, 'Saving...');
        const result = await DataService.updateTrainingPlan(planId, { name, goal, daysPerWeek, days: formattedDays });
        if (result && result.success) {
            showToast('Training plan saved!', 'success');
            setTimeout(() => { window.location.href = `trainee-profile.html?id=${encodeURIComponent(traineeId)}`; }, 1200);
        } else {
            showToast('Failed to save plan.', 'error');
        }
    } catch (error) {
        console.error('Error saving training plan:', error);
        showToast('An error occurred: ' + error.message, 'error');
    } finally {
        setButtonLoadingState(saveBtn, false, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17 21v-8H7v8M7 3v5h8" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg> Save Plan`);
    }
}
