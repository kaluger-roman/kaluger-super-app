// Tests for scripts/vscode-agents/lib.js (the data side of the VS Code agents panel).
// Run: node --test scripts/__tests__/
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  truncateSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const {
  FEED_MAX,
  FIRST_READ_MAX,
  encodeCwd,
  underRoots,
  issueRef,
  ago,
  userText,
  toolSummary,
  toolName,
  Transcript,
  stateOf,
  stateLabel,
  displayName,
  nowLine,
  Store,
  issueBand,
  parseIssueScore,
  parseIssueWhy,
  rankIssues,
  issueTakePrompt,
  issueTakeCommand,
  IssueBoard,
} = require("../vscode-agents/lib.js");
const { renderBlock } = await import("../issue-priority.mjs");

const SID = "11111111-2222-3333-4444-555555555555";
const REPO = "https://github.com/acme/app/pull/";
const T0 = Date.parse("2026-10-23T10:00:00Z");
const iso = (min) => new Date(T0 + min * 60e3).toISOString();

const jl = (...entries) => entries.map((e) => JSON.stringify(e) + "\n").join("");
const user = (content, min = 0, extra = {}) => ({
  type: "user",
  timestamp: iso(min),
  cwd: "/root/super-app",
  message: { role: "user", content },
  ...extra,
});
const assistant = (content, min = 0, extra = {}) => ({
  type: "assistant",
  timestamp: iso(min),
  cwd: "/root/super-app",
  message: { role: "assistant", content },
  ...extra,
});
const toolUse = (id, name, input, min = 0) =>
  assistant([{ type: "tool_use", id, name, input }], min);
const toolResult = (id, content, min = 0, isError = false) =>
  user([{ type: "tool_result", tool_use_id: id, content, is_error: isError }], min);
const text = (t, min = 0, extra = {}) => assistant([{ type: "text", text: t }], min, extra);

let dir;
let file;
const write = (...entries) => writeFileSync(file, jl(...entries));
const append = (...entries) => appendFileSync(file, jl(...entries));
const parse = (...entries) => {
  write(...entries);
  const t = new Transcript(file);
  t.update();
  return t;
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vscode-agents-"));
  file = join(dir, `${SID}.jsonl`);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("encodeCwd and underRoots match Claude Code project dirs and nested cwds", () => {
  assert.equal(encodeCwd("/root/super-app"), "-root-super-app");
  assert.equal(encodeCwd("/a/.claude/worktrees/x_y"), "-a--claude-worktrees-x-y");
  assert.ok(underRoots(["/root/super-app"], "/root/super-app"));
  assert.ok(underRoots(["/root/super-app"], "/root/super-app/.claude/worktrees/x"));
  assert.ok(!underRoots(["/root/super-app"], "/root/super-app-old"));
  assert.ok(!underRoots(["/root/super-app"], undefined));
});

test("ago formats minutes, hours and days", () => {
  assert.equal(ago(0, T0), "");
  assert.equal(ago(T0, T0), "только что");
  assert.equal(ago(T0 - 5 * 60e3, T0), "5 мин");
  assert.equal(ago(T0 - 3 * 3600e3, T0), "3 ч");
  assert.equal(ago(T0 - 3 * 864e5, T0), "3 дн");
});

test("userText keeps plain prompts, renders slash commands and drops service messages", () => {
  assert.equal(userText("  починить баг  "), "починить баг");
  assert.equal(
    userText([{ type: "text", text: "a" }, { type: "image" }, { type: "text", text: "b" }]),
    "a\nb"
  );
  assert.equal(
    userText("<command-name>/auto-feature</command-name><command-args>звонки</command-args>"),
    "/auto-feature звонки"
  );
  assert.equal(userText("<command-name>/clear</command-name>"), "/clear");
  assert.equal(userText("<system-reminder>x</system-reminder>"), "");
  assert.equal(userText("<local-command-stdout></local-command-stdout>"), "");
  assert.equal(userText([{ type: "tool_result", content: "x" }]), "");
});

test("toolSummary picks the meaningful input of each tool", () => {
  assert.equal(toolSummary("Bash", { command: "ls -la", description: "List files" }), "List files");
  assert.equal(toolSummary("Bash", { command: "ls\n  -la" }), "ls -la");
  assert.equal(toolSummary("Edit", { file_path: "/a/b/model.ts" }), "model.ts");
  assert.equal(toolSummary("Grep", { pattern: "foo", path: "/a/src" }), "foo в src");
  assert.equal(
    toolSummary("Agent", { description: "Review", subagent_type: "Explore" }),
    "Review (Explore)"
  );
  assert.equal(toolSummary("Skill", { skill: "changelog" }), "/changelog");
  assert.equal(
    toolSummary("AskUserQuestion", { questions: [{ question: "Какой вариант?" }] }),
    "Какой вариант?"
  );
  assert.equal(toolSummary("TodoWrite", { todos: [1, 2] }), "2 пунктов");
  assert.equal(toolSummary("mcp__playwright__browser_navigate", { url: "http://x" }), "http://x");
  assert.equal(toolName("mcp__playwright__browser_navigate"), "browser_navigate");
  assert.equal(toolName("Bash"), "Bash");
});

test("Transcript collects titles, prompt, mode and the feed, skipping service lines", () => {
  const t = parse(
    { type: "ai-title", aiTitle: "AI title" },
    { type: "last-prompt", lastPrompt: "сделай всё" },
    { type: "permission-mode", permissionMode: "acceptEdits" },
    { type: "api-request", params: { model: "x" } },
    user("сделай всё", 0),
    user("<system-reminder>skip</system-reminder>", 0),
    user("meta", 0, { isMeta: true }),
    text("sidechain", 1, { isSidechain: true }),
    text("Готово", 2),
    { type: "system", subtype: "turn_duration", durationMs: 1500, timestamp: iso(2) },
    { type: "system", subtype: "api_error", content: "overloaded", timestamp: iso(3) }
  );
  assert.equal(t.title, "AI title");
  assert.equal(t.lastPrompt, "сделай всё");
  assert.equal(t.mode, "acceptEdits");
  assert.equal(t.firstCwd, "/root/super-app");
  assert.deepEqual(
    t.feed.map((e) => [e.kind, e.text ?? e.ms]),
    [
      ["user", "сделай всё"],
      ["text", "Готово"],
      ["turn", 1500],
      ["error", "overloaded"],
    ]
  );
  assert.equal(t.lastText.text, "Готово");
  assert.equal(t.lastActivity, T0 + 3 * 60e3);

  append({ type: "custom-title", customTitle: "Мой заголовок" });
  t.update();
  assert.equal(t.title, "Мой заголовок");
});

test("issueRef finds the issue a prompt is about", () => {
  assert.equal(issueRef("глянь https://github.com/o/r/issues/105 и issue #7"), 105);
  assert.equal(issueRef("/auto-bug-fix --new issue #42 (u): t"), 42);
  assert.equal(issueRef("Возьми в работу Issue 12"), 12);
  assert.equal(issueRef("почини ишью #9"), 9);
  assert.equal(issueRef("https://github.com/o/r/pull/3"), null);
  assert.equal(issueRef("tissue #4 и PR #5"), null);
  assert.equal(issueRef(undefined), null);
});

test("Transcript.issue comes from the first user prompt that names an issue", () => {
  const t = parse(
    user("<system-reminder>issue #1</system-reminder>", 0),
    user("привет", 0),
    user("This session is being continued… issue #5", 0, { isCompactSummary: true }),
    text("issue #2 из ответа не считается", 1),
    user("/auto-feature --new issue #3 (https://github.com/o/r/issues/3): t", 2)
  );
  assert.equal(t.issue, 3);
  append(user("а заодно issue #4", 3));
  t.update();
  assert.equal(t.issue, 3, "later prompts do not move the session to another issue");
  assert.equal(parse(user("просто задача", 0)).issue, null);
});

test("Transcript title falls back to the prompt, then to the session id", () => {
  assert.equal(parse({ type: "last-prompt", lastPrompt: "x ".repeat(50) }).title.length, 60);
  assert.equal(parse(text("hi")).title, SID.slice(0, 8));
});

test("tool calls go from pending to done, with the error text on failure", () => {
  const t = parse(toolUse("t1", "Bash", { command: "npm test", description: "Run tests" }, 0));
  const [ev] = t.feed;
  assert.equal(ev.kind, "tool");
  assert.equal(ev.text, "Run tests");
  assert.equal(ev.detail, "npm test");
  assert.equal(ev.done, undefined);

  append(toolResult("t1", [{ type: "text", text: "1 failed" }], 2, true));
  t.update();
  assert.equal(ev.done, T0 + 2 * 60e3);
  assert.equal(ev.error, "1 failed");
  assert.equal(t.tools.size, 0);
});

test("worktree comes from the session cwd, else from the last worktree in a Bash command", () => {
  const fromCmd = parse(
    toolUse("a", "Bash", {
      command: "ssh home 'cd ~/kaluger-super-app/.claude/worktrees/old && ls'",
    }),
    toolUse("b", "Bash", {
      command: "ssh home 'cd ~/kaluger-super-app/.claude/worktrees/new-1 && ls'",
    })
  );
  assert.equal(fromCmd.worktree, "new-1");

  const fromCwd = parse({
    ...text("x"),
    cwd: "/root/super-app/.claude/worktrees/from-cwd",
  });
  assert.equal(fromCwd.worktree, "from-cwd");
  assert.equal(parse(text("x")).worktree, null);
});

test("PR: links anywhere in answers, the first bare 'PR #N' once the repo is known", () => {
  const t = parse(text("PR #5 без ссылки — репозиторий ещё неизвестен"));
  assert.equal(t.pr, null);

  append(text(`Открыл ${REPO}91`));
  t.update();
  assert.deepEqual(t.pr, { num: 91, url: `${REPO}91` });

  append(text("PR #102 готов, а PR #90 уже в main"));
  t.update();
  assert.deepEqual(t.pr, { num: 102, url: `${REPO}102` });
});

test("PR: tool results count only for start-task-pr / gh pr commands", () => {
  const t = parse(
    toolUse("a", "Bash", { command: "gh pr list" }),
    toolResult("a", `${REPO}7\n${REPO}8`),
    toolUse("b", "Bash", { command: "node scripts/start-task-pr.mjs --title x" }),
    toolResult("b", `{"url": "${REPO}111"}`)
  );
  assert.deepEqual(t.pr, { num: 111, url: `${REPO}111` });
});

test("update reads only appended whole lines and resets after truncation", () => {
  const t = parse(text("one"));
  const v = t.version;
  assert.equal(t.update(), false);

  const half = JSON.stringify(text("two"));
  appendFileSync(file, half.slice(0, 20));
  assert.equal(t.update(), false);
  assert.equal(t.feed.length, 1);

  appendFileSync(file, half.slice(20) + "\n");
  assert.equal(t.update(), true);
  assert.deepEqual(
    t.feed.map((e) => e.text),
    ["one", "two"]
  );
  assert.equal(t.version, v + 1);

  truncateSync(file, 0);
  writeFileSync(file, jl(text("fresh")));
  t.update();
  assert.deepEqual(
    t.feed.map((e) => e.text),
    ["fresh"]
  );
});

test("a huge transcript is read from its tail, skipping the cut first line", () => {
  writeFileSync(file, `{"type":"ai-title","aiTitle":"head ${"x".repeat(FIRST_READ_MAX)}"}\n`);
  append({ type: "ai-title", aiTitle: "tail" }, text("last"));
  const t = new Transcript(file);
  t.update();
  assert.equal(t.title, "tail");
  assert.deepEqual(
    t.feed.map((e) => e.text),
    ["last"]
  );
});

test("the feed keeps the last FEED_MAX events and forgets their pending tools", () => {
  const entries = [toolUse("old", "Bash", { command: "sleep" })];
  for (let i = 0; i < FEED_MAX; i++) entries.push(text(`m${i}`));
  const t = parse(...entries);
  assert.equal(t.feed.length, FEED_MAX);
  assert.equal(t.feed[0].text, "m0");
  assert.equal(t.tools.size, 0);
});

test("subagents lists only unfinished ones with a recent transcript", () => {
  const sub = join(dir, SID, "subagents");
  mkdirSync(sub, { recursive: true });
  const agent = (name, meta, ageMin) => {
    writeFileSync(join(sub, `${name}.meta.json`), JSON.stringify(meta));
    const f = join(sub, `${name}.jsonl`);
    writeFileSync(f, "");
    const at = (Date.now() - ageMin * 60e3) / 1000;
    utimesSync(f, at, at);
  };
  agent("a1", { description: "Reviewer", agentType: "general-purpose" }, 1);
  agent("a2", { description: "Done", agentType: "Explore", finished: true }, 1);
  agent("a3", { description: "Stale", agentType: "Explore" }, 30);
  writeFileSync(join(sub, "a4.meta.json"), "{broken");
  write(text("x"));
  const subs = new Transcript(file).subagents();
  assert.deepEqual(
    subs.map((s) => [s.description, s.type]),
    [["Reviewer", "general-purpose"]]
  );
  assert.deepEqual(new Transcript(join(dir, "none.jsonl")).subagents(), []);
});

test("stateOf maps interactive status and background state", () => {
  const st = (live, feed = []) => stateOf({ live, tr: { feed } });
  assert.equal(stateOf({ live: null }), "off");
  assert.equal(st({ status: "busy" }), "busy");
  assert.equal(st({ status: "idle" }), "idle");
  assert.equal(st({ status: "waiting" }), "waiting");
  assert.equal(st({ state: "running" }), "busy");
  assert.equal(st({ state: "blocked" }), "blocked");
  assert.equal(st({ state: "needs_user" }), "waiting");
  assert.equal(st({ state: "done" }), "done");
  assert.equal(st({ state: "completed" }), "done");
  assert.equal(st({ state: "failed" }), "failed");
  assert.equal(st({ state: "stopped" }), "failed");
  assert.equal(st({ state: "something-new" }), "busy");
  const ask = [{ kind: "tool", name: "AskUserQuestion", text: "?" }];
  assert.equal(st({ status: "busy" }, ask), "question");
  assert.equal(st({ status: "busy" }, [{ ...ask[0], done: 1 }]), "busy");
});

test("stateLabel adds what a waiting session waits for", () => {
  assert.equal(stateLabel({ live: { status: "busy" } }), "работает");
  assert.equal(
    stateLabel({ live: { status: "waiting", waitingFor: "Bash" } }),
    "нужен ты: разрешение: Bash"
  );
  assert.equal(stateLabel({ live: null }), "не запущена");
});

test("displayName prefers a real agent name over the transcript title", () => {
  const tr = { title: "Из транскрипта" };
  assert.equal(displayName({ id: SID, live: { name: "Видеозвонки" }, tr }), "Видеозвонки");
  assert.equal(displayName({ id: SID, live: { name: "super-app-b3" }, tr }), "Из транскрипта");
  assert.equal(displayName({ id: SID, live: null, tr: null }), SID.slice(0, 8));
});

test("nowLine describes the latest event", () => {
  const now = T0 + 10 * 60e3;
  const line = (feed, lastText = null) => nowLine({ tr: { feed, lastText } }, now);
  assert.equal(line([]), null);
  assert.deepEqual(line([{ kind: "tool", name: "Bash", text: "Run", ts: T0 }]), [
    "Bash: Run",
    "loading~spin",
    "сейчас (10 мин)",
  ]);
  assert.equal(
    line([{ kind: "tool", name: "Bash", text: "Run", ts: T0, done: T0, error: "x" }])[1],
    "error"
  );
  assert.equal(line([{ kind: "user", text: "привет", ts: T0 }])[2], "твой запрос, 10 мин назад");
  const answer = { kind: "text", text: "Готово", ts: T0 };
  assert.deepEqual(line([answer, { kind: "turn", ts: T0 }], answer), [
    "Готово",
    "comment-discussion",
    "ответ, 10 мин назад",
  ]);
  assert.equal(line([{ kind: "turn", ts: T0 }]), null);
});

test("Store joins `claude agents` with transcripts under the configured roots", async () => {
  const projects = join(dir, "projects");
  const proj = join(projects, "-root-super-app");
  const wtProj = join(projects, "-root-super-app--claude-worktrees-x");
  const other = join(projects, "-root-1C");
  for (const d of [proj, wtProj, other]) mkdirSync(d, { recursive: true });
  const ids = { live1: "aaaa", live2: "bbbb", recent: "cccc", old: "dddd", foreign: "eeee" };
  writeFileSync(join(proj, `${ids.live1}.jsonl`), jl({ type: "ai-title", aiTitle: "busy one" }));
  writeFileSync(join(proj, `${ids.live2}.jsonl`), jl({ type: "ai-title", aiTitle: "waiting one" }));
  writeFileSync(join(wtProj, `${ids.recent}.jsonl`), jl({ type: "ai-title", aiTitle: "recent" }));
  writeFileSync(join(proj, `${ids.old}.jsonl`), jl({ type: "ai-title", aiTitle: "old" }));
  const oldAt = (Date.now() - 10 * 864e5) / 1000;
  utimesSync(join(proj, `${ids.old}.jsonl`), oldAt, oldAt);
  writeFileSync(join(other, `${ids.foreign}.jsonl`), jl({ type: "ai-title", aiTitle: "1C" }));

  const agents = join(dir, "agents.json");
  writeFileSync(
    agents,
    JSON.stringify([
      { sessionId: ids.live1, cwd: "/root/super-app", status: "busy", startedAt: 2 },
      { sessionId: ids.live2, cwd: "/root/super-app", status: "waiting", startedAt: 1 },
      { sessionId: ids.foreign, cwd: "/root/1C", status: "busy", startedAt: 3 },
    ])
  );
  const claude = join(dir, "claude");
  writeFileSync(claude, `#!/bin/sh\n[ "$1 $2" = "agents --json" ] && cat "${agents}"\n`);
  chmodSync(claude, 0o755);
  const settings = { roots: ["/root/super-app"], claudePath: claude, recentDays: 3 };
  const store = new Store({ projectsDir: projects, settings: () => settings });

  const first = store.refresh();
  assert.equal(await store.refresh(), false, "a poll in flight is not doubled");
  assert.equal(await first, true);
  assert.equal(store.agentsOk, true);
  assert.deepEqual(
    store.liveSessions.map((s) => s.tr.title),
    ["waiting one", "busy one"],
    "sessions that need you go first"
  );
  assert.deepEqual(
    store.recentSessions.map((s) => s.tr.title),
    ["recent"]
  );
  assert.equal(store.session(ids.live1).live.status, "busy");
  assert.equal(store.session("nope").live, null);
  assert.equal(store.byIssue.size, 0);

  const prompt = (n) =>
    jl(user(`Возьми в работу issue #${n} (https://github.com/o/r/issues/${n})`));
  appendFileSync(join(proj, `${ids.live1}.jsonl`), prompt(10));
  appendFileSync(join(wtProj, `${ids.recent}.jsonl`), prompt(10));
  writeFileSync(join(proj, "ffff.jsonl"), prompt(11));
  await store.refresh();
  assert.equal(store.byIssue.get(10).id, ids.live1, "a live session wins over a finished one");
  assert.equal(store.byIssue.get(11).id, "ffff");
  assert.equal(store.byIssue.get(11).live, null);
  assert.equal(store.byIssue.has(12), false);

  settings.claudePath = join(dir, "missing");
  await store.refresh();
  assert.equal(store.agentsOk, false);
  assert.equal(store.liveSessions.length, 2, "the last known live list survives a failed poll");
});

const PARTS = { impact: 30, reach: 15, urgency: 12, workaround: 15 };
const ghIssue = (number, body, labels = []) => ({
  number,
  title: `t${number}`,
  url: `https://github.com/o/r/issues/${number}`,
  body,
  labels: labels.map((name) => ({ name })),
});

test("the panel reads the score block written by scripts/issue-priority.mjs", () => {
  const body = `${renderBlock(PARTS, "вход падает на телефонах")}\n\n## Описание\nПочему: не это`;
  assert.equal(parseIssueScore(body), 72);
  assert.equal(parseIssueWhy(body), "вход падает на телефонах");
  assert.equal(parseIssueScore("**Критичность: 9/100**"), 9);
  assert.equal(parseIssueScore("Критичность: 300/100"), 100);
  assert.equal(parseIssueScore("no score"), null);
  assert.equal(parseIssueScore(undefined), null);
  assert.equal(parseIssueWhy("Почему: вне блока"), "");
});

test("issueBand matches the bands of docs/issue-priority.md", () => {
  assert.deepEqual(
    [100, 80, 79, 60, 59, 40, 39, 20, 19, 0].map((s) => issueBand(s).label),
    [
      "P0-critical",
      "P0-critical",
      "P1-high",
      "P1-high",
      "P2-medium",
      "P2-medium",
      "P3-low",
      "P3-low",
      "P4-trivial",
      "P4-trivial",
    ]
  );
  assert.equal(issueBand(90).icon, "flame");
});

test("rankIssues keeps the top N by score, newer first on ties, and counts unscored", () => {
  const block = (score) => `**Критичность: ${score}/100**`;
  const r = rankIssues(
    [
      ghIssue(1, block(50)),
      ghIssue(2, "plain"),
      ghIssue(3, block(90), ["bug"]),
      ghIssue(4, block(50)),
      ghIssue(5, null),
      ghIssue(6, block(10)),
    ],
    3
  );
  assert.deepEqual(
    r.top.map((i) => [i.number, i.score]),
    [
      [3, 90],
      [4, 50],
      [1, 50],
    ]
  );
  assert.deepEqual(r.top[0].labels, ["bug"]);
  assert.equal(r.unscored, 2);
  assert.equal(r.total, 6);
});

test("issueTakePrompt starts a plain session or an orchestrator on the issue", () => {
  const i = { number: 42, url: "https://github.com/o/r/issues/42", title: "вход\n падает  " };
  assert.equal(
    issueTakePrompt(i),
    "Возьми в работу issue #42 (https://github.com/o/r/issues/42): вход падает"
  );
  assert.equal(
    issueTakePrompt(i, "bug"),
    "/auto-bug-fix --new issue #42 (https://github.com/o/r/issues/42): вход падает. " +
      "Полное описание и обсуждение: gh issue view 42"
  );
  assert.match(issueTakePrompt(i, "feature"), /^\/auto-feature --new issue #42 \(/);
});

test("issueTakeCommand passes the prompt as one single-quoted shell argument", () => {
  const i = { number: 7, url: "u", title: "it's $HOME `x`" };
  const cmd = issueTakeCommand(i, "bug");
  assert.equal(cmd, `claude '${issueTakePrompt(i, "bug").replace(/'/g, "'\\''")}'`);
  assert.equal(
    execFileSync("/bin/sh", ["-c", `printf %s ${cmd.slice("claude ".length)}`], {
      encoding: "utf8",
    }),
    issueTakePrompt(i, "bug")
  );
  assert.ok(!cmd.includes("\n"));
});

test("IssueBoard runs the command, keeps the last list on failure and skips overlapping runs", async () => {
  const listFile = join(dir, "issues.json");
  writeFileSync(listFile, JSON.stringify([ghIssue(7, "**Критичность: 66/100**"), ghIssue(8, "x")]));
  const settings = { command: `cat '${listFile}'`, limit: 5 };
  const board = new IssueBoard({ settings: () => settings });

  const first = board.refresh();
  assert.equal(await board.refresh(), false);
  assert.equal(await first, true);
  assert.deepEqual(
    board.top.map((i) => i.number),
    [7]
  );
  assert.equal(board.unscored, 1);
  assert.equal(board.error, null);
  assert.ok(board.at);

  settings.command = "echo 'ssh: connect timed out' >&2; exit 255";
  await board.refresh();
  assert.match(board.error, /connect timed out/);
  assert.deepEqual(
    board.top.map((i) => i.number),
    [7],
    "the last good list stays"
  );

  settings.command = "echo not-json";
  await board.refresh();
  assert.match(board.error, /не JSON/);

  settings.command = "echo '{}'";
  await board.refresh();
  assert.match(board.error, /не список/);
});
