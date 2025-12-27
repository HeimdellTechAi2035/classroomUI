import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Monitor,
  Settings,
  Activity,
  Clock,
  Trash2,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  LogOut,
  Shield,
  Calendar,
  MessageSquare,
  BarChart3,
  Lock,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  Zap,
  Home,
} from 'lucide-react';

interface Session {
  roomCode: string;
  trainerName: string;
  weekNumber: number;
  dayNumber: number;
  participantCount: number;
  createdAt: string;
  messageCount: number;
}

interface ServerStats {
  status: 'online' | 'offline';
  sessions: number;
  uptime?: string;
  version?: string;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'sessions' | 'analytics' | 'settings'>('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [serverStats, setServerStats] = useState<ServerStats>({ status: 'offline', sessions: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('wsServerUrl') || 'ws://localhost:3001');
  const [copied, setCopied] = useState('');
  
  // Admin credentials
  const ADMIN_USERNAME = 'TrainerAdmin';
  const ADMIN_PASSWORD = 'RemoteTrainer2026';

  useEffect(() => {
    // Check if already authenticated this session
    const auth = sessionStorage.getItem('adminAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchServerStatus();
      const interval = setInterval(fetchServerStatus, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
      setAuthError('');
    } else {
      setAuthError('Incorrect username or password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
    setUsername('');
    setPassword('');
  };

  const fetchServerStatus = async () => {
    setIsLoading(true);
    try {
      const httpUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      
      // Fetch health status
      const healthResponse = await fetch(`${httpUrl}/health`);
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setServerStats({
          status: 'online',
          sessions: health.sessions || 0,
          uptime: health.uptime,
          version: health.version,
        });
      }
      
      // Fetch sessions list
      const sessionsResponse = await fetch(`${httpUrl}/admin/sessions`);
      if (sessionsResponse.ok) {
        const data = await sessionsResponse.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      setServerStats({ status: 'offline', sessions: 0 });
      setSessions([]);
    }
    setIsLoading(false);
  };

  const endSession = async (roomCode: string) => {
    if (!confirm(`Are you sure you want to end session ${roomCode}?`)) return;
    
    try {
      const httpUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
      await fetch(`${httpUrl}/admin/sessions/${roomCode}`, { method: 'DELETE' });
      fetchServerStatus();
    } catch (err) {
      alert('Failed to end session');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const saveServerUrl = () => {
    localStorage.setItem('wsServerUrl', serverUrl);
    alert('Server URL saved! The app will use this URL for connections.');
    fetchServerStatus();
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-calm-900 via-calm-800 to-calm-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-calm-800/50 backdrop-blur-xl rounded-2xl border border-calm-700 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-calm-400 mt-2">RemoteAbility Classroom</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-calm-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-calm-700/50 border border-calm-600 rounded-xl text-white placeholder-calm-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter username"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-calm-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-calm-700/50 border border-calm-600 rounded-xl text-white placeholder-calm-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter password"
                />
              </div>
              
              {authError && (
                <div className="flex items-center gap-2 text-danger-400 text-sm">
                  <AlertCircle size={16} />
                  {authError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Lock size={18} className="inline mr-2" />
                Login to Dashboard
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <Link to="/" className="text-calm-400 hover:text-white text-sm transition-colors">
                ← Back to Classroom
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-calm-900 via-calm-800 to-calm-900 text-white">
      {/* Header */}
      <header className="bg-calm-800/50 backdrop-blur-xl border-b border-calm-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Zap size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-calm-400 text-sm">RemoteAbility Classroom</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Server Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                serverStats.status === 'online' ? 'bg-success-500/20 text-success-400' : 'bg-danger-500/20 text-danger-400'
              }`}>
                {serverStats.status === 'online' ? <Wifi size={16} /> : <WifiOff size={16} />}
                <span className="text-sm font-medium capitalize">{serverStats.status}</span>
              </div>
              
              <button
                onClick={fetchServerStatus}
                disabled={isLoading}
                className="p-2 text-calm-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
              </button>
              
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 bg-calm-700 hover:bg-calm-600 rounded-lg transition-colors"
              >
                <Home size={18} />
                <span className="hidden sm:inline">Classroom</span>
              </Link>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-danger-500/20 text-danger-400 hover:bg-danger-500/30 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-calm-800/50 backdrop-blur-xl rounded-xl border border-calm-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-calm-400 text-sm">Active Sessions</p>
                <p className="text-3xl font-bold mt-1">{serverStats.sessions}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Monitor size={24} className="text-primary-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-calm-800/50 backdrop-blur-xl rounded-xl border border-calm-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-calm-400 text-sm">Total Participants</p>
                <p className="text-3xl font-bold mt-1">
                  {sessions.reduce((acc, s) => acc + s.participantCount, 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                <Users size={24} className="text-accent-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-calm-800/50 backdrop-blur-xl rounded-xl border border-calm-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-calm-400 text-sm">Chat Messages</p>
                <p className="text-3xl font-bold mt-1">
                  {sessions.reduce((acc, s) => acc + s.messageCount, 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success-500/20 flex items-center justify-center">
                <MessageSquare size={24} className="text-success-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-calm-800/50 backdrop-blur-xl rounded-xl border border-calm-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-calm-400 text-sm">Server Status</p>
                <p className="text-xl font-bold mt-1 capitalize">{serverStats.status}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                serverStats.status === 'online' ? 'bg-success-500/20' : 'bg-danger-500/20'
              }`}>
                <Server size={24} className={serverStats.status === 'online' ? 'text-success-400' : 'text-danger-400'} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'sessions', label: 'Live Sessions', icon: Monitor },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-calm-700/50 text-calm-300 hover:bg-calm-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'sessions' && (
          <div className="bg-calm-800/50 backdrop-blur-xl rounded-xl border border-calm-700 overflow-hidden">
            <div className="p-4 border-b border-calm-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active Sessions</h2>
              <span className="text-calm-400 text-sm">{sessions.length} session(s)</span>
            </div>
            
            {sessions.length === 0 ? (
              <div className="p-12 text-center text-calm-400">
                <Monitor size={48} className="mx-auto mb-4 opacity-50" />
                <p>No active sessions</p>
                <p className="text-sm mt-2">Sessions will appear here when trainers start them</p>
              </div>
            ) : (
              <div className="divide-y divide-calm-700">
                {sessions.map(session => (
                  <div key={session.roomCode} className="p-4 hover:bg-calm-700/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                          <span className="text-primary-400 font-bold">{session.roomCode}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Week {session.weekNumber}, Day {session.dayNumber}</span>
                            <span className="px-2 py-0.5 bg-success-500/20 text-success-400 text-xs rounded-full">
                              Live
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-calm-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              {session.participantCount} participants
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare size={14} />
                              {session.messageCount} messages
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {new Date(session.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/join?code=${session.roomCode}`, session.roomCode)}
                          className="p-2 text-calm-400 hover:text-white hover:bg-calm-600 rounded-lg transition-colors"
                          title="Copy join link"
                        >
                          {copied === session.roomCode ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                        <button
                          onClick={() => endSession(session.roomCode)}
                          className="p-2 text-danger-400 hover:text-white hover:bg-danger-500/20 rounded-lg transition-colors"
                          title="End session"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-calm-800/50 backdrop-blur-xl rounded-xl border border-calm-700 p-8">
            <div className="text-center text-calm-400">
              <BarChart3 size={64} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-white mb-2">Analytics Coming Soon</h3>
              <p>Detailed attendance, engagement, and session analytics will be available here.</p>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 bg-calm-700/50 rounded-lg">
                  <Calendar size={24} className="mx-auto mb-2 text-primary-400" />
                  <p className="text-sm">Attendance Tracking</p>
                </div>
                <div className="p-4 bg-calm-700/50 rounded-lg">
                  <Activity size={24} className="mx-auto mb-2 text-accent-400" />
                  <p className="text-sm">Engagement Metrics</p>
                </div>
                <div className="p-4 bg-calm-700/50 rounded-lg">
                  <Clock size={24} className="mx-auto mb-2 text-success-400" />
                  <p className="text-sm">Session History</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Server Configuration */}
            <div className="bg-calm-800/50 backdrop-blur-xl rounded-xl border border-calm-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Server size={20} />
                Server Configuration
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-calm-300 mb-2">
                    WebSocket Server URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      className="flex-1 px-4 py-2 bg-calm-700/50 border border-calm-600 rounded-lg text-white placeholder-calm-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="ws://localhost:3001"
                    />
                    <button
                      onClick={saveServerUrl}
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-calm-400 text-sm mt-2">
                    For local development: <code className="text-calm-300">ws://localhost:3001</code>
                    <br />
                    For production: <code className="text-calm-300">wss://your-server.railway.app</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-calm-800/50 backdrop-blur-xl rounded-xl border border-calm-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity size={20} />
                Quick Links
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href={serverUrl.replace('ws://', 'http://').replace('wss://', 'https://') + '/health'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-calm-700/50 hover:bg-calm-700 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-success-500/20 flex items-center justify-center">
                    <CheckCircle size={20} className="text-success-400" />
                  </div>
                  <div>
                    <p className="font-medium">Server Health Check</p>
                    <p className="text-calm-400 text-sm">View server status JSON</p>
                  </div>
                </a>
                
                <Link
                  to="/join"
                  className="flex items-center gap-3 p-4 bg-calm-700/50 hover:bg-calm-700 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <Users size={20} className="text-primary-400" />
                  </div>
                  <div>
                    <p className="font-medium">Trainee Join Page</p>
                    <p className="text-calm-400 text-sm">Where trainees enter room codes</p>
                  </div>
                </Link>
                
                <Link
                  to="/presentation?week=1&day=1&role=trainer"
                  className="flex items-center gap-3 p-4 bg-calm-700/50 hover:bg-calm-700 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                    <Monitor size={20} className="text-accent-400" />
                  </div>
                  <div>
                    <p className="font-medium">Trainer View</p>
                    <p className="text-calm-400 text-sm">Start a presentation</p>
                  </div>
                </Link>
                
                <Link
                  to="/weeks"
                  className="flex items-center gap-3 p-4 bg-calm-700/50 hover:bg-calm-700 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Calendar size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium">Weeks Library</p>
                    <p className="text-calm-400 text-sm">Browse all training weeks</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Deployment Info */}
            <div className="bg-calm-800/50 backdrop-blur-xl rounded-xl border border-calm-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap size={20} />
                Deployment Info
              </h3>
              
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-calm-300">
                  This app requires two deployments:
                </p>
                <ul className="text-calm-300 space-y-2 mt-4">
                  <li>
                    <strong className="text-white">Frontend (React):</strong> Deploy to Netlify or Vercel
                  </li>
                  <li>
                    <strong className="text-white">WebSocket Server:</strong> Deploy to Railway or Render
                  </li>
                </ul>
                <p className="text-calm-400 text-sm mt-4">
                  After deploying the server, update the WebSocket Server URL above with your production URL.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
