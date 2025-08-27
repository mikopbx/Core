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
use Phalcon\Di\DiInterface;
use Phalcon\Encryption\Security\Random;

/**
 * Class ApiKeyValidationService
 * 
 * Validates API keys for REST API authentication
 * 
 * @package MikoPBX\PBXCoreREST\Services
 */
class ApiKeyValidationService
{
    private const string CACHE_KEY_PREFIX = 'api_keys:';
    private const int CACHE_TTL = 300; // 5 minutes
    private const string LAST_USED_BUFFER_KEY = 'api_keys:last_used:';
    private const int LAST_USED_SYNC_INTERVAL = 60; // Sync to DB every minute
    
    /**
     * List of endpoints that should never be accessible via API keys
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
     * Validate API key from request
     * 
     * @param \MikoPBX\PBXCoreREST\Http\Request $request
     * @return ApiKeyValidationResult
     */
    public function validate($request): ApiKeyValidationResult
    {
        $providedKey = $request->getApiKey();
        if (empty($providedKey)) {
            return new ApiKeyValidationResult(false, null, 'No API key provided');
        }
        
        // Get key suffix for logging
        $keySuffix = substr($providedKey, -4);
        
        // Temporary debug log
        error_log("ApiKeyValidation: Testing key ending with {$keySuffix}");
        
        // Try to get from cache first
        $cacheKey = self::CACHE_KEY_PREFIX . md5($providedKey);
        $cachedData = $this->cache->get($cacheKey);
        
        if ($cachedData !== null) {
            error_log("ApiKeyValidation: Found key in cache");
            return $this->validatePermissions($cachedData, $request, $keySuffix);
        }
        
        // Not in cache, check database
        $apiKey = $this->findApiKeyByHash($providedKey);
        
        if ($apiKey === null) {
            error_log("ApiKeyValidation: Key not found in database");
            return new ApiKeyValidationResult(false, $keySuffix, 'Invalid API key');
        }
        
        error_log("ApiKeyValidation: Key found in database, caching...");
        
        // Cache the valid key
        $keyData = $apiKey->toArray();
        $this->cache->set($cacheKey, $keyData, self::CACHE_TTL);
        
        return $this->validatePermissions($keyData, $request, $keySuffix);
    }
    
    /**
     * Validate permissions for authenticated API key
     * 
     * @param array $keyData
     * @param \MikoPBX\PBXCoreREST\Http\Request $request
     * @param string $keySuffix
     * @return ApiKeyValidationResult
     */
    private function validatePermissions(array $keyData, $request, string $keySuffix): ApiKeyValidationResult
    {
        $requestPath = $request->getURI();
        error_log("ApiKeyValidation: Validating permissions for path: {$requestPath}");
        
        // Update last used time in buffer
        $this->updateLastUsedBuffer($keyData['id']);
        
        // Check network filter first (more critical)
        if (!$this->checkNetworkFilter($keyData, $request)) {
            error_log("ApiKeyValidation: Network filter check failed");
            return new ApiKeyValidationResult(false, $keySuffix, 'Access denied: IP address not allowed');
        }
        
        // Check path permissions
        if (!$this->checkPathPermissions($keyData, $request)) {
            error_log("ApiKeyValidation: Path permissions check failed. Allowed paths: " . ($keyData['allowed_paths'] ?? 'null'));
            return new ApiKeyValidationResult(false, $keySuffix, 'Access denied: insufficient permissions for this endpoint');
        }
        
        error_log("ApiKeyValidation: All checks passed successfully");
        return new ApiKeyValidationResult(true, $keySuffix, null, $keyData);
    }
    
    /**
     * Find API key by comparing hashes
     * 
     * @param string $providedKey
     * @return ApiKeys|null
     */
    private function findApiKeyByHash(string $providedKey): ?ApiKeys
    {
        $activeKeys = ApiKeys::find();
        
        foreach ($activeKeys as $key) {
            if (password_verify($providedKey, $key->key_hash)) {
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
     * Check if request path is allowed for this API key
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
            return false;
        }
        
        // No path restrictions = allow all (except excluded)
        if (empty($keyData['allowed_paths'])) {
            return true;
        }
        
        // Parse allowed paths
        $allowedPaths = json_decode($keyData['allowed_paths'], true);
        if (!is_array($allowedPaths) || empty($allowedPaths)) {
            return true; // Invalid config = allow all
        }
        
        // Simple suffix matching
        foreach ($allowedPaths as $allowedSuffix) {
            if (strpos($requestPath, $allowedSuffix) === 0) {
                return true;
            }
        }
        
        return false; // No suffix matched
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
        if (empty($keyData['networkfilterid'])) {
            // No network filter, allow all IPs
            return true;
        }
        
        // Use existing NetworkFilter validation logic
        $filter = NetworkFilters::findFirst($keyData['networkfilterid']);
        if (!$filter) {
            return true; // Filter not found, allow
        }
        
        $clientIp = $request->getClientAddress();
        
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
     * Clear cache for a specific API key or all keys
     * 
     * @param int|null $keyId
     * @return void
     */
    public static function clearCache(?int $keyId = null): void
    {
        $di = \Phalcon\Di\Di::getDefault();
        $cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        
        // Clear all cached keys (since we don't know the hash)
        // In production, might want to track key->hash mapping
        $keys = $cache->getKeys(self::CACHE_KEY_PREFIX . '*');
        foreach ($keys as $key) {
            $cache->delete($key);
        }
    }
}

/**
 * API Key validation result
 */
class ApiKeyValidationResult
{
    private bool $valid;
    private ?string $keySuffix;
    private ?string $error;
    private ?array $keyInfo;
    
    public function __construct(bool $valid, ?string $keySuffix = null, ?string $error = null, ?array $keyInfo = null)
    {
        $this->valid = $valid;
        $this->keySuffix = $keySuffix;
        $this->error = $error;
        $this->keyInfo = $keyInfo;
    }
    
    public function isValid(): bool 
    { 
        return $this->valid; 
    }
    
    public function getKeySuffix(): ?string 
    { 
        return $this->keySuffix; 
    }
    
    public function getError(): ?string 
    { 
        return $this->error; 
    }
    
    public function getKeyInfo(): ?array 
    { 
        return $this->keyInfo; 
    }
}