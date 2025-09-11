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
        ExtensionsAPI.getStatus(this.currentExtensionId, (response) => {
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
        ExtensionsAPI.getHistory(this.currentExtensionId, {limit: 50}, (response) => {
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
                <div class="ui message">
                    <div class="content">
                        ${globalTranslate.ex_NoActiveDevices || 'No active devices'}
                    </div>
                </div>
            `);
            return;
        }
        
        // Use horizontal list with teal labels like the old endpoint-list
        let devicesHtml = '<div class="ui horizontal list">';
        
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
                <div class="ui message">
                    <div class="content">
                        ${globalTranslate.ex_NoHistoryAvailable || 'No history available'}
                    </div>
                </div>
            `);
            return;
        }
        
        // Group history by device
        const deviceGroups = this.groupHistoryByDevice(historyData);
        
        // Build HTML for grouped display - simplified structure
        let historyHtml = '<div class="ui divided list">';
        
        Object.entries(deviceGroups).forEach(([deviceKey, sessions]) => {
            const [userAgent, ip] = deviceKey.split('|');
            const deviceName = userAgent || 'Unknown Device';
            const deviceIP = (ip && ip !== 'Unknown') ? ip : '';
            
            // Device header - exactly as requested
            historyHtml += `
                <div class="item">
                    <div class="content">
                        <div class="ui small header">
                            <i class="mobile icon"></i>
                            <div class="content">
                                ${deviceName}
                                ${deviceIP ? `<span class="ui tiny grey text">(${deviceIP})</span>` : ''}
                            </div>
                        </div>
                        <div class="description">
            `;
            
            // Sessions timeline - simplified
            sessions.forEach((session, index) => {
                const isOnline = session.status === 'Available';
                const duration = this.calculateDuration(session.timestamp, sessions[index - 1]?.timestamp);
                const rttLabel = this.getRttLabel(session.rtt);
                const time = this.formatTime(session.date || session.timestamp);
                
                // Use circular labels like in extensions list
                const statusClass = isOnline ? 'green' : 'grey';
                const statusTitle = isOnline ? 'Online' : 'Offline';
                
                // Format duration with translation
                const durationText = duration && isOnline 
                    ? `${globalTranslate.ex_Online || 'Online'} ${duration}` 
                    : duration 
                        ? `${globalTranslate.ex_Offline || 'Offline'} ${duration}`
                        : '';
                
                historyHtml += `
                    <div class="ui small text" style="margin: 6px 20px; display: flex; align-items: center;">
                        <div class="ui ${statusClass} empty circular label" 
                             style="width: 8px; height: 8px; min-height: 8px; margin-right: 8px;" 
                             title="${statusTitle}">
                        </div>
                        ${time}
                        ${rttLabel}
                        ${durationText ? `<span class="ui grey text" style="margin-left: 8px;">${durationText}</span>` : ''}
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
    },
    
    /**
     * Group history events by device
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
        
        return groups;
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
     * Cleanup on page unload
     */
    destroy() {
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