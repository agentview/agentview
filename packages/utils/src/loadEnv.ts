import dotenv from "dotenv";
import { getMonorepoRootPath  } from "./getMonorepoRootPath";
import path from "node:path";

dotenv.config({ path: path.join(getMonorepoRootPath(), ".env") } );
