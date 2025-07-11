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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, PasswordScore */

/**
 * IAX provider management form
 * @class ProviderIAX
 */
class ProviderIAX extends ProviderBase {
    constructor() { 
        super('IAX'); 
    }

    /**
     * Initialize the provider form
     */
    initialize() {
        super.initialize();
        
        // IAX-specific initialization
        this.initializeIaxWarningMessage();
        this.initializeRealtimeValidation();
        
        // Re-validate form when receive_calls_without_auth changes
        $('#receive_calls_without_auth.checkbox').checkbox('setting', 'onChange', () => {
            // Just check if field is valid without triggering submit
            const isValid = this.$formObj.form('is valid', 'secret');
            if (!isValid) {
                this.$formObj.form('validate field', 'secret');
            }
            // Mark form as changed
            Form.dataChanged();
        });
        
        // Initialize field help tooltips
        this.initializeFieldTooltips();
    }

    /**
     * Initialize IAX warning message handling
     */
    initializeIaxWarningMessage() {
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
            },
            onUnchecked: function() {
                $warningMessage.transition('fade out', function() {
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
        
        // Password strength indicator
        if (this.$secret.length > 0 && typeof PasswordScore !== 'undefined') {
            // Create progress bar for password strength if it doesn't exist
            let $passwordProgress = $('#password-strength-progress');
            if ($passwordProgress.length === 0) {
                const $secretField = this.$secret.closest('.field');
                $passwordProgress = $('<div class="ui tiny progress" id="password-strength-progress"><div class="bar"></div></div>');
                $secretField.append($passwordProgress);
            }
            
            // Update password strength on input
            this.$secret.on('input', () => {
                PasswordScore.checkPassStrength({
                    pass: this.$secret.val(),
                    bar: $passwordProgress,
                    section: $passwordProgress
                });
            });
        }
        
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
        this.$formObj.find('input[type="text"], input[type="password"]').on('blur', function() {
            const fieldName = $(this).attr('name');
            const validateRules = this.getValidateRules();
            if (fieldName && validateRules[fieldName]) {
                this.$formObj.form('validate field', fieldName);
            }
        }.bind(this));
    }

    /**
     * Initialize field help tooltips
     */
    initializeFieldTooltips() { 
        // Build tooltip data structures
        const registrationTypeData = {
            header: globalTranslate.iax_RegistrationTypeTooltip_header,
            list: [
                {
                    term: globalTranslate.iax_RegistrationTypeTooltip_outbound,
                    definition: globalTranslate.iax_RegistrationTypeTooltip_outbound_desc
                },
                {
                    term: globalTranslate.iax_RegistrationTypeTooltip_inbound,
                    definition: globalTranslate.iax_RegistrationTypeTooltip_inbound_desc
                },
                {
                    term: globalTranslate.iax_RegistrationTypeTooltip_none,
                    definition: globalTranslate.iax_RegistrationTypeTooltip_none_desc
                }
            ]
        };

        const receiveCallsData = {
            header: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_header,
            description: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_desc,
            warning: {
                header: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_warning_header,
                text: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_warning
            },
            list: [
                {
                    term: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_application,
                    definition: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_application_desc
                }
            ]
        };

        const networkFilterData = {
            header: globalTranslate.iax_NetworkFilterTooltip_header,
            description: globalTranslate.iax_NetworkFilterTooltip_desc,
            list: [
                {
                    term: globalTranslate.iax_NetworkFilterTooltip_inbound,
                    definition: globalTranslate.iax_NetworkFilterTooltip_inbound_desc
                },
                {
                    term: globalTranslate.iax_NetworkFilterTooltip_outbound,
                    definition: globalTranslate.iax_NetworkFilterTooltip_outbound_desc
                },
                {
                    term: globalTranslate.iax_NetworkFilterTooltip_none,
                    definition: globalTranslate.iax_NetworkFilterTooltip_none_desc
                }
            ]
        };

        const providerHostData = {
            header: globalTranslate.iax_ProviderHostTooltip_header,
            description: globalTranslate.iax_ProviderHostTooltip_desc,
            list: [
                globalTranslate.iax_ProviderHostTooltip_format_ip,
                globalTranslate.iax_ProviderHostTooltip_format_domain,
                globalTranslate.iax_ProviderHostTooltip_outbound_use,
                globalTranslate.iax_ProviderHostTooltip_none_use
            ],
            note: globalTranslate.iax_ProviderHostTooltip_note
        };

        const portData = {
            header: globalTranslate.iax_PortTooltip_header,
            description: globalTranslate.iax_PortTooltip_desc,
            list: [
                globalTranslate.iax_PortTooltip_default,
                globalTranslate.iax_PortTooltip_info
            ],
            note: globalTranslate.iax_PortTooltip_note
        };

        const manualAttributesData = {
            header: i18n('iax_ManualAttributesTooltip_header'),
            description: i18n('iax_ManualAttributesTooltip_desc'),
            list: [
                {
                    term: i18n('iax_ManualAttributesTooltip_format'),
                    definition: null
                }
            ],
            examplesHeader: i18n('iax_ManualAttributesTooltip_examples_header'),
            examples: [
                'language = ru',
                'codecpriority = host',
                'trunktimestamps = yes',
                'trunk = yes'
            ],
            warning: {
                header: i18n('iax_ManualAttributesTooltip_warning_header'),
                text: i18n('iax_ManualAttributesTooltip_warning')
            }
        };

        const tooltipConfigs = {
            'registration_type': this.buildTooltipContent(registrationTypeData),
            'receive_calls_without_auth': this.buildTooltipContent(receiveCallsData),
            'network_filter': this.buildTooltipContent(networkFilterData),
            'provider_host': this.buildTooltipContent(providerHostData),
            'iax_port': this.buildTooltipContent(portData),
            'manual_attributes': this.buildTooltipContent(manualAttributesData)
        };
        
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
        const elUniqId = $('#uniqid');
        const genPassword = $('#generate-new-password');

        const valUserName = $('#username');
        const valSecret = this.$secret;
        const valPort = $('#port');
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

        // Hide any existing password info messages
        this.hidePasswordInfoMessage();

        // Update element visibility based on registration type
        if (regType === 'outbound') {
            // OUTBOUND: We register to provider
            elHost.show();
            elPort.show();
            elUsername.show();
            elSecret.show();
            elReceiveCalls.hide();
            elNetworkFilter.hide(); // Network filter not relevant for outbound
            $('#networkfilterid').val('none'); // Reset to default

            // Update required fields
            elHost.addClass('required');
            elPort.addClass('required');
            elUsername.addClass('required');
            elSecret.addClass('required');

            // Hide generate and copy buttons for outbound
            genPassword.hide();
            copyButton.hide();
            showHideButton.show();

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
            valUserName.val(elUniqId.val());
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
            elNetworkFilter.show(); // Network filter critical for inbound security

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
            elNetworkFilter.show(); // Network filter critical for none type (no auth)

            // Show informational message for password field
            this.showPasswordInfoMessage('iax');

            // Update required fields
            elHost.addClass('required');
            elPort.addClass('required');
            elUsername.addClass('required');
            elSecret.removeClass('required'); // Password is optional in none mode

            // Hide generate and copy buttons
            genPassword.hide();
            copyButton.hide();
            showHideButton.show();

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

// Initialize on document ready
$(document).ready(() => {
    const provider = new ProviderIAX();
    provider.initialize();
});