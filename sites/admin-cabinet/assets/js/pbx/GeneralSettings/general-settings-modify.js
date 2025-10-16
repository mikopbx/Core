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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJjb2RlY3NDaGFuZ2VkIiwiZGF0YUxvYWRlZCIsInZhbGlkYXRlUnVsZXMiLCJwYnhuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lIiwiV2ViQWRtaW5QYXNzd29yZCIsIldlYkFkbWluUGFzc3dvcmRSZXBlYXQiLCJnc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50IiwiU1NIUGFzc3dvcmQiLCJTU0hQYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJXRUJQb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJXRUJIVFRQU1BvcnQiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0IiwiQUpBTVBvcnQiLCJnc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSIsIlNJUEF1dGhQcmVmaXgiLCJnc19TSVBBdXRoUHJlZml4SW52YWxpZCIsIndlYkFkbWluUGFzc3dvcmRSdWxlcyIsImdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkIiwidmFsdWUiLCJnc19QYXNzd29yZHMiLCJwc3dfUGFzc3dvcmROb0xvd1NpbXZvbCIsInBzd19QYXNzd29yZE5vTnVtYmVycyIsInBzd19QYXNzd29yZE5vVXBwZXJTaW12b2wiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3MiLCJnc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQiLCJnc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCIsImdzX1NTSFBhc3N3b3JkIiwiYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3MiLCJjbGlwYm9hcmQiLCJpbml0aWFsaXplIiwibGVuZ3RoIiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwiY29udGV4dCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwidmFsaWRhdGVPbklucHV0Iiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwiY2hlY2tPbkxvYWQiLCJzc2hXaWRnZXQiLCJvbiIsImlzRGlzYWJsZWQiLCJjaGVja2JveCIsImhpZGVXYXJuaW5ncyIsImVsZW1lbnRzIiwiJHNjb3JlU2VjdGlvbiIsImhpZGUiLCJjaGVja1Bhc3N3b3JkIiwidmFsIiwiaW5pdFJ1bGVzIiwiZmluZCIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmciLCJub3QiLCJkcm9wZG93biIsImluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcyIsImluaXRpYWxpemVDbGlwYm9hcmQiLCJzaG93SGlkZVNTSFBhc3N3b3JkIiwid2luZG93IiwiZXZlbnQiLCJuYW1lVGFiIiwiR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJsb2FkRGF0YSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMiLCJGb3JtIiwic2hvd0xvYWRpbmdTdGF0ZSIsIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsInBhc3N3b3JkVmFsaWRhdGlvbiIsInNldFRpbWVvdXQiLCJzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MiLCJtZXNzYWdlcyIsImNvbnNvbGUiLCJlcnJvciIsInNob3dBcGlFcnJvciIsInNldHRpbmdzIiwiY29kZWNzIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJwb3B1bGF0ZVNwZWNpYWxGaWVsZHMiLCJsb2FkU291bmRGaWxlVmFsdWVzIiwidXBkYXRlQ29kZWNUYWJsZXMiLCJpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNzaEtleXNUYWJsZSIsImRvY3VtZW50IiwidHJpZ2dlciIsIldFQkhUVFBTUHVibGljS2V5X2luZm8iLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsIiRjaGVja2JveCIsImlzQ2hlY2tlZCIsIiRkcm9wZG93biIsImhhc0NsYXNzIiwiZm9ybSIsImVycm9yTWVzc2FnZSIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInZhbGlkYXRpb24iLCJyZW1vdmUiLCJpc0RlZmF1bHRXZWJQYXNzd29yZCIsIiR3ZWJQYXNzd29yZEZpZWxkcyIsImNsb3Nlc3QiLCJ3YXJuaW5nSHRtbCIsInBzd19TZXRQYXNzd29yZCIsInBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmQiLCJiZWZvcmUiLCJpc0RlZmF1bHRTU0hQYXNzd29yZCIsInNzaFBhc3N3b3JkRGlzYWJsZWQiLCIkc3NoUGFzc3dvcmRGaWVsZHMiLCJkYXRhSW4iLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJkYXRhT3V0IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IiwiYXVkaW9Db2RlY3MiLCJmaWx0ZXIiLCJjIiwic29ydCIsImEiLCJiIiwicHJpb3JpdHkiLCJ2aWRlb0NvZGVjcyIsImJ1aWxkQ29kZWNUYWJsZSIsInNob3ciLCJpbml0aWFsaXplQ29kZWNEcmFnRHJvcCIsIiR0YWJsZUJvZHkiLCJlbXB0eSIsImNvZGVjIiwiaW5kZXgiLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGVja2VkIiwicm93SHRtbCIsImVzY2FwZUh0bWwiLCJkZXNjcmlwdGlvbiIsImFwcGVuZCIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkIiwiJGNlcnRQdWJLZXlGaWVsZCIsImZ1bGxWYWx1ZSIsIiRjb250YWluZXIiLCJjZXJ0SW5mbyIsImRpc3BsYXlUZXh0IiwicGFydHMiLCJzdWJqZWN0IiwicHVzaCIsImlzc3VlciIsImlzX3NlbGZfc2lnbmVkIiwidmFsaWRfdG8iLCJpc19leHBpcmVkIiwiZGF5c191bnRpbF9leHBpcnkiLCJ0cnVuY2F0ZUNlcnRpZmljYXRlIiwic3RhdHVzQ2xhc3MiLCJkaXNwbGF5SHRtbCIsImJ0X1Rvb2xUaXBDb3B5Q2VydCIsImJ0X1Rvb2xUaXBDZXJ0SW5mbyIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsInJlbmRlckNlcnRpZmljYXRlRGV0YWlscyIsImdzX1Bhc3RlUHVibGljQ2VydCIsImJ0X1NhdmUiLCJidF9DYW5jZWwiLCJlIiwicHJldmVudERlZmF1bHQiLCIkZGV0YWlscyIsInNsaWRlVG9nZ2xlIiwiZm9jdXMiLCJuZXdWYWx1ZSIsImNoZWNrVmFsdWVzIiwicG9wdXAiLCJkZXN0cm95IiwiYXR0ciIsIm9mZiIsIiRzc2hQdWJLZXlGaWVsZCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiYnRfVG9vbFRpcENvcHlLZXkiLCJidF9Ub29sVGlwRXhwYW5kIiwiJGZ1bGxEaXNwbGF5IiwiJHRydW5jYXRlZERpc3BsYXkiLCIkaWNvbiIsImlzIiwiYWRkQ2xhc3MiLCJnc19Ob1NTSFB1YmxpY0tleSIsIiRjZXJ0UHJpdktleUZpZWxkIiwiY3VycmVudFZhbHVlIiwiaGFzVmFsdWVJbkRiIiwiaGFzVmFsdWVJbkZpbGVzIiwiaGFzX3ByaXZhdGVfa2V5IiwiaXNTZWxmU2lnbmVkIiwicHVibGljS2V5VmFsdWUiLCJwdWJsaWNLZXlNb2RpZmllZCIsImdzX1Bhc3RlUHJpdmF0ZUtleSIsImdzX1ByaXZhdGVLZXlJc1NldCIsImdzX1JlcGxhY2UiLCIkbmV3RmllbGQiLCJnc19TeXN0ZW1NYW5hZ2VkUHJpdmF0ZUtleSIsIkNsaXBib2FyZEpTIiwiJGJ0biIsIm9yaWdpbmFsSWNvbiIsImNsZWFyU2VsZWN0aW9uIiwiZ3NfQ29weUZhaWxlZCIsInNwbGl0Iiwia2V5VHlwZSIsImtleURhdGEiLCJjb21tZW50Iiwic2xpY2UiLCJzdWJzdHJpbmciLCJ0cmltIiwiY2VydCIsImxpbmVzIiwibGluZSIsImZpcnN0TGluZSIsImxhc3RMaW5lIiwiaW5jbHVkZXMiLCJjbGVhbkNlcnQiLCJyZXBsYWNlIiwidGV4dCIsIm1hcCIsIm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwiV0VCSFRUUFNQcml2YXRlS2V5IiwidW5kZWZpbmVkIiwicHJpdmF0ZUtleVZhbHVlIiwiZmllbGRzVG9SZW1vdmUiLCJzdGFydHNXaXRoIiwic2hvdWxkUHJvY2Vzc0NvZGVjcyIsInNlbmRPbmx5Q2hhbmdlZCIsImFyckNvZGVjcyIsImVhY2giLCJjdXJyZW50SW5kZXgiLCJvYmoiLCJjb2RlY05hbWUiLCJjdXJyZW50RGlzYWJsZWQiLCJjYkFmdGVyU2VuZEZvcm0iLCIkc3VibWl0QnV0dG9uIiwiZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sIiwiZmFkZU91dCIsImdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCIsImNoZWNrRGVsZXRlQ29uZGl0aW9ucyIsIiRkaXYiLCJpZCIsIiRoZWFkZXIiLCJnc19FcnJvclNhdmVTZXR0aW5ncyIsIiR1bCIsIm1lc3NhZ2VzU2V0IiwiU2V0IiwibXNnVHlwZSIsInRleHRDb250ZW50IiwibWVzc2FnZSIsImhhcyIsImFkZCIsImh0bWwiLCJ2YWxpZF9mcm9tIiwic2FuIiwiJGFtaUNoZWNrYm94IiwiJGFqYW1DaGVja2JveCIsInVwZGF0ZUFKQU1TdGF0ZSIsImlzQU1JRW5hYmxlZCIsImdzX0FKQU1SZXF1aXJlc0FNSSIsInJlbW92ZUF0dHIiLCIkbGFuZ3VhZ2VJbnB1dCIsIiRsYW5ndWFnZURyb3Bkb3duIiwiJHJlc3RhcnRXYXJuaW5nIiwib3JpZ2luYWxWYWx1ZSIsImlzRGF0YUxvYWRlZCIsInRyYW5zaXRpb24iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ1cmwiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBR0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEscUJBQXFCLEdBQUc7QUFDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsd0JBQUQsQ0FMZTs7QUFPMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMs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TDtBQUVBdk8sSUFBQUEsSUFBSSxDQUFDbEYsYUFBTCxHQUFxQmYscUJBQXFCLENBQUNlLGFBQTNDO0FBQ0FrRixJQUFBQSxJQUFJLENBQUNpTCxnQkFBTCxHQUF3QmxSLHFCQUFxQixDQUFDa1IsZ0JBQTlDO0FBQ0FqTCxJQUFBQSxJQUFJLENBQUMrTCxlQUFMLEdBQXVCaFMscUJBQXFCLENBQUNnUyxlQUE3QztBQUNBL0wsSUFBQUEsSUFBSSxDQUFDekMsVUFBTDtBQUNIO0FBbGdEeUIsQ0FBOUIsQyxDQXFnREE7O0FBQ0F0RCxDQUFDLENBQUM0SCxRQUFELENBQUQsQ0FBWTJNLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnpVLEVBQUFBLHFCQUFxQixDQUFDd0QsVUFBdEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBhc3N3b3JkU2NvcmUsIFBieEFwaSwgVXNlck1lc3NhZ2UsIFNvdW5kRmlsZVNlbGVjdG9yLCBHZW5lcmFsU2V0dGluZ3NBUEksIENsaXBib2FyZEpTLCBQYXNzd29yZFdpZGdldCwgUGFzc3dvcmRzQVBJLCBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciwgJCAqL1xuXG4vKipcbiAqIEEgbW9kdWxlIHRvIGhhbmRsZSBtb2RpZmljYXRpb24gb2YgZ2VuZXJhbCBzZXR0aW5ncy5cbiAqL1xuY29uc3QgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkd2ViQWRtaW5QYXNzd29yZDogJCgnI1dlYkFkbWluUGFzc3dvcmQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmQ6ICQoJyNTU0hQYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlzYWJsZVNTSFBhc3N3b3JkOiAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykucGFyZW50KCcuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmRTZWdtZW50OiAkKCcjb25seS1pZi1wYXNzd29yZC1lbmFibGVkJyksXG5cbiAgICAvKipcbiAgICAgKiBJZiBwYXNzd29yZCBzZXQsIGl0IHdpbGwgYmUgaGlkZWQgZnJvbSB3ZWIgdWkuXG4gICAgICovXG4gICAgaGlkZGVuUGFzc3dvcmQ6ICcqKioqKioqKicsXG5cbiAgICAvKipcbiAgICAgKiBTb3VuZCBmaWxlIGZpZWxkIElEc1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgc291bmRGaWxlRmllbGRzOiB7XG4gICAgICAgIGFubm91bmNlbWVudEluOiAnUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4nLFxuICAgICAgICBhbm5vdW5jZW1lbnRPdXQ6ICdQQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBPcmlnaW5hbCBjb2RlYyBzdGF0ZSBmcm9tIGxhc3QgbG9hZFxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgb3JpZ2luYWxDb2RlY1N0YXRlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgY29kZWNzIGhhdmUgYmVlbiBjaGFuZ2VkXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgY29kZWNzQ2hhbmdlZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHRyYWNrIGlmIGRhdGEgaGFzIGJlZW4gbG9hZGVkIGZyb20gQVBJXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgZGF0YUxvYWRlZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHsgLy8gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXNcbiAgICAgICAgcGJ4bmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1BCWE5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXZWJBZG1pblBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV2ViQWRtaW5QYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbV2ViQWRtaW5QYXNzd29yZF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgU1NIUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTU0hQYXNzd29yZFJlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hdGNoW1NTSFBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQlBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXRUJQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQkhUVFBTUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQkhUVFBTUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQkhUVFBTUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQlBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgQUpBTVBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdBSkFNUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFNJUEF1dGhQcmVmaXg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTSVBBdXRoUHJlZml4JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwWy9eW2EtekEtWl0qJC9dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeEludmFsaWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBSdWxlcyBmb3IgdGhlIHdlYiBhZG1pbiBwYXNzd29yZCBmaWVsZCB3aGVuIGl0IG5vdCBlcXVhbCB0byBoaWRkZW5QYXNzd29yZFxuICAgIHdlYkFkbWluUGFzc3dvcmRSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVdlYlBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW2Etel0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vVXBwZXJTaW12b2xcbiAgICAgICAgfVxuICAgIF0sXG4gICAgLy8gUnVsZXMgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGQgd2hlbiBTU0ggbG9naW4gdGhyb3VnaCB0aGUgcGFzc3dvcmQgZW5hYmxlZCwgYW5kIGl0IG5vdCBlcXVhbCB0byBoaWRkZW5QYXNzd29yZFxuICAgIGFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW2Etel0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vTnVtYmVyc1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW0EtWl0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vVXBwZXJTaW12b2xcbiAgICAgICAgfVxuICAgIF0sXG5cbiAgICAvLyBSdWxlcyBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZCB3aGVuIFNTSCBsb2dpbiB0aHJvdWdoIHRoZSBwYXNzd29yZCBkaXNhYmxlZFxuICAgIGFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQsXG4gICAgICAgIH1cbiAgICBdLFxuXG4gICAgLyoqXG4gICAgICogQ2xpcGJvYXJkIGluc3RhbmNlIGZvciBjb3B5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKiBAdHlwZSB7Q2xpcGJvYXJkSlN9XG4gICAgICovXG4gICAgY2xpcGJvYXJkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqICBJbml0aWFsaXplIG1vZHVsZSB3aXRoIGV2ZW50IGJpbmRpbmdzIGFuZCBjb21wb25lbnQgaW5pdGlhbGl6YXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXRzXG4gICAgICAgIC8vIFdlYiBBZG1pbiBQYXNzd29yZCB3aWRnZXQgLSBvbmx5IHZhbGlkYXRpb24gYW5kIHdhcm5pbmdzLCBubyBidXR0b25zXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuaW5pdChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQsIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0OiAnZ2VuZXJhbF93ZWInLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLCAgICAgLy8gTm8gc2hvdy9oaWRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gY29weSBidXR0b25cbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNTSCBQYXNzd29yZCB3aWRnZXQgLSBvbmx5IHZhbGlkYXRpb24gYW5kIHdhcm5pbmdzLCBubyBidXR0b25zXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNzaFdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZCwge1xuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdnZW5lcmFsX3NzaCcsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogZmFsc2UsICAgICAvLyBObyBzaG93L2hpZGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIFNTSCBkaXNhYmxlIGNoZWNrYm94XG4gICAgICAgICAgICAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgaWYgKGlzRGlzYWJsZWQgJiYgc3NoV2lkZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIFBhc3N3b3JkV2lkZ2V0LmhpZGVXYXJuaW5ncyhzc2hXaWRnZXQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3NoV2lkZ2V0LmVsZW1lbnRzLiRzY29yZVNlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNzaFdpZGdldC5lbGVtZW50cy4kc2NvcmVTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWlzRGlzYWJsZWQgJiYgc3NoV2lkZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIFBhc3N3b3JkV2lkZ2V0LmNoZWNrUGFzc3dvcmQoc3NoV2lkZ2V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgd2hlbiBwYXNzd29yZHMgY2hhbmdlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSAhPT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSAhPT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFBCWExhbmd1YWdlIGRyb3Bkb3duIGZpcnN0IHdpdGggc3BlY2lhbCBoYW5kbGVyXG4gICAgICAgIC8vIE11c3QgYmUgZG9uZSBiZWZvcmUgZ2VuZXJhbCBkcm9wZG93biBpbml0aWFsaXphdGlvblxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVBCWExhbmd1YWdlV2FybmluZygpO1xuXG4gICAgICAgIC8vIEVuYWJsZSBkcm9wZG93bnMgb24gdGhlIGZvcm0gKGV4Y2VwdCBzb3VuZCBmaWxlIHNlbGVjdG9ycyBhbmQgbGFuZ3VhZ2UgZHJvcGRvd24pXG4gICAgICAgIC8vIExhbmd1YWdlIGRyb3Bkb3duIGFscmVhZHkgaW5pdGlhbGl6ZWQgYWJvdmUgd2l0aCBzcGVjaWFsIG9uQ2hhbmdlIGhhbmRsZXJcbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybSAuZHJvcGRvd24nKVxuICAgICAgICAgICAgLm5vdCgnLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JylcbiAgICAgICAgICAgIC5ub3QoJyNQQlhMYW5ndWFnZS1kcm9wZG93bicpXG4gICAgICAgICAgICAuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3hlcyBvbiB0aGUgZm9ybVxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIEFNSS9BSkFNIGRlcGVuZGVuY3kgYWZ0ZXIgY2hlY2tib3hlcyBhcmUgaW5pdGlhbGl6ZWRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSgpO1xuXG4gICAgICAgIC8vIENvZGVjIHRhYmxlIGRyYWctbi1kcm9wIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gU2VlIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkgd2hpY2ggaXMgY2FsbGVkIGZyb20gdXBkYXRlQ29kZWNUYWJsZXMoKVxuXG4gICAgICAgIC8vIFNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgUkVTVCBBUEkgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gU2VlIGxvYWRTb3VuZEZpbGVWYWx1ZXMoKSBtZXRob2QgY2FsbGVkIGZyb20gcG9wdWxhdGVGb3JtKClcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogU1NIIGtleXMgdGFibGUgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGxvYWRzXG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgZGlzcGxheVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIGNvcHkgYnV0dG9uc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWRkaXRpb25hbCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcblxuICAgICAgICAvLyBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KHtcbiAgICAgICAgICAgICdvbkNoYW5nZSc6IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkXG4gICAgICAgIH0pO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0hpZGVTU0hQYXNzd29yZCgpO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBoYW5kbGUgdGFiIGFjdGl2YXRpb25cbiAgICAgICAgJCh3aW5kb3cpLm9uKCdHUy1BY3RpdmF0ZVRhYicsIChldmVudCwgbmFtZVRhYikgPT4ge1xuICAgICAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKCdjaGFuZ2UgdGFiJywgbmFtZVRhYik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaWYgKHR5cGVvZiBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRvb2x0aXAgY2xpY2sgYmVoYXZpb3IgaXMgbm93IGhhbmRsZWQgZ2xvYmFsbHkgaW4gVG9vbHRpcEJ1aWxkZXIuanNcblxuICAgICAgICAvLyBQQlhMYW5ndWFnZSBkcm9wZG93biB3aXRoIHJlc3RhcnQgd2FybmluZyBhbHJlYWR5IGluaXRpYWxpemVkIGFib3ZlXG5cbiAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gQVBJIGluc3RlYWQgb2YgdXNpbmcgc2VydmVyLXJlbmRlcmVkIHZhbHVlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkubG9hZERhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9ycyB3aXRoIHBsYXliYWNrIGZ1bmN0aW9uYWxpdHkgdXNpbmcgU291bmRGaWxlU2VsZWN0b3JcbiAgICAgKiBIVE1MIHN0cnVjdHVyZSBpcyBwcm92aWRlZCBieSB0aGUgcGxheUFkZE5ld1NvdW5kV2l0aEljb25zIHBhcnRpYWwgaW4gcmVjb3JkaW5nLnZvbHQ6XG4gICAgICogLSBIaWRkZW4gaW5wdXQ6IDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJblwiIG5hbWU9XCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJblwiPlxuICAgICAqIC0gRHJvcGRvd24gZGl2OiA8ZGl2IGNsYXNzPVwidWkgc2VsZWN0aW9uIGRyb3Bkb3duIHNlYXJjaCBQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbi1kcm9wZG93blwiPlxuICAgICAqIC0gUGxheWJhY2sgYnV0dG9uIGFuZCBhZGQgbmV3IGJ1dHRvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMoKSB7XG4gICAgICAgIC8vIFNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gU2VlIGluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcldpdGhEYXRhKCkgY2FsbGVkIGZyb20gcG9wdWxhdGVGb3JtKClcbiAgICAgICAgXG4gICAgICAgIC8vIFRoaXMgbWV0aG9kIGlzIGtlcHQgZm9yIGNvbnNpc3RlbmN5IGJ1dCBhY3R1YWwgaW5pdGlhbGl6YXRpb24gaGFwcGVuc1xuICAgICAgICAvLyB3aGVuIHdlIGhhdmUgZGF0YSBmcm9tIHRoZSBzZXJ2ZXIgaW4gbG9hZFNvdW5kRmlsZVZhbHVlcygpXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZ2VuZXJhbCBzZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICogVXNlZCBib3RoIG9uIGluaXRpYWwgcGFnZSBsb2FkIGFuZCBmb3IgbWFudWFsIHJlZnJlc2hcbiAgICAgKiBDYW4gYmUgY2FsbGVkIGFueXRpbWUgdG8gcmVsb2FkIHRoZSBmb3JtIGRhdGE6IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkRGF0YSgpXG4gICAgICovXG4gICAgbG9hZERhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZSBvbiB0aGUgZm9ybSB3aXRoIGRpbW1lclxuICAgICAgICBGb3JtLnNob3dMb2FkaW5nU3RhdGUodHJ1ZSwgJ0xvYWRpbmcgc2V0dGluZ3MuLi4nKTtcblxuICAgICAgICBHZW5lcmFsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmhpZGVMb2FkaW5nU3RhdGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIHRoZSByZWNlaXZlZCBkYXRhXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZGF0YUxvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3YXJuaW5ncyBmb3IgZGVmYXVsdCBwYXNzd29yZHMgYWZ0ZXIgRE9NIHVwZGF0ZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLnBhc3N3b3JkVmFsaWRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIHVwZGF0ZWQgYWZ0ZXIgcG9wdWxhdGVGb3JtXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dEZWZhdWx0UGFzc3dvcmRXYXJuaW5ncyhyZXNwb25zZS5kYXRhLnBhc3N3b3JkVmFsaWRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBFcnJvcjonLCByZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93QXBpRXJyb3IocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBzZXR0aW5ncyBhbmQgYWRkaXRpb25hbCBkYXRhXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gZGF0YS5zZXR0aW5ncyB8fCBkYXRhO1xuICAgICAgICBjb25zdCBjb2RlY3MgPSBkYXRhLmNvZGVjcyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoc2V0dGluZ3MsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzcGVjaWFsIGZpZWxkIHR5cGVzXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnBvcHVsYXRlU3BlY2lhbEZpZWxkcyhmb3JtRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBzb3VuZCBmaWxlIHZhbHVlcyB3aXRoIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkU291bmRGaWxlVmFsdWVzKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY29kZWMgdGFibGVzXG4gICAgICAgICAgICAgICAgaWYgKGNvZGVjcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS51cGRhdGVDb2RlY1RhYmxlcyhjb2RlY3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIGZpZWxkcyAoaGlkZSBhY3R1YWwgcGFzc3dvcmRzKVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUGFzc3dvcmRGaWVsZHMoZm9ybURhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBTU0ggcGFzc3dvcmQgdmlzaWJpbGl0eVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGlmIGVuYWJsZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFNTSCBrZXlzIHRhYmxlIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIGlmICh0eXBlb2Ygc3NoS2V5c1RhYmxlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgc3NoS2V5c1RhYmxlLmluaXRpYWxpemUoJ3NzaC1rZXlzLWNvbnRhaW5lcicsICdTU0hBdXRob3JpemVkS2V5cycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgd2l0aCBuZXcgZGF0YVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJpZ2dlciBldmVudCB0byBub3RpZnkgdGhhdCBkYXRhIGhhcyBiZWVuIGxvYWRlZFxuICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdHZW5lcmFsU2V0dGluZ3MuZGF0YUxvYWRlZCcpO1xuXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgc3BlY2lhbCBmaWVsZCB0eXBlcyB0aGF0IG5lZWQgY3VzdG9tIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVTcGVjaWFsRmllbGRzKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIFByaXZhdGUga2V5IGV4aXN0ZW5jZSBpcyBub3cgZGV0ZXJtaW5lZCBieSBjaGVja2luZyBpZiB2YWx1ZSBlcXVhbHMgSElEREVOX1BBU1NXT1JEXG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2VydGlmaWNhdGUgaW5mb1xuICAgICAgICBpZiAoc2V0dGluZ3MuV0VCSFRUUFNQdWJsaWNLZXlfaW5mbykge1xuICAgICAgICAgICAgJCgnI1dFQkhUVFBTUHVibGljS2V5JykuZGF0YSgnY2VydC1pbmZvJywgc2V0dGluZ3MuV0VCSFRUUFNQdWJsaWNLZXlfaW5mbyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjaGVja2JveGVzIChBUEkgcmV0dXJucyBib29sZWFuIHZhbHVlcylcbiAgICAgICAgT2JqZWN0LmtleXMoc2V0dGluZ3MpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQoYCMke2tleX1gKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gc2V0dGluZ3Nba2V5XSA9PT0gdHJ1ZSB8fCBzZXR0aW5nc1trZXldID09PSAnMScgfHwgc2V0dGluZ3Nba2V5XSA9PT0gMTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3guY2hlY2tib3goaXNDaGVja2VkID8gJ2NoZWNrJyA6ICd1bmNoZWNrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSByZWd1bGFyIGRyb3Bkb3ducyAoZXhjbHVkaW5nIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdoaWNoIGFyZSBoYW5kbGVkIHNlcGFyYXRlbHkpXG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtrZXl9YCkucGFyZW50KCcuZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID4gMCAmJiAhJGRyb3Bkb3duLmhhc0NsYXNzKCdhdWRpby1tZXNzYWdlLXNlbGVjdCcpKSB7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIGZpZWxkcyB3aXRoIGhpZGRlbiBwYXNzd29yZCBpbmRpY2F0b3JcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkRmllbGRzKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIEhpZGUgYWN0dWFsIHBhc3N3b3JkcyBhbmQgc2hvdyBoaWRkZW4gaW5kaWNhdG9yXG4gICAgICAgIGlmIChzZXR0aW5ncy5XZWJBZG1pblBhc3N3b3JkICYmIHNldHRpbmdzLldlYkFkbWluUGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHNldHRpbmdzLlNTSFBhc3N3b3JkICYmIHNldHRpbmdzLlNTSFBhc3N3b3JkICE9PSAnJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBBUEkgZXJyb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbWVzc2FnZXMgLSBFcnJvciBtZXNzYWdlcyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHNob3dBcGlFcnJvcihtZXNzYWdlcykge1xuICAgICAgICBpZiAobWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IEFycmF5LmlzQXJyYXkobWVzc2FnZXMuZXJyb3IpIFxuICAgICAgICAgICAgICAgID8gbWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSBcbiAgICAgICAgICAgICAgICA6IG1lc3NhZ2VzLmVycm9yO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgd2FybmluZ3MgZm9yIGRlZmF1bHQgcGFzc3dvcmRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHZhbGlkYXRpb24gLSBQYXNzd29yZCB2YWxpZGF0aW9uIHJlc3VsdHMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3ModmFsaWRhdGlvbikge1xuICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIHBhc3N3b3JkLXZhbGlkYXRlIG1lc3NhZ2VzIGZpcnN0XG4gICAgICAgICQoJy5wYXNzd29yZC12YWxpZGF0ZScpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGZvciBkZWZhdWx0IFdlYiBBZG1pbiBwYXNzd29yZFxuICAgICAgICBpZiAodmFsaWRhdGlvbi5pc0RlZmF1bHRXZWJQYXNzd29yZCkge1xuICAgICAgICAgICAgLy8gRmluZCB0aGUgcGFzc3dvcmQgZmllbGRzIGdyb3VwIC0gdHJ5IG11bHRpcGxlIHNlbGVjdG9yc1xuICAgICAgICAgICAgbGV0ICR3ZWJQYXNzd29yZEZpZWxkcyA9ICQoJyNXZWJBZG1pblBhc3N3b3JkJykuY2xvc2VzdCgnLnR3by5maWVsZHMnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCR3ZWJQYXNzd29yZEZpZWxkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgYWx0ZXJuYXRpdmUgc2VsZWN0b3IgaWYgdGhlIGZpcnN0IG9uZSBkb2Vzbid0IHdvcmtcbiAgICAgICAgICAgICAgICAkd2ViUGFzc3dvcmRGaWVsZHMgPSAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLnBhcmVudCgpLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHdlYlBhc3N3b3JkRmllbGRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgd2FybmluZyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgY29uc3Qgd2FybmluZ0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBuZWdhdGl2ZSBpY29uIG1lc3NhZ2UgcGFzc3dvcmQtdmFsaWRhdGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19TZXRQYXNzd29yZH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5wc3dfQ2hhbmdlRGVmYXVsdFBhc3N3b3JkfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluc2VydCB3YXJuaW5nIGJlZm9yZSB0aGUgcGFzc3dvcmQgZmllbGRzXG4gICAgICAgICAgICAgICAgJHdlYlBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgd2FybmluZyBmb3IgZGVmYXVsdCBTU0ggcGFzc3dvcmRcbiAgICAgICAgaWYgKHZhbGlkYXRpb24uaXNEZWZhdWx0U1NIUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIFNTSCBwYXNzd29yZCBsb2dpbiBpcyBlbmFibGVkXG4gICAgICAgICAgICBjb25zdCBzc2hQYXNzd29yZERpc2FibGVkID0gJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghc3NoUGFzc3dvcmREaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHMgZ3JvdXBcbiAgICAgICAgICAgICAgICBsZXQgJHNzaFBhc3N3b3JkRmllbGRzID0gJCgnI1NTSFBhc3N3b3JkJykuY2xvc2VzdCgnLnR3by5maWVsZHMnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJHNzaFBhc3N3b3JkRmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgYWx0ZXJuYXRpdmUgc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzID0gJCgnI1NTSFBhc3N3b3JkJykucGFyZW50KCkucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkc3NoUGFzc3dvcmRGaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgd2FybmluZyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIGljb24gbWVzc2FnZSBwYXNzd29yZC12YWxpZGF0ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUucHN3X1NldFBhc3N3b3JkfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5wc3dfQ2hhbmdlRGVmYXVsdFBhc3N3b3JkfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5zZXJ0IHdhcm5pbmcgYmVmb3JlIHRoZSBTU0ggcGFzc3dvcmQgZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICRzc2hQYXNzd29yZEZpZWxkcy5iZWZvcmUod2FybmluZ0h0bWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbmQgbG9hZCBzb3VuZCBmaWxlIHNlbGVjdG9ycyB3aXRoIGRhdGEsIHNpbWlsYXIgdG8gSVZSIGltcGxlbWVudGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTb3VuZEZpbGVWYWx1ZXMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gQ29udmVydCBlbXB0eSB2YWx1ZXMgdG8gLTEgZm9yIHRoZSBkcm9wZG93blxuICAgICAgICBjb25zdCBkYXRhSW4gPSB7Li4uc2V0dGluZ3N9O1xuICAgICAgICBpZiAoIXNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudEluIHx8IHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudEluID09PSAnJykge1xuICAgICAgICAgICAgZGF0YUluLlBCWFJlY29yZEFubm91bmNlbWVudEluID0gJy0xJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW5jb21pbmcgYW5ub3VuY2VtZW50IHNlbGVjdG9yIHdpdGggZGF0YSAoZm9sbG93aW5nIElWUiBwYXR0ZXJuKVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbicsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFJblxuICAgICAgICAgICAgLy8g4p2MIE5PIG9uQ2hhbmdlIG5lZWRlZCAtIGNvbXBsZXRlIGF1dG9tYXRpb24gYnkgYmFzZSBjbGFzc1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IGVtcHR5IHZhbHVlcyB0byAtMSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICAgIGNvbnN0IGRhdGFPdXQgPSB7Li4uc2V0dGluZ3N9O1xuICAgICAgICBpZiAoIXNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudE91dCB8fCBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQgPT09ICcnKSB7XG4gICAgICAgICAgICBkYXRhT3V0LlBCWFJlY29yZEFubm91bmNlbWVudE91dCA9ICctMSc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIG91dGdvaW5nIGFubm91bmNlbWVudCBzZWxlY3RvciB3aXRoIGRhdGEgKGZvbGxvd2luZyBJVlIgcGF0dGVybilcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0Jywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YU91dFxuICAgICAgICAgICAgLy8g4p2MIE5PIG9uQ2hhbmdlIG5lZWRlZCAtIGNvbXBsZXRlIGF1dG9tYXRpb24gYnkgYmFzZSBjbGFzc1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgYW5kIHVwZGF0ZSBjb2RlYyB0YWJsZXMgd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtBcnJheX0gY29kZWNzIC0gQXJyYXkgb2YgY29kZWMgY29uZmlndXJhdGlvbnNcbiAgICAgKi9cbiAgICB1cGRhdGVDb2RlY1RhYmxlcyhjb2RlY3MpIHtcbiAgICAgICAgLy8gUmVzZXQgY29kZWMgY2hhbmdlIGZsYWcgd2hlbiBsb2FkaW5nIGRhdGFcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNvZGVjc0NoYW5nZWQgPSBmYWxzZTtcblxuICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBjb2RlYyBzdGF0ZSBmb3IgY29tcGFyaXNvblxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkub3JpZ2luYWxDb2RlY1N0YXRlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBTZXBhcmF0ZSBhdWRpbyBhbmQgdmlkZW8gY29kZWNzXG4gICAgICAgIGNvbnN0IGF1ZGlvQ29kZWNzID0gY29kZWNzLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ2F1ZGlvJykuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICBjb25zdCB2aWRlb0NvZGVjcyA9IGNvZGVjcy5maWx0ZXIoYyA9PiBjLnR5cGUgPT09ICd2aWRlbycpLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIGF1ZGlvIGNvZGVjcyB0YWJsZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYnVpbGRDb2RlY1RhYmxlKGF1ZGlvQ29kZWNzLCAnYXVkaW8nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHZpZGVvIGNvZGVjcyB0YWJsZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYnVpbGRDb2RlY1RhYmxlKHZpZGVvQ29kZWNzLCAndmlkZW8nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhpZGUgbG9hZGVycyBhbmQgc2hvdyB0YWJsZXNcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy1sb2FkZXIsICN2aWRlby1jb2RlY3MtbG9hZGVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlLCAjdmlkZW8tY29kZWNzLXRhYmxlJykuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkcmFnIGFuZCBkcm9wIGZvciByZW9yZGVyaW5nXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ29kZWNEcmFnRHJvcCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgY29kZWMgdGFibGUgcm93cyBmcm9tIGRhdGFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb2RlY3MgLSBBcnJheSBvZiBjb2RlYyBvYmplY3RzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSAnYXVkaW8nIG9yICd2aWRlbydcbiAgICAgKi9cbiAgICBidWlsZENvZGVjVGFibGUoY29kZWNzLCB0eXBlKSB7XG4gICAgICAgIGNvbnN0ICR0YWJsZUJvZHkgPSAkKGAjJHt0eXBlfS1jb2RlY3MtdGFibGUgdGJvZHlgKTtcbiAgICAgICAgJHRhYmxlQm9keS5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgY29kZWNzLmZvckVhY2goKGNvZGVjLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgc3RhdGUgZm9yIGNoYW5nZSBkZXRlY3Rpb25cbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGVbY29kZWMubmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4LFxuICAgICAgICAgICAgICAgIGRpc2FibGVkOiBjb2RlYy5kaXNhYmxlZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRhYmxlIHJvd1xuICAgICAgICAgICAgY29uc3QgaXNEaXNhYmxlZCA9IGNvZGVjLmRpc2FibGVkID09PSB0cnVlIHx8IGNvZGVjLmRpc2FibGVkID09PSAnMScgfHwgY29kZWMuZGlzYWJsZWQgPT09IDE7XG4gICAgICAgICAgICBjb25zdCBjaGVja2VkID0gIWlzRGlzYWJsZWQgPyAnY2hlY2tlZCcgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgcm93SHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8dHIgY2xhc3M9XCJjb2RlYy1yb3dcIiBpZD1cImNvZGVjLSR7Y29kZWMubmFtZX1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7aW5kZXh9XCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29kZWMtbmFtZT1cIiR7Y29kZWMubmFtZX1cIlxuICAgICAgICAgICAgICAgICAgICBkYXRhLW9yaWdpbmFsLXByaW9yaXR5PVwiJHtpbmRleH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY29sbGFwc2luZyBkcmFnSGFuZGxlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNvcnQgZ3JleSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGNvZGVjc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cImNvZGVjXyR7Y29kZWMubmFtZX1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtjaGVja2VkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJpbmRleD1cIjBcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJoaWRkZW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPVwiY29kZWNfJHtjb2RlYy5uYW1lfVwiPiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY29kZWMuZGVzY3JpcHRpb24gfHwgY29kZWMubmFtZSl9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkdGFibGVCb2R5LmFwcGVuZChyb3dIdG1sKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94ZXMgZm9yIHRoZSBuZXcgcm93c1xuICAgICAgICAkdGFibGVCb2R5LmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGNvZGVjcyBhcyBjaGFuZ2VkIGFuZCBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcmFnIGFuZCBkcm9wIGZvciBjb2RlYyB0YWJsZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ29kZWNEcmFnRHJvcCgpIHtcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSwgI3ZpZGVvLWNvZGVjcy10YWJsZScpLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJyxcbiAgICAgICAgICAgIG9uRHJvcDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gTWFyayBjb2RlY3MgYXMgY2hhbmdlZCBhbmQgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNvZGVjc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2VydGlmaWNhdGUgZmllbGQgZGlzcGxheSBvbmx5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBXRUJIVFRQU1B1YmxpY0tleSBmaWVsZCBvbmx5XG4gICAgICAgIGNvbnN0ICRjZXJ0UHViS2V5RmllbGQgPSAkKCcjV0VCSFRUUFNQdWJsaWNLZXknKTtcbiAgICAgICAgaWYgKCRjZXJ0UHViS2V5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsVmFsdWUgPSAkY2VydFB1YktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRjZXJ0UHViS2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBjZXJ0aWZpY2F0ZSBpbmZvIGlmIGF2YWlsYWJsZSBmcm9tIGRhdGEgYXR0cmlidXRlXG4gICAgICAgICAgICBjb25zdCBjZXJ0SW5mbyA9ICRjZXJ0UHViS2V5RmllbGQuZGF0YSgnY2VydC1pbmZvJykgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50cyBmb3IgdGhpcyBmaWVsZCBvbmx5XG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWRpc3BsYXksIC5jZXJ0LWVkaXQtZm9ybScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZnVsbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIG1lYW5pbmdmdWwgZGlzcGxheSB0ZXh0IGZyb20gY2VydGlmaWNhdGUgaW5mb1xuICAgICAgICAgICAgICAgIGxldCBkaXNwbGF5VGV4dCA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mbyAmJiAhY2VydEluZm8uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzdWJqZWN0L2RvbWFpblxuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uc3ViamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg8J+TnCAke2NlcnRJbmZvLnN1YmplY3R9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBpc3N1ZXIgaWYgbm90IHNlbGYtc2lnbmVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc3N1ZXIgJiYgIWNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGBieSAke2NlcnRJbmZvLmlzc3Vlcn1gKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5pc19zZWxmX3NpZ25lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaCgnKFNlbGYtc2lnbmVkKScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgdmFsaWRpdHkgZGF0ZXNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLnZhbGlkX3RvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKdjCBFeHBpcmVkICR7Y2VydEluZm8udmFsaWRfdG99YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5IDw9IDMwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4pqg77iPIEV4cGlyZXMgaW4gJHtjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeX0gZGF5c2ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDinIUgVmFsaWQgdW50aWwgJHtjZXJ0SW5mby52YWxpZF90b31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheVRleHQgPSBwYXJ0cy5qb2luKCcgfCAnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byB0cnVuY2F0ZWQgY2VydGlmaWNhdGVcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheVRleHQgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudHJ1bmNhdGVDZXJ0aWZpY2F0ZShmdWxsVmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBvcmlnaW5hbCBmaWVsZFxuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBzdGF0dXMgY29sb3IgY2xhc3MgYmFzZWQgb24gY2VydGlmaWNhdGUgc3RhdHVzXG4gICAgICAgICAgICAgICAgbGV0IHN0YXR1c0NsYXNzID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnd2FybmluZyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aW9uIGlucHV0IGZsdWlkIGNlcnQtZGlzcGxheSAke3N0YXR1c0NsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGRpc3BsYXlUZXh0KX1cIiByZWFkb25seSBjbGFzcz1cInRydW5jYXRlZC1kaXNwbGF5XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBjb3B5LWJ0blwiIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGZ1bGxWYWx1ZSl9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJiYXNpY1wiIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5Q2VydH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgaW5mby1jZXJ0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDZXJ0SW5mb31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGVkaXQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJlZGl0IGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGRlbGV0ZS1jZXJ0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEZWxldGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ0cmFzaCBpY29uIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgJHtjZXJ0SW5mbyAmJiAhY2VydEluZm8uZXJyb3IgPyBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucmVuZGVyQ2VydGlmaWNhdGVEZXRhaWxzKGNlcnRJbmZvKSA6ICcnfVxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZm9ybSBjZXJ0LWVkaXQtZm9ybVwiIHN0eWxlPVwiZGlzcGxheTpub25lO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGlkPVwiV0VCSFRUUFNQdWJsaWNLZXlfZWRpdFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dzPVwiMTBcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCIke2dsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVB1YmxpY0NlcnR9XCI+JHtmdWxsVmFsdWV9PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG1pbmkgYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBwb3NpdGl2ZSBidXR0b24gc2F2ZS1jZXJ0LWJ0blwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1NhdmV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBjYW5jZWwtY2VydC1idG5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjbG9zZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5idF9DYW5jZWx9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGluZm8gYnV0dG9uIC0gdG9nZ2xlIGRldGFpbHMgZGlzcGxheVxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmluZm8tY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGRldGFpbHMgPSAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWRldGFpbHMnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRkZXRhaWxzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGRldGFpbHMuc2xpZGVUb2dnbGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBlZGl0IGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmVkaXQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1lZGl0LWZvcm0nKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHVibGljS2V5X2VkaXQnKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnNhdmUtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSAkY29udGFpbmVyLmZpbmQoJyNXRUJIVFRQU1B1YmxpY0tleV9lZGl0JykudmFsKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBvcmlnaW5hbCBoaWRkZW4gZmllbGRcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC52YWwobmV3VmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGNlcnRpZmljYXRlIGluZm8gdG8gZm9yY2UgcmUtcGFyc2luZ1xuICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFVzZXIgaXMgY2hhbmdpbmcgY2VydGlmaWNhdGUsIGluZm8gbmVlZHMgdG8gYmUgdXBkYXRlZFxuICAgICAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLmRhdGEoJ2NlcnQtaW5mbycsIHt9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgYm90aCBjZXJ0aWZpY2F0ZSBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgLy8gV0hZOiBXaGVuIHVzZXIgY2hhbmdlcyBwdWJsaWMgY2VydCwgcHJpdmF0ZSBrZXkgZmllbGQgc3RhdGUgbWF5IG5lZWQgdXBkYXRlXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGNhbmNlbCBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jYW5jZWwtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1lZGl0LWZvcm0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheScpLnNob3coKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmRlbGV0ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBjZXJ0aWZpY2F0ZVxuICAgICAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLnZhbCgnJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgY2VydGlmaWNhdGUgaW5mbyBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IFdoZW4gY2VydGlmaWNhdGUgaXMgZGVsZXRlZCwgcHJpdmF0ZSBrZXkgc3RhdGUgc2hvdWxkIGFsc28gdXBkYXRlXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuZGF0YSgnY2VydC1pbmZvJywge30pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBib3RoIGNlcnRpZmljYXRlIGZpZWxkcyB0byBzaG93IGVtcHR5IHN0YXRlXG4gICAgICAgICAgICAgICAgICAgIC8vIFdIWTogRGVsZXRpbmcgcHVibGljIGNlcnQgc2hvdWxkIGFsc28gcmVzZXQgcHJpdmF0ZSBrZXkgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJ1tkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGNsaXBib2FyZCBmb3IgbmV3IGJ1dHRvbnNcbiAgICAgICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZCkge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDbGlwYm9hcmQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG9yaWdpbmFsIGZpZWxkIGZvciBpbnB1dCB3aXRoIHByb3BlciBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQdWJsaWNDZXJ0KTtcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLmF0dHIoJ3Jvd3MnLCAnMTAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgY2hhbmdlIGV2ZW50cyB0cmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQub2ZmKCdpbnB1dC5jZXJ0IGNoYW5nZS5jZXJ0IGtleXVwLmNlcnQnKS5vbignaW5wdXQuY2VydCBjaGFuZ2UuY2VydCBrZXl1cC5jZXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0cnVuY2F0ZWQgZmllbGRzIGRpc3BsYXkgZm9yIFNTSCBrZXlzIGFuZCBjZXJ0aWZpY2F0ZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCkge1xuICAgICAgICAvLyBIYW5kbGUgU1NIX0lEX1JTQV9QVUIgZmllbGRcbiAgICAgICAgY29uc3QgJHNzaFB1YktleUZpZWxkID0gJCgnI1NTSF9JRF9SU0FfUFVCJyk7XG4gICAgICAgIGlmICgkc3NoUHViS2V5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsVmFsdWUgPSAkc3NoUHViS2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJHNzaFB1YktleUZpZWxkLnBhcmVudCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIGRpc3BsYXkgZWxlbWVudHNcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnNzaC1rZXktZGlzcGxheSwgLmZ1bGwtZGlzcGxheScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IGNyZWF0ZSBkaXNwbGF5IGlmIHRoZXJlJ3MgYSB2YWx1ZVxuICAgICAgICAgICAgaWYgKGZ1bGxWYWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB0cnVuY2F0ZWQgZGlzcGxheVxuICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS50cnVuY2F0ZVNTSEtleShmdWxsVmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIG9yaWdpbmFsIGZpZWxkXG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwbGF5SHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGlvbiBpbnB1dCBmbHVpZCBzc2gta2V5LWRpc3BsYXlcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHt0cnVuY2F0ZWR9XCIgcmVhZG9ubHkgY2xhc3M9XCJ0cnVuY2F0ZWQtZGlzcGxheVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgY29weS1idG5cIiBkYXRhLWNsaXBib2FyZC10ZXh0PVwiJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChmdWxsVmFsdWUpfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cImJhc2ljXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlLZXl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjb3B5IGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGV4cGFuZC1idG5cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEV4cGFuZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4cGFuZCBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBjbGFzcz1cImZ1bGwtZGlzcGxheVwiIHN0eWxlPVwiZGlzcGxheTpub25lO1wiIHJlYWRvbmx5PiR7ZnVsbFZhbHVlfTwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBleHBhbmQvY29sbGFwc2VcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmV4cGFuZC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmdWxsRGlzcGxheSA9ICRjb250YWluZXIuZmluZCgnLmZ1bGwtZGlzcGxheScpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0cnVuY2F0ZWREaXNwbGF5ID0gJGNvbnRhaW5lci5maW5kKCcuc3NoLWtleS1kaXNwbGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKHRoaXMpLmZpbmQoJ2knKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJGZ1bGxEaXNwbGF5LmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICRmdWxsRGlzcGxheS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICR0cnVuY2F0ZWREaXNwbGF5LnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2NvbXByZXNzJykuYWRkQ2xhc3MoJ2V4cGFuZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRmdWxsRGlzcGxheS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICR0cnVuY2F0ZWREaXNwbGF5LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V4cGFuZCcpLmFkZENsYXNzKCdjb21wcmVzcycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBuZXcgZWxlbWVudHNcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBhcyByZWFkLW9ubHkgKHRoaXMgaXMgYSBzeXN0ZW0tZ2VuZXJhdGVkIGtleSlcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5hdHRyKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19Ob1NTSFB1YmxpY0tleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBXRUJIVFRQU1B1YmxpY0tleSBmaWVsZCAtIHVzZSBkZWRpY2F0ZWQgbWV0aG9kXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHJpdmF0ZUtleSBmaWVsZCAod3JpdGUtb25seSB3aXRoIHBhc3N3b3JkIG1hc2tpbmcpXG4gICAgICAgIGNvbnN0ICRjZXJ0UHJpdktleUZpZWxkID0gJCgnI1dFQkhUVFBTUHJpdmF0ZUtleScpO1xuICAgICAgICBpZiAoJGNlcnRQcml2S2V5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQcml2S2V5RmllbGQucGFyZW50KCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucHJpdmF0ZS1rZXktc2V0LCAucHJpdmF0ZS1rZXktc3lzdGVtLW1hbmFnZWQsICNXRUJIVFRQU1ByaXZhdGVLZXlfbmV3JykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIEdldCBjZXJ0aWZpY2F0ZSBpbmZvIHRvIGNoZWNrIGZvciBwcml2YXRlIGtleSBleGlzdGVuY2VcbiAgICAgICAgICAgIGNvbnN0ICRjZXJ0UHViS2V5RmllbGQgPSAkKCcjV0VCSFRUUFNQdWJsaWNLZXknKTtcbiAgICAgICAgICAgIGNvbnN0IGNlcnRJbmZvID0gJGNlcnRQdWJLZXlGaWVsZC5kYXRhKCdjZXJ0LWluZm8nKSB8fCB7fTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcHJpdmF0ZSBrZXkgZXhpc3RzXG4gICAgICAgICAgICAvLyBXSFk6IGhhc19wcml2YXRlX2tleSBjYW4gYmUgdHJ1ZSBldmVuIGlmIGZpZWxkIGlzIGVtcHR5IChzZWxmLXNpZ25lZCBjZXJ0cyBpbiBmaWxlcylcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRjZXJ0UHJpdktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgaGFzVmFsdWVJbkRiID0gY3VycmVudFZhbHVlID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQ7XG4gICAgICAgICAgICBjb25zdCBoYXNWYWx1ZUluRmlsZXMgPSBjZXJ0SW5mby5oYXNfcHJpdmF0ZV9rZXkgfHwgZmFsc2U7XG4gICAgICAgICAgICBjb25zdCBpc1NlbGZTaWduZWQgPSBjZXJ0SW5mby5pc19zZWxmX3NpZ25lZCB8fCBmYWxzZTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcHVibGljIGNlcnRpZmljYXRlIHdhcyBtb2RpZmllZCBsb2NhbGx5IChub3Qgc2F2ZWQgeWV0KVxuICAgICAgICAgICAgLy8gV0hZOiBJZiBjZXJ0IHdhcyBjaGFuZ2VkIGxvY2FsbHksIGNlcnQtaW5mbyBpcyBvdXRkYXRlZCAtIGFsbG93IHByaXZhdGUga2V5IGlucHV0XG4gICAgICAgICAgICBjb25zdCBwdWJsaWNLZXlWYWx1ZSA9ICRjZXJ0UHViS2V5RmllbGQudmFsKCkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBwdWJsaWNLZXlNb2RpZmllZCA9IHB1YmxpY0tleVZhbHVlICYmICFjZXJ0SW5mby5zdWJqZWN0OyAvLyBObyBwYXJzZWQgaW5mbyA9IG1vZGlmaWVkIGxvY2FsbHlcblxuICAgICAgICAgICAgaWYgKHB1YmxpY0tleU1vZGlmaWVkKSB7XG4gICAgICAgICAgICAgICAgLy8gUHVibGljIGNlcnRpZmljYXRlIHdhcyBtb2RpZmllZCBsb2NhbGx5IC0gc2hvdyBwcml2YXRlIGtleSBpbnB1dCBmaWVsZFxuICAgICAgICAgICAgICAgIC8vIFdIWTogVXNlciBpcyBjaGFuZ2luZyBjZXJ0aWZpY2F0ZSwgbmVlZHMgdG8gcHJvdmlkZSBtYXRjaGluZyBwcml2YXRlIGtleVxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVByaXZhdGVLZXkpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3Jvd3MnLCAnMTAnKTtcblxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjaGFuZ2UgZXZlbnRzIHRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQub2ZmKCdpbnB1dC5wcml2IGNoYW5nZS5wcml2IGtleXVwLnByaXYnKS5vbignaW5wdXQucHJpdiBjaGFuZ2UucHJpdiBrZXl1cC5wcml2JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhhc1ZhbHVlSW5EYikge1xuICAgICAgICAgICAgICAgIC8vIFVzZXItcHJvdmlkZWQgY2VydGlmaWNhdGUgd2l0aCBwcml2YXRlIGtleSBpbiBkYXRhYmFzZVxuICAgICAgICAgICAgICAgIC8vIEhpZGUgb3JpZ2luYWwgZmllbGQgYW5kIHNob3cgc3RhdHVzIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2UgcHJpdmF0ZS1rZXktc2V0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImxvY2sgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19Qcml2YXRlS2V5SXNTZXR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxhY2Uta2V5LWxpbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19SZXBsYWNlfTwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBpZD1cIldFQkhUVFBTUHJpdmF0ZUtleV9uZXdcIiBuYW1lPVwiV0VCSFRUUFNQcml2YXRlS2V5XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dzPVwiMTBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHJpdmF0ZUtleX1cIj48L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSByZXBsYWNlIGxpbmtcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5yZXBsYWNlLWtleS1saW5rJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnByaXZhdGUta2V5LXNldCcpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJG5ld0ZpZWxkID0gJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQcml2YXRlS2V5X25ldycpO1xuICAgICAgICAgICAgICAgICAgICAkbmV3RmllbGQuc2hvdygpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgaGlkZGVuIHBhc3N3b3JkIHZhbHVlIHNvIHdlIGNhbiBzZXQgYSBuZXcgb25lXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBCaW5kIGNoYW5nZSBldmVudCB0byB1cGRhdGUgaGlkZGVuIGZpZWxkIGFuZCBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgJG5ld0ZpZWxkLm9uKCdpbnB1dCBjaGFuZ2Uga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgb3JpZ2luYWwgaGlkZGVuIGZpZWxkIHdpdGggbmV3IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC52YWwoJG5ld0ZpZWxkLnZhbCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb24gY2hlY2tcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzU2VsZlNpZ25lZCAmJiBoYXNWYWx1ZUluRmlsZXMpIHtcbiAgICAgICAgICAgICAgICAvLyBTZWxmLXNpZ25lZCBjZXJ0aWZpY2F0ZSB3aXRoIHN5c3RlbS1tYW5hZ2VkIHByaXZhdGUga2V5XG4gICAgICAgICAgICAgICAgLy8gV0hZOiBQcml2YXRlIGtleSBleGlzdHMgaW4gZmlsZXMgYnV0IG5vdCBpbiBkYXRhYmFzZSAoYXV0by1nZW5lcmF0ZWQpXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2UgcHJpdmF0ZS1rZXktc3lzdGVtLW1hbmFnZWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwibG9jayBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmdzX1N5c3RlbU1hbmFnZWRQcml2YXRlS2V5IHx8ICdTeXN0ZW0tbWFuYWdlZCBwcml2YXRlIGtleSAoYXV0by1nZW5lcmF0ZWQgd2l0aCBjZXJ0aWZpY2F0ZSknfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBmb3IgaW5wdXQgd2l0aCBwcm9wZXIgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQcml2YXRlS2V5KTtcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5hdHRyKCdyb3dzJywgJzEwJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNoYW5nZSBldmVudHMgdHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5vZmYoJ2lucHV0LnByaXYgY2hhbmdlLnByaXYga2V5dXAucHJpdicpLm9uKCdpbnB1dC5wcml2IGNoYW5nZS5wcml2IGtleXVwLnByaXYnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZnVuY3Rpb25hbGl0eSBmb3IgY29weSBidXR0b25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNsaXBib2FyZCgpIHtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY29weS1idG4nKTtcbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUudHJpZ2dlcik7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbEljb24gPSAkYnRuLmZpbmQoJ2knKS5hdHRyKCdjbGFzcycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkYnRuLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKCdjaGVjayBpY29uJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkYnRuLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKG9yaWdpbmFsSWNvbik7XG4gICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgc2VsZWN0aW9uXG4gICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5vbignZXJyb3InLCAoKSA9PiB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmdzX0NvcHlGYWlsZWQpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRydW5jYXRlIFNTSCBrZXkgZm9yIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gRnVsbCBTU0gga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUcnVuY2F0ZWQga2V5XG4gICAgICovXG4gICAgdHJ1bmNhdGVTU0hLZXkoa2V5KSB7XG4gICAgICAgIGlmICgha2V5IHx8IGtleS5sZW5ndGggPCA1MCkge1xuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJyAnKTtcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICBjb25zdCBrZXlUeXBlID0gcGFydHNbMF07XG4gICAgICAgICAgICBjb25zdCBrZXlEYXRhID0gcGFydHNbMV07XG4gICAgICAgICAgICBjb25zdCBjb21tZW50ID0gcGFydHMuc2xpY2UoMikuam9pbignICcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5RGF0YS5sZW5ndGggPiA0MCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZCA9IGtleURhdGEuc3Vic3RyaW5nKDAsIDIwKSArICcuLi4nICsga2V5RGF0YS5zdWJzdHJpbmcoa2V5RGF0YS5sZW5ndGggLSAxNSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke2tleVR5cGV9ICR7dHJ1bmNhdGVkfSAke2NvbW1lbnR9YC50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUcnVuY2F0ZSBjZXJ0aWZpY2F0ZSBmb3IgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjZXJ0IC0gRnVsbCBjZXJ0aWZpY2F0ZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVHJ1bmNhdGVkIGNlcnRpZmljYXRlIGluIHNpbmdsZSBsaW5lIGZvcm1hdFxuICAgICAqL1xuICAgIHRydW5jYXRlQ2VydGlmaWNhdGUoY2VydCkge1xuICAgICAgICBpZiAoIWNlcnQgfHwgY2VydC5sZW5ndGggPCAxMDApIHtcbiAgICAgICAgICAgIHJldHVybiBjZXJ0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsaW5lcyA9IGNlcnQuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEV4dHJhY3QgZmlyc3QgYW5kIGxhc3QgbWVhbmluZ2Z1bCBsaW5lc1xuICAgICAgICBjb25zdCBmaXJzdExpbmUgPSBsaW5lc1swXSB8fCAnJztcbiAgICAgICAgY29uc3QgbGFzdExpbmUgPSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBjZXJ0aWZpY2F0ZXMsIHNob3cgYmVnaW4gYW5kIGVuZCBtYXJrZXJzXG4gICAgICAgIGlmIChmaXJzdExpbmUuaW5jbHVkZXMoJ0JFR0lOIENFUlRJRklDQVRFJykpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtmaXJzdExpbmV9Li4uJHtsYXN0TGluZX1gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3Igb3RoZXIgZm9ybWF0cywgdHJ1bmNhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgY29uc3QgY2xlYW5DZXJ0ID0gY2VydC5yZXBsYWNlKC9cXG4vZywgJyAnKS50cmltKCk7XG4gICAgICAgIGlmIChjbGVhbkNlcnQubGVuZ3RoID4gODApIHtcbiAgICAgICAgICAgIHJldHVybiBjbGVhbkNlcnQuc3Vic3RyaW5nKDAsIDQwKSArICcuLi4nICsgY2xlYW5DZXJ0LnN1YnN0cmluZyhjbGVhbkNlcnQubGVuZ3RoIC0gMzApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2xlYW5DZXJ0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgZm9yIHNhZmUgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBtYXAgPSB7XG4gICAgICAgICAgICAnJic6ICcmYW1wOycsXG4gICAgICAgICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICAgICAgICc+JzogJyZndDsnLFxuICAgICAgICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICAgICAgICBcIidcIjogJyYjMDM5OydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZSgvWyY8PlwiJ10vZywgbSA9PiBtYXBbbV0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdywgaGlkZSBzc2ggcGFzc3dvcmQgc2VnbWVudCBhY2NvcmRpbmcgdG8gdGhlIHZhbHVlIG9mIHVzZSBTU0ggcGFzc3dvcmQgY2hlY2tib3guXG4gICAgICovXG4gICAgc2hvd0hpZGVTU0hQYXNzd29yZCgpe1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZFNlZ21lbnQuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZFNlZ21lbnQuc2hvdygpO1xuICAgICAgICB9XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogUHJlcGFyZXMgZGF0YSBmb3IgUkVTVCBBUEkgc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cbiAgICAgICAgLy8gSGFuZGxlIHByaXZhdGUga2V5IGZpZWxkXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5XRUJIVFRQU1ByaXZhdGVLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgcHJpdmF0ZUtleVZhbHVlID0gcmVzdWx0LmRhdGEuV0VCSFRUUFNQcml2YXRlS2V5O1xuICAgICAgICAgICAgLy8gT25seSBza2lwIHNlbmRpbmcgaWYgdGhlIHZhbHVlIGVxdWFscyBoaWRkZW4gcGFzc3dvcmQgKHVuY2hhbmdlZClcbiAgICAgICAgICAgIC8vIFNlbmQgZW1wdHkgc3RyaW5nIHRvIGNsZWFyIHRoZSBwcml2YXRlIGtleSBvbiBzZXJ2ZXJcbiAgICAgICAgICAgIGlmIChwcml2YXRlS2V5VmFsdWUgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS5XRUJIVFRQU1ByaXZhdGVLZXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFbXB0eSBzdHJpbmcgJycgd2lsbCBiZSBzZW50IHRvIGNsZWFyIHRoZSBjZXJ0aWZpY2F0ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRm9yIHB1YmxpYyBrZXkgLSBzZW5kIGVtcHR5IHZhbHVlcyB0byBhbGxvdyBjbGVhcmluZ1xuICAgICAgICAvLyBEbyBub3QgZGVsZXRlIGVtcHR5IHN0cmluZ3MgLSB0aGV5IG1lYW4gdXNlciB3YW50cyB0byBjbGVhciB0aGUgY2VydGlmaWNhdGVcblxuICAgICAgICAvLyBDbGVhbiB1cCB1bm5lY2Vzc2FyeSBmaWVsZHMgYmVmb3JlIHNlbmRpbmdcbiAgICAgICAgY29uc3QgZmllbGRzVG9SZW1vdmUgPSBbXG4gICAgICAgICAgICAnZGlycnR5JyxcbiAgICAgICAgICAgICdkZWxldGVBbGxJbnB1dCcsXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gUmVtb3ZlIGNvZGVjXyogZmllbGRzICh0aGV5J3JlIHJlcGxhY2VkIHdpdGggdGhlIGNvZGVjcyBhcnJheSlcbiAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0LmRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnY29kZWNfJykgfHwgZmllbGRzVG9SZW1vdmUuaW5jbHVkZXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdlIHNob3VsZCBwcm9jZXNzIGNvZGVjc1xuICAgICAgICAvLyBXaGVuIHNlbmRPbmx5Q2hhbmdlZCBpcyBlbmFibGVkLCBvbmx5IHByb2Nlc3MgY29kZWNzIGlmIHRoZXkgd2VyZSBhY3R1YWxseSBjaGFuZ2VkXG4gICAgICAgIGNvbnN0IHNob3VsZFByb2Nlc3NDb2RlY3MgPSAhRm9ybS5zZW5kT25seUNoYW5nZWQgfHwgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNvZGVjc0NoYW5nZWQ7XG5cbiAgICAgICAgaWYgKHNob3VsZFByb2Nlc3NDb2RlY3MpIHtcbiAgICAgICAgICAgIC8vIENvbGxlY3QgYWxsIGNvZGVjIGRhdGEgd2hlbiB0aGV5J3ZlIGJlZW4gY2hhbmdlZFxuICAgICAgICAgICAgY29uc3QgYXJyQ29kZWNzID0gW107XG5cbiAgICAgICAgICAgIC8vIFByb2Nlc3MgYWxsIGNvZGVjIHJvd3NcbiAgICAgICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUgLmNvZGVjLXJvdywgI3ZpZGVvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93JykuZWFjaCgoY3VycmVudEluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb2RlY05hbWUgPSAkKG9iaikuYXR0cignZGF0YS1jb2RlYy1uYW1lJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNvZGVjTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50RGlzYWJsZWQgPSAkKG9iaikuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIHVuY2hlY2tlZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGFyckNvZGVjcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvZGVjTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBjdXJyZW50RGlzYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogY3VycmVudEluZGV4LFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5jbHVkZSBjb2RlY3MgaWYgdGhleSB3ZXJlIGNoYW5nZWQgb3Igc2VuZE9ubHlDaGFuZ2VkIGlzIGZhbHNlXG4gICAgICAgICAgICBpZiAoYXJyQ29kZWNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb2RlY3MgPSBhcnJDb2RlY3M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEhhbmRsZXMgUkVTVCBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgICQoXCIjZXJyb3ItbWVzc2FnZXNcIikucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmU6IHsgcmVzdWx0OiBib29sLCBkYXRhOiB7fSwgbWVzc2FnZXM6IHt9IH1cbiAgICAgICAgaWYgKCFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5nZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwocmVzcG9uc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIGZpZWxkcyB0byBoaWRkZW4gdmFsdWUgb24gc3VjY2Vzc1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgcGFzc3dvcmQgdmFsaWRhdGlvbiB3YXJuaW5ncyBhZnRlciBzdWNjZXNzZnVsIHNhdmVcbiAgICAgICAgICAgICQoJy5wYXNzd29yZC12YWxpZGF0ZScpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGRlbGV0ZSBhbGwgY29uZGl0aW9ucyBpZiBuZWVkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY2hlY2tEZWxldGVDb25kaXRpb25zKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgZXJyb3IgbWVzc2FnZSBIVE1MIGZyb20gUkVTVCBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2Ugd2l0aCBlcnJvciBtZXNzYWdlc1xuICAgICAqL1xuICAgIGdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkaXYgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICd1aSBuZWdhdGl2ZSBtZXNzYWdlJywgaWQ6ICdlcnJvci1tZXNzYWdlcycgfSk7XG4gICAgICAgICAgICBjb25zdCAkaGVhZGVyID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAnaGVhZGVyJyB9KS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5nc19FcnJvclNhdmVTZXR0aW5ncyk7XG4gICAgICAgICAgICAkZGl2LmFwcGVuZCgkaGVhZGVyKTtcbiAgICAgICAgICAgIGNvbnN0ICR1bCA9ICQoJzx1bD4nLCB7IGNsYXNzOiAnbGlzdCcgfSk7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlc1NldCA9IG5ldyBTZXQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIGJvdGggZXJyb3IgYW5kIHZhbGlkYXRpb24gbWVzc2FnZSB0eXBlc1xuICAgICAgICAgICAgWydlcnJvcicsICd2YWxpZGF0aW9uJ10uZm9yRWFjaChtc2dUeXBlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZXMgPSBBcnJheS5pc0FycmF5KHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdKSBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gcmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV0gXG4gICAgICAgICAgICAgICAgICAgICAgICA6IFtyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXV07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlcy5mb3JFYWNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZXh0Q29udGVudCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiYgZXJyb3IubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50ID0gZ2xvYmFsVHJhbnNsYXRlW2Vycm9yLm1lc3NhZ2VdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGdsb2JhbFRyYW5zbGF0ZVtlcnJvcl07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbWVzc2FnZXNTZXQuaGFzKHRleHRDb250ZW50KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzU2V0LmFkZCh0ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHVsLmFwcGVuZCgkKCc8bGk+JykudGV4dCh0ZXh0Q29udGVudCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJHVsKTtcbiAgICAgICAgICAgICQoJyNzdWJtaXRidXR0b24nKS5iZWZvcmUoJGRpdik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgdmFsaWRhdGlvbiBydWxlcyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRSdWxlcygpIHtcbiAgICAgICAgLy8gU1NIUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcztcbiAgICAgICAgfSBlbHNlIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdlYkFkbWluUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuV2ViQWRtaW5QYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkud2ViQWRtaW5QYXNzd29yZFJ1bGVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBjZXJ0aWZpY2F0ZSBkZXRhaWxzIEhUTUxcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY2VydEluZm8gLSBDZXJ0aWZpY2F0ZSBpbmZvcm1hdGlvbiBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGZvciBjZXJ0aWZpY2F0ZSBkZXRhaWxzXG4gICAgICovXG4gICAgcmVuZGVyQ2VydGlmaWNhdGVEZXRhaWxzKGNlcnRJbmZvKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJjZXJ0LWRldGFpbHNcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTsgbWFyZ2luLXRvcDoxMHB4O1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHRpbnkgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJqZWN0XG4gICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+U3ViamVjdDo8L3N0cm9uZz4gJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjZXJ0SW5mby5zdWJqZWN0KX08L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJc3N1ZXJcbiAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3Vlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPklzc3Vlcjo8L3N0cm9uZz4gJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjZXJ0SW5mby5pc3N1ZXIpfWA7XG4gICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICcgPHNwYW4gY2xhc3M9XCJ1aSB0aW55IGxhYmVsXCI+U2VsZi1zaWduZWQ8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkaXR5IHBlcmlvZFxuICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfZnJvbSAmJiBjZXJ0SW5mby52YWxpZF90bykge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPlZhbGlkOjwvc3Ryb25nPiAke2NlcnRJbmZvLnZhbGlkX2Zyb219IHRvICR7Y2VydEluZm8udmFsaWRfdG99PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXhwaXJ5IHN0YXR1c1xuICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgcmVkIGxhYmVsXCI+Q2VydGlmaWNhdGUgRXhwaXJlZDwvc3Bhbj48L2Rpdj4nO1xuICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5IDw9IDMwKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSB5ZWxsb3cgbGFiZWxcIj5FeHBpcmVzIGluICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXM8L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IGdyZWVuIGxhYmVsXCI+VmFsaWQgZm9yICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXM8L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3ViamVjdCBBbHRlcm5hdGl2ZSBOYW1lc1xuICAgICAgICBpZiAoY2VydEluZm8uc2FuICYmIGNlcnRJbmZvLnNhbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+QWx0ZXJuYXRpdmUgTmFtZXM6PC9zdHJvbmc+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGxpc3RcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OjEwcHg7XCI+JztcbiAgICAgICAgICAgIGNlcnRJbmZvLnNhbi5mb3JFYWNoKHNhbiA9PiB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj4ke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKHNhbil9PC9kaXY+YDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2UgbGlzdFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBzZWdtZW50XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIGNlcnQtZGV0YWlsc1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIEFNSS9BSkFNIGRlcGVuZGVuY3lcbiAgICAgKiBBSkFNIHJlcXVpcmVzIEFNSSB0byBiZSBlbmFibGVkIHNpbmNlIGl0J3MgYW4gSFRUUCB3cmFwcGVyIG92ZXIgQU1JXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFNSUFKQU1EZXBlbmRlbmN5KCkge1xuICAgICAgICBjb25zdCAkYW1pQ2hlY2tib3ggPSAkKCcjQU1JRW5hYmxlZCcpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0ICRhamFtQ2hlY2tib3ggPSAkKCcjQUpBTUVuYWJsZWQnKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRhbWlDaGVja2JveC5sZW5ndGggPT09IDAgfHwgJGFqYW1DaGVja2JveC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRnVuY3Rpb24gdG8gdXBkYXRlIEFKQU0gc3RhdGUgYmFzZWQgb24gQU1JIHN0YXRlXG4gICAgICAgIGNvbnN0IHVwZGF0ZUFKQU1TdGF0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlzQU1JRW5hYmxlZCA9ICRhbWlDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWlzQU1JRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIElmIEFNSSBpcyBkaXNhYmxlZCwgZGlzYWJsZSBBSkFNIGFuZCBtYWtlIGl0IHJlYWQtb25seVxuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCB0b29sdGlwIHRvIGV4cGxhaW4gd2h5IGl0J3MgZGlzYWJsZWRcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmF0dHIoJ2RhdGEtdG9vbHRpcCcsIGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNUmVxdWlyZXNBTUkpO1xuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3guYXR0cignZGF0YS1wb3NpdGlvbicsICd0b3AgbGVmdCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBBTUkgaXMgZW5hYmxlZCwgYWxsb3cgQUpBTSB0byBiZSB0b2dnbGVkXG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LnJlbW92ZUF0dHIoJ2RhdGEtdG9vbHRpcCcpO1xuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3gucmVtb3ZlQXR0cignZGF0YS1wb3NpdGlvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCBzdGF0ZVxuICAgICAgICB1cGRhdGVBSkFNU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbiBmb3IgQU1JIGNoZWNrYm94IGNoYW5nZXMgdXNpbmcgZXZlbnQgZGVsZWdhdGlvblxuICAgICAgICAvLyBUaGlzIHdvbid0IG92ZXJyaWRlIGV4aXN0aW5nIGhhbmRsZXJzXG4gICAgICAgICQoJyNBTUlFbmFibGVkJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdXBkYXRlQUpBTVN0YXRlKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgUEJYTGFuZ3VhZ2UgY2hhbmdlIGRldGVjdGlvbiBmb3IgcmVzdGFydCB3YXJuaW5nXG4gICAgICogU2hvd3MgcmVzdGFydCB3YXJuaW5nIG9ubHkgd2hlbiB0aGUgbGFuZ3VhZ2UgdmFsdWUgY2hhbmdlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmcoKSB7XG4gICAgICAgIGNvbnN0ICRsYW5ndWFnZUlucHV0ID0gJCgnI1BCWExhbmd1YWdlJyk7ICAvLyBIaWRkZW4gaW5wdXRcbiAgICAgICAgY29uc3QgJGxhbmd1YWdlRHJvcGRvd24gPSAkKCcjUEJYTGFuZ3VhZ2UtZHJvcGRvd24nKTsgIC8vIFY1LjAgcGF0dGVybiBkcm9wZG93blxuICAgICAgICBjb25zdCAkcmVzdGFydFdhcm5pbmcgPSAkKCcjcmVzdGFydC13YXJuaW5nLVBCWExhbmd1YWdlJyk7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgdmFsdWUgYW5kIGRhdGEgbG9hZGVkIGZsYWdcbiAgICAgICAgbGV0IG9yaWdpbmFsVmFsdWUgPSBudWxsO1xuICAgICAgICBsZXQgaXNEYXRhTG9hZGVkID0gZmFsc2U7XG5cbiAgICAgICAgLy8gSGlkZSB3YXJuaW5nIGluaXRpYWxseVxuICAgICAgICAkcmVzdGFydFdhcm5pbmcuaGlkZSgpO1xuXG4gICAgICAgIC8vIFNldCBvcmlnaW5hbCB2YWx1ZSBhZnRlciBkYXRhIGxvYWRzXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdHZW5lcmFsU2V0dGluZ3MuZGF0YUxvYWRlZCcsICgpID0+IHtcbiAgICAgICAgICAgIG9yaWdpbmFsVmFsdWUgPSAkbGFuZ3VhZ2VJbnB1dC52YWwoKTtcbiAgICAgICAgICAgIGlzRGF0YUxvYWRlZCA9IHRydWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBkcm9wZG93biBjaGFuZ2UgZXZlbnQgLSB1c2UgVjUuMCBkcm9wZG93biBzZWxlY3RvclxuICAgICAgICAkbGFuZ3VhZ2VEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gU2VtYW50aWNVSURyb3Bkb3duIGF1dG9tYXRpY2FsbHkgc3luY3MgaGlkZGVuIGlucHV0IHZhbHVlXG4gICAgICAgICAgICAgICAgLy8gTm8gbmVlZCB0byBtYW51YWxseSB1cGRhdGUgJGxhbmd1YWdlSW5wdXRcblxuICAgICAgICAgICAgICAgIC8vIE9ubHkgc2hvdyB3YXJuaW5nIGFmdGVyIGRhdGEgaXMgbG9hZGVkIGFuZCB2YWx1ZSBjaGFuZ2VkIGZyb20gb3JpZ2luYWxcbiAgICAgICAgICAgICAgICBpZiAoaXNEYXRhTG9hZGVkICYmIG9yaWdpbmFsVmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IG9yaWdpbmFsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJlc3RhcnRXYXJuaW5nLnRyYW5zaXRpb24oJ2ZhZGUgaW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzRGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgICAgICAgICAkcmVzdGFydFdhcm5pbmcudHJhbnNpdGlvbignZmFkZSBvdXQnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIGRldGVjdGlvbiBvbmx5IGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICAgICAgaWYgKGlzRGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgUkVTVCBBUEkgbW9kZVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEdlbmVyYWxTZXR0aW5nc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVTZXR0aW5ncyc7XG5cbiAgICAgICAgLy8gRW5hYmxlIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvbiBmb3IgY2xlYW5lciBBUEkgcmVxdWVzdHNcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG5cbiAgICAgICAgLy8gRW5hYmxlIHNlbmRpbmcgb25seSBjaGFuZ2VkIGZpZWxkcyBmb3Igb3B0aW1hbCBQQVRDSCBzZW1hbnRpY3NcbiAgICAgICAgRm9ybS5zZW5kT25seUNoYW5nZWQgPSB0cnVlO1xuXG4gICAgICAgIC8vIE5vIHJlZGlyZWN0IGFmdGVyIHNhdmUgLSBzdGF5IG9uIHRoZSBzYW1lIHBhZ2VcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gbnVsbDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IG51bGw7XG4gICAgICAgIEZvcm0udXJsID0gYCNgO1xuICAgICAgICBcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBnZW5lcmFsU2V0dGluZ3MgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==