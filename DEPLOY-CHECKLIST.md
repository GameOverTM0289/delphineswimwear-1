# Deployment Checklist — Delphine Swimwear

A single run-through to get from this repo to a live, secure store. Pair this
with `POK-SETUP.md` (payment specifics) and `LAUNCH.md` (general launch notes).

## 0. Before anything: rotate exposed secrets

If any secret was ever pasted into chat, email, or committed to git, rotate it:
- POK API key (create a new one, delete the old)
- Neon database password
- Resend API key
- Upstash REST token
- `ADMIN_SESSION_SECRET` (regenerate: `openssl rand -base64 32`)

Never commit `.env`. Only `.env.example` is in the repo (it has no real values).

## 1. Environment variables (Vercel → Settings → Environment Variables)

Set every key from `.env.example`. The must-haves for a working store:

- `DATABASE_URL` — Neon Postgres connection string
- `NEXT_PUBLIC_SITE_URL` — your real domain, absolute https, **no trailing slash, no stray quotes**
- `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (run `npm run admin:hash`), `ADMIN_SESSION_SECRET`
- `RESEND_API_KEY`, `EMAIL_FROM` (on a verified domain)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (rate limiting)
- `POK_KEY_ID`, `POK_KEY_SECRET`, `POK_MERCHANT_ID`, `POK_ENV`
  - ⚠️ exact names with the `POK_` prefix — see POK-SETUP.md

## 2. Database

```
npm run db:push     # create tables from prisma/schema.prisma
npm run db:seed     # load the 5 products + per-size stock
```

Re-running `db:seed` is safe (idempotent) and removes stale products.

## 3. Deploy

Push to the branch connected to Vercel, or `vercel --prod`. The build runs
`prisma generate && next build` automatically.

## 4. Smoke test the live site

- Home, shop, product pages load; images render.
- Place a test order (see §5 for the €1 method) and confirm the POK redirect.
- Admin: log in at `/admin`, view the order, change status, see the email.

## 5. End-to-end payment + refund test (the €1 method)

Lets you test real money flow cheaply, OR use `POK_ENV=staging` for zero-cost.

1. **Lower a product price to €1**: Admin → Products → pick one → set price to
   `1` → Save. (Authoritative pricing means checkout will charge exactly €1.)
   ⚠️ Use whole euros — **POK only charges whole-euro amounts, €1 minimum**. A
   fractional price like €0.10 or €0.50 is rejected at checkout with a clear
   message (no charge, no broken order). Don't test with sub-€1 amounts.
2. **Place a real order** for that product through the storefront. Complete
   payment on the POK page with your card.
3. **Verify payment**:
   - You're redirected to `/order/{id}?paid=1`.
   - Within a few seconds the order page shows **Payment Received** (the order
     page reconciles with POK on load, so this works even if the webhook never
     fires).
   - You receive the order-confirmation email. (In live mode this email is sent
     only after payment is confirmed — never on an abandoned checkout.)
   - The POK dashboard shows the order as completed; the admin order page shows
     both your order number and POK's order ID side by side.
4. **Refund it**: Admin → Orders → open the order → **Refund** section →
   **Refund order** → confirm. The order flips to **payment: refunded /
   status: cancelled**, the customer gets the refund email, and POK shows the
   refund.
5. **Test a failed payment** (optional): start a payment and cancel on POK's
   page → you land on `/order/{id}?failed=1`, which shows **"Payment failed"**
   (not "Thank you") and explains no charge was made.
6. **Restore the price** back to its real value in Admin → Products → Save.

> `POK_ENV=staging` does NOT charge real money (needs staging credentials).
> `POK_ENV=production` with a real card IS a real charge — the €1 + immediate
> refund keeps it trivial.

## 6. Security posture (already implemented — verify)

- ✅ Admin cookie is HMAC-signed, HttpOnly, Secure, SameSite=Lax, 7-day expiry;
  fails closed without `ADMIN_SESSION_SECRET`.
- ✅ Password stored as bcrypt hash; login rate-limited 5/15min with constant-
  time comparison + delay on failure.
- ✅ All `/api/admin/*` and the refund route require the admin cookie.
- ✅ Pricing is server-authoritative — the browser cannot set the price.
- ✅ Stock decrement is race-safe (conditional update — no overselling the last
  unit under concurrent orders).
- ✅ Payment webhook re-verifies with POK's API (never trusts the POST body),
  checks the amount, and is idempotent.
- ✅ Security headers (CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-
  Policy, Permissions-Policy); `x-powered-by` removed.
- ✅ Order/checkout/admin pages disallowed in robots.txt.
- ✅ Order + contact + newsletter forms rate-limited, Zod-validated, honeypot.

## 7. Post-launch

- Monitor the first few real orders end-to-end.
- Confirm Resend domain is verified (DKIM/SPF) so emails don't land in spam.
- Consider Neon's paid tier before volume grows (point-in-time backups).
