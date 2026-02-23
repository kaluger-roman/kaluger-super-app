# API Contracts: News

**Base path**: `/api/news`
**Auth**: All endpoints require `Authorization: Bearer <token>` header

---

## GET /api/news

Получение списка новостей с пагинацией.

**Query Parameters**:

| Param | Type   | Default | Description            |
|-------|--------|---------|------------------------|
| page  | number | 1       | Номер страницы         |
| limit | number | 20      | Количество на странице |

**Response 200**:

```json
{
  "news": [
    {
      "id": "clx1234567890",
      "title": "Обновление приложения",
      "content": "### Новое\n- Добавлен раздел «Новости»\n\n### Исправлено\n- Исправлена ошибка...",
      "version": "2026-02-22",
      "publishedAt": "2026-02-22T12:00:00.000Z",
      "createdAt": "2026-02-22T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**Response 401**: `{ "error": "Токен доступа обязателен" }`

---

## GET /api/news/has-unread

Проверка наличия непрочитанных новостей (для бейджа в сайдбаре).

**Response 200**:

```json
{
  "hasUnread": true
}
```

**Response 401**: `{ "error": "Токен доступа обязателен" }`

**Logic**:
- Если `NewsReadStatus` не существует для пользователя и есть хотя бы одна новость → `true`
- Если `lastReadAt` < `publishedAt` самой свежей новости → `true`
- Иначе → `false`

---

## POST /api/news/mark-read

Отметить новости как прочитанные (обновить `lastReadAt`).

**Request Body**: отсутствует (пустой POST)

**Response 200**:

```json
{
  "message": "Новости отмечены как прочитанные"
}
```

**Response 401**: `{ "error": "Токен доступа обязателен" }`

**Logic**:
- Если `NewsReadStatus` существует → обновить `lastReadAt = now()`
- Если не существует → создать с `lastReadAt = now()`
