# AgentView

The project is build as a pnpm monorepo.

## Docs

To learn about project read docs. You can find them in `apps/docs`. `apps/docs/docs.json` has a ToC.

## Backend

AgentView has a backend API server. It's in `apps/api`. Everything related to backend server is in this package (http server code, `docker-compose.yml`, workers, etc).

To run infra, run `docker compose up` in the `apps/api` (just postgres)
Then you can run http server with `npm run dev:http`, workers with `npm run dev:workers` or just `npm run dev` to run both (both must be running).

Server will be running on port defined by env: `AGENTVIEW_API_PORT`.
Postgres URL and credentials also depend on envs, the exact env names can be found here: `apps/api/.env` (remember that if environment have those envs defined, then it will override values from `.env`).

The API exposed by backend is called AgentView API.

### Clearing db

You can clear entire system state with `npm run db:clear` in `apps/api`. If you need to do it -> no worries, just do it.

### Seeding users after clearing db, setting up API Key

You can run `npm run seed-users` in `apps/tests` to generate example users (it's done directly via AgentView API). You can also build your own script or add users however you want.

The seed scripts generates API Key for the admin user. This is important because most operations require API Key, so save it. We use consistent environment variables naming across the projects, so you can simply save it to `AGENTVIEW_API_KEY` env and all code in `apps/tests` and example projects should run correctly.

Seeding is *not* indempotent! Always clear db before running it.

### Migrations

AgentView uses Drizzle. To build a new migration just run `npx drizzle-kit generate` in `apps/api`.
Important: migrations are applied automatically when you run HTTP server, so in order to apply them just restart the HTTP server.

### Interacting with API

You can use API directly, but it's much easier to use SDKs. API has 2 parts:
- built by us: the SDK for our endpoints is in `packages/agentview`. It's heavily used in `apps/tests`, but also in example projects (see below).
- authentication from "better-auth" library. In this case you can use "better-auth" SDK. It's used in `apps/tests` in `seed-users` script.

When you build new backend features try to write tests in `apps/tests` that have nice scenarios and run them to confirm whether everything works. Use SDK if possible (we want to prioritize dogfooding our own SDK).

## TypeScript SDK: `packages/agentview`

It works during development out-of-the-box. You don't have to build anything, `package.json` from the package exposes TypeScript files directly in dev.

## Example projects

Example projects are in `apps/examples/{project}`.

Each project using AgentView comes with its own custom configuration done in code. The configuration file is called `agentview.config.tsx`. This file controls both configuration of UI Studio AND backend for the project. Therefore, it must be sent to the backend before playing with example project.

The configuration file for each project is in `apps/examples/{project}/studio/agentview.config.tsx`.

In order to send this file to the backend, you can simply run `npx agentview config push` from the `studio` directory. It will automatically upload configuration to the backend.

### Studio

In order to open UI Studio go to `apps/examples/{project}/studio` and run `npm run dev` to open UI Studio. *Do not do it* unless I explicitly say to do it.

### Agent Endpoint

Each example project has agent subproject: `apps/examples/{project}/agent`. Agent is a tiny http server with Agent Endpoint (described in docs).

## UI Studio: `packages/studio`

Users can run their own instance of UI Studio which is a React package (similar to Sanity CMS Studio). You don't have to build anything during dev, `package.json` from the package exposes TypeScript files directly in dev.

Testing studio must always be done via example project.

Do not play with UI unless I explicitly say to do so.

## Rules

- be concise
- if something is unclear ask clarifying question
- do not touch UI Studio unless explicitly said to do it.
- when you build backend features, please test features "end-to-end", which means directly on the API. The best way to do it is to add tests in `apps/tests`. Try to use our SDK if possible, we want to be dogfooding our SDK. You can extend it if you need. For operations related to authentication also use API directly, the easiest way to do it is via better-auth client SDK (check out `seed-users` script in `apps/tests`).