import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, ArrowRight, Wifi, WifiOff, Settings, X, Loader2 } from 'lucide-react';
import wsService from '../services/websocket';

export default function JoinSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledCode = searchParams.get('code') || '';
  
  const [roomCode, setRoomCode] = useState(prefilledCode);
  const [participantName, setParticipantName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(wsService.getServerUrl());

  useEffect(() => {
    // Connect to WebSocket server on mount
    connectToServer();
    
    // Listen for join responses
    wsService.on('session-joined', handleSessionJoined);
    wsService.on('join-error', handleJoinError);
    wsService.on('disconnected', handleDisconnected);
    
    return () => {
      wsService.off('session-joined', handleSessionJoined);
      wsService.off('join-error', handleJoinError);
      wsService.off('disconnected', handleDisconnected);
    };
  }, []);

  const connectToServer = async () => {
    try {
      await wsService.connect();
      setIsConnected(true);
      setError('');
    } catch (err) {
      setIsConnected(false);
      setError('Unable to connect to server. Please check your connection.');
    }
  };

  const handleSessionJoined = (data: any) => {
    setIsConnecting(false);
    // Store participant info
    localStorage.setItem('participantName', participantName);
    localStorage.setItem('participantId', data.clientId);
    // Navigate to live session view
    navigate(`/session-live?code=${data.session.roomCode}&name=${encodeURIComponent(participantName)}`);
  };

  const handleJoinError = (data: any) => {
    setIsConnecting(false);
    setError(data.message || 'Unable to join session');
  };

  const handleDisconnected = () => {
    setIsConnected(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    if (!participantName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!isConnected) {
      setError('Not connected to server. Please wait...');
      await connectToServer();
      return;
    }
    
    setIsConnecting(true);
    wsService.joinSession(roomCode.trim(), participantName.trim());
  };

  const handleSaveSettings = () => {
    wsService.setServerUrl(serverUrl);
    setShowSettings(false);
    // Reconnect with new URL
    wsService.disconnect();
    connectToServer();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Users size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-calm-900">Join Session</h1>
          <p className="text-calm-600 mt-2">Enter the room code from your trainer</p>
        </div>

        {/* Connection Status */}
        <div className={`flex items-center justify-center gap-2 mb-6 px-4 py-2 rounded-lg ${
          isConnected ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
        }`}>
          {isConnected ? (
            <>
              <Wifi size={18} />
              <span className="text-sm font-medium">Connected to server</span>
            </>
          ) : (
            <>
              <WifiOff size={18} />
              <span className="text-sm font-medium">Connecting to server...</span>
            </>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="ml-auto p-1 hover:bg-black/10 rounded"
            title="Server settings"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Join Form */}
        <form onSubmit={handleJoin} className="bg-white rounded-2xl shadow-xl p-8 border border-calm-200">
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-5">
            {/* Room Code Input */}
            <div>
              <label htmlFor="roomCode" className="block text-sm font-medium text-calm-700 mb-2">
                Room Code
              </label>
              <input
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-4 py-3 text-2xl text-center font-mono tracking-[0.5em] bg-calm-50 border-2 border-calm-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all uppercase"
                disabled={isConnecting}
              />
            </div>

            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-calm-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-calm-50 border-2 border-calm-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all"
                disabled={isConnecting}
              />
            </div>

            {/* Join Button */}
            <button
              type="submit"
              disabled={isConnecting || !isConnected}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-calm-400 disabled:to-calm-500 text-white font-semibold rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-primary-500/25 disabled:shadow-none"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Session
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <p className="text-center text-calm-500 text-sm mt-6">
          Ask your trainer for the 6-digit room code to join the session
        </p>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-calm-900">Server Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-calm-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-calm-700 mb-2">
                  WebSocket Server URL
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="ws://localhost:3001"
                  className="w-full px-4 py-3 bg-calm-50 border-2 border-calm-200 rounded-xl focus:outline-none focus:border-primary-500"
                />
                <p className="text-xs text-calm-500 mt-2">
                  For local testing: ws://localhost:3001<br />
                  For production: wss://your-server.railway.app
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 py-3 border-2 border-calm-300 text-calm-700 rounded-xl hover:bg-calm-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                >
                  Save & Reconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
