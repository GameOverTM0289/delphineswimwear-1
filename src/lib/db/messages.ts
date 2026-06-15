// Contact messages + newsletter subscribers DB layer.

import { prisma, hasDatabase } from '@/lib/prisma';
import crypto from 'crypto';

// ── Contact ──────────────────────────────────────────────────────────

export async function recordContactMessage(args: {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  ipHash?: string | null;
}) {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');
  return prisma.contactMessage.create({
    data: {
      name: args.name,
      email: args.email.toLowerCase().trim(),
      subject: args.subject?.trim() || null,
      message: args.message,
      ipHash: args.ipHash ?? null,
    },
  });
}

export async function listContactMessages(opts: { unreadOnly?: boolean } = {}) {
  if (!hasDatabase()) return [];
  return prisma.contactMessage.findMany({
    where: opts.unreadOnly ? { read: false } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function markContactRead(id: string, read = true) {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');
  return prisma.contactMessage.update({ where: { id }, data: { read } });
}

// ── Newsletter ───────────────────────────────────────────────────────

export interface SubscribeResult {
  alreadyActive: boolean;
  confirmToken: string | null;
  email: string;
}

export async function subscribeNewsletter(args: {
  email: string;
  source?: string | null;
}): Promise<SubscribeResult> {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');

  const email = args.email.toLowerCase().trim();
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });

  if (existing && existing.status === 'active') {
    return { alreadyActive: true, confirmToken: null, email };
  }

  const confirmToken = crypto.randomBytes(24).toString('hex');

  if (existing) {
    await prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        status: 'pending',
        source: args.source ?? existing.source,
        confirmToken,
        confirmedAt: null,
        unsubscribedAt: null,
        subscribedAt: new Date(),
      },
    });
  } else {
    await prisma.newsletterSubscriber.create({
      data: {
        email,
        status: 'pending',
        source: args.source ?? 'manual',
        confirmToken,
      },
    });
  }
  return { alreadyActive: false, confirmToken, email };
}

export async function confirmNewsletter(token: string) {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { confirmToken: token } });
  if (!sub) return null;
  return prisma.newsletterSubscriber.update({
    where: { id: sub.id },
    data: {
      status: 'active',
      confirmedAt: new Date(),
      confirmToken: null,
    },
  });
}

export async function unsubscribeNewsletter(token: string) {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');
  const sub = await prisma.newsletterSubscriber.findUnique({
    where: { unsubscribeToken: token },
  });
  if (!sub) return null;
  return prisma.newsletterSubscriber.update({
    where: { id: sub.id },
    data: { status: 'unsubscribed', unsubscribedAt: new Date() },
  });
}

export async function listSubscribers(opts: { status?: string } = {}) {
  if (!hasDatabase()) return [];
  return prisma.newsletterSubscriber.findMany({
    where: opts.status ? { status: opts.status } : {},
    orderBy: { subscribedAt: 'desc' },
    take: 1000,
  });
}
