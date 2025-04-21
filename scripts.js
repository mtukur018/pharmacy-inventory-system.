// Mock data for the inventory (similar to our previous React state)
let medications = [
  {
    id: 1,
    name: "Amoxicillin",
    category: "antibiotic",
    stock: 150,
    price: 12.99,
    expiryDate: "2024-12-31",
    description: "Broad-spectrum antibiotic used to treat a variety of bacterial infections.",
  },
  {
    id: 2,
    name: "Ibuprofen",
    category: "analgesic",
    stock: 200,
    price: 8.49,
    expiryDate: "2025-06-30",
    description: "Non-steroidal anti-inflammatory drug used for pain relief and reducing inflammation.",
  },
  {
    id: 3,
    name: "Lisinopril",
    category: "cardiovascular",
    stock: 75,
    price: 15.99,
    expiryDate: "2024-09-15",
    description: "ACE inhibitor used to treat high blood pressure and heart failure.",
  },
  {
    id: 4,
    name: "Oseltamivir",
    category: "antiviral",
    stock: 45,
    price: 25.99,
    expiryDate: "2024-08-10",
    description: "Antiviral medication used to treat and prevent influenza.",
  },
]

// DOM Elements
const elements = {
  // Table elements
  inventoryTable: document.getElementById("inventoryTable"),
  inventoryTableBody: document.getElementById("inventoryTableBody"),
  emptyState: document.getElementById("emptyState"),

  // Search and filter elements
  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  categoryFilter: document.getElementById("categoryFilter"),

  // Modal elements
  addMedicationBtn: document.getElementById("addMedicationBtn"),
  addMedicationModal: document.getElementById("addMedicationModal"),
  modalTitle: document.getElementById("modalTitle"),
  medicationForm: document.getElementById("medicationForm"),
  closeBtn: document.querySelector(".close-btn"),
  cancelBtn: document.getElementById("cancelBtn"),

  // Confirmation modal elements
  confirmationModal: document.getElementById("confirmationModal"),
  cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
  confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),

  // Form elements
  medicationId: document.getElementById("medicationId"),
  medName: document.getElementById("medName"),
  medCategory: document.getElementById("medCategory"),
  medStock: document.getElementById("medStock"),
  medPrice: document.getElementById("medPrice"),
  medExpiry: document.getElementById("medExpiry"),
  medDescription: document.getElementById("medDescription"),

  // Error message elements
  nameError: document.getElementById("nameError"),
  stockError: document.getElementById("stockError"),
  priceError: document.getElementById("priceError"),
  expiryError: document.getElementById("expiryError"),

  // Notification
  notification: document.getElementById("notification"),
  notificationMessage: document.getElementById("notificationMessage"),
}

// Utility functions
function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" }
  return new Date(dateString).toLocaleDateString(undefined, options)
}

// Update the formatCurrency function to use Naira symbol
function formatCurrency(amount) {
  return "₦" + Number.parseFloat(amount).toFixed(2)
}

function getNextId() {
  return medications.length > 0 ? Math.max(...medications.map((med) => med.id)) + 1 : 1
}

function saveToLocalStorage() {
  localStorage.setItem("pharmacyInventory", JSON.stringify(medications))
}

function loadFromLocalStorage() {
  const savedInventory = localStorage.getItem("pharmacyInventory")
  if (savedInventory) {
    medications = JSON.parse(savedInventory)
  }
}

// Display functions
// Update the renderInventoryTable function to use Naira symbol
function renderInventoryTable(medsToDisplay = medications) {
  elements.inventoryTableBody.innerHTML = ""

  if (medsToDisplay.length === 0) {
    elements.inventoryTable.classList.add("hidden")
    elements.emptyState.classList.remove("hidden")
    return
  }

  elements.inventoryTable.classList.remove("hidden")
  elements.emptyState.classList.add("hidden")

  medsToDisplay.forEach((med) => {
    const row = document.createElement("tr")

    // Check if stock is low (less than 50)
    const stockClass = med.stock < 50 ? "low-stock" : ""

    // Check if expiry date is less than 30 days away
    const today = new Date()
    const expiryDate = new Date(med.expiryDate)
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
    const expiryClass = daysUntilExpiry < 30 && daysUntilExpiry > 0 ? "expiring-soon" : ""

    row.innerHTML = `
            <td>${med.name}</td>
            <td>${getCategoryDisplay(med.category)}</td>
            <td class="${stockClass}">${med.stock}</td>
            <td>₦${formatCurrency(med.price)}</td>
            <td class="${expiryClass}">${formatDate(med.expiryDate)}</td>
            <td class="action-buttons">
                <button class="edit-btn" data-id="${med.id}">Edit</button>
                <button class="delete-btn" data-id="${med.id}">Delete</button>
            </td>
        `

    elements.inventoryTableBody.appendChild(row)
  })

  // Add event listeners to the newly created buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", handleEditClick)
  })

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", handleDeleteClick)
  })
}

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

function clearForm() {
  elements.medicationId.value = ""
  elements.medName.value = ""
  elements.medCategory.value = ""
  elements.medStock.value = ""
  elements.medPrice.value = ""
  elements.medExpiry.value = ""
  elements.medDescription.value = ""

  // Clear error messages
  elements.nameError.textContent = ""
  elements.stockError.textContent = ""
  elements.priceError.textContent = ""
  elements.expiryError.textContent = ""
}

function fillFormForEdit(medication) {
  elements.medicationId.value = medication.id
  elements.medName.value = medication.name
  elements.medCategory.value = medication.category
  elements.medStock.value = medication.stock
  elements.medPrice.value = medication.price
  elements.medExpiry.value = medication.expiryDate
  elements.medDescription.value = medication.description || ""
}

function showModal(isEditing = false) {
  elements.modalTitle.textContent = isEditing ? "Edit Medication" : "Add New Medication"
  elements.addMedicationModal.style.display = "block"
}

function hideModal() {
  elements.addMedicationModal.style.display = "none"
  clearForm()
}

function showConfirmationModal() {
  elements.confirmationModal.style.display = "block"
}

function hideConfirmationModal() {
  elements.confirmationModal.style.display = "none"
}

function showNotification(message, isError = false) {
  elements.notificationMessage.textContent = message
  elements.notification.classList.toggle("error", isError)
  elements.notification.classList.remove("hidden")

  setTimeout(() => {
    elements.notification.classList.add("hidden")
  }, 3000)
}

// Event handler functions
function handleSearch() {
  const searchTerm = elements.searchInput.value.toLowerCase()
  const categoryFilter = elements.categoryFilter.value

  let filteredMeds = medications

  // Apply search filter
  if (searchTerm) {
    filteredMeds = filteredMeds.filter(
      (med) => med.name.toLowerCase().includes(searchTerm) || med.description?.toLowerCase().includes(searchTerm),
    )
  }

  // Apply category filter
  if (categoryFilter !== "all") {
    filteredMeds = filteredMeds.filter((med) => med.category === categoryFilter)
  }

  renderInventoryTable(filteredMeds)
}

function handleAddMedicationClick() {
  clearForm()
  showModal(false)
}

function handleEditClick(event) {
  const medicationId = Number.parseInt(event.target.dataset.id)
  const medicationToEdit = medications.find((med) => med.id === medicationId)

  if (medicationToEdit) {
    fillFormForEdit(medicationToEdit)
    showModal(true)
  }
}

let medicationToDelete = null

function handleDeleteClick(event) {
  const medicationId = Number.parseInt(event.target.dataset.id)
  medicationToDelete = medications.find((med) => med.id === medicationId)

  if (medicationToDelete) {
    showConfirmationModal()
  }
}

function handleFormSubmit(event) {
  event.preventDefault()

  // Reset error messages
  elements.nameError.textContent = ""
  elements.stockError.textContent = ""
  elements.priceError.textContent = ""
  elements.expiryError.textContent = ""

  // Validate form
  let isValid = true

  if (!elements.medName.value.trim()) {
    elements.nameError.textContent = "Medication name is required"
    isValid = false
  }

  if (elements.medStock.value === "" || Number.parseInt(elements.medStock.value) < 0) {
    elements.stockError.textContent = "Stock must be a positive number"
    isValid = false
  }

  if (elements.medPrice.value === "" || Number.parseFloat(elements.medPrice.value) < 0) {
    elements.priceError.textContent = "Price must be a positive number"
    isValid = false
  }

  if (!elements.medExpiry.value) {
    elements.expiryError.textContent = "Expiry date is required"
    isValid = false
  }

  if (!isValid) return

  const medicationData = {
    name: elements.medName.value.trim(),
    category: elements.medCategory.value,
    stock: Number.parseInt(elements.medStock.value),
    price: Number.parseFloat(elements.medPrice.value),
    expiryDate: elements.medExpiry.value,
    description: elements.medDescription.value.trim(),
  }

  const medicationId = elements.medicationId.value

  if (medicationId) {
    // Edit existing medication
    const index = medications.findIndex((med) => med.id === Number.parseInt(medicationId))
    if (index !== -1) {
      medications[index] = { ...medications[index], ...medicationData }
      showNotification("Medication updated successfully")
    }
  } else {
    // Add new medication
    medicationData.id = getNextId()
    medications.push(medicationData)
    showNotification("New medication added successfully")
  }

  saveToLocalStorage()
  hideModal()
  handleSearch() // Re-apply current filters
}

function handleConfirmDelete() {
  if (medicationToDelete) {
    medications = medications.filter((med) => med.id !== medicationToDelete.id)
    saveToLocalStorage()
    showNotification(`${medicationToDelete.name} has been deleted`)
    hideConfirmationModal()
    handleSearch() // Re-apply current filters
    medicationToDelete = null
  }
}

// Initialize the application
function init() {
  // Load data from local storage
  loadFromLocalStorage()

  // Render the initial table
  renderInventoryTable()

  // Add event listeners
  elements.addMedicationBtn.addEventListener("click", handleAddMedicationClick)
  elements.closeBtn.addEventListener("click", hideModal)
  elements.cancelBtn.addEventListener("click", hideModal)
  elements.medicationForm.addEventListener("submit", handleFormSubmit)

  elements.searchBtn.addEventListener("click", handleSearch)
  elements.searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      handleSearch()
    }
  })
  elements.categoryFilter.addEventListener("change", handleSearch)

  elements.cancelDeleteBtn.addEventListener("click", hideConfirmationModal)
  elements.confirmDeleteBtn.addEventListener("click", handleConfirmDelete)

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === elements.addMedicationModal) {
      hideModal()
    }
    if (event.target === elements.confirmationModal) {
      hideConfirmationModal()
    }
  })

  // Set today's date as the minimum for expiry date
  const today = new Date().toISOString().split("T")[0]
  elements.medExpiry.setAttribute("min", today)
}

// Initialize the app when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", init)

