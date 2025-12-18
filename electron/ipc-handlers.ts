import { IpcMain, clipboard } from 'electron';
import { Database } from './database';
import { ConfigManager } from './config';
import { ContentManager } from './content';
import { ExportManager } from './export';
import { BackupManager } from './backup';
import { EncryptionManager } from './encryption';

export function setupIpcHandlers(
  ipcMain: IpcMain,
  database: Database,
  configManager: ConfigManager,
  contentManager: ContentManager,
  exportManager: ExportManager,
  backupManager: BackupManager,
  encryptionManager: EncryptionManager,
  defaultPaths: { data: string; content: string; exports: string; backups: string }
): void {

  // Config handlers
  ipcMain.handle('config:get', () => configManager.getAll());
  ipcMain.handle('config:set', (_, key: string, value: unknown) => {
    configManager.set(key as keyof ReturnType<typeof configManager.getAll>, value as never);
  });

  // User handlers
  ipcMain.handle('db:users:get', () => database.getUsers());
  ipcMain.handle('db:users:getOne', (_, id: string) => database.getUser(id));
  ipcMain.handle('db:users:create', (_, data) => database.createUser(data));
  ipcMain.handle('db:users:update', (_, id: string, data) => database.updateUser(id, data));
  ipcMain.handle('db:users:delete', (_, id: string) => database.deleteUser(id));

  // Cohort handlers
  ipcMain.handle('db:cohorts:get', () => database.getCohorts());
  ipcMain.handle('db:cohorts:getOne', (_, id: string) => database.getCohort(id));
  ipcMain.handle('db:cohorts:create', (_, data) => database.createCohort(data));
  ipcMain.handle('db:cohorts:update', (_, id: string, data) => database.updateCohort(id, data));
  ipcMain.handle('db:cohorts:delete', (_, id: string) => database.deleteCohort(id));
  ipcMain.handle('db:cohorts:getMembers', (_, cohortId: string) => database.getCohortMembers(cohortId));
  ipcMain.handle('db:cohorts:addMember', (_, cohortId: string, traineeId: string) => database.addCohortMember(cohortId, traineeId));
  ipcMain.handle('db:cohorts:removeMember', (_, cohortId: string, traineeId: string) => database.removeCohortMember(cohortId, traineeId));

  // Trainee handlers
  ipcMain.handle('db:trainees:get', () => database.getTrainees());
  ipcMain.handle('db:trainees:getOne', (_, id: string) => database.getTrainee(id));
  ipcMain.handle('db:trainees:create', (_, data) => database.createTrainee(data));
  ipcMain.handle('db:trainees:update', (_, id: string, data) => database.updateTrainee(id, data));
  ipcMain.handle('db:trainees:delete', (_, id: string) => database.deleteTrainee(id));

  // Session handlers
  ipcMain.handle('db:sessions:get', (_, cohortId?: string) => database.getSessions(cohortId));
  ipcMain.handle('db:sessions:getOne', (_, id: string) => database.getSession(id));
  ipcMain.handle('db:sessions:create', (_, data) => database.createSession(data));
  ipcMain.handle('db:sessions:update', (_, id: string, data) => database.updateSession(id, data));
  ipcMain.handle('db:sessions:delete', (_, id: string) => database.deleteSession(id));

  // Attendance handlers
  ipcMain.handle('db:attendance:get', (_, sessionId: string) => database.getAttendance(sessionId));
  ipcMain.handle('db:attendance:save', (_, sessionId: string, records) => database.saveAttendance(sessionId, records));
  ipcMain.handle('db:attendance:getByTrainee', (_, traineeId: string) => database.getTraineeAttendance(traineeId));

  // Progress handlers
  ipcMain.handle('db:progress:get', (_, traineeId: string) => database.getProgress(traineeId));
  ipcMain.handle('db:progress:save', (_, traineeId: string, weekNumber: number, data) => database.saveProgress(traineeId, weekNumber, data));
  ipcMain.handle('db:progress:getByCohort', (_, cohortId: string) => database.getCohortProgress(cohortId));

  // Acknowledgements handlers
  ipcMain.handle('db:acknowledgements:get', (_, traineeId: string) => database.getAcknowledgements(traineeId));
  ipcMain.handle('db:acknowledgements:save', (_, traineeId: string, policyId: string) => database.saveAcknowledgement(traineeId, policyId));

  // Resources handlers
  ipcMain.handle('db:resources:get', (_, filters) => database.getResources(filters));
  ipcMain.handle('db:resources:getOne', (_, id: string) => database.getResource(id));
  ipcMain.handle('db:resources:create', (_, data) => database.createResource(data));
  ipcMain.handle('db:resources:search', (_, query: string) => database.searchResources(query));

  // Safeguarding handlers
  ipcMain.handle('db:safeguarding:get', () => database.getSafeguardingLogs());
  ipcMain.handle('db:safeguarding:create', (_, data) => database.createSafeguardingLog(data));

  // Support flags handlers
  ipcMain.handle('db:supportFlags:get', () => database.getSupportFlags());
  ipcMain.handle('db:supportFlags:create', (_, data) => database.createSupportFlag(data));
  ipcMain.handle('db:supportFlags:update', (_, id: string, data) => database.updateSupportFlag(id, data));

  // Audit log handlers
  ipcMain.handle('db:auditLog:get', (_, filters) => database.getAuditLog(filters));

  // Session templates handlers
  ipcMain.handle('db:sessionTemplates:get', () => database.getSessionTemplates());
  ipcMain.handle('db:sessionTemplates:getOne', (_, id: string) => database.getSessionTemplate(id));
  ipcMain.handle('db:sessionTemplates:create', (_, data) => database.createSessionTemplate(data));

  // Content handlers
  ipcMain.handle('content:weeks:get', () => contentManager.getWeeks());
  ipcMain.handle('content:weeks:getOne', (_, weekNumber: number) => contentManager.getWeek(weekNumber));
  ipcMain.handle('content:weeks:getSlides', (_, weekNumber: number) => contentManager.getWeekSlides(weekNumber));
  ipcMain.handle('content:weeks:getResources', (_, weekNumber: number) => contentManager.getWeekResources(weekNumber));
  ipcMain.handle('content:readFile', (_, filePath: string) => contentManager.readFile(filePath));
  ipcMain.handle('content:policies:get', () => contentManager.getPolicies());
  ipcMain.handle('content:policies:getOne', (_, policyId: string) => contentManager.getPolicy(policyId));
  ipcMain.handle('content:policies:search', (_, query: string) => contentManager.searchPolicies(query));
  ipcMain.handle('content:checkIntegrity', () => contentManager.checkIntegrity());

  // Export handlers
  ipcMain.handle('export:register', async (_, sessionId: string, format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      return exportManager.exportRegisterCSV(sessionId);
    } else {
      return exportManager.exportRegisterPDF(sessionId);
    }
  });
  ipcMain.handle('export:progress', async (_, type: 'trainee' | 'cohort', id: string, format: 'csv' | 'pdf') => {
    return exportManager.exportProgress(type, id, format);
  });
  ipcMain.handle('export:sessionPack', async (_, sessionId: string) => {
    return exportManager.exportSessionPack(sessionId);
  });
  ipcMain.handle('export:diagnostics', async () => {
    return exportManager.exportDiagnostics();
  });
  ipcMain.handle('export:list', () => exportManager.getExports());

  // Backup handlers
  ipcMain.handle('backup:create', async () => backupManager.create());
  ipcMain.handle('backup:restore', async (_, backupPath: string) => backupManager.restore(backupPath));
  ipcMain.handle('backup:list', () => backupManager.list());
  ipcMain.handle('backup:delete', (_, backupPath: string) => backupManager.delete(backupPath));

  // Clipboard handler
  ipcMain.handle('clipboard:write', (_, text: string) => {
    clipboard.writeText(text);
  });

  // AI handlers (placeholder - implement based on chosen AI provider)
  ipcMain.handle('ai:isEnabled', () => {
    const config = configManager.getAll();
    return config.aiEnabled && !!config.aiApiKey;
  });

  ipcMain.handle('ai:setApiKey', (_, key: string) => {
    // In production, encrypt the key before storing
    configManager.set('aiApiKey', encryptionManager.encrypt(key));
    configManager.set('aiEnabled', true);
  });

  ipcMain.handle('ai:query', async (_, prompt: string, context?: unknown) => {
    const config = configManager.getAll();
    
    if (!config.aiEnabled || !config.aiApiKey) {
      return 'AI is not enabled. Please configure an API key in settings.';
    }

    // Placeholder for AI query implementation
    // In production, implement actual API call to OpenAI/Anthropic/etc.
    return `AI response placeholder for: ${prompt}`;
  });
}
