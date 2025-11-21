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

use MikoPBX\Common\Models\Fail2BanRules;
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\Configs;
use MikoPBX\Core\System\System;
use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\Core\Utilities\SubnetCalculator;
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
    
    // Redis key prefixes and categories
    private const string REDIS_PREFIX = 'firewall:';
    private const string CATEGORY_HTTP = 'http';
    private const string CATEGORY_AMI = 'ami';
    private const string CATEGORY_SIP = 'sip';
    private const string CATEGORY_IAX = 'iax';
    private const string CATEGORY_WHITELIST = 'whitelist';
    private const string RATE_LIMIT_PREFIX = 'rate_limit:';
    
    /**
     * Get list of IPs to deny from NetworkFilters for specific categories
     *
     * @param array<string> $categories Traffic categories to filter (e.g., ['SIP', 'WEB'])
     * @return array<string> List of IP addresses/networks to deny
     */
    private static function getNetworkFiltersDenyList(array $categories = []): array
    {
        $denyList = [];
        
        if (empty($categories)) {
            // Get all NetworkFilters with deny rules
            $filters = NetworkFilters::find([
                'conditions' => 'deny IS NOT NULL AND deny != :empty: AND deny != :zero_network:',
                'bind' => [
                    'empty' => '',
                    'zero_network' => '0.0.0.0/0'
                ]
            ]);
            
            /** @var NetworkFilters[] $filters */
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
                    'NF.permit',
                ],
                'conditions' => 'NF.permit IS NOT NULL AND NF.permit != :empty: ' .
                               'AND NF.permit != :zero_network: ' .
                               'AND FR.category IN ({categories:array}) ' .
                               'AND FR.action = :action:',
                'bind' => [
                    'empty' => '',
                    'zero_network' => '0.0.0.0/0',
                    'categories' => $categories,
                    'action' => 'block'
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
                if (!empty($row->permit)) {
                    $denyIps = explode(',', $row->permit);
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
     * Get list of permitted networks for specific categories
     *
     * @param array<string> $categories Traffic categories to filter (e.g., ['WEB'])
     * @return array<string> List of IP addresses/networks that are permitted
     */
    private static function getNetworkFiltersPermitList(array $categories = []): array
    {
        $permitList = [];
        
        // Get NetworkFilters for specific categories with 'allow' action
        $parameters = [
            'models' => [
                'NF' => NetworkFilters::class,
            ],
            'columns' => [
                'NF.permit',
            ],
            'conditions' => 'NF.permit IS NOT NULL AND NF.permit != :empty: ' .
                           'AND NF.permit != :zero_network: ' .
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
            if (!empty($row->permit)) {
                $permitIps = explode(',', $row->permit);
                foreach ($permitIps as $ip) {
                    $ip = trim($ip);
                    // Skip 0.0.0.0/0 as it would permit everyone
                    if (!empty($ip) && !in_array($ip, $permitList) && $ip !== '0.0.0.0/0' && $ip !== '0.0.0.0') {
                        $permitList[] = $ip;
                    }
                }
            }
        }
        
        return $permitList;
    }
    
    /**
     * Get list of IPs that should never be blocked (whitelist)
     *
     * @return array<string> List of whitelisted IP addresses/networks
     */
    private static function getNetworkFiltersWhitelist(): array
    {
        $whitelist = [];
        
        // Get NetworkFilters marked as newer_block_ip
        $filters = NetworkFilters::find([
            'conditions' => 'newer_block_ip = :newer_block:',
            'bind' => ['newer_block' => '1']
        ]);
        
        /** @var NetworkFilters[] $filters */
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
        
        // Get whitelist from Fail2BanRules
        $fail2banRule = Fail2BanRules::findFirst('id = 1');
        if ($fail2banRule && !empty($fail2banRule->whitelist)) {
            $fail2banWhitelist = explode(' ', $fail2banRule->whitelist);
            foreach ($fail2banWhitelist as $ip) {
                $ip = trim($ip);
                if (!empty($ip) && !in_array($ip, $whitelist) && $ip !== '0.0.0.0/0' && $ip !== '0.0.0.0') {
                    $whitelist[] = $ip;
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
        if (!System::isDocker()) {
            return;
        }
        
        // Check if firewall is enabled
        $firewallEnabled = PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED);
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
        $content .= "; This file is automatically generated from database\n";
        $content .= "; Last updated: " . date('Y-m-d H:i:s') . "\n\n";
        
        // Always permit localhost first
        $content .= "; Always allow localhost access\n";
        $content .= "permit=127.0.0.1/255.255.255.255\n";
        $content .= "permit=::1\n\n";
        
        // Get deny list from database for SIP and AMI categories
        $denyList = self::getNetworkFiltersDenyList(['SIP', 'AMI']);
        
        if (!empty($denyList)) {
            $content .= "; Deny rules from database\n";
            // Generate ACL rules
            foreach ($denyList as $ip) {
                // Determine if it's a network or single IP
                if (strpos($ip, '/') !== false) {
                    $content .= "deny=$ip\n";
                } else {
                    // Asterisk accepts single IPs without netmask for both protocols
                    $isIpv6 = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6);
                    if ($isIpv6) {
                        $content .= "deny=$ip\n";
                    } else {
                        $content .= "deny=$ip/255.255.255.255\n";
                    }
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
        $managerContent .= "; This file is automatically generated from database\n";
        $managerContent .= "; Last updated: " . date('Y-m-d H:i:s') . "\n\n";
        
        // Get deny list for AMI
        $amiDenyList = self::getNetworkFiltersDenyList(['AMI']);
        
        if (!empty($amiDenyList)) {
            foreach ($amiDenyList as $ip) {
                // Determine if it's a network or single IP
                if (strpos($ip, '/') !== false) {
                    $managerContent .= "deny=$ip\n";
                } else {
                    // Asterisk Manager accepts single IPs without netmask for both protocols
                    $isIpv6 = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6);
                    if ($isIpv6) {
                        $managerContent .= "deny=$ip\n";
                    } else {
                        $managerContent .= "deny=$ip/255.255.255.255\n";
                    }
                }
            }
        }
        
        $managerDenyFile = $dir . '/manager_network_filters_deny.conf';
        file_put_contents($managerDenyFile, $managerContent);
        
        // Also generate deny rules for iax.conf
        $iaxContent = "; NetworkFilters deny rules for iax.conf - DO NOT EDIT MANUALLY\n";
        $iaxContent .= "; This file is automatically generated from database\n";
        $iaxContent .= "; Last updated: " . date('Y-m-d H:i:s') . "\n\n";
        
        // Always permit localhost first
        $iaxContent .= "; Always allow localhost access\n";
        $iaxContent .= "permit=127.0.0.1/255.255.255.255\n";
        $iaxContent .= "permit=::1\n\n";
        
        // Get deny list from database for IAX category
        $iaxDenyList = self::getNetworkFiltersDenyList(['IAX']);
        
        if (!empty($iaxDenyList)) {
            $iaxContent .= "; Deny rules from database\n";
            foreach ($iaxDenyList as $ip) {
                // Determine if it's a network or single IP
                if (strpos($ip, '/') !== false) {
                    $iaxContent .= "deny=$ip\n";
                } else {
                    // Asterisk IAX accepts single IPs without netmask for both protocols
                    $isIpv6 = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6);
                    if ($isIpv6) {
                        $iaxContent .= "deny=$ip\n";
                    } else {
                        $iaxContent .= "deny=$ip/255.255.255.255\n";
                    }
                }
            }
        } else {
            $iaxContent .= "; No deny rules configured\n";
        }
        
        $iaxDenyFile = $dir . '/network_filters_deny_iax_acl.conf';
        file_put_contents($iaxDenyFile, $iaxContent);
    }
    
    
    /**
     * Update all Docker network filters configurations
     *
     * @return void
     */
    public static function updateAllConfigurations(): void
    {
        if (!System::isDocker()) {
            return;
        }
        
        SystemMessages::sysLogMsg(__CLASS__, 'Updating Docker network filters configurations', LOG_INFO);
        
        // Sync whitelist to Redis
        self::syncWhitelistToRedis();
        
        // Sync NetworkFilters deny rules to Redis
        self::syncNetworkFiltersDenyToRedis();
        
        // Sync NetworkFilters permit rules to Redis (for WEB category)
        self::syncNetworkFiltersPermitToRedis();
        
        // Generate Asterisk ACL
        self::generateAsteriskNetworkFiltersDenyAcl();
        
        // Generate unified fail2ban ACL for all protocols
        Configs\Fail2BanConf::generateUnifiedFail2BanAcl();
        
        if (!System::isBooting()) {
            // Reload Asterisk PJSIP to apply new ACL rules
            WorkerModelsEvents::invokeAction(ReloadPJSIPAction::class);
        }
    }
    
    /**
     * Sync NetworkFilters deny rules to Redis
     *
     * @return void
     */
    private static function syncNetworkFiltersDenyToRedis(): void
    {
        if (!System::isDocker()) {
            return;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            // Map categories to Redis categories
            $categoryMap = [
                'WEB' => self::CATEGORY_HTTP,
                'SIP' => self::CATEGORY_SIP,
                'AMI' => self::CATEGORY_AMI,
                'IAX' => self::CATEGORY_IAX
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
     * Sync NetworkFilters permit rules to Redis (for categories that need allow-only logic like WEB)
     *
     * @return void
     */
    private static function syncNetworkFiltersPermitToRedis(): void
    {
        if (!System::isDocker()) {
            return;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            // For WEB category, we need to sync permit rules
            $permitList = self::getNetworkFiltersPermitList(['WEB']);
            
            // Clear existing permit entries for HTTP
            $pattern = self::REDIS_PREFIX . 'permit:http:*';
            $keys = $redis->keys($pattern);
            foreach ($keys as $key) {
                $redis->del($key);
            }
            
            // Add new permit entries
            foreach ($permitList as $network) {
                $key = self::REDIS_PREFIX . 'permit:http:' . $network;
                $redis->set($key, '1');
            }
            
            SystemMessages::sysLogMsg(__CLASS__, "Synced " . count($permitList) . " permit rules for WEB category to Redis", LOG_INFO);
            
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to sync permit rules to Redis: " . $e->getMessage(), LOG_ERR);
        }
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
        if (!System::isDocker()) {
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
        if (!System::isDocker()) {
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
     * @return array<string> List of blocked IPs
     */
    public static function getBlockedIps(string $category): array
    {
        if (!System::isDocker()) {
            return [];
        }
        
        $blockedIps = [];
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);

            $pattern = self::REDIS_PREFIX . $category . ':*';
            $keys = $redis->keys($pattern);

            /** @var string $key */
            foreach ($keys as $key) {
                // Extract IP from key - remove both Redis client prefix and our prefix
                // Redis client adds '_PH_REDIS_CLIENT:' prefix to all keys
                $keyWithoutClientPrefix = str_replace(RedisClientProvider::CACHE_PREFIX, '', $key);
                $ip = str_replace(self::REDIS_PREFIX . $category . ':', '', $keyWithoutClientPrefix);
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
     * Get whitelist from Redis
     *
     * @return array<string> List of whitelisted IPs
     */
    private static function getWhitelistFromRedis(): array
    {
        if (!System::isDocker()) {
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
    private static function syncWhitelistToRedis(): void
    {
        if (!System::isDocker()) {
            return;
        }
        
        $whitelist = self::getNetworkFiltersWhitelist();
        
        // Always add localhost
        $whitelist[] = '127.0.0.1';
        $whitelist[] = '::1';
        
        // Add Docker network addresses
        $dockerWhitelist = self::getDockerNetworkWhitelist();
        $whitelist = array_merge($whitelist, $dockerWhitelist);
        
        // Remove duplicates
        $whitelist = array_unique(array_filter($whitelist));
        
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
            
            SystemMessages::sysLogMsg(__CLASS__, 
                sprintf("Synced %d whitelist entries to Redis (Docker: %s)", 
                    count($whitelist), 
                    implode(', ', $dockerWhitelist)
                ), 
                LOG_INFO
            );
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
        if (!System::isDocker()) {
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
     * Supports both IPv4 and IPv6 CIDR notation
     *
     * @param string $ip IP address to check
     * @param string $network Network in CIDR notation or single IP
     * @return bool True if IP is in network
     */
    private static function ipInNetwork(string $ip, string $network): bool
    {
        // Exact match
        if ($ip === $network) {
            return true;
        }

        // No CIDR notation - must be exact match
        if (strpos($network, '/') === false) {
            return $ip === $network;
        }

        // Use IpAddressHelper for dual-stack CIDR matching
        // Supports both IPv4 (192.168.1.0/24) and IPv6 (2001:db8::/64)
        return IpAddressHelper::ipInNetwork($ip, $network);
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
    
    /**
     * Get Docker network information for whitelist
     *
     * @return array<string> Network addresses to whitelist for Docker environment
     */
    private static function getDockerNetworkWhitelist(): array
    {
        if (!System::isDocker()) {
            return [];
        }
        
        $whitelist = [];
        
        // Use existing Network class to get settings
        $network = new Network();
        $settings = $network->getGeneralNetSettings();
        
        // Process main internet interface
        foreach ($settings as $interface) {
            if ($interface['internet'] === '1' && $interface['disabled'] === '0') {
                // Add gateway
                if (!empty($interface['gateway'])) {
                    $whitelist[] = $interface['gateway'];
                    
                    // Add .0 address (important for nginx logs in Docker!)
                    $gatewayParts = explode('.', $interface['gateway']);
                    if (count($gatewayParts) === 4) {
                        $gatewayParts[3] = '0';
                        $whitelist[] = implode('.', $gatewayParts);
                    }
                }
                
                // Add subnet in CIDR format
                if (!empty($interface['ipaddr']) && !empty($interface['subnet'])) {
                    // Calculate network address
                    $subnet = is_numeric($interface['subnet']) 
                        ? (int)$interface['subnet'] 
                        : $network->netMaskToCidr($interface['subnet']);
                    
                    try {
                        $calculator = new SubnetCalculator($interface['ipaddr'], (string)$subnet);
                        $whitelist[] = $calculator->getNetworkPortion() . '/' . $subnet;
                    } catch (\Throwable $e) {
                        SystemMessages::sysLogMsg(__CLASS__, 
                            "Failed to calculate network CIDR for {$interface['ipaddr']}/{$subnet}: " . $e->getMessage(), 
                            LOG_WARNING
                        );
                    }
                }
                
                // Add interface IP itself
                if (!empty($interface['ipaddr'])) {
                    $whitelist[] = $interface['ipaddr'];
                }
                
                break; // Only process main internet interface
            }
        }
        
        return array_unique(array_filter($whitelist));
    }
    
    /**
     * Add IP to rate limit block list
     *
     * @param string $ip IP address to block for rate limiting
     * @param int $duration Block duration in seconds
     * @return bool Success status
     */
    public static function blockIPForRateLimit(string $ip, int $duration = 300): bool
    {
        if (!System::isDocker() && PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED) !== '1') {
            return false;
        }
        
        // Check if IP is whitelisted
        if (self::isLocalhostAddress($ip) || self::isIpWhitelisted($ip)) {
            SystemMessages::sysLogMsg(__CLASS__, "Cannot rate limit whitelisted IP: $ip", LOG_WARNING);
            return false;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            $key = self::RATE_LIMIT_PREFIX . $ip;
            $result = $redis->setex($key, $duration, '1');
            
            if ($result) {
                SystemMessages::sysLogMsg(__CLASS__, "Rate limited IP $ip for $duration seconds", LOG_INFO);
            }
            
            return (bool)$result;
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to rate limit IP $ip: " . $e->getMessage(), LOG_ERR);
            return false;
        }
    }
    
    /**
     * Remove IP from rate limit block list
     *
     * @param string $ip IP address to unblock
     * @return bool Success status
     */
    public static function unblockIPFromRateLimit(string $ip): bool
    {
        if (!System::isDocker() && PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED) !== '1') {
            return false;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->getShared(RedisClientProvider::SERVICE_NAME);
            
            $key = self::RATE_LIMIT_PREFIX . $ip;
            $result = $redis->del($key);
            
            if ($result) {
                SystemMessages::sysLogMsg(__CLASS__, "Removed rate limit for IP $ip", LOG_INFO);
            }
            
            return (bool)$result;
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to remove rate limit for IP $ip: " . $e->getMessage(), LOG_ERR);
            return false;
        }
    }
    
    /**
     * Get rate limit settings
     *
     * @return array{enabled: string, requests_per_minute: int, requests_per_minute_auth: int, block_time: int, security_mode: string}
     */
    public static function getRateLimitSettings(): array
    {
        return [
            'enabled' => PbxSettings::getValueByKey('rate_limit_enabled') ?? '1',
            'requests_per_minute' => intval(PbxSettings::getValueByKey('rate_limit_per_minute') ?? 60),
            'requests_per_minute_auth' => intval(PbxSettings::getValueByKey('rate_limit_per_minute_auth') ?? 300),
            'block_time' => intval(PbxSettings::getValueByKey('rate_limit_block_time') ?? 300),
            'security_mode' => PbxSettings::getValueByKey('security_mode') ?? 'balanced'
        ];
    }
}