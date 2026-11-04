# Задачи

- [x] Зафиксировать запрос, интерфейс и границы live API.
- [x] Проверить hook trust, установить расширение VS Code и проверить прежний CI.
- [x] Исправить и проверить реальный shared-daemon transport и пустые CLI threads.
- [x] Реализовать и собрать Codex plugin/server/UI.
- [x] Проверить независимым reviewer и автоматическими тестами.
- [x] Установить плагин и проверить инструменты через runtime Codex.
- [x] Подтвердить отображение панели в окне Codex Desktop.
- [x] Обновить документацию и отправить изменения в PR #205.

Перед передачей результата дождаться CI текущего head PR; итог сообщить в чате
и сверить с GitHub. Записанный ниже CI относится к явно указанному коммиту.

## Наблюдаемая проверка

- Hook: `enabled: true`, `trustStatus: trusted`, errors/warnings отсутствуют.
- Независимые проверки: Store 13/13, plugin 10/10; RPC/Store/budget 38/38.
- Реальный Store получил idle CLI thread без запуска model turn.
- Установленный plugin прошёл `mcpServerStatus/list` в Codex: пять tools,
  два UI entrypoints, HTML resource, `toolsError: null`.
- Реальный `super_app_state`: 60 открытых issues, 0 неоценённых, две сессии,
  `mode: shared-daemon`, errors отсутствуют.
- Codex 0.166 требует native install package: portable MCP config не
  загружается, `${PLUGIN_ROOT}` в native MCP не раскрывается. В native package
  используются cwd `.` и относительный server path; оба canonical-файла
  исключены из native package, portable export сохранён отдельно.
- Полный локальный набор: 339 tests, 197 passed, 142 Linux-only skipped,
  0 failed. CI коммита `af3685a` прошёл 13/13, включая plugin build/tests.
- После установки версии 0.1.2 Desktop нашёл global route, прочитал HTML,
  выполнил initializeMcpApp и super_app_state из запущенного виджета без
  ошибки tool call. Пользователь подтвердил: «Появилась панель с issues».
- Управление окном Codex через Computer Use запрещено самим инструментом.
  Отображение подтверждено пользователем; действие создания draft в текущем
  Desktop проверено только контрактными тестами и не выполнялось вручную.
