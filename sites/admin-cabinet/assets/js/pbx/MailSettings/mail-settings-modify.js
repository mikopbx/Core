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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsibWFpbFNldHRpbmdzIiwiJGZvcm1PYmoiLCIkIiwiJGNoZWNrQm94ZXMiLCIkbWVudUl0ZW1zIiwib2F1dGgyV2luZG93IiwiZGF0YUxvYWRlZCIsImdldFZhbGlkYXRlUnVsZXMiLCJydWxlcyIsImF1dGhUeXBlIiwidmFsIiwiTWFpbFNNVFBTZW5kZXJBZGRyZXNzIiwiaWRlbnRpZmllciIsIm9wdGlvbmFsIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zX1ZhbGlkYXRlU2VuZGVyQWRkcmVzc0ludmFsaWQiLCJTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwiLCJtc19WYWxpZGF0ZVN5c3RlbUVtYWlsSW52YWxpZCIsIlN5c3RlbUVtYWlsRm9yTWlzc2VkIiwidmFsdWUiLCJtc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCIsIlZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCIsIm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkIiwiTWFpbFNNVFBIb3N0IiwibXNfVmFsaWRhdGVTTVRQSG9zdEludmFsaWQiLCJNYWlsU01UUFBvcnQiLCJtc19WYWxpZGF0ZVNNVFBQb3J0SW52YWxpZCIsIk1haWxPQXV0aDJQcm92aWRlciIsIk1haWxPQXV0aDJDbGllbnRJZCIsIk1haWxPQXV0aDJDbGllbnRTZWNyZXQiLCJNYWlsU01UUFVzZXJuYW1lIiwibXNfVmFsaWRhdGVTTVRQVXNlcm5hbWVFbWFpbCIsIk1haWxTTVRQUGFzc3dvcmQiLCJkZXBlbmRzIiwibXNfVmFsaWRhdGVTTVRQUGFzc3dvcmRFbXB0eSIsInVwZGF0ZVZhbGlkYXRpb25SdWxlcyIsIm5ld1J1bGVzIiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmb3JtIiwiZmllbGRzIiwiaW5saW5lIiwib24iLCJpbml0aWFsaXplIiwiaGFuZGxlT0F1dGgyQ2FsbGJhY2siLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJjaGVja2JveCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ1cGRhdGVQb3J0QmFzZWRPbkVuY3J5cHRpb24iLCJpbml0aWFsRW5jcnlwdGlvbiIsImNsZWFyYWJsZSIsImZvcmNlU2VsZWN0aW9uIiwidXBkYXRlU01UUFNldHRpbmdzRm9yUHJvdmlkZXIiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVPQXV0aDIiLCJpbml0aWFsaXplQXV0aFR5cGVIYW5kbGVycyIsImluaXRpYWxpemVOb3RpZmljYXRpb25IYW5kbGVycyIsImluaXRpYWxpemVUZXN0QnV0dG9ucyIsImluaXRpYWxpemVJbnB1dE1hc2tzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwiLCJzdWJzY3JpYmVUb09BdXRoMkV2ZW50cyIsIm1vbml0b3JGb3JtQ2hhbmdlcyIsImxvYWREYXRhIiwiTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJidWlsZFRvb2x0aXBDb250ZW50IiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsImJ1aWxkQ29udGVudCIsImVtYWlsRmllbGRzIiwiZm9yRWFjaCIsImZpZWxkSWQiLCIkZmllbGQiLCJsZW5ndGgiLCJpbnB1dG1hc2siLCJzaG93TWFza09uSG92ZXIiLCJwbGFjZWhvbGRlciIsIm9uQmVmb3JlUGFzdGUiLCJwYXN0ZWRWYWx1ZSIsIm9uY2xlYXJlZCIsIiRpbnB1dCIsImFkZENsYXNzIiwiTWFpbFNldHRpbmdzQVBJIiwiZ2V0U2V0dGluZ3MiLCJzZXR0aW5ncyIsIm9mZiIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJkYXRhIiwiYm9vbGVhbkZpZWxkcyIsImtleSIsInVuZGVmaW5lZCIsIk1haWxTTVRQQXV0aFR5cGUiLCJhZnRlclBvcHVsYXRlIiwiTWFpbFNNVFBVc2VUTFMiLCJlbmNyeXB0aW9uVmFsdWUiLCJNYWlsU01UUENlcnRDaGVjayIsImlzQ2hlY2tlZCIsImNsb3Nlc3QiLCJNYWlsRW5hYmxlTm90aWZpY2F0aW9ucyIsInRvZ2dsZUF1dGhGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RhcnRPQXV0aDJGbG93IiwiZGlzY29ubmVjdE9BdXRoMiIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJoYW5kbGVPQXV0aDJNZXNzYWdlIiwiZGF0YUNoYW5nZWQiLCJ0YXJnZXQiLCJjdXJyZW50QXV0aFR5cGUiLCJ0b2dnbGVBdXRoRmllbGRzV2l0aG91dFN0YXR1cyIsIiR1c2VybmFtZUZpZWxkIiwiJHBhc3N3b3JkRmllbGQiLCIkb2F1dGgyU2VjdGlvbiIsInNob3ciLCJoaWRlIiwidXBkYXRlT0F1dGgyU3RhdHVzIiwiY2hlY2tPQXV0aDJTdGF0dXMiLCJjdXJyZW50VGFyZ2V0IiwiaGFzQ2xhc3MiLCJoYXNDaGFuZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93V2FybmluZyIsIm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZyIsInRlc3RDb25uZWN0aW9uIiwic2VuZFRlc3RFbWFpbCIsImVtYWlsIiwicHJvdmlkZXIiLCJkZXRlY3RQcm92aWRlciIsInNob3dQcm92aWRlckhpbnQiLCJhdXRvRmlsbFNNVFBTZXR0aW5ncyIsImdvb2dsZSIsImhvc3QiLCJwb3J0IiwidGxzIiwibWljcm9zb2Z0IiwieWFuZGV4IiwicHJvdmlkZXJTZXR0aW5ncyIsIiRlbmNyeXB0aW9uRHJvcGRvd24iLCJlbmNyeXB0aW9uIiwiY2VydENoZWNrIiwiZW5jcnlwdGlvblR5cGUiLCIkcG9ydEZpZWxkIiwiY3VycmVudFBvcnQiLCJzdGFuZGFyZFBvcnRzIiwiaW5jbHVkZXMiLCIkY2VydENoZWNrRmllbGQiLCJtZXNzYWdlIiwiJGhpbnQiLCJhZnRlciIsInRleHQiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJsb2NhdGlvbiIsInNlYXJjaCIsImhhcyIsImxvYWRTZXR0aW5nc0Zyb21BUEkiLCJyZXBsYWNlU3RhdGUiLCJkb2N1bWVudCIsInRpdGxlIiwicGF0aG5hbWUiLCJlcnJvciIsImdldCIsInNob3dFcnJvciIsIm1zX09BdXRoMkF1dGhvcml6YXRpb25GYWlsZWQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJjb25zb2xlIiwibG9nIiwibXNfVmFsaWRhdGVPQXV0aDJQcm92aWRlckVtcHR5IiwiY2xpZW50SWQiLCJjbGllbnRTZWNyZXQiLCJtc19WYWxpZGF0ZU9BdXRoMkNsaWVudElkRW1wdHkiLCJtc19WYWxpZGF0ZU9BdXRoMkNsaWVudFNlY3JldEVtcHR5Iiwic2F2ZU9BdXRoMkNyZWRlbnRpYWxzIiwicGF0Y2hTZXR0aW5ncyIsInJlc3BvbnNlIiwicmVzdWx0IiwicHJvY2VlZFdpdGhPQXV0aDJGbG93IiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJqb2luIiwicmVxdWVzdE9BdXRoMkF1dGhVcmwiLCJhdXRob3JpemVPQXV0aDIiLCJhdXRoVXJsIiwid2lkdGgiLCJoZWlnaHQiLCJsZWZ0Iiwic2NyZWVuIiwidG9wIiwiYXV0aFdpbmRvdyIsIm9wZW4iLCJnZXRPQXV0aDJVcmwiLCJhdXRoX3VybCIsImV2ZW50Iiwib3JpZ2luIiwiY2xvc2UiLCJwYXJhbXMiLCJzaG93SW5mb3JtYXRpb24iLCJvYXV0aDJfc3RhdHVzIiwic3RhdHVzIiwiJHN0YXR1c0RpdiIsIiRjbGllbnRJZEZpZWxkIiwiJGNsaWVudFNlY3JldEZpZWxkIiwiY29uZmlndXJlZCIsInByb3ZpZGVyTmFtZSIsImdldFByb3ZpZGVyTmFtZSIsImNvbm5lY3RlZFRleHQiLCJtc19PQXV0aDJDb25uZWN0ZWRUbyIsInJlcGxhY2UiLCJodG1sIiwiYXV0aG9yaXplZCIsIm1zX09BdXRoMk5vdENvbmZpZ3VyZWQiLCJjbGVhckRhdGEiLCJNYWlsT0F1dGgyUmVmcmVzaFRva2VuIiwiTWFpbE9BdXRoMkFjY2Vzc1Rva2VuIiwiTWFpbE9BdXRoMlRva2VuRXhwaXJlcyIsIiRidXR0b24iLCIkcmVzdWx0QXJlYSIsInJlbW92ZSIsIiRyZXN1bHQiLCJwYXJlbnQiLCJhcHBlbmQiLCJzdWNjZXNzIiwiZGlhZ25vc3RpY3MiLCJkaWFnIiwiZGV0YWlscyIsImF1dGhfdHlwZSIsInNtdHBfaG9zdCIsInNtdHBfcG9ydCIsInNtdHBfZW5jcnlwdGlvbiIsIm9hdXRoMl9wcm92aWRlciIsIm9hdXRoMl9yZWZyZXNoX3Rva2VuX2V4aXN0cyIsImhpbnRzIiwiaGludCIsInNldFRpbWVvdXQiLCJmYWRlT3V0IiwicmVjaXBpZW50IiwidG8iLCJzdWJqZWN0IiwiYm9keSIsImFjdHVhbFJlY2lwaWVudCIsInN1Y2Nlc3NNZXNzYWdlIiwiY2JCZWZvcmVTZW5kRm9ybSIsIm9yaWdpbmFsVmFsdWUiLCJmaWVsZFZhbHVlIiwidW5tYXNrZWRWYWx1ZSIsIndhcm4iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJzZW5kT25seUNoYW5nZWQiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInVybCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibXNfT0F1dGgyUHJvY2Vzc2luZ0ZhaWxlZCIsInVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMiLCJvcmlnaW5hbEFmdGVyU2VuZEZvcm0iLCIkdGVzdENvbm5lY3Rpb25CdG4iLCIkc2VuZFRlc3RFbWFpbEJ0biIsIiRzdWJtaXRCdG4iLCJhdHRyIiwicmVtb3ZlQXR0ciIsInBvcHVwIiwicmVhZHkiLCJzdG9wUHJvcGFnYXRpb24iXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Es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a29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgVXNlck1lc3NhZ2UsIE1haWxTZXR0aW5nc0FQSSwgQ29uZmlnLCBUb29sdGlwQnVpbGRlciwgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG1haWwgc2V0dGluZ3Mgd2l0aCBPQXV0aDIgc3VwcG9ydFxuICpcbiAqIEBtb2R1bGUgbWFpbFNldHRpbmdzXG4gKi9cbmNvbnN0IG1haWxTZXR0aW5ncyA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbWFpbC1zZXR0aW5ncy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgY2hlY2tib3hlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGVja0JveGVzOiAkKCcjbWFpbC1zZXR0aW5ncy1mb3JtIC5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1lbnUgaXRlbXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWVudUl0ZW1zOiAkKCcjbWFpbC1zZXR0aW5ncy1tZW51IC5pdGVtJyksXG5cbiAgICAvKipcbiAgICAgKiBPQXV0aDIgd2luZG93IHJlZmVyZW5jZVxuICAgICAqIEB0eXBlIHtXaW5kb3d8bnVsbH1cbiAgICAgKi9cbiAgICBvYXV0aDJXaW5kb3c6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHRyYWNrIGlmIGluaXRpYWwgZGF0YSBoYXMgYmVlbiBsb2FkZWQgZnJvbSBBUElcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBkYXRhTG9hZGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gZm9ybSBzdGF0ZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCBydWxlcyA9IHt9O1xuICAgICAgICBjb25zdCBhdXRoVHlwZSA9ICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdOmNoZWNrZWQnKS52YWwoKTtcblxuICAgICAgICAvLyBCYXNlIGVtYWlsIHZhbGlkYXRpb24gcnVsZXMgLSBhbHdheXMgYXBwbHkgd2hlbiBmaWVsZHMgaGF2ZSB2YWx1ZXNcbiAgICAgICAgcnVsZXMuTWFpbFNNVFBTZW5kZXJBZGRyZXNzID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxTTVRQU2VuZGVyQWRkcmVzcycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVNlbmRlckFkZHJlc3NJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLlN5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTeXN0ZW1FbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuU3lzdGVtRW1haWxGb3JNaXNzZWQgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU3lzdGVtRW1haWxGb3JNaXNzZWQnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnXig/IS4qX0BfXFxcXC5fKS4qJCcsICAvLyBSZWplY3QgX0BfLl8gcGF0dGVyblxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZU1pc3NlZEVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtYWlsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVNaXNzZWRFbWFpbEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeKD8hLipfQF9cXFxcLl8pLiokJywgIC8vIFJlamVjdCBfQF8uXyBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlVm9pY2VtYWlsRW1haWxJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19WYWxpZGF0ZVZvaWNlbWFpbEVtYWlsSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTTVRQIGNvbmZpZ3VyYXRpb24gcnVsZXMgLSBhbHdheXMgYXZhaWxhYmxlIGJ1dCBvcHRpb25hbFxuICAgICAgICBydWxlcy5NYWlsU01UUEhvc3QgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnTWFpbFNNVFBIb3N0JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU01UUEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLk1haWxTTVRQUG9ydCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFBvcnQnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXV0aGVudGljYXRpb24tc3BlY2lmaWMgcnVsZXNcbiAgICAgICAgaWYgKGF1dGhUeXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgLy8gT0F1dGgyIGZpZWxkcyAtIG9wdGlvbmFsXG4gICAgICAgICAgICBydWxlcy5NYWlsT0F1dGgyUHJvdmlkZXIgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxPQXV0aDJQcm92aWRlcicsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcnVsZXMuTWFpbE9BdXRoMkNsaWVudElkID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsT0F1dGgyQ2xpZW50SWQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJ1bGVzLk1haWxPQXV0aDJDbGllbnRTZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ01haWxPQXV0aDJDbGllbnRTZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFVzZXJuYW1lIGZvciBPQXV0aDIgc2hvdWxkIGJlIGVtYWlsIHdoZW4gZmlsbGVkXG4gICAgICAgICAgICBydWxlcy5NYWlsU01UUFVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFVzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1haWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVTTVRQVXNlcm5hbWVFbWFpbCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBVc2VybmFtZSAtIG9wdGlvbmFsXG4gICAgICAgICAgICBydWxlcy5NYWlsU01UUFVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFVzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBQYXNzd29yZCAtIHJlcXVpcmVkIGlmIHVzZXJuYW1lIGlzIHByb3ZpZGVkXG4gICAgICAgICAgICBydWxlcy5NYWlsU01UUFBhc3N3b3JkID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdNYWlsU01UUFBhc3N3b3JkJyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiAnTWFpbFNNVFBVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlU01UUFBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIGFuZCByZWluaXRpYWxpemUgZm9ybVxuICAgICAqL1xuICAgIHVwZGF0ZVZhbGlkYXRpb25SdWxlcygpIHtcbiAgICAgICAgLy8gR2V0IGZyZXNoIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gY3VycmVudCBzdGF0ZVxuICAgICAgICBjb25zdCBuZXdSdWxlcyA9IG1haWxTZXR0aW5ncy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIEZvcm0udmFsaWRhdGVSdWxlc1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBuZXdSdWxlcztcblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIHdpdGggbmV3IHJ1bGVzXG4gICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdkZXN0cm95Jyk7XG4gICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKHtcbiAgICAgICAgICAgIGZpZWxkczogbmV3UnVsZXMsXG4gICAgICAgICAgICBpbmxpbmU6IHRydWUsXG4gICAgICAgICAgICBvbjogJ2JsdXInXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtYWlsIHNldHRpbmdzIHBhZ2UuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIE9BdXRoMiBjYWxsYmFjayBwYXJhbWV0ZXJzIGluIFVSTFxuICAgICAgICBtYWlsU2V0dGluZ3MuaGFuZGxlT0F1dGgyQ2FsbGJhY2soKTtcblxuICAgICAgICBtYWlsU2V0dGluZ3MuJG1lbnVJdGVtcy50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuICAgICAgICBtYWlsU2V0dGluZ3MuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyB3aXRoIHNwZWNpZmljIGNvbmZpZ3VyYXRpb25zXG4gICAgICAgIC8vIERvbid0IGluaXRpYWxpemUgYWxsIGRyb3Bkb3ducyBnZW5lcmljYWxseSB0byBhdm9pZCBkb3VibGUgaW5pdGlhbGl6YXRpb25cblxuICAgICAgICAvLyBJbml0aWFsaXplIGVuY3J5cHRpb24gdHlwZSBkcm9wZG93biB3aXRoIHBvcnQgYXV0by11cGRhdGVcbiAgICAgICAgJCgnI01haWxTTVRQVXNlVExTLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlUG9ydEJhc2VkT25FbmNyeXB0aW9uKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaW5pdGlhbCBlbmNyeXB0aW9uIHR5cGUgdG8gc2hvdy9oaWRlIGNlcnRpZmljYXRlIGNoZWNrXG4gICAgICAgIGNvbnN0IGluaXRpYWxFbmNyeXB0aW9uID0gJCgnI01haWxTTVRQVXNlVExTJykudmFsKCkgfHwgJ25vbmUnO1xuICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlUG9ydEJhc2VkT25FbmNyeXB0aW9uKGluaXRpYWxFbmNyeXB0aW9uKTtcblxuICAgICAgICAvLyBTcGVjaWFsIGluaXRpYWxpemF0aW9uIGZvciBPQXV0aDIgcHJvdmlkZXIgZHJvcGRvd24gKFY1LjAgcGF0dGVybilcbiAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlci1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIGNsZWFyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVTTVRQU2V0dGluZ3NGb3JQcm92aWRlcih2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE5vIG90aGVyIGRyb3Bkb3ducyBpbiB0aGUgZm9ybSBuZWVkIGluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIE1haWxTTVRQVXNlVExTIGFuZCBNYWlsT0F1dGgyUHJvdmlkZXIgYXJlIHRoZSBvbmx5IGRyb3Bkb3duc1xuXG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZU9BdXRoMigpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZUF1dGhUeXBlSGFuZGxlcnMoKTtcbiAgICAgICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemVOb3RpZmljYXRpb25IYW5kbGVycygpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZVRlc3RCdXR0b25zKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5pbml0aWFsaXplSW5wdXRNYXNrcygpO1xuICAgICAgICBtYWlsU2V0dGluZ3MuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIG1haWxTZXR0aW5ncy5kZXRlY3RQcm92aWRlckZyb21FbWFpbCgpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBPQXV0aDIgZXZlbnRzXG4gICAgICAgIG1haWxTZXR0aW5ncy5zdWJzY3JpYmVUb09BdXRoMkV2ZW50cygpO1xuXG4gICAgICAgIC8vIE1vbml0b3IgZm9ybSBjaGFuZ2VzIHRvIGNvbnRyb2wgdGVzdCBidXR0b25zXG4gICAgICAgIG1haWxTZXR0aW5ncy5tb25pdG9yRm9ybUNoYW5nZXMoKTtcblxuICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSBBUEkgYWZ0ZXIgYWxsIFVJIGVsZW1lbnRzIGFyZSBpbml0aWFsaXplZFxuICAgICAgICBtYWlsU2V0dGluZ3MubG9hZERhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIFVzZSBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlciB0byBpbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIGlmICh0eXBlb2YgTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlci5pbml0aWFsaXplVG9vbHRpcHMobWFpbFNldHRpbmdzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBEZWxlZ2F0ZXMgdG8gVG9vbHRpcEJ1aWxkZXIgZm9yIGNvbnNpc3RlbnQgdG9vbHRpcCBmb3JtYXR0aW5nXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEgLSBDb25maWd1cmF0aW9uIG9iamVjdCBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQodG9vbHRpcERhdGEpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBpbnB1dCBtYXNrcyBmb3IgZW1haWwgZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlucHV0TWFza3MoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZW1haWwgaW5wdXQgbWFza3MgZm9yIGFsbCBlbWFpbCBmaWVsZHNcbiAgICAgICAgY29uc3QgZW1haWxGaWVsZHMgPSBbXG4gICAgICAgICAgICAnTWFpbFNNVFBTZW5kZXJBZGRyZXNzJyxcbiAgICAgICAgICAgICdTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnLFxuICAgICAgICAgICAgJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJyxcbiAgICAgICAgICAgICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnXG4gICAgICAgIF07XG5cbiAgICAgICAgZW1haWxGaWVsZHMuZm9yRWFjaChmaWVsZElkID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZmllbGQuaW5wdXRtYXNrKCdlbWFpbCcsIHtcbiAgICAgICAgICAgICAgICAgICAgc2hvd01hc2tPbkhvdmVyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICcnLCAvLyBObyBwbGFjZWhvbGRlciBjaGFyYWN0ZXJcbiAgICAgICAgICAgICAgICAgICAgb25CZWZvcmVQYXN0ZTogZnVuY3Rpb24ocGFzdGVkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENsZWFuIHBsYWNlaG9sZGVyIHZhbHVlcyBvbiBwYXN0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhc3RlZFZhbHVlID09PSAnX0BfLl8nIHx8IHBhc3RlZFZhbHVlID09PSAnQCcgfHwgcGFzdGVkVmFsdWUgPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhc3RlZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbmNsZWFyZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGZpZWxkIHZhbHVlIHdoZW4gbWFzayBpcyBjbGVhcmVkXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRpbnB1dC52YWwoKSA9PT0gJ19AXy5fJyB8fCAkaW5wdXQudmFsKCkgPT09ICdAJyB8fCAkaW5wdXQudmFsKCkgPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGlucHV0LnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIENsZWFuIGluaXRpYWwgcGxhY2Vob2xkZXIgdmFsdWVzXG4gICAgICAgICAgICAgICAgaWYgKCRmaWVsZC52YWwoKSA9PT0gJ19AXy5fJyB8fCAkZmllbGQudmFsKCkgPT09ICdAJyB8fCAkZmllbGQudmFsKCkgPT09ICdfQF8nKSB7XG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC52YWwoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbWFpbCBzZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZERhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIG91ciBjaGFuZ2UgaGFuZGxlciB0byBwcmV2ZW50IGR1cGxpY2F0ZSBBUEkgY2FsbFxuICAgICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJNYWlsU01UUEF1dGhUeXBlXCJdJykub2ZmKCdjaGFuZ2UubWFpbHNldHRpbmdzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaCBsaWtlIEdlbmVyYWxTZXR0aW5nc1xuICAgICAgICAgICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoc2V0dGluZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSRVNUIEFQSSByZXR1cm5zIGJvb2xlYW5zIGZvciBjaGVja2JveCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgYm9vbGVhbiB2YWx1ZXMgdG8gc3RyaW5ncyBmb3IgU2VtYW50aWMgVUkgY2hlY2tib3hlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9vbGVhbkZpZWxkcyA9IFsnTWFpbFNNVFBDZXJ0Q2hlY2snLCAnTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvb2xlYW5GaWVsZHMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IGJvb2xlYW4gdG8gc3RyaW5nIFwiMVwiIG9yIFwiMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFba2V5XSA9IChkYXRhW2tleV0gPT09IHRydWUgfHwgZGF0YVtrZXldID09PSAxIHx8IGRhdGFba2V5XSA9PT0gJzEnKSA/ICcxJyA6ICcwJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIHJhZGlvIGJ1dHRvbiB2YWx1ZSBpcyBzZXQgKHdpbGwgYmUgaGFuZGxlZCBzaWxlbnRseSBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhLk1haWxTTVRQQXV0aFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLk1haWxTTVRQQXV0aFR5cGUgPSAncGFzc3dvcmQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbGVhbiB1cCBwbGFjZWhvbGRlciBlbWFpbCB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVtYWlsRmllbGRzID0gWydTeXN0ZW1FbWFpbEZvck1pc3NlZCcsICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVtYWlsRmllbGRzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtrZXldID09PSAnX0BfLl8nIHx8IGRhdGFba2V5XSA9PT0gJ0AnIHx8IGRhdGFba2V5XSA9PT0gJ19AXycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVtrZXldID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBPQXV0aDIgcHJvdmlkZXIgZHJvcGRvd24gKFY1LjAgcGF0dGVybilcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxPQXV0aDJQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXItZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5NYWlsT0F1dGgyUHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNNYWlsT0F1dGgyUHJvdmlkZXInKS52YWwoZGF0YS5NYWlsT0F1dGgyUHJvdmlkZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBlbmNyeXB0aW9uIHR5cGUgZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLk1haWxTTVRQVXNlVExTICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IG9sZCBib29sZWFuIHZhbHVlcyB0byBuZXcgZm9ybWF0IGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmNyeXB0aW9uVmFsdWUgPSBkYXRhLk1haWxTTVRQVXNlVExTO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmNyeXB0aW9uVmFsdWUgPT09IHRydWUgfHwgZW5jcnlwdGlvblZhbHVlID09PSAxIHx8IGVuY3J5cHRpb25WYWx1ZSA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuY3J5cHRpb25WYWx1ZSA9ICd0bHMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW5jcnlwdGlvblZhbHVlID09PSBmYWxzZSB8fCBlbmNyeXB0aW9uVmFsdWUgPT09IDAgfHwgZW5jcnlwdGlvblZhbHVlID09PSAnMCcgfHwgZW5jcnlwdGlvblZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmNyeXB0aW9uVmFsdWUgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgZHJvcGRvd24gdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZW5jcnlwdGlvblZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMnKS52YWwoZW5jcnlwdGlvblZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgY2hlY2tib3hlcyB1c2luZyBTZW1hbnRpYyBVSVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuTWFpbFNNVFBDZXJ0Q2hlY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IGRhdGEuTWFpbFNNVFBDZXJ0Q2hlY2sgPT09IHRydWUgfHwgZGF0YS5NYWlsU01UUENlcnRDaGVjayA9PT0gMSB8fCBkYXRhLk1haWxTTVRQQ2VydENoZWNrID09PSAnMSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBDZXJ0Q2hlY2snKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBDZXJ0Q2hlY2snKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IGRhdGEuTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMgPT09IHRydWUgfHwgZGF0YS5NYWlsRW5hYmxlTm90aWZpY2F0aW9ucyA9PT0gMSB8fCBkYXRhLk1haWxFbmFibGVOb3RpZmljYXRpb25zID09PSAnMSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnMnKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgT0F1dGgyIHN0YXR1cyBpZiBPQXV0aDIgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJhZGlvIGJ1dHRvbiBpcyBhbHJlYWR5IHNldCBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdXRoVHlwZSA9IGRhdGEuTWFpbFNNVFBBdXRoVHlwZSB8fCAncGFzc3dvcmQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHMoYXV0aFR5cGUsIGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBsb2FkZWQgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVWYWxpZGF0aW9uUnVsZXMoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyB0aGF0IGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuZGF0YUxvYWRlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmUtZW5hYmxlIG91ciBjaGFuZ2UgaGFuZGxlciBmb3IgZnV0dXJlIHVzZXIgaW50ZXJhY3Rpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MucmVBdHRhY2hBdXRoVHlwZUhhbmRsZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBPQXV0aDIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVPQXV0aDIoKSB7XG4gICAgICAgIC8vIE9BdXRoMiBjb25uZWN0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3Muc3RhcnRPQXV0aDJGbG93KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE9BdXRoMiBkaXNjb25uZWN0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNvYXV0aDItZGlzY29ubmVjdCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuZGlzY29ubmVjdE9BdXRoMigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMaXN0ZW4gZm9yIE9BdXRoMiBjYWxsYmFjayBtZXNzYWdlc1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG1haWxTZXR0aW5ncy5oYW5kbGVPQXV0aDJNZXNzYWdlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBub3RpZmljYXRpb24gZW5hYmxlL2Rpc2FibGUgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTm90aWZpY2F0aW9uSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBub3RpZmljYXRpb25zIGVuYWJsZS9kaXNhYmxlIGNoZWNrYm94XG4gICAgICAgICQoJyNNYWlsRW5hYmxlTm90aWZpY2F0aW9ucycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVZhbGlkYXRpb25SdWxlcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF0dGFjaCBhdXRoIHR5cGUgY2hhbmdlIGhhbmRsZXJcbiAgICAgKi9cbiAgICByZUF0dGFjaEF1dGhUeXBlSGFuZGxlcigpIHtcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cIk1haWxTTVRQQXV0aFR5cGVcIl0nKS5vbignY2hhbmdlLm1haWxzZXR0aW5ncycsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhdXRoVHlwZSA9ICQoZS50YXJnZXQpLnZhbCgpO1xuICAgICAgICAgICAgLy8gV2hlbiB1c2VyIG1hbnVhbGx5IGNoYW5nZXMgYXV0aCB0eXBlLCBjaGVjayBPQXV0aDIgc3RhdHVzIGlmIG5lZWRlZFxuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHMoYXV0aFR5cGUpO1xuICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgd2hlbiBhdXRoIHR5cGUgY2hhbmdlc1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVZhbGlkYXRpb25SdWxlcygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdXRoZW50aWNhdGlvbiB0eXBlIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUF1dGhUeXBlSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEF0dGFjaCBpbml0aWFsIGhhbmRsZXJcbiAgICAgICAgbWFpbFNldHRpbmdzLnJlQXR0YWNoQXV0aFR5cGVIYW5kbGVyKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvbiBwYWdlIGxvYWQgLSBkb24ndCBjaGVjayBPQXV0aDIgc3RhdHVzIHlldCAod2lsbCBiZSBkb25lIGluIGxvYWREYXRhKVxuICAgICAgICBjb25zdCBjdXJyZW50QXV0aFR5cGUgPSAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXTpjaGVja2VkJykudmFsKCkgfHwgJ3Bhc3N3b3JkJztcbiAgICAgICAgbWFpbFNldHRpbmdzLnRvZ2dsZUF1dGhGaWVsZHNXaXRob3V0U3RhdHVzKGN1cnJlbnRBdXRoVHlwZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBhdXRoZW50aWNhdGlvbiBmaWVsZHMgd2l0aG91dCBjaGVja2luZyBPQXV0aDIgc3RhdHVzIChmb3IgaW5pdGlhbCBzZXR1cClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYXV0aFR5cGUgLSBBdXRoZW50aWNhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdG9nZ2xlQXV0aEZpZWxkc1dpdGhvdXRTdGF0dXMoYXV0aFR5cGUpIHtcbiAgICAgICAgY29uc3QgJHVzZXJuYW1lRmllbGQgPSAkKCcjTWFpbFNNVFBVc2VybmFtZScpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICBjb25zdCAkcGFzc3dvcmRGaWVsZCA9ICQoJyNNYWlsU01UUFBhc3N3b3JkJykuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgIGNvbnN0ICRvYXV0aDJTZWN0aW9uID0gJCgnI29hdXRoMi1hdXRoLXNlY3Rpb24nKTtcblxuICAgICAgICBpZiAoYXV0aFR5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICAvLyBGb3IgT0F1dGgyOiBzaG93IHVzZXJuYW1lIChyZXF1aXJlZCBmb3IgZW1haWwgaWRlbnRpZmljYXRpb24pLCBoaWRlIHBhc3N3b3JkXG4gICAgICAgICAgICAkdXNlcm5hbWVGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAkcGFzc3dvcmRGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAkb2F1dGgyU2VjdGlvbi5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIHBhc3N3b3JkIGZpZWxkIGVycm9yc1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnTWFpbFNNVFBQYXNzd29yZCcpO1xuICAgICAgICAgICAgJHBhc3N3b3JkRmllbGQucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3IgcGFzc3dvcmQgYXV0aDogc2hvdyBib3RoIHVzZXJuYW1lIGFuZCBwYXNzd29yZFxuICAgICAgICAgICAgJHVzZXJuYW1lRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJHBhc3N3b3JkRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJG9hdXRoMlNlY3Rpb24uaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBPQXV0aDIgZmllbGQgZXJyb3JzXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdNYWlsT0F1dGgyUHJvdmlkZXInKTtcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ01haWxPQXV0aDJDbGllbnRJZCcpO1xuICAgICAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpO1xuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRTZWNyZXQnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYXV0aGVudGljYXRpb24gZmllbGRzIGJhc2VkIG9uIHR5cGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYXV0aFR5cGUgLSBBdXRoZW50aWNhdGlvbiB0eXBlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtzZXR0aW5nc10gLSBPcHRpb25hbCBzZXR0aW5ncyBkYXRhIHRvIGF2b2lkIGFkZGl0aW9uYWwgQVBJIGNhbGxcbiAgICAgKi9cbiAgICB0b2dnbGVBdXRoRmllbGRzKGF1dGhUeXBlLCBzZXR0aW5ncyA9IG51bGwpIHtcbiAgICAgICAgLy8gRmlyc3QgdG9nZ2xlIGZpZWxkcyB3aXRob3V0IHN0YXR1cyBjaGVja1xuICAgICAgICBtYWlsU2V0dGluZ3MudG9nZ2xlQXV0aEZpZWxkc1dpdGhvdXRTdGF0dXMoYXV0aFR5cGUpO1xuXG4gICAgICAgIC8vIFRoZW4gY2hlY2sgT0F1dGgyIHN0YXR1cyBvbmx5IGlmIG5lZWRlZFxuICAgICAgICBpZiAoYXV0aFR5cGUgPT09ICdvYXV0aDInKSB7XG4gICAgICAgICAgICBpZiAoc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgZXhpc3Rpbmcgc2V0dGluZ3MgZGF0YSB0byBhdm9pZCBkdXBsaWNhdGUgQVBJIGNhbGxcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlT0F1dGgyU3RhdHVzKHNldHRpbmdzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gQVBJIGNhbGwgaWYgbm8gc2V0dGluZ3MgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuY2hlY2tPQXV0aDJTdGF0dXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRlc3QgYnV0dG9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUZXN0QnV0dG9ucygpIHtcbiAgICAgICAgLy8gVGVzdCBjb25uZWN0aW9uIGJ1dHRvblxuICAgICAgICAkKCcjdGVzdC1jb25uZWN0aW9uLWJ1dHRvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBpcyBkaXNhYmxlZFxuICAgICAgICAgICAgaWYgKCQoZS5jdXJyZW50VGFyZ2V0KS5oYXNDbGFzcygnZGlzYWJsZWQnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRG91YmxlLWNoZWNrIGZvciB1bnNhdmVkIGNoYW5nZXNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5oYXNDaGFuZ2VzICYmIEZvcm0uaGFzQ2hhbmdlcygpKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TYXZlQ2hhbmdlc0JlZm9yZVRlc3RpbmdcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWFpbFNldHRpbmdzLnRlc3RDb25uZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNlbmQgdGVzdCBlbWFpbCBidXR0b25cbiAgICAgICAgJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gaXMgZGlzYWJsZWRcbiAgICAgICAgICAgIGlmICgkKGUuY3VycmVudFRhcmdldCkuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERvdWJsZS1jaGVjayBmb3IgdW5zYXZlZCBjaGFuZ2VzXG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uaGFzQ2hhbmdlcyAmJiBGb3JtLmhhc0NoYW5nZXMoKSkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dXYXJuaW5nKFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU2F2ZUNoYW5nZXNCZWZvcmVUZXN0aW5nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zZW5kVGVzdEVtYWlsKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgcHJvdmlkZXIgZnJvbSBlbWFpbCBhZGRyZXNzXG4gICAgICovXG4gICAgZGV0ZWN0UHJvdmlkZXJGcm9tRW1haWwoKSB7XG4gICAgICAgICQoJyNNYWlsU01UUFVzZXJuYW1lJykub24oJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBlbWFpbCA9ICQoZS50YXJnZXQpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFlbWFpbCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9IE1haWxTZXR0aW5nc0FQSS5kZXRlY3RQcm92aWRlcihlbWFpbCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwcm92aWRlciBmaWVsZCB1c2luZyBTZW1hbnRpYyBVSSBkcm9wZG93biAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICAgICAgJCgnI01haWxPQXV0aDJQcm92aWRlci1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBwcm92aWRlcik7XG4gICAgICAgICAgICAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyJykudmFsKHByb3ZpZGVyKTtcblxuICAgICAgICAgICAgLy8gU2hvdyByZWNvbW1lbmRhdGlvbnMgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgICAgICAgIGlmIChwcm92aWRlciA9PT0gJ2dvb2dsZScpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Muc2hvd1Byb3ZpZGVySGludCgnR21haWwgZGV0ZWN0ZWQuIE9BdXRoMiBhdXRoZW50aWNhdGlvbiB3aWxsIGJlIHJlcXVpcmVkIGZyb20gTWFyY2ggMjAyNS4nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgPT09ICdtaWNyb3NvZnQnKSB7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnNob3dQcm92aWRlckhpbnQoJ01pY3Jvc29mdC9PdXRsb29rIGRldGVjdGVkLiBPQXV0aDIgYXV0aGVudGljYXRpb24gcmVjb21tZW5kZWQuJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyID09PSAneWFuZGV4Jykge1xuICAgICAgICAgICAgICAgIG1haWxTZXR0aW5ncy5zaG93UHJvdmlkZXJIaW50KCdZYW5kZXggTWFpbCBkZXRlY3RlZC4gQm90aCBwYXNzd29yZCBhbmQgT0F1dGgyIGF1dGhlbnRpY2F0aW9uIHN1cHBvcnRlZC4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXV0by1maWxsIFNNVFAgc2V0dGluZ3MgYmFzZWQgb24gcHJvdmlkZXJcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy5hdXRvRmlsbFNNVFBTZXR0aW5ncyhwcm92aWRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdXRvLWZpbGwgU01UUCBzZXR0aW5ncyBiYXNlZCBvbiBwcm92aWRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlciAtIEVtYWlsIHByb3ZpZGVyXG4gICAgICovXG4gICAgYXV0b0ZpbGxTTVRQU2V0dGluZ3MocHJvdmlkZXIpIHtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBnb29nbGU6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC5nbWFpbC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIHRsczogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1pY3Jvc29mdDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLm9mZmljZTM2NS5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIHRsczogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHlhbmRleDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLnlhbmRleC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc0NjUnLFxuICAgICAgICAgICAgICAgIHRsczogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoc2V0dGluZ3NbcHJvdmlkZXJdKSB7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlclNldHRpbmdzID0gc2V0dGluZ3NbcHJvdmlkZXJdO1xuXG4gICAgICAgICAgICAvLyBPbmx5IGZpbGwgaWYgZmllbGRzIGFyZSBlbXB0eVxuICAgICAgICAgICAgaWYgKCEkKCcjTWFpbFNNVFBIb3N0JykudmFsKCkpIHtcbiAgICAgICAgICAgICAgICAkKCcjTWFpbFNNVFBIb3N0JykudmFsKHByb3ZpZGVyU2V0dGluZ3MuaG9zdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoISQoJyNNYWlsU01UUFBvcnQnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNNYWlsU01UUFBvcnQnKS52YWwocHJvdmlkZXJTZXR0aW5ncy5wb3J0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGVuY3J5cHRpb24gZHJvcGRvd25cbiAgICAgICAgICAgIGNvbnN0ICRlbmNyeXB0aW9uRHJvcGRvd24gPSAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZW5jcnlwdGlvbkRyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBzZXR0aW5ncyBmb3IgZW5jcnlwdGlvblxuICAgICAgICAgICAgICAgIGxldCBlbmNyeXB0aW9uVmFsdWUgPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyU2V0dGluZ3MucG9ydCA9PT0gJzU4NycpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5jcnlwdGlvblZhbHVlID0gJ3Rscyc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm92aWRlclNldHRpbmdzLnBvcnQgPT09ICc0NjUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGVuY3J5cHRpb25WYWx1ZSA9ICdzc2wnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkZW5jcnlwdGlvbkRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBlbmNyeXB0aW9uVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBTTVRQIHNldHRpbmdzIHdoZW4gT0F1dGgyIHByb3ZpZGVyIGlzIHNlbGVjdGVkXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyIC0gU2VsZWN0ZWQgT0F1dGgyIHByb3ZpZGVyIChnb29nbGUsIG1pY3Jvc29mdCwgeWFuZGV4KVxuICAgICAqL1xuICAgIHVwZGF0ZVNNVFBTZXR0aW5nc0ZvclByb3ZpZGVyKHByb3ZpZGVyKSB7XG4gICAgICAgIC8vIERvbid0IGF1dG8tZmlsbCB1bnRpbCBpbml0aWFsIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIGlmICghbWFpbFNldHRpbmdzLmRhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIE9BdXRoMiBhdXRoIHR5cGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgY29uc3QgYXV0aFR5cGUgPSAkKCdpbnB1dFtuYW1lPVwiTWFpbFNNVFBBdXRoVHlwZVwiXTpjaGVja2VkJykudmFsKCk7XG4gICAgICAgIGlmIChhdXRoVHlwZSAhPT0gJ29hdXRoMicpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmluZSBwcm92aWRlciBTTVRQIHNldHRpbmdzXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBnb29nbGU6IHtcbiAgICAgICAgICAgICAgICBob3N0OiAnc210cC5nbWFpbC5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIGVuY3J5cHRpb246ICd0bHMnLFxuICAgICAgICAgICAgICAgIGNlcnRDaGVjazogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1pY3Jvc29mdDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLW1haWwub3V0bG9vay5jb20nLFxuICAgICAgICAgICAgICAgIHBvcnQ6ICc1ODcnLFxuICAgICAgICAgICAgICAgIGVuY3J5cHRpb246ICd0bHMnLFxuICAgICAgICAgICAgICAgIGNlcnRDaGVjazogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHlhbmRleDoge1xuICAgICAgICAgICAgICAgIGhvc3Q6ICdzbXRwLnlhbmRleC5ydScsXG4gICAgICAgICAgICAgICAgcG9ydDogJzU4NycsXG4gICAgICAgICAgICAgICAgZW5jcnlwdGlvbjogJ3RscycsXG4gICAgICAgICAgICAgICAgY2VydENoZWNrOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBwcm92aWRlclNldHRpbmdzW3Byb3ZpZGVyXTtcbiAgICAgICAgaWYgKCFzZXR0aW5ncykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGhvc3RcbiAgICAgICAgJCgnI01haWxTTVRQSG9zdCcpLnZhbChzZXR0aW5ncy5ob3N0KTtcblxuICAgICAgICAvLyBVcGRhdGUgcG9ydFxuICAgICAgICAkKCcjTWFpbFNNVFBQb3J0JykudmFsKHNldHRpbmdzLnBvcnQpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBlbmNyeXB0aW9uIHR5cGVcbiAgICAgICAgJCgnI01haWxTTVRQVXNlVExTJykudmFsKHNldHRpbmdzLmVuY3J5cHRpb24pO1xuICAgICAgICAkKCcjTWFpbFNNVFBVc2VUTFMtZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2V0dGluZ3MuZW5jcnlwdGlvbik7XG5cbiAgICAgICAgLy8gVXBkYXRlIGNlcnRpZmljYXRlIGNoZWNrXG4gICAgICAgIGlmIChzZXR0aW5ncy5jZXJ0Q2hlY2spIHtcbiAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwb3J0IGJhc2VkIG9uIHNlbGVjdGVkIGVuY3J5cHRpb24gdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBlbmNyeXB0aW9uVHlwZSAtIFNlbGVjdGVkIGVuY3J5cHRpb24gdHlwZSAobm9uZS90bHMvc3NsKVxuICAgICAqL1xuICAgIHVwZGF0ZVBvcnRCYXNlZE9uRW5jcnlwdGlvbihlbmNyeXB0aW9uVHlwZSkge1xuICAgICAgICBjb25zdCAkcG9ydEZpZWxkID0gJCgnI01haWxTTVRQUG9ydCcpO1xuXG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHRoZSB1c2VyIGhhc24ndCBtYW51YWxseSBjaGFuZ2VkIHRoZSBwb3J0XG4gICAgICAgIGNvbnN0IGN1cnJlbnRQb3J0ID0gJHBvcnRGaWVsZC52YWwoKTtcbiAgICAgICAgY29uc3Qgc3RhbmRhcmRQb3J0cyA9IFsnMjUnLCAnNTg3JywgJzQ2NScsICcnXTtcblxuICAgICAgICBpZiAoc3RhbmRhcmRQb3J0cy5pbmNsdWRlcyhjdXJyZW50UG9ydCkpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoZW5jcnlwdGlvblR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgICAgICAgICAgJHBvcnRGaWVsZC52YWwoJzI1Jyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Rscyc6XG4gICAgICAgICAgICAgICAgICAgICRwb3J0RmllbGQudmFsKCc1ODcnKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnc3NsJzpcbiAgICAgICAgICAgICAgICAgICAgJHBvcnRGaWVsZC52YWwoJzQ2NScpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cvaGlkZSBjZXJ0aWZpY2F0ZSBjaGVjayBiYXNlZCBvbiBlbmNyeXB0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgJGNlcnRDaGVja0ZpZWxkID0gJCgnI2NlcnQtY2hlY2stZmllbGQnKTtcbiAgICAgICAgaWYgKGVuY3J5cHRpb25UeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIC8vIEhpZGUgY2VydGlmaWNhdGUgY2hlY2sgZm9yIHVuZW5jcnlwdGVkIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAkY2VydENoZWNrRmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgLy8gVW5jaGVjayB0aGUgY2VydGlmaWNhdGUgY2hlY2sgd2hlbiBoaWRpbmdcbiAgICAgICAgICAgICQoJyNNYWlsU01UUENlcnRDaGVjaycpLmNsb3Nlc3QoJy5jaGVja2JveCcpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGNlcnRpZmljYXRlIGNoZWNrIGZvciBUTFMvU1NMIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAkY2VydENoZWNrRmllbGQuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgcHJvdmlkZXIgaGludCBtZXNzYWdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgLSBIaW50IG1lc3NhZ2VcbiAgICAgKi9cbiAgICBzaG93UHJvdmlkZXJIaW50KG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgJGhpbnQgPSAkKCcjcHJvdmlkZXItaGludCcpO1xuICAgICAgICBpZiAoJGhpbnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkKCcjTWFpbFNNVFBVc2VybmFtZScpLmFmdGVyKGA8ZGl2IGlkPVwicHJvdmlkZXItaGludFwiIGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlXCI+JHttZXNzYWdlfTwvZGl2PmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGhpbnQudGV4dChtZXNzYWdlKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIE9BdXRoMiBjYWxsYmFjayBwYXJhbWV0ZXJzIGZyb20gVVJMXG4gICAgICovXG4gICAgaGFuZGxlT0F1dGgyQ2FsbGJhY2soKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIHN1Y2Nlc3NcbiAgICAgICAgaWYgKHVybFBhcmFtcy5oYXMoJ29hdXRoX3N1Y2Nlc3MnKSkge1xuICAgICAgICAgICAgLy8gUmVsb2FkIHNldHRpbmdzIHRvIHNob3cgdXBkYXRlZCBPQXV0aDIgc3RhdHVzXG4gICAgICAgICAgICBtYWlsU2V0dGluZ3MubG9hZFNldHRpbmdzRnJvbUFQSSgpO1xuICAgICAgICAgICAgLy8gQ2xlYW4gVVJMXG4gICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIGRvY3VtZW50LnRpdGxlLCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGVycm9yXG4gICAgICAgIGlmICh1cmxQYXJhbXMuaGFzKCdvYXV0aF9lcnJvcicpKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvciA9IHVybFBhcmFtcy5nZXQoJ29hdXRoX2Vycm9yJyk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoXG4gICAgICAgICAgICAgICAgKGdsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJBdXRob3JpemF0aW9uRmFpbGVkIHx8ICfQntGI0LjQsdC60LAgT0F1dGgyINCw0LLRgtC+0YDQuNC30LDRhtC40Lg6ICcpICsgZGVjb2RlVVJJQ29tcG9uZW50KGVycm9yKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIENsZWFuIFVSTFxuICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCBkb2N1bWVudC50aXRsZSwgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydCBPQXV0aDIgYXV0aG9yaXphdGlvbiBmbG93XG4gICAgICovXG4gICAgc3RhcnRPQXV0aDJGbG93KCkge1xuICAgICAgICBjb25zdCBwcm92aWRlciA9ICQoJyNNYWlsT0F1dGgyUHJvdmlkZXInKS52YWwoKSB8fCAkKCcjTWFpbE9BdXRoMlByb3ZpZGVyLWRyb3Bkb3duJykuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTWFpbFNldHRpbmdzXSBTdGFydGluZyBPQXV0aDIgZmxvdyBmb3IgcHJvdmlkZXI6JywgcHJvdmlkZXIpO1xuXG4gICAgICAgIGlmICghcHJvdmlkZXIgfHwgcHJvdmlkZXIgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlT0F1dGgyUHJvdmlkZXJFbXB0eSB8fCAn0JLRi9Cx0LXRgNC40YLQtSBPQXV0aDIg0L/RgNC+0LLQsNC50LTQtdGA0LAnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIENsaWVudCBJRCBhbmQgU2VjcmV0IGFyZSBjb25maWd1cmVkXG4gICAgICAgIGNvbnN0IGNsaWVudElkID0gJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLnZhbCgpO1xuICAgICAgICBjb25zdCBjbGllbnRTZWNyZXQgPSAkKCcjTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpLnZhbCgpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTWFpbFNldHRpbmdzXSBDdXJyZW50IGZvcm0gdmFsdWVzOicpO1xuICAgICAgICBjb25zb2xlLmxvZygnICBDbGllbnRJZDonLCBjbGllbnRJZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCcgIENsaWVudFNlY3JldDonLCBjbGllbnRTZWNyZXQgPyAnKioqbWFza2VkKioqJyA6ICdlbXB0eScpO1xuXG4gICAgICAgIGlmICghY2xpZW50SWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfVmFsaWRhdGVPQXV0aDJDbGllbnRJZEVtcHR5IHx8ICfQktCy0LXQtNC40YLQtSBDbGllbnQgSUQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY2xpZW50U2VjcmV0KSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm1zX1ZhbGlkYXRlT0F1dGgyQ2xpZW50U2VjcmV0RW1wdHkgfHwgJ9CS0LLQtdC00LjRgtC1IENsaWVudCBTZWNyZXQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzIGJlZm9yZSBzdGFydGluZyB0aGUgZmxvd1xuICAgICAgICBtYWlsU2V0dGluZ3Muc2F2ZU9BdXRoMkNyZWRlbnRpYWxzKHByb3ZpZGVyLCBjbGllbnRJZCwgY2xpZW50U2VjcmV0KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYXZlIE9BdXRoMiBjcmVkZW50aWFscyBhbmQgdGhlbiBzdGFydCBhdXRob3JpemF0aW9uIGZsb3dcbiAgICAgKi9cbiAgICBzYXZlT0F1dGgyQ3JlZGVudGlhbHMocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgIE1haWxPQXV0aDJQcm92aWRlcjogcHJvdmlkZXIsXG4gICAgICAgICAgICBNYWlsT0F1dGgyQ2xpZW50SWQ6IGNsaWVudElkLFxuICAgICAgICAgICAgTWFpbE9BdXRoMkNsaWVudFNlY3JldDogY2xpZW50U2VjcmV0XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1tNYWlsU2V0dGluZ3NdIFNhdmluZyBPQXV0aDIgY3JlZGVudGlhbHM6JywgZGF0YSk7XG5cbiAgICAgICAgLy8gVXNlIE1haWxTZXR0aW5nc0FQSSBmb3IgY29uc2lzdGVudCBlcnJvciBoYW5kbGluZ1xuICAgICAgICBNYWlsU2V0dGluZ3NBUEkucGF0Y2hTZXR0aW5ncyhkYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTWFpbFNldHRpbmdzXSBPQXV0aDIgY3JlZGVudGlhbHMgc2F2ZSByZXNwb25zZTonLCByZXNwb25zZSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW01haWxTZXR0aW5nc10gT0F1dGgyIGNyZWRlbnRpYWxzIHNhdmVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICAgICAgICAgIC8vIENyZWRlbnRpYWxzIHNhdmVkLCBub3cgZ2V0IE9BdXRoMiBVUkxcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MucHJvY2VlZFdpdGhPQXV0aDJGbG93KHByb3ZpZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW01haWxTZXR0aW5nc10gRmFpbGVkIHRvIHNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvclxuICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJylcbiAgICAgICAgICAgICAgICAgICAgOiAnRmFpbGVkIHRvIHNhdmUgT0F1dGgyIGNyZWRlbnRpYWxzJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgT0F1dGgyIGF1dGhvcml6YXRpb24gVVJMIGFuZCBvcGVuIGF1dGhvcml6YXRpb24gd2luZG93XG4gICAgICovXG4gICAgcmVxdWVzdE9BdXRoMkF1dGhVcmwocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1tNYWlsU2V0dGluZ3NdIFJlcXVlc3RpbmcgYXV0aCBVUkwgZnJvbSBBUEkuLi4nKTtcblxuICAgICAgICAvLyBSZXF1ZXN0IGF1dGhvcml6YXRpb24gVVJMIGZyb20gQVBJXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5hdXRob3JpemVPQXV0aDIocHJvdmlkZXIsIGNsaWVudElkLCBjbGllbnRTZWNyZXQsIChhdXRoVXJsKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01haWxTZXR0aW5nc10gUmVjZWl2ZWQgcmVzcG9uc2UgZnJvbSBBUEk6JywgYXV0aFVybCA/ICdHb3QgVVJMJyA6ICdObyBVUkwnKTtcblxuICAgICAgICAgICAgaWYgKGF1dGhVcmwpIHtcbiAgICAgICAgICAgICAgICAvLyBPcGVuIGF1dGhvcml6YXRpb24gd2luZG93XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSA2MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gNzAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSAoc2NyZWVuLndpZHRoIC8gMikgLSAod2lkdGggLyAyKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSAoc2NyZWVuLmhlaWdodCAvIDIpIC0gKGhlaWdodCAvIDIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYXV0aFdpbmRvdyA9IHdpbmRvdy5vcGVuKFxuICAgICAgICAgICAgICAgICAgICBhdXRoVXJsLFxuICAgICAgICAgICAgICAgICAgICAnb2F1dGgyLWF1dGgnLFxuICAgICAgICAgICAgICAgICAgICBgd2lkdGg9JHt3aWR0aH0saGVpZ2h0PSR7aGVpZ2h0fSxsZWZ0PSR7bGVmdH0sdG9wPSR7dG9wfWBcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFhdXRoV2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignUGxlYXNlIGFsbG93IHBvcHVwcyBmb3IgT0F1dGgyIGF1dGhvcml6YXRpb24nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyQXV0aG9yaXphdGlvbkZhaWxlZCB8fCAn0J7RiNC40LHQutCwINCw0LLRgtC+0YDQuNC30LDRhtC40LggT0F1dGgyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcm9jZWVkIHdpdGggT0F1dGgyIGZsb3cgYWZ0ZXIgY3JlZGVudGlhbHMgYXJlIHNhdmVkXG4gICAgICovXG4gICAgcHJvY2VlZFdpdGhPQXV0aDJGbG93KHByb3ZpZGVyKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdbTWFpbFNldHRpbmdzXSBQcm9jZWVkaW5nIHdpdGggT0F1dGgyIGZsb3cgZm9yIHByb3ZpZGVyOicsIHByb3ZpZGVyKTtcblxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgJCgnI29hdXRoMi1jb25uZWN0JykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBHZXQgT0F1dGgyIFVSTCB3aXRoIHNhdmVkIGNyZWRlbnRpYWxzXG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5nZXRPQXV0aDJVcmwocHJvdmlkZXIsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNYWlsU2V0dGluZ3NdIE9BdXRoMiBVUkwgcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgJCgnI29hdXRoMi1jb25uZWN0JykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmF1dGhfdXJsKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNYWlsU2V0dGluZ3NdIE9wZW5pbmcgT0F1dGgyIHdpbmRvdyB3aXRoIFVSTDonLCByZXNwb25zZS5hdXRoX3VybCk7XG5cbiAgICAgICAgICAgICAgICAvLyBPcGVuIE9BdXRoMiB3aW5kb3dcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IDYwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWlnaHQgPSA3MDA7XG4gICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IChzY3JlZW4ud2lkdGggLyAyKSAtICh3aWR0aCAvIDIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvcCA9IChzY3JlZW4uaGVpZ2h0IC8gMikgLSAoaGVpZ2h0IC8gMik7XG5cbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93ID0gd2luZG93Lm9wZW4oXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmF1dGhfdXJsLFxuICAgICAgICAgICAgICAgICAgICAnT0F1dGgyQXV0aG9yaXphdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIGB3aWR0aD0ke3dpZHRofSxoZWlnaHQ9JHtoZWlnaHR9LGxlZnQ9JHtsZWZ0fSx0b3A9JHt0b3B9YFxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB3aW5kb3cgd2FzIGJsb2NrZWRcbiAgICAgICAgICAgICAgICBpZiAoIW1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdQbGVhc2UgYWxsb3cgcG9wdXBzIGZvciBPQXV0aDIgYXV0aG9yaXphdGlvbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW01haWxTZXR0aW5nc10gTm8gYXV0aF91cmwgaW4gcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignRmFpbGVkIHRvIGdldCBPQXV0aDIgYXV0aG9yaXphdGlvbiBVUkwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBPQXV0aDIgY2FsbGJhY2sgbWVzc2FnZVxuICAgICAqIEBwYXJhbSB7TWVzc2FnZUV2ZW50fSBldmVudCAtIE1lc3NhZ2UgZXZlbnRcbiAgICAgKi9cbiAgICBoYW5kbGVPQXV0aDJNZXNzYWdlKGV2ZW50KSB7XG4gICAgICAgIC8vIFZhbGlkYXRlIG9yaWdpblxuICAgICAgICBpZiAoZXZlbnQub3JpZ2luICE9PSB3aW5kb3cubG9jYXRpb24ub3JpZ2luKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBmb3IgT0F1dGgyIGNhbGxiYWNrIGRhdGFcbiAgICAgICAgaWYgKGV2ZW50LmRhdGEgJiYgZXZlbnQuZGF0YS50eXBlID09PSAnb2F1dGgyLWNhbGxiYWNrJykge1xuICAgICAgICAgICAgLy8gQ2xvc2UgT0F1dGgyIHdpbmRvd1xuICAgICAgICAgICAgaWYgKG1haWxTZXR0aW5ncy5vYXV0aDJXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3Mub2F1dGgyV2luZG93LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLm9hdXRoMldpbmRvdyA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFByb2Nlc3MgY2FsbGJhY2tcbiAgICAgICAgICAgIE1haWxTZXR0aW5nc0FQSS5oYW5kbGVPQXV0aDJDYWxsYmFjayhldmVudC5kYXRhLnBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oJ09BdXRoMiBhdXRob3JpemF0aW9uIHN1Y2Nlc3NmdWwnKTtcbiAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLmNoZWNrT0F1dGgyU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdPQXV0aDIgYXV0aG9yaXphdGlvbiBmYWlsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgT0F1dGgyIHN0YXR1cyBkaXNwbGF5IHVzaW5nIHByb3ZpZGVkIHNldHRpbmdzIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhIGNvbnRhaW5pbmcgb2F1dGgyX3N0YXR1c1xuICAgICAqL1xuICAgIHVwZGF0ZU9BdXRoMlN0YXR1cyhzZXR0aW5ncykge1xuICAgICAgICBpZiAoc2V0dGluZ3MgJiYgc2V0dGluZ3Mub2F1dGgyX3N0YXR1cykge1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gc2V0dGluZ3Mub2F1dGgyX3N0YXR1cztcbiAgICAgICAgICAgIGNvbnN0ICRzdGF0dXNEaXYgPSAkKCcjb2F1dGgyLXN0YXR1cycpO1xuICAgICAgICAgICAgY29uc3QgJGNsaWVudElkRmllbGQgPSAkKCcjTWFpbE9BdXRoMkNsaWVudElkJykuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCAkY2xpZW50U2VjcmV0RmllbGQgPSAkKCcjTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuXG4gICAgICAgICAgICBpZiAoc3RhdHVzLmNvbmZpZ3VyZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlck5hbWUgPSBNYWlsU2V0dGluZ3NBUEkuZ2V0UHJvdmlkZXJOYW1lKHN0YXR1cy5wcm92aWRlcik7XG4gICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGVkVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5tc19PQXV0aDJDb25uZWN0ZWRUby5yZXBsYWNlKCd7cHJvdmlkZXJ9JywgcHJvdmlkZXJOYW1lKTtcblxuICAgICAgICAgICAgICAgIC8vIERvbid0IGFkZCBleHRyYSBzdGF0dXMgdGV4dCAtIFwiQ29ubmVjdGVkXCIgYWxyZWFkeSBpbXBsaWVzIGF1dGhvcml6ZWRcbiAgICAgICAgICAgICAgICAkc3RhdHVzRGl2Lmh0bWwoYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcG9zaXRpdmUgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjaGVjayBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Y29ubmVjdGVkVGV4dH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgJCgnI29hdXRoMi1jb25uZWN0JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICQoJyNvYXV0aDItZGlzY29ubmVjdCcpLnNob3coKTtcblxuICAgICAgICAgICAgICAgIC8vIEhpZGUgQ2xpZW50IElEIGFuZCBDbGllbnQgU2VjcmV0IGZpZWxkcyB3aGVuIGF1dGhvcml6ZWRcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzLmF1dGhvcml6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNsaWVudElkRmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkY2xpZW50U2VjcmV0RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRjbGllbnRJZEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGNsaWVudFNlY3JldEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0dXNEaXYuaHRtbChgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLm1zX09BdXRoMk5vdENvbmZpZ3VyZWR9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgICQoJyNvYXV0aDItY29ubmVjdCcpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkKCcjb2F1dGgyLWRpc2Nvbm5lY3QnKS5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IENsaWVudCBJRCBhbmQgQ2xpZW50IFNlY3JldCBmaWVsZHMgd2hlbiBub3QgYXV0aG9yaXplZFxuICAgICAgICAgICAgICAgICRjbGllbnRJZEZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xpZW50U2VjcmV0RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIE9BdXRoMiBjb25uZWN0aW9uIHN0YXR1cyAobWFrZXMgQVBJIGNhbGwpXG4gICAgICovXG4gICAgY2hlY2tPQXV0aDJTdGF0dXMoKSB7XG4gICAgICAgIE1haWxTZXR0aW5nc0FQSS5nZXRTZXR0aW5ncygoc2V0dGluZ3MpID0+IHtcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVPQXV0aDJTdGF0dXMoc2V0dGluZ3MpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzY29ubmVjdCBPQXV0aDJcbiAgICAgKi9cbiAgICBkaXNjb25uZWN0T0F1dGgyKCkge1xuICAgICAgICAvLyBDbGVhciBPQXV0aDIgdG9rZW5zIGltbWVkaWF0ZWx5IHdpdGhvdXQgY29uZmlybWF0aW9uXG4gICAgICAgIGNvbnN0IGNsZWFyRGF0YSA9IHtcbiAgICAgICAgICAgIE1haWxPQXV0aDJSZWZyZXNoVG9rZW46ICcnLFxuICAgICAgICAgICAgTWFpbE9BdXRoMkFjY2Vzc1Rva2VuOiAnJyxcbiAgICAgICAgICAgIE1haWxPQXV0aDJUb2tlbkV4cGlyZXM6ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgTWFpbFNldHRpbmdzQVBJLnBhdGNoU2V0dGluZ3MoY2xlYXJEYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBKdXN0IHVwZGF0ZSB0aGUgc3RhdHVzIHdpdGhvdXQgc2hvd2luZyBhIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuY2hlY2tPQXV0aDJTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBDbGllbnQgSUQgYW5kIENsaWVudCBTZWNyZXQgZmllbGRzIGFnYWluXG4gICAgICAgICAgICAgICAgJCgnI01haWxPQXV0aDJDbGllbnRJZCcpLmNsb3Nlc3QoJy5maWVsZCcpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkKCcjTWFpbE9BdXRoMkNsaWVudFNlY3JldCcpLmNsb3Nlc3QoJy5maWVsZCcpLnNob3coKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdGYWlsZWQgdG8gZGlzY29ubmVjdCBPQXV0aDInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRlc3QgU01UUCBjb25uZWN0aW9uXG4gICAgICovXG4gICAgdGVzdENvbm5lY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjdGVzdC1jb25uZWN0aW9uLWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkcmVzdWx0QXJlYSA9ICQoJyN0ZXN0LWNvbm5lY3Rpb24tcmVzdWx0Jyk7XG5cbiAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgcmVzdWx0XG4gICAgICAgICRyZXN1bHRBcmVhLnJlbW92ZSgpO1xuXG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkudGVzdENvbm5lY3Rpb24oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSByZXN1bHQgYXJlYSBuZXh0IHRvIGJ1dHRvblxuICAgICAgICAgICAgbGV0ICRyZXN1bHQgPSAkKCc8ZGl2IGlkPVwidGVzdC1jb25uZWN0aW9uLXJlc3VsdFwiIGNsYXNzPVwidWkgc21hbGwgbWVzc2FnZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgJGJ1dHRvbi5wYXJlbnQoKS5hcHBlbmQoJHJlc3VsdCk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmFkZENsYXNzKCdwb3NpdGl2ZScpLmh0bWwoJzxpIGNsYXNzPVwiY2hlY2sgY2lyY2xlIGljb25cIj48L2k+ICcgKyAocmVzcG9uc2UubWVzc2FnZXM/LnN1Y2Nlc3M/LlswXSB8fCAnQ29ubmVjdGlvbiBzdWNjZXNzZnVsJykpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBkaWFnbm9zdGljcyBpbmZvIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhPy5kaWFnbm9zdGljcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaWFnID0gcmVzcG9uc2UuZGF0YS5kaWFnbm9zdGljcztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgQXV0aDogJHtkaWFnLmF1dGhfdHlwZX0sIFNlcnZlcjogJHtkaWFnLnNtdHBfaG9zdH06JHtkaWFnLnNtdHBfcG9ydH0sIEVuY3J5cHRpb246ICR7ZGlhZy5zbXRwX2VuY3J5cHRpb259YDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcuYXV0aF90eXBlID09PSAnb2F1dGgyJyAmJiBkaWFnLm9hdXRoMl9wcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgPGJyPk9BdXRoMjogJHtkaWFnLm9hdXRoMl9wcm92aWRlcn1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2hvdyBleHBpcmVkIHRva2VuIHdhcm5pbmcgaWYgY29ubmVjdGlvbiBpcyBzdWNjZXNzZnVsXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhcyBpdCBtZWFucyByZWZyZXNoIHRva2VuIGlzIHdvcmtpbmcgY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlhZy5vYXV0aDJfcmVmcmVzaF90b2tlbl9leGlzdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzICs9ICcgPHNwYW4gY2xhc3M9XCJ1aSBncmVlbiBsYWJlbFwiPjxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT5BdXRob3JpemVkPC9zcGFuPic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSAnPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSByZXNwb25zZT8ubWVzc2FnZXM/LmVycm9yPy5qb2luKCcsICcpIHx8ICdDb25uZWN0aW9uIGZhaWxlZCc7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5hZGRDbGFzcygnbmVnYXRpdmUnKS5odG1sKCc8aSBjbGFzcz1cInRpbWVzIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgbWVzc2FnZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGhpbnRzIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZT8uZGF0YT8uaGludHMgJiYgcmVzcG9uc2UuZGF0YS5oaW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBoaW50cyA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjxzdHJvbmc+VHJvdWJsZXNob290aW5nOjwvc3Ryb25nPjx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLmhpbnRzLmZvckVhY2goaGludCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoaW50cyArPSBgPGxpPiR7aGludH08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBoaW50cyArPSAnPC91bD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChoaW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMzAgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5mYWRlT3V0KDQwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAzMDAwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIHRlc3QgZW1haWxcbiAgICAgKi9cbiAgICBzZW5kVGVzdEVtYWlsKCkge1xuICAgICAgICBjb25zdCByZWNpcGllbnQgPSAkKCcjU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsJykudmFsKCk7XG5cbiAgICAgICAgaWYgKCFyZWNpcGllbnQpIHtcbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbmV4dCB0byBidXR0b25cbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjc2VuZC10ZXN0LWVtYWlsLWJ1dHRvbicpO1xuICAgICAgICAgICAgbGV0ICRyZXN1bHQgPSAkKCc8ZGl2IGlkPVwic2VuZC10ZXN0LXJlc3VsdFwiIGNsYXNzPVwidWkgc21hbGwgbmVnYXRpdmUgbWVzc2FnZVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgJHJlc3VsdC5odG1sKCc8aSBjbGFzcz1cInRpbWVzIGNpcmNsZSBpY29uXCI+PC9pPiBQbGVhc2UgZW50ZXIgYSByZWNpcGllbnQgZW1haWwgYWRkcmVzcycpO1xuICAgICAgICAgICAgJCgnI3NlbmQtdGVzdC1yZXN1bHQnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICRidXR0b24ucGFyZW50KCkuYXBwZW5kKCRyZXN1bHQpO1xuXG4gICAgICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMTAgc2Vjb25kc1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5mYWRlT3V0KDQwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCAxMDAwMCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHJlc3VsdEFyZWEgPSAkKCcjc2VuZC10ZXN0LXJlc3VsdCcpO1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHJlc3VsdFxuICAgICAgICAkcmVzdWx0QXJlYS5yZW1vdmUoKTtcblxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgIHRvOiByZWNpcGllbnQsXG4gICAgICAgICAgICBzdWJqZWN0OiAnVGVzdCBlbWFpbCBmcm9tIE1pa29QQlgnLFxuICAgICAgICAgICAgYm9keTogJzxoMj5UZXN0IEVtYWlsPC9oMj48cD5UaGlzIGlzIGEgdGVzdCBlbWFpbCBmcm9tIHlvdXIgTWlrb1BCWCBzeXN0ZW0uPC9wPidcbiAgICAgICAgfTtcblxuICAgICAgICBNYWlsU2V0dGluZ3NBUEkuc2VuZFRlc3RFbWFpbChkYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHJlc3VsdCBhcmVhIG5leHQgdG8gYnV0dG9uXG4gICAgICAgICAgICBsZXQgJHJlc3VsdCA9ICQoJzxkaXYgaWQ9XCJzZW5kLXRlc3QtcmVzdWx0XCIgY2xhc3M9XCJ1aSBzbWFsbCBtZXNzYWdlXCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAkYnV0dG9uLnBhcmVudCgpLmFwcGVuZCgkcmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgYWN0dWFsIHJlY2lwaWVudCBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0dWFsUmVjaXBpZW50ID0gcmVzcG9uc2UuZGF0YT8udG8gfHwgcmVjaXBpZW50O1xuXG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBtZXNzYWdlIGZyb20gQVBJIHdoaWNoIGFscmVhZHkgaW5jbHVkZXMgdGhlIGVtYWlsIGFkZHJlc3NcbiAgICAgICAgICAgICAgICBsZXQgc3VjY2Vzc01lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcz8uc3VjY2Vzcz8uWzBdIHx8ICdUZXN0IGVtYWlsIHNlbnQnO1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgbWVzc2FnZSBkb2Vzbid0IGluY2x1ZGUgZW1haWwgYnV0IHdlIGhhdmUgaXQsIGFkZCBpdFxuICAgICAgICAgICAgICAgIGlmICghc3VjY2Vzc01lc3NhZ2UuaW5jbHVkZXMoJ0AnKSAmJiBhY3R1YWxSZWNpcGllbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc01lc3NhZ2UgPSBzdWNjZXNzTWVzc2FnZS5yZXBsYWNlKCfQn9C40YHRjNC80L4g0L7RgtC/0YDQsNCy0LvQtdC90L4nLCBg0J/QuNGB0YzQvNC+INC+0YLQv9GA0LDQstC70LXQvdC+IOKGkiAke2FjdHVhbFJlY2lwaWVudH1gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAkcmVzdWx0LmFkZENsYXNzKCdwb3NpdGl2ZScpLmh0bWwoXG4gICAgICAgICAgICAgICAgICAgICc8aSBjbGFzcz1cImNoZWNrIGNpcmNsZSBpY29uXCI+PC9pPiAnICsgc3VjY2Vzc01lc3NhZ2VcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBkaWFnbm9zdGljcyBpbmZvIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhPy5kaWFnbm9zdGljcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaWFnID0gcmVzcG9uc2UuZGF0YS5kaWFnbm9zdGljcztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRldGFpbHMgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48c21hbGw+JztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWcuYXV0aF90eXBlID09PSAnb2F1dGgyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSBkaWFnLm9hdXRoMl9wcm92aWRlciB8fCAnT0F1dGgyJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYFVzaW5nOiBPQXV0aDJgO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyICYmIHByb3ZpZGVyICE9PSAnT0F1dGgyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYCAoJHtwcm92aWRlcn0pYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHMgKz0gYFVzaW5nOiBQYXNzd29yZCBhdXRoZW50aWNhdGlvbmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSBgLCBTZXJ2ZXI6ICR7ZGlhZy5zbXRwX2hvc3R9OiR7ZGlhZy5zbXRwX3BvcnR9YDtcbiAgICAgICAgICAgICAgICAgICAgZGV0YWlscyArPSAnPC9zbWFsbD4nO1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0LmFwcGVuZChkZXRhaWxzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSByZXNwb25zZT8ubWVzc2FnZXM/LmVycm9yPy5qb2luKCcsICcpIHx8ICdGYWlsZWQgdG8gc2VuZCB0ZXN0IGVtYWlsJztcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmFkZENsYXNzKCduZWdhdGl2ZScpLmh0bWwoJzxpIGNsYXNzPVwidGltZXMgY2lyY2xlIGljb25cIj48L2k+ICcgKyBtZXNzYWdlKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgaGludHMgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlPy5kYXRhPy5oaW50cyAmJiByZXNwb25zZS5kYXRhLmhpbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGhpbnRzID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PHN0cm9uZz5Ucm91Ymxlc2hvb3Rpbmc6PC9zdHJvbmc+PHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuaGludHMuZm9yRWFjaChoaW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpbnRzICs9IGA8bGk+JHtoaW50fTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGhpbnRzICs9ICc8L3VsPic7XG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuYXBwZW5kKGhpbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEF1dG8taGlkZSBhZnRlciAzMCBzZWNvbmRzXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkcmVzdWx0LmZhZGVPdXQoNDAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIDMwMDAwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gbWFpbFNldHRpbmdzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBHZXQgdW5tYXNrZWQgdmFsdWVzIGZvciBlbWFpbCBmaWVsZHMgRklSU1RcbiAgICAgICAgY29uc3QgZW1haWxGaWVsZHMgPSBbXG4gICAgICAgICAgICAnTWFpbFNNVFBTZW5kZXJBZGRyZXNzJyxcbiAgICAgICAgICAgICdTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnLFxuICAgICAgICAgICAgJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJyxcbiAgICAgICAgICAgICdWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWwnXG4gICAgICAgIF07XG5cbiAgICAgICAgZW1haWxGaWVsZHMuZm9yRWFjaChmaWVsZElkID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBsZXQgb3JpZ2luYWxWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnJztcbiAgICAgICAgICAgICAgICBsZXQgZmllbGRWYWx1ZSA9IG9yaWdpbmFsVmFsdWU7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW01haWxTZXR0aW5nc10gUHJvY2Vzc2luZyBmaWVsZCAke2ZpZWxkSWR9LCBvcmlnaW5hbCB2YWx1ZTogXCIke29yaWdpbmFsVmFsdWV9XCJgKTtcblxuICAgICAgICAgICAgICAgIC8vIEZvciBlbWFpbCBpbnB1dG1hc2ssIHRyeSBkaWZmZXJlbnQgYXBwcm9hY2hlcyB0byBnZXQgY2xlYW4gdmFsdWVcbiAgICAgICAgICAgICAgICBpZiAoZmllbGRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB2YWx1ZSBjb250YWlucyBwbGFjZWhvbGRlciBwYXR0ZXJuc1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmllbGRWYWx1ZS5pbmNsdWRlcygnX0BfJykgfHwgZmllbGRWYWx1ZSA9PT0gJ0AuJyB8fCBmaWVsZFZhbHVlID09PSAnQCcgfHwgZmllbGRWYWx1ZSA9PT0gJ18nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW01haWxTZXR0aW5nc10gRmllbGQgJHtmaWVsZElkfSBjb250YWlucyBwbGFjZWhvbGRlciwgY2xlYXJpbmdgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkVmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgdW5tYXNrZWQgdmFsdWUgZm9yIGVtYWlsIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBpbnB1dG1hc2sgcGx1Z2luIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaW5wdXRtYXNrICYmIHR5cGVvZiAkZmllbGQuaW5wdXRtYXNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVubWFza2VkVmFsdWUgPSAkZmllbGQuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTWFpbFNldHRpbmdzXSBGaWVsZCAke2ZpZWxkSWR9IHVubWFza2VkIHZhbHVlOiBcIiR7dW5tYXNrZWRWYWx1ZX1cImApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodW5tYXNrZWRWYWx1ZSAmJiB1bm1hc2tlZFZhbHVlICE9PSBmaWVsZFZhbHVlICYmICF1bm1hc2tlZFZhbHVlLmluY2x1ZGVzKCdfJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkVmFsdWUgPSB1bm1hc2tlZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW01haWxTZXR0aW5nc10gRmFpbGVkIHRvIGdldCB1bm1hc2tlZCB2YWx1ZSBmb3IgJHtmaWVsZElkfTpgLCBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTWFpbFNldHRpbmdzXSBGaW5hbCB2YWx1ZSBmb3IgJHtmaWVsZElkfTogXCIke2ZpZWxkVmFsdWV9XCJgKTtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZElkXSA9IGZpZWxkVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBObyBzdWNjZXNzIG1lc3NhZ2UgbmVlZGVkIC0gZm9ybSBzYXZlcyBzaWxlbnRseVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIGZvciBzYXZpbmcgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG1haWxTZXR0aW5ncy4kZm9ybU9iajtcblxuICAgICAgICAvLyBFbmFibGUgUkVTVCBBUEkgbW9kZSAobW9kZXJuIGFwcHJvYWNoIGxpa2UgR2VuZXJhbFNldHRpbmdzKVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE1haWxTZXR0aW5nc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3BhdGNoU2V0dGluZ3MnO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb24gZm9yIGNsZWFuZXIgQVBJIHJlcXVlc3RzXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIEVuYWJsZSBzZW5kaW5nIG9ubHkgY2hhbmdlZCBmaWVsZHMgZm9yIG9wdGltYWwgUEFUQ0ggc2VtYW50aWNzXG4gICAgICAgIEZvcm0uc2VuZE9ubHlDaGFuZ2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBObyByZWRpcmVjdCBhZnRlciBzYXZlIC0gc3RheSBvbiB0aGUgc2FtZSBwYWdlXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBudWxsO1xuXG4gICAgICAgIC8vIFVzZSAnIycgZm9yIFVSTCB3aGVuIHVzaW5nIGFwaVNldHRpbmdzXG4gICAgICAgIEZvcm0udXJsID0gJyMnO1xuXG4gICAgICAgIC8vIFVzZSBkeW5hbWljIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gY3VycmVudCBzdGF0ZVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBtYWlsU2V0dGluZ3MuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBtYWlsU2V0dGluZ3MuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBtYWlsU2V0dGluZ3MuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIE9BdXRoMiBldmVudHNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb09BdXRoMkV2ZW50cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIFN1YnNjcmliZSB0byBPQXV0aDIgYXV0aG9yaXphdGlvbiBldmVudHNcbiAgICAgICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnb2F1dGgyLWF1dGhvcml6YXRpb24nLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdPQXV0aDIgZXZlbnQgcmVjZWl2ZWQgdmlhIEV2ZW50QnVzOicsIGRhdGEpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuc3RhdHVzID09PSAnc3VjY2VzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3VjY2VzczogcmVmcmVzaCBPQXV0aDIgc3RhdHVzIGFmdGVyIGEgc2hvcnQgZGVsYXlcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYWlsU2V0dGluZ3MuY2hlY2tPQXV0aDJTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLnN0YXR1cyA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBFcnJvcjogc2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUubXNfT0F1dGgyUHJvY2Vzc2luZ0ZhaWxlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIDQwMDBcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb25pdG9yIGZvcm0gY2hhbmdlcyB0byBjb250cm9sIHRlc3QgYnV0dG9uIHN0YXRlc1xuICAgICAqL1xuICAgIG1vbml0b3JGb3JtQ2hhbmdlcygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGx5IGJ1dHRvbnMgc2hvdWxkIGJlIGVuYWJsZWQgKG5vIGNoYW5nZXMgeWV0KVxuICAgICAgICBtYWlsU2V0dGluZ3MudXBkYXRlVGVzdEJ1dHRvblN0YXRlcygpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBmb3JtIGNoYW5nZSBldmVudHMgLSBjaGVjayByZWFsIGZvcm0gc3RhdGVcbiAgICAgICAgbWFpbFNldHRpbmdzLiRmb3JtT2JqLm9uKCdjaGFuZ2UudGVzdGJ1dHRvbnMnLCAnaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWEnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBVc2UgRm9ybSdzIGJ1aWx0LWluIGNoYW5nZSBkZXRlY3Rpb25cbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVUZXN0QnV0dG9uU3RhdGVzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFsc28gbW9uaXRvciBGb3JtJ3MgZGF0YUNoYW5nZWQgZXZlbnRzXG4gICAgICAgIG1haWxTZXR0aW5ncy4kZm9ybU9iai5vbignZm9ybS5kYXRhQ2hhbmdlZCcsICgpID0+IHtcbiAgICAgICAgICAgIG1haWxTZXR0aW5ncy51cGRhdGVUZXN0QnV0dG9uU3RhdGVzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlc2V0IHN0YXRlIGFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZVxuICAgICAgICBjb25zdCBvcmlnaW5hbEFmdGVyU2VuZEZvcm0gPSBtYWlsU2V0dGluZ3MuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBtYWlsU2V0dGluZ3MuY2JBZnRlclNlbmRGb3JtID0gKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBvcmlnaW5hbEFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAvLyBBZnRlciBzdWNjZXNzZnVsIHNhdmUsIGJ1dHRvbnMgc2hvdWxkIGJlIGVuYWJsZWRcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbFNldHRpbmdzLnVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGVzdCBidXR0b24gc3RhdGVzIGJhc2VkIG9uIGZvcm0gY2hhbmdlc1xuICAgICAqL1xuICAgIHVwZGF0ZVRlc3RCdXR0b25TdGF0ZXMoKSB7XG4gICAgICAgIGNvbnN0ICR0ZXN0Q29ubmVjdGlvbkJ0biA9ICQoJyN0ZXN0LWNvbm5lY3Rpb24tYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRzZW5kVGVzdEVtYWlsQnRuID0gJCgnI3NlbmQtdGVzdC1lbWFpbC1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHN1Ym1pdEJ0biA9ICQoJyNzdWJtaXRidXR0b24nKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBmb3JtIGhhcyB1bnNhdmVkIGNoYW5nZXMgdXNpbmcgRm9ybSdzIGJ1aWx0LWluIG1ldGhvZFxuICAgICAgICBjb25zdCBoYXNDaGFuZ2VzID0gdHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uaGFzQ2hhbmdlcyAmJiBGb3JtLmhhc0NoYW5nZXMoKTtcblxuICAgICAgICBpZiAoaGFzQ2hhbmdlcykge1xuICAgICAgICAgICAgLy8gRm9ybSBoYXMgY2hhbmdlcyAtIGRpc2FibGUgdGVzdCBidXR0b25zIHdpdGggdmlzdWFsIGZlZWRiYWNrXG4gICAgICAgICAgICAkdGVzdENvbm5lY3Rpb25CdG5cbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS10b29sdGlwJywgZ2xvYmFsVHJhbnNsYXRlLm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1wb3NpdGlvbicsICd0b3AgY2VudGVyJylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1pbnZlcnRlZCcsICcnKTtcblxuICAgICAgICAgICAgJHNlbmRUZXN0RW1haWxCdG5cbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS10b29sdGlwJywgZ2xvYmFsVHJhbnNsYXRlLm1zX1NhdmVDaGFuZ2VzQmVmb3JlVGVzdGluZylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1wb3NpdGlvbicsICd0b3AgY2VudGVyJylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1pbnZlcnRlZCcsICcnKTtcblxuICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHNhdmUgYnV0dG9uIGlzIHZpc2libGUvZW5hYmxlZCB3aGVuIHRoZXJlIGFyZSBjaGFuZ2VzXG4gICAgICAgICAgICAkc3VibWl0QnRuLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vIGNoYW5nZXMgLSBlbmFibGUgdGVzdCBidXR0b25zXG4gICAgICAgICAgICAkdGVzdENvbm5lY3Rpb25CdG5cbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS10b29sdGlwJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1wb3NpdGlvbicpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtaW52ZXJ0ZWQnKTtcblxuICAgICAgICAgICAgJHNlbmRUZXN0RW1haWxCdG5cbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS10b29sdGlwJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1wb3NpdGlvbicpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtaW52ZXJ0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGJ1dHRvbnNcbiAgICAgICAgJCgnLnVpLmJ1dHRvbltkYXRhLXRvb2x0aXBdJykucG9wdXAoKTtcbiAgICB9LFxuXG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gRE9NIGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbWFpbFNldHRpbmdzLmluaXRpYWxpemUoKTtcblxuICAgIC8vIEVuc3VyZSBjbGljayBwcmV2ZW50aW9uIGZvciB0b29sdGlwIGljb25zIGluIGNoZWNrYm94ZXNcbiAgICAvLyBUaGlzIHByZXZlbnRzIGNoZWNrYm94IHRvZ2dsZSB3aGVuIGNsaWNraW5nIG9uIHRvb2x0aXAgaWNvblxuICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5vZmYoJ2NsaWNrLnRvb2x0aXAtcHJldmVudCcpLm9uKCdjbGljay50b29sdGlwLXByZXZlbnQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xufSk7Il19