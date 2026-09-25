import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: "prompt",
    includeAssets: ["ledger-icon.svg"],
    manifest: {
      name: "家庭账本",
      short_name: "家庭账本",
      description: "跨设备家庭记账与分析",
      lang: "zh-CN",
      theme_color: "#16423c",
      background_color: "#f6f4ee",
      display: "standalone",
      start_url: "/",
      icons: [
        {
          src: "/ledger-icon.svg",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any maskable"
        }
      ]
    },
    workbox: {
      navigateFallback: "/index.html",
      runtimeCaching: []
    }
  }), cloudflare()],
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: { url: "http://localhost/" }
    },
    setupFiles: "./src/test/setup.ts",
    css: true
  }
});
