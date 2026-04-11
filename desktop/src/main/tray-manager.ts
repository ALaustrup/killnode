import { Menu, Tray, nativeImage, app, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";

let tray: Tray | null = null;

const FALLBACK_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAHElEQVR42mNk+M9Qz0AEYBxVSF+FAP0CAnDmIgEA+WkJLEfj6bEAAAAASUVORK5CYII=";

export function createTray(getWindow: () => BrowserWindow | null): void {
  if (tray) return;
  const fileIcon = path.join(app.getAppPath(), "resources", "icon.png");
  const icon = fs.existsSync(fileIcon)
    ? nativeImage.createFromPath(fileIcon)
    : nativeImage.createFromDataURL(FALLBACK_ICON);
  tray = new Tray(icon);
  tray.setToolTip("KillNode");
  const buildMenu = () =>
    Menu.buildFromTemplate([
      {
        label: "Show KillNode",
        click: () => {
          const win = getWindow();
          if (win) {
            win.show();
            win.focus();
          }
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          app.quit();
        },
      },
    ]);
  tray.setContextMenu(buildMenu());
  tray.on("click", () => {
    const win = getWindow();
    if (win) {
      if (win.isVisible()) win.hide();
      else {
        win.show();
        win.focus();
      }
    }
  });
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

/** Optional: load a 16–22px PNG from resources for a visible tray icon */
export function setTrayIconFromPath(p: string): void {
  if (!tray) return;
  try {
    tray.setImage(nativeImage.createFromPath(p));
  } catch {
    /* ignore */
  }
}
