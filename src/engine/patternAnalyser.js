/**
 * Alarm Pattern Analyser
 *
 * Analyses the current alarm stream and detects clinically meaningful patterns.
 *
 * Detected patterns:
 *  1. REPEATED_MISSED_DOSE   — same patient+drug ≥2 missed doses within 4 hours
 *  2. WARD_OVERDUE_CLUSTER   — ≥3 overdue alarms from same ward within 1 hour
 *  3. RAPID_ESCALATION       — patient with ≥3 active alarms within 2 hours
 *  4. DUPLICATE_ALERT        — same patient+drug with 2 alarms within 20 minutes
 *  5. HIGH_RISK_DRUG_STORM   — ward with ≥2 simultaneous critical-severity active alarms
 */

const FOUR_HOURS  = 4  * 60 * 60 * 1_000
const TWO_HOURS   = 2  * 60 * 60 * 1_000
const ONE_HOUR    = 1  * 60 * 60 * 1_000
const LABELS = { NUISANCE: 'NUISANCE', REVIEW: 'REVIEW', ESCALATION: 'ESCALATION' };
const THRESHOLDS = {
  alarmFrequencyPerHour: 10, // alarms per hour considered high
  recurrenceCount: 2,
  recurrenceWindowMs: 30 * 60 * 1000,
  alarmDurationMs: 2 * 60 * 60 * 1000,
  patientContextChange: 1,
  staffResponseTimeMs: 15 * 60 * 1000,
  riskScoreMax: 100,
  confidenceMin: 0.6,
  uncertaintyMax: 0.4,
};

/** Baseline frequency‑only classifier */
function baselineRiskScore(alarms) {
  const now = Date.now();
  const countLastHour = alarms.filter(a => now - a.timestamp < ONE_HOUR).length;
  // Simple linear scaling to max risk score
  return Math.min(THRESHOLDS.riskScoreMax, (countLastHour / THRESHOLDS.alarmFrequencyPerHour) * THRESHOLDS.riskScoreMax);
}
const TWENTY_MIN  = 20 * 60 * 1_000

/** Group alarms by a computed key */
function groupBy(alarms, keyFn) {
  const map = new Map()
  for (const alarm of alarms) {
    const key = keyFn(alarm)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(alarm)
  }
  return map
}

/** Latest alarm timestamp from a group */
function latestTs(alarms) {
  return Math.max(...alarms.map((a) => a.timestamp))
}

/** Format a UTC timestamp as HH:MM */
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Main analysis function.
 * @param {Object[]} alarms — full alarm array from state
 * @returns {Object[]} patterns — array of detected pattern objects
 */
export function analysePatterns(alarms) {
  const now     = Date.now()
  const patterns = []

  /* ── Subsets ─────────────────────────────────────────────── */
  const active4h  = alarms.filter((a) => now - a.timestamp < FOUR_HOURS)
  const active2h  = alarms.filter((a) => now - a.timestamp < TWO_HOURS)
  const active1h  = alarms.filter((a) => now - a.timestamp < ONE_HOUR)
  const activeNow = alarms.filter((a) => a.status === 'Active')
  const active20m = alarms.filter((a) => now - a.timestamp < TWENTY_MIN)

  /* ── 1. REPEATED_MISSED_DOSE ─────────────────────────────── */
  const missedIn4h = active4h.filter((a) => a.type === 'Missed Dose')
  const byPatientDrug = groupBy(missedIn4h, (a) => `${a.patientId}|${a.drugId}`)

  for (const [key, group] of byPatientDrug) {
    if (group.length >= 2) {
      const [patientId, drugId] = key.split('|')
      const ref = group[0]
      patterns.push({
        id: `RMD-${patientId}-${drugId}`,
        type: 'REPEATED_MISSED_DOSE',
        severity: 'critical',
        label: LABELS.ESCALATION,
        title: 'Repeated Missed Dose',
        message: `${ref.patient} has missed ${ref.drug} ${group.length} times in the last 4 hours.`,
        detail: `Ward: ${ref.ward}`,
        patientId,
        wardId: ref.wardId,
        drugId,
        count: group.length,
        detectedAt: latestTs(group),
        detectedAtStr: fmtTime(latestTs(group)),
        evidence: group.map(a => a.id),
        riskScore: Math.min(THRESHOLDS.riskScoreMax, group.length * 15),
        confidence: Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        uncertainty: 1 - Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        alternativeInterpretation: 'Patient may have delayed medication order.',
        falsePositivePotential: 'Could be a data entry duplication.',
        falseNegativePotential: 'Missing silent missed doses.',
        requiredAction: 'Review patient medication schedule.',
      })
    }
  }

  /* ── 2. WARD_OVERDUE_CLUSTER ─────────────────────────────── */
  const overdueIn1h = active1h.filter((a) => a.type === 'Overdue')
  const byWard = groupBy(overdueIn1h, (a) => a.wardId)

  for (const [wardId, group] of byWard) {
    if (group.length >= 3) {
      const ref = group[0]
      patterns.push({
        id: `WOC-${wardId}`,
        type: 'WARD_OVERDUE_CLUSTER',
        severity: 'high',
        label: LABELS.NUISANCE,
        title: 'Overdue Alarm Cluster',
        message: `${ref.ward} has ${group.length} overdue medicine alarms in the last hour.`,
        detail: `Patients: ${[...new Set(group.map((a) => a.patient))].join(', ')}`,
        wardId,
        count: group.length,
        detectedAt: latestTs(group),
        detectedAtStr: fmtTime(latestTs(group)),
        evidence: group.map(a => a.id),
        riskScore: Math.min(THRESHOLDS.riskScoreMax, group.length * 10),
        confidence: Math.min(1, group.length / THRESHOLDS.alarmFrequencyPerHour),
        uncertainty: 1 - Math.min(1, group.length / THRESHOLDS.alarmFrequencyPerHour),
        alternativeInterpretation: 'Ward may have delayed rounding.',
        falsePositivePotential: 'Batch order processing may generate spikes.',
        falseNegativePotential: 'Silent overdue alarms not captured.',
        requiredAction: 'Investigate ward workload.',
      })
    }
  }

  /* ── 3. RAPID_ESCALATION ─────────────────────────────────── */
  const byPatient2h = groupBy(active2h, (a) => a.patientId)

  for (const [patientId, group] of byPatient2h) {
    if (group.length >= 3) {
      const ref = group[0]
      patterns.push({
        id: `RE-${patientId}`,
        type: 'RAPID_ESCALATION',
        severity: group.some((a) => a.severity === 'critical') ? 'critical' : 'high',
        label: LABELS.ESCALATION,
        title: 'Rapid Alarm Escalation',
        message: `${ref.patient} has triggered ${group.length} alarms in the last 2 hours.`,
        detail: `Latest drug: ${group[group.length - 1].drug} — Ward: ${ref.ward}`,
        patientId,
        wardId: ref.wardId,
        count: group.length,
        detectedAt: latestTs(group),
        detectedAtStr: fmtTime(latestTs(group)),
        evidence: group.map(a => a.id),
        riskScore: Math.min(THRESHOLDS.riskScoreMax, group.length * 20),
        confidence: Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        uncertainty: 1 - Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        alternativeInterpretation: 'Multiple independent prescribing errors.',
        falsePositivePotential: 'Duplicate system alerts.',
        falseNegativePotential: 'Unrecorded escalations.',
        requiredAction: 'Urgent clinical review.',
      })
    }
  }

  /* ── 4. DUPLICATE_ALERT ──────────────────────────────────── */
  const byPatientDrug20m = groupBy(active20m, (a) => `${a.patientId}|${a.drugId}`)

  for (const [key, group] of byPatientDrug20m) {
    if (group.length >= 2) {
      const [patientId, drugId] = key.split('|')
      const ref = group[0]
      patterns.push({
        id: `DA-${patientId}-${drugId}`,
        type: 'DUPLICATE_ALERT',
        severity: 'high',
        label: LABELS.NUISANCE,
        title: 'Duplicate Alarm Detected',
        message: `${ref.drug} alarm for ${ref.patient} appeared ${group.length} times within 20 minutes.`,
        detail: `Possible system duplication or dispensing conflict. Ward: ${ref.ward}`,
        patientId,
        wardId: ref.wardId,
        drugId,
        count: group.length,
        detectedAt: latestTs(group),
        detectedAtStr: fmtTime(latestTs(group)),
        evidence: group.map(a => a.id),
        riskScore: Math.min(THRESHOLDS.riskScoreMax, group.length * 12),
        confidence: Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        uncertainty: 1 - Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        alternativeInterpretation: 'Rapid order entry duplication.',
        falsePositivePotential: 'Technical glitch causing repeat alerts.',
        falseNegativePotential: 'Missed duplicate after window.',
        requiredAction: 'Validate order entry.',
      })
    }
  }

  /* ── 5. HIGH_RISK_DRUG_STORM ─────────────────────────────── */
  const criticalActive = activeNow.filter((a) => a.severity === 'critical')
  const byWardCritical = groupBy(criticalActive, (a) => a.wardId)

  for (const [wardId, group] of byWardCritical) {
    if (group.length >= 2) {
      const ref = group[0]
      const drugs = [...new Set(group.map((a) => a.drug))].slice(0, 3).join(', ')
      patterns.push({
        id: `HRS-${wardId}`,
        type: 'HIGH_RISK_DRUG_STORM',
        severity: 'critical',
        label: LABELS.ESCALATION,
        title: 'High-Risk Drug Storm',
        message: `${ref.ward} has ${group.length} simultaneous critical alarms active.`,
        detail: `Drugs involved: ${drugs}`,
        wardId,
        count: group.length,
        detectedAt: latestTs(group),
        detectedAtStr: fmtTime(latestTs(group)),
        evidence: group.map(a => a.id),
        riskScore: Math.min(THRESHOLDS.riskScoreMax, group.length * 25),
        confidence: Math.min(1, group.length / THRESHOLDS.alarmFrequencyPerHour),
        uncertainty: 1 - Math.min(1, group.length / THRESHOLDS.alarmFrequencyPerHour),
        alternativeInterpretation: 'Concurrent critical orders.',
        falsePositivePotential: 'Massive batch order processing.',
        falseNegativePotential: 'Hidden critical alarms.',
        requiredAction: 'Immediate multidisciplinary review.',
      })
    }
  }

  // Baseline frequency‑only pattern
  const baselineScore = baselineRiskScore(alarms);
  patterns.push({
    id: 'BASELINE-FREQ',
    type: 'FREQUENCY_BASELINE',
    severity: baselineScore > THRESHOLDS.riskScoreMax * 0.5 ? 'high' : 'low',
    label: LABELS.NUISANCE,
    title: 'Baseline Alarm Frequency',
    message: `Alarm frequency in the last hour is ${baselineScore.toFixed(1)} (risk score).`,
    riskScore: baselineScore,
    confidence: 0.7,
    uncertainty: 0.3,
    evidence: alarms.filter(a => now - a.timestamp < ONE_HOUR).map(a => a.id),
    requiredAction: 'Monitor trend.',
  });

  /* ── Sort by severity then detectedAt desc ─────────────────── */
  const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
  patterns.sort((a, b) => {
    const sev = (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)
    if (sev !== 0) return sev
    return b.detectedAt - a.detectedAt
  })

  return patterns
}
