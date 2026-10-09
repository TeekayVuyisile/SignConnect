import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import { attachSignaling } from './signaling.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ICE servers are configurable so a TURN server can be added for mobile
// networks where direct peer-to-peer connections are blocked.
app.get('/api/ice', (_req, res) => {
  let servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (process.env.ICE_SERVERS) {
    try { servers = JSON.parse(process.env.ICE_SERVERS); } catch { console.warn('ICE_SERVERS is not valid JSON; using STUN only'); }
  }
  res.json(servers);
});

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
attachSignaling(server);

const port = Number(process.env.PORT ?? 4010);
server.listen(port, () => console.log(`SignConnect server listening on http://localhost:${port}`));
