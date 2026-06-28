function buildUserAreaHTML() {
    const raw = sessionStorage.getItem('sportieSession');
    const trainerName = raw ? (JSON.parse(raw)?.trainer?.name || '') : '';
    return `
    <div class="user-area" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false">
        <div class="user-avatar">
            <img class="user-avatar-icon" src="images/profileIcon.png" alt="" width="14" height="14">
        </div>
        <span class="user-name">${trainerName}</span>
        <svg class="user-chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="user-dropdown" role="menu">
            <a class="user-dropdown-item" href="settings.html" role="menuitem">Settings</a>
            <button class="user-dropdown-item user-dropdown-logout" type="button" role="menuitem">Log out</button>
        </div>
    </div>
`;
}

const HAMBURGER_HTML = `<button class="hamburger-btn" id="hamburgerBtn" aria-label="Toggle navigation">
    <span></span><span></span><span></span>
</button>`;

// Fills the top bar with a page title plus the bell and user menu on the right.
export function initTopbar(title = "Dashboard") {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    topbar.innerHTML = HAMBURGER_HTML + `<h1 class="topbar-title">${title}</h1>` + buildUserAreaHTML();
}

// Same top bar, but shows a breadcrumb trail instead of a plain title.
// Used on drill-down pages like a single trainee's profile.
export function initTopbarBreadcrumb(crumbs = []) {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    const inner = crumbs.map((c, i) => {
        if (i === crumbs.length - 1) {
            return `<span class="breadcrumb-current">${c.label}</span>`;
        }
        return `<a class="breadcrumb-link" href="${c.href}">${c.label}</a><span class="breadcrumb-sep">›</span>`;
    }).join('');

    topbar.innerHTML = HAMBURGER_HTML + `<div class="topbar-breadcrumb">${inner}</div>` + buildUserAreaHTML();
}

