import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stackContext, allocateSlot } from "../stack-context.mjs";

const source = dirname(dirname(fileURLToPath(import.meta.url)));
let root;
let repo;
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const copyScripts = (dir) => {
  mkdirSync(join(dir, "scripts"), { recursive: true });
  for (const name of ["stack-context.mjs", "dev-stack.sh", "qa-stack.sh"]) copyFileSync(join(source, name), join(dir, "scripts", name));
};
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "local stack "));
  repo = join(root, "repo");
  mkdirSync(repo);
  git(repo, "init", "-b", "main");
  git(repo, "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "-m", "init");
  copyScripts(repo);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
const worktree = (name, branch) => {
  const dir = join(root, name);
  git(repo, "worktree", "add", ...(branch ? ["-b", branch] : ["--detach"]), dir, "HEAD");
  copyScripts(dir);
  return dir;
};
const ports = (cwd) => JSON.parse(execFileSync("bash", ["scripts/dev-stack.sh", "ports"], { cwd, encoding: "utf8" }));

test("main and two detached worktrees get different stable ports and projects", () => {
  const a = worktree("detached a");
  const b = worktree("detached b");
  const all = [repo, a, b].map(ports);
  assert.equal(new Set(all.map((p) => p.project)).size, 3);
  assert.equal(new Set(all.map((p) => p.dbPort)).size, 3);
  assert.equal(all[1].branch, "detached");
  assert.deepEqual(ports(a), all[1]);
  git(a, "switch", "-c", "codex/named-task");
  const renamed = ports(a);
  assert.equal(renamed.project, all[1].project);
  assert.equal(renamed.dbPort, all[1].dbPort);
  assert.equal(renamed.branch, "codex/named-task");
});

test("similarly sanitized branch names do not collide", () => {
  const a = ports(worktree("a", "codex/feature"));
  const b = ports(worktree("b", "codex-feature"));
  assert.notEqual(a.project, b.project);
  assert.notEqual(a.dbPort, b.dbPort);
});

test("concurrent processes allocate unique slots without losing registry entries", async () => {
  const dirs = Array.from({ length: 8 }, (_, i) => worktree(`wt${i}`));
  const results = await Promise.all(dirs.map((cwd) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(source, "stack-context.mjs"), "slot"], { cwd });
    let stdout = "", stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(Number(stdout.trim())) : reject(new Error(stderr)));
  })));
  assert.equal(new Set(results).size, dirs.length);
  assert.deepEqual(dirs.map((dir) => allocateSlot(stackContext(dir))), results);
});

test("corrupt registry fails closed without overwriting existing data", () => {
  const context = stackContext(repo);
  const path = join(context.common, "local-stack-ports.json");
  for (const content of ["broken", '{"one":1,"two":1}', '{"bad":0}']) {
    writeFileSync(path, content);
    assert.throws(() => allocateSlot(context));
    assert.equal(readFileSync(path, "utf8"), content);
  }
});

test("down preserves data and slot; reset requires confirmation and releases only this slot", () => {
  const bin = join(root, "bin");
  mkdirSync(bin);
  const log = join(root, "docker.log");
  writeFileSync(join(bin, "docker"), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$DOCKER_LOG"\n', { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, DOCKER_LOG: log };
  const a = ports(repo);
  const other = worktree("other");
  const b = ports(other);
  execFileSync("bash", ["scripts/dev-stack.sh", "down"], { cwd: repo, env });
  assert.doesNotMatch(readFileSync(log, "utf8"), /down -v/);
  assert.equal(ports(repo).dbPort, a.dbPort);
  assert.throws(() => execFileSync("bash", ["scripts/dev-stack.sh", "reset"], { cwd: repo, env, stdio: "pipe" }));
  execFileSync("bash", ["scripts/dev-stack.sh", "reset", "--yes"], { cwd: repo, env });
  assert.match(readFileSync(log, "utf8"), /down -v/);
  const context = stackContext(repo);
  assert.equal(Object.hasOwn(JSON.parse(readFileSync(join(context.common, "local-stack-ports.json"))), context.id), false);
  assert.equal(ports(other).dbPort, b.dbPort);
});

test("QA projects isolate detached checkouts and match the shared checkout identity", () => {
  const bin = join(root, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "docker"), '#!/bin/sh\nprintf "%s\\n" "$*"\n', { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  for (const dir of [repo, worktree("qa a"), worktree("qa b")]) {
    const output = execFileSync("bash", ["scripts/qa-stack.sh", "status"], { cwd: dir, env, encoding: "utf8" });
    assert.ok(output.includes(`-p qa-${stackContext(dir).id} -f `));
  }
});
