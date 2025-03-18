// auth.js - Client side authentication functions

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDJme3UanLUE3H2D3QY7xXaG_Xlbii1JL8",
        authDomain: "easy-chore-project.firebaseapp.com",
        projectId: "easy-chore-project",
        storageBucket: "easy-chore-project.firebasestorage.app",
        messagingSenderId: "444941357579",
        appId: "1:444941357579:web:1867f23936ded8700b2d0e"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // Setup event listeners
    setupEventListeners();

    // Check authentication state
    checkAuthState();
});

// Setup all event listeners
function setupEventListeners() {
    // Modal functionality
    setupModals();

    // Form submissions
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Google authentication
    const googleLoginBtn = document.getElementById('google-login');
    const googleSignupBtn = document.getElementById('google-signup');
    
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => handleGoogleAuth('login'));
    }
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', () => handleGoogleAuth('signup'));
    }
}

// Setup modal functionality
function setupModals() {
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    
    // Login modal
    const loginBtn = document.getElementById('login-btn');
    const loginClose = loginModal?.querySelector('.close');

    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', () => showModal(loginModal));
    }

    if (loginClose) {
        loginClose.addEventListener('click', () => hideModal(loginModal));
    }

    // Signup modal
    const signupBtn = document.getElementById('signup-btn');
    const signupClose = signupModal?.querySelector('.close');

    if (signupBtn && signupModal) {
        signupBtn.addEventListener('click', () => showModal(signupModal));
    }

    if (signupClose) {
        signupClose.addEventListener('click', () => hideModal(signupModal));
    }

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) hideModal(loginModal);
        if (event.target === signupModal) hideModal(signupModal);
    });
}

// Modal helper functions
function showModal(modal) {
    if (modal) modal.style.display = 'block';
}

function hideModal(modal) {
    if (modal) modal.style.display = 'none';
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showAlert('Please enter both email and password', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const token = await userCredential.user.getIdToken();
        localStorage.setItem('token', token);
        
        hideModal(loginModal);
        showAlert('Login successful!', 'success');
        
        await checkUserHome(email);
    } catch (error) {
        console.error('Login Error:', error);
        let errorMessage = 'Login failed. Please check your credentials.';
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            errorMessage = 'Invalid email or password. Please try again.';
        }
        showAlert(errorMessage, 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Handle signup form submission
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;
    
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await user.updateProfile({ displayName: name });
        const token = await user.getIdToken();
        
        // Create user in backend
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                email,
                uid: user.uid
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to register user in database');
        }
        
        localStorage.setItem('token', token);
        hideModal(signupModal);
        showAlert('Account created successfully!', 'success');
        
        window.location.href = '/create-join-home.html';
    } catch (error) {
        console.error('Signup Error:', error);
        let errorMessage = 'Signup failed. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered. Please login instead.';
        }
        showAlert(errorMessage, 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Google authentication
async function handleGoogleAuth(type) {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await firebase.auth().signInWithPopup(provider);
        const token = await result.user.getIdToken();
        localStorage.setItem('token', token);
        
        if (type === 'signup') {
            window.location.href = '/create-join-home.html';
        } else {
            await checkUserHome(result.user.email);
        }
    } catch (error) {
        console.error('Google Auth Error:', error);
        showAlert('Google authentication failed. Please try again.', 'error');
    }
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

// Check if user has a home
async function checkUserHome(email) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/create-join-home.html';
            return;
        }

        const response = await fetch('/api/homes/user/homes', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user homes');
        }

        const data = await response.json();
        
        // If we're already on the create-join-home page, don't redirect
        if (window.location.pathname.includes('create-join-home.html')) {
            return;
        }
        
        if (data.homes && data.homes.length > 0) {
            // User has homes, redirect to home selection page
            window.location.href = '/select-home.html';
        } else {
            // No home found, redirect to create/join home
            window.location.href = '/create-join-home.html';
        }
    } catch (error) {
        console.error('Error checking user home:', error);
        // Only redirect if we're not already on the create-join-home page
        if (!window.location.pathname.includes('create-join-home.html')) {
            window.location.href = '/create-join-home.html';
        }
    }
}

// Check if user is already authenticated
function checkAuthState() {
    firebase.auth().onAuthStateChanged(async function(user) {
        if (user) {
            try {
                const token = await user.getIdToken();
                localStorage.setItem('token', token);
                
                if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                    await checkUserHome(user.email);
                }
            } catch (error) {
                console.error('Error getting token:', error);
                handleLogout();
            }
        } else {
            handleLogout();
        }
    });
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