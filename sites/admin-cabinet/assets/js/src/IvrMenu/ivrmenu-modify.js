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

/* global globalRootUrl, IvrMenuAPI, Form, globalTranslate, UserMessage, Extensions, SoundFilesSelector */

/**
 * IVR menu edit form management module
 */
const ivrMenuModify = {
    $formObj: $('#ivr-menu-form'),
    $number: $('#extension'),
    $actionsPlace: $('#actions-place'),
    $rowTemplate: $('#row-template'),
    actionsRowsCount: 0,
    defaultExtension: '',

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.iv_ValidateNameIsEmpty,
                },
            ],
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.iv_ValidateExtensionIsEmpty,
                },
                {
                    type: 'regExp[/^[0-9]{2,8}$/]',
                    prompt: globalTranslate.iv_ValidateExtensionFormat
                },
                {
                    type: 'existRule[extension-error]',
                    prompt: globalTranslate.iv_ValidateExtensionDouble,
                },
            ],
        },
        timeout: {
            identifier: 'timeout',
            rules: [
                {
                    type: 'integer[1..99]',
                    prompt: globalTranslate.iv_ValidateTimeout
                }
            ]
        },
        number_of_repeat: {
            identifier: 'number_of_repeat',
            rules: [
                {
                    type: 'integer[1..99]',
                    prompt: globalTranslate.iv_ValidateRepeatCount
                }
            ]
        },
    },

    initialize() {
        // Add handler to dynamically check if the input number is available
        let timeoutId;
        ivrMenuModify.$number.on('input', () => {
            // Clear the previous timer, if it exists
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            // Set a new timer with a delay of 0.5 seconds
            timeoutId = setTimeout(() => {
                // Get the newly entered number
                const newNumber = ivrMenuModify.$formObj.form('get value', 'extension');

                // Execute the availability check for the number
                Extensions.checkAvailability(ivrMenuModify.defaultExtension, newNumber);
            }, 500);
        });
        
        // Initialize sound file selector
        SoundFilesSelector.initialize(
            '.audio-message-select',
            'input[name="audio_message_id"]'
        );
        
        // Initialize actions table
        ivrMenuModify.initializeActionsTable();
        
        // Configure Form.js
        Form.$formObj = ivrMenuModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = ivrMenuModify.validateRules;
        Form.cbBeforeSendForm = ivrMenuModify.cbBeforeSendForm;
        Form.cbAfterSendForm = ivrMenuModify.cbAfterSendForm;
        
        // Setup REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = IvrMenuAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}ivr-menu/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}ivr-menu/modify/`;
        
        // Initialize Form with all standard features:
        // - Dirty checking (change tracking)
        // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
        // - Form validation
        // - AJAX response handling
        Form.initialize();
        
        // Load form data
        ivrMenuModify.initializeForm();
    },
    /**
     * Load data into form
     */
    initializeForm() {
        const recordId = ivrMenuModify.getRecordId();
        
        IvrMenuAPI.getRecord(recordId, (response) => {
            if (response.result) {
                ivrMenuModify.populateForm(response.data);
                // Get the default extension from the form
                ivrMenuModify.defaultExtension = ivrMenuModify.$formObj.form('get value', 'extension');
                
                // Populate actions table
                ivrMenuModify.populateActionsTable(response.data.actions || []);
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load IVR menu data');
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
     * Initialize actions table
     */
    initializeActionsTable() {
        // Add new action button
        $('#add-new-ivr-action').on('click', (e) => {
            e.preventDefault();
            ivrMenuModify.addNewActionRow();
            ivrMenuModify.rebuildActionExtensionsDropdown();
        });
    },

    /**
     * Populate actions table
     */
    populateActionsTable(actions) {
        // Clear existing actions except template
        $('.action-row:not(#row-template)').remove();
        ivrMenuModify.actionsRowsCount = 0;
        
        actions.forEach(action => {
            ivrMenuModify.addNewActionRow({
                digits: action.digits,
                extension: action.extension,
                extensionRepresent: action.extensionRepresent || ''
            });
        });
        
        ivrMenuModify.rebuildActionExtensionsDropdown();
    },
    
    /**
     * Add new action row using the existing template
     */
    addNewActionRow(param = {}) {
        const defaultParam = {
            digits: '',
            extension: '',
            extensionRepresent: ''
        };
        
        const rowParam = $.extend({}, defaultParam, param);
        ivrMenuModify.actionsRowsCount += 1;
        
        // Clone template
        const $actionTemplate = ivrMenuModify.$rowTemplate.clone();
        $actionTemplate
            .removeClass('hidden')
            .attr('id', `row-${ivrMenuModify.actionsRowsCount}`)
            .attr('data-value', ivrMenuModify.actionsRowsCount)
            .attr('style', '');
            
        // Set digits input
        $actionTemplate.find('input[name="digits-id"]')
            .attr('id', `digits-${ivrMenuModify.actionsRowsCount}`)
            .attr('name', `digits-${ivrMenuModify.actionsRowsCount}`)
            .attr('value', rowParam.digits);
            
        // Set extension input
        $actionTemplate.find('input[name="extension-id"]')
            .attr('id', `extension-${ivrMenuModify.actionsRowsCount}`)
            .attr('name', `extension-${ivrMenuModify.actionsRowsCount}`)
            .attr('value', rowParam.extension);
            
        // Set delete button data-value
        $actionTemplate.find('div.delete-action-row')
            .attr('data-value', ivrMenuModify.actionsRowsCount);
            
        // Update extension represent text if available
        if (rowParam.extensionRepresent.length > 0) {
            $actionTemplate.find('div.default.text')
                .removeClass('default')
                .html(rowParam.extensionRepresent);
        }
        
        // Add validation rules for the new fields
        ivrMenuModify.validateRules[`digits-${ivrMenuModify.actionsRowsCount}`] = {
            identifier: `digits-${ivrMenuModify.actionsRowsCount}`,
            depends: `extension-${ivrMenuModify.actionsRowsCount}`,
            rules: [{
                type: 'empty',
                prompt: globalTranslate.iv_ValidateDigitsIsEmpty
            }]
        };
        
        ivrMenuModify.validateRules[`extension-${ivrMenuModify.actionsRowsCount}`] = {
            identifier: `extension-${ivrMenuModify.actionsRowsCount}`,
            depends: `digits-${ivrMenuModify.actionsRowsCount}`,
            rules: [{
                type: 'empty',
                prompt: globalTranslate.iv_ValidateExtensionIsEmpty
            }]
        };
        
        // Append to actions place
        ivrMenuModify.$actionsPlace.append($actionTemplate);
        
        // Acknowledge form modification
        Form.dataChanged();
    },
    
    /**
     * Rebuild dropdown for action extensions
     */
    rebuildActionExtensionsDropdown() {
        // Initialize dropdowns with routing settings
        $('#ivr-menu-form .forwarding-select').dropdown(
            Extensions.getDropdownSettingsForRouting(ivrMenuModify.cbOnExtensionSelect)
        );
        
        // Attach delete handlers
        $('.delete-action-row').off('click').on('click', function(e) {
            e.preventDefault();
            const id = $(this).attr('data-value');
            
            // Remove validation rules
            delete ivrMenuModify.validateRules[`digits-${id}`];
            delete ivrMenuModify.validateRules[`extension-${id}`];
            
            // Remove the row
            $(`#row-${id}`).remove();
            
            // Acknowledge form modification
            Form.dataChanged();
        });
    },
    
    /**
     * Callback when extension is selected in dropdown
     */
    cbOnExtensionSelect(text, value, $element) {
        // Mark that data has changed
        Form.dataChanged();
    },


    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        // Collect actions data
        const actions = [];
        
        // Iterate over each action row (excluding template)
        $('.action-row:not(#row-template)').each(function() {
            const rowId = $(this).attr('data-value');
            
            // Skip template row
            if (rowId && parseInt(rowId) > 0) {
                const digits = ivrMenuModify.$formObj.form('get value', `digits-${rowId}`);
                const extension = ivrMenuModify.$formObj.form('get value', `extension-${rowId}`);
                
                // Only add if both values exist
                if (digits && extension) {
                    actions.push({
                        digits: digits,
                        extension: extension
                    });
                }
            }
        });
        
        // Add actions to form data
        const formData = ivrMenuModify.$formObj.form('get values');
        formData.actions = actions; // Pass as array, not JSON string
        
        settings.data = formData;
        return settings;
    },
    /**
     * Callback after form submission
     * Handles different save modes (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
     */
    cbAfterSendForm(response) {
        if (response.result) {
            if (response.data) {
                ivrMenuModify.populateForm(response.data);
            }
            
            // Update URL for new records
            const currentId = $('#id').val();
            if (!currentId && response.data && response.data.uniqid) {
                const newUrl = window.location.href.replace(/modify\/?$/, `modify/${response.data.uniqid}`);
                window.history.pushState(null, '', newUrl);
            }
        }
    },

    /**
     * Populate form with data
     */
    populateForm(data) {
        Form.$formObj.form('set values', data);
        
        // Initialize all forwarding dropdowns (including timeout_extension)
        ivrMenuModify.rebuildActionExtensionsDropdown();
        
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    }
};

/**
 * Checks if the number is taken by another account
 * @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
 */
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

/**
 *  Initialize IVR menu modify form on document ready
 */
$(document).ready(() => {
    ivrMenuModify.initialize();
});

