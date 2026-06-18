const API_BASE = 'http://localhost:3000/api';

// Normalize a backend trainer to the shape the frontend uses (camelCase)
function mapTrainer(t) {
    if (!t) return null;
    return {
        id: t.trainer_id,
        name: t.name,
        specialization: t.specialization,
        avatarColor: t.avatar_color,
        avatarUrl: t.avatar_url,
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
        const res = await fetch(`${API_BASE}/trainers`);
        if (!res.ok) throw new Error('Failed to fetch trainers');
        const data = await res.json();
        return data.map(mapTrainer);
    },

    async getTrainerById(trainerId) {
        const res = await fetch(`${API_BASE}/trainers/${trainerId}`);
        if (!res.ok) throw new Error('Failed to fetch trainer');
        return mapTrainer(await res.json());
    },

    async getTraineesByTrainer(trainerId) {
        const res = await fetch(`${API_BASE}/trainees/trainer/${trainerId}`);
        if (res.status === 404) return [];
        if (!res.ok) throw new Error('Failed to fetch trainees');
        const data = await res.json();
        return data.map(mapTrainee);
    },

    // Kept for compatibility with existing callers
    async getTraineesByTrainerId(trainerId) {
        return this.getTraineesByTrainer(trainerId);
    },

    async getTraineeById(traineeId) {
        const res = await fetch(`${API_BASE}/trainees/${traineeId}`);
        if (!res.ok) throw new Error('Failed to fetch trainee');
        return mapTrainee(await res.json());
    },

    async getMonthlyActiveTrainees(trainerId) {
        const res = await fetch(`${API_BASE}/trainers/${trainerId}/monthly-activity`);
        if (!res.ok) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        const rows = await res.json();

        // Backend returns [{month_index, trainee_count}, ...]; chart needs [n, n, ...] (12 slots)
        const months = new Array(12).fill(0);
        rows.forEach(r => {
            if (r.month_index >= 0 && r.month_index < 12) {
                months[r.month_index] = r.trainee_count;
            }
        });
        return months;
    },

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
