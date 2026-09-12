// Fixture-based test for scripts/install-git-hooks.mjs. Run: node --test scripts/__tests__/
// Real git in a temp repo; the script is copied in so it resolves that repo as its root.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dispatcherScript, isDispatcher } from "../install-git-hooks.mjs";

const SCRIPT = join(dirname(dirname(fileURLToPath(import.meta.url))), "install-git-hooks.mjs");
const hookBody = (name, exitCode = 0) => `#!/bin/sh\necho ${name} >> "$HOOK_LOG"\nexit ${exitCode}\n`;

let root;
let repo;
let env;

const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const writeHook = (dir, body) => {
  writeFileSync(join(dir, ".githooks", "pre-commit"), body);
  chmodSync(join(dir, ".githooks", "pre-commit"), 0o755);
};

const scaffold = (dir) => {
  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, ".githooks"));
  copyFileSync(SCRIPT, join(dir, "scripts", "install-git-hooks.mjs"));
  writeHook(dir, hookBody("main"));
};

const install = (cwd = repo) =>
  spawnSync("node", [join(cwd, "scripts", "install-git-hooks.mjs")], { cwd, env, encoding: "utf8" });

const commitFile = (cwd, name) => {
  writeFileSync(join(cwd, name), name);
  git(cwd, "add", name);
  return spawnSync("git", ["commit", "-q", "-m", name], { cwd, env, encoding: "utf8" });
};

const hookRuns = () =>
  existsSync(env.HOOK_LOG) ? readFileSync(env.HOOK_LOG, "utf8").trim().split("\n") : [];

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "install-git-hooks-"));
  repo = join(root, "repo");
  env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
    HOOK_LOG: join(root, "hook.log"),
  };
  mkdirSync(repo);
  git(repo, "init", "-q", "-b", "main");
  scaffold(repo);
  git(repo, "add", ".");
  git(repo, "commit", "-q", "--no-verify", "-m", "init");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

test("isDispatcher recognizes only the generated script", () => {
  assert.equal(isDispatcher(dispatcherScript("pre-commit")), true);
  assert.equal(isDispatcher("#!/bin/sh\nnpx lint-staged\n"), false);
});

test("installs an executable dispatcher into the shared hooks dir", () => {
  const res = install();

  assert.equal(res.status, 0, res.stderr);
  const target = join(repo, ".git", "hooks", "pre-commit");
  assert.equal(readFileSync(target, "utf8"), dispatcherScript("pre-commit"));
  assert.ok(statSync(target).mode & 0o100);
});

test("installs dispatchers only for the extensionless files in .githooks/", () => {
  writeFileSync(join(repo, ".githooks", "README.md"), "docs\n");

  assert.equal(install().status, 0);
  assert.equal(readFileSync(join(repo, ".git", "hooks", "pre-commit"), "utf8"), dispatcherScript("pre-commit"));
  assert.equal(existsSync(join(repo, ".git", "hooks", "README.md")), false);
});

test("each worktree runs its own .githooks/pre-commit", () => {
  install();
  const wt = join(root, "wt");
  git(repo, "worktree", "add", "-q", "-b", "wt", wt);
  writeHook(wt, hookBody("wt"));
  git(wt, "commit", "-q", "--no-verify", "-am", "wt hook");

  assert.equal(commitFile(repo, "a.txt").status, 0);
  assert.equal(commitFile(wt, "b.txt").status, 0);
  assert.deepEqual(hookRuns(), ["main", "wt"]);
});

test("a failing hook blocks the commit", () => {
  writeHook(repo, hookBody("main", 1));
  git(repo, "commit", "-q", "--no-verify", "-am", "failing hook");
  install();

  assert.notEqual(commitFile(repo, "a.txt").status, 0);
  assert.deepEqual(hookRuns(), ["main"]);
});

test("a branch without .githooks/ commits without running anything", () => {
  assert.equal(install().status, 0);
  assert.equal(readFileSync(join(repo, ".git", "hooks", "pre-commit"), "utf8"), dispatcherScript("pre-commit"));
  git(repo, "rm", "-q", "-r", ".githooks");
  git(repo, "commit", "-q", "--no-verify", "-m", "drop hooks");

  assert.equal(commitFile(repo, "a.txt").status, 0);
  assert.deepEqual(hookRuns(), []);
});

test("follows an absolute core.hooksPath", () => {
  const hooksDir = join(root, "shared-hooks");
  git(repo, "config", "core.hooksPath", hooksDir);

  assert.equal(install().status, 0);
  assert.equal(readFileSync(join(hooksDir, "pre-commit"), "utf8"), dispatcherScript("pre-commit"));
});

test("does not install into a core.hooksPath from the global git config", () => {
  const hooksDir = join(root, "global-hooks");
  env.GIT_CONFIG_GLOBAL = join(root, "gitconfig");
  writeFileSync(env.GIT_CONFIG_GLOBAL, `[core]\n\thooksPath = ${hooksDir}\n`);

  const res = install();

  assert.equal(res.status, 0);
  assert.equal(existsSync(join(hooksDir, "pre-commit")), false);
  assert.match(res.stderr, /global git config/);
});

test("does not install into another checkout's .githooks/", () => {
  const otherHooks = join(root, "other", ".githooks");
  mkdirSync(otherHooks, { recursive: true });
  git(repo, "config", "core.hooksPath", otherHooks);

  const res = install();

  assert.equal(res.status, 0);
  assert.equal(existsSync(join(otherHooks, "pre-commit")), false);
  assert.match(res.stderr, /every worktree runs that checkout's hooks/);
});

test("leaves a hook it did not install untouched", () => {
  const target = join(repo, ".git", "hooks", "pre-commit");
  writeFileSync(target, "#!/bin/sh\nexit 0\n");

  const res = install();

  assert.equal(res.status, 0);
  assert.equal(readFileSync(target, "utf8"), "#!/bin/sh\nexit 0\n");
  assert.match(res.stderr, /left as is/);
});

test("re-running refreshes its own dispatcher", () => {
  const target = join(repo, ".git", "hooks", "pre-commit");
  writeFileSync(target, dispatcherScript("pre-commit").replace("exec", "exec  "));

  assert.equal(install().status, 0);
  assert.equal(readFileSync(target, "utf8"), dispatcherScript("pre-commit"));
});

test("does not write into .githooks/ when core.hooksPath already points there", () => {
  git(repo, "config", "core.hooksPath", ".githooks");

  const res = install();

  assert.equal(res.status, 0);
  assert.equal(readFileSync(join(repo, ".githooks", "pre-commit"), "utf8"), hookBody("main"));
  assert.match(res.stdout, /nothing to do/);
});

test("skips outside a git checkout", () => {
  const plain = join(root, "plain");
  scaffold(plain);

  const res = install(plain);

  assert.equal(res.status, 0);
  assert.match(res.stdout, /not a git checkout/);
});
