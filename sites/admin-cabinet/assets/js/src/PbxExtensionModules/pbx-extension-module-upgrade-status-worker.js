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

/* global globalRootUrl, PbxApi, globalTranslate, UserMessage, installStatusLoopWorker */

/**
 * Monitors the status of module upgrade.
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
     * The id of the timer function for the status worker.
     * @type {number}
     */
    timeOutHandle: 0,

    /**
     * The unique ID of the module.
     * @type {string}
     */
    moduleUniqid: '',

    /**
     * The number of iterations.
     * @type {number}
     */
    iterations: 0,

    /**
     * The old progress percentage.
     * @type {string}
     */
    oldPercent: '0',

    /**
     * Initializes the module upgrade status.
     * @param {string} uniqid - The unique ID of the module.
     */
    initialize(uniqid) {
        upgradeStatusLoopWorker.moduleUniqid = uniqid;
        upgradeStatusLoopWorker.iterations = 0;
        upgradeStatusLoopWorker.restartWorker();
    },

    /**
     * Restarts the upgrade status worker.
     */
    restartWorker() {
        window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
        upgradeStatusLoopWorker.worker();
    },

    /**
     * The worker function that checks the module upgrade status.
     */
    worker() {
        window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
        PbxApi.ModulesModuleDownloadStatus(
            upgradeStatusLoopWorker.moduleUniqid,
            upgradeStatusLoopWorker.cbRefreshModuleStatus,
            upgradeStatusLoopWorker.restartWorker,
        );
    },

    /**
     * Callback function to refresh the module upgrade status.
     * @param {object} response - The response from the server.
     */
    cbRefreshModuleStatus(response) {
        upgradeStatusLoopWorker.iterations += 1;
        upgradeStatusLoopWorker.timeoutHandle =
            window.setTimeout(upgradeStatusLoopWorker.worker, upgradeStatusLoopWorker.timeOut);
        // Check download status
        if (response === false
            && upgradeStatusLoopWorker.iterations < 50) {
            window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
        } else if (upgradeStatusLoopWorker.iterations > 50
            || response.d_status === 'PROGRESS_FILE_NOT_FOUND'
            || response.d_status === 'NOT_FOUND'
        ) {
            window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
            let errorMessage = (response.d_error !== undefined) ? response.d_error : '';
            errorMessage = errorMessage.replace(/\n/g, '<br>');
            UserMessage.showMultiString(errorMessage, globalTranslate.ext_UpdateModuleError);
            $(`#${upgradeStatusLoopWorker.moduleUniqid}`).find('i').removeClass('loading');
            $('.new-module-row').find('i').addClass('download').removeClass('redo');
            $('a.button').removeClass('disabled');
        } else if (response.d_status === 'DOWNLOAD_IN_PROGRESS') {
            if (upgradeStatusLoopWorker.oldPercent !== response.d_status_progress) {
                upgradeStatusLoopWorker.iterations = 0;
            }
            $('i.loading.redo').closest('a').find('.percent').text(`${response.d_status_progress}%`);
            upgradeStatusLoopWorker.oldPercent = response.d_status_progress;
        } else if (response.d_status === 'DOWNLOAD_COMPLETE') {
            $('i.loading.redo').closest('a').find('.percent').text('100%');
            PbxApi.ModulesInstallModule(response.filePath, upgradeStatusLoopWorker.cbAfterModuleInstall);
            window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
        }
    },

    /**
     * Callback function after installing the module.
     * @param {object} response - The response from the server.
     */
    cbAfterModuleInstall(response) {
        if (response.result === true && response.data.filePath !=='' ) {
            installStatusLoopWorker.initialize(response.data.filePath, response.data.moduleWasEnabled);
        } else {
            UserMessage.showMultiString(response, globalTranslate.ext_InstallationError);
        }
    },
};
