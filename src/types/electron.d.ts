// Type definitions for window.electronAPI

interface RecordingSettings {
  recordScreen: boolean;
  recordTrainerAudio: boolean;
  recordSystemAudio: boolean;
  recordChat: boolean;
  recordAttendance: boolean;
  recordTimeline: boolean;
  recordTraineeAudio: boolean;
  recordTraineeVideo: boolean;
}

interface RecordingMetadata {
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
  _folderName?: string;
}

interface TimelineEvent {
  timestamp: string;
  type: string;
  data?: any;
}

interface TimelineMarker {
  id: string;
  timestamp: string;
  offsetMs: number;
  label: string;
  createdBy: string;
}

interface ChatMessage {
  timestamp: string;
  senderId: string;
  senderName: string;
  senderType: 'trainer' | 'trainee';
  message: string;
}

interface ConsentRecord {
  traineeId: string;
  traineeName: string;
  acknowledged: boolean;
  timestamp: string;
  ipAddress?: string;
}

interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnail: string;
}

interface ElectronAPI {
  getConfig: () => Promise<any>;
  setConfig: (key: string, value: any) => Promise<void>;
  selectFolder: () => Promise<string | null>;
  db: {
    query: (table: string, sql: string, params?: any[]) => Promise<any[]>;
    get: (table: string, sql: string, params?: any[]) => Promise<any>;
    run: (table: string, sql: string, params?: any[]) => Promise<any>;
  };
  content: {
    getWeeks: () => Promise<any[]>;
    getWeekContent: (weekNumber: number) => Promise<any>;
    getPolicies: () => Promise<any[]>;
    getResources: () => Promise<any[]>;
    openResource: (path: string) => Promise<void>;
    checkIntegrity: () => Promise<{ valid: boolean; issues: string[] }>;
  };
  export: {
    register: (format: 'csv' | 'pdf', sessionId?: string) => Promise<string>;
    progress: (traineeIds?: string[]) => Promise<string>;
    sessionPack: (weekNumber?: number) => Promise<string>;
  };
  backup: {
    create: () => Promise<string>;
    restore: (backupPath?: string) => Promise<void>;
    list: () => Promise<{ path: string; date: string; size: number }[]>;
  };
  ai: {
    enabled: () => Promise<boolean>;
    query: (prompt: string) => Promise<string>;
    streamQuery: (prompt: string) => AsyncIterable<string>;
  };
  app: {
    getBasePath: () => Promise<string>;
    getVersion: () => Promise<string>;
    isPortable: () => Promise<boolean>;
    onUpdate: (callback: (event: any, data: any) => void) => void;
  };
  recording: {
    getSources: () => Promise<DesktopCapturerSource[]>;
    start: (args: {
      sessionId: string;
      cohortId: string;
      weekNumber: number;
      dayNumber: number;
      sessionNumber: number;
      settings?: Partial<RecordingSettings>;
      retentionDays?: number;
    }) => Promise<{ success: boolean; outputPath?: string; error?: string }>;
    pause: () => Promise<{ success: boolean; error?: string }>;
    resume: () => Promise<{ success: boolean; error?: string }>;
    stop: () => Promise<{ success: boolean; outputPath?: string; error?: string }>;
    addMarker: (label: string, createdBy: string) => Promise<TimelineMarker | null>;
    addChatMessage: (message: ChatMessage) => Promise<void>;
    addTimelineEvent: (event: TimelineEvent) => Promise<void>;
    recordConsent: (record: ConsentRecord) => Promise<void>;
    recordAttendance: (type: 'start' | 'end', attendance: any) => Promise<void>;
    saveChunk: (chunk: ArrayBuffer) => Promise<void>;
    getStatus: () => Promise<{
      isRecording: boolean;
      isPaused: boolean;
      sessionId?: string;
      duration?: number;
      outputPath?: string;
    }>;
    list: () => Promise<RecordingMetadata[]>;
    getDetails: (sessionFolder: string) => Promise<{
      metadata: RecordingMetadata;
      chatLog: ChatMessage[];
      timelineEvents: TimelineEvent[];
      consentRecords: ConsentRecord[];
      integrity: { valid: boolean; details: Record<string, boolean> };
    } | null>;
    verifyIntegrity: (sessionFolder: string) => Promise<{ valid: boolean; details: Record<string, boolean> }>;
    purgeExpired: () => Promise<{ purged: string[]; errors: string[] }>;
    delete: (sessionFolder: string) => Promise<{ success: boolean; error?: string }>;
  };
  dailyPack: {
    generate: (options: DailyPackOptions, data: DailyPackData) => Promise<{
      success: boolean;
      pdfPath?: string;
      folderPath?: string;
      error?: string;
    }>;
    getExportsPath: () => Promise<string>;
  };
  openFolder: (folderPath: string) => Promise<boolean>;
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

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
