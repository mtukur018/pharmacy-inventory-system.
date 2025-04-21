// Initialize the authentication system
function initAuth() {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  const logoutBtns = document.querySelectorAll("#logoutBtn, #headerLogoutBtn");
  logoutBtns.forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", handleLogout); // renamed to prevent conflict
    }
  });
}

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorElement = document.getElementById("loginError");

  try {
    if (window.api?.users?.login) {
      const user = await window.api.users.login(username, password);
      if (user) {
        sessionStorage.setItem("currentUser", JSON.stringify(user));
        redirectToDashboard(user.role);
        return;
      }
    } else {
      const fallbackUsers = [
        { id: 1, username: "admin", password: "admin123", name: "System Administrator", role: "admin" },
        { id: 2, username: "staff", password: "staff123", name: "Staff User", role: "staff" }
      ];

      const user = fallbackUsers.find(
        (u) => u.username === username && u.password === password
      );

      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        sessionStorage.setItem("currentUser", JSON.stringify(userWithoutPassword));
        redirectToDashboard(user.role);
        return;
      }
    }

    errorElement.textContent = "Invalid username or password";
    errorElement.classList.remove("hidden");
  } catch (error) {
    console.error("Login error:", error);
    errorElement.textContent = "An error occurred during login";
    errorElement.classList.remove("hidden");
  }
}

// Redirect to appropriate dashboard based on role
function redirectToDashboard(role) {
  window.location.href = role === "admin" ? "admin-dashboard.html" : "user-dashboard.html";
}

// Renamed to avoid conflict with preload-exposed logout
async function handleLogout(event) {
  if (event) event.preventDefault();
  try {
    if (window.api?.session?.logout) {
      await window.api.session.logout(); // call the backend
    }
  } catch (err) {
    console.warn("Failed to call backend logout:", err);
  }

  sessionStorage.removeItem("currentUser");
  window.location.href = "login.html";
}

function isAuthenticated() {
  return !!sessionStorage.getItem("currentUser");
}

function getCurrentUser() {
  return JSON.parse(sessionStorage.getItem("currentUser")) || null;
}

function isAdmin() {
  const user = getCurrentUser();
  return user?.role === "admin";
}

function protectPage(requiredRole) {
  if (!isAuthenticated()) {
    window.location.href = "login.html";
    return false;
  }

  const user = getCurrentUser();
  if (requiredRole === "admin" && user.role !== "admin") {
    window.location.href = "user-dashboard.html";
    return false;
  }

  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  const isLoginPage = window.location.pathname.includes("login.html");
  const isIndexPage = window.location.pathname.endsWith("/") || window.location.pathname.endsWith("index.html");

  if (!isLoginPage && !isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  if (isIndexPage && isAuthenticated()) {
    const user = getCurrentUser();
    redirectToDashboard(user.role);
    return;
  }

  initAuth();
});

// Global access
window.protectPage = protectPage;
window.getCurrentUser = getCurrentUser;
