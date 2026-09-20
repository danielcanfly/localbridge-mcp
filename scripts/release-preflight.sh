#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$REPO_ROOT"

fail() {
  echo "RELEASE_PREFLIGHT_FAIL: $*" >&2
  exit 2
}

[ "$(git branch --show-current)" = "main" ] || fail "release preflight must run on main"
[ -z "$(git status --porcelain)" ] || fail "worktree is not clean"

VERSION=$(node -p "require('./package.json').version")
PRIVATE=$(node -p "String(require('./package.json').private)")
case "$VERSION" in
  0.2.0) ;;
  *) fail "unexpected release version: $VERSION" ;;
esac
[ "$PRIVATE" = "true" ] || fail "npm package must remain private"

if git ls-tree -r --name-only HEAD | grep -q '^gate/'; then
  fail "temporary P1 gate scaffold must not ship in the release tree"
fi

npm test
npm audit
git diff --check

for required in LICENSE THIRD_PARTY_NOTICES.md SECURITY.md CONTRIBUTING.md CHANGELOG.md docs/RELEASE_PROCESS.md docs/qualification/RELEASE_STATUS.md docs/qualification/CONSTRUCTION_MATRIX.md; do
  [ -s "$required" ] || fail "missing required release file: $required"
done

if rg -n 'uses:[[:space:]]+[^#[:space:]]+@v[0-9]+' .github/workflows; then
  fail "floating major-version GitHub Action reference found"
fi

if ! node <<'NODE'
const fs=require('node:fs');
const files=fs.readdirSync('.github/workflows').filter(x=>x.endsWith('.yml')||x.endsWith('.yaml'));
for(const file of files){
  const text=fs.readFileSync('.github/workflows/'+file,'utf8');
  for(const line of text.split(/\r?\n/)){
    const m=line.match(/uses:\s*([^\s#]+)@([^\s#]+)/);
    if(!m) continue;
    if(!/^[0-9a-f]{40}$/i.test(m[2])){
      console.error('unpinned action',file,m[0]);
      process.exit(1);
    }
  }
}
NODE
then
  fail "GitHub Actions are not fully SHA pinned"
fi

HOME_NAME=$(basename "$HOME")
PATTERN="$HOME_NAME|asdk_app_[A-Za-z0-9_-]{8,}|tunnel_[0-9A-Fa-f]{16,}|gho_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|org-[A-Za-z0-9_-]{8,}"

if rg -n --hidden   --glob '!node_modules/**' --glob '!dist/**' --glob '!.git/**'   --glob '!package-lock.json' --glob '!gate/package-lock.json'   "$PATTERN" .; then
  fail "current-tree privacy scan failed"
fi

FOUND=0
while read -r commit; do
  if git grep -n -E "$PATTERN" "$commit" -- ':!package-lock.json' ':!gate/package-lock.json' >/tmp/dc-p7-history-hit 2>/dev/null; then
    echo "privacy hit in commit $commit" >&2
    cat /tmp/dc-p7-history-hit >&2
    FOUND=1
  fi
done <<EOF
$(git rev-list main)
EOF
rm -f /tmp/dc-p7-history-hit
[ "$FOUND" -eq 0 ] || fail "reachable-history privacy scan failed"

BAD_AUTHOR=0
while read -r email; do
  case "$email" in
    *"@users.noreply.github.com") ;;
    *) echo "non-noreply commit identity: $email" >&2; BAD_AUTHOR=1 ;;
  esac
done <<EOF
$(git log main --format='%ae%n%ce')
EOF
[ "$BAD_AUTHOR" -eq 0 ] || fail "reachable history contains a non-noreply identity"

if git log main --name-only --pretty=format:   | grep -E '(^|/)(\.env|.*\.pem|.*\.key|credentials)(/|$)'   | grep -q .; then
  fail "sensitive filename appears in reachable history"
fi

node <<'NODE'
const fs=require('node:fs');
const pkg=require('./package.json');
const allowed=new Set(['MIT','ISC','Apache-2.0','BSD-2-Clause','BSD-3-Clause']);
const seen=new Set();
function walk(name){
  if(seen.has(name)) return;
  seen.add(name);
  const file='node_modules/'+name+'/package.json';
  if(!fs.existsSync(file)) throw new Error('dependency metadata missing: '+name);
  const dep=JSON.parse(fs.readFileSync(file,'utf8'));
  const license=typeof dep.license==='string'?dep.license:'';
  if(!allowed.has(license)) throw new Error('unreviewed dependency license: '+dep.name+' '+license);
  for(const child of Object.keys(dep.dependencies||{})) walk(child);
}
for(const name of Object.keys(pkg.dependencies||{})) walk(name);
console.log('RELEASE_DEPENDENCY_LICENSE_PASS');
NODE

TMP=$(mktemp -d "${TMPDIR:-/tmp}/localbridge-mcp-release.XXXXXX")
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
mkdir -p "$TMP/repo" "$TMP/home"

git archive --format=tar HEAD | tar -xf - -C "$TMP/repo"

(
  cd "$TMP/repo"
  HOME="$TMP/home" npm ci
  HOME="$TMP/home" npm test
  HOME="$TMP/home" npm audit
)

ARCHIVE="$TMP/localbridge-mcp-v$VERSION-source.tar.gz"
git archive --format=tar.gz --prefix="localbridge-mcp-v$VERSION/" -o "$ARCHIVE" HEAD
SHA256=$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')

echo "RELEASE_SOURCE_ARCHIVE_SHA256=$SHA256"
echo "RELEASE_VERSION=$VERSION"
echo "RELEASE_PREFLIGHT_PASS"
