/**
 * Experiment Dataset
 *
 * Provides a rich, deterministic simulation dataset with:
 *  - Two patient journeys (Journey A: high urgency, Journey B: low urgency)
 *  - Staff response events (ackTime, resolvedTime)
 *  - Confirmed event flags (ground truth for metric computation)
 *  - Failure cases: missing patient context, conflicting signals, rapid escalation
 *
 * All timestamps are relative to "now" at import time for consistent rendering.
 */

import { DRUG_REGISTRY, DRUGS_BY_ID } from './drugs'
import { WARDS } from './wards'

/* ── Helpers ──────────────────────────────────────────────── */
const now = Date.now()
const mins = (n) => n * 60 * 1_000

/**
 * Build a fully-specified experiment alarm with staff response and ground truth.
 * @param {Object} opts
 */
function makeAlarm({
  id, patientId, patient, wardId, ward, drugId, drug,
  type, severity, label, status,
  offsetMs,           // how many ms ago relative to now
  ackOffsetMs,        // ms after alarm creation that staff acknowledged (undefined = not acked)
  resolvedOffsetMs,   // ms after alarm creation that alarm was resolved (undefined = not resolved)
  confirmedEvent,     // boolean – was this a true clinical event?
  missingContext = false,  // failure case: patient metadata absent
}) {
  const timestamp = now - offsetMs
  const time = new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return {
    id,
    patientId:        missingContext ? null : patientId,
    patient:          missingContext ? '(missing)' : patient,
    wardId,
    ward,
    drugId,
    drug,
    type,
    severity,
    label,
    status,
    timestamp,
    time,
    // Staff response
    staffResponse: {
      ackTime:      ackOffsetMs  != null ? timestamp + ackOffsetMs  : null,
      resolvedTime: resolvedOffsetMs != null ? timestamp + resolvedOffsetMs : null,
    },
    // Ground truth
    confirmedEvent,
  }
}

/* ── Journey A: High-Urgency (P001 – James Hargreaves, Cardiology) ── */
const journeyA = [
  makeAlarm({
    id: 'EXP-A001', patientId: 'P001', patient: 'James Hargreaves',
    wardId: 'W7', ward: 'Ward 7 – Cardiology',
    drugId: 'D001', drug: 'Warfarin',
    type: 'Missed Dose', severity: 'critical', label: 'ESCALATION', status: 'Active',
    offsetMs: mins(180), ackOffsetMs: mins(8), resolvedOffsetMs: null,
    confirmedEvent: true,
  }),
  makeAlarm({
    id: 'EXP-A002', patientId: 'P001', patient: 'James Hargreaves',
    wardId: 'W7', ward: 'Ward 7 – Cardiology',
    drugId: 'D001', drug: 'Warfarin',
    type: 'Missed Dose', severity: 'critical', label: 'ESCALATION', status: 'Active',
    offsetMs: mins(120), ackOffsetMs: mins(12), resolvedOffsetMs: null,
    confirmedEvent: true,
  }),
  makeAlarm({
    id: 'EXP-A003', patientId: 'P001', patient: 'James Hargreaves',
    wardId: 'W7', ward: 'Ward 7 – Cardiology',
    drugId: 'D007', drug: 'Amiodarone',
    type: 'Overdue', severity: 'critical', label: 'ESCALATION', status: 'Active',
    offsetMs: mins(90), ackOffsetMs: null, resolvedOffsetMs: null,
    confirmedEvent: true,
  }),
  // Rapid escalation: 3 alarms within < 5 min
  makeAlarm({
    id: 'EXP-A004', patientId: 'P001', patient: 'James Hargreaves',
    wardId: 'W7', ward: 'Ward 7 – Cardiology',
    drugId: 'D005', drug: 'Digoxin',
    type: 'Critical Alert', severity: 'critical', label: 'ESCALATION', status: 'Active',
    offsetMs: mins(4), ackOffsetMs: null, resolvedOffsetMs: null,
    confirmedEvent: true,
  }),
  makeAlarm({
    id: 'EXP-A005', patientId: 'P001', patient: 'James Hargreaves',
    wardId: 'W7', ward: 'Ward 7 – Cardiology',
    drugId: 'D001', drug: 'Warfarin',
    type: 'Critical Alert', severity: 'critical', label: 'ESCALATION', status: 'Active',
    offsetMs: mins(3), ackOffsetMs: null, resolvedOffsetMs: null,
    confirmedEvent: true,
  }),
  makeAlarm({
    id: 'EXP-A006', patientId: 'P001', patient: 'James Hargreaves',
    wardId: 'W7', ward: 'Ward 7 – Cardiology',
    drugId: 'D007', drug: 'Amiodarone',
    type: 'Critical Alert', severity: 'high', label: 'ESCALATION', status: 'Active',
    offsetMs: mins(2), ackOffsetMs: null, resolvedOffsetMs: null,
    confirmedEvent: false,  // conflicting signal — simultaneous high+critical same patient
  }),
]

/* ── Journey B: Low-Urgency (P002 – Margaret Osei, Medical) ── */
const journeyB = [
  makeAlarm({
    id: 'EXP-B001', patientId: 'P002', patient: 'Margaret Osei',
    wardId: 'W2', ward: 'Ward 2 – Medical',
    drugId: 'D015', drug: 'Metformin',
    type: 'Timing Variance', severity: 'low', label: 'NUISANCE', status: 'Resolved',
    offsetMs: mins(220), ackOffsetMs: mins(5), resolvedOffsetMs: mins(30),
    confirmedEvent: false,
  }),
  makeAlarm({
    id: 'EXP-B002', patientId: 'P002', patient: 'Margaret Osei',
    wardId: 'W2', ward: 'Ward 2 – Medical',
    drugId: 'D012', drug: 'Aminophylline',
    type: 'Overdue', severity: 'medium', label: 'REVIEW', status: 'Acknowledged',
    offsetMs: mins(150), ackOffsetMs: mins(20), resolvedOffsetMs: null,
    confirmedEvent: true,
  }),
  makeAlarm({
    id: 'EXP-B003', patientId: 'P002', patient: 'Margaret Osei',
    wardId: 'W2', ward: 'Ward 2 – Medical',
    drugId: 'D015', drug: 'Metformin',
    type: 'Timing Variance', severity: 'low', label: 'NUISANCE', status: 'Resolved',
    offsetMs: mins(90), ackOffsetMs: mins(8), resolvedOffsetMs: mins(25),
    confirmedEvent: false,
  }),
  makeAlarm({
    id: 'EXP-B004', patientId: 'P002', patient: 'Margaret Osei',
    wardId: 'W2', ward: 'Ward 2 – Medical',
    drugId: 'D012', drug: 'Aminophylline',
    type: 'Timing Variance', severity: 'low', label: 'NUISANCE', status: 'Active',
    offsetMs: mins(45), ackOffsetMs: null, resolvedOffsetMs: null,
    confirmedEvent: false,
  }),
]

