# Tasks: Лендинг-страница репетитора

**Input**: Design documents from `/specs/022-tutor-landing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Vitest + React Testing Library. Весь новый код покрывается тестами.

**Organization**: Tasks grouped by user story. US1 (информация) и US2 (адаптивность) объединены, т.к. адаптивная вёрстка через Tailwind встроена в каждый компонент изначально.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Инициализация Next.js проекта в монорепо

- [x] T001 Initialize Next.js project with TypeScript in `landing/` — run `npx create-next-app@latest landing --typescript --tailwind --eslint --app --src-dir --no-turbopack --no-import-alias` and clean boilerplate
- [x] T002 Configure `landing/next.config.ts` — set `output: 'export'`, `trailingSlash: true`, `images: { unoptimized: true }`
- [x] T003 Configure Tailwind CSS v4 in `landing/postcss.config.mjs` — plugin `@tailwindcss/postcss`
- [x] T004 Configure `landing/src/app/globals.css` — `@import "tailwindcss"` with `@theme` tokens (colors, fonts)
- [x] T005 Configure `landing/tsconfig.json` — strict mode, path alias `@/*` for `src/*`
- [x] T006 Add `landing/out/` and `landing/.next/` to root `.gitignore`
- [x] T007 Configure Vitest in `landing/` — install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`. Create `landing/vitest.config.ts` with jsdom environment and path aliases

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Типы, данные и утилиты, от которых зависят все компоненты

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create TypeScript types in `landing/src/types/index.ts` — `TutorData`, `Education`, `Certificate`, `Review`, `Subject`, `SocialLink` per data-model.md
- [x] T009 Create placeholder data file `landing/src/data/tutor.json` with example data per data-model.md JSON schema
- [x] T010 [P] Create `useInView` hook in `landing/src/hooks/use-in-view.ts` — Intersection Observer + `useState` per research.md
- [x] T011 [P] Create `landing/src/hooks/index.ts` re-export
- [x] T012 Create `AnimateOnScroll` wrapper component in `landing/src/components/animate-on-scroll.tsx` — uses `useInView`, applies Tailwind transition classes, respects `prefers-reduced-motion`
- [x] T013 Create placeholder images directory `landing/public/images/` and `landing/public/images/certificates/` with placeholder files

### Tests for Foundational

- [x] T014 [P] Test `useInView` hook in `landing/tests/hooks/use-in-view.test.ts` — mock IntersectionObserver, verify `isInView` state changes on intersection, verify observer disconnects after first trigger
- [x] T015 [P] Test `AnimateOnScroll` in `landing/tests/components/animate-on-scroll.test.tsx` — verify renders children, applies transition classes, toggles visibility classes on intersection

**Checkpoint**: Foundational ready — types, data, animation hook, tests pass

---

## Phase 3: User Story 1+2 — Информация о репетиторе + Адаптивность (Priority: P1) 🎯 MVP

**Goal**: Посетитель видит полную информацию о репетиторе на любом устройстве. Все секции адаптивны (mobile-first через Tailwind). Навигация с гамбургер-меню на мобильных.

**Independent Test**: Открыть `http://localhost:3000`, убедиться что hero, образование, сертификаты, условия отображаются. Проверить на 320px, 768px, 1024px, 1440px.

### Implementation

- [x] T016 [P] [US1] Create `Header` component in `landing/src/components/header.tsx` — sticky header, nav with anchor links (`#about`, `#education`, `#certificates`, `#conditions`, `#reviews`, `#contacts`), hamburger menu on mobile (< 768px), smooth scroll behavior
- [x] T017 [P] [US1] Create `Hero` section in `landing/src/components/hero.tsx` — ФИО, фото (`next/image`), tagline, about text, experience badge, CTA button (scroll to contacts). Full-width на мобильных, двухколоночный на десктопе
- [x] T018 [P] [US1] Create `Education` section in `landing/src/components/education.tsx` — timeline-style list from `tutor.education[]`, institution, degree, year. AnimateOnScroll wrapper
- [x] T019 [P] [US1] Create `Certificates` section in `landing/src/components/certificates.tsx` — grid cards from `tutor.certificates[]`, title, year, optional image with fallback placeholder. Responsive grid (1 col mobile, 2 tablet, 3 desktop). Скрывается если массив пуст
- [x] T020 [P] [US1] Create `Conditions` section in `landing/src/components/conditions.tsx` — cards from `tutor.subjects[]`, name, levels, duration, price. "Только онлайн" badge. Responsive grid
- [x] T021 [P] [US1] Create `Footer` component in `landing/src/components/footer.tsx` — copyright, year, ФИО
- [x] T022 [US1] Create components barrel export in `landing/src/components/index.ts`
- [x] T023 [US1] Create root layout in `landing/src/app/layout.tsx` — import Inter/Golos Text font from `next/font/google`, viewport meta, lang="ru"
- [x] T024 [US1] Compose main page in `landing/src/app/page.tsx` — import and arrange all sections: Header → Hero → Education → Certificates → Conditions → Footer. Import data from `tutor.json`, pass as props

### Tests for User Story 1+2

- [x] T025 [P] [US1] Test `Header` in `landing/tests/components/header.test.tsx` — renders nav links, hamburger button visible, toggle menu open/close
- [x] T026 [P] [US1] Test `Hero` in `landing/tests/components/hero.test.tsx` — renders ФИО, tagline, photo, CTA button
- [x] T027 [P] [US1] Test `Education` in `landing/tests/components/education.test.tsx` — renders education items with institution, degree, year
- [x] T028 [P] [US1] Test `Certificates` in `landing/tests/components/certificates.test.tsx` — renders certificates, hides section when empty array
- [x] T029 [P] [US1] Test `Conditions` in `landing/tests/components/conditions.test.tsx` — renders subjects with name, levels, price, duration
- [x] T030 [P] [US1] Test `Footer` in `landing/tests/components/footer.test.tsx` — renders copyright with current year and ФИО

**Checkpoint**: MVP ready — all core information sections visible, responsive, navigable, tested

---

## Phase 4: User Story 3 — Отзывы учеников (Priority: P2)

**Goal**: Посетитель читает отзывы от предыдущих учеников с именем, текстом, оценкой и источником.

**Independent Test**: Прокрутить до секции отзывов — карточки с именем, текстом, рейтингом (звёзды). Если больше 3 — работает карусель/«показать ещё».

### Implementation

- [x] T031 [US3] Create `Reviews` section in `landing/src/components/reviews.tsx` — cards from `tutor.reviews[]`, author, text (truncate with "читать полностью"), rating stars, date, source badge. Carousel or "показать ещё" if > 3 reviews. Скрывается если массив пуст. AnimateOnScroll wrapper
- [x] T032 [US3] Add Reviews to page composition in `landing/src/app/page.tsx` — insert between Conditions and Footer
- [x] T033 [US3] Update barrel export in `landing/src/components/index.ts`

### Tests for User Story 3

- [x] T034 [US3] Test `Reviews` in `landing/tests/components/reviews.test.tsx` — renders review cards with author, text, rating stars; hides section when empty; shows "читать полностью" for long text; shows "показать ещё" when > 3 reviews

**Checkpoint**: Reviews section works independently, tested

---

## Phase 5: User Story 4 — Связь через соцсети (Priority: P2)

**Goal**: Посетитель находит иконки Профи.ру, VK, WhatsApp, Telegram, Max со ссылками.

**Independent Test**: Все 5 иконок видны, клик открывает соцсеть в новой вкладке. На мобильном мессенджеры открывают приложение.

### Implementation

- [x] T035 [P] [US4] Create custom `ProfiIcon` SVG component in `landing/src/components/icons/profi-icon.tsx`
- [x] T036 [P] [US4] Create custom `MaxIcon` SVG component in `landing/src/components/icons/max-icon.tsx`
- [x] T037 [US4] Create icons barrel export in `landing/src/components/icons/index.ts`
- [x] T038 [US4] Install `react-icons` — `npm install react-icons` in `landing/`
- [x] T039 [US4] Create `Contacts` section in `landing/src/components/contacts.tsx` — social links from `tutor.socials[]`, map type to icon (profi→ProfiIcon, vk→SiVk, whatsapp→SiWhatsapp, telegram→SiTelegram, max→MaxIcon). All links `target="_blank" rel="noopener noreferrer"`. AnimateOnScroll wrapper
- [x] T040 [US4] Add Contacts to page composition in `landing/src/app/page.tsx` — insert between Reviews and Footer
- [x] T041 [US4] Update barrel export in `landing/src/components/index.ts`

### Tests for User Story 4

- [x] T042 [P] [US4] Test `ProfiIcon` in `landing/tests/components/icons/profi-icon.test.tsx` — renders SVG element
- [x] T043 [P] [US4] Test `MaxIcon` in `landing/tests/components/icons/max-icon.test.tsx` — renders SVG element
- [x] T044 [US4] Test `Contacts` in `landing/tests/components/contacts.test.tsx` — renders all social icons from data, links have `target="_blank"` and correct `href`, hides section when socials empty

**Checkpoint**: All 5 social icons visible, clickable, tested

---

## Phase 6: User Story 5 — SEO и производительность (Priority: P3)

**Goal**: Мета-теги, Open Graph, семантическая разметка, Lighthouse >= 90.

**Independent Test**: Проверить `view-source:`, убедиться в наличии `<title>`, `<meta name="description">`, `<meta property="og:*">`. Запустить Lighthouse.

### Implementation

- [x] T045 [US5] Add SEO metadata in `landing/src/app/layout.tsx` — Next.js `Metadata` export: title, description, openGraph (title, description, images, locale: "ru_RU"), canonical URL (`https://teacher.kaluger.ru`), robots, viewport. Read from `tutor.json` seo field
- [x] T046 [US5] Add semantic HTML landmarks across all sections — `<main>`, `<section>`, `<nav>`, `<header>`, `<footer>`, `<article>` for reviews, proper heading hierarchy (h1 in hero, h2 per section)
- [x] T047 [US5] Add `landing/public/robots.txt` and `landing/public/sitemap.xml` (static, single-page)
- [x] T048 [US5] Run `npm run build` in `landing/` and verify static export in `out/` — check HTML output, no server-side dependencies
- [x] T049 [US5] Optimize images — ensure all images in `landing/public/images/` are WebP format, appropriate sizes (hero photo max 800px wide, certificates max 400px)

**Checkpoint**: SEO-ready, static build works, meta tags present

---

## Phase 7: Tests & Quality

**Purpose**: Запуск всех тестов, lint, type check

- [x] T050 Run all tests in `landing/` — `npm test`, verify all pass
- [x] T051 Run lint — `cd landing && npm run lint`, fix any issues
- [x] T052 Run type check — `cd landing && npx tsc --noEmit`, fix any issues
- [x] T053 Verify full build — `cd landing && npm run build`, confirm `out/` generated

**Checkpoint**: All quality gates pass

---

## Phase 8: CI/CD & Deploy Config

**Purpose**: CI/CD, деплой-конфигурация

- [x] T054 [P] Add `landing` job to `.github/workflows/ci.yml` — npm ci, lint, tsc --noEmit, test, build
- [x] T055 [P] Add landing build and deploy steps to `.github/workflows/deploy.yml` — npm ci, build, rsync `landing/out/` to VPS
- [x] T056 Create Nginx config for `teacher.kaluger.ru` in `landing/nginx.conf` — server block per research.md Topic 5
- [x] T057 Update root `.gitignore` if needed, verify `landing/out/` and `landing/.next/` are excluded

---

## Phase 9: Changelog & News

**Purpose**: Обновить CHANGELOG.md и сгенерировать новость для раздела новостей

- [x] T058 Run `/changelog` to generate CHANGELOG.md entry for the landing page feature
- [x] T059 Run `/news` to generate a user-friendly news entry from the changelog

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1)
- **US1+US2 (Phase 3)**: Depends on Foundational (Phase 2)
- **US3 (Phase 4)**: Depends on Phase 3 (page.tsx composition exists)
- **US4 (Phase 5)**: Depends on Phase 3 (page.tsx composition exists)
- **US5 (Phase 6)**: Depends on Phases 3–5 (all sections exist for semantic markup)
- **Tests & Quality (Phase 7)**: Depends on Phases 3–6 (all code written)
- **CI/CD (Phase 8)**: Depends on Phase 7 (quality verified)
- **Changelog & News (Phase 9)**: Depends on Phase 8 (before PR)

### User Story Dependencies

- **US1+US2 (P1)**: Starts after Phase 2. Independent — delivers MVP
- **US3 (P2)**: Starts after Phase 3. Adds to page.tsx — no conflict with US4
- **US4 (P2)**: Starts after Phase 3. Adds to page.tsx — no conflict with US3. **US3 and US4 can run in parallel**
- **US5 (P3)**: Starts after all sections exist. Cross-cutting SEO/performance pass

### Parallel Opportunities

```
Phase 2: T010 ∥ T011 ∥ T013 (hooks and images in parallel)
Phase 2 tests: T014 ∥ T015 (hook and component tests in parallel)
Phase 3: T016 ∥ T017 ∥ T018 ∥ T019 ∥ T020 ∥ T021 (all section components in parallel)
Phase 3 tests: T025 ∥ T026 ∥ T027 ∥ T028 ∥ T029 ∥ T030 (all component tests in parallel)
Phase 4+5: US3 ∥ US4 (reviews and contacts in parallel)
Phase 5: T035 ∥ T036 (custom SVG icons in parallel)
Phase 5 tests: T042 ∥ T043 (icon tests in parallel)
Phase 8: T054 ∥ T055 (CI and deploy configs in parallel)
```

---

## Implementation Strategy

### MVP First (US1+US2 Only)

1. Complete Phase 1: Setup (T001–T007)
2. Complete Phase 2: Foundational (T008–T015)
3. Complete Phase 3: US1+US2 (T016–T030)
4. **STOP and VALIDATE**: Open `localhost:3000`, check all sections, run tests
5. This is a fully functional landing (without reviews and social links)

### Incremental Delivery

1. Setup + Foundational → Project scaffold
2. US1+US2 → Core info sections + tests → **MVP!**
3. US3 + US4 (parallel) → Reviews + Social links + tests
4. US5 → SEO + Performance pass
5. Quality + CI/CD → All gates pass
6. Changelog + News → Ready for PR

---

## Notes

- All components are mobile-first (Tailwind responsive: base = mobile, `md:` = tablet, `lg:` = desktop)
- Данные репетитора — placeholder в `tutor.json`, будут заменены реальными данными от пользователя
- Секции с пустыми массивами (certificates, reviews, socials) скрываются автоматически
- Tests: Vitest + React Testing Library + jsdom (единообразие с основным frontend)
- Commit after each completed phase
