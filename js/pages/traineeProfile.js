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

        const navParams = new URLSearchParams();
        navParams.append('id', traineeId);
        navParams.append('name', trainee.name);

        const btnEditTraining = document.getElementById('btnEditTraining');
        if (btnEditTraining) {
            btnEditTraining.addEventListener('click', () => {
                window.location.href = `edit-training-plan.html?${navParams.toString()}`;
            });
        }

        const btnCreatePlan = document.getElementById('btnCreateTraining');
        if (btnCreatePlan) {
            btnCreatePlan.addEventListener('click', () => {
                window.location.href = `create-training-plan.html?${navParams.toString()}`;
            });
        }
    } catch (error) {
        console.error('Error fetching trainee details:', error);
    }
}
