// ICE servers for WebRTC. Free public STUN servers let most calls connect
// directly; some strict mobile-data networks also need a TURN relay, which can be
// supplied (from any provider) via ICE_SERVERS without code changes.
const STUN_ONLY = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];

export function getIceServers() {
  if (!process.env.ICE_SERVERS) return STUN_ONLY;
  try { return JSON.parse(process.env.ICE_SERVERS); } catch {
    console.warn('ICE_SERVERS is not valid JSON; using STUN only');
    return STUN_ONLY;
  }
}
