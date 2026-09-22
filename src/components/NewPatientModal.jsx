import { useState } from 'react';
import { useAlarms } from '../context/AlarmContext';
import './NewAlarmModal.css';

export default function NewPatientModal({ isOpen, onClose }) {
  const { wards, drugs, createNewPatient } = useAlarms();

  const [displayName, setDisplayName] = useState('');
  const [wardId, setWardId] = useState(wards[0]?.id || 'W7');
  const [bed, setBed] = useState('');
  const [age, setAge] = useState(65);
  const [conditions, setConditions] = useState('Atrial Fibrillation, Hypertension');
  const [selectedMeds, setSelectedMeds] = useState(['D001']);
  const [baseRiskScore, setBaseRiskScore] = useState(80);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleMedToggle = (drugId) => {
    if (selectedMeds.includes(drugId)) {
      if (selectedMeds.length > 1) {
        setSelectedMeds(selectedMeds.filter((id) => id !== drugId));
      }
    } else {
      setSelectedMeds([...selectedMeds, drugId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName || !bed) {
      setError('Patient Name and Bed Number are required');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await createNewPatient({
        displayName,
        wardId,
        bed,
        age: Number(age),
        conditions: conditions.split(',').map((c) => c.trim()).filter(Boolean),
        medications: selectedMeds,
        baseRiskScore: Number(baseRiskScore),
      });
      setSubmitting(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to admit patient');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card new-alarm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-role">INPATIENT ADMISSION</span>
            <h2 className="modal-title">Admit New Patient to Ward</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div className="modal-error-banner">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="new-alarm-form">
          <div className="form-row-2">
            <div className="form-group">
              <label>Patient Identifier / Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Patient 7B-21"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                className="input"
                min="18"
                max="105"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Ward Assignment</label>
              <select
                className="input"
                value={wardId}
                onChange={(e) => setWardId(e.target.value)}
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.specialty})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Bed Location</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 7B-21"
                value={bed}
                onChange={(e) => setBed(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Diagnosed Conditions (comma-separated)</label>
            <input
              type="text"
              className="input"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Heart Failure, DVT Risk, Type 2 Diabetes"
              required
            />
          </div>

          <div className="form-group">
            <label>Prescribed High-Risk Medications</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto', padding: '6px', background: '#0a0f1d', borderRadius: '6px', border: '1px solid #1e293b' }}>
              {drugs.map((d) => {
                const isSelected = selectedMeds.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleMedToggle(d.id)}
                    style={{
                      background: isSelected ? '#0284c7' : '#1e293b',
                      color: isSelected ? '#fff' : '#cbd5e1',
                      border: '1px solid ' + (isSelected ? '#38bdf8' : '#334155'),
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    {d.name} {d.dose}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Base Risk Score: <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{baseRiskScore}</span></label>
            <input
              type="range"
              min="50"
              max="98"
              value={baseRiskScore}
              onChange={(e) => setBaseRiskScore(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="modal-actions-bar">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Admitting...' : 'Admit Inpatient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
