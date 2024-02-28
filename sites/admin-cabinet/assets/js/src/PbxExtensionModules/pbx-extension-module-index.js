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

/* global globalRootUrl, PbxApi, globalPBXLicense, globalTranslate, UserMessage, globalPBXVersion, SemanticLocalization, upgradeStatusLoopWorker, PbxExtensionStatus, keyCheck */

/**
 * Represents list of extension modules.
 * @class extensionModules
 * @memberof module:PbxExtensionModules
 */
const extensionModules = {

    /**
     * jQuery object for the table with available modules.
     * @type {jQuery}
     */
    $marketplaceTable: $('#new-modules-table'),

    /**
     * jQuery object for the information when no any modules available to install.
     * @type {jQuery}
     */
    $noNewModulesSegment: $('#no-new-modules-segment'),

    /**
     * jQuery object for the loader instead of available modules.
     * @type {jQuery}
     */
    $marketplaceLoader: $('#new-modules-loader'),

    /**
     * jQuery object for the table with installed modules.
     * @type {jQuery}
     */
    $installedModulesTable: $('#installed-modules-table'),

    /**
     * jQuery object for the checkboxes.
     * @type {jQuery}
     */
    $checkboxes: $('.module-row .checkbox'),

    $deleteModalForm: $('#delete-modal-form'),

    $keepSettingsCheckbox: $('#keepModuleSettings'),

    pbxVersion: globalPBXVersion.replace(/-dev/i, ''),

    pbxLicense: globalPBXLicense.trim(),

    /**
     * jQuery object for the button which responsible for update all installed modules
     * @type {jQuery}
     */
    $btnUpdateAllModules: $('#update-all-modules-button'),

    checkBoxes: [],

    /**
     * jQuery object for icon with popup text
     * @type {jQuery}
     */
    $popupOnClick: $('i.popup-on-click'),

    /**
     * jQuery object for the tabular menu.
     * @type {jQuery}
     */
    $tabMenuItems: $('#pbx-extensions-tab-menu .item'),

    /**
     * EventSource object for the module installation and upgrade status
     * @type {EventSource}
     */
    eventSource: null,

    /**
     * PUB/SUB channel ID
     */
    channelId: 'install-module',

    /**
     * Initialize extensionModules list
     */
    initialize() {
        // Enable tab navigation with history support
        extensionModules.$tabMenuItems.tab({
            history: true,
            historyType: 'hash',
        });

        extensionModules.$deleteModalForm.modal();

        extensionModules.initializeDataTable();

        extensionModules.$popupOnClick.popup({
            on    : 'click',
            className: {
                popup: 'ui popup wide'
            }
        });

        PbxApi.ModulesGetAvailable(extensionModules.cbParseModuleUpdates);
        extensionModules.$checkboxes.each((index, obj) => {
            const uniqId = $(obj).attr('data-value');
            const pageStatus = new PbxExtensionStatus();
            pageStatus.initialize(uniqId, false);
            extensionModules.checkBoxes.push(pageStatus);
        });

        extensionModules.$btnUpdateAllModules.hide(); // Until at least one update available
        extensionModules.$btnUpdateAllModules.on('click', extensionModules.updateAllModules);

        extensionModules.startListenPushNotifications();

    },

    /**
     * Initialize data tables on table
     */
    initializeDataTable() {
        extensionModules.$installedModulesTable.DataTable({
            lengthChange: false,
            paging: false,
            columns: [
                {orderable: false, searchable: false},
                null,
                null,
                null,
                {orderable: false, searchable: false},
            ],
            autoWidth: false,
            language: SemanticLocalization.dataTableLocalisation,
        });

        // Move the "Add New" button to the first eight-column div
        $('.add-new').appendTo($('div.eight.column:eq(0)'));
    },

    /**
     * Callback function to process the list of modules received from the website.
     * @param {object} response - The response containing the list of modules.
     */
    cbParseModuleUpdates(response) {
        extensionModules.$marketplaceLoader.hide();
        response.modules.forEach((obj) => {
            // Check if this module is compatible with the PBX based on version number
            const minAppropriateVersionPBX = obj.min_pbx_version;
            const currentVersionPBX = extensionModules.pbxVersion;
            if (extensionModules.versionCompare(currentVersionPBX, minAppropriateVersionPBX) < 0) {
                return;
            }

            // Check if the module is already installed and offer an update
            const $moduleRow = $(`tr.module-row[data-id=${obj.uniqid}]`);
            if ($moduleRow.length > 0) {
                const oldVer = $moduleRow.find('td.version').text();
                const newVer = obj.version;
                if (extensionModules.versionCompare(newVer, oldVer) > 0) {
                    extensionModules.addUpdateButtonToRow(obj);
                }
            } else {
                const $newModuleRow = $(`tr.new-module-row[data-id=${obj.uniqid}]`);
                if ($newModuleRow.length > 0) {
                    const oldVer = $newModuleRow.find('td.version').text();
                    const newVer = obj.version;
                    if (extensionModules.versionCompare(newVer, oldVer) > 0) {
                        $newModuleRow.remove();
                        extensionModules.addModuleDescription(obj);
                    }
                } else {
                    extensionModules.addModuleDescription(obj);
                }
            }
        });

        if ($('tr.new-module-row').length>0){
            extensionModules.$noNewModulesSegment.hide();
        } else {
            extensionModules.$noNewModulesSegment.show();
        }

        /**
         * Event handler for the download link click event.
         * @param {Event} e - The click event object.
         */
        $(document).on('click','a.download, a.update', (e) => {
            e.preventDefault();
            $('a.button').addClass('disabled');
            const $currentButton = $(e.target).closest('a.button');
            let params = {};
            params.uniqid = $currentButton.data('uniqid');
            params.releaseId = $currentButton.data('releaseid');
            params.channelId = extensionModules.channelId;
            $(`#modal-${params.uniqid}`).modal('hide');

            const $moduleButtons = $(`a[data-uniqid=${params.uniqid}]`);
            $moduleButtons.removeClass('disabled');
            $moduleButtons.find('i')
                .removeClass('download')
                .removeClass('redo')
                .addClass('spinner loading');
            $moduleButtons.find('span.percent').text('0%');
            $('tr.table-error-messages').remove();
            $('tr.error').removeClass('error');
            if (extensionModules.pbxLicense === '') {
                window.location = `${globalRootUrl}pbx-extension-modules/index#/licensing`;
            } else {
                PbxApi.ModulesInstallFromRepo(params, (response) => {
                    console.log(response);
                });
            }
        });

        /**
         * Event handler for the delete link click event.
         * @param {Event} e - The click event object.
         */
        $('a.delete').on('click', (e) => {
            e.preventDefault();
            $('a.button').addClass('disabled');
            $(e.target).closest('a').removeClass('disabled');
            const params = {};
            params.uniqid = $(e.target).closest('tr').data('id');
            extensionModules.deleteModule(params);
        });
        $('a[data-content]').popup();
    },

    /**
     * Adds a description for an available module.
     * @param {Object} obj - The module object containing information.
     */
    addModuleDescription(obj) {
        extensionModules.$marketplaceTable.show();
        let promoLink = '';
        if (obj.promo_link !== undefined && obj.promo_link !== null) {
            promoLink = `<br><a href="${obj.promo_link}" target="_blank">${globalTranslate.ext_ExternalDescription}</a>`;
        }

        let additionalIcon = '<i class="puzzle piece icon"></i>';
        if (obj.commercial !== '0') {
            additionalIcon = '<i class="ui donate icon"></i>';
        }
        const dynamicRow = `
			<tr class="new-module-row" data-id="${obj.uniqid}">
						<td class="show-details-on-click">${additionalIcon} ${decodeURIComponent(obj.name)}<br>
						    <span class="features">${decodeURIComponent(obj.description)} ${promoLink}</span>
						</td>
						<td class="show-details-on-click">${decodeURIComponent(obj.developer)}</td>
						<td class="center aligned version show-details-on-click">${obj.version}</td>
						<td class="right aligned collapsing">
    							<a href="#" class="ui icon basic button download popuped disable-if-no-internet" 
									data-content= "${globalTranslate.ext_InstallModule}"
									data-uniqid = "${obj.uniqid}"
									data-size = "${obj.size}"
									data-releaseid ="${obj.release_id}">
									<i class="icon download blue"></i> 
									<span class="percent"></span>
								</a>
    				    </td>		
			</tr>`;
        $('#new-modules-table tbody').append(dynamicRow);
    },

    /**
     * Adds an update button to the module row for updating an old version of PBX.
     * @param {Object} obj - The module object containing information.
     */
    addUpdateButtonToRow(obj) {
        const $moduleRow = $(`tr.module-row[data-id=${obj.uniqid}]`);
        const $currentUpdateButton = $moduleRow.find('a.download');
        if ($currentUpdateButton.length > 0) {
            const oldVer = $currentUpdateButton.attr('data-ver');
            const newVer = obj.version;
            if (extensionModules.versionCompare(newVer, oldVer) <= 0) {
                return;
            }
        }
        $currentUpdateButton.remove();
        const dynamicButton
            = `<a href="#" class="ui basic button update popuped disable-if-no-internet" 
			data-content="${globalTranslate.ext_UpdateModule}"
			data-ver ="${obj.version}"
			data-size = "${obj.size}"
			data-uniqid ="${obj.uniqid}" 
			data-releaseid ="${obj.release_id}">
			<i class="icon redo blue"></i> 
			<span class="percent"></span>
			</a>`;
        $moduleRow.find('.action-buttons').prepend(dynamicButton);
        extensionModules.$btnUpdateAllModules.show();
    },


    /**
     * Delete a module.
     * @param {Object} params - The request parameters.
     */
    deleteModule(params) {
        // Ask the user if they want to keep the settings
        extensionModules.$deleteModalForm
            .modal({
                closable: false,
                onDeny: () => {
                    $('a.button').removeClass('disabled');
                    return true;
                },
                onApprove: () => {
                    // Check if the module is enabled, if enabled, disable it
                    const status = $(`#${params.uniqid}`).find('.checkbox').checkbox('is checked');
                    const keepSettings = extensionModules.$keepSettingsCheckbox.checkbox('is checked');
                    if (status === true) {
                        PbxApi.ModulesDisableModule(params.uniqid, () => {
                            PbxApi.ModulesUnInstallModule(
                                params.uniqid,
                                keepSettings,
                                extensionModules.cbAfterDelete,
                            );
                        });
                    } else {
                        PbxApi.ModulesUnInstallModule(params.uniqid, keepSettings, extensionModules.cbAfterDelete);
                    }
                    return true;
                },
            })
            .modal('show');
    },

    /**
     * Callback function after click on the update all modules button
     */
    updateAllModules(){
        $('a.button').addClass('disabled');
        const $currentButton = $(e.target).closest('a');
        $currentButton.removeClass('disabled');
        $currentButton.closest('i.icon')
            .removeClass('redo')
            .addClass('spinner loading');
        let params = {};
        params.channelId = extensionModules.channelId;
        PbxApi.ModulesUpdateAll(params, (response) => {
            console.log(response);
        });
    },

    /**
     * Callback function after deleting a module.
     * If successful, reload the page; if not, display an error message.
     * @param {boolean} result - The result of the module deletion.
     */
    cbAfterDelete(result) {
        $('a.button').removeClass('disabled');
        if (result === true) {
            window.location = `${globalRootUrl}pbx-extension-modules/index/`;
        } else {
            $('.ui.message.ajax').remove();
            let errorMessage = (result.data !== undefined) ? result.data : '';
            errorMessage = errorMessage.replace(/\n/g, '<br>');
            UserMessage.showMultiString(errorMessage, globalTranslate.ext_DeleteModuleError);
        }
    },

    /**
     * Compare versions of modules.
     * @param {string} v1 - The first version to compare.
     * @param {string} v2 - The second version to compare.
     * @param {object} [options] - Optional configuration options.
     * @param {boolean} [options.lexicographical] - Whether to perform lexicographical comparison (default: false).
     * @param {boolean} [options.zeroExtend] - Weather to zero-extend the shorter version (default: false).
     * @returns {number} - A number indicating the comparison result: 0 if versions are equal, 1 if v1 is greater, -1 if v2 is greater, or NaN if the versions are invalid.
     */
    versionCompare(v1, v2, options) {
        const lexicographical = options && options.lexicographical;
        const zeroExtend = options && options.zeroExtend;
        let v1parts = v1.split('.');
        let v2parts = v2.split('.');

        function isValidPart(x) {
            return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
        }

        if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
            return NaN;
        }

        if (zeroExtend) {
            while (v1parts.length < v2parts.length) v1parts.push('0');
            while (v2parts.length < v1parts.length) v2parts.push('0');
        }

        if (!lexicographical) {
            v1parts = v1parts.map(Number);
            v2parts = v2parts.map(Number);
        }

        for (let i = 0; i < v1parts.length; i += 1) {
            if (v2parts.length === i) {
                return 1;
            }
            if (v1parts[i] === v2parts[i]) {
                //
            } else if (v1parts[i] > v2parts[i]) {
                return 1;
            } else {
                return -1;
            }
        }

        if (v1parts.length !== v2parts.length) {
            return -1;
        }

        return 0;
    },

    /**
     * Starts listen to push notifications from backend
     */
    startListenPushNotifications() {
        const lastEventIdKey = `lastEventId`;
        let lastEventId = localStorage.getItem(lastEventIdKey);
        const subPath = lastEventId ? `/pbxcore/api/nchan/sub/${extensionModules.channelId}?last_event_id=${lastEventId}` : `/pbxcore/api/nchan/sub/${extensionModules.channelId}`;
        extensionModules.eventSource = new EventSource(subPath);

        extensionModules.eventSource.addEventListener('message', e => {
            const response = JSON.parse(e.data);
            console.log('New message: ', response);
            extensionModules.processModuleInstallation(response);
            localStorage.setItem(lastEventIdKey, e.lastEventId);
        });
    },
    /**
     * Parses push events from backend and process them
     * @param response
     */
    processModuleInstallation(response){
        const moduleUniqueId = response.moduleUniqueId;
        const stage = response.stage;
        const stageDetails = response.stageDetails;
        const $row = $(`#${moduleUniqueId}`);
        if (stage ==='Stage_I_GetRelease'){
            $row.find('span.percent').text('1%');
        } else if (stage === 'Stage_II_CheckLicense'){
            $row.find('span.percent').text('2%');
        } else if (stage === 'Stage_III_GetDownloadLink'){
            $row.find('span.percent').text('3%');
        } else if (stage === 'Stage_IV_DownloadModule'){
            extensionModules.cbAfterReceiveNewDownloadStatus(moduleUniqueId, stageDetails);
        } else if (stage === 'Stage_V_InstallModule'){
            extensionModules.cbAfterReceiveNewInstallationStatus(moduleUniqueId, stageDetails);
        } else if (stage === 'Stage_VI_EnableModule'){

        } else if (stage === 'Stage_VII_FinalStatus'){

            if (stageDetails.result===true){
                    window.location = `${globalRootUrl}pbx-extension-modules/index/`;
            } else {
                if (stageDetails.messages !== undefined) {
                    extensionModules.showModuleInstallationError($row, globalTranslate.ext_InstallationError, stageDetails.messages);
                } else {
                    extensionModules.showModuleInstallationError($row, globalTranslate.ext_InstallationError);
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

        const $row = $(`tr[data-uniqid=${moduleUniqueId}]`);
        // Check module download status
        if (stageDetails.data.d_status === 'DOWNLOAD_IN_PROGRESS') {
            const downloadProgress = Math.max(Math.round(parseInt(stageDetails.data.d_status_progress, 10)/2), 3);
            $row.find('span.percent').text(`${downloadProgress}%`);
        } else if (stageDetails.d_status === 'DOWNLOAD_COMPLETE') {
            $row.find('span.percent').text('50%');
        }
    },

    /**
     * Callback function after receiving the new installation status.
     * @param {string} moduleUniqueId
     * @param {object} stageDetails - The response object containing the installation status.
     */
    cbAfterReceiveNewInstallationStatus(moduleUniqueId, stageDetails) {
        // Check module installation status
        const $row = $(`tr[data-uniqid=${moduleUniqueId}]`);
        if (stageDetails.data.i_status === 'INSTALLATION_IN_PROGRESS') {
            const installationProgress = Math.round(parseInt(stageDetails.data.i_status_progress, 10)/2+50);
            $row.find('span.percent').text(`${installationProgress}%`);
        } else if (stageDetails.data.i_status === 'INSTALLATION_COMPLETE') {
            $row.find('span.percent').text('100%');
        }
    },

    /**
     * Reset the download/update button to default stage
     * @param $row
     */
    resetButtonView($row){
        $('a.button').removeClass('disabled');
        $row.find('i.loading').removeClass('spinner loading');
        $row.find('a.download i').addClass('download');
        $row.find('a.update i').addClass('redo');
        $row.find('span.percent').text('');
    },

    /**
     * Shows module installation error above the module row
     * @param $row
     * @param header
     * @param messages
     */
    showModuleInstallationError($row, header, messages='') {
        extensionModules.resetButtonView($row);
        if (messages.license!==undefined){
            const manageLink = `<br>${globalTranslate.lic_ManageLicense} <a href="${Config.keyManagementUrl}" target="_blank">${Config.keyManagementSite}</a>`;
            messages.license.push(manageLink);
        }
        const textDescription = UserMessage.convertToText(messages);
        const htmlMessage=  `<tr class="ui error center aligned table-error-messages"><td colspan="4"><div class="ui header">${header}</div><p>${textDescription}</p></div></td></tr>`;
        $row.addClass('error');
        $row.before(htmlMessage);
    }
};

// When the document is ready, initialize the external modules table
$(document).ready(() => {
    extensionModules.initialize();
});
