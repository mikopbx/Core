/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalTranslate, PbxApi, DebuggerInfo, EventBus, globalRootUrl, ProvidersAPI, SipProvidersAPI, IaxProvidersAPI */

/**
 * Provider Status Worker for Modify Page
 * Handles real-time provider status updates via EventBus for individual provider edit pages
 * Replaces the old polling-based approach with efficient EventBus subscription
 *
 * @module providerModifyStatusWorker
 */
const providerModifyStatusWorker = {

    /**
     * jQuery object for the form
     * @type {jQuery}
     */
    $formObj: $('#save-provider-form'),

    /**
     * jQuery object for the status label
     * @type {jQuery}
     */
    $status: $('#status'),

    /**
     * Provider type determined from the page URL
     * @type {string}
     */
    providerType: '',
    
    /**
     * Current provider id
     * @type {string}
     */
    providerId: '',
    
    /**
     * EventBus subscription status
     * @type {boolean}
     */
    isSubscribed: false,
    
    /**
     * Last known provider status
     * @type {Object}
     */
    lastStatus: null,
    
    /**
     * Diagnostics tab initialized flag
     * @type {boolean}
     */
    diagnosticsInitialized: false,
    
    /**
     * History DataTable instance
     * @type {Object}
     */
    historyTable: null,
    
    /**
     * Current status data for diagnostics
     * @type {Object}
     */
    statusData: null,

    /**
     * Initialize the provider status worker with EventBus subscription
     */
    initialize() {
        // Determine provider type and uniqid
        if (window.location.pathname.includes('modifysip')) {
            this.providerType = 'sip';
        } else if (window.location.pathname.includes('modifyiax')) {
            this.providerType = 'iax';
        } else {
            return;
        }
        
        // Get provider id from form
        this.providerId = this.$formObj.form('get value', 'id');
        if (!this.providerId) {
            return;
        }
        
        // Initialize debugger info
        if (typeof DebuggerInfo !== 'undefined') {
            DebuggerInfo.initialize();
        }
        
        // Subscribe to EventBus for real-time updates
        this.subscribeToEventBus();
        
        // Request initial status
        this.requestInitialStatus();
        
        // Set up form change detection to refresh status
        this.setupFormChangeDetection();
    },
    
    /**
     * Subscribe to EventBus for provider status updates
     */
    subscribeToEventBus() {
        if (typeof EventBus === 'undefined') {
            this.startPeriodicUpdate();
            return;
        }
        
        EventBus.subscribe('provider-status', (message) => {
            this.handleEventBusMessage(message);
        });
        
        this.isSubscribed = true;
    },
    
    /**
     * Handle EventBus message for provider status updates
     */
    handleEventBusMessage(message) {
        if (!message || !message.data) {
            return;
        }
        
        // Extract event and data
        let event, data;
        if (message.event) {
            event = message.event;
            data = message.data;
        } else if (message.data.event) {
            event = message.data.event;
            data = message.data.data || message.data;
        } else {
            return;
        }
        
        switch (event) {
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
                // Ignore other events
        }
    },
    
    /**
     * Process status update with changes
     */
    processStatusUpdate(data) {
        if (!data.changes || !Array.isArray(data.changes)) {
            return;
        }
        
        // Find status change for our specific provider
        const relevantChange = data.changes.find(change => 
            change.provider_id === this.providerId || change.id === this.providerId
        );
        
        if (relevantChange) {
            this.updateStatusDisplay(relevantChange);
        }
    },
    
    /**
     * Process complete status data
     */
    processCompleteStatus(data) {
        if (!data.statuses) {
            return;
        }
        
        // Look for our provider in the status data
        const providerStatus = data.statuses[this.providerType]?.[this.providerId] ||
                              data.statuses[this.providerId];
        
        if (providerStatus) {
            this.updateStatusDisplay(providerStatus);
        }
    },
    
    /**
     * Handle status error
     */
    handleStatusError(data) {
        // Show error state
        this.$status
            .removeClass('green yellow grey loading')
            .addClass('red');
            
        const errorText = globalTranslate.pr_StatusError;
        this.$status.html(`<i class="exclamation triangle icon"></i> ${errorText}`);
    },
    
    /**
     * Update status display using backend-provided properties or fallback
     */
    updateStatusDisplay(statusData) {
        if (!statusData) {
            return;
        }
        
        // Store last status for debugging
        this.lastStatus = statusData;
        
        // Save status data for diagnostics
        this.statusData = statusData;
        
        // Update DebuggerInfo if available
        if (typeof DebuggerInfo !== 'undefined') {
            const debugInfo = {
                id: this.providerId,
                type: this.providerType,
                state: statusData.state || statusData.new_state,
                stateColor: statusData.stateColor,
                stateText: statusData.stateText,
                timestamp: new Date().toISOString()
            };
            
            const htmlTable = `
                <table class="ui very compact table">
                    <tr><td>Provider</td><td>${debugInfo.id}</td></tr>
                    <tr><td>Type</td><td>${debugInfo.type}</td></tr>
                    <tr><td>State</td><td>${debugInfo.state}</td></tr>
                    <tr><td>Color</td><td>${debugInfo.stateColor}</td></tr>
                    <tr><td>Updated</td><td>${debugInfo.timestamp}</td></tr>
                </table>
            `;
            DebuggerInfo.UpdateContent(htmlTable);
        }
        
        // Use backend-provided display properties if available
        if (statusData.stateColor && statusData.stateText) {
            this.updateStatusWithBackendProperties(statusData);
        } else {
            // Fallback to legacy state-based update
            this.updateStatusLegacy(statusData);
        }
        
        // Update diagnostics display if initialized
        if (this.diagnosticsInitialized) {
            this.updateDiagnosticsDisplay(statusData);
        }
    },
    
    /**
     * Update status using backend-provided display properties
     */
    updateStatusWithBackendProperties(statusData) {
        const { stateColor, stateIcon, stateText, stateDescription, state } = statusData;
        
        // Apply color class
        this.$status
            .removeClass('green yellow grey red loading')
            .addClass(stateColor);
        
        // Build status content with icon and translated text
        let statusContent = '';
        if (stateIcon) {
            statusContent += `<i class="${stateIcon} icon"></i> `;
        }
        
        // Use translated text or fallback
        const displayText = globalTranslate[stateText] || stateText || state || 'Unknown';
        statusContent += displayText;
        
        this.$status.html(statusContent);
    },
    
    /**
     * Legacy status update for backward compatibility
     */
    updateStatusLegacy(statusData) {
        const state = statusData.state || statusData.new_state || '';
        const normalizedState = state.toUpperCase();
        
        // Remove loading class and update based on state
        this.$status.removeClass('loading');
        
        switch (normalizedState) {
            case 'REGISTERED':
            case 'OK':
            case 'REACHABLE':
                this.$status
                    .removeClass('grey yellow red')
                    .addClass('green')
                    .html(`<i class="checkmark icon"></i> ${globalTranslate.pr_Online}`);
                break;
                
            case 'UNREACHABLE':
            case 'LAGGED':
                this.$status
                    .removeClass('green grey red')
                    .addClass('yellow')
                    .html(`<i class="exclamation triangle icon"></i> ${globalTranslate.pr_WithoutRegistration}`);
                break;
                
            case 'OFF':
            case 'UNMONITORED':
                this.$status
                    .removeClass('green yellow red')
                    .addClass('grey')
                    .html(`<i class="minus icon"></i> ${globalTranslate.pr_Offline}`);
                break;
                
            case 'REJECTED':
            case 'UNREGISTERED':
            case 'FAILED':
                this.$status
                    .removeClass('green yellow red')
                    .addClass('grey')
                    .html(`<i class="times icon"></i> ${globalTranslate.pr_Offline}`);
                break;
                
            default:
                this.$status
                    .removeClass('green yellow red')
                    .addClass('grey')
                    .html(`<i class="question icon"></i> ${state || 'Unknown'}`);
                break;
        }
    },
    
    /**
     * Request initial status for the provider
     */
    requestInitialStatus() {
        // Show loading state
        this.$status
            .removeClass('green yellow grey red')
            .addClass('loading')
            .html(`<i class="spinner loading icon"></i> ${globalTranslate.pr_CheckingStatus}`);
        
        // Request status for this specific provider via REST API v3
        ProvidersAPI.getStatus(this.providerId, (response) => {
            this.$status.removeClass('loading');
            
            if (response && response.result && response.data) {
                // Update display with the provider status
                this.updateStatusDisplay(response.data);
            } else if (response && !response.result) {
                // Provider not found or error
                this.$status
                    .removeClass('green yellow red')
                    .addClass('grey')
                    .html(`<i class="question icon"></i> ${globalTranslate.pr_NotFound}`);
            } else {
                this.handleRequestError('Invalid response format');
            }
        });
    },
    
    /**
     * Handle request errors
     */
    handleRequestError(error) {
        this.$status
            .removeClass('loading green yellow grey')
            .addClass('red')
            .html(`<i class="exclamation triangle icon"></i> ${globalTranslate.pr_ConnectionError}`);
    },
    
    /**
     * Setup form change detection to refresh status when provider settings change
     */
    setupFormChangeDetection() {
        // Monitor key fields that might affect provider status
        const keyFields = ['host', 'username', 'secret', 'disabled'];
        
        keyFields.forEach(fieldName => {
            const $field = this.$formObj.find(`[name="${fieldName}"]`);
            if ($field.length) {
                $field.on('change blur', () => {
                    // Debounce status requests
                    clearTimeout(this.changeTimeout);
                    this.changeTimeout = setTimeout(() => {
                        if (this.providerId) { // Only request if we have a valid provider ID
                            this.requestInitialStatus();
                        }
                    }, 1000);
                });
            }
        });
    },
    
    /**
     * Fallback periodic update for when EventBus is not available
     */
    startPeriodicUpdate() {
        this.periodicInterval = setInterval(() => {
            this.requestInitialStatus();
        }, 5000); // Check every 5 seconds as fallback
    },
    
    /**
     * Initialize diagnostics tab functionality
     */
    initializeDiagnosticsTab() {
        if (this.diagnosticsInitialized) {
            return;
        }
        
        // Initialize timeline
        this.initializeTimeline();
        
        // Force check button handler
        const $checkBtn = $('#check-now-btn');
        $checkBtn.off('click').on('click', () => {
            $checkBtn.addClass('loading');
            
            // Use the appropriate API client based on provider type
            const apiClient = this.providerType === 'sip' ? SipProvidersAPI : IaxProvidersAPI;
            
            // Call forceCheck using v3 API
            apiClient.forceCheck(this.providerId, (response) => {
                $checkBtn.removeClass('loading');
                if (response.result && response.data) {
                    this.updateStatusDisplay(response.data);
                    this.loadTimelineData();
                }
            });
        });
        
        // Export history button handler
        $('#export-history-btn').off('click').on('click', () => {
            this.exportHistoryToCSV();
        });
        
        // Display current status if available
        if (this.statusData) {
            this.updateDiagnosticsDisplay(this.statusData);
        }
        
        this.diagnosticsInitialized = true;
    },
    
    /**
     * Initialize timeline visualization
     */
    initializeTimeline() {
        // Load timeline data
        this.loadTimelineData();
    },
    
    /**
     * Load timeline data from history
     */
    loadTimelineData() {
        // Use the appropriate API client based on provider type
        const apiClient = this.providerType === 'sip' ? SipProvidersAPI : IaxProvidersAPI;
        
        // Call getHistory using v3 API
        apiClient.getHistory(this.providerId, (response) => {
            if (response.result && response.data && response.data.events) {
                this.renderTimeline(response.data.events);
            }
            $('#timeline-loader').removeClass('active');
        });
    },
    
    /**
     * Render timeline visualization
     */
    renderTimeline(events) {
        const $timeline = $('#provider-timeline');
        const $container = $('#provider-timeline-container');
        
        if (!$timeline.length || !events || events.length === 0) {
            return;
        }
        
        // Clear existing timeline
        $timeline.empty();
        
        // Get time range (last 24 hours)
        const now = Math.floor(Date.now() / 1000);
        const dayAgo = now - (24 * 60 * 60);
        const timeRange = 24 * 60 * 60; // 24 hours in seconds
        
        // Group events by time segments (15 minute segments)
        const segmentDuration = 15 * 60; // 15 minutes in seconds
        const segments = Math.ceil(timeRange / segmentDuration);
        const segmentData = new Array(segments).fill(null);
        const segmentEvents = new Array(segments).fill(null).map(() => []);
        
        // Process events and store them in segments
        events.forEach(event => {
            if (event.timestamp && event.timestamp >= dayAgo) {
                const segmentIndex = Math.floor((event.timestamp - dayAgo) / segmentDuration);
                if (segmentIndex >= 0 && segmentIndex < segments) {
                    // Store event in segment
                    segmentEvents[segmentIndex].push(event);
                    
                    // Prioritize worse states
                    const currentState = segmentData[segmentIndex];
                    const newState = this.getStateColor(event.state || event.new_state);
                    
                    if (!currentState || this.getStatePriority(newState) > this.getStatePriority(currentState)) {
                        segmentData[segmentIndex] = newState;
                    }
                }
            }
        });
        
        // Fill in gaps with last known state
        let lastKnownState = 'grey';
        let lastKnownEvent = null;
        for (let i = 0; i < segments; i++) {
            if (segmentData[i]) {
                lastKnownState = segmentData[i];
                if (segmentEvents[i].length > 0) {
                    lastKnownEvent = segmentEvents[i][segmentEvents[i].length - 1];
                }
            } else {
                segmentData[i] = lastKnownState;
                // Copy last known event for tooltip
                if (lastKnownEvent && segmentEvents[i].length === 0) {
                    segmentEvents[i] = [{...lastKnownEvent, inherited: true}];
                }
            }
        }
        
        // Render segments
        const segmentWidth = 100 / segments;
        segmentData.forEach((color, index) => {
            const tooltipContent = this.getSegmentTooltipWithEvents(index, segmentDuration, segmentEvents[index]);
            
            const $segment = $('<div>')
                .css({
                    'width': `${segmentWidth}%`,
                    'height': '100%',
                    'background-color': this.getColorHex(color),
                    'box-sizing': 'border-box',
                    'cursor': 'pointer'
                })
                .attr('data-html', tooltipContent)
                .attr('data-position', 'top center')
                .attr('data-variation', 'mini');
            
            $timeline.append($segment);
        });
        
        // Initialize tooltips with HTML content
        $timeline.find('[data-html]').popup({
            variation: 'mini',
            hoverable: true,
            html: true
        });
    },
    
    /**
     * Get state color class
     */
    getStateColor(state) {
        const normalizedState = (state || '').toUpperCase();
        switch (normalizedState) {
            case 'REGISTERED':
            case 'OK':
            case 'REACHABLE':
                return 'green';
            case 'UNREACHABLE':
            case 'LAGGED':
                return 'yellow';
            case 'OFF':
            case 'REJECTED':
            case 'UNREGISTERED':
            case 'FAILED':
                return 'red';
            default:
                return 'grey';
        }
    },
    
    /**
     * Get state priority for conflict resolution
     */
    getStatePriority(color) {
        switch (color) {
            case 'red': return 3;
            case 'yellow': return 2;
            case 'green': return 1;
            default: return 0;
        }
    },
    
    /**
     * Get hex color code
     */
    getColorHex(color) {
        switch (color) {
            case 'green': return '#21ba45';
            case 'yellow': return '#fbbd08';
            case 'red': return '#db2828';
            default: return '#767676';
        }
    },
    
    /**
     * Get segment tooltip text
     */
    getSegmentTooltip(segmentIndex, segmentDuration) {
        const hoursAgo = Math.floor((96 - segmentIndex - 1) * segmentDuration / 3600);
        const minutesAgo = Math.floor(((96 - segmentIndex - 1) * segmentDuration % 3600) / 60);
        
        if (hoursAgo > 0) {
            return `${hoursAgo}ч ${minutesAgo}м назад`;
        } else {
            return `${minutesAgo}м назад`;
        }
    },
    
    /**
     * Get segment tooltip with events details
     */
    getSegmentTooltipWithEvents(segmentIndex, segmentDuration, events) {
        const segmentStartTime = (segmentIndex * segmentDuration);
        const segmentEndTime = ((segmentIndex + 1) * segmentDuration);
        const now = Math.floor(Date.now() / 1000);
        const dayAgo = now - (24 * 60 * 60);
        
        // Calculate time range for this segment
        const startTime = new Date((dayAgo + segmentStartTime) * 1000);
        const endTime = new Date((dayAgo + segmentEndTime) * 1000);
        
        let html = '<div style="text-align: left; min-width: 200px;">';
        
        // Time range header
        html += `<div style="font-weight: bold; margin-bottom: 5px;">`;
        html += `${startTime.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})} - `;
        html += `${endTime.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}`;
        html += `</div>`;
        
        // Events in this segment
        if (events && events.length > 0) {
            html += '<div style="border-top: 1px solid #ddd; margin-top: 5px; padding-top: 5px;">';
            
            // Sort events by timestamp (newest first)
            const sortedEvents = [...events].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            // Show up to 3 events
            const displayEvents = sortedEvents.slice(0, 3);
            
            displayEvents.forEach(event => {
                const eventTime = new Date(event.timestamp * 1000);
                const state = event.state || event.new_state || 'unknown';
                // Capitalize first letter of state for translation key
                const capitalizeFirst = (str) => {
                    if (!str) return str;
                    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
                };
                const stateText = globalTranslate[`pr_ProviderState${capitalizeFirst(state)}`] || state;
                const color = this.getColorHex(this.getStateColor(state));
                
                html += '<div style="margin: 3px 0; font-size: 12px;">';
                html += `<span style="color: #666;">${eventTime.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit', second: '2-digit'})}</span> `;
                html += `<span style="color: ${color}; font-weight: bold;">● ${stateText}</span>`;
                
                // Add RTT if available
                if (event.rtt) {
                    html += ` <span style="color: #999;">(${event.rtt}ms)</span>`;
                }
                
                // Mark inherited states
                if (event.inherited) {
                    html += ' <span style="color: #999; font-style: italic;">(продолжается)</span>';
                }
                
                html += '</div>';
            });
            
            if (sortedEvents.length > 3) {
                html += `<div style="color: #999; font-size: 11px; margin-top: 3px;">и еще ${sortedEvents.length - 3} событий...</div>`;
            }
            
            html += '</div>';
        } else {
            html += '<div style="color: #999; font-size: 12px; margin-top: 5px;">Нет событий в этом периоде</div>';
        }
        
        html += '</div>';
        
        return html;
    },
    
    /**
     * Update diagnostics display with status information
     */
    updateDiagnosticsDisplay(statusInfo) {
        // Update RTT
        const $rtt = $('#provider-rtt-value');
        const $rttContainer = $rtt.parent();
        if ($rtt.length) {
            if (statusInfo.rtt !== null && statusInfo.rtt !== undefined) {
                const rttColor = statusInfo.rtt > 200 ? '#db2828' : statusInfo.rtt > 100 ? '#fbbd08' : '#21ba45';
                $rtt.text(`${statusInfo.rtt} ${globalTranslate.pr_Milliseconds}`);
                $rttContainer.css('color', rttColor);
            } else {
                $rtt.text('--');
                $rttContainer.css('color', '#767676');
            }
        }
        
        // Update state duration and label
        const $duration = $('#provider-duration-value');
        const $stateLabel = $('#provider-state-label');
        const $durationContainer = $duration.parent();
        
        if ($duration.length && statusInfo.stateDuration) {
            $duration.text(this.formatDuration(statusInfo.stateDuration));
        }
        
        // Update state label with actual state text
        if ($stateLabel.length) {
            const stateText = globalTranslate[statusInfo.stateText] || 
                            statusInfo.stateText ||
                            statusInfo.state ||
                            globalTranslate.pr_CurrentState;
            $stateLabel.text(stateText);
        }
        
        // Apply state color to the duration value and label
        if ($durationContainer.length && statusInfo.stateColor) {
            const colorHex = this.getColorHex(statusInfo.stateColor);
            $durationContainer.css('color', colorHex);
        }
        
        // Update statistics if available
        if (statusInfo.statistics) {
            const stats = statusInfo.statistics;
            const $availability = $('#provider-availability-value');
            if ($availability.length) {
                $availability.text(stats.availability ? `${stats.availability}%` : '--');
            }
            
            const $checks = $('#provider-checks-value');
            if ($checks.length) {
                $checks.text(stats.totalChecks || '0');
            }
        }
    },
    
    /**
     * Export history to CSV file
     */
    exportHistoryToCSV() {
        const $btn = $('#export-history-btn');
        $btn.addClass('loading');
        
        // Get provider details
        const providerInfo = {
            host: this.$formObj.form('get value', 'host'),
            username: this.$formObj.form('get value', 'username'),
            description: this.$formObj.form('get value', 'description')
        };
        
        // Use the appropriate API client based on provider type
        const apiClient = this.providerType === 'sip' ? SipProvidersAPI : IaxProvidersAPI;

        // Fetch history data using v3 API
        apiClient.getHistory(this.providerId, (response) => {
            $btn.removeClass('loading');
            if (response.result && response.data && response.data.events) {
                this.downloadCSV(response.data.events, {
                    providerId: this.providerId,
                    providerType: this.providerType.toUpperCase(),
                    ...providerInfo
                });
            } else if (!response.result) {
                UserMessage.showError(globalTranslate.pr_ExportFailed);
            }
        });
    },
    
    /**
     * Convert events to CSV and trigger download
     */
    downloadCSV(events, providerInfo) {
        if (!events || events.length === 0) {
            UserMessage.showWarning(globalTranslate.pr_NoHistoryToExport);
            return;
        }
        
        // Technical headers without translations
        const headers = [
            'timestamp',
            'datetime',
            'provider_id',
            'provider_type',
            'provider_host',
            'provider_username',
            'provider_description',
            'event',
            'event_type',
            'previous_state',
            'new_state',
            'rtt_ms',
            'peer_status',
            'qualify_freq',
            'qualify_time',
            'register_status',
            'contact',
            'user_agent',
            'last_registration',
            'details',
            'error_message',
            'raw_data'
        ];
        
        // Convert events to CSV rows with all technical data
        const rows = events.map(event => {
            // Extract all available fields from the event
            return [
                event.timestamp || '',
                event.datetime || '',
                providerInfo.providerId || '',
                providerInfo.providerType || '',
                providerInfo.host || '',
                providerInfo.username || '',
                providerInfo.description || '',
                event.event || '',
                event.type || '',
                event.previousState || event.previous_state || '',
                event.state || event.new_state || '',
                event.rtt || '',
                event.peerStatus || event.peer_status || '',
                event.qualifyFreq || event.qualify_freq || '',
                event.qualifyTime || event.qualify_time || '',
                event.registerStatus || event.register_status || '',
                event.contact || '',
                event.userAgent || event.user_agent || '',
                event.lastRegistration || event.last_registration || '',
                event.details || '',
                event.error || event.errorMessage || '',
                JSON.stringify(event) // Include complete raw data
            ];
        });
        
        // Create CSV content with BOM for proper UTF-8 encoding in Excel
        const BOM = '\uFEFF';
        let csvContent = BOM;
        
        // Add metadata header
        csvContent += `# Provider Export: ${providerInfo.providerId} (${providerInfo.providerType})\n`;
        csvContent += `# Host: ${providerInfo.host}\n`;
        csvContent += `# Username: ${providerInfo.username}\n`;
        csvContent += `# Description: ${providerInfo.description}\n`;
        csvContent += `# Export Date: ${new Date().toISOString()}\n`;
        csvContent += `# Total Events: ${events.length}\n`;
        csvContent += '\n';
        
        // Add column headers
        csvContent += headers.join(',') + '\n';
        
        // Add data rows
        rows.forEach(row => {
            csvContent += row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma, newline, or quotes
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"') || cellStr.includes('#')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',') + '\n';
        });
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Generate filename with provider ID and timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `provider_${providerInfo.providerId}_${providerInfo.providerType}_${timestamp}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    },
    
    /**
     * Format duration in seconds to human-readable format with localization
     */
    formatDuration(seconds) {
        if (!seconds) return '--';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        // Use localized units
        const dayUnit = globalTranslate.pr_Days;
        const hourUnit = globalTranslate.pr_Hours;
        const minuteUnit = globalTranslate.pr_Minutes;
        const secondUnit = globalTranslate.pr_Seconds;
        
        if (days > 0) {
            return `${days}${dayUnit} ${hours}${hourUnit} ${minutes}${minuteUnit}`;
        } else if (hours > 0) {
            return `${hours}${hourUnit} ${minutes}${minuteUnit} ${secs}${secondUnit}`;
        } else if (minutes > 0) {
            return `${minutes}${minuteUnit} ${secs}${secondUnit}`;
        } else {
            return `${secs}${secondUnit}`;
        }
    },
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.changeTimeout) {
            clearTimeout(this.changeTimeout);
        }
        
        if (this.periodicInterval) {
            clearInterval(this.periodicInterval);
        }
        
        // Unsubscribe from EventBus if subscribed
        if (this.isSubscribed && typeof EventBus !== 'undefined') {
            EventBus.unsubscribe('provider-status');
            this.isSubscribed = false;
        }
    }

};

// Initialize the provider status worker when document is ready
$(document).ready(() => {
    providerModifyStatusWorker.initialize();
});

// Clean up on page unload
$(window).on('beforeunload', () => {
    providerModifyStatusWorker.destroy();
});

// Export for external access
window.providerModifyStatusWorker = providerModifyStatusWorker;