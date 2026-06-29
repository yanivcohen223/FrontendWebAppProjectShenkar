function buildUserAreaHTML() {
    const raw = sessionStorage.getItem('sportieSession');
    const trainer = raw ? (JSON.parse(raw)?.trainer || {}) : {};
    const name = trainer.name || '';
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';

    let avatarInner;
    let avatarStyle;
    if (trainer.avatarUrl) {
        avatarInner = `<img class="user-avatar-img" src="${trainer.avatarUrl}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
        avatarStyle = `style="background:#F3F3F3;overflow:hidden;border:none;"`;
    } else {
        avatarInner = `<span class="user-avatar-initial">${initial}</span>`;
        avatarStyle = `style="background:${trainer.avatarColor || '#D9D9D9'};border:none;"`;
    }

    return `
    <a class="user-area" href="settings.html" aria-label="Open settings">
        <div class="user-avatar" ${avatarStyle}>${avatarInner}</div>
        <span class="user-name" style="color:#000">${name}</span>
    </a>
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

