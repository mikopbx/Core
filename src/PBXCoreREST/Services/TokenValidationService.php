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
use Phalcon\Encryption\Security\Random;
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
    private const string LAST_USED_BUFFER_KEY = 'bearer_tokens:last_used:';
    private const int LAST_USED_SYNC_INTERVAL = 60; // Sync to DB every minute
    
    /**
     * List of endpoints that should never be accessible via Bearer tokens
     * These are internal system endpoints
     */
    private const array EXCLUDED_ENDPOINTS = [
        '/pbxcore/api/user-page-tracker',
        '/pbxcore/api/users',
        '/pbxcore/api/nchan',
    ];
    
    private DiInterface $di;
    private $cache;
    
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
        
        // Get token suffix for logging
        $tokenSuffix = substr($providedToken, -4);
        
        // Debug log
        SystemMessages::sysLogMsg(__CLASS__, "Testing Bearer token ending with {$tokenSuffix}", LOG_DEBUG);
        
        // Try to get from cache first
        $cacheKey = self::CACHE_KEY_PREFIX . md5($providedToken);
        $cachedData = $this->cache->get($cacheKey);
        
        if ($cachedData !== null) {
            SystemMessages::sysLogMsg(__CLASS__, "Found Bearer token in cache", LOG_DEBUG);
            return $this->validatePermissions($cachedData, $request, $tokenSuffix);
        }
        
        // Not in cache, check database
        $apiKey = $this->findTokenByHash($providedToken);
        
        if ($apiKey === null) {
            SystemMessages::sysLogMsg(__CLASS__, "Bearer token not found in database", LOG_DEBUG);
            return new TokenValidationResult(false, $tokenSuffix, 'Invalid Bearer token');
        }
        
        SystemMessages::sysLogMsg(__CLASS__, "Bearer token found in database, caching...", LOG_DEBUG);
        
        // Cache the valid token
        $keyData = $apiKey->toArray();
        $this->cache->set($cacheKey, $keyData, self::CACHE_TTL);
        
        return $this->validatePermissions($keyData, $request, $tokenSuffix);
    }
    
    /**
     * Validate permissions for authenticated Bearer token
     * 
     * @param array $keyData
     * @param \MikoPBX\PBXCoreREST\Http\Request $request
     * @param string $tokenSuffix
     * @return TokenValidationResult
     */
    private function validatePermissions(array $keyData, $request, string $tokenSuffix): TokenValidationResult
    {
        $requestPath = $request->getURI();
        SystemMessages::sysLogMsg(__CLASS__, "Validating Bearer token permissions for path: {$requestPath}", LOG_DEBUG);
        
        // Update last used time in buffer
        $this->updateLastUsedBuffer($keyData['id']);
        
        // Check network filter first (more critical)
        if (!$this->checkNetworkFilter($keyData, $request)) {
            SystemMessages::sysLogMsg(__CLASS__, "Bearer token network filter check failed", LOG_WARNING);
            return new TokenValidationResult(false, $tokenSuffix, 'Access denied: IP address not allowed');
        }
        
        // Check path permissions
        if (!$this->checkPathPermissions($keyData, $request)) {
            SystemMessages::sysLogMsg(__CLASS__, "Bearer token path permissions check failed. Allowed paths: " . ($keyData['allowed_paths'] ?? 'null'), LOG_WARNING);
            return new TokenValidationResult(false, $tokenSuffix, 'Access denied: insufficient permissions for this endpoint');
        }
        
        SystemMessages::sysLogMsg(__CLASS__, "Bearer token validation - all checks passed successfully", LOG_DEBUG);
        return new TokenValidationResult(true, $tokenSuffix, null, $keyData);
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
     * @param array $keyData
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
     * @param array $keyData
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
     * Check if IP is in network range
     * 
     * @param string $ip
     * @param string $network
     * @return bool
     */
    private function ipInNetwork(string $ip, string $network): bool
    {
        if (strpos($network, '/') === false) {
            // Single IP
            return $ip === $network;
        }
        
        list($subnet, $mask) = explode('/', $network);
        $subnet = ip2long($subnet);
        $ip = ip2long($ip);
        $mask = -1 << (32 - $mask);
        $subnet &= $mask;
        
        return ($ip & $mask) == $subnet;
    }
    
    /**
     * Clear cache for a specific Bearer token or all tokens
     * 
     * @param int|null $keyId
     * @return void
     */
    public static function clearCache(?int $keyId = null): void
    {
        $di = \Phalcon\Di\Di::getDefault();
        $cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        
        // Clear all cached tokens (since we don't know the hash)
        // In production, might want to track token->hash mapping
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
    private ?array $tokenInfo;
    
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
    
    public function getTokenInfo(): ?array 
    { 
        return $this->tokenInfo; 
    }
}