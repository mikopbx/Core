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

/* global PbxApi, globalTranslate, UserMessage */

/**
 * Represents the status of an external module.
 * @class PbxExtensionStatus
 * @memberof module:pbxExtensionModuleModify
 */
class PbxExtensionStatus {

    /**
     * Initializes the module status.
     * @param {string} uniqid - The unique ID of the module.
     * @param {boolean} [changeLabel=true] - Indicates whether to change the label text.
     */
    initialize(uniqid, changeLabel = true) {
        this.$toggle = $(`.ui.toggle.checkbox[data-value="${uniqid}"]`);
        this.$toggleSegment = $('#module-status-toggle-segment');
        this.$allToggles = $(`.ui.toggle.checkbox`);
        this.$statusIcon = $(`tr#${uniqid} i.status-icon`);
        this.$toggleSegment.show();
        if (changeLabel) {
            this.$label = $(`.ui.toggle.checkbox[data-value="${uniqid}"]`).find('label');
        } else {
            this.$label = false;
        }
        this.uniqid = uniqid;
        this.$disabilityFields = $(`tr#${uniqid} .disability`);
        const cbOnChecked = $.proxy(this.cbOnChecked, this);
        const cbOnUnchecked = $.proxy(this.cbOnUnchecked, this);
        this.$toggle.checkbox({
            onChecked: cbOnChecked,
            onUnchecked: cbOnUnchecked,
        });
    }

    /**
     * Changes the label text.
     * @param {string} newText - The new label text.
     */
    changeLabelText(newText) {
        if (this.$label) {
            this.$label.text(newText);
        }
    }

    /**
     * Callback function when the module is checked.
     */
    cbOnChecked() {
        this.$statusIcon.addClass('spinner loading icon');
        this.$allToggles.addClass('disabled');
        $('a.button').addClass('disabled');
        this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
        const cbAfterModuleEnable = $.proxy(this.cbAfterModuleEnable, this);
        PbxApi.ModulesEnableModule(this.uniqid, cbAfterModuleEnable);
    }

    /**
     * Callback function when the module is unchecked.
     */
    cbOnUnchecked() {
        this.$statusIcon.addClass('spinner loading icon');
        this.$allToggles.addClass('disabled');
        $('a.button').addClass('disabled');
        this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
        const cbAfterModuleDisable = $.proxy(this.cbAfterModuleDisable, this);
        PbxApi.ModulesDisableModule(this.uniqid, cbAfterModuleDisable);
    }

    /**
     * Callback function after disabling the module.
     * @param {object} response - The response from the server.
     * @param {boolean} success - Indicates whether the request was successful.
     */
    cbAfterModuleDisable(response, success) {
        if (success) {
            // Update UI to show module is disabled
            this.$toggle.checkbox('set unchecked');
            this.$statusIcon.removeClass('spinner loading icon');
            this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);

            // Trigger events to indicate module status and config data has changed
            const event = document.createEvent('Event');
            event.initEvent('ModuleStatusChanged', false, true);
            window.dispatchEvent(event);
            event.initEvent('ConfigDataChanged', false, true);
            window.dispatchEvent(event);

            // Disable input fields and show message for changed objects
            this.$disabilityFields.addClass('disabled');
            if (response.data.changedObjects !== undefined) {
                UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
            }

            // Refresh the page to reflect changes is better to do in on module page using event ModuleStatusChanged subscription
            window.location.reload();
        } else {
            this.$toggle.checkbox('set checked');
            this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
            this.$disabilityFields.removeClass('disabled');
            const $row = $(`tr[data-id=${this.uniqid}]`);
            this.showModuleError($row, globalTranslate.ext_ModuleChangeStatusError, response.messages);
        }
        this.$allToggles.removeClass('disabled');
        $('a.button').removeClass('disabled');
        this.$statusIcon.removeClass('spinner loading icon');
    }

    /**
     * Callback function after enabling the module.
     * @param {object} response - The response from the server.
     * @param {boolean} success - Indicates whether the request was successful.
     */
    cbAfterModuleEnable(response, success) {
        if (success) {
            $('.ui.message.ajax').remove();
            // Update UI to show module is enabled
            this.$toggle.checkbox('set checked');
            this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);

            // Trigger events to indicate module status and config data has changed
            const event = document.createEvent('Event');
            event.initEvent('ModuleStatusChanged', false, true);
            window.dispatchEvent(event);
            event.initEvent('ConfigDataChanged', false, true);
            window.dispatchEvent(event);

            // Enable input fields and show message for changed objects
            this.$disabilityFields.removeClass('disabled');
            if (response.data.changedObjects !== undefined) {
                UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
            }

            // Refresh the page to reflect changes is better to do in on module page using event ModuleStatusChanged subscription
            window.location.reload();
        } else {
            this.$toggle.checkbox('set unchecked');
            this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
            this.$disabilityFields.addClass('disabled');
            const $row = $(`tr[data-id=${this.uniqid}]`);
            this.showModuleError($row, globalTranslate.ext_ModuleChangeStatusError, response.messages);
        }
        this.$allToggles.removeClass('disabled');
        this.$statusIcon.removeClass('spinner loading icon');
        $('a.button').removeClass('disabled');
    }

    /**
     * Displays an error message related to module status in the UI.
     * @param {jQuery} $row - The jQuery object representing the row in the UI associated with the module.
     * @param {string} header - The header text for the error message.
     * @param {Object} messages - Detailed error messages to be displayed.
     */
    showModuleError($row, header, messages='') {
        if (messages===undefined){
            return;
        }
        if ($row.length===0){
            if (messages.license!==undefined){
                UserMessage.showLicenseError(globalTranslate.ext_ModuleLicenseProblem, messages.license);
            } else {
                UserMessage.showMultiString(messages, globalTranslate.ext_ModuleChangeStatusError);
            }
            return;
        }
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
    }
}

// When the document is ready, initialize the external module status toggles.
$(document).ready(() => {
    const uniqId = $('#module-status-toggle').attr('data-value');
    if (uniqId) {
        const pageStatus = new PbxExtensionStatus();
        pageStatus.initialize(uniqId, true);
    }
});
