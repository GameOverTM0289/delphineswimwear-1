# Delphine Swimwear — Launch Guide

Complete setup, in order. Estimated total time: **45 minutes** if you follow it linearly.

---

## 1. Push to GitHub

```bash
cd delphine
git init
git add .
git commit -m "Launch-ready build"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/delphine.git
git push -u origin main
```

## 2. Deploy on Vercel

1. [vercel.com/new](https://vercel.com/new) → Import the repo
2. Framework: **Next.js** (auto-detected)
3. Build command: `npm run build` (auto)
4. Environment variables: skip for now — we'll add them step-by-step below
5. Deploy. The first deploy will fail because `DATABASE_URL` is missing — that's fine.

---

## 3. Database (Neon Postgres — free tier)

1. [neon.tech](https://neon.tech) → Sign up → New Project (region: closest to your customers, e.g. Frankfurt)
2. Project Dashboard → **Connection Details** → copy the pooled connection string
   - Looks like: `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. Vercel → Settings → Environment Variables → add:
   - **Key:** `DATABASE_URL`
   - **Value:** the Neon connection string
   - **Environments:** check Production, Preview, Development
4. Vercel → Deployments → click ⋯ on the latest → Redeploy
5. Once deployed, push the schema:
   ```bash
   # locally:
   echo 'DATABASE_URL="paste-the-neon-url-here"' > .env
   npm install
   npx prisma db push
   npm run db:seed
   ```
   The seed populates 6 products with 10 units of stock per size each. Re-run any time to sync.

---

## 4. Admin password

```bash
npm run admin:hash
# → Password: ********
# → ADMIN_PASSWORD_HASH=$2a$12$xxxxxxx...
```

In Vercel env vars, add:
- `ADMIN_EMAIL` = `you@delphine.com`
- `ADMIN_PASSWORD_HASH` = the long hash from above
- `ADMIN_SESSION_SECRET` = run `openssl rand -base64 32` and paste the result

Never commit `ADMIN_PASSWORD_HASH` to git. Redeploy.

You can now sign in at `https://your-domain.vercel.app/admin/login`.

---

## 5. Resend (transactional email)

1. [resend.com](https://resend.com) → Sign up
2. **API Keys** → Create → name it "Delphine Production" → Permissions: Full access → copy the key (`re_...`)
3. **Domains** → Add Domain → enter `delphine.com` (or whatever your sending domain will be)
4. Resend gives you DNS records to add — typically 3:
   - **MX** record (Resend's mail server)
   - **TXT** record for SPF
   - **TXT** record for DKIM (long key starting `v=DKIM1...`)
5. Add those records at your domain registrar (or Cloudflare). Wait 5-30 minutes for verification.
6. Once verified in the Resend dashboard, add to Vercel env:
   - `RESEND_API_KEY` = the `re_...` key
   - `EMAIL_FROM` = `hello@delphine.com` (or `orders@`, anything @ your verified domain)
   - `EMAIL_FROM_NAME` = `Delphine`
   - `ADMIN_NOTIFICATION_EMAIL` = where contact-form notifications should land
7. Redeploy.

**Test:** place a small test order. You should receive both:
- An order-confirmation email at the customer email
- A contact-form notification email when someone submits the contact form

If emails don't arrive, check Resend → Logs. Most failures are unverified domains.

---

## 6. Upstash Redis (rate limiting)

1. [upstash.com](https://upstash.com) → Sign up → **Create Database**
2. Type: **Regional**, Region: closest to Vercel deployment, Eviction: **off**
3. From the database overview, scroll to **REST API** → copy the **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**
4. Add to Vercel env:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. Redeploy.

This activates rate limits on:
- Admin login: 5 attempts per IP per 15 minutes
- Contact form: 3 submissions per IP per hour
- Newsletter signup: 3 per IP per hour
- Order placement: 10 per IP per hour

If unset, all forms still work but with no rate limits — fine for local dev, risky for production.

---

## 7. Google Analytics 4 (optional but recommended)

1. [analytics.google.com](https://analytics.google.com) → Admin → **Create Property**
2. Property name: Delphine, timezone: your timezone, currency: EUR
3. Choose **Web** → URL: `https://your-domain.com` → finish
4. **Data Streams** → click your stream → copy the **Measurement ID** (looks like `G-XXXXXXXXXX`)
5. Add to Vercel env:
   - `NEXT_PUBLIC_GA_ID` = `G-XXXXXXXXXX`
6. Redeploy.

GA only loads when `NEXT_PUBLIC_GA_ID` is set — no hidden tracking otherwise.

---

## 8. Sentry (optional, recommended for production)

1. [sentry.io](https://sentry.io) → New Project → Platform: **Next.js** → Project name: Delphine
2. Skip the install wizard. Go to Project Settings → **Client Keys (DSN)** → copy the DSN.
3. Add to Vercel env: `NEXT_PUBLIC_SENTRY_DSN` = the DSN
4. Redeploy.

(Currently the Sentry DSN env var is exposed to the client but Sentry SDK isn't auto-wired. To wire fully, install `@sentry/nextjs` later — out of scope for v1.)

---

## 9. Custom domain

1. Vercel → Project → Settings → Domains → Add `delphine.com` and `www.delphine.com`
2. At your registrar, follow the DNS instructions Vercel gives:
   - Either point nameservers to Vercel
   - Or add an A record `76.76.21.21` for the apex + CNAME `cname.vercel-dns.com` for `www`
3. Wait 5-60 minutes for DNS to propagate

Update `NEXT_PUBLIC_SITE_URL` in env vars to the final domain. Redeploy.

---

## 10. Pre-launch checklist

Run through this before sharing the URL publicly:

- [ ] Place a real test order. Check confirmation email arrives.
- [ ] Submit the contact form. Check the admin notification email arrives.
- [ ] Sign up to the newsletter. Check confirmation email arrives. Click confirm. Check welcome email.
- [ ] Sign in to `/admin/login`. Open the test order, change status to "shipped" with a tracking number, save with "notify customer" checked. Check the shipped email arrives at the test address.
- [ ] In Admin → Products, set one size's stock to 0. Visit that product on the site — confirm "Sold Out" badge.
- [ ] Try logging in with a wrong password 6 times in a row. Confirm you get rate-limited.
- [ ] Submit the contact form 4 times in a row. Confirm you get rate-limited.

If everything passes, you're launch-ready.

---

## Day-to-day operations

### Receiving orders
1. Order arrives → email notification
2. `/admin` → click order
3. Pack the item. When shipped, set status to **Shipped**, add tracking number + URL, click Save.
4. Customer is auto-emailed.
5. When delivered, set status to **Delivered**. Customer gets a delivery confirmation.

### Updating products / stock
- `/admin/products` → click any product → edit copy, image paths, or per-size stock → Save.
- Changes are live immediately (Vercel cache: 5-10 seconds).

### Managing inquiries
- `/admin/messages` shows contact-form submissions. Click to expand → mark as read → reply by email.

### Newsletter
- `/admin/subscribers` shows everyone signed up + their confirmation status.
- Export to CSV → import into Klaviyo / Beehiiv / Mailchimp for sending campaigns.

---

## Troubleshooting

**Orders aren't being saved**
- Check Vercel logs. If you see `DATABASE_NOT_CONFIGURED`, your `DATABASE_URL` is missing or wrong.
- Run `npx prisma db push` locally to sync the schema.

**Emails aren't being sent**
- Check Resend → Logs. Most failures are unverified domains.
- Confirm `EMAIL_FROM` matches a verified Resend domain.
- The API itself succeeds even when emails are skipped — by design (so a Resend outage doesn't block orders).

**Admin password rejected**
- `ADMIN_EMAIL` and submitted email must match exactly (case-insensitive).
- Re-run `npm run admin:hash` and update `ADMIN_PASSWORD_HASH`.

**Stale products in `/shop`**
- Re-run `npm run db:seed` against production. It removes old slugs and upserts the canonical 6.

**Stock not decrementing**
- Confirm `Variant` rows exist for every size of every product (run `npm run db:seed` if not).
- Check the order itself — if `productSlug` matches a Product but no Variant for that size exists, stock check is skipped.

---

## What's not yet built (known gaps)

- POK payment integration is a stub. The webhook handler is in place; replace `verifyPokWebhook` in `src/lib/payment.ts` once you have the signing scheme.
  - **Stripe alternative**: ~2 hours to wire up. Use Stripe Checkout Sessions, redirect from `/api/orders` POST, listen on `/api/payment/stripe`.
- No customer accounts. Reasonable for a luxury brand at launch.
- No discount codes. Easy to add when needed.
- No multi-currency display. Prices in EUR, customer charged in EUR.
