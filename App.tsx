import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { PreAuthDashboard } from './components/PreAuthDashboard/index';
import { PreAuthWizard } from './components/PreAuthWizard/index';
import { StatusTracker } from './components/PostSubmission/StatusTracker';
import { PreAuthRecord } from './components/PreAuthWizard/types';

const AppContent: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PreAuthRecord | null>(null);

  return (
    <div className="min-h-screen bg-gray-950">
      <PreAuthDashboard
        onNewPreAuth={() => { setSelectedRecord(null); setShowWizard(true); }}
        onOpenPreAuth={rec => setSelectedRecord(rec)}
        onSettings={() => { }}
      />

      {showWizard && (
        <PreAuthWizard onClose={() => setShowWizard(false)} />
      )}

      {selectedRecord && !showWizard && (
        <StatusTracker
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onRecordUpdate={r => setSelectedRecord(r)}
        />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;

