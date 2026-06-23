import { AuthService } from '../services/authService.js';
import { DataService } from '../services/dataService.js';
import { initSidebar } from './sidebar.js';
import { initTopbar } from './topbar.js';

// Maps each page's filename to the title shown in the top bar.
const PAGE_TITLES = {
    'dashboard.html':             'Dashboard',
    'trainees.html':              'Trainees List',
    'templates.html':             'Templates',
    'analytics.html':             'Trainee Analytics',
    'settings.html':              'Settings',
    'create-training-plan.html':  'Create Training Plan',
};

// Sends the browser to whatever page matches a sidebar section name.
function navigateTo(section) {
    const pages = {
        dashboard: 'dashboard.html',
        trainees:  'trainees.html',
        templates: 'templates.html',
        analytics: 'analytics.html',
        settings:  'settings.html'
    };
    if (pages[section]) window.location.href = pages[section];
}

// Nav links are plain <a> tags, so there's nothing to wire up here.
function wireNav() { /* intentionally empty */ }

// Stubs for the bell and user-menu clicks — nothing real hooked up yet.
function onNotifications() { console.log('Notifications opened'); }
function onUserMenu() { console.log('User menu opened'); }
// Logs the trainer out.
function onLogout() { AuthService.logout(); }

// Sends you to login if you're not signed in, otherwise hands back the saved session.
function loadSession() {
    if (!AuthService.isAuthenticated()) {
        window.location.href = 'login.html';
        return null;
    }
    return DataService.getSession();
}

// Hooks up clicks on the bell and the user area.
function wireTopBar() {
    const bell = document.querySelector('.bell-btn');
    if (bell) bell.addEventListener('click', onNotifications);
    const userArea = document.querySelector('.user-area');
    if (userArea) userArea.addEventListener('click', onUserMenu);
}

// Hooks up the logout button.
function wireLogout() {
    const btn = document.querySelector('.logout-btn');
    if (btn) btn.addEventListener('click', onLogout);
}

// Shows the trainer's name and photo (or a colored circle with their initial) in the top bar.
export function applyTrainerProfile(trainer) {
    if (!trainer) return;
    const nameEl   = document.querySelector('.user-name');
    const avatarEl = document.querySelector('.user-avatar');

    if (nameEl) {
        nameEl.textContent = trainer.name;
        nameEl.style.color = '#000';
    }
    if (avatarEl) {
        avatarEl.style.border = 'none';
        const icon = avatarEl.querySelector('.user-avatar-icon');
        if (icon) icon.style.display = 'none';

        let img = avatarEl.querySelector('.user-avatar-img');
        let initial = avatarEl.querySelector('.user-avatar-initial');

        if (trainer.avatarUrl) {
            // Real photo (data URL from the DB) -> show it via an <img> so it
            // stays sharp under the page-zoom transform
            avatarEl.style.background = '#F3F3F3';
            avatarEl.style.overflow = 'hidden';
            if (initial) initial.remove();
            if (!img) {
                img = document.createElement('img');
                img.className = 'user-avatar-img';
                img.alt = '';
                avatarEl.appendChild(img);
            }
            img.src = trainer.avatarUrl;
        } else {
            // No photo -> colored circle with the trainer's first initial
            if (img) img.remove();
            avatarEl.style.background = trainer.avatarColor || '#D9D9D9';
            if (!initial) {
                initial = document.createElement('span');
                initial.className = 'user-avatar-initial';
                avatarEl.appendChild(initial);
            }
            initial.textContent = (trainer.name || '?').trim().charAt(0).toUpperCase() || '?';
        }
    }
}

// Scales the fixed 1440x1024 design to fit the window and centers it.
function scaleCanvas() {
    const canvas = document.querySelector('.canvas');
    if (!canvas) return;
    const scaleX = window.innerWidth  / 1440;
    const scaleY = window.innerHeight / 1024;
    const scale  = Math.min(scaleX, scaleY);
    canvas.style.transform = `scale(${scale})`;
    canvas.style.left = `${(window.innerWidth  - 1440 * scale) / 2}px`;
    canvas.style.top  = `${(window.innerHeight - 1024 * scale) / 2}px`;
    canvas.style.visibility = 'visible';
}

// Runs on every page: builds the sidebar/topbar, checks you're logged in, then sizes the canvas.
document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop();

    initSidebar();

    // breadcrumb pages handle their own topbar init
    const breadcrumbPages = ['trainee-profile.html', 'edit-workout.html'];
    if (!breadcrumbPages.includes(page)) {
        initTopbar(PAGE_TITLES[page] || 'Sportie');
    }

    wireNav();
    wireTopBar();
    wireLogout();

    const session = loadSession();
    if (!session) return;

    window.sportieSession = session;
    applyTrainerProfile(session.trainer);

    scaleCanvas();
    window.addEventListener('resize', scaleCanvas);
});