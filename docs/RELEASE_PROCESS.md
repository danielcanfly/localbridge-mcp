# Release process

LocalBridge MCP uses source-only GitHub releases. npm publication remains disabled (`private: true`).

## Candidate

v0.2.2 is an **unreleased candidate**. The installed Runtime.app remains on its separately managed live version. Do not equate a static scan or local worktree with release qualification.

## 1. Explicit isolated review checkout

Use a clean, vetted branch checked out into an isolated worktree. The preflight must be configured by the caller and writes only into an existing isolated scratch directory within the worktree.

```sh
mkdir -p .release-scratch
RELEASE_EXPECT_BRANCH=fix/lb03-release-pipeline \
RELEASE_EXPECT_VERSION=0.2.2 \
RELEASE_SCRATCH_ROOT="$PWD/.release-scratch" \
RELEASE_PHASE=static ./scripts/release-preflight.sh
```

The static phase checks version and private package lock consistency, required notices, security/privacy in the current tree and all reachable history, sensitive filenames, SHA-pinned GitHub Actions and the source archive checksum. Commit author identity is enforced strictly on every commit after the immutable already-public v0.2.1 baseline; preexisting publicly visible author identities are counted and disclosed as historical exceptions rather than silently rewritten. Tag drift, new non-noreply identities or any source privacy hit fails closed. This explicit historical exception requires owner/reviewer acceptance as part of the release decision. Static prints **PARTIAL**, never final release PASS.

## 2. Offline dependency and full test gate

After independent approval for an already-existing offline dependency source **inside this isolated worktree**, first read all nested test scripts and confirm temporary/build/cache effects stay inside this worktree. Run with `RELEASE_PHASE=offline` and the same explicit expected parameters. This runs the dependency license gate and full `npm test` but explicitly does not run online audit or clean archive install.

## 3. Network security and clean archive gate

Only after separate explicit authorization for network and dependency installs, set `RELEASE_PHASE=network RELEASE_ALLOW_NETWORK=YES` with the same parameters. This additionally performs `npm audit`, clean archive `npm ci`, tests and audit under worktree-contained scratch. Do not run this in offline-only jobs.

No phase may silently bypass privacy/history, identity, license, CodeQL or audit. Each deferred gate must be reported as NOT_RUN.

## 4. CI / security review

Review the source diff through an independently authorized GitHub PR. Require Ubuntu and macOS on Node 20 and 24 plus public CodeQL, provenance/privacy/licensing, archive checksum and backward compatibility. Do not create remote objects during local candidate preparation.

## 5. Release and rollback

After approval, separately authorize an annotated `v0.2.2` tag and source-only GitHub release based on `docs/releases/v0.2.2.md`. Do not attach an ad-hoc signed local Runtime.app. Deploy or restart the live Runtime.app/tunnel only under a **separate** approval with backup, smoke test, and documented rollback to the previous installed runtime. Branch protection changes remain optional and separately approved.
