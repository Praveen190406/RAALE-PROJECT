import express from 'express';
import { db } from '../database.js';

const router = express.Router();

/**
 * GET /api/patients
 * List all patients with calculated risk scores and active alarm metrics
 */
router.get('/', (req, res) => {
  try {
    const patients = db.prepare('SELECT * FROM patients ORDER BY id ASC').all();
    const wards = db.prepare('SELECT * FROM wards').all();
    const wardMap = Object.fromEntries(wards.map((w) => [w.id, w.name]));

    // Aggregate active alarms by patient
    const activeAlarms = db.prepare(`
      SELECT patient_id, COUNT(*) as count,
             MAX(CASE WHEN severity = 'critical' THEN 3 WHEN severity = 'high' THEN 2 ELSE 1 END) as max_sev
      FROM alarms
      WHERE status = 'Active' AND patient_id IS NOT NULL
      GROUP BY patient_id
    `).all();

    const alarmMap = Object.fromEntries(
      activeAlarms.map((a) => [a.patient_id, { count: a.count, maxSev: a.max_sev }])
    );

    const formatted = patients.map((p) => {
      const parsedConditions = typeof p.conditions === 'string' ? JSON.parse(p.conditions) : p.conditions;
      const parsedMedications = typeof p.medications === 'string' ? JSON.parse(p.medications) : p.medications;
      const alarmInfo = alarmMap[p.id] || { count: 0, maxSev: 0 };

      // Calculate dynamic risk score based on base score + active alarms + severity
      let dynamicRisk = p.base_risk_score;
      if (alarmInfo.count > 0) {
        dynamicRisk = Math.min(99, dynamicRisk + alarmInfo.count * 4 + alarmInfo.maxSev * 3);
      }

      return {
        id: p.id,
        displayName: p.display_name,
        wardId: p.ward_id,
        ward: wardMap[p.ward_id] || p.ward_id,
        bed: p.bed,
        age: p.age,
        conditions: parsedConditions,
        medications: parsedMedications,
        baseRiskScore: p.base_risk_score,
        currentRiskScore: Math.round(dynamicRisk),
        activeAlarmsCount: alarmInfo.count,
        status: p.status,
        createdAt: p.created_at,
      };
    });

    return res.json({ success: true, patients: formatted, count: formatted.length });
  } catch (err) {
    console.error('Fetch patients error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch patients' });
  }
});

/**
 * GET /api/patients/:id
 */
router.get('/:id', (req, res) => {
  try {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const ward = db.prepare('SELECT * FROM wards WHERE id = ?').get(patient.ward_id);
    const alarms = db.prepare('SELECT * FROM alarms WHERE patient_id = ? ORDER BY timestamp DESC').all(patient.id);

    const parsedConditions = typeof patient.conditions === 'string' ? JSON.parse(patient.conditions) : patient.conditions;
    const parsedMedications = typeof patient.medications === 'string' ? JSON.parse(patient.medications) : patient.medications;

    // Fetch drug registry entries for the patient's medications
    let drugDetails = [];
    if (parsedMedications && parsedMedications.length > 0) {
      const placeholders = parsedMedications.map(() => '?').join(',');
      drugDetails = db.prepare(`SELECT * FROM drugs WHERE id IN (${placeholders})`).all(...parsedMedications);
    }

    return res.json({
      success: true,
      patient: {
        id: patient.id,
        displayName: patient.display_name,
        wardId: patient.ward_id,
        ward: ward ? ward.name : patient.ward_id,
        bed: patient.bed,
        age: patient.age,
        conditions: parsedConditions,
        medications: parsedMedications,
        drugDetails,
        baseRiskScore: patient.base_risk_score,
        status: patient.status,
      },
      alarms: alarms.map((r) => ({
        id: r.id,
        drug: r.drug_name,
        type: r.type,
        severity: r.severity,
        status: r.status,
        time: r.time_str,
        timestamp: r.timestamp,
      })),
    });
  } catch (err) {
    console.error('Fetch patient details error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch patient details' });
  }
});

/**
 * POST /api/patients
 * Admit / create a new patient
 */
router.post('/', (req, res) => {
  try {
    const { displayName, wardId, bed, age, conditions, medications, baseRiskScore } = req.body;

    if (!displayName || !wardId || !bed) {
      return res.status(400).json({ success: false, message: 'displayName, wardId, and bed are required' });
    }

    const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get().count;
    const newId = `P${String(patientCount + 1).padStart(3, '0')}`;
    const now = Date.now();

    const condList = Array.isArray(conditions)
      ? conditions
      : typeof conditions === 'string'
      ? conditions.split(',').map((c) => c.trim()).filter(Boolean)
      : ['General Observation'];

    const medList = Array.isArray(medications)
      ? medications
      : typeof medications === 'string'
      ? medications.split(',').map((m) => m.trim()).filter(Boolean)
      : ['D001'];

    const riskScore = baseRiskScore != null ? Number(baseRiskScore) : 75;

    db.prepare(`
      INSERT INTO patients (id, display_name, ward_id, bed, age, conditions, medications, base_risk_score, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      displayName.trim(),
      wardId,
      bed.trim(),
      Number(age) || 60,
      JSON.stringify(condList),
      JSON.stringify(medList),
      riskScore,
      'Active',
      now
    );

    const ward = db.prepare('SELECT name FROM wards WHERE id = ?').get(wardId);

    return res.status(201).json({
      success: true,
      message: 'Patient admitted successfully',
      patient: {
        id: newId,
        displayName: displayName.trim(),
        wardId,
        ward: ward ? ward.name : wardId,
        bed: bed.trim(),
        age: Number(age) || 60,
        conditions: condList,
        medications: medList,
        baseRiskScore: riskScore,
        currentRiskScore: riskScore,
        activeAlarmsCount: 0,
        status: 'Active',
      },
    });
  } catch (err) {
    console.error('Create patient error:', err);
    return res.status(500).json({ success: false, message: 'Failed to admit patient' });
  }
});

export default router;
