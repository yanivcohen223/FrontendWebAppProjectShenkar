import { API_BASE } from '../shared/config.js';
import { httpRequest } from '../shared/http.js';

// Normalize a backend trainer to the shape the frontend uses (camelCase)
function mapTrainer(t) {
    if (!t) return null;
    return {
        id: t.trainer_id,
        name: t.name,
        specialization: t.specialization,
        avatarColor: t.avatar_color,
        avatarUrl: t.avatar_url,
        email: t.email,
        dateOfBirth: t.date_of_birth,
        countryCode: t.country_code,
        phoneNumber: t.phone_number,
        units: t.units,
        notificationsEnabled: t.notifications_enabled,
    };
}

// Normalize a backend trainee to the frontend shape
function mapTrainee(t) {
    if (!t) return null;
    return {
        id: t.trainee_id,
        name: t.name,
        goal: t.goal,
        status: t.status || null,
        weight: t.current_weight ?? null,
        progress: t.progress ?? null,
        lastActivity: t.last_activity,
        avatarColor: t.avatar_color,
        avatarUrl: t.avatar_url,
        trainerId: t.trainer_id,
        age: t.age ?? null,
    };
}

// Normalize a backend workout template to the frontend shape (camelCase).
// A template is an ordered list of blocks; each block has a type
// (workout | cardio | rest) and its exercises (empty for rest).
// The backend (snake_case) calls a block a "day" and uses block_type/block_index;
// exercises carry custom_exercise_name (or exercise_id) and rest_seconds. We read
// both those names and our own front-end names so saved templates actually display.
function mapWorkoutBlock(b) {
    return {
        index: b.block_index ?? b.index ?? b.day_index ?? b.dayIndex ?? null,
        label: b.label ?? b.title ?? '',
        type: b.block_type ?? b.type ?? 'workout',
        notes: b.notes ?? '',                    // free-text, used by cardio blocks
        dayIndex: b.day_index ?? b.dayIndex ?? b.block_index ?? null,
        trainingLetter: b.training_letter ?? b.trainingLetter ?? null,
        exercises: (b.exercises || []).map(e => ({
            name: e.custom_exercise_name ?? e.name
                ?? (e.exercise_id != null ? `Exercise #${e.exercise_id}` : ''),
            sets: e.sets ?? 3,
            reps: e.reps ?? 10,
            rest: e.rest_seconds ?? e.restSeconds ?? e.rest ?? 60,
        })),
    };
}

function mapWorkoutTemplate(t) {
    if (!t) return null;
    // Backend sends the blocks under "days"; our own payload uses "blocks".
    const rawBlocks = t.blocks ?? t.days ?? [];
    return {
        id: t.template_id ?? t.id,
        name: t.name,
        mode: t.mode || 'day-specific',          // 'day-specific' | 'abstract'
        goal: t.goal || '',
        daysPerWeek: t.days_per_week ?? t.daysPerWeek ?? null,
        blocks: rawBlocks.map(mapWorkoutBlock),
        createdAt: t.created_at,
    };
}

// Macros come back from the backend as strings ("100.00") — coerce to numbers,
// falling back to null when there's nothing usable.
function toNum(v) {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

// Normalize one meal option. The backend (GET) sends snake_case
// (meal_name, mealdb_id, *_per_100); our own save-payload uses camelCase
// (name, mealId, per100g). Read both so fetched and freshly-built match.
function mapMealOption(o) {
    if (!o) return null;
    const per100 = o.per100 || o.per100g || {};
    return {
        source: o.source || ((o.mealdb_id ?? o.mealId) != null ? 'mealdb' : 'custom'),
        mealId: o.mealdb_id ?? o.mealId ?? null,
        name: o.meal_name ?? o.name ?? '',
        thumb: o.meal_thumb ?? o.thumb ?? null,
        notes: o.notes ?? '',
        quantity: toNum(o.quantity) ?? 100,
        unit: o.unit || 'g',
        per100: {
            calories: toNum(o.calories_per_100 ?? per100.calories) ?? 0,
            protein:  toNum(o.protein_per_100  ?? per100.protein)  ?? 0,
            carbs:    toNum(o.carbs_per_100    ?? per100.carbs)    ?? 0,
            fat:      toNum(o.fat_per_100      ?? per100.fat)      ?? 0,
            sugar:    toNum(o.sugar_per_100    ?? per100.sugar)    ?? 0,
            fiber:    toNum(o.fiber_per_100    ?? per100.fiber)    ?? 0,
        },
    };
}

// Normalize one meal slot — label is slot_label (backend) or label (payload).
function mapMealSlot(s) {
    if (!s) return null;
    return {
        label: s.slot_label ?? s.label ?? '',
        options: (s.options || []).map(mapMealOption),
    };
}

// Normalize a backend meal template to the frontend shape (camelCase)
function mapMealTemplate(t) {
    if (!t) return null;
    return {
        id: t.template_id ?? t.id,
        name: t.name,
        // slots: [{ label, options:[{ source, mealId, name, thumb, quantity, unit, per100 }] }]
        slots: (t.slots || []).map(mapMealSlot),
        createdAt: t.created_at,
    };
}

// Built-in exercise list used by the template builder when the exercise API
// isn't reachable yet, so the library stays usable. { name, target }.
const DEFAULT_EXERCISE_LIBRARY = [
    { name: 'Bench Press', target: 'chest' },
    { name: 'Incline Dumbbell Press', target: 'chest' },
    { name: 'Squat', target: 'upper legs' },
    { name: 'Deadlift', target: 'back' },
    { name: 'Overhead Press', target: 'shoulders' },
    { name: 'Pull-up', target: 'back' },
    { name: 'Barbell Row', target: 'back' },
    { name: 'Lunge', target: 'upper legs' },
    { name: 'Dumbbell Curl', target: 'upper arms' },
    { name: 'Triceps Pushdown', target: 'upper arms' },
    { name: 'Leg Press', target: 'upper legs' },
    { name: 'Lateral Raise', target: 'shoulders' },
    { name: 'Romanian Deadlift', target: 'upper legs' },
    { name: 'Plank', target: 'waist' },
];

// Every call the frontend makes to the backend lives here. Methods hit an endpoint
// and hand back tidy camelCase data (or throw when something goes wrong).
export const DataService = {
    // Gets every trainer in the system.
    async getAllTrainers() {
        const res = await httpRequest(`${API_BASE}/trainers`);
        if (!res.ok) throw new Error('Failed to fetch trainers');
        const data = await res.json();
        return data.map(mapTrainer);
    },

    // Gets one trainer by id.
    async getTrainerById(trainerId) {
        const res = await httpRequest(`${API_BASE}/trainers/${trainerId}`);
        if (!res.ok) throw new Error('Failed to fetch trainer');
        return mapTrainer(await res.json());
    },

    // Gets all the trainees that belong to one trainer.
    async getTraineesByTrainer(trainerId) {
        const res = await httpRequest(`${API_BASE}/trainees/trainer/${trainerId}`);
        if (res.status === 404) return [];
        if (!res.ok) throw new Error('Failed to fetch trainees');
        const data = await res.json();
        return data.map(mapTrainee);
    },

    // Same as getTraineesByTrainer — kept around as an alias.
    async getTraineesByTrainerId(trainerId) {
        return this.getTraineesByTrainer(trainerId);
    },

    // Gets one trainee by id.
    async getTraineeById(traineeId) {
        const res = await httpRequest(`${API_BASE}/trainees/${traineeId}`);
        if (!res.ok) throw new Error('Failed to fetch trainee');
        return mapTrainee(await res.json());
    },

    // Gets a 12-month array of how many trainees were active each month (for the dashboard chart).
    async getMonthlyActiveTrainees(trainerId) {
        const res = await httpRequest(`${API_BASE}/trainers/${trainerId}/monthly-activity`);
        if (!res.ok) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        const rows = await res.json();
        const months = new Array(12).fill(0);
        rows.forEach(r => {
            if (r.month_index >= 0 && r.month_index < 12) {
                months[r.month_index] = r.trainee_count;
            }
        });
        return months;
    },

    // Gets the count of completed workouts this week (Sun–Sat) across the trainer's trainees.
    async getWorkoutsThisWeek(trainerId) {
        const res = await httpRequest(`${API_BASE}/analytics/workouts-this-week/${trainerId}`);
        if (!res.ok) return 0;

        const { workouts_this_week } = await res.json();
        return workouts_this_week ?? 0;
    },

    // ---- Trainer profile + preferences ----
    // Saves changes to the trainer's profile.
    async updateTrainerProfile(trainerId, data) {
        const res = await httpRequest(`${API_BASE}/trainers/${trainerId}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Update failed');
        return body;
    },

    // Changes a user's password.
    async changePassword(userId, currentPassword, newPassword, confirmNewPassword) {
        const res = await httpRequest(`${API_BASE}/users/${userId}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Password change failed');
        return body;
    },

    // Deletes the trainer's account.
    async deleteTrainer(trainerId) {
        const res = await httpRequest(`${API_BASE}/trainers/${trainerId}`, { method: 'DELETE' });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Delete failed');
        return body;
    },

    // ---- Trainee management (trainer side) ----
    // Links an existing trainee to this trainer.
    async assignTrainee(trainerId, traineeId) {
        const res = await httpRequest(`${API_BASE}/trainers/${trainerId}/trainees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ traineeId }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Assign failed');
        return body;
    },

    // Removes a trainee from this trainer.
    async unassignTrainee(trainerId, traineeId) {
        const res = await httpRequest(`${API_BASE}/trainers/${trainerId}/trainees/${traineeId}`, {
            method: 'DELETE',
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Unassign failed');
        return body;
    },

    // Updates the details of a trainee this trainer manages.
    async updateManagedTrainee(trainerId, traineeId, data) {
        const res = await httpRequest(`${API_BASE}/trainers/${trainerId}/trainees/${traineeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Update failed');
        return body;
    },

    // Asks the backend to auto-generate a workout plan from the chosen goal/days/muscles.
    async generateTrainingPlan(payload) {
        const res = await httpRequest(`${API_BASE}/plans/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!res.ok){
            throw new Error(body.message || 'Plan generation failed');
        }
        return body;
    },

    // Saves a brand-new training plan for a trainee.
    async saveTrainingPlan(planData) {
        const res = await httpRequest(`${API_BASE}/plans/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(planData),
        });
        const body = await res.json();
        if (!res.ok) {
            throw new Error(body.message || 'Plan saving failed');
        }
        return body;
    },

    // Gets the trainee's current active plan (or null if they don't have one).
    async getActivePlanByTraineeId(traineeId) {
        console.log(`Fetching active plan for traineeId: ${traineeId}`);
        const res = await httpRequest(`${API_BASE}/plans/active/${traineeId}`);
        if (res.status === 404) return null; //no plan
        if (!res.ok) throw new Error('Failed to fetch active plan');
        return await res.json();
    },

    // Gets one training plan by its id.
    async getPlanById(planId) {
        const res = await httpRequest(`${API_BASE}/plans/${planId}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('Failed to fetch training plan details');
        return await res.json();
    },

    // Updates an existing training plan.
    async updateTrainingPlan(planId, planData) {
        const res = await httpRequest(`${API_BASE}/plans/${planId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(planData),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Plan updating failed');
        return body;
    },

    // Templates: workout + meal library
    // Gets this trainer's saved workout templates.
    async getWorkoutTemplates(trainerId) {
        const qs = trainerId ? `?trainerId=${encodeURIComponent(trainerId)}` : '';
        const res = await httpRequest(`${API_BASE}/templates/workout${qs}`);
        if (res.status === 404) return [];
        if (!res.ok) throw new Error('Failed to fetch workout templates');
        const data = await res.json();
        return (data || []).map(mapWorkoutTemplate);
    },

    // Gets this trainer's saved meal templates.
    async getMealTemplates(trainerId) {
        const qs = trainerId ? `?trainerId=${encodeURIComponent(trainerId)}` : '';
        const res = await httpRequest(`${API_BASE}/templates/meal${qs}`);
        if (res.status === 404) return [];
        if (!res.ok) throw new Error('Failed to fetch meal templates');
        const data = await res.json();
        return (data || []).map(mapMealTemplate);
    },

    // Saves a workout template.
    async saveWorkoutTemplate(data) {
        const res = await httpRequest(`${API_BASE}/templates/workout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error((body && body.message) || 'Saving workout template failed');
        return body;
    },

    // Saves a meal template.
    async saveMealTemplate(data) {
        const res = await httpRequest(`${API_BASE}/templates/meal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error((body && body.message) || 'Saving meal template failed');
        return body;
    },

    // Updates an existing workout template (the row already exists on the backend).
    async updateWorkoutTemplate(id, data) {
        const res = await httpRequest(`${API_BASE}/templates/workout/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error((body && body.message) || 'Updating workout template failed');
        return body;
    },

    // Updates an existing meal template (the row already exists on the backend).
    async updateMealTemplate(id, data) {
        const res = await httpRequest(`${API_BASE}/templates/meal/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error((body && body.message) || 'Updating meal template failed');
        return body;
    },

    // Copy-on-assign: backend creates an independent training_plan for the trainee.
    async assignWorkoutTemplate(templateId, traineeId) {
        const res = await httpRequest(`${API_BASE}/templates/workout/${templateId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ traineeId }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error((body && body.message) || 'Assigning template failed');
        return body;
    },

    // Copy-on-assign: backend creates an independent meal plan for the trainee.
    async assignMealTemplate(templateId, traineeId) {
        const res = await httpRequest(`${API_BASE}/templates/meal/${templateId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ traineeId }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error((body && body.message) || 'Assigning template failed');
        return body;
    },

    // Deletes a template (workout or meal) by id.
    async deleteTemplate(type, id) {
        const res = await httpRequest(`${API_BASE}/templates/${type}/${id}`, { method: 'DELETE' });
        const body = await res.json();
        if (!res.ok) throw new Error((body && body.message) || 'Deleting template failed');
        return body;
    },

    async searchExercises(query) {
        try {
            const res = await httpRequest(`${API_BASE}/exercises?search=${encodeURIComponent(query || '')}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length) {
                    return data.map(e => ({ name: e.name, target: e.target || e.body_part || '' }));
                }
            }
        } catch (_) {
            /* fall through to the built-in library */
        }
        const q = (query || '').toLowerCase();
        return DEFAULT_EXERCISE_LIBRARY.filter(e => !q || e.name.toLowerCase().includes(q));
    },

    // Meal search via our backend proxy (never TheMealDB directly). Returns
    // option snapshots incl. per-100g macros when the proxy provides them
    // (macro columns added in migration 003): { mealId, name, thumb, category, per100 }.
    async searchMeals(query) {
        const res = await httpRequest(`${API_BASE}/meals/search?q=${encodeURIComponent(query || '')}`);
        if (!res.ok) return [];
        const data = await res.json();
        const meals = Array.isArray(data) ? data : (data.meals || []);
        const num = v => (v == null || v === '' ? 0 : Number(v) || 0);
        return meals.map(m => ({
            mealId: m.idMeal ?? m.meal_id ?? m.id ?? null,
            name: m.strMeal ?? m.name ?? '',
            thumb: m.strMealThumb ?? m.thumb ?? null,
            category: m.strCategory ?? m.category ?? '',
            per100: {
                calories: num(m.calories ?? m.calories_per_100g ?? m.kcal),
                protein:  num(m.protein ?? m.protein_per_100g),
                carbs:    num(m.carbs ?? m.carbs_per_100g ?? m.carbohydrates),
                fat:      num(m.fat ?? m.fat_per_100g),
                sugar:    num(m.sugar ?? m.sugar_per_100g),
                fiber:    num(m.fiber ?? m.fiber_per_100g),
            },
        }));
    },

    // Session helpers
    // Stashes the logged-in trainer + trainees for the rest of the browser session.
    saveSession(trainer, trainees) {
        sessionStorage.setItem('sportieSession', JSON.stringify({ trainer, trainees }));
    },

    // Reads the saved session back, or null if there isn't one.
    getSession() {
        const raw = sessionStorage.getItem('sportieSession');
        return raw ? JSON.parse(raw) : null;
    },

    // Wipes the saved session (used on logout).
    clearSession() {
        sessionStorage.removeItem('sportieSession');
    },
};
