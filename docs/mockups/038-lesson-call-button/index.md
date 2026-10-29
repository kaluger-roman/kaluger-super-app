# Mockups: 038-lesson-call-button

Screenshots are local-only (`docs/**/screenshots/` is gitignored). Captured with headless Playwright on the dev machine against the branch dev stack (web :3110, api :3111 in `run-backend-e2e` mode, test DB seeded through `/api/__test__/*`), browser timezone UTC, «сегодня» = пятница, 23.10.2026. Desktop 1440x900, mobile 375x812.

Seed: репетитор «Анна Кузнецова»; ученики «Иван Петров» (с кабинетом), «Мария Смирнова» (без кабинета), «Алексей Морозов» (с кабинетом, в архиве); пробный урок «Ольга Белова». Ученик в кабинете: Иван Петров.

Real data: lessons, students, student schedule, the student's session (tutor name). Mocks, all marked `TODO(auto-feature)`:
- «у ученика есть кабинет» in the tutor lesson dialog: every student except «Мария Смирнова» (`LessonDialogActions.constants.ts`); the real version reads `lesson.student.hasCabinet`.
- The call confirmation and the student lesson dialog are opened through small in-memory mock stores (`CallConfirmDialog.hooks.ts`, `StudentLessonDialog.hooks.ts`), so the mockup is clickable. «Позвонить» in the confirmation only closes it: no call starts and the lesson dialog stays open (in the final version a confirmed lesson call closes the lesson dialog, FR-006).
- `?mock=calls` shows a mock block «Звонки по уроку» in any tutor lesson dialog and a mock call history with lessons.
- `?mock=incoming-call` shows the incoming call window with a lesson over any page.

| File | What it shows |
|---|---|
| `screenshots/01-desktop-tutor-lesson-dialog.png` | Окно урока у репетитора: кнопка «Позвонить» во всю ширину над прежними действиями |
| `screenshots/01-mobile-tutor-lesson-dialog.png` | То же на телефоне, верх окна |
| `screenshots/01-mobile-tutor-lesson-dialog-actions.png` | Телефон: блок действий, «Позвонить» первой кнопкой |
| `screenshots/01-desktop-tutor-lesson-dialog-no-cabinet.png` | Урок ученика без кабинета: кнопки «Позвонить» нет |
| `screenshots/01-mobile-tutor-lesson-dialog-no-cabinet.png` | То же на телефоне |
| `screenshots/01-desktop-tutor-lesson-dialog-trial.png` | Пробный урок без ученика: кнопки «Позвонить» нет |
| `screenshots/01-mobile-tutor-lesson-dialog-trial.png` | То же на телефоне |
| `screenshots/01-desktop-tutor-lesson-dialog-archived-student.png` | Прошедший урок ученика из архива: «Позвонить» есть |
| `screenshots/02-desktop-confirm-over-tutor-lesson.png` | Подтверждение «Позвонить Иван Петров?» поверх окна урока: аватар, блок «Звонок по уроку» (предмет, день, время), «Отмена» / «Позвонить» |
| `screenshots/02-mobile-confirm-over-tutor-lesson.png` | То же на телефоне: кнопки во всю ширину, «Позвонить» сверху, высота 48 px |
| `screenshots/03-desktop-tutor-lesson-dialog-calls.png` | Окно прошедшего урока с блоком «Звонки по уроку»: направление, время, исход, длительность |
| `screenshots/03-mobile-tutor-lesson-dialog-calls.png` | То же на телефоне: исход и длительность переносятся на вторую строку |
| `screenshots/04-desktop-confirm-over-student-card.png` | Карточка ученика, «Видеозвонок» теперь тоже через подтверждение (без блока урока) |
| `screenshots/04-mobile-confirm-over-student-card.png` | То же на телефоне |
| `screenshots/04-desktop-student-card-archived-call-button.png` | Карточка ученика в архиве: «Видеозвонок» показывается (FR-010) |
| `screenshots/05-desktop-call-history-lesson.png` | История звонков: у звонков по уроку строка «Урок: Физика · пятница, 23 октября · 09:00—10:00», звонки без урока как раньше |
| `screenshots/05-mobile-call-history-lesson.png` | То же на телефоне |
| `screenshots/06-desktop-tutor-lessons-list-no-call-button.png` | Список уроков: карточки без кнопки звонка (без изменений) |
| `screenshots/06-mobile-tutor-lessons-list-no-call-button.png` | То же на телефоне |
| `screenshots/07-desktop-tutor-schedule-grid.png` | Сеточное расписание: ячейки без кнопки звонка |
| `screenshots/07-desktop-tutor-schedule-grid-lesson-dialog.png` | Окно урока, открытое из сетки: та же кнопка «Позвонить» |
| `screenshots/08-desktop-student-schedule-no-header-call.png` | Кабинет ученика: в шапке больше нет «Позвонить» |
| `screenshots/08-mobile-student-schedule-no-header-call.png` | То же на телефоне |
| `screenshots/09-desktop-student-lesson-dialog.png` | Окно урока у ученика (по нажатию на карточку): предмет, статус, день, время и длительность, репетитор, «Закрыть» / «Позвонить» |
| `screenshots/09-mobile-student-lesson-dialog.png` | То же на телефоне: кнопки во всю ширину, «Позвонить» сверху |
| `screenshots/10-desktop-confirm-over-student-lesson.png` | Подтверждение «Позвонить Анна Кузнецова?» поверх окна урока ученика |
| `screenshots/10-mobile-confirm-over-student-lesson.png` | То же на телефоне |
| `screenshots/11-desktop-incoming-call-with-lesson.png` | Входящий звонок по уроку у ученика: под именем блок «Звонок по уроку» с предметом, днём и временем |
| `screenshots/11-mobile-incoming-call-with-lesson.png` | То же на телефоне |
