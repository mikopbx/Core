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
    prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoLowSimvol
  }, {
    type: 'notRegExp',
    value: /\d/,
    prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoNumbers
  }, {
    type: 'notRegExp',
    value: /[A-Z]/,
    prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.gs_PasswordNoUpperSimvol
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
    prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.gs_PasswordNoLowSimvol
  }, {
    type: 'notRegExp',
    value: /\d/,
    prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.gs_PasswordNoNumbers
  }, {
    type: 'notRegExp',
    value: /[A-Z]/,
    prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.gs_PasswordNoUpperSimvol
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
        var warningHtml = "\n                    <div class=\"ui negative icon message password-validate\">\n                        <i class=\"exclamation triangle icon\"></i>\n                        <div class=\"content\">\n                            <div class=\"header\">".concat(globalTranslate.gs_SetPassword || 'Security Warning', "</div>\n                            <p>").concat(globalTranslate.gs_SetPasswordInfo || 'You are using the default password. Please change it for security.', "</p>\n                        </div>\n                    </div>\n                "); // Insert warning before the password fields

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
          var _warningHtml = "\n                        <div class=\"ui negative icon message password-validate\">\n                            <i class=\"exclamation triangle icon\"></i>\n                            <div class=\"content\">\n                                <div class=\"header\">".concat(globalTranslate.gs_SetPassword || 'Security Warning', "</div>\n                                <p>").concat(globalTranslate.gs_SetPasswordInfo || 'You are using the default password. Please change it for security.', "</p>\n                            </div>\n                        </div>\n                    "); // Insert warning before the SSH password fields


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJjb2RlY3NDaGFuZ2VkIiwiZGF0YUxvYWRlZCIsInZhbGlkYXRlUnVsZXMiLCJwYnhuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lIiwiV2ViQWRtaW5QYXNzd29yZCIsIldlYkFkbWluUGFzc3dvcmRSZXBlYXQiLCJnc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50IiwiU1NIUGFzc3dvcmQiLCJTU0hQYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJXRUJQb3J0IiwiZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJXRUJIVFRQU1BvcnQiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UiLCJnc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0IiwiQUpBTVBvcnQiLCJnc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSIsIlNJUEF1dGhQcmVmaXgiLCJnc19TSVBBdXRoUHJlZml4SW52YWxpZCIsIndlYkFkbWluUGFzc3dvcmRSdWxlcyIsImdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkIiwidmFsdWUiLCJnc19QYXNzd29yZHMiLCJnc19QYXNzd29yZE5vTG93U2ltdm9sIiwiZ3NfUGFzc3dvcmROb051bWJlcnMiLCJnc19QYXNzd29yZE5vVXBwZXJTaW12b2wiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3MiLCJnc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQiLCJnc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCIsImdzX1NTSFBhc3N3b3JkIiwiYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3MiLCJjbGlwYm9hcmQiLCJpbml0aWFsaXplIiwibGVuZ3RoIiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwiY29udGV4dCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwidmFsaWRhdGVPbklucHV0Iiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwiY2hlY2tPbkxvYWQiLCJzc2hXaWRnZXQiLCJvbiIsImlzRGlzYWJsZWQiLCJjaGVja2JveCIsImhpZGVXYXJuaW5ncyIsImVsZW1lbnRzIiwiJHNjb3JlU2VjdGlvbiIsImhpZGUiLCJjaGVja1Bhc3N3b3JkIiwidmFsIiwiaW5pdFJ1bGVzIiwiZmluZCIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZUFNSUFKQU1EZXBlbmRlbmN5IiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzIiwiaW5pdGlhbGl6ZUNsaXBib2FyZCIsInNob3dIaWRlU1NIUGFzc3dvcmQiLCJ3aW5kb3ciLCJldmVudCIsIm5hbWVUYWIiLCJHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmciLCJsb2FkRGF0YSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMiLCJGb3JtIiwic2hvd0xvYWRpbmdTdGF0ZSIsIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsInBhc3N3b3JkVmFsaWRhdGlvbiIsInNldFRpbWVvdXQiLCJzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MiLCJtZXNzYWdlcyIsImNvbnNvbGUiLCJlcnJvciIsInNob3dBcGlFcnJvciIsInNldHRpbmdzIiwiY29kZWNzIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJwb3B1bGF0ZVNwZWNpYWxGaWVsZHMiLCJsb2FkU291bmRGaWxlVmFsdWVzIiwidXBkYXRlQ29kZWNUYWJsZXMiLCJpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMiLCJyZW1vdmVDbGFzcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNzaEtleXNUYWJsZSIsImRvY3VtZW50IiwidHJpZ2dlciIsIldFQkhUVFBTUHVibGljS2V5X2luZm8iLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsIiRjaGVja2JveCIsImlzQ2hlY2tlZCIsIiRkcm9wZG93biIsImhhc0NsYXNzIiwiZm9ybSIsImVycm9yTWVzc2FnZSIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInZhbGlkYXRpb24iLCJyZW1vdmUiLCJpc0RlZmF1bHRXZWJQYXNzd29yZCIsIiR3ZWJQYXNzd29yZEZpZWxkcyIsImNsb3Nlc3QiLCJ3YXJuaW5nSHRtbCIsImdzX1NldFBhc3N3b3JkIiwiZ3NfU2V0UGFzc3dvcmRJbmZvIiwiYmVmb3JlIiwiaXNEZWZhdWx0U1NIUGFzc3dvcmQiLCJzc2hQYXNzd29yZERpc2FibGVkIiwiJHNzaFBhc3N3b3JkRmllbGRzIiwiZGF0YUluIiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4iLCJTb3VuZEZpbGVTZWxlY3RvciIsImNhdGVnb3J5IiwiaW5jbHVkZUVtcHR5IiwiZGF0YU91dCIsIlBCWFJlY29yZEFubm91bmNlbWVudE91dCIsImF1ZGlvQ29kZWNzIiwiZmlsdGVyIiwiYyIsInNvcnQiLCJhIiwiYiIsInByaW9yaXR5IiwidmlkZW9Db2RlY3MiLCJidWlsZENvZGVjVGFibGUiLCJzaG93IiwiaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AiLCIkdGFibGVCb2R5IiwiZW1wdHkiLCJjb2RlYyIsImluZGV4IiwibmFtZSIsImRpc2FibGVkIiwiY2hlY2tlZCIsInJvd0h0bWwiLCJlc2NhcGVIdG1sIiwiZGVzY3JpcHRpb24iLCJhcHBlbmQiLCJvbkNoYW5nZSIsImRhdGFDaGFuZ2VkIiwidGFibGVEbkQiLCJvbkRyYWdDbGFzcyIsImRyYWdIYW5kbGUiLCJvbkRyb3AiLCJpbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCIsIiRjZXJ0UHViS2V5RmllbGQiLCJmdWxsVmFsdWUiLCIkY29udGFpbmVyIiwiY2VydEluZm8iLCJkaXNwbGF5VGV4dCIsInBhcnRzIiwic3ViamVjdCIsInB1c2giLCJpc3N1ZXIiLCJpc19zZWxmX3NpZ25lZCIsInZhbGlkX3RvIiwiaXNfZXhwaXJlZCIsImRheXNfdW50aWxfZXhwaXJ5IiwidHJ1bmNhdGVDZXJ0aWZpY2F0ZSIsInN0YXR1c0NsYXNzIiwiZGlzcGxheUh0bWwiLCJidF9Ub29sVGlwQ29weUNlcnQiLCJidF9Ub29sVGlwQ2VydEluZm8iLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBEZWxldGUiLCJyZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMiLCJnc19QYXN0ZVB1YmxpY0NlcnQiLCJidF9TYXZlIiwiYnRfQ2FuY2VsIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGRldGFpbHMiLCJzbGlkZVRvZ2dsZSIsImZvY3VzIiwibmV3VmFsdWUiLCJjaGVja1ZhbHVlcyIsInBvcHVwIiwiZGVzdHJveSIsImF0dHIiLCJvZmYiLCIkc3NoUHViS2V5RmllbGQiLCJ0cnVuY2F0ZWQiLCJ0cnVuY2F0ZVNTSEtleSIsImJ0X1Rvb2xUaXBDb3B5S2V5IiwiYnRfVG9vbFRpcEV4cGFuZCIsIiRmdWxsRGlzcGxheSIsIiR0cnVuY2F0ZWREaXNwbGF5IiwiJGljb24iLCJpcyIsImFkZENsYXNzIiwiZ3NfTm9TU0hQdWJsaWNLZXkiLCIkY2VydFByaXZLZXlGaWVsZCIsImN1cnJlbnRWYWx1ZSIsImhhc1ZhbHVlIiwiZ3NfUHJpdmF0ZUtleUlzU2V0IiwiZ3NfUmVwbGFjZSIsImdzX1Bhc3RlUHJpdmF0ZUtleSIsIiRuZXdGaWVsZCIsIkNsaXBib2FyZEpTIiwiJGJ0biIsIm9yaWdpbmFsSWNvbiIsImNsZWFyU2VsZWN0aW9uIiwiZ3NfQ29weUZhaWxlZCIsInNwbGl0Iiwia2V5VHlwZSIsImtleURhdGEiLCJjb21tZW50Iiwic2xpY2UiLCJzdWJzdHJpbmciLCJ0cmltIiwiY2VydCIsImxpbmVzIiwibGluZSIsImZpcnN0TGluZSIsImxhc3RMaW5lIiwiaW5jbHVkZXMiLCJjbGVhbkNlcnQiLCJyZXBsYWNlIiwidGV4dCIsIm1hcCIsIm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwiV0VCSFRUUFNQcml2YXRlS2V5IiwidW5kZWZpbmVkIiwicHJpdmF0ZUtleVZhbHVlIiwiV0VCSFRUUFNQdWJsaWNLZXkiLCJmaWVsZHNUb1JlbW92ZSIsInN0YXJ0c1dpdGgiLCJzaG91bGRQcm9jZXNzQ29kZWNzIiwic2VuZE9ubHlDaGFuZ2VkIiwiYXJyQ29kZWNzIiwiZWFjaCIsImN1cnJlbnRJbmRleCIsIm9iaiIsImNvZGVjTmFtZSIsImN1cnJlbnREaXNhYmxlZCIsImNiQWZ0ZXJTZW5kRm9ybSIsIiRzdWJtaXRCdXR0b24iLCJnZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwiLCJmYWRlT3V0IiwiZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsIiwiY2hlY2tEZWxldGVDb25kaXRpb25zIiwiJGRpdiIsImlkIiwiJGhlYWRlciIsImdzX0Vycm9yU2F2ZVNldHRpbmdzIiwiJHVsIiwibWVzc2FnZXNTZXQiLCJTZXQiLCJtc2dUeXBlIiwidGV4dENvbnRlbnQiLCJtZXNzYWdlIiwiaGFzIiwiYWRkIiwiaHRtbCIsInZhbGlkX2Zyb20iLCJzYW4iLCIkYW1pQ2hlY2tib3giLCIkYWphbUNoZWNrYm94IiwidXBkYXRlQUpBTVN0YXRlIiwiaXNBTUlFbmFibGVkIiwiZ3NfQUpBTVJlcXVpcmVzQU1JIiwicmVtb3ZlQXR0ciIsIiRsYW5ndWFnZURyb3Bkb3duIiwiJHJlc3RhcnRXYXJuaW5nIiwib3JpZ2luYWxWYWx1ZSIsImlzRGF0YUxvYWRlZCIsInRyYW5zaXRpb24iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ1cmwiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBR0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEscUJBQXFCLEdBQUc7QUFDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsd0JBQUQsQ0FMZTs7QUFPMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUVELENBQUMsQ0FBQyxtQkFBRCxDQVhNOztBQWExQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxZQUFZLEVBQUVGLENBQUMsQ0FBQyxjQUFELENBakJXOztBQW1CMUI7QUFDSjtBQUNBO0FBQ0E7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TyxJQUFBQSxJQUFJLENBQUNsRixhQUFMLEdBQXFCZixxQkFBcUIsQ0FBQ2UsYUFBM0M7QUFDQWtGLElBQUFBLElBQUksQ0FBQzJLLGdCQUFMLEdBQXdCNVEscUJBQXFCLENBQUM0USxnQkFBOUM7QUFDQTNLLElBQUFBLElBQUksQ0FBQzBMLGVBQUwsR0FBdUIzUixxQkFBcUIsQ0FBQzJSLGVBQTdDO0FBQ0ExTCxJQUFBQSxJQUFJLENBQUN6QyxVQUFMO0FBQ0g7QUFyOEN5QixDQUE5QixDLENBdzhDQTs7QUFDQXRELENBQUMsQ0FBQzRILFFBQUQsQ0FBRCxDQUFZcU0sS0FBWixDQUFrQixZQUFNO0FBQ3BCblUsRUFBQUEscUJBQXFCLENBQUN3RCxVQUF0QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGFzc3dvcmRTY29yZSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSwgU291bmRGaWxlU2VsZWN0b3IsIEdlbmVyYWxTZXR0aW5nc0FQSSwgQ2xpcGJvYXJkSlMsIFBhc3N3b3JkV2lkZ2V0LCBQYXNzd29yZFZhbGlkYXRpb25BUEksIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyLCAkICovXG5cbi8qKlxuICogQSBtb2R1bGUgdG8gaGFuZGxlIG1vZGlmaWNhdGlvbiBvZiBnZW5lcmFsIHNldHRpbmdzLlxuICovXG5jb25zdCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBhZG1pbiBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR3ZWJBZG1pblBhc3N3b3JkOiAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZDogJCgnI1NTSFBhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgd2ViIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXNhYmxlU1NIUGFzc3dvcmQ6ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5wYXJlbnQoJy5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZFNlZ21lbnQ6ICQoJyNvbmx5LWlmLXBhc3N3b3JkLWVuYWJsZWQnKSxcblxuICAgIC8qKlxuICAgICAqIElmIHBhc3N3b3JkIHNldCwgaXQgd2lsbCBiZSBoaWRlZCBmcm9tIHdlYiB1aS5cbiAgICAgKi9cbiAgICBoaWRkZW5QYXNzd29yZDogJ3h4eHh4eHgnLFxuXG4gICAgLyoqXG4gICAgICogU291bmQgZmlsZSBmaWVsZCBJRHNcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHNvdW5kRmlsZUZpZWxkczoge1xuICAgICAgICBhbm5vdW5jZW1lbnRJbjogJ1BCWFJlY29yZEFubm91bmNlbWVudEluJyxcbiAgICAgICAgYW5ub3VuY2VtZW50T3V0OiAnUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0J1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogT3JpZ2luYWwgY29kZWMgc3RhdGUgZnJvbSBsYXN0IGxvYWRcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIG9yaWdpbmFsQ29kZWNTdGF0ZToge30sXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHRyYWNrIGlmIGNvZGVjcyBoYXZlIGJlZW4gY2hhbmdlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGNvZGVjc0NoYW5nZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBkYXRhIGhhcyBiZWVuIGxvYWRlZCBmcm9tIEFQSVxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGRhdGFMb2FkZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7IC8vIGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzXG4gICAgICAgIHBieG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdQQlhOYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5UEJYTmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV2ViQWRtaW5QYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dlYkFkbWluUGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBXZWJBZG1pblBhc3N3b3JkUmVwZWF0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hdGNoW1dlYkFkbWluUGFzc3dvcmRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWJQYXNzd29yZHNGaWVsZERpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgU1NIUGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTU0hQYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIFNTSFBhc3N3b3JkUmVwZWF0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU1NIUGFzc3dvcmRSZXBlYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXRjaFtTU0hQYXNzd29yZF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVNTSFBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXRUJQb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV0VCUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtXRUJIVFRQU1BvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXRUJIVFRQU1BvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXRUJIVFRQU1BvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtXRUJQb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIEFKQU1Qb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnQUpBTVBvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBTSVBBdXRoUHJlZml4OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU0lQQXV0aFByZWZpeCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cFsvXlthLXpBLVpdKiQvXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhJbnZhbGlkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgZmllbGQgd2hlbiBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICB3ZWJBZG1pblBhc3N3b3JkUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1tBLVpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGVuYWJsZWQsIGFuZCBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGQgd2hlbiBTU0ggbG9naW4gdGhyb3VnaCB0aGUgcGFzc3dvcmQgZGlzYWJsZWRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkLFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8qKlxuICAgICAqIENsaXBib2FyZCBpbnN0YW5jZSBmb3IgY29weSBmdW5jdGlvbmFsaXR5XG4gICAgICogQHR5cGUge0NsaXBib2FyZEpTfVxuICAgICAqL1xuICAgIGNsaXBib2FyZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiAgSW5pdGlhbGl6ZSBtb2R1bGUgd2l0aCBldmVudCBiaW5kaW5ncyBhbmQgY29tcG9uZW50IGluaXRpYWxpemF0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0c1xuICAgICAgICAvLyBXZWIgQWRtaW4gUGFzc3dvcmQgd2lkZ2V0IC0gb25seSB2YWxpZGF0aW9uIGFuZCB3YXJuaW5ncywgbm8gYnV0dG9uc1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIFBhc3N3b3JkV2lkZ2V0LmluaXQoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLCB7XG4gICAgICAgICAgICAgICAgY29udGV4dDogJ2dlbmVyYWxfd2ViJyxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSwgICAgIC8vIE5vIHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTU0ggUGFzc3dvcmQgd2lkZ2V0IC0gb25seSB2YWxpZGF0aW9uIGFuZCB3YXJuaW5ncywgbm8gYnV0dG9uc1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzc2hXaWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQsIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0OiAnZ2VuZXJhbF9zc2gnLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLCAgICAgLy8gTm8gc2hvdy9oaWRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gY29weSBidXR0b25cbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBTU0ggZGlzYWJsZSBjaGVja2JveFxuICAgICAgICAgICAgJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNEaXNhYmxlZCA9ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGlmIChpc0Rpc2FibGVkICYmIHNzaFdpZGdldCkge1xuICAgICAgICAgICAgICAgICAgICBQYXNzd29yZFdpZGdldC5oaWRlV2FybmluZ3Moc3NoV2lkZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNzaFdpZGdldC5lbGVtZW50cy4kc2NvcmVTZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzc2hXaWRnZXQuZWxlbWVudHMuJHNjb3JlU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpc0Rpc2FibGVkICYmIHNzaFdpZGdldCkge1xuICAgICAgICAgICAgICAgICAgICBQYXNzd29yZFdpZGdldC5jaGVja1Bhc3N3b3JkKHNzaFdpZGdldCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIHdoZW4gcGFzc3dvcmRzIGNoYW5nZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgIT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQudmFsKCkgIT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLW1lbnUnKS5maW5kKCcuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGRyb3Bkb3ducyBvbiB0aGUgZm9ybSAoZXhjZXB0IHNvdW5kIGZpbGUgc2VsZWN0b3JzKVxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5kcm9wZG93bicpLm5vdCgnLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3hlcyBvbiB0aGUgZm9ybVxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIEFNSS9BSkFNIGRlcGVuZGVuY3kgYWZ0ZXIgY2hlY2tib3hlcyBhcmUgaW5pdGlhbGl6ZWRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSgpO1xuXG4gICAgICAgIC8vIENvZGVjIHRhYmxlIGRyYWctbi1kcm9wIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gU2VlIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkgd2hpY2ggaXMgY2FsbGVkIGZyb20gdXBkYXRlQ29kZWNUYWJsZXMoKVxuXG4gICAgICAgIC8vIFNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgUkVTVCBBUEkgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gU2VlIGxvYWRTb3VuZEZpbGVWYWx1ZXMoKSBtZXRob2QgY2FsbGVkIGZyb20gcG9wdWxhdGVGb3JtKClcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogU1NIIGtleXMgdGFibGUgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGxvYWRzXG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgZGlzcGxheVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIGNvcHkgYnV0dG9uc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWRkaXRpb25hbCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcblxuICAgICAgICAvLyBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KHtcbiAgICAgICAgICAgICdvbkNoYW5nZSc6IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkXG4gICAgICAgIH0pO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0hpZGVTU0hQYXNzd29yZCgpO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBoYW5kbGUgdGFiIGFjdGl2YXRpb25cbiAgICAgICAgJCh3aW5kb3cpLm9uKCdHUy1BY3RpdmF0ZVRhYicsIChldmVudCwgbmFtZVRhYikgPT4ge1xuICAgICAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKCdjaGFuZ2UgdGFiJywgbmFtZVRhYik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaWYgKHR5cGVvZiBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRvb2x0aXAgY2xpY2sgYmVoYXZpb3IgaXMgbm93IGhhbmRsZWQgZ2xvYmFsbHkgaW4gVG9vbHRpcEJ1aWxkZXIuanNcblxuICAgICAgICAvLyBJbml0aWFsaXplIFBCWExhbmd1YWdlIGNoYW5nZSBkZXRlY3Rpb24gZm9yIHJlc3RhcnQgd2FybmluZ1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVBCWExhbmd1YWdlV2FybmluZygpO1xuXG4gICAgICAgIC8vIExvYWQgZGF0YSBmcm9tIEFQSSBpbnN0ZWFkIG9mIHVzaW5nIHNlcnZlci1yZW5kZXJlZCB2YWx1ZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWREYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvcnMgd2l0aCBwbGF5YmFjayBmdW5jdGlvbmFsaXR5IHVzaW5nIFNvdW5kRmlsZVNlbGVjdG9yXG4gICAgICogSFRNTCBzdHJ1Y3R1cmUgaXMgcHJvdmlkZWQgYnkgdGhlIHBsYXlBZGROZXdTb3VuZFdpdGhJY29ucyBwYXJ0aWFsIGluIHJlY29yZGluZy52b2x0OlxuICAgICAqIC0gSGlkZGVuIGlucHV0OiA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiUEJYUmVjb3JkQW5ub3VuY2VtZW50SW5cIiBuYW1lPVwiUEJYUmVjb3JkQW5ub3VuY2VtZW50SW5cIj5cbiAgICAgKiAtIERyb3Bkb3duIGRpdjogPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93biBzZWFyY2ggUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4tZHJvcGRvd25cIj5cbiAgICAgKiAtIFBsYXliYWNrIGJ1dHRvbiBhbmQgYWRkIG5ldyBidXR0b25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3JzKCkge1xuICAgICAgICAvLyBTb3VuZCBmaWxlIHNlbGVjdG9ycyB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIFNlZSBpbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3JXaXRoRGF0YSgpIGNhbGxlZCBmcm9tIHBvcHVsYXRlRm9ybSgpXG4gICAgICAgIFxuICAgICAgICAvLyBUaGlzIG1ldGhvZCBpcyBrZXB0IGZvciBjb25zaXN0ZW5jeSBidXQgYWN0dWFsIGluaXRpYWxpemF0aW9uIGhhcHBlbnNcbiAgICAgICAgLy8gd2hlbiB3ZSBoYXZlIGRhdGEgZnJvbSB0aGUgc2VydmVyIGluIGxvYWRTb3VuZEZpbGVWYWx1ZXMoKVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGdlbmVyYWwgc2V0dGluZ3MgZGF0YSBmcm9tIEFQSVxuICAgICAqIFVzZWQgYm90aCBvbiBpbml0aWFsIHBhZ2UgbG9hZCBhbmQgZm9yIG1hbnVhbCByZWZyZXNoXG4gICAgICogQ2FuIGJlIGNhbGxlZCBhbnl0aW1lIHRvIHJlbG9hZCB0aGUgZm9ybSBkYXRhOiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkubG9hZERhdGEoKVxuICAgICAqL1xuICAgIGxvYWREYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGUgb24gdGhlIGZvcm0gd2l0aCBkaW1tZXJcbiAgICAgICAgRm9ybS5zaG93TG9hZGluZ1N0YXRlKHRydWUsICdMb2FkaW5nIHNldHRpbmdzLi4uJyk7XG5cbiAgICAgICAgR2VuZXJhbFNldHRpbmdzQVBJLmdldFNldHRpbmdzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgRm9ybS5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCB0aGUgcmVjZWl2ZWQgZGF0YVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmRhdGFMb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNob3cgd2FybmluZ3MgZm9yIGRlZmF1bHQgcGFzc3dvcmRzIGFmdGVyIERPTSB1cGRhdGVcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5wYXNzd29yZFZhbGlkYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIERPTSBpcyB1cGRhdGVkIGFmdGVyIHBvcHVsYXRlRm9ybVxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MocmVzcG9uc2UuZGF0YS5wYXNzd29yZFZhbGlkYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBUEkgRXJyb3I6JywgcmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0FwaUVycm9yKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gU2V0dGluZ3MgZGF0YSBmcm9tIEFQSSByZXNwb25zZVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIEV4dHJhY3Qgc2V0dGluZ3MgYW5kIGFkZGl0aW9uYWwgZGF0YVxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IGRhdGEuc2V0dGluZ3MgfHwgZGF0YTtcbiAgICAgICAgY29uc3QgY29kZWNzID0gZGF0YS5jb2RlY3MgfHwgW107XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHNldHRpbmdzLCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc3BlY2lhbCBmaWVsZCB0eXBlc1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5wb3B1bGF0ZVNwZWNpYWxGaWVsZHMoZm9ybURhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIExvYWQgc291bmQgZmlsZSB2YWx1ZXMgd2l0aCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkubG9hZFNvdW5kRmlsZVZhbHVlcyhmb3JtRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGNvZGVjIHRhYmxlc1xuICAgICAgICAgICAgICAgIGlmIChjb2RlY3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudXBkYXRlQ29kZWNUYWJsZXMoY29kZWNzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCBmaWVsZHMgKGhpZGUgYWN0dWFsIHBhc3N3b3JkcylcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVBhc3N3b3JkRmllbGRzKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgU1NIIHBhc3N3b3JkIHZpc2liaWxpdHlcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0hpZGVTU0hQYXNzd29yZCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBpZiBlbmFibGVkXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTU0gga2V5cyB0YWJsZSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBpZiAodHlwZW9mIHNzaEtleXNUYWJsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHNzaEtleXNUYWJsZS5pbml0aWFsaXplKCdzc2gta2V5cy1jb250YWluZXInLCAnU1NIQXV0aG9yaXplZEtleXMnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSB0cnVuY2F0ZWQgZmllbGRzIHdpdGggbmV3IGRhdGFcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyaWdnZXIgZXZlbnQgdG8gbm90aWZ5IHRoYXQgZGF0YSBoYXMgYmVlbiBsb2FkZWRcbiAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignR2VuZXJhbFNldHRpbmdzLmRhdGFMb2FkZWQnKTtcblxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHNwZWNpYWwgZmllbGQgdHlwZXMgdGhhdCBuZWVkIGN1c3RvbSBwb3B1bGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlU3BlY2lhbEZpZWxkcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBQcml2YXRlIGtleSBleGlzdGVuY2UgaXMgbm93IGRldGVybWluZWQgYnkgY2hlY2tpbmcgaWYgdmFsdWUgZXF1YWxzIEhJRERFTl9QQVNTV09SRFxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNlcnRpZmljYXRlIGluZm9cbiAgICAgICAgaWYgKHNldHRpbmdzLldFQkhUVFBTUHVibGljS2V5X2luZm8pIHtcbiAgICAgICAgICAgICQoJyNXRUJIVFRQU1B1YmxpY0tleScpLmRhdGEoJ2NlcnQtaW5mbycsIHNldHRpbmdzLldFQkhUVFBTUHVibGljS2V5X2luZm8pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2hlY2tib3hlcyAoQVBJIHJldHVybnMgYm9vbGVhbiB2YWx1ZXMpXG4gICAgICAgIE9iamVjdC5rZXlzKHNldHRpbmdzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKGAjJHtrZXl9YCkucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgIGlmICgkY2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IHNldHRpbmdzW2tleV0gPT09IHRydWUgfHwgc2V0dGluZ3Nba2V5XSA9PT0gJzEnIHx8IHNldHRpbmdzW2tleV0gPT09IDE7XG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmNoZWNrYm94KGlzQ2hlY2tlZCA/ICdjaGVjaycgOiAndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgcmVndWxhciBkcm9wZG93bnMgKGV4Y2x1ZGluZyBzb3VuZCBmaWxlIHNlbGVjdG9ycyB3aGljaCBhcmUgaGFuZGxlZCBzZXBhcmF0ZWx5KVxuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7a2V5fWApLnBhcmVudCgnLmRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA+IDAgJiYgISRkcm9wZG93bi5oYXNDbGFzcygnYXVkaW8tbWVzc2FnZS1zZWxlY3QnKSkge1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2V0dGluZ3Nba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCBmaWVsZHMgd2l0aCBoaWRkZW4gcGFzc3dvcmQgaW5kaWNhdG9yXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYXNzd29yZEZpZWxkcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBIaWRlIGFjdHVhbCBwYXNzd29yZHMgYW5kIHNob3cgaGlkZGVuIGluZGljYXRvclxuICAgICAgICBpZiAoc2V0dGluZ3MuV2ViQWRtaW5QYXNzd29yZCAmJiBzZXR0aW5ncy5XZWJBZG1pblBhc3N3b3JkICE9PSAnJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChzZXR0aW5ncy5TU0hQYXNzd29yZCAmJiBzZXR0aW5ncy5TU0hQYXNzd29yZCAhPT0gJycpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgQVBJIGVycm9yIG1lc3NhZ2VzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG1lc3NhZ2VzIC0gRXJyb3IgbWVzc2FnZXMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBzaG93QXBpRXJyb3IobWVzc2FnZXMpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBBcnJheS5pc0FycmF5KG1lc3NhZ2VzLmVycm9yKSBcbiAgICAgICAgICAgICAgICA/IG1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgXG4gICAgICAgICAgICAgICAgOiBtZXNzYWdlcy5lcnJvcjtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHdhcm5pbmdzIGZvciBkZWZhdWx0IHBhc3N3b3Jkc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB2YWxpZGF0aW9uIC0gUGFzc3dvcmQgdmFsaWRhdGlvbiByZXN1bHRzIGZyb20gQVBJXG4gICAgICovXG4gICAgc2hvd0RlZmF1bHRQYXNzd29yZFdhcm5pbmdzKHZhbGlkYXRpb24pIHtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBwYXNzd29yZC12YWxpZGF0ZSBtZXNzYWdlcyBmaXJzdFxuICAgICAgICAkKCcucGFzc3dvcmQtdmFsaWRhdGUnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgd2FybmluZyBmb3IgZGVmYXVsdCBXZWIgQWRtaW4gcGFzc3dvcmRcbiAgICAgICAgaWYgKHZhbGlkYXRpb24uaXNEZWZhdWx0V2ViUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIHBhc3N3b3JkIGZpZWxkcyBncm91cCAtIHRyeSBtdWx0aXBsZSBzZWxlY3RvcnNcbiAgICAgICAgICAgIGxldCAkd2ViUGFzc3dvcmRGaWVsZHMgPSAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLmNsb3Nlc3QoJy50d28uZmllbGRzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkd2ViUGFzc3dvcmRGaWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IGFsdGVybmF0aXZlIHNlbGVjdG9yIGlmIHRoZSBmaXJzdCBvbmUgZG9lc24ndCB3b3JrXG4gICAgICAgICAgICAgICAgJHdlYlBhc3N3b3JkRmllbGRzID0gJCgnI1dlYkFkbWluUGFzc3dvcmQnKS5wYXJlbnQoKS5wYXJlbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCR3ZWJQYXNzd29yZEZpZWxkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgaWNvbiBtZXNzYWdlIHBhc3N3b3JkLXZhbGlkYXRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19TZXRQYXNzd29yZCB8fCAnU2VjdXJpdHkgV2FybmluZyd9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfU2V0UGFzc3dvcmRJbmZvIHx8ICdZb3UgYXJlIHVzaW5nIHRoZSBkZWZhdWx0IHBhc3N3b3JkLiBQbGVhc2UgY2hhbmdlIGl0IGZvciBzZWN1cml0eS4nfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluc2VydCB3YXJuaW5nIGJlZm9yZSB0aGUgcGFzc3dvcmQgZmllbGRzXG4gICAgICAgICAgICAgICAgJHdlYlBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgd2FybmluZyBmb3IgZGVmYXVsdCBTU0ggcGFzc3dvcmRcbiAgICAgICAgaWYgKHZhbGlkYXRpb24uaXNEZWZhdWx0U1NIUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIFNTSCBwYXNzd29yZCBsb2dpbiBpcyBlbmFibGVkXG4gICAgICAgICAgICBjb25zdCBzc2hQYXNzd29yZERpc2FibGVkID0gJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghc3NoUGFzc3dvcmREaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHMgZ3JvdXBcbiAgICAgICAgICAgICAgICBsZXQgJHNzaFBhc3N3b3JkRmllbGRzID0gJCgnI1NTSFBhc3N3b3JkJykuY2xvc2VzdCgnLnR3by5maWVsZHMnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJHNzaFBhc3N3b3JkRmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgYWx0ZXJuYXRpdmUgc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzID0gJCgnI1NTSFBhc3N3b3JkJykucGFyZW50KCkucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkc3NoUGFzc3dvcmRGaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgd2FybmluZyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIGljb24gbWVzc2FnZSBwYXNzd29yZC12YWxpZGF0ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfU2V0UGFzc3dvcmQgfHwgJ1NlY3VyaXR5IFdhcm5pbmcnfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5nc19TZXRQYXNzd29yZEluZm8gfHwgJ1lvdSBhcmUgdXNpbmcgdGhlIGRlZmF1bHQgcGFzc3dvcmQuIFBsZWFzZSBjaGFuZ2UgaXQgZm9yIHNlY3VyaXR5Lid9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgd2FybmluZyBiZWZvcmUgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFuZCBsb2FkIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggZGF0YSwgc2ltaWxhciB0byBJVlIgaW1wbGVtZW50YXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNvdW5kRmlsZVZhbHVlcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBDb252ZXJ0IGVtcHR5IHZhbHVlcyB0byAtMSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICAgIGNvbnN0IGRhdGFJbiA9IHsuLi5zZXR0aW5nc307XG4gICAgICAgIGlmICghc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gfHwgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gPT09ICcnKSB7XG4gICAgICAgICAgICBkYXRhSW4uUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4gPSAnLTEnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbmNvbWluZyBhbm5vdW5jZW1lbnQgc2VsZWN0b3Igd2l0aCBkYXRhIChmb2xsb3dpbmcgSVZSIHBhdHRlcm4pXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ1BCWFJlY29yZEFubm91bmNlbWVudEluJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YUluXG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgZW1wdHkgdmFsdWVzIHRvIC0xIGZvciB0aGUgZHJvcGRvd25cbiAgICAgICAgY29uc3QgZGF0YU91dCA9IHsuLi5zZXR0aW5nc307XG4gICAgICAgIGlmICghc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IHx8IHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudE91dCA9PT0gJycpIHtcbiAgICAgICAgICAgIGRhdGFPdXQuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0ID0gJy0xJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3V0Z29pbmcgYW5ub3VuY2VtZW50IHNlbGVjdG9yIHdpdGggZGF0YSAoZm9sbG93aW5nIElWUiBwYXR0ZXJuKVxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdQQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQnLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhT3V0XG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhbmQgdXBkYXRlIGNvZGVjIHRhYmxlcyB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb2RlY3MgLSBBcnJheSBvZiBjb2RlYyBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcykge1xuICAgICAgICAvLyBSZXNldCBjb2RlYyBjaGFuZ2UgZmxhZyB3aGVuIGxvYWRpbmcgZGF0YVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIGNvZGVjIHN0YXRlIGZvciBjb21wYXJpc29uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNlcGFyYXRlIGF1ZGlvIGFuZCB2aWRlbyBjb2RlY3NcbiAgICAgICAgY29uc3QgYXVkaW9Db2RlY3MgPSBjb2RlY3MuZmlsdGVyKGMgPT4gYy50eXBlID09PSAnYXVkaW8nKS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgIGNvbnN0IHZpZGVvQ29kZWNzID0gY29kZWNzLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ3ZpZGVvJykuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgYXVkaW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUoYXVkaW9Db2RlY3MsICdhdWRpbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgdmlkZW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUodmlkZW9Db2RlY3MsICd2aWRlbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSBsb2FkZXJzIGFuZCBzaG93IHRhYmxlc1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLWxvYWRlciwgI3ZpZGVvLWNvZGVjcy1sb2FkZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUsICN2aWRlby1jb2RlY3MtdGFibGUnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIHJlb3JkZXJpbmdcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb2RlYyB0YWJsZSByb3dzIGZyb20gZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvZGVjcyAtIEFycmF5IG9mIGNvZGVjIG9iamVjdHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtICdhdWRpbycgb3IgJ3ZpZGVvJ1xuICAgICAqL1xuICAgIGJ1aWxkQ29kZWNUYWJsZShjb2RlY3MsIHR5cGUpIHtcbiAgICAgICAgY29uc3QgJHRhYmxlQm9keSA9ICQoYCMke3R5cGV9LWNvZGVjcy10YWJsZSB0Ym9keWApO1xuICAgICAgICAkdGFibGVCb2R5LmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICBjb2RlY3MuZm9yRWFjaCgoY29kZWMsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBzdGF0ZSBmb3IgY2hhbmdlIGRldGVjdGlvblxuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZVtjb2RlYy5uYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXgsXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGNvZGVjLmRpc2FibGVkXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFibGUgcm93XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gY29kZWMuZGlzYWJsZWQgPT09IHRydWUgfHwgY29kZWMuZGlzYWJsZWQgPT09ICcxJyB8fCBjb2RlYy5kaXNhYmxlZCA9PT0gMTtcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrZWQgPSAhaXNEaXNhYmxlZCA/ICdjaGVja2VkJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCByb3dIdG1sID0gYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cImNvZGVjLXJvd1wiIGlkPVwiY29kZWMtJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtpbmRleH1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb2RlYy1uYW1lPVwiJHtjb2RlYy5uYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtb3JpZ2luYWwtcHJpb3JpdHk9XCIke2luZGV4fVwiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJjb2xsYXBzaW5nIGRyYWdIYW5kbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic29ydCBncmV5IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggY29kZWNzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwiY29kZWNfJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2NoZWNrZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmluZGV4PVwiMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJjb2RlY18ke2NvZGVjLm5hbWV9XCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjb2RlYy5kZXNjcmlwdGlvbiB8fCBjb2RlYy5uYW1lKX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICR0YWJsZUJvZHkuYXBwZW5kKHJvd0h0bWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyBmb3IgdGhlIG5ldyByb3dzXG4gICAgICAgICR0YWJsZUJvZHkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgY29kZWNzIGFzIGNoYW5nZWQgYW5kIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jb2RlY3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIGNvZGVjIHRhYmxlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkge1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlLCAjdmlkZW8tY29kZWNzLXRhYmxlJykudGFibGVEbkQoe1xuICAgICAgICAgICAgb25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnLFxuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGNvZGVjcyBhcyBjaGFuZ2VkIGFuZCBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjZXJ0aWZpY2F0ZSBmaWVsZCBkaXNwbGF5IG9ubHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpIHtcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIG9ubHlcbiAgICAgICAgY29uc3QgJGNlcnRQdWJLZXlGaWVsZCA9ICQoJyNXRUJIVFRQU1B1YmxpY0tleScpO1xuICAgICAgICBpZiAoJGNlcnRQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRjZXJ0UHViS2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGNlcnRpZmljYXRlIGluZm8gaWYgYXZhaWxhYmxlIGZyb20gZGF0YSBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGNlcnRJbmZvID0gJGNlcnRQdWJLZXlGaWVsZC5kYXRhKCdjZXJ0LWluZm8nKSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzIGZvciB0aGlzIGZpZWxkIG9ubHlcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheSwgLmNlcnQtZWRpdC1mb3JtJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbWVhbmluZ2Z1bCBkaXNwbGF5IHRleHQgZnJvbSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgICAgICAgICAgbGV0IGRpc3BsYXlUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHN1YmplY3QvZG9tYWluXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDwn5OcICR7Y2VydEluZm8uc3ViamVjdH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGlzc3VlciBpZiBub3Qgc2VsZi1zaWduZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3VlciAmJiAhY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYGJ5ICR7Y2VydEluZm8uaXNzdWVyfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKCcoU2VsZi1zaWduZWQpJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCB2YWxpZGl0eSBkYXRlc1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4p2MIEV4cGlyZWQgJHtjZXJ0SW5mby52YWxpZF90b31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDimqDvuI8gRXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKchSBWYWxpZCB1bnRpbCAke2NlcnRJbmZvLnZhbGlkX3RvfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IHBhcnRzLmpvaW4oJyB8ICcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRydW5jYXRlZCBjZXJ0aWZpY2F0ZVxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS50cnVuY2F0ZUNlcnRpZmljYXRlKGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIG9yaWdpbmFsIGZpZWxkXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIHN0YXR1cyBjb2xvciBjbGFzcyBiYXNlZCBvbiBjZXJ0aWZpY2F0ZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBsZXQgc3RhdHVzQ2xhc3MgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICd3YXJuaW5nJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgY2VydC1kaXNwbGF5ICR7c3RhdHVzQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZGlzcGxheVRleHQpfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cImJhc2ljXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlDZXJ0IHx8ICdDb3B5IGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgaW5mby1jZXJ0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDZXJ0SW5mbyB8fCAnQ2VydGlmaWNhdGUgZGV0YWlscyd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBlZGl0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0IHx8ICdFZGl0IGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImVkaXQgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZGVsZXRlLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZSB8fCAnRGVsZXRlIGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInRyYXNoIGljb24gcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAke2NlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvciA/IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5yZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMoY2VydEluZm8pIDogJyd9XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBmb3JtIGNlcnQtZWRpdC1mb3JtXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1B1YmxpY0tleV9lZGl0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M9XCIxMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHVibGljQ2VydCB8fCAnUGFzdGUgcHVibGljIGNlcnRpZmljYXRlIGhlcmUuLi4nfVwiPiR7ZnVsbFZhbHVlfTwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtaW5pIGJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgcG9zaXRpdmUgYnV0dG9uIHNhdmUtY2VydC1idG5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5idF9TYXZlIHx8ICdTYXZlJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGNhbmNlbC1jZXJ0LWJ0blwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNsb3NlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X0NhbmNlbCB8fCAnQ2FuY2VsJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgaW5mbyBidXR0b24gLSB0b2dnbGUgZGV0YWlscyBkaXNwbGF5XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuaW5mby1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZGV0YWlscyA9ICRjb250YWluZXIuZmluZCgnLmNlcnQtZGV0YWlscycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGRldGFpbHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZGV0YWlscy5zbGlkZVRvZ2dsZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVkaXQgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZWRpdC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWVkaXQtZm9ybScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQdWJsaWNLZXlfZWRpdCcpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc2F2ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9ICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHVibGljS2V5X2VkaXQnKS52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgb3JpZ2luYWwgaGlkZGVuIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIGRpc3BsYXkgd2l0aCBuZXcgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGNhbmNlbCBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jYW5jZWwtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1lZGl0LWZvcm0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheScpLnNob3coKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmRlbGV0ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGNlcnRpZmljYXRlXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIHRvIHNob3cgZW1wdHkgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBuZXcgYnV0dG9uc1xuICAgICAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVB1YmxpY0NlcnQgfHwgJ1Bhc3RlIHB1YmxpYyBjZXJ0aWZpY2F0ZSBoZXJlLi4uJyk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdyb3dzJywgJzEwJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNoYW5nZSBldmVudHMgdHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLm9mZignaW5wdXQuY2VydCBjaGFuZ2UuY2VydCBrZXl1cC5jZXJ0Jykub24oJ2lucHV0LmNlcnQgY2hhbmdlLmNlcnQga2V5dXAuY2VydCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyBkaXNwbGF5IGZvciBTU0gga2V5cyBhbmQgY2VydGlmaWNhdGVzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpIHtcbiAgICAgICAgLy8gSGFuZGxlIFNTSF9JRF9SU0FfUFVCIGZpZWxkXG4gICAgICAgIGNvbnN0ICRzc2hQdWJLZXlGaWVsZCA9ICQoJyNTU0hfSURfUlNBX1BVQicpO1xuICAgICAgICBpZiAoJHNzaFB1YktleUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFZhbHVlID0gJHNzaFB1YktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRzc2hQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5zc2gta2V5LWRpc3BsYXksIC5mdWxsLWRpc3BsYXknKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBjcmVhdGUgZGlzcGxheSBpZiB0aGVyZSdzIGEgdmFsdWVcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdHJ1bmNhdGVkIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudHJ1bmNhdGVTU0hLZXkoZnVsbFZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBvcmlnaW5hbCBmaWVsZFxuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgc3NoLWtleS1kaXNwbGF5XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7dHJ1bmNhdGVkfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJiYXNpY1wiIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5S2V5IHx8ICdDb3B5J31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZXhwYW5kLWJ0blwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRXhwYW5kIHx8ICdTaG93IGZ1bGwga2V5J31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4cGFuZCBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBjbGFzcz1cImZ1bGwtZGlzcGxheVwiIHN0eWxlPVwiZGlzcGxheTpub25lO1wiIHJlYWRvbmx5PiR7ZnVsbFZhbHVlfTwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBleHBhbmQvY29sbGFwc2VcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmV4cGFuZC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmdWxsRGlzcGxheSA9ICRjb250YWluZXIuZmluZCgnLmZ1bGwtZGlzcGxheScpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0cnVuY2F0ZWREaXNwbGF5ID0gJGNvbnRhaW5lci5maW5kKCcuc3NoLWtleS1kaXNwbGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKHRoaXMpLmZpbmQoJ2knKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJGZ1bGxEaXNwbGF5LmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICRmdWxsRGlzcGxheS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICR0cnVuY2F0ZWREaXNwbGF5LnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2NvbXByZXNzJykuYWRkQ2xhc3MoJ2V4cGFuZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRmdWxsRGlzcGxheS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICR0cnVuY2F0ZWREaXNwbGF5LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V4cGFuZCcpLmFkZENsYXNzKCdjb21wcmVzcycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBuZXcgZWxlbWVudHNcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBhcyByZWFkLW9ubHkgKHRoaXMgaXMgYSBzeXN0ZW0tZ2VuZXJhdGVkIGtleSlcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5hdHRyKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19Ob1NTSFB1YmxpY0tleSB8fCAnTm8gU1NIIHB1YmxpYyBrZXkgZ2VuZXJhdGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBXRUJIVFRQU1B1YmxpY0tleSBmaWVsZCAtIHVzZSBkZWRpY2F0ZWQgbWV0aG9kXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHJpdmF0ZUtleSBmaWVsZCAod3JpdGUtb25seSB3aXRoIHBhc3N3b3JkIG1hc2tpbmcpXG4gICAgICAgIGNvbnN0ICRjZXJ0UHJpdktleUZpZWxkID0gJCgnI1dFQkhUVFBTUHJpdmF0ZUtleScpO1xuICAgICAgICBpZiAoJGNlcnRQcml2S2V5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQcml2S2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucHJpdmF0ZS1rZXktc2V0LCAjV0VCSFRUUFNQcml2YXRlS2V5X25ldycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBwcml2YXRlIGtleSBleGlzdHMgKHBhc3N3b3JkIG1hc2tpbmcgbG9naWMpXG4gICAgICAgICAgICAvLyBUaGUgZmllbGQgd2lsbCBjb250YWluICd4eHh4eHh4JyBpZiBhIHByaXZhdGUga2V5IGlzIHNldFxuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGNlcnRQcml2S2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCBoYXNWYWx1ZSA9IGN1cnJlbnRWYWx1ZSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaGFzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIG9yaWdpbmFsIGZpZWxkIGFuZCBzaG93IHN0YXR1cyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlIHByaXZhdGUta2V5LXNldFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJsb2NrIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUHJpdmF0ZUtleUlzU2V0IHx8ICdQcml2YXRlIGtleSBpcyBjb25maWd1cmVkJ30gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxhY2Uta2V5LWxpbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19SZXBsYWNlIHx8ICdSZXBsYWNlJ308L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1ByaXZhdGVLZXlfbmV3XCIgbmFtZT1cIldFQkhUVFBTUHJpdmF0ZUtleVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93cz1cIjEwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwiZGlzcGxheTpub25lO1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCIke2dsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVByaXZhdGVLZXkgfHwgJ1Bhc3RlIHByaXZhdGUga2V5IGhlcmUuLi4nfVwiPjwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHJlcGxhY2UgbGlua1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnJlcGxhY2Uta2V5LWxpbmsnKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucHJpdmF0ZS1rZXktc2V0JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkbmV3RmllbGQgPSAkY29udGFpbmVyLmZpbmQoJyNXRUJIVFRQU1ByaXZhdGVLZXlfbmV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICRuZXdGaWVsZC5zaG93KCkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBoaWRkZW4gcGFzc3dvcmQgdmFsdWUgc28gd2UgY2FuIHNldCBhIG5ldyBvbmVcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEJpbmQgY2hhbmdlIGV2ZW50IHRvIHVwZGF0ZSBoaWRkZW4gZmllbGQgYW5kIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAkbmV3RmllbGQub24oJ2lucHV0IGNoYW5nZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBvcmlnaW5hbCBoaWRkZW4gZmllbGQgd2l0aCBuZXcgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnZhbCgkbmV3RmllbGQudmFsKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gdmFsaWRhdGlvbiBjaGVja1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHJpdmF0ZUtleSB8fCAnUGFzdGUgcHJpdmF0ZSBrZXkgaGVyZS4uLicpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3Jvd3MnLCAnMTAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgY2hhbmdlIGV2ZW50cyB0cmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLm9mZignaW5wdXQucHJpdiBjaGFuZ2UucHJpdiBrZXl1cC5wcml2Jykub24oJ2lucHV0LnByaXYgY2hhbmdlLnByaXYga2V5dXAucHJpdicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5IGZvciBjb3B5IGJ1dHRvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2xpcGJvYXJkKCkge1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZCkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jb3B5LWJ0bicpO1xuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBTaG93IHN1Y2Nlc3MgbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoZS50cmlnZ2VyKTtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsSWNvbiA9ICRidG4uZmluZCgnaScpLmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRidG4uZmluZCgnaScpLnJlbW92ZUNsYXNzKCkuYWRkQ2xhc3MoJ2NoZWNrIGljb24nKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRidG4uZmluZCgnaScpLnJlbW92ZUNsYXNzKCkuYWRkQ2xhc3Mob3JpZ2luYWxJY29uKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciBzZWxlY3Rpb25cbiAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLm9uKCdlcnJvcicsICgpID0+IHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZ3NfQ29weUZhaWxlZCB8fCAnRmFpbGVkIHRvIGNvcHkgdG8gY2xpcGJvYXJkJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVHJ1bmNhdGUgU1NIIGtleSBmb3IgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSBGdWxsIFNTSCBrZXlcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRydW5jYXRlZCBrZXlcbiAgICAgKi9cbiAgICB0cnVuY2F0ZVNTSEtleShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkgfHwga2V5Lmxlbmd0aCA8IDUwKSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdCgnICcpO1xuICAgICAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleVR5cGUgPSBwYXJ0c1swXTtcbiAgICAgICAgICAgIGNvbnN0IGtleURhdGEgPSBwYXJ0c1sxXTtcbiAgICAgICAgICAgIGNvbnN0IGNvbW1lbnQgPSBwYXJ0cy5zbGljZSgyKS5qb2luKCcgJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChrZXlEYXRhLmxlbmd0aCA+IDQwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0ga2V5RGF0YS5zdWJzdHJpbmcoMCwgMjApICsgJy4uLicgKyBrZXlEYXRhLnN1YnN0cmluZyhrZXlEYXRhLmxlbmd0aCAtIDE1KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYCR7a2V5VHlwZX0gJHt0cnVuY2F0ZWR9ICR7Y29tbWVudH1gLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRydW5jYXRlIGNlcnRpZmljYXRlIGZvciBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNlcnQgLSBGdWxsIGNlcnRpZmljYXRlXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUcnVuY2F0ZWQgY2VydGlmaWNhdGUgaW4gc2luZ2xlIGxpbmUgZm9ybWF0XG4gICAgICovXG4gICAgdHJ1bmNhdGVDZXJ0aWZpY2F0ZShjZXJ0KSB7XG4gICAgICAgIGlmICghY2VydCB8fCBjZXJ0Lmxlbmd0aCA8IDEwMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNlcnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxpbmVzID0gY2VydC5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gRXh0cmFjdCBmaXJzdCBhbmQgbGFzdCBtZWFuaW5nZnVsIGxpbmVzXG4gICAgICAgIGNvbnN0IGZpcnN0TGluZSA9IGxpbmVzWzBdIHx8ICcnO1xuICAgICAgICBjb25zdCBsYXN0TGluZSA9IGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGNlcnRpZmljYXRlcywgc2hvdyBiZWdpbiBhbmQgZW5kIG1hcmtlcnNcbiAgICAgICAgaWYgKGZpcnN0TGluZS5pbmNsdWRlcygnQkVHSU4gQ0VSVElGSUNBVEUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2ZpcnN0TGluZX0uLi4ke2xhc3RMaW5lfWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBvdGhlciBmb3JtYXRzLCB0cnVuY2F0ZSB0aGUgY29udGVudFxuICAgICAgICBjb25zdCBjbGVhbkNlcnQgPSBjZXJ0LnJlcGxhY2UoL1xcbi9nLCAnICcpLnRyaW0oKTtcbiAgICAgICAgaWYgKGNsZWFuQ2VydC5sZW5ndGggPiA4MCkge1xuICAgICAgICAgICAgcmV0dXJuIGNsZWFuQ2VydC5zdWJzdHJpbmcoMCwgNDApICsgJy4uLicgKyBjbGVhbkNlcnQuc3Vic3RyaW5nKGNsZWFuQ2VydC5sZW5ndGggLSAzMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjbGVhbkNlcnQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCBmb3Igc2FmZSBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgZXNjYXBlSHRtbCh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IG1hcCA9IHtcbiAgICAgICAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICAgICAgICc8JzogJyZsdDsnLFxuICAgICAgICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAgICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgICAgICAgIFwiJ1wiOiAnJiMwMzk7J1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGV4dC5yZXBsYWNlKC9bJjw+XCInXS9nLCBtID0+IG1hcFttXSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50IGFjY29yZGluZyB0byB0aGUgdmFsdWUgb2YgdXNlIFNTSCBwYXNzd29yZCBjaGVja2JveC5cbiAgICAgKi9cbiAgICBzaG93SGlkZVNTSFBhc3N3b3JkKCl7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBQcmVwYXJlcyBkYXRhIGZvciBSRVNUIEFQSSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblxuICAgICAgICAvLyBIYW5kbGUgY2VydGlmaWNhdGUgZmllbGRzIC0gb25seSBzZW5kIGlmIHVzZXIgYWN0dWFsbHkgZW50ZXJlZCBuZXcgdmFsdWVzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5XRUJIVFRQU1ByaXZhdGVLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgcHJpdmF0ZUtleVZhbHVlID0gcmVzdWx0LmRhdGEuV0VCSFRUUFNQcml2YXRlS2V5O1xuICAgICAgICAgICAgLy8gSWYgdGhlIGZpZWxkIGlzIGVtcHR5IG9yIGNvbnRhaW5zIHRoZSBoaWRkZW4gcGFzc3dvcmQsIGRvbid0IHNlbmQgaXRcbiAgICAgICAgICAgIGlmIChwcml2YXRlS2V5VmFsdWUgPT09ICcnIHx8IHByaXZhdGVLZXlWYWx1ZSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhLldFQkhUVFBTUHJpdmF0ZUtleTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNhbWUgZm9yIHB1YmxpYyBrZXkgLSBkb24ndCBzZW5kIGVtcHR5IHZhbHVlc1xuICAgICAgICBpZiAocmVzdWx0LmRhdGEuV0VCSFRUUFNQdWJsaWNLZXkgIT09IHVuZGVmaW5lZCAmJiByZXN1bHQuZGF0YS5XRUJIVFRQU1B1YmxpY0tleSA9PT0gJycpIHtcbiAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS5XRUJIVFRQU1B1YmxpY0tleTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFuIHVwIHVubmVjZXNzYXJ5IGZpZWxkcyBiZWZvcmUgc2VuZGluZ1xuICAgICAgICBjb25zdCBmaWVsZHNUb1JlbW92ZSA9IFtcbiAgICAgICAgICAgICdkaXJydHknLFxuICAgICAgICAgICAgJ2RlbGV0ZUFsbElucHV0JyxcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBSZW1vdmUgY29kZWNfKiBmaWVsZHMgKHRoZXkncmUgcmVwbGFjZWQgd2l0aCB0aGUgY29kZWNzIGFycmF5KVxuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSB8fCBmaWVsZHNUb1JlbW92ZS5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2Ugc2hvdWxkIHByb2Nlc3MgY29kZWNzXG4gICAgICAgIC8vIFdoZW4gc2VuZE9ubHlDaGFuZ2VkIGlzIGVuYWJsZWQsIG9ubHkgcHJvY2VzcyBjb2RlY3MgaWYgdGhleSB3ZXJlIGFjdHVhbGx5IGNoYW5nZWRcbiAgICAgICAgY29uc3Qgc2hvdWxkUHJvY2Vzc0NvZGVjcyA9ICFGb3JtLnNlbmRPbmx5Q2hhbmdlZCB8fCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY29kZWNzQ2hhbmdlZDtcblxuICAgICAgICBpZiAoc2hvdWxkUHJvY2Vzc0NvZGVjcykge1xuICAgICAgICAgICAgLy8gQ29sbGVjdCBhbGwgY29kZWMgZGF0YSB3aGVuIHRoZXkndmUgYmVlbiBjaGFuZ2VkXG4gICAgICAgICAgICBjb25zdCBhcnJDb2RlY3MgPSBbXTtcblxuICAgICAgICAgICAgLy8gUHJvY2VzcyBhbGwgY29kZWMgcm93c1xuICAgICAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93LCAjdmlkZW8tY29kZWNzLXRhYmxlIC5jb2RlYy1yb3cnKS5lYWNoKChjdXJyZW50SW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvZGVjTmFtZSA9ICQob2JqKS5hdHRyKCdkYXRhLWNvZGVjLW5hbWUnKTtcbiAgICAgICAgICAgICAgICBpZiAoY29kZWNOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnREaXNhYmxlZCA9ICQob2JqKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgYXJyQ29kZWNzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY29kZWNOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGN1cnJlbnREaXNhYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBjdXJyZW50SW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBJbmNsdWRlIGNvZGVjcyBpZiB0aGV5IHdlcmUgY2hhbmdlZCBvciBzZW5kT25seUNoYW5nZWQgaXMgZmFsc2VcbiAgICAgICAgICAgIGlmIChhcnJDb2RlY3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvZGVjcyA9IGFyckNvZGVjcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogSGFuZGxlcyBSRVNUIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgJChcIiNlcnJvci1tZXNzYWdlc1wiKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZTogeyByZXN1bHQ6IGJvb2wsIGRhdGE6IHt9LCBtZXNzYWdlczoge30gfVxuICAgICAgICBpZiAoIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbChyZXNwb25zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgZmllbGRzIHRvIGhpZGRlbiB2YWx1ZSBvbiBzdWNjZXNzXG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBwYXNzd29yZCB2YWxpZGF0aW9uIHdhcm5pbmdzIGFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZVxuICAgICAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZGVsZXRlIGFsbCBjb25kaXRpb25zIGlmIG5lZWRlZFxuICAgICAgICBpZiAodHlwZW9mIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jaGVja0RlbGV0ZUNvbmRpdGlvbnMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBlcnJvciBtZXNzYWdlIEhUTUwgZnJvbSBSRVNUIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZSB3aXRoIGVycm9yIG1lc3NhZ2VzXG4gICAgICovXG4gICAgZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgY29uc3QgJGRpdiA9ICQoJzxkaXY+JywgeyBjbGFzczogJ3VpIG5lZ2F0aXZlIG1lc3NhZ2UnLCBpZDogJ2Vycm9yLW1lc3NhZ2VzJyB9KTtcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXIgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICdoZWFkZXInIH0pLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmdzX0Vycm9yU2F2ZVNldHRpbmdzKTtcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCRoZWFkZXIpO1xuICAgICAgICAgICAgY29uc3QgJHVsID0gJCgnPHVsPicsIHsgY2xhc3M6ICdsaXN0JyB9KTtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzU2V0ID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgYm90aCBlcnJvciBhbmQgdmFsaWRhdGlvbiBtZXNzYWdlIHR5cGVzXG4gICAgICAgICAgICBbJ2Vycm9yJywgJ3ZhbGlkYXRpb24nXS5mb3JFYWNoKG1zZ1R5cGUgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlcyA9IEFycmF5LmlzQXJyYXkocmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV0pIFxuICAgICAgICAgICAgICAgICAgICAgICAgPyByZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogW3Jlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzLmZvckVhY2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRleHRDb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGVycm9yID09PSAnb2JqZWN0JyAmJiBlcnJvci5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3IubWVzc2FnZV0gfHwgZXJyb3IubWVzc2FnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3JdIHx8IGVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1lc3NhZ2VzU2V0Lmhhcyh0ZXh0Q29udGVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlc1NldC5hZGQodGV4dENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR1bC5hcHBlbmQoJCgnPGxpPicpLnRleHQodGV4dENvbnRlbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCR1bCk7XG4gICAgICAgICAgICAkKCcjc3VibWl0YnV0dG9uJykuYmVmb3JlKCRkaXYpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHZhbGlkYXRpb24gcnVsZXMgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBpbml0UnVsZXMoKSB7XG4gICAgICAgIC8vIFNTSFBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M7XG4gICAgICAgIH0gZWxzZSBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZWJBZG1pblBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5XZWJBZG1pblBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LndlYkFkbWluUGFzc3dvcmRSdWxlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgY2VydGlmaWNhdGUgZGV0YWlscyBIVE1MXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNlcnRJbmZvIC0gQ2VydGlmaWNhdGUgaW5mb3JtYXRpb24gb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgY2VydGlmaWNhdGUgZGV0YWlsc1xuICAgICAqL1xuICAgIHJlbmRlckNlcnRpZmljYXRlRGV0YWlscyhjZXJ0SW5mbykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwiY2VydC1kZXRhaWxzXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7IG1hcmdpbi10b3A6MTBweDtcIj4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGxpc3RcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gU3ViamVjdFxuICAgICAgICBpZiAoY2VydEluZm8uc3ViamVjdCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPlN1YmplY3Q6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uc3ViamVjdCl9PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSXNzdWVyXG4gICAgICAgIGlmIChjZXJ0SW5mby5pc3N1ZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5Jc3N1ZXI6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uaXNzdWVyKX1gO1xuICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnIDxzcGFuIGNsYXNzPVwidWkgdGlueSBsYWJlbFwiPlNlbGYtc2lnbmVkPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGl0eSBwZXJpb2RcbiAgICAgICAgaWYgKGNlcnRJbmZvLnZhbGlkX2Zyb20gJiYgY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5WYWxpZDo8L3N0cm9uZz4gJHtjZXJ0SW5mby52YWxpZF9mcm9tfSB0byAke2NlcnRJbmZvLnZhbGlkX3RvfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV4cGlyeSBzdGF0dXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IHJlZCBsYWJlbFwiPkNlcnRpZmljYXRlIEV4cGlyZWQ8L3NwYW4+PC9kaXY+JztcbiAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgeWVsbG93IGxhYmVsXCI+RXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSBncmVlbiBsYWJlbFwiPlZhbGlkIGZvciAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN1YmplY3QgQWx0ZXJuYXRpdmUgTmFtZXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLnNhbiAmJiBjZXJ0SW5mby5zYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPkFsdGVybmF0aXZlIE5hbWVzOjwvc3Ryb25nPic7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBsaXN0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDoxMHB4O1wiPic7XG4gICAgICAgICAgICBjZXJ0SW5mby5zYW4uZm9yRWFjaChzYW4gPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChzYW4pfTwvZGl2PmA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIGxpc3RcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2Ugc2VnbWVudFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBjZXJ0LWRldGFpbHNcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBBTUkvQUpBTSBkZXBlbmRlbmN5XG4gICAgICogQUpBTSByZXF1aXJlcyBBTUkgdG8gYmUgZW5hYmxlZCBzaW5jZSBpdCdzIGFuIEhUVFAgd3JhcHBlciBvdmVyIEFNSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSgpIHtcbiAgICAgICAgY29uc3QgJGFtaUNoZWNrYm94ID0gJCgnI0FNSUVuYWJsZWQnKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBjb25zdCAkYWphbUNoZWNrYm94ID0gJCgnI0FKQU1FbmFibGVkJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYW1pQ2hlY2tib3gubGVuZ3RoID09PSAwIHx8ICRhamFtQ2hlY2tib3gubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZ1bmN0aW9uIHRvIHVwZGF0ZSBBSkFNIHN0YXRlIGJhc2VkIG9uIEFNSSBzdGF0ZVxuICAgICAgICBjb25zdCB1cGRhdGVBSkFNU3RhdGUgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc0FNSUVuYWJsZWQgPSAkYW1pQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFpc0FNSUVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBBTUkgaXMgZGlzYWJsZWQsIGRpc2FibGUgQUpBTSBhbmQgbWFrZSBpdCByZWFkLW9ubHlcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgdG9vbHRpcCB0byBleHBsYWluIHdoeSBpdCdzIGRpc2FibGVkXG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTVJlcXVpcmVzQU1JIHx8ICdBSkFNIHJlcXVpcmVzIEFNSSB0byBiZSBlbmFibGVkJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBsZWZ0Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIEFNSSBpcyBlbmFibGVkLCBhbGxvdyBBSkFNIHRvIGJlIHRvZ2dsZWRcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3gucmVtb3ZlQXR0cignZGF0YS10b29sdGlwJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsIHN0YXRlXG4gICAgICAgIHVwZGF0ZUFKQU1TdGF0ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuIGZvciBBTUkgY2hlY2tib3ggY2hhbmdlcyB1c2luZyBldmVudCBkZWxlZ2F0aW9uXG4gICAgICAgIC8vIFRoaXMgd29uJ3Qgb3ZlcnJpZGUgZXhpc3RpbmcgaGFuZGxlcnNcbiAgICAgICAgJCgnI0FNSUVuYWJsZWQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB1cGRhdGVBSkFNU3RhdGUoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBQQlhMYW5ndWFnZSBjaGFuZ2UgZGV0ZWN0aW9uIGZvciByZXN0YXJ0IHdhcm5pbmdcbiAgICAgKiBTaG93cyByZXN0YXJ0IHdhcm5pbmcgb25seSB3aGVuIHRoZSBsYW5ndWFnZSB2YWx1ZSBjaGFuZ2VzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBCWExhbmd1YWdlV2FybmluZygpIHtcbiAgICAgICAgY29uc3QgJGxhbmd1YWdlRHJvcGRvd24gPSAkKCcjUEJYTGFuZ3VhZ2UnKTtcbiAgICAgICAgY29uc3QgJHJlc3RhcnRXYXJuaW5nID0gJCgnI3Jlc3RhcnQtd2FybmluZy1QQlhMYW5ndWFnZScpO1xuXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHZhbHVlIGFuZCBkYXRhIGxvYWRlZCBmbGFnXG4gICAgICAgIGxldCBvcmlnaW5hbFZhbHVlID0gbnVsbDtcbiAgICAgICAgbGV0IGlzRGF0YUxvYWRlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIEhpZGUgd2FybmluZyBpbml0aWFsbHlcbiAgICAgICAgJHJlc3RhcnRXYXJuaW5nLmhpZGUoKTtcblxuICAgICAgICAvLyBTZXQgb3JpZ2luYWwgdmFsdWUgYWZ0ZXIgZGF0YSBsb2Fkc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignR2VuZXJhbFNldHRpbmdzLmRhdGFMb2FkZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBvcmlnaW5hbFZhbHVlID0gJGxhbmd1YWdlRHJvcGRvd24udmFsKCk7XG4gICAgICAgICAgICBpc0RhdGFMb2FkZWQgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZHJvcGRvd24gY2hhbmdlIGV2ZW50XG4gICAgICAgICRsYW5ndWFnZURyb3Bkb3duLmNsb3Nlc3QoJy5kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IHNob3cgd2FybmluZyBhZnRlciBkYXRhIGlzIGxvYWRlZCBhbmQgdmFsdWUgY2hhbmdlZCBmcm9tIG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgaWYgKGlzRGF0YUxvYWRlZCAmJiBvcmlnaW5hbFZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSBvcmlnaW5hbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICRyZXN0YXJ0V2FybmluZy50cmFuc2l0aW9uKCdmYWRlIGluJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0RhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJlc3RhcnRXYXJuaW5nLnRyYW5zaXRpb24oJ2ZhZGUgb3V0Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gb25seSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgIGlmIChpc0RhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIFJFU1QgQVBJIG1vZGVcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBHZW5lcmFsU2V0dGluZ3NBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlU2V0dGluZ3MnO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb24gZm9yIGNsZWFuZXIgQVBJIHJlcXVlc3RzXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIEVuYWJsZSBzZW5kaW5nIG9ubHkgY2hhbmdlZCBmaWVsZHMgZm9yIG9wdGltYWwgUEFUQ0ggc2VtYW50aWNzXG4gICAgICAgIEZvcm0uc2VuZE9ubHlDaGFuZ2VkID0gdHJ1ZTtcblxuICAgICAgICAvLyBObyByZWRpcmVjdCBhZnRlciBzYXZlIC0gc3RheSBvbiB0aGUgc2FtZSBwYWdlXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IG51bGw7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBudWxsO1xuICAgICAgICBGb3JtLnVybCA9IGAjYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZ2VuZXJhbFNldHRpbmdzIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=