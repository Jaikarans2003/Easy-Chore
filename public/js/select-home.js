// select-home.js - Home selection functionality

// Initialize Firebase
const auth = firebase.auth();

// DOM Elements
const homesList = document.getElementById('homes-list');
const createHomeBtn = document.getElementById('create-home-btn');
const logoutBtn = document.getElementById('logout-btn');

// Check authentication state
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        try {
            // Get token for API requests
            const token = await user.getIdToken();
            await loadUserHomes(token);
        } catch (error) {
            console.error('Error getting user token:', error);
            showNotification('Authentication error. Please try again.', 'error');
        }
    } else {
        // User is signed out, redirect to login
        window.location.href = 'index.html';
    }
});

// Load all homes the user belongs to
async function loadUserHomes(token) {
    try {
        // Show loading state
        homesList.innerHTML = '<div class="loading-indicator">Loading your homes...</div>';
        
        // Fetch homes from the server API
        const response = await fetch('/api/homes/user/homes', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch homes');
        }

        const data = await response.json();
        
        // Clear loading indicator
        homesList.innerHTML = '';

        if (!data.homes || data.homes.length === 0) {
            homesList.innerHTML = '<p class="no-homes">You don\'t belong to any homes yet.</p>';
            return;
        }

        // Add each home to the list
        data.homes.forEach(home => {
            const homeElement = createHomeElement(home);
            homesList.appendChild(homeElement);
        });
    } catch (error) {
        console.error('Error loading homes:', error);
        homesList.innerHTML = '<p class="error">Error loading homes. Please try again.</p>';
        showNotification('Error loading homes. Please try again.', 'error');
    }
}

// Create HTML element for a home
function createHomeElement(home) {
    const div = document.createElement('div');
    div.className = 'home-item';
    div.innerHTML = `
        <div class="home-info">
            <h3>${home.name}</h3>
            <p>${home.members.length} member${home.members.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="home-actions">
            <button class="btn primary-btn enter-home" data-home-id="${home.homeId}">
                <i class="fas fa-door-open"></i> Enter Home
            </button>
            ${home.isCreator ? `
                <button class="btn secondary-btn manage-home" data-home-id="${home.homeId}">
                    <i class="fas fa-cog"></i> Manage
                </button>
            ` : ''}
        </div>
    `;

    // Add event listeners
    const enterBtn = div.querySelector('.enter-home');
    enterBtn.addEventListener('click', () => enterHome(home.homeId));

    const manageBtn = div.querySelector('.manage-home');
    if (manageBtn) {
        manageBtn.addEventListener('click', () => manageHome(home.homeId));
    }

    return div;
}

// Enter a home
function enterHome(homeId) {
    try {
        // Store the selected home ID in localStorage
        localStorage.setItem('currentHomeId', homeId);
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Error entering home:', error);
        showNotification('Error entering home. Please try again.', 'error');
    }
}

// Manage a home
function manageHome(homeId) {
    // Redirect to home management page
    window.location.href = `manage-home.html?id=${homeId}`;
}

// Create new home
createHomeBtn.addEventListener('click', () => {
    window.location.href = 'home.html';
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showNotification('Error signing out. Please try again.', 'error');
    }
});

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
} 