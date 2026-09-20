# Public release checklist

Use this before changing the GitHub repository from private to public.

## Source and history

- [ ] `npm test` passes.
- [ ] `npm audit` reports no known vulnerabilities.
- [ ] `git diff --check` passes.
- [ ] Current-tree privacy scan passes.
- [ ] Full Git-history privacy scan passes.
- [ ] Commit author email addresses are acceptable for public exposure.
- [ ] No secret/environment/key files have ever been committed.
- [ ] THIRD_PARTY_NOTICES.md matches imported/derived upstream code.
- [ ] LICENSE is present.

## Product boundaries

- [ ] README states that Daniel Commander does not provide a hosted relay.
- [ ] README distinguishes the portable core from macOS-only production service management.
- [ ] SECURITY.md explains that allowlists/blocklists are guardrails, not a sandbox.
- [ ] Example config is fail-closed.
- [ ] No personal paths, app IDs, tunnel IDs, keys, or SSH identities are in distributable templates.

## Installation

- [ ] Clean-room core setup passes from a source copy with no node_modules.
- [ ] Re-running core setup preserves unrelated custom config keys.
- [ ] macOS remote profile-only setup passes without installing launchd.
- [ ] macOS production update remains healthy after public-installer changes.
- [ ] Runtime.app identity remains stable during normal updates.

## CI

- [ ] GitHub Actions passes on macOS.
- [ ] GitHub Actions passes on Linux.
- [ ] Supported Node versions pass.
- [ ] CI does not require private deployment credentials.

## GitHub metadata

- [ ] Repository metadata reports `fork=false`.
- [ ] Repository description is accurate.
- [ ] Visibility change is performed only as an explicit owner action.

P6 intentionally does not flip repository visibility automatically.

## P7 release-candidate gates

- [ ] Package version is `0.1.0-rc.1` and `private: true` remains set.
- [ ] GitHub Actions references are pinned to exact commit SHAs.
- [ ] CodeQL workflow is present and remains gated until repository visibility is public.
- [ ] Dependabot vulnerability alerts are enabled.
- [ ] Automated security fixes are enabled.
- [ ] Issue and pull-request templates are present.
- [ ] `./scripts/release-preflight.sh` passes from a clean main checkout.
- [ ] Final macOS/Linux CI matrix passes.
- [ ] Annotated tag `v0.1.0-rc.1` points at the final RC commit.
- [ ] Draft prerelease exists and remains unpublished until the owner chooses the public-visibility gate.
- [ ] `./scripts/github-public-finalize.sh` reports `OWNER_PUBLIC_VISIBILITY_GATE_PENDING` while private.
- [ ] After visibility becomes public, run `./scripts/github-public-finalize.sh --apply`.
- [ ] Main branch protection is enabled only if the owner intentionally accepts the PR/check workflow change.

## Original-plan reconciliation

- [ ] `docs/ORIGINAL_PLAN_RECONCILIATION.md` has been reviewed.
- [ ] Original P0-P7 task content is complete regardless of later phase-number reuse.
- [ ] Public RC notes do not claim original P8 or P9 are complete.
- [ ] The temporary P1 `gate/` qualification scaffold is absent from the release tree.
- [ ] MCP server protocol version equals the package version.
