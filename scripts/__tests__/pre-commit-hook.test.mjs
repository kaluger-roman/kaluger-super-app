// Fixture-based test for .githooks/pre-commit. Run: node --test scripts/__tests__/
// Real git in a temp repo; lint-staged is a stub that logs its arguments, except in the last
// test, which runs the real one installed at the repo root.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const HOOK = join(REPO_ROOT, ".githooks", "pre-commit");
const FAKE_LINT_STAGED = '#!/bin/sh\necho "[$*]" >> "$LINT_STAGED_LOG"\nexit "${LINT_STAGED_EXIT:-0}"\n';
const lockfile = (prettierVersion) =>
  JSON.stringify({ packages: { "node_modules/prettier": { version: prettierVersion } } });

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
  assert.deepEqual(lintStagedCalls(), ["[--no-stash]"]);
});

test("fails the commit when lint-staged fails", () => {
  env.LINT_STAGED_EXIT = "1";
  stage(repo, "frontend/src/app.ts");

  assert.equal(runHook().status, 1);
  assert.deepEqual(lintStagedCalls(), ["[--no-stash]"]);
});

test("keeps lint-staged's backup stash when a staged file also has unstaged changes", () => {
  stage(repo, "frontend/src/app.ts");
  write(repo, "frontend/src/app.ts", "unstaged edit\n");

  assert.equal(runHook().status, 0);
  assert.deepEqual(lintStagedCalls(), ["[]"]);
});

test("a partially staged file outside frontend/src and backend/src also keeps the backup", () => {
  stage(repo, "frontend/src/app.ts", "docs/readme.md");
  write(repo, "docs/readme.md", "unstaged edit\n");

  assert.equal(runHook().status, 0);
  assert.deepEqual(lintStagedCalls(), ["[]"]);
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
  assert.deepEqual(lintStagedCalls(), ["[--no-stash]"]);
});

test("stops the commit when the installed prettier differs from the package's lockfile", () => {
  // As after pulling the main checkout without reinstalling: node_modules is symlinked from it.
  const mainFrontend = join(root, "main", "frontend");
  write(mainFrontend, "node_modules/prettier/package.json", '{ "version": "2.8.8" }\n');
  rmSync(join(repo, "frontend", "node_modules"), { recursive: true });
  symlinkSync(join(mainFrontend, "node_modules"), join(repo, "frontend", "node_modules"));
  write(repo, "frontend/package-lock.json", lockfile("3.9.6"));
  stage(repo, "frontend/src/app.ts");

  const res = runHook();

  assert.equal(res.status, 1);
  assert.match(res.stderr, /frontend\/node_modules has prettier 2\.8\.8, frontend\/package-lock\.json has 3\.9\.6/);
  assert.ok(res.stderr.includes(`run npm install in ${realpathSync(mainFrontend)}\n`), res.stderr);
  assert.deepEqual(lintStagedCalls(), []);
});

test("stops the commit when the package's lockfile has prettier but its node_modules does not", () => {
  write(repo, "backend/package-lock.json", lockfile("3.9.6"));
  stage(repo, "backend/src/index.ts");

  const res = runHook();

  assert.equal(res.status, 1);
  assert.match(res.stderr, /backend\/node_modules has no prettier, backend\/package-lock\.json has 3\.9\.6/);
  assert.deepEqual(lintStagedCalls(), []);
});

test("runs lint-staged when the installed prettier matches the package's lockfile", () => {
  write(repo, "frontend/package-lock.json", lockfile("3.9.6"));
  write(repo, "frontend/node_modules/prettier/package.json", '{ "version": "3.9.6" }\n');
  stage(repo, "frontend/src/app.ts");

  const res = runHook();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(lintStagedCalls(), ["[--no-stash]"]);
});

test("a worktree without a root install uses the main checkout's lint-staged", () => {
  const wt = join(root, "wt");
  git(repo, "worktree", "add", "-q", "-b", "wt", wt);
  mkdirSync(join(wt, "frontend", "node_modules"));
  stage(wt, "frontend/src/app.ts");

  const res = runHook(wt);

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(lintStagedCalls(), ["[--no-stash]"]);
});

test("fails with a hint when lint-staged is not installed", () => {
  rmSync(join(repo, "node_modules"), { recursive: true });
  stage(repo, "frontend/src/app.ts");

  const res = runHook();

  assert.equal(res.status, 1);
  assert.match(res.stderr, /lint-staged is not installed/);
});

test(
  "real lint-staged: a failed task leaves the unstaged hunks of a partially staged file in place",
  { skip: !existsSync(join(REPO_ROOT, "node_modules", ".bin", "lint-staged")) && "run npm install at the repo root" },
  () => {
    rmSync(join(repo, "node_modules"), { recursive: true });
    symlinkSync(join(REPO_ROOT, "node_modules"), join(repo, "node_modules"));
    write(repo, ".gitignore", "node_modules\n");
    // Two configs, as in the repo: with a single one, lint-staged matches its globs from the repo root.
    write(repo, "frontend/.lintstagedrc.json", '{ "src/**/*.ts": "node -e process.exit(1)" }\n');
    write(repo, "backend/.lintstagedrc.json", '{ "src/**/*.ts": "node -e process.exit(0)" }\n');
    git(repo, "add", ".gitignore", "frontend/.lintstagedrc.json", "backend/.lintstagedrc.json");
    git(repo, "commit", "-q", "-m", "lint-staged config");
    write(repo, "frontend/src/app.ts", "staged\n");
    git(repo, "add", "frontend/src/app.ts");
    write(repo, "frontend/src/app.ts", "staged\nunstaged\n");

    const res = runHook();

    assert.equal(res.status, 1, res.stdout + res.stderr);
    assert.equal(readFileSync(join(repo, "frontend", "src", "app.ts"), "utf8"), "staged\nunstaged\n");
    assert.equal(git(repo, "show", ":frontend/src/app.ts"), "staged");
    assert.equal(git(repo, "stash", "list"), "");
  }
);
