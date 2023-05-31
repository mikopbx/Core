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
            || response.i_status === 'INSTALLATION_ERROR'
            || response.i_status === 'PROGRESS_FILE_NOT_FOUND'
        ) {
            window.clearTimeout(installStatusLoopWorker.timeoutHandle);
            let errorMessage = (response.i_error !== undefined) ? response.i_error : '';
            errorMessage = errorMessage.replace(/\n/g, '<br>');
            UserMessage.showMultiString(errorMessage, globalTranslate.ext_InstallationError);
        } else if (response.i_status === 'INSTALLATION_IN_PROGRESS') {
            if (installStatusLoopWorker.oldPercent !== response.i_status_progress) {
                installStatusLoopWorker.iterations = 0;
            }
            installStatusLoopWorker.oldPercent = response.d_status_progress;
        } else if (response.i_status === 'INSTALLATION_COMPLETE') {
            if (installStatusLoopWorker.needEnableAfterInstall) {
                // Enable the installed module and redirect to the module index page
                PbxApi.ModulesEnableModule(
                    installStatusLoopWorker.moduleUniqid,
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
