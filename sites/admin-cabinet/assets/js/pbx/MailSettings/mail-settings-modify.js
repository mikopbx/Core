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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkIiwiJGNoZWNrQm94ZXMiLCIkbWVudUl0ZW1zIiwib2F1dGgyV2luZG93IiwiZGF0YUxvYWRlZCIsImdldFZhbGlkYXRlUnVsZXMiLCJydWxlcyIsImF1dGhUeXBlIiwidmFsIiwiTWFpbFNNVFBTZW5kZXJBZGRyZXNzIiwiaWRlbnRpZmllciIsIm9wdGlvbmFsIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQiLCJTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwiLCJtc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCIsIlN5c3RlbUVtYWlsRm9yTWlzc2VkIiwidmFsdWUiLCJtc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCIsIlZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCIsIm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkIiwiTWFpbFNNVFBIb3N0IiwibXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQiLCJNYWlsU01UUFBvcnQiLCJtc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCIsIk1haWxPQXV0aDJQcm92aWRlciIsIk1haWxPQXV0aDJDbGllbnRJZCIsIk1haWxPQXV0aDJDbGllbnRTZWNyZXQiLCJNYWlsU01UUFVzZXJuYW1lIiwibXNfVmFsaWRhdGVTTVRQVXNlcm5hbWVFbWFpbCIsIk1haWxTTVRQUGFzc3dvcmQiLCJkZXBlbmRzIiwibXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSIsInVwZGF0ZVZhbGlkYXRpb25SdWxlcyIsIm5ld1J1bGVzIiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmb3JtIiwiZmllbGRzIiwiaW5saW5lIiwib24iLCJpbml0aWFsaXplIiwiaGFuZGxlT0F1dGgyQ2FsbGJhY2siLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJjaGVja2JveCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ1cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24iLCJpbml0aWFsRW5jcnlwdGlvbiIsImNsZWFyYWJsZSIsImZvcmNlU2VsZWN0aW9uIiwidXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVPQXV0aDIiLCJpbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycyIsImluaXRpYWxpemVOb3RpZmljYXRpb25IYW5kbGVycyIsImluaXRpYWxpemVUZXN0QnV0dG9ucyIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwiLCJpbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIiLCJzdWJzY3JpYmVUb09BdXRoMkV2ZW50cyIsIm1vbml0b3JGb3JtQ2hhbmdlcyIsImxvYWREYXRhIiwiTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJidWlsZFRvb2x0aXBDb250ZW50IiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsImJ1aWxkQ29udGVudCIsImVtYWlsRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkSWQiLCIkZmllbGQiLCJsZW5ndGgiLCJpbnB1dG1hc2siLCJzaG93TWFza09uSG92ZXIiLCJwbGFjZWhvbGRlciIsIm9uQmVmb3JlUGFzdGUiLCJwYXN0ZWRWYWx1ZSIsIm9uY2xlYXJlZCIsIiRpbnB1dCIsImFkZENsYXNzIiwiTWFpbFNldHRpbmdzQVBJIiwiZ2V0U2V0dGluZ3MiLCJzZXR0aW5ncyIsIm9mZiIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJkYXRhIiwiYm9vbGVhbkZpZWxkcyIsImtleSIsInVuZGVmaW5lZCIsIk1haWxTTVRQQXV0aFR5cGUiLCJhZnRlclBvcHVsYXRlIiwiTWFpbFNNVFBVc2VUTFMiLCJlbmNyeXB0aW9uVmFsdWUiLCJNYWlsU01UUENlcnRDaGVjayIsImlzQ2hlY2tlZCIsImNsb3Nlc3QiLCJNYWlsRW5hYmxlTm90aWZpY2F0aW9ucyIsInVwZGF0ZVVzZXJuYW1lUGxhY2Vob2xkZXIiLCJ0b2dnbGVBdXRoRmllbGRzIiwicmVtb3ZlQ2xhc3MiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJyZUF0dGFjaEF1dGhUeXBlSGFuZGxlciIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0YXJ0T0F1dGgyRmxvdyIsImRpc2Nvbm5lY3RPQXV0aDIiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiaGFuZGxlT0F1dGgyTWVzc2FnZSIsImRhdGFDaGFuZ2VkIiwidGFyZ2V0IiwiY3VycmVudEF1dGhUeXBlIiwidG9nZ2xlQXV0aEZpZWxkc1dpdGhvdXRTdGF0dXMiLCIkdXNlcm5hbWVGaWVsZCIsIiRwYXNzd29yZEZpZWxkIiwiJG9hdXRoMlNlY3Rpb24iLCJzaG93IiwiaGlkZSIsInVwZGF0ZU9BdXRoMlN0YXR1cyIsImNoZWNrT0F1dGgyU3RhdHVzIiwiY3VycmVudFRhcmdldCIsImhhc0NsYXNzIiwiaGFzQ2hhbmdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd1dhcm5pbmciLCJtc19TYXZlQ2hhbmdlc0JlZm9yZVRlc3RpbmciLCJ0ZXN0Q29ubmVjdGlvbiIsInNlbmRUZXN0RW1haWwiLCJlbWFpbCIsInByb3ZpZGVyIiwiZGV0ZWN0UHJvdmlkZXIiLCJzaG93UHJvdmlkZXJIaW50IiwiYXV0b0ZpbGxTTVRQU2V0dGluZ3MiLCJzZW5kZXJBZGRyZXNzIiwidHJpbSIsImF0dHIiLCJyZW1vdmVBdHRyIiwiZ29vZ2xlIiwiaG9zdCIsInBvcnQiLCJ0bHMiLCJtaWNyb3NvZnQiLCJ5YW5kZXgiLCJwcm92aWRlclNldHRpbmdzIiwiJGVuY3J5cHRpb25Ecm9wZG93biIsImVuY3J5cHRpb24iLCJjZXJ0Q2hlY2siLCJlbmNyeXB0aW9uVHlwZSIsIiRwb3J0RmllbGQiLCJjdXJyZW50UG9ydCIsInN0YW5kYXJkUG9ydHMiLCJpbmNsdWRlcyIsIiRjZXJ0Q2hlY2tGaWVsZCIsIm1lc3NhZ2UiLCIkaGludCIsImFmdGVyIiwidGV4dCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImxvY2F0aW9uIiwic2VhcmNoIiwiaGFzIiwibG9hZFNldHRpbmdzRnJvbUFQSSIsInJlcGxhY2VTdGF0ZSIsImRvY3VtZW50IiwidGl0bGUiLCJwYXRobmFtZSIsImVycm9yIiwiZ2V0Iiwic2hvd0Vycm9yIiwibXNfT0F1dGgyQXV0aG9yaXphdGlvbkZhaWxlZCIsImRlY29kZVVSSUNvbXBvbmVudCIsIm1zX1ZhbGlkYXRlT0F1dGgyUHJvdmlkZXJFbXB0eSIsImNsaWVudElkIiwiY2xpZW50U2VjcmV0IiwibXNfVmFsaWRhdGVPQXV0aDJDbGllbnRJZEVtcHR5IiwibXNfVmFsaWRhdGVPQXV0aDJDbGllbnRTZWNyZXRFbXB0eSIsInNhdmVPQXV0aDJDcmVkZW50aWFscyIsInBhdGNoU2V0dGluZ3MiLCJyZXNwb25zZSIsInJlc3VsdCIsInByb2NlZWRXaXRoT0F1dGgyRmxvdyIsImNvbnNvbGUiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImpvaW4iLCJyZXF1ZXN0T0F1dGgyQXV0aFVybCIsImF1dGhvcml6ZU9BdXRoMiIsImF1dGhVcmwiLCJ3aWR0aCIsImhlaWdodCIsImxlZnQiLCJzY3JlZW4iLCJ0b3AiLCJhdXRoV2luZG93Iiwib3BlbiIsImdldE9BdXRoMlVybCIsImF1dGhfdXJsIiwiZXZlbnQiLCJvcmlnaW4iLCJjbG9zZSIsInBhcmFtcyIsInNob3dJbmZvcm1hdGlvbiIsIm9hdXRoMl9zdGF0dXMiLCJzdGF0dXMiLCIkc3RhdHVzRGl2IiwiJGNsaWVudElkRmllbGQiLCIkY2xpZW50U2VjcmV0RmllbGQiLCJjb25maWd1cmVkIiwicHJvdmlkZXJOYW1lIiwiZ2V0UHJvdmlkZXJOYW1lIiwiY29ubmVjdGVkVGV4dCIsIm1zX09BdXRoMkNvbm5lY3RlZFRvIiwicmVwbGFjZSIsImh0bWwiLCJhdXRob3JpemVkIiwibXNfT0F1dGgyTm90Q29uZmlndXJlZCIsImNsZWFyRGF0YSIsIk1haWxPQXV0aDJSZWZyZXNoVG9rZW4iLCJNYWlsT0F1dGgyQWNjZXNzVG9rZW4iLCJNYWlsT0F1dGgyVG9rZW5FeHBpcmVzIiwiJGJ1dHRvbiIsIiRyZXN1bHRBcmVhIiwicmVtb3ZlIiwiJHJlc3VsdCIsInBhcmVudCIsImFwcGVuZCIsInN1Y2Nlc3MiLCJkaWFnbm9zdGljcyIsImRpYWciLCJkZXRhaWxzIiwiYXV0aF90eXBlIiwic210cF9ob3N0Iiwic210cF9wb3J0Iiwic210cF9lbmNyeXB0aW9uIiwib2F1dGgyX3Byb3ZpZGVyIiwib2F1dGgyX3JlZnJlc2hfdG9rZW5fZXhpc3RzIiwibXNfRGlhZ25vc3RpY0F1dGhvcml6ZWQiLCJtYWluTWVzc2FnZSIsIm1zX0RpYWdub3N0aWNDb25uZWN0aW9uRmFpbGVkIiwiZXJyb3JfZGV0YWlscyIsInByb2JhYmxlX2NhdXNlIiwicmF3X2Vycm9yIiwicmF3RXJyb3IiLCJkZXRhaWxzSHRtbCIsIm1zX0RpYWdub3N0aWNUZWNobmljYWxEZXRhaWxzIiwiZmluZCIsImFjY29yZGlvbiIsInRvVXBwZXJDYXNlIiwiaGludHMiLCJyZWxldmFudEhpbnRzIiwic2xpY2UiLCJoaW50Iiwic29tZSIsImgiLCJzZXRUaW1lb3V0IiwiZmFkZU91dCIsInJlY2lwaWVudCIsInRvIiwiYWN0dWFsUmVjaXBpZW50Iiwic3VjY2Vzc01lc3NhZ2UiLCJlcnJvckRldGFpbHMiLCJtc19EaWFnbm9zdGljUHJvYmFibGVDYXVzZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJvcmlnaW5hbFZhbHVlIiwiZmllbGRWYWx1ZSIsInVubWFza2VkVmFsdWUiLCJ3YXJuIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwic2VuZE9ubHlDaGFuZ2VkIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ1cmwiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsIm1zX09BdXRoMlByb2Nlc3NpbmdGYWlsZWQiLCJ1cGRhdGVUZXN0QnV0dG9uU3RhdGVzIiwib3JpZ2luYWxBZnRlclNlbmRGb3JtIiwiJHRlc3RDb25uZWN0aW9uQnRuIiwiJHNlbmRUZXN0RW1haWxCdG4iLCIkc3VibWl0QnRuIiwicG9wdXAiLCJyZWFkeSIsInN0b3BQcm9wYWdhdGlvbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FMTTs7QUFPakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFRCxDQUFDLENBQUMsK0JBQUQsQ0FYRzs7QUFhakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsVUFBVSxFQUFFRixDQUFDLENBQUMsMkJBQUQsQ0FqQkk7O0FBbUJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxZQUFZLEVBQUUsSUF2Qkc7O0FBeUJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsS0E3Qks7O0FBK0JqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkFuQ2lCLDhCQW1DRTtBQUNmLFFBQU1DLEtBQUssR0FBRyxFQUFkO0FBQ0EsUUFBTUMsUUFBUSxHQUFHUCxDQUFDLENBQUMsd0NBQUQsQ0FBRCxDQUE0Q1EsR0FBNUMsRUFBakIsQ0FGZSxDQUlmOztBQUNBRixJQUFBQSxLQUFLLENBQUNHLHFCQUFOLEdBQThCO0FBQzFCQyxNQUFBQSxVQUFVLEVBQUUsdUJBRGM7QUFFMUJDLE1BQUFBLFFBQVEsRUFBRSxJ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QSxVQUpMLENBSWdCLGVBSmhCO0FBTUFtSixNQUFBQSxpQkFBaUIsQ0FDWnpMLFdBREwsQ0FDaUIsVUFEakIsRUFFS3NDLFVBRkwsQ0FFZ0IsY0FGaEIsRUFHS0EsVUFITCxDQUdnQixlQUhoQixFQUlLQSxVQUpMLENBSWdCLGVBSmhCO0FBS0gsS0FyQ29CLENBdUNyQjs7O0FBQ0FoSixJQUFBQSxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUE4QnFTLEtBQTlCO0FBQ0g7QUF0OENnQixDQUFyQixDLENBMDhDQTs7QUFDQXJTLENBQUMsQ0FBQzRLLFFBQUQsQ0FBRCxDQUFZMEgsS0FBWixDQUFrQixZQUFNO0FBQ3BCeFMsRUFBQUEsWUFBWSxDQUFDNkMsVUFBYixHQURvQixDQUdwQjtBQUNBOztBQUNBM0MsRUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0J5RixHQUF0QixDQUEwQix1QkFBMUIsRUFBbUQvQyxFQUFuRCxDQUFzRCx1QkFBdEQsRUFBK0UsVUFBU29FLENBQVQsRUFBWTtBQUN2RkEsSUFBQUEsQ0FBQyxDQUFDeUwsZUFBRjtBQUNBekwsSUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsV0FBTyxLQUFQO0FBQ0gsR0FKRDtBQUtILENBVkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBVc2VyTWVzc2FnZSwgTWFpbFNldHRpbmdzQVBJLCBDb25maWcsIFRvb2x0aXBCdWlsZGVyLCBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbWFpbCBzZXR0aW5ncyB3aXRoIE9BdXRoMiBzdXBwb3J0XG4gKlxuICogQG1vZHVsZSBtYWlsU2V0dGluZ3NcbiAqL1xuY29uc3QgbWFpbFNldHRpbmdzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNtYWlsLXNldHRpbmdzLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVja2JveGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrQm94ZXM6ICQoJyNtYWlsLXNldHRpbmdzLWZvcm0gLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbWVudSBpdGVtcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtZW51SXRlbXM6ICQoJyNtYWlsLXNldHRpbmdzLW1lbnUgLml0ZW0nKSxcblxuICAgIC8qKlxuICAgICAqIE9BdXRoMiB3aW5kb3cgcmVmZXJlbmNlXG4gICAgICogQHR5cGUge1dpbmRvd3xudWxsfVxuICAgICAqL1xuICAgIG9hdXRoMldpbmRvdzogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgaW5pdGlhbCBkYXRhIGhhcyBiZWVuIGxvYWRlZCBmcm9tIEFQSVxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGRhdGFMb2FkZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBmb3JtIHN0YXRlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJ1bGVzID0ge307XG4gICAgICAgIGNvbnN0IGF1dGhUeXBlID0gJCgnaW5wdXRbbmFtZT1cIk1haWxTTVRQQXV0aFR5cGVcIl06Y2hlY2tlZCcpLnZhbCgpO1xuXG4gICAgICAgIC8vIEJhc2UgZW1haWwgdmFsaWRhdGlvbiBydWxlcyAtIGFsd2F5cyBhcHBseSB3aGVuIGZpZWxkcyBoYXZlIHZhbHVlc1xuICAgICAgICBydWxlcy5NYWlsU01UUFNlbmRlckFkZHJlc3MgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbFNNVFBTZW5kZXJBZGRyZXNzJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5TeXN0ZW1FbWFpbEZvck1pc3NlZCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeKD8hLipfQF9cXFxcLl8pLiokJywgIC8vIFJlamVjdCBfQF8uXyBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlTWlzc2VkRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ14oPyEuKl9AX1xcXFwuXykuKiQnLCAgLy8gUmVqZWN0IF9AXy5fIHBhdHRlcm5cbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVWb2ljZW1haWxFbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNNVFAgY29uZmlndXJhdGlvbiBydWxlcyAtIGFsd2F5cyBhdmFpbGFibGUgYnV0IG9wdGlvbmFsXG4gICAgICAgIHJ1bGVzLk1haWxTTVRQSG9zdCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUEhvc3QnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuTWFpbFNNVFBQb3J0ID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQUG9ydCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBdXRoZW50aWNhdGlvbi1zcGVjaWZpYyBydWxlc1xuICAgICAgICBpZiAoYXV0aFR5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICAvLyBPQXV0aDIgZmllbGRzIC0gb3B0aW9uYWxcbiAgICAgICAgICAgIHJ1bGVzLk1haWxPQXV0aDJQcm92aWRlciA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbE9BdXRoMlByb3ZpZGVyJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBydWxlcy5NYWlsT0F1dGgyQ2xpZW50SWQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxPQXV0aDJDbGllbnRJZCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcnVsZXMuTWFpbE9BdXRoMkNsaWVudFNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbE9BdXRoMkNsaWVudFNlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gVXNlcm5hbWUgZm9yIE9BdXRoMiBzaG91bGQgYmUgZW1haWwgd2hlbiBmaWxsZWRcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQVXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbWFpbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNNVFBVc2VybmFtZUVtYWlsLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUGFzc3dvcmQgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFVzZXJuYW1lIC0gb3B0aW9uYWxcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQVXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIC0gcmVxdWlyZWQgaWYgdXNlcm5hbWUgaXMgcHJvdmlkZWRcbiAgICAgICAgICAgIHJ1bGVzLk1haWxTTVRQUGFzc3dvcmQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQUGFzc3dvcmQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRlcGVuZHM6ICdNYWlsU01UUFVzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgYW5kIHJlaW5pdGlhbGl6ZSBmb3JtXG4gICAgICovXG4gICAgdXBkYXRlVmFsaWRhdGlvblJ1bGVzKCkge1xuICAgICAgICAvLyBHZXQgZnJlc2ggdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBjdXJyZW50IHN0YXRlXG4gICAgICAgIGNvbnN0IG5ld1J1bGVzID0gbWFpbFNldHRpbmdzLmdldFZhbGlkYXRlUnVsZXMoKTtcblxuICAgICAgICAvLyBVcGRhdGUgRm9ybS52YWxpZGF0ZVJ1bGVzXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ld1J1bGVzO1xuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gd2l0aCBuZXcgcnVsZXNcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2Rlc3Ryb3knKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oe1xuICAgICAgICAgICAgZmllbGRzOiBuZXdSdWxlcyxcbiAgICAgICAgICAgIGlubGluZTogdHJ1ZSxcbiAgICAgICAgICAgIG9uOiAnYmx1cidcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1haWwgc2V0dGluZ3MgcGFnZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDaGVjayBmb3IgT0F1dGgyIGNhbGxiYWNrIHBhcmFtZXRlcnMgaW4gVVJMXG4gICAgICAgIG1haWxTZXR0aW5ncy5oYW5kbGVPQXV0aDJDYWxsYmFjaygpO1xuXG4gICAgICAgIG1haWxTZXR0aW5ncy4kbWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG4gICAgICAgIG1haWxTZXR0aW5ncy4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zIHdpdGggc3BlY2lmaWMgY29uZmlndXJhdGlvbnNcbiAgICAgICAgLy8gRG9uJ3QgaW5pdGlhbGl6ZSBhbGwgZHJvcGRvd25zIGdlbmVyaWNhbGx5IHRvIGF2b2lkIGRvdWJsZSBpbml0aWFsaXphdGlvblxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZW5jcnlwdGlvbiB0eXBlIGRyb3Bkb3duIHdpdGggcG9ydCBhdXRvLXVwZGF0ZVxuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24odmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDaGVjayBpbml0aWFsIGVuY3J5cHRpb24gdHlwZSB0byBzaG93L2hpZGUgY2VydGlmaWNhdGUgY2hlY2tcbiAgICAgICAgY29uc3QgaW5pdGlhbEVuY3J5cHRpb24gPSAkKCcjTWFpbFNNVFBVc2VUTFMnKS52YWwoKSB8fCAnbm9uZSc7XG4gICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24oaW5pdGlhbEVuY3J5cHRpb24pO1xuXG4gICAgICAgIC8vIFNwZWNpYWwgaW5pdGlhbGl6YXRpb24gZm9yIE9BdXRoMiBwcm92aWRlciBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgY2xlYXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVNNVFBTZXR0aW5nc0ZvclByb3ZpZGVyKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTm8gb3RoZXIgZHJvcGRvd25zIGluIHRoZSBmb3JtIG5lZWQgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gTWFpbFNNVFBVc2VUTFMgYW5kIE1haWxPQXV0aDJQcm92aWRlciBhcmUgdGhlIG9ubHkgZHJvcGRvd25zXG5cbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplT0F1dGgyKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycygpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZU5vdGlmaWNhdGlvbkhhbmRsZXJzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplVGVzdEJ1dHRvbnMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVJbnB1dE1hc2tzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmRldGVjdFByb3ZpZGVyRnJvbUVtYWlsKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplU2VuZGVyQWRkcmVzc0hhbmRsZXIoKTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgT0F1dGgyIGV2ZW50c1xuICAgICAgICBtYWlsU2V0dGluZ3Muc3Vic2NyaWJlVG9PQXV0aDJFdmVudHMoKTtcblxuICAgICAgICAvLyBNb25pdG9yIGZvcm0gY2hhbmdlcyB0byBjb250cm9sIHRlc3QgYnV0dG9uc1xuICAgICAgICBtYWlsU2V0dGluZ3MubW9uaXRvckZvcm1DaGFuZ2VzKCk7XG5cbiAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gQVBJIGFmdGVyIGFsbCBVSSBlbGVtZW50cyBhcmUgaW5pdGlhbGl6ZWRcbiAgICAgICAgbWFpbFNldHRpbmdzLmxvYWREYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBVc2UgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBpZiAodHlwZW9mIE1haWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZVRvb2x0aXBzKG1haWxTZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogRGVsZWdhdGVzIHRvIFRvb2x0aXBCdWlsZGVyIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgZm9ybWF0dGluZ1xuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW5wdXQgbWFza3MgZm9yIGVtYWlsIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dE1hc2tzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGVtYWlsIGlucHV0IG1hc2tzIGZvciBhbGwgZW1haWwgZmllbGRzXG4gICAgICAgIGNvbnN0IGVtYWlsRmllbGRzID0gW1xuICAgICAgICAgICAgJ01haWxTTVRQU2VuZGVyQWRkcmVzcycsXG4gICAgICAgICAgICAnU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ1xuICAgICAgICBdO1xuXG4gICAgICAgIGVtYWlsRmllbGRzLmZvckVhY2goZmllbGRJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGZpZWxkLmlucHV0bWFzaygnZW1haWwnLCB7XG4gICAgICAgICAgICAgICAgICAgIHNob3dNYXNrT25Ib3ZlcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAnJywgLy8gTm8gcGxhY2Vob2xkZXIgY2hhcmFjdGVyXG4gICAgICAgICAgICAgICAgICAgIG9uQmVmb3JlUGFzdGU6IGZ1bmN0aW9uKHBhc3RlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGVhbiBwbGFjZWhvbGRlciB2YWx1ZXMgb24gcGFzdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXN0ZWRWYWx1ZSA9PT0gJ19AXy5fJyB8fCBwYXN0ZWRWYWx1ZSA9PT0gJ0AnIHx8IHBhc3RlZFZhbHVlID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXN0ZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25jbGVhcmVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBmaWVsZCB2YWx1ZSB3aGVuIG1hc2sgaXMgY2xlYXJlZFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkaW5wdXQudmFsKCkgPT09ICdfQF8uXycgfHwgJGlucHV0LnZhbCgpID09PSAnQCcgfHwgJGlucHV0LnZhbCgpID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRpbnB1dC52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBDbGVhbiBpbml0aWFsIHBsYWNlaG9sZGVyIHZhbHVlc1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQudmFsKCkgPT09ICdfQF8uXycgfHwgJGZpZWxkLnZhbCgpID09PSAnQCcgfHwgJGZpZWxkLnZhbCgpID09PSAnX0BfJykge1xuICAgICAgICAgICAgICAgICAgICAkZmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1haWwgc2V0dGluZ3MgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWREYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLmdldFNldHRpbmdzKChzZXR0aW5ncykgPT4ge1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgZGlzYWJsZSBvdXIgY2hhbmdlIGhhbmRsZXIgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXScpLm9mZignY2hhbmdlLm1haWxzZXR0aW5ncycpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggbGlrZSBHZW5lcmFsU2V0dGluZ3NcbiAgICAgICAgICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHNldHRpbmdzLCB7XG4gICAgICAgICAgICAgICAgICAgIGJlZm9yZVBvcHVsYXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUkVTVCBBUEkgcmV0dXJucyBib29sZWFucyBmb3IgY2hlY2tib3ggZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IGJvb2xlYW4gdmFsdWVzIHRvIHN0cmluZ3MgZm9yIFNlbWFudGljIFVJIGNoZWNrYm94ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvb2xlYW5GaWVsZHMgPSBbJ01haWxTTVRQQ2VydENoZWNrJywgJ01haWxFbmFibGVOb3RpZmljYXRpb25zJ107XG4gICAgICAgICAgICAgICAgICAgICAgICBib29sZWFuRmllbGRzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBib29sZWFuIHRvIHN0cmluZyBcIjFcIiBvciBcIjBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSAoZGF0YVtrZXldID09PSB0cnVlIHx8IGRhdGFba2V5XSA9PT0gMSB8fCBkYXRhW2tleV0gPT09ICcxJykgPyAnMScgOiAnMCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSByYWRpbyBidXR0b24gdmFsdWUgaXMgc2V0ICh3aWxsIGJlIGhhbmRsZWQgc2lsZW50bHkgYnkgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGF0YS5NYWlsU01UUEF1dGhUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5NYWlsU01UUEF1dGhUeXBlID0gJ3Bhc3N3b3JkJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYW4gdXAgcGxhY2Vob2xkZXIgZW1haWwgdmFsdWVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbWFpbEZpZWxkcyA9IFsnU3lzdGVtRW1haWxGb3JNaXNzZWQnLCAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ107XG4gICAgICAgICAgICAgICAgICAgICAgICBlbWFpbEZpZWxkcy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFba2V5XSA9PT0gJ19AXy5fJyB8fCBkYXRhW2tleV0gPT09ICdAJyB8fCBkYXRhW2tleV0gPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFba2V5XSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgT0F1dGgyIHByb3ZpZGVyIGRyb3Bkb3duIChWNS4wIHBhdHRlcm4pXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5NYWlsT0F1dGgyUHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuTWFpbE9BdXRoMlByb3ZpZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykudmFsKGRhdGEuTWFpbE9BdXRoMlByb3ZpZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgZW5jcnlwdGlvbiB0eXBlIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5NYWlsU01UUFVzZVRMUyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBvbGQgYm9vbGVhbiB2YWx1ZXMgdG8gbmV3IGZvcm1hdCBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5jcnlwdGlvblZhbHVlID0gZGF0YS5NYWlsU01UUFVzZVRMUztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW5jcnlwdGlvblZhbHVlID09PSB0cnVlIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gMSB8fCBlbmNyeXB0aW9uVmFsdWUgPT09ICcxJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmNyeXB0aW9uVmFsdWUgPSAndGxzJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVuY3J5cHRpb25WYWx1ZSA9PT0gZmFsc2UgfHwgZW5jcnlwdGlvblZhbHVlID09PSAwIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gJzAnIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIGRyb3Bkb3duIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQVXNlVExTLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGVuY3J5cHRpb25WYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQVXNlVExTJykudmFsKGVuY3J5cHRpb25WYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGNoZWNrYm94ZXMgdXNpbmcgU2VtYW50aWMgVUlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxTTVRQQ2VydENoZWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBkYXRhLk1haWxTTVRQQ2VydENoZWNrID09PSB0cnVlIHx8IGRhdGEuTWFpbFNNVFBDZXJ0Q2hlY2sgPT09IDEgfHwgZGF0YS5NYWlsU01UUENlcnRDaGVjayA9PT0gJzEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxTTVRQQ2VydENoZWNrJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxFbmFibGVOb3RpZmljYXRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBkYXRhLk1haWxFbmFibGVOb3RpZmljYXRpb25zID09PSB0cnVlIHx8IGRhdGEuTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgPT09IDEgfHwgZGF0YS5NYWlsRW5hYmxlTm90aWZpY2F0aW9ucyA9PT0gJzEnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxFbmFibGVOb3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI01haWxFbmFibGVOb3RpZmljYXRpb25zJykuY2xvc2VzdCgnLmNoZWNrYm94JykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBNYWlsU01UUFVzZXJuYW1lIHBsYWNlaG9sZGVyIHdpdGggTWFpbFNNVFBTZW5kZXJBZGRyZXNzIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVXNlcm5hbWVQbGFjZWhvbGRlcihkYXRhLk1haWxTTVRQU2VuZGVyQWRkcmVzcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIE9BdXRoMiBzdGF0dXMgaWYgT0F1dGgyIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSYWRpbyBidXR0b24gaXMgYWxyZWFkeSBzZXQgYnkgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXV0aFR5cGUgPSBkYXRhLk1haWxTTVRQQXV0aFR5cGUgfHwgJ3Bhc3N3b3JkJztcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVBdXRoRmllbGRzKGF1dGhUeXBlLCBkYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gbG9hZGVkIHN0YXRlXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVmFsaWRhdGlvblJ1bGVzKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGZsYWcgdGhhdCBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmRhdGFMb2FkZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGlmIGVuYWJsZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlLWVuYWJsZSBvdXIgY2hhbmdlIGhhbmRsZXIgZm9yIGZ1dHVyZSB1c2VyIGludGVyYWN0aW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgT0F1dGgyIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplT0F1dGgyKCkge1xuICAgICAgICAvLyBPQXV0aDIgY29ubmVjdCBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnN0YXJ0T0F1dGgyRmxvdygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBPQXV0aDIgZGlzY29ubmVjdCBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCcjb2F1dGgyLWRpc2Nvbm5lY3QnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLmRpc2Nvbm5lY3RPQXV0aDIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTGlzdGVuIGZvciBPQXV0aDIgY2FsbGJhY2sgbWVzc2FnZXNcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBtYWlsU2V0dGluZ3MuaGFuZGxlT0F1dGgyTWVzc2FnZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbm90aWZpY2F0aW9uIGVuYWJsZS9kaXNhYmxlIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5vdGlmaWNhdGlvbkhhbmRsZXJzKCkge1xuICAgICAgICAvLyBIYW5kbGUgbm90aWZpY2F0aW9ucyBlbmFibGUvZGlzYWJsZSBjaGVja2JveFxuICAgICAgICAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVWYWxpZGF0aW9uUnVsZXMoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2ggYXV0aCB0eXBlIGNoYW5nZSBoYW5kbGVyXG4gICAgICovXG4gICAgcmVBdHRhY2hBdXRoVHlwZUhhbmRsZXIoKSB7XG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdJykub24oJ2NoYW5nZS5tYWlsc2V0dGluZ3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYXV0aFR5cGUgPSAkKGUudGFyZ2V0KS52YWwoKTtcbiAgICAgICAgICAgIC8vIFdoZW4gdXNlciBtYW51YWxseSBjaGFuZ2VzIGF1dGggdHlwZSwgY2hlY2sgT0F1dGgyIHN0YXR1cyBpZiBuZWVkZWRcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVBdXRoRmllbGRzKGF1dGhUeXBlKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIHdoZW4gYXV0aCB0eXBlIGNoYW5nZXNcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVWYWxpZGF0aW9uUnVsZXMoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYXV0aGVudGljYXRpb24gdHlwZSBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVBdXRoVHlwZUhhbmRsZXJzKCkge1xuICAgICAgICAvLyBBdHRhY2ggaW5pdGlhbCBoYW5kbGVyXG4gICAgICAgIG1haWxTZXR0aW5ncy5yZUF0dGFjaEF1dGhUeXBlSGFuZGxlcigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb24gcGFnZSBsb2FkIC0gZG9uJ3QgY2hlY2sgT0F1dGgyIHN0YXR1cyB5ZXQgKHdpbGwgYmUgZG9uZSBpbiBsb2FkRGF0YSlcbiAgICAgICAgY29uc3QgY3VycmVudEF1dGhUeXBlID0gJCgnaW5wdXRbbmFtZT1cIk1haWxTTVRQQXV0aFR5cGVcIl06Y2hlY2tlZCcpLnZhbCgpIHx8ICdwYXNzd29yZCc7XG4gICAgICAgIG1haWxTZXR0aW5ncy50b2dnbGVBdXRoRmllbGRzV2l0aG91dFN0YXR1cyhjdXJyZW50QXV0aFR5cGUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYXV0aGVudGljYXRpb24gZmllbGRzIHdpdGhvdXQgY2hlY2tpbmcgT0F1dGgyIHN0YXR1cyAoZm9yIGluaXRpYWwgc2V0dXApXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGF1dGhUeXBlIC0gQXV0aGVudGljYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzKGF1dGhUeXBlKSB7XG4gICAgICAgIGNvbnN0ICR1c2VybmFtZUZpZWxkID0gJCgnI01haWxTTVRQVXNlcm5hbWUnKS5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgY29uc3QgJHBhc3N3b3JkRmllbGQgPSAkKCcjTWFpbFNNVFBQYXNzd29yZCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICBjb25zdCAkb2F1dGgyU2VjdGlvbiA9ICQoJyNvYXV0aDItYXV0aC1zZWN0aW9uJyk7XG5cbiAgICAgICAgaWYgKGF1dGhUeXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgLy8gRm9yIE9BdXRoMjogc2hvdyB1c2VybmFtZSAocmVxdWlyZWQgZm9yIGVtYWlsIGlkZW50aWZpY2F0aW9uKSwgaGlkZSBwYXNzd29yZFxuICAgICAgICAgICAgJHVzZXJuYW1lRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJHBhc3N3b3JkRmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgJG9hdXRoMlNlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBwYXNzd29yZCBmaWVsZCBlcnJvcnNcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ01haWxTTVRQUGFzc3dvcmQnKTtcbiAgICAgICAgICAgICRwYXNzd29yZEZpZWxkLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIHBhc3N3b3JkIGF1dGg6IHNob3cgYm90aCB1c2VybmFtZSBhbmQgcGFzc3dvcmRcbiAgICAgICAgICAgICR1c2VybmFtZUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICRwYXNzd29yZEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICRvYXV0aDJTZWN0aW9uLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgT0F1dGgyIGZpZWxkIGVycm9yc1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnTWFpbE9BdXRoMlByb3ZpZGVyJyk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdNYWlsT0F1dGgyQ2xpZW50SWQnKTtcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ01haWxPQXV0aDJDbGllbnRTZWNyZXQnKTtcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50SWQnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50U2VjcmV0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGF1dGhlbnRpY2F0aW9uIGZpZWxkcyBiYXNlZCBvbiB0eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGF1dGhUeXBlIC0gQXV0aGVudGljYXRpb24gdHlwZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbc2V0dGluZ3NdIC0gT3B0aW9uYWwgc2V0dGluZ3MgZGF0YSB0byBhdm9pZCBhZGRpdGlvbmFsIEFQSSBjYWxsXG4gICAgICovXG4gICAgdG9nZ2xlQXV0aEZpZWxkcyhhdXRoVHlwZSwgc2V0dGluZ3MgPSBudWxsKSB7XG4gICAgICAgIC8vIEZpcnN0IHRvZ2dsZSBmaWVsZHMgd2l0aG91dCBzdGF0dXMgY2hlY2tcbiAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzKGF1dGhUeXBlKTtcblxuICAgICAgICAvLyBUaGVuIGNoZWNrIE9BdXRoMiBzdGF0dXMgb25seSBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGF1dGhUeXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgaWYgKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGV4aXN0aW5nIHNldHRpbmdzIGRhdGEgdG8gYXZvaWQgZHVwbGljYXRlIEFQSSBjYWxsXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZU9BdXRoMlN0YXR1cyhzZXR0aW5ncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIEFQSSBjYWxsIGlmIG5vIHNldHRpbmdzIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0ZXN0IGJ1dHRvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGVzdEJ1dHRvbnMoKSB7XG4gICAgICAgIC8vIFRlc3QgY29ubmVjdGlvbiBidXR0b25cbiAgICAgICAgJCgnI3Rlc3QtY29ubmVjdGlvbi1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gaXMgZGlzYWJsZWRcbiAgICAgICAgICAgIGlmICgkKGUuY3VycmVudFRhcmdldCkuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERvdWJsZS1jaGVjayBmb3IgdW5zYXZlZCBjaGFuZ2VzXG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uaGFzQ2hhbmdlcyAmJiBGb3JtLmhhc0NoYW5nZXMoKSkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dXYXJuaW5nKFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy50ZXN0Q29ubmVjdGlvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZW5kIHRlc3QgZW1haWwgYnV0dG9uXG4gICAgICAgICQoJyNzZW5kLXRlc3QtZW1haWwtYnV0dG9uJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgYnV0dG9uIGlzIGRpc2FibGVkXG4gICAgICAgICAgICBpZiAoJChlLmN1cnJlbnRUYXJnZXQpLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEb3VibGUtY2hlY2sgZm9yIHVuc2F2ZWQgY2hhbmdlc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmhhc0NoYW5nZXMgJiYgRm9ybS5oYXNDaGFuZ2VzKCkpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3Muc2VuZFRlc3RFbWFpbCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGV0ZWN0IHByb3ZpZGVyIGZyb20gZW1haWwgYWRkcmVzc1xuICAgICAqL1xuICAgIGRldGVjdFByb3ZpZGVyRnJvbUVtYWlsKCkge1xuICAgICAgICAkKCcjTWFpbFNNVFBVc2VybmFtZScpLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZW1haWwgPSAkKGUudGFyZ2V0KS52YWwoKTtcbiAgICAgICAgICAgIGlmICghZW1haWwpIHJldHVybjtcblxuICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSBNYWlsU2V0dGluZ3NBUEkuZGV0ZWN0UHJvdmlkZXIoZW1haWwpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcHJvdmlkZXIgZmllbGQgdXNpbmcgU2VtYW50aWMgVUkgZHJvcGRvd24gKFY1LjAgcGF0dGVybilcbiAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXItZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgcHJvdmlkZXIpO1xuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlcicpLnZhbChwcm92aWRlcik7XG5cbiAgICAgICAgICAgIC8vIFNob3cgcmVjb21tZW5kYXRpb25zIGJhc2VkIG9uIHByb3ZpZGVyXG4gICAgICAgICAgICBpZiAocHJvdmlkZXIgPT09ICdnb29nbGUnKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnNob3dQcm92aWRlckhpbnQoJ0dtYWlsIGRldGVjdGVkLiBPQXV0aDIgYXV0aGVudGljYXRpb24gd2lsbCBiZSByZXF1aXJlZCBmcm9tIE1hcmNoIDIwMjUuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyID09PSAnbWljcm9zb2Z0Jykge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zaG93UHJvdmlkZXJIaW50KCdNaWNyb3NvZnQvT3V0bG9vayBkZXRlY3RlZC4gT0F1dGgyIGF1dGhlbnRpY2F0aW9uIHJlY29tbWVuZGVkLicpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm92aWRlciA9PT0gJ3lhbmRleCcpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Muc2hvd1Byb3ZpZGVySGludCgnWWFuZGV4IE1haWwgZGV0ZWN0ZWQuIEJvdGggcGFzc3dvcmQgYW5kIE9BdXRoMiBhdXRoZW50aWNhdGlvbiBzdXBwb3J0ZWQuJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEF1dG8tZmlsbCBTTVRQIHNldHRpbmdzIGJhc2VkIG9uIHByb3ZpZGVyXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuYXV0b0ZpbGxTTVRQU2V0dGluZ3MocHJvdmlkZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE1haWxTTVRQVXNlcm5hbWUgcGxhY2Vob2xkZXIgd2l0aCBNYWlsU01UUFNlbmRlckFkZHJlc3MgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VuZGVyQWRkcmVzcyAtIEVtYWlsIGFkZHJlc3MgZnJvbSBNYWlsU01UUFNlbmRlckFkZHJlc3MgZmllbGRcbiAgICAgKi9cbiAgICB1cGRhdGVVc2VybmFtZVBsYWNlaG9sZGVyKHNlbmRlckFkZHJlc3MpIHtcbiAgICAgICAgY29uc3QgJHVzZXJuYW1lRmllbGQgPSAkKCcjTWFpbFNNVFBVc2VybmFtZScpO1xuICAgICAgICBpZiAoc2VuZGVyQWRkcmVzcyAmJiBzZW5kZXJBZGRyZXNzLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgICR1c2VybmFtZUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgc2VuZGVyQWRkcmVzcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkdXNlcm5hbWVGaWVsZC5yZW1vdmVBdHRyKCdwbGFjZWhvbGRlcicpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgTWFpbFNNVFBTZW5kZXJBZGRyZXNzIGNoYW5nZSBoYW5kbGVyIHRvIHVwZGF0ZSB1c2VybmFtZSBwbGFjZWhvbGRlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVTZW5kZXJBZGRyZXNzSGFuZGxlcigpIHtcbiAgICAgICAgJCgnI01haWxTTVRQU2VuZGVyQWRkcmVzcycpLm9uKCdpbnB1dCBjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2VuZGVyQWRkcmVzcyA9ICQoZS50YXJnZXQpLnZhbCgpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVVzZXJuYW1lUGxhY2Vob2xkZXIoc2VuZGVyQWRkcmVzcyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdXRvLWZpbGwgU01UUCBzZXR0aW5ncyBiYXNlZCBvbiBwcm92aWRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlciAtIEVtYWlsIHByb3ZpZGVyXG4gICAgICovXG4gICAgYXV0b0ZpbGxTTVRQU2V0dGluZ3MocHJvdmlkZXIpIHtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBnb29nbGU6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC5nbWFpbC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIHRsczogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1pY3Jvc29mdDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLm9mZmljZTM2NS5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIHRsczogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHlhbmRleDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLnlhbmRleC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc0NjUnLFxuICAgICAgICAgICAgICAgIHRsczogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc2V0dGluZ3NbcHJvdmlkZXJdKSB7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlclNldHRpbmdzID0gc2V0dGluZ3NbcHJvdmlkZXJdO1xuXG4gICAgICAgICAgICAvLyBPbmx5IGZpbGwgaWYgZmllbGRzIGFyZSBlbXB0eVxuICAgICAgICAgICAgaWYgKCEkKCcjTWFpbFNNVFBIb3N0JykudmFsKCkpIHtcbiAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBIb3N0JykudmFsKHByb3ZpZGVyU2V0dGluZ3MuaG9zdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoISQoJyNNYWlsU01UUFBvcnQnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUFBvcnQnKS52YWwocHJvdmlkZXJTZXR0aW5ncy5wb3J0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGVuY3J5cHRpb24gZHJvcGRvd25cbiAgICAgICAgICAgIGNvbnN0ICRlbmNyeXB0aW9uRHJvcGRvd24gPSAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZW5jcnlwdGlvbkRyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBzZXR0aW5ncyBmb3IgZW5jcnlwdGlvblxuICAgICAgICAgICAgICAgIGxldCBlbmNyeXB0aW9uVmFsdWUgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyU2V0dGluZ3MucG9ydCA9PT0gJzU4NycpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ3Rscyc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm92aWRlclNldHRpbmdzLnBvcnQgPT09ICc0NjUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGVuY3J5cHRpb25WYWx1ZSA9ICdzc2wnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkZW5jcnlwdGlvbkRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBlbmNyeXB0aW9uVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBTTVRQIHNldHRpbmdzIHdoZW4gT0F1dGgyIHByb3ZpZGVyIGlzIHNlbGVjdGVkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyIC0gU2VsZWN0ZWQgT0F1dGgyIHByb3ZpZGVyIChnb29nbGUsIG1pY3Jvc29mdCwgeWFuZGV4KVxuICAgICAqL1xuICAgIHVwZGF0ZVNNVFBTZXR0aW5nc0ZvclByb3ZpZGVyKHByb3ZpZGVyKSB7XG4gICAgICAgIC8vIERvbid0IGF1dG8tZmlsbCB1bnRpbCBpbml0aWFsIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIGlmICghbWFpbFNldHRpbmdzLmRhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIE9BdXRoMiBhdXRoIHR5cGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgY29uc3QgYXV0aFR5cGUgPSAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXTpjaGVja2VkJykudmFsKCk7XG4gICAgICAgIGlmIChhdXRoVHlwZSAhPT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmluZSBwcm92aWRlciBTTVRQIHNldHRpbmdzXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBnb29nbGU6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC5nbWFpbC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIGVuY3J5cHRpb246ICd0bHMnLFxuICAgICAgICAgICAgICAgIGNlcnRDaGVjazogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1pY3Jvc29mdDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLW1haWwub3V0bG9vay5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIGVuY3J5cHRpb246ICd0bHMnLFxuICAgICAgICAgICAgICAgIGNlcnRDaGVjazogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHlhbmRleDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLnlhbmRleC5ydScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgZW5jcnlwdGlvbjogJ3RscycsXG4gICAgICAgICAgICAgICAgY2VydENoZWNrOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBwcm92aWRlclNldHRpbmdzW3Byb3ZpZGVyXTtcbiAgICAgICAgaWYgKCFzZXR0aW5ncykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGhvc3RcbiAgICAgICAgJCgnI01haWxTTVRQSG9zdCcpLnZhbChzZXR0aW5ncy5ob3N0KTtcblxuICAgICAgICAvLyBVcGRhdGUgcG9ydFxuICAgICAgICAkKCcjTWFpbFNNVFBQb3J0JykudmFsKHNldHRpbmdzLnBvcnQpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBlbmNyeXB0aW9uIHR5cGVcbiAgICAgICAgJCgnI01haWxTTVRQVXNlVExTJykudmFsKHNldHRpbmdzLmVuY3J5cHRpb24pO1xuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2V0dGluZ3MuZW5jcnlwdGlvbik7XG5cbiAgICAgICAgLy8gVXBkYXRlIGNlcnRpZmljYXRlIGNoZWNrXG4gICAgICAgIGlmIChzZXR0aW5ncy5jZXJ0Q2hlY2spIHtcbiAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwb3J0IGJhc2VkIG9uIHNlbGVjdGVkIGVuY3J5cHRpb24gdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBlbmNyeXB0aW9uVHlwZSAtIFNlbGVjdGVkIGVuY3J5cHRpb24gdHlwZSAobm9uZS90bHMvc3NsKVxuICAgICAqL1xuICAgIHVwZGF0ZVBvcnRCYXNlZE9uRW5jcnlwdGlvbihlbmNyeXB0aW9uVHlwZSkge1xuICAgICAgICBjb25zdCAkcG9ydEZpZWxkID0gJCgnI01haWxTTVRQUG9ydCcpO1xuXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHRoZSB1c2VyIGhhc24ndCBtYW51YWxseSBjaGFuZ2VkIHRoZSBwb3J0XG4gICAgICAgIGNvbnN0IGN1cnJlbnRQb3J0ID0gJHBvcnRGaWVsZC52YWwoKTtcbiAgICAgICAgY29uc3Qgc3RhbmRhcmRQb3J0cyA9IFsnMjUnLCAnNTg3JywgJzQ2NScsICcnXTtcblxuICAgICAgICBpZiAoc3RhbmRhcmRQb3J0cy5pbmNsdWRlcyhjdXJyZW50UG9ydCkpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoZW5jcnlwdGlvblR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgICAgICAgICAgJHBvcnRGaWVsZC52YWwoJzI1Jyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Rscyc6XG4gICAgICAgICAgICAgICAgICAgICRwb3J0RmllbGQudmFsKCc1ODcnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnc3NsJzpcbiAgICAgICAgICAgICAgICAgICAgJHBvcnRGaWVsZC52YWwoJzQ2NScpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cvaGlkZSBjZXJ0aWZpY2F0ZSBjaGVjayBiYXNlZCBvbiBlbmNyeXB0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgJGNlcnRDaGVja0ZpZWxkID0gJCgnI2NlcnQtY2hlY2stZmllbGQnKTtcbiAgICAgICAgaWYgKGVuY3J5cHRpb25UeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIC8vIEhpZGUgY2VydGlmaWNhdGUgY2hlY2sgZm9yIHVuZW5jcnlwdGVkIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAkY2VydENoZWNrRmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgLy8gVW5jaGVjayB0aGUgY2VydGlmaWNhdGUgY2hlY2sgd2hlbiBoaWRpbmdcbiAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGNlcnRpZmljYXRlIGNoZWNrIGZvciBUTFMvU1NMIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAkY2VydENoZWNrRmllbGQuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgcHJvdmlkZXIgaGludCBtZXNzYWdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBIaW50IG1lc3NhZ2VcbiAgICAgKi9cbiAgICBzaG93UHJvdmlkZXJIaW50KG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgJGhpbnQgPSAkKCcjcHJvdmlkZXItaGludCcpO1xuICAgICAgICBpZiAoJGhpbnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkKCcjTWFpbFNNVFBVc2VybmFtZScpLmFmdGVyKGA8ZGl2IGlkPVwicHJvdmlkZXItaGludFwiIGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlXCI+JHttZXNzYWdlfTwvZGl2PmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGhpbnQudGV4dChtZXNzYWdlKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIE9BdXRoMiBjYWxsYmFjayBwYXJhbWV0ZXJzIGZyb20gVVJMXG4gICAgICovXG4gICAgaGFuZGxlT0F1dGgyQ2FsbGJhY2soKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIHN1Y2Nlc3NcbiAgICAgICAgaWYgKHVybFBhcmFtcy5oYXMoJ29hdXRoX3N1Y2Nlc3MnKSkge1xuICAgICAgICAgICAgLy8gUmVsb2FkIHNldHRpbmdzIHRvIHNob3cgdXBkYXRlZCBPQXV0aDIgc3RhdHVzXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MubG9hZFNldHRpbmdzRnJvbUFQSSgpO1xuICAgICAgICAgICAgLy8gQ2xlYW4gVVJMXG4gICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIGRvY3VtZW50LnRpdGxlLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGVycm9yXG4gICAgICAgIGlmICh1cmxQYXJhbXMuaGFzKCdvYXV0aF9lcnJvcicpKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvciA9IHVybFBhcmFtcy5nZXQoJ29hdXRoX2Vycm9yJyk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoXG4gICAgICAgICAgICAgICAgKGdsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJBdXRob3JpemF0aW9uRmFpbGVkIHx8ICfQntGI0LjQsdC60LAgT0F1dGgyINCw0LLRgtC+0YDQuNC30LDRhtC40Lg6ICcpICsgZGVjb2RlVVJJQ29tcG9uZW50KGVycm9yKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIENsZWFuIFVSTFxuICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCBkb2N1bWVudC50aXRsZSwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydCBPQXV0aDIgYXV0aG9yaXphdGlvbiBmbG93XG4gICAgICovXG4gICAgc3RhcnRPQXV0aDJGbG93KCkge1xuICAgICAgICBjb25zdCBwcm92aWRlciA9ICQoJyNNYWlsT0F1dGgyUHJvdmlkZXInKS52YWwoKSB8fCAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGlmICghcHJvdmlkZXIgfHwgcHJvdmlkZXIgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlT0F1dGgyUHJvdmlkZXJFbXB0eSB8fCAn0JLRi9Cx0LXRgNC40YLQtSBPQXV0aDIg0L/RgNC+0LLQsNC50LTQtdGA0LAnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIENsaWVudCBJRCBhbmQgU2VjcmV0IGFyZSBjb25maWd1cmVkXG4gICAgICAgIGNvbnN0IGNsaWVudElkID0gJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLnZhbCgpO1xuICAgICAgICBjb25zdCBjbGllbnRTZWNyZXQgPSAkKCcjTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpLnZhbCgpO1xuXG4gICAgICAgIGlmICghY2xpZW50SWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVPQXV0aDJDbGllbnRJZEVtcHR5IHx8ICfQktCy0LXQtNC40YLQtSBDbGllbnQgSUQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY2xpZW50U2VjcmV0KSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50U2VjcmV0RW1wdHkgfHwgJ9CS0LLQtdC00LjRgtC1IENsaWVudCBTZWNyZXQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzIGJlZm9yZSBzdGFydGluZyB0aGUgZmxvd1xuICAgICAgICBtYWlsU2V0dGluZ3Muc2F2ZU9BdXRoMkNyZWRlbnRpYWxzKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlIE9BdXRoMiBjcmVkZW50aWFscyBhbmQgdGhlbiBzdGFydCBhdXRob3JpemF0aW9uIGZsb3dcbiAgICAgKi9cbiAgICBzYXZlT0F1dGgyQ3JlZGVudGlhbHMocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgIE1haWxPQXV0aDJQcm92aWRlcjogcHJvdmlkZXIsXG4gICAgICAgICAgICBNYWlsT0F1dGgyQ2xpZW50SWQ6IGNsaWVudElkLFxuICAgICAgICAgICAgTWFpbE9BdXRoMkNsaWVudFNlY3JldDogY2xpZW50U2VjcmV0XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXNlIE1haWxTZXR0aW5nc0FQSSBmb3IgY29uc2lzdGVudCBlcnJvciBoYW5kbGluZ1xuICAgICAgICBNYWlsU2V0dGluZ3NBUEkucGF0Y2hTZXR0aW5ncyhkYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVkZW50aWFscyBzYXZlZCwgbm93IGdldCBPQXV0aDIgVVJMXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnByb2NlZWRXaXRoT0F1dGgyRmxvdyhwcm92aWRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNYWlsU2V0dGluZ3NdIEZhaWxlZCB0byBzYXZlIE9BdXRoMiBjcmVkZW50aWFsczonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgPyByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpXG4gICAgICAgICAgICAgICAgICAgIDogJ0ZhaWxlZCB0byBzYXZlIE9BdXRoMiBjcmVkZW50aWFscyc7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IE9BdXRoMiBhdXRob3JpemF0aW9uIFVSTCBhbmQgb3BlbiBhdXRob3JpemF0aW9uIHdpbmRvd1xuICAgICAqL1xuICAgIHJlcXVlc3RPQXV0aDJBdXRoVXJsKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0KSB7XG4gICAgICAgIC8vIFJlcXVlc3QgYXV0aG9yaXphdGlvbiBVUkwgZnJvbSBBUElcbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLmF1dGhvcml6ZU9BdXRoMihwcm92aWRlciwgY2xpZW50SWQsIGNsaWVudFNlY3JldCwgKGF1dGhVcmwpID0+IHtcblxuICAgICAgICAgICAgaWYgKGF1dGhVcmwpIHtcbiAgICAgICAgICAgICAgICAvLyBPcGVuIGF1dGhvcml6YXRpb24gd2luZG93XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSA2MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gNzAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSAoc2NyZWVuLndpZHRoIC8gMikgLSAod2lkdGggLyAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSAoc2NyZWVuLmhlaWdodCAvIDIpIC0gKGhlaWdodCAvIDIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYXV0aFdpbmRvdyA9IHdpbmRvdy5vcGVuKFxuICAgICAgICAgICAgICAgICAgICBhdXRoVXJsLFxuICAgICAgICAgICAgICAgICAgICAnb2F1dGgyLWF1dGgnLFxuICAgICAgICAgICAgICAgICAgICBgd2lkdGg9JHt3aWR0aH0saGVpZ2h0PSR7aGVpZ2h0fSxsZWZ0PSR7bGVmdH0sdG9wPSR7dG9wfWBcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFhdXRoV2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignUGxlYXNlIGFsbG93IHBvcHVwcyBmb3IgT0F1dGgyIGF1dGhvcml6YXRpb24nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyQXV0aG9yaXphdGlvbkZhaWxlZCB8fCAn0J7RiNC40LHQutCwINCw0LLRgtC+0YDQuNC30LDRhtC40LggT0F1dGgyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcm9jZWVkIHdpdGggT0F1dGgyIGZsb3cgYWZ0ZXIgY3JlZGVudGlhbHMgYXJlIHNhdmVkXG4gICAgICovXG4gICAgcHJvY2VlZFdpdGhPQXV0aDJGbG93KHByb3ZpZGVyKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEdldCBPQXV0aDIgVVJMIHdpdGggc2F2ZWQgY3JlZGVudGlhbHNcbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLmdldE9BdXRoMlVybChwcm92aWRlciwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuYXV0aF91cmwpIHtcblxuICAgICAgICAgICAgICAgIC8vIE9wZW4gT0F1dGgyIHdpbmRvd1xuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gNjAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IDcwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBsZWZ0ID0gKHNjcmVlbi53aWR0aCAvIDIpIC0gKHdpZHRoIC8gMik7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9wID0gKHNjcmVlbi5oZWlnaHQgLyAyKSAtIChoZWlnaHQgLyAyKTtcblxuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cgPSB3aW5kb3cub3BlbihcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuYXV0aF91cmwsXG4gICAgICAgICAgICAgICAgICAgICdPQXV0aDJBdXRob3JpemF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgYHdpZHRoPSR7d2lkdGh9LGhlaWdodD0ke2hlaWdodH0sbGVmdD0ke2xlZnR9LHRvcD0ke3RvcH1gXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHdpbmRvdyB3YXMgYmxvY2tlZFxuICAgICAgICAgICAgICAgIGlmICghbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ1BsZWFzZSBhbGxvdyBwb3B1cHMgZm9yIE9BdXRoMiBhdXRob3JpemF0aW9uJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTWFpbFNldHRpbmdzXSBObyBhdXRoX3VybCBpbiByZXNwb25zZTonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdGYWlsZWQgdG8gZ2V0IE9BdXRoMiBhdXRob3JpemF0aW9uIFVSTCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIE9BdXRoMiBjYWxsYmFjayBtZXNzYWdlXG4gICAgICogQHBhcmFtIHtNZXNzYWdlRXZlbnR9IGV2ZW50IC0gTWVzc2FnZSBldmVudFxuICAgICAqL1xuICAgIGhhbmRsZU9BdXRoMk1lc3NhZ2UoZXZlbnQpIHtcbiAgICAgICAgLy8gVmFsaWRhdGUgb3JpZ2luXG4gICAgICAgIGlmIChldmVudC5vcmlnaW4gIT09IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGZvciBPQXV0aDIgY2FsbGJhY2sgZGF0YVxuICAgICAgICBpZiAoZXZlbnQuZGF0YSAmJiBldmVudC5kYXRhLnR5cGUgPT09ICdvYXV0aDItY2FsbGJhY2snKSB7XG4gICAgICAgICAgICAvLyBDbG9zZSBPQXV0aDIgd2luZG93XG4gICAgICAgICAgICBpZiAobWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdykge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93ID0gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUHJvY2VzcyBjYWxsYmFja1xuICAgICAgICAgICAgTWFpbFNldHRpbmdzQVBJLmhhbmRsZU9BdXRoMkNhbGxiYWNrKGV2ZW50LmRhdGEucGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbignT0F1dGgyIGF1dGhvcml6YXRpb24gc3VjY2Vzc2Z1bCcpO1xuICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuY2hlY2tPQXV0aDJTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ09BdXRoMiBhdXRob3JpemF0aW9uIGZhaWxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBPQXV0aDIgc3RhdHVzIGRpc3BsYXkgdXNpbmcgcHJvdmlkZWQgc2V0dGluZ3MgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGEgY29udGFpbmluZyBvYXV0aDJfc3RhdHVzXG4gICAgICovXG4gICAgdXBkYXRlT0F1dGgyU3RhdHVzKHNldHRpbmdzKSB7XG4gICAgICAgIGlmIChzZXR0aW5ncyAmJiBzZXR0aW5ncy5vYXV0aDJfc3RhdHVzKSB7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBzZXR0aW5ncy5vYXV0aDJfc3RhdHVzO1xuICAgICAgICAgICAgY29uc3QgJHN0YXR1c0RpdiA9ICQoJyNvYXV0aDItc3RhdHVzJyk7XG4gICAgICAgICAgICBjb25zdCAkY2xpZW50SWRGaWVsZCA9ICQoJyNNYWlsT0F1dGgyQ2xpZW50SWQnKS5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0ICRjbGllbnRTZWNyZXRGaWVsZCA9ICQoJyNNYWlsT0F1dGgyQ2xpZW50U2VjcmV0JykuY2xvc2VzdCgnLmZpZWxkJyk7XG5cbiAgICAgICAgICAgIGlmIChzdGF0dXMuY29uZmlndXJlZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyTmFtZSA9IE1haWxTZXR0aW5nc0FQSS5nZXRQcm92aWRlck5hbWUoc3RhdHVzLnByb3ZpZGVyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb25uZWN0ZWRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMkNvbm5lY3RlZFRvLnJlcGxhY2UoJ3twcm92aWRlcn0nLCBwcm92aWRlck5hbWUpO1xuXG4gICAgICAgICAgICAgICAgLy8gRG9uJ3QgYWRkIGV4dHJhIHN0YXR1cyB0ZXh0IC0gXCJDb25uZWN0ZWRcIiBhbHJlYWR5IGltcGxpZXMgYXV0aG9yaXplZFxuICAgICAgICAgICAgICAgICRzdGF0dXNEaXYuaHRtbChgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBwb3NpdGl2ZSBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNoZWNrIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtjb25uZWN0ZWRUZXh0fVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJCgnI29hdXRoMi1kaXNjb25uZWN0Jykuc2hvdygpO1xuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBDbGllbnQgSUQgYW5kIENsaWVudCBTZWNyZXQgZmllbGRzIHdoZW4gYXV0aG9yaXplZFxuICAgICAgICAgICAgICAgIGlmIChzdGF0dXMuYXV0aG9yaXplZCkge1xuICAgICAgICAgICAgICAgICAgICAkY2xpZW50SWRGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRTZWNyZXRGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGNsaWVudElkRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkY2xpZW50U2VjcmV0RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXR1c0Rpdi5odG1sKGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyTm90Q29uZmlndXJlZH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgJCgnI29hdXRoMi1jb25uZWN0Jykuc2hvdygpO1xuICAgICAgICAgICAgICAgICQoJyNvYXV0aDItZGlzY29ubmVjdCcpLmhpZGUoKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgQ2xpZW50IElEIGFuZCBDbGllbnQgU2VjcmV0IGZpZWxkcyB3aGVuIG5vdCBhdXRob3JpemVkXG4gICAgICAgICAgICAgICAgJGNsaWVudElkRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjbGllbnRTZWNyZXRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgT0F1dGgyIGNvbm5lY3Rpb24gc3RhdHVzIChtYWtlcyBBUEkgY2FsbClcbiAgICAgKi9cbiAgICBjaGVja09BdXRoMlN0YXR1cygpIHtcbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLmdldFNldHRpbmdzKChzZXR0aW5ncykgPT4ge1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZU9BdXRoMlN0YXR1cyhzZXR0aW5ncyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNjb25uZWN0IE9BdXRoMlxuICAgICAqL1xuICAgIGRpc2Nvbm5lY3RPQXV0aDIoKSB7XG4gICAgICAgIC8vIENsZWFyIE9BdXRoMiB0b2tlbnMgaW1tZWRpYXRlbHkgd2l0aG91dCBjb25maXJtYXRpb25cbiAgICAgICAgY29uc3QgY2xlYXJEYXRhID0ge1xuICAgICAgICAgICAgTWFpbE9BdXRoMlJlZnJlc2hUb2tlbjogJycsXG4gICAgICAgICAgICBNYWlsT0F1dGgyQWNjZXNzVG9rZW46ICcnLFxuICAgICAgICAgICAgTWFpbE9BdXRoMlRva2VuRXhwaXJlczogJydcbiAgICAgICAgfTtcblxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkucGF0Y2hTZXR0aW5ncyhjbGVhckRhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIEp1c3QgdXBkYXRlIHRoZSBzdGF0dXMgd2l0aG91dCBzaG93aW5nIGEgbWVzc2FnZVxuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5jaGVja09BdXRoMlN0YXR1cygpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIENsaWVudCBJRCBhbmQgQ2xpZW50IFNlY3JldCBmaWVsZHMgYWdhaW5cbiAgICAgICAgICAgICAgICAkKCcjTWFpbE9BdXRoMkNsaWVudElkJykuY2xvc2VzdCgnLmZpZWxkJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50U2VjcmV0JykuY2xvc2VzdCgnLmZpZWxkJykuc2hvdygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ0ZhaWxlZCB0byBkaXNjb25uZWN0IE9BdXRoMicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGVzdCBTTVRQIGNvbm5lY3Rpb25cbiAgICAgKi9cbiAgICB0ZXN0Q29ubmVjdGlvbigpIHtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJyN0ZXN0LWNvbm5lY3Rpb24tYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRyZXN1bHRBcmVhID0gJCgnI3Rlc3QtY29ubmVjdGlvbi1yZXN1bHQnKTtcblxuICAgICAgICAvLyBDbGVhciBwcmV2aW91cyByZXN1bHRcbiAgICAgICAgJHJlc3VsdEFyZWEucmVtb3ZlKCk7XG5cbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS50ZXN0Q29ubmVjdGlvbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHJlc3VsdCBhcmVhIG5leHQgdG8gYnV0dG9uXG4gICAgICAgICAgICBsZXQgJHJlc3VsdCA9ICQoJzxkaXYgaWQ9XCJ0ZXN0LWNvbm5lY3Rpb24tcmVzdWx0XCIgY2xhc3M9XCJ1aSBzbWFsbCBtZXNzYWdlXCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAkYnV0dG9uLnBhcmVudCgpLmFwcGVuZCgkcmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICRyZXN1bHQuYWRkQ2xhc3MoJ3Bvc2l0aXZlJykuaHRtbCgnPGkgY2xhc3M9XCJjaGVjayBjaXJjbGUgaWNvblwiPjwvaT4gJyArIChyZXNwb25zZS5tZXNzYWdlcz8uc3VjY2Vzcz8uWzBdIHx8ICdDb25uZWN0aW9uIHN1Y2Nlc3NmdWwnKSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGRpYWdub3N0aWNzIGluZm8gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGE/LmRpYWdub3N0aWNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpYWcgPSByZXNwb25zZS5kYXRhLmRpYWdub3N0aWNzO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGV0YWlscyA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjxzbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGBBdXRoOiAke2RpYWcuYXV0aF90eXBlfSwgU2VydmVyOiAke2RpYWcuc210cF9ob3N0fToke2RpYWcuc210cF9wb3J0fSwgRW5jcnlwdGlvbjogJHtkaWFnLnNtdHBfZW5jcnlwdGlvbn1gO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlhZy5hdXRoX3R5cGUgPT09ICdvYXV0aDInICYmIGRpYWcub2F1dGgyX3Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGA8YnI+T0F1dGgyOiAke2RpYWcub2F1dGgyX3Byb3ZpZGVyfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEb24ndCBzaG93IGV4cGlyZWQgdG9rZW4gd2FybmluZyBpZiBjb25uZWN0aW9uIGlzIHN1Y2Nlc3NmdWxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzIGl0IG1lYW5zIHJlZnJlc2ggdG9rZW4gaXMgd29ya2luZyBjb3JyZWN0bHlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkaWFnLm9hdXRoMl9yZWZyZXNoX3Rva2VuX2V4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCAtICR7Z2xvYmFsVHJhbnNsYXRlLm1zX0RpYWdub3N0aWNBdXRob3JpemVkfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSAnPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgc2ltcGxlLCB1c2VyLWZyaWVuZGx5IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBsZXQgbWFpbk1lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY0Nvbm5lY3Rpb25GYWlsZWQ7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgZGV0YWlsZWQgZXJyb3IgYW5hbHlzaXMgaWYgYXZhaWxhYmxlIGZvciBiZXR0ZXIgdXNlciBleHBlcmllbmNlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5lcnJvcl9kZXRhaWxzPy5wcm9iYWJsZV9jYXVzZSkge1xuICAgICAgICAgICAgICAgICAgICBtYWluTWVzc2FnZSA9IHJlc3BvbnNlLmRhdGEuZXJyb3JfZGV0YWlscy5wcm9iYWJsZV9jYXVzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkcmVzdWx0LmFkZENsYXNzKCduZWdhdGl2ZScpLmh0bWwoJzxpIGNsYXNzPVwidGltZXMgY2lyY2xlIGljb25cIj48L2k+ICcgKyBtYWluTWVzc2FnZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTa2lwIHNob3dpbmcgZXJyb3IgdHlwZSBsYWJlbCAtIGl0J3MgdG9vIHRlY2huaWNhbCBmb3IgbW9zdCB1c2Vyc1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyByYXcgUEhQTWFpbGVyIGVycm9yIGluIGEgY29sbGFwc2libGUgc2VjdGlvbiBvbmx5IGlmIGl0J3Mgc2lnbmlmaWNhbnRseSBkaWZmZXJlbnRcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmVycm9yX2RldGFpbHM/LnJhd19lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByYXdFcnJvciA9IHJlc3BvbnNlLmRhdGEuZXJyb3JfZGV0YWlscy5yYXdfZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgc2hvdyB0ZWNobmljYWwgZGV0YWlscyBpZiB0aGV5IGNvbnRhaW4gbW9yZSBpbmZvIHRoYW4gdGhlIHVzZXIgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmF3RXJyb3IubGVuZ3RoID4gbWFpbk1lc3NhZ2UubGVuZ3RoICsgNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzSHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBhY2NvcmRpb25cIiBzdHlsZT1cIm1hcmdpbi10b3A6IDEwcHg7XCI+JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8ZGl2IGNsYXNzPVwidGl0bGVcIj48aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY1RlY2huaWNhbERldGFpbHN9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9IGA8ZGl2IGNsYXNzPVwiY29udGVudFwiPjxjb2RlIHN0eWxlPVwiZm9udC1zaXplOiAxMXB4OyB3b3JkLWJyZWFrOiBicmVhay1hbGw7IGRpc3BsYXk6IGJsb2NrOyB3aGl0ZS1zcGFjZTogcHJlLXdyYXA7XCI+JHtyYXdFcnJvcn08L2NvZGU+PC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlsc0h0bWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGFjY29yZGlvbiBmb3IgdGVjaG5pY2FsIGRldGFpbHNcbiAgICAgICAgICAgICAgICAgICAgICAgICRyZXN1bHQuZmluZCgnLmFjY29yZGlvbicpLmFjY29yZGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBtaW5pbWFsIGRpYWdub3N0aWNzIGluZm8gZm9yIGZhaWxlZCBjb25uZWN0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uZGlhZ25vc3RpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlhZyA9IHJlc3BvbnNlLmRhdGEuZGlhZ25vc3RpY3M7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHNtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCR7ZGlhZy5hdXRoX3R5cGUudG9VcHBlckNhc2UoKX06ICR7ZGlhZy5zbXRwX2hvc3R9OiR7ZGlhZy5zbXRwX3BvcnR9YDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcuc210cF9lbmNyeXB0aW9uICYmIGRpYWcuc210cF9lbmNyeXB0aW9uICE9PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCAoJHtkaWFnLnNtdHBfZW5jcnlwdGlvbi50b1VwcGVyQ2FzZSgpfSlgO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gJzwvc21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlscyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBoaW50cyBpZiBhdmFpbGFibGUgLSBsaW1pdCB0byB0b3AgMyBtb3N0IHJlbGV2YW50IG9uZXNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmhpbnRzICYmIHJlc3BvbnNlLmRhdGEuaGludHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgaGludHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c3Ryb25nPtCg0LXQutC+0LzQtdC90LTQsNGG0LjQuDo8L3N0cm9uZz48dWw+JztcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBtYXggMyBoaW50cyB0byBhdm9pZCBvdmVyd2hlbG1pbmcgdGhlIHVzZXJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsZXZhbnRIaW50cyA9IHJlc3BvbnNlLmRhdGEuaGludHMuc2xpY2UoMCwgMyk7XG4gICAgICAgICAgICAgICAgICAgIHJlbGV2YW50SGludHMuZm9yRWFjaChoaW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgRW5nbGlzaCBoaW50cyBpZiB3ZSBoYXZlIFJ1c3NpYW4gb25lc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhpbnQuaW5jbHVkZXMoJ09BdXRoMiBhY2Nlc3MgdG9rZW4gZXhwaXJlZCcpICYmIHJlbGV2YW50SGludHMuc29tZShoID0+IGguaW5jbHVkZXMoJ9GC0L7QutC10L0nKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBoaW50cyArPSBgPGxpPiR7aGludH08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBoaW50cyArPSAnPC91bD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChoaW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMzAgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5mYWRlT3V0KDQwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAzMDAwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIHRlc3QgZW1haWxcbiAgICAgKi9cbiAgICBzZW5kVGVzdEVtYWlsKCkge1xuICAgICAgICBjb25zdCByZWNpcGllbnQgPSAkKCcjU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJykudmFsKCk7XG5cbiAgICAgICAgaWYgKCFyZWNpcGllbnQpIHtcbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbmV4dCB0byBidXR0b25cbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjc2VuZC10ZXN0LWVtYWlsLWJ1dHRvbicpO1xuICAgICAgICAgICAgbGV0ICRyZXN1bHQgPSAkKCc8ZGl2IGlkPVwic2VuZC10ZXN0LXJlc3VsdFwiIGNsYXNzPVwidWkgc21hbGwgbmVnYXRpdmUgbWVzc2FnZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgJHJlc3VsdC5odG1sKCc8aSBjbGFzcz1cInRpbWVzIGNpcmNsZSBpY29uXCI+PC9pPiBQbGVhc2UgZW50ZXIgYSByZWNpcGllbnQgZW1haWwgYWRkcmVzcycpO1xuICAgICAgICAgICAgJCgnI3NlbmQtdGVzdC1yZXN1bHQnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICRidXR0b24ucGFyZW50KCkuYXBwZW5kKCRyZXN1bHQpO1xuXG4gICAgICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMTAgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5mYWRlT3V0KDQwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAxMDAwMCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHJlc3VsdEFyZWEgPSAkKCcjc2VuZC10ZXN0LXJlc3VsdCcpO1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHJlc3VsdFxuICAgICAgICAkcmVzdWx0QXJlYS5yZW1vdmUoKTtcblxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgIHRvOiByZWNpcGllbnRcbiAgICAgICAgICAgIC8vIExldCB0aGUgc2VydmVyIGdlbmVyYXRlIGVuaGFuY2VkIGVtYWlsIGNvbnRlbnQgd2l0aCBzeXN0ZW0gaW5mb1xuICAgICAgICB9O1xuXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5zZW5kVGVzdEVtYWlsKGRhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgcmVzdWx0IGFyZWEgbmV4dCB0byBidXR0b25cbiAgICAgICAgICAgIGxldCAkcmVzdWx0ID0gJCgnPGRpdiBpZD1cInNlbmQtdGVzdC1yZXN1bHRcIiBjbGFzcz1cInVpIHNtYWxsIG1lc3NhZ2VcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRidXR0b24ucGFyZW50KCkuYXBwZW5kKCRyZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSBhY3R1YWwgcmVjaXBpZW50IGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWxSZWNpcGllbnQgPSByZXNwb25zZS5kYXRhPy50byB8fCByZWNpcGllbnQ7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgdGhlIG1lc3NhZ2UgZnJvbSBBUEkgd2hpY2ggYWxyZWFkeSBpbmNsdWRlcyB0aGUgZW1haWwgYWRkcmVzc1xuICAgICAgICAgICAgICAgIGxldCBzdWNjZXNzTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzPy5zdWNjZXNzPy5bMF0gfHwgJ1Rlc3QgZW1haWwgc2VudCc7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiBtZXNzYWdlIGRvZXNuJ3QgaW5jbHVkZSBlbWFpbCBidXQgd2UgaGF2ZSBpdCwgYWRkIGl0XG4gICAgICAgICAgICAgICAgaWYgKCFzdWNjZXNzTWVzc2FnZS5pbmNsdWRlcygnQCcpICYmIGFjdHVhbFJlY2lwaWVudCkge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzTWVzc2FnZSA9IHN1Y2Nlc3NNZXNzYWdlLnJlcGxhY2UoJ9Cf0LjRgdGM0LzQviDQvtGC0L/RgNCw0LLQu9C10L3QvicsIGDQn9C40YHRjNC80L4g0L7RgtC/0YDQsNCy0LvQtdC90L4g4oaSICR7YWN0dWFsUmVjaXBpZW50fWApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICRyZXN1bHQuYWRkQ2xhc3MoJ3Bvc2l0aXZlJykuaHRtbChcbiAgICAgICAgICAgICAgICAgICAgJzxpIGNsYXNzPVwiY2hlY2sgY2lyY2xlIGljb25cIj48L2k+ICcgKyBzdWNjZXNzTWVzc2FnZVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGRpYWdub3N0aWNzIGluZm8gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGE/LmRpYWdub3N0aWNzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpYWcgPSByZXNwb25zZS5kYXRhLmRpYWdub3N0aWNzO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGV0YWlscyA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjxzbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlhZy5hdXRoX3R5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlciA9IGRpYWcub2F1dGgyX3Byb3ZpZGVyIHx8ICdPQXV0aDInO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgVXNpbmc6IE9BdXRoMmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIgJiYgcHJvdmlkZXIgIT09ICdPQXV0aDInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgICgke3Byb3ZpZGVyfSlgO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgVXNpbmc6IFBhc3N3b3JkIGF1dGhlbnRpY2F0aW9uYDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGAsIFNlcnZlcjogJHtkaWFnLnNtdHBfaG9zdH06JHtkaWFnLnNtdHBfcG9ydH1gO1xuICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9ICc8L3NtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGRldGFpbHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHJlc3BvbnNlPy5tZXNzYWdlcz8uZXJyb3I/LmpvaW4oJywgJykgfHwgZ2xvYmFsVHJhbnNsYXRlLm1zX0RpYWdub3N0aWNDb25uZWN0aW9uRmFpbGVkO1xuICAgICAgICAgICAgICAgICRyZXN1bHQuYWRkQ2xhc3MoJ25lZ2F0aXZlJykuaHRtbCgnPGkgY2xhc3M9XCJ0aW1lcyBjaXJjbGUgaWNvblwiPjwvaT4gJyArIG1lc3NhZ2UpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBkZXRhaWxlZCBlcnJvciBhbmFseXNpcyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmVycm9yX2RldGFpbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JEZXRhaWxzID0gcmVzcG9uc2UuZGF0YS5lcnJvcl9kZXRhaWxzO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGV0YWlsc0h0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj4nO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNraXAgc2hvd2luZyBlcnJvciB0eXBlIGxhYmVsIC0gaXQncyB0b28gdGVjaG5pY2FsIGZvciBtb3N0IHVzZXJzXG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yRGV0YWlscy5wcm9iYWJsZV9jYXVzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsc0h0bWwgKz0gYDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUubXNfRGlhZ25vc3RpY1Byb2JhYmxlQ2F1c2V9PC9zdHJvbmc+ICR7ZXJyb3JEZXRhaWxzLnByb2JhYmxlX2NhdXNlfTxicj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyByYXcgUEhQTWFpbGVyIGVycm9yIGluIGEgY29sbGFwc2libGUgc2VjdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3JEZXRhaWxzLnJhd19lcnJvciAmJiBlcnJvckRldGFpbHMucmF3X2Vycm9yICE9PSBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHRpbnkgYWNjb3JkaW9uXCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAxMHB4O1wiPic7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSBgPGRpdiBjbGFzcz1cInRpdGxlXCI+PGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLm1zX0RpYWdub3N0aWNUZWNobmljYWxEZXRhaWxzfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzSHRtbCArPSBgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj48Y29kZSBzdHlsZT1cImZvbnQtc2l6ZTogMTFweDsgd29yZC1icmVhazogYnJlYWstYWxsO1wiPiR7ZXJyb3JEZXRhaWxzLnJhd19lcnJvcn08L2NvZGU+PC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHNIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlsc0h0bWwpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgYWNjb3JkaW9uIGZvciB0ZWNobmljYWwgZGV0YWlsc1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmZpbmQoJy5hY2NvcmRpb24nKS5hY2NvcmRpb24oKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGhpbnRzIGlmIGF2YWlsYWJsZSAtIGxpbWl0IHRvIHRvcCAzIG1vc3QgcmVsZXZhbnQgb25lc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uaGludHMgJiYgcmVzcG9uc2UuZGF0YS5oaW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBoaW50cyA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjxzdHJvbmc+0KDQtdC60L7QvNC10L3QtNCw0YbQuNC4Ojwvc3Ryb25nPjx1bD4nO1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG1heCAzIGhpbnRzIHRvIGF2b2lkIG92ZXJ3aGVsbWluZyB0aGUgdXNlclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWxldmFudEhpbnRzID0gcmVzcG9uc2UuZGF0YS5oaW50cy5zbGljZSgwLCAzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVsZXZhbnRIaW50cy5mb3JFYWNoKGhpbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBFbmdsaXNoIGhpbnRzIGlmIHdlIGhhdmUgUnVzc2lhbiBvbmVzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGludC5pbmNsdWRlcygnT0F1dGgyIGFjY2VzcyB0b2tlbiBleHBpcmVkJykgJiYgcmVsZXZhbnRIaW50cy5zb21lKGggPT4gaC5pbmNsdWRlcygn0YLQvtC60LXQvScpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGhpbnRzICs9IGA8bGk+JHtoaW50fTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGhpbnRzICs9ICc8L3VsPic7XG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGhpbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEF1dG8taGlkZSBhZnRlciAzMCBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmZhZGVPdXQoNDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIDMwMDAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBHZXQgdW5tYXNrZWQgdmFsdWVzIGZvciBlbWFpbCBmaWVsZHMgRklSU1RcbiAgICAgICAgY29uc3QgZW1haWxGaWVsZHMgPSBbXG4gICAgICAgICAgICAnTWFpbFNNVFBTZW5kZXJBZGRyZXNzJyxcbiAgICAgICAgICAgICdTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnLFxuICAgICAgICAgICAgJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJyxcbiAgICAgICAgICAgICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnXG4gICAgICAgIF07XG5cbiAgICAgICAgZW1haWxGaWVsZHMuZm9yRWFjaChmaWVsZElkID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBsZXQgb3JpZ2luYWxWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnJztcbiAgICAgICAgICAgICAgICBsZXQgZmllbGRWYWx1ZSA9IG9yaWdpbmFsVmFsdWU7XG5cbiAgICAgICAgICAgICAgICAvLyBGb3IgZW1haWwgaW5wdXRtYXNrLCB0cnkgZGlmZmVyZW50IGFwcHJvYWNoZXMgdG8gZ2V0IGNsZWFuIHZhbHVlXG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdmFsdWUgY29udGFpbnMgcGxhY2Vob2xkZXIgcGF0dGVybnNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkVmFsdWUuaW5jbHVkZXMoJ19AXycpIHx8IGZpZWxkVmFsdWUgPT09ICdALicgfHwgZmllbGRWYWx1ZSA9PT0gJ0AnIHx8IGZpZWxkVmFsdWUgPT09ICdfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmllbGRWYWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB1bm1hc2tlZCB2YWx1ZSBmb3IgZW1haWwgZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGlucHV0bWFzayBwbHVnaW4gaXMgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5pbnB1dG1hc2sgJiYgdHlwZW9mICRmaWVsZC5pbnB1dG1hc2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdW5tYXNrZWRWYWx1ZSA9ICRmaWVsZC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVubWFza2VkVmFsdWUgJiYgdW5tYXNrZWRWYWx1ZSAhPT0gZmllbGRWYWx1ZSAmJiAhdW5tYXNrZWRWYWx1ZS5pbmNsdWRlcygnXycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZFZhbHVlID0gdW5tYXNrZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFtNYWlsU2V0dGluZ3NdIEZhaWxlZCB0byBnZXQgdW5tYXNrZWQgdmFsdWUgZm9yICR7ZmllbGRJZH06YCwgZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbZmllbGRJZF0gPSBmaWVsZFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gTm8gc3VjY2VzcyBtZXNzYWdlIG5lZWRlZCAtIGZvcm0gc2F2ZXMgc2lsZW50bHlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSBmb3Igc2F2aW5nIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBtYWlsU2V0dGluZ3MuJGZvcm1PYmo7XG5cbiAgICAgICAgLy8gRW5hYmxlIFJFU1QgQVBJIG1vZGUgKG1vZGVybiBhcHByb2FjaCBsaWtlIEdlbmVyYWxTZXR0aW5ncylcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBNYWlsU2V0dGluZ3NBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdwYXRjaFNldHRpbmdzJztcblxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uIGZvciBjbGVhbmVyIEFQSSByZXF1ZXN0c1xuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcblxuICAgICAgICAvLyBFbmFibGUgc2VuZGluZyBvbmx5IGNoYW5nZWQgZmllbGRzIGZvciBvcHRpbWFsIFBBVENIIHNlbWFudGljc1xuICAgICAgICBGb3JtLnNlbmRPbmx5Q2hhbmdlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gTm8gcmVkaXJlY3QgYWZ0ZXIgc2F2ZSAtIHN0YXkgb24gdGhlIHNhbWUgcGFnZVxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gbnVsbDtcblxuICAgICAgICAvLyBVc2UgJyMnIGZvciBVUkwgd2hlbiB1c2luZyBhcGlTZXR0aW5nc1xuICAgICAgICBGb3JtLnVybCA9ICcjJztcblxuICAgICAgICAvLyBVc2UgZHluYW1pYyB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIGN1cnJlbnQgc3RhdGVcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFpbFNldHRpbmdzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFpbFNldHRpbmdzLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFpbFNldHRpbmdzLmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBFdmVudEJ1cyBPQXV0aDIgZXZlbnRzXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9PQXV0aDJFdmVudHMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBTdWJzY3JpYmUgdG8gT0F1dGgyIGF1dGhvcml6YXRpb24gZXZlbnRzXG4gICAgICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ29hdXRoMi1hdXRob3JpemF0aW9uJywgKGRhdGEpID0+IHtcblxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN1Y2Nlc3M6IHJlZnJlc2ggT0F1dGgyIHN0YXR1cyBhZnRlciBhIHNob3J0IGRlbGF5XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS5zdGF0dXMgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXJyb3I6IHNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMlByb2Nlc3NpbmdGYWlsZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICA0MDAwXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTW9uaXRvciBmb3JtIGNoYW5nZXMgdG8gY29udHJvbCB0ZXN0IGJ1dHRvbiBzdGF0ZXNcbiAgICAgKi9cbiAgICBtb25pdG9yRm9ybUNoYW5nZXMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxseSBidXR0b25zIHNob3VsZCBiZSBlbmFibGVkIChubyBjaGFuZ2VzIHlldClcbiAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gZm9ybSBjaGFuZ2UgZXZlbnRzIC0gY2hlY2sgcmVhbCBmb3JtIHN0YXRlXG4gICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5vbignY2hhbmdlLnRlc3RidXR0b25zJywgJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIEZvcm0ncyBidWlsdC1pbiBjaGFuZ2UgZGV0ZWN0aW9uXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBbHNvIG1vbml0b3IgRm9ybSdzIGRhdGFDaGFuZ2VkIGV2ZW50c1xuICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmoub24oJ2Zvcm0uZGF0YUNoYW5nZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXNldCBzdGF0ZSBhZnRlciBzdWNjZXNzZnVsIHNhdmVcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxBZnRlclNlbmRGb3JtID0gbWFpbFNldHRpbmdzLmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmNiQWZ0ZXJTZW5kRm9ybSA9IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgb3JpZ2luYWxBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgLy8gQWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlLCBidXR0b25zIHNob3VsZCBiZSBlbmFibGVkXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVUZXN0QnV0dG9uU3RhdGVzKCk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRlc3QgYnV0dG9uIHN0YXRlcyBiYXNlZCBvbiBmb3JtIGNoYW5nZXNcbiAgICAgKi9cbiAgICB1cGRhdGVUZXN0QnV0dG9uU3RhdGVzKCkge1xuICAgICAgICBjb25zdCAkdGVzdENvbm5lY3Rpb25CdG4gPSAkKCcjdGVzdC1jb25uZWN0aW9uLWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkc2VuZFRlc3RFbWFpbEJ0biA9ICQoJyNzZW5kLXRlc3QtZW1haWwtYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRzdWJtaXRCdG4gPSAkKCcjc3VibWl0YnV0dG9uJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9ybSBoYXMgdW5zYXZlZCBjaGFuZ2VzIHVzaW5nIEZvcm0ncyBidWlsdC1pbiBtZXRob2RcbiAgICAgICAgY29uc3QgaGFzQ2hhbmdlcyA9IHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmhhc0NoYW5nZXMgJiYgRm9ybS5oYXNDaGFuZ2VzKCk7XG5cbiAgICAgICAgaWYgKGhhc0NoYW5nZXMpIHtcbiAgICAgICAgICAgIC8vIEZvcm0gaGFzIGNoYW5nZXMgLSBkaXNhYmxlIHRlc3QgYnV0dG9ucyB3aXRoIHZpc3VhbCBmZWVkYmFja1xuICAgICAgICAgICAgJHRlc3RDb25uZWN0aW9uQnRuXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtdG9vbHRpcCcsIGdsb2JhbFRyYW5zbGF0ZS5tc19TYXZlQ2hhbmdlc0JlZm9yZVRlc3RpbmcpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtcG9zaXRpb24nLCAndG9wIGNlbnRlcicpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtaW52ZXJ0ZWQnLCAnJyk7XG5cbiAgICAgICAgICAgICRzZW5kVGVzdEVtYWlsQnRuXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtdG9vbHRpcCcsIGdsb2JhbFRyYW5zbGF0ZS5tc19TYXZlQ2hhbmdlc0JlZm9yZVRlc3RpbmcpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtcG9zaXRpb24nLCAndG9wIGNlbnRlcicpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtaW52ZXJ0ZWQnLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSBzYXZlIGJ1dHRvbiBpcyB2aXNpYmxlL2VuYWJsZWQgd2hlbiB0aGVyZSBhcmUgY2hhbmdlc1xuICAgICAgICAgICAgJHN1Ym1pdEJ0bi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBObyBjaGFuZ2VzIC0gZW5hYmxlIHRlc3QgYnV0dG9uc1xuICAgICAgICAgICAgJHRlc3RDb25uZWN0aW9uQnRuXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtdG9vbHRpcCcpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtcG9zaXRpb24nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLWludmVydGVkJyk7XG5cbiAgICAgICAgICAgICRzZW5kVGVzdEVtYWlsQnRuXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtdG9vbHRpcCcpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtcG9zaXRpb24nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLWludmVydGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIHRvb2x0aXBzIGZvciBidXR0b25zXG4gICAgICAgICQoJy51aS5idXR0b25bZGF0YS10b29sdGlwXScpLnBvcHVwKCk7XG4gICAgfSxcblxufTtcblxuLy8gSW5pdGlhbGl6ZSB3aGVuIERPTSBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplKCk7XG5cbiAgICAvLyBFbnN1cmUgY2xpY2sgcHJldmVudGlvbiBmb3IgdG9vbHRpcCBpY29ucyBpbiBjaGVja2JveGVzXG4gICAgLy8gVGhpcyBwcmV2ZW50cyBjaGVja2JveCB0b2dnbGUgd2hlbiBjbGlja2luZyBvbiB0b29sdGlwIGljb25cbiAgICAkKCcuZmllbGQtaW5mby1pY29uJykub2ZmKCdjbGljay50b29sdGlwLXByZXZlbnQnKS5vbignY2xpY2sudG9vbHRpcC1wcmV2ZW50JywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbn0pOyJdfQ==