#!/usr/bin/env node
// Shared committed-diff gate for CI, guarded gh publication and Codex PreToolUse.
// No shell execution, SSH forwarding, missing-ref bypass or whitespace bypass.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, realpathSync, existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const run = (cwd, command, args, options = {}) => execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim();
const commit = (cwd, ref) => {
  if (typeof ref !== "string" || !ref || ref.startsWith("-") || /[$`\n]/.test(ref)) throw new Error(`Нельзя проверить Git ref: ${ref}`);
  return run(cwd, "git", ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]);
};

export const checkChangelog = ({ cwd = process.cwd(), base, head = "HEAD", allowEmptyDraft = false } = {}) => {
  if (!base) {
    try { commit(cwd, "origin/main"); base = "origin/main"; }
    catch { base = "main"; }
  }
  const baseCommit = commit(cwd, base);
  const headCommit = commit(cwd, head);
  const fork = run(cwd, "git", ["merge-base", baseCommit, headCommit]);
  const files = run(cwd, "git", ["diff", "--name-only", fork, headCommit, "--"]).split("\n").filter(Boolean);
  if (files.length === 0 && allowEmptyDraft) return { allowed: true, reason: "empty draft", base, head, files };
  const result = spawnSync("git", ["diff", "--ignore-all-space", "--ignore-blank-lines", "--exit-code", fork, headCommit, "--", "CHANGELOG.md"], { cwd, encoding: "utf8" });
  if (result.error || ![0, 1].includes(result.status)) throw new Error("Не удалось проверить committed CHANGELOG.md");
  // Deleting the changelog is not a release note.
  let exists = true;
  try { run(cwd, "git", ["cat-file", "-e", `${headCommit}:CHANGELOG.md`]); } catch { exists = false; }
  const hasContentAdded = result.stdout.split("\n").some((line) => line.startsWith("+") && !line.startsWith("+++") && line.slice(1).trim());
  const allowed = result.status === 1 && exists && hasContentAdded;
  return { allowed, reason: allowed ? "changelog updated" : "CHANGELOG.md не содержит содержательного закоммиченного изменения относительно базы PR. Обновите changelog по фактическому результату, затем закоммитьте и опубликуйте изменения.", base, head, files };
};

const option = (args, names) => {
  for (let i = 0; i < args.length; i += 1) {
    for (const name of names) {
      if (args[i] === name) {
        if (!args[i + 1] || args[i + 1].startsWith("-")) throw new Error(`${name} требует значение`);
        return args[i + 1];
      }
      if (args[i].startsWith(`${name}=`)) return args[i].slice(name.length + 1);
    }
  }
  return null;
};

const VALUE_FLAGS = new Set(["repo", "assignee", "base", "body", "body-file", "head", "label", "milestone", "project", "recover", "reviewer", "template", "title", "attach"]);
const BOOLEAN_FLAGS = new Set(["draft", "dry-run", "editor", "fill", "fill-first", "fill-verbose", "no-maintainer-edit", "web", "undo", "help"]);
const SHORT_FLAGS = { R: "repo", a: "assignee", B: "base", b: "body", F: "body-file", H: "head", l: "label", m: "milestone", p: "project", r: "reviewer", T: "template", t: "title", d: "draft", e: "editor", f: "fill", w: "web", h: "help" };
const parseBoolean = (value) => {
  if (["1", "t", "T", "true", "TRUE", "True"].includes(value)) return true;
  if (["0", "f", "F", "false", "FALSE", "False"].includes(value)) return false;
  throw new Error(`Недопустимое булево значение gh: ${value}`);
};

// Match pflag's string arity and last-value semantics. In particular, a title
// starting with '--head=' is one string value, never another option.
export const parseGhPublicationArgs = (args) => {
  const values = {}, words = [];
  let literal = false, endOfOptions = args.length;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (literal || !arg.startsWith("-") || arg === "-") { words.push(arg); continue; }
    if (arg === "--") { literal = true; endOfOptions = i; continue; }
    if (arg.startsWith("--")) {
      const equals = arg.indexOf("=");
      const name = arg.slice(2, equals === -1 ? undefined : equals);
      if (VALUE_FLAGS.has(name)) {
        const value = equals === -1 ? args[++i] : arg.slice(equals + 1);
        if (value === undefined) throw new Error(`--${name} требует значение`);
        values[name] = value;
      } else if (BOOLEAN_FLAGS.has(name)) values[name] = equals === -1 ? true : parseBoolean(arg.slice(equals + 1));
      else throw new Error(`Неподдерживаемый флаг gh: --${name}; проверка остановлена`);
      continue;
    }
    for (let at = 1; at < arg.length; at += 1) {
      const name = SHORT_FLAGS[arg[at]];
      if (!name) throw new Error(`Неподдерживаемый флаг gh: -${arg[at]}; проверка остановлена`);
      if (VALUE_FLAGS.has(name)) {
        const tail = arg.slice(at + 1);
        const value = tail ? tail.replace(/^=/, "") : args[++i];
        if (value === undefined) throw new Error(`-${arg[at]} требует значение`);
        values[name] = value;
        break;
      }
      if (arg[at + 1] === "=") { values[name] = parseBoolean(arg.slice(at + 2)); break; }
      values[name] = true;
    }
  }
  const [command, rawAction, ...positional] = words;
  const action = rawAction === "new" ? "create" : rawAction;
  if (command === "pr" && ["create", "ready"].includes(action)) {
    const allowed = action === "ready" ? new Set(["repo", "undo", "help"]) : new Set([...VALUE_FLAGS, ...BOOLEAN_FLAGS].filter((name) => name !== "undo"));
    for (const name of Object.keys(values)) if (!allowed.has(name)) throw new Error(`Флаг --${name} не поддерживается для gh pr ${action}`);
    if (positional.length > (action === "ready" ? 1 : 0)) throw new Error(`Лишние позиционные аргументы gh pr ${action}`);
  }
  return { command, action, values, positional, endOfOptions };
};

export const repositoryIdentity = (value, defaultHost = "github.com") => {
  if (typeof value !== "string" || !value || /[\s$`?#]/.test(value)) throw new Error("Невозможно определить GitHub repository из origin/--repo/GH_REPO");
  let host = defaultHost, path = value;
  if (/^https?:\/\//.test(value) || value.startsWith("ssh://")) {
    const url = new URL(value);
    if (url.password || (url.username && !(url.protocol === "ssh:" && url.username === "git")) || url.port) throw new Error("URL repository содержит неподдерживаемые credentials или port");
    host = url.hostname; path = url.pathname.replace(/^\//, "");
  } else {
    const ssh = value.match(/^git@([^:]+):(.+)$/);
    if (ssh) { host = ssh[1]; path = ssh[2]; }
    else if (value.split("/").length === 3) { [host, ...path] = value.split("/"); path = path.join("/"); }
  }
  path = path.replace(/\/$/, "").replace(/\.git$/, "");
  const parts = path.split("/");
  if (!/^[a-zA-Z0-9.-]+$/.test(host) || parts.length !== 2 || parts.some((part) => !/^[a-zA-Z0-9_.-]+$/.test(part) || part === "." || part === "..")) throw new Error("Невозможно определить GitHub repository из origin/--repo/GH_REPO");
  const [owner, name] = parts.map((part) => part.toLowerCase());
  host = host.toLowerCase();
  return { host, owner, name, fullName: `${host}/${owner}/${name}`, url: `https://${host}/${owner}/${name}.git` };
};

const gitConfig = (cwd, key) => {
  const result = spawnSync("git", ["config", "--get", key], { cwd, encoding: "utf8" });
  if (result.status === 1) return null;
  if (result.error || result.status !== 0) throw new Error(`Не удалось прочитать git config ${key}`);
  return result.stdout.trim();
};
const branchName = (cwd, branch) => {
  if (!branch || /[$`\n]/.test(branch)) throw new Error("Неизвестная или динамическая ветка PR");
  run(cwd, "git", ["check-ref-format", `refs/heads/${branch}`]);
  return branch;
};

export const checkGhPublication = (args, cwd = process.cwd(), gh, environment = process.env) => {
  const parsed = parseGhPublicationArgs(args);
  const { action, values, positional } = parsed;
  if (parsed.command !== "pr" || !["create", "ready"].includes(action) || values.help || (action === "ready" && values.undo)) return { allowed: true, reason: "not publication" };
  const executeGh = gh || ((argv) => run(cwd, "gh", argv, { env: environment }));
  // Raw config preserves repository identity when Git uses a transport insteadOf
  // mapping. Never infer repository identity from an arbitrary local directory.
  const origin = repositoryIdentity(gitConfig(cwd, "remote.origin.url"));
  const selected = values.repo || environment.GH_REPO;
  if (selected && repositoryIdentity(selected, environment.GH_HOST || origin.host).fullName !== origin.fullName) throw new Error("--repo/GH_REPO не совпадает с локальным origin; проверка чужого checkout недопустима");
  const metadata = JSON.parse(executeGh(["repo", "view", ...(selected ? [selected] : []), "--json", "url,defaultBranchRef"]));
  if (repositoryIdentity(metadata.url).fullName !== origin.fullName) throw new Error("Репозиторий, выбранный gh, не совпадает с локальным origin");
  const remoteBranch = (name) => {
    branchName(cwd, name);
    const data = JSON.parse(executeGh(["api", "--hostname", origin.host, "--method", "GET", `repos/${origin.owner}/${origin.name}/git/ref/heads/${encodeURIComponent(name)}`]));
    if (data.ref !== `refs/heads/${name}` || data.object?.type !== "commit" || !/^[a-f0-9]{40,64}$/.test(data.object?.sha || "")) throw new Error(`Не удалось определить опубликованный commit ветки ${name}`);
    return data.object.sha;
  };
  const ensureCommit = (sha) => {
    try { return commit(cwd, sha); }
    catch {
      // Read only: fetch exactly the observed commit, without changing branches.
      run(cwd, "git", ["-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential", "fetch", "--quiet", "--no-tags", "--no-write-fetch-head", origin.url, sha], { env: environment });
      return commit(cwd, sha);
    }
  };
  if (action === "create") {
    const current = run(cwd, "git", ["branch", "--show-current"]);
    let headName = values.head || current;
    if (headName.includes(":")) {
      const parts = headName.split(":");
      if (parts.length !== 2 || parts[0].toLowerCase() !== origin.owner) throw new Error("Невозможно проверить --head другого владельца локально");
      headName = parts[1];
    }
    branchName(cwd, headName);
    const localHead = commit(cwd, `refs/heads/${headName}`);
    if (!values.head) {
      // Implicit gh publication can select a push remote, rename a branch or fork.
      // Accept it only when the already-published origin branch is unambiguous.
      const remotes = run(cwd, "git", ["remote"]).split("\n").filter(Boolean);
      for (const remote of remotes) {
        if (repositoryIdentity(gitConfig(cwd, `remote.${remote}.url`)).fullName !== origin.fullName || gitConfig(cwd, `remote.${remote}.push`)) throw new Error("Неоднозначный remote для gh pr create; передайте явный --head после push в origin");
      }
      const merge = gitConfig(cwd, `branch.${current}.merge`);
      if (merge && merge !== `refs/heads/${current}`) throw new Error("Tracking branch переименована; передайте явный --head");
      for (const key of [`branch.${current}.remote`, `branch.${current}.pushRemote`, "remote.pushDefault"]) {
        const remote = gitConfig(cwd, key);
        if (remote && !remotes.includes(remote)) throw new Error("Неоднозначный push remote; передайте явный --head");
      }
      if (commit(cwd, `refs/remotes/origin/${current}`) !== localHead) throw new Error("Ветка ещё не опубликована целиком; сначала push/fetch origin и повторная проверка");
    }
    const publishedHead = remoteBranch(headName);
    if (publishedHead !== localHead) throw new Error("Опубликованный HEAD не совпадает с локальной веткой; сначала push проверенного коммита");
    const baseName = branchName(cwd, values.base || gitConfig(cwd, `branch.${current || headName}.gh-merge-base`) || metadata.defaultBranchRef?.name);
    const publishedBase = remoteBranch(baseName);
    const result = checkChangelog({ cwd, head: ensureCommit(publishedHead), base: ensureCommit(publishedBase), allowEmptyDraft: values.draft === true });
    const publicationArgs = [...args];
    publicationArgs.splice(parsed.endOfOptions, 0, "--repo", origin.fullName, "--base", baseName, "--head", headName);
    return { ...result, repository: origin.fullName, baseName, headName, publicationArgs };
  }
  const selector = positional[0];
  if (selector && /[$`]/.test(selector)) throw new Error("Динамический PR selector нельзя проверить; передайте явный номер или ветку");
  if (selector?.includes("://")) {
    const match = selector.match(/^(https?:\/\/[^/]+\/[^/]+\/[^/]+)\/pull\/\d+\/?$/);
    if (!match || repositoryIdentity(match[1]).fullName !== origin.fullName) throw new Error("PR URL не совпадает с локальным origin");
  }
  const view = JSON.parse(executeGh(["pr", "view", ...(selector ? [selector] : []), "--repo", origin.fullName, "--json", "baseRefName,headRefOid,headRefName,isCrossRepository"]));
  if (view.isCrossRepository || !view.baseRefName || !/^[a-f0-9]{40,64}$/.test(view.headRefOid || "")) throw new Error("Не удалось определить опубликованную ветку PR для проверки changelog");
  const base = remoteBranch(view.baseRefName);
  const publicationArgs = [...args];
  publicationArgs.splice(parsed.endOfOptions, 0, "--repo", origin.fullName);
  return { ...checkChangelog({ cwd, base: ensureCommit(base), head: ensureCommit(view.headRefOid) }), repository: origin.fullName, publicationArgs };
};

// Tokenize, never evaluate. Quoted bodies remain one word, and shell control
// operators remain separate. Unknown dynamic publication commands fail closed.
export const tokenize = (command) => {
  const tokens = [];
  let word = "", active = false, quote = null, dynamic = false;
  const flush = () => { if (active) tokens.push({ word, dynamic }); word = ""; active = false; dynamic = false; };
  for (let i = 0; i < command.length; i += 1) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && /["\\$`\n]/.test(command[i + 1] || "")) { if (command[++i] !== "\n") word += command[i]; }
      else { if (quote === '"' && (c === "`" || (c === "$" && command[i + 1] === "("))) dynamic = true; word += c; }
      continue;
    }
    if (c === "'" || c === '"') { quote = c; active = true; }
    else if (c === "\\") { active = true; if (command[++i] !== "\n") word += command[i] || ""; }
    else if (c === "#" && !active) { while (i < command.length && command[i] !== "\n") i += 1; flush(); tokens.push({ op: ";" }); }
    else if (/[ \t\r]/.test(c)) flush();
    else if (/[\n;&|()]/.test(c)) {
      flush();
      const doubled = (c === "&" || c === "|") && command[i + 1] === c;
      tokens.push({ op: doubled ? c + command[++i] : c });
    }
    else { if (c === "`" || (c === "$" && command[i + 1] === "(")) dynamic = true; word += c; active = true; }
  }
  if (quote) throw new Error("Незакрытые кавычки в команде публикации");
  flush();
  return tokens;
};

export const publicationCommands = (command, initialCwd = process.cwd(), depth = 0, inheritedEnvironment = {}) => {
  if (depth > 4) throw new Error("Слишком глубокая вложенность команды публикации");
  const found = [];
  let cwd = initialCwd, words = [], shellEnvironment = { ...inheritedEnvironment }, inPipeline = false;
  const stack = [];
  const scan = (nextOperator) => {
    let args = [...words]; words = [];
    let commandCwd = cwd;
    const environment = { ...shellEnvironment };
    const assign = (arg, target = environment) => {
      const at = arg.indexOf("=");
      const name = arg.slice(0, at), value = arg.slice(at + 1);
      if (name.startsWith("GIT_")) throw new Error("Git environment меняет checkout команды; используйте явный workdir без GIT_* overrides");
      if (["GH_REPO", "GH_HOST", "GH_CONFIG_DIR"].includes(name)) {
        if (/[$`]/.test(value)) throw new Error("Динамическое GitHub environment нельзя проверить");
        target[name] = value;
      }
    };
    if (["export", "unset"].includes(args[0]) && (inPipeline || ["|", "&"].includes(nextOperator))) throw new Error("Изменение environment внутри pipeline/background неоднозначно; используйте явный --repo");
    if (args[0] === "export") { for (const arg of args.slice(1)) if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(arg)) assign(arg, shellEnvironment); return; }
    if (args[0] === "unset") { for (const name of args.slice(1)) if (["GH_REPO", "GH_HOST", "GH_CONFIG_DIR"].includes(name)) shellEnvironment[name] = ""; return; }
    while (args.length) {
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0])) { assign(args.shift()); continue; }
      if (["command", "exec", "builtin", "time", "!", "then", "do", "else", "{"].includes(args[0])) { args.shift(); continue; }
      break;
    }
    while (args[0] === "env") {
      args.shift();
      while (args.length) {
        if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0])) { assign(args.shift()); continue; }
        if (["-i", "--ignore-environment"].includes(args[0])) { args.shift(); Object.assign(environment, { GH_REPO: "", GH_HOST: "", GH_CONFIG_DIR: "" }); continue; }
        if (["-u", "--unset"].includes(args[0])) { args.shift(); const name = args.shift(); if (["GH_REPO", "GH_HOST", "GH_CONFIG_DIR"].includes(name)) environment[name] = ""; continue; }
        if (["-C", "--chdir"].includes(args[0])) { args.shift(); const path = args.shift(); commandCwd = path && !/[$`~]/.test(path) && commandCwd ? resolve(commandCwd, path) : null; continue; }
        if (args[0] === "--") { args.shift(); break; }
        if (args[0].startsWith("-")) throw new Error("Неизвестный флаг env перед публикацией; проверка остановлена");
        break;
      }
      while (["command", "exec", "builtin", "time"].includes(args[0])) args.shift();
    }
    while (["command", "exec", "builtin", "time"].includes(args[0])) args.shift();
    if (!args.length) { shellEnvironment = environment; return; }
    const executable = basename(args[0]);
    if (executable === "cd") {
      const path = args[1] === "--" ? args[2] : args[1];
      if (!path || /[$`~]/.test(path)) cwd = null;
      else if (cwd) cwd = resolve(cwd, path);
    } else if (["bash", "sh", "zsh"].includes(executable) && args.some((arg) => /^-[a-z]*c[a-z]*$/.test(arg))) {
      const index = args.findIndex((arg) => /^-[a-z]*c[a-z]*$/.test(arg));
      found.push(...publicationCommands(args[index + 1] || "", commandCwd, depth + 1, environment));
    } else if (executable === "gh" && args.includes("pr")) {
      const { action } = parseGhPublicationArgs(args.slice(1));
      if (["create", "ready"].includes(action)) {
        if (!commandCwd) throw new Error("Динамическую команду публикации нельзя проверить: используйте явный checkout и scripts/gh-pr.mjs");
        found.push({ args: args.slice(1), cwd: commandCwd, environment });
      }
    }
  };
  for (const token of [...tokenize(command), { op: ";" }]) {
    if (token.dynamic && /\bgh\b/.test(command) && /\bpr\b/.test(command) && /\b(create|new|ready)\b/.test(command)) throw new Error("Командная подстановка в публикации не поддаётся безопасной проверке; используйте scripts/gh-pr.mjs");
    if ("word" in token) { words.push(token.word); continue; }
    scan(token.op);
    inPipeline = token.op === "|";
    if (token.op === "(") stack.push({ cwd, environment: { ...shellEnvironment } });
    if (token.op === ")" && stack.length) { const outer = stack.pop(); cwd = outer.cwd; shellEnvironment = outer.environment; }
  }
  return found;
};

export const hookDecision = (input) => {
  const command = input?.tool_input?.command ?? input?.tool_input?.cmd;
  if (typeof command !== "string") return null;
  if (!/\bgh\b/.test(command) || !/\bpr\b/.test(command) || !/\b(create|new|ready)\b/.test(command)) return null;
  const cwd = input.tool_input?.workdir || input.tool_input?.cwd || input.cwd || process.cwd();
  try {
    for (const publication of publicationCommands(command, cwd)) {
      const result = checkGhPublication(publication.args, publication.cwd, undefined, { ...process.env, ...publication.environment });
      if (!result.allowed) throw new Error(result.reason);
    }
    return null;
  } catch (error) {
    return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `changelog gate: ${error.message}` } };
  }
};

const main = () => {
  const args = process.argv.slice(2);
  if (args[0] === "--hook") {
    let result;
    try { result = hookDecision(JSON.parse(readFileSync(0, "utf8"))); }
    catch { result = { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "changelog gate: некорректный JSON hook input" } }; }
    if (result) process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--allow-empty-draft") continue;
    if (!["--base", "--head", "--cwd"].includes(args[i]) || !args[++i]) throw new Error("usage: changelog-gate.mjs --base <ref> [--head <ref>] [--cwd <directory>] [--allow-empty-draft] | --hook");
  }
  const result = checkChangelog({ base: option(args, ["--base"]), head: option(args, ["--head"]) || "HEAD", cwd: option(args, ["--cwd"]) || process.cwd(), allowEmptyDraft: args.includes("--allow-empty-draft") });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.allowed) process.exitCode = 1;
};

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(`changelog gate: ${error.message}\n`); process.exitCode = 1; }
}
