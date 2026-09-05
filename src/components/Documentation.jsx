export default function Documentation() {
  return (
    <div className="docs-page animate-fade-in-up" style={{ padding: '28px 32px', overflowY: 'auto', height: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Documentation</h1>
          <p className="page-subtitle">Technical reference for the WardAlarm Sentinel system</p>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', marginTop: '0' }}>
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Overview</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '12px' }}>
            WardAlarm Sentinel is a simulated clinical alarm management system designed to evaluate the effectiveness of a multi-feature pattern analyser versus a frequency-only baseline classifier for identifying clinically significant medication alarm events.
          </p>
          <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid var(--medium)', color: 'var(--medium)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
            ⚠️ SIMULATED DATA – NOT FOR REAL CLINICAL USE. This system is not approved for clinical decision-making.
          </div>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Architecture</h2>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Layer</th>
              <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Module</th>
              <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Description</th>
            </tr></thead>
            <tbody>
              {[
                ['State', 'AlarmContext.jsx', 'Global React context holding alarms, patients, wards, drugs, patterns, and stats.'],
                ['Data', 'alarmStream.js', 'Generates randomised alarm events from the patient/drug registry.'],
                ['Data', 'experimentDataset.js', 'Deterministic simulation dataset with ground truth and staff responses.'],
                ['Engine', 'patternAnalyser.js', 'Detects clinical alarm patterns and returns explainability objects.'],
                ['UI', 'Dashboard', 'Real-time overview with stats, patterns, and ward risk.'],
                ['UI', 'Alarm Log', 'Full sortable alarm table with filters and explainability modal.'],
                ['UI', 'Patients', 'Patient list with contextual risk detail and human review actions.'],
                ['UI', 'Simulation Lab', 'Injects targeted scenarios into the shared alarm state.'],
                ['UI', 'Analytics', 'Dynamic KPI cards and charts from live alarm context.'],
                ['UI', 'Reports', '15-section experiment report from actual measured results.'],
                ['UI', 'Baseline vs Analyser', 'Interactive comparison table with Run Experiment button.'],
                ['UI', 'Patient Journeys', 'Timeline view of Journey A (high) and B (low) from experiment dataset.'],
                ['UI', 'Error Analysis', 'FP/FN breakdown with harm analysis and corrective lessons.'],
                ['UI', 'Failure Modes', 'Edge case analysis for missing context, conflicting signals, rapid escalation.'],
                ['UI', 'Validation', 'Stakeholder feedback form with submission and summary display.'],
              ].map(([layer, mod, desc]) => (
                <tr key={mod} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{layer}</td>
                  <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-bright)' }}>{mod}</td>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Pattern Types</h2>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', lineHeight: 2, fontSize: '13px' }}>
            <li><strong>REPEATED_MISSED_DOSE</strong> — Same patient + drug has ≥2 missed dose alarms</li>
            <li><strong>WARD_OVERDUE_CLUSTER</strong> — A ward has ≥3 overdue alarms within 1 hour</li>
            <li><strong>RAPID_ESCALATION</strong> — A patient has ≥3 alarms within 5 minutes</li>
            <li><strong>HIGH_RISK_DRUG_STORM</strong> — A critical-risk drug triggers ≥3 alarms within 2 hours</li>
            <li><strong>DUPLICATE_ALERT</strong> — Same patient + drug fires ≥2 alarms within 20 minutes</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Safety Principles</h2>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', lineHeight: 2, fontSize: '13px' }}>
            <li>Every high-priority case surfaces evidence, confidence, uncertainty, and potential harm.</li>
            <li>No autonomous clinical decisions — all escalations require human review.</li>
            <li>System uses: <em>"Potential escalation detected – human clinical review required."</em></li>
            <li>Missing patient context is surfaced explicitly rather than silently assumed.</li>
            <li>Conflicting signals raise uncertainty rather than forcing a confident classification.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
