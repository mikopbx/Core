"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, ProviderSipTooltipManager, ProviderTooltipManager, i18n, SipProvidersAPI */

/**
 * Custom validation rule: Check if regex pattern is valid
 * Only validates when the corresponding source dropdown is set to 'custom'
 */
$.fn.form.settings.rules.regexPattern = function (value, parameter) {
  // Parse parameter to get field type (cid or did)
  var fieldType = parameter || 'cid';
  var sourceField = fieldType === 'did' ? '#did_source' : '#cid_source'; // Skip validation if source is not 'custom'

  if ($(sourceField).val() !== 'custom') {
    return true;
  } // Allow empty values (field is optional)


  if (!value || value.trim() === '') {
    return true;
  } // Validate regex pattern


  try {
    new RegExp(value);
    return true;
  } catch (e) {
    console.log("Invalid ".concat(fieldType.toUpperCase(), " regex pattern:"), value, e.message);
    return false;
  }
};
/**
 * Custom validation rule: Check if custom header is valid
 * Only validates when the corresponding source dropdown is set to 'custom'
 */


$.fn.form.settings.rules.customHeader = function (value, parameter) {
  // Parse parameter to get field type (cid or did)
  var fieldType = parameter || 'cid';
  var sourceField = fieldType === 'did' ? '#did_source' : '#cid_source'; // Skip validation if source is not 'custom'

  if ($(sourceField).val() !== 'custom') {
    return true;
  } // Field is required when source is custom


  if (!value || value.trim() === '') {
    return false;
  } // Validate format: only letters, numbers, dash and underscore


  return /^[A-Za-z0-9-_]+$/.test(value);
};
/**
 * SIP provider management form
 * @class ProviderSIP
 */


