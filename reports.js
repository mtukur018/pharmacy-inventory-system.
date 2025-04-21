// Protect this page for admin only
document.addEventListener("DOMContentLoaded", async () => {
  // Check if user is authenticated and has admin role
  if (!protectPage("admin")) {
    return // Stop execution if not authenticated or not admin
  }

  await initReports()
})

// Mock functions for demonstration purposes. Replace with actual implementations.
function protectPage(role) {
  // In a real application, this would check user authentication and role.
  // For this demo, we'll assume the user is authenticated and has the required role.
  console.log(`Checking if user has role: ${role}`)
  return true
}

function getCurrentUser() {
  // In a real application, this would retrieve the current user's information.
  // For this demo, we'll return a mock user.
  return {
    name: "Admin User",
    role: "admin",
  }
}

function logout() {
  // In a real application, this would perform the logout process.
  // For this demo, we'll just log a message to the console.
  console.log("User logged out")
  // Redirect to login page or perform other logout actions.
}

async function initReports() {
  // Set user information
  const currentUser = getCurrentUser()
  document.getElementById("userDisplayName").textContent = currentUser.name
  document.getElementById("headerUsername").textContent = currentUser.name

  // Add event listeners
  document.getElementById("logoutBtn").addEventListener("click", logout)
  document.getElementById("headerLogoutBtn").addEventListener("click", logout)
  document.getElementById("toggleSidebar").addEventListener("click", toggleSidebar)

  // Set default dates (current month)
  setDefaultDates()

  // Report specific listeners
  document.getElementById("reportType").addEventListener("change", updateReportView)
  document.getElementById("generateReportBtn").addEventListener("click", generateReport)
  document.getElementById("printReportBtn").addEventListener("click", printReport)

  // Generate initial report
  await generateReport()
}

function toggleSidebar() {
  document.querySelector(".dashboard-container").classList.toggle("sidebar-collapsed")
}

function setDefaultDates() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  document.getElementById("startDate").valueAsDate = firstDay
  document.getElementById("endDate").valueAsDate = lastDay
}

function updateReportView() {
  const reportType = document.getElementById("reportType").value
  const reportTitle = document.getElementById("reportTitle")
  const dateRange = document.querySelector(".date-range")

  switch (reportType) {
    case "inventory":
      reportTitle.textContent = "Inventory Summary Report"
      dateRange.style.display = "none"
      break
    case "expiry":
      reportTitle.textContent = "Expiry Report"
      dateRange.style.display = "flex"
      break
    case "lowStock":
      reportTitle.textContent = "Low Stock Report"
      dateRange.style.display = "none"
      break
    case "sales":
      reportTitle.textContent = "Sales Report"
      dateRange.style.display = "flex"
      break
  }

  // Update table headers based on report type
  updateTableHeaders(reportType)
}

function updateTableHeaders(reportType) {
  const tableHead = document.getElementById("reportTableHead")
  let headers = ""

  switch (reportType) {
    case "inventory":
      headers = `
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Stock</th>
          <th>Purchase Price (₦)</th>
          <th>Retail Price (₦)</th>
          <th>Wholesale Price (₦)</th>
          <th>Expiry Date</th>
        </tr>
      `
      break
    case "expiry":
      headers = `
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Stock</th>
          <th>Expiry Date</th>
          <th>Days Until Expiry</th>
          <th>Status</th>
        </tr>
      `
      break
    case "lowStock":
      headers = `
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Current Stock</th>
          <th>Reorder Level</th>
          <th>Purchase Price (₦)</th>
          <th>Supplier</th>
        </tr>
      `
      break
  }

  tableHead.innerHTML = headers
}

async function generateReport() {
  const reportType = document.getElementById("reportType").value
  const startDate = document.getElementById("startDate").value
  const endDate = document.getElementById("endDate").value

  try {
    // Load medications from API
    const medications = await window.api.medications.getAll()

    // Load settings from API
    const settings = await window.api.settings.getAll()

    // Update summary cards
    updateReportSummary(medications, settings)

    // Generate report based on type
    switch (reportType) {
      case "inventory":
        generateInventoryReport(medications)
        break
      case "expiry":
        generateExpiryReport(medications, startDate, endDate)
        break
      case "lowStock":
        generateLowStockReport(medications, settings)
        break
    }

    // Show notification
    showNotification("Report generated successfully")
  } catch (error) {
    console.error("Error generating report:", error)
    showNotification("Error generating report", true)
  }
}

function updateReportSummary(medications, settings) {
  // Get thresholds from settings
  const lowStockThreshold = settings.lowStockThreshold || 50
  const expiryWarningDays = settings.expiryWarningDays || 30

  // Total medications
  document.getElementById("totalMedications").textContent = medications.length

  // Total value (based on purchase price)
  const totalValue = medications.reduce((sum, med) => sum + (med.purchasePrice || 0) * med.stock, 0)
  document.getElementById("totalValue").textContent = `₦${formatCurrency(totalValue)}`

  // Low stock count (less than threshold)
  const lowStockCount = medications.filter((med) => med.stock < lowStockThreshold).length
  document.getElementById("lowStockCount").textContent = lowStockCount

  // Expiring soon (within warning days)
  const today = new Date()
  const expiringSoon = medications.filter((med) => {
    const expiryDate = new Date(med.expiryDate)
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry > 0 && daysUntilExpiry <= expiryWarningDays
  }).length
  document.getElementById("expiringSoonCount").textContent = expiringSoon
}

function generateInventoryReport(medications) {
  const tableBody = document.getElementById("reportTableBody")
  tableBody.innerHTML = ""

  if (medications.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No medications found</td></tr>'
    return
  }

  medications.forEach((med) => {
    const row = document.createElement("tr")

    row.innerHTML = `
      <td>${med.name}</td>
      <td>${getCategoryDisplay(med.category)}</td>
      <td>${med.stock}</td>
      <td>₦${formatCurrency(med.purchasePrice || 0)}</td>
      <td>₦${formatCurrency(med.retailPrice || 0)}</td>
      <td>₦${formatCurrency(med.wholesalePrice || 0)}</td>
      <td>${formatDate(med.expiryDate)}</td>
    `

    tableBody.appendChild(row)
  })
}

function generateExpiryReport(medications, startDate, endDate) {
  const tableBody = document.getElementById("reportTableBody")
  tableBody.innerHTML = ""

  const start = new Date(startDate)
  const end = new Date(endDate)
  const today = new Date()

  // Filter medications that expire within the date range
  const expiringMeds = medications.filter((med) => {
    const expiryDate = new Date(med.expiryDate)
    return expiryDate >= start && expiryDate <= end
  })

  if (expiringMeds.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="text-center">No medications expiring in the selected date range</td></tr>'
    return
  }

  // Sort by expiry date (ascending)
  expiringMeds.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))

  expiringMeds.forEach((med) => {
    const expiryDate = new Date(med.expiryDate)
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))

    let status = ""
    let statusClass = ""

    if (daysUntilExpiry < 0) {
      status = "Expired"
      statusClass = "badge badge-danger"
    } else if (daysUntilExpiry <= 30) {
      status = "Expiring Soon"
      statusClass = "badge badge-warning"
    } else {
      status = "Valid"
      statusClass = "badge badge-success"
    }

    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${med.name || 'N/A'}</td>
      <td>${getCategoryDisplay(med.category) || 'N/A'}</td>
      <td>${med.stock || 0}</td>
      <td>${formatDate(med.expiryDate)}</td>
      <td>${daysUntilExpiry}</td>
      <td><span class="${statusClass}">${status}</span></td>
    `

    tableBody.appendChild(row)
  })
}

function generateLowStockReport(medications, settings) {
  const tableBody = document.getElementById("reportTableBody")
  tableBody.innerHTML = ""

  // Get threshold from settings
  const lowStockThreshold = settings.lowStockThreshold || 50

  // Filter medications with low stock (less than threshold)
  const lowStockMeds = medications.filter((med) => med.stock < lowStockThreshold)

  if (lowStockMeds.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No medications with low stock</td></tr>'
    return
  }

  // Sort by stock level (ascending)
  lowStockMeds.sort((a, b) => a.stock - b.stock)

  lowStockMeds.forEach((med) => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${med.name || 'N/A'}</td>
      <td>${getCategoryDisplay(med.category) || 'N/A'}</td>
      <td class="low-stock">${med.stock || 0}</td>
      <td>${lowStockThreshold}</td>
      <td>₦${formatCurrency(med.purchasePrice || 0)}</td>
      <td>${med.supplier || 'N/A'}</td>
    `

    tableBody.appendChild(row)
  })
}

function printReport() {
  // Create a new window for printing
  const printWindow = window.open("", "_blank")

  // Get the report content
  const reportTitle = document.getElementById("reportTitle").textContent
  const reportContent = document.querySelector(".dashboard-sections").innerHTML

  // Create HTML content for the print window
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${reportTitle}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        .report-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .report-header h1 {
          margin-bottom: 5px;
        }
        .report-date {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
        }
        .summary-cards {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .summary-card {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
          width: 22%;
        }
        .summary-card h3 {
          margin-top: 0;
          font-size: 14px;
          color: #666;
        }
        .summary-card p {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        .low-stock {
          color: #d32f2f;
          font-weight: bold;
        }
        .expiring-soon {
          color: #f57c00;
          font-weight: bold;
        }
        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="report-header">
        <h1>${reportTitle}</h1>
        <div class="report-date">Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      </div>
      <div class="report-content">
        ${reportContent}
      </div>
    </body>
    </html>
  `

  // Write the HTML content to the new window
  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()

  // Wait for the content to load before printing
  printWindow.onload = () => {
    printWindow.print()
    // printWindow.close(); // Uncomment to automatically close after printing
  }
}

// Utility functions
function getCategoryDisplay(categoryValue) {
  const categories = {
    antibiotic: "Antibiotics",
    analgesic: "Analgesics",
    antiviral: "Antivirals",
    cardiovascular: "Cardiovascular",
    other: "Other",
  }

  return categories[categoryValue] || categoryValue
}

function formatCurrency(amount) {
  return Number.parseFloat(amount).toFixed(2)
}

function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" }
  return new Date(dateString).toLocaleDateString(undefined, options)
}

function showNotification(message, isError = false) {
  const notification = document.getElementById("notification")
  const notificationMessage = document.getElementById("notificationMessage")

  if (!notification || !notificationMessage) return

  notificationMessage.textContent = message
  notification.classList.toggle("error", isError)
  notification.classList.remove("hidden")

  setTimeout(() => {
    notification.classList.add("hidden")
  }, 3000)
}

