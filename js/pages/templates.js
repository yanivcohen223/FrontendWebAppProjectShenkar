import { DataService } from '../services/dataService.js';
import { createLoader } from '../shared/loader.js';
import { showToast, showConfirm } from '../shared/toast.js';
import { openExerciseModal } from '../shared/exerciseModal.js';

const CAPS = { workout: 10, meal: 5 };

const state = {
    type: 'workout',        // active library type
    workout: [],            // workout template list
    meal: [],               // meal template list
    trainerId: null,
    status: 'loading',      // 'loading' | 'ready' | 'error' — drives the initial-load UI
};

let tempCounter = 0;
const nextTempId = () => `tmp_${++tempCounter}`;
// Temp ids (tmp_N) are client-only placeholders for templates saved while the
// backend was unreachable. They must NEVER be sent to the backend, which needs
// real integer template ids.
const isTempId = (id) => typeof id === 'string' && id.startsWith('tmp_');

/* SVG icons */
const editSVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
const deleteSVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
const assignSVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.6"/>
    <path d="M19 8v6M22 11h-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

document.addEventListener('DOMContentLoaded', async () => {
    // base.js runs first and sets window sportieSession when authenticated.
    state.trainerId = window.sportieSession?.trainer?.id ?? null;

    wireLibrary();
    wireWorkoutBuilder();
    wireMealBuilder();
    wireAssignModal();

    // Show the spinner first, then swap in the library once the fetch resolves.
    renderLibrary();
    await loadTemplates();
    renderLibrary();
});

// Loads both workout and meal templates into memory when the page opens.
async function loadTemplates() {
    state.status = 'loading';
    let workoutOk = false, mealOk = false;
    try { state.workout = await DataService.getWorkoutTemplates(state.trainerId); workoutOk = true; }
    catch (e) { console.error('Workout templates load failed:', e); state.workout = []; }
    try { state.meal = await DataService.getMealTemplates(state.trainerId); mealOk = true; }
    catch (e) { console.error('Meal templates load failed:', e); state.meal = []; }
    // Only a true error state when nothing could be fetched at all.
    state.status = (workoutOk || mealOk) ? 'ready' : 'error';
}

// Re-fetches just one kind of template (workout or meal) from the server.
async function reloadType(type) {
    try {
        state[type] = type === 'workout'
            ? await DataService.getWorkoutTemplates(state.trainerId)
            : await DataService.getMealTemplates(state.trainerId);
        return true;
    } catch (e) {
        console.error(`Reload ${type} failed:`, e);
        return false;
    }
}

/* LIBRARY VIEW  */
function wireLibrary() {
    document.getElementById('tplTypeToggle').addEventListener('click', e => {
        const btn = e.target.closest('.tpl-seg-btn');
        if (!btn) return;
        state.type = btn.dataset.type;
        document.querySelectorAll('#tplTypeToggle .tpl-seg-btn')
            .forEach(b => b.classList.toggle('active', b === btn));
        renderLibrary();
    });

    document.getElementById('tplNewBtn').addEventListener('click', () => {
        if (state[state.type].length >= CAPS[state.type]) return; // disabled at cap
        if (state.type === 'workout') openWorkoutBuilder(null);
        else openMealBuilder(null);
    });
}

// Redraws the usage counter and the grid of template cards.
function renderLibrary() {
    renderUsage();
    renderGrid();
}

// Updates the "x / 10" counter and disables "+ New" once you hit the cap.
function renderUsage() {
    const list = state[state.type];
    const cap = CAPS[state.type];
    const atCap = list.length >= cap;
    // Until the fetch resolves we don't know the real count — show "… / cap" and
    // hold off on creating so we can't blow past the cap.
    const pending = state.status !== 'ready';

    const usageEl = document.getElementById('tplUsage');
    usageEl.classList.toggle('warn', atCap && !pending);
    usageEl.innerHTML =
        `<span class="tpl-usage-count">${pending ? '…' : list.length} / ${cap}</span>` +
        `<span class="tpl-usage-type">${state.type} templates</span>` +
        (atCap && !pending ? `<span class="tpl-usage-msg">Limit reached — delete one to add more</span>` : '');

    const newBtn = document.getElementById('tplNewBtn');
    newBtn.disabled = pending || atCap;
    newBtn.title = atCap ? 'Limit reached — delete one to add more' : '';
}

// Builds a centered state block (error message) reusing the analytics page's
// text styling. `children` are the inner nodes (title, text, etc.).
function buildStateBlock(children) {
    const wrap = document.createElement('div');
    wrap.className = 'analytics-state tpl-state';
    children.forEach(c => wrap.appendChild(c));
    return wrap;
}
function stateEl(tag, cls, text) {
    const node = document.createElement(tag);
    node.className = cls;
    if (text != null) node.textContent = text;
    return node;
}

// Draws a card for each template of the active type, or a loading / error /
// empty state depending on where the initial fetch is.
function renderGrid() {
    const grid = document.getElementById('tplGrid');
    const list = state[state.type];
    grid.innerHTML = '';

    // Initial load: the shared loader, spanning the grid.
    if (state.status === 'loading') {
        grid.appendChild(createLoader('Loading…', 'loader--grid'));
        return;
    }

    // Both fetches failed — surface an error instead of a misleading "empty".
    if (state.status === 'error') {
        grid.appendChild(buildStateBlock([
            stateEl('p', 'analytics-state-title', "Couldn't load templates"),
            stateEl('p', 'analytics-state-text', 'Please refresh the page to try again.'),
        ]));
        return;
    }

    if (!list.length) {
        const empty = document.createElement('div');
        empty.className = 'tpl-empty';
        empty.innerHTML = state.type === 'workout'
            ? `<div class="tpl-empty-title">No workout templates yet</div>
               <div class="tpl-empty-text">Create a reusable workout you can generate, tweak and assign to any trainee.</div>`
            : `<div class="tpl-empty-title">No meal templates yet</div>
               <div class="tpl-empty-text">Build a daily meal structure with a variety of options per slot.</div>`;
        grid.appendChild(empty);
        return;
    }

    list.forEach(tpl => grid.appendChild(
        state.type === 'workout' ? buildWorkoutCard(tpl) : buildMealCard(tpl)
    ));
}

// Builds the little summary line for a workout template card.
function buildWorkoutCard(tpl) {
    const blocks = tpl.blocks || [];
    const exCount = blocks.reduce((n, b) => n + (b.type === 'rest' ? 0 : (b.exercises || []).length), 0);
    const restCount = blocks.filter(b => b.type === 'rest').length;
    const modeLabel = tpl.mode === 'abstract'
        ? `${blocks.length} trainings`
        : `${tpl.daysPerWeek || blocks.length} days`;
    const summary = [modeLabel, tpl.goal, `${exCount} exercises`, restCount ? `${restCount} rest` : '']
        .filter(Boolean).join(' · ');
    return buildCard(tpl, '🏋️', summary);
}

