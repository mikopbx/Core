# PBXCoreREST — agent notes

REST API v3 (`/pbxcore/api/v3/...`). Controllers only enqueue; the real work runs in
`Workers/WorkerApiCommands` behind a Redis queue. Repo-wide facts live in the root
`AGENTS.md`; unit-test workflow in `tests/Unit/AGENTS.md`. Everything below is what the
code does not say out loud.

## Non-obvious behaviour

- An action's `PBXApiResult` with `success = false` and no `httpCode` is sent as **422**
  (`BaseController`). Set `httpCode` explicitly for 404/409/400.
- `#[ApiResponse]` attributes are **documentation only** (fed into OpenAPI by
  `ApiMetadataRegistry`). Runtime response validation (`ResponseSchemaValidator`) uses the
  DataStructure `response` schema and is off unless `SCHEMA_VALIDATION_STRICT` is set.
- Localhost (`127.0.0.1` / `::1`) skips authentication **and** ACL in
  `AuthenticationMiddleware`; the `admins` role also bypasses ACL. Do not rely on ACL to
  protect anything a local worker or script can reach. The web-UI `SecurityPlugin`
  (AdminCabinet) has its own localhost check that only matches `127.0.0.1`.
- Actions run in a separate process: no Phalcon `Request`, no DI. Everything they need
  must travel in the queue envelope. `httpHeaders` (filtered by
  `Http/ForwardedHeaderFilter`, secrets stripped, `X-Mikopbx-*` / `X-Module-*` prefixes
  let through) and `sessionContext` (only present for Bearer-token requests) are put there
  by `BaseController::prepareRequestMessage()`, but each `*ManagementProcessor` must pass
  them to the action explicitly or the action sees nothing.
- Queue backpressure: over-long queue -> immediate 503 (controller side); requests older
  than `API_REQUEST_TTL` are dropped by the worker; debug/async requests and envelopes
  without `created_at` are never dropped. Thresholds are `PbxSettings` keys.

## SaveRecordAction ordering (the part that breaks silently)

Reference implementations: `Lib/Providers/SaveRecordAction.php`, `Lib/SoundFiles/...`.
- Read `$data['httpMethod']` and resolve the existing record **before** validating
  required fields. PATCH must skip required-field rules (partial update), and PUT/PATCH on
  a missing id must return 404 via `validateRecordExistence()` instead of a misleading
  "field required" error. Older actions (e.g. CallQueues) still validate first; do not
  copy that order into new code.
- `DataStructure::applyDefaults()` is for CREATE only; never on update/patch.
- Use `isset()` when applying PATCH fields inside `executeInTransaction()`.
- There is no base `createFromModel()`: `AbstractDataStructure` offers `createBaseStructure()`
  / `createForList()` / `formatBySchema()`; a few DataStructures define their own
  `createFromModel()`. Check the resource's DataStructure before calling either.

## Conventions and traps

- `DataStructure::getParameterDefinitions()` is the single source of truth for
  sanitization, validation, defaults and OpenAPI. Do not add per-action validation that
  duplicates it.
- Naming split: controller `OffWorkTimes` maps to `Lib/OutWorkTimes` +
  `OutWorkTimesManagementProcessor`.
- New module headers go under `X-Module-<Name>-*`; nothing in this directory needs editing.
- `Middleware/README.md` describes `UnifiedSecurityMiddleware` as implemented but not
  wired into the chain; verify before assuming API-key scopes are enforced.
