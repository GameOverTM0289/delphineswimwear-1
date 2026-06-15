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

## 4. POK payment integration

Payment is **stubbed** for now. Orders are created in `paymentStatus: pending` and the customer is shown a "POK payment integration coming soon" message on the order confirmation page.

When POK shares their API spec, edit:

- **`src/lib/payment.ts`** → fill in `createPaymentSession()` to call POK's API and return a real `redirectUrl`. Replace `verifyPokWebhook()` with a real signature check.
- **`src/app/api/payment/route.ts`** → already wired to update order paymentStatus on `payment.succeeded` / `payment.failed` / `payment.refunded` events. Adjust event names to match POK's actual webhook payloads.

The `Order` model already has a `paymentRef` field for storing POK's transaction reference and a `paymentStatus` enum for tracking state.

---

## 5. Admin

Visit **`/admin`** — you'll be redirected to `/admin/login`. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`.

Currently exposed:

- **Orders** — list of all orders with status and payment pills.

The session uses a signed cookie (HMAC-SHA256 with `ADMIN_SESSION_SECRET`) and lasts 7 days.

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
| `npm run db:seed` | Seed the 6 products |
| `npm run db:studio` | Open Prisma Studio |

---

## 8. Notes

- Cart state persists in `localStorage` under the key `delphine-cart-v1`.
- The site currently hides the desktop nav under 900px width and shows a hamburger drawer instead.
- Fonts (Cormorant Garamond + Inter) load from Google Fonts via `<link rel="stylesheet">` in `layout.tsx`.
- All product imagery lives in `public/assets/products/` — replace any image while keeping the same filename and the catalog will pick it up automatically.

---

Built with care. Ready to launch.
