// analyticsService.js — talks to the trainer-analytics endpoints.
// Mirrors the existing DataService pattern (plain fetch, per-service API_BASE,
// throw on !ok, return parsed JSON). Backend is read-only here.

const API_BASE = 'http://localhost:3000/api';

export const AnalyticsService = {
    // GET /api/analytics/at-risk/:trainerId
    async getAtRisk(trainerId) {
        const res = await fetch(`${API_BASE}/analytics/at-risk/${trainerId}`);
        if (!res.ok) throw new Error('Failed to fetch at-risk trainees');
        return res.json();
    },

    // GET /api/analytics/attendance-distribution/:trainerId
    async getAttendanceDistribution(trainerId) {
        const res = await fetch(`${API_BASE}/analytics/attendance-distribution/${trainerId}`);
        if (!res.ok) throw new Error('Failed to fetch attendance distribution');
        return res.json();
    },

    // GET /api/analytics/leaderboard/:trainerId?metric=body_weight|strength
    async getLeaderboard(trainerId, metric = 'body_weight') {
        const res = await fetch(`${API_BASE}/analytics/leaderboard/${trainerId}?metric=${encodeURIComponent(metric)}`);
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        return res.json();
    },

    // GET /api/analytics/volume-over-time/:trainerId
    async getVolumeOverTime(trainerId) {
        const res = await fetch(`${API_BASE}/analytics/volume-over-time/${trainerId}`);
        if (!res.ok) throw new Error('Failed to fetch volume over time');
        return res.json();
    },

    // GET /api/analytics/engagement-heatmap/:trainerId
    async getEngagementHeatmap(trainerId) {
        const res = await fetch(`${API_BASE}/analytics/engagement-heatmap/${trainerId}`);
        if (!res.ok) throw new Error('Failed to fetch engagement heatmap');
        return res.json();
    },
};
