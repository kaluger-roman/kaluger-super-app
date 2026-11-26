# Sourced by the deploy poller and release script on the production host.
repository='kaluger-roman/kaluger-super-app'

github_get() {
  curl -fsS --proto '=https' --connect-timeout 6 --max-time 20 \
    -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$repository/$1"
}

deploy_job_ready() {
  local run_id=$1 run_attempt=$2 sha=$3
  [[ $run_id =~ ^[0-9]+$ && $run_attempt =~ ^[0-9]+$ && $sha =~ ^[0-9a-f]{40}$ ]] || return 1
  github_get "actions/runs/$run_id/attempts/$run_attempt/jobs?per_page=50" | python3 -c '
import json, sys
jobs = json.load(sys.stdin)["jobs"]
sys.exit(not any(job["name"] == "Deploy on home" and job["status"] == "in_progress"
                 and job["head_sha"] == sys.argv[1] for job in jobs))
' "$sha"
}
