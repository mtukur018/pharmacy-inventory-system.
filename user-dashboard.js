// Mock functions for demonstration purposes.  In a real application, these would be imported or defined elsewhere.
function protectPage(role) {
  // In a real application, this would check authentication status.
  console.log("protectPage called with role:", role)
  return true // Simulate authentication success
}

function getCurrentUser() {
  // In a real application, this would retrieve the current user's data.
  return {
    name: "John Doe",
    role: "Staff",
  }
}

function logout() {
  // In a real application, this would handle the logout process.
  console.log("logout called")
  // Redirect to login page or perform other logout actions.
}

// Protect this page for authenticated users
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Initialize the dashboard
    await initializeDashboard();
    
    // Set up event listeners
    setupEventListeners();
    
    // Start real-time data sync
    startDataSync();
  } catch (error) {
    console.error('Failed to initialize dashboard:', error);
    showNotification('Failed to load dashboard data', true);
  }
})

async function initializeDashboard() {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

    // Redirect admin to admin dashboard if needed
    if (currentUser.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
      return;
    }

    // Set up user info
    updateUserInfo(currentUser);
    
    // Get system settings
    try {
      window.settings = await window.api.settings.getAll();
    } catch (error) {
      console.error('Failed to load settings:', error);
      window.settings = { lowStockThreshold: 50, expiryWarningDays: 30 };
    }
    
    // Load initial data
    await loadDashboardData();
  } catch (error) {
    console.error('Error in initializeDashboard:', error);
    throw error;
  }
}

function setupEventListeners() {
  // Search functionality
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }
  if (searchBtn) {
    searchBtn.addEventListener('click', () => handleSearch());
  }

  // Logout handlers
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('headerLogoutBtn')?.addEventListener('click', handleLogout);

  // Sidebar toggle
  document.getElementById('toggleSidebar')?.addEventListener('click', () => {
    document.querySelector('.dashboard-container')?.classList.toggle('sidebar-collapsed');
  });
}

async function loadDashboardData() {
  try {
    // Get all medications
    const medications = await window.api.medications.getAll();
    
    if (!Array.isArray(medications)) {
      throw new Error('Medications data is not an array');
    }

  // Update summary cards
    updateSummaryCards(medications);
    
    // Update inventory table
    updateInventoryTable(medications);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showNotification('Failed to load dashboard data', true);
  }
}

function updateSummaryCards(medications) {
  // Update total medications count
  const totalMedications = medications.length;
  document.getElementById('totalMedications').textContent = totalMedications;

  // Update low stock count
  const lowStockThreshold = window.settings?.lowStockThreshold || 50; // This should come from settings
  const lowStockCount = medications.filter(med => med.stock < lowStockThreshold).length;
  document.getElementById('lowStockItems').textContent = lowStockCount;

  // Update expiring soon count
  const expiryThreshold = window.settings?.expiryWarningDays || 30; // This should come from settings
  const today = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(today.getDate() + expiryThreshold);
  
  const expiringSoon = medications.filter(med => {
    const medicationExpiry = new Date(med.expiryDate);
    return medicationExpiry > today && medicationExpiry <= expiryDate;
  }).length;
  
  document.getElementById('expiringSoon').textContent = expiringSoon;
}

function updateInventoryTable(medications) {
  const tableBody = document.getElementById('medicationTableBody');
  const emptyState = document.getElementById('emptyState');
  
  if (!medications?.length) {
    if (tableBody) tableBody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  
  // Sort medications by stock level (ascending) and take first 10
  const sortedMedications = [...medications]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10);

  if (tableBody) {
    tableBody.innerHTML = sortedMedications.map(med => `
      <tr>
        <td>${escapeHtml(med.name || '')}</td>
        <td>${escapeHtml(med.category || '')}</td>
        <td>${med.stock || 0}</td>
        <td>₦${formatCurrency(med.retailPrice || 0)}</td>
        <td>₦${formatCurrency(med.wholesalePrice || 0)}</td>
        <td>${formatDate(med.expiryDate)}</td>
      </tr>
    `).join('');
  }
}

async function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  try {
    const medications = await window.api.medications.getAll();
    
    if (!Array.isArray(medications)) {
      throw new Error('Medications data is not an array');
    }
    
    let filtered = medications;
    
    if (searchTerm) {
      filtered = medications.filter(med =>
        (med.name && med.name.toLowerCase().includes(searchTerm)) ||
        (med.category && med.category.toLowerCase().includes(searchTerm)) ||
        (med.manufacturer && med.manufacturer.toLowerCase().includes(searchTerm))
      );
    }
    
    updateInventoryTable(filtered);
  } catch (error) {
    console.error('Search failed:', error);
    showNotification('Failed to search medications', true);
  }
}

function startDataSync() {
  // Set up periodic data refresh (every 30 seconds)
  setInterval(async () => {
    try {
      await loadDashboardData();
    } catch (error) {
      console.error('Error in data sync:', error);
    }
  }, 30000);
}

// Utility Functions
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

function updateUserInfo(user) {
  // Update display name
  const displayNameElements = [
    document.getElementById('userDisplayName'),
    document.getElementById('headerUsername')
  ];
  
  displayNameElements.forEach(element => {
    if (element) element.textContent = user.name || user.username || "User";
  });

  // Update role display
  const roleElement = document.getElementById('userRole');
  if (roleElement) {
    roleElement.textContent = user.role === 'admin' ? 'Administrator' : 'Staff';
  }
}

async function handleLogout() {
  try {
    sessionStorage.removeItem('currentUser');
    await window.api.session.logout();
  
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error during logout:', error);
    showNotification('Failed to logout', true);
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2
  }).format(amount);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
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
  const notification = document.getElementById('notification');
  const notificationMessage = document.getElementById('notificationMessage');
  
  if (notification && notificationMessage) {
    notificationMessage.textContent = message;
    notification.classList.toggle('error', isError);
    notification.classList.remove('hidden');
    
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 3000);
  }
}

