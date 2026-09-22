import { useState, useEffect } from 'react';
import { useAlarms } from '../context/AlarmContext';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

const DEFAULT_SETTINGS = {
  // Audio & Sound
  audioEnabled: true,
  audioVolume: 75,
  audioPreset: 'iso', // 'iso', 'pulse', 'soft', 'cardiac'
  audioRepeatSeconds: 30,

  // Clinical Thresholds & Escalation
  escalationTimeoutMinutes: 10,
  stormThresholdCount: 3,
  wardClusterThresholdCount: 3,
  rapidEscalationFactor: '1.5',

  // Display & Interface
  pollingIntervalSeconds: 10,
  highContrastMode: false,
  tableDensity: 'comfortable', // 'comfortable' or 'compact'

  // Notifications
  dispatchEmail: 'icu-dispatch@hospital.org',
  notifyCriticalEmail: true,
  pagerWebhookUrl: 'https://paging.hospital.internal/v1/alarms',
  autoAcknowledgeDemo: false,
};

export default function Settings() {
  const { stats, dbConnected, alarms, resetAlarmsToSeed, refreshAlarms } = useAlarms();
  const { user } = useAuth();

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('wardalarm_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback to defaults
    }
    return DEFAULT_SETTINGS;
  });

  const [activeTab, setActiveTab] = useState('audio');
  const [toast, setToast] = useState(null); // { type: 'success' | 'info', message: string }
  const [isResetting, setIsResetting] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Show auto-dismissing toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Save to localStorage
  const handleSave = () => {
    try {
      localStorage.setItem('wardalarm_settings', JSON.stringify(settings));
      showToast('Settings saved successfully and applied to active clinical session.', 'success');
    } catch {
      showToast('Failed to save settings to local storage.', 'info');
    }
  };

  // Reset to default settings
  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem('wardalarm_settings');
      showToast('Settings restored to clinical factory defaults.', 'info');
    } catch {
      // ignore
    }
  };

  // Play Web Audio test tone
  const playTestAudio = () => {
    if (isPlayingAudio) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        showToast('Web Audio API not supported in this browser.', 'info');
        return;
      }
      const ctx = new AudioCtx();
      setIsPlayingAudio(true);

      const gain = ctx.createGain();
      const vol = (settings.audioVolume / 100) * 0.3; // scale to safe listening level
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (settings.audioPreset === 'iso') {
        // ISO 60601-1-8 high-urgency medical pattern: C5 (523Hz), E5 (659Hz), G5 (784Hz) then C6 (1046Hz) x2
        const notes = [
          { freq: 523.25, time: now, dur: 0.15 },
          { freq: 659.25, time: now + 0.18, dur: 0.15 },
          { freq: 783.99, time: now + 0.36, dur: 0.15 },
          { freq: 1046.50, time: now + 0.58, dur: 0.18 },
          { freq: 1046.50, time: now + 0.80, dur: 0.22 },
        ];
        notes.forEach(({ freq, time, dur }) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          osc.connect(gain);
          osc.start(time);
          osc.stop(time + dur);
        });
        setTimeout(() => setIsPlayingAudio(false), 1100);
      } else if (settings.audioPreset === 'pulse') {
        // High-urgency alert pulse: 880Hz triple burst
        [0, 0.16, 0.32].forEach((offset) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(880, now + offset);
          osc.connect(gain);
          osc.start(now + offset);
          osc.stop(now + offset + 0.09);
        });
        setTimeout(() => setIsPlayingAudio(false), 600);
      } else if (settings.audioPreset === 'soft') {
        // Gentle medical chime
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.connect(gain);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.85);
        setTimeout(() => setIsPlayingAudio(false), 900);
      } else {
        // Cardiac monitor dual-tone ping
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'square';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(700, now);
        osc2.frequency.setValueAtTime(1100, now);
        osc1.connect(gain);
        osc2.connect(gain);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
        setTimeout(() => setIsPlayingAudio(false), 400);
      }
    } catch (err) {
      console.warn('Audio test error:', err);
      setIsPlayingAudio(false);
    }
  };

  // Reset database alarms to baseline seeds
  const handleResetAlarms = async () => {
    if (!window.confirm('Reset all alarms to the initial clinical baseline seeds? Any simulated or injected test alarms will be cleared.')) {
      return;
    }
    setIsResetting(true);
    try {
      await resetAlarmsToSeed();
      showToast('Database alarms reset to baseline seeds successfully.', 'success');
    } catch (err) {
      showToast(`Error resetting alarms: ${err.message}`, 'info');
    } finally {
      setIsResetting(false);
    }
  };

  // Export Audit Logs as JSON
  const handleExportAuditLogs = () => {
    const exportData = {
      system: 'WardAlarm Sentinel Clinical Monitoring',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: user ? `${user.name} (${user.role})` : 'Anonymous Clinician',
      stats,
      alarmsCount: alarms.length,
      alarms,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical_sentinel_audit_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Clinical audit log JSON downloaded successfully.', 'success');
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div>
          <h1 className="settings-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            System Settings & Clinical Preferences
          </h1>
          <p className="settings-subtitle">
            Configure acoustic alarm triggers, pattern escalation limits, hospital paging, and SQLite persistence.
          </p>
        </div>

        <div className="settings-header-actions">
          <button
            id="btn-reset-defaults"
            className="btn btn-secondary btn-sm"
            onClick={handleResetDefaults}
            title="Reset preferences to default values"
          >
            Reset Defaults
          </button>
          <button
            id="btn-save-settings"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            title="Save changes to active profile"
          >
            Save Preferences
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {toast.type === 'success' ? (
              <>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </>
            )}
          </svg>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="settings-tabs" role="tablist">
        <button
          className={`settings-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveTab('audio')}
          role="tab"
          aria-selected={activeTab === 'audio'}
        >
          <span>🔔</span> Audio & Sounds
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'patterns' ? 'active' : ''}`}
          onClick={() => setActiveTab('patterns')}
          role="tab"
          aria-selected={activeTab === 'patterns'}
        >
          <span>🧠</span> Pattern Escalation
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'display' ? 'active' : ''}`}
          onClick={() => setActiveTab('display')}
          role="tab"
          aria-selected={activeTab === 'display'}
        >
          <span>🖥️</span> Display & Polling
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
          role="tab"
          aria-selected={activeTab === 'notifications'}
        >
          <span>📡</span> Hospital Dispatch
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
          role="tab"
          aria-selected={activeTab === 'system'}
        >
          <span>💾</span> System & Database
        </button>
      </div>

      {/* TAB 1: AUDIO & SOUND */}
      {activeTab === 'audio' && (
        <div className="settings-card animate-fade-in-up">
          <div className="settings-card-header">
            <div>
              <h2 className="settings-card-title">Acoustic Medication Alarm Signals</h2>
              <p className="settings-card-desc">
                Medical device sound standards conform to IEC/ISO 60601-1-8 alarm tone frequencies.
              </p>
            </div>
            <button
              id="btn-test-audio"
              className="btn btn-secondary btn-sm"
              onClick={playTestAudio}
              disabled={isPlayingAudio || !settings.audioEnabled}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{isPlayingAudio ? '🔊 Playing...' : '▶ Test Alarm Tone'}</span>
            </button>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Master Acoustic Alarm Output</div>
              <div className="setting-subtext">Play audible alerts on browser when critical medication alarms trigger.</div>
            </div>
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.audioEnabled}
                  onChange={(e) => updateSetting('audioEnabled', e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Alarm Signal Volume</div>
              <div className="setting-subtext">Adjust the output level of emergency audio chimes.</div>
            </div>
            <div className="setting-control">
              <div className="settings-range-wrapper">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.audioVolume}
                  disabled={!settings.audioEnabled}
                  onChange={(e) => updateSetting('audioVolume', Number(e.target.value))}
                  className="settings-range"
                />
                <span className="settings-range-val">{settings.audioVolume}%</span>
              </div>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Acoustic Pattern Preset</div>
              <div className="setting-subtext">Select the harmonic frequency standard used for auditory warnings.</div>
            </div>
            <div className="setting-control">
              <select
                className="settings-select"
                value={settings.audioPreset}
                disabled={!settings.audioEnabled}
                onChange={(e) => updateSetting('audioPreset', e.target.value)}
              >
                <option value="iso">ISO 60601-1-8 (High Urgency Medical)</option>
                <option value="pulse">Triple Alert Pulse (880 Hz)</option>
                <option value="soft">Soft Hospital Chime (587 Hz)</option>
                <option value="cardiac">Cardiac Monitor Dual Ping</option>
              </select>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Critical Alarm Reminder Chime</div>
              <div className="setting-subtext">Repeat audio signal if a Critical alarm remains unacknowledged.</div>
            </div>
            <div className="setting-control">
              <select
                className="settings-select"
                value={settings.audioRepeatSeconds}
                disabled={!settings.audioEnabled}
                onChange={(e) => updateSetting('audioRepeatSeconds', Number(e.target.value))}
              >
                <option value={15}>Every 15 seconds</option>
                <option value={30}>Every 30 seconds</option>
                <option value={60}>Every 1 minute</option>
                <option value={120}>Every 2 minutes</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PATTERN ESCALATION */}
      {activeTab === 'patterns' && (
        <div className="settings-card animate-fade-in-up">
          <div className="settings-card-header">
            <div>
              <h2 className="settings-card-title">Server Pattern Engine Thresholds</h2>
              <p className="settings-card-desc">
                Fine-tune sensitivity criteria for automated pattern recognition algorithms.
              </p>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Unacknowledged Alarm Auto-Escalation Window</div>
              <div className="setting-subtext">Duration before an active Warning status automatically escalates to Critical.</div>
            </div>
            <div className="setting-control">
              <select
                className="settings-select"
                value={settings.escalationTimeoutMinutes}
                onChange={(e) => updateSetting('escalationTimeoutMinutes', Number(e.target.value))}
              >
                <option value={5}>5 minutes (High-acuity ICU)</option>
                <option value={10}>10 minutes (Standard Acute Ward)</option>
                <option value={15}>15 minutes (General Medical)</option>
                <option value={30}>30 minutes (Sub-acute / Step-down)</option>
              </select>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">High-Risk Drug Storm Threshold</div>
              <div className="setting-subtext">Alarms involving high-risk drugs in 30 minutes to trigger HIGH_RISK_DRUG_STORM pattern.</div>
            </div>
            <div className="setting-control">
              <select
                className="settings-select"
                value={settings.stormThresholdCount}
                onChange={(e) => updateSetting('stormThresholdCount', Number(e.target.value))}
              >
                <option value={2}>2 alarms (Hyper-vigilant)</option>
                <option value={3}>3 alarms (Recommended clinical default)</option>
                <option value={4}>4 alarms</option>
                <option value={5}>5 alarms</option>
              </select>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Ward Overdue Cluster Threshold</div>
              <div className="setting-subtext">Concurrent missed doses in a single ward before triggering WARD_OVERDUE_CLUSTER pattern.</div>
            </div>
            <div className="setting-control">
              <select
                className="settings-select"
                value={settings.wardClusterThresholdCount}
                onChange={(e) => updateSetting('wardClusterThresholdCount', Number(e.target.value))}
              >
                <option value={2}>2 overdue doses</option>
                <option value={3}>3 overdue doses (Standard)</option>
                <option value={4}>4 overdue doses</option>
              </select>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Rapid Escalation Factor</div>
              <div className="setting-subtext">Dosage rate increase ratio that flags RAPID_ESCALATION alert pattern.</div>
            </div>
            <div className="setting-control">
              <select
                className="settings-select"
                value={settings.rapidEscalationFactor}
                onChange={(e) => updateSetting('rapidEscalationFactor', e.target.value)}
              >
                <option value="1.25">1.25x (+25% titration increase)</option>
                <option value="1.5">1.50x (+50% titration increase)</option>
                <option value="2.0">2.00x (+100% dosage double)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DISPLAY & POLLING */}
      {activeTab === 'display' && (
        <div className="settings-card animate-fade-in-up">
          <div className="settings-card-header">
            <div>
              <h2 className="settings-card-title">Interface & Live Sync Preferences</h2>
              <p className="settings-card-desc">
                Display density and synchronization frequency for clinical dashboard monitors.
              </p>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Database Polling Interval</div>
              <div className="setting-subtext">How frequently the frontend checks the backend SQLite API for new alarms.</div>
            </div>
            <div className="setting-control">
              <select
                className="settings-select"
                value={settings.pollingIntervalSeconds}
                onChange={(e) => updateSetting('pollingIntervalSeconds', Number(e.target.value))}
              >
                <option value={5}>Every 5 seconds (Real-time)</option>
                <option value={10}>Every 10 seconds (Recommended)</option>
                <option value={30}>Every 30 seconds</option>
                <option value={60}>Every 60 seconds</option>
                <option value={0}>Manual refresh only</option>
              </select>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">High-Contrast Clinical Display</div>
              <div className="setting-subtext">Boosts contrast borders and color distinctions for glare-prone ward wall monitors.</div>
            </div>
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.highContrastMode}
                  onChange={(e) => updateSetting('highContrastMode', e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Alarm Table Row Density</div>
              <div className="setting-subtext">Compact view displays more rows simultaneously for multi-alarm reviews.</div>
            </div>
            <div className="setting-control">
              <select
                className="settings-select"
                value={settings.tableDensity}
                onChange={(e) => updateSetting('tableDensity', e.target.value)}
              >
                <option value="comfortable">Comfortable (Standard)</option>
                <option value="compact">Compact (High Information Density)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="settings-card animate-fade-in-up">
          <div className="settings-card-header">
            <div>
              <h2 className="settings-card-title">Hospital Dispatch & Paging Gateway</h2>
              <p className="settings-card-desc">
                External alerting pathways for urgent pharmacist and physician paging.
              </p>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Dispatch Critical Alarms via Email</div>
              <div className="setting-subtext">Send immediate dispatch email when a Level 1 Critical alarm is registered.</div>
            </div>
            <div className="setting-control">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.notifyCriticalEmail}
                  onChange={(e) => updateSetting('notifyCriticalEmail', e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Emergency Dispatch Recipient</div>
              <div className="setting-subtext">Designated distribution list for rapid clinical intervention notifications.</div>
            </div>
            <div className="setting-control">
              <input
                type="email"
                className="settings-input"
                value={settings.dispatchEmail}
                onChange={(e) => updateSetting('dispatchEmail', e.target.value)}
                placeholder="icu-alerts@hospital.org"
              />
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Hospital Pager Webhook Gateway</div>
              <div className="setting-subtext">HTTP endpoint for transmitting alerts to digital on-call pagers.</div>
            </div>
            <div className="setting-control">
              <input
                type="text"
                className="settings-input"
                value={settings.pagerWebhookUrl}
                onChange={(e) => updateSetting('pagerWebhookUrl', e.target.value)}
                style={{ minWidth: '280px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM & DATABASE */}
      {activeTab === 'system' && (
        <div className="settings-card animate-fade-in-up">
          <div className="settings-card-header">
            <div>
              <h2 className="settings-card-title">Database & System Diagnostics</h2>
              <p className="settings-card-desc">
                Persistent storage integrity, live statistics, and clinical audit log backups.
              </p>
            </div>
          </div>

          <div className="system-grid">
            <div className="system-spec-box">
              <div className="system-spec-label">Database Connection</div>
              <div className="system-spec-value">
                <span className={dbConnected ? 'status-badge-ok' : 'status-badge-warn'}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dbConnected ? '#22c55e' : '#eab308' }} />
                  {dbConnected ? 'SQLite Active' : 'Fallback State'}
                </span>
              </div>
            </div>

            <div className="system-spec-box">
              <div className="system-spec-label">Storage Engine</div>
              <div className="system-spec-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                Node.js native node:sqlite
              </div>
            </div>

            <div className="system-spec-box">
              <div className="system-spec-label">SQLite File Location</div>
              <div className="system-spec-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#93c5fd' }}>
                server/data/clinical_alarm.db
              </div>
            </div>

            <div className="system-spec-box">
              <div className="system-spec-label">Total Alarms in Log</div>
              <div className="system-spec-value font-mono">
                {alarms.length} records ({stats.activeAlarms} active)
              </div>
            </div>
          </div>

          <div className="setting-row" style={{ marginTop: '24px' }}>
            <div className="setting-info">
              <div className="setting-label">Export Clinical Audit Trail</div>
              <div className="setting-subtext">
                Download current alarm dataset, acknowledgement timestamps, and pattern analyses in JSON format.
              </div>
            </div>
            <div className="setting-control">
              <button
                id="btn-export-audit"
                className="btn btn-secondary btn-sm"
                onClick={handleExportAuditLogs}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export JSON Log
              </button>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label" style={{ color: '#f87171' }}>
                Reset Alarms to Factory Baseline Seeds
              </div>
              <div className="setting-subtext">
                Clears newly created or simulated alarms and reloads the authentic 12 clinical benchmark seed alarms into SQLite.
              </div>
            </div>
            <div className="setting-control">
              <button
                id="btn-reset-alarms"
                className="btn btn-danger btn-sm"
                onClick={handleResetAlarms}
                disabled={isResetting}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{isResetting ? 'Resetting...' : 'Reset to Baseline Seeds'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
