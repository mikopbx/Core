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

use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\PBXCoreREST\Lib\UserPageTracker\UserPageTrackerLib;
use Phalcon\Di\Injectable;
use Throwable;

/**
 * Provider status events publisher
 * Optimized to only publish when active subscribers exist
 */
class ProviderStatusEvents extends Injectable
{
    public const PROVIDER_STATUS_CHANNEL = 'provider-status';
    
    // Event types
    public const EVENT_STATUS_CHECK = 'status_check';
    public const EVENT_STATUS_UPDATE = 'status_update';
    public const EVENT_STATUS_COMPLETE = 'status_complete';
    public const EVENT_STATUS_ERROR = 'status_error';
    
    private EventBusProvider $eventBus;
    private string $channelId;
    
    /**
     * Constructor
     * 
     * @param string $channelId Channel ID for EventBus
     */
    public function __construct(string $channelId = self::PROVIDER_STATUS_CHANNEL)
    {
        $this->eventBus = $this->getDI()->get(EventBusProvider::SERVICE_NAME);
        $this->channelId = $channelId;
    }
    
    /**
     * Push status check started message
     * 
     * @param array $data Message data
     */
    public function pushStatusCheckStarted(array $data): void
    {
        if (!$this->hasActiveSubscribers()) {
            return;
        }
        
        $this->eventBus->publish(
            'provider-status',
            [
                'event' => self::EVENT_STATUS_CHECK,
                'data' => array_merge($data, [
                    'timestamp' => time()
                ])
            ]
        );
    }
    
    /**
     * Push status update message with changes
     * 
     * @param array $changes Status changes
     * @param array $summary Summary data
     */
    public function pushStatusUpdate(array $changes, array $summary): void
    {
        if (!$this->hasActiveSubscribers()) {
            return;
        }
        
        $this->eventBus->publish(
            'provider-status',
            [
                'event' => self::EVENT_STATUS_UPDATE,
                'data' => [
                    'changes' => $changes,
                    'summary' => $summary,
                    'timestamp' => time()
                ]
            ]
        );
    }
    
    /**
     * Push complete status data
     * 
     * @param array $statuses Full status data
     * @param int $changeCount Number of changes detected
     */
    public function pushStatusComplete(array $statuses, int $changeCount): void
    {
        if (!$this->hasActiveSubscribers()) {
            return;
        }
        
        $this->eventBus->publish(
            'provider-status',
            [
                'event' => self::EVENT_STATUS_COMPLETE,
                'data' => [
                    'statuses' => $statuses,
                    'change_count' => $changeCount,
                    'timestamp' => time()
                ]
            ]
        );
    }
    
    /**
     * Push error message
     * 
     * @param string $error Error message
     */
    public function pushError(string $error): void
    {
        if (!$this->hasActiveSubscribers()) {
            return;
        }
        
        $this->eventBus->publish(
            'provider-status',
            [
                'event' => self::EVENT_STATUS_ERROR,
                'data' => [
                    'error' => $error,
                    'timestamp' => time()
                ]
            ]
        );
    }
    
    /**
     * Check if there are active subscribers on the channel
     * Uses page tracker data to determine active users
     * 
     * @return bool
     */
    private function hasActiveSubscribers(): bool
    {
        try {
            $redis = $this->getDI()->get('redis');
            
            // Check if users are on provider pages (corrected case)
            $providerPages = [
                'AdminCabinet/Providers/index',
                'AdminCabinet/Providers/modifysip',
                'AdminCabinet/Providers/modifyiax'
            ];
            
            foreach ($providerPages as $page) {
                $viewersKey = UserPageTrackerLib::getPageViewersKey($page);
                $viewers = $redis->sMembers($viewersKey);
                
                if (!empty($viewers)) {
                    return true;
                }
            }
            return false;
            
        } catch (\Throwable $e) {
            // On error, assume subscribers exist
            return true;
        }
    }
}