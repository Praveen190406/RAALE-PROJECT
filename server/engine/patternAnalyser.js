/**
 * Server-Side Alarm Pattern Analyser
 * Detects clinically meaningful alarm patterns across active and recent alarms.
 */

const FOUR_HOURS = 4 * 60 * 60 * 1_000;
const TWO_HOURS = 2 * 60 * 60 * 1_000;
const ONE_HOUR = 1 * 60 * 60 * 1_000;
const TWENTY_MIN = 20 * 60 * 1_000;

const LABELS = {
  NUISANCE: 'NUISANCE',
  REVIEW: 'REVIEW',
  ESCALATION: 'ESCALATION',
};

const THRESHOLDS = {
  alarmFrequencyPerHour: 10,
  recurrenceCount: 2,
  recurrenceWindowMs: 30 * 60 * 1000,
  alarmDurationMs: 2 * 60 * 60 * 1000,
  patientContextChange: 1,
  staffResponseTimeMs: 15 * 60 * 1000,
  riskScoreMax: 100,
  confidenceMin: 0.6,
  uncertaintyMax: 0.4,
};

function groupBy(alarms, keyFn) {
  const map = new Map();
  for (const alarm of alarms) {
    const key = keyFn(alarm);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(alarm);
  }
  return map;
}

function latestTs(alarms) {
  return Math.max(...alarms.map((a) => a.timestamp || a.created_at || Date.now()));
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function baselineRiskScore(alarms) {
  const now = Date.now();
  const countLastHour = alarms.filter((a) => now - (a.timestamp || a.created_at) < ONE_HOUR).length;
  return Math.min(
    THRESHOLDS.riskScoreMax,
    (countLastHour / THRESHOLDS.alarmFrequencyPerHour) * THRESHOLDS.riskScoreMax
  );
}

export function analysePatterns(alarms) {
  const now = Date.now();
  const patterns = [];

  const active4h = alarms.filter((a) => now - (a.timestamp || a.created_at) < FOUR_HOURS);
  const active2h = alarms.filter((a) => now - (a.timestamp || a.created_at) < TWO_HOURS);
  const active1h = alarms.filter((a) => now - (a.timestamp || a.created_at) < ONE_HOUR);
  const activeNow = alarms.filter((a) => a.status === 'Active');
  const active20m = alarms.filter((a) => now - (a.timestamp || a.created_at) < TWENTY_MIN);

  // 1. REPEATED_MISSED_DOSE
  const missedIn4h = active4h.filter((a) => (a.type || '').toLowerCase().includes('missed dose'));
  const byPatientDrug = groupBy(
    missedIn4h,
    (a) => `${a.patient_id || a.patientId}|${a.drug_id || a.drugId}`
  );

  for (const [key, group] of byPatientDrug) {
    if (group.length >= 2) {
      const [patientId, drugId] = key.split('|');
      const ref = group[0];
      const patientName = ref.patient_name || ref.patient || patientId;
      const drugName = ref.drug_name || ref.drug || drugId;
      const wardName = ref.ward_name || ref.ward || ref.ward_id || ref.wardId;
      const ts = latestTs(group);
      patterns.push({
        id: `RMD-${patientId}-${drugId}`,
        type: 'REPEATED_MISSED_DOSE',
        severity: 'critical',
        label: LABELS.ESCALATION,
        title: 'Repeated Missed Dose',
        message: `${patientName} has missed ${drugName} ${group.length} times in the last 4 hours.`,
        detail: `Ward: ${wardName}`,
        patientId,
        wardId: ref.ward_id || ref.wardId,
        drugId,
        count: group.length,
        detectedAt: ts,
        detectedAtStr: fmtTime(ts),
        evidence: group.map((a) => a.id),
        riskScore: Math.min(THRESHOLDS.riskScoreMax, group.length * 15),
        confidence: Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        uncertainty: 1 - Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        alternativeInterpretation: 'Patient may have delayed medication order.',
        falsePositivePotential: 'Could be a data entry duplication.',
        falseNegativePotential: 'Missing silent missed doses.',
        requiredAction: 'Review patient medication schedule.',
      });
    }
  }

  // 2. WARD_OVERDUE_CLUSTER
  const overdueIn1h = active1h.filter((a) => (a.type || '').toLowerCase().includes('overdue'));
  const byWard = groupBy(overdueIn1h, (a) => a.ward_id || a.wardId);

  for (const [wardId, group] of byWard) {
    if (group.length >= 3) {
      const ref = group[0];
      const wardName = ref.ward_name || ref.ward || wardId;
      const ts = latestTs(group);
      patterns.push({
        id: `WOC-${wardId}`,
        type: 'WARD_OVERDUE_CLUSTER',
        severity: 'high',
        label: LABELS.NUISANCE,
        title: 'Overdue Alarm Cluster',
        message: `${wardName} has ${group.length} overdue medicine alarms in the last hour.`,
        detail: `Patients: ${[...new Set(group.map((a) => a.patient_name || a.patient))].join(', ')}`,
        wardId,
        count: group.length,
        detectedAt: ts,
        detectedAtStr: fmtTime(ts),
        evidence: group.map((a) => a.id),
        riskScore: Math.min(THRESHOLDS.riskScoreMax, group.length * 10),
        confidence: Math.min(1, group.length / THRESHOLDS.alarmFrequencyPerHour),
        uncertainty: 1 - Math.min(1, group.length / THRESHOLDS.alarmFrequencyPerHour),
        alternativeInterpretation: 'Ward may have delayed rounding.',
        falsePositivePotential: 'Batch order processing may generate spikes.',
        falseNegativePotential: 'Silent overdue alarms not captured.',
        requiredAction: 'Investigate ward workload.',
      });
    }
  }

  // 3. RAPID_ESCALATION
  const byPatient2h = groupBy(active2h, (a) => a.patient_id || a.patientId);

  for (const [patientId, group] of byPatient2h) {
    if (group.length >= 3) {
      const ref = group[0];
      const patientName = ref.patient_name || ref.patient || patientId;
      const wardName = ref.ward_name || ref.ward || ref.ward_id || ref.wardId;
      const latestDrug = group[group.length - 1].drug_name || group[group.length - 1].drug;
      const ts = latestTs(group);
      patterns.push({
        id: `RE-${patientId}`,
        type: 'RAPID_ESCALATION',
        severity: group.some((a) => (a.severity || '').toLowerCase() === 'critical')
          ? 'critical'
          : 'high',
        label: LABELS.ESCALATION,
        title: 'Rapid Alarm Escalation',
        message: `${patientName} has triggered ${group.length} alarms in the last 2 hours.`,
        detail: `Latest drug: ${latestDrug} — Ward: ${wardName}`,
        patientId,
        wardId: ref.ward_id || ref.wardId,
        count: group.length,
        detectedAt: ts,
        detectedAtStr: fmtTime(ts),
        evidence: group.map((a) => a.id),
        riskScore: Math.min(THRESHOLDS.riskScoreMax, group.length * 20),
        confidence: Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        uncertainty: 1 - Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        alternativeInterpretation: 'Multiple independent prescribing errors.',
        falsePositivePotential: 'Duplicate system alerts.',
        falseNegativePotential: 'Unrecorded escalations.',
        requiredAction: 'Urgent clinical review.',
      });
    }
  }

  // 4. DUPLICATE_ALERT
  const byPatientDrug20m = groupBy(
    active20m,
    (a) => `${a.patient_id || a.patientId}|${a.drug_id || a.drugId}`
  );

  for (const [key, group] of byPatientDrug20m) {
    if (group.length >= 2) {
      const [patientId, drugId] = key.split('|');
      const ref = group[0];
      const patientName = ref.patient_name || ref.patient || patientId;
      const drugName = ref.drug_name || ref.drug || drugId;
      const wardName = ref.ward_name || ref.ward || ref.ward_id || ref.wardId;
      const ts = latestTs(group);
      patterns.push({
        id: `DA-${patientId}-${drugId}`,
        type: 'DUPLICATE_ALERT',
        severity: 'high',
        label: LABELS.NUISANCE,
        title: 'Duplicate Alarm Detected',
        message: `${drugName} alarm for ${patientName} appeared ${group.length} times within 20 minutes.`,
        detail: `Possible system duplication or dispensing conflict. Ward: ${wardName}`,
        patientId,
        wardId: ref.ward_id || ref.wardId,
        drugId,
        count: group.length,
        detectedAt: ts,
        detectedAtStr: fmtTime(ts),
        evidence: group.map((a) => a.id),
        riskScore: Math.min(THRESHOLDS.riskScoreMax, group.length * 12),
        confidence: Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        uncertainty: 1 - Math.min(1, group.length / THRESHOLDS.recurrenceCount),
        alternativeInterpretation: 'Rapid order entry duplication.',
        falsePositivePotential: 'Technical glitch causing repeat alerts.',
        falseNegativePotential: 'Missed duplicate after window.',
        requiredAction: 'Validate order entry.',
      });
    }
  }

  // 5. HIGH_RISK_DRUG_STORM
  const criticalActive = activeNow.filter((a) => (a.severity || '').toLowerCase() === 'critical');
  const byWardCritical = groupBy(criticalActive, (a) => a.ward_id || a.wardId);

  for (const [wardId, group] of byWardCritical) {
    if (group.length >= 2) {
      const ref = group[0];
      const wardName = ref.ward_name || ref.ward || wardId;
      const drugs = [...new Set(group.map((a) => a.drug_name || a.drug))]
        .slice(0, 3)
        .join(', ');
      const ts = latestTs(group);
      patterns.push({
        id: `HRS-${wardId}`,
        type: 'HIGH_RISK_DRUG_STORM',
        severity: 'critical',
        label: LABELS.ESCALATION,
        title: 'High-Risk Drug Storm',
        message: `${wardName} has ${group.length} simultaneous critical alarms active.`,
        detail: `Drugs involved: ${drugs}`,
        wardId,
        count: group.length,
        detectedAt: ts,
        detectedAtStr: fmtTime(ts),
        evidence: group.map((a) => a.id),
        riskScore: Math.min(THRESHOLDS.riskScoreMax, group.length * 25),
        confidence: Math.min(1, group.length / THRESHOLDS.alarmFrequencyPerHour),
        uncertainty: 1 - Math.min(1, group.length / THRESHOLDS.alarmFrequencyPerHour),
        alternativeInterpretation: 'Concurrent critical orders.',
        falsePositivePotential: 'Massive batch order processing.',
        falseNegativePotential: 'Hidden critical alarms.',
        requiredAction: 'Immediate multidisciplinary review.',
      });
    }
  }

  // 6. Baseline frequency pattern
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
    evidence: alarms
      .filter((a) => now - (a.timestamp || a.created_at) < ONE_HOUR)
      .map((a) => a.id),
    requiredAction: 'Monitor trend.',
  });

  const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  patterns.sort((a, b) => {
    const sev = (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9);
    if (sev !== 0) return sev;
    return (b.detectedAt || 0) - (a.detectedAt || 0);
  });

  return patterns;
}
