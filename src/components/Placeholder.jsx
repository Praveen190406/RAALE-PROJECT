import './Placeholder.css'

export default function Placeholder({ view }) {
  const ICONS = {
    alarms:    '🔔',
    drugs:     '💊',
    patients:  '👤',
    wards:     '🏥',
    reports:   '📄',
    analytics: '📈',
    settings:  '⚙️',
  }

  const LABELS = {
    alarms:    'Alarm Log',
    drugs:     'Drug Registry',
    patients:  'Patients',
    wards:     'Wards',
    reports:   'Reports',
    analytics: 'Analytics',
    settings:  'Settings',
  }

  return (
    <div className="placeholder animate-fade-in-up">
      <div className="placeholder-icon">{ICONS[view] || '🔧'}</div>
      <h1 className="placeholder-title">{LABELS[view] || view}</h1>
      <p className="placeholder-desc">
        This section is under active development.<br />
        It will be available in an upcoming release.
      </p>
      <div className="placeholder-badge">Coming soon</div>
    </div>
  )
}
