import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("attendance.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    job_title TEXT,
    division TEXT,
    phone TEXT,
    join_date TEXT,
    status TEXT DEFAULT 'active',
    face_data TEXT,
    profile_image TEXT,
    manager_name TEXT,
    gender TEXT,
    religion TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    status TEXT, -- 'present', 'late', 'absent', 'leave'
    location_in TEXT,
    location_out TEXT,
    photo_in TEXT,
    photo_out TEXT,
    total_hours REAL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'sick', 'vacation', 'other'
    reason TEXT,
    proof_file TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Admin if not exists
try {
  db.exec("ALTER TABLE users ADD COLUMN manager_name TEXT;");
} catch (e) {
  // column might already exist
}

try {
  db.exec("ALTER TABLE users ADD COLUMN gender TEXT;");
  db.exec("ALTER TABLE users ADD COLUMN religion TEXT;");
  db.exec("ALTER TABLE users ADD COLUMN address TEXT;");
} catch (e) {
  // columns might already exist
}

const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare(`
    INSERT INTO users (name, email, password, role, job_title, division, join_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("Administrator", "admin@volve.com", hashedPassword, "admin", "HR Manager", "Human Resources", new Date().toISOString());
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(cors());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // API Routes
  app.post("/api/login", (req, res) => {
    const { employeeId, password } = req.body;
    
    // Convert EMP-0001 to 1
    let userId: number | null = null;
    const upperId = employeeId ? employeeId.toUpperCase() : '';
    if (upperId.startsWith('EMP-')) {
      userId = parseInt(upperId.replace('EMP-', ''), 10);
    } else if (employeeId) {
      // Fallback if they just enter the number
      userId = parseInt(employeeId, 10);
    }

    if (!userId || isNaN(userId)) {
      return res.status(401).json({ message: "ID Karyawan tidak valid" });
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "ID Karyawan atau password salah" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  });

  app.get("/api/me", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.sendStatus(404);
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Attendance Routes
  app.get("/api/attendance/today", authenticateToken, (req: any, res) => {
    const today = new Date().toISOString().split('T')[0];
    const attendance = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?").get(req.user.id, today);
    res.json(attendance || null);
  });

  app.post("/api/attendance/check-in", authenticateToken, (req: any, res) => {
    const { location, photo, status } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString();

    const existing = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?").get(req.user.id, today);
    if (existing) return res.status(400).json({ message: "Already checked in today" });

    db.prepare(`
      INSERT INTO attendance (user_id, date, check_in, status, location_in, photo_in)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, today, now, status, JSON.stringify(location), photo);

    res.json({ message: "Checked in successfully" });

    // Generate notification if late
    if (status === 'late') {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message)
        VALUES (?, ?, ?)
      `).run(req.user.id, "Keterlambatan Tercatat", "Anda melakukan absen masuk setelah jam 09:00.");
    }
  });

  app.post("/api/attendance/check-out", authenticateToken, (req: any, res) => {
    const { location, photo } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString();

    const attendance = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?").get(req.user.id, today) as any;
    if (!attendance) return res.status(400).json({ message: "Not checked in today" });
    if (attendance.check_out) return res.status(400).json({ message: "Already checked out today" });

    // Calculate hours
    const checkInTime = new Date(`${today} ${attendance.check_in}`).getTime();
    const checkOutTime = new Date(`${today} ${now}`).getTime();
    const totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);

    db.prepare(`
      UPDATE attendance 
      SET check_out = ?, location_out = ?, photo_out = ?, total_hours = ?
      WHERE id = ?
    `).run(now, JSON.stringify(location), photo, totalHours.toFixed(2), attendance.id);

    res.json({ message: "Checked out successfully" });
  });

  app.get("/api/attendance/history", authenticateToken, (req: any, res) => {
    const history = db.prepare(`
      SELECT a.*, u.name as user_name 
      FROM attendance a 
      JOIN users u ON a.user_id = u.id 
      WHERE a.user_id = ? 
      ORDER BY a.date DESC LIMIT 30
    `).all(req.user.id);
    res.json(history);
  });

  // Leave Routes
  app.post("/api/leaves", authenticateToken, (req: any, res) => {
    const { type, reason, start_date, end_date } = req.body;
    db.prepare(`
      INSERT INTO leaves (user_id, type, reason, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, type, reason, start_date, end_date);
    res.json({ message: "Leave request submitted successfully" });
  });

  app.get("/api/leaves", authenticateToken, (req: any, res) => {
    const leaves = db.prepare(`
      SELECT l.*, u.name as user_name 
      FROM leaves l 
      JOIN users u ON l.user_id = u.id 
      WHERE l.user_id = ? 
      ORDER BY l.created_at DESC
    `).all(req.user.id);
    res.json(leaves);
  });

  // Admin Routes
  app.get("/api/admin/employees", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const employees = db.prepare("SELECT id, name, email, role, job_title, division, status, join_date, phone, gender, religion, address FROM users").all();
    res.json(employees);
  });

  app.post("/api/admin/employees", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { id, name, email, password, role, job_title, division, join_date, manager_name, gender, religion, address } = req.body;
    const hashedPassword = bcrypt.hashSync(password || "staff123", 10);
    
    try {
      if (id) {
        db.prepare(`
          INSERT INTO users (id, name, email, password, role, job_title, division, join_date, manager_name, gender, religion, address)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, name, email, hashedPassword, role || 'staff', job_title, division, join_date || new Date().toISOString(), manager_name || null, gender || null, religion || null, address || null);
      } else {
        db.prepare(`
          INSERT INTO users (name, email, password, role, job_title, division, join_date, manager_name, gender, religion, address)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, email, hashedPassword, role || 'staff', job_title, division, join_date || new Date().toISOString(), manager_name || null, gender || null, religion || null, address || null);
      }
      res.json({ message: "Employee added successfully" });
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint failed: users.id')) {
        return res.status(400).json({ message: "ID Karyawan sudah digunakan." });
      }
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/employees/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { id } = req.params;
    try {
      // Prevent deleting the main admin
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
      if (user && user.email === 'admin@volve.com') {
        return res.status(400).json({ message: "Cannot delete the main administrator." });
      }
      
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      res.json({ message: "Employee deleted successfully" });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/admin/reset-password", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { employeeId, newPassword } = req.body;
    
    if (!employeeId || !newPassword) {
      return res.status(400).json({ message: "ID Karyawan dan Password Baru wajib diisi" });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const result = db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, employeeId);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: "Karyawan tidak ditemukan" });
    }

    res.json({ message: "Password berhasil direset" });
  });

  app.get("/api/admin/attendance", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const attendance = db.prepare(`
      SELECT a.*, u.name as user_name, u.division 
      FROM attendance a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY a.date DESC, a.check_in DESC
    `).all();
    res.json(attendance);
  });

  app.get("/api/admin/leaves", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const leaves = db.prepare(`
      SELECT l.*, u.name as user_name 
      FROM leaves l 
      JOIN users u ON l.user_id = u.id 
      ORDER BY l.created_at DESC
    `).all();
    res.json(leaves);
  });

  app.post("/api/admin/leaves/:id/approve", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { status } = req.body; // 'approved' or 'rejected'
    
    const leave = db.prepare("SELECT * FROM leaves WHERE id = ?").get(req.params.id) as any;
    if (!leave) return res.status(404).json({ message: "Leave request not found" });

    db.prepare("UPDATE leaves SET status = ?, approved_by = ? WHERE id = ?")
      .run(status, req.user.id, req.params.id);

    // Notify user
    const title = status === 'approved' ? "Izin Disetujui" : "Izin Ditolak";
    const message = `Pengajuan ${leave.type} Anda untuk tanggal ${leave.start_date} telah ${status === 'approved' ? 'disetujui' : 'ditolak'}.`;
    
    db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, ?, ?)
    `).run(leave.user_id, title, message);

    res.json({ message: `Leave request ${status}` });
  });

  // Stats for Dashboard
  app.get("/api/dashboard-summary", authenticateToken, (req: any, res) => {
    const userId = req.user.id;
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Check for attendance reminder
    if (now.getHours() >= 8 && now.getMinutes() >= 30) {
      const attendance = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?").get(userId, today);
      if (!attendance) {
        // Check if reminder already sent today
        const reminderSent = db.prepare(`
          SELECT * FROM notifications 
          WHERE user_id = ? AND title = 'Pengingat Absen' AND date(created_at) = ?
        `).get(userId, today);

        if (!reminderSent) {
          db.prepare(`
            INSERT INTO notifications (user_id, title, message)
            VALUES (?, ?, ?)
          `).run(userId, "Pengingat Absen", "Jangan lupa untuk melakukan absen masuk hari ini!");
        }
      }
    }
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_present,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as total_late,
        SUM(total_hours) as total_hours
      FROM attendance 
      WHERE user_id = ? AND date LIKE ?
    `).get(userId, `${month}%`) as any;

    const leaves = db.prepare(`
      SELECT COUNT(*) as total_leaves 
      FROM leaves 
      WHERE user_id = ? AND status = 'approved' AND start_date LIKE ?
    `).get(userId, `${month}%`) as any;

    res.json({
      present: stats.total_present || 0,
      late: stats.total_late || 0,
      hours: stats.total_hours || 0,
      leaves: leaves.total_leaves || 0
    });
  });

  app.get("/api/admin/dashboard-summary", authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const today = new Date().toISOString().split('T')[0];
    
    const totalEmployees = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const presentToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ?").get(today) as any;
    const lateToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'late'").get(today) as any;
    const pendingLeaves = db.prepare("SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'").get() as any;

    res.json({
      totalEmployees: totalEmployees.count,
      presentToday: presentToday.count,
      lateToday: lateToday.count,
      pendingLeaves: pendingLeaves.count
    });
  });

  // Notification Routes
  app.get("/api/user-alerts", authenticateToken, (req: any, res) => {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC LIMIT 20
    `).all(req.user.id);
    res.json(notifications);
  });

  app.post("/api/user-alerts/read-all", authenticateToken, (req: any, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(req.user.id);
    res.json({ message: "All notifications marked as read" });
  });

  app.post("/api/user-alerts/:id/read", authenticateToken, (req: any, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    res.json({ message: "Notification marked as read" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
