import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Dashboard } from './components/Dashboard';
import { ScribeSessionView } from './components/VedaSessionView';
import { AuthModal } from './components/AuthModal';
import { DoctorProfile } from './types';

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState<'dashboard' | 'session'>('dashboard');
  const [sessionLanguage, setSessionLanguage] = useState('English');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({
    qualification: 'BAMS',
    canPrescribeAllopathic: 'no'
  });

  const handleStartSession = (language: string) => {
    setSessionLanguage(language);
    setView('session');
  };

  const handleEndSession = () => {
    setView('dashboard');
  };

  // Login check wrapped UI
  if (!user && !showAuthModal) {
    // For demo purposes, if not logged in, we might show auth modal or just let them stay on dashboard with restricted access
    // But per current flow, let's auto-show auth modal if needed, or just let dashboard handle the login state display
  }

  return (
    <div className="min-h-screen bg-opd-bg text-opd-text-primary font-sans antialiased selection:bg-opd-primary/20">
      {view === 'dashboard' ? (
        <Dashboard
          doctorProfile={doctorProfile}
          onStartSession={handleStartSession}
          onBoout={logout}
        />
      ) : (
        <ScribeSessionView
          onEndSession={handleEndSession}
          doctorProfile={doctorProfile}
          language={sessionLanguage}
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab="login"
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
