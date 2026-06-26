# POK Payment — Setup & Testing

Delphine uses **POK (pokpay.io)** for card payments via POK's **hosted checkout**.
Card data never touches our servers — the buyer pays on POK's own page — so we
stay out of PCI scope.

## How the flow works

1. Buyer fills checkout → our `/api/orders` saves the order (status `pending`).
2. We call POK **Create Order** (`POST /merchants/{merchantId}/sdk-orders`,
   `autoCapture: true`) and store the returned POK order id on our order as
   `paymentRef`.
3. We redirect the buyer to POK's hosted **confirm page** (`_self.confirmUrl`),
   prefilled with their name/email/country and the page language (AL for
   Albania, otherwise EN).
4. Buyer pays on POK. POK then:
   - redirects them back to `/order/{id}?paid=1` (or `?failed=1`), and
   - POSTs a notification to our webhook at `/api/payment`.
5. Our webhook does **not** trust the POST body. It re-fetches the order from
   POK (`GET /merchants/{merchantId}/sdk-orders/{id}`) — the authoritative
   source — confirms `isCompleted` and that the captured amount matches the
   order total, then marks the order `paid` / `processing`. Refunds and
   cancellations are mapped too. The webhook is idempotent (safe on retries).

## 1. Environment variables

Set these in **Vercel → Settings → Environment Variables** (and in a local
`.env` for dev). See `.env.example` for the full list.

| Variable | Where to find it | Notes |
| --- | --- | --- |
| `POK_KEY_ID` | POK Business → E-payments → API Keys → your key's **keyId** | |
| `POK_KEY_SECRET` | shown **once** when you create the API key | keep secret; rotate if leaked |
| `POK_MERCHANT_ID` | your merchant id | |
| `POK_ENV` | `production` (default) or `staging` | use `staging` to test without real money |
| `NEXT_PUBLIC_SITE_URL` | your deployed URL, e.g. `https://delphineswimwear.com` | **must be absolute https**, no trailing slash, no stray quotes — the POK redirect + webhook URLs are built from it |

> **⚠️ Variable names must be exactly these.** The app reads `POK_KEY_ID`,
> `POK_KEY_SECRET`, and `POK_MERCHANT_ID` (with the `POK_` prefix). If you set
> them as `KEY_ID` / `KEY_SECRET` / `MERCHANT_ID` (no prefix), the app will not
> see them and will silently run in no-payment mode. Double-check the names in
> Vercel.

> If any of `POK_KEY_ID` / `POK_KEY_SECRET` / `POK_MERCHANT_ID` are missing, the
> store runs in **no-payment mode**: orders are saved and the buyer lands on the
> order page with `?pending=1`. Useful for testing the rest of checkout before
> go-live.

### ⚠️ Rotate your secret
If your `keySecret` has ever been pasted into a chat, email, or committed to
git, create a **new** API key in the POK dashboard and delete the old one. Then
update `POK_KEY_SECRET` in Vercel.

## 2. Configure POK dashboard

- **E-payments → Configure → Payment methods**: enable **Credit/Debit Card**
  (and POK Credit if you want it). Click **Save**.
- **Accounts → Bank Accounts**: link your **EUR IBAN** so settlements pay out.
- No webhook URL needs to be set in the dashboard — we pass `webhookUrl` on
  every order automatically (`{NEXT_PUBLIC_SITE_URL}/api/payment`).

## 3. Test on staging first (recommended)

1. Set `POK_ENV="staging"` and use a **staging** API key + merchant id.
2. Deploy (or run locally with a public tunnel — POK must be able to reach your
   `webhookUrl`; use `ngrok http 3000` and set `NEXT_PUBLIC_SITE_URL` to the
   ngrok https URL for local tests).
3. Place a test order through the site. You should be redirected to POK's
   confirm page. Complete the test payment.
4. Confirm:
   - You're redirected back to `/order/{id}?paid=1`.
   - Within a few seconds the order page shows **Payment Received** (the webhook
     verified + flipped it to paid).
   - In the POK dashboard the order shows as completed.
   - The customer received the confirmation email.
5. Test the failure path: start a payment and cancel it on POK's page → you land
   on `/order/{id}?failed=1` and the page shows **Payment Unsuccessful**.

## 4. Go live

1. Switch `POK_ENV` to `production` and swap in your **production** key id,
   key secret, and merchant id.
2. Make sure `NEXT_PUBLIC_SITE_URL` is your real domain.
3. Place one small **real** order end-to-end and confirm it settles to your
   bank, then refund it from the admin if you wish.

## Does `POK_ENV=staging` charge real money?

**No.** Staging is POK's sandbox. With `POK_ENV="staging"` the integration talks
to `https://api-staging.pokpay.io`, transactions are simulated, and no real card
is charged and no real money moves. Two things to know:

- Staging needs **separate staging credentials** — a staging `keyId` /
  `keySecret` / `merchantId` created in POK's staging dashboard. Your
  production keys will NOT work against the staging URL (and vice-versa).
- If you set `POK_ENV="production"` (or leave it unset — production is the
  default) and pay with a real card, that **is a real charge.** If you must
  test on production, place one small order and refund it right away from the
  admin (see below).

## How payment status stays correct (even if the webhook fails)

Payment status does **not** depend on POK's webhook arriving. The webhook is
only a fast-path nudge. The real status is determined by **reconciliation** —
the app asks POK's API directly ("is this order paid?") and updates our record.

Reconciliation runs automatically:

- **When the customer lands on the order page** after paying — so they see
  "Payment Received" immediately, even if the webhook never fired.
- **When an admin opens the order** in `/admin/orders/{id}` — so you never have
  to check the POK dashboard manually.
- **On demand** via the **"Sync with POK"** button in the admin order page.
- **From the webhook**, when it does arrive (just makes the update faster).

All four call the same idempotent function (`reconcileOrderPayment`), which
verifies POK's `isCompleted` flag + the captured amount before marking an order
paid, and sends the confirmation email exactly once.

### The two order IDs

Every order has two identifiers, both shown in the admin order page:

- **Order number** (`DEL-2026-XXXX`) — ours, shown to the customer.
- **POK order ID** (a UUID like `d1245c4a-…`) — POK's, shown on POK's receipt
  and in the POK dashboard.

They're intentionally different systems. The admin page now displays them side
by side so you can match a POK dashboard entry to the right Delphine order at a
glance. (We also send our order number to POK as `merchantCustomReference`, so
it appears on the POK side too.)

### If an order is stuck on "pending"

1. Open it in `/admin/orders/{id}` — it auto-syncs on load.
2. If still pending, click **Sync with POK**. The result message tells you what
   POK reports (paid / still pending / amount mismatch / unreachable).
3. If POK shows it paid but sync says "still pending on POK", the capture may be
   delayed on POK's side — wait a moment and sync again.

### Why the webhook might not arrive (for reference)

The webhook URL is `{NEXT_PUBLIC_SITE_URL}/api/payment`, set automatically on
every order. It can fail to deliver if `NEXT_PUBLIC_SITE_URL` is wrong, the site
is unreachable, or POK's account isn't sending webhooks. None of this breaks the
store now — reconciliation covers it — but if you want instant updates, confirm
`NEXT_PUBLIC_SITE_URL` is your real public https domain.

## Admin: refunds & cancellations (one-click)

The admin order detail page (`/admin/orders/{id}`) adapts to whether the order
was actually paid (it reconciles with POK first, so the decision is based on
POK's real status, not a stale local one):

- **Paid order → Refund.** The button reads **"Refund order"**, returns the full
  total via POK's refund endpoint, marks the order **payment: refunded /
  status: cancelled**, and (unless you untick the box) emails the customer about
  the refund.
- **Unpaid order (pending or failed) → Cancel.** No money was charged, so there
  is nothing to refund. The button reads **"Cancel order"**, cancels the open
  POK payment so the customer can't still pay it, marks the order **payment:
  failed / status: cancelled**, and sends **no email** (a refund email would be
  misleading — they were never charged).

This distinction matters: cancelling an unpaid order must NOT mark it "refunded"
or email the customer about a refund that never happened.

### Why a declined card shows "pending", not "failed"

When a customer's card is declined, POK leaves the order **open** so they can
retry with another card — it is not marked cancelled or failed on POK's side.

What happens next depends on the customer:

- **If they retry and succeed**, reconciliation marks the order paid as normal.
- **If they return to our site** (POK redirects to `/order/{id}?failed=1`), the
  order page automatically cancels the open POK order and marks ours
  **payment: failed / status: cancelled** — but only after re-checking with POK
  that it's genuinely unpaid, so a real payment is never cancelled. No email is
  sent (they were never charged).

The customer's **bag is preserved** (it's only cleared after a *successful*
payment), so the failed page shows a **Return to Checkout** button. Checking out
again creates a **fresh order** rather than trying to resume the dead one —
simpler and more reliable than reusing an expired POK order.

If a customer just closes the tab after a decline (never returns), the order
stays "pending" until you open it in admin (which reconciles) or you **Cancel
order** it manually.

Flow in the UI:

1. Open the order in admin.
2. Scroll to **Refund** in the Status card.
3. Click **Refund order** (or **Cancel payment**).
4. Optionally type an internal reason and choose whether to email the customer.
5. Click **Confirm refund**. The action is irreversible.

The button is hidden/disabled automatically when: POK isn't configured, the
order has no POK payment attached, or it's already refunded.

Under the hood this is `POST /api/orders/{id}/refund` (admin-cookie protected),
which calls `refundPokOrder` / `cancelPokOrder` in `src/lib/payment.ts`.

### Testing a refund

1. On **staging**, place and complete a test order so it shows **Payment
   Received**.
2. Open it in `/admin/orders/{id}` → **Refund** → **Refund order** → **Confirm
   refund**.
3. Confirm:
   - The page shows **payment: refunded** and the order status flips to
     **cancelled**.
   - In the POK dashboard the order shows as refunded.
   - The customer received the refund email (if you left notify on).
4. Test the cancel path: create an order but don't complete payment (so it's
   still pending), then use **Cancel payment** and confirm it releases.

> Partial refunds aren't exposed in the UI (the button always does a full
> refund). The API supports partial — `refundPokOrder(ref, { refundAmountCents })`
> — if you want a partial-refund field added later, that's a small follow-up.

## Notes / limitations

- **Amounts are whole currency units.** POK amounts are integers in the
  currency's main unit (e.g. `185` for €185). All Delphine prices are whole
  euros, so this is exact. If you ever add a price with cents (e.g. €185.50),
  `createPaymentSession` throws on purpose rather than silently rounding —
  extend `toPokAmount` in `src/lib/payment.ts` if POK confirms minor-unit
  support for EUR.
- **Webhook signing.** POK doesn't publish a webhook signature scheme, so we
  rely on authoritative re-verification (re-fetching the order from POK by its
  opaque id) rather than trusting the POST body. This is the more secure model
  regardless. If POK later documents signed webhooks, add the check in
  `src/app/api/payment/route.ts`.
