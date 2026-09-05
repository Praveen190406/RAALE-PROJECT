import { useAlarms } from '../context/AlarmContext'
import PatternAlerts from './PatternAlerts'
import './Dashboard.css'

/* ── Helper components ──────────────────────────────────────── */
function SeverityBadge({ severity }) {
  return <span className={`badge badge-${severity}`}>{severity}</span>
}

function StatusBadge({ status }) {
  const map = { Active: 'critical', Acknowledged: 'medium', Resolved: 'resolved' }
  return <span className={`badge badge-${map[status] || 'active'}`}>{status}</span>
}

function RiskBar({ value }) {
  const color = value >= 85 ? 'var(--critical)' : value >= 65 ? 'var(--high)' : 'var(--medium)'
  return (
    <div className="risk-bar-wrap" title={`Risk score: ${value}`}>
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="risk-bar-label" style={{ color }}>{value}</span>
    </div>
  )
}

function TrendArrow({ dir }) {
  if (dir === 'up')   return <span className="trend trend-up">↑</span>
  if (dir === 'down') return <span className="trend trend-down">↓</span>
  return <span className="trend trend-stable">→</span>
}

/* ── Main Dashboard ─────────────────────────────────────────── */
export default function Dashboard({ onNavigate }) {
  const { alarms, stats, wardStats, patterns, isStreaming, dispatch } = useAlarms()

  /* ── Build STATS array from live context ─── */
  const STATS = [
    {
      id: 'active-alarms',
      label: 'Active Alarms',
      value: stats.activeAlarms,
      delta: stats.activeDelta > 0
        ? `+${stats.activeDelta} since last hour`
        : stats.activeDelta < 0
          ? `${stats.activeDelta} since last hour`
          : 'Stable this hour',
      deltaDir: stats.activeDelta > 0 ? 'up' : stats.activeDelta < 0 ? 'down-good' : 'neutral',
      variant: 'critical',
      icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>),
    },
    {
      id: 'missed-doses',
      label: 'Missed Doses',
      value: stats.missedDoses,
      delta: stats.missedDelta > 0
        ? `+${stats.missedDelta} since last hour`
        : stats.missedDelta < 0
          ? `${Math.abs(stats.missedDelta)} resolved this hour`
          : 'Stable this hour',
      deltaDir: stats.missedDelta > 0 ? 'up' : stats.missedDelta < 0 ? 'down-good' : 'neutral',
      variant: 'high',
      icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>),
    },
    {
      id: 'resolved-today',
      label: 'Resolved Today',
      value: stats.resolvedToday,
      delta: 'Total resolved today',
      deltaDir: 'neutral',
      variant: 'resolved',
      icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
    },
    {
      id: 'high-risk-drugs',
      label: 'High-Risk Drugs',
      value: stats.highRiskDrugs,
      delta: 'Under active monitoring',
      deltaDir: 'neutral',
      variant: 'medium',
      icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
    },
    {
      id: 'wards-monitored',
      label: 'Wards Monitored',
      value: stats.wardsMonitored,
      delta: 'All online',
      deltaDir: 'neutral',
      variant: 'accent',
      icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>),
    },
    {
      id: 'escalations',
      label: 'Escalations (24h)',
      value: stats.escalations24h,
      delta: 'In last 24 hours',
      deltaDir: 'neutral',
      variant: 'low',
      icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>),
    },
  ]

  /* ── Live alarm list: latest 8 sorted by timestamp desc ─── */
  const RECENT_ALARMS = [...alarms]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8)

  /* ── Ward stats from context ─── */
  const WARD_ACTIVITY = wardStats

  return (
    <div className="dashboard animate-fade-in-up">

      {/* ── Section: Stats cards ──────────────────────────── */}
      <section className="dashboard-section" aria-label="Key statistics">
        <div className="section-header">
          <div>
            <h2 className="section-title">Overview</h2>
            <span className="section-subtitle">Real-time ward monitoring snapshot</span>
          </div>
          <button
            className="section-action-btn"
            onClick={() => dispatch({ type: 'TOGGLE_STREAM' })}
          >
            {isStreaming ? '⏸ Pause Stream' : '▶ Resume Stream'}
          </button>
        </div>
        <div className="stats-grid">
          {STATS.map((s) => (
            <div key={s.id} id={s.id} className={`stat-card stat-card--${s.variant} card`}>
              <div className="stat-card-top">
                <div className={`stat-icon stat-icon--${s.variant}`}>{s.icon}</div>
                <span className="stat-value">{s.value}</span>
              </div>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-delta stat-delta--${s.deltaDir}`}>{s.delta}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section: Pattern Alerts ───────────────────────── */}
      <PatternAlerts patterns={patterns} />

      {/* ── Bottom grid: Recent Alarms + Ward Activity ───── */}
      <div className="dashboard-grid">

        {/* Recent Alarms Table */}
        <section className="dashboard-section card alarms-table-section" aria-label="Recent alarms">
          <div className="section-header section-header--padded">
            <div>
              <h2 className="section-title">Recent Alarms</h2>
              <span className="section-subtitle">Last 24 hours • High-risk medicines</span>
            </div>
            <button
              id="btn-view-all-alarms"
              className="section-action-btn"
              onClick={() => onNavigate('alarms')}
            >
              View all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <div className="table-wrap">
            <table className="alarms-table" aria-label="Recent alarm events table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Patient / Ward</th>
                  <th>Drug</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_ALARMS.map((alarm) => (
                  <tr key={alarm.id} className="alarms-table-row">
                    <td>
                      <span className="alarm-id font-mono">{alarm.id}</span>
                    </td>
                    <td>
                      <div className="alarm-patient">{alarm.patient}</div>
                      <div className="alarm-ward">{alarm.ward}</div>
                    </td>
                    <td>
                      <span className="alarm-drug">{alarm.drug}</span>
                    </td>
                    <td>
                      <span className="alarm-type">{alarm.type}</span>
                    </td>
                    <td><SeverityBadge severity={alarm.severity} /></td>
                    <td>
                      <span className="alarm-time font-mono">{alarm.time}</span>
                    </td>
                    <td><StatusBadge status={alarm.status} /></td>
                    <td>
                      {alarm.status === 'Active' && (
                        <button
                          className="action-btn action-btn-ack"
                          onClick={() => dispatch({ type: 'ACKNOWLEDGE_ALARM', payload: alarm.id })}
                        >
                          Ack
                        </button>
                      )}
                      {alarm.status !== 'Resolved' && (
                        <button
                          className="action-btn action-btn-res"
                          onClick={() => dispatch({ type: 'RESOLVE_ALARM', payload: alarm.id })}
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Ward Activity */}
        <section className="dashboard-section card ward-section" aria-label="Ward risk activity">
          <div className="section-header section-header--padded">
            <div>
              <h2 className="section-title">Ward Risk</h2>
              <span className="section-subtitle">Current risk scores</span>
            </div>
            <button
              id="btn-view-wards"
              className="section-action-btn"
              onClick={() => onNavigate('wards')}
            >
              Details
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <div className="ward-list">
            {WARD_ACTIVITY.map((w) => (
              <div key={w.wardId} className="ward-row">
                <div className="ward-row-info">
                  <span className="ward-name">{w.ward}</span>
                  <span className="ward-alarms">{w.alarms} alarm{w.alarms !== 1 ? 's' : ''}</span>
                </div>
                <div className="ward-row-risk">
                  <RiskBar value={w.risk} />
                  <TrendArrow dir={w.trend} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick legend */}
          <div className="ward-legend">
            <span className="ward-legend-item ward-legend-critical">■ Critical ≥85</span>
            <span className="ward-legend-item ward-legend-high">■ High ≥65</span>
            <span className="ward-legend-item ward-legend-medium">■ Medium &lt;65</span>
          </div>
        </section>

      </div>
    </div>
  )
}
