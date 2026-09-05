import { useState, useMemo } from 'react'
import { useAlarms } from '../context/AlarmContext'
import './AlarmLog.css'

/* ── Helper badges ──────────────────────────────────────────── */
function SeverityBadge({ severity }) {
  return <span className={`badge badge-${severity}`}>{severity}</span>
}
function StatusBadge({ status }) {
  const map = { Active: 'critical', Acknowledged: 'medium', Resolved: 'resolved' }
  return <span className={`badge badge-${map[status] || 'active'}`}>{status}</span>
}
function LabelBadge({ label }) {
  const cls = { NUISANCE: 'nuisance', REVIEW: 'review', ESCALATION: 'escalation' }[label] || 'review'
  return <span className={`label-badge label-badge--${cls}`}>{label}</span>
}

/* ── Explainability panel for HIGH/CRITICAL alarms ─────────── */
function ExplainPanel({ alarm, patterns, onClose }) {
  const related = useMemo(
    () => patterns.filter((p) => p.evidence?.includes(alarm.id)),
    [alarm.id, patterns]
  )

  return (
    <div className="explain-overlay" role="dialog" aria-modal="true" aria-label="Alarm detail">
      <div className="explain-panel">
        <div className="explain-header">
          <div>
            <h2 className="explain-title">Alarm Detail — {alarm.id}</h2>
            <p className="explain-subtitle">{alarm.patient} · {alarm.ward} · {alarm.drug}</p>
          </div>
          <button className="explain-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="explain-section">
          <h3 className="explain-section-title">Classification</h3>
          <div className="explain-grid">
            <div className="explain-kv"><span className="explain-key">Type</span><span className="explain-val">{alarm.type}</span></div>
            <div className="explain-kv"><span className="explain-key">Severity</span><SeverityBadge severity={alarm.severity} /></div>
            <div className="explain-kv"><span className="explain-key">Status</span><StatusBadge status={alarm.status} /></div>
            {alarm.label && <div className="explain-kv"><span className="explain-key">Label</span><LabelBadge label={alarm.label} /></div>}
            <div className="explain-kv"><span className="explain-key">Time</span><span className="explain-val font-mono">{alarm.time}</span></div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="explain-section">
            <h3 className="explain-section-title">Detected Patterns</h3>
            {related.map((p) => (
              <div key={p.id} className={`pattern-block pattern-block--${p.severity}`}>
                <div className="pattern-block-header">
                  <span className="pattern-block-title">{p.title}</span>
                  <span className={`badge badge-${p.severity}`}>{p.severity}</span>
                </div>
                <p className="pattern-block-msg">{p.message}</p>
                <div className="explain-grid mt-8">
                  <div className="explain-kv"><span className="explain-key">Risk Score</span><span className="explain-val risk-score">{p.riskScore?.toFixed(1)} / 100</span></div>
                  <div className="explain-kv"><span className="explain-key">Confidence</span><span className="explain-val">{(p.confidence * 100).toFixed(0)}%</span></div>
                  <div className="explain-kv"><span className="explain-key">Uncertainty</span><span className="explain-val warn-val">{(p.uncertainty * 100).toFixed(0)}%</span></div>
                  <div className="explain-kv"><span className="explain-key">Evidence count</span><span className="explain-val">{p.evidence?.length}</span></div>
                </div>
                {p.alternativeInterpretation && (
                  <div className="explain-note explain-note--alt">
                    <span className="explain-note-label">Alt. interpretation</span>
                    {p.alternativeInterpretation}
                  </div>
                )}
                {p.falsePositivePotential && (
                  <div className="explain-note explain-note--fp">
                    <span className="explain-note-label">False-positive risk</span>
                    {p.falsePositivePotential}
                  </div>
                )}
                {p.falseNegativePotential && (
                  <div className="explain-note explain-note--fn">
                    <span className="explain-note-label">False-negative risk</span>
                    {p.falseNegativePotential}
                  </div>
                )}
                {p.requiredAction && (
                  <div className="explain-action">
                    <span className="explain-action-label">⚡ Required Action</span>
                    {p.requiredAction}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {related.length === 0 && (alarm.severity === 'high' || alarm.severity === 'critical') && (
          <div className="explain-section">
            <div className="explain-note explain-note--alt">
              No compound patterns detected. Single isolated alarm — monitor for recurrence.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main AlarmLog ──────────────────────────────────────────── */
export default function AlarmLog() {
  const { alarms, patterns, dispatch } = useAlarms()

  const [filterStatus,   setFilterStatus]   = useState('all')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [filterType,     setFilterType]     = useState('all')
  const [searchText,     setSearchText]     = useState('')
  const [selectedAlarm,  setSelectedAlarm]  = useState(null)
  const [sortField,      setSortField]      = useState('timestamp')
  const [sortDir,        setSortDir]        = useState('desc')

  const alarmTypes = useMemo(
    () => ['all', ...new Set(alarms.map((a) => a.type))],
    [alarms]
  )

  const filtered = useMemo(() => {
    let list = [...alarms]
    if (filterStatus   !== 'all') list = list.filter((a) => a.status   === filterStatus)
    if (filterSeverity !== 'all') list = list.filter((a) => a.severity === filterSeverity)
    if (filterType     !== 'all') list = list.filter((a) => a.type     === filterType)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      list = list.filter(
        (a) =>
          a.patient.toLowerCase().includes(q) ||
          a.drug.toLowerCase().includes(q) ||
          a.ward.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      let va = a[sortField], vb = b[sortField]
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase() }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ?  1 : -1
      return 0
    })
    return list
  }, [alarms, filterStatus, filterSeverity, filterType, searchText, sortField, sortDir])

  function toggleSort(field) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  function SortInd({ field }) {
    if (sortField !== field) return <span className="sort-ind sort-ind--none">↕</span>
    return <span className="sort-ind">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const summaryStats = useMemo(() => ({
    active:   alarms.filter((a) => a.status === 'Active').length,
    critical: alarms.filter((a) => a.severity === 'critical').length,
    high:     alarms.filter((a) => a.severity === 'high').length,
  }), [alarms])

  return (
    <div className="alarm-log animate-fade-in-up">
      <div className="alarm-log-header">
        <div>
          <h1 className="alarm-log-title">Alarm Log</h1>
          <p className="alarm-log-subtitle">
            {filtered.length} of {alarms.length} alarms ·{' '}
            <span className="stat-chip stat-chip--critical">{summaryStats.active} active</span>{' '}
            <span className="stat-chip stat-chip--high">{summaryStats.high} high</span>
          </p>
        </div>
      </div>

      <div className="alarm-log-filters card">
        <div className="filter-group">
          <label className="filter-label" htmlFor="search-alarms">Search</label>
          <input
            id="search-alarms"
            className="filter-input"
            type="text"
            placeholder="Patient, drug, ward, ID…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-status">Status</label>
          <select id="filter-status" className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="Active">Active</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-severity">Severity</label>
          <select id="filter-severity" className="filter-select" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-type">Type</label>
          <select id="filter-type" className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {alarmTypes.map((t) => <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>)}
          </select>
        </div>
        <button
          className="filter-reset-btn"
          onClick={() => { setFilterStatus('all'); setFilterSeverity('all'); setFilterType('all'); setSearchText('') }}
        >
          Reset
        </button>
      </div>

      <div className="alarm-log-table-wrap card">
        <div className="table-scroll">
          <table className="alarm-table" aria-label="Full alarm log">
            <thead>
              <tr>
                <th className="th-sortable" onClick={() => toggleSort('id')}>ID <SortInd field="id" /></th>
                <th className="th-sortable" onClick={() => toggleSort('patient')}>Patient <SortInd field="patient" /></th>
                <th className="th-sortable" onClick={() => toggleSort('ward')}>Ward <SortInd field="ward" /></th>
                <th className="th-sortable" onClick={() => toggleSort('drug')}>Drug <SortInd field="drug" /></th>
                <th className="th-sortable" onClick={() => toggleSort('type')}>Type <SortInd field="type" /></th>
                <th className="th-sortable" onClick={() => toggleSort('severity')}>Severity <SortInd field="severity" /></th>
                <th className="th-sortable" onClick={() => toggleSort('timestamp')}>Time <SortInd field="timestamp" /></th>
                <th className="th-sortable" onClick={() => toggleSort('status')}>Status <SortInd field="status" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-row">No alarms match current filters.</td>
                </tr>
              )}
              {filtered.map((alarm) => (
                <tr
                  key={alarm.id}
                  className={`alarm-row alarm-row--${alarm.severity} ${alarm.status === 'Active' ? 'alarm-row--active' : ''}`}
                >
                  <td>
                    <button className="alarm-id-btn font-mono" onClick={() => setSelectedAlarm(alarm)} title="View detail">
                      {alarm.id}
                    </button>
                  </td>
                  <td className="alarm-patient-cell">
                    <div className="alarm-patient-name">{alarm.patient}</div>
                    <div className="alarm-patient-id text-muted">{alarm.patientId}</div>
                  </td>
                  <td className="text-secondary">{alarm.ward}</td>
                  <td><span className="drug-pill">{alarm.drug}</span></td>
                  <td className="text-secondary">{alarm.type}</td>
                  <td><SeverityBadge severity={alarm.severity} /></td>
                  <td className="font-mono text-secondary">{alarm.time}</td>
                  <td><StatusBadge status={alarm.status} /></td>
                  <td className="action-cell">
                    {(alarm.severity === 'high' || alarm.severity === 'critical') && (
                      <button className="action-btn action-btn-detail" onClick={() => setSelectedAlarm(alarm)}>Detail</button>
                    )}
                    {alarm.status === 'Active' && (
                      <button className="action-btn action-btn-ack" onClick={() => dispatch({ type: 'ACKNOWLEDGE_ALARM', payload: alarm.id })}>Ack</button>
                    )}
                    {alarm.status !== 'Resolved' && (
                      <button className="action-btn action-btn-res" onClick={() => dispatch({ type: 'RESOLVE_ALARM', payload: alarm.id })}>Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAlarm && (
        <ExplainPanel alarm={selectedAlarm} patterns={patterns} onClose={() => setSelectedAlarm(null)} />
      )}
    </div>
  )
}
