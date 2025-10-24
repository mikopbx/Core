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
 * - Custom methods support via colon notation (:getDefault)
 * - Automatic HTTP method selection based on data
 * - CSRF token management
 * - Backward compatibility with PbxDataTableIndex
 * - Global authorization error handling (401/403)
 *
 * @class PbxApiClient
 */
class PbxApiClient {
    /**
     * Flag to prevent multiple redirects on auth errors
     * @type {boolean}
     * @static
     */
    static isRedirectingToLogin = false;

    /**
     * Create a new API client instance
     * @param {object} config - Configuration object
     * @param {string} config.endpoint - Base API endpoint (e.g., '/pbxcore/api/v3/ivr-menu')
     * @param {object} [config.customMethods] - Map of custom methods (e.g., {getDefault: ':getDefault'})
     * @param {boolean} [config.singleton] - Whether this is a singleton resource (no IDs in URLs)
     */
    constructor(config) {
        this.endpoint = config.endpoint;
        this.customMethods = config.customMethods || {};
        this.isSingleton = config.singleton || false;

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
     * Handle authorization errors (401) by redirecting to login
     * Note: 403 Forbidden is NOT handled here as it may indicate access denied to a specific resource,
     * not session expiration. Session loss is indicated by 401 Unauthorized only.
     * @param {number} status - HTTP status code
     * @static
     */
    static handleAuthError(status) {
        // Only handle 401 Unauthorized - this indicates session loss
        // 403 Forbidden means access denied to a resource (user lacks permissions)
        if (status === 401) {
            // Prevent multiple redirects
            if (!PbxApiClient.isRedirectingToLogin) {
                PbxApiClient.isRedirectingToLogin = true;

                // Redirect to login page after a short delay to allow any pending operations to complete
                setTimeout(() => {
                    window.location.href = `${globalRootUrl}session/index`;
                }, 100);
            }
            return true;
        }
        return false;
    }

    /**
     * Custom success test for RESTful API with proper HTTP codes
     * Treats business errors (4xx) as failures, not network errors
     *
     * @param {object} response - Server response
     * @param {XMLHttpRequest} xhr - XMLHttpRequest object
     * @returns {boolean} - True if request was successful
     */
    successTest(response, xhr) {
        // If we have a valid response object with result field, use it
        if (response && typeof response.result !== 'undefined') {
            return response.result === true;
        }

        // For responses without result field, check HTTP status
        // 2xx = success, 4xx/5xx = failure (but not network error)
        const status = xhr ? xhr.status : 200;
        return status >= 200 && status < 300;
    }

    /**
     * Custom error handler for RESTful API
     * Distinguishes between business errors (4xx) and real network errors
     *
     * @param {XMLHttpRequest} xhr - XMLHttpRequest object
     * @param {function} onFailureCallback - Callback for business errors (4xx)
     * @param {function} onErrorCallback - Callback for network errors
     */
    handleError(xhr, onFailureCallback, onErrorCallback) {
        const status = xhr.status;

        // Business errors (4xx) - validation, conflicts, etc.
        // These have response body with error details
        if (status >= 400 && status < 500) {
            try {
                const response = JSON.parse(xhr.responseText);
                // Call onFailure with parsed response
                onFailureCallback(response);
            } catch (e) {
                // If can't parse JSON, treat as network error
                onErrorCallback();
            }
        }
        // Server errors (5xx) or network errors (0)
        else {
            onErrorCallback();
        }
    }

    /**
     * Get base API settings with proper error handling
     * This standardizes error handling across all API calls
     *
     * @param {function} successCallback - Called on successful response (2xx + result=true)
     * @param {function} failureCallback - Called on business errors (4xx or result=false)
     * @returns {object} - API settings object for $.api()
     */
    getBaseApiSettings(successCallback, failureCallback) {
        const self = this;
        return {
            on: 'now',
            successTest(response, xhr) {
                return self.successTest(response, xhr);
            },
            onSuccess(response) {
                successCallback(response, true);
            },
            onFailure(response, xhr) {
                // Check for authorization errors and redirect to login if needed
                const status = xhr ? xhr.status : 0;
                if (PbxApiClient.handleAuthError(status)) {
                    return; // Don't call callback if redirecting
                }

                failureCallback(response, false);
            },
            onError(errorMessage, element, xhr) {
                // Only handle real network errors (5xx, timeout, connection refused)
                // For 4xx errors, Semantic UI already called onFailure, so skip
                const status = xhr ? xhr.status : 0;

                // Check for authorization errors and redirect to login if needed
                if (PbxApiClient.handleAuthError(status)) {
                    return; // Don't call callback if redirecting
                }

                // Skip if this is a business error (4xx) - already handled by onFailure
                if (status >= 400 && status < 500) {
                    return;
                }

                // Real network/server error - show generic message
                failureCallback({
                    result: false,
                    messages: {error: ['Network error occurred']}
                }, false);
            }
        };
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
        } else {
            // Get existing record by ID
            url = `${this.apiUrl}/${recordId}`;
        }

        const apiSettings = this.getBaseApiSettings(
            (response) => {
                // Set _isNew flag for new records to indicate POST should be used
                if (isNew && response.data) {
                    response.data._isNew = true;
                }
                callback(response, true);
            },
            callback
        );

        $.api({
            url: url,
            method: 'GET',
            ...apiSettings
        });
    }
    
