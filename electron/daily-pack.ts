import { IpcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

interface SessionData {
  id: string;
  title: string;
  cohortId: string;
  cohortName: string;
  weekNumber: number;
  dayNumber: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  zoomLink?: string;
}

interface AttendanceRecord {
  traineeId: string;
  traineeName: string;
  status: 'present' | 'late' | 'absent' | 'left-early';
  moodScore?: number;
  notes?: string;
  arrivalTime?: string;
  departureTime?: string;
}

interface ChatMessage {
  timestamp: string;
  senderId: string;
  senderName: string;
  senderType: 'trainer' | 'trainee';
  message: string;
}

interface TimelineEvent {
  timestamp: string;
  type: string;
  description: string;
  data?: any;
}

interface ProgressRecord {
  traineeId: string;
  traineeName: string;
  weekNumber: number;
  completedItems: string[];
  outcomesAchieved: string[];
}

interface ResourceUsed {
  type: 'slide' | 'handout' | 'link' | 'file';
  title: string;
  path?: string;
  url?: string;
  usedAt: string;
}

interface RecordingInfo {
  fileName: string;
  duration: number;
  storagePath: string;
  integrityStatus: 'ok' | 'warning' | 'error';
  hashesGenerated: boolean;
  markers: { label: string; offsetMs: number }[];
  consentCount: number;
}

interface SupportFlagSummary {
  raised: number;
  resolved: number;
  unresolved: number;
}

interface DailyPackOptions {
  sessions: SessionData[];
  exportMode: 'internal' | 'shareable';
  includeTrainerNotes: boolean;
  includeChatTranscript: boolean;
  includeFilePaths: boolean;
  trainerName: string;
  generatedBy: string;
}

interface DailyPackData {
  sessions: SessionData[];
  attendance: Record<string, AttendanceRecord[]>;
  chatMessages: Record<string, ChatMessage[]>;
  timeline: Record<string, TimelineEvent[]>;
  progress: Record<string, ProgressRecord[]>;
  resources: Record<string, ResourceUsed[]>;
  recordings: Record<string, RecordingInfo | null>;
  supportFlags: Record<string, SupportFlagSummary>;
  trainerNotes: Record<string, string>;
}

export class DailyPackGenerator {
  private exportsPath: string;

  constructor(exportsPath: string) {
    this.exportsPath = exportsPath;
  }

  async generateDailyPack(
    options: DailyPackOptions,
    data: DailyPackData
  ): Promise<{ pdfPath: string; folderPath: string }> {
    const date = new Date().toISOString().split('T')[0];
    const cohortName = options.sessions[0]?.cohortName || 'unknown';
    const safeCohortName = cohortName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    
    const baseName = `${date}_cohort-${safeCohortName}_daily-pack`;
    const reportsDir = path.join(this.exportsPath, 'reports');
    const folderPath = path.join(reportsDir, baseName);
    const pdfPath = path.join(reportsDir, `${baseName}.pdf`);

    // Ensure directories exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Generate companion files
    await this.generateCompanionFiles(folderPath, options, data);

    // Generate PDF
    await this.generatePDF(pdfPath, options, data);

    return { pdfPath, folderPath };
  }

  private async generateCompanionFiles(
    folderPath: string,
    options: DailyPackOptions,
    data: DailyPackData
  ): Promise<void> {
    // Generate register.csv
    const registerCsv = this.generateRegisterCSV(data, options);
    fs.writeFileSync(path.join(folderPath, 'register.csv'), registerCsv, 'utf-8');

    // Generate chat.jsonl
    if (options.includeChatTranscript) {
      const chatJsonl = this.generateChatJSONL(data, options);
      fs.writeFileSync(path.join(folderPath, 'chat.jsonl'), chatJsonl, 'utf-8');
    }

    // Generate timeline.jsonl
    const timelineJsonl = this.generateTimelineJSONL(data);
    fs.writeFileSync(path.join(folderPath, 'timeline.jsonl'), timelineJsonl, 'utf-8');

    // Generate progress.json
    const progressJson = this.generateProgressJSON(data, options);
    fs.writeFileSync(path.join(folderPath, 'progress.json'), JSON.stringify(progressJson, null, 2), 'utf-8');

    // Generate metadata.json
    const metadata = {
      generatedAt: new Date().toISOString(),
      generatedBy: options.generatedBy,
      exportMode: options.exportMode,
      sessions: options.sessions.map(s => ({
        id: s.id,
        title: s.title,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      options: {
        includeTrainerNotes: options.includeTrainerNotes,
        includeChatTranscript: options.includeChatTranscript,
        includeFilePaths: options.includeFilePaths,
      },
    };
    fs.writeFileSync(path.join(folderPath, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
  }

  private generateRegisterCSV(data: DailyPackData, options: DailyPackOptions): string {
    const rows: string[] = ['Session,Trainee,Status,Mood Score,Arrival,Departure,Notes'];
    
    for (const session of options.sessions) {
      const attendance = data.attendance[session.id] || [];
      for (const record of attendance) {
        const name = options.exportMode === 'shareable' 
          ? this.anonymizeName(record.traineeName)
          : record.traineeName;
        const mood = options.exportMode === 'shareable' ? '' : (record.moodScore?.toString() || '');
        const notes = options.includeTrainerNotes ? (record.notes || '') : '';
        
        rows.push([
          `"${session.title}"`,
          `"${name}"`,
          record.status,
          mood,
          record.arrivalTime || '',
          record.departureTime || '',
          `"${notes.replace(/"/g, '""')}"`,
        ].join(','));
      }
    }
    
    return rows.join('\n');
  }

  private generateChatJSONL(data: DailyPackData, options: DailyPackOptions): string {
    const lines: string[] = [];
    
    for (const session of options.sessions) {
      const messages = data.chatMessages[session.id] || [];
      for (const msg of messages) {
        const entry = {
          sessionId: session.id,
          timestamp: msg.timestamp,
          sender: options.exportMode === 'shareable' 
            ? this.anonymizeName(msg.senderName)
            : msg.senderName,
          senderType: msg.senderType,
          message: msg.message,
        };
        lines.push(JSON.stringify(entry));
      }
    }
    
    return lines.join('\n');
  }

  private generateTimelineJSONL(data: DailyPackData): string {
    const lines: string[] = [];
    
    for (const sessionId in data.timeline) {
      const events = data.timeline[sessionId] || [];
      for (const event of events) {
        lines.push(JSON.stringify({ sessionId, ...event }));
      }
    }
    
    return lines.join('\n');
  }

  private generateProgressJSON(data: DailyPackData, options: DailyPackOptions): any {
    const progress: any = { sessions: {}, totals: { planned: 0, completed: 0 } };
    
    for (const session of options.sessions) {
      const records = data.progress[session.id] || [];
      progress.sessions[session.id] = records.map(r => ({
        trainee: options.exportMode === 'shareable' 
          ? this.anonymizeName(r.traineeName)
          : r.traineeName,
        weekNumber: r.weekNumber,
        completedItems: r.completedItems.length,
        outcomesAchieved: r.outcomesAchieved.length,
      }));
      
      for (const r of records) {
        progress.totals.completed += r.completedItems.length;
      }
    }
    
    return progress;
  }

  private anonymizeName(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}. ${parts[parts.length - 1][0]}.`;
    }
    return `${name[0]}.`;
  }

  private async generatePDF(
    pdfPath: string,
    options: DailyPackOptions,
    data: DailyPackData
  ): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const pageWidth = 595.28; // A4
    const pageHeight = 841.89;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    // Cover Page
    await this.addCoverPage(pdfDoc, options, data, font, fontBold, pageWidth, pageHeight, margin);

    // Section 1: Daily Summary
    await this.addDailySummarySection(pdfDoc, options, data, font, fontBold, pageWidth, pageHeight, margin, contentWidth);

    // Section 2: Register (Attendance)
    await this.addRegisterSection(pdfDoc, options, data, font, fontBold, pageWidth, pageHeight, margin, contentWidth);

    // Section 3: Progress and Outcomes
    await this.addProgressSection(pdfDoc, options, data, font, fontBold, pageWidth, pageHeight, margin, contentWidth);

    // Section 4: Chat Transcript
    if (options.includeChatTranscript) {
      await this.addChatSection(pdfDoc, options, data, font, fontBold, pageWidth, pageHeight, margin, contentWidth);
    }

    // Section 5: Resources and Links
    await this.addResourcesSection(pdfDoc, options, data, font, fontBold, pageWidth, pageHeight, margin, contentWidth);

    // Section 6: Recording & Audit Artefacts
    await this.addRecordingSection(pdfDoc, options, data, font, fontBold, pageWidth, pageHeight, margin, contentWidth);

    // Section 7: Safeguarding Summary (role-gated content)
    await this.addSafeguardingSection(pdfDoc, options, data, font, fontBold, pageWidth, pageHeight, margin, contentWidth);

    // Section 8: Sign-off Page
    await this.addSignOffPage(pdfDoc, options, font, fontBold, pageWidth, pageHeight, margin, contentWidth);

    // Add page numbers and footers to all pages
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      this.addPageFooter(pages[i], font, i + 1, pages.length, options.sessions[0]?.cohortName || '', pageWidth, margin);
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(pdfPath, pdfBytes);
  }

  private async addCoverPage(
    pdfDoc: PDFDocument,
    options: DailyPackOptions,
    data: DailyPackData,
    font: PDFFont,
    fontBold: PDFFont,
    pageWidth: number,
    pageHeight: number,
    margin: number
  ): Promise<void> {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 150;

    // Organization name
    page.drawText('RemoteAbility CIC', {
      x: margin,
      y,
      size: 28,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 50;

    // Title
    page.drawText('Daily Session Pack', {
      x: margin,
      y,
      size: 24,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 60;

    // Cohort name
    page.drawText(`Cohort: ${options.sessions[0]?.cohortName || 'Unknown'}`, {
      x: margin,
      y,
      size: 16,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 30;

    // Date
    const date = new Date().toISOString().split('T')[0];
    page.drawText(`Date: ${date}`, {
      x: margin,
      y,
      size: 14,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 40;

    // Sessions included
    page.drawText('Sessions Included:', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 25;

    for (const session of options.sessions) {
      page.drawText(`• ${session.title} (${session.startTime} - ${session.endTime})`, {
        x: margin + 20,
        y,
        size: 12,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 20;
    }
    y -= 20;

    // Recording status
    const hasRecordings = Object.values(data.recordings).some(r => r !== null);
    page.drawText(`Recording Status: ${hasRecordings ? 'Recorded' : 'Not recorded'}`, {
      x: margin,
      y,
      size: 12,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 25;

    // Data location
    page.drawText('Data Location: Local external drive', {
      x: margin,
      y,
      size: 12,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 25;

    // Generated timestamp
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: margin,
      y,
      size: 12,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 25;

    // Export mode
    page.drawText(`Export Mode: ${options.exportMode === 'internal' ? 'Internal (Full)' : 'Shareable (Redacted)'}`, {
      x: margin,
      y,
      size: 12,
      font: font,
      color: options.exportMode === 'shareable' ? rgb(0.8, 0.4, 0.1) : rgb(0.3, 0.3, 0.3),
    });
  }

  private async addDailySummarySection(
    pdfDoc: PDFDocument,
    options: DailyPackOptions,
    data: DailyPackData,
    font: PDFFont,
    fontBold: PDFFont,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number
  ): Promise<void> {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Section title
    page.drawText('Section 1: Daily Summary', {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 35;

    page.drawText('What Happened Today', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 25;

    // Timeline summary for each session
    for (const session of options.sessions) {
      page.drawText(`${session.title}`, {
        x: margin,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 20;

      const events = data.timeline[session.id] || [];
      for (const event of events.slice(0, 10)) {
        const time = new Date(event.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        page.drawText(`  ${time} - ${event.description}`, {
          x: margin + 10,
          y,
          size: 10,
          font: font,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 15;
        if (y < margin + 100) break;
      }
      y -= 10;

      // Trainer notes (if included)
      if (options.includeTrainerNotes && data.trainerNotes[session.id]) {
        page.drawText('Trainer Notes:', {
          x: margin,
          y,
          size: 11,
          font: fontBold,
          color: rgb(0.5, 0.3, 0.1),
        });
        y -= 15;
        
        const notes = data.trainerNotes[session.id].substring(0, 500);
        const lines = this.wrapText(notes, font, 10, contentWidth - 20);
        for (const line of lines.slice(0, 5)) {
          page.drawText(line, {
            x: margin + 10,
            y,
            size: 10,
            font: font,
            color: rgb(0.4, 0.4, 0.4),
          });
          y -= 14;
        }
        y -= 10;
      }

      if (y < margin + 100) break;
    }
  }

  private async addRegisterSection(
    pdfDoc: PDFDocument,
    options: DailyPackOptions,
    data: DailyPackData,
    font: PDFFont,
    fontBold: PDFFont,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number
  ): Promise<void> {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    page.drawText('Section 2: Register (Attendance)', {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 35;

    for (const session of options.sessions) {
      const attendance = data.attendance[session.id] || [];
      
      page.drawText(session.title, {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 25;

      // Table headers
      const cols = [margin, margin + 150, margin + 230, margin + 310, margin + 390];
      page.drawText('Name', { x: cols[0], y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText('Status', { x: cols[1], y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText('Mood', { x: cols[2], y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText('Arrival', { x: cols[3], y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      y -= 5;
      
      // Draw line
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 15;

      // Attendance rows
      let presentCount = 0, absentCount = 0, lateCount = 0;
      
      for (const record of attendance) {
        const name = options.exportMode === 'shareable' 
          ? this.anonymizeName(record.traineeName)
          : record.traineeName;
        const mood = options.exportMode === 'shareable' ? '-' : (record.moodScore?.toString() || '-');
        
        page.drawText(name, { x: cols[0], y, size: 9, font: font, color: rgb(0.3, 0.3, 0.3) });
        
        const statusColor = record.status === 'present' ? rgb(0.2, 0.6, 0.2) :
                           record.status === 'late' ? rgb(0.8, 0.5, 0.1) :
                           rgb(0.8, 0.2, 0.2);
        page.drawText(record.status, { x: cols[1], y, size: 9, font: font, color: statusColor });
        page.drawText(mood, { x: cols[2], y, size: 9, font: font, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(record.arrivalTime || '-', { x: cols[3], y, size: 9, font: font, color: rgb(0.3, 0.3, 0.3) });
        
        if (record.status === 'present') presentCount++;
        else if (record.status === 'absent') absentCount++;
        else if (record.status === 'late') lateCount++;
        
        y -= 15;
        if (y < margin + 100) break;
      }

      // Totals
      y -= 10;
      page.drawText(`Totals: Present: ${presentCount} | Late: ${lateCount} | Absent: ${absentCount}`, {
        x: margin,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 30;

      if (y < margin + 150) break;
    }
  }

  private async addProgressSection(
    pdfDoc: PDFDocument,
    options: DailyPackOptions,
    data: DailyPackData,
    font: PDFFont,
    fontBold: PDFFont,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number
  ): Promise<void> {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    page.drawText('Section 3: Progress and Outcomes', {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 35;

    let totalCompleted = 0;
    let totalPlanned = 0;

    for (const session of options.sessions) {
      const progress = data.progress[session.id] || [];
      
      page.drawText(`${session.title} - Week ${session.weekNumber}`, {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 25;

      for (const record of progress.slice(0, 15)) {
        const name = options.exportMode === 'shareable' 
          ? this.anonymizeName(record.traineeName)
          : record.traineeName;
        
        page.drawText(`${name}: ${record.completedItems.length} items completed, ${record.outcomesAchieved.length} outcomes achieved`, {
          x: margin + 10,
          y,
          size: 10,
          font: font,
          color: rgb(0.4, 0.4, 0.4),
        });
        
        totalCompleted += record.completedItems.length;
        totalPlanned += 10; // Assume 10 planned per trainee
        
        y -= 15;
        if (y < margin + 100) break;
      }
      y -= 15;
    }

    // Cohort totals
    y -= 10;
    const completionPercent = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
    page.drawText(`Cohort Completion: ${completionPercent}% of planned tasks completed today`, {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.5, 0.3),
    });
  }

  private async addChatSection(
    pdfDoc: PDFDocument,
    options: DailyPackOptions,
    data: DailyPackData,
    font: PDFFont,
    fontBold: PDFFont,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number
  ): Promise<void> {
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    page.drawText('Section 4: Chat Transcript', {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 35;

    for (const session of options.sessions) {
      const messages = data.chatMessages[session.id] || [];
      
      page.drawText(session.title, {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 25;

      for (const msg of messages) {
        const time = new Date(msg.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const sender = options.exportMode === 'shareable' 
          ? this.anonymizeName(msg.senderName)
          : msg.senderName;
        const senderColor = msg.senderType === 'trainer' ? rgb(0.2, 0.4, 0.6) : rgb(0.3, 0.3, 0.3);
        
        page.drawText(`[${time}] ${sender}:`, {
          x: margin,
          y,
          size: 9,
          font: fontBold,
          color: senderColor,
        });
        y -= 12;
        
        const lines = this.wrapText(msg.message, font, 9, contentWidth - 20);
        for (const line of lines.slice(0, 3)) {
          page.drawText(line, {
            x: margin + 10,
            y,
            size: 9,
            font: font,
            color: rgb(0.4, 0.4, 0.4),
          });
          y -= 12;
        }
        y -= 5;

        if (y < margin + 50) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
      }
      y -= 15;
    }
  }

  private async addResourcesSection(
    pdfDoc: PDFDocument,
    options: DailyPackOptions,
    data: DailyPackData,
    font: PDFFont,
    fontBold: PDFFont,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number
  ): Promise<void> {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    page.drawText('Section 5: Resources and Links Used Today', {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 35;

    for (const session of options.sessions) {
      const resources = data.resources[session.id] || [];
      
      page.drawText(session.title, {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 25;

      if (resources.length === 0) {
        page.drawText('No resources recorded for this session.', {
          x: margin + 10,
          y,
          size: 10,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
        y -= 20;
      }

      for (const resource of resources) {
        const typeIcon = resource.type === 'slide' ? '📊' : 
                        resource.type === 'handout' ? '📄' :
                        resource.type === 'link' ? '🔗' : '📁';
        
        page.drawText(`${typeIcon} ${resource.title}`, {
          x: margin + 10,
          y,
          size: 10,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 15;

        if (options.includeFilePaths && resource.path) {
          page.drawText(`   Path: ${resource.path}`, {
            x: margin + 20,
            y,
            size: 8,
            font: font,
            color: rgb(0.5, 0.5, 0.5),
          });
          y -= 12;
        }

        if (resource.url) {
          page.drawText(`   URL: ${resource.url}`, {
            x: margin + 20,
            y,
            size: 8,
            font: font,
            color: rgb(0.3, 0.4, 0.6),
          });
          y -= 12;
        }

        y -= 5;
        if (y < margin + 100) break;
      }
      y -= 15;
    }

    // Add Zoom link if present
    const zoomLink = options.sessions.find(s => s.zoomLink)?.zoomLink;
    if (zoomLink) {
      y -= 10;
      page.drawText('Meeting Link:', {
        x: margin,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 18;
      page.drawText(zoomLink, {
        x: margin + 10,
        y,
        size: 10,
        font: font,
        color: rgb(0.2, 0.4, 0.7),
      });
    }
  }

  private async addRecordingSection(
    pdfDoc: PDFDocument,
    options: DailyPackOptions,
    data: DailyPackData,
    font: PDFFont,
    fontBold: PDFFont,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number
  ): Promise<void> {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    page.drawText('Section 6: Recording & Audit Artefacts', {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 35;

    for (const session of options.sessions) {
      const recording = data.recordings[session.id];
      
      page.drawText(session.title, {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 25;

      if (!recording) {
        page.drawText('No recording available for this session.', {
          x: margin + 10,
          y,
          size: 10,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
        y -= 30;
        continue;
      }

      // Recording details
      page.drawText(`File: ${recording.fileName}`, {
        x: margin + 10,
        y,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 15;

      const durationMins = Math.floor(recording.duration / 60000);
      page.drawText(`Duration: ${durationMins} minutes`, {
        x: margin + 10,
        y,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 15;

      if (options.includeFilePaths) {
        page.drawText(`Storage Path: ${recording.storagePath}`, {
          x: margin + 10,
          y,
          size: 10,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 15;
      }

      // Integrity status
      const integrityColor = recording.integrityStatus === 'ok' ? rgb(0.2, 0.6, 0.2) :
                            recording.integrityStatus === 'warning' ? rgb(0.8, 0.5, 0.1) :
                            rgb(0.8, 0.2, 0.2);
      page.drawText(`Integrity: ${recording.integrityStatus.toUpperCase()} ${recording.hashesGenerated ? '(SHA256 hashes generated)' : ''}`, {
        x: margin + 10,
        y,
        size: 10,
        font: font,
        color: integrityColor,
      });
      y -= 15;

      page.drawText(`Consent Acknowledgements: ${recording.consentCount}`, {
        x: margin + 10,
        y,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 20;

      // Markers
      if (recording.markers.length > 0) {
        page.drawText('Timeline Markers (Important Moments):', {
          x: margin + 10,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.4, 0.3, 0.5),
        });
        y -= 15;

        for (const marker of recording.markers.slice(0, 5)) {
          const mins = Math.floor(marker.offsetMs / 60000);
          const secs = Math.floor((marker.offsetMs % 60000) / 1000);
          page.drawText(`  • [${mins}:${secs.toString().padStart(2, '0')}] ${marker.label}`, {
            x: margin + 20,
            y,
            size: 9,
            font: font,
            color: rgb(0.4, 0.4, 0.4),
          });
          y -= 13;
        }
      }
      y -= 15;
    }
  }

  private async addSafeguardingSection(
    pdfDoc: PDFDocument,
    options: DailyPackOptions,
    data: DailyPackData,
    font: PDFFont,
    fontBold: PDFFont,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number
  ): Promise<void> {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    page.drawText('Section 7: Support & Safeguarding Summary', {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 35;

    page.drawText('This section contains summary counts only. Detailed information is restricted.', {
      x: margin,
      y,
      size: 10,
      font: font,
      color: rgb(0.6, 0.4, 0.2),
    });
    y -= 30;

    let totalRaised = 0, totalResolved = 0, totalUnresolved = 0;

    for (const session of options.sessions) {
      const flags = data.supportFlags[session.id] || { raised: 0, resolved: 0, unresolved: 0 };
      totalRaised += flags.raised;
      totalResolved += flags.resolved;
      totalUnresolved += flags.unresolved;
    }

    page.drawText('Support Flags Summary:', {
      x: margin,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 25;

    page.drawText(`• Total flags raised today: ${totalRaised}`, {
      x: margin + 10,
      y,
      size: 11,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 18;

    page.drawText(`• Resolved: ${totalResolved}`, {
      x: margin + 10,
      y,
      size: 11,
      font: font,
      color: rgb(0.2, 0.5, 0.2),
    });
    y -= 18;

    page.drawText(`• Unresolved: ${totalUnresolved}`, {
      x: margin + 10,
      y,
      size: 11,
      font: font,
      color: totalUnresolved > 0 ? rgb(0.7, 0.3, 0.1) : rgb(0.3, 0.3, 0.3),
    });
    y -= 40;

    // Note about sensitive appendix
    page.drawRectangle({
      x: margin,
      y: y - 60,
      width: contentWidth,
      height: 70,
      color: rgb(0.95, 0.93, 0.88),
      borderColor: rgb(0.8, 0.7, 0.5),
      borderWidth: 1,
    });

    y -= 15;
    page.drawText('⚠ Sensitive Details', {
      x: margin + 15,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.6, 0.4, 0.1),
    });
    y -= 18;

    page.drawText('Detailed safeguarding information is not included in this report.', {
      x: margin + 15,
      y,
      size: 10,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 15;

    page.drawText('Admin users can export a separate encrypted "Sensitive Appendix" if required.', {
      x: margin + 15,
      y,
      size: 10,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  private async addSignOffPage(
    pdfDoc: PDFDocument,
    options: DailyPackOptions,
    font: PDFFont,
    fontBold: PDFFont,
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number
  ): Promise<void> {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    page.drawText('Section 8: Sign-off', {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 50;

    // Trainer name
    page.drawText('Trainer Name:', {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 5;
    page.drawLine({
      start: { x: margin + 100, y: y + 3 },
      end: { x: margin + 350, y: y + 3 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(options.trainerName || '', {
      x: margin + 105,
      y,
      size: 11,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 40;

    // Signature line
    page.drawText('Signature:', {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 5;
    page.drawLine({
      start: { x: margin + 100, y: y + 3 },
      end: { x: margin + 350, y: y + 3 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 40;

    // Date
    page.drawText('Date:', {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(new Date().toLocaleDateString('en-GB'), {
      x: margin + 100,
      y,
      size: 11,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 50;

    // Notes box
    page.drawText('Additional Notes:', {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 15;

    page.drawRectangle({
      x: margin,
      y: y - 100,
      width: contentWidth,
      height: 100,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });
    y -= 130;

    // Disclaimer
    page.drawRectangle({
      x: margin,
      y: y - 50,
      width: contentWidth,
      height: 50,
      color: rgb(0.95, 0.97, 0.95),
      borderColor: rgb(0.7, 0.8, 0.7),
      borderWidth: 1,
    });

    y -= 15;
    page.drawText('✓ Report generated locally, not uploaded.', {
      x: margin + 15,
      y,
      size: 10,
      font: font,
      color: rgb(0.3, 0.5, 0.3),
    });
    y -= 15;
    page.drawText('All data remains on this device / external storage only.', {
      x: margin + 15,
      y,
      size: 10,
      font: font,
      color: rgb(0.3, 0.5, 0.3),
    });
  }

  private addPageFooter(
    page: PDFPage,
    font: PDFFont,
    pageNum: number,
    totalPages: number,
    cohortName: string,
    pageWidth: number,
    margin: number
  ): void {
    const y = 30;
    const date = new Date().toLocaleDateString('en-GB');

    // Left: cohort and date
    page.drawText(`${cohortName} | ${date}`, {
      x: margin,
      y,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Center: copyright
    const copyright = '© RemoteAbility CIC | Registered Community Interest Company';
    const copyrightWidth = font.widthOfTextAtSize(copyright, 8);
    page.drawText(copyright, {
      x: (pageWidth - copyrightWidth) / 2,
      y,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Right: page number
    const pageText = `Page ${pageNum} of ${totalPages}`;
    const pageTextWidth = font.widthOfTextAtSize(pageText, 8);
    page.drawText(pageText, {
      x: pageWidth - margin - pageTextWidth,
      y,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  private wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);
      
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
}

export function setupDailyPackIpc(ipcMain: IpcMain, exportsPath: string): void {
  const generator = new DailyPackGenerator(exportsPath);

  ipcMain.handle('dailyPack:generate', async (_, options: DailyPackOptions, data: DailyPackData) => {
    try {
      const result = await generator.generateDailyPack(options, data);
      return { success: true, ...result };
    } catch (error) {
      console.error('Failed to generate daily pack:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('dailyPack:getExportsPath', () => {
    return path.join(exportsPath, 'reports');
  });
}
