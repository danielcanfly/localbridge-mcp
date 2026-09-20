# P7 public release qualification status

Status: READY_FOR_OWNER_PUBLIC_VISIBILITY_GATE on 2026-09-20.

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

## Qualification evidence

P7 candidate qualification passed with:

- full local P2-P7 regression green;
- npm audit reporting zero known vulnerabilities;
- production dependency-license census reviewed and currently MIT-only;
- exact-SHA GitHub Actions pinning;
- current-tree and reachable-history privacy scans green;
- all reachable commit identities using GitHub noreply addresses;
- clean `git archive` install with isolated HOME, fresh `npm ci`, full `npm test`, and `npm audit`;
- GitHub CI run with all four macOS/Linux Node 20/24 jobs successful;
- CodeQL workflow correctly skipped while repository visibility remains private;
- Dependabot vulnerability alerts enabled;
- automated security fixes enabled;
- canonical repository topics applied;
- repository metadata still reports `fork=false`.

## Final external closure for this commit

After this status commit itself passes final CI and release-preflight:

1. create annotated tag `v0.1.0-rc.1` on this exact commit;
2. create a draft GitHub prerelease from `docs/releases/v0.1.0-rc.1.md`;
3. generate and attach the source archive checksum;
4. update the owner's running macOS production runtime to this exact commit;
5. verify repository visibility is still private.

Those are release-metadata/deployment operations and do not require another source commit.

## Owner gate

P7 does not make the repository public.

The repository is ready for an explicit owner decision to change visibility only after the external closure steps above succeed.

After visibility becomes public:

    ./scripts/github-public-finalize.sh --apply

Private vulnerability reporting is intentionally deferred until that public-only finalize step.

Main branch protection remains opt-in with `--protect-main` because enabling it changes the maintainer's direct-push workflow.

P7 final source state: `READY_FOR_OWNER_PUBLIC_VISIBILITY_GATE`.

## Original-plan reconciliation audit

Before public visibility, the frozen original P0-P9 construction plan was re-audited against the repository, tests, GitHub release surface, and live production runtime.

The audit found no missing original P0-P7 capability, but it found phase-number drift and five release-quality defects that were repaired before publication:

- MCP server protocol version still advertised `0.1.0-dev` while the package was `0.1.0-rc.1`;
- the temporary P1 `gate/` qualification scaffold still shipped in the release tree;
- unused telemetry-derived fuzzy-search metric payloads remained in the imported core;
- `fileWriteLineLimit` was exposed as configuration but had no effect;
- direct-start config creation did not explicitly harden the config directory to mode 0700.

The audit also corrected lifecycle status: most of the original P8 work was implemented early in the later P5 runtime phase, but active-only `caffeinate` / no-sleep behavior is still missing. Original P8 therefore remains partial, and original P9 remains a separate row-by-row final qualification before any `DANIEL_COMMANDER_V0_1_PASS` declaration.

See `docs/ORIGINAL_PLAN_RECONCILIATION.md` for the authority mapping.
