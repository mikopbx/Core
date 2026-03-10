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
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\DiInterface;
use stdClass;

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

    public function __construct(DiInterface $di)
    {
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
     * @param int $keyId
     * @return void
     */
    private function updateLastUsedBuffer(int $keyId): void
    {
        $bufferKey = self::LAST_USED_BUFFER_KEY . $keyId;
        $now = time();
        
        // Get last sync time
        $lastSync = $this->cache->get($bufferKey . ':sync') ?? 0;
        
        // Update buffer
        $this->cache->set($bufferKey, $now, self::LAST_USED_SYNC_INTERVAL * 2);
        
        // Sync to DB if interval passed
        if ($now - $lastSync > self::LAST_USED_SYNC_INTERVAL) {
            $this->syncLastUsedToDatabase($keyId, $now);
            $this->cache->set($bufferKey . ':sync', $now, self::LAST_USED_SYNC_INTERVAL * 2);
        }
    }
    
    /**
     * Sync last used time to database
     * 
     * @param int $keyId
     * @param int $timestamp
     * @return void
     */
    private function syncLastUsedToDatabase(int $keyId, int $timestamp): void
    {
        $key = ApiKeys::findFirst($keyId);
        if ($key) {
            $key->last_used_at = date('Y-m-d H:i:s', $timestamp);
            $key->save();
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
        $requestPath = $request->getURI();

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
        
        // Special case: localhost-only restriction
        if ($keyData['networkfilterid'] === 'localhost') {
            // Allow only localhost connections
            return in_array($clientIp, ['127.0.0.1', '::1']);
        }
        
        // Use existing NetworkFilter validation logic
        $filter = NetworkFilters::findFirst($keyData['networkfilterid']);
        if (!$filter) {
            return true; // Filter not found, allow
        }
        
        // Check if IP is allowed by the filter
        // NetworkFilters has permit/deny fields with comma-separated networks
        $permitNetworks = explode(',', $filter->permit ?? '');
        $denyNetworks = explode(',', $filter->deny ?? '');
        
        // Check deny list first
        foreach ($denyNetworks as $network) {
            if (!empty($network) && $this->ipInNetwork($clientIp, trim($network))) {
                return false;
            }
        }
        
        // If permit list is empty, allow all (except denied)
        if (empty($filter->permit) || $filter->permit === '0.0.0.0/0') {
            return true;
        }
        
        // Check permit list
        foreach ($permitNetworks as $network) {
            if (!empty($network) && $this->ipInNetwork($clientIp, trim($network))) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if IP is in network range (supports both IPv4 and IPv6)
     *
     * @param string $ip IP address to check
     * @param string $network Network in CIDR notation (e.g., 192.168.1.0/24 or 2001:db8::/32) or single IP
     * @return bool
     */
    private function ipInNetwork(string $ip, string $network): bool
    {
        if (strpos($network, '/') === false) {
            // Single IP - direct comparison works for both IPv4 and IPv6
            return $ip === $network;
        }

        list($subnet, $mask) = explode('/', $network);

        // Detect IPv6
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) &&
            filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            return $this->ipv6InNetwork($ip, $subnet, (int)$mask);
        }

        // IPv4 handling (original logic)
        $subnetLong = ip2long($subnet);
        $ipLong = ip2long($ip);

        // Validate that both IPs were successfully converted
        if ($subnetLong === false || $ipLong === false) {
            return false;
        }

        $maskLong = -1 << (32 - (int)$mask);
        $subnetLong &= $maskLong;

        return ($ipLong & $maskLong) == $subnetLong;
    }

    /**
     * Check if IPv6 address is in network range
     *
     * @param string $ip IPv6 address
     * @param string $subnet IPv6 subnet
     * @param int $mask Prefix length (0-128)
     * @return bool
     */
    private function ipv6InNetwork(string $ip, string $subnet, int $mask): bool
    {
        // Convert IPv6 addresses to binary representation
        $binIp = inet_pton($ip);
        $binSubnet = inet_pton($subnet);

        if ($binIp === false || $binSubnet === false) {
            return false;
        }

        // Calculate full bytes and remaining bits
        $fullBytes = (int)floor($mask / 8);
        $remainingBits = $mask % 8;

        // Compare full bytes
        if ($fullBytes > 0 && substr($binIp, 0, $fullBytes) !== substr($binSubnet, 0, $fullBytes)) {
            return false;
        }

        // Compare remaining bits if any
        if ($remainingBits > 0 && $fullBytes < 16) {
            $ipByte = ord($binIp[$fullBytes]);
            $subnetByte = ord($binSubnet[$fullBytes]);
            $bitmask = 0xFF << (8 - $remainingBits);

            if (($ipByte & $bitmask) !== ($subnetByte & $bitmask)) {
                return false;
            }
        }

        return true;
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