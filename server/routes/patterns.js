import express from 'express';
import { db, recomputeAndSavePatterns } from '../database.js';

const router = express.Router();

/**
 * GET /api/patterns
 * Retrieve current detected patterns
 */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM detected_patterns ORDER BY detected_at DESC').all();

    const patterns = rows.map((r) => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      label: r.label,
      title: r.title,
      message: r.message,
      detail: r.detail,
      patientId: r.patient_id,
      wardId: r.ward_id,
      drugId: r.drug_id,
      count: r.count,
      riskScore: r.risk_score,
      confidence: r.confidence,
      uncertainty: r.uncertainty,
      evidence: typeof r.evidence === 'string' ? JSON.parse(r.evidence) : r.evidence,
      requiredAction: r.required_action,
      detectedAt: r.detected_at,
      detectedAtStr: new Date(r.detected_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    }));

    return res.json({ success: true, patterns, count: patterns.length });
  } catch (err) {
    console.error('Fetch patterns error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch detected patterns' });
  }
});

/**
 * POST /api/patterns/analyse
 * Trigger real-time pattern analysis on all database alarms
 */
router.post('/analyse', (req, res) => {
  try {
    const patterns = recomputeAndSavePatterns();
    return res.json({
      success: true,
      message: 'Pattern analysis completed successfully',
      patterns,
      count: patterns.length,
    });
  } catch (err) {
    console.error('Analyse patterns error:', err);
    return res.status(500).json({ success: false, message: 'Pattern analysis failed' });
  }
});

export default router;
