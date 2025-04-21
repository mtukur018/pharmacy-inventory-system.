// admin-dashboard.js (fully patched version)
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.protectPage("admin")) return;
  await initAdminDashboard();
});

async function initAdminDashboard() {
  const currentUser = getCurrentUser();
  document.getElementById("userDisplayName").textContent = currentUser.name;
  document.getElementById("userRole").textContent = "Administrator";
  document.getElementById("headerUsername").textContent = currentUser.name;

  // Logout buttons using safe API
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("headerLogoutBtn").addEventListener("click", logout);

  document.getElementById("toggleSidebar").addEventListener("click", () => {
    document.querySelector(".dashboard-container").classList.toggle("sidebar-collapsed");
  });

  await loadDashboardData();
}

function logout() {
  window.api.session.logout().then(() => {
    sessionStorage.clear();
    window.location.href = "login.html";
  });
}

async function loadDashboardData() {
  try {
    const medications = await window.api.medications.getAll();
    console.log("Medications loaded:", medications);

    const settings = await window.api.settings.getAll();
    console.log("Settings loaded:", settings);

    updateSummaryCards(medications, settings);
    updateCategoryDistribution(medications);
    updateRecentActivities();
    updateLowStockTable(medications, settings);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}

function updateSummaryCards(medications, settings) {
  const lowStockThreshold = settings.lowStockThreshold || 50;
  const expiryWarningDays = settings.expiryWarningDays || 30;

  document.getElementById("totalMedications").textContent = medications.length;

  const totalValue = medications.reduce((sum, med) => sum + (med.purchasePrice || 0) * (med.stock || 0), 0);
  document.getElementById("inventoryValue").textContent = `₦${formatCurrency(totalValue)}`;

  const lowStock = medications.filter(m => m.stock < lowStockThreshold).length;
  document.getElementById("lowStockCount").textContent = lowStock;

  const today = new Date();
  const expiringSoon = medications.filter((med) => {
    if (!med.expiryDate) return false;
    const expiry = new Date(med.expiryDate);
    const days = (expiry - today) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= expiryWarningDays;
  }).length;
  document.getElementById("expiringSoonCount").textContent = expiringSoon;

  const totalPurchase = medications.reduce((sum, m) => sum + (m.purchasePrice || 0) * (m.stock || 0), 0);
  document.getElementById("totalPurchasePrice").textContent = `₦${formatCurrency(totalPurchase)}`;

  const totalRetail = medications.reduce((sum, m) => sum + (m.retailPrice || 0) * (m.stock || 0), 0);
  document.getElementById("totalRetailPrice").textContent = `₦${formatCurrency(totalRetail)}`;

  const totalWholesale = medications.reduce((sum, m) => sum + (m.wholesalePrice || 0) * (m.stock || 0), 0);
  document.getElementById("totalWholesalePrice").textContent = `₦${formatCurrency(totalWholesale)}`;
}

function updateCategoryDistribution(medications) {
  const counts = {};
  medications.forEach(med => {
    counts[med.category] = (counts[med.category] || 0) + 1;
  });

  const container = document.getElementById("categoryLegend");
  container.innerHTML = "";

  if (Object.keys(counts).length === 0) {
    container.innerHTML = '<div class="text-center">No data available</div>';
    return;
  }

  Object.entries(counts).forEach(([cat, count]) => {
    const div = document.createElement("div");
    div.className = "legend-item";
    div.innerHTML = `
      <div class="color-box" style="background-color: #${Math.floor(Math.random()*16777215).toString(16)}"></div>
      <div>${getCategoryDisplay(cat)}: ${count}</div>
    `;
    container.appendChild(div);
  });
}

async function updateRecentActivities() {
  try {
    const activities = await window.api.activities.getRecent();
    const container = document.getElementById("activityList");
    container.innerHTML = "";

    if (!activities.length) {
      container.innerHTML = "<li>No recent activity found.</li>";
      return;
    }

    activities.forEach(act => {
      const li = document.createElement("li");
      li.className = "activity-item";
      li.innerHTML = `
        <div class="activity-icon ${getActivityColor(act.type)}">
          <i class="${getActivityIcon(act.type)}"></i>
        </div>
        <div class="activity-details">
          <p>${act.message}</p>
          <span class="activity-time">${new Date(act.timestamp).toLocaleString()}</span>
        </div>
      `;
      container.appendChild(li);
    });

    console.log("Activities loaded:", activities);
  } catch (err) {
    console.error("Failed to load recent activities:", err);
  }
}

function updateLowStockTable(medications, settings) {
  const lowStockThreshold = settings.lowStockThreshold || 50;
  const meds = medications.filter(m => m.stock < lowStockThreshold);
  const tbody = document.getElementById("lowStockTable");

  tbody.innerHTML = meds.length === 0
    ? '<tr><td colspan="6" class="text-center">No low stock medications found</td></tr>'
    : meds.map(med => `
      <tr>
        <td>${med.name}</td>
        <td>${getCategoryDisplay(med.category)}</td>
        <td class="low-stock">${med.stock}</td>
        <td>₦${formatCurrency(med.purchasePrice)}</td>
        <td>₦${formatCurrency(med.retailPrice)}</td>
        <td>${formatDate(med.expiryDate)}</td>
      </tr>
    `).join("");
}

function getCategoryDisplay(category) {
  const map = {
    antibiotic: "Antibiotics",
    analgesic: "Analgesics",
    antiviral: "Antivirals",
    cardiovascular: "Cardiovascular",
    other: "Other",
  };
  return map[category] || category;
}

function formatCurrency(amount) {
  return Number.parseFloat(amount || 0).toFixed(2);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getActivityIcon(type) {
  switch (type) {
    case "med-add": return "fas fa-plus";
    case "med-edit": return "fas fa-edit";
    case "user-add": return "fas fa-user-plus";
    case "delete": return "fas fa-trash";
    default: return "fas fa-info-circle";
  }
}

function getActivityColor(type) {
  switch (type) {
    case "med-add": return "bg-primary";
    case "med-edit": return "bg-warning";
    case "user-add": return "bg-success";
    case "delete": return "bg-danger";
    default: return "bg-secondary";
  }
}
