// Codex app-server adapter and pure view logic. No transcript scraping or model calls.
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const { RpcClient } = require('./rpc.cjs');
const FEED_MAX = 150;
const one = (value, n = 100) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const underRoots = (roots, cwd) => Boolean(cwd) && roots.some(root => cwd === root || cwd.startsWith(root + path.sep));
const issueRef = text => {
  const match = String(text ?? '').match(/github\.com\/[\w.-]+\/[\w.-]+\/issues\/(\d+)/) || String(text ?? '').match(/(?:^|[^\p{L}])(?:issue|ишью)\s*#?(\d+)/iu);
  return match ? Number(match[1]) : null;
};
const shellQuote = text => "'" + String(text).replace(/'/g, "'\\''") + "'";
const resumeCommand = (id, command = 'codex') => `${shellQuote(command)} resume ${shellQuote(id)}`;
const ago = (ms, now = Date.now()) => {
  if (!ms) return '';
  const minutes = Math.round((now - ms) / 60000);
  return minutes < 1 ? 'только что' : minutes < 90 ? `${minutes} мин` : minutes < 2880 ? `${Math.round(minutes / 60)} ч` : `${Math.round(minutes / 1440)} дн`;
};
const STATE = {
  busy: ['работает', 'sync~spin', 'charts.blue'],
  idle: ['ждёт ввода', 'bell', 'charts.green'],
  waiting: ['нужен ты', 'warning', 'charts.orange'],
  question: ['вопрос', 'question', 'charts.orange'],
  blocked: ['заблокирована', 'warning', 'charts.orange'],
  done: ['готово', 'check', 'charts.green'],
  failed: ['ошибка', 'error', 'errorForeground'],
  off: ['не загружена', 'history', undefined],
  unknown: ['статус недоступен', 'question', undefined],
};
const NEEDS_YOU = new Set(['waiting', 'question', 'blocked']);
const statusOf = status => {
  if (status?.type === 'active') {
    if (status.activeFlags?.includes('waitingOnUserInput')) return 'question';
    if (status.activeFlags?.includes('waitingOnApproval')) return 'waiting';
    return 'busy';
  }
  return ({ idle: 'idle', systemError: 'failed', notLoaded: 'off' })[status?.type] || 'unknown';
};
const stateOf = session => session.live?.status || 'off';
const stateLabel = session => STATE[stateOf(session)]?.[0] || STATE.unknown[0];
const displayName = session => session.live?.name || session.tr?.title || session.id.slice(0, 8);
const nowLine = session => {
  const item = session.tr?.feed.at(-1);
  if (!item) return null;
  return [one(item.text, 160), item.kind === 'tool' ? (!item.done ? 'loading~spin' : item.error ? 'error' : 'check') : 'comment-discussion', ago(item.ts)];
};
const textContent = content => (content || []).filter(item => item.type === 'text').map(item => item.text).join('\n');
const itemText = item => item.text || item.command || item.query || item.prompt || item.tool || item.name || (item.changes || []).map(change => change.path).join(', ') || item.type;
const feedItem = (item, timestamp) => {
  const common = { id: item.id, ts: item.startedAt ? item.startedAt * 1000 : timestamp };
  if (item.type === 'userMessage') return { ...common, kind: 'user', text: textContent(item.content) };
  if (item.type === 'agentMessage' || item.type === 'plan') return { ...common, kind: 'text', text: item.text };
  if (item.type === 'reasoning') return null; // Do not expose hidden reasoning in a monitor.
  const failed = ['failed', 'declined', 'interrupted'].includes(item.status) || item.success === false || (typeof item.exitCode === 'number' && item.exitCode !== 0) || Boolean(item.error);
  return { ...common, kind: 'tool', name: item.tool || item.type, text: itemText(item), done: item.status === 'inProgress' ? null : timestamp, error: failed, result: one(item.aggregatedOutput || item.error?.message || (item.status === 'declined' ? 'Операция отклонена; не выполнена' : item.status === 'interrupted' ? 'Операция прервана' : ''), 2000) };
};
const threadView = (thread, children = []) => {
  const feed = [];
  let firstPrompt = null, lastPrompt = null, lastText = null, pr = null;
  for (const turn of thread.turns || []) {
    const ts = (turn.startedAt || thread.updatedAt) * 1000;
    for (const item of turn.items || []) {
      const entry = feedItem(item, ts);
      if (!entry) continue;
      feed.push(entry);
      if (entry.kind === 'user') { firstPrompt ??= entry.text; lastPrompt = entry.text; }
      if (entry.kind === 'text') lastText = { text: entry.text, ts: entry.ts };
      for (const match of entry.text.matchAll(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/(\d+)/g)) pr = { url: match[0], num: Number(match[1]) };
    }
    if (turn.status !== 'inProgress') feed.push({ kind: 'turn', ts: (turn.completedAt || thread.updatedAt) * 1000, text: turn.status, status: turn.status, ms: turn.durationMs, error: ['failed', 'interrupted'].includes(turn.status), result: turn.error?.message || '' });
  }
  return {
    version: createHash('sha256').update(JSON.stringify([feed.slice(-FEED_MAX), children.map(child => [child.id, child.status]), thread.name])).digest('hex'),
    id: thread.id, title: thread.name || one(firstPrompt || thread.preview, 120), cwd: thread.cwd, firstCwd: thread.cwd,
    mtime: thread.updatedAt * 1000, lastActivity: thread.updatedAt * 1000,
    lastPrompt, lastText, issue: issueRef(thread.preview) || issueRef(firstPrompt), pr,
    worktree: thread.gitInfo?.branch || path.basename(thread.cwd), feed: feed.slice(-FEED_MAX),
    subagents: () => children.filter(child => statusOf(child.status) !== 'off').map(child => ({ description: child.agentNickname || child.name || child.preview || child.id, type: child.agentRole || statusOf(child.status), mtime: child.updatedAt * 1000 })),
  };
};

class Store {
  constructor({ settings, createClient = options => new RpcClient(options) }) {
    this.settings = settings; this.createClient = createClient;
    this.tr = new Map(); this.live = []; this.liveIds = new Set(); this.polling = false; this.agentsOk = null;
    this.client = null; this.historyOnly = false; this.error = null;
  }
  async connect() {
    if (this.client) return;
    const settings = this.settings();
    this.client = this.createClient({ command: settings.codexPath || 'codex', args: settings.rpcArgs || ['app-server', 'proxy'] });
    try { await this.client.connect(); this.historyOnly = (settings.rpcArgs || []).includes('stdio://'); }
    catch (error) {
      this.client.close(); this.client = null;
      if (!settings.historyFallback) throw error;
      this.client = this.createClient({ command: settings.codexPath || 'codex', args: ['app-server', '--listen', 'stdio://'] });
      try { await this.client.connect(); this.historyOnly = true; }
      catch (fallbackError) { this.client.close(); this.client = null; throw fallbackError; }
    }
  }
  async list(params) {
    const result = []; let cursor;
    do {
      const page = await this.client.request('thread/list', { ...params, cursor, limit: 100, sortKey: 'updated_at', sourceKinds: ['cli', 'vscode', 'appServer', 'exec', 'subAgent', 'subAgentThreadSpawn', 'subAgentOther', 'unknown'] });
      if (!Array.isArray(page.data)) throw new Error('Некорректный ответ thread/list');
      result.push(...page.data); cursor = page.nextCursor;
      // Sorted oldest pages cannot contain recent unloaded threads; loaded ones are fetched separately.
      if (page.data.length && page.data.at(-1).updatedAt * 1000 < Date.now() - this.settings().recentDays * 86400000) break;
    } while (cursor);
    return result;
  }
  async readHistory(row) {
    if (row.historyMode !== 'paginated') return (await this.client.request('thread/read', { threadId: row.id, includeTurns: true })).thread;
    const turns = []; let cursor, count = 0;
    do {
      const page = await this.client.request('thread/turns/list', { threadId: row.id, cursor, limit: 20, sortDirection: 'desc', itemsView: 'full' });
      if (!Array.isArray(page.data)) throw new Error('Некорректный ответ thread/turns/list');
      turns.push(...page.data); count += page.data.reduce((sum, turn) => sum + turn.items.length + 1, 0);
      cursor = page.nextCursor;
    } while (cursor && count < FEED_MAX);
    return { ...row, turns: turns.reverse() };
  }
  async refresh() {
    if (this.polling) return false;
    this.polling = true;
    try {
      await this.connect();
      const roots = this.settings().roots;
      const rows = await this.list({});
      if (!this.historyOnly) {
        let cursor;
        do {
          const loaded = await this.client.request('thread/loaded/list', { cursor, limit: 100 });
          for (const id of loaded.data || []) {
            const { thread } = await this.client.request('thread/read', { threadId: id });
            const index = rows.findIndex(row => row.id === id);
            if (index >= 0) rows[index] = thread; else rows.push(thread);
          }
          cursor = loaded.nextCursor;
        } while (cursor);
      }
      const since = Date.now() - this.settings().recentDays * 86400000;
      const selected = rows.filter(row => underRoots(roots, row.cwd) && (row.updatedAt * 1000 >= since || (!this.historyOnly && statusOf(row.status) !== 'off')));
      const next = new Map();
      for (const row of selected) {
        const old = this.tr.get(row.id);
        let view = old;
        if (!old || old.mtime !== row.updatedAt * 1000 || (!this.historyOnly && statusOf(row.status) !== 'off')) {
          const thread = await this.readHistory(row);
          view = threadView(thread, selected.filter(child => child.parentThreadId === row.id));
        }
        next.set(row.id, view);
      }
      this.tr = next;
      this.live = this.historyOnly ? [] : selected.filter(row => !row.parentThreadId && statusOf(row.status) !== 'off').map(row => ({ sessionId: row.id, cwd: row.cwd, name: row.name, status: statusOf(row.status), startedAt: row.createdAt * 1000, kind: 'codex' }));
      this.liveIds = new Set(this.live.map(row => row.sessionId));
      this.childIds = new Set(selected.filter(row => row.parentThreadId).map(row => row.id));
      this.agentsOk = !this.historyOnly; this.error = this.historyOnly ? 'История доступна; живой статус требует подключения к общему Codex daemon.' : null;
    } catch (error) {
      this.agentsOk = false; this.error = error.message;
      // Keep evidence/history, but never present stale status as a live successful poll.
      this.live = []; this.liveIds.clear(); this.client?.close(); this.client = null;
    } finally { this.polling = false; }
    return true;
  }
  byId(id) { return this.tr.get(id) || null; }
  get liveSessions() {
    const need = s => Number(NEEDS_YOU.has(stateOf(s)));
    return this.live.map(live => ({ id: live.sessionId, live, tr: this.byId(live.sessionId) })).sort((a, b) => need(b) - need(a) || b.live.startedAt - a.live.startedAt);
  }
  get recentSessions() { return [...this.tr.values()].filter(tr => !this.liveIds.has(tr.id) && !this.childIds?.has(tr.id)).sort((a,b) => b.mtime-a.mtime).map(tr => ({ id: tr.id, live: null, tr })); }
  session(id) { return { id, live: this.live.find(row => row.sessionId === id) || null, tr: this.byId(id) }; }
  get byIssue() { const result = new Map(); for (const session of [...this.liveSessions,...this.recentSessions]) if (session.tr?.issue && !result.has(session.tr.issue)) result.set(session.tr.issue,session); return result; }
  dispose() { this.client?.close(); }
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
  bug: "$auto-bug-fix --new ",
  feature: "$auto-feature --new ",
};

const issueTakePrompt = (issue, mode = "plain") => {
  const ref = `issue #${issue.number} (${issue.url}): ${one(issue.title, 300)}`;
  return mode === "plain"
    ? `Возьми в работу ${ref}`
    : `${ISSUE_TAKE_PREFIX[mode]}${ref}. Полное описание и обсуждение: gh issue view ${issue.number}`;
};

// Shell command for the terminal: the prompt is a single-quoted argument of `codex`
const issueTakeCommand = (issue, mode, command = "codex") =>
  `${shellQuote(command)} --worktree '${issueTakePrompt(issue, mode).replace(/'/g, "'\\''")}'`;

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

module.exports = { FEED_MAX, one, underRoots, issueRef, shellQuote, resumeCommand, ago, STATE, NEEDS_YOU, statusOf, stateOf, stateLabel, displayName, nowLine, threadView, Store, issueBand, parseIssueScore, parseIssueWhy, rankIssues, ISSUE_TAKE_PREFIX, issueTakePrompt, issueTakeCommand, fetchIssues, IssueBoard };
