/** SQLite DDL kept in lockstep with prisma/schema.prisma (bootstrap without bundled prisma CLI). */
export const DESKTOP_DDL = `
CREATE TABLE IF NOT EXISTS "Setting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL
);
`.trim();
