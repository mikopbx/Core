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

    provider.updateValidationRules(registrationType); // Initialize Form object using REST API

    Form.$formObj = provider.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = provider.validationRules;
    Form.cbBeforeSendForm = provider.cbBeforeSendForm;
    Form.cbAfterSendForm = provider.cbAfterSendForm; // Configure REST API settings

    Form.apiSettings = {
      enabled: true,
      apiObject: ProvidersAPI,
      saveMethod: 'saveRecord'
    }; // Navigation URLs

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
      provider.populateForm(response.data); // The Form.js will handle the reload automatically if response.reload is present
      // For new records, REST API returns reload path like "providers/modifysip/SIP-TRUNK-xxx"
      // This will be handled by Form.js in handleSubmitResponse method
      // If no reload path, update URL manually for new records

      if (!response.reload) {
        var currentId = $('#uniqid').val();

        if (!currentId && response.data.uniqid) {
          var newUrl = window.location.href.replace(/modify\w*\/?$/, 'modify' + provider.providerType.toLowerCase() + '/' + response.data.uniqid);
          window.history.pushState(null, '', newUrl);
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVyIiwiJGZvcm1PYmoiLCIkIiwicHJvdmlkZXJJZCIsInByb3ZpZGVyVHlwZSIsIiRzZWNyZXQiLCIkYWRkaXRpb25hbEhvc3RzRHVtbXkiLCIkY2hlY2tCb3hlcyIsIiRhY2NvcmRpb25zIiwiJGRyb3BEb3ducyIsIiRkZWxldGVSb3dCdXR0b24iLCIkcXVhbGlmeVRvZ2dsZSIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdElucHV0IiwiJG5ldHdvcmtGaWx0ZXJEcm9wZG93biIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJob3N0Um93IiwidmFsaWRhdGlvblJ1bGVzIiwiaW5pdGlhbGl6ZSIsImZpbmQiLCJ2YWwiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMiLCJsb2FkUHJvdmlkZXJEYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJQcm92aWRlcnNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJwb3B1bGF0ZUZvcm0iLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJrZXkiLCJ2YWx1ZSIsIiRmaWVsZCIsImxlbmd0aCIsImlzIiwiaXNDaGVja2VkIiwicHJvcCIsIiRjaGVja2JveCIsInBhcmVudCIsImNoZWNrYm94IiwiZHJvcGRvd24iLCJhZGRpdGlvbmFsSG9zdHMiLCJwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyIsInRyaWdnZXIiLCJob3N0cyIsIiR0Ym9keSIsImhvc3QiLCJhZGRyZXNzIiwiJG5ld1JvdyIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJzaG93IiwiYXBwZW5kIiwiYWNjb3JkaW9uIiwiaW5pdGlhbGl6ZVBhc3N3b3JkVG9nZ2xlIiwiaW5pdGlhbGl6ZVBhc3N3b3JkR2VuZXJhdG9yIiwiaW5pdGlhbGl6ZUNsaXBib2FyZCIsImluaXRpYWxpemVRdWFsaWZ5VG9nZ2xlIiwiaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMiLCJwb3B1cCIsImluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd25fT0xEIiwiJHJlZ2lzdHJhdGlvblR5cGVGaWVsZCIsImN1cnJlbnRWYWx1ZSIsInRyYW5zbGF0aW9uUHJlZml4IiwiZHJvcGRvd25IdG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwidG9VcHBlckNhc2UiLCJyZXBsYWNlV2l0aCIsIm9uQ2hhbmdlIiwiaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd25fT0xEIiwiJGR0bWZNb2RlRmllbGQiLCJkdG1mT3B0aW9ucyIsInRleHQiLCJhdXRvIiwiaW5iYW5kIiwiaW5mbyIsInJmYzQ3MzMiLCJhdXRvX2luZm8iLCJvcHQiLCJvcHRpb24iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJvbiIsImNiQ2hhbmdlUmVnaXN0cmF0aW9uVHlwZSIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwiY2JEZWxldGVBZGRpdGlvbmFsSG9zdCIsImUiLCJ3aGljaCIsIiRmcm9tVXNlciIsImhpZGUiLCJhZGRDbGFzcyIsInVwZGF0ZVdhcm5pbmdTdGF0ZSIsIiRjaGVja2JveElucHV0IiwiJHdhcm5pbmdNZXNzYWdlIiwibmV4dCIsIm9uQ2hlY2tlZCIsInRyYW5zaXRpb24iLCJpc1ZhbGlkIiwiZm9ybSIsIm9uVW5jaGVja2VkIiwicmVnaXN0cmF0aW9uVHlwZSIsInVwZGF0ZUZpZWxkVmlzaWJpbGl0eSIsInVwZGF0ZVZhbGlkYXRpb25SdWxlcyIsInVybCIsInZhbGlkYXRlUnVsZXMiLCJjYkJlZm9yZVNlbmRGb3JtIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplQXV0b1Jlc2l6ZVRleHRhcmVhcyIsImJhc2VSdWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInNlY3JldCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0UmFuZ2UiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0Iiwic2V0dGluZ3MiLCJib29sZWFuRmllbGRzIiwiZmllbGQiLCJoYXNPd25Qcm9wZXJ0eSIsImVhY2giLCJwdXNoIiwidmFsaWRhdGVQcm92aWRlckRhdGEiLCJzaG93RXJyb3IiLCJyZWxvYWQiLCJjdXJyZW50SWQiLCJ1bmlxaWQiLCJuZXdVcmwiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhyZWYiLCJyZXBsYWNlIiwidG9Mb3dlckNhc2UiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwicmVtb3ZlIiwic2V0VGltZW91dCIsIiRlbEhvc3QiLCIkZWxVc2VybmFtZSIsIiRlbFNlY3JldCIsIiRlbFBvcnQiLCIkZWxSZWNlaXZlQ2FsbHMiLCIkZWxBZGRpdGlvbmFsSG9zdCIsIiR2YWxVc2VyTmFtZSIsIiR2YWxTZWNyZXQiLCIkZWxVbmlxSWQiLCIkZ2VuUGFzc3dvcmQiLCIkY29weUJ1dHRvbiIsIiRzaG93SGlkZUJ1dHRvbiIsIiRsYWJlbEhvc3QiLCIkbGFiZWxQb3J0IiwiJGxhYmVsVXNlcm5hbWUiLCIkbGFiZWxTZWNyZXQiLCJyZW1vdmVBdHRyIiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9Qcm92aWRlclBvcnQiLCJwcl9Qcm92aWRlckxvZ2luIiwicHJfUHJvdmlkZXJQYXNzd29yZCIsImF0dHIiLCJ0cmltIiwicHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSIsInByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQiLCJjbG9zZXN0IiwicHJfUGVlckhvc3RPcklQQWRkcmVzcyIsInByX1BlZXJQb3J0IiwiJGVsIiwiJHZhbFBvcnQiLCIkdmFsUXVhbGlmeSIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsInByX1BlZXJVc2VybmFtZSIsInByX1BlZXJQYXNzd29yZCIsInRlc3QiLCJkdXBsaWNhdGUiLCJwcmV2ZW50RGVmYXVsdCIsInRhcmdldCIsImNoYXJzIiwicGFzc3dvcmQiLCJpIiwiY2hhckF0IiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJjb250ZW50IiwicHJfUGFzc3dvcmRDb3BpZWQiLCJwb3NpdGlvbiIsImluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24iLCJkcm9wZG93blNldHRpbmdzIiwiTmV0d29ya0ZpbHRlcnNBUEkiLCJnZXREcm9wZG93blNldHRpbmdzIiwidG9vbHRpcENvbmZpZ3MiLCJidWlsZFRvb2x0aXBDb250ZW50IiwiaGVhZGVyIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaGVhZGVyIiwibGlzdCIsInRlcm0iLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCIsImRlZmluaXRpb24iLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZCIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmRfZGVzYyIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmUiLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lX2Rlc2MiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlciIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyIsInByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0cyIsImxpc3QyIiwicHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfaXAiLCJwcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW4iLCJwcl9BZGRpdGlvbmFsSG9zdHNUb29sdGlwX2hlYWRlciIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfZGVzYyIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9pZCIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9tdWx0aSIsInByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9zZWN1cml0eSIsInByX1NJUFBvcnRUb29sdGlwX2hlYWRlciIsInByX1NJUFBvcnRUb29sdGlwX2Rlc2MiLCJwcl9TSVBQb3J0VG9vbHRpcF9wb3J0XzUwNjBfZGVzYyIsInByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MV9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX2hlYWRlciIsInByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3VkcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3RjcF9kZXNjIiwicHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX3Rsc19kZXNjIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfaGVhZGVyIiwicHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZGVzYyIsInByX091dGJvdW5kUHJveHlUb29sdGlwX2Zvcm1hdCIsInByX0RUTUZNb2RlVG9vbHRpcF9oZWFkZXIiLCJwcl9EVE1GTW9kZVRvb2x0aXBfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2Rlc2MiLCJwcl9EVE1GTW9kZVRvb2x0aXBfcmZjNDczM19kZXNjIiwicHJfRFRNRk1vZGVUb29sdGlwX2luZm9fZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9pbmJhbmRfZGVzYyIsInByX0RUTUZNb2RlVG9vbHRpcF9hdXRvX2luZm9fZGVzYyIsIm5vdGUiLCJwcl9EVE1GTW9kZVRvb2x0aXBfbm90ZSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25faGVhZGVyIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfbWF4ZGF0YWdyYW0iLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9zZXNzaW9uX3RpbWVycyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3Nlc3Npb25fZXhwaXJlcyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3Nlc3Npb25fbWluc2UiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90MzhwdCIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvZGVjc19oZWFkZXIiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9hbGxvdyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rpc2FsbG93IiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfdmlkZW9zdXBwb3J0IiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfbWF4Y2FsbGJpdHJhdGUiLCJsaXN0MyIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX25hdF9oZWFkZXIiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kaXJlY3RtZWRpYSIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NhbnJlaW52aXRlIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaW5zZWN1cmUiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9yZW1vdGVzZWNyZXQiLCJ3YXJuaW5nIiwicHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJwcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nIiwiZXhhbXBsZXMiLCJleGFtcGxlc0hlYWRlciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsInByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX25vdGUiLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaGVhZGVyIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZCIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kX2Rlc2MiLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZSIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lX2Rlc2MiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfbm90ZSIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXIiLCJpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYyIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25faGVhZGVyIiwiaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3RydW5rIiwiaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2ppdHRlcmJ1ZmZlciIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JjZWppdHRlcmJ1ZmZlciIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9tYXhqaXR0ZXJidWZmZXIiLCJpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfYmFuZHdpZHRoIiwiaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvZGVjc19oZWFkZXIiLCJpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfYWxsb3ciLCJpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlzYWxsb3ciLCJpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29kZWNwcmlvcml0eSIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nIiwiaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9ub3RlIiwiXyIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImh0bWwiLCJob3ZlcmFibGUiLCJkZWxheSIsInZhcmlhdGlvbiIsInRvb2x0aXBEYXRhIiwiYnVpbGRMaXN0IiwibGlzdEh0bWwiLCJpdGVtIiwibGlzdEtleSIsImxpbmUiLCJpbmRleCIsInN0YXJ0c1dpdGgiLCJlbmRzV2l0aCIsImluY2x1ZGVzIiwic3BsaXQiLCJwYXJhbSIsIiRtYW51YWxhdHRyaWJ1dGVzVGV4dGFyZWEiLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsIiRub3RlVGV4dGFyZWEiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUViO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHFCQUFELENBTkU7O0FBUWI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxFQVhDOztBQWFiO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsRUFoQkQ7O0FBa0JiO0FBQ0o7QUFDQTtBQUNJQyxFQUFB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QTNCLEVBQThCO0FBQzFCO0FBQ0FtUyxNQUFBQSxZQUFZLENBQUNDLG9CQUFiLENBQWtDQyxhQUFsQyxFQUYwQixDQUkxQjs7QUFDQUEsTUFBQUEsYUFBYSxDQUFDcFAsRUFBZCxDQUFpQixtQkFBakIsRUFBc0MsWUFBVztBQUM3Q2tQLFFBQUFBLFlBQVksQ0FBQ0Msb0JBQWIsQ0FBa0MzVSxDQUFDLENBQUMsSUFBRCxDQUFuQztBQUNILE9BRkQ7QUFHSCxLQXZCMkIsQ0F5QjVCOzs7QUFDQTZKLElBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2I2SyxNQUFBQSxZQUFZLENBQUNDLG9CQUFiLENBQWtDRix5QkFBbEM7QUFDQUMsTUFBQUEsWUFBWSxDQUFDQyxvQkFBYixDQUFrQ0MsYUFBbEM7QUFDSCxLQUhTLEVBR1AsR0FITyxDQUFWO0FBSUg7QUFuOENZLENBQWpCLEMsQ0FzOENBOztBQUNBNVUsQ0FBQyxDQUFDNlUsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmhWLEVBQUFBLFFBQVEsQ0FBQ21CLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJzQVBJLCBVc2VyTWVzc2FnZSwgQ2xpcGJvYXJkSlMsIE5ldHdvcmtGaWx0ZXJzQVBJLCBGb3JtRWxlbWVudHMgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIGhhbmRsaW5nIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybSB3aXRoIFJFU1QgQVBJIHYyXG4gKlxuICogQG1vZHVsZSBwcm92aWRlclxuICovXG5jb25zdCBwcm92aWRlciA9IHsgXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBQcm92aWRlciB1bmlxdWUgSURcbiAgICAgKi9cbiAgICBwcm92aWRlcklkOiAnJyxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm92aWRlciB0eXBlIChTSVAgb3IgSUFYKVxuICAgICAqL1xuICAgIHByb3ZpZGVyVHlwZTogJycsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0c1xuICAgICAqL1xuICAgICRzZWNyZXQ6ICQoJyNzZWNyZXQnKSxcbiAgICAkYWRkaXRpb25hbEhvc3RzRHVtbXk6ICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5kdW1teScpLFxuICAgICRjaGVja0JveGVzOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC5jaGVja2JveCcpLFxuICAgICRhY2NvcmRpb25zOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC51aS5hY2NvcmRpb24nKSxcbiAgICAkZHJvcERvd25zOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtIC51aS5kcm9wZG93bicpLFxuICAgICRkZWxldGVSb3dCdXR0b246ICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5kZWxldGUtcm93LWJ1dHRvbicpLFxuICAgICRxdWFsaWZ5VG9nZ2xlOiAkKCcjcXVhbGlmeScpLFxuICAgICRxdWFsaWZ5RnJlcVRvZ2dsZTogJCgnI3F1YWxpZnktZnJlcScpLFxuICAgICRhZGRpdGlvbmFsSG9zdElucHV0OiAkKCcjYWRkaXRpb25hbC1ob3N0IGlucHV0JyksXG4gICAgJG5ldHdvcmtGaWx0ZXJEcm9wZG93bjogJCgnI25ldHdvcmtmaWx0ZXJpZCcpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhvc3QgdmFsaWRhdGlvbiByZWdleFxuICAgICAqL1xuICAgIGhvc3RJbnB1dFZhbGlkYXRpb246IG5ldyBSZWdFeHAoXG4gICAgICAgICdeKCgoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSlcXFxcLil7M30nXG4gICAgICAgICsgJyhcXFxcZHxbMS05XVxcXFxkfDFcXFxcZHsyfXwyWzAtNF1cXFxcZHwyNVswLTVdKSdcbiAgICAgICAgKyAnKFxcXFwvKFxcZHxbMS0yXVxcZHwzWzAtMl0pKT8nXG4gICAgICAgICsgJ3xbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSg/OlxcXFwuW2EtekEtWl17Mix9KSspJCcsXG4gICAgICAgICdnbSdcbiAgICApLFxuICAgIFxuICAgIGhvc3RSb3c6ICcjc2F2ZS1wcm92aWRlci1mb3JtIC5ob3N0LXJvdycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgdmFsaWRhdGlvblJ1bGVzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIG1vZGlmeSBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEdldCBwcm92aWRlciBJRCBhbmQgdHlwZSBmcm9tIHBhZ2UgdXNpbmcgalF1ZXJ5IHZhbCgpIGluc3RlYWQgb2YgZm9ybSgnZ2V0IHZhbHVlJylcbiAgICAgICAgLy8gdG8gYXZvaWQgU2VtYW50aWMgVUkgd2FybmluZyBhYm91dCBvbGQgc3ludGF4XG4gICAgICAgIHByb3ZpZGVyLnByb3ZpZGVySWQgPSBwcm92aWRlci4kZm9ybU9iai5maW5kKCdbbmFtZT1cInVuaXFpZFwiXScpLnZhbCgpO1xuICAgICAgICBwcm92aWRlci5wcm92aWRlclR5cGUgPSAkKCcjcHJvdmlkZXJUeXBlJykudmFsKCkgfHwgJ1NJUCc7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFVJIGNvbXBvbmVudHMgRklSU1QgKGJlZm9yZSBsb2FkaW5nIGRhdGEpXG4gICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldHVwIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIHByb3ZpZGVyIGRhdGEgZnJvbSBSRVNUIEFQSSBpZiBlZGl0aW5nXG4gICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlcklkKSB7XG4gICAgICAgICAgICBwcm92aWRlci5sb2FkUHJvdmlkZXJEYXRhKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOZXcgcHJvdmlkZXIgLSBpbml0aWFsaXplIHdpdGggZGVmYXVsdHNcbiAgICAgICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcHJvdmlkZXIgZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZFByb3ZpZGVyRGF0YSgpIHtcbiAgICAgICAgUHJvdmlkZXJzQVBJLmdldFJlY29yZChwcm92aWRlci5wcm92aWRlcklkLCBwcm92aWRlci5wcm92aWRlclR5cGUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXIucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIHByb3ZpZGVyIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXNcbiAgICAgICAgT2JqZWN0LmtleXMoZGF0YSkuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGFba2V5XTtcbiAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9IHByb3ZpZGVyLiRmb3JtT2JqLmZpbmQoYFtuYW1lPVwiJHtrZXl9XCJdYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaXMoJzpjaGVja2JveCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBib29sZWFuIHZhbHVlcyBwcm9wZXJseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSB2YWx1ZSA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gJ3RydWUnIHx8IHZhbHVlID09PSAnMScgfHwgdmFsdWUgPT09IDE7XG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC5wcm9wKCdjaGVja2VkJywgaXNDaGVja2VkKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBTZW1hbnRpYyBVSSBjaGVja2JveFxuICAgICAgICAgICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkZmllbGQucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkY2hlY2tib3guY2hlY2tib3goaXNDaGVja2VkID8gJ3NldCBjaGVja2VkJyA6ICdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5pcygnc2VsZWN0JykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCByZWd1bGFyIGlucHV0IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICRmaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgYWRkaXRpb25hbCBob3N0cyBmb3IgU0lQXG4gICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdTSVAnICYmIGRhdGEuYWRkaXRpb25hbEhvc3RzKSB7XG4gICAgICAgICAgICBwcm92aWRlci5wb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyhkYXRhLmFkZGl0aW9uYWxIb3N0cyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50cyB0byB1cGRhdGUgZm9ybSBzdGF0ZVxuICAgICAgICBwcm92aWRlci4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgYWRkaXRpb25hbCBob3N0cyB0YWJsZVxuICAgICAqL1xuICAgIHBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGhvc3RzKSB7XG4gICAgICAgIGNvbnN0ICR0Ym9keSA9ICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRib2R5Jyk7XG4gICAgICAgIFxuICAgICAgICBob3N0cy5mb3JFYWNoKChob3N0KSA9PiB7XG4gICAgICAgICAgICBpZiAoaG9zdC5hZGRyZXNzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJG5ld1JvdyA9IHByb3ZpZGVyLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5jbG9uZSgpO1xuICAgICAgICAgICAgICAgICRuZXdSb3cucmVtb3ZlQ2xhc3MoJ2R1bW15Jyk7XG4gICAgICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCdpbnB1dCcpLnZhbChob3N0LmFkZHJlc3MpO1xuICAgICAgICAgICAgICAgICRuZXdSb3cuc2hvdygpO1xuICAgICAgICAgICAgICAgICR0Ym9keS5hcHBlbmQoJG5ld1Jvdyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBjb21wb25lbnRzXG4gICAgICAgIHByb3ZpZGVyLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgICAgIHByb3ZpZGVyLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBwcm92aWRlci4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBCYXNlIGNsYXNzIGFscmVhZHkgaW5pdGlhbGl6ZXMgdGhlc2UgZHJvcGRvd25zXG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHZpc2liaWxpdHkgdG9nZ2xlXG4gICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVQYXNzd29yZFRvZ2dsZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCBnZW5lcmF0b3JcbiAgICAgICAgcHJvdmlkZXIuaW5pdGlhbGl6ZVBhc3N3b3JkR2VuZXJhdG9yKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZFxuICAgICAgICBwcm92aWRlci5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHF1YWxpZnkgdG9nZ2xlXG4gICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVRdWFsaWZ5VG9nZ2xlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZpZWxkIHRvb2x0aXBzXG4gICAgICAgIHByb3ZpZGVyLmluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwZWQgYnV0dG9uc1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGRyb3Bkb3duIC0gREVQUkVDQVRFRFxuICAgICAqIFRoaXMgbWV0aG9kIGlzIG5vdyBpbiBwcm92aWRlci1iYXNlLW1vZGlmeS5qc1xuICAgICAqIEBkZXByZWNhdGVkIFVzZSBiYXNlIGNsYXNzIG1ldGhvZCBpbnN0ZWFkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bl9PTEQoKSB7XG4gICAgICAgIGNvbnN0ICRyZWdpc3RyYXRpb25UeXBlRmllbGQgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKTtcbiAgICAgICAgaWYgKCRyZWdpc3RyYXRpb25UeXBlRmllbGQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlIGZyb20gaGlkZGVuIGZpZWxkXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRyZWdpc3RyYXRpb25UeXBlRmllbGQudmFsKCkgfHwgJ291dGJvdW5kJztcbiAgICAgICAgXG4gICAgICAgIC8vIERldGVybWluZSB0cmFuc2xhdGlvbiBrZXlzIGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgY29uc3QgdHJhbnNsYXRpb25QcmVmaXggPSBwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdJQVgnID8gJ2lheF8nIDogJ3NpcF8nO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIEhUTUxcbiAgICAgICAgY29uc3QgZHJvcGRvd25IdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93blwiIGlkPVwicmVnaXN0cmF0aW9uX3R5cGVfZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwicmVnaXN0cmF0aW9uX3R5cGVcIiBuYW1lPVwicmVnaXN0cmF0aW9uX3R5cGVcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRpb25QcmVmaXggKyAnUkVHX1RZUEVfJyArIGN1cnJlbnRWYWx1ZS50b1VwcGVyQ2FzZSgpXSB8fCBjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwib3V0Ym91bmRcIj4ke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGlvblByZWZpeCArICdSRUdfVFlQRV9PVVRCT1VORCddIHx8ICdPdXRib3VuZCByZWdpc3RyYXRpb24nfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCJpbmJvdW5kXCI+JHtnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRpb25QcmVmaXggKyAnUkVHX1RZUEVfSU5CT1VORCddIHx8ICdJbmJvdW5kIHJlZ2lzdHJhdGlvbid9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIm5vbmVcIj4ke2dsb2JhbFRyYW5zbGF0ZVt0cmFuc2xhdGlvblByZWZpeCArICdSRUdfVFlQRV9OT05FJ10gfHwgJ05vIHJlZ2lzdHJhdGlvbid9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcGxhY2UgaGlkZGVuIGZpZWxkIHdpdGggZHJvcGRvd25cbiAgICAgICAgJHJlZ2lzdHJhdGlvblR5cGVGaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZHJvcGRvd25cbiAgICAgICAgJCgnI3JlZ2lzdHJhdGlvbl90eXBlX2Ryb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9uIHRoZSBoaWRkZW4gaW5wdXRcbiAgICAgICAgICAgICAgICAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgaW5pdGlhbCB2YWx1ZVxuICAgICAgICAkKCcjcmVnaXN0cmF0aW9uX3R5cGVfZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRFRNRiBtb2RlIGRyb3Bkb3duIC0gREVQUkVDQVRFRFxuICAgICAqIFRoaXMgbWV0aG9kIGlzIG5vdyBpbiBwcm92aWRlci1iYXNlLW1vZGlmeS5qc1xuICAgICAqIEBkZXByZWNhdGVkIFVzZSBiYXNlIGNsYXNzIG1ldGhvZCBpbnN0ZWFkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd25fT0xEKCkge1xuICAgICAgICBjb25zdCAkZHRtZk1vZGVGaWVsZCA9ICQoJyNkdG1mbW9kZScpO1xuICAgICAgICBpZiAoJGR0bWZNb2RlRmllbGQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlIGZyb20gaGlkZGVuIGZpZWxkXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRkdG1mTW9kZUZpZWxkLnZhbCgpIHx8ICdhdXRvJztcbiAgICAgICAgXG4gICAgICAgIC8vIERUTUYgbW9kZSBvcHRpb25zIChzYW1lIGFzIGluIEV4dGVuc2lvbkVkaXRGb3JtLnBocClcbiAgICAgICAgY29uc3QgZHRtZk9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFsdWU6ICdhdXRvJyxcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuYXV0byB8fCAnQXV0bydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFsdWU6ICdpbmJhbmQnLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pbmJhbmQgfHwgJ0luYmFuZCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmFsdWU6ICdpbmZvJyxcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuaW5mbyB8fCAnU0lQIElORk8nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhbHVlOiAncmZjNDczMycsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnJmYzQ3MzMgfHwgJ1JGQyA0NzMzJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ2F1dG9faW5mbycsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmF1dG9faW5mbyB8fCAnQXV0byArIFNJUCBJTkZPJ1xuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIEhUTUxcbiAgICAgICAgbGV0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInVpIHNlbGVjdGlvbiBkcm9wZG93blxcXCIgaWQ9XFxcImR0bWZtb2RlX2Ryb3Bkb3duXFxcIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiaGlkZGVuXFxcIiBpZD1cXFwiZHRtZm1vZGVcXFwiIG5hbWU9XFxcImR0bWZtb2RlXFxcIiB2YWx1ZT1cXFwiJHtjdXJyZW50VmFsdWV9XFxcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cXFwiZHJvcGRvd24gaWNvblxcXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRlZmF1bHQgdGV4dFxcXCI+JHtkdG1mT3B0aW9ucy5maW5kKG9wdCA9PiBvcHQudmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk/LnRleHQgfHwgY3VycmVudFZhbHVlfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1lbnVcXFwiPmA7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgb3B0aW9ucyB0byBkcm9wZG93blxuICAgICAgICBkdG1mT3B0aW9ucy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICAgICAgICBkcm9wZG93bkh0bWwgKz0gYDxkaXYgY2xhc3M9XFxcIml0ZW1cXFwiIGRhdGEtdmFsdWU9XFxcIiR7b3B0aW9uLnZhbHVlfVxcXCI+JHtvcHRpb24udGV4dH08L2Rpdj5gO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGRyb3Bkb3duSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcGxhY2UgaGlkZGVuIGZpZWxkIHdpdGggZHJvcGRvd25cbiAgICAgICAgJGR0bWZNb2RlRmllbGQucmVwbGFjZVdpdGgoZHJvcGRvd25IdG1sKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRyb3Bkb3duXG4gICAgICAgICQoJyNkdG1mbW9kZV9kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCBvbiB0aGUgaGlkZGVuIGlucHV0IGZvciBhbnkgdmFsaWRhdGlvbiBsb2dpY1xuICAgICAgICAgICAgICAgICQoJyNkdG1mbW9kZScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBpbml0aWFsIHZhbHVlXG4gICAgICAgICQoJyNkdG1mbW9kZV9kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBjdXJyZW50VmFsdWUpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBSZWdpc3RyYXRpb24gdHlwZSBjaGFuZ2UgaGFuZGxlclxuICAgICAgICAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS5vbignY2hhbmdlJywgcHJvdmlkZXIuY2JDaGFuZ2VSZWdpc3RyYXRpb25UeXBlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBob3N0IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNhZGQtbmV3LWhvc3QnKS5vbignY2xpY2snLCBwcm92aWRlci5jYk9uQ29tcGxldGVIb3N0QWRkcmVzcyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZWxldGUgaG9zdCBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCdib2R5Jykub24oJ2NsaWNrJywgJy5kZWxldGUtcm93LWJ1dHRvbicsIHByb3ZpZGVyLmNiRGVsZXRlQWRkaXRpb25hbEhvc3QpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkaXRpb25hbCBob3N0IGlucHV0IHZhbGlkYXRpb25cbiAgICAgICAgcHJvdmlkZXIuJGFkZGl0aW9uYWxIb3N0SW5wdXQub24oJ2JsdXInLCBwcm92aWRlci5jYk9uQ29tcGxldGVIb3N0QWRkcmVzcyk7XG4gICAgICAgIHByb3ZpZGVyLiRhZGRpdGlvbmFsSG9zdElucHV0Lm9uKCdrZXlwcmVzcycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGlmIChlLndoaWNoID09PSAxMykge1xuICAgICAgICAgICAgICAgIHByb3ZpZGVyLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGVmcm9tdXNlciBjaGVja2JveCBoYW5kbGVyIGZvciBTSVAgcHJvdmlkZXJzXG4gICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICAkKCcjZGlzYWJsZWZyb211c2VyIGlucHV0Jykub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZnJvbVVzZXIgPSAkKCcjZGl2RnJvbVVzZXInKTtcbiAgICAgICAgICAgICAgICBpZiAoJCgnI2Rpc2FibGVmcm9tdXNlcicpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJGZyb21Vc2VyLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJGZyb21Vc2VyLnJlbW92ZUNsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGZyb21Vc2VyLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGZyb21Vc2VyLmFkZENsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggY2hlY2tib3ggZm9yIElBWCBwcm92aWRlcnNcbiAgICAgICAgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcpIHtcbiAgICAgICAgICAgIGNvbnN0ICR3YXJuaW5nTWVzc2FnZSA9ICQoJyNlbFJlY2VpdmVDYWxscycpLm5leHQoJy53YXJuaW5nLm1lc3NhZ2UnKTtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveElucHV0ID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZ1bmN0aW9uIHRvIHVwZGF0ZSB3YXJuaW5nIG1lc3NhZ2Ugc3RhdGVcbiAgICAgICAgICAgIGZ1bmN0aW9uIHVwZGF0ZVdhcm5pbmdTdGF0ZSgpIHtcbiAgICAgICAgICAgICAgICBpZiAoJGNoZWNrYm94SW5wdXQucHJvcCgnY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgd2FybmluZyBzdGF0ZVxuICAgICAgICAgICAgdXBkYXRlV2FybmluZ1N0YXRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBjaGVja2JveCBjaGFuZ2VzXG4gICAgICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICAgICAgb25DaGVja2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS50cmFuc2l0aW9uKCdmYWRlIGluJyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLXZhbGlkYXRlIGZvcm0gd2hlbiB0aGlzIGNoYW5nZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNWYWxpZCA9IHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ2lzIHZhbGlkJywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZpZWxkJywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uVW5jaGVja2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnRyYW5zaXRpb24oJ2ZhZGUgb3V0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gZm9yIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgLy8gR2V0IGluaXRpYWwgcmVnaXN0cmF0aW9uIHR5cGUgYW5kIHVwZGF0ZSBmaWVsZCB2aXNpYmlsaXR5XG4gICAgICAgIGNvbnN0IHJlZ2lzdHJhdGlvblR5cGUgPSBwcm92aWRlci4kZm9ybU9iai5maW5kKCdbbmFtZT1cInJlZ2lzdHJhdGlvbl90eXBlXCJdJykudmFsKCkgfHwgJ291dGJvdW5kJztcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBmaWVsZCB2aXNpYmlsaXR5IGZpcnN0XG4gICAgICAgIHByb3ZpZGVyLnVwZGF0ZUZpZWxkVmlzaWJpbGl0eShyZWdpc3RyYXRpb25UeXBlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIHByb3ZpZGVyLnVwZGF0ZVZhbGlkYXRpb25SdWxlcyhyZWdpc3RyYXRpb25UeXBlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSBvYmplY3QgdXNpbmcgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHByb3ZpZGVyLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBwcm92aWRlci52YWxpZGF0aW9uUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHByb3ZpZGVyLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gcHJvdmlkZXIuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBQcm92aWRlcnNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCdcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBnbG9iYWxSb290VXJsICsgJ3Byb3ZpZGVycy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdwcm92aWRlcnMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciB0ZXh0YXJlYXMgYWZ0ZXIgZm9ybSBpbml0aWFsaXphdGlvblxuICAgICAgICBwcm92aWRlci5pbml0aWFsaXplQXV0b1Jlc2l6ZVRleHRhcmVhcygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVWYWxpZGF0aW9uUnVsZXMocmVnaXN0cmF0aW9uVHlwZSkge1xuICAgICAgICAvLyBCYXNlIHZhbGlkYXRpb24gLSBkZXNjcmlwdGlvbiBpcyBhbHdheXMgcmVxdWlyZWRcbiAgICAgICAgY29uc3QgYmFzZVJ1bGVzID0ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAocHJvdmlkZXIucHJvdmlkZXJUeXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgaWYgKHJlZ2lzdHJhdGlvblR5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBPVVRCT1VORDogRnVsbCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgcHJvdmlkZXIudmFsaWRhdGlvblJ1bGVzID0ge1xuICAgICAgICAgICAgICAgICAgICAuLi5iYXNlUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydFJhbmdlIHx8ICdQb3J0IG11c3QgYmUgYmV0d2VlbiAxIGFuZCA2NTUzNScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVnaXN0cmF0aW9uVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgLy8gSU5CT1VORDogSG9zdCBhbmQgcG9ydCBvcHRpb25hbCwgdXNlcm5hbWUvc2VjcmV0IHJlcXVpcmVkXG4gICAgICAgICAgICAgICAgcHJvdmlkZXIudmFsaWRhdGlvblJ1bGVzID0ge1xuICAgICAgICAgICAgICAgICAgICAuLi5iYXNlUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzhdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCB8fCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlZ2lzdHJhdGlvblR5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgICAgIC8vIE5PTkU6IElQIGF1dGhlbnRpY2F0aW9uIC0gaG9zdC9wb3J0IHJlcXVpcmVkLCBubyBhdXRoXG4gICAgICAgICAgICAgICAgcHJvdmlkZXIudmFsaWRhdGlvblJ1bGVzID0ge1xuICAgICAgICAgICAgICAgICAgICAuLi5iYXNlUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0UmFuZ2UgfHwgJ1BvcnQgbXVzdCBiZSBiZXR3ZWVuIDEgYW5kIDY1NTM1JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcpIHtcbiAgICAgICAgICAgIC8vIElBWCBwcm92aWRlciB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgICBpZiAocmVnaXN0cmF0aW9uVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgICAgIC8vIE9VVEJPVU5EOiBGdWxsIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICBwcm92aWRlci52YWxpZGF0aW9uUnVsZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmJhc2VSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0UmFuZ2UgfHwgJ1BvcnQgbXVzdCBiZSBiZXR3ZWVuIDEgYW5kIDY1NTM1JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWdpc3RyYXRpb25UeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBJTkJPVU5EOiBQb3J0IG9wdGlvbmFsLCBob3N0IG9wdGlvbmFsLCB1c2VybmFtZS9zZWNyZXQgcmVxdWlyZWRcbiAgICAgICAgICAgICAgICBwcm92aWRlci52YWxpZGF0aW9uUnVsZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmJhc2VSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbOF0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IHx8ICdQYXNzd29yZCBtdXN0IGJlIGF0IGxlYXN0IDggY2hhcmFjdGVycycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVnaXN0cmF0aW9uVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgLy8gTk9ORTogQWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgcGVlci10by1wZWVyXG4gICAgICAgICAgICAgICAgcHJvdmlkZXIudmFsaWRhdGlvblJ1bGVzID0ge1xuICAgICAgICAgICAgICAgICAgICAuLi5iYXNlUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydFJhbmdlIHx8ICdQb3J0IG11c3QgYmUgYmV0d2VlbiAxIGFuZCA2NTUzNScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9IHByb3ZpZGVyLnByb3ZpZGVyVHlwZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgY2hlY2tib3ggdmFsdWVzIHRvIHByb3BlciBib29sZWFuc1xuICAgICAgICBjb25zdCBib29sZWFuRmllbGRzID0gWydkaXNhYmxlZCcsICdxdWFsaWZ5JywgJ2Rpc2FibGVmcm9tdXNlcicsICdub3JlZ2lzdGVyJywgJ3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJ107XG4gICAgICAgIGJvb2xlYW5GaWVsZHMuZm9yRWFjaCgoZmllbGQpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXN1bHQuZGF0YS5oYXNPd25Qcm9wZXJ0eShmaWVsZCkpIHtcbiAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IHZhcmlvdXMgY2hlY2tib3ggcmVwcmVzZW50YXRpb25zIHRvIGJvb2xlYW5cbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtmaWVsZF0gPSByZXN1bHQuZGF0YVtmaWVsZF0gPT09IHRydWUgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbZmllbGRdID09PSAndHJ1ZScgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbZmllbGRdID09PSAnMScgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbZmllbGRdID09PSAnb24nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBhZGRpdGlvbmFsIGhvc3RzIGZvciBTSVBcbiAgICAgICAgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWxIb3N0cyA9IFtdO1xuICAgICAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHkgdHI6bm90KC5kdW1teSknKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFkZHJlc3MgPSAkKHRoaXMpLmZpbmQoJ2lucHV0JykudmFsKCk7XG4gICAgICAgICAgICAgICAgaWYgKGFkZHJlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkaXRpb25hbEhvc3RzLnB1c2goe2FkZHJlc3M6IGFkZHJlc3N9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFkZGl0aW9uYWxIb3N0cyA9IGFkZGl0aW9uYWxIb3N0cztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkaXRpb25hbCBjbGllbnQtc2lkZSB2YWxpZGF0aW9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAoIVByb3ZpZGVyc0FQSS52YWxpZGF0ZVByb3ZpZGVyRGF0YSkge1xuICAgICAgICAgICAgLy8gSWYgbm8gdmFsaWRhdGlvbiBtZXRob2QgZXhpc3RzLCBqdXN0IHJldHVybiB0aGUgcmVzdWx0XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIVByb3ZpZGVyc0FQSS52YWxpZGF0ZVByb3ZpZGVyRGF0YShyZXN1bHQuZGF0YSkpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignVmFsaWRhdGlvbiBmYWlsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YVxuICAgICAgICAgICAgcHJvdmlkZXIucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGUgRm9ybS5qcyB3aWxsIGhhbmRsZSB0aGUgcmVsb2FkIGF1dG9tYXRpY2FsbHkgaWYgcmVzcG9uc2UucmVsb2FkIGlzIHByZXNlbnRcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgUkVTVCBBUEkgcmV0dXJucyByZWxvYWQgcGF0aCBsaWtlIFwicHJvdmlkZXJzL21vZGlmeXNpcC9TSVAtVFJVTksteHh4XCJcbiAgICAgICAgICAgIC8vIFRoaXMgd2lsbCBiZSBoYW5kbGVkIGJ5IEZvcm0uanMgaW4gaGFuZGxlU3VibWl0UmVzcG9uc2UgbWV0aG9kXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElmIG5vIHJlbG9hZCBwYXRoLCB1cGRhdGUgVVJMIG1hbnVhbGx5IGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5yZWxvYWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSAkKCcjdW5pcWlkJykudmFsKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50SWQgJiYgcmVzcG9uc2UuZGF0YS51bmlxaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFx3KlxcLz8kLywgJ21vZGlmeScgKyBwcm92aWRlci5wcm92aWRlclR5cGUudG9Mb3dlckNhc2UoKSArICcvJyArIHJlc3BvbnNlLmRhdGEudW5pcWlkKTtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVnaXN0cmF0aW9uIHR5cGUgY2hhbmdlIGhhbmRsZXJcbiAgICAgKi9cbiAgICBjYkNoYW5nZVJlZ2lzdHJhdGlvblR5cGUoKSB7XG4gICAgICAgIGNvbnN0IHJlZ2lzdHJhdGlvblR5cGUgPSBwcm92aWRlci4kZm9ybU9iai5maW5kKCdbbmFtZT1cInJlZ2lzdHJhdGlvbl90eXBlXCJdJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZmllbGQgdmlzaWJpbGl0eSBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBwcm92aWRlci51cGRhdGVGaWVsZFZpc2liaWxpdHkocmVnaXN0cmF0aW9uVHlwZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBwcm92aWRlci51cGRhdGVWYWxpZGF0aW9uUnVsZXMocmVnaXN0cmF0aW9uVHlwZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9ycyBmb3IgZmllbGRzIHRoYXQgYXJlIG5vdyBoaWRkZW5cbiAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZmluZCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZpbmQoJy51aS5lcnJvci5tZXNzYWdlJykucmVtb3ZlKCk7XG4gICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZpbmQoJy5wcm9tcHQnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBGb3JtLnZhbGlkYXRlUnVsZXMgZm9yIG5leHQgc3VibWl0XG4gICAgICAgIGlmIChGb3JtLnZhbGlkYXRlUnVsZXMpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHByb3ZpZGVyLnZhbGlkYXRpb25SdWxlcztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtdmFsaWRhdGUgZm9ybSB0byB1cGRhdGUgVUlcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBwcm92aWRlci4kZm9ybU9iai5mb3JtKCdpcyB2YWxpZCcpO1xuICAgICAgICB9LCAxMDApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGZpZWxkIHZpc2liaWxpdHkgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVGaWVsZFZpc2liaWxpdHkocmVnaXN0cmF0aW9uVHlwZSkge1xuICAgICAgICAvLyBHZXQgZWxlbWVudCByZWZlcmVuY2VzXG4gICAgICAgIGNvbnN0ICRlbEhvc3QgPSAkKCcjZWxIb3N0Jyk7XG4gICAgICAgIGNvbnN0ICRlbFVzZXJuYW1lID0gJCgnI2VsVXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgJGVsU2VjcmV0ID0gJCgnI2VsU2VjcmV0Jyk7XG4gICAgICAgIGNvbnN0ICRlbFBvcnQgPSAkKCcjZWxQb3J0Jyk7XG4gICAgICAgIGNvbnN0ICRlbFJlY2VpdmVDYWxscyA9ICQoJyNlbFJlY2VpdmVDYWxscycpO1xuICAgICAgICBjb25zdCAkZWxBZGRpdGlvbmFsSG9zdCA9ICQoJyNlbEFkZGl0aW9uYWxIb3N0cycpO1xuICAgICAgICBjb25zdCAkdmFsVXNlck5hbWUgPSAkKCcjdXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgJHZhbFNlY3JldCA9IHByb3ZpZGVyLiRzZWNyZXQ7XG4gICAgICAgIGNvbnN0ICRlbFVuaXFJZCA9ICQoJyN1bmlxaWQnKTtcbiAgICAgICAgY29uc3QgJGdlblBhc3N3b3JkID0gJCgnI2dlbmVyYXRlLXBhc3N3b3JkLWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkY29weUJ1dHRvbiA9ICQoJyNjbGlwYm9hcmQtcGFzc3dvcmQtYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRzaG93SGlkZUJ1dHRvbiA9ICQoJyNzaG93LXBhc3N3b3JkLWJ1dHRvbicpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGxhYmVsIGVsZW1lbnRzXG4gICAgICAgIGNvbnN0ICRsYWJlbEhvc3QgPSAkKCdsYWJlbFtmb3I9XCJob3N0XCJdJyk7XG4gICAgICAgIGNvbnN0ICRsYWJlbFBvcnQgPSAkKCdsYWJlbFtmb3I9XCJwb3J0XCJdJyk7XG4gICAgICAgIGNvbnN0ICRsYWJlbFVzZXJuYW1lID0gJCgnbGFiZWxbZm9yPVwidXNlcm5hbWVcIl0nKTtcbiAgICAgICAgY29uc3QgJGxhYmVsU2VjcmV0ID0gJCgnbGFiZWxbZm9yPVwic2VjcmV0XCJdJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAocHJvdmlkZXIucHJvdmlkZXJUeXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgLy8gUmVzZXQgdXNlcm5hbWUgb25seSB3aGVuIHN3aXRjaGluZyBmcm9tIGluYm91bmQgdG8gb3RoZXIgdHlwZXNcbiAgICAgICAgICAgIGlmICgkdmFsVXNlck5hbWUudmFsKCkgPT09ICRlbFVuaXFJZC52YWwoKSAmJiByZWdpc3RyYXRpb25UeXBlICE9PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgICAgICAkdmFsVXNlck5hbWUudmFsKCcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICR2YWxVc2VyTmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICBpZiAocmVnaXN0cmF0aW9uVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgICAgIC8vIE9VVEJPVU5EOiBXZSByZWdpc3RlciB0byBwcm92aWRlclxuICAgICAgICAgICAgICAgICRlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbEFkZGl0aW9uYWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICRjb3B5QnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHNcbiAgICAgICAgICAgICAgICAkbGFiZWxIb3N0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0L0lQJyk7XG4gICAgICAgICAgICAgICAgJGxhYmVsUG9ydC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBvcnQgfHwgJ1Byb3ZpZGVyIFBvcnQnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWxVc2VybmFtZS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckxvZ2luIHx8ICdMb2dpbicpO1xuICAgICAgICAgICAgICAgICRsYWJlbFNlY3JldC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBhc3N3b3JkIHx8ICdQYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWdpc3RyYXRpb25UeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBJTkJPVU5EOiBQcm92aWRlciBjb25uZWN0cyB0byB1c1xuICAgICAgICAgICAgICAgICR2YWxVc2VyTmFtZS52YWwoJGVsVW5pcUlkLnZhbCgpKTtcbiAgICAgICAgICAgICAgICAkdmFsVXNlck5hbWUuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgICAgICAgICAgaWYgKCR2YWxTZWNyZXQudmFsKCkudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAkdmFsU2VjcmV0LnZhbCgnaWQ9JyArICQoJyNpZCcpLnZhbCgpICsgJy0nICsgJGVsVW5pcUlkLnZhbCgpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJGVsSG9zdC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJGVsUG9ydC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsQWRkaXRpb25hbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgICAgICRnZW5QYXNzd29yZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNvcHlCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgICRzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVsc1xuICAgICAgICAgICAgICAgICRsYWJlbFVzZXJuYW1lLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uVXNlcm5hbWUgfHwgJ0F1dGhlbnRpY2F0aW9uIFVzZXJuYW1lJyk7XG4gICAgICAgICAgICAgICAgJGxhYmVsU2VjcmV0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQgfHwgJ0F1dGhlbnRpY2F0aW9uIFBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHZhbGlkYXRpb24gZXJyb3JzIGZvciBoaWRkZW4gaG9zdCBmaWVsZFxuICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnaG9zdCcpO1xuICAgICAgICAgICAgICAgICQoJyNob3N0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdwb3J0Jyk7XG4gICAgICAgICAgICAgICAgJCgnI3BvcnQnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVnaXN0cmF0aW9uVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgLy8gTk9ORTogU3RhdGljIHBlZXItdG8tcGVlciBjb25uZWN0aW9uIChJUCBhdXRoZW50aWNhdGlvbilcbiAgICAgICAgICAgICAgICAkZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxVc2VybmFtZS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJGVsU2VjcmV0LmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkZWxBZGRpdGlvbmFsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkY29weUJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJHNob3dIaWRlQnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzXG4gICAgICAgICAgICAgICAgJGxhYmVsSG9zdC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVySG9zdE9ySVBBZGRyZXNzIHx8ICdQZWVyIEhvc3QvSVAnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWxQb3J0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQb3J0IHx8ICdQZWVyIFBvcnQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBwcm9tcHRzIGZvciBoaWRkZW4gZmllbGRzXG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICd1c2VybmFtZScpO1xuICAgICAgICAgICAgICAgICQoJyN1c2VybmFtZScpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnc2VjcmV0Jyk7XG4gICAgICAgICAgICAgICAgJCgnI3NlY3JldCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIYW5kbGUgZGlzYWJsZWZyb211c2VyIGNoZWNrYm94IHZpc2liaWxpdHlcbiAgICAgICAgICAgIGNvbnN0ICRlbCA9ICQoJyNkaXNhYmxlZnJvbXVzZXInKTtcbiAgICAgICAgICAgIGNvbnN0ICRmcm9tVXNlciA9ICQoJyNkaXZGcm9tVXNlcicpO1xuICAgICAgICAgICAgaWYgKCRlbC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgJGZyb21Vc2VyLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkZnJvbVVzZXIucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGZyb21Vc2VyLnNob3coKTtcbiAgICAgICAgICAgICAgICAkZnJvbVVzZXIuYWRkQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVyLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBJQVggcHJvdmlkZXIgdmlzaWJpbGl0eVxuICAgICAgICAgICAgJHZhbFVzZXJOYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG4gICAgICAgICAgICBjb25zdCAkdmFsUG9ydCA9ICQoJyNwb3J0Jyk7XG4gICAgICAgICAgICBjb25zdCAkdmFsUXVhbGlmeSA9ICQoJyNxdWFsaWZ5Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFsd2F5cyBlbmFibGUgcXVhbGlmeSBmb3IgSUFYIChOQVQga2VlcGFsaXZlKVxuICAgICAgICAgICAgaWYgKCR2YWxRdWFsaWZ5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkdmFsUXVhbGlmeS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJHZhbFF1YWxpZnkudmFsKCcxJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBlbXB0eSBuZXR3b3JrIGZpbHRlciBJRCAobm8gcmVzdHJpY3Rpb25zIGJ5IGRlZmF1bHQpXG4gICAgICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKCcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICAgICAgaWYgKHJlZ2lzdHJhdGlvblR5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBPVVRCT1VORDogV2UgcmVnaXN0ZXIgdG8gcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAkZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxSZWNlaXZlQ2FsbHMuaGlkZSgpOyAvLyBOb3QgcmVsZXZhbnQgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHJlcXVpcmVkIGZpZWxkcyBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgICAgICAkZWxIb3N0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgICRlbFBvcnQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAgICAgJGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAgICAgJGVsU2VjcmV0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZ2VuZXJhdGUgYW5kIGNvcHkgYnV0dG9ucyBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgICAgICAkZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgICAgICRjb3B5QnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICAgICAgJGxhYmVsSG9zdC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyB8fCAnUHJvdmlkZXIgSG9zdC9JUCcpO1xuICAgICAgICAgICAgICAgICRsYWJlbFBvcnQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQb3J0IHx8ICdQcm92aWRlciBQb3J0Jyk7XG4gICAgICAgICAgICAgICAgJGxhYmVsVXNlcm5hbWUudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJMb2dpbiB8fCAnTG9naW4nKTtcbiAgICAgICAgICAgICAgICAkbGFiZWxTZWNyZXQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQYXNzd29yZCB8fCAnUGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKCR2YWxQb3J0LnZhbCgpID09PSAnJyB8fCAkdmFsUG9ydC52YWwoKSA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgICAgICR2YWxQb3J0LnZhbCgnNDU2OScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVnaXN0cmF0aW9uVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgLy8gSU5CT1VORDogUHJvdmlkZXIgY29ubmVjdHMgdG8gdXNcbiAgICAgICAgICAgICAgICAkdmFsVXNlck5hbWUudmFsKCRlbFVuaXFJZC52YWwoKSk7XG4gICAgICAgICAgICAgICAgJHZhbFVzZXJOYW1lLmF0dHIoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICAgICAgICAgIGlmICgkdmFsU2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgJHZhbFNlY3JldC52YWwoJ2lkPScgKyAkKCcjaWQnKS52YWwoKSArICctJyArICRlbFVuaXFJZC52YWwoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFBvcnQuaGlkZSgpOyAvLyBQb3J0IG5vdCBuZWVkZWQgZm9yIGluYm91bmQgY29ubmVjdGlvbnNcbiAgICAgICAgICAgICAgICAkZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgICAgICAkZWxSZWNlaXZlQ2FsbHMuc2hvdygpOyAvLyBTaG93IGZvciBpbmJvdW5kIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHZhbGlkYXRpb24gcHJvbXB0IGZvciBoaWRkZW4gcG9ydCBmaWVsZFxuICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAncG9ydCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHMgZm9yIGluYm91bmRcbiAgICAgICAgICAgICAgICAkZWxIb3N0LnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpOyAvLyBIb3N0IGlzIG9wdGlvbmFsIGZvciBpbmJvdW5kXG4gICAgICAgICAgICAgICAgJGVsUG9ydC5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgaG9zdCB2YWxpZGF0aW9uIGVycm9yIHNpbmNlIGl0J3Mgb3B0aW9uYWwgZm9yIGluYm91bmRcbiAgICAgICAgICAgICAgICBwcm92aWRlci4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ2hvc3QnKTtcbiAgICAgICAgICAgICAgICAkKCcjaG9zdCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICRlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgICRlbFNlY3JldC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBidXR0b25zIGZvciBpbmJvdW5kXG4gICAgICAgICAgICAgICAgJGdlblBhc3N3b3JkLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY29weUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHNob3dIaWRlQnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBpbmJvdW5kXG4gICAgICAgICAgICAgICAgJGxhYmVsSG9zdC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MgfHwgJ1JlbW90ZSBIb3N0L0lQJyk7XG4gICAgICAgICAgICAgICAgJGxhYmVsVXNlcm5hbWUudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSB8fCAnQXV0aGVudGljYXRpb24gVXNlcm5hbWUnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWxTZWNyZXQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25QYXNzd29yZCB8fCAnQXV0aGVudGljYXRpb24gUGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVnaXN0cmF0aW9uVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgLy8gTk9ORTogU3RhdGljIHBlZXItdG8tcGVlciBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgJGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgICAgICRlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGVsUmVjZWl2ZUNhbGxzLnNob3coKTsgLy8gU2hvdyBmb3Igc3RhdGljIGNvbm5lY3Rpb25zIHRvb1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHMgZm9yIG5vbmVcbiAgICAgICAgICAgICAgICAkZWxIb3N0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgICRlbFBvcnQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAgICAgJGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAgICAgJGVsU2VjcmV0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZ2VuZXJhdGUgYW5kIGNvcHkgYnV0dG9ucyBmb3Igbm9uZSB0eXBlXG4gICAgICAgICAgICAgICAgJGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkY29weUJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJHNob3dIaWRlQnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBub25lIChwZWVyLXRvLXBlZXIpXG4gICAgICAgICAgICAgICAgJGxhYmVsSG9zdC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVySG9zdE9ySVBBZGRyZXNzIHx8ICdQZWVyIEhvc3QvSVAnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWxQb3J0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQb3J0IHx8ICdQZWVyIFBvcnQnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWxVc2VybmFtZS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyVXNlcm5hbWUgfHwgJ1BlZXIgVXNlcm5hbWUnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWxTZWNyZXQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclBhc3N3b3JkIHx8ICdQZWVyIFBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgcG9ydCBpZiBlbXB0eVxuICAgICAgICAgICAgICAgIGlmICgkdmFsUG9ydC52YWwoKSA9PT0gJycgfHwgJHZhbFBvcnQudmFsKCkgPT09ICcwJykge1xuICAgICAgICAgICAgICAgICAgICAkdmFsUG9ydC52YWwoJzQ1NjknKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBhZGRpdGlvbmFsIGhvc3QgaGFuZGxlclxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHByb3ZpZGVyLiRhZGRpdGlvbmFsSG9zdElucHV0LnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCAhcHJvdmlkZXIuaG9zdElucHV0VmFsaWRhdGlvbi50ZXN0KHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgZHVwbGljYXRlc1xuICAgICAgICBsZXQgZHVwbGljYXRlID0gZmFsc2U7XG4gICAgICAgICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRib2R5IHRyOm5vdCguZHVtbXkpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmZpbmQoJ2lucHV0JykudmFsKCkgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZHVwbGljYXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFkdXBsaWNhdGUpIHtcbiAgICAgICAgICAgIGNvbnN0ICRuZXdSb3cgPSBwcm92aWRlci4kYWRkaXRpb25hbEhvc3RzRHVtbXkuY2xvbmUoKTtcbiAgICAgICAgICAgICRuZXdSb3cucmVtb3ZlQ2xhc3MoJ2R1bW15Jyk7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJ2lucHV0JykudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICRuZXdSb3cuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHknKS5hcHBlbmQoJG5ld1Jvdyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHByb3ZpZGVyLiRhZGRpdGlvbmFsSG9zdElucHV0LnZhbCgnJyk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBhZGRpdGlvbmFsIGhvc3QgaGFuZGxlclxuICAgICAqL1xuICAgIGNiRGVsZXRlQWRkaXRpb25hbEhvc3QoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgdmlzaWJpbGl0eSB0b2dnbGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRUb2dnbGUoKSB7XG4gICAgICAgICQoJyNzaG93LXBhc3N3b3JkLWJ1dHRvbicpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBwcm92aWRlci4kc2VjcmV0LmF0dHIoJ3R5cGUnKTtcbiAgICAgICAgICAgIGlmICh0eXBlID09PSAncGFzc3dvcmQnKSB7XG4gICAgICAgICAgICAgICAgcHJvdmlkZXIuJHNlY3JldC5hdHRyKCd0eXBlJywgJ3RleHQnKTtcbiAgICAgICAgICAgICAgICAkKCcjc2hvdy1wYXNzd29yZC1idXR0b24gaScpLnJlbW92ZUNsYXNzKCdleWUnKS5hZGRDbGFzcygnZXllIHNsYXNoJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRzZWNyZXQuYXR0cigndHlwZScsICdwYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgICQoJyNzaG93LXBhc3N3b3JkLWJ1dHRvbiBpJykucmVtb3ZlQ2xhc3MoJ2V5ZSBzbGFzaCcpLmFkZENsYXNzKCdleWUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIGdlbmVyYXRvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVQYXNzd29yZEdlbmVyYXRvcigpIHtcbiAgICAgICAgJCgnI2dlbmVyYXRlLXBhc3N3b3JkLWJ1dHRvbicpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNoYXJzID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5JztcbiAgICAgICAgICAgIGxldCBwYXNzd29yZCA9ICcnO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxNjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGFzc3dvcmQgKz0gY2hhcnMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJvdmlkZXIuJHNlY3JldC52YWwocGFzc3dvcmQpO1xuICAgICAgICAgICAgcHJvdmlkZXIuJHNlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBwYXNzd29yZFxuICAgICAgICAgICAgcHJvdmlkZXIuJHNlY3JldC5hdHRyKCd0eXBlJywgJ3RleHQnKTtcbiAgICAgICAgICAgICQoJyNzaG93LXBhc3N3b3JkLWJ1dHRvbiBpJykucmVtb3ZlQ2xhc3MoJ2V5ZScpLmFkZENsYXNzKCdleWUgc2xhc2gnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNsaXBib2FyZCgpIHtcbiAgICAgICAgY29uc3QgY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKCcjY2xpcGJvYXJkLXBhc3N3b3JkLWJ1dHRvbicsIHtcbiAgICAgICAgICAgIHRleHQ6ICgpID0+IHByb3ZpZGVyLiRzZWNyZXQudmFsKClcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICAkKCcjY2xpcGJvYXJkLXBhc3N3b3JkLWJ1dHRvbicpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICBjb250ZW50OiBnbG9iYWxUcmFuc2xhdGUucHJfUGFzc3dvcmRDb3BpZWQsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCdcbiAgICAgICAgICAgIH0pLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoJyNjbGlwYm9hcmQtcGFzc3dvcmQtYnV0dG9uJykucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcXVhbGlmeSB0b2dnbGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUXVhbGlmeVRvZ2dsZSgpIHtcbiAgICAgICAgcHJvdmlkZXIuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXIuJHF1YWxpZnlGcmVxVG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyLiRxdWFsaWZ5RnJlcVRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbmV0d29yayBmaWx0ZXIgZHJvcGRvd25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKCkge1xuICAgICAgICBpZiAocHJvdmlkZXIuJG5ldHdvcmtGaWx0ZXJEcm9wZG93bi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZHJvcGRvd25TZXR0aW5ncyA9IE5ldHdvcmtGaWx0ZXJzQVBJLmdldERyb3Bkb3duU2V0dGluZ3MoKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBpbml0aWFsaXphdGlvblxuICAgICAgICBwcm92aWRlci4kbmV0d29ya0ZpbHRlckRyb3Bkb3duLmRyb3Bkb3duKCdkZXN0cm95Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZyZXNoIGRyb3Bkb3duXG4gICAgICAgIHByb3ZpZGVyLiRuZXR3b3JrRmlsdGVyRHJvcGRvd24uZHJvcGRvd24oZHJvcGRvd25TZXR0aW5ncyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmllbGRUb29sdGlwcygpIHtcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChwcm92aWRlci5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICAvLyBTSVAtc3BlY2lmaWMgdG9vbHRpcHNcbiAgICAgICAgICAgIHRvb2x0aXBDb25maWdzWydyZWdpc3RyYXRpb25fdHlwZSddID0gcHJvdmlkZXIuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaGVhZGVyIHx8ICdSZWdpc3RyYXRpb24gVHlwZScsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmQgfHwgJ091dGJvdW5kJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjIHx8ICdQQlggcmVnaXN0ZXJzIHRvIHByb3ZpZGVyJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZCB8fCAnSW5ib3VuZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjIHx8ICdQcm92aWRlciByZWdpc3RlcnMgdG8gUEJYJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZSB8fCAnTm9uZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZV9kZXNjIHx8ICdJUC1iYXNlZCBhdXRoZW50aWNhdGlvbidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0b29sdGlwQ29uZmlnc1sncHJvdmlkZXJfaG9zdCddID0gcHJvdmlkZXIuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIgfHwgJ1Byb3ZpZGVyIEhvc3QnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjIHx8ICdFbnRlciB0aGUgaG9zdG5hbWUgb3IgSVAgYWRkcmVzcyBvZiB5b3VyIFNJUCBwcm92aWRlcicsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRzIHx8ICdTdXBwb3J0ZWQgZm9ybWF0cycsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCB8fCAnSVAgYWRkcmVzcyAoZS5nLiwgMTkyLjE2OC4xLjEpJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2RvbWFpbiB8fCAnRG9tYWluIG5hbWUgKGUuZy4sIHNpcC5wcm92aWRlci5jb20pJ1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0b29sdGlwQ29uZmlnc1snYWRkaXRpb25hbF9ob3N0cyddID0gcHJvdmlkZXIuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9oZWFkZXIgfHwgJ0FkZGl0aW9uYWwgSG9zdHMnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9kZXNjIHx8ICdBZGRpdGlvbmFsIElQIGFkZHJlc3NlcyBvciBob3N0bmFtZXMgZm9yIHRoaXMgcHJvdmlkZXInLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9pZCB8fCAnVXNlZCBmb3IgaWRlbnRpZnlpbmcgaW5jb21pbmcgY2FsbHMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQWRkaXRpb25hbEhvc3RzVG9vbHRpcF9wdXJwb3NlX211bHRpIHx8ICdTdXBwb3J0cyBtdWx0aXBsZSBwcm92aWRlciBzZXJ2ZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0FkZGl0aW9uYWxIb3N0c1Rvb2x0aXBfcHVycG9zZV9zZWN1cml0eSB8fCAnRW5oYW5jZXMgc2VjdXJpdHkgYnkgcmVzdHJpY3RpbmcgYWNjZXNzJ1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0b29sdGlwQ29uZmlnc1snc2lwX3BvcnQnXSA9IHByb3ZpZGVyLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX2hlYWRlciB8fCAnU0lQIFBvcnQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfZGVzYyB8fCAnVGhlIHBvcnQgbnVtYmVyIGZvciBTSVAgY29tbXVuaWNhdGlvbicsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnNTA2MCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfU0lQUG9ydFRvb2x0aXBfcG9ydF81MDYwX2Rlc2MgfHwgJ1N0YW5kYXJkIFNJUCBwb3J0IChVRFAvVENQKSdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzUwNjEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1NJUFBvcnRUb29sdGlwX3BvcnRfNTA2MV9kZXNjIHx8ICdTdGFuZGFyZCBTSVAgcG9ydCAoVExTKSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0b29sdGlwQ29uZmlnc1sndHJhbnNwb3J0X3Byb3RvY29sJ10gPSBwcm92aWRlci5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9UcmFuc3BvcnRQcm90b2NvbFRvb2x0aXBfaGVhZGVyIHx8ICdUcmFuc3BvcnQgUHJvdG9jb2wnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfVHJhbnNwb3J0UHJvdG9jb2xUb29sdGlwX2Rlc2MgfHwgJ1Byb3RvY29sIGZvciBTSVAgc2lnbmFsaW5nJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdVRFAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF91ZHBfZGVzYyB8fCAnRmFzdCwgY29ubmVjdGlvbmxlc3MgcHJvdG9jb2wnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdUQ1AnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90Y3BfZGVzYyB8fCAnUmVsaWFibGUsIGNvbm5lY3Rpb24tb3JpZW50ZWQgcHJvdG9jb2wnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdUTFMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1RyYW5zcG9ydFByb3RvY29sVG9vbHRpcF90bHNfZGVzYyB8fCAnRW5jcnlwdGVkIFRDUCBjb25uZWN0aW9uJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRvb2x0aXBDb25maWdzWydvdXRib3VuZF9wcm94eSddID0gcHJvdmlkZXIuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfaGVhZGVyIHx8ICdPdXRib3VuZCBQcm94eScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9PdXRib3VuZFByb3h5VG9vbHRpcF9kZXNjIHx8ICdTSVAgcHJveHkgc2VydmVyIGZvciBvdXRib3VuZCBjYWxscycsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfT3V0Ym91bmRQcm94eVRvb2x0aXBfZm9ybWF0IHx8ICdGb3JtYXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogJ3NpcDpwcm94eS5leGFtcGxlLmNvbTo1MDYwJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRvb2x0aXBDb25maWdzWydkdG1mX21vZGUnXSA9IHByb3ZpZGVyLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX0RUTUZNb2RlVG9vbHRpcF9oZWFkZXIgfHwgJ0RUTUYgTW9kZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfZGVzYyB8fCAnTWV0aG9kIGZvciB0cmFuc21pdHRpbmcgRFRNRiAodG91Y2gtdG9uZSkgc2lnbmFscycsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnQXV0bycsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX2F1dG9fZGVzYyB8fCAnQXV0b21hdGljYWxseSBkZXRlY3QgdGhlIGJlc3QgRFRNRiBtZXRob2QnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdSRkMgNDczMycsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfRFRNRk1vZGVUb29sdGlwX3JmYzQ3MzNfZGVzYyB8fCAnU2VuZCBEVE1GIGFzIFJUUCBldmVudHMgKHJlY29tbWVuZGVkKSdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJ1NJUCBJTkZPJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5mb19kZXNjIHx8ICdTZW5kIERUTUYgdmlhIFNJUCBJTkZPIG1lc3NhZ2VzJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnSW5iYW5kJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfaW5iYW5kX2Rlc2MgfHwgJ1NlbmQgRFRNRiBhcyBhdWRpbyB0b25lcyBpbiB0aGUgbWVkaWEgc3RyZWFtJ1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnQXV0byArIFNJUCBJTkZPJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfYXV0b19pbmZvX2Rlc2MgfHwgJ1RyeSBhdXRvIGRldGVjdGlvbiwgZmFsbGJhY2sgdG8gU0lQIElORk8nXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EVE1GTW9kZVRvb2x0aXBfbm90ZSB8fCAnUkZDIDQ3MzMgaXMgdGhlIHJlY29tbWVuZGVkIG1ldGhvZCBmb3IgbW9zdCBwcm92aWRlcnMnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFudWFsIGF0dHJpYnV0ZXMgdG9vbHRpcCB3aXRoIGRldGFpbGVkIGV4YW1wbGVzXG4gICAgICAgICAgICB0b29sdGlwQ29uZmlnc1snbWFudWFsX2F0dHJpYnV0ZXMnXSA9IHByb3ZpZGVyLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciB8fCAnQWRkaXRpb25hbCBTSVAgUGFyYW1ldGVycycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9kZXNjIHx8ICdBZHZhbmNlZCBTSVAgY2hhbm5lbCBjb25maWd1cmF0aW9uIHBhcmFtZXRlcnMgZm9yIHNwZWNpZmljIHByb3ZpZGVyIHJlcXVpcmVtZW50cycsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfY29tbW9uX2hlYWRlciB8fCAnQ29tbW9uIFBhcmFtZXRlcnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfbWF4ZGF0YWdyYW0gfHwgJ21heGRhdGFncmFtPTE1MDAgLSBNYXhpbXVtIFVEUCBwYWNrZXQgc2l6ZScsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9zZXNzaW9uX3RpbWVycyB8fCAnc2Vzc2lvbi10aW1lcnM9YWNjZXB0IC0gU0lQIFNlc3Npb24gVGltZXIgaGFuZGxpbmcnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfc2Vzc2lvbl9leHBpcmVzIHx8ICdzZXNzaW9uLWV4cGlyZXM9MTgwMCAtIFNlc3Npb24gZXhwaXJhdGlvbiB0aW1lJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3Nlc3Npb25fbWluc2UgfHwgJ3Nlc3Npb24tbWluc2U9OTAgLSBNaW5pbXVtIHNlc3Npb24gZXhwaXJhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF90MzhwdCB8fCAndDM4cHRfdWRwdGw9eWVzLHJlZHVuZGFuY3ksbWF4ZGF0YWdyYW09NDAwIC0gVC4zOCBmYXggc3VwcG9ydCdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb2RlY3NfaGVhZGVyIHx8ICdDb2RlYyBTZXR0aW5ncycsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9hbGxvdyB8fCAnYWxsb3c9ZzcyOSxnNzIyLGFsYXcsdWxhdyAtIEFsbG93ZWQgY29kZWNzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rpc2FsbG93IHx8ICdkaXNhbGxvdz1hbGwgLSBEaXNhbGxvdyBhbGwgY29kZWNzIGZpcnN0JyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3ZpZGVvc3VwcG9ydCB8fCAndmlkZW9zdXBwb3J0PXllcyAtIEVuYWJsZSB2aWRlbyBzdXBwb3J0JyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX21heGNhbGxiaXRyYXRlIHx8ICdtYXhjYWxsYml0cmF0ZT0zODQgLSBNYXhpbXVtIHZpZGVvIGJpdHJhdGUnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfbmF0X2hlYWRlciB8fCAnTkFUICYgU2VjdXJpdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlyZWN0bWVkaWEgfHwgJ2RpcmVjdG1lZGlhPW5vIC0gRGlzYWJsZSBkaXJlY3QgUlRQJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NhbnJlaW52aXRlIHx8ICdjYW5yZWludml0ZT1ubyAtIERpc2FibGUgcmUtSU5WSVRFJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2luc2VjdXJlIHx8ICdpbnNlY3VyZT1wb3J0LGludml0ZSAtIFJlbGF4ZWQgc2VjdXJpdHknLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfcmVtb3Rlc2VjcmV0IHx8ICdyZW1vdGVzZWNyZXQ9cGFzc3dvcmQgLSBSZW1vdGUgYXV0aGVudGljYXRpb24nXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIHx8ICdJbXBvcnRhbnQnLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZyB8fCAnSW5jb3JyZWN0IHBhcmFtZXRlcnMgbWF5IHByZXZlbnQgY2FsbHMgZnJvbSB3b3JraW5nLiBVc2Ugb25seSBwYXJhbWV0ZXJzIHJlcXVpcmVkIGJ5IHlvdXIgcHJvdmlkZXIuJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ21heGRhdGFncmFtPTE1MDAnLFxuICAgICAgICAgICAgICAgICAgICAnc2Vzc2lvbi10aW1lcnM9YWNjZXB0JyxcbiAgICAgICAgICAgICAgICAgICAgJ3Nlc3Npb24tZXhwaXJlcz0xODAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ2RpcmVjdG1lZGlhPW5vJyxcbiAgICAgICAgICAgICAgICAgICAgJ2FsbG93PWc3MjksYWxhdyx1bGF3J1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXIgfHwgJ0V4YW1wbGUgY29uZmlndXJhdGlvbicsXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnByX01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX25vdGUgfHwgJ09uZSBwYXJhbWV0ZXIgcGVyIGxpbmUuIENvbnRhY3QgeW91ciBwcm92aWRlciBmb3Igc3BlY2lmaWMgcmVxdWlyZW1lbnRzLidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIucHJvdmlkZXJUeXBlID09PSAnSUFYJykge1xuICAgICAgICAgICAgLy8gSUFYLXNwZWNpZmljIHRvb2x0aXBzXG4gICAgICAgICAgICB0b29sdGlwQ29uZmlnc1sncmVnaXN0cmF0aW9uX3R5cGUnXSA9IHByb3ZpZGVyLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIgfHwgJ1JlZ2lzdHJhdGlvbiBUeXBlJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmQgfHwgJ091dGJvdW5kJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfb3V0Ym91bmRfZGVzYyB8fCAnUEJYIHJlZ2lzdGVycyB0byBJQVggcHJvdmlkZXInXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZCB8fCAnSW5ib3VuZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmRfZGVzYyB8fCAnUHJvdmlkZXIgcmVnaXN0ZXJzIHRvIFBCWCdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lIHx8ICdQZWVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZV9kZXNjIHx8ICdTdGF0aWMgcGVlci10by1wZWVyIGNvbm5lY3Rpb24nXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdG9vbHRpcENvbmZpZ3NbJ3Byb3ZpZGVyX2hvc3QnXSA9IHByb3ZpZGVyLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX2hlYWRlciB8fCAnSUFYIEhvc3QnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZGVzYyB8fCAnRW50ZXIgdGhlIGhvc3RuYW1lIG9yIElQIGFkZHJlc3Mgb2YgeW91ciBJQVggcHJvdmlkZXInLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vdGUgfHwgJ0lBWCB1c2VzIHBvcnQgNDU2OSBieSBkZWZhdWx0J1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBNYW51YWwgYXR0cmlidXRlcyB0b29sdGlwIGZvciBJQVhcbiAgICAgICAgICAgIHRvb2x0aXBDb25maWdzWydtYW51YWxfYXR0cmlidXRlcyddID0gcHJvdmlkZXIuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciB8fCAnQWRkaXRpb25hbCBJQVggUGFyYW1ldGVycycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYyB8fCAnQWR2YW5jZWQgSUFYMiBjaGFubmVsIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVycycsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvbW1vbl9oZWFkZXIgfHwgJ0NvbW1vbiBJQVggUGFyYW1ldGVycycsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfdHJ1bmsgfHwgJ3RydW5rPXllcyAtIEVuYWJsZSBJQVgyIHRydW5raW5nJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9qaXR0ZXJidWZmZXIgfHwgJ2ppdHRlcmJ1ZmZlcj15ZXMgLSBFbmFibGUgaml0dGVyIGJ1ZmZlcicsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZm9yY2VqaXR0ZXJidWZmZXIgfHwgJ2ZvcmNlaml0dGVyYnVmZmVyPXllcyAtIEZvcmNlIGppdHRlciBidWZmZXInLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX21heGppdHRlcmJ1ZmZlciB8fCAnbWF4aml0dGVyYnVmZmVyPTQwMCAtIE1heGltdW0gaml0dGVyIGJ1ZmZlciBzaXplJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9iYW5kd2lkdGggfHwgJ2JhbmR3aWR0aD1sb3cgLSBCYW5kd2lkdGggb3B0aW1pemF0aW9uJ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9jb2RlY3NfaGVhZGVyIHx8ICdJQVggQ29kZWMgU2V0dGluZ3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2FsbG93IHx8ICdhbGxvdz1nNzI5LGdzbSxhbGF3LHVsYXcgLSBBbGxvd2VkIGNvZGVjcycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGlzYWxsb3cgfHwgJ2Rpc2FsbG93PWFsbCAtIERpc2FsbG93IGFsbCBjb2RlY3MgZmlyc3QnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2NvZGVjcHJpb3JpdHkgfHwgJ2NvZGVjcHJpb3JpdHk9aG9zdCAtIENvZGVjIHByaW9yaXR5J1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIgfHwgJ0ltcG9ydGFudCcsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZyB8fCAnSW5jb3JyZWN0IHBhcmFtZXRlcnMgbWF5IHByZXZlbnQgSUFYIGNhbGxzIGZyb20gd29ya2luZy4gQ29uc3VsdCB5b3VyIHByb3ZpZGVyIGRvY3VtZW50YXRpb24uJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ3RydW5rPXllcycsXG4gICAgICAgICAgICAgICAgICAgICdqaXR0ZXJidWZmZXI9eWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2ZvcmNlaml0dGVyYnVmZmVyPXllcycsXG4gICAgICAgICAgICAgICAgICAgICdhbGxvdz1nNzI5LGFsYXcsdWxhdycsXG4gICAgICAgICAgICAgICAgICAgICdiYW5kd2lkdGg9bG93J1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIHx8ICdFeGFtcGxlIElBWCBjb25maWd1cmF0aW9uJyxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX25vdGUgfHwgJ09uZSBwYXJhbWV0ZXIgcGVyIGxpbmUuIElBWDIgcGFyYW1ldGVycyBhcmUgZGlmZmVyZW50IGZyb20gU0lQIHBhcmFtZXRlcnMuJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGVhY2ggZmllbGQgd2l0aCBpbmZvIGljb25cbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKF8sIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwcyBmcm9tIHN0cnVjdHVyZWQgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b29sdGlwRGF0YSAtIFRvb2x0aXAgZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIGlmICghdG9vbHRpcERhdGEpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaGVhZGVyIGlmIGV4aXN0c1xuICAgICAgICBpZiAodG9vbHRpcERhdGEuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke3Rvb2x0aXBEYXRhLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb24gaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+JHt0b29sdGlwRGF0YS5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGJ1aWxkIGxpc3QgSFRNTFxuICAgICAgICBjb25zdCBidWlsZExpc3QgPSAobGlzdCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFsaXN0IHx8IGxpc3QubGVuZ3RoID09PSAwKSByZXR1cm4gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxldCBsaXN0SHRtbCA9ICc8dWwgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7IHBhZGRpbmctbGVmdDogMS41ZW07XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2ltcGxlIGxpc3QgaXRlbVxuICAgICAgICAgICAgICAgICAgICBsaXN0SHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VjdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwOyBwYWRkaW5nLWxlZnQ6IDEuNWVtO1wiPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRlcm0gd2l0aCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGlzdEh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIHJldHVybiBsaXN0SHRtbDtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBtYWluIGxpc3QgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5saXN0ICYmIHRvb2x0aXBEYXRhLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSBidWlsZExpc3QodG9vbHRpcERhdGEubGlzdCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIGxpc3RzIChsaXN0MiB0aHJvdWdoIGxpc3QxMClcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdEtleSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGFbbGlzdEtleV0gJiYgdG9vbHRpcERhdGFbbGlzdEtleV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYnVpbGRMaXN0KHRvb2x0aXBEYXRhW2xpc3RLZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCIgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7XCI+JztcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke3Rvb2x0aXBEYXRhLndhcm5pbmcuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZy50ZXh0KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+JHt0b29sdGlwRGF0YS53YXJuaW5nLnRleHR9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZXhhbXBsZXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmV4YW1wbGVzICYmIHRvb2x0aXBEYXRhLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS5leGFtcGxlc0hlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxzdHJvbmc+JHt0b29sdGlwRGF0YS5leGFtcGxlc0hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODsgYm9yZGVyOiAxcHggc29saWQgI2UwZTBlMDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTsgbGluZS1oZWlnaHQ6IDEuNGVtO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLmV4YW1wbGVzLmZvckVhY2goKGxpbmUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmUudHJpbSgpLnN0YXJ0c1dpdGgoJ1snKSAmJiBsaW5lLnRyaW0oKS5lbmRzV2l0aCgnXScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IDApIGh0bWwgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICMwMDg0YjQ7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPiR7bGluZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxpbmUuaW5jbHVkZXMoJz0nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXJhbWV0ZXIgbGluZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBbcGFyYW0sIHZhbHVlXSA9IGxpbmUuc3BsaXQoJz0nLCAyKTtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgXFxuPHNwYW4gc3R5bGU9XCJjb2xvcjogIzdhM2U5ZDtcIj4ke3BhcmFtfTwvc3Bhbj49PHNwYW4gc3R5bGU9XCJjb2xvcjogI2NmNGE0YztcIj4ke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgbGluZVxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGxpbmUgPyBgXFxuJHtsaW5lfWAgOiAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub3RlIGlmIGV4aXN0c1xuICAgICAgICBpZiAodG9vbHRpcERhdGEubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGVtPiR7dG9vbHRpcERhdGEubm90ZX08L2VtPjwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYXV0by1yZXNpemUgZm9yIHRleHRhcmVhIGZpZWxkcyAobWFudWFsYXR0cmlidXRlcyBhbmQgbm90ZSlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQXV0b1Jlc2l6ZVRleHRhcmVhcygpIHtcbiAgICAgICAgLy8gU2V0dXAgYXV0by1yZXNpemUgZm9yIG1hbnVhbGF0dHJpYnV0ZXMgdGV4dGFyZWFcbiAgICAgICAgY29uc3QgJG1hbnVhbGF0dHJpYnV0ZXNUZXh0YXJlYSA9ICQoJ3RleHRhcmVhW25hbWU9XCJtYW51YWxhdHRyaWJ1dGVzXCJdJyk7XG4gICAgICAgIGlmICgkbWFudWFsYXR0cmlidXRlc1RleHRhcmVhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWwgcmVzaXplXG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJG1hbnVhbGF0dHJpYnV0ZXNUZXh0YXJlYSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBldmVudCBoYW5kbGVycyBmb3IgZHluYW1pYyByZXNpemVcbiAgICAgICAgICAgICRtYW51YWxhdHRyaWJ1dGVzVGV4dGFyZWEub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNldHVwIGF1dG8tcmVzaXplIGZvciBub3RlIHRleHRhcmVhICBcbiAgICAgICAgY29uc3QgJG5vdGVUZXh0YXJlYSA9ICQoJ3RleHRhcmVhW25hbWU9XCJub3RlXCJdJyk7XG4gICAgICAgIGlmICgkbm90ZVRleHRhcmVhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWwgcmVzaXplXG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJG5vdGVUZXh0YXJlYSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBldmVudCBoYW5kbGVycyBmb3IgZHluYW1pYyByZXNpemVcbiAgICAgICAgICAgICRub3RlVGV4dGFyZWEub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFsc28gdHJpZ2dlciByZXNpemUgYWZ0ZXIgZGF0YSBpcyBsb2FkZWQgKHdpdGggc2xpZ2h0IGRlbGF5IGZvciBET00gdXBkYXRlcylcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJG1hbnVhbGF0dHJpYnV0ZXNUZXh0YXJlYSk7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJG5vdGVUZXh0YXJlYSk7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgfVxufTtcblxuLy8gSW5pdGlhbGl6ZSB3aGVuIERPTSBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHByb3ZpZGVyLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==