# Contract: home storage report (`report-storage`)

Extends the forced command of the offsite key
(`scripts/offsite-backup/prod-ssh-wrapper.sh`, installed on prod as
`/usr/local/sbin/offsite-backup-ssh`) and the home pull script
(`scripts/offsite-backup/pull-backups.sh`). The two existing commands are
unchanged.

## Wrapper: new command

```
report-storage <freeBytes> <totalBytes> <backupsBytes> <capBytes> <capPruned>
```

- Same pre-checks as `report-restore-check`: `SSH_ORIGINAL_COMMAND` ≤ 256
  chars, charset `^[A-Za-z0-9_. -]+$`, no leading/trailing/repeated spaces.
- Exactly 6 tokens, else `deny "invalid report: wrong number of fields"`.
- Byte fields: `^[0-9]{1,15}$`, else `deny "invalid report: bad number"`;
  printed with `$((10#…))` (no leading zeros in JSON).
- `totalBytes` must be > 0, else `deny "invalid report: bad number"`.
- `capPruned`: `^[01]$`, else `deny "invalid report: bad flag"`.
- Action: write `$1/.offsite-storage.json` via `write_atomically` (tmp + `mv`):

  ```json
  {"reportedAt":"<utc_now>","freeBytes":F,"totalBytes":T,"backupsBytes":B,"capBytes":C,"capPruned":true|false}
  ```

- Exit 0 on success; `deny` → exit 1 with `offsite-backup-ssh: …` on stderr,
  file untouched.
- Dispatch: `"report-storage "*) report_storage ;;` in the final `case`.
  Header comment lists three allowed operations.

## Home: `pull-backups.sh`

After `apply_retention` in a run where `pull` succeeded (including runs that
then exit 1 because of corrupt or oversized files):

1. `cap_pruned`: `1` if this run deleted by cap; else, if this run pulled
   nothing new, the value from `$OFFSITE_DEST/.cap-pruned` (missing → `0`);
   else `0`. Write the result back to `.cap-pruned` when the run pulled ≥ 1
   copy or deleted by cap.
2. `read -r free size < <(df -B1 --output=avail,size "$OFFSITE_DEST" | tail -n 1)`.
3. `ssh "${SSH_OPTS[@]}" "$OFFSITE_HOST" report-storage "$free" "$size" "$total" "$OFFSITE_MAX_BYTES" "$cap_pruned" </dev/null`.
4. Failure (ssh or df) → `log ERROR "could not report storage to prod (exit N): …"`;
   the script's exit status is not changed by it (FR-014). Success →
   `log INFO "reported storage: free F, total T, backups B, cap pruned P"`.

`apply_retention` keeps `total` (bytes after retention) and counts cap
deletions separately from age deletions (`deleted_by_cap`).

## Tests (`scripts/__tests__/`)

- `offsite-backup-wrapper.test.mjs`: valid report → JSON with `reportedAt`
  ≈ now and numbers without leading zeros; each deny path (too few/many
  fields, non-numeric, 16 digits, `totalBytes` 0, flag `2`, extra spaces,
  `;`/`$`/`/` characters) leaves an existing file byte-identical.
- `offsite-backup-pull.test.mjs`: successful pull sends the report (file on
  fake prod matches `df` stub numbers and retention total); cap deletion →
  `capPruned: true`, next run without new copies keeps `true`, next run with
  a new copy and no cap deletion → `false`; ssh failure on the report only
  (stub mode) → pull still exits 0 and `.offsite-last-pull` updated, ERROR in
  `pull.log`; failed pull → no report.
- Fixture: `df` stub printing a header and `"$DF_STUB_AVAIL $DF_STUB_SIZE"`;
  the `ssh` stub needs a way to fail only `report-storage`
  (e.g. `SSH_STUB_FAIL_PATTERN`).

## Ops doc (`docs/ops/offsite-backups.md`, FR-015)

- "Where things are": add `.offsite-storage.json` (prod) and `.cap-pruned`
  (home).
- Setup step 3: refusal check `$SSH report-storage 1 2 3` → `invalid report:
  wrong number of fields`.
- "Admin warnings": replace with the alert types that concern offsite
  (`offsite_stale`, `offsite_disk_space_low`, `offsite_cap_reached`,
  `restore_check_failed`, `restore_check_stale`) and where to look; mention
  the «Алерты» tab and letters.
- "Updating": a section "After 037-admin-alerts" — reinstall the wrapper on
  prod (step 2) and the home scripts (step 4); until then the two home-disk
  checks simply do not run.
- "Disabling": three dot-files instead of two.
