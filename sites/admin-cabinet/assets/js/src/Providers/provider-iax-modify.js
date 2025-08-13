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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, ProviderIaxTooltipManager, ProviderTooltipManager, i18n, ProvidersAPI */

/**
 * IAX provider management form
 * @class ProviderIAX
 */
class ProviderIAX extends ProviderBase {
    constructor() { 
        super('IAX'); 
    }
    
    /**
     * Show password strength indicator and trigger initial check
     */
    showPasswordStrengthIndicator() {
        const $passwordProgress = $('#password-strength-progress');
        if ($passwordProgress.length > 0) {
            // Initialize progress component if not already done
            if (!$passwordProgress.hasClass('progress')) {
                $passwordProgress.progress({
                    percent: 0,
                    showActivity: false
                });
            }
            
            $passwordProgress.show();
            
            // Trigger password strength check if password exists
            if (this.$secret.val() && typeof PasswordScore !== 'undefined') {
                PasswordScore.checkPassStrength({
                    pass: this.$secret.val(),
                    bar: $passwordProgress,
                    section: $passwordProgress
                });
            }
        }
    }
    
    /**
     * Hide password strength indicator
     */
    hidePasswordStrengthIndicator() {
        const $passwordProgress = $('#password-strength-progress');
        if ($passwordProgress.length > 0) {
            $passwordProgress.hide();
        }
    }

    /**
     * Initialize the provider form
     */
    initialize() {
        super.initialize();
        
        // IAX-specific initialization
        this.initializeIaxWarningMessage();
        this.initializeRealtimeValidation();
        this.initializeRegistrationTypeHandlers();
        
        // Initialize tabs
        this.initializeTabs();
        
        // Re-validate form when receive_calls_without_auth changes
        $('#receive_calls_without_auth.checkbox').checkbox('setting', 'onChange', () => {
            const regType = $('#registration_type').val();
            
            // Clear any existing error on secret field
            this.$formObj.form('remove prompt', 'secret');
            this.$secret.closest('.field').removeClass('error');
            
            // For inbound registration, validate based on checkbox state
            if (regType === 'inbound') {
                const isChecked = $('#receive_calls_without_auth').checkbox('is checked');
                if (!isChecked && this.$secret.val() === '') {
                    // If unchecked and password is empty, show error
                    setTimeout(() => {
                        this.$formObj.form('validate field', 'secret');
                    }, 100);
                }
            }
            
            // Mark form as changed
            Form.dataChanged();
        });
        
        // Initialize field help tooltips
        this.initializeFieldTooltips();
    }
    
    /**
     * Initialize tab functionality
     */
    initializeTabs() {
        $('#provider-tabs-menu .item').tab({
            onVisible: (tabPath) => {
                if (tabPath === 'diagnostics' && typeof providerModifyStatusWorker !== 'undefined') {
                    // Initialize diagnostics tab when it becomes visible
                    providerModifyStatusWorker.initializeDiagnosticsTab();
                }
            }
        });
    }
    
    /**
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        const result = super.cbBeforeSendForm(settings);
        
        // Add provider type
        result.data.type = this.providerType;
        
        // Checkbox values are now automatically processed by Form.js with convertCheckboxesToBool = true
        
        return result;
    }
    
    /**
     * Callback after form submission
     */
    cbAfterSendForm(response) {
        super.cbAfterSendForm(response);
        
        if (response.result && response.data) {
            // Update form with response data if needed
            if (response.data.id && !$('#id').val()) {
                $('#id').val(response.data.id);
            }
            
            // The Form.js will handle the reload automatically if response.reload is present
            // For new records, REST API returns reload path like "providers/modifyiax/IAX-TRUNK-xxx"
        }
    }

    /**
     * Initialize IAX warning message handling
     */
    initializeIaxWarningMessage() {
        const $warningMessage = $('#elReceiveCalls').next('.warning.message');
        const $checkboxInput = $('#receive_calls_without_auth');
        
        // Function to update warning message state
        const updateWarningState = () => {
            if ($checkboxInput.prop('checked')) {
                $warningMessage.removeClass('hidden');
            } else {
                $warningMessage.addClass('hidden');
            }
        };
        
        // Initialize warning state
        updateWarningState();
        
        // Handle checkbox changes
        $('#receive_calls_without_auth.checkbox').checkbox({
            onChecked() {
                $warningMessage.removeClass('hidden').transition('fade in');
            },
            onUnchecked() {
                $warningMessage.transition('fade out', () => {
                    $warningMessage.addClass('hidden');
                });
            }
        });
    }

    /**
     * Initialize real-time validation feedback
     */
    initializeRealtimeValidation() {
        // Enable inline validation for better UX
        this.$formObj.form('setting', 'inline', true);
        
        // Add helper text for IAX-specific fields
        const $portField = $('#port').closest('.field');
        if ($portField.find('.ui.pointing.label').length === 0) {
            $portField.append('<div class="ui pointing label" style="display: none;">Default IAX port is 4569</div>');
        }
        
        // Show port helper on focus
        $('#port').on('focus', function() {
            const $label = $(this).closest('.field').find('.ui.pointing.label');
            if ($(this).val() === '' || $(this).val() === '4569') {
                $label.show();
            }
        }).on('blur', function() {
            $(this).closest('.field').find('.ui.pointing.label').hide();
        });
        
        // Validate on blur for immediate feedback
        this.$formObj.find('input[type="text"], input[type="password"]').on('blur', (event) => {
            const fieldName = $(event.target).attr('name');
            const validateRules = this.getValidateRules();
            if (fieldName && validateRules[fieldName]) {
                this.$formObj.form('validate field', fieldName);
            }
        });
    }

    /**
     * Initialize field help tooltips
     */
    initializeFieldTooltips() {
        // Use the specialized ProviderIaxTooltipManager for IAX provider
        ProviderIaxTooltipManager.initialize();
    }

    /**
     * Get validation rules based on registration type
     * @returns {object} Validation rules
     */
    getValidateRules() {
        const regType = $('#registration_type').val();
        
        switch (regType) {
            case 'outbound':
                return this.getOutboundRules();
            case 'inbound':
                return this.getInboundRules();
            case 'none':
                return this.getNoneRules();
            default:
                return this.getOutboundRules();
        }
    }

    /**
     * Get validation rules for outbound registration
     */
    getOutboundRules() {
        return {
            description: {
                identifier: 'description',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderNameIsEmpty,
                    },
                ],
            },
            host: {
                identifier: 'host',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
                    },
                ],
            },
            username: {
                identifier: 'username',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                    },
                ],
            },
            secret: {
                identifier: 'secret',
                optional: true,
                rules: [],
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
                        prompt: globalTranslate.pr_ValidationProviderPortInvalid,
                    },
                ],
            },
        };
    }

    /**
     * Get validation rules for inbound registration
     */
    getInboundRules() {
        const receiveWithoutAuth = $('#receive_calls_without_auth').checkbox('is checked');
        
        const rules = {
            description: {
                identifier: 'description',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderNameIsEmpty,
                    },
                ],
            },
            username: {
                identifier: 'username',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                    },
                ],
            },
        };

        // Secret is optional if receive_calls_without_auth is checked
        if (!receiveWithoutAuth) {
            rules.secret = {
                identifier: 'secret',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderPasswordEmpty,
                    },
                    {
                        type: 'minLength[8]',
                        prompt: globalTranslate.pr_ValidationProviderPasswordTooShort,
                    },
                ],
            };
        } else {
            rules.secret = {
                identifier: 'secret',
                optional: true,
                rules: [],
            };
        }

        return rules;
    }

    /**
     * Get validation rules for none registration
     */
    getNoneRules() {
        return {
            description: {
                identifier: 'description',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderNameIsEmpty,
                    },
                ],
            },
            host: {
                identifier: 'host',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderHostIsEmpty,
                    },
                ],
            },
            username: {
                identifier: 'username',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty,
                    },
                ],
            },
            secret: {
                identifier: 'secret',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.pr_ValidationProviderPasswordEmpty,
                    },
                ],
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
                        prompt: globalTranslate.pr_ValidationProviderPortInvalid,
                    },
                ],
            },
        };
    }

    /**
     * Initialize registration type change handlers
     */
    initializeRegistrationTypeHandlers() {
        // Registration type handler is now in base class
        // This method is kept for compatibility
    }
    

    /**
     * Initialize form with REST API configuration
     */
    initializeForm() {
        Form.$formObj = this.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = this.getValidateRules();
        Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
        Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
        
        // Configure REST API settings
        Form.apiSettings = {
            enabled: true,
            apiObject: ProvidersAPI,
            saveMethod: 'saveRecord'
        };
        
        // Navigation URLs
        Form.afterSubmitIndexUrl = `${globalRootUrl}providers/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}providers/modifyiax/`;
        
        // Enable automatic checkbox to boolean conversion
        Form.convertCheckboxesToBool = true;
        
        Form.initialize();
    }

    /**
     * Update the visibility of elements based on the registration type
     */
    updateVisibilityElements() {
        // Get element references
        const elHost = $('#elHost');
        const elUsername = $('#elUsername');
        const elSecret = $('#elSecret');
        const elPort = $('#elPort');
        const elReceiveCalls = $('#elReceiveCalls');
        const elNetworkFilter = $('#elNetworkFilter');
        const regType = $('#registration_type').val();
        const genPassword = $('#generate-new-password');

        const valUserName = $('#username');
        const valSecret = this.$secret;
        const valPort = $('#port');
        const providerId = $('#id').val();
        const valQualify = $('#qualify');
        const copyButton = $('#elSecret .button.clipboard');
        const showHideButton = $('#show-hide-password');

        // Get label text elements
        const labelHostText = $('#hostLabelText');
        const labelPortText = $('#portLabelText');
        const labelUsernameText = $('#usernameLabelText');
        const labelSecretText = $('#secretLabelText');

        // Always enable qualify for IAX (NAT keepalive)
        if (valQualify.length > 0) {
            valQualify.prop('checked', true);
            valQualify.val('1');
        }

        valUserName.removeAttr('readonly');

        // Hide password tooltip by default
        this.hidePasswordTooltip();

        // Update element visibility based on registration type
        if (regType === 'outbound') {
            // OUTBOUND: We register to provider
            elHost.show();
            elPort.show();
            elUsername.show();
            elSecret.show();
            elReceiveCalls.hide();
            elNetworkFilter.hide(); // Network filter not relevant for outbound

            // Update required fields
            elHost.addClass('required');
            elPort.addClass('required');
            elUsername.addClass('required');
            elSecret.addClass('required');

            // Hide all password management buttons for outbound
            genPassword.hide();
            copyButton.hide();
            showHideButton.hide();
            
            // Hide password strength indicator for outbound
            this.hidePasswordStrengthIndicator();

            // Update labels for outbound
            labelHostText.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP');
            labelPortText.text(globalTranslate.pr_ProviderPort || 'Provider Port');
            labelUsernameText.text(globalTranslate.pr_ProviderLogin || 'Login');
            labelSecretText.text(globalTranslate.pr_ProviderPassword || 'Password');

            // Set default port if empty
            if (valPort.val() === '' || valPort.val() === '0') {
                valPort.val('4569');
            }
        } else if (regType === 'inbound') {
            // INBOUND: Provider connects to us
            valUserName.val(providerId);
            valUserName.attr('readonly', '');
            
            // Auto-generate password for inbound registration if empty
            if (valSecret.val().trim() === '') {
                this.generatePassword();
            }
            
            elHost.show();
            elPort.hide();
            elUsername.show();
            elSecret.show();
            elReceiveCalls.show();
            elNetworkFilter.show(); // Network filter available for security

            // Remove validation prompt for hidden port field
            this.$formObj.form('remove prompt', 'port');

            // Update required fields
            elHost.removeClass('required');
            elPort.removeClass('required');
            elUsername.addClass('required');
            elSecret.addClass('required');

            // Remove host validation error since it's optional for inbound
            this.$formObj.form('remove prompt', 'host');
            $('#host').closest('.field').removeClass('error');

            // Show all buttons for inbound
            genPassword.show();
            copyButton.show();
            showHideButton.show();
            
            // Show password strength indicator for inbound
            this.showPasswordStrengthIndicator();
            copyButton.attr('data-clipboard-text', valSecret.val());

            // Update labels for inbound
            labelHostText.text(globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host/IP');
            labelUsernameText.text(globalTranslate.pr_AuthenticationUsername || 'Authentication Username');
            labelSecretText.text(globalTranslate.pr_AuthenticationPassword || 'Authentication Password');
        } else if (regType === 'none') {
            // NONE: Static peer-to-peer connection
            elHost.show(); 
            elPort.show();
            elUsername.show();
            elSecret.show();
            elReceiveCalls.show();
            elNetworkFilter.show(); // Network filter available for security

            // Show tooltip icon for password field
            this.showPasswordTooltip();

            // Update required fields
            elHost.addClass('required');
            elPort.addClass('required');
            elUsername.addClass('required');
            elSecret.removeClass('required'); // Password is optional in none mode

            // Show password management buttons for none registration (except generate)
            genPassword.hide();
            copyButton.show();
            showHideButton.show();
            
            // Show password strength indicator for none type
            this.showPasswordStrengthIndicator();

            // Update labels for none (peer-to-peer)
            labelHostText.text(globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP');
            labelPortText.text(globalTranslate.pr_PeerPort || 'Peer Port');
            labelUsernameText.text(globalTranslate.pr_PeerUsername || 'Peer Username');
            labelSecretText.text(globalTranslate.pr_PeerPassword || 'Peer Password');

            // Set default port if empty
            if (valPort.val() === '' || valPort.val() === '0') {
                valPort.val('4569');
            }
        }
    }
}