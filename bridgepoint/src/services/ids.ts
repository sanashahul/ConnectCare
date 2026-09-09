const REFERENCE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/**
 * Unguessable token for partner status-update links.
 * Uses crypto when available so links are not predictable from a timestamp.
 */
export function generateToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Short reference a staff member can read aloud on the phone. */
export function generateReference(): string {
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += REFERENCE_CHARS.charAt(Math.floor(Math.random() * REFERENCE_CHARS.length));
  }
  return `BP-${out}`;
}
