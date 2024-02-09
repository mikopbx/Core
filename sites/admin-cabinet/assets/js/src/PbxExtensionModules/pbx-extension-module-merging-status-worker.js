/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, globalTranslate, UserMessage, installStatusLoopWorker */

/**
 * Worker object for monitoring the merging process of uploaded file parts.
 *
 * @module mergingCheckWorker
 */
const mergingCheckWorker = {

    /**
     * Time in milliseconds before fetching new status request.
     * @type {number}
     */
    timeOut: 3000,

    /**
     * The id of the timer function for the status worker.
     * @type {number}
     */
    timeOutHandle: 0,
    
    errorCounts: 0,

    /**
     * The progress bar label element.
     * @type {jQuery}
     */
    $progressBarLabel: $('#upload-progress-bar-label'),

    fileID: null,
    filePath: '',

    /**
     * Initializes the merging check worker.
     * @param {string} fileID - The ID of the uploaded file.
     * @param {string} filePath - The path of the uploaded file.
     */
    initialize(fileID, filePath) {
        mergingCheckWorker.fileID = fileID;
        mergingCheckWorker.filePath = filePath;
        mergingCheckWorker.restartWorker(fileID);
    },

    /**
     * Restarts the merging check worker.
     */
    restartWorker() {
        window.clearTimeout(mergingCheckWorker.timeoutHandle);
        mergingCheckWorker.worker();
    },

    /**
     * Performs the merging check worker process.
     */
    worker() {
        PbxApi.FilesGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
        mergingCheckWorker.timeoutHandle = window.setTimeout(
            mergingCheckWorker.worker,
            mergingCheckWorker.timeOut,
        );
    },

    /**
     * Callback function after receiving the merging check response.
     * @param {object} response - The response object from the merging check API.
     */
    cbAfterResponse(response) {

        // Check if error counts exceeded the limit
        if (mergingCheckWorker.errorCounts > 10) {
            mergingCheckWorker.$progressBarLabel.text(globalTranslate.ext_UploadError);
            UserMessage.showMultiString(response, globalTranslate.ext_UploadError);
            addNewExtension.$uploadButton.removeClass('loading');
            window.clearTimeout(mergingCheckWorker.timeoutHandle);
        }

        // Check if the response is valid
        if (response === undefined || Object.keys(response).length === 0) {
            mergingCheckWorker.errorCounts += 1;
            return;
        }

        // Check the status of the merging process
        if (response.d_status === 'UPLOAD_COMPLETE') {
            mergingCheckWorker.$progressBarLabel.text(globalTranslate.ext_InstallationInProgress);
            PbxApi.ModulesInstallFromPackage(mergingCheckWorker.filePath, mergingCheckWorker.cbAfterModuleInstall);
            window.clearTimeout(mergingCheckWorker.timeoutHandle);
        } else if (response.d_status !== undefined) {
            mergingCheckWorker.$progressBarLabel.text(globalTranslate.ext_UploadInProgress);
            mergingCheckWorker.errorCounts = 0;
        } else {
            mergingCheckWorker.errorCounts += 1;
        }
    },

    /**
     * Callback function after module installation.
     * @param {object} response - The response object from the module installation API.
     */
    cbAfterModuleInstall(response) {
        if (response.result === true && response.data.filePath !=='') {
            installStatusLoopWorker.initialize(response.data.filePath,  response.data.moduleWasEnabled);
        } else {
            UserMessage.showMultiString(response, globalTranslate.ext_InstallationError);
            addNewExtension.$uploadButton.removeClass('loading');
        }
    },
};