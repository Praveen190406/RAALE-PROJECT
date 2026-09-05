import './PatternAlerts.css'

const PATTERN_ICONS = {
  REPEATED_MISSED_DOSE:  '⟳',
  WARD_OVERDUE_CLUSTER:  '⧖',
  RAPID_ESCALATION:      '↑',
  DUPLICATE_ALERT:       '⊕',
  HIGH_RISK_DRUG_STORM:  '⚡',
}

const PATTERN_LABELS = {
  REPEATED_MISSED_DOSE:  'Repeated Missed Dose',
  WARD_OVERDUE_CLUSTER:  'Overdue Cluster',
  RAPID_ESCALATION:      'Rapid Escalation',
  DUPLICATE_ALERT:       'Duplicate Alert',
  HIGH_RISK_DRUG_STORM:  'High-Risk Storm',
}

export default function PatternAlerts({ patterns }) {
  if (!patterns || patterns.length === 0) return null

  return (
    <section className="pattern-alerts" aria-label="Detected alarm patterns">
      <div className="pattern-alerts-header">
        <div className="pattern-alerts-title-row">
          <span className="pattern-alerts-icon-outer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <h2 className="pattern-alerts-title">
            Detected Patterns
            <span className="pattern-count-badge">{patterns.length}</span>
          </h2>
        </div>
        <span className="pattern-alerts-subtitle">
          Automated analysis • Requires clinical review
        </span>
      </div>

      <div className="pattern-cards-row">
        {patterns.map((p) => (
          <article
            key={p.id}
            id={`pattern-${p.id}`}
            className={`pattern-card pattern-card--${p.severity}`}
            aria-label={`Pattern: ${p.title}`}
          >
            <div className="pattern-card-header">
              <div className={`pattern-type-icon pattern-type-icon--${p.severity}`}>
                {PATTERN_ICONS[p.type] || '!'}
              </div>
              <div className="pattern-card-meta">
                <span className={`pattern-type-label badge badge-${p.severity}`}>
                  {PATTERN_LABELS[p.type] || p.type}
                </span>
                <span className="pattern-time">{p.detectedAtStr}</span>
              </div>
            </div>

            <p className="pattern-message">{p.message}</p>
            <p className="pattern-detail">{p.detail}</p>

            {p.count != null && (
              <div className="pattern-count">
                <span className="pattern-count-num">{p.count}</span>
                <span className="pattern-count-label">occurrences</span>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
