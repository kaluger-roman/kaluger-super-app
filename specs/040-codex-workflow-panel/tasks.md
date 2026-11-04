# Задачи

- [x] Зафиксировать запрос, интерфейс и границы live API.
- [x] Проверить hook trust, установить расширение VS Code и проверить прежний CI.
- [x] Исправить и проверить реальный shared-daemon transport и пустые CLI threads.
- [x] Реализовать и собрать Codex plugin/server/UI.
- [x] Проверить независимым reviewer и автоматическими тестами.
- [x] Установить плагин и проверить инструменты через runtime Codex.
- [ ] Подтвердить отображение панели в окне Codex Desktop.
- [ ] Обновить документацию, commit/push в PR #205, дождаться CI.

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
  используются cwd `.` и относительный server path; portable export сохранён.
- Управление окном Codex через Computer Use запрещено самим инструментом.
  Отображение и действие создания draft в текущем Desktop ещё не подтверждены;
  пользователю отправлен запрос ручной проверки. Это не считается UI pass.
