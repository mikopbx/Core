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

/* global $, globalRootUrl, globalTranslate, Extensions, Form, IncomingRoutesAPI, UserMessage, SoundFilesSelector, ProvidersAPI, SecurityUtils, FormElements, TooltipBuilder */

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

    $providerDropDown: $('.ui.dropdown#provider-dropdown'),
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
        // Initialize audio message dropdowns with HTML icons support
        SoundFilesSelector.initializeWithIcons('audio_message_id', () => {
            // Mark form as changed when dropdown value changes
            Form.dataChanged();
        });

        // Initialize the form
        incomingRouteModify.initializeForm();

        // Setup auto-resize for note textarea with event handlers
        $('textarea[name="note"]').on('input paste keyup', function() {
            FormElements.optimizeTextareaSize($(this));
        });

        // Initialize tooltips for form fields
        incomingRouteModify.initializeTooltips();

        // Note: Provider and Extension dropdowns will be initialized after data is loaded
        // to ensure proper display of selected values
        
        // Load form data via API
        incomingRouteModify.loadFormData();
    },
    
    /**
     * Initialize provider dropdown with settings
     */
    initializeProviderDropdown() {
        const providerSettings = ProvidersAPI.getDropdownSettings(() => {
            Form.dataChanged();
        });
        
        // Clear any existing initialization
        incomingRouteModify.$providerDropDown.dropdown('destroy');
        
        // Initialize fresh dropdown
        incomingRouteModify.$providerDropDown.dropdown(providerSettings);
    },
    
    /**
     * Initialize extension dropdown with settings
     */
    initializeExtensionDropdown() {
        const dropdownSettings = Extensions.getDropdownSettingsForRouting();
        dropdownSettings.onChange = function(value, text, $selectedItem) {
            // Update hidden input
            $('#extension').val(value).trigger('change');
            // Mark form as changed
            Form.dataChanged();
        };
        incomingRouteModify.$forwardingSelectDropdown.dropdown(dropdownSettings);
    },
    
    /**
     * Initialize dropdowns for new record
     */
    initializeDropdowns() {
        incomingRouteModify.initializeProviderDropdown();
        incomingRouteModify.initializeExtensionDropdown();
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
                    // Error loading source data for copy
                    incomingRouteModify.initializeDropdowns();
                    
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
        
        if (!recordId) {
            // New record - just initialize dropdowns
            incomingRouteModify.initializeDropdowns();
            return;
        }
        
        IncomingRoutesAPI.getRecord(recordId, (response) => {
            if (response.result && response.data) {
                // Populate form with data
                incomingRouteModify.populateForm(response.data);
            } else {
                // Error loading data, but still initialize dropdowns
                incomingRouteModify.initializeDropdowns();
                
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
        
        // Set form values
        Form.$formObj.form('set values', data);
        
        // Initialize dropdowns using shared methods
        incomingRouteModify.initializeProviderDropdown();
        incomingRouteModify.initializeExtensionDropdown();
        
        // Set provider value after dropdown is initialized
        // Note: provider can be 'none' or actual provider ID
        if (data.provider && data.provider !== 'none') {
            // For actual provider, set both value and text if available
            setTimeout(() => {
                incomingRouteModify.$providerDropDown.dropdown('set selected', data.provider);
                
                // If we have provider name, update the text to show it
                if (data.providerName) {
                    const safeProviderText = window.SecurityUtils ? 
                        window.SecurityUtils.sanitizeExtensionsApiContent(data.providerName) : 
                        data.providerName;
                    
                    incomingRouteModify.$providerDropDown.find('.text')
                        .removeClass('default')
                        .html(safeProviderText);
                }
            }, 150);
        } else {
            // For 'none', just set the selected value
            setTimeout(() => {
                incomingRouteModify.$providerDropDown.dropdown('set selected', 'none');
            }, 150);
        }
        
        if (data.extension) {
            // Small delay to ensure dropdown is fully initialized
            setTimeout(() => {
                // Set the value using dropdown method
                incomingRouteModify.$forwardingSelectDropdown.dropdown('set selected', data.extension);
                
                // If we have extensionName, update the display text
                if (data.extensionName) {
                    const safeText = window.SecurityUtils ? 
                        window.SecurityUtils.sanitizeExtensionsApiContent(data.extensionName) : 
                        data.extensionName;
                    
                    // Update the text display
                    incomingRouteModify.$forwardingSelectDropdown.find('.text')
                        .removeClass('default')
                        .html(safeText);
                }
            }, 100);
        }
        
        // Setup audio message dropdown with HTML content
        if (data.audio_message_id && data.audio_message_id_Represent) {
            SoundFilesSelector.setInitialValueWithIcon(
                'audio_message_id',
                data.audio_message_id,
                data.audio_message_id_Represent
            );
        } else if (data.audio_message_id) {
            // If we don't have representation, just set the value
            $('.audio_message_id-select').dropdown('set selected', data.audio_message_id);
        }
        
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