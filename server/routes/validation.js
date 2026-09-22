import express from 'express';
import { db } from '../database.js';
import { analysePatterns } from '../engine/patternAnalyser.js';

const router = express.Router();

/**
 * Deterministic experiment benchmark dataset for validation
 */
function getBenchmarkDataset() {
  const now = Date.now();
  const mins = (n) => n * 60 * 1000;

  return [
    // Journey A: High Urgency
    { id: 'EXP-A001', patientId: 'P001', patient: 'James Hargreaves', wardId: 'W7', ward: 'Ward 7 – Cardiology', drugId: 'D001', drug: 'Warfarin 5mg', type: 'Missed Dose', severity: 'critical', status: 'Active', timestamp: now - mins(180), confirmedEvent: true },
    { id: 'EXP-A002', patientId: 'P001', patient: 'James Hargreaves', wardId: 'W7', ward: 'Ward 7 – Cardiology', drugId: 'D001', drug: 'Warfarin 5mg', type: 'Missed Dose', severity: 'critical', status: 'Active', timestamp: now - mins(90), confirmedEvent: true },
    { id: 'EXP-A003', patientId: 'P001', patient: 'James Hargreaves', wardId: 'W7', ward: 'Ward 7 – Cardiology', drugId: 'D007', drug: 'Amiodarone 200mg', type: 'Escalation', severity: 'critical', status: 'Active', timestamp: now - mins(45), confirmedEvent: true },
    { id: 'EXP-A004', patientId: 'P001', patient: 'James Hargreaves', wardId: 'W7', ward: 'Ward 7 – Cardiology', drugId: 'D005', drug: 'Digoxin 0.25mg', type: 'Missed Dose', severity: 'high', status: 'Active', timestamp: now - mins(15), confirmedEvent: true },

    // Journey B: Low Urgency / Nuisance
    { id: 'EXP-B001', patientId: 'P002', patient: 'Evelyn Crawford', wardId: 'W2', ward: 'Ward 2 – Medical', drugId: 'D015', drug: 'Metformin 1000mg', type: 'Overdue', severity: 'medium', status: 'Resolved', timestamp: now - mins(300), confirmedEvent: false },
    { id: 'EXP-B002', patientId: 'P002', patient: 'Evelyn Crawford', wardId: 'W2', ward: 'Ward 2 – Medical', drugId: 'D015', drug: 'Metformin 1000mg', type: 'Duplicate Alert', severity: 'low', status: 'Resolved', timestamp: now - mins(280), confirmedEvent: false },
    { id: 'EXP-B003', patientId: 'P002', patient: 'Evelyn Crawford', wardId: 'W2', ward: 'Ward 2 – Medical', drugId: 'D006', drug: 'Insulin Glargine 20u', type: 'Missed Dose', severity: 'medium', status: 'Resolved', timestamp: now - mins(60), confirmedEvent: false },

    // Failure / Edge cases
    { id: 'EXP-FC001', patientId: null, patient: '(missing)', wardId: 'W4', ward: 'Ward 4 – Oncology', drugId: 'D002', drug: 'Heparin 5000u', type: 'Overdue', severity: 'critical', status: 'Active', timestamp: now - mins(25), confirmedEvent: true },
    { id: 'EXP-FC002', patientId: 'P003', patient: 'Arthur Pendelton', wardId: 'W4', ward: 'Ward 4 – Oncology', drugId: 'D003', drug: 'Methotrexate 10mg', type: 'Near-Miss', severity: 'critical', status: 'Active', timestamp: now - mins(50), confirmedEvent: true },
    { id: 'EXP-FC003', patientId: 'P003', patient: 'Arthur Pendelton', wardId: 'W4', ward: 'Ward 4 – Oncology', drugId: 'D003', drug: 'Methotrexate 10mg', type: 'Duplicate Alert', severity: 'high', status: 'Active', timestamp: now - mins(35), confirmedEvent: false },
    { id: 'EXP-FC004', patientId: 'P004', patient: 'Saoirse Murphy', wardId: 'W6', ward: 'Ward 6 – Neuro', drugId: 'D004', drug: 'Phenytoin 300mg', type: 'Missed Dose', severity: 'high', status: 'Active', timestamp: now - mins(15), confirmedEvent: true },
    { id: 'EXP-FC005', patientId: 'P004', patient: 'Saoirse Murphy', wardId: 'W6', ward: 'Ward 6 – Neuro', drugId: 'D004', drug: 'Phenytoin 300mg', type: 'Missed Dose', severity: 'high', status: 'Active', timestamp: now - mins(10), confirmedEvent: false },
  ];
}

