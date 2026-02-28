import Database from "better-sqlite3";
const db = new Database("attendance.db");
try {
  const reminderSent = db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? AND title = 'Pengingat Absen' AND date(created_at) = ?
  `).get(1, '2026-02-26');
  console.log("Success", reminderSent);
} catch (e) {
  console.error(e);
}
