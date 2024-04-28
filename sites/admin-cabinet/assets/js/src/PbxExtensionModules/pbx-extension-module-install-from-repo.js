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

/* global globalRootUrl, PbxApi, globalPBXLicense, globalTranslate, UserMessage, globalPBXVersion, installStatusLoopWorker, marketplace */

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
     * jQuery object for the installation module modal form.
     * @type {jQuery}
     */
    $installModuleModalForm: $('#install-modal-form'),


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
    initializeButtonEvents() {
        /**
         * Event handler for the download link click event.
         * @param {Event} e - The click event object.
         */
        $(document).on('click', 'a.download, a.update', (e) => {
            e.preventDefault();
            const $currentButton = $(e.target).closest('a.button');
            if (globalPBXLicense.trim() === '') {
                window.location = `${globalRootUrl}pbx-extension-modules/index#/licensing`;
            } else {
                installationFromRepo.openInstallModuleModal($currentButton);
            }

        });
        installationFromRepo.$btnUpdateAllModules.on('click', installationFromRepo.updateAllModules);
    },

    /**
     * Opens the modal form for installing a module. This modal provides the user with information
     * about the module they are about to install, and confirms their action.
     *
     * @param {jQuery} $currentButton - The jQuery object of the button that was clicked to trigger this modal.
     */
    openInstallModuleModal($currentButton) {
        const moduleUniqueId = $currentButton.data('uniqid');
        const releaseId = $currentButton.data('releaseid');
        installationFromRepo.$installModuleModalForm
            .modal({
                closable: false,
                onShow: () => {
                    const moduleName = $currentButton.closest('tr').data('name');
                    const theForm =  installationFromRepo.$installModuleModalForm;
                    theForm.find('span.module-name').text(moduleName);

                    const $installedModuleRow = $(`tr.module-row[data-id=${moduleUniqueId}]`);
                    if ($installedModuleRow.length>0){
                        const installedVersion = $installedModuleRow.data('version');
                        const newVersion = $currentButton.data('version')??installedVersion;
                        if (marketplace.versionCompare(newVersion, installedVersion)>0){
                            theForm.find('span.action').text(globalTranslate.ext_UpdateModuleTitle);
                            theForm.find('div.description').html(globalTranslate.ext_ModuleUpdateDescription);
                        } else {
                            theForm.find('span.action').text(globalTranslate.ext_DowngradeModuleTitle);
                            theForm.find('div.description').html(globalTranslate.ext_ModuleDowngradeDescription);
                        }
                    } else {
                        theForm.find('span.action').text(globalTranslate.ext_InstallModuleTitle);
                        theForm.find('div.description').html(globalTranslate.ext_ModuleInstallDescription);
                    }
                },
                onDeny: () => {
                    $('a.button').removeClass('disabled');
                    return true;
                },
                onApprove: () => {
                    $('a.button').addClass('disabled');

                    const params = {
                        uniqid: moduleUniqueId,
                        releaseId: releaseId,
                        channelId: installStatusLoopWorker.channelId
                    };

                    $(`#modal-${params.uniqid}`).modal('hide');
                    const $moduleButtons = $(`a[data-uniqid=${params.uniqid}`);

                    $moduleButtons.removeClass('disabled');
                    $moduleButtons.find('i')
                        .removeClass('download')
                        .removeClass('redo')
                        .addClass('spinner loading');

                    $('tr.table-error-messages').remove();
                    $('tr.error').removeClass('error');

                    PbxApi.ModulesInstallFromRepo(params, (response) => {
                        console.debug(response);
                        if (response.result === true) {
                            $('html, body').animate({
                                scrollTop: installationFromRepo.$progressBarBlock.offset().top,
                            }, 2000);
                        }
                    });

                    return true;
                },
            })
            .modal('show');
    },

    /**
     * Initiates the process of updating all installed modules. This function is triggered by the user
     * clicking the 'Update All' button. It first disables UI elements to prevent further user actions
     * and then calls the API to start the update process.
     *
     * @param {Event} e - The click event object associated with the 'Update All' button click.
     */
    updateAllModules(e) {
        e.preventDefault();
        $('a.button').addClass('disabled');
        const $currentButton = $(e.target).closest('a');
        installationFromRepo.openUpdateAllModulesModal($currentButton);
    },

    /**
     * Opens a modal confirmation dialog when updating all modules. This dialog informs the user about
     * the update process and asks for confirmation to proceed with updating all installed modules.
     *
     * @param {jQuery} $currentButton - The jQuery object of the button that was clicked to trigger this modal.
     */
    openUpdateAllModulesModal($currentButton) {
        installationFromRepo.$installModuleModalForm
            .modal({
                closable: false,
                onShow: () => {
                    const theForm =  installationFromRepo.$installModuleModalForm;
                    theForm.find('span.action').text(globalTranslate.ext_UpdateAllModulesTitle);
                    theForm.find('span.module-name').text('');
                    theForm.find('div.description').html(globalTranslate.ext_UpdateAllModulesDescription);
                },
                onDeny: () => {
                    $('a.button').removeClass('disabled');
                    return true;
                },
                onApprove: () => {
                    $('a.button').addClass('disabled');

                    $currentButton.removeClass('disabled');
                    $currentButton.closest('i.icon')
                        .removeClass('redo')
                        .addClass('spinner loading');

                    let uniqueModulesForUpdate = new Set();
                    $('a.update').each((index, $button)=>{
                        uniqueModulesForUpdate.add($($button).data('uniqid'));
                    });
                    const params = {
                        channelId: installStatusLoopWorker.channelId,
                        modulesForUpdate: [...uniqueModulesForUpdate],
                    };
                    PbxApi.ModulesUpdateAll(params, (response) => {
                        console.debug(response);
                    });

                    $('tr.table-error-messages').remove();
                    $('tr.error').removeClass('error');

                    return true;
                },
            })
            .modal('show');
    },

};

// Initializes the installationFromRepo module when the document is ready,
// preparing the extension modules management UI.
$(document).ready(() => {
    installationFromRepo.initialize();
});