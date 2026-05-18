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
      _get(_getPrototypeOf(ProviderSIP.prototype), "populateFormData", this).call(this, data); // SRV-based registration (RFC 3263): API returns port=0 to indicate
      // "no explicit port — discover via DNS SRV". In the UI we show this as
      // an empty field so the SRV intent is visually obvious.
      // Note: must clear the input directly because Form.populateFormSilently
      // has already written "0" before this callback runs.


      if (data.port === 0 || data.port === '0') {
        $('#port').val('');
      } // Additional hosts - populate after form is ready


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
            value: '^[a-zA-Z0-9_.+*\\-]+$',
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
            value: '^[a-zA-Z0-9_.+*\\-]+$',
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
     * Show inline validation error on the additional-host input.
     * Pairs the existing shake animation with a Fomantic pointing label
     * placed directly under the input, since shake alone leaves the user
     * wondering why their input was rejected.
     */

  }, {
    key: "showHostInputError",
    value: function showHostInputError() {
      var message = typeof globalTranslate !== 'undefined' && globalTranslate.pr_InvalidHostAddress ? globalTranslate.pr_InvalidHostAddress : 'Введите корректный IP адрес, подсеть в нотации CIDR (например 10.0.0.0/8) или имя хоста';
      var $wrapper = this.$additionalHostInput.parent(); // Always recreate the label so we never inherit stale Fomantic transition state

      $wrapper.parent().find('.host-input-error').remove();
      var $label = $('<div class="ui pointing red basic label host-input-error" role="alert"></div>').text(message);
      $wrapper.after($label);
      clearTimeout(this._hostErrorTimer);
      this._hostErrorTimer = setTimeout(function () {
        return $label.remove();
      }, 5000);
      this.$additionalHostInput.transition('shake');
    }
    /**
     * Hide the inline validation error, if any.
     */

  }, {
    key: "hideHostInputError",
    value: function hideHostInputError() {
      clearTimeout(this._hostErrorTimer);
      this.$additionalHostInput.parent().parent().find('.host-input-error').remove();
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
          this.showHostInputError();
          return;
        } // Hide any previous validation error on successful input


        this.hideHostInputError(); // Check if the host address already exists

        if ($(".host-row[data-value=\"".concat(value, "\"]")).length === 0) {
          var $tr = this.$additionalHostsTemplate.last();
          var $clone = $tr.clone(false); // Use false since events are delegated

          $clone.removeClass('host-row-tpl').addClass('host-row').show();
          $clone.attr('data-value', value);
          $clone.find('.address').text(value);
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
          $clone.find('.address').text(hostAddress); // Insert the cloned row

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsInJlZ2V4UGF0dGVybiIsInZhbHVlIiwicGFyYW1ldGVyIiwiZmllbGRUeXBlIiwic291cmNlRmllbGQiLCJ2YWwiLCJ0cmltIiwiUmVnRXhwIiwiZSIsImNvbnNvbGUiLCJsb2ciLCJ0b1VwcGVyQ2FzZSIsIm1lc3NhZ2UiLCJjdXN0b21IZWFkZXIiLCJ0ZXN0IiwiUHJvdmlkZXJTSVAiLCIkcXVhbGlmeVRvZ2dsZSIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicGFyZW50IiwiaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24iLCJpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24iLCJpbml0aWFsaXplQ2FsbGVySWRTb3VyY2VEcm9wZG93biIsImluaXRpYWxpemVEaWRTb3VyY2VEcm9wZG93biIsImluaXRpYWxpemVUYWJzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycyIsInVwZGF0ZUhvc3RzVGFibGVWaWV3Iiwic2VsZiIsImlzTmV3UHJvdmlkZXIiLCJjc3MiLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJvbkxvYWQiLCJwYXJhbWV0ZXJBcnJheSIsImhpc3RvcnlFdmVudCIsIm9mZiIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwia2V5cHJlc3MiLCJ3aGljaCIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwiREVMRVRFX1JPV19CVVRUT04iLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwiJGRyb3Bkb3duIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNhbGxlcklkU291cmNlQ2hhbmdlIiwib25EaWRTb3VyY2VDaGFuZ2UiLCIkY3VzdG9tU2V0dGluZ3MiLCJ0cmFuc2l0aW9uIiwiJGZvcm1PYmoiLCJ1cmwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiU2lwUHJvdmlkZXJzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImluaXRpYWxpemUiLCJQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyIiwiZm9ybUluaXRpYWxpemVkIiwicmVzdWx0IiwiZGF0YSIsInR5cGUiLCJwcm92aWRlclR5cGUiLCJhZGRpdGlvbmFsSG9zdHMiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiaG9zdCIsImZpbmQiLCJ0ZXh0IiwicHVzaCIsImFkZHJlc3MiLCJkcm9wZG93blVwZGF0ZXMiLCJzZWxlY3RvciIsImR0bWZtb2RlIiwidHJhbnNwb3J0IiwicmVnaXN0cmF0aW9uX3R5cGUiLCJjaWRfc291cmNlIiwiZGlkX3NvdXJjZSIsImZvckVhY2giLCJwb3J0IiwicG9wdWxhdGVBZGRpdGlvbmFsSG9zdHMiLCJyZXNwb25zZSIsImlkIiwicmVnVHlwZSIsInJ1bGVzTWFwIiwib3V0Ym91bmQiLCJnZXRPdXRib3VuZFJ1bGVzIiwiaW5ib3VuZCIsImdldEluYm91bmRSdWxlcyIsIm5vbmUiLCJnZXROb25lUnVsZXMiLCJhZGRDYWxsZXJJZERpZFJ1bGVzIiwiY2lkX2N1c3RvbV9oZWFkZXIiLCJpZGVudGlmaWVyIiwib3B0aW9uYWwiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5IiwiZGlkX2N1c3RvbV9oZWFkZXIiLCJjaWRfcGFyc2VyX3JlZ2V4IiwicHJfVmFsaWRhdGVJbnZhbGlkUmVnZXgiLCJkaWRfcGFyc2VyX3JlZ2V4IiwiZGVzY3JpcHRpb24iLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzIiwidXNlcm5hbWUiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzIiwic2VjcmV0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQiLCJhZGRpdGlvbmFsX2hvc3RzIiwiaG9zdElucHV0VmFsaWRhdGlvbiIsInByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCIsIiRob3N0TGFiZWxUZXh0IiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MiLCJwcm92aWRlcklkIiwiZWxlbWVudHMiLCJhZGRpdGlvbmFsSG9zdCIsIm5ldHdvcmtGaWx0ZXIiLCJmaWVsZHMiLCIkc2VjcmV0IiwibmV0d29ya0ZpbHRlcklkIiwiY29uZmlncyIsInZpc2libGUiLCJoaWRkZW4iLCJwYXNzd29yZFdpZGdldCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwidmFsaWRhdGlvbiIsIlBhc3N3b3JkV2lkZ2V0IiwiVkFMSURBVElPTiIsIk5PTkUiLCJyZXNldE5ldHdvcmtGaWx0ZXIiLCJTT0ZUIiwiYXV0b0dlbmVyYXRlUGFzc3dvcmQiLCJjbGVhclZhbGlkYXRpb25Gb3IiLCJzaG93UGFzc3dvcmRUb29sdGlwIiwibWFrZU9wdGlvbmFsIiwiY29uZmlnIiwia2V5Iiwic2hvdyIsImhpZGUiLCJyZW1vdmVBdHRyIiwiJGdlbmVyYXRlQnRuIiwidHJpZ2dlciIsInVwZGF0ZUNvbmZpZyIsImhpZGVQYXNzd29yZFRvb2x0aXAiLCJmaWVsZCIsImNoYXJBdCIsInNsaWNlIiwidXBkYXRlSG9zdExhYmVsIiwiZWwiLCJmcm9tVXNlciIsImNpZERyb3Bkb3duIiwiY2lkVmFsdWUiLCJjaWRDdXN0b21TZXR0aW5ncyIsImRpZERyb3Bkb3duIiwiZGlkVmFsdWUiLCJkaWRDdXN0b21TZXR0aW5ncyIsInByX0ludmFsaWRIb3N0QWRkcmVzcyIsIiR3cmFwcGVyIiwiJGxhYmVsIiwiYWZ0ZXIiLCJjbGVhclRpbWVvdXQiLCJfaG9zdEVycm9yVGltZXIiLCJzZXRUaW1lb3V0IiwibWF0Y2giLCJzaG93SG9zdElucHV0RXJyb3IiLCJoaWRlSG9zdElucHV0RXJyb3IiLCIkdHIiLCJsYXN0IiwiJGNsb25lIiwiY2xvbmUiLCJhdHRyIiwiJGV4aXN0aW5nSG9zdFJvd3MiLCJIT1NUX1JPVyIsIiRob3N0Um93cyIsIkFycmF5IiwiaXNBcnJheSIsImhvc3RPYmoiLCJob3N0QWRkcmVzcyIsIlByb3ZpZGVyQmFzZSIsImRvY3VtZW50IiwicmVhZHkiLCJwcm92aWRlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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QUFQLENBQVksWUFBWixFQUEwQk8sV0FBMUI7QUFDQVQsVUFBQUEsTUFBTSxDQUFDOUcsSUFBUCxDQUFZLFVBQVosRUFBd0JDLElBQXhCLENBQTZCc0gsV0FBN0IsRUFUbUMsQ0FXbkM7O0FBQ0EsY0FBTU4saUJBQWlCLEdBQUcsTUFBSSxDQUFDN0ksUUFBTCxDQUFjNEIsSUFBZCxDQUFtQnBGLFdBQVcsQ0FBQ0ksYUFBWixDQUEwQmtNLFFBQTdDLENBQTFCOztBQUNBLGNBQUlELGlCQUFpQixDQUFDSixJQUFsQixHQUF5Qi9JLE1BQXpCLEtBQW9DLENBQXhDLEVBQTJDO0FBQ3ZDOEksWUFBQUEsR0FBRyxDQUFDUCxLQUFKLENBQVVTLE1BQVY7QUFDSCxXQUZELE1BRU87QUFDSEcsWUFBQUEsaUJBQWlCLENBQUNKLElBQWxCLEdBQXlCUixLQUF6QixDQUErQlMsTUFBL0I7QUFDSDtBQUNKO0FBQ0osT0F0QkQsRUFUcUMsQ0FpQ3JDOztBQUNBLFdBQUt2SyxvQkFBTDtBQUNIOzs7O0VBbDdCcUJpTCxZO0FBcTdCMUI7QUFDQTtBQUNBOzs7Z0JBdjdCTTVNLFcsbUJBRXFCO0FBQ25CUyxFQUFBQSxzQkFBc0IsRUFBRSx5QkFETDtBQUVuQkosRUFBQUEsc0JBQXNCLEVBQUUsZ0NBRkw7QUFHbkJFLEVBQUFBLHlCQUF5QixFQUFFLHVDQUhSO0FBSW5CSSxFQUFBQSxxQkFBcUIsRUFBRSx3QkFKSjtBQUtuQmtDLEVBQUFBLGlCQUFpQixFQUFFLG9CQUxBO0FBTW5CeUosRUFBQUEsUUFBUSxFQUFFO0FBTlMsQzs7QUFzN0IzQjFOLENBQUMsQ0FBQ2lPLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIsTUFBTUMsUUFBUSxHQUFHLElBQUkvTSxXQUFKLEVBQWpCO0FBQ0ErTSxFQUFBQSxRQUFRLENBQUN2SSxVQUFUO0FBQ0gsQ0FIRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFByb3ZpZGVyQmFzZSwgUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciwgUHJvdmlkZXJUb29sdGlwTWFuYWdlciwgaTE4biwgU2lwUHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZTogQ2hlY2sgaWYgcmVnZXggcGF0dGVybiBpcyB2YWxpZFxuICogT25seSB2YWxpZGF0ZXMgd2hlbiB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgZHJvcGRvd24gaXMgc2V0IHRvICdjdXN0b20nXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5yZWdleFBhdHRlcm4gPSAodmFsdWUsIHBhcmFtZXRlcikgPT4ge1xuICAgIC8vIFBhcnNlIHBhcmFtZXRlciB0byBnZXQgZmllbGQgdHlwZSAoY2lkIG9yIGRpZClcbiAgICBjb25zdCBmaWVsZFR5cGUgPSBwYXJhbWV0ZXIgfHwgJ2NpZCc7XG4gICAgY29uc3Qgc291cmNlRmllbGQgPSBmaWVsZFR5cGUgPT09ICdkaWQnID8gJyNkaWRfc291cmNlJyA6ICcjY2lkX3NvdXJjZSc7XG5cbiAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgc291cmNlIGlzIG5vdCAnY3VzdG9tJ1xuICAgIGlmICgkKHNvdXJjZUZpZWxkKS52YWwoKSAhPT0gJ2N1c3RvbScpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQWxsb3cgZW1wdHkgdmFsdWVzIChmaWVsZCBpcyBvcHRpb25hbClcbiAgICBpZiAoIXZhbHVlIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgcmVnZXggcGF0dGVyblxuICAgIHRyeSB7XG4gICAgICAgIG5ldyBSZWdFeHAodmFsdWUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBJbnZhbGlkICR7ZmllbGRUeXBlLnRvVXBwZXJDYXNlKCl9IHJlZ2V4IHBhdHRlcm46YCwgdmFsdWUsIGUubWVzc2FnZSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGU6IENoZWNrIGlmIGN1c3RvbSBoZWFkZXIgaXMgdmFsaWRcbiAqIE9ubHkgdmFsaWRhdGVzIHdoZW4gdGhlIGNvcnJlc3BvbmRpbmcgc291cmNlIGRyb3Bkb3duIGlzIHNldCB0byAnY3VzdG9tJ1xuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tSGVhZGVyID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+IHtcbiAgICAvLyBQYXJzZSBwYXJhbWV0ZXIgdG8gZ2V0IGZpZWxkIHR5cGUgKGNpZCBvciBkaWQpXG4gICAgY29uc3QgZmllbGRUeXBlID0gcGFyYW1ldGVyIHx8ICdjaWQnO1xuICAgIGNvbnN0IHNvdXJjZUZpZWxkID0gZmllbGRUeXBlID09PSAnZGlkJyA/ICcjZGlkX3NvdXJjZScgOiAnI2NpZF9zb3VyY2UnO1xuXG4gICAgLy8gU2tpcCB2YWxpZGF0aW9uIGlmIHNvdXJjZSBpcyBub3QgJ2N1c3RvbSdcbiAgICBpZiAoJChzb3VyY2VGaWVsZCkudmFsKCkgIT09ICdjdXN0b20nKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIEZpZWxkIGlzIHJlcXVpcmVkIHdoZW4gc291cmNlIGlzIGN1c3RvbVxuICAgIGlmICghdmFsdWUgfHwgdmFsdWUudHJpbSgpID09PSAnJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgZm9ybWF0OiBvbmx5IGxldHRlcnMsIG51bWJlcnMsIGRhc2ggYW5kIHVuZGVyc2NvcmVcbiAgICByZXR1cm4gL15bQS1aYS16MC05LV9dKyQvLnRlc3QodmFsdWUpO1xufTtcblxuLyoqXG4gKiBTSVAgcHJvdmlkZXIgbWFuYWdlbWVudCBmb3JtXG4gKiBAY2xhc3MgUHJvdmlkZXJTSVBcbiAqL1xuY2xhc3MgUHJvdmlkZXJTSVAgZXh0ZW5kcyBQcm92aWRlckJhc2UgeyAgXG4gICAgLy8gU0lQLXNwZWNpZmljIHNlbGVjdG9yc1xuICAgIHN0YXRpYyBTSVBfU0VMRUNUT1JTID0ge1xuICAgICAgICBBRERJVElPTkFMX0hPU1RTX1RBQkxFOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUnLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RTX0RVTU1ZOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmR1bW15JyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19URU1QTEFURTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5ob3N0LXJvdy10cGwnLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RfSU5QVVQ6ICcjYWRkaXRpb25hbC1ob3N0IGlucHV0JyxcbiAgICAgICAgREVMRVRFX1JPV19CVVRUT046ICcuZGVsZXRlLXJvdy1idXR0b24nLFxuICAgICAgICBIT1NUX1JPVzogJy5ob3N0LXJvdydcbiAgICB9O1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcignU0lQJyk7XG4gICAgICAgIHRoaXMuJHF1YWxpZnlUb2dnbGUgPSAkKCcjcXVhbGlmeScpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZSA9ICQoJyNxdWFsaWZ5LWZyZXEnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBqUXVlcnkgb2JqZWN0c1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX0RVTU1ZKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGVtcGxhdGUgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19URU1QTEFURSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfVEFCTEUpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0ID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVF9JTlBVVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqIE92ZXJyaWRlIHRvIGFkZCBTSVAtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBpbml0aWFsaXplIC0gdGhpcyBoYW5kbGVzIHRoZSBmdWxsIGZsb3c6XG4gICAgICAgIC8vIDEuIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKVxuICAgICAgICAvLyAyLiBpbml0aWFsaXplRXZlbnRIYW5kbGVycygpXG4gICAgICAgIC8vIDMuIGluaXRpYWxpemVGb3JtKClcbiAgICAgICAgLy8gNC4gbG9hZEZvcm1EYXRhKClcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE92ZXJyaWRlIGluaXRpYWxpemVVSUNvbXBvbmVudHMgdG8gYWRkIFNJUC1zcGVjaWZpYyBVSSBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IGZpcnN0XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcblxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgVUkgY29tcG9uZW50c1xuICAgICAgICB0aGlzLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYnVnIGNoZWNrYm94IC0gdXNpbmcgcGFyZW50IGNvbnRhaW5lciB3aXRoIGNsYXNzIHNlbGVjdG9yXG4gICAgICAgICQoJyNjaWRfZGlkX2RlYnVnJykucGFyZW50KCcuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIHN0YXRpYyBkcm9wZG93bnMgKFBIUC1yZW5kZXJlZClcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRhYnMoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPdmVycmlkZSBpbml0aWFsaXplRXZlbnRIYW5kbGVycyB0byBhZGQgU0lQLXNwZWNpZmljIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IGZpcnN0XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemVFdmVudEhhbmRsZXJzKCk7XG5cbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJkaXNhYmxlZnJvbXVzZXJcIl0nKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTSVAtc3BlY2lmaWMgY29tcG9uZW50c1xuICAgICAgICB0aGlzLmluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgIGlmICh0aGlzLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmNzcygnb3BhY2l0eScsICcwLjQ1JylcbiAgICAgICAgICAgICAgICAuY3NzKCdjdXJzb3InLCAnbm90LWFsbG93ZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmNzcygnb3BhY2l0eScsICcnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ2N1cnNvcicsICcnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6ICh0YWJQYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgdHlwZW9mIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyICE9PSAndW5kZWZpbmVkJyAmJiAhc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIHdoZW4gaXQgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmluaXRpYWxpemVEaWFnbm9zdGljc1RhYigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkxvYWQ6ICh0YWJQYXRoLCBwYXJhbWV0ZXJBcnJheSwgaGlzdG9yeUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQmxvY2sgbG9hZGluZyBvZiBkaWFnbm9zdGljcyB0YWIgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiBzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3dpdGNoIGJhY2sgdG8gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2xpY2sgcHJldmVudGlvbiBmb3IgZGlzYWJsZWQgdGFiXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpLm9mZignY2xpY2suZGlzYWJsZWQnKS5vbignY2xpY2suZGlzYWJsZWQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBpZiAoc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIHN0YXkgb24gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cInNldHRpbmdzXCJdJykudGFiKCdjaGFuZ2UgdGFiJywgJ3NldHRpbmdzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBTSVAtc3BlY2lmaWMgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbmV3IHN0cmluZyB0byBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRhYmxlXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQua2V5cHJlc3MoKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLndoaWNoID09PSAxMykge1xuICAgICAgICAgICAgICAgIHNlbGYuY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGhvc3QgZnJvbSBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC0gdXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGR5bmFtaWMgZWxlbWVudHNcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGFibGUub24oJ2NsaWNrJywgUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5ERUxFVEVfUk9XX0JVVFRPTiwgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERUTUYgbW9kZSBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNkdG1mbW9kZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0cmFuc3BvcnQgcHJvdG9jb2wgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3RyYW5zcG9ydC1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBDYWxsZXJJRCBzb3VyY2UgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjY2lkX3NvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMub25DYWxsZXJJZFNvdXJjZUNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBESUQgc291cmNlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlkU291cmNlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNkaWRfc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkRpZFNvdXJjZUNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIENhbGxlcklEIHNvdXJjZSBjaGFuZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBTZWxlY3RlZCBDYWxsZXJJRCBzb3VyY2VcbiAgICAgKi9cbiAgICBvbkNhbGxlcklkU291cmNlQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjdXN0b21TZXR0aW5ncyA9ICQoJyNjYWxsZXJpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgaWYgKHZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgLy8gTWFrZSBjdXN0b20gaGVhZGVyIGZpZWxkIHJlcXVpcmVkXG4gICAgICAgICAgICAkKCcjY2lkX2N1c3RvbV9oZWFkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIC8vIFNob3cgY3VzdG9tIHNldHRpbmdzIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICRjdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdmYWRlIGRvd24nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgY3VzdG9tIHNldHRpbmdzIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICRjdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdoaWRlJyk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgcmVxdWlyZWQgc3RhdHVzXG4gICAgICAgICAgICAkKCcjY2lkX2N1c3RvbV9oZWFkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGN1c3RvbSBmaWVsZHMgd2hlbiBub3QgaW4gdXNlXG4gICAgICAgICAgICAkKCcjY2lkX2N1c3RvbV9oZWFkZXInKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfc3RhcnQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfZW5kJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3JlZ2V4JykudmFsKCcnKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGFueSB2YWxpZGF0aW9uIGVycm9ycyBvbiBoaWRkZW4gZmllbGRzXG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9yZWdleCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE5vIG5lZWQgdG8gcmVpbml0aWFsaXplIGZvcm0gLSB2YWxpZGF0aW9uIHJ1bGVzIGNoZWNrIHNvdXJjZSBhdXRvbWF0aWNhbGx5XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBESUQgc291cmNlIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIERJRCBzb3VyY2VcbiAgICAgKi9cbiAgICBvbkRpZFNvdXJjZUNoYW5nZSh2YWx1ZSkge1xuICAgICAgICBjb25zdCAkY3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICBpZiAodmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIGN1c3RvbSBoZWFkZXIgZmllbGQgcmVxdWlyZWRcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2ZhZGUgZG93bicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSByZXF1aXJlZCBzdGF0dXNcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIGZpZWxkcyB3aGVuIG5vdCBpbiB1c2VcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9zdGFydCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9lbmQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoJycpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgYW55IHZhbGlkYXRpb24gZXJyb3JzIG9uIGhpZGRlbiBmaWVsZHNcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3JlZ2V4JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm8gbmVlZCB0byByZWluaXRpYWxpemUgZm9ybSAtIHZhbGlkYXRpb24gcnVsZXMgY2hlY2sgc291cmNlIGF1dG9tYXRpY2FsbHlcbiAgICB9XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciB2M1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU2lwUHJvdmlkZXJzQVBJLCAvLyBVc2UgU0lQLXNwZWNpZmljIEFQSSBjbGllbnQgdjNcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvbW9kaWZ5c2lwL2A7XG5cbiAgICAgICAgLy8gRW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybSAtIHRoaXMgd2FzIG1pc3NpbmchXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwcyBhZnRlciBQYXNzd29yZFdpZGdldCBoYXMgY3JlYXRlZCBhbGwgYnV0dG9uc1xuICAgICAgICBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gSU1QT1JUQU5UOiBEb24ndCBvdmVyd3JpdGUgcmVzdWx0LmRhdGEgLSBpdCBhbHJlYWR5IGNvbnRhaW5zIHByb2Nlc3NlZCBjaGVja2JveCB2YWx1ZXNcbiAgICAgICAgLy8gSnVzdCBhZGQvbW9kaWZ5IHNwZWNpZmljIGZpZWxkc1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9IHRoaXMucHJvdmlkZXJUeXBlO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGFkZGl0aW9uYWwgaG9zdHMgZm9yIFNJUCAtIGNvbGxlY3QgZnJvbSB0YWJsZVxuICAgICAgICBjb25zdCBhZGRpdGlvbmFsSG9zdHMgPSBbXTtcbiAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHkgdHIuaG9zdC1yb3cnKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaG9zdCA9ICQoZWxlbWVudCkuZmluZCgndGQuYWRkcmVzcycpLnRleHQoKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxIb3N0cy5wdXNoKHsgYWRkcmVzczogaG9zdCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgc2VuZCBhZGRpdGlvbmFsSG9zdHMgdG8gYWxsb3cgZGVsZXRpb24gb2YgYWxsIGhvc3RzXG4gICAgICAgIHJlc3VsdC5kYXRhLmFkZGl0aW9uYWxIb3N0cyA9IGFkZGl0aW9uYWxIb3N0cztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIE92ZXJyaWRlIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YSB0byBzZXQgU0lQLXNwZWNpZmljIGRyb3Bkb3duIHZhbHVlc1xuICAgICAqIENhbGxlZCBmcm9tIHBhcmVudCdzIHBvcHVsYXRlRm9ybSgpIGluIGJlZm9yZVBvcHVsYXRlIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhKGRhdGEgPSB7fSkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBmaXJzdCAoaW5pdGlhbGl6ZXMgY29tbW9uIGRyb3Bkb3ducyBsaWtlIG5ldHdvcmtmaWx0ZXJpZClcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhKGRhdGEpO1xuXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBkcm9wZG93bnMgYXJlIGFscmVhZHkgaW5pdGlhbGl6ZWQgaW4gaW5pdGlhbGl6ZVVJQ29tcG9uZW50c1xuICAgICAgICAvLyBKdXN0IHNldCB0aGVpciB2YWx1ZXMgZnJvbSBBUEkgZGF0YVxuICAgICAgICBjb25zdCBkcm9wZG93blVwZGF0ZXMgPSBbXG4gICAgICAgICAgICB7IHNlbGVjdG9yOiAnI2R0bWZtb2RlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuZHRtZm1vZGUgfHwgJycgfSxcbiAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjdHJhbnNwb3J0LWRyb3Bkb3duJywgdmFsdWU6IGRhdGEudHJhbnNwb3J0IHx8ICcnIH0sXG4gICAgICAgICAgICB7IHNlbGVjdG9yOiAnI3JlZ2lzdHJhdGlvbl90eXBlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgJycgfSxcbiAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjY2lkX3NvdXJjZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmNpZF9zb3VyY2UgfHwgJycgfSxcbiAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjZGlkX3NvdXJjZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmRpZF9zb3VyY2UgfHwgJycgfVxuICAgICAgICBdO1xuXG4gICAgICAgIGRyb3Bkb3duVXBkYXRlcy5mb3JFYWNoKCh7IHNlbGVjdG9yLCB2YWx1ZSB9KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPdmVycmlkZSBwb3B1bGF0ZUZvcm1EYXRhIHRvIGhhbmRsZSBTSVAtc3BlY2lmaWMgZmllbGRzXG4gICAgICogQ2FsbGVkIGZyb20gcGFyZW50J3MgcG9wdWxhdGVGb3JtKCkgaW4gYWZ0ZXJQb3B1bGF0ZSBjYWxsYmFja1xuICAgICAqIE1vc3QgZmllbGRzIGFyZSBoYW5kbGVkIGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBtZXRob2QgZmlyc3RcbiAgICAgICAgc3VwZXIucG9wdWxhdGVGb3JtRGF0YShkYXRhKTtcblxuICAgICAgICAvLyBTUlYtYmFzZWQgcmVnaXN0cmF0aW9uIChSRkMgMzI2Myk6IEFQSSByZXR1cm5zIHBvcnQ9MCB0byBpbmRpY2F0ZVxuICAgICAgICAvLyBcIm5vIGV4cGxpY2l0IHBvcnQg4oCUIGRpc2NvdmVyIHZpYSBETlMgU1JWXCIuIEluIHRoZSBVSSB3ZSBzaG93IHRoaXMgYXNcbiAgICAgICAgLy8gYW4gZW1wdHkgZmllbGQgc28gdGhlIFNSViBpbnRlbnQgaXMgdmlzdWFsbHkgb2J2aW91cy5cbiAgICAgICAgLy8gTm90ZTogbXVzdCBjbGVhciB0aGUgaW5wdXQgZGlyZWN0bHkgYmVjYXVzZSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5XG4gICAgICAgIC8vIGhhcyBhbHJlYWR5IHdyaXR0ZW4gXCIwXCIgYmVmb3JlIHRoaXMgY2FsbGJhY2sgcnVucy5cbiAgICAgICAgaWYgKGRhdGEucG9ydCA9PT0gMCB8fCBkYXRhLnBvcnQgPT09ICcwJykge1xuICAgICAgICAgICAgJCgnI3BvcnQnKS52YWwoJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkaXRpb25hbCBob3N0cyAtIHBvcHVsYXRlIGFmdGVyIGZvcm0gaXMgcmVhZHlcbiAgICAgICAgaWYgKGRhdGEuYWRkaXRpb25hbEhvc3RzKSB7XG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGRhdGEuYWRkaXRpb25hbEhvc3RzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgc3VwZXIuY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuaWQgJiYgISQoJyNpZCcpLnZhbCgpKSB7XG4gICAgICAgICAgICAgICAgJCgnI2lkJykudmFsKHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGUgRm9ybS5qcyB3aWxsIGhhbmRsZSB0aGUgcmVsb2FkIGF1dG9tYXRpY2FsbHkgaWYgcmVzcG9uc2UucmVsb2FkIGlzIHByZXNlbnRcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgUkVTVCBBUEkgcmV0dXJucyByZWxvYWQgcGF0aCBsaWtlIFwicHJvdmlkZXJzL21vZGlmeXNpcC9TSVAtVFJVTksteHh4XCJcbiAgICAgICAgfVxuICAgIH1cbiAgICBcblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcnVsZXNNYXAgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDogKCkgPT4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCksXG4gICAgICAgICAgICBpbmJvdW5kOiAoKSA9PiB0aGlzLmdldEluYm91bmRSdWxlcygpLFxuICAgICAgICAgICAgbm9uZTogKCkgPT4gdGhpcy5nZXROb25lUnVsZXMoKSxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJ1bGVzID0gcnVsZXNNYXBbcmVnVHlwZV0gPyBydWxlc01hcFtyZWdUeXBlXSgpIDogdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQ2FsbGVySUQvRElEIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkQ2FsbGVySWREaWRSdWxlcyhydWxlcyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvbiBydWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBydWxlcyAtIEV4aXN0aW5nIHJ1bGVzXG4gICAgICogQHJldHVybnMge29iamVjdH0gUnVsZXMgd2l0aCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvblxuICAgICAqL1xuICAgIGFkZENhbGxlcklkRGlkUnVsZXMocnVsZXMpIHtcbiAgICAgICAgLy8gQ3VzdG9tIGhlYWRlciB2YWxpZGF0aW9uIHVzaW5nIGdsb2JhbCBjdXN0b20gcnVsZXNcbiAgICAgICAgcnVsZXMuY2lkX2N1c3RvbV9oZWFkZXIgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY2lkX2N1c3RvbV9oZWFkZXInLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tSGVhZGVyW2NpZF0nLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRW1wdHksXG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLmRpZF9jdXN0b21faGVhZGVyID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2RpZF9jdXN0b21faGVhZGVyJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbUhlYWRlcltkaWRdJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5LFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZWdleCBwYXR0ZXJuIHZhbGlkYXRpb24gdXNpbmcgZ2xvYmFsIGN1c3RvbSBydWxlc1xuICAgICAgICBydWxlcy5jaWRfcGFyc2VyX3JlZ2V4ID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NpZF9wYXJzZXJfcmVnZXgnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnZXhQYXR0ZXJuW2NpZF0nLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlSW52YWxpZFJlZ2V4XG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLmRpZF9wYXJzZXJfcmVnZXggPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGlkX3BhcnNlcl9yZWdleCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdleFBhdHRlcm5bZGlkXScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVJbnZhbGlkUmVnZXhcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUGFyc2VyIHN0YXJ0L2VuZCBmaWVsZHMgZG9uJ3QgbmVlZCB2YWxpZGF0aW9uIC0gdGhleSBhcmUgdHJ1bHkgb3B0aW9uYWxcbiAgICAgICAgLy8gTm8gcnVsZXMgbmVlZGVkIGZvciBjaWRfcGFyc2VyX3N0YXJ0LCBjaWRfcGFyc2VyX2VuZCwgZGlkX3BhcnNlcl9zdGFydCwgZGlkX3BhcnNlcl9lbmRcblxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG91dGJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldE91dGJvdW5kUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTkuLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeW2EtekEtWjAtOV8uKypcXFxcLV0rJCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIC8vIFBvcnQgaXMgb3B0aW9uYWw6IGVtcHR5IHZhbHVlIGVuYWJsZXMgU1JWLWJhc2VkIGRpc2NvdmVyeSAoUkZDIDMyNjMpLlxuICAgICAgICAgICAgLy8gUEpTSVAgcXVlcmllcyBfc2lwLl91ZHAvX3RjcC9fdGxzLjxob3N0PiB3aGVuIFVSSSBoYXMgbm8gZXhwbGljaXQgcG9ydC5cbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnXlthLXpBLVowLTlfLisqXFxcXC1dKyQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzhdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igbm9uZSByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXROb25lUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTkuLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gUG9ydCBpcyBvcHRpb25hbDogZW1wdHkgdmFsdWUgZW5hYmxlcyBTUlYtYmFzZWQgZGlzY292ZXJ5IChSRkMgMzI2MykuXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBob3N0IGxhYmVsIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpIHtcbiAgICAgICAgY29uc3QgJGhvc3RMYWJlbFRleHQgPSAkKCcjaG9zdExhYmVsVGV4dCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgICRob3N0TGFiZWxUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICRob3N0TGFiZWxUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRm9yIGluYm91bmQsIHRoZSBmaWVsZCBpcyBoaWRkZW4gc28gbm8gbmVlZCB0byB1cGRhdGUgbGFiZWxcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSB7XG4gICAgICAgICAgICBob3N0OiAkKCcjZWxIb3N0JyksXG4gICAgICAgICAgICBwb3J0OiAkKCcjZWxQb3J0JyksXG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI2VsVXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogJCgnI2VsU2VjcmV0JyksXG4gICAgICAgICAgICBhZGRpdGlvbmFsSG9zdDogJCgnI2VsQWRkaXRpb25hbEhvc3RzJyksXG4gICAgICAgICAgICBuZXR3b3JrRmlsdGVyOiAkKCcjZWxOZXR3b3JrRmlsdGVyJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogdGhpcy4kc2VjcmV0LFxuICAgICAgICAgICAgbmV0d29ya0ZpbHRlcklkOiAkKCcjbmV0d29ya2ZpbHRlcmlkJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgY29uZmlncyA9IHtcbiAgICAgICAgICAgIG91dGJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ2FkZGl0aW9uYWxIb3N0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uTk9ORVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVzZXROZXR3b3JrRmlsdGVyOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5ib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsndXNlcm5hbWUnLCAnc2VjcmV0JywgJ25ldHdvcmtGaWx0ZXInLCAnYWRkaXRpb25hbEhvc3QnXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFsnaG9zdCcsICdwb3J0J10sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXV0b0dlbmVyYXRlUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY2xlYXJWYWxpZGF0aW9uRm9yOiBbJ2hvc3QnLCAncG9ydCddXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm9uZToge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdhZGRpdGlvbmFsSG9zdCcsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbXSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRUb29sdGlwOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1ha2VPcHRpb25hbDogWydzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBjbGVhclZhbGlkYXRpb25Gb3I6IFsndXNlcm5hbWUnLCAnc2VjcmV0J11cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY29uZmlnID0gY29uZmlnc1tyZWdUeXBlXSB8fCBjb25maWdzLm91dGJvdW5kO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgdmlzaWJpbGl0eVxuICAgICAgICBjb25maWcudmlzaWJsZS5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5zaG93KCkpO1xuICAgICAgICBjb25maWcuaGlkZGVuLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LmhpZGUoKSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHVzZXJuYW1lIGZpZWxkIC0gZW5zdXJlIGl0J3MgYWx3YXlzIGVkaXRhYmxlXG4gICAgICAgIGZpZWxkcy51c2VybmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuXG4gICAgICAgIC8vIFByZS1maWxsIHVzZXJuYW1lIHdpdGggcHJvdmlkZXIgSUQgZm9yIG5ldyBpbmJvdW5kIHByb3ZpZGVyc1xuICAgICAgICAvLyBwcm92aWRlcklkIGFscmVhZHkgY29udGFpbnMgSUQgZnJvbSBnZXREZWZhdWx0IChsb2FkZWQgaW4gbG9hZEZvcm1EYXRhKVxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnICYmIHRoaXMuaXNOZXdQcm92aWRlciAmJiAoIWZpZWxkcy51c2VybmFtZS52YWwoKSB8fCBmaWVsZHMudXNlcm5hbWUudmFsKCkudHJpbSgpID09PSAnJykpIHtcbiAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwocHJvdmlkZXJJZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgaWYgZW1wdHlcbiAgICAgICAgaWYgKGNvbmZpZy5hdXRvR2VuZXJhdGVQYXNzd29yZCAmJiBmaWVsZHMuc2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycgJiYgdGhpcy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgdGhpcy5wYXNzd29yZFdpZGdldC5lbGVtZW50cy4kZ2VuZXJhdGVCdG4/LnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlc2V0IG5ldHdvcmsgZmlsdGVyIGZvciBvdXRib3VuZFxuICAgICAgICBpZiAoY29uZmlnLnJlc2V0TmV0d29ya0ZpbHRlcikge1xuICAgICAgICAgICAgZmllbGRzLm5ldHdvcmtGaWx0ZXJJZC52YWwoJ25vbmUnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHdpZGdldCBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmICh0aGlzLnBhc3N3b3JkV2lkZ2V0ICYmIGNvbmZpZy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQudXBkYXRlQ29uZmlnKHRoaXMucGFzc3dvcmRXaWRnZXQsIGNvbmZpZy5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCB0b29sdGlwXG4gICAgICAgIGlmIChjb25maWcuc2hvd1Bhc3N3b3JkVG9vbHRpcCkge1xuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTWFrZSBmaWVsZHMgb3B0aW9uYWxcbiAgICAgICAgY29uZmlnLm1ha2VPcHRpb25hbD8uZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICAkKGAjZWwke2ZpZWxkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZmllbGQuc2xpY2UoMSl9YCkucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnMgZm9yIHNwZWNpZmllZCBmaWVsZHNcbiAgICAgICAgY29uZmlnLmNsZWFyVmFsaWRhdGlvbkZvcj8uZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZCk7XG4gICAgICAgICAgICAkKGAjJHtmaWVsZH1gKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaG9zdCBsYWJlbFxuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RMYWJlbChyZWdUeXBlKTsgXG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiAnZGlzYWJsZWZyb211c2VyJyBjaGVja2JveFxuICAgICAgICAvLyBVc2UgdGhlIG91dGVyIGRpdi5jaGVja2JveCBjb250YWluZXIgaW5zdGVhZCBvZiBpbnB1dCBlbGVtZW50XG4gICAgICAgIGNvbnN0IGVsID0gJCgnaW5wdXRbbmFtZT1cImRpc2FibGVmcm9tdXNlclwiXScpLmNsb3Nlc3QoJy51aS5jaGVja2JveCcpO1xuICAgICAgICBjb25zdCBmcm9tVXNlciA9ICQoJyNkaXZGcm9tVXNlcicpO1xuICAgICAgICBpZiAoZWwubGVuZ3RoID4gMCAmJiBlbC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBmcm9tVXNlci5oaWRlKCk7XG4gICAgICAgICAgICBmcm9tVXNlci5yZW1vdmVDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbVVzZXIuc2hvdygpO1xuICAgICAgICAgICAgZnJvbVVzZXIuYWRkQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBDYWxsZXJJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGNpZERyb3Bkb3duID0gJCgnI2NpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKGNpZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGNpZFZhbHVlID0gY2lkRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgY2lkQ3VzdG9tU2V0dGluZ3MgPSAkKCcjY2FsbGVyaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgICAgICBpZiAoY2lkVmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgY2lkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignc2hvdycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBjaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdoaWRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBESUQgY3VzdG9tIHNldHRpbmdzIHZpc2liaWxpdHkgYmFzZWQgb24gY3VycmVudCBkcm9wZG93biB2YWx1ZVxuICAgICAgICBjb25zdCBkaWREcm9wZG93biA9ICQoJyNkaWRfc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmIChkaWREcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkaWRWYWx1ZSA9IGRpZERyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGRpZEN1c3RvbVNldHRpbmdzID0gJCgnI2RpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgICAgIGlmIChkaWRWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBkaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdzaG93Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGRpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGlubGluZSB2YWxpZGF0aW9uIGVycm9yIG9uIHRoZSBhZGRpdGlvbmFsLWhvc3QgaW5wdXQuXG4gICAgICogUGFpcnMgdGhlIGV4aXN0aW5nIHNoYWtlIGFuaW1hdGlvbiB3aXRoIGEgRm9tYW50aWMgcG9pbnRpbmcgbGFiZWxcbiAgICAgKiBwbGFjZWQgZGlyZWN0bHkgdW5kZXIgdGhlIGlucHV0LCBzaW5jZSBzaGFrZSBhbG9uZSBsZWF2ZXMgdGhlIHVzZXJcbiAgICAgKiB3b25kZXJpbmcgd2h5IHRoZWlyIGlucHV0IHdhcyByZWplY3RlZC5cbiAgICAgKi9cbiAgICBzaG93SG9zdElucHV0RXJyb3IoKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSAodHlwZW9mIGdsb2JhbFRyYW5zbGF0ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZ2xvYmFsVHJhbnNsYXRlLnByX0ludmFsaWRIb3N0QWRkcmVzcylcbiAgICAgICAgICAgID8gZ2xvYmFsVHJhbnNsYXRlLnByX0ludmFsaWRIb3N0QWRkcmVzc1xuICAgICAgICAgICAgOiAn0JLQstC10LTQuNGC0LUg0LrQvtGA0YDQtdC60YLQvdGL0LkgSVAg0LDQtNGA0LXRgSwg0L/QvtC00YHQtdGC0Ywg0LIg0L3QvtGC0LDRhtC40LggQ0lEUiAo0L3QsNC/0YDQuNC80LXRgCAxMC4wLjAuMC84KSDQuNC70Lgg0LjQvNGPINGF0L7RgdGC0LAnO1xuXG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC5wYXJlbnQoKTtcbiAgICAgICAgLy8gQWx3YXlzIHJlY3JlYXRlIHRoZSBsYWJlbCBzbyB3ZSBuZXZlciBpbmhlcml0IHN0YWxlIEZvbWFudGljIHRyYW5zaXRpb24gc3RhdGVcbiAgICAgICAgJHdyYXBwZXIucGFyZW50KCkuZmluZCgnLmhvc3QtaW5wdXQtZXJyb3InKS5yZW1vdmUoKTtcblxuICAgICAgICBjb25zdCAkbGFiZWwgPSAkKCc8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgcmVkIGJhc2ljIGxhYmVsIGhvc3QtaW5wdXQtZXJyb3JcIiByb2xlPVwiYWxlcnRcIj48L2Rpdj4nKVxuICAgICAgICAgICAgLnRleHQobWVzc2FnZSk7XG4gICAgICAgICR3cmFwcGVyLmFmdGVyKCRsYWJlbCk7XG5cbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX2hvc3RFcnJvclRpbWVyKTtcbiAgICAgICAgdGhpcy5faG9zdEVycm9yVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+ICRsYWJlbC5yZW1vdmUoKSwgNTAwMCk7XG5cbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC50cmFuc2l0aW9uKCdzaGFrZScpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhpZGUgdGhlIGlubGluZSB2YWxpZGF0aW9uIGVycm9yLCBpZiBhbnkuXG4gICAgICovXG4gICAgaGlkZUhvc3RJbnB1dEVycm9yKCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5faG9zdEVycm9yVGltZXIpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnBhcmVudCgpLnBhcmVudCgpLmZpbmQoJy5ob3N0LWlucHV0LWVycm9yJykucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGNvbXBsZXRpb24gb2YgaG9zdCBhZGRyZXNzIGlucHV0XG4gICAgICovXG4gICAgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWRkaXRpb25hbC1ob3N0Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSB2YWx1ZS5tYXRjaCh0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSB0aGUgaW5wdXQgdmFsdWVcbiAgICAgICAgICAgIGlmICh2YWxpZGF0aW9uID09PSBudWxsIHx8IHZhbGlkYXRpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93SG9zdElucHV0RXJyb3IoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEhpZGUgYW55IHByZXZpb3VzIHZhbGlkYXRpb24gZXJyb3Igb24gc3VjY2Vzc2Z1bCBpbnB1dFxuICAgICAgICAgICAgdGhpcy5oaWRlSG9zdElucHV0RXJyb3IoKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGhvc3QgYWRkcmVzcyBhbHJlYWR5IGV4aXN0c1xuICAgICAgICAgICAgaWYgKCQoYC5ob3N0LXJvd1tkYXRhLXZhbHVlPVxcXCIke3ZhbHVlfVxcXCJdYCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRyID0gdGhpcy4kYWRkaXRpb25hbEhvc3RzVGVtcGxhdGUubGFzdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjbG9uZSA9ICR0ci5jbG9uZShmYWxzZSk7IC8vIFVzZSBmYWxzZSBzaW5jZSBldmVudHMgYXJlIGRlbGVnYXRlZFxuICAgICAgICAgICAgICAgICRjbG9uZVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hvc3Qtcm93LXRwbCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnaG9zdC1yb3cnKVxuICAgICAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjbG9uZS5hdHRyKCdkYXRhLXZhbHVlJywgdmFsdWUpO1xuICAgICAgICAgICAgICAgICRjbG9uZS5maW5kKCcuYWRkcmVzcycpLnRleHQodmFsdWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRleGlzdGluZ0hvc3RSb3dzID0gdGhpcy4kZm9ybU9iai5maW5kKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1cpO1xuICAgICAgICAgICAgICAgIGlmICgkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ci5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dC52YWwoJycpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGhvc3RzIHRhYmxlXG4gICAgICovXG4gICAgdXBkYXRlSG9zdHNUYWJsZVZpZXcoKSB7XG4gICAgICAgIGNvbnN0ICRob3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgaWYgKCRob3N0Um93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15LnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15LmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBhZGRpdGlvbmFsIGhvc3RzIGZyb20gQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBhZGRpdGlvbmFsSG9zdHMgLSBBcnJheSBvZiBhZGRpdGlvbmFsIGhvc3RzIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVBZGRpdGlvbmFsSG9zdHMoYWRkaXRpb25hbEhvc3RzKSB7XG4gICAgICAgIGlmICghYWRkaXRpb25hbEhvc3RzIHx8ICFBcnJheS5pc0FycmF5KGFkZGl0aW9uYWxIb3N0cykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgaG9zdHMgZmlyc3QgKGV4Y2VwdCB0ZW1wbGF0ZSBhbmQgZHVtbXkpXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlLmZpbmQoYHRib2R5IHRyJHtQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XfWApLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGVhY2ggaG9zdCB1c2luZyB0aGUgc2FtZSBsb2dpYyBhcyBjYk9uQ29tcGxldGVIb3N0QWRkcmVzc1xuICAgICAgICBhZGRpdGlvbmFsSG9zdHMuZm9yRWFjaCgoaG9zdE9iaikgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIGJvdGggb2JqZWN0IGZvcm1hdCB7aWQsIGFkZHJlc3N9IGFuZCBzdHJpbmcgZm9ybWF0XG4gICAgICAgICAgICBjb25zdCBob3N0QWRkcmVzcyA9IHR5cGVvZiBob3N0T2JqID09PSAnc3RyaW5nJyA/IGhvc3RPYmogOiBob3N0T2JqLmFkZHJlc3M7XG4gICAgICAgICAgICBpZiAoaG9zdEFkZHJlc3MgJiYgaG9zdEFkZHJlc3MudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBzYW1lIGxvZ2ljIGFzIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzXG4gICAgICAgICAgICAgICAgY29uc3QgJHRyID0gdGhpcy4kYWRkaXRpb25hbEhvc3RzVGVtcGxhdGUubGFzdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjbG9uZSA9ICR0ci5jbG9uZShmYWxzZSk7IC8vIFVzZSBmYWxzZSBzaW5jZSBldmVudHMgYXJlIGRlbGVnYXRlZFxuICAgICAgICAgICAgICAgICRjbG9uZVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hvc3Qtcm93LXRwbCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnaG9zdC1yb3cnKVxuICAgICAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjbG9uZS5hdHRyKCdkYXRhLXZhbHVlJywgaG9zdEFkZHJlc3MpO1xuICAgICAgICAgICAgICAgICRjbG9uZS5maW5kKCcuYWRkcmVzcycpLnRleHQoaG9zdEFkZHJlc3MpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluc2VydCB0aGUgY2xvbmVkIHJvd1xuICAgICAgICAgICAgICAgIGNvbnN0ICRleGlzdGluZ0hvc3RSb3dzID0gdGhpcy4kZm9ybU9iai5maW5kKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1cpO1xuICAgICAgICAgICAgICAgIGlmICgkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ci5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlzaWJpbGl0eVxuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgfVxufVxuXG4vKipcbiAqIEluaXRpYWxpemUgcHJvdmlkZXIgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY29uc3QgcHJvdmlkZXIgPSBuZXcgUHJvdmlkZXJTSVAoKTtcbiAgICBwcm92aWRlci5pbml0aWFsaXplKCk7XG59KTsiXX0=