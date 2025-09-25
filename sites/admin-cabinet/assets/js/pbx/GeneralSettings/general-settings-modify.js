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


      _$container.find('.private-key-set, #WEBHTTPSPrivateKey_new').remove(); // Check if private key exists (password masking logic)
      // The field will contain 'xxxxxxx' if a private key is set


      var currentValue = $certPrivKeyField.val();
      var hasValue = currentValue === generalSettingsModify.hiddenPassword;

      if (hasValue) {
        // Hide original field and show status message
        $certPrivKeyField.hide();

        var _displayHtml = "\n                    <div class=\"ui info message private-key-set\">\n                        <p>\n                            <i class=\"lock icon\"></i>\n                            ".concat(globalTranslate.gs_PrivateKeyIsSet, "\n                            <a href=\"#\" class=\"replace-key-link\">").concat(globalTranslate.gs_Replace, "</a>\n                        </p>\n                    </div>\n                    <textarea id=\"WEBHTTPSPrivateKey_new\" name=\"WEBHTTPSPrivateKey\" \n                              rows=\"10\"\n                              style=\"display:none;\" \n                              placeholder=\"").concat(globalTranslate.gs_PastePrivateKey, "\"></textarea>\n                ");

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJjb2RlY3NDaGFuZ2VkIiwiZGF0YUxvYWRlZCIsInZhbGlkYXRlUnVsZXMiLCJwYnhuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lIiwiV2ViQWRtaW5QYXNzd29yZCIsIldlYkFkbWluUGFzc3dvcmRSZXBlYXQiLCJnc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50IiwiU1NIUGFzc3dvcmQiLCJTU0hQYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJXRUJQb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJXRUJIVFRQU1BvcnQiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0IiwiQUpBTVBvcnQiLCJnc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSIsIlNJUEF1dGhQcmVmaXgiLCJnc19TSVBBdXRoUHJlZml4SW52YWxpZCIsIndlYkFkbWluUGFzc3dvcmRSdWxlcyIsImdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkIiwidmFsdWUiLCJnc19QYXNzd29yZHMiLCJwc3dfUGFzc3dvcmROb0xvd1NpbXZvbCIsInBzd19QYXNzd29yZE5vTnVtYmVycyIsInBzd19QYXNzd29yZE5vVXBwZXJTaW12b2wiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3MiLCJnc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQiLCJnc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCIsImdzX1NTSFBhc3N3b3JkIiwiYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3MiLCJjbGlwYm9hcmQiLCJpbml0aWFsaXplIiwibGVuZ3RoIiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwiY29udGV4dCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwidmFsaWRhdGVPbklucHV0Iiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwiY2hlY2tPbkxvYWQiLCJzc2hXaWRnZXQiLCJvbiIsImlzRGlzYWJsZWQiLCJjaGVja2JveCIsImhpZGVXYXJuaW5ncyIsImVsZW1lbnRzIiwiJHNjb3JlU2VjdGlvbiIsImhpZGUiLCJjaGVja1Bhc3N3b3JkIiwidmFsIiwiaW5pdFJ1bGVzIiwiZmluZCIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmciLCJub3QiLCJkcm9wZG93biIsImluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcyIsImluaXRpYWxpemVDbGlwYm9hcmQiLCJzaG93SGlkZVNTSFBhc3N3b3JkIiwid2luZG93IiwiZXZlbnQiLCJuYW1lVGFiIiwiR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJsb2FkRGF0YSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMiLCJGb3JtIiwic2hvd0xvYWRpbmdTdGF0ZSIsIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsInBhc3N3b3JkVmFsaWRhdGlvbiIsInNldFRpbWVvdXQiLCJzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MiLCJtZXNzYWdlcyIsImNvbnNvbGUiLCJlcnJvciIsInNob3dBcGlFcnJvciIsInNldHRpbmdzIiwiY29kZWNzIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJwb3B1bGF0ZVNwZWNpYWxGaWVsZHMiLCJsb2FkU291bmRGaWxlVmFsdWVzIiwidXBkYXRlQ29kZWNUYWJsZXMiLCJpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNzaEtleXNUYWJsZSIsImRvY3VtZW50IiwidHJpZ2dlciIsIldFQkhUVFBTUHVibGljS2V5X2luZm8iLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsIiRjaGVja2JveCIsImlzQ2hlY2tlZCIsIiRkcm9wZG93biIsImhhc0NsYXNzIiwiZm9ybSIsImVycm9yTWVzc2FnZSIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInZhbGlkYXRpb24iLCJyZW1vdmUiLCJpc0RlZmF1bHRXZWJQYXNzd29yZCIsIiR3ZWJQYXNzd29yZEZpZWxkcyIsImNsb3Nlc3QiLCJ3YXJuaW5nSHRtbCIsInBzd19TZXRQYXNzd29yZCIsInBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmQiLCJiZWZvcmUiLCJpc0RlZmF1bHRTU0hQYXNzd29yZCIsInNzaFBhc3N3b3JkRGlzYWJsZWQiLCIkc3NoUGFzc3dvcmRGaWVsZHMiLCJkYXRhSW4iLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJkYXRhT3V0IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IiwiYXVkaW9Db2RlY3MiLCJmaWx0ZXIiLCJjIiwic29ydCIsImEiLCJiIiwicHJpb3JpdHkiLCJ2aWRlb0NvZGVjcyIsImJ1aWxkQ29kZWNUYWJsZSIsInNob3ciLCJpbml0aWFsaXplQ29kZWNEcmFnRHJvcCIsIiR0YWJsZUJvZHkiLCJlbXB0eSIsImNvZGVjIiwiaW5kZXgiLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGVja2VkIiwicm93SHRtbCIsImVzY2FwZUh0bWwiLCJkZXNjcmlwdGlvbiIsImFwcGVuZCIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkIiwiJGNlcnRQdWJLZXlGaWVsZCIsImZ1bGxWYWx1ZSIsIiRjb250YWluZXIiLCJjZXJ0SW5mbyIsImRpc3BsYXlUZXh0IiwicGFydHMiLCJzdWJqZWN0IiwicHVzaCIsImlzc3VlciIsImlzX3NlbGZfc2lnbmVkIiwidmFsaWRfdG8iLCJpc19leHBpcmVkIiwiZGF5c191bnRpbF9leHBpcnkiLCJ0cnVuY2F0ZUNlcnRpZmljYXRlIiwic3RhdHVzQ2xhc3MiLCJkaXNwbGF5SHRtbCIsImJ0X1Rvb2xUaXBDb3B5Q2VydCIsImJ0X1Rvb2xUaXBDZXJ0SW5mbyIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsInJlbmRlckNlcnRpZmljYXRlRGV0YWlscyIsImdzX1Bhc3RlUHVibGljQ2VydCIsImJ0X1NhdmUiLCJidF9DYW5jZWwiLCJlIiwicHJldmVudERlZmF1bHQiLCIkZGV0YWlscyIsInNsaWRlVG9nZ2xlIiwiZm9jdXMiLCJuZXdWYWx1ZSIsImNoZWNrVmFsdWVzIiwicG9wdXAiLCJkZXN0cm95IiwiYXR0ciIsIm9mZiIsIiRzc2hQdWJLZXlGaWVsZCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiYnRfVG9vbFRpcENvcHlLZXkiLCJidF9Ub29sVGlwRXhwYW5kIiwiJGZ1bGxEaXNwbGF5IiwiJHRydW5jYXRlZERpc3BsYXkiLCIkaWNvbiIsImlzIiwiYWRkQ2xhc3MiLCJnc19Ob1NTSFB1YmxpY0tleSIsIiRjZXJ0UHJpdktleUZpZWxkIiwiY3VycmVudFZhbHVlIiwiaGFzVmFsdWUiLCJnc19Qcml2YXRlS2V5SXNTZXQiLCJnc19SZXBsYWNlIiwiZ3NfUGFzdGVQcml2YXRlS2V5IiwiJG5ld0ZpZWxkIiwiQ2xpcGJvYXJkSlMiLCIkYnRuIiwib3JpZ2luYWxJY29uIiwiY2xlYXJTZWxlY3Rpb24iLCJnc19Db3B5RmFpbGVkIiwic3BsaXQiLCJrZXlUeXBlIiwia2V5RGF0YSIsImNvbW1lbnQiLCJzbGljZSIsInN1YnN0cmluZyIsInRyaW0iLCJjZXJ0IiwibGluZXMiLCJsaW5lIiwiZmlyc3RMaW5lIiwibGFzdExpbmUiLCJpbmNsdWRlcyIsImNsZWFuQ2VydCIsInJlcGxhY2UiLCJ0ZXh0IiwibWFwIiwibSIsImNiQmVmb3JlU2VuZEZvcm0iLCJXRUJIVFRQU1ByaXZhdGVLZXkiLCJ1bmRlZmluZWQiLCJwcml2YXRlS2V5VmFsdWUiLCJXRUJIVFRQU1B1YmxpY0tleSIsImZpZWxkc1RvUmVtb3ZlIiwic3RhcnRzV2l0aCIsInNob3VsZFByb2Nlc3NDb2RlY3MiLCJzZW5kT25seUNoYW5nZWQiLCJhcnJDb2RlY3MiLCJlYWNoIiwiY3VycmVudEluZGV4Iiwib2JqIiwiY29kZWNOYW1lIiwiY3VycmVudERpc2FibGVkIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsImdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbCIsImZhZGVPdXQiLCJnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwiLCJjaGVja0RlbGV0ZUNvbmRpdGlvbnMiLCIkZGl2IiwiaWQiLCIkaGVhZGVyIiwiZ3NfRXJyb3JTYXZlU2V0dGluZ3MiLCIkdWwiLCJtZXNzYWdlc1NldCIsIlNldCIsIm1zZ1R5cGUiLCJ0ZXh0Q29udGVudCIsIm1lc3NhZ2UiLCJoYXMiLCJhZGQiLCJodG1sIiwidmFsaWRfZnJvbSIsInNhbiIsIiRhbWlDaGVja2JveCIsIiRhamFtQ2hlY2tib3giLCJ1cGRhdGVBSkFNU3RhdGUiLCJpc0FNSUVuYWJsZWQiLCJnc19BSkFNUmVxdWlyZXNBTUkiLCJyZW1vdmVBdHRyIiwiJGxhbmd1YWdlSW5wdXQiLCIkbGFuZ3VhZ2VEcm9wZG93biIsIiRyZXN0YXJ0V2FybmluZyIsIm9yaWdpbmFsVmFsdWUiLCJpc0RhdGFMb2FkZWQiLCJ0cmFuc2l0aW9uIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwidXJsIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUdBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHFCQUFxQixHQUFHO0FBQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHdCQUFELENBTGU7O0FBTzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFRCxDQUFDLENBQUMsbUJBQUQsQ0FYTTs7QUFhMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsWUFBWSxFQUFFRixDQUFDLENBQUMsY0FBRCxDQWpCVzs7QUFtQjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLG1CQUFtQixFQUFFSCxDQUFDLENBQUMsMkJBQUQsQ0FBRCxDQUErQkksTUFBL0IsQ0FBc0MsV0FBdEMsQ0F2Qks7O0FBeUIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxtQkFBbUIsRUFBRUwsQ0FBQyxDQUFDLDJCQUFELENBN0JJOztBQStCMUI7QUFDSjtBQUNBO0FBQ0lNLEVBQUFBLGNBQWMsRUFBRSxTQWxDVTs7QUFvQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGVBQWUsRUFBRTtBQUNiQyxJQUFBQSxjQUFjLEVBQUUseUJBREg7QUFFYkMsSUFBQUEsZUFBZSxFQUFFO0FBRkosR0F4Q1M7O0FBNkMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRSxFQWpETTs7QUFtRDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxLQXZEVzs7QUF5RDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxLQTdEYzs7QUErRDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQUU7QUFDYkMsSUFBQUEsT0FBTyxFQUFFO0FBQ0xDLE1BQUFBLFVBQVUsRUFBRSxTQURQO0FBRUxDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkYsS0FERTtBQVVYQyxJQUFBQSxnQkFBZ0IsRUFBRTtBQUNkTixNQUFBQSxVQUFVLEVBQUUsa0JBREU7QUFFZEMsTUFBQUEsS0FBSyxFQUFFO0FBRk8sS0FWUDtBQWNYTSxJQUFBQSxzQkFBc0IsRUFBRTtBQUNwQlAsTUFBQUEsVUFBVSxFQUFFLHdCQURRO0FBRXBCQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUseUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNJO0FBRjVCLE9BREc7QUFGYSxLQWRiO0FBdUJYQyxJQUFBQSxXQUFXLEVBQUU7QUFDVFQsTUFBQUEsVUFBVSxFQUFFLGFBREg7QUFFVEMsTUFBQUEsS0FBSyxFQUFFO0FBRkUsS0F2QkY7QUEyQlhTLElBQUFBLGlCQUFpQixFQUFFO0FBQ2ZWLE1BQUFBLFVBQVUsRUFBRSxtQkFERztBQUVmQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsb0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNPO0FBRjVCLE9BREc7QUFGUSxLQTNCUjtBQW9DWEMsSUFBQUEsT0FBTyxFQUFFO0FBQ0xaLE1BQUFBLFVBQVUsRUFBRSxTQURQO0FBRUxDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxtQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1M7QUFGNUIsT0FERyxFQUtIO0FBQ0lYLFFBQUFBLElBQUksRUFBRSx5QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1U7QUFGNUIsT0FMRyxFQVNIO0FBQ0laLFFBQUFBLElBQUksRUFBRSx3QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1c7QUFGNUIsT0FURyxFQWFIO0FBQ0liLFFBQUFBLElBQUksRUFBRSxxQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1k7QUFGNUIsT0FiRztBQUZGLEtBcENFO0FBeURYQyxJQUFBQSxZQUFZLEVBQUU7QUFDVmpCLE1BQUFBLFVBQVUsRUFBRSxjQURGO0FBRVZDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxtQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2M7QUFGNUIsT0FERyxFQUtIO0FBQ0loQixRQUFBQSxJQUFJLEVBQUUsb0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNVO0FBRjVCLE9BTEcsRUFTSDtBQUNJWixRQUFBQSxJQUFJLEVBQUUsd0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNlO0FBRjVCLE9BVEcsRUFhSDtBQUNJakIsUUFBQUEsSUFBSSxFQUFFLHFCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDZ0I7QUFGNUIsT0FiRztBQUZHLEtBekRIO0FBOEVYQyxJQUFBQSxRQUFRLEVBQUU7QUFDTnJCLE1BQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxtQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2tCO0FBRjVCLE9BREcsRUFLSDtBQUNJcEIsUUFBQUEsSUFBSSxFQUFFLHdCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDa0I7QUFGNUIsT0FMRztBQUZELEtBOUVDO0FBMkZYQyxJQUFBQSxhQUFhLEVBQUU7QUFDWHZCLE1BQUFBLFVBQVUsRUFBRSxlQUREO0FBRVhDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSx1QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ29CO0FBRjVCLE9BREc7QUFGSTtBQTNGSixHQXBFVztBQTBLMUI7QUFDQUMsRUFBQUEscUJBQXFCLEVBQUUsQ0FDbkI7QUFDSXZCLElBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDc0I7QUFGNUIsR0FEbUIsRUFLbkI7QUFDSXhCLElBQUFBLElBQUksRUFBRSxjQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDdUI7QUFGNUIsR0FMbUIsRUFTbkI7QUFDSXpCLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsT0FGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ3lCLFlBQXhCLEdBQXVDLFFBQXZDLEdBQWtEekIsZUFBZSxDQUFDMEI7QUFIOUUsR0FUbUIsRUFjbkI7QUFDSTVCLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsSUFGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ3lCLFlBQXhCLEdBQXVDLFFBQXZDLEdBQWtEekIsZUFBZSxDQUFDMkI7QUFIOUUsR0FkbUIsRUFtQm5CO0FBQ0k3QixJQUFBQSxJQUFJLEVBQUUsV0FEVjtBQUVJMEIsSUFBQUEsS0FBSyxFQUFFLE9BRlg7QUFHSXpCLElBQUFBLE1BQU0sRUFBRSxRQUFRQyxlQUFlLENBQUN5QixZQUF4QixHQUF1QyxRQUF2QyxHQUFrRHpCLGVBQWUsQ0FBQzRCO0FBSDlFLEdBbkJtQixDQTNLRztBQW9NMUI7QUFDQUMsRUFBQUEsMkJBQTJCLEVBQUUsQ0FDekI7QUFDSS9CLElBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDOEI7QUFGNUIsR0FEeUIsRUFLekI7QUFDSWhDLElBQUFBLElBQUksRUFBRSxjQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDK0I7QUFGNUIsR0FMeUIsRUFTekI7QUFDSWpDLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsT0FGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ2dDLGNBQXhCLEdBQXlDLFFBQXpDLEdBQW9EaEMsZUFBZSxDQUFDMEI7QUFIaEYsR0FUeUIsRUFjekI7QUFDSTVCLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsSUFGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ2dDLGNBQXhCLEdBQXlDLFFBQXpDLEdBQW9EaEMsZUFBZSxDQUFDMkI7QUFIaEYsR0FkeUIsRUFtQnpCO0FBQ0k3QixJQUFBQSxJQUFJLEVBQUUsV0FEVjtBQUVJMEIsSUFBQUEsS0FBSyxFQUFFLE9BRlg7QUFHSXpCLElBQUFBLE1BQU0sRUFBRSxRQUFRQyxlQUFlLENBQUNnQyxjQUF4QixHQUF5QyxRQUF6QyxHQUFvRGhDLGVBQWUsQ0FBQzRCO0FBSGhGLEdBbkJ5QixDQXJNSDtBQStOMUI7QUFDQUssRUFBQUEsNkJBQTZCLEVBQUUsQ0FDM0I7QUFDSW5DLElBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDOEI7QUFGNUIsR0FEMkIsRUFLM0I7QUFDSWhDLElBQUFBLElBQUksRUFBRSxjQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDK0I7QUFGNUIsR0FMMkIsQ0FoT0w7O0FBMk8xQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxTQUFTLEVBQUUsSUEvT2U7O0FBaVAxQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFwUDBCLHdCQW9QYjtBQUVUO0FBQ0E7QUFDQSxRQUFJeEQscUJBQXFCLENBQUNHLGlCQUF0QixDQUF3Q3NELE1BQXhDLEdBQWlELENBQXJELEVBQXdEO0FBQ3BEQyxNQUFBQSxjQUFjLENBQUNDLElBQWYsQ0FBb0IzRCxxQkFBcUIsQ0FBQ0csaUJBQTFDLEVBQTZEO0FBQ3pEeUQsUUFBQUEsT0FBTyxFQUFFLGFBRGdEO0FBRXpEQyxRQUFBQSxjQUFjLEVBQUUsS0FGeUM7QUFFMUI7QUFDL0JDLFFBQUFBLGtCQUFrQixFQUFFLEtBSHFDO0FBRzFCO0FBQy9CQyxRQUFBQSxlQUFlLEVBQUUsS0FKd0M7QUFJekI7QUFDaENDLFFBQUFBLGVBQWUsRUFBRSxJQUx3QztBQU16REMsUUFBQUEsZUFBZSxFQUFFLElBTndDO0FBT3pEQyxRQUFBQSxZQUFZLEVBQUUsSUFQMkM7QUFRekRDLFFBQUFBLFdBQVcsRUFBRTtBQVI0QyxPQUE3RDtBQVVILEtBZlEsQ0FpQlQ7OztBQUNBLFFBQUluRSxxQkFBcUIsQ0FBQ0ksWUFBdEIsQ0FBbUNxRCxNQUFuQyxHQUE0QyxDQUFoRCxFQUFtRDtBQUMvQyxVQUFNVyxTQUFTLEdBQUdWLGNBQWMsQ0FBQ0MsSUFBZixDQUFvQjNELHFCQUFxQixDQUFDSSxZQUExQyxFQUF3RDtBQUN0RXdELFFBQUFBLE9BQU8sRUFBRSxhQUQ2RDtBQUV0RUMsUUFBQUEsY0FBYyxFQUFFLEtBRnNEO0FBRXZDO0FBQy9CQyxRQUFBQSxrQkFBa0IsRUFBRSxLQUhrRDtBQUd2QztBQUMvQkMsUUFBQUEsZUFBZSxFQUFFLEtBSnFEO0FBSXRDO0FBQ2hDQyxRQUFBQSxlQUFlLEVBQUUsSUFMcUQ7QUFNdEVDLFFBQUFBLGVBQWUsRUFBRSxJQU5xRDtBQU90RUMsUUFBQUEsWUFBWSxFQUFFLElBUHdEO0FBUXRFQyxRQUFBQSxXQUFXLEVBQUU7QUFSeUQsT0FBeEQsQ0FBbEIsQ0FEK0MsQ0FZL0M7O0FBQ0FqRSxNQUFBQSxDQUFDLENBQUMsMkJBQUQsQ0FBRCxDQUErQm1FLEVBQS9CLENBQWtDLFFBQWxDLEVBQTRDLFlBQU07QUFDOUMsWUFBTUMsVUFBVSxHQUFHcEUsQ0FBQyxDQUFDLDJCQUFELENBQUQsQ0FBK0JxRSxRQUEvQixDQUF3QyxZQUF4QyxDQUFuQjs7QUFDQSxZQUFJRCxVQUFVLElBQUlGLFNBQWxCLEVBQTZCO0FBQ3pCVixVQUFBQSxjQUFjLENBQUNjLFlBQWYsQ0FBNEJKLFNBQTVCOztBQUNBLGNBQUlBLFNBQVMsQ0FBQ0ssUUFBVixDQUFtQkMsYUFBdkIsRUFBc0M7QUFDbENOLFlBQUFBLFNBQVMsQ0FBQ0ssUUFBVixDQUFtQkMsYUFBbkIsQ0FBaUNDLElBQWpDO0FBQ0g7QUFDSixTQUxELE1BS08sSUFBSSxDQUFDTCxVQUFELElBQWVGLFNBQW5CLEVBQThCO0FBQ2pDVixVQUFBQSxjQUFjLENBQUNrQixhQUFmLENBQTZCUixTQUE3QjtBQUNIO0FBQ0osT0FWRDtBQVdILEtBMUNRLENBNENUOzs7QUFDQXBFLElBQUFBLHFCQUFxQixDQUFDRyxpQkFBdEIsQ0FBd0NrRSxFQUF4QyxDQUEyQyxRQUEzQyxFQUFxRCxZQUFNO0FBQ3ZELFVBQUlyRSxxQkFBcUIsQ0FBQ0csaUJBQXRCLENBQXdDMEUsR0FBeEMsT0FBa0Q3RSxxQkFBcUIsQ0FBQ1EsY0FBNUUsRUFBNEY7QUFDeEZSLFFBQUFBLHFCQUFxQixDQUFDOEUsU0FBdEI7QUFDSDtBQUNKLEtBSkQ7QUFNQTlFLElBQUFBLHFCQUFxQixDQUFDSSxZQUF0QixDQUFtQ2lFLEVBQW5DLENBQXNDLFFBQXRDLEVBQWdELFlBQU07QUFDbEQsVUFBSXJFLHFCQUFxQixDQUFDSSxZQUF0QixDQUFtQ3lFLEdBQW5DLE9BQTZDN0UscUJBQXFCLENBQUNRLGNBQXZFLEVBQXVGO0FBQ25GUixRQUFBQSxxQkFBcUIsQ0FBQzhFLFNBQXRCO0FBQ0g7QUFDSixLQUpELEVBbkRTLENBeURUOztBQUNBNUUsSUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEI2RSxJQUE1QixDQUFpQyxPQUFqQyxFQUEwQ0MsR0FBMUMsQ0FBOEM7QUFDMUNDLE1BQUFBLE9BQU8sRUFBRSxJQURpQztBQUUxQ0MsTUFBQUEsV0FBVyxFQUFFO0FBRjZCLEtBQTlDLEVBMURTLENBK0RUO0FBQ0E7O0FBQ0FsRixJQUFBQSxxQkFBcUIsQ0FBQ21GLDRCQUF0QixHQWpFUyxDQW1FVDtBQUNBOztBQUNBakYsSUFBQUEsQ0FBQyxDQUFDLGtDQUFELENBQUQsQ0FDS2tGLEdBREwsQ0FDUyx1QkFEVCxFQUVLQSxHQUZMLENBRVMsdUJBRlQsRUFHS0MsUUFITCxHQXJFUyxDQTBFVDs7QUFDQW5GLElBQUFBLENBQUMsQ0FBQyxrQ0FBRCxDQUFELENBQXNDcUUsUUFBdEMsR0EzRVMsQ0E2RVQ7O0FBQ0F2RSxJQUFBQSxxQkFBcUIsQ0FBQ3NGLDJCQUF0QixHQTlFUyxDQWdGVDtBQUNBO0FBRUE7QUFDQTtBQUVBOztBQUNBdEYsSUFBQUEscUJBQXFCLENBQUN1RixjQUF0QixHQXZGUyxDQXlGVDtBQUVBOztBQUNBdkYsSUFBQUEscUJBQXFCLENBQUN3Rix5QkFBdEIsR0E1RlMsQ0E4RlQ7O0FBQ0F4RixJQUFBQSxxQkFBcUIsQ0FBQ3lGLG1CQUF0QixHQS9GUyxDQWlHVDs7QUFDQXpGLElBQUFBLHFCQUFxQixDQUFDOEUsU0FBdEIsR0FsR1MsQ0FvR1Q7O0FBQ0E5RSxJQUFBQSxxQkFBcUIsQ0FBQ0ssbUJBQXRCLENBQTBDa0UsUUFBMUMsQ0FBbUQ7QUFDL0Msa0JBQVl2RSxxQkFBcUIsQ0FBQzBGO0FBRGEsS0FBbkQ7QUFHQTFGLElBQUFBLHFCQUFxQixDQUFDMEYsbUJBQXRCLEdBeEdTLENBMEdUOztBQUNBeEYsSUFBQUEsQ0FBQyxDQUFDeUYsTUFBRCxDQUFELENBQVV0QixFQUFWLENBQWEsZ0JBQWIsRUFBK0IsVUFBQ3VCLEtBQUQsRUFBUUMsT0FBUixFQUFvQjtBQUMvQzNGLE1BQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCNkUsSUFBNUIsQ0FBaUMsT0FBakMsRUFBMENDLEdBQTFDLENBQThDLFlBQTlDLEVBQTREYSxPQUE1RDtBQUNILEtBRkQsRUEzR1MsQ0ErR1Q7O0FBQ0EsUUFBSSxPQUFPQyw2QkFBUCxLQUF5QyxXQUE3QyxFQUEwRDtBQUN0REEsTUFBQUEsNkJBQTZCLENBQUN0QyxVQUE5QjtBQUNILEtBbEhRLENBb0hUO0FBRUE7QUFFQTs7O0FBQ0F4RCxJQUFBQSxxQkFBcUIsQ0FBQytGLFFBQXRCO0FBQ0gsR0E5V3lCOztBQWdYMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsNEJBdlgwQiwwQ0F1WEssQ0FDM0I7QUFDQTtBQUVBO0FBQ0E7QUFDSCxHQTdYeUI7O0FBK1gxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lELEVBQUFBLFFBcFkwQixzQkFvWWY7QUFDUDtBQUNBRSxJQUFBQSxJQUFJLENBQUNDLGdCQUFMLENBQXNCLElBQXRCLEVBQTRCLHFCQUE1QjtBQUVBQyxJQUFBQSxrQkFBa0IsQ0FBQ0MsV0FBbkIsQ0FBK0IsVUFBQ0MsUUFBRCxFQUFjO0FBQ3pDSixNQUFBQSxJQUFJLENBQUNLLGdCQUFMOztBQUVBLFVBQUlELFFBQVEsSUFBSUEsUUFBUSxDQUFDRSxNQUFyQixJQUErQkYsUUFBUSxDQUFDRyxJQUE1QyxFQUFrRDtBQUM5QztBQUNBeEcsUUFBQUEscUJBQXFCLENBQUN5RyxZQUF0QixDQUFtQ0osUUFBUSxDQUFDRyxJQUE1QztBQUNBeEcsUUFBQUEscUJBQXFCLENBQUNjLFVBQXRCLEdBQW1DLElBQW5DLENBSDhDLENBSzlDOztBQUNBLFlBQUl1RixRQUFRLENBQUNHLElBQVQsQ0FBY0Usa0JBQWxCLEVBQXNDO0FBQ2xDO0FBQ0FDLFVBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2IzRyxZQUFBQSxxQkFBcUIsQ0FBQzRHLDJCQUF0QixDQUFrRFAsUUFBUSxDQUFDRyxJQUFULENBQWNFLGtCQUFoRTtBQUNILFdBRlMsRUFFUCxHQUZPLENBQVY7QUFHSDtBQUNKLE9BWkQsTUFZTyxJQUFJTCxRQUFRLElBQUlBLFFBQVEsQ0FBQ1EsUUFBekIsRUFBbUM7QUFDdENDLFFBQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLFlBQWQsRUFBNEJWLFFBQVEsQ0FBQ1EsUUFBckMsRUFEc0MsQ0FFdEM7O0FBQ0E3RyxRQUFBQSxxQkFBcUIsQ0FBQ2dILFlBQXRCLENBQW1DWCxRQUFRLENBQUNRLFFBQTVDO0FBQ0g7QUFDSixLQXBCRDtBQXFCSCxHQTdaeUI7O0FBK1oxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSixFQUFBQSxZQW5hMEIsd0JBbWFiRCxJQW5hYSxFQW1hUDtBQUNmO0FBQ0EsUUFBTVMsUUFBUSxHQUFHVCxJQUFJLENBQUNTLFFBQUwsSUFBaUJULElBQWxDO0FBQ0EsUUFBTVUsTUFBTSxHQUFHVixJQUFJLENBQUNVLE1BQUwsSUFBZSxFQUE5QixDQUhlLENBS2Y7O0FBQ0FqQixJQUFBQSxJQUFJLENBQUNrQixvQkFBTCxDQUEwQkYsUUFBMUIsRUFBb0M7QUFDaENHLE1BQUFBLGFBQWEsRUFBRSx1QkFBQ0MsUUFBRCxFQUFjO0FBQ3pCO0FBQ0FySCxRQUFBQSxxQkFBcUIsQ0FBQ3NILHFCQUF0QixDQUE0Q0QsUUFBNUMsRUFGeUIsQ0FJekI7O0FBQ0FySCxRQUFBQSxxQkFBcUIsQ0FBQ3VILG1CQUF0QixDQUEwQ0YsUUFBMUMsRUFMeUIsQ0FPekI7O0FBQ0EsWUFBSUgsTUFBTSxDQUFDekQsTUFBUCxHQUFnQixDQUFwQixFQUF1QjtBQUNuQnpELFVBQUFBLHFCQUFxQixDQUFDd0gsaUJBQXRCLENBQXdDTixNQUF4QztBQUNILFNBVndCLENBWXpCOzs7QUFDQWxILFFBQUFBLHFCQUFxQixDQUFDeUgsd0JBQXRCLENBQStDSixRQUEvQyxFQWJ5QixDQWV6Qjs7QUFDQXJILFFBQUFBLHFCQUFxQixDQUFDMEYsbUJBQXRCLEdBaEJ5QixDQWtCekI7O0FBQ0ExRixRQUFBQSxxQkFBcUIsQ0FBQ0MsUUFBdEIsQ0FBK0J5SCxXQUEvQixDQUEyQyxTQUEzQyxFQW5CeUIsQ0FxQnpCOztBQUNBMUgsUUFBQUEscUJBQXFCLENBQUM4RSxTQUF0QjtBQUNIO0FBeEIrQixLQUFwQyxFQU5lLENBaUNmOztBQUNBLFFBQUltQixJQUFJLENBQUMwQixhQUFULEVBQXdCO0FBQ3BCMUIsTUFBQUEsSUFBSSxDQUFDMkIsaUJBQUw7QUFDSCxLQXBDYyxDQXNDZjs7O0FBQ0EsUUFBSSxPQUFPQyxZQUFQLEtBQXdCLFdBQTVCLEVBQXlDO0FBQ3JDQSxNQUFBQSxZQUFZLENBQUNyRSxVQUFiLENBQXdCLG9CQUF4QixFQUE4QyxtQkFBOUM7QUFDSCxLQXpDYyxDQTJDZjs7O0FBQ0F4RCxJQUFBQSxxQkFBcUIsQ0FBQ3dGLHlCQUF0QixHQTVDZSxDQThDZjs7QUFDQXRGLElBQUFBLENBQUMsQ0FBQzRILFFBQUQsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLDRCQUFwQjtBQUVILEdBcGR5Qjs7QUFzZDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lULEVBQUFBLHFCQTFkMEIsaUNBMGRKTCxRQTFkSSxFQTBkTTtBQUM1QjtBQUVBO0FBQ0EsUUFBSUEsUUFBUSxDQUFDZSxzQkFBYixFQUFxQztBQUNqQzlILE1BQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCc0csSUFBeEIsQ0FBNkIsV0FBN0IsRUFBMENTLFFBQVEsQ0FBQ2Usc0JBQW5EO0FBQ0gsS0FOMkIsQ0FRNUI7OztBQUNBQyxJQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWWpCLFFBQVosRUFBc0JrQixPQUF0QixDQUE4QixVQUFBQyxHQUFHLEVBQUk7QUFDakMsVUFBTUMsU0FBUyxHQUFHbkksQ0FBQyxZQUFLa0ksR0FBTCxFQUFELENBQWE5SCxNQUFiLENBQW9CLFdBQXBCLENBQWxCOztBQUNBLFVBQUkrSCxTQUFTLENBQUM1RSxNQUFWLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3RCLFlBQU02RSxTQUFTLEdBQUdyQixRQUFRLENBQUNtQixHQUFELENBQVIsS0FBa0IsSUFBbEIsSUFBMEJuQixRQUFRLENBQUNtQixHQUFELENBQVIsS0FBa0IsR0FBNUMsSUFBbURuQixRQUFRLENBQUNtQixHQUFELENBQVIsS0FBa0IsQ0FBdkY7QUFDQUMsUUFBQUEsU0FBUyxDQUFDOUQsUUFBVixDQUFtQitELFNBQVMsR0FBRyxPQUFILEdBQWEsU0FBekM7QUFDSCxPQUxnQyxDQU9qQzs7O0FBQ0EsVUFBTUMsU0FBUyxHQUFHckksQ0FBQyxZQUFLa0ksR0FBTCxFQUFELENBQWE5SCxNQUFiLENBQW9CLFdBQXBCLENBQWxCOztBQUNBLFVBQUlpSSxTQUFTLENBQUM5RSxNQUFWLEdBQW1CLENBQW5CLElBQXdCLENBQUM4RSxTQUFTLENBQUNDLFFBQVYsQ0FBbUIsc0JBQW5CLENBQTdCLEVBQXlFO0FBQ3JFRCxRQUFBQSxTQUFTLENBQUNsRCxRQUFWLENBQW1CLGNBQW5CLEVBQW1DNEIsUUFBUSxDQUFDbUIsR0FBRCxDQUEzQztBQUNIO0FBQ0osS0FaRDtBQWFILEdBaGZ5Qjs7QUFrZjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lYLEVBQUFBLHdCQXRmMEIsb0NBc2ZEUixRQXRmQyxFQXNmUztBQUMvQjtBQUNBLFFBQUlBLFFBQVEsQ0FBQzFGLGdCQUFULElBQTZCMEYsUUFBUSxDQUFDMUYsZ0JBQVQsS0FBOEIsRUFBL0QsRUFBbUU7QUFDL0R2QixNQUFBQSxxQkFBcUIsQ0FBQ0MsUUFBdEIsQ0FBK0J3SSxJQUEvQixDQUFvQyxXQUFwQyxFQUFpRCxrQkFBakQsRUFBcUV6SSxxQkFBcUIsQ0FBQ1EsY0FBM0Y7QUFDQVIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCd0ksSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsd0JBQWpELEVBQTJFekkscUJBQXFCLENBQUNRLGNBQWpHO0FBQ0g7O0FBRUQsUUFBSXlHLFFBQVEsQ0FBQ3ZGLFdBQVQsSUFBd0J1RixRQUFRLENBQUN2RixXQUFULEtBQXlCLEVBQXJELEVBQXlEO0FBQ3JEMUIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCd0ksSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsYUFBakQsRUFBZ0V6SSxxQkFBcUIsQ0FBQ1EsY0FBdEY7QUFDQVIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCd0ksSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsbUJBQWpELEVBQXNFekkscUJBQXFCLENBQUNRLGNBQTVGO0FBQ0g7QUFDSixHQWpnQnlCOztBQW1nQjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0l3RyxFQUFBQSxZQXZnQjBCLHdCQXVnQmJILFFBdmdCYSxFQXVnQkg7QUFDbkIsUUFBSUEsUUFBUSxDQUFDRSxLQUFiLEVBQW9CO0FBQ2hCLFVBQU0yQixZQUFZLEdBQUdDLEtBQUssQ0FBQ0MsT0FBTixDQUFjL0IsUUFBUSxDQUFDRSxLQUF2QixJQUNmRixRQUFRLENBQUNFLEtBQVQsQ0FBZThCLElBQWYsQ0FBb0IsSUFBcEIsQ0FEZSxHQUVmaEMsUUFBUSxDQUFDRSxLQUZmO0FBR0ErQixNQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0JMLFlBQXRCO0FBQ0g7QUFDSixHQTlnQnlCOztBQWdoQjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0k5QixFQUFBQSwyQkFwaEIwQix1Q0FvaEJFb0MsVUFwaEJGLEVBb2hCYztBQUNwQztBQUNBOUksSUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0IrSSxNQUF4QixHQUZvQyxDQUlwQzs7QUFDQSxRQUFJRCxVQUFVLENBQUNFLG9CQUFmLEVBQXFDO0FBQ2pDO0FBQ0EsVUFBSUMsa0JBQWtCLEdBQUdqSixDQUFDLENBQUMsbUJBQUQsQ0FBRCxDQUF1QmtKLE9BQXZCLENBQStCLGFBQS9CLENBQXpCOztBQUVBLFVBQUlELGtCQUFrQixDQUFDMUYsTUFBbkIsS0FBOEIsQ0FBbEMsRUFBcUM7QUFDakM7QUFDQTBGLFFBQUFBLGtCQUFrQixHQUFHakosQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJJLE1BQXZCLEdBQWdDQSxNQUFoQyxFQUFyQjtBQUNIOztBQUVELFVBQUk2SSxrQkFBa0IsQ0FBQzFGLE1BQW5CLEdBQTRCLENBQWhDLEVBQW1DO0FBQy9CO0FBQ0EsWUFBTTRGLFdBQVcsdVFBSWlCaEksZUFBZSxDQUFDaUksZUFKakMsb0RBS0FqSSxlQUFlLENBQUNrSSx5QkFMaEIsdUZBQWpCLENBRitCLENBWS9COztBQUNBSixRQUFBQSxrQkFBa0IsQ0FBQ0ssTUFBbkIsQ0FBMEJILFdBQTFCO0FBQ0g7QUFDSixLQTdCbUMsQ0ErQnBDOzs7QUFDQSxRQUFJTCxVQUFVLENBQUNTLG9CQUFmLEVBQXFDO0FBQ2pDO0FBQ0EsVUFBTUMsbUJBQW1CLEdBQUd4SixDQUFDLENBQUMsMkJBQUQsQ0FBRCxDQUErQnFFLFFBQS9CLENBQXdDLFlBQXhDLENBQTVCOztBQUVBLFVBQUksQ0FBQ21GLG1CQUFMLEVBQTBCO0FBQ3RCO0FBQ0EsWUFBSUMsa0JBQWtCLEdBQUd6SixDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCa0osT0FBbEIsQ0FBMEIsYUFBMUIsQ0FBekI7O0FBRUEsWUFBSU8sa0JBQWtCLENBQUNsRyxNQUFuQixLQUE4QixDQUFsQyxFQUFxQztBQUNqQztBQUNBa0csVUFBQUEsa0JBQWtCLEdBQUd6SixDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCSSxNQUFsQixHQUEyQkEsTUFBM0IsRUFBckI7QUFDSDs7QUFFRCxZQUFJcUosa0JBQWtCLENBQUNsRyxNQUFuQixHQUE0QixDQUFoQyxFQUFtQztBQUMvQjtBQUNBLGNBQU00RixZQUFXLHVSQUlpQmhJLGVBQWUsQ0FBQ2lJLGVBSmpDLHdEQUtBakksZUFBZSxDQUFDa0kseUJBTGhCLG1HQUFqQixDQUYrQixDQVkvQjs7O0FBQ0FJLFVBQUFBLGtCQUFrQixDQUFDSCxNQUFuQixDQUEwQkgsWUFBMUI7QUFDSDtBQUNKO0FBQ0o7QUFDSixHQWxsQnlCOztBQW9sQjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0k5QixFQUFBQSxtQkF4bEIwQiwrQkF3bEJOTixRQXhsQk0sRUF3bEJJO0FBQzFCO0FBQ0EsUUFBTTJDLE1BQU0scUJBQU8zQyxRQUFQLENBQVo7O0FBQ0EsUUFBSSxDQUFDQSxRQUFRLENBQUM0Qyx1QkFBVixJQUFxQzVDLFFBQVEsQ0FBQzRDLHVCQUFULEtBQXFDLEVBQTlFLEVBQWtGO0FBQzlFRCxNQUFBQSxNQUFNLENBQUNDLHVCQUFQLEdBQWlDLElBQWpDO0FBQ0gsS0FMeUIsQ0FPMUI7OztBQUNBQyxJQUFBQSxpQkFBaUIsQ0FBQ25HLElBQWxCLENBQXVCLHlCQUF2QixFQUFrRDtBQUM5Q29HLE1BQUFBLFFBQVEsRUFBRSxRQURvQztBQUU5Q0MsTUFBQUEsWUFBWSxFQUFFLElBRmdDO0FBRzlDeEQsTUFBQUEsSUFBSSxFQUFFb0QsTUFId0MsQ0FJOUM7O0FBSjhDLEtBQWxELEVBUjBCLENBZTFCOztBQUNBLFFBQU1LLE9BQU8scUJBQU9oRCxRQUFQLENBQWI7O0FBQ0EsUUFBSSxDQUFDQSxRQUFRLENBQUNpRCx3QkFBVixJQUFzQ2pELFFBQVEsQ0FBQ2lELHdCQUFULEtBQXNDLEVBQWhGLEVBQW9GO0FBQ2hGRCxNQUFBQSxPQUFPLENBQUNDLHdCQUFSLEdBQW1DLElBQW5DO0FBQ0gsS0FuQnlCLENBcUIxQjs7O0FBQ0FKLElBQUFBLGlCQUFpQixDQUFDbkcsSUFBbEIsQ0FBdUIsMEJBQXZCLEVBQW1EO0FBQy9Db0csTUFBQUEsUUFBUSxFQUFFLFFBRHFDO0FBRS9DQyxNQUFBQSxZQUFZLEVBQUUsSUFGaUM7QUFHL0N4RCxNQUFBQSxJQUFJLEVBQUV5RCxPQUh5QyxDQUkvQzs7QUFKK0MsS0FBbkQ7QUFNSCxHQXBuQnlCOztBQXNuQjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0l6QyxFQUFBQSxpQkExbkIwQiw2QkEwbkJSTixNQTFuQlEsRUEwbkJBO0FBQ3RCO0FBQ0FsSCxJQUFBQSxxQkFBcUIsQ0FBQ2EsYUFBdEIsR0FBc0MsS0FBdEMsQ0FGc0IsQ0FJdEI7O0FBQ0FiLElBQUFBLHFCQUFxQixDQUFDWSxrQkFBdEIsR0FBMkMsRUFBM0MsQ0FMc0IsQ0FPdEI7O0FBQ0EsUUFBTXVKLFdBQVcsR0FBR2pELE1BQU0sQ0FBQ2tELE1BQVAsQ0FBYyxVQUFBQyxDQUFDO0FBQUEsYUFBSUEsQ0FBQyxDQUFDbEosSUFBRixLQUFXLE9BQWY7QUFBQSxLQUFmLEVBQXVDbUosSUFBdkMsQ0FBNEMsVUFBQ0MsQ0FBRCxFQUFJQyxDQUFKO0FBQUEsYUFBVUQsQ0FBQyxDQUFDRSxRQUFGLEdBQWFELENBQUMsQ0FBQ0MsUUFBekI7QUFBQSxLQUE1QyxDQUFwQjtBQUNBLFFBQU1DLFdBQVcsR0FBR3hELE1BQU0sQ0FBQ2tELE1BQVAsQ0FBYyxVQUFBQyxDQUFDO0FBQUEsYUFBSUEsQ0FBQyxDQUFDbEosSUFBRixLQUFXLE9BQWY7QUFBQSxLQUFmLEVBQXVDbUosSUFBdkMsQ0FBNEMsVUFBQ0MsQ0FBRCxFQUFJQyxDQUFKO0FBQUEsYUFBVUQsQ0FBQyxDQUFDRSxRQUFGLEdBQWFELENBQUMsQ0FBQ0MsUUFBekI7QUFBQSxLQUE1QyxDQUFwQixDQVRzQixDQVd0Qjs7QUFDQXpLLElBQUFBLHFCQUFxQixDQUFDMkssZUFBdEIsQ0FBc0NSLFdBQXRDLEVBQW1ELE9BQW5ELEVBWnNCLENBY3RCOztBQUNBbkssSUFBQUEscUJBQXFCLENBQUMySyxlQUF0QixDQUFzQ0QsV0FBdEMsRUFBbUQsT0FBbkQsRUFmc0IsQ0FpQnRCOztBQUNBeEssSUFBQUEsQ0FBQyxDQUFDLDRDQUFELENBQUQsQ0FBZ0R3SCxXQUFoRCxDQUE0RCxRQUE1RDtBQUNBeEgsSUFBQUEsQ0FBQyxDQUFDLDBDQUFELENBQUQsQ0FBOEMwSyxJQUE5QyxHQW5Cc0IsQ0FxQnRCOztBQUNBNUssSUFBQUEscUJBQXFCLENBQUM2Syx1QkFBdEI7QUFDSCxHQWpwQnlCOztBQW1wQjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUYsRUFBQUEsZUF4cEIwQiwyQkF3cEJWekQsTUF4cEJVLEVBd3BCRi9GLElBeHBCRSxFQXdwQkk7QUFDMUIsUUFBTTJKLFVBQVUsR0FBRzVLLENBQUMsWUFBS2lCLElBQUwseUJBQXBCO0FBQ0EySixJQUFBQSxVQUFVLENBQUNDLEtBQVg7QUFFQTdELElBQUFBLE1BQU0sQ0FBQ2lCLE9BQVAsQ0FBZSxVQUFDNkMsS0FBRCxFQUFRQyxLQUFSLEVBQWtCO0FBQzdCO0FBQ0FqTCxNQUFBQSxxQkFBcUIsQ0FBQ1ksa0JBQXRCLENBQXlDb0ssS0FBSyxDQUFDRSxJQUEvQyxJQUF1RDtBQUNuRFQsUUFBQUEsUUFBUSxFQUFFUSxLQUR5QztBQUVuREUsUUFBQUEsUUFBUSxFQUFFSCxLQUFLLENBQUNHO0FBRm1DLE9BQXZELENBRjZCLENBTzdCOztBQUNBLFVBQU03RyxVQUFVLEdBQUcwRyxLQUFLLENBQUNHLFFBQU4sS0FBbUIsSUFBbkIsSUFBMkJILEtBQUssQ0FBQ0csUUFBTixLQUFtQixHQUE5QyxJQUFxREgsS0FBSyxDQUFDRyxRQUFOLEtBQW1CLENBQTNGO0FBQ0EsVUFBTUMsT0FBTyxHQUFHLENBQUM5RyxVQUFELEdBQWMsU0FBZCxHQUEwQixFQUExQztBQUVBLFVBQU0rRyxPQUFPLGtFQUN5QkwsS0FBSyxDQUFDRSxJQUQvQixtREFFU0QsS0FGVCx3REFHY0QsS0FBSyxDQUFDRSxJQUhwQiw4REFJcUJELEtBSnJCLHFXQVd3QkQsS0FBSyxDQUFDRSxJQVg5QixxREFZWUUsT0FaWix3S0FldUJKLEtBQUssQ0FBQ0UsSUFmN0IsZ0JBZXNDbEwscUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ04sS0FBSyxDQUFDTyxXQUFOLElBQXFCUCxLQUFLLENBQUNFLElBQTVELENBZnRDLDZHQUFiO0FBcUJBSixNQUFBQSxVQUFVLENBQUNVLE1BQVgsQ0FBa0JILE9BQWxCO0FBQ0gsS0FqQ0QsRUFKMEIsQ0F1QzFCOztBQUNBUCxJQUFBQSxVQUFVLENBQUMvRixJQUFYLENBQWdCLFdBQWhCLEVBQTZCUixRQUE3QixDQUFzQztBQUNsQ2tILE1BQUFBLFFBQVEsRUFBRSxvQkFBVztBQUNqQjtBQUNBekwsUUFBQUEscUJBQXFCLENBQUNhLGFBQXRCLEdBQXNDLElBQXRDO0FBQ0FvRixRQUFBQSxJQUFJLENBQUN5RixXQUFMO0FBQ0g7QUFMaUMsS0FBdEM7QUFPSCxHQXZzQnlCOztBQXlzQjFCO0FBQ0o7QUFDQTtBQUNJYixFQUFBQSx1QkE1c0IwQixxQ0E0c0JBO0FBQ3RCM0ssSUFBQUEsQ0FBQyxDQUFDLDBDQUFELENBQUQsQ0FBOEN5TCxRQUE5QyxDQUF1RDtBQUNuREMsTUFBQUEsV0FBVyxFQUFFLGFBRHNDO0FBRW5EQyxNQUFBQSxVQUFVLEVBQUUsYUFGdUM7QUFHbkRDLE1BQUFBLE1BQU0sRUFBRSxrQkFBVztBQUNmO0FBQ0E5TCxRQUFBQSxxQkFBcUIsQ0FBQ2EsYUFBdEIsR0FBc0MsSUFBdEM7QUFDQW9GLFFBQUFBLElBQUksQ0FBQ3lGLFdBQUw7QUFDSDtBQVBrRCxLQUF2RDtBQVNILEdBdHRCeUI7O0FBd3RCMUI7QUFDSjtBQUNBO0FBQ0lLLEVBQUFBLDBCQTN0QjBCLHdDQTJ0Qkc7QUFDekI7QUFDQSxRQUFNQyxnQkFBZ0IsR0FBRzlMLENBQUMsQ0FBQyxvQkFBRCxDQUExQjs7QUFDQSxRQUFJOEwsZ0JBQWdCLENBQUN2SSxNQUFyQixFQUE2QjtBQUN6QixVQUFNd0ksU0FBUyxHQUFHRCxnQkFBZ0IsQ0FBQ25ILEdBQWpCLEVBQWxCO0FBQ0EsVUFBTXFILFVBQVUsR0FBR0YsZ0JBQWdCLENBQUMxTCxNQUFqQixFQUFuQixDQUZ5QixDQUl6Qjs7QUFDQSxVQUFNNkwsUUFBUSxHQUFHSCxnQkFBZ0IsQ0FBQ3hGLElBQWpCLENBQXNCLFdBQXRCLEtBQXNDLEVBQXZELENBTHlCLENBT3pCOztBQUNBMEYsTUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixnQ0FBaEIsRUFBa0RrRSxNQUFsRDs7QUFFQSxVQUFJZ0QsU0FBSixFQUFlO0FBQ1g7QUFDQSxZQUFJRyxXQUFXLEdBQUcsRUFBbEI7O0FBQ0EsWUFBSUQsUUFBUSxJQUFJLENBQUNBLFFBQVEsQ0FBQ3BGLEtBQTFCLEVBQWlDO0FBQzdCLGNBQU1zRixLQUFLLEdBQUcsRUFBZCxDQUQ2QixDQUc3Qjs7QUFDQSxjQUFJRixRQUFRLENBQUNHLE9BQWIsRUFBc0I7QUFDbEJELFlBQUFBLEtBQUssQ0FBQ0UsSUFBTix3QkFBaUJKLFFBQVEsQ0FBQ0csT0FBMUI7QUFDSCxXQU40QixDQVE3Qjs7O0FBQ0EsY0FBSUgsUUFBUSxDQUFDSyxNQUFULElBQW1CLENBQUNMLFFBQVEsQ0FBQ00sY0FBakMsRUFBaUQ7QUFDN0NKLFlBQUFBLEtBQUssQ0FBQ0UsSUFBTixjQUFpQkosUUFBUSxDQUFDSyxNQUExQjtBQUNILFdBRkQsTUFFTyxJQUFJTCxRQUFRLENBQUNNLGNBQWIsRUFBNkI7QUFDaENKLFlBQUFBLEtBQUssQ0FBQ0UsSUFBTixDQUFXLGVBQVg7QUFDSCxXQWI0QixDQWU3Qjs7O0FBQ0EsY0FBSUosUUFBUSxDQUFDTyxRQUFiLEVBQXVCO0FBQ25CLGdCQUFJUCxRQUFRLENBQUNRLFVBQWIsRUFBeUI7QUFDckJOLGNBQUFBLEtBQUssQ0FBQ0UsSUFBTiwwQkFBd0JKLFFBQVEsQ0FBQ08sUUFBakM7QUFDSCxhQUZELE1BRU8sSUFBSVAsUUFBUSxDQUFDUyxpQkFBVCxJQUE4QixFQUFsQyxFQUFzQztBQUN6Q1AsY0FBQUEsS0FBSyxDQUFDRSxJQUFOLG1DQUE0QkosUUFBUSxDQUFDUyxpQkFBckM7QUFDSCxhQUZNLE1BRUE7QUFDSFAsY0FBQUEsS0FBSyxDQUFDRSxJQUFOLDhCQUE0QkosUUFBUSxDQUFDTyxRQUFyQztBQUNIO0FBQ0o7O0FBRUROLFVBQUFBLFdBQVcsR0FBR0MsS0FBSyxDQUFDeEQsSUFBTixDQUFXLEtBQVgsQ0FBZDtBQUNILFNBM0JELE1BMkJPO0FBQ0g7QUFDQXVELFVBQUFBLFdBQVcsR0FBR3BNLHFCQUFxQixDQUFDNk0sbUJBQXRCLENBQTBDWixTQUExQyxDQUFkO0FBQ0gsU0FqQ1UsQ0FtQ1g7OztBQUNBRCxRQUFBQSxnQkFBZ0IsQ0FBQ3JILElBQWpCLEdBcENXLENBc0NYOztBQUNBLFlBQUltSSxXQUFXLEdBQUcsRUFBbEI7O0FBQ0EsWUFBSVgsUUFBUSxDQUFDUSxVQUFiLEVBQXlCO0FBQ3JCRyxVQUFBQSxXQUFXLEdBQUcsT0FBZDtBQUNILFNBRkQsTUFFTyxJQUFJWCxRQUFRLENBQUNTLGlCQUFULElBQThCLEVBQWxDLEVBQXNDO0FBQ3pDRSxVQUFBQSxXQUFXLEdBQUcsU0FBZDtBQUNIOztBQUVELFlBQU1DLFdBQVcsbUZBQ29DRCxXQURwQyx1RUFFbUI5TSxxQkFBcUIsQ0FBQ3NMLFVBQXRCLENBQWlDYyxXQUFqQyxDQUZuQix1SkFHNERwTSxxQkFBcUIsQ0FBQ3NMLFVBQXRCLENBQWlDVyxTQUFqQyxDQUg1RCx5RkFJc0M1SyxlQUFlLENBQUMyTCxrQkFKdEQsZ1BBUWUzTCxlQUFlLENBQUM0TCxrQkFSL0Isa1BBWWU1TCxlQUFlLENBQUM2TCxjQVovQixrUEFnQmU3TCxlQUFlLENBQUM4TCxnQkFoQi9CLG1LQW9CWGhCLFFBQVEsSUFBSSxDQUFDQSxRQUFRLENBQUNwRixLQUF0QixHQUE4Qi9HLHFCQUFxQixDQUFDb04sd0JBQXRCLENBQStDakIsUUFBL0MsQ0FBOUIsR0FBeUYsRUFwQjlFLGdVQXlCb0I5SyxlQUFlLENBQUNnTSxrQkF6QnBDLGdCQXlCMkRwQixTQXpCM0QsaVFBNkI0QjVLLGVBQWUsQ0FBQ2lNLE9BN0I1Qyw2TEFnQzRCak0sZUFBZSxDQUFDa00sU0FoQzVDLDBIQUFqQjtBQXNDQXJCLFFBQUFBLFVBQVUsQ0FBQ1YsTUFBWCxDQUFrQnVCLFdBQWxCLEVBcEZXLENBc0ZYOztBQUNBYixRQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGdCQUFoQixFQUFrQ1YsRUFBbEMsQ0FBcUMsT0FBckMsRUFBOEMsVUFBU21KLENBQVQsRUFBWTtBQUN0REEsVUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsY0FBTUMsUUFBUSxHQUFHeEIsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixlQUFoQixDQUFqQjs7QUFDQSxjQUFJMkksUUFBUSxDQUFDakssTUFBYixFQUFxQjtBQUNqQmlLLFlBQUFBLFFBQVEsQ0FBQ0MsV0FBVDtBQUNIO0FBQ0osU0FORCxFQXZGVyxDQStGWDs7QUFDQXpCLFFBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsV0FBaEIsRUFBNkJWLEVBQTdCLENBQWdDLE9BQWhDLEVBQXlDLFVBQVNtSixDQUFULEVBQVk7QUFDakRBLFVBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBdkIsVUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixlQUFoQixFQUFpQ0osSUFBakM7QUFDQXVILFVBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsaUJBQWhCLEVBQW1DNkYsSUFBbkM7QUFDQXNCLFVBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IseUJBQWhCLEVBQTJDNkksS0FBM0M7QUFDSCxTQUxELEVBaEdXLENBdUdYOztBQUNBMUIsUUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixnQkFBaEIsRUFBa0NWLEVBQWxDLENBQXFDLE9BQXJDLEVBQThDLFVBQVNtSixDQUFULEVBQVk7QUFDdERBLFVBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLGNBQU1JLFFBQVEsR0FBRzNCLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IseUJBQWhCLEVBQTJDRixHQUEzQyxFQUFqQixDQUZzRCxDQUl0RDs7QUFDQW1ILFVBQUFBLGdCQUFnQixDQUFDbkgsR0FBakIsQ0FBcUJnSixRQUFyQixFQUxzRCxDQU90RDs7QUFDQSxjQUFJLE9BQU81SCxJQUFQLEtBQWdCLFdBQWhCLElBQStCQSxJQUFJLENBQUM2SCxXQUF4QyxFQUFxRDtBQUNqRDdILFlBQUFBLElBQUksQ0FBQzZILFdBQUw7QUFDSCxXQVZxRCxDQVl0RDs7O0FBQ0E5TixVQUFBQSxxQkFBcUIsQ0FBQytMLDBCQUF0QjtBQUNILFNBZEQsRUF4R1csQ0F3SFg7O0FBQ0FHLFFBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0Isa0JBQWhCLEVBQW9DVixFQUFwQyxDQUF1QyxPQUF2QyxFQUFnRCxVQUFTbUosQ0FBVCxFQUFZO0FBQ3hEQSxVQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQXZCLFVBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsaUJBQWhCLEVBQW1DSixJQUFuQztBQUNBdUgsVUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixlQUFoQixFQUFpQzZGLElBQWpDO0FBQ0gsU0FKRCxFQXpIVyxDQStIWDs7QUFDQXNCLFFBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0Isa0JBQWhCLEVBQW9DVixFQUFwQyxDQUF1QyxPQUF2QyxFQUFnRCxVQUFTbUosQ0FBVCxFQUFZO0FBQ3hEQSxVQUFBQSxDQUFDLENBQUNDLGNBQUYsR0FEd0QsQ0FHeEQ7O0FBQ0F6QixVQUFBQSxnQkFBZ0IsQ0FBQ25ILEdBQWpCLENBQXFCLEVBQXJCLEVBSndELENBTXhEOztBQUNBLGNBQUksT0FBT29CLElBQVAsS0FBZ0IsV0FBaEIsSUFBK0JBLElBQUksQ0FBQzZILFdBQXhDLEVBQXFEO0FBQ2pEN0gsWUFBQUEsSUFBSSxDQUFDNkgsV0FBTDtBQUNILFdBVHVELENBV3hEOzs7QUFDQTlOLFVBQUFBLHFCQUFxQixDQUFDK0wsMEJBQXRCO0FBQ0gsU0FiRCxFQWhJVyxDQStJWDs7QUFDQUcsUUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixnQkFBaEIsRUFBa0NnSixLQUFsQyxHQWhKVyxDQWtKWDs7QUFDQSxZQUFJL04scUJBQXFCLENBQUN1RCxTQUExQixFQUFxQztBQUNqQ3ZELFVBQUFBLHFCQUFxQixDQUFDdUQsU0FBdEIsQ0FBZ0N5SyxPQUFoQztBQUNBaE8sVUFBQUEscUJBQXFCLENBQUN5RixtQkFBdEI7QUFDSDtBQUNKLE9BdkpELE1BdUpPO0FBQ0g7QUFDQXVHLFFBQUFBLGdCQUFnQixDQUFDcEIsSUFBakI7QUFDQW9CLFFBQUFBLGdCQUFnQixDQUFDaUMsSUFBakIsQ0FBc0IsYUFBdEIsRUFBcUM1TSxlQUFlLENBQUNnTSxrQkFBckQ7QUFDQXJCLFFBQUFBLGdCQUFnQixDQUFDaUMsSUFBakIsQ0FBc0IsTUFBdEIsRUFBOEIsSUFBOUIsRUFKRyxDQU1IOztBQUNBakMsUUFBQUEsZ0JBQWdCLENBQUNrQyxHQUFqQixDQUFxQixtQ0FBckIsRUFBMEQ3SixFQUExRCxDQUE2RCxtQ0FBN0QsRUFBa0csWUFBVztBQUN6RyxjQUFJLE9BQU80QixJQUFQLEtBQWdCLFdBQWhCLElBQStCQSxJQUFJLENBQUM2SCxXQUF4QyxFQUFxRDtBQUNqRDdILFlBQUFBLElBQUksQ0FBQzZILFdBQUw7QUFDSDtBQUNKLFNBSkQ7QUFLSDtBQUNKO0FBQ0osR0E3NEJ5Qjs7QUErNEIxQjtBQUNKO0FBQ0E7QUFDSXRJLEVBQUFBLHlCQWw1QjBCLHVDQWs1QkU7QUFDeEI7QUFDQSxRQUFNMkksZUFBZSxHQUFHak8sQ0FBQyxDQUFDLGlCQUFELENBQXpCOztBQUNBLFFBQUlpTyxlQUFlLENBQUMxSyxNQUFwQixFQUE0QjtBQUN4QixVQUFNd0ksU0FBUyxHQUFHa0MsZUFBZSxDQUFDdEosR0FBaEIsRUFBbEI7QUFDQSxVQUFNcUgsVUFBVSxHQUFHaUMsZUFBZSxDQUFDN04sTUFBaEIsRUFBbkIsQ0FGd0IsQ0FJeEI7O0FBQ0E0TCxNQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGlDQUFoQixFQUFtRGtFLE1BQW5ELEdBTHdCLENBT3hCOztBQUNBLFVBQUlnRCxTQUFKLEVBQWU7QUFDWDtBQUNBLFlBQU1tQyxTQUFTLEdBQUdwTyxxQkFBcUIsQ0FBQ3FPLGNBQXRCLENBQXFDcEMsU0FBckMsQ0FBbEIsQ0FGVyxDQUlYOztBQUNBa0MsUUFBQUEsZUFBZSxDQUFDeEosSUFBaEI7QUFFQSxZQUFNb0ksV0FBVywrSUFFbUJxQixTQUZuQix1SkFHNERwTyxxQkFBcUIsQ0FBQ3NMLFVBQXRCLENBQWlDVyxTQUFqQyxDQUg1RCwwRkFJc0M1SyxlQUFlLENBQUNpTixpQkFKdEQsOE9BUWVqTixlQUFlLENBQUNrTixnQkFSL0IsdU9BWW1EdEMsU0FabkQsa0NBQWpCO0FBZUFDLFFBQUFBLFVBQVUsQ0FBQ1YsTUFBWCxDQUFrQnVCLFdBQWxCLEVBdEJXLENBd0JmOztBQUNBYixRQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGFBQWhCLEVBQStCVixFQUEvQixDQUFrQyxPQUFsQyxFQUEyQyxVQUFTbUosQ0FBVCxFQUFZO0FBQ25EQSxVQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxjQUFNZSxZQUFZLEdBQUd0QyxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGVBQWhCLENBQXJCO0FBQ0EsY0FBTTBKLGlCQUFpQixHQUFHdkMsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixrQkFBaEIsQ0FBMUI7QUFDQSxjQUFNMkosS0FBSyxHQUFHeE8sQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRNkUsSUFBUixDQUFhLEdBQWIsQ0FBZDs7QUFFQSxjQUFJeUosWUFBWSxDQUFDRyxFQUFiLENBQWdCLFVBQWhCLENBQUosRUFBaUM7QUFDN0JILFlBQUFBLFlBQVksQ0FBQzdKLElBQWI7QUFDQThKLFlBQUFBLGlCQUFpQixDQUFDN0QsSUFBbEI7QUFDQThELFlBQUFBLEtBQUssQ0FBQ2hILFdBQU4sQ0FBa0IsVUFBbEIsRUFBOEJrSCxRQUE5QixDQUF1QyxRQUF2QztBQUNILFdBSkQsTUFJTztBQUNISixZQUFBQSxZQUFZLENBQUM1RCxJQUFiO0FBQ0E2RCxZQUFBQSxpQkFBaUIsQ0FBQzlKLElBQWxCO0FBQ0ErSixZQUFBQSxLQUFLLENBQUNoSCxXQUFOLENBQWtCLFFBQWxCLEVBQTRCa0gsUUFBNUIsQ0FBcUMsVUFBckM7QUFDSDtBQUNKLFNBZkQsRUF6QmUsQ0EwQ2Y7O0FBQ0ExQyxRQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGdCQUFoQixFQUFrQ2dKLEtBQWxDO0FBQ0MsT0E1Q0QsTUE0Q087QUFDSDtBQUNBSSxRQUFBQSxlQUFlLENBQUN2RCxJQUFoQjtBQUNBdUQsUUFBQUEsZUFBZSxDQUFDRixJQUFoQixDQUFxQixVQUFyQixFQUFpQyxJQUFqQztBQUNBRSxRQUFBQSxlQUFlLENBQUNGLElBQWhCLENBQXFCLGFBQXJCLEVBQW9DNU0sZUFBZSxDQUFDd04saUJBQXBEO0FBQ0g7QUFDSixLQTdEdUIsQ0ErRHhCOzs7QUFDQTdPLElBQUFBLHFCQUFxQixDQUFDK0wsMEJBQXRCLEdBaEV3QixDQWtFeEI7O0FBQ0EsUUFBTStDLGlCQUFpQixHQUFHNU8sQ0FBQyxDQUFDLHFCQUFELENBQTNCOztBQUNBLFFBQUk0TyxpQkFBaUIsQ0FBQ3JMLE1BQXRCLEVBQThCO0FBQzFCLFVBQU15SSxXQUFVLEdBQUc0QyxpQkFBaUIsQ0FBQ3hPLE1BQWxCLEVBQW5CLENBRDBCLENBRzFCOzs7QUFDQTRMLE1BQUFBLFdBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsMkNBQWhCLEVBQTZEa0UsTUFBN0QsR0FKMEIsQ0FNMUI7QUFDQTs7O0FBQ0EsVUFBTThGLFlBQVksR0FBR0QsaUJBQWlCLENBQUNqSyxHQUFsQixFQUFyQjtBQUNBLFVBQU1tSyxRQUFRLEdBQUdELFlBQVksS0FBSy9PLHFCQUFxQixDQUFDUSxjQUF4RDs7QUFFQSxVQUFJd08sUUFBSixFQUFjO0FBQ1Y7QUFDQUYsUUFBQUEsaUJBQWlCLENBQUNuSyxJQUFsQjs7QUFFQSxZQUFNb0ksWUFBVyxzTUFJSDFMLGVBQWUsQ0FBQzROLGtCQUpiLG9GQUtrQzVOLGVBQWUsQ0FBQzZOLFVBTGxELHNUQVdZN04sZUFBZSxDQUFDOE4sa0JBWDVCLHFDQUFqQjs7QUFjQWpELFFBQUFBLFdBQVUsQ0FBQ1YsTUFBWCxDQUFrQnVCLFlBQWxCLEVBbEJVLENBb0JWOzs7QUFDQWIsUUFBQUEsV0FBVSxDQUFDbkgsSUFBWCxDQUFnQixtQkFBaEIsRUFBcUNWLEVBQXJDLENBQXdDLE9BQXhDLEVBQWlELFVBQVNtSixDQUFULEVBQVk7QUFDekRBLFVBQUFBLENBQUMsQ0FBQ0MsY0FBRjs7QUFDQXZCLFVBQUFBLFdBQVUsQ0FBQ25ILElBQVgsQ0FBZ0Isa0JBQWhCLEVBQW9DSixJQUFwQzs7QUFDQSxjQUFNeUssU0FBUyxHQUFHbEQsV0FBVSxDQUFDbkgsSUFBWCxDQUFnQix5QkFBaEIsQ0FBbEI7O0FBQ0FxSyxVQUFBQSxTQUFTLENBQUN4RSxJQUFWLEdBQWlCZ0QsS0FBakIsR0FKeUQsQ0FNekQ7O0FBQ0FrQixVQUFBQSxpQkFBaUIsQ0FBQ2pLLEdBQWxCLENBQXNCLEVBQXRCLEVBUHlELENBU3pEOztBQUNBdUssVUFBQUEsU0FBUyxDQUFDL0ssRUFBVixDQUFhLG9CQUFiLEVBQW1DLFlBQVc7QUFDMUM7QUFDQXlLLFlBQUFBLGlCQUFpQixDQUFDakssR0FBbEIsQ0FBc0J1SyxTQUFTLENBQUN2SyxHQUFWLEVBQXRCLEVBRjBDLENBSTFDOztBQUNBLGdCQUFJLE9BQU9vQixJQUFQLEtBQWdCLFdBQWhCLElBQStCQSxJQUFJLENBQUM2SCxXQUF4QyxFQUFxRDtBQUNqRDdILGNBQUFBLElBQUksQ0FBQzZILFdBQUw7QUFDSDtBQUNKLFdBUkQ7QUFTSCxTQW5CRDtBQW9CSCxPQXpDRCxNQXlDTztBQUNIO0FBQ0FnQixRQUFBQSxpQkFBaUIsQ0FBQ2xFLElBQWxCO0FBQ0FrRSxRQUFBQSxpQkFBaUIsQ0FBQ2IsSUFBbEIsQ0FBdUIsYUFBdkIsRUFBc0M1TSxlQUFlLENBQUM4TixrQkFBdEQ7QUFDQUwsUUFBQUEsaUJBQWlCLENBQUNiLElBQWxCLENBQXVCLE1BQXZCLEVBQStCLElBQS9CLEVBSkcsQ0FNSDs7QUFDQWEsUUFBQUEsaUJBQWlCLENBQUNaLEdBQWxCLENBQXNCLG1DQUF0QixFQUEyRDdKLEVBQTNELENBQThELG1DQUE5RCxFQUFtRyxZQUFXO0FBQzFHLGNBQUksT0FBTzRCLElBQVAsS0FBZ0IsV0FBaEIsSUFBK0JBLElBQUksQ0FBQzZILFdBQXhDLEVBQXFEO0FBQ2pEN0gsWUFBQUEsSUFBSSxDQUFDNkgsV0FBTDtBQUNIO0FBQ0osU0FKRDtBQUtIO0FBQ0o7QUFDSixHQXhoQ3lCOztBQTBoQzFCO0FBQ0o7QUFDQTtBQUNJckksRUFBQUEsbUJBN2hDMEIsaUNBNmhDSjtBQUNsQixRQUFJekYscUJBQXFCLENBQUN1RCxTQUExQixFQUFxQztBQUNqQ3ZELE1BQUFBLHFCQUFxQixDQUFDdUQsU0FBdEIsQ0FBZ0N5SyxPQUFoQztBQUNIOztBQUVEaE8sSUFBQUEscUJBQXFCLENBQUN1RCxTQUF0QixHQUFrQyxJQUFJOEwsV0FBSixDQUFnQixXQUFoQixDQUFsQztBQUVBclAsSUFBQUEscUJBQXFCLENBQUN1RCxTQUF0QixDQUFnQ2MsRUFBaEMsQ0FBbUMsU0FBbkMsRUFBOEMsVUFBQ21KLENBQUQsRUFBTztBQUNqRDtBQUNBLFVBQU04QixJQUFJLEdBQUdwUCxDQUFDLENBQUNzTixDQUFDLENBQUN6RixPQUFILENBQWQ7QUFDQSxVQUFNd0gsWUFBWSxHQUFHRCxJQUFJLENBQUN2SyxJQUFMLENBQVUsR0FBVixFQUFla0osSUFBZixDQUFvQixPQUFwQixDQUFyQjtBQUVBcUIsTUFBQUEsSUFBSSxDQUFDdkssSUFBTCxDQUFVLEdBQVYsRUFBZTJDLFdBQWYsR0FBNkJrSCxRQUE3QixDQUFzQyxZQUF0QztBQUNBakksTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYjJJLFFBQUFBLElBQUksQ0FBQ3ZLLElBQUwsQ0FBVSxHQUFWLEVBQWUyQyxXQUFmLEdBQTZCa0gsUUFBN0IsQ0FBc0NXLFlBQXRDO0FBQ0gsT0FGUyxFQUVQLElBRk8sQ0FBVixDQU5pRCxDQVVqRDs7QUFDQS9CLE1BQUFBLENBQUMsQ0FBQ2dDLGNBQUY7QUFDSCxLQVpEO0FBY0F4UCxJQUFBQSxxQkFBcUIsQ0FBQ3VELFNBQXRCLENBQWdDYyxFQUFoQyxDQUFtQyxPQUFuQyxFQUE0QyxZQUFNO0FBQzlDeUUsTUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCMUgsZUFBZSxDQUFDb08sYUFBdEM7QUFDSCxLQUZEO0FBR0gsR0FyakN5Qjs7QUF1akMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lwQixFQUFBQSxjQTVqQzBCLDBCQTRqQ1hqRyxHQTVqQ1csRUE0akNOO0FBQ2hCLFFBQUksQ0FBQ0EsR0FBRCxJQUFRQSxHQUFHLENBQUMzRSxNQUFKLEdBQWEsRUFBekIsRUFBNkI7QUFDekIsYUFBTzJFLEdBQVA7QUFDSDs7QUFFRCxRQUFNaUUsS0FBSyxHQUFHakUsR0FBRyxDQUFDc0gsS0FBSixDQUFVLEdBQVYsQ0FBZDs7QUFDQSxRQUFJckQsS0FBSyxDQUFDNUksTUFBTixJQUFnQixDQUFwQixFQUF1QjtBQUNuQixVQUFNa00sT0FBTyxHQUFHdEQsS0FBSyxDQUFDLENBQUQsQ0FBckI7QUFDQSxVQUFNdUQsT0FBTyxHQUFHdkQsS0FBSyxDQUFDLENBQUQsQ0FBckI7QUFDQSxVQUFNd0QsT0FBTyxHQUFHeEQsS0FBSyxDQUFDeUQsS0FBTixDQUFZLENBQVosRUFBZWpILElBQWYsQ0FBb0IsR0FBcEIsQ0FBaEI7O0FBRUEsVUFBSStHLE9BQU8sQ0FBQ25NLE1BQVIsR0FBaUIsRUFBckIsRUFBeUI7QUFDckIsWUFBTTJLLFNBQVMsR0FBR3dCLE9BQU8sQ0FBQ0csU0FBUixDQUFrQixDQUFsQixFQUFxQixFQUFyQixJQUEyQixLQUEzQixHQUFtQ0gsT0FBTyxDQUFDRyxTQUFSLENBQWtCSCxPQUFPLENBQUNuTSxNQUFSLEdBQWlCLEVBQW5DLENBQXJEO0FBQ0EsZUFBTyxVQUFHa00sT0FBSCxjQUFjdkIsU0FBZCxjQUEyQnlCLE9BQTNCLEVBQXFDRyxJQUFyQyxFQUFQO0FBQ0g7QUFDSjs7QUFFRCxXQUFPNUgsR0FBUDtBQUNILEdBOWtDeUI7O0FBZ2xDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJeUUsRUFBQUEsbUJBcmxDMEIsK0JBcWxDTm9ELElBcmxDTSxFQXFsQ0E7QUFDdEIsUUFBSSxDQUFDQSxJQUFELElBQVNBLElBQUksQ0FBQ3hNLE1BQUwsR0FBYyxHQUEzQixFQUFnQztBQUM1QixhQUFPd00sSUFBUDtBQUNIOztBQUVELFFBQU1DLEtBQUssR0FBR0QsSUFBSSxDQUFDUCxLQUFMLENBQVcsSUFBWCxFQUFpQnRGLE1BQWpCLENBQXdCLFVBQUErRixJQUFJO0FBQUEsYUFBSUEsSUFBSSxDQUFDSCxJQUFMLEVBQUo7QUFBQSxLQUE1QixDQUFkLENBTHNCLENBT3RCOztBQUNBLFFBQU1JLFNBQVMsR0FBR0YsS0FBSyxDQUFDLENBQUQsQ0FBTCxJQUFZLEVBQTlCO0FBQ0EsUUFBTUcsUUFBUSxHQUFHSCxLQUFLLENBQUNBLEtBQUssQ0FBQ3pNLE1BQU4sR0FBZSxDQUFoQixDQUFMLElBQTJCLEVBQTVDLENBVHNCLENBV3RCOztBQUNBLFFBQUkyTSxTQUFTLENBQUNFLFFBQVYsQ0FBbUIsbUJBQW5CLENBQUosRUFBNkM7QUFDekMsdUJBQVVGLFNBQVYsZ0JBQXlCQyxRQUF6QjtBQUNILEtBZHFCLENBZ0J0Qjs7O0FBQ0EsUUFBTUUsU0FBUyxHQUFHTixJQUFJLENBQUNPLE9BQUwsQ0FBYSxLQUFiLEVBQW9CLEdBQXBCLEVBQXlCUixJQUF6QixFQUFsQjs7QUFDQSxRQUFJTyxTQUFTLENBQUM5TSxNQUFWLEdBQW1CLEVBQXZCLEVBQTJCO0FBQ3ZCLGFBQU84TSxTQUFTLENBQUNSLFNBQVYsQ0FBb0IsQ0FBcEIsRUFBdUIsRUFBdkIsSUFBNkIsS0FBN0IsR0FBcUNRLFNBQVMsQ0FBQ1IsU0FBVixDQUFvQlEsU0FBUyxDQUFDOU0sTUFBVixHQUFtQixFQUF2QyxDQUE1QztBQUNIOztBQUVELFdBQU84TSxTQUFQO0FBQ0gsR0E1bUN5Qjs7QUE4bUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lqRixFQUFBQSxVQW5uQzBCLHNCQW1uQ2ZtRixJQW5uQ2UsRUFtbkNUO0FBQ2IsUUFBTUMsR0FBRyxHQUFHO0FBQ1IsV0FBSyxPQURHO0FBRVIsV0FBSyxNQUZHO0FBR1IsV0FBSyxNQUhHO0FBSVIsV0FBSyxRQUpHO0FBS1IsV0FBSztBQUxHLEtBQVo7QUFPQSxXQUFPRCxJQUFJLENBQUNELE9BQUwsQ0FBYSxVQUFiLEVBQXlCLFVBQUFHLENBQUM7QUFBQSxhQUFJRCxHQUFHLENBQUNDLENBQUQsQ0FBUDtBQUFBLEtBQTFCLENBQVA7QUFDSCxHQTVuQ3lCOztBQThuQzFCO0FBQ0o7QUFDQTtBQUNJakwsRUFBQUEsbUJBam9DMEIsaUNBaW9DTDtBQUNqQixRQUFJMUYscUJBQXFCLENBQUNLLG1CQUF0QixDQUEwQ2tFLFFBQTFDLENBQW1ELFlBQW5ELENBQUosRUFBc0U7QUFDbEV2RSxNQUFBQSxxQkFBcUIsQ0FBQ08sbUJBQXRCLENBQTBDb0UsSUFBMUM7QUFDSCxLQUZELE1BRU87QUFDSDNFLE1BQUFBLHFCQUFxQixDQUFDTyxtQkFBdEIsQ0FBMENxSyxJQUExQztBQUNIOztBQUNENUssSUFBQUEscUJBQXFCLENBQUM4RSxTQUF0QjtBQUNILEdBeG9DeUI7O0FBMG9DMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0k4TCxFQUFBQSxnQkFocEMwQiw0QkFncENUM0osUUFocENTLEVBZ3BDQztBQUN2QixRQUFNVixNQUFNLEdBQUdVLFFBQWYsQ0FEdUIsQ0FHdkI7O0FBQ0EsUUFBSVYsTUFBTSxDQUFDQyxJQUFQLENBQVlxSyxrQkFBWixLQUFtQ0MsU0FBdkMsRUFBa0Q7QUFDOUMsVUFBTUMsZUFBZSxHQUFHeEssTUFBTSxDQUFDQyxJQUFQLENBQVlxSyxrQkFBcEMsQ0FEOEMsQ0FFOUM7O0FBQ0EsVUFBSUUsZUFBZSxLQUFLLEVBQXBCLElBQTBCQSxlQUFlLEtBQUsvUSxxQkFBcUIsQ0FBQ1EsY0FBeEUsRUFBd0Y7QUFDcEYsZUFBTytGLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZcUssa0JBQW5CO0FBQ0g7QUFDSixLQVZzQixDQVl2Qjs7O0FBQ0EsUUFBSXRLLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZd0ssaUJBQVosS0FBa0NGLFNBQWxDLElBQStDdkssTUFBTSxDQUFDQyxJQUFQLENBQVl3SyxpQkFBWixLQUFrQyxFQUFyRixFQUF5RjtBQUNyRixhQUFPekssTUFBTSxDQUFDQyxJQUFQLENBQVl3SyxpQkFBbkI7QUFDSCxLQWZzQixDQWlCdkI7OztBQUNBLFFBQU1DLGNBQWMsR0FBRyxDQUNuQixRQURtQixFQUVuQixnQkFGbUIsQ0FBdkIsQ0FsQnVCLENBdUJ2Qjs7QUFDQWhKLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZM0IsTUFBTSxDQUFDQyxJQUFuQixFQUF5QjJCLE9BQXpCLENBQWlDLFVBQUFDLEdBQUcsRUFBSTtBQUNwQyxVQUFJQSxHQUFHLENBQUM4SSxVQUFKLENBQWUsUUFBZixLQUE0QkQsY0FBYyxDQUFDWCxRQUFmLENBQXdCbEksR0FBeEIsQ0FBaEMsRUFBOEQ7QUFDMUQsZUFBTzdCLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZNEIsR0FBWixDQUFQO0FBQ0g7QUFDSixLQUpELEVBeEJ1QixDQThCdkI7QUFDQTs7QUFDQSxRQUFNK0ksbUJBQW1CLEdBQUcsQ0FBQ2xMLElBQUksQ0FBQ21MLGVBQU4sSUFBeUJwUixxQkFBcUIsQ0FBQ2EsYUFBM0U7O0FBRUEsUUFBSXNRLG1CQUFKLEVBQXlCO0FBQ3JCO0FBQ0EsVUFBTUUsU0FBUyxHQUFHLEVBQWxCLENBRnFCLENBSXJCOztBQUNBblIsTUFBQUEsQ0FBQyxDQUFDLGdFQUFELENBQUQsQ0FBb0VvUixJQUFwRSxDQUF5RSxVQUFDQyxZQUFELEVBQWVDLEdBQWYsRUFBdUI7QUFDNUYsWUFBTUMsU0FBUyxHQUFHdlIsQ0FBQyxDQUFDc1IsR0FBRCxDQUFELENBQU92RCxJQUFQLENBQVksaUJBQVosQ0FBbEI7O0FBQ0EsWUFBSXdELFNBQUosRUFBZTtBQUNYLGNBQU1DLGVBQWUsR0FBR3hSLENBQUMsQ0FBQ3NSLEdBQUQsQ0FBRCxDQUFPek0sSUFBUCxDQUFZLFdBQVosRUFBeUJSLFFBQXpCLENBQWtDLGNBQWxDLENBQXhCO0FBRUE4TSxVQUFBQSxTQUFTLENBQUM5RSxJQUFWLENBQWU7QUFDWHJCLFlBQUFBLElBQUksRUFBRXVHLFNBREs7QUFFWHRHLFlBQUFBLFFBQVEsRUFBRXVHLGVBRkM7QUFHWGpILFlBQUFBLFFBQVEsRUFBRThHO0FBSEMsV0FBZjtBQUtIO0FBQ0osT0FYRCxFQUxxQixDQWtCckI7O0FBQ0EsVUFBSUYsU0FBUyxDQUFDNU4sTUFBVixHQUFtQixDQUF2QixFQUEwQjtBQUN0QjhDLFFBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZVSxNQUFaLEdBQXFCbUssU0FBckI7QUFDSDtBQUNKOztBQUVELFdBQU85SyxNQUFQO0FBQ0gsR0Ezc0N5Qjs7QUE2c0MxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lvTCxFQUFBQSxlQWx0QzBCLDJCQWt0Q1Z0TCxRQWx0Q1UsRUFrdENBO0FBQ3RCbkcsSUFBQUEsQ0FBQyxDQUFDLGlCQUFELENBQUQsQ0FBcUIrSSxNQUFyQixHQURzQixDQUd0Qjs7QUFDQSxRQUFJLENBQUM1QyxRQUFRLENBQUNFLE1BQWQsRUFBc0I7QUFDbEJOLE1BQUFBLElBQUksQ0FBQzJMLGFBQUwsQ0FBbUJsSyxXQUFuQixDQUErQixVQUEvQjtBQUNBMUgsTUFBQUEscUJBQXFCLENBQUM2Uix3QkFBdEIsQ0FBK0N4TCxRQUEvQztBQUNILEtBSEQsTUFHTztBQUNIO0FBQ0FyRyxNQUFBQSxxQkFBcUIsQ0FBQ0MsUUFBdEIsQ0FBK0J3SSxJQUEvQixDQUFvQyxXQUFwQyxFQUFpRCxrQkFBakQsRUFBcUV6SSxxQkFBcUIsQ0FBQ1EsY0FBM0Y7QUFDQVIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCd0ksSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsd0JBQWpELEVBQTJFekkscUJBQXFCLENBQUNRLGNBQWpHO0FBQ0FSLE1BQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQndJLElBQS9CLENBQW9DLFdBQXBDLEVBQWlELGFBQWpELEVBQWdFekkscUJBQXFCLENBQUNRLGNBQXRGO0FBQ0FSLE1BQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQndJLElBQS9CLENBQW9DLFdBQXBDLEVBQWlELG1CQUFqRCxFQUFzRXpJLHFCQUFxQixDQUFDUSxjQUE1RixFQUxHLENBT0g7O0FBQ0FOLE1BQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCNFIsT0FBeEIsQ0FBZ0MsR0FBaEMsRUFBcUMsWUFBVztBQUM1QzVSLFFBQUFBLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUStJLE1BQVI7QUFDSCxPQUZEO0FBR0gsS0FsQnFCLENBb0J0Qjs7O0FBQ0EsUUFBSSxPQUFPOEksd0JBQVAsS0FBb0MsV0FBeEMsRUFBcUQ7QUFDakRBLE1BQUFBLHdCQUF3QixDQUFDQyxxQkFBekI7QUFDSDtBQUNKLEdBMXVDeUI7O0FBNHVDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUgsRUFBQUEsd0JBaHZDMEIsb0NBZ3ZDRHhMLFFBaHZDQyxFQWd2Q1M7QUFDL0IsUUFBSUEsUUFBUSxDQUFDUSxRQUFiLEVBQXVCO0FBQ25CLFVBQU1vTCxJQUFJLEdBQUcvUixDQUFDLENBQUMsT0FBRCxFQUFVO0FBQUUsaUJBQU8scUJBQVQ7QUFBZ0NnUyxRQUFBQSxFQUFFLEVBQUU7QUFBcEMsT0FBVixDQUFkO0FBQ0EsVUFBTUMsT0FBTyxHQUFHalMsQ0FBQyxDQUFDLE9BQUQsRUFBVTtBQUFFLGlCQUFPO0FBQVQsT0FBVixDQUFELENBQWdDdVEsSUFBaEMsQ0FBcUNwUCxlQUFlLENBQUMrUSxvQkFBckQsQ0FBaEI7QUFDQUgsTUFBQUEsSUFBSSxDQUFDekcsTUFBTCxDQUFZMkcsT0FBWjtBQUNBLFVBQU1FLEdBQUcsR0FBR25TLENBQUMsQ0FBQyxNQUFELEVBQVM7QUFBRSxpQkFBTztBQUFULE9BQVQsQ0FBYjtBQUNBLFVBQU1vUyxXQUFXLEdBQUcsSUFBSUMsR0FBSixFQUFwQixDQUxtQixDQU9uQjs7QUFDQSxPQUFDLE9BQUQsRUFBVSxZQUFWLEVBQXdCcEssT0FBeEIsQ0FBZ0MsVUFBQXFLLE9BQU8sRUFBSTtBQUN2QyxZQUFJbk0sUUFBUSxDQUFDUSxRQUFULENBQWtCMkwsT0FBbEIsQ0FBSixFQUFnQztBQUM1QixjQUFNM0wsUUFBUSxHQUFHOEIsS0FBSyxDQUFDQyxPQUFOLENBQWN2QyxRQUFRLENBQUNRLFFBQVQsQ0FBa0IyTCxPQUFsQixDQUFkLElBQ1huTSxRQUFRLENBQUNRLFFBQVQsQ0FBa0IyTCxPQUFsQixDQURXLEdBRVgsQ0FBQ25NLFFBQVEsQ0FBQ1EsUUFBVCxDQUFrQjJMLE9BQWxCLENBQUQsQ0FGTjtBQUlBM0wsVUFBQUEsUUFBUSxDQUFDc0IsT0FBVCxDQUFpQixVQUFBcEIsS0FBSyxFQUFJO0FBQ3RCLGdCQUFJMEwsV0FBVyxHQUFHLEVBQWxCOztBQUNBLGdCQUFJLFFBQU8xTCxLQUFQLE1BQWlCLFFBQWpCLElBQTZCQSxLQUFLLENBQUMyTCxPQUF2QyxFQUFnRDtBQUM1Q0QsY0FBQUEsV0FBVyxHQUFHcFIsZUFBZSxDQUFDMEYsS0FBSyxDQUFDMkwsT0FBUCxDQUE3QjtBQUNILGFBRkQsTUFFTztBQUNIRCxjQUFBQSxXQUFXLEdBQUdwUixlQUFlLENBQUMwRixLQUFELENBQTdCO0FBQ0g7O0FBRUQsZ0JBQUksQ0FBQ3VMLFdBQVcsQ0FBQ0ssR0FBWixDQUFnQkYsV0FBaEIsQ0FBTCxFQUFtQztBQUMvQkgsY0FBQUEsV0FBVyxDQUFDTSxHQUFaLENBQWdCSCxXQUFoQjtBQUNBSixjQUFBQSxHQUFHLENBQUM3RyxNQUFKLENBQVd0TCxDQUFDLENBQUMsTUFBRCxDQUFELENBQVV1USxJQUFWLENBQWVnQyxXQUFmLENBQVg7QUFDSDtBQUNKLFdBWkQ7QUFhSDtBQUNKLE9BcEJEO0FBc0JBUixNQUFBQSxJQUFJLENBQUN6RyxNQUFMLENBQVk2RyxHQUFaO0FBQ0FuUyxNQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1Cc0osTUFBbkIsQ0FBMEJ5SSxJQUExQjtBQUNIO0FBQ0osR0FseEN5Qjs7QUFveEMxQjtBQUNKO0FBQ0E7QUFDSW5OLEVBQUFBLFNBdnhDMEIsdUJBdXhDZDtBQUNSO0FBQ0EsUUFBSTlFLHFCQUFxQixDQUFDSyxtQkFBdEIsQ0FBMENrRSxRQUExQyxDQUFtRCxZQUFuRCxDQUFKLEVBQXNFO0FBQ2xFMEIsTUFBQUEsSUFBSSxDQUFDbEYsYUFBTCxDQUFtQlcsV0FBbkIsQ0FBK0JSLEtBQS9CLEdBQXVDbEIscUJBQXFCLENBQUNzRCw2QkFBN0Q7QUFDSCxLQUZELE1BRU8sSUFBSXRELHFCQUFxQixDQUFDSSxZQUF0QixDQUFtQ3lFLEdBQW5DLE9BQTZDN0UscUJBQXFCLENBQUNRLGNBQXZFLEVBQXVGO0FBQzFGeUYsTUFBQUEsSUFBSSxDQUFDbEYsYUFBTCxDQUFtQlcsV0FBbkIsQ0FBK0JSLEtBQS9CLEdBQXVDLEVBQXZDO0FBQ0gsS0FGTSxNQUVBO0FBQ0grRSxNQUFBQSxJQUFJLENBQUNsRixhQUFMLENBQW1CVyxXQUFuQixDQUErQlIsS0FBL0IsR0FBdUNsQixxQkFBcUIsQ0FBQ2tELDJCQUE3RDtBQUNILEtBUk8sQ0FVUjs7O0FBQ0EsUUFBSWxELHFCQUFxQixDQUFDRyxpQkFBdEIsQ0FBd0MwRSxHQUF4QyxPQUFrRDdFLHFCQUFxQixDQUFDUSxjQUE1RSxFQUE0RjtBQUN4RnlGLE1BQUFBLElBQUksQ0FBQ2xGLGFBQUwsQ0FBbUJRLGdCQUFuQixDQUFvQ0wsS0FBcEMsR0FBNEMsRUFBNUM7QUFDSCxLQUZELE1BRU87QUFDSCtFLE1BQUFBLElBQUksQ0FBQ2xGLGFBQUwsQ0FBbUJRLGdCQUFuQixDQUFvQ0wsS0FBcEMsR0FBNENsQixxQkFBcUIsQ0FBQzBDLHFCQUFsRTtBQUNIO0FBQ0osR0F2eUN5Qjs7QUF5eUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0kwSyxFQUFBQSx3QkE5eUMwQixvQ0E4eUNEakIsUUE5eUNDLEVBOHlDUztBQUMvQixRQUFJMEcsSUFBSSxHQUFHLG1FQUFYO0FBQ0FBLElBQUFBLElBQUksSUFBSSwwQkFBUjtBQUNBQSxJQUFBQSxJQUFJLElBQUksNEJBQVIsQ0FIK0IsQ0FLL0I7O0FBQ0EsUUFBSTFHLFFBQVEsQ0FBQ0csT0FBYixFQUFzQjtBQUNsQnVHLE1BQUFBLElBQUksNERBQW1EN1MscUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ2EsUUFBUSxDQUFDRyxPQUExQyxDQUFuRCxXQUFKO0FBQ0gsS0FSOEIsQ0FVL0I7OztBQUNBLFFBQUlILFFBQVEsQ0FBQ0ssTUFBYixFQUFxQjtBQUNqQnFHLE1BQUFBLElBQUksMkRBQWtEN1MscUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ2EsUUFBUSxDQUFDSyxNQUExQyxDQUFsRCxDQUFKOztBQUNBLFVBQUlMLFFBQVEsQ0FBQ00sY0FBYixFQUE2QjtBQUN6Qm9HLFFBQUFBLElBQUksSUFBSSxpREFBUjtBQUNIOztBQUNEQSxNQUFBQSxJQUFJLElBQUksUUFBUjtBQUNILEtBakI4QixDQW1CL0I7OztBQUNBLFFBQUkxRyxRQUFRLENBQUMyRyxVQUFULElBQXVCM0csUUFBUSxDQUFDTyxRQUFwQyxFQUE4QztBQUMxQ21HLE1BQUFBLElBQUksMERBQWlEMUcsUUFBUSxDQUFDMkcsVUFBMUQsaUJBQTJFM0csUUFBUSxDQUFDTyxRQUFwRixXQUFKO0FBQ0gsS0F0QjhCLENBd0IvQjs7O0FBQ0EsUUFBSVAsUUFBUSxDQUFDUSxVQUFiLEVBQXlCO0FBQ3JCa0csTUFBQUEsSUFBSSxJQUFJLG9GQUFSO0FBQ0gsS0FGRCxNQUVPLElBQUkxRyxRQUFRLENBQUNTLGlCQUFULElBQThCLEVBQWxDLEVBQXNDO0FBQ3pDaUcsTUFBQUEsSUFBSSxrRkFBdUUxRyxRQUFRLENBQUNTLGlCQUFoRix1QkFBSjtBQUNILEtBRk0sTUFFQSxJQUFJVCxRQUFRLENBQUNTLGlCQUFULEdBQTZCLENBQWpDLEVBQW9DO0FBQ3ZDaUcsTUFBQUEsSUFBSSxnRkFBcUUxRyxRQUFRLENBQUNTLGlCQUE5RSx1QkFBSjtBQUNILEtBL0I4QixDQWlDL0I7OztBQUNBLFFBQUlULFFBQVEsQ0FBQzRHLEdBQVQsSUFBZ0I1RyxRQUFRLENBQUM0RyxHQUFULENBQWF0UCxNQUFiLEdBQXNCLENBQTFDLEVBQTZDO0FBQ3pDb1AsTUFBQUEsSUFBSSxJQUFJLHVEQUFSO0FBQ0FBLE1BQUFBLElBQUksSUFBSSxzREFBUjtBQUNBMUcsTUFBQUEsUUFBUSxDQUFDNEcsR0FBVCxDQUFhNUssT0FBYixDQUFxQixVQUFBNEssR0FBRyxFQUFJO0FBQ3hCRixRQUFBQSxJQUFJLGtDQUF5QjdTLHFCQUFxQixDQUFDc0wsVUFBdEIsQ0FBaUN5SCxHQUFqQyxDQUF6QixXQUFKO0FBQ0gsT0FGRDtBQUdBRixNQUFBQSxJQUFJLElBQUksY0FBUjtBQUNIOztBQUVEQSxJQUFBQSxJQUFJLElBQUksUUFBUixDQTNDK0IsQ0EyQ2I7O0FBQ2xCQSxJQUFBQSxJQUFJLElBQUksUUFBUixDQTVDK0IsQ0E0Q2I7O0FBQ2xCQSxJQUFBQSxJQUFJLElBQUksUUFBUixDQTdDK0IsQ0E2Q2I7O0FBRWxCLFdBQU9BLElBQVA7QUFDSCxHQTkxQ3lCOztBQWcyQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0l2TixFQUFBQSwyQkFwMkMwQix5Q0FvMkNJO0FBQzFCLFFBQU0wTixZQUFZLEdBQUc5UyxDQUFDLENBQUMsYUFBRCxDQUFELENBQWlCSSxNQUFqQixDQUF3QixXQUF4QixDQUFyQjtBQUNBLFFBQU0yUyxhQUFhLEdBQUcvUyxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCSSxNQUFsQixDQUF5QixXQUF6QixDQUF0Qjs7QUFFQSxRQUFJMFMsWUFBWSxDQUFDdlAsTUFBYixLQUF3QixDQUF4QixJQUE2QndQLGFBQWEsQ0FBQ3hQLE1BQWQsS0FBeUIsQ0FBMUQsRUFBNkQ7QUFDekQ7QUFDSCxLQU55QixDQVExQjs7O0FBQ0EsUUFBTXlQLGVBQWUsR0FBRyxTQUFsQkEsZUFBa0IsR0FBTTtBQUMxQixVQUFNQyxZQUFZLEdBQUdILFlBQVksQ0FBQ3pPLFFBQWIsQ0FBc0IsWUFBdEIsQ0FBckI7O0FBRUEsVUFBSSxDQUFDNE8sWUFBTCxFQUFtQjtBQUNmO0FBQ0FGLFFBQUFBLGFBQWEsQ0FBQzFPLFFBQWQsQ0FBdUIsU0FBdkI7QUFDQTBPLFFBQUFBLGFBQWEsQ0FBQ3JFLFFBQWQsQ0FBdUIsVUFBdkIsRUFIZSxDQUtmOztBQUNBcUUsUUFBQUEsYUFBYSxDQUFDaEYsSUFBZCxDQUFtQixjQUFuQixFQUFtQzVNLGVBQWUsQ0FBQytSLGtCQUFuRDtBQUNBSCxRQUFBQSxhQUFhLENBQUNoRixJQUFkLENBQW1CLGVBQW5CLEVBQW9DLFVBQXBDO0FBQ0gsT0FSRCxNQVFPO0FBQ0g7QUFDQWdGLFFBQUFBLGFBQWEsQ0FBQ3ZMLFdBQWQsQ0FBMEIsVUFBMUI7QUFDQXVMLFFBQUFBLGFBQWEsQ0FBQ0ksVUFBZCxDQUF5QixjQUF6QjtBQUNBSixRQUFBQSxhQUFhLENBQUNJLFVBQWQsQ0FBeUIsZUFBekI7QUFDSDtBQUNKLEtBakJELENBVDBCLENBNEIxQjs7O0FBQ0FILElBQUFBLGVBQWUsR0E3QlcsQ0ErQjFCO0FBQ0E7O0FBQ0FoVCxJQUFBQSxDQUFDLENBQUMsYUFBRCxDQUFELENBQWlCbUUsRUFBakIsQ0FBb0IsUUFBcEIsRUFBOEIsWUFBVztBQUNyQzZPLE1BQUFBLGVBQWU7QUFDbEIsS0FGRDtBQUdILEdBeDRDeUI7O0FBMjRDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSS9OLEVBQUFBLDRCQS80QzBCLDBDQSs0Q0s7QUFDM0IsUUFBTW1PLGNBQWMsR0FBR3BULENBQUMsQ0FBQyxjQUFELENBQXhCLENBRDJCLENBQ2dCOztBQUMzQyxRQUFNcVQsaUJBQWlCLEdBQUdyVCxDQUFDLENBQUMsdUJBQUQsQ0FBM0IsQ0FGMkIsQ0FFNEI7O0FBQ3ZELFFBQU1zVCxlQUFlLEdBQUd0VCxDQUFDLENBQUMsOEJBQUQsQ0FBekIsQ0FIMkIsQ0FLM0I7O0FBQ0EsUUFBSXVULGFBQWEsR0FBRyxJQUFwQjtBQUNBLFFBQUlDLFlBQVksR0FBRyxLQUFuQixDQVAyQixDQVMzQjs7QUFDQUYsSUFBQUEsZUFBZSxDQUFDN08sSUFBaEIsR0FWMkIsQ0FZM0I7O0FBQ0F6RSxJQUFBQSxDQUFDLENBQUM0SCxRQUFELENBQUQsQ0FBWXpELEVBQVosQ0FBZSw0QkFBZixFQUE2QyxZQUFNO0FBQy9Db1AsTUFBQUEsYUFBYSxHQUFHSCxjQUFjLENBQUN6TyxHQUFmLEVBQWhCO0FBQ0E2TyxNQUFBQSxZQUFZLEdBQUcsSUFBZjtBQUNILEtBSEQsRUFiMkIsQ0FrQjNCOztBQUNBSCxJQUFBQSxpQkFBaUIsQ0FBQ2xPLFFBQWxCLENBQTJCO0FBQ3ZCb0csTUFBQUEsUUFBUSxFQUFFLGtCQUFDNUksS0FBRCxFQUFXO0FBQ2pCO0FBQ0E7QUFFQTtBQUNBLFlBQUk2USxZQUFZLElBQUlELGFBQWEsS0FBSyxJQUFsQyxJQUEwQzVRLEtBQUssS0FBSzRRLGFBQXhELEVBQXVFO0FBQ25FRCxVQUFBQSxlQUFlLENBQUNHLFVBQWhCLENBQTJCLFNBQTNCO0FBQ0gsU0FGRCxNQUVPLElBQUlELFlBQUosRUFBa0I7QUFDckJGLFVBQUFBLGVBQWUsQ0FBQ0csVUFBaEIsQ0FBMkIsVUFBM0I7QUFDSCxTQVRnQixDQVdqQjs7O0FBQ0EsWUFBSUQsWUFBSixFQUFrQjtBQUNkek4sVUFBQUEsSUFBSSxDQUFDeUYsV0FBTDtBQUNIO0FBQ0o7QUFoQnNCLEtBQTNCO0FBa0JILEdBcDdDeUI7O0FBczdDMUI7QUFDSjtBQUNBO0FBQ0luRyxFQUFBQSxjQXo3QzBCLDRCQXk3Q1Q7QUFDYlUsSUFBQUEsSUFBSSxDQUFDaEcsUUFBTCxHQUFnQkQscUJBQXFCLENBQUNDLFFBQXRDLENBRGEsQ0FHYjs7QUFDQWdHLElBQUFBLElBQUksQ0FBQzJOLFdBQUwsQ0FBaUJDLE9BQWpCLEdBQTJCLElBQTNCO0FBQ0E1TixJQUFBQSxJQUFJLENBQUMyTixXQUFMLENBQWlCRSxTQUFqQixHQUE2QjNOLGtCQUE3QjtBQUNBRixJQUFBQSxJQUFJLENBQUMyTixXQUFMLENBQWlCRyxVQUFqQixHQUE4QixjQUE5QixDQU5hLENBUWI7O0FBQ0E5TixJQUFBQSxJQUFJLENBQUMrTix1QkFBTCxHQUErQixJQUEvQixDQVRhLENBV2I7O0FBQ0EvTixJQUFBQSxJQUFJLENBQUNtTCxlQUFMLEdBQXVCLElBQXZCLENBWmEsQ0FjYjs7QUFDQW5MLElBQUFBLElBQUksQ0FBQ2dPLG1CQUFMLEdBQTJCLElBQTNCO0FBQ0FoTyxJQUFBQSxJQUFJLENBQUNpTyxvQkFBTCxHQUE0QixJQUE1QjtBQUNBak8sSUFBQUEsSUFBSSxDQUFDa08sR0FBTDtBQUVBbE8sSUFBQUEsSUFBSSxDQUFDbEYsYUFBTCxHQUFxQmYscUJBQXFCLENBQUNlLGFBQTNDO0FBQ0FrRixJQUFBQSxJQUFJLENBQUMySyxnQkFBTCxHQUF3QjVRLHFCQUFxQixDQUFDNFEsZ0JBQTlDO0FBQ0EzSyxJQUFBQSxJQUFJLENBQUMwTCxlQUFMLEdBQXVCM1IscUJBQXFCLENBQUMyUixlQUE3QztBQUNBMUwsSUFBQUEsSUFBSSxDQUFDekMsVUFBTDtBQUNIO0FBaDlDeUIsQ0FBOUIsQyxDQW05Q0E7O0FBQ0F0RCxDQUFDLENBQUM0SCxRQUFELENBQUQsQ0FBWXNNLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBVLEVBQUFBLHFCQUFxQixDQUFDd0QsVUFBdEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBhc3N3b3JkU2NvcmUsIFBieEFwaSwgVXNlck1lc3NhZ2UsIFNvdW5kRmlsZVNlbGVjdG9yLCBHZW5lcmFsU2V0dGluZ3NBUEksIENsaXBib2FyZEpTLCBQYXNzd29yZFdpZGdldCwgUGFzc3dvcmRzQVBJLCBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciwgJCAqL1xuXG4vKipcbiAqIEEgbW9kdWxlIHRvIGhhbmRsZSBtb2RpZmljYXRpb24gb2YgZ2VuZXJhbCBzZXR0aW5ncy5cbiAqL1xuY29uc3QgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkd2ViQWRtaW5QYXNzd29yZDogJCgnI1dlYkFkbWluUGFzc3dvcmQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmQ6ICQoJyNTU0hQYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlzYWJsZVNTSFBhc3N3b3JkOiAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykucGFyZW50KCcuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmRTZWdtZW50OiAkKCcjb25seS1pZi1wYXNzd29yZC1lbmFibGVkJyksXG5cbiAgICAvKipcbiAgICAgKiBJZiBwYXNzd29yZCBzZXQsIGl0IHdpbGwgYmUgaGlkZWQgZnJvbSB3ZWIgdWkuXG4gICAgICovXG4gICAgaGlkZGVuUGFzc3dvcmQ6ICd4eHh4eHh4JyxcblxuICAgIC8qKlxuICAgICAqIFNvdW5kIGZpbGUgZmllbGQgSURzXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBzb3VuZEZpbGVGaWVsZHM6IHtcbiAgICAgICAgYW5ub3VuY2VtZW50SW46ICdQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbicsXG4gICAgICAgIGFubm91bmNlbWVudE91dDogJ1BCWFJlY29yZEFubm91bmNlbWVudE91dCdcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIE9yaWdpbmFsIGNvZGVjIHN0YXRlIGZyb20gbGFzdCBsb2FkXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBvcmlnaW5hbENvZGVjU3RhdGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBjb2RlY3MgaGF2ZSBiZWVuIGNoYW5nZWRcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBjb2RlY3NDaGFuZ2VkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgZGF0YSBoYXMgYmVlbiBsb2FkZWQgZnJvbSBBUElcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBkYXRhTG9hZGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczogeyAvLyBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlc1xuICAgICAgICBwYnhuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnUEJYTmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgV2ViQWRtaW5QYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXRjaFtXZWJBZG1pblBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFNTSFBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU1NIUGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbU1NIUGFzc3dvcmRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQlBvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCSFRUUFNQb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCSFRUUFNQb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV0VCSFRUUFNQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBBSkFNUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ0FKQU1Qb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgU0lQQXV0aFByZWZpeDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NJUEF1dGhQcmVmaXgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bYS16QS1aXSokL10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4SW52YWxpZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgd2ViIGFkbWluIHBhc3N3b3JkIGZpZWxkIHdoZW4gaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgd2ViQWRtaW5QYXNzd29yZFJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5V2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1tBLVpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcbiAgICAvLyBSdWxlcyBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZCB3aGVuIFNTSCBsb2dpbiB0aHJvdWdoIHRoZSBwYXNzd29yZCBlbmFibGVkLCBhbmQgaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1xcZC8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGRpc2FibGVkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfVxuICAgIF0sXG5cbiAgICAvKipcbiAgICAgKiBDbGlwYm9hcmQgaW5zdGFuY2UgZm9yIGNvcHkgZnVuY3Rpb25hbGl0eVxuICAgICAqIEB0eXBlIHtDbGlwYm9hcmRKU31cbiAgICAgKi9cbiAgICBjbGlwYm9hcmQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogIEluaXRpYWxpemUgbW9kdWxlIHdpdGggZXZlbnQgYmluZGluZ3MgYW5kIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldHNcbiAgICAgICAgLy8gV2ViIEFkbWluIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC5pbml0KGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZCwge1xuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdnZW5lcmFsX3dlYicsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogZmFsc2UsICAgICAvLyBObyBzaG93L2hpZGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU1NIIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc3NoV2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLCB7XG4gICAgICAgICAgICAgICAgY29udGV4dDogJ2dlbmVyYWxfc3NoJyxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSwgICAgIC8vIE5vIHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgU1NIIGRpc2FibGUgY2hlY2tib3hcbiAgICAgICAgICAgICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuaGlkZVdhcm5pbmdzKHNzaFdpZGdldCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzc2hXaWRnZXQuZWxlbWVudHMuJHNjb3JlU2VjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3NoV2lkZ2V0LmVsZW1lbnRzLiRzY29yZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuY2hlY2tQYXNzd29yZChzc2hXaWRnZXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyB3aGVuIHBhc3N3b3JkcyBjaGFuZ2VcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUEJYTGFuZ3VhZ2UgZHJvcGRvd24gZmlyc3Qgd2l0aCBzcGVjaWFsIGhhbmRsZXJcbiAgICAgICAgLy8gTXVzdCBiZSBkb25lIGJlZm9yZSBnZW5lcmFsIGRyb3Bkb3duIGluaXRpYWxpemF0aW9uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nKCk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGRyb3Bkb3ducyBvbiB0aGUgZm9ybSAoZXhjZXB0IHNvdW5kIGZpbGUgc2VsZWN0b3JzIGFuZCBsYW5ndWFnZSBkcm9wZG93bilcbiAgICAgICAgLy8gTGFuZ3VhZ2UgZHJvcGRvd24gYWxyZWFkeSBpbml0aWFsaXplZCBhYm92ZSB3aXRoIHNwZWNpYWwgb25DaGFuZ2UgaGFuZGxlclxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5kcm9wZG93bicpXG4gICAgICAgICAgICAubm90KCcuYXVkaW8tbWVzc2FnZS1zZWxlY3QnKVxuICAgICAgICAgICAgLm5vdCgnI1BCWExhbmd1YWdlLWRyb3Bkb3duJylcbiAgICAgICAgICAgIC5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveGVzIG9uIHRoZSBmb3JtXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgQU1JL0FKQU0gZGVwZW5kZW5jeSBhZnRlciBjaGVja2JveGVzIGFyZSBpbml0aWFsaXplZFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUFNSUFKQU1EZXBlbmRlbmN5KCk7XG5cbiAgICAgICAgLy8gQ29kZWMgdGFibGUgZHJhZy1uLWRyb3Agd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKSB3aGljaCBpcyBjYWxsZWQgZnJvbSB1cGRhdGVDb2RlY1RhYmxlcygpXG5cbiAgICAgICAgLy8gU291bmQgZmlsZSBzZWxlY3RvcnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBSRVNUIEFQSSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgbG9hZFNvdW5kRmlsZVZhbHVlcygpIG1ldGhvZCBjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RlOiBTU0gga2V5cyB0YWJsZSB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgbG9hZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyBkaXNwbGF5XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgY29weSBidXR0b25zXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhZGRpdGlvbmFsIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuXG4gICAgICAgIC8vIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goe1xuICAgICAgICAgICAgJ29uQ2hhbmdlJzogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmRcbiAgICAgICAgfSk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIHRvIGhhbmRsZSB0YWIgYWN0aXZhdGlvblxuICAgICAgICAkKHdpbmRvdykub24oJ0dTLUFjdGl2YXRlVGFiJywgKGV2ZW50LCBuYW1lVGFiKSA9PiB7XG4gICAgICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoJ2NoYW5nZSB0YWInLCBuYW1lVGFiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBpZiAodHlwZW9mIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVG9vbHRpcCBjbGljayBiZWhhdmlvciBpcyBub3cgaGFuZGxlZCBnbG9iYWxseSBpbiBUb29sdGlwQnVpbGRlci5qc1xuXG4gICAgICAgIC8vIFBCWExhbmd1YWdlIGRyb3Bkb3duIHdpdGggcmVzdGFydCB3YXJuaW5nIGFscmVhZHkgaW5pdGlhbGl6ZWQgYWJvdmVcblxuICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSBBUEkgaW5zdGVhZCBvZiB1c2luZyBzZXJ2ZXItcmVuZGVyZWQgdmFsdWVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggcGxheWJhY2sgZnVuY3Rpb25hbGl0eSB1c2luZyBTb3VuZEZpbGVTZWxlY3RvclxuICAgICAqIEhUTUwgc3RydWN0dXJlIGlzIHByb3ZpZGVkIGJ5IHRoZSBwbGF5QWRkTmV3U291bmRXaXRoSWNvbnMgcGFydGlhbCBpbiByZWNvcmRpbmcudm9sdDpcbiAgICAgKiAtIEhpZGRlbiBpbnB1dDogPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCIgbmFtZT1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCI+XG4gICAgICogLSBEcm9wZG93biBkaXY6IDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gc2VhcmNoIFBCWFJlY29yZEFubm91bmNlbWVudEluLWRyb3Bkb3duXCI+XG4gICAgICogLSBQbGF5YmFjayBidXR0b24gYW5kIGFkZCBuZXcgYnV0dG9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9ycygpIHtcbiAgICAgICAgLy8gU291bmQgZmlsZSBzZWxlY3RvcnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9yV2l0aERhdGEoKSBjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKVxuICAgICAgICBcbiAgICAgICAgLy8gVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgY29uc2lzdGVuY3kgYnV0IGFjdHVhbCBpbml0aWFsaXphdGlvbiBoYXBwZW5zXG4gICAgICAgIC8vIHdoZW4gd2UgaGF2ZSBkYXRhIGZyb20gdGhlIHNlcnZlciBpbiBsb2FkU291bmRGaWxlVmFsdWVzKClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBnZW5lcmFsIHNldHRpbmdzIGRhdGEgZnJvbSBBUElcbiAgICAgKiBVc2VkIGJvdGggb24gaW5pdGlhbCBwYWdlIGxvYWQgYW5kIGZvciBtYW51YWwgcmVmcmVzaFxuICAgICAqIENhbiBiZSBjYWxsZWQgYW55dGltZSB0byByZWxvYWQgdGhlIGZvcm0gZGF0YTogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWREYXRhKClcbiAgICAgKi9cbiAgICBsb2FkRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHRoZSBmb3JtIHdpdGggZGltbWVyXG4gICAgICAgIEZvcm0uc2hvd0xvYWRpbmdTdGF0ZSh0cnVlLCAnTG9hZGluZyBzZXR0aW5ncy4uLicpO1xuXG4gICAgICAgIEdlbmVyYWxTZXR0aW5nc0FQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIEZvcm0uaGlkZUxvYWRpbmdTdGF0ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggdGhlIHJlY2VpdmVkIGRhdGFcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5kYXRhTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaG93IHdhcm5pbmdzIGZvciBkZWZhdWx0IHBhc3N3b3JkcyBhZnRlciBET00gdXBkYXRlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEucGFzc3dvcmRWYWxpZGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgdXBkYXRlZCBhZnRlciBwb3B1bGF0ZUZvcm1cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0RlZmF1bHRQYXNzd29yZFdhcm5pbmdzKHJlc3BvbnNlLmRhdGEucGFzc3dvcmRWYWxpZGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQVBJIEVycm9yOicsIHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dBcGlFcnJvcihyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNldHRpbmdzIGRhdGEgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBFeHRyYWN0IHNldHRpbmdzIGFuZCBhZGRpdGlvbmFsIGRhdGFcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBkYXRhLnNldHRpbmdzIHx8IGRhdGE7XG4gICAgICAgIGNvbnN0IGNvZGVjcyA9IGRhdGEuY29kZWNzIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShzZXR0aW5ncywge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNwZWNpYWwgZmllbGQgdHlwZXNcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucG9wdWxhdGVTcGVjaWFsRmllbGRzKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHNvdW5kIGZpbGUgdmFsdWVzIHdpdGggcmVwcmVzZW50YXRpb25zXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWRTb3VuZEZpbGVWYWx1ZXMoZm9ybURhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBjb2RlYyB0YWJsZXNcbiAgICAgICAgICAgICAgICBpZiAoY29kZWNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgZmllbGRzIChoaWRlIGFjdHVhbCBwYXNzd29yZHMpXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVQYXNzd29yZEZpZWxkcyhmb3JtRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIFNTSCBwYXNzd29yZCB2aXNpYmlsaXR5XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmQoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU1NIIGtleXMgdGFibGUgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBzc2hLZXlzVGFibGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBzc2hLZXlzVGFibGUuaW5pdGlhbGl6ZSgnc3NoLWtleXMtY29udGFpbmVyJywgJ1NTSEF1dGhvcml6ZWRLZXlzJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyB3aXRoIG5ldyBkYXRhXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50IHRvIG5vdGlmeSB0aGF0IGRhdGEgaGFzIGJlZW4gbG9hZGVkXG4gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ0dlbmVyYWxTZXR0aW5ncy5kYXRhTG9hZGVkJyk7XG5cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzcGVjaWFsIGZpZWxkIHR5cGVzIHRoYXQgbmVlZCBjdXN0b20gcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVNwZWNpYWxGaWVsZHMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gUHJpdmF0ZSBrZXkgZXhpc3RlbmNlIGlzIG5vdyBkZXRlcm1pbmVkIGJ5IGNoZWNraW5nIGlmIHZhbHVlIGVxdWFscyBISURERU5fUEFTU1dPUkRcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgIGlmIChzZXR0aW5ncy5XRUJIVFRQU1B1YmxpY0tleV9pbmZvKSB7XG4gICAgICAgICAgICAkKCcjV0VCSFRUUFNQdWJsaWNLZXknKS5kYXRhKCdjZXJ0LWluZm8nLCBzZXR0aW5ncy5XRUJIVFRQU1B1YmxpY0tleV9pbmZvKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNoZWNrYm94ZXMgKEFQSSByZXR1cm5zIGJvb2xlYW4gdmFsdWVzKVxuICAgICAgICBPYmplY3Qua2V5cyhzZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJChgIyR7a2V5fWApLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBzZXR0aW5nc1trZXldID09PSB0cnVlIHx8IHNldHRpbmdzW2tleV0gPT09ICcxJyB8fCBzZXR0aW5nc1trZXldID09PSAxO1xuICAgICAgICAgICAgICAgICRjaGVja2JveC5jaGVja2JveChpc0NoZWNrZWQgPyAnY2hlY2snIDogJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIHJlZ3VsYXIgZHJvcGRvd25zIChleGNsdWRpbmcgc291bmQgZmlsZSBzZWxlY3RvcnMgd2hpY2ggYXJlIGhhbmRsZWQgc2VwYXJhdGVseSlcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2tleX1gKS5wYXJlbnQoJy5kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPiAwICYmICEkZHJvcGRvd24uaGFzQ2xhc3MoJ2F1ZGlvLW1lc3NhZ2Utc2VsZWN0JykpIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNldHRpbmdzW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgZmllbGRzIHdpdGggaGlkZGVuIHBhc3N3b3JkIGluZGljYXRvclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGFcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gSGlkZSBhY3R1YWwgcGFzc3dvcmRzIGFuZCBzaG93IGhpZGRlbiBpbmRpY2F0b3JcbiAgICAgICAgaWYgKHNldHRpbmdzLldlYkFkbWluUGFzc3dvcmQgJiYgc2V0dGluZ3MuV2ViQWRtaW5QYXNzd29yZCAhPT0gJycpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoc2V0dGluZ3MuU1NIUGFzc3dvcmQgJiYgc2V0dGluZ3MuU1NIUGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IEFQSSBlcnJvciBtZXNzYWdlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXNzYWdlcyAtIEVycm9yIG1lc3NhZ2VzIGZyb20gQVBJXG4gICAgICovXG4gICAgc2hvd0FwaUVycm9yKG1lc3NhZ2VzKSB7XG4gICAgICAgIGlmIChtZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gQXJyYXkuaXNBcnJheShtZXNzYWdlcy5lcnJvcikgXG4gICAgICAgICAgICAgICAgPyBtZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIFxuICAgICAgICAgICAgICAgIDogbWVzc2FnZXMuZXJyb3I7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyB3YXJuaW5ncyBmb3IgZGVmYXVsdCBwYXNzd29yZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdmFsaWRhdGlvbiAtIFBhc3N3b3JkIHZhbGlkYXRpb24gcmVzdWx0cyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHNob3dEZWZhdWx0UGFzc3dvcmRXYXJuaW5ncyh2YWxpZGF0aW9uKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgcGFzc3dvcmQtdmFsaWRhdGUgbWVzc2FnZXMgZmlyc3RcbiAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHdhcm5pbmcgZm9yIGRlZmF1bHQgV2ViIEFkbWluIHBhc3N3b3JkXG4gICAgICAgIGlmICh2YWxpZGF0aW9uLmlzRGVmYXVsdFdlYlBhc3N3b3JkKSB7XG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBwYXNzd29yZCBmaWVsZHMgZ3JvdXAgLSB0cnkgbXVsdGlwbGUgc2VsZWN0b3JzXG4gICAgICAgICAgICBsZXQgJHdlYlBhc3N3b3JkRmllbGRzID0gJCgnI1dlYkFkbWluUGFzc3dvcmQnKS5jbG9zZXN0KCcudHdvLmZpZWxkcycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHdlYlBhc3N3b3JkRmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSBhbHRlcm5hdGl2ZSBzZWxlY3RvciBpZiB0aGUgZmlyc3Qgb25lIGRvZXNuJ3Qgd29ya1xuICAgICAgICAgICAgICAgICR3ZWJQYXNzd29yZEZpZWxkcyA9ICQoJyNXZWJBZG1pblBhc3N3b3JkJykucGFyZW50KCkucGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkd2ViUGFzc3dvcmRGaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCB3YXJuaW5nSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIGljb24gbWVzc2FnZSBwYXNzd29yZC12YWxpZGF0ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUucHN3X1NldFBhc3N3b3JkfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmR9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5zZXJ0IHdhcm5pbmcgYmVmb3JlIHRoZSBwYXNzd29yZCBmaWVsZHNcbiAgICAgICAgICAgICAgICAkd2ViUGFzc3dvcmRGaWVsZHMuYmVmb3JlKHdhcm5pbmdIdG1sKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGZvciBkZWZhdWx0IFNTSCBwYXNzd29yZFxuICAgICAgICBpZiAodmFsaWRhdGlvbi5pc0RlZmF1bHRTU0hQYXNzd29yZCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgU1NIIHBhc3N3b3JkIGxvZ2luIGlzIGVuYWJsZWRcbiAgICAgICAgICAgIGNvbnN0IHNzaFBhc3N3b3JkRGlzYWJsZWQgPSAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFzc2hQYXNzd29yZERpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkcyBncm91cFxuICAgICAgICAgICAgICAgIGxldCAkc3NoUGFzc3dvcmRGaWVsZHMgPSAkKCcjU1NIUGFzc3dvcmQnKS5jbG9zZXN0KCcudHdvLmZpZWxkcycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkc3NoUGFzc3dvcmRGaWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSBhbHRlcm5hdGl2ZSBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICAkc3NoUGFzc3dvcmRGaWVsZHMgPSAkKCcjU1NIUGFzc3dvcmQnKS5wYXJlbnQoKS5wYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRzc2hQYXNzd29yZEZpZWxkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2FybmluZ0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgaWNvbiBtZXNzYWdlIHBhc3N3b3JkLXZhbGlkYXRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5wc3dfU2V0UGFzc3dvcmR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmR9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgd2FybmluZyBiZWZvcmUgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFuZCBsb2FkIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggZGF0YSwgc2ltaWxhciB0byBJVlIgaW1wbGVtZW50YXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNvdW5kRmlsZVZhbHVlcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBDb252ZXJ0IGVtcHR5IHZhbHVlcyB0byAtMSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICAgIGNvbnN0IGRhdGFJbiA9IHsuLi5zZXR0aW5nc307XG4gICAgICAgIGlmICghc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gfHwgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gPT09ICcnKSB7XG4gICAgICAgICAgICBkYXRhSW4uUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gPSAnLTEnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbmNvbWluZyBhbm5vdW5jZW1lbnQgc2VsZWN0b3Igd2l0aCBkYXRhIChmb2xsb3dpbmcgSVZSIHBhdHRlcm4pXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ1BCWFJlY29yZEFubm91bmNlbWVudEluJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YUluXG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgZW1wdHkgdmFsdWVzIHRvIC0xIGZvciB0aGUgZHJvcGRvd25cbiAgICAgICAgY29uc3QgZGF0YU91dCA9IHsuLi5zZXR0aW5nc307XG4gICAgICAgIGlmICghc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IHx8IHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudE91dCA9PT0gJycpIHtcbiAgICAgICAgICAgIGRhdGFPdXQuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0ID0gJy0xJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3V0Z29pbmcgYW5ub3VuY2VtZW50IHNlbGVjdG9yIHdpdGggZGF0YSAoZm9sbG93aW5nIElWUiBwYXR0ZXJuKVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdQQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhT3V0XG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhbmQgdXBkYXRlIGNvZGVjIHRhYmxlcyB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb2RlY3MgLSBBcnJheSBvZiBjb2RlYyBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcykge1xuICAgICAgICAvLyBSZXNldCBjb2RlYyBjaGFuZ2UgZmxhZyB3aGVuIGxvYWRpbmcgZGF0YVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIGNvZGVjIHN0YXRlIGZvciBjb21wYXJpc29uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNlcGFyYXRlIGF1ZGlvIGFuZCB2aWRlbyBjb2RlY3NcbiAgICAgICAgY29uc3QgYXVkaW9Db2RlY3MgPSBjb2RlY3MuZmlsdGVyKGMgPT4gYy50eXBlID09PSAnYXVkaW8nKS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgIGNvbnN0IHZpZGVvQ29kZWNzID0gY29kZWNzLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ3ZpZGVvJykuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgYXVkaW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUoYXVkaW9Db2RlY3MsICdhdWRpbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgdmlkZW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUodmlkZW9Db2RlY3MsICd2aWRlbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSBsb2FkZXJzIGFuZCBzaG93IHRhYmxlc1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLWxvYWRlciwgI3ZpZGVvLWNvZGVjcy1sb2FkZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUsICN2aWRlby1jb2RlY3MtdGFibGUnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIHJlb3JkZXJpbmdcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb2RlYyB0YWJsZSByb3dzIGZyb20gZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvZGVjcyAtIEFycmF5IG9mIGNvZGVjIG9iamVjdHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtICdhdWRpbycgb3IgJ3ZpZGVvJ1xuICAgICAqL1xuICAgIGJ1aWxkQ29kZWNUYWJsZShjb2RlY3MsIHR5cGUpIHtcbiAgICAgICAgY29uc3QgJHRhYmxlQm9keSA9ICQoYCMke3R5cGV9LWNvZGVjcy10YWJsZSB0Ym9keWApO1xuICAgICAgICAkdGFibGVCb2R5LmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICBjb2RlY3MuZm9yRWFjaCgoY29kZWMsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBzdGF0ZSBmb3IgY2hhbmdlIGRldGVjdGlvblxuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZVtjb2RlYy5uYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXgsXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGNvZGVjLmRpc2FibGVkXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFibGUgcm93XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gY29kZWMuZGlzYWJsZWQgPT09IHRydWUgfHwgY29kZWMuZGlzYWJsZWQgPT09ICcxJyB8fCBjb2RlYy5kaXNhYmxlZCA9PT0gMTtcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrZWQgPSAhaXNEaXNhYmxlZCA/ICdjaGVja2VkJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCByb3dIdG1sID0gYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cImNvZGVjLXJvd1wiIGlkPVwiY29kZWMtJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtpbmRleH1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb2RlYy1uYW1lPVwiJHtjb2RlYy5uYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtb3JpZ2luYWwtcHJpb3JpdHk9XCIke2luZGV4fVwiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJjb2xsYXBzaW5nIGRyYWdIYW5kbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic29ydCBncmV5IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggY29kZWNzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwiY29kZWNfJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2NoZWNrZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmluZGV4PVwiMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJjb2RlY18ke2NvZGVjLm5hbWV9XCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjb2RlYy5kZXNjcmlwdGlvbiB8fCBjb2RlYy5uYW1lKX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICR0YWJsZUJvZHkuYXBwZW5kKHJvd0h0bWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyBmb3IgdGhlIG5ldyByb3dzXG4gICAgICAgICR0YWJsZUJvZHkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgY29kZWNzIGFzIGNoYW5nZWQgYW5kIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIGNvZGVjIHRhYmxlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkge1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlLCAjdmlkZW8tY29kZWNzLXRhYmxlJykudGFibGVEbkQoe1xuICAgICAgICAgICAgb25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnLFxuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGNvZGVjcyBhcyBjaGFuZ2VkIGFuZCBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjZXJ0aWZpY2F0ZSBmaWVsZCBkaXNwbGF5IG9ubHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpIHtcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIG9ubHlcbiAgICAgICAgY29uc3QgJGNlcnRQdWJLZXlGaWVsZCA9ICQoJyNXRUJIVFRQU1B1YmxpY0tleScpO1xuICAgICAgICBpZiAoJGNlcnRQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRjZXJ0UHViS2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGNlcnRpZmljYXRlIGluZm8gaWYgYXZhaWxhYmxlIGZyb20gZGF0YSBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGNlcnRJbmZvID0gJGNlcnRQdWJLZXlGaWVsZC5kYXRhKCdjZXJ0LWluZm8nKSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzIGZvciB0aGlzIGZpZWxkIG9ubHlcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheSwgLmNlcnQtZWRpdC1mb3JtJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbWVhbmluZ2Z1bCBkaXNwbGF5IHRleHQgZnJvbSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgICAgICAgICAgbGV0IGRpc3BsYXlUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHN1YmplY3QvZG9tYWluXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDwn5OcICR7Y2VydEluZm8uc3ViamVjdH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGlzc3VlciBpZiBub3Qgc2VsZi1zaWduZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3VlciAmJiAhY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYGJ5ICR7Y2VydEluZm8uaXNzdWVyfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKCcoU2VsZi1zaWduZWQpJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCB2YWxpZGl0eSBkYXRlc1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4p2MIEV4cGlyZWQgJHtjZXJ0SW5mby52YWxpZF90b31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDimqDvuI8gRXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKchSBWYWxpZCB1bnRpbCAke2NlcnRJbmZvLnZhbGlkX3RvfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IHBhcnRzLmpvaW4oJyB8ICcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRydW5jYXRlZCBjZXJ0aWZpY2F0ZVxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS50cnVuY2F0ZUNlcnRpZmljYXRlKGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIG9yaWdpbmFsIGZpZWxkXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIHN0YXR1cyBjb2xvciBjbGFzcyBiYXNlZCBvbiBjZXJ0aWZpY2F0ZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBsZXQgc3RhdHVzQ2xhc3MgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICd3YXJuaW5nJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgY2VydC1kaXNwbGF5ICR7c3RhdHVzQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZGlzcGxheVRleHQpfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cImJhc2ljXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlDZXJ0fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29weSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBpbmZvLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENlcnRJbmZvfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZWRpdC1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImVkaXQgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZGVsZXRlLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInRyYXNoIGljb24gcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAke2NlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvciA/IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5yZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMoY2VydEluZm8pIDogJyd9XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBmb3JtIGNlcnQtZWRpdC1mb3JtXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1B1YmxpY0tleV9lZGl0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M9XCIxMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHVibGljQ2VydH1cIj4ke2Z1bGxWYWx1ZX08L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbWluaSBidXR0b25zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIHBvc2l0aXZlIGJ1dHRvbiBzYXZlLWNlcnQtYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuYnRfU2F2ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGNhbmNlbC1jZXJ0LWJ0blwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNsb3NlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X0NhbmNlbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgaW5mbyBidXR0b24gLSB0b2dnbGUgZGV0YWlscyBkaXNwbGF5XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuaW5mby1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZGV0YWlscyA9ICRjb250YWluZXIuZmluZCgnLmNlcnQtZGV0YWlscycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGRldGFpbHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZGV0YWlscy5zbGlkZVRvZ2dsZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVkaXQgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZWRpdC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWVkaXQtZm9ybScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQdWJsaWNLZXlfZWRpdCcpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc2F2ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9ICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHVibGljS2V5X2VkaXQnKS52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgb3JpZ2luYWwgaGlkZGVuIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIGRpc3BsYXkgd2l0aCBuZXcgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGNhbmNlbCBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jYW5jZWwtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1lZGl0LWZvcm0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheScpLnNob3coKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmRlbGV0ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGNlcnRpZmljYXRlXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIHRvIHNob3cgZW1wdHkgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBuZXcgYnV0dG9uc1xuICAgICAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVB1YmxpY0NlcnQpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuYXR0cigncm93cycsICcxMCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjaGFuZ2UgZXZlbnRzIHRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5vZmYoJ2lucHV0LmNlcnQgY2hhbmdlLmNlcnQga2V5dXAuY2VydCcpLm9uKCdpbnB1dC5jZXJ0IGNoYW5nZS5jZXJ0IGtleXVwLmNlcnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgZGlzcGxheSBmb3IgU1NIIGtleXMgYW5kIGNlcnRpZmljYXRlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBTU0hfSURfUlNBX1BVQiBmaWVsZFxuICAgICAgICBjb25zdCAkc3NoUHViS2V5RmllbGQgPSAkKCcjU1NIX0lEX1JTQV9QVUInKTtcbiAgICAgICAgaWYgKCRzc2hQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRzc2hQdWJLZXlGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkc3NoUHViS2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc3NoLWtleS1kaXNwbGF5LCAuZnVsbC1kaXNwbGF5JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgY3JlYXRlIGRpc3BsYXkgaWYgdGhlcmUncyBhIHZhbHVlXG4gICAgICAgICAgICBpZiAoZnVsbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRydW5jYXRlZCBkaXNwbGF5XG4gICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnRydW5jYXRlU1NIS2V5KGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgb3JpZ2luYWwgZmllbGRcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aW9uIGlucHV0IGZsdWlkIHNzaC1rZXktZGlzcGxheVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke3RydW5jYXRlZH1cIiByZWFkb25seSBjbGFzcz1cInRydW5jYXRlZC1kaXNwbGF5XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBjb3B5LWJ0blwiIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGZ1bGxWYWx1ZSl9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFyaWF0aW9uPVwiYmFzaWNcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weUtleX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZXhwYW5kLWJ0blwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRXhwYW5kfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhwYW5kIGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGNsYXNzPVwiZnVsbC1kaXNwbGF5XCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCIgcmVhZG9ubHk+JHtmdWxsVmFsdWV9PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIGV4cGFuZC9jb2xsYXBzZVxuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZXhwYW5kLWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZ1bGxEaXNwbGF5ID0gJGNvbnRhaW5lci5maW5kKCcuZnVsbC1kaXNwbGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRydW5jYXRlZERpc3BsYXkgPSAkY29udGFpbmVyLmZpbmQoJy5zc2gta2V5LWRpc3BsYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQodGhpcykuZmluZCgnaScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkZnVsbERpc3BsYXkuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJGZ1bGxEaXNwbGF5LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJHRydW5jYXRlZERpc3BsYXkuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnY29tcHJlc3MnKS5hZGRDbGFzcygnZXhwYW5kJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGZ1bGxEaXNwbGF5LnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJHRydW5jYXRlZERpc3BsYXkuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXhwYW5kJykuYWRkQ2xhc3MoJ2NvbXByZXNzJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIG5ldyBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG9yaWdpbmFsIGZpZWxkIGFzIHJlYWQtb25seSAodGhpcyBpcyBhIHN5c3RlbS1nZW5lcmF0ZWQga2V5KVxuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX05vU1NIUHVibGljS2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIC0gdXNlIGRlZGljYXRlZCBtZXRob2RcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgV0VCSFRUUFNQcml2YXRlS2V5IGZpZWxkICh3cml0ZS1vbmx5IHdpdGggcGFzc3dvcmQgbWFza2luZylcbiAgICAgICAgY29uc3QgJGNlcnRQcml2S2V5RmllbGQgPSAkKCcjV0VCSFRUUFNQcml2YXRlS2V5Jyk7XG4gICAgICAgIGlmICgkY2VydFByaXZLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkY2VydFByaXZLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5wcml2YXRlLWtleS1zZXQsICNXRUJIVFRQU1ByaXZhdGVLZXlfbmV3JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHByaXZhdGUga2V5IGV4aXN0cyAocGFzc3dvcmQgbWFza2luZyBsb2dpYylcbiAgICAgICAgICAgIC8vIFRoZSBmaWVsZCB3aWxsIGNvbnRhaW4gJ3h4eHh4eHgnIGlmIGEgcHJpdmF0ZSBrZXkgaXMgc2V0XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkY2VydFByaXZLZXlGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1ZhbHVlID0gY3VycmVudFZhbHVlID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChoYXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgb3JpZ2luYWwgZmllbGQgYW5kIHNob3cgc3RhdHVzIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2UgcHJpdmF0ZS1rZXktc2V0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImxvY2sgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19Qcml2YXRlS2V5SXNTZXR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxhY2Uta2V5LWxpbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19SZXBsYWNlfTwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBpZD1cIldFQkhUVFBTUHJpdmF0ZUtleV9uZXdcIiBuYW1lPVwiV0VCSFRUUFNQcml2YXRlS2V5XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dzPVwiMTBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHJpdmF0ZUtleX1cIj48L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSByZXBsYWNlIGxpbmtcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5yZXBsYWNlLWtleS1saW5rJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnByaXZhdGUta2V5LXNldCcpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJG5ld0ZpZWxkID0gJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQcml2YXRlS2V5X25ldycpO1xuICAgICAgICAgICAgICAgICAgICAkbmV3RmllbGQuc2hvdygpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgaGlkZGVuIHBhc3N3b3JkIHZhbHVlIHNvIHdlIGNhbiBzZXQgYSBuZXcgb25lXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBCaW5kIGNoYW5nZSBldmVudCB0byB1cGRhdGUgaGlkZGVuIGZpZWxkIGFuZCBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgJG5ld0ZpZWxkLm9uKCdpbnB1dCBjaGFuZ2Uga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgb3JpZ2luYWwgaGlkZGVuIGZpZWxkIHdpdGggbmV3IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC52YWwoJG5ld0ZpZWxkLnZhbCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb24gY2hlY2tcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG9yaWdpbmFsIGZpZWxkIGZvciBpbnB1dCB3aXRoIHByb3BlciBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVByaXZhdGVLZXkpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3Jvd3MnLCAnMTAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgY2hhbmdlIGV2ZW50cyB0cmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLm9mZignaW5wdXQucHJpdiBjaGFuZ2UucHJpdiBrZXl1cC5wcml2Jykub24oJ2lucHV0LnByaXYgY2hhbmdlLnByaXYga2V5dXAucHJpdicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5IGZvciBjb3B5IGJ1dHRvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2xpcGJvYXJkKCkge1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZCkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jb3B5LWJ0bicpO1xuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBTaG93IHN1Y2Nlc3MgbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoZS50cmlnZ2VyKTtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsSWNvbiA9ICRidG4uZmluZCgnaScpLmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRidG4uZmluZCgnaScpLnJlbW92ZUNsYXNzKCkuYWRkQ2xhc3MoJ2NoZWNrIGljb24nKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRidG4uZmluZCgnaScpLnJlbW92ZUNsYXNzKCkuYWRkQ2xhc3Mob3JpZ2luYWxJY29uKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciBzZWxlY3Rpb25cbiAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLm9uKCdlcnJvcicsICgpID0+IHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZ3NfQ29weUZhaWxlZCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVHJ1bmNhdGUgU1NIIGtleSBmb3IgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSBGdWxsIFNTSCBrZXlcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRydW5jYXRlZCBrZXlcbiAgICAgKi9cbiAgICB0cnVuY2F0ZVNTSEtleShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkgfHwga2V5Lmxlbmd0aCA8IDUwKSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdCgnICcpO1xuICAgICAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleVR5cGUgPSBwYXJ0c1swXTtcbiAgICAgICAgICAgIGNvbnN0IGtleURhdGEgPSBwYXJ0c1sxXTtcbiAgICAgICAgICAgIGNvbnN0IGNvbW1lbnQgPSBwYXJ0cy5zbGljZSgyKS5qb2luKCcgJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChrZXlEYXRhLmxlbmd0aCA+IDQwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0ga2V5RGF0YS5zdWJzdHJpbmcoMCwgMjApICsgJy4uLicgKyBrZXlEYXRhLnN1YnN0cmluZyhrZXlEYXRhLmxlbmd0aCAtIDE1KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYCR7a2V5VHlwZX0gJHt0cnVuY2F0ZWR9ICR7Y29tbWVudH1gLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRydW5jYXRlIGNlcnRpZmljYXRlIGZvciBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNlcnQgLSBGdWxsIGNlcnRpZmljYXRlXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUcnVuY2F0ZWQgY2VydGlmaWNhdGUgaW4gc2luZ2xlIGxpbmUgZm9ybWF0XG4gICAgICovXG4gICAgdHJ1bmNhdGVDZXJ0aWZpY2F0ZShjZXJ0KSB7XG4gICAgICAgIGlmICghY2VydCB8fCBjZXJ0Lmxlbmd0aCA8IDEwMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNlcnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxpbmVzID0gY2VydC5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gRXh0cmFjdCBmaXJzdCBhbmQgbGFzdCBtZWFuaW5nZnVsIGxpbmVzXG4gICAgICAgIGNvbnN0IGZpcnN0TGluZSA9IGxpbmVzWzBdIHx8ICcnO1xuICAgICAgICBjb25zdCBsYXN0TGluZSA9IGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGNlcnRpZmljYXRlcywgc2hvdyBiZWdpbiBhbmQgZW5kIG1hcmtlcnNcbiAgICAgICAgaWYgKGZpcnN0TGluZS5pbmNsdWRlcygnQkVHSU4gQ0VSVElGSUNBVEUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2ZpcnN0TGluZX0uLi4ke2xhc3RMaW5lfWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBvdGhlciBmb3JtYXRzLCB0cnVuY2F0ZSB0aGUgY29udGVudFxuICAgICAgICBjb25zdCBjbGVhbkNlcnQgPSBjZXJ0LnJlcGxhY2UoL1xcbi9nLCAnICcpLnRyaW0oKTtcbiAgICAgICAgaWYgKGNsZWFuQ2VydC5sZW5ndGggPiA4MCkge1xuICAgICAgICAgICAgcmV0dXJuIGNsZWFuQ2VydC5zdWJzdHJpbmcoMCwgNDApICsgJy4uLicgKyBjbGVhbkNlcnQuc3Vic3RyaW5nKGNsZWFuQ2VydC5sZW5ndGggLSAzMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjbGVhbkNlcnQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCBmb3Igc2FmZSBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgZXNjYXBlSHRtbCh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IG1hcCA9IHtcbiAgICAgICAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICAgICAgICc8JzogJyZsdDsnLFxuICAgICAgICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAgICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgICAgICAgIFwiJ1wiOiAnJiMwMzk7J1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGV4dC5yZXBsYWNlKC9bJjw+XCInXS9nLCBtID0+IG1hcFttXSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50IGFjY29yZGluZyB0byB0aGUgdmFsdWUgb2YgdXNlIFNTSCBwYXNzd29yZCBjaGVja2JveC5cbiAgICAgKi9cbiAgICBzaG93SGlkZVNTSFBhc3N3b3JkKCl7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBQcmVwYXJlcyBkYXRhIGZvciBSRVNUIEFQSSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblxuICAgICAgICAvLyBIYW5kbGUgY2VydGlmaWNhdGUgZmllbGRzIC0gb25seSBzZW5kIGlmIHVzZXIgYWN0dWFsbHkgZW50ZXJlZCBuZXcgdmFsdWVzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5XRUJIVFRQU1ByaXZhdGVLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgcHJpdmF0ZUtleVZhbHVlID0gcmVzdWx0LmRhdGEuV0VCSFRUUFNQcml2YXRlS2V5O1xuICAgICAgICAgICAgLy8gSWYgdGhlIGZpZWxkIGlzIGVtcHR5IG9yIGNvbnRhaW5zIHRoZSBoaWRkZW4gcGFzc3dvcmQsIGRvbid0IHNlbmQgaXRcbiAgICAgICAgICAgIGlmIChwcml2YXRlS2V5VmFsdWUgPT09ICcnIHx8IHByaXZhdGVLZXlWYWx1ZSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLldFQkhUVFBTUHJpdmF0ZUtleTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNhbWUgZm9yIHB1YmxpYyBrZXkgLSBkb24ndCBzZW5kIGVtcHR5IHZhbHVlc1xuICAgICAgICBpZiAocmVzdWx0LmRhdGEuV0VCSFRUUFNQdWJsaWNLZXkgIT09IHVuZGVmaW5lZCAmJiByZXN1bHQuZGF0YS5XRUJIVFRQU1B1YmxpY0tleSA9PT0gJycpIHtcbiAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS5XRUJIVFRQU1B1YmxpY0tleTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFuIHVwIHVubmVjZXNzYXJ5IGZpZWxkcyBiZWZvcmUgc2VuZGluZ1xuICAgICAgICBjb25zdCBmaWVsZHNUb1JlbW92ZSA9IFtcbiAgICAgICAgICAgICdkaXJydHknLFxuICAgICAgICAgICAgJ2RlbGV0ZUFsbElucHV0JyxcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBSZW1vdmUgY29kZWNfKiBmaWVsZHMgKHRoZXkncmUgcmVwbGFjZWQgd2l0aCB0aGUgY29kZWNzIGFycmF5KVxuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSB8fCBmaWVsZHNUb1JlbW92ZS5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2Ugc2hvdWxkIHByb2Nlc3MgY29kZWNzXG4gICAgICAgIC8vIFdoZW4gc2VuZE9ubHlDaGFuZ2VkIGlzIGVuYWJsZWQsIG9ubHkgcHJvY2VzcyBjb2RlY3MgaWYgdGhleSB3ZXJlIGFjdHVhbGx5IGNoYW5nZWRcbiAgICAgICAgY29uc3Qgc2hvdWxkUHJvY2Vzc0NvZGVjcyA9ICFGb3JtLnNlbmRPbmx5Q2hhbmdlZCB8fCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZDtcblxuICAgICAgICBpZiAoc2hvdWxkUHJvY2Vzc0NvZGVjcykge1xuICAgICAgICAgICAgLy8gQ29sbGVjdCBhbGwgY29kZWMgZGF0YSB3aGVuIHRoZXkndmUgYmVlbiBjaGFuZ2VkXG4gICAgICAgICAgICBjb25zdCBhcnJDb2RlY3MgPSBbXTtcblxuICAgICAgICAgICAgLy8gUHJvY2VzcyBhbGwgY29kZWMgcm93c1xuICAgICAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93LCAjdmlkZW8tY29kZWNzLXRhYmxlIC5jb2RlYy1yb3cnKS5lYWNoKChjdXJyZW50SW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvZGVjTmFtZSA9ICQob2JqKS5hdHRyKCdkYXRhLWNvZGVjLW5hbWUnKTtcbiAgICAgICAgICAgICAgICBpZiAoY29kZWNOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnREaXNhYmxlZCA9ICQob2JqKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgYXJyQ29kZWNzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY29kZWNOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGN1cnJlbnREaXNhYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBjdXJyZW50SW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBJbmNsdWRlIGNvZGVjcyBpZiB0aGV5IHdlcmUgY2hhbmdlZCBvciBzZW5kT25seUNoYW5nZWQgaXMgZmFsc2VcbiAgICAgICAgICAgIGlmIChhcnJDb2RlY3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvZGVjcyA9IGFyckNvZGVjcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogSGFuZGxlcyBSRVNUIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgJChcIiNlcnJvci1tZXNzYWdlc1wiKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZTogeyByZXN1bHQ6IGJvb2wsIGRhdGE6IHt9LCBtZXNzYWdlczoge30gfVxuICAgICAgICBpZiAoIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbChyZXNwb25zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgZmllbGRzIHRvIGhpZGRlbiB2YWx1ZSBvbiBzdWNjZXNzXG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBwYXNzd29yZCB2YWxpZGF0aW9uIHdhcm5pbmdzIGFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZVxuICAgICAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZGVsZXRlIGFsbCBjb25kaXRpb25zIGlmIG5lZWRlZFxuICAgICAgICBpZiAodHlwZW9mIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jaGVja0RlbGV0ZUNvbmRpdGlvbnMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBlcnJvciBtZXNzYWdlIEhUTUwgZnJvbSBSRVNUIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZSB3aXRoIGVycm9yIG1lc3NhZ2VzXG4gICAgICovXG4gICAgZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgY29uc3QgJGRpdiA9ICQoJzxkaXY+JywgeyBjbGFzczogJ3VpIG5lZ2F0aXZlIG1lc3NhZ2UnLCBpZDogJ2Vycm9yLW1lc3NhZ2VzJyB9KTtcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXIgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICdoZWFkZXInIH0pLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmdzX0Vycm9yU2F2ZVNldHRpbmdzKTtcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCRoZWFkZXIpO1xuICAgICAgICAgICAgY29uc3QgJHVsID0gJCgnPHVsPicsIHsgY2xhc3M6ICdsaXN0JyB9KTtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzU2V0ID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgYm90aCBlcnJvciBhbmQgdmFsaWRhdGlvbiBtZXNzYWdlIHR5cGVzXG4gICAgICAgICAgICBbJ2Vycm9yJywgJ3ZhbGlkYXRpb24nXS5mb3JFYWNoKG1zZ1R5cGUgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlcyA9IEFycmF5LmlzQXJyYXkocmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV0pIFxuICAgICAgICAgICAgICAgICAgICAgICAgPyByZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogW3Jlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzLmZvckVhY2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRleHRDb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGVycm9yID09PSAnb2JqZWN0JyAmJiBlcnJvci5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3IubWVzc2FnZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50ID0gZ2xvYmFsVHJhbnNsYXRlW2Vycm9yXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtZXNzYWdlc1NldC5oYXModGV4dENvbnRlbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXNTZXQuYWRkKHRleHRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdWwuYXBwZW5kKCQoJzxsaT4nKS50ZXh0KHRleHRDb250ZW50KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkZGl2LmFwcGVuZCgkdWwpO1xuICAgICAgICAgICAgJCgnI3N1Ym1pdGJ1dHRvbicpLmJlZm9yZSgkZGl2KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSB2YWxpZGF0aW9uIHJ1bGVzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgaW5pdFJ1bGVzKCkge1xuICAgICAgICAvLyBTU0hQYXNzd29yZFxuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzO1xuICAgICAgICB9IGVsc2UgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQudmFsKCkgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2ViQWRtaW5QYXNzd29yZFxuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5XZWJBZG1pblBhc3N3b3JkLnJ1bGVzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuV2ViQWRtaW5QYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS53ZWJBZG1pblBhc3N3b3JkUnVsZXM7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIGNlcnRpZmljYXRlIGRldGFpbHMgSFRNTFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjZXJ0SW5mbyAtIENlcnRpZmljYXRlIGluZm9ybWF0aW9uIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgZm9yIGNlcnRpZmljYXRlIGRldGFpbHNcbiAgICAgKi9cbiAgICByZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMoY2VydEluZm8pIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cImNlcnQtZGV0YWlsc1wiIHN0eWxlPVwiZGlzcGxheTpub25lOyBtYXJnaW4tdG9wOjEwcHg7XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBsaXN0XCI+JztcbiAgICAgICAgXG4gICAgICAgIC8vIFN1YmplY3RcbiAgICAgICAgaWYgKGNlcnRJbmZvLnN1YmplY3QpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5TdWJqZWN0Ojwvc3Ryb25nPiAke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGNlcnRJbmZvLnN1YmplY3QpfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElzc3VlclxuICAgICAgICBpZiAoY2VydEluZm8uaXNzdWVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+SXNzdWVyOjwvc3Ryb25nPiAke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGNlcnRJbmZvLmlzc3Vlcil9YDtcbiAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19zZWxmX3NpZ25lZCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJyA8c3BhbiBjbGFzcz1cInVpIHRpbnkgbGFiZWxcIj5TZWxmLXNpZ25lZDwvc3Bhbj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVmFsaWRpdHkgcGVyaW9kXG4gICAgICAgIGlmIChjZXJ0SW5mby52YWxpZF9mcm9tICYmIGNlcnRJbmZvLnZhbGlkX3RvKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+VmFsaWQ6PC9zdHJvbmc+ICR7Y2VydEluZm8udmFsaWRfZnJvbX0gdG8gJHtjZXJ0SW5mby52YWxpZF90b308L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeHBpcnkgc3RhdHVzXG4gICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSByZWQgbGFiZWxcIj5DZXJ0aWZpY2F0ZSBFeHBpcmVkPC9zcGFuPjwvZGl2Pic7XG4gICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IHllbGxvdyBsYWJlbFwiPkV4cGlyZXMgaW4gJHtjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeX0gZGF5czwvc3Bhbj48L2Rpdj5gO1xuICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5ID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgZ3JlZW4gbGFiZWxcIj5WYWxpZCBmb3IgJHtjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeX0gZGF5czwvc3Bhbj48L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJqZWN0IEFsdGVybmF0aXZlIE5hbWVzXG4gICAgICAgIGlmIChjZXJ0SW5mby5zYW4gJiYgY2VydEluZm8uc2FuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5BbHRlcm5hdGl2ZSBOYW1lczo8L3N0cm9uZz4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHRpbnkgbGlzdFwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6MTBweDtcIj4nO1xuICAgICAgICAgICAgY2VydEluZm8uc2FuLmZvckVhY2goc2FuID0+IHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoc2FuKX08L2Rpdj5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBsaXN0XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIHNlZ21lbnRcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2UgY2VydC1kZXRhaWxzXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgQU1JL0FKQU0gZGVwZW5kZW5jeVxuICAgICAqIEFKQU0gcmVxdWlyZXMgQU1JIHRvIGJlIGVuYWJsZWQgc2luY2UgaXQncyBhbiBIVFRQIHdyYXBwZXIgb3ZlciBBTUlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQU1JQUpBTURlcGVuZGVuY3koKSB7XG4gICAgICAgIGNvbnN0ICRhbWlDaGVja2JveCA9ICQoJyNBTUlFbmFibGVkJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgY29uc3QgJGFqYW1DaGVja2JveCA9ICQoJyNBSkFNRW5hYmxlZCcpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGFtaUNoZWNrYm94Lmxlbmd0aCA9PT0gMCB8fCAkYWphbUNoZWNrYm94Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGdW5jdGlvbiB0byB1cGRhdGUgQUpBTSBzdGF0ZSBiYXNlZCBvbiBBTUkgc3RhdGVcbiAgICAgICAgY29uc3QgdXBkYXRlQUpBTVN0YXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXNBTUlFbmFibGVkID0gJGFtaUNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghaXNBTUlFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgQU1JIGlzIGRpc2FibGVkLCBkaXNhYmxlIEFKQU0gYW5kIG1ha2UgaXQgcmVhZC1vbmx5XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3guYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIHRvb2x0aXAgdG8gZXhwbGFpbiB3aHkgaXQncyBkaXNhYmxlZFxuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3guYXR0cignZGF0YS10b29sdGlwJywgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1SZXF1aXJlc0FNSSk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBsZWZ0Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIEFNSSBpcyBlbmFibGVkLCBhbGxvdyBBSkFNIHRvIGJlIHRvZ2dsZWRcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3gucmVtb3ZlQXR0cignZGF0YS10b29sdGlwJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsIHN0YXRlXG4gICAgICAgIHVwZGF0ZUFKQU1TdGF0ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuIGZvciBBTUkgY2hlY2tib3ggY2hhbmdlcyB1c2luZyBldmVudCBkZWxlZ2F0aW9uXG4gICAgICAgIC8vIFRoaXMgd29uJ3Qgb3ZlcnJpZGUgZXhpc3RpbmcgaGFuZGxlcnNcbiAgICAgICAgJCgnI0FNSUVuYWJsZWQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB1cGRhdGVBSkFNU3RhdGUoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBQQlhMYW5ndWFnZSBjaGFuZ2UgZGV0ZWN0aW9uIGZvciByZXN0YXJ0IHdhcm5pbmdcbiAgICAgKiBTaG93cyByZXN0YXJ0IHdhcm5pbmcgb25seSB3aGVuIHRoZSBsYW5ndWFnZSB2YWx1ZSBjaGFuZ2VzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBCWExhbmd1YWdlV2FybmluZygpIHtcbiAgICAgICAgY29uc3QgJGxhbmd1YWdlSW5wdXQgPSAkKCcjUEJYTGFuZ3VhZ2UnKTsgIC8vIEhpZGRlbiBpbnB1dFxuICAgICAgICBjb25zdCAkbGFuZ3VhZ2VEcm9wZG93biA9ICQoJyNQQlhMYW5ndWFnZS1kcm9wZG93bicpOyAgLy8gVjUuMCBwYXR0ZXJuIGRyb3Bkb3duXG4gICAgICAgIGNvbnN0ICRyZXN0YXJ0V2FybmluZyA9ICQoJyNyZXN0YXJ0LXdhcm5pbmctUEJYTGFuZ3VhZ2UnKTtcblxuICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCB2YWx1ZSBhbmQgZGF0YSBsb2FkZWQgZmxhZ1xuICAgICAgICBsZXQgb3JpZ2luYWxWYWx1ZSA9IG51bGw7XG4gICAgICAgIGxldCBpc0RhdGFMb2FkZWQgPSBmYWxzZTtcblxuICAgICAgICAvLyBIaWRlIHdhcm5pbmcgaW5pdGlhbGx5XG4gICAgICAgICRyZXN0YXJ0V2FybmluZy5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2V0IG9yaWdpbmFsIHZhbHVlIGFmdGVyIGRhdGEgbG9hZHNcbiAgICAgICAgJChkb2N1bWVudCkub24oJ0dlbmVyYWxTZXR0aW5ncy5kYXRhTG9hZGVkJywgKCkgPT4ge1xuICAgICAgICAgICAgb3JpZ2luYWxWYWx1ZSA9ICRsYW5ndWFnZUlucHV0LnZhbCgpO1xuICAgICAgICAgICAgaXNEYXRhTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRyb3Bkb3duIGNoYW5nZSBldmVudCAtIHVzZSBWNS4wIGRyb3Bkb3duIHNlbGVjdG9yXG4gICAgICAgICRsYW5ndWFnZURyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTZW1hbnRpY1VJRHJvcGRvd24gYXV0b21hdGljYWxseSBzeW5jcyBoaWRkZW4gaW5wdXQgdmFsdWVcbiAgICAgICAgICAgICAgICAvLyBObyBuZWVkIHRvIG1hbnVhbGx5IHVwZGF0ZSAkbGFuZ3VhZ2VJbnB1dFxuXG4gICAgICAgICAgICAgICAgLy8gT25seSBzaG93IHdhcm5pbmcgYWZ0ZXIgZGF0YSBpcyBsb2FkZWQgYW5kIHZhbHVlIGNoYW5nZWQgZnJvbSBvcmlnaW5hbFxuICAgICAgICAgICAgICAgIGlmIChpc0RhdGFMb2FkZWQgJiYgb3JpZ2luYWxWYWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gb3JpZ2luYWxWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAkcmVzdGFydFdhcm5pbmcudHJhbnNpdGlvbignZmFkZSBpbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNEYXRhTG9hZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICRyZXN0YXJ0V2FybmluZy50cmFuc2l0aW9uKCdmYWRlIG91dCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIG9ubHkgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICBpZiAoaXNEYXRhTG9hZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBSRVNUIEFQSSBtb2RlXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gR2VuZXJhbFNldHRpbmdzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVNldHRpbmdzJztcblxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uIGZvciBjbGVhbmVyIEFQSSByZXF1ZXN0c1xuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcblxuICAgICAgICAvLyBFbmFibGUgc2VuZGluZyBvbmx5IGNoYW5nZWQgZmllbGRzIGZvciBvcHRpbWFsIFBBVENIIHNlbWFudGljc1xuICAgICAgICBGb3JtLnNlbmRPbmx5Q2hhbmdlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gTm8gcmVkaXJlY3QgYWZ0ZXIgc2F2ZSAtIHN0YXkgb24gdGhlIHNhbWUgcGFnZVxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBudWxsO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gbnVsbDtcbiAgICAgICAgRm9ybS51cmwgPSBgI2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGdlbmVyYWxTZXR0aW5ncyBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7Il19