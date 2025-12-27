import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Monitor,
  MessageSquare,
  Hand,
  Users,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  LogOut,
  Wifi,
  WifiOff,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import wsService, { Participant, ChatMessage, SessionState } from '../services/websocket';

export default function TraineeSessionView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get('code') || '';
  
  // Session State
  const [session, setSession] = useState<SessionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideContents, setSlideContents] = useState<string[]>([]);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Support State
  const [supportRequested, setSupportRequested] = useState(false);
  const [supportAcknowledged, setSupportAcknowledged] = useState(false);

  // Participants (excluding trainer)
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    // Setup WebSocket listeners
    wsService.on('slide-changed', handleSlideChange);
    wsService.on('chat-message', handleChatMessage);
    wsService.on('participant-joined', handleParticipantJoined);
    wsService.on('participant-left', handleParticipantLeft);
    wsService.on('session-ended', handleSessionEnded);
    wsService.on('disconnected', handleDisconnected);
    
    // Check if already connected with session data
    if (wsService.isConnected() && wsService.getRoomCode() === roomCode) {
      setIsConnected(true);
    } else {
      // Reconnect and rejoin
      reconnectToSession();
    }
    
    // Load slide content
    loadSlideContent();
    
    return () => {
      wsService.off('slide-changed', handleSlideChange);
      wsService.off('chat-message', handleChatMessage);
      wsService.off('participant-joined', handleParticipantJoined);
      wsService.off('participant-left', handleParticipantLeft);
      wsService.off('session-ended', handleSessionEnded);
      wsService.off('disconnected', handleDisconnected);
    };
  }, [roomCode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const reconnectToSession = async () => {
    try {
      await wsService.connect();
      const savedName = localStorage.getItem('participantName') || 'Participant';
      wsService.joinSession(roomCode, savedName);
      
      // Listen for rejoin response
      const handleRejoin = (data: any) => {
        setSession(data.session);
        setCurrentSlide(data.session.currentSlide);
        setMessages(data.session.messages);
        setParticipants(data.session.participants.filter((p: Participant) => !p.isTrainer));
        setIsConnected(true);
        wsService.off('session-joined', handleRejoin);
      };
      wsService.on('session-joined', handleRejoin);
    } catch (err) {
      console.error('Failed to reconnect:', err);
    }
  };

  const loadSlideContent = async () => {
    // In production, this would load from the server based on week/day
    // For now, using fallback content
    const fallbackSlides = [
      `# Welcome to Today's Session\n\n**Follow along with your trainer**\n\nThe slides will sync automatically as your trainer presents.`,
      `# Slide 2\n\nContent synced from trainer`,
      `# Slide 3\n\nContent synced from trainer`,
      `# Slide 4\n\nContent synced from trainer`,
      `# Slide 5\n\nContent synced from trainer`,
      `# Slide 6\n\nContent synced from trainer`,
      `# Slide 7\n\nContent synced from trainer`,
      `# Slide 8\n\nContent synced from trainer`,
    ];
    setSlideContents(fallbackSlides);
  };

  const handleSlideChange = (data: any) => {
    setCurrentSlide(data.slideIndex);
  };

  const handleChatMessage = (data: any) => {
    setMessages(prev => [...prev, data.message]);
  };

  const handleParticipantJoined = (data: any) => {
    setParticipants(data.participants.filter((p: Participant) => !p.isTrainer));
  };

  const handleParticipantLeft = (data: any) => {
    setParticipants(data.participants.filter((p: Participant) => !p.isTrainer));
  };

  const handleSessionEnded = (data: any) => {
    alert(data.reason || 'The session has ended');
    navigate('/join');
  };

  const handleDisconnected = () => {
    setIsConnected(false);
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    wsService.sendChatMessage(newMessage.trim());
    setNewMessage('');
  };

  const requestSupport = () => {
    setSupportRequested(true);
    // In production, this would send a support request to the trainer
    wsService.sendChatMessage('🙋 I need help / support');
  };

  const cancelSupport = () => {
    setSupportRequested(false);
    setSupportAcknowledged(false);
  };

  const leaveSession = () => {
    if (confirm('Are you sure you want to leave the session?')) {
      wsService.disconnect();
      navigate('/join');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen bg-gradient-to-br from-calm-100 via-white to-primary-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-calm-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Monitor size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-calm-900">
                {session ? `Week ${session.weekNumber}, Day ${session.dayNumber}` : 'Live Session'}
              </h1>
              <p className="text-xs text-calm-500">Room: {roomCode}</p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
          }`}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </div>
        </div>
        
        <button
          onClick={leaveSession}
          className="flex items-center gap-2 px-4 py-2 text-calm-600 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Leave
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Slide View */}
        <div className="flex-1 bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg flex flex-col overflow-hidden">
          {/* Slide Counter */}
          <div className="px-4 py-3 border-b border-calm-200 flex items-center justify-between bg-calm-50">
            <div className="flex items-center gap-2 text-calm-600">
              <Clock size={16} />
              <span className="text-sm">Following trainer's presentation</span>
            </div>
            <div className="flex items-center gap-2 bg-calm-800/80 text-white px-3 py-1 rounded-lg text-sm font-medium">
              Slide {currentSlide + 1} / {slideContents.length || 8}
            </div>
          </div>
          
          {/* Slide Content */}
          <div className="flex-1 p-8 overflow-auto">
            {slideContents[currentSlide] ? (
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-calm-900 mb-4 pb-3 border-b-4 border-primary-500">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold text-calm-800 mt-6 mb-3">{children}</h2>
                    ),
                    p: ({ children }) => (
                      <p className="text-calm-600 mb-4 leading-relaxed">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-calm-900">{children}</strong>
                    ),
                  }}
                >
                  {slideContents[currentSlide]}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-calm-500">
                <Monitor size={64} className="mb-4 opacity-50" />
                <p className="text-lg">Waiting for presentation...</p>
              </div>
            )}
          </div>

          {/* Slide Navigation (view only) */}
          <div className="p-4 bg-calm-100 border-t border-calm-200 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: slideContents.length || 8 }).map((_, index) => (
                <div
                  key={index}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === currentSlide 
                      ? 'bg-primary-500 w-6' 
                      : 'bg-calm-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Participants & Chat */}
        <div className="w-80 flex flex-col gap-4">
          {/* Participants */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-calm-50 border-b border-calm-200">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-primary-500" />
                <span className="font-semibold text-calm-900 text-sm">Participants</span>
              </div>
              <span className="text-xs bg-success-100 text-success-700 px-2 py-0.5 rounded-full">
                {participants.filter(p => p.isOnline).length} online
              </span>
            </div>
            
            <div className="p-2 grid grid-cols-5 gap-1.5">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="relative group"
                  title={participant.name}
                >
                  <div className={`w-12 h-12 rounded-lg ${participant.color} flex items-center justify-center text-white font-semibold text-sm shadow-sm ${
                    !participant.isOnline ? 'opacity-40 grayscale' : ''
                  }`}>
                    {participant.initials}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    participant.isOnline ? 'bg-success-500' : 'bg-calm-400'
                  }`} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-calm-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {participant.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Support Button */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg p-4">
            {!supportRequested ? (
              <button
                onClick={requestSupport}
                className="w-full py-3 bg-gradient-to-r from-warning-500 to-orange-500 hover:from-warning-400 hover:to-orange-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-warning-500/25"
              >
                <Hand size={20} />
                I need help / support
              </button>
            ) : (
              <div className="text-center py-2">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold mb-2">
                  {supportAcknowledged ? (
                    <>
                      <CheckCircle size={18} className="text-success-500" />
                      <span className="text-success-700">Trainer notified!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={18} className="text-warning-500 animate-pulse" />
                      <span className="text-warning-700">Request sent...</span>
                    </>
                  )}
                </div>
                <button
                  onClick={cancelSupport}
                  className="text-xs text-calm-500 hover:text-calm-700 underline"
                >
                  Cancel request
                </button>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="flex-1 bg-white/90 backdrop-blur-xl rounded-2xl border border-calm-200 shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-calm-50 border-b border-calm-200">
              <MessageSquare size={16} className="text-primary-500" />
              <span className="font-semibold text-calm-900 text-sm">Session Chat</span>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-calm-50 min-h-[150px]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg p-2 ${
                    msg.senderType === 'trainer'
                      ? 'bg-primary-100 border-l-3 border-primary-500'
                      : msg.senderId === wsService.getClientId()
                      ? 'bg-accent-100 ml-4'
                      : 'bg-white border border-calm-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className={`font-medium ${
                      msg.senderType === 'trainer' ? 'text-primary-700' : 'text-calm-700'
                    }`}>
                      {msg.senderName}
                      {msg.senderType === 'trainer' && ' 🎓'}
                    </span>
                    <span className="text-calm-400 text-[10px]">{formatTime(msg.timestamp)}</span>
                  </div>
                  <p className="text-sm text-calm-800">{msg.message}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="p-2 border-t border-calm-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-calm-50 border border-calm-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 rounded-lg transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
