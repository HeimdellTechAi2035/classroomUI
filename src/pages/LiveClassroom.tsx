import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor,
  MessageSquare,
  Hand,
  Users,
  Clock,
  Send,
  Settings,
  Volume2,
  VolumeX,
  AlertCircle,
  CheckCircle,
  Maximize2,
  Presentation,
  ExternalLink,
  BookOpen,
  Columns,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface ChatMessage {
  id: string;
  senderName: string;
  senderType: 'trainer' | 'trainee';
  message: string;
  timestamp: Date;
}

interface SupportStatus {
  hasRequest: boolean;
  requestedAt?: Date;
  acknowledged?: boolean;
}

export default function LiveClassroom() {
  const { currentSession } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [supportStatus, setSupportStatus] = useState<SupportStatus>({ hasRequest: false });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatMessages();
    // Poll for new messages in a real app
    const interval = setInterval(loadChatMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatMessages = async () => {
    if (window.electronAPI && currentSession) {
      try {
        const data = await window.electronAPI.db.query(
          'chat_messages',
          `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT 50`,
          [currentSession.id]
        ) as ChatMessage[];
        setMessages(data.reverse());
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    } else {
      // Demo messages
      setMessages([
        { id: '1', senderName: 'Trainer', senderType: 'trainer', message: 'Welcome everyone! We\'ll begin in a moment.', timestamp: new Date(Date.now() - 300000) },
        { id: '2', senderName: 'Alex', senderType: 'trainee', message: 'Hi! Ready to learn 😊', timestamp: new Date(Date.now() - 240000) },
        { id: '3', senderName: 'Jordan', senderType: 'trainee', message: 'Good morning!', timestamp: new Date(Date.now() - 180000) },
        { id: '4', senderName: 'Trainer', senderType: 'trainer', message: 'Great! Let\'s start with slide 1. Please let me know if you have questions.', timestamp: new Date(Date.now() - 60000) },
      ]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderName: 'You',
      senderType: 'trainee',
      message: newMessage.trim(),
      timestamp: new Date(),
    };

    if (window.electronAPI && currentSession) {
      await window.electronAPI.db.run(
        'chat_messages',
        `INSERT INTO chat_messages (id, session_id, sender_name, sender_type, message, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [message.id, currentSession.id, message.senderName, message.senderType, message.message, message.timestamp.toISOString()]
      );
    }

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const requestSupport = async () => {
    if (supportStatus.hasRequest) return;

    setSupportStatus({
      hasRequest: true,
      requestedAt: new Date(),
      acknowledged: false,
    });

    // Notify trainer
    if (window.electronAPI && currentSession) {
      await window.electronAPI.db.run(
        'support_flags',
        `INSERT INTO support_flags (session_id, trainee_name, created_at)
         VALUES (?, ?, ?)`,
        [currentSession.id, 'Trainee', new Date().toISOString()]
      );
    }
  };

  const cancelSupport = () => {
    setSupportStatus({ hasRequest: false });
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

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between py-4 px-2 border-b border-calm-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success-500 animate-pulse" />
            <span className="font-semibold text-calm-800">Live Session</span>
          </div>
          {currentSession && (
            <span className="text-calm-600">{currentSession.title}</span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Launch Presentation View */}
          <Link
            to="/present?week=1&role=trainer"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-400 hover:to-accent-400 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 transition-all"
          >
            <Columns size={18} />
            Split View
          </Link>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg ${soundEnabled ? 'bg-calm-100 text-calm-600' : 'bg-calm-200 text-calm-400'}`}
            title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-calm-100 text-calm-600 hover:bg-calm-200"
            title="Toggle fullscreen"
          >
            <Maximize2 size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Screen Share / Slides Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-calm-900 rounded-xl flex items-center justify-center relative overflow-hidden">
            {currentSlide ? (
              <img src={currentSlide} alt="Current slide" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-center text-calm-400">
                <Monitor size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Waiting for trainer to share screen...</p>
                <p className="text-sm mt-2">The presentation will appear here</p>
              </div>
            )}

            {/* Slide number indicator */}
            <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
              Slide 1 of 12
            </div>
          </div>

          {/* Support Request Button - PROMINENT */}
          <div className="mt-4">
            {!supportStatus.hasRequest ? (
              <button
                onClick={requestSupport}
                className="w-full py-4 bg-warning-100 hover:bg-warning-200 text-warning-800 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-colors"
              >
                <Hand size={24} />
                I need help / support
              </button>
            ) : (
              <div className="w-full py-4 bg-warning-50 border-2 border-warning-300 rounded-xl">
                <div className="flex items-center justify-center gap-3 text-warning-800 font-semibold">
                  {supportStatus.acknowledged ? (
                    <>
                      <CheckCircle size={24} className="text-success-500" />
                      Trainer has seen your request!
                    </>
                  ) : (
                    <>
                      <div className="animate-pulse">
                        <AlertCircle size={24} />
                      </div>
                      Support request sent - trainer will help you soon
                    </>
                  )}
                </div>
                <button
                  onClick={cancelSupport}
                  className="mt-2 text-sm text-warning-600 hover:text-warning-700 underline"
                >
                  Cancel request
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className={`${chatMinimized ? 'w-16' : 'w-80'} flex flex-col bg-white rounded-xl border border-calm-200 transition-all duration-300`}>
          {/* Chat Header */}
          <div className="flex items-center justify-between p-3 border-b border-calm-200">
            {!chatMinimized && (
              <>
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-primary-500" />
                  <span className="font-semibold text-calm-800">Session Chat</span>
                </div>
                <span className="text-xs text-calm-500">
                  <Users size={14} className="inline mr-1" />
                  {messages.filter(m => m.senderType === 'trainee').length + 1} online
                </span>
              </>
            )}
            <button
              onClick={() => setChatMinimized(!chatMinimized)}
              className="p-1 hover:bg-calm-100 rounded"
            >
              {chatMinimized ? <MessageSquare size={20} /> : '−'}
            </button>
          </div>

          {!chatMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${
                      msg.senderType === 'trainer'
                        ? 'bg-primary-50 border-l-4 border-primary-400'
                        : msg.senderName === 'You'
                        ? 'bg-calm-100 ml-4'
                        : 'bg-calm-50'
                    } rounded-lg p-2`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-medium ${
                        msg.senderType === 'trainer' ? 'text-primary-700' : 'text-calm-700'
                      }`}>
                        {msg.senderName}
                        {msg.senderType === 'trainer' && ' (Trainer)'}
                      </span>
                      <span className="text-calm-400">{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-sm text-calm-800">{msg.message}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-3 border-t border-calm-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="input-field flex-1"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="btn btn-primary p-2"
                  >
                    <Send size={18} />
                  </button>
                </div>
                <p className="text-xs text-calm-400 mt-2">
                  Press Enter to send. Be respectful! 💙
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="px-4 py-2 bg-calm-50 border-t border-calm-200 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-calm-600">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            Session time: 45:23
          </span>
        </div>
        <div className="text-calm-500">
          RemoteAbility Training • Week 1 Session
        </div>
      </div>
    </div>
  );
}
