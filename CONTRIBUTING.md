# Contributing

Thanks for helping improve Daniel Commander.

## Development setup

    npm ci
    npm test

The portable core is expected to stay green on both macOS and Linux.

## Pull request expectations

Keep changes narrow and explain:

- what user problem the change solves;
- which operating systems it affects;
- what security boundary changes, if any;
- how the change was tested.

For macOS Runtime.app or launchd changes, include a macOS qualification result rather than relying only on source inspection.

## Security and privacy

Do not commit real:

- API keys or bearer tokens
- tunnel IDs from a private deployment
- SSH private keys
- device identifiers
- personal absolute paths
- production host credentials

Use placeholders and temporary fixtures.

Do not weaken fail-closed filesystem defaults merely to make a demo easier.

## Upstream-derived code

Some execution-core code is derived from Desktop Commander MCP under the MIT license. Preserve provenance headers and keep THIRD_PARTY_NOTICES.md accurate when modifying or importing upstream-derived code.

## Scope

Daniel Commander intentionally keeps the public MCP surface small. Prefer general filesystem/search/edit/terminal primitives over product-specific wrappers unless there is a clear security or correctness reason for a dedicated tool.
