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

In the Vercel **Environment Variables** section, add the following. Set each one for **all three environments** (Production, Preview, Development):

| Variable | Value |
|---|---|
| `DATABASE_URL` | The connection string from step 1 |
| `ADMIN_EMAIL` | e.g. `you@delphine.com` |
| `ADMIN_PASSWORD` | A strong password |
| `ADMIN_SESSION_SECRET` | Run `openssl rand -base64 32` and paste |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` (or your custom domain) |
| `POK_API_KEY` | Leave empty for now |
| `POK_MERCHANT_ID` | Leave empty for now |
| `POK_WEBHOOK_SECRET` | Leave empty for now |

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
Make sure `package.json` has both:
```json
"build": "prisma generate && next build",
"postinstall": "prisma generate"
```
(it does — don't change them).

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

## When POK gives you their API spec

1. Edit `src/lib/payment.ts` → fill in `createPaymentSession()` with real POK API call
2. Edit `verifyPokWebhook()` with their signature scheme
3. Set `POK_API_KEY`, `POK_MERCHANT_ID`, `POK_WEBHOOK_SECRET` in Vercel env
4. Redeploy

The webhook URL to give POK is `https://your-app.vercel.app/api/payment`.
