import { initTopbarBreadcrumb } from '../shared/topbar.js';
import { DataService } from '../services/dataService.js';
import { showToast } from '../shared/toast.js';
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


// Sets up the Create/Edit Training Plan page. In edit mode it loads the existing
// plan into the grid; otherwise it starts with an empty week.
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
        { label: isEditMode ? 'Edit Training Plan' : 'Create Training Plan' }
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

// Pulls an existing plan from the server and fills the weekly grid with it (edit mode).
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
        showToast('Failed to load training plan details', 'error');
    }
}



// Shows or hides a little spinner over the weekly grid while data loads.
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

// Redraws all seven day cards from the current `days` array.
function renderWeeklyGrid() {
    const grid = document.getElementById('cpWeekGrid');
    if (!grid) return;
    grid.classList.remove('is-loading');
    grid.innerHTML = '';
    days.forEach((day, i) => grid.appendChild(renderDayCard(day, i)));
}

// Hooks up the Generate, library-search, back and save buttons.
function setupEventListeners() {
    document.getElementById('cpGenerateBtn')?.addEventListener('click', handleGeneratePlan);
    document.getElementById('cpLibSearch')?.addEventListener('input', handleLibrarySearch);
    document.getElementById('cpBackBtn')?.addEventListener('click', () => history.back());
    document.getElementById('cpSaveBtn')?.addEventListener('click', handleSavePlanWithValidation);
}

// Reads the goal, days-per-week and checked muscle groups from the form.
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

// Asks the server to generate a plan from the form, then shows it in the grid.
async function handleGeneratePlan() {
    const { goal, daysPerWeek, bodyParts } = getSelectedFormData();
    const genBtn = document.getElementById('cpGenerateBtn');

    if (bodyParts.length === 0) {
        showToast('Please select at least one muscle group.', 'warning');
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
        showToast('Failed to generate training plan. Please try again.', 'error');
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

// Turns a day index (0-6) into its weekday name.
function getWeekdayName(idx) {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return names[idx];
}

// Flips a button between its normal label and a loading label.
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

// Filters the exercise library list as you type in the search box.
function handleLibrarySearch(e) {
    const q = e.target.value.toLowerCase();
    const filtered = q ? LIBRARY.filter(ex => ex.name.toLowerCase().includes(q)) : LIBRARY;
    renderLibrary(filtered);
}

// Builds one day card: the exercise table plus drag-and-drop and add/edit/delete buttons.
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

// Swaps a single day card in place after it changes (instead of redrawing the whole week).
function replaceCard(idx) {
    const grid = document.getElementById('cpWeekGrid');
    const old = grid.querySelector(`[data-day-idx="${idx}"]`);
    if (old) grid.replaceChild(renderDayCard(days[idx], idx), old);
}

// Draws the draggable exercise library list on the right side.
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

// Gathers the plan from the form, validates it, then saves it (or updates it in edit mode).
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
            showToast('Training plan saved successfully!', 'success');
            setTimeout(() => { window.location.href = `trainee-profile.html?id=${encodeURIComponent(traineeId)}`; }, 1200);
        } else {
            showToast('Failed to save the plan. Please review server output.', 'error');
        }
    } catch (error) {
        console.error('Error during saving training plan:', error);
        showToast('An error occurred while saving the plan: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M17 21v-8H7v8M7 3v5h8" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg> Save Plan`;
    }
}

// Checks the plan makes sense (goal, days, sets/reps/rest ranges, at least one exercise) before saving.
function validatePlanData(planData, totalDayCards) {
    if (!planData.goal) {
        showToast('Please select a valid goal for the training plan.', 'warning');
        return false;
    }
    if (isNaN(planData.daysPerWeek) || planData.daysPerWeek <= 0) {
        showToast('Please select the number of training days per week.', 'warning');
        return false;
    }

    if (totalDayCards === 0) {
        showToast('The training plan editor is empty. Please generate or configure your workout days first.', 'warning');
        return false;
    }

    let totalExercisesInPlan = 0;
    const dayNames = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // validate loop on every day and every exercise
    for (const day of planData.days) {
        const currentDayName = dayNames[day.dayNumber] || `Day ${day.dayNumber}`;

        for (const ex of day.exercises) {
            if (!ex.name) {
                showToast(`Validation Error on ${currentDayName}: Exercise name is required.`, 'warning');
                return false;
            }

            if (isNaN(ex.sets) || ex.sets <= 0 || ex.sets > 10) {
                showToast(`Validation Error on ${currentDayName} (${ex.name}): Sets must be between 1 and 10.`, 'warning');
                return false;
            }

            if (isNaN(ex.reps) || ex.reps <= 0 || ex.reps > 100) {
                showToast(`Validation Error on ${currentDayName} (${ex.name}): Reps must be between 1 and 100.`, 'warning');
                return false;
            }

            if (isNaN(ex.restSeconds) || ex.restSeconds < 0 || ex.restSeconds > 600) {
                showToast(`Validation Error on ${currentDayName} (${ex.name}): Rest time must be 0–600 seconds.`, 'warning');
                return false;
            }

            totalExercisesInPlan++;
        }
    }

    // validate at least one exercise in plan
    if (totalExercisesInPlan === 0) {
        showToast('Your active workout days must contain at least one exercise before saving.', 'warning');
        return false;
    }

    return true; // Validated
}