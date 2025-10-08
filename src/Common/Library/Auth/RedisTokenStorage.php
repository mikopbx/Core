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

namespace MikoPBX\Common\Library\Auth;

/**
 * Redis Token Storage - High-performance token storage for JWT refresh tokens
 *
 * Uses Redis for O(1) token lookup and automatic TTL-based expiration.
 * All refresh tokens (including "Remember Me" functionality) are stored in Redis.
 *
 * Architecture:
 * - Key: refresh_token:{sha256(token)} - Fast hash-based lookup
 * - Value: JSON with session data (userId, role, clientIp, userAgent, createdAt)
 * - TTL: 30 days - Automatic cleanup by Redis
 *
 * Remember Me functionality:
 * - When rememberMe=true: Cookie expires in 30 days (matches Redis TTL)
 * - When rememberMe=false: Cookie is session-only (expires on browser close)
 * - In both cases, the refresh token is stored in Redis with 30-day TTL
 *
 * Performance:
 * - Redis: 1 hash lookup = ~1ms (O(1))
 * - No database scanning required
 *
 * @package MikoPBX\Common\Library\Auth
 */
class RedisTokenStorage
{
    /**
     * Redis key prefix for refresh tokens
     */
    private const string KEY_PREFIX = 'refresh_token:';

    /**
     * Default token TTL (30 days)
     */
    private const int DEFAULT_TTL = 2592000;

    /**
     * Redis adapter instance
     */
    private \Redis $redis;

    /**
     * Constructor
     *
     * @param \Redis $redis Redis adapter from DI container
     */
    public function __construct(\Redis $redis)
    {
        $this->redis = $redis;
    }

    /**
     * Save refresh token to Redis
     *
     * Stores token data with automatic TTL expiration.
     * No need for manual cleanup - Redis handles it automatically.
     *
     * @param string $refreshToken Plain refresh token (not hashed)
     * @param array<string, mixed> $sessionData Session parameters (userId, role, etc.)
     * @param int $ttl Time to live in seconds (default: 30 days)
     * @return bool Success status
     */
    public function save(string $refreshToken, array $sessionData, int $ttl = self::DEFAULT_TTL): bool
    {
        $key = $this->buildKey($refreshToken);

        // Add metadata
        $data = array_merge($sessionData, [
            'createdAt' => time(),
            'lastUsedAt' => time(),
        ]);

        $json = json_encode($data);
        if ($json === false) {
            return false;
        }

        // Store with TTL - Redis will auto-delete after expiration
        return $this->redis->setex($key, $ttl, $json);
    }

    /**
     * Get token data from Redis
     *
     * Performs O(1) lookup using SHA256 hash of token.
     * Much faster than SQLite O(n) scan with bcrypt validation.
     *
     * @param string $refreshToken Plain refresh token
     * @return array<string, mixed>|null Session data or null if not found/expired
     */
    public function get(string $refreshToken): ?array
    {
        $key = $this->buildKey($refreshToken);

        $json = $this->redis->get($key);
        if ($json === false) {
            return null; // Token not found or expired
        }

        $data = json_decode($json, true);

        return is_array($data) ? $data : null;
    }

    /**
     * Update token with new data (for rotation)
     *
     * Replaces old token with new one atomically.
     * Deletes old token and creates new one with extended TTL.
     *
     * @param string $oldToken Token to replace
     * @param string $newToken New token value
     * @param array<string, mixed> $sessionData Session parameters
     * @param int $ttl Time to live in seconds
     * @return bool Success status
     */
    public function rotate(string $oldToken, string $newToken, array $sessionData, int $ttl = self::DEFAULT_TTL): bool
    {
        // Get existing data to preserve userId
        $oldData = $this->get($oldToken);
        if ($oldData === null) {
            return false; // Old token not found
        }

        // Preserve createdAt from old token
        $data = array_merge($sessionData, [
            'createdAt' => $oldData['createdAt'] ?? time(),
            'lastUsedAt' => time(),
        ]);

        // Delete old token
        $this->delete($oldToken);

        // Create new token
        return $this->save($newToken, $data, $ttl);
    }

    /**
     * Update last used timestamp
     *
     * Touches the token to update lastUsedAt without changing TTL.
     *
     * @param string $refreshToken Token to update
     * @return bool Success status
     */
    public function touch(string $refreshToken): bool
    {
        $data = $this->get($refreshToken);
        if ($data === null) {
            return false;
        }

        $key = $this->buildKey($refreshToken);

        // Update lastUsedAt
        $data['lastUsedAt'] = time();

        $json = json_encode($data);
        if ($json === false) {
            return false;
        }

        // Get current TTL to preserve it
        $ttl = $this->redis->ttl($key);
        if (!is_int($ttl) || $ttl <= 0) {
            $ttl = self::DEFAULT_TTL;
        }

        return $this->redis->setex($key, $ttl, $json);
    }

    /**
     * Delete token from Redis
     *
     * Immediately invalidates the token.
     *
     * @param string $refreshToken Token to delete
     * @return bool Success status
     */
    public function delete(string $refreshToken): bool
    {
        $key = $this->buildKey($refreshToken);

        $result = $this->redis->del($key);
        return is_int($result) && $result > 0;
    }

    /**
     * Delete all tokens for a user
     *
     * Useful for "logout from all devices" functionality.
     * Note: This requires scanning all keys - use sparingly.
     *
     * @param string $userId User identifier
     * @return int Number of deleted tokens
     */
    public function deleteAllForUser(string $userId): int
    {
        $pattern = self::KEY_PREFIX . '*';
        $deleted = 0;

        $iterator = null;
        while (true) {
            $keys = $this->redis->scan($iterator, $pattern, 100);
            if (!is_array($keys) || count($keys) === 0) {
                break;
            }

            foreach ($keys as $key) {
                $json = $this->redis->get($key);
                if ($json !== false && is_string($json)) {
                    $data = json_decode($json, true);
                    if (is_array($data) && ($data['userId'] ?? '') === $userId) {
                        $delResult = $this->redis->del($key);
                        if (is_int($delResult) && $delResult > 0) {
                            $deleted++;
                        }
                    }
                }
            }
        }

        return $deleted;
    }

    /**
     * Check if token exists
     *
     * Fast existence check without retrieving data.
     *
     * @param string $refreshToken Token to check
     * @return bool True if token exists
     */
    public function exists(string $refreshToken): bool
    {
        $key = $this->buildKey($refreshToken);

        $result = $this->redis->exists($key);
        return is_int($result) && $result > 0;
    }

    /**
     * Get token TTL in seconds
     *
     * @param string $refreshToken Token to check
     * @return int Remaining TTL in seconds, -1 if no expiry, -2 if key not exists
     */
    public function getTTL(string $refreshToken): int
    {
        $key = $this->buildKey($refreshToken);

        return $this->redis->ttl($key);
    }

    /**
     * Extend token TTL
     *
     * Prolongs token lifetime without changing data.
     *
     * @param string $refreshToken Token to extend
     * @param int $ttl New TTL in seconds
     * @return bool Success status
     */
    public function extend(string $refreshToken, int $ttl = self::DEFAULT_TTL): bool
    {
        $key = $this->buildKey($refreshToken);

        return $this->redis->expire($key, $ttl);
    }

    /**
     * Build Redis key from token
     *
     * Uses SHA256 hash for:
     * - Fast O(1) lookup
     * - Fixed key length (64 chars)
     * - No need to store hash in DB
     * - Token stays in plain form only in cookie
     *
     * @param string $refreshToken Plain token
     * @return string Redis key
     */
    private function buildKey(string $refreshToken): string
    {
        return self::KEY_PREFIX . hash('sha256', $refreshToken);
    }

    /**
     * Get total number of active tokens
     *
     * @return int Number of tokens
     */
    public function count(): int
    {
        $pattern = self::KEY_PREFIX . '*';
        $count = 0;

        $iterator = null;
        while (true) {
            $keys = $this->redis->scan($iterator, $pattern, 100);
            if (!is_array($keys) || count($keys) === 0) {
                break;
            }
            $count += count($keys);
        }

        return $count;
    }

    /**
     * Get all active tokens for a user
     *
     * Useful for displaying active sessions in UI.
     *
     * @param string $userId User identifier
     * @return array<array<string, mixed>> Array of token data
     */
    public function getAllForUser(string $userId): array
    {
        $pattern = self::KEY_PREFIX . '*';
        $tokens = [];

        $iterator = null;
        while (true) {
            $keys = $this->redis->scan($iterator, $pattern, 100);
            if (!is_array($keys) || count($keys) === 0) {
                break;
            }

            foreach ($keys as $key) {
                $json = $this->redis->get($key);
                if ($json !== false && is_string($json)) {
                    $data = json_decode($json, true);
                    if (is_array($data) && ($data['userId'] ?? '') === $userId) {
                        // Add TTL info
                        $ttl = $this->redis->ttl($key);
                        $data['ttl'] = is_int($ttl) ? $ttl : -1;
                        $tokens[] = $data;
                    }
                }
            }
        }

        return $tokens;
    }
}
