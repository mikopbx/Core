"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

    $('#general-settings-form .checkbox').checkbox(); // Codec table drag-n-drop will be initialized after data is loaded
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
    } // Initialize PBXLanguage change detection for restart warning


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
    // Show loading state on the form
    generalSettingsModify.$formObj.addClass('loading');
    console.log('Loading general settings from API...');
    GeneralSettingsAPI.getSettings(function (response) {
      generalSettingsModify.$formObj.removeClass('loading');
      console.log('API Response:', response);

      if (response && response.result && response.data) {
        console.log('Populating form with:', response.data.settings); // Populate form with the received data

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
    // Initialize incoming announcement selector with data (following IVR pattern)
    SoundFileSelector.init('PBXRecordAnnouncementIn', {
      category: 'custom',
      includeEmpty: true,
      data: settings // ❌ NO onChange needed - complete automation by base class

    }); // Initialize outgoing announcement selector with data (following IVR pattern)  

    SoundFileSelector.init('PBXRecordAnnouncementOut', {
      category: 'custom',
      includeEmpty: true,
      data: settings // ❌ NO onChange needed - complete automation by base class

    });
  },

  /**
   * Build and update codec tables with data from API
   * @param {Array} codecs - Array of codec configurations
   */
  updateCodecTables: function updateCodecTables(codecs) {
    // Store original codec state for comparison
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
        // Mark form as changed when codec is enabled/disabled
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
        // Mark form as changed when codecs are reordered
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
    var result = settings; // Clean up unnecessary fields before sending

    var fieldsToRemove = ['dirrty', 'deleteAllInput']; // Remove codec_* fields (they're replaced with the codecs array)

    Object.keys(result.data).forEach(function (key) {
      if (key.startsWith('codec_') || fieldsToRemove.includes(key)) {
        delete result.data[key];
      }
    }); // Collect codec data - only include if changed

    var arrCodecs = [];
    var hasCodecChanges = false; // Process all codec rows

    $('#audio-codecs-table .codec-row, #video-codecs-table .codec-row').each(function (currentIndex, obj) {
      var codecName = $(obj).attr('data-codec-name');

      if (codecName && generalSettingsModify.originalCodecState[codecName]) {
        var original = generalSettingsModify.originalCodecState[codecName];
        var currentDisabled = $(obj).find('.checkbox').checkbox('is unchecked'); // Check if position or disabled state changed

        if (currentIndex !== original.priority || currentDisabled !== original.disabled) {
          hasCodecChanges = true;
        }

        arrCodecs.push({
          name: codecName,
          disabled: currentDisabled,
          priority: currentIndex
        });
      }
    }); // Only include codecs if there were changes

    if (hasCodecChanges) {
      result.data.codecs = arrCodecs;
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
   * Initialize PBXLanguage change detection for restart warning
   * Shows restart warning only when the language value changes
   */
  initializePBXLanguageWarning: function initializePBXLanguageWarning() {
    var $languageDropdown = $('#PBXLanguage');
    var $restartWarning = $('#restart-warning-PBXLanguage'); // Store original value

    var originalValue = null; // Set original value after data loads

    $(document).on('GeneralSettings.dataLoaded', function () {
      originalValue = $languageDropdown.val();
    }); // Handle dropdown change event

    $languageDropdown.closest('.dropdown').dropdown({
      onChange: function onChange(value) {
        // Show warning if value changed from original
        if (originalValue !== null && value !== originalValue) {
          $restartWarning.transition('fade in');
        } else {
          $restartWarning.transition('fade out');
        } // Trigger form change detection


        Form.dataChanged();
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

    Form.convertCheckboxesToBool = true; // No redirect after save - stay on the same page

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJkYXRhTG9hZGVkIiwidmFsaWRhdGVSdWxlcyIsInBieG5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUiLCJXZWJBZG1pblBhc3N3b3JkIiwiV2ViQWRtaW5QYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJTU0hQYXNzd29yZCIsIlNTSFBhc3N3b3JkUmVwZWF0IiwiZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCIsIldFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlIiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCIsIldFQkhUVFBTUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0IiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJBSkFNUG9ydCIsImdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlIiwiU0lQQXV0aFByZWZpeCIsImdzX1NJUEF1dGhQcmVmaXhJbnZhbGlkIiwid2ViQWRtaW5QYXNzd29yZFJ1bGVzIiwiZ3NfVmFsaWRhdGVFbXB0eVdlYlBhc3N3b3JkIiwiZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQiLCJ2YWx1ZSIsImdzX1Bhc3N3b3JkcyIsImdzX1Bhc3N3b3JkTm9Mb3dTaW12b2wiLCJnc19QYXNzd29yZE5vTnVtYmVycyIsImdzX1Bhc3N3b3JkTm9VcHBlclNpbXZvbCIsImFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcyIsImdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkIiwiZ3NfU1NIUGFzc3dvcmQiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcyIsImNsaXBib2FyZCIsImluaXRpYWxpemUiLCJsZW5ndGgiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJjb250ZXh0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJ2YWxpZGF0ZU9uSW5wdXQiLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJjaGVja09uTG9hZCIsInNzaFdpZGdldCIsIm9uIiwiaXNEaXNhYmxlZCIsImNoZWNrYm94IiwiaGlkZVdhcm5pbmdzIiwiZWxlbWVudHMiLCIkc2NvcmVTZWN0aW9uIiwiaGlkZSIsImNoZWNrUGFzc3dvcmQiLCJ2YWwiLCJpbml0UnVsZXMiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwibm90IiwiZHJvcGRvd24iLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMiLCJpbml0aWFsaXplQ2xpcGJvYXJkIiwic2hvd0hpZGVTU0hQYXNzd29yZCIsIndpbmRvdyIsImV2ZW50IiwibmFtZVRhYiIsIkdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyIiwiaW5pdGlhbGl6ZVBCWExhbmd1YWdlV2FybmluZyIsImxvYWREYXRhIiwiaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9ycyIsImFkZENsYXNzIiwiY29uc29sZSIsImxvZyIsIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsImRhdGEiLCJzZXR0aW5ncyIsInBvcHVsYXRlRm9ybSIsInBhc3N3b3JkVmFsaWRhdGlvbiIsInNldFRpbWVvdXQiLCJzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MiLCJtZXNzYWdlcyIsImVycm9yIiwic2hvd0FwaUVycm9yIiwiY29kZWNzIiwiRm9ybSIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwicG9wdWxhdGVTcGVjaWFsRmllbGRzIiwibG9hZFNvdW5kRmlsZVZhbHVlcyIsInVwZGF0ZUNvZGVjVGFibGVzIiwiaW5pdGlhbGl6ZVBhc3N3b3JkRmllbGRzIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5Iiwic3NoS2V5c1RhYmxlIiwiZG9jdW1lbnQiLCJ0cmlnZ2VyIiwiV0VCSFRUUFNQdWJsaWNLZXlfaW5mbyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwia2V5IiwiJGNoZWNrYm94IiwiaXNDaGVja2VkIiwiJGRyb3Bkb3duIiwiaGFzQ2xhc3MiLCJmb3JtIiwiZXJyb3JNZXNzYWdlIiwiQXJyYXkiLCJpc0FycmF5Iiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwidmFsaWRhdGlvbiIsInJlbW92ZSIsImlzRGVmYXVsdFdlYlBhc3N3b3JkIiwiJHdlYlBhc3N3b3JkRmllbGRzIiwiY2xvc2VzdCIsIndhcm5pbmdIdG1sIiwiZ3NfU2V0UGFzc3dvcmQiLCJnc19TZXRQYXNzd29yZEluZm8iLCJiZWZvcmUiLCJpc0RlZmF1bHRTU0hQYXNzd29yZCIsInNzaFBhc3N3b3JkRGlzYWJsZWQiLCIkc3NoUGFzc3dvcmRGaWVsZHMiLCJTb3VuZEZpbGVTZWxlY3RvciIsImNhdGVnb3J5IiwiaW5jbHVkZUVtcHR5IiwiYXVkaW9Db2RlY3MiLCJmaWx0ZXIiLCJjIiwic29ydCIsImEiLCJiIiwicHJpb3JpdHkiLCJ2aWRlb0NvZGVjcyIsImJ1aWxkQ29kZWNUYWJsZSIsInNob3ciLCJpbml0aWFsaXplQ29kZWNEcmFnRHJvcCIsIiR0YWJsZUJvZHkiLCJlbXB0eSIsImNvZGVjIiwiaW5kZXgiLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGVja2VkIiwicm93SHRtbCIsImVzY2FwZUh0bWwiLCJkZXNjcmlwdGlvbiIsImFwcGVuZCIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkIiwiJGNlcnRQdWJLZXlGaWVsZCIsImZ1bGxWYWx1ZSIsIiRjb250YWluZXIiLCJjZXJ0SW5mbyIsImRpc3BsYXlUZXh0IiwicGFydHMiLCJzdWJqZWN0IiwicHVzaCIsImlzc3VlciIsImlzX3NlbGZfc2lnbmVkIiwidmFsaWRfdG8iLCJpc19leHBpcmVkIiwiZGF5c191bnRpbF9leHBpcnkiLCJ0cnVuY2F0ZUNlcnRpZmljYXRlIiwic3RhdHVzQ2xhc3MiLCJkaXNwbGF5SHRtbCIsImJ0X1Rvb2xUaXBDb3B5Q2VydCIsImJ0X1Rvb2xUaXBDZXJ0SW5mbyIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsInJlbmRlckNlcnRpZmljYXRlRGV0YWlscyIsImdzX1Bhc3RlUHVibGljQ2VydCIsImJ0X1NhdmUiLCJidF9DYW5jZWwiLCJlIiwicHJldmVudERlZmF1bHQiLCIkZGV0YWlscyIsInNsaWRlVG9nZ2xlIiwiZm9jdXMiLCJuZXdWYWx1ZSIsImNoZWNrVmFsdWVzIiwicG9wdXAiLCJkZXN0cm95IiwiYXR0ciIsIm9mZiIsIiRzc2hQdWJLZXlGaWVsZCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiYnRfVG9vbFRpcENvcHlLZXkiLCJidF9Ub29sVGlwRXhwYW5kIiwiJGZ1bGxEaXNwbGF5IiwiJHRydW5jYXRlZERpc3BsYXkiLCIkaWNvbiIsImlzIiwiZ3NfTm9TU0hQdWJsaWNLZXkiLCIkY2VydFByaXZLZXlGaWVsZCIsImN1cnJlbnRWYWx1ZSIsImhhc1ZhbHVlIiwiZ3NfUHJpdmF0ZUtleUlzU2V0IiwiZ3NfUmVwbGFjZSIsImdzX1Bhc3RlUHJpdmF0ZUtleSIsIiRuZXdGaWVsZCIsIkNsaXBib2FyZEpTIiwiJGJ0biIsIm9yaWdpbmFsSWNvbiIsImNsZWFyU2VsZWN0aW9uIiwiZ3NfQ29weUZhaWxlZCIsInNwbGl0Iiwia2V5VHlwZSIsImtleURhdGEiLCJjb21tZW50Iiwic2xpY2UiLCJzdWJzdHJpbmciLCJ0cmltIiwiY2VydCIsImxpbmVzIiwibGluZSIsImZpcnN0TGluZSIsImxhc3RMaW5lIiwiaW5jbHVkZXMiLCJjbGVhbkNlcnQiLCJyZXBsYWNlIiwidGV4dCIsIm1hcCIsIm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwiZmllbGRzVG9SZW1vdmUiLCJzdGFydHNXaXRoIiwiYXJyQ29kZWNzIiwiaGFzQ29kZWNDaGFuZ2VzIiwiZWFjaCIsImN1cnJlbnRJbmRleCIsIm9iaiIsImNvZGVjTmFtZSIsIm9yaWdpbmFsIiwiY3VycmVudERpc2FibGVkIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsImdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbCIsImZhZGVPdXQiLCJnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwiLCJjaGVja0RlbGV0ZUNvbmRpdGlvbnMiLCIkZGl2IiwiaWQiLCIkaGVhZGVyIiwiZ3NfRXJyb3JTYXZlU2V0dGluZ3MiLCIkdWwiLCJtZXNzYWdlc1NldCIsIlNldCIsIm1zZ1R5cGUiLCJ0ZXh0Q29udGVudCIsIm1lc3NhZ2UiLCJoYXMiLCJhZGQiLCJodG1sIiwidmFsaWRfZnJvbSIsInNhbiIsIiRsYW5ndWFnZURyb3Bkb3duIiwiJHJlc3RhcnRXYXJuaW5nIiwib3JpZ2luYWxWYWx1ZSIsInRyYW5zaXRpb24iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ1cmwiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBR0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEscUJBQXFCLEdBQUc7QUFDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsd0JBQUQsQ0FMZTs7QUFPMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUVELENBQUMsQ0FBQyxtQkFBRCxDQVhNOztBQWExQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxZQUFZLEVBQUVGLENBQUMsQ0FBQyxjQUFELENBakJXOztBQW1CMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsbUJBQW1CLEVBQUVILENBQUMsQ0FBQywyQkFBRCxDQUFELENBQStCSSxNQUEvQixDQUFzQyxXQUF0QyxDQXZCSzs7QUF5QjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG1CQUFtQixFQUFFTCxDQUFDLENBQUMsMkJBQUQsQ0E3Qkk7O0FBK0IxQjtBQUNKO0FBQ0E7QUFDSU0sRUFBQUEsY0FBYyxFQUFFLFNBbENVOztBQW9DMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFO0FBQ2JDLElBQUFBLGNBQWMsRUFBRSx5QkFESDtBQUViQyxJQUFBQSxlQUFlLEVBQUU7QUFGSixHQXhDUzs7QUE2QzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFLEVBakRN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Y0FyMUMwQiw0QkFxMUNUO0FBQ2I2QixJQUFBQSxJQUFJLENBQUNoSCxRQUFMLEdBQWdCRCxxQkFBcUIsQ0FBQ0MsUUFBdEMsQ0FEYSxDQUdiOztBQUNBZ0gsSUFBQUEsSUFBSSxDQUFDd0wsV0FBTCxDQUFpQkMsT0FBakIsR0FBMkIsSUFBM0I7QUFDQXpMLElBQUFBLElBQUksQ0FBQ3dMLFdBQUwsQ0FBaUJFLFNBQWpCLEdBQTZCek0sa0JBQTdCO0FBQ0FlLElBQUFBLElBQUksQ0FBQ3dMLFdBQUwsQ0FBaUJHLFVBQWpCLEdBQThCLGNBQTlCLENBTmEsQ0FRYjs7QUFDQTNMLElBQUFBLElBQUksQ0FBQzRMLHVCQUFMLEdBQStCLElBQS9CLENBVGEsQ0FXYjs7QUFDQTVMLElBQUFBLElBQUksQ0FBQzZMLG1CQUFMLEdBQTJCLElBQTNCO0FBQ0E3TCxJQUFBQSxJQUFJLENBQUM4TCxvQkFBTCxHQUE0QixJQUE1QjtBQUNBOUwsSUFBQUEsSUFBSSxDQUFDK0wsR0FBTDtBQUVBL0wsSUFBQUEsSUFBSSxDQUFDbkcsYUFBTCxHQUFxQmQscUJBQXFCLENBQUNjLGFBQTNDO0FBQ0FtRyxJQUFBQSxJQUFJLENBQUNvSixnQkFBTCxHQUF3QnJRLHFCQUFxQixDQUFDcVEsZ0JBQTlDO0FBQ0FwSixJQUFBQSxJQUFJLENBQUMrSixlQUFMLEdBQXVCaFIscUJBQXFCLENBQUNnUixlQUE3QztBQUNBL0osSUFBQUEsSUFBSSxDQUFDMUQsVUFBTDtBQUNIO0FBejJDeUIsQ0FBOUIsQyxDQTQyQ0E7O0FBQ0FyRCxDQUFDLENBQUMwSCxRQUFELENBQUQsQ0FBWXFMLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmpULEVBQUFBLHFCQUFxQixDQUFDdUQsVUFBdEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBhc3N3b3JkU2NvcmUsIFBieEFwaSwgVXNlck1lc3NhZ2UsIFNvdW5kRmlsZVNlbGVjdG9yLCBHZW5lcmFsU2V0dGluZ3NBUEksIENsaXBib2FyZEpTLCBQYXNzd29yZFdpZGdldCwgUGFzc3dvcmRWYWxpZGF0aW9uQVBJLCBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciwgJCAqL1xuXG4vKipcbiAqIEEgbW9kdWxlIHRvIGhhbmRsZSBtb2RpZmljYXRpb24gb2YgZ2VuZXJhbCBzZXR0aW5ncy5cbiAqL1xuY29uc3QgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkd2ViQWRtaW5QYXNzd29yZDogJCgnI1dlYkFkbWluUGFzc3dvcmQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmQ6ICQoJyNTU0hQYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlzYWJsZVNTSFBhc3N3b3JkOiAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykucGFyZW50KCcuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmRTZWdtZW50OiAkKCcjb25seS1pZi1wYXNzd29yZC1lbmFibGVkJyksXG5cbiAgICAvKipcbiAgICAgKiBJZiBwYXNzd29yZCBzZXQsIGl0IHdpbGwgYmUgaGlkZWQgZnJvbSB3ZWIgdWkuXG4gICAgICovXG4gICAgaGlkZGVuUGFzc3dvcmQ6ICd4eHh4eHh4JyxcblxuICAgIC8qKlxuICAgICAqIFNvdW5kIGZpbGUgZmllbGQgSURzXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBzb3VuZEZpbGVGaWVsZHM6IHtcbiAgICAgICAgYW5ub3VuY2VtZW50SW46ICdQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbicsXG4gICAgICAgIGFubm91bmNlbWVudE91dDogJ1BCWFJlY29yZEFubm91bmNlbWVudE91dCdcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIE9yaWdpbmFsIGNvZGVjIHN0YXRlIGZyb20gbGFzdCBsb2FkXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBvcmlnaW5hbENvZGVjU3RhdGU6IHt9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgZGF0YSBoYXMgYmVlbiBsb2FkZWQgZnJvbSBBUElcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBkYXRhTG9hZGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczogeyAvLyBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlc1xuICAgICAgICBwYnhuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnUEJYTmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgV2ViQWRtaW5QYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXRjaFtXZWJBZG1pblBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFNTSFBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU1NIUGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbU1NIUGFzc3dvcmRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQlBvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCSFRUUFNQb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCSFRUUFNQb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV0VCSFRUUFNQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBBSkFNUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ0FKQU1Qb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgU0lQQXV0aFByZWZpeDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NJUEF1dGhQcmVmaXgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bYS16QS1aXSokL10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4SW52YWxpZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgd2ViIGFkbWluIHBhc3N3b3JkIGZpZWxkIHdoZW4gaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgd2ViQWRtaW5QYXNzd29yZFJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5V2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1xcZC8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcbiAgICAvLyBSdWxlcyBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZCB3aGVuIFNTSCBsb2dpbiB0aHJvdWdoIHRoZSBwYXNzd29yZCBlbmFibGVkLCBhbmQgaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTnVtYmVyc1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW0EtWl0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGRpc2FibGVkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfVxuICAgIF0sXG5cbiAgICAvKipcbiAgICAgKiBDbGlwYm9hcmQgaW5zdGFuY2UgZm9yIGNvcHkgZnVuY3Rpb25hbGl0eVxuICAgICAqIEB0eXBlIHtDbGlwYm9hcmRKU31cbiAgICAgKi9cbiAgICBjbGlwYm9hcmQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogIEluaXRpYWxpemUgbW9kdWxlIHdpdGggZXZlbnQgYmluZGluZ3MgYW5kIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldHNcbiAgICAgICAgLy8gV2ViIEFkbWluIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC5pbml0KGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZCwge1xuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdnZW5lcmFsX3dlYicsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogZmFsc2UsICAgICAvLyBObyBzaG93L2hpZGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU1NIIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc3NoV2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLCB7XG4gICAgICAgICAgICAgICAgY29udGV4dDogJ2dlbmVyYWxfc3NoJyxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSwgICAgIC8vIE5vIHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgU1NIIGRpc2FibGUgY2hlY2tib3hcbiAgICAgICAgICAgICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuaGlkZVdhcm5pbmdzKHNzaFdpZGdldCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzc2hXaWRnZXQuZWxlbWVudHMuJHNjb3JlU2VjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3NoV2lkZ2V0LmVsZW1lbnRzLiRzY29yZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuY2hlY2tQYXNzd29yZChzc2hXaWRnZXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyB3aGVuIHBhc3N3b3JkcyBjaGFuZ2VcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEVuYWJsZSBkcm9wZG93bnMgb24gdGhlIGZvcm0gKGV4Y2VwdCBzb3VuZCBmaWxlIHNlbGVjdG9ycylcbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybSAuZHJvcGRvd24nKS5ub3QoJy5hdWRpby1tZXNzYWdlLXNlbGVjdCcpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGNoZWNrYm94ZXMgb24gdGhlIGZvcm1cbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybSAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIENvZGVjIHRhYmxlIGRyYWctbi1kcm9wIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gU2VlIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkgd2hpY2ggaXMgY2FsbGVkIGZyb20gdXBkYXRlQ29kZWNUYWJsZXMoKVxuXG4gICAgICAgIC8vIFNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgUkVTVCBBUEkgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gU2VlIGxvYWRTb3VuZEZpbGVWYWx1ZXMoKSBtZXRob2QgY2FsbGVkIGZyb20gcG9wdWxhdGVGb3JtKClcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogU1NIIGtleXMgdGFibGUgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGxvYWRzXG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgZGlzcGxheVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIGNvcHkgYnV0dG9uc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWRkaXRpb25hbCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcblxuICAgICAgICAvLyBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KHtcbiAgICAgICAgICAgICdvbkNoYW5nZSc6IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkXG4gICAgICAgIH0pO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0hpZGVTU0hQYXNzd29yZCgpO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBoYW5kbGUgdGFiIGFjdGl2YXRpb25cbiAgICAgICAgJCh3aW5kb3cpLm9uKCdHUy1BY3RpdmF0ZVRhYicsIChldmVudCwgbmFtZVRhYikgPT4ge1xuICAgICAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKCdjaGFuZ2UgdGFiJywgbmFtZVRhYik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaWYgKHR5cGVvZiBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBQQlhMYW5ndWFnZSBjaGFuZ2UgZGV0ZWN0aW9uIGZvciByZXN0YXJ0IHdhcm5pbmdcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmcoKTtcblxuICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSBBUEkgaW5zdGVhZCBvZiB1c2luZyBzZXJ2ZXItcmVuZGVyZWQgdmFsdWVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggcGxheWJhY2sgZnVuY3Rpb25hbGl0eSB1c2luZyBTb3VuZEZpbGVTZWxlY3RvclxuICAgICAqIEhUTUwgc3RydWN0dXJlIGlzIHByb3ZpZGVkIGJ5IHRoZSBwbGF5QWRkTmV3U291bmRXaXRoSWNvbnMgcGFydGlhbCBpbiByZWNvcmRpbmcudm9sdDpcbiAgICAgKiAtIEhpZGRlbiBpbnB1dDogPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCIgbmFtZT1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCI+XG4gICAgICogLSBEcm9wZG93biBkaXY6IDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gc2VhcmNoIFBCWFJlY29yZEFubm91bmNlbWVudEluLWRyb3Bkb3duXCI+XG4gICAgICogLSBQbGF5YmFjayBidXR0b24gYW5kIGFkZCBuZXcgYnV0dG9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9ycygpIHtcbiAgICAgICAgLy8gU291bmQgZmlsZSBzZWxlY3RvcnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9yV2l0aERhdGEoKSBjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKVxuICAgICAgICBcbiAgICAgICAgLy8gVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgY29uc2lzdGVuY3kgYnV0IGFjdHVhbCBpbml0aWFsaXphdGlvbiBoYXBwZW5zXG4gICAgICAgIC8vIHdoZW4gd2UgaGF2ZSBkYXRhIGZyb20gdGhlIHNlcnZlciBpbiBsb2FkU291bmRGaWxlVmFsdWVzKClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBnZW5lcmFsIHNldHRpbmdzIGRhdGEgZnJvbSBBUElcbiAgICAgKiBVc2VkIGJvdGggb24gaW5pdGlhbCBwYWdlIGxvYWQgYW5kIGZvciBtYW51YWwgcmVmcmVzaFxuICAgICAqIENhbiBiZSBjYWxsZWQgYW55dGltZSB0byByZWxvYWQgdGhlIGZvcm0gZGF0YTogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWREYXRhKClcbiAgICAgKi9cbiAgICBsb2FkRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHRoZSBmb3JtXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBjb25zb2xlLmxvZygnTG9hZGluZyBnZW5lcmFsIHNldHRpbmdzIGZyb20gQVBJLi4uJyk7XG4gICAgICAgIFxuICAgICAgICBHZW5lcmFsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBUEkgUmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUG9wdWxhdGluZyBmb3JtIHdpdGg6JywgcmVzcG9uc2UuZGF0YS5zZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIHRoZSByZWNlaXZlZCBkYXRhXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZGF0YUxvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3YXJuaW5ncyBmb3IgZGVmYXVsdCBwYXNzd29yZHMgYWZ0ZXIgRE9NIHVwZGF0ZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLnBhc3N3b3JkVmFsaWRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIHVwZGF0ZWQgYWZ0ZXIgcG9wdWxhdGVGb3JtXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dEZWZhdWx0UGFzc3dvcmRXYXJuaW5ncyhyZXNwb25zZS5kYXRhLnBhc3N3b3JkVmFsaWRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBFcnJvcjonLCByZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93QXBpRXJyb3IocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBzZXR0aW5ncyBhbmQgYWRkaXRpb25hbCBkYXRhXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gZGF0YS5zZXR0aW5ncyB8fCBkYXRhO1xuICAgICAgICBjb25zdCBjb2RlY3MgPSBkYXRhLmNvZGVjcyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoc2V0dGluZ3MsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzcGVjaWFsIGZpZWxkIHR5cGVzXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnBvcHVsYXRlU3BlY2lhbEZpZWxkcyhmb3JtRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBzb3VuZCBmaWxlIHZhbHVlcyB3aXRoIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkU291bmRGaWxlVmFsdWVzKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY29kZWMgdGFibGVzXG4gICAgICAgICAgICAgICAgaWYgKGNvZGVjcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS51cGRhdGVDb2RlY1RhYmxlcyhjb2RlY3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIGZpZWxkcyAoaGlkZSBhY3R1YWwgcGFzc3dvcmRzKVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUGFzc3dvcmRGaWVsZHMoZm9ybURhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBTU0ggcGFzc3dvcmQgdmlzaWJpbGl0eVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGlmIGVuYWJsZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFNTSCBrZXlzIHRhYmxlIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIGlmICh0eXBlb2Ygc3NoS2V5c1RhYmxlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgc3NoS2V5c1RhYmxlLmluaXRpYWxpemUoJ3NzaC1rZXlzLWNvbnRhaW5lcicsICdTU0hBdXRob3JpemVkS2V5cycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgd2l0aCBuZXcgZGF0YVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJpZ2dlciBldmVudCB0byBub3RpZnkgdGhhdCBkYXRhIGhhcyBiZWVuIGxvYWRlZFxuICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdHZW5lcmFsU2V0dGluZ3MuZGF0YUxvYWRlZCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHNwZWNpYWwgZmllbGQgdHlwZXMgdGhhdCBuZWVkIGN1c3RvbSBwb3B1bGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlU3BlY2lhbEZpZWxkcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBQcml2YXRlIGtleSBleGlzdGVuY2UgaXMgbm93IGRldGVybWluZWQgYnkgY2hlY2tpbmcgaWYgdmFsdWUgZXF1YWxzIEhJRERFTl9QQVNTV09SRFxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNlcnRpZmljYXRlIGluZm9cbiAgICAgICAgaWYgKHNldHRpbmdzLldFQkhUVFBTUHVibGljS2V5X2luZm8pIHtcbiAgICAgICAgICAgICQoJyNXRUJIVFRQU1B1YmxpY0tleScpLmRhdGEoJ2NlcnQtaW5mbycsIHNldHRpbmdzLldFQkhUVFBTUHVibGljS2V5X2luZm8pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2hlY2tib3hlcyAoQVBJIHJldHVybnMgYm9vbGVhbiB2YWx1ZXMpXG4gICAgICAgIE9iamVjdC5rZXlzKHNldHRpbmdzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKGAjJHtrZXl9YCkucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgIGlmICgkY2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IHNldHRpbmdzW2tleV0gPT09IHRydWUgfHwgc2V0dGluZ3Nba2V5XSA9PT0gJzEnIHx8IHNldHRpbmdzW2tleV0gPT09IDE7XG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmNoZWNrYm94KGlzQ2hlY2tlZCA/ICdjaGVjaycgOiAndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgcmVndWxhciBkcm9wZG93bnMgKGV4Y2x1ZGluZyBzb3VuZCBmaWxlIHNlbGVjdG9ycyB3aGljaCBhcmUgaGFuZGxlZCBzZXBhcmF0ZWx5KVxuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7a2V5fWApLnBhcmVudCgnLmRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA+IDAgJiYgISRkcm9wZG93bi5oYXNDbGFzcygnYXVkaW8tbWVzc2FnZS1zZWxlY3QnKSkge1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2V0dGluZ3Nba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCBmaWVsZHMgd2l0aCBoaWRkZW4gcGFzc3dvcmQgaW5kaWNhdG9yXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYXNzd29yZEZpZWxkcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBIaWRlIGFjdHVhbCBwYXNzd29yZHMgYW5kIHNob3cgaGlkZGVuIGluZGljYXRvclxuICAgICAgICBpZiAoc2V0dGluZ3MuV2ViQWRtaW5QYXNzd29yZCAmJiBzZXR0aW5ncy5XZWJBZG1pblBhc3N3b3JkICE9PSAnJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChzZXR0aW5ncy5TU0hQYXNzd29yZCAmJiBzZXR0aW5ncy5TU0hQYXNzd29yZCAhPT0gJycpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgQVBJIGVycm9yIG1lc3NhZ2VzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG1lc3NhZ2VzIC0gRXJyb3IgbWVzc2FnZXMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBzaG93QXBpRXJyb3IobWVzc2FnZXMpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBBcnJheS5pc0FycmF5KG1lc3NhZ2VzLmVycm9yKSBcbiAgICAgICAgICAgICAgICA/IG1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgXG4gICAgICAgICAgICAgICAgOiBtZXNzYWdlcy5lcnJvcjtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHdhcm5pbmdzIGZvciBkZWZhdWx0IHBhc3N3b3Jkc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB2YWxpZGF0aW9uIC0gUGFzc3dvcmQgdmFsaWRhdGlvbiByZXN1bHRzIGZyb20gQVBJXG4gICAgICovXG4gICAgc2hvd0RlZmF1bHRQYXNzd29yZFdhcm5pbmdzKHZhbGlkYXRpb24pIHtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBwYXNzd29yZC12YWxpZGF0ZSBtZXNzYWdlcyBmaXJzdFxuICAgICAgICAkKCcucGFzc3dvcmQtdmFsaWRhdGUnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgd2FybmluZyBmb3IgZGVmYXVsdCBXZWIgQWRtaW4gcGFzc3dvcmRcbiAgICAgICAgaWYgKHZhbGlkYXRpb24uaXNEZWZhdWx0V2ViUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIHBhc3N3b3JkIGZpZWxkcyBncm91cCAtIHRyeSBtdWx0aXBsZSBzZWxlY3RvcnNcbiAgICAgICAgICAgIGxldCAkd2ViUGFzc3dvcmRGaWVsZHMgPSAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLmNsb3Nlc3QoJy50d28uZmllbGRzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkd2ViUGFzc3dvcmRGaWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IGFsdGVybmF0aXZlIHNlbGVjdG9yIGlmIHRoZSBmaXJzdCBvbmUgZG9lc24ndCB3b3JrXG4gICAgICAgICAgICAgICAgJHdlYlBhc3N3b3JkRmllbGRzID0gJCgnI1dlYkFkbWluUGFzc3dvcmQnKS5wYXJlbnQoKS5wYXJlbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCR3ZWJQYXNzd29yZEZpZWxkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgaWNvbiBtZXNzYWdlIHBhc3N3b3JkLXZhbGlkYXRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19TZXRQYXNzd29yZCB8fCAnU2VjdXJpdHkgV2FybmluZyd9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfU2V0UGFzc3dvcmRJbmZvIHx8ICdZb3UgYXJlIHVzaW5nIHRoZSBkZWZhdWx0IHBhc3N3b3JkLiBQbGVhc2UgY2hhbmdlIGl0IGZvciBzZWN1cml0eS4nfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluc2VydCB3YXJuaW5nIGJlZm9yZSB0aGUgcGFzc3dvcmQgZmllbGRzXG4gICAgICAgICAgICAgICAgJHdlYlBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgd2FybmluZyBmb3IgZGVmYXVsdCBTU0ggcGFzc3dvcmRcbiAgICAgICAgaWYgKHZhbGlkYXRpb24uaXNEZWZhdWx0U1NIUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIFNTSCBwYXNzd29yZCBsb2dpbiBpcyBlbmFibGVkXG4gICAgICAgICAgICBjb25zdCBzc2hQYXNzd29yZERpc2FibGVkID0gJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghc3NoUGFzc3dvcmREaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHMgZ3JvdXBcbiAgICAgICAgICAgICAgICBsZXQgJHNzaFBhc3N3b3JkRmllbGRzID0gJCgnI1NTSFBhc3N3b3JkJykuY2xvc2VzdCgnLnR3by5maWVsZHMnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJHNzaFBhc3N3b3JkRmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgYWx0ZXJuYXRpdmUgc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzID0gJCgnI1NTSFBhc3N3b3JkJykucGFyZW50KCkucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkc3NoUGFzc3dvcmRGaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgd2FybmluZyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIGljb24gbWVzc2FnZSBwYXNzd29yZC12YWxpZGF0ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfU2V0UGFzc3dvcmQgfHwgJ1NlY3VyaXR5IFdhcm5pbmcnfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5nc19TZXRQYXNzd29yZEluZm8gfHwgJ1lvdSBhcmUgdXNpbmcgdGhlIGRlZmF1bHQgcGFzc3dvcmQuIFBsZWFzZSBjaGFuZ2UgaXQgZm9yIHNlY3VyaXR5Lid9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgd2FybmluZyBiZWZvcmUgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFuZCBsb2FkIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggZGF0YSwgc2ltaWxhciB0byBJVlIgaW1wbGVtZW50YXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNvdW5kRmlsZVZhbHVlcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBJbml0aWFsaXplIGluY29taW5nIGFubm91bmNlbWVudCBzZWxlY3RvciB3aXRoIGRhdGEgKGZvbGxvd2luZyBJVlIgcGF0dGVybilcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4nLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBzZXR0aW5nc1xuICAgICAgICAgICAgLy8g4p2MIE5PIG9uQ2hhbmdlIG5lZWRlZCAtIGNvbXBsZXRlIGF1dG9tYXRpb24gYnkgYmFzZSBjbGFzc1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3V0Z29pbmcgYW5ub3VuY2VtZW50IHNlbGVjdG9yIHdpdGggZGF0YSAoZm9sbG93aW5nIElWUiBwYXR0ZXJuKSAgXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ1BCWFJlY29yZEFubm91bmNlbWVudE91dCcsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHNldHRpbmdzXG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhbmQgdXBkYXRlIGNvZGVjIHRhYmxlcyB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb2RlY3MgLSBBcnJheSBvZiBjb2RlYyBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcykge1xuICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBjb2RlYyBzdGF0ZSBmb3IgY29tcGFyaXNvblxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkub3JpZ2luYWxDb2RlY1N0YXRlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBTZXBhcmF0ZSBhdWRpbyBhbmQgdmlkZW8gY29kZWNzXG4gICAgICAgIGNvbnN0IGF1ZGlvQ29kZWNzID0gY29kZWNzLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ2F1ZGlvJykuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICBjb25zdCB2aWRlb0NvZGVjcyA9IGNvZGVjcy5maWx0ZXIoYyA9PiBjLnR5cGUgPT09ICd2aWRlbycpLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIGF1ZGlvIGNvZGVjcyB0YWJsZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYnVpbGRDb2RlY1RhYmxlKGF1ZGlvQ29kZWNzLCAnYXVkaW8nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHZpZGVvIGNvZGVjcyB0YWJsZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYnVpbGRDb2RlY1RhYmxlKHZpZGVvQ29kZWNzLCAndmlkZW8nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhpZGUgbG9hZGVycyBhbmQgc2hvdyB0YWJsZXNcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy1sb2FkZXIsICN2aWRlby1jb2RlY3MtbG9hZGVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlLCAjdmlkZW8tY29kZWNzLXRhYmxlJykuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkcmFnIGFuZCBkcm9wIGZvciByZW9yZGVyaW5nXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ29kZWNEcmFnRHJvcCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgY29kZWMgdGFibGUgcm93cyBmcm9tIGRhdGFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb2RlY3MgLSBBcnJheSBvZiBjb2RlYyBvYmplY3RzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSAnYXVkaW8nIG9yICd2aWRlbydcbiAgICAgKi9cbiAgICBidWlsZENvZGVjVGFibGUoY29kZWNzLCB0eXBlKSB7XG4gICAgICAgIGNvbnN0ICR0YWJsZUJvZHkgPSAkKGAjJHt0eXBlfS1jb2RlY3MtdGFibGUgdGJvZHlgKTtcbiAgICAgICAgJHRhYmxlQm9keS5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgY29kZWNzLmZvckVhY2goKGNvZGVjLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgc3RhdGUgZm9yIGNoYW5nZSBkZXRlY3Rpb25cbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGVbY29kZWMubmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4LFxuICAgICAgICAgICAgICAgIGRpc2FibGVkOiBjb2RlYy5kaXNhYmxlZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRhYmxlIHJvd1xuICAgICAgICAgICAgY29uc3QgaXNEaXNhYmxlZCA9IGNvZGVjLmRpc2FibGVkID09PSB0cnVlIHx8IGNvZGVjLmRpc2FibGVkID09PSAnMScgfHwgY29kZWMuZGlzYWJsZWQgPT09IDE7XG4gICAgICAgICAgICBjb25zdCBjaGVja2VkID0gIWlzRGlzYWJsZWQgPyAnY2hlY2tlZCcgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgcm93SHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8dHIgY2xhc3M9XCJjb2RlYy1yb3dcIiBpZD1cImNvZGVjLSR7Y29kZWMubmFtZX1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7aW5kZXh9XCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29kZWMtbmFtZT1cIiR7Y29kZWMubmFtZX1cIlxuICAgICAgICAgICAgICAgICAgICBkYXRhLW9yaWdpbmFsLXByaW9yaXR5PVwiJHtpbmRleH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY29sbGFwc2luZyBkcmFnSGFuZGxlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNvcnQgZ3JleSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGNvZGVjc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cImNvZGVjXyR7Y29kZWMubmFtZX1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtjaGVja2VkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJpbmRleD1cIjBcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJoaWRkZW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPVwiY29kZWNfJHtjb2RlYy5uYW1lfVwiPiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY29kZWMuZGVzY3JpcHRpb24gfHwgY29kZWMubmFtZSl9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkdGFibGVCb2R5LmFwcGVuZChyb3dIdG1sKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94ZXMgZm9yIHRoZSBuZXcgcm93c1xuICAgICAgICAkdGFibGVCb2R5LmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB3aGVuIGNvZGVjIGlzIGVuYWJsZWQvZGlzYWJsZWRcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcmFnIGFuZCBkcm9wIGZvciBjb2RlYyB0YWJsZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ29kZWNEcmFnRHJvcCgpIHtcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSwgI3ZpZGVvLWNvZGVjcy10YWJsZScpLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJyxcbiAgICAgICAgICAgIG9uRHJvcDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgd2hlbiBjb2RlY3MgYXJlIHJlb3JkZXJlZFxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2VydGlmaWNhdGUgZmllbGQgZGlzcGxheSBvbmx5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBXRUJIVFRQU1B1YmxpY0tleSBmaWVsZCBvbmx5XG4gICAgICAgIGNvbnN0ICRjZXJ0UHViS2V5RmllbGQgPSAkKCcjV0VCSFRUUFNQdWJsaWNLZXknKTtcbiAgICAgICAgaWYgKCRjZXJ0UHViS2V5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsVmFsdWUgPSAkY2VydFB1YktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRjZXJ0UHViS2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBjZXJ0aWZpY2F0ZSBpbmZvIGlmIGF2YWlsYWJsZSBmcm9tIGRhdGEgYXR0cmlidXRlXG4gICAgICAgICAgICBjb25zdCBjZXJ0SW5mbyA9ICRjZXJ0UHViS2V5RmllbGQuZGF0YSgnY2VydC1pbmZvJykgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50cyBmb3IgdGhpcyBmaWVsZCBvbmx5XG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWRpc3BsYXksIC5jZXJ0LWVkaXQtZm9ybScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZnVsbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIG1lYW5pbmdmdWwgZGlzcGxheSB0ZXh0IGZyb20gY2VydGlmaWNhdGUgaW5mb1xuICAgICAgICAgICAgICAgIGxldCBkaXNwbGF5VGV4dCA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mbyAmJiAhY2VydEluZm8uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzdWJqZWN0L2RvbWFpblxuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uc3ViamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg8J+TnCAke2NlcnRJbmZvLnN1YmplY3R9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBpc3N1ZXIgaWYgbm90IHNlbGYtc2lnbmVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc3N1ZXIgJiYgIWNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGBieSAke2NlcnRJbmZvLmlzc3Vlcn1gKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5pc19zZWxmX3NpZ25lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaCgnKFNlbGYtc2lnbmVkKScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgdmFsaWRpdHkgZGF0ZXNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLnZhbGlkX3RvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKdjCBFeHBpcmVkICR7Y2VydEluZm8udmFsaWRfdG99YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5IDw9IDMwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4pqg77iPIEV4cGlyZXMgaW4gJHtjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeX0gZGF5c2ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDinIUgVmFsaWQgdW50aWwgJHtjZXJ0SW5mby52YWxpZF90b31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheVRleHQgPSBwYXJ0cy5qb2luKCcgfCAnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byB0cnVuY2F0ZWQgY2VydGlmaWNhdGVcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheVRleHQgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudHJ1bmNhdGVDZXJ0aWZpY2F0ZShmdWxsVmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBvcmlnaW5hbCBmaWVsZFxuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBzdGF0dXMgY29sb3IgY2xhc3MgYmFzZWQgb24gY2VydGlmaWNhdGUgc3RhdHVzXG4gICAgICAgICAgICAgICAgbGV0IHN0YXR1c0NsYXNzID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnd2FybmluZyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aW9uIGlucHV0IGZsdWlkIGNlcnQtZGlzcGxheSAke3N0YXR1c0NsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGRpc3BsYXlUZXh0KX1cIiByZWFkb25seSBjbGFzcz1cInRydW5jYXRlZC1kaXNwbGF5XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBjb3B5LWJ0blwiIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGZ1bGxWYWx1ZSl9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJiYXNpY1wiIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5Q2VydCB8fCAnQ29weSBjZXJ0aWZpY2F0ZSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjb3B5IGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGluZm8tY2VydC1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ2VydEluZm8gfHwgJ0NlcnRpZmljYXRlIGRldGFpbHMnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZWRpdC1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdCB8fCAnRWRpdCBjZXJ0aWZpY2F0ZSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJlZGl0IGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGRlbGV0ZS1jZXJ0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEZWxldGUgfHwgJ0RlbGV0ZSBjZXJ0aWZpY2F0ZSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ0cmFzaCBpY29uIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgJHtjZXJ0SW5mbyAmJiAhY2VydEluZm8uZXJyb3IgPyBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucmVuZGVyQ2VydGlmaWNhdGVEZXRhaWxzKGNlcnRJbmZvKSA6ICcnfVxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZm9ybSBjZXJ0LWVkaXQtZm9ybVwiIHN0eWxlPVwiZGlzcGxheTpub25lO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGlkPVwiV0VCSFRUUFNQdWJsaWNLZXlfZWRpdFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dzPVwiMTBcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCIke2dsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVB1YmxpY0NlcnQgfHwgJ1Bhc3RlIHB1YmxpYyBjZXJ0aWZpY2F0ZSBoZXJlLi4uJ31cIj4ke2Z1bGxWYWx1ZX08L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbWluaSBidXR0b25zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIHBvc2l0aXZlIGJ1dHRvbiBzYXZlLWNlcnQtYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuYnRfU2F2ZSB8fCAnU2F2ZSd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBjYW5jZWwtY2VydC1idG5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjbG9zZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5idF9DYW5jZWwgfHwgJ0NhbmNlbCd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGluZm8gYnV0dG9uIC0gdG9nZ2xlIGRldGFpbHMgZGlzcGxheVxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmluZm8tY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGRldGFpbHMgPSAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWRldGFpbHMnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRkZXRhaWxzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGRldGFpbHMuc2xpZGVUb2dnbGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBlZGl0IGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmVkaXQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1lZGl0LWZvcm0nKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHVibGljS2V5X2VkaXQnKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnNhdmUtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSAkY29udGFpbmVyLmZpbmQoJyNXRUJIVFRQU1B1YmxpY0tleV9lZGl0JykudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIG9yaWdpbmFsIGhpZGRlbiBmaWVsZFxuICAgICAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLnZhbChuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBvbmx5IHRoZSBjZXJ0aWZpY2F0ZSBmaWVsZCBkaXNwbGF5IHdpdGggbmV3IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBjYW5jZWwgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2FuY2VsLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZWRpdC1mb3JtJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWRpc3BsYXknKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGRlbGV0ZSBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5kZWxldGUtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBjZXJ0aWZpY2F0ZVxuICAgICAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBvbmx5IHRoZSBjZXJ0aWZpY2F0ZSBmaWVsZCB0byBzaG93IGVtcHR5IGZpZWxkXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJ1tkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGNsaXBib2FyZCBmb3IgbmV3IGJ1dHRvbnNcbiAgICAgICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZCkge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDbGlwYm9hcmQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG9yaWdpbmFsIGZpZWxkIGZvciBpbnB1dCB3aXRoIHByb3BlciBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQdWJsaWNDZXJ0IHx8ICdQYXN0ZSBwdWJsaWMgY2VydGlmaWNhdGUgaGVyZS4uLicpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuYXR0cigncm93cycsICcxMCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjaGFuZ2UgZXZlbnRzIHRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5vZmYoJ2lucHV0LmNlcnQgY2hhbmdlLmNlcnQga2V5dXAuY2VydCcpLm9uKCdpbnB1dC5jZXJ0IGNoYW5nZS5jZXJ0IGtleXVwLmNlcnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgZGlzcGxheSBmb3IgU1NIIGtleXMgYW5kIGNlcnRpZmljYXRlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBTU0hfSURfUlNBX1BVQiBmaWVsZFxuICAgICAgICBjb25zdCAkc3NoUHViS2V5RmllbGQgPSAkKCcjU1NIX0lEX1JTQV9QVUInKTtcbiAgICAgICAgaWYgKCRzc2hQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRzc2hQdWJLZXlGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkc3NoUHViS2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc3NoLWtleS1kaXNwbGF5LCAuZnVsbC1kaXNwbGF5JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgY3JlYXRlIGRpc3BsYXkgaWYgdGhlcmUncyBhIHZhbHVlXG4gICAgICAgICAgICBpZiAoZnVsbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRydW5jYXRlZCBkaXNwbGF5XG4gICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnRydW5jYXRlU1NIS2V5KGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgb3JpZ2luYWwgZmllbGRcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aW9uIGlucHV0IGZsdWlkIHNzaC1rZXktZGlzcGxheVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke3RydW5jYXRlZH1cIiByZWFkb25seSBjbGFzcz1cInRydW5jYXRlZC1kaXNwbGF5XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBjb3B5LWJ0blwiIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGZ1bGxWYWx1ZSl9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFyaWF0aW9uPVwiYmFzaWNcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weUtleSB8fCAnQ29weSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjb3B5IGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGV4cGFuZC1idG5cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEV4cGFuZCB8fCAnU2hvdyBmdWxsIGtleSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleHBhbmQgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgY2xhc3M9XCJmdWxsLWRpc3BsYXlcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIiByZWFkb25seT4ke2Z1bGxWYWx1ZX08L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgZXhwYW5kL2NvbGxhcHNlXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5leHBhbmQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZnVsbERpc3BsYXkgPSAkY29udGFpbmVyLmZpbmQoJy5mdWxsLWRpc3BsYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkdHJ1bmNhdGVkRGlzcGxheSA9ICRjb250YWluZXIuZmluZCgnLnNzaC1rZXktZGlzcGxheScpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJCh0aGlzKS5maW5kKCdpJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRmdWxsRGlzcGxheS5pcygnOnZpc2libGUnKSkge1xuICAgICAgICAgICAgICAgICAgICAkZnVsbERpc3BsYXkuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkdHJ1bmNhdGVkRGlzcGxheS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdjb21wcmVzcycpLmFkZENsYXNzKCdleHBhbmQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZnVsbERpc3BsYXkuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkdHJ1bmNhdGVkRGlzcGxheS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleHBhbmQnKS5hZGRDbGFzcygnY29tcHJlc3MnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgbmV3IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJ1tkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgYXMgcmVhZC1vbmx5ICh0aGlzIGlzIGEgc3lzdGVtLWdlbmVyYXRlZCBrZXkpXG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUuZ3NfTm9TU0hQdWJsaWNLZXkgfHwgJ05vIFNTSCBwdWJsaWMga2V5IGdlbmVyYXRlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgV0VCSFRUUFNQdWJsaWNLZXkgZmllbGQgLSB1c2UgZGVkaWNhdGVkIG1ldGhvZFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBXRUJIVFRQU1ByaXZhdGVLZXkgZmllbGQgKHdyaXRlLW9ubHkgd2l0aCBwYXNzd29yZCBtYXNraW5nKVxuICAgICAgICBjb25zdCAkY2VydFByaXZLZXlGaWVsZCA9ICQoJyNXRUJIVFRQU1ByaXZhdGVLZXknKTtcbiAgICAgICAgaWYgKCRjZXJ0UHJpdktleUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRjZXJ0UHJpdktleUZpZWxkLnBhcmVudCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIGRpc3BsYXkgZWxlbWVudHNcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnByaXZhdGUta2V5LXNldCwgI1dFQkhUVFBTUHJpdmF0ZUtleV9uZXcnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcHJpdmF0ZSBrZXkgZXhpc3RzIChwYXNzd29yZCBtYXNraW5nIGxvZ2ljKVxuICAgICAgICAgICAgLy8gVGhlIGZpZWxkIHdpbGwgY29udGFpbiAneHh4eHh4eCcgaWYgYSBwcml2YXRlIGtleSBpcyBzZXRcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRjZXJ0UHJpdktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgaGFzVmFsdWUgPSBjdXJyZW50VmFsdWUgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGhhc1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSBvcmlnaW5hbCBmaWVsZCBhbmQgc2hvdyBzdGF0dXMgbWVzc2FnZVxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwbGF5SHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZSBwcml2YXRlLWtleS1zZXRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwibG9jayBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmdzX1ByaXZhdGVLZXlJc1NldCB8fCAnUHJpdmF0ZSBrZXkgaXMgY29uZmlndXJlZCd9IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJyZXBsYWNlLWtleS1saW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfUmVwbGFjZSB8fCAnUmVwbGFjZSd9PC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGlkPVwiV0VCSFRUUFNQcml2YXRlS2V5X25ld1wiIG5hbWU9XCJXRUJIVFRQU1ByaXZhdGVLZXlcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M9XCIxMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQcml2YXRlS2V5IHx8ICdQYXN0ZSBwcml2YXRlIGtleSBoZXJlLi4uJ31cIj48L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSByZXBsYWNlIGxpbmtcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5yZXBsYWNlLWtleS1saW5rJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnByaXZhdGUta2V5LXNldCcpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJG5ld0ZpZWxkID0gJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQcml2YXRlS2V5X25ldycpO1xuICAgICAgICAgICAgICAgICAgICAkbmV3RmllbGQuc2hvdygpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgaGlkZGVuIHBhc3N3b3JkIHZhbHVlIHNvIHdlIGNhbiBzZXQgYSBuZXcgb25lXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBCaW5kIGNoYW5nZSBldmVudCB0byB1cGRhdGUgaGlkZGVuIGZpZWxkIGFuZCBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgJG5ld0ZpZWxkLm9uKCdpbnB1dCBjaGFuZ2Uga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgb3JpZ2luYWwgaGlkZGVuIGZpZWxkIHdpdGggbmV3IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC52YWwoJG5ld0ZpZWxkLnZhbCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb24gY2hlY2tcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG9yaWdpbmFsIGZpZWxkIGZvciBpbnB1dCB3aXRoIHByb3BlciBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVByaXZhdGVLZXkgfHwgJ1Bhc3RlIHByaXZhdGUga2V5IGhlcmUuLi4nKTtcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5hdHRyKCdyb3dzJywgJzEwJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNoYW5nZSBldmVudHMgdHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5vZmYoJ2lucHV0LnByaXYgY2hhbmdlLnByaXYga2V5dXAucHJpdicpLm9uKCdpbnB1dC5wcml2IGNoYW5nZS5wcml2IGtleXVwLnByaXYnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZnVuY3Rpb25hbGl0eSBmb3IgY29weSBidXR0b25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNsaXBib2FyZCgpIHtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY29weS1idG4nKTtcbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUudHJpZ2dlcik7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbEljb24gPSAkYnRuLmZpbmQoJ2knKS5hdHRyKCdjbGFzcycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkYnRuLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKCdjaGVjayBpY29uJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkYnRuLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKG9yaWdpbmFsSWNvbik7XG4gICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgc2VsZWN0aW9uXG4gICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5vbignZXJyb3InLCAoKSA9PiB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmdzX0NvcHlGYWlsZWQgfHwgJ0ZhaWxlZCB0byBjb3B5IHRvIGNsaXBib2FyZCcpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRydW5jYXRlIFNTSCBrZXkgZm9yIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gRnVsbCBTU0gga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUcnVuY2F0ZWQga2V5XG4gICAgICovXG4gICAgdHJ1bmNhdGVTU0hLZXkoa2V5KSB7XG4gICAgICAgIGlmICgha2V5IHx8IGtleS5sZW5ndGggPCA1MCkge1xuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJyAnKTtcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICBjb25zdCBrZXlUeXBlID0gcGFydHNbMF07XG4gICAgICAgICAgICBjb25zdCBrZXlEYXRhID0gcGFydHNbMV07XG4gICAgICAgICAgICBjb25zdCBjb21tZW50ID0gcGFydHMuc2xpY2UoMikuam9pbignICcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5RGF0YS5sZW5ndGggPiA0MCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZCA9IGtleURhdGEuc3Vic3RyaW5nKDAsIDIwKSArICcuLi4nICsga2V5RGF0YS5zdWJzdHJpbmcoa2V5RGF0YS5sZW5ndGggLSAxNSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke2tleVR5cGV9ICR7dHJ1bmNhdGVkfSAke2NvbW1lbnR9YC50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUcnVuY2F0ZSBjZXJ0aWZpY2F0ZSBmb3IgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjZXJ0IC0gRnVsbCBjZXJ0aWZpY2F0ZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVHJ1bmNhdGVkIGNlcnRpZmljYXRlIGluIHNpbmdsZSBsaW5lIGZvcm1hdFxuICAgICAqL1xuICAgIHRydW5jYXRlQ2VydGlmaWNhdGUoY2VydCkge1xuICAgICAgICBpZiAoIWNlcnQgfHwgY2VydC5sZW5ndGggPCAxMDApIHtcbiAgICAgICAgICAgIHJldHVybiBjZXJ0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsaW5lcyA9IGNlcnQuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEV4dHJhY3QgZmlyc3QgYW5kIGxhc3QgbWVhbmluZ2Z1bCBsaW5lc1xuICAgICAgICBjb25zdCBmaXJzdExpbmUgPSBsaW5lc1swXSB8fCAnJztcbiAgICAgICAgY29uc3QgbGFzdExpbmUgPSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBjZXJ0aWZpY2F0ZXMsIHNob3cgYmVnaW4gYW5kIGVuZCBtYXJrZXJzXG4gICAgICAgIGlmIChmaXJzdExpbmUuaW5jbHVkZXMoJ0JFR0lOIENFUlRJRklDQVRFJykpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtmaXJzdExpbmV9Li4uJHtsYXN0TGluZX1gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3Igb3RoZXIgZm9ybWF0cywgdHJ1bmNhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgY29uc3QgY2xlYW5DZXJ0ID0gY2VydC5yZXBsYWNlKC9cXG4vZywgJyAnKS50cmltKCk7XG4gICAgICAgIGlmIChjbGVhbkNlcnQubGVuZ3RoID4gODApIHtcbiAgICAgICAgICAgIHJldHVybiBjbGVhbkNlcnQuc3Vic3RyaW5nKDAsIDQwKSArICcuLi4nICsgY2xlYW5DZXJ0LnN1YnN0cmluZyhjbGVhbkNlcnQubGVuZ3RoIC0gMzApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2xlYW5DZXJ0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgZm9yIHNhZmUgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBtYXAgPSB7XG4gICAgICAgICAgICAnJic6ICcmYW1wOycsXG4gICAgICAgICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICAgICAgICc+JzogJyZndDsnLFxuICAgICAgICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICAgICAgICBcIidcIjogJyYjMDM5OydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZSgvWyY8PlwiJ10vZywgbSA9PiBtYXBbbV0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdywgaGlkZSBzc2ggcGFzc3dvcmQgc2VnbWVudCBhY2NvcmRpbmcgdG8gdGhlIHZhbHVlIG9mIHVzZSBTU0ggcGFzc3dvcmQgY2hlY2tib3guXG4gICAgICovXG4gICAgc2hvd0hpZGVTU0hQYXNzd29yZCgpe1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZFNlZ21lbnQuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZFNlZ21lbnQuc2hvdygpO1xuICAgICAgICB9XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogUHJlcGFyZXMgZGF0YSBmb3IgUkVTVCBBUEkgc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbiB1cCB1bm5lY2Vzc2FyeSBmaWVsZHMgYmVmb3JlIHNlbmRpbmdcbiAgICAgICAgY29uc3QgZmllbGRzVG9SZW1vdmUgPSBbXG4gICAgICAgICAgICAnZGlycnR5JyxcbiAgICAgICAgICAgICdkZWxldGVBbGxJbnB1dCcsXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgY29kZWNfKiBmaWVsZHMgKHRoZXkncmUgcmVwbGFjZWQgd2l0aCB0aGUgY29kZWNzIGFycmF5KVxuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSB8fCBmaWVsZHNUb1JlbW92ZS5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdCBjb2RlYyBkYXRhIC0gb25seSBpbmNsdWRlIGlmIGNoYW5nZWRcbiAgICAgICAgY29uc3QgYXJyQ29kZWNzID0gW107XG4gICAgICAgIGxldCBoYXNDb2RlY0NoYW5nZXMgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgYWxsIGNvZGVjIHJvd3NcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93LCAjdmlkZW8tY29kZWNzLXRhYmxlIC5jb2RlYy1yb3cnKS5lYWNoKChjdXJyZW50SW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29kZWNOYW1lID0gJChvYmopLmF0dHIoJ2RhdGEtY29kZWMtbmFtZScpO1xuICAgICAgICAgICAgaWYgKGNvZGVjTmFtZSAmJiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkub3JpZ2luYWxDb2RlY1N0YXRlW2NvZGVjTmFtZV0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGVbY29kZWNOYW1lXTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50RGlzYWJsZWQgPSAkKG9iaikuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHBvc2l0aW9uIG9yIGRpc2FibGVkIHN0YXRlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudEluZGV4ICE9PSBvcmlnaW5hbC5wcmlvcml0eSB8fCBjdXJyZW50RGlzYWJsZWQgIT09IG9yaWdpbmFsLmRpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc0NvZGVjQ2hhbmdlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGFyckNvZGVjcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogY29kZWNOYW1lLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogY3VycmVudERpc2FibGVkLFxuICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogY3VycmVudEluZGV4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9ubHkgaW5jbHVkZSBjb2RlY3MgaWYgdGhlcmUgd2VyZSBjaGFuZ2VzXG4gICAgICAgIGlmIChoYXNDb2RlY0NoYW5nZXMpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvZGVjcyA9IGFyckNvZGVjcztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogSGFuZGxlcyBSRVNUIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgJChcIiNlcnJvci1tZXNzYWdlc1wiKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZTogeyByZXN1bHQ6IGJvb2wsIGRhdGE6IHt9LCBtZXNzYWdlczoge30gfVxuICAgICAgICBpZiAoIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbChyZXNwb25zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgZmllbGRzIHRvIGhpZGRlbiB2YWx1ZSBvbiBzdWNjZXNzXG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBwYXNzd29yZCB2YWxpZGF0aW9uIHdhcm5pbmdzIGFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZVxuICAgICAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZGVsZXRlIGFsbCBjb25kaXRpb25zIGlmIG5lZWRlZFxuICAgICAgICBpZiAodHlwZW9mIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jaGVja0RlbGV0ZUNvbmRpdGlvbnMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBlcnJvciBtZXNzYWdlIEhUTUwgZnJvbSBSRVNUIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZSB3aXRoIGVycm9yIG1lc3NhZ2VzXG4gICAgICovXG4gICAgZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgY29uc3QgJGRpdiA9ICQoJzxkaXY+JywgeyBjbGFzczogJ3VpIG5lZ2F0aXZlIG1lc3NhZ2UnLCBpZDogJ2Vycm9yLW1lc3NhZ2VzJyB9KTtcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXIgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICdoZWFkZXInIH0pLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmdzX0Vycm9yU2F2ZVNldHRpbmdzKTtcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCRoZWFkZXIpO1xuICAgICAgICAgICAgY29uc3QgJHVsID0gJCgnPHVsPicsIHsgY2xhc3M6ICdsaXN0JyB9KTtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzU2V0ID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgYm90aCBlcnJvciBhbmQgdmFsaWRhdGlvbiBtZXNzYWdlIHR5cGVzXG4gICAgICAgICAgICBbJ2Vycm9yJywgJ3ZhbGlkYXRpb24nXS5mb3JFYWNoKG1zZ1R5cGUgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlcyA9IEFycmF5LmlzQXJyYXkocmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV0pIFxuICAgICAgICAgICAgICAgICAgICAgICAgPyByZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogW3Jlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzLmZvckVhY2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRleHRDb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGVycm9yID09PSAnb2JqZWN0JyAmJiBlcnJvci5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3IubWVzc2FnZV0gfHwgZXJyb3IubWVzc2FnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3JdIHx8IGVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1lc3NhZ2VzU2V0Lmhhcyh0ZXh0Q29udGVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlc1NldC5hZGQodGV4dENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR1bC5hcHBlbmQoJCgnPGxpPicpLnRleHQodGV4dENvbnRlbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCR1bCk7XG4gICAgICAgICAgICAkKCcjc3VibWl0YnV0dG9uJykuYmVmb3JlKCRkaXYpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHZhbGlkYXRpb24gcnVsZXMgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBpbml0UnVsZXMoKSB7XG4gICAgICAgIC8vIFNTSFBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M7XG4gICAgICAgIH0gZWxzZSBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZWJBZG1pblBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5XZWJBZG1pblBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LndlYkFkbWluUGFzc3dvcmRSdWxlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgY2VydGlmaWNhdGUgZGV0YWlscyBIVE1MXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNlcnRJbmZvIC0gQ2VydGlmaWNhdGUgaW5mb3JtYXRpb24gb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgY2VydGlmaWNhdGUgZGV0YWlsc1xuICAgICAqL1xuICAgIHJlbmRlckNlcnRpZmljYXRlRGV0YWlscyhjZXJ0SW5mbykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwiY2VydC1kZXRhaWxzXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7IG1hcmdpbi10b3A6MTBweDtcIj4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGxpc3RcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gU3ViamVjdFxuICAgICAgICBpZiAoY2VydEluZm8uc3ViamVjdCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPlN1YmplY3Q6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uc3ViamVjdCl9PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSXNzdWVyXG4gICAgICAgIGlmIChjZXJ0SW5mby5pc3N1ZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5Jc3N1ZXI6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uaXNzdWVyKX1gO1xuICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnIDxzcGFuIGNsYXNzPVwidWkgdGlueSBsYWJlbFwiPlNlbGYtc2lnbmVkPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGl0eSBwZXJpb2RcbiAgICAgICAgaWYgKGNlcnRJbmZvLnZhbGlkX2Zyb20gJiYgY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5WYWxpZDo8L3N0cm9uZz4gJHtjZXJ0SW5mby52YWxpZF9mcm9tfSB0byAke2NlcnRJbmZvLnZhbGlkX3RvfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV4cGlyeSBzdGF0dXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IHJlZCBsYWJlbFwiPkNlcnRpZmljYXRlIEV4cGlyZWQ8L3NwYW4+PC9kaXY+JztcbiAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgeWVsbG93IGxhYmVsXCI+RXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSBncmVlbiBsYWJlbFwiPlZhbGlkIGZvciAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN1YmplY3QgQWx0ZXJuYXRpdmUgTmFtZXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLnNhbiAmJiBjZXJ0SW5mby5zYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPkFsdGVybmF0aXZlIE5hbWVzOjwvc3Ryb25nPic7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBsaXN0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDoxMHB4O1wiPic7XG4gICAgICAgICAgICBjZXJ0SW5mby5zYW4uZm9yRWFjaChzYW4gPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChzYW4pfTwvZGl2PmA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIGxpc3RcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2Ugc2VnbWVudFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBjZXJ0LWRldGFpbHNcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBQQlhMYW5ndWFnZSBjaGFuZ2UgZGV0ZWN0aW9uIGZvciByZXN0YXJ0IHdhcm5pbmdcbiAgICAgKiBTaG93cyByZXN0YXJ0IHdhcm5pbmcgb25seSB3aGVuIHRoZSBsYW5ndWFnZSB2YWx1ZSBjaGFuZ2VzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBCWExhbmd1YWdlV2FybmluZygpIHtcbiAgICAgICAgY29uc3QgJGxhbmd1YWdlRHJvcGRvd24gPSAkKCcjUEJYTGFuZ3VhZ2UnKTtcbiAgICAgICAgY29uc3QgJHJlc3RhcnRXYXJuaW5nID0gJCgnI3Jlc3RhcnQtd2FybmluZy1QQlhMYW5ndWFnZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgdmFsdWVcbiAgICAgICAgbGV0IG9yaWdpbmFsVmFsdWUgPSBudWxsO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IG9yaWdpbmFsIHZhbHVlIGFmdGVyIGRhdGEgbG9hZHNcbiAgICAgICAgJChkb2N1bWVudCkub24oJ0dlbmVyYWxTZXR0aW5ncy5kYXRhTG9hZGVkJywgKCkgPT4ge1xuICAgICAgICAgICAgb3JpZ2luYWxWYWx1ZSA9ICRsYW5ndWFnZURyb3Bkb3duLnZhbCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBkcm9wZG93biBjaGFuZ2UgZXZlbnRcbiAgICAgICAgJGxhbmd1YWdlRHJvcGRvd24uY2xvc2VzdCgnLmRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgd2FybmluZyBpZiB2YWx1ZSBjaGFuZ2VkIGZyb20gb3JpZ2luYWxcbiAgICAgICAgICAgICAgICBpZiAob3JpZ2luYWxWYWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gb3JpZ2luYWxWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAkcmVzdGFydFdhcm5pbmcudHJhbnNpdGlvbignZmFkZSBpbicpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRyZXN0YXJ0V2FybmluZy50cmFuc2l0aW9uKCdmYWRlIG91dCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIGRldGVjdGlvblxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIFJFU1QgQVBJIG1vZGVcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBHZW5lcmFsU2V0dGluZ3NBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlU2V0dGluZ3MnO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvbiBmb3IgY2xlYW5lciBBUEkgcmVxdWVzdHNcbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG5cbiAgICAgICAgLy8gTm8gcmVkaXJlY3QgYWZ0ZXIgc2F2ZSAtIHN0YXkgb24gdGhlIHNhbWUgcGFnZVxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBudWxsO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gbnVsbDtcbiAgICAgICAgRm9ybS51cmwgPSBgI2A7XG4gICAgICAgIFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGdlbmVyYWxTZXR0aW5ncyBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7Il19