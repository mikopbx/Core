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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use Throwable;

/**
 * Abstract base class for provider status operations
 * 
 * Contains common functionality for fetching, enriching, and caching provider statuses
 * from Asterisk AMI. Provides unified data structures and consistent behavior across
 * all provider status actions.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Providers
 */
abstract class AbstractProviderStatusAction extends Injectable
{
    // Cache keys
    protected const CACHE_KEY = 'Workers:WorkerProviderStatusMonitor:statusCache';
    protected const LAST_CHANGE_KEY = 'Workers:WorkerProviderStatusMonitor:lastChange';
    protected const LAST_CHECK_KEY = 'Workers:WorkerProviderStatusMonitor:lastCheck';
    
    // Storage keys for enhanced features
    protected const STATUS_KEY_PREFIX = 'Workers:ProviderMonitor:status:';
    protected const HISTORY_KEY_PREFIX = 'Workers:ProviderMonitor:history:';
    protected const DAILY_STATS_KEY_PREFIX = 'Workers:ProviderMonitor:daily:';
    protected const PROBLEM_KEY_PREFIX = 'Workers:ProviderMonitor:problem:';
    
    // History and statistics configuration
    protected const MAX_HISTORY_EVENTS = 1000;
    protected const HISTORY_TTL_DAYS = 30;
    protected const STATS_TTL_DAYS = 30;

    /**
     * Get SIP provider statuses with RTT from Asterisk
     */
    protected static function getSipProviderStatuses(): ?array
    {
        try {
            $statuses = [];
            
            // Get all SIP providers from database
            $sipProvidersResult = Sip::find("type = 'friend'");
            if (!$sipProvidersResult) {
                return [];
            }
            
            // Get Asterisk Manager without events
            $am = Util::getAstManager('off');
            
            // Get PJSIP registrations
            $registrations = $am->getPjSipRegistry();
            $registryMap = [];
            foreach ($registrations as $reg) {
                $key = $reg['username'] . '@' . $reg['host'];
                $registryMap[$key] = $reg;
            }
            
            // Get PJSIP peers with endpoint status
            $peers = $am->getPjSipPeers();
            $peerMap = [];
            foreach ($peers as $peer) {
                $peerMap[$peer['id']] = $peer;
            }
            
            // Get PJSIP contacts for RTT information
            // Since AMI PJSIPShowContacts seems broken, use CLI command as fallback
            $contactsMap = [];
            try {
                // First try the proper AMI command
                $contactsResponse = $am->sendRequestTimeout('PJSIPShowContacts', []);
                
                // Check for ContactList events
                if (isset($contactsResponse['data']['ContactList'])) {
                    foreach ($contactsResponse['data']['ContactList'] as $contact) {
                        if (isset($contact['ObjectName'])) {
                            // Extract provider ID from ObjectName (format: SIP-TRUNK-XXXXX/sip:...)
                            $aorParts = explode('/', $contact['ObjectName']);
                            $providerId = $aorParts[0];
                            
                            // Store RTT in milliseconds if available
                            if (isset($contact['RoundtripUsec']) && is_numeric($contact['RoundtripUsec'])) {
                                $contactsMap[$providerId] = [
                                    'rtt' => (int)round($contact['RoundtripUsec'] / 1000), // Convert microseconds to milliseconds, ensure int
                                    'status' => $contact['Status'] ?? 'Unknown'
                                ];
                            }
                        }
                    }
                }
                
                // If no contacts found via AMI, try direct AMI connection as last resort
                if (empty($contactsMap)) {
                    // Direct AMI connection to get CLI output
                    try {
                        $contactsMap = self::getContactsViaDirectAMI();
                    } catch (Throwable $e) {
                        SystemMessages::sysLogMsg(
                            __CLASS__,
                            "Could not get contacts via direct AMI: " . $e->getMessage(),
                            LOG_DEBUG
                        );
                    }
                }
            } catch (Throwable $e) {
                // Contacts might not be available if no providers are registered
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Could not get PJSIP contacts: " . $e->getMessage(),
                    LOG_DEBUG
                );
            }
            
            // Process each provider
            /** @var Sip $provider */
            foreach ($sipProvidersResult as $provider) {
                if (empty($provider->uniqid)) {
                    continue;
                }
                
                $providerData = [
                    'uniqid' => $provider->uniqid,
                    'type' => 'sip',
                    'username' => $provider->username,
                    'host' => $provider->host,
                    'disabled' => $provider->disabled === '1',
                    'description' => $provider->description ?? ''
                ];
                
                // Check if disabled
                if ($providerData['disabled']) {
                    $statuses[$provider->uniqid] = self::buildStatusData($providerData, 'OFF', null, []);
                    continue;
                }
                
                // Get registration status
                $regKey = $provider->username . '@' . $provider->host;
                $registration = $registryMap[$regKey] ?? null;
                
                // Get peer endpoint status
                $peer = $peerMap[$provider->uniqid] ?? null;
                
                // Initialize state, RTT and additional details
                $rtt = null;
                $state = 'UNKNOWN';
                $additionalDetails = [];
                
                if ($registration) {
                    $state = self::normalizeSipState($registration['state'] ?? 'UNKNOWN');
                    
                    // Add registration details
                    if (isset($registration['refresh'])) {
                        $additionalDetails['refreshInterval'] = $registration['refresh'];
                    }
                    if ($state === 'rejected' && isset($registration['reason'])) {
                        $additionalDetails['rejectionReason'] = $registration['reason'];
                    }
                }
                
                // Get RTT from contacts map if available
                if (isset($contactsMap[$provider->uniqid])) {
                    $rtt = $contactsMap[$provider->uniqid]['rtt'];
                    $additionalDetails['contactStatus'] = $contactsMap[$provider->uniqid]['status'] ?? '';
                }
                
                // For non-registering providers, use peer state
                if (!$registration && $peer) {
                    $state = self::normalizeSipState($peer['state'] ?? 'UNKNOWN');
                }
                
                // Add registration IP if available
                if ($state === 'registered' && $registration) {
                    if (isset($registration['address'])) {
                        $additionalDetails['registrationDetails'] = "Registered from {$registration['address']}";
                    }
                }
                
                $statuses[$provider->uniqid] = self::buildStatusData($providerData, $state, $rtt, $additionalDetails);
            }
            
            return $statuses;
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Error getting SIP provider statuses: " . $e->getMessage(),
                LOG_ERR
            );
            return null;
        }
    }
    
    /**
     * Get contacts via direct AMI connection when standard methods fail
     * This is a fallback method for Asterisk 20 where PJSIPShowContacts seems broken
     */
    private static function getContactsViaDirectAMI(): array
    {
        $contactsMap = [];
        
        // Connect directly to AMI
        $socket = @fsockopen('127.0.0.1', 5038, $errno, $errstr, 2);
        if (!$socket) {
            throw new \Exception("Failed to connect to AMI: $errstr");
        }
        
        // Read welcome
        fgets($socket);
        
        // Login with phpagi credentials
        fwrite($socket, "Action: Login\r\nUsername: phpagi\r\nSecret: phpagi\r\n\r\n");
        
        // Read login response
        $timeout = time() + 2;
        $loggedIn = false;
        while (time() < $timeout && $line = fgets($socket)) {
            if (strpos($line, 'Response: Success') !== false) {
                $loggedIn = true;
            }
            if (trim($line) === '') break;
        }
        
        if (!$loggedIn) {
            fclose($socket);
            throw new \Exception("Failed to login to AMI");
        }
        
        // Send CLI command
        fwrite($socket, "Action: Command\r\nCommand: pjsip show contacts\r\n\r\n");
        
        // Read response
        $output = '';
        $timeout = time() + 2;
        $inOutput = false;
        while (time() < $timeout && $line = fgets($socket)) {
            if (strpos($line, 'Output:') === 0) {
                $inOutput = true;
                $output .= substr($line, 7); // Remove "Output: " prefix
            } elseif ($inOutput && trim($line) === '') {
                break; // End of output
            } elseif ($inOutput) {
                $output .= $line;
            }
        }
        
        // Parse output
        $lines = explode("\n", $output);
        foreach ($lines as $line) {
            // Look for SIP-TRUNK contacts
            // Format: Contact:  SIP-TRUNK-A0441C96/sip:202@192.168.117.5:5060  28334ac1c0 Avail        12.978
            if (strpos($line, 'SIP-TRUNK-') !== false && strpos($line, 'Contact:') !== false) {
                if (preg_match('/SIP-TRUNK-[A-Z0-9]+/', $line, $providerMatch)) {
                    $providerId = $providerMatch[0];
                    
                    // Extract status and RTT
                    if (preg_match('/([a-f0-9]{10})\s+(\w+)\s+([\d\.]+|nan)\s*$/', $line, $matches)) {
                        $status = $matches[2];
                        $rttValue = $matches[3];
                        
                        if ($rttValue !== 'nan' && is_numeric($rttValue)) {
                            $contactsMap[$providerId] = [
                                'rtt' => (int)round((float)$rttValue), // Already in milliseconds, convert to int
                                'status' => $status
                            ];
                        }
                    }
                }
            }
        }
        
        // Logout
        fwrite($socket, "Action: Logoff\r\n\r\n");
        fclose($socket);
        
        return $contactsMap;
    }
    
    /**
     * Get IAX provider statuses with RTT from Asterisk
     */
    protected static function getIaxProviderStatuses(): ?array
    {
        try {
            $statuses = [];
            
            // Get all IAX providers from database
            $iaxProvidersResult = Iax::find();
            if (!$iaxProvidersResult) {
                return [];
            }
            
            // Only fetch AMI data if there are enabled providers
            $hasEnabled = false;
            /** @var Iax $provider */
            foreach ($iaxProvidersResult as $provider) {
                if ($provider->disabled !== '1') {
                    $hasEnabled = true;
                    break;
                }
            }
            
            $registrations = [];
            $peers = [];
            
            if ($hasEnabled) {
                // Get Asterisk Manager without events
                $am = Util::getAstManager('off');
                
                // Get IAX2 registrations
                $registrations = $am->IAXregistry();
                
                // Get IAX2 peer list with status
                $peers = $am->IAXpeerlist();
            }
            
            // Create maps for quick lookup
            $regMap = [];
            foreach ($registrations as $reg) {
                $key = $reg['Username'] . '@' . $reg['Addr'];
                $regMap[$key] = $reg;
            }
            
            $peerMap = [];
            foreach ($peers as $peer) {
                $peerMap[$peer['ObjectName']] = $peer;
            }
            
            // Process each provider
            /** @var Iax $provider */
            foreach ($iaxProvidersResult as $provider) {
                if (empty($provider->uniqid)) {
                    continue;
                }
                
                $providerData = [
                    'uniqid' => $provider->uniqid,
                    'type' => 'iax',
                    'username' => trim($provider->username),
                    'host' => trim($provider->host),
                    'disabled' => $provider->disabled === '1',
                    'noregister' => $provider->noregister === '1',
                    'description' => $provider->description ?? ''
                ];
                
                // Check if disabled
                if ($providerData['disabled']) {
                    $statuses[$provider->uniqid] = self::buildStatusData($providerData, 'OFF', null, []);
                    continue;
                }
                
                // Get peer status
                $peer = $peerMap[$provider->uniqid] ?? null;
                $rtt = null;
                $state = 'UNKNOWN';
                $additionalDetails = [];
                
                if ($providerData['noregister']) {
                    // Provider without registration - check peer status
                    if ($peer) {
                        $statusParts = explode(' ', $peer['Status']);
                        $state = self::normalizeIaxState($statusParts[0]);
                        
                        // Extract RTT from status like "OK (15 ms)"
                        if (isset($statusParts[1])) {
                            $rttString = str_replace(['(', ')', 'ms'], '', $statusParts[1]);
                            $rtt = is_numeric($rttString) ? (int)$rttString : null;
                        }
                        
                        // Add peer address if available
                        if (isset($peer['IPaddress']) && $peer['IPaddress'] !== '(null)') {
                            $additionalDetails['peerAddress'] = $peer['IPaddress'];
                        }
                    }
                } else {
                    // Provider with registration
                    $regKey = $providerData['username'] . '@' . $providerData['host'];
                    $registration = $regMap[$regKey] ?? null;
                    
                    if ($registration) {
                        $state = self::normalizeIaxRegState($registration['State']);
                        
                        // Add registration details
                        if ($state === 'registered' && isset($registration['Addr'])) {
                            $additionalDetails['registrationDetails'] = "Registered with {$registration['Addr']}";
                        }
                        if (isset($registration['Refresh'])) {
                            $additionalDetails['refreshInterval'] = $registration['Refresh'];
                        }
                    } else {
                        $state = 'unregistered';
                    }
                }
                
                $statuses[$provider->uniqid] = self::buildStatusData($providerData, $state, $rtt, $additionalDetails);
            }
            
            return $statuses;
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Error getting IAX provider statuses: " . $e->getMessage(),
                LOG_ERR
            );
            return null;
        }
    }

    /**
     * Build complete status data for a provider
     */
    protected static function buildStatusData(array $provider, string $state, ?int $rtt, array $additionalDetails = []): array
    {
        $di = Di::getDefault();
        $redis = $di->get(RedisClientProvider::SERVICE_NAME);
        
        $previousStatus = self::getPreviousStatus($provider['uniqid'], $redis);
        $displayProps = self::getStateDisplayProperties($state, $rtt);
        
        $now = time();
        $stateChanged = $state !== ($previousStatus['state'] ?? '');
        
        // Calculate state duration in seconds
        $stateDurationSeconds = self::calculateStateDurationSeconds($provider['uniqid'], $state, $stateChanged, $previousStatus);
        
        // Build base status data
        $statusData = [
            'id' => $provider['uniqid'],  // Use uniqid as id for API consistency
            'type' => $provider['type'],
            'state' => $state,
            'stateText' => $displayProps['text'],
            'stateColor' => $displayProps['color'],
            'stateDescription' => $displayProps['description'],
            'host' => $provider['host'] ?? '',
            'username' => $provider['username'] ?? '',
            'description' => $provider['description'] ?? '',
            'lastUpdate' => $now,
            'lastChange' => $stateChanged ? $now : ($previousStatus['lastChange'] ?? $now),
            'rtt' => $rtt,
            'stateDuration' => $stateDurationSeconds,  // Duration in seconds
            'stateStartTime' => $stateChanged ? $now : ($previousStatus['stateStartTime'] ?? $now)
        ];
        
        // Merge additional details for history tracking
        $statusData = array_merge($statusData, $additionalDetails);
        
        // Add success/failure specific duration fields
        if (self::isSuccessState($state)) {
            $statusData['successDuration'] = $stateDurationSeconds;
            if ($stateChanged) {
                self::trackLastSuccess($provider['uniqid'], $now, $redis);
            }
        } else if (self::isFailureState($state)) {
            $statusData['failureDuration'] = $stateDurationSeconds;
            $lastSuccessInfo = self::getLastSuccessInfo($provider['uniqid'], $redis);
            if ($lastSuccessInfo) {
                $statusData['lastSuccessTime'] = $lastSuccessInfo['timestamp'];
                $statusData['timeSinceLastSuccess'] = $now - $lastSuccessInfo['timestamp']; // Duration in seconds
            }
        }
        
        // Store status for next comparison
        self::updateProviderStatus($provider['uniqid'], $statusData, $redis);
        
        return $statusData;
    }

    /**
     * Find provider in database by ID
     */
    protected static function findProvider(string $providerId): ?array
    {
        // Check SIP providers
        $sipProvider = Sip::findFirst([
            'conditions' => 'uniqid = :id:',
            'bind' => ['id' => $providerId]
        ]);
        
        if ($sipProvider) {
            return [
                'type' => 'sip',
                'model' => $sipProvider,
                'description' => $sipProvider->description,
                'host' => $sipProvider->host,
                'username' => $sipProvider->username,
                'disabled' => $sipProvider->disabled === '1'
            ];
        }
        
        // Check IAX providers
        $iaxProvider = Iax::findFirst([
            'conditions' => 'uniqid = :id:',
            'bind' => ['id' => $providerId]
        ]);
        
        if ($iaxProvider) {
            return [
                'type' => 'iax',
                'model' => $iaxProvider,
                'description' => $iaxProvider->description,
                'host' => $iaxProvider->host,
                'username' => $iaxProvider->username,
                'disabled' => $iaxProvider->disabled === '1',
                'noregister' => $iaxProvider->noregister === '1'
            ];
        }
        
        return null;
    }

    /**
     * Get last known statuses from cache
     */
    protected static function getLastStatusesFromCache($redis): array
    {
        try {
            $cachedDataJson = $redis->get(self::CACHE_KEY);
            if ($cachedDataJson !== null) {
                $cachedData = json_decode($cachedDataJson, true);
                if ($cachedData && isset($cachedData['statuses'])) {
                    return $cachedData['statuses'];
                }
            }
        } catch (Throwable $e) {
            // Ignore cache errors
        }
        return [];
    }

    /**
     * Try to get status from worker cache
     */
    protected static function getStatusFromCache(string $providerId, $redis): ?array
    {
        try {
            $cachedDataJson = $redis->get(self::CACHE_KEY);
            
            if ($cachedDataJson) {
                $cachedData = json_decode($cachedDataJson, true);
                if ($cachedData && isset($cachedData['statuses'])) {
                    // Look in SIP providers
                    if (isset($cachedData['statuses']['sip'][$providerId])) {
                        return $cachedData['statuses']['sip'][$providerId];
                    }
                    // Look in IAX providers
                    if (isset($cachedData['statuses']['iax'][$providerId])) {
                        return $cachedData['statuses']['iax'][$providerId];
                    }
                }
            }
        } catch (Throwable $e) {
            // Ignore cache errors
        }
        
        return null;
    }

    /**
     * Update status cache
     */
    protected static function updateStatusCache(array $statuses, $redis): void
    {
        try {
            $cacheData = [
                'statuses' => $statuses,
                'last_update' => time(),
                'source' => static::class
            ];
            
            $redis->setex(self::CACHE_KEY, 300, json_encode($cacheData));
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Failed to update status cache: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }

    // State normalization methods

    protected static function normalizeSipState(string $state): string
    {
        $state = strtoupper($state);
        
        if (strpos($state, 'REGISTERED') !== false) {
            return 'registered';
        } elseif (strpos($state, 'UNREACHABLE') !== false) {
            return 'unreachable';
        } elseif (strpos($state, 'LAGGED') !== false) {
            return 'lagged';
        } elseif (strpos($state, 'REJECTED') !== false) {
            return 'rejected';
        } elseif ($state === 'OK') {
            return 'OK';
        } else {
            return 'unregistered';
        }
    }
    
    protected static function normalizeIaxState(string $state): string
    {
        $state = strtoupper($state);
        
        if ($state === 'OK' || $state === 'REACHABLE') {
            return 'OK';
        } elseif ($state === 'UNREACHABLE') {
            return 'unreachable';
        } elseif ($state === 'LAGGED') {
            return 'lagged';
        } else {
            return 'UNKNOWN';
        }
    }
    
    protected static function normalizeIaxRegState(string $state): string
    {
        $state = strtoupper($state);
        
        if ($state === 'REGISTERED') {
            return 'registered';
        } elseif ($state === 'REJECTED') {
            return 'rejected';
        } else {
            return 'unregistered';
        }
    }

    // Display and formatting methods

    protected static function getStateDisplayProperties(string $state, ?int $rtt): array
    {
        $color = self::getStateColor($state, $rtt);
        
        $stateMap = [
            'registered' => [
                'text' => 'pr_ProviderStateRegistered',
                'description' => 'pr_ProviderStateRegisteredDesc'
            ],
            'OK' => [
                'text' => 'pr_ProviderStateOk',
                'description' => 'pr_ProviderStateOkDesc'
            ],
            'unregistered' => [
                'text' => 'pr_ProviderStateUnregistered',
                'description' => 'pr_ProviderStateUnregisteredDesc'
            ],
            'unreachable' => [
                'text' => 'pr_ProviderStateUnreachable',
                'description' => 'pr_ProviderStateUnreachableDesc'
            ],
            'lagged' => [
                'text' => 'pr_ProviderStateLagged',
                'description' => 'pr_ProviderStateLaggedDesc'
            ],
            'rejected' => [
                'text' => 'pr_ProviderStateRejected',
                'description' => 'pr_ProviderStateRejectedDesc'
            ],
            'OFF' => [
                'text' => 'pr_ProviderStateOff',
                'description' => 'pr_ProviderStateOffDesc'
            ],
            'UNMONITORED' => [
                'text' => 'pr_ProviderStateUnmonitored',
                'description' => 'pr_ProviderStateUnmonitoredDesc'
            ],
            'UNKNOWN' => [
                'text' => 'pr_ProviderStateUnknown',
                'description' => 'pr_ProviderStateUnknownDesc'
            ]
        ];
        
        $props = $stateMap[$state] ?? $stateMap['UNKNOWN'];
        $props['color'] = $color;
        
        return $props;
    }
    
    protected static function getStateColor(string $state, ?int $rtt): string
    {
        if (in_array($state, ['unregistered', 'rejected', 'OFF'])) {
            return 'red';
        }
        
        if ($state === 'registered' || $state === 'OK') {
            if ($rtt !== null && $rtt > 100) {
                return 'yellow';
            }
            return 'green';
        }
        
        if (in_array($state, ['unreachable', 'lagged', 'reconnecting'])) {
            return 'yellow';
        }
        
        return 'grey';
    }
    
    protected static function formatDuration(int $seconds): string
    {
        if ($seconds < 60) {
            return "{$seconds}s";
        } elseif ($seconds < 3600) {
            $minutes = floor($seconds / 60);
            return "{$minutes}m";
        } elseif ($seconds < 86400) {
            $hours = floor($seconds / 3600);
            $minutes = floor(($seconds % 3600) / 60);
            return "{$hours}h {$minutes}m";
        } else {
            $days = floor($seconds / 86400);
            $hours = floor(($seconds % 86400) / 3600);
            return "{$days}d {$hours}h";
        }
    }

    // State classification methods

    protected static function isSuccessState(string $state): bool
    {
        return in_array($state, ['registered', 'OK', 'reachable'], true);
    }
    
    protected static function isFailureState(string $state): bool
    {
        return in_array($state, ['rejected', 'unreachable', 'lagged', 'unregistered', 'UNKNOWN'], true);
    }

    // History and tracking methods

    protected static function getPreviousStatus(string $providerId, $redis): array
    {
        try {
            $statusKey = self::STATUS_KEY_PREFIX . $providerId;
            $previousStatusJson = $redis->get($statusKey);
            
            if ($previousStatusJson !== null) {
                $previousStatus = json_decode($previousStatusJson, true);
                return is_array($previousStatus) ? $previousStatus : [];
            }
        } catch (Throwable $e) {
            // Ignore cache errors
        }
        
        return [];
    }
    
    protected static function calculateStateDuration(string $providerId, string $currentState, bool $stateChanged, array $previousStatus): string
    {
        if ($stateChanged) {
            return '0s';
        }
        
        if (!isset($previousStatus['stateStartTime'])) {
            return '0s';
        }
        
        $durationSeconds = time() - $previousStatus['stateStartTime'];
        return self::formatDuration($durationSeconds);
    }
    
    protected static function calculateStateDurationSeconds(string $providerId, string $currentState, bool $stateChanged, array $previousStatus): int
    {
        if ($stateChanged) {
            return 0;
        }
        
        if (!isset($previousStatus['stateStartTime'])) {
            return 0;
        }
        
        return time() - $previousStatus['stateStartTime'];
    }
    
    protected static function trackLastSuccess(string $providerId, int $timestamp, $redis): void
    {
        try {
            $key = 'Workers:ProviderMonitor:lastSuccess:' . $providerId;
            
            $data = [
                'timestamp' => $timestamp,
                'date' => date('Y-m-d H:i:s', $timestamp)
            ];
            
            // Use Redis for setex operation with specific TTL
            $redis->setex($key, 30 * 86400, json_encode($data));
        } catch (Throwable $e) {
            // Ignore
        }
    }
    
    protected static function getLastSuccessInfo(string $providerId, $redis): ?array
    {
        try {
            $key = 'Workers:ProviderMonitor:lastSuccess:' . $providerId;
            
            // Use Redis for raw get operation to match setex storage
            $data = $redis->get($key);
            if ($data) {
                return json_decode($data, true);
            }
        } catch (Throwable $e) {
            // Ignore
        }
        
        return null;
    }
    
    protected static function updateProviderStatus(string $providerId, array $status, $redis): void
    {
        try {
            $statusKey = self::STATUS_KEY_PREFIX . $providerId;
            $redis->setex($statusKey, 86400, json_encode($status));
        } catch (Throwable $e) {
            // Ignore cache errors
        }
    }

    /**
     * Fetch fresh provider statuses from Asterisk AMI for specific provider or all providers
     * 
     * @param string|null $specificProviderId If provided, fetch only for this provider
     * @return array|null Returns array with 'sip' and 'iax' keys containing provider statuses
     */
    protected static function fetchProviderStatuses(?string $specificProviderId = null): ?array
    {
        try {
            $statuses = [
                'sip' => [],
                'iax' => []
            ];

            // If specific provider requested, get its type first
            if ($specificProviderId !== null) {
                $provider = self::findProvider($specificProviderId);
                if (!$provider) {
                    return null;
                }

                if ($provider['type'] === 'sip') {
                    $sipStatuses = self::getSipProviderStatuses();
                    if ($sipStatuses !== null && isset($sipStatuses[$specificProviderId])) {
                        $statuses['sip'][$specificProviderId] = $sipStatuses[$specificProviderId];
                    }
                } elseif ($provider['type'] === 'iax') {
                    $iaxStatuses = self::getIaxProviderStatuses();
                    if ($iaxStatuses !== null && isset($iaxStatuses[$specificProviderId])) {
                        $statuses['iax'][$specificProviderId] = $iaxStatuses[$specificProviderId];
                    }
                }
            } else {
                // Get all provider statuses
                $sipStatuses = self::getSipProviderStatuses();
                if ($sipStatuses !== null) {
                    $statuses['sip'] = $sipStatuses;
                }
                
                $iaxStatuses = self::getIaxProviderStatuses();
                if ($iaxStatuses !== null) {
                    $statuses['iax'] = $iaxStatuses;
                }
            }
            
            return $statuses;
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Failed to fetch provider statuses: " . $e->getMessage(),
                LOG_ERR
            );
            return null;
        }
    }

    /**
     * Add enriched history and problem data to status
     */
    protected static function enrichStatusWithHistory(array $statusData, $redis): array
    {
        $providerId = $statusData['id'];  // Changed from 'uniqid' to 'id'
        $currentState = $statusData['state'] ?? 'UNKNOWN';
        
        // Add last 10 events from history
        $historyKey = self::HISTORY_KEY_PREFIX . $providerId;
        $recentEvents = $redis->lrange($historyKey, 0, 9);
        if ($recentEvents) {
            $statusData['recentEvents'] = array_map(function($event) {
                return json_decode($event, true);
            }, $recentEvents);
        }
        
        // Add current problem info only if still in problem state
        $problemKey = self::PROBLEM_KEY_PREFIX . $providerId;
        $problemJson = $redis->get($problemKey);
        if ($problemJson) {
            $problemData = json_decode($problemJson, true);
            // Only include currentProblem if it matches current state or is recent
            if ($problemData && 
                (($problemData['state'] ?? '') === $currentState || 
                 self::isFailureState($currentState))) {
                $statusData['currentProblem'] = $problemData;
            }
        }
        
        // Add statistics from daily stats
        $statusData['statistics'] = self::getProviderStatistics($providerId, $redis);
        
        // Add human-readable timestamps
        if (isset($statusData['lastUpdate'])) {
            $statusData['lastUpdateFormatted'] = date('Y-m-d H:i:s', $statusData['lastUpdate']);
        }
        if (isset($statusData['lastChange'])) {
            $statusData['lastChangeFormatted'] = date('Y-m-d H:i:s', $statusData['lastChange']);
        }
        if (isset($statusData['stateStartTime'])) {
            $statusData['stateStartTimeFormatted'] = date('Y-m-d H:i:s', $statusData['stateStartTime']);
        }
        
        return $statusData;
    }
    
    /**
     * Get provider statistics from daily stats
     */
    protected static function getProviderStatistics(string $providerId, $redis): array
    {
        $stats = [
            'totalChecks' => 0,
            'successCount' => 0,
            'failureCount' => 0,
            'availability' => 0,
            'averageRtt' => null,
            'maxRtt' => null,
            'minRtt' => null
        ];
        
        try {
            // Get today's stats
            $today = date('Y-m-d');
            $dailyKey = self::DAILY_STATS_KEY_PREFIX . $providerId . ':' . $today;
            $dailyStatsJson = $redis->get($dailyKey);
            
            if ($dailyStatsJson) {
                $dailyStats = json_decode($dailyStatsJson, true);
                if ($dailyStats) {
                    $stats['totalChecks'] = $dailyStats['total_checks'] ?? 0;
                    $stats['successCount'] = $dailyStats['success_count'] ?? 0;
                    $stats['failureCount'] = $dailyStats['failure_count'] ?? 0;
                    
                    // Calculate availability percentage
                    if ($stats['totalChecks'] > 0) {
                        $stats['availability'] = round(($stats['successCount'] / $stats['totalChecks']) * 100, 2);
                    }
                    
                    // RTT statistics
                    if (isset($dailyStats['rtt_values']) && is_array($dailyStats['rtt_values']) && !empty($dailyStats['rtt_values'])) {
                        $rttValues = array_filter($dailyStats['rtt_values'], 'is_numeric');
                        if (!empty($rttValues)) {
                            $stats['averageRtt'] = round(array_sum($rttValues) / count($rttValues));
                            $stats['maxRtt'] = max($rttValues);
                            $stats['minRtt'] = min($rttValues);
                        }
                    }
                }
            }
            
            // If no data for today, try to get aggregated stats from history
            if ($stats['totalChecks'] === 0) {
                // Count events in history as approximation
                $historyKey = self::HISTORY_KEY_PREFIX . $providerId;
                $historyLength = $redis->llen($historyKey);
                if ($historyLength > 0) {
                    // Get last 100 events for statistics
                    $events = $redis->lrange($historyKey, 0, 99);
                    foreach ($events as $eventJson) {
                        $event = json_decode($eventJson, true);
                        if ($event) {
                            $stats['totalChecks']++;
                            if (isset($event['state'])) {
                                if (self::isSuccessState($event['state'])) {
                                    $stats['successCount']++;
                                } else if (self::isFailureState($event['state'])) {
                                    $stats['failureCount']++;
                                }
                            }
                        }
                    }
                    
                    // Recalculate availability
                    if ($stats['totalChecks'] > 0) {
                        $stats['availability'] = round(($stats['successCount'] / $stats['totalChecks']) * 100, 2);
                    }
                }
            }
        } catch (\Throwable $e) {
            // Ignore statistics errors
        }
        
        return $stats;
    }
}