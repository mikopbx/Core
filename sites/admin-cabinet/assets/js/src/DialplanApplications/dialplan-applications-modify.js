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

/* global globalRootUrl,globalTranslate, ace, Form, Extensions */

/**
 * The DialplanApplication object.
 *  Manages the operations and behaviors of the Dialplan applications in the UI.
 *
 * @module DialplanApplication
 */
const dialplanApplication = {

    $number: $('#extension'),
    defaultExtension: '',

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#dialplan-application-form'),

    $typeSelectDropDown: $('#dialplan-application-form .type-select'),

    $tabMenuItems: $('#application-code-menu .item'),

    // Ace editor instance
    editor: '',

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.da_ValidateNameIsEmpty,
                },
            ],
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'regExp',
                    value: '/^(|[0-9#+\\*|X]{1,64})$/',
                    prompt: globalTranslate.da_ValidateExtensionNumber,
                },
                {
                    type: 'empty',
                    prompt: globalTranslate.da_ValidateExtensionIsEmpty,
                },
                {
                    type: 'existRule[extension-error]',
                    prompt: globalTranslate.da_ValidateExtensionDouble,
                },
            ],
        },
    },

    /**
     * Initializes the DialplanApplication.
     * Sets up tabs, dropdowns, form and Ace editor.
     * Sets up change handlers for extension number and editor contents.
     */
    initialize() {
        dialplanApplication.$tabMenuItems.tab();
        if (dialplanApplication.$formObj.form('get value', 'name').length === 0) {
            dialplanApplication.$tabMenuItems.tab('change tab', 'main');
        }
        dialplanApplication.$typeSelectDropDown.dropdown({
            onChange: dialplanApplication.changeAceMode,
        });

        // Add handler to dynamically check if the input number is available
        dialplanApplication.$number.on('change', () => {
            const newNumber = dialplanApplication.$formObj.form('get value', 'extension');
            Extensions.checkAvailability(dialplanApplication.defaultExtension, newNumber);
        });

        // Initialize UI components
        dialplanApplication.initializeForm();
        dialplanApplication.initializeAce();
        dialplanApplication.changeAceMode();

        dialplanApplication.defaultExtension = dialplanApplication.$formObj.form('get value', 'extension');
    },

    /**
     * Initializes the Ace editor instance.
     * Sets up Ace editor with a monokai theme and custom options.
     * Attaches change handler to the editor session.
     */
    initializeAce() {
        const applicationLogic = dialplanApplication.$formObj.form('get value', 'applicationlogic');
        const aceHeight = window.innerHeight - 380;
        const rowsCount = Math.round(aceHeight / 16.3);
        $(window).load(function () {
            $('.application-code').css('min-height', `${aceHeight}px`);
        });
        dialplanApplication.editor = ace.edit('application-code');
        dialplanApplication.editor.getSession().setValue(applicationLogic);
        dialplanApplication.editor.setTheme('ace/theme/monokai');
        dialplanApplication.editor.resize();
        dialplanApplication.editor.getSession().on('change', () => {
            // Trigger change event to acknowledge the modification
            Form.dataChanged();
        });
        dialplanApplication.editor.setOptions({
            maxLines: rowsCount,
            showPrintMargin: false,
            showLineNumbers: false,
        });
    },

    /**
     * Changes the Ace editor mode and settings based on the 'type' form value.
     * If the 'type' is 'php', PHP mode is set, and line numbers are shown.
     * Otherwise, Julia mode is set, and line numbers are hidden.
     * The editor theme is set to Monokai in all cases.
     */
    changeAceMode() {
        // Retrieve 'type' value from the form
        const mode = dialplanApplication.$formObj.form('get value', 'type');
        let NewMode;

        if (mode === 'php') {
            // If 'type' is 'php', set the editor mode to PHP and show line numbers
            NewMode = ace.require('ace/mode/php').Mode;
            dialplanApplication.editor.setOptions({
                showLineNumbers: true,
            });
        } else {
            // If 'type' is not 'php', set the editor mode to Julia and hide line numbers
            NewMode = ace.require('ace/mode/julia').Mode;
            dialplanApplication.editor.setOptions({
                showLineNumbers: false,
            });
        }

        // Set the new mode and theme for the editor
        dialplanApplication.editor.session.setMode(new NewMode());
        dialplanApplication.editor.setTheme('ace/theme/monokai');
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = dialplanApplication.$formObj.form('get values');
        result.data.applicationlogic = dialplanApplication.editor.getValue();
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {

    },
    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = dialplanApplication.$formObj;
        Form.url = `${globalRootUrl}dialplan-applications/save`; // Form submission URL
        Form.validateRules = dialplanApplication.validateRules; // Form validation rules
        Form.cbBeforeSendForm = dialplanApplication.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = dialplanApplication.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

/**
 * Checks if the number is taken by another account
 * @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
 */
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

/**
 *  Initialize Dialplan Application modify form on document ready
 */
$(document).ready(() => {
    dialplanApplication.initialize();
});

