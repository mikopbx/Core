<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Services;

use MikoPBX\Common\Models\ApiKeys;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\PBXCoreREST\Lib\ApiKeysManagementProcessor;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Di\DiInterface;
use RuntimeException;
use stdClass;
use Throwable;

/**
 * Class TokenValidationService
 * 
 * Validates Bearer tokens for REST API authentication
 * 
 * @package MikoPBX\PBXCoreREST\Services
 */
class TokenValidationService
{
    private const string CACHE_KEY_PREFIX = 'bearer_tokens:';
    private const int CACHE_TTL = 300; // 5 minutes
    private const int INVALID_TOKEN_CACHE_TTL = 60; // 1 minute for invalid tokens (DoS protection)
    private const string INVALID_TOKEN_MARKER = 'INVALID';
    private const string LAST_USED_BUFFER_KEY = 'bearer_tokens:last_used:';
    private const int LAST_USED_SYNC_INTERVAL = 60; // Sync to DB every minute
    
    /**
     * List of endpoints that should never be accessible via Bearer tokens
     * These are internal system endpoints
     */
    private const array EXCLUDED_ENDPOINTS = [
        '/pbxcore/api/user-page-tracker',
        '/pbxcore/api/nchan',
    ];

    private \Phalcon\Cache\Adapter\AdapterInterface $cache;
    private DiInterface $di;

    public function __construct(DiInterface $di)
    {
        $this->di = $di;
        $this->cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
    }
    
    /**
     * Validate Bearer token from request
     *
     * @param \MikoPBX\PBXCoreREST\Http\Request $request
     * @return TokenValidationResult
     */
    public function validate($request): TokenValidationResult
    {
        $providedToken = $request->getBearerToken();
        if (empty($providedToken)) {
            return new TokenValidationResult(false, null, 'No Bearer token provided');
        }

        // Try to get from cache first
        $cacheKey = self::CACHE_KEY_PREFIX . md5($providedToken);
        $cachedData = $this->cache->get($cacheKey);

        // Check if this is a cached invalid token (DoS protection)
        if ($cachedData === self::INVALID_TOKEN_MARKER) {
            return new TokenValidationResult(false, null, 'Invalid Bearer token');
        }

        // Check if valid token is cached
        if ($cachedData !== null) {
            return $this->validatePermissions($cachedData, $request);
        }

        // Not in cache, check database
        $apiKey = $this->findTokenByHash($providedToken);

        if ($apiKey === null) {
            // Cache the invalid token to prevent DoS attacks
            $this->cache->set($cacheKey, self::INVALID_TOKEN_MARKER, self::INVALID_TOKEN_CACHE_TTL);

            return new TokenValidationResult(false, null, 'Invalid Bearer token');
        }

        // Cache the valid token
        $keyData = $apiKey->toArray();
        $this->cache->set($cacheKey, $keyData, self::CACHE_TTL);

        return $this->validatePermissions($keyData, $request);
    }
    
    /**
     * Validate permissions for authenticated Bearer token
     *
     * @param array<string, mixed> $keyData
     * @param \MikoPBX\PBXCoreREST\Http\Request $request
     * @return TokenValidationResult
     */
    private function validatePermissions(array $keyData, $request): TokenValidationResult
    {
        // Update last used time in buffer
        $this->updateLastUsedBuffer($keyData['id']);

        // Check network filter first (more critical)
        if (!$this->checkNetworkFilter($keyData, $request)) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Bearer token network filter check failed",
                LOG_WARNING
            );
            return new TokenValidationResult(
                false,
                null,
                'Access denied: IP address not allowed'
            );
        }

        // Check path permissions
        if (!$this->checkPathPermissions($keyData, $request)) {
            $paths = $keyData['allowed_paths'] ?? 'null';
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Bearer token path permissions check failed. Allowed paths: $paths",
                LOG_WARNING
            );
            return new TokenValidationResult(
                false,
                null,
                'Access denied: insufficient permissions for this endpoint'
            );
        }

        return new TokenValidationResult(true, null, null, $keyData);
    }
    
    /**
     * Find Bearer token by comparing hashes
     * 
     * @param string $providedToken
     * @return ApiKeys|null
     */
    private function findTokenByHash(string $providedToken): ?ApiKeys
    {
        $activeKeys = ApiKeys::find();
        
        foreach ($activeKeys as $key) {
            if (password_verify($providedToken, $key->key_hash)) {
                return $key;
            }
        }
        
        return null;
    }
    
    /**
     * Update last used time in buffer (delayed write to DB)
     *
     * last_used_at is informational: a failed sync is logged and never fails authentication (#1120).
     *
     * @param int $keyId
     * @return void
     */
    private function updateLastUsedBuffer(int $keyId): void
    {
        try {
            $bufferKey = self::LAST_USED_BUFFER_KEY . $keyId;
            $now = time();

            $lastSync = $this->cache->get($bufferKey . ':sync') ?? 0;
            $this->cache->set($bufferKey, $now, self::LAST_USED_SYNC_INTERVAL * 2);

            if ($now - $lastSync <= self::LAST_USED_SYNC_INTERVAL) {
                return;
            }

            // Mark before enqueueing so a failed push is retried once per interval, not per request.
            $this->cache->set($bufferKey . ':sync', $now, self::LAST_USED_SYNC_INTERVAL * 2);
            $this->syncLastUsedToDatabase($keyId, $now);
        } catch (Throwable $e) {
            try {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Failed to update last_used metadata for API key {$keyId}: " . $e->getMessage(),
                    LOG_WARNING
                );
            } catch (Throwable) {
                // Optional metadata must not break authentication even when its logger is unavailable.
            }
        }
    }

    /**
     * Hand the last_used write to WorkerApiCommands.
     *
     * php-fpm runs as www and may not write the main database (read-only on LXC installs, #1120),
     * so the write is queued like any other REST action and executed by the worker (root).
     *
     * @param int $keyId
     * @param int $timestamp
     * @return void
     */
    private function syncLastUsedToDatabase(int $keyId, int $timestamp): void
    {
        // Same envelope as BaseController::sendRequestToBackendWorker() (fire-and-forget)
        $requestMessage = [
            'processor' => ApiKeysManagementProcessor::class,
            'data' => ['id' => $keyId, 'timestamp' => $timestamp],
            'action' => 'touchLastUsed', // ApiKeyAction::TOUCH_LAST_USED; the enum lives in the processor file and is not autoloadable
            'async' => false, // sync path retries "database is locked"; nobody waits for the response
            'asyncChannelId' => '',
            'request_id' => uniqid('req_touchLastUsed_', true),
            'created_at' => microtime(true),
            'debug' => false,
            'httpMethod' => 'POST',
        ];
        $redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
        if ($redis->rpush(WorkerApiCommands::REDIS_API_QUEUE, json_encode($requestMessage)) <= 0) {
            throw new RuntimeException('rpush to ' . WorkerApiCommands::REDIS_API_QUEUE . ' failed');
        }
    }
    
    /**
     * Check if request path is allowed for this Bearer token
     *
     * Uses new ApiKeyPermissionChecker for granular permissions checking
     * with ActionType hierarchy (read/write) support
     *
     * @param array<string, mixed> $keyData
     * @param \MikoPBX\PBXCoreREST\Http\Request $request
     * @return bool
     */
    private function checkPathPermissions(array $keyData, $request): bool
    {
        // GHSA-343m-2899-5qh3: authorize the normalized routed path, not raw getURI(). Fail closed.
        $requestPath = $request->getRoutedPath(true);
        if ($requestPath === null) {
            SystemMessages::sysLogMsg(__CLASS__, 'Access denied: no trusted routed path', LOG_WARNING);
            return false;
        }

        // Check excluded endpoints first (always denied)
        if ($this->isExcludedEndpoint($requestPath)) {
            SystemMessages::sysLogMsg(__CLASS__, "Access denied: excluded endpoint {$requestPath}", LOG_WARNING);
            return false;
        }

        // Create object from array data for ApiKeyPermissionChecker
        // Using stdClass for compatibility with object type hint
        $apiKeyObject = new stdClass();
        $apiKeyObject->id = $keyData['id'] ?? null;
        $apiKeyObject->full_permissions = $keyData['full_permissions'] ?? '0';
        $apiKeyObject->allowed_paths = $keyData['allowed_paths'] ?? '';

        // Use new ApiKeyPermissionChecker for granular permission checking
        $checker = new ApiKeyPermissionChecker();
        $httpMethod = $request->getMethod();

        $hasPermission = $checker->checkPermission($apiKeyObject, $requestPath, $httpMethod);

        if (!$hasPermission) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Access denied: insufficient permissions. Path: {$requestPath}, Method: {$httpMethod}, " .
                "Full permissions: {$apiKeyObject->full_permissions}, Allowed paths: " .
                ($apiKeyObject->allowed_paths ?: 'empty'),
                LOG_WARNING
            );
        }

        return $hasPermission;
    }
    
    /**
     * Check if endpoint is in excluded list
     * 
     * @param string $requestPath
     * @return bool
     */
    private function isExcludedEndpoint(string $requestPath): bool
    {
        foreach (self::EXCLUDED_ENDPOINTS as $excludedPath) {
            if (strpos($requestPath, $excludedPath) === 0) {
                return true;
            }
        }
        return false;
    }
    
    
    /**
     * Check network filter restrictions
     *
     * @param array<string, mixed> $keyData
     * @param \MikoPBX\PBXCoreREST\Http\Request $request
     * @return bool
     */
    private function checkNetworkFilter(array $keyData, $request): bool
    {
        if (empty($keyData['networkfilterid']) || $keyData['networkfilterid'] === 'none') {
            // No network filter, allow all IPs
            return true;
        }
        
        $clientIp = $request->getClientAddress();

        // 'localhost' and a deleted filter both resolve to the localhost-only ACL
        $acl = NetworkFilters::getAclByFilterId(
            (string)$keyData['networkfilterid'],
            'API key ' . ($keyData['id'] ?? '?')
        );

        return $this->isIpAllowedByFilter($clientIp, $acl['permit'], $acl['deny']);
    }

    /**
     * Apply NetworkFilters permit/deny lists to an IP
     *
     * A non-empty permit list is an allowlist: only its networks pass, whatever deny holds
     * (deny is stored as 0.0.0.0/0 even for IPv6 filters, so it cannot be relied on to reject).
     * Without permit, everything outside the deny list passes.
     *
     * @param string $ip Client IP address
     * @param string $permit Comma-separated permitted networks in CIDR notation
     * @param string $deny Comma-separated denied networks in CIDR notation
     * @return bool
     */
    private function isIpAllowedByFilter(string $ip, string $permit, string $deny): bool
    {
        if (trim($permit) !== '') {
            return $this->ipInNetworkList($ip, $permit);
        }
        return !$this->ipInNetworkList($ip, $deny);
    }

    /**
     * Check if IP belongs to any network of a comma-separated list
     *
     * An IP of the other address family never matches.
     *
     * @param string $ip IP address to check
     * @param string $networks Comma-separated networks in CIDR notation
     * @return bool
     */
    private function ipInNetworkList(string $ip, string $networks): bool
    {
        foreach (explode(',', $networks) as $network) {
            $network = trim($network);
            if ($network !== '' && IpAddressHelper::ipInNetwork($ip, $network)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Clear cache for all Bearer tokens
     *
     * Note: We clear all tokens because we don't track token->hash mapping.
     * This is called when API keys are created, updated, or deleted.
     *
     * @return void
     */
    public static function clearCache(): void
    {
        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            return;
        }

        $cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);

        // Clear all cached tokens (both valid and invalid)
        $keys = $cache->getKeys(self::CACHE_KEY_PREFIX . '*');
        foreach ($keys as $key) {
            $cache->delete($key);
        }
    }
}

/**
 * Bearer Token validation result
 */
class TokenValidationResult
{
    private bool $valid;
    private ?string $tokenSuffix;
    private ?string $error;
    /**
     * @var array<string, mixed>|null
     */
    private ?array $tokenInfo;

    /**
     * @param bool $valid
     * @param string|null $tokenSuffix
     * @param string|null $error
     * @param array<string, mixed>|null $tokenInfo
     */
    public function __construct(bool $valid, ?string $tokenSuffix = null, ?string $error = null, ?array $tokenInfo = null)
    {
        $this->valid = $valid;
        $this->tokenSuffix = $tokenSuffix;
        $this->error = $error;
        $this->tokenInfo = $tokenInfo;
    }

    public function isValid(): bool
    {
        return $this->valid;
    }

    public function getTokenSuffix(): ?string
    {
        return $this->tokenSuffix;
    }

    public function getError(): ?string
    {
        return $this->error;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getTokenInfo(): ?array
    {
        return $this->tokenInfo;
    }
}