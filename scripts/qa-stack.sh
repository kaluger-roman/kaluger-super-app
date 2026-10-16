#!/usr/bin/env bash
# Isolated QA Docker stack manager for /qa-roam and /manual-qa.
#
# One throwaway stack (web + backend + postgres) per git branch, namespaced by a
# `qa-<branch>` compose project so several branches/worktrees run in parallel
# without fighting over ports or the database. Only the web container publishes a
# port, and it's ephemeral — `up` prints the assigned URL as JSON.
#
# Commands:
#   up             Build + start the stack for the current branch; wait until ready; print JSON.
#   port           Print {project,url} for the current branch's stack.
#   status         `docker compose ps` for the current branch's stack.
#   exec-backend C Run shell command C inside the backend container (data prep, Prisma).
#   psql SQL       Run SQL inside the db container (psql -c).
#   down           Stop the current branch's stack and delete its volume + env file.
#   down-all       Stop every qa-* stack on this machine.
#
# Examples:
#   bash scripts/qa-stack.sh up
#   bash scripts/qa-stack.sh exec-backend 'node -e "const {PrismaClient}=require(\"@prisma/client\"); ..."'
#   bash scripts/qa-stack.sh psql "select email from users limit 5;"
#   bash scripts/qa-stack.sh down
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.qa.yml"
QA_DIR="$REPO_ROOT/.qa"

# Fixed throwaway QA credentials (not secret — the db is internal-only and wiped on `down`).
QA_VAPID_PUBLIC='BPe1DcCme7BoVKqcMiVwMQtqeDglE5ArNF3RrwOZx7gPF388G0crZSGuU5nk7zfBlRS1KR3bUsYJQcf0dXbsCks'
QA_VAPID_PRIVATE='pSmAl97lhfsjPjEwbO98iQuGujD-hWKUv_0bW1Or_d4'
# bcrypt of QA_ADMIN_PASSWORD below — single-quoted so the $ segments stay literal.
QA_ADMIN_HASH='$2b$10$SKdFeBdDQLpI1F7HL4Lscux5U28ZAj204ttlXRDppFKEBAfbPzZy6'
QA_ADMIN_EMAIL='admin@qa.local'
QA_ADMIN_PASSWORD='QaAdmin!2026'

sanitize() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's#[^a-z0-9]+#-#g; s#^-+##; s#-+$##'
}

current_branch() {
  git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached"
}

project_name() {
  echo "qa-$(sanitize "$(current_branch)")"
}

env_file_for() {
  echo "$QA_DIR/$1.env"
}

ensure_env_file() {
  local proj="$1" ef
  ef="$(env_file_for "$proj")"
  mkdir -p "$QA_DIR"
  if [ -f "$ef" ]; then
    echo "$ef"
    return
  fi
  {
    echo "POSTGRES_USER=qa"
    echo "POSTGRES_PASSWORD=qa"
    echo "POSTGRES_DB=tutor_app"
    echo "DATABASE_URL=postgresql://qa:qa@db:5432/tutor_app?schema=public"
    echo "JWT_SECRET=$(openssl rand -hex 32)"
    echo "ADMIN_JWT_SECRET=$(openssl rand -hex 32)"
    echo "STUDENT_JWT_SECRET=$(openssl rand -hex 32)"
    echo "RESEND_API_KEY=qa-dummy-resend-key"
    echo "EMAIL_FROM=qa@local.test"
    echo "FRONTEND_URL=http://localhost"
    echo "VAPID_PUBLIC_KEY=$QA_VAPID_PUBLIC"
    echo "VAPID_PRIVATE_KEY=$QA_VAPID_PRIVATE"
    echo "VAPID_SUBJECT=mailto:qa@local.test"
    echo "ADMIN_EMAIL=$QA_ADMIN_EMAIL"
    echo "ADMIN_PASSWORD=$QA_ADMIN_PASSWORD"
    # Escape $ as $$ so Compose's env-file interpolation emits the literal bcrypt hash.
    echo "ADMIN_PASSWORD_HASH=$(printf '%s' "$QA_ADMIN_HASH" | sed 's/[$]/$$/g')"
  } > "$ef"
  echo "$ef"
}

web_port() {
  docker compose -p "$1" -f "$COMPOSE_FILE" port web 80 2>/dev/null \
    | sed -nE 's/.*:([0-9]+)$/\1/p' | head -1 || true
}

cmd_up() {
  local proj ef port deadline
  proj="$(project_name)"
  ef="$(ensure_env_file "$proj")"
  docker compose -p "$proj" --env-file "$ef" -f "$COMPOSE_FILE" up -d --build >&2

  deadline=$(( $(date +%s) + 360 ))
  while :; do
    port="$(web_port "$proj")"
    if [ -n "${port:-}" ] && curl -fsS -o /dev/null "http://localhost:$port/" 2>/dev/null; then
      break
    fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
      docker compose -p "$proj" -f "$COMPOSE_FILE" ps >&2 || true
      printf '{"error":"timeout waiting for QA stack to become ready","project":"%s"}\n' "$proj"
      return 1
    fi
    sleep 2
  done

  printf '{"project":"%s","branch":"%s","url":"http://localhost:%s","adminEmail":"%s","adminPassword":"%s","envFile":"%s"}\n' \
    "$proj" "$(current_branch)" "$port" "$QA_ADMIN_EMAIL" "$QA_ADMIN_PASSWORD" "$ef"
}

cmd_port() {
  local proj port
  proj="$(project_name)"
  port="$(web_port "$proj")"
  if [ -z "${port:-}" ]; then
    printf '{"error":"stack not running — run: bash scripts/qa-stack.sh up","project":"%s"}\n' "$proj"
    return 1
  fi
  printf '{"project":"%s","url":"http://localhost:%s"}\n' "$proj" "$port"
}

cmd_status() {
  docker compose -p "$(project_name)" -f "$COMPOSE_FILE" ps
}

cmd_exec_backend() {
  local proj ef
  proj="$(project_name)"
  ef="$(ensure_env_file "$proj")"
  docker compose -p "$proj" --env-file "$ef" -f "$COMPOSE_FILE" exec -T backend sh -lc "$1"
}

cmd_psql() {
  local proj ef
  proj="$(project_name)"
  ef="$(ensure_env_file "$proj")"
  docker compose -p "$proj" --env-file "$ef" -f "$COMPOSE_FILE" exec -T db \
    psql -U qa -d tutor_app -c "$1"
}

cmd_down() {
  local proj ef
  proj="$(project_name)"
  ef="$(env_file_for "$proj")"
  if [ -f "$ef" ]; then
    docker compose -p "$proj" --env-file "$ef" -f "$COMPOSE_FILE" down -v --remove-orphans
    rm -f "$ef"
  else
    docker compose -p "$proj" -f "$COMPOSE_FILE" down -v --remove-orphans
  fi
  echo "down: $proj"
}

cmd_down_all() {
  docker compose ls --all --format json 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{(JSON.parse(s)||[]).forEach(p=>{if(p.Name&&p.Name.indexOf("qa-")===0)console.log(p.Name)})}catch{}})' \
    | while read -r name; do
        docker compose -p "$name" -f "$COMPOSE_FILE" down -v --remove-orphans || true
        echo "down: $name"
      done
  rm -f "$QA_DIR"/*.env 2>/dev/null || true
}

usage() {
  sed -nE 's/^# ?//; 1,30{/^Isolated|^One |^Commands:|^  [a-z]|^Examples:|^  bash/p}' "${BASH_SOURCE[0]}"
}

case "${1:-help}" in
  up) cmd_up ;;
  port) cmd_port ;;
  status) cmd_status ;;
  exec-backend) shift; cmd_exec_backend "$*" ;;
  psql) shift; cmd_psql "$*" ;;
  down) cmd_down ;;
  down-all) cmd_down_all ;;
  *) usage ;;
esac
