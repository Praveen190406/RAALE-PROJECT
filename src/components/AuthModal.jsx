import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose }) {
  const { user, login, register, logout, switchQuickClinician, authError } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Ward Doctor',
  });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);

    if (isRegisterMode) {
      if (!form.name || !form.email || !form.password) {
        setLocalError('All fields are required');
        setLoading(false);
        return;
      }
      const res = await register(form.name, form.email, form.password, form.role);
      setLoading(false);
      if (res.success) {
        onClose();
      } else {
        setLocalError(res.message);
      }
    } else {
      if (!form.email || !form.password) {
        setLocalError('Email and password are required');
        setLoading(false);
        return;
      }
      const res = await login(form.email, form.password);
      setLoading(false);
      if (res.success) {
        onClose();
      } else {
        setLocalError(res.message);
      }
    }
  };

  const handleQuickSwitch = async (email) => {
    setLoading(true);
    await switchQuickClinician(email);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-role">STAFF PORTAL</span>
            <h2 className="modal-title">
              {isRegisterMode ? 'Register Clinician Account' : 'Clinical Staff Authentication'}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {user && !isRegisterMode ? (
          <div className="auth-current-user-box">
            <div className="user-avatar-large">
              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="user-details">
              <span className="user-name-large">{user.name}</span>
              <span className="user-role-badge">{user.role}</span>
              <span className="user-email-text">{user.email}</span>
            </div>
            <button className="btn btn-secondary logout-btn" onClick={() => { logout(); }}>
              Sign Out
            </button>
          </div>
        ) : null}

        <div className="quick-switch-section">
          <p className="quick-switch-label">⚡ Quick Switch Clinical Role (Demo Credentials):</p>
          <div className="quick-switch-pills">
            <button
              type="button"
              className="pill-btn"
              onClick={() => handleQuickSwitch('ahmed@hospital.nhs.uk')}
            >
              Dr. R. Ahmed (Pharmacist)
            </button>
            <button
              type="button"
              className="pill-btn"
              onClick={() => handleQuickSwitch('sarah.lin@hospital.nhs.uk')}
            >
              Dr. S. Lin (Ward Doctor)
            </button>
            <button
              type="button"
              className="pill-btn"
              onClick={() => handleQuickSwitch('taylor@hospital.nhs.uk')}
            >
              Nurse J. Taylor (Staff Nurse)
            </button>
          </div>
        </div>

        <div className="auth-divider">
          <span>{isRegisterMode ? 'CREATE CREDENTIALS' : 'OR SIGN IN WITH PASSWORD'}</span>
        </div>

        {(localError || authError) && (
          <div className="auth-error-banner">
            ⚠️ {localError || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegisterMode && (
            <div className="form-group">
              <label>Full Clinical Name & Title</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Dr. Fiona Gallagher"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Hospital Email</label>
            <input
              type="email"
              className="input"
              placeholder="e.g. ahmed@hospital.nhs.uk"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {isRegisterMode && (
            <div className="form-group">
              <label>Clinical Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="Senior Pharmacist">Senior Pharmacist</option>
                <option value="Ward Doctor">Ward Doctor</option>
                <option value="Staff Nurse">Staff Nurse</option>
                <option value="Clinical Nurse Specialist">Clinical Nurse Specialist</option>
                <option value="Patient Safety Lead">Patient Safety Lead</option>
              </select>
            </div>
          )}

          <div className="auth-modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsRegisterMode(!isRegisterMode)}
            >
              {isRegisterMode ? 'Already have an account? Sign In' : 'New Clinician? Register'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Authenticating...' : isRegisterMode ? 'Register Account' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
