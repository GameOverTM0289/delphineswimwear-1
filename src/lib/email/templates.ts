// HTML email templates — minimal, premium, mobile-responsive.
//
// Constraints kept in mind:
//   - Gmail/Outlook ignore <head> styles → everything inline.
//   - Mobile clients respect <style media="..."> blocks in <head>,
//     so we include a compact media block for responsive padding.
//   - Outlook strips webfonts → fall back to system serif/sans.
//   - Logo is loaded as an <img> from the live site at NEXT_PUBLIC_SITE_URL.
//   - No VAT/tax rows — per launch spec.
//   - No-reply transactional tone — no "reply to this email" copy.

const BRAND = {
  cream: '#F5EFE6',
  ink: '#1B1916',
  muted: '#7C766D',
  line: '#E5DED1',
  // Font stacks use SINGLE quotes around multi-word family names so
  // they're safe to embed in style="..." attributes. Embedding double
  // quotes inside a double-quoted HTML attribute closes the attribute
  // early and silently breaks every style declaration that follows.
  // Example bug this caused: padding on the body cell was truncated
  // by the first `"Cormorant Garamond"` inside font-family, leaving
  // emails with zero horizontal padding on desktop.
  serif: "Georgia, 'Cormorant Garamond', 'Times New Roman', serif",
  sans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://delphineswimwear.com').replace(
  /\/$/,
  '',
);
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'contact@delphineswimwear.com';
const LOGO_URL = `${SITE_URL}/delphine-logo.png`;

function escape(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  );
}

const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;

/**
 * Shared frame around every email. 560px-wide centered card — narrower
 * than typical e-commerce emails so the lines stay short and the
 * typography reads more refined. Generous 48px horizontal padding
 * inside the card keeps content well clear of the borders.
 *
 * Desktop spacing fix: inline styles were previously being truncated
 * by unescaped double quotes inside font-family declarations. BRAND
 * fonts now use single quotes for embedded family names so the
 * `style="..."` attribute parses cleanly.
 */
function frame(opts: { preheader: string; inner: string }): string {
  const { preheader, inner } = opts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Delphine</title>
<style>
  @media screen and (max-width: 600px) {
    .card { width: 100% !important; max-width: 100% !important; }
    .px { padding-left: 22px !important; padding-right: 22px !important; }
    .py-header { padding-top: 36px !important; padding-bottom: 24px !important; }
    .py-body { padding-top: 32px !important; padding-bottom: 32px !important; }
    .headline { font-size: 26px !important; line-height: 1.22 !important; }
    .lead { font-size: 14.5px !important; }
    .logo-img { width: 116px !important; height: auto !important; }
    .item-name { font-size: 14.5px !important; }
    .stack { padding: 16px 0 !important; }
  }
  .preheader { display: none !important; }
</style>
<!--[if mso]>
<style>
  table, td, h1, h2, h3, p { font-family: Georgia, 'Times New Roman', serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:${BRAND.serif};color:${BRAND.ink};-webkit-font-smoothing:antialiased;">

<div class="preheader" style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.cream};">${escape(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.cream};padding:48px 16px;">
  <tr>
    <td align="center">

      <table role="presentation" class="card" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid ${BRAND.line};">

        <!-- Header / logo -->
        <tr>
          <td class="px py-header" align="center" style="padding:52px 48px 32px;border-bottom:1px solid ${BRAND.line};">
            <img src="${LOGO_URL}" alt="Delphine" width="134" class="logo-img" style="display:block;width:134px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;">
            <div style="font-family:${BRAND.sans};font-size:9px;letter-spacing:0.34em;text-transform:uppercase;color:${BRAND.muted};margin-top:18px;font-weight:400;">Mediterranean Summer &rsquo;26</div>
          </td>
        </tr>

        <!-- Body — generous horizontal padding so items + totals breathe -->
        <tr>
          <td class="px py-body" style="padding:44px 48px 44px;font-family:${BRAND.serif};color:${BRAND.ink};line-height:1.6;">${inner}</td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="px" align="center" style="padding:28px 48px 36px;border-top:1px solid ${BRAND.line};font-family:${BRAND.sans};font-size:10.5px;line-height:1.7;color:${BRAND.muted};">
            <div style="margin-bottom:8px;letter-spacing:0.04em;">
              Delphine Swimwear &middot; <a href="${SITE_URL}" style="color:${BRAND.muted};text-decoration:none;border-bottom:1px solid ${BRAND.line};">${SITE_HOST}</a>
            </div>
            <div style="font-size:10px;letter-spacing:0.05em;">
              Questions? Email us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.muted};text-decoration:none;border-bottom:1px solid ${BRAND.line};">${SUPPORT_EMAIL}</a>
            </div>
          </td>
        </tr>

      </table>

      <div style="font-family:${BRAND.sans};font-size:9.5px;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND.muted};opacity:0.55;margin-top:22px;">
        Born in the Mediterranean
      </div>
    </td>
  </tr>
</table>

</body>
</html>`;
}

// ─── Layout primitives ───────────────────────────────────────────────

interface OrderEmailItem {
  productName: string;
  size: string;
  color: string;
  priceCents: number;
  quantity: number;
}

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  items: OrderEmailItem[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  shippingMethod: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    postalCode: string;
    countryName: string;
  };
}

function eyebrow(text: string): string {
  return `<div style="font-family:${BRAND.sans};font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:${BRAND.muted};font-weight:400;margin-bottom:16px;">${escape(text)}</div>`;
}

function headline(text: string): string {
  return `<h1 class="headline" style="font-family:${BRAND.serif};font-size:30px;font-weight:400;line-height:1.18;letter-spacing:-0.012em;margin:0 0 16px;color:${BRAND.ink};">${text}</h1>`;
}

function lead(text: string): string {
  return `<p class="lead" style="font-family:${BRAND.serif};font-size:15.5px;line-height:1.7;color:${BRAND.muted};margin:0 0 26px;font-weight:400;">${text}</p>`;
}

function divider(): string {
  return `<div style="height:1px;background:${BRAND.line};margin:30px 0;"></div>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td style="background:${BRAND.ink};">
      <a href="${href}" style="display:inline-block;padding:15px 36px;font-family:${BRAND.sans};font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#ffffff;text-decoration:none;font-weight:400;line-height:1;">${escape(label)}</a>
    </td></tr>
  </table>`;
}

function itemsTable(items: OrderEmailItem[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 4px;">
  ${items
    .map(
      (i) => `<tr>
    <td class="stack" style="padding:18px 0;border-bottom:1px solid ${BRAND.line};font-family:${BRAND.serif};">
      <div class="item-name" style="font-size:15.5px;color:${BRAND.ink};line-height:1.4;font-weight:400;">${escape(i.productName)}</div>
      <div style="font-family:${BRAND.sans};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND.muted};margin-top:6px;font-weight:400;">Size ${escape(i.size)} &middot; ${escape(i.color)} &middot; Qty ${i.quantity}</div>
    </td>
    <td class="stack" align="right" valign="top" style="padding:18px 0 18px 14px;border-bottom:1px solid ${BRAND.line};font-family:${BRAND.sans};font-size:12.5px;letter-spacing:0.04em;color:${BRAND.ink};white-space:nowrap;font-weight:400;">${eur(i.priceCents * i.quantity)}</td>
  </tr>`,
    )
    .join('')}
</table>`;
}

/**
 * Totals — subtotal, shipping (Complimentary), grand total. No VAT
 * row. Total reflects what the server-side quote computes, which is
 * itemsSubtotal + shipping (no VAT added). See lib/pricing.ts.
 */
function totalsTable(d: OrderEmailData): string {
  const row = (label: string, value: string, bold = false) => `<tr>
    <td style="padding:7px 0;font-family:${BRAND.sans};font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;color:${bold ? BRAND.ink : BRAND.muted};font-weight:400;">${label}</td>
    <td align="right" style="padding:7px 0;font-family:${BRAND.sans};font-size:${bold ? '14px' : '12.5px'};letter-spacing:0.04em;color:${BRAND.ink};font-weight:${bold ? '500' : '400'};">${value}</td>
  </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:18px;">
    ${row('Subtotal', eur(d.subtotalCents))}
    ${row('Shipping', 'Complimentary')}
    <tr><td colspan="2" style="border-top:1px solid ${BRAND.line};padding-top:6px;"></td></tr>
    ${row('Total', eur(d.totalCents), true)}
  </table>`;
}

function addressBlock(d: OrderEmailData): string {
  return `<div style="margin-top:34px;">
    <div style="font-family:${BRAND.sans};font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:${BRAND.muted};margin-bottom:12px;font-weight:400;">Shipping to</div>
    <div style="font-family:${BRAND.serif};font-size:14.5px;line-height:1.7;color:${BRAND.ink};">
      ${escape(d.customerName)}<br>
      ${escape(d.address.line1)}${d.address.line2 ? '<br>' + escape(d.address.line2) : ''}<br>
      ${escape(d.address.city)} ${escape(d.address.postalCode)}<br>
      ${escape(d.address.countryName)}
    </div>
  </div>`;
}

// ─── Templates ───────────────────────────────────────────────────────

export function orderPlacedEmail(d: OrderEmailData) {
  return {
    subject: `Order ${d.orderNumber} confirmed`,
    html: frame({
      preheader: `Your order ${d.orderNumber} is confirmed. Total ${eur(d.totalCents)}.`,
      inner: `
        ${eyebrow(`Order ${d.orderNumber}`)}
        ${headline(`Thank you, ${escape(d.customerName.split(' ')[0] ?? d.customerName)}.`)}
        ${lead(`Your order is confirmed. We&rsquo;ll send another note when it ships from our atelier on the Mediterranean coast.`)}
        ${divider()}
        ${itemsTable(d.items)}
        ${totalsTable(d)}
        ${addressBlock(d)}
      `,
    }),
    text: `Thank you, ${d.customerName}. Order ${d.orderNumber} confirmed. Total ${eur(d.totalCents)}. We'll email when it ships.`,
  };
}

export function orderShippedEmail(d: OrderEmailData) {
  const tracking = d.trackingNumber
    ? `<div style="margin:24px 0 8px;padding:20px 24px;background:${BRAND.cream};border-left:3px solid ${BRAND.ink};">
         <div style="font-family:${BRAND.sans};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND.muted};margin-bottom:6px;font-weight:400;">Tracking</div>
         <div style="font-family:${BRAND.serif};font-size:16px;color:${BRAND.ink};font-weight:400;">${escape(d.trackingNumber)}</div>
         ${d.trackingUrl ? `<div style="margin-top:14px;"><a href="${escape(d.trackingUrl)}" style="font-family:${BRAND.sans};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND.ink};text-decoration:none;border-bottom:1px solid ${BRAND.ink};padding-bottom:2px;">Track your package &rarr;</a></div>` : ''}
       </div>`
    : '';
  return {
    subject: `Order ${d.orderNumber} is on its way`,
    html: frame({
      preheader: `Your order ${d.orderNumber} has shipped from our atelier.`,
      inner: `
        ${eyebrow(`Order ${d.orderNumber}`)}
        ${headline(`It&rsquo;s on its way, ${escape(d.customerName.split(' ')[0] ?? d.customerName)}.`)}
        ${lead(`Your order has just shipped from our atelier on the Mediterranean coast.`)}
        ${tracking}
        ${divider()}
        ${itemsTable(d.items)}
      `,
    }),
    text: `Your order ${d.orderNumber} has shipped${d.trackingNumber ? `. Tracking: ${d.trackingNumber}` : '.'}`,
  };
}

export function orderDeliveredEmail(d: OrderEmailData) {
  return {
    subject: `Your Delphine order has arrived`,
    html: frame({
      preheader: `Your order ${d.orderNumber} has been delivered. We hope you love it.`,
      inner: `
        ${eyebrow(`Order ${d.orderNumber}`)}
        ${headline(`It&rsquo;s arrived, ${escape(d.customerName.split(' ')[0] ?? d.customerName)}.`)}
        ${lead(`Your order has been delivered. We hope you love it.`)}
        ${divider()}
        <div style="text-align:center;margin:24px 0 8px;">
          ${button(`${SITE_URL}/shop`, 'Discover the collection')}
        </div>
      `,
    }),
    text: `Your order ${d.orderNumber} has been delivered. We hope you love it.`,
  };
}

export function orderCancelledEmail(d: OrderEmailData) {
  return {
    subject: `Order ${d.orderNumber} cancelled`,
    html: frame({
      preheader: `Your order ${d.orderNumber} has been cancelled.`,
      inner: `
        ${eyebrow(`Order ${d.orderNumber}`)}
        ${headline(`Your order has been cancelled.`)}
        ${lead(`If a payment was taken, you&rsquo;ll see the refund within 5 business days.`)}
      `,
    }),
    text: `Your order ${d.orderNumber} has been cancelled.`,
  };
}

export function contactReceivedEmail(args: {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}) {
  return {
    subject: `New contact form message — ${args.subject || args.name}`,
    html: frame({
      preheader: `New message from ${args.name} via the contact form.`,
      inner: `
        ${eyebrow('New contact message')}
        ${headline('A new message has arrived.')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 8px;">
          <tr>
            <td style="padding:10px 0;font-family:${BRAND.sans};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND.muted};width:90px;vertical-align:top;font-weight:400;">From</td>
            <td style="padding:10px 0;font-family:${BRAND.serif};font-size:15px;color:${BRAND.ink};">${escape(args.name)} &lt;<a href="mailto:${escape(args.email)}" style="color:${BRAND.ink};text-decoration:none;border-bottom:1px solid ${BRAND.line};">${escape(args.email)}</a>&gt;</td>
          </tr>
          ${args.subject ? `<tr>
            <td style="padding:10px 0;font-family:${BRAND.sans};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND.muted};vertical-align:top;font-weight:400;">Subject</td>
            <td style="padding:10px 0;font-family:${BRAND.serif};font-size:15px;color:${BRAND.ink};">${escape(args.subject)}</td>
          </tr>` : ''}
        </table>
        ${divider()}
        <div style="font-family:${BRAND.sans};font-size:10.5px;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND.muted};margin-bottom:14px;font-weight:400;">Message</div>
        <div style="padding:24px 28px;background:${BRAND.cream};font-family:${BRAND.serif};font-size:15px;line-height:1.75;color:${BRAND.ink};white-space:pre-wrap;">${escape(args.message)}</div>
      `,
    }),
    text: `From ${args.name} <${args.email}>: ${args.message}`,
  };
}

export function newsletterConfirmEmail(args: { email: string; confirmUrl: string }) {
  return {
    subject: `Confirm your subscription`,
    html: frame({
      preheader: `One last step to subscribe to letters from Delphine.`,
      inner: `
        ${eyebrow('One last step')}
        ${headline('Almost there.')}
        ${lead(`Tap the button below to confirm you want letters from Delphine — collection previews, atelier notes, and the occasional private invitation.`)}
        <div style="text-align:center;margin:36px 0 28px;">
          ${button(args.confirmUrl, 'Confirm subscription')}
        </div>
        <p style="font-family:${BRAND.serif};font-style:italic;font-size:13px;line-height:1.65;color:${BRAND.muted};text-align:center;margin:0;">
          If you didn&rsquo;t request this, simply ignore the email &mdash; no subscription is made until you confirm.
        </p>
      `,
    }),
    text: `Confirm your subscription to Delphine: ${args.confirmUrl}`,
  };
}

export function newsletterWelcomeEmail(args: { email: string; unsubscribeUrl: string }) {
  return {
    subject: `Welcome to Delphine`,
    html: frame({
      preheader: `Welcome. The Mediterranean Summer '26 collection is now available.`,
      inner: `
        ${eyebrow('Letters from Delphine')}
        ${headline('Welcome.')}
        ${lead(`You&rsquo;re on the list. We send a few letters a year &mdash; collection previews, atelier moments, and the occasional thank-you for being early.`)}
        <p style="font-family:${BRAND.serif};font-size:16px;line-height:1.65;color:${BRAND.muted};margin:0 0 30px;">
          In the meantime, the Mediterranean Summer &rsquo;26 collection is now available.
        </p>
        <div style="text-align:center;margin:8px 0 14px;">
          ${button(`${SITE_URL}/shop`, 'Shop the collection')}
        </div>
        <p style="font-family:${BRAND.sans};font-style:italic;font-size:11px;line-height:1.65;color:${BRAND.muted};text-align:center;margin:18px 0 0;letter-spacing:0.04em;">
          To stop receiving these, <a href="${args.unsubscribeUrl}" style="color:${BRAND.muted};text-decoration:none;border-bottom:1px solid ${BRAND.line};">unsubscribe</a>.
        </p>
      `,
    }),
    text: `Welcome to Delphine. Shop the collection at ${SITE_URL}/shop. Unsubscribe: ${args.unsubscribeUrl}`,
  };
}
