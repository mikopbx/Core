"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, ProviderSipTooltipManager, ProviderTooltipManager, i18n */

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
        $('#cid_parser_regex').val('');
      } // Update form validation


      Form.validateRules = this.getValidateRules();
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
        $('#did_parser_regex').val('');
      } // Update form validation


      Form.validateRules = this.getValidateRules();
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
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this); // Configure REST API settings

      Form.apiSettings = {
        enabled: true,
        apiObject: ProvidersAPI,
        saveMethod: 'saveRecord',
        httpMethod: this.isNewProvider ? 'POST' : 'PUT'
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
      var callerIdSource = $('#cid_source').val();
      var didSource = $('#did_source').val(); // Add custom header validation when custom source is selected

      var customHeaderRules = {
        rules: [{
          type: 'empty',
          prompt: globalTranslate.pr_ValidateCustomHeaderEmpty || 'Please specify custom header name'
        }, {
          type: 'regExp[/^[A-Za-z0-9-_]+$/]',
          prompt: globalTranslate.pr_ValidateCustomHeaderFormat || 'Header name can only contain letters, numbers, dash and underscore'
        }]
      };

      if (callerIdSource === 'custom') {
        rules.cid_custom_header = _objectSpread({
          identifier: 'cid_custom_header'
        }, customHeaderRules);
      }

      if (didSource === 'custom') {
        rules.did_custom_header = _objectSpread({
          identifier: 'did_custom_header'
        }, customHeaderRules);
      } // Regex validation if provided (optional fields)


      var regexValidationRule = {
        optional: true,
        rules: [{
          type: 'callback',
          callback: function callback(value) {
            if (!value) return true;

            try {
              new RegExp(value);
              return true;
            } catch (e) {
              return false;
            }
          },
          prompt: globalTranslate.pr_ValidateInvalidRegex || 'Invalid regular expression'
        }]
      };

      if ($('#cid_parser_regex').val()) {
        rules.cid_parser_regex = _objectSpread({
          identifier: 'cid_parser_regex'
        }, regexValidationRule);
      }

      if ($('#did_parser_regex').val()) {
        rules.did_parser_regex = _objectSpread({
          identifier: 'did_parser_regex'
        }, regexValidationRule);
      }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNJUCIsIiRxdWFsaWZ5VG9nZ2xlIiwiJCIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duIiwiaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duIiwicGFyZW50IiwiUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVGFicyIsImluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJzZWxmIiwiaXNOZXdQcm92aWRlciIsImNzcyIsInRhYiIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciIsImluaXRpYWxpemVEaWFnbm9zdGljc1RhYiIsIm9uTG9hZCIsInBhcmFtZXRlckFycmF5IiwiaGlzdG9yeUV2ZW50Iiwib2ZmIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwia2V5cHJlc3MiLCJ3aGljaCIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwiREVMRVRFX1JPV19CVVRUT04iLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwiJGRyb3Bkb3duIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJ2YWx1ZSIsIm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UiLCJvbkRpZFNvdXJjZUNoYW5nZSIsIiRjdXN0b21TZXR0aW5ncyIsInRyYW5zaXRpb24iLCJ2YWwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsIiRmb3JtT2JqIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImJpbmQiLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJQcm92aWRlcnNBUEkiLCJzYXZlTWV0aG9kIiwiaHR0cE1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImZvcm1Jbml0aWFsaXplZCIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsInR5cGUiLCJwcm92aWRlclR5cGUiLCJhZGRpdGlvbmFsSG9zdHMiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiaG9zdCIsImZpbmQiLCJ0ZXh0IiwidHJpbSIsInB1c2giLCJhZGRyZXNzIiwiZHRtZm1vZGUiLCJ0cmFuc3BvcnQiLCJmcm9tdXNlciIsImZyb21kb21haW4iLCJvdXRib3VuZF9wcm94eSIsImRpc2FibGVmcm9tdXNlciIsInByb3AiLCJxdWFsaWZ5ZnJlcSIsImNpZF9zb3VyY2UiLCJkaWRfc291cmNlIiwiY2lkX2N1c3RvbV9oZWFkZXIiLCJjaWRfcGFyc2VyX3N0YXJ0IiwiY2lkX3BhcnNlcl9lbmQiLCJjaWRfcGFyc2VyX3JlZ2V4IiwiZGlkX2N1c3RvbV9oZWFkZXIiLCJkaWRfcGFyc2VyX3N0YXJ0IiwiZGlkX3BhcnNlcl9lbmQiLCJkaWRfcGFyc2VyX3JlZ2V4IiwiY2lkX2RpZF9kZWJ1ZyIsImRyb3Bkb3duVXBkYXRlcyIsInNlbGVjdG9yIiwicmVnaXN0cmF0aW9uX3R5cGUiLCJmb3JFYWNoIiwicG9wdWxhdGVBZGRpdGlvbmFsSG9zdHMiLCJyZXNwb25zZSIsImlkIiwicmVnVHlwZSIsInJ1bGVzTWFwIiwib3V0Ym91bmQiLCJnZXRPdXRib3VuZFJ1bGVzIiwiaW5ib3VuZCIsImdldEluYm91bmRSdWxlcyIsIm5vbmUiLCJnZXROb25lUnVsZXMiLCJydWxlcyIsImFkZENhbGxlcklkRGlkUnVsZXMiLCJjYWxsZXJJZFNvdXJjZSIsImRpZFNvdXJjZSIsImN1c3RvbUhlYWRlclJ1bGVzIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfVmFsaWRhdGVDdXN0b21IZWFkZXJFbXB0eSIsInByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRm9ybWF0IiwiaWRlbnRpZmllciIsInJlZ2V4VmFsaWRhdGlvblJ1bGUiLCJvcHRpb25hbCIsImNhbGxiYWNrIiwiUmVnRXhwIiwicHJfVmFsaWRhdGVJbnZhbGlkUmVnZXgiLCJkZXNjcmlwdGlvbiIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJzZWNyZXQiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCIsImFkZGl0aW9uYWxfaG9zdHMiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwicHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IiwiJGhvc3RMYWJlbFRleHQiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsInByb3ZpZGVySWQiLCJlbGVtZW50cyIsImFkZGl0aW9uYWxIb3N0IiwibmV0d29ya0ZpbHRlciIsImZpZWxkcyIsIiRzZWNyZXQiLCJuZXR3b3JrRmlsdGVySWQiLCJjb25maWdzIiwidmlzaWJsZSIsImhpZGRlbiIsInBhc3N3b3JkV2lkZ2V0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJ2YWxpZGF0aW9uIiwiUGFzc3dvcmRXaWRnZXQiLCJWQUxJREFUSU9OIiwiTk9ORSIsInJlc2V0TmV0d29ya0ZpbHRlciIsIlNPRlQiLCJyZWFkb25seVVzZXJuYW1lIiwiYXV0b0dlbmVyYXRlUGFzc3dvcmQiLCJjbGVhclZhbGlkYXRpb25Gb3IiLCJzaG93UGFzc3dvcmRUb29sdGlwIiwibWFrZU9wdGlvbmFsIiwiY29uZmlnIiwia2V5Iiwic2hvdyIsImhpZGUiLCJhdHRyIiwicmVtb3ZlQXR0ciIsIiRnZW5lcmF0ZUJ0biIsInRyaWdnZXIiLCJ1cGRhdGVDb25maWciLCJoaWRlUGFzc3dvcmRUb29sdGlwIiwiZmllbGQiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwiZm9ybSIsInVwZGF0ZUhvc3RMYWJlbCIsImVsIiwiZnJvbVVzZXIiLCJjaWREcm9wZG93biIsImNpZFZhbHVlIiwiY2lkQ3VzdG9tU2V0dGluZ3MiLCJkaWREcm9wZG93biIsImRpZFZhbHVlIiwiZGlkQ3VzdG9tU2V0dGluZ3MiLCJtYXRjaCIsIiR0ciIsImxhc3QiLCIkY2xvbmUiLCJjbG9uZSIsImh0bWwiLCIkZXhpc3RpbmdIb3N0Um93cyIsIkhPU1RfUk9XIiwiYWZ0ZXIiLCIkaG9zdFJvd3MiLCJBcnJheSIsImlzQXJyYXkiLCJob3N0T2JqIiwiaG9zdEFkZHJlc3MiLCJQcm92aWRlckJhc2UiLCJkb2N1bWVudCIsInJlYWR5IiwicHJvdmlkZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFc7Ozs7O0FBQ0Y7QUFVQSx5QkFBYztBQUFBOztBQUFBOztBQUNWLDhCQUFNLEtBQU47QUFDQSxVQUFLQyxjQUFMLEdBQXNCQyxDQUFDLENBQUMsVUFBRCxDQUF2QjtBQUNBLFVBQUtDLGtCQUFMLEdBQTBCRCxDQUFDLENBQUMsZUFBRCxDQUEzQixDQUhVLENBS1Y7O0FBQ0EsVUFBS0UscUJBQUwsR0FBNkJGLENBQUMsQ0FBQ0YsV0FBVyxDQUFDSyxhQUFaLENBQTBCQyxzQkFBM0IsQ0FBOUI7QUFDQSxVQUFLQyx3QkFBTCxHQUFnQ0wsQ0FBQyxDQUFDRixXQUFXLENBQUNLLGFBQVosQ0FBMEJHLHlCQUEzQixDQUFqQztBQUNBLFVBQUtDLHFCQUFMLEdBQTZCUCxDQUFDLENBQUNGLFdBQVcsQ0FBQ0ssYUFBWixDQUEwQkssc0JBQTNCLENBQTlCO0FBQ0EsVUFBS0Msb0JBQUwsR0FBNEJULENBQUMsQ0FBQ0YsV0FBVyxDQUFDSyxhQUFaLENBQTBCTyxxQkFBM0IsQ0FBN0I7QUFUVTtBQVViO0FBRUQ7QUFDSjtBQUNBOzs7OztXQUNJLHNCQUFhO0FBQUE7O0FBQ1Qsa0ZBRFMsQ0FHVDs7O0FBQ0EsV0FBS1gsY0FBTCxDQUFvQlksUUFBcEIsQ0FBNkI7QUFDekJDLFFBQUFBLFFBQVEsRUFBRSxvQkFBTTtBQUNaLGNBQUksTUFBSSxDQUFDYixjQUFMLENBQW9CWSxRQUFwQixDQUE2QixZQUE3QixDQUFKLEVBQWdEO0FBQzVDLFlBQUEsTUFBSSxDQUFDVixrQkFBTCxD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TEE7QUFNbkIySyxFQUFBQSxRQUFRLEVBQUU7QUFOUyxDOztBQSs1QjNCMU4sQ0FBQyxDQUFDa08sUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQixNQUFNQyxRQUFRLEdBQUcsSUFBSXRPLFdBQUosRUFBakI7QUFDQXNPLEVBQUFBLFFBQVEsQ0FBQzNNLFVBQVQ7QUFDSCxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyLCBQcm92aWRlclRvb2x0aXBNYW5hZ2VyLCBpMThuICovXG5cbi8qKlxuICogU0lQIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVyU0lQXG4gKi9cbmNsYXNzIFByb3ZpZGVyU0lQIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHsgIFxuICAgIC8vIFNJUC1zcGVjaWZpYyBzZWxlY3RvcnNcbiAgICBzdGF0aWMgU0lQX1NFTEVDVE9SUyA9IHtcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19UQUJMRTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlJyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19EVU1NWTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5kdW1teScsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfVEVNUExBVEU6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuaG9zdC1yb3ctdHBsJyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUX0lOUFVUOiAnI2FkZGl0aW9uYWwtaG9zdCBpbnB1dCcsXG4gICAgICAgIERFTEVURV9ST1dfQlVUVE9OOiAnLmRlbGV0ZS1yb3ctYnV0dG9uJyxcbiAgICAgICAgSE9TVF9ST1c6ICcuaG9zdC1yb3cnXG4gICAgfTtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoJ1NJUCcpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5VG9nZ2xlID0gJCgnI3F1YWxpZnknKTtcbiAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUgPSAkKCcjcXVhbGlmeS1mcmVxJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgalF1ZXJ5IG9iamVjdHNcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19EVU1NWSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfVEVNUExBVEUpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX1RBQkxFKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dCA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RfSU5QVVQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBzdXBlci5pbml0aWFsaXplKCk7IFxuICAgICAgICBcbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHRoaXMuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJkaXNhYmxlZnJvbXVzZXJcIl0nKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFNJUC1zcGVjaWZpYyBzdGF0aWMgZHJvcGRvd25zXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQ2FsbGVySWRTb3VyY2VEcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEaWRTb3VyY2VEcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJ1ZyBjaGVja2JveCAtIHVzaW5nIHBhcmVudCBjb250YWluZXIgd2l0aCBjbGFzcyBzZWxlY3RvclxuICAgICAgICAkKCcjY2lkX2RpZF9kZWJ1ZycpLnBhcmVudCgnLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAgICBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUYWJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFNJUC1zcGVjaWZpYyBjb21wb25lbnRzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVNpcEV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRhYiBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRhYnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaWFnbm9zdGljcyB0YWIgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgaWYgKHRoaXMuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAuY3NzKCdvcGFjaXR5JywgJzAuNDUnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ2N1cnNvcicsICdub3QtYWxsb3dlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAuY3NzKCdvcGFjaXR5JywgJycpXG4gICAgICAgICAgICAgICAgLmNzcygnY3Vyc29yJywgJycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogKHRhYlBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiB0eXBlb2YgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIgIT09ICd1bmRlZmluZWQnICYmICFzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkaWFnbm9zdGljcyB0YWIgd2hlbiBpdCBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIuaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uTG9hZDogKHRhYlBhdGgsIHBhcmFtZXRlckFycmF5LCBoaXN0b3J5RXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBCbG9jayBsb2FkaW5nIG9mIGRpYWdub3N0aWNzIHRhYiBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBTd2l0Y2ggYmFjayB0byBzZXR0aW5ncyB0YWJcbiAgICAgICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cInNldHRpbmdzXCJdJykudGFiKCdjaGFuZ2UgdGFiJywgJ3NldHRpbmdzJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkaXRpb25hbCBjbGljayBwcmV2ZW50aW9uIGZvciBkaXNhYmxlZCB0YWJcbiAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJykub2ZmKCdjbGljay5kaXNhYmxlZCcpLm9uKCdjbGljay5kaXNhYmxlZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGlmIChzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugc3RheSBvbiBzZXR0aW5ncyB0YWJcbiAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFNJUC1zcGVjaWZpYyBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBuZXcgc3RyaW5nIHRvIGFkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGFibGVcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC5rZXlwcmVzcygoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUud2hpY2ggPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgaG9zdCBmcm9tIGFkZGl0aW9uYWwtaG9zdHMtdGFibGUgLSB1c2UgZXZlbnQgZGVsZWdhdGlvbiBmb3IgZHluYW1pYyBlbGVtZW50c1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZS5vbignY2xpY2snLCBQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkRFTEVURV9ST1dfQlVUVE9OLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHNlbGYudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRFRNRiBtb2RlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI2R0bWZtb2RlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRyYW5zcG9ydCBwcm90b2NvbCBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjdHJhbnNwb3J0LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIENhbGxlcklEIHNvdXJjZSBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNhbGxlcklkU291cmNlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNjaWRfc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkNhbGxlcklkU291cmNlQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERJRCBzb3VyY2UgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEaWRTb3VyY2VEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI2RpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uRGlkU291cmNlQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgQ2FsbGVySUQgc291cmNlIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIENhbGxlcklEIHNvdXJjZVxuICAgICAqL1xuICAgIG9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGN1c3RvbVNldHRpbmdzID0gJCgnI2NhbGxlcmlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICBpZiAodmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIGN1c3RvbSBoZWFkZXIgZmllbGQgcmVxdWlyZWRcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2ZhZGUgZG93bicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSByZXF1aXJlZCBzdGF0dXNcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIGZpZWxkcyB3aGVuIG5vdCBpbiB1c2VcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9zdGFydCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9lbmQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfcmVnZXgnKS52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBESUQgc291cmNlIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIERJRCBzb3VyY2VcbiAgICAgKi9cbiAgICBvbkRpZFNvdXJjZUNoYW5nZSh2YWx1ZSkge1xuICAgICAgICBjb25zdCAkY3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICBpZiAodmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIGN1c3RvbSBoZWFkZXIgZmllbGQgcmVxdWlyZWRcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2ZhZGUgZG93bicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSByZXF1aXJlZCBzdGF0dXNcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIGZpZWxkcyB3aGVuIG5vdCBpbiB1c2VcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9zdGFydCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9lbmQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBQcm92aWRlcnNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCcsXG4gICAgICAgICAgICBodHRwTWV0aG9kOiB0aGlzLmlzTmV3UHJvdmlkZXIgPyAnUE9TVCcgOiAnUFVUJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnlzaXAvYDtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybSAtIHRoaXMgd2FzIG1pc3NpbmchXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTWFyayBmb3JtIGFzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgIHRoaXMuZm9ybUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIC8vIElNUE9SVEFOVDogRG9uJ3Qgb3ZlcndyaXRlIHJlc3VsdC5kYXRhIC0gaXQgYWxyZWFkeSBjb250YWlucyBwcm9jZXNzZWQgY2hlY2tib3ggdmFsdWVzXG4gICAgICAgIC8vIEp1c3QgYWRkL21vZGlmeSBzcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBwcm92aWRlciB0eXBlXG4gICAgICAgIHJlc3VsdC5kYXRhLnR5cGUgPSB0aGlzLnByb3ZpZGVyVHlwZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBhZGRpdGlvbmFsIGhvc3RzIGZvciBTSVAgLSBjb2xsZWN0IGZyb20gdGFibGVcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbEhvc3RzID0gW107XG4gICAgICAgICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRib2R5IHRyLmhvc3Qtcm93JykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGhvc3QgPSAkKGVsZW1lbnQpLmZpbmQoJ3RkLmFkZHJlc3MnKS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsSG9zdHMucHVzaCh7IGFkZHJlc3M6IGhvc3QgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gT25seSBhZGQgaWYgdGhlcmUgYXJlIGhvc3RzXG4gICAgICAgIGlmIChhZGRpdGlvbmFsSG9zdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWRkaXRpb25hbEhvc3RzID0gYWRkaXRpb25hbEhvc3RzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBPdmVycmlkZSBwb3B1bGF0ZUZvcm1EYXRhIHRvIGhhbmRsZSBTSVAtc3BlY2lmaWMgZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBtZXRob2QgZmlyc3QgZm9yIGNvbW1vbiBmaWVsZHNcbiAgICAgICAgc3VwZXIucG9wdWxhdGVGb3JtRGF0YShkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgIC8vIFNJUC1zcGVjaWZpYyBmaWVsZHMgLSBiYWNrZW5kIHByb3ZpZGVzIGRlZmF1bHRzXG4gICAgICAgICAgICAkKCcjZHRtZm1vZGUnKS52YWwoZGF0YS5kdG1mbW9kZSB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjdHJhbnNwb3J0JykudmFsKGRhdGEudHJhbnNwb3J0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNmcm9tdXNlcicpLnZhbChkYXRhLmZyb211c2VyIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNmcm9tZG9tYWluJykudmFsKGRhdGEuZnJvbWRvbWFpbiB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjb3V0Ym91bmRfcHJveHknKS52YWwoZGF0YS5vdXRib3VuZF9wcm94eSB8fCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNJUC1zcGVjaWZpYyBjaGVja2JveGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5kaXNhYmxlZnJvbXVzZXIgPT09ICcxJyB8fCBkYXRhLmRpc2FibGVmcm9tdXNlciA9PT0gdHJ1ZSkgJCgnI2Rpc2FibGVmcm9tdXNlcicpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUXVhbGlmeSBmcmVxdWVuY3kgLSBiYWNrZW5kIHByb3ZpZGVzIGRlZmF1bHRcbiAgICAgICAgICAgICQoJyNxdWFsaWZ5ZnJlcScpLnZhbChkYXRhLnF1YWxpZnlmcmVxIHx8ICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbGVySUQvRElEIGZpZWxkc1xuICAgICAgICAgICAgJCgnI2NpZF9zb3VyY2UnKS52YWwoZGF0YS5jaWRfc291cmNlIHx8ICdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAkKCcjZGlkX3NvdXJjZScpLnZhbChkYXRhLmRpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLnZhbChkYXRhLmNpZF9jdXN0b21faGVhZGVyIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3N0YXJ0JykudmFsKGRhdGEuY2lkX3BhcnNlcl9zdGFydCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9lbmQnKS52YWwoZGF0YS5jaWRfcGFyc2VyX2VuZCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9yZWdleCcpLnZhbChkYXRhLmNpZF9wYXJzZXJfcmVnZXggfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykudmFsKGRhdGEuZGlkX2N1c3RvbV9oZWFkZXIgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfc3RhcnQnKS52YWwoZGF0YS5kaWRfcGFyc2VyX3N0YXJ0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX2VuZCcpLnZhbChkYXRhLmRpZF9wYXJzZXJfZW5kIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3JlZ2V4JykudmFsKGRhdGEuZGlkX3BhcnNlcl9yZWdleCB8fCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBjaWRfZGlkX2RlYnVnIGNoZWNrYm94XG4gICAgICAgICAgICBpZiAoZGF0YS5jaWRfZGlkX2RlYnVnID09PSAnMScgfHwgZGF0YS5jaWRfZGlkX2RlYnVnID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgJCgnI2NpZF9kaWRfZGVidWcnKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyNjaWRfZGlkX2RlYnVnJykucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHZhbHVlcyAtIGJhY2tlbmQgcHJvdmlkZXMgZGVmYXVsdHMsIGp1c3Qgc2V0IHNlbGVjdGVkIHZhbHVlc1xuICAgICAgICAgICAgY29uc3QgZHJvcGRvd25VcGRhdGVzID0gW1xuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjZHRtZm1vZGUtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5kdG1mbW9kZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjdHJhbnNwb3J0LWRyb3Bkb3duJywgdmFsdWU6IGRhdGEudHJhbnNwb3J0IHx8ICcnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJyNyZWdpc3RyYXRpb25fdHlwZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLnJlZ2lzdHJhdGlvbl90eXBlIHx8ICcnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJyNjaWRfc291cmNlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuY2lkX3NvdXJjZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjZGlkX3NvdXJjZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmRpZF9zb3VyY2UgfHwgJycgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZHJvcGRvd25VcGRhdGVzLmZvckVhY2goKHsgc2VsZWN0b3IsIHZhbHVlIH0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZGl0aW9uYWwgaG9zdHMgLSBwb3B1bGF0ZSBhZnRlciBmb3JtIGlzIHJlYWR5XG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGRhdGEuYWRkaXRpb25hbEhvc3RzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgc3VwZXIuY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuaWQgJiYgISQoJyNpZCcpLnZhbCgpKSB7XG4gICAgICAgICAgICAgICAgJCgnI2lkJykudmFsKHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGUgRm9ybS5qcyB3aWxsIGhhbmRsZSB0aGUgcmVsb2FkIGF1dG9tYXRpY2FsbHkgaWYgcmVzcG9uc2UucmVsb2FkIGlzIHByZXNlbnRcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgUkVTVCBBUEkgcmV0dXJucyByZWxvYWQgcGF0aCBsaWtlIFwicHJvdmlkZXJzL21vZGlmeXNpcC9TSVAtVFJVTksteHh4XCJcbiAgICAgICAgfVxuICAgIH1cbiAgICBcblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcnVsZXNNYXAgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDogKCkgPT4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCksXG4gICAgICAgICAgICBpbmJvdW5kOiAoKSA9PiB0aGlzLmdldEluYm91bmRSdWxlcygpLFxuICAgICAgICAgICAgbm9uZTogKCkgPT4gdGhpcy5nZXROb25lUnVsZXMoKSxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJ1bGVzID0gcnVsZXNNYXBbcmVnVHlwZV0gPyBydWxlc01hcFtyZWdUeXBlXSgpIDogdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQ2FsbGVySUQvRElEIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkQ2FsbGVySWREaWRSdWxlcyhydWxlcyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvbiBydWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBydWxlcyAtIEV4aXN0aW5nIHJ1bGVzXG4gICAgICogQHJldHVybnMge29iamVjdH0gUnVsZXMgd2l0aCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvblxuICAgICAqL1xuICAgIGFkZENhbGxlcklkRGlkUnVsZXMocnVsZXMpIHtcbiAgICAgICAgY29uc3QgY2FsbGVySWRTb3VyY2UgPSAkKCcjY2lkX3NvdXJjZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBkaWRTb3VyY2UgPSAkKCcjZGlkX3NvdXJjZScpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGN1c3RvbSBoZWFkZXIgdmFsaWRhdGlvbiB3aGVuIGN1c3RvbSBzb3VyY2UgaXMgc2VsZWN0ZWRcbiAgICAgICAgY29uc3QgY3VzdG9tSGVhZGVyUnVsZXMgPSB7XG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRW1wdHkgfHwgJ1BsZWFzZSBzcGVjaWZ5IGN1c3RvbSBoZWFkZXIgbmFtZScsXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cFsvXltBLVphLXowLTktX10rJC9dJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckZvcm1hdCB8fCAnSGVhZGVyIG5hbWUgY2FuIG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkYXNoIGFuZCB1bmRlcnNjb3JlJyxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGVySWRTb3VyY2UgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICBydWxlcy5jaWRfY3VzdG9tX2hlYWRlciA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnY2lkX2N1c3RvbV9oZWFkZXInLFxuICAgICAgICAgICAgICAgIC4uLmN1c3RvbUhlYWRlclJ1bGVzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZGlkU291cmNlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgcnVsZXMuZGlkX2N1c3RvbV9oZWFkZXIgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2RpZF9jdXN0b21faGVhZGVyJyxcbiAgICAgICAgICAgICAgICAuLi5jdXN0b21IZWFkZXJSdWxlc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVnZXggdmFsaWRhdGlvbiBpZiBwcm92aWRlZCAob3B0aW9uYWwgZmllbGRzKVxuICAgICAgICBjb25zdCByZWdleFZhbGlkYXRpb25SdWxlID0ge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAnY2FsbGJhY2snLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgUmVnRXhwKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlSW52YWxpZFJlZ2V4IHx8ICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbicsXG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKCQoJyNjaWRfcGFyc2VyX3JlZ2V4JykudmFsKCkpIHtcbiAgICAgICAgICAgIHJ1bGVzLmNpZF9wYXJzZXJfcmVnZXggPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NpZF9wYXJzZXJfcmVnZXgnLFxuICAgICAgICAgICAgICAgIC4uLnJlZ2V4VmFsaWRhdGlvblJ1bGVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICgkKCcjZGlkX3BhcnNlcl9yZWdleCcpLnZhbCgpKSB7XG4gICAgICAgICAgICBydWxlcy5kaWRfcGFyc2VyX3JlZ2V4ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkaWRfcGFyc2VyX3JlZ2V4JyxcbiAgICAgICAgICAgICAgICAuLi5yZWdleFZhbGlkYXRpb25SdWxlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG91dGJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldE91dGJvdW5kUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTkuLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzIHx8ICdIb3N0IGNhbiBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycywgZG90cyBhbmQgaHlwaGVucycsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ15bYS16QS1aMC05Xy4tXSskJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMgfHwgJ1VzZXJuYW1lIGNhbiBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycyBhbmQgc3ltYm9sczogXyAtIC4nLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRJbmJvdW5kUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeW2EtekEtWjAtOV8uLV0rJCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzIHx8ICdVc2VybmFtZSBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMgYW5kIHN5bWJvbHM6IF8gLSAuJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzhdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igbm9uZSByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXROb25lUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTkuLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzIHx8ICdIb3N0IGNhbiBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycywgZG90cyBhbmQgaHlwaGVucycsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGhvc3QgbGFiZWwgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0TGFiZWwocmVnVHlwZSkge1xuICAgICAgICBjb25zdCAkaG9zdExhYmVsVGV4dCA9ICQoJyNob3N0TGFiZWxUZXh0Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3Qgb3IgSVAgQWRkcmVzcycpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIHx8ICdSZW1vdGUgSG9zdCBvciBJUCBBZGRyZXNzJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRm9yIGluYm91bmQsIHRoZSBmaWVsZCBpcyBoaWRkZW4gc28gbm8gbmVlZCB0byB1cGRhdGUgbGFiZWxcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSB7XG4gICAgICAgICAgICBob3N0OiAkKCcjZWxIb3N0JyksXG4gICAgICAgICAgICBwb3J0OiAkKCcjZWxQb3J0JyksXG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI2VsVXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogJCgnI2VsU2VjcmV0JyksXG4gICAgICAgICAgICBhZGRpdGlvbmFsSG9zdDogJCgnI2VsQWRkaXRpb25hbEhvc3RzJyksXG4gICAgICAgICAgICBuZXR3b3JrRmlsdGVyOiAkKCcjZWxOZXR3b3JrRmlsdGVyJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogdGhpcy4kc2VjcmV0LFxuICAgICAgICAgICAgbmV0d29ya0ZpbHRlcklkOiAkKCcjbmV0d29ya2ZpbHRlcmlkJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgY29uZmlncyA9IHtcbiAgICAgICAgICAgIG91dGJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ2FkZGl0aW9uYWxIb3N0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uTk9ORVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVzZXROZXR3b3JrRmlsdGVyOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5ib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsndXNlcm5hbWUnLCAnc2VjcmV0JywgJ25ldHdvcmtGaWx0ZXInLCAnYWRkaXRpb25hbEhvc3QnXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFsnaG9zdCcsICdwb3J0J10sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVhZG9ubHlVc2VybmFtZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdXRvR2VuZXJhdGVQYXNzd29yZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjbGVhclZhbGlkYXRpb25Gb3I6IFsnaG9zdCcsICdwb3J0J11cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub25lOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ2FkZGl0aW9uYWxIb3N0JywgJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFtdLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZFRvb2x0aXA6IHRydWUsXG4gICAgICAgICAgICAgICAgbWFrZU9wdGlvbmFsOiBbJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGNsZWFyVmFsaWRhdGlvbkZvcjogWyd1c2VybmFtZScsICdzZWNyZXQnXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgY29uZmlndXJhdGlvblxuICAgICAgICBjb25zdCBjb25maWcgPSBjb25maWdzW3JlZ1R5cGVdIHx8IGNvbmZpZ3Mub3V0Ym91bmQ7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSB2aXNpYmlsaXR5XG4gICAgICAgIGNvbmZpZy52aXNpYmxlLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LnNob3coKSk7XG4gICAgICAgIGNvbmZpZy5oaWRkZW4uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uaGlkZSgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSB1c2VybmFtZSBmaWVsZFxuICAgICAgICBpZiAoY29uZmlnLnJlYWRvbmx5VXNlcm5hbWUpIHtcbiAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwocHJvdmlkZXJJZCkuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBSZXNldCB1c2VybmFtZSBpZiBpdCBtYXRjaGVzIHByb3ZpZGVyIElEIHdoZW4gbm90IGluYm91bmRcbiAgICAgICAgICAgIGlmIChmaWVsZHMudXNlcm5hbWUudmFsKCkgPT09IHByb3ZpZGVySWQgJiYgcmVnVHlwZSAhPT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnZhbCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaWVsZHMudXNlcm5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCBpZiBlbXB0eVxuICAgICAgICBpZiAoY29uZmlnLmF1dG9HZW5lcmF0ZVBhc3N3b3JkICYmIGZpZWxkcy5zZWNyZXQudmFsKCkudHJpbSgpID09PSAnJyAmJiB0aGlzLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0LmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bj8udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVzZXQgbmV0d29yayBmaWx0ZXIgZm9yIG91dGJvdW5kXG4gICAgICAgIGlmIChjb25maWcucmVzZXROZXR3b3JrRmlsdGVyKSB7XG4gICAgICAgICAgICBmaWVsZHMubmV0d29ya0ZpbHRlcklkLnZhbCgnbm9uZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgd2lkZ2V0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMucGFzc3dvcmRXaWRnZXQgJiYgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC51cGRhdGVDb25maWcodGhpcy5wYXNzd29yZFdpZGdldCwgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIHRvb2x0aXBcbiAgICAgICAgaWYgKGNvbmZpZy5zaG93UGFzc3dvcmRUb29sdGlwKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkVG9vbHRpcCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNYWtlIGZpZWxkcyBvcHRpb25hbFxuICAgICAgICBjb25maWcubWFrZU9wdGlvbmFsPy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgICQoYCNlbCR7ZmllbGQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBmaWVsZC5zbGljZSgxKX1gKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9ycyBmb3Igc3BlY2lmaWVkIGZpZWxkc1xuICAgICAgICBjb25maWcuY2xlYXJWYWxpZGF0aW9uRm9yPy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsIGZpZWxkKTtcbiAgICAgICAgICAgICQoYCMke2ZpZWxkfWApLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBob3N0IGxhYmVsXG4gICAgICAgIHRoaXMudXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpOyBcblxuICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uICdkaXNhYmxlZnJvbXVzZXInIGNoZWNrYm94XG4gICAgICAgIC8vIFVzZSB0aGUgb3V0ZXIgZGl2LmNoZWNrYm94IGNvbnRhaW5lciBpbnN0ZWFkIG9mIGlucHV0IGVsZW1lbnRcbiAgICAgICAgY29uc3QgZWwgPSAkKCdpbnB1dFtuYW1lPVwiZGlzYWJsZWZyb211c2VyXCJdJykuY2xvc2VzdCgnLnVpLmNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0IGZyb21Vc2VyID0gJCgnI2RpdkZyb21Vc2VyJyk7XG4gICAgICAgIGlmIChlbC5sZW5ndGggPiAwICYmIGVsLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGZyb21Vc2VyLmhpZGUoKTtcbiAgICAgICAgICAgIGZyb21Vc2VyLnJlbW92ZUNsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tVXNlci5zaG93KCk7XG4gICAgICAgICAgICBmcm9tVXNlci5hZGRDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIENhbGxlcklEIGN1c3RvbSBzZXR0aW5ncyB2aXNpYmlsaXR5IGJhc2VkIG9uIGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgICAgY29uc3QgY2lkRHJvcGRvd24gPSAkKCcjY2lkX3NvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoY2lkRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgY2lkVmFsdWUgPSBjaWREcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBjaWRDdXN0b21TZXR0aW5ncyA9ICQoJyNjYWxsZXJpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgICAgIGlmIChjaWRWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBjaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdzaG93Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGNpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIERJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGRpZERyb3Bkb3duID0gJCgnI2RpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKGRpZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZFZhbHVlID0gZGlkRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgZGlkQ3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICAgICAgaWYgKGRpZFZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGRpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ3Nob3cnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgZGlkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjb21wbGV0aW9uIG9mIGhvc3QgYWRkcmVzcyBpbnB1dFxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FkZGl0aW9uYWwtaG9zdCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsdWUubWF0Y2godGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGlucHV0IHZhbHVlXG4gICAgICAgICAgICBpZiAodmFsaWRhdGlvbiA9PT0gbnVsbCB8fCB2YWxpZGF0aW9uLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBob3N0IGFkZHJlc3MgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIGlmICgkKGAuaG9zdC1yb3dbZGF0YS12YWx1ZT1cXFwiJHt2YWx1ZX1cXFwiXWApLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBob3N0cyB0YWJsZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RzVGFibGVWaWV3KCkge1xuICAgICAgICBjb25zdCAkaG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgIGlmICgkaG9zdFJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHthcnJheX0gYWRkaXRpb25hbEhvc3RzIC0gQXJyYXkgb2YgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGFkZGl0aW9uYWxIb3N0cykge1xuICAgICAgICBpZiAoIWFkZGl0aW9uYWxIb3N0cyB8fCAhQXJyYXkuaXNBcnJheShhZGRpdGlvbmFsSG9zdHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGhvc3RzIGZpcnN0IChleGNlcHQgdGVtcGxhdGUgYW5kIGR1bW15KVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZS5maW5kKGB0Ym9keSB0ciR7UHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPV31gKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIGhvc3QgdXNpbmcgdGhlIHNhbWUgbG9naWMgYXMgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3NcbiAgICAgICAgYWRkaXRpb25hbEhvc3RzLmZvckVhY2goKGhvc3RPYmopID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIG9iamVjdCBmb3JtYXQge2lkLCBhZGRyZXNzfSBhbmQgc3RyaW5nIGZvcm1hdFxuICAgICAgICAgICAgY29uc3QgaG9zdEFkZHJlc3MgPSB0eXBlb2YgaG9zdE9iaiA9PT0gJ3N0cmluZycgPyBob3N0T2JqIDogaG9zdE9iai5hZGRyZXNzO1xuICAgICAgICAgICAgaWYgKGhvc3RBZGRyZXNzICYmIGhvc3RBZGRyZXNzLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgc2FtZSBsb2dpYyBhcyBjYk9uQ29tcGxldGVIb3N0QWRkcmVzc1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbnNlcnQgdGhlIGNsb25lZCByb3dcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHByb3ZpZGVyIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IFByb3ZpZGVyU0lQKCk7XG4gICAgcHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xufSk7Il19