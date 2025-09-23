"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

/* global globalRootUrl,globalTranslate, Form, PasswordScore, PbxApi, UserMessage, SoundFileSelector, GeneralSettingsAPI, ClipboardJS, PasswordWidget, PasswordValidationAPI, GeneralSettingsTooltipManager, $ */

/**
 * A module to handle modification of general settings.
 */
var generalSettingsModify = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#general-settings-form'),

  /**
   * jQuery object for the web admin password input field.
   * @type {jQuery}
   */
  $webAdminPassword: $('#WebAdminPassword'),

  /**
   * jQuery object for the ssh password input field.
   * @type {jQuery}
   */
  $sshPassword: $('#SSHPassword'),

  /**
   * jQuery object for the web ssh password input field.
   * @type {jQuery}
   */
  $disableSSHPassword: $('#SSHDisablePasswordLogins').parent('.checkbox'),

  /**
   * jQuery object for the SSH password fields
   * @type {jQuery}
   */
  $sshPasswordSegment: $('#only-if-password-enabled'),

  /**
   * If password set, it will be hided from web ui.
   */
  hiddenPassword: 'xxxxxxx',

  /**
   * Sound file field IDs
   * @type {object}
   */
  soundFileFields: {
    announcementIn: 'PBXRecordAnnouncementIn',
    announcementOut: 'PBXRecordAnnouncementOut'
  },

  /**
   * Original codec state from last load
   * @type {object}
   */
  originalCodecState: {},

  /**
   * Flag to track if codecs have been changed
   * @type {boolean}
   */
  codecsChanged: false,

  /**
   * Flag to track if data has been loaded from API
   * @type {boolean}
   */
  dataLoaded: false,

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    // generalSettingsModify.validateRules.SSHPassword.rules
    pbxname: {
      identifier: 'PBXName',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.gs_ValidateEmptyPBXName
      }]
    },
    WebAdminPassword: {
      identifier: 'WebAdminPassword',
      rules: []
    },
    WebAdminPasswordRepeat: {
      identifier: 'WebAdminPasswordRepeat',
      rules: [{
        type: 'match[WebAdminPassword]',
        prompt: globalTranslate.gs_ValidateWebPasswordsFieldDifferent
      }]
    },
    SSHPassword: {
      identifier: 'SSHPassword',
      rules: []
    },
    SSHPasswordRepeat: {
      identifier: 'SSHPasswordRepeat',
      rules: [{
        type: 'match[SSHPassword]',
        prompt: globalTranslate.gs_ValidateSSHPasswordsFieldDifferent
      }]
    },
    WEBPort: {
      identifier: 'WEBPort',
      rules: [{
        type: 'integer[1..65535]',
        prompt: globalTranslate.gs_ValidateWEBPortOutOfRange
      }, {
        type: 'different[WEBHTTPSPort]',
        prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToWEBPort
      }, {
        type: 'different[AJAMPortTLS]',
        prompt: globalTranslate.gs_ValidateWEBPortNotEqualToAjamPort
      }, {
        type: 'different[AJAMPort]',
        prompt: globalTranslate.gs_ValidateWEBPortNotEqualToAjamTLSPort
      }]
    },
    WEBHTTPSPort: {
      identifier: 'WEBHTTPSPort',
      rules: [{
        type: 'integer[1..65535]',
        prompt: globalTranslate.gs_ValidateWEBHTTPSPortOutOfRange
      }, {
        type: 'different[WEBPort]',
        prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToWEBPort
      }, {
        type: 'different[AJAMPortTLS]',
        prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToAjamPort
      }, {
        type: 'different[AJAMPort]',
        prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToAjamTLSPort
      }]
    },
    AJAMPort: {
      identifier: 'AJAMPort',
      rules: [{
        type: 'integer[1..65535]',
        prompt: globalTranslate.gs_ValidateAJAMPortOutOfRange
      }, {
        type: 'different[AJAMPortTLS]',
        prompt: globalTranslate.gs_ValidateAJAMPortOutOfRange
      }]
    },
    SIPAuthPrefix: {
      identifier: 'SIPAuthPrefix',
      rules: [{
        type: 'regExp[/^[a-zA-Z]*$/]',
        prompt: globalTranslate.gs_SIPAuthPrefixInvalid
      }]
    }
  },
  // Rules for the web admin password field when it not equal to hiddenPassword
  webAdminPasswordRules: [{
    type: 'empty',
    prompt: globalTranslate.gs_ValidateEmptyWebPassword
  }, {
    type: 'minLength[5]',
    prompt: globalTranslate.gs_ValidateWeakWebPassword
  }, {
    type: 'notRegExp',
    value: /[a-z]/,
    prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.psw_PasswordNoLowSimvol
  }, {
    type: 'notRegExp',
    value: /\d/,
    prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.psw_PasswordNoNumbers
  }, {
    type: 'notRegExp',
    value: /[A-Z]/,
    prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.psw_PasswordNoUpperSimvol
  }],
  // Rules for the SSH password field when SSH login through the password enabled, and it not equal to hiddenPassword
  additionalSshValidRulesPass: [{
    type: 'empty',
    prompt: globalTranslate.gs_ValidateEmptySSHPassword
  }, {
    type: 'minLength[5]',
    prompt: globalTranslate.gs_ValidateWeakSSHPassword
  }, {
    type: 'notRegExp',
    value: /[a-z]/,
    prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.psw_PasswordNoLowSimvol
  }, {
    type: 'notRegExp',
    value: /\d/,
    prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.psw_PasswordNoNumbers
  }, {
    type: 'notRegExp',
    value: /[A-Z]/,
    prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.psw_PasswordNoUpperSimvol
  }],
  // Rules for the SSH password field when SSH login through the password disabled
  additionalSshValidRulesNoPass: [{
    type: 'empty',
    prompt: globalTranslate.gs_ValidateEmptySSHPassword
  }, {
    type: 'minLength[5]',
    prompt: globalTranslate.gs_ValidateWeakSSHPassword
  }],

  /**
   * Clipboard instance for copy functionality
   * @type {ClipboardJS}
   */
  clipboard: null,

  /**
   *  Initialize module with event bindings and component initializations.
   */
  initialize: function initialize() {
    // Initialize password widgets
    // Web Admin Password widget - only validation and warnings, no buttons
    if (generalSettingsModify.$webAdminPassword.length > 0) {
      PasswordWidget.init(generalSettingsModify.$webAdminPassword, {
        context: 'general_web',
        generateButton: false,
        // No generate button
        showPasswordButton: false,
        // No show/hide button
        clipboardButton: false,
        // No copy button
        validateOnInput: true,
        showStrengthBar: true,
        showWarnings: true,
        checkOnLoad: true
      });
    } // SSH Password widget - only validation and warnings, no buttons


    if (generalSettingsModify.$sshPassword.length > 0) {
      var sshWidget = PasswordWidget.init(generalSettingsModify.$sshPassword, {
        context: 'general_ssh',
        generateButton: false,
        // No generate button
        showPasswordButton: false,
        // No show/hide button
        clipboardButton: false,
        // No copy button
        validateOnInput: true,
        showStrengthBar: true,
        showWarnings: true,
        checkOnLoad: true
      }); // Handle SSH disable checkbox

      $('#SSHDisablePasswordLogins').on('change', function () {
        var isDisabled = $('#SSHDisablePasswordLogins').checkbox('is checked');

        if (isDisabled && sshWidget) {
          PasswordWidget.hideWarnings(sshWidget);

          if (sshWidget.elements.$scoreSection) {
            sshWidget.elements.$scoreSection.hide();
          }
        } else if (!isDisabled && sshWidget) {
          PasswordWidget.checkPassword(sshWidget);
        }
      });
    } // Update validation rules when passwords change


    generalSettingsModify.$webAdminPassword.on('change', function () {
      if (generalSettingsModify.$webAdminPassword.val() !== generalSettingsModify.hiddenPassword) {
        generalSettingsModify.initRules();
      }
    });
    generalSettingsModify.$sshPassword.on('change', function () {
      if (generalSettingsModify.$sshPassword.val() !== generalSettingsModify.hiddenPassword) {
        generalSettingsModify.initRules();
      }
    }); // Enable tab navigation with history support

    $('#general-settings-menu').find('.item').tab({
      history: true,
      historyType: 'hash'
    }); // Initialize PBXLanguage dropdown first with special handler
    // Must be done before general dropdown initialization

    generalSettingsModify.initializePBXLanguageWarning(); // Enable dropdowns on the form (except sound file selectors and language dropdown)
    // Language dropdown already initialized above with special onChange handler

    $('#general-settings-form .dropdown').not('.audio-message-select').not('#PBXLanguage-dropdown').dropdown(); // Enable checkboxes on the form

    $('#general-settings-form .checkbox').checkbox(); // Initialize AMI/AJAM dependency after checkboxes are initialized

    generalSettingsModify.initializeAMIAJAMDependency(); // Codec table drag-n-drop will be initialized after data is loaded
    // See initializeCodecDragDrop() which is called from updateCodecTables()
    // Sound file selectors will be initialized after REST API data is loaded
    // See loadSoundFileValues() method called from populateForm()
    // Initialize the form

    generalSettingsModify.initializeForm(); // Note: SSH keys table will be initialized after data loads
    // Initialize truncated fields display

    generalSettingsModify.initializeTruncatedFields(); // Initialize clipboard for copy buttons

    generalSettingsModify.initializeClipboard(); // Initialize additional validation rules

    generalSettingsModify.initRules(); // Show, hide ssh password segment

    generalSettingsModify.$disableSSHPassword.checkbox({
      'onChange': generalSettingsModify.showHideSSHPassword
    });
    generalSettingsModify.showHideSSHPassword(); // Add event listener to handle tab activation

    $(window).on('GS-ActivateTab', function (event, nameTab) {
      $('#general-settings-menu').find('.item').tab('change tab', nameTab);
    }); // Initialize tooltips for form fields

    if (typeof GeneralSettingsTooltipManager !== 'undefined') {
      GeneralSettingsTooltipManager.initialize();
    } // Tooltip click behavior is now handled globally in TooltipBuilder.js
    // PBXLanguage dropdown with restart warning already initialized above
    // Load data from API instead of using server-rendered values


    generalSettingsModify.loadData();
  },

  /**
   * Initialize sound file selectors with playback functionality using SoundFileSelector
   * HTML structure is provided by the playAddNewSoundWithIcons partial in recording.volt:
   * - Hidden input: <input type="hidden" id="PBXRecordAnnouncementIn" name="PBXRecordAnnouncementIn">
   * - Dropdown div: <div class="ui selection dropdown search PBXRecordAnnouncementIn-dropdown">
   * - Playback button and add new button
   */
  initializeSoundFileSelectors: function initializeSoundFileSelectors() {// Sound file selectors will be initialized after data is loaded
    // See initializeSoundFileSelectorWithData() called from populateForm()
    // This method is kept for consistency but actual initialization happens
    // when we have data from the server in loadSoundFileValues()
  },

  /**
   * Load general settings data from API
   * Used both on initial page load and for manual refresh
   * Can be called anytime to reload the form data: generalSettingsModify.loadData()
   */
  loadData: function loadData() {
    // Show loading state on the form with dimmer
    Form.showLoadingState(true, 'Loading settings...');
    GeneralSettingsAPI.getSettings(function (response) {
      Form.hideLoadingState();

      if (response && response.result && response.data) {
        // Populate form with the received data
        generalSettingsModify.populateForm(response.data);
        generalSettingsModify.dataLoaded = true; // Show warnings for default passwords after DOM update

        if (response.data.passwordValidation) {
          // Use setTimeout to ensure DOM is updated after populateForm
          setTimeout(function () {
            generalSettingsModify.showDefaultPasswordWarnings(response.data.passwordValidation);
          }, 100);
        }
      } else if (response && response.messages) {
        console.error('API Error:', response.messages); // Show error message if available

        generalSettingsModify.showApiError(response.messages);
      }
    });
  },

  /**
   * Populate form with data from API
   * @param {object} data - Settings data from API response
   */
  populateForm: function populateForm(data) {
    // Extract settings and additional data
    var settings = data.settings || data;
    var codecs = data.codecs || []; // Use unified silent population approach

    Form.populateFormSilently(settings, {
      afterPopulate: function afterPopulate(formData) {
        // Handle special field types
        generalSettingsModify.populateSpecialFields(formData); // Load sound file values with representations

        generalSettingsModify.loadSoundFileValues(formData); // Update codec tables

        if (codecs.length > 0) {
          generalSettingsModify.updateCodecTables(codecs);
        } // Initialize password fields (hide actual passwords)


        generalSettingsModify.initializePasswordFields(formData); // Update SSH password visibility

        generalSettingsModify.showHideSSHPassword(); // Remove loading state

        generalSettingsModify.$formObj.removeClass('loading'); // Re-initialize form validation rules

        generalSettingsModify.initRules();
      }
    }); // Re-initialize dirty checking if enabled

    if (Form.enableDirrity) {
      Form.initializeDirrity();
    } // Initialize SSH keys table after data is loaded


    if (typeof sshKeysTable !== 'undefined') {
      sshKeysTable.initialize('ssh-keys-container', 'SSHAuthorizedKeys');
    } // Re-initialize truncated fields with new data


    generalSettingsModify.initializeTruncatedFields(); // Trigger event to notify that data has been loaded

    $(document).trigger('GeneralSettings.dataLoaded');
  },

  /**
   * Handle special field types that need custom population
   * @param {object} settings - Settings data
   */
  populateSpecialFields: function populateSpecialFields(settings) {
    // Private key existence is now determined by checking if value equals HIDDEN_PASSWORD
    // Handle certificate info
    if (settings.WEBHTTPSPublicKey_info) {
      $('#WEBHTTPSPublicKey').data('cert-info', settings.WEBHTTPSPublicKey_info);
    } // Handle checkboxes (API returns boolean values)


    Object.keys(settings).forEach(function (key) {
      var $checkbox = $("#".concat(key)).parent('.checkbox');

      if ($checkbox.length > 0) {
        var isChecked = settings[key] === true || settings[key] === '1' || settings[key] === 1;
        $checkbox.checkbox(isChecked ? 'check' : 'uncheck');
      } // Handle regular dropdowns (excluding sound file selectors which are handled separately)


      var $dropdown = $("#".concat(key)).parent('.dropdown');

      if ($dropdown.length > 0 && !$dropdown.hasClass('audio-message-select')) {
        $dropdown.dropdown('set selected', settings[key]);
      }
    });
  },

  /**
   * Initialize password fields with hidden password indicator
   * @param {object} settings - Settings data
   */
  initializePasswordFields: function initializePasswordFields(settings) {
    // Hide actual passwords and show hidden indicator
    if (settings.WebAdminPassword && settings.WebAdminPassword !== '') {
      generalSettingsModify.$formObj.form('set value', 'WebAdminPassword', generalSettingsModify.hiddenPassword);
      generalSettingsModify.$formObj.form('set value', 'WebAdminPasswordRepeat', generalSettingsModify.hiddenPassword);
    }

    if (settings.SSHPassword && settings.SSHPassword !== '') {
      generalSettingsModify.$formObj.form('set value', 'SSHPassword', generalSettingsModify.hiddenPassword);
      generalSettingsModify.$formObj.form('set value', 'SSHPasswordRepeat', generalSettingsModify.hiddenPassword);
    }
  },

  /**
   * Show API error messages
   * @param {object} messages - Error messages from API
   */
  showApiError: function showApiError(messages) {
    if (messages.error) {
      var errorMessage = Array.isArray(messages.error) ? messages.error.join(', ') : messages.error;
      UserMessage.showError(errorMessage);
    }
  },

  /**
   * Show warnings for default passwords
   * @param {object} validation - Password validation results from API
   */
  showDefaultPasswordWarnings: function showDefaultPasswordWarnings(validation) {
    // Remove any existing password-validate messages first
    $('.password-validate').remove(); // Show warning for default Web Admin password

    if (validation.isDefaultWebPassword) {
      // Find the password fields group - try multiple selectors
      var $webPasswordFields = $('#WebAdminPassword').closest('.two.fields');

      if ($webPasswordFields.length === 0) {
        // Try alternative selector if the first one doesn't work
        $webPasswordFields = $('#WebAdminPassword').parent().parent();
      }

      if ($webPasswordFields.length > 0) {
        // Create warning message
        var warningHtml = "\n                    <div class=\"ui negative icon message password-validate\">\n                        <i class=\"exclamation triangle icon\"></i>\n                        <div class=\"content\">\n                            <div class=\"header\">".concat(globalTranslate.psw_SetPassword || 'Security Warning', "</div>\n                            <p>").concat(globalTranslate.psw_ChangeDefaultPassword || 'You are using the default password. Please change it for security.', "</p>\n                        </div>\n                    </div>\n                "); // Insert warning before the password fields

        $webPasswordFields.before(warningHtml);
      }
    } // Show warning for default SSH password


    if (validation.isDefaultSSHPassword) {
      // Check if SSH password login is enabled
      var sshPasswordDisabled = $('#SSHDisablePasswordLogins').checkbox('is checked');

      if (!sshPasswordDisabled) {
        // Find the SSH password fields group
        var $sshPasswordFields = $('#SSHPassword').closest('.two.fields');

        if ($sshPasswordFields.length === 0) {
          // Try alternative selector
          $sshPasswordFields = $('#SSHPassword').parent().parent();
        }

        if ($sshPasswordFields.length > 0) {
          // Create warning message
          var _warningHtml = "\n                        <div class=\"ui negative icon message password-validate\">\n                            <i class=\"exclamation triangle icon\"></i>\n                            <div class=\"content\">\n                                <div class=\"header\">".concat(globalTranslate.psw_SetPassword || 'Security Warning', "</div>\n                                <p>").concat(globalTranslate.psw_ChangeDefaultPassword || 'You are using the default password. Please change it for security.', "</p>\n                            </div>\n                        </div>\n                    "); // Insert warning before the SSH password fields


          $sshPasswordFields.before(_warningHtml);
        }
      }
    }
  },

  /**
   * Initialize and load sound file selectors with data, similar to IVR implementation
   * @param {object} settings - Settings data from API
   */
  loadSoundFileValues: function loadSoundFileValues(settings) {
    // Convert empty values to -1 for the dropdown
    var dataIn = _objectSpread({}, settings);

    if (!settings.PBXRecordAnnouncementIn || settings.PBXRecordAnnouncementIn === '') {
      dataIn.PBXRecordAnnouncementIn = '-1';
    } // Initialize incoming announcement selector with data (following IVR pattern)


    SoundFileSelector.init('PBXRecordAnnouncementIn', {
      category: 'custom',
      includeEmpty: true,
      data: dataIn // ❌ NO onChange needed - complete automation by base class

    }); // Convert empty values to -1 for the dropdown

    var dataOut = _objectSpread({}, settings);

    if (!settings.PBXRecordAnnouncementOut || settings.PBXRecordAnnouncementOut === '') {
      dataOut.PBXRecordAnnouncementOut = '-1';
    } // Initialize outgoing announcement selector with data (following IVR pattern)


    SoundFileSelector.init('PBXRecordAnnouncementOut', {
      category: 'custom',
      includeEmpty: true,
      data: dataOut // ❌ NO onChange needed - complete automation by base class

    });
  },

  /**
   * Build and update codec tables with data from API
   * @param {Array} codecs - Array of codec configurations
   */
  updateCodecTables: function updateCodecTables(codecs) {
    // Reset codec change flag when loading data
    generalSettingsModify.codecsChanged = false; // Store original codec state for comparison

    generalSettingsModify.originalCodecState = {}; // Separate audio and video codecs

    var audioCodecs = codecs.filter(function (c) {
      return c.type === 'audio';
    }).sort(function (a, b) {
      return a.priority - b.priority;
    });
    var videoCodecs = codecs.filter(function (c) {
      return c.type === 'video';
    }).sort(function (a, b) {
      return a.priority - b.priority;
    }); // Build audio codecs table

    generalSettingsModify.buildCodecTable(audioCodecs, 'audio'); // Build video codecs table

    generalSettingsModify.buildCodecTable(videoCodecs, 'video'); // Hide loaders and show tables

    $('#audio-codecs-loader, #video-codecs-loader').removeClass('active');
    $('#audio-codecs-table, #video-codecs-table').show(); // Re-initialize drag and drop for reordering

    generalSettingsModify.initializeCodecDragDrop();
  },

  /**
   * Build codec table rows from data
   * @param {Array} codecs - Array of codec objects
   * @param {string} type - 'audio' or 'video'
   */
  buildCodecTable: function buildCodecTable(codecs, type) {
    var $tableBody = $("#".concat(type, "-codecs-table tbody"));
    $tableBody.empty();
    codecs.forEach(function (codec, index) {
      // Store original state for change detection
      generalSettingsModify.originalCodecState[codec.name] = {
        priority: index,
        disabled: codec.disabled
      }; // Create table row

      var isDisabled = codec.disabled === true || codec.disabled === '1' || codec.disabled === 1;
      var checked = !isDisabled ? 'checked' : '';
      var rowHtml = "\n                <tr class=\"codec-row\" id=\"codec-".concat(codec.name, "\" \n                    data-value=\"").concat(index, "\" \n                    data-codec-name=\"").concat(codec.name, "\"\n                    data-original-priority=\"").concat(index, "\">\n                    <td class=\"collapsing dragHandle\">\n                        <i class=\"sort grey icon\"></i>\n                    </td>\n                    <td>\n                        <div class=\"ui toggle checkbox codecs\">\n                            <input type=\"checkbox\" \n                                   name=\"codec_").concat(codec.name, "\" \n                                   ").concat(checked, "\n                                   tabindex=\"0\" \n                                   class=\"hidden\">\n                            <label for=\"codec_").concat(codec.name, "\">").concat(generalSettingsModify.escapeHtml(codec.description || codec.name), "</label>\n                        </div>\n                    </td>\n                </tr>\n            ");
      $tableBody.append(rowHtml);
    }); // Initialize checkboxes for the new rows

    $tableBody.find('.checkbox').checkbox({
      onChange: function onChange() {
        // Mark codecs as changed and form as changed
        generalSettingsModify.codecsChanged = true;
        Form.dataChanged();
      }
    });
  },

  /**
   * Initialize drag and drop for codec tables
   */
  initializeCodecDragDrop: function initializeCodecDragDrop() {
    $('#audio-codecs-table, #video-codecs-table').tableDnD({
      onDragClass: 'hoveringRow',
      dragHandle: '.dragHandle',
      onDrop: function onDrop() {
        // Mark codecs as changed and form as changed
        generalSettingsModify.codecsChanged = true;
        Form.dataChanged();
      }
    });
  },

  /**
   * Initialize certificate field display only
   */
  initializeCertificateField: function initializeCertificateField() {
    // Handle WEBHTTPSPublicKey field only
    var $certPubKeyField = $('#WEBHTTPSPublicKey');

    if ($certPubKeyField.length) {
      var fullValue = $certPubKeyField.val();
      var $container = $certPubKeyField.parent(); // Get certificate info if available from data attribute

      var certInfo = $certPubKeyField.data('cert-info') || {}; // Remove any existing display elements for this field only

      $container.find('.cert-display, .cert-edit-form').remove();

      if (fullValue) {
        // Create meaningful display text from certificate info
        var displayText = '';

        if (certInfo && !certInfo.error) {
          var parts = []; // Add subject/domain

          if (certInfo.subject) {
            parts.push("\uD83D\uDCDC ".concat(certInfo.subject));
          } // Add issuer if not self-signed


          if (certInfo.issuer && !certInfo.is_self_signed) {
            parts.push("by ".concat(certInfo.issuer));
          } else if (certInfo.is_self_signed) {
            parts.push('(Self-signed)');
          } // Add validity dates


          if (certInfo.valid_to) {
            if (certInfo.is_expired) {
              parts.push("\u274C Expired ".concat(certInfo.valid_to));
            } else if (certInfo.days_until_expiry <= 30) {
              parts.push("\u26A0\uFE0F Expires in ".concat(certInfo.days_until_expiry, " days"));
            } else {
              parts.push("\u2705 Valid until ".concat(certInfo.valid_to));
            }
          }

          displayText = parts.join(' | ');
        } else {
          // Fallback to truncated certificate
          displayText = generalSettingsModify.truncateCertificate(fullValue);
        } // Hide the original field


        $certPubKeyField.hide(); // Add status color class based on certificate status

        var statusClass = '';

        if (certInfo.is_expired) {
          statusClass = 'error';
        } else if (certInfo.days_until_expiry <= 30) {
          statusClass = 'warning';
        }

        var displayHtml = "\n                    <div class=\"ui action input fluid cert-display ".concat(statusClass, "\">\n                        <input type=\"text\" value=\"").concat(generalSettingsModify.escapeHtml(displayText), "\" readonly class=\"truncated-display\" />\n                        <button class=\"ui button icon basic copy-btn\" data-clipboard-text=\"").concat(generalSettingsModify.escapeHtml(fullValue), "\"\n                                data-variation=\"basic\" data-content=\"").concat(globalTranslate.bt_ToolTipCopyCert || 'Copy certificate', "\">\n                            <i class=\"copy icon blue\"></i>\n                        </button>\n                        <button class=\"ui button icon basic info-cert-btn\"\n                                data-content=\"").concat(globalTranslate.bt_ToolTipCertInfo || 'Certificate details', "\">\n                            <i class=\"info circle icon blue\"></i>\n                        </button>\n                        <button class=\"ui button icon basic edit-btn\"\n                                data-content=\"").concat(globalTranslate.bt_ToolTipEdit || 'Edit certificate', "\">\n                            <i class=\"edit icon blue\"></i>\n                        </button>\n                        <button class=\"ui button icon basic delete-cert-btn\"\n                                data-content=\"").concat(globalTranslate.bt_ToolTipDelete || 'Delete certificate', "\">\n                            <i class=\"trash icon red\"></i>\n                        </button>\n                    </div>\n                    ").concat(certInfo && !certInfo.error ? generalSettingsModify.renderCertificateDetails(certInfo) : '', "\n                    <div class=\"ui form cert-edit-form\" style=\"display:none;\">\n                        <div class=\"field\">\n                            <textarea id=\"WEBHTTPSPublicKey_edit\" \n                                      rows=\"10\" \n                                      placeholder=\"").concat(globalTranslate.gs_PastePublicCert || 'Paste public certificate here...', "\">").concat(fullValue, "</textarea>\n                        </div>\n                        <div class=\"ui mini buttons\">\n                            <button class=\"ui positive button save-cert-btn\">\n                                <i class=\"check icon\"></i> ").concat(globalTranslate.bt_Save || 'Save', "\n                            </button>\n                            <button class=\"ui button cancel-cert-btn\">\n                                <i class=\"close icon\"></i> ").concat(globalTranslate.bt_Cancel || 'Cancel', "\n                            </button>\n                        </div>\n                    </div>\n                ");
        $container.append(displayHtml); // Handle info button - toggle details display

        $container.find('.info-cert-btn').on('click', function (e) {
          e.preventDefault();
          var $details = $container.find('.cert-details');

          if ($details.length) {
            $details.slideToggle();
          }
        }); // Handle edit button

        $container.find('.edit-btn').on('click', function (e) {
          e.preventDefault();
          $container.find('.cert-display').hide();
          $container.find('.cert-edit-form').show();
          $container.find('#WEBHTTPSPublicKey_edit').focus();
        }); // Handle save button

        $container.find('.save-cert-btn').on('click', function (e) {
          e.preventDefault();
          var newValue = $container.find('#WEBHTTPSPublicKey_edit').val(); // Update the original hidden field

          $certPubKeyField.val(newValue); // Trigger form validation

          if (typeof Form !== 'undefined' && Form.checkValues) {
            Form.checkValues();
          } // Re-initialize only the certificate field display with new value


          generalSettingsModify.initializeCertificateField();
        }); // Handle cancel button

        $container.find('.cancel-cert-btn').on('click', function (e) {
          e.preventDefault();
          $container.find('.cert-edit-form').hide();
          $container.find('.cert-display').show();
        }); // Handle delete button

        $container.find('.delete-cert-btn').on('click', function (e) {
          e.preventDefault(); // Clear the certificate

          $certPubKeyField.val(''); // Trigger form validation

          if (typeof Form !== 'undefined' && Form.checkValues) {
            Form.checkValues();
          } // Re-initialize only the certificate field to show empty field


          generalSettingsModify.initializeCertificateField();
        }); // Initialize tooltips

        $container.find('[data-content]').popup(); // Re-initialize clipboard for new buttons

        if (generalSettingsModify.clipboard) {
          generalSettingsModify.clipboard.destroy();
          generalSettingsModify.initializeClipboard();
        }
      } else {
        // Show the original field for input with proper placeholder
        $certPubKeyField.show();
        $certPubKeyField.attr('placeholder', globalTranslate.gs_PastePublicCert || 'Paste public certificate here...');
        $certPubKeyField.attr('rows', '10'); // Ensure change events trigger form validation

        $certPubKeyField.off('input.cert change.cert keyup.cert').on('input.cert change.cert keyup.cert', function () {
          if (typeof Form !== 'undefined' && Form.checkValues) {
            Form.checkValues();
          }
        });
      }
    }
  },

  /**
   * Initialize truncated fields display for SSH keys and certificates
   */
  initializeTruncatedFields: function initializeTruncatedFields() {
    // Handle SSH_ID_RSA_PUB field
    var $sshPubKeyField = $('#SSH_ID_RSA_PUB');

    if ($sshPubKeyField.length) {
      var fullValue = $sshPubKeyField.val();
      var $container = $sshPubKeyField.parent(); // Remove any existing display elements

      $container.find('.ssh-key-display, .full-display').remove(); // Only create display if there's a value

      if (fullValue) {
        // Create truncated display
        var truncated = generalSettingsModify.truncateSSHKey(fullValue); // Hide the original field

        $sshPubKeyField.hide();
        var displayHtml = "\n                    <div class=\"ui action input fluid ssh-key-display\">\n                        <input type=\"text\" value=\"".concat(truncated, "\" readonly class=\"truncated-display\" />\n                        <button class=\"ui button icon basic copy-btn\" data-clipboard-text=\"").concat(generalSettingsModify.escapeHtml(fullValue), "\" \n                                data-variation=\"basic\" data-content=\"").concat(globalTranslate.bt_ToolTipCopyKey || 'Copy', "\">\n                            <i class=\"copy icon blue\"></i>\n                        </button>\n                        <button class=\"ui button icon basic expand-btn\" \n                                data-content=\"").concat(globalTranslate.bt_ToolTipExpand || 'Show full key', "\">\n                            <i class=\"expand icon blue\"></i>\n                        </button>\n                    </div>\n                    <textarea class=\"full-display\" style=\"display:none;\" readonly>").concat(fullValue, "</textarea>\n                ");
        $container.append(displayHtml); // Handle expand/collapse

        $container.find('.expand-btn').on('click', function (e) {
          e.preventDefault();
          var $fullDisplay = $container.find('.full-display');
          var $truncatedDisplay = $container.find('.ssh-key-display');
          var $icon = $(this).find('i');

          if ($fullDisplay.is(':visible')) {
            $fullDisplay.hide();
            $truncatedDisplay.show();
            $icon.removeClass('compress').addClass('expand');
          } else {
            $fullDisplay.show();
            $truncatedDisplay.hide();
            $icon.removeClass('expand').addClass('compress');
          }
        }); // Initialize tooltips for new elements

        $container.find('[data-content]').popup();
      } else {
        // Show the original field as read-only (this is a system-generated key)
        $sshPubKeyField.show();
        $sshPubKeyField.attr('readonly', true);
        $sshPubKeyField.attr('placeholder', globalTranslate.gs_NoSSHPublicKey || 'No SSH public key generated');
      }
    } // Handle WEBHTTPSPublicKey field - use dedicated method


    generalSettingsModify.initializeCertificateField(); // Handle WEBHTTPSPrivateKey field (write-only with password masking)

    var $certPrivKeyField = $('#WEBHTTPSPrivateKey');

    if ($certPrivKeyField.length) {
      var _$container = $certPrivKeyField.parent(); // Remove any existing display elements


      _$container.find('.private-key-set, #WEBHTTPSPrivateKey_new').remove(); // Check if private key exists (password masking logic)
      // The field will contain 'xxxxxxx' if a private key is set


      var currentValue = $certPrivKeyField.val();
      var hasValue = currentValue === generalSettingsModify.hiddenPassword;

      if (hasValue) {
        // Hide original field and show status message
        $certPrivKeyField.hide();

        var _displayHtml = "\n                    <div class=\"ui info message private-key-set\">\n                        <p>\n                            <i class=\"lock icon\"></i>\n                            ".concat(globalTranslate.gs_PrivateKeyIsSet || 'Private key is configured', " \n                            <a href=\"#\" class=\"replace-key-link\">").concat(globalTranslate.gs_Replace || 'Replace', "</a>\n                        </p>\n                    </div>\n                    <textarea id=\"WEBHTTPSPrivateKey_new\" name=\"WEBHTTPSPrivateKey\" \n                              rows=\"10\"\n                              style=\"display:none;\" \n                              placeholder=\"").concat(globalTranslate.gs_PastePrivateKey || 'Paste private key here...', "\"></textarea>\n                ");

        _$container.append(_displayHtml); // Handle replace link


        _$container.find('.replace-key-link').on('click', function (e) {
          e.preventDefault();

          _$container.find('.private-key-set').hide();

          var $newField = _$container.find('#WEBHTTPSPrivateKey_new');

          $newField.show().focus(); // Clear the hidden password value so we can set a new one

          $certPrivKeyField.val(''); // Bind change event to update hidden field and enable save button

          $newField.on('input change keyup', function () {
            // Update the original hidden field with new value
            $certPrivKeyField.val($newField.val()); // Trigger form validation check

            if (typeof Form !== 'undefined' && Form.checkValues) {
              Form.checkValues();
            }
          });
        });
      } else {
        // Show the original field for input with proper placeholder
        $certPrivKeyField.show();
        $certPrivKeyField.attr('placeholder', globalTranslate.gs_PastePrivateKey || 'Paste private key here...');
        $certPrivKeyField.attr('rows', '10'); // Ensure change events trigger form validation

        $certPrivKeyField.off('input.priv change.priv keyup.priv').on('input.priv change.priv keyup.priv', function () {
          if (typeof Form !== 'undefined' && Form.checkValues) {
            Form.checkValues();
          }
        });
      }
    }
  },

  /**
   * Initialize clipboard functionality for copy buttons
   */
  initializeClipboard: function initializeClipboard() {
    if (generalSettingsModify.clipboard) {
      generalSettingsModify.clipboard.destroy();
    }

    generalSettingsModify.clipboard = new ClipboardJS('.copy-btn');
    generalSettingsModify.clipboard.on('success', function (e) {
      // Show success message
      var $btn = $(e.trigger);
      var originalIcon = $btn.find('i').attr('class');
      $btn.find('i').removeClass().addClass('check icon');
      setTimeout(function () {
        $btn.find('i').removeClass().addClass(originalIcon);
      }, 2000); // Clear selection

      e.clearSelection();
    });
    generalSettingsModify.clipboard.on('error', function () {
      UserMessage.showError(globalTranslate.gs_CopyFailed || 'Failed to copy to clipboard');
    });
  },

  /**
   * Truncate SSH key for display
   * @param {string} key - Full SSH key
   * @return {string} Truncated key
   */
  truncateSSHKey: function truncateSSHKey(key) {
    if (!key || key.length < 50) {
      return key;
    }

    var parts = key.split(' ');

    if (parts.length >= 2) {
      var keyType = parts[0];
      var keyData = parts[1];
      var comment = parts.slice(2).join(' ');

      if (keyData.length > 40) {
        var truncated = keyData.substring(0, 20) + '...' + keyData.substring(keyData.length - 15);
        return "".concat(keyType, " ").concat(truncated, " ").concat(comment).trim();
      }
    }

    return key;
  },

  /**
   * Truncate certificate for display
   * @param {string} cert - Full certificate
   * @return {string} Truncated certificate in single line format
   */
  truncateCertificate: function truncateCertificate(cert) {
    if (!cert || cert.length < 100) {
      return cert;
    }

    var lines = cert.split('\n').filter(function (line) {
      return line.trim();
    }); // Extract first and last meaningful lines

    var firstLine = lines[0] || '';
    var lastLine = lines[lines.length - 1] || ''; // For certificates, show begin and end markers

    if (firstLine.includes('BEGIN CERTIFICATE')) {
      return "".concat(firstLine, "...").concat(lastLine);
    } // For other formats, truncate the content


    var cleanCert = cert.replace(/\n/g, ' ').trim();

    if (cleanCert.length > 80) {
      return cleanCert.substring(0, 40) + '...' + cleanCert.substring(cleanCert.length - 30);
    }

    return cleanCert;
  },

  /**
   * Escape HTML for safe display
   * @param {string} text - Text to escape
   * @return {string} Escaped text
   */
  escapeHtml: function escapeHtml(text) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) {
      return map[m];
    });
  },

  /**
   * Show, hide ssh password segment according to the value of use SSH password checkbox.
   */
  showHideSSHPassword: function showHideSSHPassword() {
    if (generalSettingsModify.$disableSSHPassword.checkbox('is checked')) {
      generalSettingsModify.$sshPasswordSegment.hide();
    } else {
      generalSettingsModify.$sshPasswordSegment.show();
    }

    generalSettingsModify.initRules();
  },

  /**
   * Callback function to be called before the form is sent
   * Prepares data for REST API submission
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings; // Handle certificate fields - only send if user actually entered new values

    if (result.data.WEBHTTPSPrivateKey !== undefined) {
      var privateKeyValue = result.data.WEBHTTPSPrivateKey; // If the field is empty or contains the hidden password, don't send it

      if (privateKeyValue === '' || privateKeyValue === generalSettingsModify.hiddenPassword) {
        delete result.data.WEBHTTPSPrivateKey;
      }
    } // Same for public key - don't send empty values


    if (result.data.WEBHTTPSPublicKey !== undefined && result.data.WEBHTTPSPublicKey === '') {
      delete result.data.WEBHTTPSPublicKey;
    } // Clean up unnecessary fields before sending


    var fieldsToRemove = ['dirrty', 'deleteAllInput']; // Remove codec_* fields (they're replaced with the codecs array)

    Object.keys(result.data).forEach(function (key) {
      if (key.startsWith('codec_') || fieldsToRemove.includes(key)) {
        delete result.data[key];
      }
    }); // Check if we should process codecs
    // When sendOnlyChanged is enabled, only process codecs if they were actually changed

    var shouldProcessCodecs = !Form.sendOnlyChanged || generalSettingsModify.codecsChanged;

    if (shouldProcessCodecs) {
      // Collect all codec data when they've been changed
      var arrCodecs = []; // Process all codec rows

      $('#audio-codecs-table .codec-row, #video-codecs-table .codec-row').each(function (currentIndex, obj) {
        var codecName = $(obj).attr('data-codec-name');

        if (codecName) {
          var currentDisabled = $(obj).find('.checkbox').checkbox('is unchecked');
          arrCodecs.push({
            name: codecName,
            disabled: currentDisabled,
            priority: currentIndex
          });
        }
      }); // Include codecs if they were changed or sendOnlyChanged is false

      if (arrCodecs.length > 0) {
        result.data.codecs = arrCodecs;
      }
    }

    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * Handles REST API response structure
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    $("#error-messages").remove(); // REST API response structure: { result: bool, data: {}, messages: {} }

    if (!response.result) {
      Form.$submitButton.removeClass('disabled');
      generalSettingsModify.generateErrorMessageHtml(response);
    } else {
      // Update password fields to hidden value on success
      generalSettingsModify.$formObj.form('set value', 'WebAdminPassword', generalSettingsModify.hiddenPassword);
      generalSettingsModify.$formObj.form('set value', 'WebAdminPasswordRepeat', generalSettingsModify.hiddenPassword);
      generalSettingsModify.$formObj.form('set value', 'SSHPassword', generalSettingsModify.hiddenPassword);
      generalSettingsModify.$formObj.form('set value', 'SSHPasswordRepeat', generalSettingsModify.hiddenPassword); // Remove password validation warnings after successful save

      $('.password-validate').fadeOut(300, function () {
        $(this).remove();
      });
    } // Check delete all conditions if needed


    if (typeof generalSettingsDeleteAll !== 'undefined') {
      generalSettingsDeleteAll.checkDeleteConditions();
    }
  },

  /**
   * Generate error message HTML from REST API response
   * @param {Object} response - API response with error messages
   */
  generateErrorMessageHtml: function generateErrorMessageHtml(response) {
    if (response.messages) {
      var $div = $('<div>', {
        "class": 'ui negative message',
        id: 'error-messages'
      });
      var $header = $('<div>', {
        "class": 'header'
      }).text(globalTranslate.gs_ErrorSaveSettings);
      $div.append($header);
      var $ul = $('<ul>', {
        "class": 'list'
      });
      var messagesSet = new Set(); // Handle both error and validation message types

      ['error', 'validation'].forEach(function (msgType) {
        if (response.messages[msgType]) {
          var messages = Array.isArray(response.messages[msgType]) ? response.messages[msgType] : [response.messages[msgType]];
          messages.forEach(function (error) {
            var textContent = '';

            if (_typeof(error) === 'object' && error.message) {
              textContent = globalTranslate[error.message] || error.message;
            } else {
              textContent = globalTranslate[error] || error;
            }

            if (!messagesSet.has(textContent)) {
              messagesSet.add(textContent);
              $ul.append($('<li>').text(textContent));
            }
          });
        }
      });
      $div.append($ul);
      $('#submitbutton').before($div);
    }
  },

  /**
   * Initialize the validation rules of the form
   */
  initRules: function initRules() {
    // SSHPassword
    if (generalSettingsModify.$disableSSHPassword.checkbox('is checked')) {
      Form.validateRules.SSHPassword.rules = generalSettingsModify.additionalSshValidRulesNoPass;
    } else if (generalSettingsModify.$sshPassword.val() === generalSettingsModify.hiddenPassword) {
      Form.validateRules.SSHPassword.rules = [];
    } else {
      Form.validateRules.SSHPassword.rules = generalSettingsModify.additionalSshValidRulesPass;
    } // WebAdminPassword


    if (generalSettingsModify.$webAdminPassword.val() === generalSettingsModify.hiddenPassword) {
      Form.validateRules.WebAdminPassword.rules = [];
    } else {
      Form.validateRules.WebAdminPassword.rules = generalSettingsModify.webAdminPasswordRules;
    }
  },

  /**
   * Render certificate details HTML
   * @param {object} certInfo - Certificate information object
   * @returns {string} HTML for certificate details
   */
  renderCertificateDetails: function renderCertificateDetails(certInfo) {
    var html = '<div class="cert-details" style="display:none; margin-top:10px;">';
    html += '<div class="ui segment">';
    html += '<div class="ui tiny list">'; // Subject

    if (certInfo.subject) {
      html += "<div class=\"item\"><strong>Subject:</strong> ".concat(generalSettingsModify.escapeHtml(certInfo.subject), "</div>");
    } // Issuer


    if (certInfo.issuer) {
      html += "<div class=\"item\"><strong>Issuer:</strong> ".concat(generalSettingsModify.escapeHtml(certInfo.issuer));

      if (certInfo.is_self_signed) {
        html += ' <span class="ui tiny label">Self-signed</span>';
      }

      html += '</div>';
    } // Validity period


    if (certInfo.valid_from && certInfo.valid_to) {
      html += "<div class=\"item\"><strong>Valid:</strong> ".concat(certInfo.valid_from, " to ").concat(certInfo.valid_to, "</div>");
    } // Expiry status


    if (certInfo.is_expired) {
      html += '<div class="item"><span class="ui tiny red label">Certificate Expired</span></div>';
    } else if (certInfo.days_until_expiry <= 30) {
      html += "<div class=\"item\"><span class=\"ui tiny yellow label\">Expires in ".concat(certInfo.days_until_expiry, " days</span></div>");
    } else if (certInfo.days_until_expiry > 0) {
      html += "<div class=\"item\"><span class=\"ui tiny green label\">Valid for ".concat(certInfo.days_until_expiry, " days</span></div>");
    } // Subject Alternative Names


    if (certInfo.san && certInfo.san.length > 0) {
      html += '<div class="item"><strong>Alternative Names:</strong>';
      html += '<div class="ui tiny list" style="margin-left:10px;">';
      certInfo.san.forEach(function (san) {
        html += "<div class=\"item\">".concat(generalSettingsModify.escapeHtml(san), "</div>");
      });
      html += '</div></div>';
    }

    html += '</div>'; // Close list

    html += '</div>'; // Close segment

    html += '</div>'; // Close cert-details

    return html;
  },

  /**
   * Initialize AMI/AJAM dependency
   * AJAM requires AMI to be enabled since it's an HTTP wrapper over AMI
   */
  initializeAMIAJAMDependency: function initializeAMIAJAMDependency() {
    var $amiCheckbox = $('#AMIEnabled').parent('.checkbox');
    var $ajamCheckbox = $('#AJAMEnabled').parent('.checkbox');

    if ($amiCheckbox.length === 0 || $ajamCheckbox.length === 0) {
      return;
    } // Function to update AJAM state based on AMI state


    var updateAJAMState = function updateAJAMState() {
      var isAMIEnabled = $amiCheckbox.checkbox('is checked');

      if (!isAMIEnabled) {
        // If AMI is disabled, disable AJAM and make it read-only
        $ajamCheckbox.checkbox('uncheck');
        $ajamCheckbox.addClass('disabled'); // Add tooltip to explain why it's disabled

        $ajamCheckbox.attr('data-tooltip', globalTranslate.gs_AJAMRequiresAMI || 'AJAM requires AMI to be enabled');
        $ajamCheckbox.attr('data-position', 'top left');
      } else {
        // If AMI is enabled, allow AJAM to be toggled
        $ajamCheckbox.removeClass('disabled');
        $ajamCheckbox.removeAttr('data-tooltip');
        $ajamCheckbox.removeAttr('data-position');
      }
    }; // Initial state


    updateAJAMState(); // Listen for AMI checkbox changes using event delegation
    // This won't override existing handlers

    $('#AMIEnabled').on('change', function () {
      updateAJAMState();
    });
  },

  /**
   * Initialize PBXLanguage change detection for restart warning
   * Shows restart warning only when the language value changes
   */
  initializePBXLanguageWarning: function initializePBXLanguageWarning() {
    var $languageInput = $('#PBXLanguage'); // Hidden input

    var $languageDropdown = $('#PBXLanguage-dropdown'); // V5.0 pattern dropdown

    var $restartWarning = $('#restart-warning-PBXLanguage'); // Store original value and data loaded flag

    var originalValue = null;
    var isDataLoaded = false; // Hide warning initially

    $restartWarning.hide(); // Set original value after data loads

    $(document).on('GeneralSettings.dataLoaded', function () {
      originalValue = $languageInput.val();
      isDataLoaded = true;
    }); // Handle dropdown change event - use V5.0 dropdown selector

    $languageDropdown.dropdown({
      onChange: function onChange(value) {
        // SemanticUIDropdown automatically syncs hidden input value
        // No need to manually update $languageInput
        // Only show warning after data is loaded and value changed from original
        if (isDataLoaded && originalValue !== null && value !== originalValue) {
          $restartWarning.transition('fade in');
        } else if (isDataLoaded) {
          $restartWarning.transition('fade out');
        } // Trigger form change detection only after data is loaded


        if (isDataLoaded) {
          Form.dataChanged();
        }
      }
    });
  },

  /**
   * Initialize the form with REST API configuration
   */
  initializeForm: function initializeForm() {
    Form.$formObj = generalSettingsModify.$formObj; // Enable REST API mode

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = GeneralSettingsAPI;
    Form.apiSettings.saveMethod = 'saveSettings'; // Enable checkbox to boolean conversion for cleaner API requests

    Form.convertCheckboxesToBool = true; // Enable sending only changed fields for optimal PATCH semantics

    Form.sendOnlyChanged = true; // No redirect after save - stay on the same page

    Form.afterSubmitIndexUrl = null;
    Form.afterSubmitModifyUrl = null;
    Form.url = "#";
    Form.validateRules = generalSettingsModify.validateRules;
    Form.cbBeforeSendForm = generalSettingsModify.cbBeforeSendForm;
    Form.cbAfterSendForm = generalSettingsModify.cbAfterSendForm;
    Form.initialize();
  }
}; // When the document is ready, initialize the generalSettings management interface.

$(document).ready(function () {
  generalSettingsModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJjb2RlY3NDaGFuZ2VkIiwiZGF0YUxvYWRlZCIsInZhbGlkYXRlUnVsZXMiLCJwYnhuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lIiwiV2ViQWRtaW5QYXNzd29yZCIsIldlYkFkbWluUGFzc3dvcmRSZXBlYXQiLCJnc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50IiwiU1NIUGFzc3dvcmQiLCJTU0hQYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJXRUJQb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJXRUJIVFRQU1BvcnQiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0IiwiQUpBTVBvcnQiLCJnc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSIsIlNJUEF1dGhQcmVmaXgiLCJnc19TSVBBdXRoUHJlZml4SW52YWxpZCIsIndlYkFkbWluUGFzc3dvcmRSdWxlcyIsImdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkIiwidmFsdWUiLCJnc19QYXNzd29yZHMiLCJwc3dfUGFzc3dvcmROb0xvd1NpbXZvbCIsInBzd19QYXNzd29yZE5vTnVtYmVycyIsInBzd19QYXNzd29yZE5vVXBwZXJTaW12b2wiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3MiLCJnc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQiLCJnc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCIsImdzX1NTSFBhc3N3b3JkIiwiYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3MiLCJjbGlwYm9hcmQiLCJpbml0aWFsaXplIiwibGVuZ3RoIiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwiY29udGV4dCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwidmFsaWRhdGVPbklucHV0Iiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwiY2hlY2tPbkxvYWQiLCJzc2hXaWRnZXQiLCJvbiIsImlzRGlzYWJsZWQiLCJjaGVja2JveCIsImhpZGVXYXJuaW5ncyIsImVsZW1lbnRzIiwiJHNjb3JlU2VjdGlvbiIsImhpZGUiLCJjaGVja1Bhc3N3b3JkIiwidmFsIiwiaW5pdFJ1bGVzIiwiZmluZCIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmciLCJub3QiLCJkcm9wZG93biIsImluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcyIsImluaXRpYWxpemVDbGlwYm9hcmQiLCJzaG93SGlkZVNTSFBhc3N3b3JkIiwid2luZG93IiwiZXZlbnQiLCJuYW1lVGFiIiwiR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJsb2FkRGF0YSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMiLCJGb3JtIiwic2hvd0xvYWRpbmdTdGF0ZSIsIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsInBhc3N3b3JkVmFsaWRhdGlvbiIsInNldFRpbWVvdXQiLCJzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MiLCJtZXNzYWdlcyIsImNvbnNvbGUiLCJlcnJvciIsInNob3dBcGlFcnJvciIsInNldHRpbmdzIiwiY29kZWNzIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJwb3B1bGF0ZVNwZWNpYWxGaWVsZHMiLCJsb2FkU291bmRGaWxlVmFsdWVzIiwidXBkYXRlQ29kZWNUYWJsZXMiLCJpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNzaEtleXNUYWJsZSIsImRvY3VtZW50IiwidHJpZ2dlciIsIldFQkhUVFBTUHVibGljS2V5X2luZm8iLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsIiRjaGVja2JveCIsImlzQ2hlY2tlZCIsIiRkcm9wZG93biIsImhhc0NsYXNzIiwiZm9ybSIsImVycm9yTWVzc2FnZSIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInZhbGlkYXRpb24iLCJyZW1vdmUiLCJpc0RlZmF1bHRXZWJQYXNzd29yZCIsIiR3ZWJQYXNzd29yZEZpZWxkcyIsImNsb3Nlc3QiLCJ3YXJuaW5nSHRtbCIsInBzd19TZXRQYXNzd29yZCIsInBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmQiLCJiZWZvcmUiLCJpc0RlZmF1bHRTU0hQYXNzd29yZCIsInNzaFBhc3N3b3JkRGlzYWJsZWQiLCIkc3NoUGFzc3dvcmRGaWVsZHMiLCJkYXRhSW4iLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJkYXRhT3V0IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IiwiYXVkaW9Db2RlY3MiLCJmaWx0ZXIiLCJjIiwic29ydCIsImEiLCJiIiwicHJpb3JpdHkiLCJ2aWRlb0NvZGVjcyIsImJ1aWxkQ29kZWNUYWJsZSIsInNob3ciLCJpbml0aWFsaXplQ29kZWNEcmFnRHJvcCIsIiR0YWJsZUJvZHkiLCJlbXB0eSIsImNvZGVjIiwiaW5kZXgiLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGVja2VkIiwicm93SHRtbCIsImVzY2FwZUh0bWwiLCJkZXNjcmlwdGlvbiIsImFwcGVuZCIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkIiwiJGNlcnRQdWJLZXlGaWVsZCIsImZ1bGxWYWx1ZSIsIiRjb250YWluZXIiLCJjZXJ0SW5mbyIsImRpc3BsYXlUZXh0IiwicGFydHMiLCJzdWJqZWN0IiwicHVzaCIsImlzc3VlciIsImlzX3NlbGZfc2lnbmVkIiwidmFsaWRfdG8iLCJpc19leHBpcmVkIiwiZGF5c191bnRpbF9leHBpcnkiLCJ0cnVuY2F0ZUNlcnRpZmljYXRlIiwic3RhdHVzQ2xhc3MiLCJkaXNwbGF5SHRtbCIsImJ0X1Rvb2xUaXBDb3B5Q2VydCIsImJ0X1Rvb2xUaXBDZXJ0SW5mbyIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsInJlbmRlckNlcnRpZmljYXRlRGV0YWlscyIsImdzX1Bhc3RlUHVibGljQ2VydCIsImJ0X1NhdmUiLCJidF9DYW5jZWwiLCJlIiwicHJldmVudERlZmF1bHQiLCIkZGV0YWlscyIsInNsaWRlVG9nZ2xlIiwiZm9jdXMiLCJuZXdWYWx1ZSIsImNoZWNrVmFsdWVzIiwicG9wdXAiLCJkZXN0cm95IiwiYXR0ciIsIm9mZiIsIiRzc2hQdWJLZXlGaWVsZCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiYnRfVG9vbFRpcENvcHlLZXkiLCJidF9Ub29sVGlwRXhwYW5kIiwiJGZ1bGxEaXNwbGF5IiwiJHRydW5jYXRlZERpc3BsYXkiLCIkaWNvbiIsImlzIiwiYWRkQ2xhc3MiLCJnc19Ob1NTSFB1YmxpY0tleSIsIiRjZXJ0UHJpdktleUZpZWxkIiwiY3VycmVudFZhbHVlIiwiaGFzVmFsdWUiLCJnc19Qcml2YXRlS2V5SXNTZXQiLCJnc19SZXBsYWNlIiwiZ3NfUGFzdGVQcml2YXRlS2V5IiwiJG5ld0ZpZWxkIiwiQ2xpcGJvYXJkSlMiLCIkYnRuIiwib3JpZ2luYWxJY29uIiwiY2xlYXJTZWxlY3Rpb24iLCJnc19Db3B5RmFpbGVkIiwic3BsaXQiLCJrZXlUeXBlIiwia2V5RGF0YSIsImNvbW1lbnQiLCJzbGljZSIsInN1YnN0cmluZyIsInRyaW0iLCJjZXJ0IiwibGluZXMiLCJsaW5lIiwiZmlyc3RMaW5lIiwibGFzdExpbmUiLCJpbmNsdWRlcyIsImNsZWFuQ2VydCIsInJlcGxhY2UiLCJ0ZXh0IiwibWFwIiwibSIsImNiQmVmb3JlU2VuZEZvcm0iLCJXRUJIVFRQU1ByaXZhdGVLZXkiLCJ1bmRlZmluZWQiLCJwcml2YXRlS2V5VmFsdWUiLCJXRUJIVFRQU1B1YmxpY0tleSIsImZpZWxkc1RvUmVtb3ZlIiwic3RhcnRzV2l0aCIsInNob3VsZFByb2Nlc3NDb2RlY3MiLCJzZW5kT25seUNoYW5nZWQiLCJhcnJDb2RlY3MiLCJlYWNoIiwiY3VycmVudEluZGV4Iiwib2JqIiwiY29kZWNOYW1lIiwiY3VycmVudERpc2FibGVkIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsImdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbCIsImZhZGVPdXQiLCJnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwiLCJjaGVja0RlbGV0ZUNvbmRpdGlvbnMiLCIkZGl2IiwiaWQiLCIkaGVhZGVyIiwiZ3NfRXJyb3JTYXZlU2V0dGluZ3MiLCIkdWwiLCJtZXNzYWdlc1NldCIsIlNldCIsIm1zZ1R5cGUiLCJ0ZXh0Q29udGVudCIsIm1lc3NhZ2UiLCJoYXMiLCJhZGQiLCJodG1sIiwidmFsaWRfZnJvbSIsInNhbiIsIiRhbWlDaGVja2JveCIsIiRhamFtQ2hlY2tib3giLCJ1cGRhdGVBSkFNU3RhdGUiLCJpc0FNSUVuYWJsZWQiLCJnc19BSkFNUmVxdWlyZXNBTUkiLCJyZW1vdmVBdHRyIiwiJGxhbmd1YWdlSW5wdXQiLCIkbGFuZ3VhZ2VEcm9wZG93biIsIiRyZXN0YXJ0V2FybmluZyIsIm9yaWdpbmFsVmFsdWUiLCJpc0RhdGFMb2FkZWQiLCJ0cmFuc2l0aW9uIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwidXJsIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUdBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHFCQUFxQixHQUFHO0FBQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHdCQUFELENBTGU7O0FBTzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFRCxDQUFDLENBQUMsbUJBQUQsQ0FYTTs7QUFhMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsWUFBWSxFQUFFRixDQUFDLENBQUMsY0FBRCxDQWpCVzs7QUFtQjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLG1CQUFtQixFQUFFSCxDQUFDLENBQUMsMkJBQUQsQ0FBRCxDQUErQkksTUFBL0IsQ0FBc0MsV0FBdEMsQ0F2Qks7O0FBeUIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxtQkFBbUIsRUFBRUwsQ0FBQyxDQUFDLDJCQUFELENBN0JJOztBQStCMUI7QUFDSjtBQUNBO0FBQ0lNLEVBQUFBLGNBQWMsRUFBRSxTQWxDVTs7QUFvQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGVBQWUsRUFBRTtBQUNiQyxJQUFBQSxjQUFjLEVBQUUseUJBREg7QUFFYkMsSUFBQUEsZUFBZSxFQUFFO0FBRkosR0F4Q1M7O0FBNkMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRSxFQWpETTs7QUFtRDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxLQXZEVzs7QUF5RDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxLQTdEYzs7QUErRDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQUU7QUFDYkMsSUFBQUEsT0FBTyxFQUFFO0FBQ0xDLE1BQUFBLFVBQVUsRUFBRSxTQURQO0FBRUxDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkYsS0FERTtBQVVYQyxJQUFBQSxnQkFBZ0IsRUFBRTtBQUNkTixNQUFBQSxVQUFVLEVBQUUsa0JBREU7QUFFZEMsTUFBQUEsS0FBSyxFQUFFO0FBRk8sS0FWUDtBQWNYTSxJQUFBQSxzQkFBc0IsRUFBRTtBQUNwQlAsTUFBQUEsVUFBVSxFQUFFLHdCQURRO0FBRXBCQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUseUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNJO0FBRjVCLE9BREc7QUFGYSxLQWRiO0FBdUJYQyxJQUFBQSxXQUFXLEVBQUU7QUFDVFQsTUFBQUEsVUFBVSxFQUFFLGFBREg7QUFFVEMsTUFBQUEsS0FBSyxFQUFFO0FBRkUsS0F2QkY7QUEyQlhTLElBQUFBLGlCQUFpQixFQUFFO0FBQ2ZWLE1BQUFBLFVBQVUsRUFBRSxtQkFERztBQUVmQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsb0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNPO0FBRjVCLE9BREc7QUFGUSxLQTNCUjtBQW9DWEMsSUFBQUEsT0FBTyxFQUFFO0FBQ0xaLE1BQUFBLFVBQVUsRUFBRSxTQURQO0FBRUxDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxtQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1M7QUFGNUIsT0FERyxFQUtIO0FBQ0lYLFFBQUFBLElBQUksRUFBRSx5QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1U7QUFGNUIsT0FMRyxFQVNIO0FBQ0laLFFBQUFBLElBQUksRUFBRSx3QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1c7QUFGNUIsT0FURyxFQWFIO0FBQ0liLFFBQUFBLElBQUksRUFBRSxxQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1k7QUFGNUIsT0FiRztBQUZGLEtBcENFO0FBeURYQyxJQUFBQSxZQUFZLEVBQUU7QUFDVmpCLE1BQUFBLFVBQVUsRUFBRSxjQURGO0FBRVZDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxtQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2M7QUFGNUIsT0FERyxFQUtIO0FBQ0loQixRQUFBQSxJQUFJLEVBQUUsb0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNVO0FBRjVCLE9BTEcsRUFTSDtBQUNJWixRQUFBQSxJQUFJLEVBQUUsd0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNlO0FBRjVCLE9BVEcsRUFhSDtBQUNJakIsUUFBQUEsSUFBSSxFQUFFLHFCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDZ0I7QUFGNUIsT0FiRztBQUZHLEtBekRIO0FBOEVYQyxJQUFBQSxRQUFRLEVBQUU7QUFDTnJCLE1BQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxtQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2tCO0FBRjVCLE9BREcsRUFLSDtBQUNJcEIsUUFBQUEsSUFBSSxFQUFFLHdCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDa0I7QUFGNUIsT0FMRztBQUZELEtBOUVDO0FBMkZYQyxJQUFBQSxhQUFhLEVBQUU7QUFDWHZCLE1BQUFBLFVBQVUsRUFBRSxlQUREO0FBRVhDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSx1QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ29CO0FBRjVCLE9BREc7QUFGSTtBQTNGSixHQXBFVztBQTBLMUI7QUFDQUMsRUFBQUEscUJBQXFCLEVBQUUsQ0FDbkI7QUFDSXZCLElBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDc0I7QUFGNUIsR0FEbUIsRUFLbkI7QUFDSXhCLElBQUFBLElBQUksRUFBRSxjQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDdUI7QUFGNUIsR0FMbUIsRUFTbkI7QUFDSXpCLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsT0FGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ3lCLFlBQXhCLEdBQXVDLFFBQXZDLEdBQWtEekIsZUFBZSxDQUFDMEI7QUFIOUUsR0FUbUIsRUFjbkI7QUFDSTVCLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsSUFGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ3lCLFlBQXhCLEdBQXVDLFFBQXZDLEdBQWtEekIsZUFBZSxDQUFDMkI7QUFIOUUsR0FkbUIsRUFtQm5CO0FBQ0k3QixJQUFBQSxJQUFJLEVBQUUsV0FEVjtBQUVJMEIsSUFBQUEsS0FBSyxFQUFFLE9BRlg7QUFHSXpCLElBQUFBLE1BQU0sRUFBRSxRQUFRQyxlQUFlLENBQUN5QixZQUF4QixHQUF1QyxRQUF2QyxHQUFrRHpCLGVBQWUsQ0FBQzRCO0FBSDlFLEdBbkJtQixDQTNLRztBQW9NMUI7QUFDQUMsRUFBQUEsMkJBQTJCLEVBQUUsQ0FDekI7QUFDSS9CLElBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDOEI7QUFGNUIsR0FEeUIsRUFLekI7QUFDSWhDLElBQUFBLElBQUksRUFBRSxjQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDK0I7QUFGNUIsR0FMeUIsRUFTekI7QUFDSWpDLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsT0FGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ2dDLGNBQXhCLEdBQXlDLFFBQXpDLEdBQW9EaEMsZUFBZSxDQUFDMEI7QUFIaEYsR0FUeUIsRUFjekI7QUFDSTVCLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsSUFGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ2dDLGNBQXhCLEdBQXlDLFFBQXpDLEdBQW9EaEMsZUFBZSxDQUFDMkI7QUFIaEYsR0FkeUIsRUFtQnpCO0FBQ0k3QixJQUFBQSxJQUFJLEVBQUUsV0FEVjtBQUVJMEIsSUFBQUEsS0FBSyxFQUFFLE9BRlg7QUFHSXpCLElBQUFBLE1BQU0sRUFBRSxRQUFRQyxlQUFlLENBQUNnQyxjQUF4QixHQUF5QyxRQUF6QyxHQUFvRGhDLGVBQWUsQ0FBQzRCO0FBSGhGLEdBbkJ5QixDQXJNSDtBQStOMUI7QUFDQUssRUFBQUEsNkJBQTZCLEVBQUUsQ0FDM0I7QUFDSW5DLElBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDOEI7QUFGNUIsR0FEMkIsRUFLM0I7QUFDSWhDLElBQUFBLElBQUksRUFBRSxjQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDK0I7QUFGNUIsR0FMMkIsQ0FoT0w7O0FBMk8xQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxTQUFTLEVBQUUsSUEvT2U7O0FBaVAxQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFwUDBCLHdCQW9QYjtBQUVUO0FBQ0E7QUFDQSxRQUFJeEQscUJBQXFCLENBQUNHLGlCQUF0QixDQUF3Q3NELE1BQXhDLEdBQWlELENBQXJELEVBQXdEO0FBQ3BEQyxNQUFBQSxjQUFjLENBQUNDLElBQWYsQ0FBb0IzRCxxQkFBcUIsQ0FBQ0csaUJBQTFDLEVBQTZEO0FBQ3pEeUQsUUFBQUEsT0FBTyxFQUFFLGFBRGdEO0FBRXpEQyxRQUFBQSxjQUFjLEVBQUUsS0FGeUM7QUFFMUI7QUFDL0JDLFFBQUFBLGtCQUFrQixFQUFFLEtBSHFDO0FBRzFCO0FBQy9CQyxRQUFBQSxlQUFlLEVBQUUsS0FKd0M7QUFJekI7QUFDaENDLFFBQUFBLGVBQWUsRUFBRSxJQUx3QztBQU16REMsUUFBQUEsZUFBZSxFQUFFLElBTndDO0FBT3pEQyxRQUFBQSxZQUFZLEVBQUUsSUFQMkM7QUFRekRDLFFBQUFBLFdBQVcsRUFBRTtBQVI0QyxPQUE3RDtBQVVILEtBZlEsQ0FpQlQ7OztBQUNBLFFBQUluRSxxQkFBcUIsQ0FBQ0ksWUFBdEIsQ0FBbUNxRCxNQUFuQyxHQUE0QyxDQUFoRCxFQUFtRDtBQUMvQyxVQUFNVyxTQUFTLEdBQUdWLGNBQWMsQ0FBQ0MsSUFBZixDQUFvQjNELHFCQUFxQixDQUFDSSxZQUExQyxFQUF3RDtBQUN0RXdELFFBQUFBLE9BQU8sRUFBRSxhQUQ2RDtBQUV0RUMsUUFBQUEsY0FBYyxFQUFFLEtBRnNEO0FBRXZDO0FBQy9CQyxRQUFBQSxrQkFBa0IsRUFBRSxLQUhrRDtBQUd2QztBQUMvQkMsUUFBQUEsZUFBZSxFQUFFLEtBSnFEO0FBSXRDO0FBQ2hDQyxRQUFBQSxlQUFlLEVBQUUsSUFMcUQ7QUFNdEVDLFFBQUFBLGVBQWUsRUFBRSxJQU5xRDtBQU90RUMsUUFBQUEsWUFBWSxFQUFFLElBUHdEO0FBUXRFQyxRQUFBQSxXQUFXLEVBQUU7QUFSeUQsT0FBeEQsQ0FBbEIsQ0FEK0MsQ0FZL0M7O0FBQ0FqRSxNQUFBQSxDQUFDLENBQUMsMkJBQUQsQ0FBRCxDQUErQm1FLEVBQS9CLENBQWtDLFFBQWxDLEVBQTRDLFlBQU07QUFDOUMsWUFBTUMsVUFBVSxHQUFHcEUsQ0FBQyxDQUFDLDJCQUFELENBQUQsQ0FBK0JxRSxRQUEvQixDQUF3QyxZQUF4QyxDQUFuQjs7QUFDQSxZQUFJRCxVQUFVLElBQUlGLFNBQWxCLEVBQTZCO0FBQ3pCVixVQUFBQSxjQUFjLENBQUNjLFlBQWYsQ0FBNEJKLFNBQTVCOztBQUNBLGNBQUlBLFNBQVMsQ0FBQ0ssUUFBVixDQUFtQkMsYUFBdkIsRUFBc0M7QUFDbENOLFlBQUFBLFNBQVMsQ0FBQ0ssUUFBVixDQUFtQkMsYUFBbkIsQ0FBaUNDLElBQWpDO0FBQ0g7QUFDSixTQUxELE1BS08sSUFBSSxDQUFDTCxVQUFELElBQWVGLFNBQW5CLEVBQThCO0FBQ2pDVixVQUFBQSxjQUFjLENBQUNrQixhQUFmLENBQTZCUixTQUE3QjtBQUNIO0FBQ0osT0FWRDtBQVdILEtBMUNRLENBNENUOzs7QUFDQXBFLElBQUFBLHFCQUFxQixDQUFDRyxpQkFBdEIsQ0FBd0NrRSxFQUF4QyxDQUEyQyxRQUEzQyxFQUFxRCxZQUFNO0FBQ3ZELFVBQUlyRSxxQkFBcUIsQ0FBQ0csaUJBQXRCLENBQXdDMEUsR0FBeEMsT0FBa0Q3RSxxQkFBcUIsQ0FBQ1EsY0FBNUUsRUFBNEY7QUFDeEZSLFFBQUFBLHFCQUFxQixDQUFDOEUsU0FBdEI7QUFDSDtBQUNKLEtBSkQ7QUFNQTlFLElBQUFBLHFCQUFxQixDQUFDSSxZQUF0QixDQUFtQ2lFLEVBQW5DLENBQXNDLFFBQXRDLEVBQWdELFlBQU07QUFDbEQsVUFBSXJFLHFCQUFxQixDQUFDSSxZQUF0QixDQUFtQ3lFLEdBQW5DLE9BQTZDN0UscUJBQXFCLENBQUNRLGNBQXZFLEVBQXVGO0FBQ25GUixRQUFBQSxxQkFBcUIsQ0FBQzhFLFNBQXRCO0FBQ0g7QUFDSixLQUpELEVBbkRTLENBeURUOztBQUNBNUUsSUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEI2RSxJQUE1QixDQUFpQyxPQUFqQyxFQUEwQ0MsR0FBMUMsQ0FBOEM7QUFDMUNDLE1BQUFBLE9BQU8sRUFBRSxJQURpQztBQUUxQ0MsTUFBQUEsV0FBVyxFQUFFO0FBRjZCLEtBQTlDLEVBMURTLENBK0RUO0FBQ0E7O0FBQ0FsRixJQUFBQSxxQkFBcUIsQ0FBQ21GLDRCQUF0QixHQWpFUyxDQW1FVDtBQUNBOztBQUNBakYsSUFBQUEsQ0FBQyxDQUFDLGtDQUFELENBQUQsQ0FDS2tGLEdBREwsQ0FDUyx1QkFEVCxFQUVLQSxHQUZMLENBRVMsdUJBRlQsRUFHS0MsUUFITCxHQXJFUyxDQTBFVDs7QUFDQW5GLElBQUFBLENBQUMsQ0FBQyxrQ0FBRCxDQUFELENBQXNDcUUsUUFBdEMsR0EzRVMsQ0E2RVQ7O0FBQ0F2RSxJQUFBQSxxQkFBcUIsQ0FBQ3NGLDJCQUF0QixHQTlFUyxDQWdGVDtBQUNBO0FBRUE7QUFDQTtBQUVBOztBQUNBdEYsSUFBQUEscUJBQXFCLENBQUN1RixjQUF0QixHQXZGUyxDQXlGVDtBQUVBOztBQUNBdkYsSUFBQUEscUJBQXFCLENBQUN3Rix5QkFBdEIsR0E1RlMsQ0E4RlQ7O0FBQ0F4RixJQUFBQSxxQkFBcUIsQ0FBQ3lGLG1CQUF0QixHQS9GUyxDQWlHVDs7QUFDQXpGLElBQUFBLHFCQUFxQixDQUFDOEUsU0FBdEIsR0FsR1MsQ0FvR1Q7O0FBQ0E5RSxJQUFBQSxxQkFBcUIsQ0FBQ0ssbUJBQXRCLENBQTBDa0UsUUFBMUMsQ0FBbUQ7QUFDL0Msa0JBQVl2RSxxQkFBcUIsQ0FBQzBGO0FBRGEsS0FBbkQ7QUFHQTFGLElBQUFBLHFCQUFxQixDQUFDMEYsbUJBQXRCLEdBeEdTLENBMEdUOztBQUNBeEYsSUFBQUEsQ0FBQyxDQUFDeUYsTUFBRCxDQUFELENBQVV0QixFQUFWLENBQWEsZ0JBQWIsRUFBK0IsVUFBQ3VCLEtBQUQsRUFBUUMsT0FBUixFQUFvQjtBQUMvQzNGLE1BQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCNkUsSUFBNUIsQ0FBaUMsT0FBakMsRUFBMENDLEdBQTFDLENBQThDLFlBQTlDLEVBQTREYSxPQUE1RDtBQUNILEtBRkQsRUEzR1MsQ0ErR1Q7O0FBQ0EsUUFBSSxPQUFPQyw2QkFBUCxLQUF5QyxXQUE3QyxFQUEwRDtBQUN0REEsTUFBQUEsNkJBQTZCLENBQUN0QyxVQUE5QjtBQUNILEtBbEhRLENBb0hUO0FBRUE7QUFFQTs7O0FBQ0F4RCxJQUFBQSxxQkFBcUIsQ0FBQytGLFFBQXRCO0FBQ0gsR0E5V3lCOztBQWdYMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsNEJBdlgwQiwwQ0F1WEssQ0FDM0I7QUFDQTtBQUVBO0FBQ0E7QUFDSCxHQTdYeUI7O0FBK1gxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lELEVBQUFBLFFBcFkwQixzQkFvWWY7QUFDUDtBQUNBRSxJQUFBQSxJQUFJLENBQUNDLGdCQUFMLENBQXNCLElBQXRCLEVBQTRCLHFCQUE1QjtBQUVBQyxJQUFBQSxrQkFBa0IsQ0FBQ0MsV0FBbkIsQ0FBK0IsVUFBQ0MsUUFBRCxFQUFjO0FBQ3pDSixNQUFBQSxJQUFJLENBQUNLLGdCQUFMOztBQUVBLFVBQUlELFFBQVEsSUFBSUEsUUFBUSxDQUFDRSxNQUFyQixJQUErQkYsUUFBUSxDQUFDRyxJQUE1QyxFQUFrRDtBQUM5QztBQUNBeEcsUUFBQUEscUJBQXFCLENBQUN5RyxZQUF0QixDQUFtQ0osUUFBUSxDQUFDRyxJQUE1QztBQUNBeEcsUUFBQUEscUJBQXFCLENBQUNjLFVBQXRCLEdBQW1DLElBQW5DLENBSDhDLENBSzlDOztBQUNBLFlBQUl1RixRQUFRLENBQUNHLElBQVQsQ0FBY0Usa0JBQWxCLEVBQXNDO0FBQ2xDO0FBQ0FDLFVBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2IzRyxZQUFBQSxxQkFBcUIsQ0FBQzRHLDJCQUF0QixDQUFrRFAsUUFBUSxDQUFDRyxJQUFULENBQWNFLGtCQUFoRTtBQUNILFdBRlMsRUFFUCxHQUZPLENBQVY7QUFHSDtBQUNKLE9BWkQsTUFZTyxJQUFJTCxRQUFRLElBQUlBLFFBQVEsQ0FBQ1EsUUFBekIsRUFBbUM7QUFDdENDLFFBQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLFlBQWQsRUFBNEJWLFFBQVEsQ0FBQ1EsUUFBckMsRUFEc0MsQ0FFdEM7O0FBQ0E3RyxRQUFBQSxxQkFBcUIsQ0FBQ2dILFlBQXRCLENBQW1DWCxRQUFRLENBQUNRLFFBQTVDO0FBQ0g7QUFDSixLQXBCRDtBQXFCSCxHQTdaeUI7O0FBK1oxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSixFQUFBQSxZQW5hMEIsd0JBbWFiRCxJQW5hYSxFQW1hUDtBQUNmO0FBQ0EsUUFBTVMsUUFBUSxHQUFHVCxJQUFJLENBQUNTLFFBQUwsSUFBaUJULElBQWxDO0FBQ0EsUUFBTVUsTUFBTSxHQUFHVixJQUFJLENBQUNVLE1BQUwsSUFBZSxFQUE5QixDQUhlLENBS2Y7O0FBQ0FqQixJQUFBQSxJQUFJLENBQUNrQixvQkFBTCxDQUEwQkYsUUFBMUIsRUFBb0M7QUFDaENHLE1BQUFBLGFBQWEsRUFBRSx1QkFBQ0MsUUFBRCxFQUFjO0FBQ3pCO0FBQ0FySCxRQUFBQSxxQkFBcUIsQ0FBQ3NILHFCQUF0QixDQUE0Q0QsUUFBNUMsRUFGeUIsQ0FJekI7O0FBQ0FySCxRQUFBQSxxQkFBcUIsQ0FBQ3VILG1CQUF0QixDQUEwQ0YsUUFBMUMsRUFMeUIsQ0FPekI7O0FBQ0EsWUFBSUgsTUFBTSxDQUFDekQsTUFBUCxHQUFnQixDQUFwQixFQUF1QjtBQUNuQnpELFVBQUFBLHFCQUFxQixDQUFDd0gsaUJBQXRCLENBQXdDTixNQUF4QztBQUNILFNBVndCLENBWXpCOzs7QUFDQWxILFFBQUFBLHFCQUFxQixDQUFDeUgsd0JBQXRCLENBQStDSixRQUEvQyxFQWJ5QixDQWV6Qjs7QUFDQXJILFFBQUFBLHFCQUFxQixDQUFDMEYsbUJBQXRCLEdBaEJ5QixDQWtCekI7O0FBQ0ExRixRQUFBQSxxQkFBcUIsQ0FBQ0MsUUFBdEIsQ0FBK0J5SCxXQUEvQixDQUEyQyxTQUEzQyxFQW5CeUIsQ0FxQnpCOztBQUNBMUgsUUFBQUEscUJBQXFCLENBQUM4RSxTQUF0QjtBQUNIO0FBeEIrQixLQUFwQyxFQU5lLENBaUNmOztBQUNBLFFBQUltQixJQUFJLENBQUMwQixhQUFULEVBQXdCO0FBQ3BCMUIsTUFBQUEsSUFBSSxDQUFDMkIsaUJBQUw7QUFDSCxLQXBDYyxDQXNDZjs7O0FBQ0EsUUFBSSxPQUFPQyxZQUFQLEtBQXdCLFdBQTVCLEVBQXlDO0FBQ3JDQSxNQUFBQSxZQUFZLENBQUNyRSxVQUFiLENBQXdCLG9CQUF4QixFQUE4QyxtQkFBOUM7QUFDSCxLQXpDYyxDQTJDZjs7O0FBQ0F4RCxJQUFBQSxxQkFBcUIsQ0FBQ3dGLHlCQUF0QixHQTVDZSxDQThDZjs7QUFDQXRGLElBQUFBLENBQUMsQ0FBQzRILFFBQUQsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLDRCQUFwQjtBQUVILEdBcGR5Qjs7QUFzZDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lULEVBQUFBLHFCQTFkMEIsaUNBMGRKTCxRQTFkSSxFQTBkTTtBQUM1QjtBQUVBO0FBQ0EsUUFBSUEsUUFBUSxDQUFDZSxzQkFBYixFQUFxQztBQUNqQzlILE1BQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCc0csSUFBeEIsQ0FBNkIsV0FBN0IsRUFBMENTLFFBQVEsQ0FBQ2Usc0JBQW5EO0FBQ0gsS0FOMkIsQ0FRNUI7OztBQUNBQyxJQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWWpCLFFBQVosRUFBc0JrQixPQUF0QixDQUE4QixVQUFBQyxHQUFHLEVBQUk7QUFDakMsVUFBTUMsU0FBUyxHQUFHbkksQ0FBQyxZQUFLa0ksR0FBTCxFQUFELENBQWE5SCxNQUFiLENBQW9CLFdBQXBCLENBQWxCOztBQUNBLFVBQUkrSCxTQUFTLENBQUM1RSxNQUFWLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3RCLFlBQU02RSxTQUFTLEdBQUdyQixRQUFRLENBQUNtQixHQUFELENBQVIsS0FBa0IsSUFBbEIsSUFBMEJuQixRQUFRLENBQUNtQixHQUFELENBQVIsS0FBa0IsR0FBNUMsSUFBbURuQixRQUFRLENBQUNtQixHQUFELENBQVIsS0FBa0IsQ0FBdkY7QUFDQUMsUUFBQUEsU0FBUyxDQUFDOUQsUUFBVixDQUFtQitELFNBQVMsR0FBRyxPQUFILEdBQWEsU0FBekM7QUFDSCxPQUxnQyxDQU9qQzs7O0FBQ0EsVUFBTUMsU0FBUyxHQUFHckksQ0FBQyxZQUFLa0ksR0FBTCxFQUFELENBQWE5SCxNQUFiLENBQW9CLFdBQXBCLENBQWxCOztBQUNBLFVBQUlpSSxTQUFTLENBQUM5RSxNQUFWLEdBQW1CLENBQW5CLElBQXdCLENBQUM4RSxTQUFTLENBQUNDLFFBQVYsQ0FBbUIsc0JBQW5CLENBQTdCLEVBQXlFO0FBQ3JFRCxRQUFBQSxTQUFTLENBQUNsRCxRQUFWLENBQW1CLGNBQW5CLEVBQW1DNEIsUUFBUSxDQUFDbUIsR0FBRCxDQUEzQztBQUNIO0FBQ0osS0FaRDtBQWFILEdBaGZ5Qjs7QUFrZjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lYLEVBQUFBLHdCQXRmMEIsb0NBc2ZEUixRQXRmQyxFQXNmUztBQUMvQjtBQUNBLFFBQUlBLFFBQVEsQ0FBQzFGLGdCQUFULElBQTZCMEYsUUFBUSxDQUFDMUYsZ0JBQVQsS0FBOEIsRUFBL0QsRUFBbUU7QUFDL0R2QixNQUFBQSxxQkFBcUIsQ0FBQ0MsUUFBdEIsQ0FBK0J3SSxJQUEvQixDQUFvQyxXQUFwQyxFQUFpRCxrQkFBakQsRUFBcUV6SSxxQkFBcUIsQ0FBQ1EsY0FBM0Y7QUFDQVIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCd0ksSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsd0JBQWpELEVBQTJFekkscUJBQXFCLENBQUNRLGNBQWpHO0FBQ0g7O0FBRUQsUUFBSXlHLFFBQVEsQ0FBQ3ZGLFdBQVQsSUFBd0J1RixRQUFRLENBQUN2RixXQUFULEtBQXlCLEVBQXJELEVBQXlEO0FBQ3JEMUIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCd0ksSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsYUFBakQsRUFBZ0V6SSxxQkFBcUIsQ0FBQ1EsY0FBdEY7QUFDQVIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCd0ksSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsbUJBQWpELEVBQXNFekkscUJBQXFCLENBQUNRLGNBQTVGO0FBQ0g7QUFDSixHQWpnQnlCOztBQW1nQjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0l3RyxFQUFBQSxZQXZnQjBCLHdCQXVnQmJILFFBdmdCYSxFQXVnQkg7QUFDbkIsUUFBSUEsUUFBUSxDQUFDRSxLQUFiLEVBQW9CO0FBQ2hCLFVBQU0yQixZQUFZLEdBQUdDLEtBQUssQ0FBQ0MsT0FBTixDQUFjL0IsUUFBUSxDQUFDRSxLQUF2QixJQUNmRixRQUFRLENBQUNFLEtBQVQsQ0FBZThCLElBQWYsQ0FBb0IsSUFBcEIsQ0FEZSxHQUVmaEMsUUFBUSxDQUFDRSxLQUZmO0FBR0ErQixNQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0JMLFlBQXRCO0FBQ0g7QUFDSixHQTlnQnlCOztBQWdoQjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0k5QixFQUFBQSwyQkFwaEIwQix1Q0FvaEJFb0MsVUFwaEJGLEVBb2hCYztBQUNwQztBQUNBOUksSUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0IrSSxNQUF4QixHQUZvQyxDQUlwQzs7QUFDQSxRQUFJRCxVQUFVLENBQUNFLG9CQUFmLEVBQXFDO0FBQ2pDO0FBQ0EsVUFBSUMsa0JBQWtCLEdBQUdqSixDQUFDLENBQUMsbUJBQUQsQ0FBRCxDQUF1QmtKLE9BQXZCLENBQStCLGFBQS9CLENBQXpCOztBQUVBLFVBQUlELGtCQUFrQixDQUFDMUYsTUFBbkIsS0FBOEIsQ0FBbEMsRUFBcUM7QUFDakM7QUFDQTBGLFFBQUFBLGtCQUFrQixHQUFHakosQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJJLE1BQXZCLEdBQWdDQSxNQUFoQyxFQUFyQjtBQUNIOztBQUVELFVBQUk2SSxrQkFBa0IsQ0FBQzFGLE1BQW5CLEdBQTRCLENBQWhDLEVBQW1DO0FBQy9CO0FBQ0EsWUFBTTRGLFdBQVcsdVFBSWlCaEksZUFBZSxDQUFDaUksZUFBaEIsSUFBbUMsa0JBSnBELG9EQUtBakksZUFBZSxDQUFDa0kseUJBQWhCLElBQTZDLG9FQUw3Qyx1RkFBakIsQ0FGK0IsQ0FZL0I7O0FBQ0FKLFFBQUFBLGtCQUFrQixDQUFDSyxNQUFuQixDQUEwQkgsV0FBMUI7QUFDSDtBQUNKLEtBN0JtQyxDQStCcEM7OztBQUNBLFFBQUlMLFVBQVUsQ0FBQ1Msb0JBQWYsRUFBcUM7QUFDakM7QUFDQSxVQUFNQyxtQkFBbUIsR0FBR3hKLENBQUMsQ0FBQywyQkFBRCxDQUFELENBQStCcUUsUUFBL0IsQ0FBd0MsWUFBeEMsQ0FBNUI7O0FBRUEsVUFBSSxDQUFDbUYsbUJBQUwsRUFBMEI7QUFDdEI7QUFDQSxZQUFJQyxrQkFBa0IsR0FBR3pKLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JrSixPQUFsQixDQUEwQixhQUExQixDQUF6Qjs7QUFFQSxZQUFJTyxrQkFBa0IsQ0FBQ2xHLE1BQW5CLEtBQThCLENBQWxDLEVBQXFDO0FBQ2pDO0FBQ0FrRyxVQUFBQSxrQkFBa0IsR0FBR3pKLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JJLE1BQWxCLEdBQTJCQSxNQUEzQixFQUFyQjtBQUNIOztBQUVELFlBQUlxSixrQkFBa0IsQ0FBQ2xHLE1BQW5CLEdBQTRCLENBQWhDLEVBQW1DO0FBQy9CO0FBQ0EsY0FBTTRGLFlBQVcsdVJBSWlCaEksZUFBZSxDQUFDaUksZUFBaEIsSUFBbUMsa0JBSnBELHdEQUtBakksZUFBZSxDQUFDa0kseUJBQWhCLElBQTZDLG9FQUw3QyxtR0FBakIsQ0FGK0IsQ0FZL0I7OztBQUNBSSxVQUFBQSxrQkFBa0IsQ0FBQ0gsTUFBbkIsQ0FBMEJILFlBQTFCO0FBQ0g7QUFDSjtBQUNKO0FBQ0osR0FsbEJ5Qjs7QUFvbEIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJOUIsRUFBQUEsbUJBeGxCMEIsK0JBd2xCTk4sUUF4bEJNLEVBd2xCSTtBQUMxQjtBQUNBLFFBQU0yQyxNQUFNLHFCQUFPM0MsUUFBUCxDQUFaOztBQUNBLFFBQUksQ0FBQ0EsUUFBUSxDQUFDNEMsdUJBQVYsSUFBcUM1QyxRQUFRLENBQUM0Qyx1QkFBVCxLQUFxQyxFQUE5RSxFQUFrRjtBQUM5RUQsTUFBQUEsTUFBTSxDQUFDQyx1QkFBUCxHQUFpQyxJQUFqQztBQUNILEtBTHlCLENBTzFCOzs7QUFDQUMsSUFBQUEsaUJBQWlCLENBQUNuRyxJQUFsQixDQUF1Qix5QkFBdkIsRUFBa0Q7QUFDOUNvRyxNQUFBQSxRQUFRLEVBQUUsUUFEb0M7QUFFOUNDLE1BQUFBLFlBQVksRUFBRSxJQUZnQztBQUc5Q3hELE1BQUFBLElBQUksRUFBRW9ELE1BSHdDLENBSTlDOztBQUo4QyxLQUFsRCxFQVIwQixDQWUxQjs7QUFDQSxRQUFNSyxPQUFPLHFCQUFPaEQsUUFBUCxDQUFiOztBQUNBLFFBQUksQ0FBQ0EsUUFBUSxDQUFDaUQsd0JBQVYsSUFBc0NqRCxRQUFRLENBQUNpRCx3QkFBVCxLQUFzQyxFQUFoRixFQUFvRjtBQUNoRkQsTUFBQUEsT0FBTyxDQUFDQyx3QkFBUixHQUFtQyxJQUFuQztBQUNILEtBbkJ5QixDQXFCMUI7OztBQUNBSixJQUFBQSxpQkFBaUIsQ0FBQ25HLElBQWxCLENBQXVCLDBCQUF2QixFQUFtRDtBQUMvQ29HLE1BQUFBLFFBQVEsRUFBRSxRQURxQztBQUUvQ0MsTUFBQUEsWUFBWSxFQUFFLElBRmlDO0FBRy9DeEQsTUFBQUEsSUFBSSxFQUFFeUQsT0FIeUMsQ0FJL0M7O0FBSitDLEtBQW5EO0FBTUgsR0FwbkJ5Qjs7QUFzbkIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJekMsRUFBQUEsaUJBMW5CMEIsNkJBMG5CUk4sTUExbkJRLEVBMG5CQTtBQUN0QjtBQUNBbEgsSUFBQUEscUJBQXFCLENBQUNhLGFBQXRCLEdBQXNDLEtBQXRDLENBRnNCLENBSXRCOztBQUNBYixJQUFBQSxxQkFBcUIsQ0FBQ1ksa0JBQXRCLEdBQTJDLEVBQTNDLENBTHNCLENBT3RCOztBQUNBLFFBQU11SixXQUFXLEdBQUdqRCxNQUFNLENBQUNrRCxNQUFQLENBQWMsVUFBQUMsQ0FBQztBQUFBLGFBQUlBLENBQUMsQ0FBQ2xKLElBQUYsS0FBVyxPQUFmO0FBQUEsS0FBZixFQUF1Q21KLElBQXZDLENBQTRDLFVBQUNDLENBQUQsRUFBSUMsQ0FBSjtBQUFBLGFBQVVELENBQUMsQ0FBQ0UsUUFBRixHQUFhRCxDQUFDLENBQUNDLFFBQXpCO0FBQUEsS0FBNUMsQ0FBcEI7QUFDQSxRQUFNQyxXQUFXLEdBQUd4RCxNQUFNLENBQUNrRCxNQUFQLENBQWMsVUFBQUMsQ0FBQztBQUFBLGFBQUlBLENBQUMsQ0FBQ2xKLElBQUYsS0FBVyxPQUFmO0FBQUEsS0FBZixFQUF1Q21KLElBQXZDLENBQTRDLFVBQUNDLENBQUQsRUFBSUMsQ0FBSjtBQUFBLGFBQVVELENBQUMsQ0FBQ0UsUUFBRixHQUFhRCxDQUFDLENBQUNDLFFBQXpCO0FBQUEsS0FBNUMsQ0FBcEIsQ0FUc0IsQ0FXdEI7O0FBQ0F6SyxJQUFBQSxxQkFBcUIsQ0FBQzJLLGVBQXRCLENBQXNDUixXQUF0QyxFQUFtRCxPQUFuRCxFQVpzQixDQWN0Qjs7QUFDQW5LLElBQUFBLHFCQUFxQixDQUFDMkssZUFBdEIsQ0FBc0NELFdBQXRDLEVBQW1ELE9BQW5ELEVBZnNCLENBaUJ0Qjs7QUFDQXhLLElBQUFBLENBQUMsQ0FBQyw0Q0FBRCxDQUFELENBQWdEd0gsV0FBaEQsQ0FBNEQsUUFBNUQ7QUFDQXhILElBQUFBLENBQUMsQ0FBQywwQ0FBRCxDQUFELENBQThDMEssSUFBOUMsR0FuQnNCLENBcUJ0Qjs7QUFDQTVLLElBQUFBLHFCQUFxQixDQUFDNkssdUJBQXRCO0FBQ0gsR0FqcEJ5Qjs7QUFtcEIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lGLEVBQUFBLGVBeHBCMEIsMkJBd3BCVnpELE1BeHBCVSxFQXdwQkYvRixJQXhwQkUsRUF3cEJJO0FBQzFCLFFBQU0ySixVQUFVLEdBQUc1SyxDQUFDLFlBQUtpQixJQUFMLHlCQUFwQjtBQUNBMkosSUFBQUEsVUFBVSxDQUFDQyxLQUFYO0FBRUE3RCxJQUFBQSxNQUFNLENBQUNpQixPQUFQLENBQWUsVUFBQzZDLEtBQUQsRUFBUUMsS0FBUixFQUFrQjtBQUM3QjtBQUNBakwsTUFBQUEscUJBQXFCLENBQUNZLGtCQUF0QixDQUF5Q29LLEtBQUssQ0FBQ0UsSUFBL0MsSUFBdUQ7QUFDbkRULFFBQUFBLFFBQVEsRUFBRVEsS0FEeUM7QUFFbkRFLFFBQUFBLFFBQVEsRUFBRUgsS0FBSyxDQUFDRztBQUZtQyxPQUF2RCxDQUY2QixDQU83Qjs7QUFDQSxVQUFNN0csVUFBVSxHQUFHMEcsS0FBSyxDQUFDRyxRQUFOLEtBQW1CLElBQW5CLElBQTJCSCxLQUFLLENBQUNHLFFBQU4sS0FBbUIsR0FBOUMsSUFBcURILEtBQUssQ0FBQ0csUUFBTixLQUFtQixDQUEzRjtBQUNBLFVBQU1DLE9BQU8sR0FBRyxDQUFDOUcsVUFBRCxHQUFjLFNBQWQsR0FBMEIsRUFBMUM7QUFFQSxVQUFNK0csT0FBTyxrRUFDeUJMLEtBQUssQ0FBQ0UsSUFEL0IsbURBRVNELEtBRlQsd0RBR2NELEtBQUssQ0FBQ0UsSUFIcEIsOERBSXFCRCxLQUpyQixxV0FXd0JELEtBQUssQ0FBQ0UsSUFYOUIscURBWVlFLE9BWlosd0tBZXVCSixLQUFLLENBQUNFLElBZjdCLGdCQWVzQ2xMLHFCQUFxQixDQUFDc0wsVUFBdEIsQ0FBaUNOLEtBQUssQ0FBQ08sV0FBTixJQUFxQlAsS0FBSyxDQUFDRSxJQUE1RCxDQWZ0Qyw2R0FBYjtBQXFCQUosTUFBQUEsVUFBVSxDQUFDVSxNQUFYLENBQWtCSCxPQUFsQjtBQUNILEtBakNELEVBSjBCLENBdUMxQjs7QUFDQVAsSUFBQUEsVUFBVSxDQUFDL0YsSUFBWCxDQUFnQixXQUFoQixFQUE2QlIsUUFBN0IsQ0FBc0M7QUFDbENrSCxNQUFBQSxRQUFRLEVBQUUsb0JBQVc7QUFDakI7QUFDQXpMLFFBQUFBLHFCQUFxQixDQUFDYSxhQUF0QixHQUFzQyxJQUF0QztBQUNBb0YsUUFBQUEsSUFBSSxDQUFDeUYsV0FBTDtBQUNIO0FBTGlDLEtBQXRDO0FBT0gsR0F2c0J5Qjs7QUF5c0IxQjtBQUNKO0FBQ0E7QUFDSWIsRUFBQUEsdUJBNXNCMEIscUNBNHNCQTtBQUN0QjNLLElBQUFBLENBQUMsQ0FBQywwQ0FBRCxDQUFELENBQThDeUwsUUFBOUMsQ0FBdUQ7QUFDbkRDLE1BQUFBLFdBQVcsRUFBRSxhQURzQztBQUVuREMsTUFBQUEsVUFBVSxFQUFFLGFBRnVDO0FBR25EQyxNQUFBQSxNQUFNLEVBQUUsa0JBQVc7QUFDZjtBQUNBOUwsUUFBQUEscUJBQXFCLENBQUNhLGFBQXRCLEdBQXNDLElBQXRDO0FBQ0FvRixRQUFBQSxJQUFJLENBQUN5RixXQUFMO0FBQ0g7QUFQa0QsS0FBdkQ7QUFTSCxHQXR0QnlCOztBQXd0QjFCO0FBQ0o7QUFDQTtBQUNJSyxFQUFBQSwwQkEzdEIwQix3Q0EydEJHO0FBQ3pCO0FBQ0EsUUFBTUMsZ0JBQWdCLEdBQUc5TCxDQUFDLENBQUMsb0JBQUQsQ0FBMUI7O0FBQ0EsUUFBSThMLGdCQUFnQixDQUFDdkksTUFBckIsRUFBNkI7QUFDekIsVUFBTXdJLFNBQVMsR0FBR0QsZ0JBQWdCLENBQUNuSCxHQUFqQixFQUFsQjtBQUNBLFVBQU1xSCxVQUFVLEdBQUdGLGdCQUFnQixDQUFDMUwsTUFBakIsRUFBbkIsQ0FGeUIsQ0FJekI7O0FBQ0EsVUFBTTZMLFFBQVEsR0FBR0gsZ0JBQWdCLENBQUN4RixJQUFqQixDQUFzQixXQUF0QixLQUFzQyxFQUF2RCxDQUx5QixDQU96Qjs7QUFDQTBGLE1BQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZ0NBQWhCLEVBQWtEa0UsTUFBbEQ7O0FBRUEsVUFBSWdELFNBQUosRUFBZTtBQUNYO0FBQ0EsWUFBSUcsV0FBVyxHQUFHLEVBQWxCOztBQUNBLFlBQUlELFFBQVEsSUFBSSxDQUFDQSxRQUFRLENBQUNwRixLQUExQixFQUFpQztBQUM3QixjQUFNc0YsS0FBSyxHQUFHLEVBQWQsQ0FENkIsQ0FHN0I7O0FBQ0EsY0FBSUYsUUFBUSxDQUFDRyxPQUFiLEVBQXNCO0FBQ2xCRCxZQUFBQSxLQUFLLENBQUNFLElBQU4sd0JBQWlCSixRQUFRLENBQUNHLE9BQTFCO0FBQ0gsV0FONEIsQ0FRN0I7OztBQUNBLGNBQUlILFFBQVEsQ0FBQ0ssTUFBVCxJQUFtQixDQUFDTCxRQUFRLENBQUNNLGNBQWpDLEVBQWlEO0FBQzdDSixZQUFBQSxLQUFLLENBQUNFLElBQU4sY0FBaUJKLFFBQVEsQ0FBQ0ssTUFBMUI7QUFDSCxXQUZELE1BRU8sSUFBSUwsUUFBUSxDQUFDTSxjQUFiLEVBQTZCO0FBQ2hDSixZQUFBQSxLQUFLLENBQUNFLElBQU4sQ0FBVyxlQUFYO0FBQ0gsV0FiNEIsQ0FlN0I7OztBQUNBLGNBQUlKLFFBQVEsQ0FBQ08sUUFBYixFQUF1QjtBQUNuQixnQkFBSVAsUUFBUSxDQUFDUSxVQUFiLEVBQXlCO0FBQ3JCTixjQUFBQSxLQUFLLENBQUNFLElBQU4sMEJBQXdCSixRQUFRLENBQUNPLFFBQWpDO0FBQ0gsYUFGRCxNQUVPLElBQUlQLFFBQVEsQ0FBQ1MsaUJBQVQsSUFBOEIsRUFBbEMsRUFBc0M7QUFDekNQLGNBQUFBLEtBQUssQ0FBQ0UsSUFBTixtQ0FBNEJKLFFBQVEsQ0FBQ1MsaUJBQXJDO0FBQ0gsYUFGTSxNQUVBO0FBQ0hQLGNBQUFBLEtBQUssQ0FBQ0UsSUFBTiw4QkFBNEJKLFFBQVEsQ0FBQ08sUUFBckM7QUFDSDtBQUNKOztBQUVETixVQUFBQSxXQUFXLEdBQUdDLEtBQUssQ0FBQ3hELElBQU4sQ0FBVyxLQUFYLENBQWQ7QUFDSCxTQTNCRCxNQTJCTztBQUNIO0FBQ0F1RCxVQUFBQSxXQUFXLEdBQUdwTSxxQkFBcUIsQ0FBQzZNLG1CQUF0QixDQUEwQ1osU0FBMUMsQ0FBZDtBQUNILFNBakNVLENBbUNYOzs7QUFDQUQsUUFBQUEsZ0JBQWdCLENBQUNySCxJQUFqQixHQXBDVyxDQXNDWDs7QUFDQSxZQUFJbUksV0FBVyxHQUFHLEVBQWxCOztBQUNBLFlBQUlYLFFBQVEsQ0FBQ1EsVUFBYixFQUF5QjtBQUNyQkcsVUFBQUEsV0FBVyxHQUFHLE9BQWQ7QUFDSCxTQUZELE1BRU8sSUFBSVgsUUFBUSxDQUFDUyxpQkFBVCxJQUE4QixFQUFsQyxFQUFzQztBQUN6Q0UsVUFBQUEsV0FBVyxHQUFHLFNBQWQ7QUFDSDs7QUFFRCxZQUFNQyxXQUFXLG1GQUNvQ0QsV0FEcEMsdUVBRW1COU0scUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ2MsV0FBakMsQ0FGbkIsdUpBRzREcE0scUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ1csU0FBakMsQ0FINUQseUZBSXNDNUssZUFBZSxDQUFDMkwsa0JBQWhCLElBQXNDLGtCQUo1RSxnUEFRZTNMLGVBQWUsQ0FBQzRMLGtCQUFoQixJQUFzQyxxQkFSckQsa1BBWWU1TCxlQUFlLENBQUM2TCxjQUFoQixJQUFrQyxrQkFaakQsa1BBZ0JlN0wsZUFBZSxDQUFDOEwsZ0JBQWhCLElBQW9DLG9CQWhCbkQsbUtBb0JYaEIsUUFBUSxJQUFJLENBQUNBLFFBQVEsQ0FBQ3BGLEtBQXRCLEdBQThCL0cscUJBQXFCLENBQUNvTix3QkFBdEIsQ0FBK0NqQixRQUEvQyxDQUE5QixHQUF5RixFQXBCOUUsZ1VBeUJvQjlLLGVBQWUsQ0FBQ2dNLGtCQUFoQixJQUFzQyxrQ0F6QjFELGdCQXlCaUdwQixTQXpCakcsaVFBNkI0QjVLLGVBQWUsQ0FBQ2lNLE9BQWhCLElBQTJCLE1BN0J2RCw2TEFnQzRCak0sZUFBZSxDQUFDa00sU0FBaEIsSUFBNkIsUUFoQ3pELDBIQUFqQjtBQXNDQXJCLFFBQUFBLFVBQVUsQ0FBQ1YsTUFBWCxDQUFrQnVCLFdBQWxCLEVBcEZXLENBc0ZYOztBQUNBYixRQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGdCQUFoQixFQUFrQ1YsRUFBbEMsQ0FBcUMsT0FBckMsRUFBOEMsVUFBU21KLENBQVQsRUFBWTtBQUN0REEsVUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsY0FBTUMsUUFBUSxHQUFHeEIsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixlQUFoQixDQUFqQjs7QUFDQSxjQUFJMkksUUFBUSxDQUFDakssTUFBYixFQUFxQjtBQUNqQmlLLFlBQUFBLFFBQVEsQ0FBQ0MsV0FBVDtBQUNIO0FBQ0osU0FORCxFQXZGVyxDQStGWDs7QUFDQXpCLFFBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsV0FBaEIsRUFBNkJWLEVBQTdCLENBQWdDLE9BQWhDLEVBQXlDLFVBQVNtSixDQUFULEVBQVk7QUFDakRBLFVBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBdkIsVUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixlQUFoQixFQUFpQ0osSUFBakM7QUFDQXVILFVBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsaUJBQWhCLEVBQW1DNkYsSUFBbkM7QUFDQXNCLFVBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IseUJBQWhCLEVBQTJDNkksS0FBM0M7QUFDSCxTQUxELEVBaEdXLENBdUdYOztBQUNBMUIsUUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixnQkFBaEIsRUFBa0NWLEVBQWxDLENBQXFDLE9BQXJDLEVBQThDLFVBQVNtSixDQUFULEVBQVk7QUFDdERBLFVBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLGNBQU1JLFFBQVEsR0FBRzNCLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IseUJBQWhCLEVBQTJDRixHQUEzQyxFQUFqQixDQUZzRCxDQUl0RDs7QUFDQW1ILFVBQUFBLGdCQUFnQixDQUFDbkgsR0FBakIsQ0FBcUJnSixRQUFyQixFQUxzRCxDQU90RDs7QUFDQSxjQUFJLE9BQU81SCxJQUFQLEtBQWdCLFdBQWhCLElBQStCQSxJQUFJLENBQUM2SCxXQUF4QyxFQUFxRDtBQUNqRDdILFlBQUFBLElBQUksQ0FBQzZILFdBQUw7QUFDSCxXQVZxRCxDQVl0RDs7O0FBQ0E5TixVQUFBQSxxQkFBcUIsQ0FBQytMLDBCQUF0QjtBQUNILFNBZEQsRUF4R1csQ0F3SFg7O0FBQ0FHLFFBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0Isa0JBQWhCLEVBQW9DVixFQUFwQyxDQUF1QyxPQUF2QyxFQUFnRCxVQUFTbUosQ0FBVCxFQUFZO0FBQ3hEQSxVQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQXZCLFVBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsaUJBQWhCLEVBQW1DSixJQUFuQztBQUNBdUgsVUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixlQUFoQixFQUFpQzZGLElBQWpDO0FBQ0gsU0FKRCxFQXpIVyxDQStIWDs7QUFDQXNCLFFBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0Isa0JBQWhCLEVBQW9DVixFQUFwQyxDQUF1QyxPQUF2QyxFQUFnRCxVQUFTbUosQ0FBVCxFQUFZO0FBQ3hEQSxVQUFBQSxDQUFDLENBQUNDLGNBQUYsR0FEd0QsQ0FHeEQ7O0FBQ0F6QixVQUFBQSxnQkFBZ0IsQ0FBQ25ILEdBQWpCLENBQXFCLEVBQXJCLEVBSndELENBTXhEOztBQUNBLGNBQUksT0FBT29CLElBQVAsS0FBZ0IsV0FBaEIsSUFBK0JBLElBQUksQ0FBQzZILFdBQXhDLEVBQXFEO0FBQ2pEN0gsWUFBQUEsSUFBSSxDQUFDNkgsV0FBTDtBQUNILFdBVHVELENBV3hEOzs7QUFDQTlOLFVBQUFBLHFCQUFxQixDQUFDK0wsMEJBQXRCO0FBQ0gsU0FiRCxFQWhJVyxDQStJWDs7QUFDQUcsUUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixnQkFBaEIsRUFBa0NnSixLQUFsQyxHQWhKVyxDQWtKWDs7QUFDQSxZQUFJL04scUJBQXFCLENBQUN1RCxTQUExQixFQUFxQztBQUNqQ3ZELFVBQUFBLHFCQUFxQixDQUFDdUQsU0FBdEIsQ0FBZ0N5SyxPQUFoQztBQUNBaE8sVUFBQUEscUJBQXFCLENBQUN5RixtQkFBdEI7QUFDSDtBQUNKLE9BdkpELE1BdUpPO0FBQ0g7QUFDQXVHLFFBQUFBLGdCQUFnQixDQUFDcEIsSUFBakI7QUFDQW9CLFFBQUFBLGdCQUFnQixDQUFDaUMsSUFBakIsQ0FBc0IsYUFBdEIsRUFBcUM1TSxlQUFlLENBQUNnTSxrQkFBaEIsSUFBc0Msa0NBQTNFO0FBQ0FyQixRQUFBQSxnQkFBZ0IsQ0FBQ2lDLElBQWpCLENBQXNCLE1BQXRCLEVBQThCLElBQTlCLEVBSkcsQ0FNSDs7QUFDQWpDLFFBQUFBLGdCQUFnQixDQUFDa0MsR0FBakIsQ0FBcUIsbUNBQXJCLEVBQTBEN0osRUFBMUQsQ0FBNkQsbUNBQTdELEVBQWtHLFlBQVc7QUFDekcsY0FBSSxPQUFPNEIsSUFBUCxLQUFnQixXQUFoQixJQUErQkEsSUFBSSxDQUFDNkgsV0FBeEMsRUFBcUQ7QUFDakQ3SCxZQUFBQSxJQUFJLENBQUM2SCxXQUFMO0FBQ0g7QUFDSixTQUpEO0FBS0g7QUFDSjtBQUNKLEdBNzRCeUI7O0FBKzRCMUI7QUFDSjtBQUNBO0FBQ0l0SSxFQUFBQSx5QkFsNUIwQix1Q0FrNUJFO0FBQ3hCO0FBQ0EsUUFBTTJJLGVBQWUsR0FBR2pPLENBQUMsQ0FBQyxpQkFBRCxDQUF6Qjs7QUFDQSxRQUFJaU8sZUFBZSxDQUFDMUssTUFBcEIsRUFBNEI7QUFDeEIsVUFBTXdJLFNBQVMsR0FBR2tDLGVBQWUsQ0FBQ3RKLEdBQWhCLEVBQWxCO0FBQ0EsVUFBTXFILFVBQVUsR0FBR2lDLGVBQWUsQ0FBQzdOLE1BQWhCLEVBQW5CLENBRndCLENBSXhCOztBQUNBNEwsTUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixpQ0FBaEIsRUFBbURrRSxNQUFuRCxHQUx3QixDQU94Qjs7QUFDQSxVQUFJZ0QsU0FBSixFQUFlO0FBQ1g7QUFDQSxZQUFNbUMsU0FBUyxHQUFHcE8scUJBQXFCLENBQUNxTyxjQUF0QixDQUFxQ3BDLFNBQXJDLENBQWxCLENBRlcsQ0FJWDs7QUFDQWtDLFFBQUFBLGVBQWUsQ0FBQ3hKLElBQWhCO0FBRUEsWUFBTW9JLFdBQVcsK0lBRW1CcUIsU0FGbkIsdUpBRzREcE8scUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ1csU0FBakMsQ0FINUQsMEZBSXNDNUssZUFBZSxDQUFDaU4saUJBQWhCLElBQXFDLE1BSjNFLDhPQVFlak4sZUFBZSxDQUFDa04sZ0JBQWhCLElBQW9DLGVBUm5ELHVPQVltRHRDLFNBWm5ELGtDQUFqQjtBQWVBQyxRQUFBQSxVQUFVLENBQUNWLE1BQVgsQ0FBa0J1QixXQUFsQixFQXRCVyxDQXdCZjs7QUFDQWIsUUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixhQUFoQixFQUErQlYsRUFBL0IsQ0FBa0MsT0FBbEMsRUFBMkMsVUFBU21KLENBQVQsRUFBWTtBQUNuREEsVUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsY0FBTWUsWUFBWSxHQUFHdEMsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixlQUFoQixDQUFyQjtBQUNBLGNBQU0wSixpQkFBaUIsR0FBR3ZDLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0Isa0JBQWhCLENBQTFCO0FBQ0EsY0FBTTJKLEtBQUssR0FBR3hPLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUTZFLElBQVIsQ0FBYSxHQUFiLENBQWQ7O0FBRUEsY0FBSXlKLFlBQVksQ0FBQ0csRUFBYixDQUFnQixVQUFoQixDQUFKLEVBQWlDO0FBQzdCSCxZQUFBQSxZQUFZLENBQUM3SixJQUFiO0FBQ0E4SixZQUFBQSxpQkFBaUIsQ0FBQzdELElBQWxCO0FBQ0E4RCxZQUFBQSxLQUFLLENBQUNoSCxXQUFOLENBQWtCLFVBQWxCLEVBQThCa0gsUUFBOUIsQ0FBdUMsUUFBdkM7QUFDSCxXQUpELE1BSU87QUFDSEosWUFBQUEsWUFBWSxDQUFDNUQsSUFBYjtBQUNBNkQsWUFBQUEsaUJBQWlCLENBQUM5SixJQUFsQjtBQUNBK0osWUFBQUEsS0FBSyxDQUFDaEgsV0FBTixDQUFrQixRQUFsQixFQUE0QmtILFFBQTVCLENBQXFDLFVBQXJDO0FBQ0g7QUFDSixTQWZELEVBekJlLENBMENmOztBQUNBMUMsUUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixnQkFBaEIsRUFBa0NnSixLQUFsQztBQUNDLE9BNUNELE1BNENPO0FBQ0g7QUFDQUksUUFBQUEsZUFBZSxDQUFDdkQsSUFBaEI7QUFDQXVELFFBQUFBLGVBQWUsQ0FBQ0YsSUFBaEIsQ0FBcUIsVUFBckIsRUFBaUMsSUFBakM7QUFDQUUsUUFBQUEsZUFBZSxDQUFDRixJQUFoQixDQUFxQixhQUFyQixFQUFvQzVNLGVBQWUsQ0FBQ3dOLGlCQUFoQixJQUFxQyw2QkFBekU7QUFDSDtBQUNKLEtBN0R1QixDQStEeEI7OztBQUNBN08sSUFBQUEscUJBQXFCLENBQUMrTCwwQkFBdEIsR0FoRXdCLENBa0V4Qjs7QUFDQSxRQUFNK0MsaUJBQWlCLEdBQUc1TyxDQUFDLENBQUMscUJBQUQsQ0FBM0I7O0FBQ0EsUUFBSTRPLGlCQUFpQixDQUFDckwsTUFBdEIsRUFBOEI7QUFDMUIsVUFBTXlJLFdBQVUsR0FBRzRDLGlCQUFpQixDQUFDeE8sTUFBbEIsRUFBbkIsQ0FEMEIsQ0FHMUI7OztBQUNBNEwsTUFBQUEsV0FBVSxDQUFDbkgsSUFBWCxDQUFnQiwyQ0FBaEIsRUFBNkRrRSxNQUE3RCxHQUowQixDQU0xQjtBQUNBOzs7QUFDQSxVQUFNOEYsWUFBWSxHQUFHRCxpQkFBaUIsQ0FBQ2pLLEdBQWxCLEVBQXJCO0FBQ0EsVUFBTW1LLFFBQVEsR0FBR0QsWUFBWSxLQUFLL08scUJBQXFCLENBQUNRLGNBQXhEOztBQUVBLFVBQUl3TyxRQUFKLEVBQWM7QUFDVjtBQUNBRixRQUFBQSxpQkFBaUIsQ0FBQ25LLElBQWxCOztBQUVBLFlBQU1vSSxZQUFXLHNNQUlIMUwsZUFBZSxDQUFDNE4sa0JBQWhCLElBQXNDLDJCQUpuQyxxRkFLa0M1TixlQUFlLENBQUM2TixVQUFoQixJQUE4QixTQUxoRSxzVEFXWTdOLGVBQWUsQ0FBQzhOLGtCQUFoQixJQUFzQywyQkFYbEQscUNBQWpCOztBQWNBakQsUUFBQUEsV0FBVSxDQUFDVixNQUFYLENBQWtCdUIsWUFBbEIsRUFsQlUsQ0FvQlY7OztBQUNBYixRQUFBQSxXQUFVLENBQUNuSCxJQUFYLENBQWdCLG1CQUFoQixFQUFxQ1YsRUFBckMsQ0FBd0MsT0FBeEMsRUFBaUQsVUFBU21KLENBQVQsRUFBWTtBQUN6REEsVUFBQUEsQ0FBQyxDQUFDQyxjQUFGOztBQUNBdkIsVUFBQUEsV0FBVSxDQUFDbkgsSUFBWCxDQUFnQixrQkFBaEIsRUFBb0NKLElBQXBDOztBQUNBLGNBQU15SyxTQUFTLEdBQUdsRCxXQUFVLENBQUNuSCxJQUFYLENBQWdCLHlCQUFoQixDQUFsQjs7QUFDQXFLLFVBQUFBLFNBQVMsQ0FBQ3hFLElBQVYsR0FBaUJnRCxLQUFqQixHQUp5RCxDQU16RDs7QUFDQWtCLFVBQUFBLGlCQUFpQixDQUFDakssR0FBbEIsQ0FBc0IsRUFBdEIsRUFQeUQsQ0FTekQ7O0FBQ0F1SyxVQUFBQSxTQUFTLENBQUMvSyxFQUFWLENBQWEsb0JBQWIsRUFBbUMsWUFBVztBQUMxQztBQUNBeUssWUFBQUEsaUJBQWlCLENBQUNqSyxHQUFsQixDQUFzQnVLLFNBQVMsQ0FBQ3ZLLEdBQVYsRUFBdEIsRUFGMEMsQ0FJMUM7O0FBQ0EsZ0JBQUksT0FBT29CLElBQVAsS0FBZ0IsV0FBaEIsSUFBK0JBLElBQUksQ0FBQzZILFdBQXhDLEVBQXFEO0FBQ2pEN0gsY0FBQUEsSUFBSSxDQUFDNkgsV0FBTDtBQUNIO0FBQ0osV0FSRDtBQVNILFNBbkJEO0FBb0JILE9BekNELE1BeUNPO0FBQ0g7QUFDQWdCLFFBQUFBLGlCQUFpQixDQUFDbEUsSUFBbEI7QUFDQWtFLFFBQUFBLGlCQUFpQixDQUFDYixJQUFsQixDQUF1QixhQUF2QixFQUFzQzVNLGVBQWUsQ0FBQzhOLGtCQUFoQixJQUFzQywyQkFBNUU7QUFDQUwsUUFBQUEsaUJBQWlCLENBQUNiLElBQWxCLENBQXVCLE1BQXZCLEVBQStCLElBQS9CLEVBSkcsQ0FNSDs7QUFDQWEsUUFBQUEsaUJBQWlCLENBQUNaLEdBQWxCLENBQXNCLG1DQUF0QixFQUEyRDdKLEVBQTNELENBQThELG1DQUE5RCxFQUFtRyxZQUFXO0FBQzFHLGNBQUksT0FBTzRCLElBQVAsS0FBZ0IsV0FBaEIsSUFBK0JBLElBQUksQ0FBQzZILFdBQXhDLEVBQXFEO0FBQ2pEN0gsWUFBQUEsSUFBSSxDQUFDNkgsV0FBTDtBQUNIO0FBQ0osU0FKRDtBQUtIO0FBQ0o7QUFDSixHQXhoQ3lCOztBQTBoQzFCO0FBQ0o7QUFDQTtBQUNJckksRUFBQUEsbUJBN2hDMEIsaUNBNmhDSjtBQUNsQixRQUFJekYscUJBQXFCLENBQUN1RCxTQUExQixFQUFxQztBQUNqQ3ZELE1BQUFBLHFCQUFxQixDQUFDdUQsU0FBdEIsQ0FBZ0N5SyxPQUFoQztBQUNIOztBQUVEaE8sSUFBQUEscUJBQXFCLENBQUN1RCxTQUF0QixHQUFrQyxJQUFJOEwsV0FBSixDQUFnQixXQUFoQixDQUFsQztBQUVBclAsSUFBQUEscUJBQXFCLENBQUN1RCxTQUF0QixDQUFnQ2MsRUFBaEMsQ0FBbUMsU0FBbkMsRUFBOEMsVUFBQ21KLENBQUQsRUFBTztBQUNqRDtBQUNBLFVBQU04QixJQUFJLEdBQUdwUCxDQUFDLENBQUNzTixDQUFDLENBQUN6RixPQUFILENBQWQ7QUFDQSxVQUFNd0gsWUFBWSxHQUFHRCxJQUFJLENBQUN2SyxJQUFMLENBQVUsR0FBVixFQUFla0osSUFBZixDQUFvQixPQUFwQixDQUFyQjtBQUVBcUIsTUFBQUEsSUFBSSxDQUFDdkssSUFBTCxDQUFVLEdBQVYsRUFBZTJDLFdBQWYsR0FBNkJrSCxRQUE3QixDQUFzQyxZQUF0QztBQUNBakksTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYjJJLFFBQUFBLElBQUksQ0FBQ3ZLLElBQUwsQ0FBVSxHQUFWLEVBQWUyQyxXQUFmLEdBQTZCa0gsUUFBN0IsQ0FBc0NXLFlBQXRDO0FBQ0gsT0FGUyxFQUVQLElBRk8sQ0FBVixDQU5pRCxDQVVqRDs7QUFDQS9CLE1BQUFBLENBQUMsQ0FBQ2dDLGNBQUY7QUFDSCxLQVpEO0FBY0F4UCxJQUFBQSxxQkFBcUIsQ0FBQ3VELFNBQXRCLENBQWdDYyxFQUFoQyxDQUFtQyxPQUFuQyxFQUE0QyxZQUFNO0FBQzlDeUUsTUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCMUgsZUFBZSxDQUFDb08sYUFBaEIsSUFBaUMsNkJBQXZEO0FBQ0gsS0FGRDtBQUdILEdBcmpDeUI7O0FBdWpDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJcEIsRUFBQUEsY0E1akMwQiwwQkE0akNYakcsR0E1akNXLEVBNGpDTjtBQUNoQixRQUFJLENBQUNBLEdBQUQsSUFBUUEsR0FBRyxDQUFDM0UsTUFBSixHQUFhLEVBQXpCLEVBQTZCO0FBQ3pCLGFBQU8yRSxHQUFQO0FBQ0g7O0FBRUQsUUFBTWlFLEtBQUssR0FBR2pFLEdBQUcsQ0FBQ3NILEtBQUosQ0FBVSxHQUFWLENBQWQ7O0FBQ0EsUUFBSXJELEtBQUssQ0FBQzVJLE1BQU4sSUFBZ0IsQ0FBcEIsRUFBdUI7QUFDbkIsVUFBTWtNLE9BQU8sR0FBR3RELEtBQUssQ0FBQyxDQUFELENBQXJCO0FBQ0EsVUFBTXVELE9BQU8sR0FBR3ZELEtBQUssQ0FBQyxDQUFELENBQXJCO0FBQ0EsVUFBTXdELE9BQU8sR0FBR3hELEtBQUssQ0FBQ3lELEtBQU4sQ0FBWSxDQUFaLEVBQWVqSCxJQUFmLENBQW9CLEdBQXBCLENBQWhCOztBQUVBLFVBQUkrRyxPQUFPLENBQUNuTSxNQUFSLEdBQWlCLEVBQXJCLEVBQXlCO0FBQ3JCLFlBQU0ySyxTQUFTLEdBQUd3QixPQUFPLENBQUNHLFNBQVIsQ0FBa0IsQ0FBbEIsRUFBcUIsRUFBckIsSUFBMkIsS0FBM0IsR0FBbUNILE9BQU8sQ0FBQ0csU0FBUixDQUFrQkgsT0FBTyxDQUFDbk0sTUFBUixHQUFpQixFQUFuQyxDQUFyRDtBQUNBLGVBQU8sVUFBR2tNLE9BQUgsY0FBY3ZCLFNBQWQsY0FBMkJ5QixPQUEzQixFQUFxQ0csSUFBckMsRUFBUDtBQUNIO0FBQ0o7O0FBRUQsV0FBTzVILEdBQVA7QUFDSCxHQTlrQ3lCOztBQWdsQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXlFLEVBQUFBLG1CQXJsQzBCLCtCQXFsQ05vRCxJQXJsQ00sRUFxbENBO0FBQ3RCLFFBQUksQ0FBQ0EsSUFBRCxJQUFTQSxJQUFJLENBQUN4TSxNQUFMLEdBQWMsR0FBM0IsRUFBZ0M7QUFDNUIsYUFBT3dNLElBQVA7QUFDSDs7QUFFRCxRQUFNQyxLQUFLLEdBQUdELElBQUksQ0FBQ1AsS0FBTCxDQUFXLElBQVgsRUFBaUJ0RixNQUFqQixDQUF3QixVQUFBK0YsSUFBSTtBQUFBLGFBQUlBLElBQUksQ0FBQ0gsSUFBTCxFQUFKO0FBQUEsS0FBNUIsQ0FBZCxDQUxzQixDQU90Qjs7QUFDQSxRQUFNSSxTQUFTLEdBQUdGLEtBQUssQ0FBQyxDQUFELENBQUwsSUFBWSxFQUE5QjtBQUNBLFFBQU1HLFFBQVEsR0FBR0gsS0FBSyxDQUFDQSxLQUFLLENBQUN6TSxNQUFOLEdBQWUsQ0FBaEIsQ0FBTCxJQUEyQixFQUE1QyxDQVRzQixDQVd0Qjs7QUFDQSxRQUFJMk0sU0FBUyxDQUFDRSxRQUFWLENBQW1CLG1CQUFuQixDQUFKLEVBQTZDO0FBQ3pDLHVCQUFVRixTQUFWLGdCQUF5QkMsUUFBekI7QUFDSCxLQWRxQixDQWdCdEI7OztBQUNBLFFBQU1FLFNBQVMsR0FBR04sSUFBSSxDQUFDTyxPQUFMLENBQWEsS0FBYixFQUFvQixHQUFwQixFQUF5QlIsSUFBekIsRUFBbEI7O0FBQ0EsUUFBSU8sU0FBUyxDQUFDOU0sTUFBVixHQUFtQixFQUF2QixFQUEyQjtBQUN2QixhQUFPOE0sU0FBUyxDQUFDUixTQUFWLENBQW9CLENBQXBCLEVBQXVCLEVBQXZCLElBQTZCLEtBQTdCLEdBQXFDUSxTQUFTLENBQUNSLFNBQVYsQ0FBb0JRLFNBQVMsQ0FBQzlNLE1BQVYsR0FBbUIsRUFBdkMsQ0FBNUM7QUFDSDs7QUFFRCxXQUFPOE0sU0FBUDtBQUNILEdBNW1DeUI7O0FBOG1DMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJakYsRUFBQUEsVUFubkMwQixzQkFtbkNmbUYsSUFubkNlLEVBbW5DVDtBQUNiLFFBQU1DLEdBQUcsR0FBRztBQUNSLFdBQUssT0FERztBQUVSLFdBQUssTUFGRztBQUdSLFdBQUssTUFIRztBQUlSLFdBQUssUUFKRztBQUtSLFdBQUs7QUFMRyxLQUFaO0FBT0EsV0FBT0QsSUFBSSxDQUFDRCxPQUFMLENBQWEsVUFBYixFQUF5QixVQUFBRyxDQUFDO0FBQUEsYUFBSUQsR0FBRyxDQUFDQyxDQUFELENBQVA7QUFBQSxLQUExQixDQUFQO0FBQ0gsR0E1bkN5Qjs7QUE4bkMxQjtBQUNKO0FBQ0E7QUFDSWpMLEVBQUFBLG1CQWpvQzBCLGlDQWlvQ0w7QUFDakIsUUFBSTFGLHFCQUFxQixDQUFDSyxtQkFBdEIsQ0FBMENrRSxRQUExQyxDQUFtRCxZQUFuRCxDQUFKLEVBQXNFO0FBQ2xFdkUsTUFBQUEscUJBQXFCLENBQUNPLG1CQUF0QixDQUEwQ29FLElBQTFDO0FBQ0gsS0FGRCxNQUVPO0FBQ0gzRSxNQUFBQSxxQkFBcUIsQ0FBQ08sbUJBQXRCLENBQTBDcUssSUFBMUM7QUFDSDs7QUFDRDVLLElBQUFBLHFCQUFxQixDQUFDOEUsU0FBdEI7QUFDSCxHQXhvQ3lCOztBQTBvQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJOEwsRUFBQUEsZ0JBaHBDMEIsNEJBZ3BDVDNKLFFBaHBDUyxFQWdwQ0M7QUFDdkIsUUFBTVYsTUFBTSxHQUFHVSxRQUFmLENBRHVCLENBR3ZCOztBQUNBLFFBQUlWLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZcUssa0JBQVosS0FBbUNDLFNBQXZDLEVBQWtEO0FBQzlDLFVBQU1DLGVBQWUsR0FBR3hLLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZcUssa0JBQXBDLENBRDhDLENBRTlDOztBQUNBLFVBQUlFLGVBQWUsS0FBSyxFQUFwQixJQUEwQkEsZUFBZSxLQUFLL1EscUJBQXFCLENBQUNRLGNBQXhFLEVBQXdGO0FBQ3BGLGVBQU8rRixNQUFNLENBQUNDLElBQVAsQ0FBWXFLLGtCQUFuQjtBQUNIO0FBQ0osS0FWc0IsQ0FZdkI7OztBQUNBLFFBQUl0SyxNQUFNLENBQUNDLElBQVAsQ0FBWXdLLGlCQUFaLEtBQWtDRixTQUFsQyxJQUErQ3ZLLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZd0ssaUJBQVosS0FBa0MsRUFBckYsRUFBeUY7QUFDckYsYUFBT3pLLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZd0ssaUJBQW5CO0FBQ0gsS0Fmc0IsQ0FpQnZCOzs7QUFDQSxRQUFNQyxjQUFjLEdBQUcsQ0FDbkIsUUFEbUIsRUFFbkIsZ0JBRm1CLENBQXZCLENBbEJ1QixDQXVCdkI7O0FBQ0FoSixJQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWTNCLE1BQU0sQ0FBQ0MsSUFBbkIsRUFBeUIyQixPQUF6QixDQUFpQyxVQUFBQyxHQUFHLEVBQUk7QUFDcEMsVUFBSUEsR0FBRyxDQUFDOEksVUFBSixDQUFlLFFBQWYsS0FBNEJELGNBQWMsQ0FBQ1gsUUFBZixDQUF3QmxJLEdBQXhCLENBQWhDLEVBQThEO0FBQzFELGVBQU83QixNQUFNLENBQUNDLElBQVAsQ0FBWTRCLEdBQVosQ0FBUDtBQUNIO0FBQ0osS0FKRCxFQXhCdUIsQ0E4QnZCO0FBQ0E7O0FBQ0EsUUFBTStJLG1CQUFtQixHQUFHLENBQUNsTCxJQUFJLENBQUNtTCxlQUFOLElBQXlCcFIscUJBQXFCLENBQUNhLGFBQTNFOztBQUVBLFFBQUlzUSxtQkFBSixFQUF5QjtBQUNyQjtBQUNBLFVBQU1FLFNBQVMsR0FBRyxFQUFsQixDQUZxQixDQUlyQjs7QUFDQW5SLE1BQUFBLENBQUMsQ0FBQyxnRUFBRCxDQUFELENBQW9Fb1IsSUFBcEUsQ0FBeUUsVUFBQ0MsWUFBRCxFQUFlQyxHQUFmLEVBQXVCO0FBQzVGLFlBQU1DLFNBQVMsR0FBR3ZSLENBQUMsQ0FBQ3NSLEdBQUQsQ0FBRCxDQUFPdkQsSUFBUCxDQUFZLGlCQUFaLENBQWxCOztBQUNBLFlBQUl3RCxTQUFKLEVBQWU7QUFDWCxjQUFNQyxlQUFlLEdBQUd4UixDQUFDLENBQUNzUixHQUFELENBQUQsQ0FBT3pNLElBQVAsQ0FBWSxXQUFaLEVBQXlCUixRQUF6QixDQUFrQyxjQUFsQyxDQUF4QjtBQUVBOE0sVUFBQUEsU0FBUyxDQUFDOUUsSUFBVixDQUFlO0FBQ1hyQixZQUFBQSxJQUFJLEVBQUV1RyxTQURLO0FBRVh0RyxZQUFBQSxRQUFRLEVBQUV1RyxlQUZDO0FBR1hqSCxZQUFBQSxRQUFRLEVBQUU4RztBQUhDLFdBQWY7QUFLSDtBQUNKLE9BWEQsRUFMcUIsQ0FrQnJCOztBQUNBLFVBQUlGLFNBQVMsQ0FBQzVOLE1BQVYsR0FBbUIsQ0FBdkIsRUFBMEI7QUFDdEI4QyxRQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWVUsTUFBWixHQUFxQm1LLFNBQXJCO0FBQ0g7QUFDSjs7QUFFRCxXQUFPOUssTUFBUDtBQUNILEdBM3NDeUI7O0FBNnNDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJb0wsRUFBQUEsZUFsdEMwQiwyQkFrdENWdEwsUUFsdENVLEVBa3RDQTtBQUN0Qm5HLElBQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCK0ksTUFBckIsR0FEc0IsQ0FHdEI7O0FBQ0EsUUFBSSxDQUFDNUMsUUFBUSxDQUFDRSxNQUFkLEVBQXNCO0FBQ2xCTixNQUFBQSxJQUFJLENBQUMyTCxhQUFMLENBQW1CbEssV0FBbkIsQ0FBK0IsVUFBL0I7QUFDQTFILE1BQUFBLHFCQUFxQixDQUFDNlIsd0JBQXRCLENBQStDeEwsUUFBL0M7QUFDSCxLQUhELE1BR087QUFDSDtBQUNBckcsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCd0ksSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsa0JBQWpELEVBQXFFekkscUJBQXFCLENBQUNRLGNBQTNGO0FBQ0FSLE1BQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQndJLElBQS9CLENBQW9DLFdBQXBDLEVBQWlELHdCQUFqRCxFQUEyRXpJLHFCQUFxQixDQUFDUSxjQUFqRztBQUNBUixNQUFBQSxxQkFBcUIsQ0FBQ0MsUUFBdEIsQ0FBK0J3SSxJQUEvQixDQUFvQyxXQUFwQyxFQUFpRCxhQUFqRCxFQUFnRXpJLHFCQUFxQixDQUFDUSxjQUF0RjtBQUNBUixNQUFBQSxxQkFBcUIsQ0FBQ0MsUUFBdEIsQ0FBK0J3SSxJQUEvQixDQUFvQyxXQUFwQyxFQUFpRCxtQkFBakQsRUFBc0V6SSxxQkFBcUIsQ0FBQ1EsY0FBNUYsRUFMRyxDQU9IOztBQUNBTixNQUFBQSxDQUFDLENBQUMsb0JBQUQsQ0FBRCxDQUF3QjRSLE9BQXhCLENBQWdDLEdBQWhDLEVBQXFDLFlBQVc7QUFDNUM1UixRQUFBQSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVErSSxNQUFSO0FBQ0gsT0FGRDtBQUdILEtBbEJxQixDQW9CdEI7OztBQUNBLFFBQUksT0FBTzhJLHdCQUFQLEtBQW9DLFdBQXhDLEVBQXFEO0FBQ2pEQSxNQUFBQSx3QkFBd0IsQ0FBQ0MscUJBQXpCO0FBQ0g7QUFDSixHQTF1Q3lCOztBQTR1QzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lILEVBQUFBLHdCQWh2QzBCLG9DQWd2Q0R4TCxRQWh2Q0MsRUFndkNTO0FBQy9CLFFBQUlBLFFBQVEsQ0FBQ1EsUUFBYixFQUF1QjtBQUNuQixVQUFNb0wsSUFBSSxHQUFHL1IsQ0FBQyxDQUFDLE9BQUQsRUFBVTtBQUFFLGlCQUFPLHFCQUFUO0FBQWdDZ1MsUUFBQUEsRUFBRSxFQUFFO0FBQXBDLE9BQVYsQ0FBZDtBQUNBLFVBQU1DLE9BQU8sR0FBR2pTLENBQUMsQ0FBQyxPQUFELEVBQVU7QUFBRSxpQkFBTztBQUFULE9BQVYsQ0FBRCxDQUFnQ3VRLElBQWhDLENBQXFDcFAsZUFBZSxDQUFDK1Esb0JBQXJELENBQWhCO0FBQ0FILE1BQUFBLElBQUksQ0FBQ3pHLE1BQUwsQ0FBWTJHLE9BQVo7QUFDQSxVQUFNRSxHQUFHLEdBQUduUyxDQUFDLENBQUMsTUFBRCxFQUFTO0FBQUUsaUJBQU87QUFBVCxPQUFULENBQWI7QUFDQSxVQUFNb1MsV0FBVyxHQUFHLElBQUlDLEdBQUosRUFBcEIsQ0FMbUIsQ0FPbkI7O0FBQ0EsT0FBQyxPQUFELEVBQVUsWUFBVixFQUF3QnBLLE9BQXhCLENBQWdDLFVBQUFxSyxPQUFPLEVBQUk7QUFDdkMsWUFBSW5NLFFBQVEsQ0FBQ1EsUUFBVCxDQUFrQjJMLE9BQWxCLENBQUosRUFBZ0M7QUFDNUIsY0FBTTNMLFFBQVEsR0FBRzhCLEtBQUssQ0FBQ0MsT0FBTixDQUFjdkMsUUFBUSxDQUFDUSxRQUFULENBQWtCMkwsT0FBbEIsQ0FBZCxJQUNYbk0sUUFBUSxDQUFDUSxRQUFULENBQWtCMkwsT0FBbEIsQ0FEVyxHQUVYLENBQUNuTSxRQUFRLENBQUNRLFFBQVQsQ0FBa0IyTCxPQUFsQixDQUFELENBRk47QUFJQTNMLFVBQUFBLFFBQVEsQ0FBQ3NCLE9BQVQsQ0FBaUIsVUFBQXBCLEtBQUssRUFBSTtBQUN0QixnQkFBSTBMLFdBQVcsR0FBRyxFQUFsQjs7QUFDQSxnQkFBSSxRQUFPMUwsS0FBUCxNQUFpQixRQUFqQixJQUE2QkEsS0FBSyxDQUFDMkwsT0FBdkMsRUFBZ0Q7QUFDNUNELGNBQUFBLFdBQVcsR0FBR3BSLGVBQWUsQ0FBQzBGLEtBQUssQ0FBQzJMLE9BQVAsQ0FBZixJQUFrQzNMLEtBQUssQ0FBQzJMLE9BQXREO0FBQ0gsYUFGRCxNQUVPO0FBQ0hELGNBQUFBLFdBQVcsR0FBR3BSLGVBQWUsQ0FBQzBGLEtBQUQsQ0FBZixJQUEwQkEsS0FBeEM7QUFDSDs7QUFFRCxnQkFBSSxDQUFDdUwsV0FBVyxDQUFDSyxHQUFaLENBQWdCRixXQUFoQixDQUFMLEVBQW1DO0FBQy9CSCxjQUFBQSxXQUFXLENBQUNNLEdBQVosQ0FBZ0JILFdBQWhCO0FBQ0FKLGNBQUFBLEdBQUcsQ0FBQzdHLE1BQUosQ0FBV3RMLENBQUMsQ0FBQyxNQUFELENBQUQsQ0FBVXVRLElBQVYsQ0FBZWdDLFdBQWYsQ0FBWDtBQUNIO0FBQ0osV0FaRDtBQWFIO0FBQ0osT0FwQkQ7QUFzQkFSLE1BQUFBLElBQUksQ0FBQ3pHLE1BQUwsQ0FBWTZHLEdBQVo7QUFDQW5TLE1BQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJzSixNQUFuQixDQUEwQnlJLElBQTFCO0FBQ0g7QUFDSixHQWx4Q3lCOztBQW94QzFCO0FBQ0o7QUFDQTtBQUNJbk4sRUFBQUEsU0F2eEMwQix1QkF1eENkO0FBQ1I7QUFDQSxRQUFJOUUscUJBQXFCLENBQUNLLG1CQUF0QixDQUEwQ2tFLFFBQTFDLENBQW1ELFlBQW5ELENBQUosRUFBc0U7QUFDbEUwQixNQUFBQSxJQUFJLENBQUNsRixhQUFMLENBQW1CVyxXQUFuQixDQUErQlIsS0FBL0IsR0FBdUNsQixxQkFBcUIsQ0FBQ3NELDZCQUE3RDtBQUNILEtBRkQsTUFFTyxJQUFJdEQscUJBQXFCLENBQUNJLFlBQXRCLENBQW1DeUUsR0FBbkMsT0FBNkM3RSxxQkFBcUIsQ0FBQ1EsY0FBdkUsRUFBdUY7QUFDMUZ5RixNQUFBQSxJQUFJLENBQUNsRixhQUFMLENBQW1CVyxXQUFuQixDQUErQlIsS0FBL0IsR0FBdUMsRUFBdkM7QUFDSCxLQUZNLE1BRUE7QUFDSCtFLE1BQUFBLElBQUksQ0FBQ2xGLGFBQUwsQ0FBbUJXLFdBQW5CLENBQStCUixLQUEvQixHQUF1Q2xCLHFCQUFxQixDQUFDa0QsMkJBQTdEO0FBQ0gsS0FSTyxDQVVSOzs7QUFDQSxRQUFJbEQscUJBQXFCLENBQUNHLGlCQUF0QixDQUF3QzBFLEdBQXhDLE9BQWtEN0UscUJBQXFCLENBQUNRLGNBQTVFLEVBQTRGO0FBQ3hGeUYsTUFBQUEsSUFBSSxDQUFDbEYsYUFBTCxDQUFtQlEsZ0JBQW5CLENBQW9DTCxLQUFwQyxHQUE0QyxFQUE1QztBQUNILEtBRkQsTUFFTztBQUNIK0UsTUFBQUEsSUFBSSxDQUFDbEYsYUFBTCxDQUFtQlEsZ0JBQW5CLENBQW9DTCxLQUFwQyxHQUE0Q2xCLHFCQUFxQixDQUFDMEMscUJBQWxFO0FBQ0g7QUFDSixHQXZ5Q3lCOztBQXl5QzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTBLLEVBQUFBLHdCQTl5QzBCLG9DQTh5Q0RqQixRQTl5Q0MsRUE4eUNTO0FBQy9CLFFBQUkwRyxJQUFJLEdBQUcsbUVBQVg7QUFDQUEsSUFBQUEsSUFBSSxJQUFJLDBCQUFSO0FBQ0FBLElBQUFBLElBQUksSUFBSSw0QkFBUixDQUgrQixDQUsvQjs7QUFDQSxRQUFJMUcsUUFBUSxDQUFDRyxPQUFiLEVBQXNCO0FBQ2xCdUcsTUFBQUEsSUFBSSw0REFBbUQ3UyxxQkFBcUIsQ0FBQ3NMLFVBQXRCLENBQWlDYSxRQUFRLENBQUNHLE9BQTFDLENBQW5ELFdBQUo7QUFDSCxLQVI4QixDQVUvQjs7O0FBQ0EsUUFBSUgsUUFBUSxDQUFDSyxNQUFiLEVBQXFCO0FBQ2pCcUcsTUFBQUEsSUFBSSwyREFBa0Q3UyxxQkFBcUIsQ0FBQ3NMLFVBQXRCLENBQWlDYSxRQUFRLENBQUNLLE1BQTFDLENBQWxELENBQUo7O0FBQ0EsVUFBSUwsUUFBUSxDQUFDTSxjQUFiLEVBQTZCO0FBQ3pCb0csUUFBQUEsSUFBSSxJQUFJLGlEQUFSO0FBQ0g7O0FBQ0RBLE1BQUFBLElBQUksSUFBSSxRQUFSO0FBQ0gsS0FqQjhCLENBbUIvQjs7O0FBQ0EsUUFBSTFHLFFBQVEsQ0FBQzJHLFVBQVQsSUFBdUIzRyxRQUFRLENBQUNPLFFBQXBDLEVBQThDO0FBQzFDbUcsTUFBQUEsSUFBSSwwREFBaUQxRyxRQUFRLENBQUMyRyxVQUExRCxpQkFBMkUzRyxRQUFRLENBQUNPLFFBQXBGLFdBQUo7QUFDSCxLQXRCOEIsQ0F3Qi9COzs7QUFDQSxRQUFJUCxRQUFRLENBQUNRLFVBQWIsRUFBeUI7QUFDckJrRyxNQUFBQSxJQUFJLElBQUksb0ZBQVI7QUFDSCxLQUZELE1BRU8sSUFBSTFHLFFBQVEsQ0FBQ1MsaUJBQVQsSUFBOEIsRUFBbEMsRUFBc0M7QUFDekNpRyxNQUFBQSxJQUFJLGtGQUF1RTFHLFFBQVEsQ0FBQ1MsaUJBQWhGLHVCQUFKO0FBQ0gsS0FGTSxNQUVBLElBQUlULFFBQVEsQ0FBQ1MsaUJBQVQsR0FBNkIsQ0FBakMsRUFBb0M7QUFDdkNpRyxNQUFBQSxJQUFJLGdGQUFxRTFHLFFBQVEsQ0FBQ1MsaUJBQTlFLHVCQUFKO0FBQ0gsS0EvQjhCLENBaUMvQjs7O0FBQ0EsUUFBSVQsUUFBUSxDQUFDNEcsR0FBVCxJQUFnQjVHLFFBQVEsQ0FBQzRHLEdBQVQsQ0FBYXRQLE1BQWIsR0FBc0IsQ0FBMUMsRUFBNkM7QUFDekNvUCxNQUFBQSxJQUFJLElBQUksdURBQVI7QUFDQUEsTUFBQUEsSUFBSSxJQUFJLHNEQUFSO0FBQ0ExRyxNQUFBQSxRQUFRLENBQUM0RyxHQUFULENBQWE1SyxPQUFiLENBQXFCLFVBQUE0SyxHQUFHLEVBQUk7QUFDeEJGLFFBQUFBLElBQUksa0NBQXlCN1MscUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ3lILEdBQWpDLENBQXpCLFdBQUo7QUFDSCxPQUZEO0FBR0FGLE1BQUFBLElBQUksSUFBSSxjQUFSO0FBQ0g7O0FBRURBLElBQUFBLElBQUksSUFBSSxRQUFSLENBM0MrQixDQTJDYjs7QUFDbEJBLElBQUFBLElBQUksSUFBSSxRQUFSLENBNUMrQixDQTRDYjs7QUFDbEJBLElBQUFBLElBQUksSUFBSSxRQUFSLENBN0MrQixDQTZDYjs7QUFFbEIsV0FBT0EsSUFBUDtBQUNILEdBOTFDeUI7O0FBZzJDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSXZOLEVBQUFBLDJCQXAyQzBCLHlDQW8yQ0k7QUFDMUIsUUFBTTBOLFlBQVksR0FBRzlTLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJJLE1BQWpCLENBQXdCLFdBQXhCLENBQXJCO0FBQ0EsUUFBTTJTLGFBQWEsR0FBRy9TLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JJLE1BQWxCLENBQXlCLFdBQXpCLENBQXRCOztBQUVBLFFBQUkwUyxZQUFZLENBQUN2UCxNQUFiLEtBQXdCLENBQXhCLElBQTZCd1AsYUFBYSxDQUFDeFAsTUFBZCxLQUF5QixDQUExRCxFQUE2RDtBQUN6RDtBQUNILEtBTnlCLENBUTFCOzs7QUFDQSxRQUFNeVAsZUFBZSxHQUFHLFNBQWxCQSxlQUFrQixHQUFNO0FBQzFCLFVBQU1DLFlBQVksR0FBR0gsWUFBWSxDQUFDek8sUUFBYixDQUFzQixZQUF0QixDQUFyQjs7QUFFQSxVQUFJLENBQUM0TyxZQUFMLEVBQW1CO0FBQ2Y7QUFDQUYsUUFBQUEsYUFBYSxDQUFDMU8sUUFBZCxDQUF1QixTQUF2QjtBQUNBME8sUUFBQUEsYUFBYSxDQUFDckUsUUFBZCxDQUF1QixVQUF2QixFQUhlLENBS2Y7O0FBQ0FxRSxRQUFBQSxhQUFhLENBQUNoRixJQUFkLENBQW1CLGNBQW5CLEVBQW1DNU0sZUFBZSxDQUFDK1Isa0JBQWhCLElBQXNDLGlDQUF6RTtBQUNBSCxRQUFBQSxhQUFhLENBQUNoRixJQUFkLENBQW1CLGVBQW5CLEVBQW9DLFVBQXBDO0FBQ0gsT0FSRCxNQVFPO0FBQ0g7QUFDQWdGLFFBQUFBLGFBQWEsQ0FBQ3ZMLFdBQWQsQ0FBMEIsVUFBMUI7QUFDQXVMLFFBQUFBLGFBQWEsQ0FBQ0ksVUFBZCxDQUF5QixjQUF6QjtBQUNBSixRQUFBQSxhQUFhLENBQUNJLFVBQWQsQ0FBeUIsZUFBekI7QUFDSDtBQUNKLEtBakJELENBVDBCLENBNEIxQjs7O0FBQ0FILElBQUFBLGVBQWUsR0E3QlcsQ0ErQjFCO0FBQ0E7O0FBQ0FoVCxJQUFBQSxDQUFDLENBQUMsYUFBRCxDQUFELENBQWlCbUUsRUFBakIsQ0FBb0IsUUFBcEIsRUFBOEIsWUFBVztBQUNyQzZPLE1BQUFBLGVBQWU7QUFDbEIsS0FGRDtBQUdILEdBeDRDeUI7O0FBMjRDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSS9OLEVBQUFBLDRCQS80QzBCLDBDQSs0Q0s7QUFDM0IsUUFBTW1PLGNBQWMsR0FBR3BULENBQUMsQ0FBQyxjQUFELENBQXhCLENBRDJCLENBQ2dCOztBQUMzQyxRQUFNcVQsaUJBQWlCLEdBQUdyVCxDQUFDLENBQUMsdUJBQUQsQ0FBM0IsQ0FGMkIsQ0FFNEI7O0FBQ3ZELFFBQU1zVCxlQUFlLEdBQUd0VCxDQUFDLENBQUMsOEJBQUQsQ0FBekIsQ0FIMkIsQ0FLM0I7O0FBQ0EsUUFBSXVULGFBQWEsR0FBRyxJQUFwQjtBQUNBLFFBQUlDLFlBQVksR0FBRyxLQUFuQixDQVAyQixDQVMzQjs7QUFDQUYsSUFBQUEsZUFBZSxDQUFDN08sSUFBaEIsR0FWMkIsQ0FZM0I7O0FBQ0F6RSxJQUFBQSxDQUFDLENBQUM0SCxRQUFELENBQUQsQ0FBWXpELEVBQVosQ0FBZSw0QkFBZixFQUE2QyxZQUFNO0FBQy9Db1AsTUFBQUEsYUFBYSxHQUFHSCxjQUFjLENBQUN6TyxHQUFmLEVBQWhCO0FBQ0E2TyxNQUFBQSxZQUFZLEdBQUcsSUFBZjtBQUNILEtBSEQsRUFiMkIsQ0FrQjNCOztBQUNBSCxJQUFBQSxpQkFBaUIsQ0FBQ2xPLFFBQWxCLENBQTJCO0FBQ3ZCb0csTUFBQUEsUUFBUSxFQUFFLGtCQUFDNUksS0FBRCxFQUFXO0FBQ2pCO0FBQ0E7QUFFQTtBQUNBLFlBQUk2USxZQUFZLElBQUlELGFBQWEsS0FBSyxJQUFsQyxJQUEwQzVRLEtBQUssS0FBSzRRLGFBQXhELEVBQXVFO0FBQ25FRCxVQUFBQSxlQUFlLENBQUNHLFVBQWhCLENBQTJCLFNBQTNCO0FBQ0gsU0FGRCxNQUVPLElBQUlELFlBQUosRUFBa0I7QUFDckJGLFVBQUFBLGVBQWUsQ0FBQ0csVUFBaEIsQ0FBMkIsVUFBM0I7QUFDSCxTQVRnQixDQVdqQjs7O0FBQ0EsWUFBSUQsWUFBSixFQUFrQjtBQUNkek4sVUFBQUEsSUFBSSxDQUFDeUYsV0FBTDtBQUNIO0FBQ0o7QUFoQnNCLEtBQTNCO0FBa0JILEdBcDdDeUI7O0FBczdDMUI7QUFDSjtBQUNBO0FBQ0luRyxFQUFBQSxjQXo3QzBCLDRCQXk3Q1Q7QUFDYlUsSUFBQUEsSUFBSSxDQUFDaEcsUUFBTCxHQUFnQkQscUJBQXFCLENBQUNDLFFBQXRDLENBRGEsQ0FHYjs7QUFDQWdHLElBQUFBLElBQUksQ0FBQzJOLFdBQUwsQ0FBaUJDLE9BQWpCLEdBQTJCLElBQTNCO0FBQ0E1TixJQUFBQSxJQUFJLENBQUMyTixXQUFMLENBQWlCRSxTQUFqQixHQUE2QjNOLGtCQUE3QjtBQUNBRixJQUFBQSxJQUFJLENBQUMyTixXQUFMLENBQWlCRyxVQUFqQixHQUE4QixjQUE5QixDQU5hLENBUWI7O0FBQ0E5TixJQUFBQSxJQUFJLENBQUMrTix1QkFBTCxHQUErQixJQUEvQixDQVRhLENBV2I7O0FBQ0EvTixJQUFBQSxJQUFJLENBQUNtTCxlQUFMLEdBQXVCLElBQXZCLENBWmEsQ0FjYjs7QUFDQW5MLElBQUFBLElBQUksQ0FBQ2dPLG1CQUFMLEdBQTJCLElBQTNCO0FBQ0FoTyxJQUFBQSxJQUFJLENBQUNpTyxvQkFBTCxHQUE0QixJQUE1QjtBQUNBak8sSUFBQUEsSUFBSSxDQUFDa08sR0FBTDtBQUVBbE8sSUFBQUEsSUFBSSxDQUFDbEYsYUFBTCxHQUFxQmYscUJBQXFCLENBQUNlLGFBQTNDO0FBQ0FrRixJQUFBQSxJQUFJLENBQUMySyxnQkFBTCxHQUF3QjVRLHFCQUFxQixDQUFDNFEsZ0JBQTlDO0FBQ0EzSyxJQUFBQSxJQUFJLENBQUMwTCxlQUFMLEdBQXVCM1IscUJBQXFCLENBQUMyUixlQUE3QztBQUNBMUwsSUFBQUEsSUFBSSxDQUFDekMsVUFBTDtBQUNIO0FBaDlDeUIsQ0FBOUIsQyxDQW05Q0E7O0FBQ0F0RCxDQUFDLENBQUM0SCxRQUFELENBQUQsQ0FBWXNNLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBVLEVBQUFBLHFCQUFxQixDQUFDd0QsVUFBdEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBhc3N3b3JkU2NvcmUsIFBieEFwaSwgVXNlck1lc3NhZ2UsIFNvdW5kRmlsZVNlbGVjdG9yLCBHZW5lcmFsU2V0dGluZ3NBUEksIENsaXBib2FyZEpTLCBQYXNzd29yZFdpZGdldCwgUGFzc3dvcmRWYWxpZGF0aW9uQVBJLCBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciwgJCAqL1xuXG4vKipcbiAqIEEgbW9kdWxlIHRvIGhhbmRsZSBtb2RpZmljYXRpb24gb2YgZ2VuZXJhbCBzZXR0aW5ncy5cbiAqL1xuY29uc3QgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkd2ViQWRtaW5QYXNzd29yZDogJCgnI1dlYkFkbWluUGFzc3dvcmQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmQ6ICQoJyNTU0hQYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlzYWJsZVNTSFBhc3N3b3JkOiAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykucGFyZW50KCcuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmRTZWdtZW50OiAkKCcjb25seS1pZi1wYXNzd29yZC1lbmFibGVkJyksXG5cbiAgICAvKipcbiAgICAgKiBJZiBwYXNzd29yZCBzZXQsIGl0IHdpbGwgYmUgaGlkZWQgZnJvbSB3ZWIgdWkuXG4gICAgICovXG4gICAgaGlkZGVuUGFzc3dvcmQ6ICd4eHh4eHh4JyxcblxuICAgIC8qKlxuICAgICAqIFNvdW5kIGZpbGUgZmllbGQgSURzXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBzb3VuZEZpbGVGaWVsZHM6IHtcbiAgICAgICAgYW5ub3VuY2VtZW50SW46ICdQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbicsXG4gICAgICAgIGFubm91bmNlbWVudE91dDogJ1BCWFJlY29yZEFubm91bmNlbWVudE91dCdcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIE9yaWdpbmFsIGNvZGVjIHN0YXRlIGZyb20gbGFzdCBsb2FkXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBvcmlnaW5hbENvZGVjU3RhdGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBjb2RlY3MgaGF2ZSBiZWVuIGNoYW5nZWRcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBjb2RlY3NDaGFuZ2VkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgZGF0YSBoYXMgYmVlbiBsb2FkZWQgZnJvbSBBUElcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBkYXRhTG9hZGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczogeyAvLyBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlc1xuICAgICAgICBwYnhuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnUEJYTmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgV2ViQWRtaW5QYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXRjaFtXZWJBZG1pblBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFNTSFBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU1NIUGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbU1NIUGFzc3dvcmRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQlBvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCSFRUUFNQb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCSFRUUFNQb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV0VCSFRUUFNQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBBSkFNUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ0FKQU1Qb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgU0lQQXV0aFByZWZpeDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NJUEF1dGhQcmVmaXgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bYS16QS1aXSokL10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4SW52YWxpZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgd2ViIGFkbWluIHBhc3N3b3JkIGZpZWxkIHdoZW4gaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgd2ViQWRtaW5QYXNzd29yZFJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5V2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1tBLVpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcbiAgICAvLyBSdWxlcyBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZCB3aGVuIFNTSCBsb2dpbiB0aHJvdWdoIHRoZSBwYXNzd29yZCBlbmFibGVkLCBhbmQgaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1xcZC8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGRpc2FibGVkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfVxuICAgIF0sXG5cbiAgICAvKipcbiAgICAgKiBDbGlwYm9hcmQgaW5zdGFuY2UgZm9yIGNvcHkgZnVuY3Rpb25hbGl0eVxuICAgICAqIEB0eXBlIHtDbGlwYm9hcmRKU31cbiAgICAgKi9cbiAgICBjbGlwYm9hcmQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogIEluaXRpYWxpemUgbW9kdWxlIHdpdGggZXZlbnQgYmluZGluZ3MgYW5kIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldHNcbiAgICAgICAgLy8gV2ViIEFkbWluIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC5pbml0KGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZCwge1xuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdnZW5lcmFsX3dlYicsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogZmFsc2UsICAgICAvLyBObyBzaG93L2hpZGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU1NIIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc3NoV2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLCB7XG4gICAgICAgICAgICAgICAgY29udGV4dDogJ2dlbmVyYWxfc3NoJyxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSwgICAgIC8vIE5vIHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgU1NIIGRpc2FibGUgY2hlY2tib3hcbiAgICAgICAgICAgICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuaGlkZVdhcm5pbmdzKHNzaFdpZGdldCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzc2hXaWRnZXQuZWxlbWVudHMuJHNjb3JlU2VjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3NoV2lkZ2V0LmVsZW1lbnRzLiRzY29yZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuY2hlY2tQYXNzd29yZChzc2hXaWRnZXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyB3aGVuIHBhc3N3b3JkcyBjaGFuZ2VcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUEJYTGFuZ3VhZ2UgZHJvcGRvd24gZmlyc3Qgd2l0aCBzcGVjaWFsIGhhbmRsZXJcbiAgICAgICAgLy8gTXVzdCBiZSBkb25lIGJlZm9yZSBnZW5lcmFsIGRyb3Bkb3duIGluaXRpYWxpemF0aW9uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nKCk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGRyb3Bkb3ducyBvbiB0aGUgZm9ybSAoZXhjZXB0IHNvdW5kIGZpbGUgc2VsZWN0b3JzIGFuZCBsYW5ndWFnZSBkcm9wZG93bilcbiAgICAgICAgLy8gTGFuZ3VhZ2UgZHJvcGRvd24gYWxyZWFkeSBpbml0aWFsaXplZCBhYm92ZSB3aXRoIHNwZWNpYWwgb25DaGFuZ2UgaGFuZGxlclxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5kcm9wZG93bicpXG4gICAgICAgICAgICAubm90KCcuYXVkaW8tbWVzc2FnZS1zZWxlY3QnKVxuICAgICAgICAgICAgLm5vdCgnI1BCWExhbmd1YWdlLWRyb3Bkb3duJylcbiAgICAgICAgICAgIC5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveGVzIG9uIHRoZSBmb3JtXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgQU1JL0FKQU0gZGVwZW5kZW5jeSBhZnRlciBjaGVja2JveGVzIGFyZSBpbml0aWFsaXplZFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUFNSUFKQU1EZXBlbmRlbmN5KCk7XG5cbiAgICAgICAgLy8gQ29kZWMgdGFibGUgZHJhZy1uLWRyb3Agd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKSB3aGljaCBpcyBjYWxsZWQgZnJvbSB1cGRhdGVDb2RlY1RhYmxlcygpXG5cbiAgICAgICAgLy8gU291bmQgZmlsZSBzZWxlY3RvcnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBSRVNUIEFQSSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgbG9hZFNvdW5kRmlsZVZhbHVlcygpIG1ldGhvZCBjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RlOiBTU0gga2V5cyB0YWJsZSB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgbG9hZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyBkaXNwbGF5XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgY29weSBidXR0b25zXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhZGRpdGlvbmFsIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuXG4gICAgICAgIC8vIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goe1xuICAgICAgICAgICAgJ29uQ2hhbmdlJzogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmRcbiAgICAgICAgfSk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIHRvIGhhbmRsZSB0YWIgYWN0aXZhdGlvblxuICAgICAgICAkKHdpbmRvdykub24oJ0dTLUFjdGl2YXRlVGFiJywgKGV2ZW50LCBuYW1lVGFiKSA9PiB7XG4gICAgICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoJ2NoYW5nZSB0YWInLCBuYW1lVGFiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBpZiAodHlwZW9mIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVG9vbHRpcCBjbGljayBiZWhhdmlvciBpcyBub3cgaGFuZGxlZCBnbG9iYWxseSBpbiBUb29sdGlwQnVpbGRlci5qc1xuXG4gICAgICAgIC8vIFBCWExhbmd1YWdlIGRyb3Bkb3duIHdpdGggcmVzdGFydCB3YXJuaW5nIGFscmVhZHkgaW5pdGlhbGl6ZWQgYWJvdmVcblxuICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSBBUEkgaW5zdGVhZCBvZiB1c2luZyBzZXJ2ZXItcmVuZGVyZWQgdmFsdWVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggcGxheWJhY2sgZnVuY3Rpb25hbGl0eSB1c2luZyBTb3VuZEZpbGVTZWxlY3RvclxuICAgICAqIEhUTUwgc3RydWN0dXJlIGlzIHByb3ZpZGVkIGJ5IHRoZSBwbGF5QWRkTmV3U291bmRXaXRoSWNvbnMgcGFydGlhbCBpbiByZWNvcmRpbmcudm9sdDpcbiAgICAgKiAtIEhpZGRlbiBpbnB1dDogPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCIgbmFtZT1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCI+XG4gICAgICogLSBEcm9wZG93biBkaXY6IDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gc2VhcmNoIFBCWFJlY29yZEFubm91bmNlbWVudEluLWRyb3Bkb3duXCI+XG4gICAgICogLSBQbGF5YmFjayBidXR0b24gYW5kIGFkZCBuZXcgYnV0dG9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9ycygpIHtcbiAgICAgICAgLy8gU291bmQgZmlsZSBzZWxlY3RvcnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9yV2l0aERhdGEoKSBjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKVxuICAgICAgICBcbiAgICAgICAgLy8gVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgY29uc2lzdGVuY3kgYnV0IGFjdHVhbCBpbml0aWFsaXphdGlvbiBoYXBwZW5zXG4gICAgICAgIC8vIHdoZW4gd2UgaGF2ZSBkYXRhIGZyb20gdGhlIHNlcnZlciBpbiBsb2FkU291bmRGaWxlVmFsdWVzKClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBnZW5lcmFsIHNldHRpbmdzIGRhdGEgZnJvbSBBUElcbiAgICAgKiBVc2VkIGJvdGggb24gaW5pdGlhbCBwYWdlIGxvYWQgYW5kIGZvciBtYW51YWwgcmVmcmVzaFxuICAgICAqIENhbiBiZSBjYWxsZWQgYW55dGltZSB0byByZWxvYWQgdGhlIGZvcm0gZGF0YTogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWREYXRhKClcbiAgICAgKi9cbiAgICBsb2FkRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHRoZSBmb3JtIHdpdGggZGltbWVyXG4gICAgICAgIEZvcm0uc2hvd0xvYWRpbmdTdGF0ZSh0cnVlLCAnTG9hZGluZyBzZXR0aW5ncy4uLicpO1xuXG4gICAgICAgIEdlbmVyYWxTZXR0aW5nc0FQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIEZvcm0uaGlkZUxvYWRpbmdTdGF0ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggdGhlIHJlY2VpdmVkIGRhdGFcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5kYXRhTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaG93IHdhcm5pbmdzIGZvciBkZWZhdWx0IHBhc3N3b3JkcyBhZnRlciBET00gdXBkYXRlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEucGFzc3dvcmRWYWxpZGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgdXBkYXRlZCBhZnRlciBwb3B1bGF0ZUZvcm1cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0RlZmF1bHRQYXNzd29yZFdhcm5pbmdzKHJlc3BvbnNlLmRhdGEucGFzc3dvcmRWYWxpZGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQVBJIEVycm9yOicsIHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dBcGlFcnJvcihyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNldHRpbmdzIGRhdGEgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBFeHRyYWN0IHNldHRpbmdzIGFuZCBhZGRpdGlvbmFsIGRhdGFcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBkYXRhLnNldHRpbmdzIHx8IGRhdGE7XG4gICAgICAgIGNvbnN0IGNvZGVjcyA9IGRhdGEuY29kZWNzIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShzZXR0aW5ncywge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNwZWNpYWwgZmllbGQgdHlwZXNcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucG9wdWxhdGVTcGVjaWFsRmllbGRzKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHNvdW5kIGZpbGUgdmFsdWVzIHdpdGggcmVwcmVzZW50YXRpb25zXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWRTb3VuZEZpbGVWYWx1ZXMoZm9ybURhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBjb2RlYyB0YWJsZXNcbiAgICAgICAgICAgICAgICBpZiAoY29kZWNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgZmllbGRzIChoaWRlIGFjdHVhbCBwYXNzd29yZHMpXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVQYXNzd29yZEZpZWxkcyhmb3JtRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIFNTSCBwYXNzd29yZCB2aXNpYmlsaXR5XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmQoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU1NIIGtleXMgdGFibGUgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBzc2hLZXlzVGFibGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBzc2hLZXlzVGFibGUuaW5pdGlhbGl6ZSgnc3NoLWtleXMtY29udGFpbmVyJywgJ1NTSEF1dGhvcml6ZWRLZXlzJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyB3aXRoIG5ldyBkYXRhXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50IHRvIG5vdGlmeSB0aGF0IGRhdGEgaGFzIGJlZW4gbG9hZGVkXG4gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ0dlbmVyYWxTZXR0aW5ncy5kYXRhTG9hZGVkJyk7XG5cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzcGVjaWFsIGZpZWxkIHR5cGVzIHRoYXQgbmVlZCBjdXN0b20gcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVNwZWNpYWxGaWVsZHMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gUHJpdmF0ZSBrZXkgZXhpc3RlbmNlIGlzIG5vdyBkZXRlcm1pbmVkIGJ5IGNoZWNraW5nIGlmIHZhbHVlIGVxdWFscyBISURERU5fUEFTU1dPUkRcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgIGlmIChzZXR0aW5ncy5XRUJIVFRQU1B1YmxpY0tleV9pbmZvKSB7XG4gICAgICAgICAgICAkKCcjV0VCSFRUUFNQdWJsaWNLZXknKS5kYXRhKCdjZXJ0LWluZm8nLCBzZXR0aW5ncy5XRUJIVFRQU1B1YmxpY0tleV9pbmZvKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNoZWNrYm94ZXMgKEFQSSByZXR1cm5zIGJvb2xlYW4gdmFsdWVzKVxuICAgICAgICBPYmplY3Qua2V5cyhzZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJChgIyR7a2V5fWApLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBzZXR0aW5nc1trZXldID09PSB0cnVlIHx8IHNldHRpbmdzW2tleV0gPT09ICcxJyB8fCBzZXR0aW5nc1trZXldID09PSAxO1xuICAgICAgICAgICAgICAgICRjaGVja2JveC5jaGVja2JveChpc0NoZWNrZWQgPyAnY2hlY2snIDogJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIHJlZ3VsYXIgZHJvcGRvd25zIChleGNsdWRpbmcgc291bmQgZmlsZSBzZWxlY3RvcnMgd2hpY2ggYXJlIGhhbmRsZWQgc2VwYXJhdGVseSlcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2tleX1gKS5wYXJlbnQoJy5kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPiAwICYmICEkZHJvcGRvd24uaGFzQ2xhc3MoJ2F1ZGlvLW1lc3NhZ2Utc2VsZWN0JykpIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNldHRpbmdzW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgZmllbGRzIHdpdGggaGlkZGVuIHBhc3N3b3JkIGluZGljYXRvclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGFcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gSGlkZSBhY3R1YWwgcGFzc3dvcmRzIGFuZCBzaG93IGhpZGRlbiBpbmRpY2F0b3JcbiAgICAgICAgaWYgKHNldHRpbmdzLldlYkFkbWluUGFzc3dvcmQgJiYgc2V0dGluZ3MuV2ViQWRtaW5QYXNzd29yZCAhPT0gJycpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoc2V0dGluZ3MuU1NIUGFzc3dvcmQgJiYgc2V0dGluZ3MuU1NIUGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IEFQSSBlcnJvciBtZXNzYWdlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXNzYWdlcyAtIEVycm9yIG1lc3NhZ2VzIGZyb20gQVBJXG4gICAgICovXG4gICAgc2hvd0FwaUVycm9yKG1lc3NhZ2VzKSB7XG4gICAgICAgIGlmIChtZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gQXJyYXkuaXNBcnJheShtZXNzYWdlcy5lcnJvcikgXG4gICAgICAgICAgICAgICAgPyBtZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIFxuICAgICAgICAgICAgICAgIDogbWVzc2FnZXMuZXJyb3I7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyB3YXJuaW5ncyBmb3IgZGVmYXVsdCBwYXNzd29yZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdmFsaWRhdGlvbiAtIFBhc3N3b3JkIHZhbGlkYXRpb24gcmVzdWx0cyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHNob3dEZWZhdWx0UGFzc3dvcmRXYXJuaW5ncyh2YWxpZGF0aW9uKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgcGFzc3dvcmQtdmFsaWRhdGUgbWVzc2FnZXMgZmlyc3RcbiAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHdhcm5pbmcgZm9yIGRlZmF1bHQgV2ViIEFkbWluIHBhc3N3b3JkXG4gICAgICAgIGlmICh2YWxpZGF0aW9uLmlzRGVmYXVsdFdlYlBhc3N3b3JkKSB7XG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBwYXNzd29yZCBmaWVsZHMgZ3JvdXAgLSB0cnkgbXVsdGlwbGUgc2VsZWN0b3JzXG4gICAgICAgICAgICBsZXQgJHdlYlBhc3N3b3JkRmllbGRzID0gJCgnI1dlYkFkbWluUGFzc3dvcmQnKS5jbG9zZXN0KCcudHdvLmZpZWxkcycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHdlYlBhc3N3b3JkRmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSBhbHRlcm5hdGl2ZSBzZWxlY3RvciBpZiB0aGUgZmlyc3Qgb25lIGRvZXNuJ3Qgd29ya1xuICAgICAgICAgICAgICAgICR3ZWJQYXNzd29yZEZpZWxkcyA9ICQoJyNXZWJBZG1pblBhc3N3b3JkJykucGFyZW50KCkucGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkd2ViUGFzc3dvcmRGaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCB3YXJuaW5nSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIGljb24gbWVzc2FnZSBwYXNzd29yZC12YWxpZGF0ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUucHN3X1NldFBhc3N3b3JkIHx8ICdTZWN1cml0eSBXYXJuaW5nJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5wc3dfQ2hhbmdlRGVmYXVsdFBhc3N3b3JkIHx8ICdZb3UgYXJlIHVzaW5nIHRoZSBkZWZhdWx0IHBhc3N3b3JkLiBQbGVhc2UgY2hhbmdlIGl0IGZvciBzZWN1cml0eS4nfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluc2VydCB3YXJuaW5nIGJlZm9yZSB0aGUgcGFzc3dvcmQgZmllbGRzXG4gICAgICAgICAgICAgICAgJHdlYlBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgd2FybmluZyBmb3IgZGVmYXVsdCBTU0ggcGFzc3dvcmRcbiAgICAgICAgaWYgKHZhbGlkYXRpb24uaXNEZWZhdWx0U1NIUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIFNTSCBwYXNzd29yZCBsb2dpbiBpcyBlbmFibGVkXG4gICAgICAgICAgICBjb25zdCBzc2hQYXNzd29yZERpc2FibGVkID0gJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghc3NoUGFzc3dvcmREaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHMgZ3JvdXBcbiAgICAgICAgICAgICAgICBsZXQgJHNzaFBhc3N3b3JkRmllbGRzID0gJCgnI1NTSFBhc3N3b3JkJykuY2xvc2VzdCgnLnR3by5maWVsZHMnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJHNzaFBhc3N3b3JkRmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgYWx0ZXJuYXRpdmUgc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzID0gJCgnI1NTSFBhc3N3b3JkJykucGFyZW50KCkucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkc3NoUGFzc3dvcmRGaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgd2FybmluZyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIGljb24gbWVzc2FnZSBwYXNzd29yZC12YWxpZGF0ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUucHN3X1NldFBhc3N3b3JkIHx8ICdTZWN1cml0eSBXYXJuaW5nJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUucHN3X0NoYW5nZURlZmF1bHRQYXNzd29yZCB8fCAnWW91IGFyZSB1c2luZyB0aGUgZGVmYXVsdCBwYXNzd29yZC4gUGxlYXNlIGNoYW5nZSBpdCBmb3Igc2VjdXJpdHkuJ308L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEluc2VydCB3YXJuaW5nIGJlZm9yZSB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICAkc3NoUGFzc3dvcmRGaWVsZHMuYmVmb3JlKHdhcm5pbmdIdG1sKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYW5kIGxvYWQgc291bmQgZmlsZSBzZWxlY3RvcnMgd2l0aCBkYXRhLCBzaW1pbGFyIHRvIElWUiBpbXBsZW1lbnRhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU291bmRGaWxlVmFsdWVzKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIENvbnZlcnQgZW1wdHkgdmFsdWVzIHRvIC0xIGZvciB0aGUgZHJvcGRvd25cbiAgICAgICAgY29uc3QgZGF0YUluID0gey4uLnNldHRpbmdzfTtcbiAgICAgICAgaWYgKCFzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiB8fCBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiA9PT0gJycpIHtcbiAgICAgICAgICAgIGRhdGFJbi5QQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiA9ICctMSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIGluY29taW5nIGFubm91bmNlbWVudCBzZWxlY3RvciB3aXRoIGRhdGEgKGZvbGxvd2luZyBJVlIgcGF0dGVybilcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4nLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhSW5cbiAgICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBlbXB0eSB2YWx1ZXMgdG8gLTEgZm9yIHRoZSBkcm9wZG93blxuICAgICAgICBjb25zdCBkYXRhT3V0ID0gey4uLnNldHRpbmdzfTtcbiAgICAgICAgaWYgKCFzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQgfHwgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0ID09PSAnJykge1xuICAgICAgICAgICAgZGF0YU91dC5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQgPSAnLTEnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvdXRnb2luZyBhbm5vdW5jZW1lbnQgc2VsZWN0b3Igd2l0aCBkYXRhIChmb2xsb3dpbmcgSVZSIHBhdHRlcm4pXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ1BCWFJlY29yZEFubm91bmNlbWVudE91dCcsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFPdXRcbiAgICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGFuZCB1cGRhdGUgY29kZWMgdGFibGVzIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvZGVjcyAtIEFycmF5IG9mIGNvZGVjIGNvbmZpZ3VyYXRpb25zXG4gICAgICovXG4gICAgdXBkYXRlQ29kZWNUYWJsZXMoY29kZWNzKSB7XG4gICAgICAgIC8vIFJlc2V0IGNvZGVjIGNoYW5nZSBmbGFnIHdoZW4gbG9hZGluZyBkYXRhXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkID0gZmFsc2U7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgY29kZWMgc3RhdGUgZm9yIGNvbXBhcmlzb25cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gU2VwYXJhdGUgYXVkaW8gYW5kIHZpZGVvIGNvZGVjc1xuICAgICAgICBjb25zdCBhdWRpb0NvZGVjcyA9IGNvZGVjcy5maWx0ZXIoYyA9PiBjLnR5cGUgPT09ICdhdWRpbycpLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgY29uc3QgdmlkZW9Db2RlY3MgPSBjb2RlY3MuZmlsdGVyKGMgPT4gYy50eXBlID09PSAndmlkZW8nKS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBhdWRpbyBjb2RlY3MgdGFibGVcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmJ1aWxkQ29kZWNUYWJsZShhdWRpb0NvZGVjcywgJ2F1ZGlvJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCB2aWRlbyBjb2RlY3MgdGFibGVcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmJ1aWxkQ29kZWNUYWJsZSh2aWRlb0NvZGVjcywgJ3ZpZGVvJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIGxvYWRlcnMgYW5kIHNob3cgdGFibGVzXG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtbG9hZGVyLCAjdmlkZW8tY29kZWNzLWxvYWRlcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSwgI3ZpZGVvLWNvZGVjcy10YWJsZScpLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZHJhZyBhbmQgZHJvcCBmb3IgcmVvcmRlcmluZ1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGNvZGVjIHRhYmxlIHJvd3MgZnJvbSBkYXRhXG4gICAgICogQHBhcmFtIHtBcnJheX0gY29kZWNzIC0gQXJyYXkgb2YgY29kZWMgb2JqZWN0c1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gJ2F1ZGlvJyBvciAndmlkZW8nXG4gICAgICovXG4gICAgYnVpbGRDb2RlY1RhYmxlKGNvZGVjcywgdHlwZSkge1xuICAgICAgICBjb25zdCAkdGFibGVCb2R5ID0gJChgIyR7dHlwZX0tY29kZWNzLXRhYmxlIHRib2R5YCk7XG4gICAgICAgICR0YWJsZUJvZHkuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIGNvZGVjcy5mb3JFYWNoKChjb2RlYywgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHN0YXRlIGZvciBjaGFuZ2UgZGV0ZWN0aW9uXG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkub3JpZ2luYWxDb2RlY1N0YXRlW2NvZGVjLm5hbWVdID0ge1xuICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCxcbiAgICAgICAgICAgICAgICBkaXNhYmxlZDogY29kZWMuZGlzYWJsZWRcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWJsZSByb3dcbiAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSBjb2RlYy5kaXNhYmxlZCA9PT0gdHJ1ZSB8fCBjb2RlYy5kaXNhYmxlZCA9PT0gJzEnIHx8IGNvZGVjLmRpc2FibGVkID09PSAxO1xuICAgICAgICAgICAgY29uc3QgY2hlY2tlZCA9ICFpc0Rpc2FibGVkID8gJ2NoZWNrZWQnIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHJvd0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwiY29kZWMtcm93XCIgaWQ9XCJjb2RlYy0ke2NvZGVjLm5hbWV9XCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke2luZGV4fVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNvZGVjLW5hbWU9XCIke2NvZGVjLm5hbWV9XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1vcmlnaW5hbC1wcmlvcml0eT1cIiR7aW5kZXh9XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cImNvbGxhcHNpbmcgZHJhZ0hhbmRsZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzb3J0IGdyZXkgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBjb2RlY3NcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJjb2RlY18ke2NvZGVjLm5hbWV9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Y2hlY2tlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFiaW5kZXg9XCIwXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwiaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj1cImNvZGVjXyR7Y29kZWMubmFtZX1cIj4ke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGNvZGVjLmRlc2NyaXB0aW9uIHx8IGNvZGVjLm5hbWUpfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHRhYmxlQm9keS5hcHBlbmQocm93SHRtbCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIGZvciB0aGUgbmV3IHJvd3NcbiAgICAgICAgJHRhYmxlQm9keS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gTWFyayBjb2RlY3MgYXMgY2hhbmdlZCBhbmQgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNvZGVjc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJhZyBhbmQgZHJvcCBmb3IgY29kZWMgdGFibGVzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKSB7XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUsICN2aWRlby1jb2RlY3MtdGFibGUnKS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyYWdDbGFzczogJ2hvdmVyaW5nUm93JyxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZScsXG4gICAgICAgICAgICBvbkRyb3A6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgY29kZWNzIGFzIGNoYW5nZWQgYW5kIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNlcnRpZmljYXRlIGZpZWxkIGRpc3BsYXkgb25seVxuICAgICAqL1xuICAgIGluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCkge1xuICAgICAgICAvLyBIYW5kbGUgV0VCSFRUUFNQdWJsaWNLZXkgZmllbGQgb25seVxuICAgICAgICBjb25zdCAkY2VydFB1YktleUZpZWxkID0gJCgnI1dFQkhUVFBTUHVibGljS2V5Jyk7XG4gICAgICAgIGlmICgkY2VydFB1YktleUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFZhbHVlID0gJGNlcnRQdWJLZXlGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkY2VydFB1YktleUZpZWxkLnBhcmVudCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgY2VydGlmaWNhdGUgaW5mbyBpZiBhdmFpbGFibGUgZnJvbSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICAgICAgY29uc3QgY2VydEluZm8gPSAkY2VydFB1YktleUZpZWxkLmRhdGEoJ2NlcnQtaW5mbycpIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIGRpc3BsYXkgZWxlbWVudHMgZm9yIHRoaXMgZmllbGQgb25seVxuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5LCAuY2VydC1lZGl0LWZvcm0nKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGZ1bGxWYWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBtZWFuaW5nZnVsIGRpc3BsYXkgdGV4dCBmcm9tIGNlcnRpZmljYXRlIGluZm9cbiAgICAgICAgICAgICAgICBsZXQgZGlzcGxheVRleHQgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8gJiYgIWNlcnRJbmZvLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gW107XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgc3ViamVjdC9kb21haW5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLnN1YmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYPCfk5wgJHtjZXJ0SW5mby5zdWJqZWN0fWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgaXNzdWVyIGlmIG5vdCBzZWxmLXNpZ25lZFxuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNzdWVyICYmICFjZXJ0SW5mby5pc19zZWxmX3NpZ25lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChgYnkgJHtjZXJ0SW5mby5pc3N1ZXJ9YCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goJyhTZWxmLXNpZ25lZCknKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHZhbGlkaXR5IGRhdGVzXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby52YWxpZF90bykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDinYwgRXhwaXJlZCAke2NlcnRJbmZvLnZhbGlkX3RvfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKaoO+4jyBFeHBpcmVzIGluICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXNgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4pyFIFZhbGlkIHVudGlsICR7Y2VydEluZm8udmFsaWRfdG99YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlUZXh0ID0gcGFydHMuam9pbignIHwgJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdHJ1bmNhdGVkIGNlcnRpZmljYXRlXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlUZXh0ID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnRydW5jYXRlQ2VydGlmaWNhdGUoZnVsbFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgb3JpZ2luYWwgZmllbGRcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgc3RhdHVzIGNvbG9yIGNsYXNzIGJhc2VkIG9uIGNlcnRpZmljYXRlIHN0YXR1c1xuICAgICAgICAgICAgICAgIGxldCBzdGF0dXNDbGFzcyA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5IDw9IDMwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwbGF5SHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGlvbiBpbnB1dCBmbHVpZCBjZXJ0LWRpc3BsYXkgJHtzdGF0dXNDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChkaXNwbGF5VGV4dCl9XCIgcmVhZG9ubHkgY2xhc3M9XCJ0cnVuY2F0ZWQtZGlzcGxheVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgY29weS1idG5cIiBkYXRhLWNsaXBib2FyZC10ZXh0PVwiJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChmdWxsVmFsdWUpfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFyaWF0aW9uPVwiYmFzaWNcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weUNlcnQgfHwgJ0NvcHkgY2VydGlmaWNhdGUnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29weSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBpbmZvLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENlcnRJbmZvIHx8ICdDZXJ0aWZpY2F0ZSBkZXRhaWxzJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGVkaXQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXQgfHwgJ0VkaXQgY2VydGlmaWNhdGUnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZWRpdCBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBkZWxldGUtY2VydC1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlIHx8ICdEZWxldGUgY2VydGlmaWNhdGUnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwidHJhc2ggaWNvbiByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICR7Y2VydEluZm8gJiYgIWNlcnRJbmZvLmVycm9yID8gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnJlbmRlckNlcnRpZmljYXRlRGV0YWlscyhjZXJ0SW5mbykgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGZvcm0gY2VydC1lZGl0LWZvcm1cIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBpZD1cIldFQkhUVFBTUHVibGljS2V5X2VkaXRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93cz1cIjEwXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQdWJsaWNDZXJ0IHx8ICdQYXN0ZSBwdWJsaWMgY2VydGlmaWNhdGUgaGVyZS4uLid9XCI+JHtmdWxsVmFsdWV9PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG1pbmkgYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBwb3NpdGl2ZSBidXR0b24gc2F2ZS1jZXJ0LWJ0blwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1NhdmUgfHwgJ1NhdmUnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gY2FuY2VsLWNlcnQtYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2xvc2UgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuYnRfQ2FuY2VsIHx8ICdDYW5jZWwnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBpbmZvIGJ1dHRvbiAtIHRvZ2dsZSBkZXRhaWxzIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5pbmZvLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRkZXRhaWxzID0gJGNvbnRhaW5lci5maW5kKCcuY2VydC1kZXRhaWxzJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkZGV0YWlscy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRkZXRhaWxzLnNsaWRlVG9nZ2xlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZWRpdCBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5lZGl0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWRpc3BsYXknKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZWRpdC1mb3JtJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJyNXRUJIVFRQU1B1YmxpY0tleV9lZGl0JykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5zYXZlLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQdWJsaWNLZXlfZWRpdCcpLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBvcmlnaW5hbCBoaWRkZW4gZmllbGRcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC52YWwobmV3VmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgb25seSB0aGUgY2VydGlmaWNhdGUgZmllbGQgZGlzcGxheSB3aXRoIG5ldyB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgY2FuY2VsIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNhbmNlbC1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWVkaXQtZm9ybScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5Jykuc2hvdygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZGVsZXRlLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgY2VydGlmaWNhdGVcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgb25seSB0aGUgY2VydGlmaWNhdGUgZmllbGQgdG8gc2hvdyBlbXB0eSBmaWVsZFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIG5ldyBidXR0b25zXG4gICAgICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBmb3IgaW5wdXQgd2l0aCBwcm9wZXIgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHVibGljQ2VydCB8fCAnUGFzdGUgcHVibGljIGNlcnRpZmljYXRlIGhlcmUuLi4nKTtcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLmF0dHIoJ3Jvd3MnLCAnMTAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgY2hhbmdlIGV2ZW50cyB0cmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQub2ZmKCdpbnB1dC5jZXJ0IGNoYW5nZS5jZXJ0IGtleXVwLmNlcnQnKS5vbignaW5wdXQuY2VydCBjaGFuZ2UuY2VydCBrZXl1cC5jZXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0cnVuY2F0ZWQgZmllbGRzIGRpc3BsYXkgZm9yIFNTSCBrZXlzIGFuZCBjZXJ0aWZpY2F0ZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCkge1xuICAgICAgICAvLyBIYW5kbGUgU1NIX0lEX1JTQV9QVUIgZmllbGRcbiAgICAgICAgY29uc3QgJHNzaFB1YktleUZpZWxkID0gJCgnI1NTSF9JRF9SU0FfUFVCJyk7XG4gICAgICAgIGlmICgkc3NoUHViS2V5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsVmFsdWUgPSAkc3NoUHViS2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJHNzaFB1YktleUZpZWxkLnBhcmVudCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIGRpc3BsYXkgZWxlbWVudHNcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnNzaC1rZXktZGlzcGxheSwgLmZ1bGwtZGlzcGxheScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IGNyZWF0ZSBkaXNwbGF5IGlmIHRoZXJlJ3MgYSB2YWx1ZVxuICAgICAgICAgICAgaWYgKGZ1bGxWYWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB0cnVuY2F0ZWQgZGlzcGxheVxuICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS50cnVuY2F0ZVNTSEtleShmdWxsVmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIG9yaWdpbmFsIGZpZWxkXG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwbGF5SHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGlvbiBpbnB1dCBmbHVpZCBzc2gta2V5LWRpc3BsYXlcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHt0cnVuY2F0ZWR9XCIgcmVhZG9ubHkgY2xhc3M9XCJ0cnVuY2F0ZWQtZGlzcGxheVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgY29weS1idG5cIiBkYXRhLWNsaXBib2FyZC10ZXh0PVwiJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChmdWxsVmFsdWUpfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cImJhc2ljXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlLZXkgfHwgJ0NvcHknfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29weSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBleHBhbmQtYnRuXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFeHBhbmQgfHwgJ1Nob3cgZnVsbCBrZXknfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhwYW5kIGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGNsYXNzPVwiZnVsbC1kaXNwbGF5XCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCIgcmVhZG9ubHk+JHtmdWxsVmFsdWV9PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIGV4cGFuZC9jb2xsYXBzZVxuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZXhwYW5kLWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZ1bGxEaXNwbGF5ID0gJGNvbnRhaW5lci5maW5kKCcuZnVsbC1kaXNwbGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRydW5jYXRlZERpc3BsYXkgPSAkY29udGFpbmVyLmZpbmQoJy5zc2gta2V5LWRpc3BsYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQodGhpcykuZmluZCgnaScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkZnVsbERpc3BsYXkuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJGZ1bGxEaXNwbGF5LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJHRydW5jYXRlZERpc3BsYXkuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnY29tcHJlc3MnKS5hZGRDbGFzcygnZXhwYW5kJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGZ1bGxEaXNwbGF5LnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJHRydW5jYXRlZERpc3BsYXkuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXhwYW5kJykuYWRkQ2xhc3MoJ2NvbXByZXNzJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIG5ldyBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG9yaWdpbmFsIGZpZWxkIGFzIHJlYWQtb25seSAodGhpcyBpcyBhIHN5c3RlbS1nZW5lcmF0ZWQga2V5KVxuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX05vU1NIUHVibGljS2V5IHx8ICdObyBTU0ggcHVibGljIGtleSBnZW5lcmF0ZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIC0gdXNlIGRlZGljYXRlZCBtZXRob2RcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgV0VCSFRUUFNQcml2YXRlS2V5IGZpZWxkICh3cml0ZS1vbmx5IHdpdGggcGFzc3dvcmQgbWFza2luZylcbiAgICAgICAgY29uc3QgJGNlcnRQcml2S2V5RmllbGQgPSAkKCcjV0VCSFRUUFNQcml2YXRlS2V5Jyk7XG4gICAgICAgIGlmICgkY2VydFByaXZLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkY2VydFByaXZLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5wcml2YXRlLWtleS1zZXQsICNXRUJIVFRQU1ByaXZhdGVLZXlfbmV3JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHByaXZhdGUga2V5IGV4aXN0cyAocGFzc3dvcmQgbWFza2luZyBsb2dpYylcbiAgICAgICAgICAgIC8vIFRoZSBmaWVsZCB3aWxsIGNvbnRhaW4gJ3h4eHh4eHgnIGlmIGEgcHJpdmF0ZSBrZXkgaXMgc2V0XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkY2VydFByaXZLZXlGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1ZhbHVlID0gY3VycmVudFZhbHVlID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChoYXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgb3JpZ2luYWwgZmllbGQgYW5kIHNob3cgc3RhdHVzIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2UgcHJpdmF0ZS1rZXktc2V0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImxvY2sgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19Qcml2YXRlS2V5SXNTZXQgfHwgJ1ByaXZhdGUga2V5IGlzIGNvbmZpZ3VyZWQnfSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzPVwicmVwbGFjZS1rZXktbGlua1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1JlcGxhY2UgfHwgJ1JlcGxhY2UnfTwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBpZD1cIldFQkhUVFBTUHJpdmF0ZUtleV9uZXdcIiBuYW1lPVwiV0VCSFRUUFNQcml2YXRlS2V5XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dzPVwiMTBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHJpdmF0ZUtleSB8fCAnUGFzdGUgcHJpdmF0ZSBrZXkgaGVyZS4uLid9XCI+PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcmVwbGFjZSBsaW5rXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucmVwbGFjZS1rZXktbGluaycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5wcml2YXRlLWtleS1zZXQnKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRuZXdGaWVsZCA9ICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHJpdmF0ZUtleV9uZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgJG5ld0ZpZWxkLnNob3coKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGhpZGRlbiBwYXNzd29yZCB2YWx1ZSBzbyB3ZSBjYW4gc2V0IGEgbmV3IG9uZVxuICAgICAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQmluZCBjaGFuZ2UgZXZlbnQgdG8gdXBkYXRlIGhpZGRlbiBmaWVsZCBhbmQgZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICRuZXdGaWVsZC5vbignaW5wdXQgY2hhbmdlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIG9yaWdpbmFsIGhpZGRlbiBmaWVsZCB3aXRoIG5ldyB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQudmFsKCRuZXdGaWVsZC52YWwoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uIGNoZWNrXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBmb3IgaW5wdXQgd2l0aCBwcm9wZXIgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQcml2YXRlS2V5IHx8ICdQYXN0ZSBwcml2YXRlIGtleSBoZXJlLi4uJyk7XG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuYXR0cigncm93cycsICcxMCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjaGFuZ2UgZXZlbnRzIHRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQub2ZmKCdpbnB1dC5wcml2IGNoYW5nZS5wcml2IGtleXVwLnByaXYnKS5vbignaW5wdXQucHJpdiBjaGFuZ2UucHJpdiBrZXl1cC5wcml2JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2xpcGJvYXJkIGZ1bmN0aW9uYWxpdHkgZm9yIGNvcHkgYnV0dG9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDbGlwYm9hcmQoKSB7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNvcHktYnRuJyk7XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCAkYnRuID0gJChlLnRyaWdnZXIpO1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxJY29uID0gJGJ0bi5maW5kKCdpJykuYXR0cignY2xhc3MnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJGJ0bi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoKS5hZGRDbGFzcygnY2hlY2sgaWNvbicpO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGJ0bi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoKS5hZGRDbGFzcyhvcmlnaW5hbEljb24pO1xuICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFyIHNlbGVjdGlvblxuICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQub24oJ2Vycm9yJywgKCkgPT4ge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5nc19Db3B5RmFpbGVkIHx8ICdGYWlsZWQgdG8gY29weSB0byBjbGlwYm9hcmQnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUcnVuY2F0ZSBTU0gga2V5IGZvciBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSAtIEZ1bGwgU1NIIGtleVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVHJ1bmNhdGVkIGtleVxuICAgICAqL1xuICAgIHRydW5jYXRlU1NIS2V5KGtleSkge1xuICAgICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoIDwgNTApIHtcbiAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KCcgJyk7XG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPj0gMikge1xuICAgICAgICAgICAgY29uc3Qga2V5VHlwZSA9IHBhcnRzWzBdO1xuICAgICAgICAgICAgY29uc3Qga2V5RGF0YSA9IHBhcnRzWzFdO1xuICAgICAgICAgICAgY29uc3QgY29tbWVudCA9IHBhcnRzLnNsaWNlKDIpLmpvaW4oJyAnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleURhdGEubGVuZ3RoID4gNDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSBrZXlEYXRhLnN1YnN0cmluZygwLCAyMCkgKyAnLi4uJyArIGtleURhdGEuc3Vic3RyaW5nKGtleURhdGEubGVuZ3RoIC0gMTUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBgJHtrZXlUeXBlfSAke3RydW5jYXRlZH0gJHtjb21tZW50fWAudHJpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ga2V5O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVHJ1bmNhdGUgY2VydGlmaWNhdGUgZm9yIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2VydCAtIEZ1bGwgY2VydGlmaWNhdGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRydW5jYXRlZCBjZXJ0aWZpY2F0ZSBpbiBzaW5nbGUgbGluZSBmb3JtYXRcbiAgICAgKi9cbiAgICB0cnVuY2F0ZUNlcnRpZmljYXRlKGNlcnQpIHtcbiAgICAgICAgaWYgKCFjZXJ0IHx8IGNlcnQubGVuZ3RoIDwgMTAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2VydDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbGluZXMgPSBjZXJ0LnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRyYWN0IGZpcnN0IGFuZCBsYXN0IG1lYW5pbmdmdWwgbGluZXNcbiAgICAgICAgY29uc3QgZmlyc3RMaW5lID0gbGluZXNbMF0gfHwgJyc7XG4gICAgICAgIGNvbnN0IGxhc3RMaW5lID0gbGluZXNbbGluZXMubGVuZ3RoIC0gMV0gfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgY2VydGlmaWNhdGVzLCBzaG93IGJlZ2luIGFuZCBlbmQgbWFya2Vyc1xuICAgICAgICBpZiAoZmlyc3RMaW5lLmluY2x1ZGVzKCdCRUdJTiBDRVJUSUZJQ0FURScpKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7Zmlyc3RMaW5lfS4uLiR7bGFzdExpbmV9YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIG90aGVyIGZvcm1hdHMsIHRydW5jYXRlIHRoZSBjb250ZW50XG4gICAgICAgIGNvbnN0IGNsZWFuQ2VydCA9IGNlcnQucmVwbGFjZSgvXFxuL2csICcgJykudHJpbSgpO1xuICAgICAgICBpZiAoY2xlYW5DZXJ0Lmxlbmd0aCA+IDgwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2xlYW5DZXJ0LnN1YnN0cmluZygwLCA0MCkgKyAnLi4uJyArIGNsZWFuQ2VydC5zdWJzdHJpbmcoY2xlYW5DZXJ0Lmxlbmd0aCAtIDMwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNsZWFuQ2VydDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIGZvciBzYWZlIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gZXNjYXBlXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgbWFwID0ge1xuICAgICAgICAgICAgJyYnOiAnJmFtcDsnLFxuICAgICAgICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAgICAgICAnPic6ICcmZ3Q7JyxcbiAgICAgICAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgICAgICAgXCInXCI6ICcmIzAzOTsnXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoL1smPD5cIiddL2csIG0gPT4gbWFwW21dKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnQgYWNjb3JkaW5nIHRvIHRoZSB2YWx1ZSBvZiB1c2UgU1NIIHBhc3N3b3JkIGNoZWNrYm94LlxuICAgICAqL1xuICAgIHNob3dIaWRlU1NIUGFzc3dvcmQoKXtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmRTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmRTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIFByZXBhcmVzIGRhdGEgZm9yIFJFU1QgQVBJIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjZXJ0aWZpY2F0ZSBmaWVsZHMgLSBvbmx5IHNlbmQgaWYgdXNlciBhY3R1YWxseSBlbnRlcmVkIG5ldyB2YWx1ZXNcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLldFQkhUVFBTUHJpdmF0ZUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBwcml2YXRlS2V5VmFsdWUgPSByZXN1bHQuZGF0YS5XRUJIVFRQU1ByaXZhdGVLZXk7XG4gICAgICAgICAgICAvLyBJZiB0aGUgZmllbGQgaXMgZW1wdHkgb3IgY29udGFpbnMgdGhlIGhpZGRlbiBwYXNzd29yZCwgZG9uJ3Qgc2VuZCBpdFxuICAgICAgICAgICAgaWYgKHByaXZhdGVLZXlWYWx1ZSA9PT0gJycgfHwgcHJpdmF0ZUtleVZhbHVlID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuV0VCSFRUUFNQcml2YXRlS2V5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2FtZSBmb3IgcHVibGljIGtleSAtIGRvbid0IHNlbmQgZW1wdHkgdmFsdWVzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5XRUJIVFRQU1B1YmxpY0tleSAhPT0gdW5kZWZpbmVkICYmIHJlc3VsdC5kYXRhLldFQkhUVFBTUHVibGljS2V5ID09PSAnJykge1xuICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLldFQkhUVFBTUHVibGljS2V5O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgdW5uZWNlc3NhcnkgZmllbGRzIGJlZm9yZSBzZW5kaW5nXG4gICAgICAgIGNvbnN0IGZpZWxkc1RvUmVtb3ZlID0gW1xuICAgICAgICAgICAgJ2RpcnJ0eScsXG4gICAgICAgICAgICAnZGVsZXRlQWxsSW5wdXQnLFxuICAgICAgICBdO1xuXG4gICAgICAgIC8vIFJlbW92ZSBjb2RlY18qIGZpZWxkcyAodGhleSdyZSByZXBsYWNlZCB3aXRoIHRoZSBjb2RlY3MgYXJyYXkpXG4gICAgICAgIE9iamVjdC5rZXlzKHJlc3VsdC5kYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2NvZGVjXycpIHx8IGZpZWxkc1RvUmVtb3ZlLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB3ZSBzaG91bGQgcHJvY2VzcyBjb2RlY3NcbiAgICAgICAgLy8gV2hlbiBzZW5kT25seUNoYW5nZWQgaXMgZW5hYmxlZCwgb25seSBwcm9jZXNzIGNvZGVjcyBpZiB0aGV5IHdlcmUgYWN0dWFsbHkgY2hhbmdlZFxuICAgICAgICBjb25zdCBzaG91bGRQcm9jZXNzQ29kZWNzID0gIUZvcm0uc2VuZE9ubHlDaGFuZ2VkIHx8IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkO1xuXG4gICAgICAgIGlmIChzaG91bGRQcm9jZXNzQ29kZWNzKSB7XG4gICAgICAgICAgICAvLyBDb2xsZWN0IGFsbCBjb2RlYyBkYXRhIHdoZW4gdGhleSd2ZSBiZWVuIGNoYW5nZWRcbiAgICAgICAgICAgIGNvbnN0IGFyckNvZGVjcyA9IFtdO1xuXG4gICAgICAgICAgICAvLyBQcm9jZXNzIGFsbCBjb2RlYyByb3dzXG4gICAgICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlIC5jb2RlYy1yb3csICN2aWRlby1jb2RlY3MtdGFibGUgLmNvZGVjLXJvdycpLmVhY2goKGN1cnJlbnRJbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29kZWNOYW1lID0gJChvYmopLmF0dHIoJ2RhdGEtY29kZWMtbmFtZScpO1xuICAgICAgICAgICAgICAgIGlmIChjb2RlY05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudERpc2FibGVkID0gJChvYmopLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyB1bmNoZWNrZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICBhcnJDb2RlY3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjb2RlY05hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogY3VycmVudERpc2FibGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IGN1cnJlbnRJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluY2x1ZGUgY29kZWNzIGlmIHRoZXkgd2VyZSBjaGFuZ2VkIG9yIHNlbmRPbmx5Q2hhbmdlZCBpcyBmYWxzZVxuICAgICAgICAgICAgaWYgKGFyckNvZGVjcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29kZWNzID0gYXJyQ29kZWNzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBIYW5kbGVzIFJFU1QgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAkKFwiI2Vycm9yLW1lc3NhZ2VzXCIpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlOiB7IHJlc3VsdDogYm9vbCwgZGF0YToge30sIG1lc3NhZ2VzOiB7fSB9XG4gICAgICAgIGlmICghcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYXNzd29yZCBmaWVsZHMgdG8gaGlkZGVuIHZhbHVlIG9uIHN1Y2Nlc3NcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHBhc3N3b3JkIHZhbGlkYXRpb24gd2FybmluZ3MgYWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlXG4gICAgICAgICAgICAkKCcucGFzc3dvcmQtdmFsaWRhdGUnKS5mYWRlT3V0KDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBkZWxldGUgYWxsIGNvbmRpdGlvbnMgaWYgbmVlZGVkXG4gICAgICAgIGlmICh0eXBlb2YgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNoZWNrRGVsZXRlQ29uZGl0aW9ucygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGVycm9yIG1lc3NhZ2UgSFRNTCBmcm9tIFJFU1QgQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlIHdpdGggZXJyb3IgbWVzc2FnZXNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBjb25zdCAkZGl2ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndWkgbmVnYXRpdmUgbWVzc2FnZScsIGlkOiAnZXJyb3ItbWVzc2FnZXMnIH0pO1xuICAgICAgICAgICAgY29uc3QgJGhlYWRlciA9ICQoJzxkaXY+JywgeyBjbGFzczogJ2hlYWRlcicgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuZ3NfRXJyb3JTYXZlU2V0dGluZ3MpO1xuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJGhlYWRlcik7XG4gICAgICAgICAgICBjb25zdCAkdWwgPSAkKCc8dWw+JywgeyBjbGFzczogJ2xpc3QnIH0pO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZXNTZXQgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIGVycm9yIGFuZCB2YWxpZGF0aW9uIG1lc3NhZ2UgdHlwZXNcbiAgICAgICAgICAgIFsnZXJyb3InLCAndmFsaWRhdGlvbiddLmZvckVhY2gobXNnVHlwZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzID0gQXJyYXkuaXNBcnJheShyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSkgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdIFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBbcmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV1dO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXMuZm9yRWFjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGV4dENvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmIGVycm9yLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGdsb2JhbFRyYW5zbGF0ZVtlcnJvci5tZXNzYWdlXSB8fCBlcnJvci5tZXNzYWdlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGdsb2JhbFRyYW5zbGF0ZVtlcnJvcl0gfHwgZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbWVzc2FnZXNTZXQuaGFzKHRleHRDb250ZW50KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzU2V0LmFkZCh0ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHVsLmFwcGVuZCgkKCc8bGk+JykudGV4dCh0ZXh0Q29udGVudCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJHVsKTtcbiAgICAgICAgICAgICQoJyNzdWJtaXRidXR0b24nKS5iZWZvcmUoJGRpdik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgdmFsaWRhdGlvbiBydWxlcyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRSdWxlcygpIHtcbiAgICAgICAgLy8gU1NIUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcztcbiAgICAgICAgfSBlbHNlIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdlYkFkbWluUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuV2ViQWRtaW5QYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkud2ViQWRtaW5QYXNzd29yZFJ1bGVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBjZXJ0aWZpY2F0ZSBkZXRhaWxzIEhUTUxcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY2VydEluZm8gLSBDZXJ0aWZpY2F0ZSBpbmZvcm1hdGlvbiBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGZvciBjZXJ0aWZpY2F0ZSBkZXRhaWxzXG4gICAgICovXG4gICAgcmVuZGVyQ2VydGlmaWNhdGVEZXRhaWxzKGNlcnRJbmZvKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJjZXJ0LWRldGFpbHNcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTsgbWFyZ2luLXRvcDoxMHB4O1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHRpbnkgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJqZWN0XG4gICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+U3ViamVjdDo8L3N0cm9uZz4gJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjZXJ0SW5mby5zdWJqZWN0KX08L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJc3N1ZXJcbiAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3Vlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPklzc3Vlcjo8L3N0cm9uZz4gJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjZXJ0SW5mby5pc3N1ZXIpfWA7XG4gICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICcgPHNwYW4gY2xhc3M9XCJ1aSB0aW55IGxhYmVsXCI+U2VsZi1zaWduZWQ8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkaXR5IHBlcmlvZFxuICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfZnJvbSAmJiBjZXJ0SW5mby52YWxpZF90bykge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPlZhbGlkOjwvc3Ryb25nPiAke2NlcnRJbmZvLnZhbGlkX2Zyb219IHRvICR7Y2VydEluZm8udmFsaWRfdG99PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXhwaXJ5IHN0YXR1c1xuICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgcmVkIGxhYmVsXCI+Q2VydGlmaWNhdGUgRXhwaXJlZDwvc3Bhbj48L2Rpdj4nO1xuICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5IDw9IDMwKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSB5ZWxsb3cgbGFiZWxcIj5FeHBpcmVzIGluICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXM8L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IGdyZWVuIGxhYmVsXCI+VmFsaWQgZm9yICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXM8L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3ViamVjdCBBbHRlcm5hdGl2ZSBOYW1lc1xuICAgICAgICBpZiAoY2VydEluZm8uc2FuICYmIGNlcnRJbmZvLnNhbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+QWx0ZXJuYXRpdmUgTmFtZXM6PC9zdHJvbmc+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGxpc3RcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OjEwcHg7XCI+JztcbiAgICAgICAgICAgIGNlcnRJbmZvLnNhbi5mb3JFYWNoKHNhbiA9PiB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj4ke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKHNhbil9PC9kaXY+YDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2UgbGlzdFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBzZWdtZW50XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIGNlcnQtZGV0YWlsc1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIEFNSS9BSkFNIGRlcGVuZGVuY3lcbiAgICAgKiBBSkFNIHJlcXVpcmVzIEFNSSB0byBiZSBlbmFibGVkIHNpbmNlIGl0J3MgYW4gSFRUUCB3cmFwcGVyIG92ZXIgQU1JXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFNSUFKQU1EZXBlbmRlbmN5KCkge1xuICAgICAgICBjb25zdCAkYW1pQ2hlY2tib3ggPSAkKCcjQU1JRW5hYmxlZCcpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0ICRhamFtQ2hlY2tib3ggPSAkKCcjQUpBTUVuYWJsZWQnKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRhbWlDaGVja2JveC5sZW5ndGggPT09IDAgfHwgJGFqYW1DaGVja2JveC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRnVuY3Rpb24gdG8gdXBkYXRlIEFKQU0gc3RhdGUgYmFzZWQgb24gQU1JIHN0YXRlXG4gICAgICAgIGNvbnN0IHVwZGF0ZUFKQU1TdGF0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlzQU1JRW5hYmxlZCA9ICRhbWlDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWlzQU1JRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIElmIEFNSSBpcyBkaXNhYmxlZCwgZGlzYWJsZSBBSkFNIGFuZCBtYWtlIGl0IHJlYWQtb25seVxuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCB0b29sdGlwIHRvIGV4cGxhaW4gd2h5IGl0J3MgZGlzYWJsZWRcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmF0dHIoJ2RhdGEtdG9vbHRpcCcsIGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNUmVxdWlyZXNBTUkgfHwgJ0FKQU0gcmVxdWlyZXMgQU1JIHRvIGJlIGVuYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmF0dHIoJ2RhdGEtcG9zaXRpb24nLCAndG9wIGxlZnQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgQU1JIGlzIGVuYWJsZWQsIGFsbG93IEFKQU0gdG8gYmUgdG9nZ2xlZFxuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3gucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5yZW1vdmVBdHRyKCdkYXRhLXRvb2x0aXAnKTtcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LnJlbW92ZUF0dHIoJ2RhdGEtcG9zaXRpb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWwgc3RhdGVcbiAgICAgICAgdXBkYXRlQUpBTVN0YXRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMaXN0ZW4gZm9yIEFNSSBjaGVja2JveCBjaGFuZ2VzIHVzaW5nIGV2ZW50IGRlbGVnYXRpb25cbiAgICAgICAgLy8gVGhpcyB3b24ndCBvdmVycmlkZSBleGlzdGluZyBoYW5kbGVyc1xuICAgICAgICAkKCcjQU1JRW5hYmxlZCcpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHVwZGF0ZUFKQU1TdGF0ZSgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFBCWExhbmd1YWdlIGNoYW5nZSBkZXRlY3Rpb24gZm9yIHJlc3RhcnQgd2FybmluZ1xuICAgICAqIFNob3dzIHJlc3RhcnQgd2FybmluZyBvbmx5IHdoZW4gdGhlIGxhbmd1YWdlIHZhbHVlIGNoYW5nZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nKCkge1xuICAgICAgICBjb25zdCAkbGFuZ3VhZ2VJbnB1dCA9ICQoJyNQQlhMYW5ndWFnZScpOyAgLy8gSGlkZGVuIGlucHV0XG4gICAgICAgIGNvbnN0ICRsYW5ndWFnZURyb3Bkb3duID0gJCgnI1BCWExhbmd1YWdlLWRyb3Bkb3duJyk7ICAvLyBWNS4wIHBhdHRlcm4gZHJvcGRvd25cbiAgICAgICAgY29uc3QgJHJlc3RhcnRXYXJuaW5nID0gJCgnI3Jlc3RhcnQtd2FybmluZy1QQlhMYW5ndWFnZScpO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHZhbHVlIGFuZCBkYXRhIGxvYWRlZCBmbGFnXG4gICAgICAgIGxldCBvcmlnaW5hbFZhbHVlID0gbnVsbDtcbiAgICAgICAgbGV0IGlzRGF0YUxvYWRlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIEhpZGUgd2FybmluZyBpbml0aWFsbHlcbiAgICAgICAgJHJlc3RhcnRXYXJuaW5nLmhpZGUoKTtcblxuICAgICAgICAvLyBTZXQgb3JpZ2luYWwgdmFsdWUgYWZ0ZXIgZGF0YSBsb2Fkc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignR2VuZXJhbFNldHRpbmdzLmRhdGFMb2FkZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBvcmlnaW5hbFZhbHVlID0gJGxhbmd1YWdlSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBpc0RhdGFMb2FkZWQgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZHJvcGRvd24gY2hhbmdlIGV2ZW50IC0gdXNlIFY1LjAgZHJvcGRvd24gc2VsZWN0b3JcbiAgICAgICAgJGxhbmd1YWdlRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNlbWFudGljVUlEcm9wZG93biBhdXRvbWF0aWNhbGx5IHN5bmNzIGhpZGRlbiBpbnB1dCB2YWx1ZVxuICAgICAgICAgICAgICAgIC8vIE5vIG5lZWQgdG8gbWFudWFsbHkgdXBkYXRlICRsYW5ndWFnZUlucHV0XG5cbiAgICAgICAgICAgICAgICAvLyBPbmx5IHNob3cgd2FybmluZyBhZnRlciBkYXRhIGlzIGxvYWRlZCBhbmQgdmFsdWUgY2hhbmdlZCBmcm9tIG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgaWYgKGlzRGF0YUxvYWRlZCAmJiBvcmlnaW5hbFZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSBvcmlnaW5hbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICRyZXN0YXJ0V2FybmluZy50cmFuc2l0aW9uKCdmYWRlIGluJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0RhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJlc3RhcnRXYXJuaW5nLnRyYW5zaXRpb24oJ2ZhZGUgb3V0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gb25seSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGlmIChpc0RhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIFJFU1QgQVBJIG1vZGVcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBHZW5lcmFsU2V0dGluZ3NBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlU2V0dGluZ3MnO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb24gZm9yIGNsZWFuZXIgQVBJIHJlcXVlc3RzXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIEVuYWJsZSBzZW5kaW5nIG9ubHkgY2hhbmdlZCBmaWVsZHMgZm9yIG9wdGltYWwgUEFUQ0ggc2VtYW50aWNzXG4gICAgICAgIEZvcm0uc2VuZE9ubHlDaGFuZ2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBObyByZWRpcmVjdCBhZnRlciBzYXZlIC0gc3RheSBvbiB0aGUgc2FtZSBwYWdlXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IG51bGw7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBudWxsO1xuICAgICAgICBGb3JtLnVybCA9IGAjYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZ2VuZXJhbFNldHRpbmdzIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=