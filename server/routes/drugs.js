import express from 'express';
import { db } from '../database.js';

const router = express.Router();

/**
 * GET /api/drugs
 */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM drugs ORDER BY risk_score DESC').all();

    const drugs = rows.map((d) => ({
      id: d.id,
      name: d.name,
      dose: d.dose,
      category: d.category,
      riskLevel: d.risk_level,
      riskScore: d.risk_score,
      monitorParam: d.monitor_param,
      notes: d.notes,
    }));

    return res.json({ success: true, drugs, count: drugs.length });
  } catch (err) {
    console.error('Fetch drugs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch drug registry' });
  }
});

/**
 * POST /api/drugs
 * Register new high-risk medicine
 */
router.post('/', (req, res) => {
  try {
    const { name, dose, category, riskLevel, riskScore, monitorParam, notes } = req.body;

    if (!name || !dose || !category) {
      return res.status(400).json({ success: false, message: 'Name, dose, and category are required' });
    }

    const drugCount = db.prepare('SELECT COUNT(*) as count FROM drugs').get().count;
    const newId = `D${String(drugCount + 1).padStart(3, '0')}`;
    const now = Date.now();

    const level = riskLevel || 'medium';
    const score = riskScore != null ? Number(riskScore) : (level === 'critical' ? 90 : level === 'high' ? 80 : 65);

    db.prepare(`
      INSERT INTO drugs (id, name, dose, category, risk_level, risk_score, monitor_param, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      name.trim(),
      dose.trim(),
      category.trim(),
      level,
      score,
      monitorParam ? monitorParam.trim() : 'Routine monitoring',
      notes ? notes.trim() : 'Added to clinical registry',
      now
    );

    return res.status(201).json({
      success: true,
      message: 'Medication registered successfully',
      drug: {
        id: newId,
        name: name.trim(),
        dose: dose.trim(),
        category: category.trim(),
        riskLevel: level,
        riskScore: score,
        monitorParam: monitorParam || 'Routine monitoring',
        notes: notes || 'Added to clinical registry',
      },
    });
  } catch (err) {
    console.error('Create drug error:', err);
    return res.status(500).json({ success: false, message: 'Failed to register medication' });
  }
});

export default router;
