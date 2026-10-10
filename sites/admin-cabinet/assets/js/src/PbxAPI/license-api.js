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

/* global PbxApiClient */ 

/**
 * LicenseAPI - REST API v3 client for license management operations
 *
 * Provides methods to manage MikoPBX license, check connection with license server,
 * retrieve license information, process user requests, and send PBX metrics.
 *
 * @class LicenseAPI
 */
const LicenseAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/license',
    singleton: true,
    customMethods: {
        ping: ':ping',
        resetKey: ':resetKey',
        processUserRequest: ':processUserRequest',
        getLicenseInfo: ':getLicenseInfo',
        sendPBXMetrics: ':sendPBXMetrics',
        entitlementStatus: ':entitlementStatus',
        entitlementRefresh: ':entitlementRefresh',
        entitlementExport: ':entitlementExport',
        entitlementImport: ':entitlementImport'
    }
});

/**
 * Check connection with license server
 * @param {function} callback - Callback function
 */
LicenseAPI.ping = function(callback) {
    return this.callCustomMethod('ping', {}, callback, 'GET');
};

/**
 * Reset license key settings
 * @param {function} callback - Callback function
 */
LicenseAPI.resetKey = function(callback) {
    return this.callCustomMethod('resetKey', {}, callback, 'POST');
};

/**
 * Update license key, get new one, activate coupon
 * @param {object} formData - Form data with license request
 * @param {function} callback - Callback function
 */
LicenseAPI.processUserRequest = function(formData, callback) {
    return this.callCustomMethod('processUserRequest', formData, callback, 'POST');
};

/**
 * Retrieves license information from the license server
 * @param {function} callback - Callback function
 */
LicenseAPI.getLicenseInfo = function(callback) {
    return this.callCustomMethod('getLicenseInfo', {}, callback, 'GET');
};

/**
 * Make an API call to send PBX metrics
 * @param {function} callback - Callback function
 */
LicenseAPI.sendPBXMetrics = function(callback) {
    return this.callCustomMethod('sendPBXMetrics', {}, callback, 'GET');
};

/**
 * State of the entitlement document (LicenseV2)
 * @param {function} callback - Callback function
 */
LicenseAPI.entitlementStatus = function(callback) {
    return this.callCustomMethod('entitlementStatus', {}, callback, 'GET');
};

/**
 * Forced exchange with the licensing servers, answers the outcome and the state
 * @param {function} callback - Callback function
 */
LicenseAPI.entitlementRefresh = function(callback) {
    return this.callCustomMethod('entitlementRefresh', {}, callback, 'POST');
};

/**
 * Request file for the closed contour (data.request)
 * @param {function} callback - Callback function
 */
LicenseAPI.entitlementExport = function(callback) {
    return this.callCustomMethod('entitlementExport', {}, callback, 'POST');
};

/**
 * Answer file from the licensing cabinet: a document or a refusal
 * @param {object} data - {token: <file contents>}
 * @param {function} callback - Callback function
 */
LicenseAPI.entitlementImport = function(data, callback) {
    return this.callCustomMethod('entitlementImport', data, callback, 'POST');
};

// Export for use in other modules
window.LicenseAPI = LicenseAPI;