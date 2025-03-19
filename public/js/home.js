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
    
    createHomeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const homeNameInput = document.getElementById('home-name');
        const homeName = homeNameInput.value.trim();
        
        if (!homeName) {
            showAlert('Please enter a home name', 'error');
            return;
        }
        
        // Disable the submit button to prevent multiple submissions
        const submitBtn = createHomeForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        try {
            // Get the current user token
            const token = await firebase.auth().currentUser.getIdToken();
            
            // Collect member data
            const members = [];
            const memberInputs = document.querySelectorAll('[id^="member-name-"]');
            memberInputs.forEach(input => {
                const index = input.id.split('-').pop();
                const nameInput = document.getElementById(`member-name-${index}`);
                const emailInput = document.getElementById(`member-email-${index}`);
                
                const name = nameInput.value.trim();
                const email = emailInput.value.trim();
                
                if (name && email) {
                    members.push({ name, email });
                }
            });
            
            // Send the request to create a home
            const response = await fetch('/api/homes/create', {
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
            
            if (!response.ok) {
                let errorMessage = 'Failed to create home';
                try {
                    const data = await response.json();
                    errorMessage = data.message || errorMessage;
                } catch (jsonError) {
                    console.error('Error parsing error response:', jsonError);
                    // Try to get the text response if JSON parsing fails
                    const textResponse = await response.text();
                    console.error('Error response text:', textResponse);
                    if (textResponse.includes('<!DOCTYPE') || textResponse.includes('<html>')) {
                        errorMessage = 'Server error. Please try again later.';
                    }
                }
                throw new Error(errorMessage);
            }
            
            // Get the response data
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Error parsing success response:', jsonError);
                throw new Error('Invalid response from server');
            }
            
            showAlert('Home created successfully!', 'success');
            
            // Store home ID and redirect to home page
            localStorage.setItem('currentHomeId', data.homeId);
            
            // Redirect to select-home page instead of dashboard
            setTimeout(() => {
                window.location.href = 'select-home.html';
            }, 1500);
            
        } catch (error) {
            console.error('Error creating home:', error);
            showAlert(error.message || 'Failed to create home', 'error');
            
            // Re-enable the submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
    
    // Join Home form submission
    const joinHomeForm = document.getElementById('join-home');
    
    joinHomeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const homeIdInput = document.getElementById('home-id');
        const homeId = homeIdInput.value.trim();
        
        if (!homeId) {
            showAlert('Please enter a home ID', 'error');
            return;
        }
        
        // Disable the submit button to prevent multiple submissions
        const submitBtn = joinHomeForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';
        
        try {
            // Get the current user token
            const token = await firebase.auth().currentUser.getIdToken();
            
            // Send the request to join a home
            const response = await fetch('/api/homes/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    homeId: homeId
                })
            });
            
            if (!response.ok) {
                let errorMessage = 'Failed to join home';
                try {
                    const data = await response.json();
                    errorMessage = data.message || errorMessage;
                } catch (jsonError) {
                    console.error('Error parsing error response:', jsonError);
                    // Try to get the text response if JSON parsing fails
                    const textResponse = await response.text();
                    console.error('Error response text:', textResponse);
                    if (textResponse.includes('<!DOCTYPE') || textResponse.includes('<html>')) {
                        errorMessage = 'Server error. Please try again later.';
                    }
                }
                throw new Error(errorMessage);
            }
            
            let responseData;
            try {
                responseData = await response.json();
                console.log('Join home response:', responseData);
            } catch (jsonError) {
                console.error('Error parsing success response:', jsonError);
                // If we can't parse the JSON but the response was OK, we'll continue
            }
            
            showAlert('Successfully joined the home!', 'success');
            
            // Store home ID and redirect
            localStorage.setItem('currentHomeId', homeId);
            
            // Redirect to select-home page instead of dashboard
            setTimeout(() => {
                window.location.href = 'select-home.html';
            }, 1500);
            
        } catch (error) {
            console.error('Error joining home:', error);
            showAlert(error.message || 'Failed to join home', 'error');
            
            // Re-enable the submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
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