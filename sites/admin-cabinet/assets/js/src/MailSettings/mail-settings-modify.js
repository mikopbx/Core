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

/* global globalRootUrl, globalTranslate, Form, UserMessage, MailSettingsAPI, Config, TooltipBuilder, MailSettingsTooltipManager */

/**
 * Object for managing mail settings with OAuth2 support
 *
 * @module mailSettings
 */
const mailSettings = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#mail-settings-form'),

    /**
     * jQuery object for the checkboxes.
     * @type {jQuery}
     */
    $checkBoxes: $('#mail-settings-form .checkbox'),

    /**
     * jQuery object for the menu items.
     * @type {jQuery}
     */
    $menuItems: $('#mail-settings-menu .item'),

    /**
     * OAuth2 window reference
     * @type {Window|null}
     */
    oauth2Window: null,

    /**
     * Flag to track if initial data has been loaded from API
     * @type {boolean}
     */
    dataLoaded: false,

    /**
     * Get current validation rules based on form state
     * @returns {object} Validation rules
     */
    getValidateRules() {
        const rules = {};
        const authType = $('input[name="MailSMTPAuthType"]:checked').val();

        // Base email validation rules - always apply when fields have values
        rules.MailSMTPSenderAddress = {
            identifier: 'MailSMTPSenderAddress',
            optional: true,
            rules: [
                {
                    type: 'email',
                    prompt: globalTranslate.ms_ValidateSenderAddressInvalid,
                },
            ],
        };

        rules.SystemNotificationsEmail = {
            identifier: 'SystemNotificationsEmail',
            optional: true,
            rules: [
                {
                    type: 'email',
                    prompt: globalTranslate.ms_ValidateSystemEmailInvalid,
                },
            ],
        };

        rules.SystemEmailForMissed = {
            identifier: 'SystemEmailForMissed',
            optional: true,
            rules: [
                {
                    type: 'regExp',
                    value: '^(?!.*_@_\\._).*$',  // Reject _@_._ pattern
                    prompt: globalTranslate.ms_ValidateMissedEmailInvalid,
                },
                {
                    type: 'email',
                    prompt: globalTranslate.ms_ValidateMissedEmailInvalid,
                },
            ],
        };

        rules.VoicemailNotificationsEmail = {
            identifier: 'VoicemailNotificationsEmail',
            optional: true,
            rules: [
                {
                    type: 'regExp',
                    value: '^(?!.*_@_\\._).*$',  // Reject _@_._ pattern
                    prompt: globalTranslate.ms_ValidateVoicemailEmailInvalid,
                },
                {
                    type: 'email',
                    prompt: globalTranslate.ms_ValidateVoicemailEmailInvalid,
                },
            ],
        };

        // SMTP configuration rules - always available but optional
        rules.MailSMTPHost = {
            identifier: 'MailSMTPHost',
            optional: true,
            rules: [
                {
                    type: 'regExp',
                    value: '/^[a-zA-Z0-9.-]+$/',
                    prompt: globalTranslate.ms_ValidateSMTPHostInvalid,
                },
            ],
        };

        rules.MailSMTPPort = {
            identifier: 'MailSMTPPort',
            optional: true,
            rules: [
                {
                    type: 'integer[1..65535]',
                    prompt: globalTranslate.ms_ValidateSMTPPortInvalid,
                },
            ],
        };

        // Authentication-specific rules
        if (authType === 'oauth2') {
            // OAuth2 fields - optional
            rules.MailOAuth2Provider = {
                identifier: 'MailOAuth2Provider',
                optional: true,
                rules: [],
            };

            rules.MailOAuth2ClientId = {
                identifier: 'MailOAuth2ClientId',
                optional: true,
                rules: [],
            };

            rules.MailOAuth2ClientSecret = {
                identifier: 'MailOAuth2ClientSecret',
                optional: true,
                rules: [],
            };

            // Username for OAuth2 should be email when filled
            rules.MailSMTPUsername = {
                identifier: 'MailSMTPUsername',
                optional: true,
                rules: [
                    {
                        type: 'email',
                        prompt: globalTranslate.ms_ValidateSMTPUsernameEmail,
                    },
                ],
            };
        } else {
            // Password authentication
            // Username - optional
            rules.MailSMTPUsername = {
                identifier: 'MailSMTPUsername',
                optional: true,
                rules: [],
            };

            // Password - required if username is provided
            rules.MailSMTPPassword = {
                identifier: 'MailSMTPPassword',
                optional: true,
                depends: 'MailSMTPUsername',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.ms_ValidateSMTPPasswordEmpty,
                    },
                ],
            };
        }

        return rules;
    },

    /**
     * Update validation rules and reinitialize form
     */
    updateValidationRules() {
        // Get fresh validation rules based on current state
        const newRules = mailSettings.getValidateRules();

        // Update Form.validateRules
        Form.validateRules = newRules;

        // Reinitialize form validation with new rules
        mailSettings.$formObj.form('destroy');
        mailSettings.$formObj.form({
            fields: newRules,
            inline: true,
            on: 'blur'
        });
    },

    /**
     * Initialize the mail settings page.
     */
    initialize() {
        // Check for OAuth2 callback parameters in URL
        mailSettings.handleOAuth2Callback();

        mailSettings.$menuItems.tab({
            history: true,
            historyType: 'hash',
        });
        mailSettings.$checkBoxes.checkbox();

        // Initialize dropdowns with specific configurations
        // Don't initialize all dropdowns generically to avoid double initialization

        // Initialize encryption type dropdown with port auto-update
        $('#MailSMTPUseTLS-dropdown').dropdown({
            onChange(value) {
                mailSettings.updatePortBasedOnEncryption(value);
            }
        });

        // Check initial encryption type to show/hide certificate check
        const initialEncryption = $('#MailSMTPUseTLS').val() || 'none';
        mailSettings.updatePortBasedOnEncryption(initialEncryption);

        // Special initialization for OAuth2 provider dropdown (V5.0 pattern)
        $('#MailOAuth2Provider-dropdown').dropdown({
            clearable: false,
            forceSelection: false,
            onChange(value) {
                mailSettings.updateSMTPSettingsForProvider(value);
            }
        });

        // No other dropdowns in the form need initialization
        // MailSMTPUseTLS and MailOAuth2Provider are the only dropdowns

        mailSettings.initializeForm();
        mailSettings.initializeOAuth2();
        mailSettings.initializeAuthTypeHandlers();
        mailSettings.initializeNotificationHandlers();
        mailSettings.initializeTestButtons();
        mailSettings.initializeInputMasks();
        mailSettings.initializeTooltips();
        mailSettings.detectProviderFromEmail();
        mailSettings.initializeSenderAddressHandler();

        // Subscribe to EventBus OAuth2 events
        mailSettings.subscribeToOAuth2Events();

        // Monitor form changes to control test buttons
        mailSettings.monitorFormChanges();

        // Load data from API after all UI elements are initialized
        mailSettings.loadData();
    },

    /**
     * Initialize tooltips for form fields
     */
    initializeTooltips() {
        // Use MailSettingsTooltipManager to initialize tooltips
        if (typeof MailSettingsTooltipManager !== 'undefined') {
            MailSettingsTooltipManager.initializeTooltips(mailSettings);
        }
    },

    /**
     * Build HTML content for tooltip popup
     * Delegates to TooltipBuilder for consistent tooltip formatting
     *
     * @param {Object} tooltipData - Configuration object for tooltip content
     * @returns {string} HTML string for tooltip content
     */
    buildTooltipContent(tooltipData) {
        if (typeof TooltipBuilder !== 'undefined') {
            return TooltipBuilder.buildContent(tooltipData);
        }
        return '';
    },

    /**
     * Initialize input masks for email fields
     */
    initializeInputMasks() {
        // Initialize email input masks for all email fields
        const emailFields = [
            'MailSMTPSenderAddress',
            'SystemNotificationsEmail',
            'SystemEmailForMissed',
            'VoicemailNotificationsEmail'
        ];

        emailFields.forEach(fieldId => {
            const $field = $(`#${fieldId}`);
            if ($field.length > 0) {
                $field.inputmask('email', {
                    showMaskOnHover: false,
                    placeholder: '', // No placeholder character
                    onBeforePaste: function(pastedValue) {
                        // Clean placeholder values on paste
                        if (pastedValue === '_@_._' || pastedValue === '@' || pastedValue === '_@_') {
                            return '';
                        }
                        return pastedValue;
                    },
                    oncleared: function() {
                        // Clear the field value when mask is cleared
                        const $input = $(this);
                        if ($input.val() === '_@_._' || $input.val() === '@' || $input.val() === '_@_') {
                            $input.val('');
                        }
                    }
                });

                // Clean initial placeholder values
                if ($field.val() === '_@_._' || $field.val() === '@' || $field.val() === '_@_') {
                    $field.val('');
                }
            }
        });
    },

    /**
     * Load mail settings data from API
     */
    loadData() {
        // Show loading state
        mailSettings.$formObj.addClass('loading');

        MailSettingsAPI.getSettings((settings) => {
            if (settings) {
                // Temporarily disable our change handler to prevent duplicate API call
                $('input[name="MailSMTPAuthType"]').off('change.mailsettings');

                // Use unified silent population approach like GeneralSettings
                Form.populateFormSilently(settings, {
                    beforePopulate: (data) => {
                        // REST API returns booleans for checkbox fields
                        // Convert boolean values to strings for Semantic UI checkboxes
                        const booleanFields = [
                            'MailSMTPCertCheck',
                            'MailEnableNotifications',
                            'SendMissedCallNotifications',
                            'SendVoicemailNotifications',
                            'SendLoginNotifications',
                            'SendSystemNotifications'
                        ];
                        booleanFields.forEach(key => {
                            if (data[key] !== undefined) {
                                // Convert boolean to string "1" or "0"
                                data[key] = (data[key] === true || data[key] === 1 || data[key] === '1') ? '1' : '0';
                            }
                        });

                        // Ensure radio button value is set (will be handled silently by Form.populateFormSilently)
                        if (!data.MailSMTPAuthType) {
                            data.MailSMTPAuthType = 'password';
                        }

                        // Clean up placeholder email values
                        const emailFields = ['SystemEmailForMissed', 'VoicemailNotificationsEmail'];
                        emailFields.forEach(key => {
                            if (data[key] === '_@_._' || data[key] === '@' || data[key] === '_@_') {
                                data[key] = '';
                            }
                        });
                    },
                    afterPopulate: (data) => {
                        // Special handling for OAuth2 provider dropdown (V5.0 pattern)
                        if (data.MailOAuth2Provider) {
                            $('#MailOAuth2Provider-dropdown').dropdown('set selected', data.MailOAuth2Provider);
                            $('#MailOAuth2Provider').val(data.MailOAuth2Provider);
                        }

                        // Special handling for encryption type dropdown
                        if (data.MailSMTPUseTLS !== undefined) {
                            // Convert old boolean values to new format if needed
                            let encryptionValue = data.MailSMTPUseTLS;
                            if (encryptionValue === true || encryptionValue === 1 || encryptionValue === '1') {
                                encryptionValue = 'tls';
                            } else if (encryptionValue === false || encryptionValue === 0 || encryptionValue === '0' || encryptionValue === '') {
                                encryptionValue = 'none';
                            }
                            // Set the dropdown value
                            $('#MailSMTPUseTLS-dropdown').dropdown('set selected', encryptionValue);
                            $('#MailSMTPUseTLS').val(encryptionValue);
                        }

                        // Special handling for checkboxes using Semantic UI
                        if (data.MailSMTPCertCheck !== undefined) {
                            const isChecked = data.MailSMTPCertCheck === true || data.MailSMTPCertCheck === 1 || data.MailSMTPCertCheck === '1';
                            if (isChecked) {
                                $('#MailSMTPCertCheck').closest('.checkbox').checkbox('set checked');
                            } else {
                                $('#MailSMTPCertCheck').closest('.checkbox').checkbox('set unchecked');
                            }
                        }

                        if (data.MailEnableNotifications !== undefined) {
                            const isChecked = data.MailEnableNotifications === true || data.MailEnableNotifications === 1 || data.MailEnableNotifications === '1';
                            if (isChecked) {
                                $('#MailEnableNotifications').closest('.checkbox').checkbox('set checked');
                            } else {
                                $('#MailEnableNotifications').closest('.checkbox').checkbox('set unchecked');
                            }
                        }

                        // Handle notification type toggles
                        const notificationToggles = [
                            'SendMissedCallNotifications',
                            'SendVoicemailNotifications',
                            'SendLoginNotifications',
                            'SendSystemNotifications'
                        ];
                        notificationToggles.forEach(fieldName => {
                            if (data[fieldName] !== undefined) {
                                const isChecked = data[fieldName] === true || data[fieldName] === 1 || data[fieldName] === '1';
                                if (isChecked) {
                                    $(`#${fieldName}`).closest('.checkbox').checkbox('set checked');
                                } else {
                                    $(`#${fieldName}`).closest('.checkbox').checkbox('set unchecked');
                                }
                            }
                        });

                        // Initialize email fields visibility based on toggle states
                        // Must be called after checkboxes are set
                        mailSettings.initializeEmailFieldsVisibility();

                        // Update MailSMTPUsername placeholder with MailSMTPSenderAddress value
                        mailSettings.updateUsernamePlaceholder(data.MailSMTPSenderAddress);

                        // Check OAuth2 status if OAuth2 is selected
                        // Radio button is already set by Form.populateFormSilently
                        const authType = data.MailSMTPAuthType || 'password';
                        mailSettings.toggleAuthFields(authType, data);

                        // Update validation rules based on loaded state
                        mailSettings.updateValidationRules();

                        // Remove loading state
                        mailSettings.$formObj.removeClass('loading');

                        // Set flag that data is loaded
                        mailSettings.dataLoaded = true;

                        // Re-initialize dirty checking if enabled
                        if (Form.enableDirrity) {
                            Form.initializeDirrity();
                        }

                        // Re-enable our change handler for future user interactions
                        mailSettings.reAttachAuthTypeHandler();
                    }
                });
            }
        });
    },

    /**
     * Initialize OAuth2 functionality
     */
    initializeOAuth2() {
        // OAuth2 connect button handler
        $('#oauth2-connect').on('click', (e) => {
            e.preventDefault();
            mailSettings.startOAuth2Flow();
        });

        // OAuth2 disconnect button handler
        $('#oauth2-disconnect').on('click', (e) => {
            e.preventDefault();
            mailSettings.disconnectOAuth2();
        });

        // Listen for OAuth2 callback messages
        window.addEventListener('message', mailSettings.handleOAuth2Message);
    },

    /**
     * Initialize notification enable/disable handlers
     */
    initializeNotificationHandlers() {
        // Handle master notifications enable/disable checkbox
        $('#MailEnableNotifications').closest('.checkbox').checkbox({
            onChange: () => {
                mailSettings.toggleNotificationTypesSection();
                mailSettings.updateValidationRules();
                Form.dataChanged();
            }
        });

        // Handle individual notification type toggles
        // Each toggle shows/hides its corresponding email field
        $('#SendMissedCallNotifications').closest('.checkbox').checkbox({
            onChange: () => {
                mailSettings.toggleEmailField('SendMissedCallNotifications', 'SystemEmailForMissed');
                Form.dataChanged();
            }
        });

        $('#SendVoicemailNotifications').closest('.checkbox').checkbox({
            onChange: () => {
                mailSettings.toggleEmailField('SendVoicemailNotifications', 'VoicemailNotificationsEmail');
                Form.dataChanged();
            }
        });

        // SendLoginNotifications and SendSystemNotifications don't control email field visibility
        $('#SendLoginNotifications').closest('.checkbox').checkbox({
            onChange: () => {
                Form.dataChanged();
            }
        });

        $('#SendSystemNotifications').closest('.checkbox').checkbox({
            onChange: () => {
                Form.dataChanged();
            }
        });
    },

    /**
     * Toggle notification types section visibility based on MailEnableNotifications state
     */
    toggleNotificationTypesSection() {
        const isEnabled = $('#MailEnableNotifications').is(':checked');
        const $section = $('#notification-types-section');

        if (isEnabled) {
            $section.slideDown(300);
            // Also update individual email fields visibility after section is shown
            setTimeout(() => {
                mailSettings.initializeEmailFieldsVisibility();
            }, 350);
        } else {
            $section.slideUp(300);
        }
    },

    /**
     * Toggle email field visibility based on checkbox state
     * @param {string} toggleId - ID of the toggle checkbox
     * @param {string} emailFieldId - ID of the email field to show/hide
     */
    toggleEmailField(toggleId, emailFieldId) {
        const isChecked = $(`#${toggleId}`).is(':checked');
        const $emailField = $(`#${emailFieldId}`).closest('.field');

        if (isChecked) {
            $emailField.slideDown(200);
        } else {
            $emailField.slideUp(200);
        }
    },

    /**
     * Initialize email fields visibility based on current toggle states
     */
    initializeEmailFieldsVisibility() {
        // First, check master toggle and show/hide the entire notification types section
        const isNotificationsEnabled = $('#MailEnableNotifications').is(':checked');
        const $section = $('#notification-types-section');

        if (isNotificationsEnabled) {
            $section.show();
        } else {
            $section.hide();
            return; // No need to check individual fields if section is hidden
        }

        // Map of toggle IDs to their corresponding email field IDs
        // Note: SystemNotificationsEmail is always visible and not controlled by a toggle
        const toggleEmailMap = {
            'SendMissedCallNotifications': 'SystemEmailForMissed',
            'SendVoicemailNotifications': 'VoicemailNotificationsEmail'
        };

        // Set initial visibility for each email field
        Object.keys(toggleEmailMap).forEach(toggleId => {
            const emailFieldId = toggleEmailMap[toggleId];
            const isChecked = $(`#${toggleId}`).is(':checked');
            const $emailField = $(`#${emailFieldId}`).closest('.field');

            if (isChecked) {
                $emailField.show();
            } else {
                $emailField.hide();
            }
        });
    },

    /**
     * Attach auth type change handler
     */
    reAttachAuthTypeHandler() {
        $('input[name="MailSMTPAuthType"]').on('change.mailsettings', (e) => {
            const authType = $(e.target).val();
            // When user manually changes auth type, check OAuth2 status if needed
            mailSettings.toggleAuthFields(authType);
            // Update validation rules when auth type changes
            mailSettings.updateValidationRules();
            Form.dataChanged();
        });
    },

    /**
     * Initialize authentication type handlers
     */
    initializeAuthTypeHandlers() {
        // Attach initial handler
        mailSettings.reAttachAuthTypeHandler();

        // Initialize on page load - don't check OAuth2 status yet (will be done in loadData)
        const currentAuthType = $('input[name="MailSMTPAuthType"]:checked').val() || 'password';
        mailSettings.toggleAuthFieldsWithoutStatus(currentAuthType);
    },

    /**
     * Toggle authentication fields without checking OAuth2 status (for initial setup)
     * @param {string} authType - Authentication type
     */
    toggleAuthFieldsWithoutStatus(authType) {
        const $usernameField = $('#MailSMTPUsername').closest('.field');
        const $passwordField = $('#MailSMTPPassword').closest('.field');
        const $oauth2Section = $('#oauth2-auth-section');

        if (authType === 'oauth2') {
            // For OAuth2: show username (required for email identification), hide password
            $usernameField.show();
            $passwordField.hide();
            $oauth2Section.show();

            // Clear password field errors
            mailSettings.$formObj.form('remove prompt', 'MailSMTPPassword');
            $passwordField.removeClass('error');
        } else {
            // For password auth: show both username and password
            $usernameField.show();
            $passwordField.show();
            $oauth2Section.hide();

            // Clear OAuth2 field errors
            mailSettings.$formObj.form('remove prompt', 'MailOAuth2Provider');
            mailSettings.$formObj.form('remove prompt', 'MailOAuth2ClientId');
            mailSettings.$formObj.form('remove prompt', 'MailOAuth2ClientSecret');
            $('#MailOAuth2Provider').closest('.field').removeClass('error');
            $('#MailOAuth2ClientId').closest('.field').removeClass('error');
            $('#MailOAuth2ClientSecret').closest('.field').removeClass('error');
        }
    },

    /**
     * Toggle authentication fields based on type
     * @param {string} authType - Authentication type
     * @param {Object} [settings] - Optional settings data to avoid additional API call
     */
    toggleAuthFields(authType, settings = null) {
        // First toggle fields without status check
        mailSettings.toggleAuthFieldsWithoutStatus(authType);

        // Then check OAuth2 status only if needed
        if (authType === 'oauth2') {
            if (settings) {
                // Use existing settings data to avoid duplicate API call
                mailSettings.updateOAuth2Status(settings);
            } else {
                // Fallback to API call if no settings provided
                mailSettings.checkOAuth2Status();
            }
        }
    },

    /**
     * Initialize test buttons
     */
    initializeTestButtons() {
        // Test connection button
        $('#test-connection-button').on('click', (e) => {
            e.preventDefault();

            // Check if button is disabled
            if ($(e.currentTarget).hasClass('disabled')) {
                return false;
            }

            // Double-check for unsaved changes
            if (typeof Form !== 'undefined' && Form.hasChanges && Form.hasChanges()) {
                UserMessage.showWarning(
                    globalTranslate.ms_SaveChangesBeforeTesting
                );
                return false;
            }

            mailSettings.testConnection();
        });

        // Send test email button
        $('#send-test-email-button').on('click', (e) => {
            e.preventDefault();

            // Check if button is disabled
            if ($(e.currentTarget).hasClass('disabled')) {
                return false;
            }

            // Double-check for unsaved changes
            if (typeof Form !== 'undefined' && Form.hasChanges && Form.hasChanges()) {
                UserMessage.showWarning(
                    globalTranslate.ms_SaveChangesBeforeTesting
                );
                return false;
            }

            mailSettings.sendTestEmail();
        });
    },

    /**
     * Detect provider from email address
     */
    detectProviderFromEmail() {
        $('#MailSMTPUsername').on('change', (e) => {
            const email = $(e.target).val();
            if (!email) return;

            const provider = MailSettingsAPI.detectProvider(email);

            // Update provider field using Semantic UI dropdown (V5.0 pattern)
            $('#MailOAuth2Provider-dropdown').dropdown('set selected', provider);
            $('#MailOAuth2Provider').val(provider);

            // Show recommendations based on provider
            if (provider === 'google') {
                mailSettings.showProviderHint('Gmail detected. OAuth2 authentication will be required from March 2025.');
            } else if (provider === 'microsoft') {
                mailSettings.showProviderHint('Microsoft/Outlook detected. OAuth2 authentication recommended.');
            } else if (provider === 'yandex') {
                mailSettings.showProviderHint('Yandex Mail detected. Both password and OAuth2 authentication supported.');
            }

            // Auto-fill SMTP settings based on provider
            mailSettings.autoFillSMTPSettings(provider);
        });
    },

    /**
     * Update MailSMTPUsername placeholder with MailSMTPSenderAddress value
     * @param {string} senderAddress - Email address from MailSMTPSenderAddress field
     */
    updateUsernamePlaceholder(senderAddress) {
        const $usernameField = $('#MailSMTPUsername');
        if (senderAddress && senderAddress.trim() !== '') {
            $usernameField.attr('placeholder', senderAddress);
        } else {
            $usernameField.removeAttr('placeholder');
        }
    },

    /**
     * Initialize MailSMTPSenderAddress change handler to update username placeholder
     */
    initializeSenderAddressHandler() {
        $('#MailSMTPSenderAddress').on('input change', (e) => {
            const senderAddress = $(e.target).val();
            mailSettings.updateUsernamePlaceholder(senderAddress);
        });
    },

    /**
     * Auto-fill SMTP settings based on provider
     * @param {string} provider - Email provider
     */
    autoFillSMTPSettings(provider) {
        const settings = {
            google: {
                host: 'smtp.gmail.com',
                port: '587',
                tls: true
            },
            microsoft: {
                host: 'smtp.office365.com',
                port: '587',
                tls: true
            },
            yandex: {
                host: 'smtp.yandex.com',
                port: '465',
                tls: false
            }
        };

        if (settings[provider]) {
            const providerSettings = settings[provider];

            // Only fill if fields are empty
            if (!$('#MailSMTPHost').val()) {
                $('#MailSMTPHost').val(providerSettings.host);
            }
            if (!$('#MailSMTPPort').val()) {
                $('#MailSMTPPort').val(providerSettings.port);
            }

            // Update encryption dropdown
            const $encryptionDropdown = $('#MailSMTPUseTLS-dropdown');
            if ($encryptionDropdown.length > 0) {
                // Provider settings for encryption
                let encryptionValue = 'none';
                if (providerSettings.port === '587') {
                    encryptionValue = 'tls';
                } else if (providerSettings.port === '465') {
                    encryptionValue = 'ssl';
                }
                $encryptionDropdown.dropdown('set selected', encryptionValue);
            }
        }
    },

    /**
     * Update SMTP settings when OAuth2 provider is selected
     * @param {string} provider - Selected OAuth2 provider (google, microsoft, yandex)
     */
    updateSMTPSettingsForProvider(provider) {
        // Don't auto-fill until initial data is loaded
        if (!mailSettings.dataLoaded) {
            return;
        }

        // Only update if OAuth2 auth type is selected
        const authType = $('input[name="MailSMTPAuthType"]:checked').val();
        if (authType !== 'oauth2') {
            return;
        }

        // Define provider SMTP settings
        const providerSettings = {
            google: {
                host: 'smtp.gmail.com',
                port: '587',
                encryption: 'tls',
                certCheck: true
            },
            microsoft: {
                host: 'smtp-mail.outlook.com',
                port: '587',
                encryption: 'tls',
                certCheck: true
            },
            yandex: {
                host: 'smtp.yandex.ru',
                port: '587',
                encryption: 'tls',
                certCheck: true
            }
        };

        const settings = providerSettings[provider];
        if (!settings) {
            return;
        }

        // Update host
        $('#MailSMTPHost').val(settings.host);

        // Update port
        $('#MailSMTPPort').val(settings.port);

        // Update encryption type
        $('#MailSMTPUseTLS').val(settings.encryption);
        $('#MailSMTPUseTLS-dropdown').dropdown('set selected', settings.encryption);

        // Update certificate check
        if (settings.certCheck) {
            $('#MailSMTPCertCheck').closest('.checkbox').checkbox('set checked');
        }
    },

    /**
     * Update port based on selected encryption type
     * @param {string} encryptionType - Selected encryption type (none/tls/ssl)
     */
    updatePortBasedOnEncryption(encryptionType) {
        const $portField = $('#MailSMTPPort');

        // Only update if the user hasn't manually changed the port
        const currentPort = $portField.val();
        const standardPorts = ['25', '587', '465', ''];

        if (standardPorts.includes(currentPort)) {
            switch (encryptionType) {
                case 'none':
                    $portField.val('25');
                    break;
                case 'tls':
                    $portField.val('587');
                    break;
                case 'ssl':
                    $portField.val('465');
                    break;
            }
        }

        // Show/hide certificate check based on encryption type
        const $certCheckField = $('#cert-check-field');
        if (encryptionType === 'none') {
            // Hide certificate check for unencrypted connections
            $certCheckField.hide();
            // Uncheck the certificate check when hiding
            $('#MailSMTPCertCheck').closest('.checkbox').checkbox('set unchecked');
        } else {
            // Show certificate check for TLS/SSL connections
            $certCheckField.show();
        }
    },

    /**
     * Show provider hint message
     * @param {string} message - Hint message
     */
    showProviderHint(message) {
        const $hint = $('#provider-hint');
        if ($hint.length === 0) {
            $('#MailSMTPUsername').after(`<div id="provider-hint" class="ui info message">${message}</div>`);
        } else {
            $hint.text(message).show();
        }
    },

    /**
     * Handle OAuth2 callback parameters from URL
     */
    handleOAuth2Callback() {
        const urlParams = new URLSearchParams(window.location.search);

        // Check for success
        if (urlParams.has('oauth_success')) {
            // Reload settings to show updated OAuth2 status
            mailSettings.loadSettingsFromAPI();
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Check for error
        if (urlParams.has('oauth_error')) {
            const error = urlParams.get('oauth_error');
            UserMessage.showError(
                (globalTranslate.ms_OAuth2AuthorizationFailed || 'Ошибка OAuth2 авторизации: ') + decodeURIComponent(error)
            );
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    },

    /**
     * Start OAuth2 authorization flow
     */
    startOAuth2Flow() {
        const provider = $('#MailOAuth2Provider').val() || $('#MailOAuth2Provider-dropdown').dropdown('get value');

        if (!provider || provider === 'custom') {
            UserMessage.showError(globalTranslate.ms_ValidateOAuth2ProviderEmpty || 'Выберите OAuth2 провайдера');
            return;
        }

        // Check if Client ID and Secret are configured
        const clientId = $('#MailOAuth2ClientId').val();
        const clientSecret = $('#MailOAuth2ClientSecret').val();

        if (!clientId) {
            UserMessage.showError(globalTranslate.ms_ValidateOAuth2ClientIdEmpty || 'Введите Client ID');
            return;
        }

        if (!clientSecret) {
            UserMessage.showError(globalTranslate.ms_ValidateOAuth2ClientSecretEmpty || 'Введите Client Secret');
            return;
        }

        // Save OAuth2 credentials before starting the flow
        mailSettings.saveOAuth2Credentials(provider, clientId, clientSecret);

    },

    /**
     * Save OAuth2 credentials and then start authorization flow
     */
    saveOAuth2Credentials(provider, clientId, clientSecret) {
        const data = {
            MailOAuth2Provider: provider,
            MailOAuth2ClientId: clientId,
            MailOAuth2ClientSecret: clientSecret
        };

        // Use MailSettingsAPI for consistent error handling
        MailSettingsAPI.patchSettings(data, (response) => {
            if (response && response.result) {
                // Credentials saved, now get OAuth2 URL
                mailSettings.proceedWithOAuth2Flow(provider);
            } else {
                console.error('[MailSettings] Failed to save OAuth2 credentials:', response);
                const errorMessage = response && response.messages && response.messages.error
                    ? response.messages.error.join(', ')
                    : 'Failed to save OAuth2 credentials';
                UserMessage.showError(errorMessage);
            }
        });
    },

    /**
     * Request OAuth2 authorization URL and open authorization window
     */
    requestOAuth2AuthUrl(provider, clientId, clientSecret) {
        // Request authorization URL from API
        MailSettingsAPI.authorizeOAuth2(provider, clientId, clientSecret, (authUrl) => {

            if (authUrl) {
                // Open authorization window
                const width = 600;
                const height = 700;
                const left = (screen.width / 2) - (width / 2);
                const top = (screen.height / 2) - (height / 2);

                const authWindow = window.open(
                    authUrl,
                    'oauth2-auth',
                    `width=${width},height=${height},left=${left},top=${top}`
                );

                if (!authWindow) {
                    UserMessage.showError('Please allow popups for OAuth2 authorization');
                }
            } else {
                UserMessage.showError(globalTranslate.ms_OAuth2AuthorizationFailed || 'Ошибка авторизации OAuth2');
            }
        });
    },

    /**
     * Proceed with OAuth2 flow after credentials are saved
     */
    proceedWithOAuth2Flow(provider) {
        // Show loading state
        $('#oauth2-connect').addClass('loading');

        // Get OAuth2 URL with saved credentials
        MailSettingsAPI.getOAuth2Url(provider, (response) => {
            $('#oauth2-connect').removeClass('loading');

            if (response && response.auth_url) {

                // Open OAuth2 window
                const width = 600;
                const height = 700;
                const left = (screen.width / 2) - (width / 2);
                const top = (screen.height / 2) - (height / 2);

                mailSettings.oauth2Window = window.open(
                    response.auth_url,
                    'OAuth2Authorization',
                    `width=${width},height=${height},left=${left},top=${top}`
                );

                // Check if window was blocked
                if (!mailSettings.oauth2Window) {
                    UserMessage.showError('Please allow popups for OAuth2 authorization');
                }
            } else {
                console.error('[MailSettings] No auth_url in response:', response);
                UserMessage.showError('Failed to get OAuth2 authorization URL');
            }
        });
    },

    /**
     * Handle OAuth2 callback message
     * @param {MessageEvent} event - Message event
     */
    handleOAuth2Message(event) {
        // Validate origin
        if (event.origin !== window.location.origin) {
            return;
        }

        // Check for OAuth2 callback data
        if (event.data && event.data.type === 'oauth2-callback') {
            // Close OAuth2 window
            if (mailSettings.oauth2Window) {
                mailSettings.oauth2Window.close();
                mailSettings.oauth2Window = null;
            }

            // Process callback
            MailSettingsAPI.handleOAuth2Callback(event.data.params, (response) => {
                if (response && response.result) {
                    UserMessage.showInformation('OAuth2 authorization successful');
                    mailSettings.checkOAuth2Status();
                } else {
                    UserMessage.showError('OAuth2 authorization failed');
                }
            });
        }
    },

    /**
     * Update OAuth2 status display using provided settings data
     * @param {Object} settings - Settings data containing oauth2_status
     */
    updateOAuth2Status(settings) {
        if (settings && settings.oauth2_status) {
            const status = settings.oauth2_status;
            const $statusDiv = $('#oauth2-status');
            const $clientIdField = $('#MailOAuth2ClientId').closest('.field');
            const $clientSecretField = $('#MailOAuth2ClientSecret').closest('.field');

            if (status.configured) {
                const providerName = MailSettingsAPI.getProviderName(status.provider);
                const connectedText = globalTranslate.ms_OAuth2ConnectedTo.replace('{provider}', providerName);

                // Don't add extra status text - "Connected" already implies authorized
                $statusDiv.html(`
                    <div class="ui positive message">
                        <i class="check circle icon"></i>
                        ${connectedText}
                    </div>
                `);
                $('#oauth2-connect').hide();
                $('#oauth2-disconnect').show();

                // Hide Client ID and Client Secret fields when authorized
                if (status.authorized) {
                    $clientIdField.hide();
                    $clientSecretField.hide();
                } else {
                    $clientIdField.show();
                    $clientSecretField.show();
                }
            } else {
                $statusDiv.html(`
                    <div class="ui warning message">
                        <i class="exclamation triangle icon"></i>
                        ${globalTranslate.ms_OAuth2NotConfigured}
                    </div>
                `);
                $('#oauth2-connect').show();
                $('#oauth2-disconnect').hide();

                // Show Client ID and Client Secret fields when not authorized
                $clientIdField.show();
                $clientSecretField.show();
            }
        }
    },

    /**
     * Check OAuth2 connection status (makes API call)
     */
    checkOAuth2Status() {
        MailSettingsAPI.getSettings((settings) => {
            mailSettings.updateOAuth2Status(settings);
        });
    },

    /**
     * Disconnect OAuth2
     */
    disconnectOAuth2() {
        // Clear OAuth2 tokens immediately without confirmation
        const clearData = {
            MailOAuth2RefreshToken: '',
            MailOAuth2AccessToken: '',
            MailOAuth2TokenExpires: ''
        };

        MailSettingsAPI.patchSettings(clearData, (response) => {
            if (response && response.result) {
                // Just update the status without showing a message
                mailSettings.checkOAuth2Status();
                // Show the Client ID and Client Secret fields again
                $('#MailOAuth2ClientId').closest('.field').show();
                $('#MailOAuth2ClientSecret').closest('.field').show();
            } else {
                UserMessage.showError('Failed to disconnect OAuth2');
            }
        });
    },

    /**
     * Test SMTP connection
     */
    testConnection() {
        const $button = $('#test-connection-button');
        const $resultArea = $('#test-connection-result');

        // Clear previous result
        $resultArea.remove();

        $button.addClass('loading');

        MailSettingsAPI.testConnection((response) => {
            $button.removeClass('loading');

            // Create result area next to button
            let $result = $('<div id="test-connection-result" class="ui small message"></div>');
            $button.parent().append($result);

            if (response && response.result) {
                $result.addClass('positive').html('<i class="check circle icon"></i> ' + (response.messages?.success?.[0] || 'Connection successful'));

                // Show diagnostics info if available
                if (response.data?.diagnostics) {
                    const diag = response.data.diagnostics;
                    let details = '<div class="ui divider"></div><small>';
                    details += `Auth: ${diag.auth_type}, Server: ${diag.smtp_host}:${diag.smtp_port}, Encryption: ${diag.smtp_encryption}`;
                    if (diag.auth_type === 'oauth2' && diag.oauth2_provider) {
                        details += `<br>OAuth2: ${diag.oauth2_provider}`;
                        // Don't show expired token warning if connection is successful
                        // as it means refresh token is working correctly
                        if (diag.oauth2_refresh_token_exists) {
                            details += ` - ${globalTranslate.ms_DiagnosticAuthorized}`;
                        }
                    }
                    details += '</small>';
                    $result.append(details);
                }
            } else {
                // Show simple, user-friendly error message
                let mainMessage = globalTranslate.ms_DiagnosticConnectionFailed;

                // Use detailed error analysis if available for better user experience
                if (response?.data?.error_details?.probable_cause) {
                    mainMessage = response.data.error_details.probable_cause;
                }

                $result.addClass('negative').html('<i class="times circle icon"></i> ' + mainMessage);

                // Skip showing error type label - it's too technical for most users

                // Show raw PHPMailer error in a collapsible section only if it's significantly different
                if (response?.data?.error_details?.raw_error) {
                    const rawError = response.data.error_details.raw_error;
                    // Only show technical details if they contain more info than the user message
                    if (rawError.length > mainMessage.length + 50) {
                        let detailsHtml = '<div class="ui tiny accordion" style="margin-top: 10px;">';
                        detailsHtml += `<div class="title"><i class="dropdown icon"></i>${globalTranslate.ms_DiagnosticTechnicalDetails}</div>`;
                        detailsHtml += `<div class="content"><code style="font-size: 11px; word-break: break-all; display: block; white-space: pre-wrap;">${rawError}</code></div>`;
                        detailsHtml += '</div>';
                        $result.append(detailsHtml);

                        // Initialize accordion for technical details
                        $result.find('.accordion').accordion();
                    }
                }

                // Show minimal diagnostics info for failed connections
                if (response?.data?.diagnostics) {
                    const diag = response.data.diagnostics;
                    let details = '<div class="ui divider"></div><small>';
                    details += `${diag.auth_type.toUpperCase()}: ${diag.smtp_host}:${diag.smtp_port}`;
                    if (diag.smtp_encryption && diag.smtp_encryption !== 'none') {
                        details += ` (${diag.smtp_encryption.toUpperCase()})`;
                    }
                    details += '</small>';
                    $result.append(details);
                }

                // Show hints if available - limit to top 3 most relevant ones
                if (response?.data?.hints && response.data.hints.length > 0) {
                    let hints = '<div class="ui divider"></div><strong>Рекомендации:</strong><ul>';
                    // Show max 3 hints to avoid overwhelming the user
                    const relevantHints = response.data.hints.slice(0, 3);
                    relevantHints.forEach(hint => {
                        // Skip English hints if we have Russian ones
                        if (hint.includes('OAuth2 access token expired') && relevantHints.some(h => h.includes('токен'))) {
                            return;
                        }
                        hints += `<li>${hint}</li>`;
                    });
                    hints += '</ul>';
                    $result.append(hints);
                }
            }

            // Auto-hide after 30 seconds
            setTimeout(() => {
                $result.fadeOut(400, function() {
                    $(this).remove();
                });
            }, 30000);
        });
    },

    /**
     * Send test email
     */
    sendTestEmail() {
        const recipient = $('#SystemNotificationsEmail').val();

        if (!recipient) {
            // Show error next to button
            const $button = $('#send-test-email-button');
            let $result = $('<div id="send-test-result" class="ui small negative message"></div>');
            $result.html('<i class="times circle icon"></i> Please enter a recipient email address');
            $('#send-test-result').remove();
            $button.parent().append($result);

            // Auto-hide after 10 seconds
            setTimeout(() => {
                $result.fadeOut(400, function() {
                    $(this).remove();
                });
            }, 10000);
            return;
        }

        const $button = $('#send-test-email-button');
        const $resultArea = $('#send-test-result');

        // Clear previous result
        $resultArea.remove();

        $button.addClass('loading');

        const data = {
            to: recipient
            // Let the server generate enhanced email content with system info
        };

        MailSettingsAPI.sendTestEmail(data, (response) => {
            $button.removeClass('loading');

            // Create result area next to button
            let $result = $('<div id="send-test-result" class="ui small message"></div>');
            $button.parent().append($result);

            if (response && response.result) {
                // Get the actual recipient from response
                const actualRecipient = response.data?.to || recipient;

                // Use the message from API which already includes the email address
                let successMessage = response.messages?.success?.[0] || 'Test email sent';

                // If message doesn't include email but we have it, add it
                if (!successMessage.includes('@') && actualRecipient) {
                    successMessage = successMessage.replace('Письмо отправлено', `Письмо отправлено → ${actualRecipient}`);
                }

                $result.addClass('positive').html(
                    '<i class="check circle icon"></i> ' + successMessage
                );

                // Show diagnostics info if available
                if (response.data?.diagnostics) {
                    const diag = response.data.diagnostics;
                    let details = '<div class="ui divider"></div><small>';
                    if (diag.auth_type === 'oauth2') {
                        const provider = diag.oauth2_provider || 'OAuth2';
                        details += `Using: OAuth2`;
                        if (provider && provider !== 'OAuth2') {
                            details += ` (${provider})`;
                        }
                    } else {
                        details += `Using: Password authentication`;
                    }
                    details += `, Server: ${diag.smtp_host}:${diag.smtp_port}`;
                    details += '</small>';
                    $result.append(details);
                }
            } else {
                const message = response?.messages?.error?.join(', ') || globalTranslate.ms_DiagnosticConnectionFailed;
                $result.addClass('negative').html('<i class="times circle icon"></i> ' + message);

                // Show detailed error analysis if available
                if (response?.data?.error_details) {
                    const errorDetails = response.data.error_details;
                    let detailsHtml = '<div class="ui divider"></div>';

                    // Skip showing error type label - it's too technical for most users

                    if (errorDetails.probable_cause) {
                        detailsHtml += `<strong>${globalTranslate.ms_DiagnosticProbableCause}</strong> ${errorDetails.probable_cause}<br>`;
                    }

                    // Show raw PHPMailer error in a collapsible section
                    if (errorDetails.raw_error && errorDetails.raw_error !== message) {
                        detailsHtml += '<div class="ui tiny accordion" style="margin-top: 10px;">';
                        detailsHtml += `<div class="title"><i class="dropdown icon"></i>${globalTranslate.ms_DiagnosticTechnicalDetails}</div>`;
                        detailsHtml += `<div class="content"><code style="font-size: 11px; word-break: break-all;">${errorDetails.raw_error}</code></div>`;
                        detailsHtml += '</div>';
                    }

                    $result.append(detailsHtml);

                    // Initialize accordion for technical details
                    $result.find('.accordion').accordion();
                }

                // Show hints if available - limit to top 3 most relevant ones
                if (response?.data?.hints && response.data.hints.length > 0) {
                    let hints = '<div class="ui divider"></div><strong>Рекомендации:</strong><ul>';
                    // Show max 3 hints to avoid overwhelming the user
                    const relevantHints = response.data.hints.slice(0, 3);
                    relevantHints.forEach(hint => {
                        // Skip English hints if we have Russian ones
                        if (hint.includes('OAuth2 access token expired') && relevantHints.some(h => h.includes('токен'))) {
                            return;
                        }
                        hints += `<li>${hint}</li>`;
                    });
                    hints += '</ul>';
                    $result.append(hints);
                }
            }

            // Auto-hide after 30 seconds
            setTimeout(() => {
                $result.fadeOut(400, function() {
                    $(this).remove();
                });
            }, 30000);
        });
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = mailSettings.$formObj.form('get values');

        // Get unmasked values for email fields FIRST
        const emailFields = [
            'MailSMTPSenderAddress',
            'SystemNotificationsEmail',
            'SystemEmailForMissed',
            'VoicemailNotificationsEmail'
        ];

        emailFields.forEach(fieldId => {
            const $field = $(`#${fieldId}`);
            if ($field.length > 0) {
                let originalValue = $field.val() || '';
                let fieldValue = originalValue;

                // For email inputmask, try different approaches to get clean value
                if (fieldValue) {
                    // Check if value contains placeholder patterns
                    if (fieldValue.includes('_@_') || fieldValue === '@.' || fieldValue === '@' || fieldValue === '_') {
                        fieldValue = '';
                    } else {
                        // Try to get unmasked value for email fields
                        try {
                            // Check if inputmask plugin is available
                            if ($field.inputmask && typeof $field.inputmask === 'function') {
                                const unmaskedValue = $field.inputmask('unmaskedvalue');
                                if (unmaskedValue && unmaskedValue !== fieldValue && !unmaskedValue.includes('_')) {
                                    fieldValue = unmaskedValue;
                                }
                            }
                        } catch (e) {
                            console.warn(`[MailSettings] Failed to get unmasked value for ${fieldId}:`, e);
                        }
                    }
                }
                result.data[fieldId] = fieldValue;
            }
        });

        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        // No success message needed - form saves silently
    },

    /**
     * Initialize the form for saving settings
     */
    initializeForm() {
        Form.$formObj = mailSettings.$formObj;

        // Enable REST API mode (modern approach like GeneralSettings)
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = MailSettingsAPI;
        Form.apiSettings.saveMethod = 'patchSettings';

        // Enable checkbox to boolean conversion for cleaner API requests
        Form.convertCheckboxesToBool = true;

        // Enable sending only changed fields for optimal PATCH semantics
        Form.sendOnlyChanged = true;

        // No redirect after save - stay on the same page
        Form.afterSubmitModifyUrl = null;

        // Use '#' for URL when using apiSettings
        Form.url = '#';

        // Use dynamic validation rules based on current state
        Form.validateRules = mailSettings.getValidateRules();
        Form.cbBeforeSendForm = mailSettings.cbBeforeSendForm;
        Form.cbAfterSendForm = mailSettings.cbAfterSendForm;
        Form.initialize();
    },

    /**
     * Subscribe to EventBus OAuth2 events
     */
    subscribeToOAuth2Events() {
        if (typeof EventBus !== 'undefined') {
            // Subscribe to OAuth2 authorization events
            EventBus.subscribe('oauth2-authorization', (data) => {

                if (data.status === 'success') {
                    // Success: refresh OAuth2 status after a short delay
                    setTimeout(() => {
                        mailSettings.checkOAuth2Status();
                    }, 1000);
                } else if (data.status === 'error') {
                    // Error: show error message
                    UserMessage.showError(
                        data.message || globalTranslate.ms_OAuth2ProcessingFailed,
                        4000
                    );
                }
            });
        }
    },

    /**
     * Monitor form changes to control test button states
     */
    monitorFormChanges() {
        // Initially buttons should be enabled (no changes yet)
        mailSettings.updateTestButtonStates();

        // Subscribe to form change events - check real form state
        mailSettings.$formObj.on('change.testbuttons', 'input, select, textarea', () => {
            // Use Form's built-in change detection
            mailSettings.updateTestButtonStates();
        });

        // Also monitor Form's dataChanged events
        mailSettings.$formObj.on('form.dataChanged', () => {
            mailSettings.updateTestButtonStates();
        });

        // Reset state after successful save
        const originalAfterSendForm = mailSettings.cbAfterSendForm;
        mailSettings.cbAfterSendForm = (response) => {
            originalAfterSendForm(response);
            if (response && response.success) {
                // After successful save, buttons should be enabled
                setTimeout(() => {
                    mailSettings.updateTestButtonStates();
                }, 100);
            }
        };
    },

    /**
     * Update test button states based on form changes
     */
    updateTestButtonStates() {
        const $testConnectionBtn = $('#test-connection-button');
        const $sendTestEmailBtn = $('#send-test-email-button');
        const $submitBtn = $('#submitbutton');

        // Check if form has unsaved changes using Form's built-in method
        const hasChanges = typeof Form !== 'undefined' && Form.hasChanges && Form.hasChanges();

        if (hasChanges) {
            // Form has changes - disable test buttons with visual feedback
            $testConnectionBtn
                .addClass('disabled')
                .attr('data-tooltip', globalTranslate.ms_SaveChangesBeforeTesting)
                .attr('data-position', 'top center')
                .attr('data-inverted', '');

            $sendTestEmailBtn
                .addClass('disabled')
                .attr('data-tooltip', globalTranslate.ms_SaveChangesBeforeTesting)
                .attr('data-position', 'top center')
                .attr('data-inverted', '');

            // Make sure save button is visible/enabled when there are changes
            $submitBtn.removeClass('disabled').show();
        } else {
            // No changes - enable test buttons
            $testConnectionBtn
                .removeClass('disabled')
                .removeAttr('data-tooltip')
                .removeAttr('data-position')
                .removeAttr('data-inverted');

            $sendTestEmailBtn
                .removeClass('disabled')
                .removeAttr('data-tooltip')
                .removeAttr('data-position')
                .removeAttr('data-inverted');
        }

        // Re-initialize tooltips for buttons
        $('.ui.button[data-tooltip]').popup();
    },

};

// Initialize when DOM is ready
$(document).ready(() => {
    mailSettings.initialize();

    // Ensure click prevention for tooltip icons in checkboxes
    // This prevents checkbox toggle when clicking on tooltip icon
    $('.field-info-icon').off('click.tooltip-prevent').on('click.tooltip-prevent', function(e) {
        e.stopPropagation();
        e.preventDefault();
        return false;
    });
});