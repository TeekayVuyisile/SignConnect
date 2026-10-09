// userId -> Set of connected socket ids (a user may have several tabs/devices).
const sockets = new Map();

export function addSocket(userId, socketId) {
  if (!sockets.has(userId)) sockets.set(userId, new Set());
  sockets.get(userId).add(socketId);
  return sockets.get(userId).size === 1; // true when the user just came online
}

export function removeSocket(userId, socketId) {
  const set = sockets.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    sockets.delete(userId);
    return true; // user went offline
  }
  return false;
}

export const isOnline = (userId) => sockets.has(userId);
