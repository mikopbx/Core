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

/* global PbxApi, globalTranslate, UserMessage, updatePBX */

/**
 * Worker object for checking file merging status.
 *
 * @module upgradeStatusLoopWorker
 */
const upgradeStatusLoopWorker = {

    /**
     * Time in milliseconds before fetching new status request.
     * @type {number}
     */
    timeOut: 1000,

    /**
     * The id of the timer function for the worker.
     * @type {number}
     */
    timeOutHandle: 0,
    
    iterations: 0,
    filename: '',
    initialize(filename) {
        upgradeStatusLoopWorker.filename = filename;
        upgradeStatusLoopWorker.iterations = 0;
        upgradeStatusLoopWorker.restartWorker();
    },
    restartWorker() {
        window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
        upgradeStatusLoopWorker.worker();
    },
    worker() {
        window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
        PbxApi.FilesFirmwareDownloadStatus(upgradeStatusLoopWorker.filename, upgradeStatusLoopWorker.cbRefreshUpgradeStatus);
    },
    cbRefreshUpgradeStatus(response) {
        upgradeStatusLoopWorker.iterations += 1;
        upgradeStatusLoopWorker.timeoutHandle =
            window.setTimeout(upgradeStatusLoopWorker.worker, upgradeStatusLoopWorker.timeOut);
        if (response.length === 0 || response === false) return;
        if (response.d_status === 'DOWNLOAD_IN_PROGRESS') {
            $('i.loading.redo').closest('a').find('.percent').text(`${response.d_status_progress}%`);
        } else if (response.d_status === 'DOWNLOAD_COMPLETE') {
            window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
            $('i.loading.redo').closest('a').find('.percent').text(`${response.d_status_progress}%`);
            $('i.loading.redo').addClass('sync').removeClass('redo');
            PbxApi.SystemUpgrade(response.filePath, updatePBX.cbAfterStartUpdate);
        } else if (response.d_status === 'DOWNLOAD_ERROR') {
            window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
            UserMessage.showMultiString(globalTranslate.upd_DownloadUpgradeError);
            $('i.loading.redo').addClass('redo').removeClass('loading');
        }
    },
};