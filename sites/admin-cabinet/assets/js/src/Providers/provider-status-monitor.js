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

/* global globalRootUrl, globalTranslate, EventBus */

/**
 * Provider Status Monitor
 * Handles real-time provider status updates via EventBus
 */
const ProviderStatusMonitor = {
    channelId: 'provider-status',
    isInitialized: false,
    lastUpdateTime: 0,
    statusCache: {},
    
    /**
     * jQuery objects
     */
    $statusCells: null,
    $lastUpdateIndicator: null,
    
    /**
     * Status icons mapping
     */
    statusIcons: {
        'Registered': 'checkmark green',
        'OK': 'checkmark green', 
        'Reachable': 'checkmark green',
        'Unreachable': 'exclamation triangle yellow',
        'Lagged': 'clock yellow',
        'UNKNOWN': 'question grey',
        'Unmonitored': 'minus grey',
        'REMOVED': 'times red'
    },
    
    /**
     * Initialize the provider status monitor
     */
    initialize() {
        if (this.isInitialized) {
            return;
        }
        
        // Cache jQuery objects
        this.$statusCells = $('.provider-status-cell');
        
        // Create update indicator if not exists
        if ($('#provider-status-indicator').length === 0) {
            const indicator = '<div id="provider-status-indicator" class="ui mini message hidden">' +
                '<i class="sync alternate icon"></i>' +
                '<span class="content"></span>' +
                '</div>';
            $('.ui.container.segment').prepend(indicator);
        }
        this.$lastUpdateIndicator = $('#provider-status-indicator');
        
        // Subscribe to EventBus channel
        if (typeof EventBus !== 'undefined') {
            EventBus.subscribe('provider-status', (message) => {
                this.handleEventBusMessage(message);
            });
            
        } else {
            console.warn('EventBus not available, provider status monitor disabled');
        }
        
        this.isInitialized = true;
    },
    
    /**
     * Handle EventBus message
     */
    handleEventBusMessage(message) {
        if (!message) {
            return;
        }
        
        // EventBus message can have event at top level or in data
        let event, data;
        if (message.event) {
            // Event at top level
            event = message.event;
            data = message.data;
        } else if (message.data && message.data.event) {
            // Event in data
            event = message.data.event;
            data = message.data.data || message.data;
        } else {
            return;
        }
        
        switch (event) {
            case 'status_check':
                this.showCheckingIndicator(data);
                break;
                
            case 'status_update':
                this.processStatusUpdate(data);
                break;
                
            case 'status_complete':
                this.processCompleteStatus(data);
                break;
                
            case 'status_error':
                this.handleStatusError(data);
                break;
                
            default:
                console.warn('Unknown provider status event:', event);
        }
    },
    
    /**
     * Show checking indicator
     */
    showCheckingIndicator(data) {
        this.$lastUpdateIndicator
            .removeClass('hidden error success')
            .addClass('info');
            
        this.$lastUpdateIndicator.find('.content')
            .text(data.message || globalTranslate.pr_CheckingProviderStatuses);
            
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.$lastUpdateIndicator.addClass('hidden');
        }, 3000);
    },
    
    /**
     * Process status update with changes
     */
    processStatusUpdate(data) {
        if (!data.changes || !Array.isArray(data.changes)) {
            return;
        }
        
        const timestamp = data.timestamp || Date.now() / 1000;
        this.lastUpdateTime = timestamp;
        
        // Process each change
        data.changes.forEach(change => {
            this.updateProviderStatus(change);
        });
        
        // Show update notification
        const changeCount = data.changes.length;
        const message = changeCount === 1 
            ? globalTranslate.pr_OneProviderStatusChanged
            : globalTranslate.pr_MultipleProviderStatusesChanged.replace('%s', changeCount);
            
        this.showUpdateNotification(message, 'success');
    },
    
    /**
     * Process complete status data
     */
    processCompleteStatus(data) {
        if (!data.statuses) {
            return;
        }
        
        // Update cache
        this.statusCache = data.statuses;
        
        // Update all provider statuses on the page
        this.updateAllProviderStatuses(data.statuses);
        
        // Update last check time
        if (data.timestamp) {
            this.updateLastCheckTime(data.timestamp);
        }
    },
    
    /**
     * Handle status error
     */
    handleStatusError(data) {
        const errorMsg = data.error || globalTranslate.pr_StatusCheckFailed;
        this.showUpdateNotification(errorMsg, 'error');
    },
    
    /**
     * Update single provider status
     */
    updateProviderStatus(change) {
        const { provider_id, type, new_state, old_state } = change;
        
        // Find provider row
        const $row = $(`#${provider_id}`);
        if ($row.length === 0) {
            return;
        }
        
        // Find status cell in the row
        const $statusCell = $row.find('.provider-status');
        if ($statusCell.length === 0) {
            return;
        }
        
        // Clear any existing content (including loading spinner)
        $statusCell.html('');
        
        // Update status based on state
        const green = '<div class="ui green empty circular label" style="width: 1px;height: 1px;"></div>';
        const grey = '<div class="ui grey empty circular label" style="width: 1px;height: 1px;"></div>';
        const yellow = '<div class="ui yellow empty circular label" style="width: 1px;height: 1px;"></div>';
        
        switch (new_state) {
            case 'REGISTERED':
            case 'OK':
            case 'Registered':
                $statusCell.html(green);
                $row.find('.failure').text('');
                break;
            case 'Unreachable':
            case 'Lagged':
                $statusCell.html(yellow);
                $row.find('.failure').text('');
                break;
            case 'OFF':
            case 'Unmonitored':
                $statusCell.html(grey);
                $row.find('.failure').text('');
                break;
            case 'REJECTED':
            case 'Unregistered':
                $statusCell.html(grey);
                $row.find('.failure').text(new_state);
                break;
            default:
                $statusCell.html(grey);
                $row.find('.failure').text(new_state);
                break;
        }
        
        // Add animation for change
        if (old_state !== new_state) {
            $statusCell.transition('pulse');
        }
    },
    
    /**
     * Update all provider statuses
     */
    updateAllProviderStatuses(statuses) {
        if (!statuses) {
            return;
        }
        
        // Handle structured format with sip/iax separation
        if (statuses.sip && typeof statuses.sip === 'object') {
            Object.keys(statuses.sip).forEach(providerId => {
                const provider = statuses.sip[providerId];
                if (provider && provider.state) {
                    this.updateProviderStatus({
                        provider_id: providerId,
                        type: 'sip',
                        new_state: provider.state,
                        old_state: provider.state // No animation for bulk update
                    });
                }
            });
        }
        
        // Update IAX providers
        if (statuses.iax && typeof statuses.iax === 'object') {
            Object.keys(statuses.iax).forEach(providerId => {
                const provider = statuses.iax[providerId];
                if (provider && provider.state) {
                    this.updateProviderStatus({
                        provider_id: providerId,
                        type: 'iax',
                        new_state: provider.state,
                        old_state: provider.state // No animation for bulk update
                    });
                }
            });
        }
        
        // If no structured format found, try simple object format
        if (!statuses.sip && !statuses.iax && typeof statuses === 'object') {
            Object.keys(statuses).forEach(providerId => {
                const provider = statuses[providerId];
                if (provider && provider.state) {
                    this.updateProviderStatus({
                        provider_id: providerId,
                        type: 'unknown', // Type will be determined from provider ID
                        new_state: provider.state,
                        old_state: provider.state // No animation for bulk update
                    });
                }
            });
        }
    },
    
    /**
     * Show update notification
     */
    showUpdateNotification(message, type = 'info') {
        this.$lastUpdateIndicator
            .removeClass('hidden info success error')
            .addClass(type);
            
        this.$lastUpdateIndicator.find('.content').text(message);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.$lastUpdateIndicator.addClass('hidden');
        }, 5000);
    },
    
    /**
     * Update last check time display
     */
    updateLastCheckTime(timestamp) {
        const date = new Date(timestamp * 1000);
        const timeStr = date.toLocaleTimeString();
        
        // Update any last check time displays
        $('.provider-last-check-time').text(timeStr);
    },
    
    
    /**
     * Request immediate status update
     */
    requestStatusUpdate() {
        // This could trigger an API call to force status check
        $.api({
            url: `${globalRootUrl}providers/forceStatusCheck`,
            on: 'now',
            onSuccess: (response) => {
                if (response.success) {
                    this.showUpdateNotification(globalTranslate.pr_StatusCheckRequested, 'info');
                }
            }
        });
    }
};

// Don't auto-initialize here - let providers-index.js handle it

// Export for use in other modules
window.ProviderStatusMonitor = ProviderStatusMonitor;