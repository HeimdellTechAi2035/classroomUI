import { app, desktopCapturer, ipcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface RecordingSettings {
  recordScreen: boolean;
  recordTrainerAudio: boolean;
  recordSystemAudio: boolean;
  recordChat: boolean;
  recordAttendance: boolean;
  recordTimeline: boolean;
  recordTraineeAudio: boolean; // Default OFF
  recordTraineeVideo: boolean; // Default OFF
}

export interface RecordingMetadata {
  sessionId: string;
  cohortId: string;
  weekNumber: number;
  dayNumber: number;
  settings: RecordingSettings;
  createdAt: string;
  endedAt?: string;
  fileSizes: Record<string, number>;
  consentSummary: {
    acknowledged: number;
    notAcknowledged: number;
    total: number;
  };
  retentionExpiryDate: string;
  status: 'recording' | 'paused' | 'stopped' | 'completed';
  duration?: number;
  markers: TimelineMarker[];
}

export interface TimelineEvent {
  timestamp: string;
  type: 'session_start' | 'session_end' | 'break_start' | 'break_end' | 
        'resource_sent' | 'module_changed' | 'support_flag' | 
        'recording_paused' | 'recording_resumed' | 'marker_added' |
        'consent_acknowledged' | 'consent_declined' | 'attendance_snapshot';
  data?: any;
}

export interface TimelineMarker {
  id: string;
  timestamp: string;
  offsetMs: number;
  label: string;
  createdBy: string;
}

export interface ChatMessage {
  timestamp: string;
  senderId: string;
  senderName: string;
  senderType: 'trainer' | 'trainee';
  message: string;
}

export interface ConsentRecord {
  traineeId: string;
  traineeName: string;
  acknowledged: boolean;
  timestamp: string;
  ipAddress?: string;
}

const DEFAULT_SETTINGS: RecordingSettings = {
  recordScreen: true,
  recordTrainerAudio: true,
  recordSystemAudio: false,
  recordChat: true,
  recordAttendance: true,
  recordTimeline: true,
  recordTraineeAudio: false,
  recordTraineeVideo: false,
};

const DEFAULT_RETENTION_DAYS = 90;

export class RecordingManager {
  private currentRecording: {
    sessionId: string;
    metadata: RecordingMetadata;
    outputPath: string;
    chatLog: ChatMessage[];
    timelineEvents: TimelineEvent[];
    consentRecords: ConsentRecord[];
    startTime: number;
    pausedTime: number;
    isPaused: boolean;
  } | null = null;

  private exportsPath: string;

  constructor(basePath: string) {
    this.exportsPath = path.join(basePath, 'exports', 'recordings');
    this.ensureDirectoryExists(this.exportsPath);
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private generateSessionFolderName(weekNumber: number, sessionNumber: number): string {
    const date = new Date().toISOString().split('T')[0];
    return `${date}_week-${String(weekNumber).padStart(2, '0')}_session-${String(sessionNumber).padStart(3, '0')}`;
  }

  private calculateRetentionDate(days: number = DEFAULT_RETENTION_DAYS): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  async getSources(): Promise<Electron.DesktopCapturerSource[]> {
    return await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 150, height: 150 },
    });
  }

  async startRecording(
    sessionId: string,
    cohortId: string,
    weekNumber: number,
    dayNumber: number,
    sessionNumber: number,
    settings: Partial<RecordingSettings> = {},
    retentionDays: number = DEFAULT_RETENTION_DAYS
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      if (this.currentRecording) {
        return { success: false, error: 'Recording already in progress' };
      }

      const folderName = this.generateSessionFolderName(weekNumber, sessionNumber);
      const outputPath = path.join(this.exportsPath, folderName);
      this.ensureDirectoryExists(outputPath);

      const mergedSettings: RecordingSettings = { ...DEFAULT_SETTINGS, ...settings };
      const metadata: RecordingMetadata = {
        sessionId,
        cohortId,
        weekNumber,
        dayNumber,
        settings: mergedSettings,
        createdAt: new Date().toISOString(),
        fileSizes: {},
        consentSummary: { acknowledged: 0, notAcknowledged: 0, total: 0 },
        retentionExpiryDate: this.calculateRetentionDate(retentionDays),
        status: 'recording',
        markers: [],
      };

      this.currentRecording = {
        sessionId,
        metadata,
        outputPath,
        chatLog: [],
        timelineEvents: [],
        consentRecords: [],
        startTime: Date.now(),
        pausedTime: 0,
        isPaused: false,
      };

      // Log session start event
      this.addTimelineEvent({
        timestamp: new Date().toISOString(),
        type: 'session_start',
        data: { settings: mergedSettings },
      });

      // Save initial metadata
      await this.saveMetadata();

      return { success: true, outputPath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async pauseRecording(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentRecording) {
      return { success: false, error: 'No recording in progress' };
    }

    if (this.currentRecording.isPaused) {
      return { success: false, error: 'Recording already paused' };
    }

    this.currentRecording.isPaused = true;
    this.currentRecording.metadata.status = 'paused';
    
    this.addTimelineEvent({
      timestamp: new Date().toISOString(),
      type: 'recording_paused',
    });

    await this.saveMetadata();
    return { success: true };
  }

  async resumeRecording(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentRecording) {
      return { success: false, error: 'No recording in progress' };
    }

    if (!this.currentRecording.isPaused) {
      return { success: false, error: 'Recording is not paused' };
    }

    this.currentRecording.isPaused = false;
    this.currentRecording.metadata.status = 'recording';
    
    this.addTimelineEvent({
      timestamp: new Date().toISOString(),
      type: 'recording_resumed',
    });

    await this.saveMetadata();
    return { success: true };
  }

  async stopRecording(): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    if (!this.currentRecording) {
      return { success: false, error: 'No recording in progress' };
    }

    try {
      const outputPath = this.currentRecording.outputPath;
      const endTime = Date.now();
      const duration = endTime - this.currentRecording.startTime - this.currentRecording.pausedTime;

      this.currentRecording.metadata.endedAt = new Date().toISOString();
      this.currentRecording.metadata.status = 'completed';
      this.currentRecording.metadata.duration = duration;

      // Log session end event
      this.addTimelineEvent({
        timestamp: new Date().toISOString(),
        type: 'session_end',
        data: { duration },
      });

      // Save all audit files
      await this.saveAllAuditFiles();

      // Generate hashes
      await this.generateHashes();

      const result = { success: true, outputPath };
      this.currentRecording = null;
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  addTimelineEvent(event: TimelineEvent): void {
    if (this.currentRecording) {
      this.currentRecording.timelineEvents.push(event);
    }
  }

  addChatMessage(message: ChatMessage): void {
    if (this.currentRecording && this.currentRecording.metadata.settings.recordChat) {
      this.currentRecording.chatLog.push(message);
    }
  }

  addMarker(label: string, createdBy: string): TimelineMarker | null {
    if (!this.currentRecording) return null;

    const marker: TimelineMarker = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      offsetMs: Date.now() - this.currentRecording.startTime - this.currentRecording.pausedTime,
      label,
      createdBy,
    };

    this.currentRecording.metadata.markers.push(marker);
    
    this.addTimelineEvent({
      timestamp: marker.timestamp,
      type: 'marker_added',
      data: { markerId: marker.id, label },
    });

    return marker;
  }

  recordConsent(record: ConsentRecord): void {
    if (this.currentRecording) {
      this.currentRecording.consentRecords.push(record);
      
      // Update consent summary
      this.currentRecording.metadata.consentSummary.total++;
      if (record.acknowledged) {
        this.currentRecording.metadata.consentSummary.acknowledged++;
      } else {
        this.currentRecording.metadata.consentSummary.notAcknowledged++;
      }

      this.addTimelineEvent({
        timestamp: record.timestamp,
        type: record.acknowledged ? 'consent_acknowledged' : 'consent_declined',
        data: { traineeId: record.traineeId },
      });
    }
  }

  recordAttendanceSnapshot(type: 'start' | 'end', attendance: any): void {
    if (!this.currentRecording || !this.currentRecording.metadata.settings.recordAttendance) return;

    const filename = `attendance_${type}.json`;
    const filePath = path.join(this.currentRecording.outputPath, filename);
    
    fs.writeFileSync(filePath, JSON.stringify({
      timestamp: new Date().toISOString(),
      type,
      attendance,
    }, null, 2));

    this.addTimelineEvent({
      timestamp: new Date().toISOString(),
      type: 'attendance_snapshot',
      data: { snapshotType: type },
    });
  }

  private async saveMetadata(): Promise<void> {
    if (!this.currentRecording) return;

    const metadataPath = path.join(this.currentRecording.outputPath, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(this.currentRecording.metadata, null, 2));
  }

  private async saveAllAuditFiles(): Promise<void> {
    if (!this.currentRecording) return;

    const { outputPath, metadata, chatLog, timelineEvents, consentRecords } = this.currentRecording;

    // Save chat transcript as JSONL
    if (metadata.settings.recordChat && chatLog.length > 0) {
      const chatPath = path.join(outputPath, 'transcript_chat.jsonl');
      const chatContent = chatLog.map(msg => JSON.stringify(msg)).join('\n');
      fs.writeFileSync(chatPath, chatContent);
      metadata.fileSizes['transcript_chat.jsonl'] = Buffer.byteLength(chatContent);
    }

    // Save timeline events as JSONL
    if (metadata.settings.recordTimeline && timelineEvents.length > 0) {
      const timelinePath = path.join(outputPath, 'timeline_events.jsonl');
      const timelineContent = timelineEvents.map(evt => JSON.stringify(evt)).join('\n');
      fs.writeFileSync(timelinePath, timelineContent);
      metadata.fileSizes['timeline_events.jsonl'] = Buffer.byteLength(timelineContent);
    }

    // Save consent records
    if (consentRecords.length > 0) {
      const consentPath = path.join(outputPath, 'consent_records.json');
      const consentContent = JSON.stringify(consentRecords, null, 2);
      fs.writeFileSync(consentPath, consentContent);
      metadata.fileSizes['consent_records.json'] = Buffer.byteLength(consentContent);
    }

    // Save final metadata
    const metadataContent = JSON.stringify(metadata, null, 2);
    const metadataPath = path.join(outputPath, 'metadata.json');
    fs.writeFileSync(metadataPath, metadataContent);
    metadata.fileSizes['metadata.json'] = Buffer.byteLength(metadataContent);
  }

  private async generateHashes(): Promise<void> {
    if (!this.currentRecording) return;

    const { outputPath } = this.currentRecording;
    const hashesPath = path.join(outputPath, 'hashes.sha256');
    const hashes: string[] = [];

    const files = fs.readdirSync(outputPath);
    for (const file of files) {
      if (file === 'hashes.sha256') continue;
      
      const filePath = path.join(outputPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        hashes.push(`${hash}  ${file}`);
      }
    }

    fs.writeFileSync(hashesPath, hashes.join('\n'));
  }

  async verifyIntegrity(sessionFolder: string): Promise<{ valid: boolean; details: Record<string, boolean> }> {
    const folderPath = path.join(this.exportsPath, sessionFolder);
    const hashesPath = path.join(folderPath, 'hashes.sha256');

    if (!fs.existsSync(hashesPath)) {
      return { valid: false, details: { 'hashes.sha256': false } };
    }

    const hashContent = fs.readFileSync(hashesPath, 'utf-8');
    const lines = hashContent.split('\n').filter(l => l.trim());
    const details: Record<string, boolean> = {};
    let allValid = true;

    for (const line of lines) {
      const [expectedHash, filename] = line.split('  ');
      const filePath = path.join(folderPath, filename);

      if (!fs.existsSync(filePath)) {
        details[filename] = false;
        allValid = false;
        continue;
      }

      const fileBuffer = fs.readFileSync(filePath);
      const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const isValid = actualHash === expectedHash;
      details[filename] = isValid;
      if (!isValid) allValid = false;
    }

    return { valid: allValid, details };
  }

  async listRecordings(): Promise<RecordingMetadata[]> {
    const recordings: RecordingMetadata[] = [];

    if (!fs.existsSync(this.exportsPath)) {
      return recordings;
    }

    const folders = fs.readdirSync(this.exportsPath);
    for (const folder of folders) {
      const metadataPath = path.join(this.exportsPath, folder, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          recordings.push({ ...metadata, _folderName: folder });
        } catch {
          // Skip invalid metadata files
        }
      }
    }

    return recordings.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getRecordingDetails(sessionFolder: string): Promise<{
    metadata: RecordingMetadata;
    chatLog: ChatMessage[];
    timelineEvents: TimelineEvent[];
    consentRecords: ConsentRecord[];
    integrity: { valid: boolean; details: Record<string, boolean> };
  } | null> {
    const folderPath = path.join(this.exportsPath, sessionFolder);
    
    if (!fs.existsSync(folderPath)) {
      return null;
    }

    const metadataPath = path.join(folderPath, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    // Load chat log
    let chatLog: ChatMessage[] = [];
    const chatPath = path.join(folderPath, 'transcript_chat.jsonl');
    if (fs.existsSync(chatPath)) {
      const chatContent = fs.readFileSync(chatPath, 'utf-8');
      chatLog = chatContent.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    }

    // Load timeline events
    let timelineEvents: TimelineEvent[] = [];
    const timelinePath = path.join(folderPath, 'timeline_events.jsonl');
    if (fs.existsSync(timelinePath)) {
      const timelineContent = fs.readFileSync(timelinePath, 'utf-8');
      timelineEvents = timelineContent.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    }

    // Load consent records
    let consentRecords: ConsentRecord[] = [];
    const consentPath = path.join(folderPath, 'consent_records.json');
    if (fs.existsSync(consentPath)) {
      consentRecords = JSON.parse(fs.readFileSync(consentPath, 'utf-8'));
    }

    // Verify integrity
    const integrity = await this.verifyIntegrity(sessionFolder);

    return { metadata, chatLog, timelineEvents, consentRecords, integrity };
  }

  async purgeExpiredRecordings(): Promise<{ purged: string[]; errors: string[] }> {
    const purged: string[] = [];
    const errors: string[] = [];
    const now = new Date();

    const recordings = await this.listRecordings();
    for (const recording of recordings) {
      const expiryDate = new Date(recording.retentionExpiryDate);
      if (expiryDate < now) {
        try {
          const folderPath = path.join(this.exportsPath, (recording as any)._folderName);
          fs.rmSync(folderPath, { recursive: true, force: true });
          purged.push((recording as any)._folderName);
        } catch (error) {
          errors.push(`Failed to purge ${(recording as any)._folderName}: ${error}`);
        }
      }
    }

    return { purged, errors };
  }

  async deleteRecording(sessionFolder: string): Promise<{ success: boolean; error?: string }> {
    try {
      const folderPath = path.join(this.exportsPath, sessionFolder);
      if (!fs.existsSync(folderPath)) {
        return { success: false, error: 'Recording not found' };
      }

      fs.rmSync(folderPath, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  getRecordingStatus(): { 
    isRecording: boolean; 
    isPaused: boolean; 
    sessionId?: string;
    duration?: number;
    outputPath?: string;
  } {
    if (!this.currentRecording) {
      return { isRecording: false, isPaused: false };
    }

    const duration = this.currentRecording.isPaused 
      ? this.currentRecording.pausedTime
      : Date.now() - this.currentRecording.startTime;

    return {
      isRecording: true,
      isPaused: this.currentRecording.isPaused,
      sessionId: this.currentRecording.sessionId,
      duration,
      outputPath: this.currentRecording.outputPath,
    };
  }

  // Save recording chunk from renderer (WebM video data)
  async saveRecordingChunk(chunk: Buffer): Promise<void> {
    if (!this.currentRecording || this.currentRecording.isPaused) return;

    const recordingPath = path.join(this.currentRecording.outputPath, 'recording.webm');
    fs.appendFileSync(recordingPath, chunk);
  }

  // Finalize recording file
  async finalizeRecordingFile(): Promise<void> {
    if (!this.currentRecording) return;

    const recordingPath = path.join(this.currentRecording.outputPath, 'recording.webm');
    if (fs.existsSync(recordingPath)) {
      const stat = fs.statSync(recordingPath);
      this.currentRecording.metadata.fileSizes['recording.webm'] = stat.size;
    }
  }
}

export function setupRecordingIpc(recordingManager: RecordingManager): void {
  ipcMain.handle('recording:getSources', async () => {
    return await recordingManager.getSources();
  });

  ipcMain.handle('recording:start', async (_, args) => {
    return await recordingManager.startRecording(
      args.sessionId,
      args.cohortId,
      args.weekNumber,
      args.dayNumber,
      args.sessionNumber,
      args.settings,
      args.retentionDays
    );
  });

  ipcMain.handle('recording:pause', async () => {
    return await recordingManager.pauseRecording();
  });

  ipcMain.handle('recording:resume', async () => {
    return await recordingManager.resumeRecording();
  });

  ipcMain.handle('recording:stop', async () => {
    await recordingManager.finalizeRecordingFile();
    return await recordingManager.stopRecording();
  });

  ipcMain.handle('recording:addMarker', async (_, label: string, createdBy: string) => {
    return recordingManager.addMarker(label, createdBy);
  });

  ipcMain.handle('recording:addChatMessage', async (_, message) => {
    recordingManager.addChatMessage(message);
  });

  ipcMain.handle('recording:addTimelineEvent', async (_, event) => {
    recordingManager.addTimelineEvent(event);
  });

  ipcMain.handle('recording:recordConsent', async (_, record) => {
    recordingManager.recordConsent(record);
  });

  ipcMain.handle('recording:recordAttendance', async (_, type, attendance) => {
    recordingManager.recordAttendanceSnapshot(type, attendance);
  });

  ipcMain.handle('recording:saveChunk', async (_, chunk: ArrayBuffer) => {
    await recordingManager.saveRecordingChunk(Buffer.from(chunk));
  });

  ipcMain.handle('recording:getStatus', async () => {
    return recordingManager.getRecordingStatus();
  });

  ipcMain.handle('recording:list', async () => {
    return await recordingManager.listRecordings();
  });

  ipcMain.handle('recording:getDetails', async (_, sessionFolder: string) => {
    return await recordingManager.getRecordingDetails(sessionFolder);
  });

  ipcMain.handle('recording:verifyIntegrity', async (_, sessionFolder: string) => {
    return await recordingManager.verifyIntegrity(sessionFolder);
  });

  ipcMain.handle('recording:purgeExpired', async () => {
    return await recordingManager.purgeExpiredRecordings();
  });

  ipcMain.handle('recording:delete', async (_, sessionFolder: string) => {
    return await recordingManager.deleteRecording(sessionFolder);
  });
}
