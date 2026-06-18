import { initTopbarBreadcrumb } from './topbar.js';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name') || '';

    initTopbarBreadcrumb([
        { label: 'Trainees List', href: 'trainees.html' },
        { label: name || 'Trainee', href: `trainee-profile.html?name=${encodeURIComponent(name)}` },
        { label: 'Edit Workout' }
    ]);

    const cancelBtn = document.getElementById('ewCancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.location.href = `trainee-profile.html?name=${encodeURIComponent(name)}`;
        });
    }

    const saveBtn = document.getElementById('ewSaveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            // TODO: persist workout data
            window.location.href = `trainee-profile.html?name=${encodeURIComponent(name)}`;
        });
    }
});
