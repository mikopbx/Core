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
     * jQuery object for the tab menu.
     * @type {jQuery}
     */
    $tabMenu: $('#custom-files-menu .item'),

    /**
     * jQuery object for the mode select.
     * @type {jQuery}
     */
    $modeDropDown: $('#custom-file-form .mode-select'),

    /**
     * jQuery object for the tab with original file content.
     * @type {jQuery}
     */
    $originalTab: $('a[data-tab="original"]'),

    /**
     * jQuery object for the tab with user content/script editor.
     * @type {jQuery}
     */
    $editorTab: $('a[data-tab="editor"]'),

    /**
     * jQuery object for the tab with resulted file content.
     * @type {jQuery}
     */
    $resultTab: $('a[data-tab="result"]'),

    /**
     * jQuery element for the main content container.
     * @type {jQuery}
     */
    $mainContainer: $('#main-content-container'),


    /**
     * Ace editor instances
     * `editor` is for input and `viewers` is for display code from server
     */
    editor: '',
    viewerOriginal: '',
    viewerResult: '',

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

        // Enable tab navigation with history support
        customFile.$tabMenu.tab({
            onVisible: customFile.onChangeTab
        });

        customFile.$mainContainer.removeClass('container');

        // Initialize Ace editor
        customFile.initializeAce();

        customFile.$modeDropDown.dropdown({
            onChange: customFile.cbOnChangeMode
        });
        const mode = customFile.$formObj.form('get value', 'mode');
        customFile.cbOnChangeMode(mode);

        // Initialize form
        customFile.initializeForm();

    },

    /**
     * Callback for when the code mode changes.
     *
     * @param {string} value - The selected value from the dropdown.
     * @param {string} text - The selected text from the dropdown.
     */
    cbOnChangeMode(value, text){
        // Handle code visibility and content based on the 'mode'
        switch (value) {
            case 'none':
                customFile.$tabMenu.tab('change tab','original');
                break;
            case 'override':
                customFile.$tabMenu.tab('change tab','editor');
                break;
            case 'append':
                customFile.$tabMenu.tab('change tab','editor');
                break;
            case 'script':
                customFile.$tabMenu.tab('change tab','editor');
                break;
            default:
                customFile.$tabMenu.tab('change tab','original');
        }
        customFile.hideShowCode();
    },

    /**
     * Event handler for tab changes.
     *
     * @param {string} currentTab - The current tab that is visible.
     */
    onChangeTab(currentTab){
        const filePath = customFile.$formObj.form('get value', 'filepath');
        const data = {filename: filePath, needOriginal: true, needLogfile: false};
        switch (currentTab) {
            case 'result':
                data.needOriginal=false;
                $('.tab[data-tab="result"]').addClass('loading');
                PbxApi.GetFileContent(data, customFile.cbGetResultFileContentFromServer);
                break;
            case 'original':
                data.needOriginal=true;
                $('.tab[data-tab="original"]').addClass('loading');
                PbxApi.GetFileContent(data, customFile.cbGetOriginalFileContentFromServer);
                break;
            case 'editor':
                break;
        }
    },

    /**
     * Handles the visibility and content of code based on the 'mode' form value.
     * Adjusts the Ace editor settings accordingly.
     */
    hideShowCode() {
        // Retrieve 'mode' value from the form
        const mode = customFile.$formObj.form('get value', 'mode');
        let content = customFile.$formObj.form('get value', 'content');

        // Handle code visibility and content based on the 'mode'
        switch (mode) {
            case 'none':
                // If 'mode' is 'none', show only result code generated and hide editor and result viewer
                customFile.$editorTab.hide();
                customFile.$originalTab.show();
                customFile.viewerOriginal.navigateFileStart();
                customFile.$resultTab.hide();
                break;
            case 'append':
                // If 'mode' is 'append', show all fields
                customFile.$editorTab.show();
                customFile.$originalTab.show();
                customFile.$resultTab.show();
                customFile.viewerOriginal.navigateFileEnd();
                customFile.viewerResult.navigateFileEnd();
                break;
            case 'override':
                // If 'mode' is 'override', show custom content and hide server content, replace server file content with custom content
                customFile.$editorTab.show();
                customFile.$originalTab.hide();
                customFile.$resultTab.hide();
                break;
            case 'script':
                // If 'mode' is 'script', show both server and custom code, apply custom script to the file content on server
                customFile.$editorTab.show();
                customFile.$originalTab.show();
                customFile.$resultTab.show();
                // Editor
                if (!content.includes('#!/bin/bash')) {
                    content = `#!/bin/bash \n\n`;
                    content += `configPath="$1" # Path to the original config file\n\n`;
                    content += `# Example 1: Replace all values max_contacts = 5 to max_contacts = 1 on pjsip.conf\n`;
                    content += `# sed -i 's/max_contacts = 5/max_contacts = 1/g' "$configPath"\n\n`

                    content += `# Example 2: Change value max_contacts only for peer with extension 226 on pjsip.conf\n`;
                    content += `# sed -i '/^\\[226\\]$/,/^\\[/ s/max_contacts = 5/max_contacts = 2/' "$configPath"\n\n`

                    content += `# Example 3: Add en extra string into [playback-exit] section after the "same => n,Hangup()" string on extensions.conf\n`;
                    content += `# sed -i '/^\\[playback-exit\\]$/,/^\\[/ s/^\\(\\s*same => n,Hangup()\\)/\\1\\n\\tsame => n,NoOp("Your NoOp comment here")/' "$configPath"\n\n`;

                    content += `# Attention! You will see changes after the background worker processes the script or after rebooting the system. \n`;
                }
                customFile.editor.setValue(content);

                break;
            default:
                // Handle any other 'mode' values
                break;
        }

        customFile.viewerOriginal.setTheme('ace/theme/monokai');
        customFile.editor.setTheme('ace/theme/monokai');
        customFile.editor.setValue(content);
        customFile.editor.clearSelection();
    },

    /**
     * Callback function that handles the response from the server containing the file's content.
     * It will update the 'viewerOriginal' with the file's content and adjust the code display.
     */
    cbGetOriginalFileContentFromServer(response) {
        if (response.data.content !== undefined) {
            const aceViewer = customFile.viewerOriginal;
            const scrollTop = aceViewer.session.getScrollTop();
            aceViewer.session.setValue(response.data.content);
            aceViewer.session.setScrollTop(scrollTop);
        }
        $('.tab[data-tab="original"]').removeClass('loading');
    },

    /**
     * Callback function that handles the response from the server containing the file's content.
     * It will update the 'viewerResult' with the file's content and adjust the code display.
     */
    cbGetResultFileContentFromServer(response) {
        if (response.data.content !== undefined) {
            const aceViewer = customFile.viewerResult;
            const scrollTop = aceViewer.session.getScrollTop();
            aceViewer.session.setValue(response.data.content);
            aceViewer.session.setScrollTop(scrollTop);
        }
        $('.tab[data-tab="result"]').removeClass('loading');
    },

    /**
     * Initializes Ace editor instances for 'editor' and 'viewers' windows.
     */
    initializeAce() {
        // Calculate ace editor height and rows count
        const aceHeight = window.innerHeight - 475;
        const rowsCount = Math.round(aceHeight / 16.3);

        // Set minimum height for the code sections on window load
        $('.application-code').css('min-height', `${aceHeight}px`);

        // ACE window for the original file content.
        const IniMode = ace.require('ace/mode/julia').Mode;
        customFile.viewerOriginal = ace.edit('config-file-original');
        customFile.viewerOriginal.session.setMode(new IniMode());
        customFile.viewerOriginal.setTheme('ace/theme/monokai');
        customFile.viewerOriginal.setOptions({
            showPrintMargin: false,
            readOnly: true,
            minLines: rowsCount
        });

        // ACE window for the resulted file content.
        customFile.viewerResult = ace.edit('config-file-result');
        customFile.viewerResult.session.setMode(new IniMode());
        customFile.viewerResult.setTheme('ace/theme/monokai');
        customFile.viewerResult.setOptions({
            showPrintMargin: false,
            readOnly: true,
            minLines: rowsCount
        });


        // ACE window for the user editor.
        customFile.editor = ace.edit('user-edit-config');
        customFile.editor.session.setMode(new IniMode());
        customFile.editor.setTheme('ace/theme/monokai');
        customFile.editor.setOptions({
            showPrintMargin: false,
            minLines: rowsCount,
        });
        customFile.editor.session.on('change', () => {
            // Trigger change event to acknowledge the modification
            Form.dataChanged();
        });
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
            case 'script':
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

