import express from 'express';
import { db, recomputeAndSavePatterns } from '../database.js';
import { optionalAuth } from '../auth.js';

const router = express.Router();

/**
 * Format timestamp as HH:MM
 */
function nowTimeStr() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * GET /api/alarms
 */
router.get('/', (req, res) => {
  try {
    const { status, severity, ward_id, patient_id, drug_id, limit = 150 } = req.query;

    let query = 'SELECT * FROM alarms WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    if (severity && severity !== 'all') {
      query += ' AND severity = ?';
      params.push(severity);
    }
    if (ward_id && ward_id !== 'all') {
      query += ' AND ward_id = ?';
      params.push(ward_id);
    }
    if (patient_id) {
      query += ' AND patient_id = ?';
      params.push(patient_id);
    }
    if (drug_id) {
      query += ' AND drug_id = ?';
      params.push(drug_id);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Number(limit));

    const rows = db.prepare(query).all(...params);

    // Map rows into frontend-compatible format
    const alarms = rows.map((r) => ({
      id: r.id,
      patientId: r.patient_id,
      patient: r.patient_name,
      wardId: r.ward_id,
      ward: r.ward_name,
      drugId: r.drug_id,
      drug: r.drug_name,
      drugRisk: r.drug_risk,
      type: r.type,
      severity: r.severity,
      label: r.label,
      status: r.status,
      time: r.time_str,
      timestamp: r.timestamp,
      confirmed_event: r.confirmed_event,
      createdAt: r.created_at,
    }));

    return res.json({ success: true, alarms, count: alarms.length });
  } catch (err) {
    console.error('Fetch alarms error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch alarms' });
  }
});

/**
 * GET /api/alarms/:id
 */
router.get('/:id', (req, res) => {
  try {
    const alarm = db.prepare('SELECT * FROM alarms WHERE id = ?').get(req.params.id);
    if (!alarm) {
      return res.status(404).json({ success: false, message: 'Alarm not found' });
    }

    const responses = db
      .prepare('SELECT * FROM staff_responses WHERE alarm_id = ? ORDER BY created_at ASC')
      .all(req.params.id);

    return res.json({
      success: true,
      alarm: {
        id: alarm.id,
        patientId: alarm.patient_id,
        patient: alarm.patient_name,
        wardId: alarm.ward_id,
        ward: alarm.ward_name,
        drugId: alarm.drug_id,
        drug: alarm.drug_name,
        drugRisk: alarm.drug_risk,
        type: alarm.type,
        severity: alarm.severity,
        label: alarm.label,
        status: alarm.status,
        time: alarm.time_str,
        timestamp: alarm.timestamp,
        confirmed_event: alarm.confirmed_event,
      },
      responses,
    });
  } catch (err) {
    console.error('Fetch alarm by ID error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch alarm details' });
  }
});

/**
 * POST /api/alarms
 * Create a new clinical medication alarm
 */
router.post('/', optionalAuth, (req, res) => {
  try {
    const {
      patientId,
      patient,
      wardId,
      ward,
      drugId,
      drug,
      drugRisk,
      type,
      severity,
      label,
    } = req.body;

    const now = Date.now();
    const alarmId = `AL-${Date.now().toString().slice(-4)}`;

    // Resolve patient details if needed
    let finalPatientName = patient;
    let finalWardId = wardId;
    let finalWardName = ward;

    if (patientId) {
      const p = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
      if (p) {
        finalPatientName = p.display_name;
        finalWardId = p.ward_id;
        const w = db.prepare('SELECT name FROM wards WHERE id = ?').get(p.ward_id);
        if (w) finalWardName = w.name;
      }
    }

    // Resolve drug details if needed
    let finalDrugName = drug;
    let finalDrugRisk = drugRisk || 'medium';

    if (drugId) {
      const d = db.prepare('SELECT * FROM drugs WHERE id = ?').get(drugId);
      if (d) {
        finalDrugName = `${d.name} ${d.dose}`;
        finalDrugRisk = d.risk_level;
      }
    }

    const finalType = type || 'Missed Dose';
    const finalSeverity = severity || (finalDrugRisk === 'critical' ? 'critical' : 'high');
    const timeStr = nowTimeStr();

    db.prepare(`
      INSERT INTO alarms (
        id, patient_id, patient_name, ward_id, ward_name, drug_id, drug_name,
        drug_risk, type, severity, label, status, time_str, timestamp, confirmed_event, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      alarmId,
      patientId || null,
      finalPatientName || 'Unknown Patient',
      finalWardId || 'W7',
      finalWardName || 'Cardiology',
      drugId || null,
      finalDrugName || 'Unknown Medication',
      finalDrugRisk,
      finalType,
      finalSeverity,
      label || (finalSeverity === 'critical' ? 'ESCALATION' : 'REVIEW'),
      'Active',
      timeStr,
      now,
      1,
      now
    );

    // Automatically recompute detected patterns across alarms
    const patterns = recomputeAndSavePatterns();

    const created = {
      id: alarmId,
      patientId: patientId || null,
      patient: finalPatientName,
      wardId: finalWardId,
      ward: finalWardName,
      drugId: drugId || null,
      drug: finalDrugName,
      drugRisk: finalDrugRisk,
      type: finalType,
      severity: finalSeverity,
      label: label || 'ESCALATION',
      status: 'Active',
      time: timeStr,
      timestamp: now,
      confirmed_event: 1,
    };

    return res.status(201).json({
      success: true,
      message: 'Alarm created and analysed successfully',
      alarm: created,
      patterns,
    });
  } catch (err) {
    console.error('Create alarm error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create alarm' });
  }
});

/**
 * POST /api/alarms/:id/acknowledge
 */
router.post('/:id/acknowledge', optionalAuth, (req, res) => {
  try {
    const alarmId = req.params.id;
    const { notes } = req.body;
    const alarm = db.prepare('SELECT * FROM alarms WHERE id = ?').get(alarmId);

    if (!alarm) {
      return res.status(404).json({ success: false, message: 'Alarm not found' });
    }

    const now = Date.now();
    db.prepare("UPDATE alarms SET status = 'Acknowledged' WHERE id = ?").run(alarmId);

    // Record staff response
    const resId = `RES-${Date.now().toString().slice(-4)}`;
    const userName = req.user ? req.user.name : (req.body.userName || 'Dr. R. Ahmed');
    const userId = req.user ? req.user.id : (req.body.userId || 'USR-1001');
    const responseTime = Math.max(0, now - alarm.timestamp);

    db.prepare(`
      INSERT INTO staff_responses (
        id, alarm_id, user_id, user_name, action_type, notes, response_time_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resId,
      alarmId,
      userId,
      userName,
      'Acknowledge',
      notes || 'Acknowledged by clinician in duty',
      responseTime,
      now
    );

    const patterns = recomputeAndSavePatterns();

    return res.json({
      success: true,
      message: 'Alarm acknowledged',
      alarm: { ...alarm, status: 'Acknowledged' },
      patterns,
    });
  } catch (err) {
    console.error('Acknowledge alarm error:', err);
    return res.status(500).json({ success: false, message: 'Failed to acknowledge alarm' });
  }
});

/**
 * POST /api/alarms/:id/resolve
 */
router.post('/:id/resolve', optionalAuth, (req, res) => {
  try {
    const alarmId = req.params.id;
    const { notes } = req.body;
    const alarm = db.prepare('SELECT * FROM alarms WHERE id = ?').get(alarmId);

    if (!alarm) {
      return res.status(404).json({ success: false, message: 'Alarm not found' });
    }

    const now = Date.now();
    db.prepare("UPDATE alarms SET status = 'Resolved' WHERE id = ?").run(alarmId);

    // Record staff response
    const resId = `RES-${Date.now().toString().slice(-4)}`;
    const userName = req.user ? req.user.name : (req.body.userName || 'Dr. R. Ahmed');
    const userId = req.user ? req.user.id : (req.body.userId || 'USR-1001');
    const responseTime = Math.max(0, now - alarm.timestamp);

    db.prepare(`
      INSERT INTO staff_responses (
        id, alarm_id, user_id, user_name, action_type, notes, response_time_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resId,
      alarmId,
      userId,
      userName,
      'Resolve',
      notes || 'Resolved and reviewed by clinician',
      responseTime,
      now
    );

    const patterns = recomputeAndSavePatterns();

    return res.json({
      success: true,
      message: 'Alarm resolved',
      alarm: { ...alarm, status: 'Resolved' },
      patterns,
    });
  } catch (err) {
    console.error('Resolve alarm error:', err);
    return res.status(500).json({ success: false, message: 'Failed to resolve alarm' });
  }
});

/**
 * POST /api/alarms/batch
 * Ingest multiple simulated or benchmark alarms at once
 */
router.post('/batch', optionalAuth, (req, res) => {
  try {
    const { alarms } = req.body;
    if (!Array.isArray(alarms) || alarms.length === 0) {
      return res.status(400).json({ success: false, message: 'Alarms array required' });
    }

    const insertAlarm = db.prepare(`
      INSERT OR REPLACE INTO alarms (
        id, patient_id, patient_name, ward_id, ward_name, drug_id, drug_name,
        drug_risk, type, severity, label, status, time_str, timestamp, confirmed_event, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    for (const a of alarms) {
      const aId = a.id || `AL-${Math.floor(Math.random() * 9000 + 1000)}`;
      const pId = a.patientId || a.patient_id || null;
      const pName = a.patient || a.patient_name || 'Patient';
      const wId = a.wardId || a.ward_id || 'W7';
      const wName = a.ward || a.ward_name || 'Ward 7';
      const dId = a.drugId || a.drug_id || null;
      const dName = a.drug || a.drug_name || 'Medication';
      const dRisk = a.drugRisk || a.drug_risk || 'medium';
      const aType = a.type || 'Missed Dose';
      const aSev = a.severity || 'medium';
      const aLabel = a.label || (aSev === 'critical' ? 'ESCALATION' : 'REVIEW');
      const aStatus = a.status || 'Active';
      const aTime = a.time || nowTimeStr();
      const aTs = a.timestamp || now;
      const aConf = a.confirmedEvent !== undefined ? (a.confirmedEvent ? 1 : 0) : 1;

      insertAlarm.run(
        aId, pId, pName, wId, wName, dId, dName, dRisk, aType, aSev, aLabel, aStatus, aTime, aTs, aConf, now
      );
    }

    const patterns = recomputeAndSavePatterns();

    return res.status(201).json({
      success: true,
      message: `Successfully ingested ${alarms.length} alarms`,
      count: alarms.length,
      patterns,
    });
  } catch (err) {
    console.error('Batch alarms error:', err);
    return res.status(500).json({ success: false, message: 'Failed to batch insert alarms' });
  }
});

/**
 * POST /api/alarms/reset
 * Revert alarm database to initial baseline seed state
 */
router.post('/reset', optionalAuth, (req, res) => {
  try {
    const now = Date.now();
    const min = 60_000;

    db.exec('DELETE FROM alarms;');
    db.exec('DELETE FROM staff_responses;');

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
        a.id, a.patient_id, a.patient_name, a.ward_id, a.ward_name, a.drug_id, a.drug_name,
        a.drug_risk, a.type, a.severity, a.label, a.status, a.time_str, a.timestamp, 1, a.timestamp
      );
    }

    const patterns = recomputeAndSavePatterns();

    return res.json({
      success: true,
      message: 'Database reset to baseline seeds',
      alarmsCount: initialAlarms.length,
      patterns,
    });
  } catch (err) {
    console.error('Reset alarms error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset alarms' });
  }
});

export default router;
