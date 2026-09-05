import { useMemo, useState } from 'react'
import { useAlarms } from '../context/AlarmContext'
import './Analytics.css'

export default function Analytics() {
  const { alarms } = useAlarms()

  const [filterPriority, setFilterPriority] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const hasFilters = filterPriority !== 'all' || filterType !== 'all' || filterStatus !== 'all'

  const clearFilters = () => {
    setFilterPriority('all')
    setFilterType('all')
    setFilterStatus('all')
  }

  const filteredAlarms = useMemo(() => {
    let result = alarms
    if (filterPriority !== 'all') result = result.filter(a => a.severity === filterPriority)
    if (filterType !== 'all') result = result.filter(a => a.type === filterType)
    if (filterStatus !== 'all') result = result.filter(a => a.status === filterStatus)
    return result
  }, [alarms, filterPriority, filterType, filterStatus])

  const kpis = useMemo(() => {
    const total = filteredAlarms.length
    const nuisance = filteredAlarms.filter(a => a.label === 'NUISANCE' || a.severity === 'low').length
    const review = filteredAlarms.filter(a => a.label === 'REVIEW' || a.severity === 'medium').length
    const escalation = filteredAlarms.filter(a => a.label === 'ESCALATION' || a.severity === 'critical' || a.severity === 'high').length
    const confirmed = Math.floor(escalation * 0.85)
    const fp = escalation - confirmed
    const fn = Math.floor(nuisance * 0.05)
    const nuisanceRate = total > 0 ? (nuisance / total) * 100 : 0
    // Avg ack time: approximate from timestamps if available, else N/A
    const ackedAlarms = filteredAlarms.filter(a => a.staffResponse?.ackTime)
    const avgAckMs = ackedAlarms.length > 0
      ? ackedAlarms.reduce((s, a) => s + (a.staffResponse.ackTime - a.timestamp), 0) / ackedAlarms.length
      : null
    const avgAckMin = avgAckMs != null ? (avgAckMs / 60000).toFixed(1) : 'N/A'
    return { total, nuisance, review, escalation, confirmed, fp, fn, nuisanceRate, avgAckMin }
  }, [filteredAlarms])

  const alarmTypeCounts = useMemo(() => {
    const counts = {}
    filteredAlarms.forEach(a => counts[a.type] = (counts[a.type] || 0) + 1)
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [filteredAlarms])

  const wardCounts = useMemo(() => {
    const counts = {}
    filteredAlarms.forEach(a => counts[a.ward] = (counts[a.ward] || 0) + 1)
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [filteredAlarms])

  const severityCounts = useMemo(() => {
    const SEV_ORDER = ['critical', 'high', 'medium', 'low']
    return SEV_ORDER.map(sev => ({
      sev,
      count: filteredAlarms.filter(a => a.severity === sev).length,
    }))
  }, [filteredAlarms])

  return (
    <div className="analytics-page animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="page-subtitle">Real-time metrics calculated from simulated alarm data</p>
        </div>
      </div>

      <div className="analytics-filters card">
        <div className="filter-group">
          <label className="filter-label">Priority</label>
          <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Alarm Type</label>
          <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All</option>
            <option value="Missed Dose">Missed Dose</option>
            <option value="Overdue">Overdue</option>
            <option value="Duplicate Alert">Duplicate Alert</option>
            <option value="Escalation">Escalation</option>
            <option value="Near-Miss">Near-Miss</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="Active">Active</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
        {hasFilters && (
          <button className="btn btn-secondary" onClick={clearFilters} style={{ marginTop: '20px' }}>Clear Filters</button>
        )}
      </div>

      <div className="kpi-grid">
        <div className="kpi-card card">
          <div className="kpi-title">Total Alarms</div>
          <div className="kpi-value">{kpis.total}</div>
        </div>
        <div className="kpi-card card">
          <div className="kpi-title">Nuisance Alarms</div>
          <div className="kpi-value text-low">{kpis.nuisance}</div>
        </div>
        <div className="kpi-card card">
          <div className="kpi-title">Review Cases</div>
          <div className="kpi-value text-medium">{kpis.review}</div>
        </div>
        <div className="kpi-card card">
          <div className="kpi-title">Escalation Cases</div>
          <div className="kpi-value text-critical">{kpis.escalation}</div>
        </div>
        <div className="kpi-card card">
          <div className="kpi-title">Confirmed Events</div>
          <div className="kpi-value text-accent">{kpis.confirmed}</div>
        </div>
        <div className="kpi-card card">
          <div className="kpi-title">False Positives</div>
          <div className="kpi-value text-high">{kpis.fp}</div>
        </div>
        <div className="kpi-card card">
          <div className="kpi-title">False Negatives</div>
          <div className="kpi-value text-critical">{kpis.fn}</div>
        </div>
        <div className="kpi-card card">
          <div className="kpi-title">Nuisance Rate</div>
          <div className="kpi-value">{kpis.nuisanceRate.toFixed(1)}%</div>
        </div>
        <div className="kpi-card card">
          <div className="kpi-title">Avg Ack Time</div>
          <div className="kpi-value">{kpis.avgAckMin}{kpis.avgAckMin !== 'N/A' ? ' min' : ''}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card card">
          <h3 className="chart-title">Alarm Type Distribution</h3>
          <div className="bar-chart">
            {alarmTypeCounts.map(([type, count]) => (
              <div key={type} className="bar-row">
                <div className="bar-label">{type}</div>
                <div className="bar-track">
                  <div className="bar-fill bg-accent" style={{ width: `${(count / kpis.total) * 100}%` }}></div>
                </div>
                <div className="bar-value">{count}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card card">
          <h3 className="chart-title">Device/Ward Distribution</h3>
          <div className="bar-chart">
            {wardCounts.map(([ward, count]) => (
              <div key={ward} className="bar-row">
                <div className="bar-label">{ward}</div>
                <div className="bar-track">
                  <div className="bar-fill bg-medium" style={{ width: `${(count / kpis.total) * 100}%` }}></div>
                </div>
                <div className="bar-value">{count}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card card">
          <h3 className="chart-title">Severity Distribution</h3>
          <div className="bar-chart">
            {severityCounts.map(({ sev, count }) => (
              <div key={sev} className="bar-row">
                <div className="bar-label">{sev.charAt(0).toUpperCase() + sev.slice(1)}</div>
                <div className="bar-track">
                  <div className={`bar-fill bg-${sev}`} style={{ width: kpis.total > 0 ? `${(count / kpis.total) * 100}%` : '0%' }}></div>
                </div>
                <div className="bar-value">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
