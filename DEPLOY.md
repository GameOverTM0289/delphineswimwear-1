# Deploying to Vercel — step by step

A 5-minute checklist. Follow it in order.

---

## 1. Get a Postgres database URL

Pick one — Neon is the simplest free option:

- **Neon** → neon.tech → sign up → create project (region close to you) → copy the **pooled** connection string
- **Vercel Postgres** → on your Vercel project → Storage → Create → Postgres
- **Supabase** → supabase.com → Settings → Database → URI

The URL must end with `?sslmode=require` (Neon adds this automatically).

## 2. Push code to GitHub

```bash
cd delphine
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/delphine.git
git push -u origin main
```

## 3. Import on Vercel

1. vercel.com → **Add New** → **Project** → import the GitHub repo.
2. **Framework Preset** auto-detects Next.js. Leave defaults.
3. **Don't click Deploy yet** — open the **Environment Variables** section first.

## 4. Add environment variables (this is the step that breaks deploys when missed)

In the Vercel **Environment Variables** section, add the following. Set each one for **all three environments** (Production, Preview, Development).

### Required to launch

| Variable | Value |
|---|---|
| `DATABASE_URL` | The Postgres connection string from step 1 |
| `ADMIN_EMAIL` | The admin login email, e.g. `you@delphine.com` |
| `ADMIN_PASSWORD_HASH` | Run `npm run admin:hash` locally and paste the hash (preferred) |
| `ADMIN_SESSION_SECRET` | Run `openssl rand -base64 32` and paste. **Login is disabled in production until this is set.** |
| `NEXT_PUBLIC_SITE_URL` | Your live origin, e.g. `https://delphineswimwear.com` (no trailing slash). Used for emails, sitemap, and POK redirect/webhook URLs |
| `RESEND_API_KEY` | From resend.com. Without it, **no emails send** (order confirmations, contact, newsletter) |
| `EMAIL_FROM` | The verified sender, e.g. `contact@delphineswimwear.com` (domain must be verified in Resend) |
| `UPSTASH_REDIS_REST_URL` | From upstash.com. Without it, **rate limiting is disabled** |
| `UPSTASH_REDIS_REST_TOKEN` | From upstash.com (same Redis database) |

> `ADMIN_PASSWORD` (plaintext) still works as a fallback if you skip the hash, but the hash is strongly preferred. Set one or the other — not both.

### Optional

| Variable | Value |
|---|---|
| `EMAIL_FROM_NAME` | Sender display name (defaults to `Delphine`) |
| `ADMIN_NOTIFICATION_EMAIL` | Where contact-form messages are sent (defaults to `ADMIN_EMAIL`) |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 id, e.g. `G-XXXXXXX`. The cookie-consent banner shows and GA loads only after the visitor accepts |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error monitoring (optional) |

### POK payments — leave empty until you have your keys (see the POK section at the bottom)

| Variable | Value |
|---|---|
| `POK_KEY_ID` | POK API key id |
| `POK_KEY_SECRET` | POK API key secret |
| `POK_MERCHANT_ID` | Your POK merchant id |
| `POK_ENV` | `production` or `staging` (defaults to `production`) |
| `POK_WEBHOOK_SECRET` | Secret for verifying webhook signatures (when POK provides one) |
| `POK_AUTH_RAW` | Set to `1` only if POK rejects the `Bearer` auth header (see POK section) |

Click **Save**, then **Deploy**.

## 5. After the first deploy succeeds, push the schema

Open a terminal locally with `DATABASE_URL` set to the same prod URL:

```bash
# in the project folder
DATABASE_URL="<paste-prod-url-here>" npx prisma db push
DATABASE_URL="<paste-prod-url-here>" npm run db:seed
```

This creates the tables and seeds the 6 products. Refresh your Vercel site — products should now load from the DB.

## 6. Log in to admin

Visit `https://your-app.vercel.app/admin/login` — sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in step 4.

---

## Common deploy problems & fixes

### "Type error: Conversion of type 'Prisma__OrderClient<...>' may be a mistake"
Should not happen anymore — `src/lib/db/orders.ts` uses two-step `as unknown as` casts. If you somehow see it, run `npm install` locally to regenerate Prisma's types and try again.

### "Cannot find module '@prisma/client'" at runtime
The build script generates the Prisma client: `"build": "prisma generate && next build"`
(it does — don't change it). Note `npm install` runs with `--ignore-scripts`, so
generation happens in the build step, not a postinstall hook.

### "PrismaClientInitializationError: connect ECONNREFUSED" on a route
Your `DATABASE_URL` is missing or invalid in Vercel env vars. Site still loads via static fallback, but orders/contact/admin won't work until you set it.

### Admin login returns 200 but the next page still shows the login form
Browser is rejecting the cookie. Make sure your site is on **HTTPS** (Vercel does this automatically) and you visit via that HTTPS URL — not the IP.

### Schema changes you make later
After editing `prisma/schema.prisma`:
```bash
DATABASE_URL="<prod-url>" npx prisma db push
```

### Need to check what's in the DB
```bash
DATABASE_URL="<prod-url>" npm run db:studio
```
Opens Prisma Studio on `localhost:5555` — visual table browser.

---

## Turning on POK payments (when you have your keys)

The POK integration is **already implemented** in `src/lib/payment.ts` and
`src/app/api/payment/route.ts` against POK's documented REST API
(`https://api.pokpay.io`, staging `https://api-staging.pokpay.io`). It is dormant
until the keys below are set; before that, orders are saved and the customer
lands on the order page marked "Awaiting Payment".

The flow it implements:

1. Customer places the order → we `POST /auth/sdk/login` with your key id/secret to get a token.
2. We `POST /merchants/{merchantId}/sdk-orders` with the amount, `redirectUrl`, `webhookUrl`, and `merchantCustomReference` (our order number).
3. We redirect the customer to POK's `confirmUrl` to pay.
4. POK redirects them back to `/order/{id}?paid=1` and POSTs the order to our webhook.
5. The webhook (`/api/payment`) marks the order paid after authenticating it.

### Steps to go live

1. **Get credentials** from your POK merchant dashboard: key id, key secret, merchant id.
2. **Set env vars** in Vercel (all environments):
   - `POK_KEY_ID`, `POK_KEY_SECRET`, `POK_MERCHANT_ID`
   - `POK_ENV=staging` first (test), then `production` when ready
   - Make sure `NEXT_PUBLIC_SITE_URL` is your real https origin — POK uses it for the redirect and webhook URLs.
3. **Register the webhook URL** with POK if they require allow-listing: `https://your-domain.com/api/payment`. (We also pass it per-order as `webhookUrl`.)
4. **Redeploy.** Place a test order on staging and confirm the order flips to `paid` in `/admin`.

### Two things to confirm with POK, then adjust one line each if needed

- **Auth header format.** We send `Authorization: Bearer <token>`. If POK returns 401, set `POK_AUTH_RAW=1` to send the bare token instead (their PHP SDK sends it without the `Bearer` prefix).
- **Webhook signature.** POK's published SDK doesn't document the signing scheme yet, so the webhook is currently authenticated by a strong cross-check: the POK order id in the webhook must match the id we stored when creating the order, **and** the amount must match. This already blocks forged webhooks. When POK gives you the signature header name + algorithm:
  1. Set `POK_WEBHOOK_SECRET` in Vercel.
  2. Confirm the header name in `src/app/api/payment/route.ts` (currently `x-pok-signature`) and the HMAC algorithm in `verifyPokWebhook()` in `src/lib/payment.ts` (currently HMAC-SHA256 of the raw body).

The webhook URL to give POK is `https://your-domain.com/api/payment`.
