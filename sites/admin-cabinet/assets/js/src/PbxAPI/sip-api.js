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

/* global PbxApiClient, Config, PbxApi, globalTranslate */
 
/**
 * SipAPI - REST API v3 client for SIP device status monitoring
 *
 * Provides a clean interface for SIP device operations using the new RESTful API.
 * Handles device registration statuses, connection monitoring, and statistics.
 *
 * @class SipAPI
 */
const SipAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/sip',
    customMethods: {
        getStatuses: ':getStatuses',
        getStatus: ':getStatus',
        forceCheck: ':forceCheck',
        getHistory: ':getHistory',
        getStats: ':getStats',
        getPeersStatuses: ':getPeersStatuses',
        getRegistry: ':getRegistry',
        getSecret: ':getSecret'
    }
});

// Add method implementations to SipAPI
Object.assign(SipAPI, {

    /**
     * Get all extension statuses
     * @param {function|object} callbackOrOptions - Either callback function or options object
     * @param {function} [callback] - Callback function when first param is options
     */
    getStatuses(callbackOrOptions, callback) {
        let options = {};
        let cb = callback;

        // Handle overloaded parameters
        if (typeof callbackOrOptions === 'function') {
            cb = callbackOrOptions;
        } else if (typeof callbackOrOptions === 'object') {
            options = callbackOrOptions;
            // callback must be provided as second parameter when first is options
            if (typeof callback !== 'function') {
                console.error('SipAPI.getStatuses: callback function required when options provided');
                return;
            }
        }

        // Use GET method for reading data
        return this.callCustomMethod('getStatuses', options, cb);
    },

    /**
     * Get status for specific extension
     * @param {string} extension - Extension number
     * @param {function} callback - Callback function to handle response
     */
    getStatus(extension, callback) {
        if (!extension) {
            console.error('SipAPI.getStatus: extension parameter is required');
            if (callback) callback({result: false, messages: {error: ['Extension parameter is required']}});
            return;
        }

        return this.callCustomMethod('getStatus', {}, callback, 'GET', extension);
    },

    /**
     * Force status check for extension(s)
     * @param {string|function} extensionOrCallback - Extension number or callback for all extensions
     * @param {function} [callback] - Callback function when first param is extension
     */
    forceCheck(extensionOrCallback, callback) {
        // Handle overloaded parameters
        if (typeof extensionOrCallback === 'function') {
            // Force check for all extensions
            return this.callCustomMethod('forceCheck', {}, extensionOrCallback, 'POST');
        } else {
            // Force check for specific extension
            const extension = extensionOrCallback;
            if (!extension) {
                console.error('SipAPI.forceCheck: extension parameter is required');
                if (callback) callback({result: false, messages: {error: ['Extension parameter is required']}});
                return;
            }
            return this.callCustomMethod('forceCheck', {}, callback, 'POST', extension);
        }
    },

    /**
     * Get extension history
     * @param {string} extension - Extension number
     * @param {object} options - Options (limit, offset, period)
     * @param {function} callback - Callback function to handle response
     */
    getHistory(extension, options = {}, callback) {
        // Handle overloaded parameters
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        if (!extension) {
            console.error('SipAPI.getHistory: extension parameter is required');
            if (callback) callback({result: false, messages: {error: ['Extension parameter is required']}});
            return;
        }

        return this.callCustomMethod('getHistory', options, callback, 'GET', extension);
    },

    /**
     * Get extension statistics
     * @param {string} extension - Extension number
     * @param {object} options - Options (days, type)
     * @param {function} callback - Callback function to handle response
     */
    getStats(extension, options = {}, callback) {
        // Handle overloaded parameters
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        if (!extension) {
            console.error('SipAPI.getStats: extension parameter is required');
            if (callback) callback({result: false, messages: {error: ['Extension parameter is required']}});
            return;
        }

        return this.callCustomMethod('getStats', options, callback, 'GET', extension);
    },

    /**
     * Get SIP peers statuses (legacy compatibility)
     * @param {function} callback - Callback function
     */
    getPeersStatuses(callback) {
        return this.callCustomMethod('getPeersStatuses', {}, callback);
    },

    /**
     * Get SIP peer status (legacy compatibility)
     * @param {object} data - Data with peer information
     * @param {function} callback - Callback function
     */
    getPeerStatus(data, callback) {
        // Use legacy endpoint for now as it expects different data format
        $.api({
            url: `${Config.pbxUrl}/pbxcore/api/sip/getSipPeer`,
            on: 'now',
            method: 'POST',
            data: JSON.stringify(data),
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                callback(false);
            },
            onError(errorMessage, element, xhr) {
                if (xhr.status === 401) {
                    window.location = `${globalRootUrl}session/index`;
                }
            },
        });
    },

    /**
     * Get SIP providers registry statuses
     * @param {function} callback - Callback function
     */
    getSipProvidersStatuses(callback) {
        return this.callCustomMethod('getRegistry', {}, callback);
    },

    /**
     * Get SIP registry statuses (legacy compatibility)
     * @param {function} callback - Callback function
     */
    getRegistry(callback) {
        return this.callCustomMethod('getRegistry', {}, callback);
    },

    /**
     * Get SIP secret for extension (legacy compatibility and v3 API)
     * @param {string} peer - Peer/extension number
     * @param {function} callback - Callback function
     */
    getSecret(peer, callback) {
        if (!peer) {
            console.error('SipAPI.getSecret: peer parameter is required');
            if (callback) callback({result: false, messages: {error: ['Peer parameter is required']}});
            return;
        }

        return this.callCustomMethod('getSecret', {}, callback, 'GET', peer);
    }
});