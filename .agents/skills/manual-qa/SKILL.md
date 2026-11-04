---
name: manual-qa
description: "Verify a Super App feature or branch in the browser against acceptance scenarios, preserving the full QA findings/context contract and optional bounded autofixes."
---

# Ручная проверка фичи в браузере

Выполнить [полную процедуру](references/procedure.md). Вход: полный feature slug,
URL override, `--host`, `--fix`, `--teardown`, `--context <path>`.
По умолчанию — локальный изолированный QA Docker stack; host URL брать из dev-stack
ports. Пустая/отсутствующая спека не блокирует проверку по действительному diff.

План: все P1 и edge cases, negative/auth/realtime/role smoke; до 40 новых строк
сценариев с сокращением только P2/некритичных cases. P1, must_check и recheck не
обрезать. Сначала точные rechecks, затем must_check, затем ещё не покрытые сценарии.
Браузерный tool discover/документация обязательны; не имитировать наблюдение чтением кода.

Всегда записать уникальные MD + `.findings.json` с одинаковым basename,
наблюдаемым revision/URL, counts, screenshots и непройденными сценариями.
[JSON v1](references/findings.schema.json) сохраняет readiness, coverage, recheck_results,
summary, полный finding и autofix fields; `steps` добавлен для точных перепроверок.
[Round context](references/round-context.schema.json) совместим с оркестраторами.

Без `--fix` исходники не менять. С `--fix` сначала сохранить отчёт «до», затем
чинить только однозначные допустимые findings по критериям процедуры, тестировать
и повторять сценарий. Нельзя менять package.json, DB schema/миграции, публичные API,
архитектуру или решения PO. Rollback — только свой patch. Commit/push не выполнять.
Стек оставить доступным, `--teardown` удаляет только выбранный disposable QA-стек.
