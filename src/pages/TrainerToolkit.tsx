import { useState, useEffect } from 'react';
import {
  Wrench,
  Download,
  Upload,
  FileText,
  Users,
  Calendar,
  Shield,
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Copy,
  Play,
  Clock,
  ChevronRight,
  Package,
  Settings,
} from 'lucide-react';
import DailyPackExportModal from '../components/DailyPackExportModal';

interface SessionTemplate {
  id: string;
  name: string;
  weekNumber: number;
  sessionNumber: number;
  defaultDuration: number;
  agenda: string[];
}

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
  action: () => void;
}

export default function TrainerToolkit() {
  const [activeSection, setActiveSection] = useState<'session-setup' | 'exports' | 'data'>('session-setup');
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [showDailyPackModal, setShowDailyPackModal] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.db.query(
          'session_templates',
          'SELECT * FROM session_templates ORDER BY week_number, session_number'
        ) as SessionTemplate[];
        setTemplates(data);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    } else {
      // Demo templates
      setTemplates([
        { id: '1', name: 'Week 1 - Session 1: Induction', weekNumber: 1, sessionNumber: 1, defaultDuration: 120, agenda: ['Welcome & introductions', 'Programme overview', 'Initial assessments', 'Q&A'] },
        { id: '2', name: 'Week 1 - Session 2: Getting Started', weekNumber: 1, sessionNumber: 2, defaultDuration: 120, agenda: ['Review homework', 'Tool setup', 'First activity', 'Wrap up'] },
        { id: '3', name: 'Week 2 - Session 1: Sales Basics', weekNumber: 2, sessionNumber: 1, defaultDuration: 120, agenda: ['Sales fundamentals', 'Communication skills', 'Role play exercise', 'Feedback'] },
      ]);
    }
  };

  const exportRegister = async (format: 'csv' | 'pdf') => {
    setLoading(true);
    setExportStatus(null);
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.export.register(format);
        setExportStatus(`Register exported successfully as ${format.toUpperCase()}`);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setExportStatus(`Demo: Register would be exported as ${format.toUpperCase()}`);
      }
    } catch (error) {
      setExportStatus('Export failed: ' + (error as Error).message);
    }
    
    setLoading(false);
  };

  const exportProgressReports = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.export.progress();
        setExportStatus('Progress reports exported successfully');
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setExportStatus('Demo: Progress reports would be exported');
      }
    } catch (error) {
      setExportStatus('Export failed');
    }
    setLoading(false);
  };

  const exportSessionPack = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.export.sessionPack();
        setExportStatus('Session pack exported successfully');
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setExportStatus('Demo: Session pack would be exported');
      }
    } catch (error) {
      setExportStatus('Export failed');
    }
    setLoading(false);
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const path = await window.electronAPI.backup.create();
        setExportStatus(`Backup created: ${path}`);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setExportStatus('Demo: Backup would be created');
      }
    } catch (error) {
      setExportStatus('Backup failed');
    }
    setLoading(false);
  };

  const restoreBackup = async () => {
    if (!confirm('This will replace all current data. Are you sure?')) return;
    
    setLoading(true);
    try {
      if (window.electronAPI) {
        await window.electronAPI.backup.restore();
        setExportStatus('Backup restored successfully. Please restart the application.');
      } else {
        setExportStatus('Demo: Backup would be restored');
      }
    } catch (error) {
      setExportStatus('Restore failed');
    }
    setLoading(false);
  };

  const copyZoomLink = () => {
    navigator.clipboard.writeText('https://zoom.us/j/1234567890');
    setExportStatus('Zoom link copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-calm-900">Trainer Toolkit</h1>
        <p className="text-calm-600 mt-1">Session setup, exports, and data management</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'session-setup' as const, label: 'Session Setup', icon: Calendar },
          { id: 'exports' as const, label: 'Exports', icon: Download },
          { id: 'data' as const, label: 'Data Management', icon: Database },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeSection === tab.id
                ? 'bg-primary-100 text-primary-700'
                : 'bg-calm-100 text-calm-600 hover:bg-calm-200'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Message */}
      {exportStatus && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          exportStatus.includes('failed') ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700'
        }`}>
          {exportStatus.includes('failed') ? (
            <AlertTriangle size={20} />
          ) : (
            <CheckCircle size={20} />
          )}
          {exportStatus}
          <button
            onClick={() => setExportStatus(null)}
            className="ml-auto text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Session Setup Section */}
      {activeSection === 'session-setup' && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-calm-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="p-4 bg-primary-50 hover:bg-primary-100 rounded-xl text-left transition-colors">
                <Play className="text-primary-500 mb-2" size={24} />
                <h3 className="font-semibold text-calm-800">Start Session</h3>
                <p className="text-sm text-calm-500">Begin today's training</p>
              </button>
              
              <button 
                onClick={copyZoomLink}
                className="p-4 bg-calm-50 hover:bg-calm-100 rounded-xl text-left transition-colors"
              >
                <Copy className="text-calm-500 mb-2" size={24} />
                <h3 className="font-semibold text-calm-800">Copy Zoom Link</h3>
                <p className="text-sm text-calm-500">Share with trainees</p>
              </button>
              
              <button className="p-4 bg-calm-50 hover:bg-calm-100 rounded-xl text-left transition-colors">
                <Users className="text-calm-500 mb-2" size={24} />
                <h3 className="font-semibold text-calm-800">Take Register</h3>
                <p className="text-sm text-calm-500">Mark attendance</p>
              </button>
              
              <button className="p-4 bg-calm-50 hover:bg-calm-100 rounded-xl text-left transition-colors">
                <Shield className="text-danger-500 mb-2" size={24} />
                <h3 className="font-semibold text-calm-800">Safeguarding Log</h3>
                <p className="text-sm text-calm-500">Record a concern</p>
              </button>
            </div>
          </div>

          {/* Session Templates */}
          <div className="card">
            <h2 className="text-lg font-semibold text-calm-800 mb-4">Session Templates</h2>
            <p className="text-sm text-calm-500 mb-4">Quick-start a session with a pre-built agenda</p>
            
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 bg-calm-50 rounded-lg hover:bg-calm-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center font-semibold">
                      {template.weekNumber}.{template.sessionNumber}
                    </div>
                    <div>
                      <h3 className="font-medium text-calm-800">{template.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-calm-500">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {template.defaultDuration} mins
                        </span>
                        <span>•</span>
                        <span>{template.agenda.length} agenda items</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="text-calm-400" size={20} />
                </div>
              ))}
            </div>

            <button className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium">
              + Create new template
            </button>
          </div>

          {/* Session Checklist */}
          <div className="card">
            <h2 className="text-lg font-semibold text-calm-800 mb-4">Pre-Session Checklist</h2>
            <div className="space-y-2">
              {[
                'Zoom link tested and working',
                'Slides loaded and ready',
                'Register prepared',
                'Trainer notes reviewed',
                'Breakout rooms set up (if needed)',
                'Recording started (if required)',
              ].map((item, index) => (
                <label key={index} className="flex items-center gap-3 p-2 hover:bg-calm-50 rounded cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-calm-300" />
                  <span className="text-calm-700">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Exports Section */}
      {activeSection === 'exports' && (
        <div className="space-y-6">
          {/* Register Exports */}
          <div className="card">
            <h2 className="text-lg font-semibold text-calm-800 mb-4">Register & Attendance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => exportRegister('csv')}
                disabled={loading}
                className="p-4 border-2 border-dashed border-calm-200 hover:border-primary-300 rounded-xl text-left transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <FileText className="text-green-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-calm-800">Export as CSV</h3>
                    <p className="text-sm text-calm-500">Spreadsheet format</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => exportRegister('pdf')}
                disabled={loading}
                className="p-4 border-2 border-dashed border-calm-200 hover:border-primary-300 rounded-xl text-left transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <FileText className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-calm-800">Export as PDF</h3>
                    <p className="text-sm text-calm-500">Print-ready format</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Progress Reports */}
          <div className="card">
            <h2 className="text-lg font-semibold text-calm-800 mb-4">Progress Reports</h2>
            <p className="text-sm text-calm-500 mb-4">Generate individual or cohort progress reports</p>
            
            <div className="flex gap-4">
              <button
                onClick={exportProgressReports}
                disabled={loading}
                className="btn btn-primary"
              >
                <Download size={18} className="mr-2" />
                Export All Progress
              </button>
              <button className="btn btn-secondary">
                Select Trainees...
              </button>
            </div>
          </div>

          {/* Session Pack */}
          <div className="card">
            <h2 className="text-lg font-semibold text-calm-800 mb-4">Session Pack Export</h2>
            <p className="text-sm text-calm-500 mb-4">
              Export a complete session pack including slides, notes, activities, and resources for offline use.
            </p>
            
            <button
              onClick={exportSessionPack}
              disabled={loading}
              className="btn btn-primary"
            >
              <Download size={18} className="mr-2" />
              Export Session Pack
            </button>
          </div>

          {/* Daily Pack Export - Comprehensive Evidence Bundle */}
          <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Package className="text-purple-600" size={28} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-calm-800 mb-1">Daily Pack Export (PDF)</h2>
                <p className="text-sm text-calm-600 mb-4">
                  Generate a comprehensive daily evidence bundle with register, progress, chat transcript, 
                  recording audit trail, and sign-off page. Perfect for compliance records and funder reports.
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Register</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Progress</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Chat Transcript</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Recording Audit</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Sign-off</span>
                </div>
                
                <button
                  onClick={() => setShowDailyPackModal(true)}
                  disabled={loading}
                  className="btn bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Package size={18} className="mr-2" />
                  Download Daily Pack (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Management Section */}
      {activeSection === 'data' && (
        <div className="space-y-6">
          {/* Backup */}
          <div className="card">
            <h2 className="text-lg font-semibold text-calm-800 mb-4">Backup & Restore</h2>
            <p className="text-sm text-calm-500 mb-4">
              Create backups of all your data to prevent loss. Backups include all trainee records, attendance, progress, and settings.
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={createBackup}
                disabled={loading}
                className="btn btn-primary"
              >
                <Download size={18} className="mr-2" />
                Create Backup
              </button>
              <button
                onClick={restoreBackup}
                disabled={loading}
                className="btn btn-secondary"
              >
                <Upload size={18} className="mr-2" />
                Restore from Backup
              </button>
            </div>
          </div>

          {/* Database Info */}
          <div className="card">
            <h2 className="text-lg font-semibold text-calm-800 mb-4">Database Information</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-calm-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-calm-800">5</p>
                <p className="text-sm text-calm-500">Trainees</p>
              </div>
              <div className="p-4 bg-calm-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-calm-800">2</p>
                <p className="text-sm text-calm-500">Cohorts</p>
              </div>
              <div className="p-4 bg-calm-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-calm-800">12</p>
                <p className="text-sm text-calm-500">Sessions</p>
              </div>
              <div className="p-4 bg-calm-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-calm-800">48</p>
                <p className="text-sm text-calm-500">Attendance Records</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-calm-50 rounded-lg text-sm text-calm-600">
              <p><strong>Database location:</strong> /data/classroom.db</p>
              <p><strong>Last backup:</strong> Never</p>
            </div>
          </div>

          {/* Data Integrity */}
          <div className="card">
            <h2 className="text-lg font-semibold text-calm-800 mb-4">Data Integrity</h2>
            
            <button className="btn btn-secondary">
              <RefreshCw size={18} className="mr-2" />
              Verify Database Integrity
            </button>
          </div>

          {/* Danger Zone */}
          <div className="card border-danger-200 bg-danger-50">
            <h2 className="text-lg font-semibold text-danger-800 mb-4">⚠️ Danger Zone</h2>
            <p className="text-sm text-danger-700 mb-4">
              These actions are irreversible. Make sure you have a backup before proceeding.
            </p>
            
            <div className="flex gap-4">
              <button className="btn bg-danger-100 text-danger-700 hover:bg-danger-200">
                Clear Old Data
              </button>
              <button className="btn bg-danger-600 text-white hover:bg-danger-700">
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex items-center gap-4">
            <RefreshCw className="animate-spin text-primary-500" size={24} />
            <span className="text-calm-700">Processing...</span>
          </div>
        </div>
      )}

      {/* Daily Pack Export Modal */}
      <DailyPackExportModal
        isOpen={showDailyPackModal}
        onClose={() => setShowDailyPackModal(false)}
        trainerName="Trainer" 
      />
    </div>
  );
}
