/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global UserMessage, globalTranslate, PbxApi, installStatusLoopWorker */

/**
 * Object for handling the addition of a new extension from a ZIP file.
 *
 * @module addNewExtension
 */
const installationFromZip = {
    /**
     * The upload button element.
     * @type {jQuery}
     */
    $uploadButton: $('#add-new-button'),


    /**
     * The progress bar block.
     * @type {jQuery}
     */
    $progressBarBlock: $('#upload-progress-bar-block'),


    /**
     * The progress bar element.
     * @type {jQuery}
     */
    $progressBar: $('#upload-progress-bar'),

    /**
     * The progress bar label element.
     * @type {jQuery}
     */
    $progressBarLabel: $('#upload-progress-bar-label'),

    /**
     * Flag indicating if an upload is in progress.
     * @type {boolean}
     */
    uploadInProgress: false,

    /**
     * PUB/SUB channel ID
     */
    channelId: 'install-module',

    /**
     * Initializes the addNewExtension object.
     */
    initialize() {
        installationFromZip.$progressBar.hide();
        PbxApi.SystemUploadFileAttachToBtn('add-new-button', ['zip'], installationFromZip.cbResumableUploadFile);
    },

    /**
     * Callback function for resumable file upload.
     * @param {string} action - The action of the upload.
     * @param {object} params - Additional parameters for the upload.
     */
    cbResumableUploadFile(action, params) {
        switch (action) {
            case 'fileSuccess':
                installationFromZip.checkStatusFileMerging(params.response);
                break;
            case 'uploadStart':
                installationFromZip.uploadInProgress = true;
                installationFromZip.$uploadButton.addClass('loading');
                installationFromZip.$progressBar.show();
                installationFromZip.$progressBarBlock.show();
                installationFromZip.$progressBarLabel.text(globalTranslate.ext_UploadInProgress);
                break;
            case 'progress':
                installationFromZip.$progressBar.progress({
                    percent: parseInt(params.percent, 10),
                });
                break;
            case 'error':
                installationFromZip.$progressBarLabel.text(globalTranslate.ext_UploadError);
                installationFromZip.$uploadButton.removeClass('loading');
                UserMessage.showMultiString(globalTranslate.ext_UploadError);
                break;
            default:
        }
    },
    
    /**
     * Checks the status of the file merging process.
     * @param {string} response - The response from the /pbxcore/api/upload/status function.
     */
    checkStatusFileMerging(response) {
        if (response === undefined || PbxApi.tryParseJSON(response) === false) {
            UserMessage.showMultiString(`${globalTranslate.ext_UploadError}`);
            return;
        }
        const json = JSON.parse(response);
        if (json === undefined || json.data === undefined) {
            UserMessage.showMultiString(`${globalTranslate.ext_UploadError}`);
            return;
        }
        const params = {
            fileId: json.data.upload_id,
            filePath: json.data.filename,
            channelId: installationFromZip.channelId
        };
        PbxApi.ModulesInstallFromPackage(params,  (response) => {
            console.log(response);
            installStatusLoopWorker.initialize();
        });
    },

};

// When the document is ready, initialize the external modules management interface.
$(document).ready(() => {
    installationFromZip.initialize();
});
