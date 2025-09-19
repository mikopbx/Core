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
    }); // Enable dropdowns on the form (except sound file selectors)

    $('#general-settings-form .dropdown').not('.audio-message-select').dropdown(); // Enable checkboxes on the form

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
    // Initialize PBXLanguage change detection for restart warning


    generalSettingsModify.initializePBXLanguageWarning(); // Load data from API instead of using server-rendered values

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
    var $languageDropdown = $('#PBXLanguage');
    var $restartWarning = $('#restart-warning-PBXLanguage'); // Store original value and data loaded flag

    var originalValue = null;
    var isDataLoaded = false; // Hide warning initially

    $restartWarning.hide(); // Set original value after data loads

    $(document).on('GeneralSettings.dataLoaded', function () {
      originalValue = $languageDropdown.val();
      isDataLoaded = true;
    }); // Handle dropdown change event

    $languageDropdown.closest('.dropdown').dropdown({
      onChange: function onChange(value) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJjb2RlY3NDaGFuZ2VkIiwiZGF0YUxvYWRlZCIsInZhbGlkYXRlUnVsZXMiLCJwYnhuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lIiwiV2ViQWRtaW5QYXNzd29yZCIsIldlYkFkbWluUGFzc3dvcmRSZXBlYXQiLCJnc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50IiwiU1NIUGFzc3dvcmQiLCJTU0hQYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJXRUJQb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJXRUJIVFRQU1BvcnQiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0IiwiQUpBTVBvcnQiLCJnc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSIsIlNJUEF1dGhQcmVmaXgiLCJnc19TSVBBdXRoUHJlZml4SW52YWxpZCIsIndlYkFkbWluUGFzc3dvcmRSdWxlcyIsImdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkIiwidmFsdWUiLCJnc19QYXNzd29yZHMiLCJwc3dfUGFzc3dvcmROb0xvd1NpbXZvbCIsInBzd19QYXNzd29yZE5vTnVtYmVycyIsInBzd19QYXNzd29yZE5vVXBwZXJTaW12b2wiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3MiLCJnc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQiLCJnc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCIsImdzX1NTSFBhc3N3b3JkIiwiYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3MiLCJjbGlwYm9hcmQiLCJpbml0aWFsaXplIiwibGVuZ3RoIiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwiY29udGV4dCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwidmFsaWRhdGVPbklucHV0Iiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwiY2hlY2tPbkxvYWQiLCJzc2hXaWRnZXQiLCJvbiIsImlzRGlzYWJsZWQiLCJjaGVja2JveCIsImhpZGVXYXJuaW5ncyIsImVsZW1lbnRzIiwiJHNjb3JlU2VjdGlvbiIsImhpZGUiLCJjaGVja1Bhc3N3b3JkIiwidmFsIiwiaW5pdFJ1bGVzIiwiZmluZCIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZUFNSUFKQU1EZXBlbmRlbmN5IiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzIiwiaW5pdGlhbGl6ZUNsaXBib2FyZCIsInNob3dIaWRlU1NIUGFzc3dvcmQiLCJ3aW5kb3ciLCJldmVudCIsIm5hbWVUYWIiLCJHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmciLCJsb2FkRGF0YSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMiLCJGb3JtIiwic2hvd0xvYWRpbmdTdGF0ZSIsIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsInBhc3N3b3JkVmFsaWRhdGlvbiIsInNldFRpbWVvdXQiLCJzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MiLCJtZXNzYWdlcyIsImNvbnNvbGUiLCJlcnJvciIsInNob3dBcGlFcnJvciIsInNldHRpbmdzIiwiY29kZWNzIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJwb3B1bGF0ZVNwZWNpYWxGaWVsZHMiLCJsb2FkU291bmRGaWxlVmFsdWVzIiwidXBkYXRlQ29kZWNUYWJsZXMiLCJpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNzaEtleXNUYWJsZSIsImRvY3VtZW50IiwidHJpZ2dlciIsIldFQkhUVFBTUHVibGljS2V5X2luZm8iLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsIiRjaGVja2JveCIsImlzQ2hlY2tlZCIsIiRkcm9wZG93biIsImhhc0NsYXNzIiwiZm9ybSIsImVycm9yTWVzc2FnZSIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInZhbGlkYXRpb24iLCJyZW1vdmUiLCJpc0RlZmF1bHRXZWJQYXNzd29yZCIsIiR3ZWJQYXNzd29yZEZpZWxkcyIsImNsb3Nlc3QiLCJ3YXJuaW5nSHRtbCIsInBzd19TZXRQYXNzd29yZCIsInBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmQiLCJiZWZvcmUiLCJpc0RlZmF1bHRTU0hQYXNzd29yZCIsInNzaFBhc3N3b3JkRGlzYWJsZWQiLCIkc3NoUGFzc3dvcmRGaWVsZHMiLCJkYXRhSW4iLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJkYXRhT3V0IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IiwiYXVkaW9Db2RlY3MiLCJmaWx0ZXIiLCJjIiwic29ydCIsImEiLCJiIiwicHJpb3JpdHkiLCJ2aWRlb0NvZGVjcyIsImJ1aWxkQ29kZWNUYWJsZSIsInNob3ciLCJpbml0aWFsaXplQ29kZWNEcmFnRHJvcCIsIiR0YWJsZUJvZHkiLCJlbXB0eSIsImNvZGVjIiwiaW5kZXgiLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGVja2VkIiwicm93SHRtbCIsImVzY2FwZUh0bWwiLCJkZXNjcmlwdGlvbiIsImFwcGVuZCIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkIiwiJGNlcnRQdWJLZXlGaWVsZCIsImZ1bGxWYWx1ZSIsIiRjb250YWluZXIiLCJjZXJ0SW5mbyIsImRpc3BsYXlUZXh0IiwicGFydHMiLCJzdWJqZWN0IiwicHVzaCIsImlzc3VlciIsImlzX3NlbGZfc2lnbmVkIiwidmFsaWRfdG8iLCJpc19leHBpcmVkIiwiZGF5c191bnRpbF9leHBpcnkiLCJ0cnVuY2F0ZUNlcnRpZmljYXRlIiwic3RhdHVzQ2xhc3MiLCJkaXNwbGF5SHRtbCIsImJ0X1Rvb2xUaXBDb3B5Q2VydCIsImJ0X1Rvb2xUaXBDZXJ0SW5mbyIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsInJlbmRlckNlcnRpZmljYXRlRGV0YWlscyIsImdzX1Bhc3RlUHVibGljQ2VydCIsImJ0X1NhdmUiLCJidF9DYW5jZWwiLCJlIiwicHJldmVudERlZmF1bHQiLCIkZGV0YWlscyIsInNsaWRlVG9nZ2xlIiwiZm9jdXMiLCJuZXdWYWx1ZSIsImNoZWNrVmFsdWVzIiwicG9wdXAiLCJkZXN0cm95IiwiYXR0ciIsIm9mZiIsIiRzc2hQdWJLZXlGaWVsZCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiYnRfVG9vbFRpcENvcHlLZXkiLCJidF9Ub29sVGlwRXhwYW5kIiwiJGZ1bGxEaXNwbGF5IiwiJHRydW5jYXRlZERpc3BsYXkiLCIkaWNvbiIsImlzIiwiYWRkQ2xhc3MiLCJnc19Ob1NTSFB1YmxpY0tleSIsIiRjZXJ0UHJpdktleUZpZWxkIiwiY3VycmVudFZhbHVlIiwiaGFzVmFsdWUiLCJnc19Qcml2YXRlS2V5SXNTZXQiLCJnc19SZXBsYWNlIiwiZ3NfUGFzdGVQcml2YXRlS2V5IiwiJG5ld0ZpZWxkIiwiQ2xpcGJvYXJkSlMiLCIkYnRuIiwib3JpZ2luYWxJY29uIiwiY2xlYXJTZWxlY3Rpb24iLCJnc19Db3B5RmFpbGVkIiwic3BsaXQiLCJrZXlUeXBlIiwia2V5RGF0YSIsImNvbW1lbnQiLCJzbGljZSIsInN1YnN0cmluZyIsInRyaW0iLCJjZXJ0IiwibGluZXMiLCJsaW5lIiwiZmlyc3RMaW5lIiwibGFzdExpbmUiLCJpbmNsdWRlcyIsImNsZWFuQ2VydCIsInJlcGxhY2UiLCJ0ZXh0IiwibWFwIiwibSIsImNiQmVmb3JlU2VuZEZvcm0iLCJXRUJIVFRQU1ByaXZhdGVLZXkiLCJ1bmRlZmluZWQiLCJwcml2YXRlS2V5VmFsdWUiLCJXRUJIVFRQU1B1YmxpY0tleSIsImZpZWxkc1RvUmVtb3ZlIiwic3RhcnRzV2l0aCIsInNob3VsZFByb2Nlc3NDb2RlY3MiLCJzZW5kT25seUNoYW5nZWQiLCJhcnJDb2RlY3MiLCJlYWNoIiwiY3VycmVudEluZGV4Iiwib2JqIiwiY29kZWNOYW1lIiwiY3VycmVudERpc2FibGVkIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsImdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbCIsImZhZGVPdXQiLCJnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwiLCJjaGVja0RlbGV0ZUNvbmRpdGlvbnMiLCIkZGl2IiwiaWQiLCIkaGVhZGVyIiwiZ3NfRXJyb3JTYXZlU2V0dGluZ3MiLCIkdWwiLCJtZXNzYWdlc1NldCIsIlNldCIsIm1zZ1R5cGUiLCJ0ZXh0Q29udGVudCIsIm1lc3NhZ2UiLCJoYXMiLCJhZGQiLCJodG1sIiwidmFsaWRfZnJvbSIsInNhbiIsIiRhbWlDaGVja2JveCIsIiRhamFtQ2hlY2tib3giLCJ1cGRhdGVBSkFNU3RhdGUiLCJpc0FNSUVuYWJsZWQiLCJnc19BSkFNUmVxdWlyZXNBTUkiLCJyZW1vdmVBdHRyIiwiJGxhbmd1YWdlRHJvcGRvd24iLCIkcmVzdGFydFdhcm5pbmciLCJvcmlnaW5hbFZhbHVlIiwiaXNEYXRhTG9hZGVkIiwidHJhbnNpdGlvbiIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInVybCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFHQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxxQkFBcUIsR0FBRztBQUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxlOztBQU8xQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRUQsQ0FBQyxDQUFDLG1CQUFELENBWE07O0FBYTFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFlBQVksRUFBRUYsQ0FBQyxDQUFDLGNBQUQsQ0FqQlc7O0FBbUIxQjtBQUNK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LEdBQUw7QUFFQWpPLElBQUFBLElBQUksQ0FBQ2xGLGFBQUwsR0FBcUJmLHFCQUFxQixDQUFDZSxhQUEzQztBQUNBa0YsSUFBQUEsSUFBSSxDQUFDMkssZ0JBQUwsR0FBd0I1USxxQkFBcUIsQ0FBQzRRLGdCQUE5QztBQUNBM0ssSUFBQUEsSUFBSSxDQUFDMEwsZUFBTCxHQUF1QjNSLHFCQUFxQixDQUFDMlIsZUFBN0M7QUFDQTFMLElBQUFBLElBQUksQ0FBQ3pDLFVBQUw7QUFDSDtBQXI4Q3lCLENBQTlCLEMsQ0F3OENBOztBQUNBdEQsQ0FBQyxDQUFDNEgsUUFBRCxDQUFELENBQVlxTSxLQUFaLENBQWtCLFlBQU07QUFDcEJuVSxFQUFBQSxxQkFBcUIsQ0FBQ3dELFVBQXRCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYXNzd29yZFNjb3JlLCBQYnhBcGksIFVzZXJNZXNzYWdlLCBTb3VuZEZpbGVTZWxlY3RvciwgR2VuZXJhbFNldHRpbmdzQVBJLCBDbGlwYm9hcmRKUywgUGFzc3dvcmRXaWRnZXQsIFBhc3N3b3JkVmFsaWRhdGlvbkFQSSwgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIsICQgKi9cblxuLyoqXG4gKiBBIG1vZHVsZSB0byBoYW5kbGUgbW9kaWZpY2F0aW9uIG9mIGdlbmVyYWwgc2V0dGluZ3MuXG4gKi9cbmNvbnN0IGdlbmVyYWxTZXR0aW5nc01vZGlmeSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgd2ViIGFkbWluIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHdlYkFkbWluUGFzc3dvcmQ6ICQoJyNXZWJBZG1pblBhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3NoIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNzaFBhc3N3b3JkOiAkKCcjU1NIUGFzc3dvcmQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB3ZWIgc3NoIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpc2FibGVTU0hQYXNzd29yZDogJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLnBhcmVudCgnLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNzaFBhc3N3b3JkU2VnbWVudDogJCgnI29ubHktaWYtcGFzc3dvcmQtZW5hYmxlZCcpLFxuXG4gICAgLyoqXG4gICAgICogSWYgcGFzc3dvcmQgc2V0LCBpdCB3aWxsIGJlIGhpZGVkIGZyb20gd2ViIHVpLlxuICAgICAqL1xuICAgIGhpZGRlblBhc3N3b3JkOiAneHh4eHh4eCcsXG5cbiAgICAvKipcbiAgICAgKiBTb3VuZCBmaWxlIGZpZWxkIElEc1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgc291bmRGaWxlRmllbGRzOiB7XG4gICAgICAgIGFubm91bmNlbWVudEluOiAnUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4nLFxuICAgICAgICBhbm5vdW5jZW1lbnRPdXQ6ICdQQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBPcmlnaW5hbCBjb2RlYyBzdGF0ZSBmcm9tIGxhc3QgbG9hZFxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgb3JpZ2luYWxDb2RlY1N0YXRlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgY29kZWNzIGhhdmUgYmVlbiBjaGFuZ2VkXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgY29kZWNzQ2hhbmdlZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHRyYWNrIGlmIGRhdGEgaGFzIGJlZW4gbG9hZGVkIGZyb20gQVBJXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgZGF0YUxvYWRlZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHsgLy8gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXNcbiAgICAgICAgcGJ4bmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1BCWE5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXZWJBZG1pblBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV2ViQWRtaW5QYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbV2ViQWRtaW5QYXNzd29yZF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgU1NIUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTU0hQYXNzd29yZFJlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hdGNoW1NTSFBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQlBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXRUJQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQkhUVFBTUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQkhUVFBTUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQkhUVFBTUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQlBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgQUpBTVBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdBSkFNUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFNJUEF1dGhQcmVmaXg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTSVBBdXRoUHJlZml4JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwWy9eW2EtekEtWl0qJC9dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeEludmFsaWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBSdWxlcyBmb3IgdGhlIHdlYiBhZG1pbiBwYXNzd29yZCBmaWVsZCB3aGVuIGl0IG5vdCBlcXVhbCB0byBoaWRkZW5QYXNzd29yZFxuICAgIHdlYkFkbWluUGFzc3dvcmRSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVdlYlBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW2Etel0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vVXBwZXJTaW12b2xcbiAgICAgICAgfVxuICAgIF0sXG4gICAgLy8gUnVsZXMgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGQgd2hlbiBTU0ggbG9naW4gdGhyb3VnaCB0aGUgcGFzc3dvcmQgZW5hYmxlZCwgYW5kIGl0IG5vdCBlcXVhbCB0byBoaWRkZW5QYXNzd29yZFxuICAgIGFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW2Etel0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vTnVtYmVyc1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW0EtWl0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLnBzd19QYXNzd29yZE5vVXBwZXJTaW12b2xcbiAgICAgICAgfVxuICAgIF0sXG5cbiAgICAvLyBSdWxlcyBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZCB3aGVuIFNTSCBsb2dpbiB0aHJvdWdoIHRoZSBwYXNzd29yZCBkaXNhYmxlZFxuICAgIGFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQsXG4gICAgICAgIH1cbiAgICBdLFxuXG4gICAgLyoqXG4gICAgICogQ2xpcGJvYXJkIGluc3RhbmNlIGZvciBjb3B5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKiBAdHlwZSB7Q2xpcGJvYXJkSlN9XG4gICAgICovXG4gICAgY2xpcGJvYXJkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqICBJbml0aWFsaXplIG1vZHVsZSB3aXRoIGV2ZW50IGJpbmRpbmdzIGFuZCBjb21wb25lbnQgaW5pdGlhbGl6YXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXRzXG4gICAgICAgIC8vIFdlYiBBZG1pbiBQYXNzd29yZCB3aWRnZXQgLSBvbmx5IHZhbGlkYXRpb24gYW5kIHdhcm5pbmdzLCBubyBidXR0b25zXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuaW5pdChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQsIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0OiAnZ2VuZXJhbF93ZWInLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLCAgICAgLy8gTm8gc2hvdy9oaWRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gY29weSBidXR0b25cbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNTSCBQYXNzd29yZCB3aWRnZXQgLSBvbmx5IHZhbGlkYXRpb24gYW5kIHdhcm5pbmdzLCBubyBidXR0b25zXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNzaFdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZCwge1xuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdnZW5lcmFsX3NzaCcsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogZmFsc2UsICAgICAvLyBObyBzaG93L2hpZGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIFNTSCBkaXNhYmxlIGNoZWNrYm94XG4gICAgICAgICAgICAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgaWYgKGlzRGlzYWJsZWQgJiYgc3NoV2lkZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIFBhc3N3b3JkV2lkZ2V0LmhpZGVXYXJuaW5ncyhzc2hXaWRnZXQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3NoV2lkZ2V0LmVsZW1lbnRzLiRzY29yZVNlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNzaFdpZGdldC5lbGVtZW50cy4kc2NvcmVTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWlzRGlzYWJsZWQgJiYgc3NoV2lkZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIFBhc3N3b3JkV2lkZ2V0LmNoZWNrUGFzc3dvcmQoc3NoV2lkZ2V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgd2hlbiBwYXNzd29yZHMgY2hhbmdlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSAhPT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSAhPT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbmFibGUgZHJvcGRvd25zIG9uIHRoZSBmb3JtIChleGNlcHQgc291bmQgZmlsZSBzZWxlY3RvcnMpXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmRyb3Bkb3duJykubm90KCcuYXVkaW8tbWVzc2FnZS1zZWxlY3QnKS5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveGVzIG9uIHRoZSBmb3JtXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgQU1JL0FKQU0gZGVwZW5kZW5jeSBhZnRlciBjaGVja2JveGVzIGFyZSBpbml0aWFsaXplZFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUFNSUFKQU1EZXBlbmRlbmN5KCk7XG5cbiAgICAgICAgLy8gQ29kZWMgdGFibGUgZHJhZy1uLWRyb3Agd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKSB3aGljaCBpcyBjYWxsZWQgZnJvbSB1cGRhdGVDb2RlY1RhYmxlcygpXG5cbiAgICAgICAgLy8gU291bmQgZmlsZSBzZWxlY3RvcnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBSRVNUIEFQSSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgbG9hZFNvdW5kRmlsZVZhbHVlcygpIG1ldGhvZCBjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RlOiBTU0gga2V5cyB0YWJsZSB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgbG9hZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyBkaXNwbGF5XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgY29weSBidXR0b25zXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhZGRpdGlvbmFsIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuXG4gICAgICAgIC8vIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goe1xuICAgICAgICAgICAgJ29uQ2hhbmdlJzogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmRcbiAgICAgICAgfSk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIHRvIGhhbmRsZSB0YWIgYWN0aXZhdGlvblxuICAgICAgICAkKHdpbmRvdykub24oJ0dTLUFjdGl2YXRlVGFiJywgKGV2ZW50LCBuYW1lVGFiKSA9PiB7XG4gICAgICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoJ2NoYW5nZSB0YWInLCBuYW1lVGFiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBpZiAodHlwZW9mIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVG9vbHRpcCBjbGljayBiZWhhdmlvciBpcyBub3cgaGFuZGxlZCBnbG9iYWxseSBpbiBUb29sdGlwQnVpbGRlci5qc1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUEJYTGFuZ3VhZ2UgY2hhbmdlIGRldGVjdGlvbiBmb3IgcmVzdGFydCB3YXJuaW5nXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nKCk7XG5cbiAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gQVBJIGluc3RlYWQgb2YgdXNpbmcgc2VydmVyLXJlbmRlcmVkIHZhbHVlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkubG9hZERhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9ycyB3aXRoIHBsYXliYWNrIGZ1bmN0aW9uYWxpdHkgdXNpbmcgU291bmRGaWxlU2VsZWN0b3JcbiAgICAgKiBIVE1MIHN0cnVjdHVyZSBpcyBwcm92aWRlZCBieSB0aGUgcGxheUFkZE5ld1NvdW5kV2l0aEljb25zIHBhcnRpYWwgaW4gcmVjb3JkaW5nLnZvbHQ6XG4gICAgICogLSBIaWRkZW4gaW5wdXQ6IDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJblwiIG5hbWU9XCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJblwiPlxuICAgICAqIC0gRHJvcGRvd24gZGl2OiA8ZGl2IGNsYXNzPVwidWkgc2VsZWN0aW9uIGRyb3Bkb3duIHNlYXJjaCBQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbi1kcm9wZG93blwiPlxuICAgICAqIC0gUGxheWJhY2sgYnV0dG9uIGFuZCBhZGQgbmV3IGJ1dHRvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMoKSB7XG4gICAgICAgIC8vIFNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gU2VlIGluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcldpdGhEYXRhKCkgY2FsbGVkIGZyb20gcG9wdWxhdGVGb3JtKClcbiAgICAgICAgXG4gICAgICAgIC8vIFRoaXMgbWV0aG9kIGlzIGtlcHQgZm9yIGNvbnNpc3RlbmN5IGJ1dCBhY3R1YWwgaW5pdGlhbGl6YXRpb24gaGFwcGVuc1xuICAgICAgICAvLyB3aGVuIHdlIGhhdmUgZGF0YSBmcm9tIHRoZSBzZXJ2ZXIgaW4gbG9hZFNvdW5kRmlsZVZhbHVlcygpXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZ2VuZXJhbCBzZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICogVXNlZCBib3RoIG9uIGluaXRpYWwgcGFnZSBsb2FkIGFuZCBmb3IgbWFudWFsIHJlZnJlc2hcbiAgICAgKiBDYW4gYmUgY2FsbGVkIGFueXRpbWUgdG8gcmVsb2FkIHRoZSBmb3JtIGRhdGE6IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkRGF0YSgpXG4gICAgICovXG4gICAgbG9hZERhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZSBvbiB0aGUgZm9ybSB3aXRoIGRpbW1lclxuICAgICAgICBGb3JtLnNob3dMb2FkaW5nU3RhdGUodHJ1ZSwgJ0xvYWRpbmcgc2V0dGluZ3MuLi4nKTtcblxuICAgICAgICBHZW5lcmFsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmhpZGVMb2FkaW5nU3RhdGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIHRoZSByZWNlaXZlZCBkYXRhXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZGF0YUxvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3YXJuaW5ncyBmb3IgZGVmYXVsdCBwYXNzd29yZHMgYWZ0ZXIgRE9NIHVwZGF0ZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLnBhc3N3b3JkVmFsaWRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIHVwZGF0ZWQgYWZ0ZXIgcG9wdWxhdGVGb3JtXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dEZWZhdWx0UGFzc3dvcmRXYXJuaW5ncyhyZXNwb25zZS5kYXRhLnBhc3N3b3JkVmFsaWRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBFcnJvcjonLCByZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93QXBpRXJyb3IocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBzZXR0aW5ncyBhbmQgYWRkaXRpb25hbCBkYXRhXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gZGF0YS5zZXR0aW5ncyB8fCBkYXRhO1xuICAgICAgICBjb25zdCBjb2RlY3MgPSBkYXRhLmNvZGVjcyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoc2V0dGluZ3MsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzcGVjaWFsIGZpZWxkIHR5cGVzXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnBvcHVsYXRlU3BlY2lhbEZpZWxkcyhmb3JtRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBzb3VuZCBmaWxlIHZhbHVlcyB3aXRoIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkU291bmRGaWxlVmFsdWVzKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY29kZWMgdGFibGVzXG4gICAgICAgICAgICAgICAgaWYgKGNvZGVjcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS51cGRhdGVDb2RlY1RhYmxlcyhjb2RlY3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIGZpZWxkcyAoaGlkZSBhY3R1YWwgcGFzc3dvcmRzKVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUGFzc3dvcmRGaWVsZHMoZm9ybURhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBTU0ggcGFzc3dvcmQgdmlzaWJpbGl0eVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGlmIGVuYWJsZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFNTSCBrZXlzIHRhYmxlIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIGlmICh0eXBlb2Ygc3NoS2V5c1RhYmxlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgc3NoS2V5c1RhYmxlLmluaXRpYWxpemUoJ3NzaC1rZXlzLWNvbnRhaW5lcicsICdTU0hBdXRob3JpemVkS2V5cycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgd2l0aCBuZXcgZGF0YVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJpZ2dlciBldmVudCB0byBub3RpZnkgdGhhdCBkYXRhIGhhcyBiZWVuIGxvYWRlZFxuICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdHZW5lcmFsU2V0dGluZ3MuZGF0YUxvYWRlZCcpO1xuXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgc3BlY2lhbCBmaWVsZCB0eXBlcyB0aGF0IG5lZWQgY3VzdG9tIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVTcGVjaWFsRmllbGRzKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIFByaXZhdGUga2V5IGV4aXN0ZW5jZSBpcyBub3cgZGV0ZXJtaW5lZCBieSBjaGVja2luZyBpZiB2YWx1ZSBlcXVhbHMgSElEREVOX1BBU1NXT1JEXG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2VydGlmaWNhdGUgaW5mb1xuICAgICAgICBpZiAoc2V0dGluZ3MuV0VCSFRUUFNQdWJsaWNLZXlfaW5mbykge1xuICAgICAgICAgICAgJCgnI1dFQkhUVFBTUHVibGljS2V5JykuZGF0YSgnY2VydC1pbmZvJywgc2V0dGluZ3MuV0VCSFRUUFNQdWJsaWNLZXlfaW5mbyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjaGVja2JveGVzIChBUEkgcmV0dXJucyBib29sZWFuIHZhbHVlcylcbiAgICAgICAgT2JqZWN0LmtleXMoc2V0dGluZ3MpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQoYCMke2tleX1gKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gc2V0dGluZ3Nba2V5XSA9PT0gdHJ1ZSB8fCBzZXR0aW5nc1trZXldID09PSAnMScgfHwgc2V0dGluZ3Nba2V5XSA9PT0gMTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3guY2hlY2tib3goaXNDaGVja2VkID8gJ2NoZWNrJyA6ICd1bmNoZWNrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSByZWd1bGFyIGRyb3Bkb3ducyAoZXhjbHVkaW5nIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdoaWNoIGFyZSBoYW5kbGVkIHNlcGFyYXRlbHkpXG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtrZXl9YCkucGFyZW50KCcuZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID4gMCAmJiAhJGRyb3Bkb3duLmhhc0NsYXNzKCdhdWRpby1tZXNzYWdlLXNlbGVjdCcpKSB7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIGZpZWxkcyB3aXRoIGhpZGRlbiBwYXNzd29yZCBpbmRpY2F0b3JcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkRmllbGRzKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIEhpZGUgYWN0dWFsIHBhc3N3b3JkcyBhbmQgc2hvdyBoaWRkZW4gaW5kaWNhdG9yXG4gICAgICAgIGlmIChzZXR0aW5ncy5XZWJBZG1pblBhc3N3b3JkICYmIHNldHRpbmdzLldlYkFkbWluUGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHNldHRpbmdzLlNTSFBhc3N3b3JkICYmIHNldHRpbmdzLlNTSFBhc3N3b3JkICE9PSAnJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBBUEkgZXJyb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbWVzc2FnZXMgLSBFcnJvciBtZXNzYWdlcyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHNob3dBcGlFcnJvcihtZXNzYWdlcykge1xuICAgICAgICBpZiAobWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IEFycmF5LmlzQXJyYXkobWVzc2FnZXMuZXJyb3IpIFxuICAgICAgICAgICAgICAgID8gbWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSBcbiAgICAgICAgICAgICAgICA6IG1lc3NhZ2VzLmVycm9yO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgd2FybmluZ3MgZm9yIGRlZmF1bHQgcGFzc3dvcmRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHZhbGlkYXRpb24gLSBQYXNzd29yZCB2YWxpZGF0aW9uIHJlc3VsdHMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3ModmFsaWRhdGlvbikge1xuICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIHBhc3N3b3JkLXZhbGlkYXRlIG1lc3NhZ2VzIGZpcnN0XG4gICAgICAgICQoJy5wYXNzd29yZC12YWxpZGF0ZScpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGZvciBkZWZhdWx0IFdlYiBBZG1pbiBwYXNzd29yZFxuICAgICAgICBpZiAodmFsaWRhdGlvbi5pc0RlZmF1bHRXZWJQYXNzd29yZCkge1xuICAgICAgICAgICAgLy8gRmluZCB0aGUgcGFzc3dvcmQgZmllbGRzIGdyb3VwIC0gdHJ5IG11bHRpcGxlIHNlbGVjdG9yc1xuICAgICAgICAgICAgbGV0ICR3ZWJQYXNzd29yZEZpZWxkcyA9ICQoJyNXZWJBZG1pblBhc3N3b3JkJykuY2xvc2VzdCgnLnR3by5maWVsZHMnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCR3ZWJQYXNzd29yZEZpZWxkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgYWx0ZXJuYXRpdmUgc2VsZWN0b3IgaWYgdGhlIGZpcnN0IG9uZSBkb2Vzbid0IHdvcmtcbiAgICAgICAgICAgICAgICAkd2ViUGFzc3dvcmRGaWVsZHMgPSAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLnBhcmVudCgpLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHdlYlBhc3N3b3JkRmllbGRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgd2FybmluZyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgY29uc3Qgd2FybmluZ0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBuZWdhdGl2ZSBpY29uIG1lc3NhZ2UgcGFzc3dvcmQtdmFsaWRhdGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19TZXRQYXNzd29yZCB8fCAnU2VjdXJpdHkgV2FybmluZyd9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUucHN3X0NoYW5nZURlZmF1bHRQYXNzd29yZCB8fCAnWW91IGFyZSB1c2luZyB0aGUgZGVmYXVsdCBwYXNzd29yZC4gUGxlYXNlIGNoYW5nZSBpdCBmb3Igc2VjdXJpdHkuJ308L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbnNlcnQgd2FybmluZyBiZWZvcmUgdGhlIHBhc3N3b3JkIGZpZWxkc1xuICAgICAgICAgICAgICAgICR3ZWJQYXNzd29yZEZpZWxkcy5iZWZvcmUod2FybmluZ0h0bWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHdhcm5pbmcgZm9yIGRlZmF1bHQgU1NIIHBhc3N3b3JkXG4gICAgICAgIGlmICh2YWxpZGF0aW9uLmlzRGVmYXVsdFNTSFBhc3N3b3JkKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBTU0ggcGFzc3dvcmQgbG9naW4gaXMgZW5hYmxlZFxuICAgICAgICAgICAgY29uc3Qgc3NoUGFzc3dvcmREaXNhYmxlZCA9ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXNzaFBhc3N3b3JkRGlzYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSBTU0ggcGFzc3dvcmQgZmllbGRzIGdyb3VwXG4gICAgICAgICAgICAgICAgbGV0ICRzc2hQYXNzd29yZEZpZWxkcyA9ICQoJyNTU0hQYXNzd29yZCcpLmNsb3Nlc3QoJy50d28uZmllbGRzJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRzc2hQYXNzd29yZEZpZWxkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IGFsdGVybmF0aXZlIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgICRzc2hQYXNzd29yZEZpZWxkcyA9ICQoJyNTU0hQYXNzd29yZCcpLnBhcmVudCgpLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJHNzaFBhc3N3b3JkRmllbGRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB3YXJuaW5nSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBuZWdhdGl2ZSBpY29uIG1lc3NhZ2UgcGFzc3dvcmQtdmFsaWRhdGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19TZXRQYXNzd29yZCB8fCAnU2VjdXJpdHkgV2FybmluZyd9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmQgfHwgJ1lvdSBhcmUgdXNpbmcgdGhlIGRlZmF1bHQgcGFzc3dvcmQuIFBsZWFzZSBjaGFuZ2UgaXQgZm9yIHNlY3VyaXR5Lid9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgd2FybmluZyBiZWZvcmUgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFuZCBsb2FkIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggZGF0YSwgc2ltaWxhciB0byBJVlIgaW1wbGVtZW50YXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNvdW5kRmlsZVZhbHVlcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBDb252ZXJ0IGVtcHR5IHZhbHVlcyB0byAtMSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICAgIGNvbnN0IGRhdGFJbiA9IHsuLi5zZXR0aW5nc307XG4gICAgICAgIGlmICghc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gfHwgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gPT09ICcnKSB7XG4gICAgICAgICAgICBkYXRhSW4uUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gPSAnLTEnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbmNvbWluZyBhbm5vdW5jZW1lbnQgc2VsZWN0b3Igd2l0aCBkYXRhIChmb2xsb3dpbmcgSVZSIHBhdHRlcm4pXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ1BCWFJlY29yZEFubm91bmNlbWVudEluJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YUluXG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgZW1wdHkgdmFsdWVzIHRvIC0xIGZvciB0aGUgZHJvcGRvd25cbiAgICAgICAgY29uc3QgZGF0YU91dCA9IHsuLi5zZXR0aW5nc307XG4gICAgICAgIGlmICghc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IHx8IHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudE91dCA9PT0gJycpIHtcbiAgICAgICAgICAgIGRhdGFPdXQuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0ID0gJy0xJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3V0Z29pbmcgYW5ub3VuY2VtZW50IHNlbGVjdG9yIHdpdGggZGF0YSAoZm9sbG93aW5nIElWUiBwYXR0ZXJuKVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdQQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhT3V0XG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhbmQgdXBkYXRlIGNvZGVjIHRhYmxlcyB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb2RlY3MgLSBBcnJheSBvZiBjb2RlYyBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcykge1xuICAgICAgICAvLyBSZXNldCBjb2RlYyBjaGFuZ2UgZmxhZyB3aGVuIGxvYWRpbmcgZGF0YVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIGNvZGVjIHN0YXRlIGZvciBjb21wYXJpc29uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNlcGFyYXRlIGF1ZGlvIGFuZCB2aWRlbyBjb2RlY3NcbiAgICAgICAgY29uc3QgYXVkaW9Db2RlY3MgPSBjb2RlY3MuZmlsdGVyKGMgPT4gYy50eXBlID09PSAnYXVkaW8nKS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgIGNvbnN0IHZpZGVvQ29kZWNzID0gY29kZWNzLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ3ZpZGVvJykuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgYXVkaW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUoYXVkaW9Db2RlY3MsICdhdWRpbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgdmlkZW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUodmlkZW9Db2RlY3MsICd2aWRlbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSBsb2FkZXJzIGFuZCBzaG93IHRhYmxlc1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLWxvYWRlciwgI3ZpZGVvLWNvZGVjcy1sb2FkZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUsICN2aWRlby1jb2RlY3MtdGFibGUnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIHJlb3JkZXJpbmdcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb2RlYyB0YWJsZSByb3dzIGZyb20gZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvZGVjcyAtIEFycmF5IG9mIGNvZGVjIG9iamVjdHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtICdhdWRpbycgb3IgJ3ZpZGVvJ1xuICAgICAqL1xuICAgIGJ1aWxkQ29kZWNUYWJsZShjb2RlY3MsIHR5cGUpIHtcbiAgICAgICAgY29uc3QgJHRhYmxlQm9keSA9ICQoYCMke3R5cGV9LWNvZGVjcy10YWJsZSB0Ym9keWApO1xuICAgICAgICAkdGFibGVCb2R5LmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICBjb2RlY3MuZm9yRWFjaCgoY29kZWMsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBzdGF0ZSBmb3IgY2hhbmdlIGRldGVjdGlvblxuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZVtjb2RlYy5uYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXgsXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGNvZGVjLmRpc2FibGVkXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFibGUgcm93XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gY29kZWMuZGlzYWJsZWQgPT09IHRydWUgfHwgY29kZWMuZGlzYWJsZWQgPT09ICcxJyB8fCBjb2RlYy5kaXNhYmxlZCA9PT0gMTtcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrZWQgPSAhaXNEaXNhYmxlZCA/ICdjaGVja2VkJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCByb3dIdG1sID0gYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cImNvZGVjLXJvd1wiIGlkPVwiY29kZWMtJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtpbmRleH1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb2RlYy1uYW1lPVwiJHtjb2RlYy5uYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtb3JpZ2luYWwtcHJpb3JpdHk9XCIke2luZGV4fVwiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJjb2xsYXBzaW5nIGRyYWdIYW5kbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic29ydCBncmV5IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggY29kZWNzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwiY29kZWNfJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2NoZWNrZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmluZGV4PVwiMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJjb2RlY18ke2NvZGVjLm5hbWV9XCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjb2RlYy5kZXNjcmlwdGlvbiB8fCBjb2RlYy5uYW1lKX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICR0YWJsZUJvZHkuYXBwZW5kKHJvd0h0bWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyBmb3IgdGhlIG5ldyByb3dzXG4gICAgICAgICR0YWJsZUJvZHkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgY29kZWNzIGFzIGNoYW5nZWQgYW5kIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIGNvZGVjIHRhYmxlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkge1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlLCAjdmlkZW8tY29kZWNzLXRhYmxlJykudGFibGVEbkQoe1xuICAgICAgICAgICAgb25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnLFxuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGNvZGVjcyBhcyBjaGFuZ2VkIGFuZCBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjZXJ0aWZpY2F0ZSBmaWVsZCBkaXNwbGF5IG9ubHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpIHtcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIG9ubHlcbiAgICAgICAgY29uc3QgJGNlcnRQdWJLZXlGaWVsZCA9ICQoJyNXRUJIVFRQU1B1YmxpY0tleScpO1xuICAgICAgICBpZiAoJGNlcnRQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRjZXJ0UHViS2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGNlcnRpZmljYXRlIGluZm8gaWYgYXZhaWxhYmxlIGZyb20gZGF0YSBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGNlcnRJbmZvID0gJGNlcnRQdWJLZXlGaWVsZC5kYXRhKCdjZXJ0LWluZm8nKSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzIGZvciB0aGlzIGZpZWxkIG9ubHlcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheSwgLmNlcnQtZWRpdC1mb3JtJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbWVhbmluZ2Z1bCBkaXNwbGF5IHRleHQgZnJvbSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgICAgICAgICAgbGV0IGRpc3BsYXlUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHN1YmplY3QvZG9tYWluXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDwn5OcICR7Y2VydEluZm8uc3ViamVjdH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGlzc3VlciBpZiBub3Qgc2VsZi1zaWduZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3VlciAmJiAhY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYGJ5ICR7Y2VydEluZm8uaXNzdWVyfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKCcoU2VsZi1zaWduZWQpJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCB2YWxpZGl0eSBkYXRlc1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4p2MIEV4cGlyZWQgJHtjZXJ0SW5mby52YWxpZF90b31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDimqDvuI8gRXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKchSBWYWxpZCB1bnRpbCAke2NlcnRJbmZvLnZhbGlkX3RvfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IHBhcnRzLmpvaW4oJyB8ICcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRydW5jYXRlZCBjZXJ0aWZpY2F0ZVxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS50cnVuY2F0ZUNlcnRpZmljYXRlKGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIG9yaWdpbmFsIGZpZWxkXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIHN0YXR1cyBjb2xvciBjbGFzcyBiYXNlZCBvbiBjZXJ0aWZpY2F0ZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBsZXQgc3RhdHVzQ2xhc3MgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICd3YXJuaW5nJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgY2VydC1kaXNwbGF5ICR7c3RhdHVzQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZGlzcGxheVRleHQpfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cImJhc2ljXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlDZXJ0IHx8ICdDb3B5IGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgaW5mby1jZXJ0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDZXJ0SW5mbyB8fCAnQ2VydGlmaWNhdGUgZGV0YWlscyd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBlZGl0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0IHx8ICdFZGl0IGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImVkaXQgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZGVsZXRlLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZSB8fCAnRGVsZXRlIGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInRyYXNoIGljb24gcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAke2NlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvciA/IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5yZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMoY2VydEluZm8pIDogJyd9XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBmb3JtIGNlcnQtZWRpdC1mb3JtXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1B1YmxpY0tleV9lZGl0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M9XCIxMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHVibGljQ2VydCB8fCAnUGFzdGUgcHVibGljIGNlcnRpZmljYXRlIGhlcmUuLi4nfVwiPiR7ZnVsbFZhbHVlfTwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtaW5pIGJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgcG9zaXRpdmUgYnV0dG9uIHNhdmUtY2VydC1idG5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5idF9TYXZlIHx8ICdTYXZlJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGNhbmNlbC1jZXJ0LWJ0blwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNsb3NlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X0NhbmNlbCB8fCAnQ2FuY2VsJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgaW5mbyBidXR0b24gLSB0b2dnbGUgZGV0YWlscyBkaXNwbGF5XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuaW5mby1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZGV0YWlscyA9ICRjb250YWluZXIuZmluZCgnLmNlcnQtZGV0YWlscycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGRldGFpbHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZGV0YWlscy5zbGlkZVRvZ2dsZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVkaXQgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZWRpdC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWVkaXQtZm9ybScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQdWJsaWNLZXlfZWRpdCcpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc2F2ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9ICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHVibGljS2V5X2VkaXQnKS52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgb3JpZ2luYWwgaGlkZGVuIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIGRpc3BsYXkgd2l0aCBuZXcgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGNhbmNlbCBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jYW5jZWwtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1lZGl0LWZvcm0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheScpLnNob3coKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmRlbGV0ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGNlcnRpZmljYXRlXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIHRvIHNob3cgZW1wdHkgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBuZXcgYnV0dG9uc1xuICAgICAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVB1YmxpY0NlcnQgfHwgJ1Bhc3RlIHB1YmxpYyBjZXJ0aWZpY2F0ZSBoZXJlLi4uJyk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdyb3dzJywgJzEwJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNoYW5nZSBldmVudHMgdHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLm9mZignaW5wdXQuY2VydCBjaGFuZ2UuY2VydCBrZXl1cC5jZXJ0Jykub24oJ2lucHV0LmNlcnQgY2hhbmdlLmNlcnQga2V5dXAuY2VydCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyBkaXNwbGF5IGZvciBTU0gga2V5cyBhbmQgY2VydGlmaWNhdGVzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpIHtcbiAgICAgICAgLy8gSGFuZGxlIFNTSF9JRF9SU0FfUFVCIGZpZWxkXG4gICAgICAgIGNvbnN0ICRzc2hQdWJLZXlGaWVsZCA9ICQoJyNTU0hfSURfUlNBX1BVQicpO1xuICAgICAgICBpZiAoJHNzaFB1YktleUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFZhbHVlID0gJHNzaFB1YktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRzc2hQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5zc2gta2V5LWRpc3BsYXksIC5mdWxsLWRpc3BsYXknKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBjcmVhdGUgZGlzcGxheSBpZiB0aGVyZSdzIGEgdmFsdWVcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdHJ1bmNhdGVkIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudHJ1bmNhdGVTU0hLZXkoZnVsbFZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBvcmlnaW5hbCBmaWVsZFxuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgc3NoLWtleS1kaXNwbGF5XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7dHJ1bmNhdGVkfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJiYXNpY1wiIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5S2V5IHx8ICdDb3B5J31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZXhwYW5kLWJ0blwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRXhwYW5kIHx8ICdTaG93IGZ1bGwga2V5J31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4cGFuZCBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBjbGFzcz1cImZ1bGwtZGlzcGxheVwiIHN0eWxlPVwiZGlzcGxheTpub25lO1wiIHJlYWRvbmx5PiR7ZnVsbFZhbHVlfTwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBleHBhbmQvY29sbGFwc2VcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmV4cGFuZC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmdWxsRGlzcGxheSA9ICRjb250YWluZXIuZmluZCgnLmZ1bGwtZGlzcGxheScpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0cnVuY2F0ZWREaXNwbGF5ID0gJGNvbnRhaW5lci5maW5kKCcuc3NoLWtleS1kaXNwbGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKHRoaXMpLmZpbmQoJ2knKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJGZ1bGxEaXNwbGF5LmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICRmdWxsRGlzcGxheS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICR0cnVuY2F0ZWREaXNwbGF5LnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2NvbXByZXNzJykuYWRkQ2xhc3MoJ2V4cGFuZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRmdWxsRGlzcGxheS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICR0cnVuY2F0ZWREaXNwbGF5LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V4cGFuZCcpLmFkZENsYXNzKCdjb21wcmVzcycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBuZXcgZWxlbWVudHNcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBhcyByZWFkLW9ubHkgKHRoaXMgaXMgYSBzeXN0ZW0tZ2VuZXJhdGVkIGtleSlcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5hdHRyKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19Ob1NTSFB1YmxpY0tleSB8fCAnTm8gU1NIIHB1YmxpYyBrZXkgZ2VuZXJhdGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBXRUJIVFRQU1B1YmxpY0tleSBmaWVsZCAtIHVzZSBkZWRpY2F0ZWQgbWV0aG9kXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHJpdmF0ZUtleSBmaWVsZCAod3JpdGUtb25seSB3aXRoIHBhc3N3b3JkIG1hc2tpbmcpXG4gICAgICAgIGNvbnN0ICRjZXJ0UHJpdktleUZpZWxkID0gJCgnI1dFQkhUVFBTUHJpdmF0ZUtleScpO1xuICAgICAgICBpZiAoJGNlcnRQcml2S2V5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQcml2S2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucHJpdmF0ZS1rZXktc2V0LCAjV0VCSFRUUFNQcml2YXRlS2V5X25ldycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBwcml2YXRlIGtleSBleGlzdHMgKHBhc3N3b3JkIG1hc2tpbmcgbG9naWMpXG4gICAgICAgICAgICAvLyBUaGUgZmllbGQgd2lsbCBjb250YWluICd4eHh4eHh4JyBpZiBhIHByaXZhdGUga2V5IGlzIHNldFxuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGNlcnRQcml2S2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCBoYXNWYWx1ZSA9IGN1cnJlbnRWYWx1ZSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaGFzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIG9yaWdpbmFsIGZpZWxkIGFuZCBzaG93IHN0YXR1cyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlIHByaXZhdGUta2V5LXNldFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJsb2NrIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUHJpdmF0ZUtleUlzU2V0IHx8ICdQcml2YXRlIGtleSBpcyBjb25maWd1cmVkJ30gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxhY2Uta2V5LWxpbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19SZXBsYWNlIHx8ICdSZXBsYWNlJ308L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1ByaXZhdGVLZXlfbmV3XCIgbmFtZT1cIldFQkhUVFBTUHJpdmF0ZUtleVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93cz1cIjEwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwiZGlzcGxheTpub25lO1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCIke2dsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVByaXZhdGVLZXkgfHwgJ1Bhc3RlIHByaXZhdGUga2V5IGhlcmUuLi4nfVwiPjwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHJlcGxhY2UgbGlua1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnJlcGxhY2Uta2V5LWxpbmsnKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucHJpdmF0ZS1rZXktc2V0JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkbmV3RmllbGQgPSAkY29udGFpbmVyLmZpbmQoJyNXRUJIVFRQU1ByaXZhdGVLZXlfbmV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICRuZXdGaWVsZC5zaG93KCkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBoaWRkZW4gcGFzc3dvcmQgdmFsdWUgc28gd2UgY2FuIHNldCBhIG5ldyBvbmVcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEJpbmQgY2hhbmdlIGV2ZW50IHRvIHVwZGF0ZSBoaWRkZW4gZmllbGQgYW5kIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAkbmV3RmllbGQub24oJ2lucHV0IGNoYW5nZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBvcmlnaW5hbCBoaWRkZW4gZmllbGQgd2l0aCBuZXcgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnZhbCgkbmV3RmllbGQudmFsKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gdmFsaWRhdGlvbiBjaGVja1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHJpdmF0ZUtleSB8fCAnUGFzdGUgcHJpdmF0ZSBrZXkgaGVyZS4uLicpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3Jvd3MnLCAnMTAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgY2hhbmdlIGV2ZW50cyB0cmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLm9mZignaW5wdXQucHJpdiBjaGFuZ2UucHJpdiBrZXl1cC5wcml2Jykub24oJ2lucHV0LnByaXYgY2hhbmdlLnByaXYga2V5dXAucHJpdicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5IGZvciBjb3B5IGJ1dHRvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2xpcGJvYXJkKCkge1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZCkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jb3B5LWJ0bicpO1xuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBTaG93IHN1Y2Nlc3MgbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoZS50cmlnZ2VyKTtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsSWNvbiA9ICRidG4uZmluZCgnaScpLmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRidG4uZmluZCgnaScpLnJlbW92ZUNsYXNzKCkuYWRkQ2xhc3MoJ2NoZWNrIGljb24nKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRidG4uZmluZCgnaScpLnJlbW92ZUNsYXNzKCkuYWRkQ2xhc3Mob3JpZ2luYWxJY29uKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciBzZWxlY3Rpb25cbiAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLm9uKCdlcnJvcicsICgpID0+IHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZ3NfQ29weUZhaWxlZCB8fCAnRmFpbGVkIHRvIGNvcHkgdG8gY2xpcGJvYXJkJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVHJ1bmNhdGUgU1NIIGtleSBmb3IgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSBGdWxsIFNTSCBrZXlcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRydW5jYXRlZCBrZXlcbiAgICAgKi9cbiAgICB0cnVuY2F0ZVNTSEtleShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkgfHwga2V5Lmxlbmd0aCA8IDUwKSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdCgnICcpO1xuICAgICAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleVR5cGUgPSBwYXJ0c1swXTtcbiAgICAgICAgICAgIGNvbnN0IGtleURhdGEgPSBwYXJ0c1sxXTtcbiAgICAgICAgICAgIGNvbnN0IGNvbW1lbnQgPSBwYXJ0cy5zbGljZSgyKS5qb2luKCcgJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChrZXlEYXRhLmxlbmd0aCA+IDQwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0ga2V5RGF0YS5zdWJzdHJpbmcoMCwgMjApICsgJy4uLicgKyBrZXlEYXRhLnN1YnN0cmluZyhrZXlEYXRhLmxlbmd0aCAtIDE1KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYCR7a2V5VHlwZX0gJHt0cnVuY2F0ZWR9ICR7Y29tbWVudH1gLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRydW5jYXRlIGNlcnRpZmljYXRlIGZvciBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNlcnQgLSBGdWxsIGNlcnRpZmljYXRlXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUcnVuY2F0ZWQgY2VydGlmaWNhdGUgaW4gc2luZ2xlIGxpbmUgZm9ybWF0XG4gICAgICovXG4gICAgdHJ1bmNhdGVDZXJ0aWZpY2F0ZShjZXJ0KSB7XG4gICAgICAgIGlmICghY2VydCB8fCBjZXJ0Lmxlbmd0aCA8IDEwMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNlcnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxpbmVzID0gY2VydC5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gRXh0cmFjdCBmaXJzdCBhbmQgbGFzdCBtZWFuaW5nZnVsIGxpbmVzXG4gICAgICAgIGNvbnN0IGZpcnN0TGluZSA9IGxpbmVzWzBdIHx8ICcnO1xuICAgICAgICBjb25zdCBsYXN0TGluZSA9IGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGNlcnRpZmljYXRlcywgc2hvdyBiZWdpbiBhbmQgZW5kIG1hcmtlcnNcbiAgICAgICAgaWYgKGZpcnN0TGluZS5pbmNsdWRlcygnQkVHSU4gQ0VSVElGSUNBVEUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2ZpcnN0TGluZX0uLi4ke2xhc3RMaW5lfWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBvdGhlciBmb3JtYXRzLCB0cnVuY2F0ZSB0aGUgY29udGVudFxuICAgICAgICBjb25zdCBjbGVhbkNlcnQgPSBjZXJ0LnJlcGxhY2UoL1xcbi9nLCAnICcpLnRyaW0oKTtcbiAgICAgICAgaWYgKGNsZWFuQ2VydC5sZW5ndGggPiA4MCkge1xuICAgICAgICAgICAgcmV0dXJuIGNsZWFuQ2VydC5zdWJzdHJpbmcoMCwgNDApICsgJy4uLicgKyBjbGVhbkNlcnQuc3Vic3RyaW5nKGNsZWFuQ2VydC5sZW5ndGggLSAzMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjbGVhbkNlcnQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCBmb3Igc2FmZSBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgZXNjYXBlSHRtbCh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IG1hcCA9IHtcbiAgICAgICAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICAgICAgICc8JzogJyZsdDsnLFxuICAgICAgICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAgICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgICAgICAgIFwiJ1wiOiAnJiMwMzk7J1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGV4dC5yZXBsYWNlKC9bJjw+XCInXS9nLCBtID0+IG1hcFttXSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50IGFjY29yZGluZyB0byB0aGUgdmFsdWUgb2YgdXNlIFNTSCBwYXNzd29yZCBjaGVja2JveC5cbiAgICAgKi9cbiAgICBzaG93SGlkZVNTSFBhc3N3b3JkKCl7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBQcmVwYXJlcyBkYXRhIGZvciBSRVNUIEFQSSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblxuICAgICAgICAvLyBIYW5kbGUgY2VydGlmaWNhdGUgZmllbGRzIC0gb25seSBzZW5kIGlmIHVzZXIgYWN0dWFsbHkgZW50ZXJlZCBuZXcgdmFsdWVzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5XRUJIVFRQU1ByaXZhdGVLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgcHJpdmF0ZUtleVZhbHVlID0gcmVzdWx0LmRhdGEuV0VCSFRUUFNQcml2YXRlS2V5O1xuICAgICAgICAgICAgLy8gSWYgdGhlIGZpZWxkIGlzIGVtcHR5IG9yIGNvbnRhaW5zIHRoZSBoaWRkZW4gcGFzc3dvcmQsIGRvbid0IHNlbmQgaXRcbiAgICAgICAgICAgIGlmIChwcml2YXRlS2V5VmFsdWUgPT09ICcnIHx8IHByaXZhdGVLZXlWYWx1ZSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLldFQkhUVFBTUHJpdmF0ZUtleTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNhbWUgZm9yIHB1YmxpYyBrZXkgLSBkb24ndCBzZW5kIGVtcHR5IHZhbHVlc1xuICAgICAgICBpZiAocmVzdWx0LmRhdGEuV0VCSFRUUFNQdWJsaWNLZXkgIT09IHVuZGVmaW5lZCAmJiByZXN1bHQuZGF0YS5XRUJIVFRQU1B1YmxpY0tleSA9PT0gJycpIHtcbiAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS5XRUJIVFRQU1B1YmxpY0tleTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFuIHVwIHVubmVjZXNzYXJ5IGZpZWxkcyBiZWZvcmUgc2VuZGluZ1xuICAgICAgICBjb25zdCBmaWVsZHNUb1JlbW92ZSA9IFtcbiAgICAgICAgICAgICdkaXJydHknLFxuICAgICAgICAgICAgJ2RlbGV0ZUFsbElucHV0JyxcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBSZW1vdmUgY29kZWNfKiBmaWVsZHMgKHRoZXkncmUgcmVwbGFjZWQgd2l0aCB0aGUgY29kZWNzIGFycmF5KVxuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSB8fCBmaWVsZHNUb1JlbW92ZS5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2Ugc2hvdWxkIHByb2Nlc3MgY29kZWNzXG4gICAgICAgIC8vIFdoZW4gc2VuZE9ubHlDaGFuZ2VkIGlzIGVuYWJsZWQsIG9ubHkgcHJvY2VzcyBjb2RlY3MgaWYgdGhleSB3ZXJlIGFjdHVhbGx5IGNoYW5nZWRcbiAgICAgICAgY29uc3Qgc2hvdWxkUHJvY2Vzc0NvZGVjcyA9ICFGb3JtLnNlbmRPbmx5Q2hhbmdlZCB8fCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZDtcblxuICAgICAgICBpZiAoc2hvdWxkUHJvY2Vzc0NvZGVjcykge1xuICAgICAgICAgICAgLy8gQ29sbGVjdCBhbGwgY29kZWMgZGF0YSB3aGVuIHRoZXkndmUgYmVlbiBjaGFuZ2VkXG4gICAgICAgICAgICBjb25zdCBhcnJDb2RlY3MgPSBbXTtcblxuICAgICAgICAgICAgLy8gUHJvY2VzcyBhbGwgY29kZWMgcm93c1xuICAgICAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93LCAjdmlkZW8tY29kZWNzLXRhYmxlIC5jb2RlYy1yb3cnKS5lYWNoKChjdXJyZW50SW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvZGVjTmFtZSA9ICQob2JqKS5hdHRyKCdkYXRhLWNvZGVjLW5hbWUnKTtcbiAgICAgICAgICAgICAgICBpZiAoY29kZWNOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnREaXNhYmxlZCA9ICQob2JqKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgYXJyQ29kZWNzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY29kZWNOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGN1cnJlbnREaXNhYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBjdXJyZW50SW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBJbmNsdWRlIGNvZGVjcyBpZiB0aGV5IHdlcmUgY2hhbmdlZCBvciBzZW5kT25seUNoYW5nZWQgaXMgZmFsc2VcbiAgICAgICAgICAgIGlmIChhcnJDb2RlY3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvZGVjcyA9IGFyckNvZGVjcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogSGFuZGxlcyBSRVNUIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgJChcIiNlcnJvci1tZXNzYWdlc1wiKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZTogeyByZXN1bHQ6IGJvb2wsIGRhdGE6IHt9LCBtZXNzYWdlczoge30gfVxuICAgICAgICBpZiAoIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbChyZXNwb25zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgZmllbGRzIHRvIGhpZGRlbiB2YWx1ZSBvbiBzdWNjZXNzXG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBwYXNzd29yZCB2YWxpZGF0aW9uIHdhcm5pbmdzIGFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZVxuICAgICAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZGVsZXRlIGFsbCBjb25kaXRpb25zIGlmIG5lZWRlZFxuICAgICAgICBpZiAodHlwZW9mIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jaGVja0RlbGV0ZUNvbmRpdGlvbnMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBlcnJvciBtZXNzYWdlIEhUTUwgZnJvbSBSRVNUIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZSB3aXRoIGVycm9yIG1lc3NhZ2VzXG4gICAgICovXG4gICAgZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgY29uc3QgJGRpdiA9ICQoJzxkaXY+JywgeyBjbGFzczogJ3VpIG5lZ2F0aXZlIG1lc3NhZ2UnLCBpZDogJ2Vycm9yLW1lc3NhZ2VzJyB9KTtcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXIgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICdoZWFkZXInIH0pLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmdzX0Vycm9yU2F2ZVNldHRpbmdzKTtcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCRoZWFkZXIpO1xuICAgICAgICAgICAgY29uc3QgJHVsID0gJCgnPHVsPicsIHsgY2xhc3M6ICdsaXN0JyB9KTtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzU2V0ID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgYm90aCBlcnJvciBhbmQgdmFsaWRhdGlvbiBtZXNzYWdlIHR5cGVzXG4gICAgICAgICAgICBbJ2Vycm9yJywgJ3ZhbGlkYXRpb24nXS5mb3JFYWNoKG1zZ1R5cGUgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlcyA9IEFycmF5LmlzQXJyYXkocmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV0pIFxuICAgICAgICAgICAgICAgICAgICAgICAgPyByZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogW3Jlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzLmZvckVhY2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRleHRDb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGVycm9yID09PSAnb2JqZWN0JyAmJiBlcnJvci5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3IubWVzc2FnZV0gfHwgZXJyb3IubWVzc2FnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3JdIHx8IGVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1lc3NhZ2VzU2V0Lmhhcyh0ZXh0Q29udGVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlc1NldC5hZGQodGV4dENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR1bC5hcHBlbmQoJCgnPGxpPicpLnRleHQodGV4dENvbnRlbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCR1bCk7XG4gICAgICAgICAgICAkKCcjc3VibWl0YnV0dG9uJykuYmVmb3JlKCRkaXYpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHZhbGlkYXRpb24gcnVsZXMgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBpbml0UnVsZXMoKSB7XG4gICAgICAgIC8vIFNTSFBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M7XG4gICAgICAgIH0gZWxzZSBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZWJBZG1pblBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5XZWJBZG1pblBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LndlYkFkbWluUGFzc3dvcmRSdWxlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgY2VydGlmaWNhdGUgZGV0YWlscyBIVE1MXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNlcnRJbmZvIC0gQ2VydGlmaWNhdGUgaW5mb3JtYXRpb24gb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgY2VydGlmaWNhdGUgZGV0YWlsc1xuICAgICAqL1xuICAgIHJlbmRlckNlcnRpZmljYXRlRGV0YWlscyhjZXJ0SW5mbykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwiY2VydC1kZXRhaWxzXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7IG1hcmdpbi10b3A6MTBweDtcIj4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGxpc3RcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gU3ViamVjdFxuICAgICAgICBpZiAoY2VydEluZm8uc3ViamVjdCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPlN1YmplY3Q6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uc3ViamVjdCl9PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSXNzdWVyXG4gICAgICAgIGlmIChjZXJ0SW5mby5pc3N1ZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5Jc3N1ZXI6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uaXNzdWVyKX1gO1xuICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnIDxzcGFuIGNsYXNzPVwidWkgdGlueSBsYWJlbFwiPlNlbGYtc2lnbmVkPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGl0eSBwZXJpb2RcbiAgICAgICAgaWYgKGNlcnRJbmZvLnZhbGlkX2Zyb20gJiYgY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5WYWxpZDo8L3N0cm9uZz4gJHtjZXJ0SW5mby52YWxpZF9mcm9tfSB0byAke2NlcnRJbmZvLnZhbGlkX3RvfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV4cGlyeSBzdGF0dXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IHJlZCBsYWJlbFwiPkNlcnRpZmljYXRlIEV4cGlyZWQ8L3NwYW4+PC9kaXY+JztcbiAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgeWVsbG93IGxhYmVsXCI+RXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSBncmVlbiBsYWJlbFwiPlZhbGlkIGZvciAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN1YmplY3QgQWx0ZXJuYXRpdmUgTmFtZXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLnNhbiAmJiBjZXJ0SW5mby5zYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPkFsdGVybmF0aXZlIE5hbWVzOjwvc3Ryb25nPic7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBsaXN0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDoxMHB4O1wiPic7XG4gICAgICAgICAgICBjZXJ0SW5mby5zYW4uZm9yRWFjaChzYW4gPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChzYW4pfTwvZGl2PmA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIGxpc3RcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2Ugc2VnbWVudFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBjZXJ0LWRldGFpbHNcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBBTUkvQUpBTSBkZXBlbmRlbmN5XG4gICAgICogQUpBTSByZXF1aXJlcyBBTUkgdG8gYmUgZW5hYmxlZCBzaW5jZSBpdCdzIGFuIEhUVFAgd3JhcHBlciBvdmVyIEFNSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSgpIHtcbiAgICAgICAgY29uc3QgJGFtaUNoZWNrYm94ID0gJCgnI0FNSUVuYWJsZWQnKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBjb25zdCAkYWphbUNoZWNrYm94ID0gJCgnI0FKQU1FbmFibGVkJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYW1pQ2hlY2tib3gubGVuZ3RoID09PSAwIHx8ICRhamFtQ2hlY2tib3gubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZ1bmN0aW9uIHRvIHVwZGF0ZSBBSkFNIHN0YXRlIGJhc2VkIG9uIEFNSSBzdGF0ZVxuICAgICAgICBjb25zdCB1cGRhdGVBSkFNU3RhdGUgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc0FNSUVuYWJsZWQgPSAkYW1pQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFpc0FNSUVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBBTUkgaXMgZGlzYWJsZWQsIGRpc2FibGUgQUpBTSBhbmQgbWFrZSBpdCByZWFkLW9ubHlcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgdG9vbHRpcCB0byBleHBsYWluIHdoeSBpdCdzIGRpc2FibGVkXG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTVJlcXVpcmVzQU1JIHx8ICdBSkFNIHJlcXVpcmVzIEFNSSB0byBiZSBlbmFibGVkJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBsZWZ0Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIEFNSSBpcyBlbmFibGVkLCBhbGxvdyBBSkFNIHRvIGJlIHRvZ2dsZWRcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3gucmVtb3ZlQXR0cignZGF0YS10b29sdGlwJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsIHN0YXRlXG4gICAgICAgIHVwZGF0ZUFKQU1TdGF0ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuIGZvciBBTUkgY2hlY2tib3ggY2hhbmdlcyB1c2luZyBldmVudCBkZWxlZ2F0aW9uXG4gICAgICAgIC8vIFRoaXMgd29uJ3Qgb3ZlcnJpZGUgZXhpc3RpbmcgaGFuZGxlcnNcbiAgICAgICAgJCgnI0FNSUVuYWJsZWQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB1cGRhdGVBSkFNU3RhdGUoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBQQlhMYW5ndWFnZSBjaGFuZ2UgZGV0ZWN0aW9uIGZvciByZXN0YXJ0IHdhcm5pbmdcbiAgICAgKiBTaG93cyByZXN0YXJ0IHdhcm5pbmcgb25seSB3aGVuIHRoZSBsYW5ndWFnZSB2YWx1ZSBjaGFuZ2VzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBCWExhbmd1YWdlV2FybmluZygpIHtcbiAgICAgICAgY29uc3QgJGxhbmd1YWdlRHJvcGRvd24gPSAkKCcjUEJYTGFuZ3VhZ2UnKTtcbiAgICAgICAgY29uc3QgJHJlc3RhcnRXYXJuaW5nID0gJCgnI3Jlc3RhcnQtd2FybmluZy1QQlhMYW5ndWFnZScpO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHZhbHVlIGFuZCBkYXRhIGxvYWRlZCBmbGFnXG4gICAgICAgIGxldCBvcmlnaW5hbFZhbHVlID0gbnVsbDtcbiAgICAgICAgbGV0IGlzRGF0YUxvYWRlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIEhpZGUgd2FybmluZyBpbml0aWFsbHlcbiAgICAgICAgJHJlc3RhcnRXYXJuaW5nLmhpZGUoKTtcblxuICAgICAgICAvLyBTZXQgb3JpZ2luYWwgdmFsdWUgYWZ0ZXIgZGF0YSBsb2Fkc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignR2VuZXJhbFNldHRpbmdzLmRhdGFMb2FkZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBvcmlnaW5hbFZhbHVlID0gJGxhbmd1YWdlRHJvcGRvd24udmFsKCk7XG4gICAgICAgICAgICBpc0RhdGFMb2FkZWQgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZHJvcGRvd24gY2hhbmdlIGV2ZW50XG4gICAgICAgICRsYW5ndWFnZURyb3Bkb3duLmNsb3Nlc3QoJy5kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IHNob3cgd2FybmluZyBhZnRlciBkYXRhIGlzIGxvYWRlZCBhbmQgdmFsdWUgY2hhbmdlZCBmcm9tIG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgaWYgKGlzRGF0YUxvYWRlZCAmJiBvcmlnaW5hbFZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSBvcmlnaW5hbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICRyZXN0YXJ0V2FybmluZy50cmFuc2l0aW9uKCdmYWRlIGluJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0RhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJlc3RhcnRXYXJuaW5nLnRyYW5zaXRpb24oJ2ZhZGUgb3V0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gb25seSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGlmIChpc0RhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIFJFU1QgQVBJIG1vZGVcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBHZW5lcmFsU2V0dGluZ3NBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlU2V0dGluZ3MnO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb24gZm9yIGNsZWFuZXIgQVBJIHJlcXVlc3RzXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIEVuYWJsZSBzZW5kaW5nIG9ubHkgY2hhbmdlZCBmaWVsZHMgZm9yIG9wdGltYWwgUEFUQ0ggc2VtYW50aWNzXG4gICAgICAgIEZvcm0uc2VuZE9ubHlDaGFuZ2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBObyByZWRpcmVjdCBhZnRlciBzYXZlIC0gc3RheSBvbiB0aGUgc2FtZSBwYWdlXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IG51bGw7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBudWxsO1xuICAgICAgICBGb3JtLnVybCA9IGAjYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZ2VuZXJhbFNldHRpbmdzIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=