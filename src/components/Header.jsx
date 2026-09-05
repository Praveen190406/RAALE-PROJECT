import './Header.css'

export default function Header({ activeView, onNavigate }) {
  const VIEW_LABELS = {
    dashboard: 'Dashboard Overview',
    alarms:    'Alarm Log',
    drugs:     'Drug Registry',
    patients:  'Patients',
    wards:     'Wards',
    reports:   'Reports',
    analytics: 'Analytics',
    settings:  'Settings',
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <header className="header">
      {/* Page title breadcrumb */}
      <div className="header-left">
        <div className="header-breadcrumb">
          <span className="header-breadcrumb-root">WardAlarm Sentinel</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span className="header-breadcrumb-current">{VIEW_LABELS[activeView] || activeView}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="header-right">
        {/* Date/time */}
        <div className="header-datetime">
          <span className="header-date">{dateStr}</span>
          <span className="header-time font-mono">{timeStr}</span>
        </div>

        {/* Alert bell */}
        <button
          id="btn-global-alarms"
          className="header-icon-btn"
          onClick={() => onNavigate('alarms')}
          aria-label="View active alarms"
          title="Active Alarms"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="header-icon-badge">14</span>
        </button>

        {/* Refresh */}
        <button
          id="btn-refresh"
          className="header-icon-btn"
          aria-label="Refresh data"
          title="Refresh"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
