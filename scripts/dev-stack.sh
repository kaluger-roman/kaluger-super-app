#!/usr/bin/env bash
# Local development stack for this checkout (including main and detached worktrees).
# Postgres runs in Docker; servers run on macOS/Linux with hot reload.
# Commands: up, ports, status, run-backend, run-frontend, run-backend-e2e,
# test-backend [args], e2e [args], migrate, seed, exec-backend [command...],
# psql [--test] SQL, down (keep data), reset --yes (delete this checkout's DBs).
# See docs/dev-stack.md for usage and database isolation.
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.dev.yml"
# The registry lives in the shared .git dir so all worktrees see one allocation.
STACK_ID="$(cd "$REPO_ROOT" && node "$SCRIPT_DIR/stack-context.mjs" id)"

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
  local candidate
  for candidate in "${DEV_STACK_PG_BIN:-}" "$PG_LIB_DIR/$major/bin" "/opt/homebrew/opt/libpq@$major/bin" "/usr/local/opt/libpq@$major/bin"; do
    if [ -n "$candidate" ] && [ -x "$candidate/pg_dump" ]; then
      PATH="$candidate:$PATH"
      return
    fi
  done
}

# Verify the local Prisma client, including a guard for legacy shared node_modules.
ensure_prisma_client() {
  node "$SCRIPT_DIR/prisma-client.mjs"
}

current_branch() {
  git -C "$REPO_ROOT" symbolic-ref --short -q HEAD || echo "detached"
}

project_name() {
  echo "dev-$STACK_ID"
}

branch_idx() {
  (cd "$REPO_ROOT" && node "$SCRIPT_DIR/stack-context.mjs" slot)
}

free_idx() {
  (cd "$REPO_ROOT" && node "$SCRIPT_DIR/stack-context.mjs" release)
}

load_ports() {
  local idx
  idx="$(branch_idx)"
  WEB_PORT=$((3000 + idx * 10))
  API_PORT=$((3001 + idx * 10))
  # DEV_STACK_DB_PORT_BASE: tests move the db port off the real stacks' range.
  DB_PORT=$((${DEV_STACK_DB_PORT_BASE:-15432} + idx))
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
  ensure_prisma_client
  cd "$REPO_ROOT/backend"
  local load_env=()
  [ -f .env ] && load_env=(./node_modules/.bin/dotenv -e .env --)
  HOST=127.0.0.1 PORT="$API_PORT" DATABASE_URL="$DEV_DB_URL" FRONTEND_URL="http://localhost:$WEB_PORT" \
    exec ${load_env[@]+"${load_env[@]}"} npm run dev
}

cmd_run_backend_e2e() {
  load_ports
  use_stand_pg_client
  ensure_prisma_client
  cd "$REPO_ROOT/backend"
  HOST=127.0.0.1 NODE_ENV=test E2E=1 PORT="$API_PORT" DATABASE_URL="$TEST_DB_URL" \
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
  HOST=127.0.0.1 PORT="$WEB_PORT" REACT_APP_API_URL="http://localhost:$API_PORT/api" BROWSER=none \
    exec npm start
}

db_reachable() {
  node -e '
    const socket = require("net").connect(Number(process.argv[1]), "127.0.0.1");
    socket.setTimeout(2000, () => process.exit(1));
    socket.on("connect", () => process.exit(0)).on("error", () => process.exit(1));
  ' "$DB_PORT"
}

# Jest against a stopped stack fails every suite with "Can't reach database server", so start it.
# A running stack still gets the branch's new migrations: `npm run db:migrate` only migrates the
# personal dev DB from backend/.env.
ensure_test_db() {
  if db_reachable; then
    if ! (cd "$REPO_ROOT/backend" && DATABASE_URL="$TEST_DB_URL" npx prisma migrate deploy >&2); then
      echo "prisma migrate deploy to the branch's test database (localhost:$DB_PORT) failed, see above." >&2
      exit 1
    fi
    return
  fi
  echo "The branch's database (localhost:$DB_PORT) is not running; starting it as \`scripts/dev-stack.sh up\` does." >&2
  if ! { compose up -d --wait >&2 && cmd_migrate_inner; }; then
    cat >&2 <<EOF
Could not start the branch's database, see above. Docker must be running; start the stack by hand:
  bash scripts/dev-stack.sh up
or run the backend tests on the shared test database of backend/.env.test:
  npm run check -- --backend-tests npm
EOF
    exit 1
  fi
}

cmd_test_backend() {
  load_ports
  use_stand_pg_client
  ensure_prisma_client
  ensure_test_db
  cd "$REPO_ROOT/backend"
  # jest's loadTestEnv lets backend/.env.test override DATABASE_URL, but not TEST_DATABASE_URL.
  DATABASE_URL="$TEST_DB_URL" TEST_DATABASE_URL="$TEST_DB_URL" exec npm test -- "$@"
}

cmd_e2e() {
  load_ports
  cd "$REPO_ROOT/frontend"
  HOST=127.0.0.1 PORT="$WEB_PORT" REACT_APP_API_URL="http://localhost:$API_PORT/api" \
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

cmd_exec_backend() {
  load_ports
  use_stand_pg_client
  ensure_prisma_client
  cd "$REPO_ROOT/backend"
  local load_env=()
  [ -f .env ] && load_env=(./node_modules/.bin/dotenv -e .env --)
  DATABASE_URL="$DEV_DB_URL" FRONTEND_URL="http://localhost:$WEB_PORT" \
    exec ${load_env[@]+"${load_env[@]}"} "$@"
}

cmd_down() {
  load_ports
  compose down --remove-orphans
  echo "Stopped $(project_name); data and port slot retained."
}

cmd_reset() {
  if [ "${1:-}" != "--yes" ]; then
    echo "Deletes BOTH local databases of this checkout. Use: bash scripts/dev-stack.sh reset --yes" >&2
    exit 1
  fi
  load_ports
  compose down -v --remove-orphans
  free_idx
  echo "Deleted data for $(project_name) and released its slot."
}

usage() {
  sed -nE '2,7{s/^# ?//p}' "${BASH_SOURCE[0]}"
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
  reset) shift; cmd_reset "$@" ;;
  seed) cmd_exec_backend npm run db:seed ;;
  exec-backend) shift; cmd_exec_backend "$@" ;;
  help|--help|-h) usage ;;
  *) usage >&2; exit 1 ;;
esac
