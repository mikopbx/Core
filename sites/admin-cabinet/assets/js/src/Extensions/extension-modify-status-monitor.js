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

/* global globalRootUrl, globalTranslate, globalWebAdminLanguage, EventBus, SipAPI, FirewallAPI, UserMessage, SemanticLocalization */

/**
 * Extension Modify Status Monitor
 * Simplified status monitoring for extension modify page:
 * - Single API call on initialization
 * - Real-time updates via EventBus only
 * - No periodic polling
 * - Clean device list and history display
 */
const ExtensionModifyStatusMonitor = {
    channelId: 'extension-status',
    isInitialized: false,
    currentExtensionId: null,
    
    /**
     * jQuery objects
     */
    $statusLabel: null,
    $activeDevicesList: null,
    $deviceHistoryList: null,
    $securityTable: null,
    $noSecurityData: null,

    /**
     * Security data
     */
    securityData: {},
    bannedIps: {},

    /**
     * Update interval timer
     */
    updateTimer: null,

    /**
     * Initialize the extension status monitor
     */
    initialize() {
        if (this.isInitialized) {
            return;
        }

        // Get extension number from form
        this.currentExtensionId = this.extractExtensionId();
        if (!this.currentExtensionId) {
            return;
        }

        // Cache DOM elements
        this.cacheElements();

        // Subscribe to EventBus for real-time updates
        this.subscribeToEvents();

        // Make single initial API call
        this.loadInitialStatus();

        // Load security data
        this.loadSecurityData();

        // Start timer for updating online durations
        this.startDurationUpdateTimer();

        this.isInitialized = true;
    },
    
    /**
     * Extract extension ID from the form
     */
    extractExtensionId() {
        // First, try to get the phone number from form field (primary)
        const $numberField = $('input[name="number"]');
        if ($numberField.length && $numberField.val()) {
            // Try to get unmasked value if inputmask is applied
            let extensionNumber;
            
            // Check if inputmask is available and applied to the field
            if (typeof $numberField.inputmask === 'function') {
                try {
                    // Get unmasked value (only the actual input without mask characters)
                    extensionNumber = $numberField.inputmask('unmaskedvalue');
                } catch (e) {
                    // Fallback if inputmask method fails
                    extensionNumber = $numberField.val();
                }
            } else {
                extensionNumber = $numberField.val();
            }
            
            // Clean up the value - remove any remaining mask characters like underscore
            extensionNumber = extensionNumber.replace(/[^0-9]/g, '');
            
            // Only return if we have actual digits
            if (extensionNumber && extensionNumber.length > 0) {
                return extensionNumber;
            }
        }
        
        // Fallback to URL parameter
        const urlMatch = window.location.pathname.match(/\/extensions\/modify\/(\d+)/);
        if (urlMatch && urlMatch[1]) {
            // This is database ID, we need to wait for form to load
            // We'll get the actual extension number after form loads
            return null;
        }
        
        return null;
    },
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.$statusLabel = $('#status');
        this.$activeDevicesList = $('#active-devices-list');
        this.$deviceHistoryList = $('#device-history-list');
        this.$securityTable = $('#security-failed-auth-table');
        this.$noSecurityData = $('#no-security-data');
    },
    
    /**
     * Load initial status with single API call
     */
    loadInitialStatus() {
        // Re-check extension ID after form loads
        if (!this.currentExtensionId) {
            this.currentExtensionId = this.extractExtensionId();
            if (!this.currentExtensionId) {
                // Try again after delay (form might still be loading)
                setTimeout(() => this.loadInitialStatus(), 500);
                return;
            }
        }
        
        
        // Make single API call for current status
        SipAPI.getStatus(this.currentExtensionId, (response) => {
            if (response && response.result && response.data) {
                this.updateStatus(response.data);
            }
        });
        
        // Also load historical data
        this.loadHistoricalData();
    },
    
    /**
     * Load historical data from API
     */
    loadHistoricalData() {
        if (!this.currentExtensionId) {
            return;
        }

        // Fetch history from API
        SipAPI.getHistory(this.currentExtensionId, (response) => {
            if (response && response.result && response.data && response.data.history) {
                this.displayHistoricalData(response.data.history);
            }
        });
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

        // Refresh security data on config changes
        window.addEventListener('ConfigDataChanged', () => {
            this.loadSecurityData();
        });
    },
    
    /**
     * Handle EventBus message
     */
    handleEventBusMessage(message) {
        if (!message) {
            return;
        }
        
        // EventBus now sends data directly without double nesting
        const data = message;
        if (data.statuses && data.statuses[this.currentExtensionId]) {
            this.updateStatus(data.statuses[this.currentExtensionId]);
        }
    },
    
    /**
     * Update status display
     */
    updateStatus(statusData) {
        if (!statusData) {
            return;
        }
        
        // Update status label
        this.updateStatusLabel(statusData.status);
        
        // Update active devices
        this.updateActiveDevices(statusData.devices || []);
        
        // Don't add to history - history is loaded from API only
        // this.addToHistory(statusData);
    },
    
    /**
     * Update status label
     */
    updateStatusLabel(status) {
        if (!this.$statusLabel) {
            return;
        }
        
        const color = this.getColorForStatus(status);
        const label = globalTranslate[`ex_Status${status}`] || status;
        
        // Remove loading class and update content
        this.$statusLabel
            .removeClass('grey green red yellow loading')
            .addClass(color)
            .html(`${label}`);
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
     * Update active devices list
     */
    updateActiveDevices(devices) {
        if (!this.$activeDevicesList || !Array.isArray(devices)) {
            return;
        }

        if (devices.length === 0) {
            this.$activeDevicesList.html(`
                <div class="ui placeholder segment">
                    <div class="ui icon header">
                        <i class="desktop icon"></i>
                        ${globalTranslate.ex_NoActiveDevices}
                    </div>
                </div>
            `);
            return;
        }
        
        // Use list with teal labels like the old endpoint-list
        let devicesHtml = '<div class="ui list">';
        
        devices.forEach((device) => {
            const userAgent = device.user_agent || 'Unknown';
            const ip = device.ip || device.contact_ip || '-';
            const port = device.port || '';
            const ipDisplay = port ? `${ip}:${port}` : ip;
            const rtt = device.rtt !== null && device.rtt !== undefined 
                ? ` (${device.rtt.toFixed(2)} ms)` 
                : '';
            const id = `${userAgent}|${ip}`;
            
            devicesHtml += `
                <div class="item" data-id="${id}">
                    <div class="ui teal label">
                        ${userAgent}
                        <div class="detail">${ipDisplay}${rtt}</div>
                    </div>
                </div>
            `;
        });
        
        devicesHtml += '</div>';
        this.$activeDevicesList.html(devicesHtml);

        // Add click handler to copy IP address
        this.attachDeviceClickHandlers();
    },

    /**
     * Attach click handlers to device labels for IP copying
     */
    attachDeviceClickHandlers() {
        this.$activeDevicesList.find('.item .ui.label').on('click', function(e) {
            e.preventDefault();

            const $label = $(this);
            const $item = $label.closest('.item');
            const dataId = $item.data('id');

            if (!dataId) return;

            // Extract IP from data-id (format: "UserAgent|IP")
            const parts = dataId.split('|');
            const ip = parts[1];

            if (!ip || ip === '-') return;

            // Copy to clipboard using the same method as password widget
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(ip).then(() => {
                    // Show success feedback
                    $label.transition('pulse');

                    // Temporarily change the label color to indicate success
                    $label.removeClass('teal').addClass('green');
                    setTimeout(() => {
                        $label.removeClass('green').addClass('teal');
                    }, 1000);

                    // Show popup message
                    $label.popup({
                        content: `${globalTranslate.ex_IpCopied}: ${ip}`,
                        on: 'manual',
                        position: 'top center'
                    }).popup('show');

                    setTimeout(() => {
                        $label.popup('hide').popup('destroy');
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy IP:', err);
                });
            } else {
                // Fallback for older browsers
                const $temp = $('<input>');
                $('body').append($temp);
                $temp.val(ip).select();
                document.execCommand('copy');
                $temp.remove();

                // Show feedback
                $label.transition('pulse');
                $label.removeClass('teal').addClass('green');
                setTimeout(() => {
                    $label.removeClass('green').addClass('teal');
                }, 1000);
            }
        });

        // Add cursor pointer style
        this.$activeDevicesList.find('.item .ui.label').css('cursor', 'pointer');
    },


    /**
     * Display historical data from API with device grouping
     */
    displayHistoricalData(historyData) {
        if (!this.$deviceHistoryList || !Array.isArray(historyData)) {
            return;
        }

        if (historyData.length === 0) {
            this.$deviceHistoryList.html(`
                <div class="ui placeholder segment">
                    <div class="ui icon header">
                        <i class="history icon"></i>
                        ${globalTranslate.ex_NoHistoryAvailable}
                    </div>
                </div>
            `);
            return;
        }

        // Group history by device
        const deviceGroups = this.groupHistoryByDevice(historyData);

        // Build HTML for grouped display - simplified structure
        let historyHtml = '<div class="ui divided list">';

        Object.entries(deviceGroups).forEach(([deviceKey, sessions], deviceIndex) => {
            const [userAgent, ip] = deviceKey.split('|');
            const deviceName = userAgent || 'Unknown Device';
            const deviceIP = (ip && ip !== 'Unknown') ? ip : '';
            const deviceId = `device-${deviceIndex}`;

            // Create timeline HTML for this device
            const timelineHtml = this.createDeviceTimeline(sessions, deviceId);

            // Device header - exactly as requested
            historyHtml += `
                <div class="item">
                    <div class="content">
                        <div class="ui small header">
                            <i class="mobile alternate icon"></i>
                            <div class="content">
                                ${deviceName}
                                ${deviceIP ? `<span style="color: grey; font-size:0.7em;">${deviceIP}</>` : ''}
                            </div>
                        </div>
                        ${timelineHtml}
                        <div class="description">
            `;
            
            // Sessions timeline - simplified
            sessions.forEach((session, index) => {
                // Check event type to determine actual device status
                let isOnline = session.status === 'Available';
                let eventLabel = '';

                // Handle device-specific events
                if (session.event_type === 'device_removed') {
                    isOnline = false;
                    eventLabel = ` ${globalTranslate.ex_DeviceDisconnected}`;
                } else if (session.event_type === 'device_added') {
                    isOnline = true;
                    eventLabel = ` ${globalTranslate.ex_DeviceConnected}`;
                }

                const rttLabel = this.getRttLabel(session.rtt);
                // Format datetime with date and time
                const datetime = this.formatDateTime(session.date || session.timestamp);

                // Use circular labels like in extensions list
                const statusClass = isOnline ? 'green' : 'grey';
                const statusTitle = isOnline ? 'Online' : 'Offline';

                let durationHtml = '';
                // For the first (most recent) entry that is online, add live duration
                if (index === 0 && isOnline && session.event_type !== 'device_removed') {
                    // Add data attribute with timestamp for live updating
                    durationHtml = `<span class="ui grey text online-duration" style="margin-left: 8px;"
                                          data-online-since="${session.timestamp}">
                                          ${globalTranslate.ex_Online} ${this.calculateDurationFromNow(session.timestamp)}
                                     </span>`;
                } else {
                    // Calculate static duration for historical entries
                    const duration = this.calculateDuration(session.timestamp, sessions[index - 1]?.timestamp);
                    // Format duration with translation
                    const durationText = duration && isOnline
                        ? `${globalTranslate.ex_Online} ${duration}`
                        : duration
                            ? `${globalTranslate.ex_Offline} ${duration}`
                            : '';

                    if (durationText) {
                        durationHtml = `<span class="ui grey text" style="margin-left: 8px;">${durationText}</span>`;
                    }
                }

                historyHtml += `
                    <div class="ui small text" style="margin: 6px 20px; display: flex; align-items: center;">
                        <div class="ui ${statusClass} empty circular label"
                             style="width: 8px; height: 8px; min-height: 8px; margin-right: 8px;"
                             title="${statusTitle}">
                        </div>
                        ${datetime}
                        ${rttLabel}
                        ${durationHtml || eventLabel}
                    </div>
                `;
            });
            
            historyHtml += `
                        </div>
                    </div>
                </div>
            `;
        });

        historyHtml += '</div>';
        this.$deviceHistoryList.html(historyHtml);

        // Initialize timeline tooltips
        this.initializeTimelineTooltips();
    },
    
    /**
     * Group history events by device and sort by last event
     */
    groupHistoryByDevice(historyData) {
        const groups = {};

        historyData.forEach(entry => {
            // Create device key from user_agent and IP
            let deviceKey = 'Unknown|Unknown';

            if (entry.user_agent || entry.ip_address) {
                deviceKey = `${entry.user_agent || 'Unknown'}|${entry.ip_address || 'Unknown'}`;
            } else if (entry.details) {
                // Try to extract device info from details
                const match = entry.details.match(/([\w\s.]+)\s*-\s*([\d.]+)/);
                if (match) {
                    deviceKey = `${match[1].trim()}|${match[2].trim()}`;
                }
            }

            if (!groups[deviceKey]) {
                groups[deviceKey] = [];
            }

            groups[deviceKey].push(entry);
        });

        // Sort sessions within each group by timestamp (newest first)
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => b.timestamp - a.timestamp);
        });

        // Convert to array and sort by most recent event
        const sortedGroups = Object.entries(groups)
            .sort((a, b) => {
                // Get the most recent timestamp from each group (first element since already sorted)
                const aLatest = a[1][0]?.timestamp || 0;
                const bLatest = b[1][0]?.timestamp || 0;
                return bLatest - aLatest;
            });

        // Convert back to object with sorted keys
        const sortedObject = {};
        sortedGroups.forEach(([key, value]) => {
            sortedObject[key] = value;
        });

        return sortedObject;
    },
    
    /**
     * Calculate duration between two timestamps
     */
    calculateDuration(currentTimestamp, previousTimestamp) {
        if (!previousTimestamp) return null;
        
        const diff = Math.abs(previousTimestamp - currentTimestamp);
        const minutes = Math.floor(diff / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${diff}s`;
        }
    },
    
    /**
     * Format time for display
     */
    formatTime(dateStr) {
        if (!dateStr) return '';
        
        // If it's already a formatted date string like "2025-09-11 11:30:36"
        if (typeof dateStr === 'string' && dateStr.includes(' ')) {
            const timePart = dateStr.split(' ')[1];
            return timePart || dateStr;
        }
        
        // If it's a timestamp
        if (typeof dateStr === 'number') {
            const date = new Date(dateStr * 1000);
            return date.toLocaleTimeString();
        }
        
        return dateStr;
    },
    
    /**
     * Get RTT label with color coding
     */
    getRttLabel(rtt) {
        if (rtt === null || rtt === undefined || rtt <= 0) {
            return '';
        }

        let color = 'green';
        if (rtt > 150) {
            color = 'red';
        } else if (rtt > 50) {
            color = 'olive';  // yellow can be hard to see, olive is better
        }

        return `<span class="ui ${color} text" style="margin-left: 8px;">[RTT: ${rtt.toFixed(0)}ms]</span>`;
    },

    /**
     * Format datetime with date and time using interface language
     */
    formatDateTime(time) {
        if (!time) return '--:--';

        const date = new Date(typeof time === 'string' ? time : time * 1000);
        const now = new Date();

        // Check if it's today
        const isToday = date.toDateString() === now.toDateString();

        // Check if it's yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const locale = SemanticLocalization.getUserLocale();
        const timeStr = date.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit', second: '2-digit'});

        if (isToday) {
            return timeStr;
        } else if (isYesterday) {
            // Use translation for "Yesterday" if available
            const yesterdayText = globalTranslate.ex_Yesterday;
            return `${yesterdayText} ${timeStr}`;
        } else {
            // Format date according to locale
            const dateStr = date.toLocaleDateString(locale, {day: '2-digit', month: '2-digit'});
            return `${dateStr} ${timeStr}`;
        }
    },

    /**
     * Calculate duration from timestamp to now
     */
    calculateDurationFromNow(timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - timestamp;

        if (diff < 0) return '0s';

        const minutes = Math.floor(diff / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${diff}s`;
        }
    },

    /**
     * Start timer to update online durations
     */
    startDurationUpdateTimer() {
        // Clear any existing timer
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        // Update every 10 seconds
        this.updateTimer = setInterval(() => {
            this.updateOnlineDurations();
        }, 10000);
    },

    /**
     * Update all online duration displays
     */
    updateOnlineDurations() {
        const $durations = this.$deviceHistoryList?.find('.online-duration[data-online-since]');
        if (!$durations || $durations.length === 0) {
            return;
        }

        $durations.each((index, element) => {
            const $element = $(element);
            const onlineSince = parseInt($element.data('online-since'), 10);
            if (onlineSince) {
                const duration = this.calculateDurationFromNow(onlineSince);
                $element.text(`${globalTranslate.ex_Online} ${duration}`);
            }
        });
    },

    /**
     * Create timeline visualization for a device's history
     * @param {Array} sessions - Array of session events for the device
     * @param {String} deviceId - Unique identifier for the device
     * @returns {String} HTML for the timeline
     */
    createDeviceTimeline(sessions, deviceId) {
        if (!sessions || sessions.length === 0) {
            return '';
        }

        // Get time range (last 24 hours)
        const now = Math.floor(Date.now() / 1000);
        const dayAgo = now - (24 * 60 * 60);

        // Filter sessions within last 24 hours (sessions are sorted newest first)
        const recentSessions = sessions.filter(s => s.timestamp >= dayAgo);
        if (recentSessions.length === 0) {
            return ''; // No recent activity
        }

        // Create timeline segments (96 segments for 24 hours, 15 minutes each)
        const segmentDuration = 15 * 60; // 15 minutes in seconds
        const segments = 96;
        const segmentData = new Array(segments).fill('grey');

        // Reverse sessions to process from oldest to newest
        const chronologicalSessions = [...recentSessions].reverse();

        // Process sessions to fill segments
        chronologicalSessions.forEach((session, index) => {
            const nextSession = chronologicalSessions[index + 1]; // Next event in time
            const startTime = session.timestamp;
            const endTime = nextSession ? nextSession.timestamp : now;

            // Determine status color based on event type and status
            let color = 'grey';

            // Check event type first
            if (session.event_type === 'device_added' || session.event_type === 'status_change') {
                // Device came online
                if (session.status === 'Available') {
                    color = 'green';
                } else {
                    color = 'grey';
                }
            } else if (session.event_type === 'device_removed') {
                // Device went offline - segments AFTER this event should be grey
                color = 'grey';
            } else if (session.status === 'Available') {
                // Default to available status
                color = 'green';
            }

            // Fill segments for this session period
            for (let time = startTime; time < endTime && time <= now; time += segmentDuration) {
                const segmentIndex = Math.floor((time - dayAgo) / segmentDuration);
                if (segmentIndex >= 0 && segmentIndex < segments) {
                    segmentData[segmentIndex] = color;
                }
            }
        });

        // Build timeline HTML
        let timelineHtml = `
            <div class="device-timeline" style="margin: 10px 0;">
                <div style="display: flex; width: 100%; height: 12px; background: #f3f4f5; border-radius: 3px; overflow: hidden;">
        `;

        segmentData.forEach((color, index) => {
            const segmentWidth = 100 / segments;
            const bgColor = color === 'green' ? '#21ba45' : '#e8e8e8';
            const borderLeft = index > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none';

            // Calculate time for this segment
            const segmentTime = dayAgo + (index * segmentDuration);
            const segmentDate = new Date(segmentTime * 1000);

            // Get user's locale
            const locale = SemanticLocalization.getUserLocale();
            const timeStr = segmentDate.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'});

            timelineHtml += `
                <div style="width: ${segmentWidth}%; height: 100%; background-color: ${bgColor};
                           box-sizing: border-box; border-left: ${borderLeft};"
                     title="${timeStr} - ${color === 'green' ? 'Online' : 'Offline'}">
                </div>
            `;
        });

        // Time labels with localization
        const hoursLabel = globalTranslate.ex_Hours_Short;

        timelineHtml += `
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 2px; font-size: 10px; color: #999;">
                    <span>24${hoursLabel}</span>
                    <span>18${hoursLabel}</span>
                    <span>12${hoursLabel}</span>
                    <span>6${hoursLabel}</span>
                    <span>${globalTranslate.ex_Now}</span>
                </div>
            </div>
        `;

        return timelineHtml;
    },

    /**
     * Initialize timeline tooltips after rendering
     */
    initializeTimelineTooltips() {
        // Initialize Fomantic UI tooltips for timeline segments
        this.$deviceHistoryList?.find('.device-timeline [title]').popup({
            variation: 'mini',
            position: 'top center',
            delay: {
                show: 300,
                hide: 100
            }
        });
    },

    /**
     * Load authentication failure statistics and banned IPs
     */
    loadSecurityData() {
        const extension = this.currentExtensionId;

        if (!extension) {
            return;
        }

        // Fetch auth failures via SipAPI
        SipAPI.getAuthFailureStats(extension, (response) => {
            if (response && response.result) {
                this.securityData = response.data || {};
            } else {
                this.securityData = {};
            }

            // Fetch banned IPs via FirewallAPI
            FirewallAPI.getBannedIps((bannedResponse) => {
                if (bannedResponse && bannedResponse.result) {
                    this.bannedIps = bannedResponse.data || {};
                } else {
                    this.bannedIps = {};
                }

                // Render the combined data
                this.renderSecurityTable();
            });
        });
    },

    /**
     * Render security table with color-coded rows
     * Red row = banned IP, Green row = not banned
     */
    renderSecurityTable() {
        const tbody = this.$securityTable.find('tbody');
        tbody.empty();

        const failures = this.securityData;

        if (!failures || Object.keys(failures).length === 0) {
            this.$securityTable.hide();
            this.$noSecurityData.show();
            return;
        }

        this.$securityTable.show();
        this.$noSecurityData.hide();

        // Iterate through failed auth IPs
        Object.entries(failures).forEach(([ip, stats]) => {
            const isBanned = this.bannedIps.hasOwnProperty(ip);

            // Use Fomantic UI table row states
            // 'negative' = red row (banned)
            // 'positive' = green row (not banned)
            const rowClass = isBanned ? 'negative' : '';

            const lastAttempt = new Date(stats.last_attempt * 1000).toLocaleString();

            // Show unban button only for banned IPs
            const actionButton = isBanned
                ? `<button class="ui mini red icon button unban-ip"
                           data-ip="${ip}"
                           data-tooltip="${globalTranslate.ex_SecurityUnban}"
                           data-position="left center">
                       <i class="unlock icon"></i>
                   </button>`
                : '';

            const row = `
                <tr class="${rowClass}">
                    <td><strong>${ip}</strong></td>
                    <td>${stats.count}</td>
                    <td>${lastAttempt}</td>
                    <td class="center aligned">${actionButton}</td>
                </tr>
            `;

            tbody.append(row);
        });

        // Initialize tooltips for unban buttons
        this.$securityTable.find('[data-tooltip]').popup();

        // Bind unban button handlers
        this.$securityTable.find('.unban-ip').on('click', (e) => {
            this.handleUnbanClick(e);
        });
    },

    /**
     * Handle unban button click
     * @param {Event} e - Click event
     */
    handleUnbanClick(e) {
        e.preventDefault();
        const $button = $(e.currentTarget);
        const ip = $button.data('ip');

        if (!ip) {
            return;
        }

        $button.addClass('loading disabled');

        // Call FirewallAPI to unban IP
        FirewallAPI.unbanIp(ip, (response) => {
            if (response && response.result) {
                // Just reload security data - table will update visually
                // Red row will become green row
                ExtensionModifyStatusMonitor.loadSecurityData();
            } else {
                // Only show error message
                const errorMsg = response && response.messages
                    ? response.messages
                    : {error: ['Failed to unban IP']};
                UserMessage.showMultiString(errorMsg);
                $button.removeClass('loading disabled');
            }
        });
    },

    /**
     * Cleanup on page unload
     */
    destroy() {
        // Clear update timer
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }

        if (typeof EventBus !== 'undefined') {
            EventBus.unsubscribe('extension-status');
        }
        this.isInitialized = false;
        this.currentExtensionId = null;
    }
};

// Export for use in extension-modify.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtensionModifyStatusMonitor;
}