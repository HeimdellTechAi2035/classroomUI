import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Volume2,
  Bell,
  Shield,
  Database,
  Palette,
  Type,
  Monitor,
  Save,
  RefreshCw,
  CheckCircle,
  Eye,
  Keyboard,
  Video,
  Mic,
  Speaker,
  MessageSquare,
  Calendar,
  Trash2,
  FolderOpen,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

export default function Settings() {
  const {
    accessibility,
    updateAccessibility,
    config,
    updateConfig,
  } = useAppStore();

  const [saved, setSaved] = useState(false);
  const [zoomLink, setZoomLink] = useState(config.zoomLink || '');
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);

  // Recording settings
  const [recordingSettings, setRecordingSettings] = useState({
    captureScreen: true,
    captureTrainerMic: true,
    captureSystemAudio: false,
    captureChat: true,
    retentionDays: 90,
    storageLocation: 'exports/recordings',
  });
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ purged: number } | null>(null);

  const handleSave = () => {
    updateConfig({ zoomLink });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-calm-900">Settings</h1>
        <p className="text-calm-600 mt-1">Configure your classroom experience</p>
      </div>

      {/* Accessibility Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Eye className="text-primary-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-calm-800">Accessibility</h2>
            <p className="text-sm text-calm-500">Customize for your needs</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Font Size */}
          <div>
            <label className="label flex items-center gap-2">
              <Type size={18} />
              Text Size
            </label>
            <div className="flex gap-2 mt-2">
              {(['normal', 'large', 'larger'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => updateAccessibility({ fontSize: size })}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    accessibility.fontSize === size
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-calm-200 hover:border-calm-300'
                  }`}
                >
                  <span className={size === 'normal' ? 'text-base' : size === 'large' ? 'text-lg' : 'text-xl'}>
                    {size === 'normal' ? 'Default' : size === 'large' ? 'Large' : 'Larger'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette className="text-calm-500" size={20} />
              <div>
                <p className="font-medium text-calm-800">High Contrast Mode</p>
                <p className="text-sm text-calm-500">Increase contrast for better visibility</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accessibility.highContrast}
                onChange={(e) => updateAccessibility({ highContrast: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-calm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>

          {/* Reduce Motion */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="text-calm-500" size={20} />
              <div>
                <p className="font-medium text-calm-800">Reduce Motion</p>
                <p className="text-sm text-calm-500">Minimize animations and transitions</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accessibility.reduceMotion}
                onChange={(e) => updateAccessibility({ reduceMotion: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-calm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>

          {/* Dyslexia Font */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Type className="text-calm-500" size={20} />
              <div>
                <p className="font-medium text-calm-800">Dyslexia-Friendly Font</p>
                <p className="text-sm text-calm-500">Use OpenDyslexic font for easier reading</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accessibility.dyslexiaFont}
                onChange={(e) => updateAccessibility({ dyslexiaFont: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-calm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>

          {/* Screen Reader Hints */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Keyboard className="text-calm-500" size={20} />
              <div>
                <p className="font-medium text-calm-800">Enhanced Keyboard Navigation</p>
                <p className="text-sm text-calm-500">Better focus indicators and skip links</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accessibility.screenReaderHints}
                onChange={(e) => updateAccessibility({ screenReaderHints: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-calm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Session Settings */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-success-100 rounded-lg">
            <SettingsIcon className="text-success-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-calm-800">Session Settings</h2>
            <p className="text-sm text-calm-500">Configure session defaults</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Zoom Link */}
          <div>
            <label className="label">Default Zoom Link</label>
            <input
              type="url"
              value={zoomLink}
              onChange={(e) => setZoomLink(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="input-field"
            />
            <p className="text-sm text-calm-500 mt-1">Used as the default link for new sessions</p>
          </div>

          {/* Auto-save Interval */}
          <div>
            <label className="label">Auto-save Interval (seconds)</label>
            <select
              value={autoSaveInterval}
              onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
              className="input-field"
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-warning-100 rounded-lg">
            <Bell className="text-warning-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-calm-800">Notifications</h2>
            <p className="text-sm text-calm-500">Control alerts and sounds</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="text-calm-500" size={20} />
              <div>
                <p className="font-medium text-calm-800">Sound Effects</p>
                <p className="text-sm text-calm-500">Play sounds for notifications</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-calm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="text-calm-500" size={20} />
              <div>
                <p className="font-medium text-calm-800">Break Reminders</p>
                <p className="text-sm text-calm-500">Alert when break time is recommended</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-calm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* AI Helper Settings */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-calm-800">AI Helper</h2>
            <p className="text-sm text-calm-500">Configure AI assistance (optional)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-calm-800">Enable AI Helper</p>
              <p className="text-sm text-calm-500">Show AI assistance panel in sessions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.aiEnabled}
                onChange={(e) => updateConfig({ aiEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-calm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>

          {config.aiEnabled && (
            <div className="p-4 bg-calm-50 rounded-lg">
              <p className="text-sm text-calm-600 mb-3">
                The AI helper can assist with explaining concepts, providing examples, and answering questions.
                It runs locally and doesn't send data to external servers.
              </p>
              <div>
                <label className="label">AI Model Path (optional)</label>
                <input
                  type="text"
                  placeholder="/path/to/model.gguf"
                  className="input-field"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session Recording Settings */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-danger-100 rounded-lg">
            <Video className="text-danger-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-calm-800">Session Recording</h2>
            <p className="text-sm text-calm-500">Configure automatic session recording</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Recording Notice */}
          <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-warning-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning-800">Recording is mandatory</p>
                <p className="text-sm text-warning-700 mt-1">
                  All sessions are automatically recorded for safeguarding and audit purposes.
                  Trainees will see a consent screen and recording indicator during sessions.
                </p>
              </div>
            </div>
          </div>

          {/* Capture Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-calm-800">Default Capture Settings</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="text-calm-500" size={20} />
                <div>
                  <p className="font-medium text-calm-800">Screen Capture</p>
                  <p className="text-sm text-calm-500">Record shared screen/window</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordingSettings.captureScreen}
                  onChange={(e) => setRecordingSettings({ ...recordingSettings, captureScreen: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-calm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mic className="text-calm-500" size={20} />
                <div>
                  <p className="font-medium text-calm-800">Trainer Microphone</p>
                  <p className="text-sm text-calm-500">Record trainer's voice</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordingSettings.captureTrainerMic}
                  onChange={(e) => setRecordingSettings({ ...recordingSettings, captureTrainerMic: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-calm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Speaker className="text-calm-500" size={20} />
                <div>
                  <p className="font-medium text-calm-800">System Audio</p>
                  <p className="text-sm text-calm-500">Record system/meeting audio</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordingSettings.captureSystemAudio}
                  onChange={(e) => setRecordingSettings({ ...recordingSettings, captureSystemAudio: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-calm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="text-calm-500" size={20} />
                <div>
                  <p className="font-medium text-calm-800">Chat Transcript</p>
                  <p className="text-sm text-calm-500">Log all chat messages</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordingSettings.captureChat}
                  onChange={(e) => setRecordingSettings({ ...recordingSettings, captureChat: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-calm-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-calm-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
          </div>

          {/* Retention */}
          <div>
            <label className="label flex items-center gap-2">
              <Calendar size={18} />
              Retention Period
            </label>
            <select
              value={recordingSettings.retentionDays}
              onChange={(e) => setRecordingSettings({ ...recordingSettings, retentionDays: Number(e.target.value) })}
              className="input-field"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days (recommended)</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </select>
            <p className="text-sm text-calm-500 mt-1">
              Recordings older than this will be automatically deleted
            </p>
          </div>

          {/* Storage Location */}
          <div>
            <label className="label flex items-center gap-2">
              <FolderOpen size={18} />
              Storage Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={recordingSettings.storageLocation}
                onChange={(e) => setRecordingSettings({ ...recordingSettings, storageLocation: e.target.value })}
                className="input-field flex-1"
                placeholder="exports/recordings"
              />
              <button
                className="btn btn-secondary"
                onClick={() => {
                  // Would trigger folder picker in real Electron app
                  console.log('Open folder picker');
                }}
              >
                Browse
              </button>
            </div>
            <p className="text-sm text-calm-500 mt-1">
              Relative to application folder or absolute path (e.g., external drive)
            </p>
          </div>

          {/* Purge Button */}
          <div className="pt-4 border-t border-calm-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-calm-800">Purge Expired Recordings</p>
                <p className="text-sm text-calm-500">Remove recordings past retention date</p>
              </div>
              <button
                onClick={async () => {
                  setIsPurging(true);
                  setPurgeResult(null);
                  try {
                    if (window.electronAPI?.recording) {
                      const result = await window.electronAPI.recording.purgeExpired();
                      setPurgeResult({ purged: result.purged.length });
                    } else {
                      // Demo mode
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      setPurgeResult({ purged: 0 });
                    }
                  } catch (error) {
                    console.error('Purge failed:', error);
                  } finally {
                    setIsPurging(false);
                  }
                }}
                disabled={isPurging}
                className="btn btn-secondary text-danger-600 hover:bg-danger-50 border-danger-300"
              >
                {isPurging ? (
                  <>
                    <RefreshCw size={16} className="mr-2 animate-spin" />
                    Purging...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Purge Now
                  </>
                )}
              </button>
            </div>
            {purgeResult && (
              <p className="text-sm text-success-600 mt-2">
                ✓ {purgeResult.purged} expired recording(s) removed
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-danger-100 rounded-lg">
            <Shield className="text-danger-600" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-calm-800">Data & Privacy</h2>
            <p className="text-sm text-calm-500">Storage and security settings</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-calm-50 rounded-lg">
            <div className="flex items-center gap-2 text-calm-700 mb-2">
              <Database size={18} />
              <span className="font-medium">Storage Mode: Portable</span>
            </div>
            <p className="text-sm text-calm-600">
              All data is stored locally on this device. No data is sent to external servers.
            </p>
          </div>

          <div className="p-4 bg-success-50 rounded-lg border border-success-200">
            <div className="flex items-center gap-2 text-success-700 mb-2">
              <CheckCircle size={18} />
              <span className="font-medium">Encryption Active</span>
            </div>
            <p className="text-sm text-success-600">
              Sensitive data (safeguarding logs, trainee notes) is encrypted using AES-256.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <button className="btn btn-secondary">
          <RefreshCw size={18} className="mr-2" />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          className="btn btn-primary"
        >
          {saved ? (
            <>
              <CheckCircle size={18} className="mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
