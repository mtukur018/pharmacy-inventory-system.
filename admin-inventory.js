// Admin Inventory Module – FINAL FIXED VERSION

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!user || user.role !== 'admin') {
            window.location.href = 'inventory-view.html';
            return;
        }

        try {
            const settings = await window.api.settings.getAll();
            window.settings = settings;
        } catch (error) {
            console.warn('Failed to load settings:', error);
            window.settings = { lowStockThreshold: 50, expiryWarningDays: 30 };
        }

        await initializeInventory();
        setupEventListeners();
        setupModalHandlers();
        startDataSync();

        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        document.querySelector('.sidebar-nav li a[href="admin-inventory.html"]').parentElement.classList.add('active');
    } catch (error) {
        console.error('Failed to initialize inventory:', error);
        showNotification('Failed to load inventory data', 'error');
    }
});

let allMedications = [];
let currentMedicationId = null;
let syncInterval;

async function initializeInventory() {
    await loadMedications();
    await loadCategories();
    await updateSummaryCards();
}

function setupEventListeners() {
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
        });
    }

    const addMedicationBtn = document.getElementById('addMedicationBtn');
    if (addMedicationBtn) {
        addMedicationBtn.addEventListener('click', () => openMedicationModal());
    }

    const medicationForm = document.getElementById('medicationForm');
    if (medicationForm) {
        medicationForm.addEventListener('submit', handleMedicationSubmit);
    }

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    const filters = ['category', 'stock', 'expiry'];
    filters.forEach(filter => {
        const element = document.getElementById(`${filter}Filter`);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });

    const confirmDeleteBtn = document.getElementById('confirmDelete');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => handleDelete(currentMedicationId));
    }
}

function setupModalHandlers() {
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModals();
        }
    });

    document.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function startDataSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(loadMedications, 30000);
}

async function loadMedications() {
    try {
        console.log('Loading medications...');
        allMedications = await window.api.medications.getAll();
        renderMedicationTable(allMedications);
        await updateSummaryCards();
    } catch (error) {
        console.error('Failed to load medications:', error);
        allMedications = [];
        renderMedicationTable([]);
        showNotification('Unable to load medications', 'error');
    }
}

async function updateSummaryCards() {
    const threshold = window.settings.lowStockThreshold || 10;
    const warnDays = window.settings.expiryWarningDays || 30;
    document.getElementById('totalMedications').textContent = allMedications.length;
    document.getElementById('lowStockItems').textContent = allMedications.filter(m => m.stock <= threshold).length;
    document.getElementById('expiringSoon').textContent = allMedications.filter(m => isExpiringSoon(m.expiryDate, warnDays)).length;
    document.getElementById('inStockItems').textContent = allMedications.filter(m => m.stock > threshold).length;
}

async function loadCategories() {
    const categories = [...new Set(allMedications.map(m => m.category))];
    const categorySelect = document.getElementById('categoryFilter');
    while (categorySelect.options.length > 1) categorySelect.remove(1);
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
    });
}

function renderMedicationTable(meds) {
    const tbody = document.getElementById('medicationTableBody');
    const emptyState = document.getElementById('emptyState');
    if (!meds.length) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');
    tbody.innerHTML = meds.map(m => `
        <tr>
            <td>${m.name}</td>
            <td>${m.category}</td>
            <td>${m.manufacturer}</td>
            <td>${m.stock}</td>
            <td>₦${m.purchasePrice.toFixed(2)}</td>
            <td>₦${m.retailPrice.toFixed(2)}</td>
            <td>₦${m.wholesalePrice.toFixed(2)}</td>
            <td>${formatDate(m.expiryDate)}</td>
            <td>${getStatusBadge(m)}</td>
            <td>
                <button onclick="editMedication(${m.id})" class="edit-btn"><i class="fas fa-edit"></i></button>
                <button onclick="confirmDelete(${m.id})" class="delete-btn"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const cat = document.getElementById('categoryFilter').value;
    const stock = document.getElementById('stockFilter').value;
    const exp = document.getElementById('expiryFilter').value;
    const threshold = window.settings.lowStockThreshold || 10;
    const days = window.settings.expiryWarningDays || 30;

    const result = allMedications.filter(m => {
        const matchesSearch = [m.name, m.category, m.manufacturer].some(v => v.toLowerCase().includes(search));
        const matchCat = !cat || m.category === cat;
        const matchStock = !stock ||
            (stock === 'low' && m.stock <= threshold) ||
            (stock === 'out' && m.stock === 0) ||
            (stock === 'normal' && m.stock > threshold);
        const matchExp = !exp ||
            (exp === 'expired' && isExpired(m.expiryDate)) ||
            (exp === 'expiring' && isExpiringSoon(m.expiryDate, days)) ||
            (exp === 'valid' && !isExpired(m.expiryDate) && !isExpiringSoon(m.expiryDate, days));
        return matchesSearch && matchCat && matchStock && matchExp;
    });

    renderMedicationTable(result);
}

function handleSearch() {
    const val = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allMedications.filter(m =>
        m.name.toLowerCase().includes(val) ||
        m.category.toLowerCase().includes(val) ||
        m.manufacturer.toLowerCase().includes(val)
    );
    renderMedicationTable(filtered);
}

function showNotification(msg, type = 'success') {
    const n = document.getElementById('notification');
    const m = document.getElementById('notificationMessage');
    m.textContent = msg;
    n.className = `notification ${type}`;
    n.classList.remove('hidden');
    setTimeout(() => n.classList.add('hidden'), 3000);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString();
}
function formatDateForInput(d) {
    return new Date(d).toISOString().split('T')[0];
}
function isExpired(d) {
    return new Date(d) <= new Date();
}
function isExpiringSoon(d, days = 30) {
    const e = new Date(d);
    const now = new Date();
    const warn = new Date();
    warn.setDate(now.getDate() + days);
    return e <= warn && e > now;
}
function getStatusBadge(m) {
    if (isExpired(m.expiryDate)) return '<span class="badge badge-danger">Expired</span>';
    if (isExpiringSoon(m.expiryDate, window.settings.expiryWarningDays)) return '<span class="badge badge-warning">Expiring Soon</span>';
    if (m.stock <= window.settings.lowStockThreshold) return '<span class="badge badge-warning">Low Stock</span>';
    return '<span class="badge badge-success">In Stock</span>';
}

function openMedicationModal(medication = null) {
    closeModals();
    const modal = document.getElementById('medicationModal');
    const form = document.getElementById('medicationForm');
    const title = document.getElementById('modalTitle');
    if (!modal || !form || !title) return;

    title.textContent = medication ? 'Edit Medication' : 'Add Medication';
    form.reset();

    if (medication) {
        form.dataset.medicationId = medication.id;
        form.name.value = medication.name;
        form.category.value = medication.category;
        form.manufacturer.value = medication.manufacturer;
        form.stock.value = medication.stock;
        form.purchasePrice.value = medication.purchasePrice;
        form.retailPrice.value = medication.retailPrice;
        form.wholesalePrice.value = medication.wholesalePrice;
        form.expiryDate.value = formatDateForInput(medication.expiryDate);
    } else {
        delete form.dataset.medicationId;
    }

    modal.classList.remove('hidden');
    modal.classList.add('active');
    document.body.classList.add('modal-open');
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => {
        m.classList.remove('active');
        m.classList.add('hidden');
    });
    document.body.classList.remove('modal-open');
    const form = document.getElementById('medicationForm');
    if (form) {
        form.reset();
        delete form.dataset.medicationId;
    }
    currentMedicationId = null;
}

function editMedication(id) {
    const m = allMedications.find(m => m.id === id);
    if (m) openMedicationModal(m);
}

function confirmDelete(id) {
    currentMedicationId = id;
    const modal = document.getElementById('deleteConfirmationModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }
}

async function handleDelete(id) {
    try {
        const deleted = await window.api.medications.delete(id);
        if (deleted) {
            await loadMedications();
            await updateSummaryCards();
            closeModals();
            showNotification('Medication deleted.', 'success');
        } else throw new Error('Delete failed');
    } catch (err) {
        console.error(err);
        showNotification(err.message, 'error');
    }
}

async function handleMedicationSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const isEdit = form.dataset.medicationId;
    const data = {
        name: form.name.value,
        category: form.category.value,
        manufacturer: form.manufacturer.value,
        stock: parseInt(form.stock.value),
        purchasePrice: parseFloat(form.purchasePrice.value),
        retailPrice: parseFloat(form.retailPrice.value),
        wholesalePrice: parseFloat(form.wholesalePrice.value),
        expiryDate: form.expiryDate.value
    };

    try {
        if (isEdit) {
            const id = parseInt(isEdit);
            await window.api.medications.update(id, data);
        } else {
            await window.api.medications.add(data);
        }
        await loadMedications();
        await updateSummaryCards();
        closeModals();
        showNotification(`Medication ${isEdit ? 'updated' : 'added'} successfully`, 'success');
    } catch (error) {
        console.error('Save failed:', error);
        showNotification('Failed to save medication', 'error');
    }
}
