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
};


// Nav links are plain <a> tags, so there's nothing to wire up here.
function wireNav() { /* intentionally empty */ }

// Logs the trainer out.
function onLogout() { AuthService.logout(); }

// Sends you to login if you're not signed in, otherwise hands back the saved session.
function loadSession() {
    if (!AuthService.isAuthenticated()) {
        window.location.href = 'index.html';
        return null;
    }
    return DataService.getSession();
}

// Opens/closes the user dropdown and wires Settings + Logout inside it.
function wireUserMenu() {
    const area = document.querySelector('.user-area');
    const dropdown = document.querySelector('.user-dropdown');
    if (!area || !dropdown) return;

    area.addEventListener('click', (e) => {
        dropdown.classList.toggle('open');
        e.stopPropagation();
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));

    const logoutBtn = dropdown.querySelector('.user-dropdown-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.stopPropagation(); AuthService.logout(); });
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

// On mobile (< 768px) the fixed-canvas approach is bypassed: CSS media
// queries handle the layout instead. On desktop, the canvas is scaled with
// Math.min so nothing clips, then expanded to cover the full viewport.
function scaleCanvas() {
    const canvas = document.querySelector('.canvas');
    if (!canvas) return;

    if (window.innerWidth < 768) {
        // --- Mobile: let CSS media queries drive the layout ---
        canvas.style.transform  = 'none';
        canvas.style.position   = 'relative';
        canvas.style.width      = '100%';
        canvas.style.height     = 'auto';
        canvas.style.left       = '0';
        canvas.style.top        = '0';
        canvas.style.overflow   = 'visible';
        canvas.style.visibility = 'visible';

        // Clear inline sizes the desktop pass may have written.
        const sidebar = canvas.querySelector('.sidebar');
        if (sidebar) sidebar.style.height = '';
        const topbar = canvas.querySelector('.topbar');
        if (topbar) topbar.style.width = '';
        for (const el of canvas.querySelectorAll(
            '.page-content, .trainees-content, .tpl-page, .cp-page, .screen-placeholder'
        )) {
            el.style.width  = '';
            el.style.height = '';
        }
        return;
    }

    // --- Desktop: scale 1440×1024 to fill the viewport ---
    // Reset any mobile inline overrides first.
    canvas.style.position = '';
    canvas.style.overflow = '';

    const scaleX = window.innerWidth  / 1440;
    const scaleY = window.innerHeight / 1024;
    const scale  = Math.min(scaleX, scaleY);

    const fullW = Math.ceil(window.innerWidth  / scale);
    const fullH = Math.ceil(window.innerHeight / scale);
    canvas.style.width  = `${fullW}px`;
    canvas.style.height = `${fullH}px`;

    const sidebar = canvas.querySelector('.sidebar');
    if (sidebar) sidebar.style.height = `${fullH}px`;
    const topbar = canvas.querySelector('.topbar');
    if (topbar) topbar.style.width = `${fullW - 260}px`;

    // Expand every page content wrapper to fill the available area.
    const contentW = `${fullW - 260}px`;
    const contentH = `${fullH - 64}px`;
    for (const el of canvas.querySelectorAll(
        '.page-content, .trainees-content, .tpl-page, .cp-page, .screen-placeholder'
    )) {
        el.style.width  = contentW;
        el.style.height = contentH;
    }

    canvas.style.transform  = `scale(${scale})`;
    canvas.style.left       = '0px';
    canvas.style.top        = '0px';
    canvas.style.visibility = 'visible';
}

function wireMobileNav() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar   = document.querySelector('.sidebar');
    const overlay   = document.getElementById('sidebarOverlay');
    if (!hamburger || !sidebar || !overlay) return;

    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('visible');
    });
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('visible');
    });
    sidebar.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('visible');
            }
        });
    });
}

// Runs on every page: builds the sidebar/topbar, checks you're logged in, then sizes the canvas.
document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop();

    initSidebar();

    // breadcrumb pages handle their own topbar init
    const breadcrumbPages = ['trainee-profile.html', 'edit-training-plan.html', 'edit-meal-plan.html'];
    if (!breadcrumbPages.includes(page)) {
        initTopbar(PAGE_TITLES[page] || 'Sportie');
    }

    wireNav();
    wireUserMenu();
    wireLogout();
    wireMobileNav();

    const session = loadSession();
    if (!session) return;

    window.sportieSession = session;
    applyTrainerProfile(session.trainer);

    scaleCanvas();
    window.addEventListener('resize', scaleCanvas);
});