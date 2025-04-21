const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Session management
  session: {
    getCurrentUser: () => ipcRenderer.invoke("session:getCurrentUser"),
    setCurrentUser: (user) => ipcRenderer.invoke("session:setCurrentUser", user),
    logout: () => ipcRenderer.invoke("session:logout")
  },

  // Medication operations
  medications: {
    getAll: () => ipcRenderer.invoke("medications:getAll"),
    add: (data) => ipcRenderer.invoke("medications:add", data),
    update: (id, data) => ipcRenderer.invoke("medications:update", id, data),
    delete: (id) => ipcRenderer.invoke("medications:delete", id)
  },

  // User management
  users: {
    getAll: () => ipcRenderer.invoke("users:getAll"),
    getById: (id) => ipcRenderer.invoke("users:getById", id),
    add: (data) => ipcRenderer.invoke("users:add", data),
    update: (data) => ipcRenderer.invoke("users:update", data),
    delete: (id) => ipcRenderer.invoke("users:delete", id),
    verifyPassword: (data) => ipcRenderer.invoke("users:verifyPassword", data),
    resetPassword: (data) => ipcRenderer.invoke("users:resetPassword", data),
    login: (username, password) => ipcRenderer.invoke("users:authenticate", { username, password })
  },

  // Settings management
  settings: {
    getAll: () => ipcRenderer.invoke("settings:getAll"),
    update: (data) => ipcRenderer.invoke("settings:update", data),
    reset: () => ipcRenderer.invoke("settings:reset")
  },

  // Activity logs
  activities: {
    log: (message, type = "info") => ipcRenderer.invoke("activities:log", message, type),
    getRecent: () => ipcRenderer.invoke("activities:getRecent")
  },

  // Backup & Restore
  data: {
    backup: () => ipcRenderer.invoke("data:backup"),
    restore: () => ipcRenderer.invoke("data:restore"),
    clearAll: () => ipcRenderer.invoke("data:clearAll")
  },

  
  system: {
    getInfo: () => ipcRenderer.invoke("system:getInfo"),
    getOS: () => ipcRenderer.invoke("system:getOS"),
    getAppVersion: () => ipcRenderer.invoke("system:getAppVersion"),
    getArchitecture: () => ipcRenderer.invoke("system:getArchitecture"),
    getMemory: () => ipcRenderer.invoke("system:getMemory"),
    getStorage: () => ipcRenderer.invoke("system:getStorage")
  }

});
