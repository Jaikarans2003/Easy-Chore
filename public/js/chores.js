// chores.js - Client side chore management functions

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '/';
            return;
        }
        
        // Load home information
        loadHomeInfo();
        
        // Setup photo preview
        setupPhotoPreview();
        
        // Set default date to today
        const dateInput = document.getElementById('chore-date');
        if (dateInput) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            dateInput.value = formattedDate;
        }
        
        // Setup form submission
        const addChoreForm = document.getElementById('add-chore-form');
        if (addChoreForm) {
            addChoreForm.addEventListener('submit', handleAddChore);
        }
        
        // If on view chores page, load chores
        if (window.location.pathname.includes('view-chores')) {
            // Setup chore filter if it exists
            const choreFilter = document.getElementById('chore-filter');
            if (choreFilter) {
                choreFilter.addEventListener('change', function() {
                    filterChores(this.value);
                });
            }
            
            loadChores();
        }
    });
});

// Load home information
function loadHomeInfo() {
    const homeId = localStorage.getItem('currentHomeId');
    console.log('Loading home info for ID:', homeId);
    
    if (!homeId) {
        // No home selected, redirect to create/join page
        window.location.href = '/create-join-home.html';
        return;
    }
    
    // Always fetch fresh data
    fetchHomeInfo(homeId);
}

// Display home information
function displayHomeInfo(homeData) {
    console.log('Displaying home info:', homeData);
    
    // Display home name
    const homeNameElement = document.getElementById('current-home-name');
    if (homeNameElement) {
        homeNameElement.textContent = homeData.name;
        console.log('Updated home name to:', homeData.name);
    }
}

// Fetch home information from server
function fetchHomeInfo(homeId) {
    // Show loading state
    const homeNameElement = document.getElementById('current-home-name');
    if (homeNameElement) {
        homeNameElement.textContent = 'Loading...';
    }
    
    console.log('Fetching home info from server...');
    
    // Get current user token
    firebase.auth().currentUser.getIdToken()
        .then(token => {
            // Fetch home details
            return fetch(`/api/homes/${homeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Home not found');
                } else {
                    throw new Error('Failed to load home information');
                }
            }
            return response.json();
        })
        .then(data => {
            console.log('Home data received:', data);
            
            if (data.home) {
                // Store in cache for future use
                HomeDataCache.storeHome(data.home);
                
                // Display the home info
                displayHomeInfo(data.home);
            } else {
                throw new Error('Invalid home data received');
            }
        })
        .catch(error => {
            console.error('Error loading home:', error);
            
            if (error.message === 'Home not found') {
                // Clear the stored home ID
                localStorage.removeItem('currentHomeId');
                // Redirect to create/join page
                window.location.href = '/create-join-home.html';
            } else {
                showAlert('Failed to load home information. Please try again.', 'error');
            }
        });
}

// Setup photo preview
function setupPhotoPreview() {
    const photoInput = document.getElementById('chore-photo');
    const photoPreview = document.getElementById('photo-preview');
    
    if (photoInput && photoPreview) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (file) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    photoPreview.innerHTML = `<img src="${e.target.result}" alt="Chore Photo Preview">`;
                };
                
                reader.readAsDataURL(file);
            } else {
                photoPreview.innerHTML = `
                    <i class="fas fa-camera"></i>
                    <p>No photo selected</p>
                `;
            }
        });
    }
}

// Handle adding a new chore
function handleAddChore(e) {
    e.preventDefault();
    
    const choreType = document.getElementById('chore-type').value;
    const doneBy = document.getElementById('done-by').value;
    const date = document.getElementById('chore-date').value;
    const time = document.getElementById('chore-time').value;
    const notes = document.getElementById('chore-notes').value;
    const photoFile = document.getElementById('chore-photo').files[0];
    
    if (!choreType || !doneBy || !date) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }
    
    // Get home ID from localStorage
    const homeId = localStorage.getItem('currentHomeId');
    if (!homeId) {
        showAlert('Missing home ID. Please go back to dashboard and try again.', 'error');
        return;
    }
    
    console.log('Adding chore for home:', homeId);
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    // Combine date and time
    let choreDateTime = new Date(date);
    if (time) {
        const [hours, minutes] = time.split(':');
        choreDateTime.setHours(hours, minutes);
    }
    
    // Create chore data
    const choreData = {
        homeId: homeId,
        choreType: choreType,
        doneBy: doneBy,
        date: choreDateTime.toISOString(),
        notes: notes
    };
    
    console.log('Chore data prepared:', choreData);
    
    // If there's a photo, upload it first
    let uploadPhotoPromise = Promise.resolve(null);
    
    showAlert('Processing your request...', 'info');
    
    if (photoFile) {
        console.log('Photo file detected, starting upload');
        showAlert('Uploading photo...', 'info');
        uploadPhotoPromise = uploadChorePhoto(photoFile, homeId)
            .catch(error => {
                console.error('Photo upload error:', error);
                showAlert('Failed to upload photo, but we can still save your chore', 'error');
                return null; // Continue with null photoUrl
            });
    }
    
    // Get current user token
    firebase.auth().currentUser.getIdToken()
        .then(token => {
            // Upload photo if exists
            return uploadPhotoPromise.then(photoUrl => {
                if (photoUrl) {
                    choreData.photoUrl = photoUrl;
                    console.log('Photo uploaded successfully, URL:', photoUrl);
                    showAlert('Photo uploaded successfully!', 'success');
                }
                
                showAlert('Adding chore to database...', 'info');
                console.log('Submitting chore to API:', choreData);
                
                // Create chore in backend
                return fetch('/api/chores', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(choreData)
                });
            });
        })
        .then(response => {
            console.log('API response status:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    try {
                        const errorJson = JSON.parse(text);
                        throw new Error(errorJson.message || 'Failed to add chore');
                    } catch (e) {
                        throw new Error(`Failed to add chore (${response.status})`);
                    }
                });
            }
            return response.json();
        })
        .then(data => {
            // Show success message
            console.log('Chore created successfully:', data);
            showAlert('Chore added successfully!', 'success');
            
            // Reset form
            e.target.reset();
            
            // Reset photo preview
            const photoPreview = document.getElementById('photo-preview');
            if (photoPreview) {
                photoPreview.innerHTML = `
                    <i class="fas fa-camera"></i>
                    <p>No photo selected</p>
                `;
            }
            
            // Set default date to today
            const dateInput = document.getElementById('chore-date');
            if (dateInput) {
                const today = new Date();
                const formattedDate = today.toISOString().split('T')[0];
                dateInput.value = formattedDate;
            }
            
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            // Redirect to view chores page after a delay
            setTimeout(() => {
                window.location.href = 'view-chores.html';
            }, 2000);
        })
        .catch(error => {
            console.error('Error adding chore:', error);
            showAlert('Failed to add chore: ' + error.message, 'error');
            
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
}

// Upload chore photo
function uploadChorePhoto(photoFile, homeId) {
    return new Promise((resolve, reject) => {
        if (!photoFile || !homeId) {
            reject(new Error('Missing photo file or home ID'));
            return;
        }
        
        console.log('Starting photo upload process for home:', homeId);
        
        // Check if file is an image
        if (!photoFile.type.match('image.*')) {
            reject(new Error('Only image files are allowed'));
            return;
        }
        
        // Check file size - limit to 5MB
        if (photoFile.size > 5 * 1024 * 1024) {
            reject(new Error('File size exceeds 5MB limit'));
            return;
        }
        
        // Create FormData object for file upload
        const formData = new FormData();
        formData.append('photo', photoFile);
        
        console.log('Photo file added to FormData, size:', photoFile.size, 'bytes');
        
        // Update UI with indeterminate progress indicator
        const photoPreview = document.getElementById('photo-preview');
        if (photoPreview) {
            photoPreview.innerHTML = `
                <div class="upload-progress">
                    <p>Uploading photo...</p>
                    <div class="indeterminate-progress"></div>
                </div>
            `;
        }
        
        // Get current user token for authorization
        firebase.auth().currentUser.getIdToken()
            .then(token => {
                console.log('Got authentication token, uploading photo');
                // Upload file to server
                return fetch(`/api/uploads/chore-photos/${homeId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
            })
            .then(response => {
                console.log('Upload response status:', response.status);
                if (!response.ok) {
                    return response.text().then(text => {
                        try {
                            const errorJson = JSON.parse(text);
                            throw new Error(errorJson.message || 'Failed to upload photo');
                        } catch (e) {
                            throw new Error(`Upload failed (${response.status})`);
                        }
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Photo uploaded successfully:', data.photoUrl);
                
                // Show preview of uploaded image
                if (photoPreview) {
                    photoPreview.innerHTML = `<img src="${data.photoUrl}" alt="Chore Photo Preview">`;
                }
                
                resolve(data.photoUrl);
            })
            .catch(error => {
                console.error('Error uploading photo:', error);
                
                // Show error in preview area
                if (photoPreview) {
                    photoPreview.innerHTML = `
                        <div class="upload-error">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>${error.message || 'Failed to upload photo'}</p>
                        </div>
                    `;
                }
                
                reject(error);
            });
    });
}

// Store loaded chores for filtering
let loadedChores = [];

// Load chores for the view chores page
function loadChores() {
    const homeId = localStorage.getItem('currentHomeId');
    const choresList = document.getElementById('chores-list');
    
    if (!homeId || !choresList) {
        console.error('Missing homeId or choresList element');
        if (choresList) {
            choresList.innerHTML = '<li class="list-item error">Could not load chores: Missing home ID</li>';
        }
        return;
    }
    
    console.log('Loading chores for home:', homeId);
    
    // Show loading state
    choresList.innerHTML = '<li class="list-item loading">Loading chores...</li>';
    
    // Get current user token
    firebase.auth().currentUser.getIdToken()
        .then(token => {
            console.log('Got token, fetching chores');
            // Fetch chores - use the correct endpoint
            return fetch(`/api/chores/home/${homeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        })
        .then(response => {
            console.log('Chores API response status:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    try {
                        const errorJson = JSON.parse(text);
                        throw new Error(errorJson.message || 'Failed to load chores');
                    } catch (e) {
                        throw new Error(`Failed to load chores (${response.status})`);
                    }
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Chores data received:', data);
            
            // Clear loading
            choresList.innerHTML = '';
            
            if (!data.chores || data.chores.length === 0) {
                choresList.innerHTML = '<li class="list-item empty">No chores found. Add your first chore!</li>';
                return;
            }
            
            // Store for filtering
            loadedChores = data.chores;
            
            // Display chores
            displayChores(loadedChores);
        })
        .catch(error => {
            console.error('Error loading chores:', error);
            choresList.innerHTML = `<li class="list-item error">Failed to load chores: ${error.message}</li>`;
            
            // Still show add chore button if we failed to load chores
            const emptyStateHtml = `
                <li class="list-item add-new">
                    <a href="add-chore.html" class="add-new-button">
                        <i class="fas fa-plus"></i> Add Your First Chore
                    </a>
                </li>
            `;
            choresList.innerHTML += emptyStateHtml;
        });
}

// Display chores in the UI
function displayChores(chores) {
    const choresList = document.getElementById('chores-list');
    if (!choresList) return;

    choresList.innerHTML = '';
    
    chores.forEach(chore => {
        const choreCard = document.createElement('div');
        choreCard.className = 'chore-card';
        choreCard.innerHTML = `
            <div class="chore-header">
                <h3>${chore.choreType}</h3>
                <div class="chore-actions">
                    ${chore.photoUrl ? `<button class="btn-icon" onclick="openPhotoModal('${chore.photoUrl}')" title="View Photo">
                        <i class="fas fa-camera"></i>
                    </button>` : ''}
                    ${canDeleteChore(chore) ? `<button class="btn-icon delete-btn" onclick="deleteChore('${chore._id}')" title="Delete Chore">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </div>
            </div>
            <p class="chore-details">
                Done by: ${chore.doneBy}<br>
                Date: ${new Date(chore.date).toLocaleDateString()}<br>
                ${chore.notes ? `Notes: ${chore.notes}` : ''}
            </p>
        `;
        choresList.appendChild(choreCard);
    });
}

// Check if user can delete a chore
function canDeleteChore(chore) {
    const homeData = HomeDataCache.getHome();
    if (!homeData) return false;
    
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return false;
    
    const userMember = homeData.members.find(member => member.uid === currentUser.uid);
    const isHomeCreator = homeData.createdBy === currentUser.uid;
    const isChoreCreator = userMember && userMember.name === chore.doneBy;
    
    return isHomeCreator || isChoreCreator;
}

// Delete a chore
async function deleteChore(choreId) {
    if (!confirm('Are you sure you want to delete this chore?')) {
        return;
    }
    
    try {
        const token = await firebase.auth().currentUser.getIdToken();
        const response = await fetch(`/api/chores/${choreId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete chore');
        }
        
        showAlert('Chore deleted successfully', 'success');
        loadChores(); // Reload the chores list
    } catch (error) {
        console.error('Delete chore error:', error);
        showAlert(error.message || 'Failed to delete chore', 'error');
    }
}

// Filter chores by type
function filterChores(filterValue) {
    if (filterValue === 'all') {
        displayChores(loadedChores);
    } else {
        const filteredChores = loadedChores.filter(chore => 
            chore.choreType === filterValue
        );
        displayChores(filteredChores);
    }
}

// Open photo modal
function openPhotoModal(photoUrl) {
    // Create modal if it doesn't exist
    let photoModal = document.getElementById('photo-modal');
    
    if (!photoModal) {
        photoModal = document.createElement('div');
        photoModal.id = 'photo-modal';
        photoModal.className = 'modal';
        photoModal.innerHTML = `
            <div class="modal-content photo-modal-content">
                <span class="close">&times;</span>
                <img id="modal-photo" src="" alt="Chore Photo">
            </div>
        `;
        document.body.appendChild(photoModal);
        
        // Add close functionality
        const closeBtn = photoModal.querySelector('.close');
        closeBtn.addEventListener('click', function() {
            photoModal.style.display = 'none';
        });
        
        // Close when clicking outside the image
        photoModal.addEventListener('click', function(e) {
            if (e.target === photoModal) {
                photoModal.style.display = 'none';
            }
        });
    }
    
    // Set photo source
    const modalPhoto = document.getElementById('modal-photo');
    modalPhoto.src = photoUrl;
    
    // Show modal
    photoModal.style.display = 'block';
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

// Make openPhotoModal available globally
window.openPhotoModal = openPhotoModal;