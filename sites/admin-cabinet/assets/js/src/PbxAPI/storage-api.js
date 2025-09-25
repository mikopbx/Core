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

/* global PbxApiClient, $, globalRootUrl, PbxApi */

/**
 * StorageAPI - REST API v3 client for Storage management (Singleton resource)
 *
 * Provides a clean interface for Storage operations.
 * Storage is a singleton resource - there's only one storage configuration in the system.
 *
 * @class StorageAPI 
 */
const StorageAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/storage',
    singleton: true,
    customMethods: {
        getUsage: ':usage',
        getList: ':list'
    }
});

/**
 * Get Storage settings (Singleton GET)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.get((response) => {
 *     if (response.result) {
 *         console.log('Settings:', response.data);
 *     }
 * });
 */
StorageAPI.get = function(callback) {
    return this.callGet({}, callback);
};

// Alias for backward compatibility
StorageAPI.getSettings = StorageAPI.get;

/**
 * Update Storage settings (Singleton PUT)
 *
 * @param {object} data - Settings data to update
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.update({
 *     PBXRecordSavePeriod: '180'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings updated successfully');
 *     }
 * });
 */
StorageAPI.update = function(data, callback) {
    return this.callPut(data, callback);
};

// Alias for backward compatibility
StorageAPI.updateSettings = StorageAPI.update;

/**
 * Partially update Storage settings (Singleton PATCH)
 *
 * @param {object} data - Settings data to patch
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.patch({
 *     PBXRecordSavePeriod: '360'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Settings patched successfully');
 *     }
 * });
 */
StorageAPI.patch = function(data, callback) {
    return this.callPatch(data, callback);
};

/**
 * Get storage usage statistics (Custom method)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.getUsage((response) => {
 *     if (response.result) {
 *         console.log('Usage statistics:', response.data);
 *     }
 * });
 */
StorageAPI.getUsage = function(callback) {
    return this.callCustomMethod('getUsage', {}, callback);
};

// Backward compatibility - wrap old method to use new API
StorageAPI.getStorageUsage = function(callback) {
    this.getUsage((response) => {
        if (response.result) {
            callback(response.data);
        } else {
            callback(false);
        }
    });
};

/**
 * Get list of all storage devices (Custom method)
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.getList((response) => {
 *     if (response.result) {
 *         console.log('Storage devices:', response.data);
 *     }
 * });
 */
StorageAPI.getList = function(callback) {
    return this.callCustomMethod('getList', {}, callback);
};

// Backward compatibility - wrap old method to use new API
StorageAPI.getStorageList = function(callback) {
    this.getList((response) => {
        if (response.result) {
            callback(response.data);
        } else {
            callback(false);
        }
    });
};