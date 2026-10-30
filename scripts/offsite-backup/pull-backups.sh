#!/usr/bin/env bash
# Home side, hourly from crontab: pull new prod backups over the restricted
# offsite key, verify them with gzip -t, apply the home retention (90 days,
# 20 GiB cap, newest copy always kept) and report the disk space to prod.
# See docs/ops/offsite-backups.md.
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
report_errors=$(mktemp)
trap 'rm -f "$transfer_list" "$rsync_errors" "$report_errors"' EXIT

pulled=0
corrupt=0
deleted=0
deleted_by_cap=0
oversized=0
total=0
cap_pruned=0
new_copies=()
readonly VERIFIED_FILE="$OFFSITE_DEST/.verified"
readonly CAP_PRUNED_FILE="$OFFSITE_DEST/.cap-pruned"

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
      new_copies+=("$name")
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
  local epoch size name
  total=0

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
    deleted_by_cap=$((deleted_by_cap + 1))
    total=$((total - kept_sizes[i]))
  done

  total_mb=$(awk -v bytes="$total" 'BEGIN { printf "%.1f", bytes / 1048576 }')
}

# Sets cap_pruned to 1 if the cap deleted copies. Sticky across runs that
# added no copy: at the cap only the run that brings a new copy deletes an old
# one, and the runs in between must not report "nothing pruned".
update_cap_pruned() {
  local name added=0
  for name in "${new_copies[@]}"; do
    if [[ -f $OFFSITE_DEST/$name ]]; then
      added=$((added + 1))
    fi
  done

  cap_pruned=0
  if ((deleted_by_cap > 0)); then
    cap_pruned=1
  elif ((added == 0)) && [[ $(cat "$CAP_PRUNED_FILE" 2>/dev/null || true) == 1 ]]; then
    cap_pruned=1
  fi
  if ((deleted_by_cap > 0 || added > 0)); then
    printf '%s\n' "$cap_pruned" >"$CAP_PRUNED_FILE" ||
      log ERROR "could not write $CAP_PRUNED_FILE"
  fi
}

# Never changes the exit status of the run: a report that does not reach prod
# is only logged (prod then keeps the previous report).
report_storage() {
  local df_output free="" size="" status=0
  update_cap_pruned

  df_output=$(df -B1 --output=avail,size "$OFFSITE_DEST" 2>"$report_errors") || status=$?
  if ((status != 0)); then
    log ERROR "could not report storage to prod (exit $status): df: $(tail -n 3 "$report_errors" | tr '\n' ' ')"
    return 0
  fi
  read -r free size _ <<<"${df_output##*$'\n'}" || true
  if [[ ! $free =~ ^[0-9]+$ || ! $size =~ ^[0-9]+$ ]]; then
    log ERROR "could not report storage to prod (exit 1): unexpected df output: $df_output"
    return 0
  fi

  # shellcheck disable=SC2029 # the report is plain words, expanded locally on purpose
  ssh "${SSH_OPTS[@]}" "$OFFSITE_HOST" report-storage "$free" "$size" "$total" \
    "$OFFSITE_MAX_BYTES" "$cap_pruned" </dev/null >/dev/null 2>"$report_errors" || status=$?
  if ((status != 0)); then
    log ERROR "could not report storage to prod (exit $status): $(tail -n 3 "$report_errors" | tr '\n' ' ')"
    return 0
  fi
  log INFO "reported storage: free $free, total $size, backups $total, cap pruned $cap_pruned"
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
report_storage

if ((corrupt > 0 || oversized > 0)); then
  exit 1
fi
