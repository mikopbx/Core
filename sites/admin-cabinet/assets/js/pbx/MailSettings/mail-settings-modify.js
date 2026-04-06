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
            var booleanFields = ['MailSMTPCertCheck', 'MailEnableNotifications', 'SendMissedCallNotifications', 'SendVoicemailNotifications', 'SendLoginNotifications', 'SendSystemNotifications'];
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


            var notificationToggles = ['SendMissedCallNotifications', 'SendVoicemailNotifications', 'SendLoginNotifications', 'SendSystemNotifications'];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkIiwiJGNoZWNrQm94ZXMiLCIkbWVudUl0ZW1zIiwib2F1dGgyV2luZG93IiwiZGF0YUxvYWRlZCIsImdldFZhbGlkYXRlUnVsZXMiLCJydWxlcyIsImF1dGhUeXBlIiwidmFsIiwiTWFpbFNNVFBTZW5kZXJBZGRyZXNzIiwiaWRlbnRpZmllciIsIm9wdGlvbmFsIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQiLCJTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwiLCJtc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCIsIlN5c3RlbUVtYWlsRm9yTWlzc2VkIiwidmFsdWUiLCJtc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCIsIlZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCIsIm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkIiwiTWFpbFNNVFBIb3N0IiwibXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQiLCJNYWlsU01UUFBvcnQiLCJtc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCIsIk1haWxPQXV0aDJQcm92aWRlciIsIk1haWxPQXV0aDJDbGllbnRJZCIsIk1haWxPQXV0aDJDbGllbnRTZWNyZXQiLCJNYWlsU01UUFVzZXJuYW1lIiwibXNfVmFsaWRhdGVTTVRQVXNlcm5hbWVFbWFpbCIsIk1haWxTTVRQUGFzc3dvcmQiLCJkZXBlbmRzIiwibXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSIsInVwZGF0ZVZhbGlkYXRpb25SdWxlcyIsIm5ld1J1bGVzIiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmb3JtIiwiZmllbGRzIiwiaW5saW5lIiwib24iLCJpbml0aWFsaXplIiwiaGFuZGxlT0F1dGgyQ2FsbGJhY2siLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJjaGVja2JveCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ1cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24iLCJpbml0aWFsRW5jcnlwdGlvbiIsImNsZWFyYWJsZSIsImZvcmNlU2VsZWN0aW9uIiwidXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVPQXV0aDIiLCJpbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycyIsImluaXRpYWxpemVOb3RpZmljYXRpb25IYW5kbGVycyIsImluaXRpYWxpemVUZXN0QnV0dG9ucyIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwiLCJpbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIiLCJzdWJzY3JpYmVUb09BdXRoMkV2ZW50cyIsIm1vbml0b3JGb3JtQ2hhbmdlcyIsImxvYWREYXRhIiwiTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJidWlsZFRvb2x0aXBDb250ZW50IiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsImJ1aWxkQ29udGVudCIsImVtYWlsRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkSWQiLCIkZmllbGQiLCJsZW5ndGgiLCJpbnB1dG1hc2siLCJzaG93TWFza09uSG92ZXIiLCJwbGFjZWhvbGRlciIsIm9uQmVmb3JlUGFzdGUiLCJwYXN0ZWRWYWx1ZSIsIm9uY2xlYXJlZCIsIiRpbnB1dCIsImFkZENsYXNzIiwiTWFpbFNldHRpbmdzQVBJIiwiZ2V0U2V0dGluZ3MiLCJzZXR0aW5ncyIsIm9mZiIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJkYXRhIiwiYm9vbGVhbkZpZWxkcyIsImtleSIsInVuZGVmaW5lZCIsIk1haWxTTVRQQXV0aFR5cGUiLCJhZnRlclBvcHVsYXRlIiwiTWFpbFNNVFBVc2VUTFMiLCJlbmNyeXB0aW9uVmFsdWUiLCJNYWlsU01UUENlcnRDaGVjayIsImlzQ2hlY2tlZCIsImNsb3Nlc3QiLCJNYWlsRW5hYmxlTm90aWZpY2F0aW9ucyIsIm5vdGlmaWNhdGlvblRvZ2dsZXMiLCJmaWVsZE5hbWUiLCJpbml0aWFsaXplRW1haWxGaWVsZHNWaXNpYmlsaXR5IiwidXBkYXRlVXNlcm5hbWVQbGFjZWhvbGRlciIsInRvZ2dsZUF1dGhGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RhcnRPQXV0aDJGbG93IiwiZGlzY29ubmVjdE9BdXRoMiIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJoYW5kbGVPQXV0aDJNZXNzYWdlIiwidG9nZ2xlTm90aWZpY2F0aW9uVHlwZXNTZWN0aW9uIiwiZGF0YUNoYW5nZWQiLCJ0b2dnbGVFbWFpbEZpZWxkIiwiaXNFbmFibGVkIiwiaXMiLCIkc2VjdGlvbiIsInNsaWRlRG93biIsInNldFRpbWVvdXQiLCJzbGlkZVVwIiwidG9nZ2xlSWQiLCJlbWFpbEZpZWxkSWQiLCIkZW1haWxGaWVsZCIsImlzTm90aWZpY2F0aW9uc0VuYWJsZWQiLCJzaG93IiwiaGlkZSIsInRvZ2dsZUVtYWlsTWFwIiwiT2JqZWN0Iiwia2V5cyIsInRhcmdldCIsImN1cnJlbnRBdXRoVHlwZSIsInRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzIiwiJHVzZXJuYW1lRmllbGQiLCIkcGFzc3dvcmRGaWVsZCIsIiRvYXV0aDJTZWN0aW9uIiwidXBkYXRlT0F1dGgyU3RhdHVzIiwiY2hlY2tPQXV0aDJTdGF0dXMiLCJjdXJyZW50VGFyZ2V0IiwiaGFzQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dXYXJuaW5nIiwibXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nIiwidGVzdENvbm5lY3Rpb24iLCJzZW5kVGVzdEVtYWlsIiwiZW1haWwiLCJwcm92aWRlciIsImRldGVjdFByb3ZpZGVyIiwic2hvd1Byb3ZpZGVySGludCIsImF1dG9GaWxsU01UUFNldHRpbmdzIiwic2VuZGVyQWRkcmVzcyIsInRyaW0iLCJhdHRyIiwicmVtb3ZlQXR0ciIsImdvb2dsZSIsImhvc3QiLCJwb3J0IiwidGxzIiwibWljcm9zb2Z0IiwieWFuZGV4IiwicHJvdmlkZXJTZXR0aW5ncyIsIiRlbmNyeXB0aW9uRHJvcGRvd24iLCJlbmNyeXB0aW9uIiwiY2VydENoZWNrIiwiZW5jcnlwdGlvblR5cGUiLCIkcG9ydEZpZWxkIiwiY3VycmVudFBvcnQiLCJzdGFuZGFyZFBvcnRzIiwiaW5jbHVkZXMiLCIkY2VydENoZWNrRmllbGQiLCJtZXNzYWdlIiwiJGhpbnQiLCJhZnRlciIsInRleHQiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJsb2NhdGlvbiIsInNlYXJjaCIsImhhcyIsImxvYWRTZXR0aW5nc0Zyb21BUEkiLCJyZXBsYWNlU3RhdGUiLCJkb2N1bWVudCIsInRpdGxlIiwicGF0aG5hbWUiLCJlcnJvciIsImdldCIsInNob3dFcnJvciIsIm1zX09BdXRoMkF1dGhvcml6YXRpb25GYWlsZWQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJtc19WYWxpZGF0ZU9BdXRoMlByb3ZpZGVyRW1wdHkiLCJjbGllbnRJZCIsImNsaWVudFNlY3JldCIsIm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50SWRFbXB0eSIsIm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50U2VjcmV0RW1wdHkiLCJzYXZlT0F1dGgyQ3JlZGVudGlhbHMiLCJwYXRjaFNldHRpbmdzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwcm9jZWVkV2l0aE9BdXRoMkZsb3ciLCJjb25zb2xlIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJqb2luIiwicmVxdWVzdE9BdXRoMkF1dGhVcmwiLCJhdXRob3JpemVPQXV0aDIiLCJhdXRoVXJsIiwid2lkdGgiLCJoZWlnaHQiLCJsZWZ0Iiwic2NyZWVuIiwidG9wIiwiYXV0aFdpbmRvdyIsIm9wZW4iLCJnZXRPQXV0aDJVcmwiLCJhdXRoX3VybCIsImV2ZW50Iiwib3JpZ2luIiwiY2xvc2UiLCJwYXJhbXMiLCJzaG93SW5mb3JtYXRpb24iLCJvYXV0aDJfc3RhdHVzIiwic3RhdHVzIiwiJHN0YXR1c0RpdiIsIiRjbGllbnRJZEZpZWxkIiwiJGNsaWVudFNlY3JldEZpZWxkIiwiY29uZmlndXJlZCIsInByb3ZpZGVyTmFtZSIsImdldFByb3ZpZGVyTmFtZSIsImNvbm5lY3RlZFRleHQiLCJtc19PQXV0aDJDb25uZWN0ZWRUbyIsInJlcGxhY2UiLCJodG1sIiwiYXV0aG9yaXplZCIsIm1zX09BdXRoMk5vdENvbmZpZ3VyZWQiLCJjbGVhckRhdGEiLCJNYWlsT0F1dGgyUmVmcmVzaFRva2VuIiwiTWFpbE9BdXRoMkFjY2Vzc1Rva2VuIiwiTWFpbE9BdXRoMlRva2VuRXhwaXJlcyIsIiRidXR0b24iLCIkcmVzdWx0QXJlYSIsInJlbW92ZSIsIiRyZXN1bHQiLCJwYXJlbnQiLCJhcHBlbmQiLCJzdWNjZXNzIiwiZGlhZ25vc3RpY3MiLCJkaWFnIiwiZGV0YWlscyIsImF1dGhfdHlwZSIsInNtdHBfaG9zdCIsInNtdHBfcG9ydCIsInNtdHBfZW5jcnlwdGlvbiIsIm9hdXRoMl9wcm92aWRlciIsIm9hdXRoMl9yZWZyZXNoX3Rva2VuX2V4aXN0cyIsIm1zX0RpYWdub3N0aWNBdXRob3JpemVkIiwibWFpbk1lc3NhZ2UiLCJtc19EaWFnbm9zdGljQ29ubmVjdGlvbkZhaWxlZCIsImVycm9yX2RldGFpbHMiLCJwcm9iYWJsZV9jYXVzZSIsInJhd19lcnJvciIsInJhd0Vycm9yIiwiZGV0YWlsc0h0bWwiLCJtc19EaWFnbm9zdGljVGVjaG5pY2FsRGV0YWlscyIsImZpbmQiLCJhY2NvcmRpb24iLCJ0b1VwcGVyQ2FzZSIsImhpbnRzIiwicmVsZXZhbnRIaW50cyIsInNsaWNlIiwiaGludCIsInNvbWUiLCJoIiwiZmFkZU91dCIsInJlY2lwaWVudCIsInRvIiwiYWN0dWFsUmVjaXBpZW50Iiwic3VjY2Vzc01lc3NhZ2UiLCJlcnJvckRldGFpbHMiLCJtc19EaWFnbm9zdGljUHJvYmFibGVDYXVzZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJvcmlnaW5hbFZhbHVlIiwiZmllbGRWYWx1ZSIsInVubWFza2VkVmFsdWUiLCJ3YXJuIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwic2VuZE9ubHlDaGFuZ2VkIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ1cmwiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsIm1zX09BdXRoMlByb2Nlc3NpbmdGYWlsZWQiLCJ1cGRhdGVUZXN0QnV0dG9uU3RhdGVzIiwic3VibWl0QnV0dG9uIiwiZ2V0RWxlbWVudEJ5SWQiLCJvYnNlcnZlciIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImF0dHJpYnV0ZUZpbHRlciIsIiR0ZXN0Q29ubmVjdGlvbkJ0biIsIiRzZW5kVGVzdEVtYWlsQnRuIiwiJHN1Ym1pdEJ0biIsImhhc1Vuc2F2ZWRDaGFuZ2VzIiwicG9wdXAiLCJyZWFkeSIsInN0b3BQcm9wYWdhdGlvbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FMTTs7QUFPakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFRCxDQUFDLENBQUMsK0JBQUQsQ0FYRzs7QUFhakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsVUFBVSxFQUFFRixDQUFDLENB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QixFQUozQjtBQUtILEtBYkQsTUFhTztBQUNIO0FBQ0F3SixNQUFBQSxrQkFBa0IsQ0FDYjNNLFdBREwsQ0FDaUIsVUFEakIsRUFFS29ELFVBRkwsQ0FFZ0IsY0FGaEIsRUFHS0EsVUFITCxDQUdnQixlQUhoQixFQUlLQSxVQUpMLENBSWdCLGVBSmhCO0FBTUF3SixNQUFBQSxpQkFBaUIsQ0FDWjVNLFdBREwsQ0FDaUIsVUFEakIsRUFFS29ELFVBRkwsQ0FFZ0IsY0FGaEIsRUFHS0EsVUFITCxDQUdnQixlQUhoQixFQUlLQSxVQUpMLENBSWdCLGVBSmhCO0FBS0gsS0FsQ29CLENBb0NyQjs7O0FBQ0FqSyxJQUFBQSxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUE4QjRULEtBQTlCO0FBQ0g7QUExaURnQixDQUFyQixDLENBOGlEQTs7QUFDQTVULENBQUMsQ0FBQzZMLFFBQUQsQ0FBRCxDQUFZZ0ksS0FBWixDQUFrQixZQUFNO0FBQ3BCL1QsRUFBQUEsWUFBWSxDQUFDNkMsVUFBYixHQURvQixDQUdwQjtBQUNBOztBQUNBM0MsRUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0J5RixHQUF0QixDQUEwQix1QkFBMUIsRUFBbUQvQyxFQUFuRCxDQUFzRCx1QkFBdEQsRUFBK0UsVUFBU3VFLENBQVQsRUFBWTtBQUN2RkEsSUFBQUEsQ0FBQyxDQUFDNk0sZUFBRjtBQUNBN00sSUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsV0FBTyxLQUFQO0FBQ0gsR0FKRDtBQUtILENBVkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBVc2VyTWVzc2FnZSwgTWFpbFNldHRpbmdzQVBJLCBDb25maWcsIFRvb2x0aXBCdWlsZGVyLCBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbWFpbCBzZXR0aW5ncyB3aXRoIE9BdXRoMiBzdXBwb3J0XG4gKlxuICogQG1vZHVsZSBtYWlsU2V0dGluZ3NcbiAqL1xuY29uc3QgbWFpbFNldHRpbmdzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNtYWlsLXNldHRpbmdzLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVja2JveGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQm94ZXM6ICQoJyNtYWlsLXNldHRpbmdzLWZvcm0gLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbWVudSBpdGVtcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtZW51SXRlbXM6ICQoJyNtYWlsLXNldHRpbmdzLW1lbnUgLml0ZW0nKSxcblxuICAgIC8qKlxuICAgICAqIE9BdXRoMiB3aW5kb3cgcmVmZXJlbmNlXG4gICAgICogQHR5cGUge1dpbmRvd3xudWxsfVxuICAgICAqL1xuICAgIG9hdXRoMldpbmRvdzogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgaW5pdGlhbCBkYXRhIGhhcyBiZWVuIGxvYWRlZCBmcm9tIEFQSVxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGRhdGFMb2FkZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBmb3JtIHN0YXRlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJ1bGVzID0ge307XG4gICAgICAgIGNvbnN0IGF1dGhUeXBlID0gJCgnaW5wdXRbbmFtZT1cIk1haWxTTVRQQXV0aFR5cGVcIl06Y2hlY2tlZCcpLnZhbCgpO1xuXG4gICAgICAgIC8vIEJhc2UgZW1haWwgdmFsaWRhdGlvbiBydWxlcyAtIGFsd2F5cyBhcHBseSB3aGVuIGZpZWxkcyBoYXZlIHZhbHVlc1xuICAgICAgICBydWxlcy5NYWlsU01UUFNlbmRlckFkZHJlc3MgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbFNNVFBTZW5kZXJBZGRyZXNzJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5TeXN0ZW1FbWFpbEZvck1pc3NlZCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeKD8hLipfQF9cXFxcLl8pLiokJywgIC8vIFJlamVjdCBfQF8uXyBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlTWlzc2VkRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ14oPyEuKl9AX1xcXFwuXykuKiQnLCAgLy8gUmVqZWN0IF9AXy5fIHBhdHRlcm5cbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVWb2ljZW1haWxFbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNNVFAgY29uZmlndXJhdGlvbiBydWxlcyAtIGFsd2F5cyBhdmFpbGFibGUgYnV0IG9wdGlvbmFsXG4gICAgICAgIHJ1bGVzLk1haWxTTVRQSG9zdCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUEhvc3QnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuTWFpbFNNVFBQb3J0ID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQUG9ydCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBdXRoZW50aWNhdGlvbi1zcGVjaWZpYyBydWxlc1xuICAgICAgICBpZiAoYXV0aFR5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICAvLyBPQXV0aDIgZmllbGRzIC0gb3B0aW9uYWxcbiAgICAgICAgICAgIHJ1bGVzLk1haWxPQXV0aDJQcm92aWRlciA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbE9BdXRoMlByb3ZpZGVyJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBydWxlcy5NYWlsT0F1dGgyQ2xpZW50SWQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxPQXV0aDJDbGllbnRJZCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcnVsZXMuTWFpbE9BdXRoMkNsaWVudFNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbE9BdXRoMkNsaWVudFNlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gVXNlcm5hbWUgZm9yIE9BdXRoMiBzaG91bGQgYmUgZW1haWwgd2hlbiBmaWxsZWRcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQVXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNNVFBVc2VybmFtZUVtYWlsLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUGFzc3dvcmQgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFVzZXJuYW1lIC0gb3B0aW9uYWxcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQVXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIC0gcmVxdWlyZWQgaWYgdXNlcm5hbWUgaXMgcHJvdmlkZWRcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQUGFzc3dvcmQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQUGFzc3dvcmQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRlcGVuZHM6ICdNYWlsU01UUFVzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgYW5kIHJlaW5pdGlhbGl6ZSBmb3JtXG4gICAgICovXG4gICAgdXBkYXRlVmFsaWRhdGlvblJ1bGVzKCkge1xuICAgICAgICAvLyBHZXQgZnJlc2ggdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBjdXJyZW50IHN0YXRlXG4gICAgICAgIGNvbnN0IG5ld1J1bGVzID0gbWFpbFNldHRpbmdzLmdldFZhbGlkYXRlUnVsZXMoKTtcblxuICAgICAgICAvLyBVcGRhdGUgRm9ybS52YWxpZGF0ZVJ1bGVzXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ld1J1bGVzO1xuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gd2l0aCBuZXcgcnVsZXNcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2Rlc3Ryb3knKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oe1xuICAgICAgICAgICAgZmllbGRzOiBuZXdSdWxlcyxcbiAgICAgICAgICAgIGlubGluZTogdHJ1ZSxcbiAgICAgICAgICAgIG9uOiAnYmx1cidcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1haWwgc2V0dGluZ3MgcGFnZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDaGVjayBmb3IgT0F1dGgyIGNhbGxiYWNrIHBhcmFtZXRlcnMgaW4gVVJMXG4gICAgICAgIG1haWxTZXR0aW5ncy5oYW5kbGVPQXV0aDJDYWxsYmFjaygpO1xuXG4gICAgICAgIG1haWxTZXR0aW5ncy4kbWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG4gICAgICAgIG1haWxTZXR0aW5ncy4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggc3BlY2lmaWMgY29uZmlndXJhdGlvbnNcbiAgICAgICAgLy8gRG9uJ3QgaW5pdGlhbGl6ZSBhbGwgZHJvcGRvd25zIGdlbmVyaWNhbGx5IHRvIGF2b2lkIGRvdWJsZSBpbml0aWFsaXphdGlvblxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZW5jcnlwdGlvbiB0eXBlIGRyb3Bkb3duIHdpdGggcG9ydCBhdXRvLXVwZGF0ZVxuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24odmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpbml0aWFsIGVuY3J5cHRpb24gdHlwZSB0byBzaG93L2hpZGUgY2VydGlmaWNhdGUgY2hlY2tcbiAgICAgICAgY29uc3QgaW5pdGlhbEVuY3J5cHRpb24gPSAkKCcjTWFpbFNNVFBVc2VUTFMnKS52YWwoKSB8fCAnbm9uZSc7XG4gICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24oaW5pdGlhbEVuY3J5cHRpb24pO1xuXG4gICAgICAgIC8vIFNwZWNpYWwgaW5pdGlhbGl6YXRpb24gZm9yIE9BdXRoMiBwcm92aWRlciBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgY2xlYXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVNNVFBTZXR0aW5nc0ZvclByb3ZpZGVyKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTm8gb3RoZXIgZHJvcGRvd25zIGluIHRoZSBmb3JtIG5lZWQgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gTWFpbFNNVFBVc2VUTFMgYW5kIE1haWxPQXV0aDJQcm92aWRlciBhcmUgdGhlIG9ubHkgZHJvcGRvd25zXG5cbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplT0F1dGgyKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycygpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZU5vdGlmaWNhdGlvbkhhbmRsZXJzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplVGVzdEJ1dHRvbnMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVJbnB1dE1hc2tzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmRldGVjdFByb3ZpZGVyRnJvbUVtYWlsKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIoKTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgT0F1dGgyIGV2ZW50c1xuICAgICAgICBtYWlsU2V0dGluZ3Muc3Vic2NyaWJlVG9PQXV0aDJFdmVudHMoKTtcblxuICAgICAgICAvLyBNb25pdG9yIGZvcm0gY2hhbmdlcyB0byBjb250cm9sIHRlc3QgYnV0dG9uc1xuICAgICAgICBtYWlsU2V0dGluZ3MubW9uaXRvckZvcm1DaGFuZ2VzKCk7XG5cbiAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gQVBJIGFmdGVyIGFsbCBVSSBlbGVtZW50cyBhcmUgaW5pdGlhbGl6ZWRcbiAgICAgICAgbWFpbFNldHRpbmdzLmxvYWREYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBVc2UgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBpZiAodHlwZW9mIE1haWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZVRvb2x0aXBzKG1haWxTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogRGVsZWdhdGVzIHRvIFRvb2x0aXBCdWlsZGVyIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgZm9ybWF0dGluZ1xuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW5wdXQgbWFza3MgZm9yIGVtYWlsIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dE1hc2tzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGVtYWlsIGlucHV0IG1hc2tzIGZvciBhbGwgZW1haWwgZmllbGRzXG4gICAgICAgIGNvbnN0IGVtYWlsRmllbGRzID0gW1xuICAgICAgICAgICAgJ01haWxTTVRQU2VuZGVyQWRkcmVzcycsXG4gICAgICAgICAgICAnU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ1xuICAgICAgICBdO1xuXG4gICAgICAgIGVtYWlsRmllbGRzLmZvckVhY2goZmllbGRJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGZpZWxkLmlucHV0bWFzaygnZW1haWwnLCB7XG4gICAgICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJywgLy8gTm8gcGxhY2Vob2xkZXIgY2hhcmFjdGVyXG4gICAgICAgICAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGZ1bmN0aW9uKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGVhbiBwbGFjZWhvbGRlciB2YWx1ZXMgb24gcGFzdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXN0ZWRWYWx1ZSA9PT0gJ19AXy5fJyB8fCBwYXN0ZWRWYWx1ZSA9PT0gJ0AnIHx8IHBhc3RlZFZhbHVlID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25jbGVhcmVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBmaWVsZCB2YWx1ZSB3aGVuIG1hc2sgaXMgY2xlYXJlZFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkaW5wdXQudmFsKCkgPT09ICdfQF8uXycgfHwgJGlucHV0LnZhbCgpID09PSAnQCcgfHwgJGlucHV0LnZhbCgpID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRpbnB1dC52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBDbGVhbiBpbml0aWFsIHBsYWNlaG9sZGVyIHZhbHVlc1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQudmFsKCkgPT09ICdfQF8uXycgfHwgJGZpZWxkLnZhbCgpID09PSAnQCcgfHwgJGZpZWxkLnZhbCgpID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAkZmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1haWwgc2V0dGluZ3MgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWREYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLmdldFNldHRpbmdzKChzZXR0aW5ncykgPT4ge1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBvdXIgY2hhbmdlIGhhbmRsZXIgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXScpLm9mZignY2hhbmdlLm1haWxzZXR0aW5ncycpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggbGlrZSBHZW5lcmFsU2V0dGluZ3NcbiAgICAgICAgICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHNldHRpbmdzLCB7XG4gICAgICAgICAgICAgICAgICAgIGJlZm9yZVBvcHVsYXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUkVTVCBBUEkgcmV0dXJucyBib29sZWFucyBmb3IgY2hlY2tib3ggZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IGJvb2xlYW4gdmFsdWVzIHRvIHN0cmluZ3MgZm9yIFNlbWFudGljIFVJIGNoZWNrYm94ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvb2xlYW5GaWVsZHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ01haWxTTVRQQ2VydENoZWNrJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kTWlzc2VkQ2FsbE5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NlbmRMb2dpbk5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kU3lzdGVtTm90aWZpY2F0aW9ucydcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICBib29sZWFuRmllbGRzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBib29sZWFuIHRvIHN0cmluZyBcIjFcIiBvciBcIjBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSAoZGF0YVtrZXldID09PSB0cnVlIHx8IGRhdGFba2V5XSA9PT0gMSB8fCBkYXRhW2tleV0gPT09ICcxJykgPyAnMScgOiAnMCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSByYWRpbyBidXR0b24gdmFsdWUgaXMgc2V0ICh3aWxsIGJlIGhhbmRsZWQgc2lsZW50bHkgYnkgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YS5NYWlsU01UUEF1dGhUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5NYWlsU01UUEF1dGhUeXBlID0gJ3Bhc3N3b3JkJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYW4gdXAgcGxhY2Vob2xkZXIgZW1haWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbWFpbEZpZWxkcyA9IFsnU3lzdGVtRW1haWxGb3JNaXNzZWQnLCAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ107XG4gICAgICAgICAgICAgICAgICAgICAgICBlbWFpbEZpZWxkcy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFba2V5XSA9PT0gJ19AXy5fJyB8fCBkYXRhW2tleV0gPT09ICdAJyB8fCBkYXRhW2tleV0gPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgT0F1dGgyIHByb3ZpZGVyIGRyb3Bkb3duIChWNS4wIHBhdHRlcm4pXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5NYWlsT0F1dGgyUHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuTWFpbE9BdXRoMlByb3ZpZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykudmFsKGRhdGEuTWFpbE9BdXRoMlByb3ZpZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgZW5jcnlwdGlvbiB0eXBlIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5NYWlsU01UUFVzZVRMUyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBvbGQgYm9vbGVhbiB2YWx1ZXMgdG8gbmV3IGZvcm1hdCBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5jcnlwdGlvblZhbHVlID0gZGF0YS5NYWlsU01UUFVzZVRMUztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW5jcnlwdGlvblZhbHVlID09PSB0cnVlIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gMSB8fCBlbmNyeXB0aW9uVmFsdWUgPT09ICcxJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmNyeXB0aW9uVmFsdWUgPSAndGxzJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVuY3J5cHRpb25WYWx1ZSA9PT0gZmFsc2UgfHwgZW5jcnlwdGlvblZhbHVlID09PSAwIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gJzAnIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIGRyb3Bkb3duIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQVXNlVExTLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGVuY3J5cHRpb25WYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQVXNlVExTJykudmFsKGVuY3J5cHRpb25WYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGNoZWNrYm94ZXMgdXNpbmcgU2VtYW50aWMgVUlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxTTVRQQ2VydENoZWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBkYXRhLk1haWxTTVRQQ2VydENoZWNrID09PSB0cnVlIHx8IGRhdGEuTWFpbFNNVFBDZXJ0Q2hlY2sgPT09IDEgfHwgZGF0YS5NYWlsU01UUENlcnRDaGVjayA9PT0gJzEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxFbmFibGVOb3RpZmljYXRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBkYXRhLk1haWxFbmFibGVOb3RpZmljYXRpb25zID09PSB0cnVlIHx8IGRhdGEuTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgPT09IDEgfHwgZGF0YS5NYWlsRW5hYmxlTm90aWZpY2F0aW9ucyA9PT0gJzEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxFbmFibGVOb3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxFbmFibGVOb3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBub3RpZmljYXRpb24gdHlwZSB0b2dnbGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3RpZmljYXRpb25Ub2dnbGVzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kTWlzc2VkQ2FsbE5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NlbmRMb2dpbk5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kU3lzdGVtTm90aWZpY2F0aW9ucydcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICBub3RpZmljYXRpb25Ub2dnbGVzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtmaWVsZE5hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gZGF0YVtmaWVsZE5hbWVdID09PSB0cnVlIHx8IGRhdGFbZmllbGROYW1lXSA9PT0gMSB8fCBkYXRhW2ZpZWxkTmFtZV0gPT09ICcxJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7ZmllbGROYW1lfWApLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7ZmllbGROYW1lfWApLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbWFpbCBmaWVsZHMgdmlzaWJpbGl0eSBiYXNlZCBvbiB0b2dnbGUgc3RhdGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBNdXN0IGJlIGNhbGxlZCBhZnRlciBjaGVja2JveGVzIGFyZSBzZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplRW1haWxGaWVsZHNWaXNpYmlsaXR5KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBNYWlsU01UUFVzZXJuYW1lIHBsYWNlaG9sZGVyIHdpdGggTWFpbFNNVFBTZW5kZXJBZGRyZXNzIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVXNlcm5hbWVQbGFjZWhvbGRlcihkYXRhLk1haWxTTVRQU2VuZGVyQWRkcmVzcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIE9BdXRoMiBzdGF0dXMgaWYgT0F1dGgyIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSYWRpbyBidXR0b24gaXMgYWxyZWFkeSBzZXQgYnkgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXV0aFR5cGUgPSBkYXRhLk1haWxTTVRQQXV0aFR5cGUgfHwgJ3Bhc3N3b3JkJztcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVBdXRoRmllbGRzKGF1dGhUeXBlLCBkYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gbG9hZGVkIHN0YXRlXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVmFsaWRhdGlvblJ1bGVzKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGZsYWcgdGhhdCBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmRhdGFMb2FkZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGlmIGVuYWJsZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlLWVuYWJsZSBvdXIgY2hhbmdlIGhhbmRsZXIgZm9yIGZ1dHVyZSB1c2VyIGludGVyYWN0aW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgT0F1dGgyIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplT0F1dGgyKCkge1xuICAgICAgICAvLyBPQXV0aDIgY29ubmVjdCBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnN0YXJ0T0F1dGgyRmxvdygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBPQXV0aDIgZGlzY29ubmVjdCBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCcjb2F1dGgyLWRpc2Nvbm5lY3QnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLmRpc2Nvbm5lY3RPQXV0aDIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTGlzdGVuIGZvciBPQXV0aDIgY2FsbGJhY2sgbWVzc2FnZXNcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBtYWlsU2V0dGluZ3MuaGFuZGxlT0F1dGgyTWVzc2FnZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbm90aWZpY2F0aW9uIGVuYWJsZS9kaXNhYmxlIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5vdGlmaWNhdGlvbkhhbmRsZXJzKCkge1xuICAgICAgICAvLyBIYW5kbGUgbWFzdGVyIG5vdGlmaWNhdGlvbnMgZW5hYmxlL2Rpc2FibGUgY2hlY2tib3hcbiAgICAgICAgJCgnI01haWxFbmFibGVOb3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudG9nZ2xlTm90aWZpY2F0aW9uVHlwZXNTZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVZhbGlkYXRpb25SdWxlcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGluZGl2aWR1YWwgbm90aWZpY2F0aW9uIHR5cGUgdG9nZ2xlc1xuICAgICAgICAvLyBFYWNoIHRvZ2dsZSBzaG93cy9oaWRlcyBpdHMgY29ycmVzcG9uZGluZyBlbWFpbCBmaWVsZFxuICAgICAgICAkKCcjU2VuZE1pc3NlZENhbGxOb3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudG9nZ2xlRW1haWxGaWVsZCgnU2VuZE1pc3NlZENhbGxOb3RpZmljYXRpb25zJywgJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjU2VuZFZvaWNlbWFpbE5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVFbWFpbEZpZWxkKCdTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucycsICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNlbmRMb2dpbk5vdGlmaWNhdGlvbnMgYW5kIFNlbmRTeXN0ZW1Ob3RpZmljYXRpb25zIGRvbid0IGNvbnRyb2wgZW1haWwgZmllbGQgdmlzaWJpbGl0eVxuICAgICAgICAkKCcjU2VuZExvZ2luTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjU2VuZFN5c3RlbU5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBub3RpZmljYXRpb24gdHlwZXMgc2VjdGlvbiB2aXNpYmlsaXR5IGJhc2VkIG9uIE1haWxFbmFibGVOb3RpZmljYXRpb25zIHN0YXRlXG4gICAgICovXG4gICAgdG9nZ2xlTm90aWZpY2F0aW9uVHlwZXNTZWN0aW9uKCkge1xuICAgICAgICBjb25zdCBpc0VuYWJsZWQgPSAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgY29uc3QgJHNlY3Rpb24gPSAkKCcjbm90aWZpY2F0aW9uLXR5cGVzLXNlY3Rpb24nKTtcblxuICAgICAgICBpZiAoaXNFbmFibGVkKSB7XG4gICAgICAgICAgICAkc2VjdGlvbi5zbGlkZURvd24oMzAwKTtcbiAgICAgICAgICAgIC8vIEFsc28gdXBkYXRlIGluZGl2aWR1YWwgZW1haWwgZmllbGRzIHZpc2liaWxpdHkgYWZ0ZXIgc2VjdGlvbiBpcyBzaG93blxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVFbWFpbEZpZWxkc1Zpc2liaWxpdHkoKTtcbiAgICAgICAgICAgIH0sIDM1MCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2VjdGlvbi5zbGlkZVVwKDMwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGVtYWlsIGZpZWxkIHZpc2liaWxpdHkgYmFzZWQgb24gY2hlY2tib3ggc3RhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG9nZ2xlSWQgLSBJRCBvZiB0aGUgdG9nZ2xlIGNoZWNrYm94XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGVtYWlsRmllbGRJZCAtIElEIG9mIHRoZSBlbWFpbCBmaWVsZCB0byBzaG93L2hpZGVcbiAgICAgKi9cbiAgICB0b2dnbGVFbWFpbEZpZWxkKHRvZ2dsZUlkLCBlbWFpbEZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJChgIyR7dG9nZ2xlSWR9YCkuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgIGNvbnN0ICRlbWFpbEZpZWxkID0gJChgIyR7ZW1haWxGaWVsZElkfWApLmNsb3Nlc3QoJy5maWVsZCcpO1xuXG4gICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICRlbWFpbEZpZWxkLnNsaWRlRG93bigyMDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGVtYWlsRmllbGQuc2xpZGVVcCgyMDApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZW1haWwgZmllbGRzIHZpc2liaWxpdHkgYmFzZWQgb24gY3VycmVudCB0b2dnbGUgc3RhdGVzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUVtYWlsRmllbGRzVmlzaWJpbGl0eSgpIHtcbiAgICAgICAgLy8gRmlyc3QsIGNoZWNrIG1hc3RlciB0b2dnbGUgYW5kIHNob3cvaGlkZSB0aGUgZW50aXJlIG5vdGlmaWNhdGlvbiB0eXBlcyBzZWN0aW9uXG4gICAgICAgIGNvbnN0IGlzTm90aWZpY2F0aW9uc0VuYWJsZWQgPSAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgY29uc3QgJHNlY3Rpb24gPSAkKCcjbm90aWZpY2F0aW9uLXR5cGVzLXNlY3Rpb24nKTtcblxuICAgICAgICBpZiAoaXNOb3RpZmljYXRpb25zRW5hYmxlZCkge1xuICAgICAgICAgICAgJHNlY3Rpb24uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBObyBuZWVkIHRvIGNoZWNrIGluZGl2aWR1YWwgZmllbGRzIGlmIHNlY3Rpb24gaXMgaGlkZGVuXG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXAgb2YgdG9nZ2xlIElEcyB0byB0aGVpciBjb3JyZXNwb25kaW5nIGVtYWlsIGZpZWxkIElEc1xuICAgICAgICAvLyBOb3RlOiBTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwgaXMgYWx3YXlzIHZpc2libGUgYW5kIG5vdCBjb250cm9sbGVkIGJ5IGEgdG9nZ2xlXG4gICAgICAgIGNvbnN0IHRvZ2dsZUVtYWlsTWFwID0ge1xuICAgICAgICAgICAgJ1NlbmRNaXNzZWRDYWxsTm90aWZpY2F0aW9ucyc6ICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICAnU2VuZFZvaWNlbWFpbE5vdGlmaWNhdGlvbnMnOiAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNldCBpbml0aWFsIHZpc2liaWxpdHkgZm9yIGVhY2ggZW1haWwgZmllbGRcbiAgICAgICAgT2JqZWN0LmtleXModG9nZ2xlRW1haWxNYXApLmZvckVhY2godG9nZ2xlSWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgZW1haWxGaWVsZElkID0gdG9nZ2xlRW1haWxNYXBbdG9nZ2xlSWRdO1xuICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJChgIyR7dG9nZ2xlSWR9YCkuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICBjb25zdCAkZW1haWxGaWVsZCA9ICQoYCMke2VtYWlsRmllbGRJZH1gKS5jbG9zZXN0KCcuZmllbGQnKTtcblxuICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICRlbWFpbEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGVtYWlsRmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoIGF1dGggdHlwZSBjaGFuZ2UgaGFuZGxlclxuICAgICAqL1xuICAgIHJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyKCkge1xuICAgICAgICAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXScpLm9uKCdjaGFuZ2UubWFpbHNldHRpbmdzJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGF1dGhUeXBlID0gJChlLnRhcmdldCkudmFsKCk7XG4gICAgICAgICAgICAvLyBXaGVuIHVzZXIgbWFudWFsbHkgY2hhbmdlcyBhdXRoIHR5cGUsIGNoZWNrIE9BdXRoMiBzdGF0dXMgaWYgbmVlZGVkXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudG9nZ2xlQXV0aEZpZWxkcyhhdXRoVHlwZSk7XG4gICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyB3aGVuIGF1dGggdHlwZSBjaGFuZ2VzXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVmFsaWRhdGlvblJ1bGVzKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGF1dGhlbnRpY2F0aW9uIHR5cGUgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycygpIHtcbiAgICAgICAgLy8gQXR0YWNoIGluaXRpYWwgaGFuZGxlclxuICAgICAgICBtYWlsU2V0dGluZ3MucmVBdHRhY2hBdXRoVHlwZUhhbmRsZXIoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIG9uIHBhZ2UgbG9hZCAtIGRvbid0IGNoZWNrIE9BdXRoMiBzdGF0dXMgeWV0ICh3aWxsIGJlIGRvbmUgaW4gbG9hZERhdGEpXG4gICAgICAgIGNvbnN0IGN1cnJlbnRBdXRoVHlwZSA9ICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdOmNoZWNrZWQnKS52YWwoKSB8fCAncGFzc3dvcmQnO1xuICAgICAgICBtYWlsU2V0dGluZ3MudG9nZ2xlQXV0aEZpZWxkc1dpdGhvdXRTdGF0dXMoY3VycmVudEF1dGhUeXBlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGF1dGhlbnRpY2F0aW9uIGZpZWxkcyB3aXRob3V0IGNoZWNraW5nIE9BdXRoMiBzdGF0dXMgKGZvciBpbml0aWFsIHNldHVwKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhdXRoVHlwZSAtIEF1dGhlbnRpY2F0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB0b2dnbGVBdXRoRmllbGRzV2l0aG91dFN0YXR1cyhhdXRoVHlwZSkge1xuICAgICAgICBjb25zdCAkdXNlcm5hbWVGaWVsZCA9ICQoJyNNYWlsU01UUFVzZXJuYW1lJykuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgIGNvbnN0ICRwYXNzd29yZEZpZWxkID0gJCgnI01haWxTTVRQUGFzc3dvcmQnKS5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgY29uc3QgJG9hdXRoMlNlY3Rpb24gPSAkKCcjb2F1dGgyLWF1dGgtc2VjdGlvbicpO1xuXG4gICAgICAgIGlmIChhdXRoVHlwZSA9PT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgIC8vIEZvciBPQXV0aDI6IHNob3cgdXNlcm5hbWUgKHJlcXVpcmVkIGZvciBlbWFpbCBpZGVudGlmaWNhdGlvbiksIGhpZGUgcGFzc3dvcmRcbiAgICAgICAgICAgICR1c2VybmFtZUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICRwYXNzd29yZEZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICRvYXV0aDJTZWN0aW9uLnNob3coKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgcGFzc3dvcmQgZmllbGQgZXJyb3JzXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdNYWlsU01UUFBhc3N3b3JkJyk7XG4gICAgICAgICAgICAkcGFzc3dvcmRGaWVsZC5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBwYXNzd29yZCBhdXRoOiBzaG93IGJvdGggdXNlcm5hbWUgYW5kIHBhc3N3b3JkXG4gICAgICAgICAgICAkdXNlcm5hbWVGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAkcGFzc3dvcmRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAkb2F1dGgyU2VjdGlvbi5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIE9BdXRoMiBmaWVsZCBlcnJvcnNcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ01haWxPQXV0aDJQcm92aWRlcicpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnTWFpbE9BdXRoMkNsaWVudElkJyk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdNYWlsT0F1dGgyQ2xpZW50U2VjcmV0Jyk7XG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMkNsaWVudElkJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBhdXRoZW50aWNhdGlvbiBmaWVsZHMgYmFzZWQgb24gdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhdXRoVHlwZSAtIEF1dGhlbnRpY2F0aW9uIHR5cGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW3NldHRpbmdzXSAtIE9wdGlvbmFsIHNldHRpbmdzIGRhdGEgdG8gYXZvaWQgYWRkaXRpb25hbCBBUEkgY2FsbFxuICAgICAqL1xuICAgIHRvZ2dsZUF1dGhGaWVsZHMoYXV0aFR5cGUsIHNldHRpbmdzID0gbnVsbCkge1xuICAgICAgICAvLyBGaXJzdCB0b2dnbGUgZmllbGRzIHdpdGhvdXQgc3RhdHVzIGNoZWNrXG4gICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVBdXRoRmllbGRzV2l0aG91dFN0YXR1cyhhdXRoVHlwZSk7XG5cbiAgICAgICAgLy8gVGhlbiBjaGVjayBPQXV0aDIgc3RhdHVzIG9ubHkgaWYgbmVlZGVkXG4gICAgICAgIGlmIChhdXRoVHlwZSA9PT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgIGlmIChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBleGlzdGluZyBzZXR0aW5ncyBkYXRhIHRvIGF2b2lkIGR1cGxpY2F0ZSBBUEkgY2FsbFxuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVPQXV0aDJTdGF0dXMoc2V0dGluZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byBBUEkgY2FsbCBpZiBubyBzZXR0aW5ncyBwcm92aWRlZFxuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5jaGVja09BdXRoMlN0YXR1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGVzdCBidXR0b25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRlc3RCdXR0b25zKCkge1xuICAgICAgICAvLyBUZXN0IGNvbm5lY3Rpb24gYnV0dG9uXG4gICAgICAgICQoJyN0ZXN0LWNvbm5lY3Rpb24tYnV0dG9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgYnV0dG9uIGlzIGRpc2FibGVkIChoYXMgdW5zYXZlZCBjaGFuZ2VzKVxuICAgICAgICAgICAgaWYgKCQoZS5jdXJyZW50VGFyZ2V0KS5oYXNDbGFzcygnZGlzYWJsZWQnKSkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dXYXJuaW5nKGdsb2JhbFRyYW5zbGF0ZS5tc19TYXZlQ2hhbmdlc0JlZm9yZVRlc3RpbmcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRlc3RDb25uZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNlbmQgdGVzdCBlbWFpbCBidXR0b25cbiAgICAgICAgJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gaXMgZGlzYWJsZWQgKGhhcyB1bnNhdmVkIGNoYW5nZXMpXG4gICAgICAgICAgICBpZiAoJChlLmN1cnJlbnRUYXJnZXQpLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoZ2xvYmFsVHJhbnNsYXRlLm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3Muc2VuZFRlc3RFbWFpbCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGV0ZWN0IHByb3ZpZGVyIGZyb20gZW1haWwgYWRkcmVzc1xuICAgICAqL1xuICAgIGRldGVjdFByb3ZpZGVyRnJvbUVtYWlsKCkge1xuICAgICAgICAkKCcjTWFpbFNNVFBVc2VybmFtZScpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZW1haWwgPSAkKGUudGFyZ2V0KS52YWwoKTtcbiAgICAgICAgICAgIGlmICghZW1haWwpIHJldHVybjtcblxuICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSBNYWlsU2V0dGluZ3NBUEkuZGV0ZWN0UHJvdmlkZXIoZW1haWwpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcHJvdmlkZXIgZmllbGQgdXNpbmcgU2VtYW50aWMgVUkgZHJvcGRvd24gKFY1LjAgcGF0dGVybilcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXItZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgcHJvdmlkZXIpO1xuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlcicpLnZhbChwcm92aWRlcik7XG5cbiAgICAgICAgICAgIC8vIFNob3cgcmVjb21tZW5kYXRpb25zIGJhc2VkIG9uIHByb3ZpZGVyXG4gICAgICAgICAgICBpZiAocHJvdmlkZXIgPT09ICdnb29nbGUnKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnNob3dQcm92aWRlckhpbnQoJ0dtYWlsIGRldGVjdGVkLiBPQXV0aDIgYXV0aGVudGljYXRpb24gd2lsbCBiZSByZXF1aXJlZCBmcm9tIE1hcmNoIDIwMjUuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyID09PSAnbWljcm9zb2Z0Jykge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zaG93UHJvdmlkZXJIaW50KCdNaWNyb3NvZnQvT3V0bG9vayBkZXRlY3RlZC4gT0F1dGgyIGF1dGhlbnRpY2F0aW9uIHJlY29tbWVuZGVkLicpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm92aWRlciA9PT0gJ3lhbmRleCcpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Muc2hvd1Byb3ZpZGVySGludCgnWWFuZGV4IE1haWwgZGV0ZWN0ZWQuIEJvdGggcGFzc3dvcmQgYW5kIE9BdXRoMiBhdXRoZW50aWNhdGlvbiBzdXBwb3J0ZWQuJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEF1dG8tZmlsbCBTTVRQIHNldHRpbmdzIGJhc2VkIG9uIHByb3ZpZGVyXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuYXV0b0ZpbGxTTVRQU2V0dGluZ3MocHJvdmlkZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE1haWxTTVRQVXNlcm5hbWUgcGxhY2Vob2xkZXIgd2l0aCBNYWlsU01UUFNlbmRlckFkZHJlc3MgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VuZGVyQWRkcmVzcyAtIEVtYWlsIGFkZHJlc3MgZnJvbSBNYWlsU01UUFNlbmRlckFkZHJlc3MgZmllbGRcbiAgICAgKi9cbiAgICB1cGRhdGVVc2VybmFtZVBsYWNlaG9sZGVyKHNlbmRlckFkZHJlc3MpIHtcbiAgICAgICAgY29uc3QgJHVzZXJuYW1lRmllbGQgPSAkKCcjTWFpbFNNVFBVc2VybmFtZScpO1xuICAgICAgICBpZiAoc2VuZGVyQWRkcmVzcyAmJiBzZW5kZXJBZGRyZXNzLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgICR1c2VybmFtZUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgc2VuZGVyQWRkcmVzcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkdXNlcm5hbWVGaWVsZC5yZW1vdmVBdHRyKCdwbGFjZWhvbGRlcicpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgTWFpbFNNVFBTZW5kZXJBZGRyZXNzIGNoYW5nZSBoYW5kbGVyIHRvIHVwZGF0ZSB1c2VybmFtZSBwbGFjZWhvbGRlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVTZW5kZXJBZGRyZXNzSGFuZGxlcigpIHtcbiAgICAgICAgJCgnI01haWxTTVRQU2VuZGVyQWRkcmVzcycpLm9uKCdpbnB1dCBjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2VuZGVyQWRkcmVzcyA9ICQoZS50YXJnZXQpLnZhbCgpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVVzZXJuYW1lUGxhY2Vob2xkZXIoc2VuZGVyQWRkcmVzcyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdXRvLWZpbGwgU01UUCBzZXR0aW5ncyBiYXNlZCBvbiBwcm92aWRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlciAtIEVtYWlsIHByb3ZpZGVyXG4gICAgICovXG4gICAgYXV0b0ZpbGxTTVRQU2V0dGluZ3MocHJvdmlkZXIpIHtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBnb29nbGU6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC5nbWFpbC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIHRsczogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1pY3Jvc29mdDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLm9mZmljZTM2NS5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIHRsczogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHlhbmRleDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLnlhbmRleC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc0NjUnLFxuICAgICAgICAgICAgICAgIHRsczogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc2V0dGluZ3NbcHJvdmlkZXJdKSB7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlclNldHRpbmdzID0gc2V0dGluZ3NbcHJvdmlkZXJdO1xuXG4gICAgICAgICAgICAvLyBPbmx5IGZpbGwgaWYgZmllbGRzIGFyZSBlbXB0eVxuICAgICAgICAgICAgaWYgKCEkKCcjTWFpbFNNVFBIb3N0JykudmFsKCkpIHtcbiAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBIb3N0JykudmFsKHByb3ZpZGVyU2V0dGluZ3MuaG9zdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoISQoJyNNYWlsU01UUFBvcnQnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUFBvcnQnKS52YWwocHJvdmlkZXJTZXR0aW5ncy5wb3J0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGVuY3J5cHRpb24gZHJvcGRvd25cbiAgICAgICAgICAgIGNvbnN0ICRlbmNyeXB0aW9uRHJvcGRvd24gPSAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZW5jcnlwdGlvbkRyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBzZXR0aW5ncyBmb3IgZW5jcnlwdGlvblxuICAgICAgICAgICAgICAgIGxldCBlbmNyeXB0aW9uVmFsdWUgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyU2V0dGluZ3MucG9ydCA9PT0gJzU4NycpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ3Rscyc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm92aWRlclNldHRpbmdzLnBvcnQgPT09ICc0NjUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGVuY3J5cHRpb25WYWx1ZSA9ICdzc2wnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkZW5jcnlwdGlvbkRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBlbmNyeXB0aW9uVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBTTVRQIHNldHRpbmdzIHdoZW4gT0F1dGgyIHByb3ZpZGVyIGlzIHNlbGVjdGVkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyIC0gU2VsZWN0ZWQgT0F1dGgyIHByb3ZpZGVyIChnb29nbGUsIG1pY3Jvc29mdCwgeWFuZGV4KVxuICAgICAqL1xuICAgIHVwZGF0ZVNNVFBTZXR0aW5nc0ZvclByb3ZpZGVyKHByb3ZpZGVyKSB7XG4gICAgICAgIC8vIERvbid0IGF1dG8tZmlsbCB1bnRpbCBpbml0aWFsIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIGlmICghbWFpbFNldHRpbmdzLmRhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIE9BdXRoMiBhdXRoIHR5cGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgY29uc3QgYXV0aFR5cGUgPSAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXTpjaGVja2VkJykudmFsKCk7XG4gICAgICAgIGlmIChhdXRoVHlwZSAhPT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmluZSBwcm92aWRlciBTTVRQIHNldHRpbmdzXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBnb29nbGU6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC5nbWFpbC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIGVuY3J5cHRpb246ICd0bHMnLFxuICAgICAgICAgICAgICAgIGNlcnRDaGVjazogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1pY3Jvc29mdDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLW1haWwub3V0bG9vay5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIGVuY3J5cHRpb246ICd0bHMnLFxuICAgICAgICAgICAgICAgIGNlcnRDaGVjazogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHlhbmRleDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLnlhbmRleC5ydScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgZW5jcnlwdGlvbjogJ3RscycsXG4gICAgICAgICAgICAgICAgY2VydENoZWNrOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBwcm92aWRlclNldHRpbmdzW3Byb3ZpZGVyXTtcbiAgICAgICAgaWYgKCFzZXR0aW5ncykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGhvc3RcbiAgICAgICAgJCgnI01haWxTTVRQSG9zdCcpLnZhbChzZXR0aW5ncy5ob3N0KTtcblxuICAgICAgICAvLyBVcGRhdGUgcG9ydFxuICAgICAgICAkKCcjTWFpbFNNVFBQb3J0JykudmFsKHNldHRpbmdzLnBvcnQpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBlbmNyeXB0aW9uIHR5cGVcbiAgICAgICAgJCgnI01haWxTTVRQVXNlVExTJykudmFsKHNldHRpbmdzLmVuY3J5cHRpb24pO1xuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2V0dGluZ3MuZW5jcnlwdGlvbik7XG5cbiAgICAgICAgLy8gVXBkYXRlIGNlcnRpZmljYXRlIGNoZWNrXG4gICAgICAgIGlmIChzZXR0aW5ncy5jZXJ0Q2hlY2spIHtcbiAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwb3J0IGJhc2VkIG9uIHNlbGVjdGVkIGVuY3J5cHRpb24gdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBlbmNyeXB0aW9uVHlwZSAtIFNlbGVjdGVkIGVuY3J5cHRpb24gdHlwZSAobm9uZS90bHMvc3NsKVxuICAgICAqL1xuICAgIHVwZGF0ZVBvcnRCYXNlZE9uRW5jcnlwdGlvbihlbmNyeXB0aW9uVHlwZSkge1xuICAgICAgICBjb25zdCAkcG9ydEZpZWxkID0gJCgnI01haWxTTVRQUG9ydCcpO1xuXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHRoZSB1c2VyIGhhc24ndCBtYW51YWxseSBjaGFuZ2VkIHRoZSBwb3J0XG4gICAgICAgIGNvbnN0IGN1cnJlbnRQb3J0ID0gJHBvcnRGaWVsZC52YWwoKTtcbiAgICAgICAgY29uc3Qgc3RhbmRhcmRQb3J0cyA9IFsnMjUnLCAnNTg3JywgJzQ2NScsICcnXTtcblxuICAgICAgICBpZiAoc3RhbmRhcmRQb3J0cy5pbmNsdWRlcyhjdXJyZW50UG9ydCkpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoZW5jcnlwdGlvblR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgICAgICAgICAgJHBvcnRGaWVsZC52YWwoJzI1Jyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Rscyc6XG4gICAgICAgICAgICAgICAgICAgICRwb3J0RmllbGQudmFsKCc1ODcnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnc3NsJzpcbiAgICAgICAgICAgICAgICAgICAgJHBvcnRGaWVsZC52YWwoJzQ2NScpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cvaGlkZSBjZXJ0aWZpY2F0ZSBjaGVjayBiYXNlZCBvbiBlbmNyeXB0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgJGNlcnRDaGVja0ZpZWxkID0gJCgnI2NlcnQtY2hlY2stZmllbGQnKTtcbiAgICAgICAgaWYgKGVuY3J5cHRpb25UeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIC8vIEhpZGUgY2VydGlmaWNhdGUgY2hlY2sgZm9yIHVuZW5jcnlwdGVkIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAkY2VydENoZWNrRmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgLy8gVW5jaGVjayB0aGUgY2VydGlmaWNhdGUgY2hlY2sgd2hlbiBoaWRpbmdcbiAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGNlcnRpZmljYXRlIGNoZWNrIGZvciBUTFMvU1NMIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAkY2VydENoZWNrRmllbGQuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgcHJvdmlkZXIgaGludCBtZXNzYWdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBIaW50IG1lc3NhZ2VcbiAgICAgKi9cbiAgICBzaG93UHJvdmlkZXJIaW50KG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgJGhpbnQgPSAkKCcjcHJvdmlkZXItaGludCcpO1xuICAgICAgICBpZiAoJGhpbnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkKCcjTWFpbFNNVFBVc2VybmFtZScpLmFmdGVyKGA8ZGl2IGlkPVwicHJvdmlkZXItaGludFwiIGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlXCI+JHttZXNzYWdlfTwvZGl2PmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGhpbnQudGV4dChtZXNzYWdlKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIE9BdXRoMiBjYWxsYmFjayBwYXJhbWV0ZXJzIGZyb20gVVJMXG4gICAgICovXG4gICAgaGFuZGxlT0F1dGgyQ2FsbGJhY2soKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIHN1Y2Nlc3NcbiAgICAgICAgaWYgKHVybFBhcmFtcy5oYXMoJ29hdXRoX3N1Y2Nlc3MnKSkge1xuICAgICAgICAgICAgLy8gUmVsb2FkIHNldHRpbmdzIHRvIHNob3cgdXBkYXRlZCBPQXV0aDIgc3RhdHVzXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MubG9hZFNldHRpbmdzRnJvbUFQSSgpO1xuICAgICAgICAgICAgLy8gQ2xlYW4gVVJMXG4gICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIGRvY3VtZW50LnRpdGxlLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGVycm9yXG4gICAgICAgIGlmICh1cmxQYXJhbXMuaGFzKCdvYXV0aF9lcnJvcicpKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvciA9IHVybFBhcmFtcy5nZXQoJ29hdXRoX2Vycm9yJyk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoXG4gICAgICAgICAgICAgICAgKGdsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJBdXRob3JpemF0aW9uRmFpbGVkIHx8ICfQntGI0LjQsdC60LAgT0F1dGgyINCw0LLRgtC+0YDQuNC30LDRhtC40Lg6ICcpICsgZGVjb2RlVVJJQ29tcG9uZW50KGVycm9yKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIENsZWFuIFVSTFxuICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCBkb2N1bWVudC50aXRsZSwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydCBPQXV0aDIgYXV0aG9yaXphdGlvbiBmbG93XG4gICAgICovXG4gICAgc3RhcnRPQXV0aDJGbG93KCkge1xuICAgICAgICBjb25zdCBwcm92aWRlciA9ICQoJyNNYWlsT0F1dGgyUHJvdmlkZXInKS52YWwoKSB8fCAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGlmICghcHJvdmlkZXIgfHwgcHJvdmlkZXIgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlT0F1dGgyUHJvdmlkZXJFbXB0eSB8fCAn0JLRi9Cx0LXRgNC40YLQtSBPQXV0aDIg0L/RgNC+0LLQsNC50LTQtdGA0LAnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIENsaWVudCBJRCBhbmQgU2VjcmV0IGFyZSBjb25maWd1cmVkXG4gICAgICAgIGNvbnN0IGNsaWVudElkID0gJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLnZhbCgpO1xuICAgICAgICBjb25zdCBjbGllbnRTZWNyZXQgPSAkKCcjTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpLnZhbCgpO1xuXG4gICAgICAgIGlmICghY2xpZW50SWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVPQXV0aDJDbGllbnRJZEVtcHR5IHx8ICfQktCy0LXQtNC40YLQtSBDbGllbnQgSUQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY2xpZW50U2VjcmV0KSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50U2VjcmV0RW1wdHkgfHwgJ9CS0LLQtdC00LjRgtC1IENsaWVudCBTZWNyZXQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzIGJlZm9yZSBzdGFydGluZyB0aGUgZmxvd1xuICAgICAgICBtYWlsU2V0dGluZ3Muc2F2ZU9BdXRoMkNyZWRlbnRpYWxzKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlIE9BdXRoMiBjcmVkZW50aWFscyBhbmQgdGhlbiBzdGFydCBhdXRob3JpemF0aW9uIGZsb3dcbiAgICAgKi9cbiAgICBzYXZlT0F1dGgyQ3JlZGVudGlhbHMocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgIE1haWxPQXV0aDJQcm92aWRlcjogcHJvdmlkZXIsXG4gICAgICAgICAgICBNYWlsT0F1dGgyQ2xpZW50SWQ6IGNsaWVudElkLFxuICAgICAgICAgICAgTWFpbE9BdXRoMkNsaWVudFNlY3JldDogY2xpZW50U2VjcmV0XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXNlIE1haWxTZXR0aW5nc0FQSSBmb3IgY29uc2lzdGVudCBlcnJvciBoYW5kbGluZ1xuICAgICAgICBNYWlsU2V0dGluZ3NBUEkucGF0Y2hTZXR0aW5ncyhkYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVkZW50aWFscyBzYXZlZCwgbm93IGdldCBPQXV0aDIgVVJMXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnByb2NlZWRXaXRoT0F1dGgyRmxvdyhwcm92aWRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNYWlsU2V0dGluZ3NdIEZhaWxlZCB0byBzYXZlIE9BdXRoMiBjcmVkZW50aWFsczonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgPyByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpXG4gICAgICAgICAgICAgICAgICAgIDogJ0ZhaWxlZCB0byBzYXZlIE9BdXRoMiBjcmVkZW50aWFscyc7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IE9BdXRoMiBhdXRob3JpemF0aW9uIFVSTCBhbmQgb3BlbiBhdXRob3JpemF0aW9uIHdpbmRvd1xuICAgICAqL1xuICAgIHJlcXVlc3RPQXV0aDJBdXRoVXJsKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0KSB7XG4gICAgICAgIC8vIFJlcXVlc3QgYXV0aG9yaXphdGlvbiBVUkwgZnJvbSBBUElcbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLmF1dGhvcml6ZU9BdXRoMihwcm92aWRlciwgY2xpZW50SWQsIGNsaWVudFNlY3JldCwgKGF1dGhVcmwpID0+IHtcblxuICAgICAgICAgICAgaWYgKGF1dGhVcmwpIHtcbiAgICAgICAgICAgICAgICAvLyBPcGVuIGF1dGhvcml6YXRpb24gd2luZG93XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSA2MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gNzAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSAoc2NyZWVuLndpZHRoIC8gMikgLSAod2lkdGggLyAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSAoc2NyZWVuLmhlaWdodCAvIDIpIC0gKGhlaWdodCAvIDIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYXV0aFdpbmRvdyA9IHdpbmRvdy5vcGVuKFxuICAgICAgICAgICAgICAgICAgICBhdXRoVXJsLFxuICAgICAgICAgICAgICAgICAgICAnb2F1dGgyLWF1dGgnLFxuICAgICAgICAgICAgICAgICAgICBgd2lkdGg9JHt3aWR0aH0saGVpZ2h0PSR7aGVpZ2h0fSxsZWZ0PSR7bGVmdH0sdG9wPSR7dG9wfWBcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFhdXRoV2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignUGxlYXNlIGFsbG93IHBvcHVwcyBmb3IgT0F1dGgyIGF1dGhvcml6YXRpb24nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyQXV0aG9yaXphdGlvbkZhaWxlZCB8fCAn0J7RiNC40LHQutCwINCw0LLRgtC+0YDQuNC30LDRhtC40LggT0F1dGgyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcm9jZWVkIHdpdGggT0F1dGgyIGZsb3cgYWZ0ZXIgY3JlZGVudGlhbHMgYXJlIHNhdmVkXG4gICAgICovXG4gICAgcHJvY2VlZFdpdGhPQXV0aDJGbG93KHByb3ZpZGVyKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEdldCBPQXV0aDIgVVJMIHdpdGggc2F2ZWQgY3JlZGVudGlhbHNcbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLmdldE9BdXRoMlVybChwcm92aWRlciwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuYXV0aF91cmwpIHtcblxuICAgICAgICAgICAgICAgIC8vIE9wZW4gT0F1dGgyIHdpbmRvd1xuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gNjAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IDcwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBsZWZ0ID0gKHNjcmVlbi53aWR0aCAvIDIpIC0gKHdpZHRoIC8gMik7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9wID0gKHNjcmVlbi5oZWlnaHQgLyAyKSAtIChoZWlnaHQgLyAyKTtcblxuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cgPSB3aW5kb3cub3BlbihcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuYXV0aF91cmwsXG4gICAgICAgICAgICAgICAgICAgICdPQXV0aDJBdXRob3JpemF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgYHdpZHRoPSR7d2lkdGh9LGhlaWdodD0ke2hlaWdodH0sbGVmdD0ke2xlZnR9LHRvcD0ke3RvcH1gXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHdpbmRvdyB3YXMgYmxvY2tlZFxuICAgICAgICAgICAgICAgIGlmICghbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ1BsZWFzZSBhbGxvdyBwb3B1cHMgZm9yIE9BdXRoMiBhdXRob3JpemF0aW9uJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTWFpbFNldHRpbmdzXSBObyBhdXRoX3VybCBpbiByZXNwb25zZTonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdGYWlsZWQgdG8gZ2V0IE9BdXRoMiBhdXRob3JpemF0aW9uIFVSTCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIE9BdXRoMiBjYWxsYmFjayBtZXNzYWdlXG4gICAgICogQHBhcmFtIHtNZXNzYWdlRXZlbnR9IGV2ZW50IC0gTWVzc2FnZSBldmVudFxuICAgICAqL1xuICAgIGhhbmRsZU9BdXRoMk1lc3NhZ2UoZXZlbnQpIHtcbiAgICAgICAgLy8gVmFsaWRhdGUgb3JpZ2luXG4gICAgICAgIGlmIChldmVudC5vcmlnaW4gIT09IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGZvciBPQXV0aDIgY2FsbGJhY2sgZGF0YVxuICAgICAgICBpZiAoZXZlbnQuZGF0YSAmJiBldmVudC5kYXRhLnR5cGUgPT09ICdvYXV0aDItY2FsbGJhY2snKSB7XG4gICAgICAgICAgICAvLyBDbG9zZSBPQXV0aDIgd2luZG93XG4gICAgICAgICAgICBpZiAobWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdykge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93ID0gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUHJvY2VzcyBjYWxsYmFja1xuICAgICAgICAgICAgTWFpbFNldHRpbmdzQVBJLmhhbmRsZU9BdXRoMkNhbGxiYWNrKGV2ZW50LmRhdGEucGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbignT0F1dGgyIGF1dGhvcml6YXRpb24gc3VjY2Vzc2Z1bCcpO1xuICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuY2hlY2tPQXV0aDJTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ09BdXRoMiBhdXRob3JpemF0aW9uIGZhaWxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBPQXV0aDIgc3RhdHVzIGRpc3BsYXkgdXNpbmcgcHJvdmlkZWQgc2V0dGluZ3MgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGEgY29udGFpbmluZyBvYXV0aDJfc3RhdHVzXG4gICAgICovXG4gICAgdXBkYXRlT0F1dGgyU3RhdHVzKHNldHRpbmdzKSB7XG4gICAgICAgIGlmIChzZXR0aW5ncyAmJiBzZXR0aW5ncy5vYXV0aDJfc3RhdHVzKSB7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBzZXR0aW5ncy5vYXV0aDJfc3RhdHVzO1xuICAgICAgICAgICAgY29uc3QgJHN0YXR1c0RpdiA9ICQoJyNvYXV0aDItc3RhdHVzJyk7XG4gICAgICAgICAgICBjb25zdCAkY2xpZW50SWRGaWVsZCA9ICQoJyNNYWlsT0F1dGgyQ2xpZW50SWQnKS5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0ICRjbGllbnRTZWNyZXRGaWVsZCA9ICQoJyNNYWlsT0F1dGgyQ2xpZW50U2VjcmV0JykuY2xvc2VzdCgnLmZpZWxkJyk7XG5cbiAgICAgICAgICAgIGlmIChzdGF0dXMuY29uZmlndXJlZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyTmFtZSA9IE1haWxTZXR0aW5nc0FQSS5nZXRQcm92aWRlck5hbWUoc3RhdHVzLnByb3ZpZGVyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb25uZWN0ZWRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMkNvbm5lY3RlZFRvLnJlcGxhY2UoJ3twcm92aWRlcn0nLCBwcm92aWRlck5hbWUpO1xuXG4gICAgICAgICAgICAgICAgLy8gRG9uJ3QgYWRkIGV4dHJhIHN0YXR1cyB0ZXh0IC0gXCJDb25uZWN0ZWRcIiBhbHJlYWR5IGltcGxpZXMgYXV0aG9yaXplZFxuICAgICAgICAgICAgICAgICRzdGF0dXNEaXYuaHRtbChgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNoZWNrIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtjb25uZWN0ZWRUZXh0fVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJCgnI29hdXRoMi1kaXNjb25uZWN0Jykuc2hvdygpO1xuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBDbGllbnQgSUQgYW5kIENsaWVudCBTZWNyZXQgZmllbGRzIHdoZW4gYXV0aG9yaXplZFxuICAgICAgICAgICAgICAgIGlmIChzdGF0dXMuYXV0aG9yaXplZCkge1xuICAgICAgICAgICAgICAgICAgICAkY2xpZW50SWRGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRTZWNyZXRGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGNsaWVudElkRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkY2xpZW50U2VjcmV0RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXR1c0Rpdi5odG1sKGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyTm90Q29uZmlndXJlZH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgJCgnI29hdXRoMi1jb25uZWN0Jykuc2hvdygpO1xuICAgICAgICAgICAgICAgICQoJyNvYXV0aDItZGlzY29ubmVjdCcpLmhpZGUoKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgQ2xpZW50IElEIGFuZCBDbGllbnQgU2VjcmV0IGZpZWxkcyB3aGVuIG5vdCBhdXRob3JpemVkXG4gICAgICAgICAgICAgICAgJGNsaWVudElkRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjbGllbnRTZWNyZXRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgT0F1dGgyIGNvbm5lY3Rpb24gc3RhdHVzIChtYWtlcyBBUEkgY2FsbClcbiAgICAgKi9cbiAgICBjaGVja09BdXRoMlN0YXR1cygpIHtcbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLmdldFNldHRpbmdzKChzZXR0aW5ncykgPT4ge1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZU9BdXRoMlN0YXR1cyhzZXR0aW5ncyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNjb25uZWN0IE9BdXRoMlxuICAgICAqL1xuICAgIGRpc2Nvbm5lY3RPQXV0aDIoKSB7XG4gICAgICAgIC8vIENsZWFyIE9BdXRoMiB0b2tlbnMgaW1tZWRpYXRlbHkgd2l0aG91dCBjb25maXJtYXRpb25cbiAgICAgICAgY29uc3QgY2xlYXJEYXRhID0ge1xuICAgICAgICAgICAgTWFpbE9BdXRoMlJlZnJlc2hUb2tlbjogJycsXG4gICAgICAgICAgICBNYWlsT0F1dGgyQWNjZXNzVG9rZW46ICcnLFxuICAgICAgICAgICAgTWFpbE9BdXRoMlRva2VuRXhwaXJlczogJydcbiAgICAgICAgfTtcblxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkucGF0Y2hTZXR0aW5ncyhjbGVhckRhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIEp1c3QgdXBkYXRlIHRoZSBzdGF0dXMgd2l0aG91dCBzaG93aW5nIGEgbWVzc2FnZVxuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5jaGVja09BdXRoMlN0YXR1cygpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIENsaWVudCBJRCBhbmQgQ2xpZW50IFNlY3JldCBmaWVsZHMgYWdhaW5cbiAgICAgICAgICAgICAgICAkKCcjTWFpbE9BdXRoMkNsaWVudElkJykuY2xvc2VzdCgnLmZpZWxkJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50U2VjcmV0JykuY2xvc2VzdCgnLmZpZWxkJykuc2hvdygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ0ZhaWxlZCB0byBkaXNjb25uZWN0IE9BdXRoMicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGVzdCBTTVRQIGNvbm5lY3Rpb25cbiAgICAgKi9cbiAgICB0ZXN0Q29ubmVjdGlvbigpIHtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJyN0ZXN0LWNvbm5lY3Rpb24tYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRyZXN1bHRBcmVhID0gJCgnI3Rlc3QtY29ubmVjdGlvbi1yZXN1bHQnKTtcblxuICAgICAgICAvLyBDbGVhciBwcmV2aW91cyByZXN1bHRcbiAgICAgICAgJHJlc3VsdEFyZWEucmVtb3ZlKCk7XG5cbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS50ZXN0Q29ubmVjdGlvbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHJlc3VsdCBhcmVhIG5leHQgdG8gYnV0dG9uXG4gICAgICAgICAgICBsZXQgJHJlc3VsdCA9ICQoJzxkaXYgaWQ9XCJ0ZXN0LWNvbm5lY3Rpb24tcmVzdWx0XCIgY2xhc3M9XCJ1aSBzbWFsbCBtZXNzYWdlXCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAkYnV0dG9uLnBhcmVudCgpLmFwcGVuZCgkcmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICRyZXN1bHQuYWRkQ2xhc3MoJ3Bvc2l0aXZlJykuaHRtbCgnPGkgY2xhc3M9XCJjaGVjayBjaXJjbGUgaWNvblwiPjwvaT4gJyArIChyZXNwb25zZS5tZXNzYWdlcz8uc3VjY2Vzcz8uWzBdIHx8ICdDb25uZWN0aW9uIHN1Y2Nlc3NmdWwnKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGRpYWdub3N0aWNzIGluZm8gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGE/LmRpYWdub3N0aWNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpYWcgPSByZXNwb25zZS5kYXRhLmRpYWdub3N0aWNzO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGV0YWlscyA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjxzbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGBBdXRoOiAke2RpYWcuYXV0aF90eXBlfSwgU2VydmVyOiAke2RpYWcuc210cF9ob3N0fToke2RpYWcuc210cF9wb3J0fSwgRW5jcnlwdGlvbjogJHtkaWFnLnNtdHBfZW5jcnlwdGlvbn1gO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlhZy5hdXRoX3R5cGUgPT09ICdvYXV0aDInICYmIGRpYWcub2F1dGgyX3Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGA8YnI+T0F1dGgyOiAke2RpYWcub2F1dGgyX3Byb3ZpZGVyfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEb24ndCBzaG93IGV4cGlyZWQgdG9rZW4gd2FybmluZyBpZiBjb25uZWN0aW9uIGlzIHN1Y2Nlc3NmdWxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzIGl0IG1lYW5zIHJlZnJlc2ggdG9rZW4gaXMgd29ya2luZyBjb3JyZWN0bHlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaWFnLm9hdXRoMl9yZWZyZXNoX3Rva2VuX2V4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCAtICR7Z2xvYmFsVHJhbnNsYXRlLm1zX0RpYWdub3N0aWNBdXRob3JpemVkfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSAnPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgc2ltcGxlLCB1c2VyLWZyaWVuZGx5IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBsZXQgbWFpbk1lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY0Nvbm5lY3Rpb25GYWlsZWQ7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgZGV0YWlsZWQgZXJyb3IgYW5hbHlzaXMgaWYgYXZhaWxhYmxlIGZvciBiZXR0ZXIgdXNlciBleHBlcmllbmNlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5lcnJvcl9kZXRhaWxzPy5wcm9iYWJsZV9jYXVzZSkge1xuICAgICAgICAgICAgICAgICAgICBtYWluTWVzc2FnZSA9IHJlc3BvbnNlLmRhdGEuZXJyb3JfZGV0YWlscy5wcm9iYWJsZV9jYXVzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkcmVzdWx0LmFkZENsYXNzKCduZWdhdGl2ZScpLmh0bWwoJzxpIGNsYXNzPVwidGltZXMgY2lyY2xlIGljb25cIj48L2k+ICcgKyBtYWluTWVzc2FnZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTa2lwIHNob3dpbmcgZXJyb3IgdHlwZSBsYWJlbCAtIGl0J3MgdG9vIHRlY2huaWNhbCBmb3IgbW9zdCB1c2Vyc1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyByYXcgUEhQTWFpbGVyIGVycm9yIGluIGEgY29sbGFwc2libGUgc2VjdGlvbiBvbmx5IGlmIGl0J3Mgc2lnbmlmaWNhbnRseSBkaWZmZXJlbnRcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmVycm9yX2RldGFpbHM/LnJhd19lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByYXdFcnJvciA9IHJlc3BvbnNlLmRhdGEuZXJyb3JfZGV0YWlscy5yYXdfZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgc2hvdyB0ZWNobmljYWwgZGV0YWlscyBpZiB0aGV5IGNvbnRhaW4gbW9yZSBpbmZvIHRoYW4gdGhlIHVzZXIgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmF3RXJyb3IubGVuZ3RoID4gbWFpbk1lc3NhZ2UubGVuZ3RoICsgNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzSHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBhY2NvcmRpb25cIiBzdHlsZT1cIm1hcmdpbi10b3A6IDEwcHg7XCI+JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8ZGl2IGNsYXNzPVwidGl0bGVcIj48aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY1RlY2huaWNhbERldGFpbHN9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8ZGl2IGNsYXNzPVwiY29udGVudFwiPjxjb2RlIHN0eWxlPVwiZm9udC1zaXplOiAxMXB4OyB3b3JkLWJyZWFrOiBicmVhay1hbGw7IGRpc3BsYXk6IGJsb2NrOyB3aGl0ZS1zcGFjZTogcHJlLXdyYXA7XCI+JHtyYXdFcnJvcn08L2NvZGU+PC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlsc0h0bWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGFjY29yZGlvbiBmb3IgdGVjaG5pY2FsIGRldGFpbHNcbiAgICAgICAgICAgICAgICAgICAgICAgICRyZXN1bHQuZmluZCgnLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBtaW5pbWFsIGRpYWdub3N0aWNzIGluZm8gZm9yIGZhaWxlZCBjb25uZWN0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uZGlhZ25vc3RpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlhZyA9IHJlc3BvbnNlLmRhdGEuZGlhZ25vc3RpY3M7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHNtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCR7ZGlhZy5hdXRoX3R5cGUudG9VcHBlckNhc2UoKX06ICR7ZGlhZy5zbXRwX2hvc3R9OiR7ZGlhZy5zbXRwX3BvcnR9YDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcuc210cF9lbmNyeXB0aW9uICYmIGRpYWcuc210cF9lbmNyeXB0aW9uICE9PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCAoJHtkaWFnLnNtdHBfZW5jcnlwdGlvbi50b1VwcGVyQ2FzZSgpfSlgO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gJzwvc21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlscyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBoaW50cyBpZiBhdmFpbGFibGUgLSBsaW1pdCB0byB0b3AgMyBtb3N0IHJlbGV2YW50IG9uZXNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmhpbnRzICYmIHJlc3BvbnNlLmRhdGEuaGludHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgaGludHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c3Ryb25nPtCg0LXQutC+0LzQtdC90LTQsNGG0LjQuDo8L3N0cm9uZz48dWw+JztcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBtYXggMyBoaW50cyB0byBhdm9pZCBvdmVyd2hlbG1pbmcgdGhlIHVzZXJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsZXZhbnRIaW50cyA9IHJlc3BvbnNlLmRhdGEuaGludHMuc2xpY2UoMCwgMyk7XG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW50SGludHMuZm9yRWFjaChoaW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgRW5nbGlzaCBoaW50cyBpZiB3ZSBoYXZlIFJ1c3NpYW4gb25lc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhpbnQuaW5jbHVkZXMoJ09BdXRoMiBhY2Nlc3MgdG9rZW4gZXhwaXJlZCcpICYmIHJlbGV2YW50SGludHMuc29tZShoID0+IGguaW5jbHVkZXMoJ9GC0L7QutC10L0nKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBoaW50cyArPSBgPGxpPiR7aGludH08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBoaW50cyArPSAnPC91bD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChoaW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMzAgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5mYWRlT3V0KDQwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAzMDAwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIHRlc3QgZW1haWxcbiAgICAgKi9cbiAgICBzZW5kVGVzdEVtYWlsKCkge1xuICAgICAgICBjb25zdCByZWNpcGllbnQgPSAkKCcjU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJykudmFsKCk7XG5cbiAgICAgICAgaWYgKCFyZWNpcGllbnQpIHtcbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbmV4dCB0byBidXR0b25cbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjc2VuZC10ZXN0LWVtYWlsLWJ1dHRvbicpO1xuICAgICAgICAgICAgbGV0ICRyZXN1bHQgPSAkKCc8ZGl2IGlkPVwic2VuZC10ZXN0LXJlc3VsdFwiIGNsYXNzPVwidWkgc21hbGwgbmVnYXRpdmUgbWVzc2FnZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgJHJlc3VsdC5odG1sKCc8aSBjbGFzcz1cInRpbWVzIGNpcmNsZSBpY29uXCI+PC9pPiBQbGVhc2UgZW50ZXIgYSByZWNpcGllbnQgZW1haWwgYWRkcmVzcycpO1xuICAgICAgICAgICAgJCgnI3NlbmQtdGVzdC1yZXN1bHQnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICRidXR0b24ucGFyZW50KCkuYXBwZW5kKCRyZXN1bHQpO1xuXG4gICAgICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMTAgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5mYWRlT3V0KDQwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAxMDAwMCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHJlc3VsdEFyZWEgPSAkKCcjc2VuZC10ZXN0LXJlc3VsdCcpO1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHJlc3VsdFxuICAgICAgICAkcmVzdWx0QXJlYS5yZW1vdmUoKTtcblxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgIHRvOiByZWNpcGllbnRcbiAgICAgICAgICAgIC8vIExldCB0aGUgc2VydmVyIGdlbmVyYXRlIGVuaGFuY2VkIGVtYWlsIGNvbnRlbnQgd2l0aCBzeXN0ZW0gaW5mb1xuICAgICAgICB9O1xuXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5zZW5kVGVzdEVtYWlsKGRhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgcmVzdWx0IGFyZWEgbmV4dCB0byBidXR0b25cbiAgICAgICAgICAgIGxldCAkcmVzdWx0ID0gJCgnPGRpdiBpZD1cInNlbmQtdGVzdC1yZXN1bHRcIiBjbGFzcz1cInVpIHNtYWxsIG1lc3NhZ2VcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRidXR0b24ucGFyZW50KCkuYXBwZW5kKCRyZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSBhY3R1YWwgcmVjaXBpZW50IGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWxSZWNpcGllbnQgPSByZXNwb25zZS5kYXRhPy50byB8fCByZWNpcGllbnQ7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgdGhlIG1lc3NhZ2UgZnJvbSBBUEkgd2hpY2ggYWxyZWFkeSBpbmNsdWRlcyB0aGUgZW1haWwgYWRkcmVzc1xuICAgICAgICAgICAgICAgIGxldCBzdWNjZXNzTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzPy5zdWNjZXNzPy5bMF0gfHwgJ1Rlc3QgZW1haWwgc2VudCc7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiBtZXNzYWdlIGRvZXNuJ3QgaW5jbHVkZSBlbWFpbCBidXQgd2UgaGF2ZSBpdCwgYWRkIGl0XG4gICAgICAgICAgICAgICAgaWYgKCFzdWNjZXNzTWVzc2FnZS5pbmNsdWRlcygnQCcpICYmIGFjdHVhbFJlY2lwaWVudCkge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzTWVzc2FnZSA9IHN1Y2Nlc3NNZXNzYWdlLnJlcGxhY2UoJ9Cf0LjRgdGM0LzQviDQvtGC0L/RgNCw0LLQu9C10L3QvicsIGDQn9C40YHRjNC80L4g0L7RgtC/0YDQsNCy0LvQtdC90L4g4oaSICR7YWN0dWFsUmVjaXBpZW50fWApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRyZXN1bHQuYWRkQ2xhc3MoJ3Bvc2l0aXZlJykuaHRtbChcbiAgICAgICAgICAgICAgICAgICAgJzxpIGNsYXNzPVwiY2hlY2sgY2lyY2xlIGljb25cIj48L2k+ICcgKyBzdWNjZXNzTWVzc2FnZVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGRpYWdub3N0aWNzIGluZm8gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGE/LmRpYWdub3N0aWNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpYWcgPSByZXNwb25zZS5kYXRhLmRpYWdub3N0aWNzO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGV0YWlscyA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjxzbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlhZy5hdXRoX3R5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlciA9IGRpYWcub2F1dGgyX3Byb3ZpZGVyIHx8ICdPQXV0aDInO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgVXNpbmc6IE9BdXRoMmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIgJiYgcHJvdmlkZXIgIT09ICdPQXV0aDInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgICgke3Byb3ZpZGVyfSlgO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgVXNpbmc6IFBhc3N3b3JkIGF1dGhlbnRpY2F0aW9uYDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGAsIFNlcnZlcjogJHtkaWFnLnNtdHBfaG9zdH06JHtkaWFnLnNtdHBfcG9ydH1gO1xuICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9ICc8L3NtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGRldGFpbHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHJlc3BvbnNlPy5tZXNzYWdlcz8uZXJyb3I/LmpvaW4oJywgJykgfHwgZ2xvYmFsVHJhbnNsYXRlLm1zX0RpYWdub3N0aWNDb25uZWN0aW9uRmFpbGVkO1xuICAgICAgICAgICAgICAgICRyZXN1bHQuYWRkQ2xhc3MoJ25lZ2F0aXZlJykuaHRtbCgnPGkgY2xhc3M9XCJ0aW1lcyBjaXJjbGUgaWNvblwiPjwvaT4gJyArIG1lc3NhZ2UpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBkZXRhaWxlZCBlcnJvciBhbmFseXNpcyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmVycm9yX2RldGFpbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JEZXRhaWxzID0gcmVzcG9uc2UuZGF0YS5lcnJvcl9kZXRhaWxzO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGV0YWlsc0h0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj4nO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNraXAgc2hvd2luZyBlcnJvciB0eXBlIGxhYmVsIC0gaXQncyB0b28gdGVjaG5pY2FsIGZvciBtb3N0IHVzZXJzXG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yRGV0YWlscy5wcm9iYWJsZV9jYXVzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gYDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY1Byb2JhYmxlQ2F1c2V9PC9zdHJvbmc+ICR7ZXJyb3JEZXRhaWxzLnByb2JhYmxlX2NhdXNlfTxicj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyByYXcgUEhQTWFpbGVyIGVycm9yIGluIGEgY29sbGFwc2libGUgc2VjdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3JEZXRhaWxzLnJhd19lcnJvciAmJiBlcnJvckRldGFpbHMucmF3X2Vycm9yICE9PSBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHRpbnkgYWNjb3JkaW9uXCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAxMHB4O1wiPic7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSBgPGRpdiBjbGFzcz1cInRpdGxlXCI+PGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLm1zX0RpYWdub3N0aWNUZWNobmljYWxEZXRhaWxzfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSBgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj48Y29kZSBzdHlsZT1cImZvbnQtc2l6ZTogMTFweDsgd29yZC1icmVhazogYnJlYWstYWxsO1wiPiR7ZXJyb3JEZXRhaWxzLnJhd19lcnJvcn08L2NvZGU+PC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlsc0h0bWwpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgYWNjb3JkaW9uIGZvciB0ZWNobmljYWwgZGV0YWlsc1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmZpbmQoJy5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGhpbnRzIGlmIGF2YWlsYWJsZSAtIGxpbWl0IHRvIHRvcCAzIG1vc3QgcmVsZXZhbnQgb25lc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uaGludHMgJiYgcmVzcG9uc2UuZGF0YS5oaW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBoaW50cyA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjxzdHJvbmc+0KDQtdC60L7QvNC10L3QtNCw0YbQuNC4Ojwvc3Ryb25nPjx1bD4nO1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG1heCAzIGhpbnRzIHRvIGF2b2lkIG92ZXJ3aGVsbWluZyB0aGUgdXNlclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWxldmFudEhpbnRzID0gcmVzcG9uc2UuZGF0YS5oaW50cy5zbGljZSgwLCAzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVsZXZhbnRIaW50cy5mb3JFYWNoKGhpbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBFbmdsaXNoIGhpbnRzIGlmIHdlIGhhdmUgUnVzc2lhbiBvbmVzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGludC5pbmNsdWRlcygnT0F1dGgyIGFjY2VzcyB0b2tlbiBleHBpcmVkJykgJiYgcmVsZXZhbnRIaW50cy5zb21lKGggPT4gaC5pbmNsdWRlcygn0YLQvtC60LXQvScpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGhpbnRzICs9IGA8bGk+JHtoaW50fTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGhpbnRzICs9ICc8L3VsPic7XG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGhpbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEF1dG8taGlkZSBhZnRlciAzMCBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmZhZGVPdXQoNDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIDMwMDAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBHZXQgdW5tYXNrZWQgdmFsdWVzIGZvciBlbWFpbCBmaWVsZHMgRklSU1RcbiAgICAgICAgY29uc3QgZW1haWxGaWVsZHMgPSBbXG4gICAgICAgICAgICAnTWFpbFNNVFBTZW5kZXJBZGRyZXNzJyxcbiAgICAgICAgICAgICdTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnLFxuICAgICAgICAgICAgJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJyxcbiAgICAgICAgICAgICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnXG4gICAgICAgIF07XG5cbiAgICAgICAgZW1haWxGaWVsZHMuZm9yRWFjaChmaWVsZElkID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBsZXQgb3JpZ2luYWxWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnJztcbiAgICAgICAgICAgICAgICBsZXQgZmllbGRWYWx1ZSA9IG9yaWdpbmFsVmFsdWU7XG5cbiAgICAgICAgICAgICAgICAvLyBGb3IgZW1haWwgaW5wdXRtYXNrLCB0cnkgZGlmZmVyZW50IGFwcHJvYWNoZXMgdG8gZ2V0IGNsZWFuIHZhbHVlXG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdmFsdWUgY29udGFpbnMgcGxhY2Vob2xkZXIgcGF0dGVybnNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkVmFsdWUuaW5jbHVkZXMoJ19AXycpIHx8IGZpZWxkVmFsdWUgPT09ICdALicgfHwgZmllbGRWYWx1ZSA9PT0gJ0AnIHx8IGZpZWxkVmFsdWUgPT09ICdfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmllbGRWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB1bm1hc2tlZCB2YWx1ZSBmb3IgZW1haWwgZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGlucHV0bWFzayBwbHVnaW4gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5pbnB1dG1hc2sgJiYgdHlwZW9mICRmaWVsZC5pbnB1dG1hc2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdW5tYXNrZWRWYWx1ZSA9ICRmaWVsZC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVubWFza2VkVmFsdWUgJiYgdW5tYXNrZWRWYWx1ZSAhPT0gZmllbGRWYWx1ZSAmJiAhdW5tYXNrZWRWYWx1ZS5pbmNsdWRlcygnXycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZFZhbHVlID0gdW5tYXNrZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFtNYWlsU2V0dGluZ3NdIEZhaWxlZCB0byBnZXQgdW5tYXNrZWQgdmFsdWUgZm9yICR7ZmllbGRJZH06YCwgZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbZmllbGRJZF0gPSBmaWVsZFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gTm8gc3VjY2VzcyBtZXNzYWdlIG5lZWRlZCAtIGZvcm0gc2F2ZXMgc2lsZW50bHlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSBmb3Igc2F2aW5nIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBtYWlsU2V0dGluZ3MuJGZvcm1PYmo7XG5cbiAgICAgICAgLy8gRW5hYmxlIFJFU1QgQVBJIG1vZGUgKG1vZGVybiBhcHByb2FjaCBsaWtlIEdlbmVyYWxTZXR0aW5ncylcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBNYWlsU2V0dGluZ3NBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdwYXRjaFNldHRpbmdzJztcblxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uIGZvciBjbGVhbmVyIEFQSSByZXF1ZXN0c1xuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcblxuICAgICAgICAvLyBFbmFibGUgc2VuZGluZyBvbmx5IGNoYW5nZWQgZmllbGRzIGZvciBvcHRpbWFsIFBBVENIIHNlbWFudGljc1xuICAgICAgICBGb3JtLnNlbmRPbmx5Q2hhbmdlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gTm8gcmVkaXJlY3QgYWZ0ZXIgc2F2ZSAtIHN0YXkgb24gdGhlIHNhbWUgcGFnZVxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gbnVsbDtcblxuICAgICAgICAvLyBVc2UgJyMnIGZvciBVUkwgd2hlbiB1c2luZyBhcGlTZXR0aW5nc1xuICAgICAgICBGb3JtLnVybCA9ICcjJztcblxuICAgICAgICAvLyBVc2UgZHluYW1pYyB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIGN1cnJlbnQgc3RhdGVcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFpbFNldHRpbmdzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFpbFNldHRpbmdzLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFpbFNldHRpbmdzLmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBFdmVudEJ1cyBPQXV0aDIgZXZlbnRzXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9PQXV0aDJFdmVudHMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBTdWJzY3JpYmUgdG8gT0F1dGgyIGF1dGhvcml6YXRpb24gZXZlbnRzXG4gICAgICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ29hdXRoMi1hdXRob3JpemF0aW9uJywgKGRhdGEpID0+IHtcblxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN1Y2Nlc3M6IHJlZnJlc2ggT0F1dGgyIHN0YXR1cyBhZnRlciBhIHNob3J0IGRlbGF5XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS5zdGF0dXMgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXJyb3I6IHNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMlByb2Nlc3NpbmdGYWlsZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICA0MDAwXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTW9uaXRvciBmb3JtIGNoYW5nZXMgdG8gY29udHJvbCB0ZXN0IGJ1dHRvbiBzdGF0ZXNcbiAgICAgKi9cbiAgICBtb25pdG9yRm9ybUNoYW5nZXMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxseSBidXR0b25zIHNob3VsZCBiZSBlbmFibGVkIChubyBjaGFuZ2VzIHlldClcbiAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKTtcblxuICAgICAgICAvLyBXYXRjaCB0aGUgc3VibWl0IGJ1dHRvbidzIGNsYXNzIGNoYW5nZXMgdmlhIE11dGF0aW9uT2JzZXJ2ZXIuXG4gICAgICAgIC8vIEZvcm0uY2hlY2tWYWx1ZXMoKSB0b2dnbGVzICdkaXNhYmxlZCcgb24gI3N1Ym1pdGJ1dHRvbiDigJQgb2JzZXJ2ZXIgcmVhY3RzIHRvIHRoYXQuXG4gICAgICAgIGNvbnN0IHN1Ym1pdEJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdWJtaXRidXR0b24nKTtcbiAgICAgICAgaWYgKHN1Ym1pdEJ1dHRvbikge1xuICAgICAgICAgICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShzdWJtaXRCdXR0b24sIHthdHRyaWJ1dGVzOiB0cnVlLCBhdHRyaWJ1dGVGaWx0ZXI6IFsnY2xhc3MnXX0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0ZXN0IGJ1dHRvbiBzdGF0ZXMgYmFzZWQgb24gZm9ybSBjaGFuZ2VzLlxuICAgICAqIFRlc3QgYnV0dG9ucyBhcmUgYWN0aXZlIG9ubHkgd2hlbiBzYXZlIGJ1dHRvbiBpcyBkaXNhYmxlZCAobm8gdW5zYXZlZCBjaGFuZ2VzKS5cbiAgICAgKi9cbiAgICB1cGRhdGVUZXN0QnV0dG9uU3RhdGVzKCkge1xuICAgICAgICBjb25zdCAkdGVzdENvbm5lY3Rpb25CdG4gPSAkKCcjdGVzdC1jb25uZWN0aW9uLWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkc2VuZFRlc3RFbWFpbEJ0biA9ICQoJyNzZW5kLXRlc3QtZW1haWwtYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRzdWJtaXRCdG4gPSAkKCcjc3VibWl0YnV0dG9uJyk7XG5cbiAgICAgICAgLy8gU2F2ZSBidXR0b24gZGlzYWJsZWQgPSBubyB1bnNhdmVkIGNoYW5nZXMgPSB0ZXN0IGJ1dHRvbnMgc2hvdWxkIGJlIGVuYWJsZWRcbiAgICAgICAgY29uc3QgaGFzVW5zYXZlZENoYW5nZXMgPSAhJHN1Ym1pdEJ0bi5oYXNDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICBpZiAoaGFzVW5zYXZlZENoYW5nZXMpIHtcbiAgICAgICAgICAgIC8vIEZvcm0gaGFzIHVuc2F2ZWQgY2hhbmdlcyAtIGRpc2FibGUgdGVzdCBidXR0b25zXG4gICAgICAgICAgICAkdGVzdENvbm5lY3Rpb25CdG5cbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS10b29sdGlwJywgZ2xvYmFsVHJhbnNsYXRlLm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1wb3NpdGlvbicsICd0b3AgY2VudGVyJylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1pbnZlcnRlZCcsICcnKTtcblxuICAgICAgICAgICAgJHNlbmRUZXN0RW1haWxCdG5cbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS10b29sdGlwJywgZ2xvYmFsVHJhbnNsYXRlLm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1wb3NpdGlvbicsICd0b3AgY2VudGVyJylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1pbnZlcnRlZCcsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vIGNoYW5nZXMgLSBlbmFibGUgdGVzdCBidXR0b25zXG4gICAgICAgICAgICAkdGVzdENvbm5lY3Rpb25CdG5cbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS10b29sdGlwJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1wb3NpdGlvbicpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtaW52ZXJ0ZWQnKTtcblxuICAgICAgICAgICAgJHNlbmRUZXN0RW1haWxCdG5cbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS10b29sdGlwJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1wb3NpdGlvbicpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtaW52ZXJ0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGJ1dHRvbnNcbiAgICAgICAgJCgnLnVpLmJ1dHRvbltkYXRhLXRvb2x0aXBdJykucG9wdXAoKTtcbiAgICB9LFxuXG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gRE9NIGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemUoKTtcblxuICAgIC8vIEVuc3VyZSBjbGljayBwcmV2ZW50aW9uIGZvciB0b29sdGlwIGljb25zIGluIGNoZWNrYm94ZXNcbiAgICAvLyBUaGlzIHByZXZlbnRzIGNoZWNrYm94IHRvZ2dsZSB3aGVuIGNsaWNraW5nIG9uIHRvb2x0aXAgaWNvblxuICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5vZmYoJ2NsaWNrLnRvb2x0aXAtcHJldmVudCcpLm9uKCdjbGljay50b29sdGlwLXByZXZlbnQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xufSk7Il19