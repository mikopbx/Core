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

/* global PbxApi, Config, PbxApiClient, $ */

/**
 * AsteriskManagersAPI - REST API v3 client for Asterisk managers management
 *
 * Provides a clean interface for Asterisk managers operations using the new RESTful API.
 * Asterisk managers are used for AMI (Asterisk Manager Interface) access control.
 *
 * @class AsteriskManagersAPI
 */
const AsteriskManagersAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/asterisk-managers',
    customMethods: {
        getDefault: ':getDefault',
        copy: ':copy',
        getForSelect: ':getForSelect'
    }
});

// Add method aliases for compatibility and easier use
Object.assign(AsteriskManagersAPI, {

    /**
     * Get new records for DataTable (alias for getList)
     * @param {Function} callback - Function to call with response data
     */
    getNewRecords(callback) {
        this.getList({}, callback);
    },

    /**
     * Get list of all Asterisk managers
     * Uses v3 RESTful API: GET /asterisk-managers
     * @param {object} params - Query parameters (limit, offset, search, etc.)
     * @param {function} callback - Callback function
     */
    getList(params, callback) {
        // Support old signature where callback is the first parameter
        if (typeof params === 'function') {
            callback = params;
            params = {};
        }

        return this.callGet(params || {}, callback);
    },

    /**
     * Get record by ID
     * Uses v3 RESTful API: GET /asterisk-managers/{id} or GET /asterisk-managers:getDefault for new
     * @param {string} id - Record ID or empty string for new
     * @param {function} callback - Callback function
     */
    getRecord(id, callback) {
        // Use :getDefault for new records, otherwise GET by ID
        const isNew = !id || id === '' || id === 'new';

        if (isNew) {
            return this.callCustomMethod('getDefault', {}, callback);
        } else {
            return this.callGet({}, callback, id);
        }
    },

    /**
     * Delete record
     * Uses v3 RESTful API: DELETE /asterisk-managers/{id}
     * @param {string} id - Record ID
     * @param {function} callback - Callback function
     */
    deleteRecord(id, callback) {
        return this.callDelete(callback, id);
    },

    /**
     * Get copy data for an Asterisk manager by ID
     * Uses v3 RESTful API: GET /asterisk-managers/{id}:copy
     * @param {string} id - Manager ID to copy from
     * @param {function} callback - Callback function to handle response
     */
    getCopyData(id, callback) {
        return this.callCustomMethod('copy', {}, callback, 'GET', id);
    },

    /**
     * Get managers formatted for dropdown selection
     * Uses v3 RESTful API: GET /asterisk-managers:getForSelect
     * @param {function} callback - Callback function
     */
    getForSelect(callback) {
        return this.callCustomMethod('getForSelect', {}, (response) => {
            if (response.result) {
                callback(response);
            } else {
                callback({result: false, data: []});
            }
        });
    }
});