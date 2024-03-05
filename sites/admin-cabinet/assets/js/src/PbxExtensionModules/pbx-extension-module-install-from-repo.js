/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, PbxApi, globalPBXLicense, globalTranslate, UserMessage, globalPBXVersion, installStatusLoopWorker */

/**
 * Manages the installation and updating of PBX extension modules from a repository.
 * It provides functionality to update individual modules or all modules at once,
 * and displays progress information to the user.
 *
 * @class installationFromRepo
 * @memberof module:PbxExtensionModules
 */
const installationFromRepo = {

    /**
     * The current version of the PBX system, with development version identifiers removed.
     * @type {string}
     */
    pbxVersion: globalPBXVersion.replace(/-dev/i, ''),

    /**
     * The license key for the PBX system, trimmed of any leading or trailing whitespace.
     * @type {string}
     */
    pbxLicense: globalPBXLicense.trim(),

    /**
     * jQuery object for the button responsible for updating all installed modules.
     * @type {jQuery}
     */
    $btnUpdateAllModules: $('#update-all-modules-button'),

    /**
     * jQuery object for the block that contains the progress bar, used to indicate
     * the progress of module installation or updating processes.
     * @type {jQuery}
     */
    $progressBarBlock: $('#upload-progress-bar-block'),

    /**
     * Initializes the installationFromRepo module. Sets up event handlers for UI interactions
     * and hides UI elements that are not immediately needed.
     */
    initialize() {
        installationFromRepo.initializeButtonEvents();

        installationFromRepo.$progressBarBlock.hide();
        installationFromRepo.$btnUpdateAllModules.hide(); // Until at least one update available
    },

    /**
     * Sets up event handlers for button clicks within the module.
     * This includes handling the installation and update of individual
     * modules as well as the bulk update functionality.
     */
    initializeButtonEvents(){
        /**
         * Event handler for the download link click event.
         * @param {Event} e - The click event object.
         */
        $(document).on('click','a.download, a.update', (e) => {
            e.preventDefault();
            $('a.button').addClass('disabled');
            const $currentButton = $(e.target).closest('a.button');
            const params = {
                uniqid: $currentButton.data('uniqid'),
                releaseId: $currentButton.data('releaseid'),
                channelId: installStatusLoopWorker.channelId
            };

            $(`#modal-${params.uniqid}`).modal('hide');
            const $moduleButtons = $(`a[data-uniqid=${params.uniqid}`);

            $moduleButtons.removeClass('disabled');
            $moduleButtons.find('i')
                .removeClass('download')
                .removeClass('redo')
                .addClass('spinner loading');

            installStatusLoopWorker.updateProgressBar(params.uniqid, globalTranslate.ext_GetReleaseInProgress, 0);

            $('tr.table-error-messages').remove();
            $('tr.error').removeClass('error');
            if (installationFromRepo.pbxLicense === '') {
                window.location = `${globalRootUrl}pbx-extension-modules/index#/licensing`;
            } else {
                PbxApi.ModulesInstallFromRepo(params, (response) => {
                   if (response.result === true){
                       installStatusLoopWorker.initialize();
                   }
                });
            }
        });

        installationFromRepo.$btnUpdateAllModules.on('click', installationFromRepo.updateAllModules);
    },

    /**
     * Handles the process of updating all installed modules.
     * Triggered when the 'Update All' button is clicked.
     * It disables UI elements to prevent additional user actions during the update process and initiates
     * the update via the PBX API.
     *
     * @param {Event} e - The click event object associated with the 'Update All' button click.
     */
    updateAllModules(e){
        e.preventDefault();
        $('a.button').addClass('disabled');
        const $currentButton = $(e.target).closest('a');
        $currentButton.removeClass('disabled');
        $currentButton.closest('i.icon')
            .removeClass('redo')
            .addClass('spinner loading');
        const params = {
            channelId: installStatusLoopWorker.channelId
        };
        PbxApi.ModulesUpdateAll(params, (response) => {
            if (response.result === true) {
                installStatusLoopWorker.initialize();
            }
        });
    },

};

// Initializes the installationFromRepo module when the document is ready,
// preparing the extension modules management UI.
$(document).ready(() => {
    installationFromRepo.initialize();
});
