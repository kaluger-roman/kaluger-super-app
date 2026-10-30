#!/usr/bin/env node
// Keeps the generated Prisma client in step with backend/prisma/schema.prisma of this checkout.
//
// Usage: node scripts/prisma-client.mjs   (exit 0 when the client is usable, 1 otherwise)
//
// Worktrees symlink backend/node_modules from the main checkout, so they all share one client in
// node_modules/.prisma/client, and `prisma generate` in any of them rewrites it for all. A client
// left behind by another branch makes tsc and hundreds of backend tests fail as if this branch
// broke them. Before backend checks:
//   - the client matches this schema → nothing to do;
//   - node_modules is this checkout's own, or this schema equals the schema of the checkout the
//     symlink points to → `prisma generate` here (it restores what that checkout expects);
//   - the symlink is shared and this branch's schema differs → stop with a hint: generating would
//     break the main checkout and the other worktrees, the branch needs its own `npm ci`.
// Formatting-only differences (prisma format realigning columns) do not count.

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SCHEMA = join("prisma", "schema.prisma");
const CLIENT_SCHEMA = join(".prisma", "client", "schema.prisma");

const normalize = (schema) => schema.replace(/\s+/g, " ").trim();

export const sameSchema = (a, b) => normalize(a) === normalize(b);

// "ok", "generate" or "own-install". clientSchema / ownerSchema are null when the file is missing.
export const planPrismaClient = ({ schema, clientSchema, ownerSchema, shared }) => {
  if (clientSchema !== null && sameSchema(schema, clientSchema)) return "ok";
  if (!shared || (ownerSchema !== null && sameSchema(schema, ownerSchema))) return "generate";
  return "own-install";
};

const readOrNull = (path) => (existsSync(path) ? readFileSync(path, "utf8") : null);

const runGenerate = (backendDir) =>
  execFileSync("npx", ["prisma", "generate"], { cwd: backendDir, stdio: "pipe", encoding: "utf8" });

// True when the backend checks can run against the client.
export const ensurePrismaClient = ({ backendDir, generate = runGenerate, log = console.error }) => {
  const modules = join(backendDir, "node_modules");
  const schemaPath = join(backendDir, SCHEMA);
  // No install yet: the checks fail on their own with a clearer message.
  if (!existsSync(modules) || !existsSync(schemaPath)) return true;

  const shared = lstatSync(modules).isSymbolicLink();
  const ownerBackend = dirname(realpathSync(modules));
  const action = planPrismaClient({
    schema: readFileSync(schemaPath, "utf8"),
    clientSchema: readOrNull(join(modules, CLIENT_SCHEMA)),
    ownerSchema: shared ? readOrNull(join(ownerBackend, SCHEMA)) : null,
    shared,
  });
  if (action === "ok") return true;

  if (action === "own-install") {
    log(
      [
        "The Prisma client in backend/node_modules was generated from another schema.prisma.",
        `backend/node_modules is a symlink to ${ownerBackend}/node_modules, and that checkout's`,
        "schema.prisma differs from this one, so `prisma generate` here would break it and every",
        "worktree sharing it. Give this worktree its own install:",
        "  rm backend/node_modules && (cd backend && npm ci && npx prisma generate)",
        "If this branch does not change schema.prisma, the main checkout is behind: `git pull` there,",
        "then `npx prisma generate` in its backend/.",
      ].join("\n")
    );
    return false;
  }

  log("The Prisma client does not match backend/prisma/schema.prisma; running `prisma generate`.");
  try {
    generate(backendDir);
    return true;
  } catch (error) {
    log(`prisma generate failed:\n${[error.stdout, error.stderr, error.message].filter(Boolean).join("\n")}`);
    return false;
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(ensurePrismaClient({ backendDir: join(REPO_ROOT, "backend") }) ? 0 : 1);
}
