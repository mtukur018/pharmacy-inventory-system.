// Remove the require statement as it's not compatible with browser JavaScript
// const { medications, settings } = require('../src/dataService');

// Check if the API is available
if (!window.api || !window.api.medications || !window.api.medications.getAll) {
  console.error("API not available! Creating mock API for testing...");
  // Create a mock API for testing if the actual API is not available
  window.api = {
    medications: {
      getAll: async () => {
        console.log("Using mock medication data");
        return [
          {
            id: 1,
            name: "Paracetamol",
            category: "analgesic",
            manufacturer: "ABC Pharma",
            stock: 100,
            retailPrice: 5.99,
            wholesalePrice: 4.50,
            expiryDate: "2024-12-31",
            description: "Pain reliever"
          },
          {
            id: 2,
            name: "Amoxicillin",
            category: "antibiotic",
            manufacturer: "XYZ Pharma",
            stock: 50,
            retailPrice: 12.99,
            wholesalePrice: 10.50,
            expiryDate: "2024-06-30",
            description: "Antibiotic"
          },
          {
            id: 3,
            name: "Vitamin C",
            category: "supplement",
            manufacturer: "Health Co",
            stock: 200,
            retailPrice: 8.99,
            wholesalePrice: 7.50,
            expiryDate: "2025-01-15",
            description: "Vitamin supplement"
          }
        ];
      }
    },
    settings: {
      getAll: async () => {
        console.log("Using mock settings");
        return {
          lowStockThreshold: 60,
          expiryWarningDays: 90
        };
      }
    },
    getCurrentUser: async () => {
      console.log("Using mock user");
      return {
        name: "Test User",
        username: "testuser",
        role: "staff"
      };
    },
    logout: async () => {
      console.log("Mock logout");
      return true;
    }
  };
}

// Protect this page for authenticated users
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("Inventory view initializing...");
    
    // Check if user is authenticated
    const currentUser = await getCurrentUser();
    console.log("Current user:", currentUser);
    
    if (!currentUser) {
      console.log("No user found, redirecting to login");
      window.location.href = 'login.html';
      return;
    }

    // Redirect admin to admin inventory
    if (currentUser.role === 'admin') {
      console.log("Admin user detected, redirecting to admin inventory");
      window.location.href = 'admin-inventory.html';
      return;
    }

    // Get settings first to ensure they're available globally
    try {
      console.log("Fetching settings...");
      window.settings = await window.api.settings.getAll();
      console.log("Settings loaded:", window.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      window.settings = { lowStockThreshold: 50, expiryWarningDays: 30 };
      console.log("Using default settings:", window.settings);
    }

    await initInventoryView();
    startDataSync();
  } catch (error) {
    console.error('Error initializing inventory view:', error);
    showNotification('Failed to initialize inventory view: ' + error.message, 'error');
  }
});

async function getCurrentUser() {
  try {
    // Try to get user from session storage first
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      return JSON.parse(storedUser);
    }

    // If not in session storage, try to get from API
    try {
      const user = await window.api.getCurrentUser();
      if (user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        return user;
      }
    } catch (apiError) {
      console.error('API error getting current user:', apiError);
    }

    // If we still don't have a user, check if we're in development/testing
    // This is a fallback for development/testing only
    return {
      name: "Test User",
      username: "testuser",
      role: "staff"
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

async function logout() {
  try {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error during logout:', error);
    showNotification('Failed to logout', 'error');
  }
}

async function initInventoryView() {
  try {
    // Set user information
    const currentUser = await getCurrentUser();
    if (currentUser) {
      document.getElementById("userDisplayName").textContent = currentUser.name || currentUser.username || "User";
      document.getElementById("headerUsername").textContent = currentUser.name || currentUser.username || "User";
      document.getElementById("userRole").textContent = currentUser.role === 'admin' ? 'Administrator' : 'Staff';
    }

    // Add event listeners
    document.getElementById("logoutBtn").addEventListener("click", logout);
    document.getElementById("headerLogoutBtn").addEventListener("click", logout);
    document.getElementById("toggleSidebar").addEventListener("click", toggleSidebar);

    // Search and filter listeners
    document.getElementById("searchBtn").addEventListener("click", handleSearch);
    document.getElementById("searchInput").addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        handleSearch();
      }
    });
    document.getElementById("categoryFilter").addEventListener("change", handleSearch);

    // Load initial data
    await loadMedications();
    await loadCategories();
  } catch (error) {
    console.error('Error in initInventoryView:', error);
    showNotification('Failed to initialize view', 'error');
  }
}

function toggleSidebar() {
  document.querySelector(".dashboard-container").classList.toggle("sidebar-collapsed");
}

async function loadMedications() {
  try {
    console.log("Loading medications...");
    // Use the same API call that admin uses
    const allMedications = await window.api.medications.getAll();
    console.log("Medications loaded:", allMedications);
    
    if (!Array.isArray(allMedications)) {
      console.error("Medications data is not an array:", allMedications);
      throw new Error('Medications data is not an array');
    }
    
    renderInventoryTable(allMedications);
    showNotification('Medications loaded successfully', 'success');
  } catch (error) {
    console.error('Error loading medications:', error);
    showNotification('Failed to load medications: ' + error.message, 'error');
  }
}

async function loadCategories() {
  try {
    console.log("Loading categories...");
    // Use the same API call for consistency
    const allMedications = await window.api.medications.getAll();
    console.log("Medications for categories:", allMedications);
    
    if (!Array.isArray(allMedications)) {
      console.error("Categories data is not an array:", allMedications);
      throw new Error('Medications data is not an array');
    }
    
    const categories = [...new Set(allMedications.map(med => med.category).filter(Boolean))];
    console.log("Extracted categories:", categories);
    
    const categorySelect = document.getElementById('categoryFilter');
    if (!categorySelect) {
      console.error("Category select element not found");
      return;
    }
    
    // Clear existing options except the first one
    while (categorySelect.options.length > 1) {
      categorySelect.remove(1);
    }
    
    // Add categories
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = getCategoryDisplay(category);
      categorySelect.appendChild(option);
    });
    
    console.log("Categories loaded successfully");
  } catch (error) {
    console.error('Error loading categories:', error);
    showNotification('Failed to load categories: ' + error.message, 'error');
  }
}

function formatCurrency(amount) {
  // Use same formatting as admin view
  return Number.parseFloat(amount || 0).toFixed(2);
}

function renderInventoryTable(medications) {
  console.log("Rendering inventory table with", medications ? medications.length : 0, "items");
  
  const tableBody = document.getElementById("inventoryTableBody");
  if (!tableBody) {
    console.error("Table body element not found");
    return;
  }
  
  const emptyState = document.getElementById("emptyState");

  if (!medications || medications.length === 0) {
    console.log("No medications to display, showing empty state");
    tableBody.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  tableBody.innerHTML = "";

  console.log("Processing medications for table rendering");
  medications.forEach((med, index) => {
    console.log(`Processing medication #${index+1}:`, med.name);
    const row = document.createElement("tr");

    // Check if stock is low
    const lowStockThreshold = window.settings?.lowStockThreshold || 10;
    const stockClass = med.stock <= lowStockThreshold ? "low-stock" : "";

    // Check if expiry date is within warning period
    const today = new Date();
    const expiryDate = new Date(med.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    const expiryWarningDays = window.settings?.expiryWarningDays || 30;
    const expiryClass = daysUntilExpiry <= expiryWarningDays && daysUntilExpiry > 0 ? "expiring-soon" : "";

    row.innerHTML = `
      <td>${med.name || 'N/A'}</td>
      <td>${getCategoryDisplay(med.category || 'other')}</td>
      <td class="${stockClass}">${med.stock || 0}</td>
      <td>₦${formatCurrency(med.retailPrice || 0)}</td>
      <td>₦${formatCurrency(med.wholesalePrice || 0)}</td>
      <td class="${expiryClass}">${formatDate(med.expiryDate)}</td>
      <td>${med.description || "N/A"}</td>
    `;

    tableBody.appendChild(row);
  });
  
  console.log("Table rendering complete");
}

async function handleSearch() {
  try {
    console.log("Handling search...");
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) {
      console.error("Search input element not found");
      return;
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    console.log("Search term:", searchTerm);
    
    const categoryFilter = document.getElementById("categoryFilter");
    const categoryValue = categoryFilter ? categoryFilter.value : "all";
    console.log("Category filter:", categoryValue);

    // Use the same API call for consistency
    console.log("Fetching medications for search...");
    const allMedications = await window.api.medications.getAll();
    console.log("Medications for search:", allMedications);
    
    if (!Array.isArray(allMedications)) {
      console.error("Search data is not an array:", allMedications);
      throw new Error('Medications data is not an array');
    }
    
    let filtered = allMedications;

    // Apply search filter
    if (searchTerm) {
      console.log("Applying search filter...");
      filtered = filtered.filter(
        (med) => 
          (med.name && med.name.toLowerCase().includes(searchTerm)) || 
          (med.description && med.description.toLowerCase().includes(searchTerm)) ||
          (med.category && med.category.toLowerCase().includes(searchTerm)) ||
          (med.manufacturer && med.manufacturer.toLowerCase().includes(searchTerm))
      );
      console.log("After search filter:", filtered.length, "items");
    }

    // Apply category filter
    if (categoryValue && categoryValue !== "all") {
      console.log("Applying category filter:", categoryValue);
      filtered = filtered.filter((med) => med.category === categoryValue);
      console.log("After category filter:", filtered.length, "items");
    }

    console.log("Final filtered results:", filtered);
    renderInventoryTable(filtered);
  } catch (error) {
    console.error('Error in search:', error);
    showNotification('Failed to search medications: ' + error.message, 'error');
  }
}

function getCategoryDisplay(categoryValue) {
  const categories = {
    antibiotic: "Antibiotics",
    analgesic: "Analgesics",
    antiviral: "Antivirals",
    cardiovascular: "Cardiovascular",
    other: "Other"
  };

  return categories[categoryValue] || categoryValue;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  const notificationMessage = document.getElementById('notificationMessage');
  
  if (notification && notificationMessage) {
    notificationMessage.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 3000);
  } else {
    // Fallback notification if elements don't exist
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification ${type}`;
    notificationDiv.textContent = message;
    document.body.appendChild(notificationDiv);

    setTimeout(() => {
      notificationDiv.remove();
    }, 3000);
  }
}

function startDataSync() {
  // Refresh data every 30 seconds
  setInterval(async () => {
    try {
      await loadMedications();
    } catch (error) {
      console.error('Error in data sync:', error);
    }
  }, 30000);
}

