import { initTopbarBreadcrumb } from './topbar.js';
import { DataService } from './dataService.js';

document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayTraineeDetails();

});

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

        const params = new URLSearchParams();

        params.append('id', traineeId);
        params.append('name', trainee.name);

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
    } catch (error) {
        console.error('Error fetching trainee details:', error);
    }
}


async function getTraineeDetails() {
    const params = new URLSearchParams(window.location.search);
    const traineeId = params.get('id');
    console.log('Trainee ID from URL:', traineeId);
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
        console.log('Trainee details:', trainee);
        document.getElementById('traineeName').textContent = trainee.name;
        document.getElementById('traineeGoal').textContent = 'Goal: ' + trainee.goal;
        document.getElementById('traineeStatus').textContent = trainee.status;
        document.getElementById('traineeWeight').textContent = trainee.weight;
        document.getElementById('traineeProgress').textContent = trainee.progress + '%';
        return trainee;
    } catch (error) {
        console.error('Error fetching trainee details:', error);
        return;
    }
}