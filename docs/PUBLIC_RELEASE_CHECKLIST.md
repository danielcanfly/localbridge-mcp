# Public release checklist

Use this before publishing a Daniel Commander source release.

## Source and history

- [ ] `npm test` passes.
- [ ] `npm audit` reports no known vulnerabilities.
- [ ] `git diff --check` passes.
- [ ] Current-tree privacy scan passes.
- [ ] Full Git-history privacy scan passes.
- [ ] Commit author email addresses are acceptable for public exposure.
- [ ] No secret/environment/key files have ever been committed.
- [ ] THIRD_PARTY_NOTICES.md matches imported or adapted code.
- [ ] LICENSE is present.

## Product boundaries

- [ ] README states that Daniel Commander does not provide a hosted relay.
- [ ] README distinguishes the portable core from macOS-only production service management.
- [ ] SECURITY.md explains that allowlists/blocklists are guardrails, not a sandbox.
- [ ] Example config is fail-closed.
- [ ] No personal paths, app IDs, tunnel IDs, keys, or SSH identities are in distributable templates.
- [ ] Public docs present Daniel Commander as a product, not as a construction handoff.

## Installation

- [ ] Clean-room core setup passes from a source copy with no node_modules.
- [ ] Re-running core setup preserves unrelated custom config keys.
- [ ] macOS remote profile-only setup passes without installing launchd.
- [ ] macOS production update remains healthy after installer changes.
- [ ] Runtime.app identity remains stable during normal updates.

## CI and security automation

- [ ] GitHub Actions passes on macOS.
- [ ] GitHub Actions passes on Linux.
- [ ] Supported Node versions pass.
- [ ] CI does not require private deployment credentials.
- [ ] CodeQL passes.
- [ ] GitHub Actions references are pinned to exact commit SHAs.

## GitHub metadata

- [ ] Repository metadata reports `fork=false`.
- [ ] Repository description is accurate.
- [ ] Dependabot vulnerability alerts are enabled.
- [ ] Automated security fixes are enabled.
- [ ] Private vulnerability reporting is enabled when available.
- [ ] Main branch protection is enabled only if the owner intentionally accepts the PR/check workflow change.

## Release artifact

- [ ] Package version matches the release tag.
- [ ] Package remains `private: true`.
- [ ] MCP server protocol version equals the package version.
- [ ] Draft release notes are reviewed.
- [ ] Source archive checksum is recorded.
- [ ] Locally built Runtime.app is not attached as a public binary.
- [ ] Required third-party notices are included in the archive.
