import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

function copyDesktopPrismaClient(): Plugin {
  return {
    name: "copy-desktop-prisma-client",
    closeBundle() {
      const src = resolve(__dirname, "src/main/generated");
      const dest = resolve(__dirname, "out/main/generated");
      if (existsSync(src)) {
        cpSync(src, dest, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyDesktopPrismaClient()],
    build: {
      rollupOptions: {
        external: (id) => id.replace(/\\/g, "/").includes("generated/prisma"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {},
});
