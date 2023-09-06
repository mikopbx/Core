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

/* global globalRootUrl, Form, globalTranslate */

/**
 * Process common module settings.
 * @module pbxExtensionModuleModify
 */
const pbxExtensionModuleModify = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#pbx-extension-modify-form'),

    /**
     * jQuery object for the back button.
     * @type {jQuery}
     */
    $backButton: $('#back-to-list-button'),

    /**
     * jQuery object for the dropdown menu.
     * @type {jQuery}
     */
    $dropdownMenuGroups: $('#menu-group'),

    /**
     * Validation rules for the form fields before submission.
     * @type {object}
     */
    validateRules: {
        name: {
            identifier: 'caption',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ext_ValidateCaptionEmpty,
                },
            ],
        },
    },

    /**
     * Initializes the module.
     */
    initialize() {
        pbxExtensionModuleModify.$dropdownMenuGroups.dropdown();
        pbxExtensionModuleModify.initializeForm();
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = pbxExtensionModuleModify.$formObj.form('get values');
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        window.location = window.location.href;
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = pbxExtensionModuleModify.$formObj;
        Form.url = `${globalRootUrl}pbx-extension-modules/save`; // Form submission URL
        Form.validateRules = pbxExtensionModuleModify.validateRules; // Form validation rules
        Form.cbBeforeSendForm = pbxExtensionModuleModify.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = pbxExtensionModuleModify.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

// When the document is ready, initialize the external module management form.
$(document).ready(() => {
    pbxExtensionModuleModify.initialize();
});
