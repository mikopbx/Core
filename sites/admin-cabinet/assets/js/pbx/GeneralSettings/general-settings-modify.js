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

/* global globalRootUrl,globalTranslate, Form, PasswordScore, PbxApi, UserMessage, SoundFilesSelector, GeneralSettingsAPI, ClipboardJS, passwordValidator, PasswordValidationAPI, GeneralSettingsTooltipManager, $ */

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
    // Initialize async password validator
    if (typeof passwordValidator !== 'undefined') {
      passwordValidator.initialize({
        debounceDelay: 500,
        showStrengthBar: true,
        showWarnings: true
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
        generalSettingsModify.dataLoaded = true;
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
      generalSettingsModify.$formObj.form('set value', 'SSHPasswordRepeat', generalSettingsModify.hiddenPassword);
      $('.password-validate').remove();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1tb2RpZnkuanMiXSwibmFtZXMiOlsiZ2VuZXJhbFNldHRpbmdzTW9kaWZ5IiwiJGZvcm1PYmoiLCIkIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkc3NoUGFzc3dvcmQiLCIkZGlzYWJsZVNTSFBhc3N3b3JkIiwicGFyZW50IiwiJHNzaFBhc3N3b3JkU2VnbWVudCIsImhpZGRlblBhc3N3b3JkIiwic291bmRGaWxlRmllbGRzIiwiYW5ub3VuY2VtZW50SW4iLCJhbm5vdW5jZW1lbnRPdXQiLCJvcmlnaW5hbENvZGVjU3RhdGUiLCJkYXRhTG9hZGVkIiwidmFsaWRhdGVSdWxlcyIsInBieG5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZ3NfVmFsaWRhdGVFbXB0eVBCWE5hbWUiLCJXZWJBZG1pblBhc3N3b3JkIiwiV2ViQWRtaW5QYXNzd29yZFJlcGVhdCIsImdzX1ZhbGlkYXRlV2ViUGFzc3dvcmRzRmllbGREaWZmZXJlbnQiLCJTU0hQYXNzd29yZCIsIlNTSFBhc3N3b3JkUmVwZWF0IiwiZ3NfVmFsaWRhdGVTU0hQYXNzd29yZHNGaWVsZERpZmZlcmVudCIsIldFQlBvcnQiLCJnc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlIiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCIsImdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCIsIldFQkhUVFBTUG9ydCIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0T3V0T2ZSYW5nZSIsImdzX1ZhbGlkYXRlV0VCSFRUUFNQb3J0Tm90RXF1YWxUb0FqYW1Qb3J0IiwiZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQiLCJBSkFNUG9ydCIsImdzX1ZhbGlkYXRlQUpBTVBvcnRPdXRPZlJhbmdlIiwiU0lQQXV0aFByZWZpeCIsImdzX1NJUEF1dGhQcmVmaXhJbnZhbGlkIiwid2ViQWRtaW5QYXNzd29yZFJ1bGVzIiwiZ3NfVmFsaWRhdGVFbXB0eVdlYlBhc3N3b3JkIiwiZ3NfVmFsaWRhdGVXZWFrV2ViUGFzc3dvcmQiLCJ2YWx1ZSIsImdzX1Bhc3N3b3JkcyIsImdzX1Bhc3N3b3JkTm9Mb3dTaW12b2wiLCJnc19QYXNzd29yZE5vTnVtYmVycyIsImdzX1Bhc3N3b3JkTm9VcHBlclNpbXZvbCIsImFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcyIsImdzX1ZhbGlkYXRlRW1wdHlTU0hQYXNzd29yZCIsImdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkIiwiZ3NfU1NIUGFzc3dvcmQiLCJhZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcyIsImNsaXBib2FyZCIsImluaXRpYWxpemUiLCJwYXNzd29yZFZhbGlkYXRvciIsImRlYm91bmNlRGVsYXkiLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJvbiIsInZhbCIsImluaXRSdWxlcyIsImZpbmQiLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJub3QiLCJkcm9wZG93biIsImNoZWNrYm94IiwiaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9ycyIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcyIsImluaXRpYWxpemVDbGlwYm9hcmQiLCJzaG93SGlkZVNTSFBhc3N3b3JkIiwid2luZG93IiwiZXZlbnQiLCJuYW1lVGFiIiwiR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJpbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nIiwibG9hZERhdGEiLCJTb3VuZEZpbGVzU2VsZWN0b3IiLCJpbml0aWFsaXplV2l0aEljb25zIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiYWRkQ2xhc3MiLCJjb25zb2xlIiwibG9nIiwiR2VuZXJhbFNldHRpbmdzQVBJIiwiZ2V0U2V0dGluZ3MiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwicmVzdWx0IiwiZGF0YSIsInNldHRpbmdzIiwicG9wdWxhdGVGb3JtIiwibWVzc2FnZXMiLCJlcnJvciIsInNob3dBcGlFcnJvciIsImNvZGVjcyIsImZvcm0iLCJwb3B1bGF0ZVNwZWNpYWxGaWVsZHMiLCJsb2FkU291bmRGaWxlVmFsdWVzIiwibGVuZ3RoIiwidXBkYXRlQ29kZWNUYWJsZXMiLCJpbml0aWFsaXplUGFzc3dvcmRGaWVsZHMiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJzc2hLZXlzVGFibGUiLCJkb2N1bWVudCIsInRyaWdnZXIiLCJXRUJIVFRQU1B1YmxpY0tleV9pbmZvIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJrZXkiLCIkY2hlY2tib3giLCJpc0NoZWNrZWQiLCIkZHJvcGRvd24iLCJoYXNDbGFzcyIsImVycm9yTWVzc2FnZSIsIkFycmF5IiwiaXNBcnJheSIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlBCWFJlY29yZEFubm91bmNlbWVudEluIiwiYW5ub3VuY2VtZW50SW5SZXByZXNlbnQiLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJbl9SZXByZXNlbnQiLCJQQlhSZWNvcmRBbm5vdW5jZW1lbnRJblJlcHJlc2VudCIsInNldEluaXRpYWxWYWx1ZVdpdGhJY29uIiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0IiwiYW5ub3VuY2VtZW50T3V0UmVwcmVzZW50IiwiUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0X1JlcHJlc2VudCIsIlBCWFJlY29yZEFubm91bmNlbWVudE91dFJlcHJlc2VudCIsImF1ZGlvQ29kZWNzIiwiZmlsdGVyIiwiYyIsInNvcnQiLCJhIiwiYiIsInByaW9yaXR5IiwidmlkZW9Db2RlY3MiLCJidWlsZENvZGVjVGFibGUiLCJzaG93IiwiaW5pdGlhbGl6ZUNvZGVjRHJhZ0Ryb3AiLCIkdGFibGVCb2R5IiwiZW1wdHkiLCJjb2RlYyIsImluZGV4IiwibmFtZSIsImRpc2FibGVkIiwiaXNEaXNhYmxlZCIsImNoZWNrZWQiLCJyb3dIdG1sIiwiZXNjYXBlSHRtbCIsImRlc2NyaXB0aW9uIiwiYXBwZW5kIiwib25DaGFuZ2UiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkIiwiJGNlcnRQdWJLZXlGaWVsZCIsImZ1bGxWYWx1ZSIsIiRjb250YWluZXIiLCJjZXJ0SW5mbyIsInJlbW92ZSIsImRpc3BsYXlUZXh0IiwicGFydHMiLCJzdWJqZWN0IiwicHVzaCIsImlzc3VlciIsImlzX3NlbGZfc2lnbmVkIiwidmFsaWRfdG8iLCJpc19leHBpcmVkIiwiZGF5c191bnRpbF9leHBpcnkiLCJ0cnVuY2F0ZUNlcnRpZmljYXRlIiwiaGlkZSIsInN0YXR1c0NsYXNzIiwiZGlzcGxheUh0bWwiLCJidF9Ub29sVGlwQ29weUNlcnQiLCJidF9Ub29sVGlwQ2VydEluZm8iLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBEZWxldGUiLCJyZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMiLCJnc19QYXN0ZVB1YmxpY0NlcnQiLCJidF9TYXZlIiwiYnRfQ2FuY2VsIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGRldGFpbHMiLCJzbGlkZVRvZ2dsZSIsImZvY3VzIiwibmV3VmFsdWUiLCJjaGVja1ZhbHVlcyIsInBvcHVwIiwiZGVzdHJveSIsImF0dHIiLCJvZmYiLCIkc3NoUHViS2V5RmllbGQiLCJ0cnVuY2F0ZWQiLCJ0cnVuY2F0ZVNTSEtleSIsImJ0X1Rvb2xUaXBDb3B5S2V5IiwiYnRfVG9vbFRpcEV4cGFuZCIsIiRmdWxsRGlzcGxheSIsIiR0cnVuY2F0ZWREaXNwbGF5IiwiJGljb24iLCJpcyIsImdzX05vU1NIUHVibGljS2V5IiwiJGNlcnRQcml2S2V5RmllbGQiLCJjdXJyZW50VmFsdWUiLCJoYXNWYWx1ZSIsImdzX1ByaXZhdGVLZXlJc1NldCIsImdzX1JlcGxhY2UiLCJnc19QYXN0ZVByaXZhdGVLZXkiLCIkbmV3RmllbGQiLCJDbGlwYm9hcmRKUyIsIiRidG4iLCJvcmlnaW5hbEljb24iLCJzZXRUaW1lb3V0IiwiY2xlYXJTZWxlY3Rpb24iLCJnc19Db3B5RmFpbGVkIiwic3BsaXQiLCJrZXlUeXBlIiwia2V5RGF0YSIsImNvbW1lbnQiLCJzbGljZSIsInN1YnN0cmluZyIsInRyaW0iLCJjZXJ0IiwibGluZXMiLCJsaW5lIiwiZmlyc3RMaW5lIiwibGFzdExpbmUiLCJpbmNsdWRlcyIsImNsZWFuQ2VydCIsInJlcGxhY2UiLCJ0ZXh0IiwibWFwIiwibSIsImNiQmVmb3JlU2VuZEZvcm0iLCJmaWVsZHNUb1JlbW92ZSIsInN0YXJ0c1dpdGgiLCJhcnJDb2RlY3MiLCJoYXNDb2RlY0NoYW5nZXMiLCJlYWNoIiwiY3VycmVudEluZGV4Iiwib2JqIiwiY29kZWNOYW1lIiwib3JpZ2luYWwiLCJjdXJyZW50RGlzYWJsZWQiLCJjYkFmdGVyU2VuZEZvcm0iLCIkc3VibWl0QnV0dG9uIiwiZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sIiwiZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsIiwiY2hlY2tEZWxldGVDb25kaXRpb25zIiwiJGRpdiIsImlkIiwiJGhlYWRlciIsImdzX0Vycm9yU2F2ZVNldHRpbmdzIiwiJHVsIiwibWVzc2FnZXNTZXQiLCJTZXQiLCJtc2dUeXBlIiwidGV4dENvbnRlbnQiLCJtZXNzYWdlIiwiaGFzIiwiYWRkIiwiYmVmb3JlIiwiaHRtbCIsInZhbGlkX2Zyb20iLCJzYW4iLCIkbGFuZ3VhZ2VEcm9wZG93biIsIiRyZXN0YXJ0V2FybmluZyIsIm9yaWdpbmFsVmFsdWUiLCJjbG9zZXN0IiwidHJhbnNpdGlvbiIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsInVy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QSxJQUFJLENBQUMwTSxvQkFBTCxHQUE0QixJQUE1QjtBQUNBMU0sSUFBQUEsSUFBSSxDQUFDMk0sR0FBTDtBQUVBM00sSUFBQUEsSUFBSSxDQUFDckUsYUFBTCxHQUFxQmQscUJBQXFCLENBQUNjLGFBQTNDO0FBQ0FxRSxJQUFBQSxJQUFJLENBQUMrSixnQkFBTCxHQUF3QmxQLHFCQUFxQixDQUFDa1AsZ0JBQTlDO0FBQ0EvSixJQUFBQSxJQUFJLENBQUMwSyxlQUFMLEdBQXVCN1AscUJBQXFCLENBQUM2UCxlQUE3QztBQUNBMUssSUFBQUEsSUFBSSxDQUFDNUIsVUFBTDtBQUNIO0FBL3dDeUIsQ0FBOUIsQyxDQWt4Q0E7O0FBQ0FyRCxDQUFDLENBQUMyRyxRQUFELENBQUQsQ0FBWWtMLEtBQVosQ0FBa0IsWUFBTTtBQUNwQi9SLEVBQUFBLHFCQUFxQixDQUFDdUQsVUFBdEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBhc3N3b3JkU2NvcmUsIFBieEFwaSwgVXNlck1lc3NhZ2UsIFNvdW5kRmlsZXNTZWxlY3RvciwgR2VuZXJhbFNldHRpbmdzQVBJLCBDbGlwYm9hcmRKUywgcGFzc3dvcmRWYWxpZGF0b3IsIFBhc3N3b3JkVmFsaWRhdGlvbkFQSSwgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIsICQgKi9cblxuLyoqXG4gKiBBIG1vZHVsZSB0byBoYW5kbGUgbW9kaWZpY2F0aW9uIG9mIGdlbmVyYWwgc2V0dGluZ3MuXG4gKi9cbmNvbnN0IGdlbmVyYWxTZXR0aW5nc01vZGlmeSA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjZ2VuZXJhbC1zZXR0aW5ncy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgd2ViIGFkbWluIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHdlYkFkbWluUGFzc3dvcmQ6ICQoJyNXZWJBZG1pblBhc3N3b3JkJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3NoIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNzaFBhc3N3b3JkOiAkKCcjU1NIUGFzc3dvcmQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB3ZWIgc3NoIHBhc3N3b3JkIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpc2FibGVTU0hQYXNzd29yZDogJCgnI1NTSERpc2FibGVQYXNzd29yZExvZ2lucycpLnBhcmVudCgnLmNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgU1NIIHBhc3N3b3JkIGZpZWxkc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNzaFBhc3N3b3JkU2VnbWVudDogJCgnI29ubHktaWYtcGFzc3dvcmQtZW5hYmxlZCcpLFxuXG4gICAgLyoqXG4gICAgICogSWYgcGFzc3dvcmQgc2V0LCBpdCB3aWxsIGJlIGhpZGVkIGZyb20gd2ViIHVpLlxuICAgICAqL1xuICAgIGhpZGRlblBhc3N3b3JkOiAneHh4eHh4eCcsXG5cbiAgICAvKipcbiAgICAgKiBTb3VuZCBmaWxlIGZpZWxkIElEc1xuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgc291bmRGaWxlRmllbGRzOiB7XG4gICAgICAgIGFubm91bmNlbWVudEluOiAnUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4nLFxuICAgICAgICBhbm5vdW5jZW1lbnRPdXQ6ICdQQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBPcmlnaW5hbCBjb2RlYyBzdGF0ZSBmcm9tIGxhc3QgbG9hZFxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgb3JpZ2luYWxDb2RlY1N0YXRlOiB7fSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHRyYWNrIGlmIGRhdGEgaGFzIGJlZW4gbG9hZGVkIGZyb20gQVBJXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgZGF0YUxvYWRlZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHsgLy8gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnZhbGlkYXRlUnVsZXMuU1NIUGFzc3dvcmQucnVsZXNcbiAgICAgICAgcGJ4bmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1BCWE5hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlRW1wdHlQQlhOYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBXZWJBZG1pblBhc3N3b3JkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnV2ViQWRtaW5QYXNzd29yZCcsXG4gICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgIH0sXG4gICAgICAgIFdlYkFkbWluUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF0Y2hbV2ViQWRtaW5QYXNzd29yZF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdlYlBhc3N3b3Jkc0ZpZWxkRGlmZmVyZW50LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBTU0hQYXNzd29yZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1NTSFBhc3N3b3JkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgU1NIUGFzc3dvcmRSZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTU0hQYXNzd29yZFJlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21hdGNoW1NTSFBhc3N3b3JkXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlU1NIUGFzc3dvcmRzRmllbGREaWZmZXJlbnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQlBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdXRUJQb3J0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQkhUVFBTUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9XRUJQb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W0FKQU1Qb3J0VExTXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV0VCUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQlBvcnROb3RFcXVhbFRvQWphbVRMU1BvcnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFdFQkhUVFBTUG9ydDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ1dFQkhUVFBTUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlmZmVyZW50W1dFQlBvcnRdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXRUJIVFRQU1BvcnROb3RFcXVhbFRvV0VCUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydFRMU10nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RpZmZlcmVudFtBSkFNUG9ydF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZVdFQkhUVFBTUG9ydE5vdEVxdWFsVG9BamFtVExTUG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgQUpBTVBvcnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdBSkFNUG9ydCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaWZmZXJlbnRbQUpBTVBvcnRUTFNdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVBSkFNUG9ydE91dE9mUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIFNJUEF1dGhQcmVmaXg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdTSVBBdXRoUHJlZml4JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwWy9eW2EtekEtWl0qJC9dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeEludmFsaWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBSdWxlcyBmb3IgdGhlIHdlYiBhZG1pbiBwYXNzd29yZCBmaWVsZCB3aGVuIGl0IG5vdCBlcXVhbCB0byBoaWRkZW5QYXNzd29yZFxuICAgIHdlYkFkbWluUGFzc3dvcmRSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVdlYlBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1dlYlBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW2Etel0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTG93U2ltdm9sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdub3RSZWdFeHAnLFxuICAgICAgICAgICAgdmFsdWU6IC9cXGQvLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vTnVtYmVyc1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW0EtWl0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZHMgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vVXBwZXJTaW12b2xcbiAgICAgICAgfVxuICAgIF0sXG4gICAgLy8gUnVsZXMgZm9yIHRoZSBTU0ggcGFzc3dvcmQgZmllbGQgd2hlbiBTU0ggbG9naW4gdGhyb3VnaCB0aGUgcGFzc3dvcmQgZW5hYmxlZCwgYW5kIGl0IG5vdCBlcXVhbCB0byBoaWRkZW5QYXNzd29yZFxuICAgIGFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzczogW1xuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVFbXB0eVNTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmdzX1ZhbGlkYXRlV2Vha1NTSFBhc3N3b3JkLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAnbm90UmVnRXhwJyxcbiAgICAgICAgICAgIHZhbHVlOiAvW2Etel0vLFxuICAgICAgICAgICAgcHJvbXB0OiAnPGI+JyArIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hQYXNzd29yZCArICc8L2I+OiAnICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3N3b3JkTm9Mb3dTaW12b2xcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1xcZC8sXG4gICAgICAgICAgICBwcm9tcHQ6ICc8Yj4nICsgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSFBhc3N3b3JkICsgJzwvYj46ICcgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmROb051bWJlcnNcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ25vdFJlZ0V4cCcsXG4gICAgICAgICAgICB2YWx1ZTogL1tBLVpdLyxcbiAgICAgICAgICAgIHByb21wdDogJzxiPicgKyBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIUGFzc3dvcmQgKyAnPC9iPjogJyArIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZE5vVXBwZXJTaW12b2xcbiAgICAgICAgfVxuICAgIF0sXG5cbiAgICAvLyBSdWxlcyBmb3IgdGhlIFNTSCBwYXNzd29yZCBmaWVsZCB3aGVuIFNTSCBsb2dpbiB0aHJvdWdoIHRoZSBwYXNzd29yZCBkaXNhYmxlZFxuICAgIGFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzTm9QYXNzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19WYWxpZGF0ZUVtcHR5U1NIUGFzc3dvcmQsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfVmFsaWRhdGVXZWFrU1NIUGFzc3dvcmQsXG4gICAgICAgIH1cbiAgICBdLFxuXG4gICAgLyoqXG4gICAgICogQ2xpcGJvYXJkIGluc3RhbmNlIGZvciBjb3B5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKiBAdHlwZSB7Q2xpcGJvYXJkSlN9XG4gICAgICovXG4gICAgY2xpcGJvYXJkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqICBJbml0aWFsaXplIG1vZHVsZSB3aXRoIGV2ZW50IGJpbmRpbmdzIGFuZCBjb21wb25lbnQgaW5pdGlhbGl6YXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhc3luYyBwYXNzd29yZCB2YWxpZGF0b3JcbiAgICAgICAgaWYgKHR5cGVvZiBwYXNzd29yZFZhbGlkYXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHBhc3N3b3JkVmFsaWRhdG9yLmluaXRpYWxpemUoe1xuICAgICAgICAgICAgICAgIGRlYm91bmNlRGVsYXk6IDUwMCxcbiAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgd2hlbiBwYXNzd29yZHMgY2hhbmdlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSAhPT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRzc2hQYXNzd29yZC52YWwoKSAhPT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgJCgnI2dlbmVyYWwtc2V0dGluZ3MtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbmFibGUgZHJvcGRvd25zIG9uIHRoZSBmb3JtIChleGNlcHQgc291bmQgZmlsZSBzZWxlY3RvcnMpXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmRyb3Bkb3duJykubm90KCcuYXVkaW8tbWVzc2FnZS1zZWxlY3QnKS5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveGVzIG9uIHRoZSBmb3JtXG4gICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLWZvcm0gLmNoZWNrYm94JykuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBDb2RlYyB0YWJsZSBkcmFnLW4tZHJvcCB3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIC8vIFNlZSBpbml0aWFsaXplQ29kZWNEcmFnRHJvcCgpIHdoaWNoIGlzIGNhbGxlZCBmcm9tIHVwZGF0ZUNvZGVjVGFibGVzKClcblxuICAgICAgICAvLyBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdpdGggSFRNTCBpY29ucyBzdXBwb3J0XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3JzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IFNTSCBrZXlzIHRhYmxlIHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBsb2Fkc1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0cnVuY2F0ZWQgZmllbGRzIGRpc3BsYXlcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVUcnVuY2F0ZWRGaWVsZHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBjb3B5IGJ1dHRvbnNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDbGlwYm9hcmQoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGFkZGl0aW9uYWwgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdFJ1bGVzKCk7XG5cbiAgICAgICAgLy8gU2hvdywgaGlkZSBzc2ggcGFzc3dvcmQgc2VnbWVudFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCh7XG4gICAgICAgICAgICAnb25DaGFuZ2UnOiBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc2hvd0hpZGVTU0hQYXNzd29yZFxuICAgICAgICB9KTtcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnNob3dIaWRlU1NIUGFzc3dvcmQoKTtcblxuICAgICAgICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgdG8gaGFuZGxlIHRhYiBhY3RpdmF0aW9uXG4gICAgICAgICQod2luZG93KS5vbignR1MtQWN0aXZhdGVUYWInLCAoZXZlbnQsIG5hbWVUYWIpID0+IHtcbiAgICAgICAgICAgICQoJyNnZW5lcmFsLXNldHRpbmdzLW1lbnUnKS5maW5kKCcuaXRlbScpLnRhYignY2hhbmdlIHRhYicsIG5hbWVUYWIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGlmICh0eXBlb2YgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgUEJYTGFuZ3VhZ2UgY2hhbmdlIGRldGVjdGlvbiBmb3IgcmVzdGFydCB3YXJuaW5nXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nKCk7XG5cbiAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gQVBJIGluc3RlYWQgb2YgdXNpbmcgc2VydmVyLXJlbmRlcmVkIHZhbHVlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkubG9hZERhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9ycyB3aXRoIEhUTUwgaWNvbnMgYW5kIGNoYW5nZSB0cmFja2luZ1xuICAgICAqIE5vdGU6IFRoZSBIVE1MIHN0cnVjdHVyZSBpcyBub3cgcHJvdmlkZWQgYnkgdGhlIHBsYXlBZGROZXdTb3VuZFdpdGhJY29ucyBwYXJ0aWFsOlxuICAgICAqIC0gSGlkZGVuIGlucHV0OiA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiUEJYUmVjb3JkQW5ub3VuY2VtZW50SW5cIiBuYW1lPVwiUEJYUmVjb3JkQW5ub3VuY2VtZW50SW5cIj5cbiAgICAgKiAtIERyb3Bkb3duIGRpdjogPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93biBzZWFyY2ggUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4tc2VsZWN0XCI+XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9ycygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbmNvbWluZyBhbm5vdW5jZW1lbnQgc2VsZWN0b3JcbiAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLmluaXRpYWxpemVXaXRoSWNvbnMoXG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc291bmRGaWxlRmllbGRzLmFubm91bmNlbWVudEluLCBcbiAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG91dGdvaW5nIGFubm91bmNlbWVudCBzZWxlY3RvclxuICAgICAgICBTb3VuZEZpbGVzU2VsZWN0b3IuaW5pdGlhbGl6ZVdpdGhJY29ucyhcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zb3VuZEZpbGVGaWVsZHMuYW5ub3VuY2VtZW50T3V0LCBcbiAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZ2VuZXJhbCBzZXR0aW5ncyBkYXRhIGZyb20gQVBJXG4gICAgICogVXNlZCBib3RoIG9uIGluaXRpYWwgcGFnZSBsb2FkIGFuZCBmb3IgbWFudWFsIHJlZnJlc2hcbiAgICAgKiBDYW4gYmUgY2FsbGVkIGFueXRpbWUgdG8gcmVsb2FkIHRoZSBmb3JtIGRhdGE6IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5sb2FkRGF0YSgpXG4gICAgICovXG4gICAgbG9hZERhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZSBvbiB0aGUgZm9ybVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgY29uc29sZS5sb2coJ0xvYWRpbmcgZ2VuZXJhbCBzZXR0aW5ncyBmcm9tIEFQSS4uLicpO1xuICAgICAgICBcbiAgICAgICAgR2VuZXJhbFNldHRpbmdzQVBJLmdldFNldHRpbmdzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQVBJIFJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1BvcHVsYXRpbmcgZm9ybSB3aXRoOicsIHJlc3BvbnNlLmRhdGEuc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gd2l0aCB0aGUgcmVjZWl2ZWQgZGF0YVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmRhdGFMb2FkZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBFcnJvcjonLCByZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93QXBpRXJyb3IocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTZXR0aW5ncyBkYXRhIGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBzZXR0aW5ncyBhbmQgYWRkaXRpb25hbCBkYXRhXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gZGF0YS5zZXR0aW5ncyB8fCBkYXRhO1xuICAgICAgICBjb25zdCBjb2RlY3MgPSBkYXRhLmNvZGVjcyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyB1c2luZyBGb21hbnRpYyBVSSBmb3JtIEFQSVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHNldHRpbmdzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBzcGVjaWFsIGZpZWxkIHR5cGVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5wb3B1bGF0ZVNwZWNpYWxGaWVsZHMoc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBzb3VuZCBmaWxlIHZhbHVlcyB3aXRoIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkubG9hZFNvdW5kRmlsZVZhbHVlcyhzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY29kZWMgdGFibGVzXG4gICAgICAgIGlmIChjb2RlY3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LnVwZGF0ZUNvZGVjVGFibGVzKGNvZGVjcyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgZmllbGRzIChoaWRlIGFjdHVhbCBwYXNzd29yZHMpXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplUGFzc3dvcmRGaWVsZHMoc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIFNTSCBwYXNzd29yZCB2aXNpYmlsaXR5XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5zaG93SGlkZVNTSFBhc3N3b3JkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0UnVsZXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmcgaWYgZW5hYmxlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU1NIIGtleXMgdGFibGUgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBzc2hLZXlzVGFibGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBzc2hLZXlzVGFibGUuaW5pdGlhbGl6ZSgnc3NoLWtleXMtY29udGFpbmVyJywgJ1NTSEF1dGhvcml6ZWRLZXlzJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyB3aXRoIG5ldyBkYXRhXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplVHJ1bmNhdGVkRmllbGRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50IHRvIG5vdGlmeSB0aGF0IGRhdGEgaGFzIGJlZW4gbG9hZGVkXG4gICAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ0dlbmVyYWxTZXR0aW5ncy5kYXRhTG9hZGVkJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgc3BlY2lhbCBmaWVsZCB0eXBlcyB0aGF0IG5lZWQgY3VzdG9tIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVTcGVjaWFsRmllbGRzKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIFByaXZhdGUga2V5IGV4aXN0ZW5jZSBpcyBub3cgZGV0ZXJtaW5lZCBieSBjaGVja2luZyBpZiB2YWx1ZSBlcXVhbHMgSElEREVOX1BBU1NXT1JEXG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2VydGlmaWNhdGUgaW5mb1xuICAgICAgICBpZiAoc2V0dGluZ3MuV0VCSFRUUFNQdWJsaWNLZXlfaW5mbykge1xuICAgICAgICAgICAgJCgnI1dFQkhUVFBTUHVibGljS2V5JykuZGF0YSgnY2VydC1pbmZvJywgc2V0dGluZ3MuV0VCSFRUUFNQdWJsaWNLZXlfaW5mbyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjaGVja2JveGVzIChBUEkgcmV0dXJucyBib29sZWFuIHZhbHVlcylcbiAgICAgICAgT2JqZWN0LmtleXMoc2V0dGluZ3MpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQoYCMke2tleX1gKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gc2V0dGluZ3Nba2V5XSA9PT0gdHJ1ZSB8fCBzZXR0aW5nc1trZXldID09PSAnMScgfHwgc2V0dGluZ3Nba2V5XSA9PT0gMTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3guY2hlY2tib3goaXNDaGVja2VkID8gJ2NoZWNrJyA6ICd1bmNoZWNrJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSByZWd1bGFyIGRyb3Bkb3ducyAoZXhjbHVkaW5nIHNvdW5kIGZpbGUgc2VsZWN0b3JzIHdoaWNoIGFyZSBoYW5kbGVkIHNlcGFyYXRlbHkpXG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtrZXl9YCkucGFyZW50KCcuZHJvcGRvd24nKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID4gMCAmJiAhJGRyb3Bkb3duLmhhc0NsYXNzKCdhdWRpby1tZXNzYWdlLXNlbGVjdCcpKSB7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIGZpZWxkcyB3aXRoIGhpZGRlbiBwYXNzd29yZCBpbmRpY2F0b3JcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBkYXRhXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkRmllbGRzKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIEhpZGUgYWN0dWFsIHBhc3N3b3JkcyBhbmQgc2hvdyBoaWRkZW4gaW5kaWNhdG9yXG4gICAgICAgIGlmIChzZXR0aW5ncy5XZWJBZG1pblBhc3N3b3JkICYmIHNldHRpbmdzLldlYkFkbWluUGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdXZWJBZG1pblBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHNldHRpbmdzLlNTSFBhc3N3b3JkICYmIHNldHRpbmdzLlNTSFBhc3N3b3JkICE9PSAnJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBBUEkgZXJyb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbWVzc2FnZXMgLSBFcnJvciBtZXNzYWdlcyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHNob3dBcGlFcnJvcihtZXNzYWdlcykge1xuICAgICAgICBpZiAobWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IEFycmF5LmlzQXJyYXkobWVzc2FnZXMuZXJyb3IpIFxuICAgICAgICAgICAgICAgID8gbWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSBcbiAgICAgICAgICAgICAgICA6IG1lc3NhZ2VzLmVycm9yO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgc291bmQgZmlsZSB2YWx1ZXMgd2l0aCBIVE1MIHJlcHJlc2VudGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gU2V0dGluZ3MgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTb3VuZEZpbGVWYWx1ZXMoc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gTG9hZCBpbmNvbWluZyBhbm5vdW5jZW1lbnQgc291bmQgZmlsZVxuICAgICAgICBpZiAoc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW4pIHtcbiAgICAgICAgICAgIGNvbnN0IGFubm91bmNlbWVudEluUmVwcmVzZW50ID0gc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50SW5fUmVwcmVzZW50IHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudEluUmVwcmVzZW50O1xuICAgICAgICAgICAgaWYgKGFubm91bmNlbWVudEluUmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLnNldEluaXRpYWxWYWx1ZVdpdGhJY29uKFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc291bmRGaWxlRmllbGRzLmFubm91bmNlbWVudEluLFxuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRJbixcbiAgICAgICAgICAgICAgICAgICAgYW5ub3VuY2VtZW50SW5SZXByZXNlbnRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKGAuJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc291bmRGaWxlRmllbGRzLmFubm91bmNlbWVudElufS1zZWxlY3RgKVxuICAgICAgICAgICAgICAgICAgICAuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNldHRpbmdzLlBCWFJlY29yZEFubm91bmNlbWVudEluKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBvdXRnb2luZyBhbm5vdW5jZW1lbnQgc291bmQgZmlsZVxuICAgICAgICBpZiAoc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0KSB7XG4gICAgICAgICAgICBjb25zdCBhbm5vdW5jZW1lbnRPdXRSZXByZXNlbnQgPSBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXRfUmVwcmVzZW50IHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXRSZXByZXNlbnQ7XG4gICAgICAgICAgICBpZiAoYW5ub3VuY2VtZW50T3V0UmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLnNldEluaXRpYWxWYWx1ZVdpdGhJY29uKFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc291bmRGaWxlRmllbGRzLmFubm91bmNlbWVudE91dCxcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuUEJYUmVjb3JkQW5ub3VuY2VtZW50T3V0LFxuICAgICAgICAgICAgICAgICAgICBhbm5vdW5jZW1lbnRPdXRSZXByZXNlbnRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKGAuJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuc291bmRGaWxlRmllbGRzLmFubm91bmNlbWVudE91dH0tc2VsZWN0YClcbiAgICAgICAgICAgICAgICAgICAgLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZXR0aW5ncy5QQlhSZWNvcmRBbm5vdW5jZW1lbnRPdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGFuZCB1cGRhdGUgY29kZWMgdGFibGVzIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvZGVjcyAtIEFycmF5IG9mIGNvZGVjIGNvbmZpZ3VyYXRpb25zXG4gICAgICovXG4gICAgdXBkYXRlQ29kZWNUYWJsZXMoY29kZWNzKSB7XG4gICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIGNvZGVjIHN0YXRlIGZvciBjb21wYXJpc29uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNlcGFyYXRlIGF1ZGlvIGFuZCB2aWRlbyBjb2RlY3NcbiAgICAgICAgY29uc3QgYXVkaW9Db2RlY3MgPSBjb2RlY3MuZmlsdGVyKGMgPT4gYy50eXBlID09PSAnYXVkaW8nKS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgIGNvbnN0IHZpZGVvQ29kZWNzID0gY29kZWNzLmZpbHRlcihjID0+IGMudHlwZSA9PT0gJ3ZpZGVvJykuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgYXVkaW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUoYXVkaW9Db2RlY3MsICdhdWRpbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgdmlkZW8gY29kZWNzIHRhYmxlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5idWlsZENvZGVjVGFibGUodmlkZW9Db2RlY3MsICd2aWRlbycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSBsb2FkZXJzIGFuZCBzaG93IHRhYmxlc1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLWxvYWRlciwgI3ZpZGVvLWNvZGVjcy1sb2FkZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNhdWRpby1jb2RlY3MtdGFibGUsICN2aWRlby1jb2RlY3MtdGFibGUnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIHJlb3JkZXJpbmdcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb2RlYyB0YWJsZSByb3dzIGZyb20gZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvZGVjcyAtIEFycmF5IG9mIGNvZGVjIG9iamVjdHNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtICdhdWRpbycgb3IgJ3ZpZGVvJ1xuICAgICAqL1xuICAgIGJ1aWxkQ29kZWNUYWJsZShjb2RlY3MsIHR5cGUpIHtcbiAgICAgICAgY29uc3QgJHRhYmxlQm9keSA9ICQoYCMke3R5cGV9LWNvZGVjcy10YWJsZSB0Ym9keWApO1xuICAgICAgICAkdGFibGVCb2R5LmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICBjb2RlY3MuZm9yRWFjaCgoY29kZWMsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBzdGF0ZSBmb3IgY2hhbmdlIGRldGVjdGlvblxuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZVtjb2RlYy5uYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXgsXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGNvZGVjLmRpc2FibGVkXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFibGUgcm93XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gY29kZWMuZGlzYWJsZWQgPT09IHRydWUgfHwgY29kZWMuZGlzYWJsZWQgPT09ICcxJyB8fCBjb2RlYy5kaXNhYmxlZCA9PT0gMTtcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrZWQgPSAhaXNEaXNhYmxlZCA/ICdjaGVja2VkJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCByb3dIdG1sID0gYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cImNvZGVjLXJvd1wiIGlkPVwiY29kZWMtJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtpbmRleH1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb2RlYy1uYW1lPVwiJHtjb2RlYy5uYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtb3JpZ2luYWwtcHJpb3JpdHk9XCIke2luZGV4fVwiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJjb2xsYXBzaW5nIGRyYWdIYW5kbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic29ydCBncmV5IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggY29kZWNzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwiY29kZWNfJHtjb2RlYy5uYW1lfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2NoZWNrZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmluZGV4PVwiMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9XCJjb2RlY18ke2NvZGVjLm5hbWV9XCI+JHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjb2RlYy5kZXNjcmlwdGlvbiB8fCBjb2RlYy5uYW1lKX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICR0YWJsZUJvZHkuYXBwZW5kKHJvd0h0bWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyBmb3IgdGhlIG5ldyByb3dzXG4gICAgICAgICR0YWJsZUJvZHkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIHdoZW4gY29kZWMgaXMgZW5hYmxlZC9kaXNhYmxlZFxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyYWcgYW5kIGRyb3AgZm9yIGNvZGVjIHRhYmxlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDb2RlY0RyYWdEcm9wKCkge1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlLCAjdmlkZW8tY29kZWNzLXRhYmxlJykudGFibGVEbkQoe1xuICAgICAgICAgICAgb25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnLFxuICAgICAgICAgICAgb25Ecm9wOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB3aGVuIGNvZGVjcyBhcmUgcmVvcmRlcmVkXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjZXJ0aWZpY2F0ZSBmaWVsZCBkaXNwbGF5IG9ubHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpIHtcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHVibGljS2V5IGZpZWxkIG9ubHlcbiAgICAgICAgY29uc3QgJGNlcnRQdWJLZXlGaWVsZCA9ICQoJyNXRUJIVFRQU1B1YmxpY0tleScpO1xuICAgICAgICBpZiAoJGNlcnRQdWJLZXlGaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxWYWx1ZSA9ICRjZXJ0UHViS2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGNlcnRpZmljYXRlIGluZm8gaWYgYXZhaWxhYmxlIGZyb20gZGF0YSBhdHRyaWJ1dGVcbiAgICAgICAgICAgIGNvbnN0IGNlcnRJbmZvID0gJGNlcnRQdWJLZXlGaWVsZC5kYXRhKCdjZXJ0LWluZm8nKSB8fCB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzIGZvciB0aGlzIGZpZWxkIG9ubHlcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheSwgLmNlcnQtZWRpdC1mb3JtJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbWVhbmluZ2Z1bCBkaXNwbGF5IHRleHQgZnJvbSBjZXJ0aWZpY2F0ZSBpbmZvXG4gICAgICAgICAgICAgICAgbGV0IGRpc3BsYXlUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHN1YmplY3QvZG9tYWluXG4gICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDwn5OcICR7Y2VydEluZm8uc3ViamVjdH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGlzc3VlciBpZiBub3Qgc2VsZi1zaWduZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3VlciAmJiAhY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYGJ5ICR7Y2VydEluZm8uaXNzdWVyfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmlzX3NlbGZfc2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKCcoU2VsZi1zaWduZWQpJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCB2YWxpZGl0eSBkYXRlc1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjZXJ0SW5mby5pc19leHBpcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydHMucHVzaChg4p2MIEV4cGlyZWQgJHtjZXJ0SW5mby52YWxpZF90b31gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2VydEluZm8uZGF5c191bnRpbF9leHBpcnkgPD0gMzApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKGDimqDvuI8gRXhwaXJlcyBpbiAke2NlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5fSBkYXlzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goYOKchSBWYWxpZCB1bnRpbCAke2NlcnRJbmZvLnZhbGlkX3RvfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IHBhcnRzLmpvaW4oJyB8ICcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHRydW5jYXRlZCBjZXJ0aWZpY2F0ZVxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS50cnVuY2F0ZUNlcnRpZmljYXRlKGZ1bGxWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIG9yaWdpbmFsIGZpZWxkXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIHN0YXR1cyBjb2xvciBjbGFzcyBiYXNlZCBvbiBjZXJ0aWZpY2F0ZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBsZXQgc3RhdHVzQ2xhc3MgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICdlcnJvcic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA8PSAzMCkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyA9ICd3YXJuaW5nJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgY2VydC1kaXNwbGF5ICR7c3RhdHVzQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZGlzcGxheVRleHQpfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cImJhc2ljXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlDZXJ0IHx8ICdDb3B5IGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgaW5mby1jZXJ0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDZXJ0SW5mbyB8fCAnQ2VydGlmaWNhdGUgZGV0YWlscyd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b24gaWNvbiBiYXNpYyBlZGl0LWJ0blwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0IHx8ICdFZGl0IGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImVkaXQgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZGVsZXRlLWNlcnQtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZSB8fCAnRGVsZXRlIGNlcnRpZmljYXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInRyYXNoIGljb24gcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAke2NlcnRJbmZvICYmICFjZXJ0SW5mby5lcnJvciA/IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5yZW5kZXJDZXJ0aWZpY2F0ZURldGFpbHMoY2VydEluZm8pIDogJyd9XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBmb3JtIGNlcnQtZWRpdC1mb3JtXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1B1YmxpY0tleV9lZGl0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvd3M9XCIxMFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7Z2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHVibGljQ2VydCB8fCAnUGFzdGUgcHVibGljIGNlcnRpZmljYXRlIGhlcmUuLi4nfVwiPiR7ZnVsbFZhbHVlfTwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtaW5pIGJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgcG9zaXRpdmUgYnV0dG9uIHNhdmUtY2VydC1idG5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5idF9TYXZlIHx8ICdTYXZlJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGNhbmNlbC1jZXJ0LWJ0blwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNsb3NlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmJ0X0NhbmNlbCB8fCAnQ2FuY2VsJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGRpc3BsYXlIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgaW5mbyBidXR0b24gLSB0b2dnbGUgZGV0YWlscyBkaXNwbGF5XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuaW5mby1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZGV0YWlscyA9ICRjb250YWluZXIuZmluZCgnLmNlcnQtZGV0YWlscycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGRldGFpbHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZGV0YWlscy5zbGlkZVRvZ2dsZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGVkaXQgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZWRpdC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1kaXNwbGF5JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jZXJ0LWVkaXQtZm9ybScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcjV0VCSFRUUFNQdWJsaWNLZXlfZWRpdCcpLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuc2F2ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9ICRjb250YWluZXIuZmluZCgnI1dFQkhUVFBTUHVibGljS2V5X2VkaXQnKS52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgb3JpZ2luYWwgaGlkZGVuIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKG5ld1ZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIGRpc3BsYXkgd2l0aCBuZXcgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGNhbmNlbCBidXR0b25cbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5jYW5jZWwtY2VydC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuY2VydC1lZGl0LWZvcm0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmNlcnQtZGlzcGxheScpLnNob3coKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGVsZXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmRlbGV0ZS1jZXJ0LWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGNlcnRpZmljYXRlXG4gICAgICAgICAgICAgICAgICAgICRjZXJ0UHViS2V5RmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIG9ubHkgdGhlIGNlcnRpZmljYXRlIGZpZWxkIHRvIHNob3cgZW1wdHkgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRpYWxpemVDZXJ0aWZpY2F0ZUZpZWxkKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2xpcGJvYXJkIGZvciBuZXcgYnV0dG9uc1xuICAgICAgICAgICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaW5pdGlhbGl6ZUNsaXBib2FyZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVB1YmxpY0NlcnQgfHwgJ1Bhc3RlIHB1YmxpYyBjZXJ0aWZpY2F0ZSBoZXJlLi4uJyk7XG4gICAgICAgICAgICAgICAgJGNlcnRQdWJLZXlGaWVsZC5hdHRyKCdyb3dzJywgJzEwJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNoYW5nZSBldmVudHMgdHJpZ2dlciBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAkY2VydFB1YktleUZpZWxkLm9mZignaW5wdXQuY2VydCBjaGFuZ2UuY2VydCBrZXl1cC5jZXJ0Jykub24oJ2lucHV0LmNlcnQgY2hhbmdlLmNlcnQga2V5dXAuY2VydCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJ1bmNhdGVkIGZpZWxkcyBkaXNwbGF5IGZvciBTU0gga2V5cyBhbmQgY2VydGlmaWNhdGVzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRydW5jYXRlZEZpZWxkcygpIHtcbiAgICAgICAgLy8gSGFuZGxlIFNTSF9JRF9SU0FfUFVCIGZpZWxkXG4gICAgICAgIGNvbnN0ICRzc2hQdWJLZXlGaWVsZCA9ICQoJyNTU0hfSURfUlNBX1BVQicpO1xuICAgICAgICBpZiAoJHNzaFB1YktleUZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgZnVsbFZhbHVlID0gJHNzaFB1YktleUZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRzc2hQdWJLZXlGaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBkaXNwbGF5IGVsZW1lbnRzXG4gICAgICAgICAgICAkY29udGFpbmVyLmZpbmQoJy5zc2gta2V5LWRpc3BsYXksIC5mdWxsLWRpc3BsYXknKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBjcmVhdGUgZGlzcGxheSBpZiB0aGVyZSdzIGEgdmFsdWVcbiAgICAgICAgICAgIGlmIChmdWxsVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdHJ1bmNhdGVkIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkudHJ1bmNhdGVTU0hLZXkoZnVsbFZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBvcmlnaW5hbCBmaWVsZFxuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxheUh0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3Rpb24gaW5wdXQgZmx1aWQgc3NoLWtleS1kaXNwbGF5XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2YWx1ZT1cIiR7dHJ1bmNhdGVkfVwiIHJlYWRvbmx5IGNsYXNzPVwidHJ1bmNhdGVkLWRpc3BsYXlcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvbiBpY29uIGJhc2ljIGNvcHktYnRuXCIgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Z2VuZXJhbFNldHRpbmdzTW9kaWZ5LmVzY2FwZUh0bWwoZnVsbFZhbHVlKX1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJiYXNpY1wiIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5S2V5IHx8ICdDb3B5J31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcHkgaWNvbiBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uIGljb24gYmFzaWMgZXhwYW5kLWJ0blwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRXhwYW5kIHx8ICdTaG93IGZ1bGwga2V5J31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4cGFuZCBpY29uIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBjbGFzcz1cImZ1bGwtZGlzcGxheVwiIHN0eWxlPVwiZGlzcGxheTpub25lO1wiIHJlYWRvbmx5PiR7ZnVsbFZhbHVlfTwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBleHBhbmQvY29sbGFwc2VcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLmV4cGFuZC1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmdWxsRGlzcGxheSA9ICRjb250YWluZXIuZmluZCgnLmZ1bGwtZGlzcGxheScpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0cnVuY2F0ZWREaXNwbGF5ID0gJGNvbnRhaW5lci5maW5kKCcuc3NoLWtleS1kaXNwbGF5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKHRoaXMpLmZpbmQoJ2knKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJGZ1bGxEaXNwbGF5LmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICRmdWxsRGlzcGxheS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICR0cnVuY2F0ZWREaXNwbGF5LnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2NvbXByZXNzJykuYWRkQ2xhc3MoJ2V4cGFuZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRmdWxsRGlzcGxheS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICR0cnVuY2F0ZWREaXNwbGF5LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V4cGFuZCcpLmFkZENsYXNzKCdjb21wcmVzcycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBuZXcgZWxlbWVudHNcbiAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBvcmlnaW5hbCBmaWVsZCBhcyByZWFkLW9ubHkgKHRoaXMgaXMgYSBzeXN0ZW0tZ2VuZXJhdGVkIGtleSlcbiAgICAgICAgICAgICAgICAkc3NoUHViS2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5hdHRyKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICRzc2hQdWJLZXlGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS5nc19Ob1NTSFB1YmxpY0tleSB8fCAnTm8gU1NIIHB1YmxpYyBrZXkgZ2VuZXJhdGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBXRUJIVFRQU1B1YmxpY0tleSBmaWVsZCAtIHVzZSBkZWRpY2F0ZWQgbWV0aG9kXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplQ2VydGlmaWNhdGVGaWVsZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIFdFQkhUVFBTUHJpdmF0ZUtleSBmaWVsZCAod3JpdGUtb25seSB3aXRoIHBhc3N3b3JkIG1hc2tpbmcpXG4gICAgICAgIGNvbnN0ICRjZXJ0UHJpdktleUZpZWxkID0gJCgnI1dFQkhUVFBTUHJpdmF0ZUtleScpO1xuICAgICAgICBpZiAoJGNlcnRQcml2S2V5RmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJGNlcnRQcml2S2V5RmllbGQucGFyZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZGlzcGxheSBlbGVtZW50c1xuICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucHJpdmF0ZS1rZXktc2V0LCAjV0VCSFRUUFNQcml2YXRlS2V5X25ldycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBwcml2YXRlIGtleSBleGlzdHMgKHBhc3N3b3JkIG1hc2tpbmcgbG9naWMpXG4gICAgICAgICAgICAvLyBUaGUgZmllbGQgd2lsbCBjb250YWluICd4eHh4eHh4JyBpZiBhIHByaXZhdGUga2V5IGlzIHNldFxuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGNlcnRQcml2S2V5RmllbGQudmFsKCk7XG4gICAgICAgICAgICBjb25zdCBoYXNWYWx1ZSA9IGN1cnJlbnRWYWx1ZSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaGFzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIG9yaWdpbmFsIGZpZWxkIGFuZCBzaG93IHN0YXR1cyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlIHByaXZhdGUta2V5LXNldFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJsb2NrIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUHJpdmF0ZUtleUlzU2V0IHx8ICdQcml2YXRlIGtleSBpcyBjb25maWd1cmVkJ30gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxhY2Uta2V5LWxpbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19SZXBsYWNlIHx8ICdSZXBsYWNlJ308L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8dGV4dGFyZWEgaWQ9XCJXRUJIVFRQU1ByaXZhdGVLZXlfbmV3XCIgbmFtZT1cIldFQkhUVFBTUHJpdmF0ZUtleVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93cz1cIjEwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwiZGlzcGxheTpub25lO1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCIke2dsb2JhbFRyYW5zbGF0ZS5nc19QYXN0ZVByaXZhdGVLZXkgfHwgJ1Bhc3RlIHByaXZhdGUga2V5IGhlcmUuLi4nfVwiPjwvdGV4dGFyZWE+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChkaXNwbGF5SHRtbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHJlcGxhY2UgbGlua1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuZmluZCgnLnJlcGxhY2Uta2V5LWxpbmsnKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRhaW5lci5maW5kKCcucHJpdmF0ZS1rZXktc2V0JykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkbmV3RmllbGQgPSAkY29udGFpbmVyLmZpbmQoJyNXRUJIVFRQU1ByaXZhdGVLZXlfbmV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICRuZXdGaWVsZC5zaG93KCkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBoaWRkZW4gcGFzc3dvcmQgdmFsdWUgc28gd2UgY2FuIHNldCBhIG5ldyBvbmVcbiAgICAgICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEJpbmQgY2hhbmdlIGV2ZW50IHRvIHVwZGF0ZSBoaWRkZW4gZmllbGQgYW5kIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAkbmV3RmllbGQub24oJ2lucHV0IGNoYW5nZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBvcmlnaW5hbCBoaWRkZW4gZmllbGQgd2l0aCBuZXcgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLnZhbCgkbmV3RmllbGQudmFsKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gdmFsaWRhdGlvbiBjaGVja1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmNoZWNrVmFsdWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgb3JpZ2luYWwgZmllbGQgZm9yIGlucHV0IHdpdGggcHJvcGVyIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJGNlcnRQcml2S2V5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLmdzX1Bhc3RlUHJpdmF0ZUtleSB8fCAnUGFzdGUgcHJpdmF0ZSBrZXkgaGVyZS4uLicpO1xuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLmF0dHIoJ3Jvd3MnLCAnMTAnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgY2hhbmdlIGV2ZW50cyB0cmlnZ2VyIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgICRjZXJ0UHJpdktleUZpZWxkLm9mZignaW5wdXQucHJpdiBjaGFuZ2UucHJpdiBrZXl1cC5wcml2Jykub24oJ2lucHV0LnByaXYgY2hhbmdlLnByaXYga2V5dXAucHJpdicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5IGZvciBjb3B5IGJ1dHRvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2xpcGJvYXJkKCkge1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZCkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5jbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jb3B5LWJ0bicpO1xuICAgICAgICBcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBTaG93IHN1Y2Nlc3MgbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoZS50cmlnZ2VyKTtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsSWNvbiA9ICRidG4uZmluZCgnaScpLmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRidG4uZmluZCgnaScpLnJlbW92ZUNsYXNzKCkuYWRkQ2xhc3MoJ2NoZWNrIGljb24nKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRidG4uZmluZCgnaScpLnJlbW92ZUNsYXNzKCkuYWRkQ2xhc3Mob3JpZ2luYWxJY29uKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciBzZWxlY3Rpb25cbiAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2xpcGJvYXJkLm9uKCdlcnJvcicsICgpID0+IHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZ3NfQ29weUZhaWxlZCB8fCAnRmFpbGVkIHRvIGNvcHkgdG8gY2xpcGJvYXJkJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVHJ1bmNhdGUgU1NIIGtleSBmb3IgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSBGdWxsIFNTSCBrZXlcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRydW5jYXRlZCBrZXlcbiAgICAgKi9cbiAgICB0cnVuY2F0ZVNTSEtleShrZXkpIHtcbiAgICAgICAgaWYgKCFrZXkgfHwga2V5Lmxlbmd0aCA8IDUwKSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdCgnICcpO1xuICAgICAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleVR5cGUgPSBwYXJ0c1swXTtcbiAgICAgICAgICAgIGNvbnN0IGtleURhdGEgPSBwYXJ0c1sxXTtcbiAgICAgICAgICAgIGNvbnN0IGNvbW1lbnQgPSBwYXJ0cy5zbGljZSgyKS5qb2luKCcgJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChrZXlEYXRhLmxlbmd0aCA+IDQwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0ga2V5RGF0YS5zdWJzdHJpbmcoMCwgMjApICsgJy4uLicgKyBrZXlEYXRhLnN1YnN0cmluZyhrZXlEYXRhLmxlbmd0aCAtIDE1KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYCR7a2V5VHlwZX0gJHt0cnVuY2F0ZWR9ICR7Y29tbWVudH1gLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRydW5jYXRlIGNlcnRpZmljYXRlIGZvciBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNlcnQgLSBGdWxsIGNlcnRpZmljYXRlXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUcnVuY2F0ZWQgY2VydGlmaWNhdGUgaW4gc2luZ2xlIGxpbmUgZm9ybWF0XG4gICAgICovXG4gICAgdHJ1bmNhdGVDZXJ0aWZpY2F0ZShjZXJ0KSB7XG4gICAgICAgIGlmICghY2VydCB8fCBjZXJ0Lmxlbmd0aCA8IDEwMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNlcnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxpbmVzID0gY2VydC5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gRXh0cmFjdCBmaXJzdCBhbmQgbGFzdCBtZWFuaW5nZnVsIGxpbmVzXG4gICAgICAgIGNvbnN0IGZpcnN0TGluZSA9IGxpbmVzWzBdIHx8ICcnO1xuICAgICAgICBjb25zdCBsYXN0TGluZSA9IGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGNlcnRpZmljYXRlcywgc2hvdyBiZWdpbiBhbmQgZW5kIG1hcmtlcnNcbiAgICAgICAgaWYgKGZpcnN0TGluZS5pbmNsdWRlcygnQkVHSU4gQ0VSVElGSUNBVEUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2ZpcnN0TGluZX0uLi4ke2xhc3RMaW5lfWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBvdGhlciBmb3JtYXRzLCB0cnVuY2F0ZSB0aGUgY29udGVudFxuICAgICAgICBjb25zdCBjbGVhbkNlcnQgPSBjZXJ0LnJlcGxhY2UoL1xcbi9nLCAnICcpLnRyaW0oKTtcbiAgICAgICAgaWYgKGNsZWFuQ2VydC5sZW5ndGggPiA4MCkge1xuICAgICAgICAgICAgcmV0dXJuIGNsZWFuQ2VydC5zdWJzdHJpbmcoMCwgNDApICsgJy4uLicgKyBjbGVhbkNlcnQuc3Vic3RyaW5nKGNsZWFuQ2VydC5sZW5ndGggLSAzMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjbGVhbkNlcnQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCBmb3Igc2FmZSBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgZXNjYXBlSHRtbCh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IG1hcCA9IHtcbiAgICAgICAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICAgICAgICc8JzogJyZsdDsnLFxuICAgICAgICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAgICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgICAgICAgIFwiJ1wiOiAnJiMwMzk7J1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGV4dC5yZXBsYWNlKC9bJjw+XCInXS9nLCBtID0+IG1hcFttXSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93LCBoaWRlIHNzaCBwYXNzd29yZCBzZWdtZW50IGFjY29yZGluZyB0byB0aGUgdmFsdWUgb2YgdXNlIFNTSCBwYXNzd29yZCBjaGVja2JveC5cbiAgICAgKi9cbiAgICBzaG93SGlkZVNTSFBhc3N3b3JkKCl7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGRpc2FibGVTU0hQYXNzd29yZC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkU2VnbWVudC5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmluaXRSdWxlcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBQcmVwYXJlcyBkYXRhIGZvciBSRVNUIEFQSSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFuIHVwIHVubmVjZXNzYXJ5IGZpZWxkcyBiZWZvcmUgc2VuZGluZ1xuICAgICAgICBjb25zdCBmaWVsZHNUb1JlbW92ZSA9IFtcbiAgICAgICAgICAgICdkaXJydHknLFxuICAgICAgICAgICAgJ2RlbGV0ZUFsbElucHV0JyxcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBjb2RlY18qIGZpZWxkcyAodGhleSdyZSByZXBsYWNlZCB3aXRoIHRoZSBjb2RlY3MgYXJyYXkpXG4gICAgICAgIE9iamVjdC5rZXlzKHJlc3VsdC5kYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2NvZGVjXycpIHx8IGZpZWxkc1RvUmVtb3ZlLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xsZWN0IGNvZGVjIGRhdGEgLSBvbmx5IGluY2x1ZGUgaWYgY2hhbmdlZFxuICAgICAgICBjb25zdCBhcnJDb2RlY3MgPSBbXTtcbiAgICAgICAgbGV0IGhhc0NvZGVjQ2hhbmdlcyA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgY29kZWMgcm93c1xuICAgICAgICAkKCcjYXVkaW8tY29kZWNzLXRhYmxlIC5jb2RlYy1yb3csICN2aWRlby1jb2RlY3MtdGFibGUgLmNvZGVjLXJvdycpLmVhY2goKGN1cnJlbnRJbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb2RlY05hbWUgPSAkKG9iaikuYXR0cignZGF0YS1jb2RlYy1uYW1lJyk7XG4gICAgICAgICAgICBpZiAoY29kZWNOYW1lICYmIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5vcmlnaW5hbENvZGVjU3RhdGVbY29kZWNOYW1lXSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5Lm9yaWdpbmFsQ29kZWNTdGF0ZVtjb2RlY05hbWVdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnREaXNhYmxlZCA9ICQob2JqKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcG9zaXRpb24gb3IgZGlzYWJsZWQgc3RhdGUgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50SW5kZXggIT09IG9yaWdpbmFsLnByaW9yaXR5IHx8IGN1cnJlbnREaXNhYmxlZCAhPT0gb3JpZ2luYWwuZGlzYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzQ29kZWNDaGFuZ2VzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYXJyQ29kZWNzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBjb2RlY05hbWUsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBjdXJyZW50RGlzYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiBjdXJyZW50SW5kZXgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gT25seSBpbmNsdWRlIGNvZGVjcyBpZiB0aGVyZSB3ZXJlIGNoYW5nZXNcbiAgICAgICAgaWYgKGhhc0NvZGVjQ2hhbmdlcykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29kZWNzID0gYXJyQ29kZWNzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBIYW5kbGVzIFJFU1QgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAkKFwiI2Vycm9yLW1lc3NhZ2VzXCIpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlOiB7IHJlc3VsdDogYm9vbCwgZGF0YToge30sIG1lc3NhZ2VzOiB7fSB9XG4gICAgICAgIGlmICghcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZ2VuZXJhdGVFcnJvck1lc3NhZ2VIdG1sKHJlc3BvbnNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYXNzd29yZCBmaWVsZHMgdG8gaGlkZGVuIHZhbHVlIG9uIHN1Y2Nlc3NcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnV2ViQWRtaW5QYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1dlYkFkbWluUGFzc3dvcmRSZXBlYXQnLCBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdTU0hQYXNzd29yZCcsIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5oaWRkZW5QYXNzd29yZCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1NTSFBhc3N3b3JkUmVwZWF0JywgZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKTtcbiAgICAgICAgICAgICQoJy5wYXNzd29yZC12YWxpZGF0ZScpLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBkZWxldGUgYWxsIGNvbmRpdGlvbnMgaWYgbmVlZGVkXG4gICAgICAgIGlmICh0eXBlb2YgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNoZWNrRGVsZXRlQ29uZGl0aW9ucygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGVycm9yIG1lc3NhZ2UgSFRNTCBmcm9tIFJFU1QgQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlIHdpdGggZXJyb3IgbWVzc2FnZXNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUVycm9yTWVzc2FnZUh0bWwocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBjb25zdCAkZGl2ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndWkgbmVnYXRpdmUgbWVzc2FnZScsIGlkOiAnZXJyb3ItbWVzc2FnZXMnIH0pO1xuICAgICAgICAgICAgY29uc3QgJGhlYWRlciA9ICQoJzxkaXY+JywgeyBjbGFzczogJ2hlYWRlcicgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuZ3NfRXJyb3JTYXZlU2V0dGluZ3MpO1xuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJGhlYWRlcik7XG4gICAgICAgICAgICBjb25zdCAkdWwgPSAkKCc8dWw+JywgeyBjbGFzczogJ2xpc3QnIH0pO1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZXNTZXQgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIGVycm9yIGFuZCB2YWxpZGF0aW9uIG1lc3NhZ2UgdHlwZXNcbiAgICAgICAgICAgIFsnZXJyb3InLCAndmFsaWRhdGlvbiddLmZvckVhY2gobXNnVHlwZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzID0gQXJyYXkuaXNBcnJheShyZXNwb25zZS5tZXNzYWdlc1ttc2dUeXBlXSkgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLm1lc3NhZ2VzW21zZ1R5cGVdIFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBbcmVzcG9uc2UubWVzc2FnZXNbbXNnVHlwZV1dO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXMuZm9yRWFjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGV4dENvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmIGVycm9yLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGdsb2JhbFRyYW5zbGF0ZVtlcnJvci5tZXNzYWdlXSB8fCBlcnJvci5tZXNzYWdlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudCA9IGdsb2JhbFRyYW5zbGF0ZVtlcnJvcl0gfHwgZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbWVzc2FnZXNTZXQuaGFzKHRleHRDb250ZW50KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzU2V0LmFkZCh0ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHVsLmFwcGVuZCgkKCc8bGk+JykudGV4dCh0ZXh0Q29udGVudCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJGRpdi5hcHBlbmQoJHVsKTtcbiAgICAgICAgICAgICQoJyNzdWJtaXRidXR0b24nKS5iZWZvcmUoJGRpdik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgdmFsaWRhdGlvbiBydWxlcyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRSdWxlcygpIHtcbiAgICAgICAgLy8gU1NIUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kZGlzYWJsZVNTSFBhc3N3b3JkLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS5hZGRpdGlvbmFsU3NoVmFsaWRSdWxlc05vUGFzcztcbiAgICAgICAgfSBlbHNlIGlmIChnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJHNzaFBhc3N3b3JkLnZhbCgpID09PSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuaGlkZGVuUGFzc3dvcmQpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy5TU0hQYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLlNTSFBhc3N3b3JkLnJ1bGVzID0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmFkZGl0aW9uYWxTc2hWYWxpZFJ1bGVzUGFzcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdlYkFkbWluUGFzc3dvcmRcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc01vZGlmeS4kd2ViQWRtaW5QYXNzd29yZC52YWwoKSA9PT0gZ2VuZXJhbFNldHRpbmdzTW9kaWZ5LmhpZGRlblBhc3N3b3JkKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMuV2ViQWRtaW5QYXNzd29yZC5ydWxlcyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLldlYkFkbWluUGFzc3dvcmQucnVsZXMgPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkud2ViQWRtaW5QYXNzd29yZFJ1bGVzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBjZXJ0aWZpY2F0ZSBkZXRhaWxzIEhUTUxcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY2VydEluZm8gLSBDZXJ0aWZpY2F0ZSBpbmZvcm1hdGlvbiBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGZvciBjZXJ0aWZpY2F0ZSBkZXRhaWxzXG4gICAgICovXG4gICAgcmVuZGVyQ2VydGlmaWNhdGVEZXRhaWxzKGNlcnRJbmZvKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJjZXJ0LWRldGFpbHNcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTsgbWFyZ2luLXRvcDoxMHB4O1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHRpbnkgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJqZWN0XG4gICAgICAgIGlmIChjZXJ0SW5mby5zdWJqZWN0KSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+U3ViamVjdDo8L3N0cm9uZz4gJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjZXJ0SW5mby5zdWJqZWN0KX08L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJc3N1ZXJcbiAgICAgICAgaWYgKGNlcnRJbmZvLmlzc3Vlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPklzc3Vlcjo8L3N0cm9uZz4gJHtnZW5lcmFsU2V0dGluZ3NNb2RpZnkuZXNjYXBlSHRtbChjZXJ0SW5mby5pc3N1ZXIpfWA7XG4gICAgICAgICAgICBpZiAoY2VydEluZm8uaXNfc2VsZl9zaWduZWQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICcgPHNwYW4gY2xhc3M9XCJ1aSB0aW55IGxhYmVsXCI+U2VsZi1zaWduZWQ8L3NwYW4+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkaXR5IHBlcmlvZFxuICAgICAgICBpZiAoY2VydEluZm8udmFsaWRfZnJvbSAmJiBjZXJ0SW5mby52YWxpZF90bykge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPlZhbGlkOjwvc3Ryb25nPiAke2NlcnRJbmZvLnZhbGlkX2Zyb219IHRvICR7Y2VydEluZm8udmFsaWRfdG99PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXhwaXJ5IHN0YXR1c1xuICAgICAgICBpZiAoY2VydEluZm8uaXNfZXhwaXJlZCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48c3BhbiBjbGFzcz1cInVpIHRpbnkgcmVkIGxhYmVsXCI+Q2VydGlmaWNhdGUgRXhwaXJlZDwvc3Bhbj48L2Rpdj4nO1xuICAgICAgICB9IGVsc2UgaWYgKGNlcnRJbmZvLmRheXNfdW50aWxfZXhwaXJ5IDw9IDMwKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzcGFuIGNsYXNzPVwidWkgdGlueSB5ZWxsb3cgbGFiZWxcIj5FeHBpcmVzIGluICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXM8L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgfSBlbHNlIGlmIChjZXJ0SW5mby5kYXlzX3VudGlsX2V4cGlyeSA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHNwYW4gY2xhc3M9XCJ1aSB0aW55IGdyZWVuIGxhYmVsXCI+VmFsaWQgZm9yICR7Y2VydEluZm8uZGF5c191bnRpbF9leHBpcnl9IGRheXM8L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3ViamVjdCBBbHRlcm5hdGl2ZSBOYW1lc1xuICAgICAgICBpZiAoY2VydEluZm8uc2FuICYmIGNlcnRJbmZvLnNhbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+QWx0ZXJuYXRpdmUgTmFtZXM6PC9zdHJvbmc+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB0aW55IGxpc3RcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OjEwcHg7XCI+JztcbiAgICAgICAgICAgIGNlcnRJbmZvLnNhbi5mb3JFYWNoKHNhbiA9PiB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj4ke2dlbmVyYWxTZXR0aW5nc01vZGlmeS5lc2NhcGVIdG1sKHNhbil9PC9kaXY+YDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JzsgLy8gQ2xvc2UgbGlzdFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nOyAvLyBDbG9zZSBzZWdtZW50XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7IC8vIENsb3NlIGNlcnQtZGV0YWlsc1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFBCWExhbmd1YWdlIGNoYW5nZSBkZXRlY3Rpb24gZm9yIHJlc3RhcnQgd2FybmluZ1xuICAgICAqIFNob3dzIHJlc3RhcnQgd2FybmluZyBvbmx5IHdoZW4gdGhlIGxhbmd1YWdlIHZhbHVlIGNoYW5nZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUEJYTGFuZ3VhZ2VXYXJuaW5nKCkge1xuICAgICAgICBjb25zdCAkbGFuZ3VhZ2VEcm9wZG93biA9ICQoJyNQQlhMYW5ndWFnZScpO1xuICAgICAgICBjb25zdCAkcmVzdGFydFdhcm5pbmcgPSAkKCcjcmVzdGFydC13YXJuaW5nLVBCWExhbmd1YWdlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCB2YWx1ZVxuICAgICAgICBsZXQgb3JpZ2luYWxWYWx1ZSA9IG51bGw7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgb3JpZ2luYWwgdmFsdWUgYWZ0ZXIgZGF0YSBsb2Fkc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignR2VuZXJhbFNldHRpbmdzLmRhdGFMb2FkZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBvcmlnaW5hbFZhbHVlID0gJGxhbmd1YWdlRHJvcGRvd24udmFsKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGRyb3Bkb3duIGNoYW5nZSBldmVudFxuICAgICAgICAkbGFuZ3VhZ2VEcm9wZG93bi5jbG9zZXN0KCcuZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGlmIHZhbHVlIGNoYW5nZWQgZnJvbSBvcmlnaW5hbFxuICAgICAgICAgICAgICAgIGlmIChvcmlnaW5hbFZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSBvcmlnaW5hbFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICRyZXN0YXJ0V2FybmluZy50cmFuc2l0aW9uKCdmYWRlIGluJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHJlc3RhcnRXYXJuaW5nLnRyYW5zaXRpb24oJ2ZhZGUgb3V0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgUkVTVCBBUEkgbW9kZVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IEdlbmVyYWxTZXR0aW5nc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVTZXR0aW5ncyc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uIGZvciBjbGVhbmVyIEFQSSByZXF1ZXN0c1xuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcblxuICAgICAgICAvLyBObyByZWRpcmVjdCBhZnRlciBzYXZlIC0gc3RheSBvbiB0aGUgc2FtZSBwYWdlXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IG51bGw7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBudWxsO1xuICAgICAgICBGb3JtLnVybCA9IGAjYDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGdlbmVyYWxTZXR0aW5nc01vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBnZW5lcmFsU2V0dGluZ3NNb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZ2VuZXJhbFNldHRpbmdzIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGdlbmVyYWxTZXR0aW5nc01vZGlmeS5pbml0aWFsaXplKCk7XG59KTsiXX0=