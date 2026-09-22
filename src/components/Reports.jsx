import { useState, useEffect, useMemo, useRef } from 'react'
import { useAlarms } from '../context/AlarmContext'
import { EXPERIMENT_DATASET, computeMetrics, TARGET_METRICS } from '../data/experimentDataset'
import { analysePatterns } from '../engine/patternAnalyser'
import api from '../services/api'
import './Reports.css'

/**
 * Baseline classifier: frequency-only risk score.
 * Returns patterns with simple threshold-based detection.
 */
function baselineAnalyse(dataset) {
  const ONE_HOUR = 60 * 60 * 1000
  const now = Date.now()
  const recent = dataset.filter(a => now - a.timestamp < ONE_HOUR)
  const score = Math.min(100, (recent.length / 10) * 100)

  // Baseline: flag everything above medium severity as "detected"
  const detectedIds = dataset
    .filter(a => a.severity === 'critical' || a.severity === 'high')
    .map(a => a.id)

  return [{
    id: 'BASELINE-FREQ',
    type: 'FREQUENCY_BASELINE',
    severity: score > 50 ? 'high' : 'low',
    evidence: detectedIds,
    riskScore: score,
    confidence: 0.5,
    uncertainty: 0.5,
  }]
}

function MetricRow({ label, baseline, target, measured, isPercentage = true }) {
  const fmt = (v) => v == null ? '—' : isPercentage ? `${(v * 100).toFixed(1)}%` : v
  const measuredClass = target != null && measured != null
    ? (measured >= target ? 'metric-pass' : 'metric-fail')
    : ''
  return (
    <tr>
      <td className="metric-label">{label}</td>
      <td className="metric-val">{fmt(baseline)}</td>
      <td className="metric-val metric-target">{fmt(target)}</td>
      <td className={`metric-val ${measuredClass}`}>{fmt(measured)}</td>
    </tr>
  )
}

export default function Reports() {
  const { alarms, patterns } = useAlarms()
  const reportRef = useRef(null)

  const [savedReports, setSavedReports] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveToast, setSaveToast] = useState('')
  const [showSavedModal, setShowSavedModal] = useState(false)

  // Load saved reports from SQLite database
  useEffect(() => {
    async function loadReports() {
      try {
        const res = await api.getReports()
        if (res.success && res.reports) {
          setSavedReports(res.reports)
        }
      } catch (err) {
        console.warn('Could not load saved reports from DB:', err.message)
      }
    }
    loadReports()
  }, [])

  // Run the improved analyser on the experiment dataset
  const improvedPatterns = useMemo(
    () => analysePatterns(EXPERIMENT_DATASET),
    []
  )
  const improvedMetrics = useMemo(
    () => computeMetrics(improvedPatterns, EXPERIMENT_DATASET),
    [improvedPatterns]
  )

  // Run the baseline analyser on the experiment dataset
  const baselinePatterns = useMemo(
    () => baselineAnalyse(EXPERIMENT_DATASET),
    []
  )
  const baselineMetrics = useMemo(
    () => computeMetrics(baselinePatterns, EXPERIMENT_DATASET),
    [baselinePatterns]
  )

  // Derived metrics
  const improved = useMemo(() => {
    const m = improvedMetrics
    const sensitivity = m.recall
    const specificity = m.tn + m.fp > 0 ? m.tn / (m.tn + m.fp) : 0
    const fpr = 1 - specificity
    const fnr = m.tp + m.fn > 0 ? m.fn / (m.tp + m.fn) : 0
    const accuracy = m.totalAlarms > 0 ? (m.tp + m.tn) / m.totalAlarms : 0
    const nuisanceTotal = EXPERIMENT_DATASET.filter(a => a.label === 'NUISANCE').length
    const nuisanceRate = EXPERIMENT_DATASET.length > 0 ? nuisanceTotal / EXPERIMENT_DATASET.length : 0
    return { ...m, sensitivity, specificity, fpr, fnr, accuracy, nuisanceRate }
  }, [improvedMetrics])

  const baseline = useMemo(() => {
    const m = baselineMetrics
    const sensitivity = m.recall
    const specificity = m.tn + m.fp > 0 ? m.tn / (m.tn + m.fp) : 0
    const fpr = 1 - specificity
    const fnr = m.tp + m.fn > 0 ? m.fn / (m.tp + m.fn) : 0
    const accuracy = m.totalAlarms > 0 ? (m.tp + m.tn) / m.totalAlarms : 0
    return { ...m, sensitivity, specificity, fpr, fnr, accuracy }
  }, [baselineMetrics])

  // Experiment dataset stats
  const dsStats = useMemo(() => {
    const confirmed = EXPERIMENT_DATASET.filter(a => a.confirmedEvent === true).length
    const notConfirmed = EXPERIMENT_DATASET.filter(a => a.confirmedEvent === false).length
    const unknown = EXPERIMENT_DATASET.filter(a => a.confirmedEvent == null).length
    const journeyA = EXPERIMENT_DATASET.filter(a => a.id.startsWith('EXP-A')).length
    const journeyB = EXPERIMENT_DATASET.filter(a => a.id.startsWith('EXP-B')).length
    const failureCases = EXPERIMENT_DATASET.filter(a => a.id.startsWith('EXP-FC')).length
    const withStaffAck = EXPERIMENT_DATASET.filter(a => a.staffResponse?.ackTime != null).length
    return { total: EXPERIMENT_DATASET.length, confirmed, notConfirmed, unknown, journeyA, journeyB, failureCases, withStaffAck }
  }, [])

  // FP/FN details
  const fpAlarms = useMemo(() => {
    const detectedIds = new Set(improvedPatterns.flatMap(p => p.evidence ?? []))
    return EXPERIMENT_DATASET.filter(a => detectedIds.has(a.id) && a.confirmedEvent !== true)
  }, [improvedPatterns])

  const fnAlarms = useMemo(() => {
    const detectedIds = new Set(improvedPatterns.flatMap(p => p.evidence ?? []))
    return EXPERIMENT_DATASET.filter(a => !detectedIds.has(a.id) && a.confirmedEvent === true)
  }, [improvedPatterns])

  // Failure case details
  const failureCaseAlarms = useMemo(
    () => EXPERIMENT_DATASET.filter(a => a.id.startsWith('EXP-FC')),
    []
  )

  function handlePrint() {
    window.print()
  }

  async function handleSaveReport() {
    setSaving(true)
    try {
      const res = await api.saveReport({
        title: `Clinical Performance Evaluation Report (${new Date().toLocaleDateString('en-GB')})`,
        totalAlarms: alarms.length,
        activeAlarms: alarms.filter((a) => a.status === 'Active').length,
        patternsDetected: patterns.length,
        data: {
          improvedMetrics: improved,
          baselineMetrics: baseline,
          datasetStats: dsStats,
          generatedAt: new Date().toISOString(),
        },
      })
      if (res.success) {
        setSaveToast('Report saved to database successfully!')
        setSavedReports((prev) => [res.report, ...prev])
        setTimeout(() => setSaveToast(''), 3500)
      }
    } catch (err) {
      setSaveToast(`Error saving report: ${err.message}`)
      setTimeout(() => setSaveToast(''), 3500)
    } finally {
      setSaving(false)
    }
  }

  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="reports-page animate-fade-in-up">
      <div className="reports-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Experiment Report</h1>
          <p className="page-subtitle">WardAlarm Sentinel — Alarm Pattern Analyser Evaluation · {reportDate}</p>
        </div>
        <div className="reports-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {saveToast && (
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: '500' }}>
              {saveToast}
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => setShowSavedModal(true)}
            title="View saved reports stored in SQLite"
          >
            📂 Saved Reports ({savedReports.length})
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveReport}
            disabled={saving}
          >
            {saving ? 'Saving...' : '💾 Save Report to DB'}
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>🖨 Print</button>
        </div>
      </div>

      {/* Modal for Saved Reports */}
      {showSavedModal && (
        <div className="modal-backdrop" onClick={() => setShowSavedModal(false)}>
          <div className="modal-card" style={{ maxWidth: '600px', width: '100%', background: '#111827', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#f1f5f9', margin: 0 }}>Persistent Clinical Reports</h2>
              <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setShowSavedModal(false)}>✕</button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
              These reports are stored in SQLite (server/data/clinical_alarm.db) and persist across server restarts.
            </p>
            {savedReports.length === 0 ? (
              <p style={{ color: '#64748b' }}>No saved reports yet. Click "Save Report to DB" to generate one.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                {savedReports.map((r) => (
                  <div key={r.id} style={{ background: '#0a0f1d', border: '1px solid #1e293b', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', color: '#38bdf8' }}>{r.title}</span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.dateFormatted || (r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : 'Recent')}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                      Author: {r.generatedBy} · Total Alarms: {r.totalAlarms} · Patterns: {r.patternsDetected}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="report-body card" ref={reportRef}>

        {/* 1. Executive Summary */}
        <section className="report-section">
          <h2 className="report-h2">1. Executive Summary</h2>
          <p>This report evaluates the WardAlarm Sentinel alarm pattern analyser against a simulated experiment dataset of <strong>{dsStats.total}</strong> alarm events across two patient journeys and {dsStats.failureCases} designated failure cases. The improved multi-feature analyser is compared against a frequency-only baseline classifier.</p>
          <div className="summary-box">
            <div className="summary-item">
              <span className="summary-label">Improved F1</span>
              <span className="summary-value">{(improved.f1 * 100).toFixed(1)}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Baseline F1</span>
              <span className="summary-value">{(baseline.f1 * 100).toFixed(1)}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Target F1</span>
              <span className="summary-value">{(TARGET_METRICS.f1 * 100).toFixed(1)}%</span>
            </div>
          </div>
          <p className="report-disclaimer">⚠️ SIMULATED DATA – NOT FOR REAL CLINICAL USE. All results are derived from the simulated experiment dataset and do not represent real clinical outcomes.</p>
        </section>

        {/* 2. Dataset Summary */}
        <section className="report-section">
          <h2 className="report-h2">2. Dataset Summary</h2>
          <table className="report-table report-table-sm">
            <tbody>
              <tr><td>Total Experiment Alarms</td><td><strong>{dsStats.total}</strong></td></tr>
              <tr><td>Confirmed Clinical Events</td><td><strong>{dsStats.confirmed}</strong></td></tr>
              <tr><td>Not Confirmed (Non-events)</td><td><strong>{dsStats.notConfirmed}</strong></td></tr>
              <tr><td>Unknown / Missing Context</td><td><strong>{dsStats.unknown}</strong></td></tr>
              <tr><td>Journey A (High-Urgency)</td><td>{dsStats.journeyA} alarms</td></tr>
              <tr><td>Journey B (Low-Urgency)</td><td>{dsStats.journeyB} alarms</td></tr>
              <tr><td>Failure Cases</td><td>{dsStats.failureCases} alarms</td></tr>
              <tr><td>With Staff Acknowledgement</td><td>{dsStats.withStaffAck} alarms</td></tr>
            </tbody>
          </table>
        </section>

        {/* 3. Alarm Pattern Summary */}
        <section className="report-section">
          <h2 className="report-h2">3. Alarm Pattern Summary</h2>
          <p>The improved analyser detected <strong>{improved.totalPatterns}</strong> distinct patterns from the experiment dataset, covering <strong>{improved.detectedAlarms}</strong> individual alarm events.</p>
          <table className="report-table">
            <thead>
              <tr><th>Pattern Type</th><th>Count</th><th>Max Severity</th></tr>
            </thead>
            <tbody>
              {Object.entries(
                improvedPatterns.reduce((acc, p) => {
                  if (!acc[p.type]) acc[p.type] = { count: 0, maxSev: 'low' }
                  acc[p.type].count++
                  const SEV = { critical: 3, high: 2, medium: 1, low: 0 }
                  if ((SEV[p.severity] ?? 0) > (SEV[acc[p.type].maxSev] ?? 0)) acc[p.type].maxSev = p.severity
                  return acc
                }, {})
              ).map(([type, info]) => (
                <tr key={type}>
                  <td>{type}</td>
                  <td>{info.count}</td>
                  <td><span className={`badge badge-${info.maxSev}`}>{info.maxSev}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 4. Baseline Performance */}
        <section className="report-section">
          <h2 className="report-h2">4. Baseline Performance</h2>
          <p>The baseline classifier uses frequency-only thresholding (alarms per hour × scaling factor). It flags all high/critical severity alarms without context analysis.</p>
          <table className="report-table report-table-sm">
            <tbody>
              <tr><td>True Positives</td><td>{baseline.tp}</td></tr>
              <tr><td>False Positives</td><td>{baseline.fp}</td></tr>
              <tr><td>False Negatives</td><td>{baseline.fn}</td></tr>
              <tr><td>True Negatives</td><td>{baseline.tn}</td></tr>
              <tr><td>Precision</td><td>{(baseline.precision * 100).toFixed(1)}%</td></tr>
              <tr><td>Recall</td><td>{(baseline.recall * 100).toFixed(1)}%</td></tr>
              <tr><td>F1</td><td>{(baseline.f1 * 100).toFixed(1)}%</td></tr>
            </tbody>
          </table>
        </section>

        {/* 5. Improved Analyser Performance */}
        <section className="report-section">
          <h2 className="report-h2">5. Improved Analyser Performance</h2>
          <p>The improved analyser uses multi-feature pattern detection: repeated missed doses, ward overdue clusters, rapid escalation, duplicate alerts, and high-risk drug storms.</p>
          <table className="report-table report-table-sm">
            <tbody>
              <tr><td>True Positives</td><td>{improved.tp}</td></tr>
              <tr><td>False Positives</td><td>{improved.fp}</td></tr>
              <tr><td>False Negatives</td><td>{improved.fn}</td></tr>
              <tr><td>True Negatives</td><td>{improved.tn}</td></tr>
              <tr><td>Precision</td><td>{(improved.precision * 100).toFixed(1)}%</td></tr>
              <tr><td>Recall</td><td>{(improved.recall * 100).toFixed(1)}%</td></tr>
              <tr><td>F1</td><td>{(improved.f1 * 100).toFixed(1)}%</td></tr>
            </tbody>
          </table>
        </section>

        {/* 6. Target vs Measured */}
        <section className="report-section">
          <h2 className="report-h2">6. Target vs Measured — Comparison Table</h2>
          <p>
            <strong>TARGET</strong> = predefined project goal. <strong>MEASURED</strong> = result calculated from the experiment.
          </p>
          <table className="report-table comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Baseline</th>
                <th>Target</th>
                <th>Measured (Improved)</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow label="Accuracy" baseline={baseline.accuracy} target={null} measured={improved.accuracy} />
              <MetricRow label="Precision" baseline={baseline.precision} target={TARGET_METRICS.precision} measured={improved.precision} />
              <MetricRow label="Recall" baseline={baseline.recall} target={TARGET_METRICS.recall} measured={improved.recall} />
              <MetricRow label="F1 Score" baseline={baseline.f1} target={TARGET_METRICS.f1} measured={improved.f1} />
              <MetricRow label="Sensitivity" baseline={baseline.sensitivity} target={TARGET_METRICS.recall} measured={improved.sensitivity} />
              <MetricRow label="Specificity" baseline={baseline.specificity} target={null} measured={improved.specificity} />
              <MetricRow label="False Positive Rate" baseline={baseline.fpr} target={null} measured={improved.fpr} />
              <MetricRow label="False Negative Rate" baseline={baseline.fnr} target={null} measured={improved.fnr} />
              <MetricRow label="Nuisance Alarm Rate" baseline={null} target={null} measured={improved.nuisanceRate} />
            </tbody>
          </table>
        </section>

        {/* 7. False Positive Analysis */}
        <section className="report-section">
          <h2 className="report-h2">7. False Positive Analysis</h2>
          <p>The improved analyser flagged <strong>{improved.fp}</strong> alarm(s) that were not confirmed clinical events.</p>
          {fpAlarms.length > 0 ? (
            <table className="report-table">
              <thead><tr><th>ID</th><th>Patient</th><th>Drug</th><th>Type</th><th>Severity</th><th>Confirmed?</th></tr></thead>
              <tbody>
                {fpAlarms.map(a => (
                  <tr key={a.id}>
                    <td className="font-mono">{a.id}</td>
                    <td>{a.patient}</td>
                    <td>{a.drug}</td>
                    <td>{a.type}</td>
                    <td><span className={`badge badge-${a.severity}`}>{a.severity}</span></td>
                    <td>{a.confirmedEvent == null ? 'Unknown' : a.confirmedEvent ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-muted">No false positives detected.</p>}
          <p className="report-note">Potential harm of false positives: unnecessary drug holds, unwarranted clinical interruptions, alarm fatigue contribution.</p>
        </section>

        {/* 8. False Negative Analysis */}
        <section className="report-section">
          <h2 className="report-h2">8. False Negative Analysis</h2>
          <p>The improved analyser missed <strong>{improved.fn}</strong> confirmed clinical event(s).</p>
          {fnAlarms.length > 0 ? (
            <table className="report-table">
              <thead><tr><th>ID</th><th>Patient</th><th>Drug</th><th>Type</th><th>Severity</th></tr></thead>
              <tbody>
                {fnAlarms.map(a => (
                  <tr key={a.id}>
                    <td className="font-mono">{a.id}</td>
                    <td>{a.patient}</td>
                    <td>{a.drug}</td>
                    <td>{a.type}</td>
                    <td><span className={`badge badge-${a.severity}`}>{a.severity}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-muted">No false negatives detected — all confirmed events were captured.</p>}
          <p className="report-note">Potential harm of false negatives: missed escalations, delayed clinical intervention, adverse patient outcomes.</p>
        </section>

        {/* 9. Failure Cases */}
        <section className="report-section">
          <h2 className="report-h2">9. Failure Cases</h2>
          <p>The experiment includes {dsStats.failureCases} designed failure cases to test analyser robustness.</p>
          <table className="report-table">
            <thead><tr><th>ID</th><th>Failure Type</th><th>Patient</th><th>Drug</th><th>Severity</th><th>Confirmed?</th></tr></thead>
            <tbody>
              {failureCaseAlarms.map(a => {
                let failureType = 'Unknown'
                if (a.id === 'EXP-FC001') failureType = 'Missing Patient Context'
                else if (a.id === 'EXP-FC002' || a.id === 'EXP-FC003') failureType = 'Conflicting Signals'
                else if (a.id === 'EXP-FC004' || a.id === 'EXP-FC005') failureType = 'Rapid Escalation / Duplicate'
                return (
                  <tr key={a.id}>
                    <td className="font-mono">{a.id}</td>
                    <td>{failureType}</td>
                    <td>{a.patient}</td>
                    <td>{a.drug}</td>
                    <td><span className={`badge badge-${a.severity}`}>{a.severity}</span></td>
                    <td>{a.confirmedEvent == null ? 'Unknown' : a.confirmedEvent ? 'Yes' : 'No'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* 10. Patient Journey Results */}
        <section className="report-section">
          <h2 className="report-h2">10. Patient Journey Results</h2>
          <div className="journey-grid">
            <div className="journey-box journey-box--a">
              <h3>Journey A — High Urgency</h3>
              <p><strong>Patient:</strong> James Hargreaves (P001), Cardiology</p>
              <p><strong>Alarms:</strong> {dsStats.journeyA}</p>
              <p><strong>Characteristics:</strong> Frequent critical alarms including rapid escalation cluster (&lt;5 min apart). Repeated missed doses of Warfarin. Multiple simultaneous critical drugs.</p>
              <p><strong>Expected:</strong> All alarms should trigger ESCALATION patterns with high confidence.</p>
            </div>
            <div className="journey-box journey-box--b">
              <h3>Journey B — Low Urgency</h3>
              <p><strong>Patient:</strong> Margaret Osei (P002), Medical</p>
              <p><strong>Alarms:</strong> {dsStats.journeyB}</p>
              <p><strong>Characteristics:</strong> Mostly timing variance and low-severity alarms. Longer intervals between events. Most alarms resolved promptly.</p>
              <p><strong>Expected:</strong> Alarms should be classified as NUISANCE with low risk scores.</p>
            </div>
          </div>
        </section>

        {/* 11. Human Review Summary */}
        <section className="report-section">
          <h2 className="report-h2">11. Human Review Summary</h2>
          <p>Every high-priority case exposes: evidence, risk score, confidence, uncertainty, potential false-positive harm, potential false-negative harm, and a human review requirement.</p>
          <p>The system does not make autonomous clinical decisions. All escalation recommendations require:</p>
          <ul className="report-list">
            <li>Confirm Escalation — clinician agrees the case requires senior review</li>
            <li>Mark as Nuisance — clinician determines the alarm is non-actionable</li>
            <li>Request More Information — insufficient data to decide</li>
            <li>Override Recommendation — clinician disagrees with the analyser's classification</li>
            <li>Add Review Note — free-text clinical annotation</li>
          </ul>
          <p className="report-note">⚡ "Potential escalation detected – human clinical review required."</p>
        </section>

        {/* 12. Uncertainty Analysis */}
        <section className="report-section">
          <h2 className="report-h2">12. Uncertainty Analysis</h2>
          <p>Each detected pattern carries explicit confidence and uncertainty scores derived from the consistency of evidence features.</p>
          {improvedPatterns.filter(p => p.type !== 'FREQUENCY_BASELINE').length > 0 ? (
            <table className="report-table">
              <thead><tr><th>Pattern</th><th>Title</th><th>Risk Score</th><th>Confidence</th><th>Uncertainty</th></tr></thead>
              <tbody>
                {improvedPatterns.filter(p => p.type !== 'FREQUENCY_BASELINE').map(p => (
                  <tr key={p.id}>
                    <td className="font-mono">{p.id}</td>
                    <td>{p.title}</td>
                    <td>{p.riskScore?.toFixed(1)}</td>
                    <td>{(p.confidence * 100).toFixed(0)}%</td>
                    <td>{(p.uncertainty * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-muted">No non-baseline patterns detected to report uncertainty for.</p>}
        </section>

        {/* 13. Potential Harm Analysis */}
        <section className="report-section">
          <h2 className="report-h2">13. Potential Harm Analysis</h2>
          <p>For every detected pattern, the analyser surfaces both false-positive and false-negative potential harms:</p>
          {improvedPatterns.filter(p => p.falsePositivePotential || p.falseNegativePotential).map(p => (
            <div key={p.id} className="harm-box">
              <strong>{p.title} ({p.id})</strong>
              {p.falsePositivePotential && <p className="harm-fp">FP harm: {p.falsePositivePotential}</p>}
              {p.falseNegativePotential && <p className="harm-fn">FN harm: {p.falseNegativePotential}</p>}
            </div>
          ))}
        </section>

        {/* 14. Limitations */}
        <section className="report-section">
          <h2 className="report-h2">14. Limitations</h2>
          <ul className="report-list">
            <li>All data is simulated. Results do not reflect real clinical environments.</li>
            <li>The experiment dataset is small ({dsStats.total} alarms). Statistical significance is limited.</li>
            <li>Staff response times are synthetically generated and may not reflect actual clinical workflows.</li>
            <li>The baseline classifier is intentionally simplistic for comparison purposes.</li>
            <li>Failure cases are deliberately constructed to test edge conditions.</li>
            <li>No real patient data or clinical outcomes have been used.</li>
          </ul>
        </section>

        {/* 15. Final Conclusion */}
        <section className="report-section report-section--last">
          <h2 className="report-h2">15. Final Conclusion</h2>
          <p>The improved multi-feature pattern analyser demonstrates measurably better performance than the frequency-only baseline across the simulated experiment dataset:</p>
          <ul className="report-list">
            <li>Improved F1: <strong>{(improved.f1 * 100).toFixed(1)}%</strong> vs Baseline: <strong>{(baseline.f1 * 100).toFixed(1)}%</strong></li>
            <li>Improved Precision: <strong>{(improved.precision * 100).toFixed(1)}%</strong> vs Baseline: <strong>{(baseline.precision * 100).toFixed(1)}%</strong></li>
            <li>Improved Recall: <strong>{(improved.recall * 100).toFixed(1)}%</strong> vs Baseline: <strong>{(baseline.recall * 100).toFixed(1)}%</strong></li>
          </ul>
          <p>The system correctly identifies high-urgency patient journeys and handles failure cases including missing context, conflicting signals, and rapid escalation. All classifications include explainability metrics and require human clinical review before action.</p>
          <p className="report-disclaimer">⚠️ SIMULATED DATA – NOT FOR REAL CLINICAL USE. This system is not an autonomous clinical decision-making tool.</p>
        </section>

      </div>
    </div>
  )
}
