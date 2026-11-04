import { App, applyDocumentTheme, applyHostStyleVariables } from '@modelcontextprotocol/ext-apps';
import { OpenAIExtensions } from '@openai/mcp-extensions/app';
import { openIssueDraft, safeGithubUrl } from './bridge.mjs';

const app = new App({ name: 'Super App agents', version: '0.1.0' }, { availableDisplayModes: ['inline', 'fullscreen'] });
const extensions = new OpenAIExtensions(app);
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const date = ms => ms ? new Date(ms).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'ещё не обновлялось';
const band = score => score === null ? null : Math.min(80, Math.floor(score / 20) * 20);
const bandLabel = score => score === null ? 'БЕЗ ОЦЕНКИ' : `P${4 - band(score) / 20}`;
const cacheKey = 'super-app-agents:issues:v1';
let state = null, connected = false, refreshing = false, selectedSession = null, selectedIssue = null, prepared = null, prepareSequence = 0, feedSequence = 0, timer;

const notice = message => { $('#notice').textContent = message || ''; $('#notice').hidden = !message; };
const call = async (name, args = {}) => {
  const result = await app.callServerTool({ name, arguments: args });
  if (result.isError) throw new Error(result.content?.find(item => item.type === 'text')?.text || 'Ошибка локального инструмента.');
  return result.structuredContent;
};
const openUrl = async url => {
  const safe = safeGithubUrl(url, state?.repository || '');
  if (!safe) throw new Error('Ссылка GitHub не относится к этому проекту.');
  await app.openLink({ url: safe });
};

const visibleIssues = () => {
  const query = $('#issueSearch').value.trim().toLocaleLowerCase('ru');
  const priority = $('#priority').value;
  return (state?.issues.items || []).filter(issue =>
    (!query || `${issue.number} ${issue.title} ${issue.labels.join(' ')}`.toLocaleLowerCase('ru').includes(query)) &&
    (priority === 'all' || (priority === 'unscored' ? issue.score === null : issue.score !== null && band(issue.score) === Number(priority))));
};
const renderIssues = () => {
  const issues = visibleIssues();
  $('#issueCount').textContent = state?.issues.total ?? '—';
  $('#issueMeta').innerHTML = state ? `Показано ${issues.length} из ${state.issues.total} · по критичности · <button type="button" id="unscored">Без оценки: ${state.issues.unscored}</button> · ${esc(date(state.issues.at))}${state.issues.truncated ? ' · первые 1000 открытых issues' : ''}` : '';
  $('#unscored')?.addEventListener('click', () => { $('#priority').value = 'unscored'; renderIssues(); });
  $('#issues').innerHTML = issues.length ? issues.map(issue => `<article class="issue">
    <div class="score" data-band="${band(issue.score)}">${issue.score ?? '—'}<small>${bandLabel(issue.score)}</small></div>
    <div><button class="issueTitle" data-open-issue="${issue.number}"><span class="number">#${issue.number}</span>${esc(issue.title)}</button>
      ${issue.why ? `<p class="issueWhy">${esc(issue.why)}</p>` : ''}<div class="row">${issue.labels.map(label => `<span class="badge">${esc(label)}</span>`).join('')}
      ${issue.sessionId ? `<button class="sessionLink" data-session="${esc(issue.sessionId)}">↗ Есть сессия</button>` : ''}</div></div>
    <button class="btn" data-take="${issue.number}" ${connected ? '' : 'disabled'}>Взять в работу</button></article>`).join('') : `<div class="empty">${state?.issues.error && !state?.issues.at ? 'Issues пока недоступны. Подробности — выше.' : 'Issues по этому фильтру нет.'}</div>`;
};
const visibleSessions = () => {
  const query = $('#sessionSearch').value.trim().toLocaleLowerCase('ru');
  const filter = $('#sessionFilter').value;
  return (state?.sessions.items || []).filter(session =>
    (!query || `${session.title} ${session.issue || ''} ${session.worktree}`.toLocaleLowerCase('ru').includes(query)) &&
    (filter === 'all' || (filter === 'live' ? session.live : filter === 'history' ? !session.live : ['waiting', 'question', 'blocked'].includes(session.status))));
};
const renderSessions = () => {
  const sessions = visibleSessions();
  $('#sessionCount').textContent = state?.sessions.items.length ?? '—';
  $('#sessionBoundary').textContent = state?.sessions.boundary || 'Подключение к Codex…';
  $('#sessions').innerHTML = sessions.length ? sessions.map(session => `<button class="session" data-session="${esc(session.id)}" aria-pressed="${selectedSession === session.id}">
    <span class="status" data-state="${esc(session.status)}">${esc(session.statusLabel)}</span><strong>${esc(session.title)}</strong>
    <span class="muted small">${esc([session.worktree, session.issue ? '#' + session.issue : '', session.pr ? 'PR #' + session.pr.num : ''].filter(Boolean).join(' · '))}</span>
    <span class="muted small">${esc(date(session.updatedAt))}</span></button>`).join('') : '<div class="empty">Нет доступных сессий по этому фильтру за последние 7 дней.</div>';
};
const context = () => {
  if (!connected || !app.getHostCapabilities()?.updateModelContext) return;
  app.updateModelContext({ structuredContent: {
    panel: 'Super App agents', page: $('#sessionsPage').hidden ? 'issues' : 'sessions', repository: state?.repository,
    issueFilter: { query: $('#issueSearch').value, priority: $('#priority').value },
    visibleIssues: visibleIssues().map(({ number, title, score, url }) => ({ number, title, score, url })), selectedSession,
  } }).catch(() => {});
};
const render = data => {
  if (!data?.issues || !data?.sessions) return;
  state = data;
  $('#summary').textContent = `${data.repository} · ${data.issues.total} открытых issues · ${data.sessions.items.filter(session => session.live).length} живых CLI-сессий`;
  $('#connection').textContent = `${connected ? 'Подключено' : 'Сохранённый список · обновляется'} · ${data.repoRoot} · ${date(data.at)}`;
  notice([data.issues.error ? `GitHub не обновился: ${data.issues.error}${data.issues.at ? ' Показан предыдущий список.' : ''}` : '', data.sessions.error || ''].filter(Boolean).join(' '));
  renderIssues(); renderSessions(); context();
  if (data.issues.at) {
    try { localStorage.setItem(cacheKey, JSON.stringify({ ...data, sessions: { ...data.sessions, items: [], at: null, mode: 'unavailable', error: null } })); } catch { /* Storage can be disabled by the host. */ }
  }
};
const refresh = async (fresh = false) => {
  if (!connected || refreshing) return;
  refreshing = true; $('#refresh').disabled = true;
  try {
    render(await call('super_app_state', { fresh }));
    if (selectedSession && !$('#sessionsPage').hidden) await selectSession(selectedSession, false);
  } catch (error) { notice(`Панель не обновилась: ${error.message}`); }
  finally { refreshing = false; $('#refresh').disabled = false; }
};
const showTab = tab => {
  $('#issuesPage').hidden = tab !== 'issues'; $('#sessionsPage').hidden = tab !== 'sessions';
  for (const button of document.querySelectorAll('[data-tab]')) {
    if (button.dataset.tab === tab) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  }
  context();
};
const selectSession = async (id, focus = true) => {
  selectedSession = id; const seq = ++feedSequence;
  showTab('sessions'); renderSessions();
  if (focus) $('#inspector').innerHTML = '<div class="empty">Загружаю ленту…</div>';
  try {
    const { session, feed } = await call('super_app_session', { id });
    if (seq !== feedSequence) return;
    $('#inspector').innerHTML = `<h2>${esc(session.title)}</h2><div class="details">${esc(session.statusLabel)} · ${esc(date(session.updatedAt))}<br>${esc(session.cwd)}<br>${esc(session.worktree)}${session.issue ? ` · Issue #${session.issue}` : ''}</div>
      <div class="row" style="margin-top:12px">${session.pr ? `<button class="btn" data-pr="${esc(session.pr.url)}">↗ PR #${session.pr.num}</button>` : ''}<button class="btn" id="copyResume">Копировать codex resume</button></div>
      ${session.subagents.length ? `<p class="small muted">Субагенты: ${session.subagents.map(agent => esc(agent.description)).join(' · ')}</p>` : ''}
      <div class="feed">${feed.length ? feed.map(item => `<article class="feedItem" data-kind="${esc(item.kind)}" data-error="${Boolean(item.error)}"><header><span>${esc(item.kind === 'user' ? 'Вы' : item.kind === 'text' ? 'Codex' : item.kind === 'turn' ? 'Завершение шага' : item.name || 'Инструмент')}</span><time>${esc(date(item.ts))}</time></header><pre>${esc(item.text)}</pre>${item.result ? `<details><summary>Результат</summary><pre>${esc(item.result)}</pre></details>` : ''}</article>`).join('') : '<div class="empty">В сессии пока нет сообщений.</div>'}</div>`;
    $('#copyResume').onclick = () => copy(`codex resume '${session.id.replace(/'/g, "'\\''")}'`);
    if (focus && window.innerWidth < 700) $('#inspector').scrollIntoView({ behavior: 'smooth' });
    context();
  } catch (error) { if (seq === feedSequence) $('#inspector').innerHTML = `<div class="empty">${esc(error.message)}</div>`; }
};
const copy = async text => {
  try { await navigator.clipboard.writeText(text); notice('Скопировано.'); }
  catch { notice('Хост не разрешил буфер обмена. Выделите и скопируйте текст запроса.'); }
};
const prepare = async () => {
  const seq = ++prepareSequence;
  prepared = null; $('#draftIssue').disabled = true; $('#copyPrompt').disabled = true; $('#draftStatus').textContent = 'Подготавливаю запрос…';
  try {
    const next = await call('super_app_prepare_issue', { number: selectedIssue, mode: $('#workflow').value });
    if (seq !== prepareSequence) return;
    prepared = next; $('#issuePrompt').value = next.prompt; $('#draftStatus').textContent = '';
    $('#draftIssue').disabled = !extensions.message; $('#copyPrompt').disabled = false;
    if (!extensions.message) $('#draftStatus').textContent = 'Хост не поддерживает новый черновик. Скопируйте запрос и откройте новый чат.';
  } catch (error) { if (seq === prepareSequence) $('#draftStatus').textContent = error.message; }
};
const takeIssue = async number => {
  const issue = state?.issues.items.find(row => row.number === number);
  if (!issue || !connected) return;
  selectedIssue = number; $('#issueTitle').textContent = `#${number} ${issue.title}`; $('#workflow').value = 'plain'; $('#issuePrompt').value = '';
  $('#issueDialog').showModal(); await prepare();
};

$('#refresh').onclick = () => refresh(true);
for (const id of ['issueSearch', 'priority']) $( '#' + id).addEventListener('input', () => { renderIssues(); context(); });
for (const id of ['sessionSearch', 'sessionFilter']) $('#' + id).addEventListener('input', () => { renderSessions(); context(); });
$('#workflow').onchange = prepare;
$('#copyPrompt').onclick = () => prepared && copy(prepared.prompt);
$('#draftIssue').onclick = async () => {
  if (!prepared) return;
  $('#draftIssue').disabled = true;
  try {
    const result = await openIssueDraft({ prompt: prepared.prompt, extensions });
    $('#draftStatus').textContent = result.drafted ? 'Новый черновик открыт. Отправьте запрос, чтобы начать работу.' : result.reason;
  } catch (error) { $('#draftStatus').textContent = error.message; }
  finally { $('#draftIssue').disabled = !extensions.message; }
};
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.tab) showTab(button.dataset.tab);
  if (button.dataset.take) takeIssue(Number(button.dataset.take));
  if (button.dataset.session) selectSession(button.dataset.session);
  if (button.dataset.pr) openUrl(button.dataset.pr).catch(error => notice(error.message));
  if (button.dataset.openIssue) {
    const issue = state?.issues.items.find(row => row.number === Number(button.dataset.openIssue));
    if (issue) openUrl(issue.url).catch(error => notice(error.message));
  }
});
const applyHost = () => {
  const host = app.getHostContext();
  if (host?.theme) applyDocumentTheme(host.theme);
  if (host?.styles?.variables) applyHostStyleVariables(host.styles.variables);
  for (const edge of ['top', 'right', 'bottom', 'left']) document.documentElement.style.setProperty(`--safe-${edge}`, `${host?.safeAreaInsets?.[edge] || 0}px`);
  const path = extensions.deepLink.getCurrent()?.url;
  if (path?.startsWith('/sessions')) showTab('sessions');
};
app.ontoolresult = result => render(result.structuredContent);
app.addEventListener('hostcontextchanged', applyHost);
app.onteardown = async () => { clearInterval(timer); return {}; };

document.modelContext?.registerTool({
  name: 'super_app_panel_view', description: 'Read the visible Super App panel, issue filters, issue scores and selected session.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true },
  async execute() { return JSON.stringify({ page: $('#sessionsPage').hidden ? 'issues' : 'sessions', issues: visibleIssues(), sessions: visibleSessions(), selectedSession }); },
});
document.modelContext?.registerTool({
  name: 'super_app_panel_filter', description: 'Filter visible issues by text or priority, or show the sessions page.',
  inputSchema: { type: 'object', properties: { query: { type: 'string' }, priority: { type: 'string', enum: ['all', '80', '60', '40', '20', '0', 'unscored'] }, page: { type: 'string', enum: ['issues', 'sessions'] } }, additionalProperties: false }, annotations: { readOnlyHint: true },
  async execute({ query, priority, page }) { if (query !== undefined) $('#issueSearch').value = query; if (priority !== undefined) $('#priority').value = priority; if (page) showTab(page); renderIssues(); context(); return JSON.stringify({ issues: visibleIssues() }); },
});

try { const cached = JSON.parse(localStorage.getItem(cacheKey)); if (cached?.version === 1) render(cached); } catch { /* Cache is optional. */ }
const main = async () => {
  try {
    await app.connect(); connected = true; applyHost(); if (state) render(state);
    await refresh(); timer = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
  } catch (error) { notice(`Нет соединения с Codex: ${error.message}`); }
};
main();
