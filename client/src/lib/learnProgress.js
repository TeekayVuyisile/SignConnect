// Which demo signs this viewer has had recognised in practice. A per-device
// convenience only, so it lives in localStorage and is safe to lose.
const KEY = 'sc-learned-signs';

export function readLearned() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); }
}

export function saveLearned(set) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* private mode */ }
}
