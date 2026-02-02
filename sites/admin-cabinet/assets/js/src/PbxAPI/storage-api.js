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

/**
 * Test S3 connection with provided credentials
 *
 * @param {object} data - S3 connection settings to test
 * @param {string} data.s3_endpoint - S3 endpoint URL
 * @param {string} data.s3_region - S3 region
 * @param {string} data.s3_bucket - S3 bucket name
 * @param {string} data.s3_access_key - S3 access key
 * @param {string} data.s3_secret_key - S3 secret key
 * @param {function} callback - Callback function to handle the response
 * @example
 * StorageAPI.testS3Connection({
 *     s3_endpoint: 'https://s3.amazonaws.com',
 *     s3_region: 'us-east-1',
 *     s3_bucket: 'my-bucket',
 *     s3_access_key: 'AKIAIOSFODNN7EXAMPLE',
 *     s3_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
 * }, (response) => {
 *     if (response.result) {
 *         console.log('Connection test:', response.data.message);
 *     }
 * });
 */
/**
 * S3StorageAPI - REST API v3 client for S3 Storage management (Singleton resource)
 *
 * Provides interface for S3-compatible cloud storage operations.
 * S3 Storage is a singleton resource - there's only one S3 configuration in the system.
 *
 * @class S3StorageAPI
 */
const S3StorageAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/s3-storage',
    singleton: true,
    customMethods: {
        testConnection: ':testConnection',
        stats: ':stats'
    }
});

/**
 * Get S3 Storage settings (Singleton GET)
 *
 * @param {function} callback - Callback function to handle the response
 */
S3StorageAPI.get = function(callback) {
    return this.callGet({}, callback);
};

/**
 * Update S3 Storage settings (Singleton PUT)
 *
 * @param {object} data - S3 settings data to update
 * @param {function} callback - Callback function to handle the response
 */
S3StorageAPI.update = function(data, callback) {
    return this.callPut(data, callback);
};

/**
 * Partially update S3 Storage settings (Singleton PATCH)
 *
 * @param {object} data - S3 settings data to patch
 * @param {function} callback - Callback function to handle the response
 */
S3StorageAPI.patch = function(data, callback) {
    return this.callPatch(data, callback);
};

/**
 * Test S3 connection with provided credentials (Custom method)
 *
 * @param {object} data - S3 connection settings to test
 * @param {function} callback - Callback function to handle the response
 */
S3StorageAPI.testConnection = function(data, callback) {
    return this.callCustomMethod('testConnection', data, callback);
};

/**
 * Get S3 synchronization statistics (Custom method)
 *
 * Returns detailed statistics about S3 storage synchronization including:
 * - Number of files in S3 and locally
 * - Total size in S3 and pending upload
 * - Sync percentage and status (synced/syncing/pending/disabled)
 * - Last upload timestamp and oldest pending file date
 * - S3 connection status
 *
 * @param {function} callback - Callback function to handle the response
 * @example
 * S3StorageAPI.getStats((response) => {
 *     if (response.result) {
 *         console.log('S3 Stats:', response.data);
 *         console.log('Sync %:', response.data.sync_percentage);
 *     }
 * });
 */
S3StorageAPI.getStats = function(callback) {
    return this.callCustomMethod('stats', {}, callback);
};

// Backward compatibility - keep old method name
StorageAPI.testS3Connection = function(data, callback) {
    S3StorageAPI.testConnection(data, callback);
};