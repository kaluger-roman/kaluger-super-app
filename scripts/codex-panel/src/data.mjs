import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import adapter from '../../vscode-agents/lib.js';

const { Store, rankIssues, parseIssueWhy, issueTakePrompt, stateLabel, displayName, one } = adapter;
const runFile = promisify(execFile);
export const REPOSITORY = 'kaluger-roman/kaluger-super-app';

// Fixed argv, without a shell: neither issue text nor app input becomes executable code.
export const readIssues = async ({ repoRoot, repository, ghPath = 'gh', run = runFile }) => {
  const { stdout } = await run(ghPath, ['issue', 'list', '--repo', repository, '--state', 'open', '--limit', '1000', '--json', 'number,title,body,url,labels'], {
    cwd: repoRoot, encoding: 'utf8', timeout: 30000, maxBuffer: 64 << 20,
  });
  const issues = JSON.parse(stdout);
  if (!Array.isArray(issues)) throw new Error('GitHub вернул некорректный список issues.');
  return issues;
};

export const worktreeRoots = async (repoRoot, run = runFile) => {
  const roots = new Set([resolve(repoRoot)]);
  try {
    const { stdout } = await run('git', ['worktree', 'list', '--porcelain', '-z'], { cwd: repoRoot, encoding: 'utf8', timeout: 3000 });
    for (const entry of stdout.split('\0')) if (entry.startsWith('worktree ')) roots.add(entry.slice(9));
  } catch { /* A temporarily unavailable Git checkout still has its configured root. */ }
  return [...roots];
};

const serializeSession = session => ({
  id: session.id,
  title: displayName(session),
  status: session.live?.status || 'off',
  statusLabel: session.live ? stateLabel(session) : 'сохранённая история',
  live: Boolean(session.live),
  updatedAt: session.tr?.mtime || session.live?.startedAt || null,
  cwd: session.tr?.cwd || session.live?.cwd || '',
  worktree: session.tr?.worktree || '',
  issue: session.tr?.issue || null,
  pr: session.tr?.pr || null,
  lastPrompt: one(session.tr?.lastPrompt, 500),
  lastText: one(session.tr?.lastText?.text, 700),
  subagents: session.tr?.subagents?.() || [],
});

export class PanelData {
  constructor({ repoRoot, repository = REPOSITORY, ghPath = 'gh', codexPath = 'codex', socketPath, now = Date.now, read = readIssues, store, roots = worktreeRoots }) {
    this.repoRoot = resolve(repoRoot);
    this.repository = repository;
    this.ghPath = ghPath;
    this.now = now;
    this.read = read;
    this.roots = roots;
    this.projectRoots = [this.repoRoot];
    this.store = store || new Store({ settings: () => ({
      roots: this.projectRoots, codexPath, rpcArgs: socketPath ? ['app-server', 'proxy', '--sock', socketPath] : ['app-server', 'proxy'],
      historyFallback: true, recentDays: 7,
    }) });
    this.issues = [];
    this.issueAt = null;
    this.issueError = null;
    this.sessionAt = null;
    this.issuePending = null;
    this.sessionPending = null;
  }

  async refreshIssues(fresh) {
    if (this.issuePending) return this.issuePending;
    if (!fresh && this.issueAt && this.now() - this.issueAt < 60000) return;
    this.issuePending = (async () => {
      try {
        this.issues = await this.read({ repoRoot: this.repoRoot, repository: this.repository, ghPath: this.ghPath });
        this.issueAt = this.now(); this.issueError = null;
      } catch (error) { this.issueError = error.message; }
      finally { this.issuePending = null; }
    })();
    return this.issuePending;
  }

  async refreshSessions(fresh) {
    if (this.sessionPending) return this.sessionPending;
    if (!fresh && this.sessionAt && this.now() - this.sessionAt < 10000) return;
    this.sessionPending = (async () => {
      try {
        this.projectRoots = await this.roots(this.repoRoot);
        await this.store.refresh();
        this.sessionAt = this.now();
      } finally { this.sessionPending = null; }
    })();
    return this.sessionPending;
  }

  snapshot() {
    const ranked = rankIssues(this.issues, 1000);
    const unscored = this.issues.filter(issue => !ranked.top.some(row => row.number === issue.number)).map(issue => ({
      number: issue.number, title: issue.title, url: issue.url, score: null, why: parseIssueWhy(issue.body), labels: (issue.labels || []).map(label => label.name),
    })).sort((a, b) => b.number - a.number);
    const sessions = [...this.store.liveSessions, ...this.store.recentSessions].map(serializeSession);
    const byIssue = new Map();
    for (const session of sessions) if (session.issue && !byIssue.has(session.issue)) byIssue.set(session.issue, session.id);
    return {
      version: 1, at: this.now(), repoRoot: this.repoRoot, repository: this.repository,
      issues: {
        items: [...ranked.top, ...unscored].map(issue => ({ ...issue, sessionId: byIssue.get(issue.number) || null })),
        total: ranked.total, unscored: ranked.unscored, at: this.issueAt, error: this.issueError,
        truncated: this.issues.length >= 1000,
      },
      sessions: {
        items: sessions, at: this.sessionAt, mode: this.store.agentsOk ? 'shared-daemon' : this.store.historyOnly ? 'history' : 'unavailable',
        error: this.store.error,
        boundary: 'Живой статус доступен для сессий общего CLI daemon. Чаты Codex Desktop используют отдельный сервер: здесь доступна их сохранённая история.',
      },
    };
  }

  async state({ fresh = false } = {}) {
    await Promise.all([this.refreshIssues(fresh), this.refreshSessions(fresh)]);
    return this.snapshot();
  }

  async session(id) {
    await this.refreshSessions(false);
    const session = this.store.session(id);
    if (!session.tr) throw new Error('Сессия проекта не найдена. Обновите панель.');
    return { session: serializeSession(session), feed: session.tr.feed };
  }

  async prepareIssue({ number, mode }) {
    await this.refreshIssues(false);
    const issue = this.issues.find(row => row.number === number);
    if (!issue) throw new Error('Открытая issue не найдена. Обновите список.');
    return {
      issue: { number: issue.number, title: issue.title, url: issue.url }, mode,
      prompt: `${issueTakePrompt(issue, mode)}\n\nПроект: ${this.repoRoot}. Соблюдай AGENTS.md и workflow этого проекта. Создай изолированный worktree, если текущая рабочая копия уже занята другой задачей.`,
    };
  }

  dispose() { this.store.dispose(); }
}
