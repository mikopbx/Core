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
    // Initialize sound file selectors with HTML icons support

    generalSettingsModify.initializeSoundFileSelectors(); // Initialize the form

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
   * Initialize sound file selectors with HTML icons and change tracking
   * Note: The HTML structure is now provided by the playAddNewSoundWithIcons partial:
   * - Hidden input: <input type="hidden" id="PBXRecordAnnouncementIn" name="PBXRecordAnnouncementIn">
   * - Dropdown div: <div class="ui selection dropdown search PBXRecordAnnouncementIn-select">
   */
  initializeSoundFileSelectors: function initializeSoundFileSelectors() {
    // Initialize incoming announcement selector
    SoundFileSelector.init('PBXRecordAnnouncementIn', {
      category: 'custom',
      includeEmpty: true,
      onChange: function onChange() {
        Form.dataChanged();
      }
    }); // Initialize outgoing announcement selector

    SoundFileSelector.init('PBXRecordAnnouncementOut', {
      category: 'custom',
      includeEmpty: true,
      onChange: function onChange() {
        Form.dataChanged();
      }
    });
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
    var codecs = data.codecs || []; // Set form values using Fomantic UI form API

    generalSettingsModify.$formObj.form('set values', settings); // Handle special field types

    generalSettingsModify.populateSpecialFields(settings); // Load sound file values with representations

    generalSettingsModify.loadSoundFileValues(settings); // Update codec tables

    if (codecs.length > 0) {
      generalSettingsModify.updateCodecTables(codecs);
    } // Initialize password fields (hide actual passwords)


    generalSettingsModify.initializePasswordFields(settings); // Update SSH password visibility

    generalSettingsModify.showHideSSHPassword(); // Remove loading state

    generalSettingsModify.$formObj.removeClass('loading'); // Re-initialize form validation rules

    generalSettingsModify.initRules(); // Re-initialize dirty checking if enabled

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
   * Load sound file values with HTML representation
   * @param {object} settings - Settings data from API
   */
  loadSoundFileValues: function loadSoundFileValues(settings) {
    // Load incoming announcement sound file
    if (settings.PBXRecordAnnouncementIn) {
      var announcementInRepresent = settings.PBXRecordAnnouncementIn_Represent || settings.PBXRecordAnnouncementInRepresent;

      if (announcementInRepresent) {
        SoundFileSelector.setValue('PBXRecordAnnouncementIn', settings.PBXRecordAnnouncementIn, announcementInRepresent);
      } else {
        SoundFileSelector.setSelected('PBXRecordAnnouncementIn', settings.PBXRecordAnnouncementIn);
      }
    } // Load outgoing announcement sound file


    if (settings.PBXRecordAnnouncementOut) {
      var announcementOutRepresent = settings.PBXRecordAnnouncementOut_Represent || settings.PBXRecordAnnouncementOutRepresent;

      if (announcementOutRepresent) {
        SoundFileSelector.setValue('PBXRecordAnnouncementOut', settings.PBXRecordAnnouncementOut, announcementOutRepresent);
      } else {
        SoundFileSelector.setSelected('PBXRecordAnnouncementOut', settings.PBXRecordAnnouncementOut);
      }
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJkYXRhTG9hZGVkIiwidmFsaWRhdGVSdWxlcyIsInBieG5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUiLCJXZWJBZG1pblBhc3N3b3JkIiwiV2ViQWRtaW5QYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJTU0hQYXNzd29yZCIsIlNTSFBhc3N3b3JkUmVwZWF0IiwiZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCIsIldFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlIiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCIsIldFQkhUVFBTUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0IiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJBSkFNUG9ydCIsImdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlIiwiU0lQQXV0aFByZWZpeCIsImdzX1NJUEF1dGhQcmVmaXhJbnZhbGlkIiwid2ViQWRtaW5QYXNzd29yZFJ1bGVzIiwiZ3NfVmFsaWRhdGVFbXB0eVdlYlBhc3N3b3JkIiwiZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQiLCJ2YWx1ZSIsImdzX1Bhc3N3b3JkcyIsImdzX1Bhc3N3b3JkTm9Mb3dTaW12b2wiLCJnc19QYXNzd29yZE5vTnVtYmVycyIsImdzX1Bhc3N3b3JkTm9VcHBlclNpbXZvbCIsImFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcyIsImdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkIiwiZ3NfU1NIUGFzc3dvcmQiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcyIsImNsaXBib2FyZCIsImluaXRpYWxpemUiLCJsZW5ndGgiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJjb250ZXh0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJ2YWxpZGF0ZU9uSW5wdXQiLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJjaGVja09uTG9hZCIsInNzaFdpZGdldCIsIm9uIiwiaXNEaXNhYmxlZCIsImNoZWNrYm94IiwiaGlkZVdhcm5pbmdzIiwiZWxlbWVudHMiLCIkc2NvcmVTZWN0aW9uIiwiaGlkZSIsImNoZWNrUGFzc3dvcmQiLCJ2YWwiLCJpbml0UnVsZXMiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwibm90IiwiZHJvcGRvd24iLCJpbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3JzIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzIiwiaW5pdGlhbGl6ZUNsaXBib2FyZCIsInNob3dIaWRlU1NIUGFzc3dvcmQiLCJ3aW5kb3ciLCJldmVudCIsIm5hbWVUYWIiLCJHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmciLCJsb2FkRGF0YSIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJvbkNoYW5nZSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFkZENsYXNzIiwiY29uc29sZSIsImxvZyIsIkdlbmVyYWxTZXR0aW5nc0FQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsImRhdGEiLCJzZXR0aW5ncyIsInBvcHVsYXRlRm9ybSIsInBhc3N3b3JkVmFsaWRhdGlvbiIsInNldFRpbWVvdXQiLCJzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3MiLCJtZXNzYWdlcyIsImVycm9yIiwic2hvd0FwaUVycm9yIiwiY29kZWNzIiwiZm9ybSIsInBvcHVsYXRlU3BlY2lhbEZpZWxkcyIsImxvYWRTb3VuZEZpbGVWYWx1ZXMiLCJ1cGRhdGVDb2RlY1RhYmxlcyIsImluaXRpYWxpemVQYXNzd29yZEZpZWxkcyIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNzaEtleXNUYWJsZSIsImRvY3VtZW50IiwidHJpZ2dlciIsIldFQkhUVFBTUHVibGljS2V5X2luZm8iLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsIiRjaGVja2JveCIsImlzQ2hlY2tlZCIsIiRkcm9wZG93biIsImhhc0NsYXNzIiwiZXJyb3JNZXNzYWdlIiwiQXJyYXkiLCJpc0FycmF5Iiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwidmFsaWRhdGlvbiIsInJlbW92ZSIsImlzRGVmYXVsdFdlYlBhc3N3b3JkIiwiJHdlYlBhc3N3b3JkRmllbGRzIiwiY2xvc2VzdCIsIndhcm5pbmdIdG1sIiwiZ3NfU2V0UGFzc3dvcmQiLCJnc19TZXRQYXNzd29yZEluZm8iLCJiZWZvcmUiLCJpc0RlZmF1bHRTU0hQYXNzd29yZCIsInNzaFBhc3N3b3JkRGlzYWJsZWQiLCIkc3NoUGFzc3dvcmRGaWVsZHMiLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbiIsImFubm91bmNlbWVudEluUmVwcmVzZW50IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50SW5fUmVwcmVzZW50IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50SW5SZXByZXNlbnQiLCJzZXRWYWx1ZSIsInNldFNlbGVjdGVkIiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IiwiYW5ub3VuY2VtZW50T3V0UmVwcmVzZW50IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0X1JlcHJlc2VudCIsIlBCWFJlY29yZEFubm91bmNlbWVudE91dFJlcHJlc2VudCIsImF1ZGlvQ29kZWNzIiwiZmlsdGVyIiwiYyIsInNvcnQiLCJhIiwiYiIsInByaW9yaXR5IiwidmlkZW9Db2RlY3MiLCJidWlsZENvZGVjVGFibGUiLCJzaG93IiwiaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AiLCIkdGFibGVCb2R5IiwiZW1wdHkiLCJjb2RlYyIsImluZGV4IiwibmFtZSIsImRpc2FibGVkIiwiY2hlY2tlZCIsInJvd0h0bWwiLCJlc2NhcGVIdG1sIiwiZGVzY3JpcHRpb24iLCJhcHBlbmQiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkIiwiJGNlcnRQdWJLZXlGaWVsZCIsImZ1bGxWYWx1ZSIsIiRjb250YWluZXIiLCJjZXJ0SW5mbyIsImRpc3BsYXlUZXh0IiwicGFydHMiLCJzdWJqZWN0IiwicHVzaCIsImlzc3VlciIsImlzX3NlbGZfc2lnbmVkIiwidmFsaWRfdG8iLCJpc19leHBpcmVkIiwiZGF5c191bnRpbF9leHBpcnkiLCJ0cnVuY2F0ZUNlcnRpZmljYXRlIiwic3RhdHVzQ2xhc3MiLCJkaXNwbGF5SHRtbCIsImJ0X1Rvb2xUaXBDb3B5Q2VydCIsImJ0X1Rvb2xUaXBDZXJ0SW5mbyIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsInJlbmRlckNlcnRpZmljYXRlRGV0YWlscyIsImdzX1Bhc3RlUHVibGljQ2VydCIsImJ0X1NhdmUiLCJidF9DYW5jZWwiLCJlIiwicHJldmVudERlZmF1bHQiLCIkZGV0YWlscyIsInNsaWRlVG9nZ2xlIiwiZm9jdXMiLCJuZXdWYWx1ZSIsImNoZWNrVmFsdWVzIiwicG9wdXAiLCJkZXN0cm95IiwiYXR0ciIsIm9mZiIsIiRzc2hQdWJLZXlGaWVsZCIsInRydW5jYXRlZCIsInRydW5jYXRlU1NIS2V5IiwiYnRfVG9vbFRpcENvcHlLZXkiLCJidF9Ub29sVGlwRXhwYW5kIiwiJGZ1bGxEaXNwbGF5IiwiJHRydW5jYXRlZERpc3BsYXkiLCIkaWNvbiIsImlzIiwiZ3NfTm9TU0hQdWJsaWNLZXkiLCIkY2VydFByaXZLZXlGaWVsZCIsImN1cnJlbnRWYWx1ZSIsImhhc1ZhbHVlIiwiZ3NfUHJpdmF0ZUtleUlzU2V0IiwiZ3NfUmVwbGFjZSIsImdzX1Bhc3RlUHJpdmF0ZUtleSIsIiRuZXdGaWVsZCIsIkNsaXBib2FyZEpTIiwiJGJ0biIsIm9yaWdpbmFsSWNvbiIsImNsZWFyU2VsZWN0aW9uIiwiZ3NfQ29weUZhaWxlZCIsInNwbGl0Iiwia2V5VHlwZSIsImtleURhdGEiLCJjb21tZW50Iiwic2xpY2UiLCJzdWJzdHJpbmciLCJ0cmltIiwiY2VydCIsImxpbmVzIiwibGluZSIsImZpcnN0TGluZSIsImxhc3RMaW5lIiwiaW5jbHVkZXMiLCJjbGVhbkNlcnQiLCJyZXBsYWNlIiwidGV4dCIsIm1hcCIsIm0iLCJjYkJlZm9yZVNlbmRGb3JtIiwiZmllbGRzVG9SZW1vdmUiLCJzdGFydHNXaXRoIiwiYXJyQ29kZWNzIiwiaGFzQ29kZWNDaGFuZ2VzIiwiZWFjaCIsImN1cnJlbnRJbmRleCIsIm9iaiIsImNvZGVjTmFtZSIsIm9yaWdpbmFsIiwiY3VycmVudERpc2FibGVkIiwiY2JBZnRlclNlbmRGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsImdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbCIsImZhZGVPdXQiLCJnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwiLCJjaGVja0RlbGV0ZUNvbmRpdGlvbnMiLCIkZGl2IiwiaWQiLCIkaGVhZGVyIiwiZ3NfRXJyb3JTYXZlU2V0dGluZ3MiLCIkdWwiLCJtZXNzYWdlc1NldCIsIlNldCIsIm1zZ1R5cGUiLCJ0ZXh0Q29udGVudCIsIm1lc3NhZ2UiLCJoYXMiLCJhZGQiLCJodG1sIiwidmFsaWRfZnJvbSIsInNhbiIsIiRsYW5ndWFnZURyb3Bkb3duIiwiJHJlc3RhcnRXYXJuaW5nIiwib3JpZ2luYWxWYWx1ZSIsInRyYW5zaXRpb24iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJ1cmwiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBR0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEscUJBQXFCLEdBQUc7QUFDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsd0JBQUQsQ0FMZTs7QUFPMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUVELENBQUMsQ0FBQyxtQkFBRCxDQVhNOztBQWExQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxZQUFZLEVBQUVGLENBQUMsQ0FBQyxjQUFELENBakJXOztBQW1CMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsbUJBQW1CLEVBQUVILENBQUMsQ0FBQywyQkFBRCxDQUFELENBQStCSSxNQUEvQixDQUFzQyxXQUF0QyxDQXZCSzs7QUF5QjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG1CQUFtQixFQUFFTCxD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MkNUO0FBQ2JjLElBQUFBLElBQUksQ0FBQ2xHLFFBQUwsR0FBZ0JELHFCQUFxQixDQUFDQyxRQUF0QyxDQURhLENBR2I7O0FBQ0FrRyxJQUFBQSxJQUFJLENBQUM2TSxXQUFMLENBQWlCQyxPQUFqQixHQUEyQixJQUEzQjtBQUNBOU0sSUFBQUEsSUFBSSxDQUFDNk0sV0FBTCxDQUFpQkUsU0FBakIsR0FBNkIxTSxrQkFBN0I7QUFDQUwsSUFBQUEsSUFBSSxDQUFDNk0sV0FBTCxDQUFpQkcsVUFBakIsR0FBOEIsY0FBOUIsQ0FOYSxDQVFiOztBQUNBaE4sSUFBQUEsSUFBSSxDQUFDaU4sdUJBQUwsR0FBK0IsSUFBL0IsQ0FUYSxDQVdiOztBQUNBak4sSUFBQUEsSUFBSSxDQUFDa04sbUJBQUwsR0FBMkIsSUFBM0I7QUFDQWxOLElBQUFBLElBQUksQ0FBQ21OLG9CQUFMLEdBQTRCLElBQTVCO0FBQ0FuTixJQUFBQSxJQUFJLENBQUNvTixHQUFMO0FBRUFwTixJQUFBQSxJQUFJLENBQUNyRixhQUFMLEdBQXFCZCxxQkFBcUIsQ0FBQ2MsYUFBM0M7QUFDQXFGLElBQUFBLElBQUksQ0FBQ3lLLGdCQUFMLEdBQXdCNVEscUJBQXFCLENBQUM0USxnQkFBOUM7QUFDQXpLLElBQUFBLElBQUksQ0FBQ29MLGVBQUwsR0FBdUJ2UixxQkFBcUIsQ0FBQ3VSLGVBQTdDO0FBQ0FwTCxJQUFBQSxJQUFJLENBQUM1QyxVQUFMO0FBQ0g7QUFoNEN5QixDQUE5QixDLENBbTRDQTs7QUFDQXJELENBQUMsQ0FBQzZILFFBQUQsQ0FBRCxDQUFZeUwsS0FBWixDQUFrQixZQUFNO0FBQ3BCeFQsRUFBQUEscUJBQXFCLENBQUN1RCxVQUF0QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGFzc3dvcmRTY29yZSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSwgU291bmRGaWxlU2VsZWN0b3IsIEdlbmVyYWxTZXR0aW5nc0FQSSwgQ2xpcGJvYXJkSlMsIFBhc3N3b3JkV2lkZ2V0LCBQYXNzd29yZFZhbGlkYXRpb25BUEksIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyLCAkICovXG5cbi8qKlxuICogQSBtb2R1bGUgdG8gaGFuZGxlIG1vZGlmaWNhdGlvbiBvZiBnZW5lcmFsIHNldHRpbmdzLlxuICovXG5jb25zdCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBhZG1pbiBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR3ZWJBZG1pblBhc3N3b3JkOiAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZDogJCgnI1NTSFBhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgd2ViIHNzaCBwYXNzd29yZCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXNhYmxlU1NIUGFzc3dvcmQ6ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5wYXJlbnQoJy5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzc2hQYXNzd29yZFNlZ21lbnQ6ICQoJyNvbmx5LWlmLXBhc3N3b3JkLWVuYWJsZWQnKSxcblxuICAgIC8qKlxuICAgICAqIElmIHBhc3N3b3JkIHNldCwgaXQgd2lsbCBiZSBoaWRlZCBmcm9tIHdlYiB1aS5cbiAgICAgKi9cbiAgICBoaWRkZW5QYXNzd29yZDogJ3h4eHh4eHgnLFxuXG4gICAgLyoqXG4gICAgICogU291bmQgZmlsZSBmaWVsZCBJRHNcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHNvdW5kRmlsZUZpZWxkczoge1xuICAgICAgICBhbm5vdW5jZW1lbnRJbjogJ1BCWFJlY29yZEFubm91bmNlbWVudEluJyxcbiAgICAgICAgYW5ub3VuY2VtZW50T3V0OiAnUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0J1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogT3JpZ2luYWwgY29kZWMgc3RhdGUgZnJvbSBsYXN0IGxvYWRcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIG9yaWdpbmFsQ29kZWNTdGF0ZToge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogRmxhZyB0byB0cmFjayBpZiBkYXRhIGhhcyBiZWVuIGxvYWRlZCBmcm9tIEFQSVxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGRhdGFMb2FkZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7IC8vIGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzXG4gICAgICAgIHBieG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdQQlhOYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5UEJYTmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV2ViQWRtaW5QYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dlYkFkbWluUGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBXZWJBZG1pblBhc3N3b3JkUmVwZWF0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hdGNoW1dlYkFkbWluUGFzc3dvcmRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWJQYXNzd29yZHNGaWVsZERpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgU1NIUGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTU0hQYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIFNTSFBhc3N3b3JkUmVwZWF0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU1NIUGFzc3dvcmRSZXBlYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXRjaFtTU0hQYXNzd29yZF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVNTSFBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXRUJQb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV0VCUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtXRUJIVFRQU1BvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXRUJIVFRQU1BvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXRUJIVFRQU1BvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtXRUJQb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIEFKQU1Qb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnQUpBTVBvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBTSVBBdXRoUHJlZml4OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU0lQQXV0aFByZWZpeCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cFsvXlthLXpBLVpdKiQvXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhJbnZhbGlkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgZmllbGQgd2hlbiBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICB3ZWJBZG1pblBhc3N3b3JkUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtXZWJQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1tBLVpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRzICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGVuYWJsZWQsIGFuZCBpdCBub3QgZXF1YWwgdG8gaGlkZGVuUGFzc3dvcmRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1thLXpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb1VwcGVyU2ltdm9sXG4gICAgICAgIH1cbiAgICBdLFxuXG4gICAgLy8gUnVsZXMgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGQgd2hlbiBTU0ggbG9naW4gdGhyb3VnaCB0aGUgcGFzc3dvcmQgZGlzYWJsZWRcbiAgICBhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkLFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8qKlxuICAgICAqIENsaXBib2FyZCBpbnN0YW5jZSBmb3IgY29weSBmdW5jdGlvbmFsaXR5XG4gICAgICogQHR5cGUge0NsaXBib2FyZEpTfVxuICAgICAqL1xuICAgIGNsaXBib2FyZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiAgSW5pdGlhbGl6ZSBtb2R1bGUgd2l0aCBldmVudCBiaW5kaW5ncyBhbmQgY29tcG9uZW50IGluaXRpYWxpemF0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0c1xuICAgICAgICAvLyBXZWIgQWRtaW4gUGFzc3dvcmQgd2lkZ2V0IC0gb25seSB2YWxpZGF0aW9uIGFuZCB3YXJuaW5ncywgbm8gYnV0dG9uc1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIFBhc3N3b3JkV2lkZ2V0LmluaXQoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLCB7XG4gICAgICAgICAgICAgICAgY29udGV4dDogJ2dlbmVyYWxfd2ViJyxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSwgICAgIC8vIE5vIHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTU0ggUGFzc3dvcmQgd2lkZ2V0IC0gb25seSB2YWxpZGF0aW9uIGFuZCB3YXJuaW5ncywgbm8gYnV0dG9uc1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzc2hXaWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQsIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0OiAnZ2VuZXJhbF9zc2gnLFxuICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBnZW5lcmF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLCAgICAgLy8gTm8gc2hvdy9oaWRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gY29weSBidXR0b25cbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBTU0ggZGlzYWJsZSBjaGVja2JveFxuICAgICAgICAgICAgJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNEaXNhYmxlZCA9ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGlmIChpc0Rpc2FibGVkICYmIHNzaFdpZGdldCkge1xuICAgICAgICAgICAgICAgICAgICBQYXNzd29yZFdpZGdldC5oaWRlV2FybmluZ3Moc3NoV2lkZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNzaFdpZGdldC5lbGVtZW50cy4kc2NvcmVTZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzc2hXaWRnZXQuZWxlbWVudHMuJHNjb3JlU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpc0Rpc2FibGVkICYmIHNzaFdpZGdldCkge1xuICAgICAgICAgICAgICAgICAgICBQYXNzd29yZFdpZGdldC5jaGVja1Bhc3N3b3JkKHNzaFdpZGdldCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIHdoZW4gcGFzc3dvcmRzIGNoYW5nZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHdlYkFkbWluUGFzc3dvcmQudmFsKCkgIT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQudmFsKCkgIT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLW1lbnUnKS5maW5kKCcuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGRyb3Bkb3ducyBvbiB0aGUgZm9ybSAoZXhjZXB0IHNvdW5kIGZpbGUgc2VsZWN0b3JzKVxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5kcm9wZG93bicpLm5vdCgnLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JykuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3hlcyBvbiB0aGUgZm9ybVxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtIC5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gQ29kZWMgdGFibGUgZHJhZy1uLWRyb3Agd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAvLyBTZWUgaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKSB3aGljaCBpcyBjYWxsZWQgZnJvbSB1cGRhdGVDb2RlY1RhYmxlcygpXG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9ycyB3aXRoIEhUTUwgaWNvbnMgc3VwcG9ydFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9ycygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RlOiBTU0gga2V5cyB0YWJsZSB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgbG9hZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyBkaXNwbGF5XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmb3IgY29weSBidXR0b25zXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhZGRpdGlvbmFsIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuXG4gICAgICAgIC8vIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goe1xuICAgICAgICAgICAgJ29uQ2hhbmdlJzogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmRcbiAgICAgICAgfSk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG5cbiAgICAgICAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIHRvIGhhbmRsZSB0YWIgYWN0aXZhdGlvblxuICAgICAgICAkKHdpbmRvdykub24oJ0dTLUFjdGl2YXRlVGFiJywgKGV2ZW50LCBuYW1lVGFiKSA9PiB7XG4gICAgICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoJ2NoYW5nZSB0YWInLCBuYW1lVGFiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBpZiAodHlwZW9mIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFBCWExhbmd1YWdlIGNoYW5nZSBkZXRlY3Rpb24gZm9yIHJlc3RhcnQgd2FybmluZ1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVBCWExhbmd1YWdlV2FybmluZygpO1xuXG4gICAgICAgIC8vIExvYWQgZGF0YSBmcm9tIEFQSSBpbnN0ZWFkIG9mIHVzaW5nIHNlcnZlci1yZW5kZXJlZCB2YWx1ZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWREYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvcnMgd2l0aCBIVE1MIGljb25zIGFuZCBjaGFuZ2UgdHJhY2tpbmdcbiAgICAgKiBOb3RlOiBUaGUgSFRNTCBzdHJ1Y3R1cmUgaXMgbm93IHByb3ZpZGVkIGJ5IHRoZSBwbGF5QWRkTmV3U291bmRXaXRoSWNvbnMgcGFydGlhbDpcbiAgICAgKiAtIEhpZGRlbiBpbnB1dDogPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCIgbmFtZT1cIlBCWFJlY29yZEFubm91bmNlbWVudEluXCI+XG4gICAgICogLSBEcm9wZG93biBkaXY6IDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gc2VhcmNoIFBCWFJlY29yZEFubm91bmNlbWVudEluLXNlbGVjdFwiPlxuICAgICAqL1xuICAgIGluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgaW5jb21pbmcgYW5ub3VuY2VtZW50IHNlbGVjdG9yXG4gICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ1BCWFJlY29yZEFubm91bmNlbWVudEluJywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvdXRnb2luZyBhbm5vdW5jZW1lbnQgc2VsZWN0b3JcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdCgnUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0Jywge1xuICAgICAgICAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGdlbmVyYWwgc2V0dGluZ3MgZGF0YSBmcm9tIEFQSVxuICAgICAqIFVzZWQgYm90aCBvbiBpbml0aWFsIHBhZ2UgbG9hZCBhbmQgZm9yIG1hbnVhbCByZWZyZXNoXG4gICAgICogQ2FuIGJlIGNhbGxlZCBhbnl0aW1lIHRvIHJlbG9hZCB0aGUgZm9ybSBkYXRhOiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkubG9hZERhdGEoKVxuICAgICAqL1xuICAgIGxvYWREYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGUgb24gdGhlIGZvcm1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdMb2FkaW5nIGdlbmVyYWwgc2V0dGluZ3MgZnJvbSBBUEkuLi4nKTtcbiAgICAgICAgXG4gICAgICAgIEdlbmVyYWxTZXR0aW5nc0FQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0FQSSBSZXNwb25zZTonLCByZXNwb25zZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQb3B1bGF0aW5nIGZvcm0gd2l0aDonLCByZXNwb25zZS5kYXRhLnNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIHdpdGggdGhlIHJlY2VpdmVkIGRhdGFcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5kYXRhTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaG93IHdhcm5pbmdzIGZvciBkZWZhdWx0IHBhc3N3b3JkcyBhZnRlciBET00gdXBkYXRlXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEucGFzc3dvcmRWYWxpZGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBET00gaXMgdXBkYXRlZCBhZnRlciBwb3B1bGF0ZUZvcm1cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0RlZmF1bHRQYXNzd29yZFdhcm5pbmdzKHJlc3BvbnNlLmRhdGEucGFzc3dvcmRWYWxpZGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQVBJIEVycm9yOicsIHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dBcGlFcnJvcihyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNldHRpbmdzIGRhdGEgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBFeHRyYWN0IHNldHRpbmdzIGFuZCBhZGRpdGlvbmFsIGRhdGFcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSBkYXRhLnNldHRpbmdzIHx8IGRhdGE7XG4gICAgICAgIGNvbnN0IGNvZGVjcyA9IGRhdGEuY29kZWNzIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGZvcm0gdmFsdWVzIHVzaW5nIEZvbWFudGljIFVJIGZvcm0gQVBJXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHNwZWNpYWwgZmllbGQgdHlwZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnBvcHVsYXRlU3BlY2lhbEZpZWxkcyhzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIHNvdW5kIGZpbGUgdmFsdWVzIHdpdGggcmVwcmVzZW50YXRpb25zXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkU291bmRGaWxlVmFsdWVzKHNldHRpbmdzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBjb2RlYyB0YWJsZXNcbiAgICAgICAgaWYgKGNvZGVjcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudXBkYXRlQ29kZWNUYWJsZXMoY29kZWNzKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCBmaWVsZHMgKGhpZGUgYWN0dWFsIHBhc3N3b3JkcylcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVQYXNzd29yZEZpZWxkcyhzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgU1NIIHBhc3N3b3JkIHZpc2liaWxpdHlcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBpZiBlbmFibGVkXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTU0gga2V5cyB0YWJsZSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBpZiAodHlwZW9mIHNzaEtleXNUYWJsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHNzaEtleXNUYWJsZS5pbml0aWFsaXplKCdzc2gta2V5cy1jb250YWluZXInLCAnU1NIQXV0aG9yaXplZEtleXMnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSB0cnVuY2F0ZWQgZmllbGRzIHdpdGggbmV3IGRhdGFcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyaWdnZXIgZXZlbnQgdG8gbm90aWZ5IHRoYXQgZGF0YSBoYXMgYmVlbiBsb2FkZWRcbiAgICAgICAgJChkb2N1bWVudCkudHJpZ2dlcignR2VuZXJhbFNldHRpbmdzLmRhdGFMb2FkZWQnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzcGVjaWFsIGZpZWxkIHR5cGVzIHRoYXQgbmVlZCBjdXN0b20gcG9wdWxhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVNwZWNpYWxGaWVsZHMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gUHJpdmF0ZSBrZXkgZXhpc3RlbmNlIGlzIG5vdyBkZXRlcm1pbmVkIGJ5IGNoZWNraW5nIGlmIHZhbHVlIGVxdWFscyBISURERU5fUEFTU1dPUkRcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgIGlmIChzZXR0aW5ncy5XRUJIVFRQU1B1YmxpY0tleV9pbmZvKSB7XG4gICAgICAgICAgICAkKCcjV0VCSFRUUFNQdWJsaWNLZXknKS5kYXRhKCdjZXJ0LWluZm8nLCBzZXR0aW5ncy5XRUJIVFRQU1B1YmxpY0tleV9pbmZvKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNoZWNrYm94ZXMgKEFQSSByZXR1cm5zIGJvb2xlYW4gdmFsdWVzKVxuICAgICAgICBPYmplY3Qua2V5cyhzZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJChgIyR7a2V5fWApLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBzZXR0aW5nc1trZXldID09PSB0cnVlIHx8IHNldHRpbmdzW2tleV0gPT09ICcxJyB8fCBzZXR0aW5nc1trZXldID09PSAxO1xuICAgICAgICAgICAgICAgICRjaGVja2JveC5jaGVja2JveChpc0NoZWNrZWQgPyAnY2hlY2snIDogJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIHJlZ3VsYXIgZHJvcGRvd25zIChleGNsdWRpbmcgc291bmQgZmlsZSBzZWxlY3RvcnMgd2hpY2ggYXJlIGhhbmRsZWQgc2VwYXJhdGVseSlcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2tleX1gKS5wYXJlbnQoJy5kcm9wZG93bicpO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPiAwICYmICEkZHJvcGRvd24uaGFzQ2xhc3MoJ2F1ZGlvLW1lc3NhZ2Utc2VsZWN0JykpIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNldHRpbmdzW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgZmllbGRzIHdpdGggaGlkZGVuIHBhc3N3b3JkIGluZGljYXRvclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIGRhdGFcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gSGlkZSBhY3R1YWwgcGFzc3dvcmRzIGFuZCBzaG93IGhpZGRlbiBpbmRpY2F0b3JcbiAgICAgICAgaWYgKHNldHRpbmdzLldlYkFkbWluUGFzc3dvcmQgJiYgc2V0dGluZ3MuV2ViQWRtaW5QYXNzd29yZCAhPT0gJycpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoc2V0dGluZ3MuU1NIUGFzc3dvcmQgJiYgc2V0dGluZ3MuU1NIUGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IEFQSSBlcnJvciBtZXNzYWdlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXNzYWdlcyAtIEVycm9yIG1lc3NhZ2VzIGZyb20gQVBJXG4gICAgICovXG4gICAgc2hvd0FwaUVycm9yKG1lc3NhZ2VzKSB7XG4gICAgICAgIGlmIChtZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gQXJyYXkuaXNBcnJheShtZXNzYWdlcy5lcnJvcikgXG4gICAgICAgICAgICAgICAgPyBtZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIFxuICAgICAgICAgICAgICAgIDogbWVzc2FnZXMuZXJyb3I7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyB3YXJuaW5ncyBmb3IgZGVmYXVsdCBwYXNzd29yZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdmFsaWRhdGlvbiAtIFBhc3N3b3JkIHZhbGlkYXRpb24gcmVzdWx0cyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHNob3dEZWZhdWx0UGFzc3dvcmRXYXJuaW5ncyh2YWxpZGF0aW9uKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgcGFzc3dvcmQtdmFsaWRhdGUgbWVzc2FnZXMgZmlyc3RcbiAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHdhcm5pbmcgZm9yIGRlZmF1bHQgV2ViIEFkbWluIHBhc3N3b3JkXG4gICAgICAgIGlmICh2YWxpZGF0aW9uLmlzRGVmYXVsdFdlYlBhc3N3b3JkKSB7XG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBwYXNzd29yZCBmaWVsZHMgZ3JvdXAgLSB0cnkgbXVsdGlwbGUgc2VsZWN0b3JzXG4gICAgICAgICAgICBsZXQgJHdlYlBhc3N3b3JkRmllbGRzID0gJCgnI1dlYkFkbWluUGFzc3dvcmQnKS5jbG9zZXN0KCcudHdvLmZpZWxkcycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHdlYlBhc3N3b3JkRmllbGRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSBhbHRlcm5hdGl2ZSBzZWxlY3RvciBpZiB0aGUgZmlyc3Qgb25lIGRvZXNuJ3Qgd29ya1xuICAgICAgICAgICAgICAgICR3ZWJQYXNzd29yZEZpZWxkcyA9ICQoJyNXZWJBZG1pblBhc3N3b3JkJykucGFyZW50KCkucGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkd2ViUGFzc3dvcmRGaWVsZHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCB3YXJuaW5nSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG5lZ2F0aXZlIGljb24gbWVzc2FnZSBwYXNzd29yZC12YWxpZGF0ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfU2V0UGFzc3dvcmQgfHwgJ1NlY3VyaXR5IFdhcm5pbmcnfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1NldFBhc3N3b3JkSW5mbyB8fCAnWW91IGFyZSB1c2luZyB0aGUgZGVmYXVsdCBwYXNzd29yZC4gUGxlYXNlIGNoYW5nZSBpdCBmb3Igc2VjdXJpdHkuJ308L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbnNlcnQgd2FybmluZyBiZWZvcmUgdGhlIHBhc3N3b3JkIGZpZWxkc1xuICAgICAgICAgICAgICAgICR3ZWJQYXNzd29yZEZpZWxkcy5iZWZvcmUod2FybmluZ0h0bWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHdhcm5pbmcgZm9yIGRlZmF1bHQgU1NIIHBhc3N3b3JkXG4gICAgICAgIGlmICh2YWxpZGF0aW9uLmlzRGVmYXVsdFNTSFBhc3N3b3JkKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBTU0ggcGFzc3dvcmQgbG9naW4gaXMgZW5hYmxlZFxuICAgICAgICAgICAgY29uc3Qgc3NoUGFzc3dvcmREaXNhYmxlZCA9ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXNzaFBhc3N3b3JkRGlzYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSBTU0ggcGFzc3dvcmQgZmllbGRzIGdyb3VwXG4gICAgICAgICAgICAgICAgbGV0ICRzc2hQYXNzd29yZEZpZWxkcyA9ICQoJyNTU0hQYXNzd29yZCcpLmNsb3Nlc3QoJy50d28uZmllbGRzJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRzc2hQYXNzd29yZEZpZWxkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IGFsdGVybmF0aXZlIHNlbGVjdG9yXG4gICAgICAgICAgICAgICAgICAgICRzc2hQYXNzd29yZEZpZWxkcyA9ICQoJyNTU0hQYXNzd29yZCcpLnBhcmVudCgpLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJHNzaFBhc3N3b3JkRmllbGRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB3YXJuaW5nSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBuZWdhdGl2ZSBpY29uIG1lc3NhZ2UgcGFzc3dvcmQtdmFsaWRhdGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1NldFBhc3N3b3JkIHx8ICdTZWN1cml0eSBXYXJuaW5nJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfU2V0UGFzc3dvcmRJbmZvIHx8ICdZb3UgYXJlIHVzaW5nIHRoZSBkZWZhdWx0IHBhc3N3b3JkLiBQbGVhc2UgY2hhbmdlIGl0IGZvciBzZWN1cml0eS4nfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5zZXJ0IHdhcm5pbmcgYmVmb3JlIHRoZSBTU0ggcGFzc3dvcmQgZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICRzc2hQYXNzd29yZEZpZWxkcy5iZWZvcmUod2FybmluZ0h0bWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBzb3VuZCBmaWxlIHZhbHVlcyB3aXRoIEhUTUwgcmVwcmVzZW50YXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNvdW5kRmlsZVZhbHVlcyhzZXR0aW5ncykge1xuICAgICAgICAvLyBMb2FkIGluY29taW5nIGFubm91bmNlbWVudCBzb3VuZCBmaWxlXG4gICAgICAgIGlmIChzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRJbikge1xuICAgICAgICAgICAgY29uc3QgYW5ub3VuY2VtZW50SW5SZXByZXNlbnQgPSBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRJbl9SZXByZXNlbnQgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW5SZXByZXNlbnQ7XG4gICAgICAgICAgICBpZiAoYW5ub3VuY2VtZW50SW5SZXByZXNlbnQpIHtcbiAgICAgICAgICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAgICAgJ1BCWFJlY29yZEFubm91bmNlbWVudEluJyxcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4sXG4gICAgICAgICAgICAgICAgICAgIGFubm91bmNlbWVudEluUmVwcmVzZW50XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgU291bmRGaWxlU2VsZWN0b3Iuc2V0U2VsZWN0ZWQoJ1BCWFJlY29yZEFubm91bmNlbWVudEluJywgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIG91dGdvaW5nIGFubm91bmNlbWVudCBzb3VuZCBmaWxlXG4gICAgICAgIGlmIChzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFubm91bmNlbWVudE91dFJlcHJlc2VudCA9IHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudE91dF9SZXByZXNlbnQgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudE91dFJlcHJlc2VudDtcbiAgICAgICAgICAgIGlmIChhbm5vdW5jZW1lbnRPdXRSZXByZXNlbnQpIHtcbiAgICAgICAgICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICAgICAgJ1BCWFJlY29yZEFubm91bmNlbWVudE91dCcsXG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudE91dCxcbiAgICAgICAgICAgICAgICAgICAgYW5ub3VuY2VtZW50T3V0UmVwcmVzZW50XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgU291bmRGaWxlU2VsZWN0b3Iuc2V0U2VsZWN0ZWQoJ1BCWFJlY29yZEFubm91bmNlbWVudE91dCcsIHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudE91dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgYW5kIHVwZGF0ZSBjb2RlYyB0YWJsZXMgd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtBcnJheX0gY29kZWNzIC0gQXJyYXkgb2YgY29kZWMgY29uZmlndXJhdGlvbnNcbiAgICAgKi9cbiAgICB1cGRhdGVDb2RlY1RhYmxlcyhjb2RlY3MpIHtcbiAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgY29kZWMgc3RhdGUgZm9yIGNvbXBhcmlzb25cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gU2VwYXJhdGUgYXVkaW8gYW5kIHZpZGVvIGNvZGVjc1xuICAgICAgICBjb25zdCBhdWRpb0NvZGVjcyA9IGNvZGVjcy5maWx0ZXIoYyA9PiBjLnR5cGUgPT09ICdhdWRpbycpLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgY29uc3QgdmlkZW9Db2RlY3MgPSBjb2RlY3MuZmlsdGVyKGMgPT4gYy50eXBlID09PSAndmlkZW8nKS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBhdWRpbyBjb2RlY3MgdGFibGVcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmJ1aWxkQ29kZWNUYWJsZShhdWRpb0NvZGVjcywgJ2F1ZGlvJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCB2aWRlbyBjb2RlY3MgdGFibGVcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmJ1aWxkQ29kZWNUYWJsZSh2aWRlb0NvZGVjcywgJ3ZpZGVvJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIGxvYWRlcnMgYW5kIHNob3cgdGFibGVzXG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtbG9hZGVyLCAjdmlkZW8tY29kZWNzLWxvYWRlcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI2F1ZGlvLWNvZGVjcy10YWJsZSwgI3ZpZGVvLWNvZGVjcy10YWJsZScpLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZHJhZyBhbmQgZHJvcCBmb3IgcmVvcmRlcmluZ1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGNvZGVjIHRhYmxlIHJvd3MgZnJvbSBkYXRhXG4gICAgICogQHBhcmFtIHtBcnJheX0gY29kZWNzIC0gQXJyYXkgb2YgY29kZWMgb2JqZWN0c1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gJ2F1ZGlvJyBvciAndmlkZW8nXG4gICAgICovXG4gICAgYnVpbGRDb2RlY1RhYmxlKGNvZGVjcywgdHlwZSkge1xuICAgICAgICBjb25zdCAkdGFibGVCb2R5ID0gJChgIyR7dHlwZX0tY29kZWNzLXRhYmxlIHRib2R5YCk7XG4gICAgICAgICR0YWJsZUJvZHkuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIGNvZGVjcy5mb3JFYWNoKChjb2RlYywgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHN0YXRlIGZvciBjaGFuZ2UgZGV0ZWN0aW9uXG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkub3JpZ2luYWxDb2RlY1N0YXRlW2NvZGVjLm5hbWVdID0ge1xuICAgICAgICAgICAgICAgIHByaW9yaXR5OiBpbmRleCxcbiAgICAgICAgICAgICAgICBkaXNhYmxlZDogY29kZWMuZGlzYWJsZWRcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWJsZSByb3dcbiAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSBjb2RlYy5kaXNhYmxlZCA9PT0gdHJ1ZSB8fCBjb2RlYy5kaXNhYmxlZCA9PT0gJzEnIHx8IGNvZGVjLmRpc2FibGVkID09PSAxO1xuICAgICAgICAgICAgY29uc3QgY2hlY2tlZCA9ICFpc0Rpc2FibGVkID8gJ2NoZWNrZWQnIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHJvd0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwiY29kZWMtcm93XCIgaWQ9XCJjb2RlYy0ke2NvZGVjLm5hbWV9XCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke2luZGV4fVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNvZGVjLW5hbWU9XCIke2NvZGVjLm5hbWV9XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1vcmlnaW5hbC1wcmlvcml0eT1cIiR7aW5kZXh9XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cImNvbGxhcHNpbmcgZHJhZ0hhbmRsZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzb3J0IGdyZXkgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBjb2RlY3NcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJjb2RlY18ke2NvZGVjLm5hbWV9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Y2hlY2tlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFiaW5kZXg9XCIwXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwiaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj1cImNvZGVjXyR7Y29kZWMubmFtZX1cIj4ke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGNvZGVjLmRlc2NyaXB0aW9uIHx8IGNvZGVjLm5hbWUpfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHRhYmxlQm9keS5hcHBlbmQocm93SHRtbCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIGZvciB0aGUgbmV3IHJvd3NcbiAgICAgICAgJHRhYmxlQm9keS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgd2hlbiBjb2RlYyBpcyBlbmFibGVkL2Rpc2FibGVkXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJhZyBhbmQgZHJvcCBmb3IgY29kZWMgdGFibGVzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AoKSB7XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUsICN2aWRlby1jb2RlY3MtdGFibGUnKS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyYWdDbGFzczogJ2hvdmVyaW5nUm93JyxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZScsXG4gICAgICAgICAgICBvbkRyb3A6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHdoZW4gY29kZWNzIGFyZSByZW9yZGVyZWRcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNlcnRpZmljYXRlIGZpZWxkIGRpc3BsYXkgb25seVxuICAgICAqL1xuICAgIGluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCkge1xuICAgICAgICAvLyBIYW5kbGUgV0VCSFRUUFNQdWJsaWNLZXkgZmllbGQgb25seVxuICAgICAgICBjb25zdCAkY2VydFB1YktleUZpZWxkID0gJCgnI1dFQkhUVFBTUHVibGljS2V5Jyk7XG4gICAgICAgIGlmICgkY2VydFB1YktleUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFZhbHVlID0gJGNlcnRQdWJLZXlGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkY2VydFB1YktleUZpZWxkLnBhcmVudCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgY2VydGlmaWNhdGUgaW5mbyBpZiBhdmFpbGFibGUgZnJvbSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICAgICAgY29uc3QgY2VydEluZm8gPSAkY2VydFB1YktleUZpZWxkLmRhdGEoJ2NlcnQtaW5mbycpIHx8IHt9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIGRpc3BsYXkgZWxlbWVudHMgZm9yIHRoaXMgZmllbGQgb25seVxuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5LCAuY2VydC1lZGl0LWZvcm0nKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGZ1bGxWYWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBtZWFuaW5nZnVsIGRpc3BsYXkgdGV4dCBmcm9tIGNlcnRpZmljYXRlIGluZm9cbiAgICAgICAgICAgICAgICBsZXQgZGlzcGxheVRleHQgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8gJiYgIWNlcnRJbmZvLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gW107XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgc3ViamVjdC9kb21haW5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLnN1YmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYPCfk5wgJHtjZXJ0SW5mby5zdWJqZWN0fWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgaXNzdWVyIGlmIG5vdCBzZWxmLXNpZ25lZFxuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNzdWVyICYmICFjZXJ0SW5mby5pc19zZWxmX3NpZ25lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChgYnkgJHtjZXJ0SW5mby5pc3N1ZXJ9YCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goJyhTZWxmLXNpZ25lZCknKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHZhbGlkaXR5IGRhdGVzXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby52YWxpZF90bykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzX2V4cGlyZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDinYwgRXhwaXJlZCAke2NlcnRJbmZvLnZhbGlkX3RvfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKaoO+4jyBFeHBpcmVzIGluICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXNgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4pyFIFZhbGlkIHVudGlsICR7Y2VydEluZm8udmFsaWRfdG99YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlUZXh0ID0gcGFydHMuam9pbignIHwgJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gdHJ1bmNhdGVkIGNlcnRpZmljYXRlXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXlUZXh0ID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnRydW5jYXRlQ2VydGlmaWNhdGUoZnVsbFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgb3JpZ2luYWwgZmllbGRcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgc3RhdHVzIGNvbG9yIGNsYXNzIGJhc2VkIG9uIGNlcnRpZmljYXRlIHN0YXR1c1xuICAgICAgICAgICAgICAgIGxldCBzdGF0dXNDbGFzcyA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ2Vycm9yJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5IDw9IDMwKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwbGF5SHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGlvbiBpbnB1dCBmbHVpZCBjZXJ0LWRpc3BsYXkgJHtzdGF0dXNDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChkaXNwbGF5VGV4dCl9XCIgcmVhZG9ubHkgY2xhc3M9XCJ0cnVuY2F0ZWQtZGlzcGxheVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgY29weS1idG5cIiBkYXRhLWNsaXBib2FyZC10ZXh0PVwiJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChmdWxsVmFsdWUpfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFyaWF0aW9uPVwiYmFzaWNcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weUNlcnQgfHwgJ0NvcHkgY2VydGlmaWNhdGUnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29weSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBpbmZvLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENlcnRJbmZvIHx8ICdDZXJ0aWZpY2F0ZSBkZXRhaWxzJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGVkaXQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXQgfHwgJ0VkaXQgY2VydGlmaWNhdGUnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZWRpdCBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBkZWxldGUtY2VydC1idG5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlIHx8ICdEZWxldGUgY2VydGlmaWNhdGUnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwidHJhc2ggaWNvbiByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICR7Y2VydEluZm8gJiYgIWNlcnRJbmZvLmVycm9yID8gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnJlbmRlckNlcnRpZmljYXRlRGV0YWlscyhjZXJ0SW5mbykgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGZvcm0gY2VydC1lZGl0LWZvcm1cIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBpZD1cIldFQkhUVFBTUHVibGljS2V5X2VkaXRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93cz1cIjEwXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQdWJsaWNDZXJ0IHx8ICdQYXN0ZSBwdWJsaWMgY2VydGlmaWNhdGUgaGVyZS4uLid9XCI+JHtmdWxsVmFsdWV9PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG1pbmkgYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBwb3NpdGl2ZSBidXR0b24gc2F2ZS1jZXJ0LWJ0blwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1NhdmUgfHwgJ1NhdmUnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gY2FuY2VsLWNlcnQtYnRuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2xvc2UgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuYnRfQ2FuY2VsIHx8ICdDYW5jZWwnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoZGlzcGxheUh0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBpbmZvIGJ1dHRvbiAtIHRvZ2dsZSBkZXRhaWxzIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5pbmZvLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRkZXRhaWxzID0gJGNvbnRhaW5lci5maW5kKCcuY2VydC1kZXRhaWxzJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkZGV0YWlscy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRkZXRhaWxzLnNsaWRlVG9nZ2xlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZWRpdCBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5lZGl0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWRpc3BsYXknKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZWRpdC1mb3JtJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJyNXRUJIVFRQU1B1YmxpY0tleV9lZGl0JykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5zYXZlLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQdWJsaWNLZXlfZWRpdCcpLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBvcmlnaW5hbCBoaWRkZW4gZmllbGRcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC52YWwobmV3VmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgb25seSB0aGUgY2VydGlmaWNhdGUgZmllbGQgZGlzcGxheSB3aXRoIG5ldyB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgY2FuY2VsIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNhbmNlbC1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWVkaXQtZm9ybScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5Jykuc2hvdygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBkZWxldGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZGVsZXRlLWNlcnQtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciB0aGUgY2VydGlmaWNhdGVcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgb25seSB0aGUgY2VydGlmaWNhdGUgZmllbGQgdG8gc2hvdyBlbXB0eSBmaWVsZFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNlcnRpZmljYXRlRmllbGQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIG5ldyBidXR0b25zXG4gICAgICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBmb3IgaW5wdXQgd2l0aCBwcm9wZXIgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHVibGljQ2VydCB8fCAnUGFzdGUgcHVibGljIGNlcnRpZmljYXRlIGhlcmUuLi4nKTtcbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLmF0dHIoJ3Jvd3MnLCAnMTAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgY2hhbmdlIGV2ZW50cyB0cmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQub2ZmKCdpbnB1dC5jZXJ0IGNoYW5nZS5jZXJ0IGtleXVwLmNlcnQnKS5vbignaW5wdXQuY2VydCBjaGFuZ2UuY2VydCBrZXl1cC5jZXJ0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0cnVuY2F0ZWQgZmllbGRzIGRpc3BsYXkgZm9yIFNTSCBrZXlzIGFuZCBjZXJ0aWZpY2F0ZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCkge1xuICAgICAgICAvLyBIYW5kbGUgU1NIX0lEX1JTQV9QVUIgZmllbGRcbiAgICAgICAgY29uc3QgJHNzaFB1YktleUZpZWxkID0gJCgnI1NTSF9JRF9SU0FfUFVCJyk7XG4gICAgICAgIGlmICgkc3NoUHViS2V5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsVmFsdWUgPSAkc3NoUHViS2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJHNzaFB1YktleUZpZWxkLnBhcmVudCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIGRpc3BsYXkgZWxlbWVudHNcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnNzaC1rZXktZGlzcGxheSwgLmZ1bGwtZGlzcGxheScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IGNyZWF0ZSBkaXNwbGF5IGlmIHRoZXJlJ3MgYSB2YWx1ZVxuICAgICAgICAgICAgaWYgKGZ1bGxWYWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB0cnVuY2F0ZWQgZGlzcGxheVxuICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS50cnVuY2F0ZVNTSEtleShmdWxsVmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIG9yaWdpbmFsIGZpZWxkXG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwbGF5SHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGlvbiBpbnB1dCBmbHVpZCBzc2gta2V5LWRpc3BsYXlcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIHZhbHVlPVwiJHt0cnVuY2F0ZWR9XCIgcmVhZG9ubHkgY2xhc3M9XCJ0cnVuY2F0ZWQtZGlzcGxheVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgY29weS1idG5cIiBkYXRhLWNsaXBib2FyZC10ZXh0PVwiJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChmdWxsVmFsdWUpfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cImJhc2ljXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlLZXkgfHwgJ0NvcHknfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29weSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBleHBhbmQtYnRuXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFeHBhbmQgfHwgJ1Nob3cgZnVsbCBrZXknfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhwYW5kIGljb24gYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHRleHRhcmVhIGNsYXNzPVwiZnVsbC1kaXNwbGF5XCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCIgcmVhZG9ubHk+JHtmdWxsVmFsdWV9PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIGV4cGFuZC9jb2xsYXBzZVxuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZXhwYW5kLWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZ1bGxEaXNwbGF5ID0gJGNvbnRhaW5lci5maW5kKCcuZnVsbC1kaXNwbGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRydW5jYXRlZERpc3BsYXkgPSAkY29udGFpbmVyLmZpbmQoJy5zc2gta2V5LWRpc3BsYXknKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQodGhpcykuZmluZCgnaScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkZnVsbERpc3BsYXkuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJGZ1bGxEaXNwbGF5LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJHRydW5jYXRlZERpc3BsYXkuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnY29tcHJlc3MnKS5hZGRDbGFzcygnZXhwYW5kJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGZ1bGxEaXNwbGF5LnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJHRydW5jYXRlZERpc3BsYXkuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXhwYW5kJykuYWRkQ2xhc3MoJ2NvbXByZXNzJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIG5ldyBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIG9yaWdpbmFsIGZpZWxkIGFzIHJlYWQtb25seSAodGhpcyBpcyBhIHN5c3RlbS1nZW5lcmF0ZWQga2V5KVxuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmF0dHIoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJHNzaFB1YktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX05vU1NIUHVibGljS2V5IHx8ICdObyBTU0ggcHVibGljIGtleSBnZW5lcmF0ZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIC0gdXNlIGRlZGljYXRlZCBtZXRob2RcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgV0VCSFRUUFNQcml2YXRlS2V5IGZpZWxkICh3cml0ZS1vbmx5IHdpdGggcGFzc3dvcmQgbWFza2luZylcbiAgICAgICAgY29uc3QgJGNlcnRQcml2S2V5RmllbGQgPSAkKCcjV0VCSFRUUFNQcml2YXRlS2V5Jyk7XG4gICAgICAgIGlmICgkY2VydFByaXZLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkY2VydFByaXZLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5wcml2YXRlLWtleS1zZXQsICNXRUJIVFRQU1ByaXZhdGVLZXlfbmV3JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHByaXZhdGUga2V5IGV4aXN0cyAocGFzc3dvcmQgbWFza2luZyBsb2dpYylcbiAgICAgICAgICAgIC8vIFRoZSBmaWVsZCB3aWxsIGNvbnRhaW4gJ3h4eHh4eHgnIGlmIGEgcHJpdmF0ZSBrZXkgaXMgc2V0XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkY2VydFByaXZLZXlGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1ZhbHVlID0gY3VycmVudFZhbHVlID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChoYXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgb3JpZ2luYWwgZmllbGQgYW5kIHNob3cgc3RhdHVzIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2UgcHJpdmF0ZS1rZXktc2V0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImxvY2sgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19Qcml2YXRlS2V5SXNTZXQgfHwgJ1ByaXZhdGUga2V5IGlzIGNvbmZpZ3VyZWQnfSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzPVwicmVwbGFjZS1rZXktbGlua1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1JlcGxhY2UgfHwgJ1JlcGxhY2UnfTwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBpZD1cIldFQkhUVFBTUHJpdmF0ZUtleV9uZXdcIiBuYW1lPVwiV0VCSFRUUFNQcml2YXRlS2V5XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3dzPVwiMTBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHJpdmF0ZUtleSB8fCAnUGFzdGUgcHJpdmF0ZSBrZXkgaGVyZS4uLid9XCI+PC90ZXh0YXJlYT5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcmVwbGFjZSBsaW5rXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucmVwbGFjZS1rZXktbGluaycpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5wcml2YXRlLWtleS1zZXQnKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRuZXdGaWVsZCA9ICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHJpdmF0ZUtleV9uZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgJG5ld0ZpZWxkLnNob3coKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGhpZGRlbiBwYXNzd29yZCB2YWx1ZSBzbyB3ZSBjYW4gc2V0IGEgbmV3IG9uZVxuICAgICAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC52YWwoJycpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQmluZCBjaGFuZ2UgZXZlbnQgdG8gdXBkYXRlIGhpZGRlbiBmaWVsZCBhbmQgZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICRuZXdGaWVsZC5vbignaW5wdXQgY2hhbmdlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIG9yaWdpbmFsIGhpZGRlbiBmaWVsZCB3aXRoIG5ldyB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQudmFsKCRuZXdGaWVsZC52YWwoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uIGNoZWNrXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBmb3IgaW5wdXQgd2l0aCBwcm9wZXIgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAkY2VydFByaXZLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzdGVQcml2YXRlS2V5IHx8ICdQYXN0ZSBwcml2YXRlIGtleSBoZXJlLi4uJyk7XG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuYXR0cigncm93cycsICcxMCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjaGFuZ2UgZXZlbnRzIHRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQub2ZmKCdpbnB1dC5wcml2IGNoYW5nZS5wcml2IGtleXVwLnByaXYnKS5vbignaW5wdXQucHJpdiBjaGFuZ2UucHJpdiBrZXl1cC5wcml2JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2xpcGJvYXJkIGZ1bmN0aW9uYWxpdHkgZm9yIGNvcHkgYnV0dG9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDbGlwYm9hcmQoKSB7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNvcHktYnRuJyk7XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCAkYnRuID0gJChlLnRyaWdnZXIpO1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxJY29uID0gJGJ0bi5maW5kKCdpJykuYXR0cignY2xhc3MnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJGJ0bi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoKS5hZGRDbGFzcygnY2hlY2sgaWNvbicpO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGJ0bi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoKS5hZGRDbGFzcyhvcmlnaW5hbEljb24pO1xuICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFyIHNlbGVjdGlvblxuICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQub24oJ2Vycm9yJywgKCkgPT4ge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5nc19Db3B5RmFpbGVkIHx8ICdGYWlsZWQgdG8gY29weSB0byBjbGlwYm9hcmQnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUcnVuY2F0ZSBTU0gga2V5IGZvciBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSAtIEZ1bGwgU1NIIGtleVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVHJ1bmNhdGVkIGtleVxuICAgICAqL1xuICAgIHRydW5jYXRlU1NIS2V5KGtleSkge1xuICAgICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoIDwgNTApIHtcbiAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KCcgJyk7XG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPj0gMikge1xuICAgICAgICAgICAgY29uc3Qga2V5VHlwZSA9IHBhcnRzWzBdO1xuICAgICAgICAgICAgY29uc3Qga2V5RGF0YSA9IHBhcnRzWzFdO1xuICAgICAgICAgICAgY29uc3QgY29tbWVudCA9IHBhcnRzLnNsaWNlKDIpLmpvaW4oJyAnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleURhdGEubGVuZ3RoID4gNDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSBrZXlEYXRhLnN1YnN0cmluZygwLCAyMCkgKyAnLi4uJyArIGtleURhdGEuc3Vic3RyaW5nKGtleURhdGEubGVuZ3RoIC0gMTUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBgJHtrZXlUeXBlfSAke3RydW5jYXRlZH0gJHtjb21tZW50fWAudHJpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ga2V5O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVHJ1bmNhdGUgY2VydGlmaWNhdGUgZm9yIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2VydCAtIEZ1bGwgY2VydGlmaWNhdGVcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRydW5jYXRlZCBjZXJ0aWZpY2F0ZSBpbiBzaW5nbGUgbGluZSBmb3JtYXRcbiAgICAgKi9cbiAgICB0cnVuY2F0ZUNlcnRpZmljYXRlKGNlcnQpIHtcbiAgICAgICAgaWYgKCFjZXJ0IHx8IGNlcnQubGVuZ3RoIDwgMTAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2VydDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbGluZXMgPSBjZXJ0LnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRyYWN0IGZpcnN0IGFuZCBsYXN0IG1lYW5pbmdmdWwgbGluZXNcbiAgICAgICAgY29uc3QgZmlyc3RMaW5lID0gbGluZXNbMF0gfHwgJyc7XG4gICAgICAgIGNvbnN0IGxhc3RMaW5lID0gbGluZXNbbGluZXMubGVuZ3RoIC0gMV0gfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgY2VydGlmaWNhdGVzLCBzaG93IGJlZ2luIGFuZCBlbmQgbWFya2Vyc1xuICAgICAgICBpZiAoZmlyc3RMaW5lLmluY2x1ZGVzKCdCRUdJTiBDRVJUSUZJQ0FURScpKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7Zmlyc3RMaW5lfS4uLiR7bGFzdExpbmV9YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIG90aGVyIGZvcm1hdHMsIHRydW5jYXRlIHRoZSBjb250ZW50XG4gICAgICAgIGNvbnN0IGNsZWFuQ2VydCA9IGNlcnQucmVwbGFjZSgvXFxuL2csICcgJykudHJpbSgpO1xuICAgICAgICBpZiAoY2xlYW5DZXJ0Lmxlbmd0aCA+IDgwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2xlYW5DZXJ0LnN1YnN0cmluZygwLCA0MCkgKyAnLi4uJyArIGNsZWFuQ2VydC5zdWJzdHJpbmcoY2xlYW5DZXJ0Lmxlbmd0aCAtIDMwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNsZWFuQ2VydDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIGZvciBzYWZlIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gZXNjYXBlXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgbWFwID0ge1xuICAgICAgICAgICAgJyYnOiAnJmFtcDsnLFxuICAgICAgICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAgICAgICAnPic6ICcmZ3Q7JyxcbiAgICAgICAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgICAgICAgXCInXCI6ICcmIzAzOTsnXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoL1smPD5cIiddL2csIG0gPT4gbWFwW21dKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3csIGhpZGUgc3NoIHBhc3N3b3JkIHNlZ21lbnQgYWNjb3JkaW5nIHRvIHRoZSB2YWx1ZSBvZiB1c2UgU1NIIHBhc3N3b3JkIGNoZWNrYm94LlxuICAgICAqL1xuICAgIHNob3dIaWRlU1NIUGFzc3dvcmQoKXtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmRTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmRTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIFByZXBhcmVzIGRhdGEgZm9yIFJFU1QgQVBJIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW4gdXAgdW5uZWNlc3NhcnkgZmllbGRzIGJlZm9yZSBzZW5kaW5nXG4gICAgICAgIGNvbnN0IGZpZWxkc1RvUmVtb3ZlID0gW1xuICAgICAgICAgICAgJ2RpcnJ0eScsXG4gICAgICAgICAgICAnZGVsZXRlQWxsSW5wdXQnLFxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGNvZGVjXyogZmllbGRzICh0aGV5J3JlIHJlcGxhY2VkIHdpdGggdGhlIGNvZGVjcyBhcnJheSlcbiAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0LmRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnY29kZWNfJykgfHwgZmllbGRzVG9SZW1vdmUuaW5jbHVkZXMoa2V5KSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3QgY29kZWMgZGF0YSAtIG9ubHkgaW5jbHVkZSBpZiBjaGFuZ2VkXG4gICAgICAgIGNvbnN0IGFyckNvZGVjcyA9IFtdO1xuICAgICAgICBsZXQgaGFzQ29kZWNDaGFuZ2VzID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGFsbCBjb2RlYyByb3dzXG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUgLmNvZGVjLXJvdywgI3ZpZGVvLWNvZGVjcy10YWJsZSAuY29kZWMtcm93JykuZWFjaCgoY3VycmVudEluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNvZGVjTmFtZSA9ICQob2JqKS5hdHRyKCdkYXRhLWNvZGVjLW5hbWUnKTtcbiAgICAgICAgICAgIGlmIChjb2RlY05hbWUgJiYgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZVtjb2RlY05hbWVdKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWwgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkub3JpZ2luYWxDb2RlY1N0YXRlW2NvZGVjTmFtZV07XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudERpc2FibGVkID0gJChvYmopLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBwb3NpdGlvbiBvciBkaXNhYmxlZCBzdGF0ZSBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRJbmRleCAhPT0gb3JpZ2luYWwucHJpb3JpdHkgfHwgY3VycmVudERpc2FibGVkICE9PSBvcmlnaW5hbC5kaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBoYXNDb2RlY0NoYW5nZXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBhcnJDb2RlY3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvZGVjTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGN1cnJlbnREaXNhYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IGN1cnJlbnRJbmRleCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBPbmx5IGluY2x1ZGUgY29kZWNzIGlmIHRoZXJlIHdlcmUgY2hhbmdlc1xuICAgICAgICBpZiAoaGFzQ29kZWNDaGFuZ2VzKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5jb2RlY3MgPSBhcnJDb2RlY3M7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEhhbmRsZXMgUkVTVCBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgICQoXCIjZXJyb3ItbWVzc2FnZXNcIikucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmU6IHsgcmVzdWx0OiBib29sLCBkYXRhOiB7fSwgbWVzc2FnZXM6IHt9IH1cbiAgICAgICAgaWYgKCFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5nZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwocmVzcG9uc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIGZpZWxkcyB0byBoaWRkZW4gdmFsdWUgb24gc3VjY2Vzc1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZFJlcGVhdCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkJywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnU1NIUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgcGFzc3dvcmQgdmFsaWRhdGlvbiB3YXJuaW5ncyBhZnRlciBzdWNjZXNzZnVsIHNhdmVcbiAgICAgICAgICAgICQoJy5wYXNzd29yZC12YWxpZGF0ZScpLmZhZGVPdXQoMzAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGRlbGV0ZSBhbGwgY29uZGl0aW9ucyBpZiBuZWVkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY2hlY2tEZWxldGVDb25kaXRpb25zKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgZXJyb3IgbWVzc2FnZSBIVE1MIGZyb20gUkVTVCBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2Ugd2l0aCBlcnJvciBtZXNzYWdlc1xuICAgICAqL1xuICAgIGdlbmVyYXRlRXJyb3JNZXNzYWdlSHRtbChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkaXYgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICd1aSBuZWdhdGl2ZSBtZXNzYWdlJywgaWQ6ICdlcnJvci1tZXNzYWdlcycgfSk7XG4gICAgICAgICAgICBjb25zdCAkaGVhZGVyID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAnaGVhZGVyJyB9KS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5nc19FcnJvclNhdmVTZXR0aW5ncyk7XG4gICAgICAgICAgICAkZGl2LmFwcGVuZCgkaGVhZGVyKTtcbiAgICAgICAgICAgIGNvbnN0ICR1bCA9ICQoJzx1bD4nLCB7IGNsYXNzOiAnbGlzdCcgfSk7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlc1NldCA9IG5ldyBTZXQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIGJvdGggZXJyb3IgYW5kIHZhbGlkYXRpb24gbWVzc2FnZSB0eXBlc1xuICAgICAgICAgICAgWydlcnJvcicsICd2YWxpZGF0aW9uJ10uZm9yRWFjaChtc2dUeXBlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZXMgPSBBcnJheS5pc0FycmF5KHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdKSBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gcmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV0gXG4gICAgICAgICAgICAgICAgICAgICAgICA6IFtyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXV07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlcy5mb3JFYWNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZXh0Q29udGVudCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiYgZXJyb3IubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50ID0gZ2xvYmFsVHJhbnNsYXRlW2Vycm9yLm1lc3NhZ2VdIHx8IGVycm9yLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRDb250ZW50ID0gZ2xvYmFsVHJhbnNsYXRlW2Vycm9yXSB8fCBlcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtZXNzYWdlc1NldC5oYXModGV4dENvbnRlbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXNTZXQuYWRkKHRleHRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkdWwuYXBwZW5kKCQoJzxsaT4nKS50ZXh0KHRleHRDb250ZW50KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkZGl2LmFwcGVuZCgkdWwpO1xuICAgICAgICAgICAgJCgnI3N1Ym1pdGJ1dHRvbicpLmJlZm9yZSgkZGl2KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSB2YWxpZGF0aW9uIHJ1bGVzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgaW5pdFJ1bGVzKCkge1xuICAgICAgICAvLyBTU0hQYXNzd29yZFxuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRkaXNhYmxlU1NIUGFzc3dvcmQuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzO1xuICAgICAgICB9IGVsc2UgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQudmFsKCkgPT09IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2ViQWRtaW5QYXNzd29yZFxuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5XZWJBZG1pblBhc3N3b3JkLnJ1bGVzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuV2ViQWRtaW5QYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS53ZWJBZG1pblBhc3N3b3JkUnVsZXM7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIGNlcnRpZmljYXRlIGRldGFpbHMgSFRNTFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjZXJ0SW5mbyAtIENlcnRpZmljYXRlIGluZm9ybWF0aW9uIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgZm9yIGNlcnRpZmljYXRlIGRldGFpbHNcbiAgICAgKi9cbiAgICByZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMoY2VydEluZm8pIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cImNlcnQtZGV0YWlsc1wiIHN0eWxlPVwiZGlzcGxheTpub25lOyBtYXJnaW4tdG9wOjEwcHg7XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgdGlueSBsaXN0XCI+JztcbiAgICAgICAgXG4gICAgICAgIC8vIFN1YmplY3RcbiAgICAgICAgaWYgKGNlcnRJbmZvLnN1YmplY3QpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5TdWJqZWN0Ojwvc3Ryb25nPiAke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGNlcnRJbmZvLnN1YmplY3QpfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElzc3VlclxuICAgICAgICBpZiAoY2VydEluZm8uaXNzdWVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+SXNzdWVyOjwvc3Ryb25nPiAke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKGNlcnRJbmZvLmlzc3Vlcil9YDtcbiAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19zZWxmX3NpZ25lZCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJyA8c3BhbiBjbGFzcz1cInVpIHRpbnkgbGFiZWxcIj5TZWxmLXNpZ25lZDwvc3Bhbj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVmFsaWRpdHkgcGVyaW9kXG4gICAgICAgIGlmIChjZXJ0SW5mby52YWxpZF9mcm9tICYmIGNlcnRJbmZvLnZhbGlkX3RvKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+VmFsaWQ6PC9zdHJvbmc+ICR7Y2VydEluZm8udmFsaWRfZnJvbX0gdG8gJHtjZXJ0SW5mby52YWxpZF90b308L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeHBpcnkgc3RhdHVzXG4gICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSByZWQgbGFiZWxcIj5DZXJ0aWZpY2F0ZSBFeHBpcmVkPC9zcGFuPjwvZGl2Pic7XG4gICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IHllbGxvdyBsYWJlbFwiPkV4cGlyZXMgaW4gJHtjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeX0gZGF5czwvc3Bhbj48L2Rpdj5gO1xuICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5ID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgZ3JlZW4gbGFiZWxcIj5WYWxpZCBmb3IgJHtjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeX0gZGF5czwvc3Bhbj48L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJqZWN0IEFsdGVybmF0aXZlIE5hbWVzXG4gICAgICAgIGlmIChjZXJ0SW5mby5zYW4gJiYgY2VydEluZm8uc2FuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz5BbHRlcm5hdGl2ZSBOYW1lczo8L3N0cm9uZz4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHRpbnkgbGlzdFwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6MTBweDtcIj4nO1xuICAgICAgICAgICAgY2VydEluZm8uc2FuLmZvckVhY2goc2FuID0+IHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoc2FuKX08L2Rpdj5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBsaXN0XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIHNlZ21lbnRcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2UgY2VydC1kZXRhaWxzXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgUEJYTGFuZ3VhZ2UgY2hhbmdlIGRldGVjdGlvbiBmb3IgcmVzdGFydCB3YXJuaW5nXG4gICAgICogU2hvd3MgcmVzdGFydCB3YXJuaW5nIG9ubHkgd2hlbiB0aGUgbGFuZ3VhZ2UgdmFsdWUgY2hhbmdlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmcoKSB7XG4gICAgICAgIGNvbnN0ICRsYW5ndWFnZURyb3Bkb3duID0gJCgnI1BCWExhbmd1YWdlJyk7XG4gICAgICAgIGNvbnN0ICRyZXN0YXJ0V2FybmluZyA9ICQoJyNyZXN0YXJ0LXdhcm5pbmctUEJYTGFuZ3VhZ2UnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIHZhbHVlXG4gICAgICAgIGxldCBvcmlnaW5hbFZhbHVlID0gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBvcmlnaW5hbCB2YWx1ZSBhZnRlciBkYXRhIGxvYWRzXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdHZW5lcmFsU2V0dGluZ3MuZGF0YUxvYWRlZCcsICgpID0+IHtcbiAgICAgICAgICAgIG9yaWdpbmFsVmFsdWUgPSAkbGFuZ3VhZ2VEcm9wZG93bi52YWwoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZHJvcGRvd24gY2hhbmdlIGV2ZW50XG4gICAgICAgICRsYW5ndWFnZURyb3Bkb3duLmNsb3Nlc3QoJy5kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHdhcm5pbmcgaWYgdmFsdWUgY2hhbmdlZCBmcm9tIG9yaWdpbmFsXG4gICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsVmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IG9yaWdpbmFsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJlc3RhcnRXYXJuaW5nLnRyYW5zaXRpb24oJ2ZhZGUgaW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkcmVzdGFydFdhcm5pbmcudHJhbnNpdGlvbignZmFkZSBvdXQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSBkZXRlY3Rpb25cbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBSRVNUIEFQSSBtb2RlXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gR2VuZXJhbFNldHRpbmdzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVNldHRpbmdzJztcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb24gZm9yIGNsZWFuZXIgQVBJIHJlcXVlc3RzXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIE5vIHJlZGlyZWN0IGFmdGVyIHNhdmUgLSBzdGF5IG9uIHRoZSBzYW1lIHBhZ2VcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gbnVsbDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IG51bGw7XG4gICAgICAgIEZvcm0udXJsID0gYCNgO1xuICAgICAgICBcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBnZW5lcmFsU2V0dGluZ3MgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==