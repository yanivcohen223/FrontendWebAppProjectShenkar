function buildUserAreaHTML() {
    const raw = sessionStorage.getItem('sportieSession');
    const trainerName = raw ? (JSON.parse(raw)?.trainer?.name || '') : '';
    return `
    <div class="user-area">
        <div class="user-avatar">
            <img class="user-avatar-icon" src="images/profileIcon.png" alt="" width="14" height="14">
        </div>
        <span class="user-name">${trainerName}</span>
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

