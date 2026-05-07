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
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * jQuery object for the checkboxes.
   * @type {jQuery}
   */
  $checkBoxes: null,

  /**
   * jQuery object for the menu items.
   * @type {jQuery}
   */
  $menuItems: null,

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
    mailSettings.$formObj = $('#mail-settings-form');
    mailSettings.$checkBoxes = $('#mail-settings-form .checkbox');
    mailSettings.$menuItems = $('#mail-settings-menu .item'); // Check for OAuth2 callback parameters in URL

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkY2hlY2tCb3hlcyIsIiRtZW51SXRlbXMiLCJvYXV0aDJXaW5kb3ciLCJkYXRhTG9hZGVkIiwiZ2V0VmFsaWRhdGVSdWxlcyIsInJ1bGVzIiwiYXV0aFR5cGUiLCIkIiwidmFsIiwiTWFpbFNNVFBTZW5kZXJBZGRyZXNzIiwiaWRlbnRpZmllciIsIm9wdGlvbmFsIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQiLCJTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwiLCJtc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCIsIlN5c3RlbUVtYWlsRm9yTWlzc2VkIiwidmFsdWUiLCJtc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCIsIlZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCIsIm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkIiwiTWFpbFNNVFBIb3N0IiwibXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQiLCJNYWlsU01UUFBvcnQiLCJtc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCIsIk1haWxPQXV0aDJQcm92aWRlciIsIk1haWxPQXV0aDJDbGllbnRJZCIsIk1haWxPQXV0aDJDbGllbnRTZWNyZXQiLCJNYWlsU01UUFVzZXJuYW1lIiwibXNfVmFsaWRhdGVTTVRQVXNlcm5hbWVFbWFpbCIsIk1haWxTTVRQUGFzc3dvcmQiLCJkZXBlbmRzIiwibXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSIsInVwZGF0ZVZhbGlkYXRpb25SdWxlcyIsIm5ld1J1bGVzIiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmb3JtIiwiZmllbGRzIiwiaW5saW5lIiwib24iLCJpbml0aWFsaXplIiwiaGFuZGxlT0F1dGgyQ2FsbGJhY2siLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJjaGVja2JveCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ1cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24iLCJpbml0aWFsRW5jcnlwdGlvbiIsImNsZWFyYWJsZSIsImZvcmNlU2VsZWN0aW9uIiwidXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVPQXV0aDIiLCJpbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycyIsImluaXRpYWxpemVOb3RpZmljYXRpb25IYW5kbGVycyIsImluaXRpYWxpemVUZXN0QnV0dG9ucyIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwiLCJpbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIiLCJzdWJzY3JpYmVUb09BdXRoMkV2ZW50cyIsIm1vbml0b3JGb3JtQ2hhbmdlcyIsImxvYWREYXRhIiwiTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJidWlsZFRvb2x0aXBDb250ZW50IiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsImJ1aWxkQ29udGVudCIsImVtYWlsRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkSWQiLCIkZmllbGQiLCJsZW5ndGgiLCJpbnB1dG1hc2siLCJzaG93TWFza09uSG92ZXIiLCJwbGFjZWhvbGRlciIsIm9uQmVmb3JlUGFzdGUiLCJwYXN0ZWRWYWx1ZSIsIm9uY2xlYXJlZCIsIiRpbnB1dCIsImFkZENsYXNzIiwiTWFpbFNldHRpbmdzQVBJIiwiZ2V0U2V0dGluZ3MiLCJzZXR0aW5ncyIsIm9mZiIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJkYXRhIiwiYm9vbGVhbkZpZWxkcyIsImtleSIsInVuZGVmaW5lZCIsIk1haWxTTVRQQXV0aFR5cGUiLCJhZnRlclBvcHVsYXRlIiwiTWFpbFNNVFBVc2VUTFMiLCJlbmNyeXB0aW9uVmFsdWUiLCJNYWlsU01UUENlcnRDaGVjayIsImlzQ2hlY2tlZCIsImNsb3Nlc3QiLCJNYWlsRW5hYmxlTm90aWZpY2F0aW9ucyIsIm5vdGlmaWNhdGlvblRvZ2dsZXMiLCJmaWVsZE5hbWUiLCJpbml0aWFsaXplRW1haWxGaWVsZHNWaXNpYmlsaXR5IiwidXBkYXRlVXNlcm5hbWVQbGFjZWhvbGRlciIsInRvZ2dsZUF1dGhGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RhcnRPQXV0aDJGbG93IiwiZGlzY29ubmVjdE9BdXRoMiIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJoYW5kbGVPQXV0aDJNZXNzYWdlIiwidG9nZ2xlTm90aWZpY2F0aW9uVHlwZXNTZWN0aW9uIiwiZGF0YUNoYW5nZWQiLCJ0b2dnbGVFbWFpbEZpZWxkIiwiaXNFbmFibGVkIiwiaXMiLCIkc2VjdGlvbiIsInNsaWRlRG93biIsInNldFRpbWVvdXQiLCJzbGlkZVVwIiwidG9nZ2xlSWQiLCJlbWFpbEZpZWxkSWQiLCIkZW1haWxGaWVsZCIsImlzTm90aWZpY2F0aW9uc0VuYWJsZWQiLCJzaG93IiwiaGlkZSIsInRvZ2dsZUVtYWlsTWFwIiwiT2JqZWN0Iiwia2V5cyIsInRhcmdldCIsImN1cnJlbnRBdXRoVHlwZSIsInRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzIiwiJHVzZXJuYW1lRmllbGQiLCIkcGFzc3dvcmRGaWVsZCIsIiRvYXV0aDJTZWN0aW9uIiwidXBkYXRlT0F1dGgyU3RhdHVzIiwiY2hlY2tPQXV0aDJTdGF0dXMiLCJjdXJyZW50VGFyZ2V0IiwiaGFzQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dXYXJuaW5nIiwibXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nIiwidGVzdENvbm5lY3Rpb24iLCJzZW5kVGVzdEVtYWlsIiwiZW1haWwiLCJwcm92aWRlciIsImRldGVjdFByb3ZpZGVyIiwic2hvd1Byb3ZpZGVySGludCIsImF1dG9GaWxsU01UUFNldHRpbmdzIiwic2VuZGVyQWRkcmVzcyIsInRyaW0iLCJhdHRyIiwicmVtb3ZlQXR0ciIsImdvb2dsZSIsImhvc3QiLCJwb3J0IiwidGxzIiwibWljcm9zb2Z0IiwieWFuZGV4IiwicHJvdmlkZXJTZXR0aW5ncyIsIiRlbmNyeXB0aW9uRHJvcGRvd24iLCJlbmNyeXB0aW9uIiwiY2VydENoZWNrIiwiZW5jcnlwdGlvblR5cGUiLCIkcG9ydEZpZWxkIiwiY3VycmVudFBvcnQiLCJzdGFuZGFyZFBvcnRzIiwiaW5jbHVkZXMiLCIkY2VydENoZWNrRmllbGQiLCJtZXNzYWdlIiwiJGhpbnQiLCJhZnRlciIsInRleHQiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJsb2NhdGlvbiIsInNlYXJjaCIsImhhcyIsImxvYWRTZXR0aW5nc0Zyb21BUEkiLCJyZXBsYWNlU3RhdGUiLCJkb2N1bWVudCIsInRpdGxlIiwicGF0aG5hbWUiLCJlcnJvciIsImdldCIsInNob3dFcnJvciIsIm1zX09BdXRoMkF1dGhvcml6YXRpb25GYWlsZWQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJtc19WYWxpZGF0ZU9BdXRoMlByb3ZpZGVyRW1wdHkiLCJjbGllbnRJZCIsImNsaWVudFNlY3JldCIsIm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50SWRFbXB0eSIsIm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50U2VjcmV0RW1wdHkiLCJzYXZlT0F1dGgyQ3JlZGVudGlhbHMiLCJwYXRjaFNldHRpbmdzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwcm9jZWVkV2l0aE9BdXRoMkZsb3ciLCJjb25zb2xlIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJqb2luIiwicmVxdWVzdE9BdXRoMkF1dGhVcmwiLCJhdXRob3JpemVPQXV0aDIiLCJhdXRoVXJsIiwid2lkdGgiLCJoZWlnaHQiLCJsZWZ0Iiwic2NyZWVuIiwidG9wIiwiYXV0aFdpbmRvdyIsIm9wZW4iLCJnZXRPQXV0aDJVcmwiLCJhdXRoX3VybCIsImV2ZW50Iiwib3JpZ2luIiwiY2xvc2UiLCJwYXJhbXMiLCJzaG93SW5mb3JtYXRpb24iLCJvYXV0aDJfc3RhdHVzIiwic3RhdHVzIiwiJHN0YXR1c0RpdiIsIiRjbGllbnRJZEZpZWxkIiwiJGNsaWVudFNlY3JldEZpZWxkIiwiY29uZmlndXJlZCIsInByb3ZpZGVyTmFtZSIsImdldFByb3ZpZGVyTmFtZSIsImNvbm5lY3RlZFRleHQiLCJtc19PQXV0aDJDb25uZWN0ZWRUbyIsInJlcGxhY2UiLCJodG1sIiwiYXV0aG9yaXplZCIsIm1zX09BdXRoMk5vdENvbmZpZ3VyZWQiLCJjbGVhckRhdGEiLCJNYWlsT0F1dGgyUmVmcmVzaFRva2VuIiwiTWFpbE9BdXRoMkFjY2Vzc1Rva2VuIiwiTWFpbE9BdXRoMlRva2VuRXhwaXJlcyIsIiRidXR0b24iLCIkcmVzdWx0QXJlYSIsInJlbW92ZSIsIiRyZXN1bHQiLCJwYXJlbnQiLCJhcHBlbmQiLCJzdWNjZXNzIiwiZGlhZ25vc3RpY3MiLCJkaWFnIiwiZGV0YWlscyIsImF1dGhfdHlwZSIsInNtdHBfaG9zdCIsInNtdHBfcG9ydCIsInNtdHBfZW5jcnlwdGlvbiIsIm9hdXRoMl9wcm92aWRlciIsIm9hdXRoMl9yZWZyZXNoX3Rva2VuX2V4aXN0cyIsIm1zX0RpYWdub3N0aWNBdXRob3JpemVkIiwibWFpbk1lc3NhZ2UiLCJtc19EaWFnbm9zdGljQ29ubmVjdGlvbkZhaWxlZCIsImVycm9yX2RldGFpbHMiLCJwcm9iYWJsZV9jYXVzZSIsInJhd19lcnJvciIsInJhd0Vycm9yIiwiZGV0YWlsc0h0bWwiLCJtc19EaWFnbm9zdGljVGVjaG5pY2FsRGV0YWlscyIsImZpbmQiLCJhY2NvcmRpb24iLCJ0b1VwcGVyQ2FzZSIsImhpbnRzIiwicmVsZXZhbnRIaW50cyIsInNsaWNlIiwiaGludCIsInNvbWUiLCJoIiwiZmFkZU91dCIsInJlY2lwaWVudCIsInRvIiwiYWN0dWFsUmVjaXBpZW50Iiwic3VjY2Vzc01lc3NhZ2UiLCJlcnJvckRldGFpbHMiLCJtc19EaWFnbm9zdGljUHJvYmFibGVDYXVzZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJvcmlnaW5hbFZhbHVlIiwiZmllbGRWYWx1ZSIsInVubWFza2VkVmFsdWUiLCJ3YXJuIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwic2VuZE9ubHlDaGFuZ2VkIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ1cmwiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsIm1zX09BdXRoMlByb2Nlc3NpbmdGYWlsZWQiLCJ1cGRhdGVUZXN0QnV0dG9uU3RhdGVzIiwic3VibWl0QnV0dG9uIiwiZ2V0RWxlbWVudEJ5SWQiLCJvYnNlcnZlciIsIk11dGF0aW9uT2JzZXJ2ZXIiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImF0dHJpYnV0ZUZpbHRlciIsIiR0ZXN0Q29ubmVjdGlvbkJ0biIsIiRzZW5kVGVzdEVtYWlsQnRuIiwiJHN1Ym1pdEJ0biIsImhhc1Vuc2F2ZWRDaGFuZ2VzIiwicG9wdXAiLCJyZWFkeSIsInN0b3BQcm9wYWdhdGlvbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFOTzs7QUFRakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFLElBWkk7O0FBY2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQWxCSzs7QUFvQmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVB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QixFQUozQjtBQU1BeUosTUFBQUEsaUJBQWlCLENBQ1pwTyxRQURMLENBQ2MsVUFEZCxFQUVLMkUsSUFGTCxDQUVVLGNBRlYsRUFFMEJsSixlQUFlLENBQUN3SSwyQkFGMUMsRUFHS1UsSUFITCxDQUdVLGVBSFYsRUFHMkIsWUFIM0IsRUFJS0EsSUFKTCxDQUlVLGVBSlYsRUFJMkIsRUFKM0I7QUFLSCxLQWJELE1BYU87QUFDSDtBQUNBd0osTUFBQUEsa0JBQWtCLENBQ2IzTSxXQURMLENBQ2lCLFVBRGpCLEVBRUtvRCxVQUZMLENBRWdCLGNBRmhCLEVBR0tBLFVBSEwsQ0FHZ0IsZUFIaEIsRUFJS0EsVUFKTCxDQUlnQixlQUpoQjtBQU1Bd0osTUFBQUEsaUJBQWlCLENBQ1o1TSxXQURMLENBQ2lCLFVBRGpCLEVBRUtvRCxVQUZMLENBRWdCLGNBRmhCLEVBR0tBLFVBSEwsQ0FHZ0IsZUFIaEIsRUFJS0EsVUFKTCxDQUlnQixlQUpoQjtBQUtILEtBbENvQixDQW9DckI7OztBQUNBMUosSUFBQUEsQ0FBQyxDQUFDLDBCQUFELENBQUQsQ0FBOEJxVCxLQUE5QjtBQUNIO0FBampEZ0IsQ0FBckIsQyxDQXFqREE7O0FBQ0FyVCxDQUFDLENBQUNzTCxRQUFELENBQUQsQ0FBWWdJLEtBQVosQ0FBa0IsWUFBTTtBQUNwQi9ULEVBQUFBLFlBQVksQ0FBQzZDLFVBQWIsR0FEb0IsQ0FHcEI7QUFDQTs7QUFDQXBDLEVBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCa0YsR0FBdEIsQ0FBMEIsdUJBQTFCLEVBQW1EL0MsRUFBbkQsQ0FBc0QsdUJBQXRELEVBQStFLFVBQVN1RSxDQUFULEVBQVk7QUFDdkZBLElBQUFBLENBQUMsQ0FBQzZNLGVBQUY7QUFDQTdNLElBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLFdBQU8sS0FBUDtBQUNILEdBSkQ7QUFLSCxDQVZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgVXNlck1lc3NhZ2UsIE1haWxTZXR0aW5nc0FQSSwgQ29uZmlnLCBUb29sdGlwQnVpbGRlciwgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1haWwgc2V0dGluZ3Mgd2l0aCBPQXV0aDIgc3VwcG9ydFxuICpcbiAqIEBtb2R1bGUgbWFpbFNldHRpbmdzXG4gKi9cbmNvbnN0IG1haWxTZXR0aW5ncyA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVja2JveGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQm94ZXM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbWVudSBpdGVtcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtZW51SXRlbXM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBPQXV0aDIgd2luZG93IHJlZmVyZW5jZVxuICAgICAqIEB0eXBlIHtXaW5kb3d8bnVsbH1cbiAgICAgKi9cbiAgICBvYXV0aDJXaW5kb3c6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHRyYWNrIGlmIGluaXRpYWwgZGF0YSBoYXMgYmVlbiBsb2FkZWQgZnJvbSBBUElcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBkYXRhTG9hZGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gZm9ybSBzdGF0ZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCBydWxlcyA9IHt9O1xuICAgICAgICBjb25zdCBhdXRoVHlwZSA9ICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdOmNoZWNrZWQnKS52YWwoKTtcblxuICAgICAgICAvLyBCYXNlIGVtYWlsIHZhbGlkYXRpb24gcnVsZXMgLSBhbHdheXMgYXBwbHkgd2hlbiBmaWVsZHMgaGF2ZSB2YWx1ZXNcbiAgICAgICAgcnVsZXMuTWFpbFNNVFBTZW5kZXJBZGRyZXNzID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQU2VuZGVyQWRkcmVzcycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNlbmRlckFkZHJlc3NJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLlN5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTeXN0ZW1FbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuU3lzdGVtRW1haWxGb3JNaXNzZWQgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU3lzdGVtRW1haWxGb3JNaXNzZWQnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnXig/IS4qX0BfXFxcXC5fKS4qJCcsICAvLyBSZWplY3QgX0BfLl8gcGF0dGVyblxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVNaXNzZWRFbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeKD8hLipfQF9cXFxcLl8pLiokJywgIC8vIFJlamVjdCBfQF8uXyBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVZvaWNlbWFpbEVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTTVRQIGNvbmZpZ3VyYXRpb24gcnVsZXMgLSBhbHdheXMgYXZhaWxhYmxlIGJ1dCBvcHRpb25hbFxuICAgICAgICBydWxlcy5NYWlsU01UUEhvc3QgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbFNNVFBIb3N0JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU01UUEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLk1haWxTTVRQUG9ydCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFBvcnQnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXV0aGVudGljYXRpb24tc3BlY2lmaWMgcnVsZXNcbiAgICAgICAgaWYgKGF1dGhUeXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgLy8gT0F1dGgyIGZpZWxkcyAtIG9wdGlvbmFsXG4gICAgICAgICAgICBydWxlcy5NYWlsT0F1dGgyUHJvdmlkZXIgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxPQXV0aDJQcm92aWRlcicsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcnVsZXMuTWFpbE9BdXRoMkNsaWVudElkID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsT0F1dGgyQ2xpZW50SWQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJ1bGVzLk1haWxPQXV0aDJDbGllbnRTZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxPQXV0aDJDbGllbnRTZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFVzZXJuYW1lIGZvciBPQXV0aDIgc2hvdWxkIGJlIGVtYWlsIHdoZW4gZmlsbGVkXG4gICAgICAgICAgICBydWxlcy5NYWlsU01UUFVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFVzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQVXNlcm5hbWVFbWFpbCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBVc2VybmFtZSAtIG9wdGlvbmFsXG4gICAgICAgICAgICBydWxlcy5NYWlsU01UUFVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFVzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBQYXNzd29yZCAtIHJlcXVpcmVkIGlmIHVzZXJuYW1lIGlzIHByb3ZpZGVkXG4gICAgICAgICAgICBydWxlcy5NYWlsU01UUFBhc3N3b3JkID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFBhc3N3b3JkJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiAnTWFpbFNNVFBVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU01UUFBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIGFuZCByZWluaXRpYWxpemUgZm9ybVxuICAgICAqL1xuICAgIHVwZGF0ZVZhbGlkYXRpb25SdWxlcygpIHtcbiAgICAgICAgLy8gR2V0IGZyZXNoIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gY3VycmVudCBzdGF0ZVxuICAgICAgICBjb25zdCBuZXdSdWxlcyA9IG1haWxTZXR0aW5ncy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIEZvcm0udmFsaWRhdGVSdWxlc1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBuZXdSdWxlcztcblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIHdpdGggbmV3IHJ1bGVzXG4gICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdkZXN0cm95Jyk7XG4gICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKHtcbiAgICAgICAgICAgIGZpZWxkczogbmV3UnVsZXMsXG4gICAgICAgICAgICBpbmxpbmU6IHRydWUsXG4gICAgICAgICAgICBvbjogJ2JsdXInXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtYWlsIHNldHRpbmdzIHBhZ2UuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqID0gJCgnI21haWwtc2V0dGluZ3MtZm9ybScpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuJGNoZWNrQm94ZXMgPSAkKCcjbWFpbC1zZXR0aW5ncy1mb3JtIC5jaGVja2JveCcpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuJG1lbnVJdGVtcyA9ICQoJyNtYWlsLXNldHRpbmdzLW1lbnUgLml0ZW0nKTtcblxuICAgICAgICAvLyBDaGVjayBmb3IgT0F1dGgyIGNhbGxiYWNrIHBhcmFtZXRlcnMgaW4gVVJMXG4gICAgICAgIG1haWxTZXR0aW5ncy5oYW5kbGVPQXV0aDJDYWxsYmFjaygpO1xuXG4gICAgICAgIG1haWxTZXR0aW5ncy4kbWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG4gICAgICAgIG1haWxTZXR0aW5ncy4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggc3BlY2lmaWMgY29uZmlndXJhdGlvbnNcbiAgICAgICAgLy8gRG9uJ3QgaW5pdGlhbGl6ZSBhbGwgZHJvcGRvd25zIGdlbmVyaWNhbGx5IHRvIGF2b2lkIGRvdWJsZSBpbml0aWFsaXphdGlvblxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZW5jcnlwdGlvbiB0eXBlIGRyb3Bkb3duIHdpdGggcG9ydCBhdXRvLXVwZGF0ZVxuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24odmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpbml0aWFsIGVuY3J5cHRpb24gdHlwZSB0byBzaG93L2hpZGUgY2VydGlmaWNhdGUgY2hlY2tcbiAgICAgICAgY29uc3QgaW5pdGlhbEVuY3J5cHRpb24gPSAkKCcjTWFpbFNNVFBVc2VUTFMnKS52YWwoKSB8fCAnbm9uZSc7XG4gICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24oaW5pdGlhbEVuY3J5cHRpb24pO1xuXG4gICAgICAgIC8vIFNwZWNpYWwgaW5pdGlhbGl6YXRpb24gZm9yIE9BdXRoMiBwcm92aWRlciBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgY2xlYXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVNNVFBTZXR0aW5nc0ZvclByb3ZpZGVyKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTm8gb3RoZXIgZHJvcGRvd25zIGluIHRoZSBmb3JtIG5lZWQgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gTWFpbFNNVFBVc2VUTFMgYW5kIE1haWxPQXV0aDJQcm92aWRlciBhcmUgdGhlIG9ubHkgZHJvcGRvd25zXG5cbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplT0F1dGgyKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycygpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZU5vdGlmaWNhdGlvbkhhbmRsZXJzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplVGVzdEJ1dHRvbnMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVJbnB1dE1hc2tzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmRldGVjdFByb3ZpZGVyRnJvbUVtYWlsKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIoKTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgT0F1dGgyIGV2ZW50c1xuICAgICAgICBtYWlsU2V0dGluZ3Muc3Vic2NyaWJlVG9PQXV0aDJFdmVudHMoKTtcblxuICAgICAgICAvLyBNb25pdG9yIGZvcm0gY2hhbmdlcyB0byBjb250cm9sIHRlc3QgYnV0dG9uc1xuICAgICAgICBtYWlsU2V0dGluZ3MubW9uaXRvckZvcm1DaGFuZ2VzKCk7XG5cbiAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gQVBJIGFmdGVyIGFsbCBVSSBlbGVtZW50cyBhcmUgaW5pdGlhbGl6ZWRcbiAgICAgICAgbWFpbFNldHRpbmdzLmxvYWREYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBVc2UgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBpZiAodHlwZW9mIE1haWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZVRvb2x0aXBzKG1haWxTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogRGVsZWdhdGVzIHRvIFRvb2x0aXBCdWlsZGVyIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgZm9ybWF0dGluZ1xuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW5wdXQgbWFza3MgZm9yIGVtYWlsIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dE1hc2tzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGVtYWlsIGlucHV0IG1hc2tzIGZvciBhbGwgZW1haWwgZmllbGRzXG4gICAgICAgIGNvbnN0IGVtYWlsRmllbGRzID0gW1xuICAgICAgICAgICAgJ01haWxTTVRQU2VuZGVyQWRkcmVzcycsXG4gICAgICAgICAgICAnU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ1xuICAgICAgICBdO1xuXG4gICAgICAgIGVtYWlsRmllbGRzLmZvckVhY2goZmllbGRJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGZpZWxkLmlucHV0bWFzaygnZW1haWwnLCB7XG4gICAgICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJywgLy8gTm8gcGxhY2Vob2xkZXIgY2hhcmFjdGVyXG4gICAgICAgICAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGZ1bmN0aW9uKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGVhbiBwbGFjZWhvbGRlciB2YWx1ZXMgb24gcGFzdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXN0ZWRWYWx1ZSA9PT0gJ19AXy5fJyB8fCBwYXN0ZWRWYWx1ZSA9PT0gJ0AnIHx8IHBhc3RlZFZhbHVlID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25jbGVhcmVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBmaWVsZCB2YWx1ZSB3aGVuIG1hc2sgaXMgY2xlYXJlZFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkaW5wdXQudmFsKCkgPT09ICdfQF8uXycgfHwgJGlucHV0LnZhbCgpID09PSAnQCcgfHwgJGlucHV0LnZhbCgpID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRpbnB1dC52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBDbGVhbiBpbml0aWFsIHBsYWNlaG9sZGVyIHZhbHVlc1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQudmFsKCkgPT09ICdfQF8uXycgfHwgJGZpZWxkLnZhbCgpID09PSAnQCcgfHwgJGZpZWxkLnZhbCgpID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAkZmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1haWwgc2V0dGluZ3MgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWREYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLmdldFNldHRpbmdzKChzZXR0aW5ncykgPT4ge1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBvdXIgY2hhbmdlIGhhbmRsZXIgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXScpLm9mZignY2hhbmdlLm1haWxzZXR0aW5ncycpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggbGlrZSBHZW5lcmFsU2V0dGluZ3NcbiAgICAgICAgICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHNldHRpbmdzLCB7XG4gICAgICAgICAgICAgICAgICAgIGJlZm9yZVBvcHVsYXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUkVTVCBBUEkgcmV0dXJucyBib29sZWFucyBmb3IgY2hlY2tib3ggZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IGJvb2xlYW4gdmFsdWVzIHRvIHN0cmluZ3MgZm9yIFNlbWFudGljIFVJIGNoZWNrYm94ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvb2xlYW5GaWVsZHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ01haWxTTVRQQ2VydENoZWNrJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kTWlzc2VkQ2FsbE5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NlbmRMb2dpbk5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kU3lzdGVtTm90aWZpY2F0aW9ucycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ01haWxQbGFpblRleHQnXG4gICAgICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYm9vbGVhbkZpZWxkcy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgYm9vbGVhbiB0byBzdHJpbmcgXCIxXCIgb3IgXCIwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtrZXldID0gKGRhdGFba2V5XSA9PT0gdHJ1ZSB8fCBkYXRhW2tleV0gPT09IDEgfHwgZGF0YVtrZXldID09PSAnMScpID8gJzEnIDogJzAnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgcmFkaW8gYnV0dG9uIHZhbHVlIGlzIHNldCAod2lsbCBiZSBoYW5kbGVkIHNpbGVudGx5IGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEuTWFpbFNNVFBBdXRoVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuTWFpbFNNVFBBdXRoVHlwZSA9ICdwYXNzd29yZCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFuIHVwIHBsYWNlaG9sZGVyIGVtYWlsIHZhbHVlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW1haWxGaWVsZHMgPSBbJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJywgJ1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW1haWxGaWVsZHMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2tleV0gPT09ICdfQF8uXycgfHwgZGF0YVtrZXldID09PSAnQCcgfHwgZGF0YVtrZXldID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIE9BdXRoMiBwcm92aWRlciBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuTWFpbE9BdXRoMlByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlci1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLk1haWxPQXV0aDJQcm92aWRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlcicpLnZhbChkYXRhLk1haWxPQXV0aDJQcm92aWRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGVuY3J5cHRpb24gdHlwZSBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuTWFpbFNNVFBVc2VUTFMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgb2xkIGJvb2xlYW4gdmFsdWVzIHRvIG5ldyBmb3JtYXQgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuY3J5cHRpb25WYWx1ZSA9IGRhdGEuTWFpbFNNVFBVc2VUTFM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuY3J5cHRpb25WYWx1ZSA9PT0gdHJ1ZSB8fCBlbmNyeXB0aW9uVmFsdWUgPT09IDEgfHwgZW5jcnlwdGlvblZhbHVlID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ3Rscyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbmNyeXB0aW9uVmFsdWUgPT09IGZhbHNlIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gMCB8fCBlbmNyeXB0aW9uVmFsdWUgPT09ICcwJyB8fCBlbmNyeXB0aW9uVmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuY3J5cHRpb25WYWx1ZSA9ICdub25lJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBkcm9wZG93biB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUFVzZVRMUy1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBlbmNyeXB0aW9uVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUFVzZVRMUycpLnZhbChlbmNyeXB0aW9uVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBjaGVja2JveGVzIHVzaW5nIFNlbWFudGljIFVJXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5NYWlsU01UUENlcnRDaGVjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gZGF0YS5NYWlsU01UUENlcnRDaGVjayA9PT0gdHJ1ZSB8fCBkYXRhLk1haWxTTVRQQ2VydENoZWNrID09PSAxIHx8IGRhdGEuTWFpbFNNVFBDZXJ0Q2hlY2sgPT09ICcxJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5NYWlsRW5hYmxlTm90aWZpY2F0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gZGF0YS5NYWlsRW5hYmxlTm90aWZpY2F0aW9ucyA9PT0gdHJ1ZSB8fCBkYXRhLk1haWxFbmFibGVOb3RpZmljYXRpb25zID09PSAxIHx8IGRhdGEuTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgPT09ICcxJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsRW5hYmxlTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsRW5hYmxlTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgbm90aWZpY2F0aW9uIHR5cGUgdG9nZ2xlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm90aWZpY2F0aW9uVG9nZ2xlcyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU2VuZE1pc3NlZENhbGxOb3RpZmljYXRpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU2VuZFZvaWNlbWFpbE5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdTZW5kTG9naW5Ob3RpZmljYXRpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU2VuZFN5c3RlbU5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdNYWlsUGxhaW5UZXh0J1xuICAgICAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdGlmaWNhdGlvblRvZ2dsZXMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2ZpZWxkTmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBkYXRhW2ZpZWxkTmFtZV0gPT09IHRydWUgfHwgZGF0YVtmaWVsZE5hbWVdID09PSAxIHx8IGRhdGFbZmllbGROYW1lXSA9PT0gJzEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtmaWVsZE5hbWV9YCkuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGAjJHtmaWVsZE5hbWV9YCkuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtYWlsIGZpZWxkcyB2aXNpYmlsaXR5IGJhc2VkIG9uIHRvZ2dsZSBzdGF0ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE11c3QgYmUgY2FsbGVkIGFmdGVyIGNoZWNrYm94ZXMgYXJlIHNldFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVFbWFpbEZpZWxkc1Zpc2liaWxpdHkoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIE1haWxTTVRQVXNlcm5hbWUgcGxhY2Vob2xkZXIgd2l0aCBNYWlsU01UUFNlbmRlckFkZHJlc3MgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVVc2VybmFtZVBsYWNlaG9sZGVyKGRhdGEuTWFpbFNNVFBTZW5kZXJBZGRyZXNzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgT0F1dGgyIHN0YXR1cyBpZiBPQXV0aDIgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJhZGlvIGJ1dHRvbiBpcyBhbHJlYWR5IHNldCBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdXRoVHlwZSA9IGRhdGEuTWFpbFNNVFBBdXRoVHlwZSB8fCAncGFzc3dvcmQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHMoYXV0aFR5cGUsIGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBsb2FkZWQgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVWYWxpZGF0aW9uUnVsZXMoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyB0aGF0IGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuZGF0YUxvYWRlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmUtZW5hYmxlIG91ciBjaGFuZ2UgaGFuZGxlciBmb3IgZnV0dXJlIHVzZXIgaW50ZXJhY3Rpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MucmVBdHRhY2hBdXRoVHlwZUhhbmRsZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBPQXV0aDIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVPQXV0aDIoKSB7XG4gICAgICAgIC8vIE9BdXRoMiBjb25uZWN0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3Muc3RhcnRPQXV0aDJGbG93KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE9BdXRoMiBkaXNjb25uZWN0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNvYXV0aDItZGlzY29ubmVjdCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuZGlzY29ubmVjdE9BdXRoMigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMaXN0ZW4gZm9yIE9BdXRoMiBjYWxsYmFjayBtZXNzYWdlc1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG1haWxTZXR0aW5ncy5oYW5kbGVPQXV0aDJNZXNzYWdlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBub3RpZmljYXRpb24gZW5hYmxlL2Rpc2FibGUgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTm90aWZpY2F0aW9uSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBtYXN0ZXIgbm90aWZpY2F0aW9ucyBlbmFibGUvZGlzYWJsZSBjaGVja2JveFxuICAgICAgICAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVOb3RpZmljYXRpb25UeXBlc1NlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVmFsaWRhdGlvblJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgaW5kaXZpZHVhbCBub3RpZmljYXRpb24gdHlwZSB0b2dnbGVzXG4gICAgICAgIC8vIEVhY2ggdG9nZ2xlIHNob3dzL2hpZGVzIGl0cyBjb3JyZXNwb25kaW5nIGVtYWlsIGZpZWxkXG4gICAgICAgICQoJyNTZW5kTWlzc2VkQ2FsbE5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVFbWFpbEZpZWxkKCdTZW5kTWlzc2VkQ2FsbE5vdGlmaWNhdGlvbnMnLCAnU3lzdGVtRW1haWxGb3JNaXNzZWQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyNTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUVtYWlsRmllbGQoJ1NlbmRWb2ljZW1haWxOb3RpZmljYXRpb25zJywgJ1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2VuZExvZ2luTm90aWZpY2F0aW9ucyBhbmQgU2VuZFN5c3RlbU5vdGlmaWNhdGlvbnMgZG9uJ3QgY29udHJvbCBlbWFpbCBmaWVsZCB2aXNpYmlsaXR5XG4gICAgICAgICQoJyNTZW5kTG9naW5Ob3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyNTZW5kU3lzdGVtTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIG5vdGlmaWNhdGlvbiB0eXBlcyBzZWN0aW9uIHZpc2liaWxpdHkgYmFzZWQgb24gTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgc3RhdGVcbiAgICAgKi9cbiAgICB0b2dnbGVOb3RpZmljYXRpb25UeXBlc1NlY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGlzRW5hYmxlZCA9ICQoJyNNYWlsRW5hYmxlTm90aWZpY2F0aW9ucycpLmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICBjb25zdCAkc2VjdGlvbiA9ICQoJyNub3RpZmljYXRpb24tdHlwZXMtc2VjdGlvbicpO1xuXG4gICAgICAgIGlmIChpc0VuYWJsZWQpIHtcbiAgICAgICAgICAgICRzZWN0aW9uLnNsaWRlRG93bigzMDApO1xuICAgICAgICAgICAgLy8gQWxzbyB1cGRhdGUgaW5kaXZpZHVhbCBlbWFpbCBmaWVsZHMgdmlzaWJpbGl0eSBhZnRlciBzZWN0aW9uIGlzIHNob3duXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZUVtYWlsRmllbGRzVmlzaWJpbGl0eSgpO1xuICAgICAgICAgICAgfSwgMzUwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRzZWN0aW9uLnNsaWRlVXAoMzAwKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgZW1haWwgZmllbGQgdmlzaWJpbGl0eSBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b2dnbGVJZCAtIElEIG9mIHRoZSB0b2dnbGUgY2hlY2tib3hcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZW1haWxGaWVsZElkIC0gSUQgb2YgdGhlIGVtYWlsIGZpZWxkIHRvIHNob3cvaGlkZVxuICAgICAqL1xuICAgIHRvZ2dsZUVtYWlsRmllbGQodG9nZ2xlSWQsIGVtYWlsRmllbGRJZCkge1xuICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkKGAjJHt0b2dnbGVJZH1gKS5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgY29uc3QgJGVtYWlsRmllbGQgPSAkKGAjJHtlbWFpbEZpZWxkSWR9YCkuY2xvc2VzdCgnLmZpZWxkJyk7XG5cbiAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgJGVtYWlsRmllbGQuc2xpZGVEb3duKDIwMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZW1haWxGaWVsZC5zbGlkZVVwKDIwMCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBlbWFpbCBmaWVsZHMgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IHRvZ2dsZSBzdGF0ZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRW1haWxGaWVsZHNWaXNpYmlsaXR5KCkge1xuICAgICAgICAvLyBGaXJzdCwgY2hlY2sgbWFzdGVyIHRvZ2dsZSBhbmQgc2hvdy9oaWRlIHRoZSBlbnRpcmUgbm90aWZpY2F0aW9uIHR5cGVzIHNlY3Rpb25cbiAgICAgICAgY29uc3QgaXNOb3RpZmljYXRpb25zRW5hYmxlZCA9ICQoJyNNYWlsRW5hYmxlTm90aWZpY2F0aW9ucycpLmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICBjb25zdCAkc2VjdGlvbiA9ICQoJyNub3RpZmljYXRpb24tdHlwZXMtc2VjdGlvbicpO1xuXG4gICAgICAgIGlmIChpc05vdGlmaWNhdGlvbnNFbmFibGVkKSB7XG4gICAgICAgICAgICAkc2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkc2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICByZXR1cm47IC8vIE5vIG5lZWQgdG8gY2hlY2sgaW5kaXZpZHVhbCBmaWVsZHMgaWYgc2VjdGlvbiBpcyBoaWRkZW5cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hcCBvZiB0b2dnbGUgSURzIHRvIHRoZWlyIGNvcnJlc3BvbmRpbmcgZW1haWwgZmllbGQgSURzXG4gICAgICAgIC8vIE5vdGU6IFN5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCBpcyBhbHdheXMgdmlzaWJsZSBhbmQgbm90IGNvbnRyb2xsZWQgYnkgYSB0b2dnbGVcbiAgICAgICAgY29uc3QgdG9nZ2xlRW1haWxNYXAgPSB7XG4gICAgICAgICAgICAnU2VuZE1pc3NlZENhbGxOb3RpZmljYXRpb25zJzogJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJyxcbiAgICAgICAgICAgICdTZW5kVm9pY2VtYWlsTm90aWZpY2F0aW9ucyc6ICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2V0IGluaXRpYWwgdmlzaWJpbGl0eSBmb3IgZWFjaCBlbWFpbCBmaWVsZFxuICAgICAgICBPYmplY3Qua2V5cyh0b2dnbGVFbWFpbE1hcCkuZm9yRWFjaCh0b2dnbGVJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCBlbWFpbEZpZWxkSWQgPSB0b2dnbGVFbWFpbE1hcFt0b2dnbGVJZF07XG4gICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkKGAjJHt0b2dnbGVJZH1gKS5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgIGNvbnN0ICRlbWFpbEZpZWxkID0gJChgIyR7ZW1haWxGaWVsZElkfWApLmNsb3Nlc3QoJy5maWVsZCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgJGVtYWlsRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZW1haWxGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2ggYXV0aCB0eXBlIGNoYW5nZSBoYW5kbGVyXG4gICAgICovXG4gICAgcmVBdHRhY2hBdXRoVHlwZUhhbmRsZXIoKSB7XG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdJykub24oJ2NoYW5nZS5tYWlsc2V0dGluZ3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYXV0aFR5cGUgPSAkKGUudGFyZ2V0KS52YWwoKTtcbiAgICAgICAgICAgIC8vIFdoZW4gdXNlciBtYW51YWxseSBjaGFuZ2VzIGF1dGggdHlwZSwgY2hlY2sgT0F1dGgyIHN0YXR1cyBpZiBuZWVkZWRcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVBdXRoRmllbGRzKGF1dGhUeXBlKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIHdoZW4gYXV0aCB0eXBlIGNoYW5nZXNcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVWYWxpZGF0aW9uUnVsZXMoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYXV0aGVudGljYXRpb24gdHlwZSBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVBdXRoVHlwZUhhbmRsZXJzKCkge1xuICAgICAgICAvLyBBdHRhY2ggaW5pdGlhbCBoYW5kbGVyXG4gICAgICAgIG1haWxTZXR0aW5ncy5yZUF0dGFjaEF1dGhUeXBlSGFuZGxlcigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb24gcGFnZSBsb2FkIC0gZG9uJ3QgY2hlY2sgT0F1dGgyIHN0YXR1cyB5ZXQgKHdpbGwgYmUgZG9uZSBpbiBsb2FkRGF0YSlcbiAgICAgICAgY29uc3QgY3VycmVudEF1dGhUeXBlID0gJCgnaW5wdXRbbmFtZT1cIk1haWxTTVRQQXV0aFR5cGVcIl06Y2hlY2tlZCcpLnZhbCgpIHx8ICdwYXNzd29yZCc7XG4gICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVBdXRoRmllbGRzV2l0aG91dFN0YXR1cyhjdXJyZW50QXV0aFR5cGUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYXV0aGVudGljYXRpb24gZmllbGRzIHdpdGhvdXQgY2hlY2tpbmcgT0F1dGgyIHN0YXR1cyAoZm9yIGluaXRpYWwgc2V0dXApXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGF1dGhUeXBlIC0gQXV0aGVudGljYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzKGF1dGhUeXBlKSB7XG4gICAgICAgIGNvbnN0ICR1c2VybmFtZUZpZWxkID0gJCgnI01haWxTTVRQVXNlcm5hbWUnKS5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgY29uc3QgJHBhc3N3b3JkRmllbGQgPSAkKCcjTWFpbFNNVFBQYXNzd29yZCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICBjb25zdCAkb2F1dGgyU2VjdGlvbiA9ICQoJyNvYXV0aDItYXV0aC1zZWN0aW9uJyk7XG5cbiAgICAgICAgaWYgKGF1dGhUeXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgLy8gRm9yIE9BdXRoMjogc2hvdyB1c2VybmFtZSAocmVxdWlyZWQgZm9yIGVtYWlsIGlkZW50aWZpY2F0aW9uKSwgaGlkZSBwYXNzd29yZFxuICAgICAgICAgICAgJHVzZXJuYW1lRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJHBhc3N3b3JkRmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgJG9hdXRoMlNlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBwYXNzd29yZCBmaWVsZCBlcnJvcnNcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ01haWxTTVRQUGFzc3dvcmQnKTtcbiAgICAgICAgICAgICRwYXNzd29yZEZpZWxkLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIHBhc3N3b3JkIGF1dGg6IHNob3cgYm90aCB1c2VybmFtZSBhbmQgcGFzc3dvcmRcbiAgICAgICAgICAgICR1c2VybmFtZUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICRwYXNzd29yZEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICRvYXV0aDJTZWN0aW9uLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgT0F1dGgyIGZpZWxkIGVycm9yc1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnTWFpbE9BdXRoMlByb3ZpZGVyJyk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdNYWlsT0F1dGgyQ2xpZW50SWQnKTtcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ01haWxPQXV0aDJDbGllbnRTZWNyZXQnKTtcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50SWQnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50U2VjcmV0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGF1dGhlbnRpY2F0aW9uIGZpZWxkcyBiYXNlZCBvbiB0eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGF1dGhUeXBlIC0gQXV0aGVudGljYXRpb24gdHlwZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbc2V0dGluZ3NdIC0gT3B0aW9uYWwgc2V0dGluZ3MgZGF0YSB0byBhdm9pZCBhZGRpdGlvbmFsIEFQSSBjYWxsXG4gICAgICovXG4gICAgdG9nZ2xlQXV0aEZpZWxkcyhhdXRoVHlwZSwgc2V0dGluZ3MgPSBudWxsKSB7XG4gICAgICAgIC8vIEZpcnN0IHRvZ2dsZSBmaWVsZHMgd2l0aG91dCBzdGF0dXMgY2hlY2tcbiAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzKGF1dGhUeXBlKTtcblxuICAgICAgICAvLyBUaGVuIGNoZWNrIE9BdXRoMiBzdGF0dXMgb25seSBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGF1dGhUeXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGV4aXN0aW5nIHNldHRpbmdzIGRhdGEgdG8gYXZvaWQgZHVwbGljYXRlIEFQSSBjYWxsXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZU9BdXRoMlN0YXR1cyhzZXR0aW5ncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIEFQSSBjYWxsIGlmIG5vIHNldHRpbmdzIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0ZXN0IGJ1dHRvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGVzdEJ1dHRvbnMoKSB7XG4gICAgICAgIC8vIFRlc3QgY29ubmVjdGlvbiBidXR0b25cbiAgICAgICAgJCgnI3Rlc3QtY29ubmVjdGlvbi1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gaXMgZGlzYWJsZWQgKGhhcyB1bnNhdmVkIGNoYW5nZXMpXG4gICAgICAgICAgICBpZiAoJChlLmN1cnJlbnRUYXJnZXQpLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoZ2xvYmFsVHJhbnNsYXRlLm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudGVzdENvbm5lY3Rpb24oKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2VuZCB0ZXN0IGVtYWlsIGJ1dHRvblxuICAgICAgICAkKCcjc2VuZC10ZXN0LWVtYWlsLWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBpcyBkaXNhYmxlZCAoaGFzIHVuc2F2ZWQgY2hhbmdlcylcbiAgICAgICAgICAgIGlmICgkKGUuY3VycmVudFRhcmdldCkuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zZW5kVGVzdEVtYWlsKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgcHJvdmlkZXIgZnJvbSBlbWFpbCBhZGRyZXNzXG4gICAgICovXG4gICAgZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwoKSB7XG4gICAgICAgICQoJyNNYWlsU01UUFVzZXJuYW1lJykub24oJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBlbWFpbCA9ICQoZS50YXJnZXQpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFlbWFpbCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9IE1haWxTZXR0aW5nc0FQSS5kZXRlY3RQcm92aWRlcihlbWFpbCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwcm92aWRlciBmaWVsZCB1c2luZyBTZW1hbnRpYyBVSSBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlci1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBwcm92aWRlcik7XG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykudmFsKHByb3ZpZGVyKTtcblxuICAgICAgICAgICAgLy8gU2hvdyByZWNvbW1lbmRhdGlvbnMgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgICAgICAgIGlmIChwcm92aWRlciA9PT0gJ2dvb2dsZScpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Muc2hvd1Byb3ZpZGVySGludCgnR21haWwgZGV0ZWN0ZWQuIE9BdXRoMiBhdXRoZW50aWNhdGlvbiB3aWxsIGJlIHJlcXVpcmVkIGZyb20gTWFyY2ggMjAyNS4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgPT09ICdtaWNyb3NvZnQnKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnNob3dQcm92aWRlckhpbnQoJ01pY3Jvc29mdC9PdXRsb29rIGRldGVjdGVkLiBPQXV0aDIgYXV0aGVudGljYXRpb24gcmVjb21tZW5kZWQuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyID09PSAneWFuZGV4Jykge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zaG93UHJvdmlkZXJIaW50KCdZYW5kZXggTWFpbCBkZXRlY3RlZC4gQm90aCBwYXNzd29yZCBhbmQgT0F1dGgyIGF1dGhlbnRpY2F0aW9uIHN1cHBvcnRlZC4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXV0by1maWxsIFNNVFAgc2V0dGluZ3MgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5hdXRvRmlsbFNNVFBTZXR0aW5ncyhwcm92aWRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgTWFpbFNNVFBVc2VybmFtZSBwbGFjZWhvbGRlciB3aXRoIE1haWxTTVRQU2VuZGVyQWRkcmVzcyB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZW5kZXJBZGRyZXNzIC0gRW1haWwgYWRkcmVzcyBmcm9tIE1haWxTTVRQU2VuZGVyQWRkcmVzcyBmaWVsZFxuICAgICAqL1xuICAgIHVwZGF0ZVVzZXJuYW1lUGxhY2Vob2xkZXIoc2VuZGVyQWRkcmVzcykge1xuICAgICAgICBjb25zdCAkdXNlcm5hbWVGaWVsZCA9ICQoJyNNYWlsU01UUFVzZXJuYW1lJyk7XG4gICAgICAgIGlmIChzZW5kZXJBZGRyZXNzICYmIHNlbmRlckFkZHJlc3MudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgJHVzZXJuYW1lRmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBzZW5kZXJBZGRyZXNzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICR1c2VybmFtZUZpZWxkLnJlbW92ZUF0dHIoJ3BsYWNlaG9sZGVyJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBNYWlsU01UUFNlbmRlckFkZHJlc3MgY2hhbmdlIGhhbmRsZXIgdG8gdXBkYXRlIHVzZXJuYW1lIHBsYWNlaG9sZGVyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNlbmRlckFkZHJlc3NIYW5kbGVyKCkge1xuICAgICAgICAkKCcjTWFpbFNNVFBTZW5kZXJBZGRyZXNzJykub24oJ2lucHV0IGNoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZW5kZXJBZGRyZXNzID0gJChlLnRhcmdldCkudmFsKCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVXNlcm5hbWVQbGFjZWhvbGRlcihzZW5kZXJBZGRyZXNzKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF1dG8tZmlsbCBTTVRQIHNldHRpbmdzIGJhc2VkIG9uIHByb3ZpZGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyIC0gRW1haWwgcHJvdmlkZXJcbiAgICAgKi9cbiAgICBhdXRvRmlsbFNNVFBTZXR0aW5ncyhwcm92aWRlcikge1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGdvb2dsZToge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLmdtYWlsLmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgdGxzOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWljcm9zb2Z0OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAub2ZmaWNlMzY1LmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgdGxzOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeWFuZGV4OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAueWFuZGV4LmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzQ2NScsXG4gICAgICAgICAgICAgICAgdGxzOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChzZXR0aW5nc1twcm92aWRlcl0pIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyU2V0dGluZ3MgPSBzZXR0aW5nc1twcm92aWRlcl07XG5cbiAgICAgICAgICAgIC8vIE9ubHkgZmlsbCBpZiBmaWVsZHMgYXJlIGVtcHR5XG4gICAgICAgICAgICBpZiAoISQoJyNNYWlsU01UUEhvc3QnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUEhvc3QnKS52YWwocHJvdmlkZXJTZXR0aW5ncy5ob3N0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghJCgnI01haWxTTVRQUG9ydCcpLnZhbCgpKSB7XG4gICAgICAgICAgICAgICAgJCgnI01haWxTTVRQUG9ydCcpLnZhbChwcm92aWRlclNldHRpbmdzLnBvcnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZW5jcnlwdGlvbiBkcm9wZG93blxuICAgICAgICAgICAgY29uc3QgJGVuY3J5cHRpb25Ecm9wZG93biA9ICQoJyNNYWlsU01UUFVzZVRMUy1kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRlbmNyeXB0aW9uRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIFByb3ZpZGVyIHNldHRpbmdzIGZvciBlbmNyeXB0aW9uXG4gICAgICAgICAgICAgICAgbGV0IGVuY3J5cHRpb25WYWx1ZSA9ICdub25lJztcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXJTZXR0aW5ncy5wb3J0ID09PSAnNTg3Jykge1xuICAgICAgICAgICAgICAgICAgICBlbmNyeXB0aW9uVmFsdWUgPSAndGxzJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyU2V0dGluZ3MucG9ydCA9PT0gJzQ2NScpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ3NzbCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRlbmNyeXB0aW9uRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGVuY3J5cHRpb25WYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIFNNVFAgc2V0dGluZ3Mgd2hlbiBPQXV0aDIgcHJvdmlkZXIgaXMgc2VsZWN0ZWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXIgLSBTZWxlY3RlZCBPQXV0aDIgcHJvdmlkZXIgKGdvb2dsZSwgbWljcm9zb2Z0LCB5YW5kZXgpXG4gICAgICovXG4gICAgdXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIocHJvdmlkZXIpIHtcbiAgICAgICAgLy8gRG9uJ3QgYXV0by1maWxsIHVudGlsIGluaXRpYWwgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgaWYgKCFtYWlsU2V0dGluZ3MuZGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgT0F1dGgyIGF1dGggdHlwZSBpcyBzZWxlY3RlZFxuICAgICAgICBjb25zdCBhdXRoVHlwZSA9ICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdOmNoZWNrZWQnKS52YWwoKTtcbiAgICAgICAgaWYgKGF1dGhUeXBlICE9PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmaW5lIHByb3ZpZGVyIFNNVFAgc2V0dGluZ3NcbiAgICAgICAgY29uc3QgcHJvdmlkZXJTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGdvb2dsZToge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLmdtYWlsLmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgZW5jcnlwdGlvbjogJ3RscycsXG4gICAgICAgICAgICAgICAgY2VydENoZWNrOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWljcm9zb2Z0OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAtbWFpbC5vdXRsb29rLmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgZW5jcnlwdGlvbjogJ3RscycsXG4gICAgICAgICAgICAgICAgY2VydENoZWNrOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeWFuZGV4OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAueWFuZGV4LnJ1JyxcbiAgICAgICAgICAgICAgICBwb3J0OiAnNTg3JyxcbiAgICAgICAgICAgICAgICBlbmNyeXB0aW9uOiAndGxzJyxcbiAgICAgICAgICAgICAgICBjZXJ0Q2hlY2s6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHByb3ZpZGVyU2V0dGluZ3NbcHJvdmlkZXJdO1xuICAgICAgICBpZiAoIXNldHRpbmdzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgaG9zdFxuICAgICAgICAkKCcjTWFpbFNNVFBIb3N0JykudmFsKHNldHRpbmdzLmhvc3QpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBwb3J0XG4gICAgICAgICQoJyNNYWlsU01UUFBvcnQnKS52YWwoc2V0dGluZ3MucG9ydCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGVuY3J5cHRpb24gdHlwZVxuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMnKS52YWwoc2V0dGluZ3MuZW5jcnlwdGlvbik7XG4gICAgICAgICQoJyNNYWlsU01UUFVzZVRMUy1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZXR0aW5ncy5lbmNyeXB0aW9uKTtcblxuICAgICAgICAvLyBVcGRhdGUgY2VydGlmaWNhdGUgY2hlY2tcbiAgICAgICAgaWYgKHNldHRpbmdzLmNlcnRDaGVjaykge1xuICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBvcnQgYmFzZWQgb24gc2VsZWN0ZWQgZW5jcnlwdGlvbiB0eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGVuY3J5cHRpb25UeXBlIC0gU2VsZWN0ZWQgZW5jcnlwdGlvbiB0eXBlIChub25lL3Rscy9zc2wpXG4gICAgICovXG4gICAgdXBkYXRlUG9ydEJhc2VkT25FbmNyeXB0aW9uKGVuY3J5cHRpb25UeXBlKSB7XG4gICAgICAgIGNvbnN0ICRwb3J0RmllbGQgPSAkKCcjTWFpbFNNVFBQb3J0Jyk7XG5cbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgdGhlIHVzZXIgaGFzbid0IG1hbnVhbGx5IGNoYW5nZWQgdGhlIHBvcnRcbiAgICAgICAgY29uc3QgY3VycmVudFBvcnQgPSAkcG9ydEZpZWxkLnZhbCgpO1xuICAgICAgICBjb25zdCBzdGFuZGFyZFBvcnRzID0gWycyNScsICc1ODcnLCAnNDY1JywgJyddO1xuXG4gICAgICAgIGlmIChzdGFuZGFyZFBvcnRzLmluY2x1ZGVzKGN1cnJlbnRQb3J0KSkge1xuICAgICAgICAgICAgc3dpdGNoIChlbmNyeXB0aW9uVHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgICAgICAkcG9ydEZpZWxkLnZhbCgnMjUnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGxzJzpcbiAgICAgICAgICAgICAgICAgICAgJHBvcnRGaWVsZC52YWwoJzU4NycpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdzc2wnOlxuICAgICAgICAgICAgICAgICAgICAkcG9ydEZpZWxkLnZhbCgnNDY1Jyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIGNlcnRpZmljYXRlIGNoZWNrIGJhc2VkIG9uIGVuY3J5cHRpb24gdHlwZVxuICAgICAgICBjb25zdCAkY2VydENoZWNrRmllbGQgPSAkKCcjY2VydC1jaGVjay1maWVsZCcpO1xuICAgICAgICBpZiAoZW5jcnlwdGlvblR5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgLy8gSGlkZSBjZXJ0aWZpY2F0ZSBjaGVjayBmb3IgdW5lbmNyeXB0ZWQgY29ubmVjdGlvbnNcbiAgICAgICAgICAgICRjZXJ0Q2hlY2tGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAvLyBVbmNoZWNrIHRoZSBjZXJ0aWZpY2F0ZSBjaGVjayB3aGVuIGhpZGluZ1xuICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgY2VydGlmaWNhdGUgY2hlY2sgZm9yIFRMUy9TU0wgY29ubmVjdGlvbnNcbiAgICAgICAgICAgICRjZXJ0Q2hlY2tGaWVsZC5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBwcm92aWRlciBoaW50IG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIEhpbnQgbWVzc2FnZVxuICAgICAqL1xuICAgIHNob3dQcm92aWRlckhpbnQobWVzc2FnZSkge1xuICAgICAgICBjb25zdCAkaGludCA9ICQoJyNwcm92aWRlci1oaW50Jyk7XG4gICAgICAgIGlmICgkaGludC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICQoJyNNYWlsU01UUFVzZXJuYW1lJykuYWZ0ZXIoYDxkaXYgaWQ9XCJwcm92aWRlci1oaW50XCIgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2VcIj4ke21lc3NhZ2V9PC9kaXY+YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkaGludC50ZXh0KG1lc3NhZ2UpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgT0F1dGgyIGNhbGxiYWNrIHBhcmFtZXRlcnMgZnJvbSBVUkxcbiAgICAgKi9cbiAgICBoYW5kbGVPQXV0aDJDYWxsYmFjaygpIHtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblxuICAgICAgICAvLyBDaGVjayBmb3Igc3VjY2Vzc1xuICAgICAgICBpZiAodXJsUGFyYW1zLmhhcygnb2F1dGhfc3VjY2VzcycpKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgc2V0dGluZ3MgdG8gc2hvdyB1cGRhdGVkIE9BdXRoMiBzdGF0dXNcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5sb2FkU2V0dGluZ3NGcm9tQVBJKCk7XG4gICAgICAgICAgICAvLyBDbGVhbiBVUkxcbiAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgZG9jdW1lbnQudGl0bGUsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBmb3IgZXJyb3JcbiAgICAgICAgaWYgKHVybFBhcmFtcy5oYXMoJ29hdXRoX2Vycm9yJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yID0gdXJsUGFyYW1zLmdldCgnb2F1dGhfZXJyb3InKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihcbiAgICAgICAgICAgICAgICAoZ2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMkF1dGhvcml6YXRpb25GYWlsZWQgfHwgJ9Ce0YjQuNCx0LrQsCBPQXV0aDIg0LDQstGC0L7RgNC40LfQsNGG0LjQuDogJykgKyBkZWNvZGVVUklDb21wb25lbnQoZXJyb3IpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgLy8gQ2xlYW4gVVJMXG4gICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIGRvY3VtZW50LnRpdGxlLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0IE9BdXRoMiBhdXRob3JpemF0aW9uIGZsb3dcbiAgICAgKi9cbiAgICBzdGFydE9BdXRoMkZsb3coKSB7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyID0gJCgnI01haWxPQXV0aDJQcm92aWRlcicpLnZhbCgpIHx8ICQoJyNNYWlsT0F1dGgyUHJvdmlkZXItZHJvcGRvd24nKS5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG5cbiAgICAgICAgaWYgKCFwcm92aWRlciB8fCBwcm92aWRlciA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVPQXV0aDJQcm92aWRlckVtcHR5IHx8ICfQktGL0LHQtdGA0LjRgtC1IE9BdXRoMiDQv9GA0L7QstCw0LnQtNC10YDQsCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgQ2xpZW50IElEIGFuZCBTZWNyZXQgYXJlIGNvbmZpZ3VyZWRcbiAgICAgICAgY29uc3QgY2xpZW50SWQgPSAkKCcjTWFpbE9BdXRoMkNsaWVudElkJykudmFsKCk7XG4gICAgICAgIGNvbnN0IGNsaWVudFNlY3JldCA9ICQoJyNNYWlsT0F1dGgyQ2xpZW50U2VjcmV0JykudmFsKCk7XG5cbiAgICAgICAgaWYgKCFjbGllbnRJZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU9BdXRoMkNsaWVudElkRW1wdHkgfHwgJ9CS0LLQtdC00LjRgtC1IENsaWVudCBJRCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjbGllbnRTZWNyZXQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVPQXV0aDJDbGllbnRTZWNyZXRFbXB0eSB8fCAn0JLQstC10LTQuNGC0LUgQ2xpZW50IFNlY3JldCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2F2ZSBPQXV0aDIgY3JlZGVudGlhbHMgYmVmb3JlIHN0YXJ0aW5nIHRoZSBmbG93XG4gICAgICAgIG1haWxTZXR0aW5ncy5zYXZlT0F1dGgyQ3JlZGVudGlhbHMocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQpO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzIGFuZCB0aGVuIHN0YXJ0IGF1dGhvcml6YXRpb24gZmxvd1xuICAgICAqL1xuICAgIHNhdmVPQXV0aDJDcmVkZW50aWFscyhwcm92aWRlciwgY2xpZW50SWQsIGNsaWVudFNlY3JldCkge1xuICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgTWFpbE9BdXRoMlByb3ZpZGVyOiBwcm92aWRlcixcbiAgICAgICAgICAgIE1haWxPQXV0aDJDbGllbnRJZDogY2xpZW50SWQsXG4gICAgICAgICAgICBNYWlsT0F1dGgyQ2xpZW50U2VjcmV0OiBjbGllbnRTZWNyZXRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBVc2UgTWFpbFNldHRpbmdzQVBJIGZvciBjb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5wYXRjaFNldHRpbmdzKGRhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWRlbnRpYWxzIHNhdmVkLCBub3cgZ2V0IE9BdXRoMiBVUkxcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MucHJvY2VlZFdpdGhPQXV0aDJGbG93KHByb3ZpZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW01haWxTZXR0aW5nc10gRmFpbGVkIHRvIHNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvclxuICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJylcbiAgICAgICAgICAgICAgICAgICAgOiAnRmFpbGVkIHRvIHNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgT0F1dGgyIGF1dGhvcml6YXRpb24gVVJMIGFuZCBvcGVuIGF1dGhvcml6YXRpb24gd2luZG93XG4gICAgICovXG4gICAgcmVxdWVzdE9BdXRoMkF1dGhVcmwocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQpIHtcbiAgICAgICAgLy8gUmVxdWVzdCBhdXRob3JpemF0aW9uIFVSTCBmcm9tIEFQSVxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuYXV0aG9yaXplT0F1dGgyKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0LCAoYXV0aFVybCkgPT4ge1xuXG4gICAgICAgICAgICBpZiAoYXV0aFVybCkge1xuICAgICAgICAgICAgICAgIC8vIE9wZW4gYXV0aG9yaXphdGlvbiB3aW5kb3dcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IDYwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWlnaHQgPSA3MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IChzY3JlZW4ud2lkdGggLyAyKSAtICh3aWR0aCAvIDIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvcCA9IChzY3JlZW4uaGVpZ2h0IC8gMikgLSAoaGVpZ2h0IC8gMik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhdXRoV2luZG93ID0gd2luZG93Lm9wZW4oXG4gICAgICAgICAgICAgICAgICAgIGF1dGhVcmwsXG4gICAgICAgICAgICAgICAgICAgICdvYXV0aDItYXV0aCcsXG4gICAgICAgICAgICAgICAgICAgIGB3aWR0aD0ke3dpZHRofSxoZWlnaHQ9JHtoZWlnaHR9LGxlZnQ9JHtsZWZ0fSx0b3A9JHt0b3B9YFxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWF1dGhXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdQbGVhc2UgYWxsb3cgcG9wdXBzIGZvciBPQXV0aDIgYXV0aG9yaXphdGlvbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJBdXRob3JpemF0aW9uRmFpbGVkIHx8ICfQntGI0LjQsdC60LAg0LDQstGC0L7RgNC40LfQsNGG0LjQuCBPQXV0aDInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByb2NlZWQgd2l0aCBPQXV0aDIgZmxvdyBhZnRlciBjcmVkZW50aWFscyBhcmUgc2F2ZWRcbiAgICAgKi9cbiAgICBwcm9jZWVkV2l0aE9BdXRoMkZsb3cocHJvdmlkZXIpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gR2V0IE9BdXRoMiBVUkwgd2l0aCBzYXZlZCBjcmVkZW50aWFsc1xuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuZ2V0T0F1dGgyVXJsKHByb3ZpZGVyLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5hdXRoX3VybCkge1xuXG4gICAgICAgICAgICAgICAgLy8gT3BlbiBPQXV0aDIgd2luZG93XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSA2MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gNzAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSAoc2NyZWVuLndpZHRoIC8gMikgLSAod2lkdGggLyAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSAoc2NyZWVuLmhlaWdodCAvIDIpIC0gKGhlaWdodCAvIDIpO1xuXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdyA9IHdpbmRvdy5vcGVuKFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5hdXRoX3VybCxcbiAgICAgICAgICAgICAgICAgICAgJ09BdXRoMkF1dGhvcml6YXRpb24nLFxuICAgICAgICAgICAgICAgICAgICBgd2lkdGg9JHt3aWR0aH0saGVpZ2h0PSR7aGVpZ2h0fSxsZWZ0PSR7bGVmdH0sdG9wPSR7dG9wfWBcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2luZG93IHdhcyBibG9ja2VkXG4gICAgICAgICAgICAgICAgaWYgKCFtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignUGxlYXNlIGFsbG93IHBvcHVwcyBmb3IgT0F1dGgyIGF1dGhvcml6YXRpb24nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNYWlsU2V0dGluZ3NdIE5vIGF1dGhfdXJsIGluIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ0ZhaWxlZCB0byBnZXQgT0F1dGgyIGF1dGhvcml6YXRpb24gVVJMJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgT0F1dGgyIGNhbGxiYWNrIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0ge01lc3NhZ2VFdmVudH0gZXZlbnQgLSBNZXNzYWdlIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlT0F1dGgyTWVzc2FnZShldmVudCkge1xuICAgICAgICAvLyBWYWxpZGF0ZSBvcmlnaW5cbiAgICAgICAgaWYgKGV2ZW50Lm9yaWdpbiAhPT0gd2luZG93LmxvY2F0aW9uLm9yaWdpbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIE9BdXRoMiBjYWxsYmFjayBkYXRhXG4gICAgICAgIGlmIChldmVudC5kYXRhICYmIGV2ZW50LmRhdGEudHlwZSA9PT0gJ29hdXRoMi1jYWxsYmFjaycpIHtcbiAgICAgICAgICAgIC8vIENsb3NlIE9BdXRoMiB3aW5kb3dcbiAgICAgICAgICAgIGlmIChtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93KSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQcm9jZXNzIGNhbGxiYWNrXG4gICAgICAgICAgICBNYWlsU2V0dGluZ3NBUEkuaGFuZGxlT0F1dGgyQ2FsbGJhY2soZXZlbnQuZGF0YS5wYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKCdPQXV0aDIgYXV0aG9yaXphdGlvbiBzdWNjZXNzZnVsJyk7XG4gICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5jaGVja09BdXRoMlN0YXR1cygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignT0F1dGgyIGF1dGhvcml6YXRpb24gZmFpbGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE9BdXRoMiBzdGF0dXMgZGlzcGxheSB1c2luZyBwcm92aWRlZCBzZXR0aW5ncyBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YSBjb250YWluaW5nIG9hdXRoMl9zdGF0dXNcbiAgICAgKi9cbiAgICB1cGRhdGVPQXV0aDJTdGF0dXMoc2V0dGluZ3MpIHtcbiAgICAgICAgaWYgKHNldHRpbmdzICYmIHNldHRpbmdzLm9hdXRoMl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IHNldHRpbmdzLm9hdXRoMl9zdGF0dXM7XG4gICAgICAgICAgICBjb25zdCAkc3RhdHVzRGl2ID0gJCgnI29hdXRoMi1zdGF0dXMnKTtcbiAgICAgICAgICAgIGNvbnN0ICRjbGllbnRJZEZpZWxkID0gJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgJGNsaWVudFNlY3JldEZpZWxkID0gJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS5jbG9zZXN0KCcuZmllbGQnKTtcblxuICAgICAgICAgICAgaWYgKHN0YXR1cy5jb25maWd1cmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJOYW1lID0gTWFpbFNldHRpbmdzQVBJLmdldFByb3ZpZGVyTmFtZShzdGF0dXMucHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RlZFRleHQgPSBnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyQ29ubmVjdGVkVG8ucmVwbGFjZSgne3Byb3ZpZGVyfScsIHByb3ZpZGVyTmFtZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBEb24ndCBhZGQgZXh0cmEgc3RhdHVzIHRleHQgLSBcIkNvbm5lY3RlZFwiIGFscmVhZHkgaW1wbGllcyBhdXRob3JpemVkXG4gICAgICAgICAgICAgICAgJHN0YXR1c0Rpdi5odG1sKGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2hlY2sgY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2Nvbm5lY3RlZFRleHR9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWRpc2Nvbm5lY3QnKS5zaG93KCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIENsaWVudCBJRCBhbmQgQ2xpZW50IFNlY3JldCBmaWVsZHMgd2hlbiBhdXRob3JpemVkXG4gICAgICAgICAgICAgICAgaWYgKHN0YXR1cy5hdXRob3JpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRJZEZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNsaWVudFNlY3JldEZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkY2xpZW50SWRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRTZWNyZXRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdHVzRGl2Lmh0bWwoYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJOb3RDb25maWd1cmVkfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJCgnI29hdXRoMi1kaXNjb25uZWN0JykuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBDbGllbnQgSUQgYW5kIENsaWVudCBTZWNyZXQgZmllbGRzIHdoZW4gbm90IGF1dGhvcml6ZWRcbiAgICAgICAgICAgICAgICAkY2xpZW50SWRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsaWVudFNlY3JldEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBPQXV0aDIgY29ubmVjdGlvbiBzdGF0dXMgKG1ha2VzIEFQSSBjYWxsKVxuICAgICAqL1xuICAgIGNoZWNrT0F1dGgyU3RhdHVzKCkge1xuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlT0F1dGgyU3RhdHVzKHNldHRpbmdzKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc2Nvbm5lY3QgT0F1dGgyXG4gICAgICovXG4gICAgZGlzY29ubmVjdE9BdXRoMigpIHtcbiAgICAgICAgLy8gQ2xlYXIgT0F1dGgyIHRva2VucyBpbW1lZGlhdGVseSB3aXRob3V0IGNvbmZpcm1hdGlvblxuICAgICAgICBjb25zdCBjbGVhckRhdGEgPSB7XG4gICAgICAgICAgICBNYWlsT0F1dGgyUmVmcmVzaFRva2VuOiAnJyxcbiAgICAgICAgICAgIE1haWxPQXV0aDJBY2Nlc3NUb2tlbjogJycsXG4gICAgICAgICAgICBNYWlsT0F1dGgyVG9rZW5FeHBpcmVzOiAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5wYXRjaFNldHRpbmdzKGNsZWFyRGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gSnVzdCB1cGRhdGUgdGhlIHN0YXR1cyB3aXRob3V0IHNob3dpbmcgYSBtZXNzYWdlXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgQ2xpZW50IElEIGFuZCBDbGllbnQgU2VjcmV0IGZpZWxkcyBhZ2FpblxuICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50SWQnKS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignRmFpbGVkIHRvIGRpc2Nvbm5lY3QgT0F1dGgyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUZXN0IFNNVFAgY29ubmVjdGlvblxuICAgICAqL1xuICAgIHRlc3RDb25uZWN0aW9uKCkge1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3Rlc3QtY29ubmVjdGlvbi1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHJlc3VsdEFyZWEgPSAkKCcjdGVzdC1jb25uZWN0aW9uLXJlc3VsdCcpO1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHJlc3VsdFxuICAgICAgICAkcmVzdWx0QXJlYS5yZW1vdmUoKTtcblxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLnRlc3RDb25uZWN0aW9uKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgcmVzdWx0IGFyZWEgbmV4dCB0byBidXR0b25cbiAgICAgICAgICAgIGxldCAkcmVzdWx0ID0gJCgnPGRpdiBpZD1cInRlc3QtY29ubmVjdGlvbi1yZXN1bHRcIiBjbGFzcz1cInVpIHNtYWxsIG1lc3NhZ2VcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRidXR0b24ucGFyZW50KCkuYXBwZW5kKCRyZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygncG9zaXRpdmUnKS5odG1sKCc8aSBjbGFzcz1cImNoZWNrIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgKHJlc3BvbnNlLm1lc3NhZ2VzPy5zdWNjZXNzPy5bMF0gfHwgJ0Nvbm5lY3Rpb24gc3VjY2Vzc2Z1bCcpKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZGlhZ25vc3RpY3MgaW5mbyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YT8uZGlhZ25vc3RpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlhZyA9IHJlc3BvbnNlLmRhdGEuZGlhZ25vc3RpY3M7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHNtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYEF1dGg6ICR7ZGlhZy5hdXRoX3R5cGV9LCBTZXJ2ZXI6ICR7ZGlhZy5zbXRwX2hvc3R9OiR7ZGlhZy5zbXRwX3BvcnR9LCBFbmNyeXB0aW9uOiAke2RpYWcuc210cF9lbmNyeXB0aW9ufWA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWFnLmF1dGhfdHlwZSA9PT0gJ29hdXRoMicgJiYgZGlhZy5vYXV0aDJfcHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYDxicj5PQXV0aDI6ICR7ZGlhZy5vYXV0aDJfcHJvdmlkZXJ9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvbid0IHNob3cgZXhwaXJlZCB0b2tlbiB3YXJuaW5nIGlmIGNvbm5lY3Rpb24gaXMgc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgaXQgbWVhbnMgcmVmcmVzaCB0b2tlbiBpcyB3b3JraW5nIGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcub2F1dGgyX3JlZnJlc2hfdG9rZW5fZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgIC0gJHtnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY0F1dGhvcml6ZWR9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9ICc8L3NtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGRldGFpbHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBzaW1wbGUsIHVzZXItZnJpZW5kbHkgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGxldCBtYWluTWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5tc19EaWFnbm9zdGljQ29ubmVjdGlvbkZhaWxlZDtcblxuICAgICAgICAgICAgICAgIC8vIFVzZSBkZXRhaWxlZCBlcnJvciBhbmFseXNpcyBpZiBhdmFpbGFibGUgZm9yIGJldHRlciB1c2VyIGV4cGVyaWVuY2VcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmVycm9yX2RldGFpbHM/LnByb2JhYmxlX2NhdXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW5NZXNzYWdlID0gcmVzcG9uc2UuZGF0YS5lcnJvcl9kZXRhaWxzLnByb2JhYmxlX2NhdXNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRyZXN1bHQuYWRkQ2xhc3MoJ25lZ2F0aXZlJykuaHRtbCgnPGkgY2xhc3M9XCJ0aW1lcyBjaXJjbGUgaWNvblwiPjwvaT4gJyArIG1haW5NZXNzYWdlKTtcblxuICAgICAgICAgICAgICAgIC8vIFNraXAgc2hvd2luZyBlcnJvciB0eXBlIGxhYmVsIC0gaXQncyB0b28gdGVjaG5pY2FsIGZvciBtb3N0IHVzZXJzXG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IHJhdyBQSFBNYWlsZXIgZXJyb3IgaW4gYSBjb2xsYXBzaWJsZSBzZWN0aW9uIG9ubHkgaWYgaXQncyBzaWduaWZpY2FudGx5IGRpZmZlcmVudFxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uZXJyb3JfZGV0YWlscz8ucmF3X2Vycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJhd0Vycm9yID0gcmVzcG9uc2UuZGF0YS5lcnJvcl9kZXRhaWxzLnJhd19lcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBzaG93IHRlY2huaWNhbCBkZXRhaWxzIGlmIHRoZXkgY29udGFpbiBtb3JlIGluZm8gdGhhbiB0aGUgdXNlciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGlmIChyYXdFcnJvci5sZW5ndGggPiBtYWluTWVzc2FnZS5sZW5ndGggKyA1MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbHNIdG1sID0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGFjY29yZGlvblwiIHN0eWxlPVwibWFyZ2luLXRvcDogMTBweDtcIj4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gYDxkaXYgY2xhc3M9XCJ0aXRsZVwiPjxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5tc19EaWFnbm9zdGljVGVjaG5pY2FsRGV0YWlsc308L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gYDxkaXYgY2xhc3M9XCJjb250ZW50XCI+PGNvZGUgc3R5bGU9XCJmb250LXNpemU6IDExcHg7IHdvcmQtYnJlYWs6IGJyZWFrLWFsbDsgZGlzcGxheTogYmxvY2s7IHdoaXRlLXNwYWNlOiBwcmUtd3JhcDtcIj4ke3Jhd0Vycm9yfTwvY29kZT48L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzSHRtbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgYWNjb3JkaW9uIGZvciB0ZWNobmljYWwgZGV0YWlsc1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5maW5kKCcuYWNjb3JkaW9uJykuYWNjb3JkaW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IG1pbmltYWwgZGlhZ25vc3RpY3MgaW5mbyBmb3IgZmFpbGVkIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5kaWFnbm9zdGljcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaWFnID0gcmVzcG9uc2UuZGF0YS5kaWFnbm9zdGljcztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgJHtkaWFnLmF1dGhfdHlwZS50b1VwcGVyQ2FzZSgpfTogJHtkaWFnLnNtdHBfaG9zdH06JHtkaWFnLnNtdHBfcG9ydH1gO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlhZy5zbXRwX2VuY3J5cHRpb24gJiYgZGlhZy5zbXRwX2VuY3J5cHRpb24gIT09ICdub25lJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgICgke2RpYWcuc210cF9lbmNyeXB0aW9uLnRvVXBwZXJDYXNlKCl9KWA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSAnPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGhpbnRzIGlmIGF2YWlsYWJsZSAtIGxpbWl0IHRvIHRvcCAzIG1vc3QgcmVsZXZhbnQgb25lc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uaGludHMgJiYgcmVzcG9uc2UuZGF0YS5oaW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBoaW50cyA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjxzdHJvbmc+0KDQtdC60L7QvNC10L3QtNCw0YbQuNC4Ojwvc3Ryb25nPjx1bD4nO1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG1heCAzIGhpbnRzIHRvIGF2b2lkIG92ZXJ3aGVsbWluZyB0aGUgdXNlclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWxldmFudEhpbnRzID0gcmVzcG9uc2UuZGF0YS5oaW50cy5zbGljZSgwLCAzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVsZXZhbnRIaW50cy5mb3JFYWNoKGhpbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBFbmdsaXNoIGhpbnRzIGlmIHdlIGhhdmUgUnVzc2lhbiBvbmVzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGludC5pbmNsdWRlcygnT0F1dGgyIGFjY2VzcyB0b2tlbiBleHBpcmVkJykgJiYgcmVsZXZhbnRIaW50cy5zb21lKGggPT4gaC5pbmNsdWRlcygn0YLQvtC60LXQvScpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGhpbnRzICs9IGA8bGk+JHtoaW50fTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGhpbnRzICs9ICc8L3VsPic7XG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGhpbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEF1dG8taGlkZSBhZnRlciAzMCBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmZhZGVPdXQoNDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIDMwMDAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgdGVzdCBlbWFpbFxuICAgICAqL1xuICAgIHNlbmRUZXN0RW1haWwoKSB7XG4gICAgICAgIGNvbnN0IHJlY2lwaWVudCA9ICQoJyNTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnKS52YWwoKTtcblxuICAgICAgICBpZiAoIXJlY2lwaWVudCkge1xuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBuZXh0IHRvIGJ1dHRvblxuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJyNzZW5kLXRlc3QtZW1haWwtYnV0dG9uJyk7XG4gICAgICAgICAgICBsZXQgJHJlc3VsdCA9ICQoJzxkaXYgaWQ9XCJzZW5kLXRlc3QtcmVzdWx0XCIgY2xhc3M9XCJ1aSBzbWFsbCBuZWdhdGl2ZSBtZXNzYWdlXCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAkcmVzdWx0Lmh0bWwoJzxpIGNsYXNzPVwidGltZXMgY2lyY2xlIGljb25cIj48L2k+IFBsZWFzZSBlbnRlciBhIHJlY2lwaWVudCBlbWFpbCBhZGRyZXNzJyk7XG4gICAgICAgICAgICAkKCcjc2VuZC10ZXN0LXJlc3VsdCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgJGJ1dHRvbi5wYXJlbnQoKS5hcHBlbmQoJHJlc3VsdCk7XG5cbiAgICAgICAgICAgIC8vIEF1dG8taGlkZSBhZnRlciAxMCBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmZhZGVPdXQoNDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIDEwMDAwKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjc2VuZC10ZXN0LWVtYWlsLWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkcmVzdWx0QXJlYSA9ICQoJyNzZW5kLXRlc3QtcmVzdWx0Jyk7XG5cbiAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgcmVzdWx0XG4gICAgICAgICRyZXN1bHRBcmVhLnJlbW92ZSgpO1xuXG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgdG86IHJlY2lwaWVudFxuICAgICAgICAgICAgLy8gTGV0IHRoZSBzZXJ2ZXIgZ2VuZXJhdGUgZW5oYW5jZWQgZW1haWwgY29udGVudCB3aXRoIHN5c3RlbSBpbmZvXG4gICAgICAgIH07XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLnNlbmRUZXN0RW1haWwoZGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSByZXN1bHQgYXJlYSBuZXh0IHRvIGJ1dHRvblxuICAgICAgICAgICAgbGV0ICRyZXN1bHQgPSAkKCc8ZGl2IGlkPVwic2VuZC10ZXN0LXJlc3VsdFwiIGNsYXNzPVwidWkgc21hbGwgbWVzc2FnZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgJGJ1dHRvbi5wYXJlbnQoKS5hcHBlbmQoJHJlc3VsdCk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIGFjdHVhbCByZWNpcGllbnQgZnJvbSByZXNwb25zZVxuICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbFJlY2lwaWVudCA9IHJlc3BvbnNlLmRhdGE/LnRvIHx8IHJlY2lwaWVudDtcblxuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgbWVzc2FnZSBmcm9tIEFQSSB3aGljaCBhbHJlYWR5IGluY2x1ZGVzIHRoZSBlbWFpbCBhZGRyZXNzXG4gICAgICAgICAgICAgICAgbGV0IHN1Y2Nlc3NNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXM/LnN1Y2Nlc3M/LlswXSB8fCAnVGVzdCBlbWFpbCBzZW50JztcblxuICAgICAgICAgICAgICAgIC8vIElmIG1lc3NhZ2UgZG9lc24ndCBpbmNsdWRlIGVtYWlsIGJ1dCB3ZSBoYXZlIGl0LCBhZGQgaXRcbiAgICAgICAgICAgICAgICBpZiAoIXN1Y2Nlc3NNZXNzYWdlLmluY2x1ZGVzKCdAJykgJiYgYWN0dWFsUmVjaXBpZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NNZXNzYWdlID0gc3VjY2Vzc01lc3NhZ2UucmVwbGFjZSgn0J/QuNGB0YzQvNC+INC+0YLQv9GA0LDQstC70LXQvdC+JywgYNCf0LjRgdGM0LzQviDQvtGC0L/RgNCw0LLQu9C10L3QviDihpIgJHthY3R1YWxSZWNpcGllbnR9YCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygncG9zaXRpdmUnKS5odG1sKFxuICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJjaGVjayBjaXJjbGUgaWNvblwiPjwvaT4gJyArIHN1Y2Nlc3NNZXNzYWdlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZGlhZ25vc3RpY3MgaW5mbyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YT8uZGlhZ25vc3RpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlhZyA9IHJlc3BvbnNlLmRhdGEuZGlhZ25vc3RpY3M7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHNtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWFnLmF1dGhfdHlwZSA9PT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gZGlhZy5vYXV0aDJfcHJvdmlkZXIgfHwgJ09BdXRoMic7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGBVc2luZzogT0F1dGgyYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ09BdXRoMicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGAgKCR7cHJvdmlkZXJ9KWA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGBVc2luZzogUGFzc3dvcmQgYXV0aGVudGljYXRpb25gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCwgU2VydmVyOiAke2RpYWcuc210cF9ob3N0fToke2RpYWcuc210cF9wb3J0fWA7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gJzwvc21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlscyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gcmVzcG9uc2U/Lm1lc3NhZ2VzPy5lcnJvcj8uam9pbignLCAnKSB8fCBnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY0Nvbm5lY3Rpb25GYWlsZWQ7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygnbmVnYXRpdmUnKS5odG1sKCc8aSBjbGFzcz1cInRpbWVzIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgbWVzc2FnZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGRldGFpbGVkIGVycm9yIGFuYWx5c2lzIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uZXJyb3JfZGV0YWlscykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvckRldGFpbHMgPSByZXNwb25zZS5kYXRhLmVycm9yX2RldGFpbHM7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzSHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2Pic7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBzaG93aW5nIGVycm9yIHR5cGUgbGFiZWwgLSBpdCdzIHRvbyB0ZWNobmljYWwgZm9yIG1vc3QgdXNlcnNcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3JEZXRhaWxzLnByb2JhYmxlX2NhdXNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSBgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5tc19EaWFnbm9zdGljUHJvYmFibGVDYXVzZX08L3N0cm9uZz4gJHtlcnJvckRldGFpbHMucHJvYmFibGVfY2F1c2V9PGJyPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHJhdyBQSFBNYWlsZXIgZXJyb3IgaW4gYSBjb2xsYXBzaWJsZSBzZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvckRldGFpbHMucmF3X2Vycm9yICYmIGVycm9yRGV0YWlscy5yYXdfZXJyb3IgIT09IG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBhY2NvcmRpb25cIiBzdHlsZT1cIm1hcmdpbi10b3A6IDEwcHg7XCI+JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8ZGl2IGNsYXNzPVwidGl0bGVcIj48aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY1RlY2huaWNhbERldGFpbHN9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8ZGl2IGNsYXNzPVwiY29udGVudFwiPjxjb2RlIHN0eWxlPVwiZm9udC1zaXplOiAxMXB4OyB3b3JkLWJyZWFrOiBicmVhay1hbGw7XCI+JHtlcnJvckRldGFpbHMucmF3X2Vycm9yfTwvY29kZT48L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzSHRtbCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBhY2NvcmRpb24gZm9yIHRlY2huaWNhbCBkZXRhaWxzXG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuZmluZCgnLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNob3cgaGludHMgaWYgYXZhaWxhYmxlIC0gbGltaXQgdG8gdG9wIDMgbW9zdCByZWxldmFudCBvbmVzXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5oaW50cyAmJiByZXNwb25zZS5kYXRhLmhpbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGhpbnRzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHN0cm9uZz7QoNC10LrQvtC80LXQvdC00LDRhtC40Lg6PC9zdHJvbmc+PHVsPic7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgbWF4IDMgaGludHMgdG8gYXZvaWQgb3ZlcndoZWxtaW5nIHRoZSB1c2VyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbGV2YW50SGludHMgPSByZXNwb25zZS5kYXRhLmhpbnRzLnNsaWNlKDAsIDMpO1xuICAgICAgICAgICAgICAgICAgICByZWxldmFudEhpbnRzLmZvckVhY2goaGludCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIEVuZ2xpc2ggaGludHMgaWYgd2UgaGF2ZSBSdXNzaWFuIG9uZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoaW50LmluY2x1ZGVzKCdPQXV0aDIgYWNjZXNzIHRva2VuIGV4cGlyZWQnKSAmJiByZWxldmFudEhpbnRzLnNvbWUoaCA9PiBoLmluY2x1ZGVzKCfRgtC+0LrQtdC9JykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaGludHMgKz0gYDxsaT4ke2hpbnR9PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaGludHMgKz0gJzwvdWw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoaGludHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXV0by1oaWRlIGFmdGVyIDMwIHNlY29uZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRyZXN1bHQuZmFkZU91dCg0MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgMzAwMDApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIEdldCB1bm1hc2tlZCB2YWx1ZXMgZm9yIGVtYWlsIGZpZWxkcyBGSVJTVFxuICAgICAgICBjb25zdCBlbWFpbEZpZWxkcyA9IFtcbiAgICAgICAgICAgICdNYWlsU01UUFNlbmRlckFkZHJlc3MnLFxuICAgICAgICAgICAgJ1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCcsXG4gICAgICAgICAgICAnU3lzdGVtRW1haWxGb3JNaXNzZWQnLFxuICAgICAgICAgICAgJ1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCdcbiAgICAgICAgXTtcblxuICAgICAgICBlbWFpbEZpZWxkcy5mb3JFYWNoKGZpZWxkSWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJChgIyR7ZmllbGRJZH1gKTtcbiAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGxldCBvcmlnaW5hbFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICcnO1xuICAgICAgICAgICAgICAgIGxldCBmaWVsZFZhbHVlID0gb3JpZ2luYWxWYWx1ZTtcblxuICAgICAgICAgICAgICAgIC8vIEZvciBlbWFpbCBpbnB1dG1hc2ssIHRyeSBkaWZmZXJlbnQgYXBwcm9hY2hlcyB0byBnZXQgY2xlYW4gdmFsdWVcbiAgICAgICAgICAgICAgICBpZiAoZmllbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB2YWx1ZSBjb250YWlucyBwbGFjZWhvbGRlciBwYXR0ZXJuc1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmllbGRWYWx1ZS5pbmNsdWRlcygnX0BfJykgfHwgZmllbGRWYWx1ZSA9PT0gJ0AuJyB8fCBmaWVsZFZhbHVlID09PSAnQCcgfHwgZmllbGRWYWx1ZSA9PT0gJ18nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWVsZFZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZ2V0IHVubWFza2VkIHZhbHVlIGZvciBlbWFpbCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaW5wdXRtYXNrIHBsdWdpbiBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlucHV0bWFzayAmJiB0eXBlb2YgJGZpZWxkLmlucHV0bWFzayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1bm1hc2tlZFZhbHVlID0gJGZpZWxkLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodW5tYXNrZWRWYWx1ZSAmJiB1bm1hc2tlZFZhbHVlICE9PSBmaWVsZFZhbHVlICYmICF1bm1hc2tlZFZhbHVlLmluY2x1ZGVzKCdfJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkVmFsdWUgPSB1bm1hc2tlZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW01haWxTZXR0aW5nc10gRmFpbGVkIHRvIGdldCB1bm1hc2tlZCB2YWx1ZSBmb3IgJHtmaWVsZElkfTpgLCBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZElkXSA9IGZpZWxkVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBObyBzdWNjZXNzIG1lc3NhZ2UgbmVlZGVkIC0gZm9ybSBzYXZlcyBzaWxlbnRseVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIGZvciBzYXZpbmcgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG1haWxTZXR0aW5ncy4kZm9ybU9iajtcblxuICAgICAgICAvLyBFbmFibGUgUkVTVCBBUEkgbW9kZSAobW9kZXJuIGFwcHJvYWNoIGxpa2UgR2VuZXJhbFNldHRpbmdzKVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE1haWxTZXR0aW5nc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3BhdGNoU2V0dGluZ3MnO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb24gZm9yIGNsZWFuZXIgQVBJIHJlcXVlc3RzXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIEVuYWJsZSBzZW5kaW5nIG9ubHkgY2hhbmdlZCBmaWVsZHMgZm9yIG9wdGltYWwgUEFUQ0ggc2VtYW50aWNzXG4gICAgICAgIEZvcm0uc2VuZE9ubHlDaGFuZ2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBObyByZWRpcmVjdCBhZnRlciBzYXZlIC0gc3RheSBvbiB0aGUgc2FtZSBwYWdlXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBudWxsO1xuXG4gICAgICAgIC8vIFVzZSAnIycgZm9yIFVSTCB3aGVuIHVzaW5nIGFwaVNldHRpbmdzXG4gICAgICAgIEZvcm0udXJsID0gJyMnO1xuXG4gICAgICAgIC8vIFVzZSBkeW5hbWljIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gY3VycmVudCBzdGF0ZVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBtYWlsU2V0dGluZ3MuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBtYWlsU2V0dGluZ3MuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBtYWlsU2V0dGluZ3MuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIE9BdXRoMiBldmVudHNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb09BdXRoMkV2ZW50cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIFN1YnNjcmliZSB0byBPQXV0aDIgYXV0aG9yaXphdGlvbiBldmVudHNcbiAgICAgICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnb2F1dGgyLWF1dGhvcml6YXRpb24nLCAoZGF0YSkgPT4ge1xuXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuc3RhdHVzID09PSAnc3VjY2VzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3VjY2VzczogcmVmcmVzaCBPQXV0aDIgc3RhdHVzIGFmdGVyIGEgc2hvcnQgZGVsYXlcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuY2hlY2tPQXV0aDJTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLnN0YXR1cyA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBFcnJvcjogc2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyUHJvY2Vzc2luZ0ZhaWxlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIDQwMDBcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb25pdG9yIGZvcm0gY2hhbmdlcyB0byBjb250cm9sIHRlc3QgYnV0dG9uIHN0YXRlc1xuICAgICAqL1xuICAgIG1vbml0b3JGb3JtQ2hhbmdlcygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGx5IGJ1dHRvbnMgc2hvdWxkIGJlIGVuYWJsZWQgKG5vIGNoYW5nZXMgeWV0KVxuICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpO1xuXG4gICAgICAgIC8vIFdhdGNoIHRoZSBzdWJtaXQgYnV0dG9uJ3MgY2xhc3MgY2hhbmdlcyB2aWEgTXV0YXRpb25PYnNlcnZlci5cbiAgICAgICAgLy8gRm9ybS5jaGVja1ZhbHVlcygpIHRvZ2dsZXMgJ2Rpc2FibGVkJyBvbiAjc3VibWl0YnV0dG9uIOKAlCBvYnNlcnZlciByZWFjdHMgdG8gdGhhdC5cbiAgICAgICAgY29uc3Qgc3VibWl0QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N1Ym1pdGJ1dHRvbicpO1xuICAgICAgICBpZiAoc3VibWl0QnV0dG9uKSB7XG4gICAgICAgICAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKCgpID0+IHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBvYnNlcnZlci5vYnNlcnZlKHN1Ym1pdEJ1dHRvbiwge2F0dHJpYnV0ZXM6IHRydWUsIGF0dHJpYnV0ZUZpbHRlcjogWydjbGFzcyddfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRlc3QgYnV0dG9uIHN0YXRlcyBiYXNlZCBvbiBmb3JtIGNoYW5nZXMuXG4gICAgICogVGVzdCBidXR0b25zIGFyZSBhY3RpdmUgb25seSB3aGVuIHNhdmUgYnV0dG9uIGlzIGRpc2FibGVkIChubyB1bnNhdmVkIGNoYW5nZXMpLlxuICAgICAqL1xuICAgIHVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKSB7XG4gICAgICAgIGNvbnN0ICR0ZXN0Q29ubmVjdGlvbkJ0biA9ICQoJyN0ZXN0LWNvbm5lY3Rpb24tYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRzZW5kVGVzdEVtYWlsQnRuID0gJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHN1Ym1pdEJ0biA9ICQoJyNzdWJtaXRidXR0b24nKTtcblxuICAgICAgICAvLyBTYXZlIGJ1dHRvbiBkaXNhYmxlZCA9IG5vIHVuc2F2ZWQgY2hhbmdlcyA9IHRlc3QgYnV0dG9ucyBzaG91bGQgYmUgZW5hYmxlZFxuICAgICAgICBjb25zdCBoYXNVbnNhdmVkQ2hhbmdlcyA9ICEkc3VibWl0QnRuLmhhc0NsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgIGlmIChoYXNVbnNhdmVkQ2hhbmdlcykge1xuICAgICAgICAgICAgLy8gRm9ybSBoYXMgdW5zYXZlZCBjaGFuZ2VzIC0gZGlzYWJsZSB0ZXN0IGJ1dHRvbnNcbiAgICAgICAgICAgICR0ZXN0Q29ubmVjdGlvbkJ0blxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLWludmVydGVkJywgJycpO1xuXG4gICAgICAgICAgICAkc2VuZFRlc3RFbWFpbEJ0blxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLWludmVydGVkJywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gY2hhbmdlcyAtIGVuYWJsZSB0ZXN0IGJ1dHRvbnNcbiAgICAgICAgICAgICR0ZXN0Q29ubmVjdGlvbkJ0blxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXRvb2x0aXAnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1pbnZlcnRlZCcpO1xuXG4gICAgICAgICAgICAkc2VuZFRlc3RFbWFpbEJ0blxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXRvb2x0aXAnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1pbnZlcnRlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYnV0dG9uc1xuICAgICAgICAkKCcudWkuYnV0dG9uW2RhdGEtdG9vbHRpcF0nKS5wb3B1cCgpO1xuICAgIH0sXG5cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZSgpO1xuXG4gICAgLy8gRW5zdXJlIGNsaWNrIHByZXZlbnRpb24gZm9yIHRvb2x0aXAgaWNvbnMgaW4gY2hlY2tib3hlc1xuICAgIC8vIFRoaXMgcHJldmVudHMgY2hlY2tib3ggdG9nZ2xlIHdoZW4gY2xpY2tpbmcgb24gdG9vbHRpcCBpY29uXG4gICAgJCgnLmZpZWxkLWluZm8taWNvbicpLm9mZignY2xpY2sudG9vbHRpcC1wcmV2ZW50Jykub24oJ2NsaWNrLnRvb2x0aXAtcHJldmVudCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG59KTsiXX0=