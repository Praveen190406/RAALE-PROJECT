import { useState } from 'react'
import './Validation.css'

const INITIAL_FEEDBACK = [
  {
    role: 'Pharmacist',
    rating: 4,
    comment: 'Pattern detection for warfarin missed doses is accurate. Risk scoring aligns with clinical expectations.',
    label: 'SIMULATED STAKEHOLDER FEEDBACK',
  },
  {
    role: 'Clinical Nurse Specialist',
    rating: 3,
    comment: 'Uncertainty display is helpful. Would prefer clearer priority ordering in the alarm queue.',
    label: 'SIMULATED STAKEHOLDER FEEDBACK',
  },
]

const ROLES = ['Select role...', 'Pharmacist', 'Senior Pharmacist', 'Clinical Nurse Specialist', 'Ward Doctor', 'Clinical Informatician', 'Patient Safety Lead']

export default function Validation() {
  const [submissions, setSubmissions] = useState(INITIAL_FEEDBACK)
  const [form, setForm] = useState({ role: '', rating: 0, comment: '' })
  const [submitted, setSubmitted] = useState(false)
  const [hovered, setHovered] = useState(0)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.role || !form.rating || !form.comment.trim()) return
    setSubmissions(prev => [...prev, { ...form, label: 'SIMULATED STAKEHOLDER FEEDBACK' }])
    setForm({ role: '', rating: 0, comment: '' })
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const handleReset = () => {
    setForm({ role: '', rating: 0, comment: '' })
  }

  const avgRating = submissions.length > 0
    ? (submissions.reduce((s, f) => s + f.rating, 0) / submissions.length).toFixed(1)
    : 0

  return (
    <div className="validation-page animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Validation</h1>
          <p className="page-subtitle">Stakeholder review and feedback collection</p>
        </div>
      </div>

      <div className="validation-grid">
        {/* Form */}
        <div className="card validation-form-card">
          <h2 className="validation-h2">Submit Feedback</h2>
          <p className="text-muted mb-16">All feedback is labelled as simulated stakeholder input — this is not a real clinical feedback system.</p>
          
          <form onSubmit={handleSubmit} className="validation-form">
            <div className="form-group">
              <label className="form-label" htmlFor="role-select">Stakeholder Role</label>
              <select
                id="role-select"
                className="filter-select"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                required
              >
                {ROLES.map(r => <option key={r} value={r === 'Select role...' ? '' : r}>{r}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Rating</label>
              <div className="star-row">
                {[1,2,3,4,5].map(n => (
                  <button
                    type="button"
                    key={n}
                    className={`star ${n <= (hovered || form.rating) ? 'star-active' : ''}`}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setForm(f => ({ ...f, rating: n }))}
                    aria-label={`Rate ${n} stars`}
                  >★</button>
                ))}
                <span className="star-label">{form.rating > 0 ? `${form.rating}/5` : ''}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="feedback-text">Feedback</label>
              <textarea
                id="feedback-text"
                className="feedback-textarea"
                placeholder="Describe your experience with this system..."
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                rows={4}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Submit Feedback</button>
              <button type="button" className="btn btn-secondary" onClick={handleReset}>Reset</button>
            </div>

            {submitted && (
              <div className="submit-toast">✅ Feedback submitted. Thank you!</div>
            )}
          </form>
        </div>

        {/* Summary */}
        <div className="card validation-summary-card">
          <h2 className="validation-h2">Feedback Summary</h2>
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="summary-stat-val">{submissions.length}</span>
              <span className="summary-stat-label">Responses</span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-val">{avgRating}</span>
              <span className="summary-stat-label">Avg Rating</span>
            </div>
          </div>

          <div className="feedback-list">
            {submissions.map((s, i) => (
              <div key={i} className="feedback-item">
                <div className="feedback-item-header">
                  <span className="feedback-role">{s.role}</span>
                  <div className="feedback-stars">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={n <= s.rating ? 'star-mini star-mini-active' : 'star-mini'}>★</span>
                    ))}
                  </div>
                </div>
                <p className="feedback-comment">{s.comment}</p>
                <span className="feedback-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
