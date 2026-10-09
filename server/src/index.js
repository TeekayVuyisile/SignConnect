import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import { attachSignaling } from './signaling.js';
import { requireAuth } from './auth.js';
import { getIceServers } from './ice.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));

// The frontend can be hosted separately (a static site that never sleeps), so
// allow its origin. Auth uses bearer tokens, not cookies, so no credentials mode.
const clientOrigins = (process.env.CLIENT_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && clientOrigins.includes(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/ice', requireAuth, (_req, res) => res.json(getIceServers()));

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// In production, serve the built React app from the same origin.
const clientDist = join(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '1h', index: false }));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

const server = createServer(app);
attachSignaling(server, clientOrigins);

const port = Number(process.env.PORT ?? 4010);
server.listen(port, () => console.log(`SignConnect server listening on http://localhost:${port}`));
