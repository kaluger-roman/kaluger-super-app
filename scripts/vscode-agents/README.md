# Агенты Super App — Codex

Панель VS Code сохранена как отдельный инструмент проекта. Данные сессий теперь
приходят из [Codex app-server](https://learn.chatgpt.com/docs/app-server), issues —
из локального `gh`. Чтение не запускает model turns и не расходует токены модели.

## Сохранённые функции

- «Сейчас»: живые сессии, текущая операция, последний запрос/ответ, сабагенты,
  worktree и последний упомянутый PR. Сначала показываются запросы разрешений/ответа.
- «Недавние»: история за `recentDays`, продолжение через `codex resume`.
- Лента последних 150 событий: запросы, ответы, команды, ошибки и завершение хода.
- «Приоритетные issue»: оценка 0–100, топ по критичности, число неоценённых issues,
  связь issue → сессия, переход/продолжение вместо повторного запуска.
- Три действия для issue: обычная задача, `$auto-bug-fix --new`, `$auto-feature --new`.
  Новые задачи стартуют через `codex --worktree`, без общих node_modules/баз.
- Status bar, переход к терминалу, копирование команды продолжения, уведомления
  `all` / `attention` / `off`; открытый терминал не дублируется.
- Ошибка загрузки issues сохраняет последнюю успешную выборку и показывает ошибку.

Все 14 идентификаторов команд `superAgents.*` и три view ID сохранены.
`superAgents.claudePath` заменён на `superAgents.codexPath`; остальные прежние
настройки сохранили назначение. Пустой `roots` означает папки текущего workspace
и worktrees, полученные из локального `git worktree list`.

## Подключение и границы

По умолчанию `superAgents.rpcArgs` содержит `app-server proxy`: адаптер подключается
по WebSocket к Unix-сокету **уже работающего общего daemon**. CLI proxy передаёт
сырые байты, а Unix listener требует HTTP Upgrade и WebSocket frames, поэтому
JSONL через proxy здесь не используется. Путь по умолчанию —
`$CODEX_HOME/app-server-control/app-server-control.sock` либо
`~/.codex/app-server-control/app-server-control.sock`.
Для нестандартного socket задайте `superAgents.rpcArgs`:

```json
["app-server", "proxy", "--sock", "/absolute/path/to/app-server-control.sock"]
```

Также поддерживается `--sock=/absolute/path.sock`; другие параметры proxy
отклоняются с ошибкой. Остальные команды `rpcArgs` используют JSONL по stdio.

Панель видит живые статусы только того сервера, к которому подключена. Отдельный
app-server не знает о живых потоках другого процесса приложения. Если общий socket
недоступен, `historyFallback` читает локальную историю через отдельный stdio
app-server, показывает предупреждение и **не объявляет эти сессии живыми**.
Не запускайте/перезапускайте daemon автоматически ради мониторинга: это отдельная
операция среды. Наличие desktop app само по себе не доказывает доступность socket.

Панель только читает историю и состояние: не отвечает на запросы разрешений,
не запускает/останавливает чужие turns, не читает приватные SQLite/transcript-схемы.
При недоступности API отображается ошибка. Учитываются `legacy` и `paginated`
истории. Отображаются только потоки выбранных roots; содержимое остаётся локальным.

## Установка на Mac

Нужны Node из `.nvmrc`, локальные Codex CLI, `gh` с авторизацией, VS Code.
Проверьте `codex --version`, `codex app-server --help`. Если `codex` не виден в PATH
VS Code, задайте абсолютный `superAgents.codexPath` (путь не коммитить).

```bash
cd scripts/vscode-agents
npm ci
npx --yes @vscode/vsce package --allow-missing-repository
code --install-extension super-agents-0.4.2.vsix
```

Либо VS Code → Extensions → Install from VSIX. Перезапустите extension host.
`issuesCommand` по умолчанию локальная read-only команда `gh issue list`, без SSH.
Она является доверенной пользовательской настройкой shell; текст issue никогда
не используется как исполняемый код. Промпты запуска и пути корректно экранируются.

Проверка: `node --test scripts/__tests__/vscode-agents-lib.test.mjs
scripts/__tests__/codex-rpc.test.mjs` из корня проекта. Unit/integration fixtures
проверяют WebSocket handshake на временном Unix-сокете, stdio fallback, cleanup,
статусы, pagination, ошибки, shell quoting и сохранение списка issues;
живой UI VS Code требует отдельной проверки после установки.
