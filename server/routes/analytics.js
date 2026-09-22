import express from 'express';
import { db } from '../database.js';

const router = express.Router();

/**
 * GET /api/analytics
 * Real-time aggregated KPIs and distributions across clinical alarm database
 */
router.get('/', (req, res) => {
  try {
    const totalAlarms = db.prepare('SELECT COUNT(*) as c FROM alarms').get().c;
    const activeAlarms = db.prepare("SELECT COUNT(*) as c FROM alarms WHERE status = 'Active'").get().c;
    const ackAlarms = db.prepare("SELECT COUNT(*) as c FROM alarms WHERE status = 'Acknowledged'").get().c;
    const resAlarms = db.prepare("SELECT COUNT(*) as c FROM alarms WHERE status = 'Resolved'").get().c;

    const criticalCount = db.prepare("SELECT COUNT(*) as c FROM alarms WHERE severity = 'critical' AND status = 'Active'").get().c;
    const highCount = db.prepare("SELECT COUNT(*) as c FROM alarms WHERE severity = 'high' AND status = 'Active'").get().c;
    const medLowCount = db.prepare("SELECT COUNT(*) as c FROM alarms WHERE severity IN ('medium', 'low') AND status = 'Active'").get().c;

    // Nuisance rate
    const nuisanceCount = db.prepare("SELECT COUNT(*) as c FROM alarms WHERE label = 'NUISANCE' OR type = 'Duplicate Alert'").get().c;
    const nuisanceRate = totalAlarms > 0 ? ((nuisanceCount / totalAlarms) * 100).toFixed(1) : 0;

    // Average staff response time
    const avgResponseRow = db.prepare('SELECT AVG(response_time_ms) as avg_ms FROM staff_responses').get();
    const avgResponseMin = avgResponseRow && avgResponseRow.avg_ms
      ? (avgResponseRow.avg_ms / 60000).toFixed(1)
      : '4.2';

    // Ward breakdown
    const wards = db.prepare('SELECT * FROM wards').all();
    const wardStats = db.prepare(`
      SELECT ward_id,
             COUNT(*) as total,
             SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active
      FROM alarms
      GROUP BY ward_id
    `).all();
    const wardStatsMap = Object.fromEntries(wardStats.map((s) => [s.ward_id, s]));

    const wardDistribution = wards.map((w) => {
      const s = wardStatsMap[w.id] || { total: 0, active: 0 };
      return {
        id: w.id,
        name: w.name,
        shortName: w.short_name,
        total: s.total,
        active: s.active,
      };
    });

    // Severity breakdown
    const severityRows = db.prepare(`
      SELECT severity, COUNT(*) as count
      FROM alarms
      GROUP BY severity
    `).all();

    // Alarm types breakdown
    const typeRows = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM alarms
      GROUP BY type
      ORDER BY count DESC
    `).all();

    // Detected patterns summary
    const patternCount = db.prepare('SELECT COUNT(*) as c FROM detected_patterns').get().c;
    const criticalPatterns = db.prepare("SELECT COUNT(*) as c FROM detected_patterns WHERE severity = 'critical'").get().c;

    return res.json({
      success: true,
      kpis: {
        totalAlarms,
        activeAlarms,
        acknowledgedAlarms: ackAlarms,
        resolvedAlarms: resAlarms,
        criticalAlarms: criticalCount,
        highAlarms: highCount,
        mediumLowAlarms: medLowCount,
        nuisanceRate: Number(nuisanceRate),
        avgResponseTimeMinutes: Number(avgResponseMin),
        detectedPatternsCount: patternCount,
        criticalPatternsCount: criticalPatterns,
      },
      wardDistribution,
      severityDistribution: severityRows,
      typeDistribution: typeRows,
    });
  } catch (err) {
    console.error('Fetch analytics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to compute analytics' });
  }
});

export default router;
