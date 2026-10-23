// Run by the deploy as `node --env-file=.env dist/scripts/checkEnv.js`.
import { validateDeployEnv } from "../utils/validateEnv";

try {
  validateDeployEnv();
  console.log("Environment OK");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
