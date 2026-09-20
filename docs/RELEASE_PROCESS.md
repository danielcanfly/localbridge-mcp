# Release process

LocalBridge MCP uses source-only GitHub releases. npm publication remains disabled.

## Current product release

The current product release target is:

    v0.2.0

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

CodeQL must also pass when the repository is public.

## 3. Tag

Create an annotated release tag only after the final release commit and CI are green:

    git tag -a v0.2.0 -m "LocalBridge MCP v0.2.0"
    git push origin v0.2.0

## 4. Draft GitHub release

Create a draft GitHub release from the reviewed notes in `docs/releases/v0.2.0.md`.

The release is source-only. Do not attach the locally built Runtime.app because its ad-hoc signature is specific to the local installation path and is not a notarized public binary.

## 5. Publish release

After public security settings, CodeQL, source archive checksum, and live-runtime evidence are healthy, publish the draft release.

Branch protection remains opt-in because it changes maintainer workflow.
