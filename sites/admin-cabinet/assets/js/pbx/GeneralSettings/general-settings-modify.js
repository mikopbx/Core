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
    var result = settings; // Handle private key field

    if (result.data.WEBHTTPSPrivateKey !== undefined) {
      var privateKeyValue = result.data.WEBHTTPSPrivateKey; // Only skip sending if the value equals hidden password (unchanged)
      // Send empty string to clear the private key on server

      if (privateKeyValue === generalSettingsModify.hiddenPassword) {
        delete result.data.WEBHTTPSPrivateKey;
      } // Empty string '' will be sent to clear the certificate

    } // For public key - send empty values to allow clearing
    // Do not delete empty strings - they mean user wants to clear the certificate
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJjb2RlY3NDaGFuZ2VkIiwiZGF0YUxvYWRlZCIsInZhbGlkYXRlUnVsZXMiLCJwYnhuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lIiwiV2ViQWRtaW5QYXNzd29yZCIsIldlYkFkbWluUGFzc3dvcmRSZXBlYXQiLCJnc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50IiwiU1NIUGFzc3dvcmQiLCJTU0hQYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJXRUJQb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJXRUJIVFRQU1BvcnQiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0IiwiQUpBTVBvcnQiLCJnc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSIsIlNJUEF1dGhQcmVmaXgiLCJnc19TSVBBdXRoUHJlZml4SW52YWxpZCIsIndlYkFkbWluUGFzc3dvcmRSdWxlcyIsImdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkIiwidmFsdWUiLCJnc19QYXNzd29yZHMiLCJwc3dfUGFzc3dvcmROb0xvd1NpbXZvbCIsInBzd19QYXNzd29yZE5vTnVtYmVycyIsInBzd19QYXNzd29yZE5vVXBwZXJTaW12b2wiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3MiLCJnc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQiLCJnc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCIsImdzX1NTSFBhc3N3b3JkIiwiYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3MiLCJjbGlwYm9hcmQiLCJpbml0aWFsaXplIiwibGVuZ3RoIiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwiY29udGV4dCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwidmFsaWRhdGVPbklucHV0Iiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwiY2hlY2tPbkxvYWQiLCJzc2hXaWRnZXQiLCJvbiIsImlzRGlzYWJsZWQiLCJjaGVja2JveCIsImhpZGVXYXJuaW5ncyIsImVsZW1lbnRzIiwiJHNjb3JlU2VjdGlvbiIsImhpZGUiLCJjaGVja1Bhc3N3b3JkIiwidmFsIiwiaW5pdFJ1bGVzIiwiZmluZCIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmciLCJub3QiLCJkcm9wZG93biIsImluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcyIsImluaXRpYWxpemVDbGlwYm9hcmQiLCJzaG93SGlkZVNTSFBhc3N3b3JkIiwid2luZG93IiwiZXZlbnQiLCJuYW1lVGFiIiwiR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJsb2FkRGF0YSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMiLCJGb3JtIiwic2hvd0xvYWRpbmdTdGF0ZSIsIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsInBhc3N3b3JkVmFsaWRhdGlvbiIsInNldFRpbWVvdXQiLCJzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MiLCJtZXNzYWdlcyIsImNvbnNvbGUiLCJlcnJvciIsInNob3dBcGlFcnJvciIsInNldHRpbmdzIiwiY29kZWNzIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJwb3B1bGF0ZVNwZWNpYWxGaWVsZHMiLCJsb2FkU291bmRGaWxlVmFsdWVzIiwidXBkYXRlQ29kZWNUYWJsZXMiLCJpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNzaEtleXNUYWJsZSIsImRvY3VtZW50IiwidHJpZ2dlciIsIldFQkhUVFBTUHVibGljS2V5X2luZm8iLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsIiRjaGVja2JveCIsImlzQ2hlY2tlZCIsIiRkcm9wZG93biIsImhhc0NsYXNzIiwiZm9ybSIsImVycm9yTWVzc2FnZSIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInZhbGlkYXRpb24iLCJyZW1vdmUiLCJpc0RlZmF1bHRXZWJQYXNzd29yZCIsIiR3ZWJQYXNzd29yZEZpZWxkcyIsImNsb3Nlc3QiLCJ3YXJuaW5nSHRtbCIsInBzd19TZXRQYXNzd29yZCIsInBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmQiLCJiZWZvcmUiLCJpc0RlZmF1bHRTU0hQYXNzd29yZCIsInNzaFBhc3N3b3JkRGlzYWJsZWQiLCIkc3NoUGFzc3dvcmRGaWVsZHMiLCJkYXRhSW4iLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJkYXRhT3V0IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IiwiYXVkaW9Db2RlY3MiLCJmaWx0ZXIiLCJjIiwic29ydCIsImEiLCJiIiwicHJpb3JpdHkiLCJ2aWRlb0NvZGVjcyIsImJ1aWxkQ29kZWNUYWJsZSIsInNob3ciLCJpbml0aWFsaXplQ29kZWNEcmFnRHJvcCIsIiR0YWJsZUJvZHkiLCJlbXB0eSIsImNvZGVjIiwiaW5kZXgiLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGVja2VkIiwicm93SHRtbCIsImVzY2FwZUh0bWwiLCJkZXNjcmlwdGlvbiIsImFwcGVuZCIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkIiwiJGNlcnRQdWJLZXlGaWVsZCIsImZ1bGxWYWx1ZSIsIiRjb250YWluZXIiLCJjZXJ0SW5mbyIsImRpc3BsYXlUZXh0IiwicGFydHMiLCJzdWJqZWN0IiwicHVzaCIsImlzc3VlciIsImlzX3NlbGZfc2lnbmVkIiwidmFsaWRfdG8iLCJpc19leHBpcmVkIiwiZGF5c191bnRpbF9leHBpcnkiLCJ0cnVuY2F0ZUNlcnRpZmljYXRlIiwic3RhdHVzQ2xhc3MiLCJkaXNwbGF5SHRtbCIsImJ0X1Rvb2xUaXBDb3B5Q2VydCIsImJ0X1Rvb2xUaXBDZXJ0SW5mbyIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsInJlbmRlckNlcnRpZmljYXRlRGV0YWlscyIsImdzX1Bhc3RlUHVibGljQ2VydCIsImJ0X1NhdmUiLCJidF9DYW5jZWwiLCJlIiwicHJldmVudERlZmF1bHQiLCIkZGV0YWlscyIsInNsaWRlVG9nZ2xlIiwiZm9jdXMiLCJuZXdWYWx1ZSIsImNoZWNrVmFsdWVzIiwicG9wdXAiLCJkZXN0cm95IiwiYXR0ciIsIm9mZiIsIiRzc2hQdWJLZXlGaWVsZCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiYnRfVG9vbFRpcENvcHlLZXkiLCJidF9Ub29sVGlwRXhwYW5kIiwiJGZ1bGxEaXNwbGF5IiwiJHRydW5jYXRlZERpc3BsYXkiLCIkaWNvbiIsImlzIiwiYWRkQ2xhc3MiLCJnc19Ob1NTSFB1YmxpY0tleSIsIiRjZXJ0UHJpdktleUZpZWxkIiwiY3VycmVudFZhbHVlIiwiaGFzVmFsdWUiLCJnc19Qcml2YXRlS2V5SXNTZXQiLCJnc19SZXBsYWNlIiwiZ3NfUGFzdGVQcml2YXRlS2V5IiwiJG5ld0ZpZWxkIiwiQ2xpcGJvYXJkSlMiLCIkYnRuIiwib3JpZ2luYWxJY29uIiwiY2xlYXJTZWxlY3Rpb24iLCJnc19Db3B5RmFpbGVkIiwic3BsaXQiLCJrZXlUeXBlIiwia2V5RGF0YSIsImNvbW1lbnQiLCJzbGljZSIsInN1YnN0cmluZyIsInRyaW0iLCJjZXJ0IiwibGluZXMiLCJsaW5lIiwiZmlyc3RMaW5lIiwibGFzdExpbmUiLCJpbmNsdWRlcyIsImNsZWFuQ2VydCIsInJlcGxhY2UiLCJ0ZXh0IiwibWFwIiwibSIsImNiQmVmb3JlU2VuZEZvcm0iLCJXRUJIVFRQU1ByaXZhdGVLZXkiLCJ1bmRlZmluZWQiLCJwcml2YXRlS2V5VmFsdWUiLCJmaWVsZHNUb1JlbW92ZSIsInN0YXJ0c1dpdGgiLCJzaG91bGRQcm9jZXNzQ29kZWNzIiwic2VuZE9ubHlDaGFuZ2VkIiwiYXJyQ29kZWNzIiwiZWFjaCIsImN1cnJlbnRJbmRleCIsIm9iaiIsImNvZGVjTmFtZSIsImN1cnJlbnREaXNhYmxlZCIsImNiQWZ0ZXJTZW5kRm9ybSIsIiRzdWJtaXRCdXR0b24iLCJnZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwiLCJmYWRlT3V0IiwiZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsIiwiY2hlY2tEZWxldGVDb25kaXRpb25zIiwiJGRpdiIsImlkIiwiJGhlYWRlciIsImdzX0Vycm9yU2F2ZVNldHRpbmdzIiwiJHVsIiwibWVzc2FnZXNTZXQiLCJTZXQiLCJtc2dUeXBlIiwidGV4dENvbnRlbnQiLCJtZXNzYWdlIiwiaGFzIiwiYWRkIiwiaHRtbCIsInZhbGlkX2Zyb20iLCJzYW4iLCIkYW1pQ2hlY2tib3giLCIkYWphbUNoZWNrYm94IiwidXBkYXRlQUpBTVN0YXRlIiwiaXNBTUlFbmFibGVkIiwiZ3NfQUpBTVJlcXVpcmVzQU1JIiwicmVtb3ZlQXR0ciIsIiRsYW5ndWFnZUlucHV0IiwiJGxhbmd1YWdlRHJvcGRvd24iLCIkcmVzdGFydFdhcm5pbmciLCJvcmlnaW5hbFZhbHVlIiwiaXNEYXRhTG9hZGVkIiwidHJhbnNpdGlvbiIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInVybCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFHQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxxQkFBcUIsR0FBRztBQUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxlOztBQU8xQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRUQsQ0FBQyxDQUFDLG1CQUFELENBWE07O0FBYTFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFlBQVksRUFBRUYsQ0FBQyxDQUFDLGNBQUQsQ0FqQlc7O0FBbUIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxtQkFBbUIsRUFBRUgsQ0FBQyxDQUFDLDJCQUFELENBQUQsQ0FBK0JJLE1BQS9CLENBQXNDLFdBQXRDLENBdkJLOztBQXlCMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsbUJBQW1CLEVBQUVMLENBQUMsQ0FBQywyQkFBRCxDQTdCSTs7QUErQjFCO0FBQ0o7QUFDQTtBQUNJTSxFQUFBQSxjQUFjLEVBQUUsU0FsQ1U7O0FBb0MxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUU7QUFDYkMsSUFBQUEsY0FBYyxFQUFFLHlCQURIO0FBRWJDLElBQUFBLGVBQWUsRUFBRTtBQUZKLEdBeENTOztBQTZDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBQWtCLEVBQUUsRUFqRE07O0FBbUQxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsS0F2RFc7O0FBeUQxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsS0E3RGM7O0FBK0QxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRTtBQUFFO0FBQ2JDLElBQUFBLE9BQU8sRUFBRTtBQUNMQyxNQUFBQSxVQUFVLEVBQUUsU0FEUDtBQUVMQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERztBQUZGLEtBREU7QUFVWEMsSUFBQUEsZ0JBQWdCLEVBQUU7QUFDZE4sTUFBQUEsVUFBVSxFQUFFLGtCQURFO0FBRWRDLE1BQUFBLEtBQUssRUFBRTtBQUZPLEtBVlA7QUFjWE0sSUFBQUEsc0JBQXNCLEVBQUU7QUFDcEJQLE1BQUFBLFVBQVUsRUFBRSx3QkFEUTtBQUVwQkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLHlCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDSTtBQUY1QixPQURHO0FBRmEsS0FkYjtBQXVCWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1RULE1BQUFBLFVBQVUsRUFBRSxhQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRTtBQUZFLEtBdkJGO0FBMkJYUyxJQUFBQSxpQkFBaUIsRUFBRTtBQUNmVixNQUFBQSxVQUFVLEVBQUUsbUJBREc7QUFFZkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLG9CQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDTztBQUY1QixPQURHO0FBRlEsS0EzQlI7QUFvQ1hDLElBQUFBLE9BQU8sRUFBRTtBQUNMWixNQUFBQSxVQUFVLEVBQUUsU0FEUDtBQUVMQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsbUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNTO0FBRjVCLE9BREcsRUFLSDtBQUNJWCxRQUFBQSxJQUFJLEVBQUUseUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNVO0FBRjVCLE9BTEcsRUFTSDtBQUNJWixRQUFBQSxJQUFJLEVBQUUsd0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNXO0FBRjVCLE9BVEcsRUFhSDtBQUNJYixRQUFBQSxJQUFJLEVBQUUscUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNZO0FBRjVCLE9BYkc7QUFGRixLQXBDRTtBQXlEWEMsSUFBQUEsWUFBWSxFQUFFO0FBQ1ZqQixNQUFBQSxVQUFVLEVBQUUsY0FERjtBQUVWQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsbUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNjO0FBRjVCLE9BREcsRUFLSDtBQUNJaEIsUUFBQUEsSUFBSSxFQUFFLG9CQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDVTtBQUY1QixPQUxHLEVBU0g7QUFDSVosUUFBQUEsSUFBSSxFQUFFLHdCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDZTtBQUY1QixPQVRHLEVBYUg7QUFDSWpCLFFBQUFBLElBQUksRUFBRSxxQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2dCO0FBRjVCLE9BYkc7QUFGRyxLQXpESDtBQThFWEMsSUFBQUEsUUFBUSxFQUFFO0FBQ05yQixNQUFBQSxVQUFVLEVBQUUsVUFETjtBQUVOQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsbUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNrQjtBQUY1QixPQURHLEVBS0g7QUFDSXBCLFFBQUFBLElBQUksRUFBRSx3QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2tCO0FBRjVCLE9BTEc7QUFGRCxLQTlFQztBQTJGWEMsSUFBQUEsYUFBYSxFQUFFO0FBQ1h2QixNQUFBQSxVQUFVLEVBQUUsZUFERDtBQUVYQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsdUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNvQjtBQUY1QixPQURHO0FBRkk7QUEzRkosR0FwRVc7QUEwSzFCO0FBQ0FDLEVBQUFBLHFCQUFxQixFQUFFLENBQ25CO0FBQ0l2QixJQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxJQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3NCO0FBRjVCLEdBRG1CLEVBS25CO0FBQ0l4QixJQUFBQSxJQUFJLEVBQUUsY0FEVjtBQUVJQyxJQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3VCO0FBRjVCLEdBTG1CLEVBU25CO0FBQ0l6QixJQUFBQSxJQUFJLEVBQUUsV0FEVjtBQUVJMEIsSUFBQUEsS0FBSyxFQUFFLE9BRlg7QUFHSXpCLElBQUFBLE1BQU0sRUFBRSxRQUFRQyxlQUFlLENBQUN5QixZQUF4QixHQUF1QyxRQUF2QyxHQUFrRHpCLGVBQWUsQ0FBQzBCO0FBSDlFLEdBVG1CLEVBY25CO0FBQ0k1QixJQUFBQSxJQUFJLEVBQUUsV0FEVjtBQUVJMEIsSUFBQUEsS0FBSyxFQUFFLElBRlg7QUFHSXpCLElBQUFBLE1BQU0sRUFBRSxRQUFRQyxlQUFlLENBQUN5QixZQUF4QixHQUF1QyxRQUF2QyxHQUFrRHpCLGVBQWUsQ0FBQzJCO0FBSDlFLEdBZG1CLEVBbUJuQjtBQUNJN0IsSUFBQUEsSUFBSSxFQUFFLFdBRFY7QUFFSTBCLElBQUFBLEtBQUssRUFBRSxPQUZYO0FBR0l6QixJQUFBQSxNQUFNLEVBQUUsUUFBUUMsZUFBZSxDQUFDeUIsWUFBeEIsR0FBdUMsUUFBdkMsR0FBa0R6QixlQUFlLENBQUM0QjtBQUg5RSxHQW5CbUIsQ0EzS0c7QUFvTTFCO0FBQ0FDLEVBQUFBLDJCQUEyQixFQUFFLENBQ3pCO0FBQ0kvQixJQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxJQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQzhCO0FBRjVCLEdBRHlCLEVBS3pCO0FBQ0loQyxJQUFBQSxJQUFJLEVBQUUsY0FEVjtBQUVJQyxJQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQytCO0FBRjVCLEdBTHlCLEVBU3pCO0FBQ0lqQyxJQUFBQSxJQUFJLEVBQUUsV0FEVjtBQUVJMEIsSUFBQUEsS0FBSyxFQUFFLE9BRlg7QUFHSXpCLElBQUFBLE1BQU0sRUFBRSxRQUFRQyxlQUFlLENBQUNnQyxjQUF4QixHQUF5QyxRQUF6QyxHQUFvRGhDLGVBQWUsQ0FBQzBCO0FBSGhGLEdBVHlCLEVBY3pCO0FBQ0k1QixJQUFBQSxJQUFJLEVBQUUsV0FEVjtBQUVJMEIsSUFBQUEsS0FBSyxFQUFFLElBRlg7QUFHSXpCLElBQUFBLE1BQU0sRUFBRSxRQUFRQyxlQUFlLENBQUNnQyxjQUF4QixHQUF5QyxRQUF6QyxHQUFvRGhDLGVBQWUsQ0FBQzJCO0FBSGhGLEdBZHlCLEVBbUJ6QjtBQUNJN0IsSUFBQUEsSUFBSSxFQUFFLFdBRFY7QUFFSTBCLElBQUFBLEtBQUssRUFBRSxPQUZYO0FBR0l6QixJQUFBQSxNQUFNLEVBQUUsUUFBUUMsZUFBZSxDQUFDZ0MsY0FBeEIsR0FBeUMsUUFBekMsR0FBb0RoQyxlQUFlLENBQUM0QjtBQUhoRixHQW5CeUIsQ0FyTUg7QUErTjFCO0FBQ0FLLEVBQUFBLDZCQUE2QixFQUFFLENBQzNCO0FBQ0luQyxJQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxJQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQzhCO0FBRjVCLEdBRDJCLEVBSzNCO0FBQ0loQyxJQUFBQSxJQUFJLEVBQUUsY0FEVjtBQUVJQyxJQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQytCO0FBRjVCLEdBTDJCLENBaE9MOztBQTJPMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsU0FBUyxFQUFFLElBL09lOztBQWlQMUI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBcFAwQix3QkFvUGI7QUFFVDtBQUNBO0FBQ0EsUUFBSXhELHFCQUFxQixDQUFDRyxpQkFBdEIsQ0FBd0NzRCxNQUF4QyxHQUFpRCxDQUFyRCxFQUF3RDtBQUNwREMsTUFBQUEsY0FBYyxDQUFDQyxJQUFmLENBQW9CM0QscUJBQXFCLENBQUNHLGlCQUExQyxFQUE2RDtBQUN6RHlELFFBQUFBLE9BQU8sRUFBRSxhQURnRDtBQUV6REMsUUFBQUEsY0FBYyxFQUFFLEtBRnlDO0FBRTFCO0FBQy9CQyxRQUFBQSxrQkFBa0IsRUFBRSxLQUhxQztBQUcxQjtBQUMvQkMsUUFBQUEsZUFBZSxFQUFFLEtBSndDO0FBSXpCO0FBQ2hDQyxRQUFBQSxlQUFlLEVBQUUsSUFMd0M7QUFNekRDLFFBQUFBLGVBQWUsRUFBRSxJQU53QztBQU96REMsUUFBQUEsWUFBWSxFQUFFLElBUDJDO0FBUXpEQyxRQUFBQSxXQUFXLEVBQUU7QUFSNEMsT0FBN0Q7QUFVSCxLQWZRLENBaUJUOzs7QUFDQSxRQUFJbkUscUJBQXFCLENBQUNJLFlBQXRCLENBQW1DcUQsTUFBbkMsR0FBNEMsQ0FBaEQsRUFBbUQ7QUFDL0MsVUFBTVcsU0FBUyxHQUFHVixjQUFjLENBQUNDLElBQWYsQ0FBb0IzRCxxQkFBcUIsQ0FBQ0ksWUFBMUMsRUFBd0Q7QUFDdEV3RCxRQUFBQSxPQUFPLEVBQUUsYUFENkQ7QUFFdEVDLFFBQUFBLGNBQWMsRUFBRSxLQUZzRDtBQUV2QztBQUMvQkMsUUFBQUEsa0JBQWtCLEVBQUUsS0FIa0Q7QUFHdkM7QUFDL0JDLFFBQUFBLGVBQWUsRUFBRSxLQUpxRDtBQUl0QztBQUNoQ0MsUUFBQUEsZUFBZSxFQUFFLElBTHFEO0FBTXRFQyxRQUFBQSxlQUFlLEVBQUUsSUFOcUQ7QUFPdEVDLFFBQUFBLFlBQVksRUFBRSxJQVB3RDtBQVF0RUMsUUFBQUEsV0FBVyxFQUFFO0FBUnlELE9BQXhELENBQWxCLENBRCtDLENBWS9DOztBQUNBakUsTUFBQUEsQ0FBQyxDQUFDLDJCQUFELENBQUQsQ0FBK0JtRSxFQUEvQixDQUFrQyxRQUFsQyxFQUE0QyxZQUFNO0FBQzlDLFlBQU1DLFVBQVUsR0FBR3BFLENBQUMsQ0FBQywyQkFBRCxDQUFELENBQStCcUUsUUFBL0IsQ0FBd0MsWUFBeEMsQ0FBbkI7O0FBQ0EsWUFBSUQsVUFBVSxJQUFJRixTQUFsQixFQUE2QjtBQUN6QlYsVUFBQUEsY0FBYyxDQUFDYyxZQUFmLENBQTRCSixTQUE1Qjs7QUFDQSxjQUFJQSxTQUFTLENBQUNLLFFBQVYsQ0FBbUJDLGFBQXZCLEVBQXNDO0FBQ2xDTixZQUFBQSxTQUFTLENBQUNLLFFBQVYsQ0FBbUJDLGFBQW5CLENBQWlDQyxJQUFqQztBQUNIO0FBQ0osU0FMRCxNQUtPLElBQUksQ0FBQ0wsVUFBRCxJQUFlRixTQUFuQixFQUE4QjtBQUNqQ1YsVUFBQUEsY0FBYyxDQUFDa0IsYUFBZixDQUE2QlIsU0FBN0I7QUFDSDtBQUNKLE9BVkQ7QUFXSCxLQTFDUSxDQTRDVDs7O0FBQ0FwRSxJQUFBQSxxQkFBcUIsQ0FBQ0csaUJBQXRCLENBQXdDa0UsRUFBeEMsQ0FBMkMsUUFBM0MsRUFBcUQsWUFBTTtBQUN2RCxVQUFJckUscUJBQXFCLENBQUNHLGlCQUF0QixDQUF3QzBFLEdBQXhDLE9BQWtEN0UscUJBQXFCLENBQUNRLGNBQTVFLEVBQTRGO0FBQ3hGUixRQUFBQSxxQkFBcUIsQ0FBQzhFLFNBQXRCO0FBQ0g7QUFDSixLQUpEO0FBTUE5RSxJQUFBQSxxQkFBcUIsQ0FBQ0ksWUFBdEIsQ0FBbUNpRSxFQUFuQyxDQUFzQyxRQUF0QyxFQUFnRCxZQUFNO0FBQ2xELFVBQUlyRSxxQkFBcUIsQ0FBQ0ksWUFBdEIsQ0FBbUN5RSxHQUFuQyxPQUE2QzdFLHFCQUFxQixDQUFDUSxjQUF2RSxFQUF1RjtBQUNuRlIsUUFBQUEscUJBQXFCLENBQUM4RSxTQUF0QjtBQUNIO0FBQ0osS0FKRCxFQW5EUyxDQXlEVDs7QUFDQTVFLElBQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCNkUsSUFBNUIsQ0FBaUMsT0FBakMsRUFBMENDLEdBQTFDLENBQThDO0FBQzFDQyxNQUFBQSxPQUFPLEVBQUUsSUFEaUM7QUFFMUNDLE1BQUFBLFdBQVcsRUFBRTtBQUY2QixLQUE5QyxFQTFEUyxDQStEVDtBQUNBOztBQUNBbEYsSUFBQUEscUJBQXFCLENBQUNtRiw0QkFBdEIsR0FqRVMsQ0FtRVQ7QUFDQTs7QUFDQWpGLElBQUFBLENBQUMsQ0FBQyxrQ0FBRCxDQUFELENBQ0trRixHQURMLENBQ1MsdUJBRFQsRUFFS0EsR0FGTCxDQUVTLHVCQUZULEVBR0tDLFFBSEwsR0FyRVMsQ0EwRVQ7O0FBQ0FuRixJQUFBQSxDQUFDLENBQUMsa0NBQUQsQ0FBRCxDQUFzQ3FFLFFBQXRDLEdBM0VTLENBNkVUOztBQUNBdkUsSUFBQUEscUJBQXFCLENBQUNzRiwyQkFBdEIsR0E5RVMsQ0FnRlQ7QUFDQTtBQUVBO0FBQ0E7QUFFQTs7QUFDQXRGLElBQUFBLHFCQUFxQixDQUFDdUYsY0FBdEIsR0F2RlMsQ0F5RlQ7QUFFQTs7QUFDQXZGLElBQUFBLHFCQUFxQixDQUFDd0YseUJBQXRCLEdBNUZTLENBOEZUOztBQUNBeEYsSUFBQUEscUJBQXFCLENBQUN5RixtQkFBdEIsR0EvRlMsQ0FpR1Q7O0FBQ0F6RixJQUFBQSxxQkFBcUIsQ0FBQzhFLFNBQXRCLEdBbEdTLENBb0dUOztBQUNBOUUsSUFBQUEscUJBQXFCLENBQUNLLG1CQUF0QixDQUEwQ2tFLFFBQTFDLENBQW1EO0FBQy9DLGtCQUFZdkUscUJBQXFCLENBQUMwRjtBQURhLEtBQW5EO0FBR0ExRixJQUFBQSxxQkFBcUIsQ0FBQzBGLG1CQUF0QixHQXhHUyxDQTBHVDs7QUFDQXhGLElBQUFBLENBQUMsQ0FBQ3lGLE1BQUQsQ0FBRCxDQUFVdEIsRUFBVixDQUFhLGdCQUFiLEVBQStCLFVBQUN1QixLQUFELEVBQVFDLE9BQVIsRUFBb0I7QUFDL0MzRixNQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0QjZFLElBQTVCLENBQWlDLE9BQWpDLEVBQTBDQyxHQUExQyxDQUE4QyxZQUE5QyxFQUE0RGEsT0FBNUQ7QUFDSCxLQUZELEVBM0dTLENBK0dUOztBQUNBLFFBQUksT0FBT0MsNkJBQVAsS0FBeUMsV0FBN0MsRUFBMEQ7QUFDdERBLE1BQUFBLDZCQUE2QixDQUFDdEMsVUFBOUI7QUFDSCxLQWxIUSxDQW9IVDtBQUVBO0FBRUE7OztBQUNBeEQsSUFBQUEscUJBQXFCLENBQUMrRixRQUF0QjtBQUNILEdBOVd5Qjs7QUFnWDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLDRCQXZYMEIsMENBdVhLLENBQzNCO0FBQ0E7QUFFQTtBQUNBO0FBQ0gsR0E3WHlCOztBQStYMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJRCxFQUFBQSxRQXBZMEIsc0JBb1lmO0FBQ1A7QUFDQUUsSUFBQUEsSUFBSSxDQUFDQyxnQkFBTCxDQUFzQixJQUF0QixFQUE0QixxQkFBNUI7QUFFQUMsSUFBQUEsa0JBQWtCLENBQUNDLFdBQW5CLENBQStCLFVBQUNDLFFBQUQsRUFBYztBQUN6Q0osTUFBQUEsSUFBSSxDQUFDSyxnQkFBTDs7QUFFQSxVQUFJRCxRQUFRLElBQUlBLFFBQVEsQ0FBQ0UsTUFBckIsSUFBK0JGLFFBQVEsQ0FBQ0csSUFBNUMsRUFBa0Q7QUFDOUM7QUFDQXhHLFFBQUFBLHFCQUFxQixDQUFDeUcsWUFBdEIsQ0FBbUNKLFFBQVEsQ0FBQ0csSUFBNUM7QUFDQXhHLFFBQUFBLHFCQUFxQixDQUFDYyxVQUF0QixHQUFtQyxJQUFuQyxDQUg4QyxDQUs5Qzs7QUFDQSxZQUFJdUYsUUFBUSxDQUFDRyxJQUFULENBQWNFLGtCQUFsQixFQUFzQztBQUNsQztBQUNBQyxVQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiM0csWUFBQUEscUJBQXFCLENBQUM0RywyQkFBdEIsQ0FBa0RQLFFBQVEsQ0FBQ0csSUFBVCxDQUFjRSxrQkFBaEU7QUFDSCxXQUZTLEVBRVAsR0FGTyxDQUFWO0FBR0g7QUFDSixPQVpELE1BWU8sSUFBSUwsUUFBUSxJQUFJQSxRQUFRLENBQUNRLFFBQXpCLEVBQW1DO0FBQ3RDQyxRQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyxZQUFkLEVBQTRCVixRQUFRLENBQUNRLFFBQXJDLEVBRHNDLENBRXRDOztBQUNBN0csUUFBQUEscUJBQXFCLENBQUNnSCxZQUF0QixDQUFtQ1gsUUFBUSxDQUFDUSxRQUE1QztBQUNIO0FBQ0osS0FwQkQ7QUFxQkgsR0E3WnlCOztBQStaMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUosRUFBQUEsWUFuYTBCLHdCQW1hYkQsSUFuYWEsRUFtYVA7QUFDZjtBQUNBLFFBQU1TLFFBQVEsR0FBR1QsSUFBSSxDQUFDUyxRQUFMLElBQWlCVCxJQUFsQztBQUNBLFFBQU1VLE1BQU0sR0FBR1YsSUFBSSxDQUFDVSxNQUFMLElBQWUsRUFBOUIsQ0FIZSxDQUtmOztBQUNBakIsSUFBQUEsSUFBSSxDQUFDa0Isb0JBQUwsQ0FBMEJGLFFBQTFCLEVBQW9DO0FBQ2hDRyxNQUFBQSxhQUFhLEVBQUUsdUJBQUNDLFFBQUQsRUFBYztBQUN6QjtBQUNBckgsUUFBQUEscUJBQXFCLENBQUNzSCxxQkFBdEIsQ0FBNENELFFBQTVDLEVBRnlCLENBSXpCOztBQUNBckgsUUFBQUEscUJBQXFCLENBQUN1SCxtQkFBdEIsQ0FBMENGLFFBQTFDLEVBTHlCLENBT3pCOztBQUNBLFlBQUlILE1BQU0sQ0FBQ3pELE1BQVAsR0FBZ0IsQ0FBcEIsRUFBdUI7QUFDbkJ6RCxVQUFBQSxxQkFBcUIsQ0FBQ3dILGlCQUF0QixDQUF3Q04sTUFBeEM7QUFDSCxTQVZ3QixDQVl6Qjs7O0FBQ0FsSCxRQUFBQSxxQkFBcUIsQ0FBQ3lILHdCQUF0QixDQUErQ0osUUFBL0MsRUFieUIsQ0FlekI7O0FBQ0FySCxRQUFBQSxxQkFBcUIsQ0FBQzBGLG1CQUF0QixHQWhCeUIsQ0FrQnpCOztBQUNBMUYsUUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCeUgsV0FBL0IsQ0FBMkMsU0FBM0MsRUFuQnlCLENBcUJ6Qjs7QUFDQTFILFFBQUFBLHFCQUFxQixDQUFDOEUsU0FBdEI7QUFDSDtBQXhCK0IsS0FBcEMsRUFOZSxDQWlDZjs7QUFDQSxRQUFJbUIsSUFBSSxDQUFDMEIsYUFBVCxFQUF3QjtBQUNwQjFCLE1BQUFBLElBQUksQ0FBQzJCLGlCQUFMO0FBQ0gsS0FwQ2MsQ0FzQ2Y7OztBQUNBLFFBQUksT0FBT0MsWUFBUCxLQUF3QixXQUE1QixFQUF5QztBQUNyQ0EsTUFBQUEsWUFBWSxDQUFDckUsVUFBYixDQUF3QixvQkFBeEIsRUFBOEMsbUJBQTlDO0FBQ0gsS0F6Q2MsQ0EyQ2Y7OztBQUNBeEQsSUFBQUEscUJBQXFCLENBQUN3Rix5QkFBdEIsR0E1Q2UsQ0E4Q2Y7O0FBQ0F0RixJQUFBQSxDQUFDLENBQUM0SCxRQUFELENBQUQsQ0FBWUMsT0FBWixDQUFvQiw0QkFBcEI7QUFFSCxHQXBkeUI7O0FBc2QxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJVCxFQUFBQSxxQkExZDBCLGlDQTBkSkwsUUExZEksRUEwZE07QUFDNUI7QUFFQTtBQUNBLFFBQUlBLFFBQVEsQ0FBQ2Usc0JBQWIsRUFBcUM7QUFDakM5SCxNQUFBQSxDQUFDLENBQUMsb0JBQUQsQ0FBRCxDQUF3QnNHLElBQXhCLENBQTZCLFdBQTdCLEVBQTBDUyxRQUFRLENBQUNlLHNCQUFuRDtBQUNILEtBTjJCLENBUTVCOzs7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlqQixRQUFaLEVBQXNCa0IsT0FBdEIsQ0FBOEIsVUFBQUMsR0FBRyxFQUFJO0FBQ2pDLFVBQU1DLFNBQVMsR0FBR25JLENBQUMsWUFBS2tJLEdBQUwsRUFBRCxDQUFhOUgsTUFBYixDQUFvQixXQUFwQixDQUFsQjs7QUFDQSxVQUFJK0gsU0FBUyxDQUFDNUUsTUFBVixHQUFtQixDQUF2QixFQUEwQjtBQUN0QixZQUFNNkUsU0FBUyxHQUFHckIsUUFBUSxDQUFDbUIsR0FBRCxDQUFSLEtBQWtCLElBQWxCLElBQTBCbkIsUUFBUSxDQUFDbUIsR0FBRCxDQUFSLEtBQWtCLEdBQTVDLElBQW1EbkIsUUFBUSxDQUFDbUIsR0FBRCxDQUFSLEtBQWtCLENBQXZGO0FBQ0FDLFFBQUFBLFNBQVMsQ0FBQzlELFFBQVYsQ0FBbUIrRCxTQUFTLEdBQUcsT0FBSCxHQUFhLFNBQXpDO0FBQ0gsT0FMZ0MsQ0FPakM7OztBQUNBLFVBQU1DLFNBQVMsR0FBR3JJLENBQUMsWUFBS2tJLEdBQUwsRUFBRCxDQUFhOUgsTUFBYixDQUFvQixXQUFwQixDQUFsQjs7QUFDQSxVQUFJaUksU0FBUyxDQUFDOUUsTUFBVixHQUFtQixDQUFuQixJQUF3QixDQUFDOEUsU0FBUyxDQUFDQyxRQUFWLENBQW1CLHNCQUFuQixDQUE3QixFQUF5RTtBQUNyRUQsUUFBQUEsU0FBUyxDQUFDbEQsUUFBVixDQUFtQixjQUFuQixFQUFtQzRCLFFBQVEsQ0FBQ21CLEdBQUQsQ0FBM0M7QUFDSDtBQUNKLEtBWkQ7QUFhSCxHQWhmeUI7O0FBa2YxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJWCxFQUFBQSx3QkF0ZjBCLG9DQXNmRFIsUUF0ZkMsRUFzZlM7QUFDL0I7QUFDQSxRQUFJQSxRQUFRLENBQUMxRixnQkFBVCxJQUE2QjBGLFFBQVEsQ0FBQzFGLGdCQUFULEtBQThCLEVBQS9ELEVBQW1FO0FBQy9EdkIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCd0ksSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsa0JBQWpELEVBQXFFekkscUJBQXFCLENBQUNRLGNBQTNGO0FBQ0FSLE1BQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQndJLElBQS9CLENBQW9DLFdBQXBDLEVBQWlELHdCQUFqRCxFQUEyRXpJLHFCQUFxQixDQUFDUSxjQUFqRztBQUNIOztBQUVELFFBQUl5RyxRQUFRLENBQUN2RixXQUFULElBQXdCdUYsUUFBUSxDQUFDdkYsV0FBVCxLQUF5QixFQUFyRCxFQUF5RDtBQUNyRDFCLE1BQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQndJLElBQS9CLENBQW9DLFdBQXBDLEVBQWlELGFBQWpELEVBQWdFekkscUJBQXFCLENBQUNRLGNBQXRGO0FBQ0FSLE1BQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQndJLElBQS9CLENBQW9DLFdBQXBDLEVBQWlELG1CQUFqRCxFQUFzRXpJLHFCQUFxQixDQUFDUSxjQUE1RjtBQUNIO0FBQ0osR0FqZ0J5Qjs7QUFtZ0IxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJd0csRUFBQUEsWUF2Z0IwQix3QkF1Z0JiSCxRQXZnQmEsRUF1Z0JIO0FBQ25CLFFBQUlBLFFBQVEsQ0FBQ0UsS0FBYixFQUFvQjtBQUNoQixVQUFNMkIsWUFBWSxHQUFHQyxLQUFLLENBQUNDLE9BQU4sQ0FBYy9CLFFBQVEsQ0FBQ0UsS0FBdkIsSUFDZkYsUUFBUSxDQUFDRSxLQUFULENBQWU4QixJQUFmLENBQW9CLElBQXBCLENBRGUsR0FFZmhDLFFBQVEsQ0FBQ0UsS0FGZjtBQUdBK0IsTUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCTCxZQUF0QjtBQUNIO0FBQ0osR0E5Z0J5Qjs7QUFnaEIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJOUIsRUFBQUEsMkJBcGhCMEIsdUNBb2hCRW9DLFVBcGhCRixFQW9oQmM7QUFDcEM7QUFDQTlJLElBQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCK0ksTUFBeEIsR0FGb0MsQ0FJcEM7O0FBQ0EsUUFBSUQsVUFBVSxDQUFDRSxvQkFBZixFQUFxQztBQUNqQztBQUNBLFVBQUlDLGtCQUFrQixHQUFHakosQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJrSixPQUF2QixDQUErQixhQUEvQixDQUF6Qjs7QUFFQSxVQUFJRCxrQkFBa0IsQ0FBQzFGLE1BQW5CLEtBQThCLENBQWxDLEVBQXFDO0FBQ2pDO0FBQ0EwRixRQUFBQSxrQkFBa0IsR0FBR2pKLENBQUMsQ0FBQyxtQkFBRCxDQUFELENBQXVCSSxNQUF2QixHQUFnQ0EsTUFBaEMsRUFBckI7QUFDSDs7QUFFRCxVQUFJNkksa0JBQWtCLENBQUMxRixNQUFuQixHQUE0QixDQUFoQyxFQUFtQztBQUMvQjtBQUNBLFlBQU00RixXQUFXLHVRQUlpQmhJLGVBQWUsQ0FBQ2lJLGVBSmpDLG9EQUtBakksZUFBZSxDQUFDa0kseUJBTGhCLHVGQUFqQixDQUYrQixDQVkvQjs7QUFDQUosUUFBQUEsa0JBQWtCLENBQUNLLE1BQW5CLENBQTBCSCxXQUExQjtBQUNIO0FBQ0osS0E3Qm1DLENBK0JwQzs7O0FBQ0EsUUFBSUwsVUFBVSxDQUFDUyxvQkFBZixFQUFxQztBQUNqQztBQUNBLFVBQU1DLG1CQUFtQixHQUFHeEosQ0FBQyxDQUFDLDJCQUFELENBQUQsQ0FBK0JxRSxRQUEvQixDQUF3QyxZQUF4QyxDQUE1Qjs7QUFFQSxVQUFJLENBQUNtRixtQkFBTCxFQUEwQjtBQUN0QjtBQUNBLFlBQUlDLGtCQUFrQixHQUFHekosQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQmtKLE9BQWxCLENBQTBCLGFBQTFCLENBQXpCOztBQUVBLFlBQUlPLGtCQUFrQixDQUFDbEcsTUFBbkIsS0FBOEIsQ0FBbEMsRUFBcUM7QUFDakM7QUFDQWtHLFVBQUFBLGtCQUFrQixHQUFHekosQ0FBQyxDQUFDLGNBQUQsQ0FBRCxDQUFrQkksTUFBbEIsR0FBMkJBLE1BQTNCLEVBQXJCO0FBQ0g7O0FBRUQsWUFBSXFKLGtCQUFrQixDQUFDbEcsTUFBbkIsR0FBNEIsQ0FBaEMsRUFBbUM7QUFDL0I7QUFDQSxjQUFNNEYsWUFBVyx1UkFJaUJoSSxlQUFlLENBQUNpSSxlQUpqQyx3REFLQWpJLGVBQWUsQ0FBQ2tJLHlCQUxoQixtR0FBakIsQ0FGK0IsQ0FZL0I7OztBQUNBSSxVQUFBQSxrQkFBa0IsQ0FBQ0gsTUFBbkIsQ0FBMEJILFlBQTFCO0FBQ0g7QUFDSjtBQUNKO0FBQ0osR0FsbEJ5Qjs7QUFvbEIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJOUIsRUFBQUEsbUJBeGxCMEIsK0JBd2xCTk4sUUF4bEJNLEVBd2xCSTtBQUMxQjtBQUNBLFFBQU0yQyxNQUFNLHFCQUFPM0MsUUFBUCxDQUFaOztBQUNBLFFBQUksQ0FBQ0EsUUFBUSxDQUFDNEMsdUJBQVYsSUFBcUM1QyxRQUFRLENBQUM0Qyx1QkFBVCxLQUFxQyxFQUE5RSxFQUFrRjtBQUM5RUQsTUFBQUEsTUFBTSxDQUFDQyx1QkFBUCxHQUFpQyxJQUFqQztBQUNILEtBTHlCLENBTzFCOzs7QUFDQUMsSUFBQUEsaUJBQWlCLENBQUNuRyxJQUFsQixDQUF1Qix5QkFBdkIsRUFBa0Q7QUFDOUNvRyxNQUFBQSxRQUFRLEVBQUUsUUFEb0M7QUFFOUNDLE1BQUFBLFlBQVksRUFBRSxJQUZnQztBQUc5Q3hELE1BQUFBLElBQUksRUFBRW9ELE1BSHdDLENBSTlDOztBQUo4QyxLQUFsRCxFQVIwQixDQWUxQjs7QUFDQSxRQUFNSyxPQUFPLHFCQUFPaEQsUUFBUCxDQUFiOztBQUNBLFFBQUksQ0FBQ0EsUUFBUSxDQUFDaUQsd0JBQVYsSUFBc0NqRCxRQUFRLENBQUNpRCx3QkFBVCxLQUFzQyxFQUFoRixFQUFvRjtBQUNoRkQsTUFBQUEsT0FBTyxDQUFDQyx3QkFBUixHQUFtQyxJQUFuQztBQUNILEtBbkJ5QixDQXFCMUI7OztBQUNBSixJQUFBQSxpQkFBaUIsQ0FBQ25HLElBQWxCLENBQXVCLDBCQUF2QixFQUFtRDtBQUMvQ29HLE1BQUFBLFFBQVEsRUFBRSxRQURxQztBQUUvQ0MsTUFBQUEsWUFBWSxFQUFFLElBRmlDO0FBRy9DeEQsTUFBQUEsSUFBSSxFQUFFeUQsT0FIeUMsQ0FJL0M7O0FBSitDLEtBQW5EO0FBTUgsR0FwbkJ5Qjs7QUFzbkIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJekMsRUFBQUEsaUJBMW5CMEIsNkJBMG5CUk4sTUExbkJRLEVBMG5CQTtBQUN0QjtBQUNBbEgsSUFBQUEscUJBQXFCLENBQUNhLGFBQXRCLEdBQXNDLEtBQXRDLENBRnNCLENBSXRCOztBQUNBYixJQUFBQSxxQkFBcUIsQ0FBQ1ksa0JBQXRCLEdBQTJDLEVBQTNDLENBTHNCLENBT3RCOztBQUNBLFFBQU11SixXQUFXLEdBQUdqRCxNQUFNLENBQUNrRCxNQUFQLENBQWMsVUFBQUMsQ0FBQztBQUFBLGFBQUlBLENBQUMsQ0FBQ2xKLElBQUYsS0FBVyxPQUFmO0FBQUEsS0FBZixFQUF1Q21KLElBQXZDLENBQTRDLFVBQUNDLENBQUQsRUFBSUMsQ0FBSjtBQUFBLGFBQVVELENBQUMsQ0FBQ0UsUUFBRixHQUFhRCxDQUFDLENBQUNDLFFBQXpCO0FBQUEsS0FBNUMsQ0FBcEI7QUFDQSxRQUFNQyxXQUFXLEdBQUd4RCxNQUFNLENBQUNrRCxNQUFQLENBQWMsVUFBQUMsQ0FBQztBQUFBLGFBQUlBLENBQUMsQ0FBQ2xKLElBQUYsS0FBVyxPQUFmO0FBQUEsS0FBZixFQUF1Q21KLElBQXZDLENBQTRDLFVBQUNDLENBQUQsRUFBSUMsQ0FBSjtBQUFBLGFBQVVELENBQUMsQ0FBQ0UsUUFBRixHQUFhRCxDQUFDLENBQUNDLFFBQXpCO0FBQUEsS0FBNUMsQ0FBcEIsQ0FUc0IsQ0FXdEI7O0FBQ0F6SyxJQUFBQSxxQkFBcUIsQ0FBQzJLLGVBQXRCLENBQXNDUixXQUF0QyxFQUFtRCxPQUFuRCxFQVpzQixDQWN0Qjs7QUFDQW5LLElBQUFBLHFCQUFxQixDQUFDMkssZUFBdEIsQ0FBc0NELFdBQXRDLEVBQW1ELE9BQW5ELEVBZnNCLENBaUJ0Qjs7QUFDQXhLLElBQUFBLENBQUMsQ0FBQyw0Q0FBRCxDQUFELENBQWdEd0gsV0FBaEQsQ0FBNEQsUUFBNUQ7QUFDQXhILElBQUFBLENBQUMsQ0FBQywwQ0FBRCxDQUFELENBQThDMEssSUFBOUMsR0FuQnNCLENBcUJ0Qjs7QUFDQTVLLElBQUFBLHFCQUFxQixDQUFDNkssdUJBQXRCO0FBQ0gsR0FqcEJ5Qjs7QUFtcEIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lGLEVBQUFBLGVBeHBCMEIsMkJBd3BCVnpELE1BeHBCVSxFQXdwQkYvRixJQXhwQkUsRUF3cEJJO0FBQzFCLFFBQU0ySixVQUFVLEdBQUc1SyxDQUFDLFlBQUtpQixJQUFMLHlCQUFwQjtBQUNBMkosSUFBQUEsVUFBVSxDQUFDQyxLQUFYO0FBRUE3RCxJQUFBQSxNQUFNLENBQUNpQixPQUFQLENBQWUsVUFBQzZDLEtBQUQsRUFBUUMsS0FBUixFQUFrQjtBQUM3QjtBQUNBakwsTUFBQUEscUJBQXFCLENBQUNZLGtCQUF0QixDQUF5Q29LLEtBQUssQ0FBQ0UsSUFBL0MsSUFBdUQ7QUFDbkRULFFBQUFBLFFBQVEsRUFBRVEsS0FEeUM7QUFFbkRFLFFBQUFBLFFBQVEsRUFBRUgsS0FBSyxDQUFDRztBQUZtQyxPQUF2RCxDQUY2QixDQU83Qjs7QUFDQSxVQUFNN0csVUFBVSxHQUFHMEcsS0FBSyxDQUFDRyxRQUFOLEtBQW1CLElBQW5CLElBQTJCSCxLQUFLLENBQUNHLFFBQU4sS0FBbUIsR0FBOUMsSUFBcURILEtBQUssQ0FBQ0csUUFBTixLQUFtQixDQUEzRjtBQUNBLFVBQU1DLE9BQU8sR0FBRyxDQUFDOUcsVUFBRCxHQUFjLFNBQWQsR0FBMEIsRUFBMUM7QUFFQSxVQUFNK0csT0FBTyxrRUFDeUJMLEtBQUssQ0FBQ0UsSUFEL0IsbURBRVNELEtBRlQsd0RBR2NELEtBQUssQ0FBQ0UsSUFIcEIsOERBSXFCRCxLQUpyQixxV0FXd0JELEtBQUssQ0FBQ0UsSUFYOUIscURBWVlFLE9BWlosd0tBZXVCSixLQUFLLENBQUNFLElBZjdCLGdCQWVzQ2xMLHFCQUFxQixDQUFDc0wsVUFBdEIsQ0FBaUNOLEtBQUssQ0FBQ08sV0FBTixJQUFxQlAsS0FBSyxDQUFDRSxJQUE1RCxDQWZ0Qyw2R0FBYjtBQXFCQUosTUFBQUEsVUFBVSxDQUFDVSxNQUFYLENBQWtCSCxPQUFsQjtBQUNILEtBakNELEVBSjBCLENBdUMxQjs7QUFDQVAsSUFBQUEsVUFBVSxDQUFDL0YsSUFBWCxDQUFnQixXQUFoQixFQUE2QlIsUUFBN0IsQ0FBc0M7QUFDbENrSCxNQUFBQSxRQUFRLEVBQUUsb0JBQVc7QUFDakI7QUFDQXpMLFFBQUFBLHFCQUFxQixDQUFDYSxhQUF0QixHQUFzQyxJQUF0QztBQUNBb0YsUUFBQUEsSUFBSSxDQUFDeUYsV0FBTDtBQUNIO0FBTGlDLEtBQXRDO0FBT0gsR0F2c0J5Qjs7QUF5c0IxQjtBQUNKO0FBQ0E7QUFDSWIsRUFBQUEsdUJBNXNCMEIscUNBNHNCQTtBQUN0QjNLLElBQUFBLENBQUMsQ0FBQywwQ0FBRCxDQUFELENBQThDeUwsUUFBOUMsQ0FBdUQ7QUFDbkRDLE1BQUFBLFdBQVcsRUFBRSxhQURzQztBQUVuREMsTUFBQUEsVUFBVSxFQUFFLGFBRnVDO0FBR25EQyxNQUFBQSxNQUFNLEVBQUUsa0JBQVc7QUFDZjtBQUNBOUwsUUFBQUEscUJBQXFCLENBQUNhLGFBQXRCLEdBQXNDLElBQXRDO0FBQ0FvRixRQUFBQSxJQUFJLENBQUN5RixXQUFMO0FBQ0g7QUFQa0QsS0FBdkQ7QUFTSCxHQXR0QnlCOztBQXd0QjFCO0FBQ0o7QUFDQTtBQUNJSyxFQUFBQSwwQkEzdEIwQix3Q0EydEJHO0FBQ3pCO0FBQ0EsUUFBTUMsZ0JBQWdCLEdBQUc5TCxDQUFDLENBQUMsb0JBQUQsQ0FBMUI7O0FBQ0EsUUFBSThMLGdCQUFnQixDQUFDdkksTUFBckIsRUFBNkI7QUFDekIsVUFBTXdJLFNBQVMsR0FBR0QsZ0JBQWdCLENBQUNuSCxHQUFqQixFQUFsQjtBQUNBLFVBQU1xSCxVQUFVLEdBQUdGLGdCQUFnQixDQUFDMUwsTUFBakIsRUFBbkIsQ0FGeUIsQ0FJekI7O0FBQ0EsVUFBTTZMLFFBQVEsR0FBR0gsZ0JBQWdCLENBQUN4RixJQUFqQixDQUFzQixXQUF0QixLQUFzQyxFQUF2RCxDQUx5QixDQU96Qjs7QUFDQTBGLE1BQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZ0NBQWhCLEVBQWtEa0UsTUFBbEQ7O0FBRUEsVUFBSWdELFNBQUosRUFBZTtBQUNYO0FBQ0EsWUFBSUcsV0FBVyxHQUFHLEVBQWxCOztBQUNBLFlBQUlELFFBQVEsSUFBSSxDQUFDQSxRQUFRLENBQUNwRixLQUExQixFQUFpQztBQUM3QixjQUFNc0YsS0FBSyxHQUFHLEVBQWQsQ0FENkIsQ0FHN0I7O0FBQ0EsY0FBSUYsUUFBUSxDQUFDRyxPQUFiLEVBQXNCO0FBQ2xCRCxZQUFBQSxLQUFLLENBQUNFLElBQU4sd0JBQWlCSixRQUFRLENBQUNHLE9BQTFCO0FBQ0gsV0FONEIsQ0FRN0I7OztBQUNBLGNBQUlILFFBQVEsQ0FBQ0ssTUFBVCxJQUFtQixDQUFDTCxRQUFRLENBQUNNLGNBQWpDLEVBQWlEO0FBQzdDSixZQUFBQSxLQUFLLENBQUNFLElBQU4sY0FBaUJKLFFBQVEsQ0FBQ0ssTUFBMUI7QUFDSCxXQUZELE1BRU8sSUFBSUwsUUFBUSxDQUFDTSxjQUFiLEVBQTZCO0FBQ2hDSixZQUFBQSxLQUFLLENBQUNFLElBQU4sQ0FBVyxlQUFYO0FBQ0gsV0FiNEIsQ0FlN0I7OztBQUNBLGNBQUlKLFFBQVEsQ0FBQ08sUUFBYixFQUF1QjtBQUNuQixnQkFBSVAsUUFBUSxDQUFDUSxVQUFiLEVBQXlCO0FBQ3JCTixjQUFBQSxLQUFLLENBQUNFLElBQU4sMEJBQXdCSixRQUFRLENBQUNPLFFBQWpDO0FBQ0gsYUFGRCxNQUVPLElBQUlQLFFBQVEsQ0FBQ1MsaUJBQVQsSUFBOEIsRUFBbEMsRUFBc0M7QUFDekNQLGNBQUFBLEtBQUssQ0FBQ0UsSUFBTixtQ0FBNEJKLFFBQVEsQ0FBQ1MsaUJBQXJDO0FBQ0gsYUFGTSxNQUVBO0FBQ0hQLGNBQUFBLEtBQUssQ0FBQ0UsSUFBTiw4QkFBNEJKLFFBQVEsQ0FBQ08sUUFBckM7QUFDSDtBQUNKOztBQUVETixVQUFBQSxXQUFXLEdBQUdDLEtBQUssQ0FBQ3hELElBQU4sQ0FBVyxLQUFYLENBQWQ7QUFDSCxTQTNCRCxNQTJCTztBQUNIO0FBQ0F1RCxVQUFBQSxXQUFXLEdBQUdwTSxxQkFBcUIsQ0FBQzZNLG1CQUF0QixDQUEwQ1osU0FBMUMsQ0FBZDtBQUNILFNBakNVLENBbUNYOzs7QUFDQUQsUUFBQUEsZ0JBQWdCLENBQUNySCxJQUFqQixHQXBDVyxDQXNDWDs7QUFDQSxZQUFJbUksV0FBVyxHQUFHLEVBQWxCOztBQUNBLFlBQUlYLFFBQVEsQ0FBQ1EsVUFBYixFQUF5QjtBQUNyQkcsVUFBQUEsV0FBVyxHQUFHLE9BQWQ7QUFDSCxTQUZELE1BRU8sSUFBSVgsUUFBUSxDQUFDUyxpQkFBVCxJQUE4QixFQUFsQyxFQUFzQztBQUN6Q0UsVUFBQUEsV0FBVyxHQUFHLFNBQWQ7QUFDSDs7QUFFRCxZQUFNQyxXQUFXLG1GQUNvQ0QsV0FEcEMsdUVBRW1COU0scUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ2MsV0FBakMsQ0FGbkIsdUpBRzREcE0scUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ1csU0FBakMsQ0FINUQseUZBSXNDNUssZUFBZSxDQUFDMkwsa0JBSnRELGdQQVFlM0wsZUFBZSxDQUFDNEwsa0JBUi9CLGtQQVllNUwsZUFBZSxDQUFDNkwsY0FaL0Isa1BBZ0JlN0wsZUFBZSxDQUFDOEwsZ0JBaEIvQixtS0FvQlhoQixRQUFRLElBQUksQ0FBQ0EsUUFBUSxDQUFDcEYsS0FBdEIsR0FBOEIvRyxxQkFBcUIsQ0FBQ29OLHdCQUF0QixDQUErQ2pCLFFBQS9DLENBQTlCLEdBQXlGLEVBcEI5RSxnVUF5Qm9COUssZUFBZSxDQUFDZ00sa0JBekJwQyxnQkF5QjJEcEIsU0F6QjNELGlRQTZCNEI1SyxlQUFlLENBQUNpTSxPQTdCNUMsNkxBZ0M0QmpNLGVBQWUsQ0FBQ2tNLFNBaEM1QywwSEFBakI7QUFzQ0FyQixRQUFBQSxVQUFVLENBQUNWLE1BQVgsQ0FBa0J1QixXQUFsQixFQXBGVyxDQXNGWDs7QUFDQWIsUUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixnQkFBaEIsRUFBa0NWLEVBQWxDLENBQXFDLE9BQXJDLEVBQThDLFVBQVNtSixDQUFULEVBQVk7QUFDdERBLFVBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLGNBQU1DLFFBQVEsR0FBR3hCLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZUFBaEIsQ0FBakI7O0FBQ0EsY0FBSTJJLFFBQVEsQ0FBQ2pLLE1BQWIsRUFBcUI7QUFDakJpSyxZQUFBQSxRQUFRLENBQUNDLFdBQVQ7QUFDSDtBQUNKLFNBTkQsRUF2RlcsQ0ErRlg7O0FBQ0F6QixRQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLFdBQWhCLEVBQTZCVixFQUE3QixDQUFnQyxPQUFoQyxFQUF5QyxVQUFTbUosQ0FBVCxFQUFZO0FBQ2pEQSxVQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQXZCLFVBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZUFBaEIsRUFBaUNKLElBQWpDO0FBQ0F1SCxVQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGlCQUFoQixFQUFtQzZGLElBQW5DO0FBQ0FzQixVQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLHlCQUFoQixFQUEyQzZJLEtBQTNDO0FBQ0gsU0FMRCxFQWhHVyxDQXVHWDs7QUFDQTFCLFFBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZ0JBQWhCLEVBQWtDVixFQUFsQyxDQUFxQyxPQUFyQyxFQUE4QyxVQUFTbUosQ0FBVCxFQUFZO0FBQ3REQSxVQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxjQUFNSSxRQUFRLEdBQUczQixVQUFVLENBQUNuSCxJQUFYLENBQWdCLHlCQUFoQixFQUEyQ0YsR0FBM0MsRUFBakIsQ0FGc0QsQ0FJdEQ7O0FBQ0FtSCxVQUFBQSxnQkFBZ0IsQ0FBQ25ILEdBQWpCLENBQXFCZ0osUUFBckIsRUFMc0QsQ0FPdEQ7O0FBQ0EsY0FBSSxPQUFPNUgsSUFBUCxLQUFnQixXQUFoQixJQUErQkEsSUFBSSxDQUFDNkgsV0FBeEMsRUFBcUQ7QUFDakQ3SCxZQUFBQSxJQUFJLENBQUM2SCxXQUFMO0FBQ0gsV0FWcUQsQ0FZdEQ7OztBQUNBOU4sVUFBQUEscUJBQXFCLENBQUMrTCwwQkFBdEI7QUFDSCxTQWRELEVBeEdXLENBd0hYOztBQUNBRyxRQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGtCQUFoQixFQUFvQ1YsRUFBcEMsQ0FBdUMsT0FBdkMsRUFBZ0QsVUFBU21KLENBQVQsRUFBWTtBQUN4REEsVUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0F2QixVQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGlCQUFoQixFQUFtQ0osSUFBbkM7QUFDQXVILFVBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZUFBaEIsRUFBaUM2RixJQUFqQztBQUNILFNBSkQsRUF6SFcsQ0ErSFg7O0FBQ0FzQixRQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGtCQUFoQixFQUFvQ1YsRUFBcEMsQ0FBdUMsT0FBdkMsRUFBZ0QsVUFBU21KLENBQVQsRUFBWTtBQUN4REEsVUFBQUEsQ0FBQyxDQUFDQyxjQUFGLEdBRHdELENBR3hEOztBQUNBekIsVUFBQUEsZ0JBQWdCLENBQUNuSCxHQUFqQixDQUFxQixFQUFyQixFQUp3RCxDQU14RDs7QUFDQSxjQUFJLE9BQU9vQixJQUFQLEtBQWdCLFdBQWhCLElBQStCQSxJQUFJLENBQUM2SCxXQUF4QyxFQUFxRDtBQUNqRDdILFlBQUFBLElBQUksQ0FBQzZILFdBQUw7QUFDSCxXQVR1RCxDQVd4RDs7O0FBQ0E5TixVQUFBQSxxQkFBcUIsQ0FBQytMLDBCQUF0QjtBQUNILFNBYkQsRUFoSVcsQ0ErSVg7O0FBQ0FHLFFBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZ0JBQWhCLEVBQWtDZ0osS0FBbEMsR0FoSlcsQ0FrSlg7O0FBQ0EsWUFBSS9OLHFCQUFxQixDQUFDdUQsU0FBMUIsRUFBcUM7QUFDakN2RCxVQUFBQSxxQkFBcUIsQ0FBQ3VELFNBQXRCLENBQWdDeUssT0FBaEM7QUFDQWhPLFVBQUFBLHFCQUFxQixDQUFDeUYsbUJBQXRCO0FBQ0g7QUFDSixPQXZKRCxNQXVKTztBQUNIO0FBQ0F1RyxRQUFBQSxnQkFBZ0IsQ0FBQ3BCLElBQWpCO0FBQ0FvQixRQUFBQSxnQkFBZ0IsQ0FBQ2lDLElBQWpCLENBQXNCLGFBQXRCLEVBQXFDNU0sZUFBZSxDQUFDZ00sa0JBQXJEO0FBQ0FyQixRQUFBQSxnQkFBZ0IsQ0FBQ2lDLElBQWpCLENBQXNCLE1BQXRCLEVBQThCLElBQTlCLEVBSkcsQ0FNSDs7QUFDQWpDLFFBQUFBLGdCQUFnQixDQUFDa0MsR0FBakIsQ0FBcUIsbUNBQXJCLEVBQTBEN0osRUFBMUQsQ0FBNkQsbUNBQTdELEVBQWtHLFlBQVc7QUFDekcsY0FBSSxPQUFPNEIsSUFBUCxLQUFnQixXQUFoQixJQUErQkEsSUFBSSxDQUFDNkgsV0FBeEMsRUFBcUQ7QUFDakQ3SCxZQUFBQSxJQUFJLENBQUM2SCxXQUFMO0FBQ0g7QUFDSixTQUpEO0FBS0g7QUFDSjtBQUNKLEdBNzRCeUI7O0FBKzRCMUI7QUFDSjtBQUNBO0FBQ0l0SSxFQUFBQSx5QkFsNUIwQix1Q0FrNUJFO0FBQ3hCO0FBQ0EsUUFBTTJJLGVBQWUsR0FBR2pPLENBQUMsQ0FBQyxpQkFBRCxDQUF6Qjs7QUFDQSxRQUFJaU8sZUFBZSxDQUFDMUssTUFBcEIsRUFBNEI7QUFDeEIsVUFBTXdJLFNBQVMsR0FBR2tDLGVBQWUsQ0FBQ3RKLEdBQWhCLEVBQWxCO0FBQ0EsVUFBTXFILFVBQVUsR0FBR2lDLGVBQWUsQ0FBQzdOLE1BQWhCLEVBQW5CLENBRndCLENBSXhCOztBQUNBNEwsTUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixpQ0FBaEIsRUFBbURrRSxNQUFuRCxHQUx3QixDQU94Qjs7QUFDQSxVQUFJZ0QsU0FBSixFQUFlO0FBQ1g7QUFDQSxZQUFNbUMsU0FBUyxHQUFHcE8scUJBQXFCLENBQUNxTyxjQUF0QixDQUFxQ3BDLFNBQXJDLENBQWxCLENBRlcsQ0FJWDs7QUFDQWtDLFFBQUFBLGVBQWUsQ0FBQ3hKLElBQWhCO0FBRUEsWUFBTW9JLFdBQVcsK0lBRW1CcUIsU0FGbkIsdUpBRzREcE8scUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ1csU0FBakMsQ0FINUQsMEZBSXNDNUssZUFBZSxDQUFDaU4saUJBSnRELDhPQVFlak4sZUFBZSxDQUFDa04sZ0JBUi9CLHVPQVltRHRDLFNBWm5ELGtDQUFqQjtBQWVBQyxRQUFBQSxVQUFVLENBQUNWLE1BQVgsQ0FBa0J1QixXQUFsQixFQXRCVyxDQXdCZjs7QUFDQWIsUUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixhQUFoQixFQUErQlYsRUFBL0IsQ0FBa0MsT0FBbEMsRUFBMkMsVUFBU21KLENBQVQsRUFBWTtBQUNuREEsVUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsY0FBTWUsWUFBWSxHQUFHdEMsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixlQUFoQixDQUFyQjtBQUNBLGNBQU0wSixpQkFBaUIsR0FBR3ZDLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0Isa0JBQWhCLENBQTFCO0FBQ0EsY0FBTTJKLEtBQUssR0FBR3hPLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUTZFLElBQVIsQ0FBYSxHQUFiLENBQWQ7O0FBRUEsY0FBSXlKLFlBQVksQ0FBQ0csRUFBYixDQUFnQixVQUFoQixDQUFKLEVBQWlDO0FBQzdCSCxZQUFBQSxZQUFZLENBQUM3SixJQUFiO0FBQ0E4SixZQUFBQSxpQkFBaUIsQ0FBQzdELElBQWxCO0FBQ0E4RCxZQUFBQSxLQUFLLENBQUNoSCxXQUFOLENBQWtCLFVBQWxCLEVBQThCa0gsUUFBOUIsQ0FBdUMsUUFBdkM7QUFDSCxXQUpELE1BSU87QUFDSEosWUFBQUEsWUFBWSxDQUFDNUQsSUFBYjtBQUNBNkQsWUFBQUEsaUJBQWlCLENBQUM5SixJQUFsQjtBQUNBK0osWUFBQUEsS0FBSyxDQUFDaEgsV0FBTixDQUFrQixRQUFsQixFQUE0QmtILFFBQTVCLENBQXFDLFVBQXJDO0FBQ0g7QUFDSixTQWZELEVBekJlLENBMENmOztBQUNBMUMsUUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixnQkFBaEIsRUFBa0NnSixLQUFsQztBQUNDLE9BNUNELE1BNENPO0FBQ0g7QUFDQUksUUFBQUEsZUFBZSxDQUFDdkQsSUFBaEI7QUFDQXVELFFBQUFBLGVBQWUsQ0FBQ0YsSUFBaEIsQ0FBcUIsVUFBckIsRUFBaUMsSUFBakM7QUFDQUUsUUFBQUEsZUFBZSxDQUFDRixJQUFoQixDQUFxQixhQUFyQixFQUFvQzVNLGVBQWUsQ0FBQ3dOLGlCQUFwRDtBQUNIO0FBQ0osS0E3RHVCLENBK0R4Qjs7O0FBQ0E3TyxJQUFBQSxxQkFBcUIsQ0FBQytMLDBCQUF0QixHQWhFd0IsQ0FrRXhCOztBQUNBLFFBQU0rQyxpQkFBaUIsR0FBRzVPLENBQUMsQ0FBQyxxQkFBRCxDQUEzQjs7QUFDQSxRQUFJNE8saUJBQWlCLENBQUNyTCxNQUF0QixFQUE4QjtBQUMxQixVQUFNeUksV0FBVSxHQUFHNEMsaUJBQWlCLENBQUN4TyxNQUFsQixFQUFuQixDQUQwQixDQUcxQjs7O0FBQ0E0TCxNQUFBQSxXQUFVLENBQUNuSCxJQUFYLENBQWdCLDJDQUFoQixFQUE2RGtFLE1BQTdELEdBSjBCLENBTTFCO0FBQ0E7OztBQUNBLFVBQU04RixZQUFZLEdBQUdELGlCQUFpQixDQUFDakssR0FBbEIsRUFBckI7QUFDQSxVQUFNbUssUUFBUSxHQUFHRCxZQUFZLEtBQUsvTyxxQkFBcUIsQ0FBQ1EsY0FBeEQ7O0FBRUEsVUFBSXdPLFFBQUosRUFBYztBQUNWO0FBQ0FGLFFBQUFBLGlCQUFpQixDQUFDbkssSUFBbEI7O0FBRUEsWUFBTW9JLFlBQVcsc01BSUgxTCxlQUFlLENBQUM0TixrQkFKYixvRkFLa0M1TixlQUFlLENBQUM2TixVQUxsRCxzVEFXWTdOLGVBQWUsQ0FBQzhOLGtCQVg1QixxQ0FBakI7O0FBY0FqRCxRQUFBQSxXQUFVLENBQUNWLE1BQVgsQ0FBa0J1QixZQUFsQixFQWxCVSxDQW9CVjs7O0FBQ0FiLFFBQUFBLFdBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsbUJBQWhCLEVBQXFDVixFQUFyQyxDQUF3QyxPQUF4QyxFQUFpRCxVQUFTbUosQ0FBVCxFQUFZO0FBQ3pEQSxVQUFBQSxDQUFDLENBQUNDLGNBQUY7O0FBQ0F2QixVQUFBQSxXQUFVLENBQUNuSCxJQUFYLENBQWdCLGtCQUFoQixFQUFvQ0osSUFBcEM7O0FBQ0EsY0FBTXlLLFNBQVMsR0FBR2xELFdBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IseUJBQWhCLENBQWxCOztBQUNBcUssVUFBQUEsU0FBUyxDQUFDeEUsSUFBVixHQUFpQmdELEtBQWpCLEdBSnlELENBTXpEOztBQUNBa0IsVUFBQUEsaUJBQWlCLENBQUNqSyxHQUFsQixDQUFzQixFQUF0QixFQVB5RCxDQVN6RDs7QUFDQXVLLFVBQUFBLFNBQVMsQ0FBQy9LLEVBQVYsQ0FBYSxvQkFBYixFQUFtQyxZQUFXO0FBQzFDO0FBQ0F5SyxZQUFBQSxpQkFBaUIsQ0FBQ2pLLEdBQWxCLENBQXNCdUssU0FBUyxDQUFDdkssR0FBVixFQUF0QixFQUYwQyxDQUkxQzs7QUFDQSxnQkFBSSxPQUFPb0IsSUFBUCxLQUFnQixXQUFoQixJQUErQkEsSUFBSSxDQUFDNkgsV0FBeEMsRUFBcUQ7QUFDakQ3SCxjQUFBQSxJQUFJLENBQUM2SCxXQUFMO0FBQ0g7QUFDSixXQVJEO0FBU0gsU0FuQkQ7QUFvQkgsT0F6Q0QsTUF5Q087QUFDSDtBQUNBZ0IsUUFBQUEsaUJBQWlCLENBQUNsRSxJQUFsQjtBQUNBa0UsUUFBQUEsaUJBQWlCLENBQUNiLElBQWxCLENBQXVCLGFBQXZCLEVBQXNDNU0sZUFBZSxDQUFDOE4sa0JBQXREO0FBQ0FMLFFBQUFBLGlCQUFpQixDQUFDYixJQUFsQixDQUF1QixNQUF2QixFQUErQixJQUEvQixFQUpHLENBTUg7O0FBQ0FhLFFBQUFBLGlCQUFpQixDQUFDWixHQUFsQixDQUFzQixtQ0FBdEIsRUFBMkQ3SixFQUEzRCxDQUE4RCxtQ0FBOUQsRUFBbUcsWUFBVztBQUMxRyxjQUFJLE9BQU80QixJQUFQLEtBQWdCLFdBQWhCLElBQStCQSxJQUFJLENBQUM2SCxXQUF4QyxFQUFxRDtBQUNqRDdILFlBQUFBLElBQUksQ0FBQzZILFdBQUw7QUFDSDtBQUNKLFNBSkQ7QUFLSDtBQUNKO0FBQ0osR0F4aEN5Qjs7QUEwaEMxQjtBQUNKO0FBQ0E7QUFDSXJJLEVBQUFBLG1CQTdoQzBCLGlDQTZoQ0o7QUFDbEIsUUFBSXpGLHFCQUFxQixDQUFDdUQsU0FBMUIsRUFBcUM7QUFDakN2RCxNQUFBQSxxQkFBcUIsQ0FBQ3VELFNBQXRCLENBQWdDeUssT0FBaEM7QUFDSDs7QUFFRGhPLElBQUFBLHFCQUFxQixDQUFDdUQsU0FBdEIsR0FBa0MsSUFBSThMLFdBQUosQ0FBZ0IsV0FBaEIsQ0FBbEM7QUFFQXJQLElBQUFBLHFCQUFxQixDQUFDdUQsU0FBdEIsQ0FBZ0NjLEVBQWhDLENBQW1DLFNBQW5DLEVBQThDLFVBQUNtSixDQUFELEVBQU87QUFDakQ7QUFDQSxVQUFNOEIsSUFBSSxHQUFHcFAsQ0FBQyxDQUFDc04sQ0FBQyxDQUFDekYsT0FBSCxDQUFkO0FBQ0EsVUFBTXdILFlBQVksR0FBR0QsSUFBSSxDQUFDdkssSUFBTCxDQUFVLEdBQVYsRUFBZWtKLElBQWYsQ0FBb0IsT0FBcEIsQ0FBckI7QUFFQXFCLE1BQUFBLElBQUksQ0FBQ3ZLLElBQUwsQ0FBVSxHQUFWLEVBQWUyQyxXQUFmLEdBQTZCa0gsUUFBN0IsQ0FBc0MsWUFBdEM7QUFDQWpJLE1BQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2IySSxRQUFBQSxJQUFJLENBQUN2SyxJQUFMLENBQVUsR0FBVixFQUFlMkMsV0FBZixHQUE2QmtILFFBQTdCLENBQXNDVyxZQUF0QztBQUNILE9BRlMsRUFFUCxJQUZPLENBQVYsQ0FOaUQsQ0FVakQ7O0FBQ0EvQixNQUFBQSxDQUFDLENBQUNnQyxjQUFGO0FBQ0gsS0FaRDtBQWNBeFAsSUFBQUEscUJBQXFCLENBQUN1RCxTQUF0QixDQUFnQ2MsRUFBaEMsQ0FBbUMsT0FBbkMsRUFBNEMsWUFBTTtBQUM5Q3lFLE1BQUFBLFdBQVcsQ0FBQ0MsU0FBWixDQUFzQjFILGVBQWUsQ0FBQ29PLGFBQXRDO0FBQ0gsS0FGRDtBQUdILEdBcmpDeUI7O0FBdWpDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJcEIsRUFBQUEsY0E1akMwQiwwQkE0akNYakcsR0E1akNXLEVBNGpDTjtBQUNoQixRQUFJLENBQUNBLEdBQUQsSUFBUUEsR0FBRyxDQUFDM0UsTUFBSixHQUFhLEVBQXpCLEVBQTZCO0FBQ3pCLGFBQU8yRSxHQUFQO0FBQ0g7O0FBRUQsUUFBTWlFLEtBQUssR0FBR2pFLEdBQUcsQ0FBQ3NILEtBQUosQ0FBVSxHQUFWLENBQWQ7O0FBQ0EsUUFBSXJELEtBQUssQ0FBQzVJLE1BQU4sSUFBZ0IsQ0FBcEIsRUFBdUI7QUFDbkIsVUFBTWtNLE9BQU8sR0FBR3RELEtBQUssQ0FBQyxDQUFELENBQXJCO0FBQ0EsVUFBTXVELE9BQU8sR0FBR3ZELEtBQUssQ0FBQyxDQUFELENBQXJCO0FBQ0EsVUFBTXdELE9BQU8sR0FBR3hELEtBQUssQ0FBQ3lELEtBQU4sQ0FBWSxDQUFaLEVBQWVqSCxJQUFmLENBQW9CLEdBQXBCLENBQWhCOztBQUVBLFVBQUkrRyxPQUFPLENBQUNuTSxNQUFSLEdBQWlCLEVBQXJCLEVBQXlCO0FBQ3JCLFlBQU0ySyxTQUFTLEdBQUd3QixPQUFPLENBQUNHLFNBQVIsQ0FBa0IsQ0FBbEIsRUFBcUIsRUFBckIsSUFBMkIsS0FBM0IsR0FBbUNILE9BQU8sQ0FBQ0csU0FBUixDQUFrQkgsT0FBTyxDQUFDbk0sTUFBUixHQUFpQixFQUFuQyxDQUFyRDtBQUNBLGVBQU8sVUFBR2tNLE9BQUgsY0FBY3ZCLFNBQWQsY0FBMkJ5QixPQUEzQixFQUFxQ0csSUFBckMsRUFBUDtBQUNIO0FBQ0o7O0FBRUQsV0FBTzVILEdBQVA7QUFDSCxHQTlrQ3lCOztBQWdsQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXlFLEVBQUFBLG1CQXJsQzBCLCtCQXFsQ05vRCxJQXJsQ00sRUFxbENBO0FBQ3RCLFFBQUksQ0FBQ0EsSUFBRCxJQUFTQSxJQUFJLENBQUN4TSxNQUFMLEdBQWMsR0FBM0IsRUFBZ0M7QUFDNUIsYUFBT3dNLElBQVA7QUFDSDs7QUFFRCxRQUFNQyxLQUFLLEdBQUdELElBQUksQ0FBQ1AsS0FBTCxDQUFXLElBQVgsRUFBaUJ0RixNQUFqQixDQUF3QixVQUFBK0YsSUFBSTtBQUFBLGFBQUlBLElBQUksQ0FBQ0gsSUFBTCxFQUFKO0FBQUEsS0FBNUIsQ0FBZCxDQUxzQixDQU90Qjs7QUFDQSxRQUFNSSxTQUFTLEdBQUdGLEtBQUssQ0FBQyxDQUFELENBQUwsSUFBWSxFQUE5QjtBQUNBLFFBQU1HLFFBQVEsR0FBR0gsS0FBSyxDQUFDQSxLQUFLLENBQUN6TSxNQUFOLEdBQWUsQ0FBaEIsQ0FBTCxJQUEyQixFQUE1QyxDQVRzQixDQVd0Qjs7QUFDQSxRQUFJMk0sU0FBUyxDQUFDRSxRQUFWLENBQW1CLG1CQUFuQixDQUFKLEVBQTZDO0FBQ3pDLHVCQUFVRixTQUFWLGdCQUF5QkMsUUFBekI7QUFDSCxLQWRxQixDQWdCdEI7OztBQUNBLFFBQU1FLFNBQVMsR0FBR04sSUFBSSxDQUFDTyxPQUFMLENBQWEsS0FBYixFQUFvQixHQUFwQixFQUF5QlIsSUFBekIsRUFBbEI7O0FBQ0EsUUFBSU8sU0FBUyxDQUFDOU0sTUFBVixHQUFtQixFQUF2QixFQUEyQjtBQUN2QixhQUFPOE0sU0FBUyxDQUFDUixTQUFWLENBQW9CLENBQXBCLEVBQXVCLEVBQXZCLElBQTZCLEtBQTdCLEdBQXFDUSxTQUFTLENBQUNSLFNBQVYsQ0FBb0JRLFNBQVMsQ0FBQzlNLE1BQVYsR0FBbUIsRUFBdkMsQ0FBNUM7QUFDSDs7QUFFRCxXQUFPOE0sU0FBUDtBQUNILEdBNW1DeUI7O0FBOG1DMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJakYsRUFBQUEsVUFubkMwQixzQkFtbkNmbUYsSUFubkNlLEVBbW5DVDtBQUNiLFFBQU1DLEdBQUcsR0FBRztBQUNSLFdBQUssT0FERztBQUVSLFdBQUssTUFGRztBQUdSLFdBQUssTUFIRztBQUlSLFdBQUssUUFKRztBQUtSLFdBQUs7QUFMRyxLQUFaO0FBT0EsV0FBT0QsSUFBSSxDQUFDRCxPQUFMLENBQWEsVUFBYixFQUF5QixVQUFBRyxDQUFDO0FBQUEsYUFBSUQsR0FBRyxDQUFDQyxDQUFELENBQVA7QUFBQSxLQUExQixDQUFQO0FBQ0gsR0E1bkN5Qjs7QUE4bkMxQjtBQUNKO0FBQ0E7QUFDSWpMLEVBQUFBLG1CQWpvQzBCLGlDQWlvQ0w7QUFDakIsUUFBSTFGLHFCQUFxQixDQUFDSyxtQkFBdEIsQ0FBMENrRSxRQUExQyxDQUFtRCxZQUFuRCxDQUFKLEVBQXNFO0FBQ2xFdkUsTUFBQUEscUJBQXFCLENBQUNPLG1CQUF0QixDQUEwQ29FLElBQTFDO0FBQ0gsS0FGRCxNQUVPO0FBQ0gzRSxNQUFBQSxxQkFBcUIsQ0FBQ08sbUJBQXRCLENBQTBDcUssSUFBMUM7QUFDSDs7QUFDRDVLLElBQUFBLHFCQUFxQixDQUFDOEUsU0FBdEI7QUFDSCxHQXhvQ3lCOztBQTBvQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJOEwsRUFBQUEsZ0JBaHBDMEIsNEJBZ3BDVDNKLFFBaHBDUyxFQWdwQ0M7QUFDdkIsUUFBTVYsTUFBTSxHQUFHVSxRQUFmLENBRHVCLENBR3ZCOztBQUNBLFFBQUlWLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZcUssa0JBQVosS0FBbUNDLFNBQXZDLEVBQWtEO0FBQzlDLFVBQU1DLGVBQWUsR0FBR3hLLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZcUssa0JBQXBDLENBRDhDLENBRTlDO0FBQ0E7O0FBQ0EsVUFBSUUsZUFBZSxLQUFLL1EscUJBQXFCLENBQUNRLGNBQTlDLEVBQThEO0FBQzFELGVBQU8rRixNQUFNLENBQUNDLElBQVAsQ0FBWXFLLGtCQUFuQjtBQUNILE9BTjZDLENBTzlDOztBQUNILEtBWnNCLENBY3ZCO0FBQ0E7QUFFQTs7O0FBQ0EsUUFBTUcsY0FBYyxHQUFHLENBQ25CLFFBRG1CLEVBRW5CLGdCQUZtQixDQUF2QixDQWxCdUIsQ0F1QnZCOztBQUNBL0ksSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVkzQixNQUFNLENBQUNDLElBQW5CLEVBQXlCMkIsT0FBekIsQ0FBaUMsVUFBQUMsR0FBRyxFQUFJO0FBQ3BDLFVBQUlBLEdBQUcsQ0FBQzZJLFVBQUosQ0FBZSxRQUFmLEtBQTRCRCxjQUFjLENBQUNWLFFBQWYsQ0FBd0JsSSxHQUF4QixDQUFoQyxFQUE4RDtBQUMxRCxlQUFPN0IsTUFBTSxDQUFDQyxJQUFQLENBQVk0QixHQUFaLENBQVA7QUFDSDtBQUNKLEtBSkQsRUF4QnVCLENBOEJ2QjtBQUNBOztBQUNBLFFBQU04SSxtQkFBbUIsR0FBRyxDQUFDakwsSUFBSSxDQUFDa0wsZUFBTixJQUF5Qm5SLHFCQUFxQixDQUFDYSxhQUEzRTs7QUFFQSxRQUFJcVEsbUJBQUosRUFBeUI7QUFDckI7QUFDQSxVQUFNRSxTQUFTLEdBQUcsRUFBbEIsQ0FGcUIsQ0FJckI7O0FBQ0FsUixNQUFBQSxDQUFDLENBQUMsZ0VBQUQsQ0FBRCxDQUFvRW1SLElBQXBFLENBQXlFLFVBQUNDLFlBQUQsRUFBZUMsR0FBZixFQUF1QjtBQUM1RixZQUFNQyxTQUFTLEdBQUd0UixDQUFDLENBQUNxUixHQUFELENBQUQsQ0FBT3RELElBQVAsQ0FBWSxpQkFBWixDQUFsQjs7QUFDQSxZQUFJdUQsU0FBSixFQUFlO0FBQ1gsY0FBTUMsZUFBZSxHQUFHdlIsQ0FBQyxDQUFDcVIsR0FBRCxDQUFELENBQU94TSxJQUFQLENBQVksV0FBWixFQUF5QlIsUUFBekIsQ0FBa0MsY0FBbEMsQ0FBeEI7QUFFQTZNLFVBQUFBLFNBQVMsQ0FBQzdFLElBQVYsQ0FBZTtBQUNYckIsWUFBQUEsSUFBSSxFQUFFc0csU0FESztBQUVYckcsWUFBQUEsUUFBUSxFQUFFc0csZUFGQztBQUdYaEgsWUFBQUEsUUFBUSxFQUFFNkc7QUFIQyxXQUFmO0FBS0g7QUFDSixPQVhELEVBTHFCLENBa0JyQjs7QUFDQSxVQUFJRixTQUFTLENBQUMzTixNQUFWLEdBQW1CLENBQXZCLEVBQTBCO0FBQ3RCOEMsUUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlVLE1BQVosR0FBcUJrSyxTQUFyQjtBQUNIO0FBQ0o7O0FBRUQsV0FBTzdLLE1BQVA7QUFDSCxHQTNzQ3lCOztBQTZzQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSW1MLEVBQUFBLGVBbHRDMEIsMkJBa3RDVnJMLFFBbHRDVSxFQWt0Q0E7QUFDdEJuRyxJQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQitJLE1BQXJCLEdBRHNCLENBR3RCOztBQUNBLFFBQUksQ0FBQzVDLFFBQVEsQ0FBQ0UsTUFBZCxFQUFzQjtBQUNsQk4sTUFBQUEsSUFBSSxDQUFDMEwsYUFBTCxDQUFtQmpLLFdBQW5CLENBQStCLFVBQS9CO0FBQ0ExSCxNQUFBQSxxQkFBcUIsQ0FBQzRSLHdCQUF0QixDQUErQ3ZMLFFBQS9DO0FBQ0gsS0FIRCxNQUdPO0FBQ0g7QUFDQXJHLE1BQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQndJLElBQS9CLENBQW9DLFdBQXBDLEVBQWlELGtCQUFqRCxFQUFxRXpJLHFCQUFxQixDQUFDUSxjQUEzRjtBQUNBUixNQUFBQSxxQkFBcUIsQ0FBQ0MsUUFBdEIsQ0FBK0J3SSxJQUEvQixDQUFvQyxXQUFwQyxFQUFpRCx3QkFBakQsRUFBMkV6SSxxQkFBcUIsQ0FBQ1EsY0FBakc7QUFDQVIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCd0ksSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsYUFBakQsRUFBZ0V6SSxxQkFBcUIsQ0FBQ1EsY0FBdEY7QUFDQVIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCd0ksSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsbUJBQWpELEVBQXNFekkscUJBQXFCLENBQUNRLGNBQTVGLEVBTEcsQ0FPSDs7QUFDQU4sTUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0IyUixPQUF4QixDQUFnQyxHQUFoQyxFQUFxQyxZQUFXO0FBQzVDM1IsUUFBQUEsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRK0ksTUFBUjtBQUNILE9BRkQ7QUFHSCxLQWxCcUIsQ0FvQnRCOzs7QUFDQSxRQUFJLE9BQU82SSx3QkFBUCxLQUFvQyxXQUF4QyxFQUFxRDtBQUNqREEsTUFBQUEsd0JBQXdCLENBQUNDLHFCQUF6QjtBQUNIO0FBQ0osR0ExdUN5Qjs7QUE0dUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSCxFQUFBQSx3QkFodkMwQixvQ0FndkNEdkwsUUFodkNDLEVBZ3ZDUztBQUMvQixRQUFJQSxRQUFRLENBQUNRLFFBQWIsRUFBdUI7QUFDbkIsVUFBTW1MLElBQUksR0FBRzlSLENBQUMsQ0FBQyxPQUFELEVBQVU7QUFBRSxpQkFBTyxxQkFBVDtBQUFnQytSLFFBQUFBLEVBQUUsRUFBRTtBQUFwQyxPQUFWLENBQWQ7QUFDQSxVQUFNQyxPQUFPLEdBQUdoUyxDQUFDLENBQUMsT0FBRCxFQUFVO0FBQUUsaUJBQU87QUFBVCxPQUFWLENBQUQsQ0FBZ0N1USxJQUFoQyxDQUFxQ3BQLGVBQWUsQ0FBQzhRLG9CQUFyRCxDQUFoQjtBQUNBSCxNQUFBQSxJQUFJLENBQUN4RyxNQUFMLENBQVkwRyxPQUFaO0FBQ0EsVUFBTUUsR0FBRyxHQUFHbFMsQ0FBQyxDQUFDLE1BQUQsRUFBUztBQUFFLGlCQUFPO0FBQVQsT0FBVCxDQUFiO0FBQ0EsVUFBTW1TLFdBQVcsR0FBRyxJQUFJQyxHQUFKLEVBQXBCLENBTG1CLENBT25COztBQUNBLE9BQUMsT0FBRCxFQUFVLFlBQVYsRUFBd0JuSyxPQUF4QixDQUFnQyxVQUFBb0ssT0FBTyxFQUFJO0FBQ3ZDLFlBQUlsTSxRQUFRLENBQUNRLFFBQVQsQ0FBa0IwTCxPQUFsQixDQUFKLEVBQWdDO0FBQzVCLGNBQU0xTCxRQUFRLEdBQUc4QixLQUFLLENBQUNDLE9BQU4sQ0FBY3ZDLFFBQVEsQ0FBQ1EsUUFBVCxDQUFrQjBMLE9BQWxCLENBQWQsSUFDWGxNLFFBQVEsQ0FBQ1EsUUFBVCxDQUFrQjBMLE9BQWxCLENBRFcsR0FFWCxDQUFDbE0sUUFBUSxDQUFDUSxRQUFULENBQWtCMEwsT0FBbEIsQ0FBRCxDQUZOO0FBSUExTCxVQUFBQSxRQUFRLENBQUNzQixPQUFULENBQWlCLFVBQUFwQixLQUFLLEVBQUk7QUFDdEIsZ0JBQUl5TCxXQUFXLEdBQUcsRUFBbEI7O0FBQ0EsZ0JBQUksUUFBT3pMLEtBQVAsTUFBaUIsUUFBakIsSUFBNkJBLEtBQUssQ0FBQzBMLE9BQXZDLEVBQWdEO0FBQzVDRCxjQUFBQSxXQUFXLEdBQUduUixlQUFlLENBQUMwRixLQUFLLENBQUMwTCxPQUFQLENBQTdCO0FBQ0gsYUFGRCxNQUVPO0FBQ0hELGNBQUFBLFdBQVcsR0FBR25SLGVBQWUsQ0FBQzBGLEtBQUQsQ0FBN0I7QUFDSDs7QUFFRCxnQkFBSSxDQUFDc0wsV0FBVyxDQUFDSyxHQUFaLENBQWdCRixXQUFoQixDQUFMLEVBQW1DO0FBQy9CSCxjQUFBQSxXQUFXLENBQUNNLEdBQVosQ0FBZ0JILFdBQWhCO0FBQ0FKLGNBQUFBLEdBQUcsQ0FBQzVHLE1BQUosQ0FBV3RMLENBQUMsQ0FBQyxNQUFELENBQUQsQ0FBVXVRLElBQVYsQ0FBZStCLFdBQWYsQ0FBWDtBQUNIO0FBQ0osV0FaRDtBQWFIO0FBQ0osT0FwQkQ7QUFzQkFSLE1BQUFBLElBQUksQ0FBQ3hHLE1BQUwsQ0FBWTRHLEdBQVo7QUFDQWxTLE1BQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJzSixNQUFuQixDQUEwQndJLElBQTFCO0FBQ0g7QUFDSixHQWx4Q3lCOztBQW94QzFCO0FBQ0o7QUFDQTtBQUNJbE4sRUFBQUEsU0F2eEMwQix1QkF1eENkO0FBQ1I7QUFDQSxRQUFJOUUscUJBQXFCLENBQUNLLG1CQUF0QixDQUEwQ2tFLFFBQTFDLENBQW1ELFlBQW5ELENBQUosRUFBc0U7QUFDbEUwQixNQUFBQSxJQUFJLENBQUNsRixhQUFMLENBQW1CVyxXQUFuQixDQUErQlIsS0FBL0IsR0FBdUNsQixxQkFBcUIsQ0FBQ3NELDZCQUE3RDtBQUNILEtBRkQsTUFFTyxJQUFJdEQscUJBQXFCLENBQUNJLFlBQXRCLENBQW1DeUUsR0FBbkMsT0FBNkM3RSxxQkFBcUIsQ0FBQ1EsY0FBdkUsRUFBdUY7QUFDMUZ5RixNQUFBQSxJQUFJLENBQUNsRixhQUFMLENBQW1CVyxXQUFuQixDQUErQlIsS0FBL0IsR0FBdUMsRUFBdkM7QUFDSCxLQUZNLE1BRUE7QUFDSCtFLE1BQUFBLElBQUksQ0FBQ2xGLGFBQUwsQ0FBbUJXLFdBQW5CLENBQStCUixLQUEvQixHQUF1Q2xCLHFCQUFxQixDQUFDa0QsMkJBQTdEO0FBQ0gsS0FSTyxDQVVSOzs7QUFDQSxRQUFJbEQscUJBQXFCLENBQUNHLGlCQUF0QixDQUF3QzBFLEdBQXhDLE9BQWtEN0UscUJBQXFCLENBQUNRLGNBQTVFLEVBQTRGO0FBQ3hGeUYsTUFBQUEsSUFBSSxDQUFDbEYsYUFBTCxDQUFtQlEsZ0JBQW5CLENBQW9DTCxLQUFwQyxHQUE0QyxFQUE1QztBQUNILEtBRkQsTUFFTztBQUNIK0UsTUFBQUEsSUFBSSxDQUFDbEYsYUFBTCxDQUFtQlEsZ0JBQW5CLENBQW9DTCxLQUFwQyxHQUE0Q2xCLHFCQUFxQixDQUFDMEMscUJBQWxFO0FBQ0g7QUFDSixHQXZ5Q3lCOztBQXl5QzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTBLLEVBQUFBLHdCQTl5QzBCLG9DQTh5Q0RqQixRQTl5Q0MsRUE4eUNTO0FBQy9CLFFBQUl5RyxJQUFJLEdBQUcsbUVBQVg7QUFDQUEsSUFBQUEsSUFBSSxJQUFJLDBCQUFSO0FBQ0FBLElBQUFBLElBQUksSUFBSSw0QkFBUixDQUgrQixDQUsvQjs7QUFDQSxRQUFJekcsUUFBUSxDQUFDRyxPQUFiLEVBQXNCO0FBQ2xCc0csTUFBQUEsSUFBSSw0REFBbUQ1UyxxQkFBcUIsQ0FBQ3NMLFVBQXRCLENBQWlDYSxRQUFRLENBQUNHLE9BQTFDLENBQW5ELFdBQUo7QUFDSCxLQVI4QixDQVUvQjs7O0FBQ0EsUUFBSUgsUUFBUSxDQUFDSyxNQUFiLEVBQXFCO0FBQ2pCb0csTUFBQUEsSUFBSSwyREFBa0Q1UyxxQkFBcUIsQ0FBQ3NMLFVBQXRCLENBQWlDYSxRQUFRLENBQUNLLE1BQTFDLENBQWxELENBQUo7O0FBQ0EsVUFBSUwsUUFBUSxDQUFDTSxjQUFiLEVBQTZCO0FBQ3pCbUcsUUFBQUEsSUFBSSxJQUFJLGlEQUFSO0FBQ0g7O0FBQ0RBLE1BQUFBLElBQUksSUFBSSxRQUFSO0FBQ0gsS0FqQjhCLENBbUIvQjs7O0FBQ0EsUUFBSXpHLFFBQVEsQ0FBQzBHLFVBQVQsSUFBdUIxRyxRQUFRLENBQUNPLFFBQXBDLEVBQThDO0FBQzFDa0csTUFBQUEsSUFBSSwwREFBaUR6RyxRQUFRLENBQUMwRyxVQUExRCxpQkFBMkUxRyxRQUFRLENBQUNPLFFBQXBGLFdBQUo7QUFDSCxLQXRCOEIsQ0F3Qi9COzs7QUFDQSxRQUFJUCxRQUFRLENBQUNRLFVBQWIsRUFBeUI7QUFDckJpRyxNQUFBQSxJQUFJLElBQUksb0ZBQVI7QUFDSCxLQUZELE1BRU8sSUFBSXpHLFFBQVEsQ0FBQ1MsaUJBQVQsSUFBOEIsRUFBbEMsRUFBc0M7QUFDekNnRyxNQUFBQSxJQUFJLGtGQUF1RXpHLFFBQVEsQ0FBQ1MsaUJBQWhGLHVCQUFKO0FBQ0gsS0FGTSxNQUVBLElBQUlULFFBQVEsQ0FBQ1MsaUJBQVQsR0FBNkIsQ0FBakMsRUFBb0M7QUFDdkNnRyxNQUFBQSxJQUFJLGdGQUFxRXpHLFFBQVEsQ0FBQ1MsaUJBQTlFLHVCQUFKO0FBQ0gsS0EvQjhCLENBaUMvQjs7O0FBQ0EsUUFBSVQsUUFBUSxDQUFDMkcsR0FBVCxJQUFnQjNHLFFBQVEsQ0FBQzJHLEdBQVQsQ0FBYXJQLE1BQWIsR0FBc0IsQ0FBMUMsRUFBNkM7QUFDekNtUCxNQUFBQSxJQUFJLElBQUksdURBQVI7QUFDQUEsTUFBQUEsSUFBSSxJQUFJLHNEQUFSO0FBQ0F6RyxNQUFBQSxRQUFRLENBQUMyRyxHQUFULENBQWEzSyxPQUFiLENBQXFCLFVBQUEySyxHQUFHLEVBQUk7QUFDeEJGLFFBQUFBLElBQUksa0NBQXlCNVMscUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ3dILEdBQWpDLENBQXpCLFdBQUo7QUFDSCxPQUZEO0FBR0FGLE1BQUFBLElBQUksSUFBSSxjQUFSO0FBQ0g7O0FBRURBLElBQUFBLElBQUksSUFBSSxRQUFSLENBM0MrQixDQTJDYjs7QUFDbEJBLElBQUFBLElBQUksSUFBSSxRQUFSLENBNUMrQixDQTRDYjs7QUFDbEJBLElBQUFBLElBQUksSUFBSSxRQUFSLENBN0MrQixDQTZDYjs7QUFFbEIsV0FBT0EsSUFBUDtBQUNILEdBOTFDeUI7O0FBZzJDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSXROLEVBQUFBLDJCQXAyQzBCLHlDQW8yQ0k7QUFDMUIsUUFBTXlOLFlBQVksR0FBRzdTLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJJLE1BQWpCLENBQXdCLFdBQXhCLENBQXJCO0FBQ0EsUUFBTTBTLGFBQWEsR0FBRzlTLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0JJLE1BQWxCLENBQXlCLFdBQXpCLENBQXRCOztBQUVBLFFBQUl5UyxZQUFZLENBQUN0UCxNQUFiLEtBQXdCLENBQXhCLElBQTZCdVAsYUFBYSxDQUFDdlAsTUFBZCxLQUF5QixDQUExRCxFQUE2RDtBQUN6RDtBQUNILEtBTnlCLENBUTFCOzs7QUFDQSxRQUFNd1AsZUFBZSxHQUFHLFNBQWxCQSxlQUFrQixHQUFNO0FBQzFCLFVBQU1DLFlBQVksR0FBR0gsWUFBWSxDQUFDeE8sUUFBYixDQUFzQixZQUF0QixDQUFyQjs7QUFFQSxVQUFJLENBQUMyTyxZQUFMLEVBQW1CO0FBQ2Y7QUFDQUYsUUFBQUEsYUFBYSxDQUFDek8sUUFBZCxDQUF1QixTQUF2QjtBQUNBeU8sUUFBQUEsYUFBYSxDQUFDcEUsUUFBZCxDQUF1QixVQUF2QixFQUhlLENBS2Y7O0FBQ0FvRSxRQUFBQSxhQUFhLENBQUMvRSxJQUFkLENBQW1CLGNBQW5CLEVBQW1DNU0sZUFBZSxDQUFDOFIsa0JBQW5EO0FBQ0FILFFBQUFBLGFBQWEsQ0FBQy9FLElBQWQsQ0FBbUIsZUFBbkIsRUFBb0MsVUFBcEM7QUFDSCxPQVJELE1BUU87QUFDSDtBQUNBK0UsUUFBQUEsYUFBYSxDQUFDdEwsV0FBZCxDQUEwQixVQUExQjtBQUNBc0wsUUFBQUEsYUFBYSxDQUFDSSxVQUFkLENBQXlCLGNBQXpCO0FBQ0FKLFFBQUFBLGFBQWEsQ0FBQ0ksVUFBZCxDQUF5QixlQUF6QjtBQUNIO0FBQ0osS0FqQkQsQ0FUMEIsQ0E0QjFCOzs7QUFDQUgsSUFBQUEsZUFBZSxHQTdCVyxDQStCMUI7QUFDQTs7QUFDQS9TLElBQUFBLENBQUMsQ0FBQyxhQUFELENBQUQsQ0FBaUJtRSxFQUFqQixDQUFvQixRQUFwQixFQUE4QixZQUFXO0FBQ3JDNE8sTUFBQUEsZUFBZTtBQUNsQixLQUZEO0FBR0gsR0F4NEN5Qjs7QUEyNEMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJOU4sRUFBQUEsNEJBLzRDMEIsMENBKzRDSztBQUMzQixRQUFNa08sY0FBYyxHQUFHblQsQ0FBQyxDQUFDLGNBQUQsQ0FBeEIsQ0FEMkIsQ0FDZ0I7O0FBQzNDLFFBQU1vVCxpQkFBaUIsR0FBR3BULENBQUMsQ0FBQyx1QkFBRCxDQUEzQixDQUYyQixDQUU0Qjs7QUFDdkQsUUFBTXFULGVBQWUsR0FBR3JULENBQUMsQ0FBQyw4QkFBRCxDQUF6QixDQUgyQixDQUszQjs7QUFDQSxRQUFJc1QsYUFBYSxHQUFHLElBQXBCO0FBQ0EsUUFBSUMsWUFBWSxHQUFHLEtBQW5CLENBUDJCLENBUzNCOztBQUNBRixJQUFBQSxlQUFlLENBQUM1TyxJQUFoQixHQVYyQixDQVkzQjs7QUFDQXpFLElBQUFBLENBQUMsQ0FBQzRILFFBQUQsQ0FBRCxDQUFZekQsRUFBWixDQUFlLDRCQUFmLEVBQTZDLFlBQU07QUFDL0NtUCxNQUFBQSxhQUFhLEdBQUdILGNBQWMsQ0FBQ3hPLEdBQWYsRUFBaEI7QUFDQTRPLE1BQUFBLFlBQVksR0FBRyxJQUFmO0FBQ0gsS0FIRCxFQWIyQixDQWtCM0I7O0FBQ0FILElBQUFBLGlCQUFpQixDQUFDak8sUUFBbEIsQ0FBMkI7QUFDdkJvRyxNQUFBQSxRQUFRLEVBQUUsa0JBQUM1SSxLQUFELEVBQVc7QUFDakI7QUFDQTtBQUVBO0FBQ0EsWUFBSTRRLFlBQVksSUFBSUQsYUFBYSxLQUFLLElBQWxDLElBQTBDM1EsS0FBSyxLQUFLMlEsYUFBeEQsRUFBdUU7QUFDbkVELFVBQUFBLGVBQWUsQ0FBQ0csVUFBaEIsQ0FBMkIsU0FBM0I7QUFDSCxTQUZELE1BRU8sSUFBSUQsWUFBSixFQUFrQjtBQUNyQkYsVUFBQUEsZUFBZSxDQUFDRyxVQUFoQixDQUEyQixVQUEzQjtBQUNILFNBVGdCLENBV2pCOzs7QUFDQSxZQUFJRCxZQUFKLEVBQWtCO0FBQ2R4TixVQUFBQSxJQUFJLENBQUN5RixXQUFMO0FBQ0g7QUFDSjtBQWhCc0IsS0FBM0I7QUFrQkgsR0FwN0N5Qjs7QUFzN0MxQjtBQUNKO0FBQ0E7QUFDSW5HLEVBQUFBLGNBejdDMEIsNEJBeTdDVDtBQUNiVSxJQUFBQSxJQUFJLENBQUNoRyxRQUFMLEdBQWdCRCxxQkFBcUIsQ0FBQ0MsUUFBdEMsQ0FEYSxDQUdiOztBQUNBZ0csSUFBQUEsSUFBSSxDQUFDME4sV0FBTCxDQUFpQkMsT0FBakIsR0FBMkIsSUFBM0I7QUFDQTNOLElBQUFBLElBQUksQ0FBQzBOLFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCMU4sa0JBQTdCO0FBQ0FGLElBQUFBLElBQUksQ0FBQzBOLFdBQUwsQ0FBaUJHLFVBQWpCLEdBQThCLGNBQTlCLENBTmEsQ0FRYjs7QUFDQTdOLElBQUFBLElBQUksQ0FBQzhOLHVCQUFMLEdBQStCLElBQS9CLENBVGEsQ0FXYjs7QUFDQTlOLElBQUFBLElBQUksQ0FBQ2tMLGVBQUwsR0FBdUIsSUFBdkIsQ0FaYSxDQWNiOztBQUNBbEwsSUFBQUEsSUFBSSxDQUFDK04sbUJBQUwsR0FBMkIsSUFBM0I7QUFDQS9OLElBQUFBLElBQUksQ0FBQ2dPLG9CQUFMLEdBQTRCLElBQTVCO0FBQ0FoTyxJQUFBQSxJQUFJLENBQUNpTyxHQUFMO0FBRUFqTyxJQUFBQSxJQUFJLENBQUNsRixhQUFMLEdBQXFCZixxQkFBcUIsQ0FBQ2UsYUFBM0M7QUFDQWtGLElBQUFBLElBQUksQ0FBQzJLLGdCQUFMLEdBQXdCNVEscUJBQXFCLENBQUM0USxnQkFBOUM7QUFDQTNLLElBQUFBLElBQUksQ0FBQ3lMLGVBQUwsR0FBdUIxUixxQkFBcUIsQ0FBQzBSLGVBQTdDO0FBQ0F6TCxJQUFBQSxJQUFJLENBQUN6QyxVQUFMO0FBQ0g7QUFoOUN5QixDQUE5QixDLENBbTlDQTs7QUFDQXRELENBQUMsQ0FBQzRILFFBQUQsQ0FBRCxDQUFZcU0sS0FBWixDQUFrQixZQUFNO0FBQ3BCblUsRUFBQUEscUJBQXFCLENBQUN3RCxVQUF0QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGFzc3dvcmRTY29yZSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSwgU291bmRGaWxlU2VsZWN0b3IsIEdlbmVyYWxTZXR0aW5nc0FQSSwgQ2xpcGJvYXJkSlMsIFBhc3N3b3JkV2lkZ2V0LCBQYXNzd29yZHNBUEksIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyLCAkICovXG5cbi8qKlxuICogQSBtb2R1bGUgdG8gaGFuZGxlIG1vZGlmaWNhdGlvbiBvZiBnZW5lcmFsIHNldHRpbmdzLlxuICovXG5jb25zdCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBhZG1pbiBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR3ZWJBZG1pblBhc3N3b3JkOiAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZDogJCgnI1NTSFBhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgd2ViIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXNhYmxlU1NIUGFzc3dvcmQ6ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5wYXJlbnQoJy5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZFNlZ21lbnQ6ICQoJyNvbmx5LWlmLXBhc3N3b3JkLWVuYWJsZWQnKSxcblxuICAgIC8qKlxuICAgICAqIElmIHBhc3N3b3JkIHNldCwgaXQgd2lsbCBiZSBoaWRlZCBmcm9tIHdlYiB1aS5cbiAgICAgKi9cbiAgICBoaWRkZW5QYXNzd29yZDogJ3h4eHh4eHgnLFxuXG4gICAgLyoqXG4gICAgICogU291bmQgZmlsZSBmaWVsZCBJRHNcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHNvdW5kRmlsZUZpZWxkczoge1xuICAgICAgICBhbm5vdW5jZW1lbnRJbjogJ1BCWFJlY29yZEFubm91bmNlbWVudEluJyxcbiAgICAgICAgYW5ub3VuY2VtZW50T3V0OiAnUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0J1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogT3JpZ2luYWwgY29kZWMgc3RhdGUgZnJvbSBsYXN0IGxvYWRcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIG9yaWdpbmFsQ29kZWNTdGF0ZToge30sXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHRyYWNrIGlmIGNvZGVjcyBoYXZlIGJlZW4gY2hhbmdlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGNvZGVjc0NoYW5nZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBkYXRhIGhhcyBiZWVuIGxvYWRlZCBmcm9tIEFQSVxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGRhdGFMb2FkZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7IC8vIGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzXG4gICAgICAgIHBieG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdQQlhOYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5UEJYTmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV2ViQWRtaW5QYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dlYkFkbWluUGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBXZWJBZG1pblBhc3N3b3JkUmVwZWF0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hdGNoW1dlYkFkbWluUGFzc3dvcmRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWJQYXNzd29yZHNGaWVsZERpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgU1NIUGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTU0hQYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIFNTSFBhc3N3b3JkUmVwZWF0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU1NIUGFzc3dvcmRSZXBlYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXRjaFtTU0hQYXNzd29yZF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVNTSFBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXRUJQb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV0VCUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtXRUJIVFRQU1BvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXRUJIVFRQU1BvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXRUJIVFRQU1BvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtXRUJQb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIEFKQU1Qb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnQUpBTVBvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBTSVBBdXRoUHJlZml4OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU0lQQXV0aFByZWZpeCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cFsvXlthLXpBLVpdKiQvXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhJbnZhbGlkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgZmllbGQgd2hlbiBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICB3ZWJBZG1pblBhc3N3b3JkUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1xcZC8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vTnVtYmVyc1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW0EtWl0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGVuYWJsZWQsIGFuZCBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1tBLVpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGQgd2hlbiBTU0ggbG9naW4gdGhyb3VnaCB0aGUgcGFzc3dvcmQgZGlzYWJsZWRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkLFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8qKlxuICAgICAqIENsaXBib2FyZCBpbnN0YW5jZSBmb3IgY29weSBmdW5jdGlvbmFsaXR5XG4gICAgICogQHR5cGUge0NsaXBib2FyZEpTfVxuICAgICAqL1xuICAgIGNsaXBib2FyZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiAgSW5pdGlhbGl6ZSBtb2R1bGUgd2l0aCBldmVudCBiaW5kaW5ncyBhbmQgY29tcG9uZW50IGluaXRpYWxpemF0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0c1xuICAgICAgICAvLyBXZWIgQWRtaW4gUGFzc3dvcmQgd2lkZ2V0IC0gb25seSB2YWxpZGF0aW9uIGFuZCB3YXJuaW5ncywgbm8gYnV0dG9uc1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIFBhc3N3b3JkV2lkZ2V0LmluaXQoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLCB7XG4gICAgICAgICAgICAgICAgY29udGV4dDogJ2dlbmVyYWxfd2ViJyxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSwgICAgIC8vIE5vIHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTU0ggUGFzc3dvcmQgd2lkZ2V0IC0gb25seSB2YWxpZGF0aW9uIGFuZCB3YXJuaW5ncywgbm8gYnV0dG9uc1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzc2hXaWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQsIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0OiAnZ2VuZXJhbF9zc2gnLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLCAgICAgLy8gTm8gc2hvdy9oaWRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gY29weSBidXR0b25cbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBTU0ggZGlzYWJsZSBjaGVja2JveFxuICAgICAgICAgICAgJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNEaXNhYmxlZCA9ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGlmIChpc0Rpc2FibGVkICYmIHNzaFdpZGdldCkge1xuICAgICAgICAgICAgICAgICAgICBQYXNzd29yZFdpZGdldC5oaWRlV2FybmluZ3Moc3NoV2lkZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNzaFdpZGdldC5lbGVtZW50cy4kc2NvcmVTZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzc2hXaWRnZXQuZWxlbWVudHMuJHNjb3JlU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpc0Rpc2FibGVkICYmIHNzaFdpZGdldCkge1xuICAgICAgICAgICAgICAgICAgICBQYXNzd29yZFdpZGdldC5jaGVja1Bhc3N3b3JkKHNzaFdpZGdldCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIHdoZW4gcGFzc3dvcmRzIGNoYW5nZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgIT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQudmFsKCkgIT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLW1lbnUnKS5maW5kKCcuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBQQlhMYW5ndWFnZSBkcm9wZG93biBmaXJzdCB3aXRoIHNwZWNpYWwgaGFuZGxlclxuICAgICAgICAvLyBNdXN0IGJlIGRvbmUgYmVmb3JlIGdlbmVyYWwgZHJvcGRvd24gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmcoKTtcblxuICAgICAgICAvLyBFbmFibGUgZHJvcGRvd25zIG9uIHRoZSBmb3JtIChleGNlcHQgc291bmQgZmlsZSBzZWxlY3RvcnMgYW5kIGxhbmd1YWdlIGRyb3Bkb3duKVxuICAgICAgICAvLyBMYW5ndWFnZSBkcm9wZG93biBhbHJlYWR5IGluaXRpYWxpemVkIGFib3ZlIHdpdGggc3BlY2lhbCBvbkNoYW5nZSBoYW5kbGVyXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmRyb3Bkb3duJylcbiAgICAgICAgICAgIC5ub3QoJy5hdWRpby1tZXNzYWdlLXNlbGVjdCcpXG4gICAgICAgICAgICAubm90KCcjUEJYTGFuZ3VhZ2UtZHJvcGRvd24nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGNoZWNrYm94ZXMgb24gdGhlIGZvcm1cbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybSAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBBTUkvQUpBTSBkZXBlbmRlbmN5IGFmdGVyIGNoZWNrYm94ZXMgYXJlIGluaXRpYWxpemVkXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQU1JQUpBTURlcGVuZGVuY3koKTtcblxuICAgICAgICAvLyBDb2RlYyB0YWJsZSBkcmFnLW4tZHJvcCB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIFNlZSBpbml0aWFsaXplQ29kZWNEcmFnRHJvcCgpIHdoaWNoIGlzIGNhbGxlZCBmcm9tIHVwZGF0ZUNvZGVjVGFibGVzKClcblxuICAgICAgICAvLyBTb3VuZCBmaWxlIHNlbGVjdG9ycyB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIFJFU1QgQVBJIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIFNlZSBsb2FkU291bmRGaWxlVmFsdWVzKCkgbWV0aG9kIGNhbGxlZCBmcm9tIHBvcHVsYXRlRm9ybSgpXG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IFNTSCBrZXlzIHRhYmxlIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBsb2Fkc1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0cnVuY2F0ZWQgZmllbGRzIGRpc3BsYXlcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBjb3B5IGJ1dHRvbnNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDbGlwYm9hcmQoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGFkZGl0aW9uYWwgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG5cbiAgICAgICAgLy8gU2hvdywgaGlkZSBzc2ggcGFzc3dvcmQgc2VnbWVudFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCh7XG4gICAgICAgICAgICAnb25DaGFuZ2UnOiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0hpZGVTU0hQYXNzd29yZFxuICAgICAgICB9KTtcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmQoKTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgdG8gaGFuZGxlIHRhYiBhY3RpdmF0aW9uXG4gICAgICAgICQod2luZG93KS5vbignR1MtQWN0aXZhdGVUYWInLCAoZXZlbnQsIG5hbWVUYWIpID0+IHtcbiAgICAgICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLW1lbnUnKS5maW5kKCcuaXRlbScpLnRhYignY2hhbmdlIHRhYicsIG5hbWVUYWIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGlmICh0eXBlb2YgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUb29sdGlwIGNsaWNrIGJlaGF2aW9yIGlzIG5vdyBoYW5kbGVkIGdsb2JhbGx5IGluIFRvb2x0aXBCdWlsZGVyLmpzXG5cbiAgICAgICAgLy8gUEJYTGFuZ3VhZ2UgZHJvcGRvd24gd2l0aCByZXN0YXJ0IHdhcm5pbmcgYWxyZWFkeSBpbml0aWFsaXplZCBhYm92ZVxuXG4gICAgICAgIC8vIExvYWQgZGF0YSBmcm9tIEFQSSBpbnN0ZWFkIG9mIHVzaW5nIHNlcnZlci1yZW5kZXJlZCB2YWx1ZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWREYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvcnMgd2l0aCBwbGF5YmFjayBmdW5jdGlvbmFsaXR5IHVzaW5nIFNvdW5kRmlsZVNlbGVjdG9yXG4gICAgICogSFRNTCBzdHJ1Y3R1cmUgaXMgcHJvdmlkZWQgYnkgdGhlIHBsYXlBZGROZXdTb3VuZFdpdGhJY29ucyBwYXJ0aWFsIGluIHJlY29yZGluZy52b2x0OlxuICAgICAqIC0gSGlkZGVuIGlucHV0OiA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiUEJYUmVjb3JkQW5ub3VuY2VtZW50SW5cIiBuYW1lPVwiUEJYUmVjb3JkQW5ub3VuY2VtZW50SW5cIj5cbiAgICAgKiAtIERyb3Bkb3duIGRpdjogPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93biBzZWFyY2ggUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4tZHJvcGRvd25cIj5cbiAgICAgKiAtIFBsYXliYWNrIGJ1dHRvbiBhbmQgYWRkIG5ldyBidXR0b25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3JzKCkge1xuICAgICAgICAvLyBTb3VuZCBmaWxlIHNlbGVjdG9ycyB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIFNlZSBpbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3JXaXRoRGF0YSgpIGNhbGxlZCBmcm9tIHBvcHVsYXRlRm9ybSgpXG4gICAgICAgIFxuICAgICAgICAvLyBUaGlzIG1ldGhvZCBpcyBrZXB0IGZvciBjb25zaXN0ZW5jeSBidXQgYWN0dWFsIGluaXRpYWxpemF0aW9uIGhhcHBlbnNcbiAgICAgICAgLy8gd2hlbiB3ZSBoYXZlIGRhdGEgZnJvbSB0aGUgc2VydmVyIGluIGxvYWRTb3VuZEZpbGVWYWx1ZXMoKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGdlbmVyYWwgc2V0dGluZ3MgZGF0YSBmcm9tIEFQSVxuICAgICAqIFVzZWQgYm90aCBvbiBpbml0aWFsIHBhZ2UgbG9hZCBhbmQgZm9yIG1hbnVhbCByZWZyZXNoXG4gICAgICogQ2FuIGJlIGNhbGxlZCBhbnl0aW1lIHRvIHJlbG9hZCB0aGUgZm9ybSBkYXRhOiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkubG9hZERhdGEoKVxuICAgICAqL1xuICAgIGxvYWREYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGUgb24gdGhlIGZvcm0gd2l0aCBkaW1tZXJcbiAgICAgICAgRm9ybS5zaG93TG9hZGluZ1N0YXRlKHRydWUsICdMb2FkaW5nIHNldHRpbmdzLi4uJyk7XG5cbiAgICAgICAgR2VuZXJhbFNldHRpbmdzQVBJLmdldFNldHRpbmdzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgRm9ybS5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCB0aGUgcmVjZWl2ZWQgZGF0YVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmRhdGFMb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNob3cgd2FybmluZ3MgZm9yIGRlZmF1bHQgcGFzc3dvcmRzIGFmdGVyIERPTSB1cGRhdGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5wYXNzd29yZFZhbGlkYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIERPTSBpcyB1cGRhdGVkIGFmdGVyIHBvcHVsYXRlRm9ybVxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MocmVzcG9uc2UuZGF0YS5wYXNzd29yZFZhbGlkYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBUEkgRXJyb3I6JywgcmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0FwaUVycm9yKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gU2V0dGluZ3MgZGF0YSBmcm9tIEFQSSByZXNwb25zZVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIEV4dHJhY3Qgc2V0dGluZ3MgYW5kIGFkZGl0aW9uYWwgZGF0YVxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGRhdGEuc2V0dGluZ3MgfHwgZGF0YTtcbiAgICAgICAgY29uc3QgY29kZWNzID0gZGF0YS5jb2RlY3MgfHwgW107XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHNldHRpbmdzLCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc3BlY2lhbCBmaWVsZCB0eXBlc1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5wb3B1bGF0ZVNwZWNpYWxGaWVsZHMoZm9ybURhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIExvYWQgc291bmQgZmlsZSB2YWx1ZXMgd2l0aCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkubG9hZFNvdW5kRmlsZVZhbHVlcyhmb3JtRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGNvZGVjIHRhYmxlc1xuICAgICAgICAgICAgICAgIGlmIChjb2RlY3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudXBkYXRlQ29kZWNUYWJsZXMoY29kZWNzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCBmaWVsZHMgKGhpZGUgYWN0dWFsIHBhc3N3b3JkcylcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVBhc3N3b3JkRmllbGRzKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgU1NIIHBhc3N3b3JkIHZpc2liaWxpdHlcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0hpZGVTU0hQYXNzd29yZCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBpZiBlbmFibGVkXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTU0gga2V5cyB0YWJsZSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBpZiAodHlwZW9mIHNzaEtleXNUYWJsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHNzaEtleXNUYWJsZS5pbml0aWFsaXplKCdzc2gta2V5cy1jb250YWluZXInLCAnU1NIQXV0aG9yaXplZEtleXMnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSB0cnVuY2F0ZWQgZmllbGRzIHdpdGggbmV3IGRhdGFcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyaWdnZXIgZXZlbnQgdG8gbm90aWZ5IHRoYXQgZGF0YSBoYXMgYmVlbiBsb2FkZWRcbiAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignR2VuZXJhbFNldHRpbmdzLmRhdGFMb2FkZWQnKTtcblxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHNwZWNpYWwgZmllbGQgdHlwZXMgdGhhdCBuZWVkIGN1c3RvbSBwb3B1bGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlU3BlY2lhbEZpZWxkcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBQcml2YXRlIGtleSBleGlzdGVuY2UgaXMgbm93IGRldGVybWluZWQgYnkgY2hlY2tpbmcgaWYgdmFsdWUgZXF1YWxzIEhJRERFTl9QQVNTV09SRFxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNlcnRpZmljYXRlIGluZm9cbiAgICAgICAgaWYgKHNldHRpbmdzLldFQkhUVFBTUHVibGljS2V5X2luZm8pIHtcbiAgICAgICAgICAgICQoJyNXRUJIVFRQU1B1YmxpY0tleScpLmRhdGEoJ2NlcnQtaW5mbycsIHNldHRpbmdzLldFQkhUVFBTUHVibGljS2V5X2luZm8pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2hlY2tib3hlcyAoQVBJIHJldHVybnMgYm9vbGVhbiB2YWx1ZXMpXG4gICAgICAgIE9iamVjdC5rZXlzKHNldHRpbmdzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKGAjJHtrZXl9YCkucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgIGlmICgkY2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IHNldHRpbmdzW2tleV0gPT09IHRydWUgfHwgc2V0dGluZ3Nba2V5XSA9PT0gJzEnIHx8IHNldHRpbmdzW2tleV0gPT09IDE7XG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmNoZWNrYm94KGlzQ2hlY2tlZCA/ICdjaGVjaycgOiAndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgcmVndWxhciBkcm9wZG93bnMgKGV4Y2x1ZGluZyBzb3VuZCBmaWxlIHNlbGVjdG9ycyB3aGljaCBhcmUgaGFuZGxlZCBzZXBhcmF0ZWx5KVxuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7a2V5fWApLnBhcmVudCgnLmRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA+IDAgJiYgISRkcm9wZG93bi5oYXNDbGFzcygnYXVkaW8tbWVzc2FnZS1zZWxlY3QnKSkge1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2V0dGluZ3Nba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCBmaWVsZHMgd2l0aCBoaWRkZW4gcGFzc3dvcmQgaW5kaWNhdG9yXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYXNzd29yZEZpZWxkcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBIaWRlIGFjdHVhbCBwYXNzd29yZHMgYW5kIHNob3cgaGlkZGVuIGluZGljYXRvclxuICAgICAgICBpZiAoc2V0dGluZ3MuV2ViQWRtaW5QYXNzd29yZCAmJiBzZXR0aW5ncy5XZWJBZG1pblBhc3N3b3JkICE9PSAnJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChzZXR0aW5ncy5TU0hQYXNzd29yZCAmJiBzZXR0aW5ncy5TU0hQYXNzd29yZCAhPT0gJycpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgQVBJIGVycm9yIG1lc3NhZ2VzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG1lc3NhZ2VzIC0gRXJyb3IgbWVzc2FnZXMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBzaG93QXBpRXJyb3IobWVzc2FnZXMpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBBcnJheS5pc0FycmF5KG1lc3NhZ2VzLmVycm9yKSBcbiAgICAgICAgICAgICAgICA/IG1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgXG4gICAgICAgICAgICAgICAgOiBtZXNzYWdlcy5lcnJvcjtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHdhcm5pbmdzIGZvciBkZWZhdWx0IHBhc3N3b3Jkc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB2YWxpZGF0aW9uIC0gUGFzc3dvcmQgdmFsaWRhdGlvbiByZXN1bHRzIGZyb20gQVBJXG4gICAgICovXG4gICAgc2hvd0RlZmF1bHRQYXNzd29yZFdhcm5pbmdzKHZhbGlkYXRpb24pIHtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBwYXNzd29yZC12YWxpZGF0ZSBtZXNzYWdlcyBmaXJzdFxuICAgICAgICAkKCcucGFzc3dvcmQtdmFsaWRhdGUnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgd2FybmluZyBmb3IgZGVmYXVsdCBXZWIgQWRtaW4gcGFzc3dvcmRcbiAgICAgICAgaWYgKHZhbGlkYXRpb24uaXNEZWZhdWx0V2ViUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIHBhc3N3b3JkIGZpZWxkcyBncm91cCAtIHRyeSBtdWx0aXBsZSBzZWxlY3RvcnNcbiAgICAgICAgICAgIGxldCAkd2ViUGFzc3dvcmRGaWVsZHMgPSAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLmNsb3Nlc3QoJy50d28uZmllbGRzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkd2ViUGFzc3dvcmRGaWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IGFsdGVybmF0aXZlIHNlbGVjdG9yIGlmIHRoZSBmaXJzdCBvbmUgZG9lc24ndCB3b3JrXG4gICAgICAgICAgICAgICAgJHdlYlBhc3N3b3JkRmllbGRzID0gJCgnI1dlYkFkbWluUGFzc3dvcmQnKS5wYXJlbnQoKS5wYXJlbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCR3ZWJQYXNzd29yZEZpZWxkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgaWNvbiBtZXNzYWdlIHBhc3N3b3JkLXZhbGlkYXRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5wc3dfU2V0UGFzc3dvcmR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUucHN3X0NoYW5nZURlZmF1bHRQYXNzd29yZH08L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbnNlcnQgd2FybmluZyBiZWZvcmUgdGhlIHBhc3N3b3JkIGZpZWxkc1xuICAgICAgICAgICAgICAgICR3ZWJQYXNzd29yZEZpZWxkcy5iZWZvcmUod2FybmluZ0h0bWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHdhcm5pbmcgZm9yIGRlZmF1bHQgU1NIIHBhc3N3b3JkXG4gICAgICAgIGlmICh2YWxpZGF0aW9uLmlzRGVmYXVsdFNTSFBhc3N3b3JkKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBTU0ggcGFzc3dvcmQgbG9naW4gaXMgZW5hYmxlZFxuICAgICAgICAgICAgY29uc3Qgc3NoUGFzc3dvcmREaXNhYmxlZCA9ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXNzaFBhc3N3b3JkRGlzYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSBTU0ggcGFzc3dvcmQgZmllbGRzIGdyb3VwXG4gICAgICAgICAgICAgICAgbGV0ICRzc2hQYXNzd29yZEZpZWxkcyA9ICQoJyNTU0hQYXNzd29yZCcpLmNsb3Nlc3QoJy50d28uZmllbGRzJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRzc2hQYXNzd29yZEZpZWxkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IGFsdGVybmF0aXZlIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgICRzc2hQYXNzd29yZEZpZWxkcyA9ICQoJyNTU0hQYXNzd29yZCcpLnBhcmVudCgpLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJHNzaFBhc3N3b3JkRmllbGRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB3YXJuaW5nSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBuZWdhdGl2ZSBpY29uIG1lc3NhZ2UgcGFzc3dvcmQtdmFsaWRhdGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19TZXRQYXNzd29yZH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUucHN3X0NoYW5nZURlZmF1bHRQYXNzd29yZH08L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEluc2VydCB3YXJuaW5nIGJlZm9yZSB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICAkc3NoUGFzc3dvcmRGaWVsZHMuYmVmb3JlKHdhcm5pbmdIdG1sKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYW5kIGxvYWQgc291bmQgZmlsZSBzZWxlY3RvcnMgd2l0aCBkYXRhLCBzaW1pbGFyIHRvIElWUiBpbXBsZW1lbnRhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU291bmRGaWxlVmFsdWVzKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIENvbnZlcnQgZW1wdHkgdmFsdWVzIHRvIC0xIGZvciB0aGUgZHJvcGRvd25cbiAgICAgICAgY29uc3QgZGF0YUluID0gey4uLnNldHRpbmdzfTtcbiAgICAgICAgaWYgKCFzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiB8fCBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiA9PT0gJycpIHtcbiAgICAgICAgICAgIGRhdGFJbi5QQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiA9ICctMSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIGluY29taW5nIGFubm91bmNlbWVudCBzZWxlY3RvciB3aXRoIGRhdGEgKGZvbGxvd2luZyBJVlIgcGF0dGVybilcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4nLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhSW5cbiAgICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBlbXB0eSB2YWx1ZXMgdG8gLTEgZm9yIHRoZSBkcm9wZG93blxuICAgICAgICBjb25zdCBkYXRhT3V0ID0gey4uLnNldHRpbmdzfTtcbiAgICAgICAgaWYgKCFzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQgfHwgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0ID09PSAnJykge1xuICAgICAgICAgICAgZGF0YU91dC5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQgPSAnLTEnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvdXRnb2luZyBhbm5vdW5jZW1lbnQgc2VsZWN0b3Igd2l0aCBkYXRhIChmb2xsb3dpbmcgSVZSIHBhdHRlcm4pXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ1BCWFJlY29yZEFubm91bmNlbWVudE91dCcsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFPdXRcbiAgICAgICAgICAgIC8vIOKdjCBOTyBvbkNoYW5nZSBuZWVkZWQgLSBjb21wbGV0ZSBhdXRvbWF0aW9uIGJ5IGJhc2UgY2xhc3NcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGFuZCB1cGRhdGUgY29kZWMgdGFibGVzIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvZGVjcyAtIEFycmF5IG9mIGNvZGVjIGNvbmZpZ3VyYXRpb25zXG4gICAgICovXG4gICAgdXBkYXRlQ29kZWNUYWJsZXMoY29kZWNzKSB7XG4gICAgICAgIC8vIFJlc2V0IGNvZGVjIGNoYW5nZSBmbGFnIHdoZW4gbG9hZGluZyBkYXRhXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkID0gZmFsc2U7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgY29kZWMgc3RhdGUgZm9yIGNvbXBhcmlzb25cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gU2VwYXJhdGUgYXVkaW8gYW5kIHZpZGVvIGNvZGVjc1xuICAgICAgICBjb25zdCBhdWRpb0NvZGVjcyA9IGNvZGVjcy5maWx0ZXIoYyA9PiBjLnR5cGUgPT09ICdhdWRpbycpLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgY29uc3QgdmlkZW9Db2RlY3MgPSBjb2RlY3MuZmlsdGVyKGMgPT4gYy50eXBlID09PSAndmlkZW8nKS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBhdWRpbyBjb2RlY3MgdGFibGVcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmJ1aWxkQ29kZWNUYWJsZShhdWRpb0NvZGVjcywgJ2F1ZGlvJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCB2aWRlbyBjb2RlY3MgdGFibGVcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmJ1aWxkQ29kZWNUYWJsZSh2aWRlb0NvZGVjcywgJ3ZpZGVvJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIGxvYWRlcnMgYW5kIHNob3cgdGFibGVzXG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtbG9hZGVyLCAjdmlkZW8tY29kZWNzLWxvYWRlcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSwgI3ZpZGVvLWNvZGVjcy10YWJsZScpLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZHJhZyBhbmQgZHJvcCBmb3IgcmVvcmRlcmluZ1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGNvZGVjIHRhYmxlIHJvd3MgZnJvbSBkYXRhXG4gICAgICogQHBhcmFtIHtBcnJheX0gY29kZWNzIC0gQXJyYXkgb2YgY29kZWMgb2JqZWN0c1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gJ2F1ZGlvJyBvciAndmlkZW8nXG4gICAgICovXG4gICAgYnVpbGRDb2RlY1RhYmxlKGNvZGVjcywgdHlwZSkge1xuICAgICAgICBjb25zdCAkdGFibGVCb2R5ID0gJChgIyR7dHlwZX0tY29kZWNzLXRhYmxlIHRib2R5YCk7XG4gICAgICAgICR0YWJsZUJvZHkuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIGNvZGVjcy5mb3JFYWNoKChjb2RlYywgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHN0YXRlIGZvciBjaGFuZ2UgZGV0ZWN0aW9uXG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkub3JpZ2luYWxDb2RlY1N0YXRlW2NvZGVjLm5hbWVdID0ge1xuICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCxcbiAgICAgICAgICAgICAgICBkaXNhYmxlZDogY29kZWMuZGlzYWJsZWRcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWJsZSByb3dcbiAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSBjb2RlYy5kaXNhYmxlZCA9PT0gdHJ1ZSB8fCBjb2RlYy5kaXNhYmxlZCA9PT0gJzEnIHx8IGNvZGVjLmRpc2FibGVkID09PSAxO1xuICAgICAgICAgICAgY29uc3QgY2hlY2tlZCA9ICFpc0Rpc2FibGVkID8gJ2NoZWNrZWQnIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHJvd0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwiY29kZWMtcm93XCIgaWQ9XCJjb2RlYy0ke2NvZGVjLm5hbWV9XCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke2luZGV4fVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNvZGVjLW5hbWU9XCIke2NvZGVjLm5hbWV9XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1vcmlnaW5hbC1wcmlvcml0eT1cIiR7aW5kZXh9XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cImNvbGxhcHNpbmcgZHJhZ0hhbmRsZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzb3J0IGdyZXkgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBjb2RlY3NcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJjb2RlY18ke2NvZGVjLm5hbWV9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Y2hlY2tlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFiaW5kZXg9XCIwXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwiaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj1cImNvZGVjXyR7Y29kZWMubmFtZX1cIj4ke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGNvZGVjLmRlc2NyaXB0aW9uIHx8IGNvZGVjLm5hbWUpfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHRhYmxlQm9keS5hcHBlbmQocm93SHRtbCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIGZvciB0aGUgbmV3IHJvd3NcbiAgICAgICAgJHRhYmxlQm9keS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gTWFyayBjb2RlY3MgYXMgY2hhbmdlZCBhbmQgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNvZGVjc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJhZyBhbmQgZHJvcCBmb3IgY29kZWMgdGFibGVzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKSB7XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUsICN2aWRlby1jb2RlY3MtdGFibGUnKS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyYWdDbGFzczogJ2hvdmVyaW5nUm93JyxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZScsXG4gICAgICAgICAgICBvbkRyb3A6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgY29kZWNzIGFzIGNoYW5nZWQgYW5kIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNlcnRpZmljYXRlIGZpZWxkIGRpc3BsYXkgb25seVxuICAgICAqL1xuICAgIGluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCkge1xuICAgICAgICAvLyBIYW5kbGUgV0VCSFRUUFNQdWJsaWNLZXkgZmllbGQgb25seVxuICAgICAgICBjb25zdCAkY2VydFB1YktleUZpZWxkID0gJCgnI1dFQkhUVFBTUHVibGljS2V5Jyk7XG4gICAgICAgIGlmICgkY2VydFB1YktleUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFZhbHVlID0gJGNlcnRQdWJLZXlGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkY2VydFB1YktleUZpZWxkLnBhcmVudCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgY2VydGlmaWNhdGUgaW5mbyBpZiBhdmFpbGFibGUgZnJvbSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICAgICAgY29uc3QgY2VydEluZm8gPSAkY2VydFB1YktleUZpZWxkLmRhdGEoJ2NlcnQtaW5mbycpIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIGRpc3BsYXkgZWxlbWVudHMgZm9yIHRoaXMgZmllbGQgb25seVxuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5LCAuY2VydC1lZGl0LWZvcm0nKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGZ1bGxWYWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBtZWFuaW5nZnVsIGRpc3BsYXkgdGV4dCBmcm9tIGNlcnRpZmljYXRlIGluZm9cbiAgICAgICAgICAgICAgICBsZXQgZGlzcGxheVRleHQgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8gJiYgIWNlcnRJbmZvLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gW107XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgc3ViamVjdC9kb21haW5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLnN1YmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYPCfk5wgJHtjZXJ0SW5mby5zdWJqZWN0fWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgaXNzdWVyIGlmIG5vdCBzZWxmLXNpZ25lZFxuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNzdWVyICYmICFjZXJ0SW5mby5pc19zZWxmX3NpZ25lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChgYnkgJHtjZXJ0SW5mby5pc3N1ZXJ9YCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goJyhTZWxmLXNpZ25lZCknKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHZhbGlkaXR5IGRhdGVzXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby52YWxpZF90bykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDinYwgRXhwaXJlZCAke2NlcnRJbmZvLnZhbGlkX3RvfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKaoO+4jyBFeHBpcmVzIGluICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXNgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4pyFIFZhbGlkIHVudGlsICR7Y2VydEluZm8udmFsaWRfdG99YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlUZXh0ID0gcGFydHMuam9pbignIHwgJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdHJ1bmNhdGVkIGNlcnRpZmljYXRlXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlUZXh0ID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnRydW5jYXRlQ2VydGlmaWNhdGUoZnVsbFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgb3JpZ2luYWwgZmllbGRcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgc3RhdHVzIGNvbG9yIGNsYXNzIGJhc2VkIG9uIGNlcnRpZmljYXRlIHN0YXR1c1xuICAgICAgICAgICAgICAgIGxldCBzdGF0dXNDbGFzcyA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5IDw9IDMwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwbGF5SHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGlvbiBpbnB1dCBmbHVpZCBjZXJ0LWRpc3BsYXkgJHtzdGF0dXNDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChkaXNwbGF5VGV4dCl9XCIgcmVhZG9ubHkgY2xhc3M9XCJ0cnVuY2F0ZWQtZGlzcGxheVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgY29weS1idG5cIiBkYXRhLWNsaXBib2FyZC10ZXh0PVwiJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChmdWxsVmFsdWUpfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFyaWF0aW9uPVwiYmFzaWNcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weUNlcnR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjb3B5IGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGluZm8tY2VydC1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ2VydEluZm99XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBlZGl0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZWRpdCBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBkZWxldGUtY2VydC1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwidHJhc2ggaWNvbiByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICR7Y2VydEluZm8gJiYgIWNlcnRJbmZvLmVycm9yID8gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnJlbmRlckNlcnRpZmljYXRlRGV0YWlscyhjZXJ0SW5mbykgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGZvcm0gY2VydC1lZGl0LWZvcm1cIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBpZD1cIldFQkhUVFBTUHVibGljS2V5X2VkaXRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93cz1cIjEwXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQdWJsaWNDZXJ0fVwiPiR7ZnVsbFZhbHVlfTwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtaW5pIGJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgcG9zaXRpdmUgYnV0dG9uIHNhdmUtY2VydC1idG5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5idF9TYXZlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gY2FuY2VsLWNlcnQtYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2xvc2UgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuYnRfQ2FuY2VsfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBpbmZvIGJ1dHRvbiAtIHRvZ2dsZSBkZXRhaWxzIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5pbmZvLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRkZXRhaWxzID0gJGNvbnRhaW5lci5maW5kKCcuY2VydC1kZXRhaWxzJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkZGV0YWlscy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRkZXRhaWxzLnNsaWRlVG9nZ2xlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZWRpdCBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5lZGl0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWRpc3BsYXknKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZWRpdC1mb3JtJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJyNXRUJIVFRQU1B1YmxpY0tleV9lZGl0JykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5zYXZlLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQdWJsaWNLZXlfZWRpdCcpLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBvcmlnaW5hbCBoaWRkZW4gZmllbGRcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC52YWwobmV3VmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgb25seSB0aGUgY2VydGlmaWNhdGUgZmllbGQgZGlzcGxheSB3aXRoIG5ldyB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgY2FuY2VsIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNhbmNlbC1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWVkaXQtZm9ybScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5Jykuc2hvdygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZGVsZXRlLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgY2VydGlmaWNhdGVcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgb25seSB0aGUgY2VydGlmaWNhdGUgZmllbGQgdG8gc2hvdyBlbXB0eSBmaWVsZFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIG5ldyBidXR0b25zXG4gICAgICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBmb3IgaW5wdXQgd2l0aCBwcm9wZXIgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHVibGljQ2VydCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdyb3dzJywgJzEwJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNoYW5nZSBldmVudHMgdHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLm9mZignaW5wdXQuY2VydCBjaGFuZ2UuY2VydCBrZXl1cC5jZXJ0Jykub24oJ2lucHV0LmNlcnQgY2hhbmdlLmNlcnQga2V5dXAuY2VydCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyBkaXNwbGF5IGZvciBTU0gga2V5cyBhbmQgY2VydGlmaWNhdGVzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpIHtcbiAgICAgICAgLy8gSGFuZGxlIFNTSF9JRF9SU0FfUFVCIGZpZWxkXG4gICAgICAgIGNvbnN0ICRzc2hQdWJLZXlGaWVsZCA9ICQoJyNTU0hfSURfUlNBX1BVQicpO1xuICAgICAgICBpZiAoJHNzaFB1YktleUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFZhbHVlID0gJHNzaFB1YktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRzc2hQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5zc2gta2V5LWRpc3BsYXksIC5mdWxsLWRpc3BsYXknKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBjcmVhdGUgZGlzcGxheSBpZiB0aGVyZSdzIGEgdmFsdWVcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdHJ1bmNhdGVkIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudHJ1bmNhdGVTU0hLZXkoZnVsbFZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBvcmlnaW5hbCBmaWVsZFxuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgc3NoLWtleS1kaXNwbGF5XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7dHJ1bmNhdGVkfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJiYXNpY1wiIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5S2V5fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29weSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBleHBhbmQtYnRuXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFeHBhbmR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleHBhbmQgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgY2xhc3M9XCJmdWxsLWRpc3BsYXlcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIiByZWFkb25seT4ke2Z1bGxWYWx1ZX08L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgZXhwYW5kL2NvbGxhcHNlXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5leHBhbmQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZnVsbERpc3BsYXkgPSAkY29udGFpbmVyLmZpbmQoJy5mdWxsLWRpc3BsYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkdHJ1bmNhdGVkRGlzcGxheSA9ICRjb250YWluZXIuZmluZCgnLnNzaC1rZXktZGlzcGxheScpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJCh0aGlzKS5maW5kKCdpJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRmdWxsRGlzcGxheS5pcygnOnZpc2libGUnKSkge1xuICAgICAgICAgICAgICAgICAgICAkZnVsbERpc3BsYXkuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkdHJ1bmNhdGVkRGlzcGxheS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdjb21wcmVzcycpLmFkZENsYXNzKCdleHBhbmQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZnVsbERpc3BsYXkuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkdHJ1bmNhdGVkRGlzcGxheS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleHBhbmQnKS5hZGRDbGFzcygnY29tcHJlc3MnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgbmV3IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJ1tkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgYXMgcmVhZC1vbmx5ICh0aGlzIGlzIGEgc3lzdGVtLWdlbmVyYXRlZCBrZXkpXG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUuZ3NfTm9TU0hQdWJsaWNLZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgV0VCSFRUUFNQdWJsaWNLZXkgZmllbGQgLSB1c2UgZGVkaWNhdGVkIG1ldGhvZFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBXRUJIVFRQU1ByaXZhdGVLZXkgZmllbGQgKHdyaXRlLW9ubHkgd2l0aCBwYXNzd29yZCBtYXNraW5nKVxuICAgICAgICBjb25zdCAkY2VydFByaXZLZXlGaWVsZCA9ICQoJyNXRUJIVFRQU1ByaXZhdGVLZXknKTtcbiAgICAgICAgaWYgKCRjZXJ0UHJpdktleUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRjZXJ0UHJpdktleUZpZWxkLnBhcmVudCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIGRpc3BsYXkgZWxlbWVudHNcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnByaXZhdGUta2V5LXNldCwgI1dFQkhUVFBTUHJpdmF0ZUtleV9uZXcnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcHJpdmF0ZSBrZXkgZXhpc3RzIChwYXNzd29yZCBtYXNraW5nIGxvZ2ljKVxuICAgICAgICAgICAgLy8gVGhlIGZpZWxkIHdpbGwgY29udGFpbiAneHh4eHh4eCcgaWYgYSBwcml2YXRlIGtleSBpcyBzZXRcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRjZXJ0UHJpdktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgaGFzVmFsdWUgPSBjdXJyZW50VmFsdWUgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGhhc1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSBvcmlnaW5hbCBmaWVsZCBhbmQgc2hvdyBzdGF0dXMgbWVzc2FnZVxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwbGF5SHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZSBwcml2YXRlLWtleS1zZXRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwibG9jayBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmdzX1ByaXZhdGVLZXlJc1NldH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzPVwicmVwbGFjZS1rZXktbGlua1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1JlcGxhY2V9PC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGlkPVwiV0VCSFRUUFNQcml2YXRlS2V5X25ld1wiIG5hbWU9XCJXRUJIVFRQU1ByaXZhdGVLZXlcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M9XCIxMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQcml2YXRlS2V5fVwiPjwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHJlcGxhY2UgbGlua1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnJlcGxhY2Uta2V5LWxpbmsnKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucHJpdmF0ZS1rZXktc2V0JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkbmV3RmllbGQgPSAkY29udGFpbmVyLmZpbmQoJyNXRUJIVFRQU1ByaXZhdGVLZXlfbmV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICRuZXdGaWVsZC5zaG93KCkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBoaWRkZW4gcGFzc3dvcmQgdmFsdWUgc28gd2UgY2FuIHNldCBhIG5ldyBvbmVcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEJpbmQgY2hhbmdlIGV2ZW50IHRvIHVwZGF0ZSBoaWRkZW4gZmllbGQgYW5kIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAkbmV3RmllbGQub24oJ2lucHV0IGNoYW5nZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBvcmlnaW5hbCBoaWRkZW4gZmllbGQgd2l0aCBuZXcgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnZhbCgkbmV3RmllbGQudmFsKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gdmFsaWRhdGlvbiBjaGVja1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHJpdmF0ZUtleSk7XG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuYXR0cigncm93cycsICcxMCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjaGFuZ2UgZXZlbnRzIHRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQub2ZmKCdpbnB1dC5wcml2IGNoYW5nZS5wcml2IGtleXVwLnByaXYnKS5vbignaW5wdXQucHJpdiBjaGFuZ2UucHJpdiBrZXl1cC5wcml2JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2xpcGJvYXJkIGZ1bmN0aW9uYWxpdHkgZm9yIGNvcHkgYnV0dG9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDbGlwYm9hcmQoKSB7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNvcHktYnRuJyk7XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCAkYnRuID0gJChlLnRyaWdnZXIpO1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxJY29uID0gJGJ0bi5maW5kKCdpJykuYXR0cignY2xhc3MnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJGJ0bi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoKS5hZGRDbGFzcygnY2hlY2sgaWNvbicpO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGJ0bi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoKS5hZGRDbGFzcyhvcmlnaW5hbEljb24pO1xuICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFyIHNlbGVjdGlvblxuICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQub24oJ2Vycm9yJywgKCkgPT4ge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5nc19Db3B5RmFpbGVkKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUcnVuY2F0ZSBTU0gga2V5IGZvciBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSAtIEZ1bGwgU1NIIGtleVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVHJ1bmNhdGVkIGtleVxuICAgICAqL1xuICAgIHRydW5jYXRlU1NIS2V5KGtleSkge1xuICAgICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoIDwgNTApIHtcbiAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KCcgJyk7XG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPj0gMikge1xuICAgICAgICAgICAgY29uc3Qga2V5VHlwZSA9IHBhcnRzWzBdO1xuICAgICAgICAgICAgY29uc3Qga2V5RGF0YSA9IHBhcnRzWzFdO1xuICAgICAgICAgICAgY29uc3QgY29tbWVudCA9IHBhcnRzLnNsaWNlKDIpLmpvaW4oJyAnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleURhdGEubGVuZ3RoID4gNDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSBrZXlEYXRhLnN1YnN0cmluZygwLCAyMCkgKyAnLi4uJyArIGtleURhdGEuc3Vic3RyaW5nKGtleURhdGEubGVuZ3RoIC0gMTUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBgJHtrZXlUeXBlfSAke3RydW5jYXRlZH0gJHtjb21tZW50fWAudHJpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ga2V5O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVHJ1bmNhdGUgY2VydGlmaWNhdGUgZm9yIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2VydCAtIEZ1bGwgY2VydGlmaWNhdGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRydW5jYXRlZCBjZXJ0aWZpY2F0ZSBpbiBzaW5nbGUgbGluZSBmb3JtYXRcbiAgICAgKi9cbiAgICB0cnVuY2F0ZUNlcnRpZmljYXRlKGNlcnQpIHtcbiAgICAgICAgaWYgKCFjZXJ0IHx8IGNlcnQubGVuZ3RoIDwgMTAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2VydDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbGluZXMgPSBjZXJ0LnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRyYWN0IGZpcnN0IGFuZCBsYXN0IG1lYW5pbmdmdWwgbGluZXNcbiAgICAgICAgY29uc3QgZmlyc3RMaW5lID0gbGluZXNbMF0gfHwgJyc7XG4gICAgICAgIGNvbnN0IGxhc3RMaW5lID0gbGluZXNbbGluZXMubGVuZ3RoIC0gMV0gfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgY2VydGlmaWNhdGVzLCBzaG93IGJlZ2luIGFuZCBlbmQgbWFya2Vyc1xuICAgICAgICBpZiAoZmlyc3RMaW5lLmluY2x1ZGVzKCdCRUdJTiBDRVJUSUZJQ0FURScpKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7Zmlyc3RMaW5lfS4uLiR7bGFzdExpbmV9YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIG90aGVyIGZvcm1hdHMsIHRydW5jYXRlIHRoZSBjb250ZW50XG4gICAgICAgIGNvbnN0IGNsZWFuQ2VydCA9IGNlcnQucmVwbGFjZSgvXFxuL2csICcgJykudHJpbSgpO1xuICAgICAgICBpZiAoY2xlYW5DZXJ0Lmxlbmd0aCA+IDgwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2xlYW5DZXJ0LnN1YnN0cmluZygwLCA0MCkgKyAnLi4uJyArIGNsZWFuQ2VydC5zdWJzdHJpbmcoY2xlYW5DZXJ0Lmxlbmd0aCAtIDMwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNsZWFuQ2VydDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIGZvciBzYWZlIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gZXNjYXBlXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgbWFwID0ge1xuICAgICAgICAgICAgJyYnOiAnJmFtcDsnLFxuICAgICAgICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAgICAgICAnPic6ICcmZ3Q7JyxcbiAgICAgICAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgICAgICAgXCInXCI6ICcmIzAzOTsnXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoL1smPD5cIiddL2csIG0gPT4gbWFwW21dKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnQgYWNjb3JkaW5nIHRvIHRoZSB2YWx1ZSBvZiB1c2UgU1NIIHBhc3N3b3JkIGNoZWNrYm94LlxuICAgICAqL1xuICAgIHNob3dIaWRlU1NIUGFzc3dvcmQoKXtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmRTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmRTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIFByZXBhcmVzIGRhdGEgZm9yIFJFU1QgQVBJIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXG4gICAgICAgIC8vIEhhbmRsZSBwcml2YXRlIGtleSBmaWVsZFxuICAgICAgICBpZiAocmVzdWx0LmRhdGEuV0VCSFRUUFNQcml2YXRlS2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHByaXZhdGVLZXlWYWx1ZSA9IHJlc3VsdC5kYXRhLldFQkhUVFBTUHJpdmF0ZUtleTtcbiAgICAgICAgICAgIC8vIE9ubHkgc2tpcCBzZW5kaW5nIGlmIHRoZSB2YWx1ZSBlcXVhbHMgaGlkZGVuIHBhc3N3b3JkICh1bmNoYW5nZWQpXG4gICAgICAgICAgICAvLyBTZW5kIGVtcHR5IHN0cmluZyB0byBjbGVhciB0aGUgcHJpdmF0ZSBrZXkgb24gc2VydmVyXG4gICAgICAgICAgICBpZiAocHJpdmF0ZUtleVZhbHVlID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEuV0VCSFRUUFNQcml2YXRlS2V5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRW1wdHkgc3RyaW5nICcnIHdpbGwgYmUgc2VudCB0byBjbGVhciB0aGUgY2VydGlmaWNhdGVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZvciBwdWJsaWMga2V5IC0gc2VuZCBlbXB0eSB2YWx1ZXMgdG8gYWxsb3cgY2xlYXJpbmdcbiAgICAgICAgLy8gRG8gbm90IGRlbGV0ZSBlbXB0eSBzdHJpbmdzIC0gdGhleSBtZWFuIHVzZXIgd2FudHMgdG8gY2xlYXIgdGhlIGNlcnRpZmljYXRlXG5cbiAgICAgICAgLy8gQ2xlYW4gdXAgdW5uZWNlc3NhcnkgZmllbGRzIGJlZm9yZSBzZW5kaW5nXG4gICAgICAgIGNvbnN0IGZpZWxkc1RvUmVtb3ZlID0gW1xuICAgICAgICAgICAgJ2RpcnJ0eScsXG4gICAgICAgICAgICAnZGVsZXRlQWxsSW5wdXQnLFxuICAgICAgICBdO1xuXG4gICAgICAgIC8vIFJlbW92ZSBjb2RlY18qIGZpZWxkcyAodGhleSdyZSByZXBsYWNlZCB3aXRoIHRoZSBjb2RlY3MgYXJyYXkpXG4gICAgICAgIE9iamVjdC5rZXlzKHJlc3VsdC5kYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2NvZGVjXycpIHx8IGZpZWxkc1RvUmVtb3ZlLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB3ZSBzaG91bGQgcHJvY2VzcyBjb2RlY3NcbiAgICAgICAgLy8gV2hlbiBzZW5kT25seUNoYW5nZWQgaXMgZW5hYmxlZCwgb25seSBwcm9jZXNzIGNvZGVjcyBpZiB0aGV5IHdlcmUgYWN0dWFsbHkgY2hhbmdlZFxuICAgICAgICBjb25zdCBzaG91bGRQcm9jZXNzQ29kZWNzID0gIUZvcm0uc2VuZE9ubHlDaGFuZ2VkIHx8IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkO1xuXG4gICAgICAgIGlmIChzaG91bGRQcm9jZXNzQ29kZWNzKSB7XG4gICAgICAgICAgICAvLyBDb2xsZWN0IGFsbCBjb2RlYyBkYXRhIHdoZW4gdGhleSd2ZSBiZWVuIGNoYW5nZWRcbiAgICAgICAgICAgIGNvbnN0IGFyckNvZGVjcyA9IFtdO1xuXG4gICAgICAgICAgICAvLyBQcm9jZXNzIGFsbCBjb2RlYyByb3dzXG4gICAgICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlIC5jb2RlYy1yb3csICN2aWRlby1jb2RlY3MtdGFibGUgLmNvZGVjLXJvdycpLmVhY2goKGN1cnJlbnRJbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29kZWNOYW1lID0gJChvYmopLmF0dHIoJ2RhdGEtY29kZWMtbmFtZScpO1xuICAgICAgICAgICAgICAgIGlmIChjb2RlY05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudERpc2FibGVkID0gJChvYmopLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyB1bmNoZWNrZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICBhcnJDb2RlY3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjb2RlY05hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogY3VycmVudERpc2FibGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IGN1cnJlbnRJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluY2x1ZGUgY29kZWNzIGlmIHRoZXkgd2VyZSBjaGFuZ2VkIG9yIHNlbmRPbmx5Q2hhbmdlZCBpcyBmYWxzZVxuICAgICAgICAgICAgaWYgKGFyckNvZGVjcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29kZWNzID0gYXJyQ29kZWNzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBIYW5kbGVzIFJFU1QgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAkKFwiI2Vycm9yLW1lc3NhZ2VzXCIpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlOiB7IHJlc3VsdDogYm9vbCwgZGF0YToge30sIG1lc3NhZ2VzOiB7fSB9XG4gICAgICAgIGlmICghcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYXNzd29yZCBmaWVsZHMgdG8gaGlkZGVuIHZhbHVlIG9uIHN1Y2Nlc3NcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHBhc3N3b3JkIHZhbGlkYXRpb24gd2FybmluZ3MgYWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlXG4gICAgICAgICAgICAkKCcucGFzc3dvcmQtdmFsaWRhdGUnKS5mYWRlT3V0KDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBkZWxldGUgYWxsIGNvbmRpdGlvbnMgaWYgbmVlZGVkXG4gICAgICAgIGlmICh0eXBlb2YgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNoZWNrRGVsZXRlQ29uZGl0aW9ucygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGVycm9yIG1lc3NhZ2UgSFRNTCBmcm9tIFJFU1QgQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlIHdpdGggZXJyb3IgbWVzc2FnZXNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBjb25zdCAkZGl2ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndWkgbmVnYXRpdmUgbWVzc2FnZScsIGlkOiAnZXJyb3ItbWVzc2FnZXMnIH0pO1xuICAgICAgICAgICAgY29uc3QgJGhlYWRlciA9ICQoJzxkaXY+JywgeyBjbGFzczogJ2hlYWRlcicgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuZ3NfRXJyb3JTYXZlU2V0dGluZ3MpO1xuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJGhlYWRlcik7XG4gICAgICAgICAgICBjb25zdCAkdWwgPSAkKCc8dWw+JywgeyBjbGFzczogJ2xpc3QnIH0pO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZXNTZXQgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIGVycm9yIGFuZCB2YWxpZGF0aW9uIG1lc3NhZ2UgdHlwZXNcbiAgICAgICAgICAgIFsnZXJyb3InLCAndmFsaWRhdGlvbiddLmZvckVhY2gobXNnVHlwZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzID0gQXJyYXkuaXNBcnJheShyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSkgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdIFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBbcmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV1dO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXMuZm9yRWFjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGV4dENvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmIGVycm9yLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGdsb2JhbFRyYW5zbGF0ZVtlcnJvci5tZXNzYWdlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3JdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1lc3NhZ2VzU2V0Lmhhcyh0ZXh0Q29udGVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlc1NldC5hZGQodGV4dENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR1bC5hcHBlbmQoJCgnPGxpPicpLnRleHQodGV4dENvbnRlbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCR1bCk7XG4gICAgICAgICAgICAkKCcjc3VibWl0YnV0dG9uJykuYmVmb3JlKCRkaXYpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHZhbGlkYXRpb24gcnVsZXMgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBpbml0UnVsZXMoKSB7XG4gICAgICAgIC8vIFNTSFBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M7XG4gICAgICAgIH0gZWxzZSBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZWJBZG1pblBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5XZWJBZG1pblBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LndlYkFkbWluUGFzc3dvcmRSdWxlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgY2VydGlmaWNhdGUgZGV0YWlscyBIVE1MXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNlcnRJbmZvIC0gQ2VydGlmaWNhdGUgaW5mb3JtYXRpb24gb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgY2VydGlmaWNhdGUgZGV0YWlsc1xuICAgICAqL1xuICAgIHJlbmRlckNlcnRpZmljYXRlRGV0YWlscyhjZXJ0SW5mbykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwiY2VydC1kZXRhaWxzXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7IG1hcmdpbi10b3A6MTBweDtcIj4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGxpc3RcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gU3ViamVjdFxuICAgICAgICBpZiAoY2VydEluZm8uc3ViamVjdCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPlN1YmplY3Q6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uc3ViamVjdCl9PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSXNzdWVyXG4gICAgICAgIGlmIChjZXJ0SW5mby5pc3N1ZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5Jc3N1ZXI6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uaXNzdWVyKX1gO1xuICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnIDxzcGFuIGNsYXNzPVwidWkgdGlueSBsYWJlbFwiPlNlbGYtc2lnbmVkPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGl0eSBwZXJpb2RcbiAgICAgICAgaWYgKGNlcnRJbmZvLnZhbGlkX2Zyb20gJiYgY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5WYWxpZDo8L3N0cm9uZz4gJHtjZXJ0SW5mby52YWxpZF9mcm9tfSB0byAke2NlcnRJbmZvLnZhbGlkX3RvfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV4cGlyeSBzdGF0dXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IHJlZCBsYWJlbFwiPkNlcnRpZmljYXRlIEV4cGlyZWQ8L3NwYW4+PC9kaXY+JztcbiAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgeWVsbG93IGxhYmVsXCI+RXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSBncmVlbiBsYWJlbFwiPlZhbGlkIGZvciAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN1YmplY3QgQWx0ZXJuYXRpdmUgTmFtZXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLnNhbiAmJiBjZXJ0SW5mby5zYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPkFsdGVybmF0aXZlIE5hbWVzOjwvc3Ryb25nPic7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBsaXN0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDoxMHB4O1wiPic7XG4gICAgICAgICAgICBjZXJ0SW5mby5zYW4uZm9yRWFjaChzYW4gPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChzYW4pfTwvZGl2PmA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIGxpc3RcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2Ugc2VnbWVudFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBjZXJ0LWRldGFpbHNcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBBTUkvQUpBTSBkZXBlbmRlbmN5XG4gICAgICogQUpBTSByZXF1aXJlcyBBTUkgdG8gYmUgZW5hYmxlZCBzaW5jZSBpdCdzIGFuIEhUVFAgd3JhcHBlciBvdmVyIEFNSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSgpIHtcbiAgICAgICAgY29uc3QgJGFtaUNoZWNrYm94ID0gJCgnI0FNSUVuYWJsZWQnKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBjb25zdCAkYWphbUNoZWNrYm94ID0gJCgnI0FKQU1FbmFibGVkJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYW1pQ2hlY2tib3gubGVuZ3RoID09PSAwIHx8ICRhamFtQ2hlY2tib3gubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZ1bmN0aW9uIHRvIHVwZGF0ZSBBSkFNIHN0YXRlIGJhc2VkIG9uIEFNSSBzdGF0ZVxuICAgICAgICBjb25zdCB1cGRhdGVBSkFNU3RhdGUgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc0FNSUVuYWJsZWQgPSAkYW1pQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFpc0FNSUVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBBTUkgaXMgZGlzYWJsZWQsIGRpc2FibGUgQUpBTSBhbmQgbWFrZSBpdCByZWFkLW9ubHlcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgdG9vbHRpcCB0byBleHBsYWluIHdoeSBpdCdzIGRpc2FibGVkXG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTVJlcXVpcmVzQU1JKTtcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmF0dHIoJ2RhdGEtcG9zaXRpb24nLCAndG9wIGxlZnQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgQU1JIGlzIGVuYWJsZWQsIGFsbG93IEFKQU0gdG8gYmUgdG9nZ2xlZFxuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3gucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5yZW1vdmVBdHRyKCdkYXRhLXRvb2x0aXAnKTtcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LnJlbW92ZUF0dHIoJ2RhdGEtcG9zaXRpb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWwgc3RhdGVcbiAgICAgICAgdXBkYXRlQUpBTVN0YXRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMaXN0ZW4gZm9yIEFNSSBjaGVja2JveCBjaGFuZ2VzIHVzaW5nIGV2ZW50IGRlbGVnYXRpb25cbiAgICAgICAgLy8gVGhpcyB3b24ndCBvdmVycmlkZSBleGlzdGluZyBoYW5kbGVyc1xuICAgICAgICAkKCcjQU1JRW5hYmxlZCcpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHVwZGF0ZUFKQU1TdGF0ZSgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFBCWExhbmd1YWdlIGNoYW5nZSBkZXRlY3Rpb24gZm9yIHJlc3RhcnQgd2FybmluZ1xuICAgICAqIFNob3dzIHJlc3RhcnQgd2FybmluZyBvbmx5IHdoZW4gdGhlIGxhbmd1YWdlIHZhbHVlIGNoYW5nZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nKCkge1xuICAgICAgICBjb25zdCAkbGFuZ3VhZ2VJbnB1dCA9ICQoJyNQQlhMYW5ndWFnZScpOyAgLy8gSGlkZGVuIGlucHV0XG4gICAgICAgIGNvbnN0ICRsYW5ndWFnZURyb3Bkb3duID0gJCgnI1BCWExhbmd1YWdlLWRyb3Bkb3duJyk7ICAvLyBWNS4wIHBhdHRlcm4gZHJvcGRvd25cbiAgICAgICAgY29uc3QgJHJlc3RhcnRXYXJuaW5nID0gJCgnI3Jlc3RhcnQtd2FybmluZy1QQlhMYW5ndWFnZScpO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHZhbHVlIGFuZCBkYXRhIGxvYWRlZCBmbGFnXG4gICAgICAgIGxldCBvcmlnaW5hbFZhbHVlID0gbnVsbDtcbiAgICAgICAgbGV0IGlzRGF0YUxvYWRlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIEhpZGUgd2FybmluZyBpbml0aWFsbHlcbiAgICAgICAgJHJlc3RhcnRXYXJuaW5nLmhpZGUoKTtcblxuICAgICAgICAvLyBTZXQgb3JpZ2luYWwgdmFsdWUgYWZ0ZXIgZGF0YSBsb2Fkc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignR2VuZXJhbFNldHRpbmdzLmRhdGFMb2FkZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBvcmlnaW5hbFZhbHVlID0gJGxhbmd1YWdlSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBpc0RhdGFMb2FkZWQgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZHJvcGRvd24gY2hhbmdlIGV2ZW50IC0gdXNlIFY1LjAgZHJvcGRvd24gc2VsZWN0b3JcbiAgICAgICAgJGxhbmd1YWdlRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNlbWFudGljVUlEcm9wZG93biBhdXRvbWF0aWNhbGx5IHN5bmNzIGhpZGRlbiBpbnB1dCB2YWx1ZVxuICAgICAgICAgICAgICAgIC8vIE5vIG5lZWQgdG8gbWFudWFsbHkgdXBkYXRlICRsYW5ndWFnZUlucHV0XG5cbiAgICAgICAgICAgICAgICAvLyBPbmx5IHNob3cgd2FybmluZyBhZnRlciBkYXRhIGlzIGxvYWRlZCBhbmQgdmFsdWUgY2hhbmdlZCBmcm9tIG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgaWYgKGlzRGF0YUxvYWRlZCAmJiBvcmlnaW5hbFZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSBvcmlnaW5hbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICRyZXN0YXJ0V2FybmluZy50cmFuc2l0aW9uKCdmYWRlIGluJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0RhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJlc3RhcnRXYXJuaW5nLnRyYW5zaXRpb24oJ2ZhZGUgb3V0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gb25seSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGlmIChpc0RhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIFJFU1QgQVBJIG1vZGVcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBHZW5lcmFsU2V0dGluZ3NBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlU2V0dGluZ3MnO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb24gZm9yIGNsZWFuZXIgQVBJIHJlcXVlc3RzXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIEVuYWJsZSBzZW5kaW5nIG9ubHkgY2hhbmdlZCBmaWVsZHMgZm9yIG9wdGltYWwgUEFUQ0ggc2VtYW50aWNzXG4gICAgICAgIEZvcm0uc2VuZE9ubHlDaGFuZ2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBObyByZWRpcmVjdCBhZnRlciBzYXZlIC0gc3RheSBvbiB0aGUgc2FtZSBwYWdlXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IG51bGw7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBudWxsO1xuICAgICAgICBGb3JtLnVybCA9IGAjYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZ2VuZXJhbFNldHRpbmdzIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=