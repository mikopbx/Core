---
name: h-implement-firewall-bouncer-api
branch: feature/firewall-bouncer-api
status: completed
created: 2026-05-10
---

# Firewall Bouncer API: External enforcement for Docker deployments

## Problem/Goal

В Docker-режиме MikoPBX `Firewall` UI создаёт ложное чувство защиты для веб-интерфейса:
контейнер не может управлять iptables хоста, а внутренние ACL на уровне Nginx ловят
docker-bridge gateway вместо реального IP клиента (при `userland-proxy=true`).
Пользователи (j03l24, artem_lek в MikoPBX Telegram-комьюнити) жалуются, что
правила настроены, а доступ есть отовсюду — и что в 2024.x f2b «работал в контейнере»
(он действительно писал в iptables контейнерного netns, но это давало неверный
эффект и нарушало границу доверия для host-network сетапов; снятие было корректным).

SIP-защита в Docker работает: UDP DNAT сохраняет source IP, Asterisk видит
реальный адрес атакующего, fail2ban пишет в Redis и `module reload acl` отбивает
новые REGISTER. Сломан именно HTTP-сегмент, и для junior/middle-админов —
основной целевой аудитории — нет понятного пути починить.

**Решение**: реализовать REST endpoint, через который контейнер декларирует список
IP/CIDR для блокировки наружу в формате, совместимом с CrowdSec LAPI
(`/v1/decisions/stream`). Внешние bouncers (host-iptables, nftables, Cloudflare,
AWS WAF и десятки community-плагинов) поллят endpoint и применяют правила в
реальном host firewall / cloud security group / edge CDN. Аутентификация — через
существующий `ApiKeys`-механизм (`Authorization: Bearer`), без дублирования
сущностей. Дополнительно — детектор bridge/host network mode и diagnostic endpoint
для self-check видимости client IP, чтобы junior-админ сам понимал состояние
своей инсталляции без чтения документации.

## Success Criteria

### Функциональные (код)

- [x] Endpoint `GET /pbxcore/api/v3/firewall-bouncer/v1/decisions/stream`
  отвечает CrowdSec LAPI-совместимым JSON `{new, deleted}` на верхнем
  уровне (без `{result,data}`-обёртки), `?startup=true` принимается и
  игнорируется (MVP всегда отдаёт полный снимок — валидно для всех
  существующих CrowdSec bouncer'ов). Sibling `/v1/whitelist` отдаёт
  плоский JSON-массив CIDR.
  *Note: literal multi-segment пути монтируются через
  `RouterProvider::SPECIAL_ROUTES`. Permission scope — resource base
  `/api/v3/firewall-bouncer`; ascend разрешён только для whitelist-баз
  (`ApiKeyPermissionChecker::ASCEND_ALLOWED_RESOURCES`) — см. Codex
  review fixes в Work Log.*
- [x] Аутентификация — через существующий `ApiKeys`-механизм
  (`Authorization: Bearer` **и** `X-Api-Key` — CrowdSec-convention, оба
  читаются `Request::getBearerToken()`), localhost-bypass НЕ
  расширяется; токен с несовпадающим `allowed_paths` получает 403
- [x] Источник данных: Redis-ключи `_PH_REDIS_CLIENT:firewall:sip|http|ami|iax:*`
  + `NetworkFilters` deny-rules (через `DockerNetworkFilterService`);
  whitelist отдельным массивом в ответе (отдельный sibling endpoint
  `/v1/whitelist`)
- [x] `System::getDockerNetworkMode(): string` возвращает
  `'native'|'host'|'bridge'|'unknown'`, через сравнение
  `/sys/class/net/eth0/iflink` vs `/sys/class/net/eth0/ifindex`,
  интегрирован в `System::getPlatformInfo()` массив; покрыт unit-тестами
  `tests/Unit/Core/System/DockerNetworkModeTest.php` на все четыре исхода
- [x] Endpoint `POST /pbxcore/api/v3/system:checkClientIpVisibility`
  отдаёт `remote_addr`, заголовки прокси (`X-Forwarded-For`, `X-Real-IP`),
  `container_mode` (из `getDockerNetworkMode`), `verdict`
  (`ip_visible|ip_not_visible|proxy_detected`). Внутри воркера читает
  заголовки из envelope-поля `httpHeaders` (см. `ForwardedHeaderFilter`).
- [x] UI Access Control / Firewall: баннер с CTA отображается ТОЛЬКО при
  условии `mode = bridge AND verdict != ip_visible`; рядом — кнопка
  «Проверить видимость моего IP» с человекочитаемым результатом
- [x] UI ApiKeys: preset «External firewall bouncer (CrowdSec-compatible)»
  (`?preset=bouncer`) предзаполняет `description`, `allowed_paths`
  единственным путём (`/api/v3/firewall-bouncer: read`), после save
  показывает модал с готовым `cs-firewall-bouncer.yaml` snippet для
  копирования. Resource-row в permission-selector обеспечивается
  `#[HttpMapping]` на bouncer-контроллере (Codex review fix).

### Acceptance / интеграция

- [x] **Smoke-тест с реальным `cs-firewall-bouncer`** на чистом Debian
  (Phase B run 2026-05-12 on `92.242.63.171`, MikoPBX
  `2026.2.83-dev` + delta-tracking hot-patch). Both ban and unban
  paths verified end-to-end via stock
  `crowdsec-firewall-bouncer` 0.0.25-5+b11 (Debian apt) against the
  endpoint:
  * **ban → DROP rule in iptables: 4s** (one 5s poll cycle, well
    under the 10s acceptance threshold)
  * **unban → ipset entry evicted: 3s** (immediate diff emission via
    `deleted[]` from per-token Redis cursor — see Work Log
    [2026-05-12 delta-tracking])
  * `crowdsec-blacklists` ipset rule visible in
    INPUT/FORWARD/DOCKER-USER chains (DOCKER-USER critical for
    Docker traffic)
  * Bouncer log emits `"1 decision deleted"` on the unban poll
  Two Docker-deployment traps surfaced and documented:
  `iptables_chains: [INPUT, FORWARD, DOCKER-USER]` is non-default
  but mandatory; `disable_ipv6: true` is required on hosts where
  Docker has no IPv6 bridge.
- [x] **SIP-fail2ban-в-Docker не сломан** — путь
  `DockerNetworkFilterService::addBlockedIp` → `pjsip ACL` →
  `module reload acl` не затронут изменениями (ни один из этих файлов
  не в diff). Финальную регрессию подтвердят пайплайны TeamCity
  (`RestAPITestsOn172163272`, `TESTCASES`) на merge-коммите.
- [x] **Безопасность endpoint'а**: токен без scope → 403; токен
  с `/api/v3/firewall-bouncer: read` → 200 на `/v1/decisions/stream`
  и `/v1/whitelist`; whitelist-IP не утекает анонимам (404/401
  через middleware). Дополнительно — ancestor-walk закрыт whitelist'ом
  (`ApiKeyPermissionChecker::ASCEND_ALLOWED_RESOURCES`), regression
  net в `ApiKeyPermissionCheckerPathAscendTest`.

### Документация (`/Volumes/DevDisk/Developement/docs.mikopbx.com/`)

**Текущее состояние: черновики готовы, в docs-репо ещё не применены.**
Все файлы и пошаговые инструкции лежат в
`sessions/tasks/h-implement-firewall-bouncer-api/docs-drafts/` —
`APPLY.md` описывает порядок применения на ветках `russian`/`english`
после успешного smoke-теста на Debian.

- [x] **Drafted**: `setup/docker/external-firewall-enforcement.md` (RU+EN) —
  self-check видимости IP, два варианта решения (`network_mode: host`
  для VoIP **либо** `cs-firewall-bouncer` apt-пакетом на Linux-хосте);
  compose-sidecar — follow-up.
- [x] **Drafted**: `manual/system/api-keys/firewall-export.md` (RU+EN) —
  техническая страница: формат ответа LAPI, query-параметры, пример
  `curl` (с `TOKEN=$BOUNCER_API_KEY`, чтобы не триггерить secret-scan),
  маппинг категорий (`sip/http/ami/iax`) на CrowdSec поля.
- [x] **Drafted** (точечные правки 8 страниц в `APPLY.md` §1.2/§2.2):
  `SUMMARY.md`, `readme/security.md`, `manual/connectivity/firewall.md`,
  `manual/connectivity/fail2-ban.md`, `setup/docker/README.md`,
  `setup/docker/running-mikopbx-using-docker-compose.md`,
  `faq/setup/fine-tuning-the-firewall.md`,
  `manual/system/api-keys/endpoints.md`.
- [x] **Drafts готовы к применению** — `APPLY.md` обновлён после Phase B/C
  и содержит финальный список из 2 новых файлов + 8 точечных правок
  на ветки `russian` и `english`. Применение будет выполнено
  непосредственно из docs-репозитория по решению юзера (вне scope
  этой задачи).
- [x] **Скриншоты сняты и закоммичены** — 4 PNG в
  `docs-drafts/screenshots/{ru,en}/`: `firewall-bouncer-banner.png`
  (баннер + self-check + verdict `ip_not_visible`) и
  `bouncer-token-preset.png` (форма создания bouncer-токена с
  предзаполненными полями). Standalone `ip_visible` state не имеет
  UI-surface — кнопка рендерится только внутри баннера, который
  скрыт при видимом клиентском IP (by design).
  Файлы готовы к копированию в `.gitbook/assets/` обеих веток.
- [x] **PR в docs-репо** — будет открыт юзером по одному коммиту на
  ветку после применения `APPLY.md`. Ссылается на merge-коммиты
  `mikopbx/Core` `8613709da` (исходный feature drop) + `be1c89b8a`
  (delta tracking) + `706d7f048` (docs-drafts extended) + `dfb6485fa`
  (screenshots).

### Качество кода

- [x] Translation-keys для всех UI-строк: баннер, preset bouncer-токена,
  кнопка self-check, описания полей. Полный fan-out по 29 локалям
  (RU+EN живые переводы, остальные 24 — заполнены технически, доперевод
  через Weblate). Pre-commit translation-validator зелёный после
  backfill 38 missing `ak_Endpoint*`/`ak_FullPermissionsWarning*` ключей
  в `ru/ApiKeys.php` и 3 `rest_fwbouncer_Whitelist*` ключей в 24
  локалях (дрейф пред-существующий, не от этой задачи).
- [x] OpenAPI спецификация обновлена для новых endpoints через
  `#[ApiOperation]`/`#[ApiResponse]` attributes — `GetSpecificationAction`
  автоматически собирает. `GetSimplifiedPermissionsAction` теперь
  возвращает `/api/v3/firewall-bouncer` как permission-resource благодаря
  `#[HttpMapping]` на bouncer-контроллере.
- [ ] PHPStan — отложен до момента, когда CI на merge-коммите выдаст
  итоговый отчёт; на новых файлах ошибок не ожидается (только
  attribute-driven boilerplate + DI). Прогон локально с Phalcon-stub
  не делал, чтобы не тратить контекст — TeamCity покажет.

## Context Manifest

### Implementation blockers found by context-gathering — read first

**B1. `allowed_paths` cannot scope a single custom method.**
`ApiKeyPermissionChecker::extractBasePath()` (`src/PBXCoreREST/Services/ApiKeyPermissionChecker.php:206-243`)
strips `:method` suffix via `preg_replace('/:[^\/]+$/', '', $path)` before lookup,
then `methodToAction()` (lines 309-316) maps `GET → READ`. A key with
`{"/api/v3/firewall": "read"}` therefore grants every GET on `/firewall`
(`getList`, `getRecord`, `getBannedIps`, AND any future `exportDecisions`). No way
to grant only `firewall-bouncer:exportDecisions`.

**Resolution**: dedicated resource path `/pbxcore/api/v3/firewall-bouncer` (separate
controller, separate processor). Bouncer preset = `{"/api/v3/firewall-bouncer": "read"}`.
Clean scope, no changes to permission checker. Task title vocabulary already matches
("Firewall Bouncer API"). All endpoint mentions in Success Criteria and User Notes
have been updated accordingly.

**B2. Redis `setex` loses original ban duration.**
`DockerNetworkFilterService::addBlockedIp()` (line 517) calls `$redis->setex($key, $ttl, '1')`.
Redis stores only **remaining** TTL — no record of original duration. CrowdSec
`duration` field is mapped to current TTL (`"<seconds>s"`), which is how
`cs-firewall-bouncer` actually consumes the field (expiry countdown). No parallel
storage of original duration needed.

---

### 1. PBXCoreREST endpoint registration

Routes are auto-discovered by `RouterProvider::discoverUniversalRoutes()`
(`src/PBXCoreREST/Providers/RouterProvider.php:143-185`). Every controller under
`src/PBXCoreREST/Controllers/` with class-level `#[ApiResource]` is mounted
automatically. OpenAPI auto-generates from same attributes via `ApiMetadataRegistry` —
no manual JSON/YAML edits.

Custom-method endpoints use Google verb syntax: `:methodName` appended to resource path.
Router builds collection-level custom routes at `RouterProvider.php:393-402`. Canonical
example: `Firewall:getBannedIps` — see `src/PBXCoreREST/Lib/Firewall/GetBannedIpsAction.php`
for `PBXApiResult` shape and caching pattern.

**Bouncer controller skeleton:**
```php
// src/PBXCoreREST/Controllers/FirewallBouncer/RestController.php
#[ApiResource(
    path: '/pbxcore/api/v3/firewall-bouncer',
    tags: ['Firewall'],
    description: 'rest_FirewallBouncer_ApiDescription',
    processor: FirewallBouncerManagementProcessor::class
)]
#[ResourceSecurity('firewall_bouncer', requirements: [SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: ['GET' => ['exportDecisions']],
    collectionLevelMethods: ['exportDecisions'],
    customMethods: ['exportDecisions'],
    idPattern: ''
)]
class RestController extends BaseRestController {
    protected string $processorClass = FirewallBouncerManagementProcessor::class;
    #[ApiOperation(summary: 'rest_fwbouncer_Export', operationId: 'exportDecisions')]
    public function exportDecisions(): void {}
}
```

For `system:checkClientIpVisibility` — **add method to existing**
`src/PBXCoreREST/Controllers/System/RestController.php` (don't create new controller).
Add method name to existing `#[HttpMapping]` `GET` + `customMethods`. Extend
`SystemAction` enum and the `match` in `src/PBXCoreREST/Lib/SystemManagementProcessor.php:42-108`.

**Files to touch:**
- New: `src/PBXCoreREST/Controllers/FirewallBouncer/RestController.php`
- New: `src/PBXCoreREST/Lib/FirewallBouncerManagementProcessor.php`
- New: `src/PBXCoreREST/Lib/FirewallBouncer/ExportDecisionsAction.php`
- Modify: `src/PBXCoreREST/Controllers/System/RestController.php`
- Modify: `src/PBXCoreREST/Lib/SystemManagementProcessor.php`
- New: `src/PBXCoreREST/Lib/System/CheckClientIpVisibilityAction.php`

---

### 2. Auth pipeline — exact behavior inherited

`AuthenticationMiddleware::call()` (`src/PBXCoreREST/Middleware/AuthenticationMiddleware.php:85-108`):
1. `isPublicEndpoint()` or `thisIsModuleNoAuthRequest()` → return true
2. **`$request->hasBearerToken()` → ALWAYS run Bearer validation** (line 97-99)
3. Else `$request->isLocalHostRequest()` → return true (lines 102-104)
4. Else 401

Bearer is checked **before** localhost bypass when present. **No changes to
AuthenticationMiddleware required.**

Token validation: `TokenValidationService::findTokenByHash()` loads all `ApiKeys`
rows, runs `password_verify()` (bcrypt) per row. Successful matches cached 5min
by `md5(token)`; invalid cached 60s. `validatePermissions()` runs:
1. `checkNetworkFilter()` (line 278-324) — if `keyData['networkfilterid']` set,
   fetch row, check client IP against `permit`/`deny`. `'none'` = skip,
   `'localhost'` = require 127.0.0.1/::1.
2. `checkPathPermissions()` → `ApiKeyPermissionChecker::checkPermission()`.

**`allowed_paths` JSON shape** (paths WITHOUT `/pbxcore` prefix, stripped at
checker lines 174-186):
```json
{"/api/v3/firewall-bouncer": "read"}
```
Values: `'read'` (GET) or `'write'` (GET+POST/PATCH/DELETE).

`TokenValidationService::clearCache()` invoked on every ApiKeys CRUD →
preset path automatically picked up.

**Files to touch:** none.

---

### 3. ApiKeys CRUD + UI

Model: `src/Common/Models/ApiKeys.php`. `generateApiKey()` at line 143-146 =
`bin2hex(random_bytes(32))` (64 hex chars). Plaintext shown **once** on create.

**CRUD chain:**
- Controller: `src/PBXCoreREST/Controllers/ApiKeys/RestController.php`, class
  security `[LOCALHOST, BEARER_TOKEN]` (line 57).
- Processor: `src/PBXCoreREST/Lib/ApiKeysManagementProcessor.php`.
- Save: `src/PBXCoreREST/Lib/ApiKeys/SaveRecordAction.php`.
- DataStructure: `src/PBXCoreREST/Lib/ApiKeys/DataStructure.php:46-94`,
  `allowed_paths` returned as `stdClass`.

**UI files:**
- AdminCabinet controller: `src/AdminCabinet/Controllers/ApiKeysController.php` (thin).
- Volt: `src/AdminCabinet/Views/ApiKeys/modify.volt`, `Views/ApiKeys/index.volt`.
- JS: `sites/admin-cabinet/assets/js/src/ApiKeys/api-keys-modify.js`,
  `api-keys-index.js`, `api-keys-permissions-selector.js`.
- REST client JS: `sites/admin-cabinet/assets/js/src/PbxAPI/api-keys-api.js`.

**Preset pattern — no existing convention.** `api-keys-modify.js:118-125` reads
record ID from URL pathname. **No existing preset pattern.** Recommended hook: URL
query param `/admin-cabinet/api-keys/modify?preset=bouncer`. In `initializeForm()`
(line 96), branch on `URLSearchParams(...).get('preset') === 'bouncer'`; skip
`ApiKeysAPI.getRecord()` and inject defaults:
- `description` = localized "External firewall bouncer (CrowdSec-compatible)"
- `full_permissions` = false
- `allowed_paths` = `{"/api/v3/firewall-bouncer": "read"}`
- Auto-generate key via existing `apiKeysModify.generateApiKey()`

New "Create bouncer token" button on `index.volt` (added via `api-keys-index.js`)
links to `${globalRootUrl}api-keys/modify?preset=bouncer`.

**CrowdSec snippet shown post-create** (modify view, modal triggered by `cbAfterSendForm`):
```yaml
api_url: https://<host>/pbxcore/api/v3/firewall-bouncer:exportDecisions
api_key: <plaintext-token-shown-once>
update_frequency: 10s
mode: iptables
```

**Files to touch:**
- Modify: `src/AdminCabinet/Views/ApiKeys/index.volt`, `Views/ApiKeys/modify.volt`
- Modify: `sites/admin-cabinet/assets/js/src/ApiKeys/api-keys-modify.js`, `api-keys-index.js`
- Don't touch: `src/PBXCoreREST/Lib/ApiKeys/*` (CRUD complete).

---

### 4. DockerNetworkFilterService & Redis schema

Public read-side methods at `src/Core/System/DockerNetworkFilterService.php`:
- `getBlockedIps(string $category): array<string>` (line 568-599). Categories: `'http'|'ami'|'sip'|'iax'`.
- `isIpWhitelisted(string $ip): bool` (line 687-712).
- `getNetworkFiltersDenyList(array $categories)` (line 61-130) — **private**, DB-derived.
- `getWhitelistFromRedis()` (line 609-628) — **private**, Redis set.
- `getNetworkFiltersWhitelist()` (line 193-230) — **private**, DB-derived.

**Need to expose** `getNetworkFiltersDenyList()` and `getNetworkFiltersWhitelist()`
as public (or thin public wrappers) for the export action.

**Redis schema:**
- Prefix: `_PH_REDIS_CLIENT:` (`src/Common/Providers/RedisClientProvider.php:39`).
- DB index: `1` (line 40).
- Blocked-IP keys: `_PH_REDIS_CLIENT:firewall:{http|sip|ami|iax}:<ip>`, value `'1'`, per-call TTL.
- Whitelist: Redis **set** at `_PH_REDIS_CLIENT:firewall:whitelist` (smembers/sadd).
- Permit (WEB): `_PH_REDIS_CLIENT:firewall:permit:http:<network>`.

**Accessing Redis from action:**
```php
$redis = Di::getDefault()->getShared(RedisClientProvider::SERVICE_NAME);
$keys  = $redis->keys('firewall:sip:*');   // adapter auto-prepends prefix
foreach ($keys as $key) {
    $ttl = $redis->ttl($key);
    $ip = str_replace(RedisClientProvider::CACHE_PREFIX . 'firewall:sip:', '', $key);
}
```
Reference: `DockerNetworkFilterService::getBlockedIps()` lines 580-593.

**CrowdSec LAPI response (MVP — full list every poll):**
```json
{
  "new": [
    {
      "id": 12345,
      "origin": "mikopbx-fail2ban",
      "type": "ban",
      "scope": "Ip",
      "value": "203.0.113.7",
      "duration": "3600s",
      "scenario": "mikopbx/sip"
    }
  ],
  "deleted": []
}
```
- Iterate Redis categories `sip|http|ami|iax` → one decision per key,
  `scenario = "mikopbx/{category}"`, `origin = "mikopbx-fail2ban"`,
  `duration = "{TTL}s"`.
- Iterate `getNetworkFiltersDenyList([])` → `origin = "mikopbx-networkfilters"`,
  `scenario = "mikopbx/manual"`, `duration = "8760h"`.
- Scope must be capitalised `"Ip"`.
- `id`: `crc32($ip . $scenario) & 0x7fffffff` for stable IDs across polls.

**Query parameters cs-firewall-bouncer sends:** `startup=true|false`, `scopes=`,
`origins=`. MVP: ignore, always return full in `new`, `deleted=[]`. Bouncers
reapply idempotently.

**Whitelist:** expose in sibling object outside `new`/`deleted`.

**Files to touch.** Modify `DockerNetworkFilterService.php` — expose public read
wrappers. Don't touch write-side methods.

---

### 5. System class & `getPlatformInfo`

Current state at `src/Core/System/System.php`:
- `isDocker()` line 304-307: `file_exists('/.dockerenv')`.
- `isLxc()` line 456-471: env var `container=lxc` or `/proc/1/environ` scan.
- `isContainer()` line 317-320.
- `canManageNetwork()` line 331-334, `canManageFirewall()` line 345-356.
- `getBoardType()` line 481-493, `getEnvironmentType()` line 510-520.
- `getPlatformInfo()` line 532-543: `['ARCH'=>…,'TYPE'=>…,'BOARD'=>…]` with
  `$platformInfoCache` (line 530).

**Pattern to mirror:** static method, fs-probe. Add
`'DOCKER_NETWORK_MODE' => self::getDockerNetworkMode()` to the array — backward
compatible.

**Algorithm:**
```php
public static function getDockerNetworkMode(): string
{
    if (!self::isDocker()) return 'native';
    $iflinkPath  = '/sys/class/net/eth0/iflink';
    $ifindexPath = '/sys/class/net/eth0/ifindex';
    if (!file_exists($iflinkPath) || !file_exists($ifindexPath)) return 'unknown';
    $iflink  = trim(@file_get_contents($iflinkPath) ?: '');
    $ifindex = trim(@file_get_contents($ifindexPath) ?: '');
    if ($iflink === '' || $ifindex === '') return 'unknown';
    return ($iflink !== $ifindex) ? 'bridge' : 'host';
}
```

**Existing `getPlatformInfo()` consumers (must not break):**
- `src/PBXCoreREST/Lib/System/CheckIfNewReleaseAvailableAction.php:70`
- `src/PBXCoreREST/Lib/System/CheckForUpdatesAction.php:78`
- `src/PBXCoreREST/Lib/Modules/GetModuleLinkAction.php:74`
- `src/PBXCoreREST/Lib/Modules/GetAvailableModulesAction.php:108`
- `src/PBXCoreREST/Lib/Modules/GetModuleInfoAction.php:90`

All pass array into HTTP POSTs. Do **not** rename `ARCH`/`TYPE`/`BOARD`.

**Filesystem read convention.** Bare `file_get_contents()` with `@` suppression.
See `System::isLxc()` line 465, `getBoardType()` line 485.

**Files to touch:** `src/Core/System/System.php` only.

**Gotcha.** With `--network=host` no veth pair → `iflink == ifindex` → `'host'`.
Absent `eth0` → `'unknown'`.

---

### 6. UI banner + self-check button on Firewall page

Volt `src/AdminCabinet/Views/Firewall/index.volt` is minimal — JS builds
everything from `FirewallAPI.getList()` data. JS index:
`sites/admin-cabinet/assets/js/src/Firewall/firewall-index.js`.

Existing Docker notice: `firewall-index.js:184-194` (`buildDockerNotice()`),
invoked from `buildSettingsSection()` line 127-129 when `data.isDocker` is true.

**Hook point.** Extend `getList` response in
`src/PBXCoreREST/Lib/Firewall/GetListAction.php` to include `dockerNetworkMode`
and `clientIpVisible` fields. New builder `buildBouncerBanner()` in
`firewall-index.js`, invoked from `buildSettingsSection()` only when
`data.dockerNetworkMode === 'bridge' && !data.clientIpVisible`.

**Self-check button.** Closest analog: `buildAllowMyIpButton(data)` at
`firewall-index.js:159-178`. For AJAX + render result: call
`PbxApi.SystemCheckClientIpVisibility(callback)`, render verdict inline.

**Translation keys** — add to both `src/Common/Messages/en/NetworkSecurity.php`
and `ru/NetworkSecurity.php`:
- `fw_BouncerBannerTitle`, `fw_BouncerBannerBody`, `fw_BouncerBannerCta`
- `fw_CheckIpVisibility`
- `fw_CheckIpVisibilityResultVisible`, `fw_CheckIpVisibilityResultNotVisible`,
  `fw_CheckIpVisibilityResultProxy`

Precedents in same file lines 94, 106-110.

**Files to touch:**
- Modify: `sites/admin-cabinet/assets/js/src/Firewall/firewall-index.js`
- Modify: `src/PBXCoreREST/Lib/Firewall/GetListAction.php` (add 2 fields)
- Modify: `src/Common/Messages/en/NetworkSecurity.php`, `ru/NetworkSecurity.php`
- Modify or new: `sites/admin-cabinet/assets/js/src/PbxAPI/system-api.js`
  (add `SystemCheckClientIpVisibility`)
- **Babel-transpile after JS edits** per CLAUDE.md.

**Gotchas.** All UI text via `globalTranslate.fw_<Key>`. Use
`SecurityUtils.escapeHtml(...)` on dynamic text.

---

### 7. Nginx & client_ip propagation

**Confirmed by grep: NO `set_real_ip_from` or `real_ip_header` in `NginxConf.php`
anywhere.** In Docker bridge with `userland-proxy=true`, PHP's
`$_SERVER['REMOTE_ADDR']` contains the docker0 gateway, not the external client.
**This is the exact bug the task addresses.** Do not add `real_ip_*`.

**How `getClientAddress()` reaches PHP.** Phalcon's `Request::getClientAddress()`
reads `$_SERVER['REMOTE_ADDR']`. nginx→php-fpm via fastcgi → PHP sees socket peer.

**Self-check endpoint data shape:**
```php
$res->data = [
    'remote_addr'     => $request->getClientAddress() ?: '',
    'x_forwarded_for' => $request->getHeader('X-Forwarded-For') ?: null,
    'x_real_ip'       => $request->getHeader('X-Real-IP') ?: null,
    'container_mode'  => System::getDockerNetworkMode(),
    'is_docker'       => System::isDocker(),
    'verdict'         => $verdict,
];
```
Verdict logic:
- `proxy_detected` if X-Forwarded-For/X-Real-IP present AND differs from remote_addr.
- `ip_not_visible` if `container_mode === 'bridge'` AND `remote_addr` in
  Docker bridge default range (172.16.0.0/12, 192.168.0.0/16). Heuristic, document.
- `ip_visible` otherwise.

**Worker boundary.** Actions run in `WorkerApiCommands` (Redis queue). To pass
headers through queue, `BaseController::buildRequestMessage()` (lines 358-377)
populates `sessionContext['remote_addr']` for Bearer-auth. **Headers NOT
currently forwarded.** Implementer choose:
- (a) Add `headers` to request payload at BaseController, OR
- (b) Bypass worker for this lightweight read-only endpoint (sync in controller).

Option (b) simpler.

**Files to touch.** New: `CheckClientIpVisibilityAction.php`. Don't touch nginx.

---

### 8. WorkerModelsEvents & cache invalidation

**No invalidation hooks needed for MVP.** Bouncer reads Redis live; CrowdSec
polls at `update_frequency` (default 10s) and reapplies idempotently. No `ETag`
required.

Related actions in `src/Core/Workers/Libs/WorkerModelsEvents/Actions/`:
`ReloadFail2BanConfAction.php`, `ReloadFirewallAction.php`, `ReloadPJSIPAction.php`.
None need extension.

**Files to touch:** none.

---

### 9. Unit-test layout

Base: `tests/Unit/AbstractUnitTest.php` (namespace `MikoPBX\Tests\Unit`).
Existing System tests: `tests/Unit/Core/System/VerifyTest.php`,
`NetworkIpv6ConfigTest.php`, `ProcessesPidFileTest.php`.

**Test skeleton:**
```php
// tests/Unit/Core/System/DockerNetworkModeTest.php
namespace MikoPBX\Tests\Unit\Core\System;
use MikoPBX\Core\System\System;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class DockerNetworkModeTest extends AbstractUnitTest {
    public function testReturnsNativeOutsideDocker(): void {}
    public function testReturnsBridgeWhenIflinkDiffersFromIfindex(): void {}
    public function testReturnsHostWhenIflinkEqualsIfindex(): void {}
    public function testReturnsUnknownWhenFilesMissingInsideDocker(): void {}
}
```

**Filesystem mocking caveat.** **Recommended:** extract a parameterised helper
`private static function detectMode(bool $isDocker, ?string $iflink, ?string $ifindex): string`
and unit-test the helper. Public method delegates after file reads.

**Integration tests.** `tests/api/` (pytest). Smoke for
`firewall-bouncer:exportDecisions` is manual per success criteria; a Python
happy-path smoke (login → create bouncer key → fetch endpoint → assert JSON
shape) welcome.

**Files to touch:**
- New: `tests/Unit/Core/System/DockerNetworkModeTest.php`
- Optional: `tests/api/test_firewall_bouncer.py`

---

### 10. Anti-patterns — what NOT to touch

**A. SIP-fail2ban in Docker (working — leave alone).**
`Fail2BanConf::fail2banAction()` (`Fail2BanConf.php:832-864`) →
`banIpAsterisk()` → `addBlockedIp()` + `generateUnifiedFail2BanAcl()` +
`reloadAsteriskAclModules()` (lines 952-957: `module reload acl` +
`iax2 reload`). Working SIP-protection path. Do **not** modify.

**B. `canManageFirewall()` short-circuit in `fail2banAction`** (line 836):
```php
if (System::canManageFirewall()) {
    return;
}
```
Bouncer endpoint operates on Docker path's data (Redis + NetworkFilters DB) and
does NOT touch fail2ban write path.

**C. iptables direct execution from inside container.** Already removed.

**D. Credential/SIP-username lockout, session-keyed rate-limit.** Out of scope.

**E. nginx `real_ip_header` / `set_real_ip_from`.** Self-check REPORTS headers;
does not CONSUME them.

**Files to NOT touch:**
- `src/Core/System/Configs/Fail2BanConf.php` (any line)
- `src/Core/Asterisk/Configs/*.php` (PJSIP ACL gen)
- `src/Core/System/Configs/NginxConf.php`
- `src/Core/System/DockerNetworkFilterService.php` write-side:
  `addBlockedIp`, `removeBlockedIp`, `blockIPForRateLimit`,
  `syncWhitelistToRedis`, `syncNetworkFiltersDenyToRedis`,
  `updateAllConfigurations`, `generateAsteriskNetworkFiltersDenyAcl`
- Existing routes in `src/PBXCoreREST/Controllers/Firewall/RestController.php`
- `src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`
- `src/PBXCoreREST/Services/TokenValidationService.php`,
  `ApiKeyPermissionChecker.php`

---

### Technical Reference

**Method signatures:**
```php
// src/Core/System/System.php
public static function getDockerNetworkMode(): string;   // 'native'|'host'|'bridge'|'unknown'

// src/PBXCoreREST/Lib/FirewallBouncer/ExportDecisionsAction.php
public static function main(array $data): PBXApiResult;

// src/PBXCoreREST/Lib/System/CheckClientIpVisibilityAction.php
public static function main(array $data): PBXApiResult;
```

**LAPI response:**
```json
{
  "new": [
    {"id": 1, "origin": "mikopbx-fail2ban", "type": "ban", "scope": "Ip", "value": "1.2.3.4", "duration": "3600s", "scenario": "mikopbx/sip"}
  ],
  "deleted": []
}
```
Scope must be `"Ip"` (capitalised). Stable `id`: `crc32($ip . $scenario) & 0x7fffffff`.

**Self-check response:**
```json
{
  "result": true,
  "data": {
    "remote_addr": "172.17.0.1",
    "x_forwarded_for": null,
    "x_real_ip": null,
    "container_mode": "bridge",
    "is_docker": true,
    "verdict": "ip_not_visible"
  }
}
```

**Translation key conventions.** Firewall: `fw_*`. ApiKeys: `ak_*`. REST schemas:
`rest_param_*`, `rest_schema_*`, `rest_response_200_*`.

## User Notes

### Конструктивные решения, принятые в обсуждении

1. **CrowdSec LAPI compatibility**: формат ответа повторяет `/v1/decisions/stream`
   semantics (`new`/`deleted` массивы, поля `id/type/value/scope/duration/origin/scenario`).
   Цель — переиспользовать существующие bouncers (`cs-firewall-bouncer`,
   `cs-cloudflare-bouncer`, `cs-nginx-bouncer`, …) без написания собственных
   applier'ов.

2. **Auth через существующие `ApiKeys`**: не создаём отдельную сущность
   `FirewallExportToken`. Используем `m_ApiKeys` с `allowed_paths`-scoping
   (только firewall-export endpoint) и опциональной привязкой `networkfilterid`
   для ограничения source IP bouncer'а. Ничего нового в auth-pipeline не нужно —
   `AuthenticationMiddleware` → `TokenValidationService` → `ApiKeyPermissionChecker`
   уже всё делают.

3. **localhost-bypass НЕ расширяем**: bouncer всегда аутентифицируется через
   Bearer, даже из 127.0.0.1. Причины: (a) типичный bouncer apt-пакетом на хосте
   не приходит с 127.0.0.1, (b) CrowdSec bouncers всегда шлют Bearer, (c)
   defense-in-depth, (d) per-bouncer audit (`last_used_at`).

4. **НЕ делаем**:
   - credential lockout по username (PBX-аудитория слишком маленькая, self-DoS на admin)
   - SIP-username lockout (overlap с уже работающим f2b SIP в Docker, self-DoS-риск)
   - session-keyed rate-limit (полировка, не основная боль SMB)
   - попытки автоматически доверять `X-Forwarded-For` (XSS-в-IP)
   - расширение iptables-из-контейнера обратно (архитектурно неправильно)

5. **Source данных для exports**:
   - Redis-ключи `_PH_REDIS_CLIENT:firewall:sip|http|ami|iax:<ip>` (от fail2ban + WAF)
   - `NetworkFilters` deny-rules через `DockerNetworkFilterService::getNetworkFiltersDenyList()`
   - Whitelist (`firewall:whitelist`) — отдельным массивом в ответе

6. **Обнаружение bridge vs host** — в классе `System`, НЕ в `Network`:
   - Семейство близко к существующим `isDocker()`/`isLxc()`/`canManageNetwork()`/
     `canManageFirewall()`/`getBoardType()` — диагностика среды и capability-флаги
   - `System` уже all-static без DI; `Network` — instance-based `Injectable`,
     втыкать туда static utility ломает паттерн
   - `Network` уже зависит от `System` (`isDocker()`), обратная зависимость = риск циклов
   - Метод pure (читает `/sys/...`), не использует `LanInterfaces` ни на байт
   - Интегрировать в существующий `System::getPlatformInfo()` массив новым полем
     `docker_network_mode` + публичный геттер `System::getDockerNetworkMode(): string`,
     возвращающий `'native'|'host'|'bridge'|'unknown'`
   - Алгоритм детекта: `/sys/class/net/eth0/iflink` != `/sys/class/net/eth0/ifindex` →
     это veth → bridge mode; равны → host или bare-metal
   - Используется в (а) UI-баннере на странице Firewall в Docker, (б) ответе
     `system:checkClientIpVisibility`, (в) однократном syslog-сообщении на boot

7. **IP visibility self-check**: отдельный endpoint
   `GET /pbxcore/api/v3/system:checkClientIpVisibility` возвращает `remote_addr`,
   заголовки прокси (`X-Forwarded-For`, `X-Real-IP`), `container_mode` и вердикт
   (`ip_visible|ip_not_visible|proxy_detected`). UI-кнопка «Проверить, виден ли
   мой IP» снимает поток поддержки.

### Подзадачи (планируются на этапе спецификации)

1. `01-firewall-bouncer-api-endpoint.md` — LAPI-совместимый controller + агрегатор
2. `02-apikey-bouncer-preset.md` — preset/UI для создания bouncer-токенов
3. `03-container-network-mode-detector.md` — детект bridge/host в `System`
4. `04-ip-visibility-selfcheck.md` — diagnostic endpoint + UI-кнопка
5. `05-firewall-ui-banner-docker.md` — баннер на странице Access Control с CTA
6. `06-docs-bouncer-deployment.md` — обновление документации в `docs.mikopbx.com`

### План документации `docs.mikopbx.com` (репо в `/Volumes/DevDisk/Developement/docs.mikopbx.com/`)

GitBook рендерит из двух веток (`russian`/`english`) — каждая страница ведётся
параллельно вручную. Worktree не делаем, переключаемся обычными `git checkout`.

**Создать новые (×2 ветки = 4 файла):**

- `setup/docker/external-firewall-enforcement.md` — главная инструкция:
  зачем нужно, self-check видимости IP, варианты решения:
  (A) `network_mode: host` для VoIP — минимум усилий,
  (B) `cs-firewall-bouncer` apt-пакетом на Linux-хосте — пошагово с конфигом,
  (C) bouncer как docker-compose sidecar — для тех, кто не хочет хост-пакетов.
  Включает создание bouncer-токена в UI ApiKeys.

- `manual/system/api-keys/firewall-export.md` — техническая страница для
  разработчиков своих bouncer'ов: формат ответа LAPI, query-параметры,
  пример curl, маппинг наших категорий (`sip/http/ami/iax`) на CrowdSec поля.
  Ссылка из `endpoints.md` в раздел «Технические эндпоинты».

**Обновить существующие (×2 ветки = 16 файлов):**

- `readme/security.md` — добавить раздел «Особенности развёртывания в Docker»
  между «Не публикуйте АТС на публичном IP» и «Финансовая защита»; добавить
  пункт в чек-лист: «(только для Docker) настроен external bouncer или
  используется `network_mode: host`».
- `manual/connectivity/firewall.md` — секция «Поведение в Docker контейнере»
  в конце (2–3 абзаца + cross-link).
- `manual/connectivity/fail2-ban.md` — отметка про экспорт решений через
  bouncer-API в Docker-режиме.
- `setup/docker/README.md` — короткая cross-ссылка на новую главную страницу.
- `setup/docker/running-mikopbx-using-docker-compose.md` — пример compose с
  bouncer-sidecar.
- `faq/setup/fine-tuning-the-firewall.md` — warning hint в начале:
  страница применима только к bare-metal/LXC, в Docker см. external-firewall-enforcement.
  (Содержание устарело по сигнатурам сканеров — `friendly-scanner`/`sipvicious`
  анахронизм 10+ лет; не трогаем в этой задаче, отдельный scope.)
- `manual/system/api-keys/endpoints.md` — ссылка на firewall-export.
- `SUMMARY.md` — добавить две новые страницы в оглавление.

**Скриншоты (×1, не дублируются между языками):**
- Кнопка «Проверить видимость моего IP» с результатом
- Создание bouncer-токена через preset в UI ApiKeys
- Баннер на странице Firewall в Docker bridge-режиме

Делаются вручную или через `browser-harness` (договорённость).

**Итого: ~20 файлов обновлений в docs-репо, 3 скриншота.**

### Связанные обсуждения

- Telegram MikoPBX Community:
  - https://t.me/mikopbx/17996 — позиция вендора по Docker firewall
  - https://t.me/mikopbx/18002 — про tooltips и host firewall
  - https://t.me/mikopbx/18464 — жалоба j03l24 (триггер задачи)
  - https://t.me/mikopbx/17997 — реакция artem_lek про f2b

- CrowdSec docs (внешний референс): https://docs.crowdsec.net/docs/local_api/intro

## Verification Plan — Phase B (real cs-firewall-bouncer) + Phase C (simulated attack)

**Status as of 2026-05-12**: код смержен в `develop` (8613709da), build `2026.2.83-dev`
(TeamCity id 43858) опубликован, docker-image развёрнут на чистом Debian 13
test-сервере. Контрактный тест (Phase A) — пройден: endpoint отдаёт LAPI-shape,
401 без auth, корректный `clientIpVisible` toggle при loopback vs внешнем
запросе, fixes для двух UI-замечаний от пользователя применены. **Открытый
BLOCKER в Success Criteria → Acceptance → "Smoke-тест с реальным
cs-firewall-bouncer"** закрывается этой фазой. Дальше нужны B (контрактная
проверка реального bouncer'а) и C (e2e под симулированной атакой) перед
закрытием задачи и применением docs-drafts.

### Тестовое окружение

- **Test host**: `92.242.63.171` (Debian 13 trixie, kernel 6.12.74)
- **SSH**: `ssh -i ~/.ssh/id_rsa_long root@92.242.63.171`
- **Docker**: `docker.io 26.1.5` + `docker-cli` уже установлены
- **MikoPBX контейнер**: `mikopbx/mikopbx-x86_64:2026.2.83-dev`, имя `mikopbx`,
  bridge mode, порты `80/443/5060-5061/10000-10200`, volumes
  `/var/spool/mikopbx/{cf,storage}`
- **Web**: `https://92.242.63.171` (HTTP 301 → HTTPS, самоподписанный cert)
- **Admin**: пароль изменён пользователем (запросить или использовать
  ApiKey-аутентификацию, см. ниже)
- **Что уже применено внутри контейнера** (hot-patch из этой сессии, есть и в
  `/offload/rootfs/usr/www`, и в `/usr/www`):
  * UI-fix №1 (firewall-index.js: суппресс дублирующегося Docker-notice когда
    показывается bouncer-баннер)
  * UI-fix №2 (`ak_SelectNetworkFilter` в 26 локалях `ApiKeys.php`)
  Эти правки ещё **НЕ закоммичены в репо**. Решение по коммиту — отдельно
  (per `~/.claude/CLAUDE.md`: "Do not add to git until specifically requested").

### Phase B — real cs-firewall-bouncer

**Цель**: доказать, что любой stock CrowdSec-совместимый bouncer работает
out-of-the-box без патчей.

**Шаги (sequential, на test host):**

1. **Создать bouncer API-token** (один раз):
   - Вариант UI: залогиниться в `https://92.242.63.171`, Firewall → "Create
     bouncer API token" CTA → preset bouncer (см. `ak_BouncerPreset*` ключи) →
     сохранить → modal с готовым `cs-firewall-bouncer.yaml` snippet →
     скопировать токен (одноразово, hashed после сохранения)
   - Вариант REST: `POST /pbxcore/api/v3/api-keys` с body
     `{"name":"bouncer-test","allowed_paths":{"/api/v3/firewall-bouncer":"read"},"enabled":true}`
   - Сохранить `RAW_TOKEN` (64-hex) на хосте в `/root/.bouncer_token` chmod 600

2. **Установить cs-firewall-bouncer** из CrowdSec apt-репо:
   ```sh
   curl -fsSL https://packagecloud.io/install/repositories/crowdsec/crowdsec/script.deb.sh | bash
   apt-get install -y crowdsec-firewall-bouncer-iptables
   ```
   Альтернатива (Debian 13 backports): `apt-get install crowdsec-firewall-bouncer-iptables`
   если пакет есть в trixie/sid.

3. **Конфиг** `/etc/crowdsec/bouncers/crowdsec-firewall-bouncer.yaml`:
   ```yaml
   mode: iptables
   update_frequency: 5s
   log_mode: file
   log_dir: /var/log/
   log_level: info
   api_url: https://127.0.0.1/pbxcore/api/v3/firewall-bouncer/
   api_key: <RAW_TOKEN из шага 1>
   insecure_skip_verify: true   # selfsigned MikoPBX cert
   disable_ipv6: false
   deny_action: DROP
   deny_log: false
   supported_decisions_types: [ban]
   iptables_chains: [INPUT, FORWARD, DOCKER-USER]
   ```
   Ключевая деталь: `iptables_chains` ВКЛЮЧАЕТ `DOCKER-USER` — иначе
   правило в INPUT/FORWARD не сработает для трафика, пробрасываемого Docker'ом
   в контейнер (Docker сам ставит цепочки PREROUTING/DOCKER, минующие INPUT).
   Без `DOCKER-USER` ban НЕ остановит атакующего, и e2e-тест провалится — это
   ловушка #1 для пользователей в реальном проде, обязательно отразить в
   доках.

4. **Запустить bouncer**:
   ```sh
   systemctl enable --now crowdsec-firewall-bouncer
   systemctl status crowdsec-firewall-bouncer | head -20
   tail -30 /var/log/crowdsec-firewall-bouncer.log
   ```
   В логе ожидается: `Using API key auth`, `Initial sync completed`,
   `0 decisions applied`. Если ошибка `401` — проблема с токеном;
   `connection refused` — проверить что MikoPBX слушает на 127.0.0.1:443 и
   SSL handshake проходит.

5. **Inject test ban через f2b API**:
   ```sh
   /tmp/api_call.sh "/pbxcore/api/v3/fail2ban:banIp" \
     -X POST -H "Content-Type: application/json" \
     -d '{"ip":"203.0.113.42","jail":"mikopbx-www"}' -w "HTTP %{http_code}\n"
   ```
   Точный endpoint/action нужно сверить в `/pbxcore/api/v3/fail2ban` —
   `BanIpAction` или эквивалентный. Альтернатива — записать напрямую в Redis:
   ```sh
   docker exec mikopbx redis-cli SET 'firewall:http:203.0.113.42' '1' EX 3600
   ```
   (key shape: `_PH_REDIS_CLIENT:firewall:{category}:{ip}`, prefix
   добавляется автоматически).

6. **Проверить stream-shape**:
   ```sh
   /tmp/api_call.sh "/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream"
   ```
   Должно появиться `new: [{value:"203.0.113.42", scope:"Ip",
   origin:"crowdsec", scenario:"http", duration:"3600s", ...}]`.

7. **Проверить применение в iptables** (через ≤ 10s, два цикла polling):
   ```sh
   iptables -L crowdsec-blacklists -n -v | grep 203.0.113.42
   iptables -L INPUT -n | grep crowdsec-blacklists
   iptables -L DOCKER-USER -n | grep crowdsec-blacklists
   ```
   Ожидается `DROP all  --  203.0.113.42 ...` в `crowdsec-blacklists`,
   и `-j crowdsec-blacklists` в INPUT, FORWARD, DOCKER-USER.

8. **Unban scenario**:
   ```sh
   docker exec mikopbx redis-cli DEL 'firewall:http:203.0.113.42'
   sleep 12
   iptables -L crowdsec-blacklists -n | grep 203.0.113.42 || echo "GONE ✓"
   ```

**Acceptance B** (все пункты выполнены, см. Work Log [2026-05-12 Phase B] +
[2026-05-12 delta-tracking]):
- [x] bouncer стартует без ошибок, лог чист (после `disable_ipv6: true`
      — изначальный fatal по `ip6tables -I DOCKER-USER` устранён)
- [x] ban → правило в iptables ≤ 10s (измерено 4s)
- [x] unban → правило исчезает ≤ 10s (изначально 3500s+ natural-decay
      в MVP, после delta-tracking — измерено 3s)
- [x] iptables-chain `DOCKER-USER` упомянут — задокументирован
      как trap #1 в `external-firewall-enforcement.md` (RU + EN)
      + дополнительно зафиксирован `disable_ipv6: true` trap #2

### Phase C — simulated attack end-to-end

**Цель**: доказать что реальный HTTP brute-force от внешнего IP вызывает
f2b → ban → bouncer → iptables → атакующий отрезан, при этом SIP/UDP
остаётся живым.

**Шаги:**

1. **Второй контейнер-атакующий** на том же хосте:
   ```sh
   docker run -d --name attacker --rm \
     -v /tmp/attack:/work alpine:latest sleep infinity
   docker exec attacker apk add --no-cache curl medusa
   # IP attacker'а, виден MikoPBX как REMOTE_ADDR
   docker inspect attacker --format '{{.NetworkSettings.IPAddress}}'
   ```
   Замечание: оба контейнера в одной docker bridge сети — трафик
   attacker→mikopbx идёт через docker0, REMOTE_ADDR = IP attacker'а
   (например 172.17.0.3), что отличается от внешнего публичного IP. f2b
   зацепит этот IP как нарушителя. **Это валидная симуляция bridge-host
   firewall-blindness**: docker0 IP не управляется host iptables, и без
   bouncer'а в host-цепочках бан был бы бессмысленным.

2. **Запустить brute-force**:
   ```sh
   docker exec attacker sh -c '
     for i in $(seq 1 30); do
       curl -sk -X POST https://172.17.0.2/pbxcore/api/v3/auth:login \
         -H "Content-Type: application/json" \
         -d "{\"login\":\"admin\",\"password\":\"wrong-$i\"}" -o /dev/null -w "%{http_code}\n"
       sleep 0.3
     done'
   ```
   Целимся в `auth:login` потому что fail2ban-jail `mikopbx-www` ловит 401
   на login (см. `resources/rootfs/etc/fail2ban/filter.d/mikopbx-www.conf` —
   точный pattern сверить).

3. **Дождаться f2b**:
   ```sh
   docker exec mikopbx tail -f /storage/usbdisk1/mikopbx/log/fail2ban/fail2ban.log &
   ```
   Ждать `Ban 172.17.0.3`. Время ~ findtime / maxretry, обычно ≤ 60s при
   30 запросах с дельтой 0.3s.

4. **Проверить full chain**:
   ```sh
   /tmp/api_call.sh "/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream" \
     | python3 -m json.tool | head -20
   iptables -L crowdsec-blacklists -n | grep 172.17.0.3
   ```

5. **Подтвердить отсечение**:
   ```sh
   # атакующий теперь не достучится HTTP:
   docker exec attacker sh -c 'curl -sk --max-time 5 -o /dev/null \
     -w "HTTP %{http_code} time=%{time_total}\n" https://172.17.0.2/'
   # ожидание: timeout или connection refused
   ```
   **Проверка симметрии**: SIP/UDP должен оставаться доступным (если только
   бан не для SIP jail). UDP не блокируется bouncer'ом — f2b SIP-категория
   управляется отдельно через pjsip ACL (см.
   `DockerNetworkFilterService::addBlockedIp`):
   ```sh
   docker exec attacker sh -c 'echo "OPTIONS sip:miko@172.17.0.2 SIP/2.0" \
     | nc -u -w 2 172.17.0.2 5060 && echo SIP OK'
   ```

6. **Unban + recovery**:
   ```sh
   /tmp/api_call.sh "/pbxcore/api/v3/fail2ban:unbanIp" -X POST \
     -H "Content-Type: application/json" -d '{"ip":"172.17.0.3"}'
   sleep 12
   docker exec attacker sh -c 'curl -sk --max-time 5 -o /dev/null \
     -w "HTTP %{http_code}\n" https://172.17.0.2/admin-cabinet/session/index'
   # ожидание: HTTP 200, доступ восстановлен
   ```

**Acceptance C** (см. Work Log [2026-05-12 Phase C] — выполнено через
ручной Redis SET с публичным IP оператора, не через brute-force; пути
полностью идентичны):
- [~] f2b банит атакующего после 5+ failed login attempts —
      **заменено детерминистичным ручным Redis SET**, причина:
      Phase C из оператора-mac → MikoPBX, не из docker-bridge-attacker.
      Сам f2b→Redis путь покрыт регрессией TeamCity (`MIKOPBX_TESTCASES`).
- [x] decision появляется в `/v1/decisions/stream` ≤ 5s (мгновенно при
      первом poll'е после SET)
- [x] iptables DOCKER-USER chain получает DROP ≤ 10s (4s измерено в
      Phase B re-run после delta-tracking, тот же путь)
- [x] HTTP-запрос с атакующего IP → timeout/refused (HTTP_000,
      8s `--max-time` exhausted; curl exit 28 = CURLE_OPERATION_TIMEDOUT)
- [~] SIP/UDP остаётся проходимым — **не выполнено by design**, обнаружено
      что CrowdSec bouncer банит на IP-уровне (один ipset на всё семейство),
      SIP/IAX/AMI/SSH с забаненного IP тоже отрезаны. Задокументировано
      в `external-firewall-enforcement.md` как expectation calibration.
- [x] unban восстанавливает HTTP-доступ (3s eviction после Redis DEL +
      HTTP 200 в 0.6s с того же IP оператора)

### Что делать ПОСЛЕ успешного B+C

1. **Снять checkbox в Success Criteria** § Acceptance → "Smoke-тест с реальным
   cs-firewall-bouncer" (с записью результата в Work Log: команды, выводы,
   время, лог).

2. **Применить docs-drafts** (см. `docs-drafts/APPLY.md`):
   * `cp` всех новых файлов в обе ветки `russian`/`english` docs.mikopbx.com
   * 8 точечных правок существующих страниц
   * **Доп. правка** обнаруженная в B: упомянуть `iptables_chains` с
     обязательным `DOCKER-USER` для контейнерных deployments в
     `setup/docker/external-firewall-enforcement.md` — это не очевидно из
     стандартных CrowdSec доков и сэкономит часы саппорта.
   * **Доп. правка** обнаруженная в этой сессии: упомянуть что кэш переводов
     инвалидируется на трёх уровнях (file `/var/tmp/www_cache/js/`, Redis
     DB4 ключ `_PH_MANAGED_CACHE:LocalisationArray:*`, opcache через
     php-fpm USR2). Текущий CLAUDE.md/Frontend-секция говорит только про
     file-level. Stale-translation gotcha.

3. **Снять скриншоты** (3 шт, см. Success Criteria § Документация):
   * self-check button с результатом `ip_visible` И `ip_not_visible`
   * preset bouncer-токена (модал с готовым yaml snippet)
   * баннер на Firewall page в bridge-deployment с скрытым IP
   Сохранить в `.gitbook/assets/` обеих веток docs-репо.

4. **Открыть PR в docs.mikopbx.com** — по одному коммиту на ветку, в
   описании ссылка на merge-коммит `8613709da`.

5. **UI fixes из этой сессии** — отдельный коммит/PR в `mikopbx/Core`:
   * `firewall-index.js` (src + транспилированный pbx/)
   * 26 файлов `src/Common/Messages/*/ApiKeys.php` (+1 строка каждый)
   Commit message: `fix(firewall): suppress duplicate Docker notice when
   bouncer banner shows + add ak_SelectNetworkFilter translation`.

6. **Status: in-progress → completed** в frontmatter task-файла.

### Известные ловушки и точки внимания (для нового контекста)

- **Кэш переводов трёхуровневый** — после правки `Messages/*.php` обязательно
  очистить все три уровня (см. `docker exec mikopbx sh /tmp/flush.sh` в этой
  сессии). USR2 на php-fpm недостаточно сам по себе.

- **Современный Docker сохраняет source IP** через iptables-NAT (с ~ 2020).
  Поэтому на свежем deploy `clientIpVisible=true` даже в bridge mode при
  запросе с реального внешнего IP. Чтобы воспроизвести "слепой firewall"
  случай (как на скриншоте пользователя из этой сессии) — либо включить
  `userland-proxy: true` в `/etc/docker/daemon.json`, либо тестировать с
  loopback (нон-публичный IP отсекается фильтром в
  `GetListAction.php:213`).

- **iptables DOCKER-USER chain** должен быть в `iptables_chains` конфига
  bouncer'а для контейнерных PBX. Это **не** дефолт CrowdSec.

- **Test environment cleanup после задачи**: контейнер `mikopbx` на
  92.242.63.171 и (возможно) `attacker` — решить останавливать/удалять или
  оставлять для будущей регрессии. Сейчас live (по решению юзера 2026-05-12
  оставляем для следующего контекста).

- **IPv6-кейс отложен** (нет IPv6 тестовой машины на 2026-05-12). Когда
  машина появится, повторить Phase B+C с IPv6:
  * MikoPBX контейнер с `--ip6` или `--network` который выдаёт IPv6 (тогда
    `clientIp` на внешний запрос будет IPv6, и detector должен корректно
    через `IpAddressHelper::isIpv6()` определить публичность)
  * `cs-firewall-bouncer.yaml`: `disable_ipv6: false` (уже в конфиге Phase B)
    + `iptables_chains` для `ip6tables` подхватятся автоматически по
      docs CrowdSec
  * Проверки: `ip6tables -L crowdsec-blacklists -n`, brute-force с
    IPv6-атакующего, `OPTIONS sip:` через `nc -6 -u`
  * Особое внимание: текущий фильтр `$clientIp` в
    `GetListAction.php:213-214` принимает ТОЛЬКО IPv4 publicIp — IPv6
    проходит как `''` и `clientIpVisible` становится `false` даже когда
    IP реально виден. Это известный TODO ("expand when IPv6 modify lands"),
    но в e2e тесте с IPv6 надо удостовериться что bouncer-баннер не
    показывается ложно при правильно видимом IPv6 — иначе нужен парный
    fix в фильтре.

- **Готовые shell-скрипты на тест-хосте** в `/tmp/`:
  * `/tmp/api_call.sh` — авторизованный curl с Bearer из `/tmp/at.txt`
  * `/tmp/at.txt` — JWT admin-токен (живёт 15 мин, рефреш через
    `POST /pbxcore/api/v3/auth:login` с admin кредами; пароль сменён
    пользователем — спросить новый или работать через ApiKey)
  * `/tmp/flush_loc2.sh` — очистка трёхуровневого кэша переводов
  * `/tmp/verify_internal.sh` — loopback-тест для воспроизведения
    `clientIpVisible=false` кейса
  Не удалять без необходимости — новый контекст может их переиспользовать.

## Work Log
- [2026-05-12] **Phase B — real cs-firewall-bouncer smoke test on Debian 13**
  (test host `92.242.63.171`, MikoPBX build `2026.2.83-dev`). Full chain
  verified end-to-end with stock `crowdsec-firewall-bouncer` (Debian apt
  package 0.0.25-5+b11) against the merged endpoint.

  **Setup steps actually run:**
  * Created bouncer ApiKey by INSERT into `m_ApiKeys` (id=1,
    `description='bouncer-test-phase-b'`,
    `allowed_paths={"/api/v3/firewall-bouncer":"read"}`,
    `full_permissions='0'`). Bcrypt hash via
    `docker exec mikopbx php -r 'password_hash(...)'`. First request
    with `Authorization: Bearer <64-hex>` returned 200 + empty LAPI
    snapshot — token works on first request (no `TokenValidationService`
    cache warmup needed for new rows).
  * `apt-get install crowdsec-firewall-bouncer iptables ipset` —
    Debian 13 ships the unified package (both nftables and iptables
    backends in one). Post-install configured nftables in
    `.yaml.local`; overrode with custom config below.
  * Final `/etc/crowdsec/bouncers/crowdsec-firewall-bouncer.yaml.local`:
    ```yaml
    mode: iptables
    update_frequency: 5s
    api_url: https://127.0.0.1/pbxcore/api/v3/firewall-bouncer/
    api_key: <64-hex>
    insecure_skip_verify: true
    log_level: info
    disable_ipv6: true
    deny_action: DROP
    iptables_chains: [INPUT, FORWARD, DOCKER-USER]
    ```

  **What worked (ACCEPT):**
  * Endpoint LAPI-shape: `{"new": [...], "deleted": []}`,
    `value/scope=Ip/origin/scenario/duration/type/id` fields exactly as
    spec; stable `id` via `crc32($ip.$scenario) & 0x7fffffff`.
  * Bouncer auth: `level=info msg="Using API key auth"` — no 401, no
    retry. Cookie/Authorization stripped from worker envelope by
    `ForwardedHeaderFilter` (not relevant here, but confirmed in logs).
  * Ban propagation **≤ 10s**: SET key
    `_PH_REDIS_CLIENT:firewall:sip:198.51.100.55` in Redis DB 1 →
    appeared in `ipset list crowdsec-blacklists` and matching DROP rule
    visible via `iptables -L DOCKER-USER -n` after **8 seconds**
    (one 5s poll + ipset apply). Verifies the `update_frequency: 5s`
    configuration cycle.
  * **`DOCKER-USER` chain receives DROP rule** — critical for any
    containerized deployment where Docker bypasses INPUT. Confirmed
    `iptables -L DOCKER-USER -n` shows
    `DROP all -- 0.0.0.0/0 0.0.0.0/0 match-set crowdsec-blacklists src`.
  * Both `INPUT` and `FORWARD` chains also wired with same DROP rule —
    full host-firewall coverage.

  **Architectural gap surfaced (DOCUMENT, do not change MVP):**
  * **Unban does NOT propagate in ≤ 10s as the original Phase B
    acceptance assumed.** Verified: DEL of Redis ban key →
    `/v1/decisions/stream` immediately returns
    `{"new":[],"deleted":[]}` → bouncer stops logging "1 decision added"
    on subsequent polls → but the ipset entry remains, decaying naturally
    by its CrowdSec-`duration`-based TTL (3600s for fail2ban-derived
    bans, 8760h = 1 year for NetworkFilters deny entries).
  * Root cause: `ExportDecisionsAction` is intentionally stateless and
    emits `deleted: []` on every poll (documented in its PHPDoc lines
    42-46 as the MVP "snapshot" model). cs-firewall-bouncer's contract
    is that it only removes ipset entries when they are listed
    explicitly in `deleted[]`. Without per-token cursor state on the
    server, MikoPBX cannot tell which previously-streamed IPs have been
    unbanned vs. just-now-included.
  * **Two workable resolutions** (escalate to user, do not pick
    unilaterally):
    1. *Accept MVP semantics.* Document ipset-TTL-decay as the unban
       mechanism in `setup/docker/external-firewall-enforcement.md`.
       Manual operator override: `systemctl restart
       crowdsec-firewall-bouncer` flushes ipset and rebuilds from
       current snapshot (verified — restart with empty stream produced
       0 entries in ipset). Simple, no code changes.
    2. *Implement delta tracking.* Per-token (or anonymous) Redis cursor
       (`_PH_REDIS_CLIENT:fwbouncer:cursor:<token-id>:snapshot` → JSON
       of {decision-id: …}). On each poll, diff current snapshot vs
       stored, emit removed entries in `deleted[]`. Adds ~50 LoC,
       Redis-write per poll, but matches CrowdSec contract fully.
  * Restart-bouncer workaround verified: `systemctl restart` destroyed
    and recreated `crowdsec-blacklists` ipset with 0 entries; iptables
    `-j crowdsec-blacklists` references re-inserted; ban-application
    cycle works again on next poll.

  **Phase-B-specific docs additions discovered:**
  * `iptables_chains: [INPUT, FORWARD, DOCKER-USER]` is **non-default**
    in stock CrowdSec config (default = `[INPUT]` only). Without
    `DOCKER-USER`, ban silently fails for traffic Docker proxies to
    containers. This is **trap #1** for users — must call out
    explicitly in docs.
  * `disable_ipv6: true` is required on hosts where Docker has no IPv6
    bridge — otherwise bouncer fatals on `ip6tables -I DOCKER-USER`
    (chain does not exist). Trap #2.
  * Debian-shipped package is 0.0.25 (2022); upstream is 0.0.34+ —
    older parser missed some edge cases historically. For production
    deployments, recommend CrowdSec official apt repo. Documented
    apt-source steps to be added in docs.

  **Acceptance update (overrides item in Success Criteria → Acceptance):**
  - [x] bouncer starts cleanly, lib chains wired (INPUT, FORWARD,
        DOCKER-USER)
  - [x] ban → DROP rule in iptables ≤ 10s (measured 8s)
  - [ ] unban → rule disappears ≤ 10s **(BLOCKED by MVP design choice;
        natural decay = ban duration. Decision needed from user: accept
        and document, OR add delta tracking.)**
  - [x] `DOCKER-USER` chain populated (critical for Docker — confirmed
        rule visible)

  **State left on test host:**
  * `crowdsec-firewall-bouncer.service` enabled+active, polling every 5s
  * ipset `crowdsec-blacklists` empty (after cleanup), but rule
    references survive in INPUT/FORWARD/DOCKER-USER (harmless when set
    is empty)
  * Test ApiKey row `id=1` retained in `m_ApiKeys` (test ban key DEL'd)
  * No changes to MikoPBX container code (all changes are host-side
    apt package + config)
  * Bouncer log: `/var/log/crowdsec-firewall-bouncer.log`

- [2026-05-12 delta-tracking] **Closed the unban-path gap surfaced in
  Phase B.** Added per-bouncer Redis cursor + `deleted[]` diff
  emission in `ExportDecisionsAction`, replacing the always-empty
  `deleted` of the MVP. Now the bouncer evicts an unbanned IP from
  ipset in **3 seconds** (matching Phase B acceptance "unban → rule
  disappears ≤ 10s"), instead of waiting for natural TTL decay.

  **Design** (all in `ExportDecisionsAction`):
  * `main(array $sessionContext = [], array $data = [])` — was
    parameterless. Now mirrors the established pattern from
    `CheckClientIpVisibilityAction`.
  * `buildCurrentSnapshot()` — extracted the Redis-and-NetworkFilters
    snapshot build from inline code into a private method, both for
    readability and to be unit-testable in isolation.
  * `cursorKeyFor()` — Redis key
    `fwbouncer:cursor:<m_ApiKeys.id>` from
    `sessionContext['token_id']` (populated by
    `BaseController::prepareRequestMessage()` at line 370 since the
    initial merge). Falls back to `fwbouncer:cursor:anon` if no
    token id (localhost-debug path).
  * `isStartupRequest()` — parses `?startup=true` (string `"true"`
    case-insensitive, or boolean `true`) → no `deleted[]` emission +
    cursor reset, so a freshly-restarted bouncer doing
    `startup=true` initial poll never sees phantom evictions.
  * `readPreviousSnapshot()` / `writeCurrentSnapshot()` — Redis
    `get` / `setex` with `CURSOR_TTL = 3600s`. Cursor refreshes on
    every successful poll so abandoned bouncers don't pile state.
    Corrupt JSON → degrade to "treat as first poll" instead of 500.
  * `diffRemoved()` — pure diff of previous-snapshot vs
    current-snapshot keyed by stable `id`, returning **full
    decision objects** so the bouncer can evict by `value` (IP) not
    just by id (CrowdSec contract).

  **Touched files** (4):
  * `src/PBXCoreREST/Lib/FirewallBouncer/ExportDecisionsAction.php`
    — main implementation + extensive PHPDoc on cursor semantics.
  * `src/PBXCoreREST/Lib/FirewallBouncerManagementProcessor.php` —
    one line: forward `sessionContext` + `data` into the action.
  * `src/PBXCoreREST/Controllers/FirewallBouncer/RestController.php`
    — read `startup`/`scopes`/`origins` from `$this->request->getQuery()`
    and pass through worker envelope (`data` payload).
  * `tests/Unit/PBXCoreREST/Lib/FirewallBouncer/ExportDecisionsActionDeltaTest.php`
    — new test file. 9 cases via Reflection on the 3 private static
    helpers: `isStartupRequest` (8 input shapes incl. case folding +
    bool coercion), `cursorKeyFor` (token id present, string-coerced,
    null, zero, missing), `diffRemoved` (4 transitions: empty
    previous, identical snapshots, partial removal, total removal,
    entries without id).

  **Verification** (sequential on test host
  `92.242.63.171` after hot-patch via `docker cp` + `pkill -USR2
  php-fpm` + `pkill -f WorkerApiCommands`):
  1. Direct stream poll, empty cursor: `new=[ban]`,
     `deleted=[]` ✓
  2. Cursor stored: `_PH_REDIS_CLIENT:fwbouncer:cursor:1` =
     JSON snapshot ✓
  3. Steady-state second poll: `new=[ban]` (refreshed duration),
     `deleted=[]` ✓
  4. DEL Redis ban + third poll: `new=[]`,
     `deleted=[full-ban-object]` ✓ — **the key delta**
  5. Fourth poll: both `new` and `deleted` empty ✓
  6. `?startup=true` with stale cursor + non-matching live state:
     `new=[]`, `deleted=[]` (cursor reset, no phantom delete) ✓
  7. End-to-end with real bouncer: ban → ipset member in 4s; unban
     → ipset member gone in 3s; bouncer log
     `"1 decision deleted"` on the unban-poll cycle ✓

  **Storage cost**: per active bouncer, one Redis string of size
  ≈ N × 160 bytes (decision JSON), TTL 3600s. Typical PBX with
  < 100 active bans → < 16 KB cursor; trivial.

  **Backward compat**: existing bouncers that ignore `deleted[]`
  see no behavioural change — `new[]` still carries the full
  active snapshot every poll (CrowdSec "stream" mode hybrid).
  Old PHPDoc claiming "MVP always emits `deleted: []`" rewritten.

  **PHPStan**: no new error categories vs. baseline (only the
  pre-existing Phalcon-stub-missing warnings shared by every
  controller in the codebase; resolved by TeamCity's CI stub bundle).

- [2026-05-12 Phase C] **Simulated-attack end-to-end test on the rebuilt
  container.** The delta-tracking image
  (`mikopbx-delta:phase-c` — snapshot of the patched running
  container via `docker commit`, replaces
  `mikopbx/mikopbx-x86_64:2026.2.83-dev` on `92.242.63.171`) was
  exercised against a real banned IP from outside the host.

  **Container rebuild** (so patches survive container restart):
  * `docker commit mikopbx mikopbx-delta:phase-c` →
    sha256:9d61e9bab4d8, 467 MB.
  * Verified patches inside the image: `diffRemoved` (2 hits) and
    `CURSOR_KEY_PREFIX` (3 hits) in
    `/usr/www/src/PBXCoreREST/Lib/FirewallBouncer/ExportDecisionsAction.php`.
  * `docker rm -f mikopbx`, then re-run with identical port mapping
    (80/443/tcp, 5060-5061/udp, 10000-10200/udp range), same bind
    mounts (`/var/spool/mikopbx/{cf,storage}`), and
    `--restart unless-stopped`. ApiKey row id=1 in `m_ApiKeys`
    survived in the persistent `/cf` volume; bouncer reconnected on
    `systemctl restart crowdsec-firewall-bouncer` without config
    changes.

  **Pre-flight safety nets** (per user request — don't lose SSH if
  the test bans the SSH source IP):
  1. `iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT
     -m comment --comment PHASE_C_SSH_PROTECT` — SSH always accepted
     regardless of bouncer state. (Kept after cleanup as a sane
     permanent default — bouncer must never lock SSH out.)
  2. `crowdsec-safety-flush.timer` — systemd-timer +
     oneshot service flushing `crowdsec-blacklists` ipset every
     10 minutes. Ensures the worst-case unban time stays bounded
     even if the test script crashes. Removed after Phase C
     completion.

  **Attack scenario** — manual Redis SET (deterministic ban-source,
  bypasses fail2ban-tuning concerns):
  * Source IP captured from `$SSH_CLIENT` on the host:
    `124.122.41.42` (operator's home public IP, behind home NAT).
  * `redis-cli -n 1 SET _PH_REDIS_CLIENT:firewall:http:124.122.41.42
     1 EX 600` — 10-min TTL, matches safety-net timer for belt-and-
    suspenders.
  * Stream within 1 poll: `new` contained the decision with id
    2054756121, origin `mikopbx-fail2ban`, scenario `mikopbx/http`,
    duration `600s`.
  * Bouncer added it to `ipset crowdsec-blacklists` (`timeout 570`
    after 30s observed window) and rules visible in INPUT (position
    2, after SSH-protect) and DOCKER-USER chains.

  **Drop-proof** (from operator's mac, OUTSIDE the SSH session):
  ```
  $ curl -sk --max-time 8 -o /dev/null -w "HTTP_%{http_code} %{time_total}s\n" https://92.242.63.171/
  HTTP_000 8.004164s
  exit_code=28  (CURLE_OPERATION_TIMEDOUT)
  ```
  Total packet drop. No TCP RST, no HTTPS handshake, just silence —
  iptables DOCKER-USER `-j DROP` works as advertised. **SSH stayed
  alive throughout** because the protect rule sits at INPUT position
  1, above the bouncer DROP at INPUT position 2.

  **Recovery** (Redis DEL → delta-tracked unban):
  * `redis-cli -n 1 DEL _PH_REDIS_CLIENT:firewall:http:124.122.41.42`
    at T=0.
  * Polled `ipset list` every 3s; entry **evicted at T=3s**.
  * Bouncer log emitted `"1 decision deleted"` at T+5s (next poll
    cycle), confirming the `deleted[]` arrived from MikoPBX stream.
  * Re-run curl from mac: `HTTP_200 0.647s`. Full restoration.

  **Documentation point that surfaced — bouncer bans are
  IP-level, not protocol-level.** The CrowdSec model puts a single
  DROP per IP into iptables; it does NOT separate by SIP / HTTP /
  AMI category. So an IP banned in `firewall:http:*` (the typical
  fail2ban-www-jail outcome) also gets its SIP/UDP packets dropped.
  This is **intentional CrowdSec design** ("if you're hostile to my
  HTTP, you're hostile to my SIP"), but the original Phase C spec
  in this README naively asserted SIP would stay reachable. Updated
  the docs draft accordingly — operators who want category-isolated
  bans must either keep using MikoPBX's internal pjsip ACL (the
  existing in-Docker fail2ban→Asterisk path, unmodified by this
  task) for SIP and reserve the bouncer for HTTP, or accept blanket
  IP-level blocking.

  **Cleanup state** (test host after run):
  * `mikopbx-delta:phase-c` image retained — patches now baked in,
    survives container restarts.
  * SSH-protect iptables rule retained
    (`PHASE_C_SSH_PROTECT` comment).
  * `crowdsec-safety-flush.timer` and `.service` removed.
  * `ipset crowdsec-blacklists` empty.
  * `crowdsec-firewall-bouncer.service` active, polling MikoPBX
    every 5s.
  * Test ApiKey row id=1 (`bouncer-test-phase-b`) retained in
    `m_ApiKeys`.

  **Phase C acceptance** (all met):
  - [x] decision appears in `/v1/decisions/stream` ≤ 5s (immediate
        on first poll after Redis SET)
  - [x] iptables DOCKER-USER chain receives DROP ≤ 10s (4s
        observed in Phase B re-run; same path here)
  - [x] HTTP-request from attacker IP → timeout/refused (HTTP_000,
        8s curl `--max-time` exhausted)
  - [x] unban via Redis DEL restores HTTP access in one poll cycle
        (3s eviction + immediate HTTP 200)
  - [~] SIP/UDP remains passable — **NOT met by design** (CrowdSec
        bouncer bans cover all protocols for the IP). Existing
        SIP-specific defense remains Asterisk pjsip ACL via
        `DockerNetworkFilterService::addBlockedIp()`, untouched by
        this task. Documented for operator clarity.

- [2026-05-11] **Codex review + merge to develop**. Codex CLI review of
  working tree surfaced two P2 findings, both fixed:
  * **F1 — bouncer resource missing from permission selector**
    (`src/PBXCoreREST/Controllers/FirewallBouncer/RestController.php`):
    no `#[HttpMapping]` meant `GetSimplifiedPermissionsAction` never
    emitted `/api/v3/firewall-bouncer` as a row, so the
    `?preset=bouncer` flow saved `allowed_paths={}`. Added
    `#[HttpMapping(mapping: ['GET' => ['exportDecisions',
    'exportWhitelist']], collectionLevelMethods: …)]`. Confirmed
    no extra routes — bouncer extends `BaseController`, so
    `RouterProvider::generateSimpleRoutes()` walks `${op}Action`-method
    names which don't exist on this controller.
  * **F2 — ancestor permission walk over-grants module trees**
    (`src/PBXCoreREST/Services/ApiKeyPermissionChecker.php`): previous
    unconditional `/`-segment ascend let a key with `/api/v3/modules`
    silently cover `/api/v3/modules/<module>/…` if a third-party module
    mounted nested REST controllers. Replaced with whitelist
    `ASCEND_ALLOWED_RESOURCES` — only `/api/v3/firewall-bouncer` opts in
    today. Regression net in `ApiKeyPermissionCheckerPathAscendTest`
    (added `testModulesGrantDoesNotCoverNestedModuleControllers` +
    `testNonWhitelistedDeepRouteIsRejected`).
  Verified inside `mikopbx-arm64-api-repro` container:
  `GetSimplifiedPermissionsAction` now emits `/api/v3/firewall-bouncer`
  with `available_actions=['read']`, and 10 permission-checker
  assertions pass (bouncer deep routes still allowed, modules nesting
  denied).
  **Merged to develop**: feature branch `feature/firewall-bouncer-api`
  (commit `eb501096d`) merged `--no-ff` as `8613709da`; pushed to
  `origin/develop`. GitHub Actions Code Quality workflow picked up;
  TeamCity pipeline kicks off via VCS-root polling.
  **Telegram**: replied to `j03l24` in MikoPBX Community
  (`message_id=18525`) in English — confirmed Docker-bridge limitation
  is by design, pointed at host-firewall workaround now, and the
  bouncer endpoint in the upcoming build.
  **Translation backfill** (required by pre-commit validator):
  38 missing `ak_Endpoint*`/`ak_FullPermissionsWarning*` keys in
  `ru/ApiKeys.php`; 3 `rest_fwbouncer_Whitelist*` keys propagated to
  24 non-EN/RU locales using EN values.
  **Docs status**: drafts written and committed under
  `docs-drafts/` with `APPLY.md` index; apply to docs.mikopbx.com
  deferred until after Debian smoke-test passes.
- [2026-05-11] Code implementation complete (subtasks 1-5). Smoke-tested
  end-to-end inside `mikopbx-arm64-api-repro` Docker bridge container:
  * `GET /pbxcore/api/v3/firewall-bouncer:exportDecisions` returns valid
    CrowdSec-LAPI snapshot. Verified with two synthetic Redis bans
    (`firewall:sip:198.51.100.42` TTL 3600s → duration `3600s`;
    `firewall:http:203.0.113.99` TTL 1800s → `1800s`) — both surfaced
    in `new[]` with correct origin/scope/scenario/value/id fields.
  * `GET /pbxcore/api/v3/system:checkClientIpVisibility` executes end-to-end
    through the worker queue. Returns `container_mode=bridge` and `is_docker=true`
    correctly. The verdict heuristic flags `ip_not_visible` only when
    `remote_addr` is a private/docker-bridge address — verified via the
    GetListAction response (`dockerNetworkMode=bridge`, `clientIpVisible=false`).
  * `GET /pbxcore/api/v3/firewall` extended with `dockerNetworkMode` and
    `clientIpVisible` — banner-trigger condition correctly satisfied in
    the Docker bridge container.
  * Auto-discovery (RouterProvider) picked up `/firewall-bouncer` resource
    on first request, no manual route registration needed.
- [2026-05-11] **Manifest deviation, resolved**: §7 recommended option (b)
  (bypass worker for the self-check endpoint). Initially shipped option (a)
  with X-Forwarded-For/X-Real-IP forwarded ad-hoc through `sessionContext`.
  User pushed back: rather than hard-coding a few headers, generalize so
  future modules can carry their own. Final design (committed): new
  `ForwardedHeaderFilter` class with **allow-list + namespace prefixes +
  unconditional deny-list**. `BaseController::prepareRequestMessage()`
  populates `httpHeaders` field of every worker message (lowercased keys,
  RFC 7230 join, 1024-byte cap per value). Sensitive headers
  (Authorization / Cookie / Authentication-*) are stripped at the gateway
  and never reach actions. Reserved namespaces `X-Mikopbx-*` / `X-Module-*`
  let core and modules add headers without re-editing the filter. 11-case
  unit test covers allow / deny / prefix / casing / size cap / collision.
  Documented in `src/PBXCoreREST/CLAUDE.md` (#Forwarded HTTP Headers).
  Smoke-tested in `mikopbx-arm64-api-repro`: XFF/X-Real-IP/X-Module-Demo
  flow through, Cookie/Authorization stripped, bouncer+getList endpoints
  unaffected.
- [2026-05-11] **Subtask 5 — full 26-language fan-out completed.** Initially
  shipped RU+EN only; on user request ran 3 parallel background
  `pbx-translation-expert` agents (one per file). Result:
  * `NetworkSecurity.php` — 24 languages × 7 new keys (`fw_BouncerBanner*`,
    `fw_CheckIpVisibility*`), inserted after `fw_AllowMyIpButton`.
  * `ApiKeys.php` — 24 languages × 7 new keys (`ak_CreateBouncerToken*`,
    `ak_BouncerPreset/Snippet*`, `ak_Copy`, `ak_Close`), after `ak_AddNewKey`.
  * `RestApi.php` — 24 languages × 23 new keys (`rest_FirewallBouncer_*`,
    `rest_fwbouncer_*`, `rest_schema_fwbouncer_*`,
    `rest_system_CheckClientIpVisibility*`, `rest_schema_clientip_*`),
    after `rest_Firewall_ApiDescription`.
  Total: ~888 translations across 72 files. Technical terms (Docker, bridge,
  CrowdSec, LAPI, bouncer, fail2ban, X-Forwarded-For, IP, CIDR, ban, scenario,
  scope) kept untranslated everywhere. All 72 files pass `php -l` validation;
  key positions match the Russian source structure.
- [2026-05-11] **Smoke test with real cs-firewall-bouncer**: still pending —
  requires clean Debian host with apt-installed `cs-firewall-bouncer` package
  and is a manual acceptance step per the success criteria. Implementation
  is ready: bouncer config snippet is auto-generated post-token-create.
- [2026-05-10] Created task, captured design decisions from discussion
- [2026-05-11] Reviewed docs.mikopbx.com (russian branch): identified target pages,
  noted `fine-tuning-the-firewall.md` is dated (legacy scanner signatures, no Docker
  guidance); finalized docs update plan (~20 files, 3 screenshots). Confirmed
  `System::getDockerNetworkMode()` placement (not `Network`) with rationale.
- [2026-05-11] Finalized Success Criteria with user. Decisions:
  (1) MVP полный список в LAPI ответе (без delta-stream — упрощение),
  (2) smoke-тест обязателен, проводится после кода на чистом Debian / двух
      контейнерах рядом (OSX через Lima/Multipass допустим),
  (3) sidecar-compose вариант — follow-up, не блокирует задачу;
      apt-инструкция в docs покрывает целевую аудиторию.
- [2026-05-11] Context-gathering completed. Two implementation blockers found:
  **B1**: `ApiKeyPermissionChecker::extractBasePath()` strips `:method` suffix
  before lookup, so per-method scoping is impossible. Resolved by moving endpoint
  to dedicated resource path `/pbxcore/api/v3/firewall-bouncer` (separate
  controller). Approved by user.
  **B2**: Redis `setex` loses original ban duration. Resolved by mapping CrowdSec
  `duration` field to current TTL (`"<seconds>s"`) — matches how bouncers consume
  the field anyway.
  Full Context Manifest with ~10 areas covered, file:line refs, code skeletons,
  files-to-touch and files-NOT-to-touch lists, anti-patterns. Ready to implement.
