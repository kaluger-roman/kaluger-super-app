# Implementation Plan: Лендинг-страница репетитора

**Branch**: `022-tutor-landing` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-tutor-landing/spec.md`

## Summary

Статический лендинг репетитора на Next.js + Tailwind CSS, интегрированный в существующий монорепо как третий независимый проект (`landing/`). Данные репетитора хранятся в JSON-файлах, страница генерируется статически (SSG) и хостится на поддомене через Nginx.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20
**Primary Dependencies**: Next.js 15, Tailwind CSS 4, React 19
**Storage**: JSON-файлы в проекте (без БД)
**Testing**: Vitest (единообразие с frontend)
**Target Platform**: Web (статический сайт, все браузеры)
**Project Type**: Web (третий проект в монорепо)
**Performance Goals**: Lighthouse Performance >= 90, TTI < 3s на 4G
**Constraints**: SSG-only, без серверных API, без JS-рантайма на клиенте где возможно
**Scale/Scope**: Одна страница, один репетитор

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Status | Notes |
|-----------|----------|--------|-------|
| I. Feature-Sliced Design | No | N/A | Лендинг — отдельный проект, не часть React SPA. FSD избыточен для одностраничного сайта |
| II. Layered MVC | No | N/A | Нет бэкенда для лендинга |
| III. Effector | No | N/A | Нет клиентского состояния — статическая страница |
| IV. Type Safety | Yes | PASS | TypeScript strict, `type` not `interface`, `import type` |
| V. Code Consistency | Yes | PASS | Named exports, function expressions, `index.ts` re-exports, UI текст на русском |
| VI. Testing Discipline | Partial | PASS | Vitest для компонентов, без бэкенд-тестов |
| VII. Simplicity | Yes | PASS | Минимум зависимостей, без абстракций |
| Tech Stack | Violation | JUSTIFIED | Next.js + Tailwind — новые технологии (см. Complexity Tracking) |

**Gate result**: PASS (с обоснованным нарушением Tech Stack)

## Project Structure

### Documentation (this feature)

```text
specs/022-tutor-landing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
kaluger-super-app/
├── frontend/            # Existing React SPA
├── backend/             # Existing Express API
├── landing/             # NEW: Next.js landing page
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   ├── public/
│   │   └── images/      # Фото, сертификаты
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── header.tsx
│   │   │   ├── hero.tsx
│   │   │   ├── education.tsx
│   │   │   ├── certificates.tsx
│   │   │   ├── reviews.tsx
│   │   │   ├── conditions.tsx
│   │   │   ├── contacts.tsx
│   │   │   ├── footer.tsx
│   │   │   └── index.ts
│   │   ├── data/
│   │   │   └── tutor.json     # Все данные репетитора
│   │   └── types/
│   │       └── index.ts       # TypeScript типы
│   └── tests/
│       └── components/
└── docs/
```

**Structure Decision**: Отдельный проект `landing/` по аналогии с `frontend/` и `backend/`. Next.js App Router (src/app/) для SSG. Компоненты плоские (без вложенности) — для одностраничника это оптимально.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Next.js (новая технология) | SSG из коробки, оптимизация изображений, SEO-мета через Metadata API, статический экспорт — идеальный стек для лендинга | CRA не поддерживает SSG; чистый HTML не даёт компонентного подхода и TypeScript |
| Tailwind CSS (новая технология) | Быстрая адаптивная вёрстка, utility-first подход идеален для лендинга без дизайн-системы | MUI избыточна для лендинга и увеличивает бандл; styled-components требуют JS-рантайм, что вредит SSG |
| 3-й проект в монорепо | Лендинг — независимый продукт с другим стеком и циклом деплоя | Встраивание в frontend/ невозможно из-за разных фреймворков (CRA vs Next.js) |
