/* base.js — shared by ALL pages
   Sidebar/topbar wiring, navigation routing, viewport scaling,
   and trainer-profile injection point.  */

/* ---------- Navigation ---------- */
function navigateTo(section) {
    const pages = {
        dashboard: 'dashboard.html',
        trainees:  'trainees.html',
        messages:  'messages.html',
        templates: 'templates.html',
        analytics: 'analytics.html',
        settings:  'settings.html'
    };
    if (pages[section]) window.location.href = pages[section];
}

function wireNav() {
    // intentionally empty
}

/* ---------- Top bar handlers ---------- */
function onNotifications() {
    console.log('Notifications opened');
    // TODO: open notifications drawer
}

function onUserMenu() {
    console.log('User menu opened');
    // TODO: show dropdown
}

function onLogout() {
    AuthService.logout();
}

function loadSession() {
    if (!AuthService.isAuthenticated()) {
        window.location.href = 'login.html';
        return null;
    }
    return DataService.getSession();
}

function wireTopBar() {
    const bell = document.querySelector('.bell-btn');
    if (bell) bell.addEventListener('click', onNotifications);

    const userArea = document.querySelector('.user-area');
    if (userArea) userArea.addEventListener('click', onUserMenu);
}

function wireLogout() {
    const btn = document.querySelector('.logout-btn');
    if (btn) btn.addEventListener('click', onLogout);
}

/* ---------- Trainer profile (top-right user area) ---------- */
function applyTrainerProfile(trainer) {
    if (!trainer) return;

    const nameEl   = document.querySelector('.user-name');
    const avatarEl = document.querySelector('.user-avatar');

    if (nameEl) {
        nameEl.textContent = trainer.name;
        nameEl.style.color = '#000';
    }

    if (avatarEl) {
        avatarEl.style.border = 'none';
        if (trainer.avatarUrl) {
            avatarEl.style.background =
                `url("${trainer.avatarUrl}") center/cover no-repeat`;
        } else {
            avatarEl.style.background = trainer.avatarColor;
        }
        // Hide the placeholder dashed icon
        const icon = avatarEl.querySelector('.user-avatar-icon');
        if (icon) icon.style.display = 'none';
    }
}

function scaleCanvas() {
    const canvas = document.querySelector('.canvas');
    if (!canvas) return;
    const scaleX = window.innerWidth  / 1440;
    const scaleY = window.innerHeight / 1024;
    const scale  = Math.min(scaleX, scaleY);
    canvas.style.transform = `scale(${scale})`;
    canvas.style.left = `${(window.innerWidth  - 1440 * scale) / 2}px`;
    canvas.style.top  = `${(window.innerHeight - 1024 * scale) / 2}px`;
}

document.addEventListener('DOMContentLoaded', () => {
    wireNav();
    wireTopBar();
    wireLogout();

    const session = loadSession();
    if (!session) return;

    // Make session available to ALL page JS files
    window.sportieSession = session;

    // Apply trainer profile to top-right on ALL pages
    applyTrainerProfile(session.trainer);

    scaleCanvas();
    window.addEventListener('resize', scaleCanvas);
});
