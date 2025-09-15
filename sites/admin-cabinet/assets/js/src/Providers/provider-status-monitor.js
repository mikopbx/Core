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
 * Handles real-time provider status updates via EventBus with enhanced features:
 * - Real-time status updates with EventBus integration
 * - Backend-provided display properties (no hardcoded state mapping)
 * - Duration displays (state duration, success/failure duration)
 * - Last success information
 * - Enhanced visual feedback with Fomantic UI components
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
     * DOM cache for performance optimization
     */
    cachedRows: new Map(),
    cachedStatusCells: new Map(),
    
    /**
     * Initialize the provider status monitor with enhanced features
     */
    initialize() {
        if (this.isInitialized) {
            return;
        }
        
        // Cache DOM elements for performance
        this.cacheElements();
        
        // Initialize loading placeholders for all provider rows
        this.initializeLoadingPlaceholders();
        
        // Create enhanced status indicator
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
        this.$statusCells = $('.provider-status, .provider-status-cell');
        
        // Cache provider rows for quick access
        $('tr.provider-row, tr[id]').each((index, element) => {
            const $row = $(element);
            const id = $row.attr('id');
            if (id) {
                this.cachedRows.set(id, $row);
                const $statusCell = $row.find('.provider-status');
                if ($statusCell.length) {
                    this.cachedStatusCells.set(id, $statusCell);
                }
            }
        });
    },
    
    /**
     * Create enhanced status indicator with duration info
     */
    createStatusIndicator() {
        if ($('#provider-status-indicator').length === 0) {
            const indicator = `
                <div id="provider-status-indicator" class="ui mini message hidden">
                    <i class="sync alternate icon"></i>
                    <div class="content">
                        <div class="header"></div>
                        <div class="description">
                            <span class="status-message"></span>
                            <span class="last-check-time" style="font-size: 0.85em; color: #888;"></span>
                        </div>
                    </div>
                </div>
            `;
            $('.ui.container.segment').prepend(indicator);
        }
        this.$lastUpdateIndicator = $('#provider-status-indicator');
    },
    
    /**
     * Subscribe to EventBus for real-time updates
     */
    subscribeToEvents() {
        if (typeof EventBus !== 'undefined') {
            EventBus.subscribe('provider-status', (message) => {
                this.handleEventBusMessage(message);
            });
        }
        // EventBus not available, provider status monitor will work without real-time updates
    },
    
    /**
     * Setup periodic health checks and cache maintenance
     */
    setupHealthChecks() {
        // Refresh cache every 30 seconds to handle dynamic content
        setInterval(() => {
            this.refreshCache();
        }, 30000);
        
        // Request status update every 5 minutes as fallback
        setInterval(() => {
            this.requestStatusUpdate();
        }, 300000);
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
        
        // Reinitialize loading placeholders for new rows
        this.initializeLoadingPlaceholders();
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
     * Update single provider status using backend-provided display properties
     * No hardcoded state mapping - backend provides all display properties
     */
    updateProviderStatus(change) {
        const { 
            provider_id, 
            type, 
            state,
            new_state, 
            old_state,
            stateColor, 
            stateIcon, 
            stateText, 
            stateDescription,
            stateDuration,
            lastSuccessTime,
            timeSinceLastSuccess,
            successDuration,
            failureDuration
        } = change;
        
        // Use cached elements for better performance
        let $row = this.cachedRows.get(provider_id);
        if (!$row) {
            $row = $(`#${provider_id}`);
            if ($row.length > 0) {
                this.cachedRows.set(provider_id, $row);
            } else {
                return; // Row not found
            }
        }
        
        let $statusCell = this.cachedStatusCells.get(provider_id);
        if (!$statusCell) {
            $statusCell = $row.find('.provider-status');
            if ($statusCell.length > 0) {
                this.cachedStatusCells.set(provider_id, $statusCell);
            } else {
                return; // Status cell not found
            }
        }
        
        // Use current state or fallback to new_state for compatibility
        const currentState = state || new_state;
        const previousState = $statusCell.data('prev-state');
        
        // Use backend-provided display properties directly
        if (stateColor) {
            // Enhanced status indicator with tooltip support
            const tooltipContent = this.buildTooltipContent({
                state: currentState,
                stateText,
                stateDescription,
                stateDuration,
                lastSuccessTime,
                timeSinceLastSuccess,
                successDuration,
                failureDuration,
                rtt: change.rtt,
                host: change.host,
                username: change.username
            });
            
            const statusHtml = `
                <div class="ui ${stateColor} empty circular label" 
                     style="width: 1px;height: 1px;"
                     data-content="${tooltipContent}"
                     data-position="top center"
                     data-variation="small">
                </div>
            `;
            
            // Batch DOM updates for better performance
            requestAnimationFrame(() => {
                $statusCell.html(statusHtml);
                
                // Initialize popup (Fomantic UI tooltip)
                $statusCell.find('.ui.label').popup({
                    hoverable: false,
                    position: 'top center',
                    variation: 'small',
                    html: tooltipContent,
                    delay: {
                        show: 200,
                        hide: 100
                    }
                });
                
                // Clear failure text when using modern status display
                const $failureCell = $row.find('.failure, .features.failure');
                if ($failureCell.length) {
                    // Don't show text status when we have visual indicators
                    $failureCell.text('');
                }
                
                // Add duration information if available
                this.updateDurationDisplay($row, {
                    stateDuration,
                    lastSuccessTime,
                    successDuration,
                    failureDuration,
                    stateText
                });
                
                // Animate if state changed
                if (previousState && previousState !== currentState) {
                    $statusCell.transition('pulse');
                }
                
                // Store current state for future comparison
                $statusCell.data('prev-state', currentState);
            });
        } else {
            // Fallback for backward compatibility - use simple state-based display
            this.updateProviderStatusLegacy(change);
        }
    },
    
    /**
     * Build tooltip content with enhanced information
     */
    buildTooltipContent(statusInfo) {
        const { 
            state,
            stateText,
            stateDescription, 
            stateDuration, 
            lastSuccessTime,
            timeSinceLastSuccess,
            successDuration, 
            failureDuration,
            rtt,
            host,
            username
        } = statusInfo;
        
        // Use translated state text as main title
        const stateTitle = stateText ? (globalTranslate[stateText] || stateText) : (globalTranslate[stateDescription] || stateDescription || state || '');
        
        let tooltip = `<div class="provider-status-tooltip">`;
        tooltip += `<strong class="provider-status-tooltip__title">${stateTitle}</strong>`;
        
        // Add original state value if available and different from title
        if (state && state !== stateTitle) {
            tooltip += `<div class="provider-status-tooltip__state-original">[${state}]</div>`;
        }
        
        // Add host and username if available
        if (host || username) {
            tooltip += `<div class="provider-status-tooltip__section">`;
            if (host) {
                tooltip += `<div class="provider-status-tooltip__info-item">Host: <strong>${host}</strong></div>`;
            }
            if (username) {
                tooltip += `<div class="provider-status-tooltip__info-item">User: <strong>${username}</strong></div>`;
            }
            tooltip += `</div>`;
        }
        
        // Add status information section
        let hasStatusInfo = false;
        let statusSection = `<div class="provider-status-tooltip__section">`;
        
        // Format and add duration information (now comes as seconds from backend)
        if (stateDuration !== undefined && stateDuration !== null && stateDuration >= 0) {
            const formattedDuration = this.formatDuration(stateDuration);
            const durationLabel = globalTranslate.pr_StatusDuration || 'Длительность';
            statusSection += `<div class="provider-status-tooltip__status-item">${durationLabel}: <strong>${formattedDuration}</strong></div>`;
            hasStatusInfo = true;
        }
        
        // Add RTT (Round Trip Time) if available
        if (rtt !== undefined && rtt !== null && rtt >= 0) {
            const rttLabel = globalTranslate.pr_RTT || 'Задержка';
            // Format RTT with color coding
            let rttClass = 'provider-status-tooltip__rtt--good';
            if (rtt > 100) rttClass = 'provider-status-tooltip__rtt--warning';
            if (rtt > 200) rttClass = 'provider-status-tooltip__rtt--bad';
            statusSection += `<div class="provider-status-tooltip__status-item">${rttLabel}: <strong class="${rttClass}">${rtt} мс</strong></div>`;
            hasStatusInfo = true;
        }
        
        // Format time since last success if provided (now comes as seconds)
        if (timeSinceLastSuccess !== undefined && timeSinceLastSuccess !== null && timeSinceLastSuccess >= 0) {
            const formattedTime = this.formatDuration(timeSinceLastSuccess);
            const lastSuccessLabel = globalTranslate.pr_LastSuccessTime || 'Последний успех';
            statusSection += `<div class="provider-status-tooltip__status-item provider-status-tooltip__last-success">${lastSuccessLabel}: <strong>${formattedTime} назад</strong></div>`;
            hasStatusInfo = true;
        }
        
        // Add success/failure duration if available
        if (successDuration !== undefined && successDuration !== null && successDuration > 0) {
            const formattedDuration = this.formatDuration(successDuration);
            const successLabel = globalTranslate.pr_SuccessDuration || 'Время работы';
            statusSection += `<div class="provider-status-tooltip__status-item provider-status-tooltip__success-duration">${successLabel}: <strong>${formattedDuration}</strong></div>`;
            hasStatusInfo = true;
        }
        
        if (failureDuration !== undefined && failureDuration !== null && failureDuration > 0) {
            const formattedDuration = this.formatDuration(failureDuration);
            const failureLabel = globalTranslate.pr_FailureDuration || 'Время сбоя';
            statusSection += `<div class="provider-status-tooltip__status-item provider-status-tooltip__failure-duration">${failureLabel}: <strong>${formattedDuration}</strong></div>`;
            hasStatusInfo = true;
        }
        
        statusSection += `</div>`;
        
        if (hasStatusInfo) {
            tooltip += statusSection;
        }
        
        // Add description if different from state text
        if (stateDescription && globalTranslate[stateDescription] && globalTranslate[stateDescription] !== stateTitle) {
            tooltip += `<div class="provider-status-tooltip__description">`;
            tooltip += globalTranslate[stateDescription];
            tooltip += `</div>`;
        }
        
        tooltip += `</div>`;
        
        return tooltip.replace(/"/g, '&quot;');
    },
    
    /**
     * Update duration display in provider row
     */
    updateDurationDisplay($row, durations) {
        const { stateDuration, lastSuccessTime, successDuration, failureDuration, stateText } = durations;
        
        // Look for duration display elements or create them
        let $durationInfo = $row.find('.provider-duration-info');
        if ($durationInfo.length === 0) {
            // Add duration info container to the provider name column
            const $nameColumn = $row.find('td').eq(2); // Usually the third column contains provider name
            if ($nameColumn.length) {
                $nameColumn.append('<div class="provider-duration-info"></div>');
                $durationInfo = $nameColumn.find('.provider-duration-info');
            }
        }
        
        if ($durationInfo.length && (stateDuration || lastSuccessTime || successDuration || failureDuration)) {
            let durationText = '';
            
            if (stateDuration) {
                // Use translated state text if available, otherwise use generic label
                const stateLabel = stateText ? globalTranslate[stateText] || stateText : globalTranslate.pr_StatusDuration || 'State';
                durationText += `${stateLabel}: ${this.formatDuration(stateDuration)}`;
            }
            
            if (lastSuccessTime) {
                const timeAgo = this.formatTimeAgo(lastSuccessTime);
                const lastSuccessLabel = globalTranslate.pr_LastSuccessTime || 'Last success';
                if (durationText) durationText += ' | ';
                durationText += `${lastSuccessLabel}: ${timeAgo}`;
            }
            
            $durationInfo.text(durationText);
        }
    },
    
    /**
     * Initialize loading placeholders for all provider rows
     * This prevents table jumping when statuses are loading
     */
    initializeLoadingPlaceholders() {
        $('tr.provider-row, tr[id]').each((index, element) => {
            const $row = $(element);
            const $nameColumn = $row.find('td').eq(2); // Provider name column
            
            // Check if duration info already exists
            let $durationInfo = $row.find('.provider-duration-info');
            if ($durationInfo.length === 0 && $nameColumn.length) {
                // Add loading placeholder
                const loadingText = globalTranslate.pr_CheckingProviderStatuses || 'Getting status...';
                $nameColumn.append(`<div class="provider-duration-info" style="color: #999; font-size: 0.9em;">${loadingText}</div>`);
            }
        });
    },
    
    /**
     * Format duration in seconds to human readable format
     */
    formatDuration(seconds) {
        if (!seconds || seconds < 0) {
            // Return 0 seconds using translation
            const zeroFormat = globalTranslate.pr_TimeFormat_Seconds || '%s s';
            return zeroFormat.replace('%s', '0');
        }
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        let result = [];
        
        // Use translated format strings
        if (days > 0) {
            const format = globalTranslate.pr_TimeFormat_Days || '%s d';
            result.push(format.replace('%s', days));
        }
        if (hours > 0) {
            const format = globalTranslate.pr_TimeFormat_Hours || '%s h';
            result.push(format.replace('%s', hours));
        }
        if (minutes > 0) {
            const format = globalTranslate.pr_TimeFormat_Minutes || '%s m';
            result.push(format.replace('%s', minutes));
        }
        if (secs > 0 || result.length === 0) {
            const format = globalTranslate.pr_TimeFormat_Seconds || '%s s';
            result.push(format.replace('%s', secs));
        }
        
        // Join with space, show max 2 units for readability
        return result.slice(0, 2).join(' ');
    },
    
    /**
     * Format timestamp to "time ago" format
     */
    formatTimeAgo(timestamp) {
        const now = Date.now() / 1000;
        const diff = now - timestamp;
        
        // Use formatDuration to get consistent formatting with translations
        const formattedTime = this.formatDuration(diff);
        const agoLabel = globalTranslate.pr_TimeAgo || 'ago';
        
        // For very recent times, use special label
        if (diff < 60) {
            return globalTranslate.pr_JustNow || formattedTime + ' ' + agoLabel;
        }
        
        return formattedTime + ' ' + agoLabel;
    },
    
    /**
     * Legacy status update method for backward compatibility
     */
    updateProviderStatusLegacy(change) {
        const { provider_id, new_state, old_state } = change;
        
        const $row = $(`#${provider_id}`);
        if ($row.length === 0) return;
        
        const $statusCell = $row.find('.provider-status');
        if ($statusCell.length === 0) return;
        
        // Clear any existing content
        $statusCell.html('');
        
        // Simple status indicators
        const green = '<div class="ui green empty circular label" style="width: 1px;height: 1px;"></div>';
        const grey = '<div class="ui grey empty circular label" style="width: 1px;height: 1px;"></div>';
        const yellow = '<div class="ui yellow empty circular label" style="width: 1px;height: 1px;"></div>';
        const red = '<div class="ui red empty circular label" style="width: 1px;height: 1px;"></div>';
        
        // Basic state mapping for backward compatibility
        const normalizedState = (new_state || '').toUpperCase();
        switch (normalizedState) {
            case 'REGISTERED':
            case 'OK':
            case 'REACHABLE':
                $statusCell.html(green);
                $row.find('.failure').text('');
                break;
            case 'UNREACHABLE':
            case 'LAGGED':
                $statusCell.html(yellow);
                $row.find('.failure').text('');
                break;
            case 'OFF':
            case 'UNMONITORED':
                $statusCell.html(grey);
                $row.find('.failure').text('');
                break;
            case 'REJECTED':
            case 'UNREGISTERED':
            case 'FAILED':
                $statusCell.html(grey);
                $row.find('.failure').text(new_state);
                break;
            default:
                $statusCell.html(grey);
                $row.find('.failure').text(new_state || 'Unknown');
                break;
        }
        
        // Add animation for change
        if (old_state !== new_state) {
            $statusCell.transition('pulse');
        }
    },
    
    /**
     * Update all provider statuses using backend-provided display properties
     * Supports both legacy format and new enhanced format with durations
     */
    updateAllProviderStatuses(statuses) {
        if (!statuses) {
            return;
        }
        
        // Batch DOM updates for better performance
        const updates = [];
        
        // Helper function to build update object from provider data
        const buildUpdateObject = (providerId, provider, type) => ({
            provider_id: providerId,
            type,
            state: provider.state,
            new_state: provider.state, // For backward compatibility
            old_state: provider.state, // No animation for bulk update
            stateColor: provider.stateColor,
            stateIcon: provider.stateIcon,
            stateText: provider.stateText,
            stateDescription: provider.stateDescription,
            stateDuration: provider.stateDuration,
            lastSuccessTime: provider.lastSuccessTime,
            timeSinceLastSuccess: provider.timeSinceLastSuccess,
            successDuration: provider.successDuration,
            failureDuration: provider.failureDuration,
            rtt: provider.rtt
        });
        
        // Handle structured format with sip/iax separation
        ['sip', 'iax'].forEach(providerType => {
            if (statuses[providerType] && typeof statuses[providerType] === 'object') {
                Object.keys(statuses[providerType]).forEach(providerId => {
                    const provider = statuses[providerType][providerId];
                    if (provider) {
                        updates.push(buildUpdateObject(providerId, provider, providerType));
                    }
                });
            }
        });
        
        // If no structured format found, try simple object format (legacy)
        if (!statuses.sip && !statuses.iax && typeof statuses === 'object') {
            Object.keys(statuses).forEach(providerId => {
                const provider = statuses[providerId];
                if (provider) {
                    updates.push(buildUpdateObject(providerId, provider, 'unknown'));
                }
            });
        }
        
        // Process all updates efficiently
        this.processBatchUpdates(updates);
    },
    
    /**
     * Process multiple status updates efficiently in batches
     */
    processBatchUpdates(updates) {
        if (!Array.isArray(updates) || updates.length === 0) {
            return;
        }
        
        // Split updates into batches for performance
        const batchSize = 10;
        const batches = [];
        
        for (let i = 0; i < updates.length; i += batchSize) {
            batches.push(updates.slice(i, i + batchSize));
        }
        
        // Process each batch with a small delay to prevent blocking UI
        let batchIndex = 0;
        const processBatch = () => {
            if (batchIndex >= batches.length) return;
            
            const batch = batches[batchIndex];
            requestAnimationFrame(() => {
                batch.forEach(update => {
                    this.updateProviderStatus(update);
                });
                
                batchIndex++;
                if (batchIndex < batches.length) {
                    setTimeout(processBatch, 10); // Small delay between batches
                }
            });
        };
        
        processBatch();
    },
    
    /**
     * Show enhanced update notification with timing information
     */
    showUpdateNotification(message, type = 'info', duration = 5000) {
        if (!this.$lastUpdateIndicator || !this.$lastUpdateIndicator.length) {
            return;
        }
        
        const $indicator = this.$lastUpdateIndicator;
        const $header = $indicator.find('.header');
        const $statusMessage = $indicator.find('.status-message');
        const $timeInfo = $indicator.find('.last-check-time');
        
        // Update classes for styling
        $indicator
            .removeClass('hidden info success error warning')
            .addClass(type);
        
        // Set appropriate header based on type
        const headers = {
            'info': globalTranslate.pr_StatusInfo || 'Status Info',
            'success': globalTranslate.pr_StatusUpdated || 'Status Updated',
            'error': globalTranslate.pr_StatusError || 'Status Error',
            'warning': globalTranslate.pr_StatusWarning || 'Status Warning'
        };
        
        $header.text(headers[type] || 'Status');
        $statusMessage.text(message);
        
        // Update timing information
        const now = new Date();
        $timeInfo.text(`Last check: ${now.toLocaleTimeString()}`);
        
        // Store update time
        this.lastUpdateTime = Date.now() / 1000;
        
        // Auto-hide with enhanced timing
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
     * Update last check time display
     */
    updateLastCheckTime(timestamp) {
        const date = new Date(timestamp * 1000);
        const timeStr = date.toLocaleTimeString();
        
        // Update any last check time displays
        $('.provider-last-check-time').text(timeStr);
    },
    
    
    /**
     * Request immediate status update with enhanced error handling
     */
    requestStatusUpdate() {
        // Show loading indicator
        this.showUpdateNotification(
            globalTranslate.pr_RequestingStatusUpdate || 'Requesting status update...',
            'info',
            3000
        );
        
        // Request status via REST API
        $.api({
            url: `${globalRootUrl}providers/api/statuses`,
            method: 'GET',
            data: {
                force: true // Force immediate update
            },
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    // Process the status data
                    this.updateAllProviderStatuses(response.data);
                    
                    // Show success notification
                    const providerCount = this.countProviders(response.data);
                    const message = globalTranslate.pr_StatusUpdateComplete
                        ? globalTranslate.pr_StatusUpdateComplete.replace('%s', providerCount)
                        : `Status updated for ${providerCount} providers`;
                    
                    this.showUpdateNotification(message, 'success');
                } else {
                    this.showUpdateNotification(
                        globalTranslate.pr_StatusUpdateFailed || 'Status update failed',
                        'error'
                    );
                }
            },
            onFailure: (response) => {
                const errorMessage = response.messages 
                    ? response.messages.join(', ')
                    : globalTranslate.pr_StatusUpdateError || 'Error updating provider status';
                    
                this.showUpdateNotification(errorMessage, 'error');
            },
            onError: () => {
                this.showUpdateNotification(
                    globalTranslate.pr_ConnectionError || 'Connection error',
                    'error'
                );
            }
        });
    },
    
    /**
     * Count total providers in status data
     */
    countProviders(statusData) {
        if (!statusData) return 0;
        
        let count = 0;
        if (statusData.sip) count += Object.keys(statusData.sip).length;
        if (statusData.iax) count += Object.keys(statusData.iax).length;
        if (!statusData.sip && !statusData.iax) count = Object.keys(statusData).length;
        
        return count;
    },
    
    /**
     * Get cached row element for provider
     */
    getCachedRow(providerId) {
        let $row = this.cachedRows.get(providerId);
        if (!$row || !$row.length) {
            $row = $(`#${providerId}`);
            if ($row.length) {
                this.cachedRows.set(providerId, $row);
            }
        }
        return $row;
    },
    
    /**
     * Show provider details modal/popup
     */
    showProviderDetails(providerId) {
        // Show loading state
        this.showUpdateNotification(
            globalTranslate.pr_LoadingProviderDetails || 'Loading provider details...',
            'info',
            2000
        );
        
        // Fetch fresh details from API
        $.api({
            url: `${globalRootUrl}providers/api/status/${providerId}`,
            method: 'GET',
            on: 'now',
            onSuccess: (response) => {
                if (response.result && response.data) {
                    // Create detailed status modal content
                    const modalContent = this.buildStatusDetailsModal(providerId, response.data);
                    
                    // Remove any existing modal
                    $('#provider-status-details-modal').remove();
                    
                    // Show modal using Fomantic UI
                    $('body').append(modalContent);
                    $('#provider-status-details-modal')
                        .modal({
                            closable: true,
                            onHidden: function() {
                                $(this).remove();
                            }
                        })
                        .modal('show');
                } else {
                    this.showUpdateNotification(
                        globalTranslate.pr_NoStatusInfo || 'No status information available',
                        'warning'
                    );
                }
            },
            onFailure: () => {
                this.showUpdateNotification(
                    globalTranslate.pr_FailedToLoadDetails || 'Failed to load provider details',
                    'error'
                );
            }
        });
    },
    
    /**
     * Build detailed status modal content
     */
    buildStatusDetailsModal(providerId, statusInfo) {
        const {
            uniqid,
            description,
            host,
            username,
            state,
            stateDescription,
            stateColor,
            stateDuration,
            lastSuccessTime,
            timeSinceLastSuccess,
            successDuration,
            failureDuration,
            rtt,
            statistics,
            recentEvents,
            lastUpdateFormatted,
            stateStartTimeFormatted
        } = statusInfo;
        
        // Build statistics section
        let statsHtml = '';
        if (statistics) {
            const { totalChecks, successCount, failureCount, availability, averageRtt, minRtt, maxRtt } = statistics;
            
            if (totalChecks > 0) {
                statsHtml = `
                <div class="ui segment">
                    <h4>${globalTranslate.pr_Statistics || 'Statistics'}</h4>
                    <div class="ui four column grid">
                        <div class="column">
                            <div class="ui tiny statistic">
                                <div class="value">${totalChecks}</div>
                                <div class="label">${globalTranslate.pr_TotalChecks || 'Total Checks'}</div>
                            </div>
                        </div>
                        <div class="column">
                            <div class="ui tiny green statistic">
                                <div class="value">${successCount}</div>
                                <div class="label">${globalTranslate.pr_Success || 'Success'}</div>
                            </div>
                        </div>
                        <div class="column">
                            <div class="ui tiny red statistic">
                                <div class="value">${failureCount}</div>
                                <div class="label">${globalTranslate.pr_Failures || 'Failures'}</div>
                            </div>
                        </div>
                        <div class="column">
                            <div class="ui tiny ${availability >= 99 ? 'green' : availability >= 95 ? 'yellow' : 'red'} statistic">
                                <div class="value">${availability}%</div>
                                <div class="label">${globalTranslate.pr_Availability || 'Availability'}</div>
                            </div>
                        </div>
                    </div>
                    ${averageRtt !== null ? `
                    <div class="ui divider"></div>
                    <div class="ui three column grid">
                        <div class="column">
                            <strong>${globalTranslate.pr_AverageRTT || 'Average RTT'}:</strong> ${averageRtt} ms
                        </div>
                        <div class="column">
                            <strong>${globalTranslate.pr_MinRTT || 'Min RTT'}:</strong> ${minRtt} ms
                        </div>
                        <div class="column">
                            <strong>${globalTranslate.pr_MaxRTT || 'Max RTT'}:</strong> ${maxRtt} ms
                        </div>
                    </div>` : ''}
                </div>`;
            }
        }
        
        // Build recent events section
        let eventsHtml = '';
        if (recentEvents && recentEvents.length > 0) {
            const eventRows = recentEvents.slice(0, 5).map(event => {
                const eventType = event.type === 'error' ? 'red' : event.type === 'warning' ? 'yellow' : 'green';
                const eventText = globalTranslate[event.event] || event.event || event.state;
                return `
                    <tr>
                        <td><i class="${eventType} circle icon"></i></td>
                        <td>${event.date}</td>
                        <td>${eventText}</td>
                        <td>${event.state}</td>
                    </tr>
                `;
            }).join('');
            
            eventsHtml = `
            <div class="ui segment">
                <h4>${globalTranslate.pr_RecentEvents || 'Recent Events'}</h4>
                <table class="ui very basic compact table">
                    <tbody>
                        ${eventRows}
                    </tbody>
                </table>
            </div>`;
        }
        
        return `
            <div id="provider-status-details-modal" class="ui large modal">
                <div class="header">
                    <i class="${stateColor} circle icon"></i>
                    ${description || uniqid}
                </div>
                <div class="content">
                    <div class="ui segments">
                        <div class="ui segment">
                            <h4>${globalTranslate.pr_ProviderInfo || 'Provider Information'}</h4>
                            <div class="ui two column grid">
                                <div class="column">
                                    <div class="ui list">
                                        <div class="item">
                                            <strong>${globalTranslate.pr_ProviderId || 'Provider ID'}:</strong> ${uniqid}
                                        </div>
                                        <div class="item">
                                            <strong>${globalTranslate.pr_Host || 'Host'}:</strong> ${host}
                                        </div>
                                        <div class="item">
                                            <strong>${globalTranslate.pr_Username || 'Username'}:</strong> ${username}
                                        </div>
                                    </div>
                                </div>
                                <div class="column">
                                    <div class="ui list">
                                        <div class="item">
                                            <strong>${globalTranslate.pr_CurrentState || 'Current State'}:</strong> 
                                            <span class="ui ${stateColor} text">${globalTranslate[stateDescription] || state}</span>
                                        </div>
                                        <div class="item">
                                            <strong>${globalTranslate.pr_StateDuration || 'State Duration'}:</strong> 
                                            ${this.formatDuration(stateDuration)}
                                        </div>
                                        ${rtt !== null && rtt !== undefined ? `
                                        <div class="item">
                                            <strong>${globalTranslate.pr_CurrentRTT || 'Current RTT'}:</strong> 
                                            <span style="color: ${rtt > 200 ? 'red' : rtt > 100 ? 'orange' : 'green'}">
                                                ${rtt} ms
                                            </span>
                                        </div>` : ''}
                                    </div>
                                </div>
                            </div>
                            ${lastSuccessTime ? `
                            <div class="ui divider"></div>
                            <div class="ui two column grid">
                                <div class="column">
                                    <strong>${globalTranslate.pr_LastSuccess || 'Last Success'}:</strong> 
                                    ${this.formatTimeAgo(lastSuccessTime)}
                                </div>
                                <div class="column">
                                    <strong>${globalTranslate.pr_LastUpdate || 'Last Update'}:</strong> 
                                    ${lastUpdateFormatted || new Date().toLocaleString()}
                                </div>
                            </div>` : ''}
                        </div>
                        ${statsHtml}
                        ${eventsHtml}
                    </div>
                </div>
                <div class="actions">
                    <button class="ui button" onclick="window.location.href='${globalRootUrl}providers/modify/${uniqid}'">
                        <i class="edit icon"></i>
                        ${globalTranslate.pr_EditProvider || 'Edit Provider'}
                    </button>
                    <button class="ui primary button" onclick="ProviderStatusMonitor.requestProviderCheck('${uniqid}')">
                        <i class="sync icon"></i>
                        ${globalTranslate.pr_CheckNow || 'Check Now'}
                    </button>
                    <div class="ui cancel button">
                        ${globalTranslate.pr_Close || 'Close'}
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Request immediate check for specific provider
     */
    requestProviderCheck(providerId) {
        $.api({
            url: `${globalRootUrl}providers/api/status/${providerId}`,
            method: 'GET',
            data: {
                forceCheck: true,
                refreshFromAmi: true
            },
            on: 'now',
            onSuccess: (response) => {
                if (response.result) {
                    this.showUpdateNotification(
                        globalTranslate.pr_CheckRequested || 'Check requested',
                        'success',
                        2000
                    );
                    
                    // Update modal with fresh data if still open
                    if ($('#provider-status-details-modal').length && response.data) {
                        $('#provider-status-details-modal').modal('hide');
                        // Show updated modal with fresh data
                        setTimeout(() => {
                            const modalContent = this.buildStatusDetailsModal(providerId, response.data);
                            $('#provider-status-details-modal').remove();
                            $('body').append(modalContent);
                            $('#provider-status-details-modal')
                                .modal({
                                    closable: true,
                                    onHidden: function() {
                                        $(this).remove();
                                    }
                                })
                                .modal('show');
                        }, 500);
                    }
                }
            },
            onFailure: () => {
                this.showUpdateNotification(
                    globalTranslate.pr_CheckFailed || 'Check failed',
                    'error',
                    3000
                );
            }
        });
    }
};

// Enhanced initialization with user interaction support
$(document).ready(() => {
    // Add manual refresh button if not exists
    if ($('.provider-refresh-btn').length === 0 && $('.ui.container.segment').length) {
        const refreshButton = `
            <button class="ui mini labeled icon button provider-refresh-btn" 
                    style="position: absolute; top: 10px; right: 10px; z-index: 100;">
                <i class="sync icon"></i>
                ${globalTranslate.pr_RefreshStatus || 'Refresh Status'}
            </button>
        `;
        $('.ui.container.segment').css('position', 'relative').append(refreshButton);
        
        // Add click handler for refresh button
        $('.provider-refresh-btn').on('click', (e) => {
            e.preventDefault();
            if (typeof ProviderStatusMonitor !== 'undefined') {
                ProviderStatusMonitor.requestStatusUpdate();
            }
        });
    }
    
    // Add double-click handlers for status cells to show details modal
    $(document).on('dblclick', '.provider-status .ui.label', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const providerId = $(this).closest('tr').attr('id');
        if (providerId && typeof ProviderStatusMonitor !== 'undefined') {
            ProviderStatusMonitor.showProviderDetails(providerId);
        }
    });
    
    // Clean up modals when they're hidden
    $(document).on('hidden.bs.modal', '#provider-status-details-modal', function() {
        $(this).remove();
    });
});

// Don't auto-initialize the monitor here - let providers-index.js handle it
// This allows for proper sequencing with DataTable initialization

// Export for use in other modules
window.ProviderStatusMonitor = ProviderStatusMonitor;