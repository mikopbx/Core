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

/* global UserMessage, globalTranslate, PbxApi, mergingCheckWorker */

/**
 * Object for handling the addition of a new extension from a ZIP file.
 *
 * @module addNewExtension
 */
const addNewExtension = {
    /**
     * The upload button element.
     * @type {jQuery}
     */
    $uploadButton: $('#add-new-button'),

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
     * Initializes the addNewExtension object.
     */
    initialize() {
        addNewExtension.$progressBar.hide();
        PbxApi.SystemUploadFileAttachToBtn('add-new-button', ['zip'], addNewExtension.cbResumableUploadFile);
    },

    /**
     * Callback function for resumable file upload.
     * @param {string} action - The action of the upload.
     * @param {object} params - Additional parameters for the upload.
     */
    cbResumableUploadFile(action, params) {
        switch (action) {
            case 'fileSuccess':
                addNewExtension.checkStatusFileMerging(params.response);
                break;
            case 'uploadStart':
                addNewExtension.uploadInProgress = true;
                addNewExtension.$uploadButton.addClass('loading');
                addNewExtension.$progressBar.show();
                addNewExtension.$progressBarLabel.text(globalTranslate.ext_UploadInProgress);
                break;
            case 'progress':
                addNewExtension.$progressBar.progress({
                    percent: parseInt(params.percent, 10),
                });
                break;
            case 'error':
                addNewExtension.$progressBarLabel.text(globalTranslate.ext_UploadError);
                addNewExtension.$uploadButton.removeClass('loading');
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
        const fileID = json.data.upload_id;
        const filePath = json.data.filename;
        mergingCheckWorker.initialize(fileID, filePath);
    },

};

// When the document is ready, initialize the external modules management interface.
$(document).ready(() => {
    addNewExtension.initialize();
});