/* ── Failure Cases ─────────────────────────────────────────── */
const failureCases = [
  // FC-1: Missing patient context
  makeAlarm({
    id: 'EXP-FC001', patientId: null, patient: null,
    wardId: 'W3', ward: 'Ward 3 – Surgical',
    drugId: 'D010', drug: 'Morphine',
    type: 'Missed Dose', severity: 'high', label: 'ESCALATION', status: 'Active',
    offsetMs: mins(60), ackOffsetMs: null, resolvedOffsetMs: null,
    confirmedEvent: null,  // unknown – context missing
    missingContext: true,
  }),
  // FC-2: Conflicting signals (high + low for same patient simultaneously)
  makeAlarm({
    id: 'EXP-FC002', patientId: 'P003', patient: 'Yusuf Al-Rashidi',
    wardId: 'W4', ward: 'Ward 4 – Oncology',
    drugId: 'D003', drug: 'Methotrexate',
    type: 'Critical Alert', severity: 'critical', label: 'ESCALATION', status: 'Active',
    offsetMs: mins(10), ackOffsetMs: null, resolvedOffsetMs: null,
    confirmedEvent: true,
  }),
  makeAlarm({
    id: 'EXP-FC003', patientId: 'P003', patient: 'Yusuf Al-Rashidi',
    wardId: 'W4', ward: 'Ward 4 – Oncology',
    drugId: 'D003', drug: 'Methotrexate',
    type: 'Timing Variance', severity: 'low', label: 'NUISANCE', status: 'Active',
    offsetMs: mins(9), ackOffsetMs: null, resolvedOffsetMs: null,
    confirmedEvent: false,  // conflicting low-severity simultaneous with critical
  }),
  // FC-3: Rapid escalation (duplicated within 20 min — triggering DUPLICATE_ALERT pattern)
  makeAlarm({
    id: 'EXP-FC004', patientId: 'P004', patient: 'Saoirse Murphy',
    wardId: 'W6', ward: 'Ward 6 – Neuro',
    drugId: 'D004', drug: 'Phenytoin',
    type: 'Missed Dose', severity: 'high', label: 'ESCALATION', status: 'Active',
    offsetMs: mins(15), ackOffsetMs: null, resolvedOffsetMs: null,
    confirmedEvent: true,
  }),
  makeAlarm({
    id: 'EXP-FC005', patientId: 'P004', patient: 'Saoirse Murphy',
    wardId: 'W6', ward: 'Ward 6 – Neuro',
    drugId: 'D004', drug: 'Phenytoin',
    type: 'Missed Dose', severity: 'high', label: 'ESCALATION', status: 'Active',
    offsetMs: mins(10), ackOffsetMs: null, resolvedOffsetMs: null,
    confirmedEvent: null,  // uncertain — possible system duplicate
  }),
]

/** Full experiment dataset */
export const EXPERIMENT_DATASET = [...journeyA, ...journeyB, ...failureCases]

/* ── Metric computation ───────────────────────────────────── */

/**
 * Compute precision, recall, F1, and basic counts from classified patterns
 * against the ground-truth `confirmedEvent` flags in the dataset.
 *
 * @param {Object[]} patterns   — output of analysePatterns()
 * @param {Object[]} dataset    — EXPERIMENT_DATASET
 * @returns {Object}            — { precision, recall, f1, tp, fp, fn, tn }
 */
export function computeMetrics(patterns, dataset) {
  // Build set of alarm IDs that are in a detected pattern
  const detectedAlarmIds = new Set(patterns.flatMap((p) => p.evidence ?? []))

  let tp = 0, fp = 0, fn = 0, tn = 0

  for (const alarm of dataset) {
    const detected  = detectedAlarmIds.has(alarm.id)
    const confirmed = alarm.confirmedEvent === true

    if (detected  && confirmed)  tp++
    if (detected  && !confirmed) fp++
    if (!detected && confirmed)  fn++
    if (!detected && !confirmed) tn++
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0
  const recall    = tp + fn > 0 ? tp / (tp + fn) : 0
  const f1        = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0

  return {
    precision: parseFloat(precision.toFixed(3)),
    recall:    parseFloat(recall.toFixed(3)),
    f1:        parseFloat(f1.toFixed(3)),
    tp, fp, fn, tn,
    totalAlarms:    dataset.length,
    totalPatterns:  patterns.length,
    detectedAlarms: detectedAlarmIds.size,
  }
}

/**
 * Target thresholds for the improved analyser (documented goals).
 */
export const TARGET_METRICS = {
  recall:    0.90,  // detect ≥90% of true clinical events
  precision: 0.80,  // accept ≤20% false-positive rate
  f1:        0.85,
}
