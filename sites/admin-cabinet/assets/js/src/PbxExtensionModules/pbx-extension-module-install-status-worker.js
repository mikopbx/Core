/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, PbxApi, ModulesAPI, globalTranslate, UserMessage, EventBus */

/**
 * Handles real-time monitoring and updates of module installation statuses.
 * Utilizes server-sent events to receive updates and reflects these changes in the UI,
 * particularly in the progress bar and status messages displayed to the user.
 *
 * @module installStatusLoopWorker
 */
const installStatusLoopWorker = {
    /**
     * The jQuery object representing the progress bar element in the DOM.
     * Resolved in initialize() — must not call $() at module-load time.
     * @type {jQuery}
     */
    $progressBar: null,

    /**
     * The jQuery object for the container of the progress bar.
     * @type {jQuery}
     */
    $progressBarBlock: null,

    /**
     * The jQuery object for the label element associated with the progress bar.
     * @type {jQuery}
     */
    $progressBarLabel: null,

    /**
     * The EventSource object used for receiving real-time updates from the server about module installation statuses.
     * This allows for a push-based mechanism to keep the UI updated with the latest progress information.
     * @type {EventSource}
     */
    eventSource: null,

    /**
     * The identifier for the PUB/SUB channel used to subscribe to installation status updates.
     * This ensures that the client is listening on the correct channel for relevant events.
     */
    channelId: 'install-module',

    /**
     * State of a bulk module update session.
     * @type {Object}
     */
    batchUpdate: {
        active: false,
        batchId: '',
        total: 0,
        completed: new Set(),
        failed: new Set(),
    },

    /**
     * Watchdog for a single install/update operation: polls the operations
     * journal when nchan goes silent, so a lost message can no longer freeze
     * the progress bar forever. Created in initialize().
     */
    watchdog: null,

    /**
     * Timestamp of the last batch-related nchan event, driving the batch stall
     * detection in checkBatchAlive().
     */
    batchLastEventAt: 0,

    /**
     * Timer handle of the periodic batch liveness check.
     */
    batchWatchTimer: null,

    /**
     * Initializes the installStatusLoopWorker module by setting up the connection to receive server-sent events.
     */
    initialize(){
        installStatusLoopWorker.$progressBar = $('#upload-progress-bar');
        installStatusLoopWorker.$progressBarBlock = $('#upload-progress-bar-block');
        installStatusLoopWorker.$progressBarLabel = $('#upload-progress-bar-label');

        installStatusLoopWorker.watchdog = ModulesAPI.createOperationWatchdog({
            onTerminal: data => installStatusLoopWorker.cbWatchdogTerminal(data),
            onStalled: () => installStatusLoopWorker.cbWatchdogStalled(),
        });

        EventBus.subscribe(this.channelId, data => {
           installStatusLoopWorker.processModuleInstallation(data);
        });

        installStatusLoopWorker.restoreActiveOperations();
    },

    /**
     * Starts the polling fallback for a just-launched install/update.
     * Called by the flows that initiate an operation (repo install, zip upload).
     *
     * @param {string} trackingId - Module unique id (or upload fileId).
     */
    startWatch(trackingId) {
        installStatusLoopWorker.watchdog.start(trackingId);
    },

    /**
     * Restores UI state for operations that are still running on the backend
     * after a page reload: shows the progress bar, locks the action buttons and
     * arms the polling fallback.
     */
    restoreActiveOperations() {
        ModulesAPI.getOperations({}, (data, success) => {
            if (!success || !data || !Array.isArray(data.active)) {
                return;
            }
            // Stale rows belong to crashed operations nobody supervises yet:
            // restoring them would lock the UI with no recovery path. Quick
            // toggle operations (enable/disable) are not worth restoring
            // either — their own watchdog handles the click flow.
            const restorable = data.active.filter(
                op => op.stale !== true
                    && (op.batchId !== '' || ['install_repo', 'install_package', 'uninstall'].includes(op.operation))
            );
            if (restorable.length === 0) {
                return;
            }
            const op = restorable[0];
            $('a.button').addClass('disabled');
            if (op.batchId) {
                installStatusLoopWorker.batchUpdate.active = true;
                installStatusLoopWorker.batchUpdate.batchId = op.batchId;
                installStatusLoopWorker.batchLastEventAt = Date.now();
                installStatusLoopWorker.armBatchWatch();
                installStatusLoopWorker.updateBatchProgress(Math.max(op.progress, 1));
            } else {
                installStatusLoopWorker.updateProgressBar(
                    op.moduleUniqueId,
                    globalTranslate.ext_InstallationInProgress,
                    Math.max(op.progress, 1)
                );
                installStatusLoopWorker.startWatch(op.moduleUniqueId);
            }
        });
    },

    /**
     * Handles a terminal journal state discovered by polling: the nchan
     * message was lost, but the backend finished the operation.
     *
     * @param {object} data - The journal record from the operations API.
     */
    cbWatchdogTerminal(data) {
        if (data.state === 'completed') {
            window.location = `${globalRootUrl}pbx-extension-modules/index/`;
            return;
        }
        installStatusLoopWorker.$progressBarBlock.hide();
        $('tr.table-error-messages').remove();
        $('a.button').removeClass('disabled');
        $('#add-new-button').removeClass('loading');
        const $row = $(`tr[data-id=${data.moduleUniqueId}]`);
        installStatusLoopWorker.showModuleInstallationError(
            $row,
            globalTranslate.ext_InstallationError,
            data.errorMessages
        );
    },

    /**
     * Handles a stalled operation: no nchan events and no journal progress
     * for several minutes.
     */
    cbWatchdogStalled() {
        installStatusLoopWorker.$progressBarBlock.hide();
        $('a.button').removeClass('disabled');
        $('#add-new-button').removeClass('loading');
        UserMessage.showMultiString(
            globalTranslate.ext_OperationStalledError || globalTranslate.ext_InstallationError,
            globalTranslate.ext_InstallationError
        );
    },

    /**
     * Arms the periodic liveness check of a batch update.
     */
    armBatchWatch() {
        if (installStatusLoopWorker.batchWatchTimer !== null) {
            return;
        }
        installStatusLoopWorker.batchWatchTimer = setInterval(
            installStatusLoopWorker.checkBatchAlive,
            15000
        );
    },

    /**
     * Disarms the batch liveness check.
     */
    disarmBatchWatch() {
        if (installStatusLoopWorker.batchWatchTimer !== null) {
            clearInterval(installStatusLoopWorker.batchWatchTimer);
            installStatusLoopWorker.batchWatchTimer = null;
        }
    },

    /**
     * Checks whether a batch update is still alive: after a minute of nchan
     * silence asks the operations journal, and when no active operation is
     * left the batch is declared dead — the UI is unlocked instead of
     * spinning forever.
     */
    checkBatchAlive() {
        if (!installStatusLoopWorker.batchUpdate.active) {
            installStatusLoopWorker.disarmBatchWatch();
            return;
        }
        if (Date.now() - installStatusLoopWorker.batchLastEventAt < 60000) {
            return;
        }
        ModulesAPI.getOperations({}, (data, success) => {
            if (!success || !data || !installStatusLoopWorker.batchUpdate.active) {
                return;
            }
            // With nchan dead from the very start the batchId was never
            // learned from events — pick it up from the journal so the
            // completion check below can match history records.
            if (installStatusLoopWorker.batchUpdate.batchId === '') {
                const seen = (data.active || []).find(op => op.batchId !== '');
                if (seen !== undefined) {
                    installStatusLoopWorker.batchUpdate.batchId = seen.batchId;
                }
            }
            // A stale active row is a crashed operation, not a live one
            const alive = (data.active || []).some(op => op.stale !== true);
            if (alive) {
                return; // something is genuinely running server-side
            }
            installStatusLoopWorker.disarmBatchWatch();
            const trackedBatchId = installStatusLoopWorker.batchUpdate.batchId;
            installStatusLoopWorker.resetBatchUpdate();
            installStatusLoopWorker.$progressBarBlock.hide();
            $('a.button').removeClass('disabled');
            // The BatchFinished nchan message may simply have been lost while
            // every module finished fine — check the journal history before
            // declaring the batch dead.
            const batchOps = (data.recent || []).filter(
                op => trackedBatchId !== '' && op.batchId === trackedBatchId
            );
            const allCompleted = batchOps.length > 0
                && batchOps.every(op => op.state === 'completed');
            if (allCompleted) {
                window.location = `${globalRootUrl}pbx-extension-modules/index/`;
                return;
            }
            UserMessage.showMultiString(
                globalTranslate.ext_OperationStalledError || globalTranslate.ext_InstallationError,
                globalTranslate.ext_InstallationError
            );
        });
    },

    /**
     * Processes incoming server-sent events related to module installation.
     * Updates the UI based on the current stage of installation, download, upload, or error states.
     *
     * @param {Object} response - The data payload of the server-sent event, containing details about the installation stage and progress.
     */
    processModuleInstallation(response){
        installStatusLoopWorker.saveMessage(response);
        installStatusLoopWorker.watchdog.notifyEvent(response);
        if (installStatusLoopWorker.processBatchEvent(response)) {
            return;
        }
        const moduleUniqueId = response.moduleUniqueId;
        const stage = response.stage;
        const stageDetails = response.stageDetails;
        const $row = $(`tr[data-id=${moduleUniqueId}]`);
        if (stage ==='Stage_I_GetRelease'){
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_GetReleaseInProgress, 1);
        } else if (stage === 'Stage_II_CheckLicense'){
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_CheckLicenseInProgress, 2);
        } else if (stage === 'Stage_III_GetDownloadLink'){
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_CheckLicenseInProgress, 3);
        } else if (stage === 'Stage_IV_DownloadModule'){
            installStatusLoopWorker.cbAfterReceiveNewDownloadStatus(moduleUniqueId, stageDetails, $row);
        } else if (stage === 'Stage_I_UploadModule'){
            installStatusLoopWorker.cbAfterReceiveNewUploadStatus(moduleUniqueId, stageDetails);
        } else if (stage === 'Stage_V_InstallModule'){
            installStatusLoopWorker.cbAfterReceiveNewInstallationStatus(moduleUniqueId, stageDetails);
        } else if (stage === 'Stage_VI_EnableModule'){
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_InstallationInProgress, 99);
        } else if (stage === 'Stage_VII_FinalStatus'){
            if (response.batchMode === true || response.batchId !== undefined) {
                return;
            }
            installStatusLoopWorker.watchdog.stop();
            if (stageDetails.result===false){
                installStatusLoopWorker.$progressBarBlock.hide();
                if (stageDetails.messages !== undefined) {
                    installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError, stageDetails.messages);
                } else {
                    installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError);
                }
            } else {
                window.location = `${globalRootUrl}pbx-extension-modules/index/`;
            }
        }
    },

    saveMessage(message) {
        // Получаем текущую историю
        let history = JSON.parse(localStorage.getItem('wsModuleInstallationHistory') || '[]');
        
        // Добавляем новое сообщение
        history.push({
            timestamp: new Date().toISOString(),
            message: message
        });
        
        // Ограничиваем размер истории (например, до 100 сообщений)
        if (history.length > 100) {
            history = history.slice(history.length - 100);
        }
        
        // Сохраняем обновленную историю
        localStorage.setItem('wsHistory', JSON.stringify(history));
    },

    /**
     * Starts local UI tracking for a batch update.
     * @param {Array<string>} modulesForUpdate
     */
    startBatchUpdate(modulesForUpdate) {
        installStatusLoopWorker.batchUpdate = {
            active: true,
            batchId: '',
            total: modulesForUpdate.length,
            completed: new Set(),
            failed: new Set(),
        };
        installStatusLoopWorker.batchLastEventAt = Date.now();
        installStatusLoopWorker.armBatchWatch();
        installStatusLoopWorker.$progressBarBlock.show();
        installStatusLoopWorker.$progressBar.show();
        installStatusLoopWorker.$progressBarLabel.text(globalTranslate.ext_UpdateAllModulesTitle);
        installStatusLoopWorker.$progressBar.progress({
            percent: 1,
        });
    },

    /**
     * Stops local UI tracking for a batch update.
     */
    resetBatchUpdate() {
        installStatusLoopWorker.batchUpdate = {
            active: false,
            batchId: '',
            total: 0,
            completed: new Set(),
            failed: new Set(),
        };
    },

    /**
     * Process server-side batch update events.
     * @param {Object} response
     * @returns {boolean}
     */
    processBatchEvent(response) {
        if (response.batchMode !== true && response.batchId === undefined) {
            return false;
        }

        installStatusLoopWorker.batchLastEventAt = Date.now();

        const stage = response.stage;
        const stageDetails = response.stageDetails || {};
        const batch = installStatusLoopWorker.batchUpdate;

        if (stage === 'BatchStarted') {
            batch.active = true;
            batch.batchId = response.batchId || '';
            batch.total = stageDetails.total || batch.total;
            installStatusLoopWorker.updateBatchProgress(stageDetails.total > 0 ? 1 : 0);
            return true;
        }

        if (stage === 'BatchModuleStarted') {
            batch.active = true;
            batch.batchId = response.batchId || batch.batchId;
            batch.total = stageDetails.total || batch.total;
            installStatusLoopWorker.updateBatchProgress(
                installStatusLoopWorker.calculateBatchPercent(stageDetails.current || 1, batch.total)
            );
            return true;
        }

        if (stage === 'BatchModuleCompleted') {
            batch.completed.add(stageDetails.moduleUniqueId || response.moduleUniqueId);
            installStatusLoopWorker.updateBatchProgress(
                installStatusLoopWorker.calculateBatchPercent(stageDetails.current || batch.completed.size, batch.total)
            );
            return true;
        }

        if (stage === 'BatchModuleFailed') {
            const moduleUniqueId = stageDetails.moduleUniqueId || response.moduleUniqueId;
            batch.failed.add(moduleUniqueId);
            installStatusLoopWorker.updateBatchProgress(
                installStatusLoopWorker.calculateBatchPercent(stageDetails.current || batch.completed.size + batch.failed.size, batch.total)
            );
            if (stageDetails.messages !== undefined) {
                const $row = $(`tr[data-id=${moduleUniqueId}]`);
                installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError, stageDetails.messages);
            }
            return true;
        }

        if (stage === 'BatchFinished') {
            // Ignore stragglers from a previous batch (e.g., user re-triggered Update All).
            if (batch.batchId !== '' && response.batchId && response.batchId !== batch.batchId) {
                return true;
            }
            installStatusLoopWorker.disarmBatchWatch();
            installStatusLoopWorker.updateBatchProgress(100);
            installStatusLoopWorker.resetBatchUpdate();
            if (stageDetails.result === false) {
                $('a.button').removeClass('disabled');
                installStatusLoopWorker.$progressBarBlock.hide();
                return true;
            }
            window.location = `${globalRootUrl}pbx-extension-modules/index/`;
            return true;
        }

        return false;
    },

    /**
     * Calculates aggregate batch progress.
     * @param {number} current
     * @param {number} total
     * @returns {number}
     */
    calculateBatchPercent(current, total) {
        if (total <= 0) {
            return 1;
        }
        return Math.min(Math.max(Math.round((current - 1) / total * 100), 1), 99);
    },

    /**
     * Updates the aggregate batch progress bar.
     * @param {number} percent
     */
    updateBatchProgress(percent) {
        installStatusLoopWorker.$progressBarBlock.show();
        installStatusLoopWorker.$progressBar.show();
        installStatusLoopWorker.$progressBarLabel.text(globalTranslate.ext_UpdateAllModulesTitle);
        installStatusLoopWorker.$progressBar.progress({
            percent: percent,
        });
    },

    /**
     * Updates the UI to reflect the progress of a module download.
     * Adjusts the progress bar and status message based on the details provided in the server-sent event.
     *
     * @param {string} moduleUniqueId - The unique identifier of the module being downloaded.
     * @param {Object} stageDetails - Detailed information about the download progress.
     * @param {jQuery} $row - The jQuery object representing the row in the UI associated with the module.
     */
    cbAfterReceiveNewDownloadStatus(moduleUniqueId, stageDetails, $row) {
        // Check module download status
        if (stageDetails.data.d_status === 'DOWNLOAD_IN_PROGRESS') {
            const downloadProgress = Math.max(Math.round(parseInt(stageDetails.data.d_status_progress, 10)/2)-1, 3);
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_DownloadInProgress, downloadProgress);
        } else if (stageDetails.data.d_status === 'DOWNLOAD_COMPLETE') {
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_DownloadInProgress, 50);
        } else if (stageDetails.data.d_status === 'DOWNLOAD_ERROR') {
            installStatusLoopWorker.$progressBarBlock.hide();
            if (stageDetails.messages !== undefined) {
                installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError, stageDetails.messages);
            } else {
                installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError);
            }
        }
    },

    /**
     * Updates the UI to reflect the progress of a module upload.
     * Adjusts the progress bar and status message based on the details provided in the server-sent event.
     *
     * @param {string} moduleUniqueId - The unique identifier of the module being uploaded.
     * @param {Object} stageDetails - Detailed information about the upload progress.
     */
    cbAfterReceiveNewUploadStatus(moduleUniqueId, stageDetails) {
        // Check module upload status
        if (stageDetails.data.d_status === 'UPLOAD_IN_PROGRESS') {
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_UploadInProgress, 49);
        } else if (stageDetails.data.d_status === 'UPLOAD_COMPLETE') {
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_UploadInProgress, 50);
        }
    },

    /**
     * Handles updates on the installation progress of a module.
     * Updates the progress bar and status message based on the information received in the server-sent event.
     *
     * @param {string} moduleUniqueId - The unique identifier of the module being installed.
     * @param {Object} stageDetails - Detailed information about the installation progress.
     */
    cbAfterReceiveNewInstallationStatus(moduleUniqueId, stageDetails) {
        // Check module installation status
        if (stageDetails.data.i_status === 'INSTALLATION_IN_PROGRESS') {
            const installationProgress = Math.round(parseInt(stageDetails.data.i_status_progress, 10)/2+50);
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_InstallationInProgress, installationProgress);
        } else if (stageDetails.data.i_status === 'INSTALLATION_COMPLETE') {
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_InstallationInProgress, 98);
        }
    },

    /**
     * Resets the UI elements associated with a module row to their default state.
     * This is typically called after an installation process completes or fails.
     *
     * @param {jQuery} $row - The jQuery object representing the row in the UI associated with the module.
     */
    resetButtonView($row){
        $('a.button').removeClass('disabled');
        $row.find('i.loading').removeClass('spinner loading');
        $row.find('a.download i').addClass('download');
        $row.find('a.update i').addClass('redo');
    },

    /**
     * Displays an error message related to module installation in the UI.
     * This function is called when an installation fails, providing feedback to the user.
     *
     * @param {jQuery} $row - The jQuery object representing the row in the UI associated with the module.
     * @param {string} header - The header text for the error message.
     * @param {Object} messages - Detailed error messages to be displayed.
     */
    showModuleInstallationError($row, header, messages='') {
        if (messages===undefined){
            return;
        }
        if ($row.length===0){
            UserMessage.showMultiString(messages, header);
            $('#add-new-button').removeClass('loading');
            return;
        }
        installStatusLoopWorker.resetButtonView($row);
        if (messages.license!==undefined){
            const manageLink = `<br>${globalTranslate.lic_ManageLicense} <a href="${Config.keyManagementUrl}" target="_blank">${Config.keyManagementSite}</a>`;
            messages.license.push(manageLink);
        }
        const textDescription = UserMessage.convertToText(messages);
        const htmlMessage=  `<tr class="ui warning table-error-messages">
                                        <td colspan="5">
                                        <div class="ui center aligned icon header">
                                        <i class="exclamation triangle icon"></i>
                                          <div class="content">
                                            ${header}
                                          </div>
                                        </div>
                                            <p>${textDescription}</p>
                                        </div>
                                        </td>
                                    </tr>`;
        $row.addClass('warning');
        $row.before(htmlMessage);
        $('html, body').animate({
            scrollTop: $row.offset().top,
        }, 2000);
    },

    /**
     * Updates the progress bar and status message to reflect the current state of a module installation process.
     * This function is used throughout different stages of installation to provide real-time feedback to the user.
     *
     * @param {string} moduleUniqueId - The unique identifier of the module.
     * @param {string} header - The status message to be displayed above the progress bar.
     * @param {number} [percent=0] - The current progress percentage to be reflected in the progress bar.
     */
    updateProgressBar(moduleUniqueId, header, percent=0){
        if (moduleUniqueId === undefined || moduleUniqueId === ''){
            return;
        }
        let moduleName = $(`tr.new-module-row[data-id=${moduleUniqueId}]`).data('name');
        if (moduleName === undefined){
            moduleName = '';
        }
        installStatusLoopWorker.$progressBarBlock.show();
        installStatusLoopWorker.$progressBar.show();
        if (header){
            const barText= moduleName+': '+header;
            installStatusLoopWorker.$progressBarLabel.text(barText);
        }
        if (percent>0){
            installStatusLoopWorker.$progressBar.progress({
                percent: percent,
            });
        }
    }
};

// Initializes the installStatusLoopWorker module when the DOM is fully loaded.
$(document).ready(() => {
    installStatusLoopWorker.initialize();
});
