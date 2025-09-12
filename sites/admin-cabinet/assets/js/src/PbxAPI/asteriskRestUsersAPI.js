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

/* global globalRootUrl, sessionStorage, PbxApi */

/**
 * Asterisk REST Interface (ARI) Users API module.
 * @module AsteriskRestUsersAPI
 */
const AsteriskRestUsersAPI = {
    /**
     * Base API endpoint for ARI users (v3 RESTful).
     * @type {string}
     */
    endpoint: '/pbxcore/api/v3/asterisk-rest-users',
    
    /**
     * Endpoint definitions for unification with PbxDataTableIndex
     */
    endpoints: {
        getList: '/pbxcore/api/v3/asterisk-rest-users',
        getRecord: '/pbxcore/api/v3/asterisk-rest-users',
        saveRecord: '/pbxcore/api/v3/asterisk-rest-users',
        deleteRecord: '/pbxcore/api/v3/asterisk-rest-users'
    },
    
    /**
     * Cache key for ARI users list.
     * @type {string}
     */
    cacheKey: 'AsteriskRestUsersList',

    /**
     * Cache timeout in milliseconds (5 minutes).
     * @type {number}
     */
    cacheTimeout: 5 * 60 * 1000,

    /**
     * Get list of all ARI users.
     * Modified to work with PbxDataTableIndex base class.
     * 
     * @param {function} callback - Callback function to handle the response.
     * @param {boolean} useCache - Whether to use cached data if available (default: true).
     */
    getList(callback, useCache = true) {
        // Check if callback is actually params object (for backward compatibility)
        if (typeof callback === 'object' && !Array.isArray(callback)) {
            // Old signature: getList(params, callback, useCache)
            const params = callback;
            const actualCallback = arguments[1];
            const actualUseCache = arguments[2] !== undefined ? arguments[2] : false;
            return this.getListWithParams(params, actualCallback, actualUseCache);
        }
        
        // New signature for PbxDataTableIndex: getList(callback, useCache)
        if (useCache) {
            const cached = this.getFromCache(this.cacheKey);
            if (cached) {
                // Convert to array format expected by PbxDataTableIndex
                const items = cached.items || cached;
                callback(items);
                return;
            }
        }

        $.api({
            url: this.endpoint,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                // PbxDataTableIndex now handles both v2 and v3 API formats
                // Just pass the response as-is
                if (response && response.data) {
                    this.saveToCache(this.cacheKey, response);
                    callback(response);
                } else {
                    callback({ result: false, data: [] });
                }
            },
            onFailure: (response) => {
                // Return empty response structure
                callback({ result: false, data: [] });
            },
            onError: () => {
                // Return empty response structure
                callback({ result: false, data: [] });
            }
        });
    },
    
    /**
     * Get list with parameters (legacy method for backward compatibility).
     * 
     * @param {object} params - Query parameters (limit, offset, search, enabled).
     * @param {function} callback - Callback function to handle the response.
     * @param {boolean} useCache - Whether to use cached data if available (default: false for filtered requests).
     */
    getListWithParams(params = {}, callback, useCache = false) {
        // Only use cache for unfiltered requests
        if (useCache && Object.keys(params).length === 0) {
            const cached = this.getFromCache(this.cacheKey);
            if (cached) {
                callback(cached);
                return;
            }
        }

        // Build query string
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.offset) queryParams.append('offset', params.offset);
        if (params.search) queryParams.append('search', params.search);
        if (params.enabled !== undefined) queryParams.append('enabled', params.enabled);
        
        const queryString = queryParams.toString();
        const url = queryString ? `${this.endpoint}?${queryString}` : this.endpoint;

        $.api({
            url: url,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                if (response.data) {
                    // Cache only unfiltered results
                    if (Object.keys(params).length === 0) {
                        this.saveToCache(this.cacheKey, response.data);
                    }
                    callback(response.data);
                } else {
                    callback({ items: [], total: 0 });
                }
            },
            onFailure: (response) => {
                callback({ items: [], total: 0 });
            },
            onError: () => {
                callback({ items: [], total: 0 });
            }
        });
    },

    /**
     * Get single ARI user by ID or defaults for new record.
     * 
     * @param {string} id - User ID (empty for defaults).
     * @param {function} callback - Callback function to handle the response.
     */
    getRecord(id, callback) {
        // If no ID, get defaults
        if (!id) {
            this.getDefaults(callback);
            return;
        }

        $.api({
            url: `${this.endpoint}/${id}`,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                callback(response.data || false);
            },
            onFailure: () => {
                callback(false);
            },
            onError: () => {
                callback(false);
            }
        });
    },
    
    /**
     * Get default values for new ARI user.
     * 
     * @param {function} callback - Callback function to handle the response.
     */
    getDefaults(callback) {
        $.api({
            url: `${this.endpoint}:getDefaults`,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                callback(response.data || false);
            },
            onFailure: () => {
                callback(false);
            },
            onError: () => {
                callback(false);
            }
        });
    },

    /**
     * Create new ARI user.
     * 
     * @param {object} data - User data.
     * @param {function} callback - Callback function to handle the response.
     */
    createRecord(data, callback) {
        this.clearCache();
        
        $.api({
            url: this.endpoint,
            on: 'now',
            method: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: (response) => {
                callback({ success: false, messages: { error: ['Network error'] } });
            }
        });
    },

    /**
     * Update ARI user (full update - PUT).
     * 
     * @param {string} id - User ID.
     * @param {object} data - User data.
     * @param {function} callback - Callback function to handle the response.
     */
    updateRecord(id, data, callback) {
        if (!id) {
            callback({ success: false, messages: { error: ['ID is required'] } });
            return;
        }

        this.clearCache();
        
        $.api({
            url: `${this.endpoint}/${id}`,
            on: 'now',
            method: 'PUT',
            data: JSON.stringify(data),
            contentType: 'application/json',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: (response) => {
                callback({ success: false, messages: { error: ['Network error'] } });
            }
        });
    },

    /**
     * Partially update ARI user (PATCH).
     * 
     * @param {string} id - User ID.
     * @param {object} data - Partial user data to update.
     * @param {function} callback - Callback function to handle the response.
     */
    patchRecord(id, data, callback) {
        if (!id) {
            callback({ success: false, messages: { error: ['ID is required'] } });
            return;
        }

        this.clearCache();
        
        $.api({
            url: `${this.endpoint}/${id}`,
            on: 'now',
            method: 'PATCH',
            data: JSON.stringify(data),
            contentType: 'application/json',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: (response) => {
                callback({ success: false, messages: { error: ['Network error'] } });
            }
        });
    },

    /**
     * Delete ARI user.
     * 
     * @param {string} id - User ID.
     * @param {function} callback - Callback function to handle the response.
     */
    deleteRecord(id, callback) {
        if (!id) {
            if (callback) {
                callback({ success: false, messages: { error: ['ID is required'] } });
            }
            return;
        }

        this.clearCache();
        
        $.api({
            url: `${this.endpoint}/${id}`,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                if (callback) {
                    callback(response);
                }
            },
            onFailure: (response) => {
                if (callback) {
                    callback(response);
                }
            },
            onError: (response) => {
                if (callback) {
                    callback({ success: false, messages: { error: ['Network error'] } });
                }
            }
        });
    },

    /**
     * Save or update ARI user based on ID presence.
     * 
     * @param {object} data - User data (with or without ID).
     * @param {function} callback - Callback function to handle the response.
     */
    saveRecord(data, callback) {
        if (data.id) {
            // Existing record - update
            const id = data.id;
            delete data.id; // Remove ID from data for PUT request
            this.updateRecord(id, data, callback);
        } else {
            // New record - create
            this.createRecord(data, callback);
        }
    },

    /**
     * Get data from sessionStorage cache.
     * 
     * @param {string} key - Cache key.
     * @returns {*} Cached data or null if not found or expired.
     */
    getFromCache(key) {
        try {
            const cached = sessionStorage.getItem(key);
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            const now = new Date().getTime();
            
            if (data.expiry && data.expiry > now) {
                return data.value;
            }
            
            // Cache expired - remove it
            sessionStorage.removeItem(key);
            return null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Save data to sessionStorage cache.
     * 
     * @param {string} key - Cache key.
     * @param {*} value - Data to cache.
     */
    saveToCache(key, value) {
        try {
            const data = {
                value: value,
                expiry: new Date().getTime() + this.cacheTimeout
            };
            sessionStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            // Ignore cache errors
        }
    },

    /**
     * Clear cache for ARI users.
     */
    clearCache() {
        try {
            sessionStorage.removeItem(this.cacheKey);
        } catch (e) {
            // Ignore cache errors
        }
    }
};