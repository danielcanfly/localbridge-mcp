# Release process

Daniel Commander uses source-only GitHub releases. npm publication remains disabled.

## Release candidate

The current public-release candidate is:

    v0.1.0-rc.2

The package remains:

    "private": true

This prevents accidental npm publication while still giving the source tree a coherent release version.

## 1. Local release preflight

Run from a clean `main` checkout:

    ./scripts/release-preflight.sh

The preflight reruns the full test suite, npm audit, privacy/history checks, commit-identity checks, dependency-license checks, GitHub Action pinning checks, and then builds/tests a clean `git archive` copy with an isolated HOME.

## 2. CI

Push the release commit and require the CI matrix to pass:

- Ubuntu / Node.js 20
- Ubuntu / Node.js 24
- macOS / Node.js 20
- macOS / Node.js 24

While the repository is private, the CodeQL job is intentionally skipped. It becomes active automatically after the repository is public.

## 3. Tag

Create an annotated release-candidate tag only after the final release commit and CI are green:

    git tag -a v0.1.0-rc.2 -m "Daniel Commander v0.1.0-rc.2"
    git push origin v0.1.0-rc.2

## 4. Draft GitHub prerelease

Create a draft prerelease from the reviewed notes in `docs/releases/v0.1.0-rc.2.md`.

The release is source-only. Do not attach the locally built Runtime.app because its ad-hoc signature is specific to the local installation path and is not a notarized public binary.

## 5. Owner visibility gate

Changing the repository from private to public is an explicit owner decision and is not performed by release-preflight or P7 automation.

Before changing visibility, review:

    docs/PUBLIC_RELEASE_CHECKLIST.md

## 6. Post-public finalize

After the owner changes repository visibility to public:

    ./scripts/github-public-finalize.sh --apply

This enables vulnerability alerts, automated security fixes, private vulnerability reporting, and canonical repository topics.

Branch protection is intentionally opt-in because it changes the maintainer workflow:

    ./scripts/github-public-finalize.sh --apply --protect-main

## 7. Publish release

After public security settings and CodeQL are healthy, publish the draft prerelease.

v0.1.0-rc.1 remains the pre-P8 historical RC. A final `v0.1.0` release should be a separate owner decision after RC feedback and original P9 row-by-row qualification.
