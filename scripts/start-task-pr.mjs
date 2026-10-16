#!/usr/bin/env node
// Opens a draft PR for the current branch at the START of a task, so the work
// and the Claude Code session that did it can always be found again.
//
// Usage:
//   node scripts/start-task-pr.mjs --title "<short task title>" [--summary "<1-3 sentences>"] [--base main]
//
// What it does:
//   - no open PR for the branch yet: fetches <base>, adds an EMPTY commit if the
//     branch has none on top of <base> (GitHub refuses a PR without commits; the
//     commit carries the same tree, so index and working tree are untouched),
//     pushes the branch and opens a draft PR whose body records the session;
//   - open PR already exists: comments the current session on it unless it is
//     already mentioned there (a task continued in another session stays traceable).
//
// Session info comes from Claude Code env: CLAUDE_CODE_SESSION_ID (local id for
// `claude --resume`) and CLAUDE_CODE_BRIDGE_SESSION_ID (web session, optional).
// The resume directory is the session's launch cwd, read from its transcript in
// $CLAUDE_CONFIG_DIR/projects (default ~/.claude/projects) — `claude --resume`
// only lists sessions launched from the current directory.
//
// Push and fetch go over HTTPS with gh as the credential helper (SSH has no key
// in this environment); set START_TASK_PR_REMOTE_URL to override the remote.
//
// Output: JSON on stdout ({ action, url, ... }); errors on stderr, exit code 1.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SESSIONS_HEADING = "## Сессии Claude Code";

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
};

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts }).trim();

const git = (...args) => run("git", args);
const gitAuth = (...args) => run("git", ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", ...args]);
const gh = (args, input) => run("gh", args, input == null ? {} : { input });

const fail = (message) => {
  process.stderr.write(`start-task-pr: ${message}\n`);
  process.exit(1);
};

export const toHttpsRemote = (url) => {
  const ssh = url.match(/^git@github\.com:(.+?)(?:\.git)?$/) || url.match(/^ssh:\/\/git@github\.com\/(.+?)(?:\.git)?$/);
  return ssh ? `https://github.com/${ssh[1]}.git` : url;
};

const findLaunchCwd = (sessionId) => {
  const projectsDir = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "projects");
  if (!existsSync(projectsDir)) return null;
  for (const dir of readdirSync(projectsDir)) {
    const transcript = join(projectsDir, dir, `${sessionId}.jsonl`);
    if (!existsSync(transcript)) continue;
    const match = readFileSync(transcript, "utf8").match(/"cwd":"((?:[^"\\]|\\.)*)"/);
    if (match) return JSON.parse(`"${match[1]}"`);
  }
  return null;
};

export const readSession = () => {
  const id = process.env.CLAUDE_CODE_SESSION_ID;
  if (!id) return null;
  const bridge = process.env.CLAUDE_CODE_BRIDGE_SESSION_ID;
  return {
    id,
    resumeCwd: findLaunchCwd(id) || process.cwd(),
    webUrl: bridge ? `https://claude.ai/code/${bridge}` : null,
  };
};

export const sessionLine = (session, date) => {
  const web = session.webUrl ? ` · web: ${session.webUrl}` : "";
  return `- ${date}: \`${session.id}\` — \`cd ${session.resumeCwd} && claude --resume ${session.id}\`${web}`;
};

export const buildBody = ({ summary, session, date }) =>
  [
    "Черновик: PR открыт при старте задачи, чтобы работу и сессию можно было найти. Описание дописывается перед переводом в ready.",
    summary ? `\n${summary}` : null,
    session ? `\n${SESSIONS_HEADING}\n\n${sessionLine(session, date)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.title) fail("--title is required");
  const base = args.base || "main";

  const branch = git("branch", "--show-current");
  if (!branch) fail("detached HEAD — check out a task branch first");
  if (branch === base || branch === "main" || branch === "master") fail(`refusing to open a PR from ${branch}`);

  const session = readSession();
  const date = new Date().toISOString().slice(0, 10);

  const [existing] = JSON.parse(gh(["pr", "list", "--head", branch, "--state", "open", "--json", "number,url", "--limit", "1"]) || "[]");
  if (existing) {
    if (!session) return { action: "exists", url: existing.url };
    const view = JSON.parse(gh(["pr", "view", String(existing.number), "--json", "body,comments"]));
    const texts = [view.body || "", ...(view.comments || []).map((c) => c.body || "")];
    if (texts.some((t) => t.includes(session.id))) return { action: "exists", url: existing.url };
    gh(["pr", "comment", String(existing.number), "--body-file", "-"], `Продолжение в сессии:\n\n${sessionLine(session, date)}`);
    return { action: "session-added", url: existing.url };
  }

  const remote = process.env.START_TASK_PR_REMOTE_URL || toHttpsRemote(git("remote", "get-url", "origin"));
  gitAuth("fetch", "--quiet", remote, `refs/heads/${base}:refs/remotes/origin/${base}`);

  let commit = null;
  if (Number(git("rev-list", "--count", `origin/${base}..HEAD`)) === 0) {
    const trailers = session ? `\n\nClaude-Session-Id: ${session.id}` : "";
    const head = git("rev-parse", "HEAD");
    commit = run("git", ["commit-tree", "HEAD^{tree}", "-p", head, "-F", "-"], { input: `chore: start "${args.title}"${trailers}\n` });
    git("update-ref", "-m", "start-task-pr: empty start commit", "HEAD", commit, head);
  }

  gitAuth("push", "--quiet", remote, `HEAD:refs/heads/${branch}`);
  const url = gh(
    ["pr", "create", "--draft", "--base", base, "--head", branch, "--title", args.title, "--body-file", "-"],
    buildBody({ summary: args.summary, session, date })
  )
    .split("\n")
    .pop();
  return { action: "created", url, branch, emptyCommit: commit };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.stdout.write(`${JSON.stringify(main(), null, 2)}\n`);
  } catch (err) {
    fail(`${err.message}${err.stderr ? `\n${err.stderr}` : ""}`);
  }
}
