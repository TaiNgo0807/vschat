import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",

      registerType: "autoUpdate",
      injectRegister: null,

      manifest: {
        name: "VSChat - Chat nội bộ",
        short_name: "VSChat",
        description: "Ứng dụng chat nội bộ công ty Việt Sang",
        theme_color: "#1f4d2b",
        background_color: "#f7f3e8",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
});
