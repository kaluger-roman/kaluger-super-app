# E2E Tests

Playwright + Chromium. Папка является `testDir` в `frontend/playwright.config.ts`.

> Полные правила и обоснования — в `docs/conventions/e2e-testing.md`. Этот README — короткая шпаргалка для повседневной работы.

## Запуск

```bash
# Все функциональные тесты (без drafts и visual)
npm run test:e2e -- --grep-invert "@draft|@visual"

# Только критичные smoke
npm run test:e2e -- --grep "@critical"

# Конкретная область
npm run test:e2e -- --grep "@auth"

# Visual regression (отдельная стратегия — см. ниже)
npm run test:e2e -- --grep "@visual"

# UI-режим
npm run test:e2e:ui
```

## Структура папки

```
frontend/e2e/
├─ auth/           # логин, регистрация, восстановление пароля, email verification
├─ students/       # CRUD учеников
├─ lessons/        # уроки, расписание, recurring, статусы, оплата
├─ profile/        # профиль, налоговые периоды, финансы
├─ reports/        # отчёты и фильтры
├─ admin/          # админ-функции
├─ dashboard/      # стартовый экран
├─ news/           # лента новостей
├─ pwa/            # push-напоминания, offline, real-time
├─ visual/         # скриншот-регрессии (@visual)
├─ fixtures/       # тестовые данные, авторизованные контексты
├─ pages/          # Page Objects (по необходимости)
└─ README.md
```

Каждая папка области = один тег (например `auth/` ↔ `@auth`).

## Тэг-схема

Каждый `test.describe` обязан иметь **минимум один area-тег** (`@auth`, `@students`, …) и **минимум один level-тег** (`@critical`, `@regression`, `@visual` или `@draft`).

| Тег | Когда применять |
|---|---|
| `@critical` | Если сценарий сломается — учитель не сможет работать или потеряет деньги. Прогон в каждом PR. |
| `@regression` | Покрывает важный, но не критичный flow. Прогон в полном CI или ночью. |
| `@visual` | Скриншот-регрессии. Только сравнение экранов, без функциональных assertions. |
| `@draft` | Черновик от `/e2e-check` — исключается из обычных прогонов. После доработки тег убирается. |
| `@auth` / `@students` / `@lessons` / `@profile` / `@reports` / `@admin` / `@dashboard` / `@news` / `@pwa` | Область приложения. |

Пример:

```ts
import { test, expect } from "@playwright/test";

test.describe("Создание ученика", { tag: ["@critical", "@students"] }, () => {
  test("учитель создаёт ученика и видит его в списке", async ({ page }) => {
    // ...
  });
});
```

## Имена

- `test.describe` — **на русском**, совпадает с пользовательским взглядом на journey: «Создание ученика», «Восстановление пароля», «Recurring-урок генерируется автоматически».
- `test('...')` — **на русском**, в форме «учитель делает X и видит Y». Не «should», не «test_».
- Файл — kebab-case, без префиксов: `create-student.spec.ts`, `forgot-password.spec.ts`.

## Селекторы

Приоритет (сверху вниз — предпочтительнее):

1. `getByRole('button', { name: 'Сохранить' })` — semantic
2. `getByLabel('Email')` — для форм
3. `getByText('Ученик создан')` — для подтверждений/ошибок
4. `getByPlaceholder('Введите email')` — fallback для inputs без лейбла
5. `data-testid="student-row"` — **только если выше ничего не подходит** (например, нет уникального текста, есть только id из БД)

**Никогда:** CSS-селекторы по классам (`.MuiButton-root`), nth-child, XPath. Это не e2e-тест, а ловушка для рефакторинга.

## Два режима тестов

### Functional (по умолчанию)

Имитируют user journey с assertion'ами о наблюдаемом состоянии: «после клика появился toast `Сохранено`», «после логина URL становится `/dashboard`», «в списке появилась карточка с именем ученика».

```ts
test("учитель создаёт ученика", async ({ page }) => {
  await page.goto("/students");
  await page.getByRole("button", { name: "Добавить ученика" }).click();
  await page.getByLabel("Имя").fill("Иван Петров");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Иван Петров")).toBeVisible();
});
```

### Visual (`@visual`)

Только `expect(page).toHaveScreenshot()`. Никаких функциональных проверок. Лежат в `visual/` отдельно от функциональных, чтобы не смешивать стратегии.

```ts
test.describe("Дашборд", { tag: ["@visual", "@dashboard"] }, () => {
  test("первичный вид дашборда", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveScreenshot("dashboard.png");
  });
});
```

## Page Objects

Использовать **только если** один и тот же экран встречается в 3+ тестах. Преждевременная абстракция — главный источник flaky-тестов и неподдерживаемой иерархии. Пока тестов мало — пишем плоско.

Когда становится нужен — кладём в `pages/<Area>Page.ts` с named export классом или функцией-конструктором (`createStudentsPage(page)`).

## Тестовые данные

- Стартовое состояние БД — через API (login + REST), не через UI. UI — только для journey, который тестируем.
- Изоляция: каждый тест либо создаёт уникальные данные (`student-${Date.now()}`), либо использует фикстуру с очисткой.
- Авторизованный контекст — через `storageState` (см. `fixtures/`).

## Что НЕ покрывать e2e

- Валидации формы (`email` без `@`, пароль короче 8) — это unit/component-тесты.
- Расчёты (форматирование суммы, периоды дат) — utils unit.
- Точные тексты ошибок API — backend unit.
- Все варианты сортировки/фильтров — один пример достаточно.
- Тултипы, hover-состояния, скелетоны.

Эвристика: «Если это можно проверить без браузера — проверяй без браузера». E2e дорогой, его удел — интеграция всех слоёв на критичных пользовательских путях.

## Связанные команды

- `/e2e-check` — перед PR анализирует diff и подсказывает, какие изменения остались без покрытия. Создаёт `*.draft.spec.ts` черновики.
- `/e2e-hunt` — раз в спринт инвентаризует journeys по областям и формирует приоритетный список пробелов в `docs/e2e-coverage/`.
