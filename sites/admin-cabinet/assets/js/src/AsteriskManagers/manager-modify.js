/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, AsteriskManagersAPI, UserMessage, FormElements, PasswordWidget, DynamicDropdownBuilder */

/**
 * Manager module using REST API v2.
 * @module manager
 */
const manager = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#save-ami-form'),

    /**
     * jQuery objects for dropdown elements.
     * @type {jQuery}
     */
    $dropDowns: $('#save-ami-form .ui.dropdown'),

    /**
     * jQuery objects for all checkbox elements.
     * @type {jQuery}
     */
    $allCheckBoxes: null,

    /**
     * jQuery object for the uncheck button.
     * @type {jQuery}
     */
    $unCheckButton: null,

    /**
     * jQuery object for the check all button.
     * @type {jQuery}
     */
    $checkAllButton: null,

    /**
     * jQuery object for the username input field.
     * @type {jQuery}
     */
    $username: $('#username'),

    /**
     * jQuery object for the secret input field.
     * @type {jQuery}
     */
    $secret: null,

    /**
     * Original username value.
     * @type {string}
     */
    originalName: '',

    /**
     * Manager ID.
     * @type {string}
     */
    managerId: '',

    /**
     * Manager data from API.
     * @type {Object}
     */
    managerData: null,

    /**
     * Password widget instance.
     * @type {Object}
     */
    passwordWidget: null,

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        username: {
            identifier: 'username',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.am_ValidationAMINameIsEmpty,
                },
                {
                    type: 'existRule[username-error]',
                    prompt: globalTranslate.am_ErrorThisUsernameInNotAvailable,
                },
            ],
        },
        secret: {
            identifier: 'secret',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.am_ValidationAMISecretIsEmpty,
                },
            ],
        },
    },

    /**
     * Initializes the manager module.
     */
    initialize() {
        // Initialize jQuery selectors that need DOM to be ready
        manager.$secret = $('#secret');
        manager.$unCheckButton = $('.uncheck.button');
        manager.$checkAllButton = $('.check-all.button');
        manager.$allCheckBoxes = $('#save-ami-form .checkbox');
        
        // Initialize Form first to enable form methods
        manager.initializeForm();
        
        // Get manager ID from URL or form
        const urlParts = window.location.pathname.split('/');
        const lastSegment = urlParts[urlParts.length - 1] || '';
        
        // Check if the last segment is 'modify' (new record) or an actual ID
        if (lastSegment === 'modify' || lastSegment === '') {
            manager.managerId = '';
        } else {
            manager.managerId = lastSegment;
        }

        // Check if this is a copy operation
        const urlParams = new URLSearchParams(window.location.search);
        const copySourceId = urlParams.get('copy-source');

        // Initialize API
        AsteriskManagersAPI.initialize();

        // Handle copy operation
        if (copySourceId) {
            // Load source manager data for copying
            manager.loadManagerDataForCopy(copySourceId);
        } else {
            // Unified approach: always load from API (returns defaults for new records)
            manager.loadManagerData();
        }
    },


    /**
     * Load manager data for copying.
     * @param {string} sourceId - Source manager ID to copy from
     */
    loadManagerDataForCopy(sourceId) {
        manager.$formObj.addClass('loading');

        // Load copy data from the source manager using the copy endpoint
        AsteriskManagersAPI.getCopyData(sourceId, (data) => {
            manager.$formObj.removeClass('loading');

            if (data === false) {
                // V5.0: No fallback - show error and stop
                UserMessage.showError(globalTranslate.am_ErrorLoadingManager);
                return;
            }

            // The copy endpoint already returns data with cleared ID, username, generated secret, and updated description
            manager.managerData = data;

            // Set hidden field value BEFORE initializing dropdowns
            $('#networkfilterid').val(data.networkfilterid || 'none');

            // Now populate form and initialize elements
            manager.populateForm(data);

            // Initialize form elements and handlers after data is loaded
            manager.initializeFormElements();
            manager.setupEventHandlers();

            // Clear original name since this is a new record
            manager.originalName = '';
            manager.managerId = '';  // Clear manager ID to ensure it's treated as new

            // Update form title if possible
            const $headerText = $('.ui.header .content');
            if ($headerText.length) {
                $headerText.text(globalTranslate.am_CopyRecord);
            }

            // Focus on username field
            manager.$username.focus();
        });
    },

    /**
     * Load manager data from API.
     * Unified method for both new and existing records.
     * API returns defaults for new records when ID is empty.
     */
    loadManagerData() {
        manager.$formObj.addClass('loading');

        // Always call API - it returns defaults for new records (when ID is empty)
        AsteriskManagersAPI.getRecord(manager.managerId || '', (data) => {
            manager.$formObj.removeClass('loading');

            if (data === false) {
                // V5.0: No fallback - show error and stop
                UserMessage.showError(globalTranslate.am_ErrorLoadingManager);
                return;
            }

            manager.managerData = data;
            
            // Set hidden field value BEFORE initializing dropdowns
            // This ensures the value is available when dropdown initializes
            $('#networkfilterid').val(data.networkfilterid || 'none');
            
            // Now populate form and initialize elements
            manager.populateForm(data);
            
            // Initialize form elements and handlers after data is loaded
            manager.initializeFormElements();
            manager.setupEventHandlers();
            
            // Store original username for validation (empty for new records)
            manager.originalName = data.username || '';
            
            // For new records, ensure managerId is empty
            if (!manager.managerId) {
                manager.managerId = '';
                manager.originalName = '';
            }

            // Disable fields for system managers
            if (data.isSystem) {
                manager.$formObj.find('input, select, button').not('.cancel').attr('disabled', true);
                manager.$formObj.find('.checkbox').addClass('disabled');
                UserMessage.showMultiString(globalTranslate.am_SystemManagerReadOnly, UserMessage.INFO);
            }
        });
    },

    /**
     * Populate form with manager data.
     * @param {Object} data - Manager data.
     */
    populateForm(data) {
        // Use unified silent population approach
        Form.populateFormSilently({
            id: data.id,
            username: data.username,
            secret: data.secret,
            description: data.description
        }, {
            afterPopulate: (formData) => {
                // Build network filter dropdown using DynamicDropdownBuilder
                DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
                    apiUrl: '/pbxcore/api/v3/network-filters:getForSelect?categories[]=AMI&includeLocalhost=true',
                    placeholder: globalTranslate.am_NetworkFilter,
                    cache: false
                });

                // Set permission checkboxes using Semantic UI API
                if (data.permissions && typeof data.permissions === 'object') {
                    // First uncheck all checkboxes
                    manager.$allCheckBoxes.checkbox('uncheck');
                    
                    // Then set checked state for permissions that are true
                    Object.keys(data.permissions).forEach(permKey => {
                        if (data.permissions[permKey] === true) {
                            const $checkboxDiv = manager.$formObj.find(`input[name="${permKey}"]`).parent('.checkbox');
                            if ($checkboxDiv.length) {
                                $checkboxDiv.checkbox('set checked');
                            }
                        }
                    });
                } else {
                    // If no permissions data, uncheck all
                    manager.$allCheckBoxes.checkbox('uncheck');
                }

                // Update clipboard button with current password
                if (data.secret) {
                    $('.clipboard').attr('data-clipboard-text', data.secret);
                }

                // Auto-resize textarea after data is loaded
                // Use setTimeout to ensure DOM is fully updated
                setTimeout(() => {
                    FormElements.optimizeTextareaSize('textarea[name="description"]');
                }, 100);
            }
        });
    },

    /**
     * Initialize form elements.
     */
    initializeFormElements() {
        // Initialize checkboxes first
        manager.$allCheckBoxes.checkbox();

        // Initialize password widget with all features
        if (manager.$secret.length > 0) {
            const widget = PasswordWidget.init(manager.$secret, {
                validation: PasswordWidget.VALIDATION.SOFT,
                generateButton: true,  // Widget will add generate button
                showStrengthBar: true,
                showWarnings: true,
                validateOnInput: true,
                checkOnLoad: true,  // Validate password when card is opened
                minScore: 60,
                generateLength: 32, // AMI passwords should be 32 chars for better security
                onGenerate: (password) => {
                    // Trigger form change to enable save button
                    Form.dataChanged();
                }
            });
            
            // Store widget instance for later use
            manager.passwordWidget = widget;
            
            // Generate new password if field is empty and creating new manager
            if (!manager.managerId && manager.$secret.val() === '') {
                // Trigger password generation through the widget
                setTimeout(() => {
                    const $generateBtn = manager.$secret.closest('.ui.input').find('button.generate-password');
                    if ($generateBtn.length > 0) {
                        $generateBtn.trigger('click');
                    }
                }, 100); // Small delay to ensure widget is fully initialized
            }
        }
        
        // Initialize clipboard for copy button that will be created by widget
        setTimeout(() => {
            const clipboard = new ClipboardJS('.clipboard');
            $('.clipboard').popup({
                on: 'manual',
            });

            clipboard.on('success', (e) => {
                $(e.trigger).popup('show');
                setTimeout(() => {
                    $(e.trigger).popup('hide');
                }, 1500);
                e.clearSelection();
            });

            clipboard.on('error', (e) => {
                console.error('Action:', e.action);
                console.error('Trigger:', e.trigger);
            });
        }, 200); // Delay to ensure widget buttons are created

        // Initialize popups
        $('.popuped').popup();

        // Setup auto-resize for description textarea with event handlers
        $('textarea[name="description"]').on('input paste keyup', function() {
            FormElements.optimizeTextareaSize($(this));
        });
    },

    /**
     * Setup event handlers.
     */
    setupEventHandlers() {
        // Handle uncheck button click
        manager.$unCheckButton.on('click', (e) => {
            e.preventDefault();
            manager.$allCheckBoxes.checkbox('uncheck');
        });

        // Handle check all button click
        manager.$checkAllButton.on('click', (e) => {
            e.preventDefault();
            manager.$allCheckBoxes.checkbox('check');
        });

        // Handle username change for validation
        manager.$username.on('change', () => {
            const newValue = manager.$username.val();
            manager.checkAvailability(manager.originalName, newValue, 'username', manager.managerId);
        });

    },

    /**
     * Checks if the username doesn't exist in the database using REST API.
     * @param {string} oldName - The old username.
     * @param {string} newName - The new username.
     * @param {string} cssClassName - The CSS class name.
     * @param {string} managerId - The manager ID.
     */
    checkAvailability(oldName, newName, cssClassName = 'username', managerId = '') {
        if (oldName === newName) {
            $(`.ui.input.${cssClassName}`).parent().removeClass('error');
            $(`#${cssClassName}-error`).addClass('hidden');
            return;
        }

        // Use the new API to check all managers
        AsteriskManagersAPI.getList((managers) => {
            if (managers === false) {
                return;
            }

            const exists = managers.some(m => 
                m.username === newName && m.id !== managerId
            );

            if (exists) {
                $(`.ui.input.${cssClassName}`).parent().addClass('error');
                $(`#${cssClassName}-error`).removeClass('hidden');
            } else {
                $(`.ui.input.${cssClassName}`).parent().removeClass('error');
                $(`#${cssClassName}-error`).addClass('hidden');
            }
        });
    },


    /**
     * Callback function before sending the form.
     * @param {object} settings - Settings object for the AJAX request.
     * @returns {object} - Modified settings object.
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = Form.$formObj.form('get values');
        
        // Collect permissions as boolean fields
        const permissions = {};
        const availablePermissions = [
            'call', 'cdr', 'originate', 'reporting', 'agent', 'config', 
            'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'
        ];
        
        availablePermissions.forEach(perm => {
            // Check read permission checkbox
            const readCheckbox = manager.$formObj.find(`input[name="${perm}_read"]`);
            if (readCheckbox.length) {
                permissions[`${perm}_read`] = readCheckbox.is(':checked');
            }
            
            // Check write permission checkbox
            const writeCheckbox = manager.$formObj.find(`input[name="${perm}_write"]`);
            if (writeCheckbox.length) {
                permissions[`${perm}_write`] = writeCheckbox.is(':checked');
            }
        });
        
        // Remove individual permission fields from data to avoid duplication
        availablePermissions.forEach(perm => {
            delete result.data[`${perm}_read`];
            delete result.data[`${perm}_write`];
        });
        
        // Add permissions as a single object
        result.data.permissions = permissions;
        
        return result;
    },


    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        // This callback is called BEFORE Form.handleSubmitResponse processes redirect
        // Only handle things that need to be done before potential page redirect
        if (response && (response.success || response.result)) {
            // Update managerId for new records (needed before redirect)
            if (response.data && response.data.id && !manager.managerId) {
                manager.managerId = response.data.id;
                Form.$formObj.form('set value', 'id', manager.managerId);
            }
            
            // Note: UserMessage and Form.initialize are handled automatically by Form.handleSubmitResponse
            // if there's no redirect (response.reload). If there is redirect, they're not needed anyway.
        }
    },

    /**
     * Initializes the form.
     */
    initializeForm() {
        Form.$formObj = manager.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = manager.validateRules; // Form validation rules
        Form.cbBeforeSendForm = manager.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = manager.cbAfterSendForm; // Callback after form is sent
        
        // REST API integration
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = AsteriskManagersAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Navigation URLs
        Form.afterSubmitIndexUrl = globalRootUrl + 'asterisk-managers/index/';
        Form.afterSubmitModifyUrl = globalRootUrl + 'asterisk-managers/modify/';
        
        Form.initialize();
    },

};

// Custom form validation rule for checking uniqueness of username
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

/**
 *  Initialize Asterisk Manager modify form on document ready
 */
$(document).ready(() => {
    manager.initialize();
});
