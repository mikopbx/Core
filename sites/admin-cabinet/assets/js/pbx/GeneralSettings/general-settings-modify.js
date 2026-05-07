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

/* global globalRootUrl,globalTranslate, Form, PasswordScore, PbxApi, UserMessage, SoundFileSelector, GeneralSettingsAPI, ClipboardJS, PasswordWidget, PasswordsAPI, GeneralSettingsTooltipManager, $ */

/**
 * A module to handle modification of general settings.
 */
var generalSettingsModify = {
  /**
   * jQuery object for the form.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * jQuery object for the web admin password input field.
   * @type {jQuery}
   */
  $webAdminPassword: null,

  /**
   * jQuery object for the ssh password input field.
   * @type {jQuery}
   */
  $sshPassword: null,

  /**
   * jQuery object for the web ssh password input field.
   * @type {jQuery}
   */
  $disableSSHPassword: null,

  /**
   * jQuery object for the SSH password fields
   * @type {jQuery}
   */
  $sshPasswordSegment: null,

  /**
   * If password set, it will be hided from web ui.
   */
  hiddenPassword: '********',

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
    generalSettingsModify.$formObj = $('#general-settings-form');
    generalSettingsModify.$webAdminPassword = $('#WebAdminPassword');
    generalSettingsModify.$sshPassword = $('#SSHPassword');
    generalSettingsModify.$disableSSHPassword = $('#SSHDisablePasswordLogins').parent('.checkbox');
    generalSettingsModify.$sshPasswordSegment = $('#only-if-password-enabled'); // Initialize password widgets
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
        var warningHtml = "\n                    <div class=\"ui negative icon message password-validate\">\n                        <i class=\"exclamation triangle icon\"></i>\n                        <div class=\"content\">\n                            <div class=\"header\">".concat(globalTranslate.psw_SetPassword, "</div>\n                            <p>").concat(globalTranslate.psw_ChangeDefaultPassword, "</p>\n                        </div>\n                    </div>\n                "); // Insert warning before the password fields

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
          var _warningHtml = "\n                        <div class=\"ui negative icon message password-validate\">\n                            <i class=\"exclamation triangle icon\"></i>\n                            <div class=\"content\">\n                                <div class=\"header\">".concat(globalTranslate.psw_SetPassword, "</div>\n                                <p>").concat(globalTranslate.psw_ChangeDefaultPassword, "</p>\n                            </div>\n                        </div>\n                    "); // Insert warning before the SSH password fields


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

        var displayHtml = "\n                    <div class=\"ui action input fluid cert-display ".concat(statusClass, "\">\n                        <input type=\"text\" value=\"").concat(generalSettingsModify.escapeHtml(displayText), "\" readonly class=\"truncated-display\" />\n                        <button class=\"ui button icon basic copy-btn\" data-clipboard-text=\"").concat(generalSettingsModify.escapeHtml(fullValue), "\"\n                                data-variation=\"basic\" data-content=\"").concat(globalTranslate.bt_ToolTipCopyCert, "\">\n                            <i class=\"copy icon blue\"></i>\n                        </button>\n                        <button class=\"ui button icon basic info-cert-btn\"\n                                data-content=\"").concat(globalTranslate.bt_ToolTipCertInfo, "\">\n                            <i class=\"info circle icon blue\"></i>\n                        </button>\n                        <button class=\"ui button icon basic edit-btn\"\n                                data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                            <i class=\"edit icon blue\"></i>\n                        </button>\n                        <button class=\"ui button icon basic delete-cert-btn\"\n                                data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                            <i class=\"trash icon red\"></i>\n                        </button>\n                    </div>\n                    ").concat(certInfo && !certInfo.error ? generalSettingsModify.renderCertificateDetails(certInfo) : '', "\n                    <div class=\"ui form cert-edit-form\" style=\"display:none;\">\n                        <div class=\"field\">\n                            <textarea id=\"WEBHTTPSPublicKey_edit\" \n                                      rows=\"10\" \n                                      placeholder=\"").concat(globalTranslate.gs_PastePublicCert, "\">").concat(fullValue, "</textarea>\n                        </div>\n                        <div class=\"ui mini buttons\">\n                            <button class=\"ui positive button save-cert-btn\">\n                                <i class=\"check icon\"></i> ").concat(globalTranslate.bt_Save, "\n                            </button>\n                            <button class=\"ui button cancel-cert-btn\">\n                                <i class=\"close icon\"></i> ").concat(globalTranslate.bt_Cancel, "\n                            </button>\n                        </div>\n                    </div>\n                ");
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

          $certPubKeyField.val(newValue); // Clear certificate info to force re-parsing
          // WHY: User is changing certificate, info needs to be updated

          $certPubKeyField.data('cert-info', {}); // Trigger form validation

          if (typeof Form !== 'undefined' && Form.checkValues) {
            Form.checkValues();
          } // Re-initialize both certificate fields
          // WHY: When user changes public cert, private key field state may need update


          generalSettingsModify.initializeTruncatedFields();
        }); // Handle cancel button

        $container.find('.cancel-cert-btn').on('click', function (e) {
          e.preventDefault();
          $container.find('.cert-edit-form').hide();
          $container.find('.cert-display').show();
        }); // Handle delete button

        $container.find('.delete-cert-btn').on('click', function (e) {
          e.preventDefault(); // Clear the certificate

          $certPubKeyField.val(''); // Clear certificate info data attribute
          // WHY: When certificate is deleted, private key state should also update

          $certPubKeyField.data('cert-info', {}); // Trigger form validation

          if (typeof Form !== 'undefined' && Form.checkValues) {
            Form.checkValues();
          } // Re-initialize both certificate fields to show empty state
          // WHY: Deleting public cert should also reset private key display


          generalSettingsModify.initializeTruncatedFields();
        }); // Initialize tooltips

        $container.find('[data-content]').popup(); // Re-initialize clipboard for new buttons

        if (generalSettingsModify.clipboard) {
          generalSettingsModify.clipboard.destroy();
          generalSettingsModify.initializeClipboard();
        }
      } else {
        // Show the original field for input with proper placeholder
        $certPubKeyField.show();
        $certPubKeyField.attr('placeholder', globalTranslate.gs_PastePublicCert);
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
        var displayHtml = "\n                    <div class=\"ui action input fluid ssh-key-display\">\n                        <input type=\"text\" value=\"".concat(truncated, "\" readonly class=\"truncated-display\" />\n                        <button class=\"ui button icon basic copy-btn\" data-clipboard-text=\"").concat(generalSettingsModify.escapeHtml(fullValue), "\" \n                                data-variation=\"basic\" data-content=\"").concat(globalTranslate.bt_ToolTipCopyKey, "\">\n                            <i class=\"copy icon blue\"></i>\n                        </button>\n                        <button class=\"ui button icon basic expand-btn\" \n                                data-content=\"").concat(globalTranslate.bt_ToolTipExpand, "\">\n                            <i class=\"expand icon blue\"></i>\n                        </button>\n                    </div>\n                    <textarea class=\"full-display\" style=\"display:none;\" readonly>").concat(fullValue, "</textarea>\n                ");
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
        $sshPubKeyField.attr('placeholder', globalTranslate.gs_NoSSHPublicKey);
      }
    } // Handle WEBHTTPSPublicKey field - use dedicated method


    generalSettingsModify.initializeCertificateField(); // Handle WEBHTTPSPrivateKey field (write-only with password masking)

    var $certPrivKeyField = $('#WEBHTTPSPrivateKey');

    if ($certPrivKeyField.length) {
      var _$container = $certPrivKeyField.parent(); // Remove any existing display elements


      _$container.find('.private-key-set, .private-key-system-managed, #WEBHTTPSPrivateKey_new').remove(); // Get certificate info to check for private key existence


      var $certPubKeyField = $('#WEBHTTPSPublicKey');
      var certInfo = $certPubKeyField.data('cert-info') || {}; // Check if private key exists
      // WHY: has_private_key can be true even if field is empty (self-signed certs in files)

      var currentValue = $certPrivKeyField.val();
      var hasValueInDb = currentValue === generalSettingsModify.hiddenPassword;
      var hasValueInFiles = certInfo.has_private_key || false;
      var isSelfSigned = certInfo.is_self_signed || false; // Check if public certificate was modified locally (not saved yet)
      // WHY: If cert was changed locally, cert-info is outdated - allow private key input

      var publicKeyValue = $certPubKeyField.val() || '';
      var publicKeyModified = publicKeyValue && !certInfo.subject; // No parsed info = modified locally

      if (publicKeyModified) {
        // Public certificate was modified locally - show private key input field
        // WHY: User is changing certificate, needs to provide matching private key
        $certPrivKeyField.show();
        $certPrivKeyField.attr('placeholder', globalTranslate.gs_PastePrivateKey);
        $certPrivKeyField.attr('rows', '10'); // Ensure change events trigger form validation

        $certPrivKeyField.off('input.priv change.priv keyup.priv').on('input.priv change.priv keyup.priv', function () {
          if (typeof Form !== 'undefined' && Form.checkValues) {
            Form.checkValues();
          }
        });
      } else if (hasValueInDb) {
        // User-provided certificate with private key in database
        // Keep hiddenPassword value in original field and hide it
        // This ensures the field won't be sent during form submission
        $certPrivKeyField.val(generalSettingsModify.hiddenPassword);
        $certPrivKeyField.hide();

        var _displayHtml = "\n                    <div class=\"ui info message private-key-set\">\n                        <p>\n                            <i class=\"lock icon\"></i>\n                            ".concat(globalTranslate.gs_PrivateKeyIsSet, "\n                            <a href=\"#\" class=\"replace-key-link\">").concat(globalTranslate.gs_Replace, "</a>\n                        </p>\n                    </div>\n                    <textarea id=\"WEBHTTPSPrivateKey_new\"\n                              rows=\"10\"\n                              style=\"display:none;\"\n                              placeholder=\"").concat(globalTranslate.gs_PastePrivateKey, "\"></textarea>\n                ");

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
      } else if (isSelfSigned && hasValueInFiles) {
        // Self-signed certificate with system-managed private key
        // WHY: Private key exists in files but not in database (auto-generated)
        $certPrivKeyField.hide();

        var _displayHtml2 = "\n                    <div class=\"ui info message private-key-system-managed\">\n                        <p>\n                            <i class=\"lock icon\"></i>\n                            ".concat(globalTranslate.gs_SystemManagedPrivateKey || 'System-managed private key (auto-generated with certificate)', "\n                        </p>\n                    </div>\n                ");

        _$container.append(_displayHtml2);
      } else {
        // Show the original field for input with proper placeholder
        $certPrivKeyField.show();
        $certPrivKeyField.attr('placeholder', globalTranslate.gs_PastePrivateKey);
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
      UserMessage.showError(globalTranslate.gs_CopyFailed);
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
    var result = settings; // Handle all password/key fields that use hiddenPassword indicator
    // Remove any field with hiddenPassword value to prevent overwriting with empty values

    Object.keys(result.data).forEach(function (key) {
      if (result.data[key] === generalSettingsModify.hiddenPassword) {
        delete result.data[key];
      }
    }); // For fields with empty string '' - they will be sent to allow clearing values on server
    // This is intentional behavior for certificate/key fields
    // Clean up unnecessary fields before sending

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
              textContent = globalTranslate[error.message];
            } else {
              textContent = globalTranslate[error];
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

        $ajamCheckbox.attr('data-tooltip', globalTranslate.gs_AJAMRequiresAMI);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkd2ViQWRtaW5QYXNzd29yZCIsIiRzc2hQYXNzd29yZCIsIiRkaXNhYmxlU1NIUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmRTZWdtZW50IiwiaGlkZGVuUGFzc3dvcmQiLCJzb3VuZEZpbGVGaWVsZHMiLCJhbm5vdW5jZW1lbnRJbiIsImFubm91bmNlbWVudE91dCIsIm9yaWdpbmFsQ29kZWNTdGF0ZSIsImNvZGVjc0NoYW5nZWQiLCJkYXRhTG9hZGVkIiwidmFsaWRhdGVSdWxlcyIsInBieG5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUiLCJXZWJBZG1pblBhc3N3b3JkIiwiV2ViQWRtaW5QYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJTU0hQYXNzd29yZCIsIlNTSFBhc3N3b3JkUmVwZWF0IiwiZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCIsIldFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlIiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCIsIldFQkhUVFBTUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0IiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJBSkFNUG9ydCIsImdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlIiwiU0lQQXV0aFByZWZpeCIsImdzX1NJUEF1dGhQcmVmaXhJbnZhbGlkIiwid2ViQWRtaW5QYXNzd29yZFJ1bGVzIiwiZ3NfVmFsaWRhdGVFbXB0eVdlYlBhc3N3b3JkIiwiZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQiLCJ2YWx1ZSIsImdzX1Bhc3N3b3JkcyIsInBzd19QYXNzd29yZE5vTG93U2ltdm9sIiwicHN3X1Bhc3N3b3JkTm9OdW1iZXJzIiwicHN3X1Bhc3N3b3JkTm9VcHBlclNpbXZvbCIsImFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcyIsImdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkIiwiZ3NfU1NIUGFzc3dvcmQiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcyIsImNsaXBib2FyZCIsImluaXRpYWxpemUiLCIkIiwicGFyZW50IiwibGVuZ3RoIiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwiY29udGV4dCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwidmFsaWRhdGVPbklucHV0Iiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwiY2hlY2tPbkxvYWQiLCJzc2hXaWRnZXQiLCJvbiIsImlzRGlzYWJsZWQiLCJjaGVja2JveCIsImhpZGVXYXJuaW5ncyIsImVsZW1lbnRzIiwiJHNjb3JlU2VjdGlvbiIsImhpZGUiLCJjaGVja1Bhc3N3b3JkIiwidmFsIiwiaW5pdFJ1bGVzIiwiZmluZCIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmciLCJub3QiLCJkcm9wZG93biIsImluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcyIsImluaXRpYWxpemVDbGlwYm9hcmQiLCJzaG93SGlkZVNTSFBhc3N3b3JkIiwid2luZG93IiwiZXZlbnQiLCJuYW1lVGFiIiwiR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJsb2FkRGF0YSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMiLCJGb3JtIiwic2hvd0xvYWRpbmdTdGF0ZSIsIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsInBhc3N3b3JkVmFsaWRhdGlvbiIsInNldFRpbWVvdXQiLCJzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MiLCJtZXNzYWdlcyIsImNvbnNvbGUiLCJlcnJvciIsInNob3dBcGlFcnJvciIsInNldHRpbmdzIiwiY29kZWNzIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJwb3B1bGF0ZVNwZWNpYWxGaWVsZHMiLCJsb2FkU291bmRGaWxlVmFsdWVzIiwidXBkYXRlQ29kZWNUYWJsZXMiLCJpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNzaEtleXNUYWJsZSIsImRvY3VtZW50IiwidHJpZ2dlciIsIldFQkhUVFBTUHVibGljS2V5X2luZm8iLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsIiRjaGVja2JveCIsImlzQ2hlY2tlZCIsIiRkcm9wZG93biIsImhhc0NsYXNzIiwiZm9ybSIsImVycm9yTWVzc2FnZSIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInZhbGlkYXRpb24iLCJyZW1vdmUiLCJpc0RlZmF1bHRXZWJQYXNzd29yZCIsIiR3ZWJQYXNzd29yZEZpZWxkcyIsImNsb3Nlc3QiLCJ3YXJuaW5nSHRtbCIsInBzd19TZXRQYXNzd29yZCIsInBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmQiLCJiZWZvcmUiLCJpc0RlZmF1bHRTU0hQYXNzd29yZCIsInNzaFBhc3N3b3JkRGlzYWJsZWQiLCIkc3NoUGFzc3dvcmRGaWVsZHMiLCJkYXRhSW4iLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJkYXRhT3V0IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IiwiYXVkaW9Db2RlY3MiLCJmaWx0ZXIiLCJjIiwic29ydCIsImEiLCJiIiwicHJpb3JpdHkiLCJ2aWRlb0NvZGVjcyIsImJ1aWxkQ29kZWNUYWJsZSIsInNob3ciLCJpbml0aWFsaXplQ29kZWNEcmFnRHJvcCIsIiR0YWJsZUJvZHkiLCJlbXB0eSIsImNvZGVjIiwiaW5kZXgiLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGVja2VkIiwicm93SHRtbCIsImVzY2FwZUh0bWwiLCJkZXNjcmlwdGlvbiIsImFwcGVuZCIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkIiwiJGNlcnRQdWJLZXlGaWVsZCIsImZ1bGxWYWx1ZSIsIiRjb250YWluZXIiLCJjZXJ0SW5mbyIsImRpc3BsYXlUZXh0IiwicGFydHMiLCJzdWJqZWN0IiwicHVzaCIsImlzc3VlciIsImlzX3NlbGZfc2lnbmVkIiwidmFsaWRfdG8iLCJpc19leHBpcmVkIiwiZGF5c191bnRpbF9leHBpcnkiLCJ0cnVuY2F0ZUNlcnRpZmljYXRlIiwic3RhdHVzQ2xhc3MiLCJkaXNwbGF5SHRtbCIsImJ0X1Rvb2xUaXBDb3B5Q2VydCIsImJ0X1Rvb2xUaXBDZXJ0SW5mbyIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsInJlbmRlckNlcnRpZmljYXRlRGV0YWlscyIsImdzX1Bhc3RlUHVibGljQ2VydCIsImJ0X1NhdmUiLCJidF9DYW5jZWwiLCJlIiwicHJldmVudERlZmF1bHQiLCIkZGV0YWlscyIsInNsaWRlVG9nZ2xlIiwiZm9jdXMiLCJuZXdWYWx1ZSIsImNoZWNrVmFsdWVzIiwicG9wdXAiLCJkZXN0cm95IiwiYXR0ciIsIm9mZiIsIiRzc2hQdWJLZXlGaWVsZCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiYnRfVG9vbFRpcENvcHlLZXkiLCJidF9Ub29sVGlwRXhwYW5kIiwiJGZ1bGxEaXNwbGF5IiwiJHRydW5jYXRlZERpc3BsYXkiLCIkaWNvbiIsImlzIiwiYWRkQ2xhc3MiLCJnc19Ob1NTSFB1YmxpY0tleSIsIiRjZXJ0UHJpdktleUZpZWxkIiwiY3VycmVudFZhbHVlIiwiaGFzVmFsdWVJbkRiIiwiaGFzVmFsdWVJbkZpbGVzIiwiaGFzX3ByaXZhdGVfa2V5IiwiaXNTZWxmU2lnbmVkIiwicHVibGljS2V5VmFsdWUiLCJwdWJsaWNLZXlNb2RpZmllZCIsImdzX1Bhc3RlUHJpdmF0ZUtleSIsImdzX1ByaXZhdGVLZXlJc1NldCIsImdzX1JlcGxhY2UiLCIkbmV3RmllbGQiLCJnc19TeXN0ZW1NYW5hZ2VkUHJpdmF0ZUtleSIsIkNsaXBib2FyZEpTIiwiJGJ0biIsIm9yaWdpbmFsSWNvbiIsImNsZWFyU2VsZWN0aW9uIiwiZ3NfQ29weUZhaWxlZCIsInNwbGl0Iiwia2V5VHlwZSIsImtleURhdGEiLCJjb21tZW50Iiwic2xpY2UiLCJzdWJzdHJpbmciLCJ0cmltIiwiY2VydCIsImxpbmVzIiwibGluZSIsImZpcnN0TGluZSIsImxhc3RMaW5lIiwiaW5jbHVkZXMiLCJjbGVhbkNlcnQiLCJyZXBsYWNlIiwidGV4dCIsIm1hcCIsIm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwiZmllbGRzVG9SZW1vdmUiLCJzdGFydHNXaXRoIiwic2hvdWxkUHJvY2Vzc0NvZGVjcyIsInNlbmRPbmx5Q2hhbmdlZCIsImFyckNvZGVjcyIsImVhY2giLCJjdXJyZW50SW5kZXgiLCJvYmoiLCJjb2RlY05hbWUiLCJjdXJyZW50RGlzYWJsZWQiLCJjYkFmdGVyU2VuZEZvcm0iLCIkc3VibWl0QnV0dG9uIiwiZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sIiwiZmFkZU91dCIsImdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCIsImNoZWNrRGVsZXRlQ29uZGl0aW9ucyIsIiRkaXYiLCJpZCIsIiRoZWFkZXIiLCJnc19FcnJvclNhdmVTZXR0aW5ncyIsIiR1bCIsIm1lc3NhZ2VzU2V0IiwiU2V0IiwibXNnVHlwZSIsInRleHRDb250ZW50IiwibWVzc2FnZSIsImhhcyIsImFkZCIsImh0bWwiLCJ2YWxpZF9mcm9tIiwic2FuIiwiJGFtaUNoZWNrYm94IiwiJGFqYW1DaGVja2JveCIsInVwZGF0ZUFKQU1TdGF0ZSIsImlzQU1JRW5hYmxlZCIsImdzX0FKQU1SZXF1aXJlc0FNSSIsInJlbW92ZUF0dHIiLCIkbGFuZ3VhZ2VJbnB1dCIsIiRsYW5ndWFnZURyb3Bkb3duIiwiJHJlc3RhcnRXYXJuaW5nIiwib3JpZ2luYWxWYWx1ZSIsImlzRGF0YUxvYWRlZCIsInRyYW5zaXRpb24iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ1cmwiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBR0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEscUJBQXFCLEdBQUc7QUFDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFOZ0I7O0FBUTFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLElBWk87O0FBYzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVks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QUE5QixDQU5hLENBUWI7O0FBQ0FoTyxJQUFBQSxJQUFJLENBQUNpTyx1QkFBTCxHQUErQixJQUEvQixDQVRhLENBV2I7O0FBQ0FqTyxJQUFBQSxJQUFJLENBQUNxTCxlQUFMLEdBQXVCLElBQXZCLENBWmEsQ0FjYjs7QUFDQXJMLElBQUFBLElBQUksQ0FBQ2tPLG1CQUFMLEdBQTJCLElBQTNCO0FBQ0FsTyxJQUFBQSxJQUFJLENBQUNtTyxvQkFBTCxHQUE0QixJQUE1QjtBQUNBbk8sSUFBQUEsSUFBSSxDQUFDb08sR0FBTDtBQUVBcE8sSUFBQUEsSUFBSSxDQUFDcEYsYUFBTCxHQUFxQmIscUJBQXFCLENBQUNhLGFBQTNDO0FBQ0FvRixJQUFBQSxJQUFJLENBQUNpTCxnQkFBTCxHQUF3QmxSLHFCQUFxQixDQUFDa1IsZ0JBQTlDO0FBQ0FqTCxJQUFBQSxJQUFJLENBQUM0TCxlQUFMLEdBQXVCN1IscUJBQXFCLENBQUM2UixlQUE3QztBQUNBNUwsSUFBQUEsSUFBSSxDQUFDM0MsVUFBTDtBQUNIO0FBdmdEeUIsQ0FBOUIsQyxDQTBnREE7O0FBQ0FDLENBQUMsQ0FBQ3VFLFFBQUQsQ0FBRCxDQUFZd00sS0FBWixDQUFrQixZQUFNO0FBQ3BCdFUsRUFBQUEscUJBQXFCLENBQUNzRCxVQUF0QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGFzc3dvcmRTY29yZSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSwgU291bmRGaWxlU2VsZWN0b3IsIEdlbmVyYWxTZXR0aW5nc0FQSSwgQ2xpcGJvYXJkSlMsIFBhc3N3b3JkV2lkZ2V0LCBQYXNzd29yZHNBUEksIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyLCAkICovXG5cbi8qKlxuICogQSBtb2R1bGUgdG8gaGFuZGxlIG1vZGlmaWNhdGlvbiBvZiBnZW5lcmFsIHNldHRpbmdzLlxuICovXG5jb25zdCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgd2ViIGFkbWluIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHdlYkFkbWluUGFzc3dvcmQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3NoIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNzaFBhc3N3b3JkOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlzYWJsZVNTSFBhc3N3b3JkOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZFNlZ21lbnQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJZiBwYXNzd29yZCBzZXQsIGl0IHdpbGwgYmUgaGlkZWQgZnJvbSB3ZWIgdWkuXG4gICAgICovXG4gICAgaGlkZGVuUGFzc3dvcmQ6ICcqKioqKioqKicsXG5cbiAgICAvKipcbiAgICAgKiBTb3VuZCBmaWxlIGZpZWxkIElEc1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgc291bmRGaWxlRmllbGRzOiB7XG4gICAgICAgIGFubm91bmNlbWVudEluOiAnUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4nLFxuICAgICAgICBhbm5vdW5jZW1lbnRPdXQ6ICdQQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBPcmlnaW5hbCBjb2RlYyBzdGF0ZSBmcm9tIGxhc3QgbG9hZFxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgb3JpZ2luYWxDb2RlY1N0YXRlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgY29kZWNzIGhhdmUgYmVlbiBjaGFuZ2VkXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgY29kZWNzQ2hhbmdlZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHRyYWNrIGlmIGRhdGEgaGFzIGJlZW4gbG9hZGVkIGZyb20gQVBJXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgZGF0YUxvYWRlZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHsgLy8gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXNcbiAgICAgICAgcGJ4bmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1BCWE5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXZWJBZG1pblBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV2ViQWRtaW5QYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbV2ViQWRtaW5QYXNzd29yZF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgU1NIUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTU0hQYXNzd29yZFJlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hdGNoW1NTSFBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQlBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXRUJQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQkhUVFBTUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQkhUVFBTUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQkhUVFBTUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQlBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgQUpBTVBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdBSkFNUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFNJUEF1dGhQcmVmaXg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTSVBBdXRoUHJlZml4JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwWy9eW2EtekEtWl0qJC9dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeEludmFsaWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBSdWxlcyBmb3IgdGhlIHdlYiBhZG1pbiBwYXNzd29yZCBmaWVsZCB3aGVuIGl0IG5vdCBlcXVhbCB0byBoaWRkZW5QYXNzd29yZFxuICAgIHdlYkFkbWluUGFzc3dvcmRSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVdlYlBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW2Etel0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vVXBwZXJTaW12b2xcbiAgICAgICAgfVxuICAgIF0sXG4gICAgLy8gUnVsZXMgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGQgd2hlbiBTU0ggbG9naW4gdGhyb3VnaCB0aGUgcGFzc3dvcmQgZW5hYmxlZCwgYW5kIGl0IG5vdCBlcXVhbCB0byBoaWRkZW5QYXNzd29yZFxuICAgIGFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW2Etel0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vTnVtYmVyc1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW0EtWl0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vVXBwZXJTaW12b2xcbiAgICAgICAgfVxuICAgIF0sXG5cbiAgICAvLyBSdWxlcyBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZCB3aGVuIFNTSCBsb2dpbiB0aHJvdWdoIHRoZSBwYXNzd29yZCBkaXNhYmxlZFxuICAgIGFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQsXG4gICAgICAgIH1cbiAgICBdLFxuXG4gICAgLyoqXG4gICAgICogQ2xpcGJvYXJkIGluc3RhbmNlIGZvciBjb3B5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKiBAdHlwZSB7Q2xpcGJvYXJkSlN9XG4gICAgICovXG4gICAgY2xpcGJvYXJkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqICBJbml0aWFsaXplIG1vZHVsZSB3aXRoIGV2ZW50IGJpbmRpbmdzIGFuZCBjb21wb25lbnQgaW5pdGlhbGl6YXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iaiA9ICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0nKTtcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkID0gJCgnI1dlYkFkbWluUGFzc3dvcmQnKTtcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZCA9ICQoJyNTU0hQYXNzd29yZCcpO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZCA9ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudCA9ICQoJyNvbmx5LWlmLXBhc3N3b3JkLWVuYWJsZWQnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldHNcbiAgICAgICAgLy8gV2ViIEFkbWluIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC5pbml0KGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZCwge1xuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdnZW5lcmFsX3dlYicsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogZmFsc2UsICAgICAvLyBObyBzaG93L2hpZGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU1NIIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc3NoV2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLCB7XG4gICAgICAgICAgICAgICAgY29udGV4dDogJ2dlbmVyYWxfc3NoJyxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSwgICAgIC8vIE5vIHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgU1NIIGRpc2FibGUgY2hlY2tib3hcbiAgICAgICAgICAgICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuaGlkZVdhcm5pbmdzKHNzaFdpZGdldCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzc2hXaWRnZXQuZWxlbWVudHMuJHNjb3JlU2VjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3NoV2lkZ2V0LmVsZW1lbnRzLiRzY29yZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuY2hlY2tQYXNzd29yZChzc2hXaWRnZXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyB3aGVuIHBhc3N3b3JkcyBjaGFuZ2VcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUEJYTGFuZ3VhZ2UgZHJvcGRvd24gZmlyc3Qgd2l0aCBzcGVjaWFsIGhhbmRsZXJcbiAgICAgICAgLy8gTXVzdCBiZSBkb25lIGJlZm9yZSBnZW5lcmFsIGRyb3Bkb3duIGluaXRpYWxpemF0aW9uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nKCk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGRyb3Bkb3ducyBvbiB0aGUgZm9ybSAoZXhjZXB0IHNvdW5kIGZpbGUgc2VsZWN0b3JzIGFuZCBsYW5ndWFnZSBkcm9wZG93bilcbiAgICAgICAgLy8gTGFuZ3VhZ2UgZHJvcGRvd24gYWxyZWFkeSBpbml0aWFsaXplZCBhYm92ZSB3aXRoIHNwZWNpYWwgb25DaGFuZ2UgaGFuZGxlclxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5kcm9wZG93bicpXG4gICAgICAgICAgICAubm90KCcuYXVkaW8tbWVzc2FnZS1zZWxlY3QnKVxuICAgICAgICAgICAgLm5vdCgnI1BCWExhbmd1YWdlLWRyb3Bkb3duJylcbiAgICAgICAgICAgIC5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveGVzIG9uIHRoZSBmb3JtXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgQU1JL0FKQU0gZGVwZW5kZW5jeSBhZnRlciBjaGVja2JveGVzIGFyZSBpbml0aWFsaXplZFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUFNSUFKQU1EZXBlbmRlbmN5KCk7XG5cbiAgICAgICAgLy8gQ29kZWMgdGFibGUgZHJhZy1uLWRyb3Agd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKSB3aGljaCBpcyBjYWxsZWQgZnJvbSB1cGRhdGVDb2RlY1RhYmxlcygpXG5cbiAgICAgICAgLy8gU291bmQgZmlsZSBzZWxlY3RvcnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBSRVNUIEFQSSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgbG9hZFNvdW5kRmlsZVZhbHVlcygpIG1ldGhvZCBjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RlOiBTU0gga2V5cyB0YWJsZSB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgbG9hZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyBkaXNwbGF5XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgY29weSBidXR0b25zXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhZGRpdGlvbmFsIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuXG4gICAgICAgIC8vIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goe1xuICAgICAgICAgICAgJ29uQ2hhbmdlJzogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmRcbiAgICAgICAgfSk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIHRvIGhhbmRsZSB0YWIgYWN0aXZhdGlvblxuICAgICAgICAkKHdpbmRvdykub24oJ0dTLUFjdGl2YXRlVGFiJywgKGV2ZW50LCBuYW1lVGFiKSA9PiB7XG4gICAgICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoJ2NoYW5nZSB0YWInLCBuYW1lVGFiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBpZiAodHlwZW9mIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVG9vbHRpcCBjbGljayBiZWhhdmlvciBpcyBub3cgaGFuZGxlZCBnbG9iYWxseSBpbiBUb29sdGlwQnVpbGRlci5qc1xuXG4gICAgICAgIC8vIFBCWExhbmd1YWdlIGRyb3Bkb3duIHdpdGggcmVzdGFydCB3YXJuaW5nIGFscmVhZHkgaW5pdGlhbGl6ZWQgYWJvdmVcblxuICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSBBUEkgaW5zdGVhZCBvZiB1c2luZyBzZXJ2ZXItcmVuZGVyZWQgdmFsdWVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggcGxheWJhY2sgZnVuY3Rpb25hbGl0eSB1c2luZyBTb3VuZEZpbGVTZWxlY3RvclxuICAgICAqIEhUTUwgc3RydWN0dXJlIGlzIHByb3ZpZGVkIGJ5IHRoZSBwbGF5QWRkTmV3U291bmRXaXRoSWNvbnMgcGFydGlhbCBpbiByZWNvcmRpbmcudm9sdDpcbiAgICAgKiAtIEhpZGRlbiBpbnB1dDogPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCIgbmFtZT1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCI+XG4gICAgICogLSBEcm9wZG93biBkaXY6IDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gc2VhcmNoIFBCWFJlY29yZEFubm91bmNlbWVudEluLWRyb3Bkb3duXCI+XG4gICAgICogLSBQbGF5YmFjayBidXR0b24gYW5kIGFkZCBuZXcgYnV0dG9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9ycygpIHtcbiAgICAgICAgLy8gU291bmQgZmlsZSBzZWxlY3RvcnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9yV2l0aERhdGEoKSBjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKVxuICAgICAgICBcbiAgICAgICAgLy8gVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgY29uc2lzdGVuY3kgYnV0IGFjdHVhbCBpbml0aWFsaXphdGlvbiBoYXBwZW5zXG4gICAgICAgIC8vIHdoZW4gd2UgaGF2ZSBkYXRhIGZyb20gdGhlIHNlcnZlciBpbiBsb2FkU291bmRGaWxlVmFsdWVzKClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBnZW5lcmFsIHNldHRpbmdzIGRhdGEgZnJvbSBBUElcbiAgICAgKiBVc2VkIGJvdGggb24gaW5pdGlhbCBwYWdlIGxvYWQgYW5kIGZvciBtYW51YWwgcmVmcmVzaFxuICAgICAqIENhbiBiZSBjYWxsZWQgYW55dGltZSB0byByZWxvYWQgdGhlIGZvcm0gZGF0YTogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWREYXRhKClcbiAgICAgKi9cbiAgICBsb2FkRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHRoZSBmb3JtIHdpdGggZGltbWVyXG4gICAgICAgIEZvcm0uc2hvd0xvYWRpbmdTdGF0ZSh0cnVlLCAnTG9hZGluZyBzZXR0aW5ncy4uLicpO1xuXG4gICAgICAgIEdlbmVyYWxTZXR0aW5nc0FQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIEZvcm0uaGlkZUxvYWRpbmdTdGF0ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggdGhlIHJlY2VpdmVkIGRhdGFcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5kYXRhTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaG93IHdhcm5pbmdzIGZvciBkZWZhdWx0IHBhc3N3b3JkcyBhZnRlciBET00gdXBkYXRlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEucGFzc3dvcmRWYWxpZGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgdXBkYXRlZCBhZnRlciBwb3B1bGF0ZUZvcm1cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0RlZmF1bHRQYXNzd29yZFdhcm5pbmdzKHJlc3BvbnNlLmRhdGEucGFzc3dvcmRWYWxpZGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQVBJIEVycm9yOicsIHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dBcGlFcnJvcihyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNldHRpbmdzIGRhdGEgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBFeHRyYWN0IHNldHRpbmdzIGFuZCBhZGRpdGlvbmFsIGRhdGFcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBkYXRhLnNldHRpbmdzIHx8IGRhdGE7XG4gICAgICAgIGNvbnN0IGNvZGVjcyA9IGRhdGEuY29kZWNzIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShzZXR0aW5ncywge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNwZWNpYWwgZmllbGQgdHlwZXNcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucG9wdWxhdGVTcGVjaWFsRmllbGRzKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHNvdW5kIGZpbGUgdmFsdWVzIHdpdGggcmVwcmVzZW50YXRpb25zXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWRTb3VuZEZpbGVWYWx1ZXMoZm9ybURhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBjb2RlYyB0YWJsZXNcbiAgICAgICAgICAgICAgICBpZiAoY29kZWNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgZmllbGRzIChoaWRlIGFjdHVhbCBwYXNzd29yZHMpXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVQYXNzd29yZEZpZWxkcyhmb3JtRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIFNTSCBwYXNzd29yZCB2aXNpYmlsaXR5XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmQoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU1NIIGtleXMgdGFibGUgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBzc2hLZXlzVGFibGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBzc2hLZXlzVGFibGUuaW5pdGlhbGl6ZSgnc3NoLWtleXMtY29udGFpbmVyJywgJ1NTSEF1dGhvcml6ZWRLZXlzJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyB3aXRoIG5ldyBkYXRhXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50IHRvIG5vdGlmeSB0aGF0IGRhdGEgaGFzIGJlZW4gbG9hZGVkXG4gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ0dlbmVyYWxTZXR0aW5ncy5kYXRhTG9hZGVkJyk7XG5cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzcGVjaWFsIGZpZWxkIHR5cGVzIHRoYXQgbmVlZCBjdXN0b20gcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVNwZWNpYWxGaWVsZHMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gUHJpdmF0ZSBrZXkgZXhpc3RlbmNlIGlzIG5vdyBkZXRlcm1pbmVkIGJ5IGNoZWNraW5nIGlmIHZhbHVlIGVxdWFscyBISURERU5fUEFTU1dPUkRcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgIGlmIChzZXR0aW5ncy5XRUJIVFRQU1B1YmxpY0tleV9pbmZvKSB7XG4gICAgICAgICAgICAkKCcjV0VCSFRUUFNQdWJsaWNLZXknKS5kYXRhKCdjZXJ0LWluZm8nLCBzZXR0aW5ncy5XRUJIVFRQU1B1YmxpY0tleV9pbmZvKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNoZWNrYm94ZXMgKEFQSSByZXR1cm5zIGJvb2xlYW4gdmFsdWVzKVxuICAgICAgICBPYmplY3Qua2V5cyhzZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJChgIyR7a2V5fWApLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBzZXR0aW5nc1trZXldID09PSB0cnVlIHx8IHNldHRpbmdzW2tleV0gPT09ICcxJyB8fCBzZXR0aW5nc1trZXldID09PSAxO1xuICAgICAgICAgICAgICAgICRjaGVja2JveC5jaGVja2JveChpc0NoZWNrZWQgPyAnY2hlY2snIDogJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIHJlZ3VsYXIgZHJvcGRvd25zIChleGNsdWRpbmcgc291bmQgZmlsZSBzZWxlY3RvcnMgd2hpY2ggYXJlIGhhbmRsZWQgc2VwYXJhdGVseSlcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2tleX1gKS5wYXJlbnQoJy5kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPiAwICYmICEkZHJvcGRvd24uaGFzQ2xhc3MoJ2F1ZGlvLW1lc3NhZ2Utc2VsZWN0JykpIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNldHRpbmdzW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgZmllbGRzIHdpdGggaGlkZGVuIHBhc3N3b3JkIGluZGljYXRvclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGFcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gSGlkZSBhY3R1YWwgcGFzc3dvcmRzIGFuZCBzaG93IGhpZGRlbiBpbmRpY2F0b3JcbiAgICAgICAgaWYgKHNldHRpbmdzLldlYkFkbWluUGFzc3dvcmQgJiYgc2V0dGluZ3MuV2ViQWRtaW5QYXNzd29yZCAhPT0gJycpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoc2V0dGluZ3MuU1NIUGFzc3dvcmQgJiYgc2V0dGluZ3MuU1NIUGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IEFQSSBlcnJvciBtZXNzYWdlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXNzYWdlcyAtIEVycm9yIG1lc3NhZ2VzIGZyb20gQVBJXG4gICAgICovXG4gICAgc2hvd0FwaUVycm9yKG1lc3NhZ2VzKSB7XG4gICAgICAgIGlmIChtZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gQXJyYXkuaXNBcnJheShtZXNzYWdlcy5lcnJvcikgXG4gICAgICAgICAgICAgICAgPyBtZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIFxuICAgICAgICAgICAgICAgIDogbWVzc2FnZXMuZXJyb3I7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyB3YXJuaW5ncyBmb3IgZGVmYXVsdCBwYXNzd29yZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdmFsaWRhdGlvbiAtIFBhc3N3b3JkIHZhbGlkYXRpb24gcmVzdWx0cyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHNob3dEZWZhdWx0UGFzc3dvcmRXYXJuaW5ncyh2YWxpZGF0aW9uKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgcGFzc3dvcmQtdmFsaWRhdGUgbWVzc2FnZXMgZmlyc3RcbiAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHdhcm5pbmcgZm9yIGRlZmF1bHQgV2ViIEFkbWluIHBhc3N3b3JkXG4gICAgICAgIGlmICh2YWxpZGF0aW9uLmlzRGVmYXVsdFdlYlBhc3N3b3JkKSB7XG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBwYXNzd29yZCBmaWVsZHMgZ3JvdXAgLSB0cnkgbXVsdGlwbGUgc2VsZWN0b3JzXG4gICAgICAgICAgICBsZXQgJHdlYlBhc3N3b3JkRmllbGRzID0gJCgnI1dlYkFkbWluUGFzc3dvcmQnKS5jbG9zZXN0KCcudHdvLmZpZWxkcycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHdlYlBhc3N3b3JkRmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSBhbHRlcm5hdGl2ZSBzZWxlY3RvciBpZiB0aGUgZmlyc3Qgb25lIGRvZXNuJ3Qgd29ya1xuICAgICAgICAgICAgICAgICR3ZWJQYXNzd29yZEZpZWxkcyA9ICQoJyNXZWJBZG1pblBhc3N3b3JkJykucGFyZW50KCkucGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkd2ViUGFzc3dvcmRGaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCB3YXJuaW5nSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIGljb24gbWVzc2FnZSBwYXNzd29yZC12YWxpZGF0ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUucHN3X1NldFBhc3N3b3JkfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmR9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5zZXJ0IHdhcm5pbmcgYmVmb3JlIHRoZSBwYXNzd29yZCBmaWVsZHNcbiAgICAgICAgICAgICAgICAkd2ViUGFzc3dvcmRGaWVsZHMuYmVmb3JlKHdhcm5pbmdIdG1sKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGZvciBkZWZhdWx0IFNTSCBwYXNzd29yZFxuICAgICAgICBpZiAodmFsaWRhdGlvbi5pc0RlZmF1bHRTU0hQYXNzd29yZCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgU1NIIHBhc3N3b3JkIGxvZ2luIGlzIGVuYWJsZWRcbiAgICAgICAgICAgIGNvbnN0IHNzaFBhc3N3b3JkRGlzYWJsZWQgPSAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFzc2hQYXNzd29yZERpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkcyBncm91cFxuICAgICAgICAgICAgICAgIGxldCAkc3NoUGFzc3dvcmRGaWVsZHMgPSAkKCcjU1NIUGFzc3dvcmQnKS5jbG9zZXN0KCcudHdvLmZpZWxkcycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkc3NoUGFzc3dvcmRGaWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSBhbHRlcm5hdGl2ZSBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICAkc3NoUGFzc3dvcmRGaWVsZHMgPSAkKCcjU1NIUGFzc3dvcmQnKS5wYXJlbnQoKS5wYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRzc2hQYXNzd29yZEZpZWxkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2FybmluZ0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgaWNvbiBtZXNzYWdlIHBhc3N3b3JkLXZhbGlkYXRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5wc3dfU2V0UGFzc3dvcmR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmR9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgd2FybmluZyBiZWZvcmUgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFuZCBsb2FkIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggZGF0YSwgc2ltaWxhciB0byBJVlIgaW1wbGVtZW50YXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNvdW5kRmlsZVZhbHVlcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBDb252ZXJ0IGVtcHR5IHZhbHVlcyB0byAtMSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICAgIGNvbnN0IGRhdGFJbiA9IHsuLi5zZXR0aW5nc307XG4gICAgICAgIGlmICghc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gfHwgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gPT09ICcnKSB7XG4gICAgICAgICAgICBkYXRhSW4uUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gPSAnLTEnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbmNvbWluZyBhbm5vdW5jZW1lbnQgc2VsZWN0b3Igd2l0aCBkYXRhIChmb2xsb3dpbmcgSVZSIHBhdHRlcm4pXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ1BCWFJlY29yZEFubm91bmNlbWVudEluJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YUluXG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgZW1wdHkgdmFsdWVzIHRvIC0xIGZvciB0aGUgZHJvcGRvd25cbiAgICAgICAgY29uc3QgZGF0YU91dCA9IHsuLi5zZXR0aW5nc307XG4gICAgICAgIGlmICghc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IHx8IHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudE91dCA9PT0gJycpIHtcbiAgICAgICAgICAgIGRhdGFPdXQuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0ID0gJy0xJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3V0Z29pbmcgYW5ub3VuY2VtZW50IHNlbGVjdG9yIHdpdGggZGF0YSAoZm9sbG93aW5nIElWUiBwYXR0ZXJuKVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdQQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhT3V0XG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhbmQgdXBkYXRlIGNvZGVjIHRhYmxlcyB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb2RlY3MgLSBBcnJheSBvZiBjb2RlYyBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcykge1xuICAgICAgICAvLyBSZXNldCBjb2RlYyBjaGFuZ2UgZmxhZyB3aGVuIGxvYWRpbmcgZGF0YVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIGNvZGVjIHN0YXRlIGZvciBjb21wYXJpc29uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNlcGFyYXRlIGF1ZGlvIGFuZCB2aWRlbyBjb2RlY3NcbiAgICAgICAgY29uc3QgYXVkaW9Db2RlY3MgPSBjb2RlY3MuZmlsdGVyKGMgPT4gYy50eXBlID09PSAnYXVkaW8nKS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgIGNvbnN0IHZpZGVvQ29kZWNzID0gY29kZWNzLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ3ZpZGVvJykuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgYXVkaW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUoYXVkaW9Db2RlY3MsICdhdWRpbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgdmlkZW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUodmlkZW9Db2RlY3MsICd2aWRlbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSBsb2FkZXJzIGFuZCBzaG93IHRhYmxlc1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLWxvYWRlciwgI3ZpZGVvLWNvZGVjcy1sb2FkZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUsICN2aWRlby1jb2RlY3MtdGFibGUnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIHJlb3JkZXJpbmdcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb2RlYyB0YWJsZSByb3dzIGZyb20gZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvZGVjcyAtIEFycmF5IG9mIGNvZGVjIG9iamVjdHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtICdhdWRpbycgb3IgJ3ZpZGVvJ1xuICAgICAqL1xuICAgIGJ1aWxkQ29kZWNUYWJsZShjb2RlY3MsIHR5cGUpIHtcbiAgICAgICAgY29uc3QgJHRhYmxlQm9keSA9ICQoYCMke3R5cGV9LWNvZGVjcy10YWJsZSB0Ym9keWApO1xuICAgICAgICAkdGFibGVCb2R5LmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICBjb2RlY3MuZm9yRWFjaCgoY29kZWMsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBzdGF0ZSBmb3IgY2hhbmdlIGRldGVjdGlvblxuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZVtjb2RlYy5uYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXgsXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGNvZGVjLmRpc2FibGVkXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFibGUgcm93XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gY29kZWMuZGlzYWJsZWQgPT09IHRydWUgfHwgY29kZWMuZGlzYWJsZWQgPT09ICcxJyB8fCBjb2RlYy5kaXNhYmxlZCA9PT0gMTtcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrZWQgPSAhaXNEaXNhYmxlZCA/ICdjaGVja2VkJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCByb3dIdG1sID0gYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cImNvZGVjLXJvd1wiIGlkPVwiY29kZWMtJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtpbmRleH1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb2RlYy1uYW1lPVwiJHtjb2RlYy5uYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtb3JpZ2luYWwtcHJpb3JpdHk9XCIke2luZGV4fVwiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJjb2xsYXBzaW5nIGRyYWdIYW5kbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic29ydCBncmV5IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggY29kZWNzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwiY29kZWNfJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2NoZWNrZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmluZGV4PVwiMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJjb2RlY18ke2NvZGVjLm5hbWV9XCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjb2RlYy5kZXNjcmlwdGlvbiB8fCBjb2RlYy5uYW1lKX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICR0YWJsZUJvZHkuYXBwZW5kKHJvd0h0bWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyBmb3IgdGhlIG5ldyByb3dzXG4gICAgICAgICR0YWJsZUJvZHkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgY29kZWNzIGFzIGNoYW5nZWQgYW5kIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIGNvZGVjIHRhYmxlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkge1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlLCAjdmlkZW8tY29kZWNzLXRhYmxlJykudGFibGVEbkQoe1xuICAgICAgICAgICAgb25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnLFxuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGNvZGVjcyBhcyBjaGFuZ2VkIGFuZCBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjZXJ0aWZpY2F0ZSBmaWVsZCBkaXNwbGF5IG9ubHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpIHtcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIG9ubHlcbiAgICAgICAgY29uc3QgJGNlcnRQdWJLZXlGaWVsZCA9ICQoJyNXRUJIVFRQU1B1YmxpY0tleScpO1xuICAgICAgICBpZiAoJGNlcnRQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRjZXJ0UHViS2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGNlcnRpZmljYXRlIGluZm8gaWYgYXZhaWxhYmxlIGZyb20gZGF0YSBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGNlcnRJbmZvID0gJGNlcnRQdWJLZXlGaWVsZC5kYXRhKCdjZXJ0LWluZm8nKSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzIGZvciB0aGlzIGZpZWxkIG9ubHlcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheSwgLmNlcnQtZWRpdC1mb3JtJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbWVhbmluZ2Z1bCBkaXNwbGF5IHRleHQgZnJvbSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgICAgICAgICAgbGV0IGRpc3BsYXlUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHN1YmplY3QvZG9tYWluXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDwn5OcICR7Y2VydEluZm8uc3ViamVjdH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGlzc3VlciBpZiBub3Qgc2VsZi1zaWduZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3VlciAmJiAhY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYGJ5ICR7Y2VydEluZm8uaXNzdWVyfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKCcoU2VsZi1zaWduZWQpJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCB2YWxpZGl0eSBkYXRlc1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4p2MIEV4cGlyZWQgJHtjZXJ0SW5mby52YWxpZF90b31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDimqDvuI8gRXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKchSBWYWxpZCB1bnRpbCAke2NlcnRJbmZvLnZhbGlkX3RvfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IHBhcnRzLmpvaW4oJyB8ICcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRydW5jYXRlZCBjZXJ0aWZpY2F0ZVxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS50cnVuY2F0ZUNlcnRpZmljYXRlKGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIG9yaWdpbmFsIGZpZWxkXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIHN0YXR1cyBjb2xvciBjbGFzcyBiYXNlZCBvbiBjZXJ0aWZpY2F0ZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBsZXQgc3RhdHVzQ2xhc3MgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICd3YXJuaW5nJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgY2VydC1kaXNwbGF5ICR7c3RhdHVzQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZGlzcGxheVRleHQpfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cImJhc2ljXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlDZXJ0fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29weSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBpbmZvLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENlcnRJbmZvfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZWRpdC1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImVkaXQgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZGVsZXRlLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInRyYXNoIGljb24gcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAke2NlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvciA/IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5yZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMoY2VydEluZm8pIDogJyd9XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBmb3JtIGNlcnQtZWRpdC1mb3JtXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1B1YmxpY0tleV9lZGl0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M9XCIxMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHVibGljQ2VydH1cIj4ke2Z1bGxWYWx1ZX08L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbWluaSBidXR0b25zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIHBvc2l0aXZlIGJ1dHRvbiBzYXZlLWNlcnQtYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuYnRfU2F2ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGNhbmNlbC1jZXJ0LWJ0blwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNsb3NlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X0NhbmNlbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgaW5mbyBidXR0b24gLSB0b2dnbGUgZGV0YWlscyBkaXNwbGF5XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuaW5mby1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZGV0YWlscyA9ICRjb250YWluZXIuZmluZCgnLmNlcnQtZGV0YWlscycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGRldGFpbHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZGV0YWlscy5zbGlkZVRvZ2dsZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVkaXQgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZWRpdC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWVkaXQtZm9ybScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQdWJsaWNLZXlfZWRpdCcpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc2F2ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9ICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHVibGljS2V5X2VkaXQnKS52YWwoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIG9yaWdpbmFsIGhpZGRlbiBmaWVsZFxuICAgICAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLnZhbChuZXdWYWx1ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgY2VydGlmaWNhdGUgaW5mbyB0byBmb3JjZSByZS1wYXJzaW5nXG4gICAgICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlciBpcyBjaGFuZ2luZyBjZXJ0aWZpY2F0ZSwgaW5mbyBuZWVkcyB0byBiZSB1cGRhdGVkXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuZGF0YSgnY2VydC1pbmZvJywge30pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBib3RoIGNlcnRpZmljYXRlIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFdoZW4gdXNlciBjaGFuZ2VzIHB1YmxpYyBjZXJ0LCBwcml2YXRlIGtleSBmaWVsZCBzdGF0ZSBtYXkgbmVlZCB1cGRhdGVcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgY2FuY2VsIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNhbmNlbC1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWVkaXQtZm9ybScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5Jykuc2hvdygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZGVsZXRlLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGNlcnRpZmljYXRlXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKCcnKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBjZXJ0aWZpY2F0ZSBpbmZvIGRhdGEgYXR0cmlidXRlXG4gICAgICAgICAgICAgICAgICAgIC8vIFdIWTogV2hlbiBjZXJ0aWZpY2F0ZSBpcyBkZWxldGVkLCBwcml2YXRlIGtleSBzdGF0ZSBzaG91bGQgYWxzbyB1cGRhdGVcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5kYXRhKCdjZXJ0LWluZm8nLCB7fSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGJvdGggY2VydGlmaWNhdGUgZmllbGRzIHRvIHNob3cgZW1wdHkgc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgLy8gV0hZOiBEZWxldGluZyBwdWJsaWMgY2VydCBzaG91bGQgYWxzbyByZXNldCBwcml2YXRlIGtleSBkaXNwbGF5XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBuZXcgYnV0dG9uc1xuICAgICAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVB1YmxpY0NlcnQpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuYXR0cigncm93cycsICcxMCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjaGFuZ2UgZXZlbnRzIHRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5vZmYoJ2lucHV0LmNlcnQgY2hhbmdlLmNlcnQga2V5dXAuY2VydCcpLm9uKCdpbnB1dC5jZXJ0IGNoYW5nZS5jZXJ0IGtleXVwLmNlcnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgZGlzcGxheSBmb3IgU1NIIGtleXMgYW5kIGNlcnRpZmljYXRlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBTU0hfSURfUlNBX1BVQiBmaWVsZFxuICAgICAgICBjb25zdCAkc3NoUHViS2V5RmllbGQgPSAkKCcjU1NIX0lEX1JTQV9QVUInKTtcbiAgICAgICAgaWYgKCRzc2hQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRzc2hQdWJLZXlGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkc3NoUHViS2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc3NoLWtleS1kaXNwbGF5LCAuZnVsbC1kaXNwbGF5JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgY3JlYXRlIGRpc3BsYXkgaWYgdGhlcmUncyBhIHZhbHVlXG4gICAgICAgICAgICBpZiAoZnVsbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRydW5jYXRlZCBkaXNwbGF5XG4gICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnRydW5jYXRlU1NIS2V5KGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgb3JpZ2luYWwgZmllbGRcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aW9uIGlucHV0IGZsdWlkIHNzaC1rZXktZGlzcGxheVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke3RydW5jYXRlZH1cIiByZWFkb25seSBjbGFzcz1cInRydW5jYXRlZC1kaXNwbGF5XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBjb3B5LWJ0blwiIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGZ1bGxWYWx1ZSl9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFyaWF0aW9uPVwiYmFzaWNcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weUtleX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZXhwYW5kLWJ0blwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRXhwYW5kfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhwYW5kIGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGNsYXNzPVwiZnVsbC1kaXNwbGF5XCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCIgcmVhZG9ubHk+JHtmdWxsVmFsdWV9PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIGV4cGFuZC9jb2xsYXBzZVxuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZXhwYW5kLWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZ1bGxEaXNwbGF5ID0gJGNvbnRhaW5lci5maW5kKCcuZnVsbC1kaXNwbGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRydW5jYXRlZERpc3BsYXkgPSAkY29udGFpbmVyLmZpbmQoJy5zc2gta2V5LWRpc3BsYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQodGhpcykuZmluZCgnaScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkZnVsbERpc3BsYXkuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJGZ1bGxEaXNwbGF5LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJHRydW5jYXRlZERpc3BsYXkuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnY29tcHJlc3MnKS5hZGRDbGFzcygnZXhwYW5kJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGZ1bGxEaXNwbGF5LnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJHRydW5jYXRlZERpc3BsYXkuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXhwYW5kJykuYWRkQ2xhc3MoJ2NvbXByZXNzJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIG5ldyBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG9yaWdpbmFsIGZpZWxkIGFzIHJlYWQtb25seSAodGhpcyBpcyBhIHN5c3RlbS1nZW5lcmF0ZWQga2V5KVxuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX05vU1NIUHVibGljS2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIC0gdXNlIGRlZGljYXRlZCBtZXRob2RcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgV0VCSFRUUFNQcml2YXRlS2V5IGZpZWxkICh3cml0ZS1vbmx5IHdpdGggcGFzc3dvcmQgbWFza2luZylcbiAgICAgICAgY29uc3QgJGNlcnRQcml2S2V5RmllbGQgPSAkKCcjV0VCSFRUUFNQcml2YXRlS2V5Jyk7XG4gICAgICAgIGlmICgkY2VydFByaXZLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkY2VydFByaXZLZXlGaWVsZC5wYXJlbnQoKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5wcml2YXRlLWtleS1zZXQsIC5wcml2YXRlLWtleS1zeXN0ZW0tbWFuYWdlZCwgI1dFQkhUVFBTUHJpdmF0ZUtleV9uZXcnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gR2V0IGNlcnRpZmljYXRlIGluZm8gdG8gY2hlY2sgZm9yIHByaXZhdGUga2V5IGV4aXN0ZW5jZVxuICAgICAgICAgICAgY29uc3QgJGNlcnRQdWJLZXlGaWVsZCA9ICQoJyNXRUJIVFRQU1B1YmxpY0tleScpO1xuICAgICAgICAgICAgY29uc3QgY2VydEluZm8gPSAkY2VydFB1YktleUZpZWxkLmRhdGEoJ2NlcnQtaW5mbycpIHx8IHt9O1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBwcml2YXRlIGtleSBleGlzdHNcbiAgICAgICAgICAgIC8vIFdIWTogaGFzX3ByaXZhdGVfa2V5IGNhbiBiZSB0cnVlIGV2ZW4gaWYgZmllbGQgaXMgZW1wdHkgKHNlbGYtc2lnbmVkIGNlcnRzIGluIGZpbGVzKVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGNlcnRQcml2S2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCBoYXNWYWx1ZUluRGIgPSBjdXJyZW50VmFsdWUgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZDtcbiAgICAgICAgICAgIGNvbnN0IGhhc1ZhbHVlSW5GaWxlcyA9IGNlcnRJbmZvLmhhc19wcml2YXRlX2tleSB8fCBmYWxzZTtcbiAgICAgICAgICAgIGNvbnN0IGlzU2VsZlNpZ25lZCA9IGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkIHx8IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBwdWJsaWMgY2VydGlmaWNhdGUgd2FzIG1vZGlmaWVkIGxvY2FsbHkgKG5vdCBzYXZlZCB5ZXQpXG4gICAgICAgICAgICAvLyBXSFk6IElmIGNlcnQgd2FzIGNoYW5nZWQgbG9jYWxseSwgY2VydC1pbmZvIGlzIG91dGRhdGVkIC0gYWxsb3cgcHJpdmF0ZSBrZXkgaW5wdXRcbiAgICAgICAgICAgIGNvbnN0IHB1YmxpY0tleVZhbHVlID0gJGNlcnRQdWJLZXlGaWVsZC52YWwoKSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHB1YmxpY0tleU1vZGlmaWVkID0gcHVibGljS2V5VmFsdWUgJiYgIWNlcnRJbmZvLnN1YmplY3Q7IC8vIE5vIHBhcnNlZCBpbmZvID0gbW9kaWZpZWQgbG9jYWxseVxuXG4gICAgICAgICAgICBpZiAocHVibGljS2V5TW9kaWZpZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBQdWJsaWMgY2VydGlmaWNhdGUgd2FzIG1vZGlmaWVkIGxvY2FsbHkgLSBzaG93IHByaXZhdGUga2V5IGlucHV0IGZpZWxkXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBVc2VyIGlzIGNoYW5naW5nIGNlcnRpZmljYXRlLCBuZWVkcyB0byBwcm92aWRlIG1hdGNoaW5nIHByaXZhdGUga2V5XG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHJpdmF0ZUtleSk7XG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuYXR0cigncm93cycsICcxMCcpO1xuXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNoYW5nZSBldmVudHMgdHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5vZmYoJ2lucHV0LnByaXYgY2hhbmdlLnByaXYga2V5dXAucHJpdicpLm9uKCdpbnB1dC5wcml2IGNoYW5nZS5wcml2IGtleXVwLnByaXYnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaGFzVmFsdWVJbkRiKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlci1wcm92aWRlZCBjZXJ0aWZpY2F0ZSB3aXRoIHByaXZhdGUga2V5IGluIGRhdGFiYXNlXG4gICAgICAgICAgICAgICAgLy8gS2VlcCBoaWRkZW5QYXNzd29yZCB2YWx1ZSBpbiBvcmlnaW5hbCBmaWVsZCBhbmQgaGlkZSBpdFxuICAgICAgICAgICAgICAgIC8vIFRoaXMgZW5zdXJlcyB0aGUgZmllbGQgd29uJ3QgYmUgc2VudCBkdXJpbmcgZm9ybSBzdWJtaXNzaW9uXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQudmFsKGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2UgcHJpdmF0ZS1rZXktc2V0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImxvY2sgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19Qcml2YXRlS2V5SXNTZXR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxhY2Uta2V5LWxpbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19SZXBsYWNlfTwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBpZD1cIldFQkhUVFBTUHJpdmF0ZUtleV9uZXdcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93cz1cIjEwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwiZGlzcGxheTpub25lO1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHJpdmF0ZUtleX1cIj48L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSByZXBsYWNlIGxpbmtcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5yZXBsYWNlLWtleS1saW5rJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnByaXZhdGUta2V5LXNldCcpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJG5ld0ZpZWxkID0gJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQcml2YXRlS2V5X25ldycpO1xuICAgICAgICAgICAgICAgICAgICAkbmV3RmllbGQuc2hvdygpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgaGlkZGVuIHBhc3N3b3JkIHZhbHVlIHNvIHdlIGNhbiBzZXQgYSBuZXcgb25lXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBCaW5kIGNoYW5nZSBldmVudCB0byB1cGRhdGUgaGlkZGVuIGZpZWxkIGFuZCBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgJG5ld0ZpZWxkLm9uKCdpbnB1dCBjaGFuZ2Uga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgb3JpZ2luYWwgaGlkZGVuIGZpZWxkIHdpdGggbmV3IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC52YWwoJG5ld0ZpZWxkLnZhbCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb24gY2hlY2tcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzU2VsZlNpZ25lZCAmJiBoYXNWYWx1ZUluRmlsZXMpIHtcbiAgICAgICAgICAgICAgICAvLyBTZWxmLXNpZ25lZCBjZXJ0aWZpY2F0ZSB3aXRoIHN5c3RlbS1tYW5hZ2VkIHByaXZhdGUga2V5XG4gICAgICAgICAgICAgICAgLy8gV0hZOiBQcml2YXRlIGtleSBleGlzdHMgaW4gZmlsZXMgYnV0IG5vdCBpbiBkYXRhYmFzZSAoYXV0by1nZW5lcmF0ZWQpXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2UgcHJpdmF0ZS1rZXktc3lzdGVtLW1hbmFnZWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwibG9jayBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmdzX1N5c3RlbU1hbmFnZWRQcml2YXRlS2V5IHx8ICdTeXN0ZW0tbWFuYWdlZCBwcml2YXRlIGtleSAoYXV0by1nZW5lcmF0ZWQgd2l0aCBjZXJ0aWZpY2F0ZSknfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBmb3IgaW5wdXQgd2l0aCBwcm9wZXIgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQcml2YXRlS2V5KTtcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5hdHRyKCdyb3dzJywgJzEwJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNoYW5nZSBldmVudHMgdHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5vZmYoJ2lucHV0LnByaXYgY2hhbmdlLnByaXYga2V5dXAucHJpdicpLm9uKCdpbnB1dC5wcml2IGNoYW5nZS5wcml2IGtleXVwLnByaXYnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZnVuY3Rpb25hbGl0eSBmb3IgY29weSBidXR0b25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNsaXBib2FyZCgpIHtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY29weS1idG4nKTtcbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUudHJpZ2dlcik7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbEljb24gPSAkYnRuLmZpbmQoJ2knKS5hdHRyKCdjbGFzcycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkYnRuLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKCdjaGVjayBpY29uJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkYnRuLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKG9yaWdpbmFsSWNvbik7XG4gICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgc2VsZWN0aW9uXG4gICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5vbignZXJyb3InLCAoKSA9PiB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmdzX0NvcHlGYWlsZWQpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRydW5jYXRlIFNTSCBrZXkgZm9yIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gRnVsbCBTU0gga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUcnVuY2F0ZWQga2V5XG4gICAgICovXG4gICAgdHJ1bmNhdGVTU0hLZXkoa2V5KSB7XG4gICAgICAgIGlmICgha2V5IHx8IGtleS5sZW5ndGggPCA1MCkge1xuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJyAnKTtcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICBjb25zdCBrZXlUeXBlID0gcGFydHNbMF07XG4gICAgICAgICAgICBjb25zdCBrZXlEYXRhID0gcGFydHNbMV07XG4gICAgICAgICAgICBjb25zdCBjb21tZW50ID0gcGFydHMuc2xpY2UoMikuam9pbignICcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5RGF0YS5sZW5ndGggPiA0MCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZCA9IGtleURhdGEuc3Vic3RyaW5nKDAsIDIwKSArICcuLi4nICsga2V5RGF0YS5zdWJzdHJpbmcoa2V5RGF0YS5sZW5ndGggLSAxNSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke2tleVR5cGV9ICR7dHJ1bmNhdGVkfSAke2NvbW1lbnR9YC50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUcnVuY2F0ZSBjZXJ0aWZpY2F0ZSBmb3IgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjZXJ0IC0gRnVsbCBjZXJ0aWZpY2F0ZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVHJ1bmNhdGVkIGNlcnRpZmljYXRlIGluIHNpbmdsZSBsaW5lIGZvcm1hdFxuICAgICAqL1xuICAgIHRydW5jYXRlQ2VydGlmaWNhdGUoY2VydCkge1xuICAgICAgICBpZiAoIWNlcnQgfHwgY2VydC5sZW5ndGggPCAxMDApIHtcbiAgICAgICAgICAgIHJldHVybiBjZXJ0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsaW5lcyA9IGNlcnQuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEV4dHJhY3QgZmlyc3QgYW5kIGxhc3QgbWVhbmluZ2Z1bCBsaW5lc1xuICAgICAgICBjb25zdCBmaXJzdExpbmUgPSBsaW5lc1swXSB8fCAnJztcbiAgICAgICAgY29uc3QgbGFzdExpbmUgPSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBjZXJ0aWZpY2F0ZXMsIHNob3cgYmVnaW4gYW5kIGVuZCBtYXJrZXJzXG4gICAgICAgIGlmIChmaXJzdExpbmUuaW5jbHVkZXMoJ0JFR0lOIENFUlRJRklDQVRFJykpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtmaXJzdExpbmV9Li4uJHtsYXN0TGluZX1gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3Igb3RoZXIgZm9ybWF0cywgdHJ1bmNhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgY29uc3QgY2xlYW5DZXJ0ID0gY2VydC5yZXBsYWNlKC9cXG4vZywgJyAnKS50cmltKCk7XG4gICAgICAgIGlmIChjbGVhbkNlcnQubGVuZ3RoID4gODApIHtcbiAgICAgICAgICAgIHJldHVybiBjbGVhbkNlcnQuc3Vic3RyaW5nKDAsIDQwKSArICcuLi4nICsgY2xlYW5DZXJ0LnN1YnN0cmluZyhjbGVhbkNlcnQubGVuZ3RoIC0gMzApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2xlYW5DZXJ0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgZm9yIHNhZmUgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBtYXAgPSB7XG4gICAgICAgICAgICAnJic6ICcmYW1wOycsXG4gICAgICAgICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICAgICAgICc+JzogJyZndDsnLFxuICAgICAgICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICAgICAgICBcIidcIjogJyYjMDM5OydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZSgvWyY8PlwiJ10vZywgbSA9PiBtYXBbbV0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdywgaGlkZSBzc2ggcGFzc3dvcmQgc2VnbWVudCBhY2NvcmRpbmcgdG8gdGhlIHZhbHVlIG9mIHVzZSBTU0ggcGFzc3dvcmQgY2hlY2tib3guXG4gICAgICovXG4gICAgc2hvd0hpZGVTU0hQYXNzd29yZCgpe1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZFNlZ21lbnQuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZFNlZ21lbnQuc2hvdygpO1xuICAgICAgICB9XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogUHJlcGFyZXMgZGF0YSBmb3IgUkVTVCBBUEkgc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cbiAgICAgICAgLy8gSGFuZGxlIGFsbCBwYXNzd29yZC9rZXkgZmllbGRzIHRoYXQgdXNlIGhpZGRlblBhc3N3b3JkIGluZGljYXRvclxuICAgICAgICAvLyBSZW1vdmUgYW55IGZpZWxkIHdpdGggaGlkZGVuUGFzc3dvcmQgdmFsdWUgdG8gcHJldmVudCBvdmVyd3JpdGluZyB3aXRoIGVtcHR5IHZhbHVlc1xuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5kYXRhW2tleV0gPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBGb3IgZmllbGRzIHdpdGggZW1wdHkgc3RyaW5nICcnIC0gdGhleSB3aWxsIGJlIHNlbnQgdG8gYWxsb3cgY2xlYXJpbmcgdmFsdWVzIG9uIHNlcnZlclxuICAgICAgICAvLyBUaGlzIGlzIGludGVudGlvbmFsIGJlaGF2aW9yIGZvciBjZXJ0aWZpY2F0ZS9rZXkgZmllbGRzXG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgdW5uZWNlc3NhcnkgZmllbGRzIGJlZm9yZSBzZW5kaW5nXG4gICAgICAgIGNvbnN0IGZpZWxkc1RvUmVtb3ZlID0gW1xuICAgICAgICAgICAgJ2RpcnJ0eScsXG4gICAgICAgICAgICAnZGVsZXRlQWxsSW5wdXQnLFxuICAgICAgICBdO1xuXG4gICAgICAgIC8vIFJlbW92ZSBjb2RlY18qIGZpZWxkcyAodGhleSdyZSByZXBsYWNlZCB3aXRoIHRoZSBjb2RlY3MgYXJyYXkpXG4gICAgICAgIE9iamVjdC5rZXlzKHJlc3VsdC5kYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2NvZGVjXycpIHx8IGZpZWxkc1RvUmVtb3ZlLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB3ZSBzaG91bGQgcHJvY2VzcyBjb2RlY3NcbiAgICAgICAgLy8gV2hlbiBzZW5kT25seUNoYW5nZWQgaXMgZW5hYmxlZCwgb25seSBwcm9jZXNzIGNvZGVjcyBpZiB0aGV5IHdlcmUgYWN0dWFsbHkgY2hhbmdlZFxuICAgICAgICBjb25zdCBzaG91bGRQcm9jZXNzQ29kZWNzID0gIUZvcm0uc2VuZE9ubHlDaGFuZ2VkIHx8IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkO1xuXG4gICAgICAgIGlmIChzaG91bGRQcm9jZXNzQ29kZWNzKSB7XG4gICAgICAgICAgICAvLyBDb2xsZWN0IGFsbCBjb2RlYyBkYXRhIHdoZW4gdGhleSd2ZSBiZWVuIGNoYW5nZWRcbiAgICAgICAgICAgIGNvbnN0IGFyckNvZGVjcyA9IFtdO1xuXG4gICAgICAgICAgICAvLyBQcm9jZXNzIGFsbCBjb2RlYyByb3dzXG4gICAgICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlIC5jb2RlYy1yb3csICN2aWRlby1jb2RlY3MtdGFibGUgLmNvZGVjLXJvdycpLmVhY2goKGN1cnJlbnRJbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29kZWNOYW1lID0gJChvYmopLmF0dHIoJ2RhdGEtY29kZWMtbmFtZScpO1xuICAgICAgICAgICAgICAgIGlmIChjb2RlY05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudERpc2FibGVkID0gJChvYmopLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyB1bmNoZWNrZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICBhcnJDb2RlY3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjb2RlY05hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogY3VycmVudERpc2FibGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IGN1cnJlbnRJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluY2x1ZGUgY29kZWNzIGlmIHRoZXkgd2VyZSBjaGFuZ2VkIG9yIHNlbmRPbmx5Q2hhbmdlZCBpcyBmYWxzZVxuICAgICAgICAgICAgaWYgKGFyckNvZGVjcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29kZWNzID0gYXJyQ29kZWNzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBIYW5kbGVzIFJFU1QgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAkKFwiI2Vycm9yLW1lc3NhZ2VzXCIpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlOiB7IHJlc3VsdDogYm9vbCwgZGF0YToge30sIG1lc3NhZ2VzOiB7fSB9XG4gICAgICAgIGlmICghcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYXNzd29yZCBmaWVsZHMgdG8gaGlkZGVuIHZhbHVlIG9uIHN1Y2Nlc3NcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHBhc3N3b3JkIHZhbGlkYXRpb24gd2FybmluZ3MgYWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlXG4gICAgICAgICAgICAkKCcucGFzc3dvcmQtdmFsaWRhdGUnKS5mYWRlT3V0KDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBkZWxldGUgYWxsIGNvbmRpdGlvbnMgaWYgbmVlZGVkXG4gICAgICAgIGlmICh0eXBlb2YgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNoZWNrRGVsZXRlQ29uZGl0aW9ucygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGVycm9yIG1lc3NhZ2UgSFRNTCBmcm9tIFJFU1QgQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlIHdpdGggZXJyb3IgbWVzc2FnZXNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBjb25zdCAkZGl2ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndWkgbmVnYXRpdmUgbWVzc2FnZScsIGlkOiAnZXJyb3ItbWVzc2FnZXMnIH0pO1xuICAgICAgICAgICAgY29uc3QgJGhlYWRlciA9ICQoJzxkaXY+JywgeyBjbGFzczogJ2hlYWRlcicgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuZ3NfRXJyb3JTYXZlU2V0dGluZ3MpO1xuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJGhlYWRlcik7XG4gICAgICAgICAgICBjb25zdCAkdWwgPSAkKCc8dWw+JywgeyBjbGFzczogJ2xpc3QnIH0pO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZXNTZXQgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIGVycm9yIGFuZCB2YWxpZGF0aW9uIG1lc3NhZ2UgdHlwZXNcbiAgICAgICAgICAgIFsnZXJyb3InLCAndmFsaWRhdGlvbiddLmZvckVhY2gobXNnVHlwZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzID0gQXJyYXkuaXNBcnJheShyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSkgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdIFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBbcmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV1dO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXMuZm9yRWFjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGV4dENvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmIGVycm9yLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGdsb2JhbFRyYW5zbGF0ZVtlcnJvci5tZXNzYWdlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3JdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1lc3NhZ2VzU2V0Lmhhcyh0ZXh0Q29udGVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlc1NldC5hZGQodGV4dENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR1bC5hcHBlbmQoJCgnPGxpPicpLnRleHQodGV4dENvbnRlbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCR1bCk7XG4gICAgICAgICAgICAkKCcjc3VibWl0YnV0dG9uJykuYmVmb3JlKCRkaXYpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHZhbGlkYXRpb24gcnVsZXMgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBpbml0UnVsZXMoKSB7XG4gICAgICAgIC8vIFNTSFBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M7XG4gICAgICAgIH0gZWxzZSBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZWJBZG1pblBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5XZWJBZG1pblBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LndlYkFkbWluUGFzc3dvcmRSdWxlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgY2VydGlmaWNhdGUgZGV0YWlscyBIVE1MXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNlcnRJbmZvIC0gQ2VydGlmaWNhdGUgaW5mb3JtYXRpb24gb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgY2VydGlmaWNhdGUgZGV0YWlsc1xuICAgICAqL1xuICAgIHJlbmRlckNlcnRpZmljYXRlRGV0YWlscyhjZXJ0SW5mbykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwiY2VydC1kZXRhaWxzXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7IG1hcmdpbi10b3A6MTBweDtcIj4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGxpc3RcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gU3ViamVjdFxuICAgICAgICBpZiAoY2VydEluZm8uc3ViamVjdCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPlN1YmplY3Q6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uc3ViamVjdCl9PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSXNzdWVyXG4gICAgICAgIGlmIChjZXJ0SW5mby5pc3N1ZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5Jc3N1ZXI6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uaXNzdWVyKX1gO1xuICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnIDxzcGFuIGNsYXNzPVwidWkgdGlueSBsYWJlbFwiPlNlbGYtc2lnbmVkPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGl0eSBwZXJpb2RcbiAgICAgICAgaWYgKGNlcnRJbmZvLnZhbGlkX2Zyb20gJiYgY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5WYWxpZDo8L3N0cm9uZz4gJHtjZXJ0SW5mby52YWxpZF9mcm9tfSB0byAke2NlcnRJbmZvLnZhbGlkX3RvfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV4cGlyeSBzdGF0dXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IHJlZCBsYWJlbFwiPkNlcnRpZmljYXRlIEV4cGlyZWQ8L3NwYW4+PC9kaXY+JztcbiAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgeWVsbG93IGxhYmVsXCI+RXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSBncmVlbiBsYWJlbFwiPlZhbGlkIGZvciAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN1YmplY3QgQWx0ZXJuYXRpdmUgTmFtZXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLnNhbiAmJiBjZXJ0SW5mby5zYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPkFsdGVybmF0aXZlIE5hbWVzOjwvc3Ryb25nPic7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBsaXN0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDoxMHB4O1wiPic7XG4gICAgICAgICAgICBjZXJ0SW5mby5zYW4uZm9yRWFjaChzYW4gPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChzYW4pfTwvZGl2PmA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIGxpc3RcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2Ugc2VnbWVudFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBjZXJ0LWRldGFpbHNcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBBTUkvQUpBTSBkZXBlbmRlbmN5XG4gICAgICogQUpBTSByZXF1aXJlcyBBTUkgdG8gYmUgZW5hYmxlZCBzaW5jZSBpdCdzIGFuIEhUVFAgd3JhcHBlciBvdmVyIEFNSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSgpIHtcbiAgICAgICAgY29uc3QgJGFtaUNoZWNrYm94ID0gJCgnI0FNSUVuYWJsZWQnKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBjb25zdCAkYWphbUNoZWNrYm94ID0gJCgnI0FKQU1FbmFibGVkJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYW1pQ2hlY2tib3gubGVuZ3RoID09PSAwIHx8ICRhamFtQ2hlY2tib3gubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZ1bmN0aW9uIHRvIHVwZGF0ZSBBSkFNIHN0YXRlIGJhc2VkIG9uIEFNSSBzdGF0ZVxuICAgICAgICBjb25zdCB1cGRhdGVBSkFNU3RhdGUgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc0FNSUVuYWJsZWQgPSAkYW1pQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFpc0FNSUVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBBTUkgaXMgZGlzYWJsZWQsIGRpc2FibGUgQUpBTSBhbmQgbWFrZSBpdCByZWFkLW9ubHlcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgdG9vbHRpcCB0byBleHBsYWluIHdoeSBpdCdzIGRpc2FibGVkXG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTVJlcXVpcmVzQU1JKTtcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmF0dHIoJ2RhdGEtcG9zaXRpb24nLCAndG9wIGxlZnQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgQU1JIGlzIGVuYWJsZWQsIGFsbG93IEFKQU0gdG8gYmUgdG9nZ2xlZFxuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3gucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5yZW1vdmVBdHRyKCdkYXRhLXRvb2x0aXAnKTtcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LnJlbW92ZUF0dHIoJ2RhdGEtcG9zaXRpb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWwgc3RhdGVcbiAgICAgICAgdXBkYXRlQUpBTVN0YXRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMaXN0ZW4gZm9yIEFNSSBjaGVja2JveCBjaGFuZ2VzIHVzaW5nIGV2ZW50IGRlbGVnYXRpb25cbiAgICAgICAgLy8gVGhpcyB3b24ndCBvdmVycmlkZSBleGlzdGluZyBoYW5kbGVyc1xuICAgICAgICAkKCcjQU1JRW5hYmxlZCcpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHVwZGF0ZUFKQU1TdGF0ZSgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFBCWExhbmd1YWdlIGNoYW5nZSBkZXRlY3Rpb24gZm9yIHJlc3RhcnQgd2FybmluZ1xuICAgICAqIFNob3dzIHJlc3RhcnQgd2FybmluZyBvbmx5IHdoZW4gdGhlIGxhbmd1YWdlIHZhbHVlIGNoYW5nZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nKCkge1xuICAgICAgICBjb25zdCAkbGFuZ3VhZ2VJbnB1dCA9ICQoJyNQQlhMYW5ndWFnZScpOyAgLy8gSGlkZGVuIGlucHV0XG4gICAgICAgIGNvbnN0ICRsYW5ndWFnZURyb3Bkb3duID0gJCgnI1BCWExhbmd1YWdlLWRyb3Bkb3duJyk7ICAvLyBWNS4wIHBhdHRlcm4gZHJvcGRvd25cbiAgICAgICAgY29uc3QgJHJlc3RhcnRXYXJuaW5nID0gJCgnI3Jlc3RhcnQtd2FybmluZy1QQlhMYW5ndWFnZScpO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHZhbHVlIGFuZCBkYXRhIGxvYWRlZCBmbGFnXG4gICAgICAgIGxldCBvcmlnaW5hbFZhbHVlID0gbnVsbDtcbiAgICAgICAgbGV0IGlzRGF0YUxvYWRlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIEhpZGUgd2FybmluZyBpbml0aWFsbHlcbiAgICAgICAgJHJlc3RhcnRXYXJuaW5nLmhpZGUoKTtcblxuICAgICAgICAvLyBTZXQgb3JpZ2luYWwgdmFsdWUgYWZ0ZXIgZGF0YSBsb2Fkc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignR2VuZXJhbFNldHRpbmdzLmRhdGFMb2FkZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBvcmlnaW5hbFZhbHVlID0gJGxhbmd1YWdlSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBpc0RhdGFMb2FkZWQgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZHJvcGRvd24gY2hhbmdlIGV2ZW50IC0gdXNlIFY1LjAgZHJvcGRvd24gc2VsZWN0b3JcbiAgICAgICAgJGxhbmd1YWdlRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNlbWFudGljVUlEcm9wZG93biBhdXRvbWF0aWNhbGx5IHN5bmNzIGhpZGRlbiBpbnB1dCB2YWx1ZVxuICAgICAgICAgICAgICAgIC8vIE5vIG5lZWQgdG8gbWFudWFsbHkgdXBkYXRlICRsYW5ndWFnZUlucHV0XG5cbiAgICAgICAgICAgICAgICAvLyBPbmx5IHNob3cgd2FybmluZyBhZnRlciBkYXRhIGlzIGxvYWRlZCBhbmQgdmFsdWUgY2hhbmdlZCBmcm9tIG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgaWYgKGlzRGF0YUxvYWRlZCAmJiBvcmlnaW5hbFZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSBvcmlnaW5hbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICRyZXN0YXJ0V2FybmluZy50cmFuc2l0aW9uKCdmYWRlIGluJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0RhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJlc3RhcnRXYXJuaW5nLnRyYW5zaXRpb24oJ2ZhZGUgb3V0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gb25seSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGlmIChpc0RhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIFJFU1QgQVBJIG1vZGVcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBHZW5lcmFsU2V0dGluZ3NBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlU2V0dGluZ3MnO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb24gZm9yIGNsZWFuZXIgQVBJIHJlcXVlc3RzXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIEVuYWJsZSBzZW5kaW5nIG9ubHkgY2hhbmdlZCBmaWVsZHMgZm9yIG9wdGltYWwgUEFUQ0ggc2VtYW50aWNzXG4gICAgICAgIEZvcm0uc2VuZE9ubHlDaGFuZ2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBObyByZWRpcmVjdCBhZnRlciBzYXZlIC0gc3RheSBvbiB0aGUgc2FtZSBwYWdlXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IG51bGw7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBudWxsO1xuICAgICAgICBGb3JtLnVybCA9IGAjYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZ2VuZXJhbFNldHRpbmdzIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=