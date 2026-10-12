# Mockups: 035-income-history

Screenshots are local-only (`docs/**/screenshots/` is gitignored). Captured with headless Playwright on the dev machine against the branch dev stack (web :3030, api :3031, `scripts/dev-stack.sh`), tutor `mockup035@example.com`, tax accounting on with one 6% period from 2026-01-01, period 01.10.2026 – 12.10.2026. Browser timezone UTC. Desktop 1440x900, mobile 375x812.

Revision 2 (2026-10-12): the history moved into a separate tab «История поступлений» next to «Сводка»; the period filter stays above the tabs. Paging is done with «Показать ещё» from the server.

The statistics cards are real (backend, seeded via API so that «Поступления за период» = 17 700 ₽ / 10 оплат, налог 954 ₽, «Не облагается» 1 800 ₽, «Списано в счёт комиссий» 3 000 ₽). The history itself is a hardcoded mock with the same totals (`IncomeHistory.constants.ts`). Mock switches in the URL, mockup-only:
- `?reportsTab=history` keeps the active tab. In the final design the tab lives only in an Effector store, NOT in the URL (FR-001a).
- `?incomeHistoryMock=empty|error|hasMore|loadingMore|loadMoreError` switches the history state. The paged states show totals for the whole long period (134 оплаты), so they intentionally differ from the real cards.

Tax and commission visibility come from the real profile flag and `statistics.hasCommissionStudents`. Rows open the real `LessonViewDialog` with a mock lesson object, so the edit form shows an empty «Ученик» select. The «Получено» field in the payment dialogs is interactive (local state + validation) but its value is not sent to the API. All mocks are marked `TODO(auto-feature)`.

| File | What it shows |
|---|---|
| `screenshots/01-desktop-summary-tab.png` | Отчёты по умолчанию: фильтр периода, под ним вкладки «Сводка» / «История поступлений», активна «Сводка»; в карточке «Поступления за период» ссылка «История поступлений по дням» |
| `screenshots/01-desktop-summary-tab-full.png` | Вкладка «Сводка» целиком: прежний состав карточек и показателей, истории внизу больше нет |
| `screenshots/01-mobile-summary-tab.png` | То же на телефоне: обе вкладки на всю ширину, подписи в одну строку |
| `screenshots/02-mobile-summary-card-link.png` | Телефон: карточка «Поступления за период» со ссылкой |
| `screenshots/02-desktop-history-tab-via-link.png` | После нажатия на ссылку: открыта вкладка «История поступлений», страница прокручена к вкладкам |
| `screenshots/02-mobile-history-tab-via-link.png` | То же на телефоне |
| `screenshots/03-desktop-history-tab-default.png` | Вкладка истории сверху: фильтр, вкладки, пояснение о периоде, итог за период (поступило, налог, не облагается, в счёт комиссий), первые дни |
| `screenshots/03-desktop-history-tab-full.png` | Вкладка истории целиком: все дни и типы строк («Предстоящий», «Пробный урок», «в счёт комиссии», «0% без налога», «Отменен», «Архив», «дата оплаты не указана»), кнопки «Показать ещё» нет, всё загружено |
| `screenshots/03-mobile-history-tab-default.png` | Телефон: фильтр, вкладки, итог плитками 2x2 |
| `screenshots/03-mobile-history-tab-full.png` | Телефон, вкладка истории целиком |
| `screenshots/04-desktop-mismatch-tooltip.png` | Значок расхождения и подсказка «Получено 2 000 ₽, стоимость урока 2 500 ₽» с пояснением |
| `screenshots/04-mobile-mismatch-tooltip.png` | Подсказка открыта нажатием, попап урока не открылся |
| `screenshots/05-desktop-history-tax-off.png` | Учёт налога выключен: ни налога, ни ставок, ни «без налога» |
| `screenshots/05-mobile-history-tax-off.png` | То же на телефоне |
| `screenshots/06-desktop-history-empty.png` | Пустой период: «За выбранный период поступлений нет» |
| `screenshots/06-mobile-history-empty.png` | То же на телефоне |
| `screenshots/07-desktop-history-error.png` | Ошибка загрузки истории: сообщение на вкладке |
| `screenshots/07-mobile-history-error.png` | То же на телефоне |
| `screenshots/08-desktop-popup-from-history.png` | Попап урока поверх вкладки истории, пометка «получено 2 000 ₽» рядом со стоимостью 2500 ₽ |
| `screenshots/08-desktop-popup-received-tooltip.png` | Подсказка пометки в попапе |
| `screenshots/08-mobile-popup-from-history.png` | Попап на телефоне (полноэкранный) |
| `screenshots/09-desktop-paging-totals.png` | Длинный период, первая порция: итог сразу за весь период (241 300 ₽, 134 оплаты), не по загруженным строкам |
| `screenshots/09-desktop-paging-show-more.png` | Конец первой порции: последний день целиком и кнопка «Показать ещё (осталось 124)» |
| `screenshots/09-mobile-paging-show-more.png` | То же на телефоне, кнопка на всю ширину |
| `screenshots/10-desktop-paging-loading.png` | Загрузка следующей порции: состояние загрузки только у кнопки («Загружаем оплаты…»), без общего оверлея |
| `screenshots/10-mobile-paging-loading.png` | То же на телефоне |
| `screenshots/11-desktop-paging-error.png` | Ошибка загрузки порции: показанные оплаты остались, на месте кнопки сообщение с «Повторить» |
| `screenshots/11-mobile-paging-error.png` | То же на телефоне |
| `screenshots/12-desktop-edit-form-received.png` | Форма редактирования, открытая из попапа на вкладке истории: «Получено (₽)» рядом с «Датой оплаты» |
| `screenshots/12-mobile-edit-form-received.png` | То же на телефоне |
| `screenshots/13-desktop-payment-dialog-default.png` | Диалог «Отметить как оплачено» (попап урока на странице уроков): «Получено» = стоимость 2200 ₽ по умолчанию |
| `screenshots/13-mobile-payment-dialog-default.png` | То же на телефоне |
| `screenshots/14-desktop-payment-dialog-other-amount.png` | Введена другая сумма (1800 ₽) |
| `screenshots/14-mobile-payment-dialog-other-amount.png` | То же на телефоне |
| `screenshots/15-desktop-payment-dialog-error-empty.png` | Пустое поле: «Укажите полученную сумму», «Подтвердить» неактивна |
| `screenshots/15-desktop-payment-dialog-error-negative.png` | Отрицательная сумма: «Сумма должна быть неотрицательным числом» |
| `screenshots/15-mobile-payment-dialog-error-empty.png` | Ошибка пустого поля на телефоне |
| `screenshots/16-desktop-card-icon-payment-dialog.png` | То же поле в диалоге значка оплаты на карточке урока в списке |
| `screenshots/16-mobile-card-icon-payment-dialog.png` | То же на телефоне |

Screenshots 13–16 come from revision 1. The payment dialogs did not change in revision 2.
