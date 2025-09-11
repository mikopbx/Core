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

/* global globalRootUrl, ConferenceRoomsAPI, Form, globalTranslate, UserMessage, Extensions */

/**
 * Conference room edit form management module
 */
const conferenceRoomModify = {
    $formObj: $('#conference-room-form'),
    $number: $('#extension'),
    defaultExtension: '',
    
    /**
     * Validation rules
     */
    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.cr_ValidateNameIsEmpty
                }
            ]
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.cr_ValidateExtensionIsEmpty
                },
                {
                    type: 'regExp[/^[0-9]{2,8}$/]',
                    prompt: globalTranslate.cr_ValidateExtensionFormat
                },
                {
                    type: 'existRule[extension-error]',
                    prompt: globalTranslate.cr_ValidateExtensionDouble,
                },
            ]
        },
        pinCode: {
            identifier: 'pinCode',
            rules: [
                {
                    type: 'regExp[/^[0-9]*$/]',
                    prompt: globalTranslate.cr_ValidatePinNumber,
                },
            ],
        },
    },
    
    /**
     * Module initialization
     */
    initialize() {
        // Add handler to dynamically check if the input number is available
        let timeoutId;
        conferenceRoomModify.$number.on('input', () => {
            // Clear the previous timer, if it exists
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            // Set a new timer with a delay of 0.5 seconds
            timeoutId = setTimeout(() => {
                // Get the newly entered number
                const newNumber = conferenceRoomModify.$formObj.form('get value', 'extension');

                // Execute the availability check for the number
                Extensions.checkAvailability(conferenceRoomModify.defaultExtension, newNumber);
            }, 500);
        });
        
        // Configure Form.js
        Form.$formObj = conferenceRoomModify.$formObj;
        Form.url = '#'; // Не используется при REST API
        Form.validateRules = conferenceRoomModify.validateRules;
        Form.cbBeforeSendForm = conferenceRoomModify.cbBeforeSendForm;
        Form.cbAfterSendForm = conferenceRoomModify.cbAfterSendForm;
        
        // Настройка REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = ConferenceRoomsAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}conference-rooms/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}conference-rooms/modify/`;
        
        // Initialize Form with all standard features:
        // - Dirty checking (change tracking)
        // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
        // - Form validation
        // - AJAX response handling
        Form.initialize();
        
        // Load form data
        conferenceRoomModify.initializeForm();
    },
    
    /**
     * Load data into form
     */
    initializeForm() {
        const recordId = conferenceRoomModify.getRecordId();
        
        ConferenceRoomsAPI.getRecord(recordId, (response) => {
            if (response.result) {
                conferenceRoomModify.populateForm(response.data);
                // Get the default extension from the form
                conferenceRoomModify.defaultExtension = conferenceRoomModify.$formObj.form('get value', 'extension');
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load conference room data');
            }
        });
    },
    
    /**
     * Get record ID from URL
     */
    getRecordId() {
        const urlParts = window.location.pathname.split('/');
        const modifyIndex = urlParts.indexOf('modify');
        if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
            return urlParts[modifyIndex + 1];
        }
        return '';
    },
    
      /**
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        // Get form values including the hidden isNew field
        const formData = conferenceRoomModify.$formObj.form('get values');
        
        // Add _isNew flag based on the form's hidden field value
        if (formData.isNew === '1') {
            settings.data._isNew = true;
        }
        
        // Возвращаем settings для продолжения обработки
        return settings;
    },
    
     /**
     * Callback after form submission
     * Handles different save modes (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
     */
    cbAfterSendForm(response) {
        if (response.result) {
           
            if (response.data) {
                conferenceRoomModify.populateForm(response.data);
            }
            
             // Update URL for new records (after first save)
            const formData = conferenceRoomModify.$formObj.form('get values');
            if (formData.isNew === '1' && response.data && response.data.id) {
                const newUrl = window.location.href.replace(/modify\/?$/, `modify/${response.data.id}`);
                window.history.pushState(null, '', newUrl);
                // Update the hidden isNew field to '0' since it's no longer new
                conferenceRoomModify.$formObj.form('set value', 'isNew', '0');
            }
            
        }
    },
    
    /**
     * Populate form with data
     */
    populateForm(data) {
        // Use unified silent population approach
        Form.populateFormSilently(data, {
            afterPopulate: (formData) => {
                if (Form.enableDirrity) {
                    Form.saveInitialValues();
                }
            }
        });
    },
    
};

/**
 * Checks if the number is taken by another account
 * @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
 */
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    conferenceRoomModify.initialize();
});
