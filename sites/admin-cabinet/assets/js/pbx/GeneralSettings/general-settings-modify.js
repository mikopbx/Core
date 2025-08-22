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

/* global globalRootUrl,globalTranslate, Form, PasswordScore, PbxApi, UserMessage, SoundFilesSelector, GeneralSettingsAPI, ClipboardJS, PasswordWidget, PasswordValidationAPI, GeneralSettingsTooltipManager, $ */

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
    SoundFilesSelector.initializeWithIcons(generalSettingsModify.soundFileFields.announcementIn, function () {
      Form.dataChanged();
    }); // Initialize outgoing announcement selector

    SoundFilesSelector.initializeWithIcons(generalSettingsModify.soundFileFields.announcementOut, function () {
      Form.dataChanged();
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
        SoundFilesSelector.setInitialValueWithIcon(generalSettingsModify.soundFileFields.announcementIn, settings.PBXRecordAnnouncementIn, announcementInRepresent);
      } else {
        $(".".concat(generalSettingsModify.soundFileFields.announcementIn, "-select")).dropdown('set selected', settings.PBXRecordAnnouncementIn);
      }
    } // Load outgoing announcement sound file


    if (settings.PBXRecordAnnouncementOut) {
      var announcementOutRepresent = settings.PBXRecordAnnouncementOut_Represent || settings.PBXRecordAnnouncementOutRepresent;

      if (announcementOutRepresent) {
        SoundFilesSelector.setInitialValueWithIcon(generalSettingsModify.soundFileFields.announcementOut, settings.PBXRecordAnnouncementOut, announcementOutRepresent);
      } else {
        $(".".concat(generalSettingsModify.soundFileFields.announcementOut, "-select")).dropdown('set selected', settings.PBXRecordAnnouncementOut);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJkYXRhTG9hZGVkIiwidmFsaWRhdGVSdWxlcyIsInBieG5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUiLCJXZWJBZG1pblBhc3N3b3JkIiwiV2ViQWRtaW5QYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJTU0hQYXNzd29yZCIsIlNTSFBhc3N3b3JkUmVwZWF0IiwiZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCIsIldFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlIiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCIsIldFQkhUVFBTUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0IiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJBSkFNUG9ydCIsImdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlIiwiU0lQQXV0aFByZWZpeCIsImdzX1NJUEF1dGhQcmVmaXhJbnZhbGlkIiwid2ViQWRtaW5QYXNzd29yZFJ1bGVzIiwiZ3NfVmFsaWRhdGVFbXB0eVdlYlBhc3N3b3JkIiwiZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQiLCJ2YWx1ZSIsImdzX1Bhc3N3b3JkcyIsImdzX1Bhc3N3b3JkTm9Mb3dTaW12b2wiLCJnc19QYXNzd29yZE5vTnVtYmVycyIsImdzX1Bhc3N3b3JkTm9VcHBlclNpbXZvbCIsImFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcyIsImdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkIiwiZ3NfU1NIUGFzc3dvcmQiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcyIsImNsaXBib2FyZCIsImluaXRpYWxpemUiLCJsZW5ndGgiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJjb250ZXh0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJ2YWxpZGF0ZU9uSW5wdXQiLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJjaGVja09uTG9hZCIsInNzaFdpZGdldCIsIm9uIiwiaXNEaXNhYmxlZCIsImNoZWNrYm94IiwiaGlkZVdhcm5pbmdzIiwiZWxlbWVudHMiLCIkc2NvcmVTZWN0aW9uIiwiaGlkZSIsImNoZWNrUGFzc3dvcmQiLCJ2YWwiLCJpbml0UnVsZXMiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwibm90IiwiZHJvcGRvd24iLCJpbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3JzIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzIiwiaW5pdGlhbGl6ZUNsaXBib2FyZCIsInNob3dIaWRlU1NIUGFzc3dvcmQiLCJ3aW5kb3ciLCJldmVudCIsIm5hbWVUYWIiLCJHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmciLCJsb2FkRGF0YSIsIlNvdW5kRmlsZXNTZWxlY3RvciIsImluaXRpYWxpemVXaXRoSWNvbnMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJhZGRDbGFzcyIsImNvbnNvbGUiLCJsb2ciLCJHZW5lcmFsU2V0dGluZ3NBUEkiLCJnZXRTZXR0aW5ncyIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwic2V0dGluZ3MiLCJwb3B1bGF0ZUZvcm0iLCJwYXNzd29yZFZhbGlkYXRpb24iLCJzZXRUaW1lb3V0Iiwic2hvd0RlZmF1bHRQYXNzd29yZFdhcm5pbmdzIiwibWVzc2FnZXMiLCJlcnJvciIsInNob3dBcGlFcnJvciIsImNvZGVjcyIsImZvcm0iLCJwb3B1bGF0ZVNwZWNpYWxGaWVsZHMiLCJsb2FkU291bmRGaWxlVmFsdWVzIiwidXBkYXRlQ29kZWNUYWJsZXMiLCJpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJzc2hLZXlzVGFibGUiLCJkb2N1bWVudCIsInRyaWdnZXIiLCJXRUJIVFRQU1B1YmxpY0tleV9pbmZvIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJrZXkiLCIkY2hlY2tib3giLCJpc0NoZWNrZWQiLCIkZHJvcGRvd24iLCJoYXNDbGFzcyIsImVycm9yTWVzc2FnZSIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInZhbGlkYXRpb24iLCJyZW1vdmUiLCJpc0RlZmF1bHRXZWJQYXNzd29yZCIsIiR3ZWJQYXNzd29yZEZpZWxkcyIsImNsb3Nlc3QiLCJ3YXJuaW5nSHRtbCIsImdzX1NldFBhc3N3b3JkIiwiZ3NfU2V0UGFzc3dvcmRJbmZvIiwiYmVmb3JlIiwiaXNEZWZhdWx0U1NIUGFzc3dvcmQiLCJzc2hQYXNzd29yZERpc2FibGVkIiwiJHNzaFBhc3N3b3JkRmllbGRzIiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRJblJlcHJlc2VudCIsIlBCWFJlY29yZEFubm91bmNlbWVudEluX1JlcHJlc2VudCIsIlBCWFJlY29yZEFubm91bmNlbWVudEluUmVwcmVzZW50Iiwic2V0SW5pdGlhbFZhbHVlV2l0aEljb24iLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQiLCJhbm5vdW5jZW1lbnRPdXRSZXByZXNlbnQiLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXRfUmVwcmVzZW50IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0UmVwcmVzZW50IiwiYXVkaW9Db2RlY3MiLCJmaWx0ZXIiLCJjIiwic29ydCIsImEiLCJiIiwicHJpb3JpdHkiLCJ2aWRlb0NvZGVjcyIsImJ1aWxkQ29kZWNUYWJsZSIsInNob3ciLCJpbml0aWFsaXplQ29kZWNEcmFnRHJvcCIsIiR0YWJsZUJvZHkiLCJlbXB0eSIsImNvZGVjIiwiaW5kZXgiLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGVja2VkIiwicm93SHRtbCIsImVzY2FwZUh0bWwiLCJkZXNjcmlwdGlvbiIsImFwcGVuZCIsIm9uQ2hhbmdlIiwidGFibGVEbkQiLCJvbkRyYWdDbGFzcyIsImRyYWdIYW5kbGUiLCJvbkRyb3AiLCJpbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCIsIiRjZXJ0UHViS2V5RmllbGQiLCJmdWxsVmFsdWUiLCIkY29udGFpbmVyIiwiY2VydEluZm8iLCJkaXNwbGF5VGV4dCIsInBhcnRzIiwic3ViamVjdCIsInB1c2giLCJpc3N1ZXIiLCJpc19zZWxmX3NpZ25lZCIsInZhbGlkX3RvIiwiaXNfZXhwaXJlZCIsImRheXNfdW50aWxfZXhwaXJ5IiwidHJ1bmNhdGVDZXJ0aWZpY2F0ZSIsInN0YXR1c0NsYXNzIiwiZGlzcGxheUh0bWwiLCJidF9Ub29sVGlwQ29weUNlcnQiLCJidF9Ub29sVGlwQ2VydEluZm8iLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBEZWxldGUiLCJyZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMiLCJnc19QYXN0ZVB1YmxpY0NlcnQiLCJidF9TYXZlIiwiYnRfQ2FuY2VsIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGRldGFpbHMiLCJzbGlkZVRvZ2dsZSIsImZvY3VzIiwibmV3VmFsdWUiLCJjaGVja1ZhbHVlcyIsInBvcHVwIiwiZGVzdHJveSIsImF0dHIiLCJvZmYiLCIkc3NoUHViS2V5RmllbGQiLCJ0cnVuY2F0ZWQiLCJ0cnVuY2F0ZVNTSEtleSIsImJ0X1Rvb2xUaXBDb3B5S2V5IiwiYnRfVG9vbFRpcEV4cGFuZCIsIiRmdWxsRGlzcGxheSIsIiR0cnVuY2F0ZWREaXNwbGF5IiwiJGljb24iLCJpcyIsImdzX05vU1NIUHVibGljS2V5IiwiJGNlcnRQcml2S2V5RmllbGQiLCJjdXJyZW50VmFsdWUiLCJoYXNWYWx1ZSIsImdzX1ByaXZhdGVLZXlJc1NldCIsImdzX1JlcGxhY2UiLCJnc19QYXN0ZVByaXZhdGVLZXkiLCIkbmV3RmllbGQiLCJDbGlwYm9hcmRKUyIsIiRidG4iLCJvcmlnaW5hbEljb24iLCJjbGVhclNlbGVjdGlvbiIsImdzX0NvcHlGYWlsZWQiLCJzcGxpdCIsImtleVR5cGUiLCJrZXlEYXRhIiwiY29tbWVudCIsInNsaWNlIiwic3Vic3RyaW5nIiwidHJpbSIsImNlcnQiLCJsaW5lcyIsImxpbmUiLCJmaXJzdExpbmUiLCJsYXN0TGluZSIsImluY2x1ZGVzIiwiY2xlYW5DZXJ0IiwicmVwbGFjZSIsInRleHQiLCJtYXAiLCJtIiwiY2JCZWZvcmVTZW5kRm9ybSIsImZpZWxkc1RvUmVtb3ZlIiwic3RhcnRzV2l0aCIsImFyckNvZGVjcyIsImhhc0NvZGVjQ2hhbmdlcyIsImVhY2giLCJjdXJyZW50SW5kZXgiLCJvYmoiLCJjb2RlY05hbWUiLCJvcmlnaW5hbCIsImN1cnJlbnREaXNhYmxlZCIsImNiQWZ0ZXJTZW5kRm9ybSIsIiRzdWJtaXRCdXR0b24iLCJnZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwiLCJmYWRlT3V0IiwiZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsIiwiY2hlY2tEZWxldGVDb25kaXRpb25zIiwiJGRpdiIsImlkIiwiJGhlYWRlciIsImdzX0Vycm9yU2F2ZVNldHRpbmdzIiwiJHVsIiwibWVzc2FnZXNTZXQiLCJTZXQiLCJtc2dUeXBlIiwidGV4dENvbnRlbnQiLCJtZXNzYWdlIiwiaGFzIiwiYWRkIiwiaHRtbCIsInZhbGlkX2Zyb20iLCJzYW4iLCIkbGFuZ3VhZ2VEcm9wZG93biIsIiRyZXN0YXJ0V2FybmluZyIsIm9yaWdpbmFsVmFsdWUiLCJ0cmFuc2l0aW9uIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwidXJsIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUdBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHFCQUFxQixHQUFHO0FBQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHdCQUFELENBTGU7O0FBTzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFRCxDQUFDLENBQUMsbUJBQUQsQ0FYTTs7QUFhMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsWUFBWSxFQUFFRixDQUFDLENBQUMsY0FBRCxDQWpCVzs7QUFtQjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLG1CQUFtQixFQUFFSCxDQUFDLENBQUMsMkJBQUQsQ0FBRCxDQUErQkksTUFBL0IsQ0FBc0MsV0FBdEMsQ0F2Qks7O0FBeUIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxtQkFBbUIsRUFBRUwsQ0FBQyxDQUFDLDJCQUFELENBN0JJOztBQStCMUI7QUFDSjtBQUNBO0FBQ0lNLEVBQUFBLGNBQWMsRUFBRSxTQWxDVTs7QUFvQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGVBQWUsRUFBRTtBQUNiQyxJQUFBQSxjQUFjLEVBQUUseUJBREg7QUFFYkMsSUFBQUEsZUFBZSxFQUFFO0FBRkosR0F4Q1M7O0FBNkMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRSxFQWpETTs7QUFtRDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxLQXZEYzs7QUF5RDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQUU7QUFDYkMsSUFBQUEsT0FBTyxFQUFFO0FBQ0xDLE1BQUFBLFVBQVUsRUFBRSxTQURQO0FBRUxDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkYsS0FERTtBQVVYQyxJQUFBQSxnQkFBZ0IsRUFBRTtBQUNkTixNQUFBQSxVQUFVLEVBQUUsa0JBREU7QUFFZEMsTUFBQUEsS0FBSyxFQUFFO0FBRk8sS0FWUDtBQWNYTSxJQUFBQSxzQkFBc0IsRUFBRTtBQUNwQlAsTUFBQUEsVUFBVSxFQUFFLHdCQURRO0FBRXBCQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUseUJBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNJO0FBRjVCLE9BREc7QUFGYSxLQWRiO0FBdUJYQyxJQUFBQSxXQUFXLEVBQUU7QUFDVFQsTUFBQUEsVUFBVSxFQUFFLGFBREg7QUFFVEMsTUFBQUEsS0FBSyxFQUFFO0FBRkUsS0F2QkY7QUEyQlhTLElBQUFBLGlCQUFpQixFQUFFO0FBQ2ZWLE1BQUFBLFVBQVUsRUFBRSxtQkFERztBQUVmQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsb0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNPO0FBRjVCLE9BREc7QUFGUSxLQTNCUjtBQW9DWEMsSUFBQUEsT0FBTyxFQUFFO0FBQ0xaLE1BQUFBLFVBQVUsRUFBRSxTQURQO0FBRUxDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxtQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1M7QUFGNUIsT0FERyxFQUtIO0FBQ0lYLFFBQUFBLElBQUksRUFBRSx5QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1U7QUFGNUIsT0FMRyxFQVNIO0FBQ0laLFFBQUFBLElBQUksRUFBRSx3QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1c7QUFGNUIsT0FURyxFQWFIO0FBQ0liLFFBQUFBLElBQUksRUFBRSxxQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ1k7QUFGNUIsT0FiRztBQUZGLEtBcENFO0FBeURYQyxJQUFBQSxZQUFZLEVBQUU7QUFDVmpCLE1BQUFBLFVBQVUsRUFBRSxjQURGO0FBRVZDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxtQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2M7QUFGNUIsT0FERyxFQUtIO0FBQ0loQixRQUFBQSxJQUFJLEVBQUUsb0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNVO0FBRjVCLE9BTEcsRUFTSDtBQUNJWixRQUFBQSxJQUFJLEVBQUUsd0JBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNlO0FBRjVCLE9BVEcsRUFhSDtBQUNJakIsUUFBQUEsSUFBSSxFQUFFLHFCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDZ0I7QUFGNUIsT0FiRztBQUZHLEtBekRIO0FBOEVYQyxJQUFBQSxRQUFRLEVBQUU7QUFDTnJCLE1BQUFBLFVBQVUsRUFBRSxVQUROO0FBRU5DLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxtQkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2tCO0FBRjVCLE9BREcsRUFLSDtBQUNJcEIsUUFBQUEsSUFBSSxFQUFFLHdCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDa0I7QUFGNUIsT0FMRztBQUZELEtBOUVDO0FBMkZYQyxJQUFBQSxhQUFhLEVBQUU7QUFDWHZCLE1BQUFBLFVBQVUsRUFBRSxlQUREO0FBRVhDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSx1QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ29CO0FBRjVCLE9BREc7QUFGSTtBQTNGSixHQTlEVztBQW9LMUI7QUFDQUMsRUFBQUEscUJBQXFCLEVBQUUsQ0FDbkI7QUFDSXZCLElBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDc0I7QUFGNUIsR0FEbUIsRUFLbkI7QUFDSXhCLElBQUFBLElBQUksRUFBRSxjQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDdUI7QUFGNUIsR0FMbUIsRUFTbkI7QUFDSXpCLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsT0FGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ3lCLFlBQXhCLEdBQXVDLFFBQXZDLEdBQWtEekIsZUFBZSxDQUFDMEI7QUFIOUUsR0FUbUIsRUFjbkI7QUFDSTVCLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsSUFGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ3lCLFlBQXhCLEdBQXVDLFFBQXZDLEdBQWtEekIsZUFBZSxDQUFDMkI7QUFIOUUsR0FkbUIsRUFtQm5CO0FBQ0k3QixJQUFBQSxJQUFJLEVBQUUsV0FEVjtBQUVJMEIsSUFBQUEsS0FBSyxFQUFFLE9BRlg7QUFHSXpCLElBQUFBLE1BQU0sRUFBRSxRQUFRQyxlQUFlLENBQUN5QixZQUF4QixHQUF1QyxRQUF2QyxHQUFrRHpCLGVBQWUsQ0FBQzRCO0FBSDlFLEdBbkJtQixDQXJLRztBQThMMUI7QUFDQUMsRUFBQUEsMkJBQTJCLEVBQUUsQ0FDekI7QUFDSS9CLElBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDOEI7QUFGNUIsR0FEeUIsRUFLekI7QUFDSWhDLElBQUFBLElBQUksRUFBRSxjQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDK0I7QUFGNUIsR0FMeUIsRUFTekI7QUFDSWpDLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsT0FGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ2dDLGNBQXhCLEdBQXlDLFFBQXpDLEdBQW9EaEMsZUFBZSxDQUFDMEI7QUFIaEYsR0FUeUIsRUFjekI7QUFDSTVCLElBQUFBLElBQUksRUFBRSxXQURWO0FBRUkwQixJQUFBQSxLQUFLLEVBQUUsSUFGWDtBQUdJekIsSUFBQUEsTUFBTSxFQUFFLFFBQVFDLGVBQWUsQ0FBQ2dDLGNBQXhCLEdBQXlDLFFBQXpDLEdBQW9EaEMsZUFBZSxDQUFDMkI7QUFIaEYsR0FkeUIsRUFtQnpCO0FBQ0k3QixJQUFBQSxJQUFJLEVBQUUsV0FEVjtBQUVJMEIsSUFBQUEsS0FBSyxFQUFFLE9BRlg7QUFHSXpCLElBQUFBLE1BQU0sRUFBRSxRQUFRQyxlQUFlLENBQUNnQyxjQUF4QixHQUF5QyxRQUF6QyxHQUFvRGhDLGVBQWUsQ0FBQzRCO0FBSGhGLEdBbkJ5QixDQS9MSDtBQXlOMUI7QUFDQUssRUFBQUEsNkJBQTZCLEVBQUUsQ0FDM0I7QUFDSW5DLElBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDOEI7QUFGNUIsR0FEMkIsRUFLM0I7QUFDSWhDLElBQUFBLElBQUksRUFBRSxjQURWO0FBRUlDLElBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDK0I7QUFGNUIsR0FMMkIsQ0ExTkw7O0FBcU8xQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxTQUFTLEVBQUUsSUF6T2U7O0FBMk8xQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUE5TzBCLHdCQThPYjtBQUVUO0FBQ0E7QUFDQSxRQUFJdkQscUJBQXFCLENBQUNHLGlCQUF0QixDQUF3Q3FELE1BQXhDLEdBQWlELENBQXJELEVBQXdEO0FBQ3BEQyxNQUFBQSxjQUFjLENBQUNDLElBQWYsQ0FBb0IxRCxxQkFBcUIsQ0FBQ0csaUJBQTFDLEVBQTZEO0FBQ3pEd0QsUUFBQUEsT0FBTyxFQUFFLGFBRGdEO0FBRXpEQyxRQUFBQSxjQUFjLEVBQUUsS0FGeUM7QUFFMUI7QUFDL0JDLFFBQUFBLGtCQUFrQixFQUFFLEtBSHFDO0FBRzFCO0FBQy9CQyxRQUFBQSxlQUFlLEVBQUUsS0FKd0M7QUFJekI7QUFDaENDLFFBQUFBLGVBQWUsRUFBRSxJQUx3QztBQU16REMsUUFBQUEsZUFBZSxFQUFFLElBTndDO0FBT3pEQyxRQUFBQSxZQUFZLEVBQUUsSUFQMkM7QUFRekRDLFFBQUFBLFdBQVcsRUFBRTtBQVI0QyxPQUE3RDtBQVVILEtBZlEsQ0FpQlQ7OztBQUNBLFFBQUlsRSxxQkFBcUIsQ0FBQ0ksWUFBdEIsQ0FBbUNvRCxNQUFuQyxHQUE0QyxDQUFoRCxFQUFtRDtBQUMvQyxVQUFNVyxTQUFTLEdBQUdWLGNBQWMsQ0FBQ0MsSUFBZixDQUFvQjFELHFCQUFxQixDQUFDSSxZQUExQyxFQUF3RDtBQUN0RXVELFFBQUFBLE9BQU8sRUFBRSxhQUQ2RDtBQUV0RUMsUUFBQUEsY0FBYyxFQUFFLEtBRnNEO0FBRXZDO0FBQy9CQyxRQUFBQSxrQkFBa0IsRUFBRSxLQUhrRDtBQUd2QztBQUMvQkMsUUFBQUEsZUFBZSxFQUFFLEtBSnFEO0FBSXRDO0FBQ2hDQyxRQUFBQSxlQUFlLEVBQUUsSUFMcUQ7QUFNdEVDLFFBQUFBLGVBQWUsRUFBRSxJQU5xRDtBQU90RUMsUUFBQUEsWUFBWSxFQUFFLElBUHdEO0FBUXRFQyxRQUFBQSxXQUFXLEVBQUU7QUFSeUQsT0FBeEQsQ0FBbEIsQ0FEK0MsQ0FZL0M7O0FBQ0FoRSxNQUFBQSxDQUFDLENBQUMsMkJBQUQsQ0FBRCxDQUErQmtFLEVBQS9CLENBQWtDLFFBQWxDLEVBQTRDLFlBQU07QUFDOUMsWUFBTUMsVUFBVSxHQUFHbkUsQ0FBQyxDQUFDLDJCQUFELENBQUQsQ0FBK0JvRSxRQUEvQixDQUF3QyxZQUF4QyxDQUFuQjs7QUFDQSxZQUFJRCxVQUFVLElBQUlGLFNBQWxCLEVBQTZCO0FBQ3pCVixVQUFBQSxjQUFjLENBQUNjLFlBQWYsQ0FBNEJKLFNBQTVCOztBQUNBLGNBQUlBLFNBQVMsQ0FBQ0ssUUFBVixDQUFtQkMsYUFBdkIsRUFBc0M7QUFDbENOLFlBQUFBLFNBQVMsQ0FBQ0ssUUFBVixDQUFtQkMsYUFBbkIsQ0FBaUNDLElBQWpDO0FBQ0g7QUFDSixTQUxELE1BS08sSUFBSSxDQUFDTCxVQUFELElBQWVGLFNBQW5CLEVBQThCO0FBQ2pDVixVQUFBQSxjQUFjLENBQUNrQixhQUFmLENBQTZCUixTQUE3QjtBQUNIO0FBQ0osT0FWRDtBQVdILEtBMUNRLENBNENUOzs7QUFDQW5FLElBQUFBLHFCQUFxQixDQUFDRyxpQkFBdEIsQ0FBd0NpRSxFQUF4QyxDQUEyQyxRQUEzQyxFQUFxRCxZQUFNO0FBQ3ZELFVBQUlwRSxxQkFBcUIsQ0FBQ0csaUJBQXRCLENBQXdDeUUsR0FBeEMsT0FBa0Q1RSxxQkFBcUIsQ0FBQ1EsY0FBNUUsRUFBNEY7QUFDeEZSLFFBQUFBLHFCQUFxQixDQUFDNkUsU0FBdEI7QUFDSDtBQUNKLEtBSkQ7QUFNQTdFLElBQUFBLHFCQUFxQixDQUFDSSxZQUF0QixDQUFtQ2dFLEVBQW5DLENBQXNDLFFBQXRDLEVBQWdELFlBQU07QUFDbEQsVUFBSXBFLHFCQUFxQixDQUFDSSxZQUF0QixDQUFtQ3dFLEdBQW5DLE9BQTZDNUUscUJBQXFCLENBQUNRLGNBQXZFLEVBQXVGO0FBQ25GUixRQUFBQSxxQkFBcUIsQ0FBQzZFLFNBQXRCO0FBQ0g7QUFDSixLQUpELEVBbkRTLENBeURUOztBQUNBM0UsSUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEI0RSxJQUE1QixDQUFpQyxPQUFqQyxFQUEwQ0MsR0FBMUMsQ0FBOEM7QUFDMUNDLE1BQUFBLE9BQU8sRUFBRSxJQURpQztBQUUxQ0MsTUFBQUEsV0FBVyxFQUFFO0FBRjZCLEtBQTlDLEVBMURTLENBK0RUOztBQUNBL0UsSUFBQUEsQ0FBQyxDQUFDLGtDQUFELENBQUQsQ0FBc0NnRixHQUF0QyxDQUEwQyx1QkFBMUMsRUFBbUVDLFFBQW5FLEdBaEVTLENBa0VUOztBQUNBakYsSUFBQUEsQ0FBQyxDQUFDLGtDQUFELENBQUQsQ0FBc0NvRSxRQUF0QyxHQW5FUyxDQXFFVDtBQUNBO0FBRUE7O0FBQ0F0RSxJQUFBQSxxQkFBcUIsQ0FBQ29GLDRCQUF0QixHQXpFUyxDQTJFVDs7QUFDQXBGLElBQUFBLHFCQUFxQixDQUFDcUYsY0FBdEIsR0E1RVMsQ0E4RVQ7QUFFQTs7QUFDQXJGLElBQUFBLHFCQUFxQixDQUFDc0YseUJBQXRCLEdBakZTLENBbUZUOztBQUNBdEYsSUFBQUEscUJBQXFCLENBQUN1RixtQkFBdEIsR0FwRlMsQ0FzRlQ7O0FBQ0F2RixJQUFBQSxxQkFBcUIsQ0FBQzZFLFNBQXRCLEdBdkZTLENBeUZUOztBQUNBN0UsSUFBQUEscUJBQXFCLENBQUNLLG1CQUF0QixDQUEwQ2lFLFFBQTFDLENBQW1EO0FBQy9DLGtCQUFZdEUscUJBQXFCLENBQUN3RjtBQURhLEtBQW5EO0FBR0F4RixJQUFBQSxxQkFBcUIsQ0FBQ3dGLG1CQUF0QixHQTdGUyxDQStGVDs7QUFDQXRGLElBQUFBLENBQUMsQ0FBQ3VGLE1BQUQsQ0FBRCxDQUFVckIsRUFBVixDQUFhLGdCQUFiLEVBQStCLFVBQUNzQixLQUFELEVBQVFDLE9BQVIsRUFBb0I7QUFDL0N6RixNQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0QjRFLElBQTVCLENBQWlDLE9BQWpDLEVBQTBDQyxHQUExQyxDQUE4QyxZQUE5QyxFQUE0RFksT0FBNUQ7QUFDSCxLQUZELEVBaEdTLENBb0dUOztBQUNBLFFBQUksT0FBT0MsNkJBQVAsS0FBeUMsV0FBN0MsRUFBMEQ7QUFDdERBLE1BQUFBLDZCQUE2QixDQUFDckMsVUFBOUI7QUFDSCxLQXZHUSxDQXlHVDs7O0FBQ0F2RCxJQUFBQSxxQkFBcUIsQ0FBQzZGLDRCQUF0QixHQTFHUyxDQTRHVDs7QUFDQTdGLElBQUFBLHFCQUFxQixDQUFDOEYsUUFBdEI7QUFDSCxHQTVWeUI7O0FBOFYxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVYsRUFBQUEsNEJBcFcwQiwwQ0FvV0s7QUFDM0I7QUFDQVcsSUFBQUEsa0JBQWtCLENBQUNDLG1CQUFuQixDQUNJaEcscUJBQXFCLENBQUNTLGVBQXRCLENBQXNDQyxjQUQxQyxFQUVJLFlBQU07QUFDRnVGLE1BQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNILEtBSkwsRUFGMkIsQ0FTM0I7O0FBQ0FILElBQUFBLGtCQUFrQixDQUFDQyxtQkFBbkIsQ0FDSWhHLHFCQUFxQixDQUFDUyxlQUF0QixDQUFzQ0UsZUFEMUMsRUFFSSxZQUFNO0FBQ0ZzRixNQUFBQSxJQUFJLENBQUNDLFdBQUw7QUFDSCxLQUpMO0FBTUgsR0FwWHlCOztBQXNYMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJSixFQUFBQSxRQTNYMEIsc0JBMlhmO0FBQ1A7QUFDQTlGLElBQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQmtHLFFBQS9CLENBQXdDLFNBQXhDO0FBQ0FDLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLHNDQUFaO0FBRUFDLElBQUFBLGtCQUFrQixDQUFDQyxXQUFuQixDQUErQixVQUFDQyxRQUFELEVBQWM7QUFDekN4RyxNQUFBQSxxQkFBcUIsQ0FBQ0MsUUFBdEIsQ0FBK0J3RyxXQUEvQixDQUEyQyxTQUEzQztBQUNBTCxNQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxlQUFaLEVBQTZCRyxRQUE3Qjs7QUFFQSxVQUFJQSxRQUFRLElBQUlBLFFBQVEsQ0FBQ0UsTUFBckIsSUFBK0JGLFFBQVEsQ0FBQ0csSUFBNUMsRUFBa0Q7QUFDOUNQLFFBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLHVCQUFaLEVBQXFDRyxRQUFRLENBQUNHLElBQVQsQ0FBY0MsUUFBbkQsRUFEOEMsQ0FFOUM7O0FBQ0E1RyxRQUFBQSxxQkFBcUIsQ0FBQzZHLFlBQXRCLENBQW1DTCxRQUFRLENBQUNHLElBQTVDO0FBQ0EzRyxRQUFBQSxxQkFBcUIsQ0FBQ2EsVUFBdEIsR0FBbUMsSUFBbkMsQ0FKOEMsQ0FNOUM7O0FBQ0EsWUFBSTJGLFFBQVEsQ0FBQ0csSUFBVCxDQUFjRyxrQkFBbEIsRUFBc0M7QUFDbEM7QUFDQUMsVUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYi9HLFlBQUFBLHFCQUFxQixDQUFDZ0gsMkJBQXRCLENBQWtEUixRQUFRLENBQUNHLElBQVQsQ0FBY0csa0JBQWhFO0FBQ0gsV0FGUyxFQUVQLEdBRk8sQ0FBVjtBQUdIO0FBQ0osT0FiRCxNQWFPLElBQUlOLFFBQVEsSUFBSUEsUUFBUSxDQUFDUyxRQUF6QixFQUFtQztBQUN0Q2IsUUFBQUEsT0FBTyxDQUFDYyxLQUFSLENBQWMsWUFBZCxFQUE0QlYsUUFBUSxDQUFDUyxRQUFyQyxFQURzQyxDQUV0Qzs7QUFDQWpILFFBQUFBLHFCQUFxQixDQUFDbUgsWUFBdEIsQ0FBbUNYLFFBQVEsQ0FBQ1MsUUFBNUM7QUFDSDtBQUNKLEtBdEJEO0FBdUJILEdBdlp5Qjs7QUF5WjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lKLEVBQUFBLFlBN1owQix3QkE2WmJGLElBN1phLEVBNlpQO0FBQ2Y7QUFDQSxRQUFNQyxRQUFRLEdBQUdELElBQUksQ0FBQ0MsUUFBTCxJQUFpQkQsSUFBbEM7QUFDQSxRQUFNUyxNQUFNLEdBQUdULElBQUksQ0FBQ1MsTUFBTCxJQUFlLEVBQTlCLENBSGUsQ0FLZjs7QUFDQXBILElBQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQm9ILElBQS9CLENBQW9DLFlBQXBDLEVBQWtEVCxRQUFsRCxFQU5lLENBUWY7O0FBQ0E1RyxJQUFBQSxxQkFBcUIsQ0FBQ3NILHFCQUF0QixDQUE0Q1YsUUFBNUMsRUFUZSxDQVdmOztBQUNBNUcsSUFBQUEscUJBQXFCLENBQUN1SCxtQkFBdEIsQ0FBMENYLFFBQTFDLEVBWmUsQ0FjZjs7QUFDQSxRQUFJUSxNQUFNLENBQUM1RCxNQUFQLEdBQWdCLENBQXBCLEVBQXVCO0FBQ25CeEQsTUFBQUEscUJBQXFCLENBQUN3SCxpQkFBdEIsQ0FBd0NKLE1BQXhDO0FBQ0gsS0FqQmMsQ0FtQmY7OztBQUNBcEgsSUFBQUEscUJBQXFCLENBQUN5SCx3QkFBdEIsQ0FBK0NiLFFBQS9DLEVBcEJlLENBc0JmOztBQUNBNUcsSUFBQUEscUJBQXFCLENBQUN3RixtQkFBdEIsR0F2QmUsQ0F5QmY7O0FBQ0F4RixJQUFBQSxxQkFBcUIsQ0FBQ0MsUUFBdEIsQ0FBK0J3RyxXQUEvQixDQUEyQyxTQUEzQyxFQTFCZSxDQTRCZjs7QUFDQXpHLElBQUFBLHFCQUFxQixDQUFDNkUsU0FBdEIsR0E3QmUsQ0ErQmY7O0FBQ0EsUUFBSW9CLElBQUksQ0FBQ3lCLGFBQVQsRUFBd0I7QUFDcEJ6QixNQUFBQSxJQUFJLENBQUMwQixpQkFBTDtBQUNILEtBbENjLENBb0NmOzs7QUFDQSxRQUFJLE9BQU9DLFlBQVAsS0FBd0IsV0FBNUIsRUFBeUM7QUFDckNBLE1BQUFBLFlBQVksQ0FBQ3JFLFVBQWIsQ0FBd0Isb0JBQXhCLEVBQThDLG1CQUE5QztBQUNILEtBdkNjLENBeUNmOzs7QUFDQXZELElBQUFBLHFCQUFxQixDQUFDc0YseUJBQXRCLEdBMUNlLENBNENmOztBQUNBcEYsSUFBQUEsQ0FBQyxDQUFDMkgsUUFBRCxDQUFELENBQVlDLE9BQVosQ0FBb0IsNEJBQXBCO0FBQ0gsR0EzY3lCOztBQTZjMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSVIsRUFBQUEscUJBamQwQixpQ0FpZEpWLFFBamRJLEVBaWRNO0FBQzVCO0FBRUE7QUFDQSxRQUFJQSxRQUFRLENBQUNtQixzQkFBYixFQUFxQztBQUNqQzdILE1BQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCeUcsSUFBeEIsQ0FBNkIsV0FBN0IsRUFBMENDLFFBQVEsQ0FBQ21CLHNCQUFuRDtBQUNILEtBTjJCLENBUTVCOzs7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlyQixRQUFaLEVBQXNCc0IsT0FBdEIsQ0FBOEIsVUFBQUMsR0FBRyxFQUFJO0FBQ2pDLFVBQU1DLFNBQVMsR0FBR2xJLENBQUMsWUFBS2lJLEdBQUwsRUFBRCxDQUFhN0gsTUFBYixDQUFvQixXQUFwQixDQUFsQjs7QUFDQSxVQUFJOEgsU0FBUyxDQUFDNUUsTUFBVixHQUFtQixDQUF2QixFQUEwQjtBQUN0QixZQUFNNkUsU0FBUyxHQUFHekIsUUFBUSxDQUFDdUIsR0FBRCxDQUFSLEtBQWtCLElBQWxCLElBQTBCdkIsUUFBUSxDQUFDdUIsR0FBRCxDQUFSLEtBQWtCLEdBQTVDLElBQW1EdkIsUUFBUSxDQUFDdUIsR0FBRCxDQUFSLEtBQWtCLENBQXZGO0FBQ0FDLFFBQUFBLFNBQVMsQ0FBQzlELFFBQVYsQ0FBbUIrRCxTQUFTLEdBQUcsT0FBSCxHQUFhLFNBQXpDO0FBQ0gsT0FMZ0MsQ0FPakM7OztBQUNBLFVBQU1DLFNBQVMsR0FBR3BJLENBQUMsWUFBS2lJLEdBQUwsRUFBRCxDQUFhN0gsTUFBYixDQUFvQixXQUFwQixDQUFsQjs7QUFDQSxVQUFJZ0ksU0FBUyxDQUFDOUUsTUFBVixHQUFtQixDQUFuQixJQUF3QixDQUFDOEUsU0FBUyxDQUFDQyxRQUFWLENBQW1CLHNCQUFuQixDQUE3QixFQUF5RTtBQUNyRUQsUUFBQUEsU0FBUyxDQUFDbkQsUUFBVixDQUFtQixjQUFuQixFQUFtQ3lCLFFBQVEsQ0FBQ3VCLEdBQUQsQ0FBM0M7QUFDSDtBQUNKLEtBWkQ7QUFhSCxHQXZleUI7O0FBeWUxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJVixFQUFBQSx3QkE3ZTBCLG9DQTZlRGIsUUE3ZUMsRUE2ZVM7QUFDL0I7QUFDQSxRQUFJQSxRQUFRLENBQUN0RixnQkFBVCxJQUE2QnNGLFFBQVEsQ0FBQ3RGLGdCQUFULEtBQThCLEVBQS9ELEVBQW1FO0FBQy9EdEIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCb0gsSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsa0JBQWpELEVBQXFFckgscUJBQXFCLENBQUNRLGNBQTNGO0FBQ0FSLE1BQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQm9ILElBQS9CLENBQW9DLFdBQXBDLEVBQWlELHdCQUFqRCxFQUEyRXJILHFCQUFxQixDQUFDUSxjQUFqRztBQUNIOztBQUVELFFBQUlvRyxRQUFRLENBQUNuRixXQUFULElBQXdCbUYsUUFBUSxDQUFDbkYsV0FBVCxLQUF5QixFQUFyRCxFQUF5RDtBQUNyRHpCLE1BQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQm9ILElBQS9CLENBQW9DLFdBQXBDLEVBQWlELGFBQWpELEVBQWdFckgscUJBQXFCLENBQUNRLGNBQXRGO0FBQ0FSLE1BQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQm9ILElBQS9CLENBQW9DLFdBQXBDLEVBQWlELG1CQUFqRCxFQUFzRXJILHFCQUFxQixDQUFDUSxjQUE1RjtBQUNIO0FBQ0osR0F4ZnlCOztBQTBmMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSTJHLEVBQUFBLFlBOWYwQix3QkE4ZmJGLFFBOWZhLEVBOGZIO0FBQ25CLFFBQUlBLFFBQVEsQ0FBQ0MsS0FBYixFQUFvQjtBQUNoQixVQUFNc0IsWUFBWSxHQUFHQyxLQUFLLENBQUNDLE9BQU4sQ0FBY3pCLFFBQVEsQ0FBQ0MsS0FBdkIsSUFDZkQsUUFBUSxDQUFDQyxLQUFULENBQWV5QixJQUFmLENBQW9CLElBQXBCLENBRGUsR0FFZjFCLFFBQVEsQ0FBQ0MsS0FGZjtBQUdBMEIsTUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCTCxZQUF0QjtBQUNIO0FBQ0osR0FyZ0J5Qjs7QUF1Z0IxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJeEIsRUFBQUEsMkJBM2dCMEIsdUNBMmdCRThCLFVBM2dCRixFQTJnQmM7QUFDcEM7QUFDQTVJLElBQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCNkksTUFBeEIsR0FGb0MsQ0FJcEM7O0FBQ0EsUUFBSUQsVUFBVSxDQUFDRSxvQkFBZixFQUFxQztBQUNqQztBQUNBLFVBQUlDLGtCQUFrQixHQUFHL0ksQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJnSixPQUF2QixDQUErQixhQUEvQixDQUF6Qjs7QUFFQSxVQUFJRCxrQkFBa0IsQ0FBQ3pGLE1BQW5CLEtBQThCLENBQWxDLEVBQXFDO0FBQ2pDO0FBQ0F5RixRQUFBQSxrQkFBa0IsR0FBRy9JLENBQUMsQ0FBQyxtQkFBRCxDQUFELENBQXVCSSxNQUF2QixHQUFnQ0EsTUFBaEMsRUFBckI7QUFDSDs7QUFFRCxVQUFJMkksa0JBQWtCLENBQUN6RixNQUFuQixHQUE0QixDQUFoQyxFQUFtQztBQUMvQjtBQUNBLFlBQU0yRixXQUFXLHVRQUlpQi9ILGVBQWUsQ0FBQ2dJLGNBQWhCLElBQWtDLGtCQUpuRCxvREFLQWhJLGVBQWUsQ0FBQ2lJLGtCQUFoQixJQUFzQyxvRUFMdEMsdUZBQWpCLENBRitCLENBWS9COztBQUNBSixRQUFBQSxrQkFBa0IsQ0FBQ0ssTUFBbkIsQ0FBMEJILFdBQTFCO0FBQ0g7QUFDSixLQTdCbUMsQ0ErQnBDOzs7QUFDQSxRQUFJTCxVQUFVLENBQUNTLG9CQUFmLEVBQXFDO0FBQ2pDO0FBQ0EsVUFBTUMsbUJBQW1CLEdBQUd0SixDQUFDLENBQUMsMkJBQUQsQ0FBRCxDQUErQm9FLFFBQS9CLENBQXdDLFlBQXhDLENBQTVCOztBQUVBLFVBQUksQ0FBQ2tGLG1CQUFMLEVBQTBCO0FBQ3RCO0FBQ0EsWUFBSUMsa0JBQWtCLEdBQUd2SixDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCZ0osT0FBbEIsQ0FBMEIsYUFBMUIsQ0FBekI7O0FBRUEsWUFBSU8sa0JBQWtCLENBQUNqRyxNQUFuQixLQUE4QixDQUFsQyxFQUFxQztBQUNqQztBQUNBaUcsVUFBQUEsa0JBQWtCLEdBQUd2SixDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCSSxNQUFsQixHQUEyQkEsTUFBM0IsRUFBckI7QUFDSDs7QUFFRCxZQUFJbUosa0JBQWtCLENBQUNqRyxNQUFuQixHQUE0QixDQUFoQyxFQUFtQztBQUMvQjtBQUNBLGNBQU0yRixZQUFXLHVSQUlpQi9ILGVBQWUsQ0FBQ2dJLGNBQWhCLElBQWtDLGtCQUpuRCx3REFLQWhJLGVBQWUsQ0FBQ2lJLGtCQUFoQixJQUFzQyxvRUFMdEMsbUdBQWpCLENBRitCLENBWS9COzs7QUFDQUksVUFBQUEsa0JBQWtCLENBQUNILE1BQW5CLENBQTBCSCxZQUExQjtBQUNIO0FBQ0o7QUFDSjtBQUNKLEdBemtCeUI7O0FBMmtCMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSTVCLEVBQUFBLG1CQS9rQjBCLCtCQStrQk5YLFFBL2tCTSxFQStrQkk7QUFDMUI7QUFDQSxRQUFJQSxRQUFRLENBQUM4Qyx1QkFBYixFQUFzQztBQUNsQyxVQUFNQyx1QkFBdUIsR0FBRy9DLFFBQVEsQ0FBQ2dELGlDQUFULElBQ0RoRCxRQUFRLENBQUNpRCxnQ0FEeEM7O0FBRUEsVUFBSUYsdUJBQUosRUFBNkI7QUFDekI1RCxRQUFBQSxrQkFBa0IsQ0FBQytELHVCQUFuQixDQUNJOUoscUJBQXFCLENBQUNTLGVBQXRCLENBQXNDQyxjQUQxQyxFQUVJa0csUUFBUSxDQUFDOEMsdUJBRmIsRUFHSUMsdUJBSEo7QUFLSCxPQU5ELE1BTU87QUFDSHpKLFFBQUFBLENBQUMsWUFBS0YscUJBQXFCLENBQUNTLGVBQXRCLENBQXNDQyxjQUEzQyxhQUFELENBQ0t5RSxRQURMLENBQ2MsY0FEZCxFQUM4QnlCLFFBQVEsQ0FBQzhDLHVCQUR2QztBQUVIO0FBQ0osS0FmeUIsQ0FpQjFCOzs7QUFDQSxRQUFJOUMsUUFBUSxDQUFDbUQsd0JBQWIsRUFBdUM7QUFDbkMsVUFBTUMsd0JBQXdCLEdBQUdwRCxRQUFRLENBQUNxRCxrQ0FBVCxJQUNEckQsUUFBUSxDQUFDc0QsaUNBRHpDOztBQUVBLFVBQUlGLHdCQUFKLEVBQThCO0FBQzFCakUsUUFBQUEsa0JBQWtCLENBQUMrRCx1QkFBbkIsQ0FDSTlKLHFCQUFxQixDQUFDUyxlQUF0QixDQUFzQ0UsZUFEMUMsRUFFSWlHLFFBQVEsQ0FBQ21ELHdCQUZiLEVBR0lDLHdCQUhKO0FBS0gsT0FORCxNQU1PO0FBQ0g5SixRQUFBQSxDQUFDLFlBQUtGLHFCQUFxQixDQUFDUyxlQUF0QixDQUFzQ0UsZUFBM0MsYUFBRCxDQUNLd0UsUUFETCxDQUNjLGNBRGQsRUFDOEJ5QixRQUFRLENBQUNtRCx3QkFEdkM7QUFFSDtBQUNKO0FBQ0osR0EvbUJ5Qjs7QUFpbkIxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJdkMsRUFBQUEsaUJBcm5CMEIsNkJBcW5CUkosTUFybkJRLEVBcW5CQTtBQUN0QjtBQUNBcEgsSUFBQUEscUJBQXFCLENBQUNZLGtCQUF0QixHQUEyQyxFQUEzQyxDQUZzQixDQUl0Qjs7QUFDQSxRQUFNdUosV0FBVyxHQUFHL0MsTUFBTSxDQUFDZ0QsTUFBUCxDQUFjLFVBQUFDLENBQUM7QUFBQSxhQUFJQSxDQUFDLENBQUNuSixJQUFGLEtBQVcsT0FBZjtBQUFBLEtBQWYsRUFBdUNvSixJQUF2QyxDQUE0QyxVQUFDQyxDQUFELEVBQUlDLENBQUo7QUFBQSxhQUFVRCxDQUFDLENBQUNFLFFBQUYsR0FBYUQsQ0FBQyxDQUFDQyxRQUF6QjtBQUFBLEtBQTVDLENBQXBCO0FBQ0EsUUFBTUMsV0FBVyxHQUFHdEQsTUFBTSxDQUFDZ0QsTUFBUCxDQUFjLFVBQUFDLENBQUM7QUFBQSxhQUFJQSxDQUFDLENBQUNuSixJQUFGLEtBQVcsT0FBZjtBQUFBLEtBQWYsRUFBdUNvSixJQUF2QyxDQUE0QyxVQUFDQyxDQUFELEVBQUlDLENBQUo7QUFBQSxhQUFVRCxDQUFDLENBQUNFLFFBQUYsR0FBYUQsQ0FBQyxDQUFDQyxRQUF6QjtBQUFBLEtBQTVDLENBQXBCLENBTnNCLENBUXRCOztBQUNBekssSUFBQUEscUJBQXFCLENBQUMySyxlQUF0QixDQUFzQ1IsV0FBdEMsRUFBbUQsT0FBbkQsRUFUc0IsQ0FXdEI7O0FBQ0FuSyxJQUFBQSxxQkFBcUIsQ0FBQzJLLGVBQXRCLENBQXNDRCxXQUF0QyxFQUFtRCxPQUFuRCxFQVpzQixDQWN0Qjs7QUFDQXhLLElBQUFBLENBQUMsQ0FBQyw0Q0FBRCxDQUFELENBQWdEdUcsV0FBaEQsQ0FBNEQsUUFBNUQ7QUFDQXZHLElBQUFBLENBQUMsQ0FBQywwQ0FBRCxDQUFELENBQThDMEssSUFBOUMsR0FoQnNCLENBa0J0Qjs7QUFDQTVLLElBQUFBLHFCQUFxQixDQUFDNkssdUJBQXRCO0FBQ0gsR0F6b0J5Qjs7QUEyb0IxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lGLEVBQUFBLGVBaHBCMEIsMkJBZ3BCVnZELE1BaHBCVSxFQWdwQkZsRyxJQWhwQkUsRUFncEJJO0FBQzFCLFFBQU00SixVQUFVLEdBQUc1SyxDQUFDLFlBQUtnQixJQUFMLHlCQUFwQjtBQUNBNEosSUFBQUEsVUFBVSxDQUFDQyxLQUFYO0FBRUEzRCxJQUFBQSxNQUFNLENBQUNjLE9BQVAsQ0FBZSxVQUFDOEMsS0FBRCxFQUFRQyxLQUFSLEVBQWtCO0FBQzdCO0FBQ0FqTCxNQUFBQSxxQkFBcUIsQ0FBQ1ksa0JBQXRCLENBQXlDb0ssS0FBSyxDQUFDRSxJQUEvQyxJQUF1RDtBQUNuRFQsUUFBQUEsUUFBUSxFQUFFUSxLQUR5QztBQUVuREUsUUFBQUEsUUFBUSxFQUFFSCxLQUFLLENBQUNHO0FBRm1DLE9BQXZELENBRjZCLENBTzdCOztBQUNBLFVBQU05RyxVQUFVLEdBQUcyRyxLQUFLLENBQUNHLFFBQU4sS0FBbUIsSUFBbkIsSUFBMkJILEtBQUssQ0FBQ0csUUFBTixLQUFtQixHQUE5QyxJQUFxREgsS0FBSyxDQUFDRyxRQUFOLEtBQW1CLENBQTNGO0FBQ0EsVUFBTUMsT0FBTyxHQUFHLENBQUMvRyxVQUFELEdBQWMsU0FBZCxHQUEwQixFQUExQztBQUVBLFVBQU1nSCxPQUFPLGtFQUN5QkwsS0FBSyxDQUFDRSxJQUQvQixtREFFU0QsS0FGVCx3REFHY0QsS0FBSyxDQUFDRSxJQUhwQiw4REFJcUJELEtBSnJCLHFXQVd3QkQsS0FBSyxDQUFDRSxJQVg5QixxREFZWUUsT0FaWix3S0FldUJKLEtBQUssQ0FBQ0UsSUFmN0IsZ0JBZXNDbEwscUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ04sS0FBSyxDQUFDTyxXQUFOLElBQXFCUCxLQUFLLENBQUNFLElBQTVELENBZnRDLDZHQUFiO0FBcUJBSixNQUFBQSxVQUFVLENBQUNVLE1BQVgsQ0FBa0JILE9BQWxCO0FBQ0gsS0FqQ0QsRUFKMEIsQ0F1QzFCOztBQUNBUCxJQUFBQSxVQUFVLENBQUNoRyxJQUFYLENBQWdCLFdBQWhCLEVBQTZCUixRQUE3QixDQUFzQztBQUNsQ21ILE1BQUFBLFFBQVEsRUFBRSxvQkFBVztBQUNqQjtBQUNBeEYsUUFBQUEsSUFBSSxDQUFDQyxXQUFMO0FBQ0g7QUFKaUMsS0FBdEM7QUFNSCxHQTlyQnlCOztBQWdzQjFCO0FBQ0o7QUFDQTtBQUNJMkUsRUFBQUEsdUJBbnNCMEIscUNBbXNCQTtBQUN0QjNLLElBQUFBLENBQUMsQ0FBQywwQ0FBRCxDQUFELENBQThDd0wsUUFBOUMsQ0FBdUQ7QUFDbkRDLE1BQUFBLFdBQVcsRUFBRSxhQURzQztBQUVuREMsTUFBQUEsVUFBVSxFQUFFLGFBRnVDO0FBR25EQyxNQUFBQSxNQUFNLEVBQUUsa0JBQVc7QUFDZjtBQUNBNUYsUUFBQUEsSUFBSSxDQUFDQyxXQUFMO0FBQ0g7QUFOa0QsS0FBdkQ7QUFRSCxHQTVzQnlCOztBQThzQjFCO0FBQ0o7QUFDQTtBQUNJNEYsRUFBQUEsMEJBanRCMEIsd0NBaXRCRztBQUN6QjtBQUNBLFFBQU1DLGdCQUFnQixHQUFHN0wsQ0FBQyxDQUFDLG9CQUFELENBQTFCOztBQUNBLFFBQUk2TCxnQkFBZ0IsQ0FBQ3ZJLE1BQXJCLEVBQTZCO0FBQ3pCLFVBQU13SSxTQUFTLEdBQUdELGdCQUFnQixDQUFDbkgsR0FBakIsRUFBbEI7QUFDQSxVQUFNcUgsVUFBVSxHQUFHRixnQkFBZ0IsQ0FBQ3pMLE1BQWpCLEVBQW5CLENBRnlCLENBSXpCOztBQUNBLFVBQU00TCxRQUFRLEdBQUdILGdCQUFnQixDQUFDcEYsSUFBakIsQ0FBc0IsV0FBdEIsS0FBc0MsRUFBdkQsQ0FMeUIsQ0FPekI7O0FBQ0FzRixNQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGdDQUFoQixFQUFrRGlFLE1BQWxEOztBQUVBLFVBQUlpRCxTQUFKLEVBQWU7QUFDWDtBQUNBLFlBQUlHLFdBQVcsR0FBRyxFQUFsQjs7QUFDQSxZQUFJRCxRQUFRLElBQUksQ0FBQ0EsUUFBUSxDQUFDaEYsS0FBMUIsRUFBaUM7QUFDN0IsY0FBTWtGLEtBQUssR0FBRyxFQUFkLENBRDZCLENBRzdCOztBQUNBLGNBQUlGLFFBQVEsQ0FBQ0csT0FBYixFQUFzQjtBQUNsQkQsWUFBQUEsS0FBSyxDQUFDRSxJQUFOLHdCQUFpQkosUUFBUSxDQUFDRyxPQUExQjtBQUNILFdBTjRCLENBUTdCOzs7QUFDQSxjQUFJSCxRQUFRLENBQUNLLE1BQVQsSUFBbUIsQ0FBQ0wsUUFBUSxDQUFDTSxjQUFqQyxFQUFpRDtBQUM3Q0osWUFBQUEsS0FBSyxDQUFDRSxJQUFOLGNBQWlCSixRQUFRLENBQUNLLE1BQTFCO0FBQ0gsV0FGRCxNQUVPLElBQUlMLFFBQVEsQ0FBQ00sY0FBYixFQUE2QjtBQUNoQ0osWUFBQUEsS0FBSyxDQUFDRSxJQUFOLENBQVcsZUFBWDtBQUNILFdBYjRCLENBZTdCOzs7QUFDQSxjQUFJSixRQUFRLENBQUNPLFFBQWIsRUFBdUI7QUFDbkIsZ0JBQUlQLFFBQVEsQ0FBQ1EsVUFBYixFQUF5QjtBQUNyQk4sY0FBQUEsS0FBSyxDQUFDRSxJQUFOLDBCQUF3QkosUUFBUSxDQUFDTyxRQUFqQztBQUNILGFBRkQsTUFFTyxJQUFJUCxRQUFRLENBQUNTLGlCQUFULElBQThCLEVBQWxDLEVBQXNDO0FBQ3pDUCxjQUFBQSxLQUFLLENBQUNFLElBQU4sbUNBQTRCSixRQUFRLENBQUNTLGlCQUFyQztBQUNILGFBRk0sTUFFQTtBQUNIUCxjQUFBQSxLQUFLLENBQUNFLElBQU4sOEJBQTRCSixRQUFRLENBQUNPLFFBQXJDO0FBQ0g7QUFDSjs7QUFFRE4sVUFBQUEsV0FBVyxHQUFHQyxLQUFLLENBQUN6RCxJQUFOLENBQVcsS0FBWCxDQUFkO0FBQ0gsU0EzQkQsTUEyQk87QUFDSDtBQUNBd0QsVUFBQUEsV0FBVyxHQUFHbk0scUJBQXFCLENBQUM0TSxtQkFBdEIsQ0FBMENaLFNBQTFDLENBQWQ7QUFDSCxTQWpDVSxDQW1DWDs7O0FBQ0FELFFBQUFBLGdCQUFnQixDQUFDckgsSUFBakIsR0FwQ1csQ0FzQ1g7O0FBQ0EsWUFBSW1JLFdBQVcsR0FBRyxFQUFsQjs7QUFDQSxZQUFJWCxRQUFRLENBQUNRLFVBQWIsRUFBeUI7QUFDckJHLFVBQUFBLFdBQVcsR0FBRyxPQUFkO0FBQ0gsU0FGRCxNQUVPLElBQUlYLFFBQVEsQ0FBQ1MsaUJBQVQsSUFBOEIsRUFBbEMsRUFBc0M7QUFDekNFLFVBQUFBLFdBQVcsR0FBRyxTQUFkO0FBQ0g7O0FBRUQsWUFBTUMsV0FBVyxtRkFDb0NELFdBRHBDLHVFQUVtQjdNLHFCQUFxQixDQUFDc0wsVUFBdEIsQ0FBaUNhLFdBQWpDLENBRm5CLHVKQUc0RG5NLHFCQUFxQixDQUFDc0wsVUFBdEIsQ0FBaUNVLFNBQWpDLENBSDVELHlGQUlzQzVLLGVBQWUsQ0FBQzJMLGtCQUFoQixJQUFzQyxrQkFKNUUsZ1BBUWUzTCxlQUFlLENBQUM0TCxrQkFBaEIsSUFBc0MscUJBUnJELGtQQVllNUwsZUFBZSxDQUFDNkwsY0FBaEIsSUFBa0Msa0JBWmpELGtQQWdCZTdMLGVBQWUsQ0FBQzhMLGdCQUFoQixJQUFvQyxvQkFoQm5ELG1LQW9CWGhCLFFBQVEsSUFBSSxDQUFDQSxRQUFRLENBQUNoRixLQUF0QixHQUE4QmxILHFCQUFxQixDQUFDbU4sd0JBQXRCLENBQStDakIsUUFBL0MsQ0FBOUIsR0FBeUYsRUFwQjlFLGdVQXlCb0I5SyxlQUFlLENBQUNnTSxrQkFBaEIsSUFBc0Msa0NBekIxRCxnQkF5QmlHcEIsU0F6QmpHLGlRQTZCNEI1SyxlQUFlLENBQUNpTSxPQUFoQixJQUEyQixNQTdCdkQsNkxBZ0M0QmpNLGVBQWUsQ0FBQ2tNLFNBQWhCLElBQTZCLFFBaEN6RCwwSEFBakI7QUFzQ0FyQixRQUFBQSxVQUFVLENBQUNULE1BQVgsQ0FBa0JzQixXQUFsQixFQXBGVyxDQXNGWDs7QUFDQWIsUUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixnQkFBaEIsRUFBa0NWLEVBQWxDLENBQXFDLE9BQXJDLEVBQThDLFVBQVNtSixDQUFULEVBQVk7QUFDdERBLFVBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLGNBQU1DLFFBQVEsR0FBR3hCLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZUFBaEIsQ0FBakI7O0FBQ0EsY0FBSTJJLFFBQVEsQ0FBQ2pLLE1BQWIsRUFBcUI7QUFDakJpSyxZQUFBQSxRQUFRLENBQUNDLFdBQVQ7QUFDSDtBQUNKLFNBTkQsRUF2RlcsQ0ErRlg7O0FBQ0F6QixRQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLFdBQWhCLEVBQTZCVixFQUE3QixDQUFnQyxPQUFoQyxFQUF5QyxVQUFTbUosQ0FBVCxFQUFZO0FBQ2pEQSxVQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQXZCLFVBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZUFBaEIsRUFBaUNKLElBQWpDO0FBQ0F1SCxVQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGlCQUFoQixFQUFtQzhGLElBQW5DO0FBQ0FxQixVQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLHlCQUFoQixFQUEyQzZJLEtBQTNDO0FBQ0gsU0FMRCxFQWhHVyxDQXVHWDs7QUFDQTFCLFFBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZ0JBQWhCLEVBQWtDVixFQUFsQyxDQUFxQyxPQUFyQyxFQUE4QyxVQUFTbUosQ0FBVCxFQUFZO0FBQ3REQSxVQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxjQUFNSSxRQUFRLEdBQUczQixVQUFVLENBQUNuSCxJQUFYLENBQWdCLHlCQUFoQixFQUEyQ0YsR0FBM0MsRUFBakIsQ0FGc0QsQ0FJdEQ7O0FBQ0FtSCxVQUFBQSxnQkFBZ0IsQ0FBQ25ILEdBQWpCLENBQXFCZ0osUUFBckIsRUFMc0QsQ0FPdEQ7O0FBQ0EsY0FBSSxPQUFPM0gsSUFBUCxLQUFnQixXQUFoQixJQUErQkEsSUFBSSxDQUFDNEgsV0FBeEMsRUFBcUQ7QUFDakQ1SCxZQUFBQSxJQUFJLENBQUM0SCxXQUFMO0FBQ0gsV0FWcUQsQ0FZdEQ7OztBQUNBN04sVUFBQUEscUJBQXFCLENBQUM4TCwwQkFBdEI7QUFDSCxTQWRELEVBeEdXLENBd0hYOztBQUNBRyxRQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGtCQUFoQixFQUFvQ1YsRUFBcEMsQ0FBdUMsT0FBdkMsRUFBZ0QsVUFBU21KLENBQVQsRUFBWTtBQUN4REEsVUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0F2QixVQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGlCQUFoQixFQUFtQ0osSUFBbkM7QUFDQXVILFVBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZUFBaEIsRUFBaUM4RixJQUFqQztBQUNILFNBSkQsRUF6SFcsQ0ErSFg7O0FBQ0FxQixRQUFBQSxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGtCQUFoQixFQUFvQ1YsRUFBcEMsQ0FBdUMsT0FBdkMsRUFBZ0QsVUFBU21KLENBQVQsRUFBWTtBQUN4REEsVUFBQUEsQ0FBQyxDQUFDQyxjQUFGLEdBRHdELENBR3hEOztBQUNBekIsVUFBQUEsZ0JBQWdCLENBQUNuSCxHQUFqQixDQUFxQixFQUFyQixFQUp3RCxDQU14RDs7QUFDQSxjQUFJLE9BQU9xQixJQUFQLEtBQWdCLFdBQWhCLElBQStCQSxJQUFJLENBQUM0SCxXQUF4QyxFQUFxRDtBQUNqRDVILFlBQUFBLElBQUksQ0FBQzRILFdBQUw7QUFDSCxXQVR1RCxDQVd4RDs7O0FBQ0E3TixVQUFBQSxxQkFBcUIsQ0FBQzhMLDBCQUF0QjtBQUNILFNBYkQsRUFoSVcsQ0ErSVg7O0FBQ0FHLFFBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZ0JBQWhCLEVBQWtDZ0osS0FBbEMsR0FoSlcsQ0FrSlg7O0FBQ0EsWUFBSTlOLHFCQUFxQixDQUFDc0QsU0FBMUIsRUFBcUM7QUFDakN0RCxVQUFBQSxxQkFBcUIsQ0FBQ3NELFNBQXRCLENBQWdDeUssT0FBaEM7QUFDQS9OLFVBQUFBLHFCQUFxQixDQUFDdUYsbUJBQXRCO0FBQ0g7QUFDSixPQXZKRCxNQXVKTztBQUNIO0FBQ0F3RyxRQUFBQSxnQkFBZ0IsQ0FBQ25CLElBQWpCO0FBQ0FtQixRQUFBQSxnQkFBZ0IsQ0FBQ2lDLElBQWpCLENBQXNCLGFBQXRCLEVBQXFDNU0sZUFBZSxDQUFDZ00sa0JBQWhCLElBQXNDLGtDQUEzRTtBQUNBckIsUUFBQUEsZ0JBQWdCLENBQUNpQyxJQUFqQixDQUFzQixNQUF0QixFQUE4QixJQUE5QixFQUpHLENBTUg7O0FBQ0FqQyxRQUFBQSxnQkFBZ0IsQ0FBQ2tDLEdBQWpCLENBQXFCLG1DQUFyQixFQUEwRDdKLEVBQTFELENBQTZELG1DQUE3RCxFQUFrRyxZQUFXO0FBQ3pHLGNBQUksT0FBTzZCLElBQVAsS0FBZ0IsV0FBaEIsSUFBK0JBLElBQUksQ0FBQzRILFdBQXhDLEVBQXFEO0FBQ2pENUgsWUFBQUEsSUFBSSxDQUFDNEgsV0FBTDtBQUNIO0FBQ0osU0FKRDtBQUtIO0FBQ0o7QUFDSixHQW40QnlCOztBQXE0QjFCO0FBQ0o7QUFDQTtBQUNJdkksRUFBQUEseUJBeDRCMEIsdUNBdzRCRTtBQUN4QjtBQUNBLFFBQU00SSxlQUFlLEdBQUdoTyxDQUFDLENBQUMsaUJBQUQsQ0FBekI7O0FBQ0EsUUFBSWdPLGVBQWUsQ0FBQzFLLE1BQXBCLEVBQTRCO0FBQ3hCLFVBQU13SSxTQUFTLEdBQUdrQyxlQUFlLENBQUN0SixHQUFoQixFQUFsQjtBQUNBLFVBQU1xSCxVQUFVLEdBQUdpQyxlQUFlLENBQUM1TixNQUFoQixFQUFuQixDQUZ3QixDQUl4Qjs7QUFDQTJMLE1BQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsaUNBQWhCLEVBQW1EaUUsTUFBbkQsR0FMd0IsQ0FPeEI7O0FBQ0EsVUFBSWlELFNBQUosRUFBZTtBQUNYO0FBQ0EsWUFBTW1DLFNBQVMsR0FBR25PLHFCQUFxQixDQUFDb08sY0FBdEIsQ0FBcUNwQyxTQUFyQyxDQUFsQixDQUZXLENBSVg7O0FBQ0FrQyxRQUFBQSxlQUFlLENBQUN4SixJQUFoQjtBQUVBLFlBQU1vSSxXQUFXLCtJQUVtQnFCLFNBRm5CLHVKQUc0RG5PLHFCQUFxQixDQUFDc0wsVUFBdEIsQ0FBaUNVLFNBQWpDLENBSDVELDBGQUlzQzVLLGVBQWUsQ0FBQ2lOLGlCQUFoQixJQUFxQyxNQUozRSw4T0FRZWpOLGVBQWUsQ0FBQ2tOLGdCQUFoQixJQUFvQyxlQVJuRCx1T0FZbUR0QyxTQVpuRCxrQ0FBakI7QUFlQUMsUUFBQUEsVUFBVSxDQUFDVCxNQUFYLENBQWtCc0IsV0FBbEIsRUF0QlcsQ0F3QmY7O0FBQ0FiLFFBQUFBLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsYUFBaEIsRUFBK0JWLEVBQS9CLENBQWtDLE9BQWxDLEVBQTJDLFVBQVNtSixDQUFULEVBQVk7QUFDbkRBLFVBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLGNBQU1lLFlBQVksR0FBR3RDLFVBQVUsQ0FBQ25ILElBQVgsQ0FBZ0IsZUFBaEIsQ0FBckI7QUFDQSxjQUFNMEosaUJBQWlCLEdBQUd2QyxVQUFVLENBQUNuSCxJQUFYLENBQWdCLGtCQUFoQixDQUExQjtBQUNBLGNBQU0ySixLQUFLLEdBQUd2TyxDQUFDLENBQUMsSUFBRCxDQUFELENBQVE0RSxJQUFSLENBQWEsR0FBYixDQUFkOztBQUVBLGNBQUl5SixZQUFZLENBQUNHLEVBQWIsQ0FBZ0IsVUFBaEIsQ0FBSixFQUFpQztBQUM3QkgsWUFBQUEsWUFBWSxDQUFDN0osSUFBYjtBQUNBOEosWUFBQUEsaUJBQWlCLENBQUM1RCxJQUFsQjtBQUNBNkQsWUFBQUEsS0FBSyxDQUFDaEksV0FBTixDQUFrQixVQUFsQixFQUE4Qk4sUUFBOUIsQ0FBdUMsUUFBdkM7QUFDSCxXQUpELE1BSU87QUFDSG9JLFlBQUFBLFlBQVksQ0FBQzNELElBQWI7QUFDQTRELFlBQUFBLGlCQUFpQixDQUFDOUosSUFBbEI7QUFDQStKLFlBQUFBLEtBQUssQ0FBQ2hJLFdBQU4sQ0FBa0IsUUFBbEIsRUFBNEJOLFFBQTVCLENBQXFDLFVBQXJDO0FBQ0g7QUFDSixTQWZELEVBekJlLENBMENmOztBQUNBOEYsUUFBQUEsVUFBVSxDQUFDbkgsSUFBWCxDQUFnQixnQkFBaEIsRUFBa0NnSixLQUFsQztBQUNDLE9BNUNELE1BNENPO0FBQ0g7QUFDQUksUUFBQUEsZUFBZSxDQUFDdEQsSUFBaEI7QUFDQXNELFFBQUFBLGVBQWUsQ0FBQ0YsSUFBaEIsQ0FBcUIsVUFBckIsRUFBaUMsSUFBakM7QUFDQUUsUUFBQUEsZUFBZSxDQUFDRixJQUFoQixDQUFxQixhQUFyQixFQUFvQzVNLGVBQWUsQ0FBQ3VOLGlCQUFoQixJQUFxQyw2QkFBekU7QUFDSDtBQUNKLEtBN0R1QixDQStEeEI7OztBQUNBM08sSUFBQUEscUJBQXFCLENBQUM4TCwwQkFBdEIsR0FoRXdCLENBa0V4Qjs7QUFDQSxRQUFNOEMsaUJBQWlCLEdBQUcxTyxDQUFDLENBQUMscUJBQUQsQ0FBM0I7O0FBQ0EsUUFBSTBPLGlCQUFpQixDQUFDcEwsTUFBdEIsRUFBOEI7QUFDMUIsVUFBTXlJLFdBQVUsR0FBRzJDLGlCQUFpQixDQUFDdE8sTUFBbEIsRUFBbkIsQ0FEMEIsQ0FHMUI7OztBQUNBMkwsTUFBQUEsV0FBVSxDQUFDbkgsSUFBWCxDQUFnQiwyQ0FBaEIsRUFBNkRpRSxNQUE3RCxHQUowQixDQU0xQjtBQUNBOzs7QUFDQSxVQUFNOEYsWUFBWSxHQUFHRCxpQkFBaUIsQ0FBQ2hLLEdBQWxCLEVBQXJCO0FBQ0EsVUFBTWtLLFFBQVEsR0FBR0QsWUFBWSxLQUFLN08scUJBQXFCLENBQUNRLGNBQXhEOztBQUVBLFVBQUlzTyxRQUFKLEVBQWM7QUFDVjtBQUNBRixRQUFBQSxpQkFBaUIsQ0FBQ2xLLElBQWxCOztBQUVBLFlBQU1vSSxZQUFXLHNNQUlIMUwsZUFBZSxDQUFDMk4sa0JBQWhCLElBQXNDLDJCQUpuQyxxRkFLa0MzTixlQUFlLENBQUM0TixVQUFoQixJQUE4QixTQUxoRSxzVEFXWTVOLGVBQWUsQ0FBQzZOLGtCQUFoQixJQUFzQywyQkFYbEQscUNBQWpCOztBQWNBaEQsUUFBQUEsV0FBVSxDQUFDVCxNQUFYLENBQWtCc0IsWUFBbEIsRUFsQlUsQ0FvQlY7OztBQUNBYixRQUFBQSxXQUFVLENBQUNuSCxJQUFYLENBQWdCLG1CQUFoQixFQUFxQ1YsRUFBckMsQ0FBd0MsT0FBeEMsRUFBaUQsVUFBU21KLENBQVQsRUFBWTtBQUN6REEsVUFBQUEsQ0FBQyxDQUFDQyxjQUFGOztBQUNBdkIsVUFBQUEsV0FBVSxDQUFDbkgsSUFBWCxDQUFnQixrQkFBaEIsRUFBb0NKLElBQXBDOztBQUNBLGNBQU13SyxTQUFTLEdBQUdqRCxXQUFVLENBQUNuSCxJQUFYLENBQWdCLHlCQUFoQixDQUFsQjs7QUFDQW9LLFVBQUFBLFNBQVMsQ0FBQ3RFLElBQVYsR0FBaUIrQyxLQUFqQixHQUp5RCxDQU16RDs7QUFDQWlCLFVBQUFBLGlCQUFpQixDQUFDaEssR0FBbEIsQ0FBc0IsRUFBdEIsRUFQeUQsQ0FTekQ7O0FBQ0FzSyxVQUFBQSxTQUFTLENBQUM5SyxFQUFWLENBQWEsb0JBQWIsRUFBbUMsWUFBVztBQUMxQztBQUNBd0ssWUFBQUEsaUJBQWlCLENBQUNoSyxHQUFsQixDQUFzQnNLLFNBQVMsQ0FBQ3RLLEdBQVYsRUFBdEIsRUFGMEMsQ0FJMUM7O0FBQ0EsZ0JBQUksT0FBT3FCLElBQVAsS0FBZ0IsV0FBaEIsSUFBK0JBLElBQUksQ0FBQzRILFdBQXhDLEVBQXFEO0FBQ2pENUgsY0FBQUEsSUFBSSxDQUFDNEgsV0FBTDtBQUNIO0FBQ0osV0FSRDtBQVNILFNBbkJEO0FBb0JILE9BekNELE1BeUNPO0FBQ0g7QUFDQWUsUUFBQUEsaUJBQWlCLENBQUNoRSxJQUFsQjtBQUNBZ0UsUUFBQUEsaUJBQWlCLENBQUNaLElBQWxCLENBQXVCLGFBQXZCLEVBQXNDNU0sZUFBZSxDQUFDNk4sa0JBQWhCLElBQXNDLDJCQUE1RTtBQUNBTCxRQUFBQSxpQkFBaUIsQ0FBQ1osSUFBbEIsQ0FBdUIsTUFBdkIsRUFBK0IsSUFBL0IsRUFKRyxDQU1IOztBQUNBWSxRQUFBQSxpQkFBaUIsQ0FBQ1gsR0FBbEIsQ0FBc0IsbUNBQXRCLEVBQTJEN0osRUFBM0QsQ0FBOEQsbUNBQTlELEVBQW1HLFlBQVc7QUFDMUcsY0FBSSxPQUFPNkIsSUFBUCxLQUFnQixXQUFoQixJQUErQkEsSUFBSSxDQUFDNEgsV0FBeEMsRUFBcUQ7QUFDakQ1SCxZQUFBQSxJQUFJLENBQUM0SCxXQUFMO0FBQ0g7QUFDSixTQUpEO0FBS0g7QUFDSjtBQUNKLEdBOWdDeUI7O0FBZ2hDMUI7QUFDSjtBQUNBO0FBQ0l0SSxFQUFBQSxtQkFuaEMwQixpQ0FtaENKO0FBQ2xCLFFBQUl2RixxQkFBcUIsQ0FBQ3NELFNBQTFCLEVBQXFDO0FBQ2pDdEQsTUFBQUEscUJBQXFCLENBQUNzRCxTQUF0QixDQUFnQ3lLLE9BQWhDO0FBQ0g7O0FBRUQvTixJQUFBQSxxQkFBcUIsQ0FBQ3NELFNBQXRCLEdBQWtDLElBQUk2TCxXQUFKLENBQWdCLFdBQWhCLENBQWxDO0FBRUFuUCxJQUFBQSxxQkFBcUIsQ0FBQ3NELFNBQXRCLENBQWdDYyxFQUFoQyxDQUFtQyxTQUFuQyxFQUE4QyxVQUFDbUosQ0FBRCxFQUFPO0FBQ2pEO0FBQ0EsVUFBTTZCLElBQUksR0FBR2xQLENBQUMsQ0FBQ3FOLENBQUMsQ0FBQ3pGLE9BQUgsQ0FBZDtBQUNBLFVBQU11SCxZQUFZLEdBQUdELElBQUksQ0FBQ3RLLElBQUwsQ0FBVSxHQUFWLEVBQWVrSixJQUFmLENBQW9CLE9BQXBCLENBQXJCO0FBRUFvQixNQUFBQSxJQUFJLENBQUN0SyxJQUFMLENBQVUsR0FBVixFQUFlMkIsV0FBZixHQUE2Qk4sUUFBN0IsQ0FBc0MsWUFBdEM7QUFDQVksTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYnFJLFFBQUFBLElBQUksQ0FBQ3RLLElBQUwsQ0FBVSxHQUFWLEVBQWUyQixXQUFmLEdBQTZCTixRQUE3QixDQUFzQ2tKLFlBQXRDO0FBQ0gsT0FGUyxFQUVQLElBRk8sQ0FBVixDQU5pRCxDQVVqRDs7QUFDQTlCLE1BQUFBLENBQUMsQ0FBQytCLGNBQUY7QUFDSCxLQVpEO0FBY0F0UCxJQUFBQSxxQkFBcUIsQ0FBQ3NELFNBQXRCLENBQWdDYyxFQUFoQyxDQUFtQyxPQUFuQyxFQUE0QyxZQUFNO0FBQzlDd0UsTUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCekgsZUFBZSxDQUFDbU8sYUFBaEIsSUFBaUMsNkJBQXZEO0FBQ0gsS0FGRDtBQUdILEdBM2lDeUI7O0FBNmlDMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJbkIsRUFBQUEsY0FsakMwQiwwQkFrakNYakcsR0FsakNXLEVBa2pDTjtBQUNoQixRQUFJLENBQUNBLEdBQUQsSUFBUUEsR0FBRyxDQUFDM0UsTUFBSixHQUFhLEVBQXpCLEVBQTZCO0FBQ3pCLGFBQU8yRSxHQUFQO0FBQ0g7O0FBRUQsUUFBTWlFLEtBQUssR0FBR2pFLEdBQUcsQ0FBQ3FILEtBQUosQ0FBVSxHQUFWLENBQWQ7O0FBQ0EsUUFBSXBELEtBQUssQ0FBQzVJLE1BQU4sSUFBZ0IsQ0FBcEIsRUFBdUI7QUFDbkIsVUFBTWlNLE9BQU8sR0FBR3JELEtBQUssQ0FBQyxDQUFELENBQXJCO0FBQ0EsVUFBTXNELE9BQU8sR0FBR3RELEtBQUssQ0FBQyxDQUFELENBQXJCO0FBQ0EsVUFBTXVELE9BQU8sR0FBR3ZELEtBQUssQ0FBQ3dELEtBQU4sQ0FBWSxDQUFaLEVBQWVqSCxJQUFmLENBQW9CLEdBQXBCLENBQWhCOztBQUVBLFVBQUkrRyxPQUFPLENBQUNsTSxNQUFSLEdBQWlCLEVBQXJCLEVBQXlCO0FBQ3JCLFlBQU0ySyxTQUFTLEdBQUd1QixPQUFPLENBQUNHLFNBQVIsQ0FBa0IsQ0FBbEIsRUFBcUIsRUFBckIsSUFBMkIsS0FBM0IsR0FBbUNILE9BQU8sQ0FBQ0csU0FBUixDQUFrQkgsT0FBTyxDQUFDbE0sTUFBUixHQUFpQixFQUFuQyxDQUFyRDtBQUNBLGVBQU8sVUFBR2lNLE9BQUgsY0FBY3RCLFNBQWQsY0FBMkJ3QixPQUEzQixFQUFxQ0csSUFBckMsRUFBUDtBQUNIO0FBQ0o7O0FBRUQsV0FBTzNILEdBQVA7QUFDSCxHQXBrQ3lCOztBQXNrQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXlFLEVBQUFBLG1CQTNrQzBCLCtCQTJrQ05tRCxJQTNrQ00sRUEya0NBO0FBQ3RCLFFBQUksQ0FBQ0EsSUFBRCxJQUFTQSxJQUFJLENBQUN2TSxNQUFMLEdBQWMsR0FBM0IsRUFBZ0M7QUFDNUIsYUFBT3VNLElBQVA7QUFDSDs7QUFFRCxRQUFNQyxLQUFLLEdBQUdELElBQUksQ0FBQ1AsS0FBTCxDQUFXLElBQVgsRUFBaUJwRixNQUFqQixDQUF3QixVQUFBNkYsSUFBSTtBQUFBLGFBQUlBLElBQUksQ0FBQ0gsSUFBTCxFQUFKO0FBQUEsS0FBNUIsQ0FBZCxDQUxzQixDQU90Qjs7QUFDQSxRQUFNSSxTQUFTLEdBQUdGLEtBQUssQ0FBQyxDQUFELENBQUwsSUFBWSxFQUE5QjtBQUNBLFFBQU1HLFFBQVEsR0FBR0gsS0FBSyxDQUFDQSxLQUFLLENBQUN4TSxNQUFOLEdBQWUsQ0FBaEIsQ0FBTCxJQUEyQixFQUE1QyxDQVRzQixDQVd0Qjs7QUFDQSxRQUFJME0sU0FBUyxDQUFDRSxRQUFWLENBQW1CLG1CQUFuQixDQUFKLEVBQTZDO0FBQ3pDLHVCQUFVRixTQUFWLGdCQUF5QkMsUUFBekI7QUFDSCxLQWRxQixDQWdCdEI7OztBQUNBLFFBQU1FLFNBQVMsR0FBR04sSUFBSSxDQUFDTyxPQUFMLENBQWEsS0FBYixFQUFvQixHQUFwQixFQUF5QlIsSUFBekIsRUFBbEI7O0FBQ0EsUUFBSU8sU0FBUyxDQUFDN00sTUFBVixHQUFtQixFQUF2QixFQUEyQjtBQUN2QixhQUFPNk0sU0FBUyxDQUFDUixTQUFWLENBQW9CLENBQXBCLEVBQXVCLEVBQXZCLElBQTZCLEtBQTdCLEdBQXFDUSxTQUFTLENBQUNSLFNBQVYsQ0FBb0JRLFNBQVMsQ0FBQzdNLE1BQVYsR0FBbUIsRUFBdkMsQ0FBNUM7QUFDSDs7QUFFRCxXQUFPNk0sU0FBUDtBQUNILEdBbG1DeUI7O0FBb21DMUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJL0UsRUFBQUEsVUF6bUMwQixzQkF5bUNmaUYsSUF6bUNlLEVBeW1DVDtBQUNiLFFBQU1DLEdBQUcsR0FBRztBQUNSLFdBQUssT0FERztBQUVSLFdBQUssTUFGRztBQUdSLFdBQUssTUFIRztBQUlSLFdBQUssUUFKRztBQUtSLFdBQUs7QUFMRyxLQUFaO0FBT0EsV0FBT0QsSUFBSSxDQUFDRCxPQUFMLENBQWEsVUFBYixFQUF5QixVQUFBRyxDQUFDO0FBQUEsYUFBSUQsR0FBRyxDQUFDQyxDQUFELENBQVA7QUFBQSxLQUExQixDQUFQO0FBQ0gsR0FsbkN5Qjs7QUFvbkMxQjtBQUNKO0FBQ0E7QUFDSWpMLEVBQUFBLG1CQXZuQzBCLGlDQXVuQ0w7QUFDakIsUUFBSXhGLHFCQUFxQixDQUFDSyxtQkFBdEIsQ0FBMENpRSxRQUExQyxDQUFtRCxZQUFuRCxDQUFKLEVBQXNFO0FBQ2xFdEUsTUFBQUEscUJBQXFCLENBQUNPLG1CQUF0QixDQUEwQ21FLElBQTFDO0FBQ0gsS0FGRCxNQUVPO0FBQ0gxRSxNQUFBQSxxQkFBcUIsQ0FBQ08sbUJBQXRCLENBQTBDcUssSUFBMUM7QUFDSDs7QUFDRDVLLElBQUFBLHFCQUFxQixDQUFDNkUsU0FBdEI7QUFDSCxHQTluQ3lCOztBQWdvQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJNkwsRUFBQUEsZ0JBdG9DMEIsNEJBc29DVDlKLFFBdG9DUyxFQXNvQ0M7QUFDdkIsUUFBTUYsTUFBTSxHQUFHRSxRQUFmLENBRHVCLENBR3ZCOztBQUNBLFFBQU0rSixjQUFjLEdBQUcsQ0FDbkIsUUFEbUIsRUFFbkIsZ0JBRm1CLENBQXZCLENBSnVCLENBU3ZCOztBQUNBM0ksSUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVl2QixNQUFNLENBQUNDLElBQW5CLEVBQXlCdUIsT0FBekIsQ0FBaUMsVUFBQUMsR0FBRyxFQUFJO0FBQ3BDLFVBQUlBLEdBQUcsQ0FBQ3lJLFVBQUosQ0FBZSxRQUFmLEtBQTRCRCxjQUFjLENBQUNQLFFBQWYsQ0FBd0JqSSxHQUF4QixDQUFoQyxFQUE4RDtBQUMxRCxlQUFPekIsTUFBTSxDQUFDQyxJQUFQLENBQVl3QixHQUFaLENBQVA7QUFDSDtBQUNKLEtBSkQsRUFWdUIsQ0FnQnZCOztBQUNBLFFBQU0wSSxTQUFTLEdBQUcsRUFBbEI7QUFDQSxRQUFJQyxlQUFlLEdBQUcsS0FBdEIsQ0FsQnVCLENBb0J2Qjs7QUFDQTVRLElBQUFBLENBQUMsQ0FBQyxnRUFBRCxDQUFELENBQW9FNlEsSUFBcEUsQ0FBeUUsVUFBQ0MsWUFBRCxFQUFlQyxHQUFmLEVBQXVCO0FBQzVGLFVBQU1DLFNBQVMsR0FBR2hSLENBQUMsQ0FBQytRLEdBQUQsQ0FBRCxDQUFPakQsSUFBUCxDQUFZLGlCQUFaLENBQWxCOztBQUNBLFVBQUlrRCxTQUFTLElBQUlsUixxQkFBcUIsQ0FBQ1ksa0JBQXRCLENBQXlDc1EsU0FBekMsQ0FBakIsRUFBc0U7QUFDbEUsWUFBTUMsUUFBUSxHQUFHblIscUJBQXFCLENBQUNZLGtCQUF0QixDQUF5Q3NRLFNBQXpDLENBQWpCO0FBQ0EsWUFBTUUsZUFBZSxHQUFHbFIsQ0FBQyxDQUFDK1EsR0FBRCxDQUFELENBQU9uTSxJQUFQLENBQVksV0FBWixFQUF5QlIsUUFBekIsQ0FBa0MsY0FBbEMsQ0FBeEIsQ0FGa0UsQ0FJbEU7O0FBQ0EsWUFBSTBNLFlBQVksS0FBS0csUUFBUSxDQUFDMUcsUUFBMUIsSUFBc0MyRyxlQUFlLEtBQUtELFFBQVEsQ0FBQ2hHLFFBQXZFLEVBQWlGO0FBQzdFMkYsVUFBQUEsZUFBZSxHQUFHLElBQWxCO0FBQ0g7O0FBRURELFFBQUFBLFNBQVMsQ0FBQ3ZFLElBQVYsQ0FBZTtBQUNYcEIsVUFBQUEsSUFBSSxFQUFFZ0csU0FESztBQUVYL0YsVUFBQUEsUUFBUSxFQUFFaUcsZUFGQztBQUdYM0csVUFBQUEsUUFBUSxFQUFFdUc7QUFIQyxTQUFmO0FBS0g7QUFDSixLQWpCRCxFQXJCdUIsQ0F3Q3ZCOztBQUNBLFFBQUlGLGVBQUosRUFBcUI7QUFDakJwSyxNQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWVMsTUFBWixHQUFxQnlKLFNBQXJCO0FBQ0g7O0FBRUQsV0FBT25LLE1BQVA7QUFDSCxHQXByQ3lCOztBQXNyQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTJLLEVBQUFBLGVBM3JDMEIsMkJBMnJDVjdLLFFBM3JDVSxFQTJyQ0E7QUFDdEJ0RyxJQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQjZJLE1BQXJCLEdBRHNCLENBR3RCOztBQUNBLFFBQUksQ0FBQ3ZDLFFBQVEsQ0FBQ0UsTUFBZCxFQUFzQjtBQUNsQlQsTUFBQUEsSUFBSSxDQUFDcUwsYUFBTCxDQUFtQjdLLFdBQW5CLENBQStCLFVBQS9CO0FBQ0F6RyxNQUFBQSxxQkFBcUIsQ0FBQ3VSLHdCQUF0QixDQUErQy9LLFFBQS9DO0FBQ0gsS0FIRCxNQUdPO0FBQ0g7QUFDQXhHLE1BQUFBLHFCQUFxQixDQUFDQyxRQUF0QixDQUErQm9ILElBQS9CLENBQW9DLFdBQXBDLEVBQWlELGtCQUFqRCxFQUFxRXJILHFCQUFxQixDQUFDUSxjQUEzRjtBQUNBUixNQUFBQSxxQkFBcUIsQ0FBQ0MsUUFBdEIsQ0FBK0JvSCxJQUEvQixDQUFvQyxXQUFwQyxFQUFpRCx3QkFBakQsRUFBMkVySCxxQkFBcUIsQ0FBQ1EsY0FBakc7QUFDQVIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCb0gsSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsYUFBakQsRUFBZ0VySCxxQkFBcUIsQ0FBQ1EsY0FBdEY7QUFDQVIsTUFBQUEscUJBQXFCLENBQUNDLFFBQXRCLENBQStCb0gsSUFBL0IsQ0FBb0MsV0FBcEMsRUFBaUQsbUJBQWpELEVBQXNFckgscUJBQXFCLENBQUNRLGNBQTVGLEVBTEcsQ0FPSDs7QUFDQU4sTUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0JzUixPQUF4QixDQUFnQyxHQUFoQyxFQUFxQyxZQUFXO0FBQzVDdFIsUUFBQUEsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRNkksTUFBUjtBQUNILE9BRkQ7QUFHSCxLQWxCcUIsQ0FvQnRCOzs7QUFDQSxRQUFJLE9BQU8wSSx3QkFBUCxLQUFvQyxXQUF4QyxFQUFxRDtBQUNqREEsTUFBQUEsd0JBQXdCLENBQUNDLHFCQUF6QjtBQUNIO0FBQ0osR0FudEN5Qjs7QUFxdEMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSCxFQUFBQSx3QkF6dEMwQixvQ0F5dENEL0ssUUF6dENDLEVBeXRDUztBQUMvQixRQUFJQSxRQUFRLENBQUNTLFFBQWIsRUFBdUI7QUFDbkIsVUFBTTBLLElBQUksR0FBR3pSLENBQUMsQ0FBQyxPQUFELEVBQVU7QUFBRSxpQkFBTyxxQkFBVDtBQUFnQzBSLFFBQUFBLEVBQUUsRUFBRTtBQUFwQyxPQUFWLENBQWQ7QUFDQSxVQUFNQyxPQUFPLEdBQUczUixDQUFDLENBQUMsT0FBRCxFQUFVO0FBQUUsaUJBQU87QUFBVCxPQUFWLENBQUQsQ0FBZ0NxUSxJQUFoQyxDQUFxQ25QLGVBQWUsQ0FBQzBRLG9CQUFyRCxDQUFoQjtBQUNBSCxNQUFBQSxJQUFJLENBQUNuRyxNQUFMLENBQVlxRyxPQUFaO0FBQ0EsVUFBTUUsR0FBRyxHQUFHN1IsQ0FBQyxDQUFDLE1BQUQsRUFBUztBQUFFLGlCQUFPO0FBQVQsT0FBVCxDQUFiO0FBQ0EsVUFBTThSLFdBQVcsR0FBRyxJQUFJQyxHQUFKLEVBQXBCLENBTG1CLENBT25COztBQUNBLE9BQUMsT0FBRCxFQUFVLFlBQVYsRUFBd0IvSixPQUF4QixDQUFnQyxVQUFBZ0ssT0FBTyxFQUFJO0FBQ3ZDLFlBQUkxTCxRQUFRLENBQUNTLFFBQVQsQ0FBa0JpTCxPQUFsQixDQUFKLEVBQWdDO0FBQzVCLGNBQU1qTCxRQUFRLEdBQUd3QixLQUFLLENBQUNDLE9BQU4sQ0FBY2xDLFFBQVEsQ0FBQ1MsUUFBVCxDQUFrQmlMLE9BQWxCLENBQWQsSUFDWDFMLFFBQVEsQ0FBQ1MsUUFBVCxDQUFrQmlMLE9BQWxCLENBRFcsR0FFWCxDQUFDMUwsUUFBUSxDQUFDUyxRQUFULENBQWtCaUwsT0FBbEIsQ0FBRCxDQUZOO0FBSUFqTCxVQUFBQSxRQUFRLENBQUNpQixPQUFULENBQWlCLFVBQUFoQixLQUFLLEVBQUk7QUFDdEIsZ0JBQUlpTCxXQUFXLEdBQUcsRUFBbEI7O0FBQ0EsZ0JBQUksUUFBT2pMLEtBQVAsTUFBaUIsUUFBakIsSUFBNkJBLEtBQUssQ0FBQ2tMLE9BQXZDLEVBQWdEO0FBQzVDRCxjQUFBQSxXQUFXLEdBQUcvUSxlQUFlLENBQUM4RixLQUFLLENBQUNrTCxPQUFQLENBQWYsSUFBa0NsTCxLQUFLLENBQUNrTCxPQUF0RDtBQUNILGFBRkQsTUFFTztBQUNIRCxjQUFBQSxXQUFXLEdBQUcvUSxlQUFlLENBQUM4RixLQUFELENBQWYsSUFBMEJBLEtBQXhDO0FBQ0g7O0FBRUQsZ0JBQUksQ0FBQzhLLFdBQVcsQ0FBQ0ssR0FBWixDQUFnQkYsV0FBaEIsQ0FBTCxFQUFtQztBQUMvQkgsY0FBQUEsV0FBVyxDQUFDTSxHQUFaLENBQWdCSCxXQUFoQjtBQUNBSixjQUFBQSxHQUFHLENBQUN2RyxNQUFKLENBQVd0TCxDQUFDLENBQUMsTUFBRCxDQUFELENBQVVxUSxJQUFWLENBQWU0QixXQUFmLENBQVg7QUFDSDtBQUNKLFdBWkQ7QUFhSDtBQUNKLE9BcEJEO0FBc0JBUixNQUFBQSxJQUFJLENBQUNuRyxNQUFMLENBQVl1RyxHQUFaO0FBQ0E3UixNQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1Cb0osTUFBbkIsQ0FBMEJxSSxJQUExQjtBQUNIO0FBQ0osR0EzdkN5Qjs7QUE2dkMxQjtBQUNKO0FBQ0E7QUFDSTlNLEVBQUFBLFNBaHdDMEIsdUJBZ3dDZDtBQUNSO0FBQ0EsUUFBSTdFLHFCQUFxQixDQUFDSyxtQkFBdEIsQ0FBMENpRSxRQUExQyxDQUFtRCxZQUFuRCxDQUFKLEVBQXNFO0FBQ2xFMkIsTUFBQUEsSUFBSSxDQUFDbkYsYUFBTCxDQUFtQlcsV0FBbkIsQ0FBK0JSLEtBQS9CLEdBQXVDakIscUJBQXFCLENBQUNxRCw2QkFBN0Q7QUFDSCxLQUZELE1BRU8sSUFBSXJELHFCQUFxQixDQUFDSSxZQUF0QixDQUFtQ3dFLEdBQW5DLE9BQTZDNUUscUJBQXFCLENBQUNRLGNBQXZFLEVBQXVGO0FBQzFGeUYsTUFBQUEsSUFBSSxDQUFDbkYsYUFBTCxDQUFtQlcsV0FBbkIsQ0FBK0JSLEtBQS9CLEdBQXVDLEVBQXZDO0FBQ0gsS0FGTSxNQUVBO0FBQ0hnRixNQUFBQSxJQUFJLENBQUNuRixhQUFMLENBQW1CVyxXQUFuQixDQUErQlIsS0FBL0IsR0FBdUNqQixxQkFBcUIsQ0FBQ2lELDJCQUE3RDtBQUNILEtBUk8sQ0FVUjs7O0FBQ0EsUUFBSWpELHFCQUFxQixDQUFDRyxpQkFBdEIsQ0FBd0N5RSxHQUF4QyxPQUFrRDVFLHFCQUFxQixDQUFDUSxjQUE1RSxFQUE0RjtBQUN4RnlGLE1BQUFBLElBQUksQ0FBQ25GLGFBQUwsQ0FBbUJRLGdCQUFuQixDQUFvQ0wsS0FBcEMsR0FBNEMsRUFBNUM7QUFDSCxLQUZELE1BRU87QUFDSGdGLE1BQUFBLElBQUksQ0FBQ25GLGFBQUwsQ0FBbUJRLGdCQUFuQixDQUFvQ0wsS0FBcEMsR0FBNENqQixxQkFBcUIsQ0FBQ3lDLHFCQUFsRTtBQUNIO0FBQ0osR0FoeEN5Qjs7QUFreEMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0kwSyxFQUFBQSx3QkF2eEMwQixvQ0F1eENEakIsUUF2eENDLEVBdXhDUztBQUMvQixRQUFJcUcsSUFBSSxHQUFHLG1FQUFYO0FBQ0FBLElBQUFBLElBQUksSUFBSSwwQkFBUjtBQUNBQSxJQUFBQSxJQUFJLElBQUksNEJBQVIsQ0FIK0IsQ0FLL0I7O0FBQ0EsUUFBSXJHLFFBQVEsQ0FBQ0csT0FBYixFQUFzQjtBQUNsQmtHLE1BQUFBLElBQUksNERBQW1EdlMscUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ1ksUUFBUSxDQUFDRyxPQUExQyxDQUFuRCxXQUFKO0FBQ0gsS0FSOEIsQ0FVL0I7OztBQUNBLFFBQUlILFFBQVEsQ0FBQ0ssTUFBYixFQUFxQjtBQUNqQmdHLE1BQUFBLElBQUksMkRBQWtEdlMscUJBQXFCLENBQUNzTCxVQUF0QixDQUFpQ1ksUUFBUSxDQUFDSyxNQUExQyxDQUFsRCxDQUFKOztBQUNBLFVBQUlMLFFBQVEsQ0FBQ00sY0FBYixFQUE2QjtBQUN6QitGLFFBQUFBLElBQUksSUFBSSxpREFBUjtBQUNIOztBQUNEQSxNQUFBQSxJQUFJLElBQUksUUFBUjtBQUNILEtBakI4QixDQW1CL0I7OztBQUNBLFFBQUlyRyxRQUFRLENBQUNzRyxVQUFULElBQXVCdEcsUUFBUSxDQUFDTyxRQUFwQyxFQUE4QztBQUMxQzhGLE1BQUFBLElBQUksMERBQWlEckcsUUFBUSxDQUFDc0csVUFBMUQsaUJBQTJFdEcsUUFBUSxDQUFDTyxRQUFwRixXQUFKO0FBQ0gsS0F0QjhCLENBd0IvQjs7O0FBQ0EsUUFBSVAsUUFBUSxDQUFDUSxVQUFiLEVBQXlCO0FBQ3JCNkYsTUFBQUEsSUFBSSxJQUFJLG9GQUFSO0FBQ0gsS0FGRCxNQUVPLElBQUlyRyxRQUFRLENBQUNTLGlCQUFULElBQThCLEVBQWxDLEVBQXNDO0FBQ3pDNEYsTUFBQUEsSUFBSSxrRkFBdUVyRyxRQUFRLENBQUNTLGlCQUFoRix1QkFBSjtBQUNILEtBRk0sTUFFQSxJQUFJVCxRQUFRLENBQUNTLGlCQUFULEdBQTZCLENBQWpDLEVBQW9DO0FBQ3ZDNEYsTUFBQUEsSUFBSSxnRkFBcUVyRyxRQUFRLENBQUNTLGlCQUE5RSx1QkFBSjtBQUNILEtBL0I4QixDQWlDL0I7OztBQUNBLFFBQUlULFFBQVEsQ0FBQ3VHLEdBQVQsSUFBZ0J2RyxRQUFRLENBQUN1RyxHQUFULENBQWFqUCxNQUFiLEdBQXNCLENBQTFDLEVBQTZDO0FBQ3pDK08sTUFBQUEsSUFBSSxJQUFJLHVEQUFSO0FBQ0FBLE1BQUFBLElBQUksSUFBSSxzREFBUjtBQUNBckcsTUFBQUEsUUFBUSxDQUFDdUcsR0FBVCxDQUFhdkssT0FBYixDQUFxQixVQUFBdUssR0FBRyxFQUFJO0FBQ3hCRixRQUFBQSxJQUFJLGtDQUF5QnZTLHFCQUFxQixDQUFDc0wsVUFBdEIsQ0FBaUNtSCxHQUFqQyxDQUF6QixXQUFKO0FBQ0gsT0FGRDtBQUdBRixNQUFBQSxJQUFJLElBQUksY0FBUjtBQUNIOztBQUVEQSxJQUFBQSxJQUFJLElBQUksUUFBUixDQTNDK0IsQ0EyQ2I7O0FBQ2xCQSxJQUFBQSxJQUFJLElBQUksUUFBUixDQTVDK0IsQ0E0Q2I7O0FBQ2xCQSxJQUFBQSxJQUFJLElBQUksUUFBUixDQTdDK0IsQ0E2Q2I7O0FBRWxCLFdBQU9BLElBQVA7QUFDSCxHQXYwQ3lCOztBQXkwQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0kxTSxFQUFBQSw0QkE3MEMwQiwwQ0E2MENLO0FBQzNCLFFBQU02TSxpQkFBaUIsR0FBR3hTLENBQUMsQ0FBQyxjQUFELENBQTNCO0FBQ0EsUUFBTXlTLGVBQWUsR0FBR3pTLENBQUMsQ0FBQyw4QkFBRCxDQUF6QixDQUYyQixDQUkzQjs7QUFDQSxRQUFJMFMsYUFBYSxHQUFHLElBQXBCLENBTDJCLENBTzNCOztBQUNBMVMsSUFBQUEsQ0FBQyxDQUFDMkgsUUFBRCxDQUFELENBQVl6RCxFQUFaLENBQWUsNEJBQWYsRUFBNkMsWUFBTTtBQUMvQ3dPLE1BQUFBLGFBQWEsR0FBR0YsaUJBQWlCLENBQUM5TixHQUFsQixFQUFoQjtBQUNILEtBRkQsRUFSMkIsQ0FZM0I7O0FBQ0E4TixJQUFBQSxpQkFBaUIsQ0FBQ3hKLE9BQWxCLENBQTBCLFdBQTFCLEVBQXVDL0QsUUFBdkMsQ0FBZ0Q7QUFDNUNzRyxNQUFBQSxRQUFRLEVBQUUsa0JBQUM3SSxLQUFELEVBQVc7QUFDakI7QUFDQSxZQUFJZ1EsYUFBYSxLQUFLLElBQWxCLElBQTBCaFEsS0FBSyxLQUFLZ1EsYUFBeEMsRUFBdUQ7QUFDbkRELFVBQUFBLGVBQWUsQ0FBQ0UsVUFBaEIsQ0FBMkIsU0FBM0I7QUFDSCxTQUZELE1BRU87QUFDSEYsVUFBQUEsZUFBZSxDQUFDRSxVQUFoQixDQUEyQixVQUEzQjtBQUNILFNBTmdCLENBUWpCOzs7QUFDQTVNLFFBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNIO0FBWDJDLEtBQWhEO0FBYUgsR0F2MkN5Qjs7QUF5MkMxQjtBQUNKO0FBQ0E7QUFDSWIsRUFBQUEsY0E1MkMwQiw0QkE0MkNUO0FBQ2JZLElBQUFBLElBQUksQ0FBQ2hHLFFBQUwsR0FBZ0JELHFCQUFxQixDQUFDQyxRQUF0QyxDQURhLENBR2I7O0FBQ0FnRyxJQUFBQSxJQUFJLENBQUM2TSxXQUFMLENBQWlCQyxPQUFqQixHQUEyQixJQUEzQjtBQUNBOU0sSUFBQUEsSUFBSSxDQUFDNk0sV0FBTCxDQUFpQkUsU0FBakIsR0FBNkIxTSxrQkFBN0I7QUFDQUwsSUFBQUEsSUFBSSxDQUFDNk0sV0FBTCxDQUFpQkcsVUFBakIsR0FBOEIsY0FBOUIsQ0FOYSxDQVFiOztBQUNBaE4sSUFBQUEsSUFBSSxDQUFDaU4sdUJBQUwsR0FBK0IsSUFBL0IsQ0FUYSxDQVdiOztBQUNBak4sSUFBQUEsSUFBSSxDQUFDa04sbUJBQUwsR0FBMkIsSUFBM0I7QUFDQWxOLElBQUFBLElBQUksQ0FBQ21OLG9CQUFMLEdBQTRCLElBQTVCO0FBQ0FuTixJQUFBQSxJQUFJLENBQUNvTixHQUFMO0FBRUFwTixJQUFBQSxJQUFJLENBQUNuRixhQUFMLEdBQXFCZCxxQkFBcUIsQ0FBQ2MsYUFBM0M7QUFDQW1GLElBQUFBLElBQUksQ0FBQ3lLLGdCQUFMLEdBQXdCMVEscUJBQXFCLENBQUMwUSxnQkFBOUM7QUFDQXpLLElBQUFBLElBQUksQ0FBQ29MLGVBQUwsR0FBdUJyUixxQkFBcUIsQ0FBQ3FSLGVBQTdDO0FBQ0FwTCxJQUFBQSxJQUFJLENBQUMxQyxVQUFMO0FBQ0g7QUFoNEN5QixDQUE5QixDLENBbTRDQTs7QUFDQXJELENBQUMsQ0FBQzJILFFBQUQsQ0FBRCxDQUFZeUwsS0FBWixDQUFrQixZQUFNO0FBQ3BCdFQsRUFBQUEscUJBQXFCLENBQUN1RCxVQUF0QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGFzc3dvcmRTY29yZSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSwgU291bmRGaWxlc1NlbGVjdG9yLCBHZW5lcmFsU2V0dGluZ3NBUEksIENsaXBib2FyZEpTLCBQYXNzd29yZFdpZGdldCwgUGFzc3dvcmRWYWxpZGF0aW9uQVBJLCBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciwgJCAqL1xuXG4vKipcbiAqIEEgbW9kdWxlIHRvIGhhbmRsZSBtb2RpZmljYXRpb24gb2YgZ2VuZXJhbCBzZXR0aW5ncy5cbiAqL1xuY29uc3QgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB3ZWIgYWRtaW4gcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkd2ViQWRtaW5QYXNzd29yZDogJCgnI1dlYkFkbWluUGFzc3dvcmQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmQ6ICQoJyNTU0hQYXNzd29yZCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHdlYiBzc2ggcGFzc3dvcmQgaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlzYWJsZVNTSFBhc3N3b3JkOiAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykucGFyZW50KCcuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGRzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3NoUGFzc3dvcmRTZWdtZW50OiAkKCcjb25seS1pZi1wYXNzd29yZC1lbmFibGVkJyksXG5cbiAgICAvKipcbiAgICAgKiBJZiBwYXNzd29yZCBzZXQsIGl0IHdpbGwgYmUgaGlkZWQgZnJvbSB3ZWIgdWkuXG4gICAgICovXG4gICAgaGlkZGVuUGFzc3dvcmQ6ICd4eHh4eHh4JyxcblxuICAgIC8qKlxuICAgICAqIFNvdW5kIGZpbGUgZmllbGQgSURzXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBzb3VuZEZpbGVGaWVsZHM6IHtcbiAgICAgICAgYW5ub3VuY2VtZW50SW46ICdQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbicsXG4gICAgICAgIGFubm91bmNlbWVudE91dDogJ1BCWFJlY29yZEFubm91bmNlbWVudE91dCdcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIE9yaWdpbmFsIGNvZGVjIHN0YXRlIGZyb20gbGFzdCBsb2FkXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBvcmlnaW5hbENvZGVjU3RhdGU6IHt9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gdHJhY2sgaWYgZGF0YSBoYXMgYmVlbiBsb2FkZWQgZnJvbSBBUElcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBkYXRhTG9hZGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczogeyAvLyBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlc1xuICAgICAgICBwYnhuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnUEJYTmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgV2ViQWRtaW5QYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXRjaFtXZWJBZG1pblBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFNTSFBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnU1NIUGFzc3dvcmQnLFxuICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZFJlcGVhdDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbU1NIUGFzc3dvcmRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQlBvcnQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCSFRUUFNQb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb1dFQlBvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgV0VCSFRUUFNQb3J0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV0VCSFRUUFNQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbV0VCUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1UTFNQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBBSkFNUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ0FKQU1Qb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUFKQU1Qb3J0T3V0T2ZSYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgU0lQQXV0aFByZWZpeDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NJUEF1dGhQcmVmaXgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bYS16QS1aXSokL10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4SW52YWxpZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgd2ViIGFkbWluIHBhc3N3b3JkIGZpZWxkIHdoZW4gaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgd2ViQWRtaW5QYXNzd29yZFJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5V2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1xcZC8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9OdW1iZXJzXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bQS1aXS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkcyArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcbiAgICAvLyBSdWxlcyBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZCB3aGVuIFNTSCBsb2dpbiB0aHJvdWdoIHRoZSBwYXNzd29yZCBlbmFibGVkLCBhbmQgaXQgbm90IGVxdWFsIHRvIGhpZGRlblBhc3N3b3JkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNQYXNzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9bYS16XS8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb0xvd1NpbXZvbFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvXFxkLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTnVtYmVyc1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW0EtWl0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9VcHBlclNpbXZvbFxuICAgICAgICB9XG4gICAgXSxcblxuICAgIC8vIFJ1bGVzIGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkIHdoZW4gU1NIIGxvZ2luIHRocm91Z2ggdGhlIHBhc3N3b3JkIGRpc2FibGVkXG4gICAgYWRkaXRpb25hbFNzaFZhbGlkUnVsZXNOb1Bhc3M6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYWtTU0hQYXNzd29yZCxcbiAgICAgICAgfVxuICAgIF0sXG5cbiAgICAvKipcbiAgICAgKiBDbGlwYm9hcmQgaW5zdGFuY2UgZm9yIGNvcHkgZnVuY3Rpb25hbGl0eVxuICAgICAqIEB0eXBlIHtDbGlwYm9hcmRKU31cbiAgICAgKi9cbiAgICBjbGlwYm9hcmQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogIEluaXRpYWxpemUgbW9kdWxlIHdpdGggZXZlbnQgYmluZGluZ3MgYW5kIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldHNcbiAgICAgICAgLy8gV2ViIEFkbWluIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC5pbml0KGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZCwge1xuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdnZW5lcmFsX3dlYicsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogZmFsc2UsICAgICAvLyBObyBzaG93L2hpZGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSwgICAgICAgICAvLyBObyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU1NIIFBhc3N3b3JkIHdpZGdldCAtIG9ubHkgdmFsaWRhdGlvbiBhbmQgd2FybmluZ3MsIG5vIGJ1dHRvbnNcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc3NoV2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLCB7XG4gICAgICAgICAgICAgICAgY29udGV4dDogJ2dlbmVyYWxfc3NoJyxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsICAgICAgICAgLy8gTm8gZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSwgICAgIC8vIE5vIHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLCAgICAgICAgIC8vIE5vIGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgU1NIIGRpc2FibGUgY2hlY2tib3hcbiAgICAgICAgICAgICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuaGlkZVdhcm5pbmdzKHNzaFdpZGdldCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzc2hXaWRnZXQuZWxlbWVudHMuJHNjb3JlU2VjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3NoV2lkZ2V0LmVsZW1lbnRzLiRzY29yZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghaXNEaXNhYmxlZCAmJiBzc2hXaWRnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQuY2hlY2tQYXNzd29yZChzc2hXaWRnZXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyB3aGVuIHBhc3N3b3JkcyBjaGFuZ2VcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiR3ZWJBZG1pblBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kc3NoUGFzc3dvcmQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpICE9PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEVuYWJsZSBkcm9wZG93bnMgb24gdGhlIGZvcm0gKGV4Y2VwdCBzb3VuZCBmaWxlIHNlbGVjdG9ycylcbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybSAuZHJvcGRvd24nKS5ub3QoJy5hdWRpby1tZXNzYWdlLXNlbGVjdCcpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gRW5hYmxlIGNoZWNrYm94ZXMgb24gdGhlIGZvcm1cbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtZm9ybSAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIENvZGVjIHRhYmxlIGRyYWctbi1kcm9wIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgLy8gU2VlIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkgd2hpY2ggaXMgY2FsbGVkIGZyb20gdXBkYXRlQ29kZWNUYWJsZXMoKVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvcnMgd2l0aCBIVE1MIGljb25zIHN1cHBvcnRcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcnMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTm90ZTogU1NIIGtleXMgdGFibGUgd2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBkYXRhIGxvYWRzXG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRydW5jYXRlZCBmaWVsZHMgZGlzcGxheVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIGNvcHkgYnV0dG9uc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWRkaXRpb25hbCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcblxuICAgICAgICAvLyBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KHtcbiAgICAgICAgICAgICdvbkNoYW5nZSc6IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkXG4gICAgICAgIH0pO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0hpZGVTU0hQYXNzd29yZCgpO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBoYW5kbGUgdGFiIGFjdGl2YXRpb25cbiAgICAgICAgJCh3aW5kb3cpLm9uKCdHUy1BY3RpdmF0ZVRhYicsIChldmVudCwgbmFtZVRhYikgPT4ge1xuICAgICAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKCdjaGFuZ2UgdGFiJywgbmFtZVRhYik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaWYgKHR5cGVvZiBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBQQlhMYW5ndWFnZSBjaGFuZ2UgZGV0ZWN0aW9uIGZvciByZXN0YXJ0IHdhcm5pbmdcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVQQlhMYW5ndWFnZVdhcm5pbmcoKTtcblxuICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSBBUEkgaW5zdGVhZCBvZiB1c2luZyBzZXJ2ZXItcmVuZGVyZWQgdmFsdWVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkRGF0YSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggSFRNTCBpY29ucyBhbmQgY2hhbmdlIHRyYWNraW5nXG4gICAgICogTm90ZTogVGhlIEhUTUwgc3RydWN0dXJlIGlzIG5vdyBwcm92aWRlZCBieSB0aGUgcGxheUFkZE5ld1NvdW5kV2l0aEljb25zIHBhcnRpYWw6XG4gICAgICogLSBIaWRkZW4gaW5wdXQ6IDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJblwiIG5hbWU9XCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJblwiPlxuICAgICAqIC0gRHJvcGRvd24gZGl2OiA8ZGl2IGNsYXNzPVwidWkgc2VsZWN0aW9uIGRyb3Bkb3duIHNlYXJjaCBQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbi1zZWxlY3RcIj5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3JzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGluY29taW5nIGFubm91bmNlbWVudCBzZWxlY3RvclxuICAgICAgICBTb3VuZEZpbGVzU2VsZWN0b3IuaW5pdGlhbGl6ZVdpdGhJY29ucyhcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zb3VuZEZpbGVGaWVsZHMuYW5ub3VuY2VtZW50SW4sIFxuICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3V0Z29pbmcgYW5ub3VuY2VtZW50IHNlbGVjdG9yXG4gICAgICAgIFNvdW5kRmlsZXNTZWxlY3Rvci5pbml0aWFsaXplV2l0aEljb25zKFxuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNvdW5kRmlsZUZpZWxkcy5hbm5vdW5jZW1lbnRPdXQsIFxuICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBnZW5lcmFsIHNldHRpbmdzIGRhdGEgZnJvbSBBUElcbiAgICAgKiBVc2VkIGJvdGggb24gaW5pdGlhbCBwYWdlIGxvYWQgYW5kIGZvciBtYW51YWwgcmVmcmVzaFxuICAgICAqIENhbiBiZSBjYWxsZWQgYW55dGltZSB0byByZWxvYWQgdGhlIGZvcm0gZGF0YTogZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmxvYWREYXRhKClcbiAgICAgKi9cbiAgICBsb2FkRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHRoZSBmb3JtXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBjb25zb2xlLmxvZygnTG9hZGluZyBnZW5lcmFsIHNldHRpbmdzIGZyb20gQVBJLi4uJyk7XG4gICAgICAgIFxuICAgICAgICBHZW5lcmFsU2V0dGluZ3NBUEkuZ2V0U2V0dGluZ3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBUEkgUmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUG9wdWxhdGluZyBmb3JtIHdpdGg6JywgcmVzcG9uc2UuZGF0YS5zZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgLy8gUG9wdWxhdGUgZm9ybSB3aXRoIHRoZSByZWNlaXZlZCBkYXRhXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZGF0YUxvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3YXJuaW5ncyBmb3IgZGVmYXVsdCBwYXNzd29yZHMgYWZ0ZXIgRE9NIHVwZGF0ZVxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLnBhc3N3b3JkVmFsaWRhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgRE9NIGlzIHVwZGF0ZWQgYWZ0ZXIgcG9wdWxhdGVGb3JtXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dEZWZhdWx0UGFzc3dvcmRXYXJuaW5ncyhyZXNwb25zZS5kYXRhLnBhc3N3b3JkVmFsaWRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBFcnJvcjonLCByZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93QXBpRXJyb3IocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBzZXR0aW5ncyBhbmQgYWRkaXRpb25hbCBkYXRhXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gZGF0YS5zZXR0aW5ncyB8fCBkYXRhO1xuICAgICAgICBjb25zdCBjb2RlY3MgPSBkYXRhLmNvZGVjcyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyB1c2luZyBGb21hbnRpYyBVSSBmb3JtIEFQSVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHNldHRpbmdzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBzcGVjaWFsIGZpZWxkIHR5cGVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5wb3B1bGF0ZVNwZWNpYWxGaWVsZHMoc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBzb3VuZCBmaWxlIHZhbHVlcyB3aXRoIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkubG9hZFNvdW5kRmlsZVZhbHVlcyhzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY29kZWMgdGFibGVzXG4gICAgICAgIGlmIChjb2RlY3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgZmllbGRzIChoaWRlIGFjdHVhbCBwYXNzd29yZHMpXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUGFzc3dvcmRGaWVsZHMoc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIFNTSCBwYXNzd29yZCB2aXNpYmlsaXR5XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU1NIIGtleXMgdGFibGUgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBzc2hLZXlzVGFibGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBzc2hLZXlzVGFibGUuaW5pdGlhbGl6ZSgnc3NoLWtleXMtY29udGFpbmVyJywgJ1NTSEF1dGhvcml6ZWRLZXlzJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyB3aXRoIG5ldyBkYXRhXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50IHRvIG5vdGlmeSB0aGF0IGRhdGEgaGFzIGJlZW4gbG9hZGVkXG4gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ0dlbmVyYWxTZXR0aW5ncy5kYXRhTG9hZGVkJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgc3BlY2lhbCBmaWVsZCB0eXBlcyB0aGF0IG5lZWQgY3VzdG9tIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVTcGVjaWFsRmllbGRzKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIFByaXZhdGUga2V5IGV4aXN0ZW5jZSBpcyBub3cgZGV0ZXJtaW5lZCBieSBjaGVja2luZyBpZiB2YWx1ZSBlcXVhbHMgSElEREVOX1BBU1NXT1JEXG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2VydGlmaWNhdGUgaW5mb1xuICAgICAgICBpZiAoc2V0dGluZ3MuV0VCSFRUUFNQdWJsaWNLZXlfaW5mbykge1xuICAgICAgICAgICAgJCgnI1dFQkhUVFBTUHVibGljS2V5JykuZGF0YSgnY2VydC1pbmZvJywgc2V0dGluZ3MuV0VCSFRUUFNQdWJsaWNLZXlfaW5mbyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjaGVja2JveGVzIChBUEkgcmV0dXJucyBib29sZWFuIHZhbHVlcylcbiAgICAgICAgT2JqZWN0LmtleXMoc2V0dGluZ3MpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQoYCMke2tleX1gKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gc2V0dGluZ3Nba2V5XSA9PT0gdHJ1ZSB8fCBzZXR0aW5nc1trZXldID09PSAnMScgfHwgc2V0dGluZ3Nba2V5XSA9PT0gMTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3guY2hlY2tib3goaXNDaGVja2VkID8gJ2NoZWNrJyA6ICd1bmNoZWNrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSByZWd1bGFyIGRyb3Bkb3ducyAoZXhjbHVkaW5nIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdoaWNoIGFyZSBoYW5kbGVkIHNlcGFyYXRlbHkpXG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtrZXl9YCkucGFyZW50KCcuZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID4gMCAmJiAhJGRyb3Bkb3duLmhhc0NsYXNzKCdhdWRpby1tZXNzYWdlLXNlbGVjdCcpKSB7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIGZpZWxkcyB3aXRoIGhpZGRlbiBwYXNzd29yZCBpbmRpY2F0b3JcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkRmllbGRzKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIEhpZGUgYWN0dWFsIHBhc3N3b3JkcyBhbmQgc2hvdyBoaWRkZW4gaW5kaWNhdG9yXG4gICAgICAgIGlmIChzZXR0aW5ncy5XZWJBZG1pblBhc3N3b3JkICYmIHNldHRpbmdzLldlYkFkbWluUGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHNldHRpbmdzLlNTSFBhc3N3b3JkICYmIHNldHRpbmdzLlNTSFBhc3N3b3JkICE9PSAnJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBBUEkgZXJyb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbWVzc2FnZXMgLSBFcnJvciBtZXNzYWdlcyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHNob3dBcGlFcnJvcihtZXNzYWdlcykge1xuICAgICAgICBpZiAobWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IEFycmF5LmlzQXJyYXkobWVzc2FnZXMuZXJyb3IpIFxuICAgICAgICAgICAgICAgID8gbWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSBcbiAgICAgICAgICAgICAgICA6IG1lc3NhZ2VzLmVycm9yO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgd2FybmluZ3MgZm9yIGRlZmF1bHQgcGFzc3dvcmRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHZhbGlkYXRpb24gLSBQYXNzd29yZCB2YWxpZGF0aW9uIHJlc3VsdHMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBzaG93RGVmYXVsdFBhc3N3b3JkV2FybmluZ3ModmFsaWRhdGlvbikge1xuICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIHBhc3N3b3JkLXZhbGlkYXRlIG1lc3NhZ2VzIGZpcnN0XG4gICAgICAgICQoJy5wYXNzd29yZC12YWxpZGF0ZScpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGZvciBkZWZhdWx0IFdlYiBBZG1pbiBwYXNzd29yZFxuICAgICAgICBpZiAodmFsaWRhdGlvbi5pc0RlZmF1bHRXZWJQYXNzd29yZCkge1xuICAgICAgICAgICAgLy8gRmluZCB0aGUgcGFzc3dvcmQgZmllbGRzIGdyb3VwIC0gdHJ5IG11bHRpcGxlIHNlbGVjdG9yc1xuICAgICAgICAgICAgbGV0ICR3ZWJQYXNzd29yZEZpZWxkcyA9ICQoJyNXZWJBZG1pblBhc3N3b3JkJykuY2xvc2VzdCgnLnR3by5maWVsZHMnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCR3ZWJQYXNzd29yZEZpZWxkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgYWx0ZXJuYXRpdmUgc2VsZWN0b3IgaWYgdGhlIGZpcnN0IG9uZSBkb2Vzbid0IHdvcmtcbiAgICAgICAgICAgICAgICAkd2ViUGFzc3dvcmRGaWVsZHMgPSAkKCcjV2ViQWRtaW5QYXNzd29yZCcpLnBhcmVudCgpLnBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHdlYlBhc3N3b3JkRmllbGRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgd2FybmluZyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgY29uc3Qgd2FybmluZ0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBuZWdhdGl2ZSBpY29uIG1lc3NhZ2UgcGFzc3dvcmQtdmFsaWRhdGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1NldFBhc3N3b3JkIHx8ICdTZWN1cml0eSBXYXJuaW5nJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5nc19TZXRQYXNzd29yZEluZm8gfHwgJ1lvdSBhcmUgdXNpbmcgdGhlIGRlZmF1bHQgcGFzc3dvcmQuIFBsZWFzZSBjaGFuZ2UgaXQgZm9yIHNlY3VyaXR5Lid9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5zZXJ0IHdhcm5pbmcgYmVmb3JlIHRoZSBwYXNzd29yZCBmaWVsZHNcbiAgICAgICAgICAgICAgICAkd2ViUGFzc3dvcmRGaWVsZHMuYmVmb3JlKHdhcm5pbmdIdG1sKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGZvciBkZWZhdWx0IFNTSCBwYXNzd29yZFxuICAgICAgICBpZiAodmFsaWRhdGlvbi5pc0RlZmF1bHRTU0hQYXNzd29yZCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgU1NIIHBhc3N3b3JkIGxvZ2luIGlzIGVuYWJsZWRcbiAgICAgICAgICAgIGNvbnN0IHNzaFBhc3N3b3JkRGlzYWJsZWQgPSAkKCcjU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFzc2hQYXNzd29yZERpc2FibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkcyBncm91cFxuICAgICAgICAgICAgICAgIGxldCAkc3NoUGFzc3dvcmRGaWVsZHMgPSAkKCcjU1NIUGFzc3dvcmQnKS5jbG9zZXN0KCcudHdvLmZpZWxkcycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkc3NoUGFzc3dvcmRGaWVsZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSBhbHRlcm5hdGl2ZSBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAgICAkc3NoUGFzc3dvcmRGaWVsZHMgPSAkKCcjU1NIUGFzc3dvcmQnKS5wYXJlbnQoKS5wYXJlbnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRzc2hQYXNzd29yZEZpZWxkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2FybmluZ0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbmVnYXRpdmUgaWNvbiBtZXNzYWdlIHBhc3N3b3JkLXZhbGlkYXRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19TZXRQYXNzd29yZCB8fCAnU2VjdXJpdHkgV2FybmluZyd9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1NldFBhc3N3b3JkSW5mbyB8fCAnWW91IGFyZSB1c2luZyB0aGUgZGVmYXVsdCBwYXNzd29yZC4gUGxlYXNlIGNoYW5nZSBpdCBmb3Igc2VjdXJpdHkuJ308L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEluc2VydCB3YXJuaW5nIGJlZm9yZSB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICAkc3NoUGFzc3dvcmRGaWVsZHMuYmVmb3JlKHdhcm5pbmdIdG1sKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgc291bmQgZmlsZSB2YWx1ZXMgd2l0aCBIVE1MIHJlcHJlc2VudGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTb3VuZEZpbGVWYWx1ZXMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gTG9hZCBpbmNvbWluZyBhbm5vdW5jZW1lbnQgc291bmQgZmlsZVxuICAgICAgICBpZiAoc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4pIHtcbiAgICAgICAgICAgIGNvbnN0IGFubm91bmNlbWVudEluUmVwcmVzZW50ID0gc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW5fUmVwcmVzZW50IHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudEluUmVwcmVzZW50O1xuICAgICAgICAgICAgaWYgKGFubm91bmNlbWVudEluUmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLnNldEluaXRpYWxWYWx1ZVdpdGhJY29uKFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc291bmRGaWxlRmllbGRzLmFubm91bmNlbWVudEluLFxuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRJbixcbiAgICAgICAgICAgICAgICAgICAgYW5ub3VuY2VtZW50SW5SZXByZXNlbnRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKGAuJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc291bmRGaWxlRmllbGRzLmFubm91bmNlbWVudElufS1zZWxlY3RgKVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudEluKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBvdXRnb2luZyBhbm5vdW5jZW1lbnQgc291bmQgZmlsZVxuICAgICAgICBpZiAoc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0KSB7XG4gICAgICAgICAgICBjb25zdCBhbm5vdW5jZW1lbnRPdXRSZXByZXNlbnQgPSBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXRfUmVwcmVzZW50IHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXRSZXByZXNlbnQ7XG4gICAgICAgICAgICBpZiAoYW5ub3VuY2VtZW50T3V0UmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLnNldEluaXRpYWxWYWx1ZVdpdGhJY29uKFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc291bmRGaWxlRmllbGRzLmFubm91bmNlbWVudE91dCxcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0LFxuICAgICAgICAgICAgICAgICAgICBhbm5vdW5jZW1lbnRPdXRSZXByZXNlbnRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKGAuJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc291bmRGaWxlRmllbGRzLmFubm91bmNlbWVudE91dH0tc2VsZWN0YClcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGFuZCB1cGRhdGUgY29kZWMgdGFibGVzIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvZGVjcyAtIEFycmF5IG9mIGNvZGVjIGNvbmZpZ3VyYXRpb25zXG4gICAgICovXG4gICAgdXBkYXRlQ29kZWNUYWJsZXMoY29kZWNzKSB7XG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIGNvZGVjIHN0YXRlIGZvciBjb21wYXJpc29uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNlcGFyYXRlIGF1ZGlvIGFuZCB2aWRlbyBjb2RlY3NcbiAgICAgICAgY29uc3QgYXVkaW9Db2RlY3MgPSBjb2RlY3MuZmlsdGVyKGMgPT4gYy50eXBlID09PSAnYXVkaW8nKS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgIGNvbnN0IHZpZGVvQ29kZWNzID0gY29kZWNzLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ3ZpZGVvJykuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgYXVkaW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUoYXVkaW9Db2RlY3MsICdhdWRpbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgdmlkZW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUodmlkZW9Db2RlY3MsICd2aWRlbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSBsb2FkZXJzIGFuZCBzaG93IHRhYmxlc1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLWxvYWRlciwgI3ZpZGVvLWNvZGVjcy1sb2FkZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUsICN2aWRlby1jb2RlY3MtdGFibGUnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIHJlb3JkZXJpbmdcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb2RlYyB0YWJsZSByb3dzIGZyb20gZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvZGVjcyAtIEFycmF5IG9mIGNvZGVjIG9iamVjdHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtICdhdWRpbycgb3IgJ3ZpZGVvJ1xuICAgICAqL1xuICAgIGJ1aWxkQ29kZWNUYWJsZShjb2RlY3MsIHR5cGUpIHtcbiAgICAgICAgY29uc3QgJHRhYmxlQm9keSA9ICQoYCMke3R5cGV9LWNvZGVjcy10YWJsZSB0Ym9keWApO1xuICAgICAgICAkdGFibGVCb2R5LmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICBjb2RlY3MuZm9yRWFjaCgoY29kZWMsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBzdGF0ZSBmb3IgY2hhbmdlIGRldGVjdGlvblxuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZVtjb2RlYy5uYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXgsXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGNvZGVjLmRpc2FibGVkXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFibGUgcm93XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gY29kZWMuZGlzYWJsZWQgPT09IHRydWUgfHwgY29kZWMuZGlzYWJsZWQgPT09ICcxJyB8fCBjb2RlYy5kaXNhYmxlZCA9PT0gMTtcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrZWQgPSAhaXNEaXNhYmxlZCA/ICdjaGVja2VkJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCByb3dIdG1sID0gYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cImNvZGVjLXJvd1wiIGlkPVwiY29kZWMtJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtpbmRleH1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb2RlYy1uYW1lPVwiJHtjb2RlYy5uYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtb3JpZ2luYWwtcHJpb3JpdHk9XCIke2luZGV4fVwiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJjb2xsYXBzaW5nIGRyYWdIYW5kbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic29ydCBncmV5IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggY29kZWNzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwiY29kZWNfJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2NoZWNrZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmluZGV4PVwiMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJjb2RlY18ke2NvZGVjLm5hbWV9XCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjb2RlYy5kZXNjcmlwdGlvbiB8fCBjb2RlYy5uYW1lKX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICR0YWJsZUJvZHkuYXBwZW5kKHJvd0h0bWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyBmb3IgdGhlIG5ldyByb3dzXG4gICAgICAgICR0YWJsZUJvZHkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHdoZW4gY29kZWMgaXMgZW5hYmxlZC9kaXNhYmxlZFxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIGNvZGVjIHRhYmxlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkge1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlLCAjdmlkZW8tY29kZWNzLXRhYmxlJykudGFibGVEbkQoe1xuICAgICAgICAgICAgb25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnLFxuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB3aGVuIGNvZGVjcyBhcmUgcmVvcmRlcmVkXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjZXJ0aWZpY2F0ZSBmaWVsZCBkaXNwbGF5IG9ubHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpIHtcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIG9ubHlcbiAgICAgICAgY29uc3QgJGNlcnRQdWJLZXlGaWVsZCA9ICQoJyNXRUJIVFRQU1B1YmxpY0tleScpO1xuICAgICAgICBpZiAoJGNlcnRQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRjZXJ0UHViS2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGNlcnRpZmljYXRlIGluZm8gaWYgYXZhaWxhYmxlIGZyb20gZGF0YSBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGNlcnRJbmZvID0gJGNlcnRQdWJLZXlGaWVsZC5kYXRhKCdjZXJ0LWluZm8nKSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzIGZvciB0aGlzIGZpZWxkIG9ubHlcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheSwgLmNlcnQtZWRpdC1mb3JtJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbWVhbmluZ2Z1bCBkaXNwbGF5IHRleHQgZnJvbSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgICAgICAgICAgbGV0IGRpc3BsYXlUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHN1YmplY3QvZG9tYWluXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDwn5OcICR7Y2VydEluZm8uc3ViamVjdH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGlzc3VlciBpZiBub3Qgc2VsZi1zaWduZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3VlciAmJiAhY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYGJ5ICR7Y2VydEluZm8uaXNzdWVyfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKCcoU2VsZi1zaWduZWQpJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCB2YWxpZGl0eSBkYXRlc1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4p2MIEV4cGlyZWQgJHtjZXJ0SW5mby52YWxpZF90b31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDimqDvuI8gRXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKchSBWYWxpZCB1bnRpbCAke2NlcnRJbmZvLnZhbGlkX3RvfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IHBhcnRzLmpvaW4oJyB8ICcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRydW5jYXRlZCBjZXJ0aWZpY2F0ZVxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS50cnVuY2F0ZUNlcnRpZmljYXRlKGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIG9yaWdpbmFsIGZpZWxkXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIHN0YXR1cyBjb2xvciBjbGFzcyBiYXNlZCBvbiBjZXJ0aWZpY2F0ZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBsZXQgc3RhdHVzQ2xhc3MgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICd3YXJuaW5nJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgY2VydC1kaXNwbGF5ICR7c3RhdHVzQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZGlzcGxheVRleHQpfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cImJhc2ljXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlDZXJ0IHx8ICdDb3B5IGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgaW5mby1jZXJ0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDZXJ0SW5mbyB8fCAnQ2VydGlmaWNhdGUgZGV0YWlscyd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBlZGl0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0IHx8ICdFZGl0IGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImVkaXQgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZGVsZXRlLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZSB8fCAnRGVsZXRlIGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInRyYXNoIGljb24gcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAke2NlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvciA/IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5yZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMoY2VydEluZm8pIDogJyd9XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBmb3JtIGNlcnQtZWRpdC1mb3JtXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1B1YmxpY0tleV9lZGl0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M9XCIxMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHVibGljQ2VydCB8fCAnUGFzdGUgcHVibGljIGNlcnRpZmljYXRlIGhlcmUuLi4nfVwiPiR7ZnVsbFZhbHVlfTwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtaW5pIGJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgcG9zaXRpdmUgYnV0dG9uIHNhdmUtY2VydC1idG5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5idF9TYXZlIHx8ICdTYXZlJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGNhbmNlbC1jZXJ0LWJ0blwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNsb3NlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X0NhbmNlbCB8fCAnQ2FuY2VsJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgaW5mbyBidXR0b24gLSB0b2dnbGUgZGV0YWlscyBkaXNwbGF5XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuaW5mby1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZGV0YWlscyA9ICRjb250YWluZXIuZmluZCgnLmNlcnQtZGV0YWlscycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGRldGFpbHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZGV0YWlscy5zbGlkZVRvZ2dsZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVkaXQgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZWRpdC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWVkaXQtZm9ybScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQdWJsaWNLZXlfZWRpdCcpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc2F2ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9ICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHVibGljS2V5X2VkaXQnKS52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgb3JpZ2luYWwgaGlkZGVuIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIGRpc3BsYXkgd2l0aCBuZXcgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGNhbmNlbCBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jYW5jZWwtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1lZGl0LWZvcm0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheScpLnNob3coKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmRlbGV0ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGNlcnRpZmljYXRlXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIHRvIHNob3cgZW1wdHkgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBuZXcgYnV0dG9uc1xuICAgICAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVB1YmxpY0NlcnQgfHwgJ1Bhc3RlIHB1YmxpYyBjZXJ0aWZpY2F0ZSBoZXJlLi4uJyk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdyb3dzJywgJzEwJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNoYW5nZSBldmVudHMgdHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLm9mZignaW5wdXQuY2VydCBjaGFuZ2UuY2VydCBrZXl1cC5jZXJ0Jykub24oJ2lucHV0LmNlcnQgY2hhbmdlLmNlcnQga2V5dXAuY2VydCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyBkaXNwbGF5IGZvciBTU0gga2V5cyBhbmQgY2VydGlmaWNhdGVzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpIHtcbiAgICAgICAgLy8gSGFuZGxlIFNTSF9JRF9SU0FfUFVCIGZpZWxkXG4gICAgICAgIGNvbnN0ICRzc2hQdWJLZXlGaWVsZCA9ICQoJyNTU0hfSURfUlNBX1BVQicpO1xuICAgICAgICBpZiAoJHNzaFB1YktleUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFZhbHVlID0gJHNzaFB1YktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRzc2hQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5zc2gta2V5LWRpc3BsYXksIC5mdWxsLWRpc3BsYXknKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBjcmVhdGUgZGlzcGxheSBpZiB0aGVyZSdzIGEgdmFsdWVcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdHJ1bmNhdGVkIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudHJ1bmNhdGVTU0hLZXkoZnVsbFZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBvcmlnaW5hbCBmaWVsZFxuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgc3NoLWtleS1kaXNwbGF5XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7dHJ1bmNhdGVkfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJiYXNpY1wiIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5S2V5IHx8ICdDb3B5J31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZXhwYW5kLWJ0blwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRXhwYW5kIHx8ICdTaG93IGZ1bGwga2V5J31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4cGFuZCBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBjbGFzcz1cImZ1bGwtZGlzcGxheVwiIHN0eWxlPVwiZGlzcGxheTpub25lO1wiIHJlYWRvbmx5PiR7ZnVsbFZhbHVlfTwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBleHBhbmQvY29sbGFwc2VcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmV4cGFuZC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmdWxsRGlzcGxheSA9ICRjb250YWluZXIuZmluZCgnLmZ1bGwtZGlzcGxheScpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0cnVuY2F0ZWREaXNwbGF5ID0gJGNvbnRhaW5lci5maW5kKCcuc3NoLWtleS1kaXNwbGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKHRoaXMpLmZpbmQoJ2knKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJGZ1bGxEaXNwbGF5LmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICRmdWxsRGlzcGxheS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICR0cnVuY2F0ZWREaXNwbGF5LnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2NvbXByZXNzJykuYWRkQ2xhc3MoJ2V4cGFuZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRmdWxsRGlzcGxheS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICR0cnVuY2F0ZWREaXNwbGF5LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V4cGFuZCcpLmFkZENsYXNzKCdjb21wcmVzcycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBuZXcgZWxlbWVudHNcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBhcyByZWFkLW9ubHkgKHRoaXMgaXMgYSBzeXN0ZW0tZ2VuZXJhdGVkIGtleSlcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5hdHRyKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19Ob1NTSFB1YmxpY0tleSB8fCAnTm8gU1NIIHB1YmxpYyBrZXkgZ2VuZXJhdGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBXRUJIVFRQU1B1YmxpY0tleSBmaWVsZCAtIHVzZSBkZWRpY2F0ZWQgbWV0aG9kXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHJpdmF0ZUtleSBmaWVsZCAod3JpdGUtb25seSB3aXRoIHBhc3N3b3JkIG1hc2tpbmcpXG4gICAgICAgIGNvbnN0ICRjZXJ0UHJpdktleUZpZWxkID0gJCgnI1dFQkhUVFBTUHJpdmF0ZUtleScpO1xuICAgICAgICBpZiAoJGNlcnRQcml2S2V5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQcml2S2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucHJpdmF0ZS1rZXktc2V0LCAjV0VCSFRUUFNQcml2YXRlS2V5X25ldycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBwcml2YXRlIGtleSBleGlzdHMgKHBhc3N3b3JkIG1hc2tpbmcgbG9naWMpXG4gICAgICAgICAgICAvLyBUaGUgZmllbGQgd2lsbCBjb250YWluICd4eHh4eHh4JyBpZiBhIHByaXZhdGUga2V5IGlzIHNldFxuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGNlcnRQcml2S2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCBoYXNWYWx1ZSA9IGN1cnJlbnRWYWx1ZSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaGFzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIG9yaWdpbmFsIGZpZWxkIGFuZCBzaG93IHN0YXR1cyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlIHByaXZhdGUta2V5LXNldFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJsb2NrIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUHJpdmF0ZUtleUlzU2V0IHx8ICdQcml2YXRlIGtleSBpcyBjb25maWd1cmVkJ30gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxhY2Uta2V5LWxpbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19SZXBsYWNlIHx8ICdSZXBsYWNlJ308L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1ByaXZhdGVLZXlfbmV3XCIgbmFtZT1cIldFQkhUVFBTUHJpdmF0ZUtleVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93cz1cIjEwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwiZGlzcGxheTpub25lO1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCIke2dsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVByaXZhdGVLZXkgfHwgJ1Bhc3RlIHByaXZhdGUga2V5IGhlcmUuLi4nfVwiPjwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHJlcGxhY2UgbGlua1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnJlcGxhY2Uta2V5LWxpbmsnKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucHJpdmF0ZS1rZXktc2V0JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkbmV3RmllbGQgPSAkY29udGFpbmVyLmZpbmQoJyNXRUJIVFRQU1ByaXZhdGVLZXlfbmV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICRuZXdGaWVsZC5zaG93KCkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBoaWRkZW4gcGFzc3dvcmQgdmFsdWUgc28gd2UgY2FuIHNldCBhIG5ldyBvbmVcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEJpbmQgY2hhbmdlIGV2ZW50IHRvIHVwZGF0ZSBoaWRkZW4gZmllbGQgYW5kIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAkbmV3RmllbGQub24oJ2lucHV0IGNoYW5nZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBvcmlnaW5hbCBoaWRkZW4gZmllbGQgd2l0aCBuZXcgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnZhbCgkbmV3RmllbGQudmFsKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gdmFsaWRhdGlvbiBjaGVja1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHJpdmF0ZUtleSB8fCAnUGFzdGUgcHJpdmF0ZSBrZXkgaGVyZS4uLicpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3Jvd3MnLCAnMTAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgY2hhbmdlIGV2ZW50cyB0cmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLm9mZignaW5wdXQucHJpdiBjaGFuZ2UucHJpdiBrZXl1cC5wcml2Jykub24oJ2lucHV0LnByaXYgY2hhbmdlLnByaXYga2V5dXAucHJpdicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5IGZvciBjb3B5IGJ1dHRvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2xpcGJvYXJkKCkge1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZCkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jb3B5LWJ0bicpO1xuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBTaG93IHN1Y2Nlc3MgbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoZS50cmlnZ2VyKTtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsSWNvbiA9ICRidG4uZmluZCgnaScpLmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRidG4uZmluZCgnaScpLnJlbW92ZUNsYXNzKCkuYWRkQ2xhc3MoJ2NoZWNrIGljb24nKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRidG4uZmluZCgnaScpLnJlbW92ZUNsYXNzKCkuYWRkQ2xhc3Mob3JpZ2luYWxJY29uKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciBzZWxlY3Rpb25cbiAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLm9uKCdlcnJvcicsICgpID0+IHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZ3NfQ29weUZhaWxlZCB8fCAnRmFpbGVkIHRvIGNvcHkgdG8gY2xpcGJvYXJkJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVHJ1bmNhdGUgU1NIIGtleSBmb3IgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSBGdWxsIFNTSCBrZXlcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRydW5jYXRlZCBrZXlcbiAgICAgKi9cbiAgICB0cnVuY2F0ZVNTSEtleShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkgfHwga2V5Lmxlbmd0aCA8IDUwKSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdCgnICcpO1xuICAgICAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleVR5cGUgPSBwYXJ0c1swXTtcbiAgICAgICAgICAgIGNvbnN0IGtleURhdGEgPSBwYXJ0c1sxXTtcbiAgICAgICAgICAgIGNvbnN0IGNvbW1lbnQgPSBwYXJ0cy5zbGljZSgyKS5qb2luKCcgJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChrZXlEYXRhLmxlbmd0aCA+IDQwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0ga2V5RGF0YS5zdWJzdHJpbmcoMCwgMjApICsgJy4uLicgKyBrZXlEYXRhLnN1YnN0cmluZyhrZXlEYXRhLmxlbmd0aCAtIDE1KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYCR7a2V5VHlwZX0gJHt0cnVuY2F0ZWR9ICR7Y29tbWVudH1gLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRydW5jYXRlIGNlcnRpZmljYXRlIGZvciBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNlcnQgLSBGdWxsIGNlcnRpZmljYXRlXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUcnVuY2F0ZWQgY2VydGlmaWNhdGUgaW4gc2luZ2xlIGxpbmUgZm9ybWF0XG4gICAgICovXG4gICAgdHJ1bmNhdGVDZXJ0aWZpY2F0ZShjZXJ0KSB7XG4gICAgICAgIGlmICghY2VydCB8fCBjZXJ0Lmxlbmd0aCA8IDEwMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNlcnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxpbmVzID0gY2VydC5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gRXh0cmFjdCBmaXJzdCBhbmQgbGFzdCBtZWFuaW5nZnVsIGxpbmVzXG4gICAgICAgIGNvbnN0IGZpcnN0TGluZSA9IGxpbmVzWzBdIHx8ICcnO1xuICAgICAgICBjb25zdCBsYXN0TGluZSA9IGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGNlcnRpZmljYXRlcywgc2hvdyBiZWdpbiBhbmQgZW5kIG1hcmtlcnNcbiAgICAgICAgaWYgKGZpcnN0TGluZS5pbmNsdWRlcygnQkVHSU4gQ0VSVElGSUNBVEUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2ZpcnN0TGluZX0uLi4ke2xhc3RMaW5lfWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBvdGhlciBmb3JtYXRzLCB0cnVuY2F0ZSB0aGUgY29udGVudFxuICAgICAgICBjb25zdCBjbGVhbkNlcnQgPSBjZXJ0LnJlcGxhY2UoL1xcbi9nLCAnICcpLnRyaW0oKTtcbiAgICAgICAgaWYgKGNsZWFuQ2VydC5sZW5ndGggPiA4MCkge1xuICAgICAgICAgICAgcmV0dXJuIGNsZWFuQ2VydC5zdWJzdHJpbmcoMCwgNDApICsgJy4uLicgKyBjbGVhbkNlcnQuc3Vic3RyaW5nKGNsZWFuQ2VydC5sZW5ndGggLSAzMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjbGVhbkNlcnQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCBmb3Igc2FmZSBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgZXNjYXBlSHRtbCh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IG1hcCA9IHtcbiAgICAgICAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICAgICAgICc8JzogJyZsdDsnLFxuICAgICAgICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAgICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgICAgICAgIFwiJ1wiOiAnJiMwMzk7J1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGV4dC5yZXBsYWNlKC9bJjw+XCInXS9nLCBtID0+IG1hcFttXSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50IGFjY29yZGluZyB0byB0aGUgdmFsdWUgb2YgdXNlIFNTSCBwYXNzd29yZCBjaGVja2JveC5cbiAgICAgKi9cbiAgICBzaG93SGlkZVNTSFBhc3N3b3JkKCl7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBQcmVwYXJlcyBkYXRhIGZvciBSRVNUIEFQSSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFuIHVwIHVubmVjZXNzYXJ5IGZpZWxkcyBiZWZvcmUgc2VuZGluZ1xuICAgICAgICBjb25zdCBmaWVsZHNUb1JlbW92ZSA9IFtcbiAgICAgICAgICAgICdkaXJydHknLFxuICAgICAgICAgICAgJ2RlbGV0ZUFsbElucHV0JyxcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBjb2RlY18qIGZpZWxkcyAodGhleSdyZSByZXBsYWNlZCB3aXRoIHRoZSBjb2RlY3MgYXJyYXkpXG4gICAgICAgIE9iamVjdC5rZXlzKHJlc3VsdC5kYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2NvZGVjXycpIHx8IGZpZWxkc1RvUmVtb3ZlLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xsZWN0IGNvZGVjIGRhdGEgLSBvbmx5IGluY2x1ZGUgaWYgY2hhbmdlZFxuICAgICAgICBjb25zdCBhcnJDb2RlY3MgPSBbXTtcbiAgICAgICAgbGV0IGhhc0NvZGVjQ2hhbmdlcyA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgY29kZWMgcm93c1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlIC5jb2RlYy1yb3csICN2aWRlby1jb2RlY3MtdGFibGUgLmNvZGVjLXJvdycpLmVhY2goKGN1cnJlbnRJbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb2RlY05hbWUgPSAkKG9iaikuYXR0cignZGF0YS1jb2RlYy1uYW1lJyk7XG4gICAgICAgICAgICBpZiAoY29kZWNOYW1lICYmIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGVbY29kZWNOYW1lXSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZVtjb2RlY05hbWVdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnREaXNhYmxlZCA9ICQob2JqKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcG9zaXRpb24gb3IgZGlzYWJsZWQgc3RhdGUgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50SW5kZXggIT09IG9yaWdpbmFsLnByaW9yaXR5IHx8IGN1cnJlbnREaXNhYmxlZCAhPT0gb3JpZ2luYWwuZGlzYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzQ29kZWNDaGFuZ2VzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYXJyQ29kZWNzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBjb2RlY05hbWUsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBjdXJyZW50RGlzYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBjdXJyZW50SW5kZXgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gT25seSBpbmNsdWRlIGNvZGVjcyBpZiB0aGVyZSB3ZXJlIGNoYW5nZXNcbiAgICAgICAgaWYgKGhhc0NvZGVjQ2hhbmdlcykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29kZWNzID0gYXJyQ29kZWNzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBIYW5kbGVzIFJFU1QgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAkKFwiI2Vycm9yLW1lc3NhZ2VzXCIpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlOiB7IHJlc3VsdDogYm9vbCwgZGF0YToge30sIG1lc3NhZ2VzOiB7fSB9XG4gICAgICAgIGlmICghcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYXNzd29yZCBmaWVsZHMgdG8gaGlkZGVuIHZhbHVlIG9uIHN1Y2Nlc3NcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHBhc3N3b3JkIHZhbGlkYXRpb24gd2FybmluZ3MgYWZ0ZXIgc3VjY2Vzc2Z1bCBzYXZlXG4gICAgICAgICAgICAkKCcucGFzc3dvcmQtdmFsaWRhdGUnKS5mYWRlT3V0KDMwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBkZWxldGUgYWxsIGNvbmRpdGlvbnMgaWYgbmVlZGVkXG4gICAgICAgIGlmICh0eXBlb2YgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNoZWNrRGVsZXRlQ29uZGl0aW9ucygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGVycm9yIG1lc3NhZ2UgSFRNTCBmcm9tIFJFU1QgQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlIHdpdGggZXJyb3IgbWVzc2FnZXNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBjb25zdCAkZGl2ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndWkgbmVnYXRpdmUgbWVzc2FnZScsIGlkOiAnZXJyb3ItbWVzc2FnZXMnIH0pO1xuICAgICAgICAgICAgY29uc3QgJGhlYWRlciA9ICQoJzxkaXY+JywgeyBjbGFzczogJ2hlYWRlcicgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuZ3NfRXJyb3JTYXZlU2V0dGluZ3MpO1xuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJGhlYWRlcik7XG4gICAgICAgICAgICBjb25zdCAkdWwgPSAkKCc8dWw+JywgeyBjbGFzczogJ2xpc3QnIH0pO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZXNTZXQgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIGVycm9yIGFuZCB2YWxpZGF0aW9uIG1lc3NhZ2UgdHlwZXNcbiAgICAgICAgICAgIFsnZXJyb3InLCAndmFsaWRhdGlvbiddLmZvckVhY2gobXNnVHlwZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzID0gQXJyYXkuaXNBcnJheShyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSkgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdIFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBbcmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV1dO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXMuZm9yRWFjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGV4dENvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmIGVycm9yLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGdsb2JhbFRyYW5zbGF0ZVtlcnJvci5tZXNzYWdlXSB8fCBlcnJvci5tZXNzYWdlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGdsb2JhbFRyYW5zbGF0ZVtlcnJvcl0gfHwgZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbWVzc2FnZXNTZXQuaGFzKHRleHRDb250ZW50KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzU2V0LmFkZCh0ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHVsLmFwcGVuZCgkKCc8bGk+JykudGV4dCh0ZXh0Q29udGVudCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJHVsKTtcbiAgICAgICAgICAgICQoJyNzdWJtaXRidXR0b24nKS5iZWZvcmUoJGRpdik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgdmFsaWRhdGlvbiBydWxlcyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRSdWxlcygpIHtcbiAgICAgICAgLy8gU1NIUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcztcbiAgICAgICAgfSBlbHNlIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdlYkFkbWluUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuV2ViQWRtaW5QYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkud2ViQWRtaW5QYXNzd29yZFJ1bGVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBjZXJ0aWZpY2F0ZSBkZXRhaWxzIEhUTUxcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY2VydEluZm8gLSBDZXJ0aWZpY2F0ZSBpbmZvcm1hdGlvbiBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGZvciBjZXJ0aWZpY2F0ZSBkZXRhaWxzXG4gICAgICovXG4gICAgcmVuZGVyQ2VydGlmaWNhdGVEZXRhaWxzKGNlcnRJbmZvKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJjZXJ0LWRldGFpbHNcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTsgbWFyZ2luLXRvcDoxMHB4O1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHRpbnkgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJqZWN0XG4gICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+U3ViamVjdDo8L3N0cm9uZz4gJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjZXJ0SW5mby5zdWJqZWN0KX08L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJc3N1ZXJcbiAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3Vlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPklzc3Vlcjo8L3N0cm9uZz4gJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjZXJ0SW5mby5pc3N1ZXIpfWA7XG4gICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICcgPHNwYW4gY2xhc3M9XCJ1aSB0aW55IGxhYmVsXCI+U2VsZi1zaWduZWQ8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkaXR5IHBlcmlvZFxuICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfZnJvbSAmJiBjZXJ0SW5mby52YWxpZF90bykge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPlZhbGlkOjwvc3Ryb25nPiAke2NlcnRJbmZvLnZhbGlkX2Zyb219IHRvICR7Y2VydEluZm8udmFsaWRfdG99PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXhwaXJ5IHN0YXR1c1xuICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgcmVkIGxhYmVsXCI+Q2VydGlmaWNhdGUgRXhwaXJlZDwvc3Bhbj48L2Rpdj4nO1xuICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5IDw9IDMwKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSB5ZWxsb3cgbGFiZWxcIj5FeHBpcmVzIGluICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXM8L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IGdyZWVuIGxhYmVsXCI+VmFsaWQgZm9yICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXM8L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3ViamVjdCBBbHRlcm5hdGl2ZSBOYW1lc1xuICAgICAgICBpZiAoY2VydEluZm8uc2FuICYmIGNlcnRJbmZvLnNhbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+QWx0ZXJuYXRpdmUgTmFtZXM6PC9zdHJvbmc+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGxpc3RcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OjEwcHg7XCI+JztcbiAgICAgICAgICAgIGNlcnRJbmZvLnNhbi5mb3JFYWNoKHNhbiA9PiB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj4ke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKHNhbil9PC9kaXY+YDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2UgbGlzdFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBzZWdtZW50XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIGNlcnQtZGV0YWlsc1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFBCWExhbmd1YWdlIGNoYW5nZSBkZXRlY3Rpb24gZm9yIHJlc3RhcnQgd2FybmluZ1xuICAgICAqIFNob3dzIHJlc3RhcnQgd2FybmluZyBvbmx5IHdoZW4gdGhlIGxhbmd1YWdlIHZhbHVlIGNoYW5nZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nKCkge1xuICAgICAgICBjb25zdCAkbGFuZ3VhZ2VEcm9wZG93biA9ICQoJyNQQlhMYW5ndWFnZScpO1xuICAgICAgICBjb25zdCAkcmVzdGFydFdhcm5pbmcgPSAkKCcjcmVzdGFydC13YXJuaW5nLVBCWExhbmd1YWdlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCB2YWx1ZVxuICAgICAgICBsZXQgb3JpZ2luYWxWYWx1ZSA9IG51bGw7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgb3JpZ2luYWwgdmFsdWUgYWZ0ZXIgZGF0YSBsb2Fkc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignR2VuZXJhbFNldHRpbmdzLmRhdGFMb2FkZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBvcmlnaW5hbFZhbHVlID0gJGxhbmd1YWdlRHJvcGRvd24udmFsKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGRyb3Bkb3duIGNoYW5nZSBldmVudFxuICAgICAgICAkbGFuZ3VhZ2VEcm9wZG93bi5jbG9zZXN0KCcuZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGlmIHZhbHVlIGNoYW5nZWQgZnJvbSBvcmlnaW5hbFxuICAgICAgICAgICAgICAgIGlmIChvcmlnaW5hbFZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSBvcmlnaW5hbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICRyZXN0YXJ0V2FybmluZy50cmFuc2l0aW9uKCdmYWRlIGluJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHJlc3RhcnRXYXJuaW5nLnRyYW5zaXRpb24oJ2ZhZGUgb3V0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgUkVTVCBBUEkgbW9kZVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEdlbmVyYWxTZXR0aW5nc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVTZXR0aW5ncyc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uIGZvciBjbGVhbmVyIEFQSSByZXF1ZXN0c1xuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcblxuICAgICAgICAvLyBObyByZWRpcmVjdCBhZnRlciBzYXZlIC0gc3RheSBvbiB0aGUgc2FtZSBwYWdlXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IG51bGw7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBudWxsO1xuICAgICAgICBGb3JtLnVybCA9IGAjYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZ2VuZXJhbFNldHRpbmdzIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=