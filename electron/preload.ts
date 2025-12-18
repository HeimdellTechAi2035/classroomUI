import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
  
  // Database operations
  db: {
    // Users
    getUsers: () => ipcRenderer.invoke('db:users:get'),
    getUser: (id: string) => ipcRenderer.invoke('db:users:getOne', id),
    createUser: (data: unknown) => ipcRenderer.invoke('db:users:create', data),
    updateUser: (id: string, data: unknown) => ipcRenderer.invoke('db:users:update', id, data),
    deleteUser: (id: string) => ipcRenderer.invoke('db:users:delete', id),
    
    // Cohorts
    getCohorts: () => ipcRenderer.invoke('db:cohorts:get'),
    getCohort: (id: string) => ipcRenderer.invoke('db:cohorts:getOne', id),
    createCohort: (data: unknown) => ipcRenderer.invoke('db:cohorts:create', data),
    updateCohort: (id: string, data: unknown) => ipcRenderer.invoke('db:cohorts:update', id, data),
    deleteCohort: (id: string) => ipcRenderer.invoke('db:cohorts:delete', id),
    getCohortMembers: (cohortId: string) => ipcRenderer.invoke('db:cohorts:getMembers', cohortId),
    addCohortMember: (cohortId: string, traineeId: string) => ipcRenderer.invoke('db:cohorts:addMember', cohortId, traineeId),
    removeCohortMember: (cohortId: string, traineeId: string) => ipcRenderer.invoke('db:cohorts:removeMember', cohortId, traineeId),
    
    // Trainees
    getTrainees: () => ipcRenderer.invoke('db:trainees:get'),
    getTrainee: (id: string) => ipcRenderer.invoke('db:trainees:getOne', id),
    createTrainee: (data: unknown) => ipcRenderer.invoke('db:trainees:create', data),
    updateTrainee: (id: string, data: unknown) => ipcRenderer.invoke('db:trainees:update', id, data),
    deleteTrainee: (id: string) => ipcRenderer.invoke('db:trainees:delete', id),
    
    // Sessions
    getSessions: (cohortId?: string) => ipcRenderer.invoke('db:sessions:get', cohortId),
    getSession: (id: string) => ipcRenderer.invoke('db:sessions:getOne', id),
    createSession: (data: unknown) => ipcRenderer.invoke('db:sessions:create', data),
    updateSession: (id: string, data: unknown) => ipcRenderer.invoke('db:sessions:update', id, data),
    deleteSession: (id: string) => ipcRenderer.invoke('db:sessions:delete', id),
    
    // Attendance
    getAttendance: (sessionId: string) => ipcRenderer.invoke('db:attendance:get', sessionId),
    saveAttendance: (sessionId: string, records: unknown[]) => ipcRenderer.invoke('db:attendance:save', sessionId, records),
    getTraineeAttendance: (traineeId: string) => ipcRenderer.invoke('db:attendance:getByTrainee', traineeId),
    
    // Progress
    getProgress: (traineeId: string) => ipcRenderer.invoke('db:progress:get', traineeId),
    saveProgress: (traineeId: string, weekNumber: number, data: unknown) => ipcRenderer.invoke('db:progress:save', traineeId, weekNumber, data),
    getCohortProgress: (cohortId: string) => ipcRenderer.invoke('db:progress:getByCohort', cohortId),
    
    // Acknowledgements
    getAcknowledgements: (traineeId: string) => ipcRenderer.invoke('db:acknowledgements:get', traineeId),
    saveAcknowledgement: (traineeId: string, policyId: string) => ipcRenderer.invoke('db:acknowledgements:save', traineeId, policyId),
    
    // Resources
    getResources: (filters?: unknown) => ipcRenderer.invoke('db:resources:get', filters),
    getResource: (id: string) => ipcRenderer.invoke('db:resources:getOne', id),
    createResource: (data: unknown) => ipcRenderer.invoke('db:resources:create', data),
    updateResource: (id: string, data: unknown) => ipcRenderer.invoke('db:resources:update', id, data),
    deleteResource: (id: string) => ipcRenderer.invoke('db:resources:delete', id),
    searchResources: (query: string) => ipcRenderer.invoke('db:resources:search', query),
    
    // Safeguarding logs (encrypted)
    getSafeguardingLogs: () => ipcRenderer.invoke('db:safeguarding:get'),
    createSafeguardingLog: (data: unknown) => ipcRenderer.invoke('db:safeguarding:create', data),
    updateSafeguardingLog: (id: string, data: unknown) => ipcRenderer.invoke('db:safeguarding:update', id, data),
    
    // Support flags
    getSupportFlags: () => ipcRenderer.invoke('db:supportFlags:get'),
    createSupportFlag: (data: unknown) => ipcRenderer.invoke('db:supportFlags:create', data),
    updateSupportFlag: (id: string, data: unknown) => ipcRenderer.invoke('db:supportFlags:update', id, data),
    
    // Audit log
    getAuditLog: (filters?: unknown) => ipcRenderer.invoke('db:auditLog:get', filters),
    
    // Session templates
    getSessionTemplates: () => ipcRenderer.invoke('db:sessionTemplates:get'),
    getSessionTemplate: (id: string) => ipcRenderer.invoke('db:sessionTemplates:getOne', id),
    createSessionTemplate: (data: unknown) => ipcRenderer.invoke('db:sessionTemplates:create', data),
    updateSessionTemplate: (id: string, data: unknown) => ipcRenderer.invoke('db:sessionTemplates:update', id, data),
    deleteSessionTemplate: (id: string) => ipcRenderer.invoke('db:sessionTemplates:delete', id),
  },
  
  // Content management
  content: {
    getWeeks: () => ipcRenderer.invoke('content:weeks:get'),
    getWeek: (weekNumber: number) => ipcRenderer.invoke('content:weeks:getOne', weekNumber),
    getWeekSlides: (weekNumber: number) => ipcRenderer.invoke('content:weeks:getSlides', weekNumber),
    getWeekResources: (weekNumber: number) => ipcRenderer.invoke('content:weeks:getResources', weekNumber),
    readFile: (filePath: string) => ipcRenderer.invoke('content:readFile', filePath),
    getPolicies: () => ipcRenderer.invoke('content:policies:get'),
    getPolicy: (policyId: string) => ipcRenderer.invoke('content:policies:getOne', policyId),
    searchPolicies: (query: string) => ipcRenderer.invoke('content:policies:search', query),
    checkIntegrity: () => ipcRenderer.invoke('content:checkIntegrity'),
  },
  
  // Export operations
  export: {
    register: (sessionId: string, format: 'csv' | 'pdf') => ipcRenderer.invoke('export:register', sessionId, format),
    progress: (type: 'trainee' | 'cohort', id: string, format: 'csv' | 'pdf') => ipcRenderer.invoke('export:progress', type, id, format),
    sessionPack: (sessionId: string) => ipcRenderer.invoke('export:sessionPack', sessionId),
    diagnostics: () => ipcRenderer.invoke('export:diagnostics'),
    getExports: () => ipcRenderer.invoke('export:list'),
  },
  
  // Backup operations
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (backupPath: string) => ipcRenderer.invoke('backup:restore', backupPath),
    list: () => ipcRenderer.invoke('backup:list'),
    delete: (backupPath: string) => ipcRenderer.invoke('backup:delete', backupPath),
  },
  
  // Screen capture for screen sharing
  getSources: () => ipcRenderer.invoke('get-sources'),
  
  // Recording operations
  recording: {
    start: (settings: {
      sessionId: string;
      cohortId: string;
      weekNumber: number;
      dayNumber: number;
      captureScreen: boolean;
      captureTrainerMic: boolean;
      captureSystemAudio: boolean;
      captureChat: boolean;
    }) => ipcRenderer.invoke('recording:start', settings),
    pause: () => ipcRenderer.invoke('recording:pause'),
    resume: () => ipcRenderer.invoke('recording:resume'),
    stop: () => ipcRenderer.invoke('recording:stop'),
    addMarker: (label: string, createdBy: string) => ipcRenderer.invoke('recording:addMarker', label, createdBy),
    addChatMessage: (message: {
      timestamp: string;
      senderId: string;
      senderName: string;
      senderType: 'trainer' | 'trainee';
      message: string;
    }) => ipcRenderer.invoke('recording:addChatMessage', message),
    addTimelineEvent: (event: { type: string; data?: unknown }) => ipcRenderer.invoke('recording:addTimelineEvent', event),
    recordConsent: (consent: {
      traineeId: string;
      traineeName: string;
      acknowledged: boolean;
      timestamp: string;
    }) => ipcRenderer.invoke('recording:recordConsent', consent),
    recordAttendance: (type: 'start' | 'end', attendance: unknown[]) => ipcRenderer.invoke('recording:recordAttendance', type, attendance),
    saveChunk: (chunk: ArrayBuffer) => ipcRenderer.invoke('recording:saveChunk', chunk),
    verifyIntegrity: (folderName: string) => ipcRenderer.invoke('recording:verifyIntegrity', folderName),
    list: () => ipcRenderer.invoke('recording:list'),
    getDetails: (folderName: string) => ipcRenderer.invoke('recording:getDetails', folderName),
    purgeExpired: () => ipcRenderer.invoke('recording:purgeExpired'),
    delete: (folderName: string) => ipcRenderer.invoke('recording:delete', folderName),
    getRecordingsPath: () => ipcRenderer.invoke('recording:getPath'),
  },
  
  // Daily Pack export
  dailyPack: {
    generate: (options: any, data: any) => ipcRenderer.invoke('dailyPack:generate', options, data),
    getExportsPath: () => ipcRenderer.invoke('dailyPack:getExportsPath'),
  },
  
  // External operations
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: (options?: { filters?: { name: string; extensions: string[] }[] }) => 
    ipcRenderer.invoke('select-file', options || {}),
  openFolder: (path: string) => ipcRenderer.invoke('open-folder', path),
  
  // Clipboard
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),
  
  // AI (optional)
  ai: {
    isEnabled: () => ipcRenderer.invoke('ai:isEnabled'),
    setApiKey: (key: string) => ipcRenderer.invoke('ai:setApiKey', key),
    query: (prompt: string, context?: unknown) => ipcRenderer.invoke('ai:query', prompt, context),
  },
  
  // Events
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'session:updated',
      'attendance:updated',
      'backup:progress',
      'export:progress',
      'ai:response',
      'screen-share:started',
      'screen-share:stopped',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
});

// Type declarations for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getAppInfo: () => Promise<{
        version: string;
        isDev: boolean;
        basePath: string;
        paths: {
          data: string;
          content: string;
          exports: string;
          backups: string;
        };
      }>;
      getConfig: () => Promise<Record<string, unknown>>;
      setConfig: (key: string, value: unknown) => Promise<void>;
      db: {
        getUsers: () => Promise<unknown[]>;
        getUser: (id: string) => Promise<unknown>;
        createUser: (data: unknown) => Promise<unknown>;
        updateUser: (id: string, data: unknown) => Promise<unknown>;
        deleteUser: (id: string) => Promise<boolean>;
        getCohorts: () => Promise<unknown[]>;
        getCohort: (id: string) => Promise<unknown>;
        createCohort: (data: unknown) => Promise<unknown>;
        updateCohort: (id: string, data: unknown) => Promise<unknown>;
        deleteCohort: (id: string) => Promise<boolean>;
        getCohortMembers: (cohortId: string) => Promise<unknown[]>;
        addCohortMember: (cohortId: string, traineeId: string) => Promise<boolean>;
        removeCohortMember: (cohortId: string, traineeId: string) => Promise<boolean>;
        getTrainees: () => Promise<unknown[]>;
        getTrainee: (id: string) => Promise<unknown>;
        createTrainee: (data: unknown) => Promise<unknown>;
        updateTrainee: (id: string, data: unknown) => Promise<unknown>;
        deleteTrainee: (id: string) => Promise<boolean>;
        getSessions: (cohortId?: string) => Promise<unknown[]>;
        getSession: (id: string) => Promise<unknown>;
        createSession: (data: unknown) => Promise<unknown>;
        updateSession: (id: string, data: unknown) => Promise<unknown>;
        deleteSession: (id: string) => Promise<boolean>;
        getAttendance: (sessionId: string) => Promise<unknown[]>;
        saveAttendance: (sessionId: string, records: unknown[]) => Promise<boolean>;
        getTraineeAttendance: (traineeId: string) => Promise<unknown[]>;
        getProgress: (traineeId: string) => Promise<unknown[]>;
        saveProgress: (traineeId: string, weekNumber: number, data: unknown) => Promise<boolean>;
        getCohortProgress: (cohortId: string) => Promise<unknown[]>;
        getAcknowledgements: (traineeId: string) => Promise<unknown[]>;
        saveAcknowledgement: (traineeId: string, policyId: string) => Promise<boolean>;
        getResources: (filters?: unknown) => Promise<unknown[]>;
        getResource: (id: string) => Promise<unknown>;
        createResource: (data: unknown) => Promise<unknown>;
        updateResource: (id: string, data: unknown) => Promise<unknown>;
        deleteResource: (id: string) => Promise<boolean>;
        searchResources: (query: string) => Promise<unknown[]>;
        getSafeguardingLogs: () => Promise<unknown[]>;
        createSafeguardingLog: (data: unknown) => Promise<unknown>;
        updateSafeguardingLog: (id: string, data: unknown) => Promise<unknown>;
        getSupportFlags: () => Promise<unknown[]>;
        createSupportFlag: (data: unknown) => Promise<unknown>;
        updateSupportFlag: (id: string, data: unknown) => Promise<unknown>;
        getAuditLog: (filters?: unknown) => Promise<unknown[]>;
        getSessionTemplates: () => Promise<unknown[]>;
        getSessionTemplate: (id: string) => Promise<unknown>;
        createSessionTemplate: (data: unknown) => Promise<unknown>;
        updateSessionTemplate: (id: string, data: unknown) => Promise<unknown>;
        deleteSessionTemplate: (id: string) => Promise<boolean>;
      };
      content: {
        getWeeks: () => Promise<unknown[]>;
        getWeek: (weekNumber: number) => Promise<unknown>;
        getWeekSlides: (weekNumber: number) => Promise<string[]>;
        getWeekResources: (weekNumber: number) => Promise<unknown[]>;
        readFile: (filePath: string) => Promise<string>;
        getPolicies: () => Promise<unknown[]>;
        getPolicy: (policyId: string) => Promise<unknown>;
        searchPolicies: (query: string) => Promise<unknown[]>;
        checkIntegrity: () => Promise<unknown>;
      };
      export: {
        register: (sessionId: string, format: 'csv' | 'pdf') => Promise<string>;
        progress: (type: 'trainee' | 'cohort', id: string, format: 'csv' | 'pdf') => Promise<string>;
        sessionPack: (sessionId: string) => Promise<string>;
        diagnostics: () => Promise<string>;
        getExports: () => Promise<unknown[]>;
      };
      backup: {
        create: () => Promise<string>;
        restore: (backupPath: string) => Promise<boolean>;
        list: () => Promise<unknown[]>;
        delete: (backupPath: string) => Promise<boolean>;
      };
      getSources: () => Promise<{
        id: string;
        name: string;
        thumbnail: string;
        appIcon: string | null;
      }[]>;
      openExternal: (url: string) => Promise<boolean>;
      selectFolder: () => Promise<string | null>;
      selectFile: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
      openFolder: (path: string) => Promise<boolean>;
      copyToClipboard: (text: string) => Promise<void>;
      ai: {
        isEnabled: () => Promise<boolean>;
        setApiKey: (key: string) => Promise<void>;
        query: (prompt: string, context?: unknown) => Promise<string>;
      };
      on: (channel: string, callback: (...args: unknown[]) => void) => void;
      off: (channel: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
