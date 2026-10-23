// Importing the Prisma client loads backend/.env into process.env, as it does for the app.
import "@prisma/client";

import { validateDeployEnv } from "../utils/validateEnv";

try {
  validateDeployEnv();
  console.log("Environment OK");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
