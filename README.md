# SignConnect

Real-time accessible video calling: each person signs, speaks or types, and the other
person reads live captions or sign translations (or hears them read aloud).

Built in phases, following [`New project.txt`](New%20project.txt). This build covers:

| Phase | What | Status |
|---|---|---|
| 1 | Accounts, contacts, accessibility preferences | Done |
| 2 | 1-to-1 WebRTC video calls (P2P, Socket.IO signaling) | Done |
| 3 | Live speech → captions (browser speech recognition, sent P2P) | Done |
| 4–5 | Sign → text during calls | **Preview**: MediaPipe gestures mapped to 7 phrases, on-device |
| 6 | Text → speech | Done (sign + typed messages read aloud) |
| 7 | SASL dataset + custom model | Next |

Design system: generated with the **ui-ux-pro-max** skill, see
[`design-system/signconnect/MASTER.md`](design-system/signconnect/MASTER.md)
("Accessible & Ethical" style, Atkinson Hyperlegible, cyan/emerald darkened for WCAG AA).

## Run it locally

Requires Node 22.13+.

```bash
npm install
npm run dev          # server :4010 + client http://localhost:5180
```

The laptop works without a camera: it joins calls receive-only and shows an avatar tile.

## Test on your phone (same Wi-Fi)

Phones only allow camera/mic on **HTTPS**, so use:

```bash
npm run dev:https
```

Vite prints a `Network: https://192.168.x.x:5180` URL. Open it on the phone, accept the
self-signed certificate warning ("Advanced → Proceed"), sign up, and allow camera + mic.
Then open the same URL on the laptop with a second account, add each other as
contacts, and call. If Windows Firewall asks, allow Node on private networks.

## Deploy (free)

`render.yaml` is a Render Blueprint with two free services:

| Service | What | Why |
|---|---|---|
| `signconnect-app` (static site) | The app people visit | Served from a CDN and never sleeps, so it loads instantly |
| `signconnect` (web service) | API + call signaling | Free instances sleep when idle and take up to a minute to wake |

On load the app pings `/api/health` and shows a "Waking up the demo server…" notice only
if the API is asleep. **`/demo`** (sign recognition practice) needs no account or server, so
visitors can try it while the API wakes.

The two services need each other's public URL: `VITE_API_URL` on the static site and
`CLIENT_ORIGINS` (comma-separated, used for CORS) on the API. Update both in `render.yaml` if
your URLs differ.

Notes:
- **SQLite on free hosts is wiped on redeploy.** Fine for demos; use a persistent disk or move to PostgreSQL for real use.
- **Mobile data:** calls use free public STUN servers, which connect most networks directly.
  Some strict mobile-data networks need a TURN relay. To add one later, set `ICE_SERVERS` to
  a JSON array of ICE servers from any provider. No code change is needed.

## Learn & practice

- **Learn tab** (`/app/learn`): each demo sign as an animated SVG hand-shape (Motion), with steps
  and a camera tip, plus the planned SASL modules.
- **Practice** (`/practice`): uses your camera with on-device recognition. *Guided* mode gives you
  a sign to make and ticks it off when recognised; *Free play* shows whatever you sign, just as a
  call would. This is the quickest way to test sign AI on one phone.
- Signs live in `client/src/lib/signVocabulary.js`. Each has `media: { kind: 'handshape' }`
  (animated SVG, which suits static handshapes and fingerspelling) or `media: { kind: 'video' }`
  (planned for real SASL signs, recorded by Deaf signers, since movement and facial
  expression carry meaning).

## How it fits together

```
client/ (React + Vite + Tailwind v4)
  lib/calls.jsx            socket, presence, call state machine (ringing works on every screen)
  hooks/useLocalMedia.js   camera/mic with graceful fallback: A+V → audio → none
  hooks/useWebRTC.js       peer connection + "captions" data channel
  hooks/useSpeechCaptions  Web Speech API, interim results, auto-restart (lang en-ZA)
  hooks/useSignRecognition MediaPipe GestureRecognizer, on-device, stabilised over 10 frames
  pages/Call.jsx           call UI: captions log (aria-live), confidence bars, controls
server/ (Express + Socket.IO + node:sqlite)
  signaling.js             invite/accept/decline/end, 45 s ring timeout, SDP/ICE relay only
  routes/                  auth (bcrypt + JWT), contacts, call history, preferences
```

Media and caption text never pass through the server. Speech captions are produced on
the speaker's device, sign recognition on the signer's device, and both are sent over the
WebRTC data channel.

## Honest limits

- The sign vocabulary is generic hand gestures (open palm = "Hello", thumbs up = "Yes", …),
  **not SASL**. Results under 75% confidence are shown as "Possibly: …".
- Speech captions depend on browser support (Chrome, Edge, Safari). Firefox has none. Some
  Android devices can't run speech recognition and a WebRTC call on the mic at the same time.
