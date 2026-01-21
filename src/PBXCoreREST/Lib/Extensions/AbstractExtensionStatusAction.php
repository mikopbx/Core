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

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Configs\GeoIP2Conf;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Injectable;
use Throwable;

/**
 * Abstract base class for extension status actions
 * Provides common functionality for PJSIP extension monitoring
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
abstract class AbstractExtensionStatusAction extends Injectable
{
    // Redis cache keys
    protected const CACHE_KEY_PREFIX = 'Extensions:StatusCache:';
    protected const HISTORY_KEY_PREFIX = 'Extensions:History:';
    protected const DAILY_STATS_KEY_PREFIX = 'Extensions:DailyStats:';
    protected const LAST_CHECK_KEY = 'Extensions:StatusMonitor:lastCheck';
    protected const LAST_CHANGE_KEY = 'Extensions:StatusMonitor:lastChange';
    protected const PROBLEM_KEY_PREFIX = 'Extensions:Problems:';
    
    // TTL settings (in seconds)
    protected const HISTORY_TTL_DAYS = 7;
    protected const STATS_TTL_DAYS = 30;
    protected const MAX_HISTORY_EVENTS = 200;
    
    // Extension status constants
    protected const STATUS_AVAILABLE = 'Available';
    protected const STATUS_UNAVAILABLE = 'Unavailable';
    protected const STATUS_UNKNOWN = 'Unknown';
    protected const STATUS_DISABLED = 'Disabled';

    /**
     * Get default SIP port from PbxSettings
     *
     * @return int SIP port from system settings
     */
    protected static function getDefaultSipPort(): int
    {
        return (int)PbxSettings::getValueByKey(PbxSettings::SIP_PORT);
    }
    
    /**
     * Get all SIP extensions that need monitoring
     */
    protected static function getMonitoredExtensions(): array
    {
        try {
            // Get all SIP extensions that are enabled
            $extensions = Extensions::find([
                'conditions' => 'type = :type:',
                'bind' => ['type' => Extensions::TYPE_SIP]
            ]);
            
            $result = [];
            foreach ($extensions as $extension) {
                if ($extension->Sip && $extension->Sip->disabled !== '1') {
                    $result[] = [
                        'extension' => $extension->number,
                        'callerid' => $extension->callerid ?? '',
                        'userid' => $extension->userid,
                        'sip_id' => $extension->Sip->uniqid,
                        'username' => $extension->Sip->username
                    ];
                }
            }
            
            return $result;
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to get monitored extensions: " . $e->getMessage(),
                LOG_ERR
            );
            return [];
        }
    }
    
    /**
     * Fetch extension statuses from Asterisk PJSIP
     */
    protected static function fetchExtensionStatuses(): ?array
    {
        try {
            $extensions = self::getMonitoredExtensions();
            if (empty($extensions)) {
                return [];
            }
            
            // Get PJSIP endpoints data
            $endpoints = self::getPjsipEndpoints();
            $contacts = self::getPjsipContacts();

            $statuses = [];
            
            foreach ($extensions as $ext) {
                $extensionNum = $ext['extension'];
                $endpointData = $endpoints[$extensionNum] ?? null;
                $contactDataArray = $contacts[$extensionNum] ?? null; // This is now an array of contacts
                
                // Determine status (supports multiple devices)
                $status = self::determineExtensionStatus($endpointData, $contactDataArray);
                
                $statuses[$extensionNum] = [
                    'extension' => $extensionNum,
                    'callerid' => $ext['callerid'],
                    'status' => $status['state'],
                    'devices' => $status['devices'] ?? [],
                    'rtt' => $status['best_rtt'] ?? null
                ];
            }
            
            return $statuses;
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to fetch extension statuses: " . $e->getMessage(),
                LOG_ERR
            );
            return null;
        }
    }
    
    /**
     * Get PJSIP endpoints information via AMI
     */
    private static function getPjsipEndpoints(): array
    {
        try {
            $am = Util::getAstManager('off');
            $endpoints = [];
            
            // Execute 'pjsip show endpoints' command
            $result = $am->sendRequestTimeout('Command', [
                'Command' => 'pjsip show endpoints'
            ]);
            
            if (isset($result['data'])) {
                $lines = explode("\n", $result['data']);
                foreach ($lines as $line) {
                    // Parse endpoint lines
                    // Format: "100                                                   100      In use    1 of 1"
                    if (preg_match('/^(\d+)\s+(\w+)\s+(.*?)(?:\s+(\d+)\s+of\s+(\d+))?$/', trim($line), $matches)) {
                        $endpoint = $matches[1];
                        $endpoints[$endpoint] = [
                            'endpoint' => $endpoint,
                            'aor' => $matches[2] ?? '',
                            'status' => trim($matches[3] ?? ''),
                            'in_use' => isset($matches[4]) ? (int)$matches[4] : 0,
                            'max' => isset($matches[5]) ? (int)$matches[5] : 0
                        ];
                    }
                }
            }
            
            return $endpoints;
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to get PJSIP endpoints: " . $e->getMessage(),
                LOG_WARNING
            );
            return [];
        }
    }
    
    /**
     * Get PJSIP contacts information via AMI
     */
    private static function getPjsipContacts(): array
    {
        try {
            $am = Util::getAstManager('off');
            $contacts = [];
            
            // Get all monitored extensions
            $extensions = self::getMonitoredExtensions();
            
            foreach ($extensions as $ext) {
                $extensionNum = $ext['extension'];

                try {
                    // Use getPjSipPeerContacts to get all contacts for this extension
                    $peerContacts = $am->getPjSipPeerContacts($extensionNum);

                    if (!empty($peerContacts)) {
                        // Initialize array for multiple contacts if not exists
                        if (!isset($contacts[$extensionNum])) {
                            $contacts[$extensionNum] = [];
                        }

                        // Process each contact for this extension
                        foreach ($peerContacts as $peerInfo) {
                            // Parse status from AMI response
                            $status = 'Unknown';
                            if (isset($peerInfo['Status'])) {
                                // Convert AMI status to our format
                                if ($peerInfo['Status'] === 'Reachable' || $peerInfo['Status'] === 'Available') {
                                    $status = 'Avail';
                                } elseif ($peerInfo['Status'] === 'Unreachable' || $peerInfo['Status'] === 'Unavailable') {
                                    $status = 'Unavail';
                                } elseif ($peerInfo['Status'] === 'NonQualified') {
                                    $status = 'NonQual';
                                } elseif ($peerInfo['Status'] === 'Unknown') {
                                    $status = 'Unknown';
                                }
                            }

                            // Parse RTT from microseconds to milliseconds
                            $rtt = null;
                            if (isset($peerInfo['RoundtripUsec']) && is_numeric($peerInfo['RoundtripUsec'])) {
                                $rtt = round((float)$peerInfo['RoundtripUsec'] / 1000, 2);
                            }

                            // Parse IP and port from URI (real source IP) with ViaAddress fallback
                            $ipAddress = '';
                            $defaultPort = self::getDefaultSipPort();
                            $port = $defaultPort;

                            // IMPORTANT: Always prefer URI over ViaAddress for correct NAT handling
                            // - URI contains the actual source IP address from which Asterisk received the packet
                            //   (e.g., 159.65.251.173 - public IP of NAT router)
                            // - ViaAddress contains the IP from SIP Contact header sent by the client
                            //   (e.g., 10.65.5.1 - private IP inside client's local network)
                            // For devices behind NAT, ViaAddress will show private IP which is incorrect for display
                            if (!empty($peerInfo['URI'])) {
                                // Parse URI: sip:user@192.168.107.1:46602 or sips:user@192.168.107.1:5061 (TLS)
                                // Supports both SIP and SIPS (SIP Secure/TLS)
                                if (preg_match('/sips?:[^@]+@([^:;]+)(?::(\d+))?/', $peerInfo['URI'], $matches)) {
                                    $ipAddress = $matches[1] ?? '';
                                    $port = isset($matches[2]) ? (int)$matches[2] : $defaultPort;
                                }
                            }

                            // Fallback to ViaAddress only if URI parsing failed
                            if (empty($ipAddress) && isset($peerInfo['ViaAddress'])) {
                                $parts = explode(':', $peerInfo['ViaAddress']);
                                $ipAddress = $parts[0] ?? '';
                                $port = isset($parts[1]) ? (int)$parts[1] : $defaultPort;
                            }

                            // Add contact to the array
                            $contacts[$extensionNum][] = [
                                'extension' => $extensionNum,
                                'username' => $extensionNum,
                                'ip_address' => $ipAddress,
                                'port' => $port,
                                'aor' => $peerInfo['AOR'] ?? $extensionNum,
                                'status' => $status,
                                'rtt' => $rtt,
                                'user_agent' => $peerInfo['UserAgent'] ?? '',
                                'reg_expire' => $peerInfo['RegExpire'] ?? null,
                                'call_id' => $peerInfo['CallID'] ?? '',
                                'is_webrtc' => $peerInfo['IsWebRTC'] ?? false
                            ];
                        }
                    }
                } catch (Throwable $e) {
                    // Skip extensions that fail to get status
                    continue;
                }
            }
            
            return $contacts;
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to get PJSIP contacts: " . $e->getMessage(),
                LOG_WARNING
            );
            return [];
        }
    }
    
    /**
     * Determine extension status based on PJSIP data (supports multiple contacts)
     */
    private static function determineExtensionStatus(?array $endpointData, ?array $contactDataArray): array
    {
        // If no contact data, extension is unavailable
        if (!$contactDataArray || empty($contactDataArray)) {
            return [
                'state' => self::STATUS_UNAVAILABLE,
                'reason' => 'No contact registration',
                'devices' => []
            ];
        }
        
        // Analyze all contacts for this extension
        $devices = [];
        $availableCount = 0;
        $unavailableCount = 0;
        $unknownCount = 0;
        $bestRtt = null;
        $userAgents = [];
        
        foreach ($contactDataArray as $contactData) {
            $contactStatus = $contactData['status'] ?? '';
            $deviceState = '';
            
            switch ($contactStatus) {
                case 'Avail':
                    $deviceState = self::STATUS_AVAILABLE;
                    $availableCount++;
                    break;
                case 'Unavail':
                    $deviceState = self::STATUS_UNAVAILABLE;
                    $unavailableCount++;
                    break;
                case 'NonQual':
                    // NonQualified means the device is registered but not being monitored
                    // Treat as available since the device IS registered
                    $deviceState = self::STATUS_AVAILABLE;
                    $availableCount++;
                    break;
                default:
                    $deviceState = self::STATUS_UNKNOWN;
                    $unknownCount++;
            }
            
            // Track best (lowest) RTT
            if ($contactData['rtt'] !== null && ($bestRtt === null || $contactData['rtt'] < $bestRtt)) {
                $bestRtt = $contactData['rtt'];
            }
            
            // Collect unique user agents
            if (!empty($contactData['user_agent']) && !in_array($contactData['user_agent'], $userAgents)) {
                $userAgents[] = $contactData['user_agent'];
            }

            // Get country information for device IP
            $ipAddress = $contactData['ip_address'] ?? '';
            $country = '';
            $countryName = '';
            if (!empty($ipAddress)) {
                $countryInfo = GeoIP2Conf::getCountryByIp($ipAddress);
                $country = $countryInfo['isoCode'];
                $countryName = $countryInfo['name'];
            }

            // Store device info (simplified)
            $devices[] = [
                'ip' => $ipAddress,
                'port' => $contactData['port'] ?? 5060,
                'user_agent' => $contactData['user_agent'] ?? '',
                'rtt' => $contactData['rtt'],
                'country' => $country,
                'countryName' => $countryName
            ];
        }
        
        // Determine overall extension status based on all devices
        // If at least one device is available, extension is available
        if ($availableCount > 0) {
            $overallState = self::STATUS_AVAILABLE;
        } elseif ($unavailableCount > 0) {
            $overallState = self::STATUS_UNAVAILABLE;
        } else {
            $overallState = self::STATUS_UNKNOWN;
        }
        
        $result = [
            'state' => $overallState,
            'devices' => $devices,
            'best_rtt' => $bestRtt
        ];
        
        return $result;
    }
    
    /**
     * Get last known statuses from cache
     */
    protected static function getLastStatusesFromCache($redis): array
    {
        try {
            $extensions = self::getMonitoredExtensions();
            $lastStatuses = [];
            
            foreach ($extensions as $ext) {
                $cacheKey = self::CACHE_KEY_PREFIX . $ext['extension'];
                $cached = $redis->get($cacheKey);
                if ($cached) {
                    $data = json_decode($cached, true);
                    if ($data) {
                        $lastStatuses[$ext['extension']] = $data;
                    }
                }
            }
            
            return $lastStatuses;
        } catch (Throwable $e) {
            return [];
        }
    }
    
    /**
     * Update status cache
     */
    protected static function updateStatusCache(array $statuses, $redis): void
    {
        try {
            foreach ($statuses as $extension => $status) {
                $cacheKey = self::CACHE_KEY_PREFIX . $extension;
                $redis->setex($cacheKey, 600, json_encode($status)); // 10 minutes TTL
            }
        } catch (Throwable $e) {
            // Ignore cache errors
        }
    }
}