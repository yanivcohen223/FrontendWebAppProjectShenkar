// Shared toast & confirm dialog — replaces all alert() / confirm() calls.

const ICONS = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M8 12l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="17" r="1" fill="currentColor"/>
    </svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <line x1="12" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
};

const CONFIRM_ICONS = {
    danger: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="17" r="1" fill="currentColor"/>
    </svg>`,
    warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="17" r="1" fill="currentColor"/>
    </svg>`,
    info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <line x1="12" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
};

function getContainer() {
    let c = document.getElementById('sportie-toast-container');
    if (!c) {
        c = document.createElement('div');
        c.id = 'sportie-toast-container';
        document.body.appendChild(c);
    }
    return c;
}

export function showToast(message, type = 'info', duration = 3200) {
    const container = getContainer();

    const toast = document.createElement('div');
    toast.className = `sportie-toast ${type}`;
    toast.innerHTML = `
        <span class="sportie-toast-icon">${ICONS[type] || ICONS.info}</span>
        <span class="sportie-toast-body">${message}</span>
        <button class="sportie-toast-close" aria-label="Close">&#x2715;</button>
    `;

    const dismiss = () => {
        toast.classList.add('leaving');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };

    toast.querySelector('.sportie-toast-close').addEventListener('click', dismiss);
    container.appendChild(toast);

    setTimeout(dismiss, duration);
}


export function showConfirm(message, opts = {}) {
    const {
        title = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        variant = 'danger',
    } = opts;

    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'sportie-overlay';
        overlay.innerHTML = `
            <div class="sportie-confirm" role="dialog" aria-modal="true">
                <div class="sportie-confirm-icon ${variant}">${CONFIRM_ICONS[variant] || CONFIRM_ICONS.danger}</div>
                <div class="sportie-confirm-title">${title}</div>
                <div class="sportie-confirm-msg">${message}</div>
                <div class="sportie-confirm-actions">
                    <button class="sportie-confirm-cancel">${cancelText}</button>
                    <button class="sportie-confirm-ok ${variant}">${confirmText}</button>
                </div>
            </div>
        `;

        const close = (result) => {
            overlay.remove();
            resolve(result);
        };

        overlay.querySelector('.sportie-confirm-cancel').addEventListener('click', () => close(false));
        overlay.querySelector('.sportie-confirm-ok').addEventListener('click', () => close(true));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });

        document.body.appendChild(overlay);
        overlay.querySelector('.sportie-confirm-ok').focus();
    });
}
