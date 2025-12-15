import dotenv from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

let dir = dirname(fileURLToPath(import.meta.url));
while (!fs.existsSync(join(dir, ".git"))) dir = dirname(dir);

dotenv.config({ path: join(dir, ".env") });
