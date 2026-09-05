import { useMemo } from 'react'
import { EXPERIMENT_DATASET, computeMetrics } from '../data/experimentDataset'
import { analysePatterns } from '../engine/patternAnalyser'
import './ErrorAnalysis.css'

export default function ErrorAnalysis() {
  const improvedPatterns = useMemo(() => analysePatterns(EXPERIMENT_DATASET), [])
  const metrics = useMemo(() => computeMetrics(improvedPatterns, EXPERIMENT_DATASET), [improvedPatterns])

  const detectedIds = useMemo(() => 
    new Set(improvedPatterns.flatMap(p => p.evidence ?? [])),
  [improvedPatterns])

  const falsePositives = useMemo(() =>
    EXPERIMENT_DATASET.filter(a => detectedIds.has(a.id) && a.confirmedEvent !== true),
  [detectedIds])

  const falseNegatives = useMemo(() =>
    EXPERIMENT_DATASET.filter(a => !detectedIds.has(a.id) && a.confirmedEvent === true),
  [detectedIds])

  return (
    <div className="error-analysis-page animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Error Analysis</h1>
          <p className="page-subtitle">False positive and false negative breakdown from the experiment dataset</p>
        </div>
      </div>

      <div className="error-summary-grid">
        <div className="card error-kpi error-kpi--fp">
          <div className="error-kpi-value">{metrics.fp}</div>
          <div className="error-kpi-label">False Positives</div>
          <div className="error-kpi-desc">Alarms flagged but not confirmed clinical events</div>
        </div>
        <div className="card error-kpi error-kpi--fn">
          <div className="error-kpi-value">{metrics.fn}</div>
          <div className="error-kpi-label">False Negatives</div>
          <div className="error-kpi-desc">Confirmed events missed by the analyser</div>
        </div>
        <div className="card error-kpi error-kpi--tp">
          <div className="error-kpi-value">{metrics.tp}</div>
          <div className="error-kpi-label">True Positives</div>
          <div className="error-kpi-desc">Confirmed events correctly detected</div>
        </div>
        <div className="card error-kpi error-kpi--tn">
          <div className="error-kpi-value">{metrics.tn}</div>
          <div className="error-kpi-label">True Negatives</div>
          <div className="error-kpi-desc">Non-events correctly not escalated</div>
        </div>
      </div>

      <div className="error-sections">
        {/* FALSE POSITIVES */}
        <div className="card error-section">
          <h2 className="error-h2 error-h2--fp">⚠ False Positives ({falsePositives.length})</h2>
          <p className="error-desc">These alarms were detected by the analyser but were NOT confirmed clinical events.</p>
          {falsePositives.length > 0 ? (
            <div className="error-list">
              {falsePositives.map(a => (
                <div key={a.id} className="error-card error-card--fp">
                  <div className="error-card-header">
                    <span className="font-mono text-muted">{a.id}</span>
                    <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                  </div>
                  <div className="error-field"><strong>Patient:</strong> {a.patient ?? '(missing)'}</div>
                  <div className="error-field"><strong>Drug:</strong> {a.drug}</div>
                  <div className="error-field"><strong>Alarm type:</strong> {a.type}</div>
                  <div className="error-field"><strong>Prediction:</strong> <span className="text-high">ESCALATION / DETECTED</span></div>
                  <div className="error-field"><strong>Actual label:</strong> <span className="text-low">Not a confirmed event</span></div>
                  <div className="error-field error-harm"><strong>Potential FP harm:</strong> Unnecessary drug hold, unwarranted clinical interruption, alarm fatigue contribution.</div>
                  <div className="error-field error-lesson"><strong>Corrective lesson:</strong> Verify patient context before escalating. Check for conflicting low-severity signals.</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="error-empty">✅ No false positives detected — the analyser did not flag any non-event alarms as escalations.</div>
          )}
        </div>

        {/* FALSE NEGATIVES */}
        <div className="card error-section">
          <h2 className="error-h2 error-h2--fn">⚠ False Negatives ({falseNegatives.length})</h2>
          <p className="error-desc">These were confirmed clinical events that the analyser failed to flag.</p>
          {falseNegatives.length > 0 ? (
            <div className="error-list">
              {falseNegatives.map(a => (
                <div key={a.id} className="error-card error-card--fn">
                  <div className="error-card-header">
                    <span className="font-mono text-muted">{a.id}</span>
                    <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                  </div>
                  <div className="error-field"><strong>Patient:</strong> {a.patient ?? '(missing)'}</div>
                  <div className="error-field"><strong>Drug:</strong> {a.drug}</div>
                  <div className="error-field"><strong>Alarm type:</strong> {a.type}</div>
                  <div className="error-field"><strong>Prediction:</strong> <span className="text-muted">NOT DETECTED</span></div>
                  <div className="error-field"><strong>Actual label:</strong> <span className="text-critical">Confirmed clinical event</span></div>
                  <div className="error-field error-harm"><strong>Potential FN harm:</strong> Missed escalation, delayed clinical intervention, possible adverse patient outcome.</div>
                  <div className="error-field error-lesson"><strong>Corrective lesson:</strong> Lower detection threshold for this alarm pattern. Include patient history in risk scoring.</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="error-empty">✅ No false negatives — all confirmed clinical events were captured by the analyser.</div>
          )}
        </div>
      </div>
    </div>
  )
}
