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

// Reads the logged-in trainer out of the session, or null if there isn't one.
function getSessionTrainer() {
    const raw = sessionStorage.getItem('sportieSession');
    return raw ? (JSON.parse(raw)?.trainer || null) : null;
}

// Shows the trainer's name and photo (or a colored circle with their initial) in the top bar.
// Called right after the top bar HTML is built so the user area is always populated,
// regardless of when (or in what order) the page's own scripts run.
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

const HAMBURGER_HTML = `<button class="hamburger-btn" id="hamburgerBtn" aria-label="Toggle navigation">
    <span></span><span></span><span></span>
</button>`;

// Fills the top bar with a page title plus the bell and user menu on the right.
export function initTopbar(title = "Dashboard") {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    topbar.innerHTML = HAMBURGER_HTML + `<h1 class="topbar-title">${title}</h1>` + buildUserAreaHTML();
    applyTrainerProfile(getSessionTrainer());
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
    applyTrainerProfile(getSessionTrainer());
}

