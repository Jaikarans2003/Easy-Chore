// select-home.js - Home selection functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(async function(user) {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '/';
            return;
        }

        try {
            // Display user name if available
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = user.displayName || user.email || 'User';
            }
            
            // Get token and load homes
            const token = await user.getIdToken();
            loadUserHomes(token);
        } catch (error) {
            console.error('Error getting user token:', error);
            showAlert('Failed to authenticate. Please log in again.', 'error');
        }
    });

    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// Load all homes for the current user
function loadUserHomes(token) {
    const homesList = document.getElementById('homes-list');
    
    if (!homesList) {
        console.error('Homes list element not found');
        return;
    }

    // Show loading
    homesList.innerHTML = '<li class="list-item loading">Loading your homes...</li>';
    
    // Fetch user's homes
    fetch('/api/homes/user/homes', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch homes');
        }
        return response.json();
    })
    .then(data => {
        console.log('User homes:', data);
        
        // Clear loading
        homesList.innerHTML = '';
        
        if (!data.homes || data.homes.length === 0) {
            homesList.innerHTML = `
                <li class="list-item empty">
                    <p>You don't have any homes yet.</p>
                    <a href="create-join-home.html" class="btn primary-btn">
                        <i class="fas fa-plus"></i> Create or Join a Home
                    </a>
                </li>
            `;
            return;
        }
        
        // Display homes
        data.homes.forEach(home => {
            const listItem = document.createElement('li');
            listItem.className = 'list-item home-item';
            listItem.setAttribute('data-home-id', home.homeId);
            
            listItem.innerHTML = `
                <div class="home-item-content">
                    <div class="home-item-name">${home.name}</div>
                    <div class="home-item-members">${home.members.length} members</div>
                    <div class="home-item-id">ID: ${home.homeId}</div>
                </div>
                <div class="home-item-actions">
                    <button class="btn primary-btn enter-home-btn">
                        <i class="fas fa-sign-in-alt"></i> Enter
                    </button>
                    <button class="btn secondary-btn manage-members-btn">
                        <i class="fas fa-users"></i> Manage Members
                    </button>
                </div>
            `;
            
            homesList.appendChild(listItem);
            
            // Add event listeners
            const enterBtn = listItem.querySelector('.enter-home-btn');
            if (enterBtn) {
                enterBtn.addEventListener('click', () => enterHome(home.homeId));
            }
            
            const manageBtn = listItem.querySelector('.manage-members-btn');
            if (manageBtn) {
                manageBtn.addEventListener('click', () => showMembersModal(home));
            }
        });
    })
    .catch(error => {
        console.error('Error loading homes:', error);
        homesList.innerHTML = `
            <li class="list-item error">
                <p>Failed to load homes: ${error.message}</p>
                <button class="btn secondary-btn" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </li>
        `;
    });
}

// Enter a home
function enterHome(homeId) {
    if (!homeId) {
        showAlert('Invalid home ID', 'error');
        return;
    }
    
    console.log('Entering home:', homeId);
    
    // Store the selected home ID in localStorage
    localStorage.setItem('currentHomeId', homeId);
    
    // Redirect to dashboard
    window.location.href = '/dashboard.html';
}

// Show modal for managing home members
function showMembersModal(home) {
    if (!home) {
        showAlert('Home data not available', 'error');
        return;
    }
    
    console.log('Managing members for home:', home.homeId);
    
    // Create modal if it doesn't exist
    let membersModal = document.getElementById('members-modal');
    
    if (membersModal) {
        // Remove existing modal to refresh
        membersModal.remove();
    }
    
    // Create new modal
    membersModal = document.createElement('div');
    membersModal.id = 'members-modal';
    membersModal.className = 'modal';
    
    // Generate list of current members
    let membersList = '';
    home.members.forEach(member => {
        membersList += `
            <li class="member-item">
                <div class="member-info">
                    <span class="member-name">${member.name}</span>
                    <span class="member-email">${member.email}</span>
                </div>
            </li>
        `;
    });
    
    membersModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Manage Members - ${home.name}</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <h4>Current Members</h4>
                <ul class="members-list">
                    ${membersList}
                </ul>
                
                <h4>Add New Member</h4>
                <form id="add-member-form">
                    <div class="form-group">
                        <label for="member-name">Name</label>
                        <input type="text" id="member-name" placeholder="Enter member's name" required>
                    </div>
                    <div class="form-group">
                        <label for="member-email">Email</label>
                        <input type="email" id="member-email" placeholder="Enter member's email" required>
                    </div>
                    <button type="submit" class="btn primary-btn">
                        <i class="fas fa-plus"></i> Add Member
                    </button>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(membersModal);
    
    // Show modal
    membersModal.style.display = 'block';
    
    // Close button functionality
    const closeBtn = membersModal.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            membersModal.style.display = 'none';
        });
    }
    
    // Close when clicking outside the modal content
    membersModal.addEventListener('click', function(e) {
        if (e.target === membersModal) {
            membersModal.style.display = 'none';
        }
    });
    
    // Add member form submission
    const addMemberForm = membersModal.querySelector('#add-member-form');
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nameInput = document.getElementById('member-name');
            const emailInput = document.getElementById('member-email');
            
            if (!nameInput || !emailInput) {
                showAlert('Form inputs not found', 'error');
                return;
            }
            
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            
            if (!name || !email) {
                showAlert('Please enter both name and email', 'error');
                return;
            }
            
            addMemberToHome(home.homeId, name, email, membersModal);
        });
    }
}

// Add a new member to a home
function addMemberToHome(homeId, name, email, modal) {
    // Show loading state
    const submitBtn = modal.querySelector('form button[type="submit"]');
    if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        submitBtn.disabled = true;
        
        // Get current user token
        firebase.auth().currentUser.getIdToken()
            .then(token => {
                return fetch('/api/homes/add-member', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        homeId: homeId,
                        member: {
                            name: name,
                            email: email
                        }
                    })
                });
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.message || 'Failed to add member');
                    });
                }
                return response.json();
            })
            .then(data => {
                showAlert('Member added successfully!', 'success');
                
                // Reset form
                const form = modal.querySelector('form');
                if (form) {
                    form.reset();
                }
                
                // Add new member to the list
                const membersList = modal.querySelector('.members-list');
                if (membersList) {
                    const li = document.createElement('li');
                    li.className = 'member-item';
                    li.innerHTML = `
                        <div class="member-info">
                            <span class="member-name">${name}</span>
                            <span class="member-email">${email}</span>
                            <span class="member-badge">Just added</span>
                        </div>
                    `;
                    membersList.appendChild(li);
                }
                
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            })
            .catch(error => {
                console.error('Error adding member:', error);
                showAlert(error.message || 'Failed to add member', 'error');
                
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
    }
}

// Handle logout
function handleLogout() {
    firebase.auth().signOut()
        .then(() => {
            // Clear storage and redirect to login
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        })
        .catch(error => {
            console.error('Logout error:', error);
            showAlert('Failed to log out', 'error');
        });
}

// Show alert message
function showAlert(message, type) {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Add alert to the page
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Remove alert after 3 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
} 