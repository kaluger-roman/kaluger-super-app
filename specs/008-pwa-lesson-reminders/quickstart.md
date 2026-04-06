# Quickstart: PWA и напоминания об уроках

**Feature**: 008-pwa-lesson-reminders
**Date**: 2026-02-23

## Prerequisites

- Node.js 18+
- PostgreSQL running
- `web-push` VAPID keys generated (see Setup)

## Setup

### 1. Generate VAPID keys

```bash
cd backend
npx web-push generate-vapid-keys
```

Add to `backend/.env` and `backend/.env.test`:
```
VAPID_PUBLIC_KEY=BNcR...
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:admin@tutor.kaluger.ru
```

### 2. Install dependencies

```bash
# Backend
cd backend
npm install web-push
npm install -D @types/web-push

# Frontend — no new npm dependencies needed
# (Service Worker, PushManager, Notification APIs are built-in browser APIs)
```

### 3. Run database migration

```bash
cd backend
npm run db:migrate
# Migration adds: push_subscriptions, reminder_settings, scheduled_reminders tables
```

## Implementation Order

### Phase 1: PWA Foundation
1. Update `frontend/public/manifest.json` — name, icons, theme
2. Add iOS meta-tags to `frontend/public/index.html`
3. Create `frontend/public/push-sw.js` — service worker for push
4. Add SW registration in app initialization

### Phase 2: Backend — Data & API
5. Add Prisma models (PushSubscription, ReminderSettings, ScheduledReminder)
6. Run migration
7. Add types to `backend/src/types/index.ts`
8. Create push routes + controllers (subscribe, unsubscribe, vapid-key, settings)
9. Create reminder settings routes + controllers

### Phase 3: Backend — Notification Engine
10. Create push notification service (`services/pushNotification.ts`)
11. Create reminder processing service (`services/reminderProcessor.ts`)
12. Add cron job in `backend/src/index.ts`
13. Add reminder creation/recalculation to lesson create/update/delete flows

### Phase 4: Frontend — Subscription & Settings
14. Create API module (`shared/api/notifications.ts`)
15. Create entity model (`entities/notifications/`)
16. Create feature UI (`features/notificationSettings/`)
17. Add notifications section to Profile page
18. Add push subscription logic to app init

### Phase 5: Testing
19. Backend unit/integration tests for all new endpoints
20. Backend tests for cron job logic
21. Frontend unit tests for Effector model
22. Frontend component tests for settings UI
23. E2E test for notification settings flow

## Key Files to Create

### Backend
```
backend/src/
├── controllers/
│   └── push/
│       ├── subscribe.ts
│       ├── unsubscribe.ts
│       ├── getVapidKey.ts
│       ├── getSubscriptions.ts
│       └── index.ts
├── controllers/
│   └── reminderSettings/
│       ├── getReminderSettings.ts
│       ├── updateReminderSettings.ts
│       └── index.ts
├── routes/
│   ├── push.ts
│   └── reminderSettings.ts
├── services/
│   ├── pushNotification.ts       # Send push via web-push
│   └── reminderProcessor.ts      # Cron: process scheduled reminders
```

### Frontend
```
frontend/src/
├── entities/
│   └── notifications/
│       ├── notifications.model.ts  # Effector: stores, effects, events
│       ├── notifications.types.ts  # Type definitions
│       └── index.ts
├── features/
│   └── notificationSettings/
│       └── ui/
│           ├── ReminderSettings/
│           │   ├── ReminderSettings.tsx
│           │   ├── ReminderSettings.styled.ts
│           │   └── index.ts
│           └── index.ts
├── shared/
│   └── api/
│       └── notifications.ts       # API calls
└── public/
    ├── push-sw.js                 # Service worker
    └── manifest.json              # Updated PWA manifest
```

## Key Files to Modify

### Backend
- `backend/prisma/schema.prisma` — add 3 models + enum + relations
- `backend/src/types/index.ts` — add DTOs and response types
- `backend/src/index.ts` — add cron job, register new routes
- `backend/.env.example` — add VAPID variables

### Frontend
- `frontend/public/manifest.json` — update name, icons, theme
- `frontend/public/index.html` — add iOS meta-tags
- `frontend/src/app/model/app-init.model.ts` — add notification init
- `frontend/src/pages/profile/ProfilePage.tsx` — add settings section
- `frontend/src/pages/profile/models/profile.model.ts` — add notification stores
- `frontend/src/widgets/sidebar/Sidebar.tsx` — (optional) notification status indicator

### Backend — Side Effects
- `backend/src/controllers/lessons/createLesson.ts` — trigger reminder creation
- `backend/src/controllers/lessons/updateLesson.ts` — trigger reminder recalculation
- `backend/src/controllers/lessons/deleteLesson.ts` — (cascade handles it)

## Verification

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Lint
cd frontend && npm run lint
cd backend && npm run build

# E2E
cd frontend && npm run test:e2e
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| VAPID_PUBLIC_KEY | Yes | Public key for Web Push (shared with client) |
| VAPID_PRIVATE_KEY | Yes | Private key for Web Push (server-only) |
| VAPID_SUBJECT | Yes | Contact URI (mailto: or https://) |
