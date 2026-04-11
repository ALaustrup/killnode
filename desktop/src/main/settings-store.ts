import fs from "fs";
import path from "path";
import { app } from "electron";

export type KillNodeSettings = {
  torCustomPath?: string;
  ghostMode?: boolean;
  locationCode?: string;
  proxyRotationUrl?: string;
};

const file = () => path.join(app.getPath("userData"), "killnode-settings.json");

export function readSettings(): KillNodeSettings {
  try {
    const raw = fs.readFileSync(file(), "utf8");
    return JSON.parse(raw) as KillNodeSettings;
  } catch {
    return {};
  }
}

export function writeSettings(partial: Partial<KillNodeSettings>): KillNodeSettings {
  const cur = readSettings();
  const next = { ...cur, ...partial };
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(next, null, 2), "utf8");
  return next;
}
