---
name: h-fix-cti-module-api-issues
branch: feature/modules-api-refactoring
status: completed
created: 2026-03-09
---

# ModuleCTIClient API Issues (MikoPBX 2025.1.x)

## Problem/Goal

При тестировании ModuleCTIClient на MikoPBX 2025.1.150 (PHP 8.4) обнаружены проблемы с REST API и контроллером модуля. Среда A (PHP 7.4, MikoPBX 2024.x) работает корректно и является эталоном формата ответов.

## Reference (Среда A — эталон)

Среда A: контейнер `mikopbx-php74`, порт 8082, MikoPBX 2024.2.29, PHP 7.4.6
Среда B: контейнер `mikopbx_modules-api-refactoring`, порт 8190, MikoPBX 2025.1.150, PHP 8.4.14

### Эталонный ответ getExtensions (Среда A)

```json
[
  {
    "userid": "110",
    "number": "201",
    "secret": "RTE2ODJiZGIzZWEyZGNkZTMxY2JkYmU5NzU2MTYxNjI3",
    "username": "Smith James",
    "mobile": "79031234567",
    "avatar": "ad8bcbb126c05f994f7b9d5cbd03efc4",
    "email": "oldtest@example.com",
    "port": "5060",
    "transport": null,
    "dtmfmode": "auto"
  }
]
```

### Ключевые свойства эталона

- `avatar` — 32-символьный md5 hash от **содержимого** аватарки (в Среде A это md5 от base64 blob в БД). При обновлении картинки hash **меняется**.
- `getUserAvatar/{hash}` — возвращает `{"img":"data:image/...;base64,..."}` по hash
- `updateUserAvatar` — после обновления `getExtensions` возвращает **новый** hash
- Все мутирующие операции (avatar, email, mobile) работают через прямую запись в модели (без REST API v3)

### Текущее поведение Среды B (проблемы)

- `avatar` — md5 от **пути** файла (`/avatars/user_110.jpg`), hash **не меняется** при обновлении
- Мутирующие операции идут через REST API v3 PATCH `/employees/{id}`, который падает при пустом `sip_transport`
- `updateUserAvatar` молча возвращает `ok` для невалидных изображений (< 1KB)

---

## Issues

### Issue 1: PATCH /employees/{id} падает при пустом sip_transport

**Статус:** pending
**Критичность:** high
**Компонент:** `src/PBXCoreREST/Lib/Employees/SaveRecordAction.php`

**Проблема:** При вызове PATCH `/pbxcore/api/v3/employees/{id}` с частичными данными (например, только `user_avatar` или `user_email`), API возвращает 422:
```
Field 'sip_transport' must be one of: udp, tcp, tls, udp,tcp
```

PATCH загружает текущую запись сотрудника, мержит переданные поля и валидирует **всю** запись. Если у сотрудника `sip_transport` пустой/null (допустимо в старых версиях), валидация падает.

**Ожидаемое поведение:** PATCH должен валидировать только изменяемые поля, либо подставлять дефолт `udp` для пустого `sip_transport`.

**Как воспроизвести:**
```bash
# В контейнере mikopbx_modules-api-refactoring
sqlite3 /cf/conf/mikopbx.db "UPDATE m_Sip SET transport='' WHERE extension='201'"
curl -s -X POST "http://127.0.0.1:8190/admin-cabinet/module-c-t-i-client/updateUserEmail" \
  --data-urlencode "id=110" --data-urlencode "email=test@test.com"
# Ответ: 422 sip_transport validation error
```

---

### Issue 2: Доработка хранения аватара — JSON с path + hash

**Статус:** pending
**Критичность:** high
**Компонент:** `src/PBXCoreREST/Lib/Common/AvatarHelper.php`, `src/PBXCoreREST/Lib/Employees/SaveRecordAction.php`, `src/Common/Models/Users.php`

**Проблема:** В новой версии MikoPBX аватарка хранится как путь к файлу (`/avatars/user_110.jpg`). CTI-клиент вычисляет `md5($user->avatar)` для cache-invalidation, но путь не меняется при обновлении файла — hash остаётся прежним.

**Решение:** Хранить в поле `Users.avatar` JSON-строку с путём и hash файла:

```json
{"path": "/avatars/user_110.jpg", "hash": "a1b2c3d4e5f6..."}
```

- `path` — относительный путь к файлу (как сейчас)
- `hash` — md5 от содержимого файла (`md5_file()`)

**Что нужно доработать:**

1. **AvatarHelper::saveAvatarToFile()** — после записи файла вычислять `md5_file()` и возвращать JSON вместо строки пути
2. **AvatarHelper::getAvatarUrl()** — парсить JSON, извлекать path; для обратной совместимости поддерживать и старый формат (просто путь)
3. **AvatarHelper::deleteAvatarFile()** — парсить JSON для получения path
4. **SaveRecordAction::saveUser()** — обработка нового формата
5. **DataStructure::createFromModel()** — `user_avatar` отдавать path (для URL), отдельно hash доступен при необходимости
6. **ModuleCTIClient контроллер** — в `getExtensionsAction()` парсить JSON, отдавать hash из поля для `avatar`; в `getUserAvatarAction()` искать по hash из JSON

**Обратная совместимость:**
- Если `avatar` начинается с `{` — это JSON (новый формат)
- Если начинается с `/` — это путь (старый формат, hash = md5 от path)
- Если начинается с `data:image` — это base64 blob (legacy, Среда A)
- Пустая строка — аватарки нет

**Как проверить:**
```bash
# После обновления аватарки hash должен измениться:
# 1. getExtensions → avatar = "abc123..."
# 2. updateUserAvatar с новой картинкой
# 3. getExtensions → avatar = "def456..." (другой hash)
# 4. getUserAvatar/def456... → новая картинка
```

---

### Issue 3: updateUserAvatar возвращает ok для невалидных изображений

**Статус:** pending
**Критичность:** low
**Компонент:** `src/PBXCoreREST/Lib/Common/AvatarHelper.php`, `src/PBXCoreREST/Lib/Employees/SaveRecordAction.php`

**Проблема:** `AvatarHelper::saveAvatarToFile()` возвращает `null` для изображений < 1KB (MIN_IMAGE_SIZE = 1024), но `SaveRecordAction` не обрабатывает этот null как ошибку — возвращает success.

**Ожидаемое поведение:** Если `saveAvatarToFile()` вернул null, API должен вернуть ошибку.

**Как воспроизвести:**
```bash
IMG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVQYV2P8z8BQz0BFwMgwqpBhKAQAm1oEBf3wRpYAAAAASUVORK5CYII="
curl -s -X POST "http://127.0.0.1:8190/admin-cabinet/module-c-t-i-client/updateUserAvatar" \
  --data-urlencode "id=110" --data-urlencode "img=${IMG}"
# Ответ: {"result":"ok"} — но файл НЕ обновился
```

---

### Issue 4: getExtensions возвращает transport: null

**Статус:** pending
**Критичность:** low
**Компонент:** `ModuleCTIClient/App/Controllers/ModuleCTIClientController.php` → `getExtensionsAction()`

**Проблема:** Поле `transport` возвращает `null` вместо строки. В старых базах `m_Sip.transport` пустой.

**Примечание:** В эталоне (Среда A) transport тоже `null` — значит это допустимое поведение для CTI клиента. Приоритет низкий, можно оставить как есть или подставлять дефолт `"udp"` на уровне контроллера модуля.

---

## Architecture Notes (из исследования кода)

### Avatar Flow в текущем MikoPBX 2025.1.x

```
SAVE:
  API Request { user_avatar: "data:image/...;base64,..." }
  → SaveRecordAction.saveUser() — выделяет base64 в pendingAvatarData
  → Save Users entity (получить ID)
  → AvatarHelper::saveAvatarToFile(base64, userId)
    → Validate: format, 1KB+, magic bytes
    → Write: /storage/.../media/avatars/user_{id}.jpg
    → Return: "/avatars/user_{id}.jpg"
  → Users.avatar = "/avatars/user_{id}.jpg"

READ:
  → DataStructure::createFromModel()
    → AvatarHelper::getAvatarUrl(user->avatar)
    → Return URL path or default avatar

DELETE:
  → Save avatar path before transaction
  → Delete user in transaction
  → AvatarHelper::deleteAvatarFile(path) after commit
```

### Файлы для доработки

| Файл | Изменения |
|------|-----------|
| `src/PBXCoreREST/Lib/Common/AvatarHelper.php` | saveAvatarToFile → JSON return; getAvatarUrl/deleteAvatarFile → JSON parsing |
| `src/PBXCoreREST/Lib/Employees/SaveRecordAction.php` | PATCH validation fix; avatar null handling |
| `src/PBXCoreREST/Lib/Employees/DataStructure.php` | user_avatar extraction from JSON |
| `ModuleCTIClient/.../ModuleCTIClientController.php` | getExtensions: parse JSON avatar; getUserAvatar: match by hash from JSON |

---

## Test Environment

- **Среда A (эталон):** контейнер `mikopbx-php74`, порт 8082, MikoPBX 2024.2.29, PHP 7.4
- **Среда B (новая):** контейнер `mikopbx_modules-api-refactoring`, порт 8190, MikoPBX 2025.1.150, PHP 8.4
- **Module path (B):** `/storage/usbdisk1/mikopbx/custom_modules/ModuleCTIClient/`
- **Avatar storage (B):** `/storage/usbdisk1/mikopbx/media/avatars/`

## Success Criteria

- [x] Issue 1: PATCH employees работает с пустым sip_transport
- [x] Issue 2: Avatar в БД хранится как JSON `{"path":"...","hash":"..."}`, hash меняется при обновлении файла
- [x] Issue 2: Обратная совместимость с legacy форматами (путь, base64 blob)
- [ ] Issue 2: CTI `getExtensions` отдаёт md5 hash файла, `getUserAvatar/{hash}` находит аватарку — **deferred to separate task**
- [x] Issue 3: API возвращает ошибку для невалидных аватарок (< 1KB)
- [x] Issue 4: transport = null допустим (совпадает с эталоном), изменений не требуется
- [ ] Все тесты проходят на обеих средах — **requires CTI controller update first**

## Context Manifest

### How This Currently Works: ModuleCTIClient API Flow on MikoPBX 2025.1.x

The ModuleCTIClient module lives in a separate repository at `/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleCTIClient/`. Its main controller is `ModuleCTIClientController` at `/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleCTIClient/App/Controllers/ModuleCTIClientController.php`. This controller extends `MikoPBX\AdminCabinet\Controllers\BaseController` and handles several CTI-specific endpoints: `getExtensionsAction`, `getUserAvatarAction`, `updateUserAvatarAction`, `updateUserEmailAction`, and `updateUserMobileAction`.

The controller uses a version-detection helper `MikoPBXVersion::isPhalcon512Version()` (at `/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleCTIClient/Lib/MikoPBXVersion.php`) which checks if `PBXVersion > 2025.1.1`. When this returns true (which it does on Env B), the controller routes mutation operations through the REST API v3 using the `restAPIClient` DI service (`PBXCoreRESTClientProvider`). Specifically, `updateUserAvatarAction` calls `PATCH /pbxcore/api/v3/employees/{userId}` with `['user_avatar' => base64data]`, `updateUserEmailAction` calls the same PATCH with `['user_email' => email]`, and `updateUserMobileAction` patches with `['mobile_number' => num, 'mobile_dialstring' => num]`. The `restAPIClient` sends GuzzleHttp requests to `http://localhost:{WEB_PORT}` internally.

### How PATCH /employees/{id} Works: The Validation Failure Chain

When PATCH `/pbxcore/api/v3/employees/{id}` is called, the request flows through `PatchRecordAction::main()` at `/Users/nb/PhpstormProjects/mikopbx/project-modules-api-refactoring/src/PBXCoreREST/Lib/Employees/PatchRecordAction.php`. This class does NOT extend `AbstractPatchAction` -- it is a standalone implementation. The flow is:

1. Validates that `$data['id']` is present
2. Calls `GetRecordAction::main($data['id'])` to fetch the existing employee record
3. `GetRecordAction` finds the `Users` model by ID and calls `DataStructure::createFromModel($user)` which builds the full employee data structure including `sip_transport` from `$sipRecord->transport`
4. `PatchRecordAction::intelligentMerge()` merges the patch data on top of the existing data. The merge preserves all existing fields that aren't in the patch request.
5. The merged data is passed to `SaveRecordAction::main($mergedData)`

Inside `SaveRecordAction::main()` (line 71), the 7-phase pipeline runs:
- **Phase 1**: Sanitize using `DataStructure::getSanitizationRules()` -- extracts only fields with sanitization rules
- **Phase 4**: `DataStructure::applyDefaults()` is ONLY applied for CREATE operations (line 172-174), NOT for updates
- **Phase 5**: `DataStructure::validateInputData($sanitizedData)` validates ALL fields present in `$sanitizedData` against enum constraints from `getParameterDefinitions()`. This is where the bug occurs.

**The Bug (Issue 1)**: When the existing employee has an empty `sip_transport` (from old database migrations), `DataStructure::createFromModel()` reads `$sipRecord->transport` which is `''` or `null`. The `intelligentMerge` preserves this value. Then `validateInputData()` checks `sip_transport` against the enum `['udp', 'tcp', 'tls', 'udp,tcp']` at line 971-976 of `AbstractDataStructure.php`. An empty string is not in the enum, so validation fails with "Field 'sip_transport' must be one of: udp, tcp, tls, udp,tcp".

The fix options are:
- **Option A (recommended)**: In `DataStructure::createFromModel()` at line 87, when reading `$sipRecord->transport`, default empty/null to `Sip::TRANSPORT_AUTO` (`'udp,tcp'`). This normalizes data at the read boundary.
- **Option B**: In `validateInputData()`, skip enum validation for empty values. But this would mask other data issues.
- **Option C**: In `PatchRecordAction::intelligentMerge()`, add sip_transport normalization. But this would be specific to one field.

### How Avatar Storage Currently Works

**Saving (via PATCH)**: When `updateUserAvatarAction` is called on Env B, it sends `PATCH /employees/{id}` with `user_avatar = "data:image/...;base64,..."`. In `SaveRecordAction::saveUser()` (line 298), the code detects `str_starts_with($avatarValue, 'data:image')` and stores it in `$pendingAvatarData`. After the user entity is saved (to get the ID), `AvatarHelper::saveAvatarToFile($pendingAvatarData, userId)` is called at line 213. This method:
1. Validates the base64 format and that it starts with `data:image`
2. Decodes the base64 data
3. Validates via `isValidImageData()` -- checks magic bytes AND `MIN_IMAGE_SIZE = 1024` bytes
4. Writes to `/storage/.../media/avatars/user_{id}.jpg`
5. Sets permissions via `Util::addRegularWWWRights()`
6. Returns the relative path `"/avatars/user_{id}.jpg"`

The returned path is stored in `$userEntity->avatar` and saved to the database. The file path is always the same for a given user ID, so `md5($user->avatar)` (computed by the CTI controller at line 256) produces the same hash regardless of the image content.

**Reading (getExtensions)**: In `getExtensionsAction()` at line 255-258, for each user with a non-empty avatar, the controller computes `md5($extension->avatar)` and returns it as the `avatar` field in JSON. Since `$extension->avatar` is now a path string like `/avatars/user_110.jpg`, the md5 never changes when the image file is updated.

**Reading (getUserAvatar)**: `getUserAvatarAction($imgHash)` at line 552 iterates ALL users, computes `md5($user->avatar)` for each, and compares to `$imgHash`. When found, it reads the file from `$mediaDir . $user->avatar` and returns base64-encoded content.

**The Problem (Issue 2)**: The hash is derived from the path string, not the file content. When the image is updated, the path stays the same, so the hash stays the same. The CTI client uses the hash for cache invalidation, so it never knows the image changed.

**The Solution**: Store avatar as JSON `{"path": "/avatars/user_110.jpg", "hash": "md5offilecontent"}` in `Users.avatar`. Files that need changing:

1. `AvatarHelper::saveAvatarToFile()` -- after writing the file, compute `md5_file($filepath)` and return JSON string instead of plain path
2. `AvatarHelper::getAvatarUrl()` -- detect JSON format (starts with `{`), parse it, extract `path` for URL generation. Must handle backward compat: path-only strings, base64 blobs, empty string
3. `AvatarHelper::deleteAvatarFile()` -- detect JSON format, extract `path` for deletion
4. `DataStructure::createFromModel()` -- `user_avatar` should call `AvatarHelper::getAvatarUrl()` which already handles path extraction from JSON
5. `ModuleCTIClientController::getExtensionsAction()` -- parse JSON from `$extension->avatar`, extract `hash` field for the `avatar` response key
6. `ModuleCTIClientController::getUserAvatarAction()` -- match by extracting `hash` from JSON avatar field instead of computing `md5($user->avatar)`
7. `SaveRecordAction::saveUser()` -- when clearing avatar (empty string), also delete old file. When avatar is a URL path (starts with `/`), skip update. The JSON format in existing `$userEntity->avatar` needs parsing when deleting old files.

### How Invalid Avatar Handling Fails (Issue 3)

In `SaveRecordAction::main()` at line 212-224, after `AvatarHelper::saveAvatarToFile()` returns, the code checks `if ($avatarPath !== null)`. If `saveAvatarToFile()` returns `null` (because the image was too small, < 1024 bytes), the code simply skips the avatar update -- it does NOT report an error. The `transformRestApiResponse()` method in the CTI controller at line 637-644 checks only `$restAnswer->success`, which is `true` because the user entity itself was saved successfully (other fields like email might have been updated).

The fix: After the transaction completes in `SaveRecordAction::main()`, if `$pendingAvatarData` was non-empty but `$avatarPath` ended up null, add a warning message to the response. Or, throw an exception inside the transaction to prevent a false-positive save. The cleaner approach is to throw in the transaction since the caller explicitly asked to update the avatar.

### Transport Null Issue (Issue 4)

In `getExtensionsAction()` at line 253, `$extension->transport` comes from a JOIN query on `m_Sip`. When `m_Sip.transport` is empty/null in the database, the value is `null`. The controller assigns it directly at line 284: `'transport' => $extension['transport']`. In Env A (reference), this also returns `null`, so the behavior matches the reference and is acceptable. If a fix is desired, the controller could default to `'udp'` on null/empty values.

### Technical Reference Details

#### Component Interfaces and Signatures

**AvatarHelper** (`src/PBXCoreREST/Lib/Common/AvatarHelper.php`):
```php
public static function getAvatarUrl(string $avatarData): string  // returns URL path or default
public static function saveAvatarToFile(string $base64Data, string $userId): ?string  // returns relative path or null
public static function deleteAvatarFile(string $avatarPath): bool
private static function isValidImageData(string $imageData): bool  // checks magic bytes + MIN_IMAGE_SIZE=1024
private static function saveBase64ImageToFile(string $base64String, string $outputFile): bool
private static function base64ToJpegFile(string $base64String, string $outputFile): bool
```

**SaveRecordAction** (`src/PBXCoreREST/Lib/Employees/SaveRecordAction.php`):
```php
public static function main(array $data): PBXApiResult  // 7-phase pipeline
private static function saveUser(array $sanitizedData): array  // returns [Users, bool, ?string pendingAvatarData]
private static function saveSip(array $sanitizedData): array  // uses isset() for PATCH support
private static function validateEmployeeData(array &$sanitizedData, bool $isCreateOperation): array
```

**PatchRecordAction** (`src/PBXCoreREST/Lib/Employees/PatchRecordAction.php`):
```php
public static function main(array $data): PBXApiResult
private static function intelligentMerge(array $existingData, array $patchData): array
```

**DataStructure** (`src/PBXCoreREST/Lib/Employees/DataStructure.php`):
```php
public static function createFromModel(Users $user): array  // full employee data with representations
public static function getParameterDefinitions(): array  // single source of truth for fields
// sip_transport enum: ['udp', 'tcp', 'tls', 'udp,tcp'], default: 'udp'
```

**AbstractDataStructure::validateInputData()** (`src/PBXCoreREST/Lib/Common/AbstractDataStructure.php`, line 945):
```php
// Validates enum constraints for ALL fields present in $data
// Empty string fails enum validation because '' is not in the allowed values array
```

**ModuleCTIClientController** (`/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleCTIClient/App/Controllers/ModuleCTIClientController.php`):
```php
public function getExtensionsAction(): void  // lines 204-293 - returns JSON array of extensions
public function getUserAvatarAction(string $imgHash)  // lines 552-600 - returns base64 image by hash
public function updateUserAvatarAction()  // lines 396-437 - PATCH via restAPIClient on Phalcon 5.12+
public function updateUserEmailAction()  // lines 661-702 - PATCH via restAPIClient on Phalcon 5.12+
public function updateUserMobileAction(): void  // lines 454-542 - PATCH via restAPIClient on Phalcon 5.12+
private function transformRestApiResponse($restAnswer): array  // lines 637-644 - converts PBXApiResult to legacy format
```

**MikoPBXVersion** (`/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleCTIClient/Lib/MikoPBXVersion.php`):
```php
public static function isPhalcon512Version(): bool  // true when PBXVersion > 2025.1.1
```

#### Data Model

**Users model** (`src/Common/Models/Users.php`):
- Table: `m_Users`
- Fields: `id` (PK), `email` (?string), `username` (?string), `language` (?string), `avatar` (?string)
- `avatar` field currently stores: empty string, file path (`/avatars/user_{id}.jpg`), or legacy base64 blob

**Sip model** (`src/Common/Models/Sip.php`):
- Table: `m_Sip`
- Constants: `TRANSPORT_AUTO = 'udp,tcp'`, `TRANSPORT_UDP = 'udp'`, `TRANSPORT_TCP = 'tcp'`, `TRANSPORT_TLS = 'tls'`
- `transport` field can be empty/null in old databases

#### Avatar Storage Paths

- Permanent storage: `/storage/usbdisk1/mikopbx/media/avatars/user_{id}.jpg`
- DB value (current): `/avatars/user_{id}.jpg` (relative to media dir)
- DB value (proposed): `{"path": "/avatars/user_{id}.jpg", "hash": "a1b2c3..."}`
- Display cache (legacy base64): `/sites/admin-cabinet/assets/img/cache/{hash}.jpg`
- Default avatar: `/admin-cabinet/assets/img/unknownPerson.jpg`
- Media dir constant: `Directories::AST_MEDIA_DIR`

#### Key Constants

```php
AvatarHelper::MIN_IMAGE_SIZE = 1024  // minimum valid image size in bytes
AvatarHelper::AVATARS_SUBDIR = '/avatars'
AvatarHelper::DEFAULT_AVATAR = '/admin-cabinet/assets/img/unknownPerson.jpg'
Sip::TRANSPORT_AUTO = 'udp,tcp'
```

#### File Locations

| Purpose | Path |
|---------|------|
| AvatarHelper (Core) | `src/PBXCoreREST/Lib/Common/AvatarHelper.php` |
| SaveRecordAction (Core) | `src/PBXCoreREST/Lib/Employees/SaveRecordAction.php` |
| PatchRecordAction (Core) | `src/PBXCoreREST/Lib/Employees/PatchRecordAction.php` |
| DataStructure (Core) | `src/PBXCoreREST/Lib/Employees/DataStructure.php` |
| GetRecordAction (Core) | `src/PBXCoreREST/Lib/Employees/GetRecordAction.php` |
| Users model (Core) | `src/Common/Models/Users.php` |
| AbstractDataStructure (Core) | `src/PBXCoreREST/Lib/Common/AbstractDataStructure.php` |
| CTI Controller (Module) | `/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleCTIClient/App/Controllers/ModuleCTIClientController.php` |
| MikoPBXVersion (Module) | `/Users/nb/PhpstormProjects/mikopbx/Extensions/ModuleCTIClient/Lib/MikoPBXVersion.php` |
| PBXCoreRESTClientProvider | `src/Common/Providers/PBXCoreRESTClientProvider.php` |

#### Backward Compatibility Matrix for Avatar Parsing

| `Users.avatar` value | Format | How to extract path | How to extract hash |
|----------------------|--------|--------------------|--------------------|
| `""` (empty) | None | return default | return `""` |
| `"/avatars/user_1.jpg"` | Old path | use as-is | `md5($path)` for compat |
| `"data:image/...;base64,..."` | Legacy blob | cache to file | `md5($blob)` |
| `'{"path":"/avatars/user_1.jpg","hash":"abc"}'` | New JSON | `json_decode->path` | `json_decode->hash` |

---

## Work Log

- [2026-03-09] Проведено тестирование ModuleCTIClient. Среда A была нерабочая из-за несовместимых symfony пакетов (v7.0.x для PHP 8.2+ в контейнере с PHP 7.4). Исправлено заменой на v5.4.x из reference image 2024.1.114. Все тесты на Среде A прошли. На Среде B обнаружены 4 проблемы.
- [2026-03-09] Исправлены 3 из 4 issue в core: (1) PatchRecordAction — пустой sip_transport заменяется на TRANSPORT_AUTO; (2) AvatarHelper — saveAvatarToFile() возвращает JSON {"path","hash"} с md5_file, добавлены parseAvatarData()/createAvatarData(), обратная совместимость со всеми форматами; (3) SaveRecordAction — невалидный аватар выбрасывает исключение. Issue 4 (transport:null) — совпадает с эталоном. Обновление CTI контроллера (getExtensionsAction/getUserAvatarAction) отложено в отдельную задачу.
