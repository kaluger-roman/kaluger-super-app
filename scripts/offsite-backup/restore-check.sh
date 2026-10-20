#!/usr/bin/env bash
# Home side, hourly from crontab (self-throttled to once per
# OFFSITE_RESTORE_INTERVAL_HOURS): restore the newest intact copy into a
# throwaway Postgres 16 container without network, check that users, students
# and lessons are present and non-empty, and report the result to prod.
# Usage: restore-check.sh [--force]. See docs/ops/offsite-backups.md.
set -euo pipefail

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

readonly CONTAINER_LABEL=offsite-restore-check
readonly RESTORE_DB=restore_check
readonly CHECKED_TABLES=(users students lessons)
readonly STAMP_FILE="$OFFSITE_DEST/.last-restore-check"
readonly OWNER_ROLE_RE='^"?[A-Za-z0-9_-]+"?$'
readonly OWNER_DDL_RE='^ALTER [A-Z ]+ .+ OWNER TO [^;]+;$'

LOG_FILE="$OFFSITE_DEST/logs/restore-check.log"

usage() {
  echo "usage: restore-check.sh [--force]" >&2
  exit 2
}

force=0
case $# in
  0) ;;
  1) [[ $1 == --force ]] || usage; force=1 ;;
  *) usage ;;
esac

mkdir -p "$OFFSITE_DEST/logs"
# The stamp gets the start time so the hourly cron keeps a 24 h period
# instead of drifting by the run length every day.
started=$(now_epoch)

if ((!force)) && [[ -f $STAMP_FILE ]]; then
  # 30 min slack: the hourly cron must not miss the 24 h mark by a second.
  if (($(now_epoch) - $(stat -c %Y "$STAMP_FILE") < OFFSITE_RESTORE_INTERVAL_HOURS * 3600 - 1800)); then
    exit 0
  fi
fi

if ! acquire_lock_wait 1800; then
  log ERROR "skip: could not take the lock within 30 minutes"
  exit 1
fi

container=""
details=$(mktemp)

remove_container() {
  if [[ -n $container ]]; then
    docker_bounded rm -fv "$container" >/dev/null 2>&1 || true
    container=""
  fi
}

cleanup() {
  remove_container
  rm -f "$details"
}
trap cleanup EXIT

remove_leftover_containers() {
  local id
  for id in $(docker_bounded ps -aq --filter "label=$CONTAINER_LABEL" 2>/dev/null || true); do
    docker_bounded rm -fv "$id" >/dev/null 2>&1 || true
  done
}

docker_bounded() {
  timeout "$OFFSITE_QUERY_TIMEOUT" docker "$@"
}

psql_in_container() {
  docker_bounded exec "$container" psql -v ON_ERROR_STOP=1 -q -U postgres "$@"
}

# The image initialises through a temporary socket-only server and then
# restarts; a TCP probe on loopback only succeeds for the final server.
wait_for_postgres() {
  local attempt
  for ((attempt = 1; attempt <= OFFSITE_PG_READY_TIMEOUT; attempt++)); do
    if docker_bounded exec "$container" pg_isready -q -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
      return 0
    fi
    if ((attempt < OFFSITE_PG_READY_TIMEOUT)); then
      sleep 1
    fi
  done
  return 1
}

# The dump keeps `ALTER ... OWNER TO <role>` statements; the fresh image only
# has postgres. Only DDL lines count: COPY data may contain the same words.
create_owner_roles() {
  local role
  local -a statements=()
  while IFS= read -r role; do
    [[ -n $role ]] || continue
    if [[ ! $role =~ $OWNER_ROLE_RE ]]; then
      log WARN "skipping unexpected owner role in the dump: $role"
      continue
    fi
    role=${role//\"/}
    [[ $role != postgres ]] || continue
    statements+=(-c "CREATE ROLE \"$role\"")
  done < <(zcat -- "$1" | grep -E "$OWNER_DDL_RE" | sed -E 's/.* OWNER TO //; s/;$//' | sort -u)

  ((${#statements[@]} > 0)) || return 0
  if ((${#statements[@]} / 2 > OFFSITE_MAX_OWNER_ROLES)); then
    echo "too many owner roles in the dump: $((${#statements[@]} / 2))" >"$details"
    return 1
  fi
  # One bounded psql call for all roles.
  psql_in_container -d postgres "${statements[@]}" </dev/null >/dev/null 2>"$details"
}

report=()

fail() {
  report=(error "$1" "$2")
  log ERROR "check failed for $1: $2${3:+ ($3)}"
}

check_newest_copy() {
  local name
  name=$(newest_backup "$OFFSITE_DEST")
  if [[ -z $name ]]; then
    fail - no_copy
    return
  fi
  local path="$OFFSITE_DEST/$name"
  log INFO "checking $name"

  local epoch
  epoch=$(backup_epoch "$name")
  if (($(now_epoch) - epoch > OFFSITE_STALE_COPY_HOURS * 3600)); then
    fail "$name" stale_copy "newest copy is older than ${OFFSITE_STALE_COPY_HOURS} h"
    return
  fi

  if ! gzip -t "$path" 2>/dev/null; then
    fail "$name" gzip_corrupt
    return
  fi

  remove_leftover_containers
  if ! container=$(docker_bounded run -d --rm --label "$CONTAINER_LABEL" --network none \
    --memory "$OFFSITE_PG_MEMORY" --memory-swap "$OFFSITE_PG_MEMORY" --cpus 2 --pids-limit 512 \
    --security-opt no-new-privileges \
    --tmpfs "/var/lib/postgresql/data:rw,size=$OFFSITE_PG_DATA_SIZE" \
    -e POSTGRES_HOST_AUTH_METHOD=trust "$OFFSITE_PG_IMAGE" 2>"$details"); then
    container=""
    fail "$name" docker_failed "$(tail -n 3 "$details" | tr '\n' ' ')"
    return
  fi
  if ! wait_for_postgres; then
    fail "$name" docker_failed "postgres did not become ready in ${OFFSITE_PG_READY_TIMEOUT}s"
    return
  fi
  if ! docker_bounded exec "$container" createdb -U postgres "$RESTORE_DB" >/dev/null 2>"$details"; then
    fail "$name" docker_failed "$(tail -n 3 "$details" | tr '\n' ' ')"
    return
  fi

  if ! create_owner_roles "$path"; then
    fail "$name" restore_failed "$(tail -n 3 "$details" | tr '\n' ' ')"
    return
  fi
  if ! zcat -- "$path" | timeout "$OFFSITE_RESTORE_TIMEOUT" docker exec -i "$container" \
    psql -v ON_ERROR_STOP=1 -q -U postgres -d "$RESTORE_DB" >/dev/null 2>"$details"; then
    fail "$name" restore_failed "$(tail -n 3 "$details" | tr '\n' ' ')"
    return
  fi

  local table exists count
  local -a counts=()
  for table in "${CHECKED_TABLES[@]}"; do
    if ! exists=$(psql_in_container -d "$RESTORE_DB" -tAc \
      "SELECT to_regclass('public.$table') IS NOT NULL" 2>"$details"); then
      fail "$name" query_failed "$(tail -n 3 "$details" | tr '\n' ' ')"
      return
    fi
    if [[ $exists != t ]]; then
      fail "$name" "missing_table_$table"
      return
    fi
    if ! count=$(psql_in_container -d "$RESTORE_DB" -tAc \
      "SELECT count(*) FROM public.$table" 2>"$details") || [[ ! $count =~ ^[0-9]+$ ]]; then
      fail "$name" query_failed "$(tail -n 3 "$details" | tr '\n' ' ')"
      return
    fi
    if ((count == 0)); then
      fail "$name" "empty_table_$table"
      return
    fi
    counts+=("$count")
  done

  report=(success "$name" "${counts[@]}")
  log INFO "check passed for $name: users ${counts[0]}, students ${counts[1]}, lessons ${counts[2]}"
}

check_newest_copy
remove_container

report_status=0
# shellcheck disable=SC2029 # the report is plain words, expanded locally on purpose
ssh "${SSH_OPTS[@]}" "$OFFSITE_HOST" report-restore-check "${report[@]}" \
  </dev/null >/dev/null 2>"$details" || report_status=$?
if ((report_status != 0)); then
  log ERROR "could not report the result to prod (exit $report_status): $(tail -n 3 "$details" | tr '\n' ' ')"
  exit 1
fi

# stale_copy needs no docker and should clear as soon as a pull brings a fresh
# copy, so it does not start the 24 h pause.
if [[ ${report[2]:-} != stale_copy ]]; then
  touch -d "@$started" "$STAMP_FILE"
fi
log INFO "reported to prod: ${report[*]}"

if [[ ${report[0]} != success ]]; then
  exit 1
fi
