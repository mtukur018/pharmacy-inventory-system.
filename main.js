const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const db = require("./services/database");
const { ensureDefaultAdmin } = require("./init-admin");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.loadFile("login.html");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ensureDefaultAdmin();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

// ───────────────────────────────────────────
//                IPC HANDLERS
// ───────────────────────────────────────────

// ✅ Medications
ipcMain.handle("medications:getAll", () => db.getAllMedications());
ipcMain.handle("medications:add", (e, data) => db.addMedication(data));
ipcMain.handle("medications:update", (e, id, data) => db.updateMedication(id, data));
ipcMain.handle("medications:delete", (e, id) => db.deleteMedication(id));

// ✅ Activities
ipcMain.handle("activities:log", (e, message, type) => db.logActivity(message, type));
ipcMain.handle("activities:getRecent", () => db.getRecentActivities());

// ✅ Users
ipcMain.handle("users:getAll", () => db.getAllUsers());
ipcMain.handle("users:getById", (e, id) => {
  const users = db.getAllUsers();
  return users.find(u => u.id === id) || null;
});
ipcMain.handle("users:add", (e, user) => {
  if (!user.username || !user.password || !user.role) {
    throw new Error("Missing required user fields");
  }
  return db.addUser(user);
});
ipcMain.handle("users:update", (e, user) => db.updateUser(user));
ipcMain.handle("users:delete", (e, id) => db.deleteUser(id));
ipcMain.handle("users:authenticate", (e, { username, password }) => {
  const users = db.getAllUsers();
  const user = users.find((u) => u.username === username);

  if (!user || !user.password) {
    console.log("❌ User not found or missing password.");
    return null;
  }

  console.log("🔐 Stored password:", user.password);
  console.log("🔐 Input password:", password);

  const passwordMatch = user.password === password;
  if (!passwordMatch) {
    console.log("❌ Password mismatch");
    return null;
  }

  console.log("✅ Login successful:", user.username);
  return { ...user, password: undefined };
});

// ✅ Settings
ipcMain.handle("settings:getAll", () => db.getSettings());
ipcMain.handle("settings:update", (e, data) => db.updateSettings(data));
ipcMain.handle("settings:reset", () => db.resetSettings());

// ✅ Backup
ipcMain.handle("data:backup", async () => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: "Backup Data",
    defaultPath: path.join(app.getPath("documents"), "pharmacy-backup.sqlite"),
    filters: [{ name: "SQLite Files", extensions: ["sqlite", "db"] }]
  });
  if (canceled || !filePath) return false;
  const dbPath = path.join(app.getPath("userData"), "pharmacy.db");
  fs.copyFileSync(dbPath, filePath);
  return true;
});

// ✅ Restore
ipcMain.handle("data:restore", async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: "Restore Data",
    properties: ["openFile"],
    filters: [{ name: "SQLite Files", extensions: ["sqlite", "db"] }]
  });
  if (canceled || !filePaths || filePaths.length === 0) return false;
  const sourcePath = filePaths[0];
  const destPath = path.join(app.getPath("userData"), "pharmacy.db");
  fs.copyFileSync(sourcePath, destPath);
  return true;
});

// ✅ Session Management
let currentUser = null;
ipcMain.handle("session:getCurrentUser", () => currentUser);
ipcMain.handle("session:setCurrentUser", (e, user) => {
  currentUser = user;
  return true;
});
ipcMain.handle("session:logout", () => {
  currentUser = null;
  if (mainWindow) mainWindow.loadFile("login.html");
  return true;
});

ipcMain.handle("system:getInfo", async () => {
  return {
    version: "1.0.0",  // or pull from package.json
    lastUpdated: new Date().toLocaleDateString(),
    dbStatus: "Connected",  // could check DB health
    storageUsed: "2.5 MB",  // optional: real calculation
    storageLimit: "5 GB"
  };
});

const os = require("os");
const si = require("systeminformation");

// OS
ipcMain.handle("system:getOS", () => `${os.type()} ${os.release()}`);

// App Version
ipcMain.handle("system:getAppVersion", () => app.getVersion());

// Architecture
ipcMain.handle("system:getArchitecture", () => os.arch());

// Memory (Total RAM)
ipcMain.handle("system:getMemory", async () => {
  const mem = await si.mem();
  return `${(mem.total / (1024 ** 3)).toFixed(2)} GB`;
});

// Storage (Total disk size)
ipcMain.handle("system:getStorage", async () => {
  const disks = await si.fsSize();
  const total = disks.reduce((acc, disk) => acc + disk.size, 0);
  return `${(total / (1024 ** 3)).toFixed(2)} GB`;
});

// ✅ DASHBOARD SUMMARY HANDLERS — 👇👇 NEW
ipcMain.handle("dashboard:getStats", () => db.getSummaryStats());
ipcMain.handle("dashboard:getCategoryDistribution", () => db.getCategoryDistribution());
