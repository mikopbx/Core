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

/* global Config, PbxApi, Resumable */

/**
 * ModulesAPI - API client for module management operations
 *
 * Provides methods for installing, uninstalling, enabling, disabling modules,
 * checking module status, and managing module updates.
 *
 * @class ModulesAPI
 */
const ModulesAPI = {

    /**
     * Module management endpoints
     */
    endpoints: {
        moduleStartDownload: `${Config.pbxUrl}/pbxcore/api/modules/core/moduleStartDownload`,
        moduleDownloadStatus: `${Config.pbxUrl}/pbxcore/api/modules/core/moduleDownloadStatus`,
        installFromPackage: `${Config.pbxUrl}/pbxcore/api/modules/core/installFromPackage`,
        installFromRepo: `${Config.pbxUrl}/pbxcore/api/modules/core/installFromRepo`,
        statusOfModuleInstallation: `${Config.pbxUrl}/pbxcore/api/modules/core/statusOfModuleInstallation`,
        enableModule: `${Config.pbxUrl}/pbxcore/api/modules/core/enableModule`,
        disableModule: `${Config.pbxUrl}/pbxcore/api/modules/core/disableModule`,
        uninstallModule: `${Config.pbxUrl}/pbxcore/api/modules/core/uninstallModule`,
        getAvailableModules: `${Config.pbxUrl}/pbxcore/api/modules/core/getAvailableModules`,
        getModuleLink: `${Config.pbxUrl}/pbxcore/api/modules/core/getModuleLink`,
        updateAll: `${Config.pbxUrl}/pbxcore/api/modules/core/updateAll`,
        getMetadataFromModulePackage: `${Config.pbxUrl}/pbxcore/api/modules/core/getMetadataFromModulePackage`,
        getModuleInfo: `${Config.pbxUrl}/pbxcore/api/modules/core/getModuleInfo`
    },

    /**
     * Retrieves available modules from MIKO repository
     * @param {function} callback - Callback function
     */
    getAvailable(callback) {
        $.api({
            url: this.endpoints.getAvailableModules,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data, true);
            },
            onFailure(response) {
                callback(response, false);
            },
            onError() {
                callback(false, false);
            }
        });
    },

    /**
     * Installs a new module from a repository
     * @param {object} params - Installation parameters
     * @param {string} params.uniqid - Module unique ID
     * @param {string} params.releaseId - Release ID to install
     * @param {function} callback - Callback function
     */
    installFromRepo(params, callback) {
        $.api({
            url: this.endpoints.installFromRepo,
            on: 'now',
            method: 'POST',
            data: params,
            successTest: PbxApi.successTest,
            beforeXHR(xhr) {
                xhr.setRequestHeader ('X-Async-Response-Channel-Id', params.channelId);
                return xhr;
            },
            onSuccess(response) {
                callback(response, true);
            },
            onFailure(response) {
                callback(response, false);
            },
            onError() {
                callback(false, false);
            }
        });
    },

    /**
     * Installs a new module from an uploaded zip archive
     * @param {object} params - Installation parameters
     * @param {string} params.filePath - Path to uploaded zip file
     * @param {function} callback - Callback function
     */
    installFromPackage(params, callback) {
        $.api({
            url: this.endpoints.installFromPackage,
            on: 'now',
            method: 'POST',
            data: params,
            beforeXHR(xhr) {
                xhr.setRequestHeader ('X-Async-Response-Channel-Id', params.channelId);
                return xhr;
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response, true);
            },
            onFailure(response) {
                callback(response, false);
            },
            onError() {
                callback(false, false);
            }
        });
    },

    /**
     * Enables an extension module
     * @param {object} params - Enable parameters
     * @param {string} params.uniqid - Module unique ID
     * @param {function} [callback] - Optional callback function
     */
    enableModule(params, callback) {
        $.api({
            url: this.endpoints.enableModule,
            on: 'now',
            method: 'POST',
            data: params,
            successTest: PbxApi.successTest,
            beforeXHR(xhr) {
                xhr.setRequestHeader ('X-Async-Response-Channel-Id', params.channelId);
                return xhr;
            },
            onSuccess(response) {
                if (callback) callback(response, true);
            },
            onFailure(response) {
                if (callback) callback(response, false);
            },
            onError() {
                if (callback) callback(false, false);
            }
        });
    },

    /**
     * Disables an extension module
     * @param {object} params - Disable parameters
     * @param {string} params.uniqid - Module unique ID
     * @param {function} [callback] - Optional callback function
     */
    disableModule(params, callback) {
        $.api({
            url: this.endpoints.disableModule,
            on: 'now',
            method: 'POST',
            data: params,
            beforeXHR(xhr) {
                xhr.setRequestHeader ('X-Async-Response-Channel-Id', params.channelId);
                return xhr;
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                if (callback) callback(response, true);
            },
            onFailure(response) {
                if (callback) callback(response, false);
            },
            onError() {
                if (callback) callback(false, false);
            }
        });
    },

    /**
     * Uninstalls an extension module
     * @param {object} params - Uninstall parameters
     * @param {string} params.uniqid - Module unique ID
     * @param {boolean} [params.keepSettings=false] - Keep module settings
     * @param {function} callback - Callback function
     */
    uninstallModule(params, callback) {
        $.api({
            url: this.endpoints.uninstallModule,
            on: 'now',
            method: 'POST',
            data: params,
            beforeXHR(xhr) {
                xhr.setRequestHeader ('X-Async-Response-Channel-Id', params.channelId);
                return xhr;
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response, true);
            },
            onFailure(response) {
                callback(response, false);
            },
            onError() {
                callback(false, false);
            }
        });
    },

    /**
     * Retrieves module information from the repository
     * @param {object} params - Module info parameters
     * @param {string} params.uniqid - Module unique ID
     * @param {function} callback - Callback function
     */
    getModuleInfo(params, callback) {
        $.api({
            url: this.endpoints.getModuleInfo,
            on: 'now',
            method: 'POST',
            data: params,
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response, true);
            },
            onFailure(response) {
                callback(response, false);
            },
            onError() {
                callback(false, false);
            }
        });
    },

    /**
     * Updates all installed modules
     * @param {object} params - Update parameters
     * @param {function} callback - Callback function
     */
    updateAll(params, callback) {
        $.api({
            url: this.endpoints.updateAll,
            on: 'now',
            method: 'POST',
            data: params,
            successTest: PbxApi.successTest,
            beforeXHR(xhr) {
                xhr.setRequestHeader ('X-Async-Response-Channel-Id', params.channelId);
                return xhr;
            },
            onSuccess(response) {
                callback(response, true);
            },
            onFailure(response) {
                callback(response, false);
            },
            onError() {
                callback(false, false);
            }
        });
    },
};

// Export for use in other modules
window.ModulesAPI = ModulesAPI;