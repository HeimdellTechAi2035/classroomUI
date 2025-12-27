import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import Layout from './components/Layout';
import FirstRunWizard from './pages/FirstRunWizard';
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

function App() {
  const { config, loadConfig, accessibility } = useAppStore();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Apply accessibility settings
  useEffect(() => {
    const html = document.documentElement;
    
    // Font size
    html.classList.remove('font-size-normal', 'font-size-large', 'font-size-extra-large');
    html.classList.add(`font-size-${accessibility.fontSize}`);
    
    // High contrast
    if (accessibility.highContrast) {
      html.classList.add('high-contrast');
    } else {
      html.classList.remove('high-contrast');
    }
    
    // Reduce motion
    if (accessibility.reduceMotion) {
      html.classList.add('reduce-motion');
    } else {
      html.classList.remove('reduce-motion');
    }
  }, [accessibility]);

  // Show first-run wizard if needed
  if (config?.needsSetup) {
    return <FirstRunWizard />;
  }

  return (
    <Routes>
      {/* Presentation View - Full screen, no layout wrapper */}
      <Route path="/present" element={<PresentationView />} />
      
      {/* Join Session - For trainees to join */}
      <Route path="/join" element={<JoinSession />} />
      
      {/* Trainee Session View - Live session for trainees */}
      <Route path="/session-live" element={<TraineeSessionView />} />
      
      {/* Admin Dashboard - Password protected */}
      <Route path="/admin" element={<AdminDashboard />} />
      
      {/* Main App Routes with Layout */}
      <Route path="/*" element={
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/session" replace />} />
            <Route path="/session" element={<TodaysSession />} />
            <Route path="/weeks" element={<WeeksLibrary />} />
            <Route path="/weeks/:weekNumber" element={<WeekDetail />} />
            <Route path="/classroom" element={<LiveClassroom />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/people" element={<People />} />
            <Route path="/toolkit" element={<TrainerToolkit />} />
            <Route path="/audit" element={<AuditViewer />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}

export default App;
