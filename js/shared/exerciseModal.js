function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getOrCreateOverlay() {
    let overlay = document.getElementById('exModalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'exModalOverlay';
        overlay.className = 'ex-modal-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeExerciseModal();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeExerciseModal();
        });
    }
    return overlay;
}

function buildModalContent(exercise) {
    if (!exercise || !exercise.name) {
        return `
            <div class="ex-modal-card">
                <button class="ex-modal-close" aria-label="Close">✕</button>
                <div class="ex-modal-error">Could not load exercise details.</div>
            </div>`;
    }

    const secondaryMuscles = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];
    const instructions = Array.isArray(exercise.instructions) ? exercise.instructions : [];
    const hasBody = exercise.description || secondaryMuscles.length || instructions.length;

    return `
        <div class="ex-modal-card">
            <button class="ex-modal-close" aria-label="Close">✕</button>
            <div class="ex-modal-header">
                <h2 class="ex-modal-title">${escapeHtml(exercise.name)}</h2>
                <div class="ex-modal-tags">
                    ${exercise.target ? `<span class="ex-modal-tag">${escapeHtml(exercise.target)}</span>` : ''}
                    ${exercise.body_part && exercise.body_part !== exercise.target ? `<span class="ex-modal-tag">${escapeHtml(exercise.body_part)}</span>` : ''}
                    ${exercise.equipment ? `<span class="ex-modal-tag">${escapeHtml(exercise.equipment)}</span>` : ''}
                    ${exercise.difficulty ? `<span class="ex-modal-tag ex-modal-tag--difficulty">${escapeHtml(exercise.difficulty)}</span>` : ''}
                    ${exercise.category ? `<span class="ex-modal-tag ex-modal-tag--category">${escapeHtml(exercise.category)}</span>` : ''}
                </div>
            </div>
            <div class="ex-modal-body">
                ${!hasBody ? `<p class="ex-modal-no-details">No additional details available for this exercise.</p>` : ''}
                ${exercise.description ? `<p class="ex-modal-description">${escapeHtml(exercise.description)}</p>` : ''}
                ${secondaryMuscles.length ? `
                    <div class="ex-modal-section">
                        <h3 class="ex-modal-section-title">Secondary Muscles</h3>
                        <div class="ex-modal-muscles">
                            ${secondaryMuscles.map(m => `<span class="ex-modal-muscle">${escapeHtml(m)}</span>`).join('')}
                        </div>
                    </div>` : ''}
                ${instructions.length ? `
                    <div class="ex-modal-section">
                        <h3 class="ex-modal-section-title">Instructions</h3>
                        <ol class="ex-modal-instructions">
                            ${instructions.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
                        </ol>
                    </div>` : ''}
            </div>
        </div>`;
}

export function openExerciseModal(exercise) {
    const overlay = getOrCreateOverlay();
    try {
        overlay.innerHTML = buildModalContent(exercise);
        overlay.querySelector('.ex-modal-close').addEventListener('click', closeExerciseModal);
        overlay.classList.add('is-open');
    } catch (err) {
        console.error('Failed to render exercise modal:', err);
        overlay.innerHTML = `
            <div class="ex-modal-card">
                <button class="ex-modal-close" aria-label="Close">✕</button>
                <div class="ex-modal-error">Something went wrong. Please try again.</div>
            </div>`;
        overlay.querySelector('.ex-modal-close').addEventListener('click', closeExerciseModal);
        overlay.classList.add('is-open');
    }
}

export function closeExerciseModal() {
    const overlay = document.getElementById('exModalOverlay');
    if (overlay) overlay.classList.remove('is-open');
}
