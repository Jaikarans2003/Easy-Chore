// home.js - Client-side home management functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '/';
            return;
        }
    });

    // Setup UI interactions
    setupUIInteractions();

    // Setup form submissions
    setupFormSubmissions();
});

// Setup UI interactions
function setupUIInteractions() {
    // Create Home card click
    const createHomeCard = document.getElementById('create-home-card');
    const createHomeForm = document.getElementById('create-home-form');
    const createHomeBtn = createHomeCard.querySelector('.btn');

    createHomeBtn.addEventListener('click', function() {
        createHomeCard.parentElement.style.display = 'none';
        createHomeForm.style.display = 'block';
    });

    // Join Home card click
    const joinHomeCard = document.getElementById('join-home-card');
    const joinHomeForm = document.getElementById('join-home-form');
    const joinHomeBtn = joinHomeCard.querySelector('.btn');

    joinHomeBtn.addEventListener('click', function() {
        joinHomeCard.parentElement.style.display = 'none';
        joinHomeForm.style.display = 'block';
    });

    // Back buttons
    const backButtons = document.querySelectorAll('.btn-back');
    backButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Hide all forms
            document.getElementById('create-home-form').style.display = 'none';
            document.getElementById('join-home-form').style.display = 'none';
            
            // Show option cards
            document.querySelector('.option-cards').style.display = 'flex';
        });
    });

    // Add member button
    const addMemberBtn = document.getElementById('add-member-btn');
    let memberCount = 1;

    addMemberBtn.addEventListener('click', function() {
        memberCount++;
        
        const memberInputs = document.createElement('div');
        memberInputs.className = 'member-inputs';
        memberInputs.innerHTML = `
            <div class="form-group">
                <label for="member-name-${memberCount}">Name</label>
                <input type="text" id="member-name-${memberCount}" placeholder="Member's name">
            </div>
            <div class="form-group">
                <label for="member-email-${memberCount}">Email</label>
                <input type="email" id="member-email-${memberCount}" placeholder="Member's email">
            </div>
            <button type="button" class="remove-member-btn"><i class="fas fa-times"></i></button>
        `;
        
        document.getElementById('members-container').appendChild(memberInputs);
        
        // Add event listener to remove button
        const removeBtn = memberInputs.querySelector('.remove-member-btn');
        removeBtn.addEventListener('click', function() {
            memberInputs.remove();
        });
    });
}

// Setup form submissions
function setupFormSubmissions() {
    // Create Home form submission
    const createHomeForm = document.getElementById('create-home');
    
    createHomeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const homeName = document.getElementById('home-name').value;
        
        // Get members data
        const members = [];
        const memberInputs = document.querySelectorAll('.member-inputs');
        
        memberInputs.forEach((memberInput, index) => {
            const nameInput = document.getElementById(`member-name-${index + 1}`);
            const emailInput = document.getElementById(`member-email-${index + 1}`);
            
            if (nameInput && emailInput && nameInput.value && emailInput.value) {
                members.push({
                    name: nameInput.value,
                    email: emailInput.value
                });
            }
        });
        
        // Show loading state
        const submitBtn = createHomeForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;
        
        // Get current user token
        firebase.auth().currentUser.getIdToken()
            .then(token => {
                // Create home in backend
                return fetch('/api/homes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: homeName,
                        members: members
                    })
                });
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to create home');
                }
                return response.json();
            })
            .then(data => {
                // Store home ID and redirect to dashboard
                localStorage.setItem('currentHomeId', data.home.homeId);
                
                // Show success message
                showAlert(`Home "${homeName}" created successfully! Your Home ID is: ${data.home.homeId}`, 'success');
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 2000);
            })
            .catch(error => {
                console.error('Create home error:', error);
                showAlert('Failed to create home. Please try again.', 'error');
                
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
    });
    
    // Join Home form submission
    const joinHomeForm = document.getElementById('join-home');
    
    joinHomeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const homeId = document.getElementById('home-id').value;
        
        // Show loading state
        const submitBtn = joinHomeForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Joining...';
        submitBtn.disabled = true;
        
        // Get current user token
        firebase.auth().currentUser.getIdToken()
            .then(token => {
                // Join home in backend
                return fetch('/api/homes/join', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        homeId: homeId
                    })
                });
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Home not found');
                    } else if (response.status === 400) {
                        throw new Error('You are already a member of this home');
                    } else {
                        throw new Error('Failed to join home');
                    }
                }
                return response.json();
            })
            .then(data => {
                // Store home ID and redirect to dashboard
                localStorage.setItem('currentHomeId', data.home.homeId);
                
                // Show success message
                showAlert(`Successfully joined home "${data.home.name}"!`, 'success');
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 2000);
            })
            .catch(error => {
                console.error('Join home error:', error);
                showAlert(error.message || 'Failed to join home. Please try again.', 'error');
                
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
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