import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'atendia.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS turnos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      patient_phone TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      service TEXT,
      obra_social TEXT,
      status TEXT NOT NULL DEFAULT 'confirmed',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_phone TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_turnos_date ON turnos(date);
    CREATE INDEX IF NOT EXISTS idx_turnos_phone ON turnos(patient_phone);
    CREATE INDEX IF NOT EXISTS idx_turnos_status ON turnos(status);
    CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(patient_phone);
  `);
}

// Config helpers
export function getConfig(key: string): string | undefined {
  const row = getDb().prepare('SELECT value FROM config WHERE key = ?').get(key) as any;
  return row?.value;
}

export function setConfig(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
}

export function getAllConfig(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM config').all() as any[];
  const config: Record<string, string> = {};
  for (const row of rows) config[row.key] = row.value;
  return config;
}

// Turno helpers
export interface Turno {
  id?: number;
  patient_name: string;
  patient_phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  service?: string;
  obra_social?: string;
  status: string;
  notes?: string;
  created_at?: string;
}

export function createTurno(t: Omit<Turno, 'id' | 'created_at'>): Turno {
  const stmt = getDb().prepare(`
    INSERT INTO turnos (patient_name, patient_phone, date, time, service, obra_social, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(t.patient_name, t.patient_phone, t.date, t.time, t.service || null, t.obra_social || null, t.status, t.notes || null);
  return { ...t, id: result.lastInsertRowid as number };
}

export function getTurnosByDate(date: string): Turno[] {
  return getDb().prepare("SELECT * FROM turnos WHERE date = ? AND status != 'cancelled' ORDER BY time").all(date) as Turno[];
}

export function getTurnosByPhone(phone: string): Turno[] {
  return getDb().prepare("SELECT * FROM turnos WHERE patient_phone = ? AND status != 'cancelled' ORDER BY date, time").all(phone) as Turno[];
}

export function getUpcomingTurnos(limit = 50): Turno[] {
  return getDb().prepare(`
    SELECT * FROM turnos 
    WHERE date >= date('now', 'localtime') AND status = 'confirmed'
    ORDER BY date, time LIMIT ?
  `).all(limit) as Turno[];
}

export function getAllTurnos(limit = 100): Turno[] {
  return getDb().prepare('SELECT * FROM turnos ORDER BY date DESC, time DESC LIMIT ?').all(limit) as Turno[];
}

export function cancelTurno(id: number): void {
  getDb().prepare("UPDATE turnos SET status = 'cancelled' WHERE id = ?").run(id);
}

export function getTurnoById(id: number): Turno | undefined {
  return getDb().prepare('SELECT * FROM turnos WHERE id = ?').get(id) as Turno | undefined;
}

export function getAvailableSlots(date: string): string[] {
  const config = getAllConfig();
  const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // 0=Sun, 6=Sat
  
  // Check if practice is open on this day
  const hours = JSON.parse(config.operating_hours || '{}');
  const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const dayConfig = hours[dayNames[dayOfWeek]];
  
  if (!dayConfig || !dayConfig.open) return [];
  
  const startHour = parseInt(dayConfig.start.split(':')[0]);
  const startMin = parseInt(dayConfig.start.split(':')[1] || '0');
  const endHour = parseInt(dayConfig.end.split(':')[0]);
  const endMin = parseInt(dayConfig.end.split(':')[1] || '0');
  const duration = parseInt(config.turno_duration || '30');
  
  // Generate all possible slots
  const allSlots: string[] = [];
  let currentMin = startHour * 60 + startMin;
  const endMinTotal = endHour * 60 + endMin;
  
  while (currentMin + duration <= endMinTotal) {
    const h = Math.floor(currentMin / 60);
    const m = currentMin % 60;
    allSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    currentMin += duration;
  }
  
  // Remove taken slots
  const taken = getTurnosByDate(date).map(t => t.time);
  const maxTurnos = parseInt(config.max_turnos_per_day || '20');
  
  if (taken.length >= maxTurnos) return [];
  
  return allSlots.filter(s => !taken.includes(s));
}

// Conversation helpers
export function getOrCreateConversation(phone: string): { id: number; messages: any[] } {
  let row = getDb().prepare('SELECT * FROM conversations WHERE patient_phone = ? ORDER BY updated_at DESC LIMIT 1').get(phone) as any;
  
  if (!row) {
    const result = getDb().prepare('INSERT INTO conversations (patient_phone, messages) VALUES (?, ?)').run(phone, '[]');
    return { id: result.lastInsertRowid as number, messages: [] };
  }
  
  return { id: row.id, messages: JSON.parse(row.messages) };
}

export function appendMessage(phone: string, role: 'user' | 'assistant', content: string) {
  const conv = getOrCreateConversation(phone);
  conv.messages.push({ role, content, timestamp: new Date().toISOString() });
  
  // Keep last 20 messages for context
  const trimmed = conv.messages.slice(-20);
  
  getDb().prepare("UPDATE conversations SET messages = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
    .run(JSON.stringify(trimmed), conv.id);
}

export function getRecentConversations(limit = 20): any[] {
  return getDb().prepare('SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?').all(limit) as any[];
}
