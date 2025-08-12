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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, AsteriskManagersAPI, UserMessage */

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
    $allCheckBoxes: $('#save-ami-form .list .checkbox'),

    /**
     * jQuery object for the uncheck button.
     * @type {jQuery}
     */
    $unCheckButton: $('.uncheck.button'),

    /**
     * jQuery object for the username input field.
     * @type {jQuery}
     */
    $username: $('#username'),

    /**
     * jQuery object for the secret input field.
     * @type {jQuery}
     */
    $secret: $('#secret'),

    /**
     * Manager ID.
     * @type {string}
     */
    managerId: '',

    /**
     * Original username value.
     * @type {string}
     */
    originalName: '',

    /**
     * Manager data.
     * @type {Object}
     */
    managerData: null,

    /**
     * Validation rules for the form fields before submission.
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
        // Get manager ID from form
        this.managerId = this.$formObj.form('get value', 'id');

        // Initialize API
        AsteriskManagersAPI.initialize();

        // Load manager data if editing
        if (this.managerId) {
            this.loadManagerData();
        } else {
            this.initializeFormElements();
            this.setupEventHandlers();
        }

        // Initialize form
        this.initializeForm();
    },

    /**
     * Load manager data from API.
     */
    loadManagerData() {
        this.$formObj.addClass('loading');

        AsteriskManagersAPI.getRecord(this.managerId, (data) => {
            this.$formObj.removeClass('loading');

            if (data === false) {
                UserMessage.showMultiString(globalTranslate.am_ErrorLoadingManager);
                return;
            }

            this.managerData = data;
            this.populateForm(data);
            this.initializeFormElements();
            this.setupEventHandlers();
            
            // Store original username for validation
            this.originalName = data.username || '';

            // Disable fields for system managers
            if (data.isSystem) {
                this.$formObj.find('input, select, button').not('.cancel').attr('disabled', true);
                this.$formObj.find('.checkbox').addClass('disabled');
                UserMessage.showMultiString(globalTranslate.am_SystemManagerReadOnly, UserMessage.INFO);
            }
        });
    },

    /**
     * Populate form with manager data.
     * @param {Object} data - Manager data.
     */
    populateForm(data) {
        // Set form values
        this.$formObj.form('set values', {
            id: data.id,
            uniqid: data.uniqid,
            username: data.username,
            secret: data.secret,
            description: data.description,
            networkfilterid: data.networkfilterid,
            deny: data.deny,
            permit: data.permit,
            call_limit: data.call_limit
        });

        // Set read permissions checkboxes
        if (data.readPermissions && Array.isArray(data.readPermissions)) {
            data.readPermissions.forEach(permission => {
                $(`#read-${permission}`).checkbox('check');
            });
        }

        // Set write permissions checkboxes
        if (data.writePermissions && Array.isArray(data.writePermissions)) {
            data.writePermissions.forEach(permission => {
                $(`#write-${permission}`).checkbox('check');
            });
        }

        // Populate network filters dropdown if available
        if (data.availableNetworkFilters) {
            const $dropdown = $('#networkfilterid');
            $dropdown.empty();
            $dropdown.append('<option value="">None</option>');
            
            data.availableNetworkFilters.forEach(filter => {
                $dropdown.append(`<option value="${filter.id}">${filter.represent}</option>`);
            });
            
            $dropdown.dropdown('refresh');
            if (data.networkfilterid) {
                $dropdown.dropdown('set selected', data.networkfilterid);
            }
        }
    },

    /**
     * Initialize form elements.
     */
    initializeFormElements() {
        // Initialize dropdowns
        this.$dropDowns.dropdown();

        // Generate new password if field is empty and creating new manager
        if (!this.managerId && this.$secret.val() === '') {
            this.generateNewPassword();
        }

        // Initialize clipboard for password copy
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

        // Prevent browser password manager for generated passwords
        this.$secret.on('focus', function() {
            $(this).attr('autocomplete', 'new-password');
        });

        // Initialize popups
        $('.popuped').popup();
    },

    /**
     * Setup event handlers.
     */
    setupEventHandlers() {
        // Handle uncheck button click
        this.$unCheckButton.on('click', (e) => {
            e.preventDefault();
            this.$allCheckBoxes.checkbox('uncheck');
        });

        // Handle username change for validation
        this.$username.on('change', () => {
            const newValue = this.$username.val();
            this.checkAvailability(this.originalName, newValue, 'username', this.managerId);
        });

        // Handle generate new password button
        $('#generate-new-password').on('click', (e) => {
            e.preventDefault();
            this.generateNewPassword();
        });

        // Show/hide password toggle
        $('#show-hide-password').on('click', (e) => {
            e.preventDefault();
            const $button = $(e.currentTarget);
            const $icon = $button.find('i');
            
            if (this.$secret.attr('type') === 'password') {
                this.$secret.attr('type', 'text');
                $icon.removeClass('eye').addClass('eye slash');
            } else {
                this.$secret.attr('type', 'password');
                $icon.removeClass('eye slash').addClass('eye');
            }
        });

        // Handle network filter dropdown change
        $('#networkfilterid').on('change', () => {
            const filterId = $('#networkfilterid').dropdown('get value');
            if (filterId) {
                // Disable permit/deny fields when using network filter
                $('#deny, #permit').closest('.field').addClass('disabled');
            } else {
                // Enable permit/deny fields when not using network filter
                $('#deny, #permit').closest('.field').removeClass('disabled');
            }
        });
    },

    /**
     * Checks if the username doesn't exist in the database.
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

            const exists = managers.some(manager => 
                manager.username === newName && manager.id !== managerId
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
     * Generate a new AMI password.
     */
    generateNewPassword() {
        // Request 16 chars for AMI password
        PbxApi.PasswordGenerate(16, (password) => {
            this.$formObj.form('set value', 'secret', password);
            // Update clipboard button attribute
            $('.clipboard').attr('data-clipboard-text', password);
            // Trigger form change to enable save button
            Form.dataChanged();
        });
    },

    /**
     * Callback function before sending the form.
     * @param {object} settings - Settings object for the AJAX request.
     * @returns {object} - Modified settings object.
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        
        // Get form values
        const values = this.$formObj.form('get values');
        
        // Collect read permissions
        const readPermissions = [];
        this.$formObj.find('input[name^="read-"]:checked').each(function() {
            const permission = $(this).attr('name').replace('read-', '');
            readPermissions.push(permission);
        });
        values.read = readPermissions.join(',');

        // Collect write permissions
        const writePermissions = [];
        this.$formObj.find('input[name^="write-"]:checked').each(function() {
            const permission = $(this).attr('name').replace('write-', '');
            writePermissions.push(permission);
        });
        values.write = writePermissions.join(',');

        // Use new API endpoint
        result.url = AsteriskManagersAPI.endpoint;
        result.method = 'POST';
        result.data = {
            action: 'saveRecord',
            data: values
        };

        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent.
     */
    cbAfterSendForm(response) {
        if (response && response.success) {
            // Update form with new ID if it was a new record
            if (response.data && response.data.id && !this.managerId) {
                this.managerId = response.data.id;
                this.$formObj.form('set value', 'id', this.managerId);
                
                // Update URL to reflect the new ID
                const newUrl = `${globalRootUrl}asterisk-managers/modify/${this.managerId}`;
                window.history.replaceState(null, '', newUrl);
            }

            UserMessage.showMultiString(globalTranslate.am_ManagerSaved);
            Form.initialize();
        } else {
            const errorMessage = response?.messages?.error?.[0] || 
                               globalTranslate.am_ErrorSavingManager;
            UserMessage.showMultiString(errorMessage, UserMessage.ERROR);
        }
    },

    /**
     * Initializes the form.
     */
    initializeForm() {
        Form.$formObj = this.$formObj;
        Form.url = AsteriskManagersAPI.endpoint;
        Form.validateRules = this.validateRules;
        Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
        Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
        Form.initialize();
    }
};

/**
 * Initialize manager form on document ready.
 */
$(document).ready(() => {
    manager.initialize();
});