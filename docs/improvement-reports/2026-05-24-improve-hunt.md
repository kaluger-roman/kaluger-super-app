# Improvement Hunt Report — 2026-05-24

**Всего предложений:** 10
**По impact:** High 10 / Medium 0 / Low 0
**По effort:** S 10 / M 0 / L 0
**Покрытые области:** UX, Design, Security, Performance (backend + frontend), a11y, DX, Maintainability

## Резюме

Основные направления улучшений — три кластера: (1) **критичная безопасность и observability** — rate-limiter за nginx работает по `127.0.0.1` для всех клиентов из-за отсутствия `app.set("trust proxy")`, а `validateRequiredEnv` пропускает половину обязательных env (RESEND_API_KEY, VAPID_* и пр.), что приводит к мнимо успешному старту с поломанными email/push в продакшне; (2) **a11y-провалы** в часто-используемых элементах: меню пользователя в хедере, заголовки годов/месяцев в списке уроков и быстрые действия на дашборде — все они `<div onClick>` без `role`/`tabIndex`/`onKeyDown`, недоступны с клавиатуры; (3) **перерендеры и трафик БД** — `LessonCard` без `memo` перерисовывает 50+ карточек на каждое WS-событие, `lessonStatusUpdater` (крон каждую минуту) тянет полные строки уроков с описаниями/конспектами вместо `select { id, tutorId }`. Все 10 — Quick Wins (High Impact + Small Effort).

Топ-3 быстрых побед: (1) `trust proxy` за nginx, (2) расширение `validateRequiredEnv`, (3) `LessonCard` в `memo`.

## Quick Wins (High Impact + Small Effort)

1. [Rate-limiter работает по `127.0.0.1` — отсутствует `trust proxy`](#1-rate-limiter-работает-по-127001--отсутствует-trust-proxy)
2. [`validateRequiredEnv` пропускает критичные email/push переменные](#2-validaterequiredenv-пропускает-критичные-emailpush-переменные)
3. [`LessonsYear/MonthBox/QuickActions` — `<div onClick>` без клавиатурной поддержки](#3-lessonsyearmonthboxquickactions--div-onclick-без-клавиатурной-поддержки)
4. [`UserAvatar` в хедере — кликабельный `Box` без `role`/`tabIndex`/`aria-label`](#4-useravatar-в-хедере--кликабельный-box-без-roletabindexaria-label)
5. [`LessonCard` не обёрнут в `memo` — 50+ ре-рендеров на каждое WS-событие](#5-lessoncard-не-обёрнут-в-memo--50-ре-рендеров-на-каждое-ws-событие)
6. [`lessonStatusUpdater`: два `findMany` без `select` — крон каждую минуту тянет лишние колонки](#6-lessonstatusupdater-два-findmany-без-select--крон-каждую-минуту-тянет-лишние-колонки)
7. [Дубликат `extractAxiosError` / `extractAxiosErrorMessage` в `shared/lib`](#7-дубликат-extractaxioserror--extractaxioserrormessage-в-sharedlib)
8. [`InvitationManager`: нет toast после выдачи/отзыва приглашения](#8-invitationmanager-нет-toast-после-выдачиотзыва-приглашения)
9. [Фиолетово-синий градиент заголовков года/месяца — вне зелёной темы приложения](#9-фиолетово-синий-градиент-заголовков-годамесяца--вне-зелёной-темы-приложения)
10. [`runBackupJob` — нет `catch`: причина сбоя бэкапа не попадает в лог с деталями](#10-runbackupjob--нет-catch-причина-сбоя-бэкапа-не-попадает-в-лог-с-деталями)

---

## 1. Rate-limiter работает по `127.0.0.1` — отсутствует `trust proxy`

- **Impact:** High
- **Effort:** S (≤2 ч)
- **Категория:** Security
- **Файл/место:** `backend/src/index.ts:33-45`

### Текущее поведение

Приложение развёрнуто за nginx (reverse proxy), но Express **не настроен** доверять `X-Forwarded-For`. `express-rate-limit` по умолчанию использует `req.ip` как ключ счётчика — для всех клиентов он равен `127.0.0.1` (адрес nginx). Это значит: все запросы от всех пользователей считаются как один источник, и лимиты на `/api/auth/login`, `/api/auth/forgot-password`, `/api/admin/login`, `/api/student-auth/login`, `/api/student-registration` фактически не работают: один реальный атакующий быстро исчерпывает общий счётчик, делая login/forgot-password недоступными для всех остальных, либо при достаточно большом лимите — наоборот, никогда не достигает порога.

```ts
const app = express();

// app.set("trust proxy", ...);  // ← ОТСУТСТВУЕТ

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(morgan("combined"));
```

### Предлагаемое улучшение

```ts
const app = express();

// nginx — единственный hop перед приложением; доверяем первому X-Forwarded-For.
app.set("trust proxy", 1);

app.use(helmet());
// ...
```

### Почему это важно

OWASP A07:2021 — Identification and Authentication Failures. Без этой однострочной правки **все** rate-limiter'ы на чувствительных эндпоинтах не защищают от brute-force ни login, ни password reset, ни admin login. На single-instance VPS это единственный заслон против credential stuffing. Дополнительно — `req.ip` в логах сейчас не различает клиентов, что делает невозможным форензику инцидентов.

### Это улучшение, не фича

Rate-limiter'ы уже зарегистрированы и работают — нужно лишь восстановить заданную защиту за счёт корректной настройки `trust proxy`.

---

## 2. `validateRequiredEnv` пропускает критичные email/push переменные

- **Impact:** High
- **Effort:** S
- **Категория:** Maintainability / Observability
- **Файл/место:** `backend/src/utils/validateEnv.ts:1-6`

### Текущее поведение

```ts
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "ADMIN_JWT_SECRET",
  "STUDENT_JWT_SECRET",
] as const;
```

При старте без `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` сервер запускается **без ошибки**. CI/CD health-check проходит. В `services/email.ts` затем используется `process.env.EMAIL_FROM || ""`, и Resend молча отклоняет письмо с пустым `from`. Ошибка обнаруживается только при первой реальной регистрации / forgot-password / push-подписке — то есть в продакшне, а не на CI/staging.

### Предлагаемое улучшение

```ts
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "ADMIN_JWT_SECRET",
  "STUDENT_JWT_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "FRONTEND_URL",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
] as const;
```

### Почему это важно

При деплое на новый VPS или случайной потере секрета в `.env` отсутствие fail-fast приводит к «mysterious 500-ам» при регистрации в продакшне вместо явного отказа стартовать. Стоимость одной строки в массиве — гарантия, что весь канал email/push нерабочих конфигураций отрезается на CI.

### Это улучшение, не фича

Email и push уже работают; добавляется только проверка существующей обязательной конфигурации на старте.

---

## 3. `LessonsYear/MonthBox/QuickActions` — `<div onClick>` без клавиатурной поддержки

- **Impact:** High
- **Effort:** S
- **Категория:** a11y
- **Файл/место:**
  - `frontend/src/features/lessons/ui/LessonsList/components/LessonsYear.tsx:40` — `<Styled.YearBox onClick={onToggleYear}>`
  - `frontend/src/features/lessons/ui/LessonsList/components/LessonsMonth/LessonsMonth.tsx:32` — `<Styled.MonthBox onClick={onToggle}>`
  - `frontend/src/pages/dashboard/components/QuickActions/QuickActions.tsx:21,27,36,45` — четыре `<Styled.ActionCard onClick=…>` на дашборде

### Текущее поведение

`YearBox` и `MonthBox` — это `styled(Box)` с `onClick`, но без `role`, `tabIndex`, `onKeyDown`, `aria-expanded`. Карточки QuickActions — `Card` с `onClick` (вместо `CardActionArea`). С клавиатуры до них не добраться (`Tab` пропускает), screen reader видит их как просто `div`.

```tsx
// LessonsYear.tsx:40
<Styled.YearBox onClick={onToggleYear}>
  <Styled.YearText variant="h5">{year}</Styled.YearText>
  {isCollapsed ? <Styled.WhiteExpandMore /> : <Styled.WhiteExpandLess />}
</Styled.YearBox>
```

### Предлагаемое улучшение

Для `YearBox`/`MonthBox`:

```tsx
<Styled.YearBox
  onClick={onToggleYear}
  role="button"
  tabIndex={0}
  aria-expanded={!isCollapsed}
  aria-label={`${year}, ${isCollapsed ? "раскрыть" : "свернуть"}`}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggleYear();
    }
  }}
>
```

Для `QuickActions` — заменить `Card` на `CardActionArea` внутри `Card` (нативный `<button>` под капотом с правильной фокусировкой):

```tsx
<Card>
  <CardActionArea onClick={() => navigate("/lessons")}>
    {/* содержимое */}
  </CardActionArea>
</Card>
```

### Почему это важно

WCAG 2.1 SC 2.1.1 (Keyboard) и 4.1.2 (Name, Role, Value). Группировка по годам/месяцам в списке уроков и быстрые действия — основные точки взаимодействия на главной и страничке уроков. Для клавиатурных пользователей и screen reader они сейчас полностью неюзабельны: сворачивать/раскрывать группы нечем, дашборд бесполезен.

### Это улучшение, не фича

Логика toggle и navigate уже есть — нужны только семантика и keyboard-обработчики; никакая функциональность не добавляется.

---

## 4. `UserAvatar` в хедере — кликабельный `Box` без `role`/`tabIndex`/`aria-label`

- **Impact:** High
- **Effort:** S
- **Категория:** a11y
- **Файл/место:** `frontend/src/app/components/UserAvatar/UserAvatar.tsx:14-29`

### Текущее поведение

```tsx
export const UserAvatar: FC<UserAvatarProps> = ({ user, isMobile, onClick }) => {
  return (
    <Styled.Container onClick={onClick}>
      <Styled.AvatarBox>{/* инициалы */}</Styled.AvatarBox>
      {!isMobile && <Styled.UserName variant="body1">{user.name}</Styled.UserName>}
    </Styled.Container>
  );
};
```

`Styled.Container` — `styled(Box)` без какой-либо семантики. Аватар — **единственная** точка входа в меню профиля и кнопку «Выйти». С клавиатуры до неё не добраться: `Tab` пропускает, screen reader не объявляет ни как кнопку, ни с именем пользователя.

### Предлагаемое улучшение

```tsx
<Styled.Container
  onClick={onClick}
  role="button"
  tabIndex={0}
  aria-label={`Меню пользователя ${user.name}`}
  aria-haspopup="menu"
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(e as unknown as React.MouseEvent<HTMLElement>);
    }
  }}
>
```

### Почему это важно

WCAG 2.1 SC 2.1.1 и 4.1.2. Невозможность выйти из аккаунта с клавиатуры — критическая блокировка для пользователей assistive tech. Это **единственный** способ открыть меню профиля, поэтому без клавиатурной доступности фактически блокируется управление аккаунтом.

### Это улучшение, не фича

`onClick` уже передаётся из `AppContent` и открывает меню — нужны только `role`, `tabIndex`, `aria-label` и keyboard-обработчик.

---

## 5. `LessonCard` не обёрнут в `memo` — 50+ ре-рендеров на каждое WS-событие

- **Impact:** High
- **Effort:** S
- **Категория:** Performance — Frontend
- **Файл/место:** `frontend/src/features/lessons/ui/LessonsList/components/LessonCard/LessonCard.tsx:26`

### Текущее поведение

```tsx
export const LessonCard: FC<LessonCardProps> = ({ lesson, onCardClick, onMenuClick }) => {
  return (
    <Styled.StyledCard
      variant="outlined"
      onClick={onCardClick ? () => onCardClick(lesson) : undefined}
    >
      {/* ... */}
      {onMenuClick && (
        <IconButton size="small" aria-label="Меню урока" onClick={(e) => onMenuClick(e, lesson)}>
          <MoreVertIcon />
        </IconButton>
      )}
```

Компонент не обёрнут в `memo`. При любом WS-обновлении (изменение статуса/оплаты одного урока) обновляется `$upcomingLessons` → `LessonsList` ре-рендерится → каждый `LessonCard` в текущем периоде перерисовывается, хотя его собственный `lesson` не изменился. Для репетитора с 30–50 уроками в месяце это 30–50 лишних рендеров на каждое WS-событие.

### Предлагаемое улучшение

```tsx
import { memo } from "react";

export const LessonCard = memo<LessonCardProps>(
  ({ lesson, onCardClick, onMenuClick }) => {
    // тело без изменений
  }
);
LessonCard.displayName = "LessonCard";
```

Параллельно — стабилизировать `onCardClick`/`onMenuClick` в родителе через `useCallback` (иначе `memo` бесполезен). При отрисовке списков `LessonsYear`/`LessonsMonth` подобный паттерн уже описан в коде с инлайн-стрелками.

### Почему это важно

Лента уроков — самый частый WS-получатель. Сейчас обновление одного урока влечёт O(n) перерисовок, где n — число карточек в видимой области. На мобильных устройствах с 30+ уроков это заметная задержка отклика интерфейса при изменении статуса.

### Это улучшение, не фича

Поведение и внешний вид компонента идентичны — устраняются только избыточные React-рендеры.

---

## 6. `lessonStatusUpdater`: два `findMany` без `select` — крон каждую минуту тянет лишние колонки

- **Impact:** High
- **Effort:** S
- **Категория:** Performance — Backend
- **Файл/место:** `backend/src/services/lessonStatusUpdater.ts:24-44`

### Текущее поведение

```ts
const lessonsToStart = await prisma.lesson.findMany({
  where: { status: { in: ["SCHEDULED", "RESCHEDULED"] }, startTime: { lte: now }, endTime: { gt: now } },
}); // ← все колонки

const lessonsToComplete = await prisma.lesson.findMany({
  where: { status: { in: ["IN_PROGRESS", "SCHEDULED", "RESCHEDULED"] }, endTime: { lte: now } },
}); // ← все колонки
```

Из результата используются только `l.id` (для последующего `updateMany`). Но Prisma тянет ВСЕ ~15 колонок строки `Lesson`, включая потенциально большие `description`, `homework`, `notes`. Крон запускается **раз в минуту** (1440 раз в сутки). При наличии исторических уроков с подробными конспектами и активной педагогической нагрузке — это десятки–сотни KB лишнего трафика на каждый тик.

### Предлагаемое улучшение

```ts
const lessonsToStart = await prisma.lesson.findMany({
  where: { status: { in: ["SCHEDULED", "RESCHEDULED"] }, startTime: { lte: now }, endTime: { gt: now } },
  select: { id: true },
});

const lessonsToComplete = await prisma.lesson.findMany({
  where: { status: { in: ["IN_PROGRESS", "SCHEDULED", "RESCHEDULED"] }, endTime: { lte: now } },
  select: { id: true },
});
```

Re-query на строках 76-89 уже использует `select: { id: true, tutorId: true }` — здесь нужен только `id`.

### Почему это важно

Этот крон — горячий путь (каждую минуту). Сокращение payload в десятки раз снимает нагрузку с сетевого канала между приложением и Postgres, уменьшает GC-давление на Node, сокращает время выполнения тика. На фоне ещё одного крона (`reminderProcessor` — каждую минуту) и периодических `recurringLessons` — заметное снижение overhead.

### Это улучшение, не фича

Никакая функциональность не меняется — те же уроки переходят в `IN_PROGRESS`/`COMPLETED`, просто Prisma запрашивает у БД меньше колонок.

---

## 7. Дубликат `extractAxiosError` / `extractAxiosErrorMessage` в `shared/lib`

- **Impact:** High
- **Effort:** S
- **Категория:** DX / Maintainability
- **Файл/место:**
  - `frontend/src/shared/lib/error.helpers.ts:9` — `extractAxiosError`
  - `frontend/src/shared/lib/axios-error.helpers.ts:6` — `extractAxiosErrorMessage`
  - `frontend/src/shared/lib/index.ts:28,42` — оба реэкспортируются

### Текущее поведение

В `shared/lib` существуют **две** утилиты с почти одинаковым контрактом, но разной семантикой:

```ts
// error.helpers.ts — fallback по умолчанию, читает response.data.error || message || fallback
export const extractAxiosError = (err: unknown, fallback = "Произошла ошибка. Попробуйте позже"): string => {
  const axiosError = err as AxiosError<ApiErrorBody>;
  return axiosError?.response?.data?.error || axiosError?.message || fallback;
};

// axios-error.helpers.ts — обязательный fallback, НАМЕРЕННО игнорирует message
export const extractAxiosErrorMessage = (error: unknown, fallback: string): string => {
  const e = error as AxiosLikeError;
  return e?.response?.data?.error || fallback;
};
```

Половина моделей (auth, students, lessons, taxPeriods, changeEmail) использует `extractAxiosError`, другая половина (resetPassword, forgotPassword, studentAuth, tutorStudentInvitation) — `extractAxiosErrorMessage`. Поведение расходится в обработке network/timeout-ошибок (без `response`): первая возвращает английский `error.message` (например `"Network Error"`), вторая — fallback. Для пользователя это значит разный UX при оффлайне в разных частях приложения.

### Предлагаемое улучшение

Оставить одну каноническую утилиту с явным контрактом:

```ts
// error.helpers.ts — выбрать стратегию (скорее всего "только response.data.error",
// потому что error.message обычно непереводимый английский от axios)
export const extractAxiosError = (err: unknown, fallback: string): string => {
  const axiosError = err as AxiosError<{ error?: string }>;
  return axiosError?.response?.data?.error || fallback;
};
```

Удалить `axios-error.helpers.ts`/`axios-error.types.ts`, обновить 4 потребителя на единый импорт и сделать `fallback` обязательным.

### Почему это важно

Скрытое расхождение поведения в идентично-выглядящих утилитах. Новый разработчик не понимает, какую выбрать, и копирует наугад — расхождение усугубляется. При изменении формата ошибки на бэке нужно править два места. В прошлом отчёте (2026-05-09) уже фиксировался дубликат `AxiosLike` в 6 локальных копиях — он сконсолидирован, но в `shared/lib` тут же завелись две параллельные версии.

### Это улучшение, не фича

Никакой функциональности не убавляется — устраняется дубликат и фиксируется единое поведение.

---

## 8. `InvitationManager`: нет toast после выдачи/отзыва приглашения

- **Impact:** High
- **Effort:** S
- **Категория:** UX
- **Файл/место:** `frontend/src/features/tutorStudentInvitation/model/tutor-student-invitation.model.ts:79-103`

### Текущее поведение

В модели есть `sample` для ошибок (`failData` → `$error`), но **нет** `sample` для успехов:

```ts
sample({ clock: issueInvitationFx.doneData, fn: ({ inviteUrl }) => inviteUrl, target: $ephemeralInviteUrl });
sample({ clock: issueInvitationFx.done, source: $studentId, ..., target: loadStatusFx });
sample({ clock: revokeInvitationFx.done, source: $studentId, ..., target: loadStatusFx });
// ← НЕТ: notificationsModel.showSuccessEvent
```

Аналогичные модели (`lessons-notifications.model.ts`, `studentsFeedback.model.ts`) показывают success-toast'ы. Здесь паттерн пропущен. На медленном соединении репетитор не понимает, отработал ли отзыв приглашения, — может нажать кнопку повторно или закрыть карточку, думая что ничего не произошло.

### Предлагаемое улучшение

```ts
import { notificationsModel } from "@shared";

sample({
  clock: issueInvitationFx.done,
  fn: () => "Приглашение создано",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: revokeInvitationFx.done,
  fn: () => "Приглашение отозвано",
  target: notificationsModel.showSuccessEvent,
});
```

### Почему это важно

Симметрия фидбэка: ошибки показываются, успех — нет. Особенно критично для **отзыва** приглашения — это деструктивное действие, и пользователь должен видеть подтверждение. Toast-инфраструктура (`notificationsModel`) уже работает и применена в соседних моделях.

### Это улучшение, не фича

Действия уже срабатывают (URL появляется/пропадает) — добавляется только видимое подтверждение через уже существующий механизм toast'ов.

---

## 9. Фиолетово-синий градиент заголовков года/месяца — вне зелёной темы приложения

- **Impact:** High
- **Effort:** S
- **Категория:** Design
- **Файл/место:**
  - `frontend/src/features/lessons/ui/LessonsList/components/LessonsYear.styled.ts:12` — `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
  - `frontend/src/features/lessons/ui/LessonsList/components/LessonsMonth/LessonsMonth.styled.ts:10,17` — `#42a5f5 → #7e57c2` (и `#1976d2 → #512da8` на hover)
  - `frontend/src/app/components/AppHeader/AppHeader.styled.ts:35` — `drop-shadow(0 2px 4px #764ba2aa)` (тот же фиолет)

### Текущее поведение

```ts
// LessonsYear.styled.ts:12
background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

// LessonsMonth.styled.ts:10,17
background: "linear-gradient(135deg, #42a5f5 0%, #7e57c2 100%)",
"&:hover": { background: "linear-gradient(135deg, #1976d2 0%, #512da8 100%)" },
```

Цвета `#667eea`, `#764ba2`, `#7e57c2` — индиго/фиолетовая палитра, **ни разу не встречающаяся** в `palette.ts` приложения. Зелёная тема (`primary.main: #2E7D47`) применяется только в `MuiAppBar`/`MuiFab` через theme-override (`linear-gradient(135deg, #2E7D47 0%, #4CAF50 100%)`), а самые крупные визуальные элементы страницы уроков — заголовки группировки — выглядят как кусок другого продукта.

### Предлагаемое улучшение

```ts
// LessonsYear.styled.ts
background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,

// LessonsMonth.styled.ts
background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
"&:hover": {
  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
},

// AppHeader.styled.ts
filter: `drop-shadow(0 2px 4px ${alpha(theme.palette.primary.dark, 0.67)})`,
```

### Почему это важно

Визуальная идентичность ломается на самой посещаемой странице (список уроков). При появлении тёмной темы или ребрендинге palette — заголовки останутся в индиго и потребуют точечной правки. Уже существующий theme-override для `AppBar` показывает, что pattern «зелёный градиент» — канонический.

### Это улучшение, не фича

Группировка по году/месяцу работает идентично — меняется только источник цвета на тематический.

---

## 10. `runBackupJob` — нет `catch`: причина сбоя бэкапа не попадает в лог с деталями

- **Impact:** High
- **Effort:** S
- **Категория:** Maintainability / Observability
- **Файл/место:** `backend/src/services/backup.ts:193-241`

### Текущее поведение

```ts
export const runBackupJob = async (): Promise<void> => {
  if (backupRunning) { /* skip */ return; }
  backupRunning = true;
  try {
    // ... pg_dump, prisma.backupSettings.update, cleanupOldBackups
  } finally {
    backupRunning = false;
  }
};
```

Нет `catch`. Если `performBackup()` упадёт (диск заполнен, `pg_dump` недоступен, неверные креды) — исключение «пробулькивает» через `finally` и ловится в `index.ts:166` обобщённым `console.error("Error in database backup cron job:", error)`. Это logger-вызов без `error.stack`, без типа ошибки, без указания фазы (creating dump / writing update / cleanup). Оператор VPS видит в pm2-логах только «Error in database backup cron job: [object Object]» без возможности диагностики.

### Предлагаемое улучшение

```ts
export const runBackupJob = async (): Promise<void> => {
  if (backupRunning) { return; }
  backupRunning = true;
  try {
    // ... тело
  } catch (error) {
    console.error("Backup job failed:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name,
    });
    throw error; // re-throw, чтобы cron-wrapper в index.ts тоже залогировал
  } finally {
    backupRunning = false;
  }
};
```

### Почему это важно

Бэкап — единственный механизм восстановления данных на single-instance VPS. Молчаливый сбой бэкапа (особенно после успешного старта когда `lastBackupAt` уже выставлен) приводит к иллюзии работающего бэкапа, пока он на самом деле не выполняется. Без структурированного лога с stack trace оператор не может за минуты понять, чинить ему `pg_dump` PATH, права на каталог или Postgres-конфигурацию.

### Это улучшение, не фича

Бэкап продолжает работать — добавляется только информативный лог при сбое (минимум: `message + stack + name`), что критически ускоряет диагностику инцидента.
