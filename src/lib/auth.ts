// Admin authentication. Compares submitted password against a bcrypt
// hash stored in ADMIN_PASSWORD_HASH. For backwards compatibility we
// still accept ADMIN_PASSWORD as plaintext (with a warning); generate
// a proper hash with `npm run admin:hash` and remove the plaintext.

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'delphine_admin';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ?? 'dev-only-change-me-in-production';

export async function verifyAdminPassword(submitted: string): Promise<boolean> {
  if (!submitted) return false;

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) {
    try {
      return await bcrypt.compare(submitted, hash);
    } catch {
      return false;
    }
  }

  const plain = process.env.ADMIN_PASSWORD;
  if (plain) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[delphine/auth] WARNING: using plaintext ADMIN_PASSWORD in production. ' +
          'Run `npm run admin:hash` and set ADMIN_PASSWORD_HASH instead.',
      );
    }
    // Constant-time compare to avoid timing attacks.
    const a = Buffer.from(submitted, 'utf8');
    const b = Buffer.from(plain, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  return false;
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL ?? 'admin@delphineswimwear.com';
}

export function getAdminNotificationEmail(): string {
  return (
    process.env.ADMIN_NOTIFICATION_EMAIL ??
    process.env.ADMIN_EMAIL ??
    'admin@delphineswimwear.com'
  );
}

// HMAC-signed cookie token: <email>.<issuedAt>.<sig>
// We split from the RIGHT (rsplit) to avoid breaking when the email
// itself contains dots (e.g. admin@delphineswimwear.com). Naively
// splitting on '.' would yield 5 parts for that input.
export function createAdminToken(email: string): string {
  const issuedAt = Date.now();
  const payload = `${email}.${issuedAt}`;
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string | undefined): string | null {
  if (!token) return null;
  // rsplit by last two dots: <email>.<issuedAt>.<sig>
  // The email may itself contain dots; only the trailing two segments
  // are the issuedAt timestamp and signature.
  const lastDot = token.lastIndexOf('.');
  if (lastDot < 0) return null;
  const sig = token.slice(lastDot + 1);
  const rest = token.slice(0, lastDot);
  const secondLastDot = rest.lastIndexOf('.');
  if (secondLastDot < 0) return null;
  const issuedAt = rest.slice(secondLastDot + 1);
  const email = rest.slice(0, secondLastDot);
  if (!email || !issuedAt || !sig) return null;

  const payload = `${email}.${issuedAt}`;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  let valid = false;
  try {
    valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch {
    return null;
  }
  if (!valid) return null;
  const age = Date.now() - parseInt(issuedAt, 10);
  if (Number.isNaN(age) || age > COOKIE_MAX_AGE * 1000) return null;
  return email;
}

export function attachAdminCookie(res: Response, email: string): Response {
  const token = createAdminToken(email);
  res.headers.append(
    'Set-Cookie',
    [
      `${COOKIE_NAME}=${token}`,
      `Path=/`,
      `Max-Age=${COOKIE_MAX_AGE}`,
      `HttpOnly`,
      `SameSite=Lax`,
      process.env.NODE_ENV === 'production' ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; '),
  );
  return res;
}

export function detachAdminCookie(res: Response): Response {
  res.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
  );
  return res;
}

export async function readAdminEmailFromCookie(): Promise<string | null> {
  const c = await cookies();
  return verifyAdminToken(c.get(COOKIE_NAME)?.value);
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
