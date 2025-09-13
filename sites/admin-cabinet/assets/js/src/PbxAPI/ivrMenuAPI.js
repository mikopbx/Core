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

/* global globalRootUrl, PbxApi, globalTranslate, Config */

/**
 * IvrMenuAPI - REST API for IVR menu management
 * 
 * Uses RESTful v3 API with standard HTTP methods.
 * This provides:
 * - Standard RESTful operations (GET, POST, PUT, DELETE)
 * - Custom methods support (:getDefault)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
const IvrMenuAPI = {
    /**
     * API base URL
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v3/ivr-menu`,
    
    // Endpoint definitions for unification
    endpoints: {
        base: `${Config.pbxUrl}/pbxcore/api/v3/ivr-menu`,
        getDefault: `${Config.pbxUrl}/pbxcore/api/v3/ivr-menu:getDefault`
    },
    
    /**
     * Get record by ID or get default for new record
     * @param {string} id - Record ID or empty string for new
     * @param {function} callback - Callback function
     */
    getRecord(id, callback) {
        // For new records, use getDefault custom method
        const url = (!id || id === '' || id === 'new') 
            ? this.endpoints.getDefault
            : `${this.endpoints.base}/${id}`;
        
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
     * Get list of all records
     * @param {object|function} dataOrCallback - Optional data object or callback function
     * @param {function} [callback] - Callback function (if first param is data)
     */
    getList(dataOrCallback, callback) {
        // Handle overloaded parameters - support both (callback) and (data, callback) signatures
        let actualCallback;
        if (typeof dataOrCallback === 'function') {
            actualCallback = dataOrCallback;
        } else {
            actualCallback = callback;
        }
        
        $.api({
            url: this.endpoints.base,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                // Pass the full response object as-is (PbxDataTableIndex handles the structure)
                actualCallback(response);
            },
            onFailure(response) {
                // Ensure we return a structure with result and data fields
                if (response && !response.hasOwnProperty('data')) {
                    response.data = [];
                }
                actualCallback(response);
            },
            onError() {
                actualCallback({result: false, data: []});
            }
        });
    },
    
    /**
     * Save record
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    saveRecord(data, callback) {
        // Check if this is a new record using the _isNew flag passed from form
        const isNew = data._isNew === true;
        
        // Remove the flag before sending to server
        if (data._isNew !== undefined) {
            delete data._isNew;
        }
        
        // For new records use POST, for existing use PUT
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? 
            this.endpoints.base : 
            `${this.endpoints.base}/${data.id}`;
        
        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            beforeSend(settings) {
                // Add CSRF token to data
                if (typeof globalCsrfTokenKey !== 'undefined' && typeof globalCsrfToken !== 'undefined') {
                    data[globalCsrfTokenKey] = globalCsrfToken;
                }
                
                // If actions field exists, send as JSON to avoid URL encoding
                if (data.actions) {
                    settings.contentType = 'application/json';
                    settings.data = JSON.stringify(data);
                }
                return settings;
            },
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
     * @param {string} id - Record ID
     * @param {function} callback - Callback function
     */
    deleteRecord(id, callback) {
        const data = {};
        
        // Add CSRF token
        if (typeof globalCsrfTokenKey !== 'undefined' && typeof globalCsrfToken !== 'undefined') {
            data[globalCsrfTokenKey] = globalCsrfToken;
        }
        
        $.api({
            url: `${this.endpoints.base}/${id}`,
            on: 'now',
            method: 'DELETE',
            data: data,
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
    }
};