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
      }); // Only add if there are hosts

      if (additionalHosts.length > 0) {
        result.data.additionalHosts = additionalHosts;
      }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsInJlZ2V4UGF0dGVybiIsInZhbHVlIiwicGFyYW1ldGVyIiwiZmllbGRUeXBlIiwic291cmNlRmllbGQiLCJ2YWwiLCJ0cmltIiwiUmVnRXhwIiwiZSIsImNvbnNvbGUiLCJsb2ciLCJ0b1VwcGVyQ2FzZSIsIm1lc3NhZ2UiLCJjdXN0b21IZWFkZXIiLCJ0ZXN0IiwiUHJvdmlkZXJTSVAiLCIkcXVhbGlmeVRvZ2dsZSIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicGFyZW50IiwiaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24iLCJpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24iLCJpbml0aWFsaXplQ2FsbGVySWRTb3VyY2VEcm9wZG93biIsImluaXRpYWxpemVEaWRTb3VyY2VEcm9wZG93biIsImluaXRpYWxpemVUYWJzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycyIsInVwZGF0ZUhvc3RzVGFibGVWaWV3Iiwic2VsZiIsImlzTmV3UHJvdmlkZXIiLCJjc3MiLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJvbkxvYWQiLCJwYXJhbWV0ZXJBcnJheSIsImhpc3RvcnlFdmVudCIsIm9mZiIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwia2V5cHJlc3MiLCJ3aGljaCIsImNiT25Db21wbGV0ZUhvc3RBZGRyZXNzIiwiREVMRVRFX1JPV19CVVRUT04iLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwiJGRyb3Bkb3duIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNhbGxlcklkU291cmNlQ2hhbmdlIiwib25EaWRTb3VyY2VDaGFuZ2UiLCIkY3VzdG9tU2V0dGluZ3MiLCJ0cmFuc2l0aW9uIiwiJGZvcm1PYmoiLCJ1cmwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiU2lwUHJvdmlkZXJzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImluaXRpYWxpemUiLCJQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyIiwiZm9ybUluaXRpYWxpemVkIiwicmVzdWx0IiwiZGF0YSIsInR5cGUiLCJwcm92aWRlclR5cGUiLCJhZGRpdGlvbmFsSG9zdHMiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiaG9zdCIsImZpbmQiLCJ0ZXh0IiwicHVzaCIsImFkZHJlc3MiLCJkcm9wZG93blVwZGF0ZXMiLCJzZWxlY3RvciIsImR0bWZtb2RlIiwidHJhbnNwb3J0IiwicmVnaXN0cmF0aW9uX3R5cGUiLCJjaWRfc291cmNlIiwiZGlkX3NvdXJjZSIsImZvckVhY2giLCJwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyIsInJlc3BvbnNlIiwiaWQiLCJyZWdUeXBlIiwicnVsZXNNYXAiLCJvdXRib3VuZCIsImdldE91dGJvdW5kUnVsZXMiLCJpbmJvdW5kIiwiZ2V0SW5ib3VuZFJ1bGVzIiwibm9uZSIsImdldE5vbmVSdWxlcyIsImFkZENhbGxlcklkRGlkUnVsZXMiLCJjaWRfY3VzdG9tX2hlYWRlciIsImlkZW50aWZpZXIiLCJvcHRpb25hbCIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRW1wdHkiLCJkaWRfY3VzdG9tX2hlYWRlciIsImNpZF9wYXJzZXJfcmVnZXgiLCJwcl9WYWxpZGF0ZUludmFsaWRSZWdleCIsImRpZF9wYXJzZXJfcmVnZXgiLCJkZXNjcmlwdGlvbiIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJzZWNyZXQiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCIsImFkZGl0aW9uYWxfaG9zdHMiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwicHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IiwiJGhvc3RMYWJlbFRleHQiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsInByb3ZpZGVySWQiLCJlbGVtZW50cyIsImFkZGl0aW9uYWxIb3N0IiwibmV0d29ya0ZpbHRlciIsImZpZWxkcyIsIiRzZWNyZXQiLCJuZXR3b3JrRmlsdGVySWQiLCJjb25maWdzIiwidmlzaWJsZSIsImhpZGRlbiIsInBhc3N3b3JkV2lkZ2V0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJ2YWxpZGF0aW9uIiwiUGFzc3dvcmRXaWRnZXQiLCJWQUxJREFUSU9OIiwiTk9ORSIsInJlc2V0TmV0d29ya0ZpbHRlciIsIlNPRlQiLCJhdXRvR2VuZXJhdGVQYXNzd29yZCIsImNsZWFyVmFsaWRhdGlvbkZvciIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJtYWtlT3B0aW9uYWwiLCJjb25maWciLCJrZXkiLCJzaG93IiwiaGlkZSIsInJlbW92ZUF0dHIiLCIkZ2VuZXJhdGVCdG4iLCJ0cmlnZ2VyIiwidXBkYXRlQ29uZmlnIiwiaGlkZVBhc3N3b3JkVG9vbHRpcCIsImZpZWxkIiwiY2hhckF0Iiwic2xpY2UiLCJ1cGRhdGVIb3N0TGFiZWwiLCJlbCIsImZyb21Vc2VyIiwiY2lkRHJvcGRvd24iLCJjaWRWYWx1ZSIsImNpZEN1c3RvbVNldHRpbmdzIiwiZGlkRHJvcGRvd24iLCJkaWRWYWx1ZSIsImRpZEN1c3RvbVNldHRpbmdzIiwibWF0Y2giLCIkdHIiLCJsYXN0IiwiJGNsb25lIiwiY2xvbmUiLCJhdHRyIiwiaHRtbCIsIiRleGlzdGluZ0hvc3RSb3dzIiwiSE9TVF9ST1ciLCJhZnRlciIsIiRob3N0Um93cyIsIkFycmF5IiwiaXNBcnJheSIsImhvc3RPYmoiLCJob3N0QWRkcmVzcyIsIlByb3ZpZGVyQmFzZSIsImRvY3VtZW50IiwicmVhZHkiLCJwcm92aWRlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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dGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQcm92aWRlckJhc2UsIFByb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXIsIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIsIGkxOG4sIFNpcFByb3ZpZGVyc0FQSSAqL1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGU6IENoZWNrIGlmIHJlZ2V4IHBhdHRlcm4gaXMgdmFsaWRcbiAqIE9ubHkgdmFsaWRhdGVzIHdoZW4gdGhlIGNvcnJlc3BvbmRpbmcgc291cmNlIGRyb3Bkb3duIGlzIHNldCB0byAnY3VzdG9tJ1xuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMucmVnZXhQYXR0ZXJuID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+IHtcbiAgICAvLyBQYXJzZSBwYXJhbWV0ZXIgdG8gZ2V0IGZpZWxkIHR5cGUgKGNpZCBvciBkaWQpXG4gICAgY29uc3QgZmllbGRUeXBlID0gcGFyYW1ldGVyIHx8ICdjaWQnO1xuICAgIGNvbnN0IHNvdXJjZUZpZWxkID0gZmllbGRUeXBlID09PSAnZGlkJyA/ICcjZGlkX3NvdXJjZScgOiAnI2NpZF9zb3VyY2UnO1xuXG4gICAgLy8gU2tpcCB2YWxpZGF0aW9uIGlmIHNvdXJjZSBpcyBub3QgJ2N1c3RvbSdcbiAgICBpZiAoJChzb3VyY2VGaWVsZCkudmFsKCkgIT09ICdjdXN0b20nKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIEFsbG93IGVtcHR5IHZhbHVlcyAoZmllbGQgaXMgb3B0aW9uYWwpXG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIHJlZ2V4IHBhdHRlcm5cbiAgICB0cnkge1xuICAgICAgICBuZXcgUmVnRXhwKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhgSW52YWxpZCAke2ZpZWxkVHlwZS50b1VwcGVyQ2FzZSgpfSByZWdleCBwYXR0ZXJuOmAsIHZhbHVlLCBlLm1lc3NhZ2UpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlOiBDaGVjayBpZiBjdXN0b20gaGVhZGVyIGlzIHZhbGlkXG4gKiBPbmx5IHZhbGlkYXRlcyB3aGVuIHRoZSBjb3JyZXNwb25kaW5nIHNvdXJjZSBkcm9wZG93biBpcyBzZXQgdG8gJ2N1c3RvbSdcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmN1c3RvbUhlYWRlciA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiB7XG4gICAgLy8gUGFyc2UgcGFyYW1ldGVyIHRvIGdldCBmaWVsZCB0eXBlIChjaWQgb3IgZGlkKVxuICAgIGNvbnN0IGZpZWxkVHlwZSA9IHBhcmFtZXRlciB8fCAnY2lkJztcbiAgICBjb25zdCBzb3VyY2VGaWVsZCA9IGZpZWxkVHlwZSA9PT0gJ2RpZCcgPyAnI2RpZF9zb3VyY2UnIDogJyNjaWRfc291cmNlJztcblxuICAgIC8vIFNraXAgdmFsaWRhdGlvbiBpZiBzb3VyY2UgaXMgbm90ICdjdXN0b20nXG4gICAgaWYgKCQoc291cmNlRmllbGQpLnZhbCgpICE9PSAnY3VzdG9tJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBGaWVsZCBpcyByZXF1aXJlZCB3aGVuIHNvdXJjZSBpcyBjdXN0b21cbiAgICBpZiAoIXZhbHVlIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIGZvcm1hdDogb25seSBsZXR0ZXJzLCBudW1iZXJzLCBkYXNoIGFuZCB1bmRlcnNjb3JlXG4gICAgcmV0dXJuIC9eW0EtWmEtejAtOS1fXSskLy50ZXN0KHZhbHVlKTtcbn07XG5cbi8qKlxuICogU0lQIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVyU0lQXG4gKi9cbmNsYXNzIFByb3ZpZGVyU0lQIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHsgIFxuICAgIC8vIFNJUC1zcGVjaWZpYyBzZWxlY3RvcnNcbiAgICBzdGF0aWMgU0lQX1NFTEVDVE9SUyA9IHtcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19UQUJMRTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlJyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19EVU1NWTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5kdW1teScsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfVEVNUExBVEU6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuaG9zdC1yb3ctdHBsJyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUX0lOUFVUOiAnI2FkZGl0aW9uYWwtaG9zdCBpbnB1dCcsXG4gICAgICAgIERFTEVURV9ST1dfQlVUVE9OOiAnLmRlbGV0ZS1yb3ctYnV0dG9uJyxcbiAgICAgICAgSE9TVF9ST1c6ICcuaG9zdC1yb3cnXG4gICAgfTtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoJ1NJUCcpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5VG9nZ2xlID0gJCgnI3F1YWxpZnknKTtcbiAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUgPSAkKCcjcXVhbGlmeS1mcmVxJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgalF1ZXJ5IG9iamVjdHNcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19EVU1NWSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfVEVNUExBVEUpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX1RBQkxFKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RJbnB1dCA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RfSU5QVVQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm1cbiAgICAgKiBPdmVycmlkZSB0byBhZGQgU0lQLXNwZWNpZmljIGluaXRpYWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gQ2FsbCBwYXJlbnQgaW5pdGlhbGl6ZSAtIHRoaXMgaGFuZGxlcyB0aGUgZnVsbCBmbG93OlxuICAgICAgICAvLyAxLiBpbml0aWFsaXplVUlDb21wb25lbnRzKClcbiAgICAgICAgLy8gMi4gaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKVxuICAgICAgICAvLyAzLiBpbml0aWFsaXplRm9ybSgpXG4gICAgICAgIC8vIDQuIGxvYWRGb3JtRGF0YSgpXG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPdmVycmlkZSBpbml0aWFsaXplVUlDb21wb25lbnRzIHRvIGFkZCBTSVAtc3BlY2lmaWMgVUkgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBmaXJzdFxuICAgICAgICBzdXBlci5pbml0aWFsaXplVUlDb21wb25lbnRzKCk7XG5cbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIFVJIGNvbXBvbmVudHNcbiAgICAgICAgdGhpcy4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJ1ZyBjaGVja2JveCAtIHVzaW5nIHBhcmVudCBjb250YWluZXIgd2l0aCBjbGFzcyBzZWxlY3RvclxuICAgICAgICAkKCcjY2lkX2RpZF9kZWJ1ZycpLnBhcmVudCgnLmNoZWNrYm94JykuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFNJUC1zcGVjaWZpYyBzdGF0aWMgZHJvcGRvd25zIChQSFAtcmVuZGVyZWQpXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQ2FsbGVySWRTb3VyY2VEcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEaWRTb3VyY2VEcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUYWJzKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMgdG8gYWRkIFNJUC1zcGVjaWZpYyBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBmaXJzdFxuICAgICAgICBzdXBlci5pbml0aWFsaXplRXZlbnRIYW5kbGVycygpO1xuXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBldmVudCBoYW5kbGVyc1xuICAgICAgICAkKCdpbnB1dFtuYW1lPVwiZGlzYWJsZWZyb211c2VyXCJdJykub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGNvbXBvbmVudHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycygpO1xuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFiIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFicygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpYWdub3N0aWNzIHRhYiBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICBpZiAodGhpcy5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ29wYWNpdHknLCAnMC40NScpXG4gICAgICAgICAgICAgICAgLmNzcygnY3Vyc29yJywgJ25vdC1hbGxvd2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ29wYWNpdHknLCAnJylcbiAgICAgICAgICAgICAgICAuY3NzKCdjdXJzb3InLCAnJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiAodGFiUGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHR5cGVvZiBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciAhPT0gJ3VuZGVmaW5lZCcgJiYgIXNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiB3aGVuIGl0IGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25Mb2FkOiAodGFiUGF0aCwgcGFyYW1ldGVyQXJyYXksIGhpc3RvcnlFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEJsb2NrIGxvYWRpbmcgb2YgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN3aXRjaCBiYWNrIHRvIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNsaWNrIHByZXZlbnRpb24gZm9yIGRpc2FibGVkIHRhYlxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKS5vZmYoJ2NsaWNrLmRpc2FibGVkJykub24oJ2NsaWNrLmRpc2FibGVkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBzdGF5IG9uIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNpcEV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyBzdHJpbmcgdG8gYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0YWJsZVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LmtleXByZXNzKChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBob3N0IGZyb20gYWRkaXRpb25hbC1ob3N0cy10YWJsZSAtIHVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlLm9uKCdjbGljaycsIFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuREVMRVRFX1JPV19CVVRUT04sIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEVE1GIG1vZGUgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjZHRtZm1vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJhbnNwb3J0IHByb3RvY29sIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyN0cmFuc3BvcnQtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgQ2FsbGVySUQgc291cmNlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2FsbGVySWRTb3VyY2VEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI2NpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAtIGl0J3MgYWxyZWFkeSByZW5kZXJlZCBieSBQSFBcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRElEIHNvdXJjZSBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjZGlkX3NvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMub25EaWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBDYWxsZXJJRCBzb3VyY2UgY2hhbmdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgQ2FsbGVySUQgc291cmNlXG4gICAgICovXG4gICAgb25DYWxsZXJJZFNvdXJjZUNoYW5nZSh2YWx1ZSkge1xuICAgICAgICBjb25zdCAkY3VzdG9tU2V0dGluZ3MgPSAkKCcjY2FsbGVyaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIC8vIE1ha2UgY3VzdG9tIGhlYWRlciBmaWVsZCByZXF1aXJlZFxuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBTaG93IGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignZmFkZSBkb3duJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlcXVpcmVkIHN0YXR1c1xuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBjdXN0b20gZmllbGRzIHdoZW4gbm90IGluIHVzZVxuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3N0YXJ0JykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX2VuZCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9yZWdleCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBhbnkgdmFsaWRhdGlvbiBlcnJvcnMgb24gaGlkZGVuIGZpZWxkc1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfcmVnZXgnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBObyBuZWVkIHRvIHJlaW5pdGlhbGl6ZSBmb3JtIC0gdmFsaWRhdGlvbiBydWxlcyBjaGVjayBzb3VyY2UgYXV0b21hdGljYWxseVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRElEIHNvdXJjZSBjaGFuZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBTZWxlY3RlZCBESUQgc291cmNlXG4gICAgICovXG4gICAgb25EaWRTb3VyY2VDaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGN1c3RvbVNldHRpbmdzID0gJCgnI2RpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgaWYgKHZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgLy8gTWFrZSBjdXN0b20gaGVhZGVyIGZpZWxkIHJlcXVpcmVkXG4gICAgICAgICAgICAkKCcjZGlkX2N1c3RvbV9oZWFkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIC8vIFNob3cgY3VzdG9tIHNldHRpbmdzIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICRjdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdmYWRlIGRvd24nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgY3VzdG9tIHNldHRpbmdzIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICRjdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdoaWRlJyk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgcmVxdWlyZWQgc3RhdHVzXG4gICAgICAgICAgICAkKCcjZGlkX2N1c3RvbV9oZWFkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGN1c3RvbSBmaWVsZHMgd2hlbiBub3QgaW4gdXNlXG4gICAgICAgICAgICAkKCcjZGlkX2N1c3RvbV9oZWFkZXInKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfc3RhcnQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfZW5kJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3JlZ2V4JykudmFsKCcnKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGFueSB2YWxpZGF0aW9uIGVycm9ycyBvbiBoaWRkZW4gZmllbGRzXG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9yZWdleCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE5vIG5lZWQgdG8gcmVpbml0aWFsaXplIGZvcm0gLSB2YWxpZGF0aW9uIHJ1bGVzIGNoZWNrIHNvdXJjZSBhdXRvbWF0aWNhbGx5XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgdjNcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFNpcFByb3ZpZGVyc0FQSSwgLy8gVXNlIFNJUC1zcGVjaWZpYyBBUEkgY2xpZW50IHYzXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCdcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeXNpcC9gO1xuXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm0gLSB0aGlzIHdhcyBtaXNzaW5nIVxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHMgYWZ0ZXIgUGFzc3dvcmRXaWRnZXQgaGFzIGNyZWF0ZWQgYWxsIGJ1dHRvbnNcbiAgICAgICAgUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gTWFyayBmb3JtIGFzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgIHRoaXMuZm9ybUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIC8vIElNUE9SVEFOVDogRG9uJ3Qgb3ZlcndyaXRlIHJlc3VsdC5kYXRhIC0gaXQgYWxyZWFkeSBjb250YWlucyBwcm9jZXNzZWQgY2hlY2tib3ggdmFsdWVzXG4gICAgICAgIC8vIEp1c3QgYWRkL21vZGlmeSBzcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBwcm92aWRlciB0eXBlXG4gICAgICAgIHJlc3VsdC5kYXRhLnR5cGUgPSB0aGlzLnByb3ZpZGVyVHlwZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBhZGRpdGlvbmFsIGhvc3RzIGZvciBTSVAgLSBjb2xsZWN0IGZyb20gdGFibGVcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbEhvc3RzID0gW107XG4gICAgICAgICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRib2R5IHRyLmhvc3Qtcm93JykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGhvc3QgPSAkKGVsZW1lbnQpLmZpbmQoJ3RkLmFkZHJlc3MnKS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsSG9zdHMucHVzaCh7IGFkZHJlc3M6IGhvc3QgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gT25seSBhZGQgaWYgdGhlcmUgYXJlIGhvc3RzXG4gICAgICAgIGlmIChhZGRpdGlvbmFsSG9zdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWRkaXRpb25hbEhvc3RzID0gYWRkaXRpb25hbEhvc3RzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBPdmVycmlkZSBpbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEgdG8gc2V0IFNJUC1zcGVjaWZpYyBkcm9wZG93biB2YWx1ZXNcbiAgICAgKiBDYWxsZWQgZnJvbSBwYXJlbnQncyBwb3B1bGF0ZUZvcm0oKSBpbiBiZWZvcmVQb3B1bGF0ZSBjYWxsYmFja1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhID0ge30pIHtcbiAgICAgICAgLy8gQ2FsbCBwYXJlbnQgZmlyc3QgKGluaXRpYWxpemVzIGNvbW1vbiBkcm9wZG93bnMgbGlrZSBuZXR3b3JrZmlsdGVyaWQpXG4gICAgICAgIHN1cGVyLmluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhKTtcblxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgZHJvcGRvd25zIGFyZSBhbHJlYWR5IGluaXRpYWxpemVkIGluIGluaXRpYWxpemVVSUNvbXBvbmVudHNcbiAgICAgICAgLy8gSnVzdCBzZXQgdGhlaXIgdmFsdWVzIGZyb20gQVBJIGRhdGFcbiAgICAgICAgY29uc3QgZHJvcGRvd25VcGRhdGVzID0gW1xuICAgICAgICAgICAgeyBzZWxlY3RvcjogJyNkdG1mbW9kZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmR0bWZtb2RlIHx8ICcnIH0sXG4gICAgICAgICAgICB7IHNlbGVjdG9yOiAnI3RyYW5zcG9ydC1kcm9wZG93bicsIHZhbHVlOiBkYXRhLnRyYW5zcG9ydCB8fCAnJyB9LFxuICAgICAgICAgICAgeyBzZWxlY3RvcjogJyNyZWdpc3RyYXRpb25fdHlwZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLnJlZ2lzdHJhdGlvbl90eXBlIHx8ICcnIH0sXG4gICAgICAgICAgICB7IHNlbGVjdG9yOiAnI2NpZF9zb3VyY2UtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5jaWRfc291cmNlIHx8ICcnIH0sXG4gICAgICAgICAgICB7IHNlbGVjdG9yOiAnI2RpZF9zb3VyY2UtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5kaWRfc291cmNlIHx8ICcnIH1cbiAgICAgICAgXTtcblxuICAgICAgICBkcm9wZG93blVwZGF0ZXMuZm9yRWFjaCgoeyBzZWxlY3RvciwgdmFsdWUgfSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChzZWxlY3Rvcik7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgcG9wdWxhdGVGb3JtRGF0YSB0byBoYW5kbGUgU0lQLXNwZWNpZmljIGZpZWxkc1xuICAgICAqIENhbGxlZCBmcm9tIHBhcmVudCdzIHBvcHVsYXRlRm9ybSgpIGluIGFmdGVyUG9wdWxhdGUgY2FsbGJhY2tcbiAgICAgKiBNb3N0IGZpZWxkcyBhcmUgaGFuZGxlZCBieSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KClcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gQ2FsbCBwYXJlbnQgbWV0aG9kIGZpcnN0XG4gICAgICAgIHN1cGVyLnBvcHVsYXRlRm9ybURhdGEoZGF0YSk7XG5cbiAgICAgICAgLy8gQWRkaXRpb25hbCBob3N0cyAtIHBvcHVsYXRlIGFmdGVyIGZvcm0gaXMgcmVhZHlcbiAgICAgICAgaWYgKGRhdGEuYWRkaXRpb25hbEhvc3RzKSB7XG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGRhdGEuYWRkaXRpb25hbEhvc3RzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgc3VwZXIuY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuaWQgJiYgISQoJyNpZCcpLnZhbCgpKSB7XG4gICAgICAgICAgICAgICAgJCgnI2lkJykudmFsKHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGUgRm9ybS5qcyB3aWxsIGhhbmRsZSB0aGUgcmVsb2FkIGF1dG9tYXRpY2FsbHkgaWYgcmVzcG9uc2UucmVsb2FkIGlzIHByZXNlbnRcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgUkVTVCBBUEkgcmV0dXJucyByZWxvYWQgcGF0aCBsaWtlIFwicHJvdmlkZXJzL21vZGlmeXNpcC9TSVAtVFJVTksteHh4XCJcbiAgICAgICAgfVxuICAgIH1cbiAgICBcblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcnVsZXNNYXAgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDogKCkgPT4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCksXG4gICAgICAgICAgICBpbmJvdW5kOiAoKSA9PiB0aGlzLmdldEluYm91bmRSdWxlcygpLFxuICAgICAgICAgICAgbm9uZTogKCkgPT4gdGhpcy5nZXROb25lUnVsZXMoKSxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJ1bGVzID0gcnVsZXNNYXBbcmVnVHlwZV0gPyBydWxlc01hcFtyZWdUeXBlXSgpIDogdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQ2FsbGVySUQvRElEIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkQ2FsbGVySWREaWRSdWxlcyhydWxlcyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvbiBydWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBydWxlcyAtIEV4aXN0aW5nIHJ1bGVzXG4gICAgICogQHJldHVybnMge29iamVjdH0gUnVsZXMgd2l0aCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvblxuICAgICAqL1xuICAgIGFkZENhbGxlcklkRGlkUnVsZXMocnVsZXMpIHtcbiAgICAgICAgLy8gQ3VzdG9tIGhlYWRlciB2YWxpZGF0aW9uIHVzaW5nIGdsb2JhbCBjdXN0b20gcnVsZXNcbiAgICAgICAgcnVsZXMuY2lkX2N1c3RvbV9oZWFkZXIgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY2lkX2N1c3RvbV9oZWFkZXInLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tSGVhZGVyW2NpZF0nLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRW1wdHksXG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLmRpZF9jdXN0b21faGVhZGVyID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2RpZF9jdXN0b21faGVhZGVyJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbUhlYWRlcltkaWRdJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5LFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZWdleCBwYXR0ZXJuIHZhbGlkYXRpb24gdXNpbmcgZ2xvYmFsIGN1c3RvbSBydWxlc1xuICAgICAgICBydWxlcy5jaWRfcGFyc2VyX3JlZ2V4ID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NpZF9wYXJzZXJfcmVnZXgnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnZXhQYXR0ZXJuW2NpZF0nLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlSW52YWxpZFJlZ2V4XG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuXG4gICAgICAgIHJ1bGVzLmRpZF9wYXJzZXJfcmVnZXggPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGlkX3BhcnNlcl9yZWdleCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdleFBhdHRlcm5bZGlkXScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVJbnZhbGlkUmVnZXhcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUGFyc2VyIHN0YXJ0L2VuZCBmaWVsZHMgZG9uJ3QgbmVlZCB2YWxpZGF0aW9uIC0gdGhleSBhcmUgdHJ1bHkgb3B0aW9uYWxcbiAgICAgICAgLy8gTm8gcnVsZXMgbmVlZGVkIGZvciBjaWRfcGFyc2VyX3N0YXJ0LCBjaWRfcGFyc2VyX2VuZCwgZGlkX3BhcnNlcl9zdGFydCwgZGlkX3BhcnNlcl9lbmRcblxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG91dGJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldE91dGJvdW5kUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTkuLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeW2EtekEtWjAtOV8uLV0rJCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRJbmJvdW5kUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdeW2EtekEtWjAtOV8uLV0rJCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbOF0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBub25lIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldE5vbmVSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGhvc3QgbGFiZWwgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0TGFiZWwocmVnVHlwZSkge1xuICAgICAgICBjb25zdCAkaG9zdExhYmVsVGV4dCA9ICQoJyNob3N0TGFiZWxUZXh0Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGb3IgaW5ib3VuZCwgdGhlIGZpZWxkIGlzIGhpZGRlbiBzbyBubyBuZWVkIHRvIHVwZGF0ZSBsYWJlbFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNlbEhvc3QnKSxcbiAgICAgICAgICAgIHBvcnQ6ICQoJyNlbFBvcnQnKSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjZWxVc2VybmFtZScpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjZWxTZWNyZXQnKSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxIb3N0OiAkKCcjZWxBZGRpdGlvbmFsSG9zdHMnKSxcbiAgICAgICAgICAgIG5ldHdvcmtGaWx0ZXI6ICQoJyNlbE5ldHdvcmtGaWx0ZXInKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZmllbGRzID0ge1xuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyN1c2VybmFtZScpLFxuICAgICAgICAgICAgc2VjcmV0OiB0aGlzLiRzZWNyZXQsXG4gICAgICAgICAgICBuZXR3b3JrRmlsdGVySWQ6ICQoJyNuZXR3b3JrZmlsdGVyaWQnKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBjb25zdCBjb25maWdzID0ge1xuICAgICAgICAgICAgb3V0Ym91bmQ6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZScsICdzZWNyZXQnLCAnYWRkaXRpb25hbEhvc3QnXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFsnbmV0d29ya0ZpbHRlciddLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5OT05FXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXNldE5ldHdvcmtGaWx0ZXI6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbmJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWyd1c2VybmFtZScsICdzZWNyZXQnLCAnbmV0d29ya0ZpbHRlcicsICdhZGRpdGlvbmFsSG9zdCddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWydob3N0JywgJ3BvcnQnXSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhdXRvR2VuZXJhdGVQYXNzd29yZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjbGVhclZhbGlkYXRpb25Gb3I6IFsnaG9zdCcsICdwb3J0J11cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub25lOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ2FkZGl0aW9uYWxIb3N0JywgJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFtdLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZFRvb2x0aXA6IHRydWUsXG4gICAgICAgICAgICAgICAgbWFrZU9wdGlvbmFsOiBbJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGNsZWFyVmFsaWRhdGlvbkZvcjogWyd1c2VybmFtZScsICdzZWNyZXQnXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgY29uZmlndXJhdGlvblxuICAgICAgICBjb25zdCBjb25maWcgPSBjb25maWdzW3JlZ1R5cGVdIHx8IGNvbmZpZ3Mub3V0Ym91bmQ7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSB2aXNpYmlsaXR5XG4gICAgICAgIGNvbmZpZy52aXNpYmxlLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LnNob3coKSk7XG4gICAgICAgIGNvbmZpZy5oaWRkZW4uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uaGlkZSgpKTtcblxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgZmllbGQgLSBlbnN1cmUgaXQncyBhbHdheXMgZWRpdGFibGVcbiAgICAgICAgZmllbGRzLnVzZXJuYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gUHJlLWZpbGwgdXNlcm5hbWUgd2l0aCBwcm92aWRlciBJRCBmb3IgbmV3IGluYm91bmQgcHJvdmlkZXJzXG4gICAgICAgIC8vIHByb3ZpZGVySWQgYWxyZWFkeSBjb250YWlucyBJRCBmcm9tIGdldERlZmF1bHQgKGxvYWRlZCBpbiBsb2FkRm9ybURhdGEpXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcgJiYgdGhpcy5pc05ld1Byb3ZpZGVyICYmICghZmllbGRzLnVzZXJuYW1lLnZhbCgpIHx8IGZpZWxkcy51c2VybmFtZS52YWwoKS50cmltKCkgPT09ICcnKSkge1xuICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnZhbChwcm92aWRlcklkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCBpZiBlbXB0eVxuICAgICAgICBpZiAoY29uZmlnLmF1dG9HZW5lcmF0ZVBhc3N3b3JkICYmIGZpZWxkcy5zZWNyZXQudmFsKCkudHJpbSgpID09PSAnJyAmJiB0aGlzLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0LmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bj8udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVzZXQgbmV0d29yayBmaWx0ZXIgZm9yIG91dGJvdW5kXG4gICAgICAgIGlmIChjb25maWcucmVzZXROZXR3b3JrRmlsdGVyKSB7XG4gICAgICAgICAgICBmaWVsZHMubmV0d29ya0ZpbHRlcklkLnZhbCgnbm9uZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgd2lkZ2V0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMucGFzc3dvcmRXaWRnZXQgJiYgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC51cGRhdGVDb25maWcodGhpcy5wYXNzd29yZFdpZGdldCwgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIHRvb2x0aXBcbiAgICAgICAgaWYgKGNvbmZpZy5zaG93UGFzc3dvcmRUb29sdGlwKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkVG9vbHRpcCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNYWtlIGZpZWxkcyBvcHRpb25hbFxuICAgICAgICBjb25maWcubWFrZU9wdGlvbmFsPy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgICQoYCNlbCR7ZmllbGQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBmaWVsZC5zbGljZSgxKX1gKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9ycyBmb3Igc3BlY2lmaWVkIGZpZWxkc1xuICAgICAgICBjb25maWcuY2xlYXJWYWxpZGF0aW9uRm9yPy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsIGZpZWxkKTtcbiAgICAgICAgICAgICQoYCMke2ZpZWxkfWApLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBob3N0IGxhYmVsXG4gICAgICAgIHRoaXMudXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpOyBcblxuICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uICdkaXNhYmxlZnJvbXVzZXInIGNoZWNrYm94XG4gICAgICAgIC8vIFVzZSB0aGUgb3V0ZXIgZGl2LmNoZWNrYm94IGNvbnRhaW5lciBpbnN0ZWFkIG9mIGlucHV0IGVsZW1lbnRcbiAgICAgICAgY29uc3QgZWwgPSAkKCdpbnB1dFtuYW1lPVwiZGlzYWJsZWZyb211c2VyXCJdJykuY2xvc2VzdCgnLnVpLmNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0IGZyb21Vc2VyID0gJCgnI2RpdkZyb21Vc2VyJyk7XG4gICAgICAgIGlmIChlbC5sZW5ndGggPiAwICYmIGVsLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGZyb21Vc2VyLmhpZGUoKTtcbiAgICAgICAgICAgIGZyb21Vc2VyLnJlbW92ZUNsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tVXNlci5zaG93KCk7XG4gICAgICAgICAgICBmcm9tVXNlci5hZGRDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIENhbGxlcklEIGN1c3RvbSBzZXR0aW5ncyB2aXNpYmlsaXR5IGJhc2VkIG9uIGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgICAgY29uc3QgY2lkRHJvcGRvd24gPSAkKCcjY2lkX3NvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoY2lkRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgY2lkVmFsdWUgPSBjaWREcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBjaWRDdXN0b21TZXR0aW5ncyA9ICQoJyNjYWxsZXJpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgICAgIGlmIChjaWRWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBjaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdzaG93Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGNpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIERJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGRpZERyb3Bkb3duID0gJCgnI2RpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKGRpZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZFZhbHVlID0gZGlkRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgZGlkQ3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICAgICAgaWYgKGRpZFZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGRpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ3Nob3cnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgZGlkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjb21wbGV0aW9uIG9mIGhvc3QgYWRkcmVzcyBpbnB1dFxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FkZGl0aW9uYWwtaG9zdCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsdWUubWF0Y2godGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGlucHV0IHZhbHVlXG4gICAgICAgICAgICBpZiAodmFsaWRhdGlvbiA9PT0gbnVsbCB8fCB2YWxpZGF0aW9uLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBob3N0IGFkZHJlc3MgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIGlmICgkKGAuaG9zdC1yb3dbZGF0YS12YWx1ZT1cXFwiJHt2YWx1ZX1cXFwiXWApLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBob3N0cyB0YWJsZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RzVGFibGVWaWV3KCkge1xuICAgICAgICBjb25zdCAkaG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgIGlmICgkaG9zdFJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHthcnJheX0gYWRkaXRpb25hbEhvc3RzIC0gQXJyYXkgb2YgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGFkZGl0aW9uYWxIb3N0cykge1xuICAgICAgICBpZiAoIWFkZGl0aW9uYWxIb3N0cyB8fCAhQXJyYXkuaXNBcnJheShhZGRpdGlvbmFsSG9zdHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGhvc3RzIGZpcnN0IChleGNlcHQgdGVtcGxhdGUgYW5kIGR1bW15KVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZS5maW5kKGB0Ym9keSB0ciR7UHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPV31gKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIGhvc3QgdXNpbmcgdGhlIHNhbWUgbG9naWMgYXMgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3NcbiAgICAgICAgYWRkaXRpb25hbEhvc3RzLmZvckVhY2goKGhvc3RPYmopID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIG9iamVjdCBmb3JtYXQge2lkLCBhZGRyZXNzfSBhbmQgc3RyaW5nIGZvcm1hdFxuICAgICAgICAgICAgY29uc3QgaG9zdEFkZHJlc3MgPSB0eXBlb2YgaG9zdE9iaiA9PT0gJ3N0cmluZycgPyBob3N0T2JqIDogaG9zdE9iai5hZGRyZXNzO1xuICAgICAgICAgICAgaWYgKGhvc3RBZGRyZXNzICYmIGhvc3RBZGRyZXNzLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgc2FtZSBsb2dpYyBhcyBjYk9uQ29tcGxldGVIb3N0QWRkcmVzc1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbnNlcnQgdGhlIGNsb25lZCByb3dcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHByb3ZpZGVyIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IFByb3ZpZGVyU0lQKCk7XG4gICAgcHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xufSk7Il19