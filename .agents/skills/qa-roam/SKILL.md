---
name: qa-roam
description: "Explore Super App with seeded random browser journeys, real Codex percentage budgeting, screenshot evidence, deduplication and an impact/effort report; no app-code edits."
---

# Исследовательский QA

Выполнить [полную процедуру](references/procedure.md). Вход: route path, URL override,
`--budget <N%>`, `--host`, `--teardown`. По умолчанию — локальный QA Docker stack;
тестовые данные и seed только внутри disposable окружения.

Сохранять seed и выбирать 2–3 актуальных routes плюс минимум один случайный modifier.
Сценарии строить из наблюдаемого UI; modifiers: mobile/tablet/desktop, long/emoji/XSS
input, double-click, keyboard-only. Обычный cap ~60 browser actions/~25 screenshots;
journey доводить до естественного конца, ~25 actions без результата — сигнал застревания.

`--budget` возвращён: `scripts/qa-budget.mjs start --budget N% --refresh`, затем
`check --refresh` после каждого сценария. Измеряется реальное окно Codex, а не токены
и не всегда пять часов; procedure описывает source/state/window и fail-safe behavior.
Budget mode продолжает новые сценарии до stop, без обычного cap по routes/actions.

Перед отчётом отфильтровать неподтверждённое, вкусовое, code-only, новые feature-идеи
и дубликаты, включая отчёты последних 30 дней. Все оставшиеся findings со screenshot
сохранить, без top-N обрезки; сортировать по полной impact/effort матрице процедуры.

Код не менять, тесты не запускать, Git не мутировать, issues не публиковать.
Уникальный MD в `docs/qa-roam-reports/`, screenshots ignored. Финал: отчёт, seed,
routes/modifiers, URL, impact counts/quick wins и фактический budget status.
