// User Inventory Module - Read Only Version
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize the inventory view
        await initializeInventory();
        
        // Set up event listeners
        setupEventListeners();
        
        // Start real-time data sync
        startDataSync();
    } catch (error) {
        console.error('Failed to initialize inventory:', error);
        showNotification('Failed to load inventory data', true);
    }
});

async function initializeInventory() {
    try {
        // Get current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // Redirect admin to admin inventory page
        if (currentUser.role === 'admin') {
            window.location.href = 'admin-inventory.html';
            return;
        }

        // Set up user info
        updateUserInfo(currentUser);
        
        // Load categories for filter
        await loadCategories();
        
        // Load initial data
        await loadInventoryData();
    } catch (error) {
        console.error('Error in initializeInventory:', error);
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

    // Filter handlers
    document.getElementById('categoryFilter')?.addEventListener('change', applyFilters);
    document.getElementById('stockFilter')?.addEventListener('change', applyFilters);
    document.getElementById('expiryFilter')?.addEventListener('change', applyFilters);

    // Logout handlers
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('headerLogoutBtn')?.addEventListener('click', handleLogout);

    // Sidebar toggle
    document.getElementById('toggleSidebar')?.addEventListener('click', () => {
        document.querySelector('.dashboard-container')?.classList.toggle('sidebar-collapsed');
    });
}

async function loadCategories() {
    try {
        const medications = await window.api.medications.getAll();
        const categories = [...new Set(medications.map(med => med.category))];
        
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = `
                <option value="">All Categories</option>
                ${categories.map(category => `
                    <option value="${category}">${formatCategory(category)}</option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadInventoryData() {
    try {
        const medications = await window.api.medications.getAll();
        renderInventoryTable(medications);
    } catch (error) {
        console.error('Error loading inventory data:', error);
        showNotification('Failed to load inventory data', true);
    }
}

function renderInventoryTable(medications) {
    const tableBody = document.getElementById('medicationTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!medications?.length) {
        if (tableBody) tableBody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    
    if (tableBody) {
        tableBody.innerHTML = medications.map(med => {
            const status = getStatus(med);
            return `
                <tr class="${status.class}">
                    <td>${escapeHtml(med.name)}</td>
                    <td>${formatCategory(med.category)}</td>
                    <td>${med.stock}</td>
                    <td>${formatCurrency(med.retailPrice)}</td>
                    <td>${formatCurrency(med.wholesalePrice)}</td>
                    <td>${formatDate(med.expiryDate)}</td>
                    <td><span class="status-badge ${status.class}">${status.text}</span></td>
                </tr>
            `;
        }).join('');
    }
}

function getStatus(medication) {
    const today = new Date();
    const expiryDate = new Date(medication.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (medication.stock === 0) {
        return { text: 'Out of Stock', class: 'out-of-stock' };
    }
    
    if (daysUntilExpiry <= 0) {
        return { text: 'Expired', class: 'expired' };
    }
    
    if (daysUntilExpiry <= 30) {
        return { text: 'Expiring Soon', class: 'expiring-soon' };
    }
    
    if (medication.stock < 50) {
        return { text: 'Low Stock', class: 'low-stock' };
    }
    
    return { text: 'In Stock', class: 'in-stock' };
}

async function handleSearch() {
    applyFilters();
}

async function applyFilters() {
    try {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const stockFilter = document.getElementById('stockFilter')?.value || '';
        const expiryFilter = document.getElementById('expiryFilter')?.value || '';
        
        const medications = await window.api.medications.getAll();
        
        const filteredMedications = medications.filter(med => {
            // Search term filter
            const matchesSearch = !searchTerm || 
                med.name.toLowerCase().includes(searchTerm) ||
                med.category.toLowerCase().includes(searchTerm);
            
            // Category filter
            const matchesCategory = !categoryFilter || med.category === categoryFilter;
            
            // Stock filter
            let matchesStock = true;
            if (stockFilter === 'out') {
                matchesStock = med.stock === 0;
            } else if (stockFilter === 'low') {
                matchesStock = med.stock > 0 && med.stock < 50;
            } else if (stockFilter === 'normal') {
                matchesStock = med.stock >= 50;
            }
            
            // Expiry filter
            let matchesExpiry = true;
            const today = new Date();
            const expiryDate = new Date(med.expiryDate);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            if (expiryFilter === 'expired') {
                matchesExpiry = daysUntilExpiry <= 0;
            } else if (expiryFilter === 'expiring') {
                matchesExpiry = daysUntilExpiry > 0 && daysUntilExpiry <= 30;
            } else if (expiryFilter === 'valid') {
                matchesExpiry = daysUntilExpiry > 30;
            }
            
            return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
        });
        
        renderInventoryTable(filteredMedications);
    } catch (error) {
        console.error('Error applying filters:', error);
        showNotification('Failed to apply filters', true);
    }
}

function startDataSync() {
    // Set up periodic data refresh (every 30 seconds)
    setInterval(async () => {
        try {
            await loadInventoryData();
        } catch (error) {
            console.error('Error in data sync:', error);
        }
    }, 30000);
}

// Utility Functions
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

function updateUserInfo(user) {
    const displayNameElements = [
        document.getElementById('userDisplayName'),
        document.getElementById('headerUsername')
    ];
    displayNameElements.forEach(element => {
        if (element) element.textContent = user.name || user.username;
    });

    const roleElement = document.getElementById('userRole');
    if (roleElement) {
        roleElement.textContent = 'Staff';
    }
}

function formatCategory(category) {
    if (!category) return 'Uncategorized';
    return category.charAt(0).toUpperCase() + category.slice(1);
}

async function handleLogout() {
    try {
        sessionStorage.removeItem('currentUser');
        await window.api.logout();
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