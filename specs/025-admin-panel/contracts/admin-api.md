# Admin API Contracts

## Аутентификация

### POST /api/admin/login

Логин администратора.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "plainTextPassword"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 401:**
```json
{
  "error": "Неверный email или пароль"
}
```

---

## Обзор системы

### GET /api/admin/overview

Требует: `Authorization: Bearer <adminToken>`

**Response 200:**
```json
{
  "usersCount": 42,
  "studentsCount": 156,
  "lessonsCount": 1230,
  "serverUptime": 86400
}
```

---

## Бэкапы

### GET /api/admin/backup/settings

Требует: `Authorization: Bearer <adminToken>`

**Response 200:**
```json
{
  "settings": {
    "enabled": true,
    "intervalHours": 6,
    "maxStorageMb": 300,
    "lastBackupAt": "2026-03-30T10:00:00.000Z"
  },
  "files": [
    {
      "name": "backup-2026-03-30T10-00-00-000Z.sql.gz",
      "sizeMb": 12.5,
      "createdAt": "2026-03-30T10:00:00.000Z"
    }
  ],
  "totalSizeMb": 12.5
}
```

### PUT /api/admin/backup/settings

Требует: `Authorization: Bearer <adminToken>`

**Request:**
```json
{
  "enabled": true,
  "intervalHours": 12,
  "maxStorageMb": 500
}
```

**Response 200:**
```json
{
  "enabled": true,
  "intervalHours": 12,
  "maxStorageMb": 500,
  "lastBackupAt": "2026-03-30T10:00:00.000Z"
}
```

**Response 400:**
```json
{
  "error": "Интервал должен быть от 1 до 168 часов"
}
```

### POST /api/admin/backup/create

Требует: `Authorization: Bearer <adminToken>`

**Response 200:**
```json
{
  "name": "backup-2026-03-30T12-00-00-000Z.sql.gz",
  "sizeMb": 12.8,
  "createdAt": "2026-03-30T12:00:00.000Z"
}
```

**Response 500:**
```json
{
  "error": "Ошибка создания бэкапа"
}
```
