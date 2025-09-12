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

/* global PbxApi, Config */

/**
 * ApiKeysAPI - REST API for API Keys management
 * 
 * Uses v3 RESTful API with proper HTTP methods.
 * This provides:
 * - RESTful resource-oriented endpoints
 * - Proper HTTP method usage (GET, POST, PUT, PATCH, DELETE)
 * - Custom methods using colon notation (:method)
 * - Backward compatibility through method mapping
 */
const ApiKeysAPI = {
    /**
     * API base URL for v3 RESTful endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v3/api-keys`,
    
    // Centralized endpoint definitions for PbxDataTableIndex compatibility
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v3/api-keys`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v3/api-keys`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v3/api-keys`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v3/api-keys`,
        generateKey: `${Config.pbxUrl}/pbxcore/api/v3/api-keys:generateKey`,
        getAvailableControllers: `${Config.pbxUrl}/pbxcore/api/v3/api-keys:getAvailableControllers`
    },
    
    // Legacy v2 endpoints for backward compatibility (will be removed in future)
    v2Endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/api-keys/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/api-keys/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/api-keys/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/api-keys/deleteRecord`,
        generateKey: `${Config.pbxUrl}/pbxcore/api/v2/api-keys/generateKey`,
        getAvailableControllers: `${Config.pbxUrl}/pbxcore/api/v2/api-keys/getAvailableControllers`
    },

    /**
     * Get new records for DataTable (alias for getList)
     * @param {Function} callback - Function to call with response data
     */
    getNewRecords(callback) {
        this.getList(callback);
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
        
        // v3 API: GET /api-keys with query parameters
        $.api({
            url: this.endpoints.getList,
            method: 'GET',
            data: params,
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: []});
            }
        });
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
        const url = isNew ? `${this.apiUrl}:getDefault` : `${this.apiUrl}/${id}`;
        
        $.api({
            url: url,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },

    /**
     * Generate a new API key
     * Uses v3 RESTful API: POST /api-keys:generateKey
     * @param {function} callback - Callback function
     */
    generateKey(callback) {
        // v3 API: POST /api-keys:generateKey (custom method)
        $.api({
            url: `${this.apiUrl}:generateKey`,
            method: 'POST',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },

    /**
     * Save record
     * Uses v3 RESTful API: POST /api-keys (create) or PUT /api-keys/{id} (update)
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    saveRecord(data, callback) {
        // Check if this is a new record using the _isNew flag passed from form
        const isNew = data._isNew === true || !data.id || data.id === '';
        
        // Remove the flag before sending to server
        if (data._isNew !== undefined) {
            delete data._isNew;
        }
        
        // v3 API: POST for new records, PUT for updates
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? this.apiUrl : `${this.apiUrl}/${data.id}`;
        
        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },

    /**
     * Delete record
     * Uses v3 RESTful API: DELETE /api-keys/{id}
     * @param {string} id - Record ID
     * @param {function} callback - Callback function
     */
    deleteRecord(id, callback) {
        // v3 API: DELETE /api-keys/{id}
        $.api({
            url: `${this.apiUrl}/${id}`,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
            }
        });
    },

    /**
     * Get list of available controllers/endpoints for permissions
     * Uses v3 RESTful API: GET /api-keys:getAvailableControllers
     * @param {function} callback - Callback function
     */
    getAvailableControllers(callback) {
        // v3 API: GET /api-keys:getAvailableControllers (custom method)
        $.api({
            url: `${this.apiUrl}:getAvailableControllers`,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: []});
            }
        });
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiKeysAPI;
}