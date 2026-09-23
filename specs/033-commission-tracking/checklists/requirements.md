# Specification Quality Checklist: Учёт комиссий по ученикам

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-20
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

- Оба маркера [NEEDS CLARIFICATION] закрыты решением пользователя,
  маркеров в спеке не осталось:
  - **FR-006 / FR-019–FR-021** — прогнозная пометка показывается:
    у предстоящих и ещё не оплаченных уроков видна предварительная
    сумма «пойдёт в счёт комиссии» в отдельном визуальном стиле.
    Фактическое погашение по-прежнему считается только по завершённым
    и оплаченным урокам, поэтому прогноз не меняет ни одной денежной
    цифры статистики.
  - **FR-010** — списание относится к периоду по дате урока (та же база,
    что у показателя «Заработок»), а не по дате оплаты. Отличие
    от «Поступлений за период» и налога зафиксировано в Assumptions.
- Скоуп расширен пользователем: добавлена User Story 4 — блок прогресса
  погашения в карточке ученика (погашено / осталось) и общий остаток
  комиссий на странице статистики (снимок на текущий момент,
  не зависящий от фильтра дат). «Заработок» и расчёт налога
  по-прежнему не уменьшаются на комиссии.
- Остальные неоднозначности закрыты разумными умолчаниями и записаны
  в разделе Assumptions (ретроактивность, хронологический порядок
  погашения, двухпроходный расчёт факт → прогноз, бесплатные уроки
  не гасят комиссию, исключение архивных учеников из общего остатка,
  невидимость комиссии в кабинете ученика, границы скоупа).
