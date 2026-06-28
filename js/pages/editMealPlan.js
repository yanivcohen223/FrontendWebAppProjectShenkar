import { initTopbarBreadcrumb } from '../shared/topbar.js';
import { DataService } from '../services/dataService.js';
import { showToast, showInputModal } from '../shared/toast.js';

let planId = '';
let traineeId = '';
let traineeName = '';

const mp = {
    slots: [],    // [{ label, options:[option], _search:[] }]
    targets: null,
};

const MEAL_UNITS = ['g', 'ml', 'scoop', 'piece'];
const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat', 'sugar', 'fiber'];
const MACRO_SHORT = { calories: 'kcal', protein: 'P', carbs: 'C', fat: 'F', sugar: 'Sug', fiber: 'Fib' };
const emptyMacros = () => MACRO_KEYS.reduce((o, k) => (o[k] = 0, o), {});
const round1 = n => Math.round((Number(n) || 0) * 10) / 10;

function makeOption(o = {}) {
    return {
        source: o.source || 'custom',
        mealId: o.mealId ?? null,
        name: o.name || '',
        thumb: o.thumb ?? null,
        notes: o.notes ?? '',
        quantity: o.quantity ?? 100,
        unit: o.unit || 'g',
        per100: { ...emptyMacros(), ...(o.per100 || {}) },
    };
}

function scaleMacros(per100, quantity) {
    const f = (Number(quantity) || 0) / 100;
    return MACRO_KEYS.reduce((o, k) => (o[k] = round1((per100[k] || 0) * f), o), {});
}

const deleteSVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    traineeId = params.get('id') || '';
    traineeName = params.get('name') || '';
    planId = params.get('planId') || '';

    initTopbarBreadcrumb([
        { label: 'Trainees List', href: 'trainees.html' },
        { label: traineeName || 'Trainee', href: `trainee-profile.html?id=${encodeURIComponent(traineeId)}` },
        { label: 'Edit Meal Plan' },
    ]);

    document.getElementById('mpCancelBtn').addEventListener('click', () => history.back());
    document.getElementById('mpSaveBtn').addEventListener('click', handleSavePlan);
    document.getElementById('mpAddSlotBtn').addEventListener('click', () => {
        mp.slots.push({ label: `Meal ${mp.slots.length + 1}`, options: [], _search: [] });
        renderSlots();
    });

    renderMacroBar();
    await loadMealPlan();
});

async function loadMealPlan() {
    document.getElementById('mpSlots').innerHTML =
        `<div class="tpl-day-empty">Loading…</div>`;
    try {
        const plan = await DataService.getActiveMealPlan(traineeId);
        if (!plan) {
            showToast('No active meal plan found.', 'error');
            document.getElementById('mpSlots').innerHTML = '';
            return;
        }

        if (!planId && plan.meal_plan_id) planId = plan.meal_plan_id;
        document.getElementById('mpName').value = plan.name || '';

        mp.slots = (plan.slots || []).map(s => ({
            label: s.label || '',
            _search: [],
            options: (s.options || []).map(o => makeOption({
                source: 'custom',
                name: o.name,
                thumb: o.thumb,
                notes: o.notes,
                quantity: o.quantity,
                unit: o.unit,
                per100: {
                    calories: o.calories_per_100 || 0,
                    protein:  o.protein_per_100  || 0,
                    carbs:    o.carbs_per_100    || 0,
                    fat:      o.fat_per_100      || 0,
                    sugar: 0,
                    fiber: 0,
                },
            })),
        }));

        // Always show Breakfast, Lunch, Dinner — empty ones let the user fill them in
        const _existing = mp.slots.map(s => s.label.trim().toLowerCase());
        ['Breakfast', 'Lunch', 'Dinner'].forEach(lbl => {
            if (!_existing.includes(lbl.toLowerCase()))
                mp.slots.push({ label: lbl, options: [], _search: [] });
        });

        renderSlots();
    } catch (err) {
        console.error('Error loading meal plan:', err);
        showToast('Failed to load meal plan.', 'error');
        document.getElementById('mpSlots').innerHTML = '';
    }
}

/* ── Macro bar ────────────────────────────────────────────────── */

function renderMacroBar() {
    const bar = document.getElementById('mpMacroBar');
    if (!bar) return;
    bar.innerHTML = `
        <div class="tpl-macro-block">
            <span class="tpl-macro-title">Daily total <em>(sum of all options)</em></span>
            <div class="tpl-macro-vals" id="mpTotals">—</div>
        </div>
        <div class="tpl-macro-block tpl-macro-target">
            <span class="tpl-macro-title">Target estimate <em>(editable, not medical advice)</em></span>
            <div class="tpl-macro-gen">
                <label class="tpl-opt-field"><span class="tpl-opt-field-label">Current kg</span>
                    <input type="number" min="0" class="tpl-ex-input" id="mpCurWeight"></label>
                <label class="tpl-opt-field"><span class="tpl-opt-field-label">Target kg</span>
                    <input type="number" min="0" class="tpl-ex-input" id="mpTgtWeight"></label>
                <button class="tpl-btn-ghost" type="button" id="mpGenTargetsBtn">Generate</button>
            </div>
            <div class="tpl-macro-vals" id="mpTargets">${mp.targets ? formatTargets(mp.targets) : 'Enter weights and Generate'}</div>
        </div>`;
    bar.querySelector('#mpGenTargetsBtn').addEventListener('click', handleGenerateMealTargets);
}

function recomputeMealTotals() {
    const el = document.getElementById('mpTotals');
    if (!el) return;
    const total = emptyMacros();
    mp.slots.forEach(s => s.options.forEach(o => {
        const m = scaleMacros(o.per100, o.quantity);
        MACRO_KEYS.forEach(k => { total[k] = round1(total[k] + m[k]); });
    }));
    el.innerHTML =
        `<strong>${total.calories}</strong> kcal &middot; P ${total.protein} &middot; C ${total.carbs} &middot; F ${total.fat}` +
        ` &middot; sugar ${total.sugar} &middot; fiber ${total.fiber}`;
}

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

function formatTargets(t) {
    return `<strong>${t.kcal}</strong> kcal &middot; P ${t.protein}g &middot; C ${t.carbs}g &middot; F ${t.fat}g`;
}

function handleGenerateMealTargets() {
    const cur = parseFloat(document.getElementById('mpCurWeight').value);
    const tgt = parseFloat(document.getElementById('mpTgtWeight').value);
    if (!cur || cur <= 0) { showToast('Enter the current weight (kg).', 'warning'); return; }
    mp.targets = computeMacroTargets(cur, tgt || cur);
    document.getElementById('mpTargets').innerHTML = formatTargets(mp.targets);
}

/* ── Slots ────────────────────────────────────────────────────── */

function renderSlots() {
    const container = document.getElementById('mpSlots');
    container.innerHTML = '';
    if (!mp.slots.length) {
        container.innerHTML = `<div class="tpl-day-empty">No meal slots yet — click <strong>+ Add Meal Slot</strong></div>`;
        return;
    }
    mp.slots.forEach((slot, idx) => container.appendChild(renderSlot(slot, idx)));
    recomputeMealTotals();
}

