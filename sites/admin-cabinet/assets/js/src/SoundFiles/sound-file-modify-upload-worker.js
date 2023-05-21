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
/* global globalTranslate,  PbxApi */


/**
 * Worker object responsible for checking the status of merging requests.
 *
 * @module mergingCheckWorker
 */
const mergingCheckWorker = {

    /**
     * Time in milliseconds before fetching new status of merging request.
     * @type {number}
     */
    timeOut: 3000,

    /**
     * The id of the timer function for the status worker.
     * @type {number}
     */
    timeOutHandle: 0,

    /**
     * Number of error counts encountered during merging request.
     * @type {number}
     */
    errorCounts: 0,

    /**
     * File ID of the merging request.
     * @type {string}
     */
    fileID: null,

    /**
     * File path of the merging request.
     * @type {string}
     */
    filePath: '',


    /**
     * Initializes the merging check worker.
     * @param {string} fileID - The ID of the merging request.
     * @param {string} filePath - The file path of the merging request.
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
     * Performs the merging check operation.
     */
    worker() {
        PbxApi.FilesGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
        mergingCheckWorker.timeoutHandle = window.setTimeout(
            mergingCheckWorker.worker,
            mergingCheckWorker.timeOut,
        );
    },

    /**
     * Callback function called after receiving the merging response.
     * @param {Object} response - The merging response.
     */
    cbAfterResponse(response) {
        if (mergingCheckWorker.errorCounts > 10) {
            // Show error message if the error count exceeds the threshold
            UserMessage.showMultiString(globalTranslate.sf_UploadError);
            soundFileModify.$submitButton.removeClass('loading');
            soundFileModify.$formObj.removeClass('loading');
            window.clearTimeout(mergingCheckWorker.timeoutHandle);
        }
        if (response === undefined || Object.keys(response).length === 0) {
            // Increment error count if the response is undefined or empty
            mergingCheckWorker.errorCounts += 1;
            return;
        }
        if (response.d_status === 'UPLOAD_COMPLETE') {
            // Start converting the audio file if the merging is complete
            const category = soundFileModify.$formObj.form('get value', 'category');
            PbxApi.SystemConvertAudioFile(mergingCheckWorker.filePath, category, soundFileModify.cbAfterConvertFile);
            window.clearTimeout(mergingCheckWorker.timeoutHandle);
        } else if (response.d_status !== undefined) {
            // Reset error count if the response status is defined
            mergingCheckWorker.errorCounts = 0;
        } else {
            // Increment error count for other cases
            mergingCheckWorker.errorCounts += 1;
        }
    },
};
