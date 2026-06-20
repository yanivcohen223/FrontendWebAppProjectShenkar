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
        status: t.status,
        progress: t.progress,
        lastActivity: t.last_activity,
        avatarColor: t.avatar_color,
        avatarUrl: t.avatar_url,
        trainerId: t.trainer_id,
    };
}

export const DataService = {
    async getAllTrainers() {
        const res = await httpRequest(`${API_BASE}/trainers`);
        if (!res.ok) throw new Error('Failed to fetch trainers');
        const data = await res.json();
        return data.map(mapTrainer);
    },

    async getTrainerById(trainerId) {
        const res = await httpRequest(`${API_BASE}/trainers/${trainerId}`);
        if (!res.ok) throw new Error('Failed to fetch trainer');
        return mapTrainer(await res.json());
    },

    async getTraineesByTrainer(trainerId) {
        const res = await httpRequest(`${API_BASE}/trainees/trainer/${trainerId}`);
        if (res.status === 404) return [];
        if (!res.ok) throw new Error('Failed to fetch trainees');
        const data = await res.json();
        return data.map(mapTrainee);
    },

    async getTraineesByTrainerId(trainerId) {
        return this.getTraineesByTrainer(trainerId);
    },

    async getTraineeById(traineeId) {
        const res = await httpRequest(`${API_BASE}/trainees/${traineeId}`);
        if (!res.ok) throw new Error('Failed to fetch trainee');
        return mapTrainee(await res.json());
    },

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

    // ---- Trainer profile + preferences ----
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

    async deleteTrainer(trainerId) {
        const res = await httpRequest(`${API_BASE}/trainers/${trainerId}`, { method: 'DELETE' });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Delete failed');
        return body;
    },

    // ---- Trainee management (trainer side) ----
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

    async unassignTrainee(trainerId, traineeId) {
        const res = await httpRequest(`${API_BASE}/trainers/${trainerId}/trainees/${traineeId}`, {
            method: 'DELETE',
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Unassign failed');
        return body;
    },

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

    // ---- Session helpers ----
    saveSession(trainer, trainees) {
        sessionStorage.setItem('sportieSession', JSON.stringify({ trainer, trainees }));
    },

    getSession() {
        const raw = sessionStorage.getItem('sportieSession');
        return raw ? JSON.parse(raw) : null;
    },

    clearSession() {
        sessionStorage.removeItem('sportieSession');
    },
};
