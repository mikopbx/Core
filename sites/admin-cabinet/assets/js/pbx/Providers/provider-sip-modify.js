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
      this.updateHostsTableView(); // Initialize field help tooltips

      ProviderSipTooltipManager.initialize();
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
        // For inbound registration, username should match provider ID
        // Backend always returns ID (temporary for new providers like SIP-NEW-XXXXXXXX)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyIkIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJydWxlcyIsInJlZ2V4UGF0dGVybiIsInZhbHVlIiwicGFyYW1ldGVyIiwiZmllbGRUeXBlIiwic291cmNlRmllbGQiLCJ2YWwiLCJ0cmltIiwiUmVnRXhwIiwiZSIsImNvbnNvbGUiLCJsb2ciLCJ0b1VwcGVyQ2FzZSIsIm1lc3NhZ2UiLCJjdXN0b21IZWFkZXIiLCJ0ZXN0IiwiUHJvdmlkZXJTSVAiLCIkcXVhbGlmeVRvZ2dsZSIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicGFyZW50IiwiaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24iLCJpbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24iLCJpbml0aWFsaXplQ2FsbGVySWRTb3VyY2VEcm9wZG93biIsImluaXRpYWxpemVEaWRTb3VyY2VEcm9wZG93biIsImluaXRpYWxpemVUYWJzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycyIsInVwZGF0ZUhvc3RzVGFibGVWaWV3IiwiUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJzZWxmIiwiaXNOZXdQcm92aWRlciIsImNzcyIsInRhYiIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciIsImluaXRpYWxpemVEaWFnbm9zdGljc1RhYiIsIm9uTG9hZCIsInBhcmFtZXRlckFycmF5IiwiaGlzdG9yeUV2ZW50Iiwib2ZmIiwicHJldmVudERlZmF1bHQiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCJrZXlwcmVzcyIsIndoaWNoIiwiY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MiLCJERUxFVEVfUk9XX0JVVFRPTiIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmUiLCIkZHJvcGRvd24iLCJsZW5ndGgiLCJkcm9wZG93biIsIm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UiLCJvbkRpZFNvdXJjZUNoYW5nZSIsIiRjdXN0b21TZXR0aW5ncyIsInRyYW5zaXRpb24iLCIkZm9ybU9iaiIsInVybCIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwiY2JCZWZvcmVTZW5kRm9ybSIsImJpbmQiLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJTaXBQcm92aWRlcnNBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiZm9ybUluaXRpYWxpemVkIiwicmVzdWx0IiwiZGF0YSIsInR5cGUiLCJwcm92aWRlclR5cGUiLCJhZGRpdGlvbmFsSG9zdHMiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiaG9zdCIsImZpbmQiLCJ0ZXh0IiwicHVzaCIsImFkZHJlc3MiLCJkcm9wZG93blVwZGF0ZXMiLCJzZWxlY3RvciIsImR0bWZtb2RlIiwidHJhbnNwb3J0IiwicmVnaXN0cmF0aW9uX3R5cGUiLCJjaWRfc291cmNlIiwiZGlkX3NvdXJjZSIsImZvckVhY2giLCJwb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyIsInJlc3BvbnNlIiwiaWQiLCJyZWdUeXBlIiwicnVsZXNNYXAiLCJvdXRib3VuZCIsImdldE91dGJvdW5kUnVsZXMiLCJpbmJvdW5kIiwiZ2V0SW5ib3VuZFJ1bGVzIiwibm9uZSIsImdldE5vbmVSdWxlcyIsImFkZENhbGxlcklkRGlkUnVsZXMiLCJjaWRfY3VzdG9tX2hlYWRlciIsImlkZW50aWZpZXIiLCJvcHRpb25hbCIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRW1wdHkiLCJkaWRfY3VzdG9tX2hlYWRlciIsImNpZF9wYXJzZXJfcmVnZXgiLCJwcl9WYWxpZGF0ZUludmFsaWRSZWdleCIsImRpZF9wYXJzZXJfcmVnZXgiLCJkZXNjcmlwdGlvbiIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJzZWNyZXQiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCIsImFkZGl0aW9uYWxfaG9zdHMiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwicHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IiwiJGhvc3RMYWJlbFRleHQiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsInByb3ZpZGVySWQiLCJlbGVtZW50cyIsImFkZGl0aW9uYWxIb3N0IiwibmV0d29ya0ZpbHRlciIsImZpZWxkcyIsIiRzZWNyZXQiLCJuZXR3b3JrRmlsdGVySWQiLCJjb25maWdzIiwidmlzaWJsZSIsImhpZGRlbiIsInBhc3N3b3JkV2lkZ2V0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJ2YWxpZGF0aW9uIiwiUGFzc3dvcmRXaWRnZXQiLCJWQUxJREFUSU9OIiwiTk9ORSIsInJlc2V0TmV0d29ya0ZpbHRlciIsIlNPRlQiLCJyZWFkb25seVVzZXJuYW1lIiwiYXV0b0dlbmVyYXRlUGFzc3dvcmQiLCJjbGVhclZhbGlkYXRpb25Gb3IiLCJzaG93UGFzc3dvcmRUb29sdGlwIiwibWFrZU9wdGlvbmFsIiwiY29uZmlnIiwia2V5Iiwic2hvdyIsImhpZGUiLCJhdHRyIiwicmVtb3ZlQXR0ciIsIiRnZW5lcmF0ZUJ0biIsInRyaWdnZXIiLCJ1cGRhdGVDb25maWciLCJoaWRlUGFzc3dvcmRUb29sdGlwIiwiZmllbGQiLCJjaGFyQXQiLCJzbGljZSIsInVwZGF0ZUhvc3RMYWJlbCIsImVsIiwiZnJvbVVzZXIiLCJjaWREcm9wZG93biIsImNpZFZhbHVlIiwiY2lkQ3VzdG9tU2V0dGluZ3MiLCJkaWREcm9wZG93biIsImRpZFZhbHVlIiwiZGlkQ3VzdG9tU2V0dGluZ3MiLCJtYXRjaCIsIiR0ciIsImxhc3QiLCIkY2xvbmUiLCJjbG9uZSIsImh0bWwiLCIkZXhpc3RpbmdIb3N0Um93cyIsIkhPU1RfUk9XIiwiYWZ0ZXIiLCIkaG9zdFJvd3MiLCJBcnJheSIsImlzQXJyYXkiLCJob3N0T2JqIiwiaG9zdEFkZHJlc3MiLCJQcm92aWRlckJhc2UiLCJkb2N1bWVudCIsInJlYWR5IiwicHJvdmlkZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QUFRLEdBQUcsSUFBSTFNLFdBQUosRUFBakI7QUFDQTBNLEVBQUFBLFFBQVEsQ0FBQzdLLFVBQVQ7QUFDSCxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyLCBQcm92aWRlclRvb2x0aXBNYW5hZ2VyLCBpMThuLCBTaXBQcm92aWRlcnNBUEkgKi9cblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlOiBDaGVjayBpZiByZWdleCBwYXR0ZXJuIGlzIHZhbGlkXG4gKiBPbmx5IHZhbGlkYXRlcyB3aGVuIHRoZSBjb3JyZXNwb25kaW5nIHNvdXJjZSBkcm9wZG93biBpcyBzZXQgdG8gJ2N1c3RvbSdcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnJlZ2V4UGF0dGVybiA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiB7XG4gICAgLy8gUGFyc2UgcGFyYW1ldGVyIHRvIGdldCBmaWVsZCB0eXBlIChjaWQgb3IgZGlkKVxuICAgIGNvbnN0IGZpZWxkVHlwZSA9IHBhcmFtZXRlciB8fCAnY2lkJztcbiAgICBjb25zdCBzb3VyY2VGaWVsZCA9IGZpZWxkVHlwZSA9PT0gJ2RpZCcgPyAnI2RpZF9zb3VyY2UnIDogJyNjaWRfc291cmNlJztcblxuICAgIC8vIFNraXAgdmFsaWRhdGlvbiBpZiBzb3VyY2UgaXMgbm90ICdjdXN0b20nXG4gICAgaWYgKCQoc291cmNlRmllbGQpLnZhbCgpICE9PSAnY3VzdG9tJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBBbGxvdyBlbXB0eSB2YWx1ZXMgKGZpZWxkIGlzIG9wdGlvbmFsKVxuICAgIGlmICghdmFsdWUgfHwgdmFsdWUudHJpbSgpID09PSAnJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSByZWdleCBwYXR0ZXJuXG4gICAgdHJ5IHtcbiAgICAgICAgbmV3IFJlZ0V4cCh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coYEludmFsaWQgJHtmaWVsZFR5cGUudG9VcHBlckNhc2UoKX0gcmVnZXggcGF0dGVybjpgLCB2YWx1ZSwgZS5tZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZTogQ2hlY2sgaWYgY3VzdG9tIGhlYWRlciBpcyB2YWxpZFxuICogT25seSB2YWxpZGF0ZXMgd2hlbiB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgZHJvcGRvd24gaXMgc2V0IHRvICdjdXN0b20nXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21IZWFkZXIgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4ge1xuICAgIC8vIFBhcnNlIHBhcmFtZXRlciB0byBnZXQgZmllbGQgdHlwZSAoY2lkIG9yIGRpZClcbiAgICBjb25zdCBmaWVsZFR5cGUgPSBwYXJhbWV0ZXIgfHwgJ2NpZCc7XG4gICAgY29uc3Qgc291cmNlRmllbGQgPSBmaWVsZFR5cGUgPT09ICdkaWQnID8gJyNkaWRfc291cmNlJyA6ICcjY2lkX3NvdXJjZSc7XG5cbiAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgc291cmNlIGlzIG5vdCAnY3VzdG9tJ1xuICAgIGlmICgkKHNvdXJjZUZpZWxkKS52YWwoKSAhPT0gJ2N1c3RvbScpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRmllbGQgaXMgcmVxdWlyZWQgd2hlbiBzb3VyY2UgaXMgY3VzdG9tXG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBmb3JtYXQ6IG9ubHkgbGV0dGVycywgbnVtYmVycywgZGFzaCBhbmQgdW5kZXJzY29yZVxuICAgIHJldHVybiAvXltBLVphLXowLTktX10rJC8udGVzdCh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIFNJUCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlclNJUFxuICovXG5jbGFzcyBQcm92aWRlclNJUCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7ICBcbiAgICAvLyBTSVAtc3BlY2lmaWMgc2VsZWN0b3JzXG4gICAgc3RhdGljIFNJUF9TRUxFQ1RPUlMgPSB7XG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfVEFCTEU6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZScsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfRFVNTVk6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuZHVtbXknLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RTX1RFTVBMQVRFOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmhvc3Qtcm93LXRwbCcsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVF9JTlBVVDogJyNhZGRpdGlvbmFsLWhvc3QgaW5wdXQnLFxuICAgICAgICBERUxFVEVfUk9XX0JVVFRPTjogJy5kZWxldGUtcm93LWJ1dHRvbicsXG4gICAgICAgIEhPU1RfUk9XOiAnLmhvc3Qtcm93J1xuICAgIH07XG4gICAgXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCdTSVAnKTtcbiAgICAgICAgdGhpcy4kcXVhbGlmeVRvZ2dsZSA9ICQoJyNxdWFsaWZ5Jyk7XG4gICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlID0gJCgnI3F1YWxpZnktZnJlcScpO1xuICAgICAgICBcbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIGpRdWVyeSBvYmplY3RzXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15ID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfRFVNTVkpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX1RFTVBMQVRFKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGFibGUgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19UQUJMRSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUX0lOUFVUKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICogT3ZlcnJpZGUgdG8gYWRkIFNJUC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IGluaXRpYWxpemUgLSB0aGlzIGhhbmRsZXMgdGhlIGZ1bGwgZmxvdzpcbiAgICAgICAgLy8gMS4gaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpXG4gICAgICAgIC8vIDIuIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKClcbiAgICAgICAgLy8gMy4gaW5pdGlhbGl6ZUZvcm0oKVxuICAgICAgICAvLyA0LiBsb2FkRm9ybURhdGEoKVxuICAgICAgICBzdXBlci5pbml0aWFsaXplKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyB0byBhZGQgU0lQLXNwZWNpZmljIFVJIGluaXRpYWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gQ2FsbCBwYXJlbnQgZmlyc3RcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBVSSBjb21wb25lbnRzXG4gICAgICAgIHRoaXMuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVidWcgY2hlY2tib3ggLSB1c2luZyBwYXJlbnQgY29udGFpbmVyIHdpdGggY2xhc3Mgc2VsZWN0b3JcbiAgICAgICAgJCgnI2NpZF9kaWRfZGVidWcnKS5wYXJlbnQoJy5jaGVja2JveCcpLmNoZWNrYm94KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTSVAtc3BlY2lmaWMgc3RhdGljIGRyb3Bkb3ducyAoUEhQLXJlbmRlcmVkKVxuICAgICAgICB0aGlzLmluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNhbGxlcklkU291cmNlRHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGlkU291cmNlRHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGFicygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE92ZXJyaWRlIGluaXRpYWxpemVFdmVudEhhbmRsZXJzIHRvIGFkZCBTSVAtc3BlY2lmaWMgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gQ2FsbCBwYXJlbnQgZmlyc3RcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKTtcblxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImRpc2FibGVmcm9tdXNlclwiXScpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFNJUC1zcGVjaWZpYyBjb21wb25lbnRzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVNpcEV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAgICBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgIGlmICh0aGlzLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmNzcygnb3BhY2l0eScsICcwLjQ1JylcbiAgICAgICAgICAgICAgICAuY3NzKCdjdXJzb3InLCAnbm90LWFsbG93ZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmNzcygnb3BhY2l0eScsICcnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ2N1cnNvcicsICcnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6ICh0YWJQYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgdHlwZW9mIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyICE9PSAndW5kZWZpbmVkJyAmJiAhc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIHdoZW4gaXQgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmluaXRpYWxpemVEaWFnbm9zdGljc1RhYigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkxvYWQ6ICh0YWJQYXRoLCBwYXJhbWV0ZXJBcnJheSwgaGlzdG9yeUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQmxvY2sgbG9hZGluZyBvZiBkaWFnbm9zdGljcyB0YWIgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiBzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3dpdGNoIGJhY2sgdG8gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2xpY2sgcHJldmVudGlvbiBmb3IgZGlzYWJsZWQgdGFiXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpLm9mZignY2xpY2suZGlzYWJsZWQnKS5vbignY2xpY2suZGlzYWJsZWQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBpZiAoc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIHN0YXkgb24gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cInNldHRpbmdzXCJdJykudGFiKCdjaGFuZ2UgdGFiJywgJ3NldHRpbmdzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBTSVAtc3BlY2lmaWMgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbmV3IHN0cmluZyB0byBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRhYmxlXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQua2V5cHJlc3MoKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLndoaWNoID09PSAxMykge1xuICAgICAgICAgICAgICAgIHNlbGYuY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGhvc3QgZnJvbSBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC0gdXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGR5bmFtaWMgZWxlbWVudHNcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGFibGUub24oJ2NsaWNrJywgUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5ERUxFVEVfUk9XX0JVVFRPTiwgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERUTUYgbW9kZSBkcm9wZG93biB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIChQSFAtcmVuZGVyZWQpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNkdG1mbW9kZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0cmFuc3BvcnQgcHJvdG9jb2wgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3RyYW5zcG9ydC1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBDYWxsZXJJRCBzb3VyY2UgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjY2lkX3NvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHN0YW5kYXJkIEZvbWFudGljIFVJIC0gaXQncyBhbHJlYWR5IHJlbmRlcmVkIGJ5IFBIUFxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMub25DYWxsZXJJZFNvdXJjZUNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBESUQgc291cmNlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlkU291cmNlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNkaWRfc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgLSBpdCdzIGFscmVhZHkgcmVuZGVyZWQgYnkgUEhQXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbkRpZFNvdXJjZUNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIENhbGxlcklEIHNvdXJjZSBjaGFuZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBTZWxlY3RlZCBDYWxsZXJJRCBzb3VyY2VcbiAgICAgKi9cbiAgICBvbkNhbGxlcklkU291cmNlQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjdXN0b21TZXR0aW5ncyA9ICQoJyNjYWxsZXJpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgaWYgKHZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgLy8gTWFrZSBjdXN0b20gaGVhZGVyIGZpZWxkIHJlcXVpcmVkXG4gICAgICAgICAgICAkKCcjY2lkX2N1c3RvbV9oZWFkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIC8vIFNob3cgY3VzdG9tIHNldHRpbmdzIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICRjdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdmYWRlIGRvd24nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgY3VzdG9tIHNldHRpbmdzIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICRjdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdoaWRlJyk7XG4gICAgICAgICAgICAvLyBSZW1vdmUgcmVxdWlyZWQgc3RhdHVzXG4gICAgICAgICAgICAkKCcjY2lkX2N1c3RvbV9oZWFkZXInKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGN1c3RvbSBmaWVsZHMgd2hlbiBub3QgaW4gdXNlXG4gICAgICAgICAgICAkKCcjY2lkX2N1c3RvbV9oZWFkZXInKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfc3RhcnQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfZW5kJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3JlZ2V4JykudmFsKCcnKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGFueSB2YWxpZGF0aW9uIGVycm9ycyBvbiBoaWRkZW4gZmllbGRzXG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9yZWdleCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE5vIG5lZWQgdG8gcmVpbml0aWFsaXplIGZvcm0gLSB2YWxpZGF0aW9uIHJ1bGVzIGNoZWNrIHNvdXJjZSBhdXRvbWF0aWNhbGx5XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBESUQgc291cmNlIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIERJRCBzb3VyY2VcbiAgICAgKi9cbiAgICBvbkRpZFNvdXJjZUNoYW5nZSh2YWx1ZSkge1xuICAgICAgICBjb25zdCAkY3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICBpZiAodmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIGN1c3RvbSBoZWFkZXIgZmllbGQgcmVxdWlyZWRcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2ZhZGUgZG93bicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSByZXF1aXJlZCBzdGF0dXNcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIGZpZWxkcyB3aGVuIG5vdCBpbiB1c2VcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9zdGFydCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9lbmQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoJycpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgYW55IHZhbGlkYXRpb24gZXJyb3JzIG9uIGhpZGRlbiBmaWVsZHNcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3JlZ2V4JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm8gbmVlZCB0byByZWluaXRpYWxpemUgZm9ybSAtIHZhbGlkYXRpb24gcnVsZXMgY2hlY2sgc291cmNlIGF1dG9tYXRpY2FsbHlcbiAgICB9XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIHYzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBTaXBQcm92aWRlcnNBUEksIC8vIFVzZSBTSVAtc3BlY2lmaWMgQVBJIGNsaWVudCB2M1xuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeXNpcC9gO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtIC0gdGhpcyB3YXMgbWlzc2luZyFcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gSU1QT1JUQU5UOiBEb24ndCBvdmVyd3JpdGUgcmVzdWx0LmRhdGEgLSBpdCBhbHJlYWR5IGNvbnRhaW5zIHByb2Nlc3NlZCBjaGVja2JveCB2YWx1ZXNcbiAgICAgICAgLy8gSnVzdCBhZGQvbW9kaWZ5IHNwZWNpZmljIGZpZWxkc1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9IHRoaXMucHJvdmlkZXJUeXBlO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGFkZGl0aW9uYWwgaG9zdHMgZm9yIFNJUCAtIGNvbGxlY3QgZnJvbSB0YWJsZVxuICAgICAgICBjb25zdCBhZGRpdGlvbmFsSG9zdHMgPSBbXTtcbiAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHkgdHIuaG9zdC1yb3cnKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaG9zdCA9ICQoZWxlbWVudCkuZmluZCgndGQuYWRkcmVzcycpLnRleHQoKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxIb3N0cy5wdXNoKHsgYWRkcmVzczogaG9zdCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBPbmx5IGFkZCBpZiB0aGVyZSBhcmUgaG9zdHNcbiAgICAgICAgaWYgKGFkZGl0aW9uYWxIb3N0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hZGRpdGlvbmFsSG9zdHMgPSBhZGRpdGlvbmFsSG9zdHM7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIE92ZXJyaWRlIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YSB0byBzZXQgU0lQLXNwZWNpZmljIGRyb3Bkb3duIHZhbHVlc1xuICAgICAqIENhbGxlZCBmcm9tIHBhcmVudCdzIHBvcHVsYXRlRm9ybSgpIGluIGJlZm9yZVBvcHVsYXRlIGNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhKGRhdGEgPSB7fSkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBmaXJzdCAoaW5pdGlhbGl6ZXMgY29tbW9uIGRyb3Bkb3ducyBsaWtlIG5ldHdvcmtmaWx0ZXJpZClcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhKGRhdGEpO1xuXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBkcm9wZG93bnMgYXJlIGFscmVhZHkgaW5pdGlhbGl6ZWQgaW4gaW5pdGlhbGl6ZVVJQ29tcG9uZW50c1xuICAgICAgICAvLyBKdXN0IHNldCB0aGVpciB2YWx1ZXMgZnJvbSBBUEkgZGF0YVxuICAgICAgICBjb25zdCBkcm9wZG93blVwZGF0ZXMgPSBbXG4gICAgICAgICAgICB7IHNlbGVjdG9yOiAnI2R0bWZtb2RlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuZHRtZm1vZGUgfHwgJycgfSxcbiAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjdHJhbnNwb3J0LWRyb3Bkb3duJywgdmFsdWU6IGRhdGEudHJhbnNwb3J0IHx8ICcnIH0sXG4gICAgICAgICAgICB7IHNlbGVjdG9yOiAnI3JlZ2lzdHJhdGlvbl90eXBlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgJycgfSxcbiAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjY2lkX3NvdXJjZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmNpZF9zb3VyY2UgfHwgJycgfSxcbiAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcjZGlkX3NvdXJjZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmRpZF9zb3VyY2UgfHwgJycgfVxuICAgICAgICBdO1xuXG4gICAgICAgIGRyb3Bkb3duVXBkYXRlcy5mb3JFYWNoKCh7IHNlbGVjdG9yLCB2YWx1ZSB9KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPdmVycmlkZSBwb3B1bGF0ZUZvcm1EYXRhIHRvIGhhbmRsZSBTSVAtc3BlY2lmaWMgZmllbGRzXG4gICAgICogQ2FsbGVkIGZyb20gcGFyZW50J3MgcG9wdWxhdGVGb3JtKCkgaW4gYWZ0ZXJQb3B1bGF0ZSBjYWxsYmFja1xuICAgICAqIE1vc3QgZmllbGRzIGFyZSBoYW5kbGVkIGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBtZXRob2QgZmlyc3RcbiAgICAgICAgc3VwZXIucG9wdWxhdGVGb3JtRGF0YShkYXRhKTtcblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGhvc3RzIC0gcG9wdWxhdGUgYWZ0ZXIgZm9ybSBpcyByZWFkeVxuICAgICAgICBpZiAoZGF0YS5hZGRpdGlvbmFsSG9zdHMpIHtcbiAgICAgICAgICAgIHRoaXMucG9wdWxhdGVBZGRpdGlvbmFsSG9zdHMoZGF0YS5hZGRpdGlvbmFsSG9zdHMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBzdXBlci5jYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIHJlc3BvbnNlIGRhdGEgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5pZCAmJiAhJCgnI2lkJykudmFsKCkpIHtcbiAgICAgICAgICAgICAgICAkKCcjaWQnKS52YWwocmVzcG9uc2UuZGF0YS5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRoZSBGb3JtLmpzIHdpbGwgaGFuZGxlIHRoZSByZWxvYWQgYXV0b21hdGljYWxseSBpZiByZXNwb25zZS5yZWxvYWQgaXMgcHJlc2VudFxuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBSRVNUIEFQSSByZXR1cm5zIHJlbG9hZCBwYXRoIGxpa2UgXCJwcm92aWRlcnMvbW9kaWZ5c2lwL1NJUC1UUlVOSy14eHhcIlxuICAgICAgICB9XG4gICAgfVxuICAgIFxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBydWxlc01hcCA9IHtcbiAgICAgICAgICAgIG91dGJvdW5kOiAoKSA9PiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKSxcbiAgICAgICAgICAgIGluYm91bmQ6ICgpID0+IHRoaXMuZ2V0SW5ib3VuZFJ1bGVzKCksXG4gICAgICAgICAgICBub25lOiAoKSA9PiB0aGlzLmdldE5vbmVSdWxlcygpLFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcnVsZXMgPSBydWxlc01hcFtyZWdUeXBlXSA/IHJ1bGVzTWFwW3JlZ1R5cGVdKCkgOiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRDYWxsZXJJZERpZFJ1bGVzKHJ1bGVzKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIENhbGxlcklEL0RJRCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJ1bGVzIC0gRXhpc3RpbmcgcnVsZXNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBSdWxlcyB3aXRoIENhbGxlcklEL0RJRCB2YWxpZGF0aW9uXG4gICAgICovXG4gICAgYWRkQ2FsbGVySWREaWRSdWxlcyhydWxlcykge1xuICAgICAgICAvLyBDdXN0b20gaGVhZGVyIHZhbGlkYXRpb24gdXNpbmcgZ2xvYmFsIGN1c3RvbSBydWxlc1xuICAgICAgICBydWxlcy5jaWRfY3VzdG9tX2hlYWRlciA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjaWRfY3VzdG9tX2hlYWRlcicsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21IZWFkZXJbY2lkXScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVDdXN0b21IZWFkZXJFbXB0eSxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuZGlkX2N1c3RvbV9oZWFkZXIgPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGlkX2N1c3RvbV9oZWFkZXInLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tSGVhZGVyW2RpZF0nLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRW1wdHksXG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJlZ2V4IHBhdHRlcm4gdmFsaWRhdGlvbiB1c2luZyBnbG9iYWwgY3VzdG9tIHJ1bGVzXG4gICAgICAgIHJ1bGVzLmNpZF9wYXJzZXJfcmVnZXggPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY2lkX3BhcnNlcl9yZWdleCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdleFBhdHRlcm5bY2lkXScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVJbnZhbGlkUmVnZXhcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG5cbiAgICAgICAgcnVsZXMuZGlkX3BhcnNlcl9yZWdleCA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkaWRfcGFyc2VyX3JlZ2V4JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ2V4UGF0dGVybltkaWRdJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUludmFsaWRSZWdleFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQYXJzZXIgc3RhcnQvZW5kIGZpZWxkcyBkb24ndCBuZWVkIHZhbGlkYXRpb24gLSB0aGV5IGFyZSB0cnVseSBvcHRpb25hbFxuICAgICAgICAvLyBObyBydWxlcyBuZWVkZWQgZm9yIGNpZF9wYXJzZXJfc3RhcnQsIGNpZF9wYXJzZXJfZW5kLCBkaWRfcGFyc2VyX3N0YXJ0LCBkaWRfcGFyc2VyX2VuZFxuXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igb3V0Ym91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0T3V0Ym91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ15bYS16QS1aMC05Xy4tXSskJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldEluYm91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ15bYS16QS1aMC05Xy4tXSskJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG5vbmUgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9uZVJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaG9zdCBsYWJlbCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RMYWJlbChyZWdUeXBlKSB7XG4gICAgICAgIGNvbnN0ICRob3N0TGFiZWxUZXh0ID0gJCgnI2hvc3RMYWJlbFRleHQnKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICAkaG9zdExhYmVsVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAkaG9zdExhYmVsVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZvciBpbmJvdW5kLCB0aGUgZmllbGQgaXMgaGlkZGVuIHNvIG5vIG5lZWQgdG8gdXBkYXRlIGxhYmVsXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiB0aGUgcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0ge1xuICAgICAgICAgICAgaG9zdDogJCgnI2VsSG9zdCcpLFxuICAgICAgICAgICAgcG9ydDogJCgnI2VsUG9ydCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyNlbFVzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6ICQoJyNlbFNlY3JldCcpLFxuICAgICAgICAgICAgYWRkaXRpb25hbEhvc3Q6ICQoJyNlbEFkZGl0aW9uYWxIb3N0cycpLFxuICAgICAgICAgICAgbmV0d29ya0ZpbHRlcjogJCgnI2VsTmV0d29ya0ZpbHRlcicpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZHMgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6IHRoaXMuJHNlY3JldCxcbiAgICAgICAgICAgIG5ldHdvcmtGaWx0ZXJJZDogJCgnI25ldHdvcmtmaWx0ZXJpZCcpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGNvbnN0IGNvbmZpZ3MgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdhZGRpdGlvbmFsSG9zdCddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWyduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLk5PTkVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlc2V0TmV0d29ya0ZpbHRlcjogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGluYm91bmQ6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ3VzZXJuYW1lJywgJ3NlY3JldCcsICduZXR3b3JrRmlsdGVyJywgJ2FkZGl0aW9uYWxIb3N0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ2hvc3QnLCAncG9ydCddLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlYWRvbmx5VXNlcm5hbWU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXV0b0dlbmVyYXRlUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY2xlYXJWYWxpZGF0aW9uRm9yOiBbJ2hvc3QnLCAncG9ydCddXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm9uZToge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdhZGRpdGlvbmFsSG9zdCcsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbXSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRUb29sdGlwOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1ha2VPcHRpb25hbDogWydzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBjbGVhclZhbGlkYXRpb25Gb3I6IFsndXNlcm5hbWUnLCAnc2VjcmV0J11cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY29uZmlnID0gY29uZmlnc1tyZWdUeXBlXSB8fCBjb25maWdzLm91dGJvdW5kO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgdmlzaWJpbGl0eVxuICAgICAgICBjb25maWcudmlzaWJsZS5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5zaG93KCkpO1xuICAgICAgICBjb25maWcuaGlkZGVuLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LmhpZGUoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgZmllbGRcbiAgICAgICAgaWYgKGNvbmZpZy5yZWFkb25seVVzZXJuYW1lKSB7XG4gICAgICAgICAgICAvLyBGb3IgaW5ib3VuZCByZWdpc3RyYXRpb24sIHVzZXJuYW1lIHNob3VsZCBtYXRjaCBwcm92aWRlciBJRFxuICAgICAgICAgICAgLy8gQmFja2VuZCBhbHdheXMgcmV0dXJucyBJRCAodGVtcG9yYXJ5IGZvciBuZXcgcHJvdmlkZXJzIGxpa2UgU0lQLU5FVy1YWFhYWFhYWClcbiAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwocHJvdmlkZXJJZCkuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBSZXNldCB1c2VybmFtZSBpZiBpdCBtYXRjaGVzIHByb3ZpZGVyIElEIHdoZW4gbm90IGluYm91bmRcbiAgICAgICAgICAgIGlmIChmaWVsZHMudXNlcm5hbWUudmFsKCkgPT09IHByb3ZpZGVySWQgJiYgcmVnVHlwZSAhPT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnZhbCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaWVsZHMudXNlcm5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCBpZiBlbXB0eVxuICAgICAgICBpZiAoY29uZmlnLmF1dG9HZW5lcmF0ZVBhc3N3b3JkICYmIGZpZWxkcy5zZWNyZXQudmFsKCkudHJpbSgpID09PSAnJyAmJiB0aGlzLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0LmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bj8udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVzZXQgbmV0d29yayBmaWx0ZXIgZm9yIG91dGJvdW5kXG4gICAgICAgIGlmIChjb25maWcucmVzZXROZXR3b3JrRmlsdGVyKSB7XG4gICAgICAgICAgICBmaWVsZHMubmV0d29ya0ZpbHRlcklkLnZhbCgnbm9uZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgd2lkZ2V0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMucGFzc3dvcmRXaWRnZXQgJiYgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC51cGRhdGVDb25maWcodGhpcy5wYXNzd29yZFdpZGdldCwgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIHRvb2x0aXBcbiAgICAgICAgaWYgKGNvbmZpZy5zaG93UGFzc3dvcmRUb29sdGlwKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkVG9vbHRpcCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNYWtlIGZpZWxkcyBvcHRpb25hbFxuICAgICAgICBjb25maWcubWFrZU9wdGlvbmFsPy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgICQoYCNlbCR7ZmllbGQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBmaWVsZC5zbGljZSgxKX1gKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9ycyBmb3Igc3BlY2lmaWVkIGZpZWxkc1xuICAgICAgICBjb25maWcuY2xlYXJWYWxpZGF0aW9uRm9yPy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsIGZpZWxkKTtcbiAgICAgICAgICAgICQoYCMke2ZpZWxkfWApLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBob3N0IGxhYmVsXG4gICAgICAgIHRoaXMudXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpOyBcblxuICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uICdkaXNhYmxlZnJvbXVzZXInIGNoZWNrYm94XG4gICAgICAgIC8vIFVzZSB0aGUgb3V0ZXIgZGl2LmNoZWNrYm94IGNvbnRhaW5lciBpbnN0ZWFkIG9mIGlucHV0IGVsZW1lbnRcbiAgICAgICAgY29uc3QgZWwgPSAkKCdpbnB1dFtuYW1lPVwiZGlzYWJsZWZyb211c2VyXCJdJykuY2xvc2VzdCgnLnVpLmNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0IGZyb21Vc2VyID0gJCgnI2RpdkZyb21Vc2VyJyk7XG4gICAgICAgIGlmIChlbC5sZW5ndGggPiAwICYmIGVsLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGZyb21Vc2VyLmhpZGUoKTtcbiAgICAgICAgICAgIGZyb21Vc2VyLnJlbW92ZUNsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tVXNlci5zaG93KCk7XG4gICAgICAgICAgICBmcm9tVXNlci5hZGRDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIENhbGxlcklEIGN1c3RvbSBzZXR0aW5ncyB2aXNpYmlsaXR5IGJhc2VkIG9uIGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgICAgY29uc3QgY2lkRHJvcGRvd24gPSAkKCcjY2lkX3NvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoY2lkRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgY2lkVmFsdWUgPSBjaWREcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBjaWRDdXN0b21TZXR0aW5ncyA9ICQoJyNjYWxsZXJpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgICAgIGlmIChjaWRWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBjaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdzaG93Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGNpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIERJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGRpZERyb3Bkb3duID0gJCgnI2RpZF9zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKGRpZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZFZhbHVlID0gZGlkRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgZGlkQ3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICAgICAgaWYgKGRpZFZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGRpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ3Nob3cnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgZGlkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjb21wbGV0aW9uIG9mIGhvc3QgYWRkcmVzcyBpbnB1dFxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FkZGl0aW9uYWwtaG9zdCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsdWUubWF0Y2godGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGlucHV0IHZhbHVlXG4gICAgICAgICAgICBpZiAodmFsaWRhdGlvbiA9PT0gbnVsbCB8fCB2YWxpZGF0aW9uLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBob3N0IGFkZHJlc3MgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIGlmICgkKGAuaG9zdC1yb3dbZGF0YS12YWx1ZT1cXFwiJHt2YWx1ZX1cXFwiXWApLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBob3N0cyB0YWJsZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RzVGFibGVWaWV3KCkge1xuICAgICAgICBjb25zdCAkaG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgIGlmICgkaG9zdFJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHthcnJheX0gYWRkaXRpb25hbEhvc3RzIC0gQXJyYXkgb2YgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGFkZGl0aW9uYWxIb3N0cykge1xuICAgICAgICBpZiAoIWFkZGl0aW9uYWxIb3N0cyB8fCAhQXJyYXkuaXNBcnJheShhZGRpdGlvbmFsSG9zdHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGhvc3RzIGZpcnN0IChleGNlcHQgdGVtcGxhdGUgYW5kIGR1bW15KVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZS5maW5kKGB0Ym9keSB0ciR7UHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPV31gKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIGhvc3QgdXNpbmcgdGhlIHNhbWUgbG9naWMgYXMgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3NcbiAgICAgICAgYWRkaXRpb25hbEhvc3RzLmZvckVhY2goKGhvc3RPYmopID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIG9iamVjdCBmb3JtYXQge2lkLCBhZGRyZXNzfSBhbmQgc3RyaW5nIGZvcm1hdFxuICAgICAgICAgICAgY29uc3QgaG9zdEFkZHJlc3MgPSB0eXBlb2YgaG9zdE9iaiA9PT0gJ3N0cmluZycgPyBob3N0T2JqIDogaG9zdE9iai5hZGRyZXNzO1xuICAgICAgICAgICAgaWYgKGhvc3RBZGRyZXNzICYmIGhvc3RBZGRyZXNzLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgc2FtZSBsb2dpYyBhcyBjYk9uQ29tcGxldGVIb3N0QWRkcmVzc1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbnNlcnQgdGhlIGNsb25lZCByb3dcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHByb3ZpZGVyIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IFByb3ZpZGVyU0lQKCk7XG4gICAgcHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xufSk7Il19