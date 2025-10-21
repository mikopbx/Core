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

/* global PbxApiClient, PbxApi, $ */

/**
 * SystemAPI - REST API v3 client for system management operations
 *
 * Provides system-level operations like power management, health checks,
 * date/time operations, email sending, and system utilities.
 *
 * @class SystemAPI
 */
const SystemAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/system',
    singleton: true,
    customMethods: {
        // Health check methods
        ping: ':ping',
        checkAuth: ':checkAuth',

        // Power management
        reboot: ':reboot',
        shutdown: ':shutdown',

        // Date/time operations
        datetime: ':datetime',

        // Utilities
        upgrade: ':upgrade',
        restoreDefault: ':restoreDefault',
        getDeleteStatistics: ':getDeleteStatistics',
        checkForUpdates: ':checkForUpdates',
        checkIfNewReleaseAvailable: ':checkIfNewReleaseAvailable'
    }
});

// Add method aliases to SystemAPI
Object.assign(SystemAPI, {

    /**
     * Ping backend to check if it's alive
     * @param {function} callback - Callback function
     */
    ping(callback) {
        return this.callCustomMethod('ping', {}, callback, 'GET');
    },

    /**
     * Check if user is authenticated
     * @param {function} callback - Callback function
     */
    checkAuth(callback) {
        return this.callCustomMethod('checkAuth', {}, callback, 'GET');
    },

    /**
     * Reboot the system
     * @param {function} callback - Callback function
     */
    reboot(callback) {
        return this.callCustomMethod('reboot', {}, callback, 'POST');
    },

    /**
     * Shutdown the system
     * @param {function} callback - Callback function
     */
    shutdown(callback) {
        return this.callCustomMethod('shutdown', {}, callback, 'POST');
    },

    /**
     * Get current system date and time
     * @param {function} callback - Callback function
     */
    getDateTime(callback) {
        return this.callCustomMethod('datetime', {}, callback, 'GET');
    },

    /**
     * Set system date and time
     * @param {number} timestamp - Unix timestamp
     * @param {function} callback - Callback function
     */
    setDateTime(timestamp, callback) {
        const data = { timestamp: timestamp };
        return this.callCustomMethod('datetime', data, callback, 'PUT');
    },

    /**
     * Upgrade the PBX using uploaded IMG file
     * @param {object} params - Upgrade parameters
     * @param {string} params.filename - Path to IMG file
     * @param {function} callback - Callback function
     */
    upgrade(params, callback) {
        return this.callCustomMethod('upgrade', params, callback, 'POST');
    },

    /**
     * Restore default system settings
     * @param {function} callback - Callback function
     */
    restoreDefault(requestData, callback) {
        return  this.callCustomMethod('restoreDefault', requestData, callback, 'POST');
    },

    /**
     * Get statistics about what will be deleted during restore
     * @param {function} callback - Callback function
     */
    getDeleteStatistics(callback) {
        return this.callCustomMethod('getDeleteStatistics', {}, callback, 'GET');
    },

    /**
     * Quick check if new firmware release is available
     * Fast lightweight check that returns only availability status and version number.
     * Use this for dashboard widgets, monitoring, and frequent checks.
     * @param {function} callback - Callback function
     * @returns {Promise} Promise that resolves with availability info
     */
    checkIfNewReleaseAvailable(callback) {
        return this.callCustomMethod('checkIfNewReleaseAvailable', {}, callback, 'GET');
    },

    /**
     * Get detailed firmware update information
     * Retrieves complete release details including version, description, download links,
     * file sizes, and MD5 checksums. Use this when displaying update information to users.
     * @param {function} callback - Callback function
     * @returns {Promise} Promise that resolves with detailed firmware info
     */
    checkForUpdates(callback) {
        return this.callCustomMethod('checkForUpdates', {}, callback, 'GET');
    }

});

// Export for use in other modules
window.SystemAPI = SystemAPI;