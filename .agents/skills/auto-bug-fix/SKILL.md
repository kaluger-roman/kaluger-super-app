---
name: auto-bug-fix
description: "Run the full Super App bug-fix pipeline with diagnosis approval, red/green regression, resumable state, nine-role review, browser QA and draft PR delivery."
---

# Полный pipeline исправления бага

Прочитать [runtime](../auto-feature/references/runtime.md) и
[полную процедуру](references/procedure.md). Вход: описание/issue,
`--new <описание>`, `--resume <slug>`; пустой вызов выбирает активный state или
запрашивает описание. `--checkpoints` совместим, но checkpoint обязателен без флага.

**После готового диагноза и плана исправления остановиться для утверждения
пользователем.** До него worker воспроизводит и исследует, но не меняет код.
Показать причину, файлы, способ воспроизведения, regression target и риски;
сохранить approve/правки/cancel. Не выдавать code trace за наблюдаемое воспроизведение.

Последовательность: worktree/state + draft PR → diagnosis/checkpoint → минимальный fix
с regression red→green → review (threshold 50, cap 3, ≥80% convergence) → тесты области
и QA (cap 3, обязательный повтор бага + 1–2 соседних сценария) → commit/push/CI
(до 3 исправлений CI) и отчёт. Повтор исходного бага в QA — blocker с передиагностикой.
Чисто визуальный fix допускает исключение из regression test, но требует browser after
screenshot. Нет speckit/mockup pipeline.

State `.codex/workflow/auto-bug-fix/<slug>/state.json` — [контракт v1](references/state.schema.json),
включая diagnosis, iterations, verification, approvals и историю; legacy импортировать
по runtime без удаления оригинала. Отдельные diagnosis/implementation/QA workers,
девять review roles и независимые scorers; фиксы review/QA делает Main. Настроенная
модель Codex, анализ/код/review/scoring — max effort.

Явный вызов включает task worktree/branch, стартовый draft PR и финальные commit/push.
Назначенный Codex worktree не вкладывать в новый. Local-only и scope пользователя
приоритетнее. News, ready, merge, deploy и посторонние issues — отдельные разрешения.
