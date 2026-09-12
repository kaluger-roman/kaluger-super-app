// Fixture-based test for .githooks/pre-commit. Run: node --test scripts/__tests__/
// Real git in a temp repo; lint-staged is a stub that logs its arguments.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HOOK = join(dirname(dirname(dirname(fileURLToPath(import.meta.url)))), ".githooks", "pre-commit");
const FAKE_LINT_STAGED = '#!/bin/sh\necho "$*" >> "$LINT_STAGED_LOG"\nexit "${LINT_STAGED_EXIT:-0}"\n';

let root;
let repo;
let env;

const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const write = (dir, file, content = `${file} ${Date.now()}\n`) => {
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  writeFileSync(join(dir, file), content);
};

const stage = (dir, ...files) => {
  files.forEach((file) => write(dir, file));
  git(dir, "add", ...files);
};

const runHook = (cwd = repo) => spawnSync("sh", [HOOK], { cwd, env, encoding: "utf8" });

const lintStagedCalls = () =>
  existsSync(env.LINT_STAGED_LOG) ? readFileSync(env.LINT_STAGED_LOG, "utf8").trim().split("\n") : [];

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pre-commit-hook-"));
  repo = join(root, "repo");
  env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
    LINT_STAGED_LOG: join(root, "lint-staged.log"),
  };
  mkdirSync(repo);
  git(repo, "init", "-q", "-b", "main");
  stage(repo, "frontend/src/app.ts", "backend/src/index.ts", "docs/readme.md");
  git(repo, "commit", "-q", "-m", "init");
  mkdirSync(join(repo, "frontend", "node_modules"));
  mkdirSync(join(repo, "backend", "node_modules"));
  write(repo, "node_modules/.bin/lint-staged", FAKE_LINT_STAGED);
  chmodSync(join(repo, "node_modules", ".bin", "lint-staged"), 0o755);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

test("does nothing when no frontend/src or backend/src file is staged", () => {
  stage(repo, "docs/readme.md");

  assert.equal(runHook().status, 0);
  assert.deepEqual(lintStagedCalls(), []);
});

test("runs lint-staged with --no-stash for staged package sources", () => {
  stage(repo, "frontend/src/app.ts", "backend/src/index.ts");

  const res = runHook();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(lintStagedCalls(), ["--no-stash"]);
});

test("fails the commit when lint-staged fails", () => {
  env.LINT_STAGED_EXIT = "1";
  stage(repo, "frontend/src/app.ts");

  assert.equal(runHook().status, 1);
});

test("ignores staged deletions", () => {
  git(repo, "rm", "-q", "frontend/src/app.ts");

  assert.equal(runHook().status, 0);
  assert.deepEqual(lintStagedCalls(), []);
});

test("requires node_modules of the package whose files are staged", () => {
  rmSync(join(repo, "frontend", "node_modules"), { recursive: true });
  stage(repo, "frontend/src/app.ts");

  const res = runHook();

  assert.equal(res.status, 1);
  assert.match(res.stderr, /frontend\/node_modules is missing/);
  assert.deepEqual(lintStagedCalls(), []);
});

test("does not require node_modules of a package with nothing staged", () => {
  rmSync(join(repo, "frontend", "node_modules"), { recursive: true });
  stage(repo, "backend/src/index.ts");

  assert.equal(runHook().status, 0);
  assert.deepEqual(lintStagedCalls(), ["--no-stash"]);
});

test("a worktree without a root install uses the main checkout's lint-staged", () => {
  const wt = join(root, "wt");
  git(repo, "worktree", "add", "-q", "-b", "wt", wt);
  mkdirSync(join(wt, "frontend", "node_modules"));
  stage(wt, "frontend/src/app.ts");

  const res = runHook(wt);

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(lintStagedCalls(), ["--no-stash"]);
});

test("fails with a hint when lint-staged is not installed", () => {
  rmSync(join(repo, "node_modules"), { recursive: true });
  stage(repo, "frontend/src/app.ts");

  const res = runHook();

  assert.equal(res.status, 1);
  assert.match(res.stderr, /lint-staged is not installed/);
});