function computeMetrics(patterns, dataset) {
  const detectedAlarmIds = new Set(patterns.flatMap((p) => p.evidence || []));

  let tp = 0, fp = 0, fn = 0, tn = 0;

  for (const alarm of dataset) {
    const detected = detectedAlarmIds.has(alarm.id);
    const confirmed = alarm.confirmedEvent === true;

    if (detected && confirmed) tp++;
    if (detected && !confirmed) fp++;
    if (!detected && confirmed) fn++;
    if (!detected && !confirmed) tn++;
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    precision: parseFloat(precision.toFixed(3)),
    recall: parseFloat(recall.toFixed(3)),
    f1: parseFloat(f1.toFixed(3)),
    tp,
    fp,
    fn,
    tn,
    totalAlarms: dataset.length,
    totalPatterns: patterns.length,
    detectedAlarms: detectedAlarmIds.size,
  };
}

/**
 * Baseline frequency classifier
 */
function baselineAnalyse(dataset) {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();
  const recent = dataset.filter((a) => now - a.timestamp < ONE_HOUR);
  const score = Math.min(100, (recent.length / 10) * 100);

  const detectedIds = dataset
    .filter((a) => a.severity === 'critical' || a.severity === 'high')
    .map((a) => a.id);

  return [
    {
      id: 'BASELINE-FREQ',
      type: 'FREQUENCY_BASELINE',
      severity: score > 50 ? 'high' : 'low',
      evidence: detectedIds,
      riskScore: score,
      confidence: 0.5,
      uncertainty: 0.5,
    },
  ];
}

/**
 * POST /api/validation/run
 */
router.post('/run', (req, res) => {
  try {
    const dataset = getBenchmarkDataset();

    // 1. Evaluate baseline
    const baselinePatterns = baselineAnalyse(dataset);
    const baselineMetrics = computeMetrics(baselinePatterns, dataset);

    // 2. Evaluate multi-feature pattern analyser
    const improvedPatterns = analysePatterns(dataset);
    const improvedMetrics = computeMetrics(improvedPatterns, dataset);

    const targets = {
      precision: 0.80,
      recall: 0.90,
      f1: 0.85,
    };

    return res.json({
      success: true,
      timestamp: Date.now(),
      baselineMetrics,
      improvedMetrics,
      targets,
      datasetSize: dataset.length,
      patternsFound: improvedPatterns.length,
      status: 'Validation Completed Successfully',
    });
  } catch (err) {
    console.error('Run validation error:', err);
    return res.status(500).json({ success: false, message: 'Validation run failed' });
  }
});

/**
 * GET /api/validation/feedback
 */
router.get('/feedback', (req, res) => {
  try {
    const feedbacks = db.prepare('SELECT * FROM validation_feedback ORDER BY created_at DESC').all();
    return res.json({ success: true, feedback: feedbacks, count: feedbacks.length });
  } catch (err) {
    console.error('Fetch feedback error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
  }
});

/**
 * POST /api/validation/feedback
 */
router.post('/feedback', (req, res) => {
  try {
    const { role, rating, comment, label } = req.body;
    if (!role || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Role, rating, and comment are required' });
    }

    const id = `FB-${Date.now().toString().slice(-4)}`;
    const now = Date.now();
    const tag = label || 'SIMULATED STAKEHOLDER FEEDBACK';

    db.prepare(`
      INSERT INTO validation_feedback (id, role, rating, comment, label, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, role.trim(), Number(rating), comment.trim(), tag, now);

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        id,
        role: role.trim(),
        rating: Number(rating),
        comment: comment.trim(),
        label: tag,
        createdAt: now,
      },
    });
  } catch (err) {
    console.error('Submit feedback error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
});

export default router;
