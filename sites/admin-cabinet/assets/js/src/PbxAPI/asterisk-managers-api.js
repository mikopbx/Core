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

/* global globalRootUrl, sessionStorage, PbxApi, PbxApiClient */

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

// Cache configuration for Asterisk managers
const CACHE_CONFIG = {
    key: 'AsteriskManagersList',
    timeout: 5 * 60 * 1000 // 5 minutes
};

// Add methods to AsteriskManagersAPI using centralized utility
PbxApi.extendApiClient(AsteriskManagersAPI, {

    /**
     * Get Asterisk manager record for editing
     * Uses v3 RESTful API: GET /asterisk-managers/{id} or GET /asterisk-managers:getDefault for new
     * @param {string} recordId - Manager ID or empty/null for new manager
     * @param {function} callback - Callback function to handle response
     * @returns {Object} API call result
     */
    getRecord(recordId, callback) {
        try {
            // Use standardized getRecord method but extract data for backward compatibility
            return PbxApi.standardGetRecord(this, recordId, (response) => {
                if (response && response.result === true && response.data) {
                    // Return just the data object for backward compatibility
                    callback(response.data);
                } else {
                    // Return false for errors (backward compatible)
                    callback(false);
                }
            }, true, 'getDefault');
        } catch (error) {
            return PbxApi.handleApiError('AsteriskManagersAPI.getRecord', error, callback);
        }
    },

    /**
     * Get list of all Asterisk managers with optional caching
     * Uses v3 RESTful API: GET /asterisk-managers
     * @param {function|Object} callbackOrOptions - Callback function or options object
     * @param {Object} [options] - Options when first param is callback
     * @param {boolean} [options.useCache=true] - Whether to use cached data
     * @returns {Object} API call result
     */
    getList(callbackOrOptions, options) {
        try {
            // Normalize parameters
            const { data, callback } = PbxApi.normalizeCallbackParams(callbackOrOptions, options);
            const useCache = data.useCache !== undefined ? data.useCache : true;

            const validation = PbxApi.validateApiParams({ callback }, {
                required: ['callback'],
                types: { callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('AsteriskManagersAPI.getList', validation.errors.join(', '), callback);
            }

            // Check cache first if enabled
            if (useCache) {
                const cached = this.getFromCache(CACHE_CONFIG.key);
                if (cached) {
                    // Return just the array for backward compatibility
                    callback(cached);
                    return;
                }
            }

            return this.callGet({}, (response) => {
                if (response && response.result === true && response.data) {
                    // Save to cache if successful
                    if (useCache) {
                        this.saveToCache(CACHE_CONFIG.key, response.data);
                    }
                    // Return just the array for backward compatibility
                    callback(response.data);
                } else {
                    // Return false for errors (backward compatible)
                    callback(false);
                }
            });
        } catch (error) {
            return PbxApi.handleApiError('AsteriskManagersAPI.getList', error, callback || callbackOrOptions);
        }
    },

    /**
     * Delete Asterisk manager record
     * Uses v3 RESTful API: DELETE /asterisk-managers/{id}
     * @param {string} id - Manager ID to delete
     * @param {function} callback - Callback function to handle response
     * @returns {Object} API call result
     */
    deleteRecord(id, callback) {
        try {
            const validation = PbxApi.validateApiParams({ id, callback }, {
                required: ['id', 'callback'],
                types: { id: 'string', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('AsteriskManagersAPI.deleteRecord', validation.errors.join(', '), callback);
            }

            // Clear cache when deleting
            this.clearCache();

            return this.callDelete(callback, id);
        } catch (error) {
            return PbxApi.handleApiError('AsteriskManagersAPI.deleteRecord', error, callback);
        }
    },

    /**
     * Save (create or update) Asterisk manager record
     * Uses v3 RESTful API: POST for new, PUT for updates
     * @param {Object} data - Manager data to save
     * @param {function} callback - Callback function to handle response
     * @returns {Object} API call result
     */
    saveRecord(data, callback) {
        try {
            const validation = PbxApi.validateApiParams({ data, callback }, {
                required: ['data', 'callback'],
                types: { data: 'object', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('AsteriskManagersAPI.saveRecord', validation.errors.join(', '), callback);
            }

            // Clear cache when saving
            this.clearCache();

            return PbxApiClient.prototype.saveRecord.call(this, data, callback);
        } catch (error) {
            return PbxApi.handleApiError('AsteriskManagersAPI.saveRecord', error, callback);
        }
    },

    /**
     * Get copy data for an Asterisk manager by ID
     * Uses v3 RESTful API: GET /asterisk-managers/{id}:copy
     * @param {string} id - Manager ID to copy from
     * @param {function} callback - Callback function to handle response
     * @returns {Object} API call result
     */
    getCopyData(id, callback) {
        try {
            const validation = PbxApi.validateApiParams({ id, callback }, {
                required: ['id', 'callback'],
                types: { id: 'string', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('AsteriskManagersAPI.getCopyData', validation.errors.join(', '), callback);
            }

            return this.callCustomMethod('copy', {}, callback, 'GET', id);
        } catch (error) {
            return PbxApi.handleApiError('AsteriskManagersAPI.getCopyData', error, callback);
        }
    },

    /**
     * Get managers formatted for dropdown selection
     * Uses v3 RESTful API: GET /asterisk-managers:getForSelect
     * @param {function} callback - Callback function to handle response
     * @returns {Object} API call result
     */
    getForSelect(callback) {
        try {
            const validation = PbxApi.validateApiParams({ callback }, {
                required: ['callback'],
                types: { callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('AsteriskManagersAPI.getForSelect', validation.errors.join(', '), callback);
            }

            return this.callCustomMethod('getForSelect', {}, (response) => {
                if (response && response.result === true && response.data) {
                    // Format data using centralized utility
                    const formattedResponse = PbxApi.formatDropdownResults(response, {
                        addEmpty: false
                    });
                    callback(formattedResponse);
                } else {
                    callback({ success: false, results: [] });
                }
            });
        } catch (error) {
            return PbxApi.handleApiError('AsteriskManagersAPI.getForSelect', error, callback);
        }
    },

    /**
     * Get data from sessionStorage cache
     * @param {string} key - Cache key
     * @returns {*} Cached data or null if not found or expired
     */
    getFromCache(key) {
        try {
            const cached = sessionStorage.getItem(key);
            if (!cached) return null;

            const data = PbxApi.tryParseJSON(cached);
            if (!data) return null;

            const now = Date.now();
            if (now - data.timestamp > CACHE_CONFIG.timeout) {
                sessionStorage.removeItem(key);
                return null;
            }

            return data.value;
        } catch (error) {
            return null;
        }
    },

    /**
     * Save data to sessionStorage cache
     * @param {string} key - Cache key
     * @param {*} value - Data to cache
     */
    saveToCache(key, value) {
        try {
            const data = {
                timestamp: Date.now(),
                value: value
            };
            sessionStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            // Silently ignore cache errors (quota exceeded, etc.)
            console.warn('[AsteriskManagersAPI] Cache save failed:', error.message);
        }
    },

    /**
     * Clear cached data
     */
    clearCache() {
        try {
            sessionStorage.removeItem(CACHE_CONFIG.key);
        } catch (error) {
            // Silently ignore cache errors
        }
    },

    /**
     * Initialize the API module (backward compatibility)
     * @deprecated No longer needed with new PbxApiClient architecture
     */
    initialize() {
        console.warn('[AsteriskManagersAPI] initialize() is deprecated and no longer needed');
        this.clearCache();
    }
});