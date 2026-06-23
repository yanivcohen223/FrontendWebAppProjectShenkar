import { initTopbarBreadcrumb } from '../shared/topbar.js';
import { DataService } from '../services/dataService.js';

let currentTraineeName = '';

// Loads the trainee's details and sets up the profile tabs.
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayTraineeDetails();
    tabManager();
});

// Switches between the profile tabs (Overview / Plans / Nutrition).
function tabManager() {
    const tabButtons = document.querySelectorAll('.profile-tab');
    const tabPanels = document.querySelectorAll('.profile-tab-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabPanels.forEach(panel => panel.classList.remove('active'));

            const targetPanel = document.getElementById(`tab-${targetTab}`);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });
}

// Reads the trainee id from the URL, fetches that trainee, and fills in the header info.
async function loadAndDisplayTraineeDetails() {
    const params = new URLSearchParams(window.location.search);
    const traineeId = params.get('id');
    if (!traineeId) {
        console.error('No trainee ID provided in URL.');
        return;
    }

    try {
        const trainee = await DataService.getTraineeById(traineeId);
        if (!trainee) {
            console.error('No trainee found with ID:', traineeId);
            return;
        }

        currentTraineeName = trainee.name;

        initTopbarBreadcrumb([
            { label: 'Trainees List', href: 'trainees.html' },
            { label: trainee.name }
        ]);

        // Avatar
        const avatarImg = document.getElementById('traineeAvatar');
        const avatarWrap = document.querySelector('.profile-avatar-wrap');
        if (trainee.avatarUrl) {
            avatarImg.src = trainee.avatarUrl;
        } else if (trainee.avatarColor && avatarWrap) {
            avatarWrap.style.background = trainee.avatarColor;
        }

        const skeletonIds = ['traineeName', 'traineeAge', 'traineeGoal', 'traineeStatus',
                             'traineeWeight', 'traineeDuration', 'traineeProgress'];
        skeletonIds.forEach(id => document.getElementById(id)?.classList.remove('skeleton-text'));

        document.getElementById('traineeName').textContent = trainee.name ?? 'Unknown';
        document.getElementById('traineeGoal').textContent = 'Goal: ' + (trainee.goal ?? 'N/A');
        document.getElementById('traineeAge').textContent =
            trainee.age != null ? `Age: ${trainee.age}` : 'Age: N/A';

        const statusEl = document.getElementById('traineeStatus');
        const statusText = trainee.status || 'active';
        statusEl.textContent = statusText.charAt(0).toUpperCase() + statusText.slice(1);
        statusEl.className = `status-badge ${statusText.toLowerCase()}`;

        document.getElementById('traineeWeight').textContent =
            trainee.weight != null ? `${trainee.weight} Kg` : 'N/A';
        document.getElementById('traineeDuration').textContent = 'N/A';
        document.getElementById('traineeProgress').textContent =
            trainee.progress != null ? `${trainee.progress}%` : 'N/A';

        await loadAndRenderActivePlan(trainee.id);
    } catch (error) {
        console.error('Error fetching trainee details:', error);
    }
}

// Loads the trainee's active plan and draws the weekly preview cards (or an empty state).
async function loadAndRenderActivePlan(traineeId) {
    const gridContainer = document.getElementById('plan-weeks-preview-grid');
    if (!gridContainer) return;

    try {
        const activePlan = await DataService.getActivePlanByTraineeId(traineeId);

        const btnEditTraining = document.getElementById('btnEditPlan');
        
        //if not plan, hide the edit btn and show relevent message
        if (!activePlan) {
            if (btnEditTraining) btnEditTraining.style.display = 'none';

            document.getElementById('activePlanGoal').textContent = 'No active plan';
            document.getElementById('activePlanDays').textContent = '0 Days / Week';
            gridContainer.innerHTML = `
            <div class="plan-empty-state">
                No active training plan found for this trainee. Click "Create Training Plan" to generate one.
            </div>
            `;
            return;
        }

        //insert plan id to query params
        if (btnEditTraining) {
            btnEditTraining.style.display = 'inline-flex';
            btnEditTraining.addEventListener('click', () => {
                window.location.href = `create-training-plan.html?id=${traineeId}&name=${encodeURIComponent(currentTraineeName)}&planId=${activePlan.planId}`;
            });
        }

        document.getElementById('activePlanGoal').textContent = activePlan.goal || 'No goal specified';
        document.getElementById('activePlanDays').textContent = `${activePlan.daysPerWeek || 0} Days / Week`;
        gridContainer.innerHTML = '';
        const dayNames = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        activePlan.days.forEach(day => {
            const dayName = dayNames[day.dayNumber] || `Day ${day.dayNumber}`;
            if (!day.exercises || day.exercises.length === 0) {
                gridContainer.innerHTML += `
                <div class="workout-day-mini-card rest-day">
                    <div class="card-day-title rest-title">${dayName}</div>
                    <div class="card-day-subtitle">Rest Day</div>
                </div>
                `;
            } else {
                const sampleExercise = day.exercises[0];
                gridContainer.innerHTML += `
                <div class="workout-day-mini-card">
                <div class="card-day-title active-title">${dayName}</div>
                <div class="card-day-subtitle active-workout-text">Active Workout</div>
                <div class="card-day-metrics">
                    ${day.exercises.length} Exercises • ${sampleExercise.sets}x${sampleExercise.reps}
                </div>
                </div>
                `;
            }
        });
    } catch (error) {
        console.error('Error fetching active plan:', error);
        gridContainer.innerHTML = `<div class="plan-empty-state">Error loading active plan. Please try again later.</div>`;
    }
}

