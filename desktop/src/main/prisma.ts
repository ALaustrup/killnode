import path from "node:path";
import { createRequire } from "node:module";
import { app } from "electron";
import type { PrismaClient as PrismaClientType } from "./generated/prisma";
import { DESKTOP_DDL } from "./sql-bootstrap";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("./generated/prisma") as {
  PrismaClient: new (args?: { log?: ("error" | "warn")[] }) => PrismaClientType;
};

let client: PrismaClientType | null = null;

export function ensureDesktopDatabaseUrl(): void {
  const file = path.join(app.getPath("userData"), "killnode.db").replace(/\\/g, "/");
  process.env.DATABASE_URL = `file:${file}`;
}

export async function bootstrapDesktopSchema(prisma: PrismaClientType): Promise<void> {
  for (const stmt of DESKTOP_DDL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await prisma.$executeRawUnsafe(stmt);
  }
}

export function getPrisma(): PrismaClientType {
  if (!client) {
    ensureDesktopDatabaseUrl();
    client = new PrismaClient({
      log: process.env.KILLNODE_DEBUG_DB === "1" ? ["error", "warn"] : ["error"],
    });
  }
  return client;
}

export async function initDesktopDatabase(): Promise<PrismaClientType> {
  ensureDesktopDatabaseUrl();
  const prisma = getPrisma();
  await bootstrapDesktopSchema(prisma);
  await prisma.$connect();
  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
  }
}
