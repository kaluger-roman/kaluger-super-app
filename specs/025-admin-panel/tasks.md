# Tasks: Admin Panel

## Phase 1: Backend — Admin Auth + Routes

- [x] 1.1 Add ADMIN_EMAIL, ADMIN_PASSWORD to .env.example
- [x] 1.2 Add admin types to backend/src/types/index.ts
- [x] 1.3 Create backend/src/middleware/adminAuth.ts
- [x] 1.4 Create backend/src/controllers/admin/login.ts
- [x] 1.5 Create backend/src/controllers/admin/overview.ts
- [x] 1.6 Create backend/src/controllers/admin/index.ts
- [x] 1.7 Create backend/src/routes/admin.ts (merge backup routes)
- [x] 1.8 Update backup controllers to use adminAuth imports
- [x] 1.9 Remove backend/src/routes/backup.ts, update index.ts
- [x] 1.10 Write backend tests for admin endpoints

## Phase 2: Frontend — Admin Feature + Pages

- [x] 2.1 Create frontend/src/shared/api/admin.ts
- [x] 2.2 Create frontend/src/features/admin/ (model, api, ui)
- [x] 2.3 Create frontend/src/pages/AdminPage/ (dashboard, sections)
- [x] 2.4 Add /admin route to AppRoutes.tsx
