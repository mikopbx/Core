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
    mailSettings.detectProviderFromEmail(); // Subscribe to EventBus OAuth2 events

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
            } // Check OAuth2 status if OAuth2 is selected
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
      UserMessage.showInformation(globalTranslate.ms_OAuth2AuthorizationSuccess || 'OAuth2 авторизация успешно завершена'); // Reload settings to show updated OAuth2 status

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
    console.log('[MailSettings] Starting OAuth2 flow for provider:', provider);

    if (!provider || provider === 'custom') {
      UserMessage.showError(globalTranslate.ms_ValidateOAuth2ProviderEmpty || 'Выберите OAuth2 провайдера');
      return;
    } // Check if Client ID and Secret are configured


    var clientId = $('#MailOAuth2ClientId').val();
    var clientSecret = $('#MailOAuth2ClientSecret').val();
    console.log('[MailSettings] Current form values:');
    console.log('  ClientId:', clientId);
    console.log('  ClientSecret:', clientSecret ? '***masked***' : 'empty');

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
    };
    console.log('[MailSettings] Saving OAuth2 credentials:', data); // Use MailSettingsAPI for consistent error handling

    MailSettingsAPI.patchSettings(data, function (response) {
      console.log('[MailSettings] OAuth2 credentials save response:', response);

      if (response && response.result) {
        console.log('[MailSettings] OAuth2 credentials saved successfully'); // Credentials saved, now get OAuth2 URL

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
    console.log('[MailSettings] Requesting auth URL from API...'); // Request authorization URL from API

    MailSettingsAPI.authorizeOAuth2(provider, clientId, clientSecret, function (authUrl) {
      console.log('[MailSettings] Received response from API:', authUrl ? 'Got URL' : 'No URL');

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
    console.log('[MailSettings] Proceeding with OAuth2 flow for provider:', provider); // Show loading state

    $('#oauth2-connect').addClass('loading'); // Get OAuth2 URL with saved credentials

    MailSettingsAPI.getOAuth2Url(provider, function (response) {
      console.log('[MailSettings] OAuth2 URL response:', response);
      $('#oauth2-connect').removeClass('loading');

      if (response && response.auth_url) {
        console.log('[MailSettings] Opening OAuth2 window with URL:', response.auth_url); // Open OAuth2 window

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
              details += ' <span class="ui green label"><i class="check icon"></i>Authorized</span>';
            }
          }

          details += '</small>';
          $result.append(details);
        }
      } else {
        var _response$messages2, _response$messages2$e, _response$data2;

        var message = (response === null || response === void 0 ? void 0 : (_response$messages2 = response.messages) === null || _response$messages2 === void 0 ? void 0 : (_response$messages2$e = _response$messages2.error) === null || _response$messages2$e === void 0 ? void 0 : _response$messages2$e.join(', ')) || 'Connection failed';
        $result.addClass('negative').html('<i class="times circle icon"></i> ' + message); // Show hints if available

        if (response !== null && response !== void 0 && (_response$data2 = response.data) !== null && _response$data2 !== void 0 && _response$data2.hints && response.data.hints.length > 0) {
          var hints = '<div class="ui divider"></div><strong>Troubleshooting:</strong><ul class="ui list">';
          response.data.hints.forEach(function (hint) {
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
        var _response$data3, _response$messages3, _response$messages3$s, _response$data4;

        // Get the actual recipient from response
        var actualRecipient = ((_response$data3 = response.data) === null || _response$data3 === void 0 ? void 0 : _response$data3.to) || recipient; // Use the message from API which already includes the email address

        var successMessage = ((_response$messages3 = response.messages) === null || _response$messages3 === void 0 ? void 0 : (_response$messages3$s = _response$messages3.success) === null || _response$messages3$s === void 0 ? void 0 : _response$messages3$s[0]) || 'Test email sent'; // If message doesn't include email but we have it, add it

        if (!successMessage.includes('@') && actualRecipient) {
          successMessage = successMessage.replace('Письмо отправлено', "\u041F\u0438\u0441\u044C\u043C\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u2192 ".concat(actualRecipient));
        }

        $result.addClass('positive').html('<i class="check circle icon"></i> ' + successMessage); // Show diagnostics info if available

        if ((_response$data4 = response.data) !== null && _response$data4 !== void 0 && _response$data4.diagnostics) {
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
        var _response$messages4, _response$messages4$e, _response$data5;

        var message = (response === null || response === void 0 ? void 0 : (_response$messages4 = response.messages) === null || _response$messages4 === void 0 ? void 0 : (_response$messages4$e = _response$messages4.error) === null || _response$messages4$e === void 0 ? void 0 : _response$messages4$e.join(', ')) || 'Failed to send test email';
        $result.addClass('negative').html('<i class="times circle icon"></i> ' + message); // Show hints if available

        if (response !== null && response !== void 0 && (_response$data5 = response.data) !== null && _response$data5 !== void 0 && _response$data5.hints && response.data.hints.length > 0) {
          var hints = '<div class="ui divider"></div><strong>Troubleshooting:</strong><ul class="ui list">';
          response.data.hints.forEach(function (hint) {
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
        var fieldValue = originalValue;
        console.log("[MailSettings] Processing field ".concat(fieldId, ", original value: \"").concat(originalValue, "\"")); // For email inputmask, try different approaches to get clean value

        if (fieldValue) {
          // Check if value contains placeholder patterns
          if (fieldValue.includes('_@_') || fieldValue === '@.' || fieldValue === '@' || fieldValue === '_') {
            console.log("[MailSettings] Field ".concat(fieldId, " contains placeholder, clearing"));
            fieldValue = '';
          } else {
            // Try to get unmasked value for email fields
            try {
              // Check if inputmask plugin is available
              if ($field.inputmask && typeof $field.inputmask === 'function') {
                var unmaskedValue = $field.inputmask('unmaskedvalue');
                console.log("[MailSettings] Field ".concat(fieldId, " unmasked value: \"").concat(unmaskedValue, "\""));

                if (unmaskedValue && unmaskedValue !== fieldValue && !unmaskedValue.includes('_')) {
                  fieldValue = unmaskedValue;
                }
              }
            } catch (e) {
              console.warn("[MailSettings] Failed to get unmasked value for ".concat(fieldId, ":"), e);
            }
          }
        }

        console.log("[MailSettings] Final value for ".concat(fieldId, ": \"").concat(fieldValue, "\""));
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
        console.log('OAuth2 event received via EventBus:', data);

        if (data.status === 'success') {
          // Success: show success message and refresh OAuth2 status
          UserMessage.showInformation(globalTranslate.ms_OAuth2AuthorizationSuccess, 3000); // Refresh OAuth2 status after a short delay

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkIiwiJGNoZWNrQm94ZXMiLCIkbWVudUl0ZW1zIiwib2F1dGgyV2luZG93IiwiZGF0YUxvYWRlZCIsImdldFZhbGlkYXRlUnVsZXMiLCJydWxlcyIsImF1dGhUeXBlIiwidmFsIiwiTWFpbFNNVFBTZW5kZXJBZGRyZXNzIiwiaWRlbnRpZmllciIsIm9wdGlvbmFsIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQiLCJTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwiLCJtc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCIsIlN5c3RlbUVtYWlsRm9yTWlzc2VkIiwidmFsdWUiLCJtc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCIsIlZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCIsIm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkIiwiTWFpbFNNVFBIb3N0IiwibXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQiLCJNYWlsU01UUFBvcnQiLCJtc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCIsIk1haWxPQXV0aDJQcm92aWRlciIsIk1haWxPQXV0aDJDbGllbnRJZCIsIk1haWxPQXV0aDJDbGllbnRTZWNyZXQiLCJNYWlsU01UUFVzZXJuYW1lIiwibXNfVmFsaWRhdGVTTVRQVXNlcm5hbWVFbWFpbCIsIk1haWxTTVRQUGFzc3dvcmQiLCJkZXBlbmRzIiwibXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSIsInVwZGF0ZVZhbGlkYXRpb25SdWxlcyIsIm5ld1J1bGVzIiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmb3JtIiwiZmllbGRzIiwiaW5saW5lIiwib24iLCJpbml0aWFsaXplIiwiaGFuZGxlT0F1dGgyQ2FsbGJhY2siLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJjaGVja2JveCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ1cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24iLCJpbml0aWFsRW5jcnlwdGlvbiIsImNsZWFyYWJsZSIsImZvcmNlU2VsZWN0aW9uIiwidXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVPQXV0aDIiLCJpbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycyIsImluaXRpYWxpemVOb3RpZmljYXRpb25IYW5kbGVycyIsImluaXRpYWxpemVUZXN0QnV0dG9ucyIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwiLCJzdWJzY3JpYmVUb09BdXRoMkV2ZW50cyIsIm1vbml0b3JGb3JtQ2hhbmdlcyIsImxvYWREYXRhIiwiTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJidWlsZFRvb2x0aXBDb250ZW50IiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsImJ1aWxkQ29udGVudCIsImVtYWlsRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkSWQiLCIkZmllbGQiLCJsZW5ndGgiLCJpbnB1dG1hc2siLCJzaG93TWFza09uSG92ZXIiLCJwbGFjZWhvbGRlciIsIm9uQmVmb3JlUGFzdGUiLCJwYXN0ZWRWYWx1ZSIsIm9uY2xlYXJlZCIsIiRpbnB1dCIsImFkZENsYXNzIiwiTWFpbFNldHRpbmdzQVBJIiwiZ2V0U2V0dGluZ3MiLCJzZXR0aW5ncyIsIm9mZiIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJkYXRhIiwiYm9vbGVhbkZpZWxkcyIsImtleSIsInVuZGVmaW5lZCIsIk1haWxTTVRQQXV0aFR5cGUiLCJhZnRlclBvcHVsYXRlIiwiTWFpbFNNVFBVc2VUTFMiLCJlbmNyeXB0aW9uVmFsdWUiLCJNYWlsU01UUENlcnRDaGVjayIsImlzQ2hlY2tlZCIsImNsb3Nlc3QiLCJNYWlsRW5hYmxlTm90aWZpY2F0aW9ucyIsInRvZ2dsZUF1dGhGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RhcnRPQXV0aDJGbG93IiwiZGlzY29ubmVjdE9BdXRoMiIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJoYW5kbGVPQXV0aDJNZXNzYWdlIiwiZGF0YUNoYW5nZWQiLCJ0YXJnZXQiLCJjdXJyZW50QXV0aFR5cGUiLCJ0b2dnbGVBdXRoRmllbGRzV2l0aG91dFN0YXR1cyIsIiR1c2VybmFtZUZpZWxkIiwiJHBhc3N3b3JkRmllbGQiLCIkb2F1dGgyU2VjdGlvbiIsInNob3ciLCJoaWRlIiwidXBkYXRlT0F1dGgyU3RhdHVzIiwiY2hlY2tPQXV0aDJTdGF0dXMiLCJjdXJyZW50VGFyZ2V0IiwiaGFzQ2xhc3MiLCJoYXNDaGFuZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93V2FybmluZyIsIm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZyIsInRlc3RDb25uZWN0aW9uIiwic2VuZFRlc3RFbWFpbCIsImVtYWlsIiwicHJvdmlkZXIiLCJkZXRlY3RQcm92aWRlciIsInNob3dQcm92aWRlckhpbnQiLCJhdXRvRmlsbFNNVFBTZXR0aW5ncyIsImdvb2dsZSIsImhvc3QiLCJwb3J0IiwidGxzIiwibWljcm9zb2Z0IiwieWFuZGV4IiwicHJvdmlkZXJTZXR0aW5ncyIsIiRlbmNyeXB0aW9uRHJvcGRvd24iLCJlbmNyeXB0aW9uIiwiY2VydENoZWNrIiwiZW5jcnlwdGlvblR5cGUiLCIkcG9ydEZpZWxkIiwiY3VycmVudFBvcnQiLCJzdGFuZGFyZFBvcnRzIiwiaW5jbHVkZXMiLCIkY2VydENoZWNrRmllbGQiLCJtZXNzYWdlIiwiJGhpbnQiLCJhZnRlciIsInRleHQiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJsb2NhdGlvbiIsInNlYXJjaCIsImhhcyIsInNob3dJbmZvcm1hdGlvbiIsIm1zX09BdXRoMkF1dGhvcml6YXRpb25TdWNjZXNzIiwibG9hZFNldHRpbmdzRnJvbUFQSSIsInJlcGxhY2VTdGF0ZSIsImRvY3VtZW50IiwidGl0bGUiLCJwYXRobmFtZSIsImVycm9yIiwiZ2V0Iiwic2hvd0Vycm9yIiwibXNfT0F1dGgyQXV0aG9yaXphdGlvbkZhaWxlZCIsImRlY29kZVVSSUNvbXBvbmVudCIsImNvbnNvbGUiLCJsb2ciLCJtc19WYWxpZGF0ZU9BdXRoMlByb3ZpZGVyRW1wdHkiLCJjbGllbnRJZCIsImNsaWVudFNlY3JldCIsIm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50SWRFbXB0eSIsIm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50U2VjcmV0RW1wdHkiLCJzYXZlT0F1dGgyQ3JlZGVudGlhbHMiLCJwYXRjaFNldHRpbmdzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwcm9jZWVkV2l0aE9BdXRoMkZsb3ciLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImpvaW4iLCJyZXF1ZXN0T0F1dGgyQXV0aFVybCIsImF1dGhvcml6ZU9BdXRoMiIsImF1dGhVcmwiLCJ3aWR0aCIsImhlaWdodCIsImxlZnQiLCJzY3JlZW4iLCJ0b3AiLCJhdXRoV2luZG93Iiwib3BlbiIsImdldE9BdXRoMlVybCIsImF1dGhfdXJsIiwiZXZlbnQiLCJvcmlnaW4iLCJjbG9zZSIsInBhcmFtcyIsIm9hdXRoMl9zdGF0dXMiLCJzdGF0dXMiLCIkc3RhdHVzRGl2IiwiJGNsaWVudElkRmllbGQiLCIkY2xpZW50U2VjcmV0RmllbGQiLCJjb25maWd1cmVkIiwicHJvdmlkZXJOYW1lIiwiZ2V0UHJvdmlkZXJOYW1lIiwiY29ubmVjdGVkVGV4dCIsIm1zX09BdXRoMkNvbm5lY3RlZFRvIiwicmVwbGFjZSIsImh0bWwiLCJhdXRob3JpemVkIiwibXNfT0F1dGgyTm90Q29uZmlndXJlZCIsImNsZWFyRGF0YSIsIk1haWxPQXV0aDJSZWZyZXNoVG9rZW4iLCJNYWlsT0F1dGgyQWNjZXNzVG9rZW4iLCJNYWlsT0F1dGgyVG9rZW5FeHBpcmVzIiwiJGJ1dHRvbiIsIiRyZXN1bHRBcmVhIiwicmVtb3ZlIiwiJHJlc3VsdCIsInBhcmVudCIsImFwcGVuZCIsInN1Y2Nlc3MiLCJkaWFnbm9zdGljcyIsImRpYWciLCJkZXRhaWxzIiwiYXV0aF90eXBlIiwic210cF9ob3N0Iiwic210cF9wb3J0Iiwic210cF9lbmNyeXB0aW9uIiwib2F1dGgyX3Byb3ZpZGVyIiwib2F1dGgyX3JlZnJlc2hfdG9rZW5fZXhpc3RzIiwiaGludHMiLCJoaW50Iiwic2V0VGltZW91dCIsImZhZGVPdXQiLCJyZWNpcGllbnQiLCJ0byIsInN1YmplY3QiLCJib2R5IiwiYWN0dWFsUmVjaXBpZW50Iiwic3VjY2Vzc01lc3NhZ2UiLCJjYkJlZm9yZVNlbmRGb3JtIiwib3JpZ2luYWxWYWx1ZSIsImZpZWxkVmFsdWUiLCJ1bm1hc2tlZFZhbHVlIiwid2FybiIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsInNlbmRPbmx5Q2hhbmdlZCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwidXJsIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJtc19PQXV0aDJQcm9jZXNzaW5nRmFpbGVkIiwidXBkYXRlVGVzdEJ1dHRvblN0YXRlcyIsIm9yaWdpbmFsQWZ0ZXJTZW5kRm9ybSIsIiR0ZXN0Q29ubmVjdGlvbkJ0biIsIiRzZW5kVGVzdEVtYWlsQnRuIiwiJHN1Ym1pdEJ0biIsImF0dHIiLCJyZW1vdmVBdHRyIiwicG9wdXAiLCJyZWFkeSIsInN0b3BQcm9wYWdhdGlvbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVB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dEIsQ0FBMEIsdUJBQTFCLEVBQW1EOUMsRUFBbkQsQ0FBc0QsdUJBQXRELEVBQStFLFVBQVNrRSxDQUFULEVBQVk7QUFDdkZBLElBQUFBLENBQUMsQ0FBQ3lLLGVBQUY7QUFDQXpLLElBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLFdBQU8sS0FBUDtBQUNILEdBSkQ7QUFLSCxDQVZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgVXNlck1lc3NhZ2UsIE1haWxTZXR0aW5nc0FQSSwgQ29uZmlnLCBUb29sdGlwQnVpbGRlciwgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1haWwgc2V0dGluZ3Mgd2l0aCBPQXV0aDIgc3VwcG9ydFxuICpcbiAqIEBtb2R1bGUgbWFpbFNldHRpbmdzXG4gKi9cbmNvbnN0IG1haWxTZXR0aW5ncyA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbWFpbC1zZXR0aW5ncy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgY2hlY2tib3hlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGVja0JveGVzOiAkKCcjbWFpbC1zZXR0aW5ncy1mb3JtIC5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1lbnUgaXRlbXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWVudUl0ZW1zOiAkKCcjbWFpbC1zZXR0aW5ncy1tZW51IC5pdGVtJyksXG5cbiAgICAvKipcbiAgICAgKiBPQXV0aDIgd2luZG93IHJlZmVyZW5jZVxuICAgICAqIEB0eXBlIHtXaW5kb3d8bnVsbH1cbiAgICAgKi9cbiAgICBvYXV0aDJXaW5kb3c6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHRyYWNrIGlmIGluaXRpYWwgZGF0YSBoYXMgYmVlbiBsb2FkZWQgZnJvbSBBUElcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBkYXRhTG9hZGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gZm9ybSBzdGF0ZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCBydWxlcyA9IHt9O1xuICAgICAgICBjb25zdCBhdXRoVHlwZSA9ICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdOmNoZWNrZWQnKS52YWwoKTtcblxuICAgICAgICAvLyBCYXNlIGVtYWlsIHZhbGlkYXRpb24gcnVsZXMgLSBhbHdheXMgYXBwbHkgd2hlbiBmaWVsZHMgaGF2ZSB2YWx1ZXNcbiAgICAgICAgcnVsZXMuTWFpbFNNVFBTZW5kZXJBZGRyZXNzID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQU2VuZGVyQWRkcmVzcycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNlbmRlckFkZHJlc3NJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLlN5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTeXN0ZW1FbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuU3lzdGVtRW1haWxGb3JNaXNzZWQgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU3lzdGVtRW1haWxGb3JNaXNzZWQnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnXig/IS4qX0BfXFxcXC5fKS4qJCcsICAvLyBSZWplY3QgX0BfLl8gcGF0dGVyblxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVNaXNzZWRFbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeKD8hLipfQF9cXFxcLl8pLiokJywgIC8vIFJlamVjdCBfQF8uXyBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVZvaWNlbWFpbEVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTTVRQIGNvbmZpZ3VyYXRpb24gcnVsZXMgLSBhbHdheXMgYXZhaWxhYmxlIGJ1dCBvcHRpb25hbFxuICAgICAgICBydWxlcy5NYWlsU01UUEhvc3QgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbFNNVFBIb3N0JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU01UUEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLk1haWxTTVRQUG9ydCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFBvcnQnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXV0aGVudGljYXRpb24tc3BlY2lmaWMgcnVsZXNcbiAgICAgICAgaWYgKGF1dGhUeXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgLy8gT0F1dGgyIGZpZWxkcyAtIG9wdGlvbmFsXG4gICAgICAgICAgICBydWxlcy5NYWlsT0F1dGgyUHJvdmlkZXIgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxPQXV0aDJQcm92aWRlcicsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcnVsZXMuTWFpbE9BdXRoMkNsaWVudElkID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsT0F1dGgyQ2xpZW50SWQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJ1bGVzLk1haWxPQXV0aDJDbGllbnRTZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxPQXV0aDJDbGllbnRTZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFVzZXJuYW1lIGZvciBPQXV0aDIgc2hvdWxkIGJlIGVtYWlsIHdoZW4gZmlsbGVkXG4gICAgICAgICAgICBydWxlcy5NYWlsU01UUFVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFVzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQVXNlcm5hbWVFbWFpbCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBVc2VybmFtZSAtIG9wdGlvbmFsXG4gICAgICAgICAgICBydWxlcy5NYWlsU01UUFVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFVzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBQYXNzd29yZCAtIHJlcXVpcmVkIGlmIHVzZXJuYW1lIGlzIHByb3ZpZGVkXG4gICAgICAgICAgICBydWxlcy5NYWlsU01UUFBhc3N3b3JkID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFBhc3N3b3JkJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiAnTWFpbFNNVFBVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU01UUFBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIGFuZCByZWluaXRpYWxpemUgZm9ybVxuICAgICAqL1xuICAgIHVwZGF0ZVZhbGlkYXRpb25SdWxlcygpIHtcbiAgICAgICAgLy8gR2V0IGZyZXNoIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gY3VycmVudCBzdGF0ZVxuICAgICAgICBjb25zdCBuZXdSdWxlcyA9IG1haWxTZXR0aW5ncy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIEZvcm0udmFsaWRhdGVSdWxlc1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBuZXdSdWxlcztcblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIHdpdGggbmV3IHJ1bGVzXG4gICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdkZXN0cm95Jyk7XG4gICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKHtcbiAgICAgICAgICAgIGZpZWxkczogbmV3UnVsZXMsXG4gICAgICAgICAgICBpbmxpbmU6IHRydWUsXG4gICAgICAgICAgICBvbjogJ2JsdXInXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtYWlsIHNldHRpbmdzIHBhZ2UuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIE9BdXRoMiBjYWxsYmFjayBwYXJhbWV0ZXJzIGluIFVSTFxuICAgICAgICBtYWlsU2V0dGluZ3MuaGFuZGxlT0F1dGgyQ2FsbGJhY2soKTtcblxuICAgICAgICBtYWlsU2V0dGluZ3MuJG1lbnVJdGVtcy50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuICAgICAgICBtYWlsU2V0dGluZ3MuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIHNwZWNpZmljIGNvbmZpZ3VyYXRpb25zXG4gICAgICAgIC8vIERvbid0IGluaXRpYWxpemUgYWxsIGRyb3Bkb3ducyBnZW5lcmljYWxseSB0byBhdm9pZCBkb3VibGUgaW5pdGlhbGl6YXRpb25cblxuICAgICAgICAvLyBJbml0aWFsaXplIGVuY3J5cHRpb24gdHlwZSBkcm9wZG93biB3aXRoIHBvcnQgYXV0by11cGRhdGVcbiAgICAgICAgJCgnI01haWxTTVRQVXNlVExTLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlUG9ydEJhc2VkT25FbmNyeXB0aW9uKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaW5pdGlhbCBlbmNyeXB0aW9uIHR5cGUgdG8gc2hvdy9oaWRlIGNlcnRpZmljYXRlIGNoZWNrXG4gICAgICAgIGNvbnN0IGluaXRpYWxFbmNyeXB0aW9uID0gJCgnI01haWxTTVRQVXNlVExTJykudmFsKCkgfHwgJ25vbmUnO1xuICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlUG9ydEJhc2VkT25FbmNyeXB0aW9uKGluaXRpYWxFbmNyeXB0aW9uKTtcblxuICAgICAgICAvLyBTcGVjaWFsIGluaXRpYWxpemF0aW9uIGZvciBPQXV0aDIgcHJvdmlkZXIgZHJvcGRvd24gKFY1LjAgcGF0dGVybilcbiAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlci1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIGNsZWFyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVTTVRQU2V0dGluZ3NGb3JQcm92aWRlcih2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE5vIG90aGVyIGRyb3Bkb3ducyBpbiB0aGUgZm9ybSBuZWVkIGluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIE1haWxTTVRQVXNlVExTIGFuZCBNYWlsT0F1dGgyUHJvdmlkZXIgYXJlIHRoZSBvbmx5IGRyb3Bkb3duc1xuXG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZU9BdXRoMigpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZUF1dGhUeXBlSGFuZGxlcnMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVOb3RpZmljYXRpb25IYW5kbGVycygpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZVRlc3RCdXR0b25zKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplSW5wdXRNYXNrcygpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5kZXRlY3RQcm92aWRlckZyb21FbWFpbCgpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBPQXV0aDIgZXZlbnRzXG4gICAgICAgIG1haWxTZXR0aW5ncy5zdWJzY3JpYmVUb09BdXRoMkV2ZW50cygpO1xuXG4gICAgICAgIC8vIE1vbml0b3IgZm9ybSBjaGFuZ2VzIHRvIGNvbnRyb2wgdGVzdCBidXR0b25zXG4gICAgICAgIG1haWxTZXR0aW5ncy5tb25pdG9yRm9ybUNoYW5nZXMoKTtcblxuICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSBBUEkgYWZ0ZXIgYWxsIFVJIGVsZW1lbnRzIGFyZSBpbml0aWFsaXplZFxuICAgICAgICBtYWlsU2V0dGluZ3MubG9hZERhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIFVzZSBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIGlmICh0eXBlb2YgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlci5pbml0aWFsaXplVG9vbHRpcHMobWFpbFNldHRpbmdzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBEZWxlZ2F0ZXMgdG8gVG9vbHRpcEJ1aWxkZXIgZm9yIGNvbnNpc3RlbnQgdG9vbHRpcCBmb3JtYXR0aW5nXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEgLSBDb25maWd1cmF0aW9uIG9iamVjdCBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQodG9vbHRpcERhdGEpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBpbnB1dCBtYXNrcyBmb3IgZW1haWwgZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlucHV0TWFza3MoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZW1haWwgaW5wdXQgbWFza3MgZm9yIGFsbCBlbWFpbCBmaWVsZHNcbiAgICAgICAgY29uc3QgZW1haWxGaWVsZHMgPSBbXG4gICAgICAgICAgICAnTWFpbFNNVFBTZW5kZXJBZGRyZXNzJyxcbiAgICAgICAgICAgICdTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnLFxuICAgICAgICAgICAgJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJyxcbiAgICAgICAgICAgICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnXG4gICAgICAgIF07XG5cbiAgICAgICAgZW1haWxGaWVsZHMuZm9yRWFjaChmaWVsZElkID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZmllbGQuaW5wdXRtYXNrKCdlbWFpbCcsIHtcbiAgICAgICAgICAgICAgICAgICAgc2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLCAvLyBObyBwbGFjZWhvbGRlciBjaGFyYWN0ZXJcbiAgICAgICAgICAgICAgICAgICAgb25CZWZvcmVQYXN0ZTogZnVuY3Rpb24ocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFuIHBsYWNlaG9sZGVyIHZhbHVlcyBvbiBwYXN0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhc3RlZFZhbHVlID09PSAnX0BfLl8nIHx8IHBhc3RlZFZhbHVlID09PSAnQCcgfHwgcGFzdGVkVmFsdWUgPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmNsZWFyZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGZpZWxkIHZhbHVlIHdoZW4gbWFzayBpcyBjbGVhcmVkXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRpbnB1dC52YWwoKSA9PT0gJ19AXy5fJyB8fCAkaW5wdXQudmFsKCkgPT09ICdAJyB8fCAkaW5wdXQudmFsKCkgPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGlucHV0LnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIENsZWFuIGluaXRpYWwgcGxhY2Vob2xkZXIgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKCRmaWVsZC52YWwoKSA9PT0gJ19AXy5fJyB8fCAkZmllbGQudmFsKCkgPT09ICdAJyB8fCAkZmllbGQudmFsKCkgPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC52YWwoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbWFpbCBzZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZERhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIG91ciBjaGFuZ2UgaGFuZGxlciB0byBwcmV2ZW50IGR1cGxpY2F0ZSBBUEkgY2FsbFxuICAgICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdJykub2ZmKCdjaGFuZ2UubWFpbHNldHRpbmdzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaCBsaWtlIEdlbmVyYWxTZXR0aW5nc1xuICAgICAgICAgICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoc2V0dGluZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSRVNUIEFQSSByZXR1cm5zIGJvb2xlYW5zIGZvciBjaGVja2JveCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgYm9vbGVhbiB2YWx1ZXMgdG8gc3RyaW5ncyBmb3IgU2VtYW50aWMgVUkgY2hlY2tib3hlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9vbGVhbkZpZWxkcyA9IFsnTWFpbFNNVFBDZXJ0Q2hlY2snLCAnTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvb2xlYW5GaWVsZHMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IGJvb2xlYW4gdG8gc3RyaW5nIFwiMVwiIG9yIFwiMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFba2V5XSA9IChkYXRhW2tleV0gPT09IHRydWUgfHwgZGF0YVtrZXldID09PSAxIHx8IGRhdGFba2V5XSA9PT0gJzEnKSA/ICcxJyA6ICcwJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIHJhZGlvIGJ1dHRvbiB2YWx1ZSBpcyBzZXQgKHdpbGwgYmUgaGFuZGxlZCBzaWxlbnRseSBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLk1haWxTTVRQQXV0aFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLk1haWxTTVRQQXV0aFR5cGUgPSAncGFzc3dvcmQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGVhbiB1cCBwbGFjZWhvbGRlciBlbWFpbCB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVtYWlsRmllbGRzID0gWydTeXN0ZW1FbWFpbEZvck1pc3NlZCcsICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVtYWlsRmllbGRzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtrZXldID09PSAnX0BfLl8nIHx8IGRhdGFba2V5XSA9PT0gJ0AnIHx8IGRhdGFba2V5XSA9PT0gJ19AXycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtrZXldID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBPQXV0aDIgcHJvdmlkZXIgZHJvcGRvd24gKFY1LjAgcGF0dGVybilcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxPQXV0aDJQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXItZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5NYWlsT0F1dGgyUHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXInKS52YWwoZGF0YS5NYWlsT0F1dGgyUHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBlbmNyeXB0aW9uIHR5cGUgZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxTTVRQVXNlVExTICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IG9sZCBib29sZWFuIHZhbHVlcyB0byBuZXcgZm9ybWF0IGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmNyeXB0aW9uVmFsdWUgPSBkYXRhLk1haWxTTVRQVXNlVExTO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmNyeXB0aW9uVmFsdWUgPT09IHRydWUgfHwgZW5jcnlwdGlvblZhbHVlID09PSAxIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuY3J5cHRpb25WYWx1ZSA9ICd0bHMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW5jcnlwdGlvblZhbHVlID09PSBmYWxzZSB8fCBlbmNyeXB0aW9uVmFsdWUgPT09IDAgfHwgZW5jcnlwdGlvblZhbHVlID09PSAnMCcgfHwgZW5jcnlwdGlvblZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmNyeXB0aW9uVmFsdWUgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgZHJvcGRvd24gdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZW5jcnlwdGlvblZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMnKS52YWwoZW5jcnlwdGlvblZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgY2hlY2tib3hlcyB1c2luZyBTZW1hbnRpYyBVSVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuTWFpbFNNVFBDZXJ0Q2hlY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IGRhdGEuTWFpbFNNVFBDZXJ0Q2hlY2sgPT09IHRydWUgfHwgZGF0YS5NYWlsU01UUENlcnRDaGVjayA9PT0gMSB8fCBkYXRhLk1haWxTTVRQQ2VydENoZWNrID09PSAnMSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBDZXJ0Q2hlY2snKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBDZXJ0Q2hlY2snKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IGRhdGEuTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgPT09IHRydWUgfHwgZGF0YS5NYWlsRW5hYmxlTm90aWZpY2F0aW9ucyA9PT0gMSB8fCBkYXRhLk1haWxFbmFibGVOb3RpZmljYXRpb25zID09PSAnMSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgT0F1dGgyIHN0YXR1cyBpZiBPQXV0aDIgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJhZGlvIGJ1dHRvbiBpcyBhbHJlYWR5IHNldCBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdXRoVHlwZSA9IGRhdGEuTWFpbFNNVFBBdXRoVHlwZSB8fCAncGFzc3dvcmQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHMoYXV0aFR5cGUsIGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBsb2FkZWQgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVWYWxpZGF0aW9uUnVsZXMoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyB0aGF0IGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuZGF0YUxvYWRlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmUtZW5hYmxlIG91ciBjaGFuZ2UgaGFuZGxlciBmb3IgZnV0dXJlIHVzZXIgaW50ZXJhY3Rpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MucmVBdHRhY2hBdXRoVHlwZUhhbmRsZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBPQXV0aDIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVPQXV0aDIoKSB7XG4gICAgICAgIC8vIE9BdXRoMiBjb25uZWN0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3Muc3RhcnRPQXV0aDJGbG93KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE9BdXRoMiBkaXNjb25uZWN0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNvYXV0aDItZGlzY29ubmVjdCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuZGlzY29ubmVjdE9BdXRoMigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMaXN0ZW4gZm9yIE9BdXRoMiBjYWxsYmFjayBtZXNzYWdlc1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG1haWxTZXR0aW5ncy5oYW5kbGVPQXV0aDJNZXNzYWdlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBub3RpZmljYXRpb24gZW5hYmxlL2Rpc2FibGUgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTm90aWZpY2F0aW9uSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBub3RpZmljYXRpb25zIGVuYWJsZS9kaXNhYmxlIGNoZWNrYm94XG4gICAgICAgICQoJyNNYWlsRW5hYmxlTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVZhbGlkYXRpb25SdWxlcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF0dGFjaCBhdXRoIHR5cGUgY2hhbmdlIGhhbmRsZXJcbiAgICAgKi9cbiAgICByZUF0dGFjaEF1dGhUeXBlSGFuZGxlcigpIHtcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cIk1haWxTTVRQQXV0aFR5cGVcIl0nKS5vbignY2hhbmdlLm1haWxzZXR0aW5ncycsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhdXRoVHlwZSA9ICQoZS50YXJnZXQpLnZhbCgpO1xuICAgICAgICAgICAgLy8gV2hlbiB1c2VyIG1hbnVhbGx5IGNoYW5nZXMgYXV0aCB0eXBlLCBjaGVjayBPQXV0aDIgc3RhdHVzIGlmIG5lZWRlZFxuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHMoYXV0aFR5cGUpO1xuICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgd2hlbiBhdXRoIHR5cGUgY2hhbmdlc1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVZhbGlkYXRpb25SdWxlcygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdXRoZW50aWNhdGlvbiB0eXBlIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUF1dGhUeXBlSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEF0dGFjaCBpbml0aWFsIGhhbmRsZXJcbiAgICAgICAgbWFpbFNldHRpbmdzLnJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvbiBwYWdlIGxvYWQgLSBkb24ndCBjaGVjayBPQXV0aDIgc3RhdHVzIHlldCAod2lsbCBiZSBkb25lIGluIGxvYWREYXRhKVxuICAgICAgICBjb25zdCBjdXJyZW50QXV0aFR5cGUgPSAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXTpjaGVja2VkJykudmFsKCkgfHwgJ3Bhc3N3b3JkJztcbiAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzKGN1cnJlbnRBdXRoVHlwZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBhdXRoZW50aWNhdGlvbiBmaWVsZHMgd2l0aG91dCBjaGVja2luZyBPQXV0aDIgc3RhdHVzIChmb3IgaW5pdGlhbCBzZXR1cClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYXV0aFR5cGUgLSBBdXRoZW50aWNhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdG9nZ2xlQXV0aEZpZWxkc1dpdGhvdXRTdGF0dXMoYXV0aFR5cGUpIHtcbiAgICAgICAgY29uc3QgJHVzZXJuYW1lRmllbGQgPSAkKCcjTWFpbFNNVFBVc2VybmFtZScpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICBjb25zdCAkcGFzc3dvcmRGaWVsZCA9ICQoJyNNYWlsU01UUFBhc3N3b3JkJykuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgIGNvbnN0ICRvYXV0aDJTZWN0aW9uID0gJCgnI29hdXRoMi1hdXRoLXNlY3Rpb24nKTtcblxuICAgICAgICBpZiAoYXV0aFR5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICAvLyBGb3IgT0F1dGgyOiBzaG93IHVzZXJuYW1lIChyZXF1aXJlZCBmb3IgZW1haWwgaWRlbnRpZmljYXRpb24pLCBoaWRlIHBhc3N3b3JkXG4gICAgICAgICAgICAkdXNlcm5hbWVGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAkcGFzc3dvcmRGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAkb2F1dGgyU2VjdGlvbi5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIHBhc3N3b3JkIGZpZWxkIGVycm9yc1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnTWFpbFNNVFBQYXNzd29yZCcpO1xuICAgICAgICAgICAgJHBhc3N3b3JkRmllbGQucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3IgcGFzc3dvcmQgYXV0aDogc2hvdyBib3RoIHVzZXJuYW1lIGFuZCBwYXNzd29yZFxuICAgICAgICAgICAgJHVzZXJuYW1lRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJHBhc3N3b3JkRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJG9hdXRoMlNlY3Rpb24uaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBPQXV0aDIgZmllbGQgZXJyb3JzXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdNYWlsT0F1dGgyUHJvdmlkZXInKTtcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ01haWxPQXV0aDJDbGllbnRJZCcpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpO1xuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYXV0aGVudGljYXRpb24gZmllbGRzIGJhc2VkIG9uIHR5cGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYXV0aFR5cGUgLSBBdXRoZW50aWNhdGlvbiB0eXBlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtzZXR0aW5nc10gLSBPcHRpb25hbCBzZXR0aW5ncyBkYXRhIHRvIGF2b2lkIGFkZGl0aW9uYWwgQVBJIGNhbGxcbiAgICAgKi9cbiAgICB0b2dnbGVBdXRoRmllbGRzKGF1dGhUeXBlLCBzZXR0aW5ncyA9IG51bGwpIHtcbiAgICAgICAgLy8gRmlyc3QgdG9nZ2xlIGZpZWxkcyB3aXRob3V0IHN0YXR1cyBjaGVja1xuICAgICAgICBtYWlsU2V0dGluZ3MudG9nZ2xlQXV0aEZpZWxkc1dpdGhvdXRTdGF0dXMoYXV0aFR5cGUpO1xuXG4gICAgICAgIC8vIFRoZW4gY2hlY2sgT0F1dGgyIHN0YXR1cyBvbmx5IGlmIG5lZWRlZFxuICAgICAgICBpZiAoYXV0aFR5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgZXhpc3Rpbmcgc2V0dGluZ3MgZGF0YSB0byBhdm9pZCBkdXBsaWNhdGUgQVBJIGNhbGxcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlT0F1dGgyU3RhdHVzKHNldHRpbmdzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gQVBJIGNhbGwgaWYgbm8gc2V0dGluZ3MgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuY2hlY2tPQXV0aDJTdGF0dXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRlc3QgYnV0dG9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUZXN0QnV0dG9ucygpIHtcbiAgICAgICAgLy8gVGVzdCBjb25uZWN0aW9uIGJ1dHRvblxuICAgICAgICAkKCcjdGVzdC1jb25uZWN0aW9uLWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBpcyBkaXNhYmxlZFxuICAgICAgICAgICAgaWYgKCQoZS5jdXJyZW50VGFyZ2V0KS5oYXNDbGFzcygnZGlzYWJsZWQnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRG91YmxlLWNoZWNrIGZvciB1bnNhdmVkIGNoYW5nZXNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5oYXNDaGFuZ2VzICYmIEZvcm0uaGFzQ2hhbmdlcygpKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TYXZlQ2hhbmdlc0JlZm9yZVRlc3RpbmdcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRlc3RDb25uZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNlbmQgdGVzdCBlbWFpbCBidXR0b25cbiAgICAgICAgJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gaXMgZGlzYWJsZWRcbiAgICAgICAgICAgIGlmICgkKGUuY3VycmVudFRhcmdldCkuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERvdWJsZS1jaGVjayBmb3IgdW5zYXZlZCBjaGFuZ2VzXG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uaGFzQ2hhbmdlcyAmJiBGb3JtLmhhc0NoYW5nZXMoKSkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dXYXJuaW5nKFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zZW5kVGVzdEVtYWlsKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgcHJvdmlkZXIgZnJvbSBlbWFpbCBhZGRyZXNzXG4gICAgICovXG4gICAgZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwoKSB7XG4gICAgICAgICQoJyNNYWlsU01UUFVzZXJuYW1lJykub24oJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBlbWFpbCA9ICQoZS50YXJnZXQpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFlbWFpbCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9IE1haWxTZXR0aW5nc0FQSS5kZXRlY3RQcm92aWRlcihlbWFpbCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwcm92aWRlciBmaWVsZCB1c2luZyBTZW1hbnRpYyBVSSBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlci1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBwcm92aWRlcik7XG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykudmFsKHByb3ZpZGVyKTtcblxuICAgICAgICAgICAgLy8gU2hvdyByZWNvbW1lbmRhdGlvbnMgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgICAgICAgIGlmIChwcm92aWRlciA9PT0gJ2dvb2dsZScpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Muc2hvd1Byb3ZpZGVySGludCgnR21haWwgZGV0ZWN0ZWQuIE9BdXRoMiBhdXRoZW50aWNhdGlvbiB3aWxsIGJlIHJlcXVpcmVkIGZyb20gTWFyY2ggMjAyNS4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgPT09ICdtaWNyb3NvZnQnKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnNob3dQcm92aWRlckhpbnQoJ01pY3Jvc29mdC9PdXRsb29rIGRldGVjdGVkLiBPQXV0aDIgYXV0aGVudGljYXRpb24gcmVjb21tZW5kZWQuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyID09PSAneWFuZGV4Jykge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zaG93UHJvdmlkZXJIaW50KCdZYW5kZXggTWFpbCBkZXRlY3RlZC4gQm90aCBwYXNzd29yZCBhbmQgT0F1dGgyIGF1dGhlbnRpY2F0aW9uIHN1cHBvcnRlZC4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXV0by1maWxsIFNNVFAgc2V0dGluZ3MgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5hdXRvRmlsbFNNVFBTZXR0aW5ncyhwcm92aWRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdXRvLWZpbGwgU01UUCBzZXR0aW5ncyBiYXNlZCBvbiBwcm92aWRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlciAtIEVtYWlsIHByb3ZpZGVyXG4gICAgICovXG4gICAgYXV0b0ZpbGxTTVRQU2V0dGluZ3MocHJvdmlkZXIpIHtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBnb29nbGU6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC5nbWFpbC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIHRsczogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1pY3Jvc29mdDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLm9mZmljZTM2NS5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIHRsczogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHlhbmRleDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLnlhbmRleC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc0NjUnLFxuICAgICAgICAgICAgICAgIHRsczogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc2V0dGluZ3NbcHJvdmlkZXJdKSB7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlclNldHRpbmdzID0gc2V0dGluZ3NbcHJvdmlkZXJdO1xuXG4gICAgICAgICAgICAvLyBPbmx5IGZpbGwgaWYgZmllbGRzIGFyZSBlbXB0eVxuICAgICAgICAgICAgaWYgKCEkKCcjTWFpbFNNVFBIb3N0JykudmFsKCkpIHtcbiAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBIb3N0JykudmFsKHByb3ZpZGVyU2V0dGluZ3MuaG9zdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoISQoJyNNYWlsU01UUFBvcnQnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUFBvcnQnKS52YWwocHJvdmlkZXJTZXR0aW5ncy5wb3J0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGVuY3J5cHRpb24gZHJvcGRvd25cbiAgICAgICAgICAgIGNvbnN0ICRlbmNyeXB0aW9uRHJvcGRvd24gPSAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZW5jcnlwdGlvbkRyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBzZXR0aW5ncyBmb3IgZW5jcnlwdGlvblxuICAgICAgICAgICAgICAgIGxldCBlbmNyeXB0aW9uVmFsdWUgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyU2V0dGluZ3MucG9ydCA9PT0gJzU4NycpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ3Rscyc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm92aWRlclNldHRpbmdzLnBvcnQgPT09ICc0NjUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGVuY3J5cHRpb25WYWx1ZSA9ICdzc2wnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkZW5jcnlwdGlvbkRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBlbmNyeXB0aW9uVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBTTVRQIHNldHRpbmdzIHdoZW4gT0F1dGgyIHByb3ZpZGVyIGlzIHNlbGVjdGVkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyIC0gU2VsZWN0ZWQgT0F1dGgyIHByb3ZpZGVyIChnb29nbGUsIG1pY3Jvc29mdCwgeWFuZGV4KVxuICAgICAqL1xuICAgIHVwZGF0ZVNNVFBTZXR0aW5nc0ZvclByb3ZpZGVyKHByb3ZpZGVyKSB7XG4gICAgICAgIC8vIERvbid0IGF1dG8tZmlsbCB1bnRpbCBpbml0aWFsIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIGlmICghbWFpbFNldHRpbmdzLmRhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIE9BdXRoMiBhdXRoIHR5cGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgY29uc3QgYXV0aFR5cGUgPSAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXTpjaGVja2VkJykudmFsKCk7XG4gICAgICAgIGlmIChhdXRoVHlwZSAhPT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmluZSBwcm92aWRlciBTTVRQIHNldHRpbmdzXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBnb29nbGU6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC5nbWFpbC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIGVuY3J5cHRpb246ICd0bHMnLFxuICAgICAgICAgICAgICAgIGNlcnRDaGVjazogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1pY3Jvc29mdDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLW1haWwub3V0bG9vay5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIGVuY3J5cHRpb246ICd0bHMnLFxuICAgICAgICAgICAgICAgIGNlcnRDaGVjazogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHlhbmRleDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLnlhbmRleC5ydScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgZW5jcnlwdGlvbjogJ3RscycsXG4gICAgICAgICAgICAgICAgY2VydENoZWNrOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBwcm92aWRlclNldHRpbmdzW3Byb3ZpZGVyXTtcbiAgICAgICAgaWYgKCFzZXR0aW5ncykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGhvc3RcbiAgICAgICAgJCgnI01haWxTTVRQSG9zdCcpLnZhbChzZXR0aW5ncy5ob3N0KTtcblxuICAgICAgICAvLyBVcGRhdGUgcG9ydFxuICAgICAgICAkKCcjTWFpbFNNVFBQb3J0JykudmFsKHNldHRpbmdzLnBvcnQpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBlbmNyeXB0aW9uIHR5cGVcbiAgICAgICAgJCgnI01haWxTTVRQVXNlVExTJykudmFsKHNldHRpbmdzLmVuY3J5cHRpb24pO1xuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2V0dGluZ3MuZW5jcnlwdGlvbik7XG5cbiAgICAgICAgLy8gVXBkYXRlIGNlcnRpZmljYXRlIGNoZWNrXG4gICAgICAgIGlmIChzZXR0aW5ncy5jZXJ0Q2hlY2spIHtcbiAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwb3J0IGJhc2VkIG9uIHNlbGVjdGVkIGVuY3J5cHRpb24gdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBlbmNyeXB0aW9uVHlwZSAtIFNlbGVjdGVkIGVuY3J5cHRpb24gdHlwZSAobm9uZS90bHMvc3NsKVxuICAgICAqL1xuICAgIHVwZGF0ZVBvcnRCYXNlZE9uRW5jcnlwdGlvbihlbmNyeXB0aW9uVHlwZSkge1xuICAgICAgICBjb25zdCAkcG9ydEZpZWxkID0gJCgnI01haWxTTVRQUG9ydCcpO1xuXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHRoZSB1c2VyIGhhc24ndCBtYW51YWxseSBjaGFuZ2VkIHRoZSBwb3J0XG4gICAgICAgIGNvbnN0IGN1cnJlbnRQb3J0ID0gJHBvcnRGaWVsZC52YWwoKTtcbiAgICAgICAgY29uc3Qgc3RhbmRhcmRQb3J0cyA9IFsnMjUnLCAnNTg3JywgJzQ2NScsICcnXTtcblxuICAgICAgICBpZiAoc3RhbmRhcmRQb3J0cy5pbmNsdWRlcyhjdXJyZW50UG9ydCkpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoZW5jcnlwdGlvblR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgICAgICAgICAgJHBvcnRGaWVsZC52YWwoJzI1Jyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Rscyc6XG4gICAgICAgICAgICAgICAgICAgICRwb3J0RmllbGQudmFsKCc1ODcnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnc3NsJzpcbiAgICAgICAgICAgICAgICAgICAgJHBvcnRGaWVsZC52YWwoJzQ2NScpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cvaGlkZSBjZXJ0aWZpY2F0ZSBjaGVjayBiYXNlZCBvbiBlbmNyeXB0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgJGNlcnRDaGVja0ZpZWxkID0gJCgnI2NlcnQtY2hlY2stZmllbGQnKTtcbiAgICAgICAgaWYgKGVuY3J5cHRpb25UeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIC8vIEhpZGUgY2VydGlmaWNhdGUgY2hlY2sgZm9yIHVuZW5jcnlwdGVkIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAkY2VydENoZWNrRmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgLy8gVW5jaGVjayB0aGUgY2VydGlmaWNhdGUgY2hlY2sgd2hlbiBoaWRpbmdcbiAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGNlcnRpZmljYXRlIGNoZWNrIGZvciBUTFMvU1NMIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAkY2VydENoZWNrRmllbGQuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgcHJvdmlkZXIgaGludCBtZXNzYWdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBIaW50IG1lc3NhZ2VcbiAgICAgKi9cbiAgICBzaG93UHJvdmlkZXJIaW50KG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgJGhpbnQgPSAkKCcjcHJvdmlkZXItaGludCcpO1xuICAgICAgICBpZiAoJGhpbnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkKCcjTWFpbFNNVFBVc2VybmFtZScpLmFmdGVyKGA8ZGl2IGlkPVwicHJvdmlkZXItaGludFwiIGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlXCI+JHttZXNzYWdlfTwvZGl2PmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGhpbnQudGV4dChtZXNzYWdlKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIE9BdXRoMiBjYWxsYmFjayBwYXJhbWV0ZXJzIGZyb20gVVJMXG4gICAgICovXG4gICAgaGFuZGxlT0F1dGgyQ2FsbGJhY2soKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIHN1Y2Nlc3NcbiAgICAgICAgaWYgKHVybFBhcmFtcy5oYXMoJ29hdXRoX3N1Y2Nlc3MnKSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJBdXRob3JpemF0aW9uU3VjY2VzcyB8fCAnT0F1dGgyINCw0LLRgtC+0YDQuNC30LDRhtC40Y8g0YPRgdC/0LXRiNC90L4g0LfQsNCy0LXRgNGI0LXQvdCwJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIFJlbG9hZCBzZXR0aW5ncyB0byBzaG93IHVwZGF0ZWQgT0F1dGgyIHN0YXR1c1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLmxvYWRTZXR0aW5nc0Zyb21BUEkoKTtcbiAgICAgICAgICAgIC8vIENsZWFuIFVSTFxuICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCBkb2N1bWVudC50aXRsZSwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGZvciBlcnJvclxuICAgICAgICBpZiAodXJsUGFyYW1zLmhhcygnb2F1dGhfZXJyb3InKSkge1xuICAgICAgICAgICAgY29uc3QgZXJyb3IgPSB1cmxQYXJhbXMuZ2V0KCdvYXV0aF9lcnJvcicpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFxuICAgICAgICAgICAgICAgIChnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyQXV0aG9yaXphdGlvbkZhaWxlZCB8fCAn0J7RiNC40LHQutCwIE9BdXRoMiDQsNCy0YLQvtGA0LjQt9Cw0YbQuNC4OiAnKSArIGRlY29kZVVSSUNvbXBvbmVudChlcnJvcilcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBDbGVhbiBVUkxcbiAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgZG9jdW1lbnQudGl0bGUsIHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnQgT0F1dGgyIGF1dGhvcml6YXRpb24gZmxvd1xuICAgICAqL1xuICAgIHN0YXJ0T0F1dGgyRmxvdygpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykudmFsKCkgfHwgJCgnI01haWxPQXV0aDJQcm92aWRlci1kcm9wZG93bicpLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcblxuICAgICAgICBjb25zb2xlLmxvZygnW01haWxTZXR0aW5nc10gU3RhcnRpbmcgT0F1dGgyIGZsb3cgZm9yIHByb3ZpZGVyOicsIHByb3ZpZGVyKTtcblxuICAgICAgICBpZiAoIXByb3ZpZGVyIHx8IHByb3ZpZGVyID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU9BdXRoMlByb3ZpZGVyRW1wdHkgfHwgJ9CS0YvQsdC10YDQuNGC0LUgT0F1dGgyINC/0YDQvtCy0LDQudC00LXRgNCwJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBDbGllbnQgSUQgYW5kIFNlY3JldCBhcmUgY29uZmlndXJlZFxuICAgICAgICBjb25zdCBjbGllbnRJZCA9ICQoJyNNYWlsT0F1dGgyQ2xpZW50SWQnKS52YWwoKTtcbiAgICAgICAgY29uc3QgY2xpZW50U2VjcmV0ID0gJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS52YWwoKTtcblxuICAgICAgICBjb25zb2xlLmxvZygnW01haWxTZXR0aW5nc10gQ3VycmVudCBmb3JtIHZhbHVlczonKTtcbiAgICAgICAgY29uc29sZS5sb2coJyAgQ2xpZW50SWQ6JywgY2xpZW50SWQpO1xuICAgICAgICBjb25zb2xlLmxvZygnICBDbGllbnRTZWNyZXQ6JywgY2xpZW50U2VjcmV0ID8gJyoqKm1hc2tlZCoqKicgOiAnZW1wdHknKTtcblxuICAgICAgICBpZiAoIWNsaWVudElkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50SWRFbXB0eSB8fCAn0JLQstC10LTQuNGC0LUgQ2xpZW50IElEJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWNsaWVudFNlY3JldCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU9BdXRoMkNsaWVudFNlY3JldEVtcHR5IHx8ICfQktCy0LXQtNC40YLQtSBDbGllbnQgU2VjcmV0Jyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTYXZlIE9BdXRoMiBjcmVkZW50aWFscyBiZWZvcmUgc3RhcnRpbmcgdGhlIGZsb3dcbiAgICAgICAgbWFpbFNldHRpbmdzLnNhdmVPQXV0aDJDcmVkZW50aWFscyhwcm92aWRlciwgY2xpZW50SWQsIGNsaWVudFNlY3JldCk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZSBPQXV0aDIgY3JlZGVudGlhbHMgYW5kIHRoZW4gc3RhcnQgYXV0aG9yaXphdGlvbiBmbG93XG4gICAgICovXG4gICAgc2F2ZU9BdXRoMkNyZWRlbnRpYWxzKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0KSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICBNYWlsT0F1dGgyUHJvdmlkZXI6IHByb3ZpZGVyLFxuICAgICAgICAgICAgTWFpbE9BdXRoMkNsaWVudElkOiBjbGllbnRJZCxcbiAgICAgICAgICAgIE1haWxPQXV0aDJDbGllbnRTZWNyZXQ6IGNsaWVudFNlY3JldFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTWFpbFNldHRpbmdzXSBTYXZpbmcgT0F1dGgyIGNyZWRlbnRpYWxzOicsIGRhdGEpO1xuXG4gICAgICAgIC8vIFVzZSBNYWlsU2V0dGluZ3NBUEkgZm9yIGNvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmdcbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLnBhdGNoU2V0dGluZ3MoZGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01haWxTZXR0aW5nc10gT0F1dGgyIGNyZWRlbnRpYWxzIHNhdmUgcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNYWlsU2V0dGluZ3NdIE9BdXRoMiBjcmVkZW50aWFscyBzYXZlZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgICAgICAgICAvLyBDcmVkZW50aWFscyBzYXZlZCwgbm93IGdldCBPQXV0aDIgVVJMXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnByb2NlZWRXaXRoT0F1dGgyRmxvdyhwcm92aWRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNYWlsU2V0dGluZ3NdIEZhaWxlZCB0byBzYXZlIE9BdXRoMiBjcmVkZW50aWFsczonLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgPyByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpXG4gICAgICAgICAgICAgICAgICAgIDogJ0ZhaWxlZCB0byBzYXZlIE9BdXRoMiBjcmVkZW50aWFscyc7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IE9BdXRoMiBhdXRob3JpemF0aW9uIFVSTCBhbmQgb3BlbiBhdXRob3JpemF0aW9uIHdpbmRvd1xuICAgICAqL1xuICAgIHJlcXVlc3RPQXV0aDJBdXRoVXJsKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdbTWFpbFNldHRpbmdzXSBSZXF1ZXN0aW5nIGF1dGggVVJMIGZyb20gQVBJLi4uJyk7XG5cbiAgICAgICAgLy8gUmVxdWVzdCBhdXRob3JpemF0aW9uIFVSTCBmcm9tIEFQSVxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuYXV0aG9yaXplT0F1dGgyKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0LCAoYXV0aFVybCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNYWlsU2V0dGluZ3NdIFJlY2VpdmVkIHJlc3BvbnNlIGZyb20gQVBJOicsIGF1dGhVcmwgPyAnR290IFVSTCcgOiAnTm8gVVJMJyk7XG5cbiAgICAgICAgICAgIGlmIChhdXRoVXJsKSB7XG4gICAgICAgICAgICAgICAgLy8gT3BlbiBhdXRob3JpemF0aW9uIHdpbmRvd1xuICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gNjAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IDcwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBsZWZ0ID0gKHNjcmVlbi53aWR0aCAvIDIpIC0gKHdpZHRoIC8gMik7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9wID0gKHNjcmVlbi5oZWlnaHQgLyAyKSAtIChoZWlnaHQgLyAyKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGF1dGhXaW5kb3cgPSB3aW5kb3cub3BlbihcbiAgICAgICAgICAgICAgICAgICAgYXV0aFVybCxcbiAgICAgICAgICAgICAgICAgICAgJ29hdXRoMi1hdXRoJyxcbiAgICAgICAgICAgICAgICAgICAgYHdpZHRoPSR7d2lkdGh9LGhlaWdodD0ke2hlaWdodH0sbGVmdD0ke2xlZnR9LHRvcD0ke3RvcH1gXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGlmICghYXV0aFdpbmRvdykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ1BsZWFzZSBhbGxvdyBwb3B1cHMgZm9yIE9BdXRoMiBhdXRob3JpemF0aW9uJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMkF1dGhvcml6YXRpb25GYWlsZWQgfHwgJ9Ce0YjQuNCx0LrQsCDQsNCy0YLQvtGA0LjQt9Cw0YbQuNC4IE9BdXRoMicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJvY2VlZCB3aXRoIE9BdXRoMiBmbG93IGFmdGVyIGNyZWRlbnRpYWxzIGFyZSBzYXZlZFxuICAgICAqL1xuICAgIHByb2NlZWRXaXRoT0F1dGgyRmxvdyhwcm92aWRlcikge1xuICAgICAgICBjb25zb2xlLmxvZygnW01haWxTZXR0aW5nc10gUHJvY2VlZGluZyB3aXRoIE9BdXRoMiBmbG93IGZvciBwcm92aWRlcjonLCBwcm92aWRlcik7XG5cbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gR2V0IE9BdXRoMiBVUkwgd2l0aCBzYXZlZCBjcmVkZW50aWFsc1xuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuZ2V0T0F1dGgyVXJsKHByb3ZpZGVyLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTWFpbFNldHRpbmdzXSBPQXV0aDIgVVJMIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5hdXRoX3VybCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTWFpbFNldHRpbmdzXSBPcGVuaW5nIE9BdXRoMiB3aW5kb3cgd2l0aCBVUkw6JywgcmVzcG9uc2UuYXV0aF91cmwpO1xuXG4gICAgICAgICAgICAgICAgLy8gT3BlbiBPQXV0aDIgd2luZG93XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSA2MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gNzAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSAoc2NyZWVuLndpZHRoIC8gMikgLSAod2lkdGggLyAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSAoc2NyZWVuLmhlaWdodCAvIDIpIC0gKGhlaWdodCAvIDIpO1xuXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdyA9IHdpbmRvdy5vcGVuKFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5hdXRoX3VybCxcbiAgICAgICAgICAgICAgICAgICAgJ09BdXRoMkF1dGhvcml6YXRpb24nLFxuICAgICAgICAgICAgICAgICAgICBgd2lkdGg9JHt3aWR0aH0saGVpZ2h0PSR7aGVpZ2h0fSxsZWZ0PSR7bGVmdH0sdG9wPSR7dG9wfWBcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2luZG93IHdhcyBibG9ja2VkXG4gICAgICAgICAgICAgICAgaWYgKCFtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignUGxlYXNlIGFsbG93IHBvcHVwcyBmb3IgT0F1dGgyIGF1dGhvcml6YXRpb24nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNYWlsU2V0dGluZ3NdIE5vIGF1dGhfdXJsIGluIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoJ0ZhaWxlZCB0byBnZXQgT0F1dGgyIGF1dGhvcml6YXRpb24gVVJMJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgT0F1dGgyIGNhbGxiYWNrIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0ge01lc3NhZ2VFdmVudH0gZXZlbnQgLSBNZXNzYWdlIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlT0F1dGgyTWVzc2FnZShldmVudCkge1xuICAgICAgICAvLyBWYWxpZGF0ZSBvcmlnaW5cbiAgICAgICAgaWYgKGV2ZW50Lm9yaWdpbiAhPT0gd2luZG93LmxvY2F0aW9uLm9yaWdpbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIE9BdXRoMiBjYWxsYmFjayBkYXRhXG4gICAgICAgIGlmIChldmVudC5kYXRhICYmIGV2ZW50LmRhdGEudHlwZSA9PT0gJ29hdXRoMi1jYWxsYmFjaycpIHtcbiAgICAgICAgICAgIC8vIENsb3NlIE9BdXRoMiB3aW5kb3dcbiAgICAgICAgICAgIGlmIChtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93KSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQcm9jZXNzIGNhbGxiYWNrXG4gICAgICAgICAgICBNYWlsU2V0dGluZ3NBUEkuaGFuZGxlT0F1dGgyQ2FsbGJhY2soZXZlbnQuZGF0YS5wYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKCdPQXV0aDIgYXV0aG9yaXphdGlvbiBzdWNjZXNzZnVsJyk7XG4gICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5jaGVja09BdXRoMlN0YXR1cygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignT0F1dGgyIGF1dGhvcml6YXRpb24gZmFpbGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE9BdXRoMiBzdGF0dXMgZGlzcGxheSB1c2luZyBwcm92aWRlZCBzZXR0aW5ncyBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YSBjb250YWluaW5nIG9hdXRoMl9zdGF0dXNcbiAgICAgKi9cbiAgICB1cGRhdGVPQXV0aDJTdGF0dXMoc2V0dGluZ3MpIHtcbiAgICAgICAgaWYgKHNldHRpbmdzICYmIHNldHRpbmdzLm9hdXRoMl9zdGF0dXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IHNldHRpbmdzLm9hdXRoMl9zdGF0dXM7XG4gICAgICAgICAgICBjb25zdCAkc3RhdHVzRGl2ID0gJCgnI29hdXRoMi1zdGF0dXMnKTtcbiAgICAgICAgICAgIGNvbnN0ICRjbGllbnRJZEZpZWxkID0gJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgJGNsaWVudFNlY3JldEZpZWxkID0gJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS5jbG9zZXN0KCcuZmllbGQnKTtcblxuICAgICAgICAgICAgaWYgKHN0YXR1cy5jb25maWd1cmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJOYW1lID0gTWFpbFNldHRpbmdzQVBJLmdldFByb3ZpZGVyTmFtZShzdGF0dXMucHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RlZFRleHQgPSBnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyQ29ubmVjdGVkVG8ucmVwbGFjZSgne3Byb3ZpZGVyfScsIHByb3ZpZGVyTmFtZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBEb24ndCBhZGQgZXh0cmEgc3RhdHVzIHRleHQgLSBcIkNvbm5lY3RlZFwiIGFscmVhZHkgaW1wbGllcyBhdXRob3JpemVkXG4gICAgICAgICAgICAgICAgJHN0YXR1c0Rpdi5odG1sKGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBvc2l0aXZlIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2hlY2sgY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2Nvbm5lY3RlZFRleHR9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWRpc2Nvbm5lY3QnKS5zaG93KCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIENsaWVudCBJRCBhbmQgQ2xpZW50IFNlY3JldCBmaWVsZHMgd2hlbiBhdXRob3JpemVkXG4gICAgICAgICAgICAgICAgaWYgKHN0YXR1cy5hdXRob3JpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRJZEZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNsaWVudFNlY3JldEZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkY2xpZW50SWRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRTZWNyZXRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdHVzRGl2Lmh0bWwoYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJOb3RDb25maWd1cmVkfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWNvbm5lY3QnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJCgnI29hdXRoMi1kaXNjb25uZWN0JykuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBDbGllbnQgSUQgYW5kIENsaWVudCBTZWNyZXQgZmllbGRzIHdoZW4gbm90IGF1dGhvcml6ZWRcbiAgICAgICAgICAgICAgICAkY2xpZW50SWRGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsaWVudFNlY3JldEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBPQXV0aDIgY29ubmVjdGlvbiBzdGF0dXMgKG1ha2VzIEFQSSBjYWxsKVxuICAgICAqL1xuICAgIGNoZWNrT0F1dGgyU3RhdHVzKCkge1xuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlT0F1dGgyU3RhdHVzKHNldHRpbmdzKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc2Nvbm5lY3QgT0F1dGgyXG4gICAgICovXG4gICAgZGlzY29ubmVjdE9BdXRoMigpIHtcbiAgICAgICAgLy8gQ2xlYXIgT0F1dGgyIHRva2VucyBpbW1lZGlhdGVseSB3aXRob3V0IGNvbmZpcm1hdGlvblxuICAgICAgICBjb25zdCBjbGVhckRhdGEgPSB7XG4gICAgICAgICAgICBNYWlsT0F1dGgyUmVmcmVzaFRva2VuOiAnJyxcbiAgICAgICAgICAgIE1haWxPQXV0aDJBY2Nlc3NUb2tlbjogJycsXG4gICAgICAgICAgICBNYWlsT0F1dGgyVG9rZW5FeHBpcmVzOiAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5wYXRjaFNldHRpbmdzKGNsZWFyRGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gSnVzdCB1cGRhdGUgdGhlIHN0YXR1cyB3aXRob3V0IHNob3dpbmcgYSBtZXNzYWdlXG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgQ2xpZW50IElEIGFuZCBDbGllbnQgU2VjcmV0IGZpZWxkcyBhZ2FpblxuICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyQ2xpZW50SWQnKS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS5jbG9zZXN0KCcuZmllbGQnKS5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignRmFpbGVkIHRvIGRpc2Nvbm5lY3QgT0F1dGgyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUZXN0IFNNVFAgY29ubmVjdGlvblxuICAgICAqL1xuICAgIHRlc3RDb25uZWN0aW9uKCkge1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3Rlc3QtY29ubmVjdGlvbi1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHJlc3VsdEFyZWEgPSAkKCcjdGVzdC1jb25uZWN0aW9uLXJlc3VsdCcpO1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHJlc3VsdFxuICAgICAgICAkcmVzdWx0QXJlYS5yZW1vdmUoKTtcblxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLnRlc3RDb25uZWN0aW9uKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgcmVzdWx0IGFyZWEgbmV4dCB0byBidXR0b25cbiAgICAgICAgICAgIGxldCAkcmVzdWx0ID0gJCgnPGRpdiBpZD1cInRlc3QtY29ubmVjdGlvbi1yZXN1bHRcIiBjbGFzcz1cInVpIHNtYWxsIG1lc3NhZ2VcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRidXR0b24ucGFyZW50KCkuYXBwZW5kKCRyZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygncG9zaXRpdmUnKS5odG1sKCc8aSBjbGFzcz1cImNoZWNrIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgKHJlc3BvbnNlLm1lc3NhZ2VzPy5zdWNjZXNzPy5bMF0gfHwgJ0Nvbm5lY3Rpb24gc3VjY2Vzc2Z1bCcpKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZGlhZ25vc3RpY3MgaW5mbyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YT8uZGlhZ25vc3RpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlhZyA9IHJlc3BvbnNlLmRhdGEuZGlhZ25vc3RpY3M7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHNtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYEF1dGg6ICR7ZGlhZy5hdXRoX3R5cGV9LCBTZXJ2ZXI6ICR7ZGlhZy5zbXRwX2hvc3R9OiR7ZGlhZy5zbXRwX3BvcnR9LCBFbmNyeXB0aW9uOiAke2RpYWcuc210cF9lbmNyeXB0aW9ufWA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWFnLmF1dGhfdHlwZSA9PT0gJ29hdXRoMicgJiYgZGlhZy5vYXV0aDJfcHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYDxicj5PQXV0aDI6ICR7ZGlhZy5vYXV0aDJfcHJvdmlkZXJ9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvbid0IHNob3cgZXhwaXJlZCB0b2tlbiB3YXJuaW5nIGlmIGNvbm5lY3Rpb24gaXMgc3VjY2Vzc2Z1bFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgaXQgbWVhbnMgcmVmcmVzaCB0b2tlbiBpcyB3b3JraW5nIGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcub2F1dGgyX3JlZnJlc2hfdG9rZW5fZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSAnIDxzcGFuIGNsYXNzPVwidWkgZ3JlZW4gbGFiZWxcIj48aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+QXV0aG9yaXplZDwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gJzwvc21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlscyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gcmVzcG9uc2U/Lm1lc3NhZ2VzPy5lcnJvcj8uam9pbignLCAnKSB8fCAnQ29ubmVjdGlvbiBmYWlsZWQnO1xuICAgICAgICAgICAgICAgICRyZXN1bHQuYWRkQ2xhc3MoJ25lZ2F0aXZlJykuaHRtbCgnPGkgY2xhc3M9XCJ0aW1lcyBjaXJjbGUgaWNvblwiPjwvaT4gJyArIG1lc3NhZ2UpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBoaW50cyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2U/LmRhdGE/LmhpbnRzICYmIHJlc3BvbnNlLmRhdGEuaGludHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgaGludHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c3Ryb25nPlRyb3VibGVzaG9vdGluZzo8L3N0cm9uZz48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5oaW50cy5mb3JFYWNoKGhpbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGludHMgKz0gYDxsaT4ke2hpbnR9PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaGludHMgKz0gJzwvdWw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoaGludHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXV0by1oaWRlIGFmdGVyIDMwIHNlY29uZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRyZXN1bHQuZmFkZU91dCg0MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgMzAwMDApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VuZCB0ZXN0IGVtYWlsXG4gICAgICovXG4gICAgc2VuZFRlc3RFbWFpbCgpIHtcbiAgICAgICAgY29uc3QgcmVjaXBpZW50ID0gJCgnI1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCcpLnZhbCgpO1xuXG4gICAgICAgIGlmICghcmVjaXBpZW50KSB7XG4gICAgICAgICAgICAvLyBTaG93IGVycm9yIG5leHQgdG8gYnV0dG9uXG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKTtcbiAgICAgICAgICAgIGxldCAkcmVzdWx0ID0gJCgnPGRpdiBpZD1cInNlbmQtdGVzdC1yZXN1bHRcIiBjbGFzcz1cInVpIHNtYWxsIG5lZ2F0aXZlIG1lc3NhZ2VcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRyZXN1bHQuaHRtbCgnPGkgY2xhc3M9XCJ0aW1lcyBjaXJjbGUgaWNvblwiPjwvaT4gUGxlYXNlIGVudGVyIGEgcmVjaXBpZW50IGVtYWlsIGFkZHJlc3MnKTtcbiAgICAgICAgICAgICQoJyNzZW5kLXRlc3QtcmVzdWx0JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAkYnV0dG9uLnBhcmVudCgpLmFwcGVuZCgkcmVzdWx0KTtcblxuICAgICAgICAgICAgLy8gQXV0by1oaWRlIGFmdGVyIDEwIHNlY29uZHNcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRyZXN1bHQuZmFkZU91dCg0MDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgMTAwMDApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJyNzZW5kLXRlc3QtZW1haWwtYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRyZXN1bHRBcmVhID0gJCgnI3NlbmQtdGVzdC1yZXN1bHQnKTtcblxuICAgICAgICAvLyBDbGVhciBwcmV2aW91cyByZXN1bHRcbiAgICAgICAgJHJlc3VsdEFyZWEucmVtb3ZlKCk7XG5cbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICB0bzogcmVjaXBpZW50LFxuICAgICAgICAgICAgc3ViamVjdDogJ1Rlc3QgZW1haWwgZnJvbSBNaWtvUEJYJyxcbiAgICAgICAgICAgIGJvZHk6ICc8aDI+VGVzdCBFbWFpbDwvaDI+PHA+VGhpcyBpcyBhIHRlc3QgZW1haWwgZnJvbSB5b3VyIE1pa29QQlggc3lzdGVtLjwvcD4nXG4gICAgICAgIH07XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLnNlbmRUZXN0RW1haWwoZGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSByZXN1bHQgYXJlYSBuZXh0IHRvIGJ1dHRvblxuICAgICAgICAgICAgbGV0ICRyZXN1bHQgPSAkKCc8ZGl2IGlkPVwic2VuZC10ZXN0LXJlc3VsdFwiIGNsYXNzPVwidWkgc21hbGwgbWVzc2FnZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgJGJ1dHRvbi5wYXJlbnQoKS5hcHBlbmQoJHJlc3VsdCk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIGFjdHVhbCByZWNpcGllbnQgZnJvbSByZXNwb25zZVxuICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbFJlY2lwaWVudCA9IHJlc3BvbnNlLmRhdGE/LnRvIHx8IHJlY2lwaWVudDtcblxuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgbWVzc2FnZSBmcm9tIEFQSSB3aGljaCBhbHJlYWR5IGluY2x1ZGVzIHRoZSBlbWFpbCBhZGRyZXNzXG4gICAgICAgICAgICAgICAgbGV0IHN1Y2Nlc3NNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXM/LnN1Y2Nlc3M/LlswXSB8fCAnVGVzdCBlbWFpbCBzZW50JztcblxuICAgICAgICAgICAgICAgIC8vIElmIG1lc3NhZ2UgZG9lc24ndCBpbmNsdWRlIGVtYWlsIGJ1dCB3ZSBoYXZlIGl0LCBhZGQgaXRcbiAgICAgICAgICAgICAgICBpZiAoIXN1Y2Nlc3NNZXNzYWdlLmluY2x1ZGVzKCdAJykgJiYgYWN0dWFsUmVjaXBpZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NNZXNzYWdlID0gc3VjY2Vzc01lc3NhZ2UucmVwbGFjZSgn0J/QuNGB0YzQvNC+INC+0YLQv9GA0LDQstC70LXQvdC+JywgYNCf0LjRgdGM0LzQviDQvtGC0L/RgNCw0LLQu9C10L3QviDihpIgJHthY3R1YWxSZWNpcGllbnR9YCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygncG9zaXRpdmUnKS5odG1sKFxuICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJjaGVjayBjaXJjbGUgaWNvblwiPjwvaT4gJyArIHN1Y2Nlc3NNZXNzYWdlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZGlhZ25vc3RpY3MgaW5mbyBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YT8uZGlhZ25vc3RpY3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlhZyA9IHJlc3BvbnNlLmRhdGEuZGlhZ25vc3RpY3M7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkZXRhaWxzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHNtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWFnLmF1dGhfdHlwZSA9PT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gZGlhZy5vYXV0aDJfcHJvdmlkZXIgfHwgJ09BdXRoMic7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGBVc2luZzogT0F1dGgyYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ09BdXRoMicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGAgKCR7cHJvdmlkZXJ9KWA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9IGBVc2luZzogUGFzc3dvcmQgYXV0aGVudGljYXRpb25gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCwgU2VydmVyOiAke2RpYWcuc210cF9ob3N0fToke2RpYWcuc210cF9wb3J0fWA7XG4gICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gJzwvc21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgJHJlc3VsdC5hcHBlbmQoZGV0YWlscyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gcmVzcG9uc2U/Lm1lc3NhZ2VzPy5lcnJvcj8uam9pbignLCAnKSB8fCAnRmFpbGVkIHRvIHNlbmQgdGVzdCBlbWFpbCc7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygnbmVnYXRpdmUnKS5odG1sKCc8aSBjbGFzcz1cInRpbWVzIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgbWVzc2FnZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGhpbnRzIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uaGludHMgJiYgcmVzcG9uc2UuZGF0YS5oaW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBoaW50cyA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjxzdHJvbmc+VHJvdWJsZXNob290aW5nOjwvc3Ryb25nPjx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmhpbnRzLmZvckVhY2goaGludCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoaW50cyArPSBgPGxpPiR7aGludH08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBoaW50cyArPSAnPC91bD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChoaW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMzAgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5mYWRlT3V0KDQwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAzMDAwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gR2V0IHVubWFza2VkIHZhbHVlcyBmb3IgZW1haWwgZmllbGRzIEZJUlNUXG4gICAgICAgIGNvbnN0IGVtYWlsRmllbGRzID0gW1xuICAgICAgICAgICAgJ01haWxTTVRQU2VuZGVyQWRkcmVzcycsXG4gICAgICAgICAgICAnU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJyxcbiAgICAgICAgICAgICdTeXN0ZW1FbWFpbEZvck1pc3NlZCcsXG4gICAgICAgICAgICAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJ1xuICAgICAgICBdO1xuXG4gICAgICAgIGVtYWlsRmllbGRzLmZvckVhY2goZmllbGRJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IG9yaWdpbmFsVmFsdWUgPSAkZmllbGQudmFsKCkgfHwgJyc7XG4gICAgICAgICAgICAgICAgbGV0IGZpZWxkVmFsdWUgPSBvcmlnaW5hbFZhbHVlO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNYWlsU2V0dGluZ3NdIFByb2Nlc3NpbmcgZmllbGQgJHtmaWVsZElkfSwgb3JpZ2luYWwgdmFsdWU6IFwiJHtvcmlnaW5hbFZhbHVlfVwiYCk7XG5cbiAgICAgICAgICAgICAgICAvLyBGb3IgZW1haWwgaW5wdXRtYXNrLCB0cnkgZGlmZmVyZW50IGFwcHJvYWNoZXMgdG8gZ2V0IGNsZWFuIHZhbHVlXG4gICAgICAgICAgICAgICAgaWYgKGZpZWxkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdmFsdWUgY29udGFpbnMgcGxhY2Vob2xkZXIgcGF0dGVybnNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpZWxkVmFsdWUuaW5jbHVkZXMoJ19AXycpIHx8IGZpZWxkVmFsdWUgPT09ICdALicgfHwgZmllbGRWYWx1ZSA9PT0gJ0AnIHx8IGZpZWxkVmFsdWUgPT09ICdfJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNYWlsU2V0dGluZ3NdIEZpZWxkICR7ZmllbGRJZH0gY29udGFpbnMgcGxhY2Vob2xkZXIsIGNsZWFyaW5nYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWVsZFZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZ2V0IHVubWFza2VkIHZhbHVlIGZvciBlbWFpbCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaW5wdXRtYXNrIHBsdWdpbiBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlucHV0bWFzayAmJiB0eXBlb2YgJGZpZWxkLmlucHV0bWFzayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1bm1hc2tlZFZhbHVlID0gJGZpZWxkLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW01haWxTZXR0aW5nc10gRmllbGQgJHtmaWVsZElkfSB1bm1hc2tlZCB2YWx1ZTogXCIke3VubWFza2VkVmFsdWV9XCJgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVubWFza2VkVmFsdWUgJiYgdW5tYXNrZWRWYWx1ZSAhPT0gZmllbGRWYWx1ZSAmJiAhdW5tYXNrZWRWYWx1ZS5pbmNsdWRlcygnXycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZFZhbHVlID0gdW5tYXNrZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFtNYWlsU2V0dGluZ3NdIEZhaWxlZCB0byBnZXQgdW5tYXNrZWQgdmFsdWUgZm9yICR7ZmllbGRJZH06YCwgZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW01haWxTZXR0aW5nc10gRmluYWwgdmFsdWUgZm9yICR7ZmllbGRJZH06IFwiJHtmaWVsZFZhbHVlfVwiYCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbZmllbGRJZF0gPSBmaWVsZFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gTm8gc3VjY2VzcyBtZXNzYWdlIG5lZWRlZCAtIGZvcm0gc2F2ZXMgc2lsZW50bHlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSBmb3Igc2F2aW5nIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBtYWlsU2V0dGluZ3MuJGZvcm1PYmo7XG5cbiAgICAgICAgLy8gRW5hYmxlIFJFU1QgQVBJIG1vZGUgKG1vZGVybiBhcHByb2FjaCBsaWtlIEdlbmVyYWxTZXR0aW5ncylcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBNYWlsU2V0dGluZ3NBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdwYXRjaFNldHRpbmdzJztcblxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uIGZvciBjbGVhbmVyIEFQSSByZXF1ZXN0c1xuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcblxuICAgICAgICAvLyBFbmFibGUgc2VuZGluZyBvbmx5IGNoYW5nZWQgZmllbGRzIGZvciBvcHRpbWFsIFBBVENIIHNlbWFudGljc1xuICAgICAgICBGb3JtLnNlbmRPbmx5Q2hhbmdlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gTm8gcmVkaXJlY3QgYWZ0ZXIgc2F2ZSAtIHN0YXkgb24gdGhlIHNhbWUgcGFnZVxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gbnVsbDtcblxuICAgICAgICAvLyBVc2UgJyMnIGZvciBVUkwgd2hlbiB1c2luZyBhcGlTZXR0aW5nc1xuICAgICAgICBGb3JtLnVybCA9ICcjJztcblxuICAgICAgICAvLyBVc2UgZHluYW1pYyB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIGN1cnJlbnQgc3RhdGVcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFpbFNldHRpbmdzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFpbFNldHRpbmdzLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFpbFNldHRpbmdzLmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBFdmVudEJ1cyBPQXV0aDIgZXZlbnRzXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9PQXV0aDJFdmVudHMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBTdWJzY3JpYmUgdG8gT0F1dGgyIGF1dGhvcml6YXRpb24gZXZlbnRzXG4gICAgICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ29hdXRoMi1hdXRob3JpemF0aW9uJywgKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnT0F1dGgyIGV2ZW50IHJlY2VpdmVkIHZpYSBFdmVudEJ1czonLCBkYXRhKTtcblxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN1Y2Nlc3M6IHNob3cgc3VjY2VzcyBtZXNzYWdlIGFuZCByZWZyZXNoIE9BdXRoMiBzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMkF1dGhvcml6YXRpb25TdWNjZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMzAwMFxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlZnJlc2ggT0F1dGgyIHN0YXR1cyBhZnRlciBhIHNob3J0IGRlbGF5XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS5zdGF0dXMgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXJyb3I6IHNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLm1lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMlByb2Nlc3NpbmdGYWlsZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICA0MDAwXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTW9uaXRvciBmb3JtIGNoYW5nZXMgdG8gY29udHJvbCB0ZXN0IGJ1dHRvbiBzdGF0ZXNcbiAgICAgKi9cbiAgICBtb25pdG9yRm9ybUNoYW5nZXMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxseSBidXR0b25zIHNob3VsZCBiZSBlbmFibGVkIChubyBjaGFuZ2VzIHlldClcbiAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gZm9ybSBjaGFuZ2UgZXZlbnRzIC0gY2hlY2sgcmVhbCBmb3JtIHN0YXRlXG4gICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5vbignY2hhbmdlLnRlc3RidXR0b25zJywgJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIEZvcm0ncyBidWlsdC1pbiBjaGFuZ2UgZGV0ZWN0aW9uXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBbHNvIG1vbml0b3IgRm9ybSdzIGRhdGFDaGFuZ2VkIGV2ZW50c1xuICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmoub24oJ2Zvcm0uZGF0YUNoYW5nZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZXNldCBzdGF0ZSBhZnRlciBzdWNjZXNzZnVsIHNhdmVcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxBZnRlclNlbmRGb3JtID0gbWFpbFNldHRpbmdzLmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmNiQWZ0ZXJTZW5kRm9ybSA9IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgb3JpZ2luYWxBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgLy8gQWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlLCBidXR0b25zIHNob3VsZCBiZSBlbmFibGVkXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVUZXN0QnV0dG9uU3RhdGVzKCk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRlc3QgYnV0dG9uIHN0YXRlcyBiYXNlZCBvbiBmb3JtIGNoYW5nZXNcbiAgICAgKi9cbiAgICB1cGRhdGVUZXN0QnV0dG9uU3RhdGVzKCkge1xuICAgICAgICBjb25zdCAkdGVzdENvbm5lY3Rpb25CdG4gPSAkKCcjdGVzdC1jb25uZWN0aW9uLWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkc2VuZFRlc3RFbWFpbEJ0biA9ICQoJyNzZW5kLXRlc3QtZW1haWwtYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRzdWJtaXRCdG4gPSAkKCcjc3VibWl0YnV0dG9uJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZm9ybSBoYXMgdW5zYXZlZCBjaGFuZ2VzIHVzaW5nIEZvcm0ncyBidWlsdC1pbiBtZXRob2RcbiAgICAgICAgY29uc3QgaGFzQ2hhbmdlcyA9IHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmhhc0NoYW5nZXMgJiYgRm9ybS5oYXNDaGFuZ2VzKCk7XG5cbiAgICAgICAgaWYgKGhhc0NoYW5nZXMpIHtcbiAgICAgICAgICAgIC8vIEZvcm0gaGFzIGNoYW5nZXMgLSBkaXNhYmxlIHRlc3QgYnV0dG9ucyB3aXRoIHZpc3VhbCBmZWVkYmFja1xuICAgICAgICAgICAgJHRlc3RDb25uZWN0aW9uQnRuXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtdG9vbHRpcCcsIGdsb2JhbFRyYW5zbGF0ZS5tc19TYXZlQ2hhbmdlc0JlZm9yZVRlc3RpbmcpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtcG9zaXRpb24nLCAndG9wIGNlbnRlcicpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtaW52ZXJ0ZWQnLCAnJyk7XG5cbiAgICAgICAgICAgICRzZW5kVGVzdEVtYWlsQnRuXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtdG9vbHRpcCcsIGdsb2JhbFRyYW5zbGF0ZS5tc19TYXZlQ2hhbmdlc0JlZm9yZVRlc3RpbmcpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtcG9zaXRpb24nLCAndG9wIGNlbnRlcicpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtaW52ZXJ0ZWQnLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSBzYXZlIGJ1dHRvbiBpcyB2aXNpYmxlL2VuYWJsZWQgd2hlbiB0aGVyZSBhcmUgY2hhbmdlc1xuICAgICAgICAgICAgJHN1Ym1pdEJ0bi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBObyBjaGFuZ2VzIC0gZW5hYmxlIHRlc3QgYnV0dG9uc1xuICAgICAgICAgICAgJHRlc3RDb25uZWN0aW9uQnRuXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtdG9vbHRpcCcpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtcG9zaXRpb24nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLWludmVydGVkJyk7XG5cbiAgICAgICAgICAgICRzZW5kVGVzdEVtYWlsQnRuXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtdG9vbHRpcCcpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtcG9zaXRpb24nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLWludmVydGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIHRvb2x0aXBzIGZvciBidXR0b25zXG4gICAgICAgICQoJy51aS5idXR0b25bZGF0YS10b29sdGlwXScpLnBvcHVwKCk7XG4gICAgfSxcblxufTtcblxuLy8gSW5pdGlhbGl6ZSB3aGVuIERPTSBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplKCk7XG5cbiAgICAvLyBFbnN1cmUgY2xpY2sgcHJldmVudGlvbiBmb3IgdG9vbHRpcCBpY29ucyBpbiBjaGVja2JveGVzXG4gICAgLy8gVGhpcyBwcmV2ZW50cyBjaGVja2JveCB0b2dnbGUgd2hlbiBjbGlja2luZyBvbiB0b29sdGlwIGljb25cbiAgICAkKCcuZmllbGQtaW5mby1pY29uJykub2ZmKCdjbGljay50b29sdGlwLXByZXZlbnQnKS5vbignY2xpY2sudG9vbHRpcC1wcmV2ZW50JywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbn0pOyJdfQ==