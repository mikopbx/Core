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
 * Class for module uninstallation.
 *
 * @class deleteModule
 * @memberof module:PbxExtensionModules
 */
const deleteModule = {

    /**
     * jQuery object for the delete module modal form.
     * @type {jQuery}
     */
    $deleteModalForm: $('#delete-modal-form'),

    /**
     * jQuery object for checkbox which flags store module settings for future installations or not.
     * @type {jQuery}
     */
    $keepSettingsCheckbox: $('#keepModuleSettings'),

    /**
     * The identifier for the PUB/SUB channel used to subscribe to uninstallation status updates.
     * This ensures that the client is listening on the correct channel for relevant events.
     */
    channelId: 'uninstall-module',

    /**
     * Initialize module deinstalation
     */
    initialize() {

        deleteModule.$deleteModalForm.modal();

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
            deleteModule.deleteModule(params);
        });
    },


    /**
     * Delete a module.
     * @param {Object} params - The request parameters.
     */
    deleteModule(params) {
        // Ask the user if they want to keep the settings
        deleteModule.$deleteModalForm
            .modal({
                closable: false,
                onDeny: () => {
                    $('a.button').removeClass('disabled');
                    return true;
                },
                onApprove: () => {
                    EventBus.subscribe(this.channelId, data => {
                        deleteModule.cbAfterDelete(data);
                    });
                    const keepSettings = deleteModule.$keepSettingsCheckbox.checkbox('is checked');
                    params.keepSettings = keepSettings;
                    params.channelId = this.channelId;
                    PbxApi.ModulesUnInstallModule(params, deleteModule.cbAfterDelete);
                    
                    return true;
                },
            })
            .modal('show');
    },

    /**
     * Callback function after deleting a module.
     * If successful, reload the page; if not, display an error message.
     * @param {boolean} result - The result of the module deletion.
     */
    cbAfterDelete(response) {
        if (response===true) return;
        const stage = response.stage;
        const stageDetails = response.stageDetails;
        if (stage ==='Stage_I_DisableModule'){

        } else if (stage === 'Stage_II_StopProcesses'){
        
        } else if (stage === 'Stage_III_BackupDB'){
        
        } else if (stage === 'Stage_IV_RunInnerUnistaller'){
        
        } else if (stage === 'Stage_IV_RunFailoverUnistaller'){
        
        } else if (stage === 'Stage_V_DeleteModuleFolder'){
        
        } else if (stage === 'Stage_VI_UnregisterModule'){
        
        } else if (stage === 'Stage_VII_FinalStatus'){
            $('a.button').removeClass('disabled');
            if (stageDetails.result===true){
                window.location = `${globalRootUrl}pbx-extension-modules/index/`;
            } else {
                UserMessage.showMultiString(stageDetails.messages, globalTranslate.ext_DeleteModuleError);
            }
        }
    }
};

// When the document is ready, initialize the delete module class
$(document).ready(() => {
    deleteModule.initialize();
});
