import type { PrismaClient } from "./generated/prisma";

export type KillNodeSettings = {
  torCustomPath?: string;
  ghostMode?: boolean;
  locationCode?: string;
  bridgeEnabled?: boolean;
  bridgeLines?: string;
  deadManSeconds?: string;
};

const KEYS: (keyof KillNodeSettings)[] = [
  "torCustomPath",
  "ghostMode",
  "locationCode",
  "bridgeEnabled",
  "bridgeLines",
  "deadManSeconds",
];

function parseValue(key: keyof KillNodeSettings, raw: string | undefined): unknown {
  if (raw === undefined) return undefined;
  if (key === "ghostMode" || key === "bridgeEnabled") return raw === "1" || raw === "true";
  return raw;
}

export async function readSettings(prisma: PrismaClient): Promise<KillNodeSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: KEYS as string[] } },
  });
  const map = Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value])) as Record<
    string,
    string
  >;
  const out: KillNodeSettings = {};
  for (const k of KEYS) {
    const v = parseValue(k, map[k as string]);
    if (v !== undefined && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export async function writeSettings(
  prisma: PrismaClient,
  partial: Partial<KillNodeSettings>
): Promise<KillNodeSettings> {
  for (const k of KEYS) {
    if (!(k in partial)) continue;
    const val = partial[k];
    if (val === undefined || val === null || val === "") {
      await prisma.setting.deleteMany({ where: { key: k } });
    } else {
      const str = typeof val === "boolean" ? (val ? "true" : "false") : String(val);
      await prisma.setting.upsert({
        where: { key: k },
        create: { key: k, value: str },
        update: { value: str },
      });
    }
  }
  return readSettings(prisma);
}
