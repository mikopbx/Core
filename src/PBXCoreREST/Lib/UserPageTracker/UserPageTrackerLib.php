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

namespace MikoPBX\PBXCoreREST\Lib\UserPageTracker;

use Phalcon\Di\Injectable;
use MikoPBX\Common\Providers\RedisClientProvider;

/**
 * UserPageTrackerLib - Library for managing user page tracking Redis operations
 * 
 * Provides centralized methods for creating and accessing Redis keys
 * and unified Redis operations for the user page tracking system.
 */
class UserPageTrackerLib extends Injectable
{
    /**
     * Redis key prefixes for page tracking
     */
    private const string USER_KEY_PREFIX = 'pageTracker:user:';
    private const string PAGE_KEY_PREFIX = 'pageTracker:page:';
    
    /**
     * Get the Redis key for tracking a user viewing a specific page
     * 
     * @param string $sessionId User session ID
     * @param string $pageName Page name being viewed
     * @return string Redis key
     */
    public static function getUserViewingKey(string $sessionId, string $pageName): string
    {
        return self::USER_KEY_PREFIX . $sessionId . ':viewing:' . $pageName;
    }
    
    /**
     * Get the Redis key for tracking all viewers of a specific page
     * 
     * @param string $pageName Page name
     * @return string Redis key
     */
    public static function getPageViewersKey(string $pageName): string
    {
        return self::PAGE_KEY_PREFIX . $pageName . ':viewers';
    }
    
    /**
     * Get the Redis key pattern for finding all user viewing keys
     * 
     * @param string $sessionId User session ID
     * @return string Redis key pattern
     */
    public static function getUserViewingPattern(string $sessionId): string
    {
        return self::USER_KEY_PREFIX . $sessionId . ':viewing:*';
    }
    
    /**
     * Get the Redis key pattern for finding all page viewer keys
     * 
     * @return string Redis key pattern
     */
    public static function getPageViewersPattern(): string
    {
        return self::PAGE_KEY_PREFIX . '*:viewers';
    }
    
    /**
     * Record that a user is viewing a page
     * 
     * @param string $userId User session ID
     * @param string $pageName Page name
     * @param int $expire TTL in seconds (default: 300)
     * @return bool Success status
     */
    public function recordPageView(string $sessionId, string $pageName, int $expire = 300): bool
    {
        try {
            $keyUser = self::getUserViewingKey($sessionId, $pageName);
            $keyPage = self::getPageViewersKey($pageName);
            
            // Get Redis with proper prefix handling
            $redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
            
            // Set user viewing timestamp with expiration
            $redis->set($keyUser, time(), ['EX' => $expire]);
            
            // Add user to page viewers set
            $redis->sAdd($keyPage, $sessionId);
            $redis->expire($keyPage, $expire);
            
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
    
    /**
     * Record that a user left a page
     * 
     * @param string $sessionId User session ID
     * @param string $pageName Page name
     * @return bool Success status
     */
    public function recordPageLeave(string $sessionId, string $pageName): bool
    {
        try {
            $keyUser = self::getUserViewingKey($sessionId, $pageName);
            $keyPage = self::getPageViewersKey($pageName);
            
            // Get Redis with proper prefix handling
            $redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
            
            // Remove user viewing record
            $redis->del($keyUser);
            
            // Remove user from page viewers set
            $redis->sRem($keyPage, $sessionId);
            
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
    
    /**
     * Get list of users currently viewing a page
     * 
     * @param string $pageName Page name
     * @return array Array of user IDs viewing the page
     */
    public function getPageViewers(string $pageName): array
    {
        try {
            $keyPage = self::getPageViewersKey($pageName);
            
            // Get Redis with proper prefix handling
            $redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
            
            return $redis->sMembers($keyPage);
        } catch (\Throwable $e) {
            return [];
        }
    }
    
    /**
     * Check if any users are viewing any of the specified pages
     * 
     * @param array $pageNames Array of page names to check
     * @return bool True if any users are viewing any of the pages
     */
    public function hasActiveViewers(array $pageNames): bool
    {
        try {
            foreach ($pageNames as $pageName) {
                $viewers = $this->getPageViewers($pageName);
                if (!empty($viewers)) {
                    return true;
                }
            }
            return false;
        } catch (\Throwable $e) {
            return false;
        }
    }
    
    /**
     * Get list of pages a user is currently viewing
     * 
     * @param string $sessionId User session ID
     * @return array Array of page names the user is viewing
     */
    public function getUserViewingPages(string $sessionId): array
    {
        try {
            $pattern = self::getUserViewingPattern($sessionId);
            
            // Get Redis with proper prefix handling
            $redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
            
            $keys = $redis->keys($pattern);
            
            $pages = [];
            foreach ($keys as $key) {
                // Extract page name from key pattern
                if (preg_match('/pageTracker:user:([^:]+):viewing:(.+)/', $key, $matches)) {
                    $pages[] = $matches[2];
                }
            }
            
            return $pages;
        } catch (\Throwable $e) {
            return [];
        }
    }
}