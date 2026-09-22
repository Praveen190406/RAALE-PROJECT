import express from 'express';
import { db } from '../database.js';
import { optionalAuth } from '../auth.js';

const router = express.Router();

/**
 * GET /api/reports
 * List all saved clinical reports
 */
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, title, generated_by, total_alarms, active_alarms, patterns_detected, created_at FROM reports ORDER BY created_at DESC').all();

    const reports = rows.map((r) => ({
      id: r.id,
      title: r.title,
      generatedBy: r.generated_by,
      totalAlarms: r.total_alarms,
      activeAlarms: r.active_alarms,
      patternsDetected: r.patterns_detected,
      createdAt: r.created_at,
      dateFormatted: new Date(r.created_at).toLocaleString('en-GB'),
    }));

    return res.json({ success: true, reports, count: reports.length });
  } catch (err) {
    console.error('Fetch reports error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
});

/**
 * GET /api/reports/:id
 */
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    return res.json({
      success: true,
      report: {
        id: row.id,
        title: row.title,
        generatedBy: row.generated_by,
        totalAlarms: row.total_alarms,
        activeAlarms: row.active_alarms,
        patternsDetected: row.patterns_detected,
        data: typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    console.error('Fetch report by id error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch report details' });
  }
});

/**
 * POST /api/reports
 * Save a newly generated report
 */
router.post('/', optionalAuth, (req, res) => {
  try {
    const { title, generatedBy, totalAlarms, activeAlarms, patternsDetected, data } = req.body;

    const reportId = `REP-${Date.now().toString().slice(-4)}`;
    const author = req.user ? req.user.name : (generatedBy || 'Dr. R. Ahmed (Senior Pharmacist)');
    const now = Date.now();

    const finalTitle = title || `Clinical Alarm Performance Evaluation – ${new Date().toLocaleDateString('en-GB')}`;
    const totAlarms = totalAlarms != null ? Number(totalAlarms) : db.prepare('SELECT COUNT(*) as c FROM alarms').get().c;
    const actAlarms = activeAlarms != null ? Number(activeAlarms) : db.prepare("SELECT COUNT(*) as c FROM alarms WHERE status = 'Active'").get().c;
    const patDetected = patternsDetected != null ? Number(patternsDetected) : db.prepare('SELECT COUNT(*) as c FROM detected_patterns').get().c;

    db.prepare(`
      INSERT INTO reports (id, title, generated_by, total_alarms, active_alarms, patterns_detected, data_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId,
      finalTitle,
      author,
      totAlarms,
      actAlarms,
      patDetected,
      JSON.stringify(data || {}),
      now
    );

    return res.status(201).json({
      success: true,
      message: 'Report saved to database successfully',
      reportId,
      report: {
        id: reportId,
        title: finalTitle,
        generatedBy: author,
        totalAlarms: totAlarms,
        activeAlarms: actAlarms,
        patternsDetected: patDetected,
        createdAt: now,
      },
    });
  } catch (err) {
    console.error('Save report error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save report' });
  }
});

export default router;
