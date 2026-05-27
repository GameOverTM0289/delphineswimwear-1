type PrismaClientLike = Record<string | symbol, unknown>;
type PrismaClientCtor = new (options?: { log?: string[] }) => PrismaClientLike;

// Singleton: avoid spinning up multiple clients in dev hot-reload
// and across serverless invocations on Vercel.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientLike };

function loadPrismaClient(): PrismaClientCtor {
  // Lazy require keeps static builds healthy before Prisma is needed.
  // Vercel runs `prisma generate` before `next build`, so the real client
  // is available at runtime/build time when any DB method is actually used.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const mod = require('@prisma/client') as { PrismaClient: PrismaClientCtor };
  return mod.PrismaClient;
}

function makeClient(): PrismaClientLike {
  const PrismaClient = loadPrismaClient();
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

function getPrisma(): PrismaClientLike {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const client = makeClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;
  return client;
}

// Lazily construct Prisma only when a DB method is actually used.
// This keeps static builds healthy when DATABASE_URL is not present and
// prevents page-data generation from opening an unnecessary Prisma engine.
export const prisma = new Proxy({} as any, {
  get(_target, prop, receiver) {
    const client = getPrisma() as any;
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
}) as any;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** @deprecated use hasDatabase() */
export const dbReady = hasDatabase;
