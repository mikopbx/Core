# src/Common/Providers — agent notes

Phalcon DI service providers. Repo-wide rules live in the root `AGENTS.md`.

## Registration
- Providers are not auto-discovered. They are listed in four `RegisterDIServices.php`
  files (`src/Common/Config`, `src/Core/Config`, `src/AdminCabinet/Config`,
  `src/PBXCoreREST/Config`). A new provider must be added to the right list(s); every list
  does `$di->remove(SERVICE_NAME)` then `register()`, so `SERVICE_NAME` is mandatory even
  on a class that does not implement `ServiceProviderInterface` (see `MutexProvider`).
- `ModulesDBConnectionsProvider` has an empty `SERVICE_NAME`: it registers one service per
  module (`ModulesModelsBase::getConnectionServiceName()`) and hooks them to the main `db`
  connection's transaction events, so it must be registered after `MainDatabaseProvider`.

## Shared vs non-shared (deliberate)
- `RedisClientProvider` and `ManagedCacheProvider` are `setShared` on purpose (issue #1022:
  per-call sockets exhausted descriptors in BLPOP worker loops). Do not revert to `set()`.
  `RedisClientProvider::primeRedisAdapter()` must wrap any new phpredis client so
  `OPT_READ_TIMEOUT`/`OPT_TCP_KEEPALIVE` apply.
- `MutexProvider`, `PBXCoreRESTClientProvider`, `RouterProvider`, `SentryErrorHandlerProvider`,
  `WhoopsErrorHandlerProvider` are intentionally `set()` (new instance per `get()`).
- Redis DB numbers are the `DATABASE_INDEX` constants on the providers (1 redis,
  2 modelsMetadata, 4 managedCache, 5 session). Pick an unused one for anything new.

## SQLite (DatabaseProviderBase)
- Nested transactions with savepoints are disabled; nested `begin()` is a no-op. Do not
  re-enable, SQLite rejects savepoints while statements are in progress.
- PRAGMA tuning (busy_timeout/WAL/NORMAL/cache/temp_store) applies only to `db`, `dbCDR`,
  `dbRecordingStorage`, is skipped while `System::isBooting()`, and WAL is skipped on
  network filesystems (`isWalSafeFilesystem()`).
- Main `db` commit/rollback events flush or discard deferred `PbxSettings` cache writes.
  Do not replace the events manager on `db`; attach to the existing one.
- `recreateDBConnections()` / `ensureCdrTables()` re-register DI services and invalidate
  every already-instantiated model. Call them only from worker startup before any model
  is created, never mid-request. Module DBs are recreated separately via
  `ModulesDBConnectionsProvider::recreateModulesDBConnections()`.

## Other gotchas
- `JwtProvider::LEEWAY` must stay equal to `JWTHelper::LEEWAY`. The signing secret is
  `PbxSettings::JWT_SECRET` (auto-generated on first use).
- `LanguageProvider` decides CLI language by a hard-coded list of EventBus worker classes
  (`isApiOrModelEventProcess()`); a new worker that emits user-facing text must be added
  there or it falls back to `SSH_LANGUAGE`. Unknown web languages normalize to `en`.
- `MessagesProvider` caches translations only outside CLI, keyed by
  `PBXConfModulesProvider::getVersionsHash()` (itself cached 1h); changed translation
  text does not bust the cache.
- `PBXConfModulesProvider` is shared: the module list and its priority sort are built once
  per process. After enabling/disabling a module call `recreateModulesProvider()`.
- `WafProvider` subscribes to no events by design; module enable/disable actions call `WafRegistry`.
