import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { PanelData, REPOSITORY } from './data.mjs';

export const PANEL_URI = 'ui://super-app-agents/panel-v1';
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const result = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data });
const handled = callback => async args => {
  try { return result(await callback(args)); }
  catch (error) { return { content: [{ type: 'text', text: error.message }], isError: true }; }
};

export const createPanelServer = ({ data, html, icon }) => {
  const icons = [{ src: `data:image/svg+xml,${encodeURIComponent(icon)}`, mimeType: 'image/svg+xml' }];
  const server = new McpServer({ name: 'super-app-agents', title: 'Агенты Super App', version: '0.1.2', icons });
  registerAppResource(server, 'super-app-panel', PANEL_URI, { title: 'Агенты Super App' }, async () => ({
    contents: [{
      uri: PANEL_URI, mimeType: RESOURCE_MIME_TYPE, text: html,
      _meta: {
        ui: { csp: { connectDomains: [], resourceDomains: [] } },
        'openai/ui': { preferredDisplayMode: 'fullscreen', availableDisplayModes: ['inline', 'fullscreen'] },
      },
    }],
  }));
  for (const [name, type] of [['super_app_home', 'global'], ['super_app_panel', 'thread']]) {
    registerAppTool(server, name, {
      title: 'Агенты Super App', description: 'Открыть панель приоритетных GitHub issues, сессий Codex, ленты и PR для локального Super App.',
      inputSchema: {}, icons, annotations: readOnly,
      _meta: { ui: { resourceUri: PANEL_URI }, 'openai/ui': { entrypoints: [{ type }] }, 'openai/iconStyle': 'monochrome' },
    }, handled(() => data.snapshot()));
  }
  server.registerTool('super_app_state', {
    title: 'Состояние Super App', description: 'Прочитать/обновить открытые issues и доступные сессии проекта. Только чтение; команды задач не выполняются.',
    inputSchema: { fresh: z.boolean().optional() }, annotations: readOnly,
  }, handled(args => data.state(args)));
  server.registerTool('super_app_session', {
    title: 'Лента сессии Super App', description: 'Прочитать сохранённую ленту выбранной сессии проекта без скрытых рассуждений.',
    inputSchema: { id: z.string().min(1).max(160) }, annotations: readOnly,
  }, handled(({ id }) => data.session(id)));
  server.registerTool('super_app_prepare_issue', {
    title: 'Подготовить задачу из issue', description: 'Вернуть текст для обычной задачи, auto-bug-fix или auto-feature. Не запускает работу, чат, команду и не меняет GitHub.',
    inputSchema: { number: z.number().int().positive(), mode: z.enum(['plain', 'bug', 'feature']) }, annotations: readOnly,
  }, handled(args => data.prepareIssue(args)));
  return server;
};

const main = async () => {
  const runtimeRoot = dirname(fileURLToPath(import.meta.url));
  const repoRoot = process.env.SUPER_APP_REPO_ROOT;
  if (!repoRoot) throw new Error('Не задан SUPER_APP_REPO_ROOT. Соберите и установите плагин из scripts/codex-panel.');
  const [html, icon] = await Promise.all([
    readFile(resolve(runtimeRoot, 'panel.html'), 'utf8'), readFile(resolve(runtimeRoot, '../assets/icon.svg'), 'utf8'),
  ]);
  const data = new PanelData({
    repoRoot, repository: process.env.SUPER_APP_REPOSITORY || REPOSITORY,
    ghPath: process.env.SUPER_APP_GH_PATH || 'gh', codexPath: process.env.SUPER_APP_CODEX_PATH || 'codex', socketPath: process.env.SUPER_APP_CODEX_SOCKET,
  });
  const server = createPanelServer({ data, html, icon });
  process.stdin.on('end', () => data.dispose());
  process.once('SIGTERM', () => { data.dispose(); process.exit(0); });
  process.once('SIGINT', () => { data.dispose(); process.exit(0); });
  await server.connect(new StdioServerTransport());
};

// The bundle has one entrypoint; imports in tests do not start a stdio process.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Super App panel: ${error.message}`); process.exitCode = 1; });
}
