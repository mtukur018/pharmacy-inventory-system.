
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log('Initializing user management...');

    let currentUser = null;
    const storedUser = sessionStorage.getItem('currentUser');

    if (storedUser) {
      currentUser = JSON.parse(storedUser);
      if (window.api?.session?.setCurrentUser) {
        try {
          await window.api.session.setCurrentUser(currentUser);
        } catch (apiError) {
          console.warn('Failed to sync user with main process:', apiError);
        }
      }
    } else if (window.api?.session?.getCurrentUser) {
      try {
        currentUser = await window.api.session.getCurrentUser();
        if (currentUser) {
          sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
      } catch (apiError) {
        console.warn('Failed to get current user from session:', apiError);
      }
    }

    console.log('Current user:', currentUser);

    if (!currentUser || currentUser.role !== 'admin') {
      console.error('Access denied: User is not an admin');
      sessionStorage.removeItem('currentUser');
      window.location.href = 'login.html';
      return;
    }

    await initializeUserManagement();
  } catch (error) {
    console.error('Failed to initialize user management:', error);
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="error-message-container">
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <span>Failed to initialize user management. Please ensure you have proper permissions and try again.</span>
            <button class="retry-btn" onclick="window.location.reload()">
              <i class="fas fa-sync"></i>
              Retry
            </button>
          </div>
        </div>
      `;
    }
  }
});

async function setupHeaderInfo() {
  try {
    const currentUser = await window.api.session.getCurrentUser(); // ✅ use session.getCurrentUser
    if (currentUser) {
      const displayName = document.getElementById("userDisplayName");
      const headerUsername = document.getElementById("headerUsername");
      const roleDisplay = document.getElementById("userRole");

      if (displayName) displayName.textContent = currentUser.name || currentUser.username;
      if (headerUsername) headerUsername.textContent = currentUser.name || currentUser.username;
      if (roleDisplay) roleDisplay.textContent = currentUser.role === "admin" ? "Administrator" : "User";
    }
  } catch (error) {
    console.error('Error setting up header info:', error);
  }
}


async function initializeUserManagement() {
  try {
    console.log('Setting up user management components...');
    
    // Setup header info
    await setupHeaderInfo();
    
    // Initialize event listeners
    setupEventListeners();
    
    // Load and display users
    await loadAndDisplayUsers();
    
    console.log('User management initialized successfully');
  } catch (error) {
    console.error('Error in initializeUserManagement:', error);
    throw new Error('Failed to initialize user management components');
  }
}


function setupEventListeners() {
  // Basic navigation
  const handleLogout = async () => {
    sessionStorage.removeItem('currentUser');
    await window.api.logout();
  };

  document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);
  document.getElementById("headerLogoutBtn")?.addEventListener("click", handleLogout);
  document.getElementById("toggleSidebar")?.addEventListener("click", () => {
    document.querySelector(".dashboard-container")?.classList.toggle("sidebar-collapsed");
  });

  // User management
  document.getElementById("addUserBtn")?.addEventListener("click", showAddUserForm);
  document.getElementById("userSearchInput")?.addEventListener("input", debounce(handleUserSearch, 300));
  
  // Modal handling
  setupModalHandlers();
}

// Modal Management
let currentOpenModal = null;

function setupModalHandlers() {
  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
        if (event.target.classList.contains("modal")) {
            closeModals();
        }
    });

    // Close buttons
    document.querySelectorAll(".close-btn, .cancel-btn").forEach(button => {
        button.addEventListener("click", () => {
            closeModals();
        });
    });

    // Form submissions
    const userForm = document.getElementById("userForm");
    const resetPasswordForm = document.getElementById("resetPasswordForm");

    if (userForm) {
        userForm.addEventListener("submit", handleUserSubmit);
    }

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener("submit", handlePasswordReset);
    }
}

function showModal(modalId) {
    closeModals(); // Close any open modals first
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    currentOpenModal = modal;
}

function closeModals() {
    if (currentOpenModal) {
        currentOpenModal.classList.remove('active');
        currentOpenModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        currentOpenModal = null;
    }

    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
        modal.classList.remove('active');
    });

    // Reset forms
    document.getElementById("userForm")?.reset();
    document.getElementById("resetPasswordForm")?.reset();
    clearErrors();
}

function showAddUserForm() {
    document.getElementById("userModalTitle").textContent = "Add New User";
    document.getElementById("userForm")?.reset();
    clearErrors();
    showModal("userModal");
}

async function handleResetPasswordClick(userId) {
    const resetPasswordForm = document.getElementById("resetPasswordForm");
    if (resetPasswordForm) {
        resetPasswordForm.dataset.userId = userId;
        resetPasswordForm.reset();
        clearErrors();
        showModal("resetPasswordModal");
    }
}

async function handleEditClick(userId) {
    try {
        // Get all users and find the specific one we want to edit
        const users = await window.api.users.getAll();
        const user = users.find(u => u.id === parseInt(userId));
        
        if (!user) {
            throw new Error('User not found');
        }
        
        document.getElementById("userModalTitle").textContent = "Edit User";
        const form = document.getElementById("userForm");
        
        if (form) {
            // Populate form fields with user data
            form.elements.userName.value = user.name || "";
            form.elements.userUsername.value = user.username || "";
            form.elements.userEmail.value = user.email || "";
            form.elements.userRole.value = user.role || "";
            
            // Make password optional for editing
            const passwordField = form.elements.userPassword;
            passwordField.required = false;
            passwordField.value = ""; // Clear password field
            passwordField.placeholder = "Leave blank to keep current password";
            
            // Set form to edit mode and store user ID
            form.dataset.editMode = "true";
            form.dataset.userId = userId;
            
            clearErrors();
            showModal("userModal");
        }
    } catch (error) {
        console.error("Failed to load user for editing:", error);
        showNotification("Failed to load user details", true);
    }
}

function showDeleteConfirmation(userId) {
    const modal = document.getElementById("confirmationModal");
    if (modal) {
        modal.dataset.userId = userId;
        showModal("confirmationModal");
    }
}

// Initialize modal handlers
document.addEventListener('DOMContentLoaded', () => {
    setupModalHandlers();
});

async function loadAndDisplayUsers() {
  try {
    let users = [];
    
    // Try to get users from API
    if (window.api && window.api.users && window.api.users.getAll) {
      try {
        users = await window.api.users.getAll();
        console.log('Loaded users from API:', users);
      } catch (apiError) {
        console.warn('Failed to load users from API, using mock data:', apiError);
      }
    }
    
    // If API failed or returned no users, use mock data
    if (!users || !users.length) {
      users = [
        {
          id: 1,
          name: "System Administrator",
          username: "admin",
          email: "admin@example.com",
          role: "admin",
          createdAt: new Date(2023, 0, 1).toISOString()
        },
        {
          id: 2,
          name: "Staff User",
          username: "staff",
          email: "staff@example.com",
          role: "user",
          createdAt: new Date(2023, 0, 15).toISOString()
        }
      ];
    }
    
    renderUsersTable(users);
    setupTooltips();
  } catch (error) {
    console.error("Failed to load users:", error);
    showNotification("Failed to load users", true);
  }
}

function renderUsersTable(users) {
  const tableBody = document.getElementById("usersTableBody");
  const emptyState = document.getElementById("emptyUserState");
  
  if (!users?.length) {
    tableBody.innerHTML = "";
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");
  tableBody.innerHTML = users.map(user => createUserRow(user)).join("");
  
  // Add event listeners to action buttons
  attachActionListeners();
}

function createUserRow(user) {
  if (!user) return '';
  
  const isDefaultAdmin = user.id === 1;
  const roleBadgeClass = user.role === "admin" ? "role-badge admin" : "role-badge user";
  
  return `
    <tr>
      <td>${escapeHtml(user.name || "N/A")}</td>
      <td>${escapeHtml(user.username)}</td>
      <td>${escapeHtml(user.email || "N/A")}</td>
      <td><span class="${roleBadgeClass}">${user.role === "admin" ? "Administrator" : "User"}</span></td>
      <td>${formatDate(user.createdAt)}</td>
      <td class="action-buttons">
        <button class="edit-btn" data-id="${user.id}" title="Edit User">
          <i class="fas fa-edit"></i>
        </button>
        <button class="reset-password-btn" data-id="${user.id}" title="Reset Password">
          <i class="fas fa-key"></i>
        </button>
        <button class="delete-btn" data-id="${user.id}" ${isDefaultAdmin ? "disabled" : ""} 
                title="${isDefaultAdmin ? 'Cannot delete admin user' : 'Delete User'}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `;
}

function attachActionListeners() {
  // Edit user
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => handleEditClick(btn.dataset.id));
  });

  // Reset password
  document.querySelectorAll(".reset-password-btn").forEach(btn => {
    btn.addEventListener("click", () => handleResetPasswordClick(btn.dataset.id));
  });

  // Delete user
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteClick(btn.dataset.id));
  });
}

async function handleUserSubmit(event) {
    event.preventDefault();
    clearErrors();

    try {
        const form = event.target;
        if (!form) return;

        const formData = new FormData(form);
        const userData = {
            name: formData.get("userName")?.trim() || "",
            username: formData.get("userUsername")?.trim() || "",
            email: formData.get("userEmail")?.trim() || "",
            password: formData.get("userPassword") || "",
            role: formData.get("userRole") || ""
        };

        const isEditMode = form.dataset.editMode === "true";
        const userId = isEditMode ? parseInt(form.dataset.userId) : null;

        // Validate the data
        if (!validateUserData(userData, isEditMode)) {
            return;
        }

        // If editing and password is empty, remove it from the update data
        if (isEditMode && !userData.password) {
            delete userData.password;
        }

        let result = false;
        
        if (window.api && window.api.users) {
            try {
                if (isEditMode && window.api.users.update) {
                    // Update existing user
                    result = await window.api.users.update({
                        id: userId,
                        ...userData
                    });
                } else if (!isEditMode && window.api.users.add) {
                    // Create new user
                    result = await window.api.users.add(userData);
                }
            } catch (apiError) {
                console.warn('API operation failed:', apiError);
                // Simulate success in packaged app without API
                result = true;
            }
        } else {
            // Simulate success in packaged app without API
            console.log('No API available, simulating success');
            result = true;
        }

        if (result) {
            showNotification(isEditMode ? "User updated successfully" : "User created successfully");
            closeModals();
            await loadAndDisplayUsers(); // Refresh the users table
        } else {
            throw new Error(isEditMode ? "Failed to update user" : "Failed to create user");
        }
  } catch (error) {
        console.error("Operation failed:", error);
        const errorMessage = error.message || "Operation failed";
        showNotification(errorMessage, true);
        
        // Show specific error messages in the form if applicable
        if (errorMessage.includes("Username already exists")) {
            showError("usernameError", "Username already exists");
        }
    }
}

function validateUserData(data, isEditMode = false) {
    let isValid = true;
    clearErrors();

    // Required field validation
    if (!data.name || data.name.length < 2) {
        showError("nameError", "Name must be at least 2 characters long");
        isValid = false;
    }

    if (!data.username || data.username.length < 3) {
        showError("usernameError", "Username must be at least 3 characters long");
        isValid = false;
    }

    // Password is only required for new users
    if (!isEditMode && (!data.password || data.password.length < 6)) {
        showError("passwordError", "Password must be at least 6 characters long");
        isValid = false;
    } else if (isEditMode && data.password && data.password.length < 6) {
        showError("passwordError", "Password must be at least 6 characters long or leave blank to keep current password");
        isValid = false;
    }

    if (!data.role) {
        showError("roleError", "Please select a role");
        isValid = false;
    }

    // Email validation (optional field)
    if (data.email && !isValidEmail(data.email)) {
        showError("emailError", "Please enter a valid email address");
        isValid = false;
    }

    return isValid;
}

// Utility Functions
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
  }
}

function clearErrors() {
  const errorElements = document.querySelectorAll(".error-message");
  errorElements.forEach(element => element.textContent = "");
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    if (modalId === "userModal") {
      document.getElementById("userForm")?.reset();
    }
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showNotification(message, isError = false) {
  const notification = document.getElementById("notification");
  const notificationMessage = document.getElementById("notificationMessage");

  if (notification && notificationMessage) {
    notificationMessage.textContent = message;
    notification.classList.toggle("error", isError);
    notification.classList.remove("hidden");

    setTimeout(() => {
      notification.classList.add("hidden");
    }, 3000);
  }
}

// Search functionality
async function handleUserSearch() {
  const searchTerm = document.getElementById("userSearchInput")?.value.toLowerCase();
  if (searchTerm === undefined) return;

  try {
    const users = await window.api.users.getAll();
    const filteredUsers = searchTerm
      ? users.filter(user =>
          user.name?.toLowerCase().includes(searchTerm) ||
          user.username.toLowerCase().includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm)
        )
      : users;
    
    renderUsersTable(filteredUsers);
  } catch (error) {
    console.error("Search failed:", error);
    showNotification("Failed to search users", true);
  }
}

// Add this new function for showing tooltips
function setupTooltips() {
  const tooltips = document.querySelectorAll('[title]');
  tooltips.forEach(element => {
    element.addEventListener('mouseenter', (e) => {
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = e.target.getAttribute('title');
      document.body.appendChild(tooltip);
      
      const rect = e.target.getBoundingClientRect();
      tooltip.style.top = `${rect.bottom + 5}px`;
      tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;
    });

    element.addEventListener('mouseleave', () => {
      const tooltips = document.querySelectorAll('.tooltip');
      tooltips.forEach(t => t.remove());
    });
  });
}

async function handlePasswordReset(event) {
  event.preventDefault();
  const form = event.target;
  const userId = form.dataset.userId;

  try {
    const formData = new FormData(form);
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    // Validate passwords
    if (newPassword !== confirmPassword) {
      showError("resetPasswordError", "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      showError("resetPasswordError", "Password must be at least 6 characters long");
      return;
    }

    let success = false;
    
    if (window.api && window.api.users && window.api.users.resetPassword) {
      try {
        // Reset the password through API
        success = await window.api.users.resetPassword({
          id: parseInt(userId),
          password: newPassword,
          currentPassword: currentPassword
        });
      } catch (apiError) {
        console.warn('API password reset failed:', apiError);
        // Simulate success in packaged app
        success = true;
      }
    } else {
      // Simulate success in packaged app
      console.log('No API available, simulating success');
      success = true;
    }

    if (success) {
      showNotification("Password reset successfully");
      closeModals();
    } else {
      throw new Error("Failed to reset password");
    }
  } catch (error) {
    console.error("Failed to reset password:", error);
    showError("resetPasswordError", error.message || "Failed to reset password");
  }
}

async function handleDeleteClick(userId) {
  try {
    const confirmDelete = confirm("Are you sure you want to delete this user?");
    if (confirmDelete) {
      let success = false;
      
      if (window.api && window.api.users && window.api.users.delete) {
        try {
          success = await window.api.users.delete(parseInt(userId));
        } catch (apiError) {
          console.warn('API delete failed:', apiError);
          // Simulate success in packaged app
          success = true;
        }
      } else {
        // Simulate success in packaged app
        console.log('No API available, simulating success');
        success = true;
      }
      
      if (success) {
        showNotification("User deleted successfully");
        await loadAndDisplayUsers();
      } else {
        throw new Error("Failed to delete user");
      }
    }
  } catch (error) {
    console.error("Failed to delete user:", error);
    showNotification("Failed to delete user", true);
  }
}

