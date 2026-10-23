# Quickstart / verification: 036-offsite-backups

## Automated

```bash
# home, worktree root
node --test scripts/__tests__/                       # wrapper, pull, restore-check, lib
source ~/.nvm/nvm.sh
(cd backend && npm test -- --testPathPatterns=backup && npm run lint && npm run build)
(cd frontend && npm run test -- src/features/admin src/pages/AdminPage && npm run lint && npx tsc --noEmit)
```

## Manual checks on the branch (no prod changes)

1. Backend dev stack, admin → «Бэкапы»:
   - hint «Бэкапы младше 30 дней не удаляются независимо от лимита размера»;
   - «Резервное хранилище: копирование ещё не выполнялось» and
     «Проверка восстановления: ещё не выполнялась» as warnings;
   - create backups, set limit 10 MB with more than 10 MB of files →
     «Лимит превышен…» under the hint, nothing deleted.
2. `echo 2026-10-16T10:00:00Z > backend/backups/.offsite-last-pull` → line
   shows the date; set a date 3 days back → warning; write garbage → «ещё не
   выполнялось», no 500.
3. Write a sample `.offsite-restore-check.json` (success / error
   `empty_table_lessons`) → «успешно (…)» / «ошибка: таблица lessons пуста».
4. Real Docker restore smoke on home (uses a copy of a dev dump, not prod):
   ```bash
   mkdir -p /tmp/offsite-smoke && pg_dump tutor_app | gzip > /tmp/offsite-smoke/backup-2026-10-16T00-00-00-000Z.sql.gz
   OFFSITE_DEST=/tmp/offsite-smoke OFFSITE_HOST=nobody@127.0.0.1 scripts/offsite-backup/restore-check.sh --force
   tail /tmp/offsite-smoke/logs/restore-check.log   # success counts logged, report fails (no prod) → exit 1
   docker ps -a --filter label=offsite-restore-check   # empty
   ```

## After merge (manual ops, with the owner's confirmation)

See `docs/ops/offsite-backups.md`: generate the home key, install the
wrapper on prod, add the `authorized_keys` line, accept prod host key on home,
install the home scripts to `~/.local/share/offsite-backup/` from `main`,
first manual pull, crontab lines pointing at the installed copies, first
`restore-check.sh --force`, then check the admin page shows both lines without
warnings.
