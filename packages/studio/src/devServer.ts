import type { Plugin, ViteDevServer } from "vite";
import path from "node:path";

const VIRTUAL_ENTRY_ID = "virtual:agentview-entry.tsx";
const VIRTUAL_STYLES_ID = "virtual:agentview-styles.css";
const RESOLVED_ENTRY_ID = "\0" + VIRTUAL_ENTRY_ID;
const RESOLVED_STYLES_ID = "\0" + VIRTUAL_STYLES_ID;

function agentviewDevPlugin(configPath: string): Plugin {
  const configFileName = path.basename(configPath);

  return {
    name: "agentview-dev",

    resolveId(id) {
      // Strip leading "/" — Vite passes it for script src URLs from HTML
      const cleanId = id.startsWith("/") ? id.slice(1) : id;
      if (cleanId === VIRTUAL_ENTRY_ID) return RESOLVED_ENTRY_ID;
      if (cleanId === VIRTUAL_STYLES_ID) return RESOLVED_STYLES_ID;
    },

    load(id) {
      if (id === RESOLVED_ENTRY_ID) {
        return `
import "virtual:agentview-styles.css";
import { renderStudio } from "@agentview/studio";
import config from "./${configFileName}";

renderStudio(document.getElementById("agentview"), config);
`;
      }

      if (id === RESOLVED_STYLES_ID) {
        return `
@import "@agentview/studio/styles.css";
@source "node_modules/@agentview/studio";
`;
      }
    },

    configureServer(server: ViteDevServer) {
      // SPA fallback - serve virtual HTML for navigation requests
      // Return function so it runs after Vite's internal middleware
      return () => {
        server.middlewares.use(async (req, res, next) => {
          const accept = req.headers.accept || "";
          if (!accept.includes("text/html")) {
            return next();
          }

          const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AgentView Studio</title>
  </head>
  <body>
    <div id="agentview"></div>
    <script type="module" src="/${VIRTUAL_ENTRY_ID}"></script>
  </body>
</html>`;

          const transformed = await server.transformIndexHtml(
            req.url || "/",
            html,
          );
          res.setHeader("Content-Type", "text/html");
          res.statusCode = 200;
          res.end(transformed);
        });
      };
    },
  };
}

export interface DevServerOptions {
  port?: number;
}

export async function startDevServer(
  configPath: string,
  options: DevServerOptions = {},
) {
  const { createServer } = await import("vite");
  const tailwindcss = (await import("@tailwindcss/vite")).default;
  const react = (await import("@vitejs/plugin-react")).default;

  const configDir = path.dirname(configPath);
  const port = options.port ?? 1989;

  const server = await createServer({
    configFile: false,
    root: configDir,
    plugins: [tailwindcss(), react(), agentviewDevPlugin(configPath)],
    server: {
      port,
      host: "0.0.0.0",
    },
    esbuild: {
      jsx: "automatic",
    },
  });

  await server.listen();
  server.printUrls();
}
