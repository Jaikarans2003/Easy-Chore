// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDJme3UanLUE3H2D3QY7xXaG_Xlbii1JL8",
    authDomain: "easy-chore-project.firebaseapp.com",
    projectId: "easy-chore-project",
    storageBucket: "easy-chore-project.appspot.com",
    messagingSenderId: "444941357579",
    appId: "1:444941357579:web:1867f23936ded8700b2d0e"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Simplified Home data cache utility
const HomeDataCache = {
    // Store home data in cache with the home ID as key
    storeHome: function(homeData) {
        if (homeData && homeData.homeId) {
            localStorage.setItem('home_data', JSON.stringify(homeData));
            console.log('Home data cached:', homeData.homeId);
        }
    },
    
    // Get home data from cache
    getHome: function(homeId) {
        const storedValue = localStorage.getItem('home_data');
        if (storedValue) {
            try {
                const homeData = JSON.parse(storedValue);
                // If homeId is provided, check if it matches
                if (homeId && homeData.homeId !== homeId) {
                    return null;
                }
                return homeData;
            } catch (e) {
                console.error('Error parsing cached home data:', e);
            }
        }
        return null;
    },
    
    // Clear cache for a specific home
    clearHome: function(homeId) {
        localStorage.removeItem('home_data');
    },
    
    // Clear all cached homes
    clearAll: function() {
        localStorage.removeItem('home_data');
    }
};

// Utility function to show authentication errors
function showAuthError(error) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } else {
        alert(`Authentication Error: ${error.message}`);
    }
    console.error('Auth Error:', error);
}

// Utility function to validate email format
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
} 