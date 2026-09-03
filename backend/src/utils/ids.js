import crypto from 'node:crypto';

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function randomFromAlphabet(alphabet, length) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/** Short human-facing order reference, e.g. "FB-7GK4QP". Not guaranteed unique on its own. */
export function generateOrderReference() {
  return `FB-${randomFromAlphabet(REFERENCE_ALPHABET, 6)}`;
}

/** Long, unguessable token used in the guest order-tracking URL. */
export function generateTrackingToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export function slugify(text) {
  return text
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
