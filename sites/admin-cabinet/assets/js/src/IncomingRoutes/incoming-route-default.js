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

/* global $, globalTranslate, Extensions, Form, IncomingRoutesAPI, SecurityUtils, SoundFilesSelector, UserMessage */

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
    $actionDropdown: $('#action'),
    
    /**
     * Extension dropdown element
     * @type {jQuery}
     */
    $extensionDropdown: $('.forwarding-select'),
    
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
        // Initialize audio message dropdown with HTML icons support (like in modify form)
        SoundFilesSelector.initializeWithIcons(incomingRouteDefault.audioMessageId, () => {
            Form.dataChanged();
        });
        
        // Setup action dropdown with change handler
        incomingRouteDefault.$actionDropdown.dropdown({
            onChange: incomingRouteDefault.onActionChange.bind(incomingRouteDefault)
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
                // Initialize empty form with dropdowns
                incomingRouteDefault.initializeDropdowns();
                
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
     */
    initializeDropdowns() {
        // Initialize extension dropdown
        const extensionSettings = Extensions.getDropdownSettingsForRouting();
        extensionSettings.onChange = function(value, text, $selectedItem) {
            // Simply update the hidden input
            // All special values (hangup, busy, voicemail, did2user) are handled as extensions
            $('#extension').val(value);
            // Mark form as changed
            Form.dataChanged();
        };
        
        // Clear and reinitialize extension dropdown
        incomingRouteDefault.$extensionDropdown.dropdown('destroy');
        incomingRouteDefault.$extensionDropdown.dropdown(extensionSettings);
        
        // Audio dropdown is initialized once in initialize() method
        // No need to initialize it here again
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
        
        // Set basic form values
        incomingRouteDefault.$formObj.form('set values', {
            id: data.id,
            action: action,
            audio_message_id: data.audio_message_id || ''
        });
        
        // Initialize dropdowns
        incomingRouteDefault.initializeDropdowns();
        
        // Set extension value if exists (including special values like hangup, busy, voicemail, did2user)
        if (data.extension) {
            setTimeout(() => {
                incomingRouteDefault.$extensionDropdown.dropdown('set selected', data.extension);
                
                // Update display text if available
                if (data.extensionName) {
                    const safeText = SecurityUtils.sanitizeExtensionsApiContent(data.extensionName);
                    incomingRouteDefault.$extensionDropdown.find('.text')
                        .removeClass('default')
                        .html(safeText);
                }
            }, 100);
        }
        
        // Setup audio message dropdown with HTML content (like in modify form)
        if (data.audio_message_id && data.audio_message_id_Represent) {
            SoundFilesSelector.setInitialValueWithIcon(
                incomingRouteDefault.audioMessageId,
                data.audio_message_id,
                data.audio_message_id_Represent
            );
        } else if (data.audio_message_id) {
            // If we don't have representation, just set the value
            $(`.${incomingRouteDefault.audioMessageId}-select`).dropdown('set selected', data.audio_message_id);
        }
        
        // Update field visibility
        incomingRouteDefault.onActionChange();
        
        // Re-initialize dirty checking if enabled
        if (Form.enableDirrity) {
            Form.initializeDirrity();
        }
    },
    
    /**
     * Handle action dropdown change
     */
    onActionChange() {
        const action = incomingRouteDefault.$formObj.form('get value', 'action');
        
        if (action === 'extension') {
            // Show extension, hide audio
            $('#extension-group').show();
            $('#audio-group').hide();
            // Clear audio message
            $(`.${incomingRouteDefault.audioMessageId}-select`).dropdown('clear');
            $(`#${incomingRouteDefault.audioMessageId}`).val('');
        } else if (action === 'playback') {
            // Show audio, hide extension
            $('#extension-group').hide();
            $('#audio-group').show();
            // Clear extension
            incomingRouteDefault.$extensionDropdown.dropdown('clear');
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
        
        // Validation
        if (!IncomingRoutesAPI.validateRouteData(result.data)) {
            UserMessage.showError('Validation failed');
            return false;
        }
        
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