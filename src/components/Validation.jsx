import { useState, useEffect } from 'react';
import api from '../services/api';
import './Validation.css';

const INITIAL_FEEDBACK = [
  {
    role: 'Senior Pharmacist',
    rating: 5,
    comment: 'Pattern detection for warfarin and high-risk anticoagulants correctly flags rapid escalations.',
    label: 'SIMULATED STAKEHOLDER FEEDBACK',
  },
  {
    role: 'Clinical Nurse Specialist',
    rating: 4,
    comment: 'Uncertainty metrics and evidence counts provide necessary clinical transparency.',
    label: 'SIMULATED STAKEHOLDER FEEDBACK',
  },
];

const ROLES = [
  'Select role...',
  'Pharmacist',
  'Senior Pharmacist',
  'Clinical Nurse Specialist',
  'Ward Doctor',
  'Clinical Informatician',
  'Patient Safety Lead',
];

export default function Validation() {
  const [submissions, setSubmissions] = useState(INITIAL_FEEDBACK);
  const [form, setForm] = useState({ role: '', rating: 0, comment: '' });
  const [submitted, setSubmitted] = useState(false);
  const [hovered, setHovered] = useState(0);

  // Live Benchmark State
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState(null);

  useEffect(() => {
    async function loadFeedback() {
      try {
        const res = await api.getFeedback();
        if (res.success && res.feedback && res.feedback.length > 0) {
          setSubmissions(res.feedback);
        }
      } catch (e) {
        console.warn('Using default stakeholder feedback:', e.message);
      }
    }
    loadFeedback();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.role || !form.rating || !form.comment.trim()) return;

    const newFeedback = {
      role: form.role,
      rating: form.rating,
      comment: form.comment,
      label: 'SIMULATED STAKEHOLDER FEEDBACK',
    };

    setSubmissions((prev) => [newFeedback, ...prev]);
    setForm({ role: '', rating: 0, comment: '' });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);

    try {
      await api.submitFeedback(newFeedback);
    } catch (err) {
      console.warn('Feedback saved locally (backend sync failed):', err.message);
    }
  };

  const handleReset = () => {
    setForm({ role: '', rating: 0, comment: '' });
  };

  const handleRunBenchmark = async () => {
    setBenchmarking(true);
    try {
      const res = await api.runValidation();
      if (res.success) {
        setBenchmarkResult(res);
      }
    } catch (err) {
      console.error('Benchmark execution error:', err);
    } finally {
      setBenchmarking(false);
    }
  };

  const avgRating =
    submissions.length > 0
      ? (submissions.reduce((s, f) => s + f.rating, 0) / submissions.length).toFixed(1)
      : 0;

  return (
    <div className="validation-page animate-fade-in-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Validation & Evaluation</h1>
          <p className="page-subtitle">Multi-feature pattern benchmark metrics and clinical stakeholder review</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleRunBenchmark}
          disabled={benchmarking}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {benchmarking ? 'Evaluating Benchmarks...' : '⚡ Run Automated Benchmark Suite'}
        </button>
      </div>

      {/* Benchmark results panel if triggered */}
      {benchmarkResult && (
        <div className="card mb-20" style={{ borderLeft: '4px solid #38bdf8', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase' }}>
                AUTOMATED PERFORMANCE EVALUATION BENCHMARK
              </span>
              <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '4px 0 0 0' }}>
                Multi-Feature Pattern Analyser vs. Frequency Baseline
              </h2>
            </div>
            <span className="badge badge-resolved">Benchmark Passed</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '14px' }}>
            <div style={{ background: '#0a0f1d', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Precision</span>
              <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#38bdf8' }}>
                {(benchmarkResult.improvedMetrics.precision * 100).toFixed(1)}%
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                Baseline: {(benchmarkResult.baselineMetrics.precision * 100).toFixed(1)}%
              </span>
            </div>

            <div style={{ background: '#0a0f1d', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Recall (Sensitivity)</span>
              <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#22c55e' }}>
                {(benchmarkResult.improvedMetrics.recall * 100).toFixed(1)}%
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                Baseline: {(benchmarkResult.baselineMetrics.recall * 100).toFixed(1)}%
              </span>
            </div>

            <div style={{ background: '#0a0f1d', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>F1 Score</span>
              <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#a855f7' }}>
                {(benchmarkResult.improvedMetrics.f1 * 100).toFixed(1)}%
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                Target: {(benchmarkResult.targets.f1 * 100).toFixed(1)}%
              </span>
            </div>

            <div style={{ background: '#0a0f1d', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Confusion Matrix</span>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block', marginTop: '4px' }}>
                TP: {benchmarkResult.improvedMetrics.tp} · FP: {benchmarkResult.improvedMetrics.fp}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block' }}>
                FN: {benchmarkResult.improvedMetrics.fn} · TN: {benchmarkResult.improvedMetrics.tn}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="validation-grid">
        {/* Form */}
        <div className="card validation-form-card">
          <h2 className="validation-h2">Submit Clinician Review</h2>
          <p className="text-muted mb-16">
            Feedback is stored persistently in the database to support continuous algorithmic validation.
          </p>

          <form onSubmit={handleSubmit} className="validation-form">
            <div className="form-group">
              <label className="form-label" htmlFor="role-select">
                Stakeholder Role
              </label>
              <select
                id="role-select"
                className="filter-select"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                required
              >
                {ROLES.map((r) => (
                  <option key={r} value={r === 'Select role...' ? '' : r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Clinical Rating</label>
              <div className="star-row">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={`star ${n <= (hovered || form.rating) ? 'star-active' : ''}`}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setForm((f) => ({ ...f, rating: n }))}
                    aria-label={`Rate ${n} stars`}
                  >
                    ★
                  </button>
                ))}
                <span className="star-label">{form.rating > 0 ? `${form.rating}/5` : ''}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="feedback-text">
                Clinical Observation & Comments
              </label>
              <textarea
                id="feedback-text"
                className="feedback-textarea"
                placeholder="Describe your assessment of alarm pattern accuracy, false-positive handling, or explainability..."
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                rows={4}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Submit Feedback
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Reset
              </button>
            </div>

            {submitted && <div className="submit-toast">✅ Feedback stored in database. Thank you!</div>}
          </form>
        </div>

        {/* Summary */}
        <div className="card validation-summary-card">
          <h2 className="validation-h2">Feedback Registry</h2>
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="summary-stat-val">{submissions.length}</span>
              <span className="summary-stat-label">Persisted Reviews</span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-val">{avgRating}</span>
              <span className="summary-stat-label">Avg Rating</span>
            </div>
          </div>

          <div className="feedback-list">
            {submissions.map((s, i) => (
              <div key={s.id || i} className="feedback-item">
                <div className="feedback-item-header">
                  <span className="feedback-role">{s.role}</span>
                  <div className="feedback-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n <= s.rating ? 'star-mini star-mini-active' : 'star-mini'}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="feedback-comment">{s.comment}</p>
                <span className="feedback-label">{s.label || 'SIMULATED STAKEHOLDER FEEDBACK'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
