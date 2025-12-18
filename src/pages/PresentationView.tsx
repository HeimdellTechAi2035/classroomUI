import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Monitor,
  MessageSquare,
  Hand,
  Users,
  Send,
  Volume2,
  VolumeX,
  AlertCircle,
  CheckCircle,
  Maximize2,
  Minimize2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  ExternalLink,
  Copy,
  Check,
  Columns,
  Presentation,
  Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import RecordingConsent from '../components/RecordingConsent';
import { RecordingIndicator, RecordingBanner } from '../components/RecordingIndicator';
import RecordingControls from '../components/RecordingControls';

interface ChatMessage {
  id: string;
  senderName: string;
  senderType: 'trainer' | 'trainee';
  message: string;
  timestamp: Date;
}

interface WeekContent {
  weekNumber: number;
  title: string;
  overview: string;
  slides: string[];
  trainerNotes: string;
  activities: Activity[];
  outcomes: Outcome[];
}

interface Activity {
  id: string;
  title: string;
  duration: string;
  type: string;
  description: string;
  instructions: string;
}

interface Outcome {
  id: string;
  description: string;
}

type ViewMode = 'split' | 'content' | 'classroom';
type ContentTab = 'slides' | 'notes' | 'activities' | 'outcomes';

export default function PresentationView() {
  const [searchParams] = useSearchParams();
  const weekNumber = parseInt(searchParams.get('week') || '1');
  const dayNumber = parseInt(searchParams.get('day') || '1');
  const isTrainer = searchParams.get('role') === 'trainer';
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Content State
  const [content, setContent] = useState<WeekContent | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [contentTab, setContentTab] = useState<ContentTab>('slides');
  const [completedOutcomes, setCompletedOutcomes] = useState<Set<string>>(new Set());
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Support State
  const [supportRequests] = useState<string[]>([]);
  const [mySupport, setMySupport] = useState<{ active: boolean; acknowledged: boolean }>({ active: false, acknowledged: false });

  // Recording State
  const [showConsentModal, setShowConsentModal] = useState(!isTrainer); // Show for trainees on join
  const [hasConsented, setHasConsented] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showRecordingControls, setShowRecordingControls] = useState(false);

  // Load content on mount
  useEffect(() => {
    loadContent();
    loadMessages();
    const msgInterval = setInterval(loadMessages, 3000);
    return () => clearInterval(msgInterval);
  }, [weekNumber, dayNumber]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          prevSlide();
          break;
        case 'ArrowRight':
          nextSlide();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case '1':
          setViewMode('split');
          break;
        case '2':
          setViewMode('content');
          break;
        case '3':
          setViewMode('classroom');
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, content]);

  const loadContent = async () => {
    // Demo content - in real app, load from database
    setContent({
      weekNumber,
      title: getDayTitle(weekNumber, dayNumber),
      overview: getDayOverview(weekNumber, dayNumber),
      slides: Array.from({ length: 8 }, (_, i) => `/slides/week${weekNumber}/day${dayNumber}/slide${i + 1}.png`),
      trainerNotes: getTrainerNotes(weekNumber, dayNumber),
      activities: getActivities(weekNumber, dayNumber),
      outcomes: getOutcomes(weekNumber, dayNumber),
    });
  };

  const loadMessages = () => {
    // Demo messages
    setMessages([
      { id: '1', senderName: 'Trainer', senderType: 'trainer', message: `Welcome everyone! We're starting Week ${weekNumber}, Day ${dayNumber} today.`, timestamp: new Date(Date.now() - 300000) },
      { id: '2', senderName: 'Alex', senderType: 'trainee', message: 'Hi! Ready to learn 😊', timestamp: new Date(Date.now() - 240000) },
      { id: '3', senderName: 'Jordan', senderType: 'trainee', message: 'Good morning!', timestamp: new Date(Date.now() - 180000) },
    ]);
  };

  const nextSlide = () => {
    if (content && currentSlideIndex < content.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderName: isTrainer ? 'Trainer' : 'You',
      senderType: isTrainer ? 'trainer' : 'trainee',
      message: newMessage.trim(),
      timestamp: new Date(),
    };
    setMessages([...messages, msg]);
    setNewMessage('');
    
    // Log to recording if active
    if (isRecording && window.electronAPI?.recording) {
      window.electronAPI.recording.addChatMessage({
        timestamp: new Date().toISOString(),
        senderId: 'current-user',
        senderName: msg.senderName,
        senderType: msg.senderType,
        message: msg.message,
      });
    }
  };

  const requestSupport = () => {
    setMySupport({ active: true, acknowledged: false });
    // Simulate trainer acknowledgment after 3 seconds
    setTimeout(() => setMySupport(prev => ({ ...prev, acknowledged: true })), 3000);
  };

  const cancelSupport = () => {
    setMySupport({ active: false, acknowledged: false });
  };

  // Recording handlers
  const handleConsentAccept = () => {
    setHasConsented(true);
    setShowConsentModal(false);
    // Log consent in the recording
    if (window.electronAPI?.recording) {
      window.electronAPI.recording.recordConsent({
        traineeId: 'current-user',
        traineeName: 'Current User',
        acknowledged: true,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleConsentDecline = () => {
    // In a real app, might redirect away or show limited view
    setShowConsentModal(false);
    // Log declined consent
    if (window.electronAPI?.recording) {
      window.electronAPI.recording.recordConsent({
        traineeId: 'current-user',
        traineeName: 'Current User',
        acknowledged: false,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleRecordingStart = () => {
    setIsRecording(true);
    setIsPaused(false);
  };

  const handleRecordingPause = () => {
    setIsPaused(true);
  };

  const handleRecordingResume = () => {
    setIsPaused(false);
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
    setIsPaused(false);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/present?week=${weekNumber}&day=${dayNumber}&role=trainee`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const toggleOutcome = (id: string) => {
    const newSet = new Set(completedOutcomes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCompletedOutcomes(newSet);
  };

  if (!content) {
    return (
      <div className="min-h-screen bg-calm-50 flex items-center justify-center">
        <div className="text-calm-600 animate-pulse">Loading presentation...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-calm-50 via-white to-calm-100 text-calm-900 ${isFullscreen ? 'p-0' : 'p-4'}`}>
      {/* Recording Consent Modal for Trainees */}
      {showConsentModal && !isTrainer && (
        <RecordingConsent
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
          allowDecline={false}
          retentionDays={90}
        />
      )}

      {/* Recording Banner - shown to all when recording */}
      {isRecording && (
        <RecordingBanner 
          isPaused={isPaused}
          sessionInfo={`Week ${weekNumber}, Day ${dayNumber}`}
        />
      )}

      {/* Top Control Bar */}
      <div className={`bg-white/90 backdrop-blur-xl rounded-2xl mb-4 border border-calm-200 shadow-lg ${isFullscreen ? 'mx-4 mt-4' : ''}`}>
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left - Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
                <Zap size={20} />
              </div>
              <div>
                <h1 className="font-bold text-lg text-calm-900">Week {weekNumber}, Day {dayNumber}: {content.title}</h1>
                <p className="text-calm-500 text-sm">
                  {isTrainer ? '🎓 Trainer View' : '📚 Trainee View'} • Live Session
                </p>
              </div>
            </div>
          </div>

          {/* Center - View Mode Toggle */}
          <div className="flex items-center gap-1 bg-calm-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('split')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'split' ? 'bg-primary-500 text-white shadow-lg' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-200'
              }`}
              title="Split View (Press 1)"
            >
              <Columns size={16} className="inline mr-2" />
              Split
            </button>
            <button
              onClick={() => setViewMode('content')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'content' ? 'bg-primary-500 text-white shadow-lg' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-200'
              }`}
              title="Content Only (Press 2)"
            >
              <BookOpen size={16} className="inline mr-2" />
              Content
            </button>
            <button
              onClick={() => setViewMode('classroom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'classroom' ? 'bg-primary-500 text-white shadow-lg' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-200'
              }`}
              title="Classroom Only (Press 3)"
            >
              <Monitor size={16} className="inline mr-2" />
              Classroom
            </button>
          </div>

          {/* Right - Controls */}
          <div className="flex items-center gap-2">
            {/* Recording Indicator */}
            {isRecording && (
              <RecordingIndicator isPaused={isPaused} size="sm" />
            )}
            
            {/* Recording Controls Toggle - Trainer Only */}
            {isTrainer && (
              <button
                onClick={() => setShowRecordingControls(!showRecordingControls)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  isRecording 
                    ? 'bg-danger-500 text-white hover:bg-danger-600' 
                    : 'bg-danger-100 text-danger-700 hover:bg-danger-200'
                }`}
              >
                {isRecording ? '● REC' : 'Record'}
              </button>
            )}
            
            {isTrainer && (
              <button
                onClick={copyShareLink}
                className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 rounded-xl text-white transition-colors shadow-md"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Share Link'}
              </button>
            )}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl transition-colors ${soundEnabled ? 'bg-calm-200 text-calm-700' : 'bg-calm-100 text-calm-400'}`}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2.5 rounded-xl transition-colors ${showChat ? 'bg-calm-200 text-calm-700' : 'bg-calm-100 text-calm-400'}`}
            >
              <MessageSquare size={18} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-calm-200 text-calm-700 hover:bg-calm-300 transition-colors"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <Link
              to="/weeks"
              className="p-2.5 rounded-xl bg-calm-100 text-calm-500 hover:text-calm-700 hover:bg-calm-200 transition-colors"
              title="Exit Presentation"
            >
              <ExternalLink size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex gap-4 ${isFullscreen ? 'px-4' : ''}`} style={{ height: isFullscreen ? 'calc(100vh - 100px)' : 'calc(100vh - 180px)' }}>
        {/* Week Content Panel */}
        {(viewMode === 'split' || viewMode === 'content') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg flex flex-col overflow-hidden`}>
            {/* Content Tabs */}
            <div className="flex border-b border-calm-200">
              {[
                { id: 'slides' as ContentTab, label: 'Slides', icon: Presentation },
                { id: 'notes' as ContentTab, label: 'Notes', icon: BookOpen },
                { id: 'activities' as ContentTab, label: 'Activities', icon: Users },
                { id: 'outcomes' as ContentTab, label: 'Outcomes', icon: Target },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setContentTab(tab.id)}
                  className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                    contentTab === tab.id 
                      ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50' 
                      : 'text-calm-500 hover:text-calm-700 hover:bg-calm-50'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {contentTab === 'slides' && (
                <div className="h-full flex flex-col">
                  {/* Slide Display */}
                  <div className="flex-1 bg-calm-100 rounded-xl flex items-center justify-center relative overflow-hidden min-h-[300px] border border-calm-200">
                    <div className="text-center text-calm-500">
                      <Presentation size={64} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg text-calm-700">Slide {currentSlideIndex + 1}</p>
                      <p className="text-sm mt-2 text-calm-500">Week {weekNumber}, Day {dayNumber} Content</p>
                    </div>
                    {/* Slide number badge */}
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-sm text-calm-700 shadow-md border border-calm-200">
                      {currentSlideIndex + 1} / {content.slides.length}
                    </div>
                  </div>
                  
                  {/* Slide Navigation */}
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                      onClick={prevSlide}
                      disabled={currentSlideIndex === 0}
                      className="p-3 rounded-xl bg-calm-200 hover:bg-calm-300 text-calm-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    {/* Slide dots */}
                    <div className="flex gap-1.5">
                      {content.slides.slice(0, 12).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentSlideIndex(i)}
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            i === currentSlideIndex 
                              ? 'bg-primary-500 scale-125' 
                              : 'bg-calm-300 hover:bg-calm-400'
                          }`}
                        />
                      ))}
                    </div>
                    
                    <button
                      onClick={nextSlide}
                      disabled={currentSlideIndex === content.slides.length - 1}
                      className="p-3 rounded-xl bg-calm-200 hover:bg-calm-300 text-calm-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {contentTab === 'notes' && (
                <div className="prose-calm max-w-none">
                  <ReactMarkdown>{content.trainerNotes}</ReactMarkdown>
                </div>
              )}

              {contentTab === 'activities' && (
                <div className="space-y-4">
                  {content.activities.map((activity, i) => (
                    <div key={activity.id} className="bg-calm-50 rounded-xl p-4 border border-calm-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-100 text-accent-600 flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-calm-900">{activity.title}</h3>
                          <div className="flex items-center gap-3 text-sm text-calm-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {activity.duration}
                            </span>
                            <span className="bg-calm-200 px-2 py-0.5 rounded-full text-xs capitalize text-calm-700">
                              {activity.type}
                            </span>
                          </div>
                          <p className="text-calm-600 text-sm mt-2">{activity.description}</p>
                          {isTrainer && (
                            <p className="text-calm-500 text-sm mt-2 italic border-l-2 border-primary-500 pl-3 bg-primary-50 py-2 pr-3 rounded-r-lg">
                              {activity.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {contentTab === 'outcomes' && (
                <div className="space-y-3">
                  <p className="text-calm-500 text-sm mb-4">Track learning outcomes for this session:</p>
                  {content.outcomes.map((outcome) => (
                    <button
                      key={outcome.id}
                      onClick={() => toggleOutcome(outcome.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        completedOutcomes.has(outcome.id)
                          ? 'bg-success-50 border-success-300 text-success-700'
                          : 'bg-calm-50 border-calm-200 text-calm-700 hover:border-calm-300 hover:bg-calm-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          completedOutcomes.has(outcome.id) ? 'bg-success-500 text-white' : 'bg-calm-200'
                        }`}>
                          {completedOutcomes.has(outcome.id) && <Check size={14} />}
                        </div>
                        <span>{outcome.description}</span>
                      </div>
                    </button>
                  ))}
                  <div className="mt-4 p-3 bg-primary-50 rounded-xl text-center border border-primary-200">
                    <span className="text-2xl font-bold text-primary-600">
                      {completedOutcomes.size}/{content.outcomes.length}
                    </span>
                    <span className="text-calm-500 text-sm ml-2">outcomes completed</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Classroom Panel */}
        {(viewMode === 'split' || viewMode === 'classroom') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} flex flex-col gap-4`}>
            {/* Screen Share Area */}
            <div className="flex-1 bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg flex flex-col overflow-hidden">
              <div className="flex-1 bg-calm-100 m-4 rounded-xl flex items-center justify-center relative border border-calm-200">
                <div className="text-center text-calm-500">
                  <Monitor size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg text-calm-700">Trainer Screen Share</p>
                  <p className="text-sm mt-2 text-calm-500">The presentation will appear here during live sessions</p>
                </div>
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-danger-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-md">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              </div>
            </div>

            {/* Support Button - For Trainees */}
            {!isTrainer && (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg p-4">
                {!mySupport.active ? (
                  <button
                    onClick={requestSupport}
                    className="w-full py-4 bg-gradient-to-r from-warning-500 to-orange-500 hover:from-warning-400 hover:to-orange-400 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-warning-500/25"
                  >
                    <Hand size={24} />
                    I need help / support
                  </button>
                ) : (
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-3 text-lg font-semibold mb-2">
                      {mySupport.acknowledged ? (
                        <>
                          <CheckCircle size={24} className="text-success-500" />
                          <span className="text-success-700">Trainer has seen your request!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={24} className="text-warning-500 animate-pulse" />
                          <span className="text-warning-700">Support request sent...</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={cancelSupport}
                      className="text-sm text-calm-500 hover:text-calm-700 underline"
                    >
                      Cancel request
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Support Requests - For Trainers */}
            {isTrainer && supportRequests.length > 0 && (
              <div className="bg-warning-50 backdrop-blur-xl rounded-2xl border border-warning-300 p-4">
                <h3 className="font-semibold text-warning-700 mb-2 flex items-center gap-2">
                  <Hand size={18} />
                  Support Requests ({supportRequests.length})
                </h3>
                {/* List support requests here */}
              </div>
            )}
          </div>
        )}

        {/* Chat Panel - Slides out from right */}
        {showChat && (
          <div className="w-80 bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-primary-500" />
                <span className="font-semibold text-calm-900">Session Chat</span>
              </div>
              <span className="text-xs text-calm-500 bg-calm-100 px-2 py-1 rounded-full">
                <Users size={12} className="inline mr-1" />
                {messages.filter(m => m.senderType === 'trainee').length + 1} online
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-calm-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-3 ${
                    msg.senderType === 'trainer'
                      ? 'bg-primary-100 border-l-4 border-primary-500'
                      : msg.senderName === 'You'
                      ? 'bg-accent-100 ml-4'
                      : 'bg-white border border-calm-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`font-medium ${
                      msg.senderType === 'trainer' ? 'text-primary-700' : 'text-calm-700'
                    }`}>
                      {msg.senderName}
                      {msg.senderType === 'trainer' && ' 🎓'}
                    </span>
                    <span className="text-calm-400">{formatTime(msg.timestamp)}</span>
                  </div>
                  <p className="text-sm text-calm-800">{msg.message}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 border-t border-calm-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-calm-50 border border-calm-200 rounded-xl px-4 py-2.5 text-calm-900 placeholder:text-calm-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2.5 bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 left-4 text-xs text-calm-600 bg-white/90 backdrop-blur shadow-md border border-calm-200 px-3 py-2 rounded-lg">
        <span className="text-calm-500">Shortcuts:</span> ← → Navigate slides • 1 2 3 Change view • F Fullscreen
      </div>

      {/* Recording Controls Panel - Trainer Only */}
      {isTrainer && showRecordingControls && (
        <div className="fixed bottom-4 right-4 z-50">
          <RecordingControls
            weekNumber={weekNumber}
            dayNumber={dayNumber}
            cohortId="default-cohort"
            onRecordingStart={handleRecordingStart}
            onRecordingPause={handleRecordingPause}
            onRecordingResume={handleRecordingResume}
            onRecordingStop={handleRecordingStop}
            onClose={() => setShowRecordingControls(false)}
          />
        </div>
      )}
    </div>
  );
}

// Helper functions for demo content
function getDayTitle(week: number, day: number): string {
  const dayData: Record<number, string[]> = {
    1: ['Welcome & Introduction', 'Initial Assessments', 'Programme Overview', 'Tools & Setup'],
    2: ['Computer Basics', 'Internet & Email', 'File Management', 'Online Safety'],
    3: ['Written Communication', 'Video Calls & Meetings', 'Team Collaboration', 'Feedback & Reflection'],
    4: ['Critical Thinking', 'Creative Problem Solving', 'Decision Making', 'Innovation Workshop'],
    5: ['CV Building', 'Job Searching', 'Interview Skills', 'Personal Branding'],
    6: ['Project Planning', 'Project Development', 'Presentation Prep', 'Graduation & Next Steps'],
  };
  return dayData[week]?.[day - 1] || `Day ${day}`;
}

function getDayOverview(week: number, day: number): string {
  const dayFocuses: Record<number, string[]> = {
    1: ['Getting to know each other and the programme', 'Understanding baseline skills', 'Understanding the 6-week journey', 'Setting up required tools'],
    2: ['Understanding hardware and software', 'Navigating the web and email', 'Organizing digital files', 'Staying safe online'],
    3: ['Professional writing skills', 'Effective video communication', 'Working together remotely', 'Giving and receiving feedback'],
    4: ['Analyzing information effectively', 'Generating creative solutions', 'Making informed decisions', 'Putting skills into practice'],
    5: ['Creating an effective CV', 'Finding opportunities', 'Preparing for interviews', 'Building your professional presence'],
    6: ['Planning your final project', 'Building and refining', 'Preparing your presentation', 'Celebrating and looking forward'],
  };
  return dayFocuses[week]?.[day - 1] || '';
}

function getTrainerNotes(week: number, day: number): string {
  return `# Week ${week}, Day ${day} Trainer Notes

## Session Overview
This is day ${day} of week ${week}. Today's focus is on ${getDayTitle(week, day).toLowerCase()}.

## Before the Session
- Review the slides and activities
- Ensure all resources are ready
- Test any technology you'll be using
- Prepare the virtual classroom

## Key Points to Cover
- Welcome and recap from previous day
- Introduce today's learning objectives
- Guide through main activities
- Check understanding throughout

## Tips for This Session
- Start with a brief energizer
- Use breakout rooms for group work
- Allow time for questions
- End with a clear summary

## Common Challenges
- Technical difficulties: Have backup plans ready
- Quiet participants: Use chat and direct questions
- Time management: Keep an eye on the clock

## Notes
_Add your own notes here during or after the session._`;
}

function getActivities(week: number, day: number): Activity[] {
  return [
    {
      id: `w${week}d${day}-act1`,
      title: 'Welcome & Energizer',
      duration: '10 mins',
      type: 'group',
      description: 'Quick warm-up activity to get everyone engaged',
      instructions: 'Start with a quick round of how everyone is feeling today. Use a simple check-in question.',
    },
    {
      id: `w${week}d${day}-act2`,
      title: 'Main Learning Activity',
      duration: '40 mins',
      type: 'practical',
      description: 'Hands-on practice with today\'s key concepts',
      instructions: 'Guide trainees through the practical exercise. Demonstrate first, then let them try.',
    },
    {
      id: `w${week}d${day}-act3`,
      title: 'Group Discussion',
      duration: '25 mins',
      type: 'discussion',
      description: 'Reflect on learning and share experiences',
      instructions: 'Facilitate discussion using open questions. Ensure everyone has a chance to contribute.',
    },
    {
      id: `w${week}d${day}-act4`,
      title: 'Practice Exercise',
      duration: '25 mins',
      type: 'individual',
      description: 'Individual practice to reinforce learning',
      instructions: 'Give clear instructions. Be available for questions but encourage independent work.',
    },
    {
      id: `w${week}d${day}-act5`,
      title: 'Wrap-up & Preview',
      duration: '10 mins',
      type: 'group',
      description: 'Summarize key points and preview next session',
      instructions: 'Recap the main takeaways. Answer any final questions. Preview what\'s coming next.',
    },
  ];
}

function getOutcomes(week: number, day: number): Outcome[] {
  return [
    { id: `w${week}d${day}-out1`, description: 'Trainee understands the day\'s key concepts' },
    { id: `w${week}d${day}-out2`, description: 'Practical skills demonstrated successfully' },
    { id: `w${week}d${day}-out3`, description: 'Participated actively in group activities' },
    { id: `w${week}d${day}-out4`, description: 'Completed individual practice exercise' },
    { id: `w${week}d${day}-out5`, description: 'Questions addressed and understanding confirmed' },
  ];
}
