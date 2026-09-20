#!/bin/sh
set -eu

APPLY=0
PROTECT_MAIN=0
REPO=""

usage() {
  cat <<'EOF'
Usage:
  ./scripts/github-public-finalize.sh [--repo OWNER/NAME] [--apply] [--protect-main]

Without --apply, prints public-release readiness only.

--apply:
  Requires the repository to already be public, then enables GitHub security
  settings that are unavailable or incomplete while the repository is private.

--protect-main:
  Optional. Requires --apply. Enables branch protection that requires all four
  CI matrix checks. This changes the maintainer workflow: direct pushes to main
  may no longer be accepted until required checks are satisfied.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --repo)
      [ "$#" -ge 2 ] || { echo "--repo requires OWNER/NAME" >&2; exit 2; }
      REPO=$2; shift 2 ;;
    --apply)
      APPLY=1; shift ;;
    --protect-main)
      PROTECT_MAIN=1; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2 ;;
  esac
done

command -v gh >/dev/null 2>&1 || { echo "gh CLI is required" >&2; exit 2; }

if [ -z "$REPO" ]; then
  REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
fi

VISIBILITY=$(gh api "repos/$REPO" --jq .visibility)
FORK=$(gh api "repos/$REPO" --jq .fork)
echo "REPO=$REPO"
echo "VISIBILITY=$VISIBILITY"
echo "FORK=$FORK"

[ "$FORK" = "false" ] || { echo "PUBLIC_FINALIZE_REFUSED_FORK"; exit 3; }

if [ "$VISIBILITY" != "public" ]; then
  echo "OWNER_PUBLIC_VISIBILITY_GATE_PENDING"
  [ "$APPLY" -eq 0 ] && exit 0
  exit 3
fi

echo "OWNER_PUBLIC_VISIBILITY_GATE_PASS"

[ "$APPLY" -eq 1 ] || {
  echo "PUBLIC_FINALIZE_CHECK_PASS"
  exit 0
}

gh api --method PUT "repos/$REPO/vulnerability-alerts" >/dev/null
gh api --method PUT "repos/$REPO/automated-security-fixes" >/dev/null
gh api --method PUT "repos/$REPO/private-vulnerability-reporting" >/dev/null

cat > /tmp/dc-public-topics.json <<'JSON'
{
  "names": [
    "mcp",
    "model-context-protocol",
    "self-hosted",
    "automation",
    "terminal",
    "ssh",
    "developer-tools",
    "macos"
  ]
}
JSON
gh api --method PUT "repos/$REPO/topics" --input /tmp/dc-public-topics.json >/dev/null
rm -f /tmp/dc-public-topics.json

echo "PUBLIC_SECURITY_SETTINGS_PASS"

if [ "$PROTECT_MAIN" -eq 1 ]; then
  cat > /tmp/dc-main-protection.json <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ubuntu-latest / Node 20",
      "ubuntu-latest / Node 24",
      "macos-latest / Node 20",
      "macos-latest / Node 24"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_conversation_resolution": true,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false
}
JSON
  gh api --method PUT "repos/$REPO/branches/main/protection" --input /tmp/dc-main-protection.json >/dev/null
  rm -f /tmp/dc-main-protection.json
  echo "MAIN_PROTECTION_PASS"
else
  echo "MAIN_PROTECTION_NOT_REQUESTED"
fi

echo "PUBLIC_FINALIZE_PASS"
