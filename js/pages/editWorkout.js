import { initTopbarBreadcrumb } from '../shared/topbar.js';

// Edit Workout page: sets up the breadcrumb and the cancel/save buttons.
// (Saving isn't wired to the backend yet — see the TODO below.)
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
