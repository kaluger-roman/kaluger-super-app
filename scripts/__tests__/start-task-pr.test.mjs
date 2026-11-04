import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { toHttpsRemote, parseIssues, isLinked, addClosesToBody, parseArgs } from "../start-task-pr.mjs";

const SCRIPT = join(dirname(dirname(fileURLToPath(import.meta.url))), "start-task-pr.mjs");
const SESSION = "11111111-2222-3333-4444-555555555555";
const FAKE_GH = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const stdin = args.includes('-') ? fs.readFileSync(0, 'utf8') : null;
fs.appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify({args,stdin})+'\\n');
if (process.env.FAKE_GH_FAIL) { process.stderr.write('gh authentication failed'); process.exit(1); }
if (args[0] === 'pr' && args[1] === 'list') process.stdout.write(process.env.FAKE_GH_LIST || '[]');
if (args[0] === 'pr' && args[1] === 'view') process.stdout.write(args.includes('baseRefName,headRefOid,headRefName,isCrossRepository') ? process.env.FAKE_GH_REFS : process.env.FAKE_GH_VIEW || '{"body":"","comments":[]}');
if (args[0] === 'pr' && args[1] === 'create') process.stdout.write('https://github.com/o/r/pull/99\\n');
if (args[0] === 'repo' && args[1] === 'view') process.stdout.write(JSON.stringify({url:'https://github.com/o/r',defaultBranchRef:{name:'main'}}));
if (args[0] === 'api') {
  const branch = decodeURIComponent(args.at(-1).split('/heads/')[1]);
  const sha = require('node:child_process').execFileSync('git', ['rev-parse', 'refs/heads/'+branch], {cwd:process.env.START_TASK_PR_REMOTE_URL,encoding:'utf8'}).trim();
  process.stdout.write(JSON.stringify({ref:'refs/heads/'+branch,object:{type:'commit',sha}}));
}
`;
let root, work, origin, env;
const git = (cwd, ...args) => execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: work, env, encoding: "utf8" });
const calls = () => existsSync(env.FAKE_GH_LOG) ? readFileSync(env.FAKE_GH_LOG, "utf8").trim().split("\n").map(JSON.parse) : [];
const call = (action) => calls().find((entry) => entry.args[1] === action);
const commitFile = (file, content) => { writeFileSync(join(work, file), content); git(work, "add", file); git(work, "commit", "-qm", file); };
const openPR = () => { env.FAKE_GH_LIST = '[{"number":7,"url":"https://github.com/o/r/pull/7"}]'; };
const advanceOrigin = (file = "upstream.txt") => {
  git(work, "checkout", "-q", "main");
  commitFile(file, "upstream\n");
  git(work, "push", "-q", "origin", "main");
  const sha = git(work, "rev-parse", "HEAD");
  git(work, "reset", "--hard", "-q", "HEAD~1");
  git(work, "checkout", "-q", "codex/task");
  return sha;
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "codex-pr-")); work = join(root, "work"); origin = join(root, "origin.git");
  env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com", CODEX_HOME: join(root, "codex"), CODEX_THREAD_ID: SESSION, START_TASK_PR_REMOTE_URL: origin, FAKE_GH_LOG: join(root, "gh.log") };
  for (const key of ["FAKE_GH_LIST", "FAKE_GH_VIEW", "FAKE_GH_FAIL", "CODEX_SESSION_ID", "GH_REPO", "GH_HOST"]) delete env[key];
  git(root, "init", "--bare", "-q", "-b", "main", origin);
  git(root, "init", "-q", "-b", "main", work);
  commitFile("a.txt", "a\n");
  git(work, "remote", "add", "origin", "https://github.com/o/r.git"); git(work, "config", `url.${origin}.insteadOf`, "https://github.com/o/r.git");
  git(work, "push", "-q", "origin", "main"); git(work, "checkout", "-q", "-b", "codex/task");
  mkdirSync(join(root, "bin")); writeFileSync(join(root, "bin", "gh"), FAKE_GH); chmodSync(join(root, "bin", "gh"), 0o755);
  env.PATH = `${join(root, "bin")}:${process.env.PATH}`;
  const sessions = join(env.CODEX_HOME, "sessions", "2026", "11", "04"); mkdirSync(sessions, { recursive: true });
  writeFileSync(join(sessions, `rollout-2026-11-04-${SESSION}.jsonl`), `${JSON.stringify({ type: "session_meta", payload: { id: SESSION, cwd: "/private/launch folder" } })}\n{invalid unread transcript\n`);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

test("new task makes an empty draft, pushes and links Codex without leaking resume cwd", () => {
  const result = run("--title", "Fix the thing", "--summary", "Уроки не удаляются.");
  assert.equal(result.status, 0, result.stderr);
  const json = JSON.parse(result.stdout);
  assert.equal(json.action, "created"); assert.equal(json.behindBase, 0); assert.ok(json.emptyCommit);
  assert.equal(git(work, "diff", "--name-only", "main", "HEAD"), "");
  assert.equal(git(origin, "rev-parse", "refs/heads/codex/task"), git(work, "rev-parse", "HEAD"));
  assert.match(git(work, "log", "-1", "--format=%B"), /Codex-Session-Id: 11111111-/);
  assert.deepEqual(call("create").args.slice(0, 9), ["pr", "create", "--draft", "--base", "main", "--head", "codex/task", "--title", "Fix the thing"]);
  assert.match(call("create").stdin, /Уроки не удаляются/); assert.match(call("create").stdin, /codex resume 11111111-/);
  assert.doesNotMatch(call("create").stdin, /private|launch folder|claude/i);
  const metadata = JSON.parse(readFileSync(join(work, ".git", "codex-task-sessions.json"), "utf8"));
  assert.equal(metadata[0].resumeCwd, "/private/launch folder");
});

test("session flags override env and deprecated web alias stays private", () => {
  const result = run("--title", "T", "--session-id", "explicit-id", "--resume-cwd", "/another private/path", "--web-session-id", "old-web-id");
  assert.equal(result.status, 0, result.stderr); assert.match(result.stderr, /устарел/);
  assert.match(call("create").stdin, /explicit-id/); assert.doesNotMatch(call("create").stdin, /another private|old-web-id|11111111/);
  const metadata = JSON.parse(readFileSync(join(work, ".git", "codex-task-sessions.json"), "utf8"));
  assert.equal(metadata[0].webSessionId, "old-web-id");
});

test("missing session and empty flag remain compatible and do not swallow title", () => {
  delete env.CODEX_THREAD_ID;
  const result = run("--session-id", "--title", "T");
  assert.equal(result.status, 0, result.stderr); assert.match(result.stderr, /сессия Codex не найдена/);
  assert.doesNotMatch(call("create").stdin, /Сессии Codex/);
});

test("unknown metadata warns but keeps a safe public session command", () => {
  const result = run("--title", "T", "--session-id", "unknown");
  assert.equal(result.status, 0, result.stderr); assert.match(result.stderr, /папка запуска.*не найдена/);
  assert.match(call("create").stdin, /codex resume unknown/); assert.ok(!call("create").stdin.includes(work));
});

test("staged and unstaged changes are not absorbed by the empty commit", () => {
  writeFileSync(join(work, "b.txt"), "staged\n"); git(work, "add", "b.txt"); writeFileSync(join(work, "a.txt"), "unstaged\n");
  const before = git(work, "status", "--porcelain"); const result = run("--title", "T");
  assert.equal(result.status, 0, result.stderr); assert.equal(git(work, "status", "--porcelain"), before);
  assert.equal(git(work, "diff", "--name-only", "main", "HEAD"), "");
});

test("stale clean branch fast-forwards before creating the empty commit", () => {
  const upstream = advanceOrigin(); const result = run("--title", "T");
  assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).fastForwarded, 1);
  assert.equal(git(work, "rev-parse", "HEAD~1"), upstream);
});

for (const conflict of ["staged", "untracked"]) test(`stale branch with ${conflict} changes preserves files and reports behindBase`, () => {
  advanceOrigin("b.txt"); writeFileSync(join(work, "b.txt"), "local\n");
  if (conflict === "staged") git(work, "add", "b.txt");
  const result = run("--title", "T"); assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).behindBase, 1); assert.match(result.stderr, /behind origin\/main/);
  assert.equal(readFileSync(join(work, "b.txt"), "utf8"), "local\n");
});

test("own commits require changelog before push and use no extra commit after it is supplied", () => {
  commitFile("feature.txt", "feature\n");
  const blocked = run("--title", "T"); assert.equal(blocked.status, 1); assert.match(blocked.stderr, /CHANGELOG/);
  assert.equal(call("create"), undefined); assert.equal(git(origin, "branch", "--list", "codex/task"), "");
  commitFile("CHANGELOG.md", "- Feature implemented.\n"); const head = git(work, "rev-parse", "HEAD");
  const result = run("--title", "T"); assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).emptyCommit, null); assert.equal(git(work, "rev-parse", "HEAD"), head);
});

test("diverged branch preserves commits and reports the rebase hint", () => {
  advanceOrigin(); commitFile("CHANGELOG.md", "- Task change.\n"); const head = git(work, "rev-parse", "HEAD");
  const result = run("--title", "T"); assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).behindBase, 1); assert.equal(git(work, "rev-parse", "HEAD"), head); assert.match(result.stderr, /git rebase/);
});

test("custom base is used for fetch, comparison and PR creation", () => {
  git(work, "push", "-q", "origin", "main:release");
  const result = run("--title", "T", "--base", "release"); assert.equal(result.status, 0, result.stderr);
  assert.equal(call("create").args[4], "release"); assert.equal(git(work, "rev-list", "--count", "origin/release..HEAD"), "1");
});

test("existing PR comments a new session and deduplicates closing keywords", () => {
  openPR(); env.FAKE_GH_VIEW = JSON.stringify({ body: "Intro\n\nFixes #12\n\n## Сессии Codex\n\n- old", comments: [] });
  const result = run("--title", "T", "--closes", "12,34,034"); assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { action: "session-added", url: "https://github.com/o/r/pull/7", closesAdded: ["34"] });
  assert.match(call("edit").stdin, /Fixes #12\n\nCloses #34\n\n## Сессии Codex/);
  assert.equal(call("create"), undefined); assert.equal(git(work, "rev-list", "--count", "main..HEAD"), "0");
});

test("existing session in body or comments makes repeated invocation idempotent", () => {
  openPR(); env.FAKE_GH_VIEW = JSON.stringify({ body: "Closes #12", comments: [{ body: SESSION }] });
  const result = run("--title", "T", "--closes", "12"); assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).action, "exists"); assert.equal(call("edit"), undefined); assert.equal(call("comment"), undefined);
});

test("new draft adds one Closes line per parsed issue", () => {
  const result = run("--title", "T", "--closes", "#12,34 https://github.com/o/r/issues/56 12");
  assert.equal(result.status, 0, result.stderr); assert.match(call("create").stdin, /Closes #12\nCloses #34\nCloses #56\n\n## Сессии Codex/);
});

test("--ready checks the published head and changelog before modifying the PR", () => {
  openPR(); env.FAKE_GH_REFS = JSON.stringify({ baseRefName: "main", headRefOid: git(work, "rev-parse", "HEAD"), isCrossRepository: false });
  let result = run("--title", "T", "--ready"); assert.equal(result.status, 1); assert.equal(call("ready"), undefined);
  commitFile("CHANGELOG.md", "- Complete task.\n"); env.FAKE_GH_REFS = JSON.stringify({ baseRefName: "main", headRefOid: git(work, "rev-parse", "HEAD"), isCrossRepository: false });
  result = run("--title", "T", "--ready"); assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).action, "ready"); assert.ok(call("ready"));
});

test("--ready refuses a stale published head even when it has changelog", () => {
  openPR(); commitFile("CHANGELOG.md", "- Complete task.\n");
  env.FAKE_GH_REFS = JSON.stringify({ baseRefName: "main", headRefOid: git(work, "rev-parse", "HEAD"), isCrossRepository: false });
  commitFile("new.txt", "later work\n"); const result = run("--title", "T", "--ready");
  assert.equal(result.status, 1); assert.match(result.stderr, /HEAD PR не совпадает/); assert.equal(call("ready"), undefined);
});

test("invalid args, forbidden branches and authentication failures cause no push", () => {
  for (const args of [[], ["--title", "T", "--closes", "abc"], ["--title", "T", "--closes"], ["--title", "T", "--unknown"]]) assert.equal(run(...args).status, 1);
  assert.equal(calls().length, 0); env.FAKE_GH_FAIL = "1"; assert.equal(run("--title", "T").status, 1);
  assert.equal(git(origin, "branch", "--list", "codex/task"), ""); delete env.FAKE_GH_FAIL;
  git(work, "checkout", "-q", "main"); assert.match(run("--title", "T").stderr, /refusing/);
  git(work, "checkout", "-q", "--detach"); assert.match(run("--title", "T").stderr, /detached HEAD/);
});

test("ambient GH_REPO cannot redirect startup publication or existing-PR updates", () => {
  env.GH_REPO = "other/repository";
  const result = run("--title", "T"); assert.equal(result.status, 1); assert.match(result.stderr, /GH_REPO.*origin/); assert.equal(calls().length, 0);
  env.GH_REPO = "https://github.com/o/r";
  assert.equal(run("--title", "T").status, 0);
  assert.deepEqual(call("create").args.slice(-2), ["--repo", "github.com/o/r"]);
});

test("issue and argument helpers preserve deduplication and HTTPS transport", () => {
  assert.deepEqual(parseIssues("1,#2 002"), ["1", "2"]); assert.throws(() => parseIssues("0")); assert.throws(() => parseIssues(" , "));
  assert.ok(isLinked("Resolves: #5", "5")); assert.ok(!isLinked("Closes #50", "5")); assert.ok(!isLinked("see #5", "5"));
  assert.deepEqual(addClosesToBody("", ["5", "5"]), { body: "Closes #5", added: ["5"] });
  assert.equal(toHttpsRemote("git@github.com:o/r.git"), "https://github.com/o/r.git"); assert.equal(toHttpsRemote("ssh://git@github.com/o/r.git"), "https://github.com/o/r.git");
  assert.deepEqual(parseArgs(["--session-id", "--title", "T"]), { "session-id": "", title: "T" });
});
