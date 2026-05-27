// Resend client wrapper. If RESEND_API_KEY isn't set, every send is a
// no-op (logged) so dev environments work and production never throws.

import { Resend } from 'resend';

interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

let cached: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (cached) return cached;
  cached = new Resend(key);
  return cached;
}

export const FROM = (() => {
  const addr = process.env.EMAIL_FROM ?? 'contact@delphineswimwear.com';
  const name = process.env.EMAIL_FROM_NAME ?? 'Delphine';
  return `${name} <${addr}>`;
})();

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const client = getClient();
  if (!client) {
    console.log(`[email] (skipped — no RESEND_API_KEY) → ${Array.isArray(args.to) ? args.to.join(', ') : args.to}: ${args.subject}`);
    return { ok: true, id: 'skipped' };
  }
  try {
    const res = await client.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    });
    if (res.error) {
      console.error('[email] resend error:', res.error);
      return { ok: false, error: String(res.error.message ?? res.error) };
    }
    return { ok: true, id: res.data?.id };
  } catch (err) {
    console.error('[email] send failed:', err);
    return { ok: false, error: String(err) };
  }
}

export const EMAIL_ENABLED = Boolean(process.env.RESEND_API_KEY);
