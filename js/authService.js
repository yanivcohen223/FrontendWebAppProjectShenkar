/* authService.js — Owns all authentication logic.
   Uses DataService for data and session storage.
   To switch to real backend: only login() body changes. */

const AuthService = {

    async login(email, password) {
        // TODO: replace entire method body with:
        // const res = await fetch('/api/auth/login', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ email, password })
        // });
        // if (!res.ok) throw new Error(await res.text());
        // const { trainer, trainees } = await res.json();
        // DataService.saveSession(trainer, trainees);

        // Current: validate against JSON
        const trainers = await DataService.getAllTrainers();

        const trainerExists = trainers.find(t =>
            t.email === email
        );
        if (!trainerExists) {
            throw new Error('NO_ACCOUNT');
        }

        const trainer = trainers.find(t =>
            t.email === email && t.password === password
        );
        if (!trainer) {
            throw new Error('WRONG_PASSWORD');
        }

        const trainees = await DataService
            .getTraineesByTrainerId(trainer.id);

        DataService.saveSession(trainer, trainees);
        return { trainer, trainees };
    },

    logout() {
        // TODO: call server-side signout if needed:
        // await fetch('/api/auth/logout', { method: 'POST' });
        DataService.clearSession();
        window.location.href = 'login.html';
    },

    getLoggedInTrainer() {
        const session = DataService.getSession();
        return session ? session.trainer : null;
    },

    isAuthenticated() {
        return DataService.getSession() !== null;
    }

};
