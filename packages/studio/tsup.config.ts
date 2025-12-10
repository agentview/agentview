import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "src/**/*.tsx", "!src/exampleLoader.tsx"],    // only TS and TSX files
  format: ["esm"],        // output ESM only
  dts: true,              // generate .d.ts files
  sourcemap: true,
  clean: true,
  bundle: false
});