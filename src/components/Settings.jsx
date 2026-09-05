import './Settings.css';

export default function Settings() {
  return (
    <div className="settings-page">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and application preferences.</p>
      </header>

      <div className="settings-grid">
        <section className="settings-section">
          <h2 className="section-title">Profile Information</h2>
          <div className="card settings-card">
            <div className="settings-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" defaultValue="Dr. R." />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" defaultValue="Ahmed" />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" defaultValue="r.ahmed@hospital.org" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input type="text" defaultValue="Senior Pharmacist" disabled />
              </div>
              <div className="settings-actions">
                <button className="btn-primary">Save Changes</button>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="section-title">Notifications</h2>
          <div className="card settings-card">
            <div className="settings-toggle-list">
              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-label">Critical Alarms</span>
                  <span className="toggle-desc">Receive immediate push notifications for critical patient alarms.</span>
                </div>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <span className="slider round"></span>
                </label>
              </div>
              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-label">Daily Summary</span>
                  <span className="toggle-desc">Receive an email digest of daily ward activities.</span>
                </div>
                <label className="switch">
                  <input type="checkbox" />
                  <span className="slider round"></span>
                </label>
              </div>
              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-label">System Updates</span>
                  <span className="toggle-desc">Notify me about new features and scheduled maintenance.</span>
                </div>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="section-title">Appearance</h2>
          <div className="card settings-card">
            <div className="theme-options">
              <div className="theme-option active">
                <div className="theme-preview dark"></div>
                <span>Dark Mode</span>
              </div>
              <div className="theme-option">
                <div className="theme-preview light"></div>
                <span>Light Mode</span>
              </div>
              <div className="theme-option">
                <div className="theme-preview system"></div>
                <span>System Default</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
