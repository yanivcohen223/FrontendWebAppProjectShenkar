const sidebarHTML = `
            <!-- Logo -->
            <div class="logo">
                <img class="logo-icon" src="images/projectIcon.svg" alt="Sportie logo" width="48" height="48">
                <span class="logo-text">Sportie</span>
            </div>

            <!-- Navigation -->
            <div class="nav">
                <a class="nav-item active" href="dashboard.html" data-section="dashboard">
                    <img class="nav-icon" src="images/dashboardIcon.svg" alt="" width="24" height="24">
                    <span>Dashboard</span>
                </a>

                <a class="nav-item" href="trainees.html" data-section="trainees">
                    <img class="nav-icon" src="images/traineeIcon.svg" alt="" width="24" height="24">
                    <span>Trainees List</span>
                </a>

<<<<<<< HEAD
                <a class="nav-item" href="messages.html" data-section="messages">
                    <img class="nav-icon" src="images/messagesIcon.svg" alt="" width="24" height="24">
                    <span>Messages</span>
                </a>

                <a class="nav-item" href="templates.html" data-section="templates">
=======
                <a class="nav-item" href="templates.html" data-section="templates" style="top:369px;">
>>>>>>> 720d55b491a611ea017c92462b3f394b3231f0a9
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
            </div>

            <!-- Logout -->
            <button class="logout-btn" type="button">log out</button>
`;

// Drops the sidebar HTML into the page and highlights the link for whatever page you're on.
export function initSidebar() {
const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = sidebarHTML;

    sidebar.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));

    const path = window.location.pathname.split('/').pop();
    let targetLink;

    const traineeSubpages = ['trainee-profile.html', 'create-training-plan.html', 'edit-training-plan.html'];

    if (traineeSubpages.includes(path)) {
        targetLink = sidebar.querySelector('a[data-section="trainees"]');
    } else {
        targetLink = sidebar.querySelector(`a[href="${path}"]`);
    }

    if (targetLink) {
        targetLink.classList.add('active');
    }
}