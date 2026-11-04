# Панель Super App в Codex

Локальный плагин **Агенты Super App** показывает открытые issues GitHub, их
критичность и объяснение, фильтры по приоритету/меткам/тексту, issues без оценки,
сессии Codex, ленту сообщений/инструментов, ветку, PR и связанных субагентов.

Встроенная панель работает как MCP App в Codex, без отдельного HTTP-сервера и
портов. Есть глобальный пункт навигации и вкладка внутри чата. GitHub читает
локальный `gh` с существующей авторизацией; плагин не меняет issues или PR.

## Установка на этом Mac

Из корня репозитория, с установленными Node.js 22, npm, `gh` и Codex CLI:

```bash
npm ci --prefix scripts/codex-panel --ignore-scripts
npm --prefix scripts/codex-panel run build
codex plugin marketplace add "$PWD" --json
codex plugin add super-app-agents@super-app-local --json
open -a /Applications/ChatGPT.app 'codex://plugins/super-app-agents@super-app-local/app/super_app_home'
```

Список marketplace находится в `.agents/plugins/marketplace.json`; его локальный
источник — `scripts/codex-panel/dist/super-app-agents`. Корневой `npm ci` не
устанавливает зависимости этой отдельной сборки. После установки откройте
**Агенты Super App** в меню плагинов/навигации Codex или вызовите `super_app_panel`
в текущем чате. Глобальная ссылка:

```text
codex://plugins/super-app-agents@super-app-local/app/super_app_home
```

Новая установка может потребовать обновления списка плагинов или перезапуска
Codex, чтобы уже открытый чат увидел новые MCP-инструменты. Установка CLI сама
по себе не подтверждает, что интерфейс Desktop уже подключился к серверу.
Кнопка «Попробовать» на странице плагина выбирает его для чата; сама панель
открывается через global entrypoint или приведённую ссылку. Версия 0.1.2
проверена в Desktop: загрузка HTML, соединение виджета и отображение issues.

## Работа с issues

Issues сортируются по принятому в проекте баллу 0–100. Кнопка **Взять в работу**
предлагает обычную задачу, `$auto-bug-fix --new` или `$auto-feature --new` и показывает
полный запрос. **Открыть новый черновик** создаёт редактируемый draft; отправьте
его в Codex, чтобы начать работу. Подготовка запроса не запускает shell, агента,
worktree или GitHub-изменения. На хосте без расширения нового черновика доступно
копирование запроса.

Панель читает до 1000 открытых issues и отмечает достижение лимита. Автообновление
проверяет сессии раз в 15 секунд, список issues — не чаще раза в минуту. Кнопка
**Обновить** запрашивает свежие данные. При сбое GitHub сохраняется предыдущий
список с явным сообщением об ошибке; список issues кэшируется локально для быстрого
открытия. Ленты сессий не сохраняются в браузерный кэш панели.

## Граница живого мониторинга

Общий CLI daemon доступен через Unix WebSocket. Подключённые к нему CLI-сессии
имеют живые статусы «работает», «ждёт ввода», «нужен ты» и т. п. Если daemon
недоступен, плагин запускает отдельный read-only `codex app-server --listen stdio://`
для чтения сохранённой истории.

Codex Desktop использует собственный отдельный сервер, его текущие чаты нельзя
достоверно выдать за живые сессии общего daemon. Панель показывает доступную
сохранённую историю Desktop и явно объясняет эту границу. Сообщения скрытых
рассуждений в ленту не попадают. Плагин не отвечает на запросы approval/questions
других сессий. **Копировать codex resume** позволяет продолжить выбранную историю
в CLI; сам плагин эту команду не выполняет.

## Сборка и проверки

```bash
npm --prefix scripts/codex-panel run build
npm --prefix scripts/codex-panel test
```

Сборка объединяет официальный MCP SDK, MCP Apps SDK, OpenAI Extensions SDK,
`ws` и общий адаптер `scripts/vscode-agents/lib.js` в автономные сервер и HTML.
Пакет `dist/super-app-agents` содержит нативные для Codex
`.codex-plugin/plugin.json`/`.mcp.json`, иконку, skill и автономный runtime; внешние
`node_modules` ему не нужны. В нативном пакете исключены оба canonical-файла
`plugin.json` и `mcp.json`, чтобы загрузчики Codex использовали единственную пару
нативных manifest/config. Codex CLI 0.166 при наличии portable root `plugin.json`
не обнаруживает stdio MCP-сервер этого пакета и не подставляет `${PLUGIN_ROOT}`
в legacy `.mcp.json`. Поэтому native manifest использует проверенные относительные
`cwd: "."` и `./server/server.mjs`. Полная portable-сборка с
`plugin.json`/`mcp.json` сохраняется отдельно в `dist/portable/super-app-agents`,
а локальный marketplace указывает на проверенный нативный пакет. Исходный portable
manifest сохранён в `super-app-agents/plugin.json`. Сборка требует Node 22 для
tooling SDK; готовый сервер совместим с Node 20.
Не правьте установленный кэш вручную: меняйте исходники, пересобирайте пакет и
обновляйте через поддерживаемую команду установки Codex.

При сборке `mcp.json` получает абсолютные пути установленного Node, `gh`, Codex
и checkout. Сам сервер и HTML находятся в установленном пакете: native manifest
использует относительные пути, portable `mcp.json` — стандартный `${PLUGIN_ROOT}`.
После перемещения checkout или замены Node пересоберите и переустановите
плагин. Это локальный плагин для этого Mac, он не подключается к прежнему VPS или
`home` и не использует production data.

Проверки включают обнаружение MCP tools/resource и global/thread entrypoints,
запуск копии пакета вне checkout без зависимостей, чтение `gh` через фиксированный
argv, сортировку/фильтруемые данные и issues без оценки, сохранение списка при
ошибке, связь с живой сессией, отсутствие скрытых рассуждений в ленте и bridge
нового черновика с `send: false`. GitHub и Codex для интеграционного теста заменены
локальными fixture-процессами. CI выполняет сборку и тесты на Linux и macOS.

API: `super_app_home` (global), `super_app_panel` (thread), `super_app_state`,
`super_app_session`, `super_app_prepare_issue`; ресурс `ui://super-app-agents/panel-v1`.
Параметры процесса: `SUPER_APP_REPO_ROOT`, `SUPER_APP_REPOSITORY`,
`SUPER_APP_GH_PATH`, `SUPER_APP_CODEX_PATH`, необязательный `SUPER_APP_CODEX_SOCKET`.

Контракты реализации: [MCP Extensions](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md)
и [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps).
