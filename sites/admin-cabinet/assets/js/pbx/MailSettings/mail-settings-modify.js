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
      e.preventDefault(); // Check if button is disabled

      if ($(e.currentTarget).hasClass('disabled')) {
        return false;
      } // Double-check for unsaved changes


      if (typeof Form !== 'undefined' && Form.hasChanges && Form.hasChanges()) {
        UserMessage.showWarning(globalTranslate.ms_SaveChangesBeforeTesting);
        return false;
      }

      mailSettings.testConnection();
    }); // Send test email button

    $('#send-test-email-button').on('click', function (e) {
      e.preventDefault(); // Check if button is disabled

      if ($(e.currentTarget).hasClass('disabled')) {
        return false;
      } // Double-check for unsaved changes


      if (typeof Form !== 'undefined' && Form.hasChanges && Form.hasChanges()) {
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
    mailSettings.updateTestButtonStates(); // Subscribe to form change events - check real form state

    mailSettings.$formObj.on('change.testbuttons', 'input, select, textarea', function () {
      // Use Form's built-in change detection
      mailSettings.updateTestButtonStates();
    }); // Also monitor Form's dataChanged events

    mailSettings.$formObj.on('form.dataChanged', function () {
      mailSettings.updateTestButtonStates();
    }); // Reset state after successful save

    var originalAfterSendForm = mailSettings.cbAfterSendForm;

    mailSettings.cbAfterSendForm = function (response) {
      originalAfterSendForm(response);

      if (response && response.success) {
        // After successful save, buttons should be enabled
        setTimeout(function () {
          mailSettings.updateTestButtonStates();
        }, 100);
      }
    };
  },

  /**
   * Update test button states based on form changes
   */
  updateTestButtonStates: function updateTestButtonStates() {
    var $testConnectionBtn = $('#test-connection-button');
    var $sendTestEmailBtn = $('#send-test-email-button');
    var $submitBtn = $('#submitbutton'); // Check if form has unsaved changes using Form's built-in method

    var hasChanges = typeof Form !== 'undefined' && Form.hasChanges && Form.hasChanges();

    if (hasChanges) {
      // Form has changes - disable test buttons with visual feedback
      $testConnectionBtn.addClass('disabled').attr('data-tooltip', globalTranslate.ms_SaveChangesBeforeTesting).attr('data-position', 'top center').attr('data-inverted', '');
      $sendTestEmailBtn.addClass('disabled').attr('data-tooltip', globalTranslate.ms_SaveChangesBeforeTesting).attr('data-position', 'top center').attr('data-inverted', ''); // Make sure save button is visible/enabled when there are changes

      $submitBtn.removeClass('disabled').show();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkIiwiJGNoZWNrQm94ZXMiLCIkbWVudUl0ZW1zIiwib2F1dGgyV2luZG93IiwiZGF0YUxvYWRlZCIsImdldFZhbGlkYXRlUnVsZXMiLCJydWxlcyIsImF1dGhUeXBlIiwidmFsIiwiTWFpbFNNVFBTZW5kZXJBZGRyZXNzIiwiaWRlbnRpZmllciIsIm9wdGlvbmFsIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQiLCJTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwiLCJtc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCIsIlN5c3RlbUVtYWlsRm9yTWlzc2VkIiwidmFsdWUiLCJtc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCIsIlZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCIsIm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkIiwiTWFpbFNNVFBIb3N0IiwibXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQiLCJNYWlsU01UUFBvcnQiLCJtc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCIsIk1haWxPQXV0aDJQcm92aWRlciIsIk1haWxPQXV0aDJDbGllbnRJZCIsIk1haWxPQXV0aDJDbGllbnRTZWNyZXQiLCJNYWlsU01UUFVzZXJuYW1lIiwibXNfVmFsaWRhdGVTTVRQVXNlcm5hbWVFbWFpbCIsIk1haWxTTVRQUGFzc3dvcmQiLCJkZXBlbmRzIiwibXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSIsInVwZGF0ZVZhbGlkYXRpb25SdWxlcyIsIm5ld1J1bGVzIiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmb3JtIiwiZmllbGRzIiwiaW5saW5lIiwib24iLCJpbml0aWFsaXplIiwiaGFuZGxlT0F1dGgyQ2FsbGJhY2siLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJjaGVja2JveCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ1cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24iLCJpbml0aWFsRW5jcnlwdGlvbiIsImNsZWFyYWJsZSIsImZvcmNlU2VsZWN0aW9uIiwidXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVPQXV0aDIiLCJpbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycyIsImluaXRpYWxpemVOb3RpZmljYXRpb25IYW5kbGVycyIsImluaXRpYWxpemVUZXN0QnV0dG9ucyIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwiLCJpbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIiLCJzdWJzY3JpYmVUb09BdXRoMkV2ZW50cyIsIm1vbml0b3JGb3JtQ2hhbmdlcyIsImxvYWREYXRhIiwiTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJidWlsZFRvb2x0aXBDb250ZW50IiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsImJ1aWxkQ29udGVudCIsImVtYWlsRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkSWQiLCIkZmllbGQiLCJsZW5ndGgiLCJpbnB1dG1hc2siLCJzaG93TWFza09uSG92ZXIiLCJwbGFjZWhvbGRlciIsIm9uQmVmb3JlUGFzdGUiLCJwYXN0ZWRWYWx1ZSIsIm9uY2xlYXJlZCIsIiRpbnB1dCIsImFkZENsYXNzIiwiTWFpbFNldHRpbmdzQVBJIiwiZ2V0U2V0dGluZ3MiLCJzZXR0aW5ncyIsIm9mZiIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJkYXRhIiwiYm9vbGVhbkZpZWxkcyIsImtleSIsInVuZGVmaW5lZCIsIk1haWxTTVRQQXV0aFR5cGUiLCJhZnRlclBvcHVsYXRlIiwiTWFpbFNNVFBVc2VUTFMiLCJlbmNyeXB0aW9uVmFsdWUiLCJNYWlsU01UUENlcnRDaGVjayIsImlzQ2hlY2tlZCIsImNsb3Nlc3QiLCJNYWlsRW5hYmxlTm90aWZpY2F0aW9ucyIsIm5vdGlmaWNhdGlvblRvZ2dsZXMiLCJmaWVsZE5hbWUiLCJpbml0aWFsaXplRW1haWxGaWVsZHNWaXNpYmlsaXR5IiwidXBkYXRlVXNlcm5hbWVQbGFjZWhvbGRlciIsInRvZ2dsZUF1dGhGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RhcnRPQXV0aDJGbG93IiwiZGlzY29ubmVjdE9BdXRoMiIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJoYW5kbGVPQXV0aDJNZXNzYWdlIiwidG9nZ2xlTm90aWZpY2F0aW9uVHlwZXNTZWN0aW9uIiwiZGF0YUNoYW5nZWQiLCJ0b2dnbGVFbWFpbEZpZWxkIiwiaXNFbmFibGVkIiwiaXMiLCIkc2VjdGlvbiIsInNsaWRlRG93biIsInNldFRpbWVvdXQiLCJzbGlkZVVwIiwidG9nZ2xlSWQiLCJlbWFpbEZpZWxkSWQiLCIkZW1haWxGaWVsZCIsImlzTm90aWZpY2F0aW9uc0VuYWJsZWQiLCJzaG93IiwiaGlkZSIsInRvZ2dsZUVtYWlsTWFwIiwiT2JqZWN0Iiwia2V5cyIsInRhcmdldCIsImN1cnJlbnRBdXRoVHlwZSIsInRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzIiwiJHVzZXJuYW1lRmllbGQiLCIkcGFzc3dvcmRGaWVsZCIsIiRvYXV0aDJTZWN0aW9uIiwidXBkYXRlT0F1dGgyU3RhdHVzIiwiY2hlY2tPQXV0aDJTdGF0dXMiLCJjdXJyZW50VGFyZ2V0IiwiaGFzQ2xhc3MiLCJoYXNDaGFuZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93V2FybmluZyIsIm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZyIsInRlc3RDb25uZWN0aW9uIiwic2VuZFRlc3RFbWFpbCIsImVtYWlsIiwicHJvdmlkZXIiLCJkZXRlY3RQcm92aWRlciIsInNob3dQcm92aWRlckhpbnQiLCJhdXRvRmlsbFNNVFBTZXR0aW5ncyIsInNlbmRlckFkZHJlc3MiLCJ0cmltIiwiYXR0ciIsInJlbW92ZUF0dHIiLCJnb29nbGUiLCJob3N0IiwicG9ydCIsInRscyIsIm1pY3Jvc29mdCIsInlhbmRleCIsInByb3ZpZGVyU2V0dGluZ3MiLCIkZW5jcnlwdGlvbkRyb3Bkb3duIiwiZW5jcnlwdGlvbiIsImNlcnRDaGVjayIsImVuY3J5cHRpb25UeXBlIiwiJHBvcnRGaWVsZCIsImN1cnJlbnRQb3J0Iiwic3RhbmRhcmRQb3J0cyIsImluY2x1ZGVzIiwiJGNlcnRDaGVja0ZpZWxkIiwibWVzc2FnZSIsIiRoaW50IiwiYWZ0ZXIiLCJ0ZXh0IiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwibG9jYXRpb24iLCJzZWFyY2giLCJoYXMiLCJsb2FkU2V0dGluZ3NGcm9tQVBJIiwicmVwbGFjZVN0YXRlIiwiZG9jdW1lbnQiLCJ0aXRsZSIsInBhdGhuYW1lIiwiZXJyb3IiLCJnZXQiLCJzaG93RXJyb3IiLCJtc19PQXV0aDJBdXRob3JpemF0aW9uRmFpbGVkIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibXNfVmFsaWRhdGVPQXV0aDJQcm92aWRlckVtcHR5IiwiY2xpZW50SWQiLCJjbGllbnRTZWNyZXQiLCJtc19WYWxpZGF0ZU9BdXRoMkNsaWVudElkRW1wdHkiLCJtc19WYWxpZGF0ZU9BdXRoMkNsaWVudFNlY3JldEVtcHR5Iiwic2F2ZU9BdXRoMkNyZWRlbnRpYWxzIiwicGF0Y2hTZXR0aW5ncyIsInJlc3BvbnNlIiwicmVzdWx0IiwicHJvY2VlZFdpdGhPQXV0aDJGbG93IiwiY29uc29sZSIsImVycm9yTWVzc2FnZSIsIm1lc3NhZ2VzIiwiam9pbiIsInJlcXVlc3RPQXV0aDJBdXRoVXJsIiwiYXV0aG9yaXplT0F1dGgyIiwiYXV0aFVybCIsIndpZHRoIiwiaGVpZ2h0IiwibGVmdCIsInNjcmVlbiIsInRvcCIsImF1dGhXaW5kb3ciLCJvcGVuIiwiZ2V0T0F1dGgyVXJsIiwiYXV0aF91cmwiLCJldmVudCIsIm9yaWdpbiIsImNsb3NlIiwicGFyYW1zIiwic2hvd0luZm9ybWF0aW9uIiwib2F1dGgyX3N0YXR1cyIsInN0YXR1cyIsIiRzdGF0dXNEaXYiLCIkY2xpZW50SWRGaWVsZCIsIiRjbGllbnRTZWNyZXRGaWVsZCIsImNvbmZpZ3VyZWQiLCJwcm92aWRlck5hbWUiLCJnZXRQcm92aWRlck5hbWUiLCJjb25uZWN0ZWRUZXh0IiwibXNfT0F1dGgyQ29ubmVjdGVkVG8iLCJyZXBsYWNlIiwiaHRtbCIsImF1dGhvcml6ZWQiLCJtc19PQXV0aDJOb3RDb25maWd1cmVkIiwiY2xlYXJEYXRhIiwiTWFpbE9BdXRoMlJlZnJlc2hUb2tlbiIsIk1haWxPQXV0aDJBY2Nlc3NUb2tlbiIsIk1haWxPQXV0aDJUb2tlbkV4cGlyZXMiLCIkYnV0dG9uIiwiJHJlc3VsdEFyZWEiLCJyZW1vdmUiLCIkcmVzdWx0IiwicGFyZW50IiwiYXBwZW5kIiwic3VjY2VzcyIsImRpYWdub3N0aWNzIiwiZGlhZyIsImRldGFpbHMiLCJhdXRoX3R5cGUiLCJzbXRwX2hvc3QiLCJzbXRwX3BvcnQiLCJzbXRwX2VuY3J5cHRpb24iLCJvYXV0aDJfcHJvdmlkZXIiLCJvYXV0aDJfcmVmcmVzaF90b2tlbl9leGlzdHMiLCJtc19EaWFnbm9zdGljQXV0aG9yaXplZCIsIm1haW5NZXNzYWdlIiwibXNfRGlhZ25vc3RpY0Nvbm5lY3Rpb25GYWlsZWQiLCJlcnJvcl9kZXRhaWxzIiwicHJvYmFibGVfY2F1c2UiLCJyYXdfZXJyb3IiLCJyYXdFcnJvciIsImRldGFpbHNIdG1sIiwibXNfRGlhZ25vc3RpY1RlY2huaWNhbERldGFpbHMiLCJmaW5kIiwiYWNjb3JkaW9uIiwidG9VcHBlckNhc2UiLCJoaW50cyIsInJlbGV2YW50SGludHMiLCJzbGljZSIsImhpbnQiLCJzb21lIiwiaCIsImZhZGVPdXQiLCJyZWNpcGllbnQiLCJ0byIsImFjdHVhbFJlY2lwaWVudCIsInN1Y2Nlc3NNZXNzYWdlIiwiZXJyb3JEZXRhaWxzIiwibXNfRGlhZ25vc3RpY1Byb2JhYmxlQ2F1c2UiLCJjYkJlZm9yZVNlbmRGb3JtIiwib3JpZ2luYWxWYWx1ZSIsImZpZWxkVmFsdWUiLCJ1bm1hc2tlZFZhbHVlIiwid2FybiIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsInNlbmRPbmx5Q2hhbmdlZCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwidXJsIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJtc19PQXV0aDJQcm9jZXNzaW5nRmFpbGVkIiwidXBkYXRlVGVzdEJ1dHRvblN0YXRlcyIsIm9yaWdpbmFsQWZ0ZXJTZW5kRm9ybSIsIiR0ZXN0Q29ubmVjdGlvbkJ0biIsIiRzZW5kVGVzdEVtYWlsQnRuIiwiJHN1Ym1pdEJ0biIsInBvcHVwIiwicmVhZHkiLCJzdG9wUHJvcGFnYXRpb24iXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHFCQUFELENBTE07O0FBT2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFdBQVcsRUFBRUQsQ0FBQyxDQUFDLCtCQUFELENBWEc7O0FBYWpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFVBQVUsRUFBRUYsQ0FBQyxDQUFDLDJCQUFELENBakJJOztBQW1CakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsWUFBWSxFQUFFLElBdkJHOztBQXlCakI7QUFDSjtBQUNBO0FB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QUQsQ0FBRCxDQUFZeUgsS0FBWixDQUFrQixZQUFNO0FBQ3BCelQsRUFBQUEsWUFBWSxDQUFDNkMsVUFBYixHQURvQixDQUdwQjtBQUNBOztBQUNBM0MsRUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0J5RixHQUF0QixDQUEwQix1QkFBMUIsRUFBbUQvQyxFQUFuRCxDQUFzRCx1QkFBdEQsRUFBK0UsVUFBU3VFLENBQVQsRUFBWTtBQUN2RkEsSUFBQUEsQ0FBQyxDQUFDdU0sZUFBRjtBQUNBdk0sSUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsV0FBTyxLQUFQO0FBQ0gsR0FKRDtBQUtILENBVkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBVc2VyTWVzc2FnZSwgTWFpbFNldHRpbmdzQVBJLCBDb25maWcsIFRvb2x0aXBCdWlsZGVyLCBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbWFpbCBzZXR0aW5ncyB3aXRoIE9BdXRoMiBzdXBwb3J0XG4gKlxuICogQG1vZHVsZSBtYWlsU2V0dGluZ3NcbiAqL1xuY29uc3QgbWFpbFNldHRpbmdzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNtYWlsLXNldHRpbmdzLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVja2JveGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQm94ZXM6ICQoJyNtYWlsLXNldHRpbmdzLWZvcm0gLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbWVudSBpdGVtcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtZW51SXRlbXM6ICQoJyNtYWlsLXNldHRpbmdzLW1lbnUgLml0ZW0nKSxcblxuICAgIC8qKlxuICAgICAqIE9BdXRoMiB3aW5kb3cgcmVmZXJlbmNlXG4gICAgICogQHR5cGUge1dpbmRvd3xudWxsfVxuICAgICAqL1xuICAgIG9hdXRoMldpbmRvdzogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgaW5pdGlhbCBkYXRhIGhhcyBiZWVuIGxvYWRlZCBmcm9tIEFQSVxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGRhdGFMb2FkZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBmb3JtIHN0YXRlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJ1bGVzID0ge307XG4gICAgICAgIGNvbnN0IGF1dGhUeXBlID0gJCgnaW5wdXRbbmFtZT1cIk1haWxTTVRQQXV0aFR5cGVcIl06Y2hlY2tlZCcpLnZhbCgpO1xuXG4gICAgICAgIC8vIEJhc2UgZW1haWwgdmFsaWRhdGlvbiBydWxlcyAtIGFsd2F5cyBhcHBseSB3aGVuIGZpZWxkcyBoYXZlIHZhbHVlc1xuICAgICAgICBydWxlcy5NYWlsU01UUFNlbmRlckFkZHJlc3MgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbFNNVFBTZW5kZXJBZGRyZXNzJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5TeXN0ZW1FbWFpbEZvck1pc3NlZCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeKD8hLipfQF9cXFxcLl8pLiokJywgIC8vIFJlamVjdCBfQF8uXyBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlTWlzc2VkRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ14oPyEuKl9AX1xcXFwuXykuKiQnLCAgLy8gUmVqZWN0IF9AXy5fIHBhdHRlcm5cbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVWb2ljZW1haWxFbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNNVFAgY29uZmlndXJhdGlvbiBydWxlcyAtIGFsd2F5cyBhdmFpbGFibGUgYnV0IG9wdGlvbmFsXG4gICAgICAgIHJ1bGVzLk1haWxTTVRQSG9zdCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUEhvc3QnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuTWFpbFNNVFBQb3J0ID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQUG9ydCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBdXRoZW50aWNhdGlvbi1zcGVjaWZpYyBydWxlc1xuICAgICAgICBpZiAoYXV0aFR5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICAvLyBPQXV0aDIgZmllbGRzIC0gb3B0aW9uYWxcbiAgICAgICAgICAgIHJ1bGVzLk1haWxPQXV0aDJQcm92aWRlciA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbE9BdXRoMlByb3ZpZGVyJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBydWxlcy5NYWlsT0F1dGgyQ2xpZW50SWQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxPQXV0aDJDbGllbnRJZCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcnVsZXMuTWFpbE9BdXRoMkNsaWVudFNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbE9BdXRoMkNsaWVudFNlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gVXNlcm5hbWUgZm9yIE9BdXRoMiBzaG91bGQgYmUgZW1haWwgd2hlbiBmaWxsZWRcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQVXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNNVFBVc2VybmFtZUVtYWlsLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUGFzc3dvcmQgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFVzZXJuYW1lIC0gb3B0aW9uYWxcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQVXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIC0gcmVxdWlyZWQgaWYgdXNlcm5hbWUgaXMgcHJvdmlkZWRcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQUGFzc3dvcmQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQUGFzc3dvcmQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRlcGVuZHM6ICdNYWlsU01UUFVzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgYW5kIHJlaW5pdGlhbGl6ZSBmb3JtXG4gICAgICovXG4gICAgdXBkYXRlVmFsaWRhdGlvblJ1bGVzKCkge1xuICAgICAgICAvLyBHZXQgZnJlc2ggdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBjdXJyZW50IHN0YXRlXG4gICAgICAgIGNvbnN0IG5ld1J1bGVzID0gbWFpbFNldHRpbmdzLmdldFZhbGlkYXRlUnVsZXMoKTtcblxuICAgICAgICAvLyBVcGRhdGUgRm9ybS52YWxpZGF0ZVJ1bGVzXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ld1J1bGVzO1xuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gd2l0aCBuZXcgcnVsZXNcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2Rlc3Ryb3knKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oe1xuICAgICAgICAgICAgZmllbGRzOiBuZXdSdWxlcyxcbiAgICAgICAgICAgIGlubGluZTogdHJ1ZSxcbiAgICAgICAgICAgIG9uOiAnYmx1cidcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1haWwgc2V0dGluZ3MgcGFnZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDaGVjayBmb3IgT0F1dGgyIGNhbGxiYWNrIHBhcmFtZXRlcnMgaW4gVVJMXG4gICAgICAgIG1haWxTZXR0aW5ncy5oYW5kbGVPQXV0aDJDYWxsYmFjaygpO1xuXG4gICAgICAgIG1haWxTZXR0aW5ncy4kbWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG4gICAgICAgIG1haWxTZXR0aW5ncy4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggc3BlY2lmaWMgY29uZmlndXJhdGlvbnNcbiAgICAgICAgLy8gRG9uJ3QgaW5pdGlhbGl6ZSBhbGwgZHJvcGRvd25zIGdlbmVyaWNhbGx5IHRvIGF2b2lkIGRvdWJsZSBpbml0aWFsaXphdGlvblxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZW5jcnlwdGlvbiB0eXBlIGRyb3Bkb3duIHdpdGggcG9ydCBhdXRvLXVwZGF0ZVxuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24odmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpbml0aWFsIGVuY3J5cHRpb24gdHlwZSB0byBzaG93L2hpZGUgY2VydGlmaWNhdGUgY2hlY2tcbiAgICAgICAgY29uc3QgaW5pdGlhbEVuY3J5cHRpb24gPSAkKCcjTWFpbFNNVFBVc2VUTFMnKS52YWwoKSB8fCAnbm9uZSc7XG4gICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24oaW5pdGlhbEVuY3J5cHRpb24pO1xuXG4gICAgICAgIC8vIFNwZWNpYWwgaW5pdGlhbGl6YXRpb24gZm9yIE9BdXRoMiBwcm92aWRlciBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgY2xlYXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVNNVFBTZXR0aW5nc0ZvclByb3ZpZGVyKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTm8gb3RoZXIgZHJvcGRvd25zIGluIHRoZSBmb3JtIG5lZWQgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gTWFpbFNNVFBVc2VUTFMgYW5kIE1haWxPQXV0aDJQcm92aWRlciBhcmUgdGhlIG9ubHkgZHJvcGRvd25zXG5cbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplT0F1dGgyKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycygpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZU5vdGlmaWNhdGlvbkhhbmRsZXJzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplVGVzdEJ1dHRvbnMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVJbnB1dE1hc2tzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmRldGVjdFByb3ZpZGVyRnJvbUVtYWlsKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIoKTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgT0F1dGgyIGV2ZW50c1xuICAgICAgICBtYWlsU2V0dGluZ3Muc3Vic2NyaWJlVG9PQXV0aDJFdmVudHMoKTtcblxuICAgICAgICAvLyBNb25pdG9yIGZvcm0gY2hhbmdlcyB0byBjb250cm9sIHRlc3QgYnV0dG9uc1xuICAgICAgICBtYWlsU2V0dGluZ3MubW9uaXRvckZvcm1DaGFuZ2VzKCk7XG5cbiAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gQVBJIGFmdGVyIGFsbCBVSSBlbGVtZW50cyBhcmUgaW5pdGlhbGl6ZWRcbiAgICAgICAgbWFpbFNldHRpbmdzLmxvYWREYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBVc2UgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBpZiAodHlwZW9mIE1haWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZVRvb2x0aXBzKG1haWxTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogRGVsZWdhdGVzIHRvIFRvb2x0aXBCdWlsZGVyIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgZm9ybWF0dGluZ1xuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW5wdXQgbWFza3MgZm9yIGVtYWlsIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dE1hc2tzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGVtYWlsIGlucHV0IG1hc2tzIGZvciBhbGwgZW1haWwgZmllbGRzXG4gICAgICAgIGNvbnN0IGVtYWlsRmllbGRzID0gW1xuICAgICAgICAgICAgJ01haWxTTVRQU2VuZGVyQWRkcmVzcycsXG4gICAgICAgICAgICAnU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ1xuICAgICAgICBdO1xuXG4gICAgICAgIGVtYWlsRmllbGRzLmZvckVhY2goZmllbGRJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGZpZWxkLmlucHV0bWFzaygnZW1haWwnLCB7XG4gICAgICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJywgLy8gTm8gcGxhY2Vob2xkZXIgY2hhcmFjdGVyXG4gICAgICAgICAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGZ1bmN0aW9uKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGVhbiBwbGFjZWhvbGRlciB2YWx1ZXMgb24gcGFzdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXN0ZWRWYWx1ZSA9PT0gJ19AXy5fJyB8fCBwYXN0ZWRWYWx1ZSA9PT0gJ0AnIHx8IHBhc3RlZFZhbHVlID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25jbGVhcmVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBmaWVsZCB2YWx1ZSB3aGVuIG1hc2sgaXMgY2xlYXJlZFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkaW5wdXQudmFsKCkgPT09ICdfQF8uXycgfHwgJGlucHV0LnZhbCgpID09PSAnQCcgfHwgJGlucHV0LnZhbCgpID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRpbnB1dC52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBDbGVhbiBpbml0aWFsIHBsYWNlaG9sZGVyIHZhbHVlc1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQudmFsKCkgPT09ICdfQF8uXycgfHwgJGZpZWxkLnZhbCgpID09PSAnQCcgfHwgJGZpZWxkLnZhbCgpID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAkZmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1haWwgc2V0dGluZ3MgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWREYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLmdldFNldHRpbmdzKChzZXR0aW5ncykgPT4ge1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBvdXIgY2hhbmdlIGhhbmRsZXIgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXScpLm9mZignY2hhbmdlLm1haWxzZXR0aW5ncycpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggbGlrZSBHZW5lcmFsU2V0dGluZ3NcbiAgICAgICAgICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHNldHRpbmdzLCB7XG4gICAgICAgICAgICAgICAgICAgIGJlZm9yZVBvcHVsYXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUkVTVCBBUEkgcmV0dXJucyBib29sZWFucyBmb3IgY2hlY2tib3ggZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IGJvb2xlYW4gdmFsdWVzIHRvIHN0cmluZ3MgZm9yIFNlbWFudGljIFVJIGNoZWNrYm94ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvb2xlYW5GaWVsZHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ01haWxTTVRQQ2VydENoZWNrJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kTWlzc2VkQ2FsbE5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NlbmRMb2dpbk5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kU3lzdGVtTm90aWZpY2F0aW9ucydcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICBib29sZWFuRmllbGRzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBib29sZWFuIHRvIHN0cmluZyBcIjFcIiBvciBcIjBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSAoZGF0YVtrZXldID09PSB0cnVlIHx8IGRhdGFba2V5XSA9PT0gMSB8fCBkYXRhW2tleV0gPT09ICcxJykgPyAnMScgOiAnMCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSByYWRpbyBidXR0b24gdmFsdWUgaXMgc2V0ICh3aWxsIGJlIGhhbmRsZWQgc2lsZW50bHkgYnkgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YS5NYWlsU01UUEF1dGhUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5NYWlsU01UUEF1dGhUeXBlID0gJ3Bhc3N3b3JkJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYW4gdXAgcGxhY2Vob2xkZXIgZW1haWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbWFpbEZpZWxkcyA9IFsnU3lzdGVtRW1haWxGb3JNaXNzZWQnLCAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ107XG4gICAgICAgICAgICAgICAgICAgICAgICBlbWFpbEZpZWxkcy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFba2V5XSA9PT0gJ19AXy5fJyB8fCBkYXRhW2tleV0gPT09ICdAJyB8fCBkYXRhW2tleV0gPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgT0F1dGgyIHByb3ZpZGVyIGRyb3Bkb3duIChWNS4wIHBhdHRlcm4pXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5NYWlsT0F1dGgyUHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuTWFpbE9BdXRoMlByb3ZpZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykudmFsKGRhdGEuTWFpbE9BdXRoMlByb3ZpZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgZW5jcnlwdGlvbiB0eXBlIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5NYWlsU01UUFVzZVRMUyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBvbGQgYm9vbGVhbiB2YWx1ZXMgdG8gbmV3IGZvcm1hdCBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5jcnlwdGlvblZhbHVlID0gZGF0YS5NYWlsU01UUFVzZVRMUztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW5jcnlwdGlvblZhbHVlID09PSB0cnVlIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gMSB8fCBlbmNyeXB0aW9uVmFsdWUgPT09ICcxJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmNyeXB0aW9uVmFsdWUgPSAndGxzJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVuY3J5cHRpb25WYWx1ZSA9PT0gZmFsc2UgfHwgZW5jcnlwdGlvblZhbHVlID09PSAwIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gJzAnIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIGRyb3Bkb3duIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQVXNlVExTLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGVuY3J5cHRpb25WYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQVXNlVExTJykudmFsKGVuY3J5cHRpb25WYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGNoZWNrYm94ZXMgdXNpbmcgU2VtYW50aWMgVUlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxTTVRQQ2VydENoZWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBkYXRhLk1haWxTTVRQQ2VydENoZWNrID09PSB0cnVlIHx8IGRhdGEuTWFpbFNNVFBDZXJ0Q2hlY2sgPT09IDEgfHwgZGF0YS5NYWlsU01UUENlcnRDaGVjayA9PT0gJzEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxFbmFibGVOb3RpZmljYXRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBkYXRhLk1haWxFbmFibGVOb3RpZmljYXRpb25zID09PSB0cnVlIHx8IGRhdGEuTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgPT09IDEgfHwgZGF0YS5NYWlsRW5hYmxlTm90aWZpY2F0aW9ucyA9PT0gJzEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxFbmFibGVOb3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxFbmFibGVOb3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBub3RpZmljYXRpb24gdHlwZSB0b2dnbGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3RpZmljYXRpb25Ub2dnbGVzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kTWlzc2VkQ2FsbE5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NlbmRMb2dpbk5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kU3lzdGVtTm90aWZpY2F0aW9ucydcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICBub3RpZmljYXRpb25Ub2dnbGVzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtmaWVsZE5hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gZGF0YVtmaWVsZE5hbWVdID09PSB0cnVlIHx8IGRhdGFbZmllbGROYW1lXSA9PT0gMSB8fCBkYXRhW2ZpZWxkTmFtZV0gPT09ICcxJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7ZmllbGROYW1lfWApLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChgIyR7ZmllbGROYW1lfWApLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbWFpbCBmaWVsZHMgdmlzaWJpbGl0eSBiYXNlZCBvbiB0b2dnbGUgc3RhdGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBNdXN0IGJlIGNhbGxlZCBhZnRlciBjaGVja2JveGVzIGFyZSBzZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplRW1haWxGaWVsZHNWaXNpYmlsaXR5KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBNYWlsU01UUFVzZXJuYW1lIHBsYWNlaG9sZGVyIHdpdGggTWFpbFNNVFBTZW5kZXJBZGRyZXNzIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVXNlcm5hbWVQbGFjZWhvbGRlcihkYXRhLk1haWxTTVRQU2VuZGVyQWRkcmVzcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIE9BdXRoMiBzdGF0dXMgaWYgT0F1dGgyIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSYWRpbyBidXR0b24gaXMgYWxyZWFkeSBzZXQgYnkgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXV0aFR5cGUgPSBkYXRhLk1haWxTTVRQQXV0aFR5cGUgfHwgJ3Bhc3N3b3JkJztcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVBdXRoRmllbGRzKGF1dGhUeXBlLCBkYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gbG9hZGVkIHN0YXRlXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVmFsaWRhdGlvblJ1bGVzKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGZsYWcgdGhhdCBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmRhdGFMb2FkZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGlmIGVuYWJsZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlLWVuYWJsZSBvdXIgY2hhbmdlIGhhbmRsZXIgZm9yIGZ1dHVyZSB1c2VyIGludGVyYWN0aW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgT0F1dGgyIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplT0F1dGgyKCkge1xuICAgICAgICAvLyBPQXV0aDIgY29ubmVjdCBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnN0YXJ0T0F1dGgyRmxvdygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBPQXV0aDIgZGlzY29ubmVjdCBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCcjb2F1dGgyLWRpc2Nvbm5lY3QnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLmRpc2Nvbm5lY3RPQXV0aDIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTGlzdGVuIGZvciBPQXV0aDIgY2FsbGJhY2sgbWVzc2FnZXNcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBtYWlsU2V0dGluZ3MuaGFuZGxlT0F1dGgyTWVzc2FnZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbm90aWZpY2F0aW9uIGVuYWJsZS9kaXNhYmxlIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5vdGlmaWNhdGlvbkhhbmRsZXJzKCkge1xuICAgICAgICAvLyBIYW5kbGUgbWFzdGVyIG5vdGlmaWNhdGlvbnMgZW5hYmxlL2Rpc2FibGUgY2hlY2tib3hcbiAgICAgICAgJCgnI01haWxFbmFibGVOb3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudG9nZ2xlTm90aWZpY2F0aW9uVHlwZXNTZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVZhbGlkYXRpb25SdWxlcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGluZGl2aWR1YWwgbm90aWZpY2F0aW9uIHR5cGUgdG9nZ2xlc1xuICAgICAgICAvLyBFYWNoIHRvZ2dsZSBzaG93cy9oaWRlcyBpdHMgY29ycmVzcG9uZGluZyBlbWFpbCBmaWVsZFxuICAgICAgICAkKCcjU2VuZE1pc3NlZENhbGxOb3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudG9nZ2xlRW1haWxGaWVsZCgnU2VuZE1pc3NlZENhbGxOb3RpZmljYXRpb25zJywgJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJyk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjU2VuZFZvaWNlbWFpbE5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVFbWFpbEZpZWxkKCdTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucycsICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNlbmRMb2dpbk5vdGlmaWNhdGlvbnMgYW5kIFNlbmRTeXN0ZW1Ob3RpZmljYXRpb25zIGRvbid0IGNvbnRyb2wgZW1haWwgZmllbGQgdmlzaWJpbGl0eVxuICAgICAgICAkKCcjU2VuZExvZ2luTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjU2VuZFN5c3RlbU5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBub3RpZmljYXRpb24gdHlwZXMgc2VjdGlvbiB2aXNpYmlsaXR5IGJhc2VkIG9uIE1haWxFbmFibGVOb3RpZmljYXRpb25zIHN0YXRlXG4gICAgICovXG4gICAgdG9nZ2xlTm90aWZpY2F0aW9uVHlwZXNTZWN0aW9uKCkge1xuICAgICAgICBjb25zdCBpc0VuYWJsZWQgPSAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgY29uc3QgJHNlY3Rpb24gPSAkKCcjbm90aWZpY2F0aW9uLXR5cGVzLXNlY3Rpb24nKTtcblxuICAgICAgICBpZiAoaXNFbmFibGVkKSB7XG4gICAgICAgICAgICAkc2VjdGlvbi5zbGlkZURvd24oMzAwKTtcbiAgICAgICAgICAgIC8vIEFsc28gdXBkYXRlIGluZGl2aWR1YWwgZW1haWwgZmllbGRzIHZpc2liaWxpdHkgYWZ0ZXIgc2VjdGlvbiBpcyBzaG93blxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVFbWFpbEZpZWxkc1Zpc2liaWxpdHkoKTtcbiAgICAgICAgICAgIH0sIDM1MCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2VjdGlvbi5zbGlkZVVwKDMwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGVtYWlsIGZpZWxkIHZpc2liaWxpdHkgYmFzZWQgb24gY2hlY2tib3ggc3RhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG9nZ2xlSWQgLSBJRCBvZiB0aGUgdG9nZ2xlIGNoZWNrYm94XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGVtYWlsRmllbGRJZCAtIElEIG9mIHRoZSBlbWFpbCBmaWVsZCB0byBzaG93L2hpZGVcbiAgICAgKi9cbiAgICB0b2dnbGVFbWFpbEZpZWxkKHRvZ2dsZUlkLCBlbWFpbEZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJChgIyR7dG9nZ2xlSWR9YCkuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgIGNvbnN0ICRlbWFpbEZpZWxkID0gJChgIyR7ZW1haWxGaWVsZElkfWApLmNsb3Nlc3QoJy5maWVsZCcpO1xuXG4gICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICRlbWFpbEZpZWxkLnNsaWRlRG93bigyMDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGVtYWlsRmllbGQuc2xpZGVVcCgyMDApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZW1haWwgZmllbGRzIHZpc2liaWxpdHkgYmFzZWQgb24gY3VycmVudCB0b2dnbGUgc3RhdGVzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUVtYWlsRmllbGRzVmlzaWJpbGl0eSgpIHtcbiAgICAgICAgLy8gRmlyc3QsIGNoZWNrIG1hc3RlciB0b2dnbGUgYW5kIHNob3cvaGlkZSB0aGUgZW50aXJlIG5vdGlmaWNhdGlvbiB0eXBlcyBzZWN0aW9uXG4gICAgICAgIGNvbnN0IGlzTm90aWZpY2F0aW9uc0VuYWJsZWQgPSAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgY29uc3QgJHNlY3Rpb24gPSAkKCcjbm90aWZpY2F0aW9uLXR5cGVzLXNlY3Rpb24nKTtcblxuICAgICAgICBpZiAoaXNOb3RpZmljYXRpb25zRW5hYmxlZCkge1xuICAgICAgICAgICAgJHNlY3Rpb24uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBObyBuZWVkIHRvIGNoZWNrIGluZGl2aWR1YWwgZmllbGRzIGlmIHNlY3Rpb24gaXMgaGlkZGVuXG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXAgb2YgdG9nZ2xlIElEcyB0byB0aGVpciBjb3JyZXNwb25kaW5nIGVtYWlsIGZpZWxkIElEc1xuICAgICAgICAvLyBOb3RlOiBTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwgaXMgYWx3YXlzIHZpc2libGUgYW5kIG5vdCBjb250cm9sbGVkIGJ5IGEgdG9nZ2xlXG4gICAgICAgIGNvbnN0IHRvZ2dsZUVtYWlsTWFwID0ge1xuICAgICAgICAgICAgJ1NlbmRNaXNzZWRDYWxsTm90aWZpY2F0aW9ucyc6ICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICAnU2VuZFZvaWNlbWFpbE5vdGlmaWNhdGlvbnMnOiAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNldCBpbml0aWFsIHZpc2liaWxpdHkgZm9yIGVhY2ggZW1haWwgZmllbGRcbiAgICAgICAgT2JqZWN0LmtleXModG9nZ2xlRW1haWxNYXApLmZvckVhY2godG9nZ2xlSWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgZW1haWxGaWVsZElkID0gdG9nZ2xlRW1haWxNYXBbdG9nZ2xlSWRdO1xuICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJChgIyR7dG9nZ2xlSWR9YCkuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICBjb25zdCAkZW1haWxGaWVsZCA9ICQoYCMke2VtYWlsRmllbGRJZH1gKS5jbG9zZXN0KCcuZmllbGQnKTtcblxuICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICRlbWFpbEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGVtYWlsRmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoIGF1dGggdHlwZSBjaGFuZ2UgaGFuZGxlclxuICAgICAqL1xuICAgIHJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyKCkge1xuICAgICAgICAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXScpLm9uKCdjaGFuZ2UubWFpbHNldHRpbmdzJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGF1dGhUeXBlID0gJChlLnRhcmdldCkudmFsKCk7XG4gICAgICAgICAgICAvLyBXaGVuIHVzZXIgbWFudWFsbHkgY2hhbmdlcyBhdXRoIHR5cGUsIGNoZWNrIE9BdXRoMiBzdGF0dXMgaWYgbmVlZGVkXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudG9nZ2xlQXV0aEZpZWxkcyhhdXRoVHlwZSk7XG4gICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyB3aGVuIGF1dGggdHlwZSBjaGFuZ2VzXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVmFsaWRhdGlvblJ1bGVzKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGF1dGhlbnRpY2F0aW9uIHR5cGUgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycygpIHtcbiAgICAgICAgLy8gQXR0YWNoIGluaXRpYWwgaGFuZGxlclxuICAgICAgICBtYWlsU2V0dGluZ3MucmVBdHRhY2hBdXRoVHlwZUhhbmRsZXIoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIG9uIHBhZ2UgbG9hZCAtIGRvbid0IGNoZWNrIE9BdXRoMiBzdGF0dXMgeWV0ICh3aWxsIGJlIGRvbmUgaW4gbG9hZERhdGEpXG4gICAgICAgIGNvbnN0IGN1cnJlbnRBdXRoVHlwZSA9ICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdOmNoZWNrZWQnKS52YWwoKSB8fCAncGFzc3dvcmQnO1xuICAgICAgICBtYWlsU2V0dGluZ3MudG9nZ2xlQXV0aEZpZWxkc1dpdGhvdXRTdGF0dXMoY3VycmVudEF1dGhUeXBlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGF1dGhlbnRpY2F0aW9uIGZpZWxkcyB3aXRob3V0IGNoZWNraW5nIE9BdXRoMiBzdGF0dXMgKGZvciBpbml0aWFsIHNldHVwKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhdXRoVHlwZSAtIEF1dGhlbnRpY2F0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB0b2dnbGVBdXRoRmllbGRzV2l0aG91dFN0YXR1cyhhdXRoVHlwZSkge1xuICAgICAgICBjb25zdCAkdXNlcm5hbWVGaWVsZCA9ICQoJyNNYWlsU01UUFVzZXJuYW1lJykuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgIGNvbnN0ICRwYXNzd29yZEZpZWxkID0gJCgnI01haWxTTVRQUGFzc3dvcmQnKS5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgY29uc3QgJG9hdXRoMlNlY3Rpb24gPSAkKCcjb2F1dGgyLWF1dGgtc2VjdGlvbicpO1xuXG4gICAgICAgIGlmIChhdXRoVHlwZSA9PT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgIC8vIEZvciBPQXV0aDI6IHNob3cgdXNlcm5hbWUgKHJlcXVpcmVkIGZvciBlbWFpbCBpZGVudGlmaWNhdGlvbiksIGhpZGUgcGFzc3dvcmRcbiAgICAgICAgICAgICR1c2VybmFtZUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICRwYXNzd29yZEZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICRvYXV0aDJTZWN0aW9uLnNob3coKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgcGFzc3dvcmQgZmllbGQgZXJyb3JzXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdNYWlsU01UUFBhc3N3b3JkJyk7XG4gICAgICAgICAgICAkcGFzc3dvcmRGaWVsZC5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBwYXNzd29yZCBhdXRoOiBzaG93IGJvdGggdXNlcm5hbWUgYW5kIHBhc3N3b3JkXG4gICAgICAgICAgICAkdXNlcm5hbWVGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAkcGFzc3dvcmRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAkb2F1dGgyU2VjdGlvbi5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIE9BdXRoMiBmaWVsZCBlcnJvcnNcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ01haWxPQXV0aDJQcm92aWRlcicpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnTWFpbE9BdXRoMkNsaWVudElkJyk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdNYWlsT0F1dGgyQ2xpZW50U2VjcmV0Jyk7XG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMkNsaWVudElkJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBhdXRoZW50aWNhdGlvbiBmaWVsZHMgYmFzZWQgb24gdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhdXRoVHlwZSAtIEF1dGhlbnRpY2F0aW9uIHR5cGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW3NldHRpbmdzXSAtIE9wdGlvbmFsIHNldHRpbmdzIGRhdGEgdG8gYXZvaWQgYWRkaXRpb25hbCBBUEkgY2FsbFxuICAgICAqL1xuICAgIHRvZ2dsZUF1dGhGaWVsZHMoYXV0aFR5cGUsIHNldHRpbmdzID0gbnVsbCkge1xuICAgICAgICAvLyBGaXJzdCB0b2dnbGUgZmllbGRzIHdpdGhvdXQgc3RhdHVzIGNoZWNrXG4gICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVBdXRoRmllbGRzV2l0aG91dFN0YXR1cyhhdXRoVHlwZSk7XG5cbiAgICAgICAgLy8gVGhlbiBjaGVjayBPQXV0aDIgc3RhdHVzIG9ubHkgaWYgbmVlZGVkXG4gICAgICAgIGlmIChhdXRoVHlwZSA9PT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgIGlmIChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBleGlzdGluZyBzZXR0aW5ncyBkYXRhIHRvIGF2b2lkIGR1cGxpY2F0ZSBBUEkgY2FsbFxuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVPQXV0aDJTdGF0dXMoc2V0dGluZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byBBUEkgY2FsbCBpZiBubyBzZXR0aW5ncyBwcm92aWRlZFxuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5jaGVja09BdXRoMlN0YXR1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGVzdCBidXR0b25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRlc3RCdXR0b25zKCkge1xuICAgICAgICAvLyBUZXN0IGNvbm5lY3Rpb24gYnV0dG9uXG4gICAgICAgICQoJyN0ZXN0LWNvbm5lY3Rpb24tYnV0dG9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgYnV0dG9uIGlzIGRpc2FibGVkXG4gICAgICAgICAgICBpZiAoJChlLmN1cnJlbnRUYXJnZXQpLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEb3VibGUtY2hlY2sgZm9yIHVuc2F2ZWQgY2hhbmdlc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmhhc0NoYW5nZXMgJiYgRm9ybS5oYXNDaGFuZ2VzKCkpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudGVzdENvbm5lY3Rpb24oKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2VuZCB0ZXN0IGVtYWlsIGJ1dHRvblxuICAgICAgICAkKCcjc2VuZC10ZXN0LWVtYWlsLWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBpcyBkaXNhYmxlZFxuICAgICAgICAgICAgaWYgKCQoZS5jdXJyZW50VGFyZ2V0KS5oYXNDbGFzcygnZGlzYWJsZWQnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRG91YmxlLWNoZWNrIGZvciB1bnNhdmVkIGNoYW5nZXNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5oYXNDaGFuZ2VzICYmIEZvcm0uaGFzQ2hhbmdlcygpKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TYXZlQ2hhbmdlc0JlZm9yZVRlc3RpbmdcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnNlbmRUZXN0RW1haWwoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERldGVjdCBwcm92aWRlciBmcm9tIGVtYWlsIGFkZHJlc3NcbiAgICAgKi9cbiAgICBkZXRlY3RQcm92aWRlckZyb21FbWFpbCgpIHtcbiAgICAgICAgJCgnI01haWxTTVRQVXNlcm5hbWUnKS5vbignY2hhbmdlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVtYWlsID0gJChlLnRhcmdldCkudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWVtYWlsKSByZXR1cm47XG5cbiAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gTWFpbFNldHRpbmdzQVBJLmRldGVjdFByb3ZpZGVyKGVtYWlsKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHByb3ZpZGVyIGZpZWxkIHVzaW5nIFNlbWFudGljIFVJIGRyb3Bkb3duIChWNS4wIHBhdHRlcm4pXG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHByb3ZpZGVyKTtcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXInKS52YWwocHJvdmlkZXIpO1xuXG4gICAgICAgICAgICAvLyBTaG93IHJlY29tbWVuZGF0aW9ucyBiYXNlZCBvbiBwcm92aWRlclxuICAgICAgICAgICAgaWYgKHByb3ZpZGVyID09PSAnZ29vZ2xlJykge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zaG93UHJvdmlkZXJIaW50KCdHbWFpbCBkZXRlY3RlZC4gT0F1dGgyIGF1dGhlbnRpY2F0aW9uIHdpbGwgYmUgcmVxdWlyZWQgZnJvbSBNYXJjaCAyMDI1LicpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm92aWRlciA9PT0gJ21pY3Jvc29mdCcpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Muc2hvd1Byb3ZpZGVySGludCgnTWljcm9zb2Z0L091dGxvb2sgZGV0ZWN0ZWQuIE9BdXRoMiBhdXRoZW50aWNhdGlvbiByZWNvbW1lbmRlZC4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgPT09ICd5YW5kZXgnKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnNob3dQcm92aWRlckhpbnQoJ1lhbmRleCBNYWlsIGRldGVjdGVkLiBCb3RoIHBhc3N3b3JkIGFuZCBPQXV0aDIgYXV0aGVudGljYXRpb24gc3VwcG9ydGVkLicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvLWZpbGwgU01UUCBzZXR0aW5ncyBiYXNlZCBvbiBwcm92aWRlclxuICAgICAgICAgICAgbWFpbFNldHRpbmdzLmF1dG9GaWxsU01UUFNldHRpbmdzKHByb3ZpZGVyKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBNYWlsU01UUFVzZXJuYW1lIHBsYWNlaG9sZGVyIHdpdGggTWFpbFNNVFBTZW5kZXJBZGRyZXNzIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbmRlckFkZHJlc3MgLSBFbWFpbCBhZGRyZXNzIGZyb20gTWFpbFNNVFBTZW5kZXJBZGRyZXNzIGZpZWxkXG4gICAgICovXG4gICAgdXBkYXRlVXNlcm5hbWVQbGFjZWhvbGRlcihzZW5kZXJBZGRyZXNzKSB7XG4gICAgICAgIGNvbnN0ICR1c2VybmFtZUZpZWxkID0gJCgnI01haWxTTVRQVXNlcm5hbWUnKTtcbiAgICAgICAgaWYgKHNlbmRlckFkZHJlc3MgJiYgc2VuZGVyQWRkcmVzcy50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAkdXNlcm5hbWVGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIHNlbmRlckFkZHJlc3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHVzZXJuYW1lRmllbGQucmVtb3ZlQXR0cigncGxhY2Vob2xkZXInKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIE1haWxTTVRQU2VuZGVyQWRkcmVzcyBjaGFuZ2UgaGFuZGxlciB0byB1cGRhdGUgdXNlcm5hbWUgcGxhY2Vob2xkZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIoKSB7XG4gICAgICAgICQoJyNNYWlsU01UUFNlbmRlckFkZHJlc3MnKS5vbignaW5wdXQgY2hhbmdlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNlbmRlckFkZHJlc3MgPSAkKGUudGFyZ2V0KS52YWwoKTtcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVVc2VybmFtZVBsYWNlaG9sZGVyKHNlbmRlckFkZHJlc3MpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXV0by1maWxsIFNNVFAgc2V0dGluZ3MgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXIgLSBFbWFpbCBwcm92aWRlclxuICAgICAqL1xuICAgIGF1dG9GaWxsU01UUFNldHRpbmdzKHByb3ZpZGVyKSB7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0ge1xuICAgICAgICAgICAgZ29vZ2xlOiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAuZ21haWwuY29tJyxcbiAgICAgICAgICAgICAgICBwb3J0OiAnNTg3JyxcbiAgICAgICAgICAgICAgICB0bHM6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtaWNyb3NvZnQ6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC5vZmZpY2UzNjUuY29tJyxcbiAgICAgICAgICAgICAgICBwb3J0OiAnNTg3JyxcbiAgICAgICAgICAgICAgICB0bHM6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB5YW5kZXg6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC55YW5kZXguY29tJyxcbiAgICAgICAgICAgICAgICBwb3J0OiAnNDY1JyxcbiAgICAgICAgICAgICAgICB0bHM6IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHNldHRpbmdzW3Byb3ZpZGVyXSkge1xuICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJTZXR0aW5ncyA9IHNldHRpbmdzW3Byb3ZpZGVyXTtcblxuICAgICAgICAgICAgLy8gT25seSBmaWxsIGlmIGZpZWxkcyBhcmUgZW1wdHlcbiAgICAgICAgICAgIGlmICghJCgnI01haWxTTVRQSG9zdCcpLnZhbCgpKSB7XG4gICAgICAgICAgICAgICAgJCgnI01haWxTTVRQSG9zdCcpLnZhbChwcm92aWRlclNldHRpbmdzLmhvc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCEkKCcjTWFpbFNNVFBQb3J0JykudmFsKCkpIHtcbiAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBQb3J0JykudmFsKHByb3ZpZGVyU2V0dGluZ3MucG9ydCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBlbmNyeXB0aW9uIGRyb3Bkb3duXG4gICAgICAgICAgICBjb25zdCAkZW5jcnlwdGlvbkRyb3Bkb3duID0gJCgnI01haWxTTVRQVXNlVExTLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoJGVuY3J5cHRpb25Ecm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gUHJvdmlkZXIgc2V0dGluZ3MgZm9yIGVuY3J5cHRpb25cbiAgICAgICAgICAgICAgICBsZXQgZW5jcnlwdGlvblZhbHVlID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgIGlmIChwcm92aWRlclNldHRpbmdzLnBvcnQgPT09ICc1ODcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGVuY3J5cHRpb25WYWx1ZSA9ICd0bHMnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXJTZXR0aW5ncy5wb3J0ID09PSAnNDY1Jykge1xuICAgICAgICAgICAgICAgICAgICBlbmNyeXB0aW9uVmFsdWUgPSAnc3NsJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJGVuY3J5cHRpb25Ecm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZW5jcnlwdGlvblZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgU01UUCBzZXR0aW5ncyB3aGVuIE9BdXRoMiBwcm92aWRlciBpcyBzZWxlY3RlZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlciAtIFNlbGVjdGVkIE9BdXRoMiBwcm92aWRlciAoZ29vZ2xlLCBtaWNyb3NvZnQsIHlhbmRleClcbiAgICAgKi9cbiAgICB1cGRhdGVTTVRQU2V0dGluZ3NGb3JQcm92aWRlcihwcm92aWRlcikge1xuICAgICAgICAvLyBEb24ndCBhdXRvLWZpbGwgdW50aWwgaW5pdGlhbCBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBpZiAoIW1haWxTZXR0aW5ncy5kYXRhTG9hZGVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiBPQXV0aDIgYXV0aCB0eXBlIGlzIHNlbGVjdGVkXG4gICAgICAgIGNvbnN0IGF1dGhUeXBlID0gJCgnaW5wdXRbbmFtZT1cIk1haWxTTVRQQXV0aFR5cGVcIl06Y2hlY2tlZCcpLnZhbCgpO1xuICAgICAgICBpZiAoYXV0aFR5cGUgIT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZWZpbmUgcHJvdmlkZXIgU01UUCBzZXR0aW5nc1xuICAgICAgICBjb25zdCBwcm92aWRlclNldHRpbmdzID0ge1xuICAgICAgICAgICAgZ29vZ2xlOiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAuZ21haWwuY29tJyxcbiAgICAgICAgICAgICAgICBwb3J0OiAnNTg3JyxcbiAgICAgICAgICAgICAgICBlbmNyeXB0aW9uOiAndGxzJyxcbiAgICAgICAgICAgICAgICBjZXJ0Q2hlY2s6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtaWNyb3NvZnQ6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC1tYWlsLm91dGxvb2suY29tJyxcbiAgICAgICAgICAgICAgICBwb3J0OiAnNTg3JyxcbiAgICAgICAgICAgICAgICBlbmNyeXB0aW9uOiAndGxzJyxcbiAgICAgICAgICAgICAgICBjZXJ0Q2hlY2s6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB5YW5kZXg6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC55YW5kZXgucnUnLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIGVuY3J5cHRpb246ICd0bHMnLFxuICAgICAgICAgICAgICAgIGNlcnRDaGVjazogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gcHJvdmlkZXJTZXR0aW5nc1twcm92aWRlcl07XG4gICAgICAgIGlmICghc2V0dGluZ3MpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBob3N0XG4gICAgICAgICQoJyNNYWlsU01UUEhvc3QnKS52YWwoc2V0dGluZ3MuaG9zdCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHBvcnRcbiAgICAgICAgJCgnI01haWxTTVRQUG9ydCcpLnZhbChzZXR0aW5ncy5wb3J0KTtcblxuICAgICAgICAvLyBVcGRhdGUgZW5jcnlwdGlvbiB0eXBlXG4gICAgICAgICQoJyNNYWlsU01UUFVzZVRMUycpLnZhbChzZXR0aW5ncy5lbmNyeXB0aW9uKTtcbiAgICAgICAgJCgnI01haWxTTVRQVXNlVExTLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNldHRpbmdzLmVuY3J5cHRpb24pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBjZXJ0aWZpY2F0ZSBjaGVja1xuICAgICAgICBpZiAoc2V0dGluZ3MuY2VydENoZWNrKSB7XG4gICAgICAgICAgICAkKCcjTWFpbFNNVFBDZXJ0Q2hlY2snKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcG9ydCBiYXNlZCBvbiBzZWxlY3RlZCBlbmNyeXB0aW9uIHR5cGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZW5jcnlwdGlvblR5cGUgLSBTZWxlY3RlZCBlbmNyeXB0aW9uIHR5cGUgKG5vbmUvdGxzL3NzbClcbiAgICAgKi9cbiAgICB1cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24oZW5jcnlwdGlvblR5cGUpIHtcbiAgICAgICAgY29uc3QgJHBvcnRGaWVsZCA9ICQoJyNNYWlsU01UUFBvcnQnKTtcblxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB0aGUgdXNlciBoYXNuJ3QgbWFudWFsbHkgY2hhbmdlZCB0aGUgcG9ydFxuICAgICAgICBjb25zdCBjdXJyZW50UG9ydCA9ICRwb3J0RmllbGQudmFsKCk7XG4gICAgICAgIGNvbnN0IHN0YW5kYXJkUG9ydHMgPSBbJzI1JywgJzU4NycsICc0NjUnLCAnJ107XG5cbiAgICAgICAgaWYgKHN0YW5kYXJkUG9ydHMuaW5jbHVkZXMoY3VycmVudFBvcnQpKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGVuY3J5cHRpb25UeXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgICAgICRwb3J0RmllbGQudmFsKCcyNScpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0bHMnOlxuICAgICAgICAgICAgICAgICAgICAkcG9ydEZpZWxkLnZhbCgnNTg3Jyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3NzbCc6XG4gICAgICAgICAgICAgICAgICAgICRwb3J0RmllbGQudmFsKCc0NjUnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93L2hpZGUgY2VydGlmaWNhdGUgY2hlY2sgYmFzZWQgb24gZW5jcnlwdGlvbiB0eXBlXG4gICAgICAgIGNvbnN0ICRjZXJ0Q2hlY2tGaWVsZCA9ICQoJyNjZXJ0LWNoZWNrLWZpZWxkJyk7XG4gICAgICAgIGlmIChlbmNyeXB0aW9uVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAvLyBIaWRlIGNlcnRpZmljYXRlIGNoZWNrIGZvciB1bmVuY3J5cHRlZCBjb25uZWN0aW9uc1xuICAgICAgICAgICAgJGNlcnRDaGVja0ZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgIC8vIFVuY2hlY2sgdGhlIGNlcnRpZmljYXRlIGNoZWNrIHdoZW4gaGlkaW5nXG4gICAgICAgICAgICAkKCcjTWFpbFNNVFBDZXJ0Q2hlY2snKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBjZXJ0aWZpY2F0ZSBjaGVjayBmb3IgVExTL1NTTCBjb25uZWN0aW9uc1xuICAgICAgICAgICAgJGNlcnRDaGVja0ZpZWxkLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IHByb3ZpZGVyIGhpbnQgbWVzc2FnZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIC0gSGludCBtZXNzYWdlXG4gICAgICovXG4gICAgc2hvd1Byb3ZpZGVySGludChtZXNzYWdlKSB7XG4gICAgICAgIGNvbnN0ICRoaW50ID0gJCgnI3Byb3ZpZGVyLWhpbnQnKTtcbiAgICAgICAgaWYgKCRoaW50Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJCgnI01haWxTTVRQVXNlcm5hbWUnKS5hZnRlcihgPGRpdiBpZD1cInByb3ZpZGVyLWhpbnRcIiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZVwiPiR7bWVzc2FnZX08L2Rpdj5gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRoaW50LnRleHQobWVzc2FnZSkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBPQXV0aDIgY2FsbGJhY2sgcGFyYW1ldGVycyBmcm9tIFVSTFxuICAgICAqL1xuICAgIGhhbmRsZU9BdXRoMkNhbGxiYWNrKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBzdWNjZXNzXG4gICAgICAgIGlmICh1cmxQYXJhbXMuaGFzKCdvYXV0aF9zdWNjZXNzJykpIHtcbiAgICAgICAgICAgIC8vIFJlbG9hZCBzZXR0aW5ncyB0byBzaG93IHVwZGF0ZWQgT0F1dGgyIHN0YXR1c1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLmxvYWRTZXR0aW5nc0Zyb21BUEkoKTtcbiAgICAgICAgICAgIC8vIENsZWFuIFVSTFxuICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCBkb2N1bWVudC50aXRsZSwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGZvciBlcnJvclxuICAgICAgICBpZiAodXJsUGFyYW1zLmhhcygnb2F1dGhfZXJyb3InKSkge1xuICAgICAgICAgICAgY29uc3QgZXJyb3IgPSB1cmxQYXJhbXMuZ2V0KCdvYXV0aF9lcnJvcicpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFxuICAgICAgICAgICAgICAgIChnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyQXV0aG9yaXphdGlvbkZhaWxlZCB8fCAn0J7RiNC40LHQutCwIE9BdXRoMiDQsNCy0YLQvtGA0LjQt9Cw0YbQuNC4OiAnKSArIGRlY29kZVVSSUNvbXBvbmVudChlcnJvcilcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBDbGVhbiBVUkxcbiAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgZG9jdW1lbnQudGl0bGUsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnQgT0F1dGgyIGF1dGhvcml6YXRpb24gZmxvd1xuICAgICAqL1xuICAgIHN0YXJ0T0F1dGgyRmxvdygpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykudmFsKCkgfHwgJCgnI01haWxPQXV0aDJQcm92aWRlci1kcm9wZG93bicpLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcblxuICAgICAgICBpZiAoIXByb3ZpZGVyIHx8IHByb3ZpZGVyID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU9BdXRoMlByb3ZpZGVyRW1wdHkgfHwgJ9CS0YvQsdC10YDQuNGC0LUgT0F1dGgyINC/0YDQvtCy0LDQudC00LXRgNCwJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBDbGllbnQgSUQgYW5kIFNlY3JldCBhcmUgY29uZmlndXJlZFxuICAgICAgICBjb25zdCBjbGllbnRJZCA9ICQoJyNNYWlsT0F1dGgyQ2xpZW50SWQnKS52YWwoKTtcbiAgICAgICAgY29uc3QgY2xpZW50U2VjcmV0ID0gJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS52YWwoKTtcblxuICAgICAgICBpZiAoIWNsaWVudElkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50SWRFbXB0eSB8fCAn0JLQstC10LTQuNGC0LUgQ2xpZW50IElEJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWNsaWVudFNlY3JldCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU9BdXRoMkNsaWVudFNlY3JldEVtcHR5IHx8ICfQktCy0LXQtNC40YLQtSBDbGllbnQgU2VjcmV0Jyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIE9BdXRoMiBjcmVkZW50aWFscyBiZWZvcmUgc3RhcnRpbmcgdGhlIGZsb3dcbiAgICAgICAgbWFpbFNldHRpbmdzLnNhdmVPQXV0aDJDcmVkZW50aWFscyhwcm92aWRlciwgY2xpZW50SWQsIGNsaWVudFNlY3JldCk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZSBPQXV0aDIgY3JlZGVudGlhbHMgYW5kIHRoZW4gc3RhcnQgYXV0aG9yaXphdGlvbiBmbG93XG4gICAgICovXG4gICAgc2F2ZU9BdXRoMkNyZWRlbnRpYWxzKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0KSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICBNYWlsT0F1dGgyUHJvdmlkZXI6IHByb3ZpZGVyLFxuICAgICAgICAgICAgTWFpbE9BdXRoMkNsaWVudElkOiBjbGllbnRJZCxcbiAgICAgICAgICAgIE1haWxPQXV0aDJDbGllbnRTZWNyZXQ6IGNsaWVudFNlY3JldFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFVzZSBNYWlsU2V0dGluZ3NBUEkgZm9yIGNvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmdcbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLnBhdGNoU2V0dGluZ3MoZGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlZGVudGlhbHMgc2F2ZWQsIG5vdyBnZXQgT0F1dGgyIFVSTFxuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5wcm9jZWVkV2l0aE9BdXRoMkZsb3cocHJvdmlkZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTWFpbFNldHRpbmdzXSBGYWlsZWQgdG8gc2F2ZSBPQXV0aDIgY3JlZGVudGlhbHM6JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yXG4gICAgICAgICAgICAgICAgICAgID8gcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKVxuICAgICAgICAgICAgICAgICAgICA6ICdGYWlsZWQgdG8gc2F2ZSBPQXV0aDIgY3JlZGVudGlhbHMnO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBPQXV0aDIgYXV0aG9yaXphdGlvbiBVUkwgYW5kIG9wZW4gYXV0aG9yaXphdGlvbiB3aW5kb3dcbiAgICAgKi9cbiAgICByZXF1ZXN0T0F1dGgyQXV0aFVybChwcm92aWRlciwgY2xpZW50SWQsIGNsaWVudFNlY3JldCkge1xuICAgICAgICAvLyBSZXF1ZXN0IGF1dGhvcml6YXRpb24gVVJMIGZyb20gQVBJXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5hdXRob3JpemVPQXV0aDIocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQsIChhdXRoVXJsKSA9PiB7XG5cbiAgICAgICAgICAgIGlmIChhdXRoVXJsKSB7XG4gICAgICAgICAgICAgICAgLy8gT3BlbiBhdXRob3JpemF0aW9uIHdpbmRvd1xuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gNjAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IDcwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBsZWZ0ID0gKHNjcmVlbi53aWR0aCAvIDIpIC0gKHdpZHRoIC8gMik7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9wID0gKHNjcmVlbi5oZWlnaHQgLyAyKSAtIChoZWlnaHQgLyAyKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGF1dGhXaW5kb3cgPSB3aW5kb3cub3BlbihcbiAgICAgICAgICAgICAgICAgICAgYXV0aFVybCxcbiAgICAgICAgICAgICAgICAgICAgJ29hdXRoMi1hdXRoJyxcbiAgICAgICAgICAgICAgICAgICAgYHdpZHRoPSR7d2lkdGh9LGhlaWdodD0ke2hlaWdodH0sbGVmdD0ke2xlZnR9LHRvcD0ke3RvcH1gXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGlmICghYXV0aFdpbmRvdykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ1BsZWFzZSBhbGxvdyBwb3B1cHMgZm9yIE9BdXRoMiBhdXRob3JpemF0aW9uJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMkF1dGhvcml6YXRpb25GYWlsZWQgfHwgJ9Ce0YjQuNCx0LrQsCDQsNCy0YLQvtGA0LjQt9Cw0YbQuNC4IE9BdXRoMicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJvY2VlZCB3aXRoIE9BdXRoMiBmbG93IGFmdGVyIGNyZWRlbnRpYWxzIGFyZSBzYXZlZFxuICAgICAqL1xuICAgIHByb2NlZWRXaXRoT0F1dGgyRmxvdyhwcm92aWRlcikge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgJCgnI29hdXRoMi1jb25uZWN0JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBHZXQgT0F1dGgyIFVSTCB3aXRoIHNhdmVkIGNyZWRlbnRpYWxzXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5nZXRPQXV0aDJVcmwocHJvdmlkZXIsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJCgnI29hdXRoMi1jb25uZWN0JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmF1dGhfdXJsKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBPcGVuIE9BdXRoMiB3aW5kb3dcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IDYwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWlnaHQgPSA3MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IChzY3JlZW4ud2lkdGggLyAyKSAtICh3aWR0aCAvIDIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvcCA9IChzY3JlZW4uaGVpZ2h0IC8gMikgLSAoaGVpZ2h0IC8gMik7XG5cbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93ID0gd2luZG93Lm9wZW4oXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmF1dGhfdXJsLFxuICAgICAgICAgICAgICAgICAgICAnT0F1dGgyQXV0aG9yaXphdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIGB3aWR0aD0ke3dpZHRofSxoZWlnaHQ9JHtoZWlnaHR9LGxlZnQ9JHtsZWZ0fSx0b3A9JHt0b3B9YFxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB3aW5kb3cgd2FzIGJsb2NrZWRcbiAgICAgICAgICAgICAgICBpZiAoIW1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdQbGVhc2UgYWxsb3cgcG9wdXBzIGZvciBPQXV0aDIgYXV0aG9yaXphdGlvbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW01haWxTZXR0aW5nc10gTm8gYXV0aF91cmwgaW4gcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignRmFpbGVkIHRvIGdldCBPQXV0aDIgYXV0aG9yaXphdGlvbiBVUkwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBPQXV0aDIgY2FsbGJhY2sgbWVzc2FnZVxuICAgICAqIEBwYXJhbSB7TWVzc2FnZUV2ZW50fSBldmVudCAtIE1lc3NhZ2UgZXZlbnRcbiAgICAgKi9cbiAgICBoYW5kbGVPQXV0aDJNZXNzYWdlKGV2ZW50KSB7XG4gICAgICAgIC8vIFZhbGlkYXRlIG9yaWdpblxuICAgICAgICBpZiAoZXZlbnQub3JpZ2luICE9PSB3aW5kb3cubG9jYXRpb24ub3JpZ2luKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBmb3IgT0F1dGgyIGNhbGxiYWNrIGRhdGFcbiAgICAgICAgaWYgKGV2ZW50LmRhdGEgJiYgZXZlbnQuZGF0YS50eXBlID09PSAnb2F1dGgyLWNhbGxiYWNrJykge1xuICAgICAgICAgICAgLy8gQ2xvc2UgT0F1dGgyIHdpbmRvd1xuICAgICAgICAgICAgaWYgKG1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdyA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFByb2Nlc3MgY2FsbGJhY2tcbiAgICAgICAgICAgIE1haWxTZXR0aW5nc0FQSS5oYW5kbGVPQXV0aDJDYWxsYmFjayhldmVudC5kYXRhLnBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oJ09BdXRoMiBhdXRob3JpemF0aW9uIHN1Y2Nlc3NmdWwnKTtcbiAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdPQXV0aDIgYXV0aG9yaXphdGlvbiBmYWlsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgT0F1dGgyIHN0YXR1cyBkaXNwbGF5IHVzaW5nIHByb3ZpZGVkIHNldHRpbmdzIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhIGNvbnRhaW5pbmcgb2F1dGgyX3N0YXR1c1xuICAgICAqL1xuICAgIHVwZGF0ZU9BdXRoMlN0YXR1cyhzZXR0aW5ncykge1xuICAgICAgICBpZiAoc2V0dGluZ3MgJiYgc2V0dGluZ3Mub2F1dGgyX3N0YXR1cykge1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gc2V0dGluZ3Mub2F1dGgyX3N0YXR1cztcbiAgICAgICAgICAgIGNvbnN0ICRzdGF0dXNEaXYgPSAkKCcjb2F1dGgyLXN0YXR1cycpO1xuICAgICAgICAgICAgY29uc3QgJGNsaWVudElkRmllbGQgPSAkKCcjTWFpbE9BdXRoMkNsaWVudElkJykuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCAkY2xpZW50U2VjcmV0RmllbGQgPSAkKCcjTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuXG4gICAgICAgICAgICBpZiAoc3RhdHVzLmNvbmZpZ3VyZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlck5hbWUgPSBNYWlsU2V0dGluZ3NBUEkuZ2V0UHJvdmlkZXJOYW1lKHN0YXR1cy5wcm92aWRlcik7XG4gICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGVkVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJDb25uZWN0ZWRUby5yZXBsYWNlKCd7cHJvdmlkZXJ9JywgcHJvdmlkZXJOYW1lKTtcblxuICAgICAgICAgICAgICAgIC8vIERvbid0IGFkZCBleHRyYSBzdGF0dXMgdGV4dCAtIFwiQ29ubmVjdGVkXCIgYWxyZWFkeSBpbXBsaWVzIGF1dGhvcml6ZWRcbiAgICAgICAgICAgICAgICAkc3RhdHVzRGl2Lmh0bWwoYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjaGVjayBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Y29ubmVjdGVkVGV4dH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgJCgnI29hdXRoMi1jb25uZWN0JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICQoJyNvYXV0aDItZGlzY29ubmVjdCcpLnNob3coKTtcblxuICAgICAgICAgICAgICAgIC8vIEhpZGUgQ2xpZW50IElEIGFuZCBDbGllbnQgU2VjcmV0IGZpZWxkcyB3aGVuIGF1dGhvcml6ZWRcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzLmF1dGhvcml6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNsaWVudElkRmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkY2xpZW50U2VjcmV0RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRJZEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGNsaWVudFNlY3JldEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0dXNEaXYuaHRtbChgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMk5vdENvbmZpZ3VyZWR9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWRpc2Nvbm5lY3QnKS5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IENsaWVudCBJRCBhbmQgQ2xpZW50IFNlY3JldCBmaWVsZHMgd2hlbiBub3QgYXV0aG9yaXplZFxuICAgICAgICAgICAgICAgICRjbGllbnRJZEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xpZW50U2VjcmV0RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIE9BdXRoMiBjb25uZWN0aW9uIHN0YXR1cyAobWFrZXMgQVBJIGNhbGwpXG4gICAgICovXG4gICAgY2hlY2tPQXV0aDJTdGF0dXMoKSB7XG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5nZXRTZXR0aW5ncygoc2V0dGluZ3MpID0+IHtcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVPQXV0aDJTdGF0dXMoc2V0dGluZ3MpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzY29ubmVjdCBPQXV0aDJcbiAgICAgKi9cbiAgICBkaXNjb25uZWN0T0F1dGgyKCkge1xuICAgICAgICAvLyBDbGVhciBPQXV0aDIgdG9rZW5zIGltbWVkaWF0ZWx5IHdpdGhvdXQgY29uZmlybWF0aW9uXG4gICAgICAgIGNvbnN0IGNsZWFyRGF0YSA9IHtcbiAgICAgICAgICAgIE1haWxPQXV0aDJSZWZyZXNoVG9rZW46ICcnLFxuICAgICAgICAgICAgTWFpbE9BdXRoMkFjY2Vzc1Rva2VuOiAnJyxcbiAgICAgICAgICAgIE1haWxPQXV0aDJUb2tlbkV4cGlyZXM6ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLnBhdGNoU2V0dGluZ3MoY2xlYXJEYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBKdXN0IHVwZGF0ZSB0aGUgc3RhdHVzIHdpdGhvdXQgc2hvd2luZyBhIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuY2hlY2tPQXV0aDJTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBDbGllbnQgSUQgYW5kIENsaWVudCBTZWNyZXQgZmllbGRzIGFnYWluXG4gICAgICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLmNsb3Nlc3QoJy5maWVsZCcpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkKCcjTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpLmNsb3Nlc3QoJy5maWVsZCcpLnNob3coKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdGYWlsZWQgdG8gZGlzY29ubmVjdCBPQXV0aDInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRlc3QgU01UUCBjb25uZWN0aW9uXG4gICAgICovXG4gICAgdGVzdENvbm5lY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjdGVzdC1jb25uZWN0aW9uLWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkcmVzdWx0QXJlYSA9ICQoJyN0ZXN0LWNvbm5lY3Rpb24tcmVzdWx0Jyk7XG5cbiAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgcmVzdWx0XG4gICAgICAgICRyZXN1bHRBcmVhLnJlbW92ZSgpO1xuXG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkudGVzdENvbm5lY3Rpb24oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSByZXN1bHQgYXJlYSBuZXh0IHRvIGJ1dHRvblxuICAgICAgICAgICAgbGV0ICRyZXN1bHQgPSAkKCc8ZGl2IGlkPVwidGVzdC1jb25uZWN0aW9uLXJlc3VsdFwiIGNsYXNzPVwidWkgc21hbGwgbWVzc2FnZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgJGJ1dHRvbi5wYXJlbnQoKS5hcHBlbmQoJHJlc3VsdCk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmFkZENsYXNzKCdwb3NpdGl2ZScpLmh0bWwoJzxpIGNsYXNzPVwiY2hlY2sgY2lyY2xlIGljb25cIj48L2k+ICcgKyAocmVzcG9uc2UubWVzc2FnZXM/LnN1Y2Nlc3M/LlswXSB8fCAnQ29ubmVjdGlvbiBzdWNjZXNzZnVsJykpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBkaWFnbm9zdGljcyBpbmZvIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhPy5kaWFnbm9zdGljcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaWFnID0gcmVzcG9uc2UuZGF0YS5kaWFnbm9zdGljcztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgQXV0aDogJHtkaWFnLmF1dGhfdHlwZX0sIFNlcnZlcjogJHtkaWFnLnNtdHBfaG9zdH06JHtkaWFnLnNtdHBfcG9ydH0sIEVuY3J5cHRpb246ICR7ZGlhZy5zbXRwX2VuY3J5cHRpb259YDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcuYXV0aF90eXBlID09PSAnb2F1dGgyJyAmJiBkaWFnLm9hdXRoMl9wcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgPGJyPk9BdXRoMjogJHtkaWFnLm9hdXRoMl9wcm92aWRlcn1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2hvdyBleHBpcmVkIHRva2VuIHdhcm5pbmcgaWYgY29ubmVjdGlvbiBpcyBzdWNjZXNzZnVsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhcyBpdCBtZWFucyByZWZyZXNoIHRva2VuIGlzIHdvcmtpbmcgY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlhZy5vYXV0aDJfcmVmcmVzaF90b2tlbl9leGlzdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGAgLSAke2dsb2JhbFRyYW5zbGF0ZS5tc19EaWFnbm9zdGljQXV0aG9yaXplZH1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gJzwvc21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlscyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHNpbXBsZSwgdXNlci1mcmllbmRseSBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgbGV0IG1haW5NZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlLm1zX0RpYWdub3N0aWNDb25uZWN0aW9uRmFpbGVkO1xuXG4gICAgICAgICAgICAgICAgLy8gVXNlIGRldGFpbGVkIGVycm9yIGFuYWx5c2lzIGlmIGF2YWlsYWJsZSBmb3IgYmV0dGVyIHVzZXIgZXhwZXJpZW5jZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uZXJyb3JfZGV0YWlscz8ucHJvYmFibGVfY2F1c2UpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbk1lc3NhZ2UgPSByZXNwb25zZS5kYXRhLmVycm9yX2RldGFpbHMucHJvYmFibGVfY2F1c2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygnbmVnYXRpdmUnKS5odG1sKCc8aSBjbGFzcz1cInRpbWVzIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgbWFpbk1lc3NhZ2UpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2tpcCBzaG93aW5nIGVycm9yIHR5cGUgbGFiZWwgLSBpdCdzIHRvbyB0ZWNobmljYWwgZm9yIG1vc3QgdXNlcnNcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgcmF3IFBIUE1haWxlciBlcnJvciBpbiBhIGNvbGxhcHNpYmxlIHNlY3Rpb24gb25seSBpZiBpdCdzIHNpZ25pZmljYW50bHkgZGlmZmVyZW50XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5lcnJvcl9kZXRhaWxzPy5yYXdfZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmF3RXJyb3IgPSByZXNwb25zZS5kYXRhLmVycm9yX2RldGFpbHMucmF3X2Vycm9yO1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHNob3cgdGVjaG5pY2FsIGRldGFpbHMgaWYgdGhleSBjb250YWluIG1vcmUgaW5mbyB0aGFuIHRoZSB1c2VyIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJhd0Vycm9yLmxlbmd0aCA+IG1haW5NZXNzYWdlLmxlbmd0aCArIDUwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGV0YWlsc0h0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHRpbnkgYWNjb3JkaW9uXCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAxMHB4O1wiPic7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSBgPGRpdiBjbGFzcz1cInRpdGxlXCI+PGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLm1zX0RpYWdub3N0aWNUZWNobmljYWxEZXRhaWxzfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSBgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj48Y29kZSBzdHlsZT1cImZvbnQtc2l6ZTogMTFweDsgd29yZC1icmVhazogYnJlYWstYWxsOyBkaXNwbGF5OiBibG9jazsgd2hpdGUtc3BhY2U6IHByZS13cmFwO1wiPiR7cmF3RXJyb3J9PC9jb2RlPjwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGRldGFpbHNIdG1sKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBhY2NvcmRpb24gZm9yIHRlY2huaWNhbCBkZXRhaWxzXG4gICAgICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmZpbmQoJy5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNob3cgbWluaW1hbCBkaWFnbm9zdGljcyBpbmZvIGZvciBmYWlsZWQgY29ubmVjdGlvbnNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmRpYWdub3N0aWNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpYWcgPSByZXNwb25zZS5kYXRhLmRpYWdub3N0aWNzO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGV0YWlscyA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjxzbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGAke2RpYWcuYXV0aF90eXBlLnRvVXBwZXJDYXNlKCl9OiAke2RpYWcuc210cF9ob3N0fToke2RpYWcuc210cF9wb3J0fWA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWFnLnNtdHBfZW5jcnlwdGlvbiAmJiBkaWFnLnNtdHBfZW5jcnlwdGlvbiAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGAgKCR7ZGlhZy5zbXRwX2VuY3J5cHRpb24udG9VcHBlckNhc2UoKX0pYDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9ICc8L3NtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGRldGFpbHMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNob3cgaGludHMgaWYgYXZhaWxhYmxlIC0gbGltaXQgdG8gdG9wIDMgbW9zdCByZWxldmFudCBvbmVzXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5oaW50cyAmJiByZXNwb25zZS5kYXRhLmhpbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGhpbnRzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHN0cm9uZz7QoNC10LrQvtC80LXQvdC00LDRhtC40Lg6PC9zdHJvbmc+PHVsPic7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgbWF4IDMgaGludHMgdG8gYXZvaWQgb3ZlcndoZWxtaW5nIHRoZSB1c2VyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbGV2YW50SGludHMgPSByZXNwb25zZS5kYXRhLmhpbnRzLnNsaWNlKDAsIDMpO1xuICAgICAgICAgICAgICAgICAgICByZWxldmFudEhpbnRzLmZvckVhY2goaGludCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIEVuZ2xpc2ggaGludHMgaWYgd2UgaGF2ZSBSdXNzaWFuIG9uZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoaW50LmluY2x1ZGVzKCdPQXV0aDIgYWNjZXNzIHRva2VuIGV4cGlyZWQnKSAmJiByZWxldmFudEhpbnRzLnNvbWUoaCA9PiBoLmluY2x1ZGVzKCfRgtC+0LrQtdC9JykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaGludHMgKz0gYDxsaT4ke2hpbnR9PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaGludHMgKz0gJzwvdWw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoaGludHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXV0by1oaWRlIGFmdGVyIDMwIHNlY29uZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRyZXN1bHQuZmFkZU91dCg0MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgMzAwMDApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VuZCB0ZXN0IGVtYWlsXG4gICAgICovXG4gICAgc2VuZFRlc3RFbWFpbCgpIHtcbiAgICAgICAgY29uc3QgcmVjaXBpZW50ID0gJCgnI1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCcpLnZhbCgpO1xuXG4gICAgICAgIGlmICghcmVjaXBpZW50KSB7XG4gICAgICAgICAgICAvLyBTaG93IGVycm9yIG5leHQgdG8gYnV0dG9uXG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKTtcbiAgICAgICAgICAgIGxldCAkcmVzdWx0ID0gJCgnPGRpdiBpZD1cInNlbmQtdGVzdC1yZXN1bHRcIiBjbGFzcz1cInVpIHNtYWxsIG5lZ2F0aXZlIG1lc3NhZ2VcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRyZXN1bHQuaHRtbCgnPGkgY2xhc3M9XCJ0aW1lcyBjaXJjbGUgaWNvblwiPjwvaT4gUGxlYXNlIGVudGVyIGEgcmVjaXBpZW50IGVtYWlsIGFkZHJlc3MnKTtcbiAgICAgICAgICAgICQoJyNzZW5kLXRlc3QtcmVzdWx0JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAkYnV0dG9uLnBhcmVudCgpLmFwcGVuZCgkcmVzdWx0KTtcblxuICAgICAgICAgICAgLy8gQXV0by1oaWRlIGFmdGVyIDEwIHNlY29uZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRyZXN1bHQuZmFkZU91dCg0MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgMTAwMDApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJyNzZW5kLXRlc3QtZW1haWwtYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRyZXN1bHRBcmVhID0gJCgnI3NlbmQtdGVzdC1yZXN1bHQnKTtcblxuICAgICAgICAvLyBDbGVhciBwcmV2aW91cyByZXN1bHRcbiAgICAgICAgJHJlc3VsdEFyZWEucmVtb3ZlKCk7XG5cbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICB0bzogcmVjaXBpZW50XG4gICAgICAgICAgICAvLyBMZXQgdGhlIHNlcnZlciBnZW5lcmF0ZSBlbmhhbmNlZCBlbWFpbCBjb250ZW50IHdpdGggc3lzdGVtIGluZm9cbiAgICAgICAgfTtcblxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuc2VuZFRlc3RFbWFpbChkYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHJlc3VsdCBhcmVhIG5leHQgdG8gYnV0dG9uXG4gICAgICAgICAgICBsZXQgJHJlc3VsdCA9ICQoJzxkaXYgaWQ9XCJzZW5kLXRlc3QtcmVzdWx0XCIgY2xhc3M9XCJ1aSBzbWFsbCBtZXNzYWdlXCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAkYnV0dG9uLnBhcmVudCgpLmFwcGVuZCgkcmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgYWN0dWFsIHJlY2lwaWVudCBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0dWFsUmVjaXBpZW50ID0gcmVzcG9uc2UuZGF0YT8udG8gfHwgcmVjaXBpZW50O1xuXG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBtZXNzYWdlIGZyb20gQVBJIHdoaWNoIGFscmVhZHkgaW5jbHVkZXMgdGhlIGVtYWlsIGFkZHJlc3NcbiAgICAgICAgICAgICAgICBsZXQgc3VjY2Vzc01lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcz8uc3VjY2Vzcz8uWzBdIHx8ICdUZXN0IGVtYWlsIHNlbnQnO1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgbWVzc2FnZSBkb2Vzbid0IGluY2x1ZGUgZW1haWwgYnV0IHdlIGhhdmUgaXQsIGFkZCBpdFxuICAgICAgICAgICAgICAgIGlmICghc3VjY2Vzc01lc3NhZ2UuaW5jbHVkZXMoJ0AnKSAmJiBhY3R1YWxSZWNpcGllbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc01lc3NhZ2UgPSBzdWNjZXNzTWVzc2FnZS5yZXBsYWNlKCfQn9C40YHRjNC80L4g0L7RgtC/0YDQsNCy0LvQtdC90L4nLCBg0J/QuNGB0YzQvNC+INC+0YLQv9GA0LDQstC70LXQvdC+IOKGkiAke2FjdHVhbFJlY2lwaWVudH1gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkcmVzdWx0LmFkZENsYXNzKCdwb3NpdGl2ZScpLmh0bWwoXG4gICAgICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cImNoZWNrIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgc3VjY2Vzc01lc3NhZ2VcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBkaWFnbm9zdGljcyBpbmZvIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhPy5kaWFnbm9zdGljcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaWFnID0gcmVzcG9uc2UuZGF0YS5kaWFnbm9zdGljcztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcuYXV0aF90eXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSBkaWFnLm9hdXRoMl9wcm92aWRlciB8fCAnT0F1dGgyJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYFVzaW5nOiBPQXV0aDJgO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyICYmIHByb3ZpZGVyICE9PSAnT0F1dGgyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCAoJHtwcm92aWRlcn0pYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYFVzaW5nOiBQYXNzd29yZCBhdXRoZW50aWNhdGlvbmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgLCBTZXJ2ZXI6ICR7ZGlhZy5zbXRwX2hvc3R9OiR7ZGlhZy5zbXRwX3BvcnR9YDtcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSAnPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSByZXNwb25zZT8ubWVzc2FnZXM/LmVycm9yPy5qb2luKCcsICcpIHx8IGdsb2JhbFRyYW5zbGF0ZS5tc19EaWFnbm9zdGljQ29ubmVjdGlvbkZhaWxlZDtcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmFkZENsYXNzKCduZWdhdGl2ZScpLmh0bWwoJzxpIGNsYXNzPVwidGltZXMgY2lyY2xlIGljb25cIj48L2k+ICcgKyBtZXNzYWdlKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZGV0YWlsZWQgZXJyb3IgYW5hbHlzaXMgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5lcnJvcl9kZXRhaWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yRGV0YWlscyA9IHJlc3BvbnNlLmRhdGEuZXJyb3JfZGV0YWlscztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbHNIdG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcblxuICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIHNob3dpbmcgZXJyb3IgdHlwZSBsYWJlbCAtIGl0J3MgdG9vIHRlY2huaWNhbCBmb3IgbW9zdCB1c2Vyc1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvckRldGFpbHMucHJvYmFibGVfY2F1c2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLm1zX0RpYWdub3N0aWNQcm9iYWJsZUNhdXNlfTwvc3Ryb25nPiAke2Vycm9yRGV0YWlscy5wcm9iYWJsZV9jYXVzZX08YnI+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgcmF3IFBIUE1haWxlciBlcnJvciBpbiBhIGNvbGxhcHNpYmxlIHNlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yRGV0YWlscy5yYXdfZXJyb3IgJiYgZXJyb3JEZXRhaWxzLnJhd19lcnJvciAhPT0gbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGFjY29yZGlvblwiIHN0eWxlPVwibWFyZ2luLXRvcDogMTBweDtcIj4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gYDxkaXYgY2xhc3M9XCJ0aXRsZVwiPjxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5tc19EaWFnbm9zdGljVGVjaG5pY2FsRGV0YWlsc308L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gYDxkaXYgY2xhc3M9XCJjb250ZW50XCI+PGNvZGUgc3R5bGU9XCJmb250LXNpemU6IDExcHg7IHdvcmQtYnJlYWs6IGJyZWFrLWFsbDtcIj4ke2Vycm9yRGV0YWlscy5yYXdfZXJyb3J9PC9jb2RlPjwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGRldGFpbHNIdG1sKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGFjY29yZGlvbiBmb3IgdGVjaG5pY2FsIGRldGFpbHNcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5maW5kKCcuYWNjb3JkaW9uJykuYWNjb3JkaW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBoaW50cyBpZiBhdmFpbGFibGUgLSBsaW1pdCB0byB0b3AgMyBtb3N0IHJlbGV2YW50IG9uZXNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmhpbnRzICYmIHJlc3BvbnNlLmRhdGEuaGludHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgaGludHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c3Ryb25nPtCg0LXQutC+0LzQtdC90LTQsNGG0LjQuDo8L3N0cm9uZz48dWw+JztcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBtYXggMyBoaW50cyB0byBhdm9pZCBvdmVyd2hlbG1pbmcgdGhlIHVzZXJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsZXZhbnRIaW50cyA9IHJlc3BvbnNlLmRhdGEuaGludHMuc2xpY2UoMCwgMyk7XG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW50SGludHMuZm9yRWFjaChoaW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgRW5nbGlzaCBoaW50cyBpZiB3ZSBoYXZlIFJ1c3NpYW4gb25lc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhpbnQuaW5jbHVkZXMoJ09BdXRoMiBhY2Nlc3MgdG9rZW4gZXhwaXJlZCcpICYmIHJlbGV2YW50SGludHMuc29tZShoID0+IGguaW5jbHVkZXMoJ9GC0L7QutC10L0nKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBoaW50cyArPSBgPGxpPiR7aGludH08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBoaW50cyArPSAnPC91bD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChoaW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMzAgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5mYWRlT3V0KDQwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAzMDAwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gR2V0IHVubWFza2VkIHZhbHVlcyBmb3IgZW1haWwgZmllbGRzIEZJUlNUXG4gICAgICAgIGNvbnN0IGVtYWlsRmllbGRzID0gW1xuICAgICAgICAgICAgJ01haWxTTVRQU2VuZGVyQWRkcmVzcycsXG4gICAgICAgICAgICAnU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ1xuICAgICAgICBdO1xuXG4gICAgICAgIGVtYWlsRmllbGRzLmZvckVhY2goZmllbGRJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IG9yaWdpbmFsVmFsdWUgPSAkZmllbGQudmFsKCkgfHwgJyc7XG4gICAgICAgICAgICAgICAgbGV0IGZpZWxkVmFsdWUgPSBvcmlnaW5hbFZhbHVlO1xuXG4gICAgICAgICAgICAgICAgLy8gRm9yIGVtYWlsIGlucHV0bWFzaywgdHJ5IGRpZmZlcmVudCBhcHByb2FjaGVzIHRvIGdldCBjbGVhbiB2YWx1ZVxuICAgICAgICAgICAgICAgIGlmIChmaWVsZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHZhbHVlIGNvbnRhaW5zIHBsYWNlaG9sZGVyIHBhdHRlcm5zXG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZFZhbHVlLmluY2x1ZGVzKCdfQF8nKSB8fCBmaWVsZFZhbHVlID09PSAnQC4nIHx8IGZpZWxkVmFsdWUgPT09ICdAJyB8fCBmaWVsZFZhbHVlID09PSAnXycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgdW5tYXNrZWQgdmFsdWUgZm9yIGVtYWlsIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBpbnB1dG1hc2sgcGx1Z2luIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaW5wdXRtYXNrICYmIHR5cGVvZiAkZmllbGQuaW5wdXRtYXNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVubWFza2VkVmFsdWUgPSAkZmllbGQuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1bm1hc2tlZFZhbHVlICYmIHVubWFza2VkVmFsdWUgIT09IGZpZWxkVmFsdWUgJiYgIXVubWFza2VkVmFsdWUuaW5jbHVkZXMoJ18nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmllbGRWYWx1ZSA9IHVubWFza2VkVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbTWFpbFNldHRpbmdzXSBGYWlsZWQgdG8gZ2V0IHVubWFza2VkIHZhbHVlIGZvciAke2ZpZWxkSWR9OmAsIGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkSWRdID0gZmllbGRWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIE5vIHN1Y2Nlc3MgbWVzc2FnZSBuZWVkZWQgLSBmb3JtIHNhdmVzIHNpbGVudGx5XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gZm9yIHNhdmluZyBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbWFpbFNldHRpbmdzLiRmb3JtT2JqO1xuXG4gICAgICAgIC8vIEVuYWJsZSBSRVNUIEFQSSBtb2RlIChtb2Rlcm4gYXBwcm9hY2ggbGlrZSBHZW5lcmFsU2V0dGluZ3MpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gTWFpbFNldHRpbmdzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAncGF0Y2hTZXR0aW5ncyc7XG5cbiAgICAgICAgLy8gRW5hYmxlIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvbiBmb3IgY2xlYW5lciBBUEkgcmVxdWVzdHNcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG5cbiAgICAgICAgLy8gRW5hYmxlIHNlbmRpbmcgb25seSBjaGFuZ2VkIGZpZWxkcyBmb3Igb3B0aW1hbCBQQVRDSCBzZW1hbnRpY3NcbiAgICAgICAgRm9ybS5zZW5kT25seUNoYW5nZWQgPSB0cnVlO1xuXG4gICAgICAgIC8vIE5vIHJlZGlyZWN0IGFmdGVyIHNhdmUgLSBzdGF5IG9uIHRoZSBzYW1lIHBhZ2VcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IG51bGw7XG5cbiAgICAgICAgLy8gVXNlICcjJyBmb3IgVVJMIHdoZW4gdXNpbmcgYXBpU2V0dGluZ3NcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7XG5cbiAgICAgICAgLy8gVXNlIGR5bmFtaWMgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBjdXJyZW50IHN0YXRlXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG1haWxTZXR0aW5ncy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG1haWxTZXR0aW5ncy5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG1haWxTZXR0aW5ncy5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgT0F1dGgyIGV2ZW50c1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvT0F1dGgyRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gU3Vic2NyaWJlIHRvIE9BdXRoMiBhdXRob3JpemF0aW9uIGV2ZW50c1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdvYXV0aDItYXV0aG9yaXphdGlvbicsIChkYXRhKSA9PiB7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdGF0dXMgPT09ICdzdWNjZXNzJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdWNjZXNzOiByZWZyZXNoIE9BdXRoMiBzdGF0dXMgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5jaGVja09BdXRoMlN0YXR1cygpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEuc3RhdHVzID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEVycm9yOiBzaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJQcm9jZXNzaW5nRmFpbGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgNDAwMFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1vbml0b3IgZm9ybSBjaGFuZ2VzIHRvIGNvbnRyb2wgdGVzdCBidXR0b24gc3RhdGVzXG4gICAgICovXG4gICAgbW9uaXRvckZvcm1DaGFuZ2VzKCkge1xuICAgICAgICAvLyBJbml0aWFsbHkgYnV0dG9ucyBzaG91bGQgYmUgZW5hYmxlZCAobm8gY2hhbmdlcyB5ZXQpXG4gICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVUZXN0QnV0dG9uU3RhdGVzKCk7XG5cbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIGZvcm0gY2hhbmdlIGV2ZW50cyAtIGNoZWNrIHJlYWwgZm9ybSBzdGF0ZVxuICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmoub24oJ2NoYW5nZS50ZXN0YnV0dG9ucycsICdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScsICgpID0+IHtcbiAgICAgICAgICAgIC8vIFVzZSBGb3JtJ3MgYnVpbHQtaW4gY2hhbmdlIGRldGVjdGlvblxuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWxzbyBtb25pdG9yIEZvcm0ncyBkYXRhQ2hhbmdlZCBldmVudHNcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLm9uKCdmb3JtLmRhdGFDaGFuZ2VkJywgKCkgPT4ge1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVzZXQgc3RhdGUgYWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlXG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQWZ0ZXJTZW5kRm9ybSA9IG1haWxTZXR0aW5ncy5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIG1haWxTZXR0aW5ncy5jYkFmdGVyU2VuZEZvcm0gPSAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIG9yaWdpbmFsQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIC8vIEFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZSwgYnV0dG9ucyBzaG91bGQgYmUgZW5hYmxlZFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0ZXN0IGJ1dHRvbiBzdGF0ZXMgYmFzZWQgb24gZm9ybSBjaGFuZ2VzXG4gICAgICovXG4gICAgdXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpIHtcbiAgICAgICAgY29uc3QgJHRlc3RDb25uZWN0aW9uQnRuID0gJCgnI3Rlc3QtY29ubmVjdGlvbi1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHNlbmRUZXN0RW1haWxCdG4gPSAkKCcjc2VuZC10ZXN0LWVtYWlsLWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkc3VibWl0QnRuID0gJCgnI3N1Ym1pdGJ1dHRvbicpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcm0gaGFzIHVuc2F2ZWQgY2hhbmdlcyB1c2luZyBGb3JtJ3MgYnVpbHQtaW4gbWV0aG9kXG4gICAgICAgIGNvbnN0IGhhc0NoYW5nZXMgPSB0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5oYXNDaGFuZ2VzICYmIEZvcm0uaGFzQ2hhbmdlcygpO1xuXG4gICAgICAgIGlmIChoYXNDaGFuZ2VzKSB7XG4gICAgICAgICAgICAvLyBGb3JtIGhhcyBjaGFuZ2VzIC0gZGlzYWJsZSB0ZXN0IGJ1dHRvbnMgd2l0aCB2aXN1YWwgZmVlZGJhY2tcbiAgICAgICAgICAgICR0ZXN0Q29ubmVjdGlvbkJ0blxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLWludmVydGVkJywgJycpO1xuXG4gICAgICAgICAgICAkc2VuZFRlc3RFbWFpbEJ0blxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLWludmVydGVkJywgJycpO1xuXG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgc2F2ZSBidXR0b24gaXMgdmlzaWJsZS9lbmFibGVkIHdoZW4gdGhlcmUgYXJlIGNoYW5nZXNcbiAgICAgICAgICAgICRzdWJtaXRCdG4ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJykuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gY2hhbmdlcyAtIGVuYWJsZSB0ZXN0IGJ1dHRvbnNcbiAgICAgICAgICAgICR0ZXN0Q29ubmVjdGlvbkJ0blxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXRvb2x0aXAnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1pbnZlcnRlZCcpO1xuXG4gICAgICAgICAgICAkc2VuZFRlc3RFbWFpbEJ0blxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXRvb2x0aXAnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1pbnZlcnRlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYnV0dG9uc1xuICAgICAgICAkKCcudWkuYnV0dG9uW2RhdGEtdG9vbHRpcF0nKS5wb3B1cCgpO1xuICAgIH0sXG5cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZSgpO1xuXG4gICAgLy8gRW5zdXJlIGNsaWNrIHByZXZlbnRpb24gZm9yIHRvb2x0aXAgaWNvbnMgaW4gY2hlY2tib3hlc1xuICAgIC8vIFRoaXMgcHJldmVudHMgY2hlY2tib3ggdG9nZ2xlIHdoZW4gY2xpY2tpbmcgb24gdG9vbHRpcCBpY29uXG4gICAgJCgnLmZpZWxkLWluZm8taWNvbicpLm9mZignY2xpY2sudG9vbHRpcC1wcmV2ZW50Jykub24oJ2NsaWNrLnRvb2x0aXAtcHJldmVudCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG59KTsiXX0=