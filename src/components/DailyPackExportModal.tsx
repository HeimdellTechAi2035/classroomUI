import { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  Settings,
  Eye,
  EyeOff,
  MessageSquare,
  FolderOpen,
  Shield,
  Loader2,
  Calendar,
  Users,
} from 'lucide-react';

interface Session {
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

interface DailyPackExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession?: Session;
  allTodaySessions?: Session[];
  trainerName: string;
}

export default function DailyPackExportModal({
  isOpen,
  onClose,
  currentSession,
  allTodaySessions = [],
  trainerName,
}: DailyPackExportModalProps) {
  const [scope, setScope] = useState<'this' | 'all'>('this');
  const [exportMode, setExportMode] = useState<'internal' | 'shareable'>('internal');
  const [includeTrainerNotes, setIncludeTrainerNotes] = useState(true);
  const [includeChatTranscript, setIncludeChatTranscript] = useState(true);
  const [includeFilePaths, setIncludeFilePaths] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; pdfPath?: string; folderPath?: string; error?: string } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setIsGenerating(false);
    }
  }, [isOpen]);

  // Auto-adjust options for shareable mode
  useEffect(() => {
    if (exportMode === 'shareable') {
      setIncludeFilePaths(false);
      setIncludeTrainerNotes(false);
    }
  }, [exportMode]);

  const sessionsToExport = scope === 'this' && currentSession 
    ? [currentSession] 
    : allTodaySessions;

  const handleGenerate = async () => {
    if (sessionsToExport.length === 0) return;

    setIsGenerating(true);
    setResult(null);

    try {
      // Gather data for all sessions
      const data = await gatherSessionData(sessionsToExport);

      const options = {
        sessions: sessionsToExport,
        exportMode,
        includeTrainerNotes,
        includeChatTranscript,
        includeFilePaths,
        trainerName,
        generatedBy: trainerName,
      };

      if (window.electronAPI?.dailyPack) {
        const response = await window.electronAPI.dailyPack.generate(options, data);
        setResult(response);

        // Log the export action
        if (response.success && window.electronAPI?.db) {
          await window.electronAPI.db.run(
            'audit_log',
            `INSERT INTO audit_log (action, user, details, timestamp) VALUES (?, ?, ?, ?)`,
            [
              'daily_pack_export',
              trainerName,
              JSON.stringify({
                exportMode,
                sessionsIncluded: sessionsToExport.map(s => s.id),
                outputPath: response.pdfPath,
              }),
              new Date().toISOString(),
            ]
          );
        }
      } else {
        // Demo mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        const date = new Date().toISOString().split('T')[0];
        const cohortName = sessionsToExport[0]?.cohortName || 'demo';
        setResult({
          success: true,
          pdfPath: `./exports/reports/${date}_cohort-${cohortName}_daily-pack.pdf`,
          folderPath: `./exports/reports/${date}_cohort-${cohortName}_daily-pack/`,
        });
      }
    } catch (error) {
      console.error('Failed to generate daily pack:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const gatherSessionData = async (sessions: Session[]) => {
    // In a real implementation, this would fetch data from the database
    // For now, return demo data structure
    const attendance: Record<string, any[]> = {};
    const chatMessages: Record<string, any[]> = {};
    const timeline: Record<string, any[]> = {};
    const progress: Record<string, any[]> = {};
    const resources: Record<string, any[]> = {};
    const recordings: Record<string, any> = {};
    const supportFlags: Record<string, any> = {};
    const trainerNotes: Record<string, string> = {};

    for (const session of sessions) {
      // Demo data - in real app, fetch from database
      attendance[session.id] = [
        { traineeId: '1', traineeName: 'Alex Johnson', status: 'present', moodScore: 4, arrivalTime: '09:00' },
        { traineeId: '2', traineeName: 'Jordan Smith', status: 'present', moodScore: 5, arrivalTime: '09:02' },
        { traineeId: '3', traineeName: 'Taylor Brown', status: 'late', moodScore: 3, arrivalTime: '09:15' },
        { traineeId: '4', traineeName: 'Casey Wilson', status: 'absent', moodScore: null },
      ];

      chatMessages[session.id] = [
        { timestamp: new Date().toISOString(), senderId: 'trainer', senderName: 'Trainer', senderType: 'trainer', message: 'Welcome everyone!' },
        { timestamp: new Date().toISOString(), senderId: '1', senderName: 'Alex Johnson', senderType: 'trainee', message: 'Hi!' },
        { timestamp: new Date().toISOString(), senderId: '2', senderName: 'Jordan Smith', senderType: 'trainee', message: 'Good morning' },
      ];

      timeline[session.id] = [
        { timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'session_start', description: 'Session started' },
        { timestamp: new Date(Date.now() - 2400000).toISOString(), type: 'module', description: 'Module 1: Introduction completed' },
        { timestamp: new Date(Date.now() - 1800000).toISOString(), type: 'break', description: 'Break started (15 min)' },
        { timestamp: new Date(Date.now() - 900000).toISOString(), type: 'resource', description: 'Handout shared: Getting Started Guide' },
        { timestamp: new Date().toISOString(), type: 'session_end', description: 'Session ended' },
      ];

      progress[session.id] = [
        { traineeId: '1', traineeName: 'Alex Johnson', weekNumber: session.weekNumber, completedItems: ['Item 1', 'Item 2', 'Item 3'], outcomesAchieved: ['Outcome 1'] },
        { traineeId: '2', traineeName: 'Jordan Smith', weekNumber: session.weekNumber, completedItems: ['Item 1', 'Item 2'], outcomesAchieved: ['Outcome 1', 'Outcome 2'] },
        { traineeId: '3', traineeName: 'Taylor Brown', weekNumber: session.weekNumber, completedItems: ['Item 1'], outcomesAchieved: [] },
      ];

      resources[session.id] = [
        { type: 'slide', title: 'Week 1 Slides', path: '/content/weeks/week-01/slides/main.pptx', usedAt: new Date().toISOString() },
        { type: 'handout', title: 'Getting Started Guide', path: '/content/weeks/week-01/resources/guide.pdf', usedAt: new Date().toISOString() },
        { type: 'link', title: 'Zoom Meeting', url: session.zoomLink || 'https://zoom.us/j/example', usedAt: new Date().toISOString() },
      ];

      recordings[session.id] = {
        fileName: 'recording.webm',
        duration: 3600000,
        storagePath: `./exports/recordings/${new Date().toISOString().split('T')[0]}_week-0${session.weekNumber}_session-001/`,
        integrityStatus: 'ok',
        hashesGenerated: true,
        markers: [
          { label: 'Key concept explained', offsetMs: 600000 },
          { label: 'Q&A session', offsetMs: 1800000 },
        ],
        consentCount: 3,
      };

      supportFlags[session.id] = {
        raised: 1,
        resolved: 1,
        unresolved: 0,
      };

      trainerNotes[session.id] = 'Session went well. Alex showed great progress. Taylor arrived late but caught up quickly. Good engagement overall.';
    }

    return {
      sessions,
      attendance,
      chatMessages,
      timeline,
      progress,
      resources,
      recordings,
      supportFlags,
      trainerNotes,
    };
  };

  const openFolder = async (folderPath: string) => {
    if (window.electronAPI?.openFolder) {
      await window.electronAPI.openFolder(folderPath);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-calm-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-calm-900">Download Daily Pack</h2>
              <p className="text-sm text-calm-500">Generate comprehensive session report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-calm-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-calm-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Scope Selection */}
          <div>
            <label className="block text-sm font-medium text-calm-700 mb-3">
              <Calendar size={16} className="inline mr-2" />
              Sessions to Include
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setScope('this')}
                disabled={!currentSession}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  scope === 'this'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-calm-200 hover:border-calm-300'
                } ${!currentSession ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <p className="font-semibold text-calm-800">This Session</p>
                <p className="text-sm text-calm-500 mt-1">
                  {currentSession?.title || 'No session selected'}
                </p>
              </button>
              <button
                onClick={() => setScope('all')}
                disabled={allTodaySessions.length === 0}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  scope === 'all'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-calm-200 hover:border-calm-300'
                } ${allTodaySessions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <p className="font-semibold text-calm-800">All Sessions Today</p>
                <p className="text-sm text-calm-500 mt-1">
                  {allTodaySessions.length} session(s)
                </p>
              </button>
            </div>
          </div>

          {/* Export Mode */}
          <div>
            <label className="block text-sm font-medium text-calm-700 mb-3">
              <Shield size={16} className="inline mr-2" />
              Export Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportMode('internal')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  exportMode === 'internal'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-calm-200 hover:border-calm-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={18} className="text-primary-500" />
                  <span className="font-semibold text-calm-800">Internal</span>
                </div>
                <p className="text-xs text-calm-500">
                  Full names, all details included. For internal records only.
                </p>
              </button>
              <button
                onClick={() => setExportMode('shareable')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  exportMode === 'shareable'
                    ? 'border-warning-500 bg-warning-50'
                    : 'border-calm-200 hover:border-calm-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <EyeOff size={18} className="text-warning-500" />
                  <span className="font-semibold text-calm-800">Shareable</span>
                </div>
                <p className="text-xs text-calm-500">
                  Redacted names, no private notes. Safe for external sharing.
                </p>
              </button>
            </div>
            {exportMode === 'shareable' && (
              <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded-lg">
                <p className="text-sm text-warning-800 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Personal data will be redacted (initials only, no mood scores, no private notes)
                </p>
              </div>
            )}
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-calm-700 mb-3">
              <Settings size={16} className="inline mr-2" />
              Include Options
            </label>
            <div className="space-y-3">
              <label className={`flex items-center justify-between p-3 rounded-lg border ${
                exportMode === 'shareable' && !includeTrainerNotes 
                  ? 'bg-calm-50 border-calm-200' 
                  : 'bg-white border-calm-200'
              }`}>
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-calm-500" />
                  <div>
                    <p className="font-medium text-calm-800">Trainer Private Notes</p>
                    <p className="text-xs text-calm-500">Include your private session notes</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeTrainerNotes}
                  onChange={(e) => setIncludeTrainerNotes(e.target.checked)}
                  disabled={exportMode === 'shareable'}
                  className="w-5 h-5 rounded border-calm-300 text-primary-500 focus:ring-primary-500 disabled:opacity-50"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border bg-white border-calm-200">
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} className="text-calm-500" />
                  <div>
                    <p className="font-medium text-calm-800">Chat Transcript</p>
                    <p className="text-xs text-calm-500">Include timestamped chat messages</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeChatTranscript}
                  onChange={(e) => setIncludeChatTranscript(e.target.checked)}
                  className="w-5 h-5 rounded border-calm-300 text-primary-500 focus:ring-primary-500"
                />
              </label>

              <label className={`flex items-center justify-between p-3 rounded-lg border ${
                exportMode === 'shareable' 
                  ? 'bg-calm-50 border-calm-200' 
                  : 'bg-white border-calm-200'
              }`}>
                <div className="flex items-center gap-3">
                  <FolderOpen size={18} className="text-calm-500" />
                  <div>
                    <p className="font-medium text-calm-800">Local File Paths</p>
                    <p className="text-xs text-calm-500">Include full paths to resources</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeFilePaths}
                  onChange={(e) => setIncludeFilePaths(e.target.checked)}
                  disabled={exportMode === 'shareable'}
                  className="w-5 h-5 rounded border-calm-300 text-primary-500 focus:ring-primary-500 disabled:opacity-50"
                />
              </label>
            </div>
          </div>

          {/* Sessions Preview */}
          <div className="p-4 bg-calm-50 rounded-xl">
            <p className="text-sm font-medium text-calm-700 mb-2 flex items-center gap-2">
              <Users size={16} />
              Sessions to Export ({sessionsToExport.length})
            </p>
            <div className="space-y-2">
              {sessionsToExport.map((session) => (
                <div key={session.id} className="flex items-center justify-between text-sm">
                  <span className="text-calm-700">{session.title}</span>
                  <span className="text-calm-500">{session.startTime} - {session.endTime}</span>
                </div>
              ))}
              {sessionsToExport.length === 0 && (
                <p className="text-sm text-calm-500 italic">No sessions selected</p>
              )}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-xl ${
              result.success 
                ? 'bg-success-50 border border-success-200' 
                : 'bg-danger-50 border border-danger-200'
            }`}>
              {result.success ? (
                <div>
                  <p className="font-medium text-success-800 flex items-center gap-2 mb-2">
                    <CheckCircle size={18} />
                    Daily Pack Generated Successfully!
                  </p>
                  <p className="text-sm text-success-700 mb-3">
                    PDF: {result.pdfPath}
                  </p>
                  <button
                    onClick={() => openFolder(result.folderPath!)}
                    className="btn btn-secondary text-sm"
                  >
                    <FolderOpen size={16} />
                    Open Export Folder
                  </button>
                </div>
              ) : (
                <p className="text-danger-800 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  {result.error || 'Failed to generate report'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-calm-200 bg-calm-50">
          <p className="text-xs text-calm-500">
            Report saved locally to ./exports/reports/
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-calm-600 hover:bg-calm-200 rounded-lg transition-colors"
            >
              {result?.success ? 'Close' : 'Cancel'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || sessionsToExport.length === 0}
              className="btn btn-primary"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download Daily Pack (PDF)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