var ProviderSIP = /*#__PURE__*/function (_ProviderBase) {
  _inherits(ProviderSIP, _ProviderBase);

  var _super = _createSuper(ProviderSIP);

  // SIP-specific selectors
  function ProviderSIP() {
    var _this;

    _classCallCheck(this, ProviderSIP);

    _this = _super.call(this, 'SIP');
    _this.$qualifyToggle = $('#qualify');
    _this.$qualifyFreqToggle = $('#qualify-freq'); // SIP-specific jQuery objects

    _this.$additionalHostsDummy = $(ProviderSIP.SIP_SELECTORS.ADDITIONAL_HOSTS_DUMMY);
    _this.$additionalHostsTemplate = $(ProviderSIP.SIP_SELECTORS.ADDITIONAL_HOSTS_TEMPLATE);
    _this.$additionalHostsTable = $(ProviderSIP.SIP_SELECTORS.ADDITIONAL_HOSTS_TABLE);
    _this.$additionalHostInput = $(ProviderSIP.SIP_SELECTORS.ADDITIONAL_HOST_INPUT);
    return _this;
  }
  /**
   * Initialize the provider form
   */


  _createClass(ProviderSIP, [{
    key: "initialize",
    value: function initialize() {
      var _this2 = this;

      _get(_getPrototypeOf(ProviderSIP.prototype), "initialize", this).call(this); // SIP-specific initialization


      this.$qualifyToggle.checkbox({
        onChange: function onChange() {
          if (_this2.$qualifyToggle.checkbox('is checked')) {
            _this2.$qualifyFreqToggle.removeClass('disabled');
          } else {
            _this2.$qualifyFreqToggle.addClass('disabled');
          }
        }
      });
      $('input[name="disablefromuser"]').on('change', function () {
        _this2.updateVisibilityElements();

        Form.dataChanged();
      }); // Initialize SIP-specific static dropdowns

      this.initializeDtmfModeDropdown();
      this.initializeTransportDropdown();
      this.initializeCallerIdSourceDropdown();
      this.initializeDidSourceDropdown(); // Initialize debug checkbox - using parent container with class selector

      $('#cid_did_debug').parent('.checkbox').checkbox(); // Initialize field help tooltips

      ProviderSipTooltipManager.initialize(); // Initialize tabs

      this.initializeTabs(); // Initialize SIP-specific components

      this.initializeSipEventHandlers();
      this.updateHostsTableView();
    }
    /**
     * Initialize tab functionality
     */

  }, {
    key: "initializeTabs",
    value: function initializeTabs() {
      var self = this; // Disable diagnostics tab for new providers

      if (this.isNewProvider) {
        $('#provider-tabs-menu .item[data-tab="diagnostics"]').addClass('disabled').css('opacity', '0.45').css('cursor', 'not-allowed');
      } else {
        $('#provider-tabs-menu .item[data-tab="diagnostics"]').removeClass('disabled').css('opacity', '').css('cursor', '');
      }

      $('#provider-tabs-menu .item').tab({
        onVisible: function onVisible(tabPath) {
          if (tabPath === 'diagnostics' && typeof providerModifyStatusWorker !== 'undefined' && !self.isNewProvider) {
            // Initialize diagnostics tab when it becomes visible
            providerModifyStatusWorker.initializeDiagnosticsTab();
          }
        },
        onLoad: function onLoad(tabPath, parameterArray, historyEvent) {
          // Block loading of diagnostics tab for new providers
          if (tabPath === 'diagnostics' && self.isNewProvider) {
            // Switch back to settings tab
            $('#provider-tabs-menu .item[data-tab="settings"]').tab('change tab', 'settings');
            return false;
          }
        }
      }); // Additional click prevention for disabled tab

      $('#provider-tabs-menu .item[data-tab="diagnostics"]').off('click.disabled').on('click.disabled', function (e) {
        if (self.isNewProvider) {
          e.preventDefault();
          e.stopImmediatePropagation(); // Ensure we stay on settings tab

          $('#provider-tabs-menu .item[data-tab="settings"]').tab('change tab', 'settings');
          return false;
        }
      });
    }
    /**
     * Initialize SIP-specific event handlers
     */

  }, {
    key: "initializeSipEventHandlers",
    value: function initializeSipEventHandlers() {
      var self = this; // Add new string to additional-hosts-table table

      this.$additionalHostInput.keypress(function (e) {
        if (e.which === 13) {
          self.cbOnCompleteHostAddress();
        }
      }); // Delete host from additional-hosts-table - use event delegation for dynamic elements

      this.$additionalHostsTable.on('click', ProviderSIP.SIP_SELECTORS.DELETE_ROW_BUTTON, function (e) {
        e.preventDefault();
        $(e.target).closest('tr').remove();
        self.updateHostsTableView();
        Form.dataChanged();
        return false;
      });
    }
    /**
     * Initialize DTMF mode dropdown with standard Fomantic UI (PHP-rendered)
     */

  }, {
    key: "initializeDtmfModeDropdown",
    value: function initializeDtmfModeDropdown() {
      var $dropdown = $('#dtmfmode-dropdown');
      if ($dropdown.length === 0) return; // Initialize with standard Fomantic UI - it's already rendered by PHP

      $dropdown.dropdown({
        onChange: function onChange() {
          return Form.dataChanged();
        }
      });
    }
    /**
     * Initialize transport protocol dropdown with standard Fomantic UI (PHP-rendered)
     */

  }, {
    key: "initializeTransportDropdown",
    value: function initializeTransportDropdown() {
      var $dropdown = $('#transport-dropdown');
      if ($dropdown.length === 0) return; // Initialize with standard Fomantic UI - it's already rendered by PHP

      $dropdown.dropdown({
        onChange: function onChange() {
          return Form.dataChanged();
        }
      });
    }
    /**
     * Initialize CallerID source dropdown with standard Fomantic UI (PHP-rendered)
     */

  }, {
    key: "initializeCallerIdSourceDropdown",
    value: function initializeCallerIdSourceDropdown() {
      var _this3 = this;

      var $dropdown = $('#cid_source-dropdown');
      if ($dropdown.length === 0) return; // Initialize with standard Fomantic UI - it's already rendered by PHP

      $dropdown.dropdown({
        onChange: function onChange(value) {
          _this3.onCallerIdSourceChange(value);

          Form.dataChanged();
        }
      });
    }
    /**
     * Initialize DID source dropdown with standard Fomantic UI (PHP-rendered)
     */

  }, {
    key: "initializeDidSourceDropdown",
    value: function initializeDidSourceDropdown() {
      var _this4 = this;

      var $dropdown = $('#did_source-dropdown');
      if ($dropdown.length === 0) return; // Initialize with standard Fomantic UI - it's already rendered by PHP

      $dropdown.dropdown({
        onChange: function onChange(value) {
          _this4.onDidSourceChange(value);

          Form.dataChanged();
        }
      });
    }
    /**
     * Handle CallerID source change
     * @param {string} value - Selected CallerID source
     */

  }, {
    key: "onCallerIdSourceChange",
    value: function onCallerIdSourceChange(value) {
      var $customSettings = $('#callerid-custom-settings');

      if (value === 'custom') {
        // Make custom header field required
        $('#cid_custom_header').closest('.field').addClass('required'); // Show custom settings using Fomantic UI transition

        $customSettings.transition('fade down');
      } else {
        // Hide custom settings using Fomantic UI transition
        $customSettings.transition('hide'); // Remove required status

        $('#cid_custom_header').closest('.field').removeClass('required'); // Clear custom fields when not in use

        $('#cid_custom_header').val('');
        $('#cid_parser_start').val('');
        $('#cid_parser_end').val('');
        $('#cid_parser_regex').val(''); // Clear any validation errors on hidden fields

        $('#cid_parser_regex').closest('.field').removeClass('error');
      } // No need to reinitialize form - validation rules check source automatically

    }
    /**
     * Handle DID source change
     * @param {string} value - Selected DID source
     */

  }, {
    key: "onDidSourceChange",
    value: function onDidSourceChange(value) {
      var $customSettings = $('#did-custom-settings');

      if (value === 'custom') {
        // Make custom header field required
        $('#did_custom_header').closest('.field').addClass('required'); // Show custom settings using Fomantic UI transition

        $customSettings.transition('fade down');
      } else {
        // Hide custom settings using Fomantic UI transition
        $customSettings.transition('hide'); // Remove required status

        $('#did_custom_header').closest('.field').removeClass('required'); // Clear custom fields when not in use

        $('#did_custom_header').val('');
        $('#did_parser_start').val('');
        $('#did_parser_end').val('');
        $('#did_parser_regex').val(''); // Clear any validation errors on hidden fields

        $('#did_parser_regex').closest('.field').removeClass('error');
      } // No need to reinitialize form - validation rules check source automatically

    }
    /**
     * Initialize form with REST API configuration
     */

  }, {
    key: "initializeForm",
    value: function initializeForm() {
      Form.$formObj = this.$formObj;
      Form.url = '#'; // Not used with REST API

      Form.validateRules = this.getValidateRules();
      Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this); // Configure REST API settings for v3

      Form.apiSettings = {
        enabled: true,
        apiObject: SipProvidersAPI,
        // Use SIP-specific API client v3
        saveMethod: 'saveRecord'
      }; // Navigation URLs

      Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "providers/index/");
      Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "providers/modifysip/"); // Enable automatic checkbox to boolean conversion

      Form.convertCheckboxesToBool = true; // Initialize the form - this was missing!

      Form.initialize(); // Mark form as fully initialized

      this.formInitialized = true;
    }
    /**
     * Callback before form submission
     */

  }, {
    key: "cbBeforeSendForm",
    value: function cbBeforeSendForm(settings) {
      var result = settings; // IMPORTANT: Don't overwrite result.data - it already contains processed checkbox values
      // Just add/modify specific fields
      // Add provider type

      result.data.type = this.providerType; // Handle additional hosts for SIP - collect from table

      var additionalHosts = [];
      $('#additional-hosts-table tbody tr.host-row').each(function (index, element) {
        var host = $(element).find('td.address').text().trim();

        if (host) {
          additionalHosts.push({
            address: host
          });
        }
      }); // Only add if there are hosts

      if (additionalHosts.length > 0) {
        result.data.additionalHosts = additionalHosts;
      }

      return result;
    }
    /**
     * Override populateFormData to handle SIP-specific data
     * @param {object} data - Provider data from API
     */

  }, {
    key: "populateFormData",
    value: function populateFormData(data) {
      // Call parent method first for common fields
      _get(_getPrototypeOf(ProviderSIP.prototype), "populateFormData", this).call(this, data);

      if (this.providerType === 'SIP') {
        // SIP-specific fields - backend provides defaults
        $('#dtmfmode').val(data.dtmfmode || '');
        $('#transport').val(data.transport || '');
        $('#fromuser').val(data.fromuser || '');
        $('#fromdomain').val(data.fromdomain || '');
        $('#outbound_proxy').val(data.outbound_proxy || ''); // SIP-specific checkboxes

        if (data.disablefromuser === '1' || data.disablefromuser === true) $('#disablefromuser').prop('checked', true); // Qualify frequency - backend provides default

        $('#qualifyfreq').val(data.qualifyfreq || ''); // CallerID/DID fields

        $('#cid_source').val(data.cid_source || 'default');
        $('#did_source').val(data.did_source || 'default');
        $('#cid_custom_header').val(data.cid_custom_header || '');
        $('#cid_parser_start').val(data.cid_parser_start || '');
        $('#cid_parser_end').val(data.cid_parser_end || '');
        $('#cid_parser_regex').val(data.cid_parser_regex || '');
        $('#did_custom_header').val(data.did_custom_header || '');
        $('#did_parser_start').val(data.did_parser_start || '');
        $('#did_parser_end').val(data.did_parser_end || '');
        $('#did_parser_regex').val(data.did_parser_regex || ''); // Update cid_did_debug checkbox

        if (data.cid_did_debug === '1' || data.cid_did_debug === true) {
          $('#cid_did_debug').prop('checked', true);
        } else {
          $('#cid_did_debug').prop('checked', false);
        } // Update dropdown values - backend provides defaults, just set selected values


        var dropdownUpdates = [{
          selector: '#dtmfmode-dropdown',
          value: data.dtmfmode || ''
        }, {
          selector: '#transport-dropdown',
          value: data.transport || ''
        }, {
          selector: '#registration_type-dropdown',
          value: data.registration_type || ''
        }, {
          selector: '#cid_source-dropdown',
          value: data.cid_source || ''
        }, {
          selector: '#did_source-dropdown',
          value: data.did_source || ''
        }];
        dropdownUpdates.forEach(function (_ref) {
          var selector = _ref.selector,
              value = _ref.value;
          var $dropdown = $(selector);

          if ($dropdown.length > 0) {
            $dropdown.dropdown('set selected', value);
          }
        }); // Additional hosts - populate after form is ready

        this.populateAdditionalHosts(data.additionalHosts);
      }
    }
    /**
     * Callback after form submission
     */

  }, {
    key: "cbAfterSendForm",
    value: function cbAfterSendForm(response) {
      _get(_getPrototypeOf(ProviderSIP.prototype), "cbAfterSendForm", this).call(this, response);

      if (response.result && response.data) {
        // Update form with response data if needed
        if (response.data.id && !$('#id').val()) {
          $('#id').val(response.data.id);
        } // The Form.js will handle the reload automatically if response.reload is present
        // For new records, REST API returns reload path like "providers/modifysip/SIP-TRUNK-xxx"

      }
    }
    /**
     * Get validation rules based on registration type
     * @returns {object} Validation rules
     */

  }, {
    key: "getValidateRules",
    value: function getValidateRules() {
      var _this5 = this;

      var regType = $('#registration_type').val();
      var rulesMap = {
        outbound: function outbound() {
          return _this5.getOutboundRules();
        },
        inbound: function inbound() {
          return _this5.getInboundRules();
        },
        none: function none() {
          return _this5.getNoneRules();
        }
      };
      var rules = rulesMap[regType] ? rulesMap[regType]() : this.getOutboundRules(); // Add CallerID/DID validation rules

      return this.addCallerIdDidRules(rules);
    }
    /**
     * Add CallerID/DID validation rules
     * @param {object} rules - Existing rules
     * @returns {object} Rules with CallerID/DID validation
     */

  }, {
    key: "addCallerIdDidRules",
    value: function addCallerIdDidRules(rules) {
      // Custom header validation using global custom rules
      rules.cid_custom_header = {
        identifier: 'cid_custom_header',
        optional: true,
        rules: [{
          type: 'customHeader[cid]',
          prompt: globalTranslate.pr_ValidateCustomHeaderEmpty || 'Please specify valid custom header name'
        }]
      };
      rules.did_custom_header = {
        identifier: 'did_custom_header',
        optional: true,
        rules: [{
          type: 'customHeader[did]',
          prompt: globalTranslate.pr_ValidateCustomHeaderEmpty || 'Please specify valid custom header name'
        }]
      }; // Regex pattern validation using global custom rules

      rules.cid_parser_regex = {
        identifier: 'cid_parser_regex',
        optional: true,
        rules: [{
          type: 'regexPattern[cid]',
          prompt: globalTranslate.pr_ValidateInvalidRegex || 'Invalid regular expression'
        }]
      };
      rules.did_parser_regex = {
        identifier: 'did_parser_regex',
        optional: true,
        rules: [{
          type: 'regexPattern[did]',
          prompt: globalTranslate.pr_ValidateInvalidRegex || 'Invalid regular expression'
        }]
      }; // Parser start/end fields don't need validation - they are truly optional
      // No rules needed for cid_parser_start, cid_parser_end, did_parser_start, did_parser_end

      return rules;
    }
    /**
     * Get validation rules for outbound registration
     */

  }, {
    key: "getOutboundRules",
    value: function getOutboundRules() {
      return {
        description: {
          identifier: 'description',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
          }]
        },
        host: {
          identifier: 'host',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
          }, {
            type: 'regExp',
            value: '/^[a-zA-Z0-9.-]+$/',
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters || 'Host can only contain letters, numbers, dots and hyphens'
          }]
        },
        username: {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }, {
            type: 'regExp',
            value: '^[a-zA-Z0-9_.-]+$',
            prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters || 'Username can only contain letters, numbers and symbols: _ - .'
          }]
        },
        secret: {
          identifier: 'secret',
          optional: true,
          rules: []
        },
        port: {
          identifier: 'port',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
          }, {
            type: 'integer[1..65535]',
            prompt: globalTranslate.pr_ValidationProviderPortInvalid
          }]
        },
        additional_hosts: {
          identifier: 'additional-host',
          optional: true,
          rules: [{
            type: 'regExp',
            value: this.hostInputValidation,
            prompt: globalTranslate.pr_ValidationAdditionalHostInvalid
          }]
        }
      };
    }
    /**
     * Get validation rules for inbound registration
     */

  }, {
    key: "getInboundRules",
    value: function getInboundRules() {
      return {
        description: {
          identifier: 'description',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
          }]
        },
        username: {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }, {
            type: 'regExp',
            value: '^[a-zA-Z0-9_.-]+$',
            prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters || 'Username can only contain letters, numbers and symbols: _ - .'
          }]
        },
        secret: {
          identifier: 'secret',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
          }, {
            type: 'minLength[8]',
            prompt: globalTranslate.pr_ValidationProviderPasswordTooShort
          }]
        },
        additional_hosts: {
          identifier: 'additional-host',
          optional: true,
          rules: [{
            type: 'regExp',
            value: this.hostInputValidation,
            prompt: globalTranslate.pr_ValidationAdditionalHostInvalid
          }]
        }
      };
    }
    /**
     * Get validation rules for none registration
     */

  }, {
    key: "getNoneRules",
    value: function getNoneRules() {
      return {
        description: {
          identifier: 'description',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
          }]
        },
        host: {
          identifier: 'host',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
          }, {
            type: 'regExp',
            value: '/^[a-zA-Z0-9.-]+$/',
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters || 'Host can only contain letters, numbers, dots and hyphens'
          }]
        },
        port: {
          identifier: 'port',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
          }, {
            type: 'integer[1..65535]',
            prompt: globalTranslate.pr_ValidationProviderPortInvalid
          }]
        },
        additional_hosts: {
          identifier: 'additional-host',
          optional: true,
          rules: [{
            type: 'regExp',
            value: this.hostInputValidation,
            prompt: globalTranslate.pr_ValidationAdditionalHostInvalid
          }]
        }
      };
    }
    /**
     * Update host label based on registration type
     */

  }, {
    key: "updateHostLabel",
    value: function updateHostLabel(regType) {
      var $hostLabelText = $('#hostLabelText');

      if (regType === 'outbound') {
        $hostLabelText.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host or IP Address');
      } else if (regType === 'none') {
        $hostLabelText.text(globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host or IP Address');
      } // For inbound, the field is hidden so no need to update label

    }
    /**
     * Update the visibility of elements based on the registration type
     */

  }, {
    key: "updateVisibilityElements",
    value: function updateVisibilityElements() {
      var _config$makeOptional,
          _config$clearValidati,
          _this6 = this;

      var regType = $('#registration_type').val();
      var providerId = $('#id').val(); // Cache DOM elements

      var elements = {
        host: $('#elHost'),
        port: $('#elPort'),
        username: $('#elUsername'),
        secret: $('#elSecret'),
        additionalHost: $('#elAdditionalHosts'),
        networkFilter: $('#elNetworkFilter')
      };
      var fields = {
        username: $('#username'),
        secret: this.$secret,
        networkFilterId: $('#networkfilterid')
      }; // Configuration for each registration type

      var configs = {
        outbound: {
          visible: ['host', 'port', 'username', 'secret', 'additionalHost'],
          hidden: ['networkFilter'],
          passwordWidget: {
            generateButton: false,
            showPasswordButton: false,
            clipboardButton: false,
            showStrengthBar: false,
            validation: PasswordWidget.VALIDATION.NONE
          },
          resetNetworkFilter: true
        },
        inbound: {
          visible: ['username', 'secret', 'networkFilter', 'additionalHost'],
          hidden: ['host', 'port'],
          passwordWidget: {
            generateButton: true,
            showPasswordButton: true,
            clipboardButton: true,
            showStrengthBar: true,
            validation: PasswordWidget.VALIDATION.SOFT
          },
          readonlyUsername: true,
          autoGeneratePassword: true,
          clearValidationFor: ['host', 'port']
        },
        none: {
          visible: ['host', 'port', 'username', 'secret', 'additionalHost', 'networkFilter'],
          hidden: [],
          passwordWidget: {
            generateButton: true,
            showPasswordButton: true,
            clipboardButton: true,
            showStrengthBar: true,
            validation: PasswordWidget.VALIDATION.SOFT
          },
          showPasswordTooltip: true,
          makeOptional: ['secret'],
          clearValidationFor: ['username', 'secret']
        }
      }; // Get current configuration

      var config = configs[regType] || configs.outbound; // Apply visibility

      config.visible.forEach(function (key) {
        var _elements$key;

        return (_elements$key = elements[key]) === null || _elements$key === void 0 ? void 0 : _elements$key.show();
      });
      config.hidden.forEach(function (key) {
        var _elements$key2;

        return (_elements$key2 = elements[key]) === null || _elements$key2 === void 0 ? void 0 : _elements$key2.hide();
      }); // Handle username field

      if (config.readonlyUsername) {
        fields.username.val(providerId).attr('readonly', '');
      } else {
        // Reset username if it matches provider ID when not inbound
        if (fields.username.val() === providerId && regType !== 'inbound') {
          fields.username.val('');
        }

        fields.username.removeAttr('readonly');
      } // Auto-generate password for inbound if empty


      if (config.autoGeneratePassword && fields.secret.val().trim() === '' && this.passwordWidget) {
        var _this$passwordWidget$;

        (_this$passwordWidget$ = this.passwordWidget.elements.$generateBtn) === null || _this$passwordWidget$ === void 0 ? void 0 : _this$passwordWidget$.trigger('click');
      } // Reset network filter for outbound


      if (config.resetNetworkFilter) {
        fields.networkFilterId.val('none');
      } // Update password widget configuration


      if (this.passwordWidget && config.passwordWidget) {
        PasswordWidget.updateConfig(this.passwordWidget, config.passwordWidget);
      } // Handle password tooltip


      if (config.showPasswordTooltip) {
        this.showPasswordTooltip();
      } else {
        this.hidePasswordTooltip();
      } // Make fields optional


      (_config$makeOptional = config.makeOptional) === null || _config$makeOptional === void 0 ? void 0 : _config$makeOptional.forEach(function (field) {
        $("#el".concat(field.charAt(0).toUpperCase() + field.slice(1))).removeClass('required');
      }); // Clear validation errors for specified fields

      (_config$clearValidati = config.clearValidationFor) === null || _config$clearValidati === void 0 ? void 0 : _config$clearValidati.forEach(function (field) {
        _this6.$formObj.form('remove prompt', field);

        $("#".concat(field)).closest('.field').removeClass('error');
      }); // Update host label

      this.updateHostLabel(regType); // Update element visibility based on 'disablefromuser' checkbox
      // Use the outer div.checkbox container instead of input element

      var el = $('input[name="disablefromuser"]').closest('.ui.checkbox');
      var fromUser = $('#divFromUser');

      if (el.length > 0 && el.checkbox('is checked')) {
        fromUser.hide();
        fromUser.removeClass('visible');
      } else {
        fromUser.show();
        fromUser.addClass('visible');
      } // Update CallerID custom settings visibility based on current dropdown value


      var cidDropdown = $('#cid_source-dropdown');

      if (cidDropdown.length > 0) {
        var cidValue = cidDropdown.dropdown('get value');
        var cidCustomSettings = $('#callerid-custom-settings');

        if (cidValue === 'custom') {
          // Show using Fomantic UI transition
          cidCustomSettings.transition('show');
        } else {
          // Hide using Fomantic UI transition
          cidCustomSettings.transition('hide');
        }
      } // Update DID custom settings visibility based on current dropdown value


      var didDropdown = $('#did_source-dropdown');

      if (didDropdown.length > 0) {
        var didValue = didDropdown.dropdown('get value');
        var didCustomSettings = $('#did-custom-settings');

        if (didValue === 'custom') {
          // Show using Fomantic UI transition
          didCustomSettings.transition('show');
        } else {
          // Hide using Fomantic UI transition
          didCustomSettings.transition('hide');
        }
      }
    }
    /**
     * Handle completion of host address input
     */

  }, {
    key: "cbOnCompleteHostAddress",
    value: function cbOnCompleteHostAddress() {
      var value = this.$formObj.form('get value', 'additional-host');

      if (value) {
        var validation = value.match(this.hostInputValidation); // Validate the input value

        if (validation === null || validation.length === 0) {
          this.$additionalHostInput.transition('shake');
          return;
        } // Check if the host address already exists


        if ($(".host-row[data-value=\"".concat(value, "\"]")).length === 0) {
          var $tr = this.$additionalHostsTemplate.last();
          var $clone = $tr.clone(false); // Use false since events are delegated

          $clone.removeClass('host-row-tpl').addClass('host-row').show();
          $clone.attr('data-value', value);
          $clone.find('.address').html(value);
          var $existingHostRows = this.$formObj.find(ProviderSIP.SIP_SELECTORS.HOST_ROW);

          if ($existingHostRows.last().length === 0) {
            $tr.after($clone);
          } else {
            $existingHostRows.last().after($clone);
          }

          this.updateHostsTableView();
          Form.dataChanged();
        }

        this.$additionalHostInput.val('');
      }
    }
    /**
     * Update the visibility of hosts table
     */

  }, {
    key: "updateHostsTableView",
    value: function updateHostsTableView() {
      var $hostRows = this.$formObj.find(ProviderSIP.SIP_SELECTORS.HOST_ROW);

      if ($hostRows.length === 0) {
        this.$additionalHostsDummy.show();
      } else {
        this.$additionalHostsDummy.hide();
      }
    }
    /**
     * Populate additional hosts from API data
     * @param {array} additionalHosts - Array of additional hosts from API
     */

  }, {
    key: "populateAdditionalHosts",
    value: function populateAdditionalHosts(additionalHosts) {
      var _this7 = this;

      if (!additionalHosts || !Array.isArray(additionalHosts)) {
        return;
      } // Clear existing hosts first (except template and dummy)


      this.$additionalHostsTable.find("tbody tr".concat(ProviderSIP.SIP_SELECTORS.HOST_ROW)).remove(); // Add each host using the same logic as cbOnCompleteHostAddress

      additionalHosts.forEach(function (hostObj) {
        // Handle both object format {id, address} and string format
        var hostAddress = typeof hostObj === 'string' ? hostObj : hostObj.address;

        if (hostAddress && hostAddress.trim()) {
          // Use the same logic as cbOnCompleteHostAddress
          var $tr = _this7.$additionalHostsTemplate.last();

          var $clone = $tr.clone(false); // Use false since events are delegated

          $clone.removeClass('host-row-tpl').addClass('host-row').show();
          $clone.attr('data-value', hostAddress);
          $clone.find('.address').html(hostAddress); // Insert the cloned row

          var $existingHostRows = _this7.$formObj.find(ProviderSIP.SIP_SELECTORS.HOST_ROW);

          if ($existingHostRows.last().length === 0) {
            $tr.after($clone);
          } else {
            $existingHostRows.last().after($clone);
          }
        }
      }); // Update table visibility

      this.updateHostsTableView();
    }
  }]);

  return ProviderSIP;
}(ProviderBase);
/**
 * Initialize provider form on document ready
 */


