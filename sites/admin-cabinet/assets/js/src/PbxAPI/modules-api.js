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

/* global Config, PbxApi, PbxApiClient */

/**
 * ModulesAPI - Modern v3 API client for module management operations
 *
 * Uses unified PbxApiClient for standard RESTful operations following Google API Design Guide patterns.
 * All custom methods follow the :methodName convention with automatic async channel header support.
 *
 * Standard CRUD operations available via PbxApiClient:
 * - getList(params, callback) - GET /pbxcore/api/v3/modules
 * - getRecord(id, callback) - GET /pbxcore/api/v3/modules/{id}
 * - saveRecord(data, callback) - POST/PUT /pbxcore/api/v3/modules[/{id}]
 * - deleteRecord(id, callback) - DELETE /pbxcore/api/v3/modules/{id}
 *
 * Custom methods (Google API Design Guide):
 * - getAvailable(callback) - GET /pbxcore/api/v3/modules:getAvailableModules
 * - getModuleInfo(params, callback) - GET /pbxcore/api/v3/modules/{id}:getModuleInfo
 * - installFromRepo(params, callback) - POST /pbxcore/api/v3/modules/{id}:installFromRepo
 * - installFromPackage(params, callback) - POST /pbxcore/api/v3/modules:installFromPackage
 * - enableModule(params, callback) - POST /pbxcore/api/v3/modules/{id}:enable
 * - disableModule(params, callback) - POST /pbxcore/api/v3/modules/{id}:disable
 * - uninstallModule(params, callback) - POST /pbxcore/api/v3/modules/{id}:uninstall
 * - updateAll(params, callback) - POST /pbxcore/api/v3/modules:updateAll
 *
 * @class ModulesAPI
 */
const ModulesAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/modules',
    customMethods: {
        getDefault: ':getDefault',
        getAvailableModules: ':getAvailableModules',
        getModuleInfo: ':getModuleInfo',
        getModuleLink: ':getModuleLink',
        installFromRepo: ':installFromRepo',
        installFromPackage: ':installFromPackage',
        enable: ':enable',
        disable: ':disable',
        uninstall: ':uninstall',
        updateAll: ':updateAll',
        startDownload: ':startDownload',
        getDownloadStatus: ':getDownloadStatus',
        getMetadataFromPackage: ':getMetadataFromPackage',
        getInstallationStatus: ':getInstallationStatus'
    }
});

/**
 * Retrieves available modules from MIKO repository
 * @param {function} callback - Callback function (response, success)
 */
ModulesAPI.getAvailable = function(callback) {
    this.callCustomMethod('getAvailableModules', (response, success) => {
        if (success && response.data) {
            callback(response.data, true);
        } else {
            callback(response, false);
        }
    }, undefined, 'GET');
};

/**
 * Installs a new module from a repository
 * @param {object} params - Installation parameters
 * @param {string} params.uniqid - Module unique ID
 * @param {string} params.releaseId - Release ID to install
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {function} callback - Callback function (response, success)
 */
ModulesAPI.installFromRepo = function(params, callback) {
    const requestData = {
        releaseId: params.releaseId || 0,
        asyncChannelId: params.channelId // Will be auto-extracted to header by PbxApiClient
    };

    this.callCustomMethod('installFromRepo', requestData, callback, 'POST', params.uniqid);
};

/**
 * Installs a new module from an uploaded zip archive
 * @param {object} params - Installation parameters
 * @param {string} params.filePath - Path to uploaded zip file
 * @param {string} params.fileId - File upload ID
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {function} callback - Callback function (response, success)
 */
ModulesAPI.installFromPackage = function(params, callback) {
    const requestData = {
        filePath: params.filePath,
        fileId: params.fileId,
        asyncChannelId: params.channelId // Will be auto-extracted to header by PbxApiClient
    };

    this.callCustomMethod('installFromPackage', requestData, callback, 'POST');
};

/**
 * Enables an extension module
 * @param {object} params - Enable parameters
 * @param {string} params.uniqid - Module unique ID
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {function} [callback] - Optional callback function (response, success)
 */
ModulesAPI.enableModule = function(params, callback) {
    const requestData = {
        asyncChannelId: params.channelId // Will be auto-extracted to header by PbxApiClient
    };

    this.callCustomMethod('enable', requestData, callback, 'POST', params.uniqid);
};

/**
 * Disables an extension module
 * @param {object} params - Disable parameters
 * @param {string} params.uniqid - Module unique ID
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {string} [params.reason] - Disable reason
 * @param {string} [params.reasonText] - Disable reason text
 * @param {function} [callback] - Optional callback function (response, success)
 */
ModulesAPI.disableModule = function(params, callback) {
    const requestData = {
        asyncChannelId: params.channelId, // Will be auto-extracted to header by PbxApiClient
        reason: params.reason || '',
        reasonText: params.reasonText || ''
    };

    this.callCustomMethod('disable', requestData, callback, 'POST', params.uniqid);
};

/**
 * Uninstalls an extension module
 * @param {object} params - Uninstall parameters
 * @param {string} params.uniqid - Module unique ID
 * @param {boolean} [params.keepSettings=false] - Keep module settings
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {function} callback - Callback function (response, success)
 */
ModulesAPI.uninstallModule = function(params, callback) {
    const requestData = {
        keepSettings: params.keepSettings || false,
        asyncChannelId: params.channelId // Will be auto-extracted to header by PbxApiClient
    };

    this.callCustomMethod('uninstall', requestData, callback, 'POST', params.uniqid);
};

/**
 * Retrieves module information from the repository
 * @param {object} params - Module info parameters
 * @param {string} params.uniqid - Module unique ID
 * @param {function} callback - Callback function (data, success)
 */
ModulesAPI.getModuleInfo = function(params, callback) {
    this.callCustomMethod('getModuleInfo', {}, (response, success) => {
        if (success && response.data) {
            callback(response.data, true);
        } else {
            callback(response, false);
        }
    }, 'GET', params.uniqid);
};

/**
 * Updates all installed modules
 * @param {object} params - Update parameters
 * @param {array} params.modulesForUpdate - Array of module IDs to update
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {function} callback - Callback function (response, success)
 */
ModulesAPI.updateAll = function(params, callback) {
    const requestData = {
        modulesForUpdate: params.modulesForUpdate,
        asyncChannelId: params.channelId // Will be auto-extracted to header by PbxApiClient
    };

    this.callCustomMethod('updateAll', requestData, callback, 'POST');
};

// Export for use in other modules
window.ModulesAPI = ModulesAPI;
