import { useMemo } from 'react'
import { EXPERIMENT_DATASET } from '../data/experimentDataset'
import { analysePatterns } from '../engine/patternAnalyser'
import './FailureModes.css'

const FAILURE_META = {
  'EXP-FC001': {
    type: 'Missing Patient Context',
    description: 'The alarm fires but the patient identifier is null. The analyser cannot access diagnosis history, current medications, or risk tier.',
    uncertainty: 'HIGH — context-free analysis forces over-reliance on severity alone.',
    risk: 'The analyser may under- or over-escalate with no patient-specific weighting.',
    lesson: 'Always surface a "Context Missing" warning to clinicians. Do not make confident recommendations without patient context.',
  },
  'EXP-FC002': {
    type: 'Conflicting Signals',
    description: 'The same patient simultaneously triggers a CRITICAL and a LOW severity alarm for the same drug.',
    uncertainty: 'HIGH — two opposing signals make classification ambiguous.',
    risk: 'If only the critical signal is considered, unnecessary escalation. If only the low signal, missed event.',
    lesson: 'Conflicting simultaneous signals must raise uncertainty and require explicit human review before action.',
  },
  'EXP-FC003': {
    type: 'Conflicting Signals (companion)',
    description: 'The companion low-severity alarm to FC002 — same patient, same drug, very close timestamp.',
    uncertainty: 'HIGH — validates the contradiction.',
    risk: 'Possible system-generated duplicate or real concurrent events requiring disambiguation.',
    lesson: 'Treat simultaneous conflicting severity alarms as an explicit failure mode, not a normal classification.',
  },
  'EXP-FC004': {
    type: 'Rapid Escalation / Potential Duplicate',
    description: 'Two HIGH alarms for the same drug and patient within 10 minutes of each other.',
    uncertainty: 'MEDIUM — may be a system duplicate or genuine rapid re-alarm.',
    risk: 'Acting on both may over-treat. Ignoring both may miss a genuine escalation.',
    lesson: 'Implement deduplication with time window check. Show both alarms but flag possible duplicate.',
  },
  'EXP-FC005': {
    type: 'Rapid Escalation / Uncertain',
    description: 'Companion alarm to FC004 — close duplicate.',
    uncertainty: 'MEDIUM-HIGH — confirmedEvent is null (uncertain).',
    risk: 'No ground truth to evaluate against. System must surface uncertainty rather than suppressing.',
    lesson: 'Unknown confirmedEvent must be explicitly marked as "Unknown" — not assumed false.',
  },
}

export default function FailureModes() {
  const failureAlarms = useMemo(
    () => EXPERIMENT_DATASET.filter(a => a.id.startsWith('EXP-FC')),
    []
  )
  const patterns = useMemo(() => analysePatterns(EXPERIMENT_DATASET), [])
  const detectedIds = useMemo(() => new Set(patterns.flatMap(p => p.evidence ?? [])), [patterns])

  return (
    <div className="failure-modes-page animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Failure Modes</h1>
          <p className="page-subtitle">Designed edge cases to test analyser robustness under ambiguous conditions</p>
        </div>
      </div>

      <div className="failure-list">
        {failureAlarms.map(alarm => {
          const meta = FAILURE_META[alarm.id] ?? {}
          const detected = detectedIds.has(alarm.id)
          return (
            <div key={alarm.id} className="card failure-card">
              <div className="failure-card-header">
                <div>
                  <span className="font-mono text-muted">{alarm.id}</span>
                  <h2 className="failure-type">{meta.type ?? 'Unknown Failure Type'}</h2>
                </div>
                <div className="failure-badges">
                  <span className={`badge badge-${alarm.severity}`}>{alarm.severity}</span>
                  <span className={`badge ${detected ? 'badge-critical' : 'badge-resolved'}`}>
                    {detected ? 'Detected' : 'Not Detected'}
                  </span>
                  <span className={`badge ${alarm.confirmedEvent === true ? 'badge-high' : alarm.confirmedEvent === false ? 'badge-low' : 'badge-medium'}`}>
                    {alarm.confirmedEvent === true ? 'Confirmed Event' : alarm.confirmedEvent === false ? 'Not Confirmed' : 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div className="failure-body">
                <div className="failure-field"><strong>Drug:</strong> {alarm.drug}</div>
                <div className="failure-field"><strong>Patient:</strong> {alarm.patient ?? '⚠ (missing)'}</div>
                <div className="failure-field"><strong>Alarm Type:</strong> {alarm.type}</div>

                <div className="failure-block failure-block--desc">
                  <strong>Description:</strong> {meta.description}
                </div>
                <div className="failure-block failure-block--uncertainty">
                  <strong>Uncertainty Level:</strong> {meta.uncertainty}
                </div>
                <div className="failure-block failure-block--risk">
                  <strong>Risk:</strong> {meta.risk}
                </div>
                <div className="failure-block failure-block--lesson">
                  <strong>Corrective Lesson:</strong> {meta.lesson}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
