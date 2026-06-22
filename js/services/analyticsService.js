// Talks to the analytics endpoints. Read-only — it just fetches the numbers
// the analytics page needs for its charts and tables.

const API_BASE = 'http://localhost:3000/api';

export const AnalyticsService = {
    // Gets the trainees who haven't trained in a while (at risk of dropping off).
    async getAtRisk(trainerId) {
        const res = await fetch(`${API_BASE}/analytics/at-risk/${trainerId}`);
        if (!res.ok) throw new Error('Failed to fetch at-risk trainees');
        return res.json();
    },

    // Gets how trainees split across attendance buckets (<50%, 50-80%, 80%+).
    async getAttendanceDistribution(trainerId) {
        const res = await fetch(`${API_BASE}/analytics/attendance-distribution/${trainerId}`);
        if (!res.ok) throw new Error('Failed to fetch attendance distribution');
        return res.json();
    },

    // Gets the trainee ranking by body-weight or strength change.
    async getLeaderboard(trainerId, metric = 'body_weight') {
        const res = await fetch(`${API_BASE}/analytics/leaderboard/${trainerId}?metric=${encodeURIComponent(metric)}`);
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        return res.json();
    },

    // Gets total training volume per week so we can chart the trend.
    async getVolumeOverTime(trainerId) {
        const res = await fetch(`${API_BASE}/analytics/volume-over-time/${trainerId}`);
        if (!res.ok) throw new Error('Failed to fetch volume over time');
        return res.json();
    },

    // Gets each trainee's weekly session counts for the engagement heatmap.
    async getEngagementHeatmap(trainerId) {
        const res = await fetch(`${API_BASE}/analytics/engagement-heatmap/${trainerId}`);
        if (!res.ok) throw new Error('Failed to fetch engagement heatmap');
        return res.json();
    },
};
