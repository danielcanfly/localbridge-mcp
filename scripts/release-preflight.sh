#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$REPO_ROOT"
fail() { echo "RELEASE_PREFLIGHT_FAIL: $*" >&2; exit 2; }

# All phases require a caller-owned scratch directory. Never fall back to /tmp.
: "${RELEASE_SCRATCH_ROOT:?set RELEASE_SCRATCH_ROOT to an isolated existing scratch directory}"
[ -d "$RELEASE_SCRATCH_ROOT" ] || fail "scratch directory missing"
[ ! -L "$RELEASE_SCRATCH_ROOT" ] || fail "scratch root must not be symlink"
SCRATCH=$(CDPATH= cd -- "$RELEASE_SCRATCH_ROOT" && pwd -P)
case "$SCRATCH" in "$REPO_ROOT"/*) ;; *) fail "scratch must be inside release worktree";; esac
case "$SCRATCH" in "$REPO_ROOT/.git"*) fail "scratch must not be inside .git";; esac
PHASE=${RELEASE_PHASE:-static}
case "$PHASE" in static|offline|network) ;; *) fail "invalid RELEASE_PHASE (static, offline, network)";; esac
BRANCH=${RELEASE_EXPECT_BRANCH:?set explicit expected review branch}
[ "$(git branch --show-current)" = "$BRANCH" ] || fail "unexpected branch"
# A scratch directory is the only permitted untracked exception.
[ -z "$(git diff --name-only)" ] && [ -z "$(git diff --cached --name-only)" ] || fail "tracked worktree is not clean"
SCRATCH_REL=${SCRATCH#"$REPO_ROOT"/}
[ -n "$SCRATCH_REL" ] || fail "scratch cannot be repository root"
UNTRACKED=$(git ls-files --others --exclude-standard) || fail "cannot inspect untracked paths"
if [ -n "$UNTRACKED" ]; then
  while IFS= read -r pending; do
    case "$pending" in "$SCRATCH_REL"/*) ;; *) fail "unexpected untracked source path: $pending";; esac
  done <<EOF
$UNTRACKED
EOF
fi
VERSION=${RELEASE_EXPECT_VERSION:?set expected package version}
[ "$(node -p "require('./package.json').version")" = "$VERSION" ] || fail "unexpected release version"
[ "$(node -p "String(require('./package.json').private)")" = true ] || fail "npm package must remain private"
[ "$(node -p "require('./package-lock.json').version")" = "$VERSION" ] || fail "lockfile version differs"
[ "$(node -p "require('./package-lock.json').packages[''].version")" = "$VERSION" ] || fail "lockfile root version differs"
if git ls-tree -r --name-only HEAD | grep -q '^gate/'; then fail "temporary gate scaffold must not ship"; fi
for required in LICENSE THIRD_PARTY_NOTICES.md SECURITY.md CONTRIBUTING.md CHANGELOG.md docs/RELEASE_PROCESS.md docs/qualification/RELEASE_STATUS.md docs/qualification/CONSTRUCTION_MATRIX.md; do
  [ -s "$required" ] || fail "missing release file: $required"
  git ls-files --error-unmatch "$required" >/dev/null 2>&1 || fail "required file is not tracked: $required"
done
RELEASE_NOTES="docs/releases/v$VERSION.md"
[ -s "$RELEASE_NOTES" ] || fail "missing version-specific release notes"
git ls-files --error-unmatch "$RELEASE_NOTES" >/dev/null 2>&1 || fail "release notes are not tracked"
if rg -n 'uses:[[:space:]]+[^#[:space:]]+@v[0-9]+' .github/workflows; then fail "floating GitHub Action found"; fi
node <<'NODE'
const fs=require('node:fs');
for(const file of fs.readdirSync('.github/workflows').filter(x=>/\.ya?ml$/.test(x))) {
 for(const line of fs.readFileSync('.github/workflows/'+file,'utf8').split(/\r?\n/)){
  const m=line.match(/uses:\s*([^\s#]+)@([^\s#]+)/);
  if(m && !/^[0-9a-f]{40}$/i.test(m[2])) { console.error('unpinned action', file, m[0]);process.exit(1); }
 }
}
NODE
HOME_NAME=$(basename "$HOME")
PATTERN="$HOME_NAME|asdk_app_[A-Za-z0-9_-]{8,}|tunnel_[0-9A-Fa-f]{16,}|gho_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|org-[A-Za-z0-9_-]{8,}"
if rg -q --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!.git' --glob '!.git/**' --glob '!package-lock.json' --glob '!gate/package-lock.json' --glob "!$SCRATCH_REL/**" "$PATTERN" .; then fail "current-tree privacy scan failed"; fi
# The v0.2.1 tag is an immutable, already-public author-history baseline.
# Preserve full-history secret/path scanning in the helper below. Reject every
# new non-noreply author or committer after this pinned release; never rewrite
# published tags.
LEGACY_COMMIT=8ce28f816c244ee0f209b3c46f4f17d25e1f3e77
[ "$(git rev-parse 'v0.2.1^{commit}')" = "$LEGACY_COMMIT" ] || fail "published author baseline tag drift"
node scripts/release-history-policy.mjs "$LEGACY_COMMIT" "$PATTERN" || fail "reachable-history privacy/author policy failed"
if git log HEAD --name-only --pretty=format: | grep -E '(^|/)(\.env|.*\.pem|.*\.key|credentials)(/|$)' | grep -q .; then fail "sensitive filename in history"; fi
git diff --check
git diff --cached --check
ARCHIVE="$SCRATCH/localbridge-mcp-v$VERSION-source.tar.gz"
git archive --format=tar.gz --prefix="localbridge-mcp-v$VERSION/" -o "$ARCHIVE" HEAD
SHA256=$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')
echo "RELEASE_SOURCE_ARCHIVE_SHA256=$SHA256"
echo "RELEASE_STATIC_SECURITY_PASS"
if [ "$PHASE" = static ]; then
 echo "RELEASE_PREFLIGHT_PARTIAL_STATIC_ONLY: dependency licenses/tests/network audit/archive rebuild NOT_RUN"
 exit 0
fi
[ -d node_modules ] || fail "approved offline dependencies missing"
node <<'NODE'
const fs=require('node:fs'),pkg=require('./package.json');
const allowed=new Set(['MIT','ISC','Apache-2.0','BSD-2-Clause','BSD-3-Clause']),seen=new Set();
function walk(name){
 if(seen.has(name))return;seen.add(name);
 const file='node_modules/'+name+'/package.json';
 if(!fs.existsSync(file))throw new Error('dependency metadata missing: '+name);
 const dep=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!allowed.has(dep.license))throw new Error('unreviewed license: '+name+' '+dep.license);
 for(const child of Object.keys(dep.dependencies||{}))walk(child);
}
for(const name of Object.keys(pkg.dependencies||{}))walk(name);
console.log('RELEASE_DEPENDENCY_LICENSE_PASS');
NODE
export TMPDIR="$SCRATCH"
export npm_config_cache="$SCRATCH/npm-cache"
export XDG_CACHE_HOME="$SCRATCH/xdg-cache"
export HOME="$SCRATCH/home"
mkdir -p "$HOME" "$npm_config_cache" "$XDG_CACHE_HOME"
npm test
if [ "$PHASE" = offline ]; then
 echo "RELEASE_PREFLIGHT_PARTIAL_OFFLINE: network audit/npm ci/archive rebuild NOT_RUN"
 exit 0
fi
[ "${RELEASE_ALLOW_NETWORK:-}" = YES ] || fail "network phase requires RELEASE_ALLOW_NETWORK=YES"
npm audit
REBUILD="$SCRATCH/archive-rebuild"
mkdir -p "$REBUILD/repo"
git archive --format=tar HEAD | tar -xf - -C "$REBUILD/repo"
(
  cd "$REBUILD/repo"
  export HOME="$SCRATCH/home"
  export TMPDIR="$SCRATCH"
  export npm_config_cache="$SCRATCH/npm-cache"
  export npm_config_userconfig="$SCRATCH/npmrc"
  npm ci --ignore-scripts --no-fund
  npm test
  npm audit
)
echo "RELEASE_VERSION=$VERSION"
echo "RELEASE_PREFLIGHT_PASS"
