# Data Model: Раздел «Новости»

**Branch**: `007-news-section` | **Date**: 2026-02-22

## Entities

### NewsItem

Информационная запись об обновлении приложения, отображаемая пользователям.

| Field       | Type     | Constraints               | Description                          |
|-------------|----------|---------------------------|--------------------------------------|
| id          | string   | PK, auto-generated (cuid) | Уникальный идентификатор             |
| title       | string   | required, max 200 chars   | Заголовок новости                    |
| content     | string   | required                  | Описание изменений (Markdown)        |
| version     | string?  | optional                  | Версия из changelog (если есть)      |
| publishedAt | datetime | required, indexed          | Дата публикации (для сортировки)     |
| createdAt   | datetime | auto, default: now()      | Дата создания записи                 |
| updatedAt   | datetime | auto                      | Дата последнего обновления           |

**Constraints**:
- Сортировка по `publishedAt` DESC
- Индекс на `publishedAt` для быстрой выборки

**Table name**: `news_items`

---

### NewsReadStatus

Отслеживание последнего визита пользователя в раздел «Новости» для показа бейджа.

| Field      | Type     | Constraints                    | Description                             |
|------------|----------|--------------------------------|-----------------------------------------|
| id         | string   | PK, auto-generated (cuid)     | Уникальный идентификатор                |
| userId     | string   | FK → User.id, unique, indexed | Пользователь                            |
| lastReadAt | datetime | required                       | Когда пользователь последний раз открыл раздел |

**Constraints**:
- Один к одному с User (unique constraint на `userId`)
- Каскадное удаление при удалении пользователя
- Индекс на `userId` для быстрого поиска

**Table name**: `news_read_statuses`

---

## Relationships

```
User 1 ──── 0..1 NewsReadStatus
         (каждый пользователь может иметь одну запись прочтения)

NewsItem ──── (независимая сущность, не связана с User)
```

## State Transitions

### NewsReadStatus Lifecycle

```
[Не существует] → Создаётся при первом посещении раздела → [lastReadAt = now()]
                                                               │
                                                               ▼
                                                    Обновляется при каждом
                                                    посещении [lastReadAt = now()]
```

### Логика бейджа

```
hasUnread = EXISTS(
  NewsItem WHERE publishedAt > (
    SELECT lastReadAt FROM NewsReadStatus WHERE userId = currentUser
  )
)

// Если NewsReadStatus не существует для пользователя — все новости считаются непрочитанными
```
