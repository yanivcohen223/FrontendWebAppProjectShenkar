function buildUserAreaHTML() {
    const raw = sessionStorage.getItem('sportieSession');
    const trainerName = raw ? (JSON.parse(raw)?.trainer?.name || '') : '';
    return `
    <button class="bell-btn" type="button" aria-label="Notifications">
        <img src="images/notificationIcon.svg" alt="Notifications" width="24" height="24">
    </button>
    <div class="user-area">
        <div class="user-avatar">
            <img class="user-avatar-icon" src="images/profileIcon.png" alt="" width="14" height="14">
        </div>
        <span class="user-name">${trainerName}</span>
        <span class="user-chevron">&#9660;</span>
    </div>
`;
}

export function initTopbar(title = "Dashboard") {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    topbar.innerHTML = `<h1 class="topbar-title">${title}</h1>` + buildUserAreaHTML();
}

export function initTopbarBreadcrumb(crumbs = []) {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    const inner = crumbs.map((c, i) => {
        if (i === crumbs.length - 1) {
            return `<span class="breadcrumb-current">${c.label}</span>`;
        }
        return `<a class="breadcrumb-link" href="${c.href}">${c.label}</a><span class="breadcrumb-sep">›</span>`;
    }).join('');

    topbar.innerHTML = `<div class="topbar-breadcrumb">${inner}</div>` + buildUserAreaHTML();
}

