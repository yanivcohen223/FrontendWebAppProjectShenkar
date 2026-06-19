import { initTopbarBreadcrumb } from '../shared/topbar.js';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || '';
    const name = params.get('name') || '';

    initTopbarBreadcrumb([
        { label: 'Trainees List', href: 'trainees.html' },
        { label: name || 'Trainee', href: `trainee-profile.html?id=${encodeURIComponent(id)}` },
        { label: 'Edit Workout' }
    ]);

    const cancelBtn = document.getElementById('ewCancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.location.href = `trainee-profile.html?id=${encodeURIComponent(id)}`;
        });
    }

    const saveBtn = document.getElementById('ewSaveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            // TODO: persist workout data
            window.location.href = `trainee-profile.html?id=${encodeURIComponent(id)}`;
        });
    }
});
