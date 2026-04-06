# Quickstart: Лендинг-страница репетитора

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
cd landing
npm install
```

## Development

```bash
npm run dev       # Next.js dev server (http://localhost:3000)
```

## Build

```bash
npm run build     # Static export → landing/out/
```

## Project Structure

```
landing/
├── package.json
├── next.config.ts        # output: 'export', images: { unoptimized: true }
├── tsconfig.json
├── postcss.config.mjs    # @tailwindcss/postcss
├── public/
│   └── images/
│       ├── photo.webp           # Фото репетитора
│       ├── og-image.webp        # OpenGraph изображение
│       └── certificates/        # Изображения сертификатов
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (шрифты, metadata)
│   │   ├── page.tsx             # Главная страница (композиция секций)
│   │   └── globals.css          # Tailwind + custom theme
│   ├── components/
│   │   ├── header.tsx           # Sticky nav с якорными ссылками
│   │   ├── hero.tsx             # ФИО, фото, tagline, CTA
│   │   ├── education.tsx        # Образование
│   │   ├── certificates.tsx     # Сертификаты
│   │   ├── reviews.tsx          # Отзывы (карусель)
│   │   ├── conditions.tsx       # Условия занятий (предметы, цены)
│   │   ├── contacts.tsx         # Соцсети и мессенджеры
│   │   ├── footer.tsx           # Подвал
│   │   ├── animate-on-scroll.tsx # Wrapper с Intersection Observer
│   │   └── index.ts             # Re-exports
│   ├── components/icons/
│   │   ├── profi-icon.tsx       # Custom SVG: Профи.ру
│   │   ├── max-icon.tsx         # Custom SVG: Max
│   │   └── index.ts
│   ├── data/
│   │   └── tutor.json           # Все данные репетитора
│   ├── hooks/
│   │   ├── use-in-view.ts       # Intersection Observer hook
│   │   └── index.ts
│   └── types/
│       └── index.ts             # TypeScript types
└── tests/
    └── components/              # Vitest тесты компонентов
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (http://localhost:3000) |
| `npm run build` | Static export → `out/` |
| `npm run lint` | ESLint check |
| `npm run format:check` | Prettier check |
| `npm test` | Vitest |

## How to Update Tutor Data

Отредактируйте `src/data/tutor.json` — все данные в одном файле. После изменений:

```bash
npm run build    # Пересобрать статику
```

## Deployment

Статические файлы из `landing/out/` деплоятся на VPS через rsync (GitHub Actions). Nginx раздаёт файлы на поддомене `teacher.kaluger.ru`.
