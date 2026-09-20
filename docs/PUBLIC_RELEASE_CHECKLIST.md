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
