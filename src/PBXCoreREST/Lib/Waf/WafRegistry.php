<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\Waf;

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\PBXCoreREST\Attributes\ApiResource;
use MikoPBX\PBXCoreREST\Attributes\HttpMapping;
use MikoPBX\PBXCoreREST\Lib\Waf\Attributes\WafExempt;
use Phalcon\Di\Di;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use ReflectionClass;
use ReflectionException;
use ReflectionMethod;
use SplFileInfo;
use Throwable;

/**
 * Collects WAF exemption declarations from Core REST controllers and enabled
 * modules and publishes them to Redis for consumption by `unified-security.lua`.
 *
 * Redis layout:
 *   Key   : _PH_REDIS_CLIENT:waf:exemptions   (hash, DB1)
 *   Field : <uri>                              e.g. "/pbxcore/api/v3/system:executeSqlRequest"
 *   Value : {"scopes":["body-scan"],"owner":"core","match":"exact"}
 *           {"scopes":["body-scan"],"owner":"core","match":"prefix"}
 *           {"scopes":["body-scan","rate-limit"],"owner":"ModuleBilling","match":"exact"}
 *
 * The `match` field controls how `unified-security.lua` resolves the entry:
 *   - "exact"  → applies only when the request URI is identical to the key.
 *                Method-level `#[WafExempt]` and shorthand
 *                `ConfigClass::getWafExemptions()` entries publish under this mode.
 *   - "prefix" → applies when the request URI equals the key OR descends from
 *                it through one-or-more `/segment` or `:method` suffixes.
 *                Class-level `#[WafExempt]` on a REST controller publishes its
 *                `$basePath` under this mode so resource-level writes
 *                (e.g. PUT /resource/{id}) inherit the controller's exemption.
 *
 * The phpredis client returned by {@see RedisClientProvider} is configured with
 * the `_PH_REDIS_CLIENT:` prefix, so callers in this class use the unprefixed
 * key `waf:exemptions`.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Waf
 */
class WafRegistry
{
    /**
     * Hash key (without the phpredis client prefix `_PH_REDIS_CLIENT:`).
     */
    public const string HASH_KEY = 'waf:exemptions';

    /**
     * Sentinel owner value used for declarations coming from Core REST controllers.
     * Module owners use the module's `uniqid`.
     */
    public const string CORE_OWNER = 'core';

    /**
     * @var array<int, string>
     */
    private const array ALLOWED_SCOPES = WafExempt::ALLOWED_SCOPES;

    /**
     * Match modes stored alongside each exemption in Redis.
     *  - MATCH_EXACT: the URI is matched exactly. Method-level attributes and
     *    shorthand `ConfigClass::getWafExemptions()` entries default to this.
     *  - MATCH_PREFIX: the URI is a path prefix; any request whose URI is
     *    that path or descends from it (one or more `/segment` or `:method`
     *    suffixes) matches. Class-level attributes on REST controllers
     *    default to this so `PUT /resource/{id}` inherits the controller's
     *    exemption.
     */
    public const string MATCH_EXACT = 'exact';
    public const string MATCH_PREFIX = 'prefix';
    private const array ALLOWED_MATCHES = [self::MATCH_EXACT, self::MATCH_PREFIX];

    /**
     * Lazily-computed set of every URI namespace owned by a Core REST
     * controller — i.e. the `ApiResource::path` of every class under
     * `src/PBXCoreREST/Controllers/`. Used by {@see self::writeEntry()} to
     * reject module-owned writes that would intrude on a Core controller's
     * URI subtree.
     *
     * The on-disk controller code is the authoritative source, so this
     * validation works even when the live Redis hash is empty (post
     * Monit-driven Redis restart, before the next `WorkerWafExemptions`
     * cron tick).
     *
     * @var array<string, true>|null
     */
    private ?array $coreNamespaceSnapshot = null;

    public function __construct(private readonly ?Di $di = null)
    {
    }

    /**
     * Resolve the namespace set of Core REST controllers. A URI is "in the
     * Core namespace" when it equals a controller's base path or descends
     * from it via `/segment` or `:method` suffixes. Modules may not write
     * exemptions inside this set.
     *
     * @return array<string, true> Base path => true.
     */
    private function coreNamespaces(): array
    {
        if ($this->coreNamespaceSnapshot !== null) {
            return $this->coreNamespaceSnapshot;
        }
        $controllerPath = __DIR__ . '/../../Controllers';
        $snapshot = [];
        if (!is_dir($controllerPath)) {
            return $this->coreNamespaceSnapshot = $snapshot;
        }
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($controllerPath, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        foreach ($iterator as $file) {
            if (!$file instanceof SplFileInfo || $file->getExtension() !== 'php') {
                continue;
            }
            if (!str_ends_with($file->getFilename(), 'Controller.php')) {
                continue;
            }
            $relativePath = str_replace($controllerPath . DIRECTORY_SEPARATOR, '', $file->getPathname());
            $relativePath = str_replace('.php', '', $relativePath);
            $className = str_replace(DIRECTORY_SEPARATOR, '\\', $relativePath);
            $controllerClass = 'MikoPBX\\PBXCoreREST\\Controllers\\' . $className;
            if (!class_exists($controllerClass)) {
                continue;
            }
            try {
                $reflection = new ReflectionClass($controllerClass);
                $attrs = $reflection->getAttributes(ApiResource::class);
                if ($attrs === []) {
                    continue;
                }
                /** @var ApiResource $apiResource */
                $apiResource = $attrs[0]->newInstance();
                if (is_string($apiResource->path) && $apiResource->path !== '') {
                    $snapshot[$apiResource->path] = true;
                }
            } catch (Throwable) {
                continue;
            }
        }
        return $this->coreNamespaceSnapshot = $snapshot;
    }

    /**
     * Decide whether `$uri` falls inside or above any Core-controller
     * namespace — i.e. whether publishing it as a non-Core entry would let
     * the Lua prefix walk-up reach a Core endpoint.
     *
     * Three relationships are rejected:
     *  1. Exact match with a Core base.
     *  2. Descendant of a Core base (`<base>/...` or `<base>:method`) — the
     *     URI sits inside the Core controller's URI subtree.
     *  3. Ancestor of a Core base (`<uri>/...` is `<base>/...`) — a prefix
     *     entry at the ancestor URI would Lua-walk-up resolve from any
     *     descendant Core endpoint, bypassing the namespace boundary.
     *     Trailing-slash normalisation on both sides prevents
     *     `/pbxcore-foo` from being treated as an ancestor of `/pbxcore`.
     */
    private function isCoreNamespaceUri(string $uri): bool
    {
        foreach (array_keys($this->coreNamespaces()) as $base) {
            if ($uri === $base
                || str_starts_with($uri, $base . '/')
                || str_starts_with($uri, $base . ':')
                || str_starts_with($base . '/', $uri . '/')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Drop and rebuild the whole hash from Core + enabled modules.
     *
     * Called from {@see \MikoPBX\Core\System\SystemLoader::startMikoPBX()} after
     * modules are loaded and before nginx is started so the live cache is in
     * sync with the on-disk source of truth on every boot.
     */
    public function rebuildAll(): void
    {
        $redis = $this->redis();
        if ($redis === null) {
            return;
        }

        // Build the new state into a shadow key, then RENAME atomically onto
        // the live key. Avoids the empty-hash window a naive DEL+HSET loop
        // would expose on every cron tick — the Lua reader sees either the
        // old hash or the new one, never empty.
        //
        // Race note: a concurrent onModuleEnabled() that fires AFTER the
        // shadow build started but BEFORE the RENAME will write to the live
        // hash and be lost on rename. This is rare (operator action vs cron
        // tick) and self-heals on the next cron pass within ≤60 s.
        $shadowKey = self::HASH_KEY . ':next';

        try {
            $redis->del($shadowKey);
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'WAF: failed to clear shadow hash: ' . $e->getMessage(),
                LOG_WARNING
            );
            return;
        }

        foreach ($this->collectCore() as $uri => $entry) {
            $this->writeEntry($redis, $shadowKey, $uri, $entry);
        }
        foreach ($this->collectModules() as $uri => $entry) {
            $this->writeEntry($redis, $shadowKey, $uri, $entry);
        }

        try {
            if ($redis->hLen($shadowKey) > 0) {
                $redis->rename($shadowKey, self::HASH_KEY);
            } else {
                // Nothing collected (e.g. broken filesystem). Unconditionally
                // clear the live hash so stale entries don't linger.
                $redis->del(self::HASH_KEY);
                $redis->del($shadowKey);
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'WAF: atomic shadow rename failed: ' . $e->getMessage(),
                LOG_WARNING
            );
            try {
                $redis->del($shadowKey);
            } catch (Throwable) {
                // Best-effort.
            }
        }
    }

    /**
     * Add a single module's declarations to the hash.
     */
    public function onModuleEnabled(string $moduleUniqueID): void
    {
        $redis = $this->redis();
        if ($redis === null) {
            return;
        }
        foreach ($this->collectModule($moduleUniqueID) as $uri => $entry) {
            $this->writeEntry($redis, self::HASH_KEY, $uri, $entry);
        }
    }

    /**
     * Remove all entries owned by the given module.
     */
    public function onModuleDisabled(string $moduleUniqueID): void
    {
        $redis = $this->redis();
        if ($redis === null) {
            return;
        }

        try {
            /** @var array<string, string>|false $all */
            $all = $redis->hGetAll(self::HASH_KEY);
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'WAF: failed to read exemption hash on module disable: ' . $e->getMessage(),
                LOG_WARNING
            );
            return;
        }

        if (!is_array($all)) {
            return;
        }

        foreach ($all as $uri => $json) {
            $decoded = json_decode((string)$json, true);
            if (is_array($decoded) && ($decoded['owner'] ?? null) === $moduleUniqueID) {
                try {
                    $redis->hDel(self::HASH_KEY, (string)$uri);
                } catch (Throwable $e) {
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        sprintf('WAF: failed to drop exemption %s: %s', $uri, $e->getMessage()),
                        LOG_WARNING
                    );
                }
            }
        }
    }

    /**
     * Collect declarations from Core REST controllers.
     *
     * Implementation note: scans `src/PBXCoreREST/Controllers/` with the same
     * directory-walk pattern that {@see \MikoPBX\PBXCoreREST\Providers\RouterProvider::discoverUniversalRoutes()}
     * uses to discover routes, then reads `#[WafExempt]` attributes on each
     * controller class and its public methods.
     *
     * @return array<string, array{scopes: array<int, string>, owner: string, match: string}>
     */
    public function collectCore(): array
    {
        $controllerPath = __DIR__ . '/../../Controllers';
        $entries = [];

        if (!is_dir($controllerPath)) {
            return $entries;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($controllerPath, RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if (!$file instanceof SplFileInfo || $file->getExtension() !== 'php') {
                continue;
            }
            // Match collectModule()'s filter: only consider *Controller.php
            // (BaseController / BaseRestController / ModulesControllerBase
            // contribute no routes and should not be reflected).
            if (!str_ends_with($file->getFilename(), 'Controller.php')) {
                continue;
            }

            $relativePath = str_replace($controllerPath . DIRECTORY_SEPARATOR, '', $file->getPathname());
            $relativePath = str_replace('.php', '', $relativePath);
            $className = str_replace(DIRECTORY_SEPARATOR, '\\', $relativePath);
            $controllerClass = 'MikoPBX\\PBXCoreREST\\Controllers\\' . $className;

            if (!class_exists($controllerClass)) {
                continue;
            }

            foreach ($this->extractFromController($controllerClass, self::CORE_OWNER) as $uri => $entry) {
                // First-iteration-wins for parity with collectModules() and
                // writeEntry()'s HGET conflict check. Two Core controllers
                // declaring the same URI is a Core bug, but the first stays
                // so successive rebuilds resolve identically.
                $entries[$uri] ??= $entry;
            }
        }

        return $entries;
    }

    /**
     * Collect declarations from every enabled module.
     *
     * @return array<string, array{scopes: array<int, string>, owner: string, match: string}>
     */
    public function collectModules(): array
    {
        $entries = [];
        $modules = PbxExtensionModules::find([
            'conditions' => 'disabled = :disabled:',
            'bind' => ['disabled' => '0'],
        ]);

        foreach ($modules as $module) {
            $id = (string)($module->uniqid ?? '');
            if ($id === '') {
                continue;
            }
            foreach ($this->collectModule($id) as $uri => $entry) {
                // First-iteration-wins, matching writeEntry()'s HGET-based
                // first-writer-wins. Without `??=`, rebuildAll() would
                // silently flip to last-writer-wins by find() order while
                // onModuleEnabled() events stay first-writer-wins — the same
                // installed-module set would resolve different owners after
                // a cron rebuild than at live-toggle time.
                $entries[$uri] ??= $entry;
            }
        }

        return $entries;
    }

    /**
     * Collect declarations from one module: its main ConfigClass and any REST
     * controller classes under `Lib/RestAPI/`.
     *
     * @return array<string, array{scopes: array<int, string>, owner: string, match: string}>
     */
    public function collectModule(string $moduleUniqueID): array
    {
        $entries = [];

        // 1. ConfigClass::getWafExemptions() — explicit method override
        $shortName = str_replace('Module', '', $moduleUniqueID);
        $configClass = "Modules\\{$moduleUniqueID}\\Lib\\{$shortName}Conf";
        if (class_exists($configClass)) {
            try {
                $instance = new $configClass();
                if ($instance instanceof ConfigClass && method_exists($instance, 'getWafExemptions')) {
                    $declared = $instance->getWafExemptions();
                    if (is_array($declared)) {
                        foreach ($declared as $uri => $declaration) {
                            if (!is_string($uri) || $uri === '') {
                                continue;
                            }
                            // Shorthand: ['/uri' => ['scope1', 'scope2']]
                            // Verbose:   ['/uri' => ['scopes' => [...], 'prefix' => true]]
                            if (is_array($declaration) && array_is_list($declaration)) {
                                $scopes = $declaration;
                                $match = self::MATCH_EXACT;
                            } elseif (is_array($declaration) && isset($declaration['scopes']) && is_array($declaration['scopes'])) {
                                $scopes = $declaration['scopes'];
                                $match = !empty($declaration['prefix']) ? self::MATCH_PREFIX : self::MATCH_EXACT;
                            } else {
                                continue;
                            }
                            // First-iteration-wins inside a single
                            // getWafExemptions() return; duplicate URI
                            // declarations are a module-author bug, but the
                            // first entry stays so subsequent collector
                            // passes (boot + cron) are deterministic.
                            $entries[$uri] ??= [
                                'scopes' => array_values(array_map('strval', $scopes)),
                                'owner' => $moduleUniqueID,
                                'match' => $match,
                            ];
                        }
                    }
                }
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        'WAF: cannot read getWafExemptions() from %s: %s',
                        $configClass,
                        $e->getMessage()
                    ),
                    LOG_WARNING
                );
            }
        }

        // 2. #[WafExempt] on module REST controllers (Pattern 4 modules).
        $modulesPath = $this->getModulesRoot();
        if ($modulesPath !== null) {
            $restApiPath = $modulesPath . DIRECTORY_SEPARATOR . $moduleUniqueID . DIRECTORY_SEPARATOR . 'Lib' . DIRECTORY_SEPARATOR . 'RestAPI';
            if (is_dir($restApiPath)) {
                $iterator = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($restApiPath, RecursiveDirectoryIterator::SKIP_DOTS)
                );

                foreach ($iterator as $file) {
                    if (!$file instanceof SplFileInfo || $file->getExtension() !== 'php') {
                        continue;
                    }
                    if (!str_ends_with($file->getFilename(), 'Controller.php')) {
                        continue;
                    }
                    $relativePath = str_replace($restApiPath . DIRECTORY_SEPARATOR, '', $file->getPathname());
                    $relativePath = str_replace('.php', '', $relativePath);
                    $className = str_replace(DIRECTORY_SEPARATOR, '\\', $relativePath);
                    $controllerClass = "Modules\\{$moduleUniqueID}\\Lib\\RestAPI\\{$className}";

                    if (!class_exists($controllerClass)) {
                        continue;
                    }

                    foreach ($this->extractFromController($controllerClass, $moduleUniqueID) as $uri => $entry) {
                        // ConfigClass declarations win over attribute declarations on the same URI
                        $entries[$uri] ??= $entry;
                    }
                }
            }
        }

        return $entries;
    }

    /**
     * Extract `#[WafExempt]` declarations from a single controller class.
     *
     * Class-level attribute publishes the controller's base path with
     * `match: "prefix"`, so the exemption covers the resource base, every
     * `/{id}` child, and every `:<methodName>` custom action — i.e. every URI
     * the Phalcon router enumerates for this controller.
     *
     * Method-level attribute publishes `<basePath>:<methodName>` with
     * `match: "exact"`, scoping the exemption strictly to that one custom
     * action.
     *
     * @return array<string, array{scopes: array<int, string>, owner: string, match: string}>
     */
    private function extractFromController(string $controllerClass, string $owner): array
    {
        $entries = [];

        try {
            $reflection = new ReflectionClass($controllerClass);
        } catch (ReflectionException $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf('WAF: cannot reflect %s: %s', $controllerClass, $e->getMessage()),
                LOG_WARNING
            );
            return $entries;
        }

        // Resolve ApiResource::path so we know the URI prefix for method-level attributes.
        $basePath = null;
        $apiResourceAttrs = $reflection->getAttributes(ApiResource::class);
        if ($apiResourceAttrs !== []) {
            try {
                /** @var ApiResource $apiResource */
                $apiResource = $apiResourceAttrs[0]->newInstance();
                $basePath = $apiResource->path;
            } catch (Throwable) {
                $basePath = null;
            }
        }

        // Class-level attribute → prefix entry keyed on the base path. Covers
        // every concrete route the Phalcon router publishes for this
        // controller (POST /resource, PUT /resource/{id}, custom methods).
        $classAttrs = $reflection->getAttributes(WafExempt::class);
        if ($classAttrs !== [] && is_string($basePath) && $basePath !== '') {
            try {
                /** @var WafExempt $exempt */
                $exempt = $classAttrs[0]->newInstance();
                $entries[$basePath] = [
                    'scopes' => array_values($exempt->scopes),
                    'owner' => $owner,
                    'match' => self::MATCH_PREFIX,
                ];
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf('WAF: invalid #[WafExempt] on %s: %s', $controllerClass, $e->getMessage()),
                    LOG_WARNING
                );
            }
        }

        // Resolve class-level HttpMapping (if present) so method-level URIs can
        // be derived from the actual routing configuration instead of guessed
        // from the method name.
        $httpMapping = null;
        $httpMappingAttrs = $reflection->getAttributes(HttpMapping::class);
        if ($httpMappingAttrs !== []) {
            try {
                /** @var HttpMapping $httpMapping */
                $httpMapping = $httpMappingAttrs[0]->newInstance();
            } catch (Throwable) {
                $httpMapping = null;
            }
        }

        // Method-level attributes. URI derived from HttpMapping where possible:
        //   - customMethods         → "<basePath>:<methodName>" (collection-level invocation)
        //   - collectionLevelMethods → "<basePath>"
        //   - resourceLevelMethods   → REJECT (URI is "<basePath>/{id}", not representable as exact)
        // Without HttpMapping a small whitelist of well-known CRUD names is
        // applied; everything else falls back to "<basePath>:<methodName>"
        // under the assumption that it is a custom collection-level method.
        if (is_string($basePath) && $basePath !== '') {
            foreach ($reflection->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
                $methodAttrs = $method->getAttributes(WafExempt::class);
                if ($methodAttrs === []) {
                    continue;
                }

                $methodName = $method->getName();
                $resolution = $this->resolveMethodLevelUri(
                    $basePath,
                    $methodName,
                    $httpMapping,
                    $controllerClass
                );
                if ($resolution === null) {
                    // Rejected (logged inside resolveMethodLevelUri).
                    continue;
                }

                try {
                    /** @var WafExempt $exempt */
                    $exempt = $methodAttrs[0]->newInstance();
                    $entries[$resolution] = [
                        'scopes' => array_values($exempt->scopes),
                        'owner' => $owner,
                        'match' => self::MATCH_EXACT,
                    ];
                } catch (Throwable $e) {
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        sprintf(
                            'WAF: invalid #[WafExempt] on %s::%s: %s',
                            $controllerClass,
                            $methodName,
                            $e->getMessage()
                        ),
                        LOG_WARNING
                    );
                }
            }
        }

        return $entries;
    }

    /**
     * CRUD method names with no `{id}` placeholder — operate on the collection.
     * Used as a fallback when no `#[HttpMapping]` is available on the class.
     */
    private const array CRUD_COLLECTION_METHODS = ['create', 'getList'];

    /**
     * CRUD method names with an `{id}` placeholder — operate on a single
     * resource. URIs like `<basePath>/{id}` are not representable as exact
     * matches; placement on such methods is rejected with a warning so the
     * developer migrates to class-level placement.
     */
    private const array CRUD_RESOURCE_METHODS = ['update', 'patch', 'delete', 'getRecord'];

    /**
     * Resolve the URI that a method-level `#[WafExempt]` should publish under.
     *
     * Returns `null` when the placement cannot be represented as an exact URI;
     * the caller logs the reason and skips the entry. Returns a fully-qualified
     * URI string otherwise.
     */
    private function resolveMethodLevelUri(
        string $basePath,
        string $methodName,
        ?HttpMapping $httpMapping,
        string $controllerClass
    ): ?string {
        if ($httpMapping !== null) {
            // Order matters: a method can appear in BOTH `customMethods` and
            // `resourceLevelMethods` (e.g. `copy`, which is a custom action
            // that operates on a specific record). Such methods route to
            // `<basePath>/{id}:<method>`, NOT `<basePath>:<method>`, so they
            // must be rejected before the customMethods branch can swallow
            // them with a misleading collection-level URI.
            if (in_array($methodName, $httpMapping->resourceLevelMethods, true)) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        'WAF: method-level #[WafExempt] on %s::%s rejected — '
                        . 'resource-level method (URI is %s/{id}%s, not representable as exact match). '
                        . 'Use class-level #[WafExempt] on the controller instead.',
                        $controllerClass,
                        $methodName,
                        $basePath,
                        in_array($methodName, $httpMapping->customMethods, true)
                            ? ':' . $methodName
                            : ''
                    ),
                    LOG_WARNING
                );
                return null;
            }
            if (in_array($methodName, $httpMapping->customMethods, true)) {
                // Custom collection-level method — exact match on
                // `<basePath>:<methodName>`. The router does NOT also expose
                // a resource-level form for these because they are not in
                // `resourceLevelMethods`.
                return $basePath . ':' . $methodName;
            }
            if (in_array($methodName, $httpMapping->collectionLevelMethods, true)) {
                return $basePath;
            }
            // Method not listed in HttpMapping at all → it is not a routed
            // action. Fall through to the no-HttpMapping heuristic so a
            // developer's diagnostic warning still fires for CRUD-named
            // methods, and unknown names still get the legacy `:method` URI.
        }

        if (in_array($methodName, self::CRUD_COLLECTION_METHODS, true)) {
            return $basePath;
        }
        if (in_array($methodName, self::CRUD_RESOURCE_METHODS, true)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'WAF: method-level #[WafExempt] on %s::%s rejected — '
                    . 'CRUD method (URI is %s/{id}, not representable as exact match). '
                    . 'Use class-level #[WafExempt] on the controller instead.',
                    $controllerClass,
                    $methodName,
                    $basePath
                ),
                LOG_WARNING
            );
            return null;
        }
        // Custom method (or otherwise non-CRUD) — assume collection-level
        // invocation. Matches the routing convention for resource controllers
        // without HttpMapping (legacy behaviour).
        return $basePath . ':' . $methodName;
    }

    /**
     * Validate scopes and write a single entry, honouring first-writer-wins
     * and the Core URI namespace boundary.
     *
     * `$hashKey` selects the target hash (live `HASH_KEY` for module
     * lifecycle events, the `HASH_KEY:next` shadow during `rebuildAll()`).
     *
     * @param \Redis $redis
     * @param array{scopes: array<int, string>, owner: string, match?: string} $entry
     */
    private function writeEntry(\Redis $redis, string $hashKey, string $uri, array $entry): void
    {
        $scopes = array_values(array_intersect($entry['scopes'], self::ALLOWED_SCOPES));
        if ($scopes === []) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'WAF: no valid scopes for %s (owner=%s); declaration ignored',
                    $uri,
                    $entry['owner']
                ),
                LOG_WARNING
            );
            return;
        }

        // Reject module-owned writes that intrude on a Core controller's URI
        // namespace. Validates against the on-disk source of truth
        // (controller-class ApiResource attributes), so the check holds even
        // when the live Redis hash is empty after a Monit-driven Redis
        // restart — closes the privilege-escalation window where a
        // first-enabled module could claim arbitrary Core URIs.
        if ($entry['owner'] !== self::CORE_OWNER && $this->isCoreNamespaceUri($uri)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'WAF: module %s attempted to exempt Core-owned URI %s; rejected',
                    $entry['owner'],
                    $uri
                ),
                LOG_WARNING
            );
            return;
        }

        $match = $entry['match'] ?? self::MATCH_EXACT;
        if (!in_array($match, self::ALLOWED_MATCHES, true)) {
            $match = self::MATCH_EXACT;
        }

        try {
            /** @var string|false $existing */
            $existing = $redis->hGet($hashKey, $uri);
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf('WAF: HGET failed for %s: %s', $uri, $e->getMessage()),
                LOG_WARNING
            );
            return;
        }

        if (is_string($existing) && $existing !== '') {
            $existingDecoded = json_decode($existing, true);
            if (is_array($existingDecoded) && ($existingDecoded['owner'] ?? null) !== $entry['owner']) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        'WAF exemption conflict on %s: owned by %s, %s ignored',
                        $uri,
                        (string)$existingDecoded['owner'],
                        $entry['owner']
                    ),
                    LOG_WARNING
                );
                return; // first-writer-wins
            }
        }

        $payload = json_encode([
            'scopes' => $scopes,
            'owner' => $entry['owner'],
            'match' => $match,
        ], JSON_UNESCAPED_SLASHES);

        if ($payload === false) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf('WAF: cannot JSON-encode entry for %s', $uri),
                LOG_WARNING
            );
            return;
        }

        try {
            $redis->hSet($hashKey, $uri, $payload);
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf('WAF: HSET failed for %s: %s', $uri, $e->getMessage()),
                LOG_WARNING
            );
        }
    }

    /**
     * Resolve the shared phpredis client (DB1, prefix `_PH_REDIS_CLIENT:`).
     */
    private function redis(): ?\Redis
    {
        if ($this->di === null) {
            return null;
        }
        try {
            $client = $this->di->getShared(RedisClientProvider::SERVICE_NAME);
            return $client instanceof \Redis ? $client : null;
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'WAF: Redis client unavailable: ' . $e->getMessage(),
                LOG_WARNING
            );
            return null;
        }
    }

    /**
     * Locate the modules root directory (where Pattern-4 module REST controllers live).
     *
     * Wrapped in try/catch because Directories::getDir() throws when the DI
     * container is not fully initialised (e.g. during early-boot unit tests).
     */
    private function getModulesRoot(): ?string
    {
        try {
            $path = \MikoPBX\Core\System\Directories::getDir(
                \MikoPBX\Core\System\Directories::CORE_MODULES_DIR
            );
            return is_dir($path) ? $path : null;
        } catch (Throwable) {
            return null;
        }
    }

}
