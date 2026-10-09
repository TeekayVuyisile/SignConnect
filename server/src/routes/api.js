import { Router } from 'express';
import { db, getPreferences, PREF_FIELDS } from '../db.js';
import { requireAuth } from '../auth.js';
import { isOnline } from '../presence.js';

const router = Router();
router.use(requireAuth);

// ---- Contacts -------------------------------------------------------------

router.get('/contacts', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, p.communication_mode
    FROM contacts c
    JOIN users u ON u.id = c.contact_id
    LEFT JOIN user_preferences p ON p.user_id = u.id
    WHERE c.user_id = ?
    ORDER BY u.name COLLATE NOCASE
  `).all(req.userId);
  res.json(rows.map((r) => ({ ...r, communication_mode: r.communication_mode ?? 'speech', online: isOnline(r.id) })));
});

router.post('/contacts', (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const contact = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
  if (!contact) return res.status(404).json({ error: 'No SignConnect account uses that email. Ask them to sign up first.' });
  if (contact.id === req.userId) return res.status(400).json({ error: 'That’s your own email address.' });

  // Contacts are mutual so either person can call the other.
  const add = db.prepare('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)');
  add.run(req.userId, contact.id);
  add.run(contact.id, req.userId);
  res.status(201).json({ ...contact, communication_mode: getPreferences(contact.id).communication_mode, online: isOnline(contact.id) });
});

router.delete('/contacts/:id', (req, res) => {
  db.prepare('DELETE FROM contacts WHERE user_id = ? AND contact_id = ?').run(req.userId, Number(req.params.id));
  res.status(204).end();
});

// ---- Call history ---------------------------------------------------------

router.get('/calls', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.status, c.started_at, c.answered_at, c.ended_at,
           CASE WHEN c.caller_id = ? THEN 'outgoing' ELSE 'incoming' END AS direction,
           u.id AS peer_id, u.name AS peer_name
    FROM calls c
    JOIN users u ON u.id = CASE WHEN c.caller_id = ? THEN c.callee_id ELSE c.caller_id END
    WHERE c.caller_id = ? OR c.callee_id = ?
    ORDER BY c.started_at DESC, c.id DESC
    LIMIT 50
  `).all(req.userId, req.userId, req.userId, req.userId);
  res.json(rows);
});

// ---- Preferences ----------------------------------------------------------

const VALID = {
  communication_mode: ['sign', 'speech', 'text'],
  caption_size: ['medium', 'large', 'xlarge'],
  theme: ['system', 'light', 'dark'],
};

router.get('/preferences', (req, res) => res.json(getPreferences(req.userId)));

router.put('/preferences', (req, res) => {
  getPreferences(req.userId); // ensures the row exists
  for (const field of PREF_FIELDS) {
    if (!(field in req.body)) continue;
    let value = req.body[field];
    if (VALID[field]) {
      if (!VALID[field].includes(value)) return res.status(400).json({ error: `Invalid value for ${field}.` });
    } else {
      value = value ? 1 : 0;
    }
    db.prepare(`UPDATE user_preferences SET ${field} = ? WHERE user_id = ?`).run(value, req.userId);
  }
  res.json(getPreferences(req.userId));
});

export default router;
