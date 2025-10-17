import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import mdx from '@mdx-js/rollup'
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(), 
    tsconfigPaths(), // for using "~" in imports (taken from tsconfigPaths)
    mdx() // for testing the tailwindcss-typography plugin
  ],
  server: {
    port: 1989,
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