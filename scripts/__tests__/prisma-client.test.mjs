// Unit tests for scripts/prisma-client.mjs. Run: node --test scripts/__tests__/
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { ensurePrismaClient, planPrismaClient, sameSchema } from "../prisma-client.mjs";

const MAIN_SCHEMA = "model User {\n  id    String @id\n  email String\n}\n";
const BRANCH_SCHEMA = "model User {\n  id    String @id\n  email String\n  name  String?\n}\n";

let root;
let generated;
let logs;

const write = (path, content) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};

// A checkout's backend/ with its schema and, unless null, a generated client.
const backend = (name, { schema, client = schema, modules = true }) => {
  const dir = join(root, name, "backend");
  write(join(dir, "prisma", "schema.prisma"), schema);
  if (modules) mkdirSync(join(dir, "node_modules"), { recursive: true });
  if (modules && client !== null) write(join(dir, "node_modules", ".prisma", "client", "schema.prisma"), client);
  return dir;
};

// A worktree's backend/ whose node_modules is a symlink to the main checkout's.
const worktree = (schema, mainDir) => {
  const dir = backend("worktree", { schema, modules: false });
  symlinkSync(join(mainDir, "node_modules"), join(dir, "node_modules"));
  return dir;
};

const ensure = (backendDir, generate = (dir) => generated.push(dir)) =>
  ensurePrismaClient({ backendDir, generate, log: (line) => logs.push(line) });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "prisma-client-"));
  generated = [];
  logs = [];
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

test("sameSchema ignores formatting but not content", () => {
  assert.equal(sameSchema("model A {\n  id  String @id\n}\n", "model A {\n  id String  @id\n}"), true);
  assert.equal(sameSchema(MAIN_SCHEMA, BRANCH_SCHEMA), false);
});

test("planPrismaClient regenerates only a client this checkout may rewrite", () => {
  const plan = (overrides) =>
    planPrismaClient({ schema: MAIN_SCHEMA, clientSchema: MAIN_SCHEMA, ownerSchema: null, shared: false, ...overrides });

  assert.equal(plan({}), "ok");
  assert.equal(plan({ clientSchema: BRANCH_SCHEMA }), "generate");
  assert.equal(plan({ clientSchema: null }), "generate");
  assert.equal(plan({ clientSchema: BRANCH_SCHEMA, shared: true, ownerSchema: MAIN_SCHEMA }), "generate");
  assert.equal(plan({ schema: BRANCH_SCHEMA, shared: true, ownerSchema: MAIN_SCHEMA }), "own-install");
  assert.equal(plan({ clientSchema: BRANCH_SCHEMA, shared: true, ownerSchema: null }), "own-install");
});

test("ensurePrismaClient leaves a matching client alone", () => {
  const dir = backend("main", { schema: MAIN_SCHEMA, client: MAIN_SCHEMA.replace("id    String", "id String") });

  assert.equal(ensure(dir), true);
  assert.deepEqual(generated, []);
  assert.deepEqual(logs, []);
});

test("ensurePrismaClient regenerates a stale client of the checkout's own node_modules", () => {
  const dir = backend("main", { schema: MAIN_SCHEMA, client: BRANCH_SCHEMA });

  assert.equal(ensure(dir), true);
  assert.deepEqual(generated, [dir]);
  assert.match(logs.join("\n"), /running `prisma generate`/);
});

test("ensurePrismaClient regenerates a missing client", () => {
  const dir = backend("main", { schema: MAIN_SCHEMA, client: null });

  assert.equal(ensure(dir), true);
  assert.deepEqual(generated, [dir]);
});

test("ensurePrismaClient restores a shared client another branch generated when the schema is main's", () => {
  const mainDir = backend("main", { schema: MAIN_SCHEMA, client: BRANCH_SCHEMA });
  const dir = worktree(MAIN_SCHEMA, mainDir);

  assert.equal(ensure(dir), true);
  assert.deepEqual(generated, [dir]);
});

test("ensurePrismaClient refuses to rewrite a shared client with a branch's own schema", () => {
  const mainDir = backend("main", { schema: MAIN_SCHEMA });
  const dir = worktree(BRANCH_SCHEMA, mainDir);

  assert.equal(ensure(dir), false);
  assert.deepEqual(generated, []);
  const message = logs.join("\n");
  assert.match(message, new RegExp(`symlink to ${join(root, "main", "backend")}/node_modules`));
  assert.match(message, /rm backend\/node_modules && \(cd backend && npm ci && npx prisma generate\)/);
});

test("ensurePrismaClient skips a checkout without node_modules or schema", () => {
  assert.equal(ensure(backend("main", { schema: MAIN_SCHEMA, modules: false })), true);
  assert.equal(ensure(join(root, "empty")), true);
  assert.deepEqual(generated, []);
});

test("ensurePrismaClient reports a failed prisma generate", () => {
  const dir = backend("main", { schema: MAIN_SCHEMA, client: BRANCH_SCHEMA });
  const fail = () => {
    throw Object.assign(new Error("Command failed: npx prisma generate"), { stderr: "Error: P1012 schema invalid" });
  };

  assert.equal(ensure(dir, fail), false);
  assert.match(logs.join("\n"), /prisma generate failed:\n[\s\S]*P1012 schema invalid/);
});
