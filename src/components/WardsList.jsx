import { useMemo, useState } from 'react'
import { useAlarms } from '../context/AlarmContext'
import './WardsList.css'

/* ── Risk bar ──────────────────────────────────────────── */
function RiskBar({ value }) {
  const color =
    value >= 85 ? 'var(--critical)' :
    value >= 65 ? 'var(--high)'     :
                  'var(--medium)'
  return (
    <div className="wl-risk-bar-wrap" title={`Risk score: ${value}`}>
      <div className="wl-risk-bar-track">
        <div className="wl-risk-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="wl-risk-bar-label" style={{ color }}>{value}</span>
    </div>
  )
}

/* ── Trend indicator ───────────────────────────────────── */
function TrendChip({ dir }) {
  if (dir === 'up')   return <span className="trend-chip trend-chip--up">↑ Rising</span>
  if (dir === 'down') return <span className="trend-chip trend-chip--down">↓ Falling</span>
  return <span className="trend-chip trend-chip--stable">→ Stable</span>
}

/* ── Single ward card ──────────────────────────────────── */
function WardCard({ ward, alarmList, riskLevel, onNavigateAlarms }) {
  const activeAlarms  = alarmList.filter((a) => a.status === 'Active')
  const criticalCount = activeAlarms.filter((a) => a.severity === 'critical').length
  const highCount     = activeAlarms.filter((a) => a.severity === 'high').length
  const recent        = [...alarmList].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3)

  const borderColor =
    riskLevel >= 85 ? 'var(--critical)' :
    riskLevel >= 65 ? 'var(--high)'     :
                      'var(--border-hover)'

  return (
    <div className="ward-card card" style={{ borderTopColor: borderColor }}>
      <div className="ward-card-header">
        <div>
          <h3 className="ward-card-name">{ward.name}</h3>
          <p className="ward-card-meta">{ward.specialty} · {ward.beds} beds</p>
        </div>
        <TrendChip dir={ward.trend} />
      </div>

      <div className="ward-card-stats">
        <div className="ward-stat">
          <span className="ward-stat-value">{activeAlarms.length}</span>
          <span className="ward-stat-label">Active</span>
        </div>
        <div className="ward-stat">
          <span className="ward-stat-value ward-stat-value--critical">{criticalCount}</span>
          <span className="ward-stat-label">Critical</span>
        </div>
        <div className="ward-stat">
          <span className="ward-stat-value ward-stat-value--high">{highCount}</span>
          <span className="ward-stat-label">High</span>
        </div>
        <div className="ward-stat">
          <span className="ward-stat-value">{alarmList.length}</span>
          <span className="ward-stat-label">Total (4h)</span>
        </div>
      </div>

      <div className="ward-risk-section">
        <span className="ward-risk-label">Risk Score</span>
        <RiskBar value={riskLevel} />
      </div>

      {recent.length > 0 && (
        <div className="ward-recent">
          <p className="ward-recent-title">Recent Alarms</p>
          {recent.map((a) => (
            <div key={a.id} className={`ward-recent-row ward-recent-row--${a.severity}`}>
              <span className="ward-recent-patient">{a.patient}</span>
              <span className="ward-recent-drug">{a.drug}</span>
              <span className="ward-recent-time">{a.time}</span>
              <span className={`badge badge-${a.severity}`}>{a.severity}</span>
            </div>
          ))}
        </div>
      )}

      <button className="ward-view-btn" onClick={() => onNavigateAlarms(ward.id)}>
        View all alarms →
      </button>
    </div>
  )
}

/* ── Main WardsList ────────────────────────────────────── */
export default function WardsList({ onNavigate }) {
  const { alarms, wardStats, wards, dispatch, isStreaming } = useAlarms()
  const [sortBy, setSortBy] = useState('risk')

  const FOUR_HOURS = 4 * 60 * 60 * 1000

  const enriched = useMemo(() => {
    const now = Date.now()
    return wardStats.map((ws) => {
      const wardObj     = wards.find((w) => w.id === ws.wardId) || { name: ws.ward, specialty: '', beds: 0, id: ws.wardId }
      const wardAlarms  = alarms.filter((a) => a.wardId === ws.wardId && now - a.timestamp < FOUR_HOURS)
      return { ...ws, wardObj, wardAlarms }
    })
  }, [wardStats, alarms, wards])

  const sorted = useMemo(() => {
    const list = [...enriched]
    if (sortBy === 'risk')    list.sort((a, b) => b.risk - a.risk)
    if (sortBy === 'alarms')  list.sort((a, b) => b.alarms - a.alarms)
    if (sortBy === 'name')    list.sort((a, b) => a.ward.localeCompare(b.ward))
    return list
  }, [enriched, sortBy])

  const totals = useMemo(() => ({
    active:   alarms.filter((a) => a.status === 'Active').length,
    critical: alarms.filter((a) => a.severity === 'critical' && a.status === 'Active').length,
  }), [alarms])

  return (
    <div className="wards-list animate-fade-in-up">
      <div className="wards-list-header">
        <div>
          <h1 className="wards-list-title">Wards Overview</h1>
          <p className="wards-list-subtitle">
            {sorted.length} wards monitored ·&nbsp;
            <span className="stat-chip stat-chip--critical">{totals.active} active alarms</span>&nbsp;
            <span className="stat-chip stat-chip--high">{totals.critical} critical</span>
          </p>
        </div>
        <div className="wards-controls">
          <div className="sort-group">
            <label className="filter-label" htmlFor="ward-sort">Sort by</label>
            <select id="ward-sort" className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="risk">Risk Score</option>
              <option value="alarms">Active Alarms</option>
              <option value="name">Name</option>
            </select>
          </div>
          <button
            className="stream-toggle-btn"
            onClick={() => dispatch({ type: 'TOGGLE_STREAM' })}
          >
            {isStreaming ? '⏸ Pause Stream' : '▶ Resume Stream'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="wards-legend">
        <span className="ward-legend-item ward-legend-critical">■ Critical ≥85</span>
        <span className="ward-legend-item ward-legend-high">■ High ≥65</span>
        <span className="ward-legend-item ward-legend-medium">■ Medium &lt;65</span>
      </div>

      <div className="wards-grid">
        {sorted.map((ws) => (
          <WardCard
            key={ws.wardId}
            ward={ws.wardObj}
            alarmList={ws.wardAlarms}
            riskLevel={ws.risk}
            onNavigateAlarms={() => onNavigate && onNavigate('alarms')}
          />
        ))}
      </div>
    </div>
  )
}
