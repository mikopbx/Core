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

/* global globalRootUrl, globalTranslate, Form, $, ClipboardJS */


/**
 * Object for handling provider management form
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
     * jQuery object for the secret field.
     * @type {jQuery}
     */
    $secret: $('#secret'),

    $additionalHostsDummy: $('#additional-hosts-table .dummy'),

    providerType: $('#providerType').val(),
    $checkBoxes: $('#save-provider-form .checkbox'),
    $accordions: $('#save-provider-form .ui.accordion'),
    $dropDowns: $('#save-provider-form .ui.dropdown'),
    $deleteRowButton: $('#additional-hosts-table .delete-row-button'),
    $qualifyToggle: $('#qualify'),
    $qualifyFreqToggle: $('#qualify-freq'),
    $additionalHostInput: $('#additional-host input'),
    hostInputValidation: new RegExp(
        '^(((\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}'
        + '(\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])'
        + '(\\/(\d|[1-2]\d|3[0-2]))?'
        + '|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+)$',
        'gm'
    ),
    hostRow: '#save-provider-form .host-row',

    /**
     * Validation rules for outbound registration
     */
    outboundValidationRules: {
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
    },

    /**
     * Validation rules for inbound registration
     */
    inboundValidationRules: {
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
            optional: true,
            rules: [],
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
                    type: 'checkSecret',
                    prompt: globalTranslate.pr_ValidationProviderPasswordEmpty,
                },
                {
                    type: 'minLength[8]',
                    prompt: globalTranslate.pr_ValidationProviderPasswordTooShort,
                },
                {
                    type: 'checkPasswordStrength',
                    prompt: globalTranslate.pr_ValidationProviderPasswordWeak,
                },
            ],
        },
        port: {
            identifier: 'port',
            optional: true,
            rules: [],
        },
    },

    /**
     * Validation rules for none registration
     */
    noneValidationRules: {
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
            optional: true,
            rules: [],
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
    },

    /**
     * Get validation rules for the form fields based on registration type.
     *
     * @returns {object} Validation rules
     */
    getValidateRules() {
        const regType = $('#registration_type').val();
        
        // Select appropriate validation rules based on registration type
        let baseRules;
        switch (regType) {
            case 'outbound':
                baseRules = { ...provider.outboundValidationRules };
                break;
            case 'inbound':
                baseRules = { ...provider.inboundValidationRules };
                break;
            case 'none':
                baseRules = { ...provider.noneValidationRules };
                break;
            default:
                baseRules = { ...provider.outboundValidationRules };
        }
        
        // Add additional hosts validation (common for all types)
        baseRules.additional_hosts = {
            identifier: 'additional-host',
            optional: true,
            rules: [
                {
                    type: 'regExp',
                    value: provider.hostInputValidation,
                    prompt: globalTranslate.pr_ValidationAdditionalHostInvalid
                        || 'Please enter a valid IP address or hostname',
                },
            ],
        };
        
        return baseRules;
    },

    /**
     * Generate password using REST API
     */
    generatePassword() {
        // For IAX use longer password (base64Safe(32) will produce ~44 chars)
        const length = provider.providerType === 'IAX' ? 32 : 16;
        
        PbxApi.PasswordGenerate(length, (password) => {
            // Use Fomantic UI Form API
            provider.$formObj.form('set value', 'secret', password);
            
            // Update clipboard button attribute
            $('#elSecret .ui.button.clipboard').attr('data-clipboard-text', password);
            
            // Mark form as changed
            Form.dataChanged();
        });
    },

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
        
        // Handle checkbox changes - using the already initialized checkbox
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
        
        // Re-initialize warning state when accordion opens
        provider.$accordions.accordion({
            onOpen: function() {
                // Small delay to ensure DOM is settled
                setTimeout(updateWarningState, 50);
            }
        });
    },
    
    /**
     * Initialize real-time validation feedback
     */
    initializeRealtimeValidation() {
        // Enable inline validation for better UX
        provider.$formObj.form('setting', 'inline', true);
        
        // Password strength indicator using existing PasswordScore module
        if (provider.$secret.length > 0 && typeof PasswordScore !== 'undefined') {
            // Create progress bar for password strength if it doesn't exist
            let $passwordProgress = $('#password-strength-progress');
            if ($passwordProgress.length === 0) {
                const $secretField = provider.$secret.closest('.field');
                $passwordProgress = $('<div class="ui tiny progress" id="password-strength-progress"><div class="bar"></div></div>');
                $secretField.append($passwordProgress);
            }
            
            // Update password strength on input
            provider.$secret.on('input', () => {
                PasswordScore.checkPassStrength({
                    pass: provider.$secret.val(),
                    bar: $passwordProgress,
                    section: $passwordProgress
                });
            });
        }
        
        // Enhanced validation messages for IAX providers
        if (provider.providerType === 'IAX') {
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
        }
        
        // Validate on blur for immediate feedback
        provider.$formObj.find('input[type="text"], input[type="password"]').on('blur', function() {
            const fieldName = $(this).attr('name');
            const validateRules = provider.getValidateRules();
            if (fieldName && validateRules[fieldName]) {
                provider.$formObj.form('validate field', fieldName);
            }
        });
    },

    /**
     * Initialize the provider form.
     */
    initialize() {
        provider.$checkBoxes.checkbox();
        provider.$dropDowns.dropdown();
        provider.updateHostsTableView();
        
        // Initialize accordion separately for IAX
        if (provider.providerType !== 'IAX') {
            provider.$accordions.accordion();
        }
        
        // Initialize real-time validation feedback
        provider.initializeRealtimeValidation();
        /**
         * Callback function called when the qualify toggle changes.
         */
        provider.$qualifyToggle.checkbox({
            onChange() {
                if (provider.$qualifyToggle.checkbox('is checked')) {
                    provider.$qualifyFreqToggle.removeClass('disabled');
                } else {
                    provider.$qualifyFreqToggle.addClass('disabled');
                }
            },
        });

        // Add new string to additional-hosts-table table
        provider.$additionalHostInput.keypress((e) => {
            if (e.which === 13) {
                provider.cbOnCompleteHostAddress();
            }
        });

        // Delete host from additional-hosts-table
        provider.$deleteRowButton.on('click', (e) => {
            e.preventDefault();
            $(e.target).closest('tr').remove();
            provider.updateHostsTableView();
            Form.dataChanged();
            return false;
        });
        provider.initializeForm();

        provider.updateVisibilityElements();

        $('#registration_type').on('change', () => {
            provider.updateVisibilityElements();
            // Remove all validation error prompts without clearing field values
            provider.$formObj.find('.field').removeClass('error');
            provider.$formObj.find('.ui.error.message').remove();
            provider.$formObj.find('.prompt').remove();
            // Update validation rules for dynamic fields
            Form.validateRules = provider.getValidateRules();
            // Mark form as changed to enable save button
            Form.dataChanged();
            // Don't auto-submit, just check if form is valid to update UI
            setTimeout(() => {
                provider.$formObj.form('is valid');
            }, 100);
        });
        
        // Trigger initial update for IAX providers
        if (provider.providerType === 'IAX') {
            provider.updateVisibilityElements();
            provider.initializeIaxWarningMessage();
            
            // Re-validate form when receive_calls_without_auth changes
            $('#receive_calls_without_auth.checkbox').checkbox('setting', 'onChange', function() {
                // Just check if field is valid without triggering submit
                const isValid = provider.$formObj.form('is valid', 'secret');
                if (!isValid) {
                    provider.$formObj.form('validate field', 'secret');
                }
                // Mark form as changed
                Form.dataChanged();
            });
        }

        $('#disablefromuser input').on('change', () => {
            provider.updateVisibilityElements();
            Form.dataChanged();
        });

        // Show/hide password toggle
        $('#show-hide-password').on('click', (e) => {
            e.preventDefault();
            const $button = $(e.currentTarget);
            const $icon = $button.find('i');
            
            if (provider.$secret.attr('type') === 'password') {
                provider.$secret.attr('type', 'text');
                $icon.removeClass('eye').addClass('eye slash');
            } else {
                provider.$secret.attr('type', 'password');
                $icon.removeClass('eye slash').addClass('eye');
            }
        });

        $('#generate-new-password').on('click', (e) => {
            /**
             * Event handler for the generate new password button click event.
             * @param {Event} e - The click event.
             */
            e.preventDefault();
            provider.generatePassword();
        });


        // Initialize all tooltip popups
        $('.popuped').popup();
        
        const clipboard = new ClipboardJS('.clipboard');
        $('.clipboard').popup({
            on: 'manual',
        });

        clipboard.on('success', (e) => {
            $(e.trigger).popup('show');
            setTimeout(() => {
                $(e.trigger).popup('hide');
            }, 1500);
            e.clearSelection();
        });

        clipboard.on('error', (e) => {
            console.error('Action:', e.action);
            console.error('Trigger:', e.trigger);
        });

        // Prevent browser password manager for generated passwords
        provider.$secret.on('focus', function() {
            $(this).attr('autocomplete', 'new-password');
        });
    },

    /**
     * Update the visibility of elements based on the provider type and registration type.
     */
    updateVisibilityElements() {
        // Get element references
        let elHost = $('#elHost');
        let elUsername = $('#elUsername');
        let elSecret = $('#elSecret');
        let elPort = $('#elPort');
        let elReceiveCalls = $('#elReceiveCalls');
        let regType = $('#registration_type').val();
        let elUniqId = $('#uniqid');
        let genPassword = $('#generate-new-password');

        let valUserName = $('#username');
        let valSecret = provider.$secret;

        if (provider.providerType === 'SIP') {
            let elAdditionalHost = $('#elAdditionalHosts');
            
            // Reset username only when switching from inbound to other types
            if (valUserName.val() === elUniqId.val() && regType !== 'inbound') {
                valUserName.val('');
            }
            valUserName.removeAttr('readonly');

            // Update element visibility based on registration type
            if (regType === 'outbound') {
                elHost.show();
                elUsername.show();
                elSecret.show();
                elAdditionalHost.show();
                genPassword.hide();
            } else if (regType === 'inbound') {
                valUserName.val(elUniqId.val());
                valUserName.attr('readonly', '');
                if (valSecret.val().trim() === '') {
                    valSecret.val('id=' + $('#id').val() + '-' + elUniqId.val());
                }
                elHost.hide();
                elUsername.show();
                elSecret.show();
                genPassword.show();
                // Remove validation errors for hidden host field
                provider.$formObj.form('remove prompt', 'host');
                $('#host').closest('.field').removeClass('error');
            } else if (regType === 'none') {
                elHost.show();
                elUsername.hide();
                elSecret.hide();
                // Don't clear values, just remove validation prompts for hidden fields
                provider.$formObj.form('remove prompt', 'username');
                provider.$formObj.form('remove prompt', 'secret');
            }

            // Update element visibility based on 'disablefromuser' checkbox
            let el = $('#disablefromuser');
            let fromUser = $('#divFromUser');
            if (el.checkbox('is checked')) {
                fromUser.hide();
                fromUser.removeClass('visible');
            } else {
                fromUser.show();
                fromUser.addClass('visible');
            }
        } else if (provider.providerType === 'IAX') {
            // Handle IAX provider visibility
            valUserName.removeAttr('readonly');
            
            // Get label elements
            let labelHost = $('label[for="host"]');
            let labelPort = $('label[for="port"]');
            let labelUsername = $('label[for="username"]');
            let labelSecret = $('label[for="secret"]');
            let valPort = $('#port');
            let valQualify = $('#qualify');
            let copyButton = $('#elSecret .button.clipboard');
            let showHideButton = $('#show-hide-password');
            
            // Set default values for hidden fields
            // Always enable qualify for IAX (NAT keepalive)
            if (valQualify.length > 0) {
                valQualify.prop('checked', true);
                valQualify.val('1');
            }
            
            // Set empty network filter ID (no restrictions by default)
            $('#networkfilterid').val('');
            
            // Update element visibility based on registration type
            if (regType === 'outbound') {
                // OUTBOUND: We register to provider
                elHost.show();
                elPort.show();
                elUsername.show();
                elSecret.show();
                elReceiveCalls.hide(); // Not relevant for outbound
                
                // Update required fields for outbound
                elHost.addClass('required');
                elPort.addClass('required');
                elUsername.addClass('required');
                elSecret.addClass('required');
                
                // Hide generate and copy buttons for outbound
                genPassword.hide();
                copyButton.hide();
                // Show/hide button is always visible
                showHideButton.show();
                
                // Update labels for outbound
                labelHost.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP');
                labelPort.text(globalTranslate.pr_ProviderPort || 'Provider Port');
                labelUsername.text(globalTranslate.pr_ProviderLogin || 'Login');
                labelSecret.text(globalTranslate.pr_ProviderPassword || 'Password');
                
                // Set default port if empty
                if (valPort.val() === '' || valPort.val() === '0') {
                    valPort.val('4569');
                }
            } else if (regType === 'inbound') {
                // INBOUND: Provider connects to us
                // For incoming connections, use uniqid as username
                valUserName.val(elUniqId.val());
                valUserName.attr('readonly', '');
                if (valSecret.val().trim() === '') {
                    valSecret.val('id=' + $('#id').val() + '-' + elUniqId.val());
                }
                elHost.show();
                elPort.hide(); // Port not needed for inbound connections
                elUsername.show();
                elSecret.show();
                elReceiveCalls.show(); // Show for inbound connections
                
                // Remove validation prompt for hidden port field
                provider.$formObj.form('remove prompt', 'port');
                
                // Update required fields for inbound
                elHost.removeClass('required'); // Host is optional for inbound
                elPort.removeClass('required');
                
                // Remove host validation error since it's optional for inbound
                provider.$formObj.form('remove prompt', 'host');
                $('#host').closest('.field').removeClass('error');
                elUsername.addClass('required');
                elSecret.addClass('required'); // Will be validated based on receive_calls_without_auth
                
                // Show all buttons for inbound
                genPassword.show();
                copyButton.show();
                showHideButton.show();
                // Update clipboard text when password changes
                copyButton.attr('data-clipboard-text', valSecret.val());
                
                // Update labels for inbound
                labelHost.text(globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host/IP');
                labelUsername.text(globalTranslate.pr_AuthenticationUsername || 'Authentication Username');
                labelSecret.text(globalTranslate.pr_AuthenticationPassword || 'Authentication Password');
            } else if (regType === 'none') {
                // NONE: Static peer-to-peer connection
                elHost.show();
                elPort.show();
                elUsername.show();
                elSecret.show();
                elReceiveCalls.show(); // Show for static connections too
                
                // Update required fields for none
                elHost.addClass('required');
                elPort.addClass('required');
                elUsername.addClass('required');
                elSecret.addClass('required');
                
                // Hide generate and copy buttons for none type
                genPassword.hide();
                copyButton.hide();
                // Show/hide button is always visible
                showHideButton.show();
                
                // Update labels for none (peer-to-peer)
                labelHost.text(globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP');
                labelPort.text(globalTranslate.pr_PeerPort || 'Peer Port');
                labelUsername.text(globalTranslate.pr_PeerUsername || 'Peer Username');
                labelSecret.text(globalTranslate.pr_PeerPassword || 'Peer Password');
                
                // Set default port if empty
                if (valPort.val() === '' || valPort.val() === '0') {
                    valPort.val('4569');
                }
            }
        }
    },

    /**
     * Callback function when completing the host address input.
     */
    cbOnCompleteHostAddress() {
        const value = provider.$formObj.form('get value', 'additional-host');

        if (value) {
            const validation = value.match(provider.hostInputValidation);

            // Validate the input value
            if (validation === null
                || validation.length === 0) {
                provider.$additionalHostInput.transition('shake');
                return;
            }

            // Check if the host address already exists
            if ($(`.host-row[data-value="${value}"]`).length === 0) {
                const $tr = $('.host-row-tpl').last();
                const $clone = $tr.clone(true);
                $clone
                    .removeClass('host-row-tpl')
                    .addClass('host-row')
                    .show();
                $clone.attr('data-value', value);
                $clone.find('.address').html(value);
                if ($(provider.hostRow).last().length === 0) {
                    $tr.after($clone);
                } else {
                    $(provider.hostRow).last().after($clone);
                }
                provider.updateHostsTableView();
                Form.dataChanged();
            }
            provider.$additionalHostInput.val('');
        }
    },

    /**
     * Updates the hosts table view based on the presence of additional hosts or shows dummy if there is no records
     */
    updateHostsTableView() {
        if ($(provider.hostRow).length === 0) {
            provider.$additionalHostsDummy.show();
        } else {
            provider.$additionalHostsDummy.hide();
        }
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = provider.$formObj.form('get values');

        const arrAdditionalHosts = [];
        $(provider.hostRow).each((_, obj) => {
            if ($(obj).attr('data-value')) {
                arrAdditionalHosts.push({ address: $(obj).attr('data-value') });
            }
        });
        result.data.additionalHosts = JSON.stringify(arrAdditionalHosts);
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm() {
        // Response handled by Form module
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = provider.$formObj;
        
        // Prevent auto-submit on validation
        Form.$formObj.form({
            on: 'blur',
            inline: true,
            keyboardShortcuts: false,
            onSuccess: function(event) {
                // Prevent auto-submit, only submit via button click
                if (event) {
                    event.preventDefault();
                }
                return false;
            }
        });
        
        // Custom validation rule for host field
        Form.$formObj.form.settings.rules.checkHostProvider = (value) => {
            const regType = $('#registration_type').val();
            // For IAX, host is always required except for inbound
            if (provider.providerType === 'IAX') {
                if (regType === 'inbound') {
                    // For inbound, host is optional (we accept connections)
                    return true;
                }
                // For outbound and none, host is required
                return value.trim() !== '';
            }
            // For SIP, use original logic
            if (regType === 'inbound') {
                return true;
            }
            return value.trim() !== '';
        };
        
        // Custom validation rule for username field
        Form.$formObj.form.settings.rules.checkUsername = (value) => {
            const regType = $('#registration_type').val();
            
            if (provider.providerType === 'IAX') {
                // Username is always required for IAX
                if (value.trim() === '') {
                    return false;
                }
                // Check minimum length
                return value.length >= 2;
            }
            
            // For SIP
            if (provider.providerType === 'SIP') {
                // Username is not required when regType is 'none'
                if (regType === 'none') {
                    return true;
                }
                // For other types, check if empty
                if (value.length === 0) {
                    return false;
                }
                return value.length >= 2;
            }
            
            return true;
        };
        
        // Custom validation rule for secret field
        Form.$formObj.form.settings.rules.checkSecret = (value) => {
            const regType = $('#registration_type').val();
            
            if (provider.providerType === 'IAX') {
                // For IAX, secret is required for outbound and none
                if (regType === 'outbound' || regType === 'none') {
                    return value.trim() !== '';
                }
                // For inbound, secret is required if receive_calls_without_auth is not checked
                if (regType === 'inbound') {
                    const receiveWithoutAuth = $('#receive_calls_without_auth').checkbox('is checked');
                    if (!receiveWithoutAuth) {
                        return value.trim() !== '';
                    }
                }
            }
            
            // For SIP
            if (provider.providerType === 'SIP') {
                // Secret is not required when regType is 'none'
                if (regType === 'none') {
                    return true;
                }
                // For other types, secret is required if not empty
                if (value.trim() === '') {
                    return false;
                }
            }
            
            return true;
        };
        
        // Custom validation rule for port field
        Form.$formObj.form.settings.rules.checkPort = (value) => {
            const regType = $('#registration_type').val();
            
            if (provider.providerType === 'IAX') {
                // Port is not required for inbound
                if (regType === 'inbound') {
                    // Allow empty value for inbound
                    return true;
                }
                // For outbound and none, port is required
                if (!value || value.trim() === '') {
                    return false;
                }
                const port = parseInt(value, 10);
                return !isNaN(port) && port >= 1 && port <= 65535;
            }
            // For SIP, port is always required
            if (!value || value.trim() === '') {
                return false;
            }
            const port = parseInt(value, 10);
            return !isNaN(port) && port >= 1 && port <= 65535;
        };
        
        switch (provider.providerType) {
            case 'SIP':
                Form.url = `${globalRootUrl}providers/save/sip`; // Form submission URL
                break;
            case 'IAX':
                Form.url = `${globalRootUrl}providers/save/iax`; // Form submission URL
                break;
            default:
                return;
        }
        Form.validateRules = provider.getValidateRules(); // Form validation rules
        Form.cbBeforeSendForm = provider.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = provider.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

/**
 * Custom form validation rule for username.
 * @param {string} noregister - The value of the 'noregister' attribute.
 * @param {string} username - The value of the username input field.
 * @returns {boolean} - Whether the validation rule passes or not.
 */
$.fn.form.settings.rules.username = function (noregister, username) {
    return !(username.length === 0 && noregister !== 'on');
};

/**
 * Custom form validation rule for password strength
 * @param {string} value - The password value
 * @returns {boolean} - Whether the password meets strength requirements
 */
$.fn.form.settings.rules.checkPasswordStrength = function (value) {
    // Get registration type
    const regType = $('#registration_type').val();
    
    // Skip validation for outbound and none registration types
    if (regType === 'outbound' || regType === 'none') {
        return true;
    }
    
    // For generated passwords, always pass
    if (value.startsWith('id=') || value.length > 20) {
        return true;
    }
    
    // Check for minimum requirements
    const hasLowerCase = /[a-z]/.test(value);
    const hasUpperCase = /[A-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
    
    // Password should have at least 3 of 4 character types
    const strengthScore = [hasLowerCase, hasUpperCase, hasNumber, hasSpecialChar].filter(Boolean).length;
    
    return strengthScore >= 3;
};

/**
 *  Initialize provider management form on document ready
 */
$(document).ready(() => {
    provider.initialize();
});
