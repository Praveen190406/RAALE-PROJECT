import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { hashPassword } from './auth.js';
import { analysePatterns } from './engine/patternAnalyser.js';

// Resolve database file path
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(process.cwd(), 'server', 'data', 'clinical_alarm.db');

// Ensure parent directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and WAL mode if supported
try {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
} catch (e) {
  // Ignored if PRAGMA not supported
}

/**
 * Initialize all database tables
 */
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      beds INTEGER NOT NULL,
      specialty TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drugs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dose TEXT NOT NULL,
      category TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      risk_score REAL NOT NULL,
      monitor_param TEXT NOT NULL,
      notes TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      ward_id TEXT NOT NULL,
      bed TEXT NOT NULL,
      age INTEGER NOT NULL,
      conditions TEXT NOT NULL,
      medications TEXT NOT NULL,
      base_risk_score REAL NOT NULL,
      status TEXT DEFAULT 'Active',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      patient_name TEXT NOT NULL,
      ward_id TEXT NOT NULL,
      ward_name TEXT NOT NULL,
      drug_id TEXT,
      drug_name TEXT NOT NULL,
      drug_risk TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      label TEXT,
      status TEXT NOT NULL DEFAULT 'Active',
      time_str TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      confirmed_event INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff_responses (
      id TEXT PRIMARY KEY,
      alarm_id TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT NOT NULL,
      action_type TEXT NOT NULL,
      notes TEXT,
      response_time_ms INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS detected_patterns (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      label TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      detail TEXT,
      patient_id TEXT,
      ward_id TEXT,
      drug_id TEXT,
      count INTEGER NOT NULL,
      risk_score REAL NOT NULL,
      confidence REAL NOT NULL,
      uncertainty REAL NOT NULL,
      evidence TEXT NOT NULL,
      required_action TEXT NOT NULL,
      detected_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      total_alarms INTEGER NOT NULL,
      active_alarms INTEGER NOT NULL,
      patterns_detected INTEGER NOT NULL,
      data_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS validation_feedback (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  seedDataIfEmpty();
}

/**
 * Seed initial baseline data if tables are empty
 */
function seedDataIfEmpty() {
  const now = Date.now();

  // 1. Seed Users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, password_salt, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const users = [
      {
        id: 'USR-1001',
        name: 'Dr. R. Ahmed',
        email: 'ahmed@hospital.nhs.uk',
        pass: 'doctor123',
        role: 'Senior Pharmacist',
      },
      {
        id: 'USR-1002',
        name: 'Dr. Sarah Lin',
        email: 'sarah.lin@hospital.nhs.uk',
        pass: 'doctor123',
        role: 'Ward Doctor',
      },
      {
        id: 'USR-1003',
        name: 'Nurse J. Taylor',
        email: 'taylor@hospital.nhs.uk',
        pass: 'nurse123',
        role: 'Staff Nurse',
      },
    ];

    for (const u of users) {
      const { salt, hash } = hashPassword(u.pass);
      insertUser.run(u.id, u.name, u.email, hash, salt, u.role, now);
    }
  }

  // 2. Seed Wards
  const wardCount = db.prepare('SELECT COUNT(*) as count FROM wards').get().count;
  if (wardCount === 0) {
    const insertWard = db.prepare(`
      INSERT INTO wards (id, name, short_name, beds, specialty, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const wards = [
      { id: 'W7', name: 'Ward 7 – Cardiology', short_name: 'Cardiology', beds: 24, specialty: 'Cardiology' },
      { id: 'W4', name: 'Ward 4 – Oncology',   short_name: 'Oncology',   beds: 18, specialty: 'Oncology' },
      { id: 'W3', name: 'Ward 3 – Surgical',   short_name: 'Surgical',   beds: 20, specialty: 'Surgical' },
      { id: 'W6', name: 'Ward 6 – Neuro',      short_name: 'Neurology',  beds: 16, specialty: 'Neurology' },
      { id: 'W2', name: 'Ward 2 – Medical',    short_name: 'Medical',    beds: 28, specialty: 'General Medicine' },
    ];

    for (const w of wards) {
      insertWard.run(w.id, w.name, w.short_name, w.beds, w.specialty, now);
    }
  }

  // 3. Seed Drugs
  const drugCount = db.prepare('SELECT COUNT(*) as count FROM drugs').get().count;
  if (drugCount === 0) {
    const insertDrug = db.prepare(`
      INSERT INTO drugs (id, name, dose, category, risk_level, risk_score, monitor_param, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const drugs = [
      { id: 'D001', name: 'Warfarin', dose: '5mg', category: 'Anticoagulant', risk_level: 'critical', risk_score: 95, monitor_param: 'INR', notes: 'Narrow therapeutic index. Strict INR monitoring required.' },
      { id: 'D002', name: 'Heparin', dose: '5000u', category: 'Anticoagulant', risk_level: 'critical', risk_score: 93, monitor_param: 'APTT', notes: 'High haemorrhagic risk. Monitor APTT 6-hourly.' },
      { id: 'D003', name: 'Methotrexate', dose: '10mg', category: 'Antineoplastic', risk_level: 'critical', risk_score: 91, monitor_param: 'FBC / LFT', notes: 'Weekly dosing regime. Overdose risk if daily schedule applied.' },
      { id: 'D004', name: 'Phenytoin', dose: '300mg', category: 'Anticonvulsant', risk_level: 'high', risk_score: 84, monitor_param: 'Phenytoin level', notes: 'Narrow therapeutic window. Non-linear pharmacokinetics.' },
      { id: 'D005', name: 'Digoxin', dose: '0.25mg', category: 'Cardiac Glycoside', risk_level: 'high', risk_score: 88, monitor_param: 'Digoxin level / K+', notes: 'Toxicity risk at therapeutic doses. Monitor renal function.' },
      { id: 'D006', name: 'Insulin Glargine', dose: '20u', category: 'Antidiabetic', risk_level: 'high', risk_score: 82, monitor_param: 'Blood glucose', notes: 'Hypoglycaemia risk. Verify dose against sliding scale.' },
      { id: 'D007', name: 'Amiodarone', dose: '200mg', category: 'Antiarrhythmic', risk_level: 'critical', risk_score: 90, monitor_param: 'TFT / LFT / CXR', notes: 'Organ toxicity profile. Extensive drug interactions.' },
      { id: 'D008', name: 'Lithium', dose: '400mg', category: 'Mood Stabiliser', risk_level: 'high', risk_score: 86, monitor_param: 'Lithium level / TFT', notes: 'Narrow therapeutic index. Toxicity may be severe.' },
      { id: 'D009', name: 'Vancomycin', dose: '1g', category: 'Glycopeptide Antibiotic', risk_level: 'high', risk_score: 78, monitor_param: 'Trough level / creatinine', notes: 'Nephrotoxic. AUC-guided dosing preferred.' },
      { id: 'D010', name: 'Morphine', dose: '10mg', category: 'Opioid Analgesic', risk_level: 'high', risk_score: 80, monitor_param: 'Respiratory rate / sedation', notes: 'Respiratory depression risk. Have naloxone available.' },
      { id: 'D011', name: 'Tacrolimus', dose: '1mg', category: 'Immunosuppressant', risk_level: 'critical', risk_score: 89, monitor_param: 'Trough level / creatinine', notes: 'Organ toxicity and rejection risk if missed. Strict compliance needed.' },
      { id: 'D012', name: 'Aminophylline', dose: '250mg', category: 'Bronchodilator', risk_level: 'medium', risk_score: 72, monitor_param: 'Theophylline level', notes: 'Arrhythmia risk in toxicity. Narrow therapeutic window.' },
      { id: 'D013', name: 'Clozapine', dose: '100mg', category: 'Antipsychotic', risk_level: 'high', risk_score: 83, monitor_param: 'WBC / neutrophils', notes: 'Agranulocytosis risk. Mandatory haematological monitoring.' },
      { id: 'D014', name: 'Ketamine', dose: '50mg', category: 'Dissociative Anaesthetic', risk_level: 'high', risk_score: 77, monitor_param: 'BP / HR / sedation', notes: 'Hypertension and dissociation. Use only in monitored settings.' },
      { id: 'D015', name: 'Metformin', dose: '1000mg', category: 'Biguanide Antidiabetic', risk_level: 'medium', risk_score: 55, monitor_param: 'eGFR', notes: 'Lactic acidosis risk in renal impairment. Withhold if eGFR <30.' },
    ];

    for (const d of drugs) {
      insertDrug.run(d.id, d.name, d.dose, d.category, d.risk_level, d.risk_score, d.monitor_param, d.notes, now);
    }
  }

  // 4. Seed Patients
  const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get().count;
  if (patientCount === 0) {
    const insertPatient = db.prepare(`
      INSERT INTO patients (id, display_name, ward_id, bed, age, conditions, medications, base_risk_score, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const patients = [
      { id: 'P001', display_name: 'Patient 7C-04', ward_id: 'W7', bed: '7C-04', age: 67, conditions: ['Atrial Fibrillation', 'Congestive Heart Failure'], medications: ['D001', 'D005'], base_risk_score: 88 },
      { id: 'P002', display_name: 'Patient 7C-11', ward_id: 'W7', bed: '7C-11', age: 74, conditions: ['Ventricular Arrhythmia', 'Hypertension'], medications: ['D007', 'D001'], base_risk_score: 91 },
      { id: 'P003', display_name: 'Patient 7B-02', ward_id: 'W7', bed: '7B-02', age: 59, conditions: ['Pulmonary Embolism'], medications: ['D002'], base_risk_score: 84 },
      { id: 'P004', display_name: 'Patient 7A-08', ward_id: 'W7', bed: '7A-08', age: 82, conditions: ['Heart Failure', 'CKD Stage 3'], medications: ['D005', 'D006'], base_risk_score: 79 },
      { id: 'P005', display_name: 'Patient 4B-11', ward_id: 'W4', bed: '4B-11', age: 51, conditions: ['Non-Hodgkin Lymphoma'], medications: ['D003', 'D002'], base_risk_score: 92 },
      { id: 'P006', display_name: 'Patient 4C-07', ward_id: 'W4', bed: '4C-07', age: 45, conditions: ['Renal Transplant', 'GvHD prophylaxis'], medications: ['D011'], base_risk_score: 89 },
      { id: 'P007', display_name: 'Patient 4A-03', ward_id: 'W4', bed: '4A-03', age: 63, conditions: ['Breast Cancer Metastases'], medications: ['D003', 'D010'], base_risk_score: 86 },
      { id: 'P008', display_name: 'Patient 4D-01', ward_id: 'W4', bed: '4D-01', age: 38, conditions: ['Acute Myeloid Leukaemia'], medications: ['D003'], base_risk_score: 88 },
      { id: 'P009', display_name: 'Patient 3A-02', ward_id: 'W3', bed: '3A-02', age: 71, conditions: ['Post-Op Knee Arthroplasty', 'DVT prophylaxis'], medications: ['D002', 'D010'], base_risk_score: 81 },
      { id: 'P010', display_name: 'Patient 3B-09', ward_id: 'W3', bed: '3B-09', age: 66, conditions: ['Post-Op Bowel Resection', 'Type 2 Diabetes'], medications: ['D006'], base_risk_score: 76 },
      { id: 'P011', display_name: 'Patient 3C-14', ward_id: 'W3', bed: '3C-14', age: 58, conditions: ['Post-Op Thoracotomy'], medications: ['D010', 'D014'], base_risk_score: 78 },
      { id: 'P012', display_name: 'Patient 3A-07', ward_id: 'W3', bed: '3A-07', age: 80, conditions: ['Hip Fracture Fixation', 'Atrial Fibrillation'], medications: ['D001'], base_risk_score: 85 },
      { id: 'P013', display_name: 'Patient 6D-08', ward_id: 'W6', bed: '6D-08', age: 43, conditions: ['Refractory Epilepsy'], medications: ['D004'], base_risk_score: 84 },
      { id: 'P014', display_name: 'Patient 6A-01', ward_id: 'W6', bed: '6A-01', age: 39, conditions: ['Bipolar I Disorder', 'Mania'], medications: ['D008'], base_risk_score: 86 },
      { id: 'P015', display_name: 'Patient 6B-05', ward_id: 'W6', bed: '6B-05', age: 52, conditions: ['Treatment-Resistant Schizophrenia'], medications: ['D013'], base_risk_score: 83 },
      { id: 'P016', display_name: 'Patient 6C-12', ward_id: 'W6', bed: '6C-12', age: 68, conditions: ['Status Epilepticus recovery'], medications: ['D004', 'D014'], base_risk_score: 87 },
      { id: 'P017', display_name: 'Patient 2C-15', ward_id: 'W2', bed: '2C-15', age: 77, conditions: ['MRSA Sepsis', 'Pneumonia'], medications: ['D009'], base_risk_score: 83 },
      { id: 'P018', display_name: 'Patient 2A-04', ward_id: 'W2', bed: '2A-04', age: 62, conditions: ['COPD Exacerbation', 'Severe Asthma'], medications: ['D012'], base_risk_score: 74 },
      { id: 'P019', display_name: 'Patient 2B-10', ward_id: 'W2', bed: '2B-10', age: 70, conditions: ['Type 2 Diabetes', 'Diabetic Nephropathy'], medications: ['D015', 'D006'], base_risk_score: 68 },
      { id: 'P020', display_name: 'Patient 2D-02', ward_id: 'W2', bed: '2D-02', age: 85, conditions: ['Congestive Heart Failure', 'Severe CKD'], medications: ['D005'], base_risk_score: 89 },
    ];

    for (const p of patients) {
      insertPatient.run(
        p.id,
        p.display_name,
        p.ward_id,
        p.bed,
        p.age,
        JSON.stringify(p.conditions),
        JSON.stringify(p.medications),
        p.base_risk_score,
        'Active',
        now
      );
    }
  }

  // 5. Seed Alarms
  const alarmCount = db.prepare('SELECT COUNT(*) as count FROM alarms').get().count;
  if (alarmCount === 0) {
    const min = 60_000;
    const insertAlarm = db.prepare(`
      INSERT INTO alarms (
        id, patient_id, patient_name, ward_id, ward_name, drug_id, drug_name,
        drug_risk, type, severity, label, status, time_str, timestamp, confirmed_event, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialAlarms = [
      { id: 'AL-2048', patient_id: 'P001', patient_name: 'Patient 7C-04', ward_id: 'W7', ward_name: 'Ward 7 – Cardiology', drug_id: 'D001', drug_name: 'Warfarin 5mg', drug_risk: 'critical', type: 'Missed Dose', severity: 'critical', label: 'ESCALATION', status: 'Active', time_str: '20:18', timestamp: now - 15 * min },
      { id: 'AL-2047', patient_id: 'P005', patient_name: 'Patient 4B-11', ward_id: 'W4', ward_name: 'Ward 4 – Oncology', drug_id: 'D002', drug_name: 'Heparin 5000u', drug_risk: 'critical', type: 'Overdue', severity: 'critical', label: 'ESCALATION', status: 'Active', time_str: '20:05', timestamp: now - 28 * min },
      { id: 'AL-2046', patient_id: 'P009', patient_name: 'Patient 3A-02', ward_id: 'W3', ward_name: 'Ward 3 – Surgical', drug_id: 'D003', drug_name: 'Methotrexate 10mg', drug_risk: 'critical', type: 'Duplicate Alert', severity: 'high', label: 'NUISANCE', status: 'Active', time_str: '19:52', timestamp: now - 41 * min },
      { id: 'AL-2045', patient_id: 'P013', patient_name: 'Patient 6D-08', ward_id: 'W6', ward_name: 'Ward 6 – Neuro', drug_id: 'D004', drug_name: 'Phenytoin 300mg', drug_risk: 'high', type: 'Missed Dose', severity: 'high', label: 'REVIEW', status: 'Acknowledged', time_str: '19:41', timestamp: now - 52 * min },
      { id: 'AL-2044', patient_id: 'P017', patient_name: 'Patient 2C-15', ward_id: 'W2', ward_name: 'Ward 2 – Medical', drug_id: 'D005', drug_name: 'Digoxin 0.25mg', drug_risk: 'high', type: 'Overdue', severity: 'medium', label: 'REVIEW', status: 'Active', time_str: '19:30', timestamp: now - 63 * min },
      { id: 'AL-2043', patient_id: 'P010', patient_name: 'Patient 3B-09', ward_id: 'W3', ward_name: 'Ward 3 – Surgical', drug_id: 'D006', drug_name: 'Insulin Glargine 20u', drug_risk: 'high', type: 'Missed Dose', severity: 'medium', label: 'REVIEW', status: 'Resolved', time_str: '19:15', timestamp: now - 78 * min },
      { id: 'AL-2042', patient_id: 'P002', patient_name: 'Patient 7C-11', ward_id: 'W7', ward_name: 'Ward 7 – Cardiology', drug_id: 'D007', drug_name: 'Amiodarone 200mg', drug_risk: 'critical', type: 'Escalation', severity: 'critical', label: 'ESCALATION', status: 'Resolved', time_str: '18:58', timestamp: now - 95 * min },
      { id: 'AL-2041', patient_id: 'P001', patient_name: 'Patient 7C-04', ward_id: 'W7', ward_name: 'Ward 7 – Cardiology', drug_id: 'D001', drug_name: 'Warfarin 5mg', drug_risk: 'critical', type: 'Overdue', severity: 'low', label: 'NUISANCE', status: 'Resolved', time_str: '18:42', timestamp: now - 111 * min },
      { id: 'AL-2040', patient_id: 'P001', patient_name: 'Patient 7C-04', ward_id: 'W7', ward_name: 'Ward 7 – Cardiology', drug_id: 'D001', drug_name: 'Warfarin 5mg', drug_risk: 'critical', type: 'Missed Dose', severity: 'critical', label: 'ESCALATION', status: 'Active', time_str: '17:55', timestamp: now - 148 * min },
      { id: 'AL-2039', patient_id: 'P005', patient_name: 'Patient 4B-11', ward_id: 'W4', ward_name: 'Ward 4 – Oncology', drug_id: 'D002', drug_name: 'Heparin 5000u', drug_risk: 'critical', type: 'Missed Dose', severity: 'critical', label: 'ESCALATION', status: 'Active', time_str: '17:40', timestamp: now - 163 * min },
      { id: 'AL-2038', patient_id: 'P006', patient_name: 'Patient 4C-07', ward_id: 'W4', ward_name: 'Ward 4 – Oncology', drug_id: 'D011', drug_name: 'Tacrolimus 1mg', drug_risk: 'critical', type: 'Overdue', severity: 'critical', label: 'ESCALATION', status: 'Active', time_str: '17:22', timestamp: now - 181 * min },
      { id: 'AL-2037', patient_id: 'P014', patient_name: 'Patient 6A-01', ward_id: 'W6', ward_name: 'Ward 6 – Neuro', drug_id: 'D008', drug_name: 'Lithium 400mg', drug_risk: 'high', type: 'Near-Miss', severity: 'medium', label: 'REVIEW', status: 'Resolved', time_str: '17:05', timestamp: now - 198 * min },
    ];

    for (const a of initialAlarms) {
      insertAlarm.run(
        a.id,
        a.patient_id,
        a.patient_name,
        a.ward_id,
        a.ward_name,
        a.drug_id,
        a.drug_name,
        a.drug_risk,
        a.type,
        a.severity,
        a.label,
        a.status,
        a.time_str,
        a.timestamp,
        1,
        a.timestamp
      );
    }

    // Run pattern analysis and persist detected patterns
    recomputeAndSavePatterns();
  }

  // 6. Seed Validation Feedback
  const feedbackCount = db.prepare('SELECT COUNT(*) as count FROM validation_feedback').get().count;
  if (feedbackCount === 0) {
    const insertFeedback = db.prepare(`
      INSERT INTO validation_feedback (id, role, rating, comment, label, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const seedFeedbacks = [
      {
        id: 'FB-001',
        role: 'Pharmacist',
        rating: 4,
        comment: 'Pattern detection for warfarin missed doses is accurate. Risk scoring aligns with clinical expectations.',
        label: 'SIMULATED STAKEHOLDER FEEDBACK',
      },
      {
        id: 'FB-002',
        role: 'Clinical Nurse Specialist',
        rating: 3,
        comment: 'Uncertainty display is helpful. Would prefer clearer priority ordering in the alarm queue.',
        label: 'SIMULATED STAKEHOLDER FEEDBACK',
      },
      {
        id: 'FB-003',
        role: 'Ward Doctor',
        rating: 5,
        comment: 'High-risk drug storm detection immediately flagged multiple critical events in Oncology.',
        label: 'SIMULATED STAKEHOLDER FEEDBACK',
      },
    ];

    for (const f of seedFeedbacks) {
      insertFeedback.run(f.id, f.role, f.rating, f.comment, f.label, now);
    }
  }
}

/**
 * Recompute patterns based on all database alarms and persist to detected_patterns
 */
export function recomputeAndSavePatterns() {
  const alarms = db.prepare('SELECT * FROM alarms ORDER BY timestamp DESC').all();
  const patterns = analysePatterns(alarms);

  db.exec('DELETE FROM detected_patterns;');

  const insertPattern = db.prepare(`
    INSERT INTO detected_patterns (
      id, type, severity, label, title, message, detail,
      patient_id, ward_id, drug_id, count, risk_score,
      confidence, uncertainty, evidence, required_action, detected_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of patterns) {
    insertPattern.run(
      p.id,
      p.type,
      p.severity,
      p.label || 'REVIEW',
      p.title,
      p.message,
      p.detail || null,
      p.patientId || null,
      p.wardId || null,
      p.drugId || null,
      p.count || 1,
      p.riskScore || 0,
      p.confidence || 0.7,
      p.uncertainty || 0.3,
      JSON.stringify(p.evidence || []),
      p.requiredAction || 'Monitor patient.',
      p.detectedAt || Date.now()
    );
  }

  return patterns;
}
