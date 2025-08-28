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
 * Uses unified approach with centralized endpoint definitions.
 * This provides:
 * - Single point of API URL management
 * - Easy API version switching (v2 -> v3)
 * - Consistent endpoint usage throughout code
 * - Simplified debugging and support
 */
const IvrMenuAPI = {
    /**
     * API endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/ivr-menu/`,
    
    // Endpoint definitions for unification
    endpoints: {
        getList: `${Config.pbxUrl}/pbxcore/api/v2/ivr-menu/getList`,
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/ivr-menu/getRecord`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/ivr-menu/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/ivr-menu/deleteRecord`
    },
    
    /**
     * Get record by ID
     * @param {string} id - Record ID or empty string for new
     * @param {function} callback - Callback function
     */
    getRecord(id, callback) {
        const recordId = (!id || id === '') ? 'new' : id;
        
        $.api({
            url: `${this.endpoints.getRecord}/${recordId}`,
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
     * @param {function} callback - Callback function
     */
    getList(callback) {
        $.api({
            url: this.endpoints.getList,
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
        // Don't rely on data.id since it's always present now (contains uniqid)
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? 
            this.endpoints.saveRecord : 
            `${this.endpoints.saveRecord}/${data.id}`;
        
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
            url: `${this.endpoints.deleteRecord}/${id}`,
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