# LB21 | Offline Checked-Patch Substrate (Disabled)
Date: 2026-10-10
Status: **NOT A REGISTERED MCP TOOL**. No new tool appears in discovery. No new user capability, administrative setting, service endpoint, shell route or permission is enabled.

## Supported fixture-only primitive
- `src/core/scoped-checked-patch.ts` exports `checkedPatchFixture()` for synthetic local text-file fixtures only. The caller must supply an explicitly trusted, enabled policy outside the MCP surface.
- Policy default is effectively denied because there is no registration path or runtime configuration enabling it. Caller-chosen `enabled=true` in tests is NOT a production authorization mechanism.
- A single top-level filename matching a strict `*.txt` identifier is allowed under an owner-controlled private absolute root. No arbitrary paths, nested components, Git internals, shell, SSH, executable recipes or credentials.
- Checks SHA256 of the current file bytes, demands exactly one literal occurrence, bounded bytes, rejects binary/non-UTF8, symlinks, hardlinks, oversize and stale hashes. Uses a per-file exclusive lock and same-directory write-and-rename replacement; returns old/new SHA256 only.
- Each expected rejection returns `Scoped patch denied` without leaking root paths, file content or OS identities.
- No free-form commands or scripts are accepted.

## Offline fixed-recipe executor (also disabled)
- `src/core/offline-scoped-check.ts` exposes `createOfflineFixtureChecker()` only for independent synthetic fixture tests, with an immutable copy of owner-injected recipe IDs, absolute resolved executable, fixed argv, direct `spawn(..., shell:false)`, private working directory, small sanitized environment, no stdin, timeout, output-byte cap and one concurrent recipe per registry.
- Per-call input is a recipe ID only. No user-provided shell text, executable, argv, environment override or SSH backend is available; unknown IDs fail closed.
- S06–S09 synthetic tests verify default-off, missing/invalid IDs, fixed local recipe, timeout, output flood and cooperating concurrency.
- There is **no OS network or filesystem sandbox**, and a spawned executable could initiate network/file activity if its trusted fixture code did so. This code is NOT an authorization or production launch mechanism, and must never be registered before true OS isolation/owner policy gates.

## Real limitations and release HOLD
- This is a **pure offline source substrate**; it is not a deployment-ready scoped patch MCP API.
- Mac/Node path-based FS primitives do **not** guarantee race-free confinement when another malicious local actor can rename or replace the approved root during the last check, or mutate the target between verification and rename. Our source re-checks inode/hash, and serializes cooperating callers, but neither constitutes an OS-backed `openat`/sandbox proof.
- Case-folding, restricted filesystem ACLs and path normalization across unsupported hosts are not qualified.
- The caller-provided `policy.enabled` alone is not authoritative. A future tool endpoint MUST derive policy from server-owned, authenticated admin configuration and externally prove enablement, identity, isolation and exact allowed worktree.
- Stage2 `lb_scoped_check` fixed-recipe runner remains NOT IMPLEMENTED. OS network/filesystem confinement, timeout, resource limits, full S06–S12 and production publication remain UNQUALIFIED.
- The preexisting 17 MCP tools, user permissions and all existing command policies remain unchanged.
- No prior denied LB07 type edit, LB16 test-chain edit, LB04 or M27 operation was reenacted through this function or another tool.

## Test discipline
Run in an isolated worktree:
`npm run build && LOCALBRIDGE_LB21_FIXTURE_ROOT=<isolated scratch directory> node dist/test/scoped-checked-patch.integration.js`
Run ordinary `npm test` separately. The focused fixture is intentionally **not** added to the aggregate `npm test` chain, because the previous LB16 aggregate chain edit was explicitly blocked by platform safety and may not be rerouted.

## Acceptance rubric
S01–S05 fixture-only tests may be PASS when numeric exits are obtained. S06–S12 must stay NOT_RUN, PARTIAL or DESIGN_ONLY pending independent server authorization, recipe implementation and OS confinement. Release HOLD until all source/CI/history/platform/rollback/production gates are satisfied.
