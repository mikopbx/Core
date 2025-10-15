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
      // The field will contain '********' if a private key is set


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJjb2RlY3NDaGFuZ2VkIiwiZGF0YUxvYWRlZCIsInZhbGlkYXRlUnVsZXMiLCJwYnhuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lIiwiV2ViQWRtaW5QYXNzd29yZCIsIldlYkFkbWluUGFzc3dvcmRSZXBlYXQiLCJnc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50IiwiU1NIUGFzc3dvcmQiLCJTU0hQYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJXRUJQb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJXRUJIVFRQU1BvcnQiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0IiwiQUpBTVBvcnQiLCJnc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSIsIlNJUEF1dGhQcmVmaXgiLCJnc19TSVBBdXRoUHJlZml4SW52YWxpZCIsIndlYkFkbWluUGFzc3dvcmRSdWxlcyIsImdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkIiwidmFsdWUiLCJnc19QYXNzd29yZHMiLCJwc3dfUGFzc3dvcmROb0xvd1NpbXZvbCIsInBzd19QYXNzd29yZE5vTnVtYmVycyIsInBzd19QYXNzd29yZE5vVXBwZXJTaW12b2wiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3MiLCJnc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQiLCJnc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCIsImdzX1NTSFBhc3N3b3JkIiwiYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3MiLCJjbGlwYm9hcmQiLCJpbml0aWFsaXplIiwibGVuZ3RoIiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwiY29udGV4dCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwidmFsaWRhdGVPbklucHV0Iiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwiY2hlY2tPbkxvYWQiLCJzc2hXaWRnZXQiLCJvbiIsImlzRGlzYWJsZWQiLCJjaGVja2JveCIsImhpZGVXYXJuaW5ncyIsImVsZW1lbnRzIiwiJHNjb3JlU2VjdGlvbiIsImhpZGUiLCJjaGVja1Bhc3N3b3JkIiwidmFsIiwiaW5pdFJ1bGVzIiwiZmluZCIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsImluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmciLCJub3QiLCJkcm9wZG93biIsImluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcyIsImluaXRpYWxpemVDbGlwYm9hcmQiLCJzaG93SGlkZVNTSFBhc3N3b3JkIiwid2luZG93IiwiZXZlbnQiLCJuYW1lVGFiIiwiR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJsb2FkRGF0YSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMiLCJGb3JtIiwic2hvd0xvYWRpbmdTdGF0ZSIsIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsInBhc3N3b3JkVmFsaWRhdGlvbiIsInNldFRpbWVvdXQiLCJzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MiLCJtZXNzYWdlcyIsImNvbnNvbGUiLCJlcnJvciIsInNob3dBcGlFcnJvciIsInNldHRpbmdzIiwiY29kZWNzIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJwb3B1bGF0ZVNwZWNpYWxGaWVsZHMiLCJsb2FkU291bmRGaWxlVmFsdWVzIiwidXBkYXRlQ29kZWNUYWJsZXMiLCJpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNzaEtleXNUYWJsZSIsImRvY3VtZW50IiwidHJpZ2dlciIsIldFQkhUVFBTUHVibGljS2V5X2luZm8iLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsIiRjaGVja2JveCIsImlzQ2hlY2tlZCIsIiRkcm9wZG93biIsImhhc0NsYXNzIiwiZm9ybSIsImVycm9yTWVzc2FnZSIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInZhbGlkYXRpb24iLCJyZW1vdmUiLCJpc0RlZmF1bHRXZWJQYXNzd29yZCIsIiR3ZWJQYXNzd29yZEZpZWxkcyIsImNsb3Nlc3QiLCJ3YXJuaW5nSHRtbCIsInBzd19TZXRQYXNzd29yZCIsInBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmQiLCJiZWZvcmUiLCJpc0RlZmF1bHRTU0hQYXNzd29yZCIsInNzaFBhc3N3b3JkRGlzYWJsZWQiLCIkc3NoUGFzc3dvcmRGaWVsZHMiLCJkYXRhSW4iLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJkYXRhT3V0IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IiwiYXVkaW9Db2RlY3MiLCJmaWx0ZXIiLCJjIiwic29ydCIsImEiLCJiIiwicHJpb3JpdHkiLCJ2aWRlb0NvZGVjcyIsImJ1aWxkQ29kZWNUYWJsZSIsInNob3ciLCJpbml0aWFsaXplQ29kZWNEcmFnRHJvcCIsIiR0YWJsZUJvZHkiLCJlbXB0eSIsImNvZGVjIiwiaW5kZXgiLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGVja2VkIiwicm93SHRtbCIsImVzY2FwZUh0bWwiLCJkZXNjcmlwdGlvbiIsImFwcGVuZCIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkIiwiJGNlcnRQdWJLZXlGaWVsZCIsImZ1bGxWYWx1ZSIsIiRjb250YWluZXIiLCJjZXJ0SW5mbyIsImRpc3BsYXlUZXh0IiwicGFydHMiLCJzdWJqZWN0IiwicHVzaCIsImlzc3VlciIsImlzX3NlbGZfc2lnbmVkIiwidmFsaWRfdG8iLCJpc19leHBpcmVkIiwiZGF5c191bnRpbF9leHBpcnkiLCJ0cnVuY2F0ZUNlcnRpZmljYXRlIiwic3RhdHVzQ2xhc3MiLCJkaXNwbGF5SHRtbCIsImJ0X1Rvb2xUaXBDb3B5Q2VydCIsImJ0X1Rvb2xUaXBDZXJ0SW5mbyIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsInJlbmRlckNlcnRpZmljYXRlRGV0YWlscyIsImdzX1Bhc3RlUHVibGljQ2VydCIsImJ0X1NhdmUiLCJidF9DYW5jZWwiLCJlIiwicHJldmVudERlZmF1bHQiLCIkZGV0YWlscyIsInNsaWRlVG9nZ2xlIiwiZm9jdXMiLCJuZXdWYWx1ZSIsImNoZWNrVmFsdWVzIiwicG9wdXAiLCJkZXN0cm95IiwiYXR0ciIsIm9mZiIsIiRzc2hQdWJLZXlGaWVsZCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiYnRfVG9vbFRpcENvcHlLZXkiLCJidF9Ub29sVGlwRXhwYW5kIiwiJGZ1bGxEaXNwbGF5IiwiJHRydW5jYXRlZERpc3BsYXkiLCIkaWNvbiIsImlzIiwiYWRkQ2xhc3MiLCJnc19Ob1NTSFB1YmxpY0tleSIsIiRjZXJ0UHJpdktleUZpZWxkIiwiY3VycmVudFZhbHVlIiwiaGFzVmFsdWUiLCJnc19Qcml2YXRlS2V5SXNTZXQiLCJnc19SZXBsYWNlIiwiZ3NfUGFzdGVQcml2YXRlS2V5IiwiJG5ld0ZpZWxkIiwiQ2xpcGJvYXJkSlMiLCIkYnRuIiwib3JpZ2luYWxJY29uIiwiY2xlYXJTZWxlY3Rpb24iLCJnc19Db3B5RmFpbGVkIiwic3BsaXQiLCJrZXlUeXBlIiwia2V5RGF0YSIsImNvbW1lbnQiLCJzbGljZSIsInN1YnN0cmluZyIsInRyaW0iLCJjZXJ0IiwibGluZXMiLCJsaW5lIiwiZmlyc3RMaW5lIiwibGFzdExpbmUiLCJpbmNsdWRlcyIsImNsZWFuQ2VydCIsInJlcGxhY2UiLCJ0ZXh0IiwibWFwIiwibSIsImNiQmVmb3JlU2VuZEZvcm0iLCJXRUJIVFRQU1ByaXZhdGVLZXkiLCJ1bmRlZmluZWQiLCJwcml2YXRlS2V5VmFsdWUiLCJmaWVsZHNUb1JlbW92ZSIsInN0YXJ0c1dpdGgiLCJzaG91bGRQcm9jZXNzQ29kZWNzIiwic2VuZE9ubHlDaGFuZ2VkIiwiYXJyQ29kZWNzIiwiZWFjaCIsImN1cnJlbnRJbmRleCIsIm9iaiIsImNvZGVjTmFtZSIsImN1cnJlbnREaXNhYmxlZCIsImNiQWZ0ZXJTZW5kRm9ybSIsIiRzdWJtaXRCdXR0b24iLCJnZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwiLCJmYWRlT3V0IiwiZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsIiwiY2hlY2tEZWxldGVDb25kaXRpb25zIiwiJGRpdiIsImlkIiwiJGhlYWRlciIsImdzX0Vycm9yU2F2ZVNldHRpbmdzIiwiJHVsIiwibWVzc2FnZXNTZXQiLCJTZXQiLCJtc2dUeXBlIiwidGV4dENvbnRlbnQiLCJtZXNzYWdlIiwiaGFzIiwiYWRkIiwiaHRtbCIsInZhbGlkX2Zyb20iLCJzYW4iLCIkYW1pQ2hlY2tib3giLCIkYWphbUNoZWNrYm94IiwidXBkYXRlQUpBTVN0YXRlIiwiaXNBTUlFbmFibGVkIiwiZ3NfQUpBTVJlcXVpcmVzQU1JIiwicmVtb3ZlQXR0ciIsIiRsYW5ndWFnZUlucHV0IiwiJGxhbmd1YWdlRHJvcGRvd24iLCIkcmVzdGFydFdhcm5pbmciLCJvcmlnaW5hbFZhbHVlIiwiaXNEYXRhTG9hZGVkIiwidHJhbnNpdGlvbiIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInVybCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFHQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxxQkFBcUIsR0FBRztBQUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxlOztBQU8xQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRUQsQ0FBQyxDQUFDLG1CQUFELENBWE07O0FBYTFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFlBQVksRUFBRUYsQ0FBQyxDQUFDLGNBQUQsQ0FqQlc7O0FBbUIxQjtBQUNKO0FB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dGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGFzc3dvcmRTY29yZSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSwgU291bmRGaWxlU2VsZWN0b3IsIEdlbmVyYWxTZXR0aW5nc0FQSSwgQ2xpcGJvYXJkSlMsIFBhc3N3b3JkV2lkZ2V0LCBQYXNzd29yZHNBUEksIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyLCAkICovXG5cbi8qKlxuICogQSBtb2R1bGUgdG8gaGFuZGxlIG1vZGlmaWNhdGlvbiBvZiBnZW5lcmFsIHNldHRpbmdzLlxuICovXG5jb25zdCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBhZG1pbiBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR3ZWJBZG1pblBhc3N3b3JkOiAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZDogJCgnI1NTSFBhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgd2ViIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXNhYmxlU1NIUGFzc3dvcmQ6ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5wYXJlbnQoJy5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZFNlZ21lbnQ6ICQoJyNvbmx5LWlmLXBhc3N3b3JkLWVuYWJsZWQnKSxcblxuICAgIC8qKlxuICAgICAqIElmIHBhc3N3b3JkIHNldCwgaXQgd2lsbCBiZSBoaWRlZCBmcm9tIHdlYiB1aS5cbiAgICAgKi9cbiAgICBoaWRkZW5QYXNzd29yZDogJyoqKioqKioqJyxcblxuICAgIC8qKlxuICAgICAqIFNvdW5kIGZpbGUgZmllbGQgSURzXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBzb3VuZEZpbGVGaWVsZHM6IHtcbiAgICAgICAgYW5ub3VuY2VtZW50SW46ICdQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbicsXG4gICAgICAgIGFubm91bmNlbWVudE91dDogJ1BCWFJlY29yZEFubm91bmNlbWVudE91dCdcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIE9yaWdpbmFsIGNvZGVjIHN0YXRlIGZyb20gbGFzdCBsb2FkXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBvcmlnaW5hbENvZGVjU3RhdGU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBjb2RlY3MgaGF2ZSBiZWVuIGNoYW5nZWRcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBjb2RlY3NDaGFuZ2VkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgZGF0YSBoYXMgYmVlbiBsb2FkZWQgZnJvbSBBUElcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBkYXRhTG9hZGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczogeyAvLyBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlc1xuICAgICAgICBwYnhuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnUEJYTmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgV2ViQWRtaW5QYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXRjaFtXZWJBZG1pblBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFNTSFBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU1NIUGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbU1NIUGFzc3dvcmRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQlBvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCSFRUUFNQb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCSFRUUFNQb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV0VCSFRUUFNQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBBSkFNUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ0FKQU1Qb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgU0lQQXV0aFByZWZpeDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NJUEF1dGhQcmVmaXgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bYS16QS1aXSokL10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4SW52YWxpZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgd2ViIGFkbWluIHBhc3N3b3JkIGZpZWxkIHdoZW4gaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgd2ViQWRtaW5QYXNzd29yZFJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5V2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1tBLVpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcbiAgICAvLyBSdWxlcyBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZCB3aGVuIFNTSCBsb2dpbiB0aHJvdWdoIHRoZSBwYXNzd29yZCBlbmFibGVkLCBhbmQgaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1xcZC8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGRpc2FibGVkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfVxuICAgIF0sXG5cbiAgICAvKipcbiAgICAgKiBDbGlwYm9hcmQgaW5zdGFuY2UgZm9yIGNvcHkgZnVuY3Rpb25hbGl0eVxuICAgICAqIEB0eXBlIHtDbGlwYm9hcmRKU31cbiAgICAgKi9cbiAgICBjbGlwYm9hcmQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogIEluaXRpYWxpemUgbW9kdWxlIHdpdGggZXZlbnQgYmluZGluZ3MgYW5kIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldHNcbiAgICAgICAgLy8gV2ViIEFkbWluIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC5pbml0KGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZCwge1xuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdnZW5lcmFsX3dlYicsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogZmFsc2UsICAgICAvLyBObyBzaG93L2hpZGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU1NIIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc3NoV2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLCB7XG4gICAgICAgICAgICAgICAgY29udGV4dDogJ2dlbmVyYWxfc3NoJyxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSwgICAgIC8vIE5vIHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgU1NIIGRpc2FibGUgY2hlY2tib3hcbiAgICAgICAgICAgICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuaGlkZVdhcm5pbmdzKHNzaFdpZGdldCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzc2hXaWRnZXQuZWxlbWVudHMuJHNjb3JlU2VjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3NoV2lkZ2V0LmVsZW1lbnRzLiRzY29yZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuY2hlY2tQYXNzd29yZChzc2hXaWRnZXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyB3aGVuIHBhc3N3b3JkcyBjaGFuZ2VcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUEJYTGFuZ3VhZ2UgZHJvcGRvd24gZmlyc3Qgd2l0aCBzcGVjaWFsIGhhbmRsZXJcbiAgICAgICAgLy8gTXVzdCBiZSBkb25lIGJlZm9yZSBnZW5lcmFsIGRyb3Bkb3duIGluaXRpYWxpemF0aW9uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nKCk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGRyb3Bkb3ducyBvbiB0aGUgZm9ybSAoZXhjZXB0IHNvdW5kIGZpbGUgc2VsZWN0b3JzIGFuZCBsYW5ndWFnZSBkcm9wZG93bilcbiAgICAgICAgLy8gTGFuZ3VhZ2UgZHJvcGRvd24gYWxyZWFkeSBpbml0aWFsaXplZCBhYm92ZSB3aXRoIHNwZWNpYWwgb25DaGFuZ2UgaGFuZGxlclxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5kcm9wZG93bicpXG4gICAgICAgICAgICAubm90KCcuYXVkaW8tbWVzc2FnZS1zZWxlY3QnKVxuICAgICAgICAgICAgLm5vdCgnI1BCWExhbmd1YWdlLWRyb3Bkb3duJylcbiAgICAgICAgICAgIC5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveGVzIG9uIHRoZSBmb3JtXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgQU1JL0FKQU0gZGVwZW5kZW5jeSBhZnRlciBjaGVja2JveGVzIGFyZSBpbml0aWFsaXplZFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUFNSUFKQU1EZXBlbmRlbmN5KCk7XG5cbiAgICAgICAgLy8gQ29kZWMgdGFibGUgZHJhZy1uLWRyb3Agd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKSB3aGljaCBpcyBjYWxsZWQgZnJvbSB1cGRhdGVDb2RlY1RhYmxlcygpXG5cbiAgICAgICAgLy8gU291bmQgZmlsZSBzZWxlY3RvcnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBSRVNUIEFQSSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgbG9hZFNvdW5kRmlsZVZhbHVlcygpIG1ldGhvZCBjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RlOiBTU0gga2V5cyB0YWJsZSB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgbG9hZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyBkaXNwbGF5XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgY29weSBidXR0b25zXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhZGRpdGlvbmFsIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuXG4gICAgICAgIC8vIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goe1xuICAgICAgICAgICAgJ29uQ2hhbmdlJzogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmRcbiAgICAgICAgfSk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIHRvIGhhbmRsZSB0YWIgYWN0aXZhdGlvblxuICAgICAgICAkKHdpbmRvdykub24oJ0dTLUFjdGl2YXRlVGFiJywgKGV2ZW50LCBuYW1lVGFiKSA9PiB7XG4gICAgICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoJ2NoYW5nZSB0YWInLCBuYW1lVGFiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBpZiAodHlwZW9mIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVG9vbHRpcCBjbGljayBiZWhhdmlvciBpcyBub3cgaGFuZGxlZCBnbG9iYWxseSBpbiBUb29sdGlwQnVpbGRlci5qc1xuXG4gICAgICAgIC8vIFBCWExhbmd1YWdlIGRyb3Bkb3duIHdpdGggcmVzdGFydCB3YXJuaW5nIGFscmVhZHkgaW5pdGlhbGl6ZWQgYWJvdmVcblxuICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSBBUEkgaW5zdGVhZCBvZiB1c2luZyBzZXJ2ZXItcmVuZGVyZWQgdmFsdWVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggcGxheWJhY2sgZnVuY3Rpb25hbGl0eSB1c2luZyBTb3VuZEZpbGVTZWxlY3RvclxuICAgICAqIEhUTUwgc3RydWN0dXJlIGlzIHByb3ZpZGVkIGJ5IHRoZSBwbGF5QWRkTmV3U291bmRXaXRoSWNvbnMgcGFydGlhbCBpbiByZWNvcmRpbmcudm9sdDpcbiAgICAgKiAtIEhpZGRlbiBpbnB1dDogPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCIgbmFtZT1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCI+XG4gICAgICogLSBEcm9wZG93biBkaXY6IDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gc2VhcmNoIFBCWFJlY29yZEFubm91bmNlbWVudEluLWRyb3Bkb3duXCI+XG4gICAgICogLSBQbGF5YmFjayBidXR0b24gYW5kIGFkZCBuZXcgYnV0dG9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9ycygpIHtcbiAgICAgICAgLy8gU291bmQgZmlsZSBzZWxlY3RvcnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9yV2l0aERhdGEoKSBjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKVxuICAgICAgICBcbiAgICAgICAgLy8gVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgY29uc2lzdGVuY3kgYnV0IGFjdHVhbCBpbml0aWFsaXphdGlvbiBoYXBwZW5zXG4gICAgICAgIC8vIHdoZW4gd2UgaGF2ZSBkYXRhIGZyb20gdGhlIHNlcnZlciBpbiBsb2FkU291bmRGaWxlVmFsdWVzKClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBnZW5lcmFsIHNldHRpbmdzIGRhdGEgZnJvbSBBUElcbiAgICAgKiBVc2VkIGJvdGggb24gaW5pdGlhbCBwYWdlIGxvYWQgYW5kIGZvciBtYW51YWwgcmVmcmVzaFxuICAgICAqIENhbiBiZSBjYWxsZWQgYW55dGltZSB0byByZWxvYWQgdGhlIGZvcm0gZGF0YTogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWREYXRhKClcbiAgICAgKi9cbiAgICBsb2FkRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHRoZSBmb3JtIHdpdGggZGltbWVyXG4gICAgICAgIEZvcm0uc2hvd0xvYWRpbmdTdGF0ZSh0cnVlLCAnTG9hZGluZyBzZXR0aW5ncy4uLicpO1xuXG4gICAgICAgIEdlbmVyYWxTZXR0aW5nc0FQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIEZvcm0uaGlkZUxvYWRpbmdTdGF0ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggdGhlIHJlY2VpdmVkIGRhdGFcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5kYXRhTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaG93IHdhcm5pbmdzIGZvciBkZWZhdWx0IHBhc3N3b3JkcyBhZnRlciBET00gdXBkYXRlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEucGFzc3dvcmRWYWxpZGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgdXBkYXRlZCBhZnRlciBwb3B1bGF0ZUZvcm1cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0RlZmF1bHRQYXNzd29yZFdhcm5pbmdzKHJlc3BvbnNlLmRhdGEucGFzc3dvcmRWYWxpZGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQVBJIEVycm9yOicsIHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dBcGlFcnJvcihyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNldHRpbmdzIGRhdGEgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBFeHRyYWN0IHNldHRpbmdzIGFuZCBhZGRpdGlvbmFsIGRhdGFcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBkYXRhLnNldHRpbmdzIHx8IGRhdGE7XG4gICAgICAgIGNvbnN0IGNvZGVjcyA9IGRhdGEuY29kZWNzIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShzZXR0aW5ncywge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNwZWNpYWwgZmllbGQgdHlwZXNcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucG9wdWxhdGVTcGVjaWFsRmllbGRzKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHNvdW5kIGZpbGUgdmFsdWVzIHdpdGggcmVwcmVzZW50YXRpb25zXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWRTb3VuZEZpbGVWYWx1ZXMoZm9ybURhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBjb2RlYyB0YWJsZXNcbiAgICAgICAgICAgICAgICBpZiAoY29kZWNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgZmllbGRzIChoaWRlIGFjdHVhbCBwYXNzd29yZHMpXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVQYXNzd29yZEZpZWxkcyhmb3JtRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIFNTSCBwYXNzd29yZCB2aXNpYmlsaXR5XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmQoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU1NIIGtleXMgdGFibGUgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBzc2hLZXlzVGFibGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBzc2hLZXlzVGFibGUuaW5pdGlhbGl6ZSgnc3NoLWtleXMtY29udGFpbmVyJywgJ1NTSEF1dGhvcml6ZWRLZXlzJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyB3aXRoIG5ldyBkYXRhXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50IHRvIG5vdGlmeSB0aGF0IGRhdGEgaGFzIGJlZW4gbG9hZGVkXG4gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ0dlbmVyYWxTZXR0aW5ncy5kYXRhTG9hZGVkJyk7XG5cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzcGVjaWFsIGZpZWxkIHR5cGVzIHRoYXQgbmVlZCBjdXN0b20gcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVNwZWNpYWxGaWVsZHMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gUHJpdmF0ZSBrZXkgZXhpc3RlbmNlIGlzIG5vdyBkZXRlcm1pbmVkIGJ5IGNoZWNraW5nIGlmIHZhbHVlIGVxdWFscyBISURERU5fUEFTU1dPUkRcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgIGlmIChzZXR0aW5ncy5XRUJIVFRQU1B1YmxpY0tleV9pbmZvKSB7XG4gICAgICAgICAgICAkKCcjV0VCSFRUUFNQdWJsaWNLZXknKS5kYXRhKCdjZXJ0LWluZm8nLCBzZXR0aW5ncy5XRUJIVFRQU1B1YmxpY0tleV9pbmZvKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNoZWNrYm94ZXMgKEFQSSByZXR1cm5zIGJvb2xlYW4gdmFsdWVzKVxuICAgICAgICBPYmplY3Qua2V5cyhzZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJChgIyR7a2V5fWApLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBzZXR0aW5nc1trZXldID09PSB0cnVlIHx8IHNldHRpbmdzW2tleV0gPT09ICcxJyB8fCBzZXR0aW5nc1trZXldID09PSAxO1xuICAgICAgICAgICAgICAgICRjaGVja2JveC5jaGVja2JveChpc0NoZWNrZWQgPyAnY2hlY2snIDogJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIHJlZ3VsYXIgZHJvcGRvd25zIChleGNsdWRpbmcgc291bmQgZmlsZSBzZWxlY3RvcnMgd2hpY2ggYXJlIGhhbmRsZWQgc2VwYXJhdGVseSlcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2tleX1gKS5wYXJlbnQoJy5kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPiAwICYmICEkZHJvcGRvd24uaGFzQ2xhc3MoJ2F1ZGlvLW1lc3NhZ2Utc2VsZWN0JykpIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNldHRpbmdzW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgZmllbGRzIHdpdGggaGlkZGVuIHBhc3N3b3JkIGluZGljYXRvclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGFcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gSGlkZSBhY3R1YWwgcGFzc3dvcmRzIGFuZCBzaG93IGhpZGRlbiBpbmRpY2F0b3JcbiAgICAgICAgaWYgKHNldHRpbmdzLldlYkFkbWluUGFzc3dvcmQgJiYgc2V0dGluZ3MuV2ViQWRtaW5QYXNzd29yZCAhPT0gJycpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoc2V0dGluZ3MuU1NIUGFzc3dvcmQgJiYgc2V0dGluZ3MuU1NIUGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IEFQSSBlcnJvciBtZXNzYWdlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXNzYWdlcyAtIEVycm9yIG1lc3NhZ2VzIGZyb20gQVBJXG4gICAgICovXG4gICAgc2hvd0FwaUVycm9yKG1lc3NhZ2VzKSB7XG4gICAgICAgIGlmIChtZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gQXJyYXkuaXNBcnJheShtZXNzYWdlcy5lcnJvcikgXG4gICAgICAgICAgICAgICAgPyBtZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIFxuICAgICAgICAgICAgICAgIDogbWVzc2FnZXMuZXJyb3I7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyB3YXJuaW5ncyBmb3IgZGVmYXVsdCBwYXNzd29yZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdmFsaWRhdGlvbiAtIFBhc3N3b3JkIHZhbGlkYXRpb24gcmVzdWx0cyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHNob3dEZWZhdWx0UGFzc3dvcmRXYXJuaW5ncyh2YWxpZGF0aW9uKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgcGFzc3dvcmQtdmFsaWRhdGUgbWVzc2FnZXMgZmlyc3RcbiAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHdhcm5pbmcgZm9yIGRlZmF1bHQgV2ViIEFkbWluIHBhc3N3b3JkXG4gICAgICAgIGlmICh2YWxpZGF0aW9uLmlzRGVmYXVsdFdlYlBhc3N3b3JkKSB7XG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBwYXNzd29yZCBmaWVsZHMgZ3JvdXAgLSB0cnkgbXVsdGlwbGUgc2VsZWN0b3JzXG4gICAgICAgICAgICBsZXQgJHdlYlBhc3N3b3JkRmllbGRzID0gJCgnI1dlYkFkbWluUGFzc3dvcmQnKS5jbG9zZXN0KCcudHdvLmZpZWxkcycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHdlYlBhc3N3b3JkRmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSBhbHRlcm5hdGl2ZSBzZWxlY3RvciBpZiB0aGUgZmlyc3Qgb25lIGRvZXNuJ3Qgd29ya1xuICAgICAgICAgICAgICAgICR3ZWJQYXNzd29yZEZpZWxkcyA9ICQoJyNXZWJBZG1pblBhc3N3b3JkJykucGFyZW50KCkucGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkd2ViUGFzc3dvcmRGaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCB3YXJuaW5nSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIGljb24gbWVzc2FnZSBwYXNzd29yZC12YWxpZGF0ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUucHN3X1NldFBhc3N3b3JkfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmR9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5zZXJ0IHdhcm5pbmcgYmVmb3JlIHRoZSBwYXNzd29yZCBmaWVsZHNcbiAgICAgICAgICAgICAgICAkd2ViUGFzc3dvcmRGaWVsZHMuYmVmb3JlKHdhcm5pbmdIdG1sKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGZvciBkZWZhdWx0IFNTSCBwYXNzd29yZFxuICAgICAgICBpZiAodmFsaWRhdGlvbi5pc0RlZmF1bHRTU0hQYXNzd29yZCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgU1NIIHBhc3N3b3JkIGxvZ2luIGlzIGVuYWJsZWRcbiAgICAgICAgICAgIGNvbnN0IHNzaFBhc3N3b3JkRGlzYWJsZWQgPSAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFzc2hQYXNzd29yZERpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkcyBncm91cFxuICAgICAgICAgICAgICAgIGxldCAkc3NoUGFzc3dvcmRGaWVsZHMgPSAkKCcjU1NIUGFzc3dvcmQnKS5jbG9zZXN0KCcudHdvLmZpZWxkcycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkc3NoUGFzc3dvcmRGaWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSBhbHRlcm5hdGl2ZSBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICAkc3NoUGFzc3dvcmRGaWVsZHMgPSAkKCcjU1NIUGFzc3dvcmQnKS5wYXJlbnQoKS5wYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRzc2hQYXNzd29yZEZpZWxkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2FybmluZ0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgaWNvbiBtZXNzYWdlIHBhc3N3b3JkLXZhbGlkYXRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5wc3dfU2V0UGFzc3dvcmR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmR9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgd2FybmluZyBiZWZvcmUgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFuZCBsb2FkIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggZGF0YSwgc2ltaWxhciB0byBJVlIgaW1wbGVtZW50YXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNvdW5kRmlsZVZhbHVlcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBDb252ZXJ0IGVtcHR5IHZhbHVlcyB0byAtMSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICAgIGNvbnN0IGRhdGFJbiA9IHsuLi5zZXR0aW5nc307XG4gICAgICAgIGlmICghc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gfHwgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gPT09ICcnKSB7XG4gICAgICAgICAgICBkYXRhSW4uUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gPSAnLTEnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbmNvbWluZyBhbm5vdW5jZW1lbnQgc2VsZWN0b3Igd2l0aCBkYXRhIChmb2xsb3dpbmcgSVZSIHBhdHRlcm4pXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ1BCWFJlY29yZEFubm91bmNlbWVudEluJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YUluXG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgZW1wdHkgdmFsdWVzIHRvIC0xIGZvciB0aGUgZHJvcGRvd25cbiAgICAgICAgY29uc3QgZGF0YU91dCA9IHsuLi5zZXR0aW5nc307XG4gICAgICAgIGlmICghc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IHx8IHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudE91dCA9PT0gJycpIHtcbiAgICAgICAgICAgIGRhdGFPdXQuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0ID0gJy0xJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3V0Z29pbmcgYW5ub3VuY2VtZW50IHNlbGVjdG9yIHdpdGggZGF0YSAoZm9sbG93aW5nIElWUiBwYXR0ZXJuKVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdQQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhT3V0XG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhbmQgdXBkYXRlIGNvZGVjIHRhYmxlcyB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb2RlY3MgLSBBcnJheSBvZiBjb2RlYyBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcykge1xuICAgICAgICAvLyBSZXNldCBjb2RlYyBjaGFuZ2UgZmxhZyB3aGVuIGxvYWRpbmcgZGF0YVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIGNvZGVjIHN0YXRlIGZvciBjb21wYXJpc29uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNlcGFyYXRlIGF1ZGlvIGFuZCB2aWRlbyBjb2RlY3NcbiAgICAgICAgY29uc3QgYXVkaW9Db2RlY3MgPSBjb2RlY3MuZmlsdGVyKGMgPT4gYy50eXBlID09PSAnYXVkaW8nKS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgIGNvbnN0IHZpZGVvQ29kZWNzID0gY29kZWNzLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ3ZpZGVvJykuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgYXVkaW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUoYXVkaW9Db2RlY3MsICdhdWRpbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgdmlkZW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUodmlkZW9Db2RlY3MsICd2aWRlbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSBsb2FkZXJzIGFuZCBzaG93IHRhYmxlc1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLWxvYWRlciwgI3ZpZGVvLWNvZGVjcy1sb2FkZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUsICN2aWRlby1jb2RlY3MtdGFibGUnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIHJlb3JkZXJpbmdcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb2RlYyB0YWJsZSByb3dzIGZyb20gZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvZGVjcyAtIEFycmF5IG9mIGNvZGVjIG9iamVjdHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtICdhdWRpbycgb3IgJ3ZpZGVvJ1xuICAgICAqL1xuICAgIGJ1aWxkQ29kZWNUYWJsZShjb2RlY3MsIHR5cGUpIHtcbiAgICAgICAgY29uc3QgJHRhYmxlQm9keSA9ICQoYCMke3R5cGV9LWNvZGVjcy10YWJsZSB0Ym9keWApO1xuICAgICAgICAkdGFibGVCb2R5LmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICBjb2RlY3MuZm9yRWFjaCgoY29kZWMsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBzdGF0ZSBmb3IgY2hhbmdlIGRldGVjdGlvblxuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZVtjb2RlYy5uYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXgsXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGNvZGVjLmRpc2FibGVkXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFibGUgcm93XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gY29kZWMuZGlzYWJsZWQgPT09IHRydWUgfHwgY29kZWMuZGlzYWJsZWQgPT09ICcxJyB8fCBjb2RlYy5kaXNhYmxlZCA9PT0gMTtcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrZWQgPSAhaXNEaXNhYmxlZCA/ICdjaGVja2VkJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCByb3dIdG1sID0gYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cImNvZGVjLXJvd1wiIGlkPVwiY29kZWMtJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtpbmRleH1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb2RlYy1uYW1lPVwiJHtjb2RlYy5uYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtb3JpZ2luYWwtcHJpb3JpdHk9XCIke2luZGV4fVwiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJjb2xsYXBzaW5nIGRyYWdIYW5kbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic29ydCBncmV5IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggY29kZWNzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwiY29kZWNfJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2NoZWNrZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmluZGV4PVwiMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJjb2RlY18ke2NvZGVjLm5hbWV9XCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjb2RlYy5kZXNjcmlwdGlvbiB8fCBjb2RlYy5uYW1lKX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICR0YWJsZUJvZHkuYXBwZW5kKHJvd0h0bWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyBmb3IgdGhlIG5ldyByb3dzXG4gICAgICAgICR0YWJsZUJvZHkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgY29kZWNzIGFzIGNoYW5nZWQgYW5kIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIGNvZGVjIHRhYmxlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkge1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlLCAjdmlkZW8tY29kZWNzLXRhYmxlJykudGFibGVEbkQoe1xuICAgICAgICAgICAgb25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnLFxuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGNvZGVjcyBhcyBjaGFuZ2VkIGFuZCBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjZXJ0aWZpY2F0ZSBmaWVsZCBkaXNwbGF5IG9ubHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpIHtcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIG9ubHlcbiAgICAgICAgY29uc3QgJGNlcnRQdWJLZXlGaWVsZCA9ICQoJyNXRUJIVFRQU1B1YmxpY0tleScpO1xuICAgICAgICBpZiAoJGNlcnRQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRjZXJ0UHViS2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGNlcnRpZmljYXRlIGluZm8gaWYgYXZhaWxhYmxlIGZyb20gZGF0YSBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGNlcnRJbmZvID0gJGNlcnRQdWJLZXlGaWVsZC5kYXRhKCdjZXJ0LWluZm8nKSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzIGZvciB0aGlzIGZpZWxkIG9ubHlcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheSwgLmNlcnQtZWRpdC1mb3JtJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbWVhbmluZ2Z1bCBkaXNwbGF5IHRleHQgZnJvbSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgICAgICAgICAgbGV0IGRpc3BsYXlUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHN1YmplY3QvZG9tYWluXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDwn5OcICR7Y2VydEluZm8uc3ViamVjdH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGlzc3VlciBpZiBub3Qgc2VsZi1zaWduZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3VlciAmJiAhY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYGJ5ICR7Y2VydEluZm8uaXNzdWVyfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKCcoU2VsZi1zaWduZWQpJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCB2YWxpZGl0eSBkYXRlc1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4p2MIEV4cGlyZWQgJHtjZXJ0SW5mby52YWxpZF90b31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDimqDvuI8gRXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKchSBWYWxpZCB1bnRpbCAke2NlcnRJbmZvLnZhbGlkX3RvfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IHBhcnRzLmpvaW4oJyB8ICcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRydW5jYXRlZCBjZXJ0aWZpY2F0ZVxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS50cnVuY2F0ZUNlcnRpZmljYXRlKGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIG9yaWdpbmFsIGZpZWxkXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIHN0YXR1cyBjb2xvciBjbGFzcyBiYXNlZCBvbiBjZXJ0aWZpY2F0ZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBsZXQgc3RhdHVzQ2xhc3MgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICd3YXJuaW5nJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgY2VydC1kaXNwbGF5ICR7c3RhdHVzQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZGlzcGxheVRleHQpfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cImJhc2ljXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlDZXJ0fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29weSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBpbmZvLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENlcnRJbmZvfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZWRpdC1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImVkaXQgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZGVsZXRlLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInRyYXNoIGljb24gcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAke2NlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvciA/IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5yZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMoY2VydEluZm8pIDogJyd9XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBmb3JtIGNlcnQtZWRpdC1mb3JtXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1B1YmxpY0tleV9lZGl0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M9XCIxMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHVibGljQ2VydH1cIj4ke2Z1bGxWYWx1ZX08L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbWluaSBidXR0b25zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIHBvc2l0aXZlIGJ1dHRvbiBzYXZlLWNlcnQtYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuYnRfU2F2ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGNhbmNlbC1jZXJ0LWJ0blwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNsb3NlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X0NhbmNlbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgaW5mbyBidXR0b24gLSB0b2dnbGUgZGV0YWlscyBkaXNwbGF5XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuaW5mby1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZGV0YWlscyA9ICRjb250YWluZXIuZmluZCgnLmNlcnQtZGV0YWlscycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGRldGFpbHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZGV0YWlscy5zbGlkZVRvZ2dsZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVkaXQgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZWRpdC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWVkaXQtZm9ybScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQdWJsaWNLZXlfZWRpdCcpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc2F2ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9ICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHVibGljS2V5X2VkaXQnKS52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgb3JpZ2luYWwgaGlkZGVuIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIGRpc3BsYXkgd2l0aCBuZXcgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGNhbmNlbCBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jYW5jZWwtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1lZGl0LWZvcm0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheScpLnNob3coKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmRlbGV0ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGNlcnRpZmljYXRlXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIHRvIHNob3cgZW1wdHkgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBuZXcgYnV0dG9uc1xuICAgICAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVB1YmxpY0NlcnQpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuYXR0cigncm93cycsICcxMCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjaGFuZ2UgZXZlbnRzIHRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5vZmYoJ2lucHV0LmNlcnQgY2hhbmdlLmNlcnQga2V5dXAuY2VydCcpLm9uKCdpbnB1dC5jZXJ0IGNoYW5nZS5jZXJ0IGtleXVwLmNlcnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgZGlzcGxheSBmb3IgU1NIIGtleXMgYW5kIGNlcnRpZmljYXRlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBTU0hfSURfUlNBX1BVQiBmaWVsZFxuICAgICAgICBjb25zdCAkc3NoUHViS2V5RmllbGQgPSAkKCcjU1NIX0lEX1JTQV9QVUInKTtcbiAgICAgICAgaWYgKCRzc2hQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRzc2hQdWJLZXlGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkc3NoUHViS2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc3NoLWtleS1kaXNwbGF5LCAuZnVsbC1kaXNwbGF5JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgY3JlYXRlIGRpc3BsYXkgaWYgdGhlcmUncyBhIHZhbHVlXG4gICAgICAgICAgICBpZiAoZnVsbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRydW5jYXRlZCBkaXNwbGF5XG4gICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnRydW5jYXRlU1NIS2V5KGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgb3JpZ2luYWwgZmllbGRcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aW9uIGlucHV0IGZsdWlkIHNzaC1rZXktZGlzcGxheVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke3RydW5jYXRlZH1cIiByZWFkb25seSBjbGFzcz1cInRydW5jYXRlZC1kaXNwbGF5XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBjb3B5LWJ0blwiIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGZ1bGxWYWx1ZSl9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFyaWF0aW9uPVwiYmFzaWNcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weUtleX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZXhwYW5kLWJ0blwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRXhwYW5kfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhwYW5kIGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGNsYXNzPVwiZnVsbC1kaXNwbGF5XCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCIgcmVhZG9ubHk+JHtmdWxsVmFsdWV9PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIGV4cGFuZC9jb2xsYXBzZVxuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZXhwYW5kLWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZ1bGxEaXNwbGF5ID0gJGNvbnRhaW5lci5maW5kKCcuZnVsbC1kaXNwbGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRydW5jYXRlZERpc3BsYXkgPSAkY29udGFpbmVyLmZpbmQoJy5zc2gta2V5LWRpc3BsYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQodGhpcykuZmluZCgnaScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkZnVsbERpc3BsYXkuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJGZ1bGxEaXNwbGF5LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJHRydW5jYXRlZERpc3BsYXkuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnY29tcHJlc3MnKS5hZGRDbGFzcygnZXhwYW5kJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGZ1bGxEaXNwbGF5LnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJHRydW5jYXRlZERpc3BsYXkuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXhwYW5kJykuYWRkQ2xhc3MoJ2NvbXByZXNzJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIG5ldyBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG9yaWdpbmFsIGZpZWxkIGFzIHJlYWQtb25seSAodGhpcyBpcyBhIHN5c3RlbS1nZW5lcmF0ZWQga2V5KVxuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX05vU1NIUHVibGljS2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIC0gdXNlIGRlZGljYXRlZCBtZXRob2RcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgV0VCSFRUUFNQcml2YXRlS2V5IGZpZWxkICh3cml0ZS1vbmx5IHdpdGggcGFzc3dvcmQgbWFza2luZylcbiAgICAgICAgY29uc3QgJGNlcnRQcml2S2V5RmllbGQgPSAkKCcjV0VCSFRUUFNQcml2YXRlS2V5Jyk7XG4gICAgICAgIGlmICgkY2VydFByaXZLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkY2VydFByaXZLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5wcml2YXRlLWtleS1zZXQsICNXRUJIVFRQU1ByaXZhdGVLZXlfbmV3JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHByaXZhdGUga2V5IGV4aXN0cyAocGFzc3dvcmQgbWFza2luZyBsb2dpYylcbiAgICAgICAgICAgIC8vIFRoZSBmaWVsZCB3aWxsIGNvbnRhaW4gJyoqKioqKioqJyBpZiBhIHByaXZhdGUga2V5IGlzIHNldFxuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGNlcnRQcml2S2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCBoYXNWYWx1ZSA9IGN1cnJlbnRWYWx1ZSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaGFzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIG9yaWdpbmFsIGZpZWxkIGFuZCBzaG93IHN0YXR1cyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlIHByaXZhdGUta2V5LXNldFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJsb2NrIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUHJpdmF0ZUtleUlzU2V0fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJyZXBsYWNlLWtleS1saW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfUmVwbGFjZX08L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1ByaXZhdGVLZXlfbmV3XCIgbmFtZT1cIldFQkhUVFBTUHJpdmF0ZUtleVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93cz1cIjEwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwiZGlzcGxheTpub25lO1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCIke2dsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVByaXZhdGVLZXl9XCI+PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcmVwbGFjZSBsaW5rXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucmVwbGFjZS1rZXktbGluaycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5wcml2YXRlLWtleS1zZXQnKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRuZXdGaWVsZCA9ICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHJpdmF0ZUtleV9uZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgJG5ld0ZpZWxkLnNob3coKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGhpZGRlbiBwYXNzd29yZCB2YWx1ZSBzbyB3ZSBjYW4gc2V0IGEgbmV3IG9uZVxuICAgICAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQmluZCBjaGFuZ2UgZXZlbnQgdG8gdXBkYXRlIGhpZGRlbiBmaWVsZCBhbmQgZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICRuZXdGaWVsZC5vbignaW5wdXQgY2hhbmdlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIG9yaWdpbmFsIGhpZGRlbiBmaWVsZCB3aXRoIG5ldyB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQudmFsKCRuZXdGaWVsZC52YWwoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uIGNoZWNrXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBmb3IgaW5wdXQgd2l0aCBwcm9wZXIgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQcml2YXRlS2V5KTtcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5hdHRyKCdyb3dzJywgJzEwJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNoYW5nZSBldmVudHMgdHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5vZmYoJ2lucHV0LnByaXYgY2hhbmdlLnByaXYga2V5dXAucHJpdicpLm9uKCdpbnB1dC5wcml2IGNoYW5nZS5wcml2IGtleXVwLnByaXYnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZnVuY3Rpb25hbGl0eSBmb3IgY29weSBidXR0b25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNsaXBib2FyZCgpIHtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY29weS1idG4nKTtcbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUudHJpZ2dlcik7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbEljb24gPSAkYnRuLmZpbmQoJ2knKS5hdHRyKCdjbGFzcycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkYnRuLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKCdjaGVjayBpY29uJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkYnRuLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKG9yaWdpbmFsSWNvbik7XG4gICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgc2VsZWN0aW9uXG4gICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5vbignZXJyb3InLCAoKSA9PiB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmdzX0NvcHlGYWlsZWQpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRydW5jYXRlIFNTSCBrZXkgZm9yIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gRnVsbCBTU0gga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUcnVuY2F0ZWQga2V5XG4gICAgICovXG4gICAgdHJ1bmNhdGVTU0hLZXkoa2V5KSB7XG4gICAgICAgIGlmICgha2V5IHx8IGtleS5sZW5ndGggPCA1MCkge1xuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJyAnKTtcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICBjb25zdCBrZXlUeXBlID0gcGFydHNbMF07XG4gICAgICAgICAgICBjb25zdCBrZXlEYXRhID0gcGFydHNbMV07XG4gICAgICAgICAgICBjb25zdCBjb21tZW50ID0gcGFydHMuc2xpY2UoMikuam9pbignICcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5RGF0YS5sZW5ndGggPiA0MCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZCA9IGtleURhdGEuc3Vic3RyaW5nKDAsIDIwKSArICcuLi4nICsga2V5RGF0YS5zdWJzdHJpbmcoa2V5RGF0YS5sZW5ndGggLSAxNSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke2tleVR5cGV9ICR7dHJ1bmNhdGVkfSAke2NvbW1lbnR9YC50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUcnVuY2F0ZSBjZXJ0aWZpY2F0ZSBmb3IgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjZXJ0IC0gRnVsbCBjZXJ0aWZpY2F0ZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVHJ1bmNhdGVkIGNlcnRpZmljYXRlIGluIHNpbmdsZSBsaW5lIGZvcm1hdFxuICAgICAqL1xuICAgIHRydW5jYXRlQ2VydGlmaWNhdGUoY2VydCkge1xuICAgICAgICBpZiAoIWNlcnQgfHwgY2VydC5sZW5ndGggPCAxMDApIHtcbiAgICAgICAgICAgIHJldHVybiBjZXJ0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsaW5lcyA9IGNlcnQuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEV4dHJhY3QgZmlyc3QgYW5kIGxhc3QgbWVhbmluZ2Z1bCBsaW5lc1xuICAgICAgICBjb25zdCBmaXJzdExpbmUgPSBsaW5lc1swXSB8fCAnJztcbiAgICAgICAgY29uc3QgbGFzdExpbmUgPSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBjZXJ0aWZpY2F0ZXMsIHNob3cgYmVnaW4gYW5kIGVuZCBtYXJrZXJzXG4gICAgICAgIGlmIChmaXJzdExpbmUuaW5jbHVkZXMoJ0JFR0lOIENFUlRJRklDQVRFJykpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtmaXJzdExpbmV9Li4uJHtsYXN0TGluZX1gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3Igb3RoZXIgZm9ybWF0cywgdHJ1bmNhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgY29uc3QgY2xlYW5DZXJ0ID0gY2VydC5yZXBsYWNlKC9cXG4vZywgJyAnKS50cmltKCk7XG4gICAgICAgIGlmIChjbGVhbkNlcnQubGVuZ3RoID4gODApIHtcbiAgICAgICAgICAgIHJldHVybiBjbGVhbkNlcnQuc3Vic3RyaW5nKDAsIDQwKSArICcuLi4nICsgY2xlYW5DZXJ0LnN1YnN0cmluZyhjbGVhbkNlcnQubGVuZ3RoIC0gMzApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2xlYW5DZXJ0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgZm9yIHNhZmUgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBtYXAgPSB7XG4gICAgICAgICAgICAnJic6ICcmYW1wOycsXG4gICAgICAgICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICAgICAgICc+JzogJyZndDsnLFxuICAgICAgICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICAgICAgICBcIidcIjogJyYjMDM5OydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZSgvWyY8PlwiJ10vZywgbSA9PiBtYXBbbV0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdywgaGlkZSBzc2ggcGFzc3dvcmQgc2VnbWVudCBhY2NvcmRpbmcgdG8gdGhlIHZhbHVlIG9mIHVzZSBTU0ggcGFzc3dvcmQgY2hlY2tib3guXG4gICAgICovXG4gICAgc2hvd0hpZGVTU0hQYXNzd29yZCgpe1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZFNlZ21lbnQuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZFNlZ21lbnQuc2hvdygpO1xuICAgICAgICB9XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogUHJlcGFyZXMgZGF0YSBmb3IgUkVTVCBBUEkgc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cbiAgICAgICAgLy8gSGFuZGxlIHByaXZhdGUga2V5IGZpZWxkXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5XRUJIVFRQU1ByaXZhdGVLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgcHJpdmF0ZUtleVZhbHVlID0gcmVzdWx0LmRhdGEuV0VCSFRUUFNQcml2YXRlS2V5O1xuICAgICAgICAgICAgLy8gT25seSBza2lwIHNlbmRpbmcgaWYgdGhlIHZhbHVlIGVxdWFscyBoaWRkZW4gcGFzc3dvcmQgKHVuY2hhbmdlZClcbiAgICAgICAgICAgIC8vIFNlbmQgZW1wdHkgc3RyaW5nIHRvIGNsZWFyIHRoZSBwcml2YXRlIGtleSBvbiBzZXJ2ZXJcbiAgICAgICAgICAgIGlmIChwcml2YXRlS2V5VmFsdWUgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS5XRUJIVFRQU1ByaXZhdGVLZXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFbXB0eSBzdHJpbmcgJycgd2lsbCBiZSBzZW50IHRvIGNsZWFyIHRoZSBjZXJ0aWZpY2F0ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRm9yIHB1YmxpYyBrZXkgLSBzZW5kIGVtcHR5IHZhbHVlcyB0byBhbGxvdyBjbGVhcmluZ1xuICAgICAgICAvLyBEbyBub3QgZGVsZXRlIGVtcHR5IHN0cmluZ3MgLSB0aGV5IG1lYW4gdXNlciB3YW50cyB0byBjbGVhciB0aGUgY2VydGlmaWNhdGVcblxuICAgICAgICAvLyBDbGVhbiB1cCB1bm5lY2Vzc2FyeSBmaWVsZHMgYmVmb3JlIHNlbmRpbmdcbiAgICAgICAgY29uc3QgZmllbGRzVG9SZW1vdmUgPSBbXG4gICAgICAgICAgICAnZGlycnR5JyxcbiAgICAgICAgICAgICdkZWxldGVBbGxJbnB1dCcsXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gUmVtb3ZlIGNvZGVjXyogZmllbGRzICh0aGV5J3JlIHJlcGxhY2VkIHdpdGggdGhlIGNvZGVjcyBhcnJheSlcbiAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0LmRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnY29kZWNfJykgfHwgZmllbGRzVG9SZW1vdmUuaW5jbHVkZXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdlIHNob3VsZCBwcm9jZXNzIGNvZGVjc1xuICAgICAgICAvLyBXaGVuIHNlbmRPbmx5Q2hhbmdlZCBpcyBlbmFibGVkLCBvbmx5IHByb2Nlc3MgY29kZWNzIGlmIHRoZXkgd2VyZSBhY3R1YWxseSBjaGFuZ2VkXG4gICAgICAgIGNvbnN0IHNob3VsZFByb2Nlc3NDb2RlY3MgPSAhRm9ybS5zZW5kT25seUNoYW5nZWQgfHwgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNvZGVjc0NoYW5nZWQ7XG5cbiAgICAgICAgaWYgKHNob3VsZFByb2Nlc3NDb2RlY3MpIHtcbiAgICAgICAgICAgIC8vIENvbGxlY3QgYWxsIGNvZGVjIGRhdGEgd2hlbiB0aGV5J3ZlIGJlZW4gY2hhbmdlZFxuICAgICAgICAgICAgY29uc3QgYXJyQ29kZWNzID0gW107XG5cbiAgICAgICAgICAgIC8vIFByb2Nlc3MgYWxsIGNvZGVjIHJvd3NcbiAgICAgICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUgLmNvZGVjLXJvdywgI3ZpZGVvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93JykuZWFjaCgoY3VycmVudEluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb2RlY05hbWUgPSAkKG9iaikuYXR0cignZGF0YS1jb2RlYy1uYW1lJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNvZGVjTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50RGlzYWJsZWQgPSAkKG9iaikuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIHVuY2hlY2tlZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIGFyckNvZGVjcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvZGVjTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBjdXJyZW50RGlzYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogY3VycmVudEluZGV4LFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5jbHVkZSBjb2RlY3MgaWYgdGhleSB3ZXJlIGNoYW5nZWQgb3Igc2VuZE9ubHlDaGFuZ2VkIGlzIGZhbHNlXG4gICAgICAgICAgICBpZiAoYXJyQ29kZWNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb2RlY3MgPSBhcnJDb2RlY3M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEhhbmRsZXMgUkVTVCBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgICQoXCIjZXJyb3ItbWVzc2FnZXNcIikucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmU6IHsgcmVzdWx0OiBib29sLCBkYXRhOiB7fSwgbWVzc2FnZXM6IHt9IH1cbiAgICAgICAgaWYgKCFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5nZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwocmVzcG9uc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIGZpZWxkcyB0byBoaWRkZW4gdmFsdWUgb24gc3VjY2Vzc1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgcGFzc3dvcmQgdmFsaWRhdGlvbiB3YXJuaW5ncyBhZnRlciBzdWNjZXNzZnVsIHNhdmVcbiAgICAgICAgICAgICQoJy5wYXNzd29yZC12YWxpZGF0ZScpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGRlbGV0ZSBhbGwgY29uZGl0aW9ucyBpZiBuZWVkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY2hlY2tEZWxldGVDb25kaXRpb25zKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgZXJyb3IgbWVzc2FnZSBIVE1MIGZyb20gUkVTVCBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2Ugd2l0aCBlcnJvciBtZXNzYWdlc1xuICAgICAqL1xuICAgIGdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkaXYgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICd1aSBuZWdhdGl2ZSBtZXNzYWdlJywgaWQ6ICdlcnJvci1tZXNzYWdlcycgfSk7XG4gICAgICAgICAgICBjb25zdCAkaGVhZGVyID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAnaGVhZGVyJyB9KS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5nc19FcnJvclNhdmVTZXR0aW5ncyk7XG4gICAgICAgICAgICAkZGl2LmFwcGVuZCgkaGVhZGVyKTtcbiAgICAgICAgICAgIGNvbnN0ICR1bCA9ICQoJzx1bD4nLCB7IGNsYXNzOiAnbGlzdCcgfSk7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlc1NldCA9IG5ldyBTZXQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIGJvdGggZXJyb3IgYW5kIHZhbGlkYXRpb24gbWVzc2FnZSB0eXBlc1xuICAgICAgICAgICAgWydlcnJvcicsICd2YWxpZGF0aW9uJ10uZm9yRWFjaChtc2dUeXBlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZXMgPSBBcnJheS5pc0FycmF5KHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdKSBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gcmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV0gXG4gICAgICAgICAgICAgICAgICAgICAgICA6IFtyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXV07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlcy5mb3JFYWNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZXh0Q29udGVudCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiYgZXJyb3IubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50ID0gZ2xvYmFsVHJhbnNsYXRlW2Vycm9yLm1lc3NhZ2VdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGdsb2JhbFRyYW5zbGF0ZVtlcnJvcl07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbWVzc2FnZXNTZXQuaGFzKHRleHRDb250ZW50KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzU2V0LmFkZCh0ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHVsLmFwcGVuZCgkKCc8bGk+JykudGV4dCh0ZXh0Q29udGVudCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJHVsKTtcbiAgICAgICAgICAgICQoJyNzdWJtaXRidXR0b24nKS5iZWZvcmUoJGRpdik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgdmFsaWRhdGlvbiBydWxlcyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRSdWxlcygpIHtcbiAgICAgICAgLy8gU1NIUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcztcbiAgICAgICAgfSBlbHNlIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdlYkFkbWluUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuV2ViQWRtaW5QYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkud2ViQWRtaW5QYXNzd29yZFJ1bGVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBjZXJ0aWZpY2F0ZSBkZXRhaWxzIEhUTUxcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY2VydEluZm8gLSBDZXJ0aWZpY2F0ZSBpbmZvcm1hdGlvbiBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGZvciBjZXJ0aWZpY2F0ZSBkZXRhaWxzXG4gICAgICovXG4gICAgcmVuZGVyQ2VydGlmaWNhdGVEZXRhaWxzKGNlcnRJbmZvKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJjZXJ0LWRldGFpbHNcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTsgbWFyZ2luLXRvcDoxMHB4O1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHRpbnkgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJqZWN0XG4gICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+U3ViamVjdDo8L3N0cm9uZz4gJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjZXJ0SW5mby5zdWJqZWN0KX08L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJc3N1ZXJcbiAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3Vlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPklzc3Vlcjo8L3N0cm9uZz4gJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjZXJ0SW5mby5pc3N1ZXIpfWA7XG4gICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICcgPHNwYW4gY2xhc3M9XCJ1aSB0aW55IGxhYmVsXCI+U2VsZi1zaWduZWQ8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkaXR5IHBlcmlvZFxuICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfZnJvbSAmJiBjZXJ0SW5mby52YWxpZF90bykge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPlZhbGlkOjwvc3Ryb25nPiAke2NlcnRJbmZvLnZhbGlkX2Zyb219IHRvICR7Y2VydEluZm8udmFsaWRfdG99PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXhwaXJ5IHN0YXR1c1xuICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgcmVkIGxhYmVsXCI+Q2VydGlmaWNhdGUgRXhwaXJlZDwvc3Bhbj48L2Rpdj4nO1xuICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5IDw9IDMwKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSB5ZWxsb3cgbGFiZWxcIj5FeHBpcmVzIGluICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXM8L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IGdyZWVuIGxhYmVsXCI+VmFsaWQgZm9yICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXM8L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3ViamVjdCBBbHRlcm5hdGl2ZSBOYW1lc1xuICAgICAgICBpZiAoY2VydEluZm8uc2FuICYmIGNlcnRJbmZvLnNhbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+QWx0ZXJuYXRpdmUgTmFtZXM6PC9zdHJvbmc+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGxpc3RcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OjEwcHg7XCI+JztcbiAgICAgICAgICAgIGNlcnRJbmZvLnNhbi5mb3JFYWNoKHNhbiA9PiB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj4ke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKHNhbil9PC9kaXY+YDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2UgbGlzdFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBzZWdtZW50XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIGNlcnQtZGV0YWlsc1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIEFNSS9BSkFNIGRlcGVuZGVuY3lcbiAgICAgKiBBSkFNIHJlcXVpcmVzIEFNSSB0byBiZSBlbmFibGVkIHNpbmNlIGl0J3MgYW4gSFRUUCB3cmFwcGVyIG92ZXIgQU1JXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFNSUFKQU1EZXBlbmRlbmN5KCkge1xuICAgICAgICBjb25zdCAkYW1pQ2hlY2tib3ggPSAkKCcjQU1JRW5hYmxlZCcpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0ICRhamFtQ2hlY2tib3ggPSAkKCcjQUpBTUVuYWJsZWQnKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRhbWlDaGVja2JveC5sZW5ndGggPT09IDAgfHwgJGFqYW1DaGVja2JveC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRnVuY3Rpb24gdG8gdXBkYXRlIEFKQU0gc3RhdGUgYmFzZWQgb24gQU1JIHN0YXRlXG4gICAgICAgIGNvbnN0IHVwZGF0ZUFKQU1TdGF0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlzQU1JRW5hYmxlZCA9ICRhbWlDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWlzQU1JRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIElmIEFNSSBpcyBkaXNhYmxlZCwgZGlzYWJsZSBBSkFNIGFuZCBtYWtlIGl0IHJlYWQtb25seVxuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCB0b29sdGlwIHRvIGV4cGxhaW4gd2h5IGl0J3MgZGlzYWJsZWRcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmF0dHIoJ2RhdGEtdG9vbHRpcCcsIGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNUmVxdWlyZXNBTUkpO1xuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3guYXR0cignZGF0YS1wb3NpdGlvbicsICd0b3AgbGVmdCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBBTUkgaXMgZW5hYmxlZCwgYWxsb3cgQUpBTSB0byBiZSB0b2dnbGVkXG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LnJlbW92ZUF0dHIoJ2RhdGEtdG9vbHRpcCcpO1xuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3gucmVtb3ZlQXR0cignZGF0YS1wb3NpdGlvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCBzdGF0ZVxuICAgICAgICB1cGRhdGVBSkFNU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbiBmb3IgQU1JIGNoZWNrYm94IGNoYW5nZXMgdXNpbmcgZXZlbnQgZGVsZWdhdGlvblxuICAgICAgICAvLyBUaGlzIHdvbid0IG92ZXJyaWRlIGV4aXN0aW5nIGhhbmRsZXJzXG4gICAgICAgICQoJyNBTUlFbmFibGVkJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdXBkYXRlQUpBTVN0YXRlKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgUEJYTGFuZ3VhZ2UgY2hhbmdlIGRldGVjdGlvbiBmb3IgcmVzdGFydCB3YXJuaW5nXG4gICAgICogU2hvd3MgcmVzdGFydCB3YXJuaW5nIG9ubHkgd2hlbiB0aGUgbGFuZ3VhZ2UgdmFsdWUgY2hhbmdlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmcoKSB7XG4gICAgICAgIGNvbnN0ICRsYW5ndWFnZUlucHV0ID0gJCgnI1BCWExhbmd1YWdlJyk7ICAvLyBIaWRkZW4gaW5wdXRcbiAgICAgICAgY29uc3QgJGxhbmd1YWdlRHJvcGRvd24gPSAkKCcjUEJYTGFuZ3VhZ2UtZHJvcGRvd24nKTsgIC8vIFY1LjAgcGF0dGVybiBkcm9wZG93blxuICAgICAgICBjb25zdCAkcmVzdGFydFdhcm5pbmcgPSAkKCcjcmVzdGFydC13YXJuaW5nLVBCWExhbmd1YWdlJyk7XG5cbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgdmFsdWUgYW5kIGRhdGEgbG9hZGVkIGZsYWdcbiAgICAgICAgbGV0IG9yaWdpbmFsVmFsdWUgPSBudWxsO1xuICAgICAgICBsZXQgaXNEYXRhTG9hZGVkID0gZmFsc2U7XG5cbiAgICAgICAgLy8gSGlkZSB3YXJuaW5nIGluaXRpYWxseVxuICAgICAgICAkcmVzdGFydFdhcm5pbmcuaGlkZSgpO1xuXG4gICAgICAgIC8vIFNldCBvcmlnaW5hbCB2YWx1ZSBhZnRlciBkYXRhIGxvYWRzXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdHZW5lcmFsU2V0dGluZ3MuZGF0YUxvYWRlZCcsICgpID0+IHtcbiAgICAgICAgICAgIG9yaWdpbmFsVmFsdWUgPSAkbGFuZ3VhZ2VJbnB1dC52YWwoKTtcbiAgICAgICAgICAgIGlzRGF0YUxvYWRlZCA9IHRydWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBkcm9wZG93biBjaGFuZ2UgZXZlbnQgLSB1c2UgVjUuMCBkcm9wZG93biBzZWxlY3RvclxuICAgICAgICAkbGFuZ3VhZ2VEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gU2VtYW50aWNVSURyb3Bkb3duIGF1dG9tYXRpY2FsbHkgc3luY3MgaGlkZGVuIGlucHV0IHZhbHVlXG4gICAgICAgICAgICAgICAgLy8gTm8gbmVlZCB0byBtYW51YWxseSB1cGRhdGUgJGxhbmd1YWdlSW5wdXRcblxuICAgICAgICAgICAgICAgIC8vIE9ubHkgc2hvdyB3YXJuaW5nIGFmdGVyIGRhdGEgaXMgbG9hZGVkIGFuZCB2YWx1ZSBjaGFuZ2VkIGZyb20gb3JpZ2luYWxcbiAgICAgICAgICAgICAgICBpZiAoaXNEYXRhTG9hZGVkICYmIG9yaWdpbmFsVmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IG9yaWdpbmFsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJlc3RhcnRXYXJuaW5nLnRyYW5zaXRpb24oJ2ZhZGUgaW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzRGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgICAgICAgICAkcmVzdGFydFdhcm5pbmcudHJhbnNpdGlvbignZmFkZSBvdXQnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIGRldGVjdGlvbiBvbmx5IGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICAgICAgaWYgKGlzRGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgUkVTVCBBUEkgbW9kZVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEdlbmVyYWxTZXR0aW5nc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVTZXR0aW5ncyc7XG5cbiAgICAgICAgLy8gRW5hYmxlIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvbiBmb3IgY2xlYW5lciBBUEkgcmVxdWVzdHNcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG5cbiAgICAgICAgLy8gRW5hYmxlIHNlbmRpbmcgb25seSBjaGFuZ2VkIGZpZWxkcyBmb3Igb3B0aW1hbCBQQVRDSCBzZW1hbnRpY3NcbiAgICAgICAgRm9ybS5zZW5kT25seUNoYW5nZWQgPSB0cnVlO1xuXG4gICAgICAgIC8vIE5vIHJlZGlyZWN0IGFmdGVyIHNhdmUgLSBzdGF5IG9uIHRoZSBzYW1lIHBhZ2VcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gbnVsbDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IG51bGw7XG4gICAgICAgIEZvcm0udXJsID0gYCNgO1xuICAgICAgICBcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBnZW5lcmFsU2V0dGluZ3MgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==