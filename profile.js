// Mock functions for demonstration purposes. In a real application, these would be properly implemented.
function protectPage(role) {
  // In a real application, this function would check if the user is authenticated and has the required role.
  console.log(`Protecting page for role: ${role}`)

  // Check if user is authenticated
  const currentUser = sessionStorage.getItem("currentUser")
  if (!currentUser) {
    window.location.href = "login.html"
    return false
  }

  return true
}

function getCurrentUser() {
  // In a real application, this function would retrieve the current user's information.
  const currentUser = sessionStorage.getItem("currentUser")
  return currentUser ? JSON.parse(currentUser) : null
}

function logout() {
  // In a real application, this function would clear the user's session and redirect to the login page.
  sessionStorage.removeItem("currentUser")
  window.location.href = "login.html"
}

// Protect this page for authenticated users
document.addEventListener("DOMContentLoaded", () => {
  console.log("Profile page loading...")

  // Check if user is authenticated
  if (!protectPage("any")) {
    return // Stop execution if not authenticated
  }

  initProfile()
})

function initProfile() {
  console.log("Initializing profile page...")

  // Set user information
  const currentUser = window.getCurrentUser()
  document.getElementById("userDisplayName").textContent = currentUser.name
  document.getElementById("headerUsername").textContent = currentUser.name

  // Add event listeners
  document.getElementById("logoutBtn").addEventListener("click", window.logout)
  document.getElementById("headerLogoutBtn").addEventListener("click", window.logout)
  document.getElementById("toggleSidebar").addEventListener("click", toggleSidebar)

  // Profile specific listeners
  document.getElementById("profileForm").addEventListener("submit", saveProfile)
  document.getElementById("passwordForm").addEventListener("submit", changePassword)

  // Add direct click handlers for the buttons
  document.getElementById("saveProfileBtn").addEventListener("click", (event) => {
    console.log("Save Profile button clicked")
    event.preventDefault()
    saveProfile(event)
  })

  document.getElementById("changePasswordBtn").addEventListener("click", (event) => {
    console.log("Change Password button clicked")
    event.preventDefault()
    changePassword(event)
  })

  // Load profile data
  loadProfileData()
  console.log("Profile page initialized")
}

function toggleSidebar() {
  document.querySelector(".dashboard-container").classList.toggle("sidebar-collapsed")
}

// Profile functions
function loadProfileData() {
  console.log("Loading profile data...")

  // Get current user from sessionStorage
  const currentUser = window.getCurrentUser()
  if (!currentUser) {
    console.log("No current user found")
    return
  }

  console.log("Current user:", currentUser)

  // Get full user data from users array via API
  window.api.users
    .getAll()
    .then((users) => {
      console.log("All users loaded")
      const userData = users.find((user) => user.id === currentUser.id)

      if (userData) {
        console.log("User data found:", userData)
        document.getElementById("fullName").value = userData.name || ""
        document.getElementById("username").value = userData.username || ""
        document.getElementById("email").value = userData.email || ""
        document.getElementById("phone").value = userData.phone || ""
        document.getElementById("role").value = userData.role === "admin" ? "Administrator" : "User"
      } else {
        console.log("User data not found for ID:", currentUser.id)
      }
    })
    .catch((error) => {
      console.error("Error loading users:", error)
    })
}

function saveProfile(event) {
  event.preventDefault()
  console.log("Saving profile...")

  // Get current user from sessionStorage
  const currentUser = window.getCurrentUser()
  if (!currentUser) {
    console.log("No current user found")
    return
  }

  // Get form values
  const name = document.getElementById("fullName").value
  const email = document.getElementById("email").value
  const phone = document.getElementById("phone").value

  console.log("Profile data to save:", { name, email, phone })

  // Update user data via API
  window.api.users
    .update({
      id: currentUser.id,
      name,
      email,
      phone,
    })
    .then((updatedUser) => {
      console.log("Profile updated successfully:", updatedUser)

      // Update current user in sessionStorage
      const updatedCurrentUser = {
        ...currentUser,
        name: updatedUser.name,
        email: updatedUser.email,
      }
      sessionStorage.setItem("currentUser", JSON.stringify(updatedCurrentUser))

      // Update display name
      document.getElementById("userDisplayName").textContent = updatedUser.name
      document.getElementById("headerUsername").textContent = updatedUser.name

      showNotification("Profile updated successfully")
    })
    .catch((error) => {
      console.error("Error updating profile:", error)
      showNotification("Error updating profile", true)
    })
}

async function changePassword(event) {
  event.preventDefault()
  console.log("Changing password...")

  // Reset error messages
  document.getElementById("currentPasswordError").textContent = ""
  document.getElementById("newPasswordError").textContent = ""
  document.getElementById("confirmPasswordError").textContent = ""

  // Get form values
  const currentPassword = document.getElementById("currentPassword").value
  const newPassword = document.getElementById("newPassword").value
  const confirmPassword = document.getElementById("confirmPassword").value

  // Validate form
  let isValid = true

  if (!currentPassword) {
    document.getElementById("currentPasswordError").textContent = "Current password is required"
    isValid = false
  }

  if (!newPassword) {
    document.getElementById("newPasswordError").textContent = "New password is required"
    isValid = false
  } else if (newPassword.length < 6) {
    document.getElementById("newPasswordError").textContent = "Password must be at least 6 characters long"
    isValid = false
  }

  if (newPassword !== confirmPassword) {
    document.getElementById("confirmPasswordError").textContent = "Passwords do not match"
    isValid = false
  }

  if (!isValid) {
    console.log("Password validation failed")
    return
  }

  try {
    // Get current user
    const currentUser = window.getCurrentUser()
    if (!currentUser) {
      throw new Error("No current user found")
    }

    // Get full user data to access hashed password
    const users = await window.api.users.getAll()
    const userData = users.find(user => user.id === currentUser.id)
    
    if (!userData) {
      throw new Error("User data not found")
    }

    // First verify current password
    const isAuthenticated = await window.api.users.verifyPassword({
      password: currentPassword,
      hashedPassword: userData.password
    })

    if (!isAuthenticated) {
      document.getElementById("currentPasswordError").textContent = "Current password is incorrect"
      return
    }

    // Hash new password and update
    const success = await window.api.users.resetPassword({
      id: currentUser.id,
      password: newPassword,
      currentPassword: currentPassword // Add this for extra security
    })

    if (success) {
      console.log("Password updated successfully")
      
      // Clear form
      document.getElementById("currentPassword").value = ""
      document.getElementById("newPassword").value = ""
      document.getElementById("confirmPassword").value = ""

      showNotification("Password updated successfully")
    } else {
      throw new Error("Failed to update password")
    }
  } catch (error) {
    console.error("Error changing password:", error)
    showNotification("Error changing password: " + error.message, true)
  }
}

function showNotification(message, isError = false) {
  const notification = document.getElementById("notification")
  const notificationMessage = document.getElementById("notificationMessage")

  notificationMessage.textContent = message
  notification.classList.toggle("error", isError)
  notification.classList.remove("hidden")

  setTimeout(() => {
    notification.classList.add("hidden")
  }, 3000)
}

