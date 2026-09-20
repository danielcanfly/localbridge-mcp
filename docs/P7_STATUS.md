# P7 public release qualification status

Status: IN PROGRESS on 2026-09-20.

## Goal

P7 qualifies Daniel Commander for an explicit owner-controlled transition from private development repository to public source project.

P7 does not change repository visibility automatically.

## Release candidate

Candidate version:

    v0.1.0-rc.1

npm publication remains disabled with `"private": true`.

The release is source-only. The locally built macOS Runtime.app is not a distributable notarized binary and is not part of the release artifact set.

## GitHub public surface

P7 adds:

- issue templates for bugs and feature requests;
- pull request template;
- changelog;
- release process documentation;
- source release notes;
- canonical GitHub topics;
- exact-SHA pinning for GitHub Actions.

The repository continues to report `fork=false`.

## Security posture

Before the repository becomes public:

- Dependabot vulnerability alerts: enabled;
- automated security fixes: enabled;
- private vulnerability reporting: pending public visibility;
- branch protection/rulesets: unavailable on the current private repository plan;
- CodeQL workflow: installed but gated to public visibility.

After the owner changes visibility to public, `scripts/github-public-finalize.sh --apply` completes the public-only security settings.

Branch protection remains a separate `--protect-main` opt-in because it changes normal direct-push workflow.

## Dependency licensing

The current production dependency graph was inspected. All current production dependencies resolve to MIT-licensed packages.

Project and imported upstream attribution remain covered by LICENSE and THIRD_PARTY_NOTICES.md.

## Release gates

Final P7 closure requires:

- P2-P7 local regression green;
- npm audit green;
- clean source archive install/test green;
- current-tree and reachable-history privacy scans green;
- all reachable commit identities noreply;
- exact-SHA Actions pinning;
- final CI matrix green;
- RC tag pushed;
- draft prerelease created;
- production runtime updated to the final P7 commit;
- repository still private until explicit owner approval.

Final state should be `READY_FOR_OWNER_PUBLIC_VISIBILITY_GATE`, not public by automation.