_defineProperty(ProviderSIP, "SIP_SELECTORS", {
  ADDITIONAL_HOSTS_TABLE: '#additional-hosts-table',
  ADDITIONAL_HOSTS_DUMMY: '#additional-hosts-table .dummy',
  ADDITIONAL_HOSTS_TEMPLATE: '#additional-hosts-table .host-row-tpl',
  ADDITIONAL_HOST_INPUT: '#additional-host input',
  DELETE_ROW_BUTTON: '.delete-row-button',
  HOST_ROW: '.host-row'
});

$(document).ready(function () {
  var provider = new ProviderSIP();
  provider.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsInJlZ2V4UGF0dGVybiIsInZhbHVlIiwicGFyYW1ldGVyIiwiZmllbGRUeXBlIiwic291cmNlRmllbGQiLCJ2YWwiLCJ0cmltIiwiUmVnRXhwIiwiZSIsImNvbnNvbGUiLCJsb2ciLCJ0b1VwcGVyQ2FzZSIsIm1lc3NhZ2UiLCJjdXN0b21IZWFkZXIiLCJ0ZXN0IiwiUHJvdmlkZXJTSVAiLCIkcXVhbGlmeVRvZ2dsZSIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duIiwiaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duIiwicGFyZW50IiwiUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVGFicyIsImluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJzZWxmIiwiaXNOZXdQcm92aWRlciIsImNzcyIsInRhYiIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciIsImluaXRpYWxpemVEaWFnbm9zdGljc1RhYiIsIm9uTG9hZCIsInBhcmFtZXRlckFycmF5IiwiaGlzdG9yeUV2ZW50Iiwib2ZmIiwicHJldmVudERlZmF1bHQiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCJrZXlwcmVzcyIsIndoaWNoIiwiY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MiLCJERUxFVEVfUk9XX0JVVFRPTiIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmUiLCIkZHJvcGRvd24iLCJsZW5ndGgiLCJkcm9wZG93biIsIm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UiLCJvbkRpZFNvdXJjZUNoYW5nZSIsIiRjdXN0b21TZXR0aW5ncyIsInRyYW5zaXRpb24iLCIkZm9ybU9iaiIsInVybCIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwiY2JCZWZvcmVTZW5kRm9ybSIsImJpbmQiLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJTaXBQcm92aWRlcnNBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiZm9ybUluaXRpYWxpemVkIiwicmVzdWx0IiwiZGF0YSIsInR5cGUiLCJwcm92aWRlclR5cGUiLCJhZGRpdGlvbmFsSG9zdHMiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiaG9zdCIsImZpbmQiLCJ0ZXh0IiwicHVzaCIsImFkZHJlc3MiLCJkdG1mbW9kZSIsInRyYW5zcG9ydCIsImZyb211c2VyIiwiZnJvbWRvbWFpbiIsIm91dGJvdW5kX3Byb3h5IiwiZGlzYWJsZWZyb211c2VyIiwicHJvcCIsInF1YWxpZnlmcmVxIiwiY2lkX3NvdXJjZSIsImRpZF9zb3VyY2UiLCJjaWRfY3VzdG9tX2hlYWRlciIsImNpZF9wYXJzZXJfc3RhcnQiLCJjaWRfcGFyc2VyX2VuZCIsImNpZF9wYXJzZXJfcmVnZXgiLCJkaWRfY3VzdG9tX2hlYWRlciIsImRpZF9wYXJzZXJfc3RhcnQiLCJkaWRfcGFyc2VyX2VuZCIsImRpZF9wYXJzZXJfcmVnZXgiLCJjaWRfZGlkX2RlYnVnIiwiZHJvcGRvd25VcGRhdGVzIiwic2VsZWN0b3IiLCJyZWdpc3RyYXRpb25fdHlwZSIsImZvckVhY2giLCJwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyIsInJlc3BvbnNlIiwiaWQiLCJyZWdUeXBlIiwicnVsZXNNYXAiLCJvdXRib3VuZCIsImdldE91dGJvdW5kUnVsZXMiLCJpbmJvdW5kIiwiZ2V0SW5ib3VuZFJ1bGVzIiwibm9uZSIsImdldE5vbmVSdWxlcyIsImFkZENhbGxlcklkRGlkUnVsZXMiLCJpZGVudGlmaWVyIiwib3B0aW9uYWwiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5IiwicHJfVmFsaWRhdGVJbnZhbGlkUmVnZXgiLCJkZXNjcmlwdGlvbiIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJzZWNyZXQiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCIsImFkZGl0aW9uYWxfaG9zdHMiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwicHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IiwiJGhvc3RMYWJlbFRleHQiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsInByb3ZpZGVySWQiLCJlbGVtZW50cyIsImFkZGl0aW9uYWxIb3N0IiwibmV0d29ya0ZpbHRlciIsImZpZWxkcyIsIiRzZWNyZXQiLCJuZXR3b3JrRmlsdGVySWQiLCJjb25maWdzIiwidmlzaWJsZSIsImhpZGRlbiIsInBhc3N3b3JkV2lkZ2V0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJ2YWxpZGF0aW9uIiwiUGFzc3dvcmRXaWRnZXQiLCJWQUxJREFUSU9OIiwiTk9ORSIsInJlc2V0TmV0d29ya0ZpbHRlciIsIlNPRlQiLCJyZWFkb25seVVzZXJuYW1lIiwiYXV0b0dlbmVyYXRlUGFzc3dvcmQiLCJjbGVhclZhbGlkYXRpb25Gb3IiLCJzaG93UGFzc3dvcmRUb29sdGlwIiwibWFrZU9wdGlvbmFsIiwiY29uZmlnIiwia2V5Iiwic2hvdyIsImhpZGUiLCJhdHRyIiwicmVtb3ZlQXR0ciIsIiRnZW5lcmF0ZUJ0biIsInRyaWdnZXIiLCJ1cGRhdGVDb25maWciLCJoaWRlUGFzc3dvcmRUb29sdGlwIiwiZmllbGQiLCJjaGFyQXQiLCJzbGljZSIsInVwZGF0ZUhvc3RMYWJlbCIsImVsIiwiZnJvbVVzZXIiLCJjaWREcm9wZG93biIsImNpZFZhbHVlIiwiY2lkQ3VzdG9tU2V0dGluZ3MiLCJkaWREcm9wZG93biIsImRpZFZhbHVlIiwiZGlkQ3VzdG9tU2V0dGluZ3MiLCJtYXRjaCIsIiR0ciIsImxhc3QiLCIkY2xvbmUiLCJjbG9uZSIsImh0bWwiLCIkZXhpc3RpbmdIb3N0Um93cyIsIkhPU1RfUk9XIiwiYWZ0ZXIiLCIkaG9zdFJvd3MiLCJBcnJheSIsImlzQXJyYXkiLCJob3N0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QWtCLFlBQU07QUFDcEIsTUFBTUMsUUFBUSxHQUFHLElBQUlyTixXQUFKLEVBQWpCO0FBQ0FxTixFQUFBQSxRQUFRLENBQUMzTCxVQUFUO0FBQ0gsQ0FIRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFByb3ZpZGVyQmFzZSwgUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciwgUHJvdmlkZXJUb29sdGlwTWFuYWdlciwgaTE4biwgU2lwUHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZTogQ2hlY2sgaWYgcmVnZXggcGF0dGVybiBpcyB2YWxpZFxuICogT25seSB2YWxpZGF0ZXMgd2hlbiB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgZHJvcGRvd24gaXMgc2V0IHRvICdjdXN0b20nXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5yZWdleFBhdHRlcm4gPSAodmFsdWUsIHBhcmFtZXRlcikgPT4ge1xuICAgIC8vIFBhcnNlIHBhcmFtZXRlciB0byBnZXQgZmllbGQgdHlwZSAoY2lkIG9yIGRpZClcbiAgICBjb25zdCBmaWVsZFR5cGUgPSBwYXJhbWV0ZXIgfHwgJ2NpZCc7XG4gICAgY29uc3Qgc291cmNlRmllbGQgPSBmaWVsZFR5cGUgPT09ICdkaWQnID8gJyNkaWRfc291cmNlJyA6ICcjY2lkX3NvdXJjZSc7XG5cbiAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgc291cmNlIGlzIG5vdCAnY3VzdG9tJ1xuICAgIGlmICgkKHNvdXJjZUZpZWxkKS52YWwoKSAhPT0gJ2N1c3RvbScpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQWxsb3cgZW1wdHkgdmFsdWVzIChmaWVsZCBpcyBvcHRpb25hbClcbiAgICBpZiAoIXZhbHVlIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgcmVnZXggcGF0dGVyblxuICAgIHRyeSB7XG4gICAgICAgIG5ldyBSZWdFeHAodmFsdWUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBJbnZhbGlkICR7ZmllbGRUeXBlLnRvVXBwZXJDYXNlKCl9IHJlZ2V4IHBhdHRlcm46YCwgdmFsdWUsIGUubWVzc2FnZSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGU6IENoZWNrIGlmIGN1c3RvbSBoZWFkZXIgaXMgdmFsaWRcbiAqIE9ubHkgdmFsaWRhdGVzIHdoZW4gdGhlIGNvcnJlc3BvbmRpbmcgc291cmNlIGRyb3Bkb3duIGlzIHNldCB0byAnY3VzdG9tJ1xuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tSGVhZGVyID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+IHtcbiAgICAvLyBQYXJzZSBwYXJhbWV0ZXIgdG8gZ2V0IGZpZWxkIHR5cGUgKGNpZCBvciBkaWQpXG4gICAgY29uc3QgZmllbGRUeXBlID0gcGFyYW1ldGVyIHx8ICdjaWQnO1xuICAgIGNvbnN0IHNvdXJjZUZpZWxkID0gZmllbGRUeXBlID09PSAnZGlkJyA/ICcjZGlkX3NvdXJjZScgOiAnI2NpZF9zb3VyY2UnO1xuXG4gICAgLy8gU2tpcCB2YWxpZGF0aW9uIGlmIHNvdXJjZSBpcyBub3QgJ2N1c3RvbSdcbiAgICBpZiAoJChzb3VyY2VGaWVsZCkudmFsKCkgIT09ICdjdXN0b20nKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIEZpZWxkIGlzIHJlcXVpcmVkIHdoZW4gc291cmNlIGlzIGN1c3RvbVxuICAgIGlmICghdmFsdWUgfHwgdmFsdWUudHJpbSgpID09PSAnJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgZm9ybWF0OiBvbmx5IGxldHRlcnMsIG51bWJlcnMsIGRhc2ggYW5kIHVuZGVyc2NvcmVcbiAgICByZXR1cm4gL15bQS1aYS16MC05LV9dKyQvLnRlc3QodmFsdWUpO1xufTtcblxuLyoqXG4gKiBTSVAgcHJvdmlkZXIgbWFuYWdlbWVudCBmb3JtXG4gKiBAY2xhc3MgUHJvdmlkZXJTSVBcbiAqL1xuY2xhc3MgUHJvdmlkZXJTSVAgZXh0ZW5kcyBQcm92aWRlckJhc2UgeyAgXG4gICAgLy8gU0lQLXNwZWNpZmljIHNlbGVjdG9yc1xuICAgIHN0YXRpYyBTSVBfU0VMRUNUT1JTID0ge1xuICAgICAgICBBRERJVElPTkFMX0hPU1RTX1RBQkxFOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUnLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RTX0RVTU1ZOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmR1bW15JyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19URU1QTEFURTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5ob3N0LXJvdy10cGwnLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RfSU5QVVQ6ICcjYWRkaXRpb25hbC1ob3N0IGlucHV0JyxcbiAgICAgICAgREVMRVRFX1JPV19CVVRUT046ICcuZGVsZXRlLXJvdy1idXR0b24nLFxuICAgICAgICBIT1NUX1JPVzogJy5ob3N0LXJvdydcbiAgICB9O1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcignU0lQJyk7XG4gICAgICAgIHRoaXMuJHF1YWxpZnlUb2dnbGUgPSAkKCcjcXVhbGlmeScpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZSA9ICQoJyNxdWFsaWZ5LWZyZXEnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBqUXVlcnkgb2JqZWN0c1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX0RVTU1ZKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGVtcGxhdGUgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19URU1QTEFURSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfVEFCTEUpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0ID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVF9JTlBVVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTsgXG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdGhpcy4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImRpc2FibGVmcm9tdXNlclwiXScpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIHN0YXRpYyBkcm9wZG93bnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYnVnIGNoZWNrYm94IC0gdXNpbmcgcGFyZW50IGNvbnRhaW5lciB3aXRoIGNsYXNzIHNlbGVjdG9yXG4gICAgICAgICQoJyNjaWRfZGlkX2RlYnVnJykucGFyZW50KCcuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIFByb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRhYnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGNvbXBvbmVudHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFiIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFicygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpYWdub3N0aWNzIHRhYiBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICBpZiAodGhpcy5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ29wYWNpdHknLCAnMC40NScpXG4gICAgICAgICAgICAgICAgLmNzcygnY3Vyc29yJywgJ25vdC1hbGxvd2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ29wYWNpdHknLCAnJylcbiAgICAgICAgICAgICAgICAuY3NzKCdjdXJzb3InLCAnJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiAodGFiUGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHR5cGVvZiBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciAhPT0gJ3VuZGVmaW5lZCcgJiYgIXNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiB3aGVuIGl0IGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25Mb2FkOiAodGFiUGF0aCwgcGFyYW1ldGVyQXJyYXksIGhpc3RvcnlFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEJsb2NrIGxvYWRpbmcgb2YgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN3aXRjaCBiYWNrIHRvIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNsaWNrIHByZXZlbnRpb24gZm9yIGRpc2FibGVkIHRhYlxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKS5vZmYoJ2NsaWNrLmRpc2FibGVkJykub24oJ2NsaWNrLmRpc2FibGVkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBzdGF5IG9uIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNpcEV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyBzdHJpbmcgdG8gYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0YWJsZVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LmtleXByZXNzKChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBob3N0IGZyb20gYWRkaXRpb25hbC1ob3N0cy10YWJsZSAtIHVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlLm9uKCdjbGljaycsIFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuREVMRVRFX1JPV19CVVRUT04sIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEVE1GIG1vZGUgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjZHRtZm1vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJhbnNwb3J0IHByb3RvY29sIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyN0cmFuc3BvcnQtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgQ2FsbGVySUQgc291cmNlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2FsbGVySWRTb3VyY2VEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI2NpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRElEIHNvdXJjZSBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjZGlkX3NvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMub25EaWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBDYWxsZXJJRCBzb3VyY2UgY2hhbmdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgQ2FsbGVySUQgc291cmNlXG4gICAgICovXG4gICAgb25DYWxsZXJJZFNvdXJjZUNoYW5nZSh2YWx1ZSkge1xuICAgICAgICBjb25zdCAkY3VzdG9tU2V0dGluZ3MgPSAkKCcjY2FsbGVyaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIC8vIE1ha2UgY3VzdG9tIGhlYWRlciBmaWVsZCByZXF1aXJlZFxuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBTaG93IGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignZmFkZSBkb3duJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlcXVpcmVkIHN0YXR1c1xuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBjdXN0b20gZmllbGRzIHdoZW4gbm90IGluIHVzZVxuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3N0YXJ0JykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX2VuZCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9yZWdleCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBhbnkgdmFsaWRhdGlvbiBlcnJvcnMgb24gaGlkZGVuIGZpZWxkc1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfcmVnZXgnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBObyBuZWVkIHRvIHJlaW5pdGlhbGl6ZSBmb3JtIC0gdmFsaWRhdGlvbiBydWxlcyBjaGVjayBzb3VyY2UgYXV0b21hdGljYWxseVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRElEIHNvdXJjZSBjaGFuZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBTZWxlY3RlZCBESUQgc291cmNlXG4gICAgICovXG4gICAgb25EaWRTb3VyY2VDaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGN1c3RvbVNldHRpbmdzID0gJCgnI2RpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgaWYgKHZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgLy8gTWFrZSBjdXN0b20gaGVhZGVyIGZpZWxkIHJlcXVpcmVkXG4gICAgICAgICAgICAkKCcjZGlkX2N1c3RvbV9oZWFkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIC8vIFNob3cgY3VzdG9tIHNldHRpbmdzIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICRjdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdmYWRlIGRvd24nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgY3VzdG9tIHNldHRpbmdzIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICRjdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdoaWRlJyk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgcmVxdWlyZWQgc3RhdHVzXG4gICAgICAgICAgICAkKCcjZGlkX2N1c3RvbV9oZWFkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGN1c3RvbSBmaWVsZHMgd2hlbiBub3QgaW4gdXNlXG4gICAgICAgICAgICAkKCcjZGlkX2N1c3RvbV9oZWFkZXInKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfc3RhcnQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfZW5kJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3JlZ2V4JykudmFsKCcnKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGFueSB2YWxpZGF0aW9uIGVycm9ycyBvbiBoaWRkZW4gZmllbGRzXG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9yZWdleCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE5vIG5lZWQgdG8gcmVpbml0aWFsaXplIGZvcm0gLSB2YWxpZGF0aW9uIHJ1bGVzIGNoZWNrIHNvdXJjZSBhdXRvbWF0aWNhbGx5XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciB2M1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU2lwUHJvdmlkZXJzQVBJLCAvLyBVc2UgU0lQLXNwZWNpZmljIEFQSSBjbGllbnQgdjNcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnlzaXAvYDtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybSAtIHRoaXMgd2FzIG1pc3NpbmchXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTWFyayBmb3JtIGFzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgIHRoaXMuZm9ybUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIC8vIElNUE9SVEFOVDogRG9uJ3Qgb3ZlcndyaXRlIHJlc3VsdC5kYXRhIC0gaXQgYWxyZWFkeSBjb250YWlucyBwcm9jZXNzZWQgY2hlY2tib3ggdmFsdWVzXG4gICAgICAgIC8vIEp1c3QgYWRkL21vZGlmeSBzcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBwcm92aWRlciB0eXBlXG4gICAgICAgIHJlc3VsdC5kYXRhLnR5cGUgPSB0aGlzLnByb3ZpZGVyVHlwZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBhZGRpdGlvbmFsIGhvc3RzIGZvciBTSVAgLSBjb2xsZWN0IGZyb20gdGFibGVcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbEhvc3RzID0gW107XG4gICAgICAgICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRib2R5IHRyLmhvc3Qtcm93JykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGhvc3QgPSAkKGVsZW1lbnQpLmZpbmQoJ3RkLmFkZHJlc3MnKS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsSG9zdHMucHVzaCh7IGFkZHJlc3M6IGhvc3QgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gT25seSBhZGQgaWYgdGhlcmUgYXJlIGhvc3RzXG4gICAgICAgIGlmIChhZGRpdGlvbmFsSG9zdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWRkaXRpb25hbEhvc3RzID0gYWRkaXRpb25hbEhvc3RzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBPdmVycmlkZSBwb3B1bGF0ZUZvcm1EYXRhIHRvIGhhbmRsZSBTSVAtc3BlY2lmaWMgZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBtZXRob2QgZmlyc3QgZm9yIGNvbW1vbiBmaWVsZHNcbiAgICAgICAgc3VwZXIucG9wdWxhdGVGb3JtRGF0YShkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgIC8vIFNJUC1zcGVjaWZpYyBmaWVsZHMgLSBiYWNrZW5kIHByb3ZpZGVzIGRlZmF1bHRzXG4gICAgICAgICAgICAkKCcjZHRtZm1vZGUnKS52YWwoZGF0YS5kdG1mbW9kZSB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjdHJhbnNwb3J0JykudmFsKGRhdGEudHJhbnNwb3J0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNmcm9tdXNlcicpLnZhbChkYXRhLmZyb211c2VyIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNmcm9tZG9tYWluJykudmFsKGRhdGEuZnJvbWRvbWFpbiB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjb3V0Ym91bmRfcHJveHknKS52YWwoZGF0YS5vdXRib3VuZF9wcm94eSB8fCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNJUC1zcGVjaWZpYyBjaGVja2JveGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5kaXNhYmxlZnJvbXVzZXIgPT09ICcxJyB8fCBkYXRhLmRpc2FibGVmcm9tdXNlciA9PT0gdHJ1ZSkgJCgnI2Rpc2FibGVmcm9tdXNlcicpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUXVhbGlmeSBmcmVxdWVuY3kgLSBiYWNrZW5kIHByb3ZpZGVzIGRlZmF1bHRcbiAgICAgICAgICAgICQoJyNxdWFsaWZ5ZnJlcScpLnZhbChkYXRhLnF1YWxpZnlmcmVxIHx8ICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbGVySUQvRElEIGZpZWxkc1xuICAgICAgICAgICAgJCgnI2NpZF9zb3VyY2UnKS52YWwoZGF0YS5jaWRfc291cmNlIHx8ICdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAkKCcjZGlkX3NvdXJjZScpLnZhbChkYXRhLmRpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLnZhbChkYXRhLmNpZF9jdXN0b21faGVhZGVyIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3N0YXJ0JykudmFsKGRhdGEuY2lkX3BhcnNlcl9zdGFydCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9lbmQnKS52YWwoZGF0YS5jaWRfcGFyc2VyX2VuZCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9yZWdleCcpLnZhbChkYXRhLmNpZF9wYXJzZXJfcmVnZXggfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykudmFsKGRhdGEuZGlkX2N1c3RvbV9oZWFkZXIgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfc3RhcnQnKS52YWwoZGF0YS5kaWRfcGFyc2VyX3N0YXJ0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX2VuZCcpLnZhbChkYXRhLmRpZF9wYXJzZXJfZW5kIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3JlZ2V4JykudmFsKGRhdGEuZGlkX3BhcnNlcl9yZWdleCB8fCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBjaWRfZGlkX2RlYnVnIGNoZWNrYm94XG4gICAgICAgICAgICBpZiAoZGF0YS5jaWRfZGlkX2RlYnVnID09PSAnMScgfHwgZGF0YS5jaWRfZGlkX2RlYnVnID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgJCgnI2NpZF9kaWRfZGVidWcnKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyNjaWRfZGlkX2RlYnVnJykucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHZhbHVlcyAtIGJhY2tlbmQgcHJvdmlkZXMgZGVmYXVsdHMsIGp1c3Qgc2V0IHNlbGVjdGVkIHZhbHVlc1xuICAgICAgICAgICAgY29uc3QgZHJvcGRvd25VcGRhdGVzID0gW1xuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjZHRtZm1vZGUtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5kdG1mbW9kZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjdHJhbnNwb3J0LWRyb3Bkb3duJywgdmFsdWU6IGRhdGEudHJhbnNwb3J0IHx8ICcnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJyNyZWdpc3RyYXRpb25fdHlwZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLnJlZ2lzdHJhdGlvbl90eXBlIHx8ICcnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJyNjaWRfc291cmNlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuY2lkX3NvdXJjZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjZGlkX3NvdXJjZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmRpZF9zb3VyY2UgfHwgJycgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZHJvcGRvd25VcGRhdGVzLmZvckVhY2goKHsgc2VsZWN0b3IsIHZhbHVlIH0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZGl0aW9uYWwgaG9zdHMgLSBwb3B1bGF0ZSBhZnRlciBmb3JtIGlzIHJlYWR5XG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGRhdGEuYWRkaXRpb25hbEhvc3RzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgc3VwZXIuY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuaWQgJiYgISQoJyNpZCcpLnZhbCgpKSB7XG4gICAgICAgICAgICAgICAgJCgnI2lkJykudmFsKHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGUgRm9ybS5qcyB3aWxsIGhhbmRsZSB0aGUgcmVsb2FkIGF1dG9tYXRpY2FsbHkgaWYgcmVzcG9uc2UucmVsb2FkIGlzIHByZXNlbnRcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgUkVTVCBBUEkgcmV0dXJucyByZWxvYWQgcGF0aCBsaWtlIFwicHJvdmlkZXJzL21vZGlmeXNpcC9TSVAtVFJVTksteHh4XCJcbiAgICAgICAgfVxuICAgIH1cbiAgICBcblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcnVsZXNNYXAgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDogKCkgPT4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCksXG4gICAgICAgICAgICBpbmJvdW5kOiAoKSA9PiB0aGlzLmdldEluYm91bmRSdWxlcygpLFxuICAgICAgICAgICAgbm9uZTogKCkgPT4gdGhpcy5nZXROb25lUnVsZXMoKSxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJ1bGVzID0gcnVsZXNNYXBbcmVnVHlwZV0gPyBydWxlc01hcFtyZWdUeXBlXSgpIDogdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQ2FsbGVySUQvRElEIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkQ2FsbGVySWREaWRSdWxlcyhydWxlcyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvbiBydWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBydWxlcyAtIEV4aXN0aW5nIHJ1bGVzXG4gICAgICogQHJldHVybnMge29iamVjdH0gUnVsZXMgd2l0aCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvblxuICAgICAqL1xuICAgIGFkZENhbGxlcklkRGlkUnVsZXMocnVsZXMpIHtcbiAgICAgICAgLy8gQ3VzdG9tIGhlYWRlciB2YWxpZGF0aW9uIHVzaW5nIGdsb2JhbCBjdXN0b20gcnVsZXNcbiAgICAgICAgcnVsZXMuY2lkX2N1c3RvbV9oZWFkZXIgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY2lkX2N1c3RvbV9oZWFkZXInLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tSGVhZGVyW2NpZF0nLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRW1wdHkgfHwgJ1BsZWFzZSBzcGVjaWZ5IHZhbGlkIGN1c3RvbSBoZWFkZXIgbmFtZScsXG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLmRpZF9jdXN0b21faGVhZGVyID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2RpZF9jdXN0b21faGVhZGVyJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbUhlYWRlcltkaWRdJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5IHx8ICdQbGVhc2Ugc3BlY2lmeSB2YWxpZCBjdXN0b20gaGVhZGVyIG5hbWUnLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZWdleCBwYXR0ZXJuIHZhbGlkYXRpb24gdXNpbmcgZ2xvYmFsIGN1c3RvbSBydWxlc1xuICAgICAgICBydWxlcy5jaWRfcGFyc2VyX3JlZ2V4ID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NpZF9wYXJzZXJfcmVnZXgnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnZXhQYXR0ZXJuW2NpZF0nLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlSW52YWxpZFJlZ2V4IHx8ICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbidcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuZGlkX3BhcnNlcl9yZWdleCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkaWRfcGFyc2VyX3JlZ2V4JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ2V4UGF0dGVybltkaWRdJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUludmFsaWRSZWdleCB8fCAnSW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb24nXG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFBhcnNlciBzdGFydC9lbmQgZmllbGRzIGRvbid0IG5lZWQgdmFsaWRhdGlvbiAtIHRoZXkgYXJlIHRydWx5IG9wdGlvbmFsXG4gICAgICAgIC8vIE5vIHJ1bGVzIG5lZWRlZCBmb3IgY2lkX3BhcnNlcl9zdGFydCwgY2lkX3BhcnNlcl9lbmQsIGRpZF9wYXJzZXJfc3RhcnQsIGRpZF9wYXJzZXJfZW5kXG5cbiAgICAgICAgcmV0dXJuIHJ1bGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRPdXRib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyB8fCAnSG9zdCBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMgYW5kIGh5cGhlbnMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeW2EtekEtWjAtOV8uLV0rJCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzIHx8ICdVc2VybmFtZSBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMgYW5kIHN5bWJvbHM6IF8gLSAuJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnXlthLXpBLVowLTlfLi1dKyQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyB8fCAnVXNlcm5hbWUgY2FuIG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzIGFuZCBzeW1ib2xzOiBfIC0gLicsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG5vbmUgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9uZVJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyB8fCAnSG9zdCBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMgYW5kIGh5cGhlbnMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBob3N0IGxhYmVsIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpIHtcbiAgICAgICAgY29uc3QgJGhvc3RMYWJlbFRleHQgPSAkKCcjaG9zdExhYmVsVGV4dCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgICRob3N0TGFiZWxUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0IG9yIElQIEFkZHJlc3MnKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICRob3N0TGFiZWxUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyB8fCAnUmVtb3RlIEhvc3Qgb3IgSVAgQWRkcmVzcycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZvciBpbmJvdW5kLCB0aGUgZmllbGQgaXMgaGlkZGVuIHNvIG5vIG5lZWQgdG8gdXBkYXRlIGxhYmVsXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiB0aGUgcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0ge1xuICAgICAgICAgICAgaG9zdDogJCgnI2VsSG9zdCcpLFxuICAgICAgICAgICAgcG9ydDogJCgnI2VsUG9ydCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyNlbFVzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6ICQoJyNlbFNlY3JldCcpLFxuICAgICAgICAgICAgYWRkaXRpb25hbEhvc3Q6ICQoJyNlbEFkZGl0aW9uYWxIb3N0cycpLFxuICAgICAgICAgICAgbmV0d29ya0ZpbHRlcjogJCgnI2VsTmV0d29ya0ZpbHRlcicpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZHMgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6IHRoaXMuJHNlY3JldCxcbiAgICAgICAgICAgIG5ldHdvcmtGaWx0ZXJJZDogJCgnI25ldHdvcmtmaWx0ZXJpZCcpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGNvbnN0IGNvbmZpZ3MgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdhZGRpdGlvbmFsSG9zdCddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWyduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLk5PTkVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlc2V0TmV0d29ya0ZpbHRlcjogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluYm91bmQ6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ3VzZXJuYW1lJywgJ3NlY3JldCcsICduZXR3b3JrRmlsdGVyJywgJ2FkZGl0aW9uYWxIb3N0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ2hvc3QnLCAncG9ydCddLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlYWRvbmx5VXNlcm5hbWU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXV0b0dlbmVyYXRlUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY2xlYXJWYWxpZGF0aW9uRm9yOiBbJ2hvc3QnLCAncG9ydCddXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm9uZToge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdhZGRpdGlvbmFsSG9zdCcsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbXSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRUb29sdGlwOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1ha2VPcHRpb25hbDogWydzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBjbGVhclZhbGlkYXRpb25Gb3I6IFsndXNlcm5hbWUnLCAnc2VjcmV0J11cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY29uZmlnID0gY29uZmlnc1tyZWdUeXBlXSB8fCBjb25maWdzLm91dGJvdW5kO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgdmlzaWJpbGl0eVxuICAgICAgICBjb25maWcudmlzaWJsZS5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5zaG93KCkpO1xuICAgICAgICBjb25maWcuaGlkZGVuLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LmhpZGUoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgZmllbGRcbiAgICAgICAgaWYgKGNvbmZpZy5yZWFkb25seVVzZXJuYW1lKSB7XG4gICAgICAgICAgICBmaWVsZHMudXNlcm5hbWUudmFsKHByb3ZpZGVySWQpLmF0dHIoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmVzZXQgdXNlcm5hbWUgaWYgaXQgbWF0Y2hlcyBwcm92aWRlciBJRCB3aGVuIG5vdCBpbmJvdW5kXG4gICAgICAgICAgICBpZiAoZmllbGRzLnVzZXJuYW1lLnZhbCgpID09PSBwcm92aWRlcklkICYmIHJlZ1R5cGUgIT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgaWYgZW1wdHlcbiAgICAgICAgaWYgKGNvbmZpZy5hdXRvR2VuZXJhdGVQYXNzd29yZCAmJiBmaWVsZHMuc2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycgJiYgdGhpcy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgdGhpcy5wYXNzd29yZFdpZGdldC5lbGVtZW50cy4kZ2VuZXJhdGVCdG4/LnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlc2V0IG5ldHdvcmsgZmlsdGVyIGZvciBvdXRib3VuZFxuICAgICAgICBpZiAoY29uZmlnLnJlc2V0TmV0d29ya0ZpbHRlcikge1xuICAgICAgICAgICAgZmllbGRzLm5ldHdvcmtGaWx0ZXJJZC52YWwoJ25vbmUnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHdpZGdldCBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmICh0aGlzLnBhc3N3b3JkV2lkZ2V0ICYmIGNvbmZpZy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQudXBkYXRlQ29uZmlnKHRoaXMucGFzc3dvcmRXaWRnZXQsIGNvbmZpZy5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCB0b29sdGlwXG4gICAgICAgIGlmIChjb25maWcuc2hvd1Bhc3N3b3JkVG9vbHRpcCkge1xuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTWFrZSBmaWVsZHMgb3B0aW9uYWxcbiAgICAgICAgY29uZmlnLm1ha2VPcHRpb25hbD8uZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICAkKGAjZWwke2ZpZWxkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZmllbGQuc2xpY2UoMSl9YCkucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnMgZm9yIHNwZWNpZmllZCBmaWVsZHNcbiAgICAgICAgY29uZmlnLmNsZWFyVmFsaWRhdGlvbkZvcj8uZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZCk7XG4gICAgICAgICAgICAkKGAjJHtmaWVsZH1gKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaG9zdCBsYWJlbFxuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RMYWJlbChyZWdUeXBlKTsgXG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiAnZGlzYWJsZWZyb211c2VyJyBjaGVja2JveFxuICAgICAgICAvLyBVc2UgdGhlIG91dGVyIGRpdi5jaGVja2JveCBjb250YWluZXIgaW5zdGVhZCBvZiBpbnB1dCBlbGVtZW50XG4gICAgICAgIGNvbnN0IGVsID0gJCgnaW5wdXRbbmFtZT1cImRpc2FibGVmcm9tdXNlclwiXScpLmNsb3Nlc3QoJy51aS5jaGVja2JveCcpO1xuICAgICAgICBjb25zdCBmcm9tVXNlciA9ICQoJyNkaXZGcm9tVXNlcicpO1xuICAgICAgICBpZiAoZWwubGVuZ3RoID4gMCAmJiBlbC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBmcm9tVXNlci5oaWRlKCk7XG4gICAgICAgICAgICBmcm9tVXNlci5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbVVzZXIuc2hvdygpO1xuICAgICAgICAgICAgZnJvbVVzZXIuYWRkQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBDYWxsZXJJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGNpZERyb3Bkb3duID0gJCgnI2NpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKGNpZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGNpZFZhbHVlID0gY2lkRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgY2lkQ3VzdG9tU2V0dGluZ3MgPSAkKCcjY2FsbGVyaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgICAgICBpZiAoY2lkVmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgY2lkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignc2hvdycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBjaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdoaWRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBESUQgY3VzdG9tIHNldHRpbmdzIHZpc2liaWxpdHkgYmFzZWQgb24gY3VycmVudCBkcm9wZG93biB2YWx1ZVxuICAgICAgICBjb25zdCBkaWREcm9wZG93biA9ICQoJyNkaWRfc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmIChkaWREcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkaWRWYWx1ZSA9IGRpZERyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGRpZEN1c3RvbVNldHRpbmdzID0gJCgnI2RpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgICAgIGlmIChkaWRWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBkaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdzaG93Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGRpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY29tcGxldGlvbiBvZiBob3N0IGFkZHJlc3MgaW5wdXRcbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdhZGRpdGlvbmFsLWhvc3QnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IHZhbHVlLm1hdGNoKHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBpbnB1dCB2YWx1ZVxuICAgICAgICAgICAgaWYgKHZhbGlkYXRpb24gPT09IG51bGwgfHwgdmFsaWRhdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgaG9zdCBhZGRyZXNzIGFscmVhZHkgZXhpc3RzXG4gICAgICAgICAgICBpZiAoJChgLmhvc3Qtcm93W2RhdGEtdmFsdWU9XFxcIiR7dmFsdWV9XFxcIl1gKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdHIgPSB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZS5sYXN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGNsb25lID0gJHRyLmNsb25lKGZhbHNlKTsgLy8gVXNlIGZhbHNlIHNpbmNlIGV2ZW50cyBhcmUgZGVsZWdhdGVkXG4gICAgICAgICAgICAgICAgJGNsb25lXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaG9zdC1yb3ctdHBsJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdob3N0LXJvdycpXG4gICAgICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmZpbmQoJy5hZGRyZXNzJykuaHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGV4aXN0aW5nSG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgICAgICAgICAgaWYgKCRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJHRyLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgaG9zdHMgdGFibGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0c1RhYmxlVmlldygpIHtcbiAgICAgICAgY29uc3QgJGhvc3RSb3dzID0gdGhpcy4kZm9ybU9iai5maW5kKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1cpO1xuICAgICAgICBpZiAoJGhvc3RSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGFkZGl0aW9uYWwgaG9zdHMgZnJvbSBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGFkZGl0aW9uYWxIb3N0cyAtIEFycmF5IG9mIGFkZGl0aW9uYWwgaG9zdHMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyhhZGRpdGlvbmFsSG9zdHMpIHtcbiAgICAgICAgaWYgKCFhZGRpdGlvbmFsSG9zdHMgfHwgIUFycmF5LmlzQXJyYXkoYWRkaXRpb25hbEhvc3RzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBob3N0cyBmaXJzdCAoZXhjZXB0IHRlbXBsYXRlIGFuZCBkdW1teSlcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGFibGUuZmluZChgdGJvZHkgdHIke1Byb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1d9YCkucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZWFjaCBob3N0IHVzaW5nIHRoZSBzYW1lIGxvZ2ljIGFzIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzXG4gICAgICAgIGFkZGl0aW9uYWxIb3N0cy5mb3JFYWNoKChob3N0T2JqKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgYm90aCBvYmplY3QgZm9ybWF0IHtpZCwgYWRkcmVzc30gYW5kIHN0cmluZyBmb3JtYXRcbiAgICAgICAgICAgIGNvbnN0IGhvc3RBZGRyZXNzID0gdHlwZW9mIGhvc3RPYmogPT09ICdzdHJpbmcnID8gaG9zdE9iaiA6IGhvc3RPYmouYWRkcmVzcztcbiAgICAgICAgICAgIGlmIChob3N0QWRkcmVzcyAmJiBob3N0QWRkcmVzcy50cmltKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdGhlIHNhbWUgbG9naWMgYXMgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3NcbiAgICAgICAgICAgICAgICBjb25zdCAkdHIgPSB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZS5sYXN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGNsb25lID0gJHRyLmNsb25lKGZhbHNlKTsgLy8gVXNlIGZhbHNlIHNpbmNlIGV2ZW50cyBhcmUgZGVsZWdhdGVkXG4gICAgICAgICAgICAgICAgJGNsb25lXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaG9zdC1yb3ctdHBsJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdob3N0LXJvdycpXG4gICAgICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCBob3N0QWRkcmVzcyk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmZpbmQoJy5hZGRyZXNzJykuaHRtbChob3N0QWRkcmVzcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5zZXJ0IHRoZSBjbG9uZWQgcm93XG4gICAgICAgICAgICAgICAgY29uc3QgJGV4aXN0aW5nSG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgICAgICAgICAgaWYgKCRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJHRyLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0YWJsZSB2aXNpYmlsaXR5XG4gICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICB9XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBwcm92aWRlciBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IG5ldyBQcm92aWRlclNJUCgpO1xuICAgIHByb3ZpZGVyLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==