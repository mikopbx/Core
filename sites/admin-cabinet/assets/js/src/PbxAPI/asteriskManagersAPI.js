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
 * Asterisk Managers API module.
 * @module AsteriskManagersAPI
 */
const AsteriskManagersAPI = {
    /**
     * API endpoint for Asterisk managers.
     * @type {string}
     */
    endpoint: `${globalRootUrl}api/asterisk-managers`,
    
    /**
     * API endpoints for REST API v2 integration with PbxDataTableIndex
     * @type {object}
     */
    endpoints: {
        getList: '/pbxcore/api/v2/asterisk-managers/getList',
        getRecord: '/pbxcore/api/v2/asterisk-managers/getRecord',
        saveRecord: '/pbxcore/api/v2/asterisk-managers/saveRecord',
        deleteRecord: '/pbxcore/api/v2/asterisk-managers/deleteRecord'
    },

    /**
     * Cache key for managers list.
     * @type {string}
     */
    cacheKey: 'AsteriskManagersList',

    /**
     * Cache timeout in milliseconds (5 minutes).
     * @type {number}
     */
    cacheTimeout: 5 * 60 * 1000,

    /**
     * Get list of all Asterisk managers.
     * 
     * @param {function} callback - Callback function to handle the response.
     * @param {boolean} useCache - Whether to use cached data if available (default: true).
     */
    getList(callback, useCache = true) {
        // Check cache first
        if (useCache) {
            const cached = this.getFromCache(this.cacheKey);
            if (cached) {
                callback(cached);
                return;
            }
        }

        $.api({
            url: this.endpoints.getList,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                if (response.data) {
                    this.saveToCache(this.cacheKey, response.data);
                    callback(response.data);
                } else {
                    callback([]);
                }
            },
            onFailure: (response) => {
                callback([]);
            },
            onError: () => {
                callback([]);
            }
        });
    },

    /**
     * Get single Asterisk manager by ID.
     * 
     * @param {string} id - Manager ID.
     * @param {function} callback - Callback function to handle the response.
     */
    getRecord(id, callback) {
        const url = id ? `${this.endpoints.getRecord}/${id}` : this.endpoints.getRecord;
        
        $.api({
            url: url,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                callback(response.data);
            },
            onFailure: (response) => {
                callback(false);
            },
            onError: () => {
                callback(false);
            }
        });
    },

    /**
     * Save (create or update) Asterisk manager.
     * 
     * @param {object} data - Manager data to save.
     * @param {function} callback - Callback function to handle the response.
     */
    saveRecord(data, callback) {
        // Clear cache when saving
        this.clearCache();

        const isUpdate = data.id && data.id !== '';
        const method = isUpdate ? 'PUT' : 'POST';
        const url = isUpdate ? `${this.endpoints.saveRecord}/${data.id}` : this.endpoints.saveRecord;

        $.api({
            url: url,
            on: 'now',
            method: method,
            data: data,
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback(false);
            }
        });
    },

    /**
     * Delete Asterisk manager by ID.
     * 
     * @param {string} id - Manager ID to delete.
     * @param {function} callback - Callback function to handle the response.
     */
    deleteRecord(id, callback) {
        // Clear cache when deleting
        this.clearCache();

        $.api({
            url: `${this.endpoints.deleteRecord}/${id}`,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                callback(response);
            },
            onFailure: (response) => {
                callback(response);
            },
            onError: () => {
                callback(false);
            }
        });
    },

    /**
     * Get copy of manager record for duplication.
     * 
     * @param {string} id - Manager ID to copy.
     * @param {function} callback - Callback function to handle the response.
     */
    getCopyRecord(id, callback) {
        $.api({
            url: `${this.endpoints.getRecord}?copy-source=${id}`,
            on: 'now',
            method: 'GET',
            successTest: PbxApi.successTest,
            onSuccess: (response) => {
                callback(response.data);
            },
            onFailure: (response) => {
                callback(false);
            },
            onError: () => {
                callback(false);
            }
        });
    },

    /**
     * Get managers for dropdown/select.
     * Returns simplified data suitable for dropdown population.
     * 
     * @param {function} callback - Callback function to handle the response.
     */
    getForSelect(callback) {
        this.getList((managers) => {
            if (managers === false) {
                callback(false);
                return;
            }

            const selectData = managers.map(manager => ({
                name: manager.represent || manager.username,
                value: manager.id,
                username: manager.username,
                description: manager.description
            }));

            callback(selectData);
        });
    },

    /**
     * Get data from cache.
     * 
     * @param {string} key - Cache key.
     * @returns {*} Cached data or null if not found or expired.
     */
    getFromCache(key) {
        try {
            const cached = sessionStorage.getItem(key);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = Date.now();

            if (now - data.timestamp > this.cacheTimeout) {
                sessionStorage.removeItem(key);
                return null;
            }

            return data.value;
        } catch (e) {
            return null;
        }
    },

    /**
     * Save data to cache.
     * 
     * @param {string} key - Cache key.
     * @param {*} value - Data to cache.
     */
    saveToCache(key, value) {
        try {
            const data = {
                timestamp: Date.now(),
                value: value
            };
            sessionStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            // Ignore cache errors
        }
    },

    /**
     * Clear all cached data.
     */
    clearCache() {
        try {
            sessionStorage.removeItem(this.cacheKey);
        } catch (e) {
            // Ignore cache errors
        }
    },

    /**
     * Initialize the API module.
     * Sets up any required event listeners or initial data loading.
     */
    initialize() {
        // Clear cache on page load to ensure fresh data
        this.clearCache();
    }
};