import { useState } from 'react';
import { useAlarms } from '../context/AlarmContext';
import './NewAlarmModal.css';

export default function NewDrugModal({ isOpen, onClose }) {
  const { createNewDrug } = useAlarms();

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [category, setCategory] = useState('Anticoagulant');
  const [riskLevel, setRiskLevel] = useState('critical');
  const [riskScore, setRiskScore] = useState(90);
  const [monitorParam, setMonitorParam] = useState('aPTT / INR');
  const [notes, setNotes] = useState('Narrow therapeutic window. Strict monitoring required.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !dose || !category) {
      setError('Medication Name, Dose, and Category are required');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await createNewDrug({
        name,
        dose,
        category,
        riskLevel,
        riskScore: Number(riskScore),
        monitorParam,
        notes,
      });
      setSubmitting(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to register medication');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card new-alarm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-role">MEDICATION REGISTRY</span>
            <h2 className="modal-title">Register High-Risk Medication</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div className="modal-error-banner">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="new-alarm-form">
          <div className="form-row-2">
            <div className="form-group">
              <label>Medication Generic / Brand Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Apixaban"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Standard Dose Unit</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 5mg"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Therapeutic Category</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Direct Oral Anticoagulant"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Risk Classification</label>
              <select
                className="input"
                value={riskLevel}
                onChange={(e) => {
                  setRiskLevel(e.target.value);
                  setRiskScore(e.target.value === 'critical' ? 92 : e.target.value === 'high' ? 82 : 65);
                }}
              >
                <option value="critical">Critical (Narrow Index / Life-Threatening)</option>
                <option value="high">High (Strict Schedule / Toxicity)</option>
                <option value="medium">Medium (Moderate Monitoring)</option>
                <option value="low">Low (Standard Precaution)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Clinical Monitoring Parameters</label>
            <input
              type="text"
              className="input"
              value={monitorParam}
              onChange={(e) => setMonitorParam(e.target.value)}
              placeholder="e.g. Renal function, Anti-Xa, Bleeding Signs"
            />
          </div>

          <div className="form-group">
            <label>Clinical Safety & Administration Notes</label>
            <textarea
              className="input"
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Safety alerts, interactions, reversal agents..."
            />
          </div>

          <div className="modal-actions-bar">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Add to Clinical Registry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
