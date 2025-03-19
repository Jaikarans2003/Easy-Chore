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
        // Get home ID from localStorage
        const homeId = localStorage.getItem('currentHomeId');
        
        if (!homeId) {
            showAlert('No home selected. Please select a home.', 'error');
            window.location.href = 'select-home.html';
            return;
        }
        
        // Fetch home data from API
        const token = await firebase.auth().currentUser.getIdToken();
        const response = await fetch(`/api/homes/${homeId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load home data');
        }
        
        // Parse the response
        const responseData = await response.json();
        console.log('Home data response:', responseData);
        
        // Handle different response structures
        // Sometimes the API returns the home directly, sometimes nested in a 'home' property
        let homeData;
        if (responseData.home) {
            homeData = responseData.home;
            console.log('Home data found in home property:', homeData);
        } else {
            homeData = responseData;
            console.log('Home data found directly in response:', homeData);
        }
        
        // Basic validation
        if (!homeData || (!homeData.homeId && !homeData._id)) {
            console.error('Invalid home data received:', homeData);
            throw new Error('Invalid home data received from server');
        }
        
        // Normalize the homeId (it could be homeId or _id depending on the API)
        homeData.homeId = homeData.homeId || homeData._id;
        
        // Make sure selectedHome is also set for the chat feature
        localStorage.setItem('selectedHome', JSON.stringify({
            homeId: homeData.homeId,
            name: homeData.name || 'My Home',
            members: homeData.members || []
        }));
        
        // Display home info
        displayHomeInfo(homeData);
        
        // Display members list
        if (homeData.members && homeData.members.length > 0) {
            displayMembers(homeData.members);
        } else {
            document.getElementById('members-list').innerHTML = '<li class="list-item">No members found</li>';
        }
    } catch (error) {
        console.error('Error loading home data:', error);
        showAlert('Error loading home data: ' + error.message, 'error');
    }
}

// Display home information
function displayHomeInfo(home) {
    console.log('Displaying home info:', home);
    const homeNameElement = document.getElementById('current-home-name');
    const homeIdElement = document.getElementById('home-id');
    
    if (homeNameElement) {
        homeNameElement.textContent = home.name || 'No Home';
        console.log('Set home name to:', home.name || 'No Home');
    } else {
        console.error('Home name element not found');
    }
    
    if (homeIdElement && home.homeId) {
        homeIdElement.textContent = `ID: ${home.homeId}`;
        console.log('Set home ID to:', home.homeId);
    } else {
        console.error('Home ID element not found or homeId missing');
    }
}

// Display members list
function displayMembers(members) {
    console.log('Displaying members:', members);
    const membersList = document.getElementById('members-list');
    if (!membersList) {
        console.error('Members list element not found');
        return;
    }

    membersList.innerHTML = '';
    
    if (!members || members.length === 0) {
        console.log('No members found');
        membersList.innerHTML = '<li class="list-item">No members found</li>';
        return;
    }

    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        console.error('Current user not found');
        return;
    }
    
    console.log('Current user:', currentUser.email);

    members.forEach(member => {
        // Skip invalid members
        if (!member || (!member.email && !member.uid)) {
            console.warn('Invalid member data:', member);
            return;
        }
        
        const memberItem = document.createElement('li');
        memberItem.className = 'list-item';
        
        // Get member name and email, with fallbacks
        const memberName = member.name || member.displayName || 'Unknown User';
        const memberEmail = member.email || 'No email';
        const memberUid = member.uid || member._id || '';
        
        // Check if this is the current user (by email or uid)
        const isCurrentUser = 
            (member.email && member.email === currentUser.email) || 
            (member.uid && member.uid === currentUser.uid);
        
        memberItem.innerHTML = `
            <div class="member-info">
                <span class="member-name">${memberName}</span>
                ${isCurrentUser ? '<span class="member-badge">You</span>' : ''}
                <span class="member-email">${memberEmail}</span>
            </div>
        `;
        
        membersList.appendChild(memberItem);
        console.log(`Added member: ${memberName} (${memberEmail}), isCurrentUser: ${isCurrentUser}`);
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