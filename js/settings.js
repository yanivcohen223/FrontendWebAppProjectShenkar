import { DataService } from './dataService.js';
import { fileToCompressedDataURL } from './imageUtils.js';
import { applyTrainerProfile } from './base.js';

function showToast(text, color) {
    const toast = document.getElementById('settingsToast');
    if (!toast) return;
    toast.textContent = text;
    toast.style.backgroundColor = color;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// Format a DB date (could be ISO string or Date) to yyyy-mm-dd for <input type=date>
function toDateInput(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d)) return '';
    return d.toISOString().slice(0, 10);
}

function fillForm(trainer) {
    document.getElementById('inputName').value = trainer.name ?? '';
    document.getElementById('inputEmail').value = trainer.email ?? '';
    if (trainer.specialization) document.getElementById('inputSpecialization').value = trainer.specialization;
    document.getElementById('inputDob').value = toDateInput(trainer.dateOfBirth);
    if (trainer.countryCode) document.getElementById('inputPhoneCode').value = trainer.countryCode;
    document.getElementById('inputPhone').value = trainer.phoneNumber ?? '';
    if (trainer.units) document.getElementById('inputUnits').value = trainer.units;
    document.getElementById('inputNotifications').checked = !!trainer.notificationsEnabled;
}

async function saveProfile(trainerId) {
    const data = {
        name: document.getElementById('inputName').value.trim(),
        email: document.getElementById('inputEmail').value.trim(),
        specialization: document.getElementById('inputSpecialization').value,
        date_of_birth: document.getElementById('inputDob').value || null,
        country_code: document.getElementById('inputPhoneCode').value,
        phone_number: document.getElementById('inputPhone').value.trim() || null,
        units: document.getElementById('inputUnits').value,
        notifications_enabled: document.getElementById('inputNotifications').checked,
    };
    // Include the avatar only when it changed: a new photo (data URL) or removal (null)
    if (avatarChanged) data.avatar_url = avatarDataUrl;
    await DataService.updateTrainerProfile(trainerId, data);
}

async function maybeChangePassword(trainerId) {
    const current = document.getElementById('inputCurrentPw').value;
    const next = document.getElementById('inputNewPw').value;
    const confirm = document.getElementById('inputConfirmPw').value;

    // All blank → user isn't changing password, skip silently
    if (!current && !next && !confirm) return { skipped: true };

    if (next !== confirm) throw new Error('New passwords do not match');
    await DataService.changePassword(trainerId, current, next, confirm);

    // Clear the fields after success
    document.getElementById('inputCurrentPw').value = '';
    document.getElementById('inputNewPw').value = '';
    document.getElementById('inputConfirmPw').value = '';
    return { changed: true };
}

// ---- Profile picture upload ----
const MAX_AVATAR_CHARS = 150000; // reject anything bigger before sending

let avatarDataUrl = null;   // new photo data URL, or null when removed
let avatarChanged = false;  // true once the photo was replaced or removed
let loadedTrainer = null;   // last trainer loaded from the server (for placeholder color/name)

function firstInitial(name) {
    return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

// Paint the settings preview: a photo when we have one, else a colored circle + initial.
// Uses a real <img> (not background-image) so it stays sharp under the page-zoom transform.
function showAvatar(url, color, name) {
    const el = document.getElementById('settingsAvatar');
    if (!el) return;
    let img = el.querySelector('.settings-avatar-img');
    let initial = el.querySelector('.settings-avatar-initial');

    if (url) {
        el.style.background = '#F3F3F3';
        if (!img) {
            img = document.createElement('img');
            img.className = 'settings-avatar-img';
            img.alt = '';
            el.insertBefore(img, el.firstChild);
        }
        img.src = url;
        if (initial) initial.remove();
    } else {
        el.style.background = color || '#D9D9D9';
        if (img) img.remove();
        if (!initial) {
            initial = document.createElement('span');
            initial.className = 'settings-avatar-initial';
            el.insertBefore(initial, el.firstChild);
        }
        initial.textContent = firstInitial(name);
    }
}

// Wire the avatar click + file input so a trainer can pick a photo
function initAvatarUpload() {
    const avatar = document.getElementById('settingsAvatar');
    const input = document.getElementById('avatarInput');
    if (!avatar || !input) return;

    const openPicker = () => input.click();
    avatar.addEventListener('click', openPicker);
    avatar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
    });

    input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if (!file) return;

        // Must be an image
        if (!file.type.startsWith('image/')) {
            showToast('Please choose an image file.', 'red');
            input.value = '';
            return;
        }

        try {
            const dataUrl = await fileToCompressedDataURL(file);
            // Safety net before sending the base64 string to the server
            if (dataUrl.length > MAX_AVATAR_CHARS) {
                showToast('Image is too large. Please choose a smaller photo.', 'red');
                input.value = '';
                return;
            }
            avatarDataUrl = dataUrl;
            avatarChanged = true;
            showAvatar(dataUrl); // live preview
        } catch {
            showToast('Could not load that image', 'red');
        }
        input.value = ''; // let the same file be re-picked later
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const session = DataService.getSession();
    if (!session) return;
    const trainerId = session.trainer.id;

    // Enable the profile picture upload
    initAvatarUpload();

    // Load current values into the form
    try {
        const trainer = await DataService.getTrainerById(trainerId);
        loadedTrainer = trainer;
        fillForm(trainer);
        showAvatar(trainer.avatarUrl, trainer.avatarColor, trainer.name);
    } catch (err) {
        console.error('Failed to load settings:', err);
        showToast('Failed to load your settings', 'red');
    }

    // Save changes
    document.getElementById('saveBtn').addEventListener('click', async () => {
        try {
            const photoChanged = avatarChanged;
            await saveProfile(trainerId);
            const pw = await maybeChangePassword(trainerId);

            let message = 'Changes saved!';
            if (photoChanged && pw.changed) message = 'Saved. Photo and password updated.';
            else if (photoChanged) message = 'Photo updated';
            else if (pw.changed) message = 'Saved. Password updated.';
            showToast(message, 'green');

            // Keep the session's trainer name/avatar in sync with edits
            const updated = await DataService.getTrainerById(trainerId);
            DataService.saveSession(updated, session.trainees || []);

            // Reflect the new photo/name in the top bar without a reload
            loadedTrainer = updated;
            avatarChanged = false;
            applyTrainerProfile(updated);
            showAvatar(updated.avatarUrl, updated.avatarColor, updated.name);
        } catch (err) {
            showToast(err.message || 'Failed to save', 'red');
        }
    });

    // Remove photo -> persist null immediately, then show the placeholder
    document.getElementById('removePhotoBtn').addEventListener('click', async () => {
        try {
            await DataService.updateTrainerProfile(trainerId, { avatar_url: null });
            avatarDataUrl = null;
            avatarChanged = false;

            const updated = await DataService.getTrainerById(trainerId);
            loadedTrainer = updated;
            DataService.saveSession(updated, session.trainees || []);
            applyTrainerProfile(updated);
            showAvatar(null, updated.avatarColor, updated.name);
            showToast('Photo removed', 'green');
        } catch (err) {
            showToast(err.message || 'Failed to remove photo', 'red');
        }
    });

    // Delete account
    document.getElementById('deleteBtn').addEventListener('click', async () => {
        const sure = confirm('Delete your account? This removes your trainer profile and unassigns your trainees. This cannot be undone.');
        if (!sure) return;
        try {
            await DataService.deleteTrainer(trainerId);
            DataService.clearSession();
            window.location.href = 'login.html';
        } catch (err) {
            showToast(err.message || 'Failed to delete account', 'red');
        }
    });
});
