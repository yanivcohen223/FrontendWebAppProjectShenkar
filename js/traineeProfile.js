import { initSidebar } from './sidebar.js';
import { initTopbarBreadcrumb } from './topbar.js';

export function initTraineeProfilePage(traineeName = '') {
    initSidebar();
    initTopbarBreadcrumb([
        { label: 'Trainees List', href: 'trainees.html' },
        { label: traineeName || 'Trainee Profile' }
    ]);

    const nameEl = document.getElementById('topbarTraineeName');
    if (nameEl && traineeName) nameEl.textContent = traineeName;
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name') || '';
    initTraineeProfilePage(name);
});
