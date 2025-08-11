"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, ProvidersAPI, UserMessage, ClipboardJS, NetworkFiltersAPI, FormElements */

/**
 * Object for handling provider management form with REST API v2
 *
 * @module provider
 */
var provider = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#save-provider-form'),

  /**
   * Provider unique ID
   */
  providerId: '',

  /**
   * Provider type (SIP or IAX)
   */
  providerType: '',

  /**
   * jQuery objects
   */
  $secret: $('#secret'),
  $additionalHostsDummy: $('#additional-hosts-table .dummy'),
  $checkBoxes: $('#save-provider-form .checkbox'),
  $accordions: $('#save-provider-form .ui.accordion'),
  $dropDowns: $('#save-provider-form .ui.dropdown'),
  $deleteRowButton: $('#additional-hosts-table .delete-row-button'),
  $qualifyToggle: $('#qualify'),
  $qualifyFreqToggle: $('#qualify-freq'),
  $additionalHostInput: $('#additional-host input'),
  $networkFilterDropdown: $('#networkfilterid'),

  /**
   * Host validation regex
   */
  hostInputValidation: new RegExp('^(((\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}' + '(\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])' + '(\\/(\d|[1-2]\d|3[0-2]))?' + '|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+)$', 'gm'),
  hostRow: '#save-provider-form .host-row',

  /**
   * Validation rules
   */
  validationRules: {},

  /**
   * Initialize the provider modify form.
   */
  initialize: function initialize() {
    // Get provider ID and type from page using jQuery val() instead of form('get value')
    // to avoid Semantic UI warning about old syntax
    provider.providerId = provider.$formObj.find('[name="uniqid"]').val();
    provider.providerType = $('#providerType').val() || 'SIP'; // Initialize UI components FIRST (before loading data)

    provider.initializeUIComponents(); // Setup event handlers

    provider.initializeEventHandlers(); // Load provider data from REST API if editing

    if (provider.providerId) {
      provider.loadProviderData();
    } else {
      // New provider - initialize with defaults
      provider.initializeForm();
    }
  },

  /**
   * Load provider data from REST API
   */
  loadProviderData: function loadProviderData() {
    ProvidersAPI.getRecord(provider.providerId, provider.providerType, function (response) {
      if (response.result && response.data) {
        provider.populateForm(response.data);
        provider.initializeForm();
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Populate form with provider data
   */
  populateForm: function populateForm(data) {
    // Set form values
    Object.keys(data).forEach(function (key) {
      var value = data[key];
      var $field = provider.$formObj.find("[name=\"".concat(key, "\"]"));

      if ($field.length > 0) {
        if ($field.is(':checkbox')) {
          // Handle boolean values properly
          var isChecked = value === true || value === 'true' || value === '1' || value === 1;
          $field.prop('checked', isChecked); // Update Semantic UI checkbox

          var $checkbox = $field.parent('.checkbox');

          if ($checkbox.length > 0) {
            $checkbox.checkbox(isChecked ? 'set checked' : 'set unchecked');
          }
        } else if ($field.is('select')) {
          // Set dropdown value
          $field.dropdown('set selected', value);
        } else {
          // Set regular input value
          $field.val(value);
        }
      }
    }); // Handle additional hosts for SIP

    if (provider.providerType === 'SIP' && data.additionalHosts) {
      provider.populateAdditionalHosts(data.additionalHosts);
    } // Trigger change events to update form state


    provider.$formObj.find('input, select, textarea').trigger('change');
  },

  /**
   * Populate additional hosts table
   */
  populateAdditionalHosts: function populateAdditionalHosts(hosts) {
    var $tbody = $('#additional-hosts-table tbody');
    hosts.forEach(function (host) {
      if (host.address) {
        var $newRow = provider.$additionalHostsDummy.clone();
        $newRow.removeClass('dummy');
        $newRow.find('input').val(host.address);
        $newRow.show();
        $tbody.append($newRow);
      }
    });
  },

  /**
   * Initialize UI components
   */
  initializeUIComponents: function initializeUIComponents() {
    // Initialize Semantic UI components
    provider.$checkBoxes.checkbox();
    provider.$accordions.accordion();
    provider.$dropDowns.dropdown(); // Base class already initializes these dropdowns
    // Initialize password visibility toggle

    provider.initializePasswordToggle(); // Initialize password generator

    provider.initializePasswordGenerator(); // Initialize clipboard

    provider.initializeClipboard(); // Initialize qualify toggle

    provider.initializeQualifyToggle(); // Initialize field tooltips

    provider.initializeFieldTooltips(); // Initialize popuped buttons

    $('.popuped').popup();
  },

  /**
   * Initialize registration type dropdown - DEPRECATED
   * This method is now in provider-base-modify.js
   * @deprecated Use base class method instead
   */
  initializeRegistrationTypeDropdown_OLD: function initializeRegistrationTypeDropdown_OLD() {
    var $registrationTypeField = $('#registration_type');

    if ($registrationTypeField.length === 0) {
      return;
    } // Get current value from hidden field


    var currentValue = $registrationTypeField.val() || 'outbound'; // Determine translation keys based on provider type

    var translationPrefix = provider.providerType === 'IAX' ? 'iax_' : 'sip_'; // Create dropdown HTML

    var dropdownHtml = "\n            <div class=\"ui selection dropdown\" id=\"registration_type_dropdown\">\n                <input type=\"hidden\" id=\"registration_type\" name=\"registration_type\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(globalTranslate[translationPrefix + 'REG_TYPE_' + currentValue.toUpperCase()] || currentValue, "</div>\n                <div class=\"menu\">\n                    <div class=\"item\" data-value=\"outbound\">").concat(globalTranslate[translationPrefix + 'REG_TYPE_OUTBOUND'] || 'Outbound registration', "</div>\n                    <div class=\"item\" data-value=\"inbound\">").concat(globalTranslate[translationPrefix + 'REG_TYPE_INBOUND'] || 'Inbound registration', "</div>\n                    <div class=\"item\" data-value=\"none\">").concat(globalTranslate[translationPrefix + 'REG_TYPE_NONE'] || 'No registration', "</div>\n                </div>\n            </div>\n        "); // Replace hidden field with dropdown

    $registrationTypeField.replaceWith(dropdownHtml); // Initialize the dropdown

    $('#registration_type_dropdown').dropdown({
      onChange: function onChange(value) {
        // Trigger change event on the hidden input
        $('#registration_type').trigger('change');
      }
    }); // Set initial value

    $('#registration_type_dropdown').dropdown('set selected', currentValue);
  },

  /**
   * Initialize DTMF mode dropdown - DEPRECATED
   * This method is now in provider-base-modify.js
   * @deprecated Use base class method instead
   */
  initializeDtmfModeDropdown_OLD: function initializeDtmfModeDropdown_OLD() {
    var _dtmfOptions$find;

    var $dtmfModeField = $('#dtmfmode');

    if ($dtmfModeField.length === 0) {
      return;
    } // Get current value from hidden field


    var currentValue = $dtmfModeField.val() || 'auto'; // DTMF mode options (same as in ExtensionEditForm.php)

    var dtmfOptions = [{
      value: 'auto',
      text: globalTranslate.auto || 'Auto'
    }, {
      value: 'inband',
      text: globalTranslate.inband || 'Inband'
    }, {
      value: 'info',
      text: globalTranslate.info || 'SIP INFO'
    }, {
      value: 'rfc4733',
      text: globalTranslate.rfc4733 || 'RFC 4733'
    }, {
      value: 'auto_info',
      text: globalTranslate.auto_info || 'Auto + SIP INFO'
    }]; // Create dropdown HTML

    var dropdownHtml = "\n            <div class=\"ui selection dropdown\" id=\"dtmfmode_dropdown\">\n                <input type=\"hidden\" id=\"dtmfmode\" name=\"dtmfmode\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(((_dtmfOptions$find = dtmfOptions.find(function (opt) {
      return opt.value === currentValue;
    })) === null || _dtmfOptions$find === void 0 ? void 0 : _dtmfOptions$find.text) || currentValue, "</div>\n                <div class=\"menu\">"); // Add options to dropdown

    dtmfOptions.forEach(function (option) {
      dropdownHtml += "<div class=\"item\" data-value=\"".concat(option.value, "\">").concat(option.text, "</div>");
    });
    dropdownHtml += "\n                </div>\n            </div>\n        "; // Replace hidden field with dropdown

    $dtmfModeField.replaceWith(dropdownHtml); // Initialize the dropdown

    $('#dtmfmode_dropdown').dropdown({
      onChange: function onChange(value) {
        // Trigger change event on the hidden input for any validation logic
        $('#dtmfmode').trigger('change'); // Mark form as changed

        Form.dataChanged();
      }
    }); // Set initial value

    $('#dtmfmode_dropdown').dropdown('set selected', currentValue);
  },

  /**
   * Initialize event handlers
   */
  initializeEventHandlers: function initializeEventHandlers() {
    // Registration type change handler
    $('#registration_type').on('change', provider.cbChangeRegistrationType); // Add host button handler

    $('#add-new-host').on('click', provider.cbOnCompleteHostAddress); // Delete host button handler

    $('body').on('click', '.delete-row-button', provider.cbDeleteAdditionalHost); // Additional host input validation

    provider.$additionalHostInput.on('blur', provider.cbOnCompleteHostAddress);
    provider.$additionalHostInput.on('keypress', function (e) {
      if (e.which === 13) {
        provider.cbOnCompleteHostAddress();
        return false;
      }
    }); // Disablefromuser checkbox handler for SIP providers

    if (provider.providerType === 'SIP') {
      $('#disablefromuser input').on('change', function () {
        var $fromUser = $('#divFromUser');

        if ($('#disablefromuser').checkbox('is checked')) {
          $fromUser.hide();
          $fromUser.removeClass('visible');
        } else {
          $fromUser.show();
          $fromUser.addClass('visible');
        }

        Form.dataChanged();
      });
    } // Handle receive_calls_without_auth checkbox for IAX providers


    if (provider.providerType === 'IAX') {
      // Function to update warning message state
      var updateWarningState = function updateWarningState() {
        if ($checkboxInput.prop('checked')) {
          $warningMessage.removeClass('hidden');
        } else {
          $warningMessage.addClass('hidden');
        }
      }; // Initialize warning state


      var $warningMessage = $('#elReceiveCalls').next('.warning.message');
      var $checkboxInput = $('#receive_calls_without_auth');
      updateWarningState(); // Handle checkbox changes

      $('#receive_calls_without_auth.checkbox').checkbox({
        onChecked: function onChecked() {
          $warningMessage.removeClass('hidden').transition('fade in'); // Re-validate form when this changes

          var isValid = provider.$formObj.form('is valid', 'secret');

          if (!isValid) {
            provider.$formObj.form('validate field', 'secret');
          }

          Form.dataChanged();
        },
        onUnchecked: function onUnchecked() {
          $warningMessage.transition('fade out', function () {
            $warningMessage.addClass('hidden');
          });
          Form.dataChanged();
        }
      });
    }
  },

  /**
   * Initialize form for submission
   */
  initializeForm: function initializeForm() {
    // Get initial registration type and update field visibility
    var registrationType = provider.$formObj.find('[name="registration_type"]').val() || 'outbound'; // Update field visibility first

    provider.updateFieldVisibility(registrationType); // Set validation rules based on registration type

    provider.updateValidationRules(registrationType); // Initialize Form object using standard pattern

    Form.$formObj = provider.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = provider.validationRules;
    Form.cbBeforeSendForm = provider.cbBeforeSendForm;
    Form.cbAfterSendForm = provider.cbAfterSendForm; // REST API integration - standard pattern

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = ProvidersAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Navigation URLs

    Form.afterSubmitIndexUrl = globalRootUrl + 'providers/index/';
    Form.afterSubmitModifyUrl = globalRootUrl + 'providers/modify/';
    Form.initialize(); // Setup auto-resize for textareas after form initialization

    provider.initializeAutoResizeTextareas();
  },

  /**
   * Update validation rules based on registration type
   */
  updateValidationRules: function updateValidationRules(registrationType) {
    // Base validation - description is always required
    var baseRules = {
      description: {
        identifier: 'description',
        rules: [{
          type: 'empty',
          prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
        }]
      }
    };

    if (provider.providerType === 'SIP') {
      if (registrationType === 'outbound') {
        // OUTBOUND: Full validation
        provider.validationRules = _objectSpread(_objectSpread({}, baseRules), {}, {
          host: {
            identifier: 'host',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
            }]
          },
          username: {
            identifier: 'username',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
            }]
          },
          secret: {
            identifier: 'secret',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
            }]
          },
          port: {
            identifier: 'port',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
            }, {
              type: 'integer[1..65535]',
              prompt: globalTranslate.pr_ValidationProviderPortRange || 'Port must be between 1 and 65535'
            }]
          }
        });
      } else if (registrationType === 'inbound') {
        // INBOUND: Host and port optional, username/secret required
        provider.validationRules = _objectSpread(_objectSpread({}, baseRules), {}, {
          username: {
            identifier: 'username',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
            }]
          },
          secret: {
            identifier: 'secret',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
            }, {
              type: 'minLength[8]',
              prompt: globalTranslate.pr_ValidationProviderPasswordTooShort || 'Password must be at least 8 characters'
            }]
          }
        });
      } else if (registrationType === 'none') {
        // NONE: IP authentication - host/port required, no auth
        provider.validationRules = _objectSpread(_objectSpread({}, baseRules), {}, {
          host: {
            identifier: 'host',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
            }]
          },
          port: {
            identifier: 'port',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
            }, {
              type: 'integer[1..65535]',
              prompt: globalTranslate.pr_ValidationProviderPortRange || 'Port must be between 1 and 65535'
            }]
          }
        });
      }
    } else if (provider.providerType === 'IAX') {
      // IAX provider validation rules
      if (registrationType === 'outbound') {
        // OUTBOUND: Full validation
        provider.validationRules = _objectSpread(_objectSpread({}, baseRules), {}, {
          host: {
            identifier: 'host',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
            }]
          },
          username: {
            identifier: 'username',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
            }]
          },
          secret: {
            identifier: 'secret',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
            }]
          },
          port: {
            identifier: 'port',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
            }, {
              type: 'integer[1..65535]',
              prompt: globalTranslate.pr_ValidationProviderPortRange || 'Port must be between 1 and 65535'
            }]
          }
        });
      } else if (registrationType === 'inbound') {
        // INBOUND: Port optional, host optional, username/secret required
        provider.validationRules = _objectSpread(_objectSpread({}, baseRules), {}, {
          username: {
            identifier: 'username',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
            }]
          },
          secret: {
            identifier: 'secret',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
            }, {
              type: 'minLength[8]',
              prompt: globalTranslate.pr_ValidationProviderPasswordTooShort || 'Password must be at least 8 characters'
            }]
          }
        });
      } else if (registrationType === 'none') {
        // NONE: All fields required for peer-to-peer
        provider.validationRules = _objectSpread(_objectSpread({}, baseRules), {}, {
          host: {
            identifier: 'host',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
            }]
          },
          username: {
            identifier: 'username',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
            }]
          },
          secret: {
            identifier: 'secret',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
            }]
          },
          port: {
            identifier: 'port',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
            }, {
              type: 'integer[1..65535]',
              prompt: globalTranslate.pr_ValidationProviderPortRange || 'Port must be between 1 and 65535'
            }]
          }
        });
      }
    }
  },

  /**
   * Callback before form submission
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = provider.$formObj.form('get values'); // Add provider type

    result.data.type = provider.providerType; // Convert checkbox values to proper booleans

    var booleanFields = ['disabled', 'qualify', 'disablefromuser', 'noregister', 'receive_calls_without_auth'];
    booleanFields.forEach(function (field) {
      if (result.data.hasOwnProperty(field)) {
        // Convert various checkbox representations to boolean
        result.data[field] = result.data[field] === true || result.data[field] === 'true' || result.data[field] === '1' || result.data[field] === 'on';
      }
    }); // Handle additional hosts for SIP

    if (provider.providerType === 'SIP') {
      var additionalHosts = [];
      $('#additional-hosts-table tbody tr:not(.dummy)').each(function () {
        var address = $(this).find('input').val();

        if (address) {
          additionalHosts.push({
            address: address
          });
        }
      });
      result.data.additionalHosts = additionalHosts;
    } // Additional client-side validation if needed


    if (!ProvidersAPI.validateProviderData) {
      // If no validation method exists, just return the result
      return result;
    }

    if (!ProvidersAPI.validateProviderData(result.data)) {
      UserMessage.showError('Validation failed');
      return false;
    }

    return result;
  },

  /**
   * Callback after form submission
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result && response.data) {
      // Update form with response data
      provider.populateForm(response.data); // Update URL for new records

      var currentId = $('#uniqid').val();

      if (!currentId && response.data.id) {
        var newUrl = window.location.href.replace(/modify\/?$/, 'modify' + provider.providerType.toLowerCase() + '/' + response.data.id);
        window.history.pushState(null, '', newUrl);
      }
    }
  },

  /**
   * Registration type change handler
   */
  cbChangeRegistrationType: function cbChangeRegistrationType() {
    var registrationType = provider.$formObj.find('[name="registration_type"]').val(); // Update field visibility based on registration type

    provider.updateFieldVisibility(registrationType); // Update validation rules

    provider.updateValidationRules(registrationType); // Clear validation errors for fields that are now hidden

    provider.$formObj.find('.field').removeClass('error');
    provider.$formObj.find('.ui.error.message').remove();
    provider.$formObj.find('.prompt').remove(); // Update Form.validateRules for next submit

    if (Form.validateRules) {
      Form.validateRules = provider.validationRules;
    } // Mark form as changed


    Form.dataChanged(); // Re-validate form to update UI

    setTimeout(function () {
      provider.$formObj.form('is valid');
    }, 100);
  },

  /**
   * Update field visibility based on registration type
   */
  updateFieldVisibility: function updateFieldVisibility(registrationType) {
    // Get element references
    var $elHost = $('#elHost');
    var $elUsername = $('#elUsername');
    var $elSecret = $('#elSecret');
    var $elPort = $('#elPort');
    var $elReceiveCalls = $('#elReceiveCalls');
    var $elAdditionalHost = $('#elAdditionalHosts');
    var $valUserName = $('#username');
    var $valSecret = provider.$secret;
    var $elUniqId = $('#uniqid');
    var $genPassword = $('#generate-password-button');
    var $copyButton = $('#clipboard-password-button');
    var $showHideButton = $('#show-password-button'); // Get label elements

    var $labelHost = $('label[for="host"]');
    var $labelPort = $('label[for="port"]');
    var $labelUsername = $('label[for="username"]');
    var $labelSecret = $('label[for="secret"]');

    if (provider.providerType === 'SIP') {
      // Reset username only when switching from inbound to other types
      if ($valUserName.val() === $elUniqId.val() && registrationType !== 'inbound') {
        $valUserName.val('');
      }

      $valUserName.removeAttr('readonly'); // Update element visibility based on registration type

      if (registrationType === 'outbound') {
        // OUTBOUND: We register to provider
        $elHost.show();
        $elPort.show();
        $elUsername.show();
        $elSecret.show();
        $elAdditionalHost.show();
        $genPassword.hide();
        $copyButton.hide();
        $showHideButton.show(); // Update labels

        $labelHost.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP');
        $labelPort.text(globalTranslate.pr_ProviderPort || 'Provider Port');
        $labelUsername.text(globalTranslate.pr_ProviderLogin || 'Login');
        $labelSecret.text(globalTranslate.pr_ProviderPassword || 'Password');
      } else if (registrationType === 'inbound') {
        // INBOUND: Provider connects to us
        $valUserName.val($elUniqId.val());
        $valUserName.attr('readonly', '');

        if ($valSecret.val().trim() === '') {
          $valSecret.val('id=' + $('#id').val() + '-' + $elUniqId.val());
        }

        $elHost.hide();
        $elPort.hide();
        $elUsername.show();
        $elSecret.show();
        $elAdditionalHost.show();
        $genPassword.show();
        $copyButton.show();
        $showHideButton.show(); // Update labels

        $labelUsername.text(globalTranslate.pr_AuthenticationUsername || 'Authentication Username');
        $labelSecret.text(globalTranslate.pr_AuthenticationPassword || 'Authentication Password'); // Remove validation errors for hidden host field

        provider.$formObj.form('remove prompt', 'host');
        $('#host').closest('.field').removeClass('error');
        provider.$formObj.form('remove prompt', 'port');
        $('#port').closest('.field').removeClass('error');
      } else if (registrationType === 'none') {
        // NONE: Static peer-to-peer connection (IP authentication)
        $elHost.show();
        $elPort.show();
        $elUsername.hide();
        $elSecret.hide();
        $elAdditionalHost.show();
        $genPassword.hide();
        $copyButton.hide();
        $showHideButton.hide(); // Update labels

        $labelHost.text(globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP');
        $labelPort.text(globalTranslate.pr_PeerPort || 'Peer Port'); // Remove validation prompts for hidden fields

        provider.$formObj.form('remove prompt', 'username');
        $('#username').closest('.field').removeClass('error');
        provider.$formObj.form('remove prompt', 'secret');
        $('#secret').closest('.field').removeClass('error');
      } // Handle disablefromuser checkbox visibility


      var $el = $('#disablefromuser');
      var $fromUser = $('#divFromUser');

      if ($el.checkbox('is checked')) {
        $fromUser.hide();
        $fromUser.removeClass('visible');
      } else {
        $fromUser.show();
        $fromUser.addClass('visible');
      }
    } else if (provider.providerType === 'IAX') {
      // Handle IAX provider visibility
      $valUserName.removeAttr('readonly');
      var $valPort = $('#port');
      var $valQualify = $('#qualify'); // Always enable qualify for IAX (NAT keepalive)

      if ($valQualify.length > 0) {
        $valQualify.prop('checked', true);
        $valQualify.val('1');
      } // Set empty network filter ID (no restrictions by default)


      $('#networkfilterid').val(''); // Update element visibility based on registration type

      if (registrationType === 'outbound') {
        // OUTBOUND: We register to provider
        $elHost.show();
        $elPort.show();
        $elUsername.show();
        $elSecret.show();
        $elReceiveCalls.hide(); // Not relevant for outbound
        // Update required fields for outbound

        $elHost.addClass('required');
        $elPort.addClass('required');
        $elUsername.addClass('required');
        $elSecret.addClass('required'); // Hide generate and copy buttons for outbound

        $genPassword.hide();
        $copyButton.hide();
        $showHideButton.show(); // Update labels for outbound

        $labelHost.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP');
        $labelPort.text(globalTranslate.pr_ProviderPort || 'Provider Port');
        $labelUsername.text(globalTranslate.pr_ProviderLogin || 'Login');
        $labelSecret.text(globalTranslate.pr_ProviderPassword || 'Password'); // Set default port if empty

        if ($valPort.val() === '' || $valPort.val() === '0') {
          $valPort.val('4569');
        }
      } else if (registrationType === 'inbound') {
        // INBOUND: Provider connects to us
        $valUserName.val($elUniqId.val());
        $valUserName.attr('readonly', '');

        if ($valSecret.val().trim() === '') {
          $valSecret.val('id=' + $('#id').val() + '-' + $elUniqId.val());
        }

        $elHost.show();
        $elPort.hide(); // Port not needed for inbound connections

        $elUsername.show();
        $elSecret.show();
        $elReceiveCalls.show(); // Show for inbound connections
        // Remove validation prompt for hidden port field

        provider.$formObj.form('remove prompt', 'port'); // Update required fields for inbound

        $elHost.removeClass('required'); // Host is optional for inbound

        $elPort.removeClass('required'); // Remove host validation error since it's optional for inbound

        provider.$formObj.form('remove prompt', 'host');
        $('#host').closest('.field').removeClass('error');
        $elUsername.addClass('required');
        $elSecret.addClass('required'); // Show all buttons for inbound

        $genPassword.show();
        $copyButton.show();
        $showHideButton.show(); // Update labels for inbound

        $labelHost.text(globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host/IP');
        $labelUsername.text(globalTranslate.pr_AuthenticationUsername || 'Authentication Username');
        $labelSecret.text(globalTranslate.pr_AuthenticationPassword || 'Authentication Password');
      } else if (registrationType === 'none') {
        // NONE: Static peer-to-peer connection
        $elHost.show();
        $elPort.show();
        $elUsername.show();
        $elSecret.show();
        $elReceiveCalls.show(); // Show for static connections too
        // Update required fields for none

        $elHost.addClass('required');
        $elPort.addClass('required');
        $elUsername.addClass('required');
        $elSecret.addClass('required'); // Hide generate and copy buttons for none type

        $genPassword.hide();
        $copyButton.hide();
        $showHideButton.show(); // Update labels for none (peer-to-peer)

        $labelHost.text(globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP');
        $labelPort.text(globalTranslate.pr_PeerPort || 'Peer Port');
        $labelUsername.text(globalTranslate.pr_PeerUsername || 'Peer Username');
        $labelSecret.text(globalTranslate.pr_PeerPassword || 'Peer Password'); // Set default port if empty

        if ($valPort.val() === '' || $valPort.val() === '0') {
          $valPort.val('4569');
        }
      }
    }
  },

  /**
   * Add additional host handler
   */
  cbOnCompleteHostAddress: function cbOnCompleteHostAddress() {
    var value = provider.$additionalHostInput.val();

    if (!value || !provider.hostInputValidation.test(value)) {
      return;
    } // Check for duplicates


    var duplicate = false;
    $('#additional-hosts-table tbody tr:not(.dummy)').each(function () {
      if ($(this).find('input').val() === value) {
        duplicate = true;
        return false;
      }
    });

    if (!duplicate) {
      var $newRow = provider.$additionalHostsDummy.clone();
      $newRow.removeClass('dummy');
      $newRow.find('input').val(value);
      $newRow.show();
      $('#additional-hosts-table tbody').append($newRow);
      provider.$additionalHostInput.val('');
      Form.dataChanged();
    }
  },

  /**
   * Delete additional host handler
   */
  cbDeleteAdditionalHost: function cbDeleteAdditionalHost(e) {
    e.preventDefault();
    $(e.target).closest('tr').remove();
    Form.dataChanged();
  },

  /**
   * Initialize password visibility toggle
   */
  initializePasswordToggle: function initializePasswordToggle() {
    $('#show-password-button').on('click', function () {
      var type = provider.$secret.attr('type');

      if (type === 'password') {
        provider.$secret.attr('type', 'text');
        $('#show-password-button i').removeClass('eye').addClass('eye slash');
      } else {
        provider.$secret.attr('type', 'password');
        $('#show-password-button i').removeClass('eye slash').addClass('eye');
      }
    });
  },

  /**
   * Initialize password generator
   */
  initializePasswordGenerator: function initializePasswordGenerator() {
    $('#generate-password-button').on('click', function () {
      var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      var password = '';

      for (var i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      provider.$secret.val(password);
      provider.$secret.trigger('change'); // Show password

      provider.$secret.attr('type', 'text');
      $('#show-password-button i').removeClass('eye').addClass('eye slash');
    });
  },

  /**
   * Initialize clipboard functionality
   */
  initializeClipboard: function initializeClipboard() {
    var clipboard = new ClipboardJS('#clipboard-password-button', {
      text: function text() {
        return provider.$secret.val();
      }
    });
    clipboard.on('success', function () {
      $('#clipboard-password-button').popup({
        content: globalTranslate.pr_PasswordCopied,
        position: 'top center',
        on: 'manual'
      }).popup('show');
      setTimeout(function () {
        $('#clipboard-password-button').popup('hide');
      }, 2000);
    });
  },

  /**
   * Initialize qualify toggle
   */
  initializeQualifyToggle: function initializeQualifyToggle() {
    provider.$qualifyToggle.checkbox({
      onChange: function onChange() {
        if (provider.$qualifyToggle.checkbox('is checked')) {
          provider.$qualifyFreqToggle.removeClass('disabled');
        } else {
          provider.$qualifyFreqToggle.addClass('disabled');
        }
      }
    });
  },

  /**
   * Initialize network filter dropdown
   */
  initializeNetworkFilterDropdown: function initializeNetworkFilterDropdown() {
    if (provider.$networkFilterDropdown.length === 0) {
      return;
    }

    var dropdownSettings = NetworkFiltersAPI.getDropdownSettings(function () {
      Form.dataChanged();
    }); // Clear any existing initialization

    provider.$networkFilterDropdown.dropdown('destroy'); // Initialize fresh dropdown

    provider.$networkFilterDropdown.dropdown(dropdownSettings);
  },

  /**
   * Initialize field help tooltips
   */
  initializeFieldTooltips: function initializeFieldTooltips() {
    var tooltipConfigs = {};

    if (provider.providerType === 'SIP') {
      // SIP-specific tooltips
      tooltipConfigs['registration_type'] = provider.buildTooltipContent({
        header: globalTranslate.pr_RegistrationTypeTooltip_header || 'Registration Type',
        list: [{
          term: globalTranslate.pr_RegistrationTypeTooltip_outbound || 'Outbound',
          definition: globalTranslate.pr_RegistrationTypeTooltip_outbound_desc || 'PBX registers to provider'
        }, {
          term: globalTranslate.pr_RegistrationTypeTooltip_inbound || 'Inbound',
          definition: globalTranslate.pr_RegistrationTypeTooltip_inbound_desc || 'Provider registers to PBX'
        }, {
          term: globalTranslate.pr_RegistrationTypeTooltip_none || 'None',
          definition: globalTranslate.pr_RegistrationTypeTooltip_none_desc || 'IP-based authentication'
        }]
      });
      tooltipConfigs['provider_host'] = provider.buildTooltipContent({
        header: globalTranslate.pr_ProviderHostTooltip_header || 'Provider Host',
        description: globalTranslate.pr_ProviderHostTooltip_desc || 'Enter the hostname or IP address of your SIP provider',
        list: [{
          term: globalTranslate.pr_ProviderHostTooltip_formats || 'Supported formats',
          definition: null
        }],
        list2: [globalTranslate.pr_ProviderHostTooltip_format_ip || 'IP address (e.g., 192.168.1.1)', globalTranslate.pr_ProviderHostTooltip_format_domain || 'Domain name (e.g., sip.provider.com)']
      });
      tooltipConfigs['additional_hosts'] = provider.buildTooltipContent({
        header: globalTranslate.pr_AdditionalHostsTooltip_header || 'Additional Hosts',
        description: globalTranslate.pr_AdditionalHostsTooltip_desc || 'Additional IP addresses or hostnames for this provider',
        list: [globalTranslate.pr_AdditionalHostsTooltip_purpose_id || 'Used for identifying incoming calls', globalTranslate.pr_AdditionalHostsTooltip_purpose_multi || 'Supports multiple provider servers', globalTranslate.pr_AdditionalHostsTooltip_purpose_security || 'Enhances security by restricting access']
      });
      tooltipConfigs['sip_port'] = provider.buildTooltipContent({
        header: globalTranslate.pr_SIPPortTooltip_header || 'SIP Port',
        description: globalTranslate.pr_SIPPortTooltip_desc || 'The port number for SIP communication',
        list: [{
          term: '5060',
          definition: globalTranslate.pr_SIPPortTooltip_port_5060_desc || 'Standard SIP port (UDP/TCP)'
        }, {
          term: '5061',
          definition: globalTranslate.pr_SIPPortTooltip_port_5061_desc || 'Standard SIP port (TLS)'
        }]
      });
      tooltipConfigs['transport_protocol'] = provider.buildTooltipContent({
        header: globalTranslate.pr_TransportProtocolTooltip_header || 'Transport Protocol',
        description: globalTranslate.pr_TransportProtocolTooltip_desc || 'Protocol for SIP signaling',
        list: [{
          term: 'UDP',
          definition: globalTranslate.pr_TransportProtocolTooltip_udp_desc || 'Fast, connectionless protocol'
        }, {
          term: 'TCP',
          definition: globalTranslate.pr_TransportProtocolTooltip_tcp_desc || 'Reliable, connection-oriented protocol'
        }, {
          term: 'TLS',
          definition: globalTranslate.pr_TransportProtocolTooltip_tls_desc || 'Encrypted TCP connection'
        }]
      });
      tooltipConfigs['outbound_proxy'] = provider.buildTooltipContent({
        header: globalTranslate.pr_OutboundProxyTooltip_header || 'Outbound Proxy',
        description: globalTranslate.pr_OutboundProxyTooltip_desc || 'SIP proxy server for outbound calls',
        list: [{
          term: globalTranslate.pr_OutboundProxyTooltip_format || 'Format',
          definition: 'sip:proxy.example.com:5060'
        }]
      });
      tooltipConfigs['dtmf_mode'] = provider.buildTooltipContent({
        header: globalTranslate.pr_DTMFModeTooltip_header || 'DTMF Mode',
        description: globalTranslate.pr_DTMFModeTooltip_desc || 'Method for transmitting DTMF (touch-tone) signals',
        list: [{
          term: 'Auto',
          definition: globalTranslate.pr_DTMFModeTooltip_auto_desc || 'Automatically detect the best DTMF method'
        }, {
          term: 'RFC 4733',
          definition: globalTranslate.pr_DTMFModeTooltip_rfc4733_desc || 'Send DTMF as RTP events (recommended)'
        }, {
          term: 'SIP INFO',
          definition: globalTranslate.pr_DTMFModeTooltip_info_desc || 'Send DTMF via SIP INFO messages'
        }, {
          term: 'Inband',
          definition: globalTranslate.pr_DTMFModeTooltip_inband_desc || 'Send DTMF as audio tones in the media stream'
        }, {
          term: 'Auto + SIP INFO',
          definition: globalTranslate.pr_DTMFModeTooltip_auto_info_desc || 'Try auto detection, fallback to SIP INFO'
        }],
        note: globalTranslate.pr_DTMFModeTooltip_note || 'RFC 4733 is the recommended method for most providers'
      }); // Manual attributes tooltip with detailed examples

      tooltipConfigs['manual_attributes'] = provider.buildTooltipContent({
        header: globalTranslate.pr_ManualAttributesTooltip_header || 'Additional SIP Parameters',
        description: globalTranslate.pr_ManualAttributesTooltip_desc || 'Advanced SIP channel configuration parameters for specific provider requirements',
        list: [{
          term: globalTranslate.pr_ManualAttributesTooltip_common_header || 'Common Parameters',
          definition: null
        }, globalTranslate.pr_ManualAttributesTooltip_maxdatagram || 'maxdatagram=1500 - Maximum UDP packet size', globalTranslate.pr_ManualAttributesTooltip_session_timers || 'session-timers=accept - SIP Session Timer handling', globalTranslate.pr_ManualAttributesTooltip_session_expires || 'session-expires=1800 - Session expiration time', globalTranslate.pr_ManualAttributesTooltip_session_minse || 'session-minse=90 - Minimum session expiration', globalTranslate.pr_ManualAttributesTooltip_t38pt || 't38pt_udptl=yes,redundancy,maxdatagram=400 - T.38 fax support'],
        list2: [{
          term: globalTranslate.pr_ManualAttributesTooltip_codecs_header || 'Codec Settings',
          definition: null
        }, globalTranslate.pr_ManualAttributesTooltip_allow || 'allow=g729,g722,alaw,ulaw - Allowed codecs', globalTranslate.pr_ManualAttributesTooltip_disallow || 'disallow=all - Disallow all codecs first', globalTranslate.pr_ManualAttributesTooltip_videosupport || 'videosupport=yes - Enable video support', globalTranslate.pr_ManualAttributesTooltip_maxcallbitrate || 'maxcallbitrate=384 - Maximum video bitrate'],
        list3: [{
          term: globalTranslate.pr_ManualAttributesTooltip_nat_header || 'NAT & Security',
          definition: null
        }, globalTranslate.pr_ManualAttributesTooltip_directmedia || 'directmedia=no - Disable direct RTP', globalTranslate.pr_ManualAttributesTooltip_canreinvite || 'canreinvite=no - Disable re-INVITE', globalTranslate.pr_ManualAttributesTooltip_insecure || 'insecure=port,invite - Relaxed security', globalTranslate.pr_ManualAttributesTooltip_remotesecret || 'remotesecret=password - Remote authentication'],
        warning: {
          header: globalTranslate.pr_ManualAttributesTooltip_warning_header || 'Important',
          text: globalTranslate.pr_ManualAttributesTooltip_warning || 'Incorrect parameters may prevent calls from working. Use only parameters required by your provider.'
        },
        examples: ['maxdatagram=1500', 'session-timers=accept', 'session-expires=1800', 'directmedia=no', 'allow=g729,alaw,ulaw'],
        examplesHeader: globalTranslate.pr_ManualAttributesTooltip_examples_header || 'Example configuration',
        note: globalTranslate.pr_ManualAttributesTooltip_note || 'One parameter per line. Contact your provider for specific requirements.'
      });
    } else if (provider.providerType === 'IAX') {
      // IAX-specific tooltips
      tooltipConfigs['registration_type'] = provider.buildTooltipContent({
        header: globalTranslate.iax_RegistrationTypeTooltip_header || 'Registration Type',
        list: [{
          term: globalTranslate.iax_RegistrationTypeTooltip_outbound || 'Outbound',
          definition: globalTranslate.iax_RegistrationTypeTooltip_outbound_desc || 'PBX registers to IAX provider'
        }, {
          term: globalTranslate.iax_RegistrationTypeTooltip_inbound || 'Inbound',
          definition: globalTranslate.iax_RegistrationTypeTooltip_inbound_desc || 'Provider registers to PBX'
        }, {
          term: globalTranslate.iax_RegistrationTypeTooltip_none || 'Peer',
          definition: globalTranslate.iax_RegistrationTypeTooltip_none_desc || 'Static peer-to-peer connection'
        }]
      });
      tooltipConfigs['provider_host'] = provider.buildTooltipContent({
        header: globalTranslate.iax_ProviderHostTooltip_header || 'IAX Host',
        description: globalTranslate.iax_ProviderHostTooltip_desc || 'Enter the hostname or IP address of your IAX provider',
        list: [globalTranslate.iax_ProviderHostTooltip_note || 'IAX uses port 4569 by default']
      }); // Manual attributes tooltip for IAX

      tooltipConfigs['manual_attributes'] = provider.buildTooltipContent({
        header: globalTranslate.iax_ManualAttributesTooltip_header || 'Additional IAX Parameters',
        description: globalTranslate.iax_ManualAttributesTooltip_desc || 'Advanced IAX2 channel configuration parameters',
        list: [{
          term: globalTranslate.iax_ManualAttributesTooltip_common_header || 'Common IAX Parameters',
          definition: null
        }, globalTranslate.iax_ManualAttributesTooltip_trunk || 'trunk=yes - Enable IAX2 trunking', globalTranslate.iax_ManualAttributesTooltip_jitterbuffer || 'jitterbuffer=yes - Enable jitter buffer', globalTranslate.iax_ManualAttributesTooltip_forcejitterbuffer || 'forcejitterbuffer=yes - Force jitter buffer', globalTranslate.iax_ManualAttributesTooltip_maxjitterbuffer || 'maxjitterbuffer=400 - Maximum jitter buffer size', globalTranslate.iax_ManualAttributesTooltip_bandwidth || 'bandwidth=low - Bandwidth optimization'],
        list2: [{
          term: globalTranslate.iax_ManualAttributesTooltip_codecs_header || 'IAX Codec Settings',
          definition: null
        }, globalTranslate.iax_ManualAttributesTooltip_allow || 'allow=g729,gsm,alaw,ulaw - Allowed codecs', globalTranslate.iax_ManualAttributesTooltip_disallow || 'disallow=all - Disallow all codecs first', globalTranslate.iax_ManualAttributesTooltip_codecpriority || 'codecpriority=host - Codec priority'],
        warning: {
          header: globalTranslate.iax_ManualAttributesTooltip_warning_header || 'Important',
          text: globalTranslate.iax_ManualAttributesTooltip_warning || 'Incorrect parameters may prevent IAX calls from working. Consult your provider documentation.'
        },
        examples: ['trunk=yes', 'jitterbuffer=yes', 'forcejitterbuffer=yes', 'allow=g729,alaw,ulaw', 'bandwidth=low'],
        examplesHeader: globalTranslate.iax_ManualAttributesTooltip_examples_header || 'Example IAX configuration',
        note: globalTranslate.iax_ManualAttributesTooltip_note || 'One parameter per line. IAX2 parameters are different from SIP parameters.'
      });
    } // Initialize tooltips for each field with info icon


    $('.field-info-icon').each(function (_, element) {
      var $icon = $(element);
      var fieldName = $icon.data('field');
      var content = tooltipConfigs[fieldName];

      if (content) {
        $icon.popup({
          html: content,
          position: 'top right',
          hoverable: true,
          delay: {
            show: 300,
            hide: 100
          },
          variation: 'flowing'
        });
      }
    });
  },

  /**
   * Build HTML content for tooltips from structured data
   * @param {Object} tooltipData - Tooltip data object
   * @returns {string} HTML content for tooltip
   */
  buildTooltipContent: function buildTooltipContent(tooltipData) {
    if (!tooltipData) return '';
    var html = ''; // Add header if exists

    if (tooltipData.header) {
      html += "<div class=\"header\"><strong>".concat(tooltipData.header, "</strong></div>");
      html += '<div class="ui divider"></div>';
    } // Add description if exists


    if (tooltipData.description) {
      html += "<p>".concat(tooltipData.description, "</p>");
    } // Helper function to build list HTML


    var buildList = function buildList(list) {
      if (!list || list.length === 0) return '';
      var listHtml = '<ul style="margin: 0.5em 0; padding-left: 1.5em;">';
      list.forEach(function (item) {
        if (typeof item === 'string') {
          // Simple list item
          listHtml += "<li>".concat(item, "</li>");
        } else if (item.definition === null) {
          // Section header
          listHtml += "</ul><p><strong>".concat(item.term, "</strong></p><ul style=\"margin: 0.5em 0; padding-left: 1.5em;\">");
        } else if (item.term && item.definition) {
          // Term with definition
          listHtml += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
        }
      });
      listHtml += '</ul>';
      return listHtml;
    }; // Add main list if exists


    if (tooltipData.list && tooltipData.list.length > 0) {
      html += buildList(tooltipData.list);
    } // Add additional lists (list2 through list10)


    for (var i = 2; i <= 10; i++) {
      var listKey = "list".concat(i);

      if (tooltipData[listKey] && tooltipData[listKey].length > 0) {
        html += buildList(tooltipData[listKey]);
      }
    } // Add warning if exists


    if (tooltipData.warning) {
      html += '<div class="ui warning message" style="margin: 0.5em 0;">';

      if (tooltipData.warning.header) {
        html += "<div class=\"header\">".concat(tooltipData.warning.header, "</div>");
      }

      if (tooltipData.warning.text) {
        html += "<p>".concat(tooltipData.warning.text, "</p>");
      }

      html += '</div>';
    } // Add examples if exist


    if (tooltipData.examples && tooltipData.examples.length > 0) {
      if (tooltipData.examplesHeader) {
        html += "<p><strong>".concat(tooltipData.examplesHeader, ":</strong></p>");
      }

      html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
      html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">';
      tooltipData.examples.forEach(function (line, index) {
        if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
          // Section header
          if (index > 0) html += '\n';
          html += "<span style=\"color: #0084b4; font-weight: bold;\">".concat(line, "</span>");
        } else if (line.includes('=')) {
          // Parameter line
          var _line$split = line.split('=', 2),
              _line$split2 = _slicedToArray(_line$split, 2),
              param = _line$split2[0],
              value = _line$split2[1];

          html += "\n<span style=\"color: #7a3e9d;\">".concat(param, "</span>=<span style=\"color: #cf4a4c;\">").concat(value, "</span>");
        } else {
          // Regular line
          html += line ? "\n".concat(line) : '';
        }
      });
      html += '</pre>';
      html += '</div>';
    } // Add note if exists


    if (tooltipData.note) {
      html += "<p><em>".concat(tooltipData.note, "</em></p>");
    }

    return html;
  },

  /**
   * Initialize auto-resize for textarea fields (manualattributes and note)
   */
  initializeAutoResizeTextareas: function initializeAutoResizeTextareas() {
    // Setup auto-resize for manualattributes textarea
    var $manualattributesTextarea = $('textarea[name="manualattributes"]');

    if ($manualattributesTextarea.length > 0) {
      // Initial resize
      FormElements.optimizeTextareaSize($manualattributesTextarea); // Add event handlers for dynamic resize

      $manualattributesTextarea.on('input paste keyup', function () {
        FormElements.optimizeTextareaSize($(this));
      });
    } // Setup auto-resize for note textarea  


    var $noteTextarea = $('textarea[name="note"]');

    if ($noteTextarea.length > 0) {
      // Initial resize
      FormElements.optimizeTextareaSize($noteTextarea); // Add event handlers for dynamic resize

      $noteTextarea.on('input paste keyup', function () {
        FormElements.optimizeTextareaSize($(this));
      });
    } // Also trigger resize after data is loaded (with slight delay for DOM updates)


    setTimeout(function () {
      FormElements.optimizeTextareaSize($manualattributesTextarea);
      FormElements.optimizeTextareaSize($noteTextarea);
    }, 100);
  }
}; // Initialize when DOM is ready

$(document).ready(function () {
  provider.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVyIiwiJGZvcm1PYmoiLCIkIiwicHJvdmlkZXJJZCIsInByb3ZpZGVyVHlwZSIsIiRzZWNyZXQiLCIkYWRkaXRpb25hbEhvc3RzRHVtbXkiLCIkY2hlY2tCb3hlcyIsIiRhY2NvcmRpb25zIiwiJGRyb3BEb3ducyIsIiRkZWxldGVSb3dCdXR0b24iLCIkcXVhbGlmeVRvZ2dsZSIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdElucHV0IiwiJG5ldHdvcmtGaWx0ZXJEcm9wZG93biIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJob3N0Um93IiwidmFsaWRhdGlvblJ1bGVzIiwiaW5pdGlhbGl6ZSIsImZpbmQiLCJ2YWwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMiLCJsb2FkUHJvdmlkZXJEYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJQcm92aWRlcnNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJwb3B1bGF0ZUZvcm0iLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJrZXkiLCJ2YWx1ZSIsIiRmaWVsZCIsImxlbmd0aCIsImlzIiwiaXNDaGVja2VkIiwicHJvcCIsIiRjaGVja2JveCIsInBhcmVudCIsImNoZWNrYm94IiwiZHJvcGRvd24iLCJhZGRpdGlvbmFsSG9zdHMiLCJwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyIsInRyaWdnZXIiLCJob3N0cyIsIiR0Ym9keSIsImhvc3QiLCJhZGRyZXNzIiwiJG5ld1JvdyIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJzaG93IiwiYXBwZW5kIiwiYWNjb3JkaW9uIiwiaW5pdGlhbGl6ZVBhc3N3b3JkVG9nZ2xlIiwiaW5pdGlhbGl6ZVBhc3N3b3JkR2VuZXJhdG9yIiwiaW5pdGlhbGl6ZUNsaXBib2FyZCIsImluaXRpYWxpemVRdWFsaWZ5VG9nZ2xlIiwiaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMiLCJwb3B1cCIsImluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd25fT0xEIiwiJHJlZ2lzdHJhdGlvblR5cGVGaWVsZCIsImN1cnJlbnRWYWx1ZSIsInRyYW5zbGF0aW9uUHJlZml4IiwiZHJvcGRvd25IdG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwidG9VcHBlckNhc2UiLCJyZXBsYWNlV2l0aCIsIm9uQ2hhbmdlIiwiaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd25fT0xEIiwiJGR0bWZNb2RlRmllbGQiLCJkdG1mT3B0aW9ucyIsInRleHQiLCJhdXRvIiwiaW5iYW5kIiwiaW5mbyIsInJmYzQ3MzMiLCJhdXRvX2luZm8iLCJvcHQiLCJvcHRpb24iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJvbiIsImNiQ2hhbmdlUmVnaXN0cmF0aW9uVHlwZSIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwiY2JEZWxldGVBZGRpdGlvbmFsSG9zdCIsImUiLCJ3aGljaCIsIiRmcm9tVXNlciIsImhpZGUiLCJhZGRDbGFzcyIsInVwZGF0ZVdhcm5pbmdTdGF0ZSIsIiRjaGVja2JveElucHV0IiwiJHdhcm5pbmdNZXNzYWdlIiwibmV4dCIsIm9uQ2hlY2tlZCIsInRyYW5zaXRpb24iLCJpc1ZhbGlkIiwiZm9ybSIsIm9uVW5jaGVja2VkIiwicmVnaXN0cmF0aW9uVHlwZSIsInVwZGF0ZUZpZWxkVmlzaWJpbGl0eSIsInVwZGF0ZVZhbGlkYXRpb25SdWxlcyIsInVybCIsInZhbGlkYXRlUnVsZXMiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplQXV0b1Jlc2l6ZVRleHRhcmVhcyIsImJhc2VSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInNlY3JldCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0UmFuZ2UiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0Iiwic2V0dGluZ3MiLCJib29sZWFuRmllbGRzIiwiZmllbGQiLCJoYXNPd25Qcm9wZXJ0eSIsImVhY2giLCJwdXNoIiwidmFsaWRhdGVQcm92aWRlckRhdGEiLCJzaG93RXJyb3IiLCJjdXJyZW50SWQiLCJpZCIsIm5ld1VybCIsIndpbmRvdyIsImxvY2F0aW9uIiwiaHJlZiIsInJlcGxhY2UiLCJ0b0xvd2VyQ2FzZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJyZW1vdmUiLCJzZXRUaW1lb3V0IiwiJGVsSG9zdCIsIiRlbFVzZXJuYW1lIiwiJGVsU2VjcmV0IiwiJGVsUG9ydCIsIiRlbFJlY2VpdmVDYWxscyIsIiRlbEFkZGl0aW9uYWxIb3N0IiwiJHZhbFVzZXJOYW1lIiwiJHZhbFNlY3JldCIsIiRlbFVuaXFJZCIsIiRnZW5QYXNzd29yZCIsIiRjb3B5QnV0dG9uIiwiJHNob3dIaWRlQnV0dG9uIiwiJGxhYmVsSG9zdCIsIiRsYWJlbFBvcnQiLCIkbGFiZWxVc2VybmFtZSIsIiRsYWJlbFNlY3JldCIsInJlbW92ZUF0dHIiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1Byb3ZpZGVyUG9ydCIsInByX1Byb3ZpZGVyTG9naW4iLCJwcl9Qcm92aWRlclBhc3N3b3JkIiwiYXR0ciIsInRyaW0iLCJwcl9BdXRoZW50aWNhdGlvblVzZXJuYW1lIiwicHJfQXV0aGVudGljYXRpb25QYXNzd29yZCIsImNsb3Nlc3QiLCJwcl9QZWVySG9zdE9ySVBBZGRyZXNzIiwicHJfUGVlclBvcnQiLCIkZWwiLCIkdmFsUG9ydCIsIiR2YWxRdWFsaWZ5IiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJfUGVlclVzZXJuYW1lIiwicHJfUGVlclBhc3N3b3JkIiwidGVzdCIsImR1cGxpY2F0ZSIsInByZXZlbnREZWZhdWx0IiwidGFyZ2V0IiwiY2hhcnMiLCJwYXNzd29yZCIsImkiLCJjaGFyQXQiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJjbGlwYm9hcmQiLCJDbGlwYm9hcmRKUyIsImNvbnRlbnQiLCJwcl9QYXNzd29yZENvcGllZCIsInBvc2l0aW9uIiwiaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93biIsImRyb3Bkb3duU2V0dGluZ3MiLCJOZXR3b3JrRmlsdGVyc0FQSSIsImdldERyb3Bkb3duU2V0dGluZ3MiLCJ0b29sdGlwQ29uZmlncyIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJoZWFkZXIiLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIiLCJsaXN0IiwidGVybSIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kIiwiZGVmaW5pdGlvbiIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZSIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzYyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRzIiwibGlzdDIiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2RvbWFpbiIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfaGVhZGVyIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9kZXNjIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX2lkIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX211bHRpIiwicHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX3NlY3VyaXR5IiwicHJfU0lQUG9ydFRvb2x0aXBfaGVhZGVyIiwicHJfU0lQUG9ydFRvb2x0aXBfZGVzYyIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MF9kZXNjIiwicHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfaGVhZGVyIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdWRwX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGNwX2Rlc2MiLCJwcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfdGxzX2Rlc2MiLCJwcl9PdXRib3VuZFByb3h5VG9vbHRpcF9oZWFkZXIiLCJwcl9PdXRib3VuZFByb3h5VG9vbHRpcF9kZXNjIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0IiwicHJfRFRNRk1vZGVUb29sdGlwX2hlYWRlciIsInByX0RUTUZNb2RlVG9vbHRpcF9kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2F1dG9fZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9yZmM0NzMzX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfaW5mb19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2luYmFuZF9kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2F1dG9faW5mb19kZXNjIiwibm90ZSIsInByX0RUTUZNb2RlVG9vbHRpcF9ub3RlIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbW1vbl9oZWFkZXIiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9tYXhkYXRhZ3JhbSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3Nlc3Npb25fdGltZXJzIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfc2Vzc2lvbl9leHBpcmVzIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfc2Vzc2lvbl9taW5zZSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3QzOHB0IiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29kZWNzX2hlYWRlciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2FsbG93IiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlzYWxsb3ciLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF92aWRlb3N1cHBvcnQiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9tYXhjYWxsYml0cmF0ZSIsImxpc3QzIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfbmF0X2hlYWRlciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2RpcmVjdG1lZGlhIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY2FucmVpbnZpdGUiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9pbnNlY3VyZSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3JlbW90ZXNlY3JldCIsIndhcm5pbmciLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmciLCJleGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfbm90ZSIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIiLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmQiLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmRfZGVzYyIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzYyIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlciIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Rlc2MiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlIiwiaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kZXNjIiwiaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbW1vbl9oZWFkZXIiLCJpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfdHJ1bmsiLCJpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaml0dGVyYnVmZmVyIiwiaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2ZvcmNlaml0dGVyYnVmZmVyIiwiaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX21heGppdHRlcmJ1ZmZlciIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9iYW5kd2lkdGgiLCJpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29kZWNzX2hlYWRlciIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9hbGxvdyIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXNhbGxvdyIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb2RlY3ByaW9yaXR5IiwiaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmciLCJpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX25vdGUiLCJfIiwiZWxlbWVudCIsIiRpY29uIiwiZmllbGROYW1lIiwiaHRtbCIsImhvdmVyYWJsZSIsImRlbGF5IiwidmFyaWF0aW9uIiwidG9vbHRpcERhdGEiLCJidWlsZExpc3QiLCJsaXN0SHRtbCIsIml0ZW0iLCJsaXN0S2V5IiwibGluZSIsImluZGV4Iiwic3RhcnRzV2l0aCIsImVuZHNXaXRoIiwiaW5jbHVkZXMiLCJzcGxpdCIsInBhcmFtIiwiJG1hbnVhbGF0dHJpYnV0ZXNUZXh0YXJlYSIsIkZvcm1FbGVtZW50cyIsIm9wdGltaXplVGV4dGFyZWFTaXplIiwiJG5vdGVUZXh0YXJlYSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBRWI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FORTs7QUFRYjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLEVBWEM7O0FBYWI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxFQWhCRDs7QUFrQmI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLE9BQU8sRUFBRUgs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QVksQ0FBQ0Msb0JBQWIsQ0FBa0NDLGFBQWxDLEVBRjBCLENBSTFCOztBQUNBQSxNQUFBQSxhQUFhLENBQUNuUCxFQUFkLENBQWlCLG1CQUFqQixFQUFzQyxZQUFXO0FBQzdDaVAsUUFBQUEsWUFBWSxDQUFDQyxvQkFBYixDQUFrQzFVLENBQUMsQ0FBQyxJQUFELENBQW5DO0FBQ0gsT0FGRDtBQUdILEtBdkIyQixDQXlCNUI7OztBQUNBNEosSUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYjZLLE1BQUFBLFlBQVksQ0FBQ0Msb0JBQWIsQ0FBa0NGLHlCQUFsQztBQUNBQyxNQUFBQSxZQUFZLENBQUNDLG9CQUFiLENBQWtDQyxhQUFsQztBQUNILEtBSFMsRUFHUCxHQUhPLENBQVY7QUFJSDtBQTM3Q1ksQ0FBakIsQyxDQTg3Q0E7O0FBQ0EzVSxDQUFDLENBQUM0VSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCL1UsRUFBQUEsUUFBUSxDQUFDbUIsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQcm92aWRlcnNBUEksIFVzZXJNZXNzYWdlLCBDbGlwYm9hcmRKUywgTmV0d29ya0ZpbHRlcnNBUEksIEZvcm1FbGVtZW50cyAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgaGFuZGxpbmcgcHJvdmlkZXIgbWFuYWdlbWVudCBmb3JtIHdpdGggUkVTVCBBUEkgdjJcbiAqXG4gKiBAbW9kdWxlIHByb3ZpZGVyXG4gKi9cbmNvbnN0IHByb3ZpZGVyID0geyBcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIFByb3ZpZGVyIHVuaXF1ZSBJRFxuICAgICAqL1xuICAgIHByb3ZpZGVySWQ6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb3ZpZGVyIHR5cGUgKFNJUCBvciBJQVgpXG4gICAgICovXG4gICAgcHJvdmlkZXJUeXBlOiAnJyxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzXG4gICAgICovXG4gICAgJHNlY3JldDogJCgnI3NlY3JldCcpLFxuICAgICRhZGRpdGlvbmFsSG9zdHNEdW1teTogJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmR1bW15JyksXG4gICAgJGNoZWNrQm94ZXM6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmNoZWNrYm94JyksXG4gICAgJGFjY29yZGlvbnM6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmFjY29yZGlvbicpLFxuICAgICRkcm9wRG93bnM6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmRyb3Bkb3duJyksXG4gICAgJGRlbGV0ZVJvd0J1dHRvbjogJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmRlbGV0ZS1yb3ctYnV0dG9uJyksXG4gICAgJHF1YWxpZnlUb2dnbGU6ICQoJyNxdWFsaWZ5JyksXG4gICAgJHF1YWxpZnlGcmVxVG9nZ2xlOiAkKCcjcXVhbGlmeS1mcmVxJyksXG4gICAgJGFkZGl0aW9uYWxIb3N0SW5wdXQ6ICQoJyNhZGRpdGlvbmFsLWhvc3QgaW5wdXQnKSxcbiAgICAkbmV0d29ya0ZpbHRlckRyb3Bkb3duOiAkKCcjbmV0d29ya2ZpbHRlcmlkJyksXG4gICAgXG4gICAgLyoqXG4gICAgICogSG9zdCB2YWxpZGF0aW9uIHJlZ2V4XG4gICAgICovXG4gICAgaG9zdElucHV0VmFsaWRhdGlvbjogbmV3IFJlZ0V4cChcbiAgICAgICAgJ14oKChcXFxcZHxbMS05XVxcXFxkfDFcXFxcZHsyfXwyWzAtNF1cXFxcZHwyNVswLTVdKVxcXFwuKXszfSdcbiAgICAgICAgKyAnKFxcXFxkfFsxLTldXFxcXGR8MVxcXFxkezJ9fDJbMC00XVxcXFxkfDI1WzAtNV0pJ1xuICAgICAgICArICcoXFxcXC8oXFxkfFsxLTJdXFxkfDNbMC0yXSkpPydcbiAgICAgICAgKyAnfFthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKD86XFxcXC5bYS16QS1aXXsyLH0pKykkJyxcbiAgICAgICAgJ2dtJ1xuICAgICksXG4gICAgXG4gICAgaG9zdFJvdzogJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmhvc3Qtcm93JyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICB2YWxpZGF0aW9uUnVsZXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgbW9kaWZ5IGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2V0IHByb3ZpZGVyIElEIGFuZCB0eXBlIGZyb20gcGFnZSB1c2luZyBqUXVlcnkgdmFsKCkgaW5zdGVhZCBvZiBmb3JtKCdnZXQgdmFsdWUnKVxuICAgICAgICAvLyB0byBhdm9pZCBTZW1hbnRpYyBVSSB3YXJuaW5nIGFib3V0IG9sZCBzeW50YXhcbiAgICAgICAgcHJvdmlkZXIucHJvdmlkZXJJZCA9IHByb3ZpZGVyLiRmb3JtT2JqLmZpbmQoJ1tuYW1lPVwidW5pcWlkXCJdJykudmFsKCk7XG4gICAgICAgIHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9ICQoJyNwcm92aWRlclR5cGUnKS52YWwoKSB8fCAnU0lQJztcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgVUkgY29tcG9uZW50cyBGSVJTVCAoYmVmb3JlIGxvYWRpbmcgZGF0YSlcbiAgICAgICAgcHJvdmlkZXIuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgcHJvdmlkZXIuaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgcHJvdmlkZXIgZGF0YSBmcm9tIFJFU1QgQVBJIGlmIGVkaXRpbmdcbiAgICAgICAgaWYgKHByb3ZpZGVyLnByb3ZpZGVySWQpIHtcbiAgICAgICAgICAgIHByb3ZpZGVyLmxvYWRQcm92aWRlckRhdGEoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5ldyBwcm92aWRlciAtIGluaXRpYWxpemUgd2l0aCBkZWZhdWx0c1xuICAgICAgICAgICAgcHJvdmlkZXIuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBwcm92aWRlciBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkUHJvdmlkZXJEYXRhKCkge1xuICAgICAgICBQcm92aWRlcnNBUEkuZ2V0UmVjb3JkKHByb3ZpZGVyLnByb3ZpZGVySWQsIHByb3ZpZGVyLnByb3ZpZGVyVHlwZSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBwcm92aWRlci5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggcHJvdmlkZXIgZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFNldCBmb3JtIHZhbHVlc1xuICAgICAgICBPYmplY3Qua2V5cyhkYXRhKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YVtrZXldO1xuICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gcHJvdmlkZXIuJGZvcm1PYmouZmluZChgW25hbWU9XCIke2tleX1cIl1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5pcygnOmNoZWNrYm94JykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIGJvb2xlYW4gdmFsdWVzIHByb3Blcmx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09PSAndHJ1ZScgfHwgdmFsdWUgPT09ICcxJyB8fCB2YWx1ZSA9PT0gMTtcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLnByb3AoJ2NoZWNrZWQnLCBpc0NoZWNrZWQpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIFNlbWFudGljIFVJIGNoZWNrYm94XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICRmaWVsZC5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRjaGVja2JveC5jaGVja2JveChpc0NoZWNrZWQgPyAnc2V0IGNoZWNrZWQnIDogJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJGZpZWxkLmlzKCdzZWxlY3QnKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZHJvcGRvd24gdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHJlZ3VsYXIgaW5wdXQgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgJGZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBhZGRpdGlvbmFsIGhvc3RzIGZvciBTSVBcbiAgICAgICAgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcgJiYgZGF0YS5hZGRpdGlvbmFsSG9zdHMpIHtcbiAgICAgICAgICAgIHByb3ZpZGVyLnBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGRhdGEuYWRkaXRpb25hbEhvc3RzKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnRzIHRvIHVwZGF0ZSBmb3JtIHN0YXRlXG4gICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhJykudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBhZGRpdGlvbmFsIGhvc3RzIHRhYmxlXG4gICAgICovXG4gICAgcG9wdWxhdGVBZGRpdGlvbmFsSG9zdHMoaG9zdHMpIHtcbiAgICAgICAgY29uc3QgJHRib2R5ID0gJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHknKTtcbiAgICAgICAgXG4gICAgICAgIGhvc3RzLmZvckVhY2goKGhvc3QpID0+IHtcbiAgICAgICAgICAgIGlmIChob3N0LmFkZHJlc3MpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkbmV3Um93ID0gcHJvdmlkZXIuJGFkZGl0aW9uYWxIb3N0c0R1bW15LmNsb25lKCk7XG4gICAgICAgICAgICAgICAgJG5ld1Jvdy5yZW1vdmVDbGFzcygnZHVtbXknKTtcbiAgICAgICAgICAgICAgICAkbmV3Um93LmZpbmQoJ2lucHV0JykudmFsKGhvc3QuYWRkcmVzcyk7XG4gICAgICAgICAgICAgICAgJG5ld1Jvdy5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHRib2R5LmFwcGVuZCgkbmV3Um93KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGNvbXBvbmVudHNcbiAgICAgICAgcHJvdmlkZXIuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcbiAgICAgICAgcHJvdmlkZXIuJGFjY29yZGlvbnMuYWNjb3JkaW9uKCk7XG4gICAgICAgIHByb3ZpZGVyLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJhc2UgY2xhc3MgYWxyZWFkeSBpbml0aWFsaXplcyB0aGVzZSBkcm9wZG93bnNcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgdmlzaWJpbGl0eSB0b2dnbGVcbiAgICAgICAgcHJvdmlkZXIuaW5pdGlhbGl6ZVBhc3N3b3JkVG9nZ2xlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIGdlbmVyYXRvclxuICAgICAgICBwcm92aWRlci5pbml0aWFsaXplUGFzc3dvcmRHZW5lcmF0b3IoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkXG4gICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVDbGlwYm9hcmQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcXVhbGlmeSB0b2dnbGVcbiAgICAgICAgcHJvdmlkZXIuaW5pdGlhbGl6ZVF1YWxpZnlUb2dnbGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmllbGQgdG9vbHRpcHNcbiAgICAgICAgcHJvdmlkZXIuaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBlZCBidXR0b25zXG4gICAgICAgICQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVnaXN0cmF0aW9uIHR5cGUgZHJvcGRvd24gLSBERVBSRUNBVEVEXG4gICAgICogVGhpcyBtZXRob2QgaXMgbm93IGluIHByb3ZpZGVyLWJhc2UtbW9kaWZ5LmpzXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIGJhc2UgY2xhc3MgbWV0aG9kIGluc3RlYWRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duX09MRCgpIHtcbiAgICAgICAgY29uc3QgJHJlZ2lzdHJhdGlvblR5cGVGaWVsZCA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpO1xuICAgICAgICBpZiAoJHJlZ2lzdHJhdGlvblR5cGVGaWVsZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWUgZnJvbSBoaWRkZW4gZmllbGRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJHJlZ2lzdHJhdGlvblR5cGVGaWVsZC52YWwoKSB8fCAnb3V0Ym91bmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gRGV0ZXJtaW5lIHRyYW5zbGF0aW9uIGtleXMgYmFzZWQgb24gcHJvdmlkZXIgdHlwZVxuICAgICAgICBjb25zdCB0cmFuc2xhdGlvblByZWZpeCA9IHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcgPyAnaWF4XycgOiAnc2lwXyc7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gSFRNTFxuICAgICAgICBjb25zdCBkcm9wZG93bkh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VsZWN0aW9uIGRyb3Bkb3duXCIgaWQ9XCJyZWdpc3RyYXRpb25fdHlwZV9kcm9wZG93blwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJyZWdpc3RyYXRpb25fdHlwZVwiIG5hbWU9XCJyZWdpc3RyYXRpb25fdHlwZVwiIHZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGlvblByZWZpeCArICdSRUdfVFlQRV8nICsgY3VycmVudFZhbHVlLnRvVXBwZXJDYXNlKCldIHx8IGN1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCJvdXRib3VuZFwiPiR7Z2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0aW9uUHJlZml4ICsgJ1JFR19UWVBFX09VVEJPVU5EJ10gfHwgJ091dGJvdW5kIHJlZ2lzdHJhdGlvbid9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cImluYm91bmRcIj4ke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGlvblByZWZpeCArICdSRUdfVFlQRV9JTkJPVU5EJ10gfHwgJ0luYm91bmQgcmVnaXN0cmF0aW9uJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwibm9uZVwiPiR7Z2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0aW9uUHJlZml4ICsgJ1JFR19UWVBFX05PTkUnXSB8fCAnTm8gcmVnaXN0cmF0aW9uJ308L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVwbGFjZSBoaWRkZW4gZmllbGQgd2l0aCBkcm9wZG93blxuICAgICAgICAkcmVnaXN0cmF0aW9uVHlwZUZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBkcm9wZG93blxuICAgICAgICAkKCcjcmVnaXN0cmF0aW9uX3R5cGVfZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgb24gdGhlIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgICAgICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBpbml0aWFsIHZhbHVlXG4gICAgICAgICQoJyNyZWdpc3RyYXRpb25fdHlwZV9kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBjdXJyZW50VmFsdWUpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEVE1GIG1vZGUgZHJvcGRvd24gLSBERVBSRUNBVEVEXG4gICAgICogVGhpcyBtZXRob2QgaXMgbm93IGluIHByb3ZpZGVyLWJhc2UtbW9kaWZ5LmpzXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIGJhc2UgY2xhc3MgbWV0aG9kIGluc3RlYWRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bl9PTEQoKSB7XG4gICAgICAgIGNvbnN0ICRkdG1mTW9kZUZpZWxkID0gJCgnI2R0bWZtb2RlJyk7XG4gICAgICAgIGlmICgkZHRtZk1vZGVGaWVsZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWUgZnJvbSBoaWRkZW4gZmllbGRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGR0bWZNb2RlRmllbGQudmFsKCkgfHwgJ2F1dG8nO1xuICAgICAgICBcbiAgICAgICAgLy8gRFRNRiBtb2RlIG9wdGlvbnMgKHNhbWUgYXMgaW4gRXh0ZW5zaW9uRWRpdEZvcm0ucGhwKVxuICAgICAgICBjb25zdCBkdG1mT3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ2F1dG8nLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5hdXRvIHx8ICdBdXRvJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ2luYmFuZCcsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmluYmFuZCB8fCAnSW5iYW5kJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ2luZm8nLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pbmZvIHx8ICdTSVAgSU5GTydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFsdWU6ICdyZmM0NzMzJyxcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucmZjNDczMyB8fCAnUkZDIDQ3MzMnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhbHVlOiAnYXV0b19pbmZvJyxcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuYXV0b19pbmZvIHx8ICdBdXRvICsgU0lQIElORk8nXG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gSFRNTFxuICAgICAgICBsZXQgZHJvcGRvd25IdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwidWkgc2VsZWN0aW9uIGRyb3Bkb3duXFxcIiBpZD1cXFwiZHRtZm1vZGVfZHJvcGRvd25cXFwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJoaWRkZW5cXFwiIGlkPVxcXCJkdG1mbW9kZVxcXCIgbmFtZT1cXFwiZHRtZm1vZGVcXFwiIHZhbHVlPVxcXCIke2N1cnJlbnRWYWx1ZX1cXFwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJkcm9wZG93biBpY29uXFxcIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGVmYXVsdCB0ZXh0XFxcIj4ke2R0bWZPcHRpb25zLmZpbmQob3B0ID0+IG9wdC52YWx1ZSA9PT0gY3VycmVudFZhbHVlKT8udGV4dCB8fCBjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibWVudVxcXCI+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBvcHRpb25zIHRvIGRyb3Bkb3duXG4gICAgICAgIGR0bWZPcHRpb25zLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgICAgICAgIGRyb3Bkb3duSHRtbCArPSBgPGRpdiBjbGFzcz1cXFwiaXRlbVxcXCIgZGF0YS12YWx1ZT1cXFwiJHtvcHRpb24udmFsdWV9XFxcIj4ke29wdGlvbi50ZXh0fTwvZGl2PmA7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZHJvcGRvd25IdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVwbGFjZSBoaWRkZW4gZmllbGQgd2l0aCBkcm9wZG93blxuICAgICAgICAkZHRtZk1vZGVGaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZHJvcGRvd25cbiAgICAgICAgJCgnI2R0bWZtb2RlX2Ryb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9uIHRoZSBoaWRkZW4gaW5wdXQgZm9yIGFueSB2YWxpZGF0aW9uIGxvZ2ljXG4gICAgICAgICAgICAgICAgJCgnI2R0bWZtb2RlJykudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGluaXRpYWwgdmFsdWVcbiAgICAgICAgJCgnI2R0bWZtb2RlX2Ryb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGN1cnJlbnRWYWx1ZSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIFJlZ2lzdHJhdGlvbiB0eXBlIGNoYW5nZSBoYW5kbGVyXG4gICAgICAgICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLm9uKCdjaGFuZ2UnLCBwcm92aWRlci5jYkNoYW5nZVJlZ2lzdHJhdGlvblR5cGUpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhvc3QgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgJCgnI2FkZC1uZXctaG9zdCcpLm9uKCdjbGljaycsIHByb3ZpZGVyLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlbGV0ZSBob3N0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJ2JvZHknKS5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3ctYnV0dG9uJywgcHJvdmlkZXIuY2JEZWxldGVBZGRpdGlvbmFsSG9zdCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGhvc3QgaW5wdXQgdmFsaWRhdGlvblxuICAgICAgICBwcm92aWRlci4kYWRkaXRpb25hbEhvc3RJbnB1dC5vbignYmx1cicsIHByb3ZpZGVyLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKTtcbiAgICAgICAgcHJvdmlkZXIuJGFkZGl0aW9uYWxIb3N0SW5wdXQub24oJ2tleXByZXNzJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKGUud2hpY2ggPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZWZyb211c2VyIGNoZWNrYm94IGhhbmRsZXIgZm9yIFNJUCBwcm92aWRlcnNcbiAgICAgICAgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgICQoJyNkaXNhYmxlZnJvbXVzZXIgaW5wdXQnKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmcm9tVXNlciA9ICQoJyNkaXZGcm9tVXNlcicpO1xuICAgICAgICAgICAgICAgIGlmICgkKCcjZGlzYWJsZWZyb211c2VyJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAkZnJvbVVzZXIuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkZnJvbVVzZXIucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZnJvbVVzZXIuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkZnJvbVVzZXIuYWRkQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSByZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCBjaGVja2JveCBmb3IgSUFYIHByb3ZpZGVyc1xuICAgICAgICBpZiAocHJvdmlkZXIucHJvdmlkZXJUeXBlID09PSAnSUFYJykge1xuICAgICAgICAgICAgY29uc3QgJHdhcm5pbmdNZXNzYWdlID0gJCgnI2VsUmVjZWl2ZUNhbGxzJykubmV4dCgnLndhcm5pbmcubWVzc2FnZScpO1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94SW5wdXQgPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRnVuY3Rpb24gdG8gdXBkYXRlIHdhcm5pbmcgbWVzc2FnZSBzdGF0ZVxuICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlV2FybmluZ1N0YXRlKCkge1xuICAgICAgICAgICAgICAgIGlmICgkY2hlY2tib3hJbnB1dC5wcm9wKCdjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB3YXJuaW5nIHN0YXRlXG4gICAgICAgICAgICB1cGRhdGVXYXJuaW5nU3RhdGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIGNoZWNrYm94IGNoYW5nZXNcbiAgICAgICAgICAgICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aC5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgICAgICBvbkNoZWNrZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpLnRyYW5zaXRpb24oJ2ZhZGUgaW4nKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtdmFsaWRhdGUgZm9ybSB3aGVuIHRoaXMgY2hhbmdlc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1ZhbGlkID0gcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgnaXMgdmFsaWQnLCAnc2VjcmV0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZmllbGQnLCAnc2VjcmV0Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25VbmNoZWNrZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UudHJhbnNpdGlvbignZmFkZSBvdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSBmb3Igc3VibWlzc2lvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBHZXQgaW5pdGlhbCByZWdpc3RyYXRpb24gdHlwZSBhbmQgdXBkYXRlIGZpZWxkIHZpc2liaWxpdHlcbiAgICAgICAgY29uc3QgcmVnaXN0cmF0aW9uVHlwZSA9IHByb3ZpZGVyLiRmb3JtT2JqLmZpbmQoJ1tuYW1lPVwicmVnaXN0cmF0aW9uX3R5cGVcIl0nKS52YWwoKSB8fCAnb3V0Ym91bmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGZpZWxkIHZpc2liaWxpdHkgZmlyc3RcbiAgICAgICAgcHJvdmlkZXIudXBkYXRlRmllbGRWaXNpYmlsaXR5KHJlZ2lzdHJhdGlvblR5cGUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgcHJvdmlkZXIudXBkYXRlVmFsaWRhdGlvblJ1bGVzKHJlZ2lzdHJhdGlvblR5cGUpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIG9iamVjdCB1c2luZyBzdGFuZGFyZCBwYXR0ZXJuXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBwcm92aWRlci4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gcHJvdmlkZXIudmFsaWRhdGlvblJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBwcm92aWRlci5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHByb3ZpZGVyLmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uIC0gc3RhbmRhcmQgcGF0dGVyblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IFByb3ZpZGVyc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGdsb2JhbFJvb3RVcmwgKyAncHJvdmlkZXJzL2luZGV4Lyc7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBnbG9iYWxSb290VXJsICsgJ3Byb3ZpZGVycy9tb2RpZnkvJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIHRleHRhcmVhcyBhZnRlciBmb3JtIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVBdXRvUmVzaXplVGV4dGFyZWFzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZhbGlkYXRpb25SdWxlcyhyZWdpc3RyYXRpb25UeXBlKSB7XG4gICAgICAgIC8vIEJhc2UgdmFsaWRhdGlvbiAtIGRlc2NyaXB0aW9uIGlzIGFsd2F5cyByZXF1aXJlZFxuICAgICAgICBjb25zdCBiYXNlUnVsZXMgPSB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICBpZiAocmVnaXN0cmF0aW9uVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgICAgIC8vIE9VVEJPVU5EOiBGdWxsIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICBwcm92aWRlci52YWxpZGF0aW9uUnVsZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmJhc2VSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0UmFuZ2UgfHwgJ1BvcnQgbXVzdCBiZSBiZXR3ZWVuIDEgYW5kIDY1NTM1JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWdpc3RyYXRpb25UeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBJTkJPVU5EOiBIb3N0IGFuZCBwb3J0IG9wdGlvbmFsLCB1c2VybmFtZS9zZWNyZXQgcmVxdWlyZWRcbiAgICAgICAgICAgICAgICBwcm92aWRlci52YWxpZGF0aW9uUnVsZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmJhc2VSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbOF0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IHx8ICdQYXNzd29yZCBtdXN0IGJlIGF0IGxlYXN0IDggY2hhcmFjdGVycycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVnaXN0cmF0aW9uVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgLy8gTk9ORTogSVAgYXV0aGVudGljYXRpb24gLSBob3N0L3BvcnQgcmVxdWlyZWQsIG5vIGF1dGhcbiAgICAgICAgICAgICAgICBwcm92aWRlci52YWxpZGF0aW9uUnVsZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmJhc2VSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRSYW5nZSB8fCAnUG9ydCBtdXN0IGJlIGJldHdlZW4gMSBhbmQgNjU1MzUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIucHJvdmlkZXJUeXBlID09PSAnSUFYJykge1xuICAgICAgICAgICAgLy8gSUFYIHByb3ZpZGVyIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgIGlmIChyZWdpc3RyYXRpb25UeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICAgICAgLy8gT1VUQk9VTkQ6IEZ1bGwgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgIHByb3ZpZGVyLnZhbGlkYXRpb25SdWxlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgLi4uYmFzZVJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRSYW5nZSB8fCAnUG9ydCBtdXN0IGJlIGJldHdlZW4gMSBhbmQgNjU1MzUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlZ2lzdHJhdGlvblR5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIC8vIElOQk9VTkQ6IFBvcnQgb3B0aW9uYWwsIGhvc3Qgb3B0aW9uYWwsIHVzZXJuYW1lL3NlY3JldCByZXF1aXJlZFxuICAgICAgICAgICAgICAgIHByb3ZpZGVyLnZhbGlkYXRpb25SdWxlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgLi4uYmFzZVJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQgfHwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWdpc3RyYXRpb25UeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAvLyBOT05FOiBBbGwgZmllbGRzIHJlcXVpcmVkIGZvciBwZWVyLXRvLXBlZXJcbiAgICAgICAgICAgICAgICBwcm92aWRlci52YWxpZGF0aW9uUnVsZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmJhc2VSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0UmFuZ2UgfHwgJ1BvcnQgbXVzdCBiZSBiZXR3ZWVuIDEgYW5kIDY1NTM1JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBwcm92aWRlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcHJvdmlkZXIgdHlwZVxuICAgICAgICByZXN1bHQuZGF0YS50eXBlID0gcHJvdmlkZXIucHJvdmlkZXJUeXBlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gcHJvcGVyIGJvb2xlYW5zXG4gICAgICAgIGNvbnN0IGJvb2xlYW5GaWVsZHMgPSBbJ2Rpc2FibGVkJywgJ3F1YWxpZnknLCAnZGlzYWJsZWZyb211c2VyJywgJ25vcmVnaXN0ZXInLCAncmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnXTtcbiAgICAgICAgYm9vbGVhbkZpZWxkcy5mb3JFYWNoKChmaWVsZCkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmhhc093blByb3BlcnR5KGZpZWxkKSkge1xuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgdmFyaW91cyBjaGVja2JveCByZXByZXNlbnRhdGlvbnMgdG8gYm9vbGVhblxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2ZpZWxkXSA9IHJlc3VsdC5kYXRhW2ZpZWxkXSA9PT0gdHJ1ZSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZF0gPT09ICd0cnVlJyB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZF0gPT09ICcxJyB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZF0gPT09ICdvbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGFkZGl0aW9uYWwgaG9zdHMgZm9yIFNJUFxuICAgICAgICBpZiAocHJvdmlkZXIucHJvdmlkZXJUeXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbEhvc3RzID0gW107XG4gICAgICAgICAgICAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0Ym9keSB0cjpub3QoLmR1bW15KScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWRkcmVzcyA9ICQodGhpcykuZmluZCgnaW5wdXQnKS52YWwoKTtcbiAgICAgICAgICAgICAgICBpZiAoYWRkcmVzcykge1xuICAgICAgICAgICAgICAgICAgICBhZGRpdGlvbmFsSG9zdHMucHVzaCh7YWRkcmVzczogYWRkcmVzc30pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWRkaXRpb25hbEhvc3RzID0gYWRkaXRpb25hbEhvc3RzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNsaWVudC1zaWRlIHZhbGlkYXRpb24gaWYgbmVlZGVkXG4gICAgICAgIGlmICghUHJvdmlkZXJzQVBJLnZhbGlkYXRlUHJvdmlkZXJEYXRhKSB7XG4gICAgICAgICAgICAvLyBJZiBubyB2YWxpZGF0aW9uIG1ldGhvZCBleGlzdHMsIGp1c3QgcmV0dXJuIHRoZSByZXN1bHRcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICghUHJvdmlkZXJzQVBJLnZhbGlkYXRlUHJvdmlkZXJEYXRhKHJlc3VsdC5kYXRhKSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdWYWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhXG4gICAgICAgICAgICBwcm92aWRlci5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjdW5pcWlkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCAnbW9kaWZ5JyArIHByb3ZpZGVyLnByb3ZpZGVyVHlwZS50b0xvd2VyQ2FzZSgpICsgJy8nICsgcmVzcG9uc2UuZGF0YS5pZCk7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWdpc3RyYXRpb24gdHlwZSBjaGFuZ2UgaGFuZGxlclxuICAgICAqL1xuICAgIGNiQ2hhbmdlUmVnaXN0cmF0aW9uVHlwZSgpIHtcbiAgICAgICAgY29uc3QgcmVnaXN0cmF0aW9uVHlwZSA9IHByb3ZpZGVyLiRmb3JtT2JqLmZpbmQoJ1tuYW1lPVwicmVnaXN0cmF0aW9uX3R5cGVcIl0nKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBmaWVsZCB2aXNpYmlsaXR5IGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIHByb3ZpZGVyLnVwZGF0ZUZpZWxkVmlzaWJpbGl0eShyZWdpc3RyYXRpb25UeXBlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIHByb3ZpZGVyLnVwZGF0ZVZhbGlkYXRpb25SdWxlcyhyZWdpc3RyYXRpb25UeXBlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZXJyb3JzIGZvciBmaWVsZHMgdGhhdCBhcmUgbm93IGhpZGRlblxuICAgICAgICBwcm92aWRlci4kZm9ybU9iai5maW5kKCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZmluZCgnLnVpLmVycm9yLm1lc3NhZ2UnKS5yZW1vdmUoKTtcbiAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZmluZCgnLnByb21wdCcpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIEZvcm0udmFsaWRhdGVSdWxlcyBmb3IgbmV4dCBzdWJtaXRcbiAgICAgICAgaWYgKEZvcm0udmFsaWRhdGVSdWxlcykge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gcHJvdmlkZXIudmFsaWRhdGlvblJ1bGVzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS12YWxpZGF0ZSBmb3JtIHRvIHVwZGF0ZSBVSVxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ2lzIHZhbGlkJyk7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZmllbGQgdmlzaWJpbGl0eSBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZUZpZWxkVmlzaWJpbGl0eShyZWdpc3RyYXRpb25UeXBlKSB7XG4gICAgICAgIC8vIEdldCBlbGVtZW50IHJlZmVyZW5jZXNcbiAgICAgICAgY29uc3QgJGVsSG9zdCA9ICQoJyNlbEhvc3QnKTtcbiAgICAgICAgY29uc3QgJGVsVXNlcm5hbWUgPSAkKCcjZWxVc2VybmFtZScpO1xuICAgICAgICBjb25zdCAkZWxTZWNyZXQgPSAkKCcjZWxTZWNyZXQnKTtcbiAgICAgICAgY29uc3QgJGVsUG9ydCA9ICQoJyNlbFBvcnQnKTtcbiAgICAgICAgY29uc3QgJGVsUmVjZWl2ZUNhbGxzID0gJCgnI2VsUmVjZWl2ZUNhbGxzJyk7XG4gICAgICAgIGNvbnN0ICRlbEFkZGl0aW9uYWxIb3N0ID0gJCgnI2VsQWRkaXRpb25hbEhvc3RzJyk7XG4gICAgICAgIGNvbnN0ICR2YWxVc2VyTmFtZSA9ICQoJyN1c2VybmFtZScpO1xuICAgICAgICBjb25zdCAkdmFsU2VjcmV0ID0gcHJvdmlkZXIuJHNlY3JldDtcbiAgICAgICAgY29uc3QgJGVsVW5pcUlkID0gJCgnI3VuaXFpZCcpO1xuICAgICAgICBjb25zdCAkZ2VuUGFzc3dvcmQgPSAkKCcjZ2VuZXJhdGUtcGFzc3dvcmQtYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRjb3B5QnV0dG9uID0gJCgnI2NsaXBib2FyZC1wYXNzd29yZC1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHNob3dIaWRlQnV0dG9uID0gJCgnI3Nob3ctcGFzc3dvcmQtYnV0dG9uJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgbGFiZWwgZWxlbWVudHNcbiAgICAgICAgY29uc3QgJGxhYmVsSG9zdCA9ICQoJ2xhYmVsW2Zvcj1cImhvc3RcIl0nKTtcbiAgICAgICAgY29uc3QgJGxhYmVsUG9ydCA9ICQoJ2xhYmVsW2Zvcj1cInBvcnRcIl0nKTtcbiAgICAgICAgY29uc3QgJGxhYmVsVXNlcm5hbWUgPSAkKCdsYWJlbFtmb3I9XCJ1c2VybmFtZVwiXScpO1xuICAgICAgICBjb25zdCAkbGFiZWxTZWNyZXQgPSAkKCdsYWJlbFtmb3I9XCJzZWNyZXRcIl0nKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICAvLyBSZXNldCB1c2VybmFtZSBvbmx5IHdoZW4gc3dpdGNoaW5nIGZyb20gaW5ib3VuZCB0byBvdGhlciB0eXBlc1xuICAgICAgICAgICAgaWYgKCR2YWxVc2VyTmFtZS52YWwoKSA9PT0gJGVsVW5pcUlkLnZhbCgpICYmIHJlZ2lzdHJhdGlvblR5cGUgIT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgICR2YWxVc2VyTmFtZS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHZhbFVzZXJOYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBlbGVtZW50IHZpc2liaWxpdHkgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgIGlmIChyZWdpc3RyYXRpb25UeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICAgICAgLy8gT1VUQk9VTkQ6IFdlIHJlZ2lzdGVyIHRvIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgJGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsQWRkaXRpb25hbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgICAgICRnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJGNvcHlCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgICAgICRzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVsc1xuICAgICAgICAgICAgICAgICRsYWJlbEhvc3QudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3QvSVAnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWxQb3J0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUG9ydCB8fCAnUHJvdmlkZXIgUG9ydCcpO1xuICAgICAgICAgICAgICAgICRsYWJlbFVzZXJuYW1lLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyTG9naW4gfHwgJ0xvZ2luJyk7XG4gICAgICAgICAgICAgICAgJGxhYmVsU2VjcmV0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUGFzc3dvcmQgfHwgJ1Bhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlZ2lzdHJhdGlvblR5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIC8vIElOQk9VTkQ6IFByb3ZpZGVyIGNvbm5lY3RzIHRvIHVzXG4gICAgICAgICAgICAgICAgJHZhbFVzZXJOYW1lLnZhbCgkZWxVbmlxSWQudmFsKCkpO1xuICAgICAgICAgICAgICAgICR2YWxVc2VyTmFtZS5hdHRyKCdyZWFkb25seScsICcnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHZhbFNlY3JldC52YWwoKS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICR2YWxTZWNyZXQudmFsKCdpZD0nICsgJCgnI2lkJykudmFsKCkgKyAnLScgKyAkZWxVbmlxSWQudmFsKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkZWxIb3N0LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkZWxQb3J0LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxBZGRpdGlvbmFsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGdlblBhc3N3b3JkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY29weUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHNob3dIaWRlQnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzXG4gICAgICAgICAgICAgICAgJGxhYmVsVXNlcm5hbWUudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSB8fCAnQXV0aGVudGljYXRpb24gVXNlcm5hbWUnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWxTZWNyZXQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25QYXNzd29yZCB8fCAnQXV0aGVudGljYXRpb24gUGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBlcnJvcnMgZm9yIGhpZGRlbiBob3N0IGZpZWxkXG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdob3N0Jyk7XG4gICAgICAgICAgICAgICAgJCgnI2hvc3QnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICBwcm92aWRlci4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3BvcnQnKTtcbiAgICAgICAgICAgICAgICAkKCcjcG9ydCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWdpc3RyYXRpb25UeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAvLyBOT05FOiBTdGF0aWMgcGVlci10by1wZWVyIGNvbm5lY3Rpb24gKElQIGF1dGhlbnRpY2F0aW9uKVxuICAgICAgICAgICAgICAgICRlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFVzZXJuYW1lLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkZWxTZWNyZXQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICRlbEFkZGl0aW9uYWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICRjb3B5QnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkc2hvd0hpZGVCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHNcbiAgICAgICAgICAgICAgICAkbGFiZWxIb3N0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1BlZXIgSG9zdC9JUCcpO1xuICAgICAgICAgICAgICAgICRsYWJlbFBvcnQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclBvcnQgfHwgJ1BlZXIgUG9ydCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHByb21wdHMgZm9yIGhpZGRlbiBmaWVsZHNcbiAgICAgICAgICAgICAgICBwcm92aWRlci4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3VzZXJuYW1lJyk7XG4gICAgICAgICAgICAgICAgJCgnI3VzZXJuYW1lJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgICAgICAkKCcjc2VjcmV0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBkaXNhYmxlZnJvbXVzZXIgY2hlY2tib3ggdmlzaWJpbGl0eVxuICAgICAgICAgICAgY29uc3QgJGVsID0gJCgnI2Rpc2FibGVmcm9tdXNlcicpO1xuICAgICAgICAgICAgY29uc3QgJGZyb21Vc2VyID0gJCgnI2RpdkZyb21Vc2VyJyk7XG4gICAgICAgICAgICBpZiAoJGVsLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAkZnJvbVVzZXIuaGlkZSgpO1xuICAgICAgICAgICAgICAgICRmcm9tVXNlci5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkZnJvbVVzZXIuc2hvdygpO1xuICAgICAgICAgICAgICAgICRmcm9tVXNlci5hZGRDbGFzcygndmlzaWJsZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIucHJvdmlkZXJUeXBlID09PSAnSUFYJykge1xuICAgICAgICAgICAgLy8gSGFuZGxlIElBWCBwcm92aWRlciB2aXNpYmlsaXR5XG4gICAgICAgICAgICAkdmFsVXNlck5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcbiAgICAgICAgICAgIGNvbnN0ICR2YWxQb3J0ID0gJCgnI3BvcnQnKTtcbiAgICAgICAgICAgIGNvbnN0ICR2YWxRdWFsaWZ5ID0gJCgnI3F1YWxpZnknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWx3YXlzIGVuYWJsZSBxdWFsaWZ5IGZvciBJQVggKE5BVCBrZWVwYWxpdmUpXG4gICAgICAgICAgICBpZiAoJHZhbFF1YWxpZnkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICR2YWxRdWFsaWZ5LnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAkdmFsUXVhbGlmeS52YWwoJzEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2V0IGVtcHR5IG5ldHdvcmsgZmlsdGVyIElEIChubyByZXN0cmljdGlvbnMgYnkgZGVmYXVsdClcbiAgICAgICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICBpZiAocmVnaXN0cmF0aW9uVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgICAgIC8vIE9VVEJPVU5EOiBXZSByZWdpc3RlciB0byBwcm92aWRlclxuICAgICAgICAgICAgICAgICRlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFJlY2VpdmVDYWxscy5oaWRlKCk7IC8vIE5vdCByZWxldmFudCBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzIGZvciBvdXRib3VuZFxuICAgICAgICAgICAgICAgICRlbEhvc3QuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAgICAgJGVsUG9ydC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICAkZWxVc2VybmFtZS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICAkZWxTZWNyZXQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBnZW5lcmF0ZSBhbmQgY29weSBidXR0b25zIGZvciBvdXRib3VuZFxuICAgICAgICAgICAgICAgICRnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJGNvcHlCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgICAgICRzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVscyBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgICAgICAkbGFiZWxIb3N0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0L0lQJyk7XG4gICAgICAgICAgICAgICAgJGxhYmVsUG9ydC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBvcnQgfHwgJ1Byb3ZpZGVyIFBvcnQnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWxVc2VybmFtZS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckxvZ2luIHx8ICdMb2dpbicpO1xuICAgICAgICAgICAgICAgICRsYWJlbFNlY3JldC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBhc3N3b3JkIHx8ICdQYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IHBvcnQgaWYgZW1wdHlcbiAgICAgICAgICAgICAgICBpZiAoJHZhbFBvcnQudmFsKCkgPT09ICcnIHx8ICR2YWxQb3J0LnZhbCgpID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgICAgICAgJHZhbFBvcnQudmFsKCc0NTY5Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWdpc3RyYXRpb25UeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBJTkJPVU5EOiBQcm92aWRlciBjb25uZWN0cyB0byB1c1xuICAgICAgICAgICAgICAgICR2YWxVc2VyTmFtZS52YWwoJGVsVW5pcUlkLnZhbCgpKTtcbiAgICAgICAgICAgICAgICAkdmFsVXNlck5hbWUuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgICAgICAgICAgaWYgKCR2YWxTZWNyZXQudmFsKCkudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAkdmFsU2VjcmV0LnZhbCgnaWQ9JyArICQoJyNpZCcpLnZhbCgpICsgJy0nICsgJGVsVW5pcUlkLnZhbCgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsUG9ydC5oaWRlKCk7IC8vIFBvcnQgbm90IG5lZWRlZCBmb3IgaW5ib3VuZCBjb25uZWN0aW9uc1xuICAgICAgICAgICAgICAgICRlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFJlY2VpdmVDYWxscy5zaG93KCk7IC8vIFNob3cgZm9yIGluYm91bmQgY29ubmVjdGlvbnNcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBwcm9tcHQgZm9yIGhpZGRlbiBwb3J0IGZpZWxkXG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdwb3J0Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHJlcXVpcmVkIGZpZWxkcyBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgICAgICRlbEhvc3QucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7IC8vIEhvc3QgaXMgb3B0aW9uYWwgZm9yIGluYm91bmRcbiAgICAgICAgICAgICAgICAkZWxQb3J0LnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBob3N0IHZhbGlkYXRpb24gZXJyb3Igc2luY2UgaXQncyBvcHRpb25hbCBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnaG9zdCcpO1xuICAgICAgICAgICAgICAgICQoJyNob3N0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAgICAgJGVsU2VjcmV0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNob3cgYWxsIGJ1dHRvbnMgZm9yIGluYm91bmRcbiAgICAgICAgICAgICAgICAkZ2VuUGFzc3dvcmQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjb3B5QnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgICAgICAkc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIGluYm91bmRcbiAgICAgICAgICAgICAgICAkbGFiZWxIb3N0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyB8fCAnUmVtb3RlIEhvc3QvSVAnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWxVc2VybmFtZS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblVzZXJuYW1lIHx8ICdBdXRoZW50aWNhdGlvbiBVc2VybmFtZScpO1xuICAgICAgICAgICAgICAgICRsYWJlbFNlY3JldC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblBhc3N3b3JkIHx8ICdBdXRoZW50aWNhdGlvbiBQYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWdpc3RyYXRpb25UeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAvLyBOT05FOiBTdGF0aWMgcGVlci10by1wZWVyIGNvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICAkZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxSZWNlaXZlQ2FsbHMuc2hvdygpOyAvLyBTaG93IGZvciBzdGF0aWMgY29ubmVjdGlvbnMgdG9vXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHJlcXVpcmVkIGZpZWxkcyBmb3Igbm9uZVxuICAgICAgICAgICAgICAgICRlbEhvc3QuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAgICAgJGVsUG9ydC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICAkZWxVc2VybmFtZS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICAkZWxTZWNyZXQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBnZW5lcmF0ZSBhbmQgY29weSBidXR0b25zIGZvciBub25lIHR5cGVcbiAgICAgICAgICAgICAgICAkZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICRjb3B5QnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIG5vbmUgKHBlZXItdG8tcGVlcilcbiAgICAgICAgICAgICAgICAkbGFiZWxIb3N0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1BlZXIgSG9zdC9JUCcpO1xuICAgICAgICAgICAgICAgICRsYWJlbFBvcnQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclBvcnQgfHwgJ1BlZXIgUG9ydCcpO1xuICAgICAgICAgICAgICAgICRsYWJlbFVzZXJuYW1lLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJVc2VybmFtZSB8fCAnUGVlciBVc2VybmFtZScpO1xuICAgICAgICAgICAgICAgICRsYWJlbFNlY3JldC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUGFzc3dvcmQgfHwgJ1BlZXIgUGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKCR2YWxQb3J0LnZhbCgpID09PSAnJyB8fCAkdmFsUG9ydC52YWwoKSA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgICAgICR2YWxQb3J0LnZhbCgnNDU2OScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIGFkZGl0aW9uYWwgaG9zdCBoYW5kbGVyXG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gcHJvdmlkZXIuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXZhbHVlIHx8ICFwcm92aWRlci5ob3N0SW5wdXRWYWxpZGF0aW9uLnRlc3QodmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBkdXBsaWNhdGVzXG4gICAgICAgIGxldCBkdXBsaWNhdGUgPSBmYWxzZTtcbiAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHkgdHI6bm90KC5kdW1teSknKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKCQodGhpcykuZmluZCgnaW5wdXQnKS52YWwoKSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICBkdXBsaWNhdGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWR1cGxpY2F0ZSkge1xuICAgICAgICAgICAgY29uc3QgJG5ld1JvdyA9IHByb3ZpZGVyLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5jbG9uZSgpO1xuICAgICAgICAgICAgJG5ld1Jvdy5yZW1vdmVDbGFzcygnZHVtbXknKTtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnaW5wdXQnKS52YWwodmFsdWUpO1xuICAgICAgICAgICAgJG5ld1Jvdy5zaG93KCk7XG4gICAgICAgICAgICAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0Ym9keScpLmFwcGVuZCgkbmV3Um93KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcHJvdmlkZXIuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCcnKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGFkZGl0aW9uYWwgaG9zdCBoYW5kbGVyXG4gICAgICovXG4gICAgY2JEZWxldGVBZGRpdGlvbmFsSG9zdChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB2aXNpYmlsaXR5IHRvZ2dsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYXNzd29yZFRvZ2dsZSgpIHtcbiAgICAgICAgJCgnI3Nob3ctcGFzc3dvcmQtYnV0dG9uJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9IHByb3ZpZGVyLiRzZWNyZXQuYXR0cigndHlwZScpO1xuICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdwYXNzd29yZCcpIHtcbiAgICAgICAgICAgICAgICBwcm92aWRlci4kc2VjcmV0LmF0dHIoJ3R5cGUnLCAndGV4dCcpO1xuICAgICAgICAgICAgICAgICQoJyNzaG93LXBhc3N3b3JkLWJ1dHRvbiBpJykucmVtb3ZlQ2xhc3MoJ2V5ZScpLmFkZENsYXNzKCdleWUgc2xhc2gnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJHNlY3JldC5hdHRyKCd0eXBlJywgJ3Bhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgJCgnI3Nob3ctcGFzc3dvcmQtYnV0dG9uIGknKS5yZW1vdmVDbGFzcygnZXllIHNsYXNoJykuYWRkQ2xhc3MoJ2V5ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgZ2VuZXJhdG9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkR2VuZXJhdG9yKCkge1xuICAgICAgICAkKCcjZ2VuZXJhdGUtcGFzc3dvcmQtYnV0dG9uJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2hhcnMgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWjAxMjM0NTY3ODknO1xuICAgICAgICAgICAgbGV0IHBhc3N3b3JkID0gJyc7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDE2OyBpKyspIHtcbiAgICAgICAgICAgICAgICBwYXNzd29yZCArPSBjaGFycy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcm92aWRlci4kc2VjcmV0LnZhbChwYXNzd29yZCk7XG4gICAgICAgICAgICBwcm92aWRlci4kc2VjcmV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IHBhc3N3b3JkXG4gICAgICAgICAgICBwcm92aWRlci4kc2VjcmV0LmF0dHIoJ3R5cGUnLCAndGV4dCcpO1xuICAgICAgICAgICAgJCgnI3Nob3ctcGFzc3dvcmQtYnV0dG9uIGknKS5yZW1vdmVDbGFzcygnZXllJykuYWRkQ2xhc3MoJ2V5ZSBzbGFzaCcpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2xpcGJvYXJkIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2xpcGJvYXJkKCkge1xuICAgICAgICBjb25zdCBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJyNjbGlwYm9hcmQtcGFzc3dvcmQtYnV0dG9uJywge1xuICAgICAgICAgICAgdGV4dDogKCkgPT4gcHJvdmlkZXIuJHNlY3JldC52YWwoKVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNsaXBib2FyZC5vbignc3VjY2VzcycsICgpID0+IHtcbiAgICAgICAgICAgICQoJyNjbGlwYm9hcmQtcGFzc3dvcmQtYnV0dG9uJykucG9wdXAoe1xuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9QYXNzd29yZENvcGllZCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJ1xuICAgICAgICAgICAgfSkucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJCgnI2NsaXBib2FyZC1wYXNzd29yZC1idXR0b24nKS5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBxdWFsaWZ5IHRvZ2dsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVRdWFsaWZ5VG9nZ2xlKCkge1xuICAgICAgICBwcm92aWRlci4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICBwcm92aWRlci4kcXVhbGlmeUZyZXFUb2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXIuJHF1YWxpZnlGcmVxVG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93blxuICAgICAqL1xuICAgIGluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24oKSB7XG4gICAgICAgIGlmIChwcm92aWRlci4kbmV0d29ya0ZpbHRlckRyb3Bkb3duLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkcm9wZG93blNldHRpbmdzID0gTmV0d29ya0ZpbHRlcnNBUEkuZ2V0RHJvcGRvd25TZXR0aW5ncygoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHByb3ZpZGVyLiRuZXR3b3JrRmlsdGVyRHJvcGRvd24uZHJvcGRvd24oJ2Rlc3Ryb3knKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZnJlc2ggZHJvcGRvd25cbiAgICAgICAgcHJvdmlkZXIuJG5ldHdvcmtGaWx0ZXJEcm9wZG93bi5kcm9wZG93bihkcm9wZG93blNldHRpbmdzKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCkge1xuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgIC8vIFNJUC1zcGVjaWZpYyB0b29sdGlwc1xuICAgICAgICAgICAgdG9vbHRpcENvbmZpZ3NbJ3JlZ2lzdHJhdGlvbl90eXBlJ10gPSBwcm92aWRlci5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIgfHwgJ1JlZ2lzdHJhdGlvbiBUeXBlJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCB8fCAnT3V0Ym91bmQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kX2Rlc2MgfHwgJ1BCWCByZWdpc3RlcnMgdG8gcHJvdmlkZXInXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kIHx8ICdJbmJvdW5kJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kX2Rlc2MgfHwgJ1Byb3ZpZGVyIHJlZ2lzdGVycyB0byBQQlgnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lIHx8ICdOb25lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lX2Rlc2MgfHwgJ0lQLWJhc2VkIGF1dGhlbnRpY2F0aW9uJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRvb2x0aXBDb25maWdzWydwcm92aWRlcl9ob3N0J10gPSBwcm92aWRlci5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlciB8fCAnUHJvdmlkZXIgSG9zdCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Rlc2MgfHwgJ0VudGVyIHRoZSBob3N0bmFtZSBvciBJUCBhZGRyZXNzIG9mIHlvdXIgU0lQIHByb3ZpZGVyJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdHMgfHwgJ1N1cHBvcnRlZCBmb3JtYXRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2lwIHx8ICdJUCBhZGRyZXNzIChlLmcuLCAxOTIuMTY4LjEuMSknLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfZG9tYWluIHx8ICdEb21haW4gbmFtZSAoZS5nLiwgc2lwLnByb3ZpZGVyLmNvbSknXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRvb2x0aXBDb25maWdzWydhZGRpdGlvbmFsX2hvc3RzJ10gPSBwcm92aWRlci5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2hlYWRlciB8fCAnQWRkaXRpb25hbCBIb3N0cycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2Rlc2MgfHwgJ0FkZGl0aW9uYWwgSVAgYWRkcmVzc2VzIG9yIGhvc3RuYW1lcyBmb3IgdGhpcyBwcm92aWRlcicsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX2lkIHx8ICdVc2VkIGZvciBpZGVudGlmeWluZyBpbmNvbWluZyBjYWxscycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX3B1cnBvc2VfbXVsdGkgfHwgJ1N1cHBvcnRzIG11bHRpcGxlIHByb3ZpZGVyIHNlcnZlcnMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX3NlY3VyaXR5IHx8ICdFbmhhbmNlcyBzZWN1cml0eSBieSByZXN0cmljdGluZyBhY2Nlc3MnXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRvb2x0aXBDb25maWdzWydzaXBfcG9ydCddID0gcHJvdmlkZXIuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfaGVhZGVyIHx8ICdTSVAgUG9ydCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9kZXNjIHx8ICdUaGUgcG9ydCBudW1iZXIgZm9yIFNJUCBjb21tdW5pY2F0aW9uJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICc1MDYwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjBfZGVzYyB8fCAnU3RhbmRhcmQgU0lQIHBvcnQgKFVEUC9UQ1ApJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnNTA2MScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYxX2Rlc2MgfHwgJ1N0YW5kYXJkIFNJUCBwb3J0IChUTFMpJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRvb2x0aXBDb25maWdzWyd0cmFuc3BvcnRfcHJvdG9jb2wnXSA9IHByb3ZpZGVyLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9oZWFkZXIgfHwgJ1RyYW5zcG9ydCBQcm90b2NvbCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfZGVzYyB8fCAnUHJvdG9jb2wgZm9yIFNJUCBzaWduYWxpbmcnLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJ1VEUCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF9kZXNjIHx8ICdGYXN0LCBjb25uZWN0aW9ubGVzcyBwcm90b2NvbCdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJ1RDUCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcF9kZXNjIHx8ICdSZWxpYWJsZSwgY29ubmVjdGlvbi1vcmllbnRlZCBwcm90b2NvbCdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJ1RMUycsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjIHx8ICdFbmNyeXB0ZWQgVENQIGNvbm5lY3Rpb24nXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdG9vbHRpcENvbmZpZ3NbJ291dGJvdW5kX3Byb3h5J10gPSBwcm92aWRlci5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9oZWFkZXIgfHwgJ091dGJvdW5kIFByb3h5JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX091dGJvdW5kUHJveHlUb29sdGlwX2Rlc2MgfHwgJ1NJUCBwcm94eSBzZXJ2ZXIgZm9yIG91dGJvdW5kIGNhbGxzJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9mb3JtYXQgfHwgJ0Zvcm1hdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiAnc2lwOnByb3h5LmV4YW1wbGUuY29tOjUwNjAnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdG9vbHRpcENvbmZpZ3NbJ2R0bWZfbW9kZSddID0gcHJvdmlkZXIuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2hlYWRlciB8fCAnRFRNRiBNb2RlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9kZXNjIHx8ICdNZXRob2QgZm9yIHRyYW5zbWl0dGluZyBEVE1GICh0b3VjaC10b25lKSBzaWduYWxzJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdBdXRvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19kZXNjIHx8ICdBdXRvbWF0aWNhbGx5IGRldGVjdCB0aGUgYmVzdCBEVE1GIG1ldGhvZCdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJ1JGQyA0NzMzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczM19kZXNjIHx8ICdTZW5kIERUTUYgYXMgUlRQIGV2ZW50cyAocmVjb21tZW5kZWQpJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnU0lQIElORk8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmZvX2Rlc2MgfHwgJ1NlbmQgRFRNRiB2aWEgU0lQIElORk8gbWVzc2FnZXMnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdJbmJhbmQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmRfZGVzYyB8fCAnU2VuZCBEVE1GIGFzIGF1ZGlvIHRvbmVzIGluIHRoZSBtZWRpYSBzdHJlYW0nXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdBdXRvICsgU0lQIElORk8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm9fZGVzYyB8fCAnVHJ5IGF1dG8gZGV0ZWN0aW9uLCBmYWxsYmFjayB0byBTSVAgSU5GTydcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9ub3RlIHx8ICdSRkMgNDczMyBpcyB0aGUgcmVjb21tZW5kZWQgbWV0aG9kIGZvciBtb3N0IHByb3ZpZGVycydcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBNYW51YWwgYXR0cmlidXRlcyB0b29sdGlwIHdpdGggZGV0YWlsZWQgZXhhbXBsZXNcbiAgICAgICAgICAgIHRvb2x0aXBDb25maWdzWydtYW51YWxfYXR0cmlidXRlcyddID0gcHJvdmlkZXIuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyIHx8ICdBZGRpdGlvbmFsIFNJUCBQYXJhbWV0ZXJzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MgfHwgJ0FkdmFuY2VkIFNJUCBjaGFubmVsIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVycyBmb3Igc3BlY2lmaWMgcHJvdmlkZXIgcmVxdWlyZW1lbnRzJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25faGVhZGVyIHx8ICdDb21tb24gUGFyYW1ldGVycycsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9tYXhkYXRhZ3JhbSB8fCAnbWF4ZGF0YWdyYW09MTUwMCAtIE1heGltdW0gVURQIHBhY2tldCBzaXplJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3Nlc3Npb25fdGltZXJzIHx8ICdzZXNzaW9uLXRpbWVycz1hY2NlcHQgLSBTSVAgU2Vzc2lvbiBUaW1lciBoYW5kbGluZycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9zZXNzaW9uX2V4cGlyZXMgfHwgJ3Nlc3Npb24tZXhwaXJlcz0xODAwIC0gU2Vzc2lvbiBleHBpcmF0aW9uIHRpbWUnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfc2Vzc2lvbl9taW5zZSB8fCAnc2Vzc2lvbi1taW5zZT05MCAtIE1pbmltdW0gc2Vzc2lvbiBleHBpcmF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3QzOHB0IHx8ICd0MzhwdF91ZHB0bD15ZXMscmVkdW5kYW5jeSxtYXhkYXRhZ3JhbT00MDAgLSBULjM4IGZheCBzdXBwb3J0J1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvZGVjc19oZWFkZXIgfHwgJ0NvZGVjIFNldHRpbmdzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2FsbG93IHx8ICdhbGxvdz1nNzI5LGc3MjIsYWxhdyx1bGF3IC0gQWxsb3dlZCBjb2RlY3MnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlzYWxsb3cgfHwgJ2Rpc2FsbG93PWFsbCAtIERpc2FsbG93IGFsbCBjb2RlY3MgZmlyc3QnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfdmlkZW9zdXBwb3J0IHx8ICd2aWRlb3N1cHBvcnQ9eWVzIC0gRW5hYmxlIHZpZGVvIHN1cHBvcnQnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfbWF4Y2FsbGJpdHJhdGUgfHwgJ21heGNhbGxiaXRyYXRlPTM4NCAtIE1heGltdW0gdmlkZW8gYml0cmF0ZSdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9uYXRfaGVhZGVyIHx8ICdOQVQgJiBTZWN1cml0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RtZWRpYSB8fCAnZGlyZWN0bWVkaWE9bm8gLSBEaXNhYmxlIGRpcmVjdCBSVFAnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY2FucmVpbnZpdGUgfHwgJ2NhbnJlaW52aXRlPW5vIC0gRGlzYWJsZSByZS1JTlZJVEUnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaW5zZWN1cmUgfHwgJ2luc2VjdXJlPXBvcnQsaW52aXRlIC0gUmVsYXhlZCBzZWN1cml0eScsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9yZW1vdGVzZWNyZXQgfHwgJ3JlbW90ZXNlY3JldD1wYXNzd29yZCAtIFJlbW90ZSBhdXRoZW50aWNhdGlvbidcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIgfHwgJ0ltcG9ydGFudCcsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nIHx8ICdJbmNvcnJlY3QgcGFyYW1ldGVycyBtYXkgcHJldmVudCBjYWxscyBmcm9tIHdvcmtpbmcuIFVzZSBvbmx5IHBhcmFtZXRlcnMgcmVxdWlyZWQgYnkgeW91ciBwcm92aWRlci4nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICAgICAnbWF4ZGF0YWdyYW09MTUwMCcsXG4gICAgICAgICAgICAgICAgICAgICdzZXNzaW9uLXRpbWVycz1hY2NlcHQnLFxuICAgICAgICAgICAgICAgICAgICAnc2Vzc2lvbi1leHBpcmVzPTE4MDAnLFxuICAgICAgICAgICAgICAgICAgICAnZGlyZWN0bWVkaWE9bm8nLFxuICAgICAgICAgICAgICAgICAgICAnYWxsb3c9ZzcyOSxhbGF3LHVsYXcnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlciB8fCAnRXhhbXBsZSBjb25maWd1cmF0aW9uJyxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfbm90ZSB8fCAnT25lIHBhcmFtZXRlciBwZXIgbGluZS4gQ29udGFjdCB5b3VyIHByb3ZpZGVyIGZvciBzcGVjaWZpYyByZXF1aXJlbWVudHMuJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSBlbHNlIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdJQVgnKSB7XG4gICAgICAgICAgICAvLyBJQVgtc3BlY2lmaWMgdG9vbHRpcHNcbiAgICAgICAgICAgIHRvb2x0aXBDb25maWdzWydyZWdpc3RyYXRpb25fdHlwZSddID0gcHJvdmlkZXIuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2hlYWRlciB8fCAnUmVnaXN0cmF0aW9uIFR5cGUnLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCB8fCAnT3V0Ym91bmQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjIHx8ICdQQlggcmVnaXN0ZXJzIHRvIElBWCBwcm92aWRlcidcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kIHx8ICdJbmJvdW5kJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjIHx8ICdQcm92aWRlciByZWdpc3RlcnMgdG8gUEJYJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmUgfHwgJ1BlZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lX2Rlc2MgfHwgJ1N0YXRpYyBwZWVyLXRvLXBlZXIgY29ubmVjdGlvbidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0b29sdGlwQ29uZmlnc1sncHJvdmlkZXJfaG9zdCddID0gcHJvdmlkZXIuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyIHx8ICdJQVggSG9zdCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjIHx8ICdFbnRlciB0aGUgaG9zdG5hbWUgb3IgSVAgYWRkcmVzcyBvZiB5b3VyIElBWCBwcm92aWRlcicsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfbm90ZSB8fCAnSUFYIHVzZXMgcG9ydCA0NTY5IGJ5IGRlZmF1bHQnXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1hbnVhbCBhdHRyaWJ1dGVzIHRvb2x0aXAgZm9yIElBWFxuICAgICAgICAgICAgdG9vbHRpcENvbmZpZ3NbJ21hbnVhbF9hdHRyaWJ1dGVzJ10gPSBwcm92aWRlci5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyIHx8ICdBZGRpdGlvbmFsIElBWCBQYXJhbWV0ZXJzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kZXNjIHx8ICdBZHZhbmNlZCBJQVgyIGNoYW5uZWwgY29uZmlndXJhdGlvbiBwYXJhbWV0ZXJzJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29tbW9uX2hlYWRlciB8fCAnQ29tbW9uIElBWCBQYXJhbWV0ZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90cnVuayB8fCAndHJ1bms9eWVzIC0gRW5hYmxlIElBWDIgdHJ1bmtpbmcnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2ppdHRlcmJ1ZmZlciB8fCAnaml0dGVyYnVmZmVyPXllcyAtIEVuYWJsZSBqaXR0ZXIgYnVmZmVyJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JjZWppdHRlcmJ1ZmZlciB8fCAnZm9yY2VqaXR0ZXJidWZmZXI9eWVzIC0gRm9yY2Ugaml0dGVyIGJ1ZmZlcicsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfbWF4aml0dGVyYnVmZmVyIHx8ICdtYXhqaXR0ZXJidWZmZXI9NDAwIC0gTWF4aW11bSBqaXR0ZXIgYnVmZmVyIHNpemUnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2JhbmR3aWR0aCB8fCAnYmFuZHdpZHRoPWxvdyAtIEJhbmR3aWR0aCBvcHRpbWl6YXRpb24nXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvZGVjc19oZWFkZXIgfHwgJ0lBWCBDb2RlYyBTZXR0aW5ncycsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfYWxsb3cgfHwgJ2FsbG93PWc3MjksZ3NtLGFsYXcsdWxhdyAtIEFsbG93ZWQgY29kZWNzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXNhbGxvdyB8fCAnZGlzYWxsb3c9YWxsIC0gRGlzYWxsb3cgYWxsIGNvZGVjcyBmaXJzdCcsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29kZWNwcmlvcml0eSB8fCAnY29kZWNwcmlvcml0eT1ob3N0IC0gQ29kZWMgcHJpb3JpdHknXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nX2hlYWRlciB8fCAnSW1wb3J0YW50JyxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nIHx8ICdJbmNvcnJlY3QgcGFyYW1ldGVycyBtYXkgcHJldmVudCBJQVggY2FsbHMgZnJvbSB3b3JraW5nLiBDb25zdWx0IHlvdXIgcHJvdmlkZXIgZG9jdW1lbnRhdGlvbi4nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICAgICAndHJ1bms9eWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2ppdHRlcmJ1ZmZlcj15ZXMnLFxuICAgICAgICAgICAgICAgICAgICAnZm9yY2VqaXR0ZXJidWZmZXI9eWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2FsbG93PWc3MjksYWxhdyx1bGF3JyxcbiAgICAgICAgICAgICAgICAgICAgJ2JhbmR3aWR0aD1sb3cnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXIgfHwgJ0V4YW1wbGUgSUFYIGNvbmZpZ3VyYXRpb24nLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfbm90ZSB8fCAnT25lIHBhcmFtZXRlciBwZXIgbGluZS4gSUFYMiBwYXJhbWV0ZXJzIGFyZSBkaWZmZXJlbnQgZnJvbSBTSVAgcGFyYW1ldGVycy4nXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZWFjaCBmaWVsZCB3aXRoIGluZm8gaWNvblxuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoXywgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0b29sdGlwQ29uZmlnc1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBzIGZyb20gc3RydWN0dXJlZCBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gVG9vbHRpcCBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdG9vbHRpcFxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQodG9vbHRpcERhdGEpIHtcbiAgICAgICAgaWYgKCF0b29sdGlwRGF0YSkgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWFkZXIgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48c3Ryb25nPiR7dG9vbHRpcERhdGEuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvbiBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke3Rvb2x0aXBEYXRhLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gYnVpbGQgbGlzdCBIVE1MXG4gICAgICAgIGNvbnN0IGJ1aWxkTGlzdCA9IChsaXN0KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWxpc3QgfHwgbGlzdC5sZW5ndGggPT09IDApIHJldHVybiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGxpc3RIdG1sID0gJzx1bCBzdHlsZT1cIm1hcmdpbjogMC41ZW0gMDsgcGFkZGluZy1sZWZ0OiAxLjVlbTtcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaW1wbGUgbGlzdCBpdGVtXG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICBsaXN0SHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWwgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7IHBhZGRpbmctbGVmdDogMS41ZW07XCI+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGVybSB3aXRoIGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsaXN0SHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgcmV0dXJuIGxpc3RIdG1sO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG1haW4gbGlzdCBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmxpc3QgJiYgdG9vbHRpcERhdGEubGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IGJ1aWxkTGlzdCh0b29sdGlwRGF0YS5saXN0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyIHRocm91Z2ggbGlzdDEwKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0S2V5ID0gYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YVtsaXN0S2V5XSAmJiB0b29sdGlwRGF0YVtsaXN0S2V5XS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBidWlsZExpc3QodG9vbHRpcERhdGFbbGlzdEtleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgd2FybmluZyBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIiBzdHlsZT1cIm1hcmdpbjogMC41ZW0gMDtcIj4nO1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dG9vbHRpcERhdGEud2FybmluZy5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nLnRleHQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8cD4ke3Rvb2x0aXBEYXRhLndhcm5pbmcudGV4dH08L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBleGFtcGxlcyBpZiBleGlzdFxuICAgICAgICBpZiAodG9vbHRpcERhdGEuZXhhbXBsZXMgJiYgdG9vbHRpcERhdGEuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke3Rvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOGY4OyBib3JkZXI6IDFweCBzb2xpZCAjZTBlMGUwO1wiPic7XG4gICAgICAgICAgICBodG1sICs9ICc8cHJlIHN0eWxlPVwibWFyZ2luOiAwOyBmb250LXNpemU6IDAuOWVtOyBsaW5lLWhlaWdodDogMS40ZW07XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdG9vbHRpcERhdGEuZXhhbXBsZXMuZm9yRWFjaCgobGluZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobGluZS50cmltKCkuc3RhcnRzV2l0aCgnWycpICYmIGxpbmUudHJpbSgpLmVuZHNXaXRoKCddJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VjdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID4gMCkgaHRtbCArPSAnXFxuJztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzAwODRiNDsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JHtsaW5lfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGluZS5pbmNsdWRlcygnPScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhcmFtZXRlciBsaW5lXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IFtwYXJhbSwgdmFsdWVdID0gbGluZS5zcGxpdCgnPScsIDIpO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGBcXG48c3BhbiBzdHlsZT1cImNvbG9yOiAjN2EzZTlkO1wiPiR7cGFyYW19PC9zcGFuPj08c3BhbiBzdHlsZT1cImNvbG9yOiAjY2Y0YTRjO1wiPiR7dmFsdWV9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVndWxhciBsaW5lXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gbGluZSA/IGBcXG4ke2xpbmV9YCA6ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9ICc8L3ByZT4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5vdGUgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48ZW0+JHt0b29sdGlwRGF0YS5ub3RlfTwvZW0+PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdXRvLXJlc2l6ZSBmb3IgdGV4dGFyZWEgZmllbGRzIChtYW51YWxhdHRyaWJ1dGVzIGFuZCBub3RlKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVBdXRvUmVzaXplVGV4dGFyZWFzKCkge1xuICAgICAgICAvLyBTZXR1cCBhdXRvLXJlc2l6ZSBmb3IgbWFudWFsYXR0cmlidXRlcyB0ZXh0YXJlYVxuICAgICAgICBjb25zdCAkbWFudWFsYXR0cmlidXRlc1RleHRhcmVhID0gJCgndGV4dGFyZWFbbmFtZT1cIm1hbnVhbGF0dHJpYnV0ZXNcIl0nKTtcbiAgICAgICAgaWYgKCRtYW51YWxhdHRyaWJ1dGVzVGV4dGFyZWEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gSW5pdGlhbCByZXNpemVcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkbWFudWFsYXR0cmlidXRlc1RleHRhcmVhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGV2ZW50IGhhbmRsZXJzIGZvciBkeW5hbWljIHJlc2l6ZVxuICAgICAgICAgICAgJG1hbnVhbGF0dHJpYnV0ZXNUZXh0YXJlYS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIG5vdGUgdGV4dGFyZWEgIFxuICAgICAgICBjb25zdCAkbm90ZVRleHRhcmVhID0gJCgndGV4dGFyZWFbbmFtZT1cIm5vdGVcIl0nKTtcbiAgICAgICAgaWYgKCRub3RlVGV4dGFyZWEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gSW5pdGlhbCByZXNpemVcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkbm90ZVRleHRhcmVhKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGV2ZW50IGhhbmRsZXJzIGZvciBkeW5hbWljIHJlc2l6ZVxuICAgICAgICAgICAgJG5vdGVUZXh0YXJlYS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWxzbyB0cmlnZ2VyIHJlc2l6ZSBhZnRlciBkYXRhIGlzIGxvYWRlZCAod2l0aCBzbGlnaHQgZGVsYXkgZm9yIERPTSB1cGRhdGVzKVxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkbWFudWFsYXR0cmlidXRlc1RleHRhcmVhKTtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkbm90ZVRleHRhcmVhKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gRE9NIGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xufSk7Il19