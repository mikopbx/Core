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

/* global globalRootUrl, globalTranslate, Form, ProvidersAPI, UserMessage, ClipboardJS, NetworkFiltersAPI, FormElements */

/**
 * Object for handling provider management form with REST API v2
 *
 * @module provider
 */
const provider = { 

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#save-provider-form'),

    /**
     * Provider unique ID
     */
    providerId: '',
    
    /**
     * Provider type (SIP or IAX)
     */
    providerType: '',

    /**
     * jQuery objects
     */
    $secret: $('#secret'),
    $additionalHostsDummy: $('#additional-hosts-table .dummy'),
    $checkBoxes: $('#save-provider-form .checkbox'),
    $accordions: $('#save-provider-form .ui.accordion'),
    $dropDowns: $('#save-provider-form .ui.dropdown'),
    $deleteRowButton: $('#additional-hosts-table .delete-row-button'),
    $qualifyToggle: $('#qualify'),
    $qualifyFreqToggle: $('#qualify-freq'),
    $additionalHostInput: $('#additional-host input'),
    $networkFilterDropdown: $('#networkfilterid'),
    
    /**
     * Host validation regex
     */
    hostInputValidation: new RegExp(
        '^(((\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}'
        + '(\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])'
        + '(\\/(\d|[1-2]\d|3[0-2]))?'
        + '|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+)$',
        'gm'
    ),
    
    hostRow: '#save-provider-form .host-row',

    /**
     * Validation rules
     */
    validationRules: {},

    /**
     * Initialize the provider modify form.
     */
    initialize() {
        // Get provider ID and type from page using jQuery val() instead of form('get value')
        // to avoid Semantic UI warning about old syntax
        provider.providerId = provider.$formObj.find('[name="uniqid"]').val();
        provider.providerType = $('#providerType').val() || 'SIP';
        
        // Initialize UI components FIRST (before loading data)
        provider.initializeUIComponents();
        
        // Setup event handlers
        provider.initializeEventHandlers();
        
        // Load provider data from REST API if editing
        if (provider.providerId) {
            provider.loadProviderData();
        } else {
            // New provider - initialize with defaults
            provider.initializeForm();
        }
    },
    
    /**
     * Load provider data from REST API
     */
    loadProviderData() {
        ProvidersAPI.getRecord(provider.providerId, provider.providerType, (response) => {
            if (response.result && response.data) {
                provider.populateForm(response.data);
                provider.initializeForm();
            } else {
                UserMessage.showMultiString(response.messages);
            }
        });
    },
    
    /**
     * Populate form with provider data
     */
    populateForm(data) {
        // Set form values
        Object.keys(data).forEach((key) => {
            const value = data[key];
            const $field = provider.$formObj.find(`[name="${key}"]`);
            
            if ($field.length > 0) {
                if ($field.is(':checkbox')) {
                    // Handle boolean values properly
                    const isChecked = value === true || value === 'true' || value === '1' || value === 1;
                    $field.prop('checked', isChecked);
                    
                    // Update Semantic UI checkbox
                    const $checkbox = $field.parent('.checkbox');
                    if ($checkbox.length > 0) {
                        $checkbox.checkbox(isChecked ? 'set checked' : 'set unchecked');
                    }
                } else if ($field.is('select')) {
                    // Set dropdown value
                    $field.dropdown('set selected', value);
                } else {
                    // Set regular input value
                    $field.val(value);
                }
            }
        });
        
        // Handle additional hosts for SIP
        if (provider.providerType === 'SIP' && data.additionalHosts) {
            provider.populateAdditionalHosts(data.additionalHosts);
        }
        
        // Trigger change events to update form state
        provider.$formObj.find('input, select, textarea').trigger('change');
    },
    
    /**
     * Populate additional hosts table
     */
    populateAdditionalHosts(hosts) {
        const $tbody = $('#additional-hosts-table tbody');
        
        hosts.forEach((host) => {
            if (host.address) {
                const $newRow = provider.$additionalHostsDummy.clone();
                $newRow.removeClass('dummy');
                $newRow.find('input').val(host.address);
                $newRow.show();
                $tbody.append($newRow);
            }
        });
    },
    
    /**
     * Initialize UI components
     */
    initializeUIComponents() {
        // Initialize Semantic UI components
        provider.$checkBoxes.checkbox();
        provider.$accordions.accordion();
        provider.$dropDowns.dropdown();
        
        // Base class already initializes these dropdowns
        
        // Initialize password visibility toggle
        provider.initializePasswordToggle();
        
        // Initialize password generator
        provider.initializePasswordGenerator();
        
        // Initialize clipboard
        provider.initializeClipboard();
        
        // Initialize qualify toggle
        provider.initializeQualifyToggle();
        
        // Initialize field tooltips
        provider.initializeFieldTooltips();
        
        // Initialize popuped buttons
        $('.popuped').popup();
    },
    
    /**
     * Initialize registration type dropdown - DEPRECATED
     * This method is now in provider-base-modify.js
     * @deprecated Use base class method instead
     */
    initializeRegistrationTypeDropdown_OLD() {
        const $registrationTypeField = $('#registration_type');
        if ($registrationTypeField.length === 0) {
            return;
        }
        
        // Get current value from hidden field
        const currentValue = $registrationTypeField.val() || 'outbound';
        
        // Determine translation keys based on provider type
        const translationPrefix = provider.providerType === 'IAX' ? 'iax_' : 'sip_';
        
        // Create dropdown HTML
        const dropdownHtml = `
            <div class="ui selection dropdown" id="registration_type_dropdown">
                <input type="hidden" id="registration_type" name="registration_type" value="${currentValue}">
                <i class="dropdown icon"></i>
                <div class="default text">${globalTranslate[translationPrefix + 'REG_TYPE_' + currentValue.toUpperCase()] || currentValue}</div>
                <div class="menu">
                    <div class="item" data-value="outbound">${globalTranslate[translationPrefix + 'REG_TYPE_OUTBOUND'] || 'Outbound registration'}</div>
                    <div class="item" data-value="inbound">${globalTranslate[translationPrefix + 'REG_TYPE_INBOUND'] || 'Inbound registration'}</div>
                    <div class="item" data-value="none">${globalTranslate[translationPrefix + 'REG_TYPE_NONE'] || 'No registration'}</div>
                </div>
            </div>
        `;
        
        // Replace hidden field with dropdown
        $registrationTypeField.replaceWith(dropdownHtml);
        
        // Initialize the dropdown
        $('#registration_type_dropdown').dropdown({
            onChange: (value) => {
                // Trigger change event on the hidden input
                $('#registration_type').trigger('change');
            }
        });
        
        // Set initial value
        $('#registration_type_dropdown').dropdown('set selected', currentValue);
    },
    
    /**
     * Initialize DTMF mode dropdown - DEPRECATED
     * This method is now in provider-base-modify.js
     * @deprecated Use base class method instead
     */
    initializeDtmfModeDropdown_OLD() {
        const $dtmfModeField = $('#dtmfmode');
        if ($dtmfModeField.length === 0) {
            return;
        }
        
        // Get current value from hidden field
        const currentValue = $dtmfModeField.val() || 'auto';
        
        // DTMF mode options (same as in ExtensionEditForm.php)
        const dtmfOptions = [
            {
                value: 'auto',
                text: globalTranslate.auto || 'Auto'
            },
            {
                value: 'inband',
                text: globalTranslate.inband || 'Inband'
            },
            {
                value: 'info',
                text: globalTranslate.info || 'SIP INFO'
            },
            {
                value: 'rfc4733',
                text: globalTranslate.rfc4733 || 'RFC 4733'
            },
            {
                value: 'auto_info',
                text: globalTranslate.auto_info || 'Auto + SIP INFO'
            }
        ];
        
        // Create dropdown HTML
        let dropdownHtml = `
            <div class=\"ui selection dropdown\" id=\"dtmfmode_dropdown\">
                <input type=\"hidden\" id=\"dtmfmode\" name=\"dtmfmode\" value=\"${currentValue}\">
                <i class=\"dropdown icon\"></i>
                <div class=\"default text\">${dtmfOptions.find(opt => opt.value === currentValue)?.text || currentValue}</div>
                <div class=\"menu\">`;
        
        // Add options to dropdown
        dtmfOptions.forEach(option => {
            dropdownHtml += `<div class=\"item\" data-value=\"${option.value}\">${option.text}</div>`;
        });
        
        dropdownHtml += `
                </div>
            </div>
        `;
        
        // Replace hidden field with dropdown
        $dtmfModeField.replaceWith(dropdownHtml);
        
        // Initialize the dropdown
        $('#dtmfmode_dropdown').dropdown({
            onChange: (value) => {
                // Trigger change event on the hidden input for any validation logic
                $('#dtmfmode').trigger('change');
                // Mark form as changed
                Form.dataChanged();
            }
        });
        
        // Set initial value
        $('#dtmfmode_dropdown').dropdown('set selected', currentValue);
    },
    
    /**
     * Initialize event handlers
     */
    initializeEventHandlers() {
        // Registration type change handler
        $('#registration_type').on('change', provider.cbChangeRegistrationType);
        
        // Add host button handler
        $('#add-new-host').on('click', provider.cbOnCompleteHostAddress);
        
        // Delete host button handler
        $('body').on('click', '.delete-row-button', provider.cbDeleteAdditionalHost);
        
        // Additional host input validation
        provider.$additionalHostInput.on('blur', provider.cbOnCompleteHostAddress);
        provider.$additionalHostInput.on('keypress', function(e) {
            if (e.which === 13) {
                provider.cbOnCompleteHostAddress();
                return false;
            }
        });
        
        // Disablefromuser checkbox handler for SIP providers
        if (provider.providerType === 'SIP') {
            $('#disablefromuser input').on('change', () => {
                const $fromUser = $('#divFromUser');
                if ($('#disablefromuser').checkbox('is checked')) {
                    $fromUser.hide();
                    $fromUser.removeClass('visible');
                } else {
                    $fromUser.show();
                    $fromUser.addClass('visible');
                }
                Form.dataChanged();
            });
        }
        
        // Handle receive_calls_without_auth checkbox for IAX providers
        if (provider.providerType === 'IAX') {
            const $warningMessage = $('#elReceiveCalls').next('.warning.message');
            const $checkboxInput = $('#receive_calls_without_auth');
            
            // Function to update warning message state
            function updateWarningState() {
                if ($checkboxInput.prop('checked')) {
                    $warningMessage.removeClass('hidden');
                } else {
                    $warningMessage.addClass('hidden');
                }
            }
            
            // Initialize warning state
            updateWarningState();
            
            // Handle checkbox changes
            $('#receive_calls_without_auth.checkbox').checkbox({
                onChecked: function() {
                    $warningMessage.removeClass('hidden').transition('fade in');
                    // Re-validate form when this changes
                    const isValid = provider.$formObj.form('is valid', 'secret');
                    if (!isValid) {
                        provider.$formObj.form('validate field', 'secret');
                    }
                    Form.dataChanged();
                },
                onUnchecked: function() {
                    $warningMessage.transition('fade out', function() {
                        $warningMessage.addClass('hidden');
                    });
                    Form.dataChanged();
                }
            });
        }
    },
    
    /**
     * Initialize form for submission
     */
    initializeForm() {
        // Get initial registration type and update field visibility
        const registrationType = provider.$formObj.find('[name="registration_type"]').val() || 'outbound';
        
        // Update field visibility first
        provider.updateFieldVisibility(registrationType);
        
        // Set validation rules based on registration type
        provider.updateValidationRules(registrationType);
        
        // Initialize Form object using standard pattern
        Form.$formObj = provider.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = provider.validationRules;
        Form.cbBeforeSendForm = provider.cbBeforeSendForm;
        Form.cbAfterSendForm = provider.cbAfterSendForm;
        
        // REST API integration - standard pattern
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = ProvidersAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Navigation URLs
        Form.afterSubmitIndexUrl = globalRootUrl + 'providers/index/';
        Form.afterSubmitModifyUrl = globalRootUrl + 'providers/modify/';
        
        Form.initialize();
        
        // Setup auto-resize for textareas after form initialization
        provider.initializeAutoResizeTextareas();
    },
    
    /**
     * Update validation rules based on registration type
     */
    updateValidationRules(registrationType) {
        // Base validation - description is always required
        const baseRules = {
            description: {
                identifier: 'description',
                rules: [{
                    type: 'empty',
                    prompt: globalTranslate.pr_ValidationProviderNameIsEmpty,
                }],
            },
        };
        
        if (provider.providerType === 'SIP') {
            if (registrationType === 'outbound') {
                // OUTBOUND: Full validation
                provider.validationRules = {
                    ...baseRules,
                    host: {
                        identifier: 'host',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
                        }],
                    },
                    username: {
                        identifier: 'username',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                        }],
                    },
                    secret: {
                        identifier: 'secret',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty,
                        }],
                    },
                    port: {
                        identifier: 'port',
                        rules: [
                            {
                                type: 'empty',
                                prompt: globalTranslate.pr_ValidationProviderPortIsEmpty,
                            },
                            {
                                type: 'integer[1..65535]',
                                prompt: globalTranslate.pr_ValidationProviderPortRange || 'Port must be between 1 and 65535',
                            },
                        ],
                    },
                };
            } else if (registrationType === 'inbound') {
                // INBOUND: Host and port optional, username/secret required
                provider.validationRules = {
                    ...baseRules,
                    username: {
                        identifier: 'username',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                        }],
                    },
                    secret: {
                        identifier: 'secret',
                        rules: [
                            {
                                type: 'empty',
                                prompt: globalTranslate.pr_ValidationProviderPasswordEmpty,
                            },
                            {
                                type: 'minLength[8]',
                                prompt: globalTranslate.pr_ValidationProviderPasswordTooShort || 'Password must be at least 8 characters',
                            },
                        ],
                    },
                };
            } else if (registrationType === 'none') {
                // NONE: IP authentication - host/port required, no auth
                provider.validationRules = {
                    ...baseRules,
                    host: {
                        identifier: 'host',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
                        }],
                    },
                    port: {
                        identifier: 'port',
                        rules: [
                            {
                                type: 'empty',
                                prompt: globalTranslate.pr_ValidationProviderPortIsEmpty,
                            },
                            {
                                type: 'integer[1..65535]',
                                prompt: globalTranslate.pr_ValidationProviderPortRange || 'Port must be between 1 and 65535',
                            },
                        ],
                    },
                };
            }
        } else if (provider.providerType === 'IAX') {
            // IAX provider validation rules
            if (registrationType === 'outbound') {
                // OUTBOUND: Full validation
                provider.validationRules = {
                    ...baseRules,
                    host: {
                        identifier: 'host',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
                        }],
                    },
                    username: {
                        identifier: 'username',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                        }],
                    },
                    secret: {
                        identifier: 'secret',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty,
                        }],
                    },
                    port: {
                        identifier: 'port',
                        rules: [
                            {
                                type: 'empty',
                                prompt: globalTranslate.pr_ValidationProviderPortIsEmpty,
                            },
                            {
                                type: 'integer[1..65535]',
                                prompt: globalTranslate.pr_ValidationProviderPortRange || 'Port must be between 1 and 65535',
                            },
                        ],
                    },
                };
            } else if (registrationType === 'inbound') {
                // INBOUND: Port optional, host optional, username/secret required
                provider.validationRules = {
                    ...baseRules,
                    username: {
                        identifier: 'username',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                        }],
                    },
                    secret: {
                        identifier: 'secret',
                        rules: [
                            {
                                type: 'empty',
                                prompt: globalTranslate.pr_ValidationProviderPasswordEmpty,
                            },
                            {
                                type: 'minLength[8]',
                                prompt: globalTranslate.pr_ValidationProviderPasswordTooShort || 'Password must be at least 8 characters',
                            },
                        ],
                    },
                };
            } else if (registrationType === 'none') {
                // NONE: All fields required for peer-to-peer
                provider.validationRules = {
                    ...baseRules,
                    host: {
                        identifier: 'host',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
                        }],
                    },
                    username: {
                        identifier: 'username',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                        }],
                    },
                    secret: {
                        identifier: 'secret',
                        rules: [{
                            type: 'empty',
                            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty,
                        }],
                    },
                    port: {
                        identifier: 'port',
                        rules: [
                            {
                                type: 'empty',
                                prompt: globalTranslate.pr_ValidationProviderPortIsEmpty,
                            },
                            {
                                type: 'integer[1..65535]',
                                prompt: globalTranslate.pr_ValidationProviderPortRange || 'Port must be between 1 and 65535',
                            },
                        ],
                    },
                };
            }
        }
    },
    
    /**
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = provider.$formObj.form('get values');
        
        // Add provider type
        result.data.type = provider.providerType;
        
        // Convert checkbox values to proper booleans
        const booleanFields = ['disabled', 'qualify', 'disablefromuser', 'noregister', 'receive_calls_without_auth'];
        booleanFields.forEach((field) => {
            if (result.data.hasOwnProperty(field)) {
                // Convert various checkbox representations to boolean
                result.data[field] = result.data[field] === true || 
                                     result.data[field] === 'true' || 
                                     result.data[field] === '1' || 
                                     result.data[field] === 'on';
            }
        });
        
        // Handle additional hosts for SIP
        if (provider.providerType === 'SIP') {
            const additionalHosts = [];
            $('#additional-hosts-table tbody tr:not(.dummy)').each(function() {
                const address = $(this).find('input').val();
                if (address) {
                    additionalHosts.push({address: address});
                }
            });
            result.data.additionalHosts = additionalHosts;
        }
        
        // Additional client-side validation if needed
        if (!ProvidersAPI.validateProviderData) {
            // If no validation method exists, just return the result
            return result;
        }
        
        if (!ProvidersAPI.validateProviderData(result.data)) {
            UserMessage.showError('Validation failed');
            return false;
        }
        
        return result;
    },
    
    /**
     * Callback after form submission
     */
    cbAfterSendForm(response) {
        if (response.result && response.data) {
            // Update form with response data
            provider.populateForm(response.data);
            
            // Update URL for new records
            const currentId = $('#uniqid').val();
            if (!currentId && response.data.id) {
                const newUrl = window.location.href.replace(/modify\/?$/, 'modify' + provider.providerType.toLowerCase() + '/' + response.data.id);
                window.history.pushState(null, '', newUrl);
            }
        }
    },
    
    /**
     * Registration type change handler
     */
    cbChangeRegistrationType() {
        const registrationType = provider.$formObj.find('[name="registration_type"]').val();
        
        // Update field visibility based on registration type
        provider.updateFieldVisibility(registrationType);
        
        // Update validation rules
        provider.updateValidationRules(registrationType);
        
        // Clear validation errors for fields that are now hidden
        provider.$formObj.find('.field').removeClass('error');
        provider.$formObj.find('.ui.error.message').remove();
        provider.$formObj.find('.prompt').remove();
        
        // Update Form.validateRules for next submit
        if (Form.validateRules) {
            Form.validateRules = provider.validationRules;
        }
        
        // Mark form as changed
        Form.dataChanged();
        
        // Re-validate form to update UI
        setTimeout(() => {
            provider.$formObj.form('is valid');
        }, 100);
    },
    
    /**
     * Update field visibility based on registration type
     */
    updateFieldVisibility(registrationType) {
        // Get element references
        const $elHost = $('#elHost');
        const $elUsername = $('#elUsername');
        const $elSecret = $('#elSecret');
        const $elPort = $('#elPort');
        const $elReceiveCalls = $('#elReceiveCalls');
        const $elAdditionalHost = $('#elAdditionalHosts');
        const $valUserName = $('#username');
        const $valSecret = provider.$secret;
        const $elUniqId = $('#uniqid');
        const $genPassword = $('#generate-password-button');
        const $copyButton = $('#clipboard-password-button');
        const $showHideButton = $('#show-password-button');
        
        // Get label elements
        const $labelHost = $('label[for="host"]');
        const $labelPort = $('label[for="port"]');
        const $labelUsername = $('label[for="username"]');
        const $labelSecret = $('label[for="secret"]');
        
        if (provider.providerType === 'SIP') {
            // Reset username only when switching from inbound to other types
            if ($valUserName.val() === $elUniqId.val() && registrationType !== 'inbound') {
                $valUserName.val('');
            }
            $valUserName.removeAttr('readonly');
            
            // Update element visibility based on registration type
            if (registrationType === 'outbound') {
                // OUTBOUND: We register to provider
                $elHost.show();
                $elPort.show();
                $elUsername.show();
                $elSecret.show();
                $elAdditionalHost.show();
                $genPassword.hide();
                $copyButton.hide();
                $showHideButton.show();
                
                // Update labels
                $labelHost.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP');
                $labelPort.text(globalTranslate.pr_ProviderPort || 'Provider Port');
                $labelUsername.text(globalTranslate.pr_ProviderLogin || 'Login');
                $labelSecret.text(globalTranslate.pr_ProviderPassword || 'Password');
                
            } else if (registrationType === 'inbound') {
                // INBOUND: Provider connects to us
                $valUserName.val($elUniqId.val());
                $valUserName.attr('readonly', '');
                if ($valSecret.val().trim() === '') {
                    $valSecret.val('id=' + $('#id').val() + '-' + $elUniqId.val());
                }
                $elHost.hide();
                $elPort.hide();
                $elUsername.show();
                $elSecret.show();
                $elAdditionalHost.show();
                $genPassword.show();
                $copyButton.show();
                $showHideButton.show();
                
                // Update labels
                $labelUsername.text(globalTranslate.pr_AuthenticationUsername || 'Authentication Username');
                $labelSecret.text(globalTranslate.pr_AuthenticationPassword || 'Authentication Password');
                
                // Remove validation errors for hidden host field
                provider.$formObj.form('remove prompt', 'host');
                $('#host').closest('.field').removeClass('error');
                provider.$formObj.form('remove prompt', 'port');
                $('#port').closest('.field').removeClass('error');
                
            } else if (registrationType === 'none') {
                // NONE: Static peer-to-peer connection (IP authentication)
                $elHost.show();
                $elPort.show();
                $elUsername.hide();
                $elSecret.hide();
                $elAdditionalHost.show();
                $genPassword.hide();
                $copyButton.hide();
                $showHideButton.hide();
                
                // Update labels
                $labelHost.text(globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP');
                $labelPort.text(globalTranslate.pr_PeerPort || 'Peer Port');
                
                // Remove validation prompts for hidden fields
                provider.$formObj.form('remove prompt', 'username');
                $('#username').closest('.field').removeClass('error');
                provider.$formObj.form('remove prompt', 'secret');
                $('#secret').closest('.field').removeClass('error');
            }
            
            // Handle disablefromuser checkbox visibility
            const $el = $('#disablefromuser');
            const $fromUser = $('#divFromUser');
            if ($el.checkbox('is checked')) {
                $fromUser.hide();
                $fromUser.removeClass('visible');
            } else {
                $fromUser.show();
                $fromUser.addClass('visible');
            }
            
        } else if (provider.providerType === 'IAX') {
            // Handle IAX provider visibility
            $valUserName.removeAttr('readonly');
            const $valPort = $('#port');
            const $valQualify = $('#qualify');
            
            // Always enable qualify for IAX (NAT keepalive)
            if ($valQualify.length > 0) {
                $valQualify.prop('checked', true);
                $valQualify.val('1');
            }
            
            // Set empty network filter ID (no restrictions by default)
            $('#networkfilterid').val('');
            
            // Update element visibility based on registration type
            if (registrationType === 'outbound') {
                // OUTBOUND: We register to provider
                $elHost.show();
                $elPort.show();
                $elUsername.show();
                $elSecret.show();
                $elReceiveCalls.hide(); // Not relevant for outbound
                
                // Update required fields for outbound
                $elHost.addClass('required');
                $elPort.addClass('required');
                $elUsername.addClass('required');
                $elSecret.addClass('required');
                
                // Hide generate and copy buttons for outbound
                $genPassword.hide();
                $copyButton.hide();
                $showHideButton.show();
                
                // Update labels for outbound
                $labelHost.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP');
                $labelPort.text(globalTranslate.pr_ProviderPort || 'Provider Port');
                $labelUsername.text(globalTranslate.pr_ProviderLogin || 'Login');
                $labelSecret.text(globalTranslate.pr_ProviderPassword || 'Password');
                
                // Set default port if empty
                if ($valPort.val() === '' || $valPort.val() === '0') {
                    $valPort.val('4569');
                }
                
            } else if (registrationType === 'inbound') {
                // INBOUND: Provider connects to us
                $valUserName.val($elUniqId.val());
                $valUserName.attr('readonly', '');
                if ($valSecret.val().trim() === '') {
                    $valSecret.val('id=' + $('#id').val() + '-' + $elUniqId.val());
                }
                $elHost.show();
                $elPort.hide(); // Port not needed for inbound connections
                $elUsername.show();
                $elSecret.show();
                $elReceiveCalls.show(); // Show for inbound connections
                
                // Remove validation prompt for hidden port field
                provider.$formObj.form('remove prompt', 'port');
                
                // Update required fields for inbound
                $elHost.removeClass('required'); // Host is optional for inbound
                $elPort.removeClass('required');
                
                // Remove host validation error since it's optional for inbound
                provider.$formObj.form('remove prompt', 'host');
                $('#host').closest('.field').removeClass('error');
                $elUsername.addClass('required');
                $elSecret.addClass('required');
                
                // Show all buttons for inbound
                $genPassword.show();
                $copyButton.show();
                $showHideButton.show();
                
                // Update labels for inbound
                $labelHost.text(globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host/IP');
                $labelUsername.text(globalTranslate.pr_AuthenticationUsername || 'Authentication Username');
                $labelSecret.text(globalTranslate.pr_AuthenticationPassword || 'Authentication Password');
                
            } else if (registrationType === 'none') {
                // NONE: Static peer-to-peer connection
                $elHost.show();
                $elPort.show();
                $elUsername.show();
                $elSecret.show();
                $elReceiveCalls.show(); // Show for static connections too
                
                // Update required fields for none
                $elHost.addClass('required');
                $elPort.addClass('required');
                $elUsername.addClass('required');
                $elSecret.addClass('required');
                
                // Hide generate and copy buttons for none type
                $genPassword.hide();
                $copyButton.hide();
                $showHideButton.show();
                
                // Update labels for none (peer-to-peer)
                $labelHost.text(globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP');
                $labelPort.text(globalTranslate.pr_PeerPort || 'Peer Port');
                $labelUsername.text(globalTranslate.pr_PeerUsername || 'Peer Username');
                $labelSecret.text(globalTranslate.pr_PeerPassword || 'Peer Password');
                
                // Set default port if empty
                if ($valPort.val() === '' || $valPort.val() === '0') {
                    $valPort.val('4569');
                }
            }
        }
    },
    
    /**
     * Add additional host handler
     */
    cbOnCompleteHostAddress() {
        const value = provider.$additionalHostInput.val();
        
        if (!value || !provider.hostInputValidation.test(value)) {
            return;
        }
        
        // Check for duplicates
        let duplicate = false;
        $('#additional-hosts-table tbody tr:not(.dummy)').each(function() {
            if ($(this).find('input').val() === value) {
                duplicate = true;
                return false;
            }
        });
        
        if (!duplicate) {
            const $newRow = provider.$additionalHostsDummy.clone();
            $newRow.removeClass('dummy');
            $newRow.find('input').val(value);
            $newRow.show();
            $('#additional-hosts-table tbody').append($newRow);
            
            provider.$additionalHostInput.val('');
            Form.dataChanged();
        }
    },
    
    /**
     * Delete additional host handler
     */
    cbDeleteAdditionalHost(e) {
        e.preventDefault();
        $(e.target).closest('tr').remove();
        Form.dataChanged();
    },
    
    /**
     * Initialize password visibility toggle
     */
    initializePasswordToggle() {
        $('#show-password-button').on('click', () => {
            const type = provider.$secret.attr('type');
            if (type === 'password') {
                provider.$secret.attr('type', 'text');
                $('#show-password-button i').removeClass('eye').addClass('eye slash');
            } else {
                provider.$secret.attr('type', 'password');
                $('#show-password-button i').removeClass('eye slash').addClass('eye');
            }
        });
    },
    
    /**
     * Initialize password generator
     */
    initializePasswordGenerator() {
        $('#generate-password-button').on('click', () => {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let password = '';
            for (let i = 0; i < 16; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            provider.$secret.val(password);
            provider.$secret.trigger('change');
            
            // Show password
            provider.$secret.attr('type', 'text');
            $('#show-password-button i').removeClass('eye').addClass('eye slash');
        });
    },
    
    /**
     * Initialize clipboard functionality
     */
    initializeClipboard() {
        const clipboard = new ClipboardJS('#clipboard-password-button', {
            text: () => provider.$secret.val()
        });
        
        clipboard.on('success', () => {
            $('#clipboard-password-button').popup({
                content: globalTranslate.pr_PasswordCopied,
                position: 'top center',
                on: 'manual'
            }).popup('show');
            
            setTimeout(() => {
                $('#clipboard-password-button').popup('hide');
            }, 2000);
        });
    },
    
    /**
     * Initialize qualify toggle
     */
    initializeQualifyToggle() {
        provider.$qualifyToggle.checkbox({
            onChange() {
                if (provider.$qualifyToggle.checkbox('is checked')) {
                    provider.$qualifyFreqToggle.removeClass('disabled');
                } else {
                    provider.$qualifyFreqToggle.addClass('disabled');
                }
            },
        });
    },
    
    /**
     * Initialize network filter dropdown
     */
    initializeNetworkFilterDropdown() {
        if (provider.$networkFilterDropdown.length === 0) {
            return;
        }
        
        const dropdownSettings = NetworkFiltersAPI.getDropdownSettings(() => {
            Form.dataChanged();
        });
        
        // Clear any existing initialization
        provider.$networkFilterDropdown.dropdown('destroy');
        
        // Initialize fresh dropdown
        provider.$networkFilterDropdown.dropdown(dropdownSettings);
    },
    
    /**
     * Initialize field help tooltips
     */
    initializeFieldTooltips() {
        const tooltipConfigs = {};
        
        if (provider.providerType === 'SIP') {
            // SIP-specific tooltips
            tooltipConfigs['registration_type'] = provider.buildTooltipContent({
                header: globalTranslate.pr_RegistrationTypeTooltip_header || 'Registration Type',
                list: [
                    {
                        term: globalTranslate.pr_RegistrationTypeTooltip_outbound || 'Outbound',
                        definition: globalTranslate.pr_RegistrationTypeTooltip_outbound_desc || 'PBX registers to provider'
                    },
                    {
                        term: globalTranslate.pr_RegistrationTypeTooltip_inbound || 'Inbound',
                        definition: globalTranslate.pr_RegistrationTypeTooltip_inbound_desc || 'Provider registers to PBX'
                    },
                    {
                        term: globalTranslate.pr_RegistrationTypeTooltip_none || 'None',
                        definition: globalTranslate.pr_RegistrationTypeTooltip_none_desc || 'IP-based authentication'
                    }
                ]
            });
            
            tooltipConfigs['provider_host'] = provider.buildTooltipContent({
                header: globalTranslate.pr_ProviderHostTooltip_header || 'Provider Host',
                description: globalTranslate.pr_ProviderHostTooltip_desc || 'Enter the hostname or IP address of your SIP provider',
                list: [
                    {
                        term: globalTranslate.pr_ProviderHostTooltip_formats || 'Supported formats',
                        definition: null
                    }
                ],
                list2: [
                    globalTranslate.pr_ProviderHostTooltip_format_ip || 'IP address (e.g., 192.168.1.1)',
                    globalTranslate.pr_ProviderHostTooltip_format_domain || 'Domain name (e.g., sip.provider.com)'
                ]
            });
            
            tooltipConfigs['additional_hosts'] = provider.buildTooltipContent({
                header: globalTranslate.pr_AdditionalHostsTooltip_header || 'Additional Hosts',
                description: globalTranslate.pr_AdditionalHostsTooltip_desc || 'Additional IP addresses or hostnames for this provider',
                list: [
                    globalTranslate.pr_AdditionalHostsTooltip_purpose_id || 'Used for identifying incoming calls',
                    globalTranslate.pr_AdditionalHostsTooltip_purpose_multi || 'Supports multiple provider servers',
                    globalTranslate.pr_AdditionalHostsTooltip_purpose_security || 'Enhances security by restricting access'
                ]
            });
            
            tooltipConfigs['sip_port'] = provider.buildTooltipContent({
                header: globalTranslate.pr_SIPPortTooltip_header || 'SIP Port',
                description: globalTranslate.pr_SIPPortTooltip_desc || 'The port number for SIP communication',
                list: [
                    {
                        term: '5060',
                        definition: globalTranslate.pr_SIPPortTooltip_port_5060_desc || 'Standard SIP port (UDP/TCP)'
                    },
                    {
                        term: '5061',
                        definition: globalTranslate.pr_SIPPortTooltip_port_5061_desc || 'Standard SIP port (TLS)'
                    }
                ]
            });
            
            tooltipConfigs['transport_protocol'] = provider.buildTooltipContent({
                header: globalTranslate.pr_TransportProtocolTooltip_header || 'Transport Protocol',
                description: globalTranslate.pr_TransportProtocolTooltip_desc || 'Protocol for SIP signaling',
                list: [
                    {
                        term: 'UDP',
                        definition: globalTranslate.pr_TransportProtocolTooltip_udp_desc || 'Fast, connectionless protocol'
                    },
                    {
                        term: 'TCP',
                        definition: globalTranslate.pr_TransportProtocolTooltip_tcp_desc || 'Reliable, connection-oriented protocol'
                    },
                    {
                        term: 'TLS',
                        definition: globalTranslate.pr_TransportProtocolTooltip_tls_desc || 'Encrypted TCP connection'
                    }
                ]
            });
            
            tooltipConfigs['outbound_proxy'] = provider.buildTooltipContent({
                header: globalTranslate.pr_OutboundProxyTooltip_header || 'Outbound Proxy',
                description: globalTranslate.pr_OutboundProxyTooltip_desc || 'SIP proxy server for outbound calls',
                list: [
                    {
                        term: globalTranslate.pr_OutboundProxyTooltip_format || 'Format',
                        definition: 'sip:proxy.example.com:5060'
                    }
                ]
            });
            
            tooltipConfigs['dtmf_mode'] = provider.buildTooltipContent({
                header: globalTranslate.pr_DTMFModeTooltip_header || 'DTMF Mode',
                description: globalTranslate.pr_DTMFModeTooltip_desc || 'Method for transmitting DTMF (touch-tone) signals',
                list: [
                    {
                        term: 'Auto',
                        definition: globalTranslate.pr_DTMFModeTooltip_auto_desc || 'Automatically detect the best DTMF method'
                    },
                    {
                        term: 'RFC 4733',
                        definition: globalTranslate.pr_DTMFModeTooltip_rfc4733_desc || 'Send DTMF as RTP events (recommended)'
                    },
                    {
                        term: 'SIP INFO',
                        definition: globalTranslate.pr_DTMFModeTooltip_info_desc || 'Send DTMF via SIP INFO messages'
                    },
                    {
                        term: 'Inband',
                        definition: globalTranslate.pr_DTMFModeTooltip_inband_desc || 'Send DTMF as audio tones in the media stream'
                    },
                    {
                        term: 'Auto + SIP INFO',
                        definition: globalTranslate.pr_DTMFModeTooltip_auto_info_desc || 'Try auto detection, fallback to SIP INFO'
                    }
                ],
                note: globalTranslate.pr_DTMFModeTooltip_note || 'RFC 4733 is the recommended method for most providers'
            });
            
            // Manual attributes tooltip with detailed examples
            tooltipConfigs['manual_attributes'] = provider.buildTooltipContent({
                header: globalTranslate.pr_ManualAttributesTooltip_header || 'Additional SIP Parameters',
                description: globalTranslate.pr_ManualAttributesTooltip_desc || 'Advanced SIP channel configuration parameters for specific provider requirements',
                list: [
                    {
                        term: globalTranslate.pr_ManualAttributesTooltip_common_header || 'Common Parameters',
                        definition: null
                    },
                    globalTranslate.pr_ManualAttributesTooltip_maxdatagram || 'maxdatagram=1500 - Maximum UDP packet size',
                    globalTranslate.pr_ManualAttributesTooltip_session_timers || 'session-timers=accept - SIP Session Timer handling',
                    globalTranslate.pr_ManualAttributesTooltip_session_expires || 'session-expires=1800 - Session expiration time',
                    globalTranslate.pr_ManualAttributesTooltip_session_minse || 'session-minse=90 - Minimum session expiration',
                    globalTranslate.pr_ManualAttributesTooltip_t38pt || 't38pt_udptl=yes,redundancy,maxdatagram=400 - T.38 fax support'
                ],
                list2: [
                    {
                        term: globalTranslate.pr_ManualAttributesTooltip_codecs_header || 'Codec Settings',
                        definition: null
                    },
                    globalTranslate.pr_ManualAttributesTooltip_allow || 'allow=g729,g722,alaw,ulaw - Allowed codecs',
                    globalTranslate.pr_ManualAttributesTooltip_disallow || 'disallow=all - Disallow all codecs first',
                    globalTranslate.pr_ManualAttributesTooltip_videosupport || 'videosupport=yes - Enable video support',
                    globalTranslate.pr_ManualAttributesTooltip_maxcallbitrate || 'maxcallbitrate=384 - Maximum video bitrate'
                ],
                list3: [
                    {
                        term: globalTranslate.pr_ManualAttributesTooltip_nat_header || 'NAT & Security',
                        definition: null
                    },
                    globalTranslate.pr_ManualAttributesTooltip_directmedia || 'directmedia=no - Disable direct RTP',
                    globalTranslate.pr_ManualAttributesTooltip_canreinvite || 'canreinvite=no - Disable re-INVITE',
                    globalTranslate.pr_ManualAttributesTooltip_insecure || 'insecure=port,invite - Relaxed security',
                    globalTranslate.pr_ManualAttributesTooltip_remotesecret || 'remotesecret=password - Remote authentication'
                ],
                warning: {
                    header: globalTranslate.pr_ManualAttributesTooltip_warning_header || 'Important',
                    text: globalTranslate.pr_ManualAttributesTooltip_warning || 'Incorrect parameters may prevent calls from working. Use only parameters required by your provider.'
                },
                examples: [
                    'maxdatagram=1500',
                    'session-timers=accept',
                    'session-expires=1800',
                    'directmedia=no',
                    'allow=g729,alaw,ulaw'
                ],
                examplesHeader: globalTranslate.pr_ManualAttributesTooltip_examples_header || 'Example configuration',
                note: globalTranslate.pr_ManualAttributesTooltip_note || 'One parameter per line. Contact your provider for specific requirements.'
            });
            
        } else if (provider.providerType === 'IAX') {
            // IAX-specific tooltips
            tooltipConfigs['registration_type'] = provider.buildTooltipContent({
                header: globalTranslate.iax_RegistrationTypeTooltip_header || 'Registration Type',
                list: [
                    {
                        term: globalTranslate.iax_RegistrationTypeTooltip_outbound || 'Outbound',
                        definition: globalTranslate.iax_RegistrationTypeTooltip_outbound_desc || 'PBX registers to IAX provider'
                    },
                    {
                        term: globalTranslate.iax_RegistrationTypeTooltip_inbound || 'Inbound',
                        definition: globalTranslate.iax_RegistrationTypeTooltip_inbound_desc || 'Provider registers to PBX'
                    },
                    {
                        term: globalTranslate.iax_RegistrationTypeTooltip_none || 'Peer',
                        definition: globalTranslate.iax_RegistrationTypeTooltip_none_desc || 'Static peer-to-peer connection'
                    }
                ]
            });
            
            tooltipConfigs['provider_host'] = provider.buildTooltipContent({
                header: globalTranslate.iax_ProviderHostTooltip_header || 'IAX Host',
                description: globalTranslate.iax_ProviderHostTooltip_desc || 'Enter the hostname or IP address of your IAX provider',
                list: [
                    globalTranslate.iax_ProviderHostTooltip_note || 'IAX uses port 4569 by default'
                ]
            });
            
            // Manual attributes tooltip for IAX
            tooltipConfigs['manual_attributes'] = provider.buildTooltipContent({
                header: globalTranslate.iax_ManualAttributesTooltip_header || 'Additional IAX Parameters',
                description: globalTranslate.iax_ManualAttributesTooltip_desc || 'Advanced IAX2 channel configuration parameters',
                list: [
                    {
                        term: globalTranslate.iax_ManualAttributesTooltip_common_header || 'Common IAX Parameters',
                        definition: null
                    },
                    globalTranslate.iax_ManualAttributesTooltip_trunk || 'trunk=yes - Enable IAX2 trunking',
                    globalTranslate.iax_ManualAttributesTooltip_jitterbuffer || 'jitterbuffer=yes - Enable jitter buffer',
                    globalTranslate.iax_ManualAttributesTooltip_forcejitterbuffer || 'forcejitterbuffer=yes - Force jitter buffer',
                    globalTranslate.iax_ManualAttributesTooltip_maxjitterbuffer || 'maxjitterbuffer=400 - Maximum jitter buffer size',
                    globalTranslate.iax_ManualAttributesTooltip_bandwidth || 'bandwidth=low - Bandwidth optimization'
                ],
                list2: [
                    {
                        term: globalTranslate.iax_ManualAttributesTooltip_codecs_header || 'IAX Codec Settings',
                        definition: null
                    },
                    globalTranslate.iax_ManualAttributesTooltip_allow || 'allow=g729,gsm,alaw,ulaw - Allowed codecs',
                    globalTranslate.iax_ManualAttributesTooltip_disallow || 'disallow=all - Disallow all codecs first',
                    globalTranslate.iax_ManualAttributesTooltip_codecpriority || 'codecpriority=host - Codec priority'
                ],
                warning: {
                    header: globalTranslate.iax_ManualAttributesTooltip_warning_header || 'Important',
                    text: globalTranslate.iax_ManualAttributesTooltip_warning || 'Incorrect parameters may prevent IAX calls from working. Consult your provider documentation.'
                },
                examples: [
                    'trunk=yes',
                    'jitterbuffer=yes',
                    'forcejitterbuffer=yes',
                    'allow=g729,alaw,ulaw',
                    'bandwidth=low'
                ],
                examplesHeader: globalTranslate.iax_ManualAttributesTooltip_examples_header || 'Example IAX configuration',
                note: globalTranslate.iax_ManualAttributesTooltip_note || 'One parameter per line. IAX2 parameters are different from SIP parameters.'
            });
        }
        
        // Initialize tooltips for each field with info icon
        $('.field-info-icon').each((_, element) => {
            const $icon = $(element);
            const fieldName = $icon.data('field');
            const content = tooltipConfigs[fieldName];
            
            if (content) {
                $icon.popup({
                    html: content,
                    position: 'top right',
                    hoverable: true,
                    delay: {
                        show: 300,
                        hide: 100
                    },
                    variation: 'flowing'
                });
            }
        });
    },
    
    /**
     * Build HTML content for tooltips from structured data
     * @param {Object} tooltipData - Tooltip data object
     * @returns {string} HTML content for tooltip
     */
    buildTooltipContent(tooltipData) {
        if (!tooltipData) return '';
        
        let html = '';
        
        // Add header if exists
        if (tooltipData.header) {
            html += `<div class="header"><strong>${tooltipData.header}</strong></div>`;
            html += '<div class="ui divider"></div>';
        }
        
        // Add description if exists
        if (tooltipData.description) {
            html += `<p>${tooltipData.description}</p>`;
        }
        
        // Helper function to build list HTML
        const buildList = (list) => {
            if (!list || list.length === 0) return '';
            
            let listHtml = '<ul style="margin: 0.5em 0; padding-left: 1.5em;">';
            
            list.forEach(item => {
                if (typeof item === 'string') {
                    // Simple list item
                    listHtml += `<li>${item}</li>`;
                } else if (item.definition === null) {
                    // Section header
                    listHtml += `</ul><p><strong>${item.term}</strong></p><ul style="margin: 0.5em 0; padding-left: 1.5em;">`;
                } else if (item.term && item.definition) {
                    // Term with definition
                    listHtml += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                }
            });
            
            listHtml += '</ul>';
            return listHtml;
        };
        
        // Add main list if exists
        if (tooltipData.list && tooltipData.list.length > 0) {
            html += buildList(tooltipData.list);
        }
        
        // Add additional lists (list2 through list10)
        for (let i = 2; i <= 10; i++) {
            const listKey = `list${i}`;
            if (tooltipData[listKey] && tooltipData[listKey].length > 0) {
                html += buildList(tooltipData[listKey]);
            }
        }
        
        // Add warning if exists
        if (tooltipData.warning) {
            html += '<div class="ui warning message" style="margin: 0.5em 0;">';
            if (tooltipData.warning.header) {
                html += `<div class="header">${tooltipData.warning.header}</div>`;
            }
            if (tooltipData.warning.text) {
                html += `<p>${tooltipData.warning.text}</p>`;
            }
            html += '</div>';
        }
        
        // Add examples if exist
        if (tooltipData.examples && tooltipData.examples.length > 0) {
            if (tooltipData.examplesHeader) {
                html += `<p><strong>${tooltipData.examplesHeader}:</strong></p>`;
            }
            html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
            html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">';
            
            tooltipData.examples.forEach((line, index) => {
                if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
                    // Section header
                    if (index > 0) html += '\n';
                    html += `<span style="color: #0084b4; font-weight: bold;">${line}</span>`;
                } else if (line.includes('=')) {
                    // Parameter line
                    const [param, value] = line.split('=', 2);
                    html += `\n<span style="color: #7a3e9d;">${param}</span>=<span style="color: #cf4a4c;">${value}</span>`;
                } else {
                    // Regular line
                    html += line ? `\n${line}` : '';
                }
            });
            
            html += '</pre>';
            html += '</div>';
        }
        
        // Add note if exists
        if (tooltipData.note) {
            html += `<p><em>${tooltipData.note}</em></p>`;
        }
        
        return html;
    },
    
    /**
     * Initialize auto-resize for textarea fields (manualattributes and note)
     */
    initializeAutoResizeTextareas() {
        // Setup auto-resize for manualattributes textarea
        const $manualattributesTextarea = $('textarea[name="manualattributes"]');
        if ($manualattributesTextarea.length > 0) {
            // Initial resize
            FormElements.optimizeTextareaSize($manualattributesTextarea);
            
            // Add event handlers for dynamic resize
            $manualattributesTextarea.on('input paste keyup', function() {
                FormElements.optimizeTextareaSize($(this));
            });
        }
        
        // Setup auto-resize for note textarea  
        const $noteTextarea = $('textarea[name="note"]');
        if ($noteTextarea.length > 0) {
            // Initial resize
            FormElements.optimizeTextareaSize($noteTextarea);
            
            // Add event handlers for dynamic resize
            $noteTextarea.on('input paste keyup', function() {
                FormElements.optimizeTextareaSize($(this));
            });
        }
        
        // Also trigger resize after data is loaded (with slight delay for DOM updates)
        setTimeout(() => {
            FormElements.optimizeTextareaSize($manualattributesTextarea);
            FormElements.optimizeTextareaSize($noteTextarea);
        }, 100);
    }
};

// Initialize when DOM is ready
$(document).ready(() => {
    provider.initialize();
});