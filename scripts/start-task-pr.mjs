#!/usr/bin/env node
// Explicitly requested task publication: opens an idempotent draft and records
// the Codex session. An empty start commit preserves both index and worktree.
// --title --summary --closes --base --session-id --resume-cwd --web-session-id
// remain compatible. --ready finalizes an existing PR after the changelog gate.
// All Git/GitHub work happens locally, with gh credentials for GitHub HTTPS.
import { execFileSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readSync, readdirSync, readFileSync, realpathSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkChangelog, checkGhPublication, repositoryIdentity } from "./changelog-gate.mjs";

const SESSIONS_HEADING = "## Сессии Codex";
const LOCAL_BIN = join(homedir(), ".local", "bin");
const RUN_ENV = { ...process.env, PATH: [process.env.PATH, LOCAL_BIN, "/opt/homebrew/bin", "/usr/local/bin"].join(delimiter) };
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { env: RUN_ENV, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts }).trim();
const git = (...args) => run("git", args);
const gitAuth = (...args) => run("git", ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", ...args]);
let targetRepository;
const gh = (args, input) => {
  const argv = args[0] === "pr" && targetRepository ? [...args, "--repo", targetRepository] : args;
  try { return run("gh", argv, input == null ? {} : { input }); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    throw new Error(`GitHub CLI (gh) не найден в PATH или стандартных локальных каталогах. Установите gh и выполните gh auth login.`);
  }
};
const warn = (message) => process.stderr.write(`start-task-pr: warning: ${message}\n`);

export const parseArgs = (argv) => {
  const args = {};
  const flags = ["title", "summary", "closes", "base", "session-id", "resume-cwd", "web-session-id"];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--ready") { args.ready = true; continue; }
    const name = argv[i].slice(2);
    if (!argv[i].startsWith("--") || !flags.includes(name)) throw new Error(`unknown argument: ${argv[i]}`);
    const value = argv[i + 1];
    const missing = value === undefined || value.startsWith("--");
    args[name] = missing ? "" : value;
    if (!missing) i += 1;
  }
  return args;
};

export const toHttpsRemote = (url) => {
  const ssh = url.match(/^git@github\.com:(.+?)(?:\.git)?$/) || url.match(/^ssh:\/\/git@github\.com\/(.+?)(?:\.git)?$/);
  return ssh ? `https://github.com/${ssh[1]}.git` : url;
};

// Read only the first metadata line of a matching rollout, never conversation
// contents. Codex rollout format is best effort; explicit flags are definitive.
const findLaunchCwd = (id) => {
  const home = process.env.CODEX_HOME || join(homedir(), ".codex");
  const visit = (directory, depth = 0) => {
    if (depth > 4 || !existsSync(directory)) return null;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { const found = visit(path, depth + 1); if (found) return found; }
      if (!entry.isFile() || !entry.name.endsWith(`${id}.jsonl`)) continue;
      let descriptor;
      try {
        descriptor = openSync(path, "r");
        const buffer = Buffer.alloc(16384);
        const size = readSync(descriptor, buffer, 0, buffer.length, 0);
        const meta = JSON.parse(buffer.subarray(0, size).toString("utf8").split("\n")[0]);
        if (meta.type === "session_meta" && meta.payload?.id === id && typeof meta.payload.cwd === "string") return meta.payload.cwd;
      } catch { /* Unknown/missing metadata is reported by sessionWarning. */ }
      finally { if (descriptor !== undefined) closeSync(descriptor); }
    }
    return null;
  };
  try { return visit(join(home, "sessions")) || visit(join(home, "archived_sessions")); }
  catch { return null; }
};

export const readSession = (args = {}) => {
  const id = args["session-id"] || process.env.CODEX_THREAD_ID || process.env.CODEX_SESSION_ID;
  if (!id) return null;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error("--session-id содержит недопустимые символы");
  const launchCwd = args["resume-cwd"] || findLaunchCwd(id);
  return { id, resumeCwd: resolve(launchCwd || process.cwd()), resumeCwdGuessed: !launchCwd,
    webSessionId: args["web-session-id"] || null };
};

export const sessionWarning = (session) => {
  if (!session) return "сессия Codex не найдена (нет --session-id и CODEX_THREAD_ID); передайте --session-id и --resume-cwd, чтобы сохранить связь с чатом";
  if (session.resumeCwdGuessed) return `папка запуска сессии ${session.id} не найдена; локально сохранён текущий каталог. Передайте --resume-cwd для точного возобновления`;
  return null;
};

export const sessionLine = (session, date) => `- ${date}: \`${session.id}\` — \`codex resume ${session.id}\``;

const saveSession = (session, branch, url) => {
  if (!session) return;
  const path = resolve(git("rev-parse", "--git-path", "codex-task-sessions.json"));
  let sessions = [];
  if (existsSync(path)) {
    sessions = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(sessions)) throw new Error("локальный реестр сессий повреждён");
  }
  const entry = { ...session, branch, url, updatedAt: new Date().toISOString() };
  const index = sessions.findIndex((item) => item.id === session.id && item.branch === branch);
  if (index === -1) sessions.push(entry); else sessions[index] = entry;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(sessions, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
};

export const parseIssues = (value) => {
  const issues = String(value ?? "").split(/[\s,]+/).filter(Boolean).map((token) => {
    const match = token.match(/^#?(\d+)$/) || token.match(/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)\/?$/);
    if (!match || Number(match[1]) < 1) throw new Error(`--closes: not an issue number: ${token}`);
    return BigInt(match[1]).toString();
  });
  if (!issues.length) throw new Error("--closes needs at least one issue number");
  return [...new Set(issues)];
};
const closesLine = (issue) => `Closes #${issue}`;
export const isLinked = (body, issue) => new RegExp(`\\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\\s*:?\\s+#${issue}\\b`, "i").test(body);
export const buildBody = ({ summary, closes = [], session, date }) => [
  "Черновик: PR открыт при старте задачи. Описание, результаты проверок и changelog обновляются перед переводом в ready.",
  summary ? `\n${summary}` : null,
  closes.length ? `\n${closes.map(closesLine).join("\n")}` : null,
  session ? `\n${SESSIONS_HEADING}\n\n${sessionLine(session, date)}` : null,
].filter(Boolean).join("\n");

export const addClosesToBody = (body, issues) => {
  const missing = [...new Set(issues)].filter((issue) => !isLinked(body, issue));
  if (!missing.length) return { body, added: [] };
  const at = body.indexOf(SESSIONS_HEADING);
  const before = (at === -1 ? body : body.slice(0, at)).trimEnd();
  const after = at === -1 ? "" : `\n\n${body.slice(at)}`;
  return { body: `${before ? `${before}\n\n` : ""}${missing.map(closesLine).join("\n")}${after}`, added: missing };
};

export const main = () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.title) throw new Error("--title is required");
  const base = args.base || "main";
  const closes = "closes" in args ? parseIssues(args.closes) : [];
  git("check-ref-format", `refs/heads/${base}`);
  const branch = git("branch", "--show-current");
  if (!branch) throw new Error("detached HEAD — check out a task branch first");
  if ([base, "main", "master"].includes(branch)) throw new Error(`refusing to open a PR from ${branch}`);
  const originRepository = repositoryIdentity(git("config", "--get", "remote.origin.url"));
  targetRepository = originRepository.fullName;
  if (process.env.GH_REPO && repositoryIdentity(process.env.GH_REPO, process.env.GH_HOST || originRepository.host).fullName !== targetRepository) throw new Error("GH_REPO не совпадает с origin текущей задачи");
  const session = readSession(args);
  const warning = sessionWarning(session);
  if (warning) warn(warning);
  if (args["web-session-id"]) warn("--web-session-id устарел: значение сохранено только локально; публичная ссылка Codex не выводится без подтверждённого URL");
  const date = new Date().toISOString().slice(0, 10);
  const [existing] = JSON.parse(gh(["pr", "list", "--head", branch, "--state", "open", "--json", "number,url", "--limit", "1"]) || "[]");
  if (args.ready && !existing) throw new Error("--ready требует существующий PR; сначала откройте черновик");
  if (existing) {
    const number = String(existing.number);
    if (args.ready) {
      const result = checkGhPublication(["pr", "ready", number], process.cwd(), (argv) => gh(argv));
      if (!result.allowed) throw new Error(result.reason);
      if (git("rev-parse", "HEAD") !== result.head) throw new Error("Опубликованный HEAD PR не совпадает с локальным: сначала опубликуйте проверенный коммит");
    }
    const result = { action: "exists", url: existing.url };
    if (session || closes.length) {
      const view = JSON.parse(gh(["pr", "view", number, "--json", "body,comments"]));
      const { body, added } = addClosesToBody(view.body || "", closes);
      if (added.length) { gh(["pr", "edit", number, "--body-file", "-"], body); result.closesAdded = added; }
      const texts = [view.body || "", ...(view.comments || []).map((comment) => comment.body || "")];
      if (session && !texts.some((text) => text.includes(session.id))) {
        gh(["pr", "comment", number, "--body-file", "-"], `Продолжение в сессии Codex:\n\n${sessionLine(session, date)}`);
        result.action = "session-added";
      }
    }
    if (args.ready) { gh(["pr", "ready", number]); result.action = "ready"; }
    saveSession(session, branch, existing.url);
    return result;
  }
  const remote = process.env.START_TASK_PR_REMOTE_URL || toHttpsRemote(git("remote", "get-url", "origin"));
  // Only GitHub HTTPS or local fixture repositories; never resurrect home/SSH.
  if (!/^https:\/\/github\.com\//.test(remote) && !/^(\/|\.\/|\.\.\/)/.test(remote)) throw new Error("origin должен быть GitHub HTTPS или локальным репозиторием");
  gitAuth("fetch", "--quiet", remote, `refs/heads/${base}:refs/remotes/origin/${base}`);
  const ahead = Number(git("rev-list", "--count", `origin/${base}..HEAD`));
  let behind = Number(git("rev-list", "--count", `HEAD..origin/${base}`));
  let fastForwarded = 0;
  if (ahead === 0 && behind > 0 && git("status", "--porcelain", "--untracked-files=no") === "") {
    try { git("merge", "--ff-only", "--quiet", `origin/${base}`); fastForwarded = behind; behind = 0; }
    catch { /* Untracked conflicts leave the checkout untouched and report lag. */ }
  }
  if (behind > 0) warn(`${branch} is ${behind} commit(s) behind origin/${base}; update it with \`${ahead === 0 ? "git merge --ff-only" : "git rebase"} origin/${base}\``);
  const gate = checkChangelog({ base: `origin/${base}`, allowEmptyDraft: true });
  if (!gate.allowed) throw new Error(gate.reason);
  let commit = null;
  if (ahead === 0) {
    const trailers = session ? `\n\nCodex-Session-Id: ${session.id}` : "";
    const head = git("rev-parse", "HEAD");
    commit = run("git", ["commit-tree", "HEAD^{tree}", "-p", head, "-F", "-"], { input: `chore: start "${args.title}"${trailers}\n` });
    git("update-ref", "-m", "start-task-pr: empty start commit", "HEAD", commit, head);
  }
  gitAuth("push", "--quiet", remote, `HEAD:refs/heads/${branch}`);
  const url = gh(["pr", "create", "--draft", "--base", base, "--head", branch, "--title", args.title, "--body-file", "-"], buildBody({ summary: args.summary, closes, session, date })).split("\n").pop();
  saveSession(session, branch, url);
  return { action: "created", url, branch, emptyCommit: commit, closes, fastForwarded, behindBase: behind };
};

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(main(), null, 2)}\n`); }
  catch (error) { process.stderr.write(`start-task-pr: ${error.message}${error.stderr ? `\n${error.stderr}` : ""}\n`); process.exitCode = 1; }
}
