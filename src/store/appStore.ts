import { create } from 'zustand';

interface Accessibility {
  fontSize: 'normal' | 'large' | 'extra-large';
  highContrast: boolean;
  reduceMotion: boolean;
  captionsEnabled: boolean;
}

interface Config {
  initialized: boolean;
  needsSetup: boolean;
  portableMode: boolean;
  dataPath: string | null;
  contentPath: string | null;
  exportsPath: string | null;
  backupsPath: string | null;
  aiEnabled: boolean;
  lastCohortId: string | null;
  lastSessionId: string | null;
  accessibility: Accessibility;
}

interface AppState {
  // App state
  config: Config | null;
  isLoading: boolean;
  isOffline: boolean;
  currentUserId: string | null;
  currentUserRole: 'admin' | 'trainer' | 'trainee' | null;
  
  // Accessibility (separate for quick access)
  accessibility: Accessibility;
  
  // Session state
  currentSessionId: string | null;
  sessionStatus: 'draft' | 'live' | 'ended' | null;
  
  // Screen share state
  isScreenSharing: boolean;
  screenShareSourceId: string | null;
  
  // AI state
  aiEnabled: boolean;
  
  // Actions
  loadConfig: () => Promise<void>;
  setConfig: (key: string, value: unknown) => Promise<void>;
  setAccessibility: (settings: Partial<Accessibility>) => void;
  setCurrentUser: (userId: string | null, role: 'admin' | 'trainer' | 'trainee' | null) => void;
  setCurrentSession: (sessionId: string | null, status: 'draft' | 'live' | 'ended' | null) => void;
  setScreenShare: (isSharing: boolean, sourceId: string | null) => void;
  setOffline: (offline: boolean) => void;
  completeSetup: () => Promise<void>;
}

const defaultAccessibility: Accessibility = {
  fontSize: 'normal',
  highContrast: false,
  reduceMotion: false,
  captionsEnabled: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  config: null,
  isLoading: true,
  isOffline: !navigator.onLine,
  currentUserId: null,
  currentUserRole: null,
  accessibility: defaultAccessibility,
  currentSessionId: null,
  sessionStatus: null,
  isScreenSharing: false,
  screenShareSourceId: null,
  aiEnabled: false,

  // Load config from Electron
  loadConfig: async () => {
    try {
      set({ isLoading: true });
      
      if (window.electronAPI) {
        const config = await window.electronAPI.getConfig() as Config;
        set({ 
          config,
          accessibility: config.accessibility || defaultAccessibility,
          aiEnabled: config.aiEnabled || false,
          isLoading: false,
        });
      } else {
        // Running in browser (development without Electron)
        set({ 
          config: {
            initialized: true,
            needsSetup: false,
            portableMode: true,
            dataPath: null,
            contentPath: null,
            exportsPath: null,
            backupsPath: null,
            aiEnabled: false,
            lastCohortId: null,
            lastSessionId: null,
            accessibility: defaultAccessibility,
          },
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      set({ isLoading: false });
    }
  },

  // Update config
  setConfig: async (key: string, value: unknown) => {
    if (window.electronAPI) {
      await window.electronAPI.setConfig(key, value);
      const config = await window.electronAPI.getConfig() as Config;
      set({ config });
    }
  },

  // Update accessibility settings
  setAccessibility: (settings: Partial<Accessibility>) => {
    const current = get().accessibility;
    const newSettings = { ...current, ...settings };
    set({ accessibility: newSettings });
    
    // Persist to config
    if (window.electronAPI) {
      window.electronAPI.setConfig('accessibility', newSettings);
    }
  },

  // Set current user
  setCurrentUser: (userId, role) => {
    set({ currentUserId: userId, currentUserRole: role });
  },

  // Set current session
  setCurrentSession: (sessionId, status) => {
    set({ currentSessionId: sessionId, sessionStatus: status });
  },

  // Set screen share state
  setScreenShare: (isSharing, sourceId) => {
    set({ isScreenSharing: isSharing, screenShareSourceId: sourceId });
  },

  // Set offline state
  setOffline: (offline) => {
    set({ isOffline: offline });
  },

  // Complete first-run setup
  completeSetup: async () => {
    if (window.electronAPI) {
      await window.electronAPI.setConfig('initialized', true);
      await window.electronAPI.setConfig('needsSetup', false);
      const config = await window.electronAPI.getConfig() as Config;
      set({ config });
    }
  },
}));

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().setOffline(false);
  });
  window.addEventListener('offline', () => {
    useAppStore.getState().setOffline(true);
  });
}
