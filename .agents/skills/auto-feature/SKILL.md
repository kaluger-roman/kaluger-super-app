---
name: auto-feature
description: "Run the full Super App feature pipeline with resumable state, mandatory spec/mockup approval, implementation, nine-role review, browser QA and draft PR delivery."
---

# Полный pipeline фичи

Прочитать [runtime](references/runtime.md), затем [полную процедуру](references/procedure.md)
для текущей фазы. Они сохраняют все параметры и контракты прежнего auto-feature.
Вход: описание/issue, `--new <описание>`, `--resume <slug>`, пустой вызов — выбор
активного state или запрос описания. `--checkpoints` — совместимый no-op: согласования
обязательны и без флага.

**После готовой спецификации и после готовых макетов остановиться для утверждения
пользователем.** Показывать конкретные артефакты; сохранять awaiting_approval,
правки/approve/cancel в state. Уже данное утверждение того же артефакта не спрашивать вновь.

Полная последовательность: worktree/state → spec → checkpoint → реальные React/MUI
mockups в финальных местах + desktop/mobile screenshots → checkpoint → clarify/plan/tasks
→ implementation с Effector wiring → review (threshold 50, cap 5, ≥80% convergence)
→ browser QA (cap 3, rechecks/coverage) → commit/push/CI (до 3 исправлений CI) и отчёт.
Подробные worker prompts, JSON-контракты, попытки fixes и resume — в процедуре.

Явный вызов включает отдельную task branch/worktree при старте из основного checkout,
стартовый draft PR и финальный commit/push. Назначенный Codex worktree использовать без
вложенного worktree. Ограничение local-only/текущего запроса имеет приоритет.
News, ready, merge, deploy — только отдельная команда пользователя.

Main ведёт `.codex/workflow/auto-feature/<slug>/state.json` по
[схеме v1](references/state.schema.json), импортирует legacy state без потери истории,
диспетчеризует отдельные workers и сам чинит review/QA findings. Модель наследуется
из Codex; анализ, код, девять reviewer roles и независимые scorers — max effort.
