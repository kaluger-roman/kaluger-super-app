import assert from 'node:assert/strict';
import test from 'node:test';
import { PanelData, readIssues, REPOSITORY, worktreeRoots } from '../src/data.mjs';
import { draftMessage, openIssueDraft, safeGithubUrl } from '../src/bridge.mjs';

const issue = (number, score, title = 'Проверка') => ({ number, title, url: `https://github.com/${REPOSITORY}/issues/${number}`, labels: [{ name: 'bug' }], body: score === null ? '' : `<!-- priority -->\nКритичность: **${score}/100**\nПочему: Конкретное влияние\n<!-- /priority -->` });
const session = (id, live) => ({
  id, live: live ? { sessionId: id, status: 'busy', name: 'Работа', startedAt: 1000 } : null,
  tr: { id, title: id, mtime: 2000, cwd: '/project', worktree: 'codex/task', issue: 7, feed: [{ kind: 'text', text: 'Ответ' }], subagents: () => [] },
});
const fakeStore = (live = [], recent = []) => ({
  agentsOk: true, historyOnly: false, error: null, liveSessions: live, recentSessions: recent,
  async refresh() {}, session: id => [...live, ...recent].find(row => row.id === id) || { id, tr: null }, dispose() {},
});
const dataFor = options => new PanelData({ repoRoot: '/project', roots: async () => ['/project'], store: fakeStore(), read: async () => [], ...options });

test('GitHub access uses a fixed read-only argv without a shell', async () => {
  let invocation;
  const rows = await readIssues({ repoRoot: '/project', repository: REPOSITORY, ghPath: '/tools/gh', run: async (...args) => {
    invocation = args; return { stdout: JSON.stringify([issue(7, 88, '$(touch /tmp/no)')]) };
  } });
  assert.equal(rows[0].number, 7);
  assert.equal(invocation[0], '/tools/gh');
  assert.deepEqual(invocation[1], ['issue', 'list', '--repo', 'kaluger-roman/kaluger-super-app', '--state', 'open', '--limit', '1000', '--json', 'number,title,body,url,labels']);
  assert.equal(invocation[2].shell, undefined);
  assert.equal(invocation[2].cwd, '/project');
  await assert.rejects(readIssues({ repoRoot: '/project', repository: REPOSITORY, run: async () => ({ stdout: '{}' }) }), /некорректный список/);
});

test('worktree discovery preserves spaces and line breaks in NUL-separated paths', async () => {
  const roots = await worktreeRoots('/project', async (command, args) => {
    assert.equal(command, 'git'); assert.deepEqual(args, ['worktree', 'list', '--porcelain', '-z']);
    return { stdout: 'worktree /project\0HEAD 123\0\0worktree /project/.worktrees/a b\nc\0HEAD 456\0\0' };
  });
  assert.deepEqual(roots, ['/project', '/project/.worktrees/a b\nc']);
});

test('snapshot ranks scores, includes unscored issues and prefers active sessions', async () => {
  const data = dataFor({ read: async () => [issue(7, 45), issue(8, 92), issue(9, null)], store: fakeStore([session('live', true)], [session('old', false)]) });
  const snapshot = await data.state();
  assert.deepEqual(snapshot.issues.items.map(row => [row.number, row.score]), [[8, 92], [7, 45], [9, null]]);
  assert.equal(snapshot.issues.items.find(row => row.number === 7).sessionId, 'live');
  assert.equal(snapshot.issues.items[0].why, 'Конкретное влияние');
  assert.equal(snapshot.issues.unscored, 1);
  assert.equal(snapshot.sessions.mode, 'shared-daemon');
  assert.match(snapshot.sessions.boundary, /Codex Desktop.*сохранённая история/);
  assert.deepEqual((await data.session('live')).feed, [{ kind: 'text', text: 'Ответ' }]);
  await assert.rejects(data.session('other-project'), /не найдена/);
});

test('failed issue refresh preserves the last successful list with an explicit error', async () => {
  let failed = false;
  const data = dataFor({ now: () => 12345, read: async () => { if (failed) throw new Error('offline'); return [issue(7, 45)]; } });
  await data.state(); failed = true;
  const snapshot = await data.state({ fresh: true });
  assert.equal(snapshot.issues.items[0].number, 7);
  assert.equal(snapshot.issues.at, 12345);
  assert.equal(snapshot.issues.error, 'offline');
});

test('concurrent refreshes share read requests and reuse data within the TTL', async () => {
  let reads = 0;
  const data = dataFor({ now: () => 1000, read: async () => { reads++; await new Promise(resolve => setTimeout(resolve, 10)); return [issue(7, 45)]; } });
  await Promise.all([data.state(), data.state(), data.state()]);
  await data.state();
  assert.equal(reads, 1);
});

test('issue workflows prepare their complete prompts without starting agents or shell commands', async () => {
  const data = dataFor({ read: async () => [issue(7, 45, 'Заголовок `не команда`')] });
  const plain = await data.prepareIssue({ number: 7, mode: 'plain' });
  const bug = await data.prepareIssue({ number: 7, mode: 'bug' });
  const feature = await data.prepareIssue({ number: 7, mode: 'feature' });
  assert.match(plain.prompt, /^Возьми в работу issue #7/);
  assert.match(bug.prompt, /^\$auto-bug-fix --new issue #7/);
  assert.match(feature.prompt, /^\$auto-feature --new issue #7/);
  assert.match(plain.prompt, /Проект: \/project/);
  assert.match(feature.prompt, /AGENTS.md/);
  await assert.rejects(data.prepareIssue({ number: 999, mode: 'plain' }), /не найдена/);
});

test('UI bridge opens a new editable draft using the supported SDK extension', async () => {
  const calls = [];
  const result = await openIssueDraft({ prompt: '$auto-bug-fix --new issue #7', extensions: { message: { send: async value => { calls.push(value); return {}; } } } });
  assert.equal(result.drafted, true);
  assert.deepEqual(calls, [draftMessage('$auto-bug-fix --new issue #7')]);
  assert.deepEqual(calls[0]._meta['openai/message'], { target: 'new', send: false });
  const fallback = await openIssueDraft({ prompt: 'task', extensions: {} });
  assert.equal(fallback.drafted, false);
  await assert.rejects(openIssueDraft({ prompt: 'task', extensions: { message: { send: async () => ({ isError: true }) } } }), /не открыл черновик/);
});

test('external navigation accepts only issue/PR links in the configured GitHub project', () => {
  assert.equal(safeGithubUrl(`https://github.com/${REPOSITORY}/issues/7`, REPOSITORY), `https://github.com/${REPOSITORY}/issues/7`);
  for (const url of ['javascript:alert(1)', 'https://github.com/other/project/issues/7', `https://github.com@evil.test/${REPOSITORY}/issues/7`, `https://github.com/${REPOSITORY}/settings`]) assert.equal(safeGithubUrl(url, REPOSITORY), null);
});
