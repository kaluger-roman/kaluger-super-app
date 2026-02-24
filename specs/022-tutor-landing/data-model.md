# Data Model: Лендинг-страница репетитора

**Date**: 2026-02-23
**Source**: [spec.md](./spec.md)

## Overview

Все данные хранятся в одном JSON-файле `landing/src/data/tutor.json`. Без базы данных, без API. Данные читаются при статической генерации (build time).

## TypeScript Types

```typescript
// landing/src/types/index.ts

type Education = {
  institution: string;       // "МГУ им. М.В. Ломоносова"
  degree: string;            // "Магистр физики"
  year: number;              // 2015
};

type Certificate = {
  title: string;             // "IELTS Academic"
  year: number;              // 2020
  image?: string;            // "/images/certificates/ielts.webp"
};

type Review = {
  author: string;            // "Анна М."
  text: string;              // "Отличный преподаватель..."
  rating?: number;           // 5 (1-5, optional)
  date?: string;             // "2025-09-15" (ISO date, optional)
  source?: string;           // "Профи.ру" (откуда скопирован отзыв)
};

type Subject = {
  name: string;              // "Математика"
  levels: string[];          // ["ЕГЭ", "ОГЭ", "Олимпиады"]
  duration: number;          // 60 (минуты)
  price: number;             // 2500 (рубли)
};

type SocialLink = {
  type: "profi" | "vk" | "whatsapp" | "telegram" | "max";
  url: string;               // "https://profi.ru/profile/..."
  label?: string;            // "Профиль на Профи.ру"
};

type TutorData = {
  firstName: string;         // "Иван"
  lastName: string;          // "Калугер"
  patronymic: string;        // "Романович"
  photo: string;             // "/images/photo.webp"
  tagline: string;           // "Репетитор по математике и физике"
  about: string;             // Описание подхода к обучению (2-3 абзаца)
  experience: number;        // Лет опыта
  education: Education[];
  certificates: Certificate[];
  reviews: Review[];
  subjects: Subject[];
  socials: SocialLink[];
  seo: {
    title: string;           // "Репетитор по математике — Иван Калугер"
    description: string;     // Meta description (160 символов)
    ogImage: string;         // "/images/og-image.webp"
  };
};
```

## JSON Schema (пример данных)

```json
{
  "firstName": "Иван",
  "lastName": "Калугер",
  "patronymic": "Романович",
  "photo": "/images/photo.webp",
  "tagline": "Репетитор по математике и физике",
  "about": "Помогаю ученикам 8–11 классов подготовиться к ЕГЭ и ОГЭ...",
  "experience": 7,
  "education": [
    {
      "institution": "МГУ им. М.В. Ломоносова",
      "degree": "Магистр физики",
      "year": 2015
    }
  ],
  "certificates": [
    {
      "title": "Сертификат ФИПИ по подготовке к ЕГЭ",
      "year": 2023,
      "image": "/images/certificates/fipi.webp"
    }
  ],
  "reviews": [
    {
      "author": "Анна М.",
      "text": "Благодаря занятиям сын сдал ЕГЭ по математике на 92 балла!",
      "rating": 5,
      "date": "2025-09-15",
      "source": "Профи.ру"
    }
  ],
  "subjects": [
    {
      "name": "Математика",
      "levels": ["ЕГЭ", "ОГЭ", "Олимпиады"],
      "duration": 60,
      "price": 2500
    }
  ],
  "socials": [
    { "type": "profi", "url": "https://profi.ru/profile/..." },
    { "type": "vk", "url": "https://vk.com/..." },
    { "type": "whatsapp", "url": "https://wa.me/7..." },
    { "type": "telegram", "url": "https://t.me/..." },
    { "type": "max", "url": "https://max.ru/..." }
  ],
  "seo": {
    "title": "Репетитор по математике и физике — Иван Калугер",
    "description": "Онлайн-репетитор по математике и физике. Подготовка к ЕГЭ, ОГЭ, олимпиадам. 7 лет опыта.",
    "ogImage": "/images/og-image.webp"
  }
}
```

## Validation Rules

| Field | Rule |
|-------|------|
| `firstName`, `lastName`, `patronymic` | Обязательные, непустые строки |
| `photo` | Путь к файлу в `/public/images/` |
| `education` | Минимум 1 элемент |
| `certificates` | Может быть пустым (секция скроется) |
| `reviews` | Может быть пустым (секция скроется) |
| `reviews[].rating` | 1–5, опционально |
| `subjects` | Минимум 1 элемент |
| `subjects[].duration` | Положительное число (минуты) |
| `subjects[].price` | Положительное число (рубли) |
| `socials` | Может быть пустым (иконки не покажутся) |
| `socials[].type` | Одно из: `profi`, `vk`, `whatsapp`, `telegram`, `max` |

## Relationships

```
TutorData (1)
  ├── Education (1..N)
  ├── Certificate (0..N)
  ├── Review (0..N)
  ├── Subject (1..N)
  ├── SocialLink (0..N)
  └── SEO (1)
```

Все данные — плоская структура в одном файле. Нет нормализации, нет связей по ID. Для одного репетитора это оптимально.
