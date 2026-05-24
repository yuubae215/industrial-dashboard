import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const isGithubPages = process.env.GITHUB_PAGES === "true";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // GitHub Pages deploy uses /industrial-dashboard/ base; Tauri requires relative ./
  base: isGithubPages ? "/industrial-dashboard/" : "./",

  // GitHub Pages: @tauri-apps/api/core をデモ用モックに差し替え
  resolve: isGithubPages
    ? { alias: { "@tauri-apps/api/core": path.resolve("src/mocks/tauri-core.ts") } }
    : {},

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("d3-")) {
              return "recharts-vendor";
            }
            return "vendor";
          }
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
