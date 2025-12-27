import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import Layout from './components/Layout';
import FirstRunWizard from './pages/FirstRunWizard';
import Login from './pages/Login';
import TodaysSession from './pages/TodaysSession';
import WeeksLibrary from './pages/WeeksLibrary';
import WeekDetail from './pages/WeekDetail';
import LiveClassroom from './pages/LiveClassroom';
import PresentationView from './pages/PresentationView';
import JoinSession from './pages/JoinSession';
import TraineeSessionView from './pages/TraineeSessionView';
import AdminDashboard from './pages/AdminDashboard';
import Resources from './pages/Resources';
import Policies from './pages/Policies';
import People from './pages/People';
import TrainerToolkit from './pages/TrainerToolkit';
import Settings from './pages/Settings';
import AuditViewer from './pages/AuditViewer';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = localStorage.getItem('isTrainerAuthenticated') === 'true';
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  const { config, loadConfig, accessibility } = useAppStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    loadConfig();
    setAuthChecked(true);
  }, [loadConfig]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('font-size-normal', 'font-size-large', 'font-size-extra-large');
    html.classList.add(`font-size-${accessibility.fontSize}`);
    if (accessibility.highContrast) {
      html.classList.add('high-contrast');
    } else {
      html.classList.remove('high-contrast');
    }
    if (accessibility.reduceMotion) {
      html.classList.add('reduce-motion');
    } else {
      html.classList.remove('reduce-motion');
    }
  }, [accessibility]);

  if (config?.needsSetup) {
    return <FirstRunWizard />;
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-calm-50">
        <div className="animate-pulse text-calm-600">Loading...</div>
      </div>
    );
  }

  const isAuthenticated = localStorage.getItem('isTrainerAuthenticated') === 'true';

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/session" replace /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/session" replace /> : <Login />} />
      <Route path="/join" element={<JoinSession />} />
      <Route path="/session-live" element={<TraineeSessionView />} />
      <Route path="/preview" element={<TraineeSessionView />} />
      <Route path="/present" element={<PresentationView />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/session" element={<ProtectedRoute><Layout><TodaysSession /></Layout></ProtectedRoute>} />
      <Route path="/weeks" element={<ProtectedRoute><Layout><WeeksLibrary /></Layout></ProtectedRoute>} />
      <Route path="/weeks/:weekNumber" element={<ProtectedRoute><Layout><WeekDetail /></Layout></ProtectedRoute>} />
      <Route path="/classroom" element={<ProtectedRoute><Layout><LiveClassroom /></Layout></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute><Layout><Resources /></Layout></ProtectedRoute>} />
      <Route path="/policies" element={<ProtectedRoute><Layout><Policies /></Layout></ProtectedRoute>} />
      <Route path="/people" element={<ProtectedRoute><Layout><People /></Layout></ProtectedRoute>} />
      <Route path="/toolkit" element={<ProtectedRoute><Layout><TrainerToolkit /></Layout></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute><Layout><AuditViewer /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
