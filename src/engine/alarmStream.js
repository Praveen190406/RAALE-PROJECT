/**
 * Alarm Stream Generator
 *
 * Pure functions for generating realistic simulated alarm events.
 * The generator picks a random patient, one of their high-risk drugs,
 * and assigns a weighted alarm type + severity.
 */

import { DRUGS_BY_ID } from '../data/drugs'

/* ── Alarm types with probability weights ────────────────── */
const ALARM_TYPE_POOL = [
  { type: 'Missed Dose',    weight: 35 },
  { type: 'Overdue',        weight: 28 },
  { type: 'Duplicate Alert',weight: 16 },
  { type: 'Escalation',     weight: 12 },
  { type: 'Near-Miss',      weight: 9 },
]

/* ── Severity mapping from drug risk level + alarm type ──── */
const SEVERITY_MATRIX = {
  // [drugRiskLevel]: { [alarmType]: severity }
  critical: {
    'Missed Dose':     'critical',
    'Overdue':         'critical',
    'Duplicate Alert': 'critical',
    'Escalation':      'critical',
    'Near-Miss':       'high',
  },
  high: {
    'Missed Dose':     'high',
    'Overdue':         'high',
    'Duplicate Alert': 'high',
    'Escalation':      'critical',
    'Near-Miss':       'medium',
  },
  medium: {
    'Missed Dose':     'medium',
    'Overdue':         'medium',
    'Duplicate Alert': 'medium',
    'Escalation':      'high',
    'Near-Miss':       'low',
  },
  low: {
    'Missed Dose':     'low',
    'Overdue':         'low',
    'Duplicate Alert': 'low',
    'Escalation':      'medium',
    'Near-Miss':       'low',
  },
}

/* ── Module-level counter (persists across calls in session) ─ */
let _counter = 2049

/** Weighted random pick from items with { weight } field */
function pickWeighted(items) {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0)
  let r = Math.random() * totalWeight
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[items.length - 1]
}

/** Pick a random element from an array */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Format the current time as HH:MM */
function nowTimeStr() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Generate a single alarm event.
 * @param {Object[]} patients — PATIENTS array
 * @returns {Object} alarm record
 */
export function generateAlarm(patients) {
  const patient  = pickRandom(patients)
  const drugId   = pickRandom(patient.medications)
  const drug     = DRUGS_BY_ID[drugId]

  if (!drug) return null  // safety guard

  const alarmType   = pickWeighted(ALARM_TYPE_POOL).type
  const drugRisk    = drug.riskLevel || 'medium'
  const severityMap = SEVERITY_MATRIX[drugRisk] || SEVERITY_MATRIX.medium
  const severity    = severityMap[alarmType] || 'medium'

  return {
    id:        `AL-${_counter++}`,
    patientId: patient.id,
    patient:   patient.displayName,
    ward:      patient.ward,
    wardId:    patient.wardId,
    drug:      `${drug.name} ${drug.dose}`,
    drugId:    drug.id,
    drugRisk,
    type:      alarmType,
    severity,
    time:      nowTimeStr(),
    timestamp: Date.now(),
    status:    'Active',
  }
}

/**
 * Build the seed alarm array from Dashboard mock data,
 * enriched with timestamps (backdated realistically).
 */
export function buildSeedAlarms() {
  const now = Date.now()
  const min = 60_000

  return [
    { id: 'AL-2048', patientId: 'P001', patient: 'Patient 7C-04', wardId: 'W7', ward: 'Ward 7 – Cardiology', drug: 'Warfarin 5mg',      drugId: 'D001', drugRisk: 'critical', type: 'Missed Dose',     severity: 'critical', time: '20:18', timestamp: now - 15 * min, status: 'Active' },
    { id: 'AL-2047', patientId: 'P005', patient: 'Patient 4B-11', wardId: 'W4', ward: 'Ward 4 – Oncology',   drug: 'Heparin 5000u',     drugId: 'D002', drugRisk: 'critical', type: 'Overdue',          severity: 'critical', time: '20:05', timestamp: now - 28 * min, status: 'Active' },
    { id: 'AL-2046', patientId: 'P009', patient: 'Patient 3A-02', wardId: 'W3', ward: 'Ward 3 – Surgical',   drug: 'Methotrexate 10mg', drugId: 'D003', drugRisk: 'critical', type: 'Duplicate Alert',  severity: 'high',     time: '19:52', timestamp: now - 41 * min, status: 'Active' },
    { id: 'AL-2045', patientId: 'P013', patient: 'Patient 6D-08', wardId: 'W6', ward: 'Ward 6 – Neuro',      drug: 'Phenytoin 300mg',   drugId: 'D004', drugRisk: 'high',     type: 'Missed Dose',     severity: 'high',     time: '19:41', timestamp: now - 52 * min, status: 'Acknowledged' },
    { id: 'AL-2044', patientId: 'P017', patient: 'Patient 2C-15', wardId: 'W2', ward: 'Ward 2 – Medical',    drug: 'Digoxin 0.25mg',    drugId: 'D005', drugRisk: 'high',     type: 'Overdue',          severity: 'medium',   time: '19:30', timestamp: now - 63 * min, status: 'Active' },
    { id: 'AL-2043', patientId: 'P010', patient: 'Patient 3B-09', wardId: 'W3', ward: 'Ward 3 – Surgical',   drug: 'Insulin Glargine 20u',drugId:'D006', drugRisk: 'high',    type: 'Missed Dose',     severity: 'medium',   time: '19:15', timestamp: now - 78 * min, status: 'Resolved' },
    { id: 'AL-2042', patientId: 'P002', patient: 'Patient 7C-11', wardId: 'W7', ward: 'Ward 7 – Cardiology', drug: 'Amiodarone 200mg',   drugId: 'D007', drugRisk: 'critical', type: 'Escalation',       severity: 'critical', time: '18:58', timestamp: now - 95 * min, status: 'Resolved' },
    { id: 'AL-2041', patientId: 'P001', patient: 'Patient 7C-04', wardId: 'W7', ward: 'Ward 7 – Cardiology', drug: 'Warfarin 5mg',       drugId: 'D001', drugRisk: 'critical', type: 'Overdue',          severity: 'low',      time: '18:42', timestamp: now - 111 * min, status: 'Resolved' },
    // Extra seed to help pattern detection
    { id: 'AL-2040', patientId: 'P001', patient: 'Patient 7C-04', wardId: 'W7', ward: 'Ward 7 – Cardiology', drug: 'Warfarin 5mg',      drugId: 'D001', drugRisk: 'critical', type: 'Missed Dose',     severity: 'critical', time: '17:55', timestamp: now - 148 * min, status: 'Active' },
    { id: 'AL-2039', patientId: 'P005', patient: 'Patient 4B-11', wardId: 'W4', ward: 'Ward 4 – Oncology',   drug: 'Heparin 5000u',     drugId: 'D002', drugRisk: 'critical', type: 'Missed Dose',     severity: 'critical', time: '17:40', timestamp: now - 163 * min, status: 'Active' },
    { id: 'AL-2038', patientId: 'P006', patient: 'Patient 4C-07', wardId: 'W4', ward: 'Ward 4 – Oncology',   drug: 'Tacrolimus 1mg',    drugId: 'D011', drugRisk: 'critical', type: 'Overdue',          severity: 'critical', time: '17:22', timestamp: now - 181 * min, status: 'Active' },
    { id: 'AL-2037', patientId: 'P014', patient: 'Patient 6A-01', wardId: 'W6', ward: 'Ward 6 – Neuro',      drug: 'Lithium 400mg',     drugId: 'D008', drugRisk: 'high',     type: 'Near-Miss',       severity: 'medium',   time: '17:05', timestamp: now - 198 * min, status: 'Resolved' },
  ]
}
