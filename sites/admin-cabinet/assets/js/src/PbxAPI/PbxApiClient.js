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

/* global Config, PbxApi, $ */

/**
 * PbxApiClient - Unified REST API v3 client for all entities
 * 
 * This class provides a standard interface for all CRUD operations
 * and eliminates code duplication across API modules.
 * 
 * Features:
 * - Standard RESTful operations (GET, POST, PUT, DELETE)
 * - Custom methods support via colon notation (:getDefault, :getDefaults)
 * - Automatic HTTP method selection based on data
 * - CSRF token management
 * - Backward compatibility with PbxDataTableIndex
 * 
 * @class PbxApiClient
 */
class PbxApiClient {
    /**
     * Create a new API client instance
     * @param {object} config - Configuration object
     * @param {string} config.endpoint - Base API endpoint (e.g., '/pbxcore/api/v3/ivr-menu')
     * @param {object} [config.customMethods] - Map of custom methods (e.g., {getDefault: ':getDefault'})
     */
    constructor(config) {
        this.endpoint = config.endpoint;
        this.customMethods = config.customMethods || {};
        
        // Extract base URL for Config.pbxUrl
        this.apiUrl = `${Config.pbxUrl}${this.endpoint}`;
        
        // Create endpoints property for backward compatibility with PbxDataTableIndex
        this.endpoints = {
            getList: this.apiUrl
        };
        
        // Add custom method endpoints
        for (const [methodName, methodPath] of Object.entries(this.customMethods)) {
            this.endpoints[methodName] = `${this.apiUrl}${methodPath}`;
        }
    }
    
    /**
     * Get record by ID or get default values for new record
     * @param {string} recordId - Record ID or empty/null for new record
     * @param {function} callback - Callback function
     */
    getRecord(recordId, callback) {
        // Check if we should use a custom method for new records
        const isNew = !recordId || recordId === '' || recordId === 'new';
        let url;
        
        if (isNew && this.customMethods.getDefault) {
            // Use custom method for new records
            url = `${this.apiUrl}${this.customMethods.getDefault}`;
        } else if (isNew && this.customMethods.getDefaults) {
            // Alternative naming
            url = `${this.apiUrl}${this.customMethods.getDefaults}`;
        } else {
            // Get existing record by ID
            url = `${this.apiUrl}/${recordId}`;
        }
        
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
                callback({
                    result: false,
                    messages: {error: ['Network error occurred']}
                });
            }
        });
    }
    
    /**
     * Get list of records
     * @param {object|function} dataOrCallback - Optional params or callback
     * @param {function} [callback] - Callback if first param is data
     */
    getList(dataOrCallback, callback) {
        // Handle overloaded parameters
        let actualCallback;
        let params = {};
        
        if (typeof dataOrCallback === 'function') {
            actualCallback = dataOrCallback;
        } else {
            params = dataOrCallback || {};
            actualCallback = callback;
        }
        
        $.api({
            url: this.apiUrl,
            on: 'now',
            method: 'GET',
            data: params,
            successTest: PbxApi.successTest,
            onSuccess(response) {
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
    }
    
    /**
     * Save record (create or update)
     * @param {object} data - Data to save
     * @param {function} callback - Callback function
     */
    saveRecord(data, callback) {
        // Determine if this is a new record
        const isNew = this.isNewRecord(data);
        
        // Clean up internal flags
        const cleanData = {...data};
        if (cleanData._isNew !== undefined) {
            delete cleanData._isNew;
        }
        
        // Get the record ID for updates
        const recordId = this.getRecordId(cleanData);
        
        // v3 API: POST for new records, PUT for updates
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? this.apiUrl : `${this.apiUrl}/${recordId}`;
        
        $.api({
            url: url,
            method: method,
            data: cleanData,
            on: 'now',
            beforeSend(settings) {
                // Add CSRF token if available
                if (typeof globalCsrfTokenKey !== 'undefined' && typeof globalCsrfToken !== 'undefined') {
                    cleanData[globalCsrfTokenKey] = globalCsrfToken;
                }
                
                // Check if we need to send as JSON (for complex structures)
                if (PbxApiClient.hasComplexData(cleanData)) {
                    settings.contentType = 'application/json';
                    settings.data = JSON.stringify(cleanData);
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
                callback({
                    result: false,
                    messages: {error: ['Network error occurred']}
                });
            }
        });
    }
    
    /**
     * Delete record
     * @param {string} recordId - Record ID to delete
     * @param {function} callback - Callback function
     */
    deleteRecord(recordId, callback) {
        const data = {};
        
        // Add CSRF token if available
        if (typeof globalCsrfTokenKey !== 'undefined' && typeof globalCsrfToken !== 'undefined') {
            data[globalCsrfTokenKey] = globalCsrfToken;
        }
        
        $.api({
            url: `${this.apiUrl}/${recordId}`,
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
    
    /**
     * Call a custom method
     * @param {string} methodName - Method name
     * @param {object|function} dataOrCallback - Data or callback
     * @param {function} [callback] - Callback if first param is data
     */
    callCustomMethod(methodName, dataOrCallback, callback) {
        // Handle overloaded parameters
        let actualCallback;
        let data = {};
        
        if (typeof dataOrCallback === 'function') {
            actualCallback = dataOrCallback;
        } else {
            data = dataOrCallback || {};
            actualCallback = callback;
        }
        
        const methodPath = this.customMethods[methodName];
        if (!methodPath) {
            actualCallback({
                result: false,
                messages: {error: [`Unknown custom method: ${methodName}`]}
            });
            return;
        }
        
        $.api({
            url: `${this.apiUrl}${methodPath}`,
            method: 'GET',
            data: data,
            on: 'now',
            onSuccess(response) {
                actualCallback(response);
            },
            onFailure(response) {
                actualCallback(response);
            },
            onError() {
                actualCallback({
                    result: false,
                    messages: {error: ['Network error occurred']}
                });
            }
        });
    }
    
    /**
     * Determine if data represents a new record
     * Can be overridden in specific API modules
     * @param {object} data - Data to check
     * @returns {boolean} True if new record
     */
    isNewRecord(data) {
        // Check various flags that indicate a new record
        if (data._isNew === true) return true;
        if (data.isNew === '1' || data.isNew === true || data.isNew === 'true') return true;
        if (!data.id || data.id === '' || data.id === 'new') return true;
        if (!data.uniqid || data.uniqid === '') return true;
        return false;
    }
    
    /**
     * Get record ID from data
     * Can be overridden in specific API modules
     * @param {object} data - Data object
     * @returns {string} Record ID
     */
    getRecordId(data) {
        // Priority: uniqid > id
        return data.uniqid || data.id;
    }
    
    /**
     * Check if data contains complex structures that need JSON encoding
     * @param {object} data - Data to check
     * @returns {boolean} True if contains complex data
     */
    static hasComplexData(data) {
        for (const value of Object.values(data)) {
            if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
                return true;
            }
        }
        return false;
    }
}

// Export for use in other modules
window.PbxApiClient = PbxApiClient;