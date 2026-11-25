#!/usr/bin/env bash
set -euo pipefail
umask 077

runtime=${1:?pass the absolute .production directory}
deploy="$runtime/deploy"
source "$deploy/github-deploy.sh"
port=$(sed -n 's/^PROD_PORT=//p' "$runtime/compose.env")
[[ -z $port || $port =~ ^[0-9]+$ ]]
exec 9>"$deploy/deploy.lock"
flock -n 9 || exit 0

current=$(cat "$runtime/edge/state/revision" 2>/dev/null || true)
if [[ $current =~ ^[0-9a-f]{40}$ && $(cat "$deploy/cutover" 2>/dev/null || true) == "$current" ]]; then
  rm -f "$deploy/cutover"
fi

# Docker can try to restore published ports before Wi-Fi and Tailscale rebind.
# Reconcile only web after the backend is available and both addresses exist.
active="$deploy/active"
if [[ ! -d $active ]]; then active=$(dirname "$runtime"); fi
if [[ ! -e $deploy/cutover ]] &&
   ! curl -fsS --max-time 4 "http://127.0.0.1:${port:-8080}/health" >/dev/null 2>&1 &&
   [[ $(docker inspect --format '{{.State.Health.Status}}' super-app-production-backend-1) == healthy ]]; then
  release_env=(--env-file "$runtime/compose.env")
  if [[ -f $active/.release.env ]]; then release_env+=(--env-file "$active/.release.env"); fi
  docker compose "${release_env[@]}" \
    -f "$active/docker-compose.production.yml" \
    up -d --no-deps --no-build --wait --wait-timeout 90 --force-recreate web ||
    echo 'Web recovery deferred; checking for a newer deployment' >&2
fi

candidate=$(github_get 'actions/workflows/deploy.yml/runs?branch=main&status=in_progress&per_page=1' \
  | python3 -c '
import json, re, sys

for run in json.load(sys.stdin)["workflow_runs"]:
    sha = run.get("head_sha", "")
    if (run["head_branch"] == "main" and run["event"] in ("push", "workflow_dispatch")
        and (run.get("head_repository") or {}).get("full_name") == sys.argv[1]
        and re.fullmatch(r"[0-9a-f]{40}", sha)):
        print(run["id"], run["run_attempt"], sha)
' "$repository")
[[ -n $candidate ]] || exit 0
read -r run_id run_attempt revision <<<"$candidate"
[[ $run_id =~ ^[0-9]+$ && $run_attempt =~ ^[0-9]+$ && $revision =~ ^[0-9a-f]{40}$ ]]
attempt="$run_id/$run_attempt"

[[ $revision != "$current" ]] || exit 0
attempt_file="$deploy/last-attempt"
[[ $(cat "$attempt_file" 2>/dev/null || true) != "$attempt" ]] || exit 0

# GitHub starts this job only after the build matrix succeeds for this run.
deploy_job_ready "$run_id" "$run_attempt" "$revision" || exit 0

repo="$deploy/repo.git"
if [[ ! -d $repo/objects ]]; then git init -q --bare "$repo"; fi
git -C "$repo" config remote.origin.url "https://github.com/$repository.git"
timeout 90 git -C "$repo" fetch -q --depth=1 --no-tags origin \
  '+refs/heads/main:refs/kaluger/main'
[[ $(git -C "$repo" rev-parse refs/kaluger/main) == "$revision" ]] || exit 0

# An ordinary failure requires a new Actions attempt; a reboot can resume this one.
printf 'Deploying %s from Actions %s at %s\n' "$revision" "$attempt" "$(date -u +%FT%TZ)"
result=0
bash "$deploy/deploy-release.sh" "$runtime" "$repo" "$revision" "$run_id" "$run_attempt" || result=$?
printf '%s\n' "$attempt" >"$attempt_file.new"
mv -f "$attempt_file.new" "$attempt_file"
exit "$result"
