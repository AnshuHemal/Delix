import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Version key — bump this whenever the schema changes to force a fresh client
// This prevents stale singleton instances after hot reloads in development
const PRISMA_VERSION = "v2";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  } as ConstructorParameters<typeof PrismaClient>[0]);
}

declare global {
  // eslint-disable-next-line no-var
  var __prismaVersion: string | undefined;
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return createPrismaClient();
  }

  // In development: discard the singleton if the version key changed
  if (
    globalThis.__prismaClient === undefined ||
    globalThis.__prismaVersion !== PRISMA_VERSION
  ) {
    globalThis.__prismaClient = createPrismaClient();
    globalThis.__prismaVersion = PRISMA_VERSION;
  }

  return globalThis.__prismaClient;
}

export const prisma: PrismaClient = getPrismaClient();
