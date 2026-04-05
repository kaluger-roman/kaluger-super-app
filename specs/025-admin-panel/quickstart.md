# Quickstart: Admin Panel

## Настройка ENV

Добавить в `backend/.env`:

```bash
# Admin
ADMIN_EMAIL="admin@tutor.kaluger.ru"
ADMIN_PASSWORD="$2b$12$..."  # bcrypt hash пароля
```

Сгенерировать хеш пароля:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourPassword', 12).then(h => console.log(h))"
```

## Запуск

```bash
cd backend && npm run dev   # Бэкенд с админ-эндпоинтами
cd frontend && npm start     # Фронтенд с /admin
```

## Проверка

1. Открыть `http://localhost:3000/admin`
2. Ввести email и пароль из ENV
3. Должен появиться дашборд с разделами: Обзор, Бэкапы

## API (ручная проверка)

```bash
# Логин
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tutor.kaluger.ru","password":"yourPassword"}'

# Обзор
curl http://localhost:3001/api/admin/overview \
  -H "Authorization: Bearer <token>"

# Бэкапы
curl http://localhost:3001/api/admin/backup/settings \
  -H "Authorization: Bearer <token>"
```
