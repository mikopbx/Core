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
   * Override to add SIP-specific initialization
   */


  _createClass(ProviderSIP, [{
    key: "initialize",
    value: function initialize() {
      // Call parent initialize - this handles the full flow:
      // 1. initializeUIComponents()
      // 2. initializeEventHandlers()
      // 3. initializeForm()
      // 4. loadFormData()
      _get(_getPrototypeOf(ProviderSIP.prototype), "initialize", this).call(this);
    }
    /**
     * Override initializeUIComponents to add SIP-specific UI initialization
     */

  }, {
    key: "initializeUIComponents",
    value: function initializeUIComponents() {
      var _this2 = this;

      // Call parent first
      _get(_getPrototypeOf(ProviderSIP.prototype), "initializeUIComponents", this).call(this); // SIP-specific UI components


      this.$qualifyToggle.checkbox({
        onChange: function onChange() {
          if (_this2.$qualifyToggle.checkbox('is checked')) {
            _this2.$qualifyFreqToggle.removeClass('disabled');
          } else {
            _this2.$qualifyFreqToggle.addClass('disabled');
          }
        }
      }); // Initialize debug checkbox - using parent container with class selector

      $('#cid_did_debug').parent('.checkbox').checkbox(); // Initialize SIP-specific static dropdowns (PHP-rendered)

      this.initializeDtmfModeDropdown();
      this.initializeTransportDropdown();
      this.initializeCallerIdSourceDropdown();
      this.initializeDidSourceDropdown(); // Initialize tabs

      this.initializeTabs();
    }
    /**
     * Override initializeEventHandlers to add SIP-specific handlers
     */

  }, {
    key: "initializeEventHandlers",
    value: function initializeEventHandlers() {
      var _this3 = this;

      // Call parent first
      _get(_getPrototypeOf(ProviderSIP.prototype), "initializeEventHandlers", this).call(this); // SIP-specific event handlers


      $('input[name="disablefromuser"]').on('change', function () {
        _this3.updateVisibilityElements();

        Form.dataChanged();
      }); // Initialize SIP-specific components

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
      var _this4 = this;

      var $dropdown = $('#cid_source-dropdown');
      if ($dropdown.length === 0) return; // Initialize with standard Fomantic UI - it's already rendered by PHP

      $dropdown.dropdown({
        onChange: function onChange(value) {
          _this4.onCallerIdSourceChange(value);

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
      var _this5 = this;

      var $dropdown = $('#did_source-dropdown');
      if ($dropdown.length === 0) return; // Initialize with standard Fomantic UI - it's already rendered by PHP

      $dropdown.dropdown({
        onChange: function onChange(value) {
          _this5.onDidSourceChange(value);

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

      Form.initialize(); // Initialize field help tooltips after PasswordWidget has created all buttons

      ProviderSipTooltipManager.initialize(); // Mark form as fully initialized

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
      }); // Always send additionalHosts to allow deletion of all hosts

      result.data.additionalHosts = additionalHosts;
      return result;
    }
    /**
     * Override initializeDropdownsWithData to set SIP-specific dropdown values
     * Called from parent's populateForm() in beforePopulate callback
     * @param {object} data - Provider data from API
     */

  }, {
    key: "initializeDropdownsWithData",
    value: function initializeDropdownsWithData() {
      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      // Call parent first (initializes common dropdowns like networkfilterid)
      _get(_getPrototypeOf(ProviderSIP.prototype), "initializeDropdownsWithData", this).call(this, data); // SIP-specific dropdowns are already initialized in initializeUIComponents
      // Just set their values from API data


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
      });
    }
    /**
     * Override populateFormData to handle SIP-specific fields
     * Called from parent's populateForm() in afterPopulate callback
     * Most fields are handled by Form.populateFormSilently()
     * @param {object} data - Provider data from API
     */

  }, {
    key: "populateFormData",
    value: function populateFormData(data) {
      // Call parent method first
      _get(_getPrototypeOf(ProviderSIP.prototype), "populateFormData", this).call(this, data); // Additional hosts - populate after form is ready


      if (data.additionalHosts) {
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
      var _this6 = this;

      var regType = $('#registration_type').val();
      var rulesMap = {
        outbound: function outbound() {
          return _this6.getOutboundRules();
        },
        inbound: function inbound() {
          return _this6.getInboundRules();
        },
        none: function none() {
          return _this6.getNoneRules();
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
            value: '^[a-zA-Z0-9_.+\\-]+$',
            prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters
          }]
        },
        secret: {
          identifier: 'secret',
          optional: true,
          rules: []
        },
        // Port is optional: empty value enables SRV-based discovery (RFC 3263).
        // PJSIP queries _sip._udp/_tcp/_tls.<host> when URI has no explicit port.
        port: {
          identifier: 'port',
          optional: true,
          rules: [{
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
            value: '^[a-zA-Z0-9_.+\\-]+$',
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
        // Port is optional: empty value enables SRV-based discovery (RFC 3263).
        port: {
          identifier: 'port',
          optional: true,
          rules: [{
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
          _this7 = this;

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
      }); // Handle username field - ensure it's always editable

      fields.username.removeAttr('readonly'); // Pre-fill username with provider ID for new inbound providers
      // providerId already contains ID from getDefault (loaded in loadFormData)

      if (regType === 'inbound' && this.isNewProvider && (!fields.username.val() || fields.username.val().trim() === '')) {
        fields.username.val(providerId);
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
        _this7.$formObj.form('remove prompt', field);

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
      var _this8 = this;

      if (!additionalHosts || !Array.isArray(additionalHosts)) {
        return;
      } // Clear existing hosts first (except template and dummy)


      this.$additionalHostsTable.find("tbody tr".concat(ProviderSIP.SIP_SELECTORS.HOST_ROW)).remove(); // Add each host using the same logic as cbOnCompleteHostAddress

      additionalHosts.forEach(function (hostObj) {
        // Handle both object format {id, address} and string format
        var hostAddress = typeof hostObj === 'string' ? hostObj : hostObj.address;

        if (hostAddress && hostAddress.trim()) {
          // Use the same logic as cbOnCompleteHostAddress
          var $tr = _this8.$additionalHostsTemplate.last();

          var $clone = $tr.clone(false); // Use false since events are delegated

          $clone.removeClass('host-row-tpl').addClass('host-row').show();
          $clone.attr('data-value', hostAddress);
          $clone.find('.address').html(hostAddress); // Insert the cloned row

          var $existingHostRows = _this8.$formObj.find(ProviderSIP.SIP_SELECTORS.HOST_ROW);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsInJlZ2V4UGF0dGVybiIsInZhbHVlIiwicGFyYW1ldGVyIiwiZmllbGRUeXBlIiwic291cmNlRmllbGQiLCJ2YWwiLCJ0cmltIiwiUmVnRXhwIiwiZSIsImNvbnNvbGUiLCJsb2ciLCJ0b1VwcGVyQ2FzZSIsIm1lc3NhZ2UiLCJjdXN0b21IZWFkZXIiLCJ0ZXN0IiwiUHJvdmlkZXJTSVAiLCIkcXVhbGlmeVRvZ2dsZSIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicGFyZW50IiwiaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24iLCJpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24iLCJpbml0aWFsaXplQ2FsbGVySWRTb3VyY2VEcm9wZG93biIsImluaXRpYWxpemVEaWRTb3VyY2VEcm9wZG93biIsImluaXRpYWxpemVUYWJzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycyIsInVwZGF0ZUhvc3RzVGFibGVWaWV3Iiwic2VsZiIsImlzTmV3UHJvdmlkZXIiLCJjc3MiLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJvbkxvYWQiLCJwYXJhbWV0ZXJBcnJheSIsImhpc3RvcnlFdmVudCIsIm9mZiIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwia2V5cHJlc3MiLCJ3aGljaCIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwiREVMRVRFX1JPV19CVVRUT04iLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwiJGRyb3Bkb3duIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNhbGxlcklkU291cmNlQ2hhbmdlIiwib25EaWRTb3VyY2VDaGFuZ2UiLCIkY3VzdG9tU2V0dGluZ3MiLCJ0cmFuc2l0aW9uIiwiJGZvcm1PYmoiLCJ1cmwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiU2lwUHJvdmlkZXJzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImluaXRpYWxpemUiLCJQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyIiwiZm9ybUluaXRpYWxpemVkIiwicmVzdWx0IiwiZGF0YSIsInR5cGUiLCJwcm92aWRlclR5cGUiLCJhZGRpdGlvbmFsSG9zdHMiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiaG9zdCIsImZpbmQiLCJ0ZXh0IiwicHVzaCIsImFkZHJlc3MiLCJkcm9wZG93blVwZGF0ZXMiLCJzZWxlY3RvciIsImR0bWZtb2RlIiwidHJhbnNwb3J0IiwicmVnaXN0cmF0aW9uX3R5cGUiLCJjaWRfc291cmNlIiwiZGlkX3NvdXJjZSIsImZvckVhY2giLCJwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyIsInJlc3BvbnNlIiwiaWQiLCJyZWdUeXBlIiwicnVsZXNNYXAiLCJvdXRib3VuZCIsImdldE91dGJvdW5kUnVsZXMiLCJpbmJvdW5kIiwiZ2V0SW5ib3VuZFJ1bGVzIiwibm9uZSIsImdldE5vbmVSdWxlcyIsImFkZENhbGxlcklkRGlkUnVsZXMiLCJjaWRfY3VzdG9tX2hlYWRlciIsImlkZW50aWZpZXIiLCJvcHRpb25hbCIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRW1wdHkiLCJkaWRfY3VzdG9tX2hlYWRlciIsImNpZF9wYXJzZXJfcmVnZXgiLCJwcl9WYWxpZGF0ZUludmFsaWRSZWdleCIsImRpZF9wYXJzZXJfcmVnZXgiLCJkZXNjcmlwdGlvbiIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJzZWNyZXQiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQiLCJhZGRpdGlvbmFsX2hvc3RzIiwiaG9zdElucHV0VmFsaWRhdGlvbiIsInByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCIsIiRob3N0TGFiZWxUZXh0IiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MiLCJwcm92aWRlcklkIiwiZWxlbWVudHMiLCJhZGRpdGlvbmFsSG9zdCIsIm5ldHdvcmtGaWx0ZXIiLCJmaWVsZHMiLCIkc2VjcmV0IiwibmV0d29ya0ZpbHRlcklkIiwiY29uZmlncyIsInZpc2libGUiLCJoaWRkZW4iLCJwYXNzd29yZFdpZGdldCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwidmFsaWRhdGlvbiIsIlBhc3N3b3JkV2lkZ2V0IiwiVkFMSURBVElPTiIsIk5PTkUiLCJyZXNldE5ldHdvcmtGaWx0ZXIiLCJTT0ZUIiwiYXV0b0dlbmVyYXRlUGFzc3dvcmQiLCJjbGVhclZhbGlkYXRpb25Gb3IiLCJzaG93UGFzc3dvcmRUb29sdGlwIiwibWFrZU9wdGlvbmFsIiwiY29uZmlnIiwia2V5Iiwic2hvdyIsImhpZGUiLCJyZW1vdmVBdHRyIiwiJGdlbmVyYXRlQnRuIiwidHJpZ2dlciIsInVwZGF0ZUNvbmZpZyIsImhpZGVQYXNzd29yZFRvb2x0aXAiLCJmaWVsZCIsImNoYXJBdCIsInNsaWNlIiwidXBkYXRlSG9zdExhYmVsIiwiZWwiLCJmcm9tVXNlciIsImNpZERyb3Bkb3duIiwiY2lkVmFsdWUiLCJjaWRDdXN0b21TZXR0aW5ncyIsImRpZERyb3Bkb3duIiwiZGlkVmFsdWUiLCJkaWRDdXN0b21TZXR0aW5ncyIsIm1hdGNoIiwiJHRyIiwibGFzdCIsIiRjbG9uZSIsImNsb25lIiwiYXR0ciIsImh0bWwiLCIkZXhpc3RpbmdIb3N0Um93cyIsIkhPU1RfUk9XIiwiYWZ0ZXIiLCIkaG9zdFJvd3MiLCJBcnJheSIsImlzQXJyYXkiLCJob3N0T2JqIiwiaG9zdEFkZHJlc3MiLCJQcm92aWRlckJhc2UiLCJkb2N1bWVudCIsInJlYWR5IiwicHJvdmlkZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFD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LENBQWM0QixJQUFkLENBQW1CcEYsV0FBVyxDQUFDSSxhQUFaLENBQTBCMEwsUUFBN0MsQ0FBMUI7O0FBQ0EsY0FBSUQsaUJBQWlCLENBQUNMLElBQWxCLEdBQXlCdEksTUFBekIsS0FBb0MsQ0FBeEMsRUFBMkM7QUFDdkNxSSxZQUFBQSxHQUFHLENBQUNRLEtBQUosQ0FBVU4sTUFBVjtBQUNILFdBRkQsTUFFTztBQUNISSxZQUFBQSxpQkFBaUIsQ0FBQ0wsSUFBbEIsR0FBeUJPLEtBQXpCLENBQStCTixNQUEvQjtBQUNIO0FBQ0o7QUFDSixPQXRCRCxFQVRxQyxDQWlDckM7O0FBQ0EsV0FBSzlKLG9CQUFMO0FBQ0g7Ozs7RUFyNEJxQjBLLFk7QUF3NEIxQjtBQUNBO0FBQ0E7OztnQkExNEJNck0sVyxtQkFFcUI7QUFDbkJTLEVBQUFBLHNCQUFzQixFQUFFLHlCQURMO0FBRW5CSixFQUFBQSxzQkFBc0IsRUFBRSxnQ0FGTDtBQUduQkUsRUFBQUEseUJBQXlCLEVBQUUsdUNBSFI7QUFJbkJJLEVBQUFBLHFCQUFxQixFQUFFLHdCQUpKO0FBS25Ca0MsRUFBQUEsaUJBQWlCLEVBQUUsb0JBTEE7QUFNbkJpSixFQUFBQSxRQUFRLEVBQUU7QUFOUyxDOztBQXk0QjNCbE4sQ0FBQyxDQUFDME4sUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQixNQUFNQyxRQUFRLEdBQUcsSUFBSXhNLFdBQUosRUFBakI7QUFDQXdNLEVBQUFBLFFBQVEsQ0FBQ2hJLFVBQVQ7QUFDSCxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyLCBQcm92aWRlclRvb2x0aXBNYW5hZ2VyLCBpMThuLCBTaXBQcm92aWRlcnNBUEkgKi9cblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlOiBDaGVjayBpZiByZWdleCBwYXR0ZXJuIGlzIHZhbGlkXG4gKiBPbmx5IHZhbGlkYXRlcyB3aGVuIHRoZSBjb3JyZXNwb25kaW5nIHNvdXJjZSBkcm9wZG93biBpcyBzZXQgdG8gJ2N1c3RvbSdcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnJlZ2V4UGF0dGVybiA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiB7XG4gICAgLy8gUGFyc2UgcGFyYW1ldGVyIHRvIGdldCBmaWVsZCB0eXBlIChjaWQgb3IgZGlkKVxuICAgIGNvbnN0IGZpZWxkVHlwZSA9IHBhcmFtZXRlciB8fCAnY2lkJztcbiAgICBjb25zdCBzb3VyY2VGaWVsZCA9IGZpZWxkVHlwZSA9PT0gJ2RpZCcgPyAnI2RpZF9zb3VyY2UnIDogJyNjaWRfc291cmNlJztcblxuICAgIC8vIFNraXAgdmFsaWRhdGlvbiBpZiBzb3VyY2UgaXMgbm90ICdjdXN0b20nXG4gICAgaWYgKCQoc291cmNlRmllbGQpLnZhbCgpICE9PSAnY3VzdG9tJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBBbGxvdyBlbXB0eSB2YWx1ZXMgKGZpZWxkIGlzIG9wdGlvbmFsKVxuICAgIGlmICghdmFsdWUgfHwgdmFsdWUudHJpbSgpID09PSAnJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSByZWdleCBwYXR0ZXJuXG4gICAgdHJ5IHtcbiAgICAgICAgbmV3IFJlZ0V4cCh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coYEludmFsaWQgJHtmaWVsZFR5cGUudG9VcHBlckNhc2UoKX0gcmVnZXggcGF0dGVybjpgLCB2YWx1ZSwgZS5tZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZTogQ2hlY2sgaWYgY3VzdG9tIGhlYWRlciBpcyB2YWxpZFxuICogT25seSB2YWxpZGF0ZXMgd2hlbiB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgZHJvcGRvd24gaXMgc2V0IHRvICdjdXN0b20nXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21IZWFkZXIgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4ge1xuICAgIC8vIFBhcnNlIHBhcmFtZXRlciB0byBnZXQgZmllbGQgdHlwZSAoY2lkIG9yIGRpZClcbiAgICBjb25zdCBmaWVsZFR5cGUgPSBwYXJhbWV0ZXIgfHwgJ2NpZCc7XG4gICAgY29uc3Qgc291cmNlRmllbGQgPSBmaWVsZFR5cGUgPT09ICdkaWQnID8gJyNkaWRfc291cmNlJyA6ICcjY2lkX3NvdXJjZSc7XG5cbiAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgc291cmNlIGlzIG5vdCAnY3VzdG9tJ1xuICAgIGlmICgkKHNvdXJjZUZpZWxkKS52YWwoKSAhPT0gJ2N1c3RvbScpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRmllbGQgaXMgcmVxdWlyZWQgd2hlbiBzb3VyY2UgaXMgY3VzdG9tXG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBmb3JtYXQ6IG9ubHkgbGV0dGVycywgbnVtYmVycywgZGFzaCBhbmQgdW5kZXJzY29yZVxuICAgIHJldHVybiAvXltBLVphLXowLTktX10rJC8udGVzdCh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIFNJUCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlclNJUFxuICovXG5jbGFzcyBQcm92aWRlclNJUCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7ICBcbiAgICAvLyBTSVAtc3BlY2lmaWMgc2VsZWN0b3JzXG4gICAgc3RhdGljIFNJUF9TRUxFQ1RPUlMgPSB7XG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfVEFCTEU6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZScsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfRFVNTVk6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuZHVtbXknLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RTX1RFTVBMQVRFOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmhvc3Qtcm93LXRwbCcsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVF9JTlBVVDogJyNhZGRpdGlvbmFsLWhvc3QgaW5wdXQnLFxuICAgICAgICBERUxFVEVfUk9XX0JVVFRPTjogJy5kZWxldGUtcm93LWJ1dHRvbicsXG4gICAgICAgIEhPU1RfUk9XOiAnLmhvc3Qtcm93J1xuICAgIH07XG4gICAgXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCdTSVAnKTtcbiAgICAgICAgdGhpcy4kcXVhbGlmeVRvZ2dsZSA9ICQoJyNxdWFsaWZ5Jyk7XG4gICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlID0gJCgnI3F1YWxpZnktZnJlcScpO1xuICAgICAgICBcbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIGpRdWVyeSBvYmplY3RzXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15ID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfRFVNTVkpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX1RFTVBMQVRFKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGFibGUgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19UQUJMRSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUX0lOUFVUKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICogT3ZlcnJpZGUgdG8gYWRkIFNJUC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IGluaXRpYWxpemUgLSB0aGlzIGhhbmRsZXMgdGhlIGZ1bGwgZmxvdzpcbiAgICAgICAgLy8gMS4gaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpXG4gICAgICAgIC8vIDIuIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKClcbiAgICAgICAgLy8gMy4gaW5pdGlhbGl6ZUZvcm0oKVxuICAgICAgICAvLyA0LiBsb2FkRm9ybURhdGEoKVxuICAgICAgICBzdXBlci5pbml0aWFsaXplKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyB0byBhZGQgU0lQLXNwZWNpZmljIFVJIGluaXRpYWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gQ2FsbCBwYXJlbnQgZmlyc3RcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBVSSBjb21wb25lbnRzXG4gICAgICAgIHRoaXMuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVidWcgY2hlY2tib3ggLSB1c2luZyBwYXJlbnQgY29udGFpbmVyIHdpdGggY2xhc3Mgc2VsZWN0b3JcbiAgICAgICAgJCgnI2NpZF9kaWRfZGVidWcnKS5wYXJlbnQoJy5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTSVAtc3BlY2lmaWMgc3RhdGljIGRyb3Bkb3ducyAoUEhQLXJlbmRlcmVkKVxuICAgICAgICB0aGlzLmluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNhbGxlcklkU291cmNlRHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGlkU291cmNlRHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGFicygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE92ZXJyaWRlIGluaXRpYWxpemVFdmVudEhhbmRsZXJzIHRvIGFkZCBTSVAtc3BlY2lmaWMgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gQ2FsbCBwYXJlbnQgZmlyc3RcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKTtcblxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImRpc2FibGVmcm9tdXNlclwiXScpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFNJUC1zcGVjaWZpYyBjb21wb25lbnRzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVNpcEV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRhYiBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRhYnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaWFnbm9zdGljcyB0YWIgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgaWYgKHRoaXMuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAuY3NzKCdvcGFjaXR5JywgJzAuNDUnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ2N1cnNvcicsICdub3QtYWxsb3dlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAuY3NzKCdvcGFjaXR5JywgJycpXG4gICAgICAgICAgICAgICAgLmNzcygnY3Vyc29yJywgJycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogKHRhYlBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiB0eXBlb2YgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIgIT09ICd1bmRlZmluZWQnICYmICFzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkaWFnbm9zdGljcyB0YWIgd2hlbiBpdCBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIuaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uTG9hZDogKHRhYlBhdGgsIHBhcmFtZXRlckFycmF5LCBoaXN0b3J5RXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBCbG9jayBsb2FkaW5nIG9mIGRpYWdub3N0aWNzIHRhYiBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBTd2l0Y2ggYmFjayB0byBzZXR0aW5ncyB0YWJcbiAgICAgICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cInNldHRpbmdzXCJdJykudGFiKCdjaGFuZ2UgdGFiJywgJ3NldHRpbmdzJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkaXRpb25hbCBjbGljayBwcmV2ZW50aW9uIGZvciBkaXNhYmxlZCB0YWJcbiAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJykub2ZmKCdjbGljay5kaXNhYmxlZCcpLm9uKCdjbGljay5kaXNhYmxlZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGlmIChzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugc3RheSBvbiBzZXR0aW5ncyB0YWJcbiAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFNJUC1zcGVjaWZpYyBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBuZXcgc3RyaW5nIHRvIGFkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGFibGVcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC5rZXlwcmVzcygoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUud2hpY2ggPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5jYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgaG9zdCBmcm9tIGFkZGl0aW9uYWwtaG9zdHMtdGFibGUgLSB1c2UgZXZlbnQgZGVsZWdhdGlvbiBmb3IgZHluYW1pYyBlbGVtZW50c1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZS5vbignY2xpY2snLCBQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkRFTEVURV9ST1dfQlVUVE9OLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIHNlbGYudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRFRNRiBtb2RlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI2R0bWZtb2RlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRyYW5zcG9ydCBwcm90b2NvbCBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjdHJhbnNwb3J0LWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIENhbGxlcklEIHNvdXJjZSBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNhbGxlcklkU291cmNlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNjaWRfc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkNhbGxlcklkU291cmNlQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERJRCBzb3VyY2UgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEaWRTb3VyY2VEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI2RpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uRGlkU291cmNlQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgQ2FsbGVySUQgc291cmNlIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIENhbGxlcklEIHNvdXJjZVxuICAgICAqL1xuICAgIG9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGN1c3RvbVNldHRpbmdzID0gJCgnI2NhbGxlcmlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICBpZiAodmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIGN1c3RvbSBoZWFkZXIgZmllbGQgcmVxdWlyZWRcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2ZhZGUgZG93bicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSByZXF1aXJlZCBzdGF0dXNcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIGZpZWxkcyB3aGVuIG5vdCBpbiB1c2VcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9zdGFydCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9lbmQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfcmVnZXgnKS52YWwoJycpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgYW55IHZhbGlkYXRpb24gZXJyb3JzIG9uIGhpZGRlbiBmaWVsZHNcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3JlZ2V4JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm8gbmVlZCB0byByZWluaXRpYWxpemUgZm9ybSAtIHZhbGlkYXRpb24gcnVsZXMgY2hlY2sgc291cmNlIGF1dG9tYXRpY2FsbHlcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIERJRCBzb3VyY2UgY2hhbmdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgRElEIHNvdXJjZVxuICAgICAqL1xuICAgIG9uRGlkU291cmNlQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjdXN0b21TZXR0aW5ncyA9ICQoJyNkaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIC8vIE1ha2UgY3VzdG9tIGhlYWRlciBmaWVsZCByZXF1aXJlZFxuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBTaG93IGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignZmFkZSBkb3duJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlcXVpcmVkIHN0YXR1c1xuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBjdXN0b20gZmllbGRzIHdoZW4gbm90IGluIHVzZVxuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3N0YXJ0JykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX2VuZCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9yZWdleCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBhbnkgdmFsaWRhdGlvbiBlcnJvcnMgb24gaGlkZGVuIGZpZWxkc1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBObyBuZWVkIHRvIHJlaW5pdGlhbGl6ZSBmb3JtIC0gdmFsaWRhdGlvbiBydWxlcyBjaGVjayBzb3VyY2UgYXV0b21hdGljYWxseVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGhpcy5jYkJlZm9yZVNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGhpcy5jYkFmdGVyU2VuZEZvcm0uYmluZCh0aGlzKTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIHYzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBTaXBQcm92aWRlcnNBUEksIC8vIFVzZSBTSVAtc3BlY2lmaWMgQVBJIGNsaWVudCB2M1xuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnlzaXAvYDtcblxuICAgICAgICAvLyBFbmFibGUgYXV0b21hdGljIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvblxuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtIC0gdGhpcyB3YXMgbWlzc2luZyFcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzIGFmdGVyIFBhc3N3b3JkV2lkZ2V0IGhhcyBjcmVhdGVkIGFsbCBidXR0b25zXG4gICAgICAgIFByb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIE1hcmsgZm9ybSBhcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICB0aGlzLmZvcm1Jbml0aWFsaXplZCA9IHRydWU7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBJTVBPUlRBTlQ6IERvbid0IG92ZXJ3cml0ZSByZXN1bHQuZGF0YSAtIGl0IGFscmVhZHkgY29udGFpbnMgcHJvY2Vzc2VkIGNoZWNrYm94IHZhbHVlc1xuICAgICAgICAvLyBKdXN0IGFkZC9tb2RpZnkgc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcHJvdmlkZXIgdHlwZVxuICAgICAgICByZXN1bHQuZGF0YS50eXBlID0gdGhpcy5wcm92aWRlclR5cGU7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgYWRkaXRpb25hbCBob3N0cyBmb3IgU0lQIC0gY29sbGVjdCBmcm9tIHRhYmxlXG4gICAgICAgIGNvbnN0IGFkZGl0aW9uYWxIb3N0cyA9IFtdO1xuICAgICAgICAkKCcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0Ym9keSB0ci5ob3N0LXJvdycpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBob3N0ID0gJChlbGVtZW50KS5maW5kKCd0ZC5hZGRyZXNzJykudGV4dCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChob3N0KSB7XG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbEhvc3RzLnB1c2goeyBhZGRyZXNzOiBob3N0IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFsd2F5cyBzZW5kIGFkZGl0aW9uYWxIb3N0cyB0byBhbGxvdyBkZWxldGlvbiBvZiBhbGwgaG9zdHNcbiAgICAgICAgcmVzdWx0LmRhdGEuYWRkaXRpb25hbEhvc3RzID0gYWRkaXRpb25hbEhvc3RzO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIHRvIHNldCBTSVAtc3BlY2lmaWMgZHJvcGRvd24gdmFsdWVzXG4gICAgICogQ2FsbGVkIGZyb20gcGFyZW50J3MgcG9wdWxhdGVGb3JtKCkgaW4gYmVmb3JlUG9wdWxhdGUgY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSA9IHt9KSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IGZpcnN0IChpbml0aWFsaXplcyBjb21tb24gZHJvcGRvd25zIGxpa2UgbmV0d29ya2ZpbHRlcmlkKVxuICAgICAgICBzdXBlci5pbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSk7XG5cbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIGRyb3Bkb3ducyBhcmUgYWxyZWFkeSBpbml0aWFsaXplZCBpbiBpbml0aWFsaXplVUlDb21wb25lbnRzXG4gICAgICAgIC8vIEp1c3Qgc2V0IHRoZWlyIHZhbHVlcyBmcm9tIEFQSSBkYXRhXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duVXBkYXRlcyA9IFtcbiAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjZHRtZm1vZGUtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5kdG1mbW9kZSB8fCAnJyB9LFxuICAgICAgICAgICAgeyBzZWxlY3RvcjogJyN0cmFuc3BvcnQtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS50cmFuc3BvcnQgfHwgJycgfSxcbiAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjcmVnaXN0cmF0aW9uX3R5cGUtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCAnJyB9LFxuICAgICAgICAgICAgeyBzZWxlY3RvcjogJyNjaWRfc291cmNlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuY2lkX3NvdXJjZSB8fCAnJyB9LFxuICAgICAgICAgICAgeyBzZWxlY3RvcjogJyNkaWRfc291cmNlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuZGlkX3NvdXJjZSB8fCAnJyB9XG4gICAgICAgIF07XG5cbiAgICAgICAgZHJvcGRvd25VcGRhdGVzLmZvckVhY2goKHsgc2VsZWN0b3IsIHZhbHVlIH0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE92ZXJyaWRlIHBvcHVsYXRlRm9ybURhdGEgdG8gaGFuZGxlIFNJUC1zcGVjaWZpYyBmaWVsZHNcbiAgICAgKiBDYWxsZWQgZnJvbSBwYXJlbnQncyBwb3B1bGF0ZUZvcm0oKSBpbiBhZnRlclBvcHVsYXRlIGNhbGxiYWNrXG4gICAgICogTW9zdCBmaWVsZHMgYXJlIGhhbmRsZWQgYnkgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSgpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IG1ldGhvZCBmaXJzdFxuICAgICAgICBzdXBlci5wb3B1bGF0ZUZvcm1EYXRhKGRhdGEpO1xuXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgaG9zdHMgLSBwb3B1bGF0ZSBhZnRlciBmb3JtIGlzIHJlYWR5XG4gICAgICAgIGlmIChkYXRhLmFkZGl0aW9uYWxIb3N0cykge1xuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyhkYXRhLmFkZGl0aW9uYWxIb3N0cyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIHN1cGVyLmNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YSBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlkICYmICEkKCcjaWQnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNpZCcpLnZhbChyZXNwb25zZS5kYXRhLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhlIEZvcm0uanMgd2lsbCBoYW5kbGUgdGhlIHJlbG9hZCBhdXRvbWF0aWNhbGx5IGlmIHJlc3BvbnNlLnJlbG9hZCBpcyBwcmVzZW50XG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIFJFU1QgQVBJIHJldHVybnMgcmVsb2FkIHBhdGggbGlrZSBcInByb3ZpZGVycy9tb2RpZnlzaXAvU0lQLVRSVU5LLXh4eFwiXG4gICAgICAgIH1cbiAgICB9XG4gICAgXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHJ1bGVzTWFwID0ge1xuICAgICAgICAgICAgb3V0Ym91bmQ6ICgpID0+IHRoaXMuZ2V0T3V0Ym91bmRSdWxlcygpLFxuICAgICAgICAgICAgaW5ib3VuZDogKCkgPT4gdGhpcy5nZXRJbmJvdW5kUnVsZXMoKSxcbiAgICAgICAgICAgIG5vbmU6ICgpID0+IHRoaXMuZ2V0Tm9uZVJ1bGVzKCksXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBydWxlcyA9IHJ1bGVzTWFwW3JlZ1R5cGVdID8gcnVsZXNNYXBbcmVnVHlwZV0oKSA6IHRoaXMuZ2V0T3V0Ym91bmRSdWxlcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIENhbGxlcklEL0RJRCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIHJldHVybiB0aGlzLmFkZENhbGxlcklkRGlkUnVsZXMocnVsZXMpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgQ2FsbGVySUQvRElEIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcnVsZXMgLSBFeGlzdGluZyBydWxlc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFJ1bGVzIHdpdGggQ2FsbGVySUQvRElEIHZhbGlkYXRpb25cbiAgICAgKi9cbiAgICBhZGRDYWxsZXJJZERpZFJ1bGVzKHJ1bGVzKSB7XG4gICAgICAgIC8vIEN1c3RvbSBoZWFkZXIgdmFsaWRhdGlvbiB1c2luZyBnbG9iYWwgY3VzdG9tIHJ1bGVzXG4gICAgICAgIHJ1bGVzLmNpZF9jdXN0b21faGVhZGVyID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NpZF9jdXN0b21faGVhZGVyJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbUhlYWRlcltjaWRdJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5LFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5kaWRfY3VzdG9tX2hlYWRlciA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkaWRfY3VzdG9tX2hlYWRlcicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21IZWFkZXJbZGlkXScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVDdXN0b21IZWFkZXJFbXB0eSxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmVnZXggcGF0dGVybiB2YWxpZGF0aW9uIHVzaW5nIGdsb2JhbCBjdXN0b20gcnVsZXNcbiAgICAgICAgcnVsZXMuY2lkX3BhcnNlcl9yZWdleCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjaWRfcGFyc2VyX3JlZ2V4JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ2V4UGF0dGVybltjaWRdJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUludmFsaWRSZWdleFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcblxuICAgICAgICBydWxlcy5kaWRfcGFyc2VyX3JlZ2V4ID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2RpZF9wYXJzZXJfcmVnZXgnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnZXhQYXR0ZXJuW2RpZF0nLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlSW52YWxpZFJlZ2V4XG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFBhcnNlciBzdGFydC9lbmQgZmllbGRzIGRvbid0IG5lZWQgdmFsaWRhdGlvbiAtIHRoZXkgYXJlIHRydWx5IG9wdGlvbmFsXG4gICAgICAgIC8vIE5vIHJ1bGVzIG5lZWRlZCBmb3IgY2lkX3BhcnNlcl9zdGFydCwgY2lkX3BhcnNlcl9lbmQsIGRpZF9wYXJzZXJfc3RhcnQsIGRpZF9wYXJzZXJfZW5kXG5cbiAgICAgICAgcmV0dXJuIHJ1bGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRPdXRib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnXlthLXpBLVowLTlfLitcXFxcLV0rJCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8vIFBvcnQgaXMgb3B0aW9uYWw6IGVtcHR5IHZhbHVlIGVuYWJsZXMgU1JWLWJhc2VkIGRpc2NvdmVyeSAoUkZDIDMyNjMpLlxuICAgICAgICAgICAgLy8gUEpTSVAgcXVlcmllcyBfc2lwLl91ZHAvX3RjcC9fdGxzLjxob3N0PiB3aGVuIFVSSSBoYXMgbm8gZXhwbGljaXQgcG9ydC5cbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnXlthLXpBLVowLTlfLitcXFxcLV0rJCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbOF0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBub25lIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldE5vbmVSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAvLyBQb3J0IGlzIG9wdGlvbmFsOiBlbXB0eSB2YWx1ZSBlbmFibGVzIFNSVi1iYXNlZCBkaXNjb3ZlcnkgKFJGQyAzMjYzKS5cbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGhvc3QgbGFiZWwgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0TGFiZWwocmVnVHlwZSkge1xuICAgICAgICBjb25zdCAkaG9zdExhYmVsVGV4dCA9ICQoJyNob3N0TGFiZWxUZXh0Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGb3IgaW5ib3VuZCwgdGhlIGZpZWxkIGlzIGhpZGRlbiBzbyBubyBuZWVkIHRvIHVwZGF0ZSBsYWJlbFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNlbEhvc3QnKSxcbiAgICAgICAgICAgIHBvcnQ6ICQoJyNlbFBvcnQnKSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjZWxVc2VybmFtZScpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjZWxTZWNyZXQnKSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxIb3N0OiAkKCcjZWxBZGRpdGlvbmFsSG9zdHMnKSxcbiAgICAgICAgICAgIG5ldHdvcmtGaWx0ZXI6ICQoJyNlbE5ldHdvcmtGaWx0ZXInKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZmllbGRzID0ge1xuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyN1c2VybmFtZScpLFxuICAgICAgICAgICAgc2VjcmV0OiB0aGlzLiRzZWNyZXQsXG4gICAgICAgICAgICBuZXR3b3JrRmlsdGVySWQ6ICQoJyNuZXR3b3JrZmlsdGVyaWQnKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBjb25zdCBjb25maWdzID0ge1xuICAgICAgICAgICAgb3V0Ym91bmQ6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZScsICdzZWNyZXQnLCAnYWRkaXRpb25hbEhvc3QnXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFsnbmV0d29ya0ZpbHRlciddLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5OT05FXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXNldE5ldHdvcmtGaWx0ZXI6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbmJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWyd1c2VybmFtZScsICdzZWNyZXQnLCAnbmV0d29ya0ZpbHRlcicsICdhZGRpdGlvbmFsSG9zdCddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWydob3N0JywgJ3BvcnQnXSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhdXRvR2VuZXJhdGVQYXNzd29yZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjbGVhclZhbGlkYXRpb25Gb3I6IFsnaG9zdCcsICdwb3J0J11cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub25lOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ2FkZGl0aW9uYWxIb3N0JywgJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFtdLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZFRvb2x0aXA6IHRydWUsXG4gICAgICAgICAgICAgICAgbWFrZU9wdGlvbmFsOiBbJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGNsZWFyVmFsaWRhdGlvbkZvcjogWyd1c2VybmFtZScsICdzZWNyZXQnXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgY29uZmlndXJhdGlvblxuICAgICAgICBjb25zdCBjb25maWcgPSBjb25maWdzW3JlZ1R5cGVdIHx8IGNvbmZpZ3Mub3V0Ym91bmQ7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSB2aXNpYmlsaXR5XG4gICAgICAgIGNvbmZpZy52aXNpYmxlLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LnNob3coKSk7XG4gICAgICAgIGNvbmZpZy5oaWRkZW4uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uaGlkZSgpKTtcblxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgZmllbGQgLSBlbnN1cmUgaXQncyBhbHdheXMgZWRpdGFibGVcbiAgICAgICAgZmllbGRzLnVzZXJuYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gUHJlLWZpbGwgdXNlcm5hbWUgd2l0aCBwcm92aWRlciBJRCBmb3IgbmV3IGluYm91bmQgcHJvdmlkZXJzXG4gICAgICAgIC8vIHByb3ZpZGVySWQgYWxyZWFkeSBjb250YWlucyBJRCBmcm9tIGdldERlZmF1bHQgKGxvYWRlZCBpbiBsb2FkRm9ybURhdGEpXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcgJiYgdGhpcy5pc05ld1Byb3ZpZGVyICYmICghZmllbGRzLnVzZXJuYW1lLnZhbCgpIHx8IGZpZWxkcy51c2VybmFtZS52YWwoKS50cmltKCkgPT09ICcnKSkge1xuICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnZhbChwcm92aWRlcklkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCBpZiBlbXB0eVxuICAgICAgICBpZiAoY29uZmlnLmF1dG9HZW5lcmF0ZVBhc3N3b3JkICYmIGZpZWxkcy5zZWNyZXQudmFsKCkudHJpbSgpID09PSAnJyAmJiB0aGlzLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0LmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bj8udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVzZXQgbmV0d29yayBmaWx0ZXIgZm9yIG91dGJvdW5kXG4gICAgICAgIGlmIChjb25maWcucmVzZXROZXR3b3JrRmlsdGVyKSB7XG4gICAgICAgICAgICBmaWVsZHMubmV0d29ya0ZpbHRlcklkLnZhbCgnbm9uZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgd2lkZ2V0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMucGFzc3dvcmRXaWRnZXQgJiYgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC51cGRhdGVDb25maWcodGhpcy5wYXNzd29yZFdpZGdldCwgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIHRvb2x0aXBcbiAgICAgICAgaWYgKGNvbmZpZy5zaG93UGFzc3dvcmRUb29sdGlwKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkVG9vbHRpcCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNYWtlIGZpZWxkcyBvcHRpb25hbFxuICAgICAgICBjb25maWcubWFrZU9wdGlvbmFsPy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgICQoYCNlbCR7ZmllbGQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBmaWVsZC5zbGljZSgxKX1gKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9ycyBmb3Igc3BlY2lmaWVkIGZpZWxkc1xuICAgICAgICBjb25maWcuY2xlYXJWYWxpZGF0aW9uRm9yPy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsIGZpZWxkKTtcbiAgICAgICAgICAgICQoYCMke2ZpZWxkfWApLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBob3N0IGxhYmVsXG4gICAgICAgIHRoaXMudXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpOyBcblxuICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uICdkaXNhYmxlZnJvbXVzZXInIGNoZWNrYm94XG4gICAgICAgIC8vIFVzZSB0aGUgb3V0ZXIgZGl2LmNoZWNrYm94IGNvbnRhaW5lciBpbnN0ZWFkIG9mIGlucHV0IGVsZW1lbnRcbiAgICAgICAgY29uc3QgZWwgPSAkKCdpbnB1dFtuYW1lPVwiZGlzYWJsZWZyb211c2VyXCJdJykuY2xvc2VzdCgnLnVpLmNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0IGZyb21Vc2VyID0gJCgnI2RpdkZyb21Vc2VyJyk7XG4gICAgICAgIGlmIChlbC5sZW5ndGggPiAwICYmIGVsLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGZyb21Vc2VyLmhpZGUoKTtcbiAgICAgICAgICAgIGZyb21Vc2VyLnJlbW92ZUNsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tVXNlci5zaG93KCk7XG4gICAgICAgICAgICBmcm9tVXNlci5hZGRDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIENhbGxlcklEIGN1c3RvbSBzZXR0aW5ncyB2aXNpYmlsaXR5IGJhc2VkIG9uIGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgICAgY29uc3QgY2lkRHJvcGRvd24gPSAkKCcjY2lkX3NvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoY2lkRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgY2lkVmFsdWUgPSBjaWREcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBjaWRDdXN0b21TZXR0aW5ncyA9ICQoJyNjYWxsZXJpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgICAgIGlmIChjaWRWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBjaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdzaG93Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGNpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIERJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGRpZERyb3Bkb3duID0gJCgnI2RpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKGRpZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZFZhbHVlID0gZGlkRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgZGlkQ3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICAgICAgaWYgKGRpZFZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGRpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ3Nob3cnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgZGlkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjb21wbGV0aW9uIG9mIGhvc3QgYWRkcmVzcyBpbnB1dFxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FkZGl0aW9uYWwtaG9zdCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsdWUubWF0Y2godGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGlucHV0IHZhbHVlXG4gICAgICAgICAgICBpZiAodmFsaWRhdGlvbiA9PT0gbnVsbCB8fCB2YWxpZGF0aW9uLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBob3N0IGFkZHJlc3MgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIGlmICgkKGAuaG9zdC1yb3dbZGF0YS12YWx1ZT1cXFwiJHt2YWx1ZX1cXFwiXWApLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBob3N0cyB0YWJsZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RzVGFibGVWaWV3KCkge1xuICAgICAgICBjb25zdCAkaG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgIGlmICgkaG9zdFJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHthcnJheX0gYWRkaXRpb25hbEhvc3RzIC0gQXJyYXkgb2YgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGFkZGl0aW9uYWxIb3N0cykge1xuICAgICAgICBpZiAoIWFkZGl0aW9uYWxIb3N0cyB8fCAhQXJyYXkuaXNBcnJheShhZGRpdGlvbmFsSG9zdHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGhvc3RzIGZpcnN0IChleGNlcHQgdGVtcGxhdGUgYW5kIGR1bW15KVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZS5maW5kKGB0Ym9keSB0ciR7UHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPV31gKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIGhvc3QgdXNpbmcgdGhlIHNhbWUgbG9naWMgYXMgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3NcbiAgICAgICAgYWRkaXRpb25hbEhvc3RzLmZvckVhY2goKGhvc3RPYmopID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIG9iamVjdCBmb3JtYXQge2lkLCBhZGRyZXNzfSBhbmQgc3RyaW5nIGZvcm1hdFxuICAgICAgICAgICAgY29uc3QgaG9zdEFkZHJlc3MgPSB0eXBlb2YgaG9zdE9iaiA9PT0gJ3N0cmluZycgPyBob3N0T2JqIDogaG9zdE9iai5hZGRyZXNzO1xuICAgICAgICAgICAgaWYgKGhvc3RBZGRyZXNzICYmIGhvc3RBZGRyZXNzLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgc2FtZSBsb2dpYyBhcyBjYk9uQ29tcGxldGVIb3N0QWRkcmVzc1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbnNlcnQgdGhlIGNsb25lZCByb3dcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHByb3ZpZGVyIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IFByb3ZpZGVyU0lQKCk7XG4gICAgcHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xufSk7Il19