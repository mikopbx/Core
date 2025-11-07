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

/* global globalRootUrl,globalTranslate, ace, Form, FilesAPI, customFilesAPI, PbxApiClient, TooltipBuilder */


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
    $modeDropDown: $('#mode-dropdown'),

    /**
     * jQuery object for the hidden custom mode input.
     * @type {jQuery}
     */
    $modeCustomInput: $('#mode-custom-value'),

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
     * jQuery object for the filepath input field.
     * @type {jQuery}
     */
    $filepathInput: $('#filepath'),

    /**
     * jQuery object for the filepath field container.
     * @type {jQuery}
     */
    $filepathField: $('#filepath-field'),

    /**
     * jQuery object for the tooltip icon in filepath field.
     * @type {jQuery}
     */
    $filepathTooltipIcon: $('#filepath-field .field-info-icon'),

    /**
     * Cached allowed directories from server
     * @type {Array|null}
     */
    allowedDirectories: null,

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
     * Decode base64 string to UTF-8
     * Handles Unicode characters (Russian, Chinese, etc.)
     *
     * @param {string} base64Str - Base64 encoded string
     * @returns {string} UTF-8 decoded string
     */
    base64ToUtf8(base64Str) {
        try {
            // Decode base64 to binary string
            const binaryString = atob(base64Str);

            // Use TextDecoder for modern browsers
            if (typeof TextDecoder !== 'undefined') {
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return new TextDecoder().decode(bytes);
            } else {
                // Fallback for older browsers
                return decodeURIComponent(escape(binaryString));
            }
        } catch(e) {
            console.error('Failed to decode base64:', e);
            return base64Str; // Return as-is if decode fails
        }
    },

    /**
     * Get current mode value (from dropdown or hidden input for custom mode)
     * @returns {string} Current mode value
     */
    getCurrentMode() {
        // Check if custom mode is active (hidden input has value)
        const customModeValue = customFile.$modeCustomInput.val();
        if (customModeValue === 'custom') {
            return 'custom';
        }
        // Otherwise return dropdown value
        return customFile.$formObj.form('get value', 'mode');
    },

    /**
     * Set mode value (using dropdown for standard modes, hidden input for custom mode)
     * @param {string} mode - Mode to set
     */
    setMode(mode) {
        if (mode === 'custom') {
            // Set custom mode via hidden input
            customFile.$modeCustomInput.val('custom');
            // Hide dropdown for custom files
            customFile.$modeDropDown.parent().parent().hide();
        } else {
            // Clear custom mode
            customFile.$modeCustomInput.val('');
            // Set standard mode via dropdown
            customFile.$modeDropDown.dropdown('set selected', mode);
            // Show dropdown
            customFile.$modeDropDown.parent().parent().show();
        }
    },

    /**
     * Updates the filepath field state based on whether the file is user-created (MODE_CUSTOM) or system-managed.
     * User-created files have editable filepath but cannot be created (only for new files),
     * system-managed files have read-only filepath.
     */
    updateFilepathFieldState() {
        const mode = customFile.getCurrentMode();
        const isUserCreated = mode === 'custom';
        const fileId = customFile.$formObj.form('get value', 'id');

        if (isUserCreated) {
            if (!fileId || fileId === '') {
                // New custom file - filepath is editable
                customFile.$filepathInput.prop('readonly', false);
                customFile.$filepathField.removeClass('disabled');
            } else {
                // Existing custom file - filepath is read-only (cannot be changed after creation)
                customFile.$filepathInput.prop('readonly', true);
                customFile.$filepathField.addClass('disabled');
            }
            // Always hide mode selector for custom files
            customFile.$modeDropDown.parent().parent().hide();
        } else {
            // System-managed file - filepath is always read-only
            customFile.$filepathInput.prop('readonly', true);
            customFile.$filepathField.addClass('disabled');
            // Show mode selector for system files
            customFile.$modeDropDown.parent().parent().show();
        }

        // Update tooltip visibility based on mode
        customFile.updateTooltipVisibility();
    },

    /**
     * Update tooltip icon visibility based on current mode
     * Tooltip is only shown for MODE_CUSTOM files
     */
    updateTooltipVisibility() {
        const mode = customFile.getCurrentMode();
        const isCustomMode = mode === 'custom';

        if (isCustomMode) {
            customFile.$filepathTooltipIcon.show();
        } else {
            customFile.$filepathTooltipIcon.hide();
        }
    },

    /**
     * Initialize tooltips for form fields
     * Loads allowed directories from server and sets up tooltip content
     */
    initializeTooltips() {
        // Initialize jQuery object after DOM is ready
        customFile.$filepathTooltipIcon = $('#filepath-field .field-info-icon');

        // Fetch allowed directories from server
        $.ajax({
            url: `${globalRootUrl}custom-files/getAllowedDirectories`,
            type: 'GET',
            dataType: 'json',
            success(response) {
                if (response.success && response.data) {
                    customFile.allowedDirectories = response.data;

                    // Build tooltip configuration
                    const tooltipConfigs = {
                        filepath: TooltipBuilder.buildContent({
                            header: globalTranslate.cf_filepath_tooltip_header || 'Allowed directories',
                            description: globalTranslate.cf_filepath_tooltip_desc || 'For MODE_CUSTOM files, you can only create files in the following directories:',
                            list: customFile.allowedDirectories.map(dir => `<code>${dir}</code>`),
                            note: globalTranslate.cf_filepath_tooltip_autocreate || 'Subdirectories are created automatically if specified in the file path. For example: /etc/custom-configs/myapp/config.ini'
                        })
                    };

                    // Initialize tooltips using TooltipBuilder
                    TooltipBuilder.initialize(tooltipConfigs);

                    // Update visibility based on current mode
                    customFile.updateTooltipVisibility();
                } else {
                    console.error('Failed to load allowed directories');
                }
            },
            error(xhr, status, error) {
                console.error('Error loading allowed directories:', error);
            }
        });
    },

    /**
     * Initializes the customFile module.
     * Sets up the dropdown, initializes Ace editor, form, and retrieves file content from the server.
     */
    initialize() {

        // Initialize jQuery objects after DOM is ready
        customFile.$filepathInput = $('#filepath');
        customFile.$filepathField = $('#filepath-field');
        customFile.$modeDropDown = $('#mode-dropdown');
        customFile.$modeCustomInput = $('#mode-custom-value');
        customFile.$filepathTooltipIcon = $('#filepath-field .field-info-icon');

        // Enable tab navigation with history support
        customFile.$tabMenu.tab({
            onVisible: customFile.onChangeTab
        });

        customFile.$mainContainer.removeClass('container');

        // Initialize Ace editor
        customFile.initializeAce();

        // Initialize tooltips
        customFile.initializeTooltips();

        // Initialize or reinitialize dropdown
        if (customFile.$modeDropDown.length > 0) {
            customFile.$modeDropDown.dropdown({
                onChange: customFile.cbOnChangeMode
            });
        }

        // Get file ID from URL or form
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = window.location.pathname.match(/modify\/(\d+)/);
        const fileId = urlId ? urlId[1] : customFile.$formObj.form('get value', 'id');

        if (!fileId || fileId === '') {
            // Load default values for new custom file
            customFilesAPI.getDefault((response) => {
                if (response.result && response.data) {
                    // Store mode separately to handle it correctly
                    const mode = response.data.mode || 'none';

                    // Remove mode from response before setting form values
                    const formData = {...response.data};
                    delete formData.mode;  // Don't let form('set values') handle mode

                    // Set default values to form fields (without mode)
                    customFile.$formObj.form('set values', formData);

                    // For new files with MODE_CUSTOM
                    if (mode === 'custom') {
                        // Make filepath editable for new custom files
                        customFile.$filepathInput.prop('readonly', false);
                        customFile.$filepathField.removeClass('disabled');

                        // Set mode to 'custom' using hidden input
                        customFile.setMode('custom');

                        // Show tooltip icon for MODE_CUSTOM
                        customFile.updateTooltipVisibility();

                        // Show only editor tab for custom mode
                        customFile.$tabMenu.tab('change tab', 'editor');
                        customFile.$editorTab.show();
                        customFile.$originalTab.hide();
                        customFile.$resultTab.hide();

                        // Hide other tab menu items
                        $('.item[data-tab="original"]').hide();
                        $('.item[data-tab="result"]').hide();

                        // Initialize empty content in editor for new custom files
                        if (response.data.content) {
                            // If default content provided (base64), decode it with UTF-8 support
                            const decodedContent = customFile.base64ToUtf8(response.data.content);
                            customFile.editor.setValue(decodedContent);
                        } else {
                            // Set empty content for new custom file
                            customFile.editor.setValue('');
                        }
                        customFile.editor.clearSelection();
                    } else {
                        // For other modes, use standard behavior (mode already extracted above)
                        customFile.setMode(mode);
                        customFile.cbOnChangeMode(mode);
                        customFile.updateFilepathFieldState();
                    }
                }
            });
        } else {
            // Load existing file data via REST API
            customFilesAPI.getRecord(fileId, (response) => {
                if (response.result && response.data) {
                    // Store base64 content separately and remove from form data
                    const base64Content = response.data.content;

                    // Store mode separately to handle it correctly
                    const mode = response.data.mode || 'none';

                    // Remove content and mode from response before setting form values
                    // (content will be taken from ACE editor on save, mode will be set separately)
                    const formData = {...response.data};
                    delete formData.content;
                    delete formData.mode;  // Don't let form('set values') handle mode

                    // Set form values from API response (without content and mode)
                    customFile.$formObj.form('set values', formData);

                    // Decode base64 content and set in editor with UTF-8 support
                    if (base64Content) {
                        const decodedContent = customFile.base64ToUtf8(base64Content);
                        customFile.editor.setValue(decodedContent);
                        customFile.editor.clearSelection();
                    }

                    // Set mode and trigger UI update (mode already extracted above)
                    if (mode === 'custom') {
                        // For existing custom files - filepath is read-only
                        customFile.$filepathInput.prop('readonly', true);
                        customFile.$filepathField.addClass('disabled');

                        // Set mode to 'custom' using hidden input
                        customFile.setMode('custom');

                        // Show tooltip icon for MODE_CUSTOM (even for read-only files)
                        customFile.updateTooltipVisibility();

                        // Show only editor tab for custom mode
                        customFile.$tabMenu.tab('change tab', 'editor');
                        customFile.$editorTab.show();
                        customFile.$originalTab.hide();
                        customFile.$resultTab.hide();

                        // Hide other tab menu items
                        $('.item[data-tab="original"]').hide();
                        $('.item[data-tab="result"]').hide();
                    } else {
                        // For system files - use standard behavior
                        customFile.setMode(mode);
                        customFile.cbOnChangeMode(mode);
                        customFile.updateFilepathFieldState();
                    }
                } else {
                    // If loading fails, redirect to index
                    window.location = `${globalRootUrl}custom-files/index`;
                }
            });
        }

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
                // Load original file content into editor if it's empty
                customFile.loadOriginalContentForOverride();
                break;
            case 'custom':  // Custom mode behaves like override
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

        // Update tooltip visibility when mode changes
        customFile.updateTooltipVisibility();
    },

    /**
     * Event handler for tab changes.
     *
     * @param {string} currentTab - The current tab that is visible.
     */
    onChangeTab(currentTab){
        const filePath = customFile.$formObj.form('get value', 'filepath');
        switch (currentTab) {
            case 'result':
                $('.tab[data-tab="result"]').addClass('loading');
                FilesAPI.getFileContent(filePath, customFile.cbGetResultFileContentFromServer, false);
                break;
            case 'original':
                $('.tab[data-tab="original"]').addClass('loading');
                FilesAPI.getFileContent(filePath, customFile.cbGetOriginalFileContentFromServer, true);
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
        // Retrieve 'mode' value (from dropdown or hidden input for custom mode)
        const mode = customFile.getCurrentMode();

        // Get current content from editor (not from form, as form doesn't have it anymore)
        let content = customFile.editor.getValue();

        // Get tab menu items
        const $originalTabMenuItem = $('.item[data-tab="original"]');
        const $resultTabMenuItem = $('.item[data-tab="result"]');

        // Handle code visibility and content based on the 'mode'
        switch (mode) {
            case 'none':
                // If 'mode' is 'none', show only result code generated and hide editor and result viewer
                customFile.$editorTab.hide();
                customFile.$originalTab.show();
                customFile.viewerOriginal.navigateFileStart();
                customFile.$resultTab.hide();
                // Show/hide menu items
                $originalTabMenuItem.show();
                $resultTabMenuItem.hide();
                break;
            case 'append':
                // If 'mode' is 'append', show all fields
                customFile.$editorTab.show();
                customFile.$originalTab.show();
                customFile.$resultTab.show();
                customFile.viewerOriginal.navigateFileEnd();
                customFile.viewerResult.navigateFileEnd();
                // Show all menu items
                $originalTabMenuItem.show();
                $resultTabMenuItem.show();
                break;
            case 'override':
                // If 'mode' is 'override', show editor and hide original, but show result
                customFile.$editorTab.show();
                customFile.$originalTab.hide();
                customFile.$resultTab.hide();
                // Show/hide menu items
                $originalTabMenuItem.hide();
                $resultTabMenuItem.hide();
                break;
            case 'custom':
                // For 'custom' mode, only show editor tab - user fully controls the file
                customFile.$editorTab.show();
                customFile.$originalTab.hide();
                customFile.$resultTab.hide();
                // Hide other tab menu items for custom files
                $originalTabMenuItem.hide();
                $resultTabMenuItem.hide();
                break;
            case 'script':
                // If 'mode' is 'script', show both server and custom code, apply custom script to the file content on server
                customFile.$editorTab.show();
                customFile.$originalTab.show();
                customFile.$resultTab.show();
                // Show all menu items for script mode
                $originalTabMenuItem.show();
                $resultTabMenuItem.show();
                // Editor - only set template if content is empty
                if (!content || content.trim() === '') {
                    content = `#!/bin/bash \n\n`;
                    content += `configPath="$1" # Path to the original config file\n\n`;
                    content += `# Example 1: Replace all values max_contacts = 5 to max_contacts = 1 on pjsip.conf\n`;
                    content += `# sed -i 's/max_contacts = 5/max_contacts = 1/g' "$configPath"\n\n`

                    content += `# Example 2: Change value max_contacts only for peer with extension 226 on pjsip.conf\n`;
                    content += `# sed -i '/^\\[226\\]$/,/^\\[/ s/max_contacts = 5/max_contacts = 2/' "$configPath"\n\n`

                    content += `# Example 3: Add en extra string into [playback-exit] section after the "same => n,Hangup()" string on extensions.conf\n`;
                    content += `# sed -i '/^\\[playback-exit\\]$/,/^\\[/ s/^\\(\\s*same => n,Hangup()\\)/\\1\\n\\tsame => n,NoOp("Your NoOp comment here")/' "$configPath"\n\n`;

                    content += `# Attention! You will see changes after the background worker processes the script or after rebooting the system. \n`;

                    // Only set content if we created a template
                    customFile.editor.setValue(content);
                    customFile.editor.clearSelection();
                }

                break;
            default:
                // Handle any other 'mode' values
                break;
        }

        customFile.viewerOriginal.setTheme('ace/theme/monokai');
        customFile.editor.setTheme('ace/theme/monokai');

        // Don't overwrite editor content here - it's already set correctly
        // customFile.editor.setValue(content);
        // customFile.editor.clearSelection();
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
     * Load original file content into editor when switching to override mode.
     * Only loads if editor is empty to avoid overwriting user's work.
     * Reuses already loaded content from viewerOriginal if available.
     */
    loadOriginalContentForOverride() {
        // Only load if editor is empty
        const currentContent = customFile.editor.getValue();
        if (!currentContent || currentContent.trim() === '') {
            // First, try to get content from viewerOriginal if it's already loaded
            const originalContent = customFile.viewerOriginal.getValue();

            if (originalContent && originalContent.trim() !== '') {
                // Reuse already loaded content from viewer
                customFile.editor.setValue(originalContent);
                customFile.editor.clearSelection();
                customFile.editor.navigateFileStart();
            } else {
                // Content not yet loaded - fetch from server
                const filePath = customFile.$formObj.form('get value', 'filepath');
                if (filePath) {
                    // Show loading indicator
                    customFile.$editorTab.addClass('loading');

                    // Load original file content from server
                    FilesAPI.getFileContent(filePath, (response) => {
                        if (response.data.content !== undefined) {
                            // Set original content in editor
                            customFile.editor.setValue(response.data.content);
                            customFile.editor.clearSelection();
                            // Move cursor to start
                            customFile.editor.navigateFileStart();
                        }
                        // Remove loading indicator
                        customFile.$editorTab.removeClass('loading');
                    }, true);
                }
            }
        }
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

        //  Add handlers for fullscreen mode buttons
        $('.fullscreen-toggle-btn').on('click', function () {
            const container = $(this).siblings('.application-code')[0];
            customFile.toggleFullScreen(container);
        });

        // Add handler to recalculate sizes when exiting fullscreen mode
        document.addEventListener('fullscreenchange', customFile.adjustEditorHeight);

    },
    /**
     * Enable/disable fullscreen mode for a specific block.
     *
     * @param {HTMLElement} container - The container to expand to fullscreen.
     */
    toggleFullScreen(container) {
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    },

    /**
     * Recalculate editor heights when the screen mode changes.
     */
    adjustEditorHeight() {
        const editors = [customFile.viewerOriginal, customFile.viewerResult, customFile.editor];
        editors.forEach(editor => {
            if (editor) {
                editor.resize();
            }
        });
    },
    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;

        // IMPORTANT: Get mode BEFORE form('get values') to prevent dropdown from overriding it
        const mode = customFile.getCurrentMode();

        // Get all form values
        result.data = customFile.$formObj.form('get values');

        // Override mode with the correct value (from getCurrentMode)
        result.data.mode = mode;

        // Remove technical field from data
        delete result.data['mode-custom-value'];

        // Get content from Ace editor based on mode
        switch (mode) {
            case 'append':
            case 'override':
            case 'custom':
            case 'script':
                // Get content from Ace editor (not base64 encoded yet)
                if (!customFile.editor) {
                    console.error('Editor is not initialized!');
                    result.data.content = '';
                } else {
                    const editorContent = customFile.editor.getValue();
                    result.data.content = editorContent;
                }
                break;
            case 'none':
            default:
                // For 'none' mode, clear the content
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

        // Configure REST API settings for Form
        Form.apiSettings = {
            enabled: true,
            apiObject: customFilesAPI,
            saveMethod: 'save',  // Will use the smart save method that determines create/update
            autoDetectMethod: false,  // We handle this in our save method
            idField: 'id'
        };

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

