import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Placeholder from './components/Placeholder';
import AlarmLog from './components/AlarmLog';
import WardsList from './components/WardsList';
import DrugRegistry from './components/DrugRegistry';
import Patients from './components/Patients';
import Analytics from './components/Analytics';
import Reports from './components/Reports';
import SimulationLab from './components/SimulationLab';
import PatientJourneys from './components/PatientJourneys';
import BaselineVsAnalyser from './components/BaselineVsAnalyser';
import ErrorAnalysis from './components/ErrorAnalysis';
import FailureModes from './components/FailureModes';
import Validation from './components/Validation';
import Documentation from './components/Documentation';
import Settings from './components/Settings';

// Contexts
import { AlarmProvider } from './context/AlarmContext';
import { AuthProvider } from './context/AuthContext';

// Modals
import AuthModal from './components/AuthModal';
import NewAlarmModal from './components/NewAlarmModal';
import NewPatientModal from './components/NewPatientModal';
import NewDrugModal from './components/NewDrugModal';
import NewWardModal from './components/NewWardModal';

import './App.css';

function MainLayout() {
  const [activeView, setActiveView] = useState('dashboard');

  // Modal open states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNewAlarmOpen, setIsNewAlarmOpen] = useState(false);
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isNewDrugOpen, setIsNewDrugOpen] = useState(false);
  const [isNewWardOpen, setIsNewWardOpen] = useState(false);

  function renderView() {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveView} />;
      case 'alarms':
        return <AlarmLog onOpenNewAlarm={() => setIsNewAlarmOpen(true)} />;
      case 'wards':
        return (
          <WardsList
            onNavigate={setActiveView}
            onOpenNewWard={() => setIsNewWardOpen(true)}
          />
        );
      case 'drugs':
        return (
          <DrugRegistry onOpenNewDrug={() => setIsNewDrugOpen(true)} />
        );
      case 'patients':
        return (
          <Patients onOpenNewPatient={() => setIsNewPatientOpen(true)} />
        );
      case 'analytics':
        return <Analytics />;
      case 'reports':
        return <Reports />;
      case 'simulation':
        return <SimulationLab />;
      case 'journeys':
        return <PatientJourneys />;
      case 'baseline':
        return <BaselineVsAnalyser />;
      case 'error-analysis':
        return <ErrorAnalysis />;
      case 'failure-modes':
        return <FailureModes />;
      case 'validation':
        return <Validation />;
      case 'docs':
        return <Documentation />;
      case 'settings':
        return <Settings />;
      default:
        return <Placeholder view={activeView} />;
    }
  }

  return (
    <>
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        onOpenAuth={() => setIsAuthOpen(true)}
      />
      <div className="app-main">
        <Header
          activeView={activeView}
          onNavigate={setActiveView}
          onOpenNewAlarm={() => setIsNewAlarmOpen(true)}
          onOpenNewPatient={() => setIsNewPatientOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
        <main className="app-content">{renderView()}</main>
      </div>

      {/* Interactive Entity and Auth Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <NewAlarmModal isOpen={isNewAlarmOpen} onClose={() => setIsNewAlarmOpen(false)} />
      <NewPatientModal isOpen={isNewPatientOpen} onClose={() => setIsNewPatientOpen(false)} />
      <NewDrugModal isOpen={isNewDrugOpen} onClose={() => setIsNewDrugOpen(false)} />
      <NewWardModal isOpen={isNewWardOpen} onClose={() => setIsNewWardOpen(false)} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AlarmProvider>
        <MainLayout />
      </AlarmProvider>
    </AuthProvider>
  );
}

export default App;
