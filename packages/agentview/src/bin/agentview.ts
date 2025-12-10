#!/usr/bin/env node
import 'dotenv/config'
import { serializeConfig } from "../configUtils.js";

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { AgentViewConfig } from "../types.js";
import { AgentView } from "../AgentView.js";
import { AgentViewError } from "../AgentViewError.js";

const DEFAULT_CONFIG_FILES = [
  "agentview.config.ts",
  "agentview.config.tsx",
  "agentview.config.js"
];

const HELP_TEXT = `Usage: agentview <command> [options]

Commands:
  config push [--config <path>]   Send the config file to the AgentView server once
  config watch [--config <path>]  Watch the config file and sync on every change
  help                            Show this message

Options:
  -c, --config <path>             Path to agentviewconfig.ts (defaults to common filenames in the current directory)`;

async function main() {
  const [, , ...args] = process.argv;

  if (args.length === 0 || args[0] === "help" || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const [command, subcommand, ...rest] = args;

  if (command !== "config") {
    console.error(`Unknown command "${command}".`);
    printHelp(1);
    return;
  }

  if (subcommand !== "push" && subcommand !== "watch") {
    console.error(`Unknown subcommand "${subcommand}".`);
    printHelp(1);
    return;
  }

  let configPath: string;
  try {
    configPath = resolveConfigPath(rest);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
    return;
  }

  try {
    if (subcommand === "push") {
      await pushConfig(configPath);
    } else {
      await watchConfig(configPath);
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

function printHelp(exitCode = 0) {
  console.log(HELP_TEXT);
  if (exitCode !== null) {
    process.exit(exitCode);
  }
}

function resolveConfigPath(args: string[]): string {
  const optionIndex = args.findIndex((arg) => arg === "--config" || arg === "-c");

  if (optionIndex !== -1) {
    const explicitPath = args[optionIndex + 1];
    if (!explicitPath) {
      throw new Error("Missing value for --config");
    }

    const resolvedPath = path.resolve(process.cwd(), explicitPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Config file not found at ${explicitPath}`);
    }
    return resolvedPath;
  }

  for (const candidate of DEFAULT_CONFIG_FILES) {
    const candidatePath = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error(
    `Could not find config file. Looked for: ${DEFAULT_CONFIG_FILES.join(
      ", ",
    )}. Try --config <path>.`,
  );
}

async function loadConfig(configPath: string): Promise<AgentViewConfig> {
  const absolutePath = path.resolve(configPath);
  const specifier = pathToFileURL(absolutePath).href + `?t=${Date.now()}`;
  const ext = path.extname(absolutePath).toLowerCase();

  let moduleExports: any;
  try {
    if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
      moduleExports = await import(specifier);
    } else {
      const { tsImport } = await import("tsx/esm/api");
      moduleExports = await tsImport(specifier, { parentURL: import.meta.url });
    }
  } catch (error: any) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error(
        `Cannot load ${configPath}. If it's a TypeScript file, ensure "tsx" is installed.`,
      );
    }
    throw error;
  }

  const config =
    moduleExports?.default ??
    moduleExports?.config ??
    moduleExports?.agentviewConfig ??
    moduleExports;

  if (!config || typeof config !== "object") {
    throw new Error(`No config export found in ${configPath}`);
  }

  return config as AgentViewConfig;
}

function getApiBaseUrl(config: AgentViewConfig): string {
  const baseUrl = config.apiBaseUrl;
  if (!baseUrl) {
    throw new Error("apiBaseUrl is required in Agent View config.");
  }
  return baseUrl;
}

function getAPIKey(): string {
  const apiKey = process.env.AGENTVIEW_API_KEY;
  if (!apiKey) {
    throw new Error("you must set AGENTVIEW_API_KEY env var to push config.");
  }
  return apiKey;
}

async function pushConfig(configPath: string) {
  const config = await loadConfig(configPath);
//   const serializedConfig = serializeConfig(config);
  const baseUrl = getApiBaseUrl(config);
  const apiKey = getAPIKey();

  const av = new AgentView({
    apiBaseUrl: baseUrl,
    apiKey: apiKey,
  });

  try {
    await av.__updateConfig({ config });
  } catch (error) {
    if (error instanceof AgentViewError) {
      console.error(`Error (${error.statusCode}): ${error.message}`);
      console.error(error.details);
    }
    else {
      console.error("Unknown error");
      console.log(error);
    }
    process.exit(1);
  }

  console.log(`Config pushed to ${baseUrl}`);
}

async function watchConfig(configPath: string) {
  const relativePath = path.relative(process.cwd(), configPath) || configPath;
  console.log(`Watching ${relativePath} for changes...`);

  const pushAndReport = async () => {
    try {
      await pushConfig(configPath);
    } catch (error) {
      console.error((error as Error).message);
    }
  };

  await pushAndReport();

  let debounceTimer: NodeJS.Timeout | null = null;
  fs.watch(configPath, { persistent: true }, () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      pushAndReport();
    }, 100);
  });
}

void main();
