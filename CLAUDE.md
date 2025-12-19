# AgentView

The project is build as a pnpm monorepo.

## Docs

To learn about project read docs. You can find them in `apps/docs`. `apps/docs/docs.json` has a ToC.

## Backend

AgentView has a backend API server. You can find the code in `apps/api`. Infra for local development is defined in `docker-compose.yml` in a root directory.

To run infra, just run `docker compose up`.
To run API server just run `pnpm run api:dev` (under the hood it run both http server and workers).
Server will be running on port defined by env: `AGENTVIEW_API_PORT`.

All the environment variables are defined in root `.env`, packages and apps use this file (with exception for `apps/examples/*`).

The API exposed by backend is called AgentView API.

### Clearing db

You can clear entire system state with `pnpm run db:clear`. If you need to do it -> no worries, just do it.

### Seeding users after clearing db, setting up API Key

You can run `pnpm run seed-users` to generate example users (it's done directly via AgentView API). This script creates 3 users:
- admin@acme.com (admin)
- bob@acme.com (user)
- alice@acme.com (user)

It also generates api key for admin@acme.com user. The script saves api key to `.env` file. Later the tests in `api/tests` run using this API Key.

If you need different setup of users, you can look at `seed-users` script, build your own and run it.

Seeding is *not* indempotent! Always clear db before running it.

### Migrations

AgentView uses Drizzle. To build a new migration just run `npx drizzle-kit generate` in `apps/api`.
Important: migrations are applied automatically when you run HTTP server, so in order to apply them just restart the HTTP server.

### Interacting with API

You can use API directly, but it's much easier to use SDKs. API has 2 parts:
- built by us: the SDK for our endpoints is in `packages/agentview`. It's heavily used in `apps/tests` and in example projects.
- authentication from "better-auth" library. In this case you can use "better-auth" SDK. For example it's used in `apps/tests` in `seed-users` script.

When you build new backend features try to write tests in `apps/tests` that have nice scenarios and run them to confirm whether everything works. Use SDK if possible (we want to prioritize dogfooding our own SDK).

## TypeScript SDK: `packages/agentview`

It works during development out-of-the-box. You don't have to build anything, `package.json` from the package exposes TypeScript files directly in dev.

## Example projects

Example AgentView projects are in `apps/examples/{project}`. Each project has 3 parts:
- configuration file (`agentview.config.tsx`)
- Studio (run `npm run dev` in an example project)
- Agent Endpoint (run `npm run agent:dev` in an example project)

In most cases you won't need to run example projects. Just build features and test them via tests in `api/tests` project.

## UI Studio: `packages/studio`

Users can run their own instance of UI Studio which is a React package (similar to Sanity CMS Studio). You don't have to build anything during dev, `package.json` from the package exposes TypeScript files directly in dev.

Testing studio must always be done via example project.

Do not play with UI unless I explicitly say to do so.

## Rules

- be concise
- if something is unclear ask clarifying question
- do not touch UI Studio or run example projects unless explicitly said to do it.
- when you build backend features, please test features "end-to-end", which means directly on the API. The best way to do it is to add tests in `apps/tests`. Try to use our SDK if possible, we want to be dogfooding our SDK. You can extend it if you need. For operations related to authentication also use API directly, the easiest way to do it is via better-auth client SDK (check out `seed-users` script in `apps/tests`).