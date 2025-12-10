# AgentView

## General notes

- The project is build as a pnpm monorepo.

## Docs

To learn about project read docs. You can find them in `apps/docs`. `apps/docs/docs.json` has a ToC.

## Backend

AgentView has a backend API server. It's in `apps/api`. Everything related to backend server is in this repo (http server code, `docker-compose.yml`, workers, etc).

To run infra, run `docker compose up` in the `apps/api` (just postgres)
Then you can run server & workers with `npm run dev`.

### Migrations

AgentView uses Drizzle. To build a new migration just run `npx drizzle-kit generate` in `apps/api`.
Important: migrations are applied automatically when you run HTTP server, so in order to apply them just restart the HTTP server.

### `agentview` library

Users will interact with AgentView backend in 2 ways:
- from code: via SDK or direct API calls
- via UI Studio (gui)

UI Studio is shipped as a React package (similar to Sanity CMS Studio). Both SDK and UI Studio are in `packages/agentview` - the official agentview library.

If you make changes to the library, go to `packages/agentview` and run `npm run build` so that fresh build artifacts are available for example apps.

### Example apps

In `apps/examples` you can find example apps. Right now the only real example is `examples/ts-basic`.

Each example has 2 directories:
- `studio` - Studio app that uses `agentview` package to render UI Studio. to run it, just go to the directory and run `npm run dev`.
- `agent` - custom Agent Endpoint. To run it just go to the directory and run `npm run dev`.

The configuration file for an example project can be found in `studio/agentview.config.tsx`







Go to `packages/agentview` and run `npm run build` to build the lib so that other apps can use it.




In `packages/agentview` you'll find the most important library of UI tudio an




AgentView comes with UI Studio shipped as a React package that users can ship on their own. 









This is repo of AgentView.

To learn about project read docs in apps/docs