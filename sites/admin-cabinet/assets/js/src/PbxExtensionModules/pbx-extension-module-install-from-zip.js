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
 * Handles the process of installing new PBX extensions from a ZIP file.
 * This includes managing file uploads, displaying upload progress, and initiating the installation process.
 *
 * @module addNewExtension
 */
const installationFromZip = {
    /**
     * The jQuery object representing the upload button element in the DOM.
     * Users interact with this button to select and upload ZIP files containing new extensions.
     * @type {jQuery}
     */
    $uploadButton: $('#add-new-button'),


    /**
     * The jQuery object for the block element that contains the progress bar.
     * This element is shown during the file upload process to provide visual feedback to the user.
     * @type {jQuery}
     */
    $progressBarBlock: $('#upload-progress-bar-block'),

    /**
     * The jQuery object for the actual progress bar element.
     * It visually represents the progress of the file upload operation to the user.
     * @type {jQuery}
     */
    $progressBar: $('#upload-progress-bar'),

    /**
     * The jQuery object for the label element associated with the progress bar.
     * This label provides textual feedback about the upload status (e.g., percentage completed, errors).
     * @type {jQuery}
     */
    $progressBarLabel: $('#upload-progress-bar-label'),

    /**
     * A flag indicating whether a file upload is currently in progress.
     * This helps manage the UI state and prevent multiple concurrent uploads.
     * @type {boolean}
     */
    uploadInProgress: false,

    /**
     * A unique identifier for the PUB/SUB channel used to monitor the installation process.
     * This allows the system to receive updates about the installation status.
     */
    channelId: 'install-module',

    /**
     * Initializes the installationFromZip module by setting up the necessary UI elements
     * and attaching event listeners for file uploads.
     */
    initialize() {
        installationFromZip.$progressBar.hide();
        PbxApi.SystemUploadFileAttachToBtn('add-new-button', ['zip'], installationFromZip.cbResumableUploadFile);
    },

    /**
     * Handles the various stages of the file upload process, including starting the upload,
     * tracking progress, and handling success or error events.
     *
     * @param {string} action - The current action or stage of the file upload process.
     * @param {object} params - Additional parameters related to the current upload action,
     *                          such as progress percentage or response data on completion.
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
                    percent: Math.max(Math.round(parseInt(params.percent, 10)/2)-2, 1),
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
     * Checks the status of the file merging process on the server after a successful upload.
     * This step is necessary to ensure that the uploaded ZIP file is properly processed
     * and ready for installation.
     *
     * @param {string} response - The server's response from the file upload process,
     *                            containing information necessary to proceed with the installation.
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
            console.debug(response);
            if (response.result === true) {
                $('html, body').animate({
                    scrollTop: installationFromZip.$progressBarBlock.offset().top,
                }, 2000);
            }
        });
    },

};

// Initializes the installationFromZip module when the DOM is fully loaded,
// allowing users to upload and install extensions from ZIP files.
$(document).ready(() => {
    installationFromZip.initialize();
});
