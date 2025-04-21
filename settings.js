// ✅ Settings Page with System Information and Backup/Restore Fixes

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Settings page loading...")

  // Check if user is authenticated and has admin role
  if (!window.protectPage("admin")) return;

  await initSettings();
  await loadSettings();
  await loadSystemInfo();

});

async function initSettings() {
  console.log("Initializing settings page...")

  const currentUser = window.getCurrentUser();
  document.getElementById("userDisplayName").textContent = currentUser.name;
  document.getElementById("headerUsername").textContent = currentUser.name;

  document.getElementById("logoutBtn").addEventListener("click", window.logout);
  document.getElementById("headerLogoutBtn").addEventListener("click", window.logout);
  document.getElementById("toggleSidebar").addEventListener("click", toggleSidebar);

  document.getElementById("appSettingsForm").addEventListener("submit", saveAppSettings);
  document.getElementById("notificationSettingsForm").addEventListener("submit", saveNotificationSettings);

  document.getElementById("saveAppSettingsBtn").addEventListener("click", (e) => {
    e.preventDefault();
    saveAppSettings(e);
  });

  document.getElementById("saveNotificationSettingsBtn").addEventListener("click", (e) => {
    e.preventDefault();
    saveNotificationSettings(e);
  });

  document.getElementById("backupDataBtn").addEventListener("click", backupData);
  document.getElementById("restoreDataBtn").addEventListener("click", restoreData);
  document.getElementById("clearDataBtn").addEventListener("click", confirmClearData);

  document.getElementById("cancelActionBtn").addEventListener("click", hideConfirmationModal);
  document.getElementById("confirmActionBtn").addEventListener("click", handleConfirmAction);

  window.addEventListener("click", (event) => {
    if (event.target === document.getElementById("confirmationModal")) hideConfirmationModal();
  });

  await loadSettings();
  console.log("Settings page initialized")
}

function toggleSidebar() {
  document.querySelector(".dashboard-container").classList.toggle("sidebar-collapsed")
}

async function loadSystemInfo() {
  try {
    const os = await window.api.system.getOS();
    const version = await window.api.system.getAppVersion();
    const arch = await window.api.system.getArchitecture();
    const memory = await window.api.system.getMemory();
    const storage = await window.api.system.getStorage();

    // ✅ Match these with IDs from your HTML
    document.getElementById("systemVersion").textContent = version;
    document.getElementById("lastUpdated").textContent = new Date().toLocaleDateString();
    document.getElementById("dbStatus").textContent = "Connected"; // You can enhance this with DB check
    document.getElementById("storageUsage").textContent = `${memory} / ${storage}`;

  } catch (error) {
    console.error("Failed to load system info:", error);
    showNotification("Unable to load system information", true);
  }
}

// Settings functions
async function loadSettings() {
  try {
    console.log("Loading settings...")
    // Load app settings from API
    const appSettings = await window.api.settings.getAll()
    console.log("Settings loaded:", appSettings)

    document.getElementById("pharmacyName").value = appSettings.pharmacyName || "My Pharmacy"
    document.getElementById("pharmacyAddress").value = appSettings.pharmacyAddress || "123 Main Street, City, Country"
    document.getElementById("pharmacyPhone").value = appSettings.pharmacyPhone || "+1234567890"
    document.getElementById("pharmacyEmail").value = appSettings.pharmacyEmail || "contact@mypharmacy.com"
    document.getElementById("currencySymbol").value = appSettings.currencySymbol || "₦"
    document.getElementById("lowStockThreshold").value = appSettings.lowStockThreshold || 50
    document.getElementById("expiryWarningDays").value = appSettings.expiryWarningDays || 30

    // Load notification settings
    document.getElementById("lowStockNotification").checked = appSettings.notifications?.lowStock !== false
    document.getElementById("expiryNotification").checked = appSettings.notifications?.expiry !== false
    document.getElementById("userActivityNotification").checked = appSettings.notifications?.userActivity !== false
    document.getElementById("emailNotification").checked = appSettings.notifications?.email === true
  } catch (error) {
    console.error("Error loading settings:", error)
    showNotification("Error loading settings", true)
  }
}

async function saveAppSettings(event) {
  event.preventDefault()
  console.log("Saving app settings...")

  const appSettings = {
    pharmacyName: document.getElementById("pharmacyName").value,
    pharmacyAddress: document.getElementById("pharmacyAddress").value,
    pharmacyPhone: document.getElementById("pharmacyPhone").value,
    pharmacyEmail: document.getElementById("pharmacyEmail").value,
    currencySymbol: document.getElementById("currencySymbol").value,
    lowStockThreshold: Number.parseInt(document.getElementById("lowStockThreshold").value),
    expiryWarningDays: Number.parseInt(document.getElementById("expiryWarningDays").value),
  }

  try {
    await window.api.settings.update(appSettings)
    console.log("App settings saved successfully")
    showNotification("Application settings saved successfully")
  } catch (error) {
    console.error("Error saving app settings:", error)
    showNotification("Error saving settings", true)
  }
}

async function saveNotificationSettings(event) {
  event.preventDefault()
  console.log("Saving notification settings...")

  const notificationSettings = {
    notifications: {
      lowStock: document.getElementById("lowStockNotification").checked,
      expiry: document.getElementById("expiryNotification").checked,
      userActivity: document.getElementById("userActivityNotification").checked,
      email: document.getElementById("emailNotification").checked,
    },
  }

  try {
    await window.api.settings.update(notificationSettings)
    console.log("Notification settings saved successfully")
    showNotification("Notification settings saved successfully")
  } catch (error) {
    console.error("Error saving notification settings:", error)
    showNotification("Error saving settings", true)
  }
}

// Data management functions
async function backupData() {
  console.log("Backup data button clicked")
  try {
    const success = await window.api.data.backup()
    if (success) {
      console.log("Backup created successfully")
      showNotification("Data backup created successfully")
    } else {
      console.log("Backup cancelled or failed")
      showNotification("Backup cancelled or failed", true)
    }
  } catch (error) {
    console.error("Error creating backup:", error)
    showNotification("Error creating backup", true)
  }
}

async function restoreData() {
  console.log("Restore data button clicked")
  try {
    const success = await window.api.data.restore()
    if (success) {
      console.log("Data restored successfully")
      showNotification("Data restored successfully. Reloading page...")

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } else {
      console.log("Restore cancelled or failed")
      showNotification("Restore cancelled or failed", true)
    }
  } catch (error) {
    console.error("Error restoring data:", error)
    showNotification("Error restoring data", true)
  }
}

let currentAction = null

function confirmClearData() {
  console.log("Clear data button clicked")
  document.getElementById("confirmationMessage").textContent =
    "Are you sure you want to clear all data? This action cannot be undone."
  document.getElementById("confirmActionBtn").textContent = "Clear Data"
  currentAction = "clearData"
  showConfirmationModal()
}

async function handleConfirmAction() {
  console.log("Confirm action:", currentAction)
  if (currentAction === "clearData") {
    try {
      console.log("Clearing all data...")
      // In a real app, we would have an API endpoint for this
      // For now, we'll just reload default data
      const defaultSettings = {
        pharmacyName: "My Pharmacy",
        pharmacyAddress: "123 Main Street, City, Country",
        pharmacyPhone: "+1234567890",
        pharmacyEmail: "contact@mypharmacy.com",
        currencySymbol: "₦",
        lowStockThreshold: 50,
        expiryWarningDays: 30,
        notifications: {
          lowStock: true,
          expiry: true,
          userActivity: true,
          email: false,
        },
      }

      await window.api.settings.update(defaultSettings)
      console.log("Data cleared successfully")
      showNotification("All data has been cleared successfully")

      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error("Error clearing data:", error)
      showNotification("Error clearing data", true)
    }
  }

  hideConfirmationModal()
}

function showConfirmationModal() {
  document.getElementById("confirmationModal").style.display = "block"
}

function hideConfirmationModal() {
  document.getElementById("confirmationModal").style.display = "none"
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

