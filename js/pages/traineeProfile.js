import { initTopbarBreadcrumb } from '../shared/topbar.js';
import { DataService } from '../services/dataService.js';

document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayTraineeDetails();
    tabManager();
    initPastPlansPagination();
});

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

function initPastPlansPagination() {
    const container = document.getElementById('pastPlansContainer');
    if (!container) return;

    const ITEMS_PER_PAGE = 3;
    let currentPage = 0;

    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');

    function getItems() {
        return Array.from(container.querySelectorAll('.past-plan-item'));
    }

    function render() {
        const items = getItems();
        const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));

        items.forEach((item, i) => {
            const visible = i >= currentPage * ITEMS_PER_PAGE && i < (currentPage + 1) * ITEMS_PER_PAGE;
            item.style.display = visible ? 'flex' : 'none';
        });

        pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;
        prevBtn.disabled = currentPage === 0;
        nextBtn.disabled = currentPage >= totalPages - 1;
    }

    prevBtn.addEventListener('click', () => {
        if (currentPage > 0) { currentPage--; render(); }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(getItems().length / ITEMS_PER_PAGE);
        if (currentPage < totalPages - 1) { currentPage++; render(); }
    });

    render();
}

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

        initTopbarBreadcrumb([
            { label: 'Trainees List', href: 'trainees.html' },
            { label: trainee.name }
        ]);
        document.getElementById('traineeName').textContent = trainee.name;
        document.getElementById('traineeGoal').textContent = 'Goal: ' + trainee.goal;
        document.getElementById('traineeStatus').textContent = trainee.status;
        document.getElementById('traineeWeight').textContent = trainee.weight;
        document.getElementById('traineeProgress').textContent = trainee.progress + '%';

        setupActionButtons(trainee.id, trainee.name);

        await loadAndRenderActivePlan(trainee.id);

    } catch (error) {
        console.error('Error fetching trainee details:', error);
    }
}

async function loadAndRenderActivePlan(traineeId) {
    const gridContainer = document.getElementById('plan-weeks-preview-grid');
    if (!gridContainer) return;

    try {
        const activePlan = await DataService.getActivePlanByTraineeId(traineeId);
        if (!activePlan) {
            document.getElementById('activePlanGoal').textContent = 'No active plan';
            document.getElementById('activePlanDays').textContent = '0 Days / Week';
            gridContainer.innerHTML = `
            <div class="plan-empty-state">
                No active training plan found for this trainee. Click "Create Training Plan" to generate one.
            </div>
            `;
            return;
        }

        document.getElementById('activePlanGoal').textContent = activePlan.goal || 'No goal specified';
        document.getElementById('activePlanDays').textContent = `${activePlan.daysPerWeek || 0} Days / Week`;
        gridContainer.innerHTML = '';
        const dayNames = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        //render exercises for each day
        activePlan.days.forEach(day => {
            const dayName = dayNames[day.dayNumber] || `Day ${day.dayNumber}`;
            if (!day.exercises || day.exercises.length === 0) {
                //restday card
                gridContainer.innerHTML += `
                <div class="workout-day-mini-card rest-day">
                    <div class="card-day-title rest-title">${dayName}</div>
                    <div class="card-day-subtitle">Rest Day</div>
                </div>
                `;
            } else {
                //exercise card
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
        })
    } catch (error) {
        console.error('Error fetching active plan:', error);
        gridContainer.innerHTML = `<div class="plan-empty-state">Error loading active plan. Please try again later.</div>`;
    }
}


function setupActionButtons(traineeId, traineeName) {
    const params = new URLSearchParams();
    params.append('id', traineeId);
    params.append('name', traineeName);

    const btnEditTraining = document.getElementById('btnEditTraining');
    if (btnEditTraining) {
        btnEditTraining.addEventListener('click', () => {
            window.location.href = `edit-training-plan.html?${params.toString()}`;
        });
    }

    const btnCreatePlan = document.getElementById('btnCreateTraining');
    if (btnCreatePlan) {
        btnCreatePlan.addEventListener('click', () => {
            window.location.href = `create-training-plan.html?${params.toString()}`;
        });
    }
}