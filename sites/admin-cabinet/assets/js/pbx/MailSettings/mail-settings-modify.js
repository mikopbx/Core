"use strict";

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
var mailSettings = {
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
  getValidateRules: function getValidateRules() {
    var rules = {};
    var authType = $('input[name="MailSMTPAuthType"]:checked').val(); // Base email validation rules - always apply when fields have values

    rules.MailSMTPSenderAddress = {
      identifier: 'MailSMTPSenderAddress',
      optional: true,
      rules: [{
        type: 'email',
        prompt: globalTranslate.ms_ValidateSenderAddressInvalid
      }]
    };
    rules.SystemNotificationsEmail = {
      identifier: 'SystemNotificationsEmail',
      optional: true,
      rules: [{
        type: 'email',
        prompt: globalTranslate.ms_ValidateSystemEmailInvalid
      }]
    };
    rules.SystemEmailForMissed = {
      identifier: 'SystemEmailForMissed',
      optional: true,
      rules: [{
        type: 'regExp',
        value: '^(?!.*_@_\\._).*$',
        // Reject _@_._ pattern
        prompt: globalTranslate.ms_ValidateMissedEmailInvalid
      }, {
        type: 'email',
        prompt: globalTranslate.ms_ValidateMissedEmailInvalid
      }]
    };
    rules.VoicemailNotificationsEmail = {
      identifier: 'VoicemailNotificationsEmail',
      optional: true,
      rules: [{
        type: 'regExp',
        value: '^(?!.*_@_\\._).*$',
        // Reject _@_._ pattern
        prompt: globalTranslate.ms_ValidateVoicemailEmailInvalid
      }, {
        type: 'email',
        prompt: globalTranslate.ms_ValidateVoicemailEmailInvalid
      }]
    }; // SMTP configuration rules - always available but optional

    rules.MailSMTPHost = {
      identifier: 'MailSMTPHost',
      optional: true,
      rules: [{
        type: 'regExp',
        value: '/^[a-zA-Z0-9.-]+$/',
        prompt: globalTranslate.ms_ValidateSMTPHostInvalid
      }]
    };
    rules.MailSMTPPort = {
      identifier: 'MailSMTPPort',
      optional: true,
      rules: [{
        type: 'integer[1..65535]',
        prompt: globalTranslate.ms_ValidateSMTPPortInvalid
      }]
    }; // Authentication-specific rules

    if (authType === 'oauth2') {
      // OAuth2 fields - optional
      rules.MailOAuth2Provider = {
        identifier: 'MailOAuth2Provider',
        optional: true,
        rules: []
      };
      rules.MailOAuth2ClientId = {
        identifier: 'MailOAuth2ClientId',
        optional: true,
        rules: []
      };
      rules.MailOAuth2ClientSecret = {
        identifier: 'MailOAuth2ClientSecret',
        optional: true,
        rules: []
      }; // Username for OAuth2 should be email when filled

      rules.MailSMTPUsername = {
        identifier: 'MailSMTPUsername',
        optional: true,
        rules: [{
          type: 'email',
          prompt: globalTranslate.ms_ValidateSMTPUsernameEmail
        }]
      };
    } else {
      // Password authentication
      // Username - optional
      rules.MailSMTPUsername = {
        identifier: 'MailSMTPUsername',
        optional: true,
        rules: []
      }; // Password - required if username is provided

      rules.MailSMTPPassword = {
        identifier: 'MailSMTPPassword',
        optional: true,
        depends: 'MailSMTPUsername',
        rules: [{
          type: 'empty',
          prompt: globalTranslate.ms_ValidateSMTPPasswordEmpty
        }]
      };
    }

    return rules;
  },

  /**
   * Update validation rules and reinitialize form
   */
  updateValidationRules: function updateValidationRules() {
    // Get fresh validation rules based on current state
    var newRules = mailSettings.getValidateRules(); // Update Form.validateRules

    Form.validateRules = newRules; // Reinitialize form validation with new rules

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
  initialize: function initialize() {
    // Check for OAuth2 callback parameters in URL
    mailSettings.handleOAuth2Callback();
    mailSettings.$menuItems.tab({
      history: true,
      historyType: 'hash'
    });
    mailSettings.$checkBoxes.checkbox(); // Initialize dropdowns with specific configurations
    // Don't initialize all dropdowns generically to avoid double initialization
    // Initialize encryption type dropdown with port auto-update

    $('#MailSMTPUseTLS-dropdown').dropdown({
      onChange: function onChange(value) {
        mailSettings.updatePortBasedOnEncryption(value);
      }
    }); // Check initial encryption type to show/hide certificate check

    var initialEncryption = $('#MailSMTPUseTLS').val() || 'none';
    mailSettings.updatePortBasedOnEncryption(initialEncryption); // Special initialization for OAuth2 provider dropdown (V5.0 pattern)

    $('#MailOAuth2Provider-dropdown').dropdown({
      clearable: false,
      forceSelection: false,
      onChange: function onChange(value) {
        mailSettings.updateSMTPSettingsForProvider(value);
      }
    }); // No other dropdowns in the form need initialization
    // MailSMTPUseTLS and MailOAuth2Provider are the only dropdowns

    mailSettings.initializeForm();
    mailSettings.initializeOAuth2();
    mailSettings.initializeAuthTypeHandlers();
    mailSettings.initializeNotificationHandlers();
    mailSettings.initializeTestButtons();
    mailSettings.initializeInputMasks();
    mailSettings.initializeTooltips();
    mailSettings.detectProviderFromEmail();
    mailSettings.initializeSenderAddressHandler(); // Subscribe to EventBus OAuth2 events

    mailSettings.subscribeToOAuth2Events(); // Monitor form changes to control test buttons

    mailSettings.monitorFormChanges(); // Load data from API after all UI elements are initialized

    mailSettings.loadData();
  },

  /**
   * Initialize tooltips for form fields
   */
  initializeTooltips: function initializeTooltips() {
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
  buildTooltipContent: function buildTooltipContent(tooltipData) {
    if (typeof TooltipBuilder !== 'undefined') {
      return TooltipBuilder.buildContent(tooltipData);
    }

    return '';
  },

  /**
   * Initialize input masks for email fields
   */
  initializeInputMasks: function initializeInputMasks() {
    // Initialize email input masks for all email fields
    var emailFields = ['MailSMTPSenderAddress', 'SystemNotificationsEmail', 'SystemEmailForMissed', 'VoicemailNotificationsEmail'];
    emailFields.forEach(function (fieldId) {
      var $field = $("#".concat(fieldId));

      if ($field.length > 0) {
        $field.inputmask('email', {
          showMaskOnHover: false,
          placeholder: '',
          // No placeholder character
          onBeforePaste: function onBeforePaste(pastedValue) {
            // Clean placeholder values on paste
            if (pastedValue === '_@_._' || pastedValue === '@' || pastedValue === '_@_') {
              return '';
            }

            return pastedValue;
          },
          oncleared: function oncleared() {
            // Clear the field value when mask is cleared
            var $input = $(this);

            if ($input.val() === '_@_._' || $input.val() === '@' || $input.val() === '_@_') {
              $input.val('');
            }
          }
        }); // Clean initial placeholder values

        if ($field.val() === '_@_._' || $field.val() === '@' || $field.val() === '_@_') {
          $field.val('');
        }
      }
    });
  },

  /**
   * Load mail settings data from API
   */
  loadData: function loadData() {
    // Show loading state
    mailSettings.$formObj.addClass('loading');
    MailSettingsAPI.getSettings(function (settings) {
      if (settings) {
        // Temporarily disable our change handler to prevent duplicate API call
        $('input[name="MailSMTPAuthType"]').off('change.mailsettings'); // Use unified silent population approach like GeneralSettings

        Form.populateFormSilently(settings, {
          beforePopulate: function beforePopulate(data) {
            // REST API returns booleans for checkbox fields
            // Convert boolean values to strings for Semantic UI checkboxes
            var booleanFields = ['MailSMTPCertCheck', 'MailEnableNotifications', 'SendMissedCallNotifications', 'SendVoicemailNotifications', 'SendLoginNotifications', 'SendSystemNotifications', 'MailPlainText'];
            booleanFields.forEach(function (key) {
              if (data[key] !== undefined) {
                // Convert boolean to string "1" or "0"
                data[key] = data[key] === true || data[key] === 1 || data[key] === '1' ? '1' : '0';
              }
            }); // Ensure radio button value is set (will be handled silently by Form.populateFormSilently)

            if (!data.MailSMTPAuthType) {
              data.MailSMTPAuthType = 'password';
            } // Clean up placeholder email values


            var emailFields = ['SystemEmailForMissed', 'VoicemailNotificationsEmail'];
            emailFields.forEach(function (key) {
              if (data[key] === '_@_._' || data[key] === '@' || data[key] === '_@_') {
                data[key] = '';
              }
            });
          },
          afterPopulate: function afterPopulate(data) {
            // Special handling for OAuth2 provider dropdown (V5.0 pattern)
            if (data.MailOAuth2Provider) {
              $('#MailOAuth2Provider-dropdown').dropdown('set selected', data.MailOAuth2Provider);
              $('#MailOAuth2Provider').val(data.MailOAuth2Provider);
            } // Special handling for encryption type dropdown


            if (data.MailSMTPUseTLS !== undefined) {
              // Convert old boolean values to new format if needed
              var encryptionValue = data.MailSMTPUseTLS;

              if (encryptionValue === true || encryptionValue === 1 || encryptionValue === '1') {
                encryptionValue = 'tls';
              } else if (encryptionValue === false || encryptionValue === 0 || encryptionValue === '0' || encryptionValue === '') {
                encryptionValue = 'none';
              } // Set the dropdown value


              $('#MailSMTPUseTLS-dropdown').dropdown('set selected', encryptionValue);
              $('#MailSMTPUseTLS').val(encryptionValue);
            } // Special handling for checkboxes using Semantic UI


            if (data.MailSMTPCertCheck !== undefined) {
              var isChecked = data.MailSMTPCertCheck === true || data.MailSMTPCertCheck === 1 || data.MailSMTPCertCheck === '1';

              if (isChecked) {
                $('#MailSMTPCertCheck').closest('.checkbox').checkbox('set checked');
              } else {
                $('#MailSMTPCertCheck').closest('.checkbox').checkbox('set unchecked');
              }
            }

            if (data.MailEnableNotifications !== undefined) {
              var _isChecked = data.MailEnableNotifications === true || data.MailEnableNotifications === 1 || data.MailEnableNotifications === '1';

              if (_isChecked) {
                $('#MailEnableNotifications').closest('.checkbox').checkbox('set checked');
              } else {
                $('#MailEnableNotifications').closest('.checkbox').checkbox('set unchecked');
              }
            } // Handle notification type toggles


            var notificationToggles = ['SendMissedCallNotifications', 'SendVoicemailNotifications', 'SendLoginNotifications', 'SendSystemNotifications', 'MailPlainText'];
            notificationToggles.forEach(function (fieldName) {
              if (data[fieldName] !== undefined) {
                var _isChecked2 = data[fieldName] === true || data[fieldName] === 1 || data[fieldName] === '1';

                if (_isChecked2) {
                  $("#".concat(fieldName)).closest('.checkbox').checkbox('set checked');
                } else {
                  $("#".concat(fieldName)).closest('.checkbox').checkbox('set unchecked');
                }
              }
            }); // Initialize email fields visibility based on toggle states
            // Must be called after checkboxes are set

            mailSettings.initializeEmailFieldsVisibility(); // Update MailSMTPUsername placeholder with MailSMTPSenderAddress value

            mailSettings.updateUsernamePlaceholder(data.MailSMTPSenderAddress); // Check OAuth2 status if OAuth2 is selected
            // Radio button is already set by Form.populateFormSilently

            var authType = data.MailSMTPAuthType || 'password';
            mailSettings.toggleAuthFields(authType, data); // Update validation rules based on loaded state

            mailSettings.updateValidationRules(); // Remove loading state

            mailSettings.$formObj.removeClass('loading'); // Set flag that data is loaded

            mailSettings.dataLoaded = true; // Re-initialize dirty checking if enabled

            if (Form.enableDirrity) {
              Form.initializeDirrity();
            } // Re-enable our change handler for future user interactions


            mailSettings.reAttachAuthTypeHandler();
          }
        });
      }
    });
  },

  /**
   * Initialize OAuth2 functionality
   */
  initializeOAuth2: function initializeOAuth2() {
    // OAuth2 connect button handler
    $('#oauth2-connect').on('click', function (e) {
      e.preventDefault();
      mailSettings.startOAuth2Flow();
    }); // OAuth2 disconnect button handler

    $('#oauth2-disconnect').on('click', function (e) {
      e.preventDefault();
      mailSettings.disconnectOAuth2();
    }); // Listen for OAuth2 callback messages

    window.addEventListener('message', mailSettings.handleOAuth2Message);
  },

  /**
   * Initialize notification enable/disable handlers
   */
  initializeNotificationHandlers: function initializeNotificationHandlers() {
    // Handle master notifications enable/disable checkbox
    $('#MailEnableNotifications').closest('.checkbox').checkbox({
      onChange: function onChange() {
        mailSettings.toggleNotificationTypesSection();
        mailSettings.updateValidationRules();
        Form.dataChanged();
      }
    }); // Handle individual notification type toggles
    // Each toggle shows/hides its corresponding email field

    $('#SendMissedCallNotifications').closest('.checkbox').checkbox({
      onChange: function onChange() {
        mailSettings.toggleEmailField('SendMissedCallNotifications', 'SystemEmailForMissed');
        Form.dataChanged();
      }
    });
    $('#SendVoicemailNotifications').closest('.checkbox').checkbox({
      onChange: function onChange() {
        mailSettings.toggleEmailField('SendVoicemailNotifications', 'VoicemailNotificationsEmail');
        Form.dataChanged();
      }
    }); // SendLoginNotifications and SendSystemNotifications don't control email field visibility

    $('#SendLoginNotifications').closest('.checkbox').checkbox({
      onChange: function onChange() {
        Form.dataChanged();
      }
    });
    $('#SendSystemNotifications').closest('.checkbox').checkbox({
      onChange: function onChange() {
        Form.dataChanged();
      }
    });
  },

  /**
   * Toggle notification types section visibility based on MailEnableNotifications state
   */
  toggleNotificationTypesSection: function toggleNotificationTypesSection() {
    var isEnabled = $('#MailEnableNotifications').is(':checked');
    var $section = $('#notification-types-section');

    if (isEnabled) {
      $section.slideDown(300); // Also update individual email fields visibility after section is shown

      setTimeout(function () {
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
  toggleEmailField: function toggleEmailField(toggleId, emailFieldId) {
    var isChecked = $("#".concat(toggleId)).is(':checked');
    var $emailField = $("#".concat(emailFieldId)).closest('.field');

    if (isChecked) {
      $emailField.slideDown(200);
    } else {
      $emailField.slideUp(200);
    }
  },

  /**
   * Initialize email fields visibility based on current toggle states
   */
  initializeEmailFieldsVisibility: function initializeEmailFieldsVisibility() {
    // First, check master toggle and show/hide the entire notification types section
    var isNotificationsEnabled = $('#MailEnableNotifications').is(':checked');
    var $section = $('#notification-types-section');

    if (isNotificationsEnabled) {
      $section.show();
    } else {
      $section.hide();
      return; // No need to check individual fields if section is hidden
    } // Map of toggle IDs to their corresponding email field IDs
    // Note: SystemNotificationsEmail is always visible and not controlled by a toggle


    var toggleEmailMap = {
      'SendMissedCallNotifications': 'SystemEmailForMissed',
      'SendVoicemailNotifications': 'VoicemailNotificationsEmail'
    }; // Set initial visibility for each email field

    Object.keys(toggleEmailMap).forEach(function (toggleId) {
      var emailFieldId = toggleEmailMap[toggleId];
      var isChecked = $("#".concat(toggleId)).is(':checked');
      var $emailField = $("#".concat(emailFieldId)).closest('.field');

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
  reAttachAuthTypeHandler: function reAttachAuthTypeHandler() {
    $('input[name="MailSMTPAuthType"]').on('change.mailsettings', function (e) {
      var authType = $(e.target).val(); // When user manually changes auth type, check OAuth2 status if needed

      mailSettings.toggleAuthFields(authType); // Update validation rules when auth type changes

      mailSettings.updateValidationRules();
      Form.dataChanged();
    });
  },

  /**
   * Initialize authentication type handlers
   */
  initializeAuthTypeHandlers: function initializeAuthTypeHandlers() {
    // Attach initial handler
    mailSettings.reAttachAuthTypeHandler(); // Initialize on page load - don't check OAuth2 status yet (will be done in loadData)

    var currentAuthType = $('input[name="MailSMTPAuthType"]:checked').val() || 'password';
    mailSettings.toggleAuthFieldsWithoutStatus(currentAuthType);
  },

  /**
   * Toggle authentication fields without checking OAuth2 status (for initial setup)
   * @param {string} authType - Authentication type
   */
  toggleAuthFieldsWithoutStatus: function toggleAuthFieldsWithoutStatus(authType) {
    var $usernameField = $('#MailSMTPUsername').closest('.field');
    var $passwordField = $('#MailSMTPPassword').closest('.field');
    var $oauth2Section = $('#oauth2-auth-section');

    if (authType === 'oauth2') {
      // For OAuth2: show username (required for email identification), hide password
      $usernameField.show();
      $passwordField.hide();
      $oauth2Section.show(); // Clear password field errors

      mailSettings.$formObj.form('remove prompt', 'MailSMTPPassword');
      $passwordField.removeClass('error');
    } else {
      // For password auth: show both username and password
      $usernameField.show();
      $passwordField.show();
      $oauth2Section.hide(); // Clear OAuth2 field errors

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
  toggleAuthFields: function toggleAuthFields(authType) {
    var settings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    // First toggle fields without status check
    mailSettings.toggleAuthFieldsWithoutStatus(authType); // Then check OAuth2 status only if needed

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
  initializeTestButtons: function initializeTestButtons() {
    // Test connection button
    $('#test-connection-button').on('click', function (e) {
      e.preventDefault(); // Check if button is disabled (has unsaved changes)

      if ($(e.currentTarget).hasClass('disabled')) {
        UserMessage.showWarning(globalTranslate.ms_SaveChangesBeforeTesting);
        return false;
      }

      mailSettings.testConnection();
    }); // Send test email button

    $('#send-test-email-button').on('click', function (e) {
      e.preventDefault(); // Check if button is disabled (has unsaved changes)

      if ($(e.currentTarget).hasClass('disabled')) {
        UserMessage.showWarning(globalTranslate.ms_SaveChangesBeforeTesting);
        return false;
      }

      mailSettings.sendTestEmail();
    });
  },

  /**
   * Detect provider from email address
   */
  detectProviderFromEmail: function detectProviderFromEmail() {
    $('#MailSMTPUsername').on('change', function (e) {
      var email = $(e.target).val();
      if (!email) return;
      var provider = MailSettingsAPI.detectProvider(email); // Update provider field using Semantic UI dropdown (V5.0 pattern)

      $('#MailOAuth2Provider-dropdown').dropdown('set selected', provider);
      $('#MailOAuth2Provider').val(provider); // Show recommendations based on provider

      if (provider === 'google') {
        mailSettings.showProviderHint('Gmail detected. OAuth2 authentication will be required from March 2025.');
      } else if (provider === 'microsoft') {
        mailSettings.showProviderHint('Microsoft/Outlook detected. OAuth2 authentication recommended.');
      } else if (provider === 'yandex') {
        mailSettings.showProviderHint('Yandex Mail detected. Both password and OAuth2 authentication supported.');
      } // Auto-fill SMTP settings based on provider


      mailSettings.autoFillSMTPSettings(provider);
    });
  },

  /**
   * Update MailSMTPUsername placeholder with MailSMTPSenderAddress value
   * @param {string} senderAddress - Email address from MailSMTPSenderAddress field
   */
  updateUsernamePlaceholder: function updateUsernamePlaceholder(senderAddress) {
    var $usernameField = $('#MailSMTPUsername');

    if (senderAddress && senderAddress.trim() !== '') {
      $usernameField.attr('placeholder', senderAddress);
    } else {
      $usernameField.removeAttr('placeholder');
    }
  },

  /**
   * Initialize MailSMTPSenderAddress change handler to update username placeholder
   */
  initializeSenderAddressHandler: function initializeSenderAddressHandler() {
    $('#MailSMTPSenderAddress').on('input change', function (e) {
      var senderAddress = $(e.target).val();
      mailSettings.updateUsernamePlaceholder(senderAddress);
    });
  },

  /**
   * Auto-fill SMTP settings based on provider
   * @param {string} provider - Email provider
   */
  autoFillSMTPSettings: function autoFillSMTPSettings(provider) {
    var settings = {
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
      var providerSettings = settings[provider]; // Only fill if fields are empty

      if (!$('#MailSMTPHost').val()) {
        $('#MailSMTPHost').val(providerSettings.host);
      }

      if (!$('#MailSMTPPort').val()) {
        $('#MailSMTPPort').val(providerSettings.port);
      } // Update encryption dropdown


      var $encryptionDropdown = $('#MailSMTPUseTLS-dropdown');

      if ($encryptionDropdown.length > 0) {
        // Provider settings for encryption
        var encryptionValue = 'none';

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
  updateSMTPSettingsForProvider: function updateSMTPSettingsForProvider(provider) {
    // Don't auto-fill until initial data is loaded
    if (!mailSettings.dataLoaded) {
      return;
    } // Only update if OAuth2 auth type is selected


    var authType = $('input[name="MailSMTPAuthType"]:checked').val();

    if (authType !== 'oauth2') {
      return;
    } // Define provider SMTP settings


    var providerSettings = {
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
    var settings = providerSettings[provider];

    if (!settings) {
      return;
    } // Update host


    $('#MailSMTPHost').val(settings.host); // Update port

    $('#MailSMTPPort').val(settings.port); // Update encryption type

    $('#MailSMTPUseTLS').val(settings.encryption);
    $('#MailSMTPUseTLS-dropdown').dropdown('set selected', settings.encryption); // Update certificate check

    if (settings.certCheck) {
      $('#MailSMTPCertCheck').closest('.checkbox').checkbox('set checked');
    }
  },

  /**
   * Update port based on selected encryption type
   * @param {string} encryptionType - Selected encryption type (none/tls/ssl)
   */
  updatePortBasedOnEncryption: function updatePortBasedOnEncryption(encryptionType) {
    var $portField = $('#MailSMTPPort'); // Only update if the user hasn't manually changed the port

    var currentPort = $portField.val();
    var standardPorts = ['25', '587', '465', ''];

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
    } // Show/hide certificate check based on encryption type


    var $certCheckField = $('#cert-check-field');

    if (encryptionType === 'none') {
      // Hide certificate check for unencrypted connections
      $certCheckField.hide(); // Uncheck the certificate check when hiding

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
  showProviderHint: function showProviderHint(message) {
    var $hint = $('#provider-hint');

    if ($hint.length === 0) {
      $('#MailSMTPUsername').after("<div id=\"provider-hint\" class=\"ui info message\">".concat(message, "</div>"));
    } else {
      $hint.text(message).show();
    }
  },

  /**
   * Handle OAuth2 callback parameters from URL
   */
  handleOAuth2Callback: function handleOAuth2Callback() {
    var urlParams = new URLSearchParams(window.location.search); // Check for success

    if (urlParams.has('oauth_success')) {
      // Reload settings to show updated OAuth2 status
      mailSettings.loadSettingsFromAPI(); // Clean URL

      window.history.replaceState({}, document.title, window.location.pathname);
    } // Check for error


    if (urlParams.has('oauth_error')) {
      var error = urlParams.get('oauth_error');
      UserMessage.showError((globalTranslate.ms_OAuth2AuthorizationFailed || 'Ошибка OAuth2 авторизации: ') + decodeURIComponent(error)); // Clean URL

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  },

  /**
   * Start OAuth2 authorization flow
   */
  startOAuth2Flow: function startOAuth2Flow() {
    var provider = $('#MailOAuth2Provider').val() || $('#MailOAuth2Provider-dropdown').dropdown('get value');

    if (!provider || provider === 'custom') {
      UserMessage.showError(globalTranslate.ms_ValidateOAuth2ProviderEmpty || 'Выберите OAuth2 провайдера');
      return;
    } // Check if Client ID and Secret are configured


    var clientId = $('#MailOAuth2ClientId').val();
    var clientSecret = $('#MailOAuth2ClientSecret').val();

    if (!clientId) {
      UserMessage.showError(globalTranslate.ms_ValidateOAuth2ClientIdEmpty || 'Введите Client ID');
      return;
    }

    if (!clientSecret) {
      UserMessage.showError(globalTranslate.ms_ValidateOAuth2ClientSecretEmpty || 'Введите Client Secret');
      return;
    } // Save OAuth2 credentials before starting the flow


    mailSettings.saveOAuth2Credentials(provider, clientId, clientSecret);
  },

  /**
   * Save OAuth2 credentials and then start authorization flow
   */
  saveOAuth2Credentials: function saveOAuth2Credentials(provider, clientId, clientSecret) {
    var data = {
      MailOAuth2Provider: provider,
      MailOAuth2ClientId: clientId,
      MailOAuth2ClientSecret: clientSecret
    }; // Use MailSettingsAPI for consistent error handling

    MailSettingsAPI.patchSettings(data, function (response) {
      if (response && response.result) {
        // Credentials saved, now get OAuth2 URL
        mailSettings.proceedWithOAuth2Flow(provider);
      } else {
        console.error('[MailSettings] Failed to save OAuth2 credentials:', response);
        var errorMessage = response && response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to save OAuth2 credentials';
        UserMessage.showError(errorMessage);
      }
    });
  },

  /**
   * Request OAuth2 authorization URL and open authorization window
   */
  requestOAuth2AuthUrl: function requestOAuth2AuthUrl(provider, clientId, clientSecret) {
    // Request authorization URL from API
    MailSettingsAPI.authorizeOAuth2(provider, clientId, clientSecret, function (authUrl) {
      if (authUrl) {
        // Open authorization window
        var width = 600;
        var height = 700;
        var left = screen.width / 2 - width / 2;
        var top = screen.height / 2 - height / 2;
        var authWindow = window.open(authUrl, 'oauth2-auth', "width=".concat(width, ",height=").concat(height, ",left=").concat(left, ",top=").concat(top));

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
  proceedWithOAuth2Flow: function proceedWithOAuth2Flow(provider) {
    // Show loading state
    $('#oauth2-connect').addClass('loading'); // Get OAuth2 URL with saved credentials

    MailSettingsAPI.getOAuth2Url(provider, function (response) {
      $('#oauth2-connect').removeClass('loading');

      if (response && response.auth_url) {
        // Open OAuth2 window
        var width = 600;
        var height = 700;
        var left = screen.width / 2 - width / 2;
        var top = screen.height / 2 - height / 2;
        mailSettings.oauth2Window = window.open(response.auth_url, 'OAuth2Authorization', "width=".concat(width, ",height=").concat(height, ",left=").concat(left, ",top=").concat(top)); // Check if window was blocked

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
  handleOAuth2Message: function handleOAuth2Message(event) {
    // Validate origin
    if (event.origin !== window.location.origin) {
      return;
    } // Check for OAuth2 callback data


    if (event.data && event.data.type === 'oauth2-callback') {
      // Close OAuth2 window
      if (mailSettings.oauth2Window) {
        mailSettings.oauth2Window.close();
        mailSettings.oauth2Window = null;
      } // Process callback


      MailSettingsAPI.handleOAuth2Callback(event.data.params, function (response) {
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
  updateOAuth2Status: function updateOAuth2Status(settings) {
    if (settings && settings.oauth2_status) {
      var status = settings.oauth2_status;
      var $statusDiv = $('#oauth2-status');
      var $clientIdField = $('#MailOAuth2ClientId').closest('.field');
      var $clientSecretField = $('#MailOAuth2ClientSecret').closest('.field');

      if (status.configured) {
        var providerName = MailSettingsAPI.getProviderName(status.provider);
        var connectedText = globalTranslate.ms_OAuth2ConnectedTo.replace('{provider}', providerName); // Don't add extra status text - "Connected" already implies authorized

        $statusDiv.html("\n                    <div class=\"ui positive message\">\n                        <i class=\"check circle icon\"></i>\n                        ".concat(connectedText, "\n                    </div>\n                "));
        $('#oauth2-connect').hide();
        $('#oauth2-disconnect').show(); // Hide Client ID and Client Secret fields when authorized

        if (status.authorized) {
          $clientIdField.hide();
          $clientSecretField.hide();
        } else {
          $clientIdField.show();
          $clientSecretField.show();
        }
      } else {
        $statusDiv.html("\n                    <div class=\"ui warning message\">\n                        <i class=\"exclamation triangle icon\"></i>\n                        ".concat(globalTranslate.ms_OAuth2NotConfigured, "\n                    </div>\n                "));
        $('#oauth2-connect').show();
        $('#oauth2-disconnect').hide(); // Show Client ID and Client Secret fields when not authorized

        $clientIdField.show();
        $clientSecretField.show();
      }
    }
  },

  /**
   * Check OAuth2 connection status (makes API call)
   */
  checkOAuth2Status: function checkOAuth2Status() {
    MailSettingsAPI.getSettings(function (settings) {
      mailSettings.updateOAuth2Status(settings);
    });
  },

  /**
   * Disconnect OAuth2
   */
  disconnectOAuth2: function disconnectOAuth2() {
    // Clear OAuth2 tokens immediately without confirmation
    var clearData = {
      MailOAuth2RefreshToken: '',
      MailOAuth2AccessToken: '',
      MailOAuth2TokenExpires: ''
    };
    MailSettingsAPI.patchSettings(clearData, function (response) {
      if (response && response.result) {
        // Just update the status without showing a message
        mailSettings.checkOAuth2Status(); // Show the Client ID and Client Secret fields again

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
  testConnection: function testConnection() {
    var $button = $('#test-connection-button');
    var $resultArea = $('#test-connection-result'); // Clear previous result

    $resultArea.remove();
    $button.addClass('loading');
    MailSettingsAPI.testConnection(function (response) {
      $button.removeClass('loading'); // Create result area next to button

      var $result = $('<div id="test-connection-result" class="ui small message"></div>');
      $button.parent().append($result);

      if (response && response.result) {
        var _response$messages, _response$messages$su, _response$data;

        $result.addClass('positive').html('<i class="check circle icon"></i> ' + (((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : (_response$messages$su = _response$messages.success) === null || _response$messages$su === void 0 ? void 0 : _response$messages$su[0]) || 'Connection successful')); // Show diagnostics info if available

        if ((_response$data = response.data) !== null && _response$data !== void 0 && _response$data.diagnostics) {
          var diag = response.data.diagnostics;
          var details = '<div class="ui divider"></div><small>';
          details += "Auth: ".concat(diag.auth_type, ", Server: ").concat(diag.smtp_host, ":").concat(diag.smtp_port, ", Encryption: ").concat(diag.smtp_encryption);

          if (diag.auth_type === 'oauth2' && diag.oauth2_provider) {
            details += "<br>OAuth2: ".concat(diag.oauth2_provider); // Don't show expired token warning if connection is successful
            // as it means refresh token is working correctly

            if (diag.oauth2_refresh_token_exists) {
              details += " - ".concat(globalTranslate.ms_DiagnosticAuthorized);
            }
          }

          details += '</small>';
          $result.append(details);
        }
      } else {
        var _response$data2, _response$data2$error, _response$data3, _response$data3$error, _response$data4, _response$data5;

        // Show simple, user-friendly error message
        var mainMessage = globalTranslate.ms_DiagnosticConnectionFailed; // Use detailed error analysis if available for better user experience

        if (response !== null && response !== void 0 && (_response$data2 = response.data) !== null && _response$data2 !== void 0 && (_response$data2$error = _response$data2.error_details) !== null && _response$data2$error !== void 0 && _response$data2$error.probable_cause) {
          mainMessage = response.data.error_details.probable_cause;
        }

        $result.addClass('negative').html('<i class="times circle icon"></i> ' + mainMessage); // Skip showing error type label - it's too technical for most users
        // Show raw PHPMailer error in a collapsible section only if it's significantly different

        if (response !== null && response !== void 0 && (_response$data3 = response.data) !== null && _response$data3 !== void 0 && (_response$data3$error = _response$data3.error_details) !== null && _response$data3$error !== void 0 && _response$data3$error.raw_error) {
          var rawError = response.data.error_details.raw_error; // Only show technical details if they contain more info than the user message

          if (rawError.length > mainMessage.length + 50) {
            var detailsHtml = '<div class="ui tiny accordion" style="margin-top: 10px;">';
            detailsHtml += "<div class=\"title\"><i class=\"dropdown icon\"></i>".concat(globalTranslate.ms_DiagnosticTechnicalDetails, "</div>");
            detailsHtml += "<div class=\"content\"><code style=\"font-size: 11px; word-break: break-all; display: block; white-space: pre-wrap;\">".concat(rawError, "</code></div>");
            detailsHtml += '</div>';
            $result.append(detailsHtml); // Initialize accordion for technical details

            $result.find('.accordion').accordion();
          }
        } // Show minimal diagnostics info for failed connections


        if (response !== null && response !== void 0 && (_response$data4 = response.data) !== null && _response$data4 !== void 0 && _response$data4.diagnostics) {
          var _diag = response.data.diagnostics;
          var _details = '<div class="ui divider"></div><small>';
          _details += "".concat(_diag.auth_type.toUpperCase(), ": ").concat(_diag.smtp_host, ":").concat(_diag.smtp_port);

          if (_diag.smtp_encryption && _diag.smtp_encryption !== 'none') {
            _details += " (".concat(_diag.smtp_encryption.toUpperCase(), ")");
          }

          _details += '</small>';
          $result.append(_details);
        } // Show hints if available - limit to top 3 most relevant ones


        if (response !== null && response !== void 0 && (_response$data5 = response.data) !== null && _response$data5 !== void 0 && _response$data5.hints && response.data.hints.length > 0) {
          var hints = '<div class="ui divider"></div><strong>Рекомендации:</strong><ul>'; // Show max 3 hints to avoid overwhelming the user

          var relevantHints = response.data.hints.slice(0, 3);
          relevantHints.forEach(function (hint) {
            // Skip English hints if we have Russian ones
            if (hint.includes('OAuth2 access token expired') && relevantHints.some(function (h) {
              return h.includes('токен');
            })) {
              return;
            }

            hints += "<li>".concat(hint, "</li>");
          });
          hints += '</ul>';
          $result.append(hints);
        }
      } // Auto-hide after 30 seconds


      setTimeout(function () {
        $result.fadeOut(400, function () {
          $(this).remove();
        });
      }, 30000);
    });
  },

  /**
   * Send test email
   */
  sendTestEmail: function sendTestEmail() {
    var recipient = $('#SystemNotificationsEmail').val();

    if (!recipient) {
      // Show error next to button
      var _$button = $('#send-test-email-button');

      var $result = $('<div id="send-test-result" class="ui small negative message"></div>');
      $result.html('<i class="times circle icon"></i> Please enter a recipient email address');
      $('#send-test-result').remove();

      _$button.parent().append($result); // Auto-hide after 10 seconds


      setTimeout(function () {
        $result.fadeOut(400, function () {
          $(this).remove();
        });
      }, 10000);
      return;
    }

    var $button = $('#send-test-email-button');
    var $resultArea = $('#send-test-result'); // Clear previous result

    $resultArea.remove();
    $button.addClass('loading');
    var data = {
      to: recipient // Let the server generate enhanced email content with system info

    };
    MailSettingsAPI.sendTestEmail(data, function (response) {
      $button.removeClass('loading'); // Create result area next to button

      var $result = $('<div id="send-test-result" class="ui small message"></div>');
      $button.parent().append($result);

      if (response && response.result) {
        var _response$data6, _response$messages2, _response$messages2$s, _response$data7;

        // Get the actual recipient from response
        var actualRecipient = ((_response$data6 = response.data) === null || _response$data6 === void 0 ? void 0 : _response$data6.to) || recipient; // Use the message from API which already includes the email address

        var successMessage = ((_response$messages2 = response.messages) === null || _response$messages2 === void 0 ? void 0 : (_response$messages2$s = _response$messages2.success) === null || _response$messages2$s === void 0 ? void 0 : _response$messages2$s[0]) || 'Test email sent'; // If message doesn't include email but we have it, add it

        if (!successMessage.includes('@') && actualRecipient) {
          successMessage = successMessage.replace('Письмо отправлено', "\u041F\u0438\u0441\u044C\u043C\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u2192 ".concat(actualRecipient));
        }

        $result.addClass('positive').html('<i class="check circle icon"></i> ' + successMessage); // Show diagnostics info if available

        if ((_response$data7 = response.data) !== null && _response$data7 !== void 0 && _response$data7.diagnostics) {
          var diag = response.data.diagnostics;
          var details = '<div class="ui divider"></div><small>';

          if (diag.auth_type === 'oauth2') {
            var provider = diag.oauth2_provider || 'OAuth2';
            details += "Using: OAuth2";

            if (provider && provider !== 'OAuth2') {
              details += " (".concat(provider, ")");
            }
          } else {
            details += "Using: Password authentication";
          }

          details += ", Server: ".concat(diag.smtp_host, ":").concat(diag.smtp_port);
          details += '</small>';
          $result.append(details);
        }
      } else {
        var _response$messages3, _response$messages3$e, _response$data8, _response$data9;

        var message = (response === null || response === void 0 ? void 0 : (_response$messages3 = response.messages) === null || _response$messages3 === void 0 ? void 0 : (_response$messages3$e = _response$messages3.error) === null || _response$messages3$e === void 0 ? void 0 : _response$messages3$e.join(', ')) || globalTranslate.ms_DiagnosticConnectionFailed;
        $result.addClass('negative').html('<i class="times circle icon"></i> ' + message); // Show detailed error analysis if available

        if (response !== null && response !== void 0 && (_response$data8 = response.data) !== null && _response$data8 !== void 0 && _response$data8.error_details) {
          var errorDetails = response.data.error_details;
          var detailsHtml = '<div class="ui divider"></div>'; // Skip showing error type label - it's too technical for most users

          if (errorDetails.probable_cause) {
            detailsHtml += "<strong>".concat(globalTranslate.ms_DiagnosticProbableCause, "</strong> ").concat(errorDetails.probable_cause, "<br>");
          } // Show raw PHPMailer error in a collapsible section


          if (errorDetails.raw_error && errorDetails.raw_error !== message) {
            detailsHtml += '<div class="ui tiny accordion" style="margin-top: 10px;">';
            detailsHtml += "<div class=\"title\"><i class=\"dropdown icon\"></i>".concat(globalTranslate.ms_DiagnosticTechnicalDetails, "</div>");
            detailsHtml += "<div class=\"content\"><code style=\"font-size: 11px; word-break: break-all;\">".concat(errorDetails.raw_error, "</code></div>");
            detailsHtml += '</div>';
          }

          $result.append(detailsHtml); // Initialize accordion for technical details

          $result.find('.accordion').accordion();
        } // Show hints if available - limit to top 3 most relevant ones


        if (response !== null && response !== void 0 && (_response$data9 = response.data) !== null && _response$data9 !== void 0 && _response$data9.hints && response.data.hints.length > 0) {
          var hints = '<div class="ui divider"></div><strong>Рекомендации:</strong><ul>'; // Show max 3 hints to avoid overwhelming the user

          var relevantHints = response.data.hints.slice(0, 3);
          relevantHints.forEach(function (hint) {
            // Skip English hints if we have Russian ones
            if (hint.includes('OAuth2 access token expired') && relevantHints.some(function (h) {
              return h.includes('токен');
            })) {
              return;
            }

            hints += "<li>".concat(hint, "</li>");
          });
          hints += '</ul>';
          $result.append(hints);
        }
      } // Auto-hide after 30 seconds


      setTimeout(function () {
        $result.fadeOut(400, function () {
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
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = mailSettings.$formObj.form('get values'); // Get unmasked values for email fields FIRST

    var emailFields = ['MailSMTPSenderAddress', 'SystemNotificationsEmail', 'SystemEmailForMissed', 'VoicemailNotificationsEmail'];
    emailFields.forEach(function (fieldId) {
      var $field = $("#".concat(fieldId));

      if ($field.length > 0) {
        var originalValue = $field.val() || '';
        var fieldValue = originalValue; // For email inputmask, try different approaches to get clean value

        if (fieldValue) {
          // Check if value contains placeholder patterns
          if (fieldValue.includes('_@_') || fieldValue === '@.' || fieldValue === '@' || fieldValue === '_') {
            fieldValue = '';
          } else {
            // Try to get unmasked value for email fields
            try {
              // Check if inputmask plugin is available
              if ($field.inputmask && typeof $field.inputmask === 'function') {
                var unmaskedValue = $field.inputmask('unmaskedvalue');

                if (unmaskedValue && unmaskedValue !== fieldValue && !unmaskedValue.includes('_')) {
                  fieldValue = unmaskedValue;
                }
              }
            } catch (e) {
              console.warn("[MailSettings] Failed to get unmasked value for ".concat(fieldId, ":"), e);
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
  cbAfterSendForm: function cbAfterSendForm(response) {// No success message needed - form saves silently
  },

  /**
   * Initialize the form for saving settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = mailSettings.$formObj; // Enable REST API mode (modern approach like GeneralSettings)

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = MailSettingsAPI;
    Form.apiSettings.saveMethod = 'patchSettings'; // Enable checkbox to boolean conversion for cleaner API requests

    Form.convertCheckboxesToBool = true; // Enable sending only changed fields for optimal PATCH semantics

    Form.sendOnlyChanged = true; // No redirect after save - stay on the same page

    Form.afterSubmitModifyUrl = null; // Use '#' for URL when using apiSettings

    Form.url = '#'; // Use dynamic validation rules based on current state

    Form.validateRules = mailSettings.getValidateRules();
    Form.cbBeforeSendForm = mailSettings.cbBeforeSendForm;
    Form.cbAfterSendForm = mailSettings.cbAfterSendForm;
    Form.initialize();
  },

  /**
   * Subscribe to EventBus OAuth2 events
   */
  subscribeToOAuth2Events: function subscribeToOAuth2Events() {
    if (typeof EventBus !== 'undefined') {
      // Subscribe to OAuth2 authorization events
      EventBus.subscribe('oauth2-authorization', function (data) {
        if (data.status === 'success') {
          // Success: refresh OAuth2 status after a short delay
          setTimeout(function () {
            mailSettings.checkOAuth2Status();
          }, 1000);
        } else if (data.status === 'error') {
          // Error: show error message
          UserMessage.showError(data.message || globalTranslate.ms_OAuth2ProcessingFailed, 4000);
        }
      });
    }
  },

  /**
   * Monitor form changes to control test button states
   */
  monitorFormChanges: function monitorFormChanges() {
    // Initially buttons should be enabled (no changes yet)
    mailSettings.updateTestButtonStates(); // Watch the submit button's class changes via MutationObserver.
    // Form.checkValues() toggles 'disabled' on #submitbutton — observer reacts to that.

    var submitButton = document.getElementById('submitbutton');

    if (submitButton) {
      var observer = new MutationObserver(function () {
        mailSettings.updateTestButtonStates();
      });
      observer.observe(submitButton, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  },

  /**
   * Update test button states based on form changes.
   * Test buttons are active only when save button is disabled (no unsaved changes).
   */
  updateTestButtonStates: function updateTestButtonStates() {
    var $testConnectionBtn = $('#test-connection-button');
    var $sendTestEmailBtn = $('#send-test-email-button');
    var $submitBtn = $('#submitbutton'); // Save button disabled = no unsaved changes = test buttons should be enabled

    var hasUnsavedChanges = !$submitBtn.hasClass('disabled');

    if (hasUnsavedChanges) {
      // Form has unsaved changes - disable test buttons
      $testConnectionBtn.addClass('disabled').attr('data-tooltip', globalTranslate.ms_SaveChangesBeforeTesting).attr('data-position', 'top center').attr('data-inverted', '');
      $sendTestEmailBtn.addClass('disabled').attr('data-tooltip', globalTranslate.ms_SaveChangesBeforeTesting).attr('data-position', 'top center').attr('data-inverted', '');
    } else {
      // No changes - enable test buttons
      $testConnectionBtn.removeClass('disabled').removeAttr('data-tooltip').removeAttr('data-position').removeAttr('data-inverted');
      $sendTestEmailBtn.removeClass('disabled').removeAttr('data-tooltip').removeAttr('data-position').removeAttr('data-inverted');
    } // Re-initialize tooltips for buttons


    $('.ui.button[data-tooltip]').popup();
  }
}; // Initialize when DOM is ready

$(document).ready(function () {
  mailSettings.initialize(); // Ensure click prevention for tooltip icons in checkboxes
  // This prevents checkbox toggle when clicking on tooltip icon

  $('.field-info-icon').off('click.tooltip-prevent').on('click.tooltip-prevent', function (e) {
    e.stopPropagation();
    e.preventDefault();
    return false;
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkIiwiJGNoZWNrQm94ZXMiLCIkbWVudUl0ZW1zIiwib2F1dGgyV2luZG93IiwiZGF0YUxvYWRlZCIsImdldFZhbGlkYXRlUnVsZXMiLCJydWxlcyIsImF1dGhUeXBlIiwidmFsIiwiTWFpbFNNVFBTZW5kZXJBZGRyZXNzIiwiaWRlbnRpZmllciIsIm9wdGlvbmFsIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQiLCJTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwiLCJtc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCIsIlN5c3RlbUVtYWlsRm9yTWlzc2VkIiwidmFsdWUiLCJtc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCIsIlZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCIsIm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkIiwiTWFpbFNNVFBIb3N0IiwibXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQiLCJNYWlsU01UUFBvcnQiLCJtc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCIsIk1haWxPQXV0aDJQcm92aWRlciIsIk1haWxPQXV0aDJDbGllbnRJZCIsIk1haWxPQXV0aDJDbGllbnRTZWNyZXQiLCJNYWlsU01UUFVzZXJuYW1lIiwibXNfVmFsaWRhdGVTTVRQVXNlcm5hbWVFbWFpbCIsIk1haWxTTVRQUGFzc3dvcmQiLCJkZXBlbmRzIiwibXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSIsInVwZGF0ZVZhbGlkYXRpb25SdWxlcyIsIm5ld1J1bGVzIiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmb3JtIiwiZmllbGRzIiwiaW5saW5lIiwib24iLCJpbml0aWFsaXplIiwiaGFuZGxlT0F1dGgyQ2FsbGJhY2siLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJjaGVja2JveCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ1cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24iLCJpbml0aWFsRW5jcnlwdGlvbiIsImNsZWFyYWJsZSIsImZvcmNlU2VsZWN0aW9uIiwidXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVPQXV0aDIiLCJpbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycyIsImluaXRpYWxpemVOb3RpZmljYXRpb25IYW5kbGVycyIsImluaXRpYWxpemVUZXN0QnV0dG9ucyIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwiLCJpbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIiLCJzdWJzY3JpYmVUb09BdXRoMkV2ZW50cyIsIm1vbml0b3JGb3JtQ2hhbmdlcyIsImxvYWREYXRhIiwiTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJidWlsZFRvb2x0aXBDb250ZW50IiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsImJ1aWxkQ29udGVudCIsImVtYWlsRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkSWQiLCIkZmllbGQiLCJsZW5ndGgiLCJpbnB1dG1hc2siLCJzaG93TWFza09uSG92ZXIiLCJwbGFjZWhvbGRlciIsIm9uQmVmb3JlUGFzdGUiLCJwYXN0ZWRWYWx1ZSIsIm9uY2xlYXJlZCIsIiRpbnB1dCIsImFkZENsYXNzIiwiTWFpbFNldHRpbmdzQVBJIiwiZ2V0U2V0dGluZ3MiLCJzZXR0aW5ncyIsIm9mZiIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJkYXRhIiwiYm9vbGVhbkZpZWxkcyIsImtleSIsInVuZGVmaW5lZCIsIk1haWxTTVRQQXV0aFR5cGUiLCJhZnRlclBvcHVsYXRlIiwiTWFpbFNNVFBVc2VUTFMiLCJlbmNyeXB0aW9uVmFsdWUiLCJNYWlsU01UUENlcnRDaGVjayIsImlzQ2hlY2tlZCIsImNsb3Nlc3QiLCJNYWlsRW5hYmxlTm90aWZpY2F0aW9ucyIsIm5vdGlmaWNhdGlvblRvZ2dsZXMiLCJmaWVsZE5hbWUiLCJpbml0aWFsaXplRW1haWxGaWVsZHNWaXNpYmlsaXR5IiwidXBkYXRlVXNlcm5hbWVQbGFjZWhvbGRlciIsInRvZ2dsZUF1dGhGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RhcnRPQXV0aDJGbG93IiwiZGlzY29ubmVjdE9BdXRoMiIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJoYW5kbGVPQXV0aDJNZXNzYWdlIiwidG9nZ2xlTm90aWZpY2F0aW9uVHlwZXNTZWN0aW9uIiwiZGF0YUNoYW5nZWQiLCJ0b2dnbGVFbWFpbEZpZWxkIiwiaXNFbmFibGVkIiwiaXMiLCIkc2VjdGlvbiIsInNsaWRlRG93biIsInNldFRpbWVvdXQiLCJzbGlkZVVwIiwidG9nZ2xlSWQiLCJlbWFpbEZpZWxkSWQiLCIkZW1haWxGaWVsZCIsImlzTm90aWZpY2F0aW9uc0VuYWJsZWQiLCJzaG93IiwiaGlkZSIsInRvZ2dsZUVtYWlsTWFwIiwiT2JqZWN0Iiwia2V5cyIsInRhcmdldCIsImN1cnJlbnRBdXRoVHlwZSIsInRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzIiwiJHVzZXJuYW1lRmllbGQiLCIkcGFzc3dvcmRGaWVsZCIsIiRvYXV0aDJTZWN0aW9uIiwidXBkYXRlT0F1dGgyU3RhdHVzIiwiY2hlY2tPQXV0aDJTdGF0dXMiLCJjdXJyZW50VGFyZ2V0IiwiaGFzQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dXYXJuaW5nIiwibXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nIiwidGVzdENvbm5lY3Rpb24iLCJzZW5kVGVzdEVtYWlsIiwiZW1haWwiLCJwcm92aWRlciIsImRldGVjdFByb3ZpZGVyIiwic2hvd1Byb3ZpZGVySGludCIsImF1dG9GaWxsU01UUFNldHRpbmdzIiwic2VuZGVyQWRkcmVzcyIsInRyaW0iLCJhdHRyIiwicmVtb3ZlQXR0ciIsImdvb2dsZSIsImhvc3QiLCJwb3J0IiwidGxzIiwibWljcm9zb2Z0IiwieWFuZGV4IiwicHJvdmlkZXJTZXR0aW5ncyIsIiRlbmNyeXB0aW9uRHJvcGRvd24iLCJlbmNyeXB0aW9uIiwiY2VydENoZWNrIiwiZW5jcnlwdGlvblR5cGUiLCIkcG9ydEZpZWxkIiwiY3VycmVudFBvcnQiLCJzdGFuZGFyZFBvcnRzIiwiaW5jbHVkZXMiLCIkY2VydENoZWNrRmllbGQiLCJtZXNzYWdlIiwiJGhpbnQiLCJhZnRlciIsInRleHQiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJsb2NhdGlvbiIsInNlYXJjaCIsImhhcyIsImxvYWRTZXR0aW5nc0Zyb21BUEkiLCJyZXBsYWNlU3RhdGUiLCJkb2N1bWVudCIsInRpdGxlIiwicGF0aG5hbWUiLCJlcnJvciIsImdldCIsInNob3dFcnJvciIsIm1zX09BdXRoMkF1dGhvcml6YXRpb25GYWlsZWQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJtc19WYWxpZGF0ZU9BdXRoMlByb3ZpZGVyRW1wdHkiLCJjbGllbnRJZCIsImNsaWVudFNlY3JldCIsIm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50SWRFbXB0eSIsIm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50U2VjcmV0RW1wdHkiLCJzYXZlT0F1dGgyQ3JlZGVudGlhbHMiLCJwYXRjaFNldHRpbmdzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwcm9jZWVkV2l0aE9BdXRoMkZsb3ciLCJjb25zb2xlIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJqb2luIiwicmVxdWVzdE9BdXRoMkF1dGhVcmwiLCJhdXRob3JpemVPQXV0aDIiLCJhdXRoVXJsIiwid2lkdGgiLCJoZWlnaHQiLCJsZWZ0Iiwic2NyZWVuIiwidG9wIiwiYXV0aFdpbmRvdyIsIm9wZW4iLCJnZXRPQXV0aDJVcmwiLCJhdXRoX3VybCIsImV2ZW50Iiwib3JpZ2luIiwiY2xvc2UiLCJwYXJhbXMiLCJzaG93SW5mb3JtYXRpb24iLCJvYXV0aDJfc3RhdHVzIiwic3RhdHVzIiwiJHN0YXR1c0RpdiIsIiRjbGllbnRJZEZpZWxkIiwiJGNsaWVudFNlY3JldEZpZWxkIiwiY29uZmlndXJlZCIsInByb3ZpZGVyTmFtZSIsImdldFByb3ZpZGVyTmFtZSIsImNvbm5lY3RlZFRleHQiLCJtc19PQXV0aDJDb25uZWN0ZWRUbyIsInJlcGxhY2UiLCJodG1sIiwiYXV0aG9yaXplZCIsIm1zX09BdXRoMk5vdENvbmZpZ3VyZWQiLCJjbGVhckRhdGEiLCJNYWlsT0F1dGgyUmVmcmVzaFRva2VuIiwiTWFpbE9BdXRoMkFjY2Vzc1Rva2VuIiwiTWFpbE9BdXRoMlRva2VuRXhwaXJlcyIsIiRidXR0b24iLCIkcmVzdWx0QXJlYSIsInJlbW92ZSIsIiRyZXN1bHQiLCJwYXJlbnQiLCJhcHBlbmQiLCJzdWNjZXNzIiwiZGlhZ25vc3RpY3MiLCJkaWFnIiwiZGV0YWlscyIsImF1dGhfdHlwZSIsInNtdHBfaG9zdCIsInNtdHBfcG9ydCIsInNtdHBfZW5jcnlwdGlvbiIsIm9hdXRoMl9wcm92aWRlciIsIm9hdXRoMl9yZWZyZXNoX3Rva2VuX2V4aXN0cyIsIm1zX0RpYWdub3N0aWNBdXRob3JpemVkIiwibWFpbk1lc3NhZ2UiLCJtc19EaWFnbm9zdGljQ29ubmVjdGlvbkZhaWxlZCIsImVycm9yX2RldGFpbHMiLCJwcm9iYWJsZV9jYXVzZSIsInJhd19lcnJvciIsInJhd0Vycm9yIiwiZGV0YWlsc0h0bWwiLCJtc19EaWFnbm9zdGljVGVjaG5pY2FsRGV0YWlscyIsImZpbmQiLCJhY2NvcmRpb24iLCJ0b1VwcGVyQ2FzZSIsImhpbnRzIiwicmVsZXZhbnRIaW50cyIsInNsaWNlIiwiaGludCIsInNvbWUiLCJoIiwiZmFkZU91dCIsInJlY2lwaWVudCIsInRvIiwiYWN0dWFsUmVjaXBpZW50Iiwic3VjY2Vzc01lc3NhZ2UiLCJlcnJvckRldGFpbHMiLCJtc19EaWFnbm9zdGljUHJvYmFibGVDYXVzZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJvcmlnaW5hbFZhbHVlIiwiZmllbGRWYWx1ZSIsInVubWFza2VkVmFsdWUiLCJ3YXJuIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwic2VuZE9ubHlDaGFuZ2VkIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ1cmwiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsIm1zX09BdXRoMlByb2Nlc3NpbmdGYWlsZWQiLCJ1cGRhdGVUZXN0QnV0dG9uU3RhdGVzIiwic3VibWl0QnV0dG9uIiwiZ2V0RWxlbWVudEJ5SWQiLCJvYnNlcnZlciIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImF0dHJpYnV0ZUZpbHRlciIsIiR0ZXN0Q29ubmVjdGlvbkJ0biIsIiRzZW5kVGVzdEVtYWlsQnRuIiwiJHN1Ym1pdEJ0biIsImhhc1Vuc2F2ZWRDaGFuZ2VzIiwicG9wdXAiLCJyZWFkeSIsInN0b3BQcm9wYWdhdGlvbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FMTTs7QUFPakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFRCxDQUFDLENBQUMsK0JBQUQsQ0FYRzs7QUFhakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsVUFBVSxFQUFFRixDQUFDLENB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QUlLQSxJQUpMLENBSVUsZUFKVixFQUkyQixFQUozQjtBQUtILEtBYkQsTUFhTztBQUNIO0FBQ0F3SixNQUFBQSxrQkFBa0IsQ0FDYjNNLFdBREwsQ0FDaUIsVUFEakIsRUFFS29ELFVBRkwsQ0FFZ0IsY0FGaEIsRUFHS0EsVUFITCxDQUdnQixlQUhoQixFQUlLQSxVQUpMLENBSWdCLGVBSmhCO0FBTUF3SixNQUFBQSxpQkFBaUIsQ0FDWjVNLFdBREwsQ0FDaUIsVUFEakIsRUFFS29ELFVBRkwsQ0FFZ0IsY0FGaEIsRUFHS0EsVUFITCxDQUdnQixlQUhoQixFQUlLQSxVQUpMLENBSWdCLGVBSmhCO0FBS0gsS0FsQ29CLENBb0NyQjs7O0FBQ0FqSyxJQUFBQSxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUE4QjRULEtBQTlCO0FBQ0g7QUE1aURnQixDQUFyQixDLENBZ2pEQTs7QUFDQTVULENBQUMsQ0FBQzZMLFFBQUQsQ0FBRCxDQUFZZ0ksS0FBWixDQUFrQixZQUFNO0FBQ3BCL1QsRUFBQUEsWUFBWSxDQUFDNkMsVUFBYixHQURvQixDQUdwQjtBQUNBOztBQUNBM0MsRUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0J5RixHQUF0QixDQUEwQix1QkFBMUIsRUFBbUQvQyxFQUFuRCxDQUFzRCx1QkFBdEQsRUFBK0UsVUFBU3VFLENBQVQsRUFBWTtBQUN2RkEsSUFBQUEsQ0FBQyxDQUFDNk0sZUFBRjtBQUNBN00sSUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsV0FBTyxLQUFQO0FBQ0gsR0FKRDtBQUtILENBVkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBVc2VyTWVzc2FnZSwgTWFpbFNldHRpbmdzQVBJLCBDb25maWcsIFRvb2x0aXBCdWlsZGVyLCBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbWFpbCBzZXR0aW5ncyB3aXRoIE9BdXRoMiBzdXBwb3J0XG4gKlxuICogQG1vZHVsZSBtYWlsU2V0dGluZ3NcbiAqL1xuY29uc3QgbWFpbFNldHRpbmdzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNtYWlsLXNldHRpbmdzLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVja2JveGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQm94ZXM6ICQoJyNtYWlsLXNldHRpbmdzLWZvcm0gLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbWVudSBpdGVtcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtZW51SXRlbXM6ICQoJyNtYWlsLXNldHRpbmdzLW1lbnUgLml0ZW0nKSxcblxuICAgIC8qKlxuICAgICAqIE9BdXRoMiB3aW5kb3cgcmVmZXJlbmNlXG4gICAgICogQHR5cGUge1dpbmRvd3xudWxsfVxuICAgICAqL1xuICAgIG9hdXRoMldpbmRvdzogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgaW5pdGlhbCBkYXRhIGhhcyBiZWVuIGxvYWRlZCBmcm9tIEFQSVxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGRhdGFMb2FkZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBmb3JtIHN0YXRlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJ1bGVzID0ge307XG4gICAgICAgIGNvbnN0IGF1dGhUeXBlID0gJCgnaW5wdXRbbmFtZT1cIk1haWxTTVRQQXV0aFR5cGVcIl06Y2hlY2tlZCcpLnZhbCgpO1xuXG4gICAgICAgIC8vIEJhc2UgZW1haWwgdmFsaWRhdGlvbiBydWxlcyAtIGFsd2F5cyBhcHBseSB3aGVuIGZpZWxkcyBoYXZlIHZhbHVlc1xuICAgICAgICBydWxlcy5NYWlsU01UUFNlbmRlckFkZHJlc3MgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbFNNVFBTZW5kZXJBZGRyZXNzJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5TeXN0ZW1FbWFpbEZvck1pc3NlZCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeKD8hLipfQF9cXFxcLl8pLiokJywgIC8vIFJlamVjdCBfQF8uXyBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlTWlzc2VkRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ14oPyEuKl9AX1xcXFwuXykuKiQnLCAgLy8gUmVqZWN0IF9AXy5fIHBhdHRlcm5cbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVWb2ljZW1haWxFbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNNVFAgY29uZmlndXJhdGlvbiBydWxlcyAtIGFsd2F5cyBhdmFpbGFibGUgYnV0IG9wdGlvbmFsXG4gICAgICAgIHJ1bGVzLk1haWxTTVRQSG9zdCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUEhvc3QnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuTWFpbFNNVFBQb3J0ID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQUG9ydCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBdXRoZW50aWNhdGlvbi1zcGVjaWZpYyBydWxlc1xuICAgICAgICBpZiAoYXV0aFR5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICAvLyBPQXV0aDIgZmllbGRzIC0gb3B0aW9uYWxcbiAgICAgICAgICAgIHJ1bGVzLk1haWxPQXV0aDJQcm92aWRlciA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbE9BdXRoMlByb3ZpZGVyJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBydWxlcy5NYWlsT0F1dGgyQ2xpZW50SWQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxPQXV0aDJDbGllbnRJZCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcnVsZXMuTWFpbE9BdXRoMkNsaWVudFNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbE9BdXRoMkNsaWVudFNlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gVXNlcm5hbWUgZm9yIE9BdXRoMiBzaG91bGQgYmUgZW1haWwgd2hlbiBmaWxsZWRcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQVXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNNVFBVc2VybmFtZUVtYWlsLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUGFzc3dvcmQgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFVzZXJuYW1lIC0gb3B0aW9uYWxcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQVXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIC0gcmVxdWlyZWQgaWYgdXNlcm5hbWUgaXMgcHJvdmlkZWRcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQUGFzc3dvcmQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQUGFzc3dvcmQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRlcGVuZHM6ICdNYWlsU01UUFVzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgYW5kIHJlaW5pdGlhbGl6ZSBmb3JtXG4gICAgICovXG4gICAgdXBkYXRlVmFsaWRhdGlvblJ1bGVzKCkge1xuICAgICAgICAvLyBHZXQgZnJlc2ggdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBjdXJyZW50IHN0YXRlXG4gICAgICAgIGNvbnN0IG5ld1J1bGVzID0gbWFpbFNldHRpbmdzLmdldFZhbGlkYXRlUnVsZXMoKTtcblxuICAgICAgICAvLyBVcGRhdGUgRm9ybS52YWxpZGF0ZVJ1bGVzXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ld1J1bGVzO1xuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gd2l0aCBuZXcgcnVsZXNcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2Rlc3Ryb3knKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oe1xuICAgICAgICAgICAgZmllbGRzOiBuZXdSdWxlcyxcbiAgICAgICAgICAgIGlubGluZTogdHJ1ZSxcbiAgICAgICAgICAgIG9uOiAnYmx1cidcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1haWwgc2V0dGluZ3MgcGFnZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDaGVjayBmb3IgT0F1dGgyIGNhbGxiYWNrIHBhcmFtZXRlcnMgaW4gVVJMXG4gICAgICAgIG1haWxTZXR0aW5ncy5oYW5kbGVPQXV0aDJDYWxsYmFjaygpO1xuXG4gICAgICAgIG1haWxTZXR0aW5ncy4kbWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG4gICAgICAgIG1haWxTZXR0aW5ncy4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggc3BlY2lmaWMgY29uZmlndXJhdGlvbnNcbiAgICAgICAgLy8gRG9uJ3QgaW5pdGlhbGl6ZSBhbGwgZHJvcGRvd25zIGdlbmVyaWNhbGx5IHRvIGF2b2lkIGRvdWJsZSBpbml0aWFsaXphdGlvblxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZW5jcnlwdGlvbiB0eXBlIGRyb3Bkb3duIHdpdGggcG9ydCBhdXRvLXVwZGF0ZVxuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24odmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpbml0aWFsIGVuY3J5cHRpb24gdHlwZSB0byBzaG93L2hpZGUgY2VydGlmaWNhdGUgY2hlY2tcbiAgICAgICAgY29uc3QgaW5pdGlhbEVuY3J5cHRpb24gPSAkKCcjTWFpbFNNVFBVc2VUTFMnKS52YWwoKSB8fCAnbm9uZSc7XG4gICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24oaW5pdGlhbEVuY3J5cHRpb24pO1xuXG4gICAgICAgIC8vIFNwZWNpYWwgaW5pdGlhbGl6YXRpb24gZm9yIE9BdXRoMiBwcm92aWRlciBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgY2xlYXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVNNVFBTZXR0aW5nc0ZvclByb3ZpZGVyKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTm8gb3RoZXIgZHJvcGRvd25zIGluIHRoZSBmb3JtIG5lZWQgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gTWFpbFNNVFBVc2VUTFMgYW5kIE1haWxPQXV0aDJQcm92aWRlciBhcmUgdGhlIG9ubHkgZHJvcGRvd25zXG5cbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplT0F1dGgyKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycygpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZU5vdGlmaWNhdGlvbkhhbmRsZXJzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplVGVzdEJ1dHRvbnMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVJbnB1dE1hc2tzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmRldGVjdFByb3ZpZGVyRnJvbUVtYWlsKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIoKTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgT0F1dGgyIGV2ZW50c1xuICAgICAgICBtYWlsU2V0dGluZ3Muc3Vic2NyaWJlVG9PQXV0aDJFdmVudHMoKTtcblxuICAgICAgICAvLyBNb25pdG9yIGZvcm0gY2hhbmdlcyB0byBjb250cm9sIHRlc3QgYnV0dG9uc1xuICAgICAgICBtYWlsU2V0dGluZ3MubW9uaXRvckZvcm1DaGFuZ2VzKCk7XG5cbiAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gQVBJIGFmdGVyIGFsbCBVSSBlbGVtZW50cyBhcmUgaW5pdGlhbGl6ZWRcbiAgICAgICAgbWFpbFNldHRpbmdzLmxvYWREYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBVc2UgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBpZiAodHlwZW9mIE1haWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZVRvb2x0aXBzKG1haWxTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogRGVsZWdhdGVzIHRvIFRvb2x0aXBCdWlsZGVyIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgZm9ybWF0dGluZ1xuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW5wdXQgbWFza3MgZm9yIGVtYWlsIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dE1hc2tzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGVtYWlsIGlucHV0IG1hc2tzIGZvciBhbGwgZW1haWwgZmllbGRzXG4gICAgICAgIGNvbnN0IGVtYWlsRmllbGRzID0gW1xuICAgICAgICAgICAgJ01haWxTTVRQU2VuZGVyQWRkcmVzcycsXG4gICAgICAgICAgICAnU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ1xuICAgICAgICBdO1xuXG4gICAgICAgIGVtYWlsRmllbGRzLmZvckVhY2goZmllbGRJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGZpZWxkLmlucHV0bWFzaygnZW1haWwnLCB7XG4gICAgICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJywgLy8gTm8gcGxhY2Vob2xkZXIgY2hhcmFjdGVyXG4gICAgICAgICAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGZ1bmN0aW9uKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGVhbiBwbGFjZWhvbGRlciB2YWx1ZXMgb24gcGFzdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXN0ZWRWYWx1ZSA9PT0gJ19AXy5fJyB8fCBwYXN0ZWRWYWx1ZSA9PT0gJ0AnIHx8IHBhc3RlZFZhbHVlID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25jbGVhcmVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBmaWVsZCB2YWx1ZSB3aGVuIG1hc2sgaXMgY2xlYXJlZFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkaW5wdXQudmFsKCkgPT09ICdfQF8uXycgfHwgJGlucHV0LnZhbCgpID09PSAnQCcgfHwgJGlucHV0LnZhbCgpID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRpbnB1dC52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBDbGVhbiBpbml0aWFsIHBsYWNlaG9sZGVyIHZhbHVlc1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQudmFsKCkgPT09ICdfQF8uXycgfHwgJGZpZWxkLnZhbCgpID09PSAnQCcgfHwgJGZpZWxkLnZhbCgpID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAkZmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1haWwgc2V0dGluZ3MgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWREYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLmdldFNldHRpbmdzKChzZXR0aW5ncykgPT4ge1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBvdXIgY2hhbmdlIGhhbmRsZXIgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXScpLm9mZignY2hhbmdlLm1haWxzZXR0aW5ncycpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggbGlrZSBHZW5lcmFsU2V0dGluZ3NcbiAgICAgICAgICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHNldHRpbmdzLCB7XG4gICAgICAgICAgICAgICAgICAgIGJlZm9yZVBvcHVsYXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUkVTVCBBUEkgcmV0dXJucyBib29sZWFucyBmb3IgY2hlY2tib3ggZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IGJvb2xlYW4gdmFsdWVzIHRvIHN0cmluZ3MgZm9yIFNlbWFudGljIFVJIGNoZWNrYm94ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvb2xlYW5GaWVsZHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ01haWxTTVRQQ2VydENoZWNrJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kTWlzc2VkQ2FsbE5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NlbmRMb2dpbk5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kU3lzdGVtTm90aWZpY2F0aW9ucycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ01haWxQbGFpblRleHQnXG4gICAgICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYm9vbGVhbkZpZWxkcy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgYm9vbGVhbiB0byBzdHJpbmcgXCIxXCIgb3IgXCIwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtrZXldID0gKGRhdGFba2V5XSA9PT0gdHJ1ZSB8fCBkYXRhW2tleV0gPT09IDEgfHwgZGF0YVtrZXldID09PSAnMScpID8gJzEnIDogJzAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgcmFkaW8gYnV0dG9uIHZhbHVlIGlzIHNldCAod2lsbCBiZSBoYW5kbGVkIHNpbGVudGx5IGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEuTWFpbFNNVFBBdXRoVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuTWFpbFNNVFBBdXRoVHlwZSA9ICdwYXNzd29yZCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFuIHVwIHBsYWNlaG9sZGVyIGVtYWlsIHZhbHVlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW1haWxGaWVsZHMgPSBbJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJywgJ1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW1haWxGaWVsZHMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2tleV0gPT09ICdfQF8uXycgfHwgZGF0YVtrZXldID09PSAnQCcgfHwgZGF0YVtrZXldID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIE9BdXRoMiBwcm92aWRlciBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuTWFpbE9BdXRoMlByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlci1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLk1haWxPQXV0aDJQcm92aWRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlcicpLnZhbChkYXRhLk1haWxPQXV0aDJQcm92aWRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGVuY3J5cHRpb24gdHlwZSBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuTWFpbFNNVFBVc2VUTFMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgb2xkIGJvb2xlYW4gdmFsdWVzIHRvIG5ldyBmb3JtYXQgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuY3J5cHRpb25WYWx1ZSA9IGRhdGEuTWFpbFNNVFBVc2VUTFM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuY3J5cHRpb25WYWx1ZSA9PT0gdHJ1ZSB8fCBlbmNyeXB0aW9uVmFsdWUgPT09IDEgfHwgZW5jcnlwdGlvblZhbHVlID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ3Rscyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbmNyeXB0aW9uVmFsdWUgPT09IGZhbHNlIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gMCB8fCBlbmNyeXB0aW9uVmFsdWUgPT09ICcwJyB8fCBlbmNyeXB0aW9uVmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuY3J5cHRpb25WYWx1ZSA9ICdub25lJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBkcm9wZG93biB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUFVzZVRMUy1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBlbmNyeXB0aW9uVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUFVzZVRMUycpLnZhbChlbmNyeXB0aW9uVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBjaGVja2JveGVzIHVzaW5nIFNlbWFudGljIFVJXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5NYWlsU01UUENlcnRDaGVjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gZGF0YS5NYWlsU01UUENlcnRDaGVjayA9PT0gdHJ1ZSB8fCBkYXRhLk1haWxTTVRQQ2VydENoZWNrID09PSAxIHx8IGRhdGEuTWFpbFNNVFBDZXJ0Q2hlY2sgPT09ICcxJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5NYWlsRW5hYmxlTm90aWZpY2F0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gZGF0YS5NYWlsRW5hYmxlTm90aWZpY2F0aW9ucyA9PT0gdHJ1ZSB8fCBkYXRhLk1haWxFbmFibGVOb3RpZmljYXRpb25zID09PSAxIHx8IGRhdGEuTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgPT09ICcxJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsRW5hYmxlTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsRW5hYmxlTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgbm90aWZpY2F0aW9uIHR5cGUgdG9nZ2xlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm90aWZpY2F0aW9uVG9nZ2xlcyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU2VuZE1pc3NlZENhbGxOb3RpZmljYXRpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU2VuZFZvaWNlbWFpbE5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kTG9naW5Ob3RpZmljYXRpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU2VuZFN5c3RlbU5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdNYWlsUGxhaW5UZXh0J1xuICAgICAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdGlmaWNhdGlvblRvZ2dsZXMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2ZpZWxkTmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBkYXRhW2ZpZWxkTmFtZV0gPT09IHRydWUgfHwgZGF0YVtmaWVsZE5hbWVdID09PSAxIHx8IGRhdGFbZmllbGROYW1lXSA9PT0gJzEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtmaWVsZE5hbWV9YCkuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtmaWVsZE5hbWV9YCkuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtYWlsIGZpZWxkcyB2aXNpYmlsaXR5IGJhc2VkIG9uIHRvZ2dsZSBzdGF0ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE11c3QgYmUgY2FsbGVkIGFmdGVyIGNoZWNrYm94ZXMgYXJlIHNldFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVFbWFpbEZpZWxkc1Zpc2liaWxpdHkoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIE1haWxTTVRQVXNlcm5hbWUgcGxhY2Vob2xkZXIgd2l0aCBNYWlsU01UUFNlbmRlckFkZHJlc3MgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVVc2VybmFtZVBsYWNlaG9sZGVyKGRhdGEuTWFpbFNNVFBTZW5kZXJBZGRyZXNzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgT0F1dGgyIHN0YXR1cyBpZiBPQXV0aDIgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJhZGlvIGJ1dHRvbiBpcyBhbHJlYWR5IHNldCBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdXRoVHlwZSA9IGRhdGEuTWFpbFNNVFBBdXRoVHlwZSB8fCAncGFzc3dvcmQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHMoYXV0aFR5cGUsIGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBsb2FkZWQgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVWYWxpZGF0aW9uUnVsZXMoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyB0aGF0IGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuZGF0YUxvYWRlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmUtZW5hYmxlIG91ciBjaGFuZ2UgaGFuZGxlciBmb3IgZnV0dXJlIHVzZXIgaW50ZXJhY3Rpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MucmVBdHRhY2hBdXRoVHlwZUhhbmRsZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBPQXV0aDIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVPQXV0aDIoKSB7XG4gICAgICAgIC8vIE9BdXRoMiBjb25uZWN0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3Muc3RhcnRPQXV0aDJGbG93KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE9BdXRoMiBkaXNjb25uZWN0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNvYXV0aDItZGlzY29ubmVjdCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuZGlzY29ubmVjdE9BdXRoMigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMaXN0ZW4gZm9yIE9BdXRoMiBjYWxsYmFjayBtZXNzYWdlc1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG1haWxTZXR0aW5ncy5oYW5kbGVPQXV0aDJNZXNzYWdlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBub3RpZmljYXRpb24gZW5hYmxlL2Rpc2FibGUgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTm90aWZpY2F0aW9uSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBtYXN0ZXIgbm90aWZpY2F0aW9ucyBlbmFibGUvZGlzYWJsZSBjaGVja2JveFxuICAgICAgICAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVOb3RpZmljYXRpb25UeXBlc1NlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVmFsaWRhdGlvblJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgaW5kaXZpZHVhbCBub3RpZmljYXRpb24gdHlwZSB0b2dnbGVzXG4gICAgICAgIC8vIEVhY2ggdG9nZ2xlIHNob3dzL2hpZGVzIGl0cyBjb3JyZXNwb25kaW5nIGVtYWlsIGZpZWxkXG4gICAgICAgICQoJyNTZW5kTWlzc2VkQ2FsbE5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVFbWFpbEZpZWxkKCdTZW5kTWlzc2VkQ2FsbE5vdGlmaWNhdGlvbnMnLCAnU3lzdGVtRW1haWxGb3JNaXNzZWQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyNTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUVtYWlsRmllbGQoJ1NlbmRWb2ljZW1haWxOb3RpZmljYXRpb25zJywgJ1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2VuZExvZ2luTm90aWZpY2F0aW9ucyBhbmQgU2VuZFN5c3RlbU5vdGlmaWNhdGlvbnMgZG9uJ3QgY29udHJvbCBlbWFpbCBmaWVsZCB2aXNpYmlsaXR5XG4gICAgICAgICQoJyNTZW5kTG9naW5Ob3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyNTZW5kU3lzdGVtTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIG5vdGlmaWNhdGlvbiB0eXBlcyBzZWN0aW9uIHZpc2liaWxpdHkgYmFzZWQgb24gTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgc3RhdGVcbiAgICAgKi9cbiAgICB0b2dnbGVOb3RpZmljYXRpb25UeXBlc1NlY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGlzRW5hYmxlZCA9ICQoJyNNYWlsRW5hYmxlTm90aWZpY2F0aW9ucycpLmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICBjb25zdCAkc2VjdGlvbiA9ICQoJyNub3RpZmljYXRpb24tdHlwZXMtc2VjdGlvbicpO1xuXG4gICAgICAgIGlmIChpc0VuYWJsZWQpIHtcbiAgICAgICAgICAgICRzZWN0aW9uLnNsaWRlRG93bigzMDApO1xuICAgICAgICAgICAgLy8gQWxzbyB1cGRhdGUgaW5kaXZpZHVhbCBlbWFpbCBmaWVsZHMgdmlzaWJpbGl0eSBhZnRlciBzZWN0aW9uIGlzIHNob3duXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZUVtYWlsRmllbGRzVmlzaWJpbGl0eSgpO1xuICAgICAgICAgICAgfSwgMzUwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzZWN0aW9uLnNsaWRlVXAoMzAwKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgZW1haWwgZmllbGQgdmlzaWJpbGl0eSBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b2dnbGVJZCAtIElEIG9mIHRoZSB0b2dnbGUgY2hlY2tib3hcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZW1haWxGaWVsZElkIC0gSUQgb2YgdGhlIGVtYWlsIGZpZWxkIHRvIHNob3cvaGlkZVxuICAgICAqL1xuICAgIHRvZ2dsZUVtYWlsRmllbGQodG9nZ2xlSWQsIGVtYWlsRmllbGRJZCkge1xuICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkKGAjJHt0b2dnbGVJZH1gKS5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgY29uc3QgJGVtYWlsRmllbGQgPSAkKGAjJHtlbWFpbEZpZWxkSWR9YCkuY2xvc2VzdCgnLmZpZWxkJyk7XG5cbiAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgJGVtYWlsRmllbGQuc2xpZGVEb3duKDIwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZW1haWxGaWVsZC5zbGlkZVVwKDIwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBlbWFpbCBmaWVsZHMgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IHRvZ2dsZSBzdGF0ZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRW1haWxGaWVsZHNWaXNpYmlsaXR5KCkge1xuICAgICAgICAvLyBGaXJzdCwgY2hlY2sgbWFzdGVyIHRvZ2dsZSBhbmQgc2hvdy9oaWRlIHRoZSBlbnRpcmUgbm90aWZpY2F0aW9uIHR5cGVzIHNlY3Rpb25cbiAgICAgICAgY29uc3QgaXNOb3RpZmljYXRpb25zRW5hYmxlZCA9ICQoJyNNYWlsRW5hYmxlTm90aWZpY2F0aW9ucycpLmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICBjb25zdCAkc2VjdGlvbiA9ICQoJyNub3RpZmljYXRpb24tdHlwZXMtc2VjdGlvbicpO1xuXG4gICAgICAgIGlmIChpc05vdGlmaWNhdGlvbnNFbmFibGVkKSB7XG4gICAgICAgICAgICAkc2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICByZXR1cm47IC8vIE5vIG5lZWQgdG8gY2hlY2sgaW5kaXZpZHVhbCBmaWVsZHMgaWYgc2VjdGlvbiBpcyBoaWRkZW5cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hcCBvZiB0b2dnbGUgSURzIHRvIHRoZWlyIGNvcnJlc3BvbmRpbmcgZW1haWwgZmllbGQgSURzXG4gICAgICAgIC8vIE5vdGU6IFN5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCBpcyBhbHdheXMgdmlzaWJsZSBhbmQgbm90IGNvbnRyb2xsZWQgYnkgYSB0b2dnbGVcbiAgICAgICAgY29uc3QgdG9nZ2xlRW1haWxNYXAgPSB7XG4gICAgICAgICAgICAnU2VuZE1pc3NlZENhbGxOb3RpZmljYXRpb25zJzogJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJyxcbiAgICAgICAgICAgICdTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucyc6ICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2V0IGluaXRpYWwgdmlzaWJpbGl0eSBmb3IgZWFjaCBlbWFpbCBmaWVsZFxuICAgICAgICBPYmplY3Qua2V5cyh0b2dnbGVFbWFpbE1hcCkuZm9yRWFjaCh0b2dnbGVJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCBlbWFpbEZpZWxkSWQgPSB0b2dnbGVFbWFpbE1hcFt0b2dnbGVJZF07XG4gICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkKGAjJHt0b2dnbGVJZH1gKS5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgIGNvbnN0ICRlbWFpbEZpZWxkID0gJChgIyR7ZW1haWxGaWVsZElkfWApLmNsb3Nlc3QoJy5maWVsZCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgJGVtYWlsRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZW1haWxGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2ggYXV0aCB0eXBlIGNoYW5nZSBoYW5kbGVyXG4gICAgICovXG4gICAgcmVBdHRhY2hBdXRoVHlwZUhhbmRsZXIoKSB7XG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdJykub24oJ2NoYW5nZS5tYWlsc2V0dGluZ3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYXV0aFR5cGUgPSAkKGUudGFyZ2V0KS52YWwoKTtcbiAgICAgICAgICAgIC8vIFdoZW4gdXNlciBtYW51YWxseSBjaGFuZ2VzIGF1dGggdHlwZSwgY2hlY2sgT0F1dGgyIHN0YXR1cyBpZiBuZWVkZWRcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVBdXRoRmllbGRzKGF1dGhUeXBlKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIHdoZW4gYXV0aCB0eXBlIGNoYW5nZXNcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVWYWxpZGF0aW9uUnVsZXMoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYXV0aGVudGljYXRpb24gdHlwZSBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVBdXRoVHlwZUhhbmRsZXJzKCkge1xuICAgICAgICAvLyBBdHRhY2ggaW5pdGlhbCBoYW5kbGVyXG4gICAgICAgIG1haWxTZXR0aW5ncy5yZUF0dGFjaEF1dGhUeXBlSGFuZGxlcigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb24gcGFnZSBsb2FkIC0gZG9uJ3QgY2hlY2sgT0F1dGgyIHN0YXR1cyB5ZXQgKHdpbGwgYmUgZG9uZSBpbiBsb2FkRGF0YSlcbiAgICAgICAgY29uc3QgY3VycmVudEF1dGhUeXBlID0gJCgnaW5wdXRbbmFtZT1cIk1haWxTTVRQQXV0aFR5cGVcIl06Y2hlY2tlZCcpLnZhbCgpIHx8ICdwYXNzd29yZCc7XG4gICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVBdXRoRmllbGRzV2l0aG91dFN0YXR1cyhjdXJyZW50QXV0aFR5cGUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYXV0aGVudGljYXRpb24gZmllbGRzIHdpdGhvdXQgY2hlY2tpbmcgT0F1dGgyIHN0YXR1cyAoZm9yIGluaXRpYWwgc2V0dXApXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGF1dGhUeXBlIC0gQXV0aGVudGljYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzKGF1dGhUeXBlKSB7XG4gICAgICAgIGNvbnN0ICR1c2VybmFtZUZpZWxkID0gJCgnI01haWxTTVRQVXNlcm5hbWUnKS5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgY29uc3QgJHBhc3N3b3JkRmllbGQgPSAkKCcjTWFpbFNNVFBQYXNzd29yZCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICBjb25zdCAkb2F1dGgyU2VjdGlvbiA9ICQoJyNvYXV0aDItYXV0aC1zZWN0aW9uJyk7XG5cbiAgICAgICAgaWYgKGF1dGhUeXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgLy8gRm9yIE9BdXRoMjogc2hvdyB1c2VybmFtZSAocmVxdWlyZWQgZm9yIGVtYWlsIGlkZW50aWZpY2F0aW9uKSwgaGlkZSBwYXNzd29yZFxuICAgICAgICAgICAgJHVzZXJuYW1lRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJHBhc3N3b3JkRmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgJG9hdXRoMlNlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBwYXNzd29yZCBmaWVsZCBlcnJvcnNcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ01haWxTTVRQUGFzc3dvcmQnKTtcbiAgICAgICAgICAgICRwYXNzd29yZEZpZWxkLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIHBhc3N3b3JkIGF1dGg6IHNob3cgYm90aCB1c2VybmFtZSBhbmQgcGFzc3dvcmRcbiAgICAgICAgICAgICR1c2VybmFtZUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICRwYXNzd29yZEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICRvYXV0aDJTZWN0aW9uLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgT0F1dGgyIGZpZWxkIGVycm9yc1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnTWFpbE9BdXRoMlByb3ZpZGVyJyk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdNYWlsT0F1dGgyQ2xpZW50SWQnKTtcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ01haWxPQXV0aDJDbGllbnRTZWNyZXQnKTtcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50SWQnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50U2VjcmV0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGF1dGhlbnRpY2F0aW9uIGZpZWxkcyBiYXNlZCBvbiB0eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGF1dGhUeXBlIC0gQXV0aGVudGljYXRpb24gdHlwZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbc2V0dGluZ3NdIC0gT3B0aW9uYWwgc2V0dGluZ3MgZGF0YSB0byBhdm9pZCBhZGRpdGlvbmFsIEFQSSBjYWxsXG4gICAgICovXG4gICAgdG9nZ2xlQXV0aEZpZWxkcyhhdXRoVHlwZSwgc2V0dGluZ3MgPSBudWxsKSB7XG4gICAgICAgIC8vIEZpcnN0IHRvZ2dsZSBmaWVsZHMgd2l0aG91dCBzdGF0dXMgY2hlY2tcbiAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzKGF1dGhUeXBlKTtcblxuICAgICAgICAvLyBUaGVuIGNoZWNrIE9BdXRoMiBzdGF0dXMgb25seSBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGF1dGhUeXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGV4aXN0aW5nIHNldHRpbmdzIGRhdGEgdG8gYXZvaWQgZHVwbGljYXRlIEFQSSBjYWxsXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZU9BdXRoMlN0YXR1cyhzZXR0aW5ncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIEFQSSBjYWxsIGlmIG5vIHNldHRpbmdzIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0ZXN0IGJ1dHRvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGVzdEJ1dHRvbnMoKSB7XG4gICAgICAgIC8vIFRlc3QgY29ubmVjdGlvbiBidXR0b25cbiAgICAgICAgJCgnI3Rlc3QtY29ubmVjdGlvbi1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gaXMgZGlzYWJsZWQgKGhhcyB1bnNhdmVkIGNoYW5nZXMpXG4gICAgICAgICAgICBpZiAoJChlLmN1cnJlbnRUYXJnZXQpLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoZ2xvYmFsVHJhbnNsYXRlLm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudGVzdENvbm5lY3Rpb24oKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2VuZCB0ZXN0IGVtYWlsIGJ1dHRvblxuICAgICAgICAkKCcjc2VuZC10ZXN0LWVtYWlsLWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBpcyBkaXNhYmxlZCAoaGFzIHVuc2F2ZWQgY2hhbmdlcylcbiAgICAgICAgICAgIGlmICgkKGUuY3VycmVudFRhcmdldCkuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zZW5kVGVzdEVtYWlsKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgcHJvdmlkZXIgZnJvbSBlbWFpbCBhZGRyZXNzXG4gICAgICovXG4gICAgZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwoKSB7XG4gICAgICAgICQoJyNNYWlsU01UUFVzZXJuYW1lJykub24oJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBlbWFpbCA9ICQoZS50YXJnZXQpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFlbWFpbCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9IE1haWxTZXR0aW5nc0FQSS5kZXRlY3RQcm92aWRlcihlbWFpbCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwcm92aWRlciBmaWVsZCB1c2luZyBTZW1hbnRpYyBVSSBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlci1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBwcm92aWRlcik7XG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykudmFsKHByb3ZpZGVyKTtcblxuICAgICAgICAgICAgLy8gU2hvdyByZWNvbW1lbmRhdGlvbnMgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgICAgICAgIGlmIChwcm92aWRlciA9PT0gJ2dvb2dsZScpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Muc2hvd1Byb3ZpZGVySGludCgnR21haWwgZGV0ZWN0ZWQuIE9BdXRoMiBhdXRoZW50aWNhdGlvbiB3aWxsIGJlIHJlcXVpcmVkIGZyb20gTWFyY2ggMjAyNS4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgPT09ICdtaWNyb3NvZnQnKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnNob3dQcm92aWRlckhpbnQoJ01pY3Jvc29mdC9PdXRsb29rIGRldGVjdGVkLiBPQXV0aDIgYXV0aGVudGljYXRpb24gcmVjb21tZW5kZWQuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyID09PSAneWFuZGV4Jykge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zaG93UHJvdmlkZXJIaW50KCdZYW5kZXggTWFpbCBkZXRlY3RlZC4gQm90aCBwYXNzd29yZCBhbmQgT0F1dGgyIGF1dGhlbnRpY2F0aW9uIHN1cHBvcnRlZC4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXV0by1maWxsIFNNVFAgc2V0dGluZ3MgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5hdXRvRmlsbFNNVFBTZXR0aW5ncyhwcm92aWRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgTWFpbFNNVFBVc2VybmFtZSBwbGFjZWhvbGRlciB3aXRoIE1haWxTTVRQU2VuZGVyQWRkcmVzcyB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZW5kZXJBZGRyZXNzIC0gRW1haWwgYWRkcmVzcyBmcm9tIE1haWxTTVRQU2VuZGVyQWRkcmVzcyBmaWVsZFxuICAgICAqL1xuICAgIHVwZGF0ZVVzZXJuYW1lUGxhY2Vob2xkZXIoc2VuZGVyQWRkcmVzcykge1xuICAgICAgICBjb25zdCAkdXNlcm5hbWVGaWVsZCA9ICQoJyNNYWlsU01UUFVzZXJuYW1lJyk7XG4gICAgICAgIGlmIChzZW5kZXJBZGRyZXNzICYmIHNlbmRlckFkZHJlc3MudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgJHVzZXJuYW1lRmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBzZW5kZXJBZGRyZXNzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICR1c2VybmFtZUZpZWxkLnJlbW92ZUF0dHIoJ3BsYWNlaG9sZGVyJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBNYWlsU01UUFNlbmRlckFkZHJlc3MgY2hhbmdlIGhhbmRsZXIgdG8gdXBkYXRlIHVzZXJuYW1lIHBsYWNlaG9sZGVyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNlbmRlckFkZHJlc3NIYW5kbGVyKCkge1xuICAgICAgICAkKCcjTWFpbFNNVFBTZW5kZXJBZGRyZXNzJykub24oJ2lucHV0IGNoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZW5kZXJBZGRyZXNzID0gJChlLnRhcmdldCkudmFsKCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVXNlcm5hbWVQbGFjZWhvbGRlcihzZW5kZXJBZGRyZXNzKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF1dG8tZmlsbCBTTVRQIHNldHRpbmdzIGJhc2VkIG9uIHByb3ZpZGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyIC0gRW1haWwgcHJvdmlkZXJcbiAgICAgKi9cbiAgICBhdXRvRmlsbFNNVFBTZXR0aW5ncyhwcm92aWRlcikge1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGdvb2dsZToge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLmdtYWlsLmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgdGxzOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWljcm9zb2Z0OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAub2ZmaWNlMzY1LmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgdGxzOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeWFuZGV4OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAueWFuZGV4LmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzQ2NScsXG4gICAgICAgICAgICAgICAgdGxzOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChzZXR0aW5nc1twcm92aWRlcl0pIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyU2V0dGluZ3MgPSBzZXR0aW5nc1twcm92aWRlcl07XG5cbiAgICAgICAgICAgIC8vIE9ubHkgZmlsbCBpZiBmaWVsZHMgYXJlIGVtcHR5XG4gICAgICAgICAgICBpZiAoISQoJyNNYWlsU01UUEhvc3QnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUEhvc3QnKS52YWwocHJvdmlkZXJTZXR0aW5ncy5ob3N0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghJCgnI01haWxTTVRQUG9ydCcpLnZhbCgpKSB7XG4gICAgICAgICAgICAgICAgJCgnI01haWxTTVRQUG9ydCcpLnZhbChwcm92aWRlclNldHRpbmdzLnBvcnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZW5jcnlwdGlvbiBkcm9wZG93blxuICAgICAgICAgICAgY29uc3QgJGVuY3J5cHRpb25Ecm9wZG93biA9ICQoJyNNYWlsU01UUFVzZVRMUy1kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRlbmNyeXB0aW9uRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIFByb3ZpZGVyIHNldHRpbmdzIGZvciBlbmNyeXB0aW9uXG4gICAgICAgICAgICAgICAgbGV0IGVuY3J5cHRpb25WYWx1ZSA9ICdub25lJztcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXJTZXR0aW5ncy5wb3J0ID09PSAnNTg3Jykge1xuICAgICAgICAgICAgICAgICAgICBlbmNyeXB0aW9uVmFsdWUgPSAndGxzJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyU2V0dGluZ3MucG9ydCA9PT0gJzQ2NScpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ3NzbCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRlbmNyeXB0aW9uRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGVuY3J5cHRpb25WYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIFNNVFAgc2V0dGluZ3Mgd2hlbiBPQXV0aDIgcHJvdmlkZXIgaXMgc2VsZWN0ZWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXIgLSBTZWxlY3RlZCBPQXV0aDIgcHJvdmlkZXIgKGdvb2dsZSwgbWljcm9zb2Z0LCB5YW5kZXgpXG4gICAgICovXG4gICAgdXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIocHJvdmlkZXIpIHtcbiAgICAgICAgLy8gRG9uJ3QgYXV0by1maWxsIHVudGlsIGluaXRpYWwgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgaWYgKCFtYWlsU2V0dGluZ3MuZGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgT0F1dGgyIGF1dGggdHlwZSBpcyBzZWxlY3RlZFxuICAgICAgICBjb25zdCBhdXRoVHlwZSA9ICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdOmNoZWNrZWQnKS52YWwoKTtcbiAgICAgICAgaWYgKGF1dGhUeXBlICE9PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmaW5lIHByb3ZpZGVyIFNNVFAgc2V0dGluZ3NcbiAgICAgICAgY29uc3QgcHJvdmlkZXJTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGdvb2dsZToge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLmdtYWlsLmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgZW5jcnlwdGlvbjogJ3RscycsXG4gICAgICAgICAgICAgICAgY2VydENoZWNrOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWljcm9zb2Z0OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAtbWFpbC5vdXRsb29rLmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgZW5jcnlwdGlvbjogJ3RscycsXG4gICAgICAgICAgICAgICAgY2VydENoZWNrOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeWFuZGV4OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAueWFuZGV4LnJ1JyxcbiAgICAgICAgICAgICAgICBwb3J0OiAnNTg3JyxcbiAgICAgICAgICAgICAgICBlbmNyeXB0aW9uOiAndGxzJyxcbiAgICAgICAgICAgICAgICBjZXJ0Q2hlY2s6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHByb3ZpZGVyU2V0dGluZ3NbcHJvdmlkZXJdO1xuICAgICAgICBpZiAoIXNldHRpbmdzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgaG9zdFxuICAgICAgICAkKCcjTWFpbFNNVFBIb3N0JykudmFsKHNldHRpbmdzLmhvc3QpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBwb3J0XG4gICAgICAgICQoJyNNYWlsU01UUFBvcnQnKS52YWwoc2V0dGluZ3MucG9ydCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGVuY3J5cHRpb24gdHlwZVxuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMnKS52YWwoc2V0dGluZ3MuZW5jcnlwdGlvbik7XG4gICAgICAgICQoJyNNYWlsU01UUFVzZVRMUy1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZXR0aW5ncy5lbmNyeXB0aW9uKTtcblxuICAgICAgICAvLyBVcGRhdGUgY2VydGlmaWNhdGUgY2hlY2tcbiAgICAgICAgaWYgKHNldHRpbmdzLmNlcnRDaGVjaykge1xuICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBvcnQgYmFzZWQgb24gc2VsZWN0ZWQgZW5jcnlwdGlvbiB0eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGVuY3J5cHRpb25UeXBlIC0gU2VsZWN0ZWQgZW5jcnlwdGlvbiB0eXBlIChub25lL3Rscy9zc2wpXG4gICAgICovXG4gICAgdXBkYXRlUG9ydEJhc2VkT25FbmNyeXB0aW9uKGVuY3J5cHRpb25UeXBlKSB7XG4gICAgICAgIGNvbnN0ICRwb3J0RmllbGQgPSAkKCcjTWFpbFNNVFBQb3J0Jyk7XG5cbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgdGhlIHVzZXIgaGFzbid0IG1hbnVhbGx5IGNoYW5nZWQgdGhlIHBvcnRcbiAgICAgICAgY29uc3QgY3VycmVudFBvcnQgPSAkcG9ydEZpZWxkLnZhbCgpO1xuICAgICAgICBjb25zdCBzdGFuZGFyZFBvcnRzID0gWycyNScsICc1ODcnLCAnNDY1JywgJyddO1xuXG4gICAgICAgIGlmIChzdGFuZGFyZFBvcnRzLmluY2x1ZGVzKGN1cnJlbnRQb3J0KSkge1xuICAgICAgICAgICAgc3dpdGNoIChlbmNyeXB0aW9uVHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgICAgICAkcG9ydEZpZWxkLnZhbCgnMjUnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGxzJzpcbiAgICAgICAgICAgICAgICAgICAgJHBvcnRGaWVsZC52YWwoJzU4NycpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdzc2wnOlxuICAgICAgICAgICAgICAgICAgICAkcG9ydEZpZWxkLnZhbCgnNDY1Jyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIGNlcnRpZmljYXRlIGNoZWNrIGJhc2VkIG9uIGVuY3J5cHRpb24gdHlwZVxuICAgICAgICBjb25zdCAkY2VydENoZWNrRmllbGQgPSAkKCcjY2VydC1jaGVjay1maWVsZCcpO1xuICAgICAgICBpZiAoZW5jcnlwdGlvblR5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgLy8gSGlkZSBjZXJ0aWZpY2F0ZSBjaGVjayBmb3IgdW5lbmNyeXB0ZWQgY29ubmVjdGlvbnNcbiAgICAgICAgICAgICRjZXJ0Q2hlY2tGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAvLyBVbmNoZWNrIHRoZSBjZXJ0aWZpY2F0ZSBjaGVjayB3aGVuIGhpZGluZ1xuICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgY2VydGlmaWNhdGUgY2hlY2sgZm9yIFRMUy9TU0wgY29ubmVjdGlvbnNcbiAgICAgICAgICAgICRjZXJ0Q2hlY2tGaWVsZC5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBwcm92aWRlciBoaW50IG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIEhpbnQgbWVzc2FnZVxuICAgICAqL1xuICAgIHNob3dQcm92aWRlckhpbnQobWVzc2FnZSkge1xuICAgICAgICBjb25zdCAkaGludCA9ICQoJyNwcm92aWRlci1oaW50Jyk7XG4gICAgICAgIGlmICgkaGludC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICQoJyNNYWlsU01UUFVzZXJuYW1lJykuYWZ0ZXIoYDxkaXYgaWQ9XCJwcm92aWRlci1oaW50XCIgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2VcIj4ke21lc3NhZ2V9PC9kaXY+YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkaGludC50ZXh0KG1lc3NhZ2UpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgT0F1dGgyIGNhbGxiYWNrIHBhcmFtZXRlcnMgZnJvbSBVUkxcbiAgICAgKi9cbiAgICBoYW5kbGVPQXV0aDJDYWxsYmFjaygpIHtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblxuICAgICAgICAvLyBDaGVjayBmb3Igc3VjY2Vzc1xuICAgICAgICBpZiAodXJsUGFyYW1zLmhhcygnb2F1dGhfc3VjY2VzcycpKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgc2V0dGluZ3MgdG8gc2hvdyB1cGRhdGVkIE9BdXRoMiBzdGF0dXNcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5sb2FkU2V0dGluZ3NGcm9tQVBJKCk7XG4gICAgICAgICAgICAvLyBDbGVhbiBVUkxcbiAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgZG9jdW1lbnQudGl0bGUsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBmb3IgZXJyb3JcbiAgICAgICAgaWYgKHVybFBhcmFtcy5oYXMoJ29hdXRoX2Vycm9yJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yID0gdXJsUGFyYW1zLmdldCgnb2F1dGhfZXJyb3InKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihcbiAgICAgICAgICAgICAgICAoZ2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMkF1dGhvcml6YXRpb25GYWlsZWQgfHwgJ9Ce0YjQuNCx0LrQsCBPQXV0aDIg0LDQstGC0L7RgNC40LfQsNGG0LjQuDogJykgKyBkZWNvZGVVUklDb21wb25lbnQoZXJyb3IpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgLy8gQ2xlYW4gVVJMXG4gICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIGRvY3VtZW50LnRpdGxlLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0IE9BdXRoMiBhdXRob3JpemF0aW9uIGZsb3dcbiAgICAgKi9cbiAgICBzdGFydE9BdXRoMkZsb3coKSB7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyID0gJCgnI01haWxPQXV0aDJQcm92aWRlcicpLnZhbCgpIHx8ICQoJyNNYWlsT0F1dGgyUHJvdmlkZXItZHJvcGRvd24nKS5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG5cbiAgICAgICAgaWYgKCFwcm92aWRlciB8fCBwcm92aWRlciA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVPQXV0aDJQcm92aWRlckVtcHR5IHx8ICfQktGL0LHQtdGA0LjRgtC1IE9BdXRoMiDQv9GA0L7QstCw0LnQtNC10YDQsCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgQ2xpZW50IElEIGFuZCBTZWNyZXQgYXJlIGNvbmZpZ3VyZWRcbiAgICAgICAgY29uc3QgY2xpZW50SWQgPSAkKCcjTWFpbE9BdXRoMkNsaWVudElkJykudmFsKCk7XG4gICAgICAgIGNvbnN0IGNsaWVudFNlY3JldCA9ICQoJyNNYWlsT0F1dGgyQ2xpZW50U2VjcmV0JykudmFsKCk7XG5cbiAgICAgICAgaWYgKCFjbGllbnRJZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU9BdXRoMkNsaWVudElkRW1wdHkgfHwgJ9CS0LLQtdC00LjRgtC1IENsaWVudCBJRCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjbGllbnRTZWNyZXQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVPQXV0aDJDbGllbnRTZWNyZXRFbXB0eSB8fCAn0JLQstC10LTQuNGC0LUgQ2xpZW50IFNlY3JldCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2F2ZSBPQXV0aDIgY3JlZGVudGlhbHMgYmVmb3JlIHN0YXJ0aW5nIHRoZSBmbG93XG4gICAgICAgIG1haWxTZXR0aW5ncy5zYXZlT0F1dGgyQ3JlZGVudGlhbHMocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQpO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzIGFuZCB0aGVuIHN0YXJ0IGF1dGhvcml6YXRpb24gZmxvd1xuICAgICAqL1xuICAgIHNhdmVPQXV0aDJDcmVkZW50aWFscyhwcm92aWRlciwgY2xpZW50SWQsIGNsaWVudFNlY3JldCkge1xuICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgTWFpbE9BdXRoMlByb3ZpZGVyOiBwcm92aWRlcixcbiAgICAgICAgICAgIE1haWxPQXV0aDJDbGllbnRJZDogY2xpZW50SWQsXG4gICAgICAgICAgICBNYWlsT0F1dGgyQ2xpZW50U2VjcmV0OiBjbGllbnRTZWNyZXRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBVc2UgTWFpbFNldHRpbmdzQVBJIGZvciBjb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5wYXRjaFNldHRpbmdzKGRhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWRlbnRpYWxzIHNhdmVkLCBub3cgZ2V0IE9BdXRoMiBVUkxcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MucHJvY2VlZFdpdGhPQXV0aDJGbG93KHByb3ZpZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW01haWxTZXR0aW5nc10gRmFpbGVkIHRvIHNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvclxuICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJylcbiAgICAgICAgICAgICAgICAgICAgOiAnRmFpbGVkIHRvIHNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgT0F1dGgyIGF1dGhvcml6YXRpb24gVVJMIGFuZCBvcGVuIGF1dGhvcml6YXRpb24gd2luZG93XG4gICAgICovXG4gICAgcmVxdWVzdE9BdXRoMkF1dGhVcmwocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQpIHtcbiAgICAgICAgLy8gUmVxdWVzdCBhdXRob3JpemF0aW9uIFVSTCBmcm9tIEFQSVxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuYXV0aG9yaXplT0F1dGgyKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0LCAoYXV0aFVybCkgPT4ge1xuXG4gICAgICAgICAgICBpZiAoYXV0aFVybCkge1xuICAgICAgICAgICAgICAgIC8vIE9wZW4gYXV0aG9yaXphdGlvbiB3aW5kb3dcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IDYwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWlnaHQgPSA3MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IChzY3JlZW4ud2lkdGggLyAyKSAtICh3aWR0aCAvIDIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvcCA9IChzY3JlZW4uaGVpZ2h0IC8gMikgLSAoaGVpZ2h0IC8gMik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhdXRoV2luZG93ID0gd2luZG93Lm9wZW4oXG4gICAgICAgICAgICAgICAgICAgIGF1dGhVcmwsXG4gICAgICAgICAgICAgICAgICAgICdvYXV0aDItYXV0aCcsXG4gICAgICAgICAgICAgICAgICAgIGB3aWR0aD0ke3dpZHRofSxoZWlnaHQ9JHtoZWlnaHR9LGxlZnQ9JHtsZWZ0fSx0b3A9JHt0b3B9YFxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWF1dGhXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdQbGVhc2UgYWxsb3cgcG9wdXBzIGZvciBPQXV0aDIgYXV0aG9yaXphdGlvbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJBdXRob3JpemF0aW9uRmFpbGVkIHx8ICfQntGI0LjQsdC60LAg0LDQstGC0L7RgNC40LfQsNGG0LjQuCBPQXV0aDInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByb2NlZWQgd2l0aCBPQXV0aDIgZmxvdyBhZnRlciBjcmVkZW50aWFscyBhcmUgc2F2ZWRcbiAgICAgKi9cbiAgICBwcm9jZWVkV2l0aE9BdXRoMkZsb3cocHJvdmlkZXIpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gR2V0IE9BdXRoMiBVUkwgd2l0aCBzYXZlZCBjcmVkZW50aWFsc1xuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuZ2V0T0F1dGgyVXJsKHByb3ZpZGVyLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5hdXRoX3VybCkge1xuXG4gICAgICAgICAgICAgICAgLy8gT3BlbiBPQXV0aDIgd2luZG93XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSA2MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gNzAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSAoc2NyZWVuLndpZHRoIC8gMikgLSAod2lkdGggLyAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSAoc2NyZWVuLmhlaWdodCAvIDIpIC0gKGhlaWdodCAvIDIpO1xuXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdyA9IHdpbmRvdy5vcGVuKFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5hdXRoX3VybCxcbiAgICAgICAgICAgICAgICAgICAgJ09BdXRoMkF1dGhvcml6YXRpb24nLFxuICAgICAgICAgICAgICAgICAgICBgd2lkdGg9JHt3aWR0aH0saGVpZ2h0PSR7aGVpZ2h0fSxsZWZ0PSR7bGVmdH0sdG9wPSR7dG9wfWBcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2luZG93IHdhcyBibG9ja2VkXG4gICAgICAgICAgICAgICAgaWYgKCFtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignUGxlYXNlIGFsbG93IHBvcHVwcyBmb3IgT0F1dGgyIGF1dGhvcml6YXRpb24nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNYWlsU2V0dGluZ3NdIE5vIGF1dGhfdXJsIGluIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ0ZhaWxlZCB0byBnZXQgT0F1dGgyIGF1dGhvcml6YXRpb24gVVJMJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgT0F1dGgyIGNhbGxiYWNrIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0ge01lc3NhZ2VFdmVudH0gZXZlbnQgLSBNZXNzYWdlIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlT0F1dGgyTWVzc2FnZShldmVudCkge1xuICAgICAgICAvLyBWYWxpZGF0ZSBvcmlnaW5cbiAgICAgICAgaWYgKGV2ZW50Lm9yaWdpbiAhPT0gd2luZG93LmxvY2F0aW9uLm9yaWdpbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIE9BdXRoMiBjYWxsYmFjayBkYXRhXG4gICAgICAgIGlmIChldmVudC5kYXRhICYmIGV2ZW50LmRhdGEudHlwZSA9PT0gJ29hdXRoMi1jYWxsYmFjaycpIHtcbiAgICAgICAgICAgIC8vIENsb3NlIE9BdXRoMiB3aW5kb3dcbiAgICAgICAgICAgIGlmIChtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93KSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQcm9jZXNzIGNhbGxiYWNrXG4gICAgICAgICAgICBNYWlsU2V0dGluZ3NBUEkuaGFuZGxlT0F1dGgyQ2FsbGJhY2soZXZlbnQuZGF0YS5wYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKCdPQXV0aDIgYXV0aG9yaXphdGlvbiBzdWNjZXNzZnVsJyk7XG4gICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5jaGVja09BdXRoMlN0YXR1cygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignT0F1dGgyIGF1dGhvcml6YXRpb24gZmFpbGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE9BdXRoMiBzdGF0dXMgZGlzcGxheSB1c2luZyBwcm92aWRlZCBzZXR0aW5ncyBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YSBjb250YWluaW5nIG9hdXRoMl9zdGF0dXNcbiAgICAgKi9cbiAgICB1cGRhdGVPQXV0aDJTdGF0dXMoc2V0dGluZ3MpIHtcbiAgICAgICAgaWYgKHNldHRpbmdzICYmIHNldHRpbmdzLm9hdXRoMl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IHNldHRpbmdzLm9hdXRoMl9zdGF0dXM7XG4gICAgICAgICAgICBjb25zdCAkc3RhdHVzRGl2ID0gJCgnI29hdXRoMi1zdGF0dXMnKTtcbiAgICAgICAgICAgIGNvbnN0ICRjbGllbnRJZEZpZWxkID0gJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgJGNsaWVudFNlY3JldEZpZWxkID0gJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS5jbG9zZXN0KCcuZmllbGQnKTtcblxuICAgICAgICAgICAgaWYgKHN0YXR1cy5jb25maWd1cmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJOYW1lID0gTWFpbFNldHRpbmdzQVBJLmdldFByb3ZpZGVyTmFtZShzdGF0dXMucHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RlZFRleHQgPSBnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyQ29ubmVjdGVkVG8ucmVwbGFjZSgne3Byb3ZpZGVyfScsIHByb3ZpZGVyTmFtZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBEb24ndCBhZGQgZXh0cmEgc3RhdHVzIHRleHQgLSBcIkNvbm5lY3RlZFwiIGFscmVhZHkgaW1wbGllcyBhdXRob3JpemVkXG4gICAgICAgICAgICAgICAgJHN0YXR1c0Rpdi5odG1sKGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2hlY2sgY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2Nvbm5lY3RlZFRleHR9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWRpc2Nvbm5lY3QnKS5zaG93KCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIENsaWVudCBJRCBhbmQgQ2xpZW50IFNlY3JldCBmaWVsZHMgd2hlbiBhdXRob3JpemVkXG4gICAgICAgICAgICAgICAgaWYgKHN0YXR1cy5hdXRob3JpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRJZEZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNsaWVudFNlY3JldEZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkY2xpZW50SWRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRTZWNyZXRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdHVzRGl2Lmh0bWwoYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJOb3RDb25maWd1cmVkfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJCgnI29hdXRoMi1kaXNjb25uZWN0JykuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBDbGllbnQgSUQgYW5kIENsaWVudCBTZWNyZXQgZmllbGRzIHdoZW4gbm90IGF1dGhvcml6ZWRcbiAgICAgICAgICAgICAgICAkY2xpZW50SWRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsaWVudFNlY3JldEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBPQXV0aDIgY29ubmVjdGlvbiBzdGF0dXMgKG1ha2VzIEFQSSBjYWxsKVxuICAgICAqL1xuICAgIGNoZWNrT0F1dGgyU3RhdHVzKCkge1xuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlT0F1dGgyU3RhdHVzKHNldHRpbmdzKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc2Nvbm5lY3QgT0F1dGgyXG4gICAgICovXG4gICAgZGlzY29ubmVjdE9BdXRoMigpIHtcbiAgICAgICAgLy8gQ2xlYXIgT0F1dGgyIHRva2VucyBpbW1lZGlhdGVseSB3aXRob3V0IGNvbmZpcm1hdGlvblxuICAgICAgICBjb25zdCBjbGVhckRhdGEgPSB7XG4gICAgICAgICAgICBNYWlsT0F1dGgyUmVmcmVzaFRva2VuOiAnJyxcbiAgICAgICAgICAgIE1haWxPQXV0aDJBY2Nlc3NUb2tlbjogJycsXG4gICAgICAgICAgICBNYWlsT0F1dGgyVG9rZW5FeHBpcmVzOiAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5wYXRjaFNldHRpbmdzKGNsZWFyRGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gSnVzdCB1cGRhdGUgdGhlIHN0YXR1cyB3aXRob3V0IHNob3dpbmcgYSBtZXNzYWdlXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgQ2xpZW50IElEIGFuZCBDbGllbnQgU2VjcmV0IGZpZWxkcyBhZ2FpblxuICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50SWQnKS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignRmFpbGVkIHRvIGRpc2Nvbm5lY3QgT0F1dGgyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUZXN0IFNNVFAgY29ubmVjdGlvblxuICAgICAqL1xuICAgIHRlc3RDb25uZWN0aW9uKCkge1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3Rlc3QtY29ubmVjdGlvbi1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHJlc3VsdEFyZWEgPSAkKCcjdGVzdC1jb25uZWN0aW9uLXJlc3VsdCcpO1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHJlc3VsdFxuICAgICAgICAkcmVzdWx0QXJlYS5yZW1vdmUoKTtcblxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLnRlc3RDb25uZWN0aW9uKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgcmVzdWx0IGFyZWEgbmV4dCB0byBidXR0b25cbiAgICAgICAgICAgIGxldCAkcmVzdWx0ID0gJCgnPGRpdiBpZD1cInRlc3QtY29ubmVjdGlvbi1yZXN1bHRcIiBjbGFzcz1cInVpIHNtYWxsIG1lc3NhZ2VcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRidXR0b24ucGFyZW50KCkuYXBwZW5kKCRyZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygncG9zaXRpdmUnKS5odG1sKCc8aSBjbGFzcz1cImNoZWNrIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgKHJlc3BvbnNlLm1lc3NhZ2VzPy5zdWNjZXNzPy5bMF0gfHwgJ0Nvbm5lY3Rpb24gc3VjY2Vzc2Z1bCcpKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZGlhZ25vc3RpY3MgaW5mbyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YT8uZGlhZ25vc3RpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlhZyA9IHJlc3BvbnNlLmRhdGEuZGlhZ25vc3RpY3M7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHNtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYEF1dGg6ICR7ZGlhZy5hdXRoX3R5cGV9LCBTZXJ2ZXI6ICR7ZGlhZy5zbXRwX2hvc3R9OiR7ZGlhZy5zbXRwX3BvcnR9LCBFbmNyeXB0aW9uOiAke2RpYWcuc210cF9lbmNyeXB0aW9ufWA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWFnLmF1dGhfdHlwZSA9PT0gJ29hdXRoMicgJiYgZGlhZy5vYXV0aDJfcHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYDxicj5PQXV0aDI6ICR7ZGlhZy5vYXV0aDJfcHJvdmlkZXJ9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvbid0IHNob3cgZXhwaXJlZCB0b2tlbiB3YXJuaW5nIGlmIGNvbm5lY3Rpb24gaXMgc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgaXQgbWVhbnMgcmVmcmVzaCB0b2tlbiBpcyB3b3JraW5nIGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcub2F1dGgyX3JlZnJlc2hfdG9rZW5fZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgIC0gJHtnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY0F1dGhvcml6ZWR9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9ICc8L3NtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGRldGFpbHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBzaW1wbGUsIHVzZXItZnJpZW5kbHkgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGxldCBtYWluTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5tc19EaWFnbm9zdGljQ29ubmVjdGlvbkZhaWxlZDtcblxuICAgICAgICAgICAgICAgIC8vIFVzZSBkZXRhaWxlZCBlcnJvciBhbmFseXNpcyBpZiBhdmFpbGFibGUgZm9yIGJldHRlciB1c2VyIGV4cGVyaWVuY2VcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmVycm9yX2RldGFpbHM/LnByb2JhYmxlX2NhdXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW5NZXNzYWdlID0gcmVzcG9uc2UuZGF0YS5lcnJvcl9kZXRhaWxzLnByb2JhYmxlX2NhdXNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRyZXN1bHQuYWRkQ2xhc3MoJ25lZ2F0aXZlJykuaHRtbCgnPGkgY2xhc3M9XCJ0aW1lcyBjaXJjbGUgaWNvblwiPjwvaT4gJyArIG1haW5NZXNzYWdlKTtcblxuICAgICAgICAgICAgICAgIC8vIFNraXAgc2hvd2luZyBlcnJvciB0eXBlIGxhYmVsIC0gaXQncyB0b28gdGVjaG5pY2FsIGZvciBtb3N0IHVzZXJzXG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IHJhdyBQSFBNYWlsZXIgZXJyb3IgaW4gYSBjb2xsYXBzaWJsZSBzZWN0aW9uIG9ubHkgaWYgaXQncyBzaWduaWZpY2FudGx5IGRpZmZlcmVudFxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uZXJyb3JfZGV0YWlscz8ucmF3X2Vycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJhd0Vycm9yID0gcmVzcG9uc2UuZGF0YS5lcnJvcl9kZXRhaWxzLnJhd19lcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBzaG93IHRlY2huaWNhbCBkZXRhaWxzIGlmIHRoZXkgY29udGFpbiBtb3JlIGluZm8gdGhhbiB0aGUgdXNlciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGlmIChyYXdFcnJvci5sZW5ndGggPiBtYWluTWVzc2FnZS5sZW5ndGggKyA1MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbHNIdG1sID0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGFjY29yZGlvblwiIHN0eWxlPVwibWFyZ2luLXRvcDogMTBweDtcIj4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gYDxkaXYgY2xhc3M9XCJ0aXRsZVwiPjxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5tc19EaWFnbm9zdGljVGVjaG5pY2FsRGV0YWlsc308L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gYDxkaXYgY2xhc3M9XCJjb250ZW50XCI+PGNvZGUgc3R5bGU9XCJmb250LXNpemU6IDExcHg7IHdvcmQtYnJlYWs6IGJyZWFrLWFsbDsgZGlzcGxheTogYmxvY2s7IHdoaXRlLXNwYWNlOiBwcmUtd3JhcDtcIj4ke3Jhd0Vycm9yfTwvY29kZT48L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzSHRtbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgYWNjb3JkaW9uIGZvciB0ZWNobmljYWwgZGV0YWlsc1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5maW5kKCcuYWNjb3JkaW9uJykuYWNjb3JkaW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IG1pbmltYWwgZGlhZ25vc3RpY3MgaW5mbyBmb3IgZmFpbGVkIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5kaWFnbm9zdGljcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaWFnID0gcmVzcG9uc2UuZGF0YS5kaWFnbm9zdGljcztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgJHtkaWFnLmF1dGhfdHlwZS50b1VwcGVyQ2FzZSgpfTogJHtkaWFnLnNtdHBfaG9zdH06JHtkaWFnLnNtdHBfcG9ydH1gO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlhZy5zbXRwX2VuY3J5cHRpb24gJiYgZGlhZy5zbXRwX2VuY3J5cHRpb24gIT09ICdub25lJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgICgke2RpYWcuc210cF9lbmNyeXB0aW9uLnRvVXBwZXJDYXNlKCl9KWA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSAnPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGhpbnRzIGlmIGF2YWlsYWJsZSAtIGxpbWl0IHRvIHRvcCAzIG1vc3QgcmVsZXZhbnQgb25lc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uaGludHMgJiYgcmVzcG9uc2UuZGF0YS5oaW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBoaW50cyA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjxzdHJvbmc+0KDQtdC60L7QvNC10L3QtNCw0YbQuNC4Ojwvc3Ryb25nPjx1bD4nO1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG1heCAzIGhpbnRzIHRvIGF2b2lkIG92ZXJ3aGVsbWluZyB0aGUgdXNlclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWxldmFudEhpbnRzID0gcmVzcG9uc2UuZGF0YS5oaW50cy5zbGljZSgwLCAzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVsZXZhbnRIaW50cy5mb3JFYWNoKGhpbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBFbmdsaXNoIGhpbnRzIGlmIHdlIGhhdmUgUnVzc2lhbiBvbmVzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGludC5pbmNsdWRlcygnT0F1dGgyIGFjY2VzcyB0b2tlbiBleHBpcmVkJykgJiYgcmVsZXZhbnRIaW50cy5zb21lKGggPT4gaC5pbmNsdWRlcygn0YLQvtC60LXQvScpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGhpbnRzICs9IGA8bGk+JHtoaW50fTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGhpbnRzICs9ICc8L3VsPic7XG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGhpbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEF1dG8taGlkZSBhZnRlciAzMCBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmZhZGVPdXQoNDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIDMwMDAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgdGVzdCBlbWFpbFxuICAgICAqL1xuICAgIHNlbmRUZXN0RW1haWwoKSB7XG4gICAgICAgIGNvbnN0IHJlY2lwaWVudCA9ICQoJyNTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnKS52YWwoKTtcblxuICAgICAgICBpZiAoIXJlY2lwaWVudCkge1xuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBuZXh0IHRvIGJ1dHRvblxuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJyNzZW5kLXRlc3QtZW1haWwtYnV0dG9uJyk7XG4gICAgICAgICAgICBsZXQgJHJlc3VsdCA9ICQoJzxkaXYgaWQ9XCJzZW5kLXRlc3QtcmVzdWx0XCIgY2xhc3M9XCJ1aSBzbWFsbCBuZWdhdGl2ZSBtZXNzYWdlXCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAkcmVzdWx0Lmh0bWwoJzxpIGNsYXNzPVwidGltZXMgY2lyY2xlIGljb25cIj48L2k+IFBsZWFzZSBlbnRlciBhIHJlY2lwaWVudCBlbWFpbCBhZGRyZXNzJyk7XG4gICAgICAgICAgICAkKCcjc2VuZC10ZXN0LXJlc3VsdCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgJGJ1dHRvbi5wYXJlbnQoKS5hcHBlbmQoJHJlc3VsdCk7XG5cbiAgICAgICAgICAgIC8vIEF1dG8taGlkZSBhZnRlciAxMCBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmZhZGVPdXQoNDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIDEwMDAwKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjc2VuZC10ZXN0LWVtYWlsLWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkcmVzdWx0QXJlYSA9ICQoJyNzZW5kLXRlc3QtcmVzdWx0Jyk7XG5cbiAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgcmVzdWx0XG4gICAgICAgICRyZXN1bHRBcmVhLnJlbW92ZSgpO1xuXG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgdG86IHJlY2lwaWVudFxuICAgICAgICAgICAgLy8gTGV0IHRoZSBzZXJ2ZXIgZ2VuZXJhdGUgZW5oYW5jZWQgZW1haWwgY29udGVudCB3aXRoIHN5c3RlbSBpbmZvXG4gICAgICAgIH07XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLnNlbmRUZXN0RW1haWwoZGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSByZXN1bHQgYXJlYSBuZXh0IHRvIGJ1dHRvblxuICAgICAgICAgICAgbGV0ICRyZXN1bHQgPSAkKCc8ZGl2IGlkPVwic2VuZC10ZXN0LXJlc3VsdFwiIGNsYXNzPVwidWkgc21hbGwgbWVzc2FnZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgJGJ1dHRvbi5wYXJlbnQoKS5hcHBlbmQoJHJlc3VsdCk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIGFjdHVhbCByZWNpcGllbnQgZnJvbSByZXNwb25zZVxuICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbFJlY2lwaWVudCA9IHJlc3BvbnNlLmRhdGE/LnRvIHx8IHJlY2lwaWVudDtcblxuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgbWVzc2FnZSBmcm9tIEFQSSB3aGljaCBhbHJlYWR5IGluY2x1ZGVzIHRoZSBlbWFpbCBhZGRyZXNzXG4gICAgICAgICAgICAgICAgbGV0IHN1Y2Nlc3NNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXM/LnN1Y2Nlc3M/LlswXSB8fCAnVGVzdCBlbWFpbCBzZW50JztcblxuICAgICAgICAgICAgICAgIC8vIElmIG1lc3NhZ2UgZG9lc24ndCBpbmNsdWRlIGVtYWlsIGJ1dCB3ZSBoYXZlIGl0LCBhZGQgaXRcbiAgICAgICAgICAgICAgICBpZiAoIXN1Y2Nlc3NNZXNzYWdlLmluY2x1ZGVzKCdAJykgJiYgYWN0dWFsUmVjaXBpZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NNZXNzYWdlID0gc3VjY2Vzc01lc3NhZ2UucmVwbGFjZSgn0J/QuNGB0YzQvNC+INC+0YLQv9GA0LDQstC70LXQvdC+JywgYNCf0LjRgdGM0LzQviDQvtGC0L/RgNCw0LLQu9C10L3QviDihpIgJHthY3R1YWxSZWNpcGllbnR9YCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygncG9zaXRpdmUnKS5odG1sKFxuICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJjaGVjayBjaXJjbGUgaWNvblwiPjwvaT4gJyArIHN1Y2Nlc3NNZXNzYWdlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZGlhZ25vc3RpY3MgaW5mbyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YT8uZGlhZ25vc3RpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlhZyA9IHJlc3BvbnNlLmRhdGEuZGlhZ25vc3RpY3M7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHNtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWFnLmF1dGhfdHlwZSA9PT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gZGlhZy5vYXV0aDJfcHJvdmlkZXIgfHwgJ09BdXRoMic7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGBVc2luZzogT0F1dGgyYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ09BdXRoMicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGAgKCR7cHJvdmlkZXJ9KWA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGBVc2luZzogUGFzc3dvcmQgYXV0aGVudGljYXRpb25gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCwgU2VydmVyOiAke2RpYWcuc210cF9ob3N0fToke2RpYWcuc210cF9wb3J0fWA7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gJzwvc21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlscyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gcmVzcG9uc2U/Lm1lc3NhZ2VzPy5lcnJvcj8uam9pbignLCAnKSB8fCBnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY0Nvbm5lY3Rpb25GYWlsZWQ7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygnbmVnYXRpdmUnKS5odG1sKCc8aSBjbGFzcz1cInRpbWVzIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgbWVzc2FnZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGRldGFpbGVkIGVycm9yIGFuYWx5c2lzIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uZXJyb3JfZGV0YWlscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvckRldGFpbHMgPSByZXNwb25zZS5kYXRhLmVycm9yX2RldGFpbHM7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzSHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2Pic7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBzaG93aW5nIGVycm9yIHR5cGUgbGFiZWwgLSBpdCdzIHRvbyB0ZWNobmljYWwgZm9yIG1vc3QgdXNlcnNcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3JEZXRhaWxzLnByb2JhYmxlX2NhdXNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSBgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5tc19EaWFnbm9zdGljUHJvYmFibGVDYXVzZX08L3N0cm9uZz4gJHtlcnJvckRldGFpbHMucHJvYmFibGVfY2F1c2V9PGJyPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHJhdyBQSFBNYWlsZXIgZXJyb3IgaW4gYSBjb2xsYXBzaWJsZSBzZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvckRldGFpbHMucmF3X2Vycm9yICYmIGVycm9yRGV0YWlscy5yYXdfZXJyb3IgIT09IG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBhY2NvcmRpb25cIiBzdHlsZT1cIm1hcmdpbi10b3A6IDEwcHg7XCI+JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8ZGl2IGNsYXNzPVwidGl0bGVcIj48aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY1RlY2huaWNhbERldGFpbHN9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8ZGl2IGNsYXNzPVwiY29udGVudFwiPjxjb2RlIHN0eWxlPVwiZm9udC1zaXplOiAxMXB4OyB3b3JkLWJyZWFrOiBicmVhay1hbGw7XCI+JHtlcnJvckRldGFpbHMucmF3X2Vycm9yfTwvY29kZT48L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzSHRtbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBhY2NvcmRpb24gZm9yIHRlY2huaWNhbCBkZXRhaWxzXG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuZmluZCgnLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNob3cgaGludHMgaWYgYXZhaWxhYmxlIC0gbGltaXQgdG8gdG9wIDMgbW9zdCByZWxldmFudCBvbmVzXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5oaW50cyAmJiByZXNwb25zZS5kYXRhLmhpbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGhpbnRzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHN0cm9uZz7QoNC10LrQvtC80LXQvdC00LDRhtC40Lg6PC9zdHJvbmc+PHVsPic7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgbWF4IDMgaGludHMgdG8gYXZvaWQgb3ZlcndoZWxtaW5nIHRoZSB1c2VyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbGV2YW50SGludHMgPSByZXNwb25zZS5kYXRhLmhpbnRzLnNsaWNlKDAsIDMpO1xuICAgICAgICAgICAgICAgICAgICByZWxldmFudEhpbnRzLmZvckVhY2goaGludCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIEVuZ2xpc2ggaGludHMgaWYgd2UgaGF2ZSBSdXNzaWFuIG9uZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoaW50LmluY2x1ZGVzKCdPQXV0aDIgYWNjZXNzIHRva2VuIGV4cGlyZWQnKSAmJiByZWxldmFudEhpbnRzLnNvbWUoaCA9PiBoLmluY2x1ZGVzKCfRgtC+0LrQtdC9JykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaGludHMgKz0gYDxsaT4ke2hpbnR9PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaGludHMgKz0gJzwvdWw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoaGludHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXV0by1oaWRlIGFmdGVyIDMwIHNlY29uZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRyZXN1bHQuZmFkZU91dCg0MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgMzAwMDApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIEdldCB1bm1hc2tlZCB2YWx1ZXMgZm9yIGVtYWlsIGZpZWxkcyBGSVJTVFxuICAgICAgICBjb25zdCBlbWFpbEZpZWxkcyA9IFtcbiAgICAgICAgICAgICdNYWlsU01UUFNlbmRlckFkZHJlc3MnLFxuICAgICAgICAgICAgJ1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCcsXG4gICAgICAgICAgICAnU3lzdGVtRW1haWxGb3JNaXNzZWQnLFxuICAgICAgICAgICAgJ1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCdcbiAgICAgICAgXTtcblxuICAgICAgICBlbWFpbEZpZWxkcy5mb3JFYWNoKGZpZWxkSWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJChgIyR7ZmllbGRJZH1gKTtcbiAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGxldCBvcmlnaW5hbFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICcnO1xuICAgICAgICAgICAgICAgIGxldCBmaWVsZFZhbHVlID0gb3JpZ2luYWxWYWx1ZTtcblxuICAgICAgICAgICAgICAgIC8vIEZvciBlbWFpbCBpbnB1dG1hc2ssIHRyeSBkaWZmZXJlbnQgYXBwcm9hY2hlcyB0byBnZXQgY2xlYW4gdmFsdWVcbiAgICAgICAgICAgICAgICBpZiAoZmllbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB2YWx1ZSBjb250YWlucyBwbGFjZWhvbGRlciBwYXR0ZXJuc1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmllbGRWYWx1ZS5pbmNsdWRlcygnX0BfJykgfHwgZmllbGRWYWx1ZSA9PT0gJ0AuJyB8fCBmaWVsZFZhbHVlID09PSAnQCcgfHwgZmllbGRWYWx1ZSA9PT0gJ18nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWVsZFZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZ2V0IHVubWFza2VkIHZhbHVlIGZvciBlbWFpbCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaW5wdXRtYXNrIHBsdWdpbiBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlucHV0bWFzayAmJiB0eXBlb2YgJGZpZWxkLmlucHV0bWFzayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1bm1hc2tlZFZhbHVlID0gJGZpZWxkLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodW5tYXNrZWRWYWx1ZSAmJiB1bm1hc2tlZFZhbHVlICE9PSBmaWVsZFZhbHVlICYmICF1bm1hc2tlZFZhbHVlLmluY2x1ZGVzKCdfJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkVmFsdWUgPSB1bm1hc2tlZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW01haWxTZXR0aW5nc10gRmFpbGVkIHRvIGdldCB1bm1hc2tlZCB2YWx1ZSBmb3IgJHtmaWVsZElkfTpgLCBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZElkXSA9IGZpZWxkVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBObyBzdWNjZXNzIG1lc3NhZ2UgbmVlZGVkIC0gZm9ybSBzYXZlcyBzaWxlbnRseVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIGZvciBzYXZpbmcgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG1haWxTZXR0aW5ncy4kZm9ybU9iajtcblxuICAgICAgICAvLyBFbmFibGUgUkVTVCBBUEkgbW9kZSAobW9kZXJuIGFwcHJvYWNoIGxpa2UgR2VuZXJhbFNldHRpbmdzKVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE1haWxTZXR0aW5nc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3BhdGNoU2V0dGluZ3MnO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb24gZm9yIGNsZWFuZXIgQVBJIHJlcXVlc3RzXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIEVuYWJsZSBzZW5kaW5nIG9ubHkgY2hhbmdlZCBmaWVsZHMgZm9yIG9wdGltYWwgUEFUQ0ggc2VtYW50aWNzXG4gICAgICAgIEZvcm0uc2VuZE9ubHlDaGFuZ2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBObyByZWRpcmVjdCBhZnRlciBzYXZlIC0gc3RheSBvbiB0aGUgc2FtZSBwYWdlXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBudWxsO1xuXG4gICAgICAgIC8vIFVzZSAnIycgZm9yIFVSTCB3aGVuIHVzaW5nIGFwaVNldHRpbmdzXG4gICAgICAgIEZvcm0udXJsID0gJyMnO1xuXG4gICAgICAgIC8vIFVzZSBkeW5hbWljIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gY3VycmVudCBzdGF0ZVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBtYWlsU2V0dGluZ3MuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBtYWlsU2V0dGluZ3MuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBtYWlsU2V0dGluZ3MuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIE9BdXRoMiBldmVudHNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb09BdXRoMkV2ZW50cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIFN1YnNjcmliZSB0byBPQXV0aDIgYXV0aG9yaXphdGlvbiBldmVudHNcbiAgICAgICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnb2F1dGgyLWF1dGhvcml6YXRpb24nLCAoZGF0YSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuc3RhdHVzID09PSAnc3VjY2VzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3VjY2VzczogcmVmcmVzaCBPQXV0aDIgc3RhdHVzIGFmdGVyIGEgc2hvcnQgZGVsYXlcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuY2hlY2tPQXV0aDJTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLnN0YXR1cyA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBFcnJvcjogc2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyUHJvY2Vzc2luZ0ZhaWxlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIDQwMDBcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb25pdG9yIGZvcm0gY2hhbmdlcyB0byBjb250cm9sIHRlc3QgYnV0dG9uIHN0YXRlc1xuICAgICAqL1xuICAgIG1vbml0b3JGb3JtQ2hhbmdlcygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGx5IGJ1dHRvbnMgc2hvdWxkIGJlIGVuYWJsZWQgKG5vIGNoYW5nZXMgeWV0KVxuICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpO1xuXG4gICAgICAgIC8vIFdhdGNoIHRoZSBzdWJtaXQgYnV0dG9uJ3MgY2xhc3MgY2hhbmdlcyB2aWEgTXV0YXRpb25PYnNlcnZlci5cbiAgICAgICAgLy8gRm9ybS5jaGVja1ZhbHVlcygpIHRvZ2dsZXMgJ2Rpc2FibGVkJyBvbiAjc3VibWl0YnV0dG9uIOKAlCBvYnNlcnZlciByZWFjdHMgdG8gdGhhdC5cbiAgICAgICAgY29uc3Qgc3VibWl0QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N1Ym1pdGJ1dHRvbicpO1xuICAgICAgICBpZiAoc3VibWl0QnV0dG9uKSB7XG4gICAgICAgICAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKCgpID0+IHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBvYnNlcnZlci5vYnNlcnZlKHN1Ym1pdEJ1dHRvbiwge2F0dHJpYnV0ZXM6IHRydWUsIGF0dHJpYnV0ZUZpbHRlcjogWydjbGFzcyddfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRlc3QgYnV0dG9uIHN0YXRlcyBiYXNlZCBvbiBmb3JtIGNoYW5nZXMuXG4gICAgICogVGVzdCBidXR0b25zIGFyZSBhY3RpdmUgb25seSB3aGVuIHNhdmUgYnV0dG9uIGlzIGRpc2FibGVkIChubyB1bnNhdmVkIGNoYW5nZXMpLlxuICAgICAqL1xuICAgIHVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKSB7XG4gICAgICAgIGNvbnN0ICR0ZXN0Q29ubmVjdGlvbkJ0biA9ICQoJyN0ZXN0LWNvbm5lY3Rpb24tYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRzZW5kVGVzdEVtYWlsQnRuID0gJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHN1Ym1pdEJ0biA9ICQoJyNzdWJtaXRidXR0b24nKTtcblxuICAgICAgICAvLyBTYXZlIGJ1dHRvbiBkaXNhYmxlZCA9IG5vIHVuc2F2ZWQgY2hhbmdlcyA9IHRlc3QgYnV0dG9ucyBzaG91bGQgYmUgZW5hYmxlZFxuICAgICAgICBjb25zdCBoYXNVbnNhdmVkQ2hhbmdlcyA9ICEkc3VibWl0QnRuLmhhc0NsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgIGlmIChoYXNVbnNhdmVkQ2hhbmdlcykge1xuICAgICAgICAgICAgLy8gRm9ybSBoYXMgdW5zYXZlZCBjaGFuZ2VzIC0gZGlzYWJsZSB0ZXN0IGJ1dHRvbnNcbiAgICAgICAgICAgICR0ZXN0Q29ubmVjdGlvbkJ0blxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLWludmVydGVkJywgJycpO1xuXG4gICAgICAgICAgICAkc2VuZFRlc3RFbWFpbEJ0blxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLWludmVydGVkJywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gY2hhbmdlcyAtIGVuYWJsZSB0ZXN0IGJ1dHRvbnNcbiAgICAgICAgICAgICR0ZXN0Q29ubmVjdGlvbkJ0blxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXRvb2x0aXAnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1pbnZlcnRlZCcpO1xuXG4gICAgICAgICAgICAkc2VuZFRlc3RFbWFpbEJ0blxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXRvb2x0aXAnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1pbnZlcnRlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYnV0dG9uc1xuICAgICAgICAkKCcudWkuYnV0dG9uW2RhdGEtdG9vbHRpcF0nKS5wb3B1cCgpO1xuICAgIH0sXG5cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZSgpO1xuXG4gICAgLy8gRW5zdXJlIGNsaWNrIHByZXZlbnRpb24gZm9yIHRvb2x0aXAgaWNvbnMgaW4gY2hlY2tib3hlc1xuICAgIC8vIFRoaXMgcHJldmVudHMgY2hlY2tib3ggdG9nZ2xlIHdoZW4gY2xpY2tpbmcgb24gdG9vbHRpcCBpY29uXG4gICAgJCgnLmZpZWxkLWluZm8taWNvbicpLm9mZignY2xpY2sudG9vbHRpcC1wcmV2ZW50Jykub24oJ2NsaWNrLnRvb2x0aXAtcHJldmVudCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG59KTsiXX0=