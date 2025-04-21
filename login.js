document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');

    // Check if user is already logged in
    checkLoginStatus();

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    async function checkLoginStatus() {
        try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                redirectBasedOnRole(currentUser);
            }
        } catch (error) {
            console.error('Error checking login status:', error);
        }
    }

    async function handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const user = await window.api.login(username, password);
            if (user) {
                // Store user in session
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                
                // Redirect based on role
                redirectBasedOnRole(user);
            } else {
                showNotification('Invalid username or password', true);
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Failed to login. Please try again.', true);
        }
    }

    function redirectBasedOnRole(user) {
        if (user.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }

    async function getCurrentUser() {
        try {
            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                return JSON.parse(storedUser);
            }

            const user = await window.api.getCurrentUser();
            if (user) {
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                return user;
            }

            return null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    function showNotification(message, isError = false) {
        if (notification && notificationMessage) {
            notificationMessage.textContent = message;
            notification.classList.toggle('error', isError);
            notification.classList.remove('hidden');
            
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 3000);
        }
    }
}); 