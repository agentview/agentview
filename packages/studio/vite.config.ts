import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { resolve } from 'path';
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    tailwindcss(), 
    react()
  ],
  resolve: {
    alias: {
      // Treat everything in packages/ui/src as if it were local
      '@examples': resolve(__dirname, '../../apps/examples'),
    },
  },
  server: {
    port: 1989,

    fs: {
      // allow Vite dev server to read outside this app directory
      allow: [
        // default root
        resolve(__dirname, '.'),
        // the shared package
        resolve(__dirname, '../../apps/examples'),
      ],
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "index.html"
      }
    }
  }
});