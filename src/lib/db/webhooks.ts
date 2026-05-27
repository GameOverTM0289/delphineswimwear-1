// Webhook idempotency tracking. Payment providers retry webhooks on
// network failure — sometimes 3+ times for the same event. We log the
// external event ID and skip duplicates so a customer never receives
// 3 confirmation emails for one payment.

import { prisma, hasDatabase } from '@/lib/prisma';

export async function alreadyProcessed(externalId: string): Promise<boolean> {
  if (!hasDatabase()) return false;
  const existing = await prisma.webhookEvent.findUnique({ where: { externalId } });
  return Boolean(existing);
}

export async function recordWebhook(args: {
  externalId: string;
  provider: string;
  eventType: string;
  payload: unknown;
}) {
  if (!hasDatabase()) return null;
  return prisma.webhookEvent.create({
    data: {
      externalId: args.externalId,
      provider: args.provider,
      eventType: args.eventType,
      payload: JSON.stringify(args.payload).slice(0, 60_000),
    },
  });
}
