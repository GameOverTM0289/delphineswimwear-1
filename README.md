# Delphine Swimwear — Mediterranean Summer '26

E-commerce site for Delphine, built on Next.js 14 (App Router) + TypeScript + Postgres + Prisma. Vercel-ready.

---

## 1. Quick start (local development)

```bash
# install dependencies (this also runs `prisma generate`)
npm install

# copy env file and fill in your values
cp .env.example .env
# edit .env — at minimum set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET
# (DATABASE_URL is optional for browsing the site, required for orders)

# (optional, but recommended) push schema and seed products
npm run db:push
npm run db:seed

# run dev server
npm run dev
```

The site runs at **http://localhost:3000**. Admin lives at **/admin** — log in with the credentials you set in `.env`.

> **The site renders without `DATABASE_URL`** — it falls back to a static product catalog. The checkout, contact, and newsletter forms require a database and will show a friendly "coming soon" message until one is configured.

---

## 2. Database

The app uses **Postgres** via **Prisma**. Any Postgres provider works:

| Provider | How to get a `DATABASE_URL` |
|---|---|
| **Vercel Postgres** | Storage tab → Create → Copy connection string |
| **Neon** | neon.tech → free tier → connection string |
| **Supabase** | supabase.com → Settings → Database → Connection String |
| **Railway** | railway.app → New → PostgreSQL → Variables tab |
| **Local** | `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/delphine"` |

After setting `DATABASE_URL`:

```bash
npm run db:push    # creates the schema
npm run db:seed    # inserts the 6 products
```

You can browse the data with `npm run db:studio`.

### Schema highlights

- `Product` — slug-keyed catalog (price stored in cents)
- `Order` + `OrderItem` — orders with payment status, items, address
- `ContactMessage` — contact form submissions
- `NewsletterSubscriber` — newsletter signups

---

## 3. Deploy to Vercel

1. Push the repo to GitHub.
2. On Vercel, **New Project → Import** the repo. The build command (`prisma generate && next build`) is already set in `package.json`.
3. Under **Environment Variables**, add:
   - `DATABASE_URL` (required for orders)
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET` (generate with `openssl rand -base64 32`)
   - `NEXT_PUBLIC_SITE_URL` (e.g. `https://delphine.com`)
   - `POK_API_KEY`, `POK_MERCHANT_ID`, `POK_WEBHOOK_SECRET` (when ready)
4. Click **Deploy**.
5. After the first deploy, run `npx prisma db push` once against the production DB (or use the **Storage** integration to do it from the dashboard), then optionally seed:

```bash
DATABASE_URL="<prod url>" npm run db:seed
```

That's it — the site is live.

---

## 4. POK payment integration (live)

Payment runs through **POK (pokpay.io)** using their hosted checkout — the buyer
pays on POK's own page, so card data never touches this server (no PCI scope).
Full setup + testing instructions are in **`POK-SETUP.md`**.

**Flow:** checkout → create POK order → redirect buyer to POK's confirm page →
buyer pays → POK redirects back to `/order/{id}` and POSTs our webhook. Payment
status is then confirmed by **reconciliation** (we ask POK's API directly and
update our order), which runs on the order page, in the admin, on a "Sync with
POK" button, and from the webhook — so a successful payment is recorded even if
the webhook never arrives.

Set these env vars (exact names, `POK_` prefix):

```
POK_KEY_ID=...
POK_KEY_SECRET=...
POK_MERCHANT_ID=...
POK_ENV=production        # or "staging" for sandbox testing (no real charges)
NEXT_PUBLIC_SITE_URL=https://delphineswimwear.com   # absolute https, no trailing slash
```

Leave the `POK_*` vars blank to run in **no-payment mode** (orders are saved,
buyer lands on the order page with `?pending=1`).

**Notes:**
- POK charges **whole euros only** (€1 minimum). A fractional total (e.g. €0.10)
  is rejected with a clear checkout message, not a charge.
- Refunds and cancellations are one-click in the admin order page.
- Both the Delphine order number (`DEL-2026-XXXX`) and POK's order ID are shown
  side by side in the admin for easy reconciliation.

Code: `src/lib/payment.ts` (POK API client), `src/lib/reconcile.ts` (status
sync), `src/app/api/payment/route.ts` (webhook), `src/app/api/orders/[id]/refund`
and `/sync` (admin actions).

---

## 5. Admin

Visit **`/admin`** — you'll be redirected to `/admin/login`. Sign in with
`ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` (generate with `npm run admin:hash`).

Exposed:

- **Orders** — list with status + payment pills, search/filter, metrics.
- **Order detail** — change status (emails the customer), add DHL tracking,
  one-click **refund**, **Sync with POK**, internal notes. Auto-syncs payment
  status with POK on load.
- **Products** — edit name/price/description/badge, per-size stock, colors.
- **Messages** — contact form submissions (read/unread).
- **Subscribers** — newsletter list with CSV export.

The session uses a signed cookie (HMAC-SHA256 with `ADMIN_SESSION_SECRET`),
HttpOnly + Secure + SameSite, 7-day expiry. Login is rate-limited and fails
closed if `ADMIN_SESSION_SECRET` isn't set. The admin UI is mobile-responsive.

---

## 6. Project structure

```
delphine/
├── prisma/
│   ├── schema.prisma          # database schema
│   └── seed.ts                # seeds the 6 products
├── public/
│   ├── assets/                # all photography (collections, models, products)
│   ├── delphine-logo.png
│   └── favicons + manifest
├── src/
│   ├── app/
│   │   ├── page.tsx                    # home
│   │   ├── shop/page.tsx               # shop with category filter
│   │   ├── product/[slug]/page.tsx     # product detail
│   │   ├── lookbook/page.tsx
│   │   ├── story/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── order/[id]/page.tsx         # order confirmation
│   │   ├── admin/page.tsx              # admin orders
│   │   ├── admin/login/page.tsx
│   │   ├── api/
│   │   │   ├── orders/route.ts         # POST creates order + payment session
│   │   │   ├── orders/[id]/route.ts    # GET / PATCH (admin)
│   │   │   ├── contact/route.ts
│   │   │   ├── newsletter/route.ts
│   │   │   ├── payment/route.ts        # POK webhook
│   │   │   └── admin/login/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── layout/   (Nav, Footer, Announcement, PageHero)
│   │   ├── home/     (Hero, Ticker, Origin, ShopCollection, ...)
│   │   ├── product/  (ProductCard, ProductPurchase)
│   │   ├── cart/     (CartDrawer)
│   │   ├── admin/    (AdminShell)
│   │   └── ui/       (Reveal)
│   └── lib/
│       ├── prisma.ts                   # singleton + dbReady()
│       ├── types.ts
│       ├── utils.ts
│       ├── auth.ts                     # admin HMAC cookie
│       ├── payment.ts                  # POK stub
│       ├── data/products.ts            # static fallback catalog
│       ├── db/products.ts              # DB-or-fallback reads
│       ├── db/orders.ts
│       ├── db/messages.ts
│       └── store/cart.ts               # zustand cart with localStorage
└── ...
```

---

## 7. Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run dev server at :3000 |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm run start` | Run production server |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:seed` | Seed the 5 products + per-size stock |
| `npm run db:studio` | Open Prisma Studio |
| `npm run admin:hash` | Generate a bcrypt hash for `ADMIN_PASSWORD_HASH` |

---

## 8. Notes

- Cart state persists in `localStorage` under the key `delphine-cart-v1`.
- The desktop nav collapses to a hamburger drawer under 900px; the active nav
  underline tracks the current page/category (only the clicked link is
  underlined).
- All product imagery lives in `public/assets/products/` — replace any image
  while keeping the same filename and the catalog will pick it up automatically.
- Pricing is **server-authoritative**: the browser cannot influence what a
  customer is charged. Totals exclude VAT (sticker price is final) and shipping
  is complimentary.
- See **`POK-SETUP.md`** for payment setup/testing and **`DEPLOY-CHECKLIST.md`**
  for the full go-live runbook (including the €1 end-to-end payment + refund
  test).

### Security summary (implemented)

- Admin: HMAC-signed HttpOnly+Secure+SameSite cookie, bcrypt password,
  rate-limited login with constant-time comparison, fails closed without
  `ADMIN_SESSION_SECRET`. All `/api/admin/*`, refund, and sync routes require
  the admin cookie.
- Payments: hosted checkout (no PCI scope); webhook never trusts its body —
  status is re-verified against POK's API; amount is checked before marking
  paid; idempotent.
- Data: Prisma parameterized queries only (no raw SQL); stock decrement is
  race-safe (conditional `updateMany`, no oversell).
- Headers: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy,
  Permissions-Policy; `x-powered-by` removed. robots.txt disallows
  admin/api/order/checkout.
- Forms: order/contact/newsletter are Zod-validated, rate-limited, honeypot-
  protected.

---

Built with care. Ready to launch.
