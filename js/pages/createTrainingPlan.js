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
let planId = ''; //if planid is in query params then we are on edit mode
let isEditMode = false;


document.addEventListener('DOMContentLoaded',async () => {
    const params = new URLSearchParams(window.location.search);
    traineeId = params.get('id') || '';
    traineeName = params.get('name') || '';
    planId = params.get('planId');
    isEditMode = !!planId;

    //update headers if in edit mode
    if (isEditMode) {
        const pageTitle = document.querySelector('.cp-main .cp-card-title');
        if (pageTitle) pageTitle.textContent = 'Edit Plan Settings';

        const mainHeaders = document.querySelectorAll('.cp-card-title');
        mainHeaders.forEach(h => {
            if (h.textContent.includes('Weekly Workout Editor')) {
                h.textContent = 'Edit Weekly Workout';
            }
        });
    }
    
    initTopbarBreadcrumb([
        { label: 'Trainees List', href: 'trainees.html' },
        { label: traineeName || 'Trainee', href: `trainee-profile.html?id=${encodeURIComponent(traineeId)}` },
        { label: 'Create Training Plan' }
    ]);

    //if edit mode load current plan data to grid, else load empty grid
    if (isEditMode) {
        await loadExistingPlanDetails(planId);
    } else {
        renderWeeklyGrid();
    }
    renderLibrary(LIBRARY);
    setupEventListeners();
});

async function loadExistingPlanDetails(planId) {
    setGridLoading(true);
    try {
        const plan = await DataService.getPlanById(planId)
        if (!plan) return;
        //inject plan data to the elements
        if (document.getElementById('cpGoal')) document.getElementById('cpGoal').value = plan.goal;
        if (document.getElementById('cpDays')) document.getElementById('cpDays').value = plan.daysPerWeek;
        plan.days.forEach((serverDay) => {
            const dayIdx = (serverDay.dayNumber ?? serverDay.day_number) - 1;
            if (dayIdx >= 0 && dayIdx < days.length) {
                const focusText = serverDay.exercises.length > 0 ? '' : '(Rest)';
                days[dayIdx].title = `${getWeekdayName(dayIdx)} ${focusText}`.trim();
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
        alert('Failed to load training plan details');
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
    document.getElementById('cpGenerateBtn')?.addEventListener('click', handleGeneratePlan);
    document.getElementById('cpLibSearch')?.addEventListener('input', handleLibrarySearch);
    document.getElementById('cpBackBtn')?.addEventListener('click', () => history.back());
    document.getElementById('cpSaveBtn')?.addEventListener('click', handleSavePlanWithValidation);
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
        setGridLoading(true);

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

async function handleSavePlanWithValidation() {
    const saveBtn = document.getElementById('cpSaveBtn');
    if (!saveBtn) return;

    const totalDayCards = document.querySelectorAll('.cp-day-card').length;
    const goalElement = document.getElementById('cpGoal');
    const daysPerWeekElement = document.getElementById('cpDays');

    const goal = goalElement ? goalElement.value : '';
    const daysPerWeek = daysPerWeekElement ? parseInt(daysPerWeekElement.value, 10) : NaN;

    const formattedDays = days.map((day, idx) => {
        return {
            dayNumber: idx + 1,
            exercises: (day.exercises || []).map(ex => {
                let rawSets = 3;
                if (ex.sets && typeof ex.sets === 'string' && ex.sets.includes('x')) {
                    rawSets = parseInt(ex.sets.split('x')[0], 10);
                } else if (typeof ex.sets === 'number') {
                    rawSets = ex.sets;
                } else if (ex.sets && !isNaN(parseInt(ex.sets, 10))) {
                    rawSets = parseInt(ex.sets, 10);
                }

                let rawRest = 60;
                let restValue = ex.rest || ex.restSeconds;

                if (restValue && typeof restValue === 'string') {
                    rawRest = parseInt(restValue.replace('s', ''), 10);
                } else if (typeof restValue === 'number') {
                    rawRest = restValue;
                }

                return {
                    id: ex.id || null,
                    name: (ex.name || '').trim(),
                    sets: isNaN(rawSets) ? NaN : rawSets,
                    reps: isNaN(parseInt(ex.reps, 10)) ? NaN : parseInt(ex.reps, 10),
                    restSeconds: isNaN(rawRest) ? NaN : rawRest
                };
            })
        };
    });

    const planData = {
        goal: goal,
        daysPerWeek: daysPerWeek,
        days: formattedDays
    };

    if (!isEditMode) {
        planData.traineeId = parseInt(traineeId, 10);
    }

    if (!validatePlanData(planData, totalDayCards)) {
        return;
    }

    //call to server
    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving Plan...';

        let result;

        if (isEditMode) {
            result = await DataService.updateTrainingPlan(planId, planData);
        } else {
            result = await DataService.saveTrainingPlan(planData);
        }

        if (result && result.success) {
            alert('Training plan saved successfully!');
            window.location.href = `trainee-profile.html?id=${encodeURIComponent(traineeId)}`;
        } else {
            alert('Failed to save the plan. Please review server output.');
        }
    } catch (error) {
        console.error('Error during saving training plan:', error);
        alert('An error occurred while saving the plan: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M17 21v-8H7v8M7 3v5h8" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg> Save Plan`;
    }
}

function validatePlanData(planData, totalDayCards) {
    if (!planData.goal) {
        alert('Please select a valid goal for the training plan.');
        return false;
    }
    if (isNaN(planData.daysPerWeek) || planData.daysPerWeek <= 0) {
        alert('Please select the number of training days per week.');
        return false;
    }

    if (totalDayCards === 0) {
        alert('The training plan editor is empty. Please generate or configure your workout days first.');
        return false;
    }

    let totalExercisesInPlan = 0;
    const dayNames = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // validate loop on every day and every exercise
    for (const day of planData.days) {
        const currentDayName = dayNames[day.dayNumber] || `Day ${day.dayNumber}`;

        for (const ex of day.exercises) {
            if (!ex.name) {
                alert(`Validation Error on ${currentDayName}: Exercise name is required.`);
                return false;
            }

            if (isNaN(ex.sets) || ex.sets <= 0 || ex.sets > 10) {
                alert(`Validation Error on ${currentDayName} (${ex.name}): Sets must be a positive number between 1 and 10.`);
                return false;
            }

            if (isNaN(ex.reps) || ex.reps <= 0 || ex.reps > 100) {
                alert(`Validation Error on ${currentDayName} (${ex.name}): Reps must be a positive number between 1 and 100.`);
                return false;
            }

            if (isNaN(ex.restSeconds) || ex.restSeconds < 0 || ex.restSeconds > 600) {
                alert(`Validation Error on ${currentDayName} (${ex.name}): Rest time must be a valid number of seconds (0 to 600).`);
                return false;
            }

            totalExercisesInPlan++;
        }
    }

    // validate at least one exercise in plan
    if (totalExercisesInPlan === 0) {
        alert('Your active workout days must contain at least one exercise before saving.');
        return false;
    }

    return true; // Validated
}