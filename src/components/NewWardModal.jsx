import { useState } from 'react';
import { useAlarms } from '../context/AlarmContext';
import './NewAlarmModal.css';

export default function NewWardModal({ isOpen, onClose }) {
  const { createNewWard } = useAlarms();

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [beds, setBeds] = useState(20);
  const [specialty, setSpecialty] = useState('Critical Care');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id || !name) {
      setError('Ward Code and Full Name are required');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await createNewWard({
        id: id.toUpperCase().trim(),
        name: name.trim(),
        shortName: shortName.trim() || name.trim(),
        beds: Number(beds),
        specialty: specialty.trim(),
      });
      setSubmitting(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create ward');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card new-alarm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-role">WARD INFRASTRUCTURE</span>
            <h2 className="modal-title">Configure Hospital Ward</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div className="modal-error-banner">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="new-alarm-form">
          <div className="form-row-2">
            <div className="form-group">
              <label>Ward Identifier (e.g. W8, ICU-A)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. W8"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Bed Capacity</label>
              <input
                type="number"
                className="input"
                min="1"
                max="60"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Full Ward Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Ward 8 – Intensive Care Unit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Short Display Label</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. ICU"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Clinical Specialty</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Intensive Care"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions-bar">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Add Ward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
