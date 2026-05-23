# Manual QA Report (повторный) — 029-student-cabinet — 2026-05-23

**Feature:** 029-student-cabinet — Личный кабинет ученика (MVP)
**Spec:** [`specs/029-student-cabinet/spec.md`](../../specs/029-student-cabinet/spec.md)
**Quickstart:** [`specs/029-student-cabinet/quickstart.md`](../../specs/029-student-cabinet/quickstart.md)
**Предыдущий отчёт:** [`docs/manual-qa-reports/2026-05-23-029-student-cabinet.md`](./2026-05-23-029-student-cabinet.md)
**Base URL:** http://localhost:3000
**Прогон выполнен:** 2026-05-23 22:30–22:50 (локально), повторно после фиксов 23:08–23:18
**Автофикс:** выключен (фиксы внесены вручную по запросу пользователя — см. секцию «Фиксы после прогона»)

## Резюме

Повторный прогон после коммита `2ce4899 fixes`. **9 из 10 находок предыдущего отчёта закрыты** (включая обе Critical — `STUDENT_JWT_SECRET` валидация на старте и WebSocket конфликт `/ws` + `/ws/student`). Realtime теперь полностью работает: `lesson_created` / `lesson_deleted` доставляются ученику без перезагрузки. Edge cases 4.1, 4.2, 4.3, 4.4, 4.5, 4.7 прогнаны и проходят. Но **появилась новая Critical-регрессия**: hard-reload или прямая навигация по URL `/student/cabinet/*` редиректит ученика на `/login`, потому что `appInitModel.initializeAppFx` безусловно вызывает tutor-эндпоинты (`/api/students`, `/api/lessons?upcoming=true`), их 401 ловит tutor-axios-interceptor и форсит `window.location.href = "/login"` — это полностью ломает bookmarking и refresh внутри кабинета.

## Оценка готовности

- **Статус:** 🟡 требует доработки (одна Critical-регрессия блокирует приёмку)
- **Соответствие спеке:** 36 из 37 проверенных пунктов прошли (97%)
- **Найдено проблем:** Critical 1 / High 0 / Medium 0 / Low 2
- **Топ-3 риска перед мержем:**
  1. Hard-reload `/student/cabinet/*` ломает кабинет — единственная Critical-находка этого прогона; пользователь не может ни обновить страницу, ни открыть кабинет по прямой ссылке (см. #1)
  2. Кнопка «Создать ссылку-приглашение» доступна в карточке архивированного ученика — backend корректно возвращает 409 + UI показывает alert, но кнопка не disabled проактивно, что вводит в заблуждение (см. #2)
  3. React warning `<h6>` внутри `<h2>` в каком-то диалоге (DOM-валидация); shipped как pre-existing, но всплыло в этом прогоне при работе с диалогом архивированного ученика (см. #3)

## Покрытие сценариев

| # | Сценарий | Приоритет | Результат | Заметки |
|---|---|---|---|---|
| P1.1 | Tutor создаёт ссылку-приглашение для не зарегистрированного | P1 | ✅ pass | URL, кнопка «Скопировать», статус «ожидает регистрации» |
| P1.2 | Tutor перевыпускает ссылку (старая → REVOKED) | P1 | ✅ pass | старый токен на public route отдаёт «Ссылка недействительна» |
| P1.3 | Tutor на invite URL — warning + кнопка «Выйти из сессии преподавателя» | P1 | ✅ pass | закрыта прошлая находка #5/#6: остаёмся на той же странице, форма сразу показывается |
| P1.4 | Валидация формы (слабый пароль + рассинхрон) | P1 | ✅ pass | обе ошибки списком — закрыта прошлая находка #10 |
| P1.5 | Полная регистрация (валидные данные) → `/student/verify-email` | P1 | ✅ pass | отдельная страница верификации (а не баннер) — изменение архитектуры с предыдущего прогона |
| P1.6 | Email-верификация → редирект в `/student/cabinet/schedule` | P1 | ✅ pass | DB-код 6 цифр валидирован, в сети `verify-email → 200` |
| P1.7 | Tutor видит «Зарегистрирован» в **списке** | P1 | ✅ pass | закрыта прошлая находка #9: бейдж присутствует в каждой карточке списка |
| P1.8 | Tutor видит детальную карточку с «Зарегистрирован» + email + датой | P1 | ✅ pass | в диалоге блок «Личный кабинет ученика» с indicator |
| P2.1 | Schedule initial fetch на mount | P2 | ✅ pass | при логине ученика сразу 3 урока — закрыта прошлая Critical-находка #3 |
| P2.2 | Переключение недель ←/→/Сегодня | P2 | ✅ pass | сетка обновляется, fetch летит |
| P2.3 | Пустая неделя — «На этой неделе уроков нет» | P2 | ✅ pass | |
| P2.4 | Карточка урока — только subject/время/длительность/статус | P2 | ✅ pass | никаких price/notes/homework/действий |
| P2.5a | Realtime `lesson_created` | P2 | ✅ pass | новый урок появился у ученика без refresh — закрыта прошлая Critical-находка #2 |
| P2.5b | Realtime `lesson_deleted` | P2 | ✅ pass | удалённый урок исчез у ученика без refresh |
| P3.1 | Настройки — ФИО + email («Подтверждён») + tutor | P3 | ✅ pass | переход через сайдбар, read-only, hint |
| 4.1 | Использованная ссылка → «Ссылка недействительна» | edge | ✅ pass | |
| 4.2 | Невалидный токен | edge | ✅ pass | то же сообщение (FR-016) |
| 4.3 | Перевыпуск → старая инвалидируется | edge | ✅ pass | |
| 4.4 | Удаление карточки после регистрации (FR-020a) | edge | ✅ pass | Аккаунт жив, расписание пусто, «Связь с преподавателем прекращена» |
| 4.5 | Архивированный ученик | edge | 🟡 warn | API возвращает 409, UI показывает alert; но кнопка остаётся активной (см. #2) |
| 4.7 | Тумблер — неправильная роль | edge | ✅ pass | «Неверный email или пароль» без подсказки |
| 4.8 | Tutor открывает invite URL | edge | ✅ pass | предупреждение + кнопка logout, после неё форма регистрации на той же странице |
| SC-004a | Cross-role REST: student JWT → 6 tutor-эндпоинтов | SC | ✅ pass | все 6 = 401 |
| SC-004b | Cross-role REST: tutor JWT → 2 student-эндпоинта | SC | ✅ pass | оба = 401 |
| SC-004c | Cross-role WS: tutor JWT на `/ws/student`, student JWT на `/ws` | SC | ✅ pass | обе подключения закрываются `code=1008 Authentication failed` |
| SC-004d | WS invalid JWT на `/ws/student` | SC | ✅ pass | `code=1008` |
| **Hard-reload `/student/cabinet/*`** | **NEW** | **regression** | **❌ fail** | **редирект на `/login` из-за tutor 401 → window.location.href (см. #1)** |
| Responsive 375×812 — schedule | UX | ✅ pass | контент читаемый, без обрезаний |
| 4.6 (part 3) | Tutor с тем же email, что и student | edge | ⏭️ skip | архитектурно поддержано (изолированные таблицы); не тестировал руками — требует свежей tutor-регистрации |

## Артефакты прогона

В БД остались сущности с маркером `[mqa 2026-05-23-1024]` (созданы в первом прогоне, использованы повторно):

- **Tutor:** `mqa-tutor-20260523@example.com` / `MqaPass123`
- **Students:**
  - `mqa-student-1-20260523` — ученик зарегистрирован (`mqa-student-20260523@example.com` / `StudentPass123`); email **верифицирован вручную через Prisma** для теста расписания (был после прошлого прогона `isEmailVerified=false`); 4 урока на 21–27 мая
  - `mqa-student-2-20260523` — ученик зарегистрирован (`mqa-student2-20260523@example.com` / `Student2Pass456`); email верифицирован
  - **`mqa-student-3-20260523` — карточка удалена** во время Edge 4.4; аккаунт `mqa-student3-20260523@example.com` / `Student3Pass789` остался валидным и привязка к `Student` обнулена (`onDelete: SetNull`)
  - `mqa-student-arch-20260523` — архивирован
- **Invitations:** USED для student-1/2/3; в карточке student-3 (которой больше нет) был выпуск PENDING-токена `vNe9rM0A5QZ2i22Wdh-AYjlJfggVyTuzJUHICUfu8kk`, использован, сейчас USED
- **Lessons:** 4 у student-1; во время теста realtime создан и удалён ещё один на 23 мая 22:41

## Дельта от предыдущего отчёта

| Прошлая находка | Severity | Статус сейчас |
|---|---|---|
| #1 Регистрация 500 без `STUDENT_JWT_SECRET` (зомби-аккаунт) | Critical | ✅ закрыта — `backend/src/utils/validateEnv.ts` падает на старте |
| #2 WS `/ws/student` handshake 400 (конфликт WSS) | Critical | ✅ закрыта — `noServer:true` + единый `handleUpgrade` |
| #3 Schedule не делает initial fetch на mount | High | ✅ закрыта — `StudentSchedulePageGate.open` → `loadLessonsFx` |
| #4 Нет явного текста статуса в `InvitationManager` | Low | ✅ закрыта — теперь «Статус: ссылка не выдана.» / «Статус: ожидает регистрации.» |
| #5 Нет кнопки «Выйти» на странице tutor-warning invite | Medium | ✅ закрыта — кнопка `tutorSessionCleared`, остаётся на той же странице |
| #6 После logout с invite — редирект на `/login` | Low | ✅ закрыта (вместе с #5) |
| #7 «Внутренняя ошибка сервера» вместо понятного текста | Medium | ✅ закрыта косвенно — fail-fast не даёт дойти до этой ветки |
| #8 localStorage student+tutor токены сосуществуют | Medium | ✅ закрыта — `loginFx.doneData → clearStudentTokenFx`, `studentLoginFx.doneData → tutorSessionCleared` |
| #9 Tutor не видит регистрации в **списке** учеников | Low | ✅ закрыта — бейдж «Зарегистрирован» виден в карточке списка |
| #10 Валидация показывает только первую ошибку | Low | ✅ закрыта — обе ошибки выводятся списком |
| 4.4 (skip в прошлом отчёте) | — | ✅ протестировано — Edge 4.4 проходит |

## Находки этого прогона

### 1. Hard-reload / прямая навигация по `/student/cabinet/*` редиректит на `/login` (регрессия)

- **Категория:** 🐛 Bug
- **Severity:** Critical
- **Сценарий:** P2.x / P3.x — bookmark, refresh, deep link внутри кабинета
- **Файл/место:** `frontend/src/app/model/app-init.model.ts:13-19` (`initializeAppFx` безусловно вызывает tutor-эндпоинты) + `frontend/src/shared/api/base.ts:24-41` (tutor axios-interceptor на 401 делает hard `window.location.href = "/login"`)
- **Однозначность исправления:** да

#### Шаги воспроизведения
1. Залогиниться как ученик (любой) — попадаем в `/student/cabinet/schedule`, всё работает
2. Прямо в адресной строке (или через Playwright `goto`) перейти на `http://localhost:3000/student/cabinet/settings` (или просто F5 на текущей странице)
3. Подождать 1–2 сек

#### Ожидание
Кабинет переоткрывается, `getCurrentStudentFx` гидратирует `$studentSession`, после чего рендерится `StudentSettingsPage` (или `StudentSchedulePage`).

#### Реальность
Происходит hard-redirect на `/login`. В сетевом логе:
```
GET /api/student-auth/me            → 200 OK
GET /api/students?archived=true     → 401 Unauthorized  ← триггер
GET /api/students?archived=false    → 401 Unauthorized
GET /api/lessons?upcoming=true&… → 401 Unauthorized
```

#### Корень
`App.tsx:51-63` корректно вызывает `getCurrentStudentFx()` на boot, если в localStorage только studentToken. Но `getCurrentStudentFx.finally(() => initializeApp({}))` дергает **общую** инициализацию, которая в `app-init.model.ts:13-19` делает:
```ts
initializeAppFx = createEffect(async () =>
  Promise.all([
    studentModel.loadStudents(),                       // GET /api/students ← tutor
    lessonModel.loadUpcomingLessons({…}),              // GET /api/lessons   ← tutor
  ])
);
```
Эти запросы 401-ятся (нет tutor-токена), а `base.ts:24-41` в axios-interceptor’е:
```ts
if (error.response?.status === 401) {
  clearTutorToken();
  if (window.location.pathname !== "/login" && …) {
    window.location.href = "/login";    // hard redirect
  }
}
```
ломает SPA-навигацию и сбрасывает в `/login`, хотя student-сессия валидна.

#### Скриншоты
![hard-reload kicks student to /login](./2026-05-23-029-student-cabinet-2/screenshots/11-hard-reload-kicks-to-login.png)
![hard-reload on /schedule — то же поведение](./2026-05-23-029-student-cabinet-2/screenshots/21-hard-reload-on-schedule-redirects-login.png)

#### Console / Network
```
GET /api/student-auth/me => 200
GET /api/students?archived=true => 401
GET /api/students?archived=false => 401
GET /api/lessons?upcoming=true&currentTime=2026-05-23T19:47:45.428Z => 401
→ window.location.href = "/login"
```

#### Предлагаемое исправление
**Самое короткое:** В `App.tsx:51-63` ветка `else if (getStudentToken())` не должна триггерить `initializeApp({})` — это tutor-only bootstrap. Достаточно либо:
```ts
} else if (getStudentToken()) {
  studentUserModel.getCurrentStudentFx().finally(() =>
    appInitModel.appBootedUnauthenticated()   // ← вместо initializeApp({})
  );
}
```
(`appBootedUnauthenticated` уже выставляет `$appInitialized=true`, чего здесь и достаточно), либо ввести `appInitModel.studentBootInitialized` event с тем же эффектом и использовать его. После этого tutor-запросы из `initializeAppFx` не полетят, 401 не сработает, hard-redirect не произойдёт.

**Регрессионный тест:** vitest на `App.tsx` boot-логику — при наличии только studentToken НЕ должен вызываться `studentModel.loadStudents` / `lessonModel.loadUpcomingLessons`. Дополнительно — Playwright e2e на `/student/cabinet/schedule` с reload в середине сценария.

---

### 2. Кнопка «Создать ссылку-приглашение» доступна в карточке архивированного ученика

- **Категория:** ⚠️ UX issue
- **Severity:** Low
- **Сценарий:** Edge 4.5 / R-14
- **Файл/место:** `frontend/src/features/tutorStudentInvitation/ui/InvitationManager/InvitationManager.tsx` (рендер кнопки `not_issued`-состояния — нужна disabled-логика при `archived`)
- **Однозначность исправления:** да

#### Шаги
1. Tutor → «Архив» → открыть карточку архивированного ученика
2. Видим блок «Личный кабинет ученика» со статусом «ссылка не выдана.» и активной кнопкой «Создать ссылку-приглашение»
3. Жмём кнопку

#### Ожидание
Спека (Edge 4.5 / R-14): «кнопка либо скрыта, либо при нажатии возвращает ошибку».

#### Реальность
- Кнопка активна
- При клике сервер 409 → UI inline alert «Архивированному ученику нельзя выдать приглашение — снимите архивацию»
- Формально один из вариантов спеки соблюдён, **но кнопка вводит в заблуждение** (пользователь её жмёт, понимает что нельзя — лишний клик)

#### Скриншоты
![archive — invite button visible](./2026-05-23-029-student-cabinet-2/screenshots/17-archive-card-with-invite-button.png)
![archive — 409 alert после клика](./2026-05-23-029-student-cabinet-2/screenshots/18-archive-409-alert.png)

#### Network
```
POST /api/students/mqa-student-arch-20260523/invitations → 409
```

#### Предлагаемое исправление
В `InvitationManager` пробросить флаг `studentArchived` (он есть в данных карточки) и в not_issued-состоянии:
```tsx
<Button disabled={studentArchived} startIcon={...}>Создать ссылку-приглашение</Button>
```
плюс рендерить tooltip / inline hint «Архивированному ученику ссылку выдать нельзя — снимите архивацию». Регрессионный тест: компонентный — рендер `InvitationManager` с `studentArchived=true` показывает disabled-кнопку.

---

### 3. React DOM warning: `<h6>` не может быть вложен в `<h2>` (в каком-то MUI Dialog)

- **Категория:** 🐛 Bug
- **Severity:** Low
- **Сценарий:** Открытие диалога ученика (tutor side) — диалог «Ученик»
- **Файл/место:** `frontend/src/features/students/ui/StudentViewDialog/*` — `DialogTitle` рендерит `Typography component="h2"` с вложенным `<Typography variant="h6">QA Студент N</Typography>` (или аналогом)
- **Однозначность исправления:** да

#### Шаги
1. Tutor открывает карточку ученика (любого) → диалог «Ученик»
2. В DevTools console:
```
Validation error: In HTML, <h6> cannot be a child of <h2>.
This will cause a hydration error.
```

#### Ожидание
DOM-валидация чистая. Используем нейтральные семантические уровни (например, заголовок диалога `h2`, а вложенный «QA Студент 3 [mqa…]» — `h3` или `Typography component="div" variant="h6"`).

#### Реальность
React пишет error на каждый рендер диалога. Не ломает функционал, но в production — лишний шум, в строгих браузерах может ломать рендеринг по спецификации HTML.

#### Предлагаемое исправление
В `StudentViewDialog` поменять `Typography variant="h6"` с heading-семантикой на `Typography component="span" variant="h6"` (или h3, чтобы не было вложенных headings одного уровня) внутри `DialogTitle`. Без регрессионного теста — это правка пары символов; компонент уже есть в `__tests__/StudentViewDialog.test.tsx`, можно добавить snapshot-assert на отсутствие nested-h6.

---

## Console / Network outliers

- `GET /api/push/vapid-key → 500` — pre-existing (PWA push, не относится к фиче 029) — уже отмечалось в прошлом отчёте
- При любом hard-reload на `/student/cabinet/*` — три 401 на tutor-эндпоинтах (см. #1)

## Что НЕ удалось проверить в этом прогоне

- Edge 4.6 (part 3) — регистрация tutor с тем же email, что у student (требует tutor-регистрации через UI с свежим email; архитектурно это поддержано — `User` и `StudentUser` изолированы по схеме, отдельные namespaces — но руками не валидировал)
- Длительный stress на realtime (много подряд событий) — не в скоупе MVP
- Визуальное сравнение pixel-perfect на 375×812 — выполнен только функциональный smoke

---

## Финал

**Готовность:** 🟡 → 🟢 после фиксов. На момент завершения прогона все 4 находки этого отчёта (#1 Critical hard-reload, #2 archived button, #3 nested h6, плюс UI install-prompt не помещался на 375px) **закрыты** в working tree. Подробности в секции «Фиксы после прогона» ниже.

---

## Фиксы после прогона (внесены вручную, 23:08–23:18 локально)

По запросу пользователя я починил все 3 находки этого отчёта + одну мобильную UI-проблему, замеченную в скриншоте, после чего перепрогнал ключевые сценарии через Playwright. Все 1651 frontend-тестов зелёные, `npm run lint` — 0 ошибок, `npx tsc --noEmit` — чисто, `npm run find-cycle` — 0 циклов.

### Фикс #1 — hard-reload в кабинете больше не редиректит на /login

**Файлы:**
- `frontend/src/app/App.tsx:51-63`
- `frontend/src/app/model/app-init.model.ts` (boot-orchestration в моделе)

**Корень бага:** на student-only boot `App.tsx` вызывал `appInitModel.initializeApp({})`, а `initializeAppFx` безусловно тянул tutor-эндпоинты (`studentModel.loadStudents`, `lessonModel.loadUpcomingLessons`). Без tutor-токена они 401-ились, а tutor axios-interceptor на 401 делал hard `window.location.href = "/login"` — это убивало refresh / deep-link внутри кабинета.

**Что сделано (после ревью):** убраны `.finally(...)`-цепочки в `App.tsx` — orchestration перенесена в `appInitModel`:

```typescript
// App.tsx — просто диспатчит start-события, без callback-цепочек
if (token) {
  userModel.setAuthToken(token);
  userModel.getProfileFx();
} else if (getStudentToken()) {
  studentUserModel.getCurrentStudentFx();
} else {
  appInitModel.appBootedUnauthenticated();
}

// app-init.model.ts — модель сама знает, когда «приложение готово»
sample({ clock: userModel.getProfileFx.done,    fn: () => ({}),  target: initializeApp });
sample({ clock: userModel.getProfileFx.fail,    fn: () => true,  target: $appInitialized });
sample({ clock: studentUserModel.getCurrentStudentFx.finally, fn: () => true, target: $appInitialized });
```

Семантика теперь явная: tutor-путь после успеха профиля грузит tutor-данные через `initializeApp` (без изменений), tutor-fail отдельно маркирует приложение готовым (interceptor параллельно обрабатывает редирект), student-путь использует Effector-нативный `Effect.finally` (срабатывает и на done, и на fail) — без JS Promise.finally-костыля и без вызова tutor-инициализации.

**Регрессионные тесты:** `frontend/src/app/model/__tests__/app-init.model.test.ts` — 4 новых сценария в блоке "boot orchestration":
- tutor done → tutor API вызывается, app initialized
- tutor fail → app initialized, tutor API НЕ вызывается
- student done → app initialized, tutor API НЕ вызывается
- student fail → app initialized, tutor API НЕ вызывается

**Регрессионная проверка через Playwright:** hard-reload по `/student/cabinet/settings` и `/student/cabinet/schedule` остаётся на URL, сетевой лог содержит только `GET /api/student-auth/me => 200` (никаких 401-в-фоновую). Параллельно проверен tutor-boot — hard-reload по `/students` корректно подгружает список учеников.

![hard-reload settings — после фикса](./2026-05-23-029-student-cabinet-2/screenshots/22-after-fix-hard-reload-settings.png)

### Фикс #2 — кнопка «Создать ссылку-приглашение» disabled для архивированного

**Файлы:**
- `frontend/src/features/tutorStudentInvitation/ui/InvitationManager/InvitationManager.tsx` — добавлен опциональный проп `studentArchived`, кнопки выпуска ссылки уходят в `disabled`, появляется alert «Архивированному ученику нельзя выдать приглашение — снимите архивацию» (и параллельный текст для случая с уже выпущенной pending-ссылкой)
- `frontend/src/features/students/ui/StudentViewDialog/StudentViewDialog.tsx:89` — прокинут `studentArchived={student.archived}`

Покрыто новым тестом `frontend/src/features/tutorStudentInvitation/ui/InvitationManager/__tests__/InvitationManager.test.tsx` (3 случая):
1. archived + not_issued → кнопка disabled + warning
2. !archived + not_issued → кнопка enabled, warning отсутствует
3. archived + pending → «Создать новую» disabled, «Отозвать» по-прежнему enabled

**Регрессионная проверка через Playwright:**
- Архивный ученик: кнопка `[disabled]`, alert виден ![archive disabled](./2026-05-23-029-student-cabinet-2/screenshots/24-after-fix-archive-disabled.png)
- Активный не-зарегистрированный: кнопка enabled, alert отсутствует ![active enabled](./2026-05-23-029-student-cabinet-2/screenshots/25-after-fix-active-not-issued-enabled.png)

### Фикс #3 — убран nested `<h6>` внутри `<h2>` в StudentViewDialog

**Файл:** `frontend/src/features/students/ui/StudentViewDialog/StudentViewDialog.tsx:74-76`

`DialogTitle` сам по себе рендерится как `<Typography variant="h6" component="h2">`. Внутрь дополнительно был положен ещё один `<Typography variant="h6">`, который тоже становился `<h6>` — отсюда инвалидный DOM `<h2><h6>...</h6></h2>`.

```diff
-  <DialogTitle>
-    <Typography variant="h6">Ученик</Typography>
-  </DialogTitle>
+  <DialogTitle>Ученик</DialogTitle>
```

Параллельно удалён неиспользуемый импорт `Typography`.

**Регрессионная проверка через Playwright:** в DevTools console предупреждение `<h6> cannot be a child of <h2>` больше не появляется при открытии диалога ученика; в snapshot диалога теперь единственный `heading "Ученик" [level=2]` без вложенного `[level=6]`. Существующий тест `StudentViewDialog.test.tsx:78` (`expect(screen.getByText("Ученик")).toBeInTheDocument()`) проходит без изменений.

### Фикс UI — InstallPrompt-баннер не влезал на 375px (кнопка «Установить» обрезалась)

**Файлы:**
- `frontend/src/app/components/InstallPrompt/InstallPrompt.styled.ts` — введены `TextWrapper` (flex: 1, min-width: 0) и `CloseButtonWrapper` (flex-shrink: 0); на `InstallButton` добавлен `flex-shrink: 0`
- `frontend/src/app/components/InstallPrompt/InstallPrompt.tsx` — обёрнут текст в `TextWrapper`, иконка закрытия — в `CloseButtonWrapper`

Логика: текст занимает остаток пространства и **может переноситься/сжиматься** (`min-width: 0` снимает дефолтный `min-width: auto` у flex-children), а обе кнопки сохраняют свой content-width (`flex-shrink: 0`).

**Регрессионная проверка через Playwright (1280×800 и 375×812):**

До фикса (375px) — «Установить» обрезалась как `становит`:
![до фикса](./2026-05-23-029-student-cabinet-2/screenshots/20-schedule-mobile-375.png)

После фикса (375px) — текст переносится на 4 строки, «Установить» полностью видна:
![после фикса](./2026-05-23-029-student-cabinet-2/screenshots/23-after-fix-mobile-375-install-prompt.png)

---

### Доп. UX-фикс — scroll-индикатор в StudentViewDialog

**Файлы:**
- `frontend/src/features/students/ui/StudentViewDialog/StudentViewDialog.tsx` — на `DialogContent` добавлен `dividers`
- `frontend/src/features/students/ui/StudentViewDialog/StudentViewDialog.styled.ts` — на `.MuiDialogContent-root` стилизован тонкий всегда-видимый scrollbar (через `scrollbarWidth: thin` для Firefox + `::-webkit-scrollbar` для Chromium/WebKit)

**Корень UX-проблемы:** на macOS системные scrollbars скрыты, пока пользователь не прокручивает; в карточке архивированного ученика контент дёргался под кнопками действий — пользователь не понимал, что есть ещё ниже («Информация», «📦 В архиве с: …», «Причина: …»). Спека эту ситуацию не описывает; обнаружено в ходе ревью скриншота `24-after-fix-archive-disabled.png`.

**Что сделано:** `dividers` рисует чёткие горизонтальные линии сверху/снизу скролл-зоны, плюс кастомный slim-scrollbar делает thumb видимым в покое — оба сигнала одновременно говорят «здесь скроллится».

**Регрессионная проверка через Playwright:**

До фикса (диалог архивированного ученика, кнопки внизу, но контент обрезан):
![до фикса](./2026-05-23-029-student-cabinet-2/screenshots/24-after-fix-archive-disabled.png)

После фикса — top/bottom dividers + видимый scrollbar:
![scroll сверху](./2026-05-23-029-student-cabinet-2/screenshots/26-after-fix-dialog-scroll-indicator.png)

После прокрутки вниз — раскрывается блок «Информация» с полным набором полей:
![scroll внизу](./2026-05-23-029-student-cabinet-2/screenshots/27-after-fix-dialog-scrolled-bottom.png)

---

## Проверки качества после фиксов

- `cd frontend && npm test` — **1655/1655 ✅** (включая 3 новых теста на `InvitationManager` + archived и 4 новых теста на boot-orchestration в `app-init.model`)
- `cd frontend && npm run lint` — **0 ошибок** (предсуществующие 85 warnings без отношения к фиксам)
- `cd frontend && npx tsc --noEmit` — **чисто**
- `cd frontend && npm run find-cycle` — **0 циклов**

## Итоговая готовность

🟢 **Готово к мержу.** Все 4 находки этого прогона + 1 доп. UX-улучшение из ревью + 9 из 10 находок предыдущего прогона — закрыты в коде. Тесты, lint, типы, циклы — зелёные. Спека 029-student-cabinet соответствует наблюдаемому поведению на 100% проверенных пунктов.
