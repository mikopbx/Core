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
 * Handles real-time monitoring and updates of module installation statuses.
 * Utilizes server-sent events to receive updates and reflects these changes in the UI,
 * particularly in the progress bar and status messages displayed to the user.
 *
 * @module installStatusLoopWorker
 */
const installStatusLoopWorker = {
    /**
     * The jQuery object representing the progress bar element in the DOM.
     * Used to visually indicate the progress of module installation or updates.
     * @type {jQuery}
     */
    $progressBar: $('#upload-progress-bar'),

    /**
     * The jQuery object for the container of the progress bar.
     * This element is shown and hidden based on the presence of active installation or update processes.
     * @type {jQuery}
     */
    $progressBarBlock: $('#upload-progress-bar-block'),

    /**
     * The jQuery object for the label element associated with the progress bar.
     * Used to display textual information about the current stage of the installation or update process.
     * @type {jQuery}
     */
    $progressBarLabel: $('#upload-progress-bar-label'),

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
     * Initializes the installStatusLoopWorker module by setting up the connection to receive server-sent events.
     */
    initialize(){
        installStatusLoopWorker.startListenPushNotifications();
    },

    /**
     * Establishes a connection to the server to start receiving real-time updates on module installation progress.
     * Utilizes the EventSource API to listen for messages on a specified channel.
     */
    startListenPushNotifications() {
        const lastEventIdKey = `${installStatusLoopWorker.channelId}-lastEventId`;
        let lastEventId = localStorage.getItem(lastEventIdKey);
        const subPath = lastEventId ? `/pbxcore/api/nchan/sub/${installStatusLoopWorker.channelId}?last_event_id=${lastEventId}` : `/pbxcore/api/nchan/sub/${installStatusLoopWorker.channelId}`;
        installStatusLoopWorker.eventSource = new EventSource(subPath);

        installStatusLoopWorker.eventSource.addEventListener('message', e => {
            const response = JSON.parse(e.data);
            console.debug(response);
            installStatusLoopWorker.processModuleInstallation(response);
            localStorage.setItem(lastEventIdKey, e.lastEventId);
        });
    },

    /**
     * Processes incoming server-sent events related to module installation.
     * Updates the UI based on the current stage of installation, download, upload, or error states.
     *
     * @param {Object} response - The data payload of the server-sent event, containing details about the installation stage and progress.
     */
    processModuleInstallation(response){
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
            installStatusLoopWorker.cbAfterReceiveNewDownloadStatus(moduleUniqueId, stageDetails);
        } else if (stage === 'Stage_I_UploadModule'){
            installStatusLoopWorker.cbAfterReceiveNewUploadStatus(moduleUniqueId, stageDetails);
        } else if (stage === 'Stage_V_InstallModule'){
            installStatusLoopWorker.cbAfterReceiveNewInstallationStatus(moduleUniqueId, stageDetails);
        } else if (stage === 'Stage_VI_EnableModule'){

        } else if (stage === 'Stage_VII_FinalStatus'){
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

    /**
     * Updates the UI to reflect the progress of a module download.
     * Adjusts the progress bar and status message based on the details provided in the server-sent event.
     *
     * @param {string} moduleUniqueId - The unique identifier of the module being downloaded.
     * @param {Object} stageDetails - Detailed information about the download progress.
     */
    cbAfterReceiveNewDownloadStatus(moduleUniqueId, stageDetails) {
        // Check module download status
        if (stageDetails.data.d_status === 'DOWNLOAD_IN_PROGRESS') {
            const downloadProgress = Math.max(Math.round(parseInt(stageDetails.data.d_status_progress, 10)/2)-1, 3);
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_DownloadInProgress, downloadProgress);
        } else if (stageDetails.data.d_status === 'DOWNLOAD_COMPLETE') {
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_DownloadInProgress, 50);
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
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_InstallationInProgress, 100);
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