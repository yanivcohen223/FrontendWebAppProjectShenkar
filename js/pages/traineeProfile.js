import { initTopbarBreadcrumb } from '../shared/topbar.js';
import { DataService } from '../services/dataService.js';
import { AnalyticsService } from '../services/analyticsService.js';

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
                             'traineeWeight', 'traineeSessionsMonth', 'traineeProgress'];
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
        document.getElementById('traineeProgress').textContent =
            trainee.progress != null ? `${trainee.progress}%` : 'N/A';

        await loadAndRenderActivePlan(trainee.id);
        await loadAndRenderActiveMealPlan(trainee.id);
        loadWeeklyActivityChart(trainee.id);
        loadRecentActivity(trainee.id);
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
                No active training plan found for this trainee. Go to templates page and assign a plan to your trainee.
            </div>
            `;
            return;
        }

        //insert plan id to query params
        if (btnEditTraining) {
            btnEditTraining.style.display = 'inline-flex';
            btnEditTraining.addEventListener('click', () => {
                window.location.href = `edit-training-plan.html?id=${traineeId}&name=${encodeURIComponent(currentTraineeName)}&planId=${activePlan.planId}`;
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

async function loadWeeklyActivityChart(traineeId) {
    const canvas = document.getElementById('traineeActivityChart');
    if (!canvas || typeof Chart === 'undefined') return;

    try {
        const data = await AnalyticsService.getTraineeWeeklyActivity(traineeId);

        const totalSessions = data.reduce((sum, d) => sum + d.sessions, 0);
        const sessionsEl = document.getElementById('traineeSessionsMonth');
        if (sessionsEl) {
            sessionsEl.textContent = totalSessions;
            sessionsEl.classList.remove('skeleton-text');
        }

        const labels = data.map(d => {
            const [y, m, day] = d.date.split('-');
            return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const values = data.map(d => d.sessions);

        // White background plugin so the chart-area background doesn't show through
        const whiteBg = {
            id: 'whiteBg',
            beforeDraw(chart) {
                const { ctx, chartArea: ca } = chart;
                if (!ca) return;
                ctx.save();
                ctx.fillStyle = '#f9f9f9';
                ctx.fillRect(ca.left, ca.top, ca.width, ca.height);
                ctx.restore();
            },
        };

        new Chart(canvas, {
            type: 'bar',
            plugins: [whiteBg],
            data: {
                labels,
                datasets: [{
                    label: 'Sessions',
                    data: values,
                    backgroundColor: '#4F46E5',
                    borderRadius: 6,
                    borderSkipped: false,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, precision: 0 },
                        grid: { color: 'rgba(0,0,0,0.06)' },
                    },
                    x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 10, maxRotation: 0 },
                    },
                },
            },
        });

        // Update title and remove placeholder label
        const titleEl = document.querySelector('.panel-activity-title');
        if (titleEl) titleEl.textContent = 'Last 30 Days';
        const label = canvas.closest('.chart-area')?.querySelector('.chart-label');
        if (label) label.remove();
    } catch {
        // Leave the placeholder if data can't be loaded
    }
}

async function loadRecentActivity(traineeId) {
    const listEl = document.getElementById('recentActivityList');
    if (!listEl) return;

    try {
        const sessions = await AnalyticsService.getTraineeRecentSessions(traineeId);

        if (!sessions || sessions.length === 0) {
            listEl.innerHTML = '<div class="plan-empty-state">No completed sessions this month.</div>';
            return;
        }

        const dumbbellIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 4v16M18 4v16M6 9h12M6 15h12M3 7h3M3 17h3M18 7h3M18 17h3"/>
        </svg>`;

        listEl.innerHTML = sessions.map(s => {
            const date = new Date(s.performed_at);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const volumeStr = s.total_volume > 0 ? `${s.total_volume.toLocaleString()} kg vol.` : 'Bodyweight';
            return `
                <div class="activity-item">
                    <span class="activity-icon">${dumbbellIcon}</span>
                    <div class="activity-details">
                        <span class="activity-name">${s.set_count} sets · ${volumeStr}</span>
                        <span class="activity-date">${dateStr}</span>
                    </div>
                    <span class="activity-status completed">Completed</span>
                </div>
            `;
        }).join('');
    } catch {
        listEl.innerHTML = '<div class="plan-empty-state">Could not load recent activity.</div>';
    }
}

async function loadAndRenderActiveMealPlan(traineeId) {
    // Get references to the nutrition plan elements
    const nutritionPlanNameEl = document.getElementById('nutritionPlanName');
    const nutritionCaloriesEl = document.getElementById('nutritionCalories');
    const nutritionProteinEl = document.getElementById('nutritionProtein');
    const nutritionCarbsEl = document.getElementById('nutritionCarbs');
    const nutritionFatsEl = document.getElementById('nutritionFats');
    const nutritionMealListEl = document.getElementById('nutritionMealList');
    const btnEditNutrition = document.getElementById('btnEditNutrition');
    const macroSkeletonIds = ['nutritionPlanName', 'nutritionCalories', 'nutritionProtein', 'nutritionCarbs', 'nutritionFats'];
    try {
        // Fetch the active meal plan for the trainee
        const activeMealPlan = await DataService.getActiveMealPlan(traineeId);
        macroSkeletonIds.forEach(id => document.getElementById(id)?.classList.remove('skeleton-text'));
        if (!activeMealPlan) {
            if (btnEditNutrition) btnEditNutrition.style.display = 'none';
            nutritionPlanNameEl.textContent = 'No active meal plan';
            nutritionCaloriesEl.textContent = 'N/A';
            nutritionProteinEl.textContent = 'N/A';
            nutritionCarbsEl.textContent = 'N/A';
            nutritionFatsEl.textContent = 'N/A';
            nutritionMealListEl.innerHTML = '<div class="plan-empty-state">No active meal plan found for this trainee. Go to the meal plan templates page to assign one.</div>';
            return;
        }
        //insert nutrition plan id to query params
        if (btnEditNutrition) {
            btnEditNutrition.style.display = 'block';
            btnEditNutrition.addEventListener('click', () => {
                window.location.href = `edit-meal-plan.html?id=${traineeId}&name=${encodeURIComponent(currentTraineeName)}&planId=${activeMealPlan.meal_plan_id}`;
            });
        }
        //this values can be zero, so we need to check for null or undefined instead of falsy values
        nutritionPlanNameEl.textContent = activeMealPlan.name || 'Unnamed Meal Plan';
        nutritionCaloriesEl.textContent = activeMealPlan.total_calories !== null && activeMealPlan.total_calories !== undefined ? `${activeMealPlan.total_calories} kcal` : 'N/A';
        nutritionProteinEl.textContent = activeMealPlan.total_protein !== null && activeMealPlan.total_protein !== undefined ? `${activeMealPlan.total_protein}g` : 'N/A';
        nutritionCarbsEl.textContent = activeMealPlan.total_carbs !== null && activeMealPlan.total_carbs !== undefined ? `${activeMealPlan.total_carbs}g` : 'N/A';
        nutritionFatsEl.textContent = activeMealPlan.total_fat !== null && activeMealPlan.total_fat !== undefined ? `${activeMealPlan.total_fat}g` : 'N/A';

        nutritionMealListEl.innerHTML = '';
        activeMealPlan.slots.forEach(slot => {
            const first = slot.options[0]?.name || '-';
            const rest = slot.options.length-1;
            const mealDescription = rest > 0 ? `${first} + ${rest} more` : first;
            nutritionMealListEl.innerHTML += `
                <div class="meal-row">
                    <strong>${slot.label}</strong>
                    <span class="meal-description">${mealDescription}</span>
                </div>
            `;
        });

    } catch (error) {
        console.error('Error fetching active meal plan:', error);
        macroSkeletonIds.forEach(id => document.getElementById(id)?.classList.remove('skeleton-text'));
        nutritionMealListEl.innerHTML = '<div class="plan-empty-state">Error loading active meal plan. Please try again later.</div>';
    }
}

