import { initTopbarBreadcrumb } from '../shared/topbar.js';
import { DataService } from '../services/dataService.js';
let days = [
    { title: 'Sunday (Day 1)', exercises: [] },
    { title: 'Monday (Day 2)', exercises: [] },
    { title: 'Tuesday (Day 3)', exercises: [] },
    { title: 'Wednesday (Day 4)', exercises: [] },
    { title: 'Thursday (Day 5)', exercises: [] },
    { title: 'Friday (Day 6)', exercises: [] },
    { title: 'Saturday (Day 7)', exercises: [] },
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

/* ── SVG icons ───────────────────────────────────────────────── */
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


/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || '';
    const name = params.get('name') || '';

    traineeId = id;
    traineeName = name;

    initTopbarBreadcrumb([
        { label: 'Trainees List', href: 'trainees.html' },
        { label: name || 'Trainee', href: `trainee-profile.html?id=${encodeURIComponent(id)}` },
        { label: 'Create Training Plan' }
    ]);

    renderWeeklyGrid();
    renderLibrary(LIBRARY);
    setupEventListeners();
});

function renderWeeklyGrid() {
    const grid = document.getElementById('cpWeekGrid');
    if (!grid) return;
    grid.innerHTML = '';
    days.forEach((day, i) => grid.appendChild(renderDayCard(day, i)));
}

function setupEventListeners() {
    document.getElementById('cpGenerateBtn')?.addEventListener('click', handleGeneratePlan);
    document.getElementById('cpLibSearch')?.addEventListener('input', handleLibrarySearch);
    document.getElementById('cpBackBtn')?.addEventListener('click', () => history.back());
    document.getElementById('cpSavePlanBtn')?.addEventListener('click', handleSavePlan);
}

function getSelectedFormData() {
    const goal = document.getElementById('cpGoal').value.toLowerCase();
    const daysPerWeek = parseInt(document.getElementById('cpDays').value, 10);
    const selectedBodyParts = [];
    const checkboxes = document.querySelectorAll('.cp-muscle-group input[type="checkbox"]');
    checkboxes.forEach(cb => {
        if (cb.checked) selectedBodyParts.push(cb.parentElement.textContent.trim().toLocaleLowerCase());
    });
    return { goal, daysPerWeek, bodyParts: selectedBodyParts };
}

async function handleGeneratePlan() {
    const { goal, daysPerWeek, bodyParts } = getSelectedFormData();
    const genBtn = document.getElementById('cpGenerateBtn');

    if (bodyParts.length === 0) {
        alert('Please select at least one muscle group.');
        return;
    }

    try {
        setButtonLoadingState(genBtn, true, 'Generating...');

        const generatedData = await DataService.generateTrainingPlan({ goal, daysPerWeek, bodyParts, exercisesPerDay: 4 });
        console.log('Generated plan from server:', generatedData);

        mapServerDataToFrontend(generatedData);
        renderWeeklyGrid();
    } catch (error) {
        console.error('Error generating training plan:', error);
        alert('Failed to generate training plan. Please try again.');
    } finally {
        setButtonLoadingState(genBtn, false, 'Generate Plan');
    }
}

async function handleSavePlan() {
    try {
        const { goal, daysPerWeek } = getSelectedFormData();

        const changedPlan = {
            traineeId: traineeId,
            goal: goal,
            daysPerWeek: daysPerWeek,
            days: days.map((day, idx) => ({
                dayNumber: idx + 1,
                title: day.title,
                exercises: day.exercises.map(ex => ({
                    id: ex.id || null,
                    name: ex.name,
                    sets: parseInt(ex.sets.split('x')[0]) || 3,
                    reps: parseInt(ex.reps) || 10,
                    restSeconds: parseInt(ex.rest.replace('s', '')) || 60,
                }))
            }))
        };

        await DataService.saveTrainingPlan(changedPlan);
        alert('Training plan saved successfully!');
        window.location.href = `trainee-profile.html?id=${encodeURIComponent(traineeId)}&name=${encodeURIComponent(traineeName)}`;
    } catch (error) {
        console.error('Error saving training plan:', error);
        alert('Failed to save training plan. Please try again.');
    }
}

//a generated plan arrived from the server, map it to the frontend structure
function mapServerDataToFrontend(serverData) {
    //clean last exercises
    days.forEach(day => day.exercises = []);

    serverData.days.forEach(serverDay => {
        const dayIdx = serverDay.day - 1;
        if (days[dayIdx]) {
            const focusText = serverDay.focus.length > 0 ? `(${serverDay.focus.join(' & ')})` : '(Rest)';
            days[dayIdx].title = `${getWeekdayName(dayIdx)} ${focusText}`;

            days[dayIdx].exercises = serverDay.exercises.map(ex => ({
                id: ex.id,
                name: ex.name,
                sets: `${ex.sets}x${ex.reps}`,
                reps: ex.reps.toString(),
                rest: `${ex.restSeconds}s`
            }));
        }
    })
    //days that have no exercises will be marked as rest days
    days.forEach((day, idx) => {
        if (day.exercises.length === 0) {
            day.title = `${getWeekdayName(idx)} (Rest)`;
        }
    });
}

function getWeekdayName(idx) {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return names[idx];
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

function handleLibrarySearch(e) {
    const q = e.target.value.toLowerCase();
    const filtered = q ? LIBRARY.filter(ex => ex.name.toLowerCase().includes(q)) : LIBRARY;
    renderLibrary(filtered);
}
/* ── Render a single day card ─────────────────────────────────── */
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

    /* Drag-and-drop target */
    card.addEventListener('dragover', e => {
        e.preventDefault();
        card.classList.add('drag-over');
    });
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

    /* + Add Exercise */
    card.querySelector('.cp-day-add-btn').addEventListener('click', () => {
        const name = prompt('Exercise name:');
        if (name?.trim()) {
            day.exercises.push({ name: name.trim(), sets: '3x10', reps: '10', rest: '60s' });
            replaceCard(idx);
        }
    });

    /* Edit / Delete rows */
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
        if (e.key === 'Escape') {
            titleEl.textContent = days[idx].title;
            titleEl.blur();
        }
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