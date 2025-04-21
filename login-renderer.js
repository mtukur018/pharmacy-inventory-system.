// login-renderer.js - Client-side login logic
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            // Use the exposed API from preload script
            const user = await window.electronAPI.authenticate(username, password);
            
            if (user) {
                // Store user info in session storage
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                
                // Redirect based on user role
                if (user.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'user-dashboard.html';
                }
            } else {
                loginError.textContent = 'Invalid username or password';
            }
        } catch (error) {
            console.error('Authentication error:', error);
            loginError.textContent = 'An error occurred during login';
        }
    });
});