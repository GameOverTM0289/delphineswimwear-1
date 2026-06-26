// POK (pokpay.io) payment integration.
//
// Verified against POK's official Postman collection (POK Payments API).
// Base URLs: production https://api.pokpay.io, staging https://api-staging.pokpay.io
//
// FLOW (hosted-checkout model — no card data ever touches our servers, so we
// stay out of PCI scope):
//
//   1. POST /auth/sdk/login   { keyId, keySecret }
//        -> data.accessToken (bearer JWT), data.expiresIn (ms), data.tokenType
//   2. POST /merchants/{merchantId}/sdk-orders   (Authorization: Bearer <token>)
//        body: { amount, currencyCode, autoCapture, shippingCost,
//                redirectUrl, failRedirectUrl, webhookUrl,
//                merchantCustomReference, description, expiresAfterMinutes }
//        -> data.sdkOrder.id            (POK order id — stored as paymentRef)
//        -> data.sdkOrder._self.confirmUrl   (hosted page we send the buyer to)
//   3. Redirect buyer to confirmUrl (with prefill query params) to pay in POK.
//   4. On success POK redirects to redirectUrl and POSTs the order to webhookUrl.
//      We re-fetch the order from POK (authoritative) before marking it paid.
//   5. GET /merchants/{merchantId}/sdk-orders/{id}  retrieves order status.
//
// AMOUNT UNITS: POK amounts are INTEGERS in the currency's main unit
// (the docs' examples use amount:100 currencyCode:EUR and amount:15000
// currencyCode:ALL, with product price:100 summing to amount:100 — i.e. whole
// units, not cents). We therefore convert our integer-cents totals to whole
// currency units and refuse fractional amounts rather than silently rounding.
//
// Until POK_KEY_ID / POK_KEY_SECRET / POK_MERCHANT_ID are set, createPaymentSession
// returns a safe placeholder (live:false) so the store keeps working and orders
// are saved for out-of-band payment.

const STAGING_URL = 'https://api-staging.pokpay.io';
const PRODUCTION_URL = 'https://api.pokpay.io';

export interface PaymentSession {
  /** Where to send the customer next (POK confirm page when live). */
  redirectUrl: string;
  /** POK sdkOrder id — stored on our order to correlate the webhook. */
  reference: string | null;
  /** True only when a real POK order was created. */
  live: boolean;
}

export interface CreateSessionInput {
  /** Internal cuid — used for the (unguessable) customer-facing order URL. */
  orderId: string;
  /** Human order number (e.g. DEL-2026-0001) — sent to POK as the reference. */
  orderNumber: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  /** Optional prefill for the POK confirm page. */
  countryCode?: string | null;
  city?: string | null;
}

interface PokEnv {
  keyId: string;
  keySecret: string;
  merchantId: string;
  baseUrl: string;
}

function pokEnv(): PokEnv | null {
  const keyId = process.env.POK_KEY_ID;
  const keySecret = process.env.POK_KEY_SECRET;
  const merchantId = process.env.POK_MERCHANT_ID;
  if (!keyId || !keySecret || !merchantId) return null;
  const baseUrl = process.env.POK_ENV === 'staging' ? STAGING_URL : PRODUCTION_URL;
  return { keyId, keySecret, merchantId, baseUrl };
}

/** True when POK API credentials are configured (payments are live). */
export function pokConfigured(): boolean {
  return pokEnv() !== null;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return '';
  }
}

/** Thrown when an order total can't be represented as a POK amount. */
export class PaymentAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentAmountError';
  }
}

/**
 * Convert integer cents to POK's integer major-currency unit. Throws a typed
 * PaymentAmountError if the amount isn't a whole unit or is below POK's
 * minimum, so callers can surface a clear message instead of a generic 500.
 *
 * POK amounts are whole currency units (e.g. 1 = €1). A €0.10 order would be
 * 10 cents — not a whole euro — and is rejected here rather than silently
 * rounded. POK also rejects amounts below 1 unit, so €1 is the practical
 * minimum order total when paying through POK.
 */
function toPokAmount(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new PaymentAmountError('Order total must be greater than zero.');
  }
  if (amountCents % 100 !== 0) {
    throw new PaymentAmountError(
      'POK can only charge whole-euro amounts. Set the order total to a whole number of euros (the minimum is €1).',
    );
  }
  const major = Math.round(amountCents / 100);
  if (major < 1) {
    throw new PaymentAmountError('The minimum amount POK can charge is €1.');
  }
  return major;
}

// ── Access-token cache (per serverless instance) ───────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

async function pokAccessToken(env: PokEnv): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.token;

  const res = await fetch(`${env.baseUrl}/auth/sdk/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyId: env.keyId, keySecret: env.keySecret }),
  });
  if (!res.ok) throw new Error(`POK login failed: ${res.status} ${await safeText(res)}`);

  const json = await res.json();
  const data = json?.data ?? json;
  const token = data?.accessToken;
  if (!token) throw new Error('POK login returned no accessToken');

  // expiresIn is in MILLISECONDS per the docs (e.g. "3600000" = 1h).
  const expiresInMs = Number(data?.expiresIn) || 3_600_000;
  cachedToken = { token, expiresAt: now + expiresInMs };
  return token;
}

function bearer(token: string): string {
  return `Bearer ${token}`;
}

export async function createPaymentSession(
  input: CreateSessionInput,
): Promise<PaymentSession> {
  const env = pokEnv();

  if (!env) {
    // Not configured — placeholder so checkout still completes. Uses the
    // unguessable order id (not the sequential number).
    return { redirectUrl: `/order/${input.orderId}?pending=1`, reference: null, live: false };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  if (!/^https?:\/\//.test(siteUrl)) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL must be an absolute https URL for POK redirect/webhook URLs',
    );
  }

  const token = await pokAccessToken(env);

  const body = {
    // Integer, whole currency units (see toPokAmount).
    amount: toPokAmount(input.amountCents),
    currencyCode: input.currency || 'EUR',
    // Capture automatically when the customer confirms — no separate
    // capture call needed for a standard storefront purchase.
    autoCapture: true,
    shippingCost: 0,
    redirectUrl: `${siteUrl}/order/${input.orderId}?paid=1`,
    failRedirectUrl: `${siteUrl}/order/${input.orderId}?failed=1`,
    webhookUrl: `${siteUrl}/api/payment`,
    merchantCustomReference: input.orderNumber,
    description: `Delphine order ${input.orderNumber}`,
    // Give the buyer 24h to complete payment before the POK order expires.
    expiresAfterMinutes: 1440,
  };

  const res = await fetch(`${env.baseUrl}/merchants/${env.merchantId}/sdk-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: bearer(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POK createOrder failed: ${res.status} ${await safeText(res)}`);

  const json = await res.json();
  const sdkOrder = json?.data?.sdkOrder ?? json?.sdkOrder ?? json?.data ?? json;
  // The confirm URL lives under `_self.confirmUrl` (underscore prefix).
  const confirmUrl: string | undefined =
    sdkOrder?._self?.confirmUrl ?? sdkOrder?.self?.confirmUrl;
  const reference: string | null = sdkOrder?.id ?? null;

  if (!confirmUrl) {
    throw new Error('POK createOrder returned no confirmUrl');
  }

  // Prefill the POK confirm page with the buyer's details + language so the
  // hosted page is friendlier. Albanian UI for AL customers, else English.
  const url = new URL(confirmUrl);
  const [firstName, ...rest] = (input.customerName || '').trim().split(/\s+/);
  if (firstName) url.searchParams.set('firstName', firstName);
  if (rest.length) url.searchParams.set('lastName', rest.join(' '));
  if (input.customerEmail) url.searchParams.set('email', input.customerEmail);
  if (input.countryCode) url.searchParams.set('country', input.countryCode);
  if (input.city) url.searchParams.set('city', input.city);
  url.searchParams.set('language', input.countryCode === 'AL' ? 'AL' : 'EN');

  return { redirectUrl: url.toString(), reference, live: true };
}

/**
 * Retrieve a POK order (authoritative status check). Uses the merchant-scoped
 * detailed endpoint, authenticated with a bearer token. Returns the sdkOrder
 * object or null if it can't be fetched.
 */
export async function getPokOrder(
  sdkOrderId: string,
): Promise<Record<string, any> | null> {
  const env = pokEnv();
  if (!env) return null;
  try {
    const token = await pokAccessToken(env);
    const res = await fetch(
      `${env.baseUrl}/merchants/${env.merchantId}/sdk-orders/${encodeURIComponent(sdkOrderId)}?loadTransaction=true`,
      {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: bearer(token) },
      },
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return (json?.data?.sdkOrder ?? json?.sdkOrder ?? json?.data ?? json ?? null) as
      | Record<string, any>
      | null;
  } catch {
    return null;
  }
}

export interface PokOrderStatus {
  /** Our order number (we sent it as merchantCustomReference). */
  merchantCustomReference: string | null;
  /** POK's opaque order id. */
  pokOrderId: string | null;
  /** Captured/total amount in MAJOR units, if present. */
  amount: number | null;
  isCompleted: boolean;
  isCanceled: boolean;
  isRefunded: boolean;
}

/**
 * Normalise an sdkOrder object (from a webhook body OR a getPokOrder result)
 * into the fields we act on. POK represents status via the boolean flags
 * isCompleted / isCanceled / isRefunded rather than a status string.
 */
export function readPokOrder(payload: unknown): PokOrderStatus {
  const p = (payload ?? {}) as Record<string, any>;
  const o = (p.data?.sdkOrder ?? p.sdkOrder ?? p.data ?? p) as Record<string, any>;
  const amountRaw = o?.capturedAmount ?? o?.finalAmount ?? o?.amount ?? null;
  return {
    merchantCustomReference: o?.merchantCustomReference ?? p?.merchantCustomReference ?? null,
    pokOrderId: o?.id ?? p?.id ?? p?.sdkOrderId ?? null,
    amount: amountRaw != null ? Number(amountRaw) : null,
    isCompleted: Boolean(o?.isCompleted),
    isCanceled: Boolean(o?.isCanceled),
    isRefunded: Boolean(o?.isRefunded),
  };
}

export interface RefundResult {
  ok: boolean;
  /** Why it failed (for logging / admin display). */
  error?: string;
  /** The refreshed POK order state, when the call succeeded. */
  order?: PokOrderStatus;
}

/**
 * Refund a POK order (full by default).
 *
 *   POST /merchants/{merchantId}/sdk-orders/{sdkOrderId}/refund
 *   body: { refundReason?, refundAmount? }   (omit refundAmount = full refund)
 *
 * `refundAmountCents` is optional — pass it for a partial refund; it's
 * converted to POK's whole-unit integer the same way as order amounts.
 * Returns { ok:false, error } rather than throwing so the admin route can
 * surface a friendly message.
 */
export async function refundPokOrder(
  sdkOrderId: string,
  opts: { reason?: string; refundAmountCents?: number } = {},
): Promise<RefundResult> {
  const env = pokEnv();
  if (!env) return { ok: false, error: 'POK is not configured' };
  if (!sdkOrderId) return { ok: false, error: 'Missing POK order reference' };

  let body: Record<string, unknown> = {};
  if (opts.reason) body.refundReason = opts.reason;
  if (opts.refundAmountCents != null) {
    try {
      body.refundAmount = toPokAmount(opts.refundAmountCents);
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  try {
    const token = await pokAccessToken(env);
    const res = await fetch(
      `${env.baseUrl}/merchants/${env.merchantId}/sdk-orders/${encodeURIComponent(sdkOrderId)}/refund`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: bearer(token) },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      return { ok: false, error: `POK refund failed: ${res.status} ${await safeText(res)}` };
    }
    const json = await res.json().catch(() => null);
    return { ok: true, order: readPokOrder(json) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Cancel a POK order's payment (releases frozen funds before capture).
 *
 *   POST /merchants/{merchantId}/sdk-orders/{sdkOrderId}/cancel
 *   body: { cancellationReason? }
 */
export async function cancelPokOrder(
  sdkOrderId: string,
  opts: { reason?: string } = {},
): Promise<RefundResult> {
  const env = pokEnv();
  if (!env) return { ok: false, error: 'POK is not configured' };
  if (!sdkOrderId) return { ok: false, error: 'Missing POK order reference' };

  try {
    const token = await pokAccessToken(env);
    const res = await fetch(
      `${env.baseUrl}/merchants/${env.merchantId}/sdk-orders/${encodeURIComponent(sdkOrderId)}/cancel`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: bearer(token) },
        body: JSON.stringify(opts.reason ? { cancellationReason: opts.reason } : {}),
      },
    );
    if (!res.ok) {
      return { ok: false, error: `POK cancel failed: ${res.status} ${await safeText(res)}` };
    }
    const json = await res.json().catch(() => null);
    return { ok: true, order: readPokOrder(json) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
