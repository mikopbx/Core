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
    statusHistory: [],
    maxHistoryItems: 20,
    
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
            return $numberField.val();
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
        
        
        // Make single API call
        ExtensionsAPI.getStatus(this.currentExtensionId, (response) => {
            if (response && response.result && response.data) {
                this.updateStatus(response.data);
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
        
        // Add to history if status changed
        this.addToHistory(statusData);
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
                return 'red';
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
     * Add status change to history
     */
    addToHistory(statusData) {
        const now = new Date();
        const timestamp = now.toLocaleString();
        
        // Determine activity type
        let activityType = 'unknown';
        let activityIcon = 'question circle';
        let activityColor = 'grey';
        
        if (statusData.status === 'Available' && statusData.devices && statusData.devices.length > 0) {
            activityType = 'online';
            activityIcon = 'arrow circle up';
            activityColor = 'green';
        } else if (statusData.status === 'Unavailable') {
            activityType = 'offline';
            activityIcon = 'arrow circle down';
            activityColor = 'red';
        }
        
        // Add to history array
        this.statusHistory.unshift({
            timestamp: timestamp,
            status: statusData.status,
            devices: statusData.devices || [],
            activityType: activityType,
            activityIcon: activityIcon,
            activityColor: activityColor
        });
        
        // Keep only last N items
        if (this.statusHistory.length > this.maxHistoryItems) {
            this.statusHistory = this.statusHistory.slice(0, this.maxHistoryItems);
        }
        
        // Update history display
        this.updateHistoryDisplay();
    },
    
    /**
     * Update history display
     */
    updateHistoryDisplay() {
        if (!this.$deviceHistoryList) {
            return;
        }
        
        if (this.statusHistory.length === 0) {
            this.$deviceHistoryList.html(`
                <div class="ui relaxed divided list">
                    <div class="item">
                        <div class="content">
                            <div class="description">${globalTranslate.ex_NoHistoryAvailable}</div>
                        </div>
                    </div>
                </div>
            `);
            return;
        }
        
        let historyHtml = '<div class="ui relaxed divided list">';
        
        this.statusHistory.forEach((entry) => {
            const devices = entry.devices || [];
            const deviceInfo = devices.length > 0 
                ? devices.map(d => `${d.user_agent || 'Unknown'} - ${d.ip || 'Unknown IP'}`).join(', ')
                : 'No devices';
                
            historyHtml += `
                <div class="item">
                    <i class="${entry.activityColor} ${entry.activityIcon} icon"></i>
                    <div class="content">
                        <div class="description">
                            <span class="ui small text">${entry.timestamp}</span>
                            <span class="ui small text"> - ${deviceInfo}</span>
                            <span class="ui ${entry.activityColor} small text"> - ${entry.activityType}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        historyHtml += '</div>';
        this.$deviceHistoryList.html(historyHtml);
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
        this.statusHistory = [];
    }
};

// Export for use in extension-modify.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtensionModifyStatusMonitor;
}