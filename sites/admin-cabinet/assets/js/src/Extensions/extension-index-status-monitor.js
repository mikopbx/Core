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

/* global globalRootUrl, globalTranslate, EventBus, ExtensionsAPI */

/**
 * Extension Index Status Monitor
 * Simple extension status monitoring for extensions index page:
 * - Shows basic online/offline/unknown status indicators
 * - Real-time status updates via EventBus
 * - Backend-provided display properties (no hardcoded state mapping)
 * - Detailed status monitoring is handled in extension-modify-status-monitor.js
 */
const ExtensionIndexStatusMonitor = {
    channelId: 'extension-status',
    isInitialized: false,
    lastUpdateTime: 0,
    statusCache: {},
    
    /**
     * jQuery objects
     */
    $statusCells: null,
    $lastUpdateIndicator: null,
    
    /**
     * DOM cache for performance optimization
     */
    cachedRows: new Map(),
    cachedStatusCells: new Map(),
    
    /**
     * Initialize the extension status monitor with enhanced features
     */
    initialize() {
        if (this.isInitialized) {
            return;
        }
        
        // Cache DOM elements for performance
        this.cacheElements();
        
        // Create simple status indicator
        this.createStatusIndicator();
        
        // Subscribe to EventBus channel for real-time updates
        this.subscribeToEvents();
        
        // Set up periodic health checks
        this.setupHealthChecks();
        
        this.isInitialized = true;
    },
    
    /**
     * Cache DOM elements for performance optimization
     */
    cacheElements() {
        this.$statusCells = $('.extension-status, .extension-status-cell');
        
        // Cache extension rows for quick access
        $('tr.extension-row, tr[id]').each((index, element) => {
            const $row = $(element);
            const id = $row.attr('id') || $row.attr('data-value');
            if (id) {
                this.cachedRows.set(id, $row);
                const $statusCell = $row.find('.extension-status');
                if ($statusCell.length) {
                    this.cachedStatusCells.set(id, $statusCell);
                }
            }
        });
    },
    
    /**
     * Create simple status indicator
     */
    createStatusIndicator() {
        if ($('#extension-status-indicator').length === 0) {
            const indicator = `
                <div id="extension-status-indicator" class="ui mini message hidden">
                    <i class="sync alternate icon"></i>
                    <div class="content">
                        <span class="status-message"></span>
                    </div>
                </div>
            `;
            $('.ui.container.segment').prepend(indicator);
        }
        this.$lastUpdateIndicator = $('#extension-status-indicator');
    },
    
    /**
     * Subscribe to EventBus for real-time updates
     */
    subscribeToEvents() {
        if (typeof EventBus !== 'undefined') {
            EventBus.subscribe('extension-status', (message) => {
                this.handleEventBusMessage(message);
            });
        }
        // EventBus not available, extension status monitor will work without real-time updates
    },
    
    /**
     * Setup periodic health checks and cache maintenance
     */
    setupHealthChecks() {
        // Refresh cache every 30 seconds to handle dynamic content
        setInterval(() => {
            this.refreshCache();
        }, 30000);
        
        // Request status update every 2 minutes as fallback
        setInterval(() => {
            this.requestStatusUpdate();
        }, 120000);
    },
    
    /**
     * Refresh cached DOM elements
     */
    refreshCache() {
        // Clear existing cache
        this.cachedRows.clear();
        this.cachedStatusCells.clear();
        
        // Rebuild cache
        this.cacheElements();
    },
    
    /**
     * Handle EventBus message
     */
    handleEventBusMessage(message) {
        if (!message) {
            return;
        }
        
        // EventBus now sends data directly without double nesting
        const event = message.event;
        const data = message;
        
        if (!event) {
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
                // Unknown event type
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
            .text(data.message || globalTranslate.ex_CheckingExtensionStatuses || 'Checking extension statuses...');
            
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
            this.updateExtensionStatus(change);
        });
        
        // Show update notification
        const changeCount = data.changes.length;
        const message = changeCount === 1 
            ? globalTranslate.ex_OneExtensionStatusChanged || 'One extension status changed'
            : (globalTranslate.ex_MultipleExtensionStatusesChanged || 'Multiple extension statuses changed').replace('%s', changeCount);
            
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
        
        // Update all extension statuses on the page
        this.updateAllExtensionStatuses(data.statuses);
    },
    
    /**
     * Handle status error
     */
    handleStatusError(data) {
        const errorMsg = data.error || globalTranslate.ex_StatusCheckFailed || 'Extension status check failed';
        this.showUpdateNotification(errorMsg, 'error');
    },
    
    /**
     * Update single extension status using backend-provided display properties
     */
    updateExtensionStatus(change) {
        const { 
            extension,
            type, 
            state,
            stateColor, 
            stateIcon, 
            stateText, 
            stateDescription,
            stateDuration,
            deviceCount,
            availableDevices,
            devices
        } = change;
        
        const extensionId = extension;
        
        // Use cached elements for better performance
        let $row = this.cachedRows.get(extensionId);
        if (!$row) {
            // Try multiple selectors for extension rows
            $row = $(`#${extensionId}, tr[data-value="${extensionId}"], tr.extension-row[id="${extensionId}"]`);
            if ($row.length > 0) {
                this.cachedRows.set(extensionId, $row);
            } else {
                return; // Row not found
            }
        }
        
        let $statusCell = this.cachedStatusCells.get(extensionId);
        if (!$statusCell) {
            $statusCell = $row.find('.extension-status');
            if ($statusCell.length > 0) {
                this.cachedStatusCells.set(extensionId, $statusCell);
            } else {
                return; // Status cell not found
            }
        }
        
        const previousState = $statusCell.data('prev-state');
        
        // Use backend-provided display properties directly for simple status
        if (stateColor) {
            // Simple status indicator without detailed tooltips
            const statusHtml = `
                <div class="ui ${stateColor} empty circular label" 
                     style="width: 1px;height: 1px;"
                     title="Extension ${extensionId}: ${stateText || state}">
                </div>
            `;
            
            // Update DOM
            requestAnimationFrame(() => {
                $statusCell.html(statusHtml);
                
                // Animate if state changed
                if (previousState && previousState !== state) {
                    $statusCell.transition('pulse');
                }
                
                // Store current state for future comparison
                $statusCell.data('prev-state', state);
            });
        }
    },
    
    
    /**
     * Update all extension statuses with simple display
     */
    updateAllExtensionStatuses(statuses) {
        if (!statuses) {
            return;
        }
        
        // Process each extension status
        Object.keys(statuses).forEach(extensionId => {
            const extensionData = statuses[extensionId];
            if (extensionData) {
                const stateColor = this.getColorForStatus(extensionData.status);
                
                this.updateExtensionStatus({
                    extension: extensionId,
                    state: extensionData.status,
                    stateColor: stateColor
                });
            }
        });
    },
    
    /**
     * Get color for status value
     */
    getColorForStatus(status) {
        switch (status) {
            case 'Available':
                return 'green';
            case 'Unavailable':
                return 'grey';
            case 'Disabled':
                return 'grey';
            default:
                return 'grey';
        }
    },
    
    /**
     * Show simple update notification
     */
    showUpdateNotification(message, type = 'info', duration = 3000) {
        if (!this.$lastUpdateIndicator || !this.$lastUpdateIndicator.length) {
            return;
        }
        
        const $indicator = this.$lastUpdateIndicator;
        const $statusMessage = $indicator.find('.status-message');
        
        // Update classes for styling
        $indicator
            .removeClass('hidden info success error warning')
            .addClass(type);
        
        $statusMessage.text(message);
        
        // Auto-hide
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            $indicator.addClass('hidden');
        }, duration);
        
        // Add click handler to manually dismiss
        $indicator.off('click.dismiss').on('click.dismiss', () => {
            clearTimeout(this.notificationTimeout);
            $indicator.addClass('hidden');
        });
    },
    
    
    /**
     * Request immediate status update
     */
    requestStatusUpdate() {
        // Request status via ExtensionsAPI if available
        if (typeof ExtensionsAPI !== 'undefined') {
            ExtensionsAPI.getStatuses((response) => {
                if (response && response.result && response.data) {
                    this.updateAllExtensionStatuses(response.data);
                }
            });
        } else {
            // Fallback to direct REST API call
            $.api({
                url: `${globalRootUrl}pbxcore/api/extensions/getStatuses`,
                method: 'POST',
                data: {
                    action: 'getStatuses',
                    data: {}
                },
                on: 'now',
                onSuccess: (response) => {
                    if (response.result && response.data) {
                        this.updateAllExtensionStatuses(response.data);
                    }
                }
            });
        }
    },
    
    /**
     * Get cached row element for extension
     */
    getCachedRow(extensionId) {
        let $row = this.cachedRows.get(extensionId);
        if (!$row || !$row.length) {
            $row = $(`#${extensionId}, tr[data-value="${extensionId}"]`);
            if ($row.length) {
                this.cachedRows.set(extensionId, $row);
            }
        }
        return $row;
    }
};

// Simple initialization without extra UI elements
$(document).ready(() => {
    // Add double-click handlers for status cells to navigate to extension modify
    $(document).on('dblclick', '.extension-status .ui.label', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const extensionId = $(this).closest('tr').attr('id') || $(this).closest('tr').attr('data-value');
        const databaseId = $(this).closest('tr').attr('data-extension-id');
        
        if (databaseId) {
            // Navigate to extension modify page for detailed status
            window.location.href = `${globalRootUrl}extensions/modify/${databaseId}`;
        }
    });
});

// Don't auto-initialize the monitor here - let extensions-index.js handle it
// This allows for proper sequencing with DataTable initialization

// Export for use in other modules
window.ExtensionIndexStatusMonitor = ExtensionIndexStatusMonitor;