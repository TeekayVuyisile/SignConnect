import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { db } from './db.js';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}
// Dev fallback: a per-process secret, so tokens reset when the server restarts.
const SECRET = process.env.JWT_SECRET ?? randomBytes(32).toString('hex');

export const signToken = (user) =>
  jwt.sign({ sub: user.id, name: user.name }, SECRET, { expiresIn: '7d' });

export const verifyToken = (token) => jwt.verify(token, SECRET);

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
  try {
    req.userId = Number(verifyToken(token).sub);
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
  // Tokens outlive deleted accounts, so confirm the user still exists.
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(req.userId)) {
    return res.status(401).json({ error: 'This account no longer exists.' });
  }
  next();
}

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
