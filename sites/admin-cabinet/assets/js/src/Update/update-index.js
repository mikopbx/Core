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

/* global PbxApi, globalPBXVersion, globalTranslate,
globalWebAdminLanguage, showdown, UserMessage, upgradeStatusLoopWorker, SystemAPI, FilesAPI, FileUploadEventHandler */

/**
 * Object for managing PBX firmware updates.
 *
 * @module updatePBX
 */
const updatePBX = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#upgrade-form'),

    /**
     * jQuery object for the submit button.
     * @type {jQuery}
     */
    $submitButton: $('#submitbutton'),

    /**
     * jQuery object for the progress bar.
     * @type {jQuery}
     */
    $progressBar: $('#upload-progress-bar'),

    /**
     * jQuery object for the progress bar label.
     * @type {jQuery}
     */
    $progressBarLabel: $('#upload-progress-bar-label'),

    /**
     * Current version of the PBX firmware.
     * @type {string}
     */
    currentVersion: globalPBXVersion,

    /**
     * jQuery object for the modal form before upgrade.
     * @type {jQuery}
     */
    $upgradeModalForm: $('#update-modal-form'),

    /**
     * jQuery object for the "I have backup" input field.
     * @type {jQuery}
     */
    $iHaveBackupInput: $("input[name='i-have-backup-input']"),

    /**
     * jQuery object for the green button on modal form before upgrade.
     * @type {jQuery}
     */
    $startUpgradeButton: $('#start-upgrade-button'),

    /**
     * There is upgrade process working now flag.
     * @type {boolean}
     */
    upgradeInProgress: false,

    /**
     * Helps to convert markdown into html.
     * @type {Converter}
     */
    converter: new showdown.Converter(),

    /**
     * Initializes the update PBX firmware functionality.
     */
    initialize() {

        // Open the upgrade modal form
        updatePBX.$upgradeModalForm.modal();

        // Add 'disabled' class to submit button
        updatePBX.$submitButton.addClass('disabled');

        // Trigger file input click when clicking on text input or button
        $('input:text, .ui.button', '.ui.action.input').on('click', (e) => {
            $('input:file', $(e.target).parents()).click();
        });

        // Update text input value when selecting a file
        $('input:file', '.ui.action.input').on('change', (e) => {
            if (e.target.files[0] !== undefined) {
                const filename = e.target.files[0].name;
                $('input:text', $(e.target).parent()).val(filename);
                updatePBX.$submitButton.removeClass('disabled');
            }
        });

        // Track the input field and make submit button available if phrase is equal to 'I have backup'
        updatePBX.$iHaveBackupInput.on('input', (e) => {
                if (updatePBX.$iHaveBackupInput.val()===globalTranslate.upd_EnterIHaveBackupPhrase) {
                    updatePBX.$startUpgradeButton.removeClass('disabled');
                } else {
                    updatePBX.$startUpgradeButton.addClass('disabled');
                }
        });

        // Handle submit button click
        updatePBX.$submitButton.on('click', (e) => {
            e.preventDefault();
            if (updatePBX.$submitButton.hasClass('loading') || updatePBX.upgradeInProgress) return;

            // Validate the form and show the upgrade modal form on success
            updatePBX.$formObj
                .form({
                    on: 'blur',
                    fields: updatePBX.validateRules,
                    onSuccess() {
                        updatePBX.$upgradeModalForm
                            .modal({
                                closable: false,
                                onDeny: () => true,
                                onApprove: () => {
                                    // Start the file upload process
                                    updatePBX.$submitButton.addClass('loading');
                                    updatePBX.upgradeInProgress = true;
                                    const data = $('input:file')[0].files[0];
                                    FilesAPI.uploadFile(data, updatePBX.cbResumableUploadFile, ['img'], 'firmware');
                                    return true;
                                },
                            })
                            .modal('show');
                    },
                });

            // Validate the form
            updatePBX.$formObj.form('validate form');
        });

        // Use unified SystemAPI to check for firmware updates
        SystemAPI.checkForUpdates((response) => {
            // Check if request was successful
            if (!response || !response.success || !response.data) {
                return;
            }

            // Check if updates are available
            if (!response.data.hasUpdates || !response.data.firmware) {
                return;
            }

            // Iterate through firmware objects and add version information
            const currentVerison = updatePBX.currentVersion.replace('-dev', '');
            response.data.firmware.forEach((obj) => {
                const version = obj.version.replace('-dev', '');
                if (versionCompare(version, currentVerison) > 0) {
                    updatePBX.addNewVersionInformation(obj);
                }
            });

            // Handle redo button click
            $('a.redo').on('click', (e) => {
                e.preventDefault();
                if (updatePBX.$submitButton.hasClass('loading') || updatePBX.upgradeInProgress) return;
                updatePBX.$upgradeModalForm
                    .modal({
                        closable: false,
                        onDeny: () => true,
                        onApprove: () => {
                            // Prepare parameters for firmware download
                            const params = {};
                            const $aLink = $(e.target).closest('a');
                            params.updateLink = $aLink.attr('href');
                            params.md5 = $aLink.attr('data-md5');
                            params.version = $aLink.attr('data-version');
                            params.size = $aLink.attr('data-size');
                            $aLink.find('i').addClass('loading');
                            updatePBX.upgradeInProgress = true;
                            FilesAPI.downloadFirmware(params, updatePBX.cbAfterStartDownloadFirmware);
                            return true;
                        },
                    })
                    .modal('show');
            });
        });
    },

    /**
     * Callback function for resumable file upload.
     * @param {string} action - The action of the upload.
     * @param {object} params - Additional parameters for the upload.
     */
    cbResumableUploadFile(action, params) {
        switch (action) {
            case 'fileSuccess':
                updatePBX.checkStatusFileMerging(params.response);
                break;
            case 'uploadStart':
                updatePBX.$submitButton.addClass('loading');
                updatePBX.$progressBar.show();
                updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadInProgress);
                break;
            case 'progress':
                updatePBX.$progressBar.progress({
                    percent: parseInt(params.percent, 10),
                });
                break;
            case 'error':
                updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadError);
                updatePBX.$submitButton.removeClass('loading');
                UserMessage.showMultiString(globalTranslate.upd_UploadError);
                break;
            default:
        }
    },

    /**
     * Checks the status of the file merging process.
     * @param {string} response - The response from the /pbxcore/api/upload/status function.
     */
    checkStatusFileMerging(response) {
        if (response === undefined || PbxApi.tryParseJSON(response) === false) {
            UserMessage.showMultiString(`${globalTranslate.upd_UploadError}`);
            return;
        }
        const json = JSON.parse(response);
        if (json === undefined || json.data === undefined) {
            UserMessage.showMultiString(`${globalTranslate.upd_UploadError}`);
            return;
        }
        const uploadId = json.data.upload_id;
        const filePath = json.data.filename;

        // Subscribe to WebSocket events instead of using polling worker
        FileUploadEventHandler.subscribe(uploadId, {
            onMergeStarted: (data) => {
                updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadInProgress);
                console.log('Firmware merge started:', data);
            },

            onMergeProgress: (data) => {
                // Update progress bar during merge
                if (data.progress !== undefined) {
                    updatePBX.$progressBar.progress({
                        percent: parseInt(data.progress, 10),
                    });
                }
                console.log(`Firmware merge progress: ${data.progress}%`);
            },

            onMergeComplete: (data) => {
                // Merge complete - start upgrade process
                updatePBX.$progressBarLabel.text(globalTranslate.upd_UpgradeInProgress);
                // Backend expects 'temp_filename' parameter, not 'filename'
                SystemAPI.upgrade({temp_filename: filePath}, updatePBX.cbAfterStartUpdate);
            },

            onError: (data) => {
                updatePBX.$submitButton.removeClass('loading');
                updatePBX.$progressBarLabel.text(globalTranslate.upd_UploadError);
                UserMessage.showMultiString(data.error || globalTranslate.upd_UploadError);
                updatePBX.upgradeInProgress = false;
            }
        });
    },

    /**
     * Callback after start PBX upgrading
     * @param response
     */
    cbAfterStartUpdate(response) {
        if (response.result !== undefined && response.result===false) {
            UserMessage.showMultiString(response.messages, globalTranslate.upd_UpgradeError);
            updatePBX.$submitButton.removeClass('loading');
        }
    },

    /**
     * After start online upgrade we have to wait an answer,
     * and then start status check worker
     */
    cbAfterStartDownloadFirmware(response) {
        if (response.filename !== undefined) {
            upgradeStatusLoopWorker.initialize(response.filename);
        } else {
            updatePBX.upgradeInProgress = false;
            $('i.loading.redo').removeClass('loading');
        }
    },

    /**
     * Add new block of update information on page
     */
    addNewVersionInformation(obj) {
        $('#online-updates-block').show();
        let markdownText = decodeURIComponent(obj.description);
        markdownText = markdownText.replace(/<br>/g, '\r');
        markdownText = markdownText.replace(/<br >/g, '\r');
        markdownText = markdownText.replace(/\* \*/g, '*');
        markdownText = markdownText.replace(/\*\*/g, '*');
        const html = updatePBX.converter.makeHtml(markdownText);
        const dymanicRow = `
			<tr class="update-row">
			<td class="center aligned">${obj.version}</td>
			<td>${html}</td>
			<td class="right aligned collapsing">
    		<div class="ui small basic icon buttons action-buttons">
    			<a href="${obj.href}" class="ui button redo popuped" 
    				data-content = "${globalTranslate.bt_ToolTipUpgradeOnline}"
					data-md5 ="${obj.md5}" data-size ="${obj.size}"
					data-version = "${obj.version}" >
					<i class="icon redo blue"></i>
					<span class="percent"></span>
				</a>
				<a href="${obj.href}" class="ui button download popuped" 
					data-content = "${globalTranslate.bt_ToolTipDownload}"
					data-md5 ="${obj.md5}" data-size ="${obj.size}">
					<i class="icon download blue"></i>
				</a>
    		</div>   
	</tr>`;
        $('#updates-table tbody').append(dymanicRow);
        $('a.popuped').popup();
    },
};

// When the document is ready, initialize the update pbx firmware from image page
$(document).ready(() => {
    updatePBX.initialize();
});

