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

/* global $, globalRootUrl, globalTranslate, Extensions, Form, IncomingRoutesAPI, UserMessage, SoundFileSelector, SecurityUtils, FormElements, TooltipBuilder, DynamicDropdownBuilder, ExtensionSelector */

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
            // Load data from the source record for copying
            IncomingRoutesAPI.getRecord(copyId, (response) => {
                if (response.result && response.data) {
                    // Clear the ID for creating a new record
                    const copyData = { ...response.data };
                    delete copyData.id;
                    delete copyData.priority; // Let the server assign a new priority
                    
                    // Populate form with copied data
                    incomingRouteModify.populateForm(copyData);
                } else {
                    // V5.0: No fallback - show error and stop
                    const errorMessage = response.messages && response.messages.error ? 
                        response.messages.error.join(', ') : 
                        'Failed to load source data for copying';
                    UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
                }
            });
            return;
        }
        
        // Regular load or new record
        const recordId = incomingRouteModify.getRecordId();
        
        if (!recordId || recordId === 'new') {
            // New record - get default structure from API following V5.0 architecture
            IncomingRoutesAPI.getRecord('new', (response) => {
                if (response.result && response.data) {
                    // Populate form with default data structure from backend
                    incomingRouteModify.populateForm(response.data);
                } else {
                    // Fallback: initialize dropdowns with empty data if API fails
                    const emptyData = {};
                    DynamicDropdownBuilder.buildDropdown('providerid', emptyData, {
                        apiUrl: '/pbxcore/api/v2/providers/getForSelect',
                        apiParams: {
                            includeNone: true
                        },
                        emptyOption: {
                            key: 'none',
                            value: globalTranslate.ir_AnyProvider_v2
                        },
                        onChange: function(value, text) {
                            Form.dataChanged();
                        }
                    });
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
                // Initialize provider dropdown with data
                DynamicDropdownBuilder.buildDropdown('providerid', formData, {
                    apiUrl: '/pbxcore/api/v2/providers/getForSelect',
                    apiParams: {
                        includeNone: true
                    },
                    emptyOption: {
                        key: 'none',
                        value: globalTranslate.ir_AnyProvider_v2
                    },
                    onChange: function(value, text) {
                        Form.dataChanged();
                    }
                });
                
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
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = incomingRouteModify.$formObj.form('get values');
        
        // Additional client-side validation
        if (!IncomingRoutesAPI.validateRouteData(result.data)) {
            UserMessage.showError('Validation failed');
            return false;
        }
        
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
            
            // Update URL for new records
            const currentId = $('#id').val();
            if (!currentId && response.data.id) {
                const newUrl = window.location.href.replace(/modify\/?$/, 'modify/' + response.data.id);
                window.history.pushState(null, '', newUrl);
            }
        }
    },

    /**
     * Initialize tooltips for form fields
     */
    initializeTooltips() {
        // Configuration for each field tooltip
        const tooltipConfigs = {
            provider: {
                header: globalTranslate.ir_provider_tooltip_header,
                description: globalTranslate.ir_provider_tooltip_desc,
                list: [
                    globalTranslate.ir_provider_tooltip_item1,
                    globalTranslate.ir_provider_tooltip_item2,
                    {
                        term: globalTranslate.ir_provider_tooltip_priority_header,
                        definition: null
                    },
                    globalTranslate.ir_provider_tooltip_priority1,
                    globalTranslate.ir_provider_tooltip_priority2
                ],
                note: globalTranslate.ir_provider_tooltip_example
            },

            number: {
                header: globalTranslate.ir_number_tooltip_header,
                description: globalTranslate.ir_number_tooltip_desc,
                list: [
                    {
                        term: globalTranslate.ir_number_tooltip_types_header,
                        definition: null
                    },
                    globalTranslate.ir_number_tooltip_type1,
                    globalTranslate.ir_number_tooltip_type2,
                    globalTranslate.ir_number_tooltip_type3,
                    globalTranslate.ir_number_tooltip_type4,
                    {
                        term: globalTranslate.ir_number_tooltip_masks_header,
                        definition: null
                    },
                    globalTranslate.ir_number_tooltip_mask1,
                    globalTranslate.ir_number_tooltip_mask2,
                    globalTranslate.ir_number_tooltip_mask3,
                    globalTranslate.ir_number_tooltip_mask4,
                    globalTranslate.ir_number_tooltip_mask5
                ],
                list2: [
                    {
                        term: globalTranslate.ir_number_tooltip_priority_header,
                        definition: null
                    },
                    globalTranslate.ir_number_tooltip_priority1,
                    globalTranslate.ir_number_tooltip_priority2,
                    globalTranslate.ir_number_tooltip_priority3,
                    globalTranslate.ir_number_tooltip_priority4
                ],
                note: globalTranslate.ir_number_tooltip_note
            },

            audio_message_id: {
                header: globalTranslate.ir_audio_message_id_tooltip_header,
                description: globalTranslate.ir_audio_message_id_tooltip_desc,
                list: [
                    {
                        term: globalTranslate.ir_audio_message_id_tooltip_when_header,
                        definition: null
                    },
                    globalTranslate.ir_audio_message_id_tooltip_when1,
                    globalTranslate.ir_audio_message_id_tooltip_when2,
                    globalTranslate.ir_audio_message_id_tooltip_when3
                ],
                list2: [
                    {
                        term: globalTranslate.ir_audio_message_id_tooltip_targets_header,
                        definition: null
                    },
                    globalTranslate.ir_audio_message_id_tooltip_target1,
                    globalTranslate.ir_audio_message_id_tooltip_target2,
                    globalTranslate.ir_audio_message_id_tooltip_target3,
                    globalTranslate.ir_audio_message_id_tooltip_target4
                ],
                list3: [
                    {
                        term: globalTranslate.ir_audio_message_id_tooltip_examples_header,
                        definition: null
                    },
                    globalTranslate.ir_audio_message_id_tooltip_example1,
                    globalTranslate.ir_audio_message_id_tooltip_example2,
                    globalTranslate.ir_audio_message_id_tooltip_example3
                ]
            },

            timeout: {
                header: globalTranslate.ir_timeout_tooltip_header,
                description: globalTranslate.ir_timeout_tooltip_desc,
                list: [
                    {
                        term: globalTranslate.ir_timeout_tooltip_behavior_header,
                        definition: null
                    },
                    globalTranslate.ir_timeout_tooltip_behavior1,
                    globalTranslate.ir_timeout_tooltip_behavior2,
                    globalTranslate.ir_timeout_tooltip_behavior3,
                    globalTranslate.ir_timeout_tooltip_behavior4
                ],
                list2: [
                    {
                        term: globalTranslate.ir_timeout_tooltip_values_header,
                        definition: null
                    },
                    globalTranslate.ir_timeout_tooltip_value1,
                    globalTranslate.ir_timeout_tooltip_value2,
                    globalTranslate.ir_timeout_tooltip_value3
                ],
                list3: [
                    {
                        term: globalTranslate.ir_timeout_tooltip_chain_header,
                        definition: null
                    },
                    globalTranslate.ir_timeout_tooltip_chain1,
                    globalTranslate.ir_timeout_tooltip_chain2,
                    globalTranslate.ir_timeout_tooltip_chain3
                ]
            }
        };

        // Use TooltipBuilder to initialize tooltips
        TooltipBuilder.initialize(tooltipConfigs);
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