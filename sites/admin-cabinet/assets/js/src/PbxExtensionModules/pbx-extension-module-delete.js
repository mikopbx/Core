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
     * Initialize extensionModules list
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
                    // Check if the module is enabled, if enabled, disable it
                    const status = $(`#${params.uniqid}`).find('.checkbox').checkbox('is checked');
                    const keepSettings = deleteModule.$keepSettingsCheckbox.checkbox('is checked');
                    if (status === true) {
                        PbxApi.ModulesDisableModule(params.uniqid, () => {
                            PbxApi.ModulesUnInstallModule(
                                params.uniqid,
                                keepSettings,
                                extensionModules.cbAfterDelete,
                            );
                        });
                    } else {
                        PbxApi.ModulesUnInstallModule(params.uniqid, keepSettings, deleteModule.cbAfterDelete);
                    }
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

};

// When the document is ready, initialize the delete module class
$(document).ready(() => {
    deleteModule.initialize();
});
