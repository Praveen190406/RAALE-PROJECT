import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { initDatabase, db } from './database.js';

import authRouter from './routes/auth.js';
import alarmsRouter from './routes/alarms.js';
import patientsRouter from './routes/patients.js';
import wardsRouter from './routes/wards.js';
import drugsRouter from './routes/drugs.js';
import patternsRouter from './routes/patterns.js';
import analyticsRouter from './routes/analytics.js';
import reportsRouter from './routes/reports.js';
import validationRouter from './routes/validation.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Database schema and seeds
initDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Standard CORS configuration
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logger in dev mode
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.url.startsWith('/api')) {
        console.log(`[API] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });
}

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/alarms', alarmsRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/wards', wardsRouter);
app.use('/api/drugs', drugsRouter);
app.use('/api/patterns', patternsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/validation', validationRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    const alarmCount = db.prepare('SELECT COUNT(*) as c FROM alarms').get().c;
    const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    return res.json({
      status: 'ok',
      service: 'Clinical Medication Alarm Monitoring & Pattern Analysis API',
      version: '2.0.0',
      database: 'connected (node:sqlite)',
      stats: {
        totalAlarms: alarmCount,
        registeredUsers: userCount,
      },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Serve static frontend files if production build exists
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🏥 Clinical Alarm Monitoring API Server Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`💾 Database: SQLite (server/data/clinical_alarm.db)`);
  console.log(`================================================================`);
});

export default server;
