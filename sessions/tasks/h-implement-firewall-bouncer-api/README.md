---
name: h-implement-firewall-bouncer-api
branch: feature/firewall-bouncer-api
status: in-progress
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

- [ ] Endpoint `GET /pbxcore/api/v3/firewall-bouncer:exportDecisions` отвечает
  CrowdSec LAPI-совместимым JSON; поддерживает query-параметры `startup`,
  `scopes`, `origins` (как у `cs-firewall-bouncer`); **MVP-вариант отдаёт
  полный список на каждый поллинг** (без delta-stream), это валидно для
  всех существующих CrowdSec bouncers.
  *Note: endpoint живёт на отдельном resource path `/firewall-bouncer` (не
  внутри `/firewall`) из-за ограничения `ApiKeyPermissionChecker` —
  см. B1 в Context Manifest.*
- [ ] Аутентификация — через существующий `ApiKeys`-механизм
  (`Authorization: Bearer`), localhost-bypass НЕ расширяется; токен
  с несовпадающим `allowed_paths` получает 403
- [ ] Источник данных: Redis-ключи `_PH_REDIS_CLIENT:firewall:sip|http|ami|iax:*`
  + `NetworkFilters` deny-rules (через `DockerNetworkFilterService`);
  whitelist отдельным массивом в ответе
- [ ] `System::getDockerNetworkMode(): string` возвращает
  `'native'|'host'|'bridge'|'unknown'`, через сравнение
  `/sys/class/net/eth0/iflink` vs `/sys/class/net/eth0/ifindex`,
  интегрирован в `System::getPlatformInfo()` массив; покрыт unit-тестами
  на все четыре исхода
- [ ] Endpoint `GET /pbxcore/api/v3/system:checkClientIpVisibility` отдаёт
  `remote_addr`, заголовки прокси (`X-Forwarded-For`, `X-Real-IP`),
  `container_mode` (из `getDockerNetworkMode`), `verdict`
  (`ip_visible|ip_not_visible|proxy_detected`) — корректно на четырёх
  сценариях: bare-metal, Docker bridge, Docker host, behind-proxy
- [ ] UI Access Control / Firewall: баннер с CTA отображается ТОЛЬКО при
  условии `mode = bridge AND verdict != ip_visible`; рядом — кнопка
  «Проверить видимость моего IP» с человекочитаемым результатом
- [ ] UI ApiKeys: preset «External firewall bouncer (CrowdSec-compatible)»
  предзаполняет `description`, `allowed_paths` единственным путём
  (firewall-bouncer:exportDecisions), показывает готовый snippet конфига
  `cs-firewall-bouncer` для копирования

### Acceptance / интеграция

- [ ] **Smoke-тест с реальным `cs-firewall-bouncer`** на чистом Debian:
  два контейнера (MikoPBX + bouncer-host рядом, либо MikoPBX в Docker
  + apt-пакет bouncer'а в отдельном контейнере / на хосте OSX через
  Lima/Multipass). Сценарий: добавление IP в NetworkFilters →
  IP появляется в host iptables ≤ 30 секунд; удаление IP → пропадает.
  Тест проводится после доработки кода вручную, документируется в
  Work Log с командами и результатами.
- [ ] **SIP-fail2ban-в-Docker не сломан** — текущий путь
  `DockerNetworkFilterService::addBlockedIp` → `pjsip ACL` →
  `module reload acl` не затронут; existing API-тесты зелёные
- [ ] **Безопасность endpoint'а**: данные доступны только по валидному
  токену с правильным scope; токен с привязанным `networkfilterid`
  отдаёт 403 при запросе с неразрешённого IP; whitelist-IP офиса не
  утекает анонимным запросом

### Документация (`/Volumes/DevDisk/Developement/docs.mikopbx.com/`)

- [ ] Создана `setup/docker/external-firewall-enforcement.md` в ветках
  `russian` + `english`. Содержание: self-check видимости IP,
  два варианта решения — `network_mode: host` для VoIP **либо**
  `cs-firewall-bouncer` apt-пакетом на Linux-хосте (compose-sidecar
  вариант — follow-up, в этой задаче не делаем)
- [ ] Создана `manual/system/api-keys/firewall-export.md` в обеих ветках —
  техническая страница для разработчиков своих bouncer'ов: формат ответа
  LAPI, query-параметры, пример curl, маппинг наших категорий
  (`sip/http/ami/iax`) на CrowdSec поля
- [ ] Обновлены 8 существующих страниц в обеих ветках (см. план в User
  Notes): `readme/security.md`, `manual/connectivity/firewall.md`,
  `manual/connectivity/fail2-ban.md`, `setup/docker/README.md`,
  `setup/docker/running-mikopbx-using-docker-compose.md`,
  `faq/setup/fine-tuning-the-firewall.md` (только hint про неприменимость
  к Docker), `manual/system/api-keys/endpoints.md`, `SUMMARY.md`
- [ ] 3 скриншота загружены в `.gitbook/assets/`: self-check кнопка с
  результатом, preset bouncer-токена, баннер на Firewall в Docker bridge
- [ ] PR в docs-репо: по одному коммиту в каждую ветку, со ссылкой на
  основной PR в `mikopbx/Core`

### Качество кода

- [ ] PHPStan: 0 новых ошибок на изменённых файлах
- [ ] Translation-keys добавлены и переведены (RU + EN минимум) для всех
  UI-строк: баннер, preset bouncer-токена, кнопка self-check, описания
  полей в форме создания токена
- [ ] OpenAPI спецификация обновлена для двух новых endpoints
  (`firewall-bouncer:exportDecisions`, `system:checkClientIpVisibility`)

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

## Work Log
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
