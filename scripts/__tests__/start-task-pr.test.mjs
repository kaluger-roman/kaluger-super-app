// Fixture-based test for scripts/start-task-pr.mjs. Run: node --test scripts/__tests__/
// Real git (temp repo + bare "origin"), fake `gh` on PATH that logs its calls.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { toHttpsRemote } from "../start-task-pr.mjs";

const SCRIPT = join(dirname(dirname(fileURLToPath(import.meta.url))), "start-task-pr.mjs");
const SESSION_ID = "11111111-2222-3333-4444-555555555555";

const FAKE_GH = `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
const stdin = args.includes("-") ? fs.readFileSync(0, "utf8") : null;
fs.appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify({ args, stdin }) + "\\n");
const [a, b] = args;
if (a === "pr" && b === "list") process.stdout.write(process.env.FAKE_GH_PR_LIST || "[]");
if (a === "pr" && b === "view") process.stdout.write(process.env.FAKE_GH_PR_VIEW || '{"body":"","comments":[]}');
if (a === "pr" && b === "create") process.stdout.write("https://github.com/o/r/pull/99\\n");
`;

let root;
let work;
let origin;
let env;

const sh = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const ghCalls = () =>
  existsSync(env.FAKE_GH_LOG)
    ? readFileSync(env.FAKE_GH_LOG, "utf8").trim().split("\n").map((l) => JSON.parse(l))
    : [];
const ghCall = (sub) => ghCalls().find((c) => c.args[1] === sub);
const runScript = (...args) => spawnSync("node", [SCRIPT, ...args], { cwd: work, env, encoding: "utf8" });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "start-task-pr-"));
  origin = join(root, "origin.git");
  work = join(root, "work");
  sh(root, "init", "--quiet", "--bare", "-b", "main", origin);
  sh(root, "init", "--quiet", "-b", "main", work);
  sh(work, "config", "user.email", "t@example.com");
  sh(work, "config", "user.name", "T");
  writeFileSync(join(work, "a.txt"), "a\n");
  sh(work, "add", ".");
  sh(work, "commit", "--quiet", "-m", "init");
  sh(work, "remote", "add", "origin", origin);
  sh(work, "push", "--quiet", "origin", "main");
  sh(work, "checkout", "--quiet", "-b", "fix-thing");

  const bin = join(root, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "gh"), FAKE_GH);
  chmodSync(join(bin, "gh"), 0o755);

  const config = join(root, "claude");
  mkdirSync(join(config, "projects", "-launch-dir"), { recursive: true });
  writeFileSync(
    join(config, "projects", "-launch-dir", `${SESSION_ID}.jsonl`),
    `{"type":"system"}\n{"cwd":"/launch/dir","sessionId":"${SESSION_ID}"}\n`
  );

  env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    FAKE_GH_LOG: join(root, "gh.log"),
    CLAUDE_CONFIG_DIR: config,
    CLAUDE_CODE_SESSION_ID: SESSION_ID,
    CLAUDE_CODE_BRIDGE_SESSION_ID: "session_web123",
    START_TASK_PR_REMOTE_URL: origin,
  };
  delete env.FAKE_GH_PR_LIST;
  delete env.FAKE_GH_PR_VIEW;
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

test("new branch without commits: empty commit, push, draft PR with session", () => {
  const res = runScript("--title", "Fix the thing", "--summary", "Уроки не удаляются.");
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.equal(out.action, "created");
  assert.equal(out.url, "https://github.com/o/r/pull/99");

  assert.equal(sh(work, "rev-list", "--count", "main..HEAD"), "1");
  assert.equal(sh(work, "diff", "--name-only", "main", "HEAD"), "");
  assert.match(sh(work, "log", "-1", "--format=%B"), /^chore: start "Fix the thing"\n\nClaude-Session-Id: 11111111-/);
  assert.equal(sh(origin, "rev-parse", "refs/heads/fix-thing"), sh(work, "rev-parse", "HEAD"));

  const create = ghCall("create");
  assert.deepEqual(create.args.slice(0, 9), [
    "pr",
    "create",
    "--draft",
    "--base",
    "main",
    "--head",
    "fix-thing",
    "--title",
    "Fix the thing",
  ]);
  assert.match(create.stdin, /Уроки не удаляются\./);
  assert.match(create.stdin, /## Сессии Claude Code/);
  assert.match(create.stdin, new RegExp(`cd /launch/dir && claude --resume ${SESSION_ID}`));
  assert.match(create.stdin, /web: https:\/\/claude\.ai\/code\/session_web123/);
});

test("staged changes are not swallowed into the empty commit", () => {
  writeFileSync(join(work, "b.txt"), "b\n");
  sh(work, "add", "b.txt");
  const res = runScript("--title", "T");
  assert.equal(res.status, 0, res.stderr);
  assert.equal(sh(work, "diff", "--name-only", "main", "HEAD"), "");
  assert.equal(sh(work, "diff", "--cached", "--name-only"), "b.txt");
});

test("branch already ahead of base: no extra commit", () => {
  writeFileSync(join(work, "c.txt"), "c\n");
  sh(work, "add", "c.txt");
  sh(work, "commit", "--quiet", "-m", "real work");
  const head = sh(work, "rev-parse", "HEAD");
  const res = runScript("--title", "T");
  assert.equal(res.status, 0, res.stderr);
  assert.equal(JSON.parse(res.stdout).emptyCommit, null);
  assert.equal(sh(work, "rev-parse", "HEAD"), head);
  assert.equal(sh(origin, "rev-parse", "refs/heads/fix-thing"), head);
});

test("open PR from another session: comments this session, no commit or new PR", () => {
  env.FAKE_GH_PR_LIST = '[{"number":7,"url":"https://github.com/o/r/pull/7"}]';
  env.FAKE_GH_PR_VIEW = '{"body":"started in `aaaa`","comments":[]}';
  const res = runScript("--title", "T");
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(JSON.parse(res.stdout), { action: "session-added", url: "https://github.com/o/r/pull/7" });
  const comment = ghCall("comment");
  assert.equal(comment.args[2], "7");
  assert.match(comment.stdin, new RegExp(SESSION_ID));
  assert.equal(ghCall("create"), undefined);
  assert.equal(sh(work, "rev-list", "--count", "main..HEAD"), "0");
});

test("open PR already mentioning this session: no-op", () => {
  env.FAKE_GH_PR_LIST = '[{"number":7,"url":"https://github.com/o/r/pull/7"}]';
  env.FAKE_GH_PR_VIEW = JSON.stringify({ body: "x", comments: [{ body: `Продолжение: ${SESSION_ID}` }] });
  const res = runScript("--title", "T");
  assert.equal(res.status, 0, res.stderr);
  assert.equal(JSON.parse(res.stdout).action, "exists");
  assert.equal(ghCall("comment"), undefined);
});

test("without a Claude session: PR body has no sessions section", () => {
  delete env.CLAUDE_CODE_SESSION_ID;
  const res = runScript("--title", "T");
  assert.equal(res.status, 0, res.stderr);
  assert.doesNotMatch(ghCall("create").stdin, /Сессии Claude Code/);
  assert.equal(sh(work, "log", "-1", "--format=%B"), 'chore: start "T"');
});

test("refuses to run on main and without --title", () => {
  assert.notEqual(runScript().status, 0);
  sh(work, "checkout", "--quiet", "main");
  const res = runScript("--title", "T");
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /refusing/);
  assert.equal(ghCalls().length, 0);
});

test("toHttpsRemote converts GitHub SSH URLs and leaves others alone", () => {
  assert.equal(toHttpsRemote("git@github.com:o/r.git"), "https://github.com/o/r.git");
  assert.equal(toHttpsRemote("ssh://git@github.com/o/r.git"), "https://github.com/o/r.git");
  assert.equal(toHttpsRemote("https://github.com/o/r.git"), "https://github.com/o/r.git");
  assert.equal(toHttpsRemote("/tmp/origin.git"), "/tmp/origin.git");
});
