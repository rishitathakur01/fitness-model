let currentUser = null;
let activityChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initUser();
    await fetchData();
    initChart();

    // Form Submissions
    document.getElementById('workout-form').addEventListener('submit', handleWorkoutSubmit);
    document.getElementById('health-form').addEventListener('submit', handleHealthSubmit);
    document.getElementById('diet-form').addEventListener('submit', handleDietSubmit);
});

async function initUser() {
    try {
        const res = await fetch('/api/init-user');
        if (!res.ok) throw new Error('Server returned an error');
        currentUser = await res.json();
        document.getElementById('user-name').textContent = currentUser.name;
    } catch (err) {
        console.error('Error initializing user:', err);
        alert('Could not connect to the backend server. Please ensure the server is running and MongoDB is connected.');
    }
}

async function fetchData() {
    await Promise.all([
        fetchWorkouts(),
        fetchHealthRecords(),
        fetchDietPlans()
    ]);
}

async function fetchWorkouts() {
    const res = await fetch('/api/workouts');
    const workouts = await res.json();
    
    const historyList = document.getElementById('workout-history');
    historyList.innerHTML = '';
    
    let totalCalories = 0;
    let workoutCount = 0;
    const today = new Date().toDateString();

    workouts.forEach(w => {
        const workoutDate = new Date(w.date).toDateString();
        if (workoutDate === today) {
            totalCalories += w.caloriesBurned || 0;
            workoutCount++;
        }

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <div class="type">${w.type}</div>
                <div class="date">${new Date(w.date).toLocaleDateString()}</div>
            </div>
            <div class="history-value">${w.duration} min / ${w.caloriesBurned || 0} cal</div>
        `;
        historyList.appendChild(item);
    });

    document.getElementById('daily-calories').textContent = totalCalories;
    document.getElementById('daily-workouts').textContent = workoutCount;
    
    updateChart(workouts);
}

async function fetchHealthRecords() {
    const res = await fetch('/api/health');
    const records = await res.json();
    
    const historyList = document.getElementById('health-history');
    historyList.innerHTML = '';
    
    records.slice(0, 3).forEach(r => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <div class="type">HR: ${r.heartRate} bpm | Sleep: ${r.sleepHours}h</div>
                <div class="date">${new Date(r.date).toLocaleDateString()}</div>
            </div>
        `;
        historyList.appendChild(item);
    });
}

async function fetchDietPlans() {
    const res = await fetch('/api/diet');
    const diets = await res.json();
    
    const historyList = document.getElementById('diet-history');
    historyList.innerHTML = '';
    
    diets.slice(0, 3).forEach(d => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <div class="type">${d.mealName}</div>
                <div class="date">${new Date(d.date).toLocaleDateString()}</div>
            </div>
            <div class="history-value">${d.calories} cal</div>
        `;
        historyList.appendChild(item);
    });
}

async function handleWorkoutSubmit(e) {
    e.preventDefault();
    const workout = {
        userId: currentUser._id,
        type: document.getElementById('workout-type').value,
        duration: parseInt(document.getElementById('workout-duration').value),
        caloriesBurned: parseInt(document.getElementById('workout-calories').value) || 0
    };

    const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workout)
    });

    if (res.ok) {
        alert('Workout logged successfully!');
        e.target.reset();
        await fetchWorkouts();
        updateChart();
    } else {
        const err = await res.json();
        alert('Error logging workout: ' + err.error);
    }
}

async function handleHealthSubmit(e) {
    e.preventDefault();
    const health = {
        userId: currentUser._id,
        heartRate: parseInt(document.getElementById('health-heartrate').value),
        bloodPressure: document.getElementById('health-bp').value,
        waterIntake: parseFloat(document.getElementById('health-water').value),
        sleepHours: parseInt(document.getElementById('health-sleep').value)
    };

    const res = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(health)
    });

    if (res.ok) {
        alert('Health stats updated!');
        e.target.reset();
        await fetchHealthRecords();
    } else {
        const err = await res.json();
        alert('Error updating health: ' + err.error);
    }
}

async function handleDietSubmit(e) {
    e.preventDefault();
    const diet = {
        userId: currentUser._id,
        mealName: document.getElementById('meal-name').value,
        calories: parseInt(document.getElementById('meal-calories').value)
    };

    const res = await fetch('/api/diet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diet)
    });

    if (res.ok) {
        alert('Meal logged successfully!');
        e.target.reset();
        await fetchDietPlans();
    } else {
        const err = await res.json();
        alert('Error logging meal: ' + err.error);
    }
}

function initChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    try {
        activityChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Calories Burned',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { display: false },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Chart.js failed to initialize:', err);
    }
}

function updateChart(workouts = []) {
    if (!activityChart) return;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = [0, 0, 0, 0, 0, 0, 0];
    
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    workouts.forEach(w => {
        const d = new Date(w.date);
        if (d > lastWeek) {
            weeklyData[d.getDay()] += w.caloriesBurned || 0;
        }
    });

    // Reorder data to match chart labels (Mon-Sun)
    const orderedData = [1, 2, 3, 4, 5, 6, 0].map(i => weeklyData[i]);
    
    activityChart.data.datasets[0].data = orderedData;
    activityChart.update();
}
