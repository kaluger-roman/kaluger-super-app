// Pure logic of the "Агенты Super App" VS Code extension (no `vscode` import, covered by node --test):
// incremental transcript parsing, session state, and polling of `claude agents --json`.
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const FEED_MAX = 150;
// First pass over a huge transcript reads only its tail
const FIRST_READ_MAX = 8 * 1024 * 1024;
const SUBAGENT_STALE_MS = 15 * 60e3;
const PR_RE = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/(\d+)/g;
const WT_RE = /\.claude\/worktrees\/([\w.-]+)/g;
const AUTO_NAME_RE = /^[\w.-]+-[0-9a-f]{2}$/;
const ISSUE_URL_RE = /github\.com\/[\w.-]+\/[\w.-]+\/issues\/(\d+)/;
const ISSUE_REF_RE = /(?:^|[^\p{L}])(?:issue|ишью)\s*#?(\d+)/iu;

const encodeCwd = (p) => p.replace(/[^A-Za-z0-9]/g, "-");
const underRoots = (roots, cwd) =>
  Boolean(cwd) && roots.some((r) => cwd === r || cwd.startsWith(r + "/"));
const one = (s, n = 100) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);
// Issue a prompt is about: its link, else "issue #N" / "ишью #N"
const issueRef = (text) => {
  const m = String(text ?? "").match(ISSUE_URL_RE) || String(text ?? "").match(ISSUE_REF_RE);
  return m ? Number(m[1]) : null;
};
const ago = (ms, now = Date.now()) => {
  if (!ms) return "";
  const m = Math.round((now - ms) / 60e3);
  if (m < 1) return "только что";
  if (m < 90) return `${m} мин`;
  return m < 2880 ? `${Math.round(m / 60)} ч` : `${Math.round(m / 1440)} дн`;
};

const textOf = (c) =>
  typeof c === "string"
    ? c
    : Array.isArray(c)
      ? c
          .filter((x) => x.type === "text")
          .map((x) => x.text)
          .join("\n")
      : "";

// User message as shown in the feed: slash commands as "/name args", service messages dropped
const userText = (c) => {
  const s = textOf(c).trim();
  if (!s) return "";
  const cmd = s.match(/<command-name>([^<]*)<\/command-name>/);
  if (cmd) {
    const a = s.match(/<command-args>([\s\S]*?)<\/command-args>/);
    return `${cmd[1]} ${a ? a[1] : ""}`.trim();
  }
  if (/^<(local-command|system-reminder|task-notification|bash-|user-memory)/.test(s)) return "";
  return s;
};

const toolSummary = (name, i = {}) => {
  const base = (p) => (p ? path.basename(String(p)) : "");
  switch (name) {
    case "Bash":
      return i.description || one(i.command, 120);
    case "Read":
    case "Edit":
    case "Write":
    case "NotebookEdit":
      return base(i.file_path || i.notebook_path);
    case "Grep":
    case "Glob":
      return `${i.pattern || ""}${i.path ? " в " + base(i.path) : ""}`;
    case "Agent":
    case "Task":
      return `${i.description || ""}${i.subagent_type ? ` (${i.subagent_type})` : ""}`;
    case "Skill":
      return `/${i.skill}${i.args ? " " + one(i.args, 60) : ""}`;
    case "AskUserQuestion":
      return one(i.questions?.[0]?.question, 140);
    case "TodoWrite":
      return `${(i.todos || []).length} пунктов`;
    default:
      return one(
        i.description || i.url || i.query || i.element || i.prompt || i.reason || i.command || "",
        120
      );
  }
};
const toolName = (n) => (n.startsWith("mcp__") ? n.split("__").pop() : n);

class Transcript {
  constructor(file) {
    this.file = file;
    this.id = path.basename(file, ".jsonl");
    this.reset();
  }

  reset() {
    this.offset = 0;
    this.feed = [];
    this.tools = new Map();
    this.custom = null;
    this.ai = null;
    this.lastPrompt = null;
    this.issue = null;
    this.mode = null;
    this.cwd = null;
    this.firstCwd = null;
    this.wtCmd = null;
    this.pr = null;
    this.prBase = null;
    this.version = 0;
  }

  // Reads only the bytes appended since the last call; returns whether anything new was parsed
  update() {
    let st;
    try {
      st = fs.statSync(this.file);
    } catch {
      return false;
    }
    this.mtime = st.mtimeMs;
    if (st.size < this.offset) this.reset();
    if (st.size === this.offset) return false;
    const start = !this.offset && st.size > FIRST_READ_MAX ? st.size - FIRST_READ_MAX : this.offset;
    const buf = Buffer.alloc(st.size - start);
    const fd = fs.openSync(this.file, "r");
    try {
      fs.readSync(fd, buf, 0, buf.length, start);
    } finally {
      fs.closeSync(fd);
    }
    // Whole lines only: an unfinished last line is read on the next call
    const end = buf.lastIndexOf(10);
    if (end < 0) return false;
    // Started mid-file: the first line is cut
    const from = start !== this.offset ? buf.indexOf(10) + 1 : 0;
    this.offset = start + end + 1;
    for (const l of buf.toString("utf8", from, end).split("\n")) this.line(l);
    this.version++;
    return true;
  }

  line(l) {
    if (!l || l.startsWith('{"type":"api-request')) return;
    let o;
    try {
      o = JSON.parse(l);
    } catch {
      return;
    }
    switch (o.type) {
      case "custom-title":
        this.custom = o.customTitle || this.custom;
        return;
      case "ai-title":
        this.ai = o.aiTitle || this.ai;
        return;
      case "last-prompt":
        this.lastPrompt = o.lastPrompt || this.lastPrompt;
        return;
      case "permission-mode":
        this.mode = o.permissionMode;
        return;
    }
    if (o.cwd) {
      this.firstCwd ||= o.cwd;
      this.cwd = o.cwd;
    }
    if (o.isSidechain || o.isMeta) return;
    const ts = o.timestamp ? Date.parse(o.timestamp) : 0;
    if (o.type === "system") {
      if (o.subtype === "turn_duration") this.push({ kind: "turn", ts, ms: o.durationMs });
      else if (/error/i.test(o.subtype || ""))
        this.push({ kind: "error", ts, text: one(o.content || o.subtype, 300) });
      return;
    }
    const c = o.message?.content;
    if (o.type === "user") {
      if (Array.isArray(c)) for (const x of c) if (x.type === "tool_result") this.result(x, ts);
      const t = userText(c);
      if (t) this.push({ kind: "user", ts, text: t.slice(0, 4000) });
      // The session's issue is the one of its first prompt that names one; a compaction summary
      // retells the whole session, issues it only mentioned included
      if (t && !this.issue && !o.isCompactSummary) this.issue = issueRef(t);
      return;
    }
    if (o.type === "assistant" && Array.isArray(c)) {
      for (const x of c) {
        if (x.type === "text" && x.text?.trim()) {
          this.push({ kind: "text", ts, text: x.text.slice(0, 8000) });
          this.scanPr(x.text, true);
        }
        if (x.type === "tool_use") this.toolUse(x, ts);
      }
    }
  }

  toolUse(x, ts) {
    const ev = {
      kind: "tool",
      ts,
      id: x.id,
      name: toolName(x.name),
      text: toolSummary(x.name, x.input || {}),
    };
    if (x.name === "Bash") {
      const cmd = String(x.input?.command || "");
      ev.detail = cmd.slice(0, 2000);
      const wt = [...cmd.matchAll(WT_RE)].pop();
      if (wt) this.wtCmd = wt[1];
      ev.prWatch = /start-task-pr|gh pr (create|view|ready|edit)/.test(cmd);
    }
    this.tools.set(x.id, ev);
    this.push(ev);
  }

  result(x, ts) {
    const ev = this.tools.get(x.tool_use_id);
    if (!ev) return;
    this.tools.delete(x.tool_use_id);
    ev.done = ts || Date.now();
    const txt = textOf(x.content);
    if (x.is_error) ev.error = one(txt, 400);
    if (ev.prWatch) this.scanPr(txt, false);
  }

  // Last mentioned PR: a link anywhere, plus the first "PR #N" of an answer (usually its subject;
  // later ones tend to be neighbouring PRs). The URL is built from the repo of an earlier link.
  scanPr(text, bare) {
    for (const m of String(text).matchAll(PR_RE)) {
      this.pr = { num: +m[1], url: m[0] };
      this.prBase = m[0].slice(0, -m[1].length);
    }
    const m = bare && this.prBase && String(text).match(/\bPR #(\d+)/);
    if (m) this.pr = { num: +m[1], url: this.prBase + m[1] };
  }

  push(ev) {
    this.feed.push(ev);
    if (this.feed.length <= FEED_MAX) return;
    for (const x of this.feed.splice(0, this.feed.length - FEED_MAX))
      if (x.kind === "tool") this.tools.delete(x.id);
  }

  get title() {
    return this.custom || this.ai || one(this.lastPrompt, 60) || this.id.slice(0, 8);
  }

  get worktree() {
    return this.cwd?.match(/\.claude\/worktrees\/([^/]+)/)?.[1] || this.wtCmd;
  }

  get lastText() {
    for (let i = this.feed.length - 1; i >= 0; i--)
      if (this.feed[i].kind === "text") return this.feed[i];
    return null;
  }

  get lastActivity() {
    return this.feed.at(-1)?.ts || this.mtime;
  }

  // Running subagents: meta.json without `finished` and a transcript written recently
  subagents(now = Date.now()) {
    const dir = path.join(this.file.slice(0, -".jsonl".length), "subagents");
    let files;
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith(".meta.json"));
    } catch {
      return [];
    }
    const out = [];
    for (const f of files) {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
        if (m.finished) continue;
        const mt = fs.statSync(path.join(dir, f.replace(".meta.json", ".jsonl"))).mtimeMs;
        if (now - mt < SUBAGENT_STALE_MS)
          out.push({ description: m.description || m.agentType, type: m.agentType, mtime: mt });
      } catch {
        // half-written meta or a subagent without a transcript yet
      }
    }
    return out.sort((a, b) => b.mtime - a.mtime);
  }
}

// [label, codicon, theme color]
const STATE = {
  busy: ["работает", "sync~spin", "charts.green"],
  waiting: ["нужен ты: разрешение", "warning", "charts.orange"],
  question: ["нужен ты: вопрос", "question", "charts.orange"],
  blocked: ["нужен ты: заблокирован", "warning", "charts.orange"],
  idle: ["ждёт ввода", "bell", "charts.yellow"],
  done: ["завершена", "pass", undefined],
  failed: ["ошибка", "error", "errorForeground"],
  off: ["не запущена", "history", undefined],
};
const NEEDS_YOU = new Set(["waiting", "question", "blocked"]);

// Interactive sessions report `status` (busy/idle/waiting), background ones `state`
const stateOf = (s) => {
  if (!s.live) return "off";
  const raw = s.live.status || s.live.state || "";
  const last = s.tr?.feed.at(-1);
  if (last?.kind === "tool" && !last.done && last.name === "AskUserQuestion") return "question";
  if (raw === "busy" || raw === "running") return "busy";
  if (raw === "waiting" || raw === "needs_user") return "waiting";
  if (raw === "completed") return "done";
  if (raw === "error" || raw === "stopped") return "failed";
  return STATE[raw] ? raw : "busy";
};

const stateLabel = (s) => {
  const st = stateOf(s);
  const wf = s.live?.waitingFor;
  const extra =
    st === "waiting" && wf ? `: ${one(typeof wf === "string" ? wf : JSON.stringify(wf), 40)}` : "";
  return STATE[st][0] + extra;
};

// Auto-generated agent names ("super-app-3f") say nothing, the transcript title is better
const displayName = (s) =>
  (s.live?.name && !AUTO_NAME_RE.test(s.live.name) ? s.live.name : null) ||
  s.tr?.title ||
  s.id.slice(0, 8);

// What the session is doing now: [text, codicon, hint] or null
const nowLine = (s, now = Date.now()) => {
  const tr = s.tr;
  const last = tr?.feed.at(-1);
  if (!last) return null;
  if (last.kind === "tool" && !last.done)
    return [`${last.name}: ${last.text}`, "loading~spin", `сейчас (${ago(last.ts, now)})`];
  if (last.kind === "tool")
    return [
      `${last.name}: ${last.text}`,
      last.error ? "error" : "check",
      `последнее, ${ago(last.done, now)} назад`,
    ];
  if (last.kind === "user")
    return [one(last.text, 120), "comment", `твой запрос, ${ago(last.ts, now)} назад`];
  if (last.kind === "turn") {
    const t = tr.lastText;
    return t ? [one(t.text, 160), "comment-discussion", `ответ, ${ago(t.ts, now)} назад`] : null;
  }
  if (last.kind === "text") return [one(last.text, 160), "comment-discussion", ago(last.ts, now)];
  return [last.text, "error", ago(last.ts, now)];
};

class Store {
  // settings() -> { roots, claudePath, recentDays }
  constructor({ projectsDir, settings }) {
    this.projectsDir = projectsDir;
    this.settings = settings;
    this.tr = new Map();
    this.live = [];
    this.liveIds = new Set();
    this.polling = false;
    this.agentsOk = null;
  }

  transcript(file) {
    let t = this.tr.get(file);
    if (!t) {
      t = new Transcript(file);
      this.tr.set(file, t);
    }
    t.update();
    return t;
  }

  scanFiles() {
    const { roots, recentDays } = this.settings();
    const enc = roots.map(encodeCwd);
    const since = Date.now() - recentDays * 864e5;
    let dirs = [];
    try {
      dirs = fs.readdirSync(this.projectsDir);
    } catch {
      return;
    }
    for (const dir of dirs) {
      if (!enc.some((e) => dir === e || dir.startsWith(e + "-"))) continue;
      let files = [];
      try {
        files = fs
          .readdirSync(path.join(this.projectsDir, dir))
          .filter((f) => f.endsWith(".jsonl"));
      } catch {
        continue;
      }
      for (const f of files) {
        const file = path.join(this.projectsDir, dir, f);
        let mt = 0;
        try {
          mt = fs.statSync(file).mtimeMs;
        } catch {
          continue;
        }
        if (mt < since && !this.liveIds.has(f.slice(0, -".jsonl".length))) {
          this.tr.delete(file);
          continue;
        }
        this.transcript(file);
      }
    }
  }

  pollLive() {
    return new Promise((resolve) =>
      execFile(
        this.settings().claudePath,
        ["agents", "--json"],
        { timeout: 20000, maxBuffer: 8 << 20 },
        (err, out) => {
          if (err) return resolve(null);
          try {
            resolve(JSON.parse(out));
          } catch {
            resolve(null);
          }
        }
      )
    );
  }

  // Returns false when the previous poll is still running
  async refresh() {
    if (this.polling) return false;
    this.polling = true;
    try {
      const { roots } = this.settings();
      const agents = await this.pollLive();
      this.agentsOk = Array.isArray(agents);
      if (this.agentsOk) {
        this.live = agents.filter((a) => a.sessionId && underRoots(roots, a.cwd));
        this.liveIds = new Set(this.live.map((a) => a.sessionId));
      }
      this.scanFiles();
      for (const a of this.live) {
        const file = path.join(this.projectsDir, encodeCwd(a.cwd), a.sessionId + ".jsonl");
        if (!this.tr.has(file) && fs.existsSync(file)) this.transcript(file);
      }
      return true;
    } finally {
      this.polling = false;
    }
  }

  byId(id) {
    for (const t of this.tr.values()) if (t.id === id) return t;
    return null;
  }

  // Sessions that need you first, then the most recently started
  get liveSessions() {
    const need = (s) => (NEEDS_YOU.has(stateOf(s)) ? 1 : 0);
    return this.live
      .map((a) => ({ id: a.sessionId, live: a, tr: this.byId(a.sessionId) }))
      .sort((x, y) => need(y) - need(x) || (y.live.startedAt || 0) - (x.live.startedAt || 0));
  }

  get recentSessions() {
    return [...this.tr.values()]
      .filter((t) => !this.liveIds.has(t.id))
      .sort((a, b) => b.mtime - a.mtime)
      .map((tr) => ({ id: tr.id, live: null, tr }));
  }

  session(id) {
    const a = this.live.find((x) => x.sessionId === id);
    return { id, live: a || null, tr: this.byId(id) };
  }

  // Issue number -> the session working on it: a live one first, else the most recent
  get byIssue() {
    const m = new Map();
    for (const s of [...this.liveSessions, ...this.recentSessions]) {
      const n = s.tr?.issue;
      if (n && !m.has(n)) m.set(n, s);
    }
    return m;
  }
}

// ---- prioritized open issues (docs/issue-priority.md) ----

// Same pattern as SCORE_RE in scripts/issue-priority.mjs — keep the two in sync
const ISSUE_SCORE_RE = /Критичность:\s*\**\s*(\d{1,3})\s*\/\s*100/;
const ISSUE_BLOCK_RE = /<!-- priority -->([\s\S]*?)<!-- \/priority -->/;
// [min score, band label, codicon, theme color]
const ISSUE_BANDS = [
  [80, "P0-critical", "flame", "errorForeground"],
  [60, "P1-high", "warning", "charts.orange"],
  [40, "P2-medium", "circle-filled", "charts.yellow"],
  [20, "P3-low", "circle-outline", "charts.green"],
  [0, "P4-trivial", "circle-outline", undefined],
];

const issueBand = (score) => {
  const [, label, icon, color] = ISSUE_BANDS.find(([min]) => score >= min);
  return { label, icon, color };
};

const parseIssueScore = (body) => {
  const m = (body || "").match(ISSUE_SCORE_RE);
  return m ? Math.min(Number(m[1]), 100) : null;
};

const parseIssueWhy = (body) =>
  (body || "")
    .match(ISSUE_BLOCK_RE)?.[1]
    .match(/^Почему:\s*(.+)$/m)?.[1]
    .trim() || "";

// Open issues from `gh issue list --json number,title,body,url,labels` -> the top `limit` by score
// (newer first on ties) and how many have no score yet
const rankIssues = (issues, limit) => {
  const scored = [];
  let unscored = 0;
  for (const i of issues) {
    const score = parseIssueScore(i.body);
    if (score === null) {
      unscored++;
      continue;
    }
    scored.push({
      number: i.number,
      title: i.title,
      url: i.url,
      score,
      why: parseIssueWhy(i.body),
      labels: (i.labels || []).map((l) => l.name),
    });
  }
  scored.sort((a, b) => b.score - a.score || b.number - a.number);
  return { top: scored.slice(0, limit), unscored, total: issues.length };
};

// How "take in work" starts a new session on an issue: a plain prompt or one of the orchestrators
// (`--new` so an unfinished run of the same orchestrator does not turn the start into a resume)
const ISSUE_TAKE_PREFIX = {
  plain: "",
  bug: "/auto-bug-fix --new ",
  feature: "/auto-feature --new ",
};

const issueTakePrompt = (issue, mode = "plain") => {
  const ref = `issue #${issue.number} (${issue.url}): ${one(issue.title, 300)}`;
  return mode === "plain"
    ? `Возьми в работу ${ref}`
    : `${ISSUE_TAKE_PREFIX[mode]}${ref}. Полное описание и обсуждение: gh issue view ${issue.number}`;
};

// Shell command for the terminal: the prompt is a single-quoted argument of `claude`
const issueTakeCommand = (issue, mode) =>
  `claude '${issueTakePrompt(issue, mode).replace(/'/g, "'\\''")}'`;

const fetchIssues = (command, timeout = 60000) =>
  new Promise((resolve, reject) =>
    execFile("/bin/sh", ["-c", command], { timeout, maxBuffer: 64 << 20 }, (err, out, errOut) => {
      if (err) return reject(new Error(one(errOut || err.message, 300)));
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error(`ответ не JSON: ${one(out, 100)}`));
      }
    })
  );

class IssueBoard {
  // settings() -> { command, limit }
  constructor({ settings }) {
    this.settings = settings;
    this.top = [];
    this.unscored = 0;
    this.total = 0;
    this.at = null;
    this.error = null;
    this.loading = false;
  }

  // Keeps the last good list when a fetch fails; returns false when a fetch is already running
  async refresh() {
    if (this.loading) return false;
    this.loading = true;
    try {
      const { command, limit } = this.settings();
      const list = await fetchIssues(command);
      if (!Array.isArray(list)) throw new Error("ответ не список issues");
      Object.assign(this, rankIssues(list, limit), { at: Date.now(), error: null });
    } catch (e) {
      this.error = e.message;
    } finally {
      this.loading = false;
    }
    return true;
  }
}

module.exports = {
  issueBand,
  parseIssueScore,
  parseIssueWhy,
  rankIssues,
  ISSUE_TAKE_PREFIX,
  issueTakePrompt,
  issueTakeCommand,
  fetchIssues,
  IssueBoard,
  FEED_MAX,
  FIRST_READ_MAX,
  STATE,
  NEEDS_YOU,
  encodeCwd,
  underRoots,
  one,
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
};
