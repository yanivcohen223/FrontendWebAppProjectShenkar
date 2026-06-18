import { initTopbarBreadcrumb } from './topbar.js';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name') || '';

    initTopbarBreadcrumb([
        { label: 'Trainees List', href: 'trainees.html' },
        { label: name || 'Trainee Profile' }
    ]);

    const btnEditTraining = document.getElementById('btnEditTraining');
    if (btnEditTraining) {
        btnEditTraining.addEventListener('click', () => {
            window.location.href = `edit-workout.html?name=${encodeURIComponent(name)}`;
        });
    }
});
