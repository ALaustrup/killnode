/** SQLite DDL kept in lockstep with prisma/schema.prisma (bootstrap without bundled prisma CLI). */
export const DESKTOP_DDL = `
CREATE TABLE IF NOT EXISTS "Setting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "TorrentJob" (
  "infoHash" TEXT NOT NULL PRIMARY KEY,
  "magnetUri" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`.trim();
