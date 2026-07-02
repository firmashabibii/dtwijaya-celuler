import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Configure Nitro to target Vercel serverless when building on Vercel
  nitro: process.env.VERCEL ? {
    preset: "vercel",
  } : {},
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
