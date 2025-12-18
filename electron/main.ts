import { app, BrowserWindow, ipcMain, dialog, shell, desktopCapturer, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Database } from './database';
import { ConfigManager } from './config';
import { ContentManager } from './content';
import { ExportManager } from './export';
import { BackupManager } from './backup';
import { EncryptionManager } from './encryption';
import { setupIpcHandlers } from './ipc-handlers';
import { setupRecordingIpc } from './recording';
import { setupDailyPackIpc } from './daily-pack';

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Get the app base directory (portable mode support)
function getAppBasePath(): string {
  if (isDev) {
    return path.join(__dirname, '..');
  }
  // In production, use the directory where the executable is located
  // This enables portable mode from external drive
  return path.dirname(app.getPath('exe'));
}

// Global references
let mainWindow: BrowserWindow | null = null;
let database: Database | null = null;
let configManager: ConfigManager | null = null;
let contentManager: ContentManager | null = null;
let exportManager: ExportManager | null = null;
let backupManager: BackupManager | null = null;
let encryptionManager: EncryptionManager | null = null;

// Default paths for portable mode
const basePath = getAppBasePath();
const defaultPaths = {
  data: path.join(basePath, 'data'),
  content: path.join(basePath, 'content'),
  exports: path.join(basePath, 'exports'),
  backups: path.join(basePath, 'backups'),
  recordings: path.join(basePath, 'exports', 'recordings'),
};

// Ensure required directories exist
function ensureDirectories(paths: typeof defaultPaths): void {
  const dirsToCreate = [
    paths.data,
    path.join(paths.data, 'logs'),
    paths.content,
    path.join(paths.content, 'weeks'),
    path.join(paths.content, 'policies'),
    path.join(paths.content, 'resources'),
    paths.exports,
    path.join(paths.exports, 'registers'),
    path.join(paths.exports, 'session-packs'),
    path.join(paths.exports, 'reports'),
    path.join(paths.exports, 'recordings'),
    paths.backups,
  ];

  // Create week folders
  for (let i = 1; i <= 6; i++) {
    dirsToCreate.push(path.join(paths.content, 'weeks', `week-0${i}`));
    dirsToCreate.push(path.join(paths.content, 'weeks', `week-0${i}`, 'slides'));
    dirsToCreate.push(path.join(paths.content, 'weeks', `week-0${i}`, 'resources'));
  }

  for (const dir of dirsToCreate) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Create the main application window
function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1600, width - 100),
    height: Math.min(1000, height - 100),
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    show: false,
    titleBarStyle: 'default',
    backgroundColor: '#f8fafc',
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// Initialize the application
async function initializeApp(): Promise<void> {
  try {
    // Load or create config
    configManager = new ConfigManager(path.join(defaultPaths.data, 'config.json'));
    const config = configManager.load();

    // Get paths from config or use defaults
    const paths = {
      data: config.dataPath || defaultPaths.data,
      content: config.contentPath || defaultPaths.content,
      exports: config.exportsPath || defaultPaths.exports,
      backups: config.backupsPath || defaultPaths.backups,
    };

    // Ensure all directories exist
    ensureDirectories(paths);

    // Initialize encryption manager
    encryptionManager = new EncryptionManager(path.join(paths.data, 'encryption.key'));
    await encryptionManager.initialize();

    // Initialize database
    const dbPath = path.join(paths.data, 'classroom.sqlite');
    database = new Database(dbPath, encryptionManager);
    await database.initialize();

    // Initialize content manager
    contentManager = new ContentManager(paths.content);

    // Initialize export manager
    exportManager = new ExportManager(paths.exports, database);

    // Initialize backup manager
    backupManager = new BackupManager(paths.backups, paths.data, database);

    // Setup IPC handlers
    setupIpcHandlers(
      ipcMain,
      database,
      configManager,
      contentManager,
      exportManager,
      backupManager,
      encryptionManager,
      defaultPaths
    );

    // Setup recording IPC handlers
    const recordingsPath = paths.exports ? path.join(paths.exports, 'recordings') : defaultPaths.recordings;
    setupRecordingIpc(ipcMain, recordingsPath);

    // Setup daily pack IPC handlers
    setupDailyPackIpc(ipcMain, paths.exports || defaultPaths.exports);

    // Check if first run
    if (!config.initialized) {
      // Will show first-run wizard in renderer
      configManager.set('needsSetup', true);
    }

  } catch (error) {
    console.error('Failed to initialize app:', error);
    dialog.showErrorBox('Initialization Error', 
      `Failed to initialize the application: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// App event handlers
app.whenReady().then(async () => {
  await initializeApp();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Close database connection
    database?.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  database?.close();
});

// Handle screen capture for screen sharing
ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 },
    });
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon?.toDataURL() || null,
    }));
  } catch (error) {
    console.error('Failed to get sources:', error);
    return [];
  }
});

// Handle opening external URLs
ipcMain.handle('open-external', async (_, url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// Handle folder selection dialog
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Data Folder',
  });
  return result.canceled ? null : result.filePaths[0];
});

// Handle file selection dialog
ipcMain.handle('select-file', async (_, options: { filters?: { name: string; extensions: string[] }[] }) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: options.filters || [],
    title: 'Select File',
  });
  return result.canceled ? null : result.filePaths[0];
});

// Handle opening local folder
ipcMain.handle('open-folder', async (_, folderPath: string) => {
  if (fs.existsSync(folderPath)) {
    await shell.openPath(folderPath);
    return true;
  }
  return false;
});

// Get app info
ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
  isDev,
  basePath,
  paths: defaultPaths,
}));

// Export for testing
export { mainWindow, database, configManager };
