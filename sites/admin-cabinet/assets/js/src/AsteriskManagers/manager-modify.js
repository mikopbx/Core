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

/* global globalRootUrl,globalTranslate, Form, PbxApi, ClipboardJS */

/**
 * Manager module.
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
     * Original username value.
     * @type {string}
     */
    originalName: '',

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
        // Initialize dropdowns
        manager.$dropDowns.dropdown();

        // Handle uncheck button click
        manager.$unCheckButton.on('click', (e) => {
            e.preventDefault();
            manager.$allCheckBoxes.checkbox('uncheck');
        });

        // Handle username change
        manager.$username.on('change', (value) => {
            const userId = manager.$formObj.form('get value', 'id');
            const newValue = manager.$formObj.form('get value', 'username');
            manager.checkAvailability(manager.originalName, newValue, 'username', userId);
        });

        // Generate new password if field is empty
        if (manager.$secret.val() === '') {
            manager.generateNewPassword();
        }

        // Handle generate new password button
        $('#generate-new-password').on('click', (e) => {
            e.preventDefault();
            manager.generateNewPassword();
        });

        // Show/hide password toggle
        $('#show-hide-password').on('click', (e) => {
            e.preventDefault();
            const $button = $(e.currentTarget);
            const $icon = $button.find('i');
            
            if (manager.$secret.attr('type') === 'password') {
                manager.$secret.attr('type', 'text');
                $icon.removeClass('eye').addClass('eye slash');
            } else {
                manager.$secret.attr('type', 'password');
                $icon.removeClass('eye slash').addClass('eye');
            }
        });

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
        manager.$secret.on('focus', function() {
            $(this).attr('autocomplete', 'new-password');
        });

        // Initialize popups
        $('.popuped').popup();

        manager.initializeForm();
        manager.originalName = manager.$formObj.form('get value', 'username');
    },

    /**
     * Checks if the username doesn't exist in the database.
     * @param {string} oldName - The old username.
     * @param {string} newName - The new username.
     * @param {string} cssClassName - The CSS class name.
     * @param {string} userId - The user ID.
     */
    checkAvailability(oldName, newName, cssClassName = 'username', userId = '') {
        if (oldName === newName) {
            $(`.ui.input.${cssClassName}`).parent().removeClass('error');
            $(`#${cssClassName}-error`).addClass('hidden');
            return;
        }
        $.api({
            url: `${globalRootUrl}asterisk-managers/available/{value}`,
            stateContext: `.ui.input.${cssClassName}`,
            on: 'now',
            beforeSend(settings) {
                const result = settings;
                result.urlData = {
                    value: newName,
                };
                return result;
            },
            onSuccess(response) {
                if (response.nameAvailable) {
                    $(`.ui.input.${cssClassName}`).parent().removeClass('error');
                    $(`#${cssClassName}-error`).addClass('hidden');
                } else if (userId.length > 0 && response.userId === userId) {
                    $(`.ui.input.${cssClassName}`).parent().removeClass('error');
                    $(`#${cssClassName}-error`).addClass('hidden');
                } else {
                    $(`.ui.input.${cssClassName}`).parent().addClass('error');
                    $(`#${cssClassName}-error`).removeClass('hidden');
                }
            },
        });
    },

    /**
     * Generate a new AMI password.
     */
    generateNewPassword() {
        // Request 16 chars for AMI password
        PbxApi.PasswordGenerate(16, (password) => {
            manager.$formObj.form('set value', 'secret', password);
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
        result.data = manager.$formObj.form('get values');
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        // Callback function after sending the form
    },

    /**
     * Initializes the form.
     */
    initializeForm() {
        Form.$formObj = manager.$formObj;
        Form.url = `${globalRootUrl}asterisk-managers/save`; // Form submission URL
        Form.validateRules = manager.validateRules; // Form validation rules
        Form.cbBeforeSendForm = manager.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = manager.cbAfterSendForm; // Callback after form is sent
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
