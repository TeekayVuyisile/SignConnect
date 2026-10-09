import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Captions, CaptionsOff, Hand, Keyboard, Loader2, Mic, MicOff, MoreHorizontal, PhoneOff,
  Send, SwitchCamera, Video, VideoOff, Volume2, X,
} from 'lucide-react';
import { useCalls } from '../lib/calls.jsx';
import { useSession } from '../lib/session.jsx';
import { useLocalMedia } from '../hooks/useLocalMedia.js';
import { useWebRTC } from '../hooks/useWebRTC.js';
import { useSpeechCaptions, speechRecognitionSupported } from '../hooks/useSpeechCaptions.js';
import { useSignRecognition, DEMO_VOCABULARY } from '../hooks/useSignRecognition.js';
import { speak, stopSpeaking, ttsSupported } from '../lib/tts.js';
import { Avatar, Switch } from '../components/ui.jsx';

const MAX_FEED = 6;
const pct = (c) => `${Math.round(c * 100)}%`;
const humanLabel = (label) => label.replace(/_/g, ' ').replace('ILoveYou', 'I love you');

function useCallTimer(startedAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  if (!startedAt) return null;
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Keep the phone screen awake during a call. */
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return;
    let lock;
    const acquire = () => navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {});
    acquire();
    const onVis = () => document.visibilityState === 'visible' && acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => {}); };
  }, [active]);
}

function VideoEl({ stream, muted, mirrored, className, videoRef }) {
  const localRef = useRef(null);
  const ref = videoRef ?? localRef;
  useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== stream) el.srcObject = stream ?? null;
  }, [stream, ref]);
  return (
    <video ref={ref} autoPlay playsInline muted={muted}
      className={`${className} ${mirrored ? '-scale-x-100' : ''}`} />
  );
}

function ControlButton({ label, onClick, active, pressed, disabled, danger, icon: Icon }) {
  return (
    <div className="flex w-16 flex-col items-center gap-1.5">
      <button type="button" onClick={onClick} disabled={disabled}
        aria-pressed={pressed}
        aria-label={label}
        className={`flex size-14 items-center justify-center rounded-full transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed
          ${danger ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
            : active ? 'bg-white text-[#06262e] hover:bg-cyan-50'
              : 'bg-white/15 text-white hover:bg-white/25'}`}>
        <Icon className="size-6" aria-hidden="true" />
      </button>
      <span className="text-center text-[0.8rem] font-bold leading-tight text-white/90" aria-hidden="true">{label}</span>
    </div>
  );
}

function FeedEntry({ entry, size }) {
  const mine = entry.who === 'me';
  const SourceIcon = entry.source === 'sign' ? Hand : entry.source === 'text' ? Keyboard : Mic;
  const sourceName = entry.source === 'sign' ? 'sign' : entry.source === 'text' ? 'typed' : 'speech';
  return (
    <li className={mine ? 'opacity-80' : ''}>
      <p className={`flex items-center gap-1.5 text-[0.8rem] font-bold uppercase tracking-wider ${mine ? 'text-emerald-300' : 'text-cyan-200'}`}>
        <SourceIcon className="size-4" aria-hidden="true" />
        <span>{mine ? 'You' : entry.name} · {sourceName}</span>
        {entry.source === 'sign' && (
          <span className="ml-1 inline-flex items-center gap-1.5 normal-case tracking-normal">
            <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
              <span className={`absolute inset-y-0 left-0 rounded-full ${entry.certain ? 'bg-emerald-400' : 'bg-amber-300'}`} style={{ width: pct(entry.confidence) }} />
            </span>
            <span>{pct(entry.confidence)} sure</span>
          </span>
        )}
      </p>
      <p className={`caption-${size} leading-snug text-white ${entry.final === false ? 'text-white/80' : ''}`}>
        {entry.source === 'sign' && !entry.certain
          ? <><span className="italic text-amber-200">Possibly: </span>{entry.text}</>
          : entry.text}
        {entry.final === false && <span aria-hidden="true">…</span>}
      </p>
    </li>
  );
}

function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-text md:rounded-3xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="btn -mr-2 px-0 text-muted hover:bg-surface-2" autoFocus>
            <X className="size-6" aria-hidden="true" /><span className="sr-only">Close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Call() {
  const navigate = useNavigate();
  const { preferences: prefs } = useSession();
  const { call, endCall, resetCall, sendSignal, subscribeSignals } = useCalls();
  const { phase, peer, role } = call;
  const inCall = phase === 'outgoing' || phase === 'active';

  // Nothing to show (e.g. page refreshed): go home.
  useEffect(() => { if (phase === 'idle') navigate('/app', { replace: true }); }, [phase, navigate]);

  const media = useLocalMedia(inCall);
  useWakeLock(phase === 'active');

  const [feed, setFeed] = useState([]);
  const [showCaptions, setShowCaptions] = useState(prefs.show_captions);
  const [signOn, setSignOn] = useState(prefs.sign_translation);
  const [ttsOn, setTtsOn] = useState(prefs.text_to_speech && ttsSupported);
  const [transcribeOn, setTranscribeOn] = useState(prefs.communication_mode === 'speech' && speechRecognitionSupported);
  const [peerMedia, setPeerMedia] = useState({ camOn: true, micOn: true });
  const [sheet, setSheet] = useState(null); // 'more' | 'type' | null
  const [draft, setDraft] = useState('');
  const [issueDismissed, setIssueDismissed] = useState(false);

  const ttsRef = useRef(ttsOn);
  ttsRef.current = ttsOn;
  const peerName = peer?.name?.split(' ')[0] ?? 'Them';

  const upsert = useCallback((entry) => {
    setFeed((f) => {
      const i = f.findIndex((e) => e.id === entry.id);
      if (i >= 0) { const next = f.slice(); next[i] = { ...f[i], ...entry }; return next; }
      return [...f, entry].slice(-MAX_FEED);
    });
  }, []);

  const onMessage = useCallback((msg) => {
    const base = { who: 'them', name: peerName };
    if (msg.type === 'caption') upsert({ ...base, id: `t-${msg.id}`, source: 'speech', text: msg.text, final: msg.final });
    else if (msg.type === 'sign') {
      upsert({ ...base, id: `t-${msg.id}`, source: 'sign', text: msg.text, confidence: msg.confidence, certain: msg.certain });
      if (ttsRef.current) speak(msg.certain ? msg.text : `Possibly: ${msg.text}`);
    } else if (msg.type === 'text') {
      upsert({ ...base, id: `t-${msg.id}`, source: 'text', text: msg.text });
      if (ttsRef.current) speak(msg.text);
    } else if (msg.type === 'media') setPeerMedia({ camOn: msg.camOn, micOn: msg.micOn });
  }, [peerName, upsert]);

  const rtc = useWebRTC({
    enabled: phase === 'active',
    role,
    localStream: media.stream,
    mediaReady: media.status === 'ready',
    sendSignal,
    subscribeSignals,
    onMessage,
  });

  // Let the other side know when we turn the camera/mic off.
  const { send: rtcSend, state: rtcState } = rtc;
  useEffect(() => {
    if (rtcState === 'connected') rtcSend({ type: 'media', camOn: media.camOn && media.hasVideo, micOn: media.micOn && media.hasAudio });
  }, [rtcState, rtcSend, media.camOn, media.micOn, media.hasVideo, media.hasAudio]);

  // ---- Speech → captions (runs on the speaker's device) ----
  const speechStatus = useSpeechCaptions({
    enabled: phase === 'active' && transcribeOn && media.micOn && media.hasAudio,
    onResult: ({ id, text, final }) => {
      upsert({ id: `m-${id}`, who: 'me', source: 'speech', text, final });
      rtc.send({ type: 'caption', id, text, final });
    },
  });

  // ---- Signs → text (on-device) ----
  const selfVideoRef = useRef(null);
  const overlayRef = useRef(null);
  const signCount = useRef(0);
  const sign = useSignRecognition({
    enabled: inCall && signOn && media.hasVideo && media.camOn,
    videoRef: selfVideoRef,
    canvasRef: overlayRef,
    onSign: ({ phrase, confidence, certain }) => {
      const id = `sign-${++signCount.current}`;
      upsert({ id: `m-${id}`, who: 'me', source: 'sign', text: phrase, confidence, certain });
      rtc.send({ type: 'sign', id, text: phrase, confidence, certain });
    },
  });

  const sendTyped = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const id = `text-${Date.now()}`;
    upsert({ id: `m-${id}`, who: 'me', source: 'text', text });
    rtc.send({ type: 'text', id, text });
    setDraft('');
    setSheet(null);
  };

  const flip = async () => {
    const track = await media.flipCamera();
    if (track) await rtc.replaceVideoTrack(track);
  };

  const hangUp = () => { stopSpeaking(); endCall(); };
  const leave = () => { resetCall(); navigate('/app', { replace: true }); };

  const feedRef = useRef(null);
  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' }); }, [feed]);

  const timer = useCallTimer(phase === 'active' ? call.startedAt : null);
  const remoteHasVideo = !!rtc.remoteStream?.getVideoTracks().length && peerMedia.camOn;
  const visibleFeed = showCaptions ? feed : feed.filter((e) => e.who === 'me');
  const selfMirrored = media.facing === 'user';

  if (phase === 'idle') return null;

  if (phase === 'ended') {
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-[#06171c] px-6 text-center text-white">
        <Avatar name={peer?.name ?? '?'} size="lg" />
        <div>
          <h1 className="text-3xl font-bold">{peer?.name}</h1>
          <p className="mt-2 text-xl text-cyan-100" role="status">{call.message}</p>
        </div>
        <button onClick={leave} className="btn bg-white px-8 text-lg text-[#06262e] hover:bg-cyan-50" autoFocus>Back to contacts</button>
      </main>
    );
  }

  const statusText = media.status === 'requesting' ? 'Waiting for camera and microphone permission…'
    : phase === 'outgoing'
    ? (call.callId ? `Calling ${peerName}…` : 'Connecting…')
    : rtc.state === 'connected' ? null
      : rtc.state === 'reconnecting' ? 'Connection unstable. Reconnecting…'
        : rtc.state === 'failed' ? 'Couldn’t connect. Your network may block direct calls.'
          : 'Connecting…';

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#06171c] text-white" aria-label={`Call with ${peer?.name}`}>
      {/* Remote video, or their avatar when there's no picture */}
      {rtc.remoteStream && (
        <VideoEl stream={rtc.remoteStream} className={`absolute inset-0 size-full object-cover md:object-contain ${remoteHasVideo ? '' : 'invisible'}`} />
      )}
      {!remoteHasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pb-40">
          <span className={phase === 'outgoing' ? 'ring-pulse rounded-full' : ''}><Avatar name={peer?.name ?? '?'} size="xl" /></span>
          {phase === 'active' && rtc.state === 'connected' && (
            <p className="flex items-center gap-2 font-bold text-white/85"><VideoOff className="size-5" aria-hidden="true" />{peerName}’s camera is off</p>
          )}
        </div>
      )}

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0 pr-32 md:pr-56">
          <h1 className="truncate text-2xl font-bold">{peer?.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {timer && (
              <span className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 font-bold tabular-nums">
                <span className="size-2.5 rounded-full bg-[#F87171]" aria-hidden="true" />
                <span className="sr-only">Call time</span>Live {timer}
              </span>
            )}
            {!peerMedia.micOn && phase === 'active' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 font-bold"><MicOff className="size-4" aria-hidden="true" />Muted</span>
            )}
          </div>
        </div>
        {statusText && (
          <p role="status" className="mt-2 inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 font-bold">
            {rtc.state !== 'failed' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {statusText}
          </p>
        )}
        {media.issue && !issueDismissed && (
          <div role="status" className="mt-3 flex max-w-md items-start gap-2 rounded-2xl bg-amber-100 p-3 pr-2 text-[0.95rem] font-bold text-amber-950">
            <span className="flex-1">{media.issue}</span>
            <button onClick={() => setIssueDismissed(true)} className="-my-1 flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-amber-200">
              <X className="size-5" aria-hidden="true" /><span className="sr-only">Dismiss</span>
            </button>
          </div>
        )}
      </header>

      {/* Self view */}
      <div className="absolute right-3 top-[max(1rem,env(safe-area-inset-top))] z-20 w-28 md:w-48">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-white/40 bg-[#12414d] shadow-xl">
          {media.hasVideo && (
            <>
              <VideoEl videoRef={selfVideoRef} stream={media.stream} muted mirrored={selfMirrored}
                className={`absolute inset-0 size-full object-cover ${media.camOn ? '' : 'invisible'}`} />
              <canvas ref={overlayRef} aria-hidden="true"
                className={`pointer-events-none absolute inset-0 size-full object-cover ${selfMirrored ? '-scale-x-100' : ''}`} />
            </>
          )}
          {(!media.hasVideo || !media.camOn) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-sm font-bold text-white/85">
              <VideoOff className="size-6" aria-hidden="true" />{media.hasVideo ? 'Camera off' : 'No camera'}
            </div>
          )}
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 text-xs font-bold">You</span>
        </div>
        {signOn && media.hasVideo && (
          <p className="mt-2 rounded-xl bg-black/65 px-2 py-1.5 text-center text-[0.8rem] font-bold leading-tight" role="status">
            {sign.status === 'loading' && 'Loading sign AI…'}
            {sign.status === 'error' && 'Sign AI couldn’t load'}
            {sign.status === 'watching' && (sign.live ? `Seeing: ${humanLabel(sign.live.label)} ${pct(sign.live.confidence)}` : 'Watching for signs')}
          </p>
        )}
      </div>

      {/* Captions + translations */}
      <section aria-label="Live captions" className="absolute inset-x-3 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-2xl">
        {visibleFeed.length > 0 ? (
          <ol ref={feedRef} role="log" aria-live="polite" aria-relevant="additions text"
            className="max-h-[38dvh] space-y-3 overflow-y-auto rounded-3xl bg-black/75 p-4 backdrop-blur-sm">
            {visibleFeed.map((e) => <FeedEntry key={e.id} entry={e} size={prefs.caption_size} />)}
          </ol>
        ) : phase === 'active' && rtc.state === 'connected' && (
          <p className="rounded-3xl bg-black/60 px-4 py-3 text-center text-white/85">
            {showCaptions ? 'Captions and sign translations will appear here.' : 'Captions are hidden.'}
          </p>
        )}
        {(speechStatus === 'blocked' || speechStatus === 'error') && transcribeOn && (
          <p role="status" className="mt-2 rounded-2xl bg-amber-100 px-3 py-2 text-[0.95rem] font-bold text-amber-950">
            {speechStatus === 'blocked' ? 'Speech captions are blocked. Allow microphone access for this site.' : 'Speech captions paused. Retrying…'}
          </p>
        )}
      </section>

      {/* Controls */}
      <nav aria-label="Call controls" className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        <div className="mx-auto flex max-w-lg items-start justify-between gap-1">
          <ControlButton label={media.micOn ? 'Mute' : 'Unmute'} icon={media.micOn && media.hasAudio ? Mic : MicOff}
            pressed={!media.micOn} onClick={media.toggleMic} disabled={!media.hasAudio} />
          <ControlButton label={media.camOn ? 'Camera' : 'Camera off'} icon={media.camOn && media.hasVideo ? Video : VideoOff}
            pressed={!media.camOn} onClick={media.toggleCam} disabled={!media.hasVideo} />
          <ControlButton label="Sign AI" icon={Hand} active={signOn && media.hasVideo} pressed={signOn && media.hasVideo}
            onClick={() => setSignOn((v) => !v)} disabled={!media.hasVideo} />
          <ControlButton label="Captions" icon={showCaptions ? Captions : CaptionsOff} active={showCaptions} pressed={showCaptions}
            onClick={() => setShowCaptions((v) => !v)} />
          <ControlButton label="More" icon={MoreHorizontal} onClick={() => setSheet('more')} />
          <ControlButton label={phase === 'outgoing' ? 'Cancel' : 'End'} icon={PhoneOff} danger onClick={hangUp} />
        </div>
      </nav>

      {sheet === 'more' && (
        <Sheet title="Call options" onClose={() => setSheet(null)}>
          <div className="divide-y divide-border">
            <Switch icon={Mic} label="Caption my speech" checked={transcribeOn} disabled={!speechRecognitionSupported || !media.hasAudio}
              description={speechRecognitionSupported ? 'Turn what I say into captions for the other person.' : 'Not supported in this browser.'}
              onChange={setTranscribeOn} />
            <Switch icon={Volume2} label="Read translations aloud" checked={ttsOn} disabled={!ttsSupported}
              description="Speak their signed or typed messages out loud." onChange={(v) => { setTtsOn(v); if (!v) stopSpeaking(); }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-primary" onClick={() => setSheet('type')} disabled={rtc.state !== 'connected'}>
              <Keyboard className="size-5" aria-hidden="true" /> Type a message
            </button>
            <button className="btn-ghost" onClick={() => { flip(); setSheet(null); }} disabled={!media.hasVideo}>
              <SwitchCamera className="size-5" aria-hidden="true" /> Flip camera
            </button>
          </div>
          <details className="mt-5 rounded-2xl bg-surface-2 p-4">
            <summary className="font-bold">Signs Sign AI understands (preview)</summary>
            <p className="mt-2 text-[0.95rem] text-muted">
              Early preview: these are general hand gestures, not SASL signs yet. Hold each one steady for about half a second.
            </p>
            <ul className="mt-3 space-y-1.5">
              {Object.values(DEMO_VOCABULARY).map((v) => (
                <li key={v.phrase} className="flex justify-between gap-3"><span className="font-bold">{v.phrase}</span><span className="text-right text-muted">{v.hint}</span></li>
              ))}
            </ul>
          </details>
        </Sheet>
      )}

      {sheet === 'type' && (
        <Sheet title="Type a message" onClose={() => setSheet(null)}>
          <form onSubmit={sendTyped} className="flex gap-2">
            <label htmlFor="typed" className="sr-only">Message</label>
            <input id="typed" className="field flex-1" value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${peerName}`} autoFocus autoComplete="off" enterKeyHint="send" maxLength={300} />
            <button type="submit" className="btn-primary px-4" disabled={!draft.trim()}>
              <Send className="size-5" aria-hidden="true" /><span className="sr-only">Send</span>
            </button>
          </form>
          <p className="mt-2 text-[0.95rem] text-muted">Shows as a caption for {peerName}{' '}and can be read aloud.</p>
        </Sheet>
      )}
    </main>
  );
}
