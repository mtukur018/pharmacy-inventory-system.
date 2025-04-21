const path = require("path");
const { app } = require("electron");
const Database = require("better-sqlite3");

// Ensure a default admin user exists with plain password
function ensureDefaultAdmin() {
  try {
    const dbPath = path.join(app.getPath("userData"), "pharmacy.db");
    console.log("🗂 Using SQLite DB at:", dbPath);

    const db = new Database(dbPath);

    // Ensure the users table exists
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        username TEXT UNIQUE,
        email TEXT,
        phone TEXT,
        password TEXT,
        role TEXT
      )
    `).run();

    // Check if admin user already exists
    const existingAdmin = db
      .prepare("SELECT * FROM users WHERE username = ? AND role = ?")
      .get("admin", "admin");

    if (!existingAdmin) {
      console.log("👤 No admin found. Creating default admin with plain password...");

      db.prepare(`
        INSERT INTO users (name, username, email, phone, password, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        "System Administrator",
        "admin",
        "admin@pharmacy.com",
        "+1234567890",
        "admin123",  // ← PLAIN password
        "admin"
      );

      const inserted = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
      console.log("✅ Default admin user created:", inserted);
    } else {
      console.log("✅ Admin user already exists:", existingAdmin);
    }

    db.close();
  } catch (error) {
    console.error("❌ Failed to ensure default admin:", error);
  }
}

module.exports = { ensureDefaultAdmin };
