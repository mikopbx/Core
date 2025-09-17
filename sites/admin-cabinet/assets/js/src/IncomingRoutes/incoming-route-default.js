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

/* global $, globalTranslate, Extensions, Form, SecurityUtils, SoundFileSelector, UserMessage, DynamicDropdownBuilder, ExtensionSelector, IncomingRoutesAPI */

/**
 * Module for managing default incoming route
 * This module handles the default route form on the index page
 * using the same REST API approach as the modify page
 *
 * @module incomingRouteDefault
 */
const incomingRouteDefault = {
    /**
     * jQuery object for the form
     * @type {jQuery}
     */
    $formObj: $('#default-rule-form'),
    
    /**
     * Action dropdown element
     * @type {jQuery}
     */
    $actionDropdown: $('#action-dropdown'),
    
    /**
     * Extension dropdown element (will be created by DynamicDropdownBuilder)
     * @type {jQuery}
     */
    get $extensionDropdown() {
        return $('#extension-dropdown');
    },
    
    /**
     * Audio message dropdown element selector
     * @type {string}
     */
    audioMessageId: 'audio_message_id',
    
    /**
     * Default route record ID (always '1' for default route)
     * @type {string}
     */
    defaultRouteId: '1',
    
    // Note: Using DynamicDropdownBuilder now, no need for instance variables
    
    /**
     * Validation rules for the form
     * @type {object}
     */
    validateRules: {
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'extensionRule',
                    prompt: globalTranslate.ir_ValidateForwardingToBeFilled,
                },
            ],
        },
        audio_message_id: {
            identifier: 'audio_message_id',
            rules: [
                {
                    type: 'audioMessageRule',
                    prompt: globalTranslate.ir_ValidateAudioMessageToBeFilled,
                },
            ],
        },
    },
    
    /**
     * Initialize the default route module
     */
    initialize() {
        // Initialize action dropdown - this is a static dropdown handled by HTML/CSS only
        // The DynamicDropdownBuilder is not needed here as it's a simple static dropdown
        incomingRouteDefault.$actionDropdown.dropdown({
            onChange: (value) => {
                incomingRouteDefault.onActionChange();
                Form.dataChanged();
            }
        });
        
        // Initialize form submission handling
        incomingRouteDefault.initializeForm();
        
        // Initially hide audio group (it has display:none in HTML but just to be safe)
        $('#audio-group').hide();
        
        // Load default route data and initialize dropdowns
        incomingRouteDefault.loadData();
    },
    
    /**
     * Load default route data from API
     */
    loadData() {
        IncomingRoutesAPI.getRecord(incomingRouteDefault.defaultRouteId, (response) => {
            if (response.result && response.data) {
                incomingRouteDefault.populateForm(response.data);
            } else {
                // Initialize empty form with dropdowns (use empty data)
                incomingRouteDefault.populateForm({});
                
                // Show error if needed
                if (response.messages && response.messages.error) {
                    const errorMessage = response.messages.error.join(', ');
                    UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
                }
            }
        });
    },
    
    /**
     * Initialize dropdowns for the form
     * @param {object} data - Route data for initialization
     */
    initializeDropdowns(data = {}) {
        // Initialize extension dropdown using ExtensionSelector (same as modify page)
        ExtensionSelector.init('extension', {
            type: 'routing',
            includeEmpty: false,
            data: data,
            onChange: (value, text, $selectedItem) => {
                // Update hidden input
                $('#extension').val(value);
                // Mark form as changed
                Form.dataChanged();
            }
        });
        
        // Initialize sound file selector with data
        // Note: HTML already contains static dropdown structure, so we need to reinitialize properly
        const audioData = {
            audio_message_id: data.audio_message_id || '',
            audio_message_id_represent: data.audio_message_id_represent || ''
        };
        
        // Destroy any existing SoundFileSelector instance first
        if (SoundFileSelector.instances.has(incomingRouteDefault.audioMessageId)) {
            SoundFileSelector.destroy(incomingRouteDefault.audioMessageId);
        }
        
        SoundFileSelector.init(incomingRouteDefault.audioMessageId, {
            category: 'custom',
            includeEmpty: false,  // Default route must always have a sound file
            data: audioData,
            onChange: () => {
                Form.dataChanged();
            }
        });
    },
    
    /**
     * Populate form with data
     * @param {object} data - Default route data
     */
    populateForm(data) {
        // Simplified action determination - only extension or playback
        let action = 'extension'; // default
        if (data.action) {
            action = data.action;
        } else if (data.audio_message_id && data.audio_message_id !== '' && !data.extension) {
            action = 'playback';
        }
        
        // Use unified silent population approach
        Form.populateFormSilently({
            id: data.id,
            audio_message_id: data.audio_message_id || ''
        }, {
            afterPopulate: (formData) => {
                // Set action value in static dropdown (managed by HTML/CSS)
                $('#action').val(action);
                $('#action-dropdown').dropdown('set selected', action);
                
                // Initialize dropdowns with data
                incomingRouteDefault.initializeDropdowns(data);
                
                // Set extension value if exists (including special values like hangup, busy, voicemail, did2user)
                if (data.extension) {
                    // Set the value using ExtensionSelector - it will handle display text automatically
                    ExtensionSelector.setValue('extension', data.extension, data.extension_represent);
                }
                
                // Update field visibility
                incomingRouteDefault.onActionChange();
                
                // Re-initialize dirty checking if enabled
                if (Form.enableDirrity) {
                    Form.initializeDirrity();
                }
            }
        });
    },
    
    /**
     * Handle action dropdown change
     */
    onActionChange() {
        // Get action value from the dropdown or hidden input
        const action = $('#action').val() || $('#action-dropdown').dropdown('get value');
        
        if (action === 'extension') {
            // Show extension, hide audio
            $('#extension-group').show();
            $('#audio-group').hide();
            // Clear audio message
            SoundFileSelector.clear(incomingRouteDefault.audioMessageId);
        } else if (action === 'playback') {
            // Show audio, hide extension
            $('#extension-group').hide();
            $('#audio-group').show();
            // Clear extension using ExtensionSelector
            ExtensionSelector.setValue('extension', '');
            $('#extension').val('');
        }
    },
    
    /**
     * Callback before sending form
     * @param {object} settings - Form settings
     * @returns {object|boolean} Updated settings or false to cancel
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = incomingRouteDefault.$formObj.form('get values');
        
        // Set maximum timeout for default route (300 seconds)
        result.data.timeout = '300';
        
        // No special handling needed - hangup/busy/voicemail/did2user are now regular extensions
        
        // Client-side validation is no longer needed - server will validate
        
        return result;
    },
    
    /**
     * Callback after form submission
     * @param {object} response - Server response
     */
    cbAfterSendForm(response) {
        if (response.result) {
            // Reload data to ensure consistency
            incomingRouteDefault.loadData();
            
            // Show success message if configured
            if (response.messages && response.messages.success) {
                UserMessage.showMultiString(response.messages);
            }
        }
    },
    
    /**
     * Initialize form with REST API integration
     */
    initializeForm() {
        Form.$formObj = incomingRouteDefault.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = incomingRouteDefault.validateRules;
        Form.cbBeforeSendForm = incomingRouteDefault.cbBeforeSendForm;
        Form.cbAfterSendForm = incomingRouteDefault.cbAfterSendForm;
        
        // REST API integration
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = IncomingRoutesAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // No redirect after save - stay on the same page
        Form.afterSubmitIndexUrl = null;
        Form.afterSubmitModifyUrl = null;
        
        Form.initialize();
    }
};

/**
 * Custom validation rule for extension field
 * @param {string} value - Field value
 * @returns {boolean} Validation result
 */
$.fn.form.settings.rules.extensionRule = function (value) {
    // Check if extension is required and not provided
    if (($('#action').val() === 'extension') && (!value || value === '-1' || value === '')) {
        return false;
    }
    return true;
};

/**
 * Custom validation rule for audio message field
 * @param {string} value - Field value
 * @returns {boolean} Validation result
 */
$.fn.form.settings.rules.audioMessageRule = function (value) {
    // Check if audio message is required and not provided
    if (($('#action').val() === 'playback') && (!value || value === '-1' || value === '')) {
        return false;
    }
    return true;
};

// Export for use in other modules
window.incomingRouteDefault = incomingRouteDefault;