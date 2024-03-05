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
 * Represents list of extension modules.
 * @class instalationFromRepo
 * @memberof module:PbxExtensionModules
 */
const installationFromRepo = {

    pbxVersion: globalPBXVersion.replace(/-dev/i, ''),

    pbxLicense: globalPBXLicense.trim(),

    /**
     * jQuery object for the button which responsible for update all installed modules
     * @type {jQuery}
     */
    $btnUpdateAllModules: $('#update-all-modules-button'),

    /**
     * The progress bar block.
     * @type {jQuery}
     */
    $progressBarBlock: $('#upload-progress-bar-block'),


    /**
     * Initialize extensionModules list
     */
    initialize() {
        installationFromRepo.initializeButtonEvents();

        installationFromRepo.$progressBarBlock.hide();
        installationFromRepo.$btnUpdateAllModules.hide(); // Until at least one update available
    },

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
                    console.log(response);
                    installStatusLoopWorker.initialize();
                });
            }
        });

        installationFromRepo.$btnUpdateAllModules.on('click', installationFromRepo.updateAllModules);
    },

    /**
     * Callback function after click on the update all modules button
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
            console.log(response);
            installStatusLoopWorker.initialize();
        });
    },

};

// When the document is ready, initialize the external modules table
$(document).ready(() => {
    installationFromRepo.initialize();
});
