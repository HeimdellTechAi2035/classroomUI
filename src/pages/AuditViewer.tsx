import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Flag,
  MessageSquare,
  Users,
  Clock,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldX,
  Trash2,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface RecordingMetadata {
  sessionId: string;
  cohortId: string;
  weekNumber: number;
  dayNumber: number;
  settings: any;
  createdAt: string;
  endedAt?: string;
  fileSizes: Record<string, number>;
  consentSummary: {
    acknowledged: number;
    notAcknowledged: number;
    total: number;
  };
  retentionExpiryDate: string;
  status: string;
  duration?: number;
  markers: TimelineMarker[];
  _folderName?: string;
}

interface TimelineMarker {
  id: string;
  timestamp: string;
  offsetMs: number;
  label: string;
  createdBy: string;
}

interface TimelineEvent {
  timestamp: string;
  type: string;
  data?: any;
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
}

export default function AuditViewer() {
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [recordingDetails, setRecordingDetails] = useState<{
    metadata: RecordingMetadata;
    chatLog: ChatMessage[];
    timelineEvents: TimelineEvent[];
    consentRecords: ConsentRecord[];
    integrity: { valid: boolean; details: Record<string, boolean> };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'playback' | 'chat' | 'timeline' | 'consent' | 'integrity'>('playback');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWeek, setFilterWeek] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    loadRecordings();
    // Purge expired recordings on load
    purgeExpired();
  }, []);

  useEffect(() => {
    if (selectedRecording) {
      loadRecordingDetails(selectedRecording);
    }
  }, [selectedRecording]);

  const loadRecordings = async () => {
    if (!window.electronAPI?.recording) {
      // Demo data for development
      setRecordings([
        {
          sessionId: 'demo-1',
          cohortId: 'cohort-1',
          weekNumber: 1,
          dayNumber: 1,
          settings: {},
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          endedAt: new Date(Date.now() - 80000000).toISOString(),
          fileSizes: { 'recording.webm': 52428800, 'transcript_chat.jsonl': 4096 },
          consentSummary: { acknowledged: 8, notAcknowledged: 0, total: 8 },
          retentionExpiryDate: new Date(Date.now() + 86400000 * 90).toISOString(),
          status: 'completed',
          duration: 7200000,
          markers: [
            { id: '1', timestamp: new Date().toISOString(), offsetMs: 300000, label: 'Key concept explained', createdBy: 'Trainer' },
            { id: '2', timestamp: new Date().toISOString(), offsetMs: 1200000, label: 'Q&A session', createdBy: 'Trainer' },
          ],
          _folderName: '2024-12-16_week-01_session-001',
        },
        {
          sessionId: 'demo-2',
          cohortId: 'cohort-1',
          weekNumber: 1,
          dayNumber: 2,
          settings: {},
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          endedAt: new Date(Date.now() - 166400000).toISOString(),
          fileSizes: { 'recording.webm': 48000000 },
          consentSummary: { acknowledged: 7, notAcknowledged: 1, total: 8 },
          retentionExpiryDate: new Date(Date.now() + 86400000 * 88).toISOString(),
          status: 'completed',
          duration: 6800000,
          markers: [],
          _folderName: '2024-12-15_week-01_session-002',
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      const list = await window.electronAPI.recording.list();
      setRecordings(list);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecordingDetails = async (folderName: string) => {
    if (!window.electronAPI?.recording) {
      // Demo details
      setRecordingDetails({
        metadata: recordings.find(r => r._folderName === folderName)!,
        chatLog: [
          { timestamp: new Date().toISOString(), senderId: '1', senderName: 'Trainer', senderType: 'trainer', message: 'Welcome everyone!' },
          { timestamp: new Date().toISOString(), senderId: '2', senderName: 'Alex', senderType: 'trainee', message: 'Hi!' },
          { timestamp: new Date().toISOString(), senderId: '3', senderName: 'Jordan', senderType: 'trainee', message: 'Good morning' },
        ],
        timelineEvents: [
          { timestamp: new Date(Date.now() - 7200000).toISOString(), type: 'session_start', data: {} },
          { timestamp: new Date(Date.now() - 5400000).toISOString(), type: 'break_start', data: {} },
          { timestamp: new Date(Date.now() - 4800000).toISOString(), type: 'break_end', data: {} },
          { timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'resource_sent', data: { resource: 'Handout.pdf' } },
          { timestamp: new Date().toISOString(), type: 'session_end', data: { duration: 7200000 } },
        ],
        consentRecords: [
          { traineeId: '1', traineeName: 'Alex Johnson', acknowledged: true, timestamp: new Date().toISOString() },
          { traineeId: '2', traineeName: 'Jordan Smith', acknowledged: true, timestamp: new Date().toISOString() },
          { traineeId: '3', traineeName: 'Taylor Brown', acknowledged: true, timestamp: new Date().toISOString() },
        ],
        integrity: { valid: true, details: { 'recording.webm': true, 'metadata.json': true, 'transcript_chat.jsonl': true } },
      });
      return;
    }

    try {
      const details = await window.electronAPI.recording.getDetails(folderName);
      if (details) {
        setRecordingDetails(details);
      }
    } catch (error) {
      console.error('Failed to load recording details:', error);
    }
  };

  const purgeExpired = async () => {
    if (!window.electronAPI?.recording) return;
    
    try {
      const result = await window.electronAPI.recording.purgeExpired();
      if (result.purged.length > 0) {
        console.log('Purged expired recordings:', result.purged);
        loadRecordings();
      }
    } catch (error) {
      console.error('Failed to purge expired recordings:', error);
    }
  };

  const deleteRecording = async (folderName: string) => {
    if (!window.electronAPI?.recording) return;

    try {
      const result = await window.electronAPI.recording.delete(folderName);
      if (result.success) {
        setShowDeleteConfirm(null);
        setSelectedRecording(null);
        setRecordingDetails(null);
        loadRecordings();
      }
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'session_start':
        return <Play size={14} className="text-success-500" />;
      case 'session_end':
        return <div className="w-3.5 h-3.5 bg-danger-500 rounded" />;
      case 'break_start':
      case 'break_end':
        return <Clock size={14} className="text-warning-500" />;
      case 'marker_added':
        return <Flag size={14} className="text-accent-500" />;
      case 'resource_sent':
        return <FileText size={14} className="text-primary-500" />;
      case 'consent_acknowledged':
        return <CheckCircle size={14} className="text-success-500" />;
      case 'consent_declined':
        return <XCircle size={14} className="text-danger-500" />;
      default:
        return <Clock size={14} className="text-calm-400" />;
    }
  };

  const filteredRecordings = recordings.filter(r => {
    if (filterWeek && r.weekNumber !== filterWeek) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        r._folderName?.toLowerCase().includes(query) ||
        `week ${r.weekNumber}`.includes(query) ||
        `day ${r.dayNumber}`.includes(query)
      );
    }
    return true;
  });

  const jumpToMarker = (offsetMs: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = offsetMs / 1000;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-calm-500">Loading audit records...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-calm-900">Audit Viewer</h1>
          <p className="text-calm-500">Review session recordings and audit trails</p>
        </div>
        <button
          onClick={() => { loadRecordings(); purgeExpired(); }}
          className="btn btn-secondary"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recording List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search & Filter */}
          <div className="card">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-calm-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recordings..."
                  className="input pl-9"
                />
              </div>
              <select
                value={filterWeek || ''}
                onChange={(e) => setFilterWeek(e.target.value ? parseInt(e.target.value) : null)}
                className="input w-auto"
              >
                <option value="">All weeks</option>
                {[1, 2, 3, 4, 5, 6].map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recordings */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredRecordings.length === 0 ? (
              <div className="card text-center py-8 text-calm-500">
                <Shield size={32} className="mx-auto mb-2 opacity-50" />
                <p>No recordings found</p>
              </div>
            ) : (
              filteredRecordings.map((recording) => (
                <button
                  key={recording._folderName}
                  onClick={() => setSelectedRecording(recording._folderName!)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedRecording === recording._folderName
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-calm-200 bg-white hover:border-calm-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-semibold text-calm-900">
                        Week {recording.weekNumber}, Day {recording.dayNumber}
                      </span>
                      <p className="text-xs text-calm-500 mt-0.5">
                        {formatDate(recording.createdAt)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      recording.status === 'completed' 
                        ? 'bg-success-100 text-success-700'
                        : 'bg-warning-100 text-warning-700'
                    }`}>
                      {recording.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-calm-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {recording.duration ? formatDuration(recording.duration) : '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {recording.consentSummary.total} trainees
                    </span>
                    {recording.markers.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Flag size={12} />
                        {recording.markers.length}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Recording Details */}
        <div className="lg:col-span-2">
          {!selectedRecording || !recordingDetails ? (
            <div className="card h-full flex items-center justify-center text-calm-500">
              <div className="text-center">
                <Shield size={48} className="mx-auto mb-3 opacity-30" />
                <p>Select a recording to view details</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Recording Header */}
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-calm-900">
                      Week {recordingDetails.metadata.weekNumber}, Day {recordingDetails.metadata.dayNumber}
                    </h2>
                    <p className="text-calm-500 text-sm">
                      {formatDate(recordingDetails.metadata.createdAt)}
                      {recordingDetails.metadata.duration && (
                        <> • {formatDuration(recordingDetails.metadata.duration)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Integrity badge */}
                    {recordingDetails.integrity.valid ? (
                      <span className="flex items-center gap-1.5 text-sm text-success-700 bg-success-50 px-3 py-1.5 rounded-lg">
                        <ShieldCheck size={16} />
                        Integrity OK
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-danger-700 bg-danger-50 px-3 py-1.5 rounded-lg">
                        <ShieldX size={16} />
                        Modified
                      </span>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(selectedRecording)}
                      className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                      title="Delete recording"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-calm-200 -mx-6 px-6">
                  {[
                    { id: 'playback' as const, label: 'Playback', icon: Play },
                    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
                    { id: 'timeline' as const, label: 'Timeline', icon: Clock },
                    { id: 'consent' as const, label: 'Consent', icon: Users },
                    { id: 'integrity' as const, label: 'Integrity', icon: Shield },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-calm-500 hover:text-calm-700'
                      }`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'playback' && (
                <div className="card">
                  {/* Video Player Placeholder */}
                  <div className="bg-calm-900 rounded-xl aspect-video flex items-center justify-center mb-4">
                    <div className="text-center text-calm-400">
                      <Play size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Recording playback</p>
                      <p className="text-sm text-calm-500">
                        {recordingDetails.metadata.fileSizes['recording.webm']
                          ? formatFileSize(recordingDetails.metadata.fileSizes['recording.webm'])
                          : 'No video file'}
                      </p>
                    </div>
                  </div>

                  {/* Markers */}
                  {recordingDetails.metadata.markers.length > 0 && (
                    <div>
                      <h4 className="font-medium text-calm-800 mb-2 flex items-center gap-2">
                        <Flag size={16} className="text-accent-500" />
                        Important Moments
                      </h4>
                      <div className="space-y-2">
                        {recordingDetails.metadata.markers.map((marker) => (
                          <button
                            key={marker.id}
                            onClick={() => jumpToMarker(marker.offsetMs)}
                            className="w-full text-left p-3 bg-accent-50 border border-accent-200 rounded-lg hover:bg-accent-100 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-accent-800">{marker.label}</span>
                              <span className="text-sm text-accent-600">
                                {formatDuration(marker.offsetMs)}
                              </span>
                            </div>
                            <p className="text-xs text-accent-600 mt-1">
                              Marked by {marker.createdBy}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="card max-h-[500px] overflow-y-auto">
                  <h4 className="font-medium text-calm-800 mb-4">Chat Transcript</h4>
                  {recordingDetails.chatLog.length === 0 ? (
                    <p className="text-calm-500 text-center py-8">No chat messages recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {recordingDetails.chatLog.map((msg, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg ${
                            msg.senderType === 'trainer'
                              ? 'bg-primary-50 border-l-4 border-primary-400'
                              : 'bg-calm-50'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={`font-medium ${
                              msg.senderType === 'trainer' ? 'text-primary-700' : 'text-calm-700'
                            }`}>
                              {msg.senderName}
                              {msg.senderType === 'trainer' && ' 🎓'}
                            </span>
                            <span className="text-calm-400">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-calm-800">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="card max-h-[500px] overflow-y-auto">
                  <h4 className="font-medium text-calm-800 mb-4">Session Timeline</h4>
                  {recordingDetails.timelineEvents.length === 0 ? (
                    <p className="text-calm-500 text-center py-8">No timeline events recorded</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-calm-200" />
                      <div className="space-y-4">
                        {recordingDetails.timelineEvents.map((event, i) => (
                          <div key={i} className="flex gap-4 relative">
                            <div className="w-8 h-8 rounded-full bg-white border-2 border-calm-200 flex items-center justify-center z-10">
                              {getEventIcon(event.type)}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="font-medium text-calm-800 capitalize">
                                {event.type.replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-calm-500">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </p>
                              {event.data && Object.keys(event.data).length > 0 && (
                                <p className="text-sm text-calm-600 mt-1">
                                  {JSON.stringify(event.data)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'consent' && (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-calm-800">Consent Records</h4>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-success-600">
                        ✓ {recordingDetails.metadata.consentSummary.acknowledged} acknowledged
                      </span>
                      {recordingDetails.metadata.consentSummary.notAcknowledged > 0 && (
                        <span className="text-warning-600">
                          ⚠ {recordingDetails.metadata.consentSummary.notAcknowledged} declined
                        </span>
                      )}
                    </div>
                  </div>
                  {recordingDetails.consentRecords.length === 0 ? (
                    <p className="text-calm-500 text-center py-8">No consent records</p>
                  ) : (
                    <div className="space-y-2">
                      {recordingDetails.consentRecords.map((record, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            record.acknowledged ? 'bg-success-50' : 'bg-warning-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {record.acknowledged ? (
                              <CheckCircle size={18} className="text-success-500" />
                            ) : (
                              <XCircle size={18} className="text-warning-500" />
                            )}
                            <span className="font-medium text-calm-800">{record.traineeName}</span>
                          </div>
                          <span className="text-xs text-calm-500">
                            {new Date(record.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'integrity' && (
                <div className="card">
                  <div className="flex items-center gap-3 mb-4">
                    {recordingDetails.integrity.valid ? (
                      <>
                        <ShieldCheck size={24} className="text-success-500" />
                        <div>
                          <h4 className="font-medium text-success-800">All files verified</h4>
                          <p className="text-sm text-success-600">No modifications detected</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <ShieldX size={24} className="text-danger-500" />
                        <div>
                          <h4 className="font-medium text-danger-800">Integrity issues detected</h4>
                          <p className="text-sm text-danger-600">Some files may have been modified</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(recordingDetails.integrity.details).map(([file, valid]) => (
                      <div
                        key={file}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          valid ? 'bg-calm-50' : 'bg-danger-50'
                        }`}
                      >
                        <span className="font-mono text-sm text-calm-700">{file}</span>
                        {valid ? (
                          <CheckCircle size={18} className="text-success-500" />
                        ) : (
                          <XCircle size={18} className="text-danger-500" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-calm-100 rounded-lg">
                    <p className="text-xs text-calm-600">
                      File integrity is verified using SHA-256 hashes generated at the end of each session.
                      This helps detect if any files have been modified after recording.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-danger-600" />
              </div>
              <div>
                <h3 className="font-semibold text-calm-900">Delete Recording?</h3>
                <p className="text-sm text-calm-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-calm-600 text-sm mb-6">
              This will permanently delete the recording and all associated audit data including
              chat transcripts, timeline events, and consent records.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-calm-300 text-calm-600 rounded-lg font-medium hover:bg-calm-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteRecording(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-danger-500 text-white rounded-lg font-medium hover:bg-danger-600 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
