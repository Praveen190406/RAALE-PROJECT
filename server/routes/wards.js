import express from 'express';
import { db } from '../database.js';

const router = express.Router();

/**
 * GET /api/wards
 * Returns all wards with active alarm counts and calculated ward risk score
 */
router.get('/', (req, res) => {
  try {
    const wards = db.prepare('SELECT * FROM wards ORDER BY id ASC').all();

    // Query active alarm counts per ward
    const wardAlarms = db.prepare(`
      SELECT ward_id,
             COUNT(*) as active_count,
             SUM(CASE WHEN severity = 'critical' THEN 3 WHEN severity = 'high' THEN 2 ELSE 1 END) as severity_weight
      FROM alarms
      WHERE status = 'Active'
      GROUP BY ward_id
    `).all();

    const alarmMap = Object.fromEntries(
      wardAlarms.map((wa) => [wa.ward_id, { count: wa.active_count, weight: wa.severity_weight }])
    );

    const formatted = wards.map((w) => {
      const stats = alarmMap[w.id] || { count: 0, weight: 0 };
      // Base risk between 30 and 45 plus alarm weight
      const riskScore = Math.min(98, 35 + stats.weight * 6 + stats.count * 4);

      let trend = 'stable';
      if (stats.count >= 3) trend = 'escalating';
      else if (stats.count === 0) trend = 'resolving';

      return {
        id: w.id,
        name: w.name,
        shortName: w.short_name,
        beds: w.beds,
        specialty: w.specialty,
        activeAlarmsCount: stats.count,
        riskScore,
        trend,
      };
    });

    return res.json({ success: true, wards: formatted, count: formatted.length });
  } catch (err) {
    console.error('Fetch wards error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch wards' });
  }
});

/**
 * POST /api/wards
 * Add new ward
 */
router.post('/', (req, res) => {
  try {
    const { id, name, shortName, beds, specialty } = req.body;
    if (!id || !name) {
      return res.status(400).json({ success: false, message: 'Ward ID and Name are required' });
    }

    const existing = db.prepare('SELECT id FROM wards WHERE id = ?').get(id.trim());
    if (existing) {
      return res.status(409).json({ success: false, message: 'Ward with this ID already exists' });
    }

    const now = Date.now();
    db.prepare(`
      INSERT INTO wards (id, name, short_name, beds, specialty, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id.trim(),
      name.trim(),
      shortName ? shortName.trim() : name.trim(),
      Number(beds) || 20,
      specialty ? specialty.trim() : 'General',
      now
    );

    return res.status(201).json({
      success: true,
      message: 'Ward created successfully',
      ward: {
        id: id.trim(),
        name: name.trim(),
        shortName: shortName ? shortName.trim() : name.trim(),
        beds: Number(beds) || 20,
        specialty: specialty ? specialty.trim() : 'General',
        riskScore: 35,
        activeAlarmsCount: 0,
        trend: 'stable',
      },
    });
  } catch (err) {
    console.error('Create ward error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create ward' });
  }
});

export default router;
