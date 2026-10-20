#!/usr/bin/env bash
# Home side, hourly from crontab: pull new prod backups over the restricted
# offsite key, verify them with gzip -t and apply the home retention
# (90 days, 20 GiB cap, newest copy always kept). See docs/ops/offsite-backups.md.
set -euo pipefail

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

LOG_FILE="$OFFSITE_DEST/logs/pull.log"
mkdir -p "$OFFSITE_DEST/logs"

if [[ $# -gt 0 ]]; then
  echo "usage: pull-backups.sh" >&2
  exit 2
fi

if ! acquire_lock_nowait; then
  log INFO "skip: another offsite backup run is in progress"
  exit 0
fi

transfer_list=$(mktemp)
rsync_errors=$(mktemp)
trap 'rm -f "$transfer_list" "$rsync_errors"' EXIT

pulled=0
corrupt=0
deleted=0
oversized=0
readonly VERIFIED_FILE="$OFFSITE_DEST/.verified"

# Only top-level files with the exact backup name format, dated inside the
# home retention window (and not in the future), are requested, so files the
# retention already removed are not pulled again. Directories are excluded
# first: patterns without a leading slash would also match inside them.
window_filters() {
  local now first last day date
  local time='T[0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  now=$(now_epoch)
  first=$(((now - OFFSITE_RETENTION_DAYS * 86400) / 86400 + 1))
  last=$(((now + OFFSITE_FUTURE_SKEW_SECONDS) / 86400))
  printf -- '--exclude=*/\n'
  for ((day = first; day <= last; day++)); do
    date=$(date -u -d "@$((day * 86400))" +%F)
    printf -- '--include=/backup-%s%sZ.sql.gz\n' "$date" "$time"
    printf -- '--include=/backup-%s%s-[0-9][0-9][0-9]Z.sql.gz\n' "$date" "$time"
  done
  printf -- '--exclude=*\n'
}

# rsync splits -e on spaces and honours quotes but not backslashes.
ssh_command() {
  local opt command=ssh
  for opt in "${SSH_OPTS[@]}"; do
    if [[ $opt == *"'"* ]]; then
      log ERROR "ssh option contains a single quote: $opt"
      return 1
    fi
    command+=" '$opt'"
  done
  printf '%s' "$command"
}

pull() {
  local status=0 ssh_cmd
  local -a filters
  ssh_cmd=$(ssh_command) || return 1
  mapfile -t filters < <(window_filters)
  # No --delete: copies stay at home after prod rotates them out.
  # --ignore-existing: backups never change after the rename on prod, so prod
  # must not be able to overwrite a copy that is already here.
  # No --partial: an interrupted transfer leaves nothing under the final name.
  rsync -rt --ignore-existing --max-size="$OFFSITE_MAX_FILE_SIZE" --info=skip1 --out-format=%n \
    "${filters[@]}" -e "$ssh_cmd" "$OFFSITE_HOST:./" "$OFFSITE_DEST/" \
    >"$transfer_list" 2>"$rsync_errors" || status=$?
  if ((status != 0)); then
    log ERROR "rsync failed with exit code $status: $(tail -n 5 "$rsync_errors" | tr '\n' ' ')"
    return 1
  fi
}

verify_pulled() {
  local name epoch latest
  latest=$(($(now_epoch) + OFFSITE_FUTURE_SKEW_SECONDS))
  while IFS= read -r name; do
    if [[ $name == *" is over max-size" ]]; then
      oversized=$((oversized + 1))
      log ERROR "refused, over $OFFSITE_MAX_FILE_SIZE: ${name% is over max-size}"
      continue
    fi
    [[ $name == *.sql.gz && $name != */* && -f $OFFSITE_DEST/$name ]] || continue
    pulled=$((pulled + 1))
    # Retention never sees unrecognised or future names, so they must not stay.
    if epoch=$(backup_epoch "$name") && ((epoch <= latest)); then
      log INFO "pulled $name"
    else
      rm -f -- "${OFFSITE_DEST:?}/$name"
      log ERROR "unexpected name removed: $name"
    fi
  done <"$transfer_list"
}

# gzip -t every copy not yet in the .verified ledger (new pulls, and copies a
# crashed run left unchecked); broken ones are removed so the next pull
# fetches them again.
verify_copies() {
  local -A verified=()
  local name epoch size
  if [[ -f $VERIFIED_FILE ]]; then
    while IFS= read -r name; do
      [[ -n $name ]] && verified[$name]=1
    done <"$VERIFIED_FILE"
  fi

  local ledger
  ledger=$(mktemp "$OFFSITE_DEST/.verified.XXXXXX")
  while read -r epoch size name; do
    if [[ -n ${verified[$name]:-} ]] || gzip -t "$OFFSITE_DEST/$name" 2>/dev/null; then
      printf '%s\n' "$name" >>"$ledger"
    else
      rm -f -- "${OFFSITE_DEST:?}/$name"
      corrupt=$((corrupt + 1))
      log ERROR "corrupt archive removed: $name"
    fi
  done < <(list_backups "$OFFSITE_DEST")
  mv -f "$ledger" "$VERIFIED_FILE"
}

delete_copy() {
  rm -f -- "${OFFSITE_DEST:?}/$1"
  deleted=$((deleted + 1))
  log INFO "deleted $1 ($2)"
}

apply_retention() {
  local newest
  newest=$(newest_backup "$OFFSITE_DEST")
  [[ -n $newest ]] || return 0

  local cutoff=$(($(now_epoch) - OFFSITE_RETENTION_DAYS * 86400))
  local -a kept_names=() kept_sizes=()
  local epoch size name total=0

  while read -r epoch size name; do
    if [[ $name != "$newest" ]] && ((epoch < cutoff)); then
      delete_copy "$name" "older than $OFFSITE_RETENTION_DAYS days"
    else
      kept_names+=("$name")
      kept_sizes+=("$size")
      total=$((total + size))
    fi
  done < <(list_backups "$OFFSITE_DEST")

  local i
  for i in "${!kept_names[@]}"; do
    ((total > OFFSITE_MAX_BYTES)) || break
    [[ ${kept_names[$i]} != "$newest" ]] || continue
    delete_copy "${kept_names[$i]}" "over the $OFFSITE_MAX_BYTES byte cap"
    total=$((total - kept_sizes[i]))
  done

  total_mb=$(awk -v bytes="$total" 'BEGIN { printf "%.1f", bytes / 1048576 }')
}

total_mb=0
verify_copies
if ! pull; then
  # Files rsync finished before failing are kept, so check them now.
  verify_pulled
  verify_copies
  exit 1
fi
verify_pulled
verify_copies
apply_retention
log INFO "done: pulled $pulled, corrupt $corrupt, deleted $deleted, total $total_mb MB"

if ((corrupt > 0 || oversized > 0)); then
  exit 1
fi
