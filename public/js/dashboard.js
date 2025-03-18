// dashboard.js - Dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    firebase.auth().onAuthStateChanged(async function(user) {
        if (user) {
            try {
                const token = await user.getIdToken();
                localStorage.setItem('token', token);
                
                // Display user name if available
                const userNameElement = document.getElementById('user-name');
                if (userNameElement && user.displayName) {
                    userNameElement.textContent = user.displayName;
                }
                
                // Load home data
                await loadHomeData();
            } catch (error) {
                console.error('Error getting token:', error);
                showAlert('Authentication error. Please log in again.', 'error');
                handleLogout();
            }
        } else {
            handleLogout();
        }
    });

    // Setup logout button
    setupLogoutButton();
});

// Setup logout button
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        // Remove any existing click listeners
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        // Add click event listener
        newLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleLogout();
        });
    } else {
        console.error('Logout button not found');
    }
}

// Load home data
async function loadHomeData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found, redirecting to login');
            window.location.href = '/';
            return;
        }

        // First check if we have a currentHomeId in localStorage
        const currentHomeId = localStorage.getItem('currentHomeId');
        
        if (currentHomeId) {
            console.log('Using stored homeId:', currentHomeId);
            // Try to load specific home
            try {
                const homeResponse = await fetch(`/api/homes/${currentHomeId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (homeResponse.ok) {
                    const homeData = await homeResponse.json();
                    console.log('Home data loaded successfully:', homeData);
                    displayHomeInfo(homeData.home);
                    displayMembers(homeData.home.members);
                    return; // Success, exit function
                } else {
                    console.warn('Failed to load specific home, trying user homes endpoint');
                    // Continue to load all homes if specific home fails
                }
            } catch (specificHomeError) {
                console.error('Error loading specific home:', specificHomeError);
                // Continue to try loading all homes
            }
        }

        // Load all user homes as fallback
        console.log('Fetching all user homes');
        const response = await fetch('/api/homes/user/homes', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch homes, status:', response.status);
            throw new Error('Failed to fetch home data, status: ' + response.status);
        }

        const data = await response.json();
        console.log('User homes data:', data);
        
        if (data.homes && data.homes.length > 0) {
            const home = data.homes[0];
            // Store the current home ID
            localStorage.setItem('currentHomeId', home.homeId);
            displayHomeInfo(home);
            displayMembers(home.members);
        } else {
            console.log('No homes found, redirecting to create-join-home');
            // Only redirect if we're not already on the create-join-home page
            if (!window.location.pathname.includes('create-join-home.html')) {
                window.location.href = '/create-join-home.html';
            }
        }
    } catch (error) {
        console.error('Error loading home data:', error);
        showAlert('Failed to load home data. Please try again.', 'error');
    }
}

// Display home information
function displayHomeInfo(home) {
    const homeNameElement = document.getElementById('current-home-name');
    const homeIdElement = document.getElementById('home-id');
    
    if (homeNameElement) {
        homeNameElement.textContent = home.name || 'No Home';
    }
    
    if (homeIdElement && home.homeId) {
        homeIdElement.textContent = `ID: ${home.homeId}`;
    }
}

// Display members list
function displayMembers(members) {
    const membersList = document.getElementById('members-list');
    if (!membersList) return;

    membersList.innerHTML = '';
    
    if (!members || members.length === 0) {
        membersList.innerHTML = '<li class="list-item">No members found</li>';
        return;
    }

    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return;

    members.forEach(member => {
        const memberItem = document.createElement('li');
        memberItem.className = 'list-item';
        
        const isCurrentUser = member.email === currentUser.email;
        memberItem.innerHTML = `
            <div class="member-info">
                <span class="member-name">${member.name}</span>
                ${isCurrentUser ? '<span class="member-badge">You</span>' : ''}
                <span class="member-email">${member.email}</span>
            </div>
        `;
        
        membersList.appendChild(memberItem);
    });
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => alertDiv.remove(), 5000);
}

// Handle logout
async function handleLogout() {
    try {
        // First sign out from Firebase
        await firebase.auth().signOut();
        
        // Then clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Force reload the page to clear any cached state
        window.location.href = '/';
    } catch (error) {
        console.error('Logout Error:', error);
        showAlert('Failed to log out. Please try again.', 'error');
    }
}