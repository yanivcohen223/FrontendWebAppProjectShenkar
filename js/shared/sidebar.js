const sidebarHTML = `
            <!-- Logo -->
            <a class="logo" href="dashboard.html">
                <img class="logo-icon" src="images/projectIcon.svg" alt="Sportie logo" width="48" height="48">
                <span class="logo-text">Sportie</span>
            </a>

            <!-- Navigation -->
            <nav class="nav" aria-label="Primary">
                <a class="nav-item active" href="dashboard.html" data-section="dashboard">
                    <img class="nav-icon" src="images/dashboardIcon.svg" alt="" width="24" height="24">
                    <span>Dashboard</span>
                </a>

                <a class="nav-item" href="trainees.html" data-section="trainees">
                    <img class="nav-icon" src="images/traineeIcon.svg" alt="" width="24" height="24">
                    <span>Trainees List</span>
                </a>

                <a class="nav-item" href="templates.html" data-section="templates">
                    <img class="nav-icon" src="images/templatesIcon.svg" alt="" width="24" height="24">
                    <span>Templates</span>
                </a>

                <a class="nav-item" href="analytics.html" data-section="analytics">
                    <img class="nav-icon" src="images/analyticsIcon.svg" alt="" width="24" height="24">
                    <span>Trainee analytics</span>
                </a>

                <a class="nav-item" href="settings.html" data-section="settings">
                    <img class="nav-icon" src="images/settingsIcon.svg" alt="" width="24" height="24">
                    <span>Settings</span>
                </a>
            </nav>

            <!-- Logout -->
            <button class="logout-btn" type="button">log out</button>
`;

// Drops the sidebar HTML into the page and highlights the link for whatever page you're on.
export function initSidebar() {
const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = sidebarHTML;

    // Mobile overlay — used by wireMobileNav() in base.js to close the drawer.
    if (!document.getElementById('sidebarOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    sidebar.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));

    const path = window.location.pathname.split('/').pop();
    let targetLink;

    const traineeSubpages = ['trainee-profile.html', 'edit-training-plan.html', 'edit-meal-plan.html'];

    if (traineeSubpages.includes(path)) {
        targetLink = sidebar.querySelector('a[data-section="trainees"]');
    } else {
        targetLink = sidebar.querySelector(`a.nav-item[href="${path}"]`);
    }

    if (targetLink) {
        targetLink.classList.add('active');
    }
}