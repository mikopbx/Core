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

/* global PbxApi, globalTranslate, UserMessage */

/**
 * Worker object for checking file merging status.
 *
 * @module mergingCheckWorker
 */
const mergingCheckWorker = {

    /**
     * Time in milliseconds before fetching new request.
     * @type {number}
     */
    timeOut: 3000,
    
    /**
     * The id of the timer function for the worker.
     * @type {number}
     */
    timeOutHandle: 0,

    /**
     * Number of errors encountered during the merging process.
     * @type {number}
     */
    errorCounts: 0,

    /**
     * jQuery object for the progress bar label.
     * @type {jQuery}
     */
    $progressBarLabel: $('#upload-progress-bar-label'),

    /**
     * The ID of the file being merged.
     * @type {string|null}
     */
    fileID: null,

    /**
     * The path of the file being merged.
     * @type {string}
     */
    filePath: '',

    /**
     * Initializes the merging check worker.
     * @param {string} fileID - The ID of the file being merged.
     * @param {string} filePath - The path of the file being merged.
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
     * Worker function for checking file merging status.
     */
    worker() {
        PbxApi.FilesGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
        mergingCheckWorker.timeoutHandle = window.setTimeout(
            mergingCheckWorker.worker,
            mergingCheckWorker.timeOut,
        );
    },


    /**
     * Callback function after receiving a response from the server.
     * @param {Object} response - The response object from the server.
     */
    cbAfterResponse(response) {
        if (mergingCheckWorker.errorCounts > 10) {
            mergingCheckWorker.$progressBarLabel.text(globalTranslate.upd_UploadError);
            UserMessage.showMultiString(globalTranslate.upd_UploadError);
            updatePBX.$submitButton.removeClass('loading');
            window.clearTimeout(mergingCheckWorker.timeoutHandle);
        }
        if (response === undefined || Object.keys(response).length === 0) {
            mergingCheckWorker.errorCounts += 1;
            return;
        }
        if (response.d_status === 'UPLOAD_COMPLETE') {
            mergingCheckWorker.$progressBarLabel.text(globalTranslate.upd_UpgradeInProgress);
            PbxApi.SystemUpgrade(mergingCheckWorker.filePath, updatePBX.cbAfterStartUpdate);
            window.clearTimeout(mergingCheckWorker.timeoutHandle);
        } else if (response.d_status !== undefined) {
            mergingCheckWorker.$progressBarLabel.text(globalTranslate.upd_UploadInProgress);
            mergingCheckWorker.errorCounts = 0;
        } else {
            mergingCheckWorker.errorCounts += 1;
        }
    },
};