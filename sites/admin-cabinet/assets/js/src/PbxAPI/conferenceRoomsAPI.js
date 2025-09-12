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

/* global globalRootUrl, PbxApi, globalTranslate */

/**
 * ConferenceRoomsAPI - REST API for conference room management (v3)
 * 
 * RESTful implementation following standard HTTP verbs and resource-oriented URLs.
 * Supports both standard CRUD operations and custom methods.
 */
const ConferenceRoomsAPI = {
    /**
     * API endpoints (v3)
     */
    baseUrl: `${Config.pbxUrl}/pbxcore/api/v3/conference-rooms`,
    
    /**
     * Endpoint definitions for PbxDataTableIndex compatibility
     */
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v3/conference-rooms`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v3/conference-rooms`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v3/conference-rooms`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v3/conference-rooms`
    },
    
    /**
     * Get default values for new conference room
     * @param {function} callback - Callback function
     */
    getDefault(callback) {
        $.api({
            url: `${this.baseUrl}:getDefault`,
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
     * Get record by ID
     * @param {string} id - Record ID
     * @param {function} callback - Callback function
     */
    getRecord(id, callback) {
        $.api({
            url: `${this.baseUrl}/${id}`,
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
     * @param {object} params - Query parameters (limit, offset, search)
     * @param {function} callback - Callback function
     */
    getList(params, callback) {
        // If params is a function, it's the callback (backward compatibility)
        if (typeof params === 'function') {
            callback = params;
            params = {};
        }
        
        $.api({
            url: this.baseUrl,
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
     * Create new record
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    createRecord(data, callback) {
        $.api({
            url: this.baseUrl,
            method: 'POST',
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
     * Update existing record (full update)
     * @param {string} id - Record ID
     * @param {object} data - Data to update
     * @param {function} callback - Callback function
     */
    updateRecord(id, data, callback) {
        $.api({
            url: `${this.baseUrl}/${id}`,
            method: 'PUT',
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
     * Partially update record
     * @param {string} id - Record ID
     * @param {object} data - Partial data to update
     * @param {function} callback - Callback function
     */
    patchRecord(id, data, callback) {
        $.api({
            url: `${this.baseUrl}/${id}`,
            method: 'PATCH',
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
     * Save record (create or update based on isNew flag)
     * This method provides backward compatibility with existing forms
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    saveRecord(data, callback) {
        // Check if this is a new record
        const isNew = data.isNew === '1' || data.isNew === true || !data.id || data.id === '';
        
        if (isNew) {
            // Create new record
            this.createRecord(data, callback);
        } else {
            // Update existing record
            this.updateRecord(data.id, data, callback);
        }
    },
    
    /**
     * Delete record
     * @param {string} id - Record ID
     * @param {function} callback - Callback function
     */
    deleteRecord(id, callback) {
        $.api({
            url: `${this.baseUrl}/${id}`,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                if (callback) callback(response);
            },
            onFailure(response) {
                if (callback) callback(response);
            },
            onError() {
                if (callback) callback(false);
            }
        });
    }
};