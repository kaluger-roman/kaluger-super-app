# Specification Quality Checklist: История поступлений в отчётах

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-11
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

- Validation iteration 1: all items pass, no [NEEDS CLARIFICATION] markers.
- Iteration 2 (2026-10-11, user feedback at the spec checkpoint): the lesson
  now stores the amount actually received (snapshot of the price when the
  lesson becomes paid). Added User Story 2 and FR-015 – FR-026; the old edge
  case "history shows the current price" was replaced. Re-validated: all
  items pass.
- Paths that mark a lesson paid today (all go through the lesson update):
  the payment switch + confirm dialog in the lesson popup, the payment
  field in the lesson edit form, and the payment transfer when a paid lesson
  is cancelled. Lessons are never created already paid; recurring
  generation and the student cabinet do not set payment. The recurring
  price propagation rewrites the price of SCHEDULED future lessons,
  including prepaid ones, which is the main real source of a mismatch.
- Statistics switch to the received amount for money already received
  (FR-025): paymentsInRange, earnings / average lesson, prepaid income,
  tax and tax-exempt income, FACT commission credits, the lessons page
  "Оплачено за период" summary. Unchanged (price-based): debt, lost
  earnings, upcoming income, commission forecast; the by-student /
  by-subject / by-type endpoints are not used by the UI and stay out of
  scope.
- Decisions taken as informed defaults (candidates for the checkpoint):
  the lesson "link" opens the lesson popup over the reports page;
  "уплаченный налог" is the calculated tax per payment.
- Iteration 3 (2026-10-11, user decision at the spec checkpoint): the
  received amount is entered in a «Получено» field of the payment dialog
  (default = lesson price; in the edit form = the price typed in the form).
  The field is in every mark-paid dialog: the PaymentStatus switch dialog
  (lesson popup and edit form, same component) and the LessonStatusIcons
  dialog on list cards. For an already paid lesson the amount is edited in
  the lesson edit form next to «Дата оплаты» (mirrors how the payment date
  is edited today); no inline edit in the popup or the history. Validation
  mirrors the price: non-negative number, kopecks allowed, 0 allowed
  (price is Decimal(10,2), validated only as `>= 0`, not as integer).
  Received < price still means paid, no debt (FR-020b). The mismatch
  tooltip text became neutral («Получено M ₽, стоимость урока N ₽»),
  since a mismatch can now come from the entered amount, not only from a
  later price change. Added FR-020a/FR-020b, SC-010, US2 scenarios 2, 3,
  7, 9, 11 and edge cases (under/over-payment, 0, kopecks, invalid input).
  Re-validated: all items pass.
- Dependencies: 027-tax-rate-periods, 033-commission-tracking,
  034-tax-exempt-lessons; their rules stay, only the base amount for paid
  lessons changes.
- Iteration 4 (2026-10-12, user decisions at the mockup checkpoint):
  (1) the history moved into a separate tab: the Reports page has tabs
  «Сводка» (all existing cards, unchanged) and «История поступлений»;
  the period filter sits above the tabs and applies to both; the
  «История поступлений по дням» link in the «Поступления за период» card
  switches to the history tab (FR-001, FR-001a, FR-001b, FR-014, FR-034,
  US1 scenarios 9-11). The tab is NOT kept in the URL: every tabbed page
  (lessons, students, profile, admin) keeps its tab in an Effector store
  only, and the period is not in the URL either, so a tab-only deep link
  would be incomplete. The tab survives in-app navigation like the period
  and resets to «Сводка» on reload.
  (2) paging = «Показать ещё» from the server: totals over the whole
  period come with the first page; pages of 50 payments, newest first,
  never splitting a day (a page may be < 50 or, for one huge day, > 50);
  cursor (day + payment id), not offset; «Показать ещё (осталось N)» with
  a button-local loading state, an inline error with «Повторить» that
  keeps loaded rows, the button disappears when everything is loaded;
  period change / «Обновить» resets to the first page; after a lesson
  edit from the popup the totals and the already loaded depth are
  reloaded (FR-013 - FR-013e, US1 scenarios 12-14, new edge cases,
  SC-009 rewritten). Re-validated: all items pass.
