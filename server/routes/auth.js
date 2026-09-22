import express from 'express';
import { db } from '../database.js';
import { hashPassword, verifyPassword, signToken, authenticateToken } from '../auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 */
router.post('/register', (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }

    const userId = `USR-${Date.now().toString().slice(-4)}`;
    const userRole = role || 'Ward Doctor';
    const { salt, hash } = hashPassword(password);
    const now = Date.now();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, password_salt, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name.trim(), cleanEmail, hash, salt, userRole, now);

    const userPayload = { id: userId, name: name.trim(), email: cleanEmail, role: userRole };
    const token = signToken(userPayload);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: userPayload,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during registration' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const valid = verifyPassword(password, user.password_salt, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    const token = signToken(userPayload);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userPayload,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    console.error('Auth verification error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
