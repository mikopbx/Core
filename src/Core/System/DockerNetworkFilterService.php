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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\Configs;
use MikoPBX\Core\System\System;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadPJSIPAction;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * DockerNetworkFilterService
 * 
 * Unified service for managing IP blocking in Docker environments.
 * Handles NetworkFilters deny rules and fail2ban blocks for both Asterisk and Nginx.
 */
class DockerNetworkFilterService extends Injectable
{
    private const string ASTERISK_ACL_FILE = '/etc/asterisk/network_filters_deny_acl.conf';
    private const string NGINX_DENY_FILE = '/etc/nginx/mikopbx/conf.d/network_filters_deny.conf';
    
    // Redis key prefixes and categories
    private const string REDIS_PREFIX = 'firewall:';
    private const string CATEGORY_HTTP = 'http';
    private const string CATEGORY_AMI = 'ami';
    private const string CATEGORY_SIP = 'sip';
    private const string CATEGORY_WHITELIST = 'whitelist';
    
    /**
     * Get list of IPs to deny from NetworkFilters for specific categories
     *
     * @param array $categories Traffic categories to filter (e.g., ['SIP', 'WEB'])
     * @return array List of IP addresses/networks to deny
     */
    public static function getNetworkFiltersDenyList(array $categories = []): array
    {
        $denyList = [];
        
        // Define localhost addresses that should never be blocked
        $localhostAddresses = [
            '127.0.0.1',
            '127.0.0.0/8',
            '::1',
            'localhost'
        ];
        
        if (empty($categories)) {
            // Get all NetworkFilters with deny rules
            $filters = NetworkFilters::find([
                'conditions' => 'deny IS NOT NULL AND deny != :empty: AND deny != :zero_network:',
                'bind' => [
                    'empty' => '',
                    'zero_network' => '0.0.0.0/0'
                ]
            ]);
            
            foreach ($filters as $filter) {
                $denyIps = explode(',', $filter->deny);
                foreach ($denyIps as $ip) {
                    $ip = trim($ip);
                    if (!empty($ip) && !in_array($ip, $denyList) && !self::isLocalhostAddress($ip)) {
                        $denyList[] = $ip;
                    }
                }
            }
        } else {
            // Get NetworkFilters for specific categories using QueryBuilder
            $parameters = [
                'models' => [
                    'NF' => NetworkFilters::class,
                ],
                'columns' => [
                    'NF.deny',
                ],
                'conditions' => 'NF.deny IS NOT NULL AND NF.deny != :empty: ' .
                               'AND NF.deny != :zero_network: ' .
                               'AND FR.category IN ({categories:array}) ' .
                               'AND FR.action = :action:',
                'bind' => [
                    'empty' => '',
                    'zero_network' => '0.0.0.0/0',
                    'categories' => $categories,
                    'action' => 'allow'
                ],
                'joins' => [
                    'FR' => [
                        0 => FirewallRules::class,
                        1 => 'NF.id = FR.networkfilterid',
                        2 => 'FR',
                        3 => 'INNER',
                    ],
                ],
            ];
            
            $result = Di::getDefault()->get('modelsManager')->createBuilder($parameters)->getQuery()->execute();
            
            foreach ($result as $row) {
                if (!empty($row->deny)) {
                    $denyIps = explode(',', $row->deny);
                    foreach ($denyIps as $ip) {
                        $ip = trim($ip);
                        if (!empty($ip) && !in_array($ip, $denyList) && !self::isLocalhostAddress($ip)) {
                            $denyList[] = $ip;
                        }
                    }
                }
            }
        }
        
        return $denyList;
    }
    
    /**
     * Get list of IPs that should never be blocked (whitelist)
     *
     * @return array List of whitelisted IP addresses/networks
     */
    public static function getNetworkFiltersWhitelist(): array
    {
        $whitelist = [];
        
        // Get NetworkFilters marked as never_block_ip
        $filters = NetworkFilters::find([
            'conditions' => 'newer_block_ip = :never_block:',
            'bind' => ['never_block' => '1']
        ]);
        
        foreach ($filters as $filter) {
            if (!empty($filter->permit)) {
                $permitIps = explode(',', $filter->permit);
                foreach ($permitIps as $ip) {
                    $ip = trim($ip);
                    // Skip invalid whitelist entries like 0.0.0.0/0 which would whitelist everything
                    if (!empty($ip) && !in_array($ip, $whitelist) && $ip !== '0.0.0.0/0' && $ip !== '0.0.0.0') {
                        $whitelist[] = $ip;
                    }
                }
            }
        }
        
        return $whitelist;
    }
    
    /**
     * Generate Asterisk ACL configuration for NetworkFilters deny rules
     *
     * @return void
     */
    public static function generateAsteriskNetworkFiltersDenyAcl(): void
    {
        if (!Util::isDocker()) {
            return;
        }
        
        // Check if firewall is enabled
        $firewallEnabled = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_FIREWALL_ENABLED);
        if ($firewallEnabled !== '1') {
            // Remove ACL file if firewall is disabled
            if (file_exists(self::ASTERISK_ACL_FILE)) {
                unlink(self::ASTERISK_ACL_FILE);
            }
            $managerDenyFile = dirname(self::ASTERISK_ACL_FILE) . '/manager_network_filters_deny.conf';
            if (file_exists($managerDenyFile)) {
                unlink($managerDenyFile);
            }
            return;
        }
        
        // Always create the file when firewall is enabled, even if empty
        // This is necessary because AclConf includes this file
        
        $content = "; NetworkFilters deny rules - DO NOT EDIT MANUALLY\n";
        $content .= "; This file is automatically generated from Redis\n";
        $content .= "; Last updated: " . date('Y-m-d H:i:s') . "\n\n";
        
        // Always permit localhost first
        $content .= "; Always allow localhost access\n";
        $content .= "permit=127.0.0.1/255.255.255.255\n";
        $content .= "permit=::1\n\n";
        
        // Get deny list from Redis for SIP and AMI categories
        $sipDenyList = self::getBlockedIps(self::CATEGORY_SIP);
        $amiDenyList = self::getBlockedIps(self::CATEGORY_AMI);
        
        // Merge and remove duplicates
        $denyList = array_unique(array_merge($sipDenyList, $amiDenyList));
        
        if (!empty($denyList)) {
            $content .= "; Deny rules from Redis\n";
            // Generate ACL rules
            foreach ($denyList as $ip) {
                // Determine if it's a network or single IP
                if (strpos($ip, '/') !== false) {
                    $content .= "deny=$ip\n";
                } else {
                    $content .= "deny=$ip/255.255.255.255\n";
                }
            }
        } else {
            $content .= "; No deny rules configured\n";
        }
        
        // Ensure directory exists
        $dir = dirname(self::ASTERISK_ACL_FILE);
        if (!is_dir($dir)) {
            Util::mwMkdir($dir, true);
        }
        
        file_put_contents(self::ASTERISK_ACL_FILE, $content);
        
        // Also generate deny rules for manager.conf
        $managerContent = "; NetworkFilters deny rules for manager.conf - DO NOT EDIT MANUALLY\n";
        $managerContent .= "; This file is automatically generated from Redis\n";
        $managerContent .= "; Last updated: " . date('Y-m-d H:i:s') . "\n\n";
        
        if (!empty($amiDenyList)) {
            foreach ($amiDenyList as $ip) {
                // Determine if it's a network or single IP
                if (strpos($ip, '/') !== false) {
                    $managerContent .= "deny=$ip\n";
                } else {
                    $managerContent .= "deny=$ip/255.255.255.255\n";
                }
            }
        }
        
        $managerDenyFile = $dir . '/manager_network_filters_deny.conf';
        file_put_contents($managerDenyFile, $managerContent);
    }
    
    /**
     * Generate Nginx deny configuration for NetworkFilters deny rules
     *
     * @return void
     */
    public static function generateNginxNetworkFiltersDeny(): void
    {
        if (!Util::isDocker()) {
            return;
        }
        
        // Check if firewall is enabled
        $firewallEnabled = PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED);
        if ($firewallEnabled !== '1') {
            // Remove deny file if firewall is disabled
            if (file_exists(self::NGINX_DENY_FILE)) {
                unlink(self::NGINX_DENY_FILE);
            }
            return;
        }
        
        // Always create the file when firewall is enabled, even if empty
        // This is necessary because nginx config includes this file
        
        $config = "# NetworkFilters deny rules for Docker\n";
        $config .= "# This file is automatically generated, do not edit manually\n\n";
        
        // Always allow localhost first
        $config .= "# Always allow localhost access\n";
        $config .= "allow 127.0.0.1;\n";
        $config .= "allow ::1;\n\n";
        
        // Get deny list for WEB category
        $denyList = self::getNetworkFiltersDenyList(['WEB']);
        
        if (!empty($denyList)) {
            $config .= "# Deny rules from NetworkFilters\n";
            foreach ($denyList as $ip) {
                $config .= "deny $ip;\n";
            }
        } else {
            $config .= "# No deny rules configured\n";
        }
        
        // Ensure directory exists
        $dir = dirname(self::NGINX_DENY_FILE);
        if (!is_dir($dir)) {
            Util::mwMkdir($dir, true);
        }
        
        file_put_contents(self::NGINX_DENY_FILE, $config);
    }
    
    /**
     * Update all Docker network filters configurations
     *
     * @return void
     */
    public static function updateAllConfigurations(): void
    {
        if (!Util::isDocker()) {
            return;
        }
        
        SystemMessages::sysLogMsg(__CLASS__, 'Updating Docker network filters configurations', LOG_INFO);
        
        // Sync whitelist to Redis
        self::syncWhitelistToRedis();
        
        // Sync NetworkFilters deny rules to Redis
        self::syncNetworkFiltersDenyToRedis();
        
        // Generate Asterisk ACL
        self::generateAsteriskNetworkFiltersDenyAcl();
        
        // Generate fail2ban ACL for Asterisk
        Configs\Fail2BanConf::generateAsteriskAclConfigFromRedis();
        
        // Generate fail2ban ACL for IAX
        Configs\Fail2BanConf::generateIaxAclConfigFromRedis();
        
        // Generate Nginx deny (for static includes, not used with Lua)
        self::generateNginxNetworkFiltersDeny();
        
        // Reload services
        self::reloadServices();
    }
    
    /**
     * Sync NetworkFilters deny rules to Redis
     *
     * @return void
     */
    private static function syncNetworkFiltersDenyToRedis(): void
    {
        if (!Util::isDocker()) {
            return;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            // Map categories to Redis categories
            $categoryMap = [
                'WEB' => self::CATEGORY_HTTP,
                'SIP' => self::CATEGORY_SIP,
                'AMI' => self::CATEGORY_AMI
            ];
            
            foreach ($categoryMap as $dbCategory => $redisCategory) {
                // Get deny list for this category
                $denyList = self::getNetworkFiltersDenyList([$dbCategory]);
                
                // Clear existing entries for this category
                $pattern = self::REDIS_PREFIX . $redisCategory . ':*';
                $keys = $redis->keys($pattern);
                foreach ($keys as $key) {
                    $redis->del($key);
                }
                
                // Add new entries
                foreach ($denyList as $ip) {
                    $key = self::REDIS_PREFIX . $redisCategory . ':' . $ip;
                    $redis->set($key, '1');
                }
                
                SystemMessages::sysLogMsg(__CLASS__, "Synced " . count($denyList) . " deny rules for category $dbCategory to Redis", LOG_INFO);
            }
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to sync deny rules to Redis: " . $e->getMessage(), LOG_ERR);
        }
    }
    
    /**
     * Reload affected services after configuration changes
     *
     * @return void
     */
    private static function reloadServices(): void
    {
        // Only reload Asterisk PJSIP if system is already running
        // During boot, Asterisk will load the ACL files on startup
        if (!System::isBooting()) {
            // Reload Asterisk PJSIP to apply new ACL rules
            WorkerModelsEvents::invokeAction(ReloadPJSIPAction::class);
        }
        
        // Nginx doesn't need restart - it uses Redis dynamically via Lua script
        // The Lua script reads firewall rules from Redis on each request
        // with 10-second cache for performance
    }
    
    /**
     * Add blocked IP to Redis with category
     *
     * @param string $ip IP address to block
     * @param string $category Category (http, ami, sip)
     * @param int $ttl Time to live in seconds (default 24 hours)
     * @return bool Success status
     */
    public static function addBlockedIp(string $ip, string $category, int $ttl = 86400): bool
    {
        if (!Util::isDocker()) {
            return false;
        }
        
        // Check if IP is localhost or whitelisted
        if (self::isLocalhostAddress($ip) || self::isIpWhitelisted($ip)) {
            SystemMessages::sysLogMsg(__CLASS__, "Cannot block whitelisted IP: $ip", LOG_WARNING);
            return false;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            $key = self::REDIS_PREFIX . $category . ':' . $ip;
            $result = $redis->setex($key, $ttl, '1');
            
            if ($result) {
                SystemMessages::sysLogMsg(__CLASS__, "Blocked IP $ip in category $category for $ttl seconds", LOG_INFO);
            }
            
            return (bool)$result;
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to block IP $ip: " . $e->getMessage(), LOG_ERR);
            return false;
        }
    }
    
    /**
     * Remove blocked IP from Redis category
     *
     * @param string $ip IP address to unblock
     * @param string $category Category (http, ami, sip)
     * @return bool Success status
     */
    public static function removeBlockedIp(string $ip, string $category): bool
    {
        if (!Util::isDocker()) {
            return false;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            $key = self::REDIS_PREFIX . $category . ':' . $ip;
            $result = $redis->del($key);
            
            if ($result) {
                SystemMessages::sysLogMsg(__CLASS__, "Unblocked IP $ip from category $category", LOG_INFO);
            }
            
            return (bool)$result;
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to unblock IP $ip: " . $e->getMessage(), LOG_ERR);
            return false;
        }
    }
    
    /**
     * Get list of blocked IPs for a category
     *
     * @param string $category Category (http, ami, sip)
     * @return array List of blocked IPs
     */
    public static function getBlockedIps(string $category): array
    {
        if (!Util::isDocker()) {
            return [];
        }
        
        $blockedIps = [];
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            $pattern = self::REDIS_PREFIX . $category . ':*';
            $keys = $redis->keys($pattern);
            
            foreach ($keys as $key) {
                // Extract IP from key
                $ip = str_replace(self::REDIS_PREFIX . $category . ':', '', $key);
                if (!empty($ip)) {
                    $blockedIps[] = $ip;
                }
            }
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to get blocked IPs: " . $e->getMessage(), LOG_ERR);
        }
        
        return $blockedIps;
    }
    
    /**
     * Check if IP is blocked in a specific category
     *
     * @param string $ip IP address to check
     * @param string $category Category (http, ami, sip)
     * @return bool True if IP is blocked
     */
    public static function isIpBlocked(string $ip, string $category): bool
    {
        if (!Util::isDocker()) {
            return false;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            $key = self::REDIS_PREFIX . $category . ':' . $ip;
            return $redis->exists($key) > 0;
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to check IP $ip: " . $e->getMessage(), LOG_ERR);
            return false;
        }
    }
    
    /**
     * Add IP to whitelist in Redis
     *
     * @param string $ip IP address or network to whitelist
     * @return bool Success status
     */
    public static function addToWhitelist(string $ip): bool
    {
        if (!Util::isDocker()) {
            return false;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            $key = self::REDIS_PREFIX . self::CATEGORY_WHITELIST;
            $result = $redis->sadd($key, $ip);
            
            if ($result) {
                SystemMessages::sysLogMsg(__CLASS__, "Added IP $ip to whitelist", LOG_INFO);
            }
            
            return (bool)$result;
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to whitelist IP $ip: " . $e->getMessage(), LOG_ERR);
            return false;
        }
    }
    
    /**
     * Remove IP from whitelist in Redis
     *
     * @param string $ip IP address or network to remove from whitelist
     * @return bool Success status
     */
    public static function removeFromWhitelist(string $ip): bool
    {
        if (!Util::isDocker()) {
            return false;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            $key = self::REDIS_PREFIX . self::CATEGORY_WHITELIST;
            $result = $redis->srem($key, $ip);
            
            if ($result) {
                SystemMessages::sysLogMsg(__CLASS__, "Removed IP $ip from whitelist", LOG_INFO);
            }
            
            return (bool)$result;
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to remove IP $ip from whitelist: " . $e->getMessage(), LOG_ERR);
            return false;
        }
    }
    
    /**
     * Get whitelist from Redis
     *
     * @return array List of whitelisted IPs
     */
    public static function getWhitelistFromRedis(): array
    {
        if (!Util::isDocker()) {
            return [];
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            $key = self::REDIS_PREFIX . self::CATEGORY_WHITELIST;
            $whitelist = $redis->smembers($key);
            
            return is_array($whitelist) ? $whitelist : [];
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to get whitelist: " . $e->getMessage(), LOG_ERR);
            return [];
        }
    }
    
    /**
     * Sync whitelist from database to Redis
     *
     * @return void
     */
    public static function syncWhitelistToRedis(): void
    {
        if (!Util::isDocker()) {
            return;
        }
        
        $whitelist = self::getNetworkFiltersWhitelist();
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            $key = self::REDIS_PREFIX . self::CATEGORY_WHITELIST;
            
            // Clear existing whitelist
            $redis->del($key);
            
            // Add all whitelist entries
            foreach ($whitelist as $ip) {
                $redis->sadd($key, $ip);
            }
            
            SystemMessages::sysLogMsg(__CLASS__, "Synced " . count($whitelist) . " whitelist entries to Redis", LOG_INFO);
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to sync whitelist: " . $e->getMessage(), LOG_ERR);
        }
    }
    
    /**
     * Check if an IP is whitelisted
     *
     * @param string $ip IP address to check
     * @return bool True if IP is whitelisted
     */
    public static function isIpWhitelisted(string $ip): bool
    {
        if (!Util::isDocker()) {
            // Fallback to database check for non-Docker
            $whitelist = self::getNetworkFiltersWhitelist();
            
            foreach ($whitelist as $allowedNetwork) {
                if (self::ipInNetwork($ip, $allowedNetwork)) {
                    return true;
                }
            }
            
            return false;
        }
        
        // Check Redis whitelist for Docker
        $whitelist = self::getWhitelistFromRedis();
        
        foreach ($whitelist as $allowedNetwork) {
            if (self::ipInNetwork($ip, $allowedNetwork)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if an IP is within a network range
     *
     * @param string $ip IP address to check
     * @param string $network Network in CIDR notation or single IP
     * @return bool True if IP is in network
     */
    private static function ipInNetwork(string $ip, string $network): bool
    {
        if ($ip === $network) {
            return true;
        }
        
        if (strpos($network, '/') === false) {
            return $ip === $network;
        }
        
        list($subnet, $mask) = explode('/', $network);
        
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && 
            filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $ip_long = ip2long($ip);
            $subnet_long = ip2long($subnet);
            $mask_long = -1 << (32 - (int)$mask);
            
            return ($ip_long & $mask_long) === ($subnet_long & $mask_long);
        }
        
        return false;
    }
    
    /**
     * Check if an IP address is a localhost address
     *
     * @param string $ip IP address or network to check
     * @return bool True if the address is localhost
     */
    private static function isLocalhostAddress(string $ip): bool
    {
        // List of localhost addresses and networks
        $localhostPatterns = [
            '127.0.0.1',
            '127.0.0.0/8',
            '::1',
            'localhost'
        ];
        
        // Direct match
        if (in_array($ip, $localhostPatterns)) {
            return true;
        }
        
        // Check if IP is in 127.0.0.0/8 network
        if (strpos($ip, '127.') === 0) {
            return true;
        }
        
        // Check if it's any loopback network
        if (preg_match('/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?$/', $ip)) {
            return true;
        }
        
        return false;
    }
}