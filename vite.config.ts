import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import type { Plugin } from "vite"

/** Preload the Latin display font so headlines do not reflow when it arrives. */
function preloadDisplayFont(): Plugin {
  return {
    name: "relay:preload-display-font",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const file = Object.keys(ctx.bundle ?? {}).find((f) => /archivo-latin-wdth-normal-[\w-]+\.woff2$/.test(f))
        if (!file) return []
        return [
          {
            tag: "link",
            attrs: { rel: "preload", href: `/${file}`, as: "font", type: "font/woff2", crossorigin: "" },
            injectTo: "head-prepend",
          },
        ]
      },
    },
  }
}

// In development the API runs under `wrangler pages dev` on :8788 (see
// `npm run dev`); Vite forwards /api to it so the app always calls same-origin.
export default defineConfig({
  plugins: [react(), tailwindcss(), preloadDisplayFont()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@shared": path.resolve(import.meta.dirname, "./shared"),
    },
  },
  server: {
    proxy: { "/api": "http://127.0.0.1:8788" },
  },
})
