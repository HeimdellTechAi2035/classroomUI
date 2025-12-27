import { ReactNode, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import {
  Home,
  BookOpen,
  Monitor,
  FolderOpen,
  FileText,
  Users,
  Wrench,
  Settings,
  Menu,
  X,
  Wifi,
  WifiOff,
  ChevronLeft,
  Sun,
  Moon,
  Type,
  Sparkles,
  Zap,
  Shield,
  LogOut,
} from 'lucide-react';
import AccessibilityPanel from './AccessibilityPanel';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/weeks', icon: BookOpen, label: 'Weeks 1-6', color: 'text-accent-500' },
  { path: '/resources', icon: FolderOpen, label: 'Resources', color: 'text-warning-500' },
  { path: '/policies', icon: FileText, label: 'Policies', color: 'text-calm-500' },
  { path: '/people', icon: Users, label: 'People', color: 'text-primary-400' },
  { path: '/toolkit', icon: Wrench, label: 'Trainer Toolkit', color: 'text-accent-400' },
  { path: '/audit', icon: Shield, label: 'Session Recordings', color: 'text-success-500' },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOffline, aiEnabled, sessionStatus, accessibility } = useAppStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('isTrainerAuthenticated');
    localStorage.removeItem('trainerLoginTime');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-calm-50">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } bg-white border-r border-calm-200/60 flex flex-col transition-all duration-300 ease-out shadow-sm`}
      >
        {/* Logo / Header */}
        <div className="p-5 border-b border-calm-100">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <Zap className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="font-bold text-calm-900 tracking-tight">RemoteAbility</h1>
                  <p className="text-xs text-calm-400 font-medium">Classroom Platform</p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25 mx-auto">
                <Zap className="text-white" size={20} />
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute top-5 right-3 btn-icon text-calm-400 hover:text-calm-600 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {!sidebarCollapsed && (
            <p className="text-xs font-semibold text-calm-400 uppercase tracking-wider px-3 mb-3">Navigation</p>
          )}
          {navItems.map(({ path, icon: Icon, label, color }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ease-out relative group
                ${isActive 
                  ? 'bg-gradient-to-r from-primary-500/10 to-accent-500/10 text-primary-600 shadow-sm' 
                  : 'text-calm-500 hover:bg-calm-100/60 hover:text-calm-700'
                } ${sidebarCollapsed ? 'justify-center px-3' : ''}`
              }
              title={sidebarCollapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-primary-500 to-accent-500" />
                  )}
                  <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-primary-500' : ''}`} />
                  {!sidebarCollapsed && <span>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-calm-100 space-y-2 bg-calm-50/30">
          {/* Status indicators */}
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${isOffline ? 'bg-warning-50' : 'bg-success-50/50'} ${sidebarCollapsed ? 'justify-center' : ''}`}>
            {isOffline ? (
              <>
                <WifiOff size={16} className="text-warning-500" />
                {!sidebarCollapsed && <span className="text-sm text-warning-600 font-medium">Offline Mode</span>}
              </>
            ) : (
              <>
                <div className="relative">
                  <Wifi size={16} className="text-success-500" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success-400 rounded-full animate-pulse" />
                </div>
                {!sidebarCollapsed && <span className="text-sm text-success-600 font-medium">Connected</span>}
              </>
            )}
          </div>

          {/* Session status */}
          {sessionStatus === 'live' && (
            <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-danger-500/10 to-danger-500/5 border border-danger-200/50 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger-500"></span>
              </span>
              {!sidebarCollapsed && <span className="text-sm text-danger-600 font-semibold">Live Session</span>}
            </div>
          )}

          {/* AI Status */}
          {aiEnabled && (
            <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-primary-500/10 to-accent-500/10 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <Sparkles size={16} className="text-primary-500" />
              {!sidebarCollapsed && <span className="text-sm text-primary-600 font-medium">AI Active</span>}
            </div>
          )}

          {/* Accessibility button */}
          <button
            onClick={() => setShowAccessibility(true)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-calm-100 transition-all duration-200 ${sidebarCollapsed ? 'justify-center' : ''}`}
            title="Accessibility Settings"
          >
            <Type size={18} className="text-calm-400" />
            {!sidebarCollapsed && <span className="text-sm text-calm-500 font-medium">Accessibility</span>}
          </button>

          {/* Settings link */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all duration-200
              ${isActive 
                ? 'bg-calm-100 text-calm-700' 
                : 'text-calm-500 hover:bg-calm-100 hover:text-calm-700'
              } ${sidebarCollapsed ? 'justify-center' : ''}`
            }
            title={sidebarCollapsed ? 'Settings' : undefined}
          >
            <Settings size={18} />
            {!sidebarCollapsed && <span className="text-sm">Settings</span>}
          </NavLink>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 text-danger-500 hover:bg-danger-50 hover:text-danger-600 ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? 'Logout' : undefined}
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-calm-200/60 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="btn-icon text-calm-400 hover:text-calm-600 mr-2"
                aria-label="Expand sidebar"
              >
                <Menu size={20} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-calm-800 tracking-tight">
                {navItems.find(item => location.pathname.startsWith(item.path))?.label || 'RemoteAbility Classroom'}
              </h2>
              <p className="text-xs text-calm-400 mt-0.5">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick accessibility toggles */}
            <button
              onClick={() => useAppStore.getState().setAccessibility({ 
                highContrast: !accessibility.highContrast 
              })}
              className="btn-icon hover:bg-calm-100 rounded-xl"
              title={accessibility.highContrast ? 'Disable high contrast' : 'Enable high contrast'}
            >
              {accessibility.highContrast ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            
            <button
              onClick={() => setShowAccessibility(true)}
              className="btn-icon hover:bg-calm-100 rounded-xl"
              title="Accessibility settings"
            >
              <Type size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-calm-50 via-white to-calm-50">
          <div className="p-8 max-w-7xl mx-auto">
            {children}
          </div>
          <Footer />
        </main>
      </div>

      {/* Accessibility Panel Modal */}
      {showAccessibility && (
        <AccessibilityPanel onClose={() => setShowAccessibility(false)} />
      )}
    </div>
  );
}
