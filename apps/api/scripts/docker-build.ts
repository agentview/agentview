import "dotenv/config";
import { execSync } from "child_process";

if (!process.env.AGENTVIEW_API_IMAGE) {
  console.error("AGENTVIEW_API_IMAGE is not set");
  process.exit(1);
}

const command = `docker build -t ${process.env.AGENTVIEW_API_IMAGE} .`;

console.log(command);

execSync(command, { 
    stdio: "inherit"
});