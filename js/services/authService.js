import { DataService } from './dataService.js';
import { API_BASE } from '../shared/config.js';
import { httpRequest } from '../shared/http.js';

// Handles logging in/out and password changes by talking to the auth endpoints.
export const AuthService = {
    // Logs the trainer in. On success it saves their info to the session and returns it.
    async login(email, password) {
        const res = await httpRequest(`${API_BASE}/auth/login`, {
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
            email: trainer.email,
            specialization: trainer.specialization,
            avatarColor: trainer.avatar_color,
            avatarUrl: trainer.avatar_url,
        };

        // Trainees are loaded on dashboard, not here — save trainer only
        DataService.saveSession(mappedTrainer, []);
        return { trainer: mappedTrainer };
    },

    // Registers a new account. Throws EMAIL_EXISTS if the address is already taken.
    async signup(email, password) {
        const res = await httpRequest(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (res.status === 400) throw new Error('EMAIL_EXISTS');
        if (!res.ok) throw new Error('SIGNUP_FAILED');
        return true;
    },

    // Clears the session and sends the user back to the login page.
    logout() {
        DataService.clearSession();
        window.location.href = 'index.html';
    },

    // Returns the trainer from the current session, or null if nobody is logged in.
    getLoggedInTrainer() {
        const session = DataService.getSession();
        return session ? session.trainer : null;
    },

    // Quick check for whether someone is logged in.
    isAuthenticated() {
        return DataService.getSession() !== null;
    },
};