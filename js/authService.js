import { DataService } from './dataService.js';

const API_BASE = 'http://localhost:3000/api';

export const AuthService = {
    async login(email, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (res.status === 401) throw new Error('INVALID_CREDENTIALS');
        if (res.status === 403) throw new Error('NO_TRAINER_PROFILE');
        if (!res.ok) throw new Error('LOGIN_FAILED');

        const { trainer } = await res.json();

        // Map backend snake_case -> frontend camelCase
        const mappedTrainer = {
            id: trainer.trainer_id,
            name: trainer.name,
            specialization: trainer.specialization,
            avatarColor: trainer.avatar_color,
            avatarUrl: trainer.avatar_url,
        };

        // Trainees are loaded on dashboard, not here — save trainer only
        DataService.saveSession(mappedTrainer, []);
        return { trainer: mappedTrainer };
    },

    logout() {
        DataService.clearSession();
        window.location.href = 'login.html';
    },

    getLoggedInTrainer() {
        const session = DataService.getSession();
        return session ? session.trainer : null;
    },

    isAuthenticated() {
        return DataService.getSession() !== null;
    },
};