# src/Common/Models

Phalcon ORM models over SQLite. Repo-wide rules live in the root `AGENTS.md`; this file only
covers what you cannot see by reading the classes here.

## Schema comes from annotations, not migrations

- There are no migration files. `@Column` / `@Primary` / `@Identity` / `@Indexes` annotations
  are the schema. `Core/System/Upgrade/UpdateDatabase::createUpdateDbTableByAnnotations()`
  diffs them against the live table at boot and ALTERs it. Adding a property with a
  `@Column` annotation IS the schema change.
- Table name is always set explicitly in `initialize()` as `m_<ClassName>`. The only
  exceptions: `CallDetailRecords` -> `cdr_general` and `CallDetailRecordsTmp` -> `cdr`
  (both on connection `dbCDR`), `RecordingStorage` on `dbRecordingStorage`.

## Property typing gotcha

Never declare a typed property without a default (`public int $id;`): `save()` fatals with
"must not be accessed before initialization". Convention: `public $id;` untyped for identity
columns, `public ?string $x = '';` for the rest.

## Every save/delete has side effects

- `ModelsBase::initialize()` attaches `afterSave`/`afterDelete` handlers that (1) publish the
  changed fields to Beanstalk for `WorkerModelsEvents` (which reloads Asterisk/system config)
  and (2) wipe the Redis `ManagedCache` entries for that model class. Handlers are NOT
  attached while `System::isBooting()`.
- Which model/field triggers which reload is decided in
  `Core/Workers/Libs/WorkerModelsEvents/{ProcessOtherModels,ProcessPBXSettings,ProcessCustomFiles}.php`,
  not in the model. A new model that must trigger a reload needs an entry there.
- Bulk writes: wrap in `ModelsBase::beginDeferModelEvents()` / `endDeferModelEvents()`
  (in `finally`), then call `enqueueModelChangedEvent()` once; otherwise every row fires a reload.
- Delete cascades/restrictions are NOT enforced by SQLite or by Phalcon. `ModelsBase::beforeDelete()`
  walks the relations declared in `initialize()` and honours the `foreignKey['action']`
  option. A relation you forget to declare is silently orphaned on delete.
- Enabled extension modules inject extra relations into core models at runtime
  (`ModelsBase::addExtensionModulesRelations()`), so cascade behaviour can differ per install.

## PbxSettings

- Read/write only via `PbxSettings::getValueByKey()` / `setValueByKey()`; they front a Redis
  hash (DB index `ManagedCacheProvider::DATABASE_INDEX`) and defer cache writes while a main
  DB transaction is open (`flushPendingCacheUpdates()` after commit).
- Unknown key returns the literal string `UNKNOWN KEY ADD IT TO DEFAULT VALUES`: a new
  setting needs a constant in `PBXSettings/PbxSettingsConstantsTrait` AND a default in
  `PBXSettings/PbxSettingsDefaultValuesTrait`.
- `PbxSettingsConstants` is deprecated (2024.2.30); reference constants as `PbxSettings::X`.

GUI names/links come from the per-class `switch` in `Traits/RecordRepresentationTrait`;
a new model shows as `Unknown` until added there.
