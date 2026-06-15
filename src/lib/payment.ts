// Stub for POK payment gateway integration.
//
// When POK provides their SDK / API spec, replace `createPaymentSession`
// with a real call that returns a redirect URL or a client-side payment token.
// The route handler in src/app/api/payment/route.ts wraps this.

export interface PaymentSession {
  /** URL to redirect the customer to (or '#' if not yet configured) */
  redirectUrl: string;
  /** POK transaction reference, if any */
  reference: string | null;
  /** Whether payment is genuinely live, or just a placeholder */
  live: boolean;
}

export interface CreateSessionInput {
  /** Internal cuid — used for the (unguessable) customer-facing order URL. */
  orderId: string;
  /** Human order number (e.g. DEL-2026-0001) — used as the payment reference. */
  orderNumber: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  customerName: string;
}

export async function createPaymentSession(
  input: CreateSessionInput,
): Promise<PaymentSession> {
  const apiKey = process.env.POK_API_KEY;
  const merchantId = process.env.POK_MERCHANT_ID;

  if (!apiKey || !merchantId) {
    // Not configured yet — return a placeholder. Use the unguessable order
    // id (not the sequential order number) so the confirmation page can't be
    // enumerated by walking DEL-2026-0001, -0002, …
    return {
      redirectUrl: `/order/${input.orderId}?pending=1`,
      reference: null,
      live: false,
    };
  }

  // ─── TODO: real POK integration goes here ──────────────────
  // Example shape (will need to match POK's actual API once shared):
  //
  //   const res = await fetch('https://api.pok.example/v1/sessions', {
  //     method: 'POST',
  //     headers: {
  //       'Authorization': `Bearer ${apiKey}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       merchant_id: merchantId,
  //       amount: input.amountCents,
  //       currency: input.currency,
  //       reference: input.orderNumber,
  //       customer: { email: input.customerEmail, name: input.customerName },
  //       success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order/${input.orderId}?paid=1`,
  //       cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/order/${input.orderId}?cancelled=1`,
  //     }),
  //   });
  //   const data = await res.json();
  //   return { redirectUrl: data.redirect_url, reference: data.id, live: true };

  return {
    redirectUrl: `/order/${input.orderId}?pending=1`,
    reference: null,
    live: false,
  };
}

/** Verify a webhook payload from POK. Replace with real signature check. */
export function verifyPokWebhook(_payload: string, _signature: string | null): boolean {
  const secret = process.env.POK_WEBHOOK_SECRET;
  if (!secret) return false;
  // TODO: real HMAC verification once POK shares their webhook signing scheme.
  return true;
}
