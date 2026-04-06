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

/* global $, globalRootUrl, globalTranslate, Extensions, Form, IncomingRoutesAPI, ProvidersAPI, UserMessage, SoundFileSelector, SecurityUtils, FormElements, IncomingRouteTooltipManager, DynamicDropdownBuilder, ExtensionSelector */

/**
 * Object for managing incoming route record
 *
 * @module incomingRouteModify
 */
const incomingRouteModify = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#incoming-route-form'),

    $forwardingSelectDropdown: $('.forwarding-select'),

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ir_ValidateForwardingToBeFilled,
                },
            ],
        },
        timeout: {
            identifier: 'timeout',
            rules: [
                {
                    type: 'integer[3..7400]',
                    prompt: globalTranslate.ir_ValidateTimeoutOutOfRange,
                },
            ],
        },
    },

    /**
     * Initialize the object
     */
    initialize() {
        // Note: Sound file selector will be initialized in populateForm() with proper data

        // Initialize the form
        incomingRouteModify.initializeForm();

        // Setup auto-resize for note textarea with event handlers
        $('textarea[name="note"]').on('input paste keyup', function() {
            FormElements.optimizeTextareaSize($(this));
        });

        // Initialize tooltips for form fields
        incomingRouteModify.initializeTooltips();

        // Note: Provider dropdown will be initialized after data is loaded
        
        // Note: Extension dropdowns will be initialized after data is loaded
        // to ensure proper display of selected values
        
        // Load form data via API
        incomingRouteModify.loadFormData();
    },
    
    
    /**
     * Initialize extension dropdown with settings
     * @param {object} data - Form data including current values and representations
     */
    initializeExtensionDropdown(data = {}) {
        // Initialize extension dropdown using specialized ExtensionSelector
        ExtensionSelector.init('extension', {
            type: 'routing',
            includeEmpty: false,
            additionalClasses: ['forwarding-select'],
            data: data,
            onChange: (value, text, $selectedItem) => {
                // Update hidden field
                $('#extension').val(value).trigger('change');
                // Mark form as changed
                Form.dataChanged();
            }
        });
    },
    
    /**
     * Load form data via REST API
     */
    loadFormData() {
        // Check if this is a copy operation
        const urlParams = new URLSearchParams(window.location.search);
        const copyId = urlParams.get('copy');
        
        if (copyId) {
            // Use the new RESTful copy method: /incoming-routes/{id}:copy with POST
            IncomingRoutesAPI.callCustomMethod('copy', {id: copyId}, (response) => {
                if (response.result && response.data) {
                    // Populate form with copied data (ID and priority are already handled by backend)
                    incomingRouteModify.populateForm(response.data);
                } else {
                    // V5.0: No fallback - show error and stop
                    const errorMessage = response.messages && response.messages.error ? 
                        response.messages.error.join(', ') : 
                        'Failed to copy incoming route data';
                    UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
                }
            }, 'POST'); // Specify POST method for copy operation
            return;
        }
        
        // Regular load or new record
        const recordId = incomingRouteModify.getRecordId();
        
        if (!recordId || recordId === 'new') {
            // New record - get default structure from API following V5.0 architecture
            IncomingRoutesAPI.getRecord('', (response) => {
                if (response.result && response.data) {
                    // Populate form with default data structure from backend
                    incomingRouteModify.populateForm(response.data);
                } else {
                    // Fallback: initialize dropdowns with empty data if API fails
                    const emptyData = {};
                    DynamicDropdownBuilder.buildDropdown('providerid', emptyData, {
                        apiUrl: '/pbxcore/api/v3/providers:getForSelect',
                        apiParams: {
                            includeNone: true
                        },
                        emptyOption: {
                            key: 'none',
                            value: globalTranslate.ir_AnyProvider_v2
                        },
                        onChange: function(value, text) {
                            Form.dataChanged();
                            incomingRouteModify.reloadDIDSuggestions(value);
                        }
                    });
                    incomingRouteModify.initializeDIDDropdown(emptyData);
                    incomingRouteModify.initializeExtensionDropdown();
                    
                    // Show error if API failed
                    if (response.messages && response.messages.error) {
                        const errorMessage = response.messages.error.join(', ');
                        UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
                    }
                }
            });
            return;
        }
        
        IncomingRoutesAPI.getRecord(recordId, (response) => {
            if (response.result && response.data) {
                // Populate form with data
                incomingRouteModify.populateForm(response.data);
            } else {
                // V5.0: No fallback - show error and stop
                const errorMessage = response.messages && response.messages.error ? 
                    response.messages.error.join(', ') : 
                    'Failed to load incoming route data';
                UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
            }
        });
    },
    
    /**
     * Get record ID from URL
     * 
     * @return {string} Record ID
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
     * Populate form with data
     * 
     * @param {object} data - Form data
     */
    populateForm(data) {
        // Check if this is a copy operation
        const urlParams = new URLSearchParams(window.location.search);
        const isCopy = urlParams.has('copy');
        
        // Use unified silent population approach
        Form.populateFormSilently(data, {
            afterPopulate: (formData) => {
                // Initialize provider dropdown with data using v3 API
                DynamicDropdownBuilder.buildDropdown('providerid', formData, {
                    apiUrl: '/pbxcore/api/v3/providers:getForSelect',
                    apiParams: {
                        includeNone: true
                    },
                    emptyOption: {
                        key: 'none',
                        value: globalTranslate.ir_AnyProvider_v2
                    },
                    onChange: function(value, text) {
                        Form.dataChanged();
                        incomingRouteModify.reloadDIDSuggestions(value);
                    }
                });

                // Initialize DID number dropdown with CDR suggestions
                incomingRouteModify.initializeDIDDropdown(formData);

                // Initialize extension dropdown with current value and representation
                const extensionValue = formData.extension || null;
                const extensionText = formData.extension_represent || null;
                
                // Initialize extension dropdown once with all data
                incomingRouteModify.initializeExtensionDropdown({
                    extension: extensionValue,
                    extension_represent: extensionText
                });
                
                // Initialize sound file selector with loaded data FIRST
                const audioData = {
                    audio_message_id: formData.audio_message_id || '',
                    audio_message_id_represent: formData.audio_message_id_represent || ''
                };
                
                SoundFileSelector.init('audio_message_id', {
                    category: 'custom',
                    includeEmpty: true,
                    data: audioData,
                    onChange: () => {
                        Form.dataChanged();
                    }
                });
                
                // If this is a copy operation, mark form as changed to enable save button
                if (isCopy) {
                    // Enable save button for copy operation
                    Form.dataChanged();
                } else {
                    // Re-initialize dirrity if enabled for regular edit
                    if (Form.enableDirrity) {
                        Form.initializeDirrity();
                    }
                }
            }
        });
        
        // Auto-resize textarea after data is loaded
        // Use setTimeout to ensure DOM is fully updated
        setTimeout(() => {
            FormElements.optimizeTextareaSize('textarea[name="note"]');
        }, 100);
    },

    /**
     * Initialize DID number dropdown with CDR suggestions
     * @param {object} data - Form data including current number value and providerid
     */
    initializeDIDDropdown(data = {}) {
        const currentProviderId = data.providerid || 'none';
        const numberData = {
            number: data.number || '',
            number_represent: data.number || '',
        };

        DynamicDropdownBuilder.buildDropdown('number', numberData, {
            apiUrl: '/pbxcore/api/v3/incoming-routes:getUniqueDIDs',
            apiParams: { providerid: currentProviderId },
            allowAdditions: true,
            emptyOption: {
                key: '',
                value: '&nbsp;'
            },
            additionalClasses: ['search'],
            placeholder: globalTranslate.ir_DidNumberPlaceholder || '',
            cache: false,
            onChange: function(value, text) {
                Form.dataChanged();
            }
        });
    },

    /**
     * Reload DID suggestions when provider changes
     * @param {string} providerId - New provider ID
     */
    reloadDIDSuggestions(providerId) {
        const newProviderId = (!providerId || providerId === 'none') ? 'none' : providerId;
        const currentNumber = $('#number').val() || '';
        const numberData = {
            number: currentNumber,
            number_represent: currentNumber,
        };

        DynamicDropdownBuilder.buildDropdown('number', numberData, {
            apiUrl: '/pbxcore/api/v3/incoming-routes:getUniqueDIDs',
            apiParams: { providerid: newProviderId },
            allowAdditions: true,
            emptyOption: {
                key: '',
                value: '&nbsp;'
            },
            additionalClasses: ['search'],
            placeholder: globalTranslate.ir_DidNumberPlaceholder || '',
            cache: false,
            onChange: function(value, text) {
                Form.dataChanged();
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
        result.data = incomingRouteModify.$formObj.form('get values');
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        if (response.result && response.data) {
            // Update form with response data
            incomingRouteModify.populateForm(response.data);

            // Form.js will handle all redirect logic based on submitMode
        }
    },

    /**
     * Initialize tooltips for form fields using IncomingRouteTooltipManager
     */
    initializeTooltips() {
        // Delegate tooltip initialization to IncomingRouteTooltipManager
        IncomingRouteTooltipManager.initialize();
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = incomingRouteModify.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = incomingRouteModify.validateRules;
        Form.cbBeforeSendForm = incomingRouteModify.cbBeforeSendForm;
        Form.cbAfterSendForm = incomingRouteModify.cbAfterSendForm;
        
        // REST API integration
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = IncomingRoutesAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Navigation URLs
        Form.afterSubmitIndexUrl = globalRootUrl + 'incoming-routes/index/';
        Form.afterSubmitModifyUrl = globalRootUrl + 'incoming-routes/modify/';
        
        Form.initialize();
    },
};


/**
 *  Initialize incoming route edit form on document ready
 */
$(document).ready(() => {
    incomingRouteModify.initialize();
});