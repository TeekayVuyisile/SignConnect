import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, getPreferences } from '../db.js';
import { signToken, requireAuth, publicUser } from '../auth.js';
import { disconnectUser } from '../signaling.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');
  const mode = ['sign', 'speech', 'text'].includes(req.body.communication_mode)
    ? req.body.communication_mode : 'speech';

  const errors = {};
  if (name.length < 2) errors.name = 'Enter your name (at least 2 characters).';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (password.length < 8) errors.password = 'Use at least 8 characters.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.', fields: { email: 'This email is already registered.' } });
  }

  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, bcrypt.hashSync(password, 10));
  const id = Number(lastInsertRowid);

  // Sign-first users get sign translation and captions on by default.
  db.prepare(`INSERT INTO user_preferences (user_id, communication_mode, sign_translation, show_captions)
              VALUES (?, ?, ?, 1)`).run(id, mode, mode === 'sign' ? 1 : 0);

  const user = { id, name, email };
  res.status(201).json({ token: signToken(user), user, preferences: getPreferences(id) });
});

router.post('/login', (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(String(req.body.password ?? ''), user.password_hash)) {
    return res.status(401).json({ error: 'That email and password don’t match an account.' });
  }
  res.json({ token: signToken(user), user: publicUser(user), preferences: getPreferences(user.id) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  res.json({ user, preferences: getPreferences(user.id) });
});

// Permanently delete the signed-in account. Preferences, contacts (both directions)
// and call history are removed by ON DELETE CASCADE.
router.delete('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  if (!bcrypt.compareSync(String(req.body?.password ?? ''), user.password_hash)) {
    return res.status(401).json({ error: 'That password is incorrect.', fields: { password: 'That password is incorrect.' } });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);
  disconnectUser(req.userId);
  res.status(204).end();
});

export default router;
