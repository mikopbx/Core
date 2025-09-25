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
                callback(response.data);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
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
    },

    /**
     * Checks the status of a module installation
     * @param {string} filePath - Path to the module package
     * @param {function} callback - Callback function
     */
    getModuleInstallationStatus(filePath, callback) {
        $.api({
            url: this.endpoints.statusOfModuleInstallation,
            on: 'now',
            method: 'POST',
            data: { filePath },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                if (response !== undefined && response.data !== undefined) {
                    callback(response.data);
                }
            },
            onError(errorMessage, element, xhr) {
                if (xhr.status === 401) {
                    window.location = `${globalRootUrl}session/index`;
                }
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
            onSuccess(response) {
                if (callback) callback(response);
            },
            onFailure(response) {
                if (callback) callback(response);
            },
            onError() {
                if (callback) callback(false);
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
            successTest: PbxApi.successTest,
            onSuccess(response) {
                if (callback) callback(response);
            },
            onFailure(response) {
                if (callback) callback(response);
            },
            onError() {
                if (callback) callback(false);
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
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
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
    },

    /**
     * Starts module download in background
     * @param {object} params - Download parameters
     * @param {string} params.uniqid - Module unique ID
     * @param {string} params.md5 - MD5 checksum
     * @param {string} params.size - File size
     * @param {string} params.updateLink - Download URL
     * @param {function} callback - Callback function
     */
    moduleStartDownload(params, callback) {
        $.api({
            url: this.endpoints.moduleStartDownload,
            on: 'now',
            method: 'POST',
            data: params,
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onError() {
                callback(false);
            }
        });
    },

    /**
     * Gets module download status
     * @param {string} moduleUniqueID - Module unique ID
     * @param {function} callback - Callback function
     * @param {boolean} [failureCallback] - Whether to call callback on failure
     */
    moduleDownloadStatus(moduleUniqueID, callback, failureCallback = true) {
        $.api({
            url: this.endpoints.moduleDownloadStatus,
            on: 'now',
            method: 'POST',
            data: { uniqid: moduleUniqueID },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onFailure() {
                if (failureCallback) callback(false);
            },
            onError() {
                if (failureCallback) callback(false);
            }
        });
    },

    /**
     * Retrieves module metadata from an uploaded zip archive
     * @param {string} filePath - Path to zip file
     * @param {function} callback - Callback function
     */
    getMetadataFromModulePackage(filePath, callback) {
        $.api({
            url: this.endpoints.getMetadataFromModulePackage,
            on: 'now',
            method: 'POST',
            data: { filePath },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(true, response);
            },
            onError(errorMessage, element, xhr) {
                if (xhr.status === 401) {
                    window.location = `${globalRootUrl}session/index`;
                }
                callback(false, errorMessage);
            },
            onFailure(response) {
                callback(false, response);
            }
        });
    },

    /**
     * Retrieves the installation link for a module
     * @param {object} params - Link parameters
     * @param {string} params.uniqid - Module unique ID
     * @param {function} callback - Callback function
     */
    getModuleLink(params, callback) {
        $.api({
            url: this.endpoints.getModuleLink,
            on: 'now',
            method: 'POST',
            data: params,
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
            onError() {
                callback(false);
            }
        });
    },

    /**
     * Helper method to attach file upload to button with Resumable.js
     * @param {string} buttonId - Button element ID
     * @param {string[]} fileTypes - Allowed file types
     * @param {function} callback - Callback function for upload events
     */
    uploadFileAttachToBtn(buttonId, fileTypes, callback) {
        const r = new Resumable({
            target: `${Config.pbxUrl}/pbxcore/api/v3/files:upload`,
            testChunks: false,
            chunkSize: 3 * 1024 * 1024,
            maxFiles: 1,
            simultaneousUploads: 1,
            fileType: fileTypes,
        });

        r.assignBrowse(document.getElementById(buttonId));
        r.on('fileSuccess', (file, response) => {
            callback('fileSuccess', {file, response});
        });
        r.on('fileProgress', (file) => {
            callback('fileProgress', {file});
        });
        r.on('fileAdded', (file, event) => {
            r.upload();
            callback('fileAdded', {file, event});
        });
        r.on('fileRetry', (file) => {
            callback('fileRetry', {file});
        });
        r.on('fileError', (file, message) => {
            callback('fileError', {file, message});
        });
        r.on('uploadStart', () => {
            callback('uploadStart');
        });
        r.on('complete', () => {
            callback('complete');
        });
        r.on('progress', () => {
            const percent = 100 * r.progress();
            callback('progress', {percent});
        });
        r.on('error', (message, file) => {
            callback('error', {message, file});
        });
        r.on('pause', () => {
            callback('pause');
        });
        r.on('cancel', () => {
            callback('cancel');
        });
        r.on('chunkingStart', (file) => {
            callback('chunkingStart', {file});
        });
        r.on('chunkingProgress', (file, ratio) => {
            callback('chunkingProgress', {file, ratio});
        });
        r.on('chunkingComplete', (file) => {
            callback('chunkingComplete', {file});
        });

        return r;
    }
};

// Export for use in other modules
window.ModulesAPI = ModulesAPI;