import './loadEnv'

import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

if (!process.env.AGENTVIEW_ADMIN_PORT) {
  throw new Error('AGENTVIEW_ADMIN_PORT is not set');
}

const port = parseInt(process.env.AGENTVIEW_ADMIN_PORT);

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "0.0.0.0", // listens to all interfaces
    port,
    allowedHosts: ['alias.localhost'],
  },
});
