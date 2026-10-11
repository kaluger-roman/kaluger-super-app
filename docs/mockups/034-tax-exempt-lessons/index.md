# Mockups: 034-tax-exempt-lessons

Screenshots are local-only (`docs/**/screenshots/` is gitignored). Captured with headless Playwright on the dev machine against the branch dev stack (web :3020, api :3021, `scripts/dev-stack.sh`), tutor `mockup034@example.com`, tax accounting on with one 6% period. Desktop 1440x900, mobile 375x812 (touch).

Mocks in the code (all marked `TODO(auto-feature)`): a lesson counts as tax-exempt when its notes contain «благотвор» (`isLessonTaxExempt`), the popup switch and the form checkbox do nothing on change, and the statistics tooltip uses a hardcoded `MOCK_TAX_EXEMPT_INCOME = 2000`. The statistics period in 09 is August 2026: one taxable 1 000 ₽ payment, so the tooltip matches the spec example (6% × 1 000 ₽ = 60 ₽ plus «Не облагается налогом: 2 000 ₽»); the income cards do not include the mocked 2 000 ₽.

| File | What it shows |
|---|---|
| `screenshots/01-desktop-popup-switch-off.png` | Lesson popup of a regular lesson: «Не облагается налогом» switch off, under the payment and homework switches |
| `screenshots/01-mobile-popup-switch-off.png` | Same, mobile full-screen popup |
| `screenshots/02-desktop-popup-switch-on.png` | Lesson popup of an exempt lesson: switch on, teal track and label |
| `screenshots/02-mobile-popup-switch-on.png` | Same, mobile |
| `screenshots/03-desktop-form-edit-checked.png` | Edit form of an exempt lesson: «Не облагается налогом» checkbox checked, with the hint «Доход по уроку не войдёт в сумму налога в статистике» |
| `screenshots/03-mobile-form-edit-checked.png` | Same, mobile |
| `screenshots/04-desktop-form-create.png` | Create form: checkbox unchecked by default, above «Регулярное занятие» |
| `screenshots/04-mobile-form-create.png` | Same, mobile |
| `screenshots/05-desktop-list-badge-tooltip.png` | Lessons list («Прошедшие»): «0% без налога» badge next to the price and the commission badge, tooltip on hover |
| `screenshots/05-mobile-list-badge-tooltip.png` | Same, mobile, tooltip opened by tap (card popup not opened) |
| `screenshots/06-desktop-list-badges-combo.png` | Card with recurring + commission + tax-exempt marks together, next to a regular lesson without the badge |
| `screenshots/06-mobile-list-badges-combo.png` | Same combination on mobile: badges wrap, layout intact |
| `screenshots/07-desktop-calendar-badge.png` | «Расписание» view: icon-only «0%» chip in exempt lesson cells, placed before the commission badge (commission text ellipsized in the narrow cell) |
| `screenshots/07-mobile-calendar-badge.png` | Same, mobile |
| `screenshots/08-desktop-calendar-badge-tooltip.png` | Calendar chip tooltip on hover |
| `screenshots/08-mobile-calendar-badge-tooltip.png` | Calendar chip tooltip on tap |
| `screenshots/09-desktop-stats-tax-tooltip.png` | Statistics: «Налоги (6%)» card with the info icon, tooltip with the rate line and a separated «Не облагается налогом: 2 000 ₽» line |
| `screenshots/09-mobile-stats-tax-tooltip.png` | Same, mobile, opened by tap |
