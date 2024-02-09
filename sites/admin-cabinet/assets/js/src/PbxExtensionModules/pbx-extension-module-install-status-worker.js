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

/* global globalRootUrl, PbxApi, globalTranslate, UserMessage */

/**
 * Monitors the status of module installation.
 *
 * @module installStatusLoopWorker
 */
const installStatusLoopWorker = {

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
     * The file path of the module being installed.
     * @type {string}
     */
    filePath: '',

    /**
     * The number of iterations performed.
     * @type {number}
     */
    iterations: 0,

    /**
     * The previous progress percentage.
     * @type {string}
     */
    oldPercent: '0',

    /**
     * Flag indicating if enabling is needed after installation.
     * @type {boolean}
     */
    needEnableAfterInstall: false,

    /**
     * The progress bar label element.
     * @type {jQuery}
     */
    $progressBar: $('#upload-progress-bar'),

    /**
     * Module Unique id.
     * @type string
     */
    moduleUniqid: '',


    /**
     * Initializes the installStatusLoopWorker object.
     * @param {string} filePath - The file path of the module being installed.
     * @param {boolean} [needEnable=false] - Flag indicating if enabling is needed after installation.
     */
    initialize(filePath, needEnable = false) {
        installStatusLoopWorker.filePath = filePath;
        installStatusLoopWorker.iterations = 0;
        installStatusLoopWorker.needEnableAfterInstall = needEnable;
        installStatusLoopWorker.restartWorker();
    },

    /**
     * Restarts the worker.
     */
    restartWorker() {
        window.clearTimeout(installStatusLoopWorker.timeoutHandle);
        installStatusLoopWorker.worker();
    },

    /**
     * Worker function for checking the installation status.
     */
    worker() {
        window.clearTimeout(installStatusLoopWorker.timeoutHandle);
        PbxApi.ModulesGetModuleInstallationStatus(
            installStatusLoopWorker.filePath,
            installStatusLoopWorker.cbAfterReceiveNewStatus
        );
    },

    /**
     * Callback function after receiving the new installation status.
     * @param {boolean} result - The result of the installation status check.
     * @param {object} response - The response object containing the installation status.
     */
    cbAfterReceiveNewStatus(result, response) {
        installStatusLoopWorker.iterations += 1;
        installStatusLoopWorker.timeoutHandle =
            window.setTimeout(installStatusLoopWorker.worker, installStatusLoopWorker.timeOut);

        // Check installation status
        if (result === false
            && installStatusLoopWorker.iterations < 50) {
            window.clearTimeout(installStatusLoopWorker.timeoutHandle);
        } else if (installStatusLoopWorker.iterations > 50
            || response.data.i_status === 'INSTALLATION_ERROR'
            || response.data.i_status === 'PROGRESS_FILE_NOT_FOUND'
        ) {
            window.clearTimeout(installStatusLoopWorker.timeoutHandle);
            UserMessage.showMultiString(response.messages, globalTranslate.ext_InstallationError);
            $('.loading').removeClass('loading');
        } else if (response.data.i_status === 'INSTALLATION_IN_PROGRESS') {
            installStatusLoopWorker.$progressBar.progress({
                percent: parseInt(response.data.i_status_progress, 10),
            });
            if (installStatusLoopWorker.oldPercent !== response.data.i_status_progress) {
                installStatusLoopWorker.iterations = 0;
            }
            installStatusLoopWorker.oldPercent = response.data.i_status_progress;
        } else if (response.data.i_status === 'INSTALLATION_COMPLETE') {
            installStatusLoopWorker.$progressBar.progress({
                percent: 100,
            });
            if (installStatusLoopWorker.needEnableAfterInstall) {
                // Enable the installed module and redirect to the module index page
                    PbxApi.ModulesEnableModule(
                    response.data.uniqid,
                    () => {
                        window.location = `${globalRootUrl}pbx-extension-modules/index/`;
                    },
                );
            } else {
                // Redirect to the module index page
                window.location = `${globalRootUrl}pbx-extension-modules/index/`;
            }
            window.clearTimeout(installStatusLoopWorker.timeoutHandle);
        }
    },
};
