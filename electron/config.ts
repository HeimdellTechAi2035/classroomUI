import * as fs from 'fs';
import * as path from 'path';

interface Config {
  initialized: boolean;
  needsSetup: boolean;
  portableMode: boolean;
  dataPath: string | null;
  contentPath: string | null;
  exportsPath: string | null;
  backupsPath: string | null;
  aiEnabled: boolean;
  aiApiKey: string | null;
  accessibility: {
    fontSize: 'normal' | 'large' | 'extra-large';
    highContrast: boolean;
    reduceMotion: boolean;
    captionsEnabled: boolean;
  };
  lastCohortId: string | null;
  lastSessionId: string | null;
}

const defaultConfig: Config = {
  initialized: false,
  needsSetup: true,
  portableMode: true,
  dataPath: null,
  contentPath: null,
  exportsPath: null,
  backupsPath: null,
  aiEnabled: false,
  aiApiKey: null,
  accessibility: {
    fontSize: 'normal',
    highContrast: false,
    reduceMotion: false,
    captionsEnabled: false,
  },
  lastCohortId: null,
  lastSessionId: null,
};

export class ConfigManager {
  private configPath: string;
  private config: Config;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.config = { ...defaultConfig };
  }

  load(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const loaded = JSON.parse(data);
        this.config = { ...defaultConfig, ...loaded };
      } else {
        // Create config file with defaults
        this.save();
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = { ...defaultConfig };
    }
    return this.config;
  }

  save(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  set<K extends keyof Config>(key: K, value: Config[K]): void {
    this.config[key] = value;
    this.save();
  }

  getAll(): Config {
    return { ...this.config };
  }

  setMultiple(updates: Partial<Config>): void {
    this.config = { ...this.config, ...updates };
    this.save();
  }

  reset(): void {
    this.config = { ...defaultConfig };
    this.save();
  }
}
