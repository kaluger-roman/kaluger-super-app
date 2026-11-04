# План

1. Использовать существующий ranking/Store и исправленный read-only RPC adapter.
2. Собрать локальный MCP stdio server и MCP App с global/thread entrypoints,
   используя опубликованный SDK и MCP Extensions.
3. Собрать самодостаточный пакет, зарегистрировать local marketplace и установить
   через поддерживаемый `codex plugin` CLI.
4. Проверить discovery, реальные read-only данные и UI в текущем host; отдельно
   проверить live CLI fixture и не затронуть пользовательские turns.
5. Выполнить независимый review, проверки, commit/push в PR #205 и дождаться CI.

Исходники: `scripts/codex-panel/`. Никакого облачного хостинга не требуется.
