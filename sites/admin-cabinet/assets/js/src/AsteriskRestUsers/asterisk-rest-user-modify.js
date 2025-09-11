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

/* global globalRootUrl, globalTranslate, Form, AsteriskRestUsersAPI, UserMessage, PasswordWidget, ClipboardJS */

/**
 * AsteriskRestUserModify module.
 * @module AsteriskRestUserModify
 */
const AsteriskRestUserModify = {
    
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#asterisk-rest-user-form'),
    
    /**
     * jQuery object for the username field.
     * @type {jQuery}
     */
    $username: $('#username'),
    
    /**
     * jQuery object for the password field.
     * @type {jQuery}
     */
    $password: $('#password'),
    
    /**
     * jQuery object for the description field.
     * @type {jQuery}
     */
    $description: $('#description'),
    
    /**
     * jQuery object for the applications dropdown.
     * @type {jQuery}
     */
    $applications: $('#applications'),
    
    /**
     * Password widget instance.
     * @type {Object}
     */
    passwordWidget: null,
    
    /**
     * Original username for validation.
     * @type {string}
     */
    originalUsername: '',
    
    /**
     * Form validation rules.
     * @type {object}
     */
    validateRules: {
        username: {
            identifier: 'username',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ari_ValidateUsernameEmpty
                },
                {
                    type: 'regExp[/^[a-zA-Z0-9_]+$/]',
                    prompt: globalTranslate.ari_ValidateUsernameFormat
                }
            ]
        },
        password: {
            identifier: 'password',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ari_ValidatePasswordEmpty
                }
            ]
        }
    },
    
    /**
     * Initialize the module.
     */
    initialize() {
        // Initialize Form first to enable form methods
        this.initializeForm();
        
        // Get user ID from URL or form
        const urlParts = window.location.pathname.split('/');
        const lastSegment = urlParts[urlParts.length - 1] || '';
        
        // Check if the last segment is 'modify' or 'new' (new record) or an actual ID
        let userId = '';
        if (lastSegment !== 'modify' && lastSegment !== 'new' && lastSegment !== '') {
            userId = lastSegment;
        }
        
        // Store user ID from URL (overrides form data-id)
        if (userId) {
            this.$formObj.data('id', userId);
        }
        
        // Unified approach: always load from API (returns defaults for new records)
        this.loadUserData();
    },
    
    /**
     * Initialize dropdown components and form elements.
     * @param {Object} data - ARI user data for initialization
     */
    initializeFormElements(data = {}) {
        // Initialize applications dropdown (multi-select)
        this.$applications.dropdown({
            allowAdditions: true,
            forceSelection: false,
            placeholder: globalTranslate.ari_ApplicationsPlaceholder
        });
        
        // Load available Stasis applications
        this.loadStasisApplications();
        
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
        
        // Initialize username availability check
        this.setupUsernameCheck();
    },
    
    /**
     * Setup username availability check.
     */
    setupUsernameCheck() {
        // Username change - check uniqueness
        this.$username.on('change blur', () => {
            const newUsername = this.$username.val();
            if (newUsername !== this.originalUsername) {
                this.checkUsernameAvailability(this.originalUsername, newUsername);
            }
        });
    },
    
    /**
     * Load user data from API.
     * Unified method for both new and existing records.
     * API returns defaults for new records when ID is empty.
     */
    loadUserData() {
        // Show loading state
        this.$formObj.addClass('loading');
        
        // Get user ID from form data attribute
        const userId = this.$formObj.data('id') || '';
        
        // Always call API - it returns defaults for new records (when ID is empty)
        AsteriskRestUsersAPI.getRecord(userId, (data) => {
            this.$formObj.removeClass('loading');
            
            if (data === false) {
                // Show error and stop
                UserMessage.showError(globalTranslate.ari_ErrorLoadingUser || 'Error loading user');
                return;
            }
            
            // Populate form with data using silent population
            this.populateForm(data);
            
            // Initialize form elements after population
            this.initializeFormElements(data);
            
            // Store original username for validation (empty for new records)
            this.originalUsername = data.username || '';
            
            // For new records, ensure form data-id is empty
            if (!userId) {
                this.$formObj.data('id', '');
                this.originalUsername = '';
            }
            
            // Disable fields for system user
            if (data.username === 'pbxcore') {
                this.$username.prop('readonly', true);
                this.$username.closest('.field').addClass('disabled');
                this.$formObj.find('.generate-password').addClass('disabled');
                UserMessage.showInformation(globalTranslate.ari_SystemUserReadOnly || 'System user is read-only');
            }
        });
    },
    
    /**
     * Populate form with user data.
     * @param {Object} data - User data from API
     */
    populateForm(data) {
        // Use unified silent population approach (same as AMI users)
        Form.populateFormSilently({
            id: data.id,
            username: data.username,
            password: data.password,
            description: data.description
        }, {
            beforePopulate: () => {
                // Initialize password widget BEFORE populating data
                if (AsteriskRestUserModify.$password.length > 0 && !AsteriskRestUserModify.passwordWidget) {
                    const widget = PasswordWidget.init(AsteriskRestUserModify.$password, {
                        validation: PasswordWidget.VALIDATION.SOFT,
                        generateButton: true,  // Widget will add generate button
                        showStrengthBar: true,
                        showWarnings: true,
                        validateOnInput: true,
                        checkOnLoad: true,  // Validate password when card is opened
                        minScore: 60,
                        generateLength: 32, // ARI passwords should be 32 chars for better security
                        onGenerate: (password) => {
                            // Trigger form change to enable save button
                            Form.dataChanged();
                        }
                    });
                    
                    // Store widget instance for later use
                    AsteriskRestUserModify.passwordWidget = widget;
                }
            },
            afterPopulate: (formData) => {
                // Set applications after form is populated
                if (data.applications && data.applications.length > 0) {
                    AsteriskRestUserModify.$applications.dropdown('set selected', data.applications);
                }
                
                // Update clipboard button with current password if PasswordWidget created it
                if (data.password) {
                    setTimeout(() => {
                        $('.clipboard').attr('data-clipboard-text', data.password);
                    }, 200);
                }
            }
        });
    },
    
    /**
     * Load available Stasis applications.
     */
    loadStasisApplications() {
        // Set some common applications as suggestions
        const commonApps = [
            'stasis',
            'ari-app',
            'external-media',
            'bridge-app',
            'channel-spy'
        ];
        
        const values = commonApps.map(app => ({
            name: app,
            value: app
        }));
        
        // Add to dropdown as suggestions
        this.$applications.dropdown('change values', values);
    },
    
    /**
     * Check username availability.
     * @param {string} oldName - The old username.
     * @param {string} newName - The new username.
     */
    checkUsernameAvailability(oldName, newName) {
        if (oldName === newName) {
            $('.ui.input.username').parent().removeClass('error');
            $('#username-error').addClass('hidden');
            return;
        }
        
        const currentId = this.$formObj.data('id');
        
        // Use the API to check all users
        AsteriskRestUsersAPI.getList({}, (response) => {
            if (response === false) {
                return;
            }
            
            const exists = response.items && response.items.some(user => 
                user.username === newName && user.id !== currentId
            );
            
            if (exists) {
                $('.ui.input.username').parent().addClass('error');
                $('#username-error').removeClass('hidden');
            } else {
                $('.ui.input.username').parent().removeClass('error');
                $('#username-error').addClass('hidden');
            }
        });
    },
    
    /**
     * Callback function before sending the form.
     * @param {object} settings - The form settings.
     * @returns {object} Modified settings.
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = Form.$formObj.form('get values');
        
        // Get ID from form data attribute
        const id = AsteriskRestUserModify.$formObj.data('id');
        if (id) {
            result.data.id = id;
        }
        
        // Get applications
        const applications = AsteriskRestUserModify.$applications.dropdown('get value');
        result.data.applications = applications ? applications.split(',').map(app => app.trim()).filter(app => app) : [];
        
        return result;
    },
    
    /**
     * Callback function after sending the form.
     * @param {object} response - The response from the server.
     */
    cbAfterSendForm(response) {
        // This callback is called BEFORE Form.handleSubmitResponse processes redirect
        // Only handle things that need to be done before potential page redirect
        if (response && (response.success || response.result)) {
            // Update form ID for new records (needed before redirect)
            if (response.data && response.data.id && !AsteriskRestUserModify.$formObj.data('id')) {
                AsteriskRestUserModify.$formObj.data('id', response.data.id);
                Form.$formObj.form('set value', 'id', response.data.id);
            }
        }
    },
    
    /**
     * Initialize the form.
     */
    initializeForm() {
        Form.$formObj = AsteriskRestUserModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = AsteriskRestUserModify.validateRules;
        Form.cbBeforeSendForm = AsteriskRestUserModify.cbBeforeSendForm;
        Form.cbAfterSendForm = AsteriskRestUserModify.cbAfterSendForm;
        
        // REST API integration
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = AsteriskRestUsersAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Navigation URLs
        Form.afterSubmitIndexUrl = `${globalRootUrl}asterisk-rest-users/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}asterisk-rest-users/modify/`;
        
        Form.initialize();
    }
};

// Custom form validation rule for checking uniqueness of username
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

// Initialize when document is ready
$(document).ready(() => {
    AsteriskRestUserModify.initialize();
});