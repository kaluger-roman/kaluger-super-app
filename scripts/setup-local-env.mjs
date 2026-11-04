#!/usr/bin/env node
// Generate only local-development credentials; leave any existing env untouched.
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, "backend", ".env");
if (existsSync(target)) {
  console.log("backend/.env already exists; kept unchanged");
} else {
  const requireBackend = createRequire(join(root, "backend", "package.json"));
  const vapid = requireBackend("web-push").generateVAPIDKeys();
  const secret = () => randomBytes(32).toString("hex");
  const entries = {
    // A deliberately unusable fallback prevents bare Prisma commands selecting a shared DB.
    DATABASE_URL: "postgresql://dev:dev@127.0.0.1:1/use_dev_stack_wrapper",
    NODE_ENV: "development",
    HOST: "127.0.0.1",
    JWT_SECRET: secret(), ADMIN_JWT_SECRET: secret(), STUDENT_JWT_SECRET: secret(),
    RESEND_API_KEY: "re_local_dummy", EMAIL_FROM: "dev@local.test",
    VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey,
    VAPID_SUBJECT: "mailto:dev@local.test",
    ADMIN_EMAIL: "admin@dev.local",
    ADMIN_PASSWORD_HASH: requireBackend("bcryptjs").hashSync("DevAdmin!2026", 10),
    BACKUP_DIR: "backups",
  };
  const content = "# Local development only. Ports and DATABASE_URL come from scripts/dev-stack.sh.\n" +
    Object.entries(entries).map(([key, value]) => `${key}='${value}'`).join("\n") + "\n";
  writeFileSync(target, content, { flag: "wx", mode: 0o600 });
  console.log("Created backend/.env with fresh local keys (not printed). Dev admin: admin@dev.local / DevAdmin!2026");
}