// Builds the little summary line for a meal template card.
function buildMealCard(tpl) {
    const slots = tpl.slots || [];
    const optCount = slots.reduce((n, s) => n + (s.options || []).length, 0);
    const summary = [`${slots.length} meals`, `${optCount} options`].join(' · ');
    return buildCard(tpl, '🍽️', summary);
}

// Builds one template card: name, summary, and the Edit / Assign / Delete buttons.
function buildCard(tpl, emoji, summary) {
    const card = document.createElement('div');
    card.className = 'tpl-card-item';
    card.innerHTML = `
        <div class="tpl-card-item-top">
            <div class="tpl-card-item-emoji">${emoji}</div>
            <div class="tpl-card-item-name" title="${escapeHtml(tpl.name || 'Untitled')}">${escapeHtml(tpl.name || 'Untitled')}</div>
        </div>
        <div class="tpl-card-item-summary">${escapeHtml(summary)}</div>
        <div class="tpl-card-item-actions">
            <button class="tpl-act tpl-act-edit"   type="button" data-act="edit">${editSVG}<span>Edit</span></button>
            <button class="tpl-act tpl-act-assign" type="button" data-act="assign">${assignSVG}<span>Assign</span></button>
            <button class="tpl-act tpl-act-delete" type="button" data-act="delete">${deleteSVG}<span>Delete</span></button>
        </div>`;

    card.querySelector('[data-act="edit"]').addEventListener('click', () => {
        if (state.type === 'workout') openWorkoutBuilder(tpl);
        else openMealBuilder(tpl);
    });
    card.querySelector('[data-act="assign"]').addEventListener('click', () => openAssign(tpl));
    card.querySelector('[data-act="delete"]').addEventListener('click', () => handleDelete(tpl));
    return card;
}

// Deletes a template after the user confirms.
async function handleDelete(tpl) {
    const ok = await showConfirm(
        `"${tpl.name || 'Untitled'}" will be permanently removed. This cannot be undone.`,
        { title: 'Delete template?', confirmText: 'Delete', variant: 'danger' }
    );
    if (!ok) return;
    const type = state.type;

    // A temp template was never saved to the backend — just drop it locally.
    if (isTempId(tpl.id)) {
        state[type] = state[type].filter(t => t.id !== tpl.id);
        renderLibrary();
        return;
    }

    try {
        await DataService.deleteTemplate(type, tpl.id);
        await reloadType(type);
    } catch (e) {
        console.warn('Delete fell back to in-memory:', e.message);
        state[type] = state[type].filter(t => t.id !== tpl.id);
    }
    renderLibrary();
}

// Saves a template to the server. If the backend isn't there yet, keeps it in memory instead.
async function persistTemplate(type, payload) {
    const create = type === 'workout'
        ? DataService.saveWorkoutTemplate.bind(DataService)
        : DataService.saveMealTemplate.bind(DataService);
    const update = type === 'workout'
        ? DataService.updateWorkoutTemplate.bind(DataService)
        : DataService.updateMealTemplate.bind(DataService);

    // A temp id means this template only ever lived in memory — send it as a new
    // insert (no id) so the backend creates a real row, then adopt that real id.
    const editingTempId = isTempId(payload.id) ? payload.id : null;
    const outgoing = editingTempId ? { ...payload, id: undefined } : payload;

    // A real (non-temp) id means the row exists on the backend — update it (PUT)
    // instead of creating a duplicate. Everything else is a create (POST).
    const realId = (payload.id != null && !isTempId(payload.id)) ? payload.id : null;
    const fn = realId != null ? (data => update(realId, data)) : create;

    try {
        const body = await fn(outgoing);
        const realId = body?.templateId ?? body?.template_id ?? body?.id ?? null;

        // Forget the in-memory temp copy we just replaced with a real saved row.
        if (editingTempId) state[type] = state[type].filter(t => t.id !== editingTempId);

        // Re-fetch the authoritative list (real db ids). If that GET isn't reachable,
        // at least keep an in-memory record carrying the real id from the response.
        const reloaded = await reloadType(type);
        if (!reloaded && realId != null) {
            const rec = { ...outgoing, id: realId };
            const idx = state[type].findIndex(t => t.id === realId);
            if (idx >= 0) state[type][idx] = rec; else state[type].push(rec);
        }
        return true;
    } catch (e) {
        console.warn(`${type} template save fell back to in-memory:`, e.message);
        const list = state[type];
        const rec = { ...payload, id: payload.id || nextTempId() };
        const idx = list.findIndex(t => t.id === rec.id);
        if (idx >= 0) list[idx] = rec; else list.push(rec);
        return false;
    }
}

/* WORKOUT BUILDER */
const wb = {
    editingId: null,
    mode: 'day-specific',
    days: [],        
    trainings: [],  
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TRAINING_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const MAX_TRAININGS = 7;
const BLOCK_TYPES = [['workout', 'Workout'], ['cardio', 'Cardio'], ['rest', 'Rest']];

const MAX_BLOCKS = 7;

const MUSCLE_GROUPS = [
    { label: 'Chest', api: ['chest'], default: true },
    { label: 'Back', api: ['back'], default: true },
    { label: 'Legs', api: ['upper legs', 'lower legs'], default: true },
    { label: 'Shoulders', api: ['shoulders'], default: true },
    { label: 'Biceps', api: ['upper arms'] },
    { label: 'Triceps', api: ['upper arms'] },
    { label: 'Forearms', api: ['lower arms'] },
    { label: 'Abs', api: ['waist'] },
    { label: 'Neck', api: ['neck'] },
    { label: 'Cardio', api: ['cardio'] },
];

const newExercise = (name) => ({ name, sets: 3, reps: 10, rest: 60 });
const makeDay = (i) => ({ title: `${WEEKDAYS[i] || `Day ${i + 1}`} (Day ${i + 1})`, type: 'workout', notes: '', exercises: [] });
const makeDays = (n) => Array.from({ length: n }, (_, i) => makeDay(i));
const makeTraining = (i) => ({ title: `Training ${TRAINING_LETTERS[i] || (i + 1)}`, type: 'workout', notes: '', exercises: [] });
const makeTrainings = (n) => Array.from({ length: n }, (_, i) => makeTraining(i));

// Generic debounce (used for the live exercise-library search).
function debounce(fn, ms) {
    let t = null;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Hooks up all the buttons and inputs in the workout builder (runs once on load).
function wireWorkoutBuilder() {
    document.getElementById('wbCloseBtn').addEventListener('click', () => hideOverlay('tplWorkoutBuilder'));
    document.getElementById('wbCancelBtn').addEventListener('click', () => hideOverlay('tplWorkoutBuilder'));
    document.getElementById('wbSaveBtn').addEventListener('click', handleSaveWorkout);
    document.getElementById('wbGenerateBtn').addEventListener('click', handleGenerateWorkout);

    document.getElementById('wbModeToggle').addEventListener('click', e => {
        const btn = e.target.closest('.tpl-seg-btn');
        if (!btn || wb.mode === btn.dataset.mode) return;   // no-op if already active
        wb.mode = btn.dataset.mode;
        document.querySelectorAll('#wbModeToggle .tpl-seg-btn')
            .forEach(b => b.classList.toggle('active', b === btn));
        // Reset the now-active block set so the two modes never merge.
        if (wb.mode === 'abstract') {
            wb.trainings = makeTrainings(1);                 // start with Training A
        } else {
            wb.days = makeDays(parseInt(document.getElementById('wbDays').value, 10) || 4);
        }
        applyWorkoutMode();
    });

    document.getElementById('wbGoal').addEventListener('change', () => {
        setFieldError(document.getElementById('wbGoal'), false);
    });

    document.getElementById('wbDays').addEventListener('change', e => {
        setFieldError(e.target, false);
        const n = parseInt(e.target.value, 10) || 4;
        if (n > wb.days.length) wb.days.push(...makeDays(n).slice(wb.days.length));
        else wb.days = wb.days.slice(0, n);
        renderWorkoutEditor();
    });

    // Live exercise-library search via DataService.searchExercises (backend-proxied), debounced.
    const debouncedSearch = debounce(q => loadExerciseLibrary(q), 250);
    document.getElementById('wbLibSearch').addEventListener('input', e => debouncedSearch(e.target.value));

    renderMuscleGroups();
}

// Build the muscle-group checkboxes from MUSCLE_GROUPS (single source of truth).
function renderMuscleGroups() {
    const c = document.getElementById('wbMuscles');
    if (!c) return;
    c.innerHTML = MUSCLE_GROUPS.map(g =>
        `<label class="tpl-check-label">
            <input type="checkbox" data-api='${escapeAttr(JSON.stringify(g.api))}' ${g.default ? 'checked' : ''}> ${escapeHtml(g.label)}
        </label>`).join('');
}

// Opens the workout builder — blank for a new template, or filled in from an existing one.
function openWorkoutBuilder(tpl) {
    wb.editingId = tpl ? tpl.id : null;
    wb.mode = tpl?.mode || 'day-specific';

    const blocks = clone(tpl?.blocks || []).map(b => ({
        title: b.label || b.title || '',
        type: b.type || 'workout',
        notes: b.notes || '',
        exercises: b.exercises || [],
    }));
    const daysPerWeek = tpl?.daysPerWeek || 4;

    // Load saved blocks into the matching array; seed the other with defaults
    // so toggling mode mid-edit always has something to show.
    if (wb.mode === 'abstract') {
        wb.trainings = blocks.length ? blocks.slice(0, MAX_TRAININGS) : makeTrainings(1);
        wb.days = makeDays(daysPerWeek);
    } else {
        wb.days = blocks.length ? blocks : makeDays(daysPerWeek);
        wb.trainings = makeTrainings(1);
    }

    document.getElementById('wbTitle').textContent = tpl ? 'Edit Workout Template' : 'New Workout Template';
    document.getElementById('wbName').value = tpl?.name || '';
    setSelectValue(document.getElementById('wbGoal'), tpl?.goal || '');
    setSelectValue(document.getElementById('wbDays'), tpl?.daysPerWeek != null ? String(tpl.daysPerWeek) : '');

    document.querySelectorAll('#wbModeToggle .tpl-seg-btn')
        .forEach(b => b.classList.toggle('active', b.dataset.mode === wb.mode));

    applyWorkoutMode();
    loadExerciseLibrary('');
    showOverlay('tplWorkoutBuilder');
}

// Shows either the weekday blocks or the training blocks (never both) and hides the fields that don't apply.
function applyWorkoutMode() {
    const dayField = document.getElementById('wbDaysField');
    const grid = document.getElementById('wbWeekGrid');
    const pool = document.getElementById('wbPool');
    const editorTitle = document.getElementById('wbEditorTitle');
    const abstract = wb.mode === 'abstract';

    // Use explicit display (NOT the `hidden` attr): .tpl-week-grid sets
    // display:grid, which would override [hidden]'s display:none and leak the
    // weekday cards into abstract mode. Clear the inactive container so the two
    // block sets can never appear at once.
    dayField.style.display = abstract ? 'none' : '';
    grid.style.display = abstract ? 'none' : 'grid';
    pool.style.display = abstract ? 'block' : 'none';
    if (abstract) grid.innerHTML = '';
    else pool.innerHTML = '';
    editorTitle.textContent = abstract ? 'Training Blocks' : 'Weekly Editor';
    renderWorkoutEditor();
}

// Draws whichever block set matches the current mode.
function renderWorkoutEditor() {
    if (wb.mode === 'abstract') renderTrainings();
    else renderDays();
}

// Draws the seven weekday blocks (day-specific mode).
function renderDays() {
    const grid = document.getElementById('wbWeekGrid');
    grid.innerHTML = '';
    wb.days.forEach((block, i) => grid.appendChild(renderBlockCard(block, i, wb.days, 'day')));
}

// Draws the Training A/B/C blocks plus the "+ Add Training" button (abstract mode).
function renderTrainings() {
    const pool = document.getElementById('wbPool');
    pool.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'tpl-week-grid';
    wb.trainings.forEach((block, i) => grid.appendChild(renderBlockCard(block, i, wb.trainings, 'training')));
    pool.appendChild(grid);

    if (wb.trainings.length < MAX_TRAININGS) {
        const add = document.createElement('button');
        add.className = 'tpl-add-training-btn';
        add.type = 'button';
        add.textContent = '+ Add Training';
        add.addEventListener('click', () => {
            wb.trainings.push(makeTraining(wb.trainings.length));
            renderTrainings();
        });
        pool.appendChild(add);
    }
}

/* One block card: editable title + Workout/Cardio/Rest type selector + reorder/
   insert/remove controls + a body that depends on the type:
     workout → exercise area (drag/add)
     cardio  → a free-text note field (no exercises)
     rest    → empty
   Works for both day-specific and abstract blocks. */
function renderBlockCard(block, idx, blocks, kind) {
    const isRest = block.type === 'rest';
    const isCardio = block.type === 'cardio';
    const card = document.createElement('div');
    card.className = 'tpl-day-card' + (isRest ? ' tpl-block-rest' : '');

    const reRender = () => card.replaceWith(renderBlockCard(block, idx, blocks, kind));

    // Header: title + type selector + order/insert/remove controls
    const header = document.createElement('div');
    header.className = 'tpl-block-header';

    const title = document.createElement('span');
    title.className = 'tpl-day-title';
    title.contentEditable = 'plaintext-only';
    title.spellcheck = false;
    title.textContent = block.title;
    title.addEventListener('blur', () => { block.title = title.textContent.trim() || block.title; });
    title.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); title.blur(); }
        if (e.key === 'Escape') { title.textContent = block.title; title.blur(); }
    });
    header.appendChild(title);

    const controls = document.createElement('div');
    controls.className = 'tpl-block-controls';
    controls.appendChild(buildTypeSeg(block, reRender));
    controls.appendChild(buildBlockOrderControls(idx, blocks, kind));
    header.appendChild(controls);
    card.appendChild(header);

    // Rest → empty
    if (isRest) {
        const rest = document.createElement('div');
        rest.className = 'tpl-rest-state';
        rest.textContent = 'Rest day — no exercises';
        card.appendChild(rest);
        return card;
    }

    // Cardio → free-text note (no exercise list)
    if (isCardio) {
        const ta = document.createElement('textarea');
        ta.className = 'tpl-cardio-note';
        ta.placeholder = 'Cardio details — e.g. 30 min run, moderate pace';
        ta.value = block.notes || '';
        ta.addEventListener('input', () => { block.notes = ta.value; });
        card.appendChild(ta);
        return card;
    }

    // Workout → exercise area
    const body = document.createElement('div');
    body.className = 'tpl-day-body';
    renderExerciseRows(body, block.exercises, reRender);
    card.appendChild(body);

    card.appendChild(makeAddBtn(() => {
        const name = prompt('Exercise name:');
        if (name?.trim()) { block.exercises.push(newExercise(name.trim())); reRender(); }
    }));

    wireDropTarget(card, name => { block.exercises.push(newExercise(name)); reRender(); });
    return card;
}

/* Workout / Cardio / Rest segmented selector Warns before leaving a workout */
function buildTypeSeg(block, onChange) {
    const seg = document.createElement('div');
    seg.className = 'tpl-seg tpl-seg-sm tpl-type-seg';
    BLOCK_TYPES.forEach(([val, label]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tpl-seg-btn' + (block.type === val ? ' active' : '');
        b.textContent = label;
        b.addEventListener('click', async () => {
            if (block.type === val) return;
            if (block.type === 'workout' && val !== 'workout' && (block.exercises || []).length) {
                const dest = val === 'cardio' ? 'Cardio' : 'Rest';
                const ok = await showConfirm(
                    `This block has ${block.exercises.length} exercise(s). They'll be hidden while it's a ${dest} block (kept if you switch back, but not included when you save).`,
                    { title: 'Change block type?', confirmText: 'Continue', variant: 'warning' }
                );
                if (!ok) return;
            }
            block.type = val;
            onChange();
        });
        seg.appendChild(b);
    });
    return seg;
}

/* Reorder (↑/↓), insert-below (+) and remove (trash) for a block. Structural
   changes re-render the whole editor so indices/letters stay correct. */
function buildBlockOrderControls(idx, blocks, kind) {
    const wrap = document.createElement('div');
    wrap.className = 'tpl-block-order';
    const last = blocks.length - 1;

    const mkBtn = (label, titleText, disabled, onClick) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tpl-ex-icon-btn tpl-order-btn';
        b.title = titleText;
        b.textContent = label;
        b.disabled = disabled;
        if (!disabled) b.addEventListener('click', onClick);
        return b;
    };

    wrap.appendChild(mkBtn('↑', 'Move up', idx === 0, () => moveBlock(blocks, idx, idx - 1, kind)));
    wrap.appendChild(mkBtn('↓', 'Move down', idx === last, () => moveBlock(blocks, idx, idx + 1, kind)));
    wrap.appendChild(mkBtn('+', 'Insert below', blocks.length >= MAX_BLOCKS, () => insertBlock(blocks, idx, kind)));

    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'tpl-ex-icon-btn tpl-block-remove';
    rm.title = kind === 'training' ? 'Remove training' : 'Remove day';
    rm.innerHTML = deleteSVG;
    rm.addEventListener('click', () => removeBlock(blocks, idx, kind));
    wrap.appendChild(rm);

    return wrap;
}

// Moves a block up or down within its list.
function moveBlock(blocks, from, to, kind) {
    if (to < 0 || to >= blocks.length) return;
    const [b] = blocks.splice(from, 1);
    blocks.splice(to, 0, b);
    afterBlockChange(kind);
}

// Inserts a fresh block right after the given one (up to 7 total).
function insertBlock(blocks, idx, kind) {
    if (blocks.length >= MAX_BLOCKS) { toast(`Up to ${MAX_BLOCKS} blocks.`); return; }
    const pos = idx + 1;
    blocks.splice(pos, 0, kind === 'training' ? makeTraining(pos) : makeDay(pos));
    afterBlockChange(kind);
}

// Removes a block, but always keeps at least one around.
function removeBlock(blocks, idx, kind) {
    if (blocks.length <= 1) { toast('At least one block is required.'); return; }
    blocks.splice(idx, 1);
    afterBlockChange(kind);
}

// Re-letters training blocks if needed, then redraws the editor after a structural change.
function afterBlockChange(kind) {
    if (kind === 'training') renumberTrainings();
    renderWorkoutEditor();
}

// Keep abstract block letters sequential by position (preserving any "(focus)" suffix).
function renumberTrainings() {
    wb.trainings.forEach((b, i) => {
        const letter = TRAINING_LETTERS[i] || (i + 1);
        const m = b.title && b.title.match(/\(([^)]*)\)\s*$/);
        b.title = `Training ${letter}${m ? ` (${m[1]})` : ''}`;
    });
}

/* Shared: render the exercise rows (name + sets/reps/rest inputs + delete). */
function renderExerciseRows(container, exercises, rerender, kind) {
    container.innerHTML = '';
    if (!exercises.length) {
        const empty = document.createElement('div');
        empty.className = 'tpl-day-empty';
        const what = kind === 'cardio' ? 'cardio exercises' : 'exercises';
        empty.innerHTML = `Drag ${what} from the library<br>or click <strong>+ Add Exercise</strong>`;
        container.appendChild(empty);
        return;
    }

    const table = document.createElement('table');
    table.className = 'tpl-ex-table';
    table.innerHTML = `<thead><tr>
        <th class="tpl-ex-name">Exercise</th>
        <th class="tpl-ex-num">Sets</th>
        <th class="tpl-ex-num">Reps</th>
        <th class="tpl-ex-num">Rest s</th>
        <th></th>
    </tr></thead>`;
    const tbody = document.createElement('tbody');

    exercises.forEach((ex, exIdx) => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.className = 'tpl-ex-name';
        tdName.title = ex.name;
        tdName.textContent = ex.name;
        tr.appendChild(tdName);

        ['sets', 'reps', 'rest'].forEach(key => {
            const td = document.createElement('td');
            td.className = 'tpl-ex-num';
            const inp = document.createElement('input');
            inp.type = 'number';
            inp.min = '0';
            inp.className = 'tpl-ex-input';
            inp.value = ex[key];
            inp.addEventListener('change', () => { ex[key] = parseInt(inp.value, 10) || 0; });
            td.appendChild(inp);
            tr.appendChild(td);
        });

        const tdAct = document.createElement('td');
        const del = document.createElement('button');
        del.className = 'tpl-ex-icon-btn';
        del.type = 'button';
        del.title = 'Remove';
        del.innerHTML = deleteSVG;
        del.addEventListener('click', () => { exercises.splice(exIdx, 1); rerender(); });
        tdAct.appendChild(del);
        tr.appendChild(tdAct);

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

// Makes a "+ Add Exercise" button that runs the given action.
function makeAddBtn(onClick) {
    const btn = document.createElement('button');
    btn.className = 'tpl-day-add-btn';
    btn.type = 'button';
    btn.textContent = '+ Add Exercise';
    btn.addEventListener('click', onClick);
    return btn;
}

// Lets a card accept an exercise dragged in from the library.
function wireDropTarget(card, onDrop) {
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const name = e.dataTransfer.getData('text/plain');
        if (name) onDrop(name);
    });
}

// Searches the exercise library (backend) and lists the draggable results.
async function loadExerciseLibrary(query) {
    const list = document.getElementById('wbLibList');
    if (!list) return;

    list.innerHTML = `<div class="tpl-lib-empty">Loading…</div>`;

    let items = [];
    try {
        items = await DataService.searchExercises(query);
        if (!Array.isArray(items)) throw new Error('Unexpected response from exercise search');
    } catch (err) {
        console.error('Exercise search failed:', err);
        list.innerHTML = `
            <div class="tpl-lib-error">
                <span>Failed to load exercises</span>
                <button class="tpl-lib-retry-btn">Retry</button>
            </div>`;
        list.querySelector('.tpl-lib-retry-btn')?.addEventListener('click', () => loadExerciseLibrary(query));
        return;
    }

    list.innerHTML = '';
    if (!items.length) {
        list.innerHTML = `<div class="tpl-lib-empty">No exercises found</div>`;
        return;
    }
    items.forEach(ex => {
        const item = document.createElement('div');
        item.className = 'tpl-lib-item';
        item.draggable = true;
        item.innerHTML = `
            <div class="tpl-lib-item-main">
                <span class="tpl-lib-item-name">${escapeHtml(ex.name)}</span>
                ${ex.target ? `<span class="tpl-lib-item-target">${escapeHtml(ex.target)}</span>` : ''}
            </div>
            <span class="tpl-lib-drag-handle">⠿</span>`;
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

// Marks a field element as invalid (or clears the mark). Returns the element for chaining.
function setFieldError(el, hasError) {
    el.classList.toggle('tpl-field-error', hasError);
    return el;
}

// Generates a plan from the form and drops it into the builder so the trainer can tweak it.
async function handleGenerateWorkout() {
    const goalEl = document.getElementById('wbGoal');
    const goal = goalEl.value.toLowerCase();

    // Validate required fields before calling the backend.
    let valid = true;
    if (!goal) {
        setFieldError(goalEl, true);
        showToast('Goal is required to generate a plan.', 'warning');
        valid = false;
    } else {
        setFieldError(goalEl, false);
    }

    const daysEl = document.getElementById('wbDays');
    const daysPerWeek = parseInt(daysEl.value, 10);
    if (!daysPerWeek) {
        setFieldError(daysEl, true);
        showToast('Days per Week is required to generate a plan.', 'warning');
        valid = false;
    } else {
        setFieldError(daysEl, false);
    }

    // Friendly labels → API body-part values (deduped; Legs/Biceps/Triceps expand).
    const checked = [...document.querySelectorAll('#wbMuscles input:checked')];
    const bodyParts = [...new Set(checked.flatMap(c => JSON.parse(c.dataset.api || '[]')))];
    if (!bodyParts.length) {
        showToast('Please select at least one muscle group.', 'warning');
        valid = false;
    }

    if (!valid) return;

    const btn = document.getElementById('wbGenerateBtn');
    setLoading(btn, true, 'Generating…');
    try {
        const data = await DataService.generateTrainingPlan({ goal, daysPerWeek, bodyParts, exercisesPerDay: 4 });
        applyGeneratedPlan(data, daysPerWeek);
        renderWorkoutEditor();
    } catch (e) {
        console.error('Generate failed:', e);
        showToast('Failed to generate plan. You can still build it manually.', 'error');
    } finally {
        setLoading(btn, false, 'Generate');
    }
}

/* Map a server-generated plan into the builder. Day-specific fills the weekday
   blocks (empty days become Rest); abstract turns each non-empty server day into
   a Training block. */
function applyGeneratedPlan(serverData, daysPerWeek) {
    const toEx = ex => ({ name: ex.name, sets: ex.sets ?? 3, reps: ex.reps ?? 10, rest: ex.restSeconds ?? 60 });
    const serverDays = serverData?.days || [];

    if (wb.mode === 'abstract') {
        const filled = serverDays
            .filter(d => (d.exercises || []).length)
            .slice(0, MAX_TRAININGS)
            .map((d, i) => {
                const focus = (d.focus && d.focus.length) ? ` (${d.focus.join(' & ')})` : '';
                return { title: `Training ${TRAINING_LETTERS[i] || (i + 1)}${focus}`, type: 'workout', notes: '', exercises: (d.exercises || []).map(toEx) };
            });
        wb.trainings = filled.length ? filled : makeTrainings(1);
        return;
    }

    wb.days = makeDays(daysPerWeek);
    serverDays.forEach(sd => {
        const idx = (sd.day || 1) - 1;
        if (!wb.days[idx]) return;
        const exercises = (sd.exercises || []).map(toEx);
        const focus = (sd.focus && sd.focus.length) ? `(${sd.focus.join(' & ')})` : '(Rest)';
        wb.days[idx].title = `${WEEKDAYS[idx] || `Day ${idx + 1}`} ${focus}`;
        wb.days[idx].exercises = exercises;
        wb.days[idx].type = exercises.length ? 'workout' : 'rest';
    });
    // Days the generator left empty are rest days.
    wb.days.forEach(d => { if (!d.exercises.length) d.type = 'rest'; });
}

// Collects every block into a payload and saves the workout template.
async function handleSaveWorkout() {
    const name = document.getElementById('wbName').value.trim();
    if (!name) { showToast('Please give the template a name.', 'warning'); return; }

    const goal = document.getElementById('wbGoal').value;
    const daysPerWeek = parseInt(document.getElementById('wbDays').value, 10) || 4;

    const sourceBlocks = wb.mode === 'abstract' ? wb.trainings : wb.days;
    const blocks = sourceBlocks.map((b, i) => ({
        index: i,
        label: b.title,
        type: b.type,                                             
        notes: b.type === 'cardio' ? (b.notes || '') : '',        
        dayIndex: wb.mode === 'day-specific' ? i + 1 : null,      
        trainingLetter: wb.mode === 'abstract' ? (TRAINING_LETTERS[i] || null) : null,
        exercises: b.type === 'workout' ? b.exercises : [],       
    }));

    const payload = {
        id: wb.editingId || undefined,
        trainerId: state.trainerId,
        name,
        mode: wb.mode,
        goal,
        daysPerWeek: wb.mode === 'day-specific' ? blocks.length : null,
        blocks,
    };

    console.log('[templates] workout template payload', payload);
    const btn = document.getElementById('wbSaveBtn');
    setLoading(btn, true, 'Saving…');
    const hitServer = await persistTemplate('workout', payload);
    setLoading(btn, false, 'Save Template');

    hideOverlay('tplWorkoutBuilder');
    if (state.type !== 'workout') { state.type = 'workout'; syncTypeToggle(); }
    renderLibrary();
    if (!hitServer) toast('Saved in memory (templates backend pending).');
}

/* MEAL BUILDER */
const mb = {
    editingId: null,
    slots: [],       // [{ label, options:[option], _search:[] }]
    targets: null,   // generated daily macro estimate { kcal, protein, carbs, fat }
};

const MEAL_UNITS = ['g', 'ml', 'scoop', 'piece'];
const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat', 'sugar', 'fiber'];
const emptyMacros = () => MACRO_KEYS.reduce((o, k) => (o[k] = 0, o), {});

// An option = a meal choice with quantity + per-100g macros. The app scales
// per-100g × quantity/100 to get the option's actual macros.
function makeOption(o = {}) {
    return {
        source: o.source || 'custom',           // 'mealdb' | 'custom'
        mealId: o.mealId ?? null,
        name: o.name || '',
        thumb: o.thumb ?? null,
        quantity: o.quantity ?? 100,
        unit: o.unit || 'g',
        per100: { ...emptyMacros(), ...(o.per100 || o.per100g || {}) },
    };
}

const round1 = n => Math.round((Number(n) || 0) * 10) / 10;

// Scale per-100g macros by quantity (per100 × qty / 100).
function scaleMacros(per100, quantity) {
    const f = (Number(quantity) || 0) / 100;
    return MACRO_KEYS.reduce((o, k) => (o[k] = round1((per100[k] || 0) * f), o), {});
}

// Hooks up the meal builder's buttons (runs once on load).
function wireMealBuilder() {
    document.getElementById('mbCloseBtn').addEventListener('click', () => hideOverlay('tplMealBuilder'));
    document.getElementById('mbCancelBtn').addEventListener('click', () => hideOverlay('tplMealBuilder'));
    document.getElementById('mbSaveBtn').addEventListener('click', handleSaveMeal);
    document.getElementById('mbAddSlotBtn').addEventListener('click', () => {
        mb.slots.push({ label: `Meal ${mb.slots.length + 1}`, options: [], _search: [] });
        renderSlots();
    });
}

// Opens the meal builder 
function openMealBuilder(tpl) {
    mb.editingId = tpl ? tpl.id : null;
    mb.targets = tpl?.targets || null;
    mb.slots = tpl
        ? clone(tpl.slots || []).map(s => ({ label: s.label || '', options: (s.options || []).map(makeOption), _search: [] }))
        : [
            { label: 'Breakfast', options: [], _search: [] },
            { label: 'Lunch', options: [], _search: [] },
            { label: 'Dinner', options: [], _search: [] },
        ];
    // Always ensure Breakfast, Lunch, Dinner are present (empty if not in the saved template)
    const _existingLabels = mb.slots.map(s => s.label.trim().toLowerCase());
    ['Breakfast', 'Lunch', 'Dinner'].forEach(lbl => {
        if (!_existingLabels.includes(lbl.toLowerCase()))
            mb.slots.push({ label: lbl, options: [], _search: [] });
    });
    document.querySelector('#tplMealBuilder .tpl-builder-title').textContent =
        tpl ? 'Edit Meal Template' : 'New Meal Template';
    document.getElementById('mbName').value = tpl?.name || '';
    renderMacroBar();
    renderSlots();
    showOverlay('tplMealBuilder');
}

// Draws all the meal slots, then refreshes the daily macro totals.
function renderSlots() {
    const container = document.getElementById('mbSlots');
    container.innerHTML = '';
    if (!mb.slots.length) {
        container.innerHTML = `<div class="tpl-day-empty">No meal slots yet — click <strong>+ Add Meal Slot</strong></div>`;
        return;
    }
    mb.slots.forEach((slot, idx) => container.appendChild(renderSlot(slot, idx)));
    recomputeMealTotals();
}

// Draws one meal slot: its options, the MealDB search box, and the add buttons.
function renderSlot(slot, idx) {
    const card = document.createElement('div');
    card.className = 'tpl-slot-card';

    // Header: label input + remove
    const head = document.createElement('div');
    head.className = 'tpl-slot-head';
    head.innerHTML = `
        <span class="tpl-slot-index">${idx + 1}</span>
        <input type="text" class="tpl-input tpl-slot-label" placeholder="Slot label (e.g. Breakfast)" value="${escapeAttr(slot.label)}">
        <button class="tpl-ex-icon-btn tpl-slot-remove" type="button" title="Remove slot">${deleteSVG}</button>`;
    head.querySelector('.tpl-slot-label').addEventListener('change', e => { slot.label = e.target.value; });
    head.querySelector('.tpl-slot-remove').addEventListener('click', () => { mb.slots.splice(idx, 1); renderSlots(); });
    card.appendChild(head);

    // Options grid
    const opts = document.createElement('div');
    opts.className = 'tpl-option-grid';
    if (!slot.options.length) {
        opts.innerHTML = `<div class="tpl-option-empty">No options yet — add from MealDB or a custom entry below.</div>`;
    } else {
        slot.options.forEach((opt, oIdx) => opts.appendChild(renderOptionCard(slot, opt, oIdx)));
    }
    card.appendChild(opts);

    // MealDB search + custom add row
    const tools = document.createElement('div');
    tools.className = 'tpl-slot-tools';
    tools.innerHTML = `
        <div class="tpl-lib-search-wrap tpl-meal-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
                <circle cx="11" cy="11" r="8" stroke="#878787" stroke-width="2"/>
                <path d="M21 21l-4.35-4.35" stroke="#878787" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <input type="text" class="tpl-lib-search tpl-meal-search" placeholder="Search MealDB (e.g. chicken)">
        </div>
        <button class="tpl-btn-ghost tpl-meal-search-btn" type="button">Search</button>
        <button class="tpl-btn-ghost tpl-meal-custom-btn" type="button">+ Custom option</button>`;

    const searchInput = tools.querySelector('.tpl-meal-search');
    const runSearch = () => searchMealsForSlot(slot, idx, searchInput.value);
    tools.querySelector('.tpl-meal-search-btn').addEventListener('click', runSearch);
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } });
    tools.querySelector('.tpl-meal-custom-btn').addEventListener('click', () => {
        const name = prompt('Custom meal option (free text):');
        if (name?.trim()) { slot.options.push(makeOption({ source: 'custom', name: name.trim() })); renderSlots(); }
    });
    card.appendChild(tools);

    // MealDB results (if any pending for this slot)
    if (slot._search && slot._search.length) {
        const results = document.createElement('div');
        results.className = 'tpl-meal-results';
        slot._search.forEach(m => {
            const r = document.createElement('button');
            r.className = 'tpl-meal-result';
            r.type = 'button';
            r.innerHTML = `
                <img class="tpl-meal-thumb" src="${escapeAttr(m.thumb)}" alt="" loading="lazy">
                <span class="tpl-meal-result-name">${escapeHtml(m.name)}</span>
                <span class="tpl-meal-result-add">+ add</span>`;
            r.addEventListener('click', () => {
                slot.options.push(makeOption({ source: 'mealdb', mealId: m.mealId, name: m.name, thumb: m.thumb, per100: m.per100 }));
                slot._search = [];
                renderSlots();
            });
            results.appendChild(r);
        });
        card.appendChild(results);
    }

    return card;
}

// Draws one meal option with its quantity, per-100g macros, and live scaled totals.
function renderOptionCard(slot, opt, oIdx) {
    const el = document.createElement('div');
    el.className = 'tpl-option-card';

    const thumb = opt.thumb
        ? `<img class="tpl-option-thumb" src="${escapeAttr(opt.thumb)}" alt="" loading="lazy">`
        : `<div class="tpl-option-thumb tpl-option-thumb-ph">${opt.source === 'custom' ? '✎' : '🍽️'}</div>`;

    // Head row: thumb + name + source + remove
    const head = document.createElement('div');
    head.className = 'tpl-option-head';
    head.innerHTML = `
        ${thumb}
        <span class="tpl-option-name" title="${escapeAttr(opt.name)}">${escapeHtml(opt.name)}</span>
        <span class="tpl-option-src">${opt.source === 'custom' ? 'Custom' : 'MealDB'}</span>
        <button class="tpl-ex-icon-btn tpl-option-remove" type="button" title="Remove option">${deleteSVG}</button>`;
    head.querySelector('.tpl-option-remove').addEventListener('click', () => { slot.options.splice(oIdx, 1); renderSlots(); });
    el.appendChild(head);

    // Scaled-macros readout 
    const scaled = document.createElement('div');
    scaled.className = 'tpl-option-scaled';
    const updateScaled = () => {
        const m = scaleMacros(opt.per100, opt.quantity);
        scaled.innerHTML =
            `<strong>${m.calories}</strong> kcal &middot; P ${m.protein} &middot; C ${m.carbs} &middot; F ${m.fat}` +
            ` &middot; sugar ${m.sugar} &middot; fiber ${m.fiber}`;
    };

    // Quantity + unit
    const qtyRow = document.createElement('div');
    qtyRow.className = 'tpl-opt-qty';
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number'; qtyInput.min = '0'; qtyInput.className = 'tpl-ex-input tpl-opt-qty-input';
    qtyInput.value = opt.quantity;
    qtyInput.addEventListener('input', () => { opt.quantity = parseFloat(qtyInput.value) || 0; updateScaled(); recomputeMealTotals(); });
    const unitSel = document.createElement('select');
    unitSel.className = 'tpl-opt-unit';
    unitSel.innerHTML = MEAL_UNITS.map(u => `<option ${u === opt.unit ? 'selected' : ''}>${u}</option>`).join('');
    unitSel.addEventListener('change', () => { opt.unit = unitSel.value; });
    qtyRow.append(labelled('Qty', qtyInput), labelled('Unit', unitSel));
    el.appendChild(qtyRow);

    // Per-100g macro inputs
    const macroRow = document.createElement('div');
    macroRow.className = 'tpl-opt-per100';
    const per100Label = document.createElement('div');
    per100Label.className = 'tpl-opt-per100-label';
    per100Label.textContent = 'per 100g';
    macroRow.appendChild(per100Label);
    MACRO_KEYS.forEach(key => {
        const inp = document.createElement('input');
        inp.type = 'number'; inp.min = '0'; inp.className = 'tpl-ex-input tpl-opt-macro-input';
        inp.value = opt.per100[key];
        inp.addEventListener('input', () => { opt.per100[key] = parseFloat(inp.value) || 0; updateScaled(); recomputeMealTotals(); });
        macroRow.appendChild(labelled(MACRO_SHORT[key], inp));
    });
    el.appendChild(macroRow);

    updateScaled();
    el.appendChild(scaled);
    return el;
}

const MACRO_SHORT = { calories: 'kcal', protein: 'P', carbs: 'C', fat: 'F', sugar: 'Sug', fiber: 'Fib' };

// Small labelled field wrapper (label above an input/select).
function labelled(text, control) {
    const wrap = document.createElement('label');
    wrap.className = 'tpl-opt-field';
    const span = document.createElement('span');
    span.className = 'tpl-opt-field-label';
    span.textContent = text;
    wrap.append(span, control);
    return wrap;
}

/* MEAL MACROS */
function renderMacroBar() {
    const bar = document.getElementById('mbMacroBar');
    if (!bar) return;
    bar.innerHTML = `
        <div class="tpl-macro-block">
            <span class="tpl-macro-title">Daily total <em>(sum of all options)</em></span>
            <div class="tpl-macro-vals" id="mbTotals">—</div>
        </div>
        <div class="tpl-macro-block tpl-macro-target">
            <span class="tpl-macro-title">Target estimate <em>(editable, not medical advice)</em></span>
            <div class="tpl-macro-gen">
                <label class="tpl-opt-field"><span class="tpl-opt-field-label">Current kg</span>
                    <input type="number" min="0" class="tpl-ex-input" id="mbCurWeight"></label>
                <label class="tpl-opt-field"><span class="tpl-opt-field-label">Target kg</span>
                    <input type="number" min="0" class="tpl-ex-input" id="mbTgtWeight"></label>
                <button class="tpl-btn-ghost" type="button" id="mbGenTargetsBtn">Generate</button>
            </div>
            <div class="tpl-macro-vals" id="mbTargets">${mb.targets ? formatTargets(mb.targets) : 'Enter weights and Generate'}</div>
        </div>`;
    bar.querySelector('#mbGenTargetsBtn').addEventListener('click', handleGenerateMealTargets);
}

// Adds up the macros across every option and shows the running daily total.
function recomputeMealTotals() {
    const el = document.getElementById('mbTotals');
    if (!el) return;
    const total = emptyMacros();
    mb.slots.forEach(s => s.options.forEach(o => {
        const m = scaleMacros(o.per100, o.quantity);
        MACRO_KEYS.forEach(k => { total[k] = round1(total[k] + m[k]); });
    }));
    el.innerHTML =
        `<strong>${total.calories}</strong> kcal &middot; P ${total.protein} &middot; C ${total.carbs} &middot; F ${total.fat}` +
        ` &middot; sugar ${total.sugar} &middot; fiber ${total.fiber}`;
}

// Simple maintenance heuristic — framed as an editable estimate, not advice.
function computeMacroTargets(currentKg, targetKg) {
    const maintenance = currentKg * 30;                 
    let kcal = maintenance;
    if (targetKg < currentKg) kcal = maintenance - 500; 
    else if (targetKg > currentKg) kcal = maintenance + 300; 
    const protein = currentKg * 2;                      
    const fatKcal = kcal * 0.25;                        
    const fat = fatKcal / 9;
    const carbs = Math.max(0, (kcal - protein * 4 - fatKcal) / 4);
    return { kcal: Math.round(kcal), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
}

// Formats the generated macro targets into a short text line.
function formatTargets(t) {
    return `<strong>${t.kcal}</strong> kcal &middot; P ${t.protein}g &middot; C ${t.carbs}g &middot; F ${t.fat}g`;
}

// Works out suggested daily macros from the entered weights (an editable estimate).
function handleGenerateMealTargets() {
    const cur = parseFloat(document.getElementById('mbCurWeight').value);
    const tgt = parseFloat(document.getElementById('mbTgtWeight').value);
    if (!cur || cur <= 0) { showToast('Enter the current weight (kg).', 'warning'); return; }
    mb.targets = computeMacroTargets(cur, tgt || cur);
    document.getElementById('mbTargets').innerHTML = formatTargets(mb.targets);
}

// Searches MealDB for a slot and stashes the results so they can be shown.
async function searchMealsForSlot(slot, idx, query) {
    if (!query.trim()) return;
    try {
        slot._search = await DataService.searchMeals(query);
        if (!slot._search.length) toast('No meals found on MealDB for that search.');
    } catch (e) {
        console.error('MealDB search failed:', e);
        toast('Could not reach MealDB.');
        slot._search = [];
    }
    renderSlots();
}

// Collects all the slots and options into a payload and saves the meal template.
async function handleSaveMeal() {
    const name = document.getElementById('mbName').value.trim();
    if (!name) { showToast('Please give the template a name.', 'warning'); return; }
    const filledSlots = mb.slots.filter(s => s.options.length > 0);
    if (!filledSlots.length) { showToast('Add at least one meal option to a slot.', 'warning'); return; }

    const payload = {
        id: mb.editingId || undefined,
        trainerId: state.trainerId,
        name,
        targets: mb.targets || null,
        slots: filledSlots.map(s => ({
            label: s.label,
            options: s.options.map(o => ({
                source: o.source,
                mealId: o.mealId,
                name: o.name,
                thumb: o.thumb,
                quantity: o.quantity,
                unit: o.unit,
                per100g: o.per100,                            
                macros: scaleMacros(o.per100, o.quantity),    
            })),
        })),
    };

    console.log('[templates] meal template payload', payload);
    const btn = document.getElementById('mbSaveBtn');
    setLoading(btn, true, 'Saving…');
    const hitServer = await persistTemplate('meal', payload);
    setLoading(btn, false, 'Save Template');

    hideOverlay('tplMealBuilder');
    if (state.type !== 'meal') { state.type = 'meal'; syncTypeToggle(); }
    renderLibrary();
    if (!hitServer) toast('Saved in memory (templates backend pending).');
}

/* ASSIGN MODAL */
let assignTarget = null;   // { tpl, type }

// Hooks up the assign modal's buttons (runs once on load).
function wireAssignModal() {
    document.getElementById('asCloseBtn').addEventListener('click', () => hideOverlay('tplAssignModal'));
    document.getElementById('asCancelBtn').addEventListener('click', () => hideOverlay('tplAssignModal'));
    document.getElementById('asConfirmBtn').addEventListener('click', handleConfirmAssign);
}

// Opens the assign modal and loads this trainer's trainees to pick from.
async function openAssign(tpl) {
    assignTarget = { tpl, type: state.type };
    document.getElementById('asTitle').textContent = `Assign "${tpl.name || 'Untitled'}"`;

    const select = document.getElementById('asTrainee');
    const note = document.getElementById('asNote');
    const confirmBtn = document.getElementById('asConfirmBtn');
    select.innerHTML = `<option value="">Loading trainees…</option>`;
    note.textContent = '';

    showOverlay('tplAssignModal');

    let trainees = [];
    try { trainees = await DataService.getTraineesByTrainer(state.trainerId); }
    catch (e) { console.error('Trainee load failed:', e); }

    if (!trainees.length) {
        select.innerHTML = `<option value="">No trainees available</option>`;
        select.disabled = true;
    } else {
        select.disabled = false;
        select.innerHTML = trainees
            .map(t => `<option value="${escapeAttr(t.id)}">${escapeHtml(t.name)}</option>`)
            .join('');
    }

    note.textContent = state.type === 'meal'
        ? 'A meal plan will be created for this trainee, replacing any existing one.'
        : 'A new, independent training plan will be created for this trainee.';
    confirmBtn.disabled = !trainees.length;
}

// Assigns the chosen workout or meal template to a trainee (creates a real plan for them).
async function handleConfirmAssign() {
    if (!assignTarget) return;
    const { tpl, type } = assignTarget;
    const traineeId = document.getElementById('asTrainee').value;
    if (!traineeId) { showToast('Please choose a trainee.', 'warning'); return; }

    // A temp template hasn't been saved to the backend, so it has no real id to assign.
    if (isTempId(tpl.id)) {
        toast('Save this template to the server before assigning it.');
        return;
    }

    const btn = document.getElementById('asConfirmBtn');
    setLoading(btn, true, 'Assigning…');
    try {
        if (type === 'meal') {
            await DataService.assignMealTemplate(tpl.id, traineeId);
            hideOverlay('tplAssignModal');
            toast('Template assigned — a meal plan was created for the trainee.');
        } else {
            await DataService.assignWorkoutTemplate(tpl.id, traineeId);
            hideOverlay('tplAssignModal');
            toast('Template assigned — a training plan was created for the trainee.');
        }
    } catch (e) {
        console.warn('Assign failed:', e.message);
        hideOverlay('tplAssignModal');
        toast(`Failed to assign template: ${e.message}`);
    } finally {
        setLoading(btn, false, 'Assign');
    }
}

// Sets a <select> value case-insensitively — handles backend values like
// "hypertrophy" not matching option text "Hypertrophy".
function setSelectValue(selectEl, val) {
    if (!selectEl || val == null) return;
    const str = String(val).toLowerCase();
    const match = [...selectEl.options].find(o => o.value.toLowerCase() === str || o.text.toLowerCase() === str);
    if (match) selectEl.value = match.value;
}

/* HELPERS */
function showOverlay(id) { document.getElementById(id).hidden = false; }
// Hides one of the overlay panels.
function hideOverlay(id) { document.getElementById(id).hidden = true; }

// Keeps the Workout/Meal toggle in sync with the active type.
function syncTypeToggle() {
    document.querySelectorAll('#tplTypeToggle .tpl-seg-btn')
        .forEach(b => b.classList.toggle('active', b.dataset.type === state.type));
}

// Flips a button between its normal label and a loading label.
function setLoading(btn, loading, text) {
    if (!btn) return;
    btn.disabled = loading;
    if (loading) { btn.dataset.html = btn.innerHTML; btn.textContent = text; }
    else { btn.innerHTML = btn.dataset.html || text; }
}

function toast(msg) { showToast(msg, 'info'); }

// Deep-copies a plain object (so edits don't touch the original).
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

// Escapes text so it's safe to drop into innerHTML.
function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Same as escapeHtml — used for attribute values.
function escapeAttr(s) { return escapeHtml(s); }
