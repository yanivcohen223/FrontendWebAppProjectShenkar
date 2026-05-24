/* dataService.js — Single source for data.
   To switch from JSON to real database: only change the functions in this file.
   nothing else in the app needs to change.*/

const DataService = {

    /* ---------- CONFIG ---------- */
    // When switching to real API this URL needed to be change with real endpoint:
    JSON_SOURCE: './ListOfTrainees.JSON',

    /* ---------- RAW FETCH ---------- */
    // Single fetch point — replace with API call later:
    // async _fetch(endpoint) {
    //   const res = await fetch(`${this.API_BASE}${endpoint}`, {
    //     headers: { Authorization: `Bearer ${this.getToken()}` }
    //   });
    //   return res.json();
    // }
    async _fetchAll() {
        const res = await fetch(this.JSON_SOURCE);
        if (!res.ok) throw new Error('Failed to fetch data');
        return res.json();
    },

    /* ---------- TRAINERS ---------- */
    async getAllTrainers() {
        // TODO: replace with:
        // return this._fetch('/trainers')
        const data = await this._fetchAll();
        return data.trainers;
    },

    /* ---------- TRAINEES ---------- */
    async getTraineesByTrainer(trainerId) {
        // TODO: replace with:
        // return this._fetch(`/trainees?trainerId=${trainerId}`)
        const data = await this._fetchAll();
        return data.trainees.filter(t =>
            t.trainerId === trainerId
        );
    },

    async getTraineesByTrainerId(trainerId) {
        // TODO: replace with:
        // return this._fetch(`/trainees?trainerId=${trainerId}`)
        const data = await this._fetchAll();
        return data.trainees.filter(t =>
            t.trainerId === trainerId
        );
    },

    async getTraineeById(traineeId) {
        // TODO: replace with:
        // return this._fetch(`/trainees/${traineeId}`)
        const data = await this._fetchAll();
        return data.trainees.find(t => t.id === traineeId);
    },

    /* ---------- TRAINER ---------- */
    async getTrainerById(trainerId) {
        // TODO: replace with:
        // return this._fetch(`/trainers/${trainerId}`)
        const data = await this._fetchAll();
        return data.trainers.find(t => t.id === trainerId);
    },

    /* ---------- ANALYTICS ---------- */
    async getMonthlyActiveTrainees(trainerId) {
        // TODO: replace with real DB query:
        // return this._fetch(
        //   `/analytics/monthly-active?trainerId=${trainerId}`
        // );
        //
        // Real query would be something like:
        // SELECT month, COUNT(*) as activeCount
        // FROM trainee_sessions
        // WHERE trainerId = ? AND status = 'active'
        // GROUP BY month
        // ORDER BY month ASC

        // Temporary: read from JSON until DB is connected
        const data = await this._fetchAll();
        const trainer = data.trainers.find(t =>
            t.id === trainerId
        );
        return trainer?.monthlyActiveTrainees ||
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    },

    /* ---------- SESSION ---------- */
    saveSession(trainer, trainees) {
        sessionStorage.setItem('sportieSession', JSON.stringify({
            trainer,
            trainees
        }));
    },

    getSession() {
        const raw = sessionStorage.getItem('sportieSession');
        return raw ? JSON.parse(raw) : null;
    },

    clearSession() {
        sessionStorage.removeItem('sportieSession');
    }

};
