import BetterSqlite3, { Database as BetterSqliteDatabase } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { EncryptionManager } from './encryption';

export class Database {
  private db: BetterSqliteDatabase | null = null;
  private dbPath: string;
  private encryption: EncryptionManager;

  constructor(dbPath: string, encryption: EncryptionManager) {
    this.dbPath = dbPath;
    this.encryption = encryption;
  }

  async initialize(): Promise<void> {
    try {
      this.db = new BetterSqlite3(this.dbPath);
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Create tables
      this.createTables();
      
      // Run migrations if needed
      this.runMigrations();
      
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK(role IN ('admin', 'trainer', 'trainee')),
        displayName TEXT NOT NULL,
        email TEXT,
        passwordHash TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Cohorts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cohorts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        defaultZoomUrl TEXT,
        startDate TEXT,
        endDate TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Cohort members junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cohort_members (
        id TEXT PRIMARY KEY,
        cohortId TEXT NOT NULL,
        traineeId TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'completed', 'withdrawn')),
        joinedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (cohortId) REFERENCES cohorts(id) ON DELETE CASCADE,
        FOREIGN KEY (traineeId) REFERENCES trainees(id) ON DELETE CASCADE,
        UNIQUE(cohortId, traineeId)
      )
    `);

    // Trainees table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trainees (
        id TEXT PRIMARY KEY,
        userId TEXT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        accessNeeds TEXT,
        preferredLearningStyle TEXT,
        notesEncrypted TEXT,
        emergencyContact TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        cohortId TEXT NOT NULL,
        weekNumber INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        startTime TEXT NOT NULL,
        endTime TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'live', 'ended')),
        zoomUrlOverride TEXT,
        meetingId TEXT,
        passcode TEXT,
        hostNotes TEXT,
        agenda TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (cohortId) REFERENCES cohorts(id) ON DELETE CASCADE
      )
    `);

    // Attendance table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        traineeId TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'absent' CHECK(status IN ('present', 'late', 'absent', 'left_early', 'excused')),
        moodScore INTEGER CHECK(moodScore >= 1 AND moodScore <= 5),
        note TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (traineeId) REFERENCES trainees(id) ON DELETE CASCADE,
        UNIQUE(sessionId, traineeId)
      )
    `);

    // Progress table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS progress (
        id TEXT PRIMARY KEY,
        traineeId TEXT NOT NULL,
        weekNumber INTEGER NOT NULL,
        checklistJson TEXT,
        outcomesJson TEXT,
        notes TEXT,
        completedAt TEXT,
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (traineeId) REFERENCES trainees(id) ON DELETE CASCADE,
        UNIQUE(traineeId, weekNumber)
      )
    `);

    // Policy acknowledgements table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS acknowledgements (
        id TEXT PRIMARY KEY,
        traineeId TEXT NOT NULL,
        policyId TEXT NOT NULL,
        acknowledgedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (traineeId) REFERENCES trainees(id) ON DELETE CASCADE,
        UNIQUE(traineeId, policyId)
      )
    `);

    // Resources table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL CHECK(type IN ('slide', 'pdf', 'document', 'video', 'link', 'worksheet', 'other')),
        tagsJson TEXT,
        indexedText TEXT,
        weekNumber INTEGER,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Safeguarding logs (encrypted)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS safeguarding_logs (
        id TEXT PRIMARY KEY,
        createdByTrainerId TEXT NOT NULL,
        encryptedBlob TEXT NOT NULL,
        severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'escalated')),
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (createdByTrainerId) REFERENCES users(id)
      )
    `);

    // Support flags table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS support_flags (
        id TEXT PRIMARY KEY,
        traineeId TEXT NOT NULL,
        sessionId TEXT,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'acknowledged', 'resolved')),
        trainerNotesEncrypted TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        resolvedAt TEXT,
        FOREIGN KEY (traineeId) REFERENCES trainees(id) ON DELETE CASCADE,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE SET NULL
      )
    `);

    // Exports tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS exports (
        id TEXT PRIMARY KEY,
        sessionId TEXT,
        cohortId TEXT,
        traineeId TEXT,
        type TEXT NOT NULL CHECK(type IN ('register', 'progress', 'session_pack', 'report', 'diagnostics')),
        format TEXT NOT NULL CHECK(format IN ('csv', 'pdf', 'zip', 'json')),
        filePath TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE SET NULL,
        FOREIGN KEY (cohortId) REFERENCES cohorts(id) ON DELETE SET NULL,
        FOREIGN KEY (traineeId) REFERENCES trainees(id) ON DELETE SET NULL
      )
    `);

    // Audit log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        userId TEXT,
        action TEXT NOT NULL,
        entityType TEXT NOT NULL,
        entityId TEXT,
        details TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Session templates table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_templates (
        id TEXT PRIMARY KEY,
        weekNumber INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        agenda TEXT,
        resourcesJson TEXT,
        notesTemplate TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Chat messages table (for live classroom)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        senderName TEXT NOT NULL,
        message TEXT NOT NULL,
        isModerated INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON cohort_members(cohortId);
      CREATE INDEX IF NOT EXISTS idx_cohort_members_trainee ON cohort_members(traineeId);
      CREATE INDEX IF NOT EXISTS idx_sessions_cohort ON sessions(cohortId);
      CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(startTime);
      CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(sessionId);
      CREATE INDEX IF NOT EXISTS idx_attendance_trainee ON attendance(traineeId);
      CREATE INDEX IF NOT EXISTS idx_progress_trainee ON progress(traineeId);
      CREATE INDEX IF NOT EXISTS idx_resources_week ON resources(weekNumber);
      CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(sessionId);
    `);
  }

  private runMigrations(): void {
    if (!this.db) return;

    // Get current version
    const versionResult = this.db.pragma('user_version') as { user_version: number }[];
    const currentVersion = versionResult[0]?.user_version || 0;

    // Run migrations based on version
    if (currentVersion < 1) {
      // Initial schema - already created above
      this.db.pragma('user_version = 1');
    }

    // Add more migrations here as schema evolves
    // if (currentVersion < 2) { ... }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Utility methods
  generateId(): string {
    return uuidv4();
  }

  // User operations
  getUsers(): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM users ORDER BY displayName').all();
  }

  getUser(id: string): unknown {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  createUser(data: { role: string; displayName: string; email?: string }): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO users (id, role, displayName, email)
      VALUES (?, ?, ?, ?)
    `).run(id, data.role, data.displayName, data.email || null);
    return this.getUser(id);
  }

  updateUser(id: string, data: Partial<{ role: string; displayName: string; email: string }>): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const sets: string[] = [];
    const values: unknown[] = [];
    
    if (data.role !== undefined) { sets.push('role = ?'); values.push(data.role); }
    if (data.displayName !== undefined) { sets.push('displayName = ?'); values.push(data.displayName); }
    if (data.email !== undefined) { sets.push('email = ?'); values.push(data.email); }
    
    if (sets.length > 0) {
      sets.push("updatedAt = datetime('now')");
      values.push(id);
      this.db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.getUser(id);
  }

  deleteUser(id: string): boolean {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Cohort operations
  getCohorts(): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM cohorts ORDER BY createdAt DESC').all();
  }

  getCohort(id: string): unknown {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM cohorts WHERE id = ?').get(id);
  }

  createCohort(data: { name: string; description?: string; defaultZoomUrl?: string; startDate?: string; endDate?: string }): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO cohorts (id, name, description, defaultZoomUrl, startDate, endDate)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.description || null, data.defaultZoomUrl || null, data.startDate || null, data.endDate || null);
    return this.getCohort(id);
  }

  updateCohort(id: string, data: Partial<{ name: string; description: string; defaultZoomUrl: string; startDate: string; endDate: string; status: string }>): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const sets: string[] = [];
    const values: unknown[] = [];
    
    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
    if (data.defaultZoomUrl !== undefined) { sets.push('defaultZoomUrl = ?'); values.push(data.defaultZoomUrl); }
    if (data.startDate !== undefined) { sets.push('startDate = ?'); values.push(data.startDate); }
    if (data.endDate !== undefined) { sets.push('endDate = ?'); values.push(data.endDate); }
    if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status); }
    
    if (sets.length > 0) {
      sets.push("updatedAt = datetime('now')");
      values.push(id);
      this.db.prepare(`UPDATE cohorts SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.getCohort(id);
  }

  deleteCohort(id: string): boolean {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.prepare('DELETE FROM cohorts WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getCohortMembers(cohortId: string): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare(`
      SELECT t.*, cm.status as memberStatus, cm.joinedAt
      FROM trainees t
      JOIN cohort_members cm ON t.id = cm.traineeId
      WHERE cm.cohortId = ?
      ORDER BY t.name
    `).all(cohortId);
  }

  addCohortMember(cohortId: string, traineeId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');
    try {
      const id = this.generateId();
      this.db.prepare(`
        INSERT INTO cohort_members (id, cohortId, traineeId)
        VALUES (?, ?, ?)
      `).run(id, cohortId, traineeId);
      return true;
    } catch {
      return false;
    }
  }

  removeCohortMember(cohortId: string, traineeId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.prepare('DELETE FROM cohort_members WHERE cohortId = ? AND traineeId = ?').run(cohortId, traineeId);
    return result.changes > 0;
  }

  // Trainee operations
  getTrainees(): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM trainees ORDER BY name').all();
  }

  getTrainee(id: string): unknown {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM trainees WHERE id = ?').get(id);
  }

  createTrainee(data: { name: string; email?: string; phone?: string; accessNeeds?: string; preferredLearningStyle?: string; notes?: string }): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const id = this.generateId();
    let encryptedNotes = null;
    if (data.notes) {
      encryptedNotes = this.encryption.encrypt(data.notes);
    }
    this.db.prepare(`
      INSERT INTO trainees (id, name, email, phone, accessNeeds, preferredLearningStyle, notesEncrypted)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.email || null, data.phone || null, data.accessNeeds || null, data.preferredLearningStyle || null, encryptedNotes);
    return this.getTrainee(id);
  }

  updateTrainee(id: string, data: Partial<{ name: string; email: string; phone: string; accessNeeds: string; preferredLearningStyle: string; notes: string }>): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const sets: string[] = [];
    const values: unknown[] = [];
    
    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.email !== undefined) { sets.push('email = ?'); values.push(data.email); }
    if (data.phone !== undefined) { sets.push('phone = ?'); values.push(data.phone); }
    if (data.accessNeeds !== undefined) { sets.push('accessNeeds = ?'); values.push(data.accessNeeds); }
    if (data.preferredLearningStyle !== undefined) { sets.push('preferredLearningStyle = ?'); values.push(data.preferredLearningStyle); }
    if (data.notes !== undefined) {
      sets.push('notesEncrypted = ?');
      values.push(data.notes ? this.encryption.encrypt(data.notes) : null);
    }
    
    if (sets.length > 0) {
      sets.push("updatedAt = datetime('now')");
      values.push(id);
      this.db.prepare(`UPDATE trainees SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.getTrainee(id);
  }

  deleteTrainee(id: string): boolean {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.prepare('DELETE FROM trainees WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Session operations
  getSessions(cohortId?: string): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    if (cohortId) {
      return this.db.prepare('SELECT * FROM sessions WHERE cohortId = ? ORDER BY startTime DESC').all(cohortId);
    }
    return this.db.prepare('SELECT * FROM sessions ORDER BY startTime DESC').all();
  }

  getSession(id: string): unknown {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  }

  createSession(data: { cohortId: string; weekNumber: number; title: string; description?: string; startTime: string; zoomUrlOverride?: string; meetingId?: string; passcode?: string; hostNotes?: string; agenda?: string }): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO sessions (id, cohortId, weekNumber, title, description, startTime, zoomUrlOverride, meetingId, passcode, hostNotes, agenda)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.cohortId, data.weekNumber, data.title, data.description || null, data.startTime, data.zoomUrlOverride || null, data.meetingId || null, data.passcode || null, data.hostNotes || null, data.agenda || null);
    return this.getSession(id);
  }

  updateSession(id: string, data: Partial<{ weekNumber: number; title: string; description: string; startTime: string; endTime: string; status: string; zoomUrlOverride: string; meetingId: string; passcode: string; hostNotes: string; agenda: string }>): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const sets: string[] = [];
    const values: unknown[] = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        sets.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (sets.length > 0) {
      sets.push("updatedAt = datetime('now')");
      values.push(id);
      this.db.prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.getSession(id);
  }

  deleteSession(id: string): boolean {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Attendance operations
  getAttendance(sessionId: string): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare(`
      SELECT a.*, t.name as traineeName
      FROM attendance a
      JOIN trainees t ON a.traineeId = t.id
      WHERE a.sessionId = ?
      ORDER BY t.name
    `).all(sessionId);
  }

  saveAttendance(sessionId: string, records: { traineeId: string; status: string; moodScore?: number; note?: string }[]): boolean {
    if (!this.db) throw new Error('Database not initialized');
    
    const insertOrUpdate = this.db.prepare(`
      INSERT INTO attendance (id, sessionId, traineeId, status, moodScore, note)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(sessionId, traineeId) DO UPDATE SET
        status = excluded.status,
        moodScore = excluded.moodScore,
        note = excluded.note,
        timestamp = datetime('now')
    `);

    const transaction = this.db.transaction((records: { traineeId: string; status: string; moodScore?: number; note?: string }[]) => {
      for (const record of records) {
        insertOrUpdate.run(this.generateId(), sessionId, record.traineeId, record.status, record.moodScore || null, record.note || null);
      }
    });

    try {
      transaction(records);
      return true;
    } catch {
      return false;
    }
  }

  getTraineeAttendance(traineeId: string): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare(`
      SELECT a.*, s.title as sessionTitle, s.startTime as sessionDate, s.weekNumber
      FROM attendance a
      JOIN sessions s ON a.sessionId = s.id
      WHERE a.traineeId = ?
      ORDER BY s.startTime DESC
    `).all(traineeId);
  }

  // Progress operations
  getProgress(traineeId: string): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM progress WHERE traineeId = ? ORDER BY weekNumber').all(traineeId);
  }

  saveProgress(traineeId: string, weekNumber: number, data: { checklistJson?: string; outcomesJson?: string; notes?: string; completedAt?: string }): boolean {
    if (!this.db) throw new Error('Database not initialized');
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO progress (id, traineeId, weekNumber, checklistJson, outcomesJson, notes, completedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(traineeId, weekNumber) DO UPDATE SET
        checklistJson = excluded.checklistJson,
        outcomesJson = excluded.outcomesJson,
        notes = excluded.notes,
        completedAt = excluded.completedAt,
        updatedAt = datetime('now')
    `).run(id, traineeId, weekNumber, data.checklistJson || null, data.outcomesJson || null, data.notes || null, data.completedAt || null);
    return true;
  }

  getCohortProgress(cohortId: string): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare(`
      SELECT p.*, t.name as traineeName
      FROM progress p
      JOIN trainees t ON p.traineeId = t.id
      JOIN cohort_members cm ON t.id = cm.traineeId
      WHERE cm.cohortId = ?
      ORDER BY t.name, p.weekNumber
    `).all(cohortId);
  }

  // Acknowledgements operations
  getAcknowledgements(traineeId: string): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM acknowledgements WHERE traineeId = ? ORDER BY acknowledgedAt DESC').all(traineeId);
  }

  saveAcknowledgement(traineeId: string, policyId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');
    try {
      const id = this.generateId();
      this.db.prepare(`
        INSERT INTO acknowledgements (id, traineeId, policyId)
        VALUES (?, ?, ?)
      `).run(id, traineeId, policyId);
      return true;
    } catch {
      return false;
    }
  }

  // Resources operations
  getResources(filters?: { weekNumber?: number; type?: string; search?: string }): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    let query = 'SELECT * FROM resources WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.weekNumber !== undefined) {
      query += ' AND weekNumber = ?';
      params.push(filters.weekNumber);
    }
    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters?.search) {
      query += ' AND (title LIKE ? OR indexedText LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY title';
    return this.db.prepare(query).all(...params);
  }

  getResource(id: string): unknown {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
  }

  createResource(data: { path: string; title: string; description?: string; type: string; tags?: string[]; indexedText?: string; weekNumber?: number }): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO resources (id, path, title, description, type, tagsJson, indexedText, weekNumber)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.path, data.title, data.description || null, data.type, data.tags ? JSON.stringify(data.tags) : null, data.indexedText || null, data.weekNumber || null);
    return this.getResource(id);
  }

  searchResources(query: string): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare(`
      SELECT * FROM resources
      WHERE title LIKE ? OR description LIKE ? OR indexedText LIKE ?
      ORDER BY title
    `).all(`%${query}%`, `%${query}%`, `%${query}%`);
  }

  // Safeguarding operations
  getSafeguardingLogs(): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    const logs = this.db.prepare('SELECT * FROM safeguarding_logs ORDER BY createdAt DESC').all() as { encryptedBlob: string }[];
    return logs.map(log => ({
      ...log,
      content: this.encryption.decrypt(log.encryptedBlob),
    }));
  }

  createSafeguardingLog(data: { createdByTrainerId: string; content: string; severity: string }): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const id = this.generateId();
    const encryptedBlob = this.encryption.encrypt(data.content);
    this.db.prepare(`
      INSERT INTO safeguarding_logs (id, createdByTrainerId, encryptedBlob, severity)
      VALUES (?, ?, ?, ?)
    `).run(id, data.createdByTrainerId, encryptedBlob, data.severity);
    return this.db.prepare('SELECT * FROM safeguarding_logs WHERE id = ?').get(id);
  }

  // Support flags operations
  getSupportFlags(): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    const flags = this.db.prepare(`
      SELECT sf.*, t.name as traineeName
      FROM support_flags sf
      JOIN trainees t ON sf.traineeId = t.id
      ORDER BY sf.createdAt DESC
    `).all() as { trainerNotesEncrypted: string | null }[];
    return flags.map(flag => ({
      ...flag,
      trainerNotes: flag.trainerNotesEncrypted ? this.encryption.decrypt(flag.trainerNotesEncrypted) : null,
    }));
  }

  createSupportFlag(data: { traineeId: string; sessionId?: string; reason: string }): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO support_flags (id, traineeId, sessionId, reason)
      VALUES (?, ?, ?, ?)
    `).run(id, data.traineeId, data.sessionId || null, data.reason);
    return this.db.prepare('SELECT * FROM support_flags WHERE id = ?').get(id);
  }

  updateSupportFlag(id: string, data: Partial<{ status: string; trainerNotes: string }>): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const sets: string[] = [];
    const values: unknown[] = [];
    
    if (data.status !== undefined) {
      sets.push('status = ?');
      values.push(data.status);
      if (data.status === 'resolved') {
        sets.push("resolvedAt = datetime('now')");
      }
    }
    if (data.trainerNotes !== undefined) {
      sets.push('trainerNotesEncrypted = ?');
      values.push(data.trainerNotes ? this.encryption.encrypt(data.trainerNotes) : null);
    }
    
    if (sets.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE support_flags SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.db.prepare('SELECT * FROM support_flags WHERE id = ?').get(id);
  }

  // Audit log operations
  getAuditLog(filters?: { userId?: string; entityType?: string; limit?: number }): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.userId) {
      query += ' AND userId = ?';
      params.push(filters.userId);
    }
    if (filters?.entityType) {
      query += ' AND entityType = ?';
      params.push(filters.entityType);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    return this.db.prepare(query).all(...params);
  }

  createAuditLog(data: { userId?: string; action: string; entityType: string; entityId?: string; details?: string }): void {
    if (!this.db) throw new Error('Database not initialized');
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO audit_log (id, userId, action, entityType, entityId, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.userId || null, data.action, data.entityType, data.entityId || null, data.details || null);
  }

  // Session templates operations
  getSessionTemplates(): unknown[] {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM session_templates ORDER BY weekNumber, name').all();
  }

  getSessionTemplate(id: string): unknown {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.prepare('SELECT * FROM session_templates WHERE id = ?').get(id);
  }

  createSessionTemplate(data: { weekNumber: number; name: string; description?: string; agenda?: string; resourcesJson?: string; notesTemplate?: string }): unknown {
    if (!this.db) throw new Error('Database not initialized');
    const id = this.generateId();
    this.db.prepare(`
      INSERT INTO session_templates (id, weekNumber, name, description, agenda, resourcesJson, notesTemplate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.weekNumber, data.name, data.description || null, data.agenda || null, data.resourcesJson || null, data.notesTemplate || null);
    return this.getSessionTemplate(id);
  }

  // Export raw db for backup
  getRawDb(): BetterSqliteDatabase | null {
    return this.db;
  }
}
