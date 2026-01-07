import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    // watch: {
    //   // pnpm uses symlinks in node_modules pointing to .pnpm store.
    //   // With followSymlinks: true (default), chokidar follows these symlinks
    //   // and watches the entire .pnpm tree (5500+ dirs), hitting OS file descriptor limits.
    //   // followSymlinks: false,
    // },
  },
});
