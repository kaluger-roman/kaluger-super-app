#!/usr/bin/env node
// Opens a draft PR for the current branch at the START of a task, so the work
// and the Claude Code session that did it can always be found again.
//
// Usage:
//   node scripts/start-task-pr.mjs --title "<short task title>" [--summary "<1-3 sentences>"] [--closes 12,34] [--base main]
//     [--session-id <id> --resume-cwd <launch dir> --web-session-id <bridge id>]
//
// What it does:
//   - no open PR for the branch yet: fetches <base>; a branch with no commits of its
//     own that lags behind origin/<base> (cut from a stale local main) and has no
//     tracked changes is fast-forwarded to it, otherwise a lag is reported as a
//     warning on stderr and `behindBase` in the JSON; adds an EMPTY commit if the
//     branch has none on top of <base> (GitHub refuses a PR without commits; the
//     commit carries the same tree, so index and working tree are untouched),
//     pushes the branch and opens a draft PR whose body records the session;
//   - open PR already exists: comments the current session on it unless it is
//     already mentioned there (a task continued in another session stays traceable).
//
// --closes takes issue numbers (`12`, `#12` or an issue URL; comma/space separated)
// and puts a `Closes #N` line per issue into the body, so GitHub closes them when
// the PR is merged into the default branch. On an existing PR the missing lines
// are added to its body.
//
// Session info comes from Claude Code env: CLAUDE_CODE_SESSION_ID (local id for
// `claude --resume`) and CLAUDE_CODE_BRIDGE_SESSION_ID (web session, optional).
// The resume directory is the session's launch cwd, read from its transcript in
// $CLAUDE_CONFIG_DIR/projects (default ~/.claude/projects) — `claude --resume`
// only lists sessions launched from the current directory.
// Run on another machine than the session (e.g. via `ssh home`), neither the env nor
// the transcript is there: pass --session-id, --resume-cwd and --web-session-id
// (they win over the env). Without a session id the PR gets no sessions section
// and a warning goes to stderr.
//
// Push and fetch go over HTTPS with gh as the credential helper (SSH has no key
// in this environment); set START_TASK_PR_REMOTE_URL to override the remote.
//
// Output: JSON on stdout ({ action, url, ... }); errors on stderr, exit code 1.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

const SESSIONS_HEADING = "## Сессии Claude Code";

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      // A flag without a value (e.g. an empty `--session-id $VAR` re-split by a remote shell)
      // must not swallow the next flag.
      const value = argv[i + 1];
      const missing = value === undefined || value.startsWith("--");
      args[argv[i].slice(2)] = missing ? "" : value;
      if (!missing) i += 1;
    }
  }
  return args;
};

// gh (also the git credential helper below) is installed in ~/.local/bin on the dev machine,
// which non-interactive ssh shells leave off PATH.
const LOCAL_BIN = join(homedir(), ".local", "bin");
const RUN_ENV = { ...process.env, PATH: [process.env.PATH, LOCAL_BIN].join(delimiter) };

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { env: RUN_ENV, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts }).trim();

const git = (...args) => run("git", args);
const gitAuth = (...args) => run("git", ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", ...args]);
const gh = (args, input) => {
  try {
    return run("gh", args, input == null ? {} : { input });
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    throw new Error(
      `GitHub CLI (gh) не найден ни в PATH, ни в ${LOCAL_BIN}. Установите его (https://cli.github.com) или добавьте папку с gh в PATH: export PATH=<папка с gh>:$PATH`
    );
  }
};

const fail = (message) => {
  process.stderr.write(`start-task-pr: ${message}\n`);
  process.exit(1);
};

const warn = (message) => process.stderr.write(`start-task-pr: warning: ${message}\n`);

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

export const readSession = (args = {}) => {
  const id = args["session-id"] || process.env.CLAUDE_CODE_SESSION_ID;
  if (!id) return null;
  const bridge = args["web-session-id"] || process.env.CLAUDE_CODE_BRIDGE_SESSION_ID;
  const launchCwd = args["resume-cwd"] || findLaunchCwd(id);
  return {
    id,
    resumeCwd: launchCwd || process.cwd(),
    resumeCwdGuessed: !launchCwd,
    webUrl: bridge ? `https://claude.ai/code/${bridge}` : null,
  };
};

const SSH_HINT = "при запуске не на машине сессии (например, через ssh) передайте --session-id, --resume-cwd и --web-session-id из её окружения";

export const sessionWarning = (session) => {
  if (!session) return `сессия Claude Code не найдена (нет --session-id и CLAUDE_CODE_SESSION_ID), раздела «Сессии Claude Code» в PR не будет; ${SSH_HINT}`;
  if (session.resumeCwdGuessed)
    return `папка запуска сессии ${session.id} не найдена (нет --resume-cwd и транскрипта сессии на этой машине), в команду resume подставлен текущий каталог ${session.resumeCwd}; ${SSH_HINT}`;
  return null;
};

export const sessionLine = (session, date) => {
  const web = session.webUrl ? ` · web: ${session.webUrl}` : "";
  return `- ${date}: \`${session.id}\` — \`cd ${session.resumeCwd} && claude --resume ${session.id}\`${web}`;
};

export const parseIssues = (value) => {
  const issues = String(value ?? "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^#?(\d+)$/) || token.match(/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)\/?$/);
      if (!match) throw new Error(`--closes: not an issue number: ${token}`);
      return match[1];
    });
  if (issues.length === 0) throw new Error("--closes needs at least one issue number");
  return [...new Set(issues)];
};

const closesLine = (issue) => `Closes #${issue}`;

// Any of GitHub's closing keywords already linking the issue counts.
export const isLinked = (body, issue) =>
  new RegExp(`\\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\\s*:?\\s+#${issue}\\b`, "i").test(body);

export const buildBody = ({ summary, closes = [], session, date }) =>
  [
    "Черновик: PR открыт при старте задачи, чтобы работу и сессию можно было найти. Описание дописывается перед переводом в ready.",
    summary ? `\n${summary}` : null,
    closes.length ? `\n${closes.map(closesLine).join("\n")}` : null,
    session ? `\n${SESSIONS_HEADING}\n\n${sessionLine(session, date)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

export const addClosesToBody = (body, issues) => {
  const missing = issues.filter((issue) => !isLinked(body, issue));
  if (missing.length === 0) return { body, added: [] };
  const lines = missing.map(closesLine).join("\n");
  const at = body.indexOf(SESSIONS_HEADING);
  const before = (at === -1 ? body : body.slice(0, at)).trimEnd();
  const after = at === -1 ? "" : `\n\n${body.slice(at)}`;
  const next = `${before ? `${before}\n\n` : ""}${lines}${after}`;
  return { body: next, added: missing };
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.title) fail("--title is required");
  const base = args.base || "main";
  let closes;
  try {
    closes = "closes" in args ? parseIssues(args.closes) : [];
  } catch (err) {
    fail(err.message);
  }

  const branch = git("branch", "--show-current");
  if (!branch) fail("detached HEAD — check out a task branch first");
  if (branch === base || branch === "main" || branch === "master") fail(`refusing to open a PR from ${branch}`);

  const session = readSession(args);
  const warning = sessionWarning(session);
  if (warning) warn(warning);
  const date = new Date().toISOString().slice(0, 10);

  const [existing] = JSON.parse(gh(["pr", "list", "--head", branch, "--state", "open", "--json", "number,url", "--limit", "1"]) || "[]");
  if (existing) {
    if (!session && closes.length === 0) return { action: "exists", url: existing.url };
    const number = String(existing.number);
    const view = JSON.parse(gh(["pr", "view", number, "--json", "body,comments"]));
    const result = { action: "exists", url: existing.url };

    const { body, added } = addClosesToBody(view.body || "", closes);
    if (added.length) {
      gh(["pr", "edit", number, "--body-file", "-"], body);
      result.closesAdded = added;
    }

    const texts = [view.body || "", ...(view.comments || []).map((c) => c.body || "")];
    if (session && !texts.some((t) => t.includes(session.id))) {
      gh(["pr", "comment", number, "--body-file", "-"], `Продолжение в сессии:\n\n${sessionLine(session, date)}`);
      result.action = "session-added";
    }
    return result;
  }

  const remote = process.env.START_TASK_PR_REMOTE_URL || toHttpsRemote(git("remote", "get-url", "origin"));
  gitAuth("fetch", "--quiet", remote, `refs/heads/${base}:refs/remotes/origin/${base}`);

  const ahead = Number(git("rev-list", "--count", `origin/${base}..HEAD`));
  let behind = Number(git("rev-list", "--count", `HEAD..origin/${base}`));
  let fastForwarded = 0;
  // A branch cut from a stale local main would start the task on old code.
  if (ahead === 0 && behind > 0 && git("status", "--porcelain", "--untracked-files=no") === "") {
    try {
      git("merge", "--ff-only", "--quiet", `origin/${base}`);
      fastForwarded = behind;
      behind = 0;
    } catch {
      // e.g. an untracked file in the way: fall through to the warning
    }
  }
  if (behind > 0) {
    const fix = ahead === 0 ? `git merge --ff-only origin/${base}` : `git rebase origin/${base}`;
    warn(`${branch} is ${behind} commit(s) behind origin/${base}; update it with \`${fix}\``);
  }

  let commit = null;
  if (ahead === 0) {
    const trailers = session ? `\n\nClaude-Session-Id: ${session.id}` : "";
    const head = git("rev-parse", "HEAD");
    commit = run("git", ["commit-tree", "HEAD^{tree}", "-p", head, "-F", "-"], { input: `chore: start "${args.title}"${trailers}\n` });
    git("update-ref", "-m", "start-task-pr: empty start commit", "HEAD", commit, head);
  }

  gitAuth("push", "--quiet", remote, `HEAD:refs/heads/${branch}`);
  const url = gh(
    ["pr", "create", "--draft", "--base", base, "--head", branch, "--title", args.title, "--body-file", "-"],
    buildBody({ summary: args.summary, closes, session, date })
  )
    .split("\n")
    .pop();
  return { action: "created", url, branch, emptyCommit: commit, closes, fastForwarded, behindBase: behind };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.stdout.write(`${JSON.stringify(main(), null, 2)}\n`);
  } catch (err) {
    fail(`${err.message}${err.stderr ? `\n${err.stderr}` : ""}`);
  }
}
