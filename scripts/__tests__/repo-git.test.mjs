import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const SCRIPT = join(dirname(dirname(fileURLToPath(import.meta.url))), "repo-git.sh");
let root, repo, env;
const git = (...args) => execFileSync("git", args, { cwd: repo, env, stdio: "ignore" });
const run = (args, cwd = repo) => spawnSync("bash", [SCRIPT, ...args], { cwd, env, encoding: "utf8" });
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "repo-git-")); repo = join(root, "repo with spaces"); mkdirSync(repo); mkdirSync(join(root, "bin"));
  env = { ...process.env, PATH: `${join(root, "bin")}:${process.env.PATH}`, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "T", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "T", GIT_COMMITTER_EMAIL: "t@t" };
  for (const command of ["ssh", "findmnt"]) { const path = join(root, "bin", command); writeFileSync(path, `#!/bin/sh\ntouch '${join(root, "remote-called")}'\nexit 1\n`); chmodSync(path, 0o755); }
  git("init", "-q", "-b", "main"); writeFileSync(join(repo, "a.txt"), "a\n"); git("add", "."); git("commit", "-qm", "first commit");
  git("worktree", "add", "-q", "-b", "codex/task", join(root, "task worktree"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
test("cwd, relative -C and worktree .git pointers work locally with no remote probing", () => {
  assert.equal(run(["branch", "--show-current"]).stdout.trim(), "main");
  const result = run(["-C", "../task worktree", "branch", "--show-current"]);
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout.trim(), "codex/task"); assert.equal(existsSync(join(root, "remote-called")), false);
});
test("literal arguments containing shell metacharacters and Git exit codes survive", () => {
  const result = run(["log", "-1", "--format=%s | \"x\" 'y' $HOME $(echo no)"]);
  assert.equal(result.stdout.trim(), "first commit | \"x\" 'y' $HOME $(echo no)");
  writeFileSync(join(repo, "a.txt"), "changed\n"); assert.equal(run(["diff", "--quiet"]).status, 1);
});
test("missing -C value fails", () => { assert.equal(run(["-C"]).status, 2); assert.match(run(["-C", ""]).stderr, /needs a directory/); });
