import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Placeholder from './components/Placeholder'
import AlarmLog from './components/AlarmLog'
import WardsList from './components/WardsList'
import DrugRegistry from './components/DrugRegistry'
import Patients from './components/Patients'
import Analytics from './components/Analytics'
import Reports from './components/Reports'
import Auth from './components/Auth'
import Settings from './components/Settings'
import { AlarmProvider } from './context/AlarmContext'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeView, setActiveView] = useState('dashboard')

  function renderView() {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveView} />
      case 'alarms':
        return <AlarmLog />
      case 'wards':
        return <WardsList onNavigate={setActiveView} />
      case 'drugs':
        return <DrugRegistry />
      case 'patients':
        return <Patients />
      case 'analytics':
        return <Analytics />
      case 'reports':
        return <Reports />
      case 'settings':
        return <Settings />
      default:
        return <Placeholder view={activeView} />
    }
  }

  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />
  }

  return (
    <AlarmProvider>
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <div className="app-main">
        <Header activeView={activeView} onNavigate={setActiveView} />
        <main className="app-content">
          {renderView()}
        </main>
      </div>
    </AlarmProvider>
  )
}

export default App
