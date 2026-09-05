import { useState, useMemo } from 'react'
import { useAlarms } from '../context/AlarmContext'
import './DrugRegistry.css'

/* ── Risk level badge ──────────────────────────────────── */
function RiskBadge({ level }) {
  return <span className={`risk-badge risk-badge--${level}`}>{level}</span>
}

/* ── Risk score bar ────────────────────────────────────── */
function ScoreBar({ value }) {
  const color =
    value >= 90 ? 'var(--critical)' :
    value >= 80 ? 'var(--high)'     :
    value >= 65 ? 'var(--medium)'   :
                  'var(--low)'
  return (
    <div className="dr-score-bar-wrap">
      <div className="dr-score-bar-track">
        <div className="dr-score-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="dr-score-label" style={{ color }}>{value}</span>
    </div>
  )
}

/* ── Drug detail modal ─────────────────────────────────── */
function DrugModal({ drug, alarms, onClose }) {
  const now = Date.now()
  const FOUR_HOURS = 4 * 60 * 60 * 1000
  const recentAlarms = alarms
    .filter((a) => a.drugId === drug.id && now - a.timestamp < FOUR_HOURS)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8)

  const activeCount = recentAlarms.filter((a) => a.status === 'Active').length

  return (
    <div className="drug-overlay" role="dialog" aria-modal="true" aria-label={`Drug detail: ${drug.name}`}>
      <div className="drug-modal">
        <div className="drug-modal-header">
          <div>
            <h2 className="drug-modal-title">{drug.name}</h2>
            <p className="drug-modal-meta">{drug.category} · {drug.dose} · <RiskBadge level={drug.riskLevel} /></p>
          </div>
          <button className="drug-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drug-modal-body">
          <div className="drug-detail-section">
            <h3 className="drug-detail-section-title">Risk Profile</h3>
            <div className="drug-detail-grid">
              <div className="drug-kv"><span className="drug-key">Risk Score</span><ScoreBar value={drug.riskScore} /></div>
              <div className="drug-kv"><span className="drug-key">Monitor Parameter</span><span className="drug-val drug-monitor">{drug.monitorParam}</span></div>
              <div className="drug-kv"><span className="drug-key">Active Alarms (4h)</span><span className={`drug-val ${activeCount > 0 ? 'drug-val--alert' : ''}`}>{activeCount}</span></div>
              <div className="drug-kv drug-kv--full"><span className="drug-key">Clinical Notes</span><span className="drug-val">{drug.notes}</span></div>
            </div>
          </div>

          {recentAlarms.length > 0 && (
            <div className="drug-detail-section">
              <h3 className="drug-detail-section-title">Recent Alarms (last 4h)</h3>
              <div className="drug-alarm-list">
                {recentAlarms.map((a) => (
                  <div key={a.id} className={`drug-alarm-row drug-alarm-row--${a.severity}`}>
                    <span className="font-mono drug-alarm-id">{a.id}</span>
                    <span className="drug-alarm-patient">{a.patient}</span>
                    <span className="drug-alarm-ward">{a.ward}</span>
                    <span className="font-mono drug-alarm-time">{a.time}</span>
                    <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                    <span className={`badge badge-${a.status === 'Active' ? 'critical' : a.status === 'Acknowledged' ? 'medium' : 'resolved'}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentAlarms.length === 0 && (
            <div className="drug-detail-section">
              <p className="drug-no-alarms">No alarms for this drug in the last 4 hours.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main DrugRegistry ─────────────────────────────────── */
export default function DrugRegistry() {
  const { drugs, alarms } = useAlarms()
  const [searchText,  setSearchText]  = useState('')
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterCat,   setFilterCat]   = useState('all')
  const [sortField,   setSortField]   = useState('riskScore')
  const [sortDir,     setSortDir]     = useState('desc')
  const [selectedDrug, setSelectedDrug] = useState(null)

  const categories = useMemo(
    () => ['all', ...new Set(drugs.map((d) => d.category))].sort(),
    [drugs]
  )

  const filtered = useMemo(() => {
    let list = [...drugs]
    if (filterLevel !== 'all') list = list.filter((d) => d.riskLevel === filterLevel)
    if (filterCat   !== 'all') list = list.filter((d) => d.category  === filterCat)
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.monitorParam.toLowerCase().includes(q)
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
  }, [drugs, filterLevel, filterCat, searchText, sortField, sortDir])

  function toggleSort(field) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  function SortInd({ field }) {
    if (sortField !== field) return <span className="sort-ind sort-ind--none">↕</span>
    return <span className="sort-ind">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  // Compute active alarm count per drug
  const alarmCountByDrug = useMemo(() => {
    const map = {}
    alarms.forEach((a) => {
      if (a.status === 'Active') map[a.drugId] = (map[a.drugId] || 0) + 1
    })
    return map
  }, [alarms])

  return (
    <div className="drug-registry animate-fade-in-up">
      <div className="drug-registry-header">
        <div>
          <h1 className="drug-registry-title">Drug Registry</h1>
          <p className="drug-registry-subtitle">
            {filtered.length} of {drugs.length} drugs · High-risk medicine reference
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="drug-filters card">
        <div className="filter-group">
          <label className="filter-label" htmlFor="drug-search">Search</label>
          <input
            id="drug-search"
            className="filter-input"
            type="text"
            placeholder="Drug name, category, monitor parameter…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="drug-level">Risk Level</label>
          <select id="drug-level" className="filter-select" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
            <option value="all">All Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="drug-cat">Category</label>
          <select id="drug-cat" className="filter-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
        </div>
        <button
          className="filter-reset-btn"
          onClick={() => { setSearchText(''); setFilterLevel('all'); setFilterCat('all') }}
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="drug-table-wrap card">
        <div className="table-scroll">
          <table className="drug-table" aria-label="Drug registry table">
            <thead>
              <tr>
                <th className="th-sortable" onClick={() => toggleSort('id')}>ID <SortInd field="id" /></th>
                <th className="th-sortable" onClick={() => toggleSort('name')}>Drug Name <SortInd field="name" /></th>
                <th className="th-sortable" onClick={() => toggleSort('category')}>Category <SortInd field="category" /></th>
                <th>Dose</th>
                <th className="th-sortable" onClick={() => toggleSort('riskLevel')}>Risk Level <SortInd field="riskLevel" /></th>
                <th className="th-sortable" onClick={() => toggleSort('riskScore')}>Risk Score <SortInd field="riskScore" /></th>
                <th>Monitor Param</th>
                <th>Active Alarms</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-row">No drugs match current filters.</td>
                </tr>
              )}
              {filtered.map((drug) => {
                const activeCount = alarmCountByDrug[drug.id] || 0
                return (
                  <tr key={drug.id} className="drug-row">
                    <td className="drug-id font-mono">{drug.id}</td>
                    <td>
                      <div className="drug-name">{drug.name}</div>
                      <div className="drug-notes-preview">{drug.notes.slice(0, 50)}…</div>
                    </td>
                    <td className="text-secondary">{drug.category}</td>
                    <td className="font-mono text-secondary">{drug.dose}</td>
                    <td><RiskBadge level={drug.riskLevel} /></td>
                    <td className="score-col"><ScoreBar value={drug.riskScore} /></td>
                    <td>
                      <span className="monitor-pill">{drug.monitorParam}</span>
                    </td>
                    <td>
                      {activeCount > 0
                        ? <span className="active-alarm-badge">{activeCount} active</span>
                        : <span className="no-alarm-text">—</span>
                      }
                    </td>
                    <td>
                      <button className="drug-detail-btn" onClick={() => setSelectedDrug(drug)}>
                        Detail
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDrug && (
        <DrugModal drug={selectedDrug} alarms={alarms} onClose={() => setSelectedDrug(null)} />
      )}
    </div>
  )
}
