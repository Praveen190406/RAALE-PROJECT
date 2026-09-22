import { useAlarms } from '../context/AlarmContext';
import { useAuth } from '../context/AuthContext';
import './Header.css';

export default function Header({
  activeView,
  onNavigate,
  onOpenNewAlarm,
  onOpenNewPatient,
  onOpenAuth,
}) {
  const { stats, refreshAlarms, dbConnected } = useAlarms();
  const { user } = useAuth();

  const VIEW_LABELS = {
    dashboard: 'Dashboard Overview',
    alarms: 'Alarm Log',
    drugs: 'Drug Registry',
    patients: 'Patients',
    wards: 'Wards',
    reports: 'Reports',
    analytics: 'Analytics',
    simulation: 'Simulation Lab',
    journeys: 'Patient Journeys',
    baseline: 'Baseline vs Analyser',
    'error-analysis': 'Error Analysis',
    'failure-modes': 'Failure Modes',
    validation: 'Validation & Feedback',
    docs: 'System Documentation',
    settings: 'System Settings & Preferences',
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="header">
      {/* Page title breadcrumb */}
      <div className="header-left">
        <div className="header-breadcrumb">
          <span className="header-breadcrumb-root">WardAlarm Sentinel</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="header-breadcrumb-current">{VIEW_LABELS[activeView] || activeView}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="header-right">
        {/* Quick Action Buttons */}
        <button
          className="btn btn-primary btn-sm"
          style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
          onClick={onOpenNewAlarm}
          title="Dispatch a clinical medication alarm"
        >
          <span>+</span> New Alarm
        </button>

        <button
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
          onClick={onOpenNewPatient}
          title="Admit new patient to ward"
        >
          <span>+</span> Admit Patient
        </button>

        {/* Date/time */}
        <div className="header-datetime">
          <span className="header-date">{dateStr}</span>
          <span className="header-time font-mono">{timeStr}</span>
        </div>

        {/* Alert bell with real active alarm count */}
        <button
          id="btn-global-alarms"
          className="header-icon-btn"
          onClick={() => onNavigate('alarms')}
          aria-label="View active alarms"
          title="Active Alarms"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="header-icon-badge">{stats.activeAlarms ?? 0}</span>
        </button>

        {/* Refresh button connected to backend API */}
        <button
          id="btn-refresh"
          className="header-icon-btn"
          onClick={() => refreshAlarms()}
          aria-label="Refresh data from database"
          title="Refresh Data"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>

        {/* Clinician Profile Trigger */}
        <button
          className="header-user-btn"
          onClick={onOpenAuth}
          title="Manage clinician authentication / switch account"
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid #334155',
            borderRadius: '20px',
            padding: '4px 10px 4px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            color: '#f1f5f9',
          }}
        >
          <span
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#0284c7',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {user ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2) : 'DR'}
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: '500' }}>
            {user ? user.name : 'Sign In'}
          </span>
        </button>
      </div>
    </header>
  );
}
