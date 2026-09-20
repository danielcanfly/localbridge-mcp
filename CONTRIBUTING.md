# Contributing to Daniel Commander

Thanks for helping improve Daniel Commander.

## Development setup

    npm ci
    npm test

Run the release gate before proposing release-facing changes:

    npm run release:preflight

## Scope

Daniel Commander is a self-hosted MCP computer-control server. Contributions should preserve:

- fail-closed filesystem access;
- explicit user-owned credentials and tunnel configuration;
- source-only distribution;
- no hosted relay assumptions;
- clear macOS/Linux/Windows support boundaries.

## Safety rules

Do not commit:

- API keys, tunnel credentials, or OAuth tokens;
- SSH private keys;
- private hostnames, device IDs, or personal filesystem paths;
- screenshots or logs containing secrets;
- machine-specific runtime artifacts.

Use placeholders and temporary fixtures.

## Third-party provenance

Some low-level execution routines include third-party provenance obligations. Preserve source headers and keep `THIRD_PARTY_NOTICES.md` accurate when modifying those areas.

## Runtime changes

For macOS Runtime.app, launchd, tunnel supervision, sleep-prevention, or TCC-related changes, include a live macOS qualification result rather than relying only on source inspection.
