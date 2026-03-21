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
use MikoPBX\Common\Providers\TranslationProvider;
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
            
            // Get PJSIP contacts for RTT information (single bulk AMI request)
            $contactsMap = [];
            try {
                $contactsResponse = $am->sendRequestTimeout('PJSIPShowContacts');
                $contactList = $contactsResponse['data']['ContactList'] ?? [];
                foreach ($contactList as $contact) {
                    // Extract endpoint name: Endpoint field (dynamic), AOR (permanent), or ObjectName
                    $providerId = $contact['Endpoint'] ?? '';
                    if (empty($providerId)) {
                        $providerId = $contact['AOR'] ?? '';
                    }
                    if (empty($providerId) && isset($contact['ObjectName'])) {
                        $aorParts = explode(';', $contact['ObjectName']);
                        $providerId = explode('@', $aorParts[0])[0];
                    }
                    if (empty($providerId)) {
                        continue;
                    }

                    $rtt = null;
                    if (isset($contact['RoundtripUsec']) && is_numeric($contact['RoundtripUsec'])) {
                        $rtt = (int)round((int)$contact['RoundtripUsec'] / 1000);
                    }

                    $contactsMap[$providerId] = [
                        'rtt' => $rtt,
                        'status' => $contact['Status'] ?? 'Unknown',
                        'uri' => $contact['Uri'] ?? null
                    ];
                }
                // Fallback for permanent contacts (outbound trunks without registration)
                // PJSIPShowContacts only returns dynamic contacts, not permanent ones from pjsip.conf
                foreach ($sipProvidersResult as $provider) {
                    $pid = $provider->uniqid;
                    if (!empty($pid) && !isset($contactsMap[$pid])) {
                        try {
                            $epResponse = $am->sendRequestTimeout('PJSIPShowEndpoint', ['Endpoint' => $pid]);
                            foreach ($epResponse['data']['ContactStatusDetail'] ?? [] as $detail) {
                                $rtt = null;
                                if (isset($detail['RoundtripUsec']) && is_numeric($detail['RoundtripUsec'])) {
                                    $rtt = (int)round((int)$detail['RoundtripUsec'] / 1000);
                                }
                                $contactsMap[$pid] = [
                                    'rtt' => $rtt,
                                    'status' => $detail['Status'] ?? 'Unknown',
                                    'uri' => $detail['URI'] ?? null
                                ];
                            }
                        } catch (Throwable $ignored) {
                        }
                    }
                }
            } catch (Throwable $e) {
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
                    'description' => $provider->description ?? '',
                    'registration_type' => $provider->registration_type ?? 'outbound'
                ];

                // Check if disabled
                if ($providerData['disabled']) {
                    $statuses[$provider->uniqid] = self::buildStatusData($providerData, 'OFF', null, []);
                    continue;
                }

                // Initialize state, RTT and additional details
                $rtt = null;
                $state = 'UNKNOWN';
                $additionalDetails = [];

                // Determine registration status based on registration type
                $registrationType = $providerData['registration_type'];

                // For INBOUND registration - check if provider has registered to us via AOR contacts
                if ($registrationType === 'inbound') {
                    // For inbound providers, contact key is username (not uniqid)
                    $contactKey = $provider->username ?: $provider->uniqid;

                    // Check if provider has an active contact (inbound registration)
                    if (isset($contactsMap[$contactKey])) {
                        $state = 'REGISTERED';  // Provider successfully registered to us
                        $rtt = $contactsMap[$contactKey]['rtt'];
                        $additionalDetails['contactStatus'] = $contactsMap[$contactKey]['status'] ?? '';

                        // Extract client's registration address from contact URI
                        // Format: sip:testProvider@192.168.107.0:50213
                        $contactUri = $contactsMap[$contactKey]['uri'] ?? '';
                        if ($contactUri && preg_match('/sip:[^@]+@([^:]+):?(\d+)?/', $contactUri, $uriMatch)) {
                            $clientIp = $uriMatch[1];
                            $clientPort = $uriMatch[2] ?? '5060'; // Default SIP port if not specified
                            $additionalDetails['registrationDetails'] = TranslationProvider::translate('pr_RegisteredFrom') . " {$clientIp}:{$clientPort}";
                        } else {
                            $additionalDetails['registrationDetails'] = TranslationProvider::translate('pr_ProviderRegistered');
                        }
                    } else {
                        // No contact means provider hasn't registered yet
                        $state = 'UNREGISTERED';
                        $additionalDetails['registrationDetails'] = TranslationProvider::translate('pr_WaitingForRegistration');
                    }
                }
                // For OUTBOUND registration - check our registration status with provider's server
                elseif ($registrationType === 'outbound') {
                    $regKey = $provider->username . '@' . $provider->host;
                    $registration = $registryMap[$regKey] ?? null;

                    if ($registration) {
                        $state = self::normalizeSipState($registration['state'] ?? 'UNKNOWN');

                        // Add registration details
                        if (isset($registration['refresh'])) {
                            $additionalDetails['refreshInterval'] = $registration['refresh'];
                        }
                        if ($state === 'rejected' && isset($registration['reason'])) {
                            $additionalDetails['rejectionReason'] = $registration['reason'];
                        }
                        if ($state === 'registered' && isset($registration['address'])) {
                            $additionalDetails['registrationDetails'] = TranslationProvider::translate('pr_RegisteredTo') . " {$registration['address']}";
                        }
                    }

                    // Get RTT from contacts map if available
                    if (isset($contactsMap[$provider->uniqid])) {
                        $rtt = $contactsMap[$provider->uniqid]['rtt'];
                        $additionalDetails['contactStatus'] = $contactsMap[$provider->uniqid]['status'] ?? '';
                    }
                }
                // For NONE (no registration) - use peer state
                else {
                    $peer = $peerMap[$provider->uniqid] ?? null;
                    if ($peer) {
                        $state = self::normalizeSipState($peer['state'] ?? 'UNKNOWN');
                    }

                    // Get RTT from contacts if available
                    if (isset($contactsMap[$provider->uniqid])) {
                        $rtt = $contactsMap[$provider->uniqid]['rtt'];
                        $additionalDetails['contactStatus'] = $contactsMap[$provider->uniqid]['status'] ?? '';
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
                    // Ensure empty arrays are converted to stdClass for consistent JSON encoding
                    $statuses = $cachedData['statuses'];
                    if (isset($statuses['sip']) && is_array($statuses['sip']) && empty($statuses['sip'])) {
                        $statuses['sip'] = new \stdClass();
                    }
                    if (isset($statuses['iax']) && is_array($statuses['iax']) && empty($statuses['iax'])) {
                        $statuses['iax'] = new \stdClass();
                    }
                    return $statuses;
                }
            }
        } catch (Throwable $e) {
            // Ignore cache errors
        }
        return [
            'sip' => new \stdClass(),
            'iax' => new \stdClass()
        ];
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
        
        // Check for UNREGISTERED first (before REGISTERED)
        if ($state === 'UNREGISTERED' || strpos($state, 'UNREGISTERED') !== false) {
            return 'unregistered';
        } elseif (strpos($state, 'REGISTERED') !== false) {
            return 'registered';
        } elseif (strpos($state, 'UNREACHABLE') !== false) {
            return 'unreachable';
        } elseif (strpos($state, 'LAGGED') !== false) {
            return 'lagged';
        } elseif (strpos($state, 'REJECTED') !== false) {
            return 'rejected';
        } elseif ($state === 'OK') {
            return 'OK';
        } elseif ($state === 'UNKNOWN') {
            // Explicitly handle UNKNOWN state - provider status is not determined yet
            return 'UNKNOWN';
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

        // Normalize state to lowercase for consistent mapping
        $normalizedState = strtolower($state);

        $stateMap = [
            'registered' => [
                'textKey' => 'pr_ProviderStateRegistered',
                'descriptionKey' => 'pr_ProviderStateRegisteredDesc'
            ],
            'ok' => [
                'textKey' => 'pr_ProviderStateOk',
                'descriptionKey' => 'pr_ProviderStateOkDesc'
            ],
            'unregistered' => [
                'textKey' => 'pr_ProviderStateUnregistered',
                'descriptionKey' => 'pr_ProviderStateUnregisteredDesc'
            ],
            'unreachable' => [
                'textKey' => 'pr_ProviderStateUnreachable',
                'descriptionKey' => 'pr_ProviderStateUnreachableDesc'
            ],
            'lagged' => [
                'textKey' => 'pr_ProviderStateLagged',
                'descriptionKey' => 'pr_ProviderStateLaggedDesc'
            ],
            'rejected' => [
                'textKey' => 'pr_ProviderStateRejected',
                'descriptionKey' => 'pr_ProviderStateRejectedDesc'
            ],
            'off' => [
                'textKey' => 'pr_ProviderStateOff',
                'descriptionKey' => 'pr_ProviderStateOffDesc'
            ],
            'unmonitored' => [
                'textKey' => 'pr_ProviderStateUnmonitored',
                'descriptionKey' => 'pr_ProviderStateUnmonitoredDesc'
            ],
            'unknown' => [
                'textKey' => 'pr_ProviderStateUnknown',
                'descriptionKey' => 'pr_ProviderStateUnknownDesc'
            ]
        ];

        $stateConfig = $stateMap[$normalizedState] ?? $stateMap['unknown'];

        // Return translated texts instead of keys
        return [
            'text' => TranslationProvider::translate($stateConfig['textKey']),
            'description' => TranslationProvider::translate($stateConfig['descriptionKey']),
            'color' => $color
        ];
    }
    
    protected static function getStateColor(string $state, ?int $rtt): string
    {
        // Normalize state to lowercase for consistent comparison
        $state = strtolower($state);

        if (in_array($state, ['unregistered', 'rejected', 'off'])) {
            return 'grey';
        }

        if ($state === 'registered' || $state === 'ok') {
            if ($rtt !== null && $rtt > 100) {
                return 'yellow';
            }
            return 'green';
        }

        if (in_array($state, ['unreachable', 'lagged', 'reconnecting'])) {
            return 'yellow';
        }

        // UNKNOWN and any other undefined states should be grey (neutral)
        return 'grey';
    }

    /**
     * Get translated state text
     *
     * @param string $state State identifier (e.g., "REGISTERED", "UNREGISTERED")
     * @return string Translated state text
     */
    protected static function getTranslatedState(string $state): string
    {
        $normalizedState = strtolower($state);

        $stateMap = [
            'registered' => 'pr_ProviderStateRegistered',
            'unregistered' => 'pr_ProviderStateUnregistered',
            'unreachable' => 'pr_ProviderStateUnreachable',
            'rejected' => 'pr_ProviderStateRejected',
            'off' => 'pr_ProviderStateOff',
            'lagged' => 'pr_ProviderStateLagged',
            'ok' => 'pr_ProviderStateOk',
            'unknown' => 'pr_ProviderStateUnknown',
            'unmonitored' => 'pr_ProviderStateUnmonitored'
        ];

        $translationKey = $stateMap[$normalizedState] ?? 'pr_ProviderStateUnknown';

        return TranslationProvider::translate($translationKey);
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
        return in_array(strtolower($state), ['registered', 'ok', 'reachable'], true);
    }

    protected static function isFailureState(string $state): bool
    {
        return in_array(strtolower($state), ['rejected', 'unreachable', 'lagged', 'unregistered', 'unknown'], true);
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
                'sip' => new \stdClass(),
                'iax' => new \stdClass()
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
                        $statuses['sip'] = [$specificProviderId => $sipStatuses[$specificProviderId]];
                    } else {
                        $statuses['sip'] = new \stdClass();
                    }
                } elseif ($provider['type'] === 'iax') {
                    $iaxStatuses = self::getIaxProviderStatuses();
                    if ($iaxStatuses !== null && isset($iaxStatuses[$specificProviderId])) {
                        $statuses['iax'] = [$specificProviderId => $iaxStatuses[$specificProviderId]];
                    } else {
                        $statuses['iax'] = new \stdClass();
                    }
                }
            } else {
                // Get all provider statuses
                $sipStatuses = self::getSipProviderStatuses();
                if ($sipStatuses !== null && !empty($sipStatuses)) {
                    $statuses['sip'] = $sipStatuses;
                } else {
                    $statuses['sip'] = new \stdClass();
                }
                
                $iaxStatuses = self::getIaxProviderStatuses();
                if ($iaxStatuses !== null && !empty($iaxStatuses)) {
                    $statuses['iax'] = $iaxStatuses;
                } else {
                    $statuses['iax'] = new \stdClass();
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
                $eventData = json_decode($event, true);
                if ($eventData) {
                    // Translate event name
                    if (isset($eventData['event'])) {
                        $eventData['event'] = TranslationProvider::translate($eventData['event']);
                    }
                    // Translate details (keep state/previousState in English)
                    if (isset($eventData['details']) && isset($eventData['state']) && isset($eventData['previousState'])) {
                        $eventData['details'] = TranslationProvider::translate('pr_StateChangedFromTo', [
                            'previousState' => self::getTranslatedState($eventData['previousState']),
                            'newState' => self::getTranslatedState($eventData['state'])
                        ]);
                    }
                }
                return $eventData;
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