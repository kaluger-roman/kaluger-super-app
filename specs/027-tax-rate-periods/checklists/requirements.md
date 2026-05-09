# Specification Quality Checklist: Гибкая ставка налога по периодам

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-05-08
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit.clarify` or `/speckit.plan`
- Revision 2026-05-09 после уточнений пользователя:
  - Расчёт привязан к дате оплаты урока, не к дате проведения
  - Введён тумблер «Учитывать налог», по умолчанию выключен у всех новых пользователей
  - Управление периодами вынесено в попап (а не инлайн в профиле)
  - Время до самого раннего периода — зона 0%, без продления ставки в прошлое
  - Подпись «смешанные ставки» заменена на info-иконку с тултипом-разбивкой
  - Добавлены FR по миграции существующих пользователей: исторические `taxRate != 6%` → ON+seed-период; ставка 6% → OFF
- Валидация прошла: спецификация остаётся без [NEEDS CLARIFICATION], все критерии чеклиста удовлетворены.
- Готовность: можно переходить к `/speckit.clarify` или сразу к `/speckit.plan`.
