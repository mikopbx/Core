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
 * ApiKeysAPI - REST API v3 client for API keys management
 *
 * Provides a clean interface for API keys operations using the new RESTful API.
 *
 * @class ApiKeysAPI 
 */
const ApiKeysAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/api-keys',
    customMethods: {
        getDefault: ':getDefault',
        generateKey: ':generateKey'
    }
});

// Add method aliases for compatibility and easier use
Object.assign(ApiKeysAPI, {

    /**
     * Get new records for DataTable (alias for getList)
     * @param {Function} callback - Function to call with response data
     */
    getNewRecords(callback) {
        this.getList({}, callback);
    },

    /**
     * Get list of all API keys
     * Uses v3 RESTful API: GET /api-keys
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
     * Uses v3 RESTful API: GET /api-keys/{id} or GET /api-keys:getDefault for new
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
     * Generate a new API key
     * Uses v3 RESTful API: POST /api-keys:generateKey
     * @param {function} callback - Callback function
     */
    generateKey(callback) {
        return this.callCustomMethod('generateKey', {}, callback, 'POST');
    },

    /**
     * Delete record
     * Uses v3 RESTful API: DELETE /api-keys/{id}
     * @param {string} id - Record ID
     * @param {function} callback - Callback function
     */
    deleteRecord(id, callback) {
        return this.callDelete(callback, id);
    }
});