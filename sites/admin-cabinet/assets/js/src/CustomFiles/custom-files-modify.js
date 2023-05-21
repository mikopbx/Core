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

/* global globalRootUrl,globalTranslate, ace, Form, PbxApi */


/**
 * Module customFile
 * This module manages file interactions in a UI, such as loading file content from a server and handling user input.
 * @module customFile
 */
const customFile = {

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#custom-file-form'),

    /**
     * jQuery objects
     * This section defines references to DOM elements that the module interacts with.
     */
    $typeSelectDropDown: $('#custom-file-form .type-select'),
    $appCode: $('#application-code'),
    $appCodeFromServer: $('#application-code-readonly'),

    /**
     * Dirty check field, for checking if something on the form was changed
     * @type {jQuery}
     */
    $dirrtyField: $('#dirrty'),

    /**
     * Ace editor instances
     * `editor` is for input and `viewer` is for display, and they are initialized in `initializeAce`.
     */
    editor: '',
    viewer: '',

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        name: {
            identifier: 'filepath',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.cf_ValidateNameIsEmpty,
                },
            ],
        },
    },

    /**
     * Initializes the customFile module.
     * Sets up the dropdown, initializes Ace editor, form, and retrieves file content from the server.
     */
    initialize() {
        customFile.$typeSelectDropDown.dropdown({
            onChange() {
                // Hide or show code depending on the file type
                customFile.hideShowCode();

                // Get the content of the file from the server
                customFile.getFileContentFromServer();
            },
        });

        // Initialize Ace editor
        customFile.initializeAce();

        // Initialize form
        customFile.initializeForm();

        // Get the content of the file from the server
        customFile.getFileContentFromServer();
    },

    /**
     * Handles the visibility and content of code based on the 'mode' form value.
     * Adjusts the Ace editor settings accordingly.
     */
    hideShowCode() {
        // Calculate ace editor height and rows count
        const aceHeight = window.innerHeight - 475;
        const rowsCount = Math.round(aceHeight / 16.3);

        // Set minimum height for the code sections on window load
        $(window).load(function () {
            $('.application-code-readonly').css('min-height', `${aceHeight}px`);
            $('.application-code').css('min-height', `${aceHeight}px`);
        });

        // Retrieve 'mode' value from the form
        const mode = customFile.$formObj.form('get value', 'mode');

        // Handle code visibility and content based on the 'mode'
        switch (mode) {
            case 'none':
                // If 'mode' is 'none', show server code and hide custom code
                customFile.viewer.navigateFileStart();
                customFile.$appCodeFromServer.show();
                customFile.$appCode.hide();
                customFile.viewer.setOptions({
                    maxLines: rowsCount,
                });
                customFile.viewer.resize()
                break;
            case 'append':
                // If 'mode' is 'append', show both server and custom code, append custom code to server code
                customFile.$appCodeFromServer.show();
                customFile.viewer.navigateFileEnd();
                customFile.editor.setValue(customFile.$formObj.form('get value', 'content'));
                customFile.$appCode.show();
                customFile.editor.getSession().on('change', () => {

                    // Change the value of '$dirrtyField' to trigger
                    // the 'change' form event and enable submit button.
                    customFile.$dirrtyField.val(Math.random());
                    customFile.$dirrtyField.trigger('change');
                });
                break;
            case 'override':
                // If 'mode' is 'override', show custom code and hide server code, replace server code with custom code
                customFile.editor.navigateFileStart();
                customFile.$appCodeFromServer.hide();
                const changedContent = customFile.$formObj.form('get value', 'content');
                if (changedContent.length > 0) {
                    customFile.editor.getSession().setValue(changedContent);
                } else {
                    customFile.editor.getSession().setValue(customFile.viewer.getValue());
                }
                customFile.$appCode.show();
                customFile.editor.setOptions({
                    maxLines: rowsCount,
                });
                customFile.editor.resize()
                customFile.editor.getSession().on('change', () => {

                    // Change the value of '$dirrtyField' to trigger
                    // the 'change' form event and enable submit button.
                    customFile.$dirrtyField.val(Math.random());
                    customFile.$dirrtyField.trigger('change');
                });
                break;
            default:
                // Handle any other 'mode' values
                break;
        }
    },

    /**
     * Callback function that handles the response from the server containing the file's content.
     * It will update the 'viewer' with the file's content and adjust the code display.
     */
    cbGetFileContentFromServer(response) {
        if (response !== undefined) {
            customFile.viewer.getSession().setValue(response.data.content);
            customFile.hideShowCode();
        }
    },

    /**
     * Fetches file content from the server based on the file path and mode of operation.
     */
    getFileContentFromServer() {
        const filePath = customFile.$formObj.form('get value', 'filepath');
        const mode = customFile.$formObj.form('get value', 'mode') !== 'override';
        const data = {filename: filePath, needOriginal: mode, needLogfile: false};
        PbxApi.GetFileContent(data, customFile.cbGetFileContentFromServer);
    },

    /**
     * Initializes Ace editor instances for both 'editor' and 'viewer'.
     */
    initializeAce() {
        const IniMode = ace.require('ace/mode/julia').Mode;
        customFile.viewer = ace.edit('application-code-readonly');
        customFile.viewer.session.setMode(new IniMode());
        customFile.viewer.setTheme('ace/theme/monokai');
        customFile.viewer.setOptions({
            showPrintMargin: false,
            readOnly: true
        });
        customFile.viewer.resize();

        customFile.editor = ace.edit('application-code');
        customFile.editor.setTheme('ace/theme/monokai');
        customFile.editor.session.setMode(new IniMode());
        customFile.editor.setOptions({
            showPrintMargin: false,
        });
        customFile.editor.resize();
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = customFile.$formObj.form('get values');
        switch (customFile.$formObj.form('get value', 'mode')) {
            case 'append':
            case 'override':
                result.data.content = customFile.editor.getValue();
                break;
            default:
                result.data.content = '';
        }
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
        Form.$formObj = customFile.$formObj;
        Form.url = `${globalRootUrl}custom-files/save`; // Form submission URL
        Form.validateRules = customFile.validateRules; // Form validation rules
        Form.cbBeforeSendForm = customFile.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = customFile.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

// Initialize the custom files modify form when the document is ready.
$(document).ready(() => {
    customFile.initialize();
});

