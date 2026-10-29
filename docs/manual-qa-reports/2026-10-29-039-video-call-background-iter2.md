# Manual QA Report — 039-video-call-background — 2026-10-29 (итерация 2)

**Feature:** 039-video-call-background — Видеозвонок, который переживает сворачивание приложения
**Spec:** [`specs/039-video-call-background/spec.md`](../../specs/039-video-call-background/spec.md)
**Quickstart:** [`specs/039-video-call-background/quickstart.md`](../../specs/039-video-call-background/quickstart.md)
**Итерация 1:** [`2026-10-29-039-video-call-background.md`](./2026-10-29-039-video-call-background.md)
**Base URL:** http://localhost:32772 (изолированный QA-стек `qa-039-video-call-background`, prod-сборка с состоянием после итерации 1; после пересборки с исправлениями этой итерации — http://localhost:32773, прежний порт больше не отвечает) и http://localhost:3150 (API http://localhost:3151: бэкенд `NODE_ENV=test E2E=1` на БД `tutor_qa_039`, test-support маршруты, приёмник push; фронт — dev-сервер, подхватывает правки сразу)
**Прогон выполнен:** 2026-10-29 13:35–14:30 UTC
**Автофикс:** включён

## Резюме

Перепроверено всё, что в итерации 1 упало или было с замечаниями, и решения владельца после неё. Голос собеседника (исправление #1 итерации 1) работает: у `[data-testid=peer-audio]` на обеих сторонах `readyState 4`, `paused=false`, `currentTime` растёт, анализатор WebAudio на полученном потоке видит сигнал осциллятора (пик 1.0); после перезагрузки звонок восстанавливается за 0,5 с и звук идёт; при эмуляции запрета автозапуска звука показывается одна плашка «Нажмите, чтобы продолжить звонок», одно нажатие убирает её за 0,1 с и звук начинает играть. Старый баннер установки PWA на iPhone Safari прячется, пока видна инструкция 039, и возвращается после «Скрыть»; справка о запрете уведомлений в карточке «Звонки» преподавателя появляется и пропадает после разрешения и возврата в приложение.

Три известные проблемы исправлены автофиксом (две подсказки о запрете уведомлений во вкладке, активный переключатель звонков с тостом при запрете, нестабильный тест `signalRouting`). Свежий проход по сценариям спеки (US1–US5, edge cases, push через приёмник e2e-бэкенда, 3-минутное ожидание) прошёл без новых дефектов фичи. Остались одна мелкая находка в поведении переключателя напоминаний (фича 008) и проверки, возможные только на реальных устройствах.

## Оценка готовности

- **Статус до автофикса:** 🟡 требует доработки (три Low). **После автофикса:** 🟢 готово к мержу по эмулированному прогону; перед релизом нужны проверки на реальных устройствах (см. раздел ниже)
- **Соответствие спеке:** 29 из 34 сценариев пройдено сразу, 3 провалено до автофикса (R7, R8, F23; после автофикса пройдены), 2 с замечаниями (R9, F22)
- **Найдено проблем:** Critical 0 / High 0 / Medium 0 / Low 5 (исправлено автофиксом 4, осталось 1)
- **Топ-3 риска перед мержем:**
  1. Звук в фоне и плашка «Нажмите, чтобы продолжить звонок» проверены только в эмуляции (Chromium разрешает автозапуск при активной камере/микрофоне, запрет эмулирован скриптом) — нужна проверка на iPhone и Android
  2. Push-уведомления проверены по приёмнику e2e-бэкенда, системные уведомления и `notificationclick` — только на устройстве
  3. Переключатель напоминаний при запрете уведомлений по-прежнему повторяет запрос и показывает тост, см. #4

## Покрытие сценариев

### Перепроверка итерации 1 и решений владельца

| # | Сценарий | Приоритет | Результат | Заметки |
|---|---|---|---|---|
| R1 | P1.14 / FR-009: голос собеседника через отдельный `<audio>` | P1 | ✅ pass | обе стороны `readyState 4`, `paused=false`, звук в потоке (пик 1.0), :32772 и :3150, [04](./2026-10-29-039-video-call-background-iter2/screenshots/04-tutor-call-peer-audio-playing.png), [05](./2026-10-29-039-video-call-background-iter2/screenshots/05-student-iphone-call-peer-audio-playing.png) |
| R2 | P1.8: перезагрузка страницы ученика в звонке | P1 | ✅ pass | звонок восстановлен за 0,47 с, звук у обоих, плашки нет (автозапуск разрешён), [06](./2026-10-29-039-video-call-background-iter2/screenshots/06-student-after-reload.png) |
| R3 | P1.13 / US2-AS4: «Нажмите, чтобы продолжить звонок», когда браузер запретил автозапуск звука | P1 | ✅ pass | эмуляция запрета: `play()` отклонён 3 раза, плашка одна; нажатие → плашка ушла за 0,1 с, `readyState 4`, `paused=false`, звук в потоке, [07](./2026-10-29-039-video-call-background-iter2/screenshots/07-student-after-reload-autoplay-blocked-overlay.png), [08](./2026-10-29-039-video-call-background-iter2/screenshots/08-student-after-continue-tap-audio-plays.png) |
| R4 | P1.7: вручную выключенные микрофон и камера после возврата | P1 | ✅ pass (решение владельца) | остаются выключенными; янтарная плашка вместо красного значка — по решению владельца (research.md R4), [19](./2026-10-29-039-video-call-background-iter2/screenshots/19-tutor-iphone-student-minimized-with-mic-off.png) |
| R5 | Решение по #4 итерации 1: iPhone Safari, кабинет ученика — одна инструкция установки | P2 | ✅ pass | старого баннера нет на расписании и в настройках; после «Скрыть» на карточке баннер вернулся, [09](./2026-10-29-039-video-call-background-iter2/screenshots/09-student-iphone-safari-one-install-hint.png), [10](./2026-10-29-039-video-call-background-iter2/screenshots/10-student-iphone-settings-one-install-hint.png), [11](./2026-10-29-039-video-call-background-iter2/screenshots/11-student-iphone-card-closed-old-banner-back.png) |
| R6 | Решение по #5 итерации 1: справка о запрете в карточке «Звонки» преподавателя | P2 | ✅ pass | видна при запрете; после разрешения и возврата на вкладку пропала, [03](./2026-10-29-039-video-call-background-iter2/screenshots/03-tutor-help-gone-after-allow-and-return.png) |
| R7 | Вкладка «Настройки → Уведомления» при запрете: одно объяснение | P2 | ❌ fail → ✅ после автофикса | до: два разных текста, см. #1, [01](./2026-10-29-039-video-call-background-iter2/screenshots/01-before-fix-tutor-settings-two-denied-explanations.png); после: одно, [12](./2026-10-29-039-video-call-background-iter2/screenshots/12-after-fix-tutor-settings-one-explanation-switch-locked.png) |
| R8 | Переключатель звонков преподавателя при запрете | P2 | ❌ fail → ✅ после автофикса | до: активен, каждый тап — тост, см. #2; после: заблокирован, тостов нет, после разрешения снова активен, [14](./2026-10-29-039-video-call-background-iter2/screenshots/14-after-fix-allowed-and-returned-switch-unlocked.png) |
| R9 | P3.1 / US6: картинка в картинке | P3 | ⚠️ warn | без изменений: в Chromium нет `autoPictureInPicture`, только устройство |

### Свежий проход

| # | Сценарий | Приоритет | Результат | Заметки |
|---|---|---|---|---|
| F1 | US1-AS1 / US2-AS2: ученик (iPhone) свернул → «Ученик свернул приложение» и «Микрофон ученика приостановлен — ученик свернул приложение» | P1 | ✅ pass | 64 и 71 мс, звонок не завершился, [15](./2026-10-29-039-video-call-background-iter2/screenshots/15-tutor-sees-iphone-student-minimized.png) |
| F2 | US1-AS3 / US2-AS5: возврат → подписи пропали, звук в обе стороны | P1 | ✅ pass | 24 мс, звук в потоке у обоих, [16](./2026-10-29-039-video-call-background-iter2/screenshots/16-tutor-after-student-returned.png) |
| F3 | US1-AS4: сервер оборвал сокет ученика → «Восстанавливаем связь…» у обоих, сам восстановился | P1 | ✅ pass | статус за 0,15 с, восстановление за 5,7 с, звук идёт, [17](./2026-10-29-039-video-call-background-iter2/screenshots/17-tutor-student-socket-dropped-reconnecting.png) |
| F4 | US1-AS2 / FR-032: преподаватель (iPhone) свернул → у ученика только нейтральные статусы | P1 | ✅ pass | «Восстанавливаем связь…», «Звук временно недоступен», слов «свернул» нет; у преподавателя на iPhone подсказка FR-012, [18](./2026-10-29-039-video-call-background-iter2/screenshots/18-student-sees-tutor-iphone-minimized-neutral.png) |
| F5 | US1-AS7 / FR-007: выключенные вручную микрофон и камера после возврата | P1 | ✅ pass | треки `enabled=false`, кнопки «Включить микрофон/камеру» |
| F6 | US2-AS1 / FR-033: ученик (Android) свернул | P1 | ✅ pass | только «Ученик свернул приложение», индикатора микрофона нет, звук ученика у преподавателя идёт; подсказки FR-012 на Android нет, [30](./2026-10-29-039-video-call-background-iter2/screenshots/30-tutor-sees-android-student-minimized-no-mic-indicator.png) |
| F7 | US1-AS5 / FR-005: не вернулся за 3 мин | P1 | ✅ pass | тост «Собеседник не вернулся в звонок» на 180,05 с; вернувшийся ученик видит «Звонок завершён»; в истории 24 с, конец — момент обрыва, [32](./2026-10-29-039-video-call-background-iter2/screenshots/32-tutor-waiting-student-lost.png), [33](./2026-10-29-039-video-call-background-iter2/screenshots/33-tutor-toast-peer-not-returned.png), [34](./2026-10-29-039-video-call-background-iter2/screenshots/34-student-returned-after-timeout-call-ended.png) |
| F8 | FR-008: ожидающая вкладка забирает звонок, когда держатель закрыт | P1 | ✅ pass | 0,37 с, звук идёт, [35](./2026-10-29-039-video-call-background-iter2/screenshots/35-student-second-tab-waiting.png), [36](./2026-10-29-039-video-call-background-iter2/screenshots/36-student-waiting-tab-took-over.png) |
| F9 | Edge: выход из аккаунта в другой вкладке во время звонка | Edge | ✅ pass | у преподавателя «Собеседник завершил звонок» за 0,56 с |
| F10 | Edge: звонок занятому адресату | Edge | ✅ pass | «Абонент занят», как в фиче 030; формулировка в spec.md исправлена, см. #5, [31](./2026-10-29-039-video-call-background-iter2/screenshots/31-student-calls-busy-tutor.png) |
| F11 | US3-AS1 / FR-019: ученик без открытого приложения, подписка есть | P1 | ✅ pass | push за 6 мс, `TTL 40`, `Urgency high`, `Topic` 32 символа, url `?call=<id>`; у звонящего «Вызываем…», [20](./2026-10-29-039-video-call-background-iter2/screenshots/20-tutor-calling-student-app-closed-push-sent.png) |
| F12 | US3-AS2/AS3: открытие по уведомлению во время вызова → «Принять» | P1 | ✅ pass | экран входящего за 0,47 с, `?call` убран из URL, звук у обоих, [21](./2026-10-29-039-video-call-background-iter2/screenshots/21-student-opened-from-push-incoming.png) |
| F13 | US3-AS8: ответ на одном устройстве → `call_closed` | P1 | ✅ pass | «Вызов завершён», тот же tag, `TTL 60` |
| F14 | US3-AS4 / FR-016: отмена → `missed_call` | P1 | ✅ pass | «Пропущенный звонок от Анна Сергеевна», `TTL 86400`, url `/student/cabinet/calls` |
| F15 | US3-AS5 / FR-017: открытие по устаревшему уведомлению | P1 | ✅ pass | «Звонок уже завершён», экрана входящего нет, [22](./2026-10-29-039-video-call-background-iter2/screenshots/22-student-stale-push-call-already-ended.png) |
| F16 | US3-AS7 / FR-018: приложение на экране → push нет; в фоне → экран входящего и push | P1 | ✅ pass | 0 push и 1 push, после отмены `missed_call` |
| F17 | US5-AS1: ученик звонит преподавателю с закрытым приложением | P2 | ✅ pass | push на оба устройства преподавателя, тело — имя ученика, url `/dashboard?call=<id>`; включение переключателя подписало устройство одним нажатием, [23](./2026-10-29-039-video-call-background-iter2/screenshots/23-tutor-turns-call-notifications-on.png), [24](./2026-10-29-039-video-call-background-iter2/screenshots/24-student-calls-tutor-app-closed-push.png) |
| F18 | US5-AS2: переключатель выключен | P2 | ✅ pass | «Преподаватель сейчас не в сети», push нет, подписка устройства удалена (напоминания тоже выключены), [25](./2026-10-29-039-video-call-background-iter2/screenshots/25-student-calls-tutor-call-notifications-off.png) |
| F19 | US4-AS1/AS2: Android, карточка → «Включить» | P2 | ✅ pass | карточка пропала, «Уведомления о звонках: включены», запись `WEB_PUSH` ученика в БД, [26](./2026-10-29-039-video-call-background-iter2/screenshots/26-student-android-invite-card.png), [27](./2026-10-29-039-video-call-background-iter2/screenshots/27-student-android-settings-on.png) |
| F20 | US4-AS3: ученик запретил уведомления | P2 | ✅ pass | справка в кабинете и в настройках, переключатель заблокирован, [28](./2026-10-29-039-video-call-background-iter2/screenshots/28-student-android-denied-cabinet.png), [29](./2026-10-29-039-video-call-background-iter2/screenshots/29-student-android-denied-settings-locked.png) |
| F21 | US4-AS6 / FR-024: выход ученика удаляет подписку устройства | P2 | ✅ pass | запись `push-sink/maria2` удалена |
| F22 | Переключатель напоминаний при запрете уведомлений (смежное, фича 008) | P2 | ⚠️ warn | тап повторяет запрос и даёт тост, см. #4, [13](./2026-10-29-039-video-call-background-iter2/screenshots/13-after-fix-reminders-switch-denied-still-toasts.png) |
| F23 | Нестабильный тест `signalRouting.model.test.ts` | — | ❌ fail → ✅ после автофикса | воспроизводится детерминированно, см. #3 |
| F24 | FR-025 (ключи VAPID пустые) | P2 | ✅ pass (итерация 1) | код не менялся, повторно не прогонялось |
| F25 | Звонки в открытом приложении (регресс 030): вызов, ответ, отмена, завершение | Smoke | ✅ pass | — |

Не покрыто в эмуляции (нужны реальные устройства, см. ниже): демонстрация экрана с телефона и сворачивание (US1-AS8), смена сети, ICE restart при обрыве медиа, «Микрофон занят другим приложением», системные уведомления и `notificationclick` service worker, звук в фоне на iPhone/Android, оба участника свёрнуты одновременно, отсутствие push при «занят» с адресатом в фоне.

## Артефакты прогона

- Аккаунты (в обоих стеках): преподаватель `tutor-mqa@qa.local`, ученики `ivan-mqa@qa.local`, `maria-mqa@qa.local`, пароль `QaPass!2026` (созданы в итерации 1, маркер `[mqa 2026-10-29]`).
- E2E-стек: перезапущен в начале итерации (`~/qa039/stack.sh`: dev-сервер фронта держал устаревший кэш ESLint с ошибкой `PermissionDeniedHelp not found in '@shared'`). Подписки-приёмники в БД `tutor_qa_039`: `push-sink/ivan1` (ученик), `push-sink/tutor1` (преподаватель); `tutorsink2` и `maria2` создавались и удалялись по ходу прогона.
- Эмуляция: камера — canvas, микрофон — WebAudio-осциллятор (подмена `getUserMedia` в init-скрипте), iPhone/Android — UA + `isMobile`, сворачивание — `document.visibilityState` + `visibilitychange`, обрыв — `POST /api/__test__/ws/students/<id>/drop` и `context.setOffline(true)`, запрет уведомлений — CDP `Browser.setPermission` с `browserContextId` (у ученика — подмена `Notification.permission`), разрешение — `context.grantPermissions`, push-подписка — подменённый `PushManager` с endpoint приёмника (как `frontend/e2e/helpers/sink-push-manager.ts`). Запрет автозапуска звука: Chromium разрешает автозапуск при активной камере и микрофоне (флаг `--autoplay-policy=document-user-activation-required` не помог), поэтому init-скрипт отклонял `play()` и снимал `autoplay` у незаглушённых элементов до первого `pointerdown` в документе.

---

## Находки

### 1. Во вкладке «Уведомления» преподавателя при запрете уведомлений два разных объяснения

- **Категория:** ⚠️ UX issue
- **Severity:** Low
- **Сценарий:** R7
- **Файл/место:** `frontend/src/features/notificationSettings/ui/ReminderSettings/ReminderSettings.tsx:73-78`
- **Однозначность исправления:** да

#### Шаги
1. Браузер преподавателя запретил уведомления.
2. Настройки → Уведомления.

#### Ожидание
Одно объяснение, как разрешить уведомления (общая справка `PermissionDeniedHelp`).

#### Реальность
В карточке «Напоминания об уроках» старое предупреждение «Уведомления заблокированы… iOS — Настройки → Safari → Уведомления…» (для установленного приложения шаг неверный), в карточке «Звонки» — новая справка с другими шагами.

#### Скриншоты
![](./2026-10-29-039-video-call-background-iter2/screenshots/01-before-fix-tutor-settings-two-denied-explanations.png)

#### Предлагаемое исправление
Убрать старое предупреждение из `ReminderSettings`, оставить одну справку в карточке «Звонки». Карточка «Звонки» скрыта только без поддержки push (тогда и `ReminderSettings` показывает «Ваш браузер не поддерживает push-уведомления») или без ключей VAPID (тогда напоминания на устройстве тоже не подписать).

---

### 2. Переключатель «Уведомления о входящих звонках» преподавателя активен при запрете, каждый тап — тост

- **Категория:** 🐛 Bug
- **Severity:** Low
- **Сценарий:** R8
- **Файл/место:** `frontend/src/entities/notifications/callNotificationsToggle.model.ts:18-27`, `frontend/src/features/notificationSettings/ui/CallNotificationSettings/CallNotificationSettings.tsx`
- **Однозначность исправления:** да

#### Шаги
1. Уведомления запрещены, справка в карточке «Звонки» видна.
2. Нажать на переключатель два раза.

#### Ожидание
Как у ученика (US4-AS3, `isSwitchLocked`): системный запрос не повторяется, переключатель заблокирован, справка объясняет, что делать.

#### Реальность
Каждый тап снова вызывает `Notification.requestPermission()` (браузер сразу отвечает `denied`) и показывает тост «Не удалось подписаться на уведомления»; переключатель остаётся выключенным и активным.

#### Скриншоты
![](./2026-10-29-039-video-call-background-iter2/screenshots/02-before-fix-tutor-denied-switch-toast.png)

#### Предлагаемое исправление
Пока `$isPushPermissionDenied`, модель не реагирует на `callNotificationsToggled`, а переключатель `disabled`.

---

### 3. Тест «should ask the server about a stale call_accepted instead of starting media» зависит от предыдущего файла

- **Категория:** 🐛 Bug (тесты)
- **Severity:** Low
- **Сценарий:** F23
- **Файл/место:** `frontend/src/features/videoCall/model/__tests__/signalRouting.model.test.ts:117-124`, `__tests__/callFlow.ts` (`resetCallFlow`)
- **Однозначность исправления:** да

#### Шаги
`VITEST_SEED=1 npx vitest run --project shared --maxWorkers=1 src/features/videoCall/model/__tests__/mediaRecovery.model.test.ts src/features/videoCall/model/__tests__/signalRouting.model.test.ts` — падает каждый раз.

#### Ожидание
Тест проходит в любом порядке файлов.

#### Реальность
`expected [] to deeply equal [ { type: 'call_sync' } ]`. Проект `shared` гоняет файлы на одном графе модулей, а модели звонка работают без scope. Тест `mediaRecovery` «should get the stopped tracks again when the page comes back» возвращает страницу на экран (`visibilityChanged(true)` → `call_sync` по обеим ролям) и не отвечает `call_state`, поэтому глобальный `$syncPendingRoles` остаётся `["tutor","student"]`. В следующем файле устаревший `call_accepted` уже не спрашивает сервер: `toStaleAcceptSync` видит, что ответ по роли ещё ждут. Распределение файлов по воркерам зависит от нагрузки, отсюда «падает только под нагрузкой».

#### Предлагаемое исправление
Хелпер `settleCallSync()` в `callFlow.ts`: страница на экране, по обеим ролям пришёл `call_state` с `call: null`. Вызывать в `resetCallFlow()` (уборка после каждого теста потока звонка) и в `beforeEach` файла `signalRouting`, чтобы его тесты не зависели от предшественников.

---

### 4. Переключатель «Включить напоминания» при запрете уведомлений повторяет запрос и показывает тост

- **Категория:** ⚠️ UX issue
- **Severity:** Low
- **Сценарий:** F22
- **Файл/место:** `frontend/src/entities/notifications/notificationsToggle.model.ts:149-161` (подписка по `remindersToggled`), `ReminderSettings.tsx`
- **Однозначность исправления:** нет

#### Шаги
1. Уведомления запрещены (после исправления #1 и #2).
2. Нажать «Включить напоминания».

#### Ожидание
Поведение как у переключателя звонков после исправления #2: без повторного запроса и тоста, справка ниже объясняет, как разрешить.

#### Реальность
Тост «Не удалось подписаться на уведомления» на каждый тап, переключатель остаётся активным. Это поведение фичи 008, не 039; после #2 два переключателя на одной вкладке ведут себя по-разному.

#### Скриншоты
![](./2026-10-29-039-video-call-background-iter2/screenshots/13-after-fix-reminders-switch-denied-still-toasts.png)

#### Предлагаемое исправление
Так же блокировать переключатель напоминаний при `$isPushPermissionDenied` и не запускать подписку из `remindersToggled`. Меняет поведение фичи 008 за пределами задачи 039 — решает владелец (можно отдельной задачей).

---

### 5. В spec.md занятость описана как «Собеседник занят», приложение показывает «Абонент занят»

- **Категория:** 💡 Improvement (документация)
- **Severity:** Low
- **Сценарий:** F10
- **Файл/место:** `specs/039-video-call-background/spec.md:155`
- **Однозначность исправления:** да

#### Реальность
Edge case говорит «как сейчас — звонящий видит «Собеседник занят»», а текст фичи 030 (`BUSY_TEXT` в `call.constants.ts`, specs/030) — «Абонент занят»; приложение показывает его ([31](./2026-10-29-039-video-call-background-iter2/screenshots/31-student-calls-busy-tutor.png)).

#### Предлагаемое исправление
Исправить цитату в spec.md на «Абонент занят» (поведение «как сейчас» верное).

---

## Замечено попутно (не фича 039, есть в main)

- Плашка «В другой вкладке или на другом устройстве идёт звонок…» (`app/components/SessionElsewhereBanner`, Snackbar `z-index 1400`) на телефоне перекрывает пункт «Выйти» в боковом меню кабинета ученика: нажатие попадает в плашку, выйти из аккаунта в этой вкладке нельзя, пока звонок идёт в другой. Кнопка «Использовать здесь» на синем фоне почти не читается. [37](./2026-10-29-039-video-call-background-iter2/screenshots/37-waiting-banner-covers-logout-in-menu.png). Текст для issue — в `qa2-result.json` (`issues_noticed`).

## Нужна проверка на реальных устройствах

Без изменений относительно итерации 1, с учётом того, что эмуляция подтвердила логику:

- iPhone (PWA с экрана «Домой», iOS 16.4+): свернуть на 1–2 мин в звонке → у преподавателя за ≤5 с «Ученик свернул приложение» и «Микрофон ученика приостановлен…»; после возврата звук и видео в обе стороны за ≤5 с; играет ли голос преподавателя в фоне (SC-003).
- iPhone: после возврата из фона и после выгрузки PWA — появляется ли «Нажмите, чтобы продолжить звонок» и возвращает ли одно нажатие и звук, и видео (в эмуляции запрет автозапуска смоделирован скриптом).
- Android Chrome: свернуть в звонке → звук в обе стороны не прерывается, плашки микрофона нет.
- Голос собеседника на компьютере в Chrome, Safari, Firefox, в том числе после перезагрузки страницы в звонке.
- Заблокировать экран на 4 мин → «Собеседник не вернулся в звонок» у ожидающего, «Звонок завершён» у вернувшегося.
- Сменить Wi‑Fi → мобильная в фоне → звонок восстановился без нового вызова (FR-008a).
- Системное уведомление о входящем на заблокированном экране iPhone и Android за ≤5 с; нажатие → экран входящего за ≤5 с; отмена → «Пропущенный звонок от …»; ответ на втором устройстве → уведомление убрано.
- Демонстрация экрана с телефона и сворачивание (US1-AS8); «Микрофон занят другим приложением» после звонка по телефону.
- PiP (US6): Android Chrome и iPhone PWA.
- Запрет уведомлений в настройках телефона → справка в «Звонках» и заблокированный переключатель; разрешить → вернуться в приложение → переключатель снова активен.

## Автофикс

**Исправлено:** 4 находки (#1, #2, #3, #5)
**Изменённые файлы:**
- frontend/src/features/notificationSettings/ui/ReminderSettings/ReminderSettings.tsx
- frontend/src/entities/notifications/callNotificationsToggle.model.ts
- frontend/src/features/notificationSettings/ui/CallNotificationSettings/CallNotificationSettings.tsx
- frontend/src/features/videoCall/model/__tests__/callFlow.ts
- specs/039-video-call-background/spec.md

**Добавленные и изменённые тесты:**
- frontend/src/pages/profile/__tests__/ProfilePage.test.tsx — «should explain denied notifications once on the notifications tab (regression)» (#1)
- frontend/src/features/notificationSettings/ui/ReminderSettings/__tests__/ReminderSettings.test.tsx — «should leave the denied notifications help to the calls card (regression)» вместо «should show permission denied alert» (#1)
- frontend/src/entities/notifications/__tests__/callNotificationsToggle.model.test.ts — «should leave the device and the setting as they are on a tap without a toast (regression)» (3 случая), «should subscribe in one tap again once the browser allows notifications» (#2)
- frontend/src/features/notificationSettings/ui/CallNotificationSettings/__tests__/CallNotificationSettings.test.tsx — «should lock the switch while the browser denies notifications (regression)», «should keep the switch usable when default/granted», в тесте отказа добавлена проверка блокировки (#2)
- frontend/src/features/videoCall/model/__tests__/signalRouting.model.test.ts — «should ask the server on both sockets when the page comes back on screen» (оставляет `call_sync` без ответа перед тестом stale `call_accepted`), `settleCallSync()` в `beforeEach` (#3)

### Исправлено
- #1 — из `ReminderSettings` убрано старое предупреждение с устаревшим шагом для iOS; во вкладке одна справка `PermissionDeniedHelp` в карточке «Звонки». Вживую на :3150: при запрете один текст ([12](./2026-10-29-039-video-call-background-iter2/screenshots/12-after-fix-tutor-settings-one-explanation-switch-locked.png)).
- #2 — `callNotificationsToggle.model`: `callNotificationsToggled` игнорируется при `$isPushPermissionDenied` (без запроса, без записи настройки, без тоста); `CallNotificationSettings`: переключатель `disabled` при запрете. Вживую: переключатель заблокирован, тостов нет; после разрешения и возврата на вкладку снова активен, справка исчезла ([14](./2026-10-29-039-video-call-background-iter2/screenshots/14-after-fix-allowed-and-returned-switch-unlocked.png)).
- #3 — `settleCallSync()` в `callFlow.ts`, вызывается в `resetCallFlow()` и в `beforeEach` `signalRouting`. Проверено: сочетание `mediaRecovery` + `signalRouting` с `VITEST_SEED=1` падало до правки и проходит после; без `settleCallSync` новый тест в самом файле роняет тест stale `call_accepted` (регрессия ловится внутри файла, без зависимости от порядка файлов).
- #5 — цитата в spec.md исправлена на «Абонент занят».

### Проверка на пересобранном QA-стеке
http://localhost:32773 (prod-сборка с исправлениями): при запрете во вкладке «Уведомления» одна справка, переключатель звонков заблокирован, тап не даёт тоста; после разрешения и возврата на вкладку справка пропала, переключатель активен ([38](./2026-10-29-039-video-call-background-iter2/screenshots/38-rebuilt-stack-tutor-denied-one-help-locked.png)). Звонок преподаватель ↔ ученик (iPhone): `readyState 4` и звук в потоке у обоих. Запрет здесь эмулирован подменой `Notification.permission`: CDP `Browser.setPermission` на этом контексте не применялся.

### Проверки
`npm run check -- --full --backend-tests npm` из корня worktree: tsc, eslint, prettier фронта и бэка, полные vitest (306 файлов, 3345 тестов, seed 1793282833263) и jest (129 наборов, 1467 тестов) — все 8 проверок зелёные за 200 с (первый прогон нашёл форматирование Prettier в `CallNotificationSettings.test.tsx`, исправлено `prettier --write`). `cd frontend && npm run find-cycle` — циклов нет.

### Не исправлено автофиксом (нужен ручной разбор)
- #4 — однозначность «нет»: меняет поведение переключателя напоминаний фичи 008, решает владелец.

После ревью diff'а: commit отдельным коммитом с префиксом `fix(qa): ...`.
