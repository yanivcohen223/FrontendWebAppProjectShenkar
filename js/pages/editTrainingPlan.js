import { initTopbarBreadcrumb } from '../shared/topbar.js';
import { DataService } from '../services/dataService.js';
import { showToast } from '../shared/toast.js';

let days = [
    { title: 'Sunday', exercises: [] },
    { title: 'Monday', exercises: [] },
    { title: 'Tuesday', exercises: [] },
    { title: 'Wednesday', exercises: [] },
    { title: 'Thursday', exercises: [] },
    { title: 'Friday', exercises: [] },
    { title: 'Saturday', exercises: [] },
];

const LIBRARY = [
    { name: 'Bench Press', emoji: '🏋️' },
    { name: 'Squat', emoji: '🦵' },
    { name: 'Deadlift', emoji: '🔥' },
    { name: 'Overhead Press', emoji: '💪' },
    { name: 'Pull-up', emoji: '⬆️' },
    { name: 'Barbell Row', emoji: '🎯' },
    { name: 'Lunge', emoji: '🏃' },
    { name: 'Dumbbell Curl', emoji: '💪' },
];

const editSVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const deleteSVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <polyline points="3 6 5 6 21 6" stroke="#E53935" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#E53935" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="#E53935" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

let traineeId = '';
let traineeName = '';
let planId = '';

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
    renderLibrary(LIBRARY);
    setupEventListeners();
});

async function loadExistingPlanDetails(planId) {
    setGridLoading(true);
    try {
        const plan = await DataService.getPlanById(planId);
        if (!plan) return;

        if (document.getElementById('cpGoal')) document.getElementById('cpGoal').value = plan.goal;
        if (document.getElementById('cpDays')) document.getElementById('cpDays').value = plan.daysPerWeek;

        plan.days.forEach((serverDay) => {
            const dayIdx = (serverDay.dayNumber ?? serverDay.day_number) - 1;
            if (dayIdx >= 0 && dayIdx < days.length) {
                days[dayIdx].exercises = serverDay.exercises.map(ex => ({
                    id: ex.id,
                    name: ex.name,
                    sets: `${ex.sets}x${ex.reps}`,
                    reps: ex.reps.toString(),
                    rest: `${ex.restSeconds}s`
                }));
            }
        });

        renderWeeklyGrid();
    } catch (error) {
        console.error('Error loading plan details', error);
        showToast('Failed to load training plan details', 'error');
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

function setupEventListeners() {
    document.getElementById('cpLibSearch')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        renderLibrary(q ? LIBRARY.filter(ex => ex.name.toLowerCase().includes(q)) : LIBRARY);
    });
    document.getElementById('cpBackBtn')?.addEventListener('click', () => history.back());
    document.getElementById('cpSaveBtn')?.addEventListener('click', handleSavePlan);
}

function getWeekdayName(idx) {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][idx];
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

function renderDayCard(day, idx) {
    const hasEx = day.exercises && day.exercises.length > 0;

    const bodyContent = hasEx
        ? `<table class="cp-ex-table">
                <thead><tr>
                    <th class="cp-ex-td-name">Exercise Name</th>
                    <th class="cp-ex-td-num">Sets</th>
                    <th class="cp-ex-td-num">Reps</th>
                    <th class="cp-ex-td-rest">Rest</th>
                    <th class="cp-ex-td-acts"></th>
                </tr></thead>
                <tbody>${day.exercises.map((ex, exIdx) => `
                    <tr>
                        <td class="cp-ex-td-name" title="${ex.name}">${ex.name}</td>
                        <td class="cp-ex-td-num">${ex.sets}</td>
                        <td class="cp-ex-td-num">${ex.reps}</td>
                        <td class="cp-ex-td-rest">${ex.rest}</td>
                        <td class="cp-ex-td-acts">
                            <button class="cp-ex-icon-btn" title="Edit" data-day="${idx}" data-ex="${exIdx}" data-action="edit">${editSVG}</button>
                            <button class="cp-ex-icon-btn" title="Delete" data-day="${idx}" data-ex="${exIdx}" data-action="delete">${deleteSVG}</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
           </table>`
        : `<div class="cp-day-empty">Drag and drop from the library<br>or click <strong>+ Add Exercise</strong></div>`;

    const card = document.createElement('div');
    card.className = 'cp-day-card';
    card.dataset.dayIdx = idx;
    card.innerHTML = `
        <div class="cp-day-header">
            <span class="cp-day-title" contenteditable="plaintext-only" spellcheck="false">${day.title}</span>
        </div>
        <div class="cp-day-body">
            ${bodyContent}
            <button class="cp-day-add-btn" type="button" data-day="${idx}">+ Add Exercise</button>
        </div>`;

    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const name = e.dataTransfer.getData('text/plain');
        if (name) {
            day.exercises.push({ name, sets: '3x10', reps: '10', rest: '60s' });
            replaceCard(idx);
        }
    });

    card.querySelector('.cp-day-add-btn').addEventListener('click', () => {
        const name = prompt('Exercise name:');
        if (name?.trim()) {
            day.exercises.push({ name: name.trim(), sets: '3x10', reps: '10', rest: '60s' });
            replaceCard(idx);
        }
    });

    card.querySelectorAll('.cp-ex-icon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dIdx = Number(btn.dataset.day);
            const eIdx = Number(btn.dataset.ex);
            if (btn.dataset.action === 'delete') {
                days[dIdx].exercises.splice(eIdx, 1);
                replaceCard(dIdx);
            } else {
                const current = days[dIdx].exercises[eIdx];
                const name = prompt('Exercise name:', current.name);
                if (name?.trim()) {
                    days[dIdx].exercises[eIdx].name = name.trim();
                    replaceCard(dIdx);
                }
            }
        });
    });

    const titleEl = card.querySelector('.cp-day-title');
    titleEl.addEventListener('blur', () => {
        days[idx].title = titleEl.textContent.trim() || days[idx].title;
    });
    titleEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
        if (e.key === 'Escape') { titleEl.textContent = days[idx].title; titleEl.blur(); }
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
    exercises.forEach(ex => {
        const item = document.createElement('div');
        item.className = 'cp-lib-item';
        item.draggable = true;
        item.innerHTML = `
            <div class="cp-lib-item-icon">${ex.emoji}</div>
            <span class="cp-lib-item-name">${ex.name}</span>
            <span class="cp-lib-drag-handle">⠿</span>`;
        item.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', ex.name);
            e.dataTransfer.effectAllowed = 'copy';
        });
        list.appendChild(item);
    });
}

async function handleSavePlan() {
    const saveBtn = document.getElementById('cpSaveBtn');
    const goal = document.getElementById('cpGoal')?.value || '';
    const daysPerWeek = parseInt(document.getElementById('cpDays')?.value, 10);

    const formattedDays = days.map((day, idx) => ({
        dayNumber: idx + 1,
        exercises: (day.exercises || []).map(ex => {
            let rawSets = 3;
            if (ex.sets && typeof ex.sets === 'string' && ex.sets.includes('x')) {
                rawSets = parseInt(ex.sets.split('x')[0], 10);
            } else if (typeof ex.sets === 'number') {
                rawSets = ex.sets;
            }

            let rawRest = 60;
            const restValue = ex.rest || ex.restSeconds;
            if (restValue && typeof restValue === 'string') {
                rawRest = parseInt(restValue.replace('s', ''), 10);
            } else if (typeof restValue === 'number') {
                rawRest = restValue;
            }

            return {
                id: ex.id || null,
                name: (ex.name || '').trim(),
                sets: isNaN(rawSets) ? 3 : rawSets,
                reps: isNaN(parseInt(ex.reps, 10)) ? 10 : parseInt(ex.reps, 10),
                restSeconds: isNaN(rawRest) ? 60 : rawRest,
            };
        })
    }));

    if (!goal) { showToast('Please select a goal.', 'warning'); return; }
    if (isNaN(daysPerWeek) || daysPerWeek <= 0) { showToast('Please select days per week.', 'warning'); return; }

    const totalExercises = formattedDays.reduce((sum, d) => sum + d.exercises.length, 0);
    if (totalExercises === 0) { showToast('Add at least one exercise before saving.', 'warning'); return; }

    try {
        setButtonLoadingState(saveBtn, true, 'Saving...');
        const result = await DataService.updateTrainingPlan(planId, { goal, daysPerWeek, days: formattedDays });
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
