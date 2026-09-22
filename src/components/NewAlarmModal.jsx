import { useState } from 'react';
import { useAlarms } from '../context/AlarmContext';
import './NewAlarmModal.css';

export default function NewAlarmModal({ isOpen, onClose }) {
  const { patients, drugs, createNewAlarm } = useAlarms();

  const [patientId, setPatientId] = useState(patients[0]?.id || '');
  const [drugId, setDrugId] = useState(drugs[0]?.id || '');
  const [alarmType, setAlarmType] = useState('Missed Dose');
  const [severity, setSeverity] = useState('critical');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const selectedPatient = patients.find((p) => p.id === patientId) || patients[0];
  const selectedDrug = drugs.find((d) => d.id === drugId) || drugs[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await createNewAlarm({
        patientId: selectedPatient?.id,
        patient: selectedPatient?.displayName || selectedPatient?.name,
        wardId: selectedPatient?.wardId,
        ward: selectedPatient?.ward,
        drugId: selectedDrug?.id,
        drug: `${selectedDrug?.name} ${selectedDrug?.dose}`,
        drugRisk: selectedDrug?.riskLevel || selectedDrug?.risk_level || 'critical',
        type: alarmType,
        severity,
        label: severity === 'critical' ? 'ESCALATION' : alarmType === 'Duplicate Alert' ? 'NUISANCE' : 'REVIEW',
      });
      setSubmitting(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create alarm');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card new-alarm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-role">CLINICAL ALERT DISPATCH</span>
            <h2 className="modal-title">Trigger Clinical Medication Alarm</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div className="modal-error-banner">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="new-alarm-form">
          <div className="form-group">
            <label>Inpatient Record</label>
            <select
              className="input"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName || p.name} — Bed {p.bed} ({p.ward})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Medication (High-Risk Registry)</label>
            <select
              className="input"
              value={drugId}
              onChange={(e) => setDrugId(e.target.value)}
              required
            >
              {drugs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.dose} [{d.riskLevel?.toUpperCase() || d.risk_level?.toUpperCase()}] — {d.category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Alarm Event Type</label>
              <select
                className="input"
                value={alarmType}
                onChange={(e) => setAlarmType(e.target.value)}
              >
                <option value="Missed Dose">Missed Dose</option>
                <option value="Overdue">Overdue</option>
                <option value="Duplicate Alert">Duplicate Alert</option>
                <option value="Escalation">Escalation</option>
                <option value="Near-Miss">Near-Miss</option>
              </select>
            </div>

            <div className="form-group">
              <label>Severity Level</label>
              <select
                className="input"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="alarm-summary-preview">
            <span className="summary-title">Target Overview:</span>
            <div className="summary-tags">
              <span className="summary-tag ward-tag">Ward: {selectedPatient?.ward || 'Ward 7'}</span>
              <span className={`summary-tag sev-tag sev-${severity}`}>Severity: {severity.toUpperCase()}</span>
              <span className="summary-tag drug-tag">Drug Risk: {selectedDrug?.riskLevel || 'critical'}</span>
            </div>
            <p className="summary-help">
              This will write a persistent alarm to SQLite, update the live alarm log, and trigger real-time multi-feature pattern analysis.
            </p>
          </div>

          <div className="modal-actions-bar">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Dispatching...' : 'Dispatch Alarm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