function renderSlot(slot, idx) {
    const card = document.createElement('div');
    card.className = 'tpl-slot-card';

    // Header: index badge + label input + remove
    const head = document.createElement('div');
    head.className = 'tpl-slot-head';
    head.innerHTML = `
        <span class="tpl-slot-index">${idx + 1}</span>
        <input type="text" class="tpl-input tpl-slot-label" placeholder="Slot label (e.g. Breakfast)" value="${escapeAttr(slot.label)}">
        <button class="tpl-ex-icon-btn tpl-slot-remove" type="button" title="Remove slot">${deleteSVG}</button>`;
    head.querySelector('.tpl-slot-label').addEventListener('change', e => { slot.label = e.target.value; });
    head.querySelector('.tpl-slot-remove').addEventListener('click', () => { mp.slots.splice(idx, 1); renderSlots(); });
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

    // Search + custom add row
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
    tools.querySelector('.tpl-meal-custom-btn').addEventListener('click', async () => {
        const name = await showInputModal('Custom meal option (free text):');
        if (name?.trim()) { slot.options.push(makeOption({ source: 'custom', name: name.trim() })); renderSlots(); }
    });
    card.appendChild(tools);

    // MealDB results
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

function renderOptionCard(slot, opt, oIdx) {
    const el = document.createElement('div');
    el.className = 'tpl-option-card';

    const thumb = opt.thumb
        ? `<img class="tpl-option-thumb" src="${escapeAttr(opt.thumb)}" alt="" loading="lazy">`
        : `<div class="tpl-option-thumb tpl-option-thumb-ph">${opt.source === 'custom' ? '✎' : '🍽️'}</div>`;

    const head = document.createElement('div');
    head.className = 'tpl-option-head';
    head.innerHTML = `
        ${thumb}
        <span class="tpl-option-name" title="${escapeAttr(opt.name)}">${escapeHtml(opt.name)}</span>
        <span class="tpl-option-src">${opt.source === 'custom' ? 'Custom' : 'MealDB'}</span>
        <button class="tpl-ex-icon-btn tpl-option-remove" type="button" title="Remove option">${deleteSVG}</button>`;
    head.querySelector('.tpl-option-remove').addEventListener('click', () => { slot.options.splice(oIdx, 1); renderSlots(); });
    el.appendChild(head);

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

function labelled(text, control) {
    const wrap = document.createElement('label');
    wrap.className = 'tpl-opt-field';
    const span = document.createElement('span');
    span.className = 'tpl-opt-field-label';
    span.textContent = text;
    wrap.append(span, control);
    return wrap;
}

async function searchMealsForSlot(slot, idx, query) {
    if (!query.trim()) return;
    try {
        slot._search = await DataService.searchMeals(query);
        if (!slot._search.length) showToast('No meals found on MealDB for that search.', 'info');
    } catch (e) {
        console.error('MealDB search failed:', e);
        showToast('Could not reach MealDB.', 'error');
        slot._search = [];
    }
    renderSlots();
}

/* ── Save ─────────────────────────────────────────────────────── */

async function handleSavePlan() {
    const saveBtn = document.getElementById('mpSaveBtn');
    const name = document.getElementById('mpName')?.value.trim();

    if (!name) { showToast('Please enter a plan name.', 'warning'); return; }

    // Only persist slots that have at least one option; empty ones are display-only
    const filledSlots = mp.slots.filter(s => s.options.length > 0);
    if (!filledSlots.length) { showToast('Add at least one meal option to a slot.', 'warning'); return; }

    // Transform internal per100 shape → backend snake_case field names
    const slots = filledSlots.map(s => ({
        label: s.label,
        options: s.options.map(o => ({
            mealdb_id:        o.mealId || null,
            name:             o.name,
            thumb:            o.thumb,
            notes:            o.notes || null,
            quantity:         o.quantity,
            unit:             o.unit,
            calories_per_100: o.per100.calories,
            protein_per_100:  o.per100.protein,
            carbs_per_100:    o.per100.carbs,
            fat_per_100:      o.per100.fat,
            sugar_per_100:    o.per100.sugar || 0,
            fiber_per_100:    o.per100.fiber || 0,
        })),
    }));

    try {
        setLoading(saveBtn, true, 'Saving…');
        const result = await DataService.updateMealPlan(planId, { name, slots });
        if (result && result.success) {
            showToast('Meal plan saved!', 'success');
            setTimeout(() => {
                window.location.href = `trainee-profile.html?id=${encodeURIComponent(traineeId)}`;
            }, 1200);
        } else {
            showToast('Failed to save meal plan.', 'error');
        }
    } catch (err) {
        console.error('Error saving meal plan:', err);
        showToast('An error occurred: ' + err.message, 'error');
    } finally {
        setLoading(saveBtn, false, 'Save Plan');
    }
}

/* ── Helpers ──────────────────────────────────────────────────── */

function setLoading(btn, loading, text) {
    if (!btn) return;
    btn.disabled = loading;
    if (loading) { btn.dataset.html = btn.innerHTML; btn.textContent = text; }
    else { btn.innerHTML = btn.dataset.html || text; }
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function escapeAttr(s) { return escapeHtml(s); }
