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
     * The progress bar element.
     * @type {jQuery}
     */
    $progressBar: $('#upload-progress-bar'),

    /**
     * The progress bar block.
     * @type {jQuery}
     */
    $progressBarBlock: $('#upload-progress-bar-block'),

    /**
     * The progress bar label element.
     * @type {jQuery}
     */
    $progressBarLabel: $('#upload-progress-bar-label'),

    /**
     * EventSource object for the module installation and upgrade status
     * @type {EventSource}
     */
    eventSource: null,

    /**
     * PUB/SUB channel ID
     */
    channelId: 'install-module',

    initialize(){
        installStatusLoopWorker.startListenPushNotifications();
    },

    /**
     * Starts listen to push notifications from backend
     */
    startListenPushNotifications() {
        const lastEventIdKey = `lastEventId`;
        let lastEventId = localStorage.getItem(lastEventIdKey);
        const subPath = lastEventId ? `/pbxcore/api/nchan/sub/${installStatusLoopWorker.channelId}?last_event_id=${lastEventId}` : `/pbxcore/api/nchan/sub/${installStatusLoopWorker.channelId}`;
        installStatusLoopWorker.eventSource = new EventSource(subPath);

        installStatusLoopWorker.eventSource.addEventListener('message', e => {
            const response = JSON.parse(e.data);
            console.log('New message: ', response);
            installStatusLoopWorker.processModuleInstallation(response);
            localStorage.setItem(lastEventIdKey, e.lastEventId);
        });
    },
    /**
     * Parses push events from backend and process them
     * @param {object} response
     */
    processModuleInstallation(response){
        const moduleUniqueId = response.moduleUniqueId;
        const stage = response.stage;
        const stageDetails = response.stageDetails;
        const $row = $(`#${moduleUniqueId}`);
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
            if (stageDetails.result===true){
                window.location = `${globalRootUrl}pbx-extension-modules/index/`;
            } else {
                installStatusLoopWorker.$progressBarBlock.hide();
                if (stageDetails.messages !== undefined) {
                    installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError, stageDetails.messages);
                } else {
                    installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError);
                }
            }
        }
    },

    /**
     * Callback function to refresh the module download status.
     * @param {string} moduleUniqueId
     * @param {object} stageDetails - The response object containing the download status.
     */
    cbAfterReceiveNewDownloadStatus(moduleUniqueId, stageDetails) {
        // Check module download status
        if (stageDetails.data.d_status === 'DOWNLOAD_IN_PROGRESS') {
            const downloadProgress = Math.max(Math.round(parseInt(stageDetails.data.d_status_progress, 10)/2), 3);
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_DownloadInProgress, downloadProgress);
        } else if (stageDetails.d_status === 'DOWNLOAD_COMPLETE') {
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_DownloadInProgress, 50);
        }
    },

    /**
     * Callback function to refresh the module upload status.
     * @param {string} moduleUniqueId
     * @param {object} stageDetails - The response object containing the upload status.
     */
    cbAfterReceiveNewUploadStatus(moduleUniqueId, stageDetails) {
        // Check module download status
        if (stageDetails.data.d_status === 'UPLOAD_IN_PROGRESS') {
            const uploadProgress = Math.max(Math.round(parseInt(stageDetails.data.d_status_progress, 10)/2), 3);
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_UploadInProgress, uploadProgress);
        } else if (stageDetails.d_status === 'UPLOAD_COMPLETE') {
            installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_UploadInProgress, 50);
        }
    },

    /**
     * Callback function after receiving the new installation status.
     * @param {string} moduleUniqueId
     * @param {object} stageDetails - The response object containing the installation status.
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
     * Reset the download/update button to default stage
     * @param {jQuery} $row
     */
    resetButtonView($row){
        $('a.button').removeClass('disabled');
        $row.find('i.loading').removeClass('spinner loading');
        $row.find('a.download i').addClass('download');
        $row.find('a.update i').addClass('redo');
    },

    /**
     * Shows module installation error above the module row
     * @param {jQuery} $row
     * @param {string} header
     * @param messages
     */
    showModuleInstallationError($row, header, messages='') {
        installStatusLoopWorker.resetButtonView($row);
        if (messages.license!==undefined){
            const manageLink = `<br>${globalTranslate.lic_ManageLicense} <a href="${Config.keyManagementUrl}" target="_blank">${Config.keyManagementSite}</a>`;
            messages.license.push(manageLink);
        }
        const textDescription = UserMessage.convertToText(messages);
        const htmlMessage=  `<tr class="ui error center aligned table-error-messages"><td colspan="4"><div class="ui header">${header}</div><p>${textDescription}</p></div></td></tr>`;
        $row.addClass('error');
        $row.before(htmlMessage);
    },

    /**
     * Shows module installation progress bar and installation status
     * @param {string} moduleUniqueId
     * @param {string} header
     * @param {int} percent
     */
    updateProgressBar(moduleUniqueId, header, percent=0){
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