// Initialize Firebase
const auth = firebase.auth();

// DOM Elements
const currentHomeName = document.getElementById('current-home-name');
const membersList = document.getElementById('members-list');
const addMemberForm = document.getElementById('add-member-form');
const logoutBtn = document.getElementById('logout-btn');

let currentHomeId = null;
let currentUserToken = null;

// Check authentication state
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Get home ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        currentHomeId = urlParams.get('id');
        
        if (!currentHomeId) {
            showNotification('No home selected', 'error');
            window.location.href = 'select-home.html';
            return;
        }
        
        try {
            // Get user token for API requests
            currentUserToken = await user.getIdToken();
            // Load home data
            await loadHomeData();
        } catch (error) {
            console.error('Authentication error:', error);
            showNotification('Authentication error. Please try again.', 'error');
        }
    } else {
        // User is signed out, redirect to login
        window.location.href = 'index.html';
    }
});

// Load home data
async function loadHomeData() {
    try {
        const response = await fetch(`/api/homes/${currentHomeId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUserToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch home data');
        }
        
        const data = await response.json();
        
        if (!data.home) {
            showNotification('Home not found', 'error');
            window.location.href = 'select-home.html';
            return;
        }
        
        // Update home name
        currentHomeName.textContent = data.home.name;
        
        // Check if user is the creator
        if (!data.home.isCreator) {
            showNotification('You do not have permission to manage this home', 'error');
            window.location.href = 'select-home.html';
            return;
        }
        
        // Load members
        await loadMembers();
    } catch (error) {
        console.error('Error loading home data:', error);
        showNotification('Error loading home data', 'error');
    }
}

// Load home members
async function loadMembers() {
    try {
        const response = await fetch(`/api/homes/${currentHomeId}/members`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUserToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch members');
        }
        
        const data = await response.json();
        
        // Clear existing members
        membersList.innerHTML = '';
        
        if (!data.members || data.members.length === 0) {
            membersList.innerHTML = '<p class="no-members">No members found.</p>';
            return;
        }
        
        // Display members
        data.members.forEach(member => {
            const memberElement = createMemberElement(member);
            membersList.appendChild(memberElement);
        });
    } catch (error) {
        console.error('Error loading members:', error);
        showNotification('Error loading members', 'error');
    }
}

// Create HTML element for a member
function createMemberElement(member) {
    const div = document.createElement('div');
    div.className = 'member-item';
    div.innerHTML = `
        <div class="member-info">
            <h4>${member.name || 'Unknown User'}</h4>
            <p>${member.email || 'No email'}</p>
            ${member.isCreator ? '<span class="badge">Creator</span>' : ''}
        </div>
        ${!member.isCreator ? `
            <button class="btn secondary-btn remove-member" data-member-id="${member.userId}">
                <i class="fas fa-user-minus"></i> Remove
            </button>
        ` : ''}
    `;
    
    // Add event listener for remove button
    const removeBtn = div.querySelector('.remove-member');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => removeMember(member.userId));
    }
    
    return div;
}

// Add new member
addMemberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('member-email').value.trim();
    const name = document.getElementById('member-name').value.trim();
    
    if (!email || !name) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/homes/add-member', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUserToken}`
            },
            body: JSON.stringify({
                homeId: currentHomeId,
                member: {
                    name: name,
                    email: email
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add member');
        }
        
        // Reset form
        addMemberForm.reset();
        
        // Reload members
        await loadMembers();
        
        showNotification('Member added successfully', 'success');
    } catch (error) {
        console.error('Error adding member:', error);
        showNotification(error.message || 'Error adding member', 'error');
    }
});

// Remove member
async function removeMember(memberId) {
    try {
        const response = await fetch('/api/homes/remove-member', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUserToken}`
            },
            body: JSON.stringify({
                homeId: currentHomeId,
                memberId: memberId
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to remove member');
        }
        
        // Reload members
        await loadMembers();
        
        showNotification('Member removed successfully', 'success');
    } catch (error) {
        console.error('Error removing member:', error);
        showNotification(error.message || 'Error removing member', 'error');
    }
}

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
        showNotification('Error signing out', 'error');
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