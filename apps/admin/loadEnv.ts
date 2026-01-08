// this file is exception just for this app to load global env file. Normally we use @agentview/utils/loadEnv.
// this had to be done because vite can't load "ts" files exported from helper package and we rely on it.

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
