/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global DialplanApplicationsAPI, Form, SecurityUtils, globalTranslate, Extensions, ace, UserMessage */

/**
 * Dialplan application edit form management module with enhanced security
 */
var dialplanApplicationModify = {
    $formObj: $('#dialplan-application-form'),
    $number: $('#extension'),
    $typeSelectDropDown: $('#dialplan-application-form .type-select'),
    $tabMenuItems: $('#application-code-menu .item'),
    defaultExtension: '',
    editor: null,
    currentActiveTab: 'main', // Track current active tab
    isLoadingData: false, // Flag to prevent button reactivation during data loading
    
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
                    prompt: globalTranslate.da_ValidateNameTooLong || 'Name is too long (max 50 characters)'
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
        dialplanApplicationModify.$typeSelectDropDown.dropdown({
            onChange: dialplanApplicationModify.changeAceMode
        });
        
        // Extension availability check
        var timeoutId;
        dialplanApplicationModify.$number.on('input', function() {
            if (timeoutId) clearTimeout(timeoutId);
            
            timeoutId = setTimeout(function() {
                var newNumber = dialplanApplicationModify.$formObj.form('get value', 'extension');
                Extensions.checkAvailability(dialplanApplicationModify.defaultExtension, newNumber);
            }, 500);
        });
        
        // Configure Form.js for REST API
        Form.$formObj = dialplanApplicationModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = dialplanApplicationModify.validateRules;
        Form.cbBeforeSendForm = dialplanApplicationModify.cbBeforeSendForm;
        Form.cbAfterSendForm = dialplanApplicationModify.cbAfterSendForm;
        
        // REST API integration
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = DialplanApplicationsAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
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
        var recordId = dialplanApplicationModify.getRecordId();
        
        DialplanApplicationsAPI.getRecord(recordId, function(response) {
            if (response.result) {
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
                
                // Switch to main tab only for completely new records (no name and no extension)
                // Hash history will preserve the tab for existing records
                if (!response.data.name && !response.data.extension && !window.location.hash) {
                    dialplanApplicationModify.$tabMenuItems.tab('change tab', 'main');
                }
                
                // Auto-resize textarea after data is loaded (with small delay for DOM update)
                setTimeout(function() {
                    FormElements.optimizeTextareaSize('textarea[name="description"]');
                }, 100);
            } else {
                var errorMessage = response.messages && response.messages.error ? 
                    response.messages.error.join(', ') : 
                    'Failed to load dialplan application data';
                UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
            }
        });
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
    changeAceMode: function() {
        var mode = dialplanApplicationModify.$formObj.form('get value', 'type');
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
        
        // Additional client-side validation
        if (!DialplanApplicationsAPI.validateApplicationData(result.data)) {
            UserMessage.showError('Validation failed');
            return false;
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
            
            // Update URL for new records 
            var currentId = $('#id').val();
            if (!currentId && response.data && response.data.uniqid) {
                var hash = response.data.redirectTab && response.data.redirectTab !== 'main' ? '#/' + response.data.redirectTab : '';
                var newUrl = window.location.href.replace(/modify\/?$/, 'modify/' + response.data.uniqid) + hash;
                window.history.pushState(null, '', newUrl);
            }
            
            // No success message - just silent update
        }
    },
    
    /**
     * Populate form with sanitized data
     * 
     * @param {object} data - Form data
     */
    populateForm: function(data) {
        Form.$formObj.form('set values', data);
        if (Form.enableDirrity) {
            Form.initializeDirrity();
        }
        
        // Auto-resize textarea after data is populated
        FormElements.optimizeTextareaSize('textarea[name="description"]');
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