    /**
     * Get list of records (or single record for singleton)
     * @param {object|function} dataOrCallback - Optional params or callback
     * @param {function} [callback] - Callback if first param is data
     */
    getList(dataOrCallback, callback) {
        // For singleton resources, redirect to get() method
        if (this.isSingleton) {
            if (typeof this.get === 'function') {
                return this.get(dataOrCallback, callback);
            }
        }

        // Handle overloaded parameters
        let actualCallback;
        let params = {};

        if (typeof dataOrCallback === 'function') {
            actualCallback = dataOrCallback;
        } else {
            params = dataOrCallback || {};
            actualCallback = callback;
        }

        // Ensure callback is a function
        if (typeof actualCallback !== 'function') {
            actualCallback = () => {};
        }

        const apiSettings = this.getBaseApiSettings(
            (response) => actualCallback(response, true),
            (response) => {
                // Ensure we return a structure with result and data fields
                if (response && !response.hasOwnProperty('data')) {
                    response.data = [];
                }
                actualCallback(response, false);
            }
        );

        $.api({
            url: this.apiUrl,
            method: 'GET',
            data: params,
            ...apiSettings
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
        // Remove _method as it's handled by the actual HTTP method
        if (cleanData._method !== undefined) {
            delete cleanData._method;
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
                // Check if we need to send as JSON (for complex structures)
                if (PbxApiClient.hasComplexData(cleanData)) {
                    settings.contentType = 'application/json';
                    settings.data = JSON.stringify(cleanData);
                }
                return settings;
            },
            onSuccess(response) {
                callback(response, true);
            },
            onFailure(response) {
                callback(response, false);
            },
            onError() {
                callback({
                    result: false,
                    messages: {error: ['Network error occurred']}
                }, false);
            }
        });
    }

    /**
     * Delete record
     * @param {string} recordId - Record ID to delete
     * @param {function} callback - Callback function
     */
    deleteRecord(recordId, callback) {
        const apiSettings = this.getBaseApiSettings(
            (response) => callback(response, true),
            callback
        );

        $.api({
            url: `${this.apiUrl}/${recordId}`,
            method: 'DELETE',
            ...apiSettings
        });
    }

    /**
     * Call a custom method
     * @param {string} methodName - Method name
     * @param {object|function} dataOrCallback - Data or callback
     * @param {function} [callback] - Callback if first param is data
     * @param {string} [httpMethod] - HTTP method to use (GET or POST), defaults to GET
     * @param {string} [resourceId] - Resource ID for resource-level methods
     */
    callCustomMethod(methodName, dataOrCallback, callback, httpMethod = 'GET', resourceId = null) {
        // Handle overloaded parameters
        let actualCallback;
        let data = {};

        if (typeof dataOrCallback === 'function') {
            actualCallback = dataOrCallback;
        } else {
            data = dataOrCallback || {};
            actualCallback = callback;
        }

        // Ensure callback is a function (use noop if not provided)
        if (typeof actualCallback !== 'function') {
            actualCallback = () => {}; // Empty callback for fire-and-forget calls
        }

        const methodPath = this.customMethods[methodName];
        if (!methodPath) {
            actualCallback({
                result: false,
                messages: {error: [`Unknown custom method: ${methodName}`]}
            });
            return;
        }

        // Extract async channel ID if present (used for long-running operations)
        const asyncChannelId = data.asyncChannelId || data.channelId;

        // Build URL with ID if provided (for resource-level custom methods)
        let url = this.apiUrl;
        if (resourceId) {
            // Resource-level method: /api/v3/resource/{id}:method (RESTful standard)
            url = `${this.apiUrl}/${resourceId}${methodPath}`;
        } else if (data.id) {
            // Fallback: Resource-level method: /api/v3/resource/{id}:method
            url = `${this.apiUrl}/${data.id}${methodPath}`;
            // Remove id from data since it's in the URL
            const requestData = {...data};
            delete requestData.id;
            data = requestData;
        } else {
            // Collection-level method: /api/v3/resource:method
            url = `${this.apiUrl}${methodPath}`;
        }

        // Use JSON for complex data, form encoding for simple data
        const apiSettings = this.getBaseApiSettings(
            (response) => actualCallback(response, true),
            actualCallback
        );

        const ajaxSettings = {
            url: url,
            method: httpMethod,
            ...apiSettings
        };

        // Add async channel header if provided
        if (asyncChannelId) {
            ajaxSettings.beforeXHR = (xhr) => {
                xhr.setRequestHeader('X-Async-Response-Channel-Id', asyncChannelId);
                return xhr;
            };
        }

        // For GET requests, always use query parameters (no JSON in body)
        // For POST/PUT/DELETE, use JSON for complex data (objects, arrays)
        if (httpMethod === 'GET') {
            // GET requests: send as query parameters
            ajaxSettings.data = data;
        } else {
            // POST/PUT/DELETE: check if we need JSON encoding
            const hasComplexData = PbxApiClient.hasComplexData(data);
            if (hasComplexData) {
                // Send as JSON to preserve complex structures
                ajaxSettings.data = JSON.stringify(data);
                ajaxSettings.contentType = 'application/json';
            } else {
                // Send as regular form data
                ajaxSettings.data = data;
            }
        }

        $.api(ajaxSettings);
    }
    
    /**
     * Determine if data represents a new record
     * Can be overridden in specific API modules
     * @param {object} data - Data to check
     * @returns {boolean} True if new record
     */
    isNewRecord(data) {
        // The only way to determine - _isNew flag
        // If flag is not explicitly set, check ID
        if (data._isNew !== undefined) {
            return data._isNew === true || data._isNew === 'true';
        }

        // Fallback to ID check only if flag is not set
        return !data.id || data.id === '' || data.id === 'new';
    }
    
    /**
     * Get record ID from data
     * Can be overridden in specific API modules
     * @param {object} data - Data object
     * @returns {string} Record ID
     */
    getRecordId(data) {
        // REST API v3 uses only 'id' field
        return data.id;
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

    /**
     * Perform GET request (backward compatibility method)
     * @param {object} params - Query parameters
     * @param {function} callback - Callback function
     * @param {string} [id] - Optional record ID for resource-specific requests
     */
    callGet(params, callback, id) {
        let url = this.apiUrl;

        // For non-singleton resources with ID, append ID to URL
        if (!this.isSingleton && id) {
            url = `${this.apiUrl}/${id}`;
        }

        const apiSettings = this.getBaseApiSettings(
            (response) => callback(response, true),
            callback
        );

        $.api({
            url: url,
            method: 'GET',
            data: params || {},
            ...apiSettings
        });
    }

    /**
     * Perform POST request (backward compatibility method)
     * @param {object} data - Data to send
     * @param {function} callback - Callback function
     * @param {string} [id] - Optional resource ID for resource-specific requests
     */
    callPost(data, callback, id) {
        let url = this.apiUrl;
        if (id) {
            url = `${this.apiUrl}/${id}`;
        }

        const hasComplexData = PbxApiClient.hasComplexData(data);
        const apiSettings = this.getBaseApiSettings(
            (response) => callback(response, true),
            callback
        );

        const ajaxSettings = {
            url: url,
            method: 'POST',
            ...apiSettings
        };

        if (hasComplexData) {
            ajaxSettings.data = JSON.stringify(data);
            ajaxSettings.contentType = 'application/json';
        } else {
            ajaxSettings.data = data;
        }

        $.api(ajaxSettings);
    }

    /**
     * Perform PUT request (backward compatibility method)
     * @param {object} data - Data to send
     * @param {function} callback - Callback function
     * @param {string} [id] - Optional resource ID for resource-specific requests
     */
    callPut(data, callback, id) {
        let url = this.apiUrl;
        if (id) {
            url = `${this.apiUrl}/${id}`;
        }

        const hasComplexData = PbxApiClient.hasComplexData(data);
        const apiSettings = this.getBaseApiSettings(
            (response) => callback(response, true),
            callback
        );

        const ajaxSettings = {
            url: url,
            method: 'PUT',
            ...apiSettings
        };

        if (hasComplexData) {
            ajaxSettings.data = JSON.stringify(data);
            ajaxSettings.contentType = 'application/json';
        } else {
            ajaxSettings.data = data;
        }

        $.api(ajaxSettings);
    }

    /**
     * Perform DELETE request (backward compatibility method)
     * @param {function} callback - Callback function
     * @param {string} id - Resource ID to delete
     */
    callDelete(callback, id) {
        const apiSettings = this.getBaseApiSettings(
            (response) => callback(response, true),
            callback
        );

        $.api({
            url: `${this.apiUrl}/${id}`,
            method: 'DELETE',
            ...apiSettings
        });
    }

    /**
     * Perform PATCH request (backward compatibility method)
     * @param {object} data - Data to send
     * @param {function} callback - Callback function
     */
    callPatch(data, callback) {
        const hasComplexData = PbxApiClient.hasComplexData(data);
        const apiSettings = this.getBaseApiSettings(
            (response) => callback(response, true),
            callback
        );

        const ajaxSettings = {
            url: this.apiUrl,
            method: 'PATCH',
            ...apiSettings
        };

        if (hasComplexData) {
            ajaxSettings.data = JSON.stringify(data);
            ajaxSettings.contentType = 'application/json';
        } else {
            ajaxSettings.data = data;
        }

        $.api(ajaxSettings);
    }
}

// Export for use in other modules
window.PbxApiClient = PbxApiClient;