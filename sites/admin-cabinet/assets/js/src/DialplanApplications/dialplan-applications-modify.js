/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global DialplanApplicationsAPI, Form, SecurityUtils, globalTranslate, ExtensionsAPI, ace, UserMessage, FormElements */

/**
 * Dialplan application edit form management module with enhanced security
 */
var dialplanApplicationModify = {
    $formObj: $('#dialplan-application-form'),
    $number: $('#extension'),
    $tabMenuItems: $('#application-code-menu .item'),
    defaultExtension: '',
    editor: null,
    currentActiveTab: 'main', // Track current active tab
    isLoadingData: false, // Flag to prevent button reactivation during data loading

    // Track if this is a new application (not existing in database)
    isNewApplication: false,

    // Track if this is copy mode
    isCopyMode: false,

    /**
     * Form validation rules
     */
    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.da_ValidateNameIsEmpty
                },
                {
                    type: 'maxLength[50]',
                    prompt: globalTranslate.da_ValidateNameTooLong
                }
            ]
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'regExp',
                    value: '/^[0-9#+\\*|X]{1,64}$/',
                    prompt: globalTranslate.da_ValidateExtensionNumber,
                },
                {
                    type: 'empty',
                    prompt: globalTranslate.da_ValidateExtensionIsEmpty,
                },
                {
                    type: 'existRule[extension-error]',
                    prompt: globalTranslate.da_ValidateExtensionDouble,
                }
            ]
        }
    },

    /**
     * Update extension display in ribbon label
     * 
     * @param {string} extension - Extension number
     */
    updateExtensionDisplay: function(extension) {
        var extensionDisplay = $('#extension-display');
        extensionDisplay.text(extension || '');
    },

    /**
     * Initialize the module
     */
    initialize: function() {
        // Enable tab navigation with history support
        dialplanApplicationModify.$tabMenuItems.tab({
            history: true,
            historyType: 'hash',
            onVisible: function(tabPath) {
                // Track current active tab
                dialplanApplicationModify.currentActiveTab = tabPath;
                
                // Resize ACE editor when code tab becomes visible
                if (tabPath === 'code' && dialplanApplicationModify.editor) {
                    setTimeout(() => {
                        dialplanApplicationModify.editor.resize();
                    }, 100);
                }
            }
        });        
        // Extension availability check
        var timeoutId;
        dialplanApplicationModify.$number.on('input', function() {
            if (timeoutId) clearTimeout(timeoutId);
            
            timeoutId = setTimeout(function() {
                var newNumber = dialplanApplicationModify.$formObj.form('get value', 'extension');
                ExtensionsAPI.checkAvailability(dialplanApplicationModify.defaultExtension, newNumber);
            }, 500);
        });
        
        // Configure Form.js for REST API
        Form.$formObj = dialplanApplicationModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = dialplanApplicationModify.validateRules;
        Form.cbBeforeSendForm = dialplanApplicationModify.cbBeforeSendForm;
        Form.cbAfterSendForm = dialplanApplicationModify.cbAfterSendForm;
        
        // REST API v3 integration
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = DialplanApplicationsAPI;
        Form.apiSettings.saveMethod = 'saveRecord'; // Use saveRecord method from PbxApiClient
        
        // Navigation URLs
        Form.afterSubmitIndexUrl = globalRootUrl + 'dialplan-applications/index/';
        Form.afterSubmitModifyUrl = globalRootUrl + 'dialplan-applications/modify/';
        
        Form.initialize();
        
        // Initialize adaptive textarea for description field
        dialplanApplicationModify.initializeAdaptiveTextarea();
        
        // Initialize components
        dialplanApplicationModify.initializeAce();
        dialplanApplicationModify.initializeFullscreenHandlers();
        dialplanApplicationModify.initializeForm();
    },

    /**
     * Initialize adaptive textarea for description field
     */
    initializeAdaptiveTextarea: function() {
        // Set up adaptive resizing for description textarea
        $('textarea[name="description"]').on('input paste keyup', function() {
            FormElements.optimizeTextareaSize($(this));
        });
        
        // Initial resize after form data is loaded
        FormElements.optimizeTextareaSize('textarea[name="description"]');
    },

    /**
     * Load form data via REST API
     */
    initializeForm: function() {
        // Get record ID from URL
        var recordId = dialplanApplicationModify.getRecordId();

        // Check for copy mode from URL parameter or hidden field
        var copyFromId = $('#copy-from-id').val();
        var urlParams = new URLSearchParams(window.location.search);
        var copyParam = urlParams.get('copy');

        // Reset flags
        dialplanApplicationModify.isCopyMode = false;

        if (copyParam || copyFromId) {
            // Copy mode - use the new RESTful copy endpoint
            var sourceId = copyParam || copyFromId;
            dialplanApplicationModify.isCopyMode = true;
            dialplanApplicationModify.isNewApplication = true; // Copy creates a new application

            // Call the copy custom method
            DialplanApplicationsAPI.copy(sourceId, function(response) {
                dialplanApplicationModify.handleApplicationDataResponse(response, ''); // Empty ID for new application
            });
        } else {
            // Determine if this is a new application
            dialplanApplicationModify.isNewApplication = !recordId || recordId === '' || recordId === 'new';

            // Use getRecord method from PbxApiClient
            // It automatically handles new records (calls getDefault) and existing records
            DialplanApplicationsAPI.getRecord(recordId || 'new', function(response) {
                dialplanApplicationModify.handleApplicationDataResponse(response, recordId);
            });
        }
    },

    /**
     * Handle application data response from API
     * @param {object} response - API response
     * @param {string} recordId - Application ID
     * @returns {void}
     */
    handleApplicationDataResponse: function(response, recordId) {
        if (response.result && response.data) {
            // DO NOT change isNewApplication here - it should be set only once in initializeForm()
            // based on HOW the form was opened, not based on server response data

            // Set the _isNew flag for new applications based on the flag we set earlier
            if (dialplanApplicationModify.isNewApplication) {
                response.data._isNew = true;
            }

            // Data is already sanitized in API module
            dialplanApplicationModify.populateForm(response.data);
            dialplanApplicationModify.defaultExtension = response.data.extension;

            // Update extension number display in the ribbon label
            dialplanApplicationModify.updateExtensionDisplay(response.data.extension);

            // Set ACE editor content (applicationlogic is not sanitized)
            var codeContent = response.data.applicationlogic || '';

            // Set flag to prevent reactivating buttons during data load
            dialplanApplicationModify.isLoadingData = true;

            dialplanApplicationModify.editor.getSession().setValue(codeContent);
            dialplanApplicationModify.changeAceMode();

            // Clear loading flag after setting content
            dialplanApplicationModify.isLoadingData = false;

            // Determine which tab to show
            if (dialplanApplicationModify.isNewApplication || dialplanApplicationModify.isCopyMode) {
                // Switch to main tab for new records or copy mode
                if (!window.location.hash) {
                    dialplanApplicationModify.$tabMenuItems.tab('change tab', 'main');
                }
            } else {
                // For existing records, hash history will preserve the tab
                if (!response.data.name && !response.data.extension && !window.location.hash) {
                    dialplanApplicationModify.$tabMenuItems.tab('change tab', 'main');
                }
            }

            // Mark form as changed if in copy mode to enable save button
            if (dialplanApplicationModify.isCopyMode) {
                Form.dataChanged();
            }

            // Auto-resize textarea after data is loaded (with small delay for DOM update)
            setTimeout(function() {
                FormElements.optimizeTextareaSize('textarea[name="description"]');
            }, 100);
        } else if (recordId && recordId !== 'new') {
            var errorMessage = response.messages && response.messages.error ?
                response.messages.error.join(', ') :
                'Failed to load dialplan application data';
            UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
    },
    
    /**
     * Get record ID from URL
     * 
     * @return {string} Record ID
     */
    getRecordId: function() {
        var urlParts = window.location.pathname.split('/');
        var modifyIndex = urlParts.indexOf('modify');
        if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
            return urlParts[modifyIndex + 1];
        }
        return '';
    },
    
    /**
     * Initialize ACE editor with security considerations
     */
    initializeAce: function() {
        var aceHeight = window.innerHeight - 380;
        var rowsCount = Math.round(aceHeight / 16.3);
        
        $(window).on('load', function () {
            $('.application-code').css('min-height', aceHeight + 'px');
        });
        
        dialplanApplicationModify.editor = ace.edit('application-code');
        dialplanApplicationModify.editor.setTheme('ace/theme/monokai');
        dialplanApplicationModify.editor.resize();
        
        // Track changes for Form.js
        dialplanApplicationModify.editor.getSession().on('change', function() {
            // Ignore changes during data loading to prevent reactivating buttons
            if (!dialplanApplicationModify.isLoadingData) {
                Form.dataChanged();
            }
        });
        
        dialplanApplicationModify.editor.setOptions({
            maxLines: rowsCount,
            showPrintMargin: false,
            showLineNumbers: false
        });
        
        // Security: prevent code execution in editor
        dialplanApplicationModify.editor.commands.addCommand({
            name: 'preventCodeExecution',
            bindKey: {win: 'Ctrl-E', mac: 'Command-E'},
            exec: function() {
                console.warn('Code execution prevented for security');
                return false;
            }
        });
    },
    
    /**
     * Initialize fullscreen handlers
     */
    initializeFullscreenHandlers: function() {
        $('.fullscreen-toggle-btn').on('click', function () {
            var container = $(this).siblings('.application-code')[0];
            dialplanApplicationModify.toggleFullScreen(container);
        });

        document.addEventListener('fullscreenchange', dialplanApplicationModify.adjustEditorHeight);
    },

    /**
     * Cleanup event listeners to prevent memory leaks
     */
    cleanup: function() {
        // Remove fullscreen event listener
        document.removeEventListener('fullscreenchange', dialplanApplicationModify.adjustEditorHeight);
        
        // Cleanup other event listeners if needed
        $(window).off('load');
        $('.fullscreen-toggle-btn').off('click');
        $('textarea[name="description"]').off('input paste keyup');
        
        // Cleanup ACE editor
        if (dialplanApplicationModify.editor) {
            dialplanApplicationModify.editor.destroy();
            dialplanApplicationModify.editor = null;
        }
    },
    
    /**
     * Toggle fullscreen mode
     * 
     * @param {HTMLElement} container - Container element
     */
    toggleFullScreen: function(container) {
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(function(err) {
                console.error('Error attempting to enable full-screen mode: ' + err.message);
            });
        } else {
            document.exitFullscreen();
        }
    },

    /**
     * Adjust editor height on fullscreen change
     */
    adjustEditorHeight: function() {
        dialplanApplicationModify.editor.resize();
    },
    
    /**
     * Change ACE editor mode based on type
     */
    changeAceMode: function(value, text, $choice) {
        // Get mode value - can be passed as parameter or from hidden input
        var mode = value || $('#type').val();
        var NewMode;

        if (mode === 'php') {
            NewMode = ace.require('ace/mode/php').Mode;
            dialplanApplicationModify.editor.setOptions({
                showLineNumbers: true
            });
        } else {
            NewMode = ace.require('ace/mode/julia').Mode;
            dialplanApplicationModify.editor.setOptions({
                showLineNumbers: false
            });
        }

        dialplanApplicationModify.editor.session.setMode(new NewMode());
        dialplanApplicationModify.editor.setTheme('ace/theme/monokai');
    },
    
    /**
     * Callback before form submission
     * 
     * @param {object} settings - Form settings
     * @return {object|false} Modified settings or false to cancel
     */
    cbBeforeSendForm: function(settings) {
        var result = settings;
        result.data = dialplanApplicationModify.$formObj.form('get values');
        
        // Add application logic from ACE editor (not sanitized)
        result.data.applicationlogic = dialplanApplicationModify.editor.getValue();
        
        // Pass current active tab for redirect
        result.data.currentTab = dialplanApplicationModify.currentActiveTab;
        
        // Add record ID for updates
        var recordId = dialplanApplicationModify.getRecordId();
        if (recordId && recordId !== '') {
            result.data.id = recordId;
            result.data.uniqid = recordId;
        }
        
        return result;
    },
    
    /**
     * Callback after form submission (no success messages - UI updates only)
     *
     * @param {object} response - Server response
     */
    cbAfterSendForm: function(response) {
        if (response.result) {
            if (response.data) {
                // Data is already sanitized in API module
                dialplanApplicationModify.populateForm(response.data);

                // Update extension number display in the ribbon label
                dialplanApplicationModify.updateExtensionDisplay(response.data.extension);

                // Update ACE editor content
                var codeContent = response.data.applicationlogic || '';
                dialplanApplicationModify.editor.getSession().setValue(codeContent);

                // Handle redirect with tab preservation
                if (response.data.redirectTab && response.data.redirectTab !== 'main') {
                    // Update Form.js redirect URL to include hash
                    var currentId = $('#id').val() || response.data.uniqid;
                    if (currentId) {
                        Form.afterSubmitModifyUrl = globalRootUrl + 'dialplan-applications/modify/' + currentId + '#/' + response.data.redirectTab;
                    }
                }
            }

            // Form.js will handle all redirect logic based on submitMode

            // No success message - just silent update
        }
    },
    
    /**
     * Populate form with sanitized data
     *
     * @param {object} data - Form data
     */
    populateForm: function(data) {
        // Use unified silent population approach
        // Form.populateFormSilently will handle _isNew flag automatically (lines 766-779 in form.js)
        Form.populateFormSilently(data, {
            beforePopulate: (formData) => {
                // Initialize dropdown if not already done
                if (!$('#type-dropdown').length) {
                    DynamicDropdownBuilder.buildDropdown('type', formData, {
                        staticOptions: [
                            { value: 'php', text: globalTranslate.da_TypePhp },
                            { value: 'plaintext', text: globalTranslate.da_TypePlaintext }
                        ],
                        placeholder: globalTranslate.da_SelectType,
                        onChange: dialplanApplicationModify.changeAceMode
                    });
                }
            },
            afterPopulate: (formData) => {
                if (Form.enableDirrity) {
                    Form.initializeDirrity();
                }

                // Auto-resize textarea after data is populated
                FormElements.optimizeTextareaSize('textarea[name="description"]');
            }
        });
    }
};

/**
 * Custom validation rule for extension existence
 */
$.fn.form.settings.rules.existRule = function(value, parameter) { 
    return $('#' + parameter).hasClass('hidden'); 
};

/**
 * Initialize on document ready
 */
$(document).ready(function() {
    dialplanApplicationModify.initialize();
});

