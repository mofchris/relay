import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// In development the API runs under `wrangler pages dev` on :8788 (see
// `npm run dev`); Vite forwards /api to it so the app always calls same-origin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
