import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Play,
  Pause,
  Square,
  ExternalLink,
  Copy,
  Check,
  Users,
  Clock,
  MonitorUp,
  FileText,
  Send,
  Coffee,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Download,
  Save,
  ChevronDown,
  ChevronUp,
  Edit3,
  Video,
  Package,
} from 'lucide-react';
import RegisterTable from '../components/RegisterTable';
import SessionTimer from '../components/SessionTimer';
import ZoomControls from '../components/ZoomControls';
import TrainerToolsPanel from '../components/TrainerToolsPanel';
import AIHelperPanel from '../components/AIHelperPanel';
import SupportRequestsPanel from '../components/SupportRequestsPanel';
import DailyPackExportModal from '../components/DailyPackExportModal';

interface Session {
  id: string;
  cohortId: string;
  weekNumber: number;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  status: 'draft' | 'live' | 'ended';
  zoomUrlOverride?: string;
  meetingId?: string;
  passcode?: string;
  hostNotes?: string;
  agenda?: string;
}

interface Cohort {
  id: string;
  name: string;
  defaultZoomUrl?: string;
}

export default function TodaysSession() {
  const { setCurrentSession, sessionStatus, aiEnabled, accessibility } = useAppStore();
  
  // State
  const [session, setSession] = useState<Session | null>(null);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState({
    script: false,
    reminders: true,
  });
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [showSupportRequests, setShowSupportRequests] = useState(false);
  const [showDailyPackModal, setShowDailyPackModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!window.electronAPI) return;
    
    try {
      const cohortsData = await window.electronAPI.db.getCohorts() as Cohort[];
      setCohorts(cohortsData);
      
      const sessionsData = await window.electronAPI.db.getSessions() as Session[];
      setSessions(sessionsData);
      
      // Find today's session or the most recent upcoming one
      const today = new Date().toISOString().split('T')[0];
      const todaysSession = sessionsData.find(s => 
        s.startTime.startsWith(today) || s.status === 'live'
      ) || sessionsData[0];
      
      if (todaysSession) {
        setSession(todaysSession);
        setCurrentSession(todaysSession.id, todaysSession.status);
        
        const cohortData = await window.electronAPI.db.getCohort(todaysSession.cohortId) as Cohort;
        setCohort(cohortData);
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  };

  // Auto-save handler
  const handleAutoSave = useCallback(async () => {
    if (!session || !window.electronAPI) return;
    
    setAutoSaveStatus('saving');
    try {
      await window.electronAPI.db.updateSession(session.id, session);
      setAutoSaveStatus('saved');
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
    }
  }, [session]);

  // Auto-save effect
  useEffect(() => {
    if (!session) return;
    
    const timer = setTimeout(handleAutoSave, 30000); // 30 second auto-save
    return () => clearTimeout(timer);
  }, [session, handleAutoSave]);

  // Session controls
  const handleStartSession = async () => {
    if (!session || !window.electronAPI) return;
    
    const updated = await window.electronAPI.db.updateSession(session.id, { 
      status: 'live',
      startTime: new Date().toISOString(),
    }) as Session;
    setSession(updated);
    setCurrentSession(updated.id, 'live');
  };

  const handleEndSession = async () => {
    if (!session || !window.electronAPI) return;
    
    if (!confirm('Are you sure you want to end this session?')) return;
    
    const updated = await window.electronAPI.db.updateSession(session.id, { 
      status: 'ended',
      endTime: new Date().toISOString(),
    }) as Session;
    setSession(updated);
    setCurrentSession(updated.id, 'ended');
  };

  // Copy to clipboard
  const handleCopy = async (text: string, label: string) => {
    if (window.electronAPI) {
      await window.electronAPI.copyToClipboard(text);
    } else {
      await navigator.clipboard.writeText(text);
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  // Export register
  const handleExportRegister = async (format: 'csv' | 'pdf') => {
    if (!session || !window.electronAPI) return;
    
    try {
      const filePath = await window.electronAPI.export.register(session.id, format);
      // Open the folder containing the export
      const folderPath = filePath.substring(0, filePath.lastIndexOf('\\'));
      await window.electronAPI.openFolder(folderPath);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (!session) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 flex items-center justify-center">
          <Clock size={36} className="text-primary-400" />
        </div>
        <h2 className="text-2xl font-bold text-calm-800 mb-3">No Session Selected</h2>
        <p className="text-calm-500 mb-8 max-w-md mx-auto">
          Create a new session or select an existing one to get started with your training.
        </p>
        <button className="btn-primary btn-lg">
          Create New Session
        </button>
      </div>
    );
  }

  const zoomUrl = session.zoomUrlOverride || cohort?.defaultZoomUrl;

  return (
    <div className="space-y-8">
      {/* Session Header */}
      <div className="card bg-gradient-to-br from-white to-calm-50/50 border-calm-200/60">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {isEditing ? (
                <input
                  type="text"
                  value={session.title}
                  onChange={(e) => setSession({ ...session, title: e.target.value })}
                  className="input-field text-2xl font-bold"
                  autoFocus
                />
              ) : (
                <h1 className="heading-1">{session.title}</h1>
              )}
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="btn-icon hover:bg-calm-100"
                aria-label={isEditing ? 'Save title' : 'Edit title'}
              >
                {isEditing ? <Check size={18} /> : <Edit3 size={18} />}
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-5 text-calm-500">
              <span className="flex items-center gap-2 bg-calm-100/60 px-3 py-1.5 rounded-lg">
                <Clock size={16} className="text-calm-400" />
                {new Date(session.startTime).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="flex items-center gap-2 bg-calm-100/60 px-3 py-1.5 rounded-lg">
                <Users size={16} className="text-calm-400" />
                {cohort?.name || 'No cohort'}
              </span>
              <span className="flex items-center gap-2 bg-calm-100/60 px-3 py-1.5 rounded-lg">
                <FileText size={16} className="text-calm-400" />
                Week {session.weekNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Badge */}
            <span className={`px-4 py-2 rounded-xl font-semibold text-sm ${
              session.status === 'live' 
                ? 'bg-gradient-to-r from-danger-500 to-danger-600 text-white shadow-lg shadow-danger-500/25' 
                : session.status === 'ended' 
                  ? 'bg-gradient-to-r from-success-500 to-success-600 text-white shadow-lg shadow-success-500/25' 
                  : 'bg-calm-100 text-calm-600'
            }`}>
              {session.status === 'live' && (
                <span className="inline-flex mr-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              )}
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>

            {/* Auto-save indicator */}
            <span className={`text-sm font-medium flex items-center gap-1.5 ${
              autoSaveStatus === 'saved' ? 'text-success-500' :
              autoSaveStatus === 'saving' ? 'text-warning-500' : 'text-danger-500'
            }`}>
              {autoSaveStatus === 'saved' && <Check size={14} />}
              {autoSaveStatus === 'saved' ? 'Saved' :
               autoSaveStatus === 'saving' ? 'Saving...' : 'Save failed'}
            </span>

            {/* Session controls */}
            {session.status === 'draft' && (
              <button onClick={handleStartSession} className="btn-success btn-lg shadow-xl">
                <Play size={20} /> Start Session
              </button>
            )}
            {session.status === 'live' && (
              <>
                <button 
                  onClick={() => setShowDailyPackModal(true)} 
                  className="btn bg-gradient-to-r from-accent-500 to-primary-500 text-white hover:from-accent-600 hover:to-primary-600 shadow-lg"
                >
                  <Package size={18} /> Daily Pack
                </button>
                <button onClick={handleEndSession} className="btn-danger btn-lg shadow-xl">
                  <Square size={20} /> End Session
                </button>
              </>
            )}
            {session.status === 'ended' && (
              <button 
                onClick={() => setShowDailyPackModal(true)} 
                className="btn bg-gradient-to-r from-accent-500 to-primary-500 text-white hover:from-accent-600 hover:to-primary-600 shadow-lg"
              >
                <Package size={18} /> Download Daily Pack
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Register & Attendance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Zoom Controls */}
          <ZoomControls
            zoomUrl={zoomUrl}
            meetingId={session.meetingId}
            passcode={session.passcode}
            hostNotes={session.hostNotes}
            onCopy={handleCopy}
            copied={copied}
          />

          {/* Register / Attendance */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-calm-800 flex items-center gap-2">
                <Users size={20} />
                Register / Attendance
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportRegister('csv')}
                  className="btn-secondary text-sm"
                >
                  <Download size={16} className="mr-1" /> CSV
                </button>
                <button
                  onClick={() => handleExportRegister('pdf')}
                  className="btn-secondary text-sm"
                >
                  <Download size={16} className="mr-1" /> PDF
                </button>
              </div>
            </div>
            
            <RegisterTable 
              sessionId={session.id} 
              cohortId={session.cohortId}
              isLive={session.status === 'live'}
            />
          </div>

          {/* Trainer Script / Notes (Collapsible) */}
          <div className="card">
            <button
              onClick={() => setExpandedPanels(p => ({ ...p, script: !p.script }))}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-semibold text-calm-800 flex items-center gap-2">
                <FileText size={20} />
                Today's Script & Notes
              </h2>
              {expandedPanels.script ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {expandedPanels.script && (
              <div className="mt-4">
                <textarea
                  value={session.hostNotes || ''}
                  onChange={(e) => setSession({ ...session, hostNotes: e.target.value })}
                  placeholder="Add trainer notes, talking points, reminders..."
                  className="input min-h-[200px] resize-y"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Tools & Timer */}
        <div className="space-y-6">
          {/* Session Timer */}
          <SessionTimer 
            isLive={session.status === 'live'}
            startTime={session.startTime}
          />

          {/* Trainer Tools */}
          <TrainerToolsPanel 
            sessionId={session.id}
            onScreenShare={() => {/* Implement screen share */}}
            onSendResource={() => {/* Implement send resource */}}
            onStartBreak={() => {/* Implement break timer */}}
          />

          {/* Key Reminders */}
          <div className="card">
            <button
              onClick={() => setExpandedPanels(p => ({ ...p, reminders: !p.reminders }))}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-semibold text-calm-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-warning-500" />
                Key Reminders
              </h2>
              {expandedPanels.reminders ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {expandedPanels.reminders && (
              <div className="mt-4 space-y-2">
                <div className="p-3 bg-warning-50 rounded-lg text-sm text-warning-700">
                  Week {session.weekNumber} Focus: Check outcomes from previous session
                </div>
                <div className="p-3 bg-primary-50 rounded-lg text-sm text-primary-700">
                  Remember: Accessibility check at start of session
                </div>
                <div className="p-3 bg-calm-50 rounded-lg text-sm text-calm-700">
                  Break recommended every 45-50 minutes
                </div>
              </div>
            )}
          </div>

          {/* Support Requests */}
          <div className="card">
            <button
              onClick={() => setShowSupportRequests(!showSupportRequests)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-semibold text-calm-800 flex items-center gap-2">
                <HelpCircle size={20} className="text-primary-500" />
                Support Requests
              </h2>
              <span className="badge badge-warning">2 pending</span>
            </button>
          </div>

          {/* AI Helper (if enabled) */}
          {aiEnabled && (
            <div className="card">
              <button
                onClick={() => setShowAIHelper(!showAIHelper)}
                className="w-full flex items-center justify-between"
              >
                <h2 className="text-lg font-semibold text-calm-800 flex items-center gap-2">
                  <Sparkles size={20} className="text-primary-500" />
                  AI Trainer Copilot
                </h2>
                <ChevronDown size={20} className={showAIHelper ? 'rotate-180' : ''} />
              </button>
              
              {showAIHelper && (
                <AIHelperPanel 
                  mode="trainer"
                  sessionContext={{
                    weekNumber: session.weekNumber,
                    cohortName: cohort?.name,
                  }}
                />
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="card bg-danger-50 border-danger-200">
            <h3 className="font-semibold text-danger-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={18} />
              Safeguarding / Incident
            </h3>
            <button className="w-full btn bg-danger-600 text-white hover:bg-danger-700">
              Log Incident (Private)
            </button>
            <p className="text-xs text-danger-600 mt-2">
              Opens encrypted incident log. Visible only to authorised trainers.
            </p>
          </div>
        </div>
      </div>

      {/* Support Requests Modal */}
      {showSupportRequests && (
        <SupportRequestsPanel 
          sessionId={session.id}
          onClose={() => setShowSupportRequests(false)}
        />
      )}

      {/* Daily Pack Export Modal */}
      <DailyPackExportModal
        isOpen={showDailyPackModal}
        onClose={() => setShowDailyPackModal(false)}
        currentSession={{
          id: session.id,
          title: session.title,
          cohortId: session.cohortId,
          cohortName: cohort?.name || 'Unknown Cohort',
          weekNumber: session.weekNumber,
          dayNumber: 1,
          date: session.startTime.split('T')[0],
          startTime: new Date(session.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          endTime: session.endTime 
            ? new Date(session.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : '',
          status: session.status,
          zoomLink: session.zoomUrlOverride || cohort?.defaultZoomUrl,
        }}
        allTodaySessions={sessions.filter(s => 
          s.startTime.startsWith(new Date().toISOString().split('T')[0])
        ).map(s => ({
          id: s.id,
          title: s.title,
          cohortId: s.cohortId,
          cohortName: cohort?.name || 'Unknown Cohort',
          weekNumber: s.weekNumber,
          dayNumber: 1,
          date: s.startTime.split('T')[0],
          startTime: new Date(s.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          endTime: s.endTime 
            ? new Date(s.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : '',
          status: s.status,
          zoomLink: s.zoomUrlOverride || cohort?.defaultZoomUrl,
        }))}
        trainerName="Trainer"
      />
    </div>
  );
}
