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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, ProviderSipTooltipManager, ProviderTooltipManager, i18n, SipProvidersAPI */

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
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this); // Configure REST API settings for v3 with auto-detection

      Form.apiSettings = {
        enabled: true,
        apiObject: SipProvidersAPI,
        // Use SIP-specific API client v3
        autoDetectMethod: true // Automatically detect create/update based on id field

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNJUCIsIiRxdWFsaWZ5VG9nZ2xlIiwiJCIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duIiwiaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duIiwicGFyZW50IiwiUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVGFicyIsImluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJzZWxmIiwiaXNOZXdQcm92aWRlciIsImNzcyIsInRhYiIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciIsImluaXRpYWxpemVEaWFnbm9zdGljc1RhYiIsIm9uTG9hZCIsInBhcmFtZXRlckFycmF5IiwiaGlzdG9yeUV2ZW50Iiwib2ZmIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwia2V5cHJlc3MiLCJ3aGljaCIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwiREVMRVRFX1JPV19CVVRUT04iLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwiJGRyb3Bkb3duIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJ2YWx1ZSIsIm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UiLCJvbkRpZFNvdXJjZUNoYW5nZSIsIiRjdXN0b21TZXR0aW5ncyIsInRyYW5zaXRpb24iLCJ2YWwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsIiRmb3JtT2JqIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImJpbmQiLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJTaXBQcm92aWRlcnNBUEkiLCJhdXRvRGV0ZWN0TWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiZm9ybUluaXRpYWxpemVkIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwidHlwZSIsInByb3ZpZGVyVHlwZSIsImFkZGl0aW9uYWxIb3N0cyIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCJob3N0IiwiZmluZCIsInRleHQiLCJ0cmltIiwicHVzaCIsImFkZHJlc3MiLCJkdG1mbW9kZSIsInRyYW5zcG9ydCIsImZyb211c2VyIiwiZnJvbWRvbWFpbiIsIm91dGJvdW5kX3Byb3h5IiwiZGlzYWJsZWZyb211c2VyIiwicHJvcCIsInF1YWxpZnlmcmVxIiwiY2lkX3NvdXJjZSIsImRpZF9zb3VyY2UiLCJjaWRfY3VzdG9tX2hlYWRlciIsImNpZF9wYXJzZXJfc3RhcnQiLCJjaWRfcGFyc2VyX2VuZCIsImNpZF9wYXJzZXJfcmVnZXgiLCJkaWRfY3VzdG9tX2hlYWRlciIsImRpZF9wYXJzZXJfc3RhcnQiLCJkaWRfcGFyc2VyX2VuZCIsImRpZF9wYXJzZXJfcmVnZXgiLCJjaWRfZGlkX2RlYnVnIiwiZHJvcGRvd25VcGRhdGVzIiwic2VsZWN0b3IiLCJyZWdpc3RyYXRpb25fdHlwZSIsImZvckVhY2giLCJwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyIsInJlc3BvbnNlIiwiaWQiLCJyZWdUeXBlIiwicnVsZXNNYXAiLCJvdXRib3VuZCIsImdldE91dGJvdW5kUnVsZXMiLCJpbmJvdW5kIiwiZ2V0SW5ib3VuZFJ1bGVzIiwibm9uZSIsImdldE5vbmVSdWxlcyIsInJ1bGVzIiwiYWRkQ2FsbGVySWREaWRSdWxlcyIsImNhbGxlcklkU291cmNlIiwiZGlkU291cmNlIiwiY3VzdG9tSGVhZGVyUnVsZXMiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5IiwicHJfVmFsaWRhdGVDdXN0b21IZWFkZXJGb3JtYXQiLCJpZGVudGlmaWVyIiwicmVnZXhWYWxpZGF0aW9uUnVsZSIsIm9wdGlvbmFsIiwiY2FsbGJhY2siLCJSZWdFeHAiLCJwcl9WYWxpZGF0ZUludmFsaWRSZWdleCIsImRlc2NyaXB0aW9uIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyIsInNlY3JldCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwiYWRkaXRpb25hbF9ob3N0cyIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJwcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCIkaG9zdExhYmVsVGV4dCIsInByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJvdmlkZXJJZCIsImVsZW1lbnRzIiwiYWRkaXRpb25hbEhvc3QiLCJuZXR3b3JrRmlsdGVyIiwiZmllbGRzIiwiJHNlY3JldCIsIm5ldHdvcmtGaWx0ZXJJZCIsImNvbmZpZ3MiLCJ2aXNpYmxlIiwiaGlkZGVuIiwicGFzc3dvcmRXaWRnZXQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInZhbGlkYXRpb24iLCJQYXNzd29yZFdpZGdldCIsIlZBTElEQVRJT04iLCJOT05FIiwicmVzZXROZXR3b3JrRmlsdGVyIiwiU09GVCIsInJlYWRvbmx5VXNlcm5hbWUiLCJhdXRvR2VuZXJhdGVQYXNzd29yZCIsImNsZWFyVmFsaWRhdGlvbkZvciIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJtYWtlT3B0aW9uYWwiLCJjb25maWciLCJrZXkiLCJzaG93IiwiaGlkZSIsImF0dHIiLCJyZW1vdmVBdHRyIiwiJGdlbmVyYXRlQnRuIiwidHJpZ2dlciIsInVwZGF0ZUNvbmZpZyIsImhpZGVQYXNzd29yZFRvb2x0aXAiLCJmaWVsZCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJmb3JtIiwidXBkYXRlSG9zdExhYmVsIiwiZWwiLCJmcm9tVXNlciIsImNpZERyb3Bkb3duIiwiY2lkVmFsdWUiLCJjaWRDdXN0b21TZXR0aW5ncyIsImRpZERyb3Bkb3duIiwiZGlkVmFsdWUiLCJkaWRDdXN0b21TZXR0aW5ncyIsIm1hdGNoIiwiJHRyIiwibGFzdCIsIiRjbG9uZSIsImNsb25lIiwiaHRtbCIsIiRleGlzdGluZ0hvc3RSb3dzIiwiSE9TVF9ST1ciLCJhZnRlciIsIiRob3N0Um93cyIsIkFycmF5IiwiaXNBcnJheSIsImhvc3RPYmoiLCJob3N0QWRkcmVzcyIsIlByb3ZpZGVyQmFzZSIsImRvY3VtZW50IiwicmVhZHkiLCJwcm92aWRlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsVzs7Ozs7QUFDRjtBQVVBLHlCQUFjO0FBQUE7O0FBQUE7O0FBQ1YsOEJBQU0sS0FBTjtBQUNBLFVBQUtDLGNBQUwsR0FBc0JDLENBQUMsQ0FBQyxVQUFELENBQXZCO0FBQ0EsVUFBS0Msa0JBQUwsR0FBMEJELENBQUMsQ0FBQyxlQUFELENBQTNCLENBSFUsQ0FLVjs7QUFDQSxVQUFLRSxxQkFBTCxHQUE2QkYsQ0FBQyxDQUFDRixXQUFXLENBQUNLLGFBQVosQ0FBMEJDLHNCQUEzQixDQUE5QjtBQUNBLFVBQUtDLHdCQUFMLEdBQWdDTCxDQUFDLENBQUNGLFdBQVcsQ0FBQ0ssYUFBWixDQUEwQkcseUJBQTNCLENBQWpDO0FBQ0EsVUFBS0MscUJBQUwsR0FBNkJQLENBQUMsQ0FBQ0YsV0FBVyxDQUFDSyxhQUFaLENBQTBCSyxzQkFBM0IsQ0FBOUI7QUFDQSxVQUFLQyxvQkFBTCxHQUE0QlQsQ0FBQyxDQUFDRixXQUFXLENBQUNLLGFBQVosQ0FBMEJPLHFCQUEzQixDQUE3QjtBQVRVO0FBVWI7QUFFRDtBQUNKO0FBQ0E7Ozs7O1dBQ0ksc0JBQWE7QUFBQTs7QUFDVCxrRkFEUyxDQUdUOzs7QUFDQSxXQUFLWCxjQUFMLENBQW9CWSxRQUFwQixDQUE2QjtBQUN6QkMsUUFBQUEsUUFBUSxFQUFFLG9CQUFNO0FBQ1osY0FBSSxNQUFJLENBQUNiLGNBQUwsQ0FBb0JZLFFBQXBCLENBQTZCLFlBQTdCLENBQUosRUFBZ0Q7QUFDNUMsWUFBQSxNQUFJLENBQUNWLGtCQUFMLENBQXdC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ek4sQ0FBQyxDQUFDaU8sUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQixNQUFNQyxRQUFRLEdBQUcsSUFBSXJPLFdBQUosRUFBakI7QUFDQXFPLEVBQUFBLFFBQVEsQ0FBQzFNLFVBQVQ7QUFDSCxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyLCBQcm92aWRlclRvb2x0aXBNYW5hZ2VyLCBpMThuLCBTaXBQcm92aWRlcnNBUEkgKi9cblxuLyoqXG4gKiBTSVAgcHJvdmlkZXIgbWFuYWdlbWVudCBmb3JtXG4gKiBAY2xhc3MgUHJvdmlkZXJTSVBcbiAqL1xuY2xhc3MgUHJvdmlkZXJTSVAgZXh0ZW5kcyBQcm92aWRlckJhc2UgeyAgXG4gICAgLy8gU0lQLXNwZWNpZmljIHNlbGVjdG9yc1xuICAgIHN0YXRpYyBTSVBfU0VMRUNUT1JTID0ge1xuICAgICAgICBBRERJVElPTkFMX0hPU1RTX1RBQkxFOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUnLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RTX0RVTU1ZOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmR1bW15JyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19URU1QTEFURTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5ob3N0LXJvdy10cGwnLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RfSU5QVVQ6ICcjYWRkaXRpb25hbC1ob3N0IGlucHV0JyxcbiAgICAgICAgREVMRVRFX1JPV19CVVRUT046ICcuZGVsZXRlLXJvdy1idXR0b24nLFxuICAgICAgICBIT1NUX1JPVzogJy5ob3N0LXJvdydcbiAgICB9O1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcignU0lQJyk7XG4gICAgICAgIHRoaXMuJHF1YWxpZnlUb2dnbGUgPSAkKCcjcXVhbGlmeScpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZSA9ICQoJyNxdWFsaWZ5LWZyZXEnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBqUXVlcnkgb2JqZWN0c1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX0RVTU1ZKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGVtcGxhdGUgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19URU1QTEFURSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfVEFCTEUpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0ID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVF9JTlBVVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTsgXG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdGhpcy4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImRpc2FibGVmcm9tdXNlclwiXScpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIHN0YXRpYyBkcm9wZG93bnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYnVnIGNoZWNrYm94IC0gdXNpbmcgcGFyZW50IGNvbnRhaW5lciB3aXRoIGNsYXNzIHNlbGVjdG9yXG4gICAgICAgICQoJyNjaWRfZGlkX2RlYnVnJykucGFyZW50KCcuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIFByb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRhYnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGNvbXBvbmVudHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFiIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFicygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpYWdub3N0aWNzIHRhYiBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICBpZiAodGhpcy5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ29wYWNpdHknLCAnMC40NScpXG4gICAgICAgICAgICAgICAgLmNzcygnY3Vyc29yJywgJ25vdC1hbGxvd2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ29wYWNpdHknLCAnJylcbiAgICAgICAgICAgICAgICAuY3NzKCdjdXJzb3InLCAnJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiAodGFiUGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHR5cGVvZiBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciAhPT0gJ3VuZGVmaW5lZCcgJiYgIXNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiB3aGVuIGl0IGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25Mb2FkOiAodGFiUGF0aCwgcGFyYW1ldGVyQXJyYXksIGhpc3RvcnlFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEJsb2NrIGxvYWRpbmcgb2YgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN3aXRjaCBiYWNrIHRvIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNsaWNrIHByZXZlbnRpb24gZm9yIGRpc2FibGVkIHRhYlxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKS5vZmYoJ2NsaWNrLmRpc2FibGVkJykub24oJ2NsaWNrLmRpc2FibGVkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBzdGF5IG9uIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNpcEV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyBzdHJpbmcgdG8gYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0YWJsZVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LmtleXByZXNzKChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBob3N0IGZyb20gYWRkaXRpb25hbC1ob3N0cy10YWJsZSAtIHVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlLm9uKCdjbGljaycsIFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuREVMRVRFX1JPV19CVVRUT04sIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEVE1GIG1vZGUgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjZHRtZm1vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJhbnNwb3J0IHByb3RvY29sIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyN0cmFuc3BvcnQtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgQ2FsbGVySUQgc291cmNlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2FsbGVySWRTb3VyY2VEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI2NpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRElEIHNvdXJjZSBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjZGlkX3NvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMub25EaWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBDYWxsZXJJRCBzb3VyY2UgY2hhbmdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgQ2FsbGVySUQgc291cmNlXG4gICAgICovXG4gICAgb25DYWxsZXJJZFNvdXJjZUNoYW5nZSh2YWx1ZSkge1xuICAgICAgICBjb25zdCAkY3VzdG9tU2V0dGluZ3MgPSAkKCcjY2FsbGVyaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIC8vIE1ha2UgY3VzdG9tIGhlYWRlciBmaWVsZCByZXF1aXJlZFxuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBTaG93IGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignZmFkZSBkb3duJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlcXVpcmVkIHN0YXR1c1xuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBjdXN0b20gZmllbGRzIHdoZW4gbm90IGluIHVzZVxuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3N0YXJ0JykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX2VuZCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9yZWdleCcpLnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIERJRCBzb3VyY2UgY2hhbmdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgRElEIHNvdXJjZVxuICAgICAqL1xuICAgIG9uRGlkU291cmNlQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjdXN0b21TZXR0aW5ncyA9ICQoJyNkaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIC8vIE1ha2UgY3VzdG9tIGhlYWRlciBmaWVsZCByZXF1aXJlZFxuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBTaG93IGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignZmFkZSBkb3duJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlcXVpcmVkIHN0YXR1c1xuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBjdXN0b20gZmllbGRzIHdoZW4gbm90IGluIHVzZVxuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3N0YXJ0JykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX2VuZCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9yZWdleCcpLnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIHYzIHdpdGggYXV0by1kZXRlY3Rpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFNpcFByb3ZpZGVyc0FQSSwgLy8gVXNlIFNJUC1zcGVjaWZpYyBBUEkgY2xpZW50IHYzXG4gICAgICAgICAgICBhdXRvRGV0ZWN0TWV0aG9kOiB0cnVlIC8vIEF1dG9tYXRpY2FsbHkgZGV0ZWN0IGNyZWF0ZS91cGRhdGUgYmFzZWQgb24gaWQgZmllbGRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvbW9kaWZ5c2lwL2A7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgYXV0b21hdGljIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvblxuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm0gLSB0aGlzIHdhcyBtaXNzaW5nIVxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1hcmsgZm9ybSBhcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICB0aGlzLmZvcm1Jbml0aWFsaXplZCA9IHRydWU7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBJTVBPUlRBTlQ6IERvbid0IG92ZXJ3cml0ZSByZXN1bHQuZGF0YSAtIGl0IGFscmVhZHkgY29udGFpbnMgcHJvY2Vzc2VkIGNoZWNrYm94IHZhbHVlc1xuICAgICAgICAvLyBKdXN0IGFkZC9tb2RpZnkgc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcHJvdmlkZXIgdHlwZVxuICAgICAgICByZXN1bHQuZGF0YS50eXBlID0gdGhpcy5wcm92aWRlclR5cGU7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgYWRkaXRpb25hbCBob3N0cyBmb3IgU0lQIC0gY29sbGVjdCBmcm9tIHRhYmxlXG4gICAgICAgIGNvbnN0IGFkZGl0aW9uYWxIb3N0cyA9IFtdO1xuICAgICAgICAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0Ym9keSB0ci5ob3N0LXJvdycpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBob3N0ID0gJChlbGVtZW50KS5maW5kKCd0ZC5hZGRyZXNzJykudGV4dCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChob3N0KSB7XG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbEhvc3RzLnB1c2goeyBhZGRyZXNzOiBob3N0IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9ubHkgYWRkIGlmIHRoZXJlIGFyZSBob3N0c1xuICAgICAgICBpZiAoYWRkaXRpb25hbEhvc3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFkZGl0aW9uYWxIb3N0cyA9IGFkZGl0aW9uYWxIb3N0cztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgcG9wdWxhdGVGb3JtRGF0YSB0byBoYW5kbGUgU0lQLXNwZWNpZmljIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gQ2FsbCBwYXJlbnQgbWV0aG9kIGZpcnN0IGZvciBjb21tb24gZmllbGRzXG4gICAgICAgIHN1cGVyLnBvcHVsYXRlRm9ybURhdGEoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICAvLyBTSVAtc3BlY2lmaWMgZmllbGRzIC0gYmFja2VuZCBwcm92aWRlcyBkZWZhdWx0c1xuICAgICAgICAgICAgJCgnI2R0bWZtb2RlJykudmFsKGRhdGEuZHRtZm1vZGUgfHwgJycpO1xuICAgICAgICAgICAgJCgnI3RyYW5zcG9ydCcpLnZhbChkYXRhLnRyYW5zcG9ydCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZnJvbXVzZXInKS52YWwoZGF0YS5mcm9tdXNlciB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZnJvbWRvbWFpbicpLnZhbChkYXRhLmZyb21kb21haW4gfHwgJycpO1xuICAgICAgICAgICAgJCgnI291dGJvdW5kX3Byb3h5JykudmFsKGRhdGEub3V0Ym91bmRfcHJveHkgfHwgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTSVAtc3BlY2lmaWMgY2hlY2tib3hlc1xuICAgICAgICAgICAgaWYgKGRhdGEuZGlzYWJsZWZyb211c2VyID09PSAnMScgfHwgZGF0YS5kaXNhYmxlZnJvbXVzZXIgPT09IHRydWUpICQoJyNkaXNhYmxlZnJvbXVzZXInKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFF1YWxpZnkgZnJlcXVlbmN5IC0gYmFja2VuZCBwcm92aWRlcyBkZWZhdWx0XG4gICAgICAgICAgICAkKCcjcXVhbGlmeWZyZXEnKS52YWwoZGF0YS5xdWFsaWZ5ZnJlcSB8fCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENhbGxlcklEL0RJRCBmaWVsZHNcbiAgICAgICAgICAgICQoJyNjaWRfc291cmNlJykudmFsKGRhdGEuY2lkX3NvdXJjZSB8fCAnZGVmYXVsdCcpO1xuICAgICAgICAgICAgJCgnI2RpZF9zb3VyY2UnKS52YWwoZGF0YS5kaWRfc291cmNlIHx8ICdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAkKCcjY2lkX2N1c3RvbV9oZWFkZXInKS52YWwoZGF0YS5jaWRfY3VzdG9tX2hlYWRlciB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9zdGFydCcpLnZhbChkYXRhLmNpZF9wYXJzZXJfc3RhcnQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfZW5kJykudmFsKGRhdGEuY2lkX3BhcnNlcl9lbmQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfcmVnZXgnKS52YWwoZGF0YS5jaWRfcGFyc2VyX3JlZ2V4IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLnZhbChkYXRhLmRpZF9jdXN0b21faGVhZGVyIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3N0YXJ0JykudmFsKGRhdGEuZGlkX3BhcnNlcl9zdGFydCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9lbmQnKS52YWwoZGF0YS5kaWRfcGFyc2VyX2VuZCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9yZWdleCcpLnZhbChkYXRhLmRpZF9wYXJzZXJfcmVnZXggfHwgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgY2lkX2RpZF9kZWJ1ZyBjaGVja2JveFxuICAgICAgICAgICAgaWYgKGRhdGEuY2lkX2RpZF9kZWJ1ZyA9PT0gJzEnIHx8IGRhdGEuY2lkX2RpZF9kZWJ1ZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICQoJyNjaWRfZGlkX2RlYnVnJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjY2lkX2RpZF9kZWJ1ZycpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB2YWx1ZXMgLSBiYWNrZW5kIHByb3ZpZGVzIGRlZmF1bHRzLCBqdXN0IHNldCBzZWxlY3RlZCB2YWx1ZXNcbiAgICAgICAgICAgIGNvbnN0IGRyb3Bkb3duVXBkYXRlcyA9IFtcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiAnI2R0bWZtb2RlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuZHRtZm1vZGUgfHwgJycgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiAnI3RyYW5zcG9ydC1kcm9wZG93bicsIHZhbHVlOiBkYXRhLnRyYW5zcG9ydCB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjcmVnaXN0cmF0aW9uX3R5cGUtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjY2lkX3NvdXJjZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmNpZF9zb3VyY2UgfHwgJycgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiAnI2RpZF9zb3VyY2UtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5kaWRfc291cmNlIHx8ICcnIH1cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRyb3Bkb3duVXBkYXRlcy5mb3JFYWNoKCh7IHNlbGVjdG9yLCB2YWx1ZSB9KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGRpdGlvbmFsIGhvc3RzIC0gcG9wdWxhdGUgYWZ0ZXIgZm9ybSBpcyByZWFkeVxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyhkYXRhLmFkZGl0aW9uYWxIb3N0cyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIHN1cGVyLmNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YSBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlkICYmICEkKCcjaWQnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNpZCcpLnZhbChyZXNwb25zZS5kYXRhLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhlIEZvcm0uanMgd2lsbCBoYW5kbGUgdGhlIHJlbG9hZCBhdXRvbWF0aWNhbGx5IGlmIHJlc3BvbnNlLnJlbG9hZCBpcyBwcmVzZW50XG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIFJFU1QgQVBJIHJldHVybnMgcmVsb2FkIHBhdGggbGlrZSBcInByb3ZpZGVycy9tb2RpZnlzaXAvU0lQLVRSVU5LLXh4eFwiXG4gICAgICAgIH1cbiAgICB9XG4gICAgXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHJ1bGVzTWFwID0ge1xuICAgICAgICAgICAgb3V0Ym91bmQ6ICgpID0+IHRoaXMuZ2V0T3V0Ym91bmRSdWxlcygpLFxuICAgICAgICAgICAgaW5ib3VuZDogKCkgPT4gdGhpcy5nZXRJbmJvdW5kUnVsZXMoKSxcbiAgICAgICAgICAgIG5vbmU6ICgpID0+IHRoaXMuZ2V0Tm9uZVJ1bGVzKCksXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBydWxlcyA9IHJ1bGVzTWFwW3JlZ1R5cGVdID8gcnVsZXNNYXBbcmVnVHlwZV0oKSA6IHRoaXMuZ2V0T3V0Ym91bmRSdWxlcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIENhbGxlcklEL0RJRCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIHJldHVybiB0aGlzLmFkZENhbGxlcklkRGlkUnVsZXMocnVsZXMpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgQ2FsbGVySUQvRElEIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcnVsZXMgLSBFeGlzdGluZyBydWxlc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFJ1bGVzIHdpdGggQ2FsbGVySUQvRElEIHZhbGlkYXRpb25cbiAgICAgKi9cbiAgICBhZGRDYWxsZXJJZERpZFJ1bGVzKHJ1bGVzKSB7XG4gICAgICAgIGNvbnN0IGNhbGxlcklkU291cmNlID0gJCgnI2NpZF9zb3VyY2UnKS52YWwoKTtcbiAgICAgICAgY29uc3QgZGlkU291cmNlID0gJCgnI2RpZF9zb3VyY2UnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjdXN0b20gaGVhZGVyIHZhbGlkYXRpb24gd2hlbiBjdXN0b20gc291cmNlIGlzIHNlbGVjdGVkXG4gICAgICAgIGNvbnN0IGN1c3RvbUhlYWRlclJ1bGVzID0ge1xuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5IHx8ICdQbGVhc2Ugc3BlY2lmeSBjdXN0b20gaGVhZGVyIG5hbWUnLFxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bQS1aYS16MC05LV9dKyQvXScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVDdXN0b21IZWFkZXJGb3JtYXQgfHwgJ0hlYWRlciBuYW1lIGNhbiBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycywgZGFzaCBhbmQgdW5kZXJzY29yZScsXG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxlcklkU291cmNlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgcnVsZXMuY2lkX2N1c3RvbV9oZWFkZXIgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NpZF9jdXN0b21faGVhZGVyJyxcbiAgICAgICAgICAgICAgICAuLi5jdXN0b21IZWFkZXJSdWxlc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGRpZFNvdXJjZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIHJ1bGVzLmRpZF9jdXN0b21faGVhZGVyID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkaWRfY3VzdG9tX2hlYWRlcicsXG4gICAgICAgICAgICAgICAgLi4uY3VzdG9tSGVhZGVyUnVsZXNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlZ2V4IHZhbGlkYXRpb24gaWYgcHJvdmlkZWQgKG9wdGlvbmFsIGZpZWxkcylcbiAgICAgICAgY29uc3QgcmVnZXhWYWxpZGF0aW9uUnVsZSA9IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2NhbGxiYWNrJyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFJlZ0V4cCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUludmFsaWRSZWdleCB8fCAnSW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb24nLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkKCcjY2lkX3BhcnNlcl9yZWdleCcpLnZhbCgpKSB7XG4gICAgICAgICAgICBydWxlcy5jaWRfcGFyc2VyX3JlZ2V4ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjaWRfcGFyc2VyX3JlZ2V4JyxcbiAgICAgICAgICAgICAgICAuLi5yZWdleFZhbGlkYXRpb25SdWxlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoKSkge1xuICAgICAgICAgICAgcnVsZXMuZGlkX3BhcnNlcl9yZWdleCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGlkX3BhcnNlcl9yZWdleCcsXG4gICAgICAgICAgICAgICAgLi4ucmVnZXhWYWxpZGF0aW9uUnVsZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJ1bGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRPdXRib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyB8fCAnSG9zdCBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMgYW5kIGh5cGhlbnMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeW2EtekEtWjAtOV8uLV0rJCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzIHx8ICdVc2VybmFtZSBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMgYW5kIHN5bWJvbHM6IF8gLSAuJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnXlthLXpBLVowLTlfLi1dKyQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyB8fCAnVXNlcm5hbWUgY2FuIG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzIGFuZCBzeW1ib2xzOiBfIC0gLicsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG5vbmUgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9uZVJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyB8fCAnSG9zdCBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMgYW5kIGh5cGhlbnMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBob3N0IGxhYmVsIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpIHtcbiAgICAgICAgY29uc3QgJGhvc3RMYWJlbFRleHQgPSAkKCcjaG9zdExhYmVsVGV4dCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgICRob3N0TGFiZWxUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0IG9yIElQIEFkZHJlc3MnKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICRob3N0TGFiZWxUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyB8fCAnUmVtb3RlIEhvc3Qgb3IgSVAgQWRkcmVzcycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZvciBpbmJvdW5kLCB0aGUgZmllbGQgaXMgaGlkZGVuIHNvIG5vIG5lZWQgdG8gdXBkYXRlIGxhYmVsXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiB0aGUgcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0ge1xuICAgICAgICAgICAgaG9zdDogJCgnI2VsSG9zdCcpLFxuICAgICAgICAgICAgcG9ydDogJCgnI2VsUG9ydCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyNlbFVzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6ICQoJyNlbFNlY3JldCcpLFxuICAgICAgICAgICAgYWRkaXRpb25hbEhvc3Q6ICQoJyNlbEFkZGl0aW9uYWxIb3N0cycpLFxuICAgICAgICAgICAgbmV0d29ya0ZpbHRlcjogJCgnI2VsTmV0d29ya0ZpbHRlcicpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZHMgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6IHRoaXMuJHNlY3JldCxcbiAgICAgICAgICAgIG5ldHdvcmtGaWx0ZXJJZDogJCgnI25ldHdvcmtmaWx0ZXJpZCcpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGNvbnN0IGNvbmZpZ3MgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdhZGRpdGlvbmFsSG9zdCddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWyduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLk5PTkVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlc2V0TmV0d29ya0ZpbHRlcjogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluYm91bmQ6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ3VzZXJuYW1lJywgJ3NlY3JldCcsICduZXR3b3JrRmlsdGVyJywgJ2FkZGl0aW9uYWxIb3N0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ2hvc3QnLCAncG9ydCddLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlYWRvbmx5VXNlcm5hbWU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXV0b0dlbmVyYXRlUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY2xlYXJWYWxpZGF0aW9uRm9yOiBbJ2hvc3QnLCAncG9ydCddXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm9uZToge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdhZGRpdGlvbmFsSG9zdCcsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbXSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRUb29sdGlwOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1ha2VPcHRpb25hbDogWydzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBjbGVhclZhbGlkYXRpb25Gb3I6IFsndXNlcm5hbWUnLCAnc2VjcmV0J11cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY29uZmlnID0gY29uZmlnc1tyZWdUeXBlXSB8fCBjb25maWdzLm91dGJvdW5kO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgdmlzaWJpbGl0eVxuICAgICAgICBjb25maWcudmlzaWJsZS5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5zaG93KCkpO1xuICAgICAgICBjb25maWcuaGlkZGVuLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LmhpZGUoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgZmllbGRcbiAgICAgICAgaWYgKGNvbmZpZy5yZWFkb25seVVzZXJuYW1lKSB7XG4gICAgICAgICAgICBmaWVsZHMudXNlcm5hbWUudmFsKHByb3ZpZGVySWQpLmF0dHIoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmVzZXQgdXNlcm5hbWUgaWYgaXQgbWF0Y2hlcyBwcm92aWRlciBJRCB3aGVuIG5vdCBpbmJvdW5kXG4gICAgICAgICAgICBpZiAoZmllbGRzLnVzZXJuYW1lLnZhbCgpID09PSBwcm92aWRlcklkICYmIHJlZ1R5cGUgIT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgaWYgZW1wdHlcbiAgICAgICAgaWYgKGNvbmZpZy5hdXRvR2VuZXJhdGVQYXNzd29yZCAmJiBmaWVsZHMuc2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycgJiYgdGhpcy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgdGhpcy5wYXNzd29yZFdpZGdldC5lbGVtZW50cy4kZ2VuZXJhdGVCdG4/LnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlc2V0IG5ldHdvcmsgZmlsdGVyIGZvciBvdXRib3VuZFxuICAgICAgICBpZiAoY29uZmlnLnJlc2V0TmV0d29ya0ZpbHRlcikge1xuICAgICAgICAgICAgZmllbGRzLm5ldHdvcmtGaWx0ZXJJZC52YWwoJ25vbmUnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHdpZGdldCBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmICh0aGlzLnBhc3N3b3JkV2lkZ2V0ICYmIGNvbmZpZy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQudXBkYXRlQ29uZmlnKHRoaXMucGFzc3dvcmRXaWRnZXQsIGNvbmZpZy5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCB0b29sdGlwXG4gICAgICAgIGlmIChjb25maWcuc2hvd1Bhc3N3b3JkVG9vbHRpcCkge1xuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTWFrZSBmaWVsZHMgb3B0aW9uYWxcbiAgICAgICAgY29uZmlnLm1ha2VPcHRpb25hbD8uZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICAkKGAjZWwke2ZpZWxkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZmllbGQuc2xpY2UoMSl9YCkucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnMgZm9yIHNwZWNpZmllZCBmaWVsZHNcbiAgICAgICAgY29uZmlnLmNsZWFyVmFsaWRhdGlvbkZvcj8uZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZCk7XG4gICAgICAgICAgICAkKGAjJHtmaWVsZH1gKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaG9zdCBsYWJlbFxuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RMYWJlbChyZWdUeXBlKTsgXG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiAnZGlzYWJsZWZyb211c2VyJyBjaGVja2JveFxuICAgICAgICAvLyBVc2UgdGhlIG91dGVyIGRpdi5jaGVja2JveCBjb250YWluZXIgaW5zdGVhZCBvZiBpbnB1dCBlbGVtZW50XG4gICAgICAgIGNvbnN0IGVsID0gJCgnaW5wdXRbbmFtZT1cImRpc2FibGVmcm9tdXNlclwiXScpLmNsb3Nlc3QoJy51aS5jaGVja2JveCcpO1xuICAgICAgICBjb25zdCBmcm9tVXNlciA9ICQoJyNkaXZGcm9tVXNlcicpO1xuICAgICAgICBpZiAoZWwubGVuZ3RoID4gMCAmJiBlbC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBmcm9tVXNlci5oaWRlKCk7XG4gICAgICAgICAgICBmcm9tVXNlci5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbVVzZXIuc2hvdygpO1xuICAgICAgICAgICAgZnJvbVVzZXIuYWRkQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBDYWxsZXJJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGNpZERyb3Bkb3duID0gJCgnI2NpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKGNpZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGNpZFZhbHVlID0gY2lkRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgY2lkQ3VzdG9tU2V0dGluZ3MgPSAkKCcjY2FsbGVyaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgICAgICBpZiAoY2lkVmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgY2lkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignc2hvdycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBjaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdoaWRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBESUQgY3VzdG9tIHNldHRpbmdzIHZpc2liaWxpdHkgYmFzZWQgb24gY3VycmVudCBkcm9wZG93biB2YWx1ZVxuICAgICAgICBjb25zdCBkaWREcm9wZG93biA9ICQoJyNkaWRfc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmIChkaWREcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkaWRWYWx1ZSA9IGRpZERyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGRpZEN1c3RvbVNldHRpbmdzID0gJCgnI2RpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgICAgIGlmIChkaWRWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBkaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdzaG93Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGRpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY29tcGxldGlvbiBvZiBob3N0IGFkZHJlc3MgaW5wdXRcbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdhZGRpdGlvbmFsLWhvc3QnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IHZhbHVlLm1hdGNoKHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBpbnB1dCB2YWx1ZVxuICAgICAgICAgICAgaWYgKHZhbGlkYXRpb24gPT09IG51bGwgfHwgdmFsaWRhdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgaG9zdCBhZGRyZXNzIGFscmVhZHkgZXhpc3RzXG4gICAgICAgICAgICBpZiAoJChgLmhvc3Qtcm93W2RhdGEtdmFsdWU9XFxcIiR7dmFsdWV9XFxcIl1gKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdHIgPSB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZS5sYXN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGNsb25lID0gJHRyLmNsb25lKGZhbHNlKTsgLy8gVXNlIGZhbHNlIHNpbmNlIGV2ZW50cyBhcmUgZGVsZWdhdGVkXG4gICAgICAgICAgICAgICAgJGNsb25lXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaG9zdC1yb3ctdHBsJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdob3N0LXJvdycpXG4gICAgICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmZpbmQoJy5hZGRyZXNzJykuaHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGV4aXN0aW5nSG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgICAgICAgICAgaWYgKCRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJHRyLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgaG9zdHMgdGFibGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0c1RhYmxlVmlldygpIHtcbiAgICAgICAgY29uc3QgJGhvc3RSb3dzID0gdGhpcy4kZm9ybU9iai5maW5kKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1cpO1xuICAgICAgICBpZiAoJGhvc3RSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGFkZGl0aW9uYWwgaG9zdHMgZnJvbSBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGFkZGl0aW9uYWxIb3N0cyAtIEFycmF5IG9mIGFkZGl0aW9uYWwgaG9zdHMgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyhhZGRpdGlvbmFsSG9zdHMpIHtcbiAgICAgICAgaWYgKCFhZGRpdGlvbmFsSG9zdHMgfHwgIUFycmF5LmlzQXJyYXkoYWRkaXRpb25hbEhvc3RzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBob3N0cyBmaXJzdCAoZXhjZXB0IHRlbXBsYXRlIGFuZCBkdW1teSlcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGFibGUuZmluZChgdGJvZHkgdHIke1Byb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1d9YCkucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZWFjaCBob3N0IHVzaW5nIHRoZSBzYW1lIGxvZ2ljIGFzIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzXG4gICAgICAgIGFkZGl0aW9uYWxIb3N0cy5mb3JFYWNoKChob3N0T2JqKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgYm90aCBvYmplY3QgZm9ybWF0IHtpZCwgYWRkcmVzc30gYW5kIHN0cmluZyBmb3JtYXRcbiAgICAgICAgICAgIGNvbnN0IGhvc3RBZGRyZXNzID0gdHlwZW9mIGhvc3RPYmogPT09ICdzdHJpbmcnID8gaG9zdE9iaiA6IGhvc3RPYmouYWRkcmVzcztcbiAgICAgICAgICAgIGlmIChob3N0QWRkcmVzcyAmJiBob3N0QWRkcmVzcy50cmltKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdGhlIHNhbWUgbG9naWMgYXMgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3NcbiAgICAgICAgICAgICAgICBjb25zdCAkdHIgPSB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZS5sYXN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGNsb25lID0gJHRyLmNsb25lKGZhbHNlKTsgLy8gVXNlIGZhbHNlIHNpbmNlIGV2ZW50cyBhcmUgZGVsZWdhdGVkXG4gICAgICAgICAgICAgICAgJGNsb25lXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaG9zdC1yb3ctdHBsJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdob3N0LXJvdycpXG4gICAgICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCBob3N0QWRkcmVzcyk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmZpbmQoJy5hZGRyZXNzJykuaHRtbChob3N0QWRkcmVzcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5zZXJ0IHRoZSBjbG9uZWQgcm93XG4gICAgICAgICAgICAgICAgY29uc3QgJGV4aXN0aW5nSG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgICAgICAgICAgaWYgKCRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJHRyLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0YWJsZSB2aXNpYmlsaXR5XG4gICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICB9XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBwcm92aWRlciBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IG5ldyBQcm92aWRlclNJUCgpO1xuICAgIHByb3ZpZGVyLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==