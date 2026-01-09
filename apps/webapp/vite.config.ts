import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

if (!process.env.AGENTVIEW_WEBAPP_PORT) {
  throw new Error('AGENTVIEW_WEBAPP_PORT is not set');
}

const port = parseInt(process.env.AGENTVIEW_WEBAPP_PORT);

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    port
  },
});
