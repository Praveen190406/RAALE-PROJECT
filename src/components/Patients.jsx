import { useState, useMemo } from 'react'
import { useAlarms } from '../context/AlarmContext'
import './Patients.css'
import { DRUGS_BY_ID } from '../data/drugs'

function SeverityBadge({ severity }) {
  return <span className={`badge badge-${severity}`}>{severity}</span>
}

function StatusBadge({ status }) {
  const map = { Active: 'critical', Acknowledged: 'medium', Resolved: 'resolved' }
  return <span className={`badge badge-${map[status] || 'active'}`}>{status}</span>
}

function PatientDetailModal({ patient, onClose }) {
  const { alarms, patterns, acknowledgeAlarm, resolveAlarm } = useAlarms()
  const [reviewNote, setReviewNote] = useState('')
  const [savedActions, setSavedActions] = useState([])

  const addAction = (label, alarmIds) => {
    if (alarmIds && alarmIds.length > 0) {
      if (label === 'Confirmed Escalation') {
        alarmIds.forEach(id => acknowledgeAlarm(id))
      } else if (label === 'Marked as Nuisance') {
        alarmIds.forEach(id => resolveAlarm(id))
      }
    }
    setSavedActions(prev => [
      { label, note: reviewNote, time: new Date().toLocaleTimeString() },
      ...prev,
    ])
    setReviewNote('')
  }

  const patientAlarms = useMemo(() => 
    alarms.filter(a => a.patientId === patient.id).sort((a, b) => b.timestamp - a.timestamp), 
  [alarms, patient.id])
  
  const activeAlarms = patientAlarms.filter(a => a.status === 'Active')
  
  const relatedPatterns = useMemo(() => 
    patterns.filter(p => p.patientId === patient.id),
  [patterns, patient.id])

  const highCriticalAlarms = patientAlarms.filter(a => a.severity === 'high' || a.severity === 'critical')
  
  // Calculate a simulated context score
  const contextScore = Math.min(100, patient.baseRiskScore + (activeAlarms.length * 5))

  return (
    <div className="patient-overlay" role="dialog" aria-modal="true">
      <div className="patient-modal">
        <div className="patient-modal-header">
          <div>
            <h2 className="patient-modal-title">{patient.displayName}</h2>
            <p className="patient-modal-subtitle">{patient.id} · {patient.bed} · {patient.age} y/o</p>
          </div>
          <button className="patient-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="patient-modal-body">
          <div className="patient-warning">
            <span className="warning-icon">⚠️</span> SIMULATED DATA – NOT FOR REAL CLINICAL USE
          </div>

          <div className="patient-detail-grid">
            <div className="patient-kv-box">
              <span className="patient-key">Ward</span>
              <span className="patient-val">{patient.ward}</span>
            </div>
            <div className="patient-kv-box">
              <span className="patient-key">Conditions</span>
              <span className="patient-val">{patient.conditions.join(', ')}</span>
            </div>
            <div className="patient-kv-box">
              <span className="patient-key">High-Risk Meds</span>
              <span className="patient-val">
                {patient.medications.map(m => DRUGS_BY_ID[m]?.name).filter(Boolean).join(', ')}
              </span>
            </div>
            <div className="patient-kv-box">
              <span className="patient-key">Total Alarms (Recent)</span>
              <span className="patient-val">{patientAlarms.length}</span>
            </div>
            <div className="patient-kv-box">
              <span className="patient-key">Active Alarms</span>
              <span className={`patient-val ${activeAlarms.length > 0 ? 'text-critical' : ''}`}>
                {activeAlarms.length}
              </span>
            </div>
            <div className="patient-kv-box">
              <span className="patient-key">Context Score</span>
              <span className="patient-val text-high">{contextScore} / 100</span>
            </div>
          </div>

          {relatedPatterns.length > 0 && (
            <div className="patient-section">
              <h3 className="patient-section-title">Detected Patterns (High Priority)</h3>
              {relatedPatterns.map(p => (
                <div key={p.id} className={`pattern-alert pattern-alert--${p.severity}`}>
                  <div className="pattern-header">
                    <strong>{p.title}</strong>
                    <SeverityBadge severity={p.severity} />
                  </div>
                  <p className="pattern-msg">{p.message}</p>
                  <div className="pattern-metrics">
                    <span>Risk Score: {p.riskScore?.toFixed(1)}</span>
                    <span>Confidence: {(p.confidence * 100).toFixed(0)}%</span>
                    <span>Uncertainty: {(p.uncertainty * 100).toFixed(0)}%</span>
                  </div>
                  
                  <div className="pattern-details">
                    <div className="pattern-detail-item"><strong>Evidence:</strong> {p.evidence?.length} alarms involved.</div>
                    <div className="pattern-detail-item"><strong>Alternative:</strong> {p.alternativeInterpretation}</div>
                    <div className="pattern-detail-item"><strong>False Positive Harm:</strong> {p.falsePositivePotential}</div>
                    <div className="pattern-detail-item"><strong>False Negative Harm:</strong> {p.falseNegativePotential}</div>
                  </div>

                  <div className="human-review-actions">
                    <p className="human-review-notice">⚡ Potential escalation detected – human clinical review required.</p>
                    <div className="action-buttons">
                      <button className="btn btn-confirm" onClick={() => addAction('Confirmed Escalation', p.evidence)}>Confirm Escalation</button>
                      <button className="btn btn-nuisance" onClick={() => addAction('Marked as Nuisance', p.evidence)}>Mark as Nuisance</button>
                      <button className="btn btn-secondary" onClick={() => addAction('Requested More Info', null)}>Request Info</button>
                      <button className="btn btn-secondary" onClick={() => addAction('Overridden Recommendation', null)}>Override</button>
                    </div>
                    <div className="review-note-row">
                      <input
                        type="text"
                        className="filter-input"
                        placeholder="Add review note..."
                        value={reviewNote}
                        onChange={e => setReviewNote(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && reviewNote.trim() && addAction('Review Note', null)}
                      />
                      <button className="btn btn-secondary" onClick={() => reviewNote.trim() && addAction('Review Note', null)}>Save Note</button>
                    </div>
                    {savedActions.length > 0 && (
                      <div className="saved-actions">
                        {savedActions.map((a, i) => (
                          <div key={i} className="saved-action-item">
                            <span className="saved-action-label">{a.label}</span>
                            {a.note && <span className="saved-action-note">"{a.note}"</span>}
                            <span className="saved-action-time">{a.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="patient-section">
            <h3 className="patient-section-title">Recent Alarm History</h3>
            {patientAlarms.length > 0 ? (
              <table className="patient-alarm-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Time</th>
                    <th>Drug</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patientAlarms.slice(0, 10).map(a => (
                    <tr key={a.id}>
                      <td className="font-mono text-muted">{a.id}</td>
                      <td className="font-mono">{a.time}</td>
                      <td>{a.drug}</td>
                      <td>{a.type}</td>
                      <td><SeverityBadge severity={a.severity} /></td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted">No recent alarms recorded for this patient.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default function Patients({ onOpenNewPatient }) {
  const { patients, alarms } = useAlarms()
  const [searchText, setSearchText] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)

  const enrichedPatients = useMemo(() => {
    return patients.map(p => {
      const pAlarms = alarms.filter(a => a.patientId === p.id)
      const active = pAlarms.filter(a => a.status === 'Active')
      const criticalCount = active.filter(a => a.severity === 'critical').length
      
      let priority = 'Low'
      if (criticalCount > 0) priority = 'Critical'
      else if (active.filter(a => a.severity === 'high').length > 0) priority = 'High'
      else if (active.length > 0) priority = 'Medium'

      return {
        ...p,
        totalAlarms: pAlarms.length,
        activeAlarms: active.length,
        priority
      }
    })
  }, [patients, alarms])

  const filteredPatients = useMemo(() => {
    if (!searchText.trim()) return enrichedPatients
    const q = searchText.toLowerCase()
    return enrichedPatients.filter(p => 
      p.displayName.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.ward.toLowerCase().includes(q)
    )
  }, [enrichedPatients, searchText])

  return (
    <div className="patients-page animate-fade-in-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Patients Directory</h1>
          <p className="page-subtitle">Monitored patients and alarm contexts</p>
        </div>
        {onOpenNewPatient && (
          <button className="btn btn-primary" onClick={onOpenNewPatient}>
            + Admit Inpatient
          </button>
        )}
      </div>

      <div className="patients-filters card">
        <input 
          type="text" 
          className="filter-input" 
          placeholder="Search by name, ID, or ward..." 
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <div className="patients-table-wrap card">
        <table className="patients-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>ID</th>
              <th>Bed</th>
              <th>Therapy</th>
              <th>Active Alarms</th>
              <th>Priority</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map(p => (
              <tr key={p.id}>
                <td className="font-medium">{p.displayName}</td>
                <td className="font-mono text-muted">{p.id}</td>
                <td>{p.bed}</td>
                <td>{p.conditions[0]}</td>
                <td>{p.activeAlarms > 0 ? <span className="active-count">{p.activeAlarms}</span> : '-'}</td>
                <td>
                  <span className={`priority-indicator priority-${p.priority.toLowerCase()}`}>
                    {p.priority}
                  </span>
                </td>
                <td>
                  <button className="btn-detail" onClick={() => setSelectedPatient(p)}>View Context</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPatient && (
        <PatientDetailModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
      )}
    </div>
  )
}
