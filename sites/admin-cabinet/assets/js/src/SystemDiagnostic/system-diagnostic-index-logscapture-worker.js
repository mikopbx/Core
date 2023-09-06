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

/* global PbxApi, systemDiagnosticCapture */

/**
 * Represents the archive packing check worker object.
 *
 * @module archivePackingCheckWorker
 */
const archivePackingCheckWorker = {
    /**
     * Time in milliseconds before fetching new request.
     * @type {number}
     */
    timeOut: 3000,


    /**
     * The id of the timer function for the status worker.
     * @type {number}
     */
    timeOutHandle: 0,

    /**
     * Error count for tracking errors.
     * @type {number}
     */
    errorCounts: 0,

    /**
     * Filename of the archive packing.
     * @type {string}
     */
    filename: '',

    /**
     * jQuery element for the progress bar.
     * @type {jQuery}
     */
    $progress: $('#capture-log-dimmer span.progress'),

    /**
     * Initializes the archive packing check worker.
     * @param {string} filename - The filename of the archive packing.
     */
    initialize(filename) {
        archivePackingCheckWorker.filename = filename;
        archivePackingCheckWorker.restartWorker(filename);
    },

    /**
     * Restarts the archive packing check worker.
     */
    restartWorker() {
        window.clearTimeout(archivePackingCheckWorker.timeoutHandle);
        archivePackingCheckWorker.worker();
    },

    /**
     * Worker function for fetching the request.
     */
    worker() {
        PbxApi.SyslogDownloadLogsArchive(archivePackingCheckWorker.filename, archivePackingCheckWorker.cbAfterResponse);
        archivePackingCheckWorker.timeoutHandle = window.setTimeout(
            archivePackingCheckWorker.worker,
            archivePackingCheckWorker.timeOut,
        );
    },

    /**
     * Callback after receiving the response.
     * @param {object} response - The response object.
     */
    cbAfterResponse(response) {
        if (archivePackingCheckWorker.errorCounts > 50) {
            UserMessage.showMultiString(globalTranslate.sd_DownloadPcapFileError);
            systemDiagnosticCapture.$stopBtn
                .removeClass('disabled loading')
                .addClass('disabled');
            systemDiagnosticCapture.$startBtn.removeClass('disabled loading');
            window.clearTimeout(archivePackingCheckWorker.timeoutHandle);
        }
        if (response === undefined || Object.keys(response).length === 0) {
            archivePackingCheckWorker.errorCounts += 1;
            return;
        }
        if (response.status === 'READY') {
            systemDiagnosticCapture.$stopBtn
                .removeClass('disabled loading')
                .addClass('disabled');
            systemDiagnosticCapture.$startBtn.removeClass('disabled loading');
            systemDiagnosticCapture.$downloadBtn.removeClass('disabled loading');
            window.location = response.filename;
            window.clearTimeout(archivePackingCheckWorker.timeoutHandle);
            systemDiagnosticCapture.$dimmer.removeClass('active');
        } else if (response.status === 'PREPARING') {
            archivePackingCheckWorker.errorCounts = 0;
            archivePackingCheckWorker.$progress.text(`${response.progress}%`);
        } else {
            archivePackingCheckWorker.errorCounts += 1;
        }
    },
};