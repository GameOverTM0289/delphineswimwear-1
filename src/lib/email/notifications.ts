// Higher-level notification helpers. The API routes call these instead
// of the templates directly so all branding/copy/text fallbacks live
// here in one place.

import { sendEmail } from './index';
import {
  orderPlacedEmail,
  orderShippedEmail,
  orderDeliveredEmail,
  orderCancelledEmail,
  contactReceivedEmail,
  newsletterConfirmEmail,
  newsletterWelcomeEmail,
} from './templates';
import { getAdminNotificationEmail } from '@/lib/auth';
import type { OrderStatus } from '@/lib/types';
import { findCountry } from '@/lib/data/countries';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://delphine.com';

interface OrderRow {
  orderNumber: string;
  email: string;
  customerName: string;
  shippingMethod: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  postalCode: string;
  country: string;
  countryName: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  items: Array<{
    productName: string;
    size: string;
    color: string;
    priceCents: number;
    quantity: number;
  }>;
}

function emailDataFromOrder(o: OrderRow) {
  const country = findCountry(o.country);
  return {
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    items: o.items,
    subtotalCents: o.subtotalCents,
    shippingCents: o.shippingCents,
    taxCents: o.taxCents,
    totalCents: o.totalCents,
    shippingMethod: o.shippingMethod === 'express' ? 'Express' : 'Standard',
    trackingNumber: o.trackingNumber,
    trackingUrl: o.trackingUrl,
    address: {
      line1: o.address1,
      line2: o.address2,
      city: o.city,
      postalCode: o.postalCode,
      countryName: country?.name ?? o.countryName,
    },
  };
}

export async function notifyOrderPlaced(order: OrderRow) {
  const t = orderPlacedEmail(emailDataFromOrder(order));
  return sendEmail({ to: order.email, subject: t.subject, html: t.html, text: t.text });
}

export async function notifyOrderStatusChange(
  order: OrderRow,
  newStatus: OrderStatus,
) {
  const data = emailDataFromOrder(order);
  let t: { subject: string; html: string; text: string } | null = null;
  switch (newStatus) {
    case 'shipped':
      t = orderShippedEmail(data);
      break;
    case 'delivered':
      t = orderDeliveredEmail(data);
      break;
    case 'cancelled':
      t = orderCancelledEmail(data);
      break;
    default:
      return { ok: true, id: 'no-email-for-status' };
  }
  return sendEmail({ to: order.email, subject: t.subject, html: t.html, text: t.text });
}

export async function notifyContactReceived(args: {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}) {
  const t = contactReceivedEmail(args);
  return sendEmail({
    to: getAdminNotificationEmail(),
    subject: t.subject,
    html: t.html,
    text: t.text,
    replyTo: args.email,
  });
}

export async function sendNewsletterConfirmation(args: {
  email: string;
  confirmToken: string;
}) {
  const confirmUrl = `${SITE_URL}/newsletter/confirm?token=${encodeURIComponent(args.confirmToken)}`;
  const t = newsletterConfirmEmail({ email: args.email, confirmUrl });
  return sendEmail({ to: args.email, subject: t.subject, html: t.html, text: t.text });
}

export async function sendNewsletterWelcome(args: {
  email: string;
  unsubscribeToken: string;
}) {
  const unsubscribeUrl = `${SITE_URL}/newsletter/unsubscribe?token=${encodeURIComponent(args.unsubscribeToken)}`;
  const t = newsletterWelcomeEmail({ email: args.email, unsubscribeUrl });
  return sendEmail({ to: args.email, subject: t.subject, html: t.html, text: t.text });
}
