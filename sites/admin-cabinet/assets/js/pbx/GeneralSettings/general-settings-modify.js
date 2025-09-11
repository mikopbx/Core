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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJkYXRhTG9hZGVkIiwidmFsaWRhdGVSdWxlcyIsInBieG5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUiLCJXZWJBZG1pblBhc3N3b3JkIiwiV2ViQWRtaW5QYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJTU0hQYXNzd29yZCIsIlNTSFBhc3N3b3JkUmVwZWF0IiwiZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCIsIldFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlIiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCIsIldFQkhUVFBTUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0IiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJBSkFNUG9ydCIsImdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlIiwiU0lQQXV0aFByZWZpeCIsImdzX1NJUEF1dGhQcmVmaXhJbnZhbGlkIiwid2ViQWRtaW5QYXNzd29yZFJ1bGVzIiwiZ3NfVmFsaWRhdGVFbXB0eVdlYlBhc3N3b3JkIiwiZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQiLCJ2YWx1ZSIsImdzX1Bhc3N3b3JkcyIsImdzX1Bhc3N3b3JkTm9Mb3dTaW12b2wiLCJnc19QYXNzd29yZE5vTnVtYmVycyIsImdzX1Bhc3N3b3JkTm9VcHBlclNpbXZvbCIsImFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcyIsImdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkIiwiZ3NfU1NIUGFzc3dvcmQiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcyIsImNsaXBib2FyZCIsImluaXRpYWxpemUiLCJsZW5ndGgiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJjb250ZXh0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJ2YWxpZGF0ZU9uSW5wdXQiLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJjaGVja09uTG9hZCIsInNzaFdpZGdldCIsIm9uIiwiaXNEaXNhYmxlZCIsImNoZWNrYm94IiwiaGlkZVdhcm5pbmdzIiwiZWxlbWVudHMiLCIkc2NvcmVTZWN0aW9uIiwiaGlkZSIsImNoZWNrUGFzc3dvcmQiLCJ2YWwiLCJpbml0UnVsZXMiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwibm90IiwiZHJvcGRvd24iLCJpbml0aWFsaXplQU1JQUpBTURlcGVuZGVuY3kiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMiLCJpbml0aWFsaXplQ2xpcGJvYXJkIiwic2hvd0hpZGVTU0hQYXNzd29yZCIsIndpbmRvdyIsImV2ZW50IiwibmFtZVRhYiIsIkdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyIiwiaW5pdGlhbGl6ZVBCWExhbmd1YWdlV2FybmluZyIsImxvYWREYXRhIiwiaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9ycyIsImFkZENsYXNzIiwiY29uc29sZSIsImxvZyIsIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsImRhdGEiLCJzZXR0aW5ncyIsInBvcHVsYXRlRm9ybSIsInBhc3N3b3JkVmFsaWRhdGlvbiIsInNldFRpbWVvdXQiLCJzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MiLCJtZXNzYWdlcyIsImVycm9yIiwic2hvd0FwaUVycm9yIiwiY29kZWNzIiwiRm9ybSIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwicG9wdWxhdGVTcGVjaWFsRmllbGRzIiwibG9hZFNvdW5kRmlsZVZhbHVlcyIsInVwZGF0ZUNvZGVjVGFibGVzIiwiaW5pdGlhbGl6ZVBhc3N3b3JkRmllbGRzIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5Iiwic3NoS2V5c1RhYmxlIiwiZG9jdW1lbnQiLCJ0cmlnZ2VyIiwiV0VCSFRUUFNQdWJsaWNLZXlfaW5mbyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwia2V5IiwiJGNoZWNrYm94IiwiaXNDaGVja2VkIiwiJGRyb3Bkb3duIiwiaGFzQ2xhc3MiLCJmb3JtIiwiZXJyb3JNZXNzYWdlIiwiQXJyYXkiLCJpc0FycmF5Iiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwidmFsaWRhdGlvbiIsInJlbW92ZSIsImlzRGVmYXVsdFdlYlBhc3N3b3JkIiwiJHdlYlBhc3N3b3JkRmllbGRzIiwiY2xvc2VzdCIsIndhcm5pbmdIdG1sIiwiZ3NfU2V0UGFzc3dvcmQiLCJnc19TZXRQYXNzd29yZEluZm8iLCJiZWZvcmUiLCJpc0RlZmF1bHRTU0hQYXNzd29yZCIsInNzaFBhc3N3b3JkRGlzYWJsZWQiLCIkc3NoUGFzc3dvcmRGaWVsZHMiLCJTb3VuZEZpbGVTZWxlY3RvciIsImNhdGVnb3J5IiwiaW5jbHVkZUVtcHR5IiwiYXVkaW9Db2RlY3MiLCJmaWx0ZXIiLCJjIiwic29ydCIsImEiLCJiIiwicHJpb3JpdHkiLCJ2aWRlb0NvZGVjcyIsImJ1aWxkQ29kZWNUYWJsZSIsInNob3ciLCJpbml0aWFsaXplQ29kZWNEcmFnRHJvcCIsIiR0YWJsZUJvZHkiLCJlbXB0eSIsImNvZGVjIiwiaW5kZXgiLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGVja2VkIiwicm93SHRtbCIsImVzY2FwZUh0bWwiLCJkZXNjcmlwdGlvbiIsImFwcGVuZCIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkIiwiJGNlcnRQdWJLZXlGaWVsZCIsImZ1bGxWYWx1ZSIsIiRjb250YWluZXIiLCJjZXJ0SW5mbyIsImRpc3BsYXlUZXh0IiwicGFydHMiLCJzdWJqZWN0IiwicHVzaCIsImlzc3VlciIsImlzX3NlbGZfc2lnbmVkIiwidmFsaWRfdG8iLCJpc19leHBpcmVkIiwiZGF5c191bnRpbF9leHBpcnkiLCJ0cnVuY2F0ZUNlcnRpZmljYXRlIiwic3RhdHVzQ2xhc3MiLCJkaXNwbGF5SHRtbCIsImJ0X1Rvb2xUaXBDb3B5Q2VydCIsImJ0X1Rvb2xUaXBDZXJ0SW5mbyIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsInJlbmRlckNlcnRpZmljYXRlRGV0YWlscyIsImdzX1Bhc3RlUHVibGljQ2VydCIsImJ0X1NhdmUiLCJidF9DYW5jZWwiLCJlIiwicHJldmVudERlZmF1bHQiLCIkZGV0YWlscyIsInNsaWRlVG9nZ2xlIiwiZm9jdXMiLCJuZXdWYWx1ZSIsImNoZWNrVmFsdWVzIiwicG9wdXAiLCJkZXN0cm95IiwiYXR0ciIsIm9mZiIsIiRzc2hQdWJLZXlGaWVsZCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiYnRfVG9vbFRpcENvcHlLZXkiLCJidF9Ub29sVGlwRXhwYW5kIiwiJGZ1bGxEaXNwbGF5IiwiJHRydW5jYXRlZERpc3BsYXkiLCIkaWNvbiIsImlzIiwiZ3NfTm9TU0hQdWJsaWNLZXkiLCIkY2VydFByaXZLZXlGaWVsZCIsImN1cnJlbnRWYWx1ZSIsImhhc1ZhbHVlIiwiZ3NfUHJpdmF0ZUtleUlzU2V0IiwiZ3NfUmVwbGFjZSIsImdzX1Bhc3RlUHJpdmF0ZUtleSIsIiRuZXdGaWVsZCIsIkNsaXBib2FyZEpTIiwiJGJ0biIsIm9yaWdpbmFsSWNvbiIsImNsZWFyU2VsZWN0aW9uIiwiZ3NfQ29weUZhaWxlZCIsInNwbGl0Iiwia2V5VHlwZSIsImtleURhdGEiLCJjb21tZW50Iiwic2xpY2UiLCJzdWJzdHJpbmciLCJ0cmltIiwiY2VydCIsImxpbmVzIiwibGluZSIsImZpcnN0TGluZSIsImxhc3RMaW5lIiwiaW5jbHVkZXMiLCJjbGVhbkNlcnQiLCJyZXBsYWNlIiwidGV4dCIsIm1hcCIsIm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwiZmllbGRzVG9SZW1vdmUiLCJzdGFydHNXaXRoIiwiYXJyQ29kZWNzIiwiaGFzQ29kZWNDaGFuZ2VzIiwiZWFjaCIsImN1cnJlbnRJbmRleCIsIm9iaiIsImNvZGVjTmFtZSIsIm9yaWdpbmFsIiwiY3VycmVudERpc2FibGVkIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsImdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbCIsImZhZGVPdXQiLCJnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwiLCJjaGVja0RlbGV0ZUNvbmRpdGlvbnMiLCIkZGl2IiwiaWQiLCIkaGVhZGVyIiwiZ3NfRXJyb3JTYXZlU2V0dGluZ3MiLCIkdWwiLCJtZXNzYWdlc1NldCIsIlNldCIsIm1zZ1R5cGUiLCJ0ZXh0Q29udGVudCIsIm1lc3NhZ2UiLCJoYXMiLCJhZGQiLCJodG1sIiwidmFsaWRfZnJvbSIsInNhbiIsIiRhbWlDaGVja2JveCIsIiRhamFtQ2hlY2tib3giLCJ1cGRhdGVBSkFNU3RhdGUiLCJpc0FNSUVuYWJsZWQiLCJnc19BSkFNUmVxdWlyZXNBTUkiLCJyZW1vdmVBdHRyIiwiJGxhbmd1YWdlRHJvcGRvd24iLCIkcmVzdGFydFdhcm5pbmciLCJvcmlnaW5hbFZhbHVlIiwidHJhbnNpdGlvbiIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInVybCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFHQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxxQkFBcUIsR0FBRztBQUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx3QkFBRCxDQUxlOztBQU8xQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRUQsQ0FBQyxDQUFDLG1CQUFELENBWE07O0FBYTFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFlBQVksRUFBRUYsQ0FBQyxDQUFDLGNBQUQsQ0FqQlc7O0FBbUIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxtQkFBbUIsRUFBRUgsQ0FBQyxDQUFDLDJCQUFELENBQUQsQ0FBK0JJLE1BQS9CLENBQXNDLFdBQXRDLENBdkJLOztBQXlCMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsbUJBQW1CLEVBQUVMLENBQUMsQ0FBQywyQkFBRCxDQTdCSTs7QUErQjFCO0FBQ0o7QUFDQTtBQUNJTSxFQUFBQSxjQUFjLEVBQUUsU0FsQ1U7O0FBb0MxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxF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QUMzRCxVQUFMO0FBQ0g7QUF0NUN5QixDQUE5QixDLENBeTVDQTs7QUFDQXJELENBQUMsQ0FBQzJILFFBQUQsQ0FBRCxDQUFZMkwsS0FBWixDQUFrQixZQUFNO0FBQ3BCeFQsRUFBQUEscUJBQXFCLENBQUN1RCxVQUF0QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGFzc3dvcmRTY29yZSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSwgU291bmRGaWxlU2VsZWN0b3IsIEdlbmVyYWxTZXR0aW5nc0FQSSwgQ2xpcGJvYXJkSlMsIFBhc3N3b3JkV2lkZ2V0LCBQYXNzd29yZFZhbGlkYXRpb25BUEksIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyLCAkICovXG5cbi8qKlxuICogQSBtb2R1bGUgdG8gaGFuZGxlIG1vZGlmaWNhdGlvbiBvZiBnZW5lcmFsIHNldHRpbmdzLlxuICovXG5jb25zdCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBhZG1pbiBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR3ZWJBZG1pblBhc3N3b3JkOiAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZDogJCgnI1NTSFBhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgd2ViIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXNhYmxlU1NIUGFzc3dvcmQ6ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5wYXJlbnQoJy5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZFNlZ21lbnQ6ICQoJyNvbmx5LWlmLXBhc3N3b3JkLWVuYWJsZWQnKSxcblxuICAgIC8qKlxuICAgICAqIElmIHBhc3N3b3JkIHNldCwgaXQgd2lsbCBiZSBoaWRlZCBmcm9tIHdlYiB1aS5cbiAgICAgKi9cbiAgICBoaWRkZW5QYXNzd29yZDogJ3h4eHh4eHgnLFxuXG4gICAgLyoqXG4gICAgICogU291bmQgZmlsZSBmaWVsZCBJRHNcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHNvdW5kRmlsZUZpZWxkczoge1xuICAgICAgICBhbm5vdW5jZW1lbnRJbjogJ1BCWFJlY29yZEFubm91bmNlbWVudEluJyxcbiAgICAgICAgYW5ub3VuY2VtZW50T3V0OiAnUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0J1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogT3JpZ2luYWwgY29kZWMgc3RhdGUgZnJvbSBsYXN0IGxvYWRcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIG9yaWdpbmFsQ29kZWNTdGF0ZToge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBkYXRhIGhhcyBiZWVuIGxvYWRlZCBmcm9tIEFQSVxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGRhdGFMb2FkZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7IC8vIGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzXG4gICAgICAgIHBieG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdQQlhOYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5UEJYTmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV2ViQWRtaW5QYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dlYkFkbWluUGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBXZWJBZG1pblBhc3N3b3JkUmVwZWF0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hdGNoW1dlYkFkbWluUGFzc3dvcmRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWJQYXNzd29yZHNGaWVsZERpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgU1NIUGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTU0hQYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIFNTSFBhc3N3b3JkUmVwZWF0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU1NIUGFzc3dvcmRSZXBlYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXRjaFtTU0hQYXNzd29yZF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVNTSFBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXRUJQb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV0VCUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtXRUJIVFRQU1BvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXRUJIVFRQU1BvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXRUJIVFRQU1BvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtXRUJQb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIEFKQU1Qb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnQUpBTVBvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBTSVBBdXRoUHJlZml4OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU0lQQXV0aFByZWZpeCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cFsvXlthLXpBLVpdKiQvXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhJbnZhbGlkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgZmllbGQgd2hlbiBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICB3ZWJBZG1pblBhc3N3b3JkUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1tBLVpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGVuYWJsZWQsIGFuZCBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGQgd2hlbiBTU0ggbG9naW4gdGhyb3VnaCB0aGUgcGFzc3dvcmQgZGlzYWJsZWRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkLFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8qKlxuICAgICAqIENsaXBib2FyZCBpbnN0YW5jZSBmb3IgY29weSBmdW5jdGlvbmFsaXR5XG4gICAgICogQHR5cGUge0NsaXBib2FyZEpTfVxuICAgICAqL1xuICAgIGNsaXBib2FyZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiAgSW5pdGlhbGl6ZSBtb2R1bGUgd2l0aCBldmVudCBiaW5kaW5ncyBhbmQgY29tcG9uZW50IGluaXRpYWxpemF0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0c1xuICAgICAgICAvLyBXZWIgQWRtaW4gUGFzc3dvcmQgd2lkZ2V0IC0gb25seSB2YWxpZGF0aW9uIGFuZCB3YXJuaW5ncywgbm8gYnV0dG9uc1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIFBhc3N3b3JkV2lkZ2V0LmluaXQoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLCB7XG4gICAgICAgICAgICAgICAgY29udGV4dDogJ2dlbmVyYWxfd2ViJyxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSwgICAgIC8vIE5vIHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTU0ggUGFzc3dvcmQgd2lkZ2V0IC0gb25seSB2YWxpZGF0aW9uIGFuZCB3YXJuaW5ncywgbm8gYnV0dG9uc1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzc2hXaWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQsIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0OiAnZ2VuZXJhbF9zc2gnLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLCAgICAgLy8gTm8gc2hvdy9oaWRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gY29weSBidXR0b25cbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBTU0ggZGlzYWJsZSBjaGVja2JveFxuICAgICAgICAgICAgJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNEaXNhYmxlZCA9ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGlmIChpc0Rpc2FibGVkICYmIHNzaFdpZGdldCkge1xuICAgICAgICAgICAgICAgICAgICBQYXNzd29yZFdpZGdldC5oaWRlV2FybmluZ3Moc3NoV2lkZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNzaFdpZGdldC5lbGVtZW50cy4kc2NvcmVTZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzc2hXaWRnZXQuZWxlbWVudHMuJHNjb3JlU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpc0Rpc2FibGVkICYmIHNzaFdpZGdldCkge1xuICAgICAgICAgICAgICAgICAgICBQYXNzd29yZFdpZGdldC5jaGVja1Bhc3N3b3JkKHNzaFdpZGdldCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIHdoZW4gcGFzc3dvcmRzIGNoYW5nZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgIT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQudmFsKCkgIT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLW1lbnUnKS5maW5kKCcuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGRyb3Bkb3ducyBvbiB0aGUgZm9ybSAoZXhjZXB0IHNvdW5kIGZpbGUgc2VsZWN0b3JzKVxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5kcm9wZG93bicpLm5vdCgnLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3hlcyBvbiB0aGUgZm9ybVxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIEFNSS9BSkFNIGRlcGVuZGVuY3kgYWZ0ZXIgY2hlY2tib3hlcyBhcmUgaW5pdGlhbGl6ZWRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSgpO1xuXG4gICAgICAgIC8vIENvZGVjIHRhYmxlIGRyYWctbi1kcm9wIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gU2VlIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkgd2hpY2ggaXMgY2FsbGVkIGZyb20gdXBkYXRlQ29kZWNUYWJsZXMoKVxuXG4gICAgICAgIC8vIFNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgUkVTVCBBUEkgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gU2VlIGxvYWRTb3VuZEZpbGVWYWx1ZXMoKSBtZXRob2QgY2FsbGVkIGZyb20gcG9wdWxhdGVGb3JtKClcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogU1NIIGtleXMgdGFibGUgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGxvYWRzXG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgZGlzcGxheVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIGNvcHkgYnV0dG9uc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWRkaXRpb25hbCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcblxuICAgICAgICAvLyBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KHtcbiAgICAgICAgICAgICdvbkNoYW5nZSc6IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkXG4gICAgICAgIH0pO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0hpZGVTU0hQYXNzd29yZCgpO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBoYW5kbGUgdGFiIGFjdGl2YXRpb25cbiAgICAgICAgJCh3aW5kb3cpLm9uKCdHUy1BY3RpdmF0ZVRhYicsIChldmVudCwgbmFtZVRhYikgPT4ge1xuICAgICAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKCdjaGFuZ2UgdGFiJywgbmFtZVRhYik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaWYgKHR5cGVvZiBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBQQlhMYW5ndWFnZSBjaGFuZ2UgZGV0ZWN0aW9uIGZvciByZXN0YXJ0IHdhcm5pbmdcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmcoKTtcblxuICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSBBUEkgaW5zdGVhZCBvZiB1c2luZyBzZXJ2ZXItcmVuZGVyZWQgdmFsdWVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggcGxheWJhY2sgZnVuY3Rpb25hbGl0eSB1c2luZyBTb3VuZEZpbGVTZWxlY3RvclxuICAgICAqIEhUTUwgc3RydWN0dXJlIGlzIHByb3ZpZGVkIGJ5IHRoZSBwbGF5QWRkTmV3U291bmRXaXRoSWNvbnMgcGFydGlhbCBpbiByZWNvcmRpbmcudm9sdDpcbiAgICAgKiAtIEhpZGRlbiBpbnB1dDogPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCIgbmFtZT1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCI+XG4gICAgICogLSBEcm9wZG93biBkaXY6IDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gc2VhcmNoIFBCWFJlY29yZEFubm91bmNlbWVudEluLWRyb3Bkb3duXCI+XG4gICAgICogLSBQbGF5YmFjayBidXR0b24gYW5kIGFkZCBuZXcgYnV0dG9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9ycygpIHtcbiAgICAgICAgLy8gU291bmQgZmlsZSBzZWxlY3RvcnMgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9yV2l0aERhdGEoKSBjYWxsZWQgZnJvbSBwb3B1bGF0ZUZvcm0oKVxuICAgICAgICBcbiAgICAgICAgLy8gVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgY29uc2lzdGVuY3kgYnV0IGFjdHVhbCBpbml0aWFsaXphdGlvbiBoYXBwZW5zXG4gICAgICAgIC8vIHdoZW4gd2UgaGF2ZSBkYXRhIGZyb20gdGhlIHNlcnZlciBpbiBsb2FkU291bmRGaWxlVmFsdWVzKClcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBnZW5lcmFsIHNldHRpbmdzIGRhdGEgZnJvbSBBUElcbiAgICAgKiBVc2VkIGJvdGggb24gaW5pdGlhbCBwYWdlIGxvYWQgYW5kIGZvciBtYW51YWwgcmVmcmVzaFxuICAgICAqIENhbiBiZSBjYWxsZWQgYW55dGltZSB0byByZWxvYWQgdGhlIGZvcm0gZGF0YTogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWREYXRhKClcbiAgICAgKi9cbiAgICBsb2FkRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHRoZSBmb3JtXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBjb25zb2xlLmxvZygnTG9hZGluZyBnZW5lcmFsIHNldHRpbmdzIGZyb20gQVBJLi4uJyk7XG4gICAgICAgIFxuICAgICAgICBHZW5lcmFsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBUEkgUmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUG9wdWxhdGluZyBmb3JtIHdpdGg6JywgcmVzcG9uc2UuZGF0YS5zZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIHRoZSByZWNlaXZlZCBkYXRhXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZGF0YUxvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3YXJuaW5ncyBmb3IgZGVmYXVsdCBwYXNzd29yZHMgYWZ0ZXIgRE9NIHVwZGF0ZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLnBhc3N3b3JkVmFsaWRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIHVwZGF0ZWQgYWZ0ZXIgcG9wdWxhdGVGb3JtXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dEZWZhdWx0UGFzc3dvcmRXYXJuaW5ncyhyZXNwb25zZS5kYXRhLnBhc3N3b3JkVmFsaWRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBFcnJvcjonLCByZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93QXBpRXJyb3IocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBzZXR0aW5ncyBhbmQgYWRkaXRpb25hbCBkYXRhXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gZGF0YS5zZXR0aW5ncyB8fCBkYXRhO1xuICAgICAgICBjb25zdCBjb2RlY3MgPSBkYXRhLmNvZGVjcyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoc2V0dGluZ3MsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzcGVjaWFsIGZpZWxkIHR5cGVzXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnBvcHVsYXRlU3BlY2lhbEZpZWxkcyhmb3JtRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBzb3VuZCBmaWxlIHZhbHVlcyB3aXRoIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkU291bmRGaWxlVmFsdWVzKGZvcm1EYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY29kZWMgdGFibGVzXG4gICAgICAgICAgICAgICAgaWYgKGNvZGVjcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS51cGRhdGVDb2RlY1RhYmxlcyhjb2RlY3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIGZpZWxkcyAoaGlkZSBhY3R1YWwgcGFzc3dvcmRzKVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUGFzc3dvcmRGaWVsZHMoZm9ybURhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBTU0ggcGFzc3dvcmQgdmlzaWJpbGl0eVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGlmIGVuYWJsZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFNTSCBrZXlzIHRhYmxlIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIGlmICh0eXBlb2Ygc3NoS2V5c1RhYmxlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgc3NoS2V5c1RhYmxlLmluaXRpYWxpemUoJ3NzaC1rZXlzLWNvbnRhaW5lcicsICdTU0hBdXRob3JpemVkS2V5cycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgd2l0aCBuZXcgZGF0YVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJpZ2dlciBldmVudCB0byBub3RpZnkgdGhhdCBkYXRhIGhhcyBiZWVuIGxvYWRlZFxuICAgICAgICAkKGRvY3VtZW50KS50cmlnZ2VyKCdHZW5lcmFsU2V0dGluZ3MuZGF0YUxvYWRlZCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHNwZWNpYWwgZmllbGQgdHlwZXMgdGhhdCBuZWVkIGN1c3RvbSBwb3B1bGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlU3BlY2lhbEZpZWxkcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBQcml2YXRlIGtleSBleGlzdGVuY2UgaXMgbm93IGRldGVybWluZWQgYnkgY2hlY2tpbmcgaWYgdmFsdWUgZXF1YWxzIEhJRERFTl9QQVNTV09SRFxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNlcnRpZmljYXRlIGluZm9cbiAgICAgICAgaWYgKHNldHRpbmdzLldFQkhUVFBTUHVibGljS2V5X2luZm8pIHtcbiAgICAgICAgICAgICQoJyNXRUJIVFRQU1B1YmxpY0tleScpLmRhdGEoJ2NlcnQtaW5mbycsIHNldHRpbmdzLldFQkhUVFBTUHVibGljS2V5X2luZm8pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2hlY2tib3hlcyAoQVBJIHJldHVybnMgYm9vbGVhbiB2YWx1ZXMpXG4gICAgICAgIE9iamVjdC5rZXlzKHNldHRpbmdzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKGAjJHtrZXl9YCkucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgIGlmICgkY2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IHNldHRpbmdzW2tleV0gPT09IHRydWUgfHwgc2V0dGluZ3Nba2V5XSA9PT0gJzEnIHx8IHNldHRpbmdzW2tleV0gPT09IDE7XG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmNoZWNrYm94KGlzQ2hlY2tlZCA/ICdjaGVjaycgOiAndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgcmVndWxhciBkcm9wZG93bnMgKGV4Y2x1ZGluZyBzb3VuZCBmaWxlIHNlbGVjdG9ycyB3aGljaCBhcmUgaGFuZGxlZCBzZXBhcmF0ZWx5KVxuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7a2V5fWApLnBhcmVudCgnLmRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA+IDAgJiYgISRkcm9wZG93bi5oYXNDbGFzcygnYXVkaW8tbWVzc2FnZS1zZWxlY3QnKSkge1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2V0dGluZ3Nba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCBmaWVsZHMgd2l0aCBoaWRkZW4gcGFzc3dvcmQgaW5kaWNhdG9yXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYXNzd29yZEZpZWxkcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBIaWRlIGFjdHVhbCBwYXNzd29yZHMgYW5kIHNob3cgaGlkZGVuIGluZGljYXRvclxuICAgICAgICBpZiAoc2V0dGluZ3MuV2ViQWRtaW5QYXNzd29yZCAmJiBzZXR0aW5ncy5XZWJBZG1pblBhc3N3b3JkICE9PSAnJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChzZXR0aW5ncy5TU0hQYXNzd29yZCAmJiBzZXR0aW5ncy5TU0hQYXNzd29yZCAhPT0gJycpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgQVBJIGVycm9yIG1lc3NhZ2VzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG1lc3NhZ2VzIC0gRXJyb3IgbWVzc2FnZXMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBzaG93QXBpRXJyb3IobWVzc2FnZXMpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2VzLmVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBBcnJheS5pc0FycmF5KG1lc3NhZ2VzLmVycm9yKSBcbiAgICAgICAgICAgICAgICA/IG1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgXG4gICAgICAgICAgICAgICAgOiBtZXNzYWdlcy5lcnJvcjtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHdhcm5pbmdzIGZvciBkZWZhdWx0IHBhc3N3b3Jkc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB2YWxpZGF0aW9uIC0gUGFzc3dvcmQgdmFsaWRhdGlvbiByZXN1bHRzIGZyb20gQVBJXG4gICAgICovXG4gICAgc2hvd0RlZmF1bHRQYXNzd29yZFdhcm5pbmdzKHZhbGlkYXRpb24pIHtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBwYXNzd29yZC12YWxpZGF0ZSBtZXNzYWdlcyBmaXJzdFxuICAgICAgICAkKCcucGFzc3dvcmQtdmFsaWRhdGUnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgd2FybmluZyBmb3IgZGVmYXVsdCBXZWIgQWRtaW4gcGFzc3dvcmRcbiAgICAgICAgaWYgKHZhbGlkYXRpb24uaXNEZWZhdWx0V2ViUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIHBhc3N3b3JkIGZpZWxkcyBncm91cCAtIHRyeSBtdWx0aXBsZSBzZWxlY3RvcnNcbiAgICAgICAgICAgIGxldCAkd2ViUGFzc3dvcmRGaWVsZHMgPSAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLmNsb3Nlc3QoJy50d28uZmllbGRzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkd2ViUGFzc3dvcmRGaWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IGFsdGVybmF0aXZlIHNlbGVjdG9yIGlmIHRoZSBmaXJzdCBvbmUgZG9lc24ndCB3b3JrXG4gICAgICAgICAgICAgICAgJHdlYlBhc3N3b3JkRmllbGRzID0gJCgnI1dlYkFkbWluUGFzc3dvcmQnKS5wYXJlbnQoKS5wYXJlbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCR3ZWJQYXNzd29yZEZpZWxkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgaWNvbiBtZXNzYWdlIHBhc3N3b3JkLXZhbGlkYXRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19TZXRQYXNzd29yZCB8fCAnU2VjdXJpdHkgV2FybmluZyd9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfU2V0UGFzc3dvcmRJbmZvIHx8ICdZb3UgYXJlIHVzaW5nIHRoZSBkZWZhdWx0IHBhc3N3b3JkLiBQbGVhc2UgY2hhbmdlIGl0IGZvciBzZWN1cml0eS4nfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluc2VydCB3YXJuaW5nIGJlZm9yZSB0aGUgcGFzc3dvcmQgZmllbGRzXG4gICAgICAgICAgICAgICAgJHdlYlBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgd2FybmluZyBmb3IgZGVmYXVsdCBTU0ggcGFzc3dvcmRcbiAgICAgICAgaWYgKHZhbGlkYXRpb24uaXNEZWZhdWx0U1NIUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIFNTSCBwYXNzd29yZCBsb2dpbiBpcyBlbmFibGVkXG4gICAgICAgICAgICBjb25zdCBzc2hQYXNzd29yZERpc2FibGVkID0gJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghc3NoUGFzc3dvcmREaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHMgZ3JvdXBcbiAgICAgICAgICAgICAgICBsZXQgJHNzaFBhc3N3b3JkRmllbGRzID0gJCgnI1NTSFBhc3N3b3JkJykuY2xvc2VzdCgnLnR3by5maWVsZHMnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJHNzaFBhc3N3b3JkRmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgYWx0ZXJuYXRpdmUgc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzID0gJCgnI1NTSFBhc3N3b3JkJykucGFyZW50KCkucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkc3NoUGFzc3dvcmRGaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgd2FybmluZyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIGljb24gbWVzc2FnZSBwYXNzd29yZC12YWxpZGF0ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfU2V0UGFzc3dvcmQgfHwgJ1NlY3VyaXR5IFdhcm5pbmcnfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5nc19TZXRQYXNzd29yZEluZm8gfHwgJ1lvdSBhcmUgdXNpbmcgdGhlIGRlZmF1bHQgcGFzc3dvcmQuIFBsZWFzZSBjaGFuZ2UgaXQgZm9yIHNlY3VyaXR5Lid9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgd2FybmluZyBiZWZvcmUgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgJHNzaFBhc3N3b3JkRmllbGRzLmJlZm9yZSh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFuZCBsb2FkIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggZGF0YSwgc2ltaWxhciB0byBJVlIgaW1wbGVtZW50YXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNvdW5kRmlsZVZhbHVlcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBJbml0aWFsaXplIGluY29taW5nIGFubm91bmNlbWVudCBzZWxlY3RvciB3aXRoIGRhdGEgKGZvbGxvd2luZyBJVlIgcGF0dGVybilcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4nLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBzZXR0aW5nc1xuICAgICAgICAgICAgLy8g4p2MIE5PIG9uQ2hhbmdlIG5lZWRlZCAtIGNvbXBsZXRlIGF1dG9tYXRpb24gYnkgYmFzZSBjbGFzc1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3V0Z29pbmcgYW5ub3VuY2VtZW50IHNlbGVjdG9yIHdpdGggZGF0YSAoZm9sbG93aW5nIElWUiBwYXR0ZXJuKSAgXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ1BCWFJlY29yZEFubm91bmNlbWVudE91dCcsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHNldHRpbmdzXG4gICAgICAgICAgICAvLyDinYwgTk8gb25DaGFuZ2UgbmVlZGVkIC0gY29tcGxldGUgYXV0b21hdGlvbiBieSBiYXNlIGNsYXNzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBhbmQgdXBkYXRlIGNvZGVjIHRhYmxlcyB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb2RlY3MgLSBBcnJheSBvZiBjb2RlYyBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcykge1xuICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBjb2RlYyBzdGF0ZSBmb3IgY29tcGFyaXNvblxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkub3JpZ2luYWxDb2RlY1N0YXRlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBTZXBhcmF0ZSBhdWRpbyBhbmQgdmlkZW8gY29kZWNzXG4gICAgICAgIGNvbnN0IGF1ZGlvQ29kZWNzID0gY29kZWNzLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ2F1ZGlvJykuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICBjb25zdCB2aWRlb0NvZGVjcyA9IGNvZGVjcy5maWx0ZXIoYyA9PiBjLnR5cGUgPT09ICd2aWRlbycpLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIGF1ZGlvIGNvZGVjcyB0YWJsZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYnVpbGRDb2RlY1RhYmxlKGF1ZGlvQ29kZWNzLCAnYXVkaW8nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHZpZGVvIGNvZGVjcyB0YWJsZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYnVpbGRDb2RlY1RhYmxlKHZpZGVvQ29kZWNzLCAndmlkZW8nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhpZGUgbG9hZGVycyBhbmQgc2hvdyB0YWJsZXNcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy1sb2FkZXIsICN2aWRlby1jb2RlY3MtbG9hZGVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlLCAjdmlkZW8tY29kZWNzLXRhYmxlJykuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkcmFnIGFuZCBkcm9wIGZvciByZW9yZGVyaW5nXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ29kZWNEcmFnRHJvcCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgY29kZWMgdGFibGUgcm93cyBmcm9tIGRhdGFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb2RlY3MgLSBBcnJheSBvZiBjb2RlYyBvYmplY3RzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSAnYXVkaW8nIG9yICd2aWRlbydcbiAgICAgKi9cbiAgICBidWlsZENvZGVjVGFibGUoY29kZWNzLCB0eXBlKSB7XG4gICAgICAgIGNvbnN0ICR0YWJsZUJvZHkgPSAkKGAjJHt0eXBlfS1jb2RlY3MtdGFibGUgdGJvZHlgKTtcbiAgICAgICAgJHRhYmxlQm9keS5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgY29kZWNzLmZvckVhY2goKGNvZGVjLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgc3RhdGUgZm9yIGNoYW5nZSBkZXRlY3Rpb25cbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGVbY29kZWMubmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4LFxuICAgICAgICAgICAgICAgIGRpc2FibGVkOiBjb2RlYy5kaXNhYmxlZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRhYmxlIHJvd1xuICAgICAgICAgICAgY29uc3QgaXNEaXNhYmxlZCA9IGNvZGVjLmRpc2FibGVkID09PSB0cnVlIHx8IGNvZGVjLmRpc2FibGVkID09PSAnMScgfHwgY29kZWMuZGlzYWJsZWQgPT09IDE7XG4gICAgICAgICAgICBjb25zdCBjaGVja2VkID0gIWlzRGlzYWJsZWQgPyAnY2hlY2tlZCcgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgcm93SHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8dHIgY2xhc3M9XCJjb2RlYy1yb3dcIiBpZD1cImNvZGVjLSR7Y29kZWMubmFtZX1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7aW5kZXh9XCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29kZWMtbmFtZT1cIiR7Y29kZWMubmFtZX1cIlxuICAgICAgICAgICAgICAgICAgICBkYXRhLW9yaWdpbmFsLXByaW9yaXR5PVwiJHtpbmRleH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY29sbGFwc2luZyBkcmFnSGFuZGxlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNvcnQgZ3JleSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGNvZGVjc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cImNvZGVjXyR7Y29kZWMubmFtZX1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtjaGVja2VkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJpbmRleD1cIjBcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJoaWRkZW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPVwiY29kZWNfJHtjb2RlYy5uYW1lfVwiPiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY29kZWMuZGVzY3JpcHRpb24gfHwgY29kZWMubmFtZSl9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkdGFibGVCb2R5LmFwcGVuZChyb3dIdG1sKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94ZXMgZm9yIHRoZSBuZXcgcm93c1xuICAgICAgICAkdGFibGVCb2R5LmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB3aGVuIGNvZGVjIGlzIGVuYWJsZWQvZGlzYWJsZWRcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcmFnIGFuZCBkcm9wIGZvciBjb2RlYyB0YWJsZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ29kZWNEcmFnRHJvcCgpIHtcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSwgI3ZpZGVvLWNvZGVjcy10YWJsZScpLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJyxcbiAgICAgICAgICAgIG9uRHJvcDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgd2hlbiBjb2RlY3MgYXJlIHJlb3JkZXJlZFxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2VydGlmaWNhdGUgZmllbGQgZGlzcGxheSBvbmx5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBXRUJIVFRQU1B1YmxpY0tleSBmaWVsZCBvbmx5XG4gICAgICAgIGNvbnN0ICRjZXJ0UHViS2V5RmllbGQgPSAkKCcjV0VCSFRUUFNQdWJsaWNLZXknKTtcbiAgICAgICAgaWYgKCRjZXJ0UHViS2V5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsVmFsdWUgPSAkY2VydFB1YktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRjZXJ0UHViS2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBjZXJ0aWZpY2F0ZSBpbmZvIGlmIGF2YWlsYWJsZSBmcm9tIGRhdGEgYXR0cmlidXRlXG4gICAgICAgICAgICBjb25zdCBjZXJ0SW5mbyA9ICRjZXJ0UHViS2V5RmllbGQuZGF0YSgnY2VydC1pbmZvJykgfHwge307XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50cyBmb3IgdGhpcyBmaWVsZCBvbmx5XG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWRpc3BsYXksIC5jZXJ0LWVkaXQtZm9ybScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZnVsbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIG1lYW5pbmdmdWwgZGlzcGxheSB0ZXh0IGZyb20gY2VydGlmaWNhdGUgaW5mb1xuICAgICAgICAgICAgICAgIGxldCBkaXNwbGF5VGV4dCA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mbyAmJiAhY2VydEluZm8uZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBzdWJqZWN0L2RvbWFpblxuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uc3ViamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg8J+TnCAke2NlcnRJbmZvLnN1YmplY3R9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBpc3N1ZXIgaWYgbm90IHNlbGYtc2lnbmVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc3N1ZXIgJiYgIWNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGBieSAke2NlcnRJbmZvLmlzc3Vlcn1gKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5pc19zZWxmX3NpZ25lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaCgnKFNlbGYtc2lnbmVkKScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgdmFsaWRpdHkgZGF0ZXNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLnZhbGlkX3RvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKdjCBFeHBpcmVkICR7Y2VydEluZm8udmFsaWRfdG99YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5IDw9IDMwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4pqg77iPIEV4cGlyZXMgaW4gJHtjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeX0gZGF5c2ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDinIUgVmFsaWQgdW50aWwgJHtjZXJ0SW5mby52YWxpZF90b31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheVRleHQgPSBwYXJ0cy5qb2luKCcgfCAnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byB0cnVuY2F0ZWQgY2VydGlmaWNhdGVcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheVRleHQgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudHJ1bmNhdGVDZXJ0aWZpY2F0ZShmdWxsVmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBvcmlnaW5hbCBmaWVsZFxuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBzdGF0dXMgY29sb3IgY2xhc3MgYmFzZWQgb24gY2VydGlmaWNhdGUgc3RhdHVzXG4gICAgICAgICAgICAgICAgbGV0IHN0YXR1c0NsYXNzID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnZXJyb3InO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MgPSAnd2FybmluZyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aW9uIGlucHV0IGZsdWlkIGNlcnQtZGlzcGxheSAke3N0YXR1c0NsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGRpc3BsYXlUZXh0KX1cIiByZWFkb25seSBjbGFzcz1cInRydW5jYXRlZC1kaXNwbGF5XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBjb3B5LWJ0blwiIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGZ1bGxWYWx1ZSl9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJiYXNpY1wiIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5Q2VydCB8fCAnQ29weSBjZXJ0aWZpY2F0ZSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjb3B5IGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGluZm8tY2VydC1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ2VydEluZm8gfHwgJ0NlcnRpZmljYXRlIGRldGFpbHMnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZWRpdC1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdCB8fCAnRWRpdCBjZXJ0aWZpY2F0ZSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJlZGl0IGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGRlbGV0ZS1jZXJ0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEZWxldGUgfHwgJ0RlbGV0ZSBjZXJ0aWZpY2F0ZSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ0cmFzaCBpY29uIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgJHtjZXJ0SW5mbyAmJiAhY2VydEluZm8uZXJyb3IgPyBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucmVuZGVyQ2VydGlmaWNhdGVEZXRhaWxzKGNlcnRJbmZvKSA6ICcnfVxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZm9ybSBjZXJ0LWVkaXQtZm9ybVwiIHN0eWxlPVwiZGlzcGxheTpub25lO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGlkPVwiV0VCSFRUUFNQdWJsaWNLZXlfZWRpdFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dzPVwiMTBcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCIke2dsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVB1YmxpY0NlcnQgfHwgJ1Bhc3RlIHB1YmxpYyBjZXJ0aWZpY2F0ZSBoZXJlLi4uJ31cIj4ke2Z1bGxWYWx1ZX08L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbWluaSBidXR0b25zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIHBvc2l0aXZlIGJ1dHRvbiBzYXZlLWNlcnQtYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuYnRfU2F2ZSB8fCAnU2F2ZSd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBjYW5jZWwtY2VydC1idG5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjbG9zZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5idF9DYW5jZWwgfHwgJ0NhbmNlbCd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGluZm8gYnV0dG9uIC0gdG9nZ2xlIGRldGFpbHMgZGlzcGxheVxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmluZm8tY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGRldGFpbHMgPSAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWRldGFpbHMnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRkZXRhaWxzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGRldGFpbHMuc2xpZGVUb2dnbGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBlZGl0IGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmVkaXQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1lZGl0LWZvcm0nKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHVibGljS2V5X2VkaXQnKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnNhdmUtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSAkY29udGFpbmVyLmZpbmQoJyNXRUJIVFRQU1B1YmxpY0tleV9lZGl0JykudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIG9yaWdpbmFsIGhpZGRlbiBmaWVsZFxuICAgICAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLnZhbChuZXdWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBvbmx5IHRoZSBjZXJ0aWZpY2F0ZSBmaWVsZCBkaXNwbGF5IHdpdGggbmV3IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBjYW5jZWwgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2FuY2VsLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZWRpdC1mb3JtJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWRpc3BsYXknKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGRlbGV0ZSBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5kZWxldGUtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBjZXJ0aWZpY2F0ZVxuICAgICAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBvbmx5IHRoZSBjZXJ0aWZpY2F0ZSBmaWVsZCB0byBzaG93IGVtcHR5IGZpZWxkXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJ1tkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGNsaXBib2FyZCBmb3IgbmV3IGJ1dHRvbnNcbiAgICAgICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZCkge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDbGlwYm9hcmQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG9yaWdpbmFsIGZpZWxkIGZvciBpbnB1dCB3aXRoIHByb3BlciBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQdWJsaWNDZXJ0IHx8ICdQYXN0ZSBwdWJsaWMgY2VydGlmaWNhdGUgaGVyZS4uLicpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQuYXR0cigncm93cycsICcxMCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjaGFuZ2UgZXZlbnRzIHRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5vZmYoJ2lucHV0LmNlcnQgY2hhbmdlLmNlcnQga2V5dXAuY2VydCcpLm9uKCdpbnB1dC5jZXJ0IGNoYW5nZS5jZXJ0IGtleXVwLmNlcnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgZGlzcGxheSBmb3IgU1NIIGtleXMgYW5kIGNlcnRpZmljYXRlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMoKSB7XG4gICAgICAgIC8vIEhhbmRsZSBTU0hfSURfUlNBX1BVQiBmaWVsZFxuICAgICAgICBjb25zdCAkc3NoUHViS2V5RmllbGQgPSAkKCcjU1NIX0lEX1JTQV9QVUInKTtcbiAgICAgICAgaWYgKCRzc2hQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRzc2hQdWJLZXlGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkc3NoUHViS2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc3NoLWtleS1kaXNwbGF5LCAuZnVsbC1kaXNwbGF5JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgY3JlYXRlIGRpc3BsYXkgaWYgdGhlcmUncyBhIHZhbHVlXG4gICAgICAgICAgICBpZiAoZnVsbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRydW5jYXRlZCBkaXNwbGF5XG4gICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnRydW5jYXRlU1NIS2V5KGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgb3JpZ2luYWwgZmllbGRcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aW9uIGlucHV0IGZsdWlkIHNzaC1rZXktZGlzcGxheVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgdmFsdWU9XCIke3RydW5jYXRlZH1cIiByZWFkb25seSBjbGFzcz1cInRydW5jYXRlZC1kaXNwbGF5XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBjb3B5LWJ0blwiIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGZ1bGxWYWx1ZSl9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFyaWF0aW9uPVwiYmFzaWNcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weUtleSB8fCAnQ29weSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjb3B5IGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGV4cGFuZC1idG5cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEV4cGFuZCB8fCAnU2hvdyBmdWxsIGtleSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleHBhbmQgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgY2xhc3M9XCJmdWxsLWRpc3BsYXlcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIiByZWFkb25seT4ke2Z1bGxWYWx1ZX08L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgZXhwYW5kL2NvbGxhcHNlXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5leHBhbmQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZnVsbERpc3BsYXkgPSAkY29udGFpbmVyLmZpbmQoJy5mdWxsLWRpc3BsYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkdHJ1bmNhdGVkRGlzcGxheSA9ICRjb250YWluZXIuZmluZCgnLnNzaC1rZXktZGlzcGxheScpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJCh0aGlzKS5maW5kKCdpJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRmdWxsRGlzcGxheS5pcygnOnZpc2libGUnKSkge1xuICAgICAgICAgICAgICAgICAgICAkZnVsbERpc3BsYXkuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkdHJ1bmNhdGVkRGlzcGxheS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdjb21wcmVzcycpLmFkZENsYXNzKCdleHBhbmQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZnVsbERpc3BsYXkuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkdHJ1bmNhdGVkRGlzcGxheS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleHBhbmQnKS5hZGRDbGFzcygnY29tcHJlc3MnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgbmV3IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJ1tkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgYXMgcmVhZC1vbmx5ICh0aGlzIGlzIGEgc3lzdGVtLWdlbmVyYXRlZCBrZXkpXG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuYXR0cigncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUuZ3NfTm9TU0hQdWJsaWNLZXkgfHwgJ05vIFNTSCBwdWJsaWMga2V5IGdlbmVyYXRlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgV0VCSFRUUFNQdWJsaWNLZXkgZmllbGQgLSB1c2UgZGVkaWNhdGVkIG1ldGhvZFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBXRUJIVFRQU1ByaXZhdGVLZXkgZmllbGQgKHdyaXRlLW9ubHkgd2l0aCBwYXNzd29yZCBtYXNraW5nKVxuICAgICAgICBjb25zdCAkY2VydFByaXZLZXlGaWVsZCA9ICQoJyNXRUJIVFRQU1ByaXZhdGVLZXknKTtcbiAgICAgICAgaWYgKCRjZXJ0UHJpdktleUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRjZXJ0UHJpdktleUZpZWxkLnBhcmVudCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIGRpc3BsYXkgZWxlbWVudHNcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnByaXZhdGUta2V5LXNldCwgI1dFQkhUVFBTUHJpdmF0ZUtleV9uZXcnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcHJpdmF0ZSBrZXkgZXhpc3RzIChwYXNzd29yZCBtYXNraW5nIGxvZ2ljKVxuICAgICAgICAgICAgLy8gVGhlIGZpZWxkIHdpbGwgY29udGFpbiAneHh4eHh4eCcgaWYgYSBwcml2YXRlIGtleSBpcyBzZXRcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRjZXJ0UHJpdktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgaGFzVmFsdWUgPSBjdXJyZW50VmFsdWUgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGhhc1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSBvcmlnaW5hbCBmaWVsZCBhbmQgc2hvdyBzdGF0dXMgbWVzc2FnZVxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwbGF5SHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZSBwcml2YXRlLWtleS1zZXRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwibG9jayBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmdzX1ByaXZhdGVLZXlJc1NldCB8fCAnUHJpdmF0ZSBrZXkgaXMgY29uZmlndXJlZCd9IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJyZXBsYWNlLWtleS1saW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfUmVwbGFjZSB8fCAnUmVwbGFjZSd9PC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGlkPVwiV0VCSFRUUFNQcml2YXRlS2V5X25ld1wiIG5hbWU9XCJXRUJIVFRQU1ByaXZhdGVLZXlcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M9XCIxMFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQcml2YXRlS2V5IHx8ICdQYXN0ZSBwcml2YXRlIGtleSBoZXJlLi4uJ31cIj48L3RleHRhcmVhPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSByZXBsYWNlIGxpbmtcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5yZXBsYWNlLWtleS1saW5rJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnByaXZhdGUta2V5LXNldCcpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJG5ld0ZpZWxkID0gJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQcml2YXRlS2V5X25ldycpO1xuICAgICAgICAgICAgICAgICAgICAkbmV3RmllbGQuc2hvdygpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgaGlkZGVuIHBhc3N3b3JkIHZhbHVlIHNvIHdlIGNhbiBzZXQgYSBuZXcgb25lXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBCaW5kIGNoYW5nZSBldmVudCB0byB1cGRhdGUgaGlkZGVuIGZpZWxkIGFuZCBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgJG5ld0ZpZWxkLm9uKCdpbnB1dCBjaGFuZ2Uga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgb3JpZ2luYWwgaGlkZGVuIGZpZWxkIHdpdGggbmV3IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC52YWwoJG5ld0ZpZWxkLnZhbCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb24gY2hlY2tcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG9yaWdpbmFsIGZpZWxkIGZvciBpbnB1dCB3aXRoIHByb3BlciBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVByaXZhdGVLZXkgfHwgJ1Bhc3RlIHByaXZhdGUga2V5IGhlcmUuLi4nKTtcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5hdHRyKCdyb3dzJywgJzEwJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNoYW5nZSBldmVudHMgdHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5vZmYoJ2lucHV0LnByaXYgY2hhbmdlLnByaXYga2V5dXAucHJpdicpLm9uKCdpbnB1dC5wcml2IGNoYW5nZS5wcml2IGtleXVwLnByaXYnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZnVuY3Rpb25hbGl0eSBmb3IgY29weSBidXR0b25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNsaXBib2FyZCgpIHtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcuY29weS1idG4nKTtcbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUudHJpZ2dlcik7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbEljb24gPSAkYnRuLmZpbmQoJ2knKS5hdHRyKCdjbGFzcycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkYnRuLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKCdjaGVjayBpY29uJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkYnRuLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKG9yaWdpbmFsSWNvbik7XG4gICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgc2VsZWN0aW9uXG4gICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5vbignZXJyb3InLCAoKSA9PiB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmdzX0NvcHlGYWlsZWQgfHwgJ0ZhaWxlZCB0byBjb3B5IHRvIGNsaXBib2FyZCcpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRydW5jYXRlIFNTSCBrZXkgZm9yIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gRnVsbCBTU0gga2V5XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUcnVuY2F0ZWQga2V5XG4gICAgICovXG4gICAgdHJ1bmNhdGVTU0hLZXkoa2V5KSB7XG4gICAgICAgIGlmICgha2V5IHx8IGtleS5sZW5ndGggPCA1MCkge1xuICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJyAnKTtcbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICBjb25zdCBrZXlUeXBlID0gcGFydHNbMF07XG4gICAgICAgICAgICBjb25zdCBrZXlEYXRhID0gcGFydHNbMV07XG4gICAgICAgICAgICBjb25zdCBjb21tZW50ID0gcGFydHMuc2xpY2UoMikuam9pbignICcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5RGF0YS5sZW5ndGggPiA0MCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZCA9IGtleURhdGEuc3Vic3RyaW5nKDAsIDIwKSArICcuLi4nICsga2V5RGF0YS5zdWJzdHJpbmcoa2V5RGF0YS5sZW5ndGggLSAxNSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke2tleVR5cGV9ICR7dHJ1bmNhdGVkfSAke2NvbW1lbnR9YC50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUcnVuY2F0ZSBjZXJ0aWZpY2F0ZSBmb3IgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjZXJ0IC0gRnVsbCBjZXJ0aWZpY2F0ZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVHJ1bmNhdGVkIGNlcnRpZmljYXRlIGluIHNpbmdsZSBsaW5lIGZvcm1hdFxuICAgICAqL1xuICAgIHRydW5jYXRlQ2VydGlmaWNhdGUoY2VydCkge1xuICAgICAgICBpZiAoIWNlcnQgfHwgY2VydC5sZW5ndGggPCAxMDApIHtcbiAgICAgICAgICAgIHJldHVybiBjZXJ0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsaW5lcyA9IGNlcnQuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEV4dHJhY3QgZmlyc3QgYW5kIGxhc3QgbWVhbmluZ2Z1bCBsaW5lc1xuICAgICAgICBjb25zdCBmaXJzdExpbmUgPSBsaW5lc1swXSB8fCAnJztcbiAgICAgICAgY29uc3QgbGFzdExpbmUgPSBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBjZXJ0aWZpY2F0ZXMsIHNob3cgYmVnaW4gYW5kIGVuZCBtYXJrZXJzXG4gICAgICAgIGlmIChmaXJzdExpbmUuaW5jbHVkZXMoJ0JFR0lOIENFUlRJRklDQVRFJykpIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtmaXJzdExpbmV9Li4uJHtsYXN0TGluZX1gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3Igb3RoZXIgZm9ybWF0cywgdHJ1bmNhdGUgdGhlIGNvbnRlbnRcbiAgICAgICAgY29uc3QgY2xlYW5DZXJ0ID0gY2VydC5yZXBsYWNlKC9cXG4vZywgJyAnKS50cmltKCk7XG4gICAgICAgIGlmIChjbGVhbkNlcnQubGVuZ3RoID4gODApIHtcbiAgICAgICAgICAgIHJldHVybiBjbGVhbkNlcnQuc3Vic3RyaW5nKDAsIDQwKSArICcuLi4nICsgY2xlYW5DZXJ0LnN1YnN0cmluZyhjbGVhbkNlcnQubGVuZ3RoIC0gMzApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2xlYW5DZXJ0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgZm9yIHNhZmUgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBtYXAgPSB7XG4gICAgICAgICAgICAnJic6ICcmYW1wOycsXG4gICAgICAgICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICAgICAgICc+JzogJyZndDsnLFxuICAgICAgICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICAgICAgICBcIidcIjogJyYjMDM5OydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZSgvWyY8PlwiJ10vZywgbSA9PiBtYXBbbV0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdywgaGlkZSBzc2ggcGFzc3dvcmQgc2VnbWVudCBhY2NvcmRpbmcgdG8gdGhlIHZhbHVlIG9mIHVzZSBTU0ggcGFzc3dvcmQgY2hlY2tib3guXG4gICAgICovXG4gICAgc2hvd0hpZGVTU0hQYXNzd29yZCgpe1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZFNlZ21lbnQuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZFNlZ21lbnQuc2hvdygpO1xuICAgICAgICB9XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogUHJlcGFyZXMgZGF0YSBmb3IgUkVTVCBBUEkgc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbiB1cCB1bm5lY2Vzc2FyeSBmaWVsZHMgYmVmb3JlIHNlbmRpbmdcbiAgICAgICAgY29uc3QgZmllbGRzVG9SZW1vdmUgPSBbXG4gICAgICAgICAgICAnZGlycnR5JyxcbiAgICAgICAgICAgICdkZWxldGVBbGxJbnB1dCcsXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgY29kZWNfKiBmaWVsZHMgKHRoZXkncmUgcmVwbGFjZWQgd2l0aCB0aGUgY29kZWNzIGFycmF5KVxuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdjb2RlY18nKSB8fCBmaWVsZHNUb1JlbW92ZS5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdCBjb2RlYyBkYXRhIC0gb25seSBpbmNsdWRlIGlmIGNoYW5nZWRcbiAgICAgICAgY29uc3QgYXJyQ29kZWNzID0gW107XG4gICAgICAgIGxldCBoYXNDb2RlY0NoYW5nZXMgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgYWxsIGNvZGVjIHJvd3NcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93LCAjdmlkZW8tY29kZWNzLXRhYmxlIC5jb2RlYy1yb3cnKS5lYWNoKChjdXJyZW50SW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29kZWNOYW1lID0gJChvYmopLmF0dHIoJ2RhdGEtY29kZWMtbmFtZScpO1xuICAgICAgICAgICAgaWYgKGNvZGVjTmFtZSAmJiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkub3JpZ2luYWxDb2RlY1N0YXRlW2NvZGVjTmFtZV0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGVbY29kZWNOYW1lXTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50RGlzYWJsZWQgPSAkKG9iaikuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHBvc2l0aW9uIG9yIGRpc2FibGVkIHN0YXRlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudEluZGV4ICE9PSBvcmlnaW5hbC5wcmlvcml0eSB8fCBjdXJyZW50RGlzYWJsZWQgIT09IG9yaWdpbmFsLmRpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc0NvZGVjQ2hhbmdlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGFyckNvZGVjcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogY29kZWNOYW1lLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogY3VycmVudERpc2FibGVkLFxuICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogY3VycmVudEluZGV4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9ubHkgaW5jbHVkZSBjb2RlY3MgaWYgdGhlcmUgd2VyZSBjaGFuZ2VzXG4gICAgICAgIGlmIChoYXNDb2RlY0NoYW5nZXMpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvZGVjcyA9IGFyckNvZGVjcztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogSGFuZGxlcyBSRVNUIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgJChcIiNlcnJvci1tZXNzYWdlc1wiKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZTogeyByZXN1bHQ6IGJvb2wsIGRhdGE6IHt9LCBtZXNzYWdlczoge30gfVxuICAgICAgICBpZiAoIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbChyZXNwb25zZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgZmllbGRzIHRvIGhpZGRlbiB2YWx1ZSBvbiBzdWNjZXNzXG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBwYXNzd29yZCB2YWxpZGF0aW9uIHdhcm5pbmdzIGFmdGVyIHN1Y2Nlc3NmdWwgc2F2ZVxuICAgICAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZGVsZXRlIGFsbCBjb25kaXRpb25zIGlmIG5lZWRlZFxuICAgICAgICBpZiAodHlwZW9mIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jaGVja0RlbGV0ZUNvbmRpdGlvbnMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBlcnJvciBtZXNzYWdlIEhUTUwgZnJvbSBSRVNUIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZSB3aXRoIGVycm9yIG1lc3NhZ2VzXG4gICAgICovXG4gICAgZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgY29uc3QgJGRpdiA9ICQoJzxkaXY+JywgeyBjbGFzczogJ3VpIG5lZ2F0aXZlIG1lc3NhZ2UnLCBpZDogJ2Vycm9yLW1lc3NhZ2VzJyB9KTtcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXIgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICdoZWFkZXInIH0pLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmdzX0Vycm9yU2F2ZVNldHRpbmdzKTtcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCRoZWFkZXIpO1xuICAgICAgICAgICAgY29uc3QgJHVsID0gJCgnPHVsPicsIHsgY2xhc3M6ICdsaXN0JyB9KTtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzU2V0ID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgYm90aCBlcnJvciBhbmQgdmFsaWRhdGlvbiBtZXNzYWdlIHR5cGVzXG4gICAgICAgICAgICBbJ2Vycm9yJywgJ3ZhbGlkYXRpb24nXS5mb3JFYWNoKG1zZ1R5cGUgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlcyA9IEFycmF5LmlzQXJyYXkocmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV0pIFxuICAgICAgICAgICAgICAgICAgICAgICAgPyByZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogW3Jlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdXTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzLmZvckVhY2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRleHRDb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGVycm9yID09PSAnb2JqZWN0JyAmJiBlcnJvci5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3IubWVzc2FnZV0gfHwgZXJyb3IubWVzc2FnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBnbG9iYWxUcmFuc2xhdGVbZXJyb3JdIHx8IGVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1lc3NhZ2VzU2V0Lmhhcyh0ZXh0Q29udGVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlc1NldC5hZGQodGV4dENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR1bC5hcHBlbmQoJCgnPGxpPicpLnRleHQodGV4dENvbnRlbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRkaXYuYXBwZW5kKCR1bCk7XG4gICAgICAgICAgICAkKCcjc3VibWl0YnV0dG9uJykuYmVmb3JlKCRkaXYpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHZhbGlkYXRpb24gcnVsZXMgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBpbml0UnVsZXMoKSB7XG4gICAgICAgIC8vIFNTSFBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M7XG4gICAgICAgIH0gZWxzZSBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZWJBZG1pblBhc3N3b3JkXG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBbXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5XZWJBZG1pblBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LndlYkFkbWluUGFzc3dvcmRSdWxlcztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgY2VydGlmaWNhdGUgZGV0YWlscyBIVE1MXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNlcnRJbmZvIC0gQ2VydGlmaWNhdGUgaW5mb3JtYXRpb24gb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgY2VydGlmaWNhdGUgZGV0YWlsc1xuICAgICAqL1xuICAgIHJlbmRlckNlcnRpZmljYXRlRGV0YWlscyhjZXJ0SW5mbykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwiY2VydC1kZXRhaWxzXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7IG1hcmdpbi10b3A6MTBweDtcIj4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGxpc3RcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gU3ViamVjdFxuICAgICAgICBpZiAoY2VydEluZm8uc3ViamVjdCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPlN1YmplY3Q6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uc3ViamVjdCl9PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSXNzdWVyXG4gICAgICAgIGlmIChjZXJ0SW5mby5pc3N1ZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5Jc3N1ZXI6PC9zdHJvbmc+ICR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoY2VydEluZm8uaXNzdWVyKX1gO1xuICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnIDxzcGFuIGNsYXNzPVwidWkgdGlueSBsYWJlbFwiPlNlbGYtc2lnbmVkPC9zcGFuPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGl0eSBwZXJpb2RcbiAgICAgICAgaWYgKGNlcnRJbmZvLnZhbGlkX2Zyb20gJiYgY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5WYWxpZDo8L3N0cm9uZz4gJHtjZXJ0SW5mby52YWxpZF9mcm9tfSB0byAke2NlcnRJbmZvLnZhbGlkX3RvfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV4cGlyeSBzdGF0dXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IHJlZCBsYWJlbFwiPkNlcnRpZmljYXRlIEV4cGlyZWQ8L3NwYW4+PC9kaXY+JztcbiAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgeWVsbG93IGxhYmVsXCI+RXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSBncmVlbiBsYWJlbFwiPlZhbGlkIGZvciAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzPC9zcGFuPjwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN1YmplY3QgQWx0ZXJuYXRpdmUgTmFtZXNcbiAgICAgICAgaWYgKGNlcnRJbmZvLnNhbiAmJiBjZXJ0SW5mby5zYW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPkFsdGVybmF0aXZlIE5hbWVzOjwvc3Ryb25nPic7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBsaXN0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDoxMHB4O1wiPic7XG4gICAgICAgICAgICBjZXJ0SW5mby5zYW4uZm9yRWFjaChzYW4gPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChzYW4pfTwvZGl2PmA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIGxpc3RcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2Ugc2VnbWVudFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBjZXJ0LWRldGFpbHNcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBBTUkvQUpBTSBkZXBlbmRlbmN5XG4gICAgICogQUpBTSByZXF1aXJlcyBBTUkgdG8gYmUgZW5hYmxlZCBzaW5jZSBpdCdzIGFuIEhUVFAgd3JhcHBlciBvdmVyIEFNSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVBTUlBSkFNRGVwZW5kZW5jeSgpIHtcbiAgICAgICAgY29uc3QgJGFtaUNoZWNrYm94ID0gJCgnI0FNSUVuYWJsZWQnKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBjb25zdCAkYWphbUNoZWNrYm94ID0gJCgnI0FKQU1FbmFibGVkJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYW1pQ2hlY2tib3gubGVuZ3RoID09PSAwIHx8ICRhamFtQ2hlY2tib3gubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZ1bmN0aW9uIHRvIHVwZGF0ZSBBSkFNIHN0YXRlIGJhc2VkIG9uIEFNSSBzdGF0ZVxuICAgICAgICBjb25zdCB1cGRhdGVBSkFNU3RhdGUgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc0FNSUVuYWJsZWQgPSAkYW1pQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFpc0FNSUVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBBTUkgaXMgZGlzYWJsZWQsIGRpc2FibGUgQUpBTSBhbmQgbWFrZSBpdCByZWFkLW9ubHlcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgdG9vbHRpcCB0byBleHBsYWluIHdoeSBpdCdzIGRpc2FibGVkXG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hdHRyKCdkYXRhLXRvb2x0aXAnLCBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTVJlcXVpcmVzQU1JIHx8ICdBSkFNIHJlcXVpcmVzIEFNSSB0byBiZSBlbmFibGVkJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBsZWZ0Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIEFNSSBpcyBlbmFibGVkLCBhbGxvdyBBSkFNIHRvIGJlIHRvZ2dsZWRcbiAgICAgICAgICAgICAgICAkYWphbUNoZWNrYm94LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRhamFtQ2hlY2tib3gucmVtb3ZlQXR0cignZGF0YS10b29sdGlwJyk7XG4gICAgICAgICAgICAgICAgJGFqYW1DaGVja2JveC5yZW1vdmVBdHRyKCdkYXRhLXBvc2l0aW9uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsIHN0YXRlXG4gICAgICAgIHVwZGF0ZUFKQU1TdGF0ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuIGZvciBBTUkgY2hlY2tib3ggY2hhbmdlcyB1c2luZyBldmVudCBkZWxlZ2F0aW9uXG4gICAgICAgIC8vIFRoaXMgd29uJ3Qgb3ZlcnJpZGUgZXhpc3RpbmcgaGFuZGxlcnNcbiAgICAgICAgJCgnI0FNSUVuYWJsZWQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB1cGRhdGVBSkFNU3RhdGUoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgUEJYTGFuZ3VhZ2UgY2hhbmdlIGRldGVjdGlvbiBmb3IgcmVzdGFydCB3YXJuaW5nXG4gICAgICogU2hvd3MgcmVzdGFydCB3YXJuaW5nIG9ubHkgd2hlbiB0aGUgbGFuZ3VhZ2UgdmFsdWUgY2hhbmdlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmcoKSB7XG4gICAgICAgIGNvbnN0ICRsYW5ndWFnZURyb3Bkb3duID0gJCgnI1BCWExhbmd1YWdlJyk7XG4gICAgICAgIGNvbnN0ICRyZXN0YXJ0V2FybmluZyA9ICQoJyNyZXN0YXJ0LXdhcm5pbmctUEJYTGFuZ3VhZ2UnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHZhbHVlXG4gICAgICAgIGxldCBvcmlnaW5hbFZhbHVlID0gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBvcmlnaW5hbCB2YWx1ZSBhZnRlciBkYXRhIGxvYWRzXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdHZW5lcmFsU2V0dGluZ3MuZGF0YUxvYWRlZCcsICgpID0+IHtcbiAgICAgICAgICAgIG9yaWdpbmFsVmFsdWUgPSAkbGFuZ3VhZ2VEcm9wZG93bi52YWwoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZHJvcGRvd24gY2hhbmdlIGV2ZW50XG4gICAgICAgICRsYW5ndWFnZURyb3Bkb3duLmNsb3Nlc3QoJy5kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHdhcm5pbmcgaWYgdmFsdWUgY2hhbmdlZCBmcm9tIG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsVmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IG9yaWdpbmFsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJlc3RhcnRXYXJuaW5nLnRyYW5zaXRpb24oJ2ZhZGUgaW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkcmVzdGFydFdhcm5pbmcudHJhbnNpdGlvbignZmFkZSBvdXQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSBkZXRlY3Rpb25cbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBSRVNUIEFQSSBtb2RlXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gR2VuZXJhbFNldHRpbmdzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVNldHRpbmdzJztcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb24gZm9yIGNsZWFuZXIgQVBJIHJlcXVlc3RzXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIE5vIHJlZGlyZWN0IGFmdGVyIHNhdmUgLSBzdGF5IG9uIHRoZSBzYW1lIHBhZ2VcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gbnVsbDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IG51bGw7XG4gICAgICAgIEZvcm0udXJsID0gYCNgO1xuICAgICAgICBcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBnZW5lcmFsU2V0dGluZ3MgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==