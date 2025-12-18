import * as fs from 'fs';
import * as path from 'path';
import { Database } from './database';

// PDF generation using jspdf
interface JsPDFOptions {
  orientation?: 'portrait' | 'landscape';
  unit?: 'mm' | 'pt' | 'in' | 'cm';
  format?: 'a4' | 'letter';
}

export class ExportManager {
  private exportsPath: string;
  private database: Database;

  constructor(exportsPath: string, database: Database) {
    this.exportsPath = exportsPath;
    this.database = database;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      this.exportsPath,
      path.join(this.exportsPath, 'registers'),
      path.join(this.exportsPath, 'session-packs'),
      path.join(this.exportsPath, 'reports'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  // Export register to CSV
  async exportRegisterCSV(sessionId: string): Promise<string> {
    const session = this.database.getSession(sessionId) as {
      id: string;
      title: string;
      startTime: string;
      cohortId: string;
    };
    if (!session) throw new Error('Session not found');

    const attendance = this.database.getAttendance(sessionId) as {
      traineeName: string;
      status: string;
      moodScore?: number;
      note?: string;
      timestamp: string;
    }[];

    // Build CSV content
    const headers = ['Name', 'Status', 'Mood Score', 'Notes', 'Time'];
    const rows = attendance.map(a => [
      this.escapeCSV(a.traineeName),
      a.status,
      a.moodScore?.toString() || '',
      this.escapeCSV(a.note || ''),
      a.timestamp,
    ]);

    const csvContent = [
      `"Session: ${session.title}"`,
      `"Date: ${session.startTime}"`,
      '',
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const filename = `register_${this.sanitizeFilename(session.title)}_${this.getTimestamp()}.csv`;
    const filePath = path.join(this.exportsPath, 'registers', filename);
    
    fs.writeFileSync(filePath, csvContent, 'utf-8');

    // Log export
    this.database.createAuditLog({
      action: 'export_register',
      entityType: 'session',
      entityId: sessionId,
      details: `CSV export: ${filename}`,
    });

    return filePath;
  }

  // Export register to PDF
  async exportRegisterPDF(sessionId: string): Promise<string> {
    const session = this.database.getSession(sessionId) as {
      id: string;
      title: string;
      startTime: string;
      cohortId: string;
    };
    if (!session) throw new Error('Session not found');

    const cohort = this.database.getCohort(session.cohortId) as { name: string };
    const attendance = this.database.getAttendance(sessionId) as {
      traineeName: string;
      status: string;
      moodScore?: number;
      note?: string;
      timestamp: string;
    }[];

    // Create PDF content as HTML for simple rendering
    const htmlContent = this.generateRegisterHTML(session, cohort, attendance);
    
    const filename = `register_${this.sanitizeFilename(session.title)}_${this.getTimestamp()}.html`;
    const filePath = path.join(this.exportsPath, 'registers', filename);
    
    fs.writeFileSync(filePath, htmlContent, 'utf-8');

    // Log export
    this.database.createAuditLog({
      action: 'export_register',
      entityType: 'session',
      entityId: sessionId,
      details: `PDF/HTML export: ${filename}`,
    });

    return filePath;
  }

  // Export progress report
  async exportProgress(type: 'trainee' | 'cohort', id: string, format: 'csv' | 'pdf'): Promise<string> {
    if (type === 'trainee') {
      return this.exportTraineeProgress(id, format);
    } else {
      return this.exportCohortProgress(id, format);
    }
  }

  private async exportTraineeProgress(traineeId: string, format: 'csv' | 'pdf'): Promise<string> {
    const trainee = this.database.getTrainee(traineeId) as { id: string; name: string };
    if (!trainee) throw new Error('Trainee not found');

    const progress = this.database.getProgress(traineeId) as {
      weekNumber: number;
      checklistJson: string;
      outcomesJson: string;
      notes: string;
      completedAt: string;
    }[];

    const attendance = this.database.getTraineeAttendance(traineeId) as {
      sessionTitle: string;
      sessionDate: string;
      status: string;
      moodScore?: number;
    }[];

    if (format === 'csv') {
      const csvContent = this.generateTraineeProgressCSV(trainee, progress, attendance);
      const filename = `progress_${this.sanitizeFilename(trainee.name)}_${this.getTimestamp()}.csv`;
      const filePath = path.join(this.exportsPath, 'reports', filename);
      fs.writeFileSync(filePath, csvContent, 'utf-8');
      return filePath;
    } else {
      const htmlContent = this.generateTraineeProgressHTML(trainee, progress, attendance);
      const filename = `progress_${this.sanitizeFilename(trainee.name)}_${this.getTimestamp()}.html`;
      const filePath = path.join(this.exportsPath, 'reports', filename);
      fs.writeFileSync(filePath, htmlContent, 'utf-8');
      return filePath;
    }
  }

  private async exportCohortProgress(cohortId: string, format: 'csv' | 'pdf'): Promise<string> {
    const cohort = this.database.getCohort(cohortId) as { id: string; name: string };
    if (!cohort) throw new Error('Cohort not found');

    const progress = this.database.getCohortProgress(cohortId) as {
      traineeName: string;
      weekNumber: number;
      checklistJson: string;
      outcomesJson: string;
    }[];

    if (format === 'csv') {
      const csvContent = this.generateCohortProgressCSV(cohort, progress);
      const filename = `cohort_progress_${this.sanitizeFilename(cohort.name)}_${this.getTimestamp()}.csv`;
      const filePath = path.join(this.exportsPath, 'reports', filename);
      fs.writeFileSync(filePath, csvContent, 'utf-8');
      return filePath;
    } else {
      const htmlContent = this.generateCohortProgressHTML(cohort, progress);
      const filename = `cohort_progress_${this.sanitizeFilename(cohort.name)}_${this.getTimestamp()}.html`;
      const filePath = path.join(this.exportsPath, 'reports', filename);
      fs.writeFileSync(filePath, htmlContent, 'utf-8');
      return filePath;
    }
  }

  // Export session pack
  async exportSessionPack(sessionId: string): Promise<string> {
    const session = this.database.getSession(sessionId) as {
      id: string;
      title: string;
      startTime: string;
      cohortId: string;
      agenda: string;
      zoomUrlOverride: string;
      meetingId: string;
      passcode: string;
    };
    if (!session) throw new Error('Session not found');

    const cohort = this.database.getCohort(session.cohortId) as { 
      name: string; 
      defaultZoomUrl: string;
    };

    const htmlContent = this.generateSessionPackHTML(session, cohort);
    const filename = `session_pack_${this.sanitizeFilename(session.title)}_${this.getTimestamp()}.html`;
    const filePath = path.join(this.exportsPath, 'session-packs', filename);
    
    fs.writeFileSync(filePath, htmlContent, 'utf-8');

    return filePath;
  }

  // Export diagnostics
  async exportDiagnostics(): Promise<string> {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      database: {
        cohortCount: (this.database.getCohorts() as unknown[]).length,
        traineeCount: (this.database.getTrainees() as unknown[]).length,
        sessionCount: (this.database.getSessions() as unknown[]).length,
      },
      recentAuditLog: this.database.getAuditLog({ limit: 50 }),
    };

    const filename = `diagnostics_${this.getTimestamp()}.json`;
    const filePath = path.join(this.exportsPath, 'reports', filename);
    
    fs.writeFileSync(filePath, JSON.stringify(diagnostics, null, 2), 'utf-8');

    return filePath;
  }

  // Get list of exports
  getExports(): { path: string; type: string; createdAt: string }[] {
    const exports: { path: string; type: string; createdAt: string }[] = [];

    const scanDir = (dir: string, type: string) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            exports.push({
              path: filePath,
              type,
              createdAt: stat.birthtime.toISOString(),
            });
          }
        }
      }
    };

    scanDir(path.join(this.exportsPath, 'registers'), 'register');
    scanDir(path.join(this.exportsPath, 'session-packs'), 'session-pack');
    scanDir(path.join(this.exportsPath, 'reports'), 'report');

    return exports.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Helper methods
  private escapeCSV(value: string): string {
    return value.replace(/"/g, '""');
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  }

  private generateRegisterHTML(
    session: { title: string; startTime: string },
    cohort: { name: string },
    attendance: { traineeName: string; status: string; moodScore?: number; note?: string }[]
  ): string {
    const statusColors: Record<string, string> = {
      present: '#22c55e',
      late: '#f59e0b',
      absent: '#ef4444',
      left_early: '#f97316',
      excused: '#6b7280',
    };

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Attendance Register - ${session.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
    h1 { color: #1e40af; margin-bottom: 5px; }
    .meta { color: #64748b; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    .status { padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; }
    .mood { font-size: 18px; }
    .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Attendance Register</h1>
  <div class="meta">
    <strong>Session:</strong> ${session.title}<br>
    <strong>Cohort:</strong> ${cohort.name}<br>
    <strong>Date:</strong> ${new Date(session.startTime).toLocaleDateString('en-GB', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    })}
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Status</th>
        <th>Mood</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${attendance.map(a => `
        <tr>
          <td>${a.traineeName}</td>
          <td><span class="status" style="background: ${statusColors[a.status] || '#6b7280'}">${a.status.replace('_', ' ')}</span></td>
          <td class="mood">${a.moodScore ? '⭐'.repeat(a.moodScore) : '-'}</td>
          <td>${a.note || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="summary" style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 8px;">
    <strong>Summary:</strong>
    Present: ${attendance.filter(a => a.status === 'present').length} |
    Late: ${attendance.filter(a => a.status === 'late').length} |
    Absent: ${attendance.filter(a => a.status === 'absent').length} |
    Total: ${attendance.length}
  </div>
  
  <div class="footer">
    © RemoteAbility CIC | Registered Community Interest Company | All rights reserved.
  </div>
</body>
</html>`;
  }

  private generateTraineeProgressCSV(
    trainee: { name: string },
    progress: { weekNumber: number; checklistJson: string; outcomesJson: string; completedAt: string }[],
    attendance: { sessionTitle: string; status: string }[]
  ): string {
    const lines = [
      `"Trainee Progress Report: ${trainee.name}"`,
      `"Generated: ${new Date().toISOString()}"`,
      '',
      '"Week Progress"',
      '"Week","Checklist Items","Outcomes","Completed"',
    ];

    for (const p of progress) {
      const checklist = p.checklistJson ? JSON.parse(p.checklistJson) : [];
      const outcomes = p.outcomesJson ? JSON.parse(p.outcomesJson) : [];
      lines.push(`"Week ${p.weekNumber}","${checklist.filter((c: { done: boolean }) => c.done).length}/${checklist.length}","${outcomes.filter((o: { achieved: boolean }) => o.achieved).length}/${outcomes.length}","${p.completedAt || 'In progress'}"`);
    }

    lines.push('', '"Attendance History"', '"Session","Status"');
    for (const a of attendance) {
      lines.push(`"${a.sessionTitle}","${a.status}"`);
    }

    return lines.join('\n');
  }

  private generateTraineeProgressHTML(
    trainee: { name: string },
    progress: { weekNumber: number; checklistJson: string; outcomesJson: string; completedAt: string }[],
    attendance: { sessionTitle: string; sessionDate: string; status: string; moodScore?: number }[]
  ): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Progress Report - ${trainee.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
    h1 { color: #1e40af; }
    h2 { color: #475569; margin-top: 30px; }
    .card { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 15px 0; }
    .week-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .week-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
    .progress-bar { height: 8px; background: #e2e8f0; border-radius: 4px; margin-top: 10px; }
    .progress-fill { height: 100%; background: #22c55e; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
    th { background: #f1f5f9; }
    .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Progress Report: ${trainee.name}</h1>
  <p style="color: #64748b;">Generated: ${new Date().toLocaleDateString('en-GB')}</p>
  
  <h2>Week-by-Week Progress</h2>
  <div class="week-grid">
    ${[1, 2, 3, 4, 5, 6].map(week => {
      const weekProgress = progress.find(p => p.weekNumber === week);
      const checklist = weekProgress?.checklistJson ? JSON.parse(weekProgress.checklistJson) : [];
      const completed = checklist.filter((c: { done: boolean }) => c.done).length;
      const total = checklist.length || 1;
      const percentage = Math.round((completed / total) * 100);
      
      return `
        <div class="week-card">
          <strong>Week ${week}</strong>
          <div style="color: #64748b; font-size: 14px; margin-top: 5px;">
            ${completed}/${total} items completed
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    }).join('')}
  </div>
  
  <h2>Attendance History</h2>
  <table>
    <thead>
      <tr>
        <th>Session</th>
        <th>Date</th>
        <th>Status</th>
        <th>Mood</th>
      </tr>
    </thead>
    <tbody>
      ${attendance.map(a => `
        <tr>
          <td>${a.sessionTitle}</td>
          <td>${new Date(a.sessionDate).toLocaleDateString('en-GB')}</td>
          <td>${a.status}</td>
          <td>${a.moodScore ? '⭐'.repeat(a.moodScore) : '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    © RemoteAbility CIC | Registered Community Interest Company | All rights reserved.
  </div>
</body>
</html>`;
  }

  private generateCohortProgressCSV(
    cohort: { name: string },
    progress: { traineeName: string; weekNumber: number; checklistJson: string }[]
  ): string {
    const lines = [
      `"Cohort Progress Report: ${cohort.name}"`,
      `"Generated: ${new Date().toISOString()}"`,
      '',
      '"Trainee","Week 1","Week 2","Week 3","Week 4","Week 5","Week 6"',
    ];

    // Group progress by trainee
    const byTrainee = new Map<string, Map<number, string>>();
    for (const p of progress) {
      if (!byTrainee.has(p.traineeName)) {
        byTrainee.set(p.traineeName, new Map());
      }
      const checklist = p.checklistJson ? JSON.parse(p.checklistJson) : [];
      const completed = checklist.filter((c: { done: boolean }) => c.done).length;
      const total = checklist.length;
      byTrainee.get(p.traineeName)!.set(p.weekNumber, `${completed}/${total}`);
    }

    for (const [trainee, weeks] of byTrainee) {
      const row = [trainee];
      for (let i = 1; i <= 6; i++) {
        row.push(weeks.get(i) || '-');
      }
      lines.push(row.map(cell => `"${cell}"`).join(','));
    }

    return lines.join('\n');
  }

  private generateCohortProgressHTML(
    cohort: { name: string },
    progress: { traineeName: string; weekNumber: number; checklistJson: string }[]
  ): string {
    // Group progress by trainee
    const byTrainee = new Map<string, Map<number, number>>();
    for (const p of progress) {
      if (!byTrainee.has(p.traineeName)) {
        byTrainee.set(p.traineeName, new Map());
      }
      const checklist = p.checklistJson ? JSON.parse(p.checklistJson) : [];
      const completed = checklist.filter((c: { done: boolean }) => c.done).length;
      const total = checklist.length || 1;
      byTrainee.get(p.traineeName)!.set(p.weekNumber, Math.round((completed / total) * 100));
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cohort Progress - ${cohort.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
    h1 { color: #1e40af; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: center; }
    th { background: #f1f5f9; }
    td:first-child { text-align: left; font-weight: 500; }
    .progress-cell { background: linear-gradient(90deg, #22c55e var(--progress), #f1f5f9 var(--progress)); }
    .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Cohort Progress: ${cohort.name}</h1>
  <p style="color: #64748b;">Generated: ${new Date().toLocaleDateString('en-GB')}</p>
  
  <table>
    <thead>
      <tr>
        <th>Trainee</th>
        <th>Week 1</th>
        <th>Week 2</th>
        <th>Week 3</th>
        <th>Week 4</th>
        <th>Week 5</th>
        <th>Week 6</th>
      </tr>
    </thead>
    <tbody>
      ${Array.from(byTrainee).map(([trainee, weeks]) => `
        <tr>
          <td>${trainee}</td>
          ${[1, 2, 3, 4, 5, 6].map(week => {
            const pct = weeks.get(week) || 0;
            return `<td class="progress-cell" style="--progress: ${pct}%">${pct}%</td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    © RemoteAbility CIC | Registered Community Interest Company | All rights reserved.
  </div>
</body>
</html>`;
  }

  private generateSessionPackHTML(
    session: { title: string; startTime: string; agenda: string; zoomUrlOverride: string; meetingId: string; passcode: string },
    cohort: { name: string; defaultZoomUrl: string }
  ): string {
    const zoomUrl = session.zoomUrlOverride || cohort.defaultZoomUrl;
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Session Pack - ${session.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
    h1 { color: #1e40af; }
    .info-box { background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; margin: 10px 0; }
    .info-label { width: 120px; font-weight: 600; color: #475569; }
    .agenda { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; white-space: pre-wrap; }
    .zoom-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
    .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Session Pack</h1>
  <h2 style="color: #475569; font-weight: normal;">${session.title}</h2>
  
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">Cohort:</span>
      <span>${cohort.name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date & Time:</span>
      <span>${new Date(session.startTime).toLocaleString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })}</span>
    </div>
    ${zoomUrl ? `
    <div class="info-row">
      <span class="info-label">Zoom Link:</span>
      <span><a href="${zoomUrl}">${zoomUrl}</a></span>
    </div>
    ` : ''}
    ${session.meetingId ? `
    <div class="info-row">
      <span class="info-label">Meeting ID:</span>
      <span>${session.meetingId}</span>
    </div>
    ` : ''}
    ${session.passcode ? `
    <div class="info-row">
      <span class="info-label">Passcode:</span>
      <span>${session.passcode}</span>
    </div>
    ` : ''}
    ${zoomUrl ? `<a href="${zoomUrl}" class="zoom-button">Join Zoom Meeting</a>` : ''}
  </div>
  
  ${session.agenda ? `
  <h3>Agenda</h3>
  <div class="agenda">${session.agenda}</div>
  ` : ''}
  
  <div class="footer">
    © RemoteAbility CIC | Registered Community Interest Company | All rights reserved.
  </div>
</body>
</html>`;
  }
}
