import { useMemo, useState } from 'react'
import { useAlarms } from '../context/AlarmContext'
import { EXPERIMENT_DATASET, computeMetrics, TARGET_METRICS } from '../data/experimentDataset'
import { analysePatterns } from '../engine/patternAnalyser'
import './BaselineVsAnalyser.css'

/**
 * Baseline classifier: frequency-only risk score.
 */
function baselineAnalyse(dataset) {
  const ONE_HOUR = 60 * 60 * 1000
  const now = Date.now()
  const recent = dataset.filter(a => now - a.timestamp < ONE_HOUR)
  const score = Math.min(100, (recent.length / 10) * 100)

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

export default function BaselineVsAnalyser() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState(null)

  const runExperiment = () => {
    setIsRunning(true)
    // Simulate processing time
    setTimeout(() => {
      const improvedPatterns = analysePatterns(EXPERIMENT_DATASET)
      const improvedMetrics = computeMetrics(improvedPatterns, EXPERIMENT_DATASET)
      
      const baselinePatterns = baselineAnalyse(EXPERIMENT_DATASET)
      const baselineMetrics = computeMetrics(baselinePatterns, EXPERIMENT_DATASET)

      const derive = (m) => {
        const sensitivity = m.recall
        const specificity = m.tn + m.fp > 0 ? m.tn / (m.tn + m.fp) : 0
        const fpr = 1 - specificity
        const fnr = m.tp + m.fn > 0 ? m.fn / (m.tp + m.fn) : 0
        const accuracy = m.totalAlarms > 0 ? (m.tp + m.tn) / m.totalAlarms : 0
        return { ...m, sensitivity, specificity, fpr, fnr, accuracy }
      }

      setResults({
        improved: derive(improvedMetrics),
        baseline: derive(baselineMetrics)
      })
      setIsRunning(false)
    }, 800)
  }

  return (
    <div className="baseline-page animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Baseline vs Analyser Comparison</h1>
          <p className="page-subtitle">Run the experiment on the simulation dataset to evaluate performance</p>
        </div>
      </div>

      <div className="card comparison-panel">
        <div className="comparison-actions">
          <button 
            className="btn btn-primary" 
            onClick={runExperiment}
            disabled={isRunning}
          >
            {isRunning ? 'Running Experiment...' : '▶ Run Experiment'}
          </button>
        </div>

        {results ? (
          <div className="comparison-results">
            <h3 className="section-title">Experiment Results</h3>
            <p className="text-muted mb-16">
              Comparing frequency-only thresholding (Baseline) against multi-feature context evaluation (Improved Analyser) on {EXPERIMENT_DATASET.length} simulated alarms.
            </p>
            
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Baseline</th>
                  <th>Target</th>
                  <th>Measured (Improved)</th>
                </tr>
              </thead>
              <tbody>
                <MetricRow label="Accuracy" baseline={results.baseline.accuracy} target={null} measured={results.improved.accuracy} />
                <MetricRow label="Precision" baseline={results.baseline.precision} target={TARGET_METRICS.precision} measured={results.improved.precision} />
                <MetricRow label="Recall" baseline={results.baseline.recall} target={TARGET_METRICS.recall} measured={results.improved.recall} />
                <MetricRow label="F1 Score" baseline={results.baseline.f1} target={TARGET_METRICS.f1} measured={results.improved.f1} />
                <MetricRow label="Sensitivity" baseline={results.baseline.sensitivity} target={TARGET_METRICS.recall} measured={results.improved.sensitivity} />
                <MetricRow label="Specificity" baseline={results.baseline.specificity} target={null} measured={results.improved.specificity} />
                <MetricRow label="False Positive Rate" baseline={results.baseline.fpr} target={null} measured={results.improved.fpr} />
                <MetricRow label="False Negative Rate" baseline={results.baseline.fnr} target={null} measured={results.improved.fnr} />
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>Click "Run Experiment" to evaluate the analysers.</p>
          </div>
        )}
      </div>
    </div>
  )
}
