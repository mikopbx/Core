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
          prompt: globalTranslate.pr_ValidateCustomHeaderEmpty
        }]
      };
      rules.did_custom_header = {
        identifier: 'did_custom_header',
        optional: true,
        rules: [{
          type: 'customHeader[did]',
          prompt: globalTranslate.pr_ValidateCustomHeaderEmpty
        }]
      }; // Regex pattern validation using global custom rules

      rules.cid_parser_regex = {
        identifier: 'cid_parser_regex',
        optional: true,
        rules: [{
          type: 'regexPattern[cid]',
          prompt: globalTranslate.pr_ValidateInvalidRegex
        }]
      };
      rules.did_parser_regex = {
        identifier: 'did_parser_regex',
        optional: true,
        rules: [{
          type: 'regexPattern[did]',
          prompt: globalTranslate.pr_ValidateInvalidRegex
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
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters
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
            prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters
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
            prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters
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
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters
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
        $hostLabelText.text(globalTranslate.pr_ProviderHostOrIPAddress);
      } else if (regType === 'none') {
        $hostLabelText.text(globalTranslate.pr_RemoteHostOrIPAddress);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsInJlZ2V4UGF0dGVybiIsInZhbHVlIiwicGFyYW1ldGVyIiwiZmllbGRUeXBlIiwic291cmNlRmllbGQiLCJ2YWwiLCJ0cmltIiwiUmVnRXhwIiwiZSIsImNvbnNvbGUiLCJsb2ciLCJ0b1VwcGVyQ2FzZSIsIm1lc3NhZ2UiLCJjdXN0b21IZWFkZXIiLCJ0ZXN0IiwiUHJvdmlkZXJTSVAiLCIkcXVhbGlmeVRvZ2dsZSIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duIiwiaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duIiwicGFyZW50IiwiUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVGFicyIsImluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJzZWxmIiwiaXNOZXdQcm92aWRlciIsImNzcyIsInRhYiIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciIsImluaXRpYWxpemVEaWFnbm9zdGljc1RhYiIsIm9uTG9hZCIsInBhcmFtZXRlckFycmF5IiwiaGlzdG9yeUV2ZW50Iiwib2ZmIiwicHJldmVudERlZmF1bHQiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCJrZXlwcmVzcyIsIndoaWNoIiwiY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MiLCJERUxFVEVfUk9XX0JVVFRPTiIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmUiLCIkZHJvcGRvd24iLCJsZW5ndGgiLCJkcm9wZG93biIsIm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UiLCJvbkRpZFNvdXJjZUNoYW5nZSIsIiRjdXN0b21TZXR0aW5ncyIsInRyYW5zaXRpb24iLCIkZm9ybU9iaiIsInVybCIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwiY2JCZWZvcmVTZW5kRm9ybSIsImJpbmQiLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJTaXBQcm92aWRlcnNBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiZm9ybUluaXRpYWxpemVkIiwicmVzdWx0IiwiZGF0YSIsInR5cGUiLCJwcm92aWRlclR5cGUiLCJhZGRpdGlvbmFsSG9zdHMiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiaG9zdCIsImZpbmQiLCJ0ZXh0IiwicHVzaCIsImFkZHJlc3MiLCJkdG1mbW9kZSIsInRyYW5zcG9ydCIsImZyb211c2VyIiwiZnJvbWRvbWFpbiIsIm91dGJvdW5kX3Byb3h5IiwiZGlzYWJsZWZyb211c2VyIiwicHJvcCIsInF1YWxpZnlmcmVxIiwiY2lkX3NvdXJjZSIsImRpZF9zb3VyY2UiLCJjaWRfY3VzdG9tX2hlYWRlciIsImNpZF9wYXJzZXJfc3RhcnQiLCJjaWRfcGFyc2VyX2VuZCIsImNpZF9wYXJzZXJfcmVnZXgiLCJkaWRfY3VzdG9tX2hlYWRlciIsImRpZF9wYXJzZXJfc3RhcnQiLCJkaWRfcGFyc2VyX2VuZCIsImRpZF9wYXJzZXJfcmVnZXgiLCJjaWRfZGlkX2RlYnVnIiwiZHJvcGRvd25VcGRhdGVzIiwic2VsZWN0b3IiLCJyZWdpc3RyYXRpb25fdHlwZSIsImZvckVhY2giLCJwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyIsInJlc3BvbnNlIiwiaWQiLCJyZWdUeXBlIiwicnVsZXNNYXAiLCJvdXRib3VuZCIsImdldE91dGJvdW5kUnVsZXMiLCJpbmJvdW5kIiwiZ2V0SW5ib3VuZFJ1bGVzIiwibm9uZSIsImdldE5vbmVSdWxlcyIsImFkZENhbGxlcklkRGlkUnVsZXMiLCJpZGVudGlmaWVyIiwib3B0aW9uYWwiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5IiwicHJfVmFsaWRhdGVJbnZhbGlkUmVnZXgiLCJkZXNjcmlwdGlvbiIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJzZWNyZXQiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCIsImFkZGl0aW9uYWxfaG9zdHMiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwicHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IiwiJGhvc3RMYWJlbFRleHQiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsInByb3ZpZGVySWQiLCJlbGVtZW50cyIsImFkZGl0aW9uYWxIb3N0IiwibmV0d29ya0ZpbHRlciIsImZpZWxkcyIsIiRzZWNyZXQiLCJuZXR3b3JrRmlsdGVySWQiLCJjb25maWdzIiwidmlzaWJsZSIsImhpZGRlbiIsInBhc3N3b3JkV2lkZ2V0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJ2YWxpZGF0aW9uIiwiUGFzc3dvcmRXaWRnZXQiLCJWQUxJREFUSU9OIiwiTk9ORSIsInJlc2V0TmV0d29ya0ZpbHRlciIsIlNPRlQiLCJyZWFkb25seVVzZXJuYW1lIiwiYXV0b0dlbmVyYXRlUGFzc3dvcmQiLCJjbGVhclZhbGlkYXRpb25Gb3IiLCJzaG93UGFzc3dvcmRUb29sdGlwIiwibWFrZU9wdGlvbmFsIiwiY29uZmlnIiwia2V5Iiwic2hvdyIsImhpZGUiLCJhdHRyIiwicmVtb3ZlQXR0ciIsIiRnZW5lcmF0ZUJ0biIsInRyaWdnZXIiLCJ1cGRhdGVDb25maWciLCJoaWRlUGFzc3dvcmRUb29sdGlwIiwiZmllbGQiLCJjaGFyQXQiLCJzbGljZSIsInVwZGF0ZUhvc3RMYWJlbCIsImVsIiwiZnJvbVVzZXIiLCJjaWREcm9wZG93biIsImNpZFZhbHVlIiwiY2lkQ3VzdG9tU2V0dGluZ3MiLCJkaWREcm9wZG93biIsImRpZFZhbHVlIiwiZGlkQ3VzdG9tU2V0dGluZ3MiLCJtYXRjaCIsIiR0ciIsImxhc3QiLCIkY2xvbmUiLCJjbG9uZSIsImh0bWwiLCIkZXhpc3RpbmdIb3N0Um93cyIsIkhPU1RfUk9XIiwiYWZ0ZXIiLCIkaG9zdFJvd3MiLCJBcnJheSIsImlzQXJyYXkiLCJob3N0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IHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyLCBQcm92aWRlclRvb2x0aXBNYW5hZ2VyLCBpMThuLCBTaXBQcm92aWRlcnNBUEkgKi9cblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlOiBDaGVjayBpZiByZWdleCBwYXR0ZXJuIGlzIHZhbGlkXG4gKiBPbmx5IHZhbGlkYXRlcyB3aGVuIHRoZSBjb3JyZXNwb25kaW5nIHNvdXJjZSBkcm9wZG93biBpcyBzZXQgdG8gJ2N1c3RvbSdcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnJlZ2V4UGF0dGVybiA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiB7XG4gICAgLy8gUGFyc2UgcGFyYW1ldGVyIHRvIGdldCBmaWVsZCB0eXBlIChjaWQgb3IgZGlkKVxuICAgIGNvbnN0IGZpZWxkVHlwZSA9IHBhcmFtZXRlciB8fCAnY2lkJztcbiAgICBjb25zdCBzb3VyY2VGaWVsZCA9IGZpZWxkVHlwZSA9PT0gJ2RpZCcgPyAnI2RpZF9zb3VyY2UnIDogJyNjaWRfc291cmNlJztcblxuICAgIC8vIFNraXAgdmFsaWRhdGlvbiBpZiBzb3VyY2UgaXMgbm90ICdjdXN0b20nXG4gICAgaWYgKCQoc291cmNlRmllbGQpLnZhbCgpICE9PSAnY3VzdG9tJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBBbGxvdyBlbXB0eSB2YWx1ZXMgKGZpZWxkIGlzIG9wdGlvbmFsKVxuICAgIGlmICghdmFsdWUgfHwgdmFsdWUudHJpbSgpID09PSAnJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSByZWdleCBwYXR0ZXJuXG4gICAgdHJ5IHtcbiAgICAgICAgbmV3IFJlZ0V4cCh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coYEludmFsaWQgJHtmaWVsZFR5cGUudG9VcHBlckNhc2UoKX0gcmVnZXggcGF0dGVybjpgLCB2YWx1ZSwgZS5tZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZTogQ2hlY2sgaWYgY3VzdG9tIGhlYWRlciBpcyB2YWxpZFxuICogT25seSB2YWxpZGF0ZXMgd2hlbiB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgZHJvcGRvd24gaXMgc2V0IHRvICdjdXN0b20nXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21IZWFkZXIgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4ge1xuICAgIC8vIFBhcnNlIHBhcmFtZXRlciB0byBnZXQgZmllbGQgdHlwZSAoY2lkIG9yIGRpZClcbiAgICBjb25zdCBmaWVsZFR5cGUgPSBwYXJhbWV0ZXIgfHwgJ2NpZCc7XG4gICAgY29uc3Qgc291cmNlRmllbGQgPSBmaWVsZFR5cGUgPT09ICdkaWQnID8gJyNkaWRfc291cmNlJyA6ICcjY2lkX3NvdXJjZSc7XG5cbiAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgc291cmNlIGlzIG5vdCAnY3VzdG9tJ1xuICAgIGlmICgkKHNvdXJjZUZpZWxkKS52YWwoKSAhPT0gJ2N1c3RvbScpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRmllbGQgaXMgcmVxdWlyZWQgd2hlbiBzb3VyY2UgaXMgY3VzdG9tXG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBmb3JtYXQ6IG9ubHkgbGV0dGVycywgbnVtYmVycywgZGFzaCBhbmQgdW5kZXJzY29yZVxuICAgIHJldHVybiAvXltBLVphLXowLTktX10rJC8udGVzdCh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIFNJUCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlclNJUFxuICovXG5jbGFzcyBQcm92aWRlclNJUCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7ICBcbiAgICAvLyBTSVAtc3BlY2lmaWMgc2VsZWN0b3JzXG4gICAgc3RhdGljIFNJUF9TRUxFQ1RPUlMgPSB7XG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfVEFCTEU6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZScsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfRFVNTVk6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuZHVtbXknLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RTX1RFTVBMQVRFOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmhvc3Qtcm93LXRwbCcsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVF9JTlBVVDogJyNhZGRpdGlvbmFsLWhvc3QgaW5wdXQnLFxuICAgICAgICBERUxFVEVfUk9XX0JVVFRPTjogJy5kZWxldGUtcm93LWJ1dHRvbicsXG4gICAgICAgIEhPU1RfUk9XOiAnLmhvc3Qtcm93J1xuICAgIH07XG4gICAgXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCdTSVAnKTtcbiAgICAgICAgdGhpcy4kcXVhbGlmeVRvZ2dsZSA9ICQoJyNxdWFsaWZ5Jyk7XG4gICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlID0gJCgnI3F1YWxpZnktZnJlcScpO1xuICAgICAgICBcbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIGpRdWVyeSBvYmplY3RzXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15ID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfRFVNTVkpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX1RFTVBMQVRFKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGFibGUgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19UQUJMRSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUX0lOUFVUKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpOyBcbiAgICAgICAgXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAkKCdpbnB1dFtuYW1lPVwiZGlzYWJsZWZyb211c2VyXCJdJykub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTSVAtc3BlY2lmaWMgc3RhdGljIGRyb3Bkb3duc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNhbGxlcklkU291cmNlRHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGlkU291cmNlRHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVidWcgY2hlY2tib3ggLSB1c2luZyBwYXJlbnQgY29udGFpbmVyIHdpdGggY2xhc3Mgc2VsZWN0b3JcbiAgICAgICAgJCgnI2NpZF9kaWRfZGVidWcnKS5wYXJlbnQoJy5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgICAgUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGFicygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTSVAtc3BlY2lmaWMgY29tcG9uZW50c1xuICAgICAgICB0aGlzLmluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgIGlmICh0aGlzLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmNzcygnb3BhY2l0eScsICcwLjQ1JylcbiAgICAgICAgICAgICAgICAuY3NzKCdjdXJzb3InLCAnbm90LWFsbG93ZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmNzcygnb3BhY2l0eScsICcnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ2N1cnNvcicsICcnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6ICh0YWJQYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgdHlwZW9mIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyICE9PSAndW5kZWZpbmVkJyAmJiAhc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIHdoZW4gaXQgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmluaXRpYWxpemVEaWFnbm9zdGljc1RhYigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkxvYWQ6ICh0YWJQYXRoLCBwYXJhbWV0ZXJBcnJheSwgaGlzdG9yeUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQmxvY2sgbG9hZGluZyBvZiBkaWFnbm9zdGljcyB0YWIgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiBzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3dpdGNoIGJhY2sgdG8gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2xpY2sgcHJldmVudGlvbiBmb3IgZGlzYWJsZWQgdGFiXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpLm9mZignY2xpY2suZGlzYWJsZWQnKS5vbignY2xpY2suZGlzYWJsZWQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBpZiAoc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIHN0YXkgb24gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cInNldHRpbmdzXCJdJykudGFiKCdjaGFuZ2UgdGFiJywgJ3NldHRpbmdzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBTSVAtc3BlY2lmaWMgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbmV3IHN0cmluZyB0byBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRhYmxlXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQua2V5cHJlc3MoKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLndoaWNoID09PSAxMykge1xuICAgICAgICAgICAgICAgIHNlbGYuY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGhvc3QgZnJvbSBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC0gdXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGR5bmFtaWMgZWxlbWVudHNcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGFibGUub24oJ2NsaWNrJywgUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5ERUxFVEVfUk9XX0JVVFRPTiwgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERUTUYgbW9kZSBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNkdG1mbW9kZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0cmFuc3BvcnQgcHJvdG9jb2wgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3RyYW5zcG9ydC1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBDYWxsZXJJRCBzb3VyY2UgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjY2lkX3NvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMub25DYWxsZXJJZFNvdXJjZUNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBESUQgc291cmNlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlkU291cmNlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNkaWRfc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkRpZFNvdXJjZUNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIENhbGxlcklEIHNvdXJjZSBjaGFuZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBTZWxlY3RlZCBDYWxsZXJJRCBzb3VyY2VcbiAgICAgKi9cbiAgICBvbkNhbGxlcklkU291cmNlQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjdXN0b21TZXR0aW5ncyA9ICQoJyNjYWxsZXJpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgaWYgKHZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgLy8gTWFrZSBjdXN0b20gaGVhZGVyIGZpZWxkIHJlcXVpcmVkXG4gICAgICAgICAgICAkKCcjY2lkX2N1c3RvbV9oZWFkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIC8vIFNob3cgY3VzdG9tIHNldHRpbmdzIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICRjdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdmYWRlIGRvd24nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgY3VzdG9tIHNldHRpbmdzIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICRjdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdoaWRlJyk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgcmVxdWlyZWQgc3RhdHVzXG4gICAgICAgICAgICAkKCcjY2lkX2N1c3RvbV9oZWFkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGN1c3RvbSBmaWVsZHMgd2hlbiBub3QgaW4gdXNlXG4gICAgICAgICAgICAkKCcjY2lkX2N1c3RvbV9oZWFkZXInKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfc3RhcnQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfZW5kJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3JlZ2V4JykudmFsKCcnKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGFueSB2YWxpZGF0aW9uIGVycm9ycyBvbiBoaWRkZW4gZmllbGRzXG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9yZWdleCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE5vIG5lZWQgdG8gcmVpbml0aWFsaXplIGZvcm0gLSB2YWxpZGF0aW9uIHJ1bGVzIGNoZWNrIHNvdXJjZSBhdXRvbWF0aWNhbGx5XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBESUQgc291cmNlIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIERJRCBzb3VyY2VcbiAgICAgKi9cbiAgICBvbkRpZFNvdXJjZUNoYW5nZSh2YWx1ZSkge1xuICAgICAgICBjb25zdCAkY3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICBpZiAodmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIGN1c3RvbSBoZWFkZXIgZmllbGQgcmVxdWlyZWRcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2ZhZGUgZG93bicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSByZXF1aXJlZCBzdGF0dXNcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIGZpZWxkcyB3aGVuIG5vdCBpbiB1c2VcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9zdGFydCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9lbmQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoJycpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgYW55IHZhbGlkYXRpb24gZXJyb3JzIG9uIGhpZGRlbiBmaWVsZHNcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3JlZ2V4JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm8gbmVlZCB0byByZWluaXRpYWxpemUgZm9ybSAtIHZhbGlkYXRpb24gcnVsZXMgY2hlY2sgc291cmNlIGF1dG9tYXRpY2FsbHlcbiAgICB9XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIHYzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBTaXBQcm92aWRlcnNBUEksIC8vIFVzZSBTSVAtc3BlY2lmaWMgQVBJIGNsaWVudCB2M1xuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeXNpcC9gO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtIC0gdGhpcyB3YXMgbWlzc2luZyFcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gSU1QT1JUQU5UOiBEb24ndCBvdmVyd3JpdGUgcmVzdWx0LmRhdGEgLSBpdCBhbHJlYWR5IGNvbnRhaW5zIHByb2Nlc3NlZCBjaGVja2JveCB2YWx1ZXNcbiAgICAgICAgLy8gSnVzdCBhZGQvbW9kaWZ5IHNwZWNpZmljIGZpZWxkc1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9IHRoaXMucHJvdmlkZXJUeXBlO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGFkZGl0aW9uYWwgaG9zdHMgZm9yIFNJUCAtIGNvbGxlY3QgZnJvbSB0YWJsZVxuICAgICAgICBjb25zdCBhZGRpdGlvbmFsSG9zdHMgPSBbXTtcbiAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHkgdHIuaG9zdC1yb3cnKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaG9zdCA9ICQoZWxlbWVudCkuZmluZCgndGQuYWRkcmVzcycpLnRleHQoKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxIb3N0cy5wdXNoKHsgYWRkcmVzczogaG9zdCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBPbmx5IGFkZCBpZiB0aGVyZSBhcmUgaG9zdHNcbiAgICAgICAgaWYgKGFkZGl0aW9uYWxIb3N0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hZGRpdGlvbmFsSG9zdHMgPSBhZGRpdGlvbmFsSG9zdHM7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIE92ZXJyaWRlIHBvcHVsYXRlRm9ybURhdGEgdG8gaGFuZGxlIFNJUC1zcGVjaWZpYyBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IG1ldGhvZCBmaXJzdCBmb3IgY29tbW9uIGZpZWxkc1xuICAgICAgICBzdXBlci5wb3B1bGF0ZUZvcm1EYXRhKGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMucHJvdmlkZXJUeXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgLy8gU0lQLXNwZWNpZmljIGZpZWxkcyAtIGJhY2tlbmQgcHJvdmlkZXMgZGVmYXVsdHNcbiAgICAgICAgICAgICQoJyNkdG1mbW9kZScpLnZhbChkYXRhLmR0bWZtb2RlIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyN0cmFuc3BvcnQnKS52YWwoZGF0YS50cmFuc3BvcnQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2Zyb211c2VyJykudmFsKGRhdGEuZnJvbXVzZXIgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2Zyb21kb21haW4nKS52YWwoZGF0YS5mcm9tZG9tYWluIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNvdXRib3VuZF9wcm94eScpLnZhbChkYXRhLm91dGJvdW5kX3Byb3h5IHx8ICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU0lQLXNwZWNpZmljIGNoZWNrYm94ZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmRpc2FibGVmcm9tdXNlciA9PT0gJzEnIHx8IGRhdGEuZGlzYWJsZWZyb211c2VyID09PSB0cnVlKSAkKCcjZGlzYWJsZWZyb211c2VyJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBRdWFsaWZ5IGZyZXF1ZW5jeSAtIGJhY2tlbmQgcHJvdmlkZXMgZGVmYXVsdFxuICAgICAgICAgICAgJCgnI3F1YWxpZnlmcmVxJykudmFsKGRhdGEucXVhbGlmeWZyZXEgfHwgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsZXJJRC9ESUQgZmllbGRzXG4gICAgICAgICAgICAkKCcjY2lkX3NvdXJjZScpLnZhbChkYXRhLmNpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICQoJyNkaWRfc291cmNlJykudmFsKGRhdGEuZGlkX3NvdXJjZSB8fCAnZGVmYXVsdCcpO1xuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykudmFsKGRhdGEuY2lkX2N1c3RvbV9oZWFkZXIgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfc3RhcnQnKS52YWwoZGF0YS5jaWRfcGFyc2VyX3N0YXJ0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX2VuZCcpLnZhbChkYXRhLmNpZF9wYXJzZXJfZW5kIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3JlZ2V4JykudmFsKGRhdGEuY2lkX3BhcnNlcl9yZWdleCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX2N1c3RvbV9oZWFkZXInKS52YWwoZGF0YS5kaWRfY3VzdG9tX2hlYWRlciB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9zdGFydCcpLnZhbChkYXRhLmRpZF9wYXJzZXJfc3RhcnQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfZW5kJykudmFsKGRhdGEuZGlkX3BhcnNlcl9lbmQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoZGF0YS5kaWRfcGFyc2VyX3JlZ2V4IHx8ICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGNpZF9kaWRfZGVidWcgY2hlY2tib3hcbiAgICAgICAgICAgIGlmIChkYXRhLmNpZF9kaWRfZGVidWcgPT09ICcxJyB8fCBkYXRhLmNpZF9kaWRfZGVidWcgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAkKCcjY2lkX2RpZF9kZWJ1ZycpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI2NpZF9kaWRfZGVidWcnKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gdmFsdWVzIC0gYmFja2VuZCBwcm92aWRlcyBkZWZhdWx0cywganVzdCBzZXQgc2VsZWN0ZWQgdmFsdWVzXG4gICAgICAgICAgICBjb25zdCBkcm9wZG93blVwZGF0ZXMgPSBbXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJyNkdG1mbW9kZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmR0bWZtb2RlIHx8ICcnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJyN0cmFuc3BvcnQtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS50cmFuc3BvcnQgfHwgJycgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiAnI3JlZ2lzdHJhdGlvbl90eXBlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgJycgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiAnI2NpZF9zb3VyY2UtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5jaWRfc291cmNlIHx8ICcnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJyNkaWRfc291cmNlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuZGlkX3NvdXJjZSB8fCAnJyB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBkcm9wZG93blVwZGF0ZXMuZm9yRWFjaCgoeyBzZWxlY3RvciwgdmFsdWUgfSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkaXRpb25hbCBob3N0cyAtIHBvcHVsYXRlIGFmdGVyIGZvcm0gaXMgcmVhZHlcbiAgICAgICAgICAgIHRoaXMucG9wdWxhdGVBZGRpdGlvbmFsSG9zdHMoZGF0YS5hZGRpdGlvbmFsSG9zdHMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBzdXBlci5jYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGEgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5pZCAmJiAhJCgnI2lkJykudmFsKCkpIHtcbiAgICAgICAgICAgICAgICAkKCcjaWQnKS52YWwocmVzcG9uc2UuZGF0YS5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRoZSBGb3JtLmpzIHdpbGwgaGFuZGxlIHRoZSByZWxvYWQgYXV0b21hdGljYWxseSBpZiByZXNwb25zZS5yZWxvYWQgaXMgcHJlc2VudFxuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBSRVNUIEFQSSByZXR1cm5zIHJlbG9hZCBwYXRoIGxpa2UgXCJwcm92aWRlcnMvbW9kaWZ5c2lwL1NJUC1UUlVOSy14eHhcIlxuICAgICAgICB9XG4gICAgfVxuICAgIFxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBydWxlc01hcCA9IHtcbiAgICAgICAgICAgIG91dGJvdW5kOiAoKSA9PiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKSxcbiAgICAgICAgICAgIGluYm91bmQ6ICgpID0+IHRoaXMuZ2V0SW5ib3VuZFJ1bGVzKCksXG4gICAgICAgICAgICBub25lOiAoKSA9PiB0aGlzLmdldE5vbmVSdWxlcygpLFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcnVsZXMgPSBydWxlc01hcFtyZWdUeXBlXSA/IHJ1bGVzTWFwW3JlZ1R5cGVdKCkgOiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRDYWxsZXJJZERpZFJ1bGVzKHJ1bGVzKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIENhbGxlcklEL0RJRCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJ1bGVzIC0gRXhpc3RpbmcgcnVsZXNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBSdWxlcyB3aXRoIENhbGxlcklEL0RJRCB2YWxpZGF0aW9uXG4gICAgICovXG4gICAgYWRkQ2FsbGVySWREaWRSdWxlcyhydWxlcykge1xuICAgICAgICAvLyBDdXN0b20gaGVhZGVyIHZhbGlkYXRpb24gdXNpbmcgZ2xvYmFsIGN1c3RvbSBydWxlc1xuICAgICAgICBydWxlcy5jaWRfY3VzdG9tX2hlYWRlciA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjaWRfY3VzdG9tX2hlYWRlcicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21IZWFkZXJbY2lkXScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVDdXN0b21IZWFkZXJFbXB0eSxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuZGlkX2N1c3RvbV9oZWFkZXIgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGlkX2N1c3RvbV9oZWFkZXInLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tSGVhZGVyW2RpZF0nLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRW1wdHksXG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJlZ2V4IHBhdHRlcm4gdmFsaWRhdGlvbiB1c2luZyBnbG9iYWwgY3VzdG9tIHJ1bGVzXG4gICAgICAgIHJ1bGVzLmNpZF9wYXJzZXJfcmVnZXggPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY2lkX3BhcnNlcl9yZWdleCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdleFBhdHRlcm5bY2lkXScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVJbnZhbGlkUmVnZXhcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuZGlkX3BhcnNlcl9yZWdleCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkaWRfcGFyc2VyX3JlZ2V4JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ2V4UGF0dGVybltkaWRdJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUludmFsaWRSZWdleFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQYXJzZXIgc3RhcnQvZW5kIGZpZWxkcyBkb24ndCBuZWVkIHZhbGlkYXRpb24gLSB0aGV5IGFyZSB0cnVseSBvcHRpb25hbFxuICAgICAgICAvLyBObyBydWxlcyBuZWVkZWQgZm9yIGNpZF9wYXJzZXJfc3RhcnQsIGNpZF9wYXJzZXJfZW5kLCBkaWRfcGFyc2VyX3N0YXJ0LCBkaWRfcGFyc2VyX2VuZFxuXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igb3V0Ym91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0T3V0Ym91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ15bYS16QS1aMC05Xy4tXSskJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldEluYm91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ15bYS16QS1aMC05Xy4tXSskJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG5vbmUgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9uZVJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaG9zdCBsYWJlbCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RMYWJlbChyZWdUeXBlKSB7XG4gICAgICAgIGNvbnN0ICRob3N0TGFiZWxUZXh0ID0gJCgnI2hvc3RMYWJlbFRleHQnKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICAkaG9zdExhYmVsVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAkaG9zdExhYmVsVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZvciBpbmJvdW5kLCB0aGUgZmllbGQgaXMgaGlkZGVuIHNvIG5vIG5lZWQgdG8gdXBkYXRlIGxhYmVsXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiB0aGUgcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0ge1xuICAgICAgICAgICAgaG9zdDogJCgnI2VsSG9zdCcpLFxuICAgICAgICAgICAgcG9ydDogJCgnI2VsUG9ydCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyNlbFVzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6ICQoJyNlbFNlY3JldCcpLFxuICAgICAgICAgICAgYWRkaXRpb25hbEhvc3Q6ICQoJyNlbEFkZGl0aW9uYWxIb3N0cycpLFxuICAgICAgICAgICAgbmV0d29ya0ZpbHRlcjogJCgnI2VsTmV0d29ya0ZpbHRlcicpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZHMgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6IHRoaXMuJHNlY3JldCxcbiAgICAgICAgICAgIG5ldHdvcmtGaWx0ZXJJZDogJCgnI25ldHdvcmtmaWx0ZXJpZCcpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGNvbnN0IGNvbmZpZ3MgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdhZGRpdGlvbmFsSG9zdCddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWyduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLk5PTkVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlc2V0TmV0d29ya0ZpbHRlcjogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluYm91bmQ6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ3VzZXJuYW1lJywgJ3NlY3JldCcsICduZXR3b3JrRmlsdGVyJywgJ2FkZGl0aW9uYWxIb3N0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ2hvc3QnLCAncG9ydCddLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlYWRvbmx5VXNlcm5hbWU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXV0b0dlbmVyYXRlUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY2xlYXJWYWxpZGF0aW9uRm9yOiBbJ2hvc3QnLCAncG9ydCddXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm9uZToge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdhZGRpdGlvbmFsSG9zdCcsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbXSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRUb29sdGlwOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1ha2VPcHRpb25hbDogWydzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBjbGVhclZhbGlkYXRpb25Gb3I6IFsndXNlcm5hbWUnLCAnc2VjcmV0J11cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY29uZmlnID0gY29uZmlnc1tyZWdUeXBlXSB8fCBjb25maWdzLm91dGJvdW5kO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgdmlzaWJpbGl0eVxuICAgICAgICBjb25maWcudmlzaWJsZS5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5zaG93KCkpO1xuICAgICAgICBjb25maWcuaGlkZGVuLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LmhpZGUoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgZmllbGRcbiAgICAgICAgaWYgKGNvbmZpZy5yZWFkb25seVVzZXJuYW1lKSB7XG4gICAgICAgICAgICBmaWVsZHMudXNlcm5hbWUudmFsKHByb3ZpZGVySWQpLmF0dHIoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmVzZXQgdXNlcm5hbWUgaWYgaXQgbWF0Y2hlcyBwcm92aWRlciBJRCB3aGVuIG5vdCBpbmJvdW5kXG4gICAgICAgICAgICBpZiAoZmllbGRzLnVzZXJuYW1lLnZhbCgpID09PSBwcm92aWRlcklkICYmIHJlZ1R5cGUgIT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgaWYgZW1wdHlcbiAgICAgICAgaWYgKGNvbmZpZy5hdXRvR2VuZXJhdGVQYXNzd29yZCAmJiBmaWVsZHMuc2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycgJiYgdGhpcy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgdGhpcy5wYXNzd29yZFdpZGdldC5lbGVtZW50cy4kZ2VuZXJhdGVCdG4/LnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlc2V0IG5ldHdvcmsgZmlsdGVyIGZvciBvdXRib3VuZFxuICAgICAgICBpZiAoY29uZmlnLnJlc2V0TmV0d29ya0ZpbHRlcikge1xuICAgICAgICAgICAgZmllbGRzLm5ldHdvcmtGaWx0ZXJJZC52YWwoJ25vbmUnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHdpZGdldCBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmICh0aGlzLnBhc3N3b3JkV2lkZ2V0ICYmIGNvbmZpZy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQudXBkYXRlQ29uZmlnKHRoaXMucGFzc3dvcmRXaWRnZXQsIGNvbmZpZy5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCB0b29sdGlwXG4gICAgICAgIGlmIChjb25maWcuc2hvd1Bhc3N3b3JkVG9vbHRpcCkge1xuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTWFrZSBmaWVsZHMgb3B0aW9uYWxcbiAgICAgICAgY29uZmlnLm1ha2VPcHRpb25hbD8uZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICAkKGAjZWwke2ZpZWxkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZmllbGQuc2xpY2UoMSl9YCkucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnMgZm9yIHNwZWNpZmllZCBmaWVsZHNcbiAgICAgICAgY29uZmlnLmNsZWFyVmFsaWRhdGlvbkZvcj8uZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZCk7XG4gICAgICAgICAgICAkKGAjJHtmaWVsZH1gKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaG9zdCBsYWJlbFxuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RMYWJlbChyZWdUeXBlKTsgXG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiAnZGlzYWJsZWZyb211c2VyJyBjaGVja2JveFxuICAgICAgICAvLyBVc2UgdGhlIG91dGVyIGRpdi5jaGVja2JveCBjb250YWluZXIgaW5zdGVhZCBvZiBpbnB1dCBlbGVtZW50XG4gICAgICAgIGNvbnN0IGVsID0gJCgnaW5wdXRbbmFtZT1cImRpc2FibGVmcm9tdXNlclwiXScpLmNsb3Nlc3QoJy51aS5jaGVja2JveCcpO1xuICAgICAgICBjb25zdCBmcm9tVXNlciA9ICQoJyNkaXZGcm9tVXNlcicpO1xuICAgICAgICBpZiAoZWwubGVuZ3RoID4gMCAmJiBlbC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBmcm9tVXNlci5oaWRlKCk7XG4gICAgICAgICAgICBmcm9tVXNlci5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbVVzZXIuc2hvdygpO1xuICAgICAgICAgICAgZnJvbVVzZXIuYWRkQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBDYWxsZXJJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGNpZERyb3Bkb3duID0gJCgnI2NpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKGNpZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGNpZFZhbHVlID0gY2lkRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgY2lkQ3VzdG9tU2V0dGluZ3MgPSAkKCcjY2FsbGVyaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgICAgICBpZiAoY2lkVmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgY2lkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignc2hvdycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBjaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdoaWRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBESUQgY3VzdG9tIHNldHRpbmdzIHZpc2liaWxpdHkgYmFzZWQgb24gY3VycmVudCBkcm9wZG93biB2YWx1ZVxuICAgICAgICBjb25zdCBkaWREcm9wZG93biA9ICQoJyNkaWRfc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmIChkaWREcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkaWRWYWx1ZSA9IGRpZERyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGRpZEN1c3RvbVNldHRpbmdzID0gJCgnI2RpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgICAgIGlmIChkaWRWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBkaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdzaG93Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGRpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY29tcGxldGlvbiBvZiBob3N0IGFkZHJlc3MgaW5wdXRcbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdhZGRpdGlvbmFsLWhvc3QnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IHZhbHVlLm1hdGNoKHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBpbnB1dCB2YWx1ZVxuICAgICAgICAgICAgaWYgKHZhbGlkYXRpb24gPT09IG51bGwgfHwgdmFsaWRhdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgaG9zdCBhZGRyZXNzIGFscmVhZHkgZXhpc3RzXG4gICAgICAgICAgICBpZiAoJChgLmhvc3Qtcm93W2RhdGEtdmFsdWU9XFxcIiR7dmFsdWV9XFxcIl1gKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdHIgPSB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZS5sYXN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGNsb25lID0gJHRyLmNsb25lKGZhbHNlKTsgLy8gVXNlIGZhbHNlIHNpbmNlIGV2ZW50cyBhcmUgZGVsZWdhdGVkXG4gICAgICAgICAgICAgICAgJGNsb25lXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaG9zdC1yb3ctdHBsJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdob3N0LXJvdycpXG4gICAgICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmZpbmQoJy5hZGRyZXNzJykuaHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGV4aXN0aW5nSG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgICAgICAgICAgaWYgKCRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJHRyLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgaG9zdHMgdGFibGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0c1RhYmxlVmlldygpIHtcbiAgICAgICAgY29uc3QgJGhvc3RSb3dzID0gdGhpcy4kZm9ybU9iai5maW5kKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1cpO1xuICAgICAgICBpZiAoJGhvc3RSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGFkZGl0aW9uYWwgaG9zdHMgZnJvbSBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGFkZGl0aW9uYWxIb3N0cyAtIEFycmF5IG9mIGFkZGl0aW9uYWwgaG9zdHMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyhhZGRpdGlvbmFsSG9zdHMpIHtcbiAgICAgICAgaWYgKCFhZGRpdGlvbmFsSG9zdHMgfHwgIUFycmF5LmlzQXJyYXkoYWRkaXRpb25hbEhvc3RzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBob3N0cyBmaXJzdCAoZXhjZXB0IHRlbXBsYXRlIGFuZCBkdW1teSlcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGFibGUuZmluZChgdGJvZHkgdHIke1Byb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1d9YCkucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZWFjaCBob3N0IHVzaW5nIHRoZSBzYW1lIGxvZ2ljIGFzIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzXG4gICAgICAgIGFkZGl0aW9uYWxIb3N0cy5mb3JFYWNoKChob3N0T2JqKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgYm90aCBvYmplY3QgZm9ybWF0IHtpZCwgYWRkcmVzc30gYW5kIHN0cmluZyBmb3JtYXRcbiAgICAgICAgICAgIGNvbnN0IGhvc3RBZGRyZXNzID0gdHlwZW9mIGhvc3RPYmogPT09ICdzdHJpbmcnID8gaG9zdE9iaiA6IGhvc3RPYmouYWRkcmVzcztcbiAgICAgICAgICAgIGlmIChob3N0QWRkcmVzcyAmJiBob3N0QWRkcmVzcy50cmltKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdGhlIHNhbWUgbG9naWMgYXMgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3NcbiAgICAgICAgICAgICAgICBjb25zdCAkdHIgPSB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZS5sYXN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGNsb25lID0gJHRyLmNsb25lKGZhbHNlKTsgLy8gVXNlIGZhbHNlIHNpbmNlIGV2ZW50cyBhcmUgZGVsZWdhdGVkXG4gICAgICAgICAgICAgICAgJGNsb25lXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaG9zdC1yb3ctdHBsJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdob3N0LXJvdycpXG4gICAgICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCBob3N0QWRkcmVzcyk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmZpbmQoJy5hZGRyZXNzJykuaHRtbChob3N0QWRkcmVzcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5zZXJ0IHRoZSBjbG9uZWQgcm93XG4gICAgICAgICAgICAgICAgY29uc3QgJGV4aXN0aW5nSG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgICAgICAgICAgaWYgKCRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJHRyLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0YWJsZSB2aXNpYmlsaXR5XG4gICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICB9XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBwcm92aWRlciBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IG5ldyBQcm92aWRlclNJUCgpO1xuICAgIHByb3ZpZGVyLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==