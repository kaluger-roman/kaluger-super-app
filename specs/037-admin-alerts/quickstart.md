# Quickstart: 037-admin-alerts

Commands run on the dev machine (`ssh home`), in the worktree
`~/kaluger-super-app/.claude/worktrees/admin-alerts`, with
`source ~/.nvm/nvm.sh` first.

## 1. Database

```bash
bash scripts/dev-stack.sh up          # branch Postgres; JSON has databaseUrl / testDatabaseUrl
cd backend
DATABASE_URL="<databaseUrl>" npx prisma migrate dev --create-only --name 037_admin_alerts
# append the enabledChangedAt backfill UPDATE to the generated migration.sql
cd .. && bash scripts/dev-stack.sh migrate   # applies to the branch dev and test DBs
cd backend && npx prisma generate
```

The branch changes the schema: give the worktree its own `backend/node_modules`
(`npm ci` in `backend/`) instead of the symlink, otherwise `prisma generate`
rewrites the main checkout's client.

## 2. Checks while iterating

```bash
npm run check                         # repo root: tsc, eslint, prettier, related tests in parallel
bash scripts/dev-stack.sh test-backend --testPathPatterns=adminAlerts
cd frontend && npm run test -- src/features/admin/models/__tests__/adminAlerts.model.test.ts
node --test scripts/__tests__/        # wrapper / pull scripts
```

Once before the commit: `npm run check -- --full`.

## 3. Manual check in the browser

```bash
bash scripts/dev-stack.sh run-backend    # and, in another shell:
bash scripts/dev-stack.sh run-frontend
```

1. `/admin` → «Настройки»: save an address, «Отправить тестовое письмо»
   (dev sends through Resend if `RESEND_API_KEY` is set; a second click
   within a minute → «не чаще раза в минуту»). Invalid `admin@example` →
   «Некорректный email». Clear the field, save, reload → empty.
2. Trigger checks without waiting 15 min: in dev, cron runs the check every
   15 minutes; for an immediate run use the backend REPL or temporarily the
   e2e backend (`NODE_ENV=test E2E=1`) and
   `curl -X POST localhost:<api>/api/__test__/admin/run-alert-checks` (optional body
   `{"types": ["offsite_stale"]}` runs only the listed checks).
   With no offsite dot-files, `offsite_stale` and `restore_check_stale` open.
3. «Алерты»: counter on the tab, «Прочитано» mutes a card and decreases the
   counter, «Все» shows resolved ones under «Закрытые за последние 90 дней».
4. «Обзор»: banner «Есть активные проблемы: N», «Открыть алерты» switches tab.
5. Put `{"checkedAt":"<now>","fileName":null,"status":"error","reason":"gzip_corrupt"}`
   into `backend/backups/.offsite-restore-check.json`, run the check →
   `restore_check_failed` with «архив копии повреждён».
6. Break `pg_dump` (wrong `DATABASE_URL` for the backend process or a manual
   backup against a stopped DB) → «Создать бэкап» fails → `backup_failed`
   appears right away and a letter is queued/sent.
7. Mobile 375 px: tabs scroll, cards and settings have no horizontal scroll.

## 4. Scripts

```bash
SSH_ORIGINAL_COMMAND="report-storage 1610612736 250059350016 209715200 21474836480 0" \
  bash scripts/offsite-backup/prod-ssh-wrapper.sh /tmp/fake-prod && cat /tmp/fake-prod/.offsite-storage.json
```

## 5. After deploy (manual, FR-015)

Follow `docs/ops/offsite-backups.md` → "Updating" → "After 037-admin-alerts":
reinstall `/usr/local/sbin/offsite-backup-ssh` on prod and the scripts in
`~/.local/share/offsite-backup/` at home; set the alert address in
«Настройки» and send a test letter.
