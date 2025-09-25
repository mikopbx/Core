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
            var booleanFields = ['MailSMTPCertCheck', 'MailEnableNotifications'];
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
            } // Update MailSMTPUsername placeholder with MailSMTPSenderAddress value


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
    // Handle notifications enable/disable checkbox
    $('#MailEnableNotifications').closest('.checkbox').checkbox({
      onChange: function onChange() {
        mailSettings.updateValidationRules();
        Form.dataChanged();
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
              details += " <span class=\"ui green label\"><i class=\"check icon\"></i>".concat(globalTranslate.ms_DiagnosticAuthorized, "</span>");
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
      to: recipient,
      subject: 'Test email from MikoPBX',
      body: '<h2>Test Email</h2><p>This is a test email from your MikoPBX system.</p>'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkIiwiJGNoZWNrQm94ZXMiLCIkbWVudUl0ZW1zIiwib2F1dGgyV2luZG93IiwiZGF0YUxvYWRlZCIsImdldFZhbGlkYXRlUnVsZXMiLCJydWxlcyIsImF1dGhUeXBlIiwidmFsIiwiTWFpbFNNVFBTZW5kZXJBZGRyZXNzIiwiaWRlbnRpZmllciIsIm9wdGlvbmFsIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQiLCJTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwiLCJtc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCIsIlN5c3RlbUVtYWlsRm9yTWlzc2VkIiwidmFsdWUiLCJtc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCIsIlZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCIsIm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkIiwiTWFpbFNNVFBIb3N0IiwibXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQiLCJNYWlsU01UUFBvcnQiLCJtc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCIsIk1haWxPQXV0aDJQcm92aWRlciIsIk1haWxPQXV0aDJDbGllbnRJZCIsIk1haWxPQXV0aDJDbGllbnRTZWNyZXQiLCJNYWlsU01UUFVzZXJuYW1lIiwibXNfVmFsaWRhdGVTTVRQVXNlcm5hbWVFbWFpbCIsIk1haWxTTVRQUGFzc3dvcmQiLCJkZXBlbmRzIiwibXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSIsInVwZGF0ZVZhbGlkYXRpb25SdWxlcyIsIm5ld1J1bGVzIiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmb3JtIiwiZmllbGRzIiwiaW5saW5lIiwib24iLCJpbml0aWFsaXplIiwiaGFuZGxlT0F1dGgyQ2FsbGJhY2siLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJjaGVja2JveCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ1cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24iLCJpbml0aWFsRW5jcnlwdGlvbiIsImNsZWFyYWJsZSIsImZvcmNlU2VsZWN0aW9uIiwidXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVPQXV0aDIiLCJpbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycyIsImluaXRpYWxpemVOb3RpZmljYXRpb25IYW5kbGVycyIsImluaXRpYWxpemVUZXN0QnV0dG9ucyIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwiLCJpbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIiLCJzdWJzY3JpYmVUb09BdXRoMkV2ZW50cyIsIm1vbml0b3JGb3JtQ2hhbmdlcyIsImxvYWREYXRhIiwiTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJidWlsZFRvb2x0aXBDb250ZW50IiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsImJ1aWxkQ29udGVudCIsImVtYWlsRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkSWQiLCIkZmllbGQiLCJsZW5ndGgiLCJpbnB1dG1hc2siLCJzaG93TWFza09uSG92ZXIiLCJwbGFjZWhvbGRlciIsIm9uQmVmb3JlUGFzdGUiLCJwYXN0ZWRWYWx1ZSIsIm9uY2xlYXJlZCIsIiRpbnB1dCIsImFkZENsYXNzIiwiTWFpbFNldHRpbmdzQVBJIiwiZ2V0U2V0dGluZ3MiLCJzZXR0aW5ncyIsIm9mZiIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJkYXRhIiwiYm9vbGVhbkZpZWxkcyIsImtleSIsInVuZGVmaW5lZCIsIk1haWxTTVRQQXV0aFR5cGUiLCJhZnRlclBvcHVsYXRlIiwiTWFpbFNNVFBVc2VUTFMiLCJlbmNyeXB0aW9uVmFsdWUiLCJNYWlsU01UUENlcnRDaGVjayIsImlzQ2hlY2tlZCIsImNsb3Nlc3QiLCJNYWlsRW5hYmxlTm90aWZpY2F0aW9ucyIsInVwZGF0ZVVzZXJuYW1lUGxhY2Vob2xkZXIiLCJ0b2dnbGVBdXRoRmllbGRzIiwicmVtb3ZlQ2xhc3MiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJyZUF0dGFjaEF1dGhUeXBlSGFuZGxlciIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0YXJ0T0F1dGgyRmxvdyIsImRpc2Nvbm5lY3RPQXV0aDIiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiaGFuZGxlT0F1dGgyTWVzc2FnZSIsImRhdGFDaGFuZ2VkIiwidGFyZ2V0IiwiY3VycmVudEF1dGhUeXBlIiwidG9nZ2xlQXV0aEZpZWxkc1dpdGhvdXRTdGF0dXMiLCIkdXNlcm5hbWVGaWVsZCIsIiRwYXNzd29yZEZpZWxkIiwiJG9hdXRoMlNlY3Rpb24iLCJzaG93IiwiaGlkZSIsInVwZGF0ZU9BdXRoMlN0YXR1cyIsImNoZWNrT0F1dGgyU3RhdHVzIiwiY3VycmVudFRhcmdldCIsImhhc0NsYXNzIiwiaGFzQ2hhbmdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd1dhcm5pbmciLCJtc19TYXZlQ2hhbmdlc0JlZm9yZVRlc3RpbmciLCJ0ZXN0Q29ubmVjdGlvbiIsInNlbmRUZXN0RW1haWwiLCJlbWFpbCIsInByb3ZpZGVyIiwiZGV0ZWN0UHJvdmlkZXIiLCJzaG93UHJvdmlkZXJIaW50IiwiYXV0b0ZpbGxTTVRQU2V0dGluZ3MiLCJzZW5kZXJBZGRyZXNzIiwidHJpbSIsImF0dHIiLCJyZW1vdmVBdHRyIiwiZ29vZ2xlIiwiaG9zdCIsInBvcnQiLCJ0bHMiLCJtaWNyb3NvZnQiLCJ5YW5kZXgiLCJwcm92aWRlclNldHRpbmdzIiwiJGVuY3J5cHRpb25Ecm9wZG93biIsImVuY3J5cHRpb24iLCJjZXJ0Q2hlY2siLCJlbmNyeXB0aW9uVHlwZSIsIiRwb3J0RmllbGQiLCJjdXJyZW50UG9ydCIsInN0YW5kYXJkUG9ydHMiLCJpbmNsdWRlcyIsIiRjZXJ0Q2hlY2tGaWVsZCIsIm1lc3NhZ2UiLCIkaGludCIsImFmdGVyIiwidGV4dCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImxvY2F0aW9uIiwic2VhcmNoIiwiaGFzIiwibG9hZFNldHRpbmdzRnJvbUFQSSIsInJlcGxhY2VTdGF0ZSIsImRvY3VtZW50IiwidGl0bGUiLCJwYXRobmFtZSIsImVycm9yIiwiZ2V0Iiwic2hvd0Vycm9yIiwibXNfT0F1dGgyQXV0aG9yaXphdGlvbkZhaWxlZCIsImRlY29kZVVSSUNvbXBvbmVudCIsIm1zX1ZhbGlkYXRlT0F1dGgyUHJvdmlkZXJFbXB0eSIsImNsaWVudElkIiwiY2xpZW50U2VjcmV0IiwibXNfVmFsaWRhdGVPQXV0aDJDbGllbnRJZEVtcHR5IiwibXNfVmFsaWRhdGVPQXV0aDJDbGllbnRTZWNyZXRFbXB0eSIsInNhdmVPQXV0aDJDcmVkZW50aWFscyIsInBhdGNoU2V0dGluZ3MiLCJyZXNwb25zZSIsInJlc3VsdCIsInByb2NlZWRXaXRoT0F1dGgyRmxvdyIsImNvbnNvbGUiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImpvaW4iLCJyZXF1ZXN0T0F1dGgyQXV0aFVybCIsImF1dGhvcml6ZU9BdXRoMiIsImF1dGhVcmwiLCJ3aWR0aCIsImhlaWdodCIsImxlZnQiLCJzY3JlZW4iLCJ0b3AiLCJhdXRoV2luZG93Iiwib3BlbiIsImdldE9BdXRoMlVybCIsImF1dGhfdXJsIiwiZXZlbnQiLCJvcmlnaW4iLCJjbG9zZSIsInBhcmFtcyIsInNob3dJbmZvcm1hdGlvbiIsIm9hdXRoMl9zdGF0dXMiLCJzdGF0dXMiLCIkc3RhdHVzRGl2IiwiJGNsaWVudElkRmllbGQiLCIkY2xpZW50U2VjcmV0RmllbGQiLCJjb25maWd1cmVkIiwicHJvdmlkZXJOYW1lIiwiZ2V0UHJvdmlkZXJOYW1lIiwiY29ubmVjdGVkVGV4dCIsIm1zX09BdXRoMkNvbm5lY3RlZFRvIiwicmVwbGFjZSIsImh0bWwiLCJhdXRob3JpemVkIiwibXNfT0F1dGgyTm90Q29uZmlndXJlZCIsImNsZWFyRGF0YSIsIk1haWxPQXV0aDJSZWZyZXNoVG9rZW4iLCJNYWlsT0F1dGgyQWNjZXNzVG9rZW4iLCJNYWlsT0F1dGgyVG9rZW5FeHBpcmVzIiwiJGJ1dHRvbiIsIiRyZXN1bHRBcmVhIiwicmVtb3ZlIiwiJHJlc3VsdCIsInBhcmVudCIsImFwcGVuZCIsInN1Y2Nlc3MiLCJkaWFnbm9zdGljcyIsImRpYWciLCJkZXRhaWxzIiwiYXV0aF90eXBlIiwic210cF9ob3N0Iiwic210cF9wb3J0Iiwic210cF9lbmNyeXB0aW9uIiwib2F1dGgyX3Byb3ZpZGVyIiwib2F1dGgyX3JlZnJlc2hfdG9rZW5fZXhpc3RzIiwibXNfRGlhZ25vc3RpY0F1dGhvcml6ZWQiLCJtYWluTWVzc2FnZSIsIm1zX0RpYWdub3N0aWNDb25uZWN0aW9uRmFpbGVkIiwiZXJyb3JfZGV0YWlscyIsInByb2JhYmxlX2NhdXNlIiwicmF3X2Vycm9yIiwicmF3RXJyb3IiLCJkZXRhaWxzSHRtbCIsIm1zX0RpYWdub3N0aWNUZWNobmljYWxEZXRhaWxzIiwiZmluZCIsImFjY29yZGlvbiIsInRvVXBwZXJDYXNlIiwiaGludHMiLCJyZWxldmFudEhpbnRzIiwic2xpY2UiLCJoaW50Iiwic29tZSIsImgiLCJzZXRUaW1lb3V0IiwiZmFkZU91dCIsInJlY2lwaWVudCIsInRvIiwic3ViamVjdCIsImJvZHkiLCJhY3R1YWxSZWNpcGllbnQiLCJzdWNjZXNzTWVzc2FnZSIsImVycm9yRGV0YWlscyIsIm1zX0RpYWdub3N0aWNQcm9iYWJsZUNhdXNlIiwiY2JCZWZvcmVTZW5kRm9ybSIsIm9yaWdpbmFsVmFsdWUiLCJmaWVsZFZhbHVlIiwidW5tYXNrZWRWYWx1ZSIsIndhcm4iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJzZW5kT25seUNoYW5nZWQiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInVybCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibXNfT0F1dGgyUHJvY2Vzc2luZ0ZhaWxlZCIsInVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMiLCJvcmlnaW5hbEFmdGVyU2VuZEZvcm0iLCIkdGVzdENvbm5lY3Rpb25CdG4iLCIkc2VuZFRlc3RFbWFpbEJ0biIsIiRzdWJtaXRCdG4iLCJwb3B1cCIsInJlYWR5Iiwic3RvcFByb3BhZ2F0aW9uIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxxQkFBRCxDQUxNOztBQU9qQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxXQUFXLEVBQUVELENBQUMsQ0FBQywrQkFBRCxDQVhHOztBQWFqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxVQUFVLEVBQUVGLENBQUMsQ0FBQywyQkFBRCxDQWpCSTs7QUFtQmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFlBQVksRUFBRSxJQXZCRzs7QUF5QmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxLQTdCSzs7QUErQmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQW5DaUIsOEJBbUNFO0FBQ2YsUUFBTUMsS0FBSyxHQUFHLEVBQWQ7QUFDQSxRQUFNQyxRQUFRLEdBQUdQLENBQUMsQ0FBQyx3Q0FBRCxDQUFELENBQTRDUSxHQUE1QyxFQUFqQixDQUZlLENBSWY7O0FBQ0FGLElBQUFBLEtBQUssQ0FBQ0cscUJBQU4sR0FBOEI7QUFDMUJDLE1BQUFBLFVBQVUsRUFBRSx1QkFEYztBQUUxQkMs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QUNpQixVQURqQixFQUVLc0MsVUFGTCxDQUVnQixjQUZoQixFQUdLQSxVQUhMLENBR2dCLGVBSGhCLEVBSUtBLFVBSkwsQ0FJZ0IsZUFKaEI7QUFNQXFKLE1BQUFBLGlCQUFpQixDQUNaM0wsV0FETCxDQUNpQixVQURqQixFQUVLc0MsVUFGTCxDQUVnQixjQUZoQixFQUdLQSxVQUhMLENBR2dCLGVBSGhCLEVBSUtBLFVBSkwsQ0FJZ0IsZUFKaEI7QUFLSCxLQXJDb0IsQ0F1Q3JCOzs7QUFDQWhKLElBQUFBLENBQUMsQ0FBQywwQkFBRCxDQUFELENBQThCdVMsS0FBOUI7QUFDSDtBQXY4Q2dCLENBQXJCLEMsQ0EyOENBOztBQUNBdlMsQ0FBQyxDQUFDNEssUUFBRCxDQUFELENBQVk0SCxLQUFaLENBQWtCLFlBQU07QUFDcEIxUyxFQUFBQSxZQUFZLENBQUM2QyxVQUFiLEdBRG9CLENBR3BCO0FBQ0E7O0FBQ0EzQyxFQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQnlGLEdBQXRCLENBQTBCLHVCQUExQixFQUFtRC9DLEVBQW5ELENBQXNELHVCQUF0RCxFQUErRSxVQUFTb0UsQ0FBVCxFQUFZO0FBQ3ZGQSxJQUFBQSxDQUFDLENBQUMyTCxlQUFGO0FBQ0EzTCxJQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxXQUFPLEtBQVA7QUFDSCxHQUpEO0FBS0gsQ0FWRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFVzZXJNZXNzYWdlLCBNYWlsU2V0dGluZ3NBUEksIENvbmZpZywgVG9vbHRpcEJ1aWxkZXIsIE1haWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBtYWlsIHNldHRpbmdzIHdpdGggT0F1dGgyIHN1cHBvcnRcbiAqXG4gKiBAbW9kdWxlIG1haWxTZXR0aW5nc1xuICovXG5jb25zdCBtYWlsU2V0dGluZ3MgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI21haWwtc2V0dGluZ3MtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNoZWNrYm94ZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tCb3hlczogJCgnI21haWwtc2V0dGluZ3MtZm9ybSAuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtZW51IGl0ZW1zLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1lbnVJdGVtczogJCgnI21haWwtc2V0dGluZ3MtbWVudSAuaXRlbScpLFxuXG4gICAgLyoqXG4gICAgICogT0F1dGgyIHdpbmRvdyByZWZlcmVuY2VcbiAgICAgKiBAdHlwZSB7V2luZG93fG51bGx9XG4gICAgICovXG4gICAgb2F1dGgyV2luZG93OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBpbml0aWFsIGRhdGEgaGFzIGJlZW4gbG9hZGVkIGZyb20gQVBJXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgZGF0YUxvYWRlZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIGZvcm0gc3RhdGVcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgY29uc3QgcnVsZXMgPSB7fTtcbiAgICAgICAgY29uc3QgYXV0aFR5cGUgPSAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXTpjaGVja2VkJykudmFsKCk7XG5cbiAgICAgICAgLy8gQmFzZSBlbWFpbCB2YWxpZGF0aW9uIHJ1bGVzIC0gYWx3YXlzIGFwcGx5IHdoZW4gZmllbGRzIGhhdmUgdmFsdWVzXG4gICAgICAgIHJ1bGVzLk1haWxTTVRQU2VuZGVyQWRkcmVzcyA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFNlbmRlckFkZHJlc3MnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTZW5kZXJBZGRyZXNzSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU3lzdGVtRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLlN5c3RlbUVtYWlsRm9yTWlzc2VkID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ14oPyEuKl9AX1xcXFwuXykuKiQnLCAgLy8gUmVqZWN0IF9AXy5fIHBhdHRlcm5cbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVNaXNzZWRFbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlTWlzc2VkRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLlZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnXig/IS4qX0BfXFxcXC5fKS4qJCcsICAvLyBSZWplY3QgX0BfLl8gcGF0dGVyblxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVZvaWNlbWFpbEVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVWb2ljZW1haWxFbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU01UUCBjb25maWd1cmF0aW9uIHJ1bGVzIC0gYWx3YXlzIGF2YWlsYWJsZSBidXQgb3B0aW9uYWxcbiAgICAgICAgcnVsZXMuTWFpbFNNVFBIb3N0ID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQSG9zdCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTkuLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNNVFBIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5NYWlsU01UUFBvcnQgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbFNNVFBQb3J0JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU01UUFBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEF1dGhlbnRpY2F0aW9uLXNwZWNpZmljIHJ1bGVzXG4gICAgICAgIGlmIChhdXRoVHlwZSA9PT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgIC8vIE9BdXRoMiBmaWVsZHMgLSBvcHRpb25hbFxuICAgICAgICAgICAgcnVsZXMuTWFpbE9BdXRoMlByb3ZpZGVyID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsT0F1dGgyUHJvdmlkZXInLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJ1bGVzLk1haWxPQXV0aDJDbGllbnRJZCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbE9BdXRoMkNsaWVudElkJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBydWxlcy5NYWlsT0F1dGgyQ2xpZW50U2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsT0F1dGgyQ2xpZW50U2VjcmV0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBVc2VybmFtZSBmb3IgT0F1dGgyIHNob3VsZCBiZSBlbWFpbCB3aGVuIGZpbGxlZFxuICAgICAgICAgICAgcnVsZXMuTWFpbFNNVFBVc2VybmFtZSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbFNNVFBVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU01UUFVzZXJuYW1lRW1haWwsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBQYXNzd29yZCBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gVXNlcm5hbWUgLSBvcHRpb25hbFxuICAgICAgICAgICAgcnVsZXMuTWFpbFNNVFBVc2VybmFtZSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbFNNVFBVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gUGFzc3dvcmQgLSByZXF1aXJlZCBpZiB1c2VybmFtZSBpcyBwcm92aWRlZFxuICAgICAgICAgICAgcnVsZXMuTWFpbFNNVFBQYXNzd29yZCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbFNNVFBQYXNzd29yZCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogJ01haWxTTVRQVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNNVFBQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJ1bGVzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyBhbmQgcmVpbml0aWFsaXplIGZvcm1cbiAgICAgKi9cbiAgICB1cGRhdGVWYWxpZGF0aW9uUnVsZXMoKSB7XG4gICAgICAgIC8vIEdldCBmcmVzaCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIGN1cnJlbnQgc3RhdGVcbiAgICAgICAgY29uc3QgbmV3UnVsZXMgPSBtYWlsU2V0dGluZ3MuZ2V0VmFsaWRhdGVSdWxlcygpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBGb3JtLnZhbGlkYXRlUnVsZXNcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbmV3UnVsZXM7XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvbiB3aXRoIG5ldyBydWxlc1xuICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgnZGVzdHJveScpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSh7XG4gICAgICAgICAgICBmaWVsZHM6IG5ld1J1bGVzLFxuICAgICAgICAgICAgaW5saW5lOiB0cnVlLFxuICAgICAgICAgICAgb246ICdibHVyJ1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbWFpbCBzZXR0aW5ncyBwYWdlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENoZWNrIGZvciBPQXV0aDIgY2FsbGJhY2sgcGFyYW1ldGVycyBpbiBVUkxcbiAgICAgICAgbWFpbFNldHRpbmdzLmhhbmRsZU9BdXRoMkNhbGxiYWNrKCk7XG5cbiAgICAgICAgbWFpbFNldHRpbmdzLiRtZW51SXRlbXMudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcbiAgICAgICAgbWFpbFNldHRpbmdzLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCBzcGVjaWZpYyBjb25maWd1cmF0aW9uc1xuICAgICAgICAvLyBEb24ndCBpbml0aWFsaXplIGFsbCBkcm9wZG93bnMgZ2VuZXJpY2FsbHkgdG8gYXZvaWQgZG91YmxlIGluaXRpYWxpemF0aW9uXG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbmNyeXB0aW9uIHR5cGUgZHJvcGRvd24gd2l0aCBwb3J0IGF1dG8tdXBkYXRlXG4gICAgICAgICQoJyNNYWlsU01UUFVzZVRMUy1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVBvcnRCYXNlZE9uRW5jcnlwdGlvbih2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENoZWNrIGluaXRpYWwgZW5jcnlwdGlvbiB0eXBlIHRvIHNob3cvaGlkZSBjZXJ0aWZpY2F0ZSBjaGVja1xuICAgICAgICBjb25zdCBpbml0aWFsRW5jcnlwdGlvbiA9ICQoJyNNYWlsU01UUFVzZVRMUycpLnZhbCgpIHx8ICdub25lJztcbiAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVBvcnRCYXNlZE9uRW5jcnlwdGlvbihpbml0aWFsRW5jcnlwdGlvbik7XG5cbiAgICAgICAgLy8gU3BlY2lhbCBpbml0aWFsaXphdGlvbiBmb3IgT0F1dGgyIHByb3ZpZGVyIGRyb3Bkb3duIChWNS4wIHBhdHRlcm4pXG4gICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXItZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBjbGVhcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBObyBvdGhlciBkcm9wZG93bnMgaW4gdGhlIGZvcm0gbmVlZCBpbml0aWFsaXphdGlvblxuICAgICAgICAvLyBNYWlsU01UUFVzZVRMUyBhbmQgTWFpbE9BdXRoMlByb3ZpZGVyIGFyZSB0aGUgb25seSBkcm9wZG93bnNcblxuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVPQXV0aDIoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVBdXRoVHlwZUhhbmRsZXJzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplTm90aWZpY2F0aW9uSGFuZGxlcnMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVUZXN0QnV0dG9ucygpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZUlucHV0TWFza3MoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVTZW5kZXJBZGRyZXNzSGFuZGxlcigpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBPQXV0aDIgZXZlbnRzXG4gICAgICAgIG1haWxTZXR0aW5ncy5zdWJzY3JpYmVUb09BdXRoMkV2ZW50cygpO1xuXG4gICAgICAgIC8vIE1vbml0b3IgZm9ybSBjaGFuZ2VzIHRvIGNvbnRyb2wgdGVzdCBidXR0b25zXG4gICAgICAgIG1haWxTZXR0aW5ncy5tb25pdG9yRm9ybUNoYW5nZXMoKTtcblxuICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSBBUEkgYWZ0ZXIgYWxsIFVJIGVsZW1lbnRzIGFyZSBpbml0aWFsaXplZFxuICAgICAgICBtYWlsU2V0dGluZ3MubG9hZERhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIFVzZSBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIGlmICh0eXBlb2YgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlci5pbml0aWFsaXplVG9vbHRpcHMobWFpbFNldHRpbmdzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBEZWxlZ2F0ZXMgdG8gVG9vbHRpcEJ1aWxkZXIgZm9yIGNvbnNpc3RlbnQgdG9vbHRpcCBmb3JtYXR0aW5nXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEgLSBDb25maWd1cmF0aW9uIG9iamVjdCBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQodG9vbHRpcERhdGEpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBpbnB1dCBtYXNrcyBmb3IgZW1haWwgZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlucHV0TWFza3MoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZW1haWwgaW5wdXQgbWFza3MgZm9yIGFsbCBlbWFpbCBmaWVsZHNcbiAgICAgICAgY29uc3QgZW1haWxGaWVsZHMgPSBbXG4gICAgICAgICAgICAnTWFpbFNNVFBTZW5kZXJBZGRyZXNzJyxcbiAgICAgICAgICAgICdTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnLFxuICAgICAgICAgICAgJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJyxcbiAgICAgICAgICAgICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnXG4gICAgICAgIF07XG5cbiAgICAgICAgZW1haWxGaWVsZHMuZm9yRWFjaChmaWVsZElkID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZmllbGQuaW5wdXRtYXNrKCdlbWFpbCcsIHtcbiAgICAgICAgICAgICAgICAgICAgc2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLCAvLyBObyBwbGFjZWhvbGRlciBjaGFyYWN0ZXJcbiAgICAgICAgICAgICAgICAgICAgb25CZWZvcmVQYXN0ZTogZnVuY3Rpb24ocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFuIHBsYWNlaG9sZGVyIHZhbHVlcyBvbiBwYXN0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhc3RlZFZhbHVlID09PSAnX0BfLl8nIHx8IHBhc3RlZFZhbHVlID09PSAnQCcgfHwgcGFzdGVkVmFsdWUgPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmNsZWFyZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGZpZWxkIHZhbHVlIHdoZW4gbWFzayBpcyBjbGVhcmVkXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRpbnB1dC52YWwoKSA9PT0gJ19AXy5fJyB8fCAkaW5wdXQudmFsKCkgPT09ICdAJyB8fCAkaW5wdXQudmFsKCkgPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGlucHV0LnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIENsZWFuIGluaXRpYWwgcGxhY2Vob2xkZXIgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKCRmaWVsZC52YWwoKSA9PT0gJ19AXy5fJyB8fCAkZmllbGQudmFsKCkgPT09ICdAJyB8fCAkZmllbGQudmFsKCkgPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC52YWwoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbWFpbCBzZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZERhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIG91ciBjaGFuZ2UgaGFuZGxlciB0byBwcmV2ZW50IGR1cGxpY2F0ZSBBUEkgY2FsbFxuICAgICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdJykub2ZmKCdjaGFuZ2UubWFpbHNldHRpbmdzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaCBsaWtlIEdlbmVyYWxTZXR0aW5nc1xuICAgICAgICAgICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoc2V0dGluZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSRVNUIEFQSSByZXR1cm5zIGJvb2xlYW5zIGZvciBjaGVja2JveCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgYm9vbGVhbiB2YWx1ZXMgdG8gc3RyaW5ncyBmb3IgU2VtYW50aWMgVUkgY2hlY2tib3hlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9vbGVhbkZpZWxkcyA9IFsnTWFpbFNNVFBDZXJ0Q2hlY2snLCAnTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvb2xlYW5GaWVsZHMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IGJvb2xlYW4gdG8gc3RyaW5nIFwiMVwiIG9yIFwiMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFba2V5XSA9IChkYXRhW2tleV0gPT09IHRydWUgfHwgZGF0YVtrZXldID09PSAxIHx8IGRhdGFba2V5XSA9PT0gJzEnKSA/ICcxJyA6ICcwJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIHJhZGlvIGJ1dHRvbiB2YWx1ZSBpcyBzZXQgKHdpbGwgYmUgaGFuZGxlZCBzaWxlbnRseSBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLk1haWxTTVRQQXV0aFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLk1haWxTTVRQQXV0aFR5cGUgPSAncGFzc3dvcmQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGVhbiB1cCBwbGFjZWhvbGRlciBlbWFpbCB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVtYWlsRmllbGRzID0gWydTeXN0ZW1FbWFpbEZvck1pc3NlZCcsICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVtYWlsRmllbGRzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtrZXldID09PSAnX0BfLl8nIHx8IGRhdGFba2V5XSA9PT0gJ0AnIHx8IGRhdGFba2V5XSA9PT0gJ19AXycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtrZXldID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBPQXV0aDIgcHJvdmlkZXIgZHJvcGRvd24gKFY1LjAgcGF0dGVybilcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxPQXV0aDJQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXItZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5NYWlsT0F1dGgyUHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXInKS52YWwoZGF0YS5NYWlsT0F1dGgyUHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBlbmNyeXB0aW9uIHR5cGUgZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxTTVRQVXNlVExTICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IG9sZCBib29sZWFuIHZhbHVlcyB0byBuZXcgZm9ybWF0IGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmNyeXB0aW9uVmFsdWUgPSBkYXRhLk1haWxTTVRQVXNlVExTO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmNyeXB0aW9uVmFsdWUgPT09IHRydWUgfHwgZW5jcnlwdGlvblZhbHVlID09PSAxIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuY3J5cHRpb25WYWx1ZSA9ICd0bHMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW5jcnlwdGlvblZhbHVlID09PSBmYWxzZSB8fCBlbmNyeXB0aW9uVmFsdWUgPT09IDAgfHwgZW5jcnlwdGlvblZhbHVlID09PSAnMCcgfHwgZW5jcnlwdGlvblZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmNyeXB0aW9uVmFsdWUgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgZHJvcGRvd24gdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZW5jcnlwdGlvblZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMnKS52YWwoZW5jcnlwdGlvblZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgY2hlY2tib3hlcyB1c2luZyBTZW1hbnRpYyBVSVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuTWFpbFNNVFBDZXJ0Q2hlY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IGRhdGEuTWFpbFNNVFBDZXJ0Q2hlY2sgPT09IHRydWUgfHwgZGF0YS5NYWlsU01UUENlcnRDaGVjayA9PT0gMSB8fCBkYXRhLk1haWxTTVRQQ2VydENoZWNrID09PSAnMSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBDZXJ0Q2hlY2snKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBDZXJ0Q2hlY2snKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IGRhdGEuTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgPT09IHRydWUgfHwgZGF0YS5NYWlsRW5hYmxlTm90aWZpY2F0aW9ucyA9PT0gMSB8fCBkYXRhLk1haWxFbmFibGVOb3RpZmljYXRpb25zID09PSAnMSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIE1haWxTTVRQVXNlcm5hbWUgcGxhY2Vob2xkZXIgd2l0aCBNYWlsU01UUFNlbmRlckFkZHJlc3MgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVVc2VybmFtZVBsYWNlaG9sZGVyKGRhdGEuTWFpbFNNVFBTZW5kZXJBZGRyZXNzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgT0F1dGgyIHN0YXR1cyBpZiBPQXV0aDIgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJhZGlvIGJ1dHRvbiBpcyBhbHJlYWR5IHNldCBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdXRoVHlwZSA9IGRhdGEuTWFpbFNNVFBBdXRoVHlwZSB8fCAncGFzc3dvcmQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHMoYXV0aFR5cGUsIGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBsb2FkZWQgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVWYWxpZGF0aW9uUnVsZXMoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyB0aGF0IGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuZGF0YUxvYWRlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmUtZW5hYmxlIG91ciBjaGFuZ2UgaGFuZGxlciBmb3IgZnV0dXJlIHVzZXIgaW50ZXJhY3Rpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MucmVBdHRhY2hBdXRoVHlwZUhhbmRsZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBPQXV0aDIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVPQXV0aDIoKSB7XG4gICAgICAgIC8vIE9BdXRoMiBjb25uZWN0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3Muc3RhcnRPQXV0aDJGbG93KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE9BdXRoMiBkaXNjb25uZWN0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNvYXV0aDItZGlzY29ubmVjdCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuZGlzY29ubmVjdE9BdXRoMigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMaXN0ZW4gZm9yIE9BdXRoMiBjYWxsYmFjayBtZXNzYWdlc1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG1haWxTZXR0aW5ncy5oYW5kbGVPQXV0aDJNZXNzYWdlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBub3RpZmljYXRpb24gZW5hYmxlL2Rpc2FibGUgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTm90aWZpY2F0aW9uSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBub3RpZmljYXRpb25zIGVuYWJsZS9kaXNhYmxlIGNoZWNrYm94XG4gICAgICAgICQoJyNNYWlsRW5hYmxlTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVZhbGlkYXRpb25SdWxlcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF0dGFjaCBhdXRoIHR5cGUgY2hhbmdlIGhhbmRsZXJcbiAgICAgKi9cbiAgICByZUF0dGFjaEF1dGhUeXBlSGFuZGxlcigpIHtcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cIk1haWxTTVRQQXV0aFR5cGVcIl0nKS5vbignY2hhbmdlLm1haWxzZXR0aW5ncycsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhdXRoVHlwZSA9ICQoZS50YXJnZXQpLnZhbCgpO1xuICAgICAgICAgICAgLy8gV2hlbiB1c2VyIG1hbnVhbGx5IGNoYW5nZXMgYXV0aCB0eXBlLCBjaGVjayBPQXV0aDIgc3RhdHVzIGlmIG5lZWRlZFxuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHMoYXV0aFR5cGUpO1xuICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgd2hlbiBhdXRoIHR5cGUgY2hhbmdlc1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVZhbGlkYXRpb25SdWxlcygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdXRoZW50aWNhdGlvbiB0eXBlIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUF1dGhUeXBlSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEF0dGFjaCBpbml0aWFsIGhhbmRsZXJcbiAgICAgICAgbWFpbFNldHRpbmdzLnJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvbiBwYWdlIGxvYWQgLSBkb24ndCBjaGVjayBPQXV0aDIgc3RhdHVzIHlldCAod2lsbCBiZSBkb25lIGluIGxvYWREYXRhKVxuICAgICAgICBjb25zdCBjdXJyZW50QXV0aFR5cGUgPSAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXTpjaGVja2VkJykudmFsKCkgfHwgJ3Bhc3N3b3JkJztcbiAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzKGN1cnJlbnRBdXRoVHlwZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBhdXRoZW50aWNhdGlvbiBmaWVsZHMgd2l0aG91dCBjaGVja2luZyBPQXV0aDIgc3RhdHVzIChmb3IgaW5pdGlhbCBzZXR1cClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYXV0aFR5cGUgLSBBdXRoZW50aWNhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdG9nZ2xlQXV0aEZpZWxkc1dpdGhvdXRTdGF0dXMoYXV0aFR5cGUpIHtcbiAgICAgICAgY29uc3QgJHVzZXJuYW1lRmllbGQgPSAkKCcjTWFpbFNNVFBVc2VybmFtZScpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICBjb25zdCAkcGFzc3dvcmRGaWVsZCA9ICQoJyNNYWlsU01UUFBhc3N3b3JkJykuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgIGNvbnN0ICRvYXV0aDJTZWN0aW9uID0gJCgnI29hdXRoMi1hdXRoLXNlY3Rpb24nKTtcblxuICAgICAgICBpZiAoYXV0aFR5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICAvLyBGb3IgT0F1dGgyOiBzaG93IHVzZXJuYW1lIChyZXF1aXJlZCBmb3IgZW1haWwgaWRlbnRpZmljYXRpb24pLCBoaWRlIHBhc3N3b3JkXG4gICAgICAgICAgICAkdXNlcm5hbWVGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAkcGFzc3dvcmRGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAkb2F1dGgyU2VjdGlvbi5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIHBhc3N3b3JkIGZpZWxkIGVycm9yc1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnTWFpbFNNVFBQYXNzd29yZCcpO1xuICAgICAgICAgICAgJHBhc3N3b3JkRmllbGQucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3IgcGFzc3dvcmQgYXV0aDogc2hvdyBib3RoIHVzZXJuYW1lIGFuZCBwYXNzd29yZFxuICAgICAgICAgICAgJHVzZXJuYW1lRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJHBhc3N3b3JkRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJG9hdXRoMlNlY3Rpb24uaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBPQXV0aDIgZmllbGQgZXJyb3JzXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdNYWlsT0F1dGgyUHJvdmlkZXInKTtcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ01haWxPQXV0aDJDbGllbnRJZCcpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpO1xuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYXV0aGVudGljYXRpb24gZmllbGRzIGJhc2VkIG9uIHR5cGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYXV0aFR5cGUgLSBBdXRoZW50aWNhdGlvbiB0eXBlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtzZXR0aW5nc10gLSBPcHRpb25hbCBzZXR0aW5ncyBkYXRhIHRvIGF2b2lkIGFkZGl0aW9uYWwgQVBJIGNhbGxcbiAgICAgKi9cbiAgICB0b2dnbGVBdXRoRmllbGRzKGF1dGhUeXBlLCBzZXR0aW5ncyA9IG51bGwpIHtcbiAgICAgICAgLy8gRmlyc3QgdG9nZ2xlIGZpZWxkcyB3aXRob3V0IHN0YXR1cyBjaGVja1xuICAgICAgICBtYWlsU2V0dGluZ3MudG9nZ2xlQXV0aEZpZWxkc1dpdGhvdXRTdGF0dXMoYXV0aFR5cGUpO1xuXG4gICAgICAgIC8vIFRoZW4gY2hlY2sgT0F1dGgyIHN0YXR1cyBvbmx5IGlmIG5lZWRlZFxuICAgICAgICBpZiAoYXV0aFR5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgZXhpc3Rpbmcgc2V0dGluZ3MgZGF0YSB0byBhdm9pZCBkdXBsaWNhdGUgQVBJIGNhbGxcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlT0F1dGgyU3RhdHVzKHNldHRpbmdzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gQVBJIGNhbGwgaWYgbm8gc2V0dGluZ3MgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuY2hlY2tPQXV0aDJTdGF0dXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRlc3QgYnV0dG9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUZXN0QnV0dG9ucygpIHtcbiAgICAgICAgLy8gVGVzdCBjb25uZWN0aW9uIGJ1dHRvblxuICAgICAgICAkKCcjdGVzdC1jb25uZWN0aW9uLWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBpcyBkaXNhYmxlZFxuICAgICAgICAgICAgaWYgKCQoZS5jdXJyZW50VGFyZ2V0KS5oYXNDbGFzcygnZGlzYWJsZWQnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRG91YmxlLWNoZWNrIGZvciB1bnNhdmVkIGNoYW5nZXNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5oYXNDaGFuZ2VzICYmIEZvcm0uaGFzQ2hhbmdlcygpKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TYXZlQ2hhbmdlc0JlZm9yZVRlc3RpbmdcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRlc3RDb25uZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNlbmQgdGVzdCBlbWFpbCBidXR0b25cbiAgICAgICAgJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gaXMgZGlzYWJsZWRcbiAgICAgICAgICAgIGlmICgkKGUuY3VycmVudFRhcmdldCkuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERvdWJsZS1jaGVjayBmb3IgdW5zYXZlZCBjaGFuZ2VzXG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uaGFzQ2hhbmdlcyAmJiBGb3JtLmhhc0NoYW5nZXMoKSkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dXYXJuaW5nKFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zZW5kVGVzdEVtYWlsKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgcHJvdmlkZXIgZnJvbSBlbWFpbCBhZGRyZXNzXG4gICAgICovXG4gICAgZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwoKSB7XG4gICAgICAgICQoJyNNYWlsU01UUFVzZXJuYW1lJykub24oJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBlbWFpbCA9ICQoZS50YXJnZXQpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFlbWFpbCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9IE1haWxTZXR0aW5nc0FQSS5kZXRlY3RQcm92aWRlcihlbWFpbCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwcm92aWRlciBmaWVsZCB1c2luZyBTZW1hbnRpYyBVSSBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlci1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBwcm92aWRlcik7XG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykudmFsKHByb3ZpZGVyKTtcblxuICAgICAgICAgICAgLy8gU2hvdyByZWNvbW1lbmRhdGlvbnMgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgICAgICAgIGlmIChwcm92aWRlciA9PT0gJ2dvb2dsZScpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Muc2hvd1Byb3ZpZGVySGludCgnR21haWwgZGV0ZWN0ZWQuIE9BdXRoMiBhdXRoZW50aWNhdGlvbiB3aWxsIGJlIHJlcXVpcmVkIGZyb20gTWFyY2ggMjAyNS4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgPT09ICdtaWNyb3NvZnQnKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnNob3dQcm92aWRlckhpbnQoJ01pY3Jvc29mdC9PdXRsb29rIGRldGVjdGVkLiBPQXV0aDIgYXV0aGVudGljYXRpb24gcmVjb21tZW5kZWQuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyID09PSAneWFuZGV4Jykge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zaG93UHJvdmlkZXJIaW50KCdZYW5kZXggTWFpbCBkZXRlY3RlZC4gQm90aCBwYXNzd29yZCBhbmQgT0F1dGgyIGF1dGhlbnRpY2F0aW9uIHN1cHBvcnRlZC4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXV0by1maWxsIFNNVFAgc2V0dGluZ3MgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5hdXRvRmlsbFNNVFBTZXR0aW5ncyhwcm92aWRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgTWFpbFNNVFBVc2VybmFtZSBwbGFjZWhvbGRlciB3aXRoIE1haWxTTVRQU2VuZGVyQWRkcmVzcyB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZW5kZXJBZGRyZXNzIC0gRW1haWwgYWRkcmVzcyBmcm9tIE1haWxTTVRQU2VuZGVyQWRkcmVzcyBmaWVsZFxuICAgICAqL1xuICAgIHVwZGF0ZVVzZXJuYW1lUGxhY2Vob2xkZXIoc2VuZGVyQWRkcmVzcykge1xuICAgICAgICBjb25zdCAkdXNlcm5hbWVGaWVsZCA9ICQoJyNNYWlsU01UUFVzZXJuYW1lJyk7XG4gICAgICAgIGlmIChzZW5kZXJBZGRyZXNzICYmIHNlbmRlckFkZHJlc3MudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgJHVzZXJuYW1lRmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBzZW5kZXJBZGRyZXNzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICR1c2VybmFtZUZpZWxkLnJlbW92ZUF0dHIoJ3BsYWNlaG9sZGVyJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBNYWlsU01UUFNlbmRlckFkZHJlc3MgY2hhbmdlIGhhbmRsZXIgdG8gdXBkYXRlIHVzZXJuYW1lIHBsYWNlaG9sZGVyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNlbmRlckFkZHJlc3NIYW5kbGVyKCkge1xuICAgICAgICAkKCcjTWFpbFNNVFBTZW5kZXJBZGRyZXNzJykub24oJ2lucHV0IGNoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZW5kZXJBZGRyZXNzID0gJChlLnRhcmdldCkudmFsKCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVXNlcm5hbWVQbGFjZWhvbGRlcihzZW5kZXJBZGRyZXNzKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF1dG8tZmlsbCBTTVRQIHNldHRpbmdzIGJhc2VkIG9uIHByb3ZpZGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyIC0gRW1haWwgcHJvdmlkZXJcbiAgICAgKi9cbiAgICBhdXRvRmlsbFNNVFBTZXR0aW5ncyhwcm92aWRlcikge1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGdvb2dsZToge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLmdtYWlsLmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgdGxzOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWljcm9zb2Z0OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAub2ZmaWNlMzY1LmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgdGxzOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeWFuZGV4OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAueWFuZGV4LmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzQ2NScsXG4gICAgICAgICAgICAgICAgdGxzOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChzZXR0aW5nc1twcm92aWRlcl0pIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyU2V0dGluZ3MgPSBzZXR0aW5nc1twcm92aWRlcl07XG5cbiAgICAgICAgICAgIC8vIE9ubHkgZmlsbCBpZiBmaWVsZHMgYXJlIGVtcHR5XG4gICAgICAgICAgICBpZiAoISQoJyNNYWlsU01UUEhvc3QnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUEhvc3QnKS52YWwocHJvdmlkZXJTZXR0aW5ncy5ob3N0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghJCgnI01haWxTTVRQUG9ydCcpLnZhbCgpKSB7XG4gICAgICAgICAgICAgICAgJCgnI01haWxTTVRQUG9ydCcpLnZhbChwcm92aWRlclNldHRpbmdzLnBvcnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZW5jcnlwdGlvbiBkcm9wZG93blxuICAgICAgICAgICAgY29uc3QgJGVuY3J5cHRpb25Ecm9wZG93biA9ICQoJyNNYWlsU01UUFVzZVRMUy1kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRlbmNyeXB0aW9uRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIFByb3ZpZGVyIHNldHRpbmdzIGZvciBlbmNyeXB0aW9uXG4gICAgICAgICAgICAgICAgbGV0IGVuY3J5cHRpb25WYWx1ZSA9ICdub25lJztcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXJTZXR0aW5ncy5wb3J0ID09PSAnNTg3Jykge1xuICAgICAgICAgICAgICAgICAgICBlbmNyeXB0aW9uVmFsdWUgPSAndGxzJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyU2V0dGluZ3MucG9ydCA9PT0gJzQ2NScpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ3NzbCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRlbmNyeXB0aW9uRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGVuY3J5cHRpb25WYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIFNNVFAgc2V0dGluZ3Mgd2hlbiBPQXV0aDIgcHJvdmlkZXIgaXMgc2VsZWN0ZWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXIgLSBTZWxlY3RlZCBPQXV0aDIgcHJvdmlkZXIgKGdvb2dsZSwgbWljcm9zb2Z0LCB5YW5kZXgpXG4gICAgICovXG4gICAgdXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIocHJvdmlkZXIpIHtcbiAgICAgICAgLy8gRG9uJ3QgYXV0by1maWxsIHVudGlsIGluaXRpYWwgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgaWYgKCFtYWlsU2V0dGluZ3MuZGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgT0F1dGgyIGF1dGggdHlwZSBpcyBzZWxlY3RlZFxuICAgICAgICBjb25zdCBhdXRoVHlwZSA9ICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdOmNoZWNrZWQnKS52YWwoKTtcbiAgICAgICAgaWYgKGF1dGhUeXBlICE9PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmaW5lIHByb3ZpZGVyIFNNVFAgc2V0dGluZ3NcbiAgICAgICAgY29uc3QgcHJvdmlkZXJTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGdvb2dsZToge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLmdtYWlsLmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgZW5jcnlwdGlvbjogJ3RscycsXG4gICAgICAgICAgICAgICAgY2VydENoZWNrOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWljcm9zb2Z0OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAtbWFpbC5vdXRsb29rLmNvbScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgZW5jcnlwdGlvbjogJ3RscycsXG4gICAgICAgICAgICAgICAgY2VydENoZWNrOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeWFuZGV4OiB7XG4gICAgICAgICAgICAgICAgaG9zdDogJ3NtdHAueWFuZGV4LnJ1JyxcbiAgICAgICAgICAgICAgICBwb3J0OiAnNTg3JyxcbiAgICAgICAgICAgICAgICBlbmNyeXB0aW9uOiAndGxzJyxcbiAgICAgICAgICAgICAgICBjZXJ0Q2hlY2s6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHByb3ZpZGVyU2V0dGluZ3NbcHJvdmlkZXJdO1xuICAgICAgICBpZiAoIXNldHRpbmdzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgaG9zdFxuICAgICAgICAkKCcjTWFpbFNNVFBIb3N0JykudmFsKHNldHRpbmdzLmhvc3QpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBwb3J0XG4gICAgICAgICQoJyNNYWlsU01UUFBvcnQnKS52YWwoc2V0dGluZ3MucG9ydCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGVuY3J5cHRpb24gdHlwZVxuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMnKS52YWwoc2V0dGluZ3MuZW5jcnlwdGlvbik7XG4gICAgICAgICQoJyNNYWlsU01UUFVzZVRMUy1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZXR0aW5ncy5lbmNyeXB0aW9uKTtcblxuICAgICAgICAvLyBVcGRhdGUgY2VydGlmaWNhdGUgY2hlY2tcbiAgICAgICAgaWYgKHNldHRpbmdzLmNlcnRDaGVjaykge1xuICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBvcnQgYmFzZWQgb24gc2VsZWN0ZWQgZW5jcnlwdGlvbiB0eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGVuY3J5cHRpb25UeXBlIC0gU2VsZWN0ZWQgZW5jcnlwdGlvbiB0eXBlIChub25lL3Rscy9zc2wpXG4gICAgICovXG4gICAgdXBkYXRlUG9ydEJhc2VkT25FbmNyeXB0aW9uKGVuY3J5cHRpb25UeXBlKSB7XG4gICAgICAgIGNvbnN0ICRwb3J0RmllbGQgPSAkKCcjTWFpbFNNVFBQb3J0Jyk7XG5cbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgdGhlIHVzZXIgaGFzbid0IG1hbnVhbGx5IGNoYW5nZWQgdGhlIHBvcnRcbiAgICAgICAgY29uc3QgY3VycmVudFBvcnQgPSAkcG9ydEZpZWxkLnZhbCgpO1xuICAgICAgICBjb25zdCBzdGFuZGFyZFBvcnRzID0gWycyNScsICc1ODcnLCAnNDY1JywgJyddO1xuXG4gICAgICAgIGlmIChzdGFuZGFyZFBvcnRzLmluY2x1ZGVzKGN1cnJlbnRQb3J0KSkge1xuICAgICAgICAgICAgc3dpdGNoIChlbmNyeXB0aW9uVHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgICAgICAkcG9ydEZpZWxkLnZhbCgnMjUnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndGxzJzpcbiAgICAgICAgICAgICAgICAgICAgJHBvcnRGaWVsZC52YWwoJzU4NycpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdzc2wnOlxuICAgICAgICAgICAgICAgICAgICAkcG9ydEZpZWxkLnZhbCgnNDY1Jyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIGNlcnRpZmljYXRlIGNoZWNrIGJhc2VkIG9uIGVuY3J5cHRpb24gdHlwZVxuICAgICAgICBjb25zdCAkY2VydENoZWNrRmllbGQgPSAkKCcjY2VydC1jaGVjay1maWVsZCcpO1xuICAgICAgICBpZiAoZW5jcnlwdGlvblR5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgLy8gSGlkZSBjZXJ0aWZpY2F0ZSBjaGVjayBmb3IgdW5lbmNyeXB0ZWQgY29ubmVjdGlvbnNcbiAgICAgICAgICAgICRjZXJ0Q2hlY2tGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAvLyBVbmNoZWNrIHRoZSBjZXJ0aWZpY2F0ZSBjaGVjayB3aGVuIGhpZGluZ1xuICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgY2VydGlmaWNhdGUgY2hlY2sgZm9yIFRMUy9TU0wgY29ubmVjdGlvbnNcbiAgICAgICAgICAgICRjZXJ0Q2hlY2tGaWVsZC5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBwcm92aWRlciBoaW50IG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIEhpbnQgbWVzc2FnZVxuICAgICAqL1xuICAgIHNob3dQcm92aWRlckhpbnQobWVzc2FnZSkge1xuICAgICAgICBjb25zdCAkaGludCA9ICQoJyNwcm92aWRlci1oaW50Jyk7XG4gICAgICAgIGlmICgkaGludC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICQoJyNNYWlsU01UUFVzZXJuYW1lJykuYWZ0ZXIoYDxkaXYgaWQ9XCJwcm92aWRlci1oaW50XCIgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2VcIj4ke21lc3NhZ2V9PC9kaXY+YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkaGludC50ZXh0KG1lc3NhZ2UpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgT0F1dGgyIGNhbGxiYWNrIHBhcmFtZXRlcnMgZnJvbSBVUkxcbiAgICAgKi9cbiAgICBoYW5kbGVPQXV0aDJDYWxsYmFjaygpIHtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcblxuICAgICAgICAvLyBDaGVjayBmb3Igc3VjY2Vzc1xuICAgICAgICBpZiAodXJsUGFyYW1zLmhhcygnb2F1dGhfc3VjY2VzcycpKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgc2V0dGluZ3MgdG8gc2hvdyB1cGRhdGVkIE9BdXRoMiBzdGF0dXNcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5sb2FkU2V0dGluZ3NGcm9tQVBJKCk7XG4gICAgICAgICAgICAvLyBDbGVhbiBVUkxcbiAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgZG9jdW1lbnQudGl0bGUsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBmb3IgZXJyb3JcbiAgICAgICAgaWYgKHVybFBhcmFtcy5oYXMoJ29hdXRoX2Vycm9yJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yID0gdXJsUGFyYW1zLmdldCgnb2F1dGhfZXJyb3InKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihcbiAgICAgICAgICAgICAgICAoZ2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMkF1dGhvcml6YXRpb25GYWlsZWQgfHwgJ9Ce0YjQuNCx0LrQsCBPQXV0aDIg0LDQstGC0L7RgNC40LfQsNGG0LjQuDogJykgKyBkZWNvZGVVUklDb21wb25lbnQoZXJyb3IpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgLy8gQ2xlYW4gVVJMXG4gICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIGRvY3VtZW50LnRpdGxlLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0IE9BdXRoMiBhdXRob3JpemF0aW9uIGZsb3dcbiAgICAgKi9cbiAgICBzdGFydE9BdXRoMkZsb3coKSB7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyID0gJCgnI01haWxPQXV0aDJQcm92aWRlcicpLnZhbCgpIHx8ICQoJyNNYWlsT0F1dGgyUHJvdmlkZXItZHJvcGRvd24nKS5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG5cbiAgICAgICAgaWYgKCFwcm92aWRlciB8fCBwcm92aWRlciA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVPQXV0aDJQcm92aWRlckVtcHR5IHx8ICfQktGL0LHQtdGA0LjRgtC1IE9BdXRoMiDQv9GA0L7QstCw0LnQtNC10YDQsCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgQ2xpZW50IElEIGFuZCBTZWNyZXQgYXJlIGNvbmZpZ3VyZWRcbiAgICAgICAgY29uc3QgY2xpZW50SWQgPSAkKCcjTWFpbE9BdXRoMkNsaWVudElkJykudmFsKCk7XG4gICAgICAgIGNvbnN0IGNsaWVudFNlY3JldCA9ICQoJyNNYWlsT0F1dGgyQ2xpZW50U2VjcmV0JykudmFsKCk7XG5cbiAgICAgICAgaWYgKCFjbGllbnRJZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU9BdXRoMkNsaWVudElkRW1wdHkgfHwgJ9CS0LLQtdC00LjRgtC1IENsaWVudCBJRCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjbGllbnRTZWNyZXQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVPQXV0aDJDbGllbnRTZWNyZXRFbXB0eSB8fCAn0JLQstC10LTQuNGC0LUgQ2xpZW50IFNlY3JldCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2F2ZSBPQXV0aDIgY3JlZGVudGlhbHMgYmVmb3JlIHN0YXJ0aW5nIHRoZSBmbG93XG4gICAgICAgIG1haWxTZXR0aW5ncy5zYXZlT0F1dGgyQ3JlZGVudGlhbHMocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQpO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzIGFuZCB0aGVuIHN0YXJ0IGF1dGhvcml6YXRpb24gZmxvd1xuICAgICAqL1xuICAgIHNhdmVPQXV0aDJDcmVkZW50aWFscyhwcm92aWRlciwgY2xpZW50SWQsIGNsaWVudFNlY3JldCkge1xuICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgTWFpbE9BdXRoMlByb3ZpZGVyOiBwcm92aWRlcixcbiAgICAgICAgICAgIE1haWxPQXV0aDJDbGllbnRJZDogY2xpZW50SWQsXG4gICAgICAgICAgICBNYWlsT0F1dGgyQ2xpZW50U2VjcmV0OiBjbGllbnRTZWNyZXRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBVc2UgTWFpbFNldHRpbmdzQVBJIGZvciBjb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5wYXRjaFNldHRpbmdzKGRhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWRlbnRpYWxzIHNhdmVkLCBub3cgZ2V0IE9BdXRoMiBVUkxcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MucHJvY2VlZFdpdGhPQXV0aDJGbG93KHByb3ZpZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW01haWxTZXR0aW5nc10gRmFpbGVkIHRvIHNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvclxuICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJylcbiAgICAgICAgICAgICAgICAgICAgOiAnRmFpbGVkIHRvIHNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgT0F1dGgyIGF1dGhvcml6YXRpb24gVVJMIGFuZCBvcGVuIGF1dGhvcml6YXRpb24gd2luZG93XG4gICAgICovXG4gICAgcmVxdWVzdE9BdXRoMkF1dGhVcmwocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQpIHtcbiAgICAgICAgLy8gUmVxdWVzdCBhdXRob3JpemF0aW9uIFVSTCBmcm9tIEFQSVxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuYXV0aG9yaXplT0F1dGgyKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0LCAoYXV0aFVybCkgPT4ge1xuXG4gICAgICAgICAgICBpZiAoYXV0aFVybCkge1xuICAgICAgICAgICAgICAgIC8vIE9wZW4gYXV0aG9yaXphdGlvbiB3aW5kb3dcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IDYwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWlnaHQgPSA3MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IChzY3JlZW4ud2lkdGggLyAyKSAtICh3aWR0aCAvIDIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvcCA9IChzY3JlZW4uaGVpZ2h0IC8gMikgLSAoaGVpZ2h0IC8gMik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhdXRoV2luZG93ID0gd2luZG93Lm9wZW4oXG4gICAgICAgICAgICAgICAgICAgIGF1dGhVcmwsXG4gICAgICAgICAgICAgICAgICAgICdvYXV0aDItYXV0aCcsXG4gICAgICAgICAgICAgICAgICAgIGB3aWR0aD0ke3dpZHRofSxoZWlnaHQ9JHtoZWlnaHR9LGxlZnQ9JHtsZWZ0fSx0b3A9JHt0b3B9YFxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWF1dGhXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdQbGVhc2UgYWxsb3cgcG9wdXBzIGZvciBPQXV0aDIgYXV0aG9yaXphdGlvbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJBdXRob3JpemF0aW9uRmFpbGVkIHx8ICfQntGI0LjQsdC60LAg0LDQstGC0L7RgNC40LfQsNGG0LjQuCBPQXV0aDInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByb2NlZWQgd2l0aCBPQXV0aDIgZmxvdyBhZnRlciBjcmVkZW50aWFscyBhcmUgc2F2ZWRcbiAgICAgKi9cbiAgICBwcm9jZWVkV2l0aE9BdXRoMkZsb3cocHJvdmlkZXIpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gR2V0IE9BdXRoMiBVUkwgd2l0aCBzYXZlZCBjcmVkZW50aWFsc1xuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuZ2V0T0F1dGgyVXJsKHByb3ZpZGVyLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5hdXRoX3VybCkge1xuXG4gICAgICAgICAgICAgICAgLy8gT3BlbiBPQXV0aDIgd2luZG93XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSA2MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gNzAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSAoc2NyZWVuLndpZHRoIC8gMikgLSAod2lkdGggLyAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSAoc2NyZWVuLmhlaWdodCAvIDIpIC0gKGhlaWdodCAvIDIpO1xuXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdyA9IHdpbmRvdy5vcGVuKFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5hdXRoX3VybCxcbiAgICAgICAgICAgICAgICAgICAgJ09BdXRoMkF1dGhvcml6YXRpb24nLFxuICAgICAgICAgICAgICAgICAgICBgd2lkdGg9JHt3aWR0aH0saGVpZ2h0PSR7aGVpZ2h0fSxsZWZ0PSR7bGVmdH0sdG9wPSR7dG9wfWBcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2luZG93IHdhcyBibG9ja2VkXG4gICAgICAgICAgICAgICAgaWYgKCFtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignUGxlYXNlIGFsbG93IHBvcHVwcyBmb3IgT0F1dGgyIGF1dGhvcml6YXRpb24nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNYWlsU2V0dGluZ3NdIE5vIGF1dGhfdXJsIGluIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ0ZhaWxlZCB0byBnZXQgT0F1dGgyIGF1dGhvcml6YXRpb24gVVJMJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgT0F1dGgyIGNhbGxiYWNrIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0ge01lc3NhZ2VFdmVudH0gZXZlbnQgLSBNZXNzYWdlIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlT0F1dGgyTWVzc2FnZShldmVudCkge1xuICAgICAgICAvLyBWYWxpZGF0ZSBvcmlnaW5cbiAgICAgICAgaWYgKGV2ZW50Lm9yaWdpbiAhPT0gd2luZG93LmxvY2F0aW9uLm9yaWdpbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIE9BdXRoMiBjYWxsYmFjayBkYXRhXG4gICAgICAgIGlmIChldmVudC5kYXRhICYmIGV2ZW50LmRhdGEudHlwZSA9PT0gJ29hdXRoMi1jYWxsYmFjaycpIHtcbiAgICAgICAgICAgIC8vIENsb3NlIE9BdXRoMiB3aW5kb3dcbiAgICAgICAgICAgIGlmIChtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93KSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQcm9jZXNzIGNhbGxiYWNrXG4gICAgICAgICAgICBNYWlsU2V0dGluZ3NBUEkuaGFuZGxlT0F1dGgyQ2FsbGJhY2soZXZlbnQuZGF0YS5wYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKCdPQXV0aDIgYXV0aG9yaXphdGlvbiBzdWNjZXNzZnVsJyk7XG4gICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5jaGVja09BdXRoMlN0YXR1cygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignT0F1dGgyIGF1dGhvcml6YXRpb24gZmFpbGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE9BdXRoMiBzdGF0dXMgZGlzcGxheSB1c2luZyBwcm92aWRlZCBzZXR0aW5ncyBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YSBjb250YWluaW5nIG9hdXRoMl9zdGF0dXNcbiAgICAgKi9cbiAgICB1cGRhdGVPQXV0aDJTdGF0dXMoc2V0dGluZ3MpIHtcbiAgICAgICAgaWYgKHNldHRpbmdzICYmIHNldHRpbmdzLm9hdXRoMl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IHNldHRpbmdzLm9hdXRoMl9zdGF0dXM7XG4gICAgICAgICAgICBjb25zdCAkc3RhdHVzRGl2ID0gJCgnI29hdXRoMi1zdGF0dXMnKTtcbiAgICAgICAgICAgIGNvbnN0ICRjbGllbnRJZEZpZWxkID0gJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgJGNsaWVudFNlY3JldEZpZWxkID0gJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS5jbG9zZXN0KCcuZmllbGQnKTtcblxuICAgICAgICAgICAgaWYgKHN0YXR1cy5jb25maWd1cmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJOYW1lID0gTWFpbFNldHRpbmdzQVBJLmdldFByb3ZpZGVyTmFtZShzdGF0dXMucHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RlZFRleHQgPSBnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyQ29ubmVjdGVkVG8ucmVwbGFjZSgne3Byb3ZpZGVyfScsIHByb3ZpZGVyTmFtZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBEb24ndCBhZGQgZXh0cmEgc3RhdHVzIHRleHQgLSBcIkNvbm5lY3RlZFwiIGFscmVhZHkgaW1wbGllcyBhdXRob3JpemVkXG4gICAgICAgICAgICAgICAgJHN0YXR1c0Rpdi5odG1sKGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2hlY2sgY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2Nvbm5lY3RlZFRleHR9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWRpc2Nvbm5lY3QnKS5zaG93KCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIENsaWVudCBJRCBhbmQgQ2xpZW50IFNlY3JldCBmaWVsZHMgd2hlbiBhdXRob3JpemVkXG4gICAgICAgICAgICAgICAgaWYgKHN0YXR1cy5hdXRob3JpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRJZEZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNsaWVudFNlY3JldEZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkY2xpZW50SWRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRTZWNyZXRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdHVzRGl2Lmh0bWwoYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJOb3RDb25maWd1cmVkfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJCgnI29hdXRoMi1kaXNjb25uZWN0JykuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBDbGllbnQgSUQgYW5kIENsaWVudCBTZWNyZXQgZmllbGRzIHdoZW4gbm90IGF1dGhvcml6ZWRcbiAgICAgICAgICAgICAgICAkY2xpZW50SWRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsaWVudFNlY3JldEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBPQXV0aDIgY29ubmVjdGlvbiBzdGF0dXMgKG1ha2VzIEFQSSBjYWxsKVxuICAgICAqL1xuICAgIGNoZWNrT0F1dGgyU3RhdHVzKCkge1xuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlT0F1dGgyU3RhdHVzKHNldHRpbmdzKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc2Nvbm5lY3QgT0F1dGgyXG4gICAgICovXG4gICAgZGlzY29ubmVjdE9BdXRoMigpIHtcbiAgICAgICAgLy8gQ2xlYXIgT0F1dGgyIHRva2VucyBpbW1lZGlhdGVseSB3aXRob3V0IGNvbmZpcm1hdGlvblxuICAgICAgICBjb25zdCBjbGVhckRhdGEgPSB7XG4gICAgICAgICAgICBNYWlsT0F1dGgyUmVmcmVzaFRva2VuOiAnJyxcbiAgICAgICAgICAgIE1haWxPQXV0aDJBY2Nlc3NUb2tlbjogJycsXG4gICAgICAgICAgICBNYWlsT0F1dGgyVG9rZW5FeHBpcmVzOiAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5wYXRjaFNldHRpbmdzKGNsZWFyRGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gSnVzdCB1cGRhdGUgdGhlIHN0YXR1cyB3aXRob3V0IHNob3dpbmcgYSBtZXNzYWdlXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgQ2xpZW50IElEIGFuZCBDbGllbnQgU2VjcmV0IGZpZWxkcyBhZ2FpblxuICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50SWQnKS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignRmFpbGVkIHRvIGRpc2Nvbm5lY3QgT0F1dGgyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUZXN0IFNNVFAgY29ubmVjdGlvblxuICAgICAqL1xuICAgIHRlc3RDb25uZWN0aW9uKCkge1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3Rlc3QtY29ubmVjdGlvbi1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHJlc3VsdEFyZWEgPSAkKCcjdGVzdC1jb25uZWN0aW9uLXJlc3VsdCcpO1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHJlc3VsdFxuICAgICAgICAkcmVzdWx0QXJlYS5yZW1vdmUoKTtcblxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLnRlc3RDb25uZWN0aW9uKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgcmVzdWx0IGFyZWEgbmV4dCB0byBidXR0b25cbiAgICAgICAgICAgIGxldCAkcmVzdWx0ID0gJCgnPGRpdiBpZD1cInRlc3QtY29ubmVjdGlvbi1yZXN1bHRcIiBjbGFzcz1cInVpIHNtYWxsIG1lc3NhZ2VcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRidXR0b24ucGFyZW50KCkuYXBwZW5kKCRyZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygncG9zaXRpdmUnKS5odG1sKCc8aSBjbGFzcz1cImNoZWNrIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgKHJlc3BvbnNlLm1lc3NhZ2VzPy5zdWNjZXNzPy5bMF0gfHwgJ0Nvbm5lY3Rpb24gc3VjY2Vzc2Z1bCcpKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZGlhZ25vc3RpY3MgaW5mbyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YT8uZGlhZ25vc3RpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlhZyA9IHJlc3BvbnNlLmRhdGEuZGlhZ25vc3RpY3M7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHNtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYEF1dGg6ICR7ZGlhZy5hdXRoX3R5cGV9LCBTZXJ2ZXI6ICR7ZGlhZy5zbXRwX2hvc3R9OiR7ZGlhZy5zbXRwX3BvcnR9LCBFbmNyeXB0aW9uOiAke2RpYWcuc210cF9lbmNyeXB0aW9ufWA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWFnLmF1dGhfdHlwZSA9PT0gJ29hdXRoMicgJiYgZGlhZy5vYXV0aDJfcHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYDxicj5PQXV0aDI6ICR7ZGlhZy5vYXV0aDJfcHJvdmlkZXJ9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvbid0IHNob3cgZXhwaXJlZCB0b2tlbiB3YXJuaW5nIGlmIGNvbm5lY3Rpb24gaXMgc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgaXQgbWVhbnMgcmVmcmVzaCB0b2tlbiBpcyB3b3JraW5nIGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcub2F1dGgyX3JlZnJlc2hfdG9rZW5fZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgIDxzcGFuIGNsYXNzPVwidWkgZ3JlZW4gbGFiZWxcIj48aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY0F1dGhvcml6ZWR9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSAnPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgc2ltcGxlLCB1c2VyLWZyaWVuZGx5IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBsZXQgbWFpbk1lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY0Nvbm5lY3Rpb25GYWlsZWQ7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgZGV0YWlsZWQgZXJyb3IgYW5hbHlzaXMgaWYgYXZhaWxhYmxlIGZvciBiZXR0ZXIgdXNlciBleHBlcmllbmNlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5lcnJvcl9kZXRhaWxzPy5wcm9iYWJsZV9jYXVzZSkge1xuICAgICAgICAgICAgICAgICAgICBtYWluTWVzc2FnZSA9IHJlc3BvbnNlLmRhdGEuZXJyb3JfZGV0YWlscy5wcm9iYWJsZV9jYXVzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkcmVzdWx0LmFkZENsYXNzKCduZWdhdGl2ZScpLmh0bWwoJzxpIGNsYXNzPVwidGltZXMgY2lyY2xlIGljb25cIj48L2k+ICcgKyBtYWluTWVzc2FnZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTa2lwIHNob3dpbmcgZXJyb3IgdHlwZSBsYWJlbCAtIGl0J3MgdG9vIHRlY2huaWNhbCBmb3IgbW9zdCB1c2Vyc1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyByYXcgUEhQTWFpbGVyIGVycm9yIGluIGEgY29sbGFwc2libGUgc2VjdGlvbiBvbmx5IGlmIGl0J3Mgc2lnbmlmaWNhbnRseSBkaWZmZXJlbnRcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmVycm9yX2RldGFpbHM/LnJhd19lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByYXdFcnJvciA9IHJlc3BvbnNlLmRhdGEuZXJyb3JfZGV0YWlscy5yYXdfZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgc2hvdyB0ZWNobmljYWwgZGV0YWlscyBpZiB0aGV5IGNvbnRhaW4gbW9yZSBpbmZvIHRoYW4gdGhlIHVzZXIgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmF3RXJyb3IubGVuZ3RoID4gbWFpbk1lc3NhZ2UubGVuZ3RoICsgNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzSHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBhY2NvcmRpb25cIiBzdHlsZT1cIm1hcmdpbi10b3A6IDEwcHg7XCI+JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8ZGl2IGNsYXNzPVwidGl0bGVcIj48aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY1RlY2huaWNhbERldGFpbHN9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8ZGl2IGNsYXNzPVwiY29udGVudFwiPjxjb2RlIHN0eWxlPVwiZm9udC1zaXplOiAxMXB4OyB3b3JkLWJyZWFrOiBicmVhay1hbGw7IGRpc3BsYXk6IGJsb2NrOyB3aGl0ZS1zcGFjZTogcHJlLXdyYXA7XCI+JHtyYXdFcnJvcn08L2NvZGU+PC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlsc0h0bWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGFjY29yZGlvbiBmb3IgdGVjaG5pY2FsIGRldGFpbHNcbiAgICAgICAgICAgICAgICAgICAgICAgICRyZXN1bHQuZmluZCgnLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBtaW5pbWFsIGRpYWdub3N0aWNzIGluZm8gZm9yIGZhaWxlZCBjb25uZWN0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uZGlhZ25vc3RpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlhZyA9IHJlc3BvbnNlLmRhdGEuZGlhZ25vc3RpY3M7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHNtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCR7ZGlhZy5hdXRoX3R5cGUudG9VcHBlckNhc2UoKX06ICR7ZGlhZy5zbXRwX2hvc3R9OiR7ZGlhZy5zbXRwX3BvcnR9YDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcuc210cF9lbmNyeXB0aW9uICYmIGRpYWcuc210cF9lbmNyeXB0aW9uICE9PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCAoJHtkaWFnLnNtdHBfZW5jcnlwdGlvbi50b1VwcGVyQ2FzZSgpfSlgO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gJzwvc21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlscyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBoaW50cyBpZiBhdmFpbGFibGUgLSBsaW1pdCB0byB0b3AgMyBtb3N0IHJlbGV2YW50IG9uZXNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmhpbnRzICYmIHJlc3BvbnNlLmRhdGEuaGludHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgaGludHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c3Ryb25nPtCg0LXQutC+0LzQtdC90LTQsNGG0LjQuDo8L3N0cm9uZz48dWw+JztcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBtYXggMyBoaW50cyB0byBhdm9pZCBvdmVyd2hlbG1pbmcgdGhlIHVzZXJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsZXZhbnRIaW50cyA9IHJlc3BvbnNlLmRhdGEuaGludHMuc2xpY2UoMCwgMyk7XG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW50SGludHMuZm9yRWFjaChoaW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgRW5nbGlzaCBoaW50cyBpZiB3ZSBoYXZlIFJ1c3NpYW4gb25lc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhpbnQuaW5jbHVkZXMoJ09BdXRoMiBhY2Nlc3MgdG9rZW4gZXhwaXJlZCcpICYmIHJlbGV2YW50SGludHMuc29tZShoID0+IGguaW5jbHVkZXMoJ9GC0L7QutC10L0nKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBoaW50cyArPSBgPGxpPiR7aGludH08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBoaW50cyArPSAnPC91bD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChoaW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMzAgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5mYWRlT3V0KDQwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAzMDAwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIHRlc3QgZW1haWxcbiAgICAgKi9cbiAgICBzZW5kVGVzdEVtYWlsKCkge1xuICAgICAgICBjb25zdCByZWNpcGllbnQgPSAkKCcjU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJykudmFsKCk7XG5cbiAgICAgICAgaWYgKCFyZWNpcGllbnQpIHtcbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbmV4dCB0byBidXR0b25cbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjc2VuZC10ZXN0LWVtYWlsLWJ1dHRvbicpO1xuICAgICAgICAgICAgbGV0ICRyZXN1bHQgPSAkKCc8ZGl2IGlkPVwic2VuZC10ZXN0LXJlc3VsdFwiIGNsYXNzPVwidWkgc21hbGwgbmVnYXRpdmUgbWVzc2FnZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgJHJlc3VsdC5odG1sKCc8aSBjbGFzcz1cInRpbWVzIGNpcmNsZSBpY29uXCI+PC9pPiBQbGVhc2UgZW50ZXIgYSByZWNpcGllbnQgZW1haWwgYWRkcmVzcycpO1xuICAgICAgICAgICAgJCgnI3NlbmQtdGVzdC1yZXN1bHQnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICRidXR0b24ucGFyZW50KCkuYXBwZW5kKCRyZXN1bHQpO1xuXG4gICAgICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMTAgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5mYWRlT3V0KDQwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAxMDAwMCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHJlc3VsdEFyZWEgPSAkKCcjc2VuZC10ZXN0LXJlc3VsdCcpO1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHJlc3VsdFxuICAgICAgICAkcmVzdWx0QXJlYS5yZW1vdmUoKTtcblxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgIHRvOiByZWNpcGllbnQsXG4gICAgICAgICAgICBzdWJqZWN0OiAnVGVzdCBlbWFpbCBmcm9tIE1pa29QQlgnLFxuICAgICAgICAgICAgYm9keTogJzxoMj5UZXN0IEVtYWlsPC9oMj48cD5UaGlzIGlzIGEgdGVzdCBlbWFpbCBmcm9tIHlvdXIgTWlrb1BCWCBzeXN0ZW0uPC9wPidcbiAgICAgICAgfTtcblxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuc2VuZFRlc3RFbWFpbChkYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHJlc3VsdCBhcmVhIG5leHQgdG8gYnV0dG9uXG4gICAgICAgICAgICBsZXQgJHJlc3VsdCA9ICQoJzxkaXYgaWQ9XCJzZW5kLXRlc3QtcmVzdWx0XCIgY2xhc3M9XCJ1aSBzbWFsbCBtZXNzYWdlXCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAkYnV0dG9uLnBhcmVudCgpLmFwcGVuZCgkcmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgYWN0dWFsIHJlY2lwaWVudCBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0dWFsUmVjaXBpZW50ID0gcmVzcG9uc2UuZGF0YT8udG8gfHwgcmVjaXBpZW50O1xuXG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBtZXNzYWdlIGZyb20gQVBJIHdoaWNoIGFscmVhZHkgaW5jbHVkZXMgdGhlIGVtYWlsIGFkZHJlc3NcbiAgICAgICAgICAgICAgICBsZXQgc3VjY2Vzc01lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcz8uc3VjY2Vzcz8uWzBdIHx8ICdUZXN0IGVtYWlsIHNlbnQnO1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgbWVzc2FnZSBkb2Vzbid0IGluY2x1ZGUgZW1haWwgYnV0IHdlIGhhdmUgaXQsIGFkZCBpdFxuICAgICAgICAgICAgICAgIGlmICghc3VjY2Vzc01lc3NhZ2UuaW5jbHVkZXMoJ0AnKSAmJiBhY3R1YWxSZWNpcGllbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc01lc3NhZ2UgPSBzdWNjZXNzTWVzc2FnZS5yZXBsYWNlKCfQn9C40YHRjNC80L4g0L7RgtC/0YDQsNCy0LvQtdC90L4nLCBg0J/QuNGB0YzQvNC+INC+0YLQv9GA0LDQstC70LXQvdC+IOKGkiAke2FjdHVhbFJlY2lwaWVudH1gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkcmVzdWx0LmFkZENsYXNzKCdwb3NpdGl2ZScpLmh0bWwoXG4gICAgICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cImNoZWNrIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgc3VjY2Vzc01lc3NhZ2VcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBkaWFnbm9zdGljcyBpbmZvIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhPy5kaWFnbm9zdGljcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaWFnID0gcmVzcG9uc2UuZGF0YS5kaWFnbm9zdGljcztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcuYXV0aF90eXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSBkaWFnLm9hdXRoMl9wcm92aWRlciB8fCAnT0F1dGgyJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYFVzaW5nOiBPQXV0aDJgO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyICYmIHByb3ZpZGVyICE9PSAnT0F1dGgyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCAoJHtwcm92aWRlcn0pYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYFVzaW5nOiBQYXNzd29yZCBhdXRoZW50aWNhdGlvbmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgLCBTZXJ2ZXI6ICR7ZGlhZy5zbXRwX2hvc3R9OiR7ZGlhZy5zbXRwX3BvcnR9YDtcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSAnPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSByZXNwb25zZT8ubWVzc2FnZXM/LmVycm9yPy5qb2luKCcsICcpIHx8IGdsb2JhbFRyYW5zbGF0ZS5tc19EaWFnbm9zdGljQ29ubmVjdGlvbkZhaWxlZDtcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmFkZENsYXNzKCduZWdhdGl2ZScpLmh0bWwoJzxpIGNsYXNzPVwidGltZXMgY2lyY2xlIGljb25cIj48L2k+ICcgKyBtZXNzYWdlKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZGV0YWlsZWQgZXJyb3IgYW5hbHlzaXMgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5lcnJvcl9kZXRhaWxzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yRGV0YWlscyA9IHJlc3BvbnNlLmRhdGEuZXJyb3JfZGV0YWlscztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbHNIdG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcblxuICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIHNob3dpbmcgZXJyb3IgdHlwZSBsYWJlbCAtIGl0J3MgdG9vIHRlY2huaWNhbCBmb3IgbW9zdCB1c2Vyc1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvckRldGFpbHMucHJvYmFibGVfY2F1c2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLm1zX0RpYWdub3N0aWNQcm9iYWJsZUNhdXNlfTwvc3Ryb25nPiAke2Vycm9yRGV0YWlscy5wcm9iYWJsZV9jYXVzZX08YnI+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgcmF3IFBIUE1haWxlciBlcnJvciBpbiBhIGNvbGxhcHNpYmxlIHNlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yRGV0YWlscy5yYXdfZXJyb3IgJiYgZXJyb3JEZXRhaWxzLnJhd19lcnJvciAhPT0gbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGFjY29yZGlvblwiIHN0eWxlPVwibWFyZ2luLXRvcDogMTBweDtcIj4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gYDxkaXYgY2xhc3M9XCJ0aXRsZVwiPjxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5tc19EaWFnbm9zdGljVGVjaG5pY2FsRGV0YWlsc308L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gYDxkaXYgY2xhc3M9XCJjb250ZW50XCI+PGNvZGUgc3R5bGU9XCJmb250LXNpemU6IDExcHg7IHdvcmQtYnJlYWs6IGJyZWFrLWFsbDtcIj4ke2Vycm9yRGV0YWlscy5yYXdfZXJyb3J9PC9jb2RlPjwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGRldGFpbHNIdG1sKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGFjY29yZGlvbiBmb3IgdGVjaG5pY2FsIGRldGFpbHNcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5maW5kKCcuYWNjb3JkaW9uJykuYWNjb3JkaW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBoaW50cyBpZiBhdmFpbGFibGUgLSBsaW1pdCB0byB0b3AgMyBtb3N0IHJlbGV2YW50IG9uZXNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmhpbnRzICYmIHJlc3BvbnNlLmRhdGEuaGludHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgaGludHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c3Ryb25nPtCg0LXQutC+0LzQtdC90LTQsNGG0LjQuDo8L3N0cm9uZz48dWw+JztcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBtYXggMyBoaW50cyB0byBhdm9pZCBvdmVyd2hlbG1pbmcgdGhlIHVzZXJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsZXZhbnRIaW50cyA9IHJlc3BvbnNlLmRhdGEuaGludHMuc2xpY2UoMCwgMyk7XG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW50SGludHMuZm9yRWFjaChoaW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgRW5nbGlzaCBoaW50cyBpZiB3ZSBoYXZlIFJ1c3NpYW4gb25lc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhpbnQuaW5jbHVkZXMoJ09BdXRoMiBhY2Nlc3MgdG9rZW4gZXhwaXJlZCcpICYmIHJlbGV2YW50SGludHMuc29tZShoID0+IGguaW5jbHVkZXMoJ9GC0L7QutC10L0nKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBoaW50cyArPSBgPGxpPiR7aGludH08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBoaW50cyArPSAnPC91bD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChoaW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMzAgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5mYWRlT3V0KDQwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAzMDAwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gR2V0IHVubWFza2VkIHZhbHVlcyBmb3IgZW1haWwgZmllbGRzIEZJUlNUXG4gICAgICAgIGNvbnN0IGVtYWlsRmllbGRzID0gW1xuICAgICAgICAgICAgJ01haWxTTVRQU2VuZGVyQWRkcmVzcycsXG4gICAgICAgICAgICAnU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ1xuICAgICAgICBdO1xuXG4gICAgICAgIGVtYWlsRmllbGRzLmZvckVhY2goZmllbGRJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IG9yaWdpbmFsVmFsdWUgPSAkZmllbGQudmFsKCkgfHwgJyc7XG4gICAgICAgICAgICAgICAgbGV0IGZpZWxkVmFsdWUgPSBvcmlnaW5hbFZhbHVlO1xuXG4gICAgICAgICAgICAgICAgLy8gRm9yIGVtYWlsIGlucHV0bWFzaywgdHJ5IGRpZmZlcmVudCBhcHByb2FjaGVzIHRvIGdldCBjbGVhbiB2YWx1ZVxuICAgICAgICAgICAgICAgIGlmIChmaWVsZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHZhbHVlIGNvbnRhaW5zIHBsYWNlaG9sZGVyIHBhdHRlcm5zXG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWVsZFZhbHVlLmluY2x1ZGVzKCdfQF8nKSB8fCBmaWVsZFZhbHVlID09PSAnQC4nIHx8IGZpZWxkVmFsdWUgPT09ICdAJyB8fCBmaWVsZFZhbHVlID09PSAnXycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgdW5tYXNrZWQgdmFsdWUgZm9yIGVtYWlsIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBpbnB1dG1hc2sgcGx1Z2luIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaW5wdXRtYXNrICYmIHR5cGVvZiAkZmllbGQuaW5wdXRtYXNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVubWFza2VkVmFsdWUgPSAkZmllbGQuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1bm1hc2tlZFZhbHVlICYmIHVubWFza2VkVmFsdWUgIT09IGZpZWxkVmFsdWUgJiYgIXVubWFza2VkVmFsdWUuaW5jbHVkZXMoJ18nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmllbGRWYWx1ZSA9IHVubWFza2VkVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbTWFpbFNldHRpbmdzXSBGYWlsZWQgdG8gZ2V0IHVubWFza2VkIHZhbHVlIGZvciAke2ZpZWxkSWR9OmAsIGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkSWRdID0gZmllbGRWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIE5vIHN1Y2Nlc3MgbWVzc2FnZSBuZWVkZWQgLSBmb3JtIHNhdmVzIHNpbGVudGx5XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gZm9yIHNhdmluZyBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbWFpbFNldHRpbmdzLiRmb3JtT2JqO1xuXG4gICAgICAgIC8vIEVuYWJsZSBSRVNUIEFQSSBtb2RlIChtb2Rlcm4gYXBwcm9hY2ggbGlrZSBHZW5lcmFsU2V0dGluZ3MpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gTWFpbFNldHRpbmdzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAncGF0Y2hTZXR0aW5ncyc7XG5cbiAgICAgICAgLy8gRW5hYmxlIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvbiBmb3IgY2xlYW5lciBBUEkgcmVxdWVzdHNcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG5cbiAgICAgICAgLy8gRW5hYmxlIHNlbmRpbmcgb25seSBjaGFuZ2VkIGZpZWxkcyBmb3Igb3B0aW1hbCBQQVRDSCBzZW1hbnRpY3NcbiAgICAgICAgRm9ybS5zZW5kT25seUNoYW5nZWQgPSB0cnVlO1xuXG4gICAgICAgIC8vIE5vIHJlZGlyZWN0IGFmdGVyIHNhdmUgLSBzdGF5IG9uIHRoZSBzYW1lIHBhZ2VcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IG51bGw7XG5cbiAgICAgICAgLy8gVXNlICcjJyBmb3IgVVJMIHdoZW4gdXNpbmcgYXBpU2V0dGluZ3NcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7XG5cbiAgICAgICAgLy8gVXNlIGR5bmFtaWMgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBjdXJyZW50IHN0YXRlXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG1haWxTZXR0aW5ncy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG1haWxTZXR0aW5ncy5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG1haWxTZXR0aW5ncy5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgT0F1dGgyIGV2ZW50c1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvT0F1dGgyRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gU3Vic2NyaWJlIHRvIE9BdXRoMiBhdXRob3JpemF0aW9uIGV2ZW50c1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdvYXV0aDItYXV0aG9yaXphdGlvbicsIChkYXRhKSA9PiB7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdGF0dXMgPT09ICdzdWNjZXNzJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdWNjZXNzOiByZWZyZXNoIE9BdXRoMiBzdGF0dXMgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5jaGVja09BdXRoMlN0YXR1cygpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEuc3RhdHVzID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEVycm9yOiBzaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5tZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJQcm9jZXNzaW5nRmFpbGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgNDAwMFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1vbml0b3IgZm9ybSBjaGFuZ2VzIHRvIGNvbnRyb2wgdGVzdCBidXR0b24gc3RhdGVzXG4gICAgICovXG4gICAgbW9uaXRvckZvcm1DaGFuZ2VzKCkge1xuICAgICAgICAvLyBJbml0aWFsbHkgYnV0dG9ucyBzaG91bGQgYmUgZW5hYmxlZCAobm8gY2hhbmdlcyB5ZXQpXG4gICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVUZXN0QnV0dG9uU3RhdGVzKCk7XG5cbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIGZvcm0gY2hhbmdlIGV2ZW50cyAtIGNoZWNrIHJlYWwgZm9ybSBzdGF0ZVxuICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmoub24oJ2NoYW5nZS50ZXN0YnV0dG9ucycsICdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScsICgpID0+IHtcbiAgICAgICAgICAgIC8vIFVzZSBGb3JtJ3MgYnVpbHQtaW4gY2hhbmdlIGRldGVjdGlvblxuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWxzbyBtb25pdG9yIEZvcm0ncyBkYXRhQ2hhbmdlZCBldmVudHNcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLm9uKCdmb3JtLmRhdGFDaGFuZ2VkJywgKCkgPT4ge1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVzZXQgc3RhdGUgYWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlXG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQWZ0ZXJTZW5kRm9ybSA9IG1haWxTZXR0aW5ncy5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIG1haWxTZXR0aW5ncy5jYkFmdGVyU2VuZEZvcm0gPSAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIG9yaWdpbmFsQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIC8vIEFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZSwgYnV0dG9ucyBzaG91bGQgYmUgZW5hYmxlZFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0ZXN0IGJ1dHRvbiBzdGF0ZXMgYmFzZWQgb24gZm9ybSBjaGFuZ2VzXG4gICAgICovXG4gICAgdXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpIHtcbiAgICAgICAgY29uc3QgJHRlc3RDb25uZWN0aW9uQnRuID0gJCgnI3Rlc3QtY29ubmVjdGlvbi1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHNlbmRUZXN0RW1haWxCdG4gPSAkKCcjc2VuZC10ZXN0LWVtYWlsLWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkc3VibWl0QnRuID0gJCgnI3N1Ym1pdGJ1dHRvbicpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGZvcm0gaGFzIHVuc2F2ZWQgY2hhbmdlcyB1c2luZyBGb3JtJ3MgYnVpbHQtaW4gbWV0aG9kXG4gICAgICAgIGNvbnN0IGhhc0NoYW5nZXMgPSB0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5oYXNDaGFuZ2VzICYmIEZvcm0uaGFzQ2hhbmdlcygpO1xuXG4gICAgICAgIGlmIChoYXNDaGFuZ2VzKSB7XG4gICAgICAgICAgICAvLyBGb3JtIGhhcyBjaGFuZ2VzIC0gZGlzYWJsZSB0ZXN0IGJ1dHRvbnMgd2l0aCB2aXN1YWwgZmVlZGJhY2tcbiAgICAgICAgICAgICR0ZXN0Q29ubmVjdGlvbkJ0blxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLWludmVydGVkJywgJycpO1xuXG4gICAgICAgICAgICAkc2VuZFRlc3RFbWFpbEJ0blxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLWludmVydGVkJywgJycpO1xuXG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgc2F2ZSBidXR0b24gaXMgdmlzaWJsZS9lbmFibGVkIHdoZW4gdGhlcmUgYXJlIGNoYW5nZXNcbiAgICAgICAgICAgICRzdWJtaXRCdG4ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJykuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gY2hhbmdlcyAtIGVuYWJsZSB0ZXN0IGJ1dHRvbnNcbiAgICAgICAgICAgICR0ZXN0Q29ubmVjdGlvbkJ0blxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXRvb2x0aXAnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1pbnZlcnRlZCcpO1xuXG4gICAgICAgICAgICAkc2VuZFRlc3RFbWFpbEJ0blxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXRvb2x0aXAnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1pbnZlcnRlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYnV0dG9uc1xuICAgICAgICAkKCcudWkuYnV0dG9uW2RhdGEtdG9vbHRpcF0nKS5wb3B1cCgpO1xuICAgIH0sXG5cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZSgpO1xuXG4gICAgLy8gRW5zdXJlIGNsaWNrIHByZXZlbnRpb24gZm9yIHRvb2x0aXAgaWNvbnMgaW4gY2hlY2tib3hlc1xuICAgIC8vIFRoaXMgcHJldmVudHMgY2hlY2tib3ggdG9nZ2xlIHdoZW4gY2xpY2tpbmcgb24gdG9vbHRpcCBpY29uXG4gICAgJCgnLmZpZWxkLWluZm8taWNvbicpLm9mZignY2xpY2sudG9vbHRpcC1wcmV2ZW50Jykub24oJ2NsaWNrLnRvb2x0aXAtcHJldmVudCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG59KTsiXX0=