#!/usr/bin/env bash
# Per-branch dev environment for parallel branch/worktree development.
#
# Each branch gets a stable port slot (registry shared across worktrees) and its
# own Docker Postgres with two databases (tutor_app + tutor_app_test). Dev
# servers run on the HOST (fast HMR, worktree node_modules symlinks keep
# working) on the branch's ports; the wrapper commands export the right env, so
# personal backend/.env is never touched. The backend does not read .env itself:
# run-backend loads it with dotenv-cli, which keeps the exported ports and DB;
# run-backend-e2e uses the fixed E2E_* values below instead.
#
# Port slots: idx per branch from the registry; web=3000+idx*10,
# api=3001+idx*10, db=15432+idx. Branch "main" is reserved slot 0 → the
# classic 3000/3001 and your personal local Postgres, untouched by this script.
#
# Commands:
#   up               Allocate ports, start dev-<branch> Postgres, migrate both DBs; print JSON.
#   ports            Print the branch's port allocation as JSON (allocates if new).
#   status           `docker compose ps` for the branch's db.
#   run-backend      Backend dev server (nodemon) on the branch's api port + dev DB.
#   run-frontend     CRA dev server on the branch's web port, pointed at the branch's api.
#   run-backend-e2e  Backend in NODE_ENV=test E2E=1 against the branch's TEST DB (for e2e).
#   test-backend ... Jest against the branch's test DB (args passed through).
#   e2e ...          Playwright e2e on the branch's ports (args passed through).
#   migrate          `prisma migrate deploy` to both branch DBs.
#   psql [--test] SQL  Run SQL in the branch's dev (or test) database.
#   down             Stop the branch's db, delete its volume, free the port slot.
#   down-all         Stop every dev-* stack on this machine.
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.dev.yml"
# The registry lives in the shared .git dir so all worktrees see one allocation.
REGISTRY="$(git -C "$REPO_ROOT" rev-parse --path-format=absolute --git-common-dir)/dev-stack-ports.json"

# Test-only credentials for the e2e backend: e2e/admin specs sign in with these, and the
# test routes mint admin tokens for E2E_ADMIN_EMAIL. Never used outside NODE_ENV=test.
E2E_ADMIN_EMAIL="admin@e2e.local"
# bcrypt of the password `E2eAdmin!2026` — single-quoted so the $ segments stay literal.
E2E_ADMIN_PASSWORD_HASH='$2b$10$bh0KSxPLTBEwZJlmikbYauZdELBjCDPXcpe9vCds2KUZ6RRjCV3su'
# Test-only VAPID pair: e2e/students/video-call-push sends real web push to the backend's own sink.
E2E_VAPID_PUBLIC_KEY="BBOJRSMbUiW2bbepyX2gPFZq86JL-Zj31rWCVMmImn-8_Hmi7B-xk9g_agv5rxQt7Aesbd8iZbC-DK7jU2dFrV4"
E2E_VAPID_PRIVATE_KEY="Kv58ufPVocv7umOlIxbWBGvnLvAVN0SZcxhlek_hq-c"
E2E_VAPID_SUBJECT="mailto:e2e@e2e.local"

# Backups run the host's pg_dump, which refuses a newer server. Debian/Ubuntu's pg_dump
# wrapper picks the local cluster's version, not the newest client, so put the client
# matching the stand's Postgres image first on PATH when it is installed.
PG_LIB_DIR="${DEV_STACK_PG_LIB_DIR:-/usr/lib/postgresql}"
use_stand_pg_client() {
  local major
  major="$(sed -nE 's/^[[:space:]]*image: postgres:([0-9]+).*/\1/p' "$COMPOSE_FILE")"
  if [ -n "$major" ] && [ -x "$PG_LIB_DIR/$major/bin/pg_dump" ]; then
    PATH="$PG_LIB_DIR/$major/bin:$PATH"
  fi
}

sanitize() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's#[^a-z0-9]+#-#g; s#^-+##; s#-+$##'
}

current_branch() {
  git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached"
}

project_name() {
  echo "dev-$(sanitize "$(current_branch)")"
}

branch_idx() {
  node -e '
    const fs = require("fs");
    const [reg, branch] = process.argv.slice(1);
    let r = {};
    try { r = JSON.parse(fs.readFileSync(reg, "utf8")); } catch {}
    if (!(branch in r)) {
      const used = new Set(Object.values(r));
      let i = 1;
      while (used.has(i)) i += 1;
      r[branch] = i;
      fs.writeFileSync(reg, JSON.stringify(r, null, 2));
    }
    console.log(r[branch]);
  ' "$REGISTRY" "$(current_branch)"
}

free_idx() {
  node -e '
    const fs = require("fs");
    const [reg, branch] = process.argv.slice(1);
    let r = {};
    try { r = JSON.parse(fs.readFileSync(reg, "utf8")); } catch { process.exit(0); }
    delete r[branch];
    fs.writeFileSync(reg, JSON.stringify(r, null, 2));
  ' "$REGISTRY" "$(current_branch)"
}

load_ports() {
  local branch idx
  branch="$(current_branch)"
  if [ "$branch" = "main" ]; then
    echo "dev-stack is for feature branches; main keeps the classic 3000/3001 + local Postgres" >&2
    exit 1
  fi
  idx="$(branch_idx)"
  WEB_PORT=$((3000 + idx * 10))
  API_PORT=$((3001 + idx * 10))
  DB_PORT=$((15432 + idx))
  DEV_DB_URL="postgresql://dev:dev@localhost:$DB_PORT/tutor_app?schema=public"
  TEST_DB_URL="postgresql://dev:dev@localhost:$DB_PORT/tutor_app_test?schema=public"
}

ports_json() {
  printf '{"project":"%s","branch":"%s","webUrl":"http://localhost:%s","apiUrl":"http://localhost:%s","dbPort":%s,"databaseUrl":"%s","testDatabaseUrl":"%s"}\n' \
    "$(project_name)" "$(current_branch)" "$WEB_PORT" "$API_PORT" "$DB_PORT" "$DEV_DB_URL" "$TEST_DB_URL"
}

compose() {
  DEV_DB_PORT="$DB_PORT" docker compose -p "$(project_name)" -f "$COMPOSE_FILE" "$@"
}

cmd_up() {
  load_ports
  compose up -d --wait >&2
  cmd_migrate_inner
  ports_json
}

cmd_migrate_inner() {
  ( cd "$REPO_ROOT/backend" \
    && DATABASE_URL="$DEV_DB_URL" npx prisma migrate deploy >&2 \
    && DATABASE_URL="$TEST_DB_URL" npx prisma migrate deploy >&2 )
}

cmd_run_backend() {
  load_ports
  use_stand_pg_client
  cd "$REPO_ROOT/backend"
  local load_env=()
  [ -f .env ] && load_env=(./node_modules/.bin/dotenv -e .env --)
  PORT="$API_PORT" DATABASE_URL="$DEV_DB_URL" FRONTEND_URL="http://localhost:$WEB_PORT" \
    exec ${load_env[@]+"${load_env[@]}"} npm run dev
}

cmd_run_backend_e2e() {
  load_ports
  use_stand_pg_client
  cd "$REPO_ROOT/backend"
  NODE_ENV=test E2E=1 PORT="$API_PORT" DATABASE_URL="$TEST_DB_URL" \
    FRONTEND_URL="http://localhost:$WEB_PORT" \
    JWT_SECRET=e2e-jwt-secret ADMIN_JWT_SECRET=e2e-admin-jwt-secret \
    STUDENT_JWT_SECRET=e2e-student-jwt-secret \
    ADMIN_EMAIL="$E2E_ADMIN_EMAIL" ADMIN_PASSWORD_HASH="$E2E_ADMIN_PASSWORD_HASH" \
    VAPID_PUBLIC_KEY="$E2E_VAPID_PUBLIC_KEY" VAPID_PRIVATE_KEY="$E2E_VAPID_PRIVATE_KEY" \
    VAPID_SUBJECT="$E2E_VAPID_SUBJECT" \
    exec npm run dev
}

cmd_run_frontend() {
  load_ports
  cd "$REPO_ROOT/frontend"
  PORT="$WEB_PORT" REACT_APP_API_URL="http://localhost:$API_PORT/api" BROWSER=none \
    exec npm start
}

cmd_test_backend() {
  load_ports
  use_stand_pg_client
  cd "$REPO_ROOT/backend"
  DATABASE_URL="$TEST_DB_URL" exec npm test -- "$@"
}

cmd_e2e() {
  load_ports
  cd "$REPO_ROOT/frontend"
  PORT="$WEB_PORT" REACT_APP_API_URL="http://localhost:$API_PORT/api" \
    E2E_BASE_URL="http://localhost:$WEB_PORT" E2E_API_URL="http://localhost:$API_PORT" \
    DATABASE_URL="$TEST_DB_URL" \
    exec npm run test:e2e -- "$@"
}

cmd_psql() {
  load_ports
  local db="tutor_app"
  if [ "${1:-}" = "--test" ]; then
    db="tutor_app_test"
    shift
  fi
  compose exec -T db psql -U dev -d "$db" -c "$1"
}

cmd_down() {
  load_ports
  compose down -v --remove-orphans
  free_idx
  echo "down: $(project_name)"
}

cmd_down_all() {
  docker compose ls --all --format json 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{(JSON.parse(s)||[]).forEach(p=>{if(p.Name&&p.Name.indexOf("dev-")===0)console.log(p.Name)})}catch{}})' \
    | while read -r name; do
        DEV_DB_PORT=0 docker compose -p "$name" -f "$COMPOSE_FILE" down -v --remove-orphans || true
        echo "down: $name"
      done
}

usage() {
  sed -nE '2,30{s/^# ?//p}' "${BASH_SOURCE[0]}"
}

case "${1:-help}" in
  up) cmd_up ;;
  ports) load_ports; ports_json ;;
  status) load_ports; compose ps ;;
  run-backend) cmd_run_backend ;;
  run-backend-e2e) cmd_run_backend_e2e ;;
  run-frontend) cmd_run_frontend ;;
  test-backend) shift; cmd_test_backend "$@" ;;
  e2e) shift; cmd_e2e "$@" ;;
  migrate) load_ports; cmd_migrate_inner ;;
  psql) shift; cmd_psql "$@" ;;
  down) cmd_down ;;
  down-all) cmd_down_all ;;
  *) usage ;;
esac
