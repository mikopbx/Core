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
      }); // Initialize SIP-specific dropdowns

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
      $('#provider-tabs-menu .item').tab({
        onVisible: function onVisible(tabPath) {
          if (tabPath === 'diagnostics' && typeof providerModifyStatusWorker !== 'undefined') {
            // Initialize diagnostics tab when it becomes visible
            providerModifyStatusWorker.initializeDiagnosticsTab();
          }
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
     * Initialize DTMF mode dropdown for SIP providers
     */

  }, {
    key: "initializeDtmfModeDropdown",
    value: function initializeDtmfModeDropdown() {
      var _options$find;

      var $field = $('#dtmfmode');
      if ($field.length === 0) return; // Check if already inside a dropdown structure

      var $existingDropdown = $field.closest('.ui.dropdown');

      if ($existingDropdown.length > 0) {
        // Already a dropdown, just ensure it's initialized
        if (!$existingDropdown.hasClass('dtmf-mode-dropdown')) {
          $existingDropdown.addClass('dtmf-mode-dropdown');
        }

        $existingDropdown.dropdown({
          onChange: function onChange() {
            return Form.dataChanged();
          }
        });
        return;
      }

      var currentValue = $field.val() || ProviderBase.DEFAULTS.DTMF_MODE;
      var options = [{
        value: 'auto',
        text: globalTranslate.auto || 'auto'
      }, {
        value: 'rfc4733',
        text: globalTranslate.rfc4733 || 'rfc4733'
      }, {
        value: 'info',
        text: globalTranslate.info || 'info'
      }, {
        value: 'inband',
        text: globalTranslate.inband || 'inband'
      }, {
        value: 'auto_info',
        text: globalTranslate.auto_info || 'auto_info'
      }];
      var dropdownHtml = "\n            <div class=\"ui selection dropdown dtmf-mode-dropdown\">\n                <input type=\"hidden\" name=\"dtmfmode\" id=\"dtmfmode\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(((_options$find = options.find(function (o) {
        return o.value === currentValue;
      })) === null || _options$find === void 0 ? void 0 : _options$find.text) || currentValue, "</div>\n                <div class=\"menu\">\n                    ").concat(options.map(function (opt) {
        return "<div class=\"item\" data-value=\"".concat(opt.value, "\">").concat(opt.text, "</div>");
      }).join(''), "\n                </div>\n            </div>\n        ");
      $field.replaceWith(dropdownHtml);
      $('.dtmf-mode-dropdown').dropdown({
        onChange: function onChange() {
          return Form.dataChanged();
        }
      });
    }
    /**
     * Initialize transport protocol dropdown for SIP providers
     */

  }, {
    key: "initializeTransportDropdown",
    value: function initializeTransportDropdown() {
      var $field = $('#transport');
      if ($field.length === 0) return; // Check if already inside a dropdown structure

      var $existingDropdown = $field.closest('.ui.dropdown');

      if ($existingDropdown.length > 0) {
        // Already a dropdown, just ensure it's initialized
        if (!$existingDropdown.hasClass('transport-dropdown')) {
          $existingDropdown.addClass('transport-dropdown');
        }

        $existingDropdown.dropdown({
          onChange: function onChange() {
            return Form.dataChanged();
          }
        });
        return;
      }

      var currentValue = $field.val() || ProviderBase.DEFAULTS.TRANSPORT;
      var options = [{
        value: 'UDP',
        text: 'UDP'
      }, {
        value: 'TCP',
        text: 'TCP'
      }, {
        value: 'TLS',
        text: 'TLS'
      }];
      var dropdownHtml = "\n            <div class=\"ui selection dropdown transport-dropdown\">\n                <input type=\"hidden\" name=\"transport\" id=\"transport\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(currentValue, "</div>\n                <div class=\"menu\">\n                    ").concat(options.map(function (opt) {
        return "<div class=\"item\" data-value=\"".concat(opt.value, "\">").concat(opt.text, "</div>");
      }).join(''), "\n                </div>\n            </div>\n        ");
      $field.replaceWith(dropdownHtml);
      $('.transport-dropdown').dropdown({
        onChange: function onChange() {
          return Form.dataChanged();
        }
      });
    }
    /**
     * Initialize CallerID source dropdown
     */

  }, {
    key: "initializeCallerIdSourceDropdown",
    value: function initializeCallerIdSourceDropdown() {
      var _this3 = this,
          _options$find2;

      var $field = $('#cid_source');
      if ($field.length === 0) return; // Check if already inside a dropdown structure

      var $existingDropdown = $field.closest('.ui.dropdown');

      if ($existingDropdown.length > 0) {
        // Already a dropdown, just ensure it's initialized
        if (!$existingDropdown.hasClass('callerid-source-dropdown')) {
          $existingDropdown.addClass('callerid-source-dropdown');
        }

        $existingDropdown.dropdown({
          onChange: function onChange(value) {
            _this3.onCallerIdSourceChange(value);

            Form.dataChanged();
          }
        });
        return;
      }

      var currentValue = $field.val() || 'default';
      var options = [{
        value: 'default',
        text: globalTranslate.pr_CallerIdSourceDefault || 'Default'
      }, {
        value: 'from',
        text: globalTranslate.pr_CallerIdSourceFrom || 'FROM header'
      }, {
        value: 'rpid',
        text: globalTranslate.pr_CallerIdSourceRpid || 'Remote-Party-ID'
      }, {
        value: 'pai',
        text: globalTranslate.pr_CallerIdSourcePai || 'P-Asserted-Identity'
      }, {
        value: 'custom',
        text: globalTranslate.pr_CallerIdSourceCustom || 'Custom header'
      }];
      var dropdownHtml = "\n            <div class=\"ui selection dropdown callerid-source-dropdown\">\n                <input type=\"hidden\" name=\"cid_source\" id=\"cid_source\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(((_options$find2 = options.find(function (o) {
        return o.value === currentValue;
      })) === null || _options$find2 === void 0 ? void 0 : _options$find2.text) || currentValue, "</div>\n                <div class=\"menu\">\n                    ").concat(options.map(function (opt) {
        return "\n                        <div class=\"item\" data-value=\"".concat(opt.value, "\">\n                            <span>").concat(opt.text, "</span>\n                            ").concat(opt.value === 'custom' ? '<i class="settings icon right floated"></i>' : '', "\n                        </div>\n                    ");
      }).join(''), "\n                </div>\n            </div>\n        ");
      $field.replaceWith(dropdownHtml);
      $('.callerid-source-dropdown').dropdown({
        onChange: function onChange(value) {
          _this3.onCallerIdSourceChange(value);

          Form.dataChanged();
        }
      });
    }
    /**
     * Initialize DID source dropdown
     */

  }, {
    key: "initializeDidSourceDropdown",
    value: function initializeDidSourceDropdown() {
      var _this4 = this,
          _options$find3;

      var $field = $('#did_source');
      if ($field.length === 0) return; // Check if already inside a dropdown structure

      var $existingDropdown = $field.closest('.ui.dropdown');

      if ($existingDropdown.length > 0) {
        // Already a dropdown, just ensure it's initialized
        if (!$existingDropdown.hasClass('did-source-dropdown')) {
          $existingDropdown.addClass('did-source-dropdown');
        }

        $existingDropdown.dropdown({
          onChange: function onChange(value) {
            _this4.onDidSourceChange(value);

            Form.dataChanged();
          }
        });
        return;
      }

      var currentValue = $field.val() || 'default';
      var options = [{
        value: 'default',
        text: globalTranslate.pr_DidSourceDefault || 'Default'
      }, {
        value: 'to',
        text: globalTranslate.pr_DidSourceTo || 'TO header'
      }, {
        value: 'diversion',
        text: globalTranslate.pr_DidSourceDiversion || 'Diversion header'
      }, {
        value: 'custom',
        text: globalTranslate.pr_DidSourceCustom || 'Custom header'
      }];
      var dropdownHtml = "\n            <div class=\"ui selection dropdown did-source-dropdown\">\n                <input type=\"hidden\" name=\"did_source\" id=\"did_source\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(((_options$find3 = options.find(function (o) {
        return o.value === currentValue;
      })) === null || _options$find3 === void 0 ? void 0 : _options$find3.text) || currentValue, "</div>\n                <div class=\"menu\">\n                    ").concat(options.map(function (opt) {
        return "\n                        <div class=\"item\" data-value=\"".concat(opt.value, "\">\n                            <span>").concat(opt.text, "</span>\n                            ").concat(opt.value === 'custom' ? '<i class="settings icon right floated"></i>' : '', "\n                        </div>\n                    ");
      }).join(''), "\n                </div>\n            </div>\n        ");
      $field.replaceWith(dropdownHtml);
      $('.did-source-dropdown').dropdown({
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

      Form.convertCheckboxesToBool = true;
      Form.initialize();
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
        // SIP-specific fields
        $('#dtmfmode').val(data.dtmfmode || ProviderBase.DEFAULTS.DTMF_MODE);
        $('#transport').val(data.transport || ProviderBase.DEFAULTS.TRANSPORT);
        $('#fromuser').val(data.fromuser || '');
        $('#fromdomain').val(data.fromdomain || '');
        $('#outbound_proxy').val(data.outbound_proxy || ''); // SIP-specific checkboxes

        if (data.disablefromuser === '1' || data.disablefromuser === true) $('#disablefromuser').prop('checked', true); // Qualify frequency

        $('#qualifyfreq').val(data.qualifyfreq || ProviderBase.DEFAULTS.QUALIFY_FREQ); // CallerID/DID fields

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
        } // Update dropdown values after setting hidden inputs


        var dropdownUpdates = [{
          selector: '.dtmf-mode-dropdown',
          value: data.dtmfmode || ProviderBase.DEFAULTS.DTMF_MODE
        }, {
          selector: '.transport-dropdown',
          value: data.transport || ProviderBase.DEFAULTS.TRANSPORT
        }, {
          selector: '.registration-type-dropdown',
          value: data.registration_type || ProviderBase.DEFAULTS.REGISTRATION_TYPE
        }, {
          selector: '.callerid-source-dropdown',
          value: data.cid_source || 'default'
        }, {
          selector: '.did-source-dropdown',
          value: data.did_source || 'default'
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
      // Get element references
      var elHost = $('#elHost');
      var elUsername = $('#elUsername');
      var elSecret = $('#elSecret');
      var elPort = $('#elPort');
      var elAdditionalHost = $('#elAdditionalHosts');
      var elNetworkFilter = $('#elNetworkFilter');
      var regType = $('#registration_type').val();
      var genPassword = $('#generate-new-password');
      var valUserName = $('#username');
      var valSecret = this.$secret;
      var providerId = $('#id').val(); // Reset username only when switching from inbound to other types

      if (valUserName.val() === providerId && regType !== 'inbound') {
        valUserName.val('');
      }

      valUserName.removeAttr('readonly'); // Hide password tooltip by default

      this.hidePasswordTooltip(); // Update host label based on registration type

      this.updateHostLabel(regType); // Update element visibility based on registration type

      if (regType === 'outbound') {
        elHost.show();
        elUsername.show();
        elSecret.show();
        elPort.show();
        elAdditionalHost.show(); // Show for all registration types

        elNetworkFilter.hide(); // Network filter not relevant for outbound

        $('#networkfilterid').val('none'); // Reset to default

        genPassword.hide(); // Hide password management buttons for outbound registration

        $('#elSecret .button.clipboard').hide(); // Hide copy button

        $('#show-hide-password').hide(); // Hide show/hide button
        // Hide password strength indicator for outbound

        this.hidePasswordStrengthIndicator();
      } else if (regType === 'inbound') {
        valUserName.val(providerId);
        valUserName.attr('readonly', ''); // Auto-generate password for inbound registration if empty

        if (valSecret.val().trim() === '') {
          this.generatePassword();
        }

        elHost.hide();
        elUsername.show();
        elSecret.show();
        elPort.hide(); // Port not needed for inbound registration

        elNetworkFilter.show(); // Network filter critical for inbound security

        genPassword.show();
        elAdditionalHost.show(); // Show for all registration types
        // Show password management buttons for inbound registration

        $('#elSecret .button.clipboard').show(); // Show copy button

        $('#show-hide-password').show(); // Show show/hide button
        // Show password strength indicator for inbound

        this.showPasswordStrengthIndicator(); // Remove validation errors for hidden fields

        this.$formObj.form('remove prompt', 'host');
        $('#host').closest('.field').removeClass('error');
        this.$formObj.form('remove prompt', 'port');
        $('#port').closest('.field').removeClass('error');
      } else if (regType === 'none') {
        elHost.show();
        elUsername.show();
        elSecret.show();
        elPort.show();
        elAdditionalHost.show(); // Show for all registration types

        elNetworkFilter.show(); // Network filter critical for none type (no auth)

        genPassword.hide(); // Show password management buttons for none registration

        $('#elSecret .button.clipboard').show(); // Show copy button

        $('#show-hide-password').show(); // Show show/hide button
        // Show tooltip icon for password field

        this.showPasswordTooltip(); // Show password strength indicator for none type

        this.showPasswordStrengthIndicator(); // Update field requirements - make password optional in none mode

        $('#elSecret').removeClass('required'); // Remove validation prompts for optional fields in none mode

        this.$formObj.form('remove prompt', 'username');
        this.$formObj.form('remove prompt', 'secret');
      } // Update element visibility based on 'disablefromuser' checkbox
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


      var cidDropdown = $('.callerid-source-dropdown');

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


      var didDropdown = $('.did-source-dropdown');

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
     * Show password strength indicator and trigger initial check
     */

  }, {
    key: "showPasswordStrengthIndicator",
    value: function showPasswordStrengthIndicator() {
      var $passwordProgress = $('#password-strength-progress');

      if ($passwordProgress.length > 0) {
        // Initialize progress component if not already done
        if (!$passwordProgress.hasClass('progress')) {
          $passwordProgress.progress({
            percent: 0,
            showActivity: false
          });
        }

        $passwordProgress.show(); // Trigger password strength check if password exists

        if (this.$secret.val() && typeof PasswordScore !== 'undefined') {
          PasswordScore.checkPassStrength({
            pass: this.$secret.val(),
            bar: $passwordProgress,
            section: $passwordProgress
          });
        }
      }
    }
    /**
     * Hide password strength indicator
     */

  }, {
    key: "hidePasswordStrengthIndicator",
    value: function hidePasswordStrengthIndicator() {
      var $passwordProgress = $('#password-strength-progress');

      if ($passwordProgress.length > 0) {
        $passwordProgress.hide();
      }
    }
    /**
     * Populate additional hosts from API data
     * @param {array} additionalHosts - Array of additional hosts from API
     */

  }, {
    key: "populateAdditionalHosts",
    value: function populateAdditionalHosts(additionalHosts) {
      var _this6 = this;

      if (!additionalHosts || !Array.isArray(additionalHosts)) {
        return;
      } // Clear existing hosts first (except template and dummy)


      this.$additionalHostsTable.find("tbody tr".concat(ProviderSIP.SIP_SELECTORS.HOST_ROW)).remove(); // Add each host using the same logic as cbOnCompleteHostAddress

      additionalHosts.forEach(function (hostObj) {
        // Handle both object format {id, address} and string format
        var hostAddress = typeof hostObj === 'string' ? hostObj : hostObj.address;

        if (hostAddress && hostAddress.trim()) {
          // Use the same logic as cbOnCompleteHostAddress
          var $tr = _this6.$additionalHostsTemplate.last();

          var $clone = $tr.clone(false); // Use false since events are delegated

          $clone.removeClass('host-row-tpl').addClass('host-row').show();
          $clone.attr('data-value', hostAddress);
          $clone.find('.address').html(hostAddress); // Insert the cloned row

          var $existingHostRows = _this6.$formObj.find(ProviderSIP.SIP_SELECTORS.HOST_ROW);

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

_defineProperty(ProviderSIP, "SIP_SELECTORS", {
  ADDITIONAL_HOSTS_TABLE: '#additional-hosts-table',
  ADDITIONAL_HOSTS_DUMMY: '#additional-hosts-table .dummy',
  ADDITIONAL_HOSTS_TEMPLATE: '#additional-hosts-table .host-row-tpl',
  ADDITIONAL_HOST_INPUT: '#additional-host input',
  DELETE_ROW_BUTTON: '.delete-row-button',
  HOST_ROW: '.host-row'
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNJUCIsIiRxdWFsaWZ5VG9nZ2xlIiwiJCIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duIiwiaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duIiwicGFyZW50IiwiUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVGFicyIsImluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJzZWxmIiwia2V5cHJlc3MiLCJlIiwid2hpY2giLCJjYk9uQ29tcGxldGVIb3N0QWRkcmVzcyIsIkRFTEVURV9ST1dfQlVUVE9OIiwicHJldmVudERlZmF1bHQiLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwiJGZpZWxkIiwibGVuZ3RoIiwiJGV4aXN0aW5nRHJvcGRvd24iLCJoYXNDbGFzcyIsImRyb3Bkb3duIiwiY3VycmVudFZhbHVlIiwidmFsIiwiUHJvdmlkZXJCYXNlIiwiREVGQVVMVFMiLCJEVE1GX01PREUiLCJvcHRpb25zIiwidmFsdWUiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiYXV0byIsInJmYzQ3MzMiLCJpbmZvIiwiaW5iYW5kIiwiYXV0b19pbmZvIiwiZHJvcGRvd25IdG1sIiwiZmluZCIsIm8iLCJtYXAiLCJvcHQiLCJqb2luIiwicmVwbGFjZVdpdGgiLCJUUkFOU1BPUlQiLCJvbkNhbGxlcklkU291cmNlQ2hhbmdlIiwicHJfQ2FsbGVySWRTb3VyY2VEZWZhdWx0IiwicHJfQ2FsbGVySWRTb3VyY2VGcm9tIiwicHJfQ2FsbGVySWRTb3VyY2VScGlkIiwicHJfQ2FsbGVySWRTb3VyY2VQYWkiLCJwcl9DYWxsZXJJZFNvdXJjZUN1c3RvbSIsIm9uRGlkU291cmNlQ2hhbmdlIiwicHJfRGlkU291cmNlRGVmYXVsdCIsInByX0RpZFNvdXJjZVRvIiwicHJfRGlkU291cmNlRGl2ZXJzaW9uIiwicHJfRGlkU291cmNlQ3VzdG9tIiwiJGN1c3RvbVNldHRpbmdzIiwidHJhbnNpdGlvbiIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwiJGZvcm1PYmoiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIlByb3ZpZGVyc0FQSSIsInNhdmVNZXRob2QiLCJodHRwTWV0aG9kIiwiaXNOZXdQcm92aWRlciIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsInR5cGUiLCJwcm92aWRlclR5cGUiLCJhZGRpdGlvbmFsSG9zdHMiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiaG9zdCIsInRyaW0iLCJwdXNoIiwiYWRkcmVzcyIsImR0bWZtb2RlIiwidHJhbnNwb3J0IiwiZnJvbXVzZXIiLCJmcm9tZG9tYWluIiwib3V0Ym91bmRfcHJveHkiLCJkaXNhYmxlZnJvbXVzZXIiLCJwcm9wIiwicXVhbGlmeWZyZXEiLCJRVUFMSUZZX0ZSRVEiLCJjaWRfc291cmNlIiwiZGlkX3NvdXJjZSIsImNpZF9jdXN0b21faGVhZGVyIiwiY2lkX3BhcnNlcl9zdGFydCIsImNpZF9wYXJzZXJfZW5kIiwiY2lkX3BhcnNlcl9yZWdleCIsImRpZF9jdXN0b21faGVhZGVyIiwiZGlkX3BhcnNlcl9zdGFydCIsImRpZF9wYXJzZXJfZW5kIiwiZGlkX3BhcnNlcl9yZWdleCIsImNpZF9kaWRfZGVidWciLCJkcm9wZG93blVwZGF0ZXMiLCJzZWxlY3RvciIsInJlZ2lzdHJhdGlvbl90eXBlIiwiUkVHSVNUUkFUSU9OX1RZUEUiLCJmb3JFYWNoIiwiJGRyb3Bkb3duIiwicG9wdWxhdGVBZGRpdGlvbmFsSG9zdHMiLCJyZXNwb25zZSIsImlkIiwicmVnVHlwZSIsInJ1bGVzTWFwIiwib3V0Ym91bmQiLCJnZXRPdXRib3VuZFJ1bGVzIiwiaW5ib3VuZCIsImdldEluYm91bmRSdWxlcyIsIm5vbmUiLCJnZXROb25lUnVsZXMiLCJydWxlcyIsImFkZENhbGxlcklkRGlkUnVsZXMiLCJjYWxsZXJJZFNvdXJjZSIsImRpZFNvdXJjZSIsImN1c3RvbUhlYWRlclJ1bGVzIiwicHJvbXB0IiwicHJfVmFsaWRhdGVDdXN0b21IZWFkZXJFbXB0eSIsInByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRm9ybWF0IiwiaWRlbnRpZmllciIsInJlZ2V4VmFsaWRhdGlvblJ1bGUiLCJvcHRpb25hbCIsImNhbGxiYWNrIiwiUmVnRXhwIiwicHJfVmFsaWRhdGVJbnZhbGlkUmVnZXgiLCJkZXNjcmlwdGlvbiIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInNlY3JldCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwiYWRkaXRpb25hbF9ob3N0cyIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJwcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCIkaG9zdExhYmVsVGV4dCIsInByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwiZWxIb3N0IiwiZWxVc2VybmFtZSIsImVsU2VjcmV0IiwiZWxQb3J0IiwiZWxBZGRpdGlvbmFsSG9zdCIsImVsTmV0d29ya0ZpbHRlciIsImdlblBhc3N3b3JkIiwidmFsVXNlck5hbWUiLCJ2YWxTZWNyZXQiLCIkc2VjcmV0IiwicHJvdmlkZXJJZCIsInJlbW92ZUF0dHIiLCJoaWRlUGFzc3dvcmRUb29sdGlwIiwidXBkYXRlSG9zdExhYmVsIiwic2hvdyIsImhpZGUiLCJoaWRlUGFzc3dvcmRTdHJlbmd0aEluZGljYXRvciIsImF0dHIiLCJnZW5lcmF0ZVBhc3N3b3JkIiwic2hvd1Bhc3N3b3JkU3RyZW5ndGhJbmRpY2F0b3IiLCJmb3JtIiwic2hvd1Bhc3N3b3JkVG9vbHRpcCIsImVsIiwiZnJvbVVzZXIiLCJjaWREcm9wZG93biIsImNpZFZhbHVlIiwiY2lkQ3VzdG9tU2V0dGluZ3MiLCJkaWREcm9wZG93biIsImRpZFZhbHVlIiwiZGlkQ3VzdG9tU2V0dGluZ3MiLCJ2YWxpZGF0aW9uIiwibWF0Y2giLCIkdHIiLCJsYXN0IiwiJGNsb25lIiwiY2xvbmUiLCJodG1sIiwiJGV4aXN0aW5nSG9zdFJvd3MiLCJIT1NUX1JPVyIsImFmdGVyIiwiJGhvc3RSb3dzIiwiJHBhc3N3b3JkUHJvZ3Jlc3MiLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJzaG93QWN0aXZpdHkiLCJQYXNzd29yZFNjb3JlIiwiY2hlY2tQYXNzU3RyZW5ndGgiLCJwYXNzIiwiYmFyIiwic2VjdGlvbiIsIkFycmF5IiwiaXNBcnJheSIsImhvc3RPYmoiLCJob3N0QWRkcmVzcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsVzs7Ozs7QUFDRjtBQVVBLHlCQUFjO0FBQUE7O0FBQUE7O0FBQ1YsOEJBQU0sS0FBTjtBQUNBLFVBQUtDLGNBQUwsR0FBc0JDLENBQUMsQ0FBQyxVQUFELENBQXZCO0FBQ0EsVUFBS0Msa0JBQUwsR0FBMEJELENBQUMsQ0FBQyxlQUFELENBQTNCLENBSFUsQ0FLVjs7QUFDQSxVQUFLRSxxQkFBTCxHQUE2QkYsQ0FBQyxDQUFDRixXQUFXLENBQUNLLGFBQVosQ0FBMEJDLHNCQUEzQixDQUE5QjtBQUNBLFVBQUtDLHdCQUFMLEdBQWdDTCxDQUFDLENBQUNGLFdBQVcsQ0FBQ0ssYUFBWixDQUEwQkcseUJBQTNCLENBQWpDO0FBQ0EsVUFBS0MscUJBQUwsR0FBNkJQLENBQUMsQ0FBQ0YsV0FBVyxDQUFDSyxhQUFaLENBQTBCSyxzQkFBM0IsQ0FBOUI7QUFDQSxVQUFLQyxvQkFBTCxHQUE0QlQsQ0FBQyxDQUFDRixXQUFXLENBQUNLLGFBQVosQ0FBMEJPLHFCQUEzQixDQUE3QjtBQVRVO0FBVWI7QUFFRDtBQUNKO0FBQ0E7Ozs7O1dBQ0ksc0JBQWE7QUFBQTs7QUFDVCxrRkFEUyxDQUdUOzs7QUFDQSxXQUFLWCxjQUFMLENBQW9CWSxRQUFwQixDQUE2QjtBQUN6QkMsUUFB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SixDQUFVLEtBQVYsQ0FBZixDQUhtQyxDQUdGOztBQUNqQ0QsVUFBQUEsTUFBTSxDQUNENU0sV0FETCxDQUNpQixjQURqQixFQUVLQyxRQUZMLENBRWMsVUFGZCxFQUdLdUwsSUFITDtBQUlBb0IsVUFBQUEsTUFBTSxDQUFDakIsSUFBUCxDQUFZLFlBQVosRUFBMEJvQyxXQUExQjtBQUNBbkIsVUFBQUEsTUFBTSxDQUFDekosSUFBUCxDQUFZLFVBQVosRUFBd0IySixJQUF4QixDQUE2QmlCLFdBQTdCLEVBVG1DLENBV25DOztBQUNBLGNBQU1oQixpQkFBaUIsR0FBRyxNQUFJLENBQUN0SSxRQUFMLENBQWN0QixJQUFkLENBQW1CbEUsV0FBVyxDQUFDSyxhQUFaLENBQTBCME4sUUFBN0MsQ0FBMUI7O0FBQ0EsY0FBSUQsaUJBQWlCLENBQUNKLElBQWxCLEdBQXlCM0ssTUFBekIsS0FBb0MsQ0FBeEMsRUFBMkM7QUFDdkMwSyxZQUFBQSxHQUFHLENBQUNPLEtBQUosQ0FBVUwsTUFBVjtBQUNILFdBRkQsTUFFTztBQUNIRyxZQUFBQSxpQkFBaUIsQ0FBQ0osSUFBbEIsR0FBeUJNLEtBQXpCLENBQStCTCxNQUEvQjtBQUNIO0FBQ0o7QUFDSixPQXRCRCxFQVRxQyxDQWlDckM7O0FBQ0EsV0FBSzdMLG9CQUFMO0FBQ0g7Ozs7RUExZ0NxQnVCLFk7O2dCQUFwQnJELFcsbUJBRXFCO0FBQ25CVSxFQUFBQSxzQkFBc0IsRUFBRSx5QkFETDtBQUVuQkosRUFBQUEsc0JBQXNCLEVBQUUsZ0NBRkw7QUFHbkJFLEVBQUFBLHlCQUF5QixFQUFFLHVDQUhSO0FBSW5CSSxFQUFBQSxxQkFBcUIsRUFBRSx3QkFKSjtBQUtuQjZCLEVBQUFBLGlCQUFpQixFQUFFLG9CQUxBO0FBTW5Cc0wsRUFBQUEsUUFBUSxFQUFFO0FBTlMsQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFByb3ZpZGVyQmFzZSwgUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciwgUHJvdmlkZXJUb29sdGlwTWFuYWdlciwgaTE4biAqL1xuXG4vKipcbiAqIFNJUCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlclNJUFxuICovXG5jbGFzcyBQcm92aWRlclNJUCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7ICBcbiAgICAvLyBTSVAtc3BlY2lmaWMgc2VsZWN0b3JzXG4gICAgc3RhdGljIFNJUF9TRUxFQ1RPUlMgPSB7XG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfVEFCTEU6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZScsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVFNfRFVNTVk6ICcjYWRkaXRpb25hbC1ob3N0cy10YWJsZSAuZHVtbXknLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RTX1RFTVBMQVRFOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmhvc3Qtcm93LXRwbCcsXG4gICAgICAgIEFERElUSU9OQUxfSE9TVF9JTlBVVDogJyNhZGRpdGlvbmFsLWhvc3QgaW5wdXQnLFxuICAgICAgICBERUxFVEVfUk9XX0JVVFRPTjogJy5kZWxldGUtcm93LWJ1dHRvbicsXG4gICAgICAgIEhPU1RfUk9XOiAnLmhvc3Qtcm93J1xuICAgIH07XG4gICAgXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCdTSVAnKTtcbiAgICAgICAgdGhpcy4kcXVhbGlmeVRvZ2dsZSA9ICQoJyNxdWFsaWZ5Jyk7XG4gICAgICAgIHRoaXMuJHF1YWxpZnlGcmVxVG9nZ2xlID0gJCgnI3F1YWxpZnktZnJlcScpO1xuICAgICAgICBcbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIGpRdWVyeSBvYmplY3RzXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c0R1bW15ID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfRFVNTVkpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX1RFTVBMQVRFKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGFibGUgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19UQUJMRSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUX0lOUFVUKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpOyBcbiAgICAgICAgXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuJHF1YWxpZnlUb2dnbGUuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAkKCdpbnB1dFtuYW1lPVwiZGlzYWJsZWZyb211c2VyXCJdJykub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTSVAtc3BlY2lmaWMgZHJvcGRvd25zXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUR0bWZNb2RlRHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVHJhbnNwb3J0RHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQ2FsbGVySWRTb3VyY2VEcm9wZG93bigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEaWRTb3VyY2VEcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJ1ZyBjaGVja2JveCAtIHVzaW5nIHBhcmVudCBjb250YWluZXIgd2l0aCBjbGFzcyBzZWxlY3RvclxuICAgICAgICAkKCcjY2lkX2RpZF9kZWJ1ZycpLnBhcmVudCgnLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAgICBQcm92aWRlclNpcFRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUYWJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFNJUC1zcGVjaWZpYyBjb21wb25lbnRzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVNpcEV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRhYiBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRhYnMoKSB7XG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiAodGFiUGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHR5cGVvZiBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkaWFnbm9zdGljcyB0YWIgd2hlbiBpdCBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIuaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBTSVAtc3BlY2lmaWMgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU2lwRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbmV3IHN0cmluZyB0byBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRhYmxlXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQua2V5cHJlc3MoKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLndoaWNoID09PSAxMykge1xuICAgICAgICAgICAgICAgIHNlbGYuY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGhvc3QgZnJvbSBhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC0gdXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGR5bmFtaWMgZWxlbWVudHNcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGFibGUub24oJ2NsaWNrJywgUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5ERUxFVEVfUk9XX0JVVFRPTiwgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERUTUYgbW9kZSBkcm9wZG93biBmb3IgU0lQIHByb3ZpZGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKCcjZHRtZm1vZGUnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5zaWRlIGEgZHJvcGRvd24gc3RydWN0dXJlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBhIGRyb3Bkb3duLCBqdXN0IGVuc3VyZSBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISRleGlzdGluZ0Ryb3Bkb3duLmhhc0NsYXNzKCdkdG1mLW1vZGUtZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmFkZENsYXNzKCdkdG1mLW1vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5EVE1GX01PREU7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJ2F1dG8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuYXV0byB8fCAnYXV0bycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdyZmM0NzMzJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnJmYzQ3MzMgfHwgJ3JmYzQ3MzMnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnaW5mbycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pbmZvIHx8ICdpbmZvJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2luYmFuZCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pbmJhbmQgfHwgJ2luYmFuZCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdhdXRvX2luZm8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuYXV0b19pbmZvIHx8ICdhdXRvX2luZm8nIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gZHRtZi1tb2RlLWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiZHRtZm1vZGVcIiBpZD1cImR0bWZtb2RlXCIgdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlZmF1bHQgdGV4dFwiPiR7b3B0aW9ucy5maW5kKG8gPT4gby52YWx1ZSA9PT0gY3VycmVudFZhbHVlKT8udGV4dCB8fCBjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtvcHRpb25zLm1hcChvcHQgPT4gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0LnZhbHVlfVwiPiR7b3B0LnRleHR9PC9kaXY+YCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRmaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgJCgnLmR0bWYtbW9kZS1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdHJhbnNwb3J0IHByb3RvY29sIGRyb3Bkb3duIGZvciBTSVAgcHJvdmlkZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKCcjdHJhbnNwb3J0Jyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygndHJhbnNwb3J0LWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygndHJhbnNwb3J0LWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuVFJBTlNQT1JUO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdVRFAnLCB0ZXh0OiAnVURQJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ1RDUCcsIHRleHQ6ICdUQ1AnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnVExTJywgdGV4dDogJ1RMUycgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZHJvcGRvd25IdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93biB0cmFuc3BvcnQtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJ0cmFuc3BvcnRcIiBpZD1cInRyYW5zcG9ydFwiIHZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke2N1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAke29wdGlvbnMubWFwKG9wdCA9PiBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+JHtvcHQudGV4dH08L2Rpdj5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAkKCcudHJhbnNwb3J0LWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBDYWxsZXJJRCBzb3VyY2UgZHJvcGRvd25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2FsbGVySWRTb3VyY2VEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI2NpZF9zb3VyY2UnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5zaWRlIGEgZHJvcGRvd24gc3RydWN0dXJlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBhIGRyb3Bkb3duLCBqdXN0IGVuc3VyZSBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISRleGlzdGluZ0Ryb3Bkb3duLmhhc0NsYXNzKCdjYWxsZXJpZC1zb3VyY2UtZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmFkZENsYXNzKCdjYWxsZXJpZC1zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25DYWxsZXJJZFNvdXJjZUNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICdkZWZhdWx0JztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnZGVmYXVsdCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZURlZmF1bHQgfHwgJ0RlZmF1bHQnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnZnJvbScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZUZyb20gfHwgJ0ZST00gaGVhZGVyJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ3JwaWQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VScGlkIHx8ICdSZW1vdGUtUGFydHktSUQnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAncGFpJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlUGFpIHx8ICdQLUFzc2VydGVkLUlkZW50aXR5JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2N1c3RvbScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZUN1c3RvbSB8fCAnQ3VzdG9tIGhlYWRlcicgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZHJvcGRvd25IdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlbGVjdGlvbiBkcm9wZG93biBjYWxsZXJpZC1zb3VyY2UtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJjaWRfc291cmNlXCIgaWQ9XCJjaWRfc291cmNlXCIgdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlZmF1bHQgdGV4dFwiPiR7b3B0aW9ucy5maW5kKG8gPT4gby52YWx1ZSA9PT0gY3VycmVudFZhbHVlKT8udGV4dCB8fCBjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtvcHRpb25zLm1hcChvcHQgPT4gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4+JHtvcHQudGV4dH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtvcHQudmFsdWUgPT09ICdjdXN0b20nID8gJzxpIGNsYXNzPVwic2V0dGluZ3MgaWNvbiByaWdodCBmbG9hdGVkXCI+PC9pPicgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICBgKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAkKCcuY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMub25DYWxsZXJJZFNvdXJjZUNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBESUQgc291cmNlIGRyb3Bkb3duXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKCcjZGlkX3NvdXJjZScpO1xuICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbnNpZGUgYSBkcm9wZG93biBzdHJ1Y3R1cmVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkZmllbGQuY2xvc2VzdCgnLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBBbHJlYWR5IGEgZHJvcGRvd24sIGp1c3QgZW5zdXJlIGl0J3MgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIGlmICghJGV4aXN0aW5nRHJvcGRvd24uaGFzQ2xhc3MoJ2RpZC1zb3VyY2UtZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmFkZENsYXNzKCdkaWQtc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRGlkU291cmNlQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkZmllbGQudmFsKCkgfHwgJ2RlZmF1bHQnO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdkZWZhdWx0JywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZURlZmF1bHQgfHwgJ0RlZmF1bHQnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAndG8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlVG8gfHwgJ1RPIGhlYWRlcicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdkaXZlcnNpb24nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlRGl2ZXJzaW9uIHx8ICdEaXZlcnNpb24gaGVhZGVyJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2N1c3RvbScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VDdXN0b20gfHwgJ0N1c3RvbSBoZWFkZXInIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gZGlkLXNvdXJjZS1kcm9wZG93blwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImRpZF9zb3VyY2VcIiBpZD1cImRpZF9zb3VyY2VcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtvcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSBjdXJyZW50VmFsdWUpPy50ZXh0IHx8IGN1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAke29wdGlvbnMubWFwKG9wdCA9PiBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdC52YWx1ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj4ke29wdC50ZXh0fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke29wdC52YWx1ZSA9PT0gJ2N1c3RvbScgPyAnPGkgY2xhc3M9XCJzZXR0aW5ncyBpY29uIHJpZ2h0IGZsb2F0ZWRcIj48L2k+JyA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIGApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAkZmllbGQucmVwbGFjZVdpdGgoZHJvcGRvd25IdG1sKTtcbiAgICAgICAgXG4gICAgICAgICQoJy5kaWQtc291cmNlLWRyb3Bkb3duJykuZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMub25EaWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBDYWxsZXJJRCBzb3VyY2UgY2hhbmdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgQ2FsbGVySUQgc291cmNlXG4gICAgICovXG4gICAgb25DYWxsZXJJZFNvdXJjZUNoYW5nZSh2YWx1ZSkge1xuICAgICAgICBjb25zdCAkY3VzdG9tU2V0dGluZ3MgPSAkKCcjY2FsbGVyaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIC8vIE1ha2UgY3VzdG9tIGhlYWRlciBmaWVsZCByZXF1aXJlZFxuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBTaG93IGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignZmFkZSBkb3duJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlcXVpcmVkIHN0YXR1c1xuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBjdXN0b20gZmllbGRzIHdoZW4gbm90IGluIHVzZVxuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3N0YXJ0JykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX2VuZCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9yZWdleCcpLnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIERJRCBzb3VyY2UgY2hhbmdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgRElEIHNvdXJjZVxuICAgICAqL1xuICAgIG9uRGlkU291cmNlQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjdXN0b21TZXR0aW5ncyA9ICQoJyNkaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIC8vIE1ha2UgY3VzdG9tIGhlYWRlciBmaWVsZCByZXF1aXJlZFxuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBTaG93IGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignZmFkZSBkb3duJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGN1c3RvbSBzZXR0aW5ncyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAkY3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHJlcXVpcmVkIHN0YXR1c1xuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICAvLyBDbGVhciBjdXN0b20gZmllbGRzIHdoZW4gbm90IGluIHVzZVxuICAgICAgICAgICAgJCgnI2RpZF9jdXN0b21faGVhZGVyJykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3N0YXJ0JykudmFsKCcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX2VuZCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9yZWdleCcpLnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3NcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFByb3ZpZGVyc0FQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJyxcbiAgICAgICAgICAgIGh0dHBNZXRob2Q6IHRoaXMuaXNOZXdQcm92aWRlciA/ICdQT1NUJyA6ICdQVVQnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeXNpcC9gO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIC8vIElNUE9SVEFOVDogRG9uJ3Qgb3ZlcndyaXRlIHJlc3VsdC5kYXRhIC0gaXQgYWxyZWFkeSBjb250YWlucyBwcm9jZXNzZWQgY2hlY2tib3ggdmFsdWVzXG4gICAgICAgIC8vIEp1c3QgYWRkL21vZGlmeSBzcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBwcm92aWRlciB0eXBlXG4gICAgICAgIHJlc3VsdC5kYXRhLnR5cGUgPSB0aGlzLnByb3ZpZGVyVHlwZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBhZGRpdGlvbmFsIGhvc3RzIGZvciBTSVAgLSBjb2xsZWN0IGZyb20gdGFibGVcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbEhvc3RzID0gW107XG4gICAgICAgICQoJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIHRib2R5IHRyLmhvc3Qtcm93JykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGhvc3QgPSAkKGVsZW1lbnQpLmZpbmQoJ3RkLmFkZHJlc3MnKS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsSG9zdHMucHVzaCh7IGFkZHJlc3M6IGhvc3QgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gT25seSBhZGQgaWYgdGhlcmUgYXJlIGhvc3RzXG4gICAgICAgIGlmIChhZGRpdGlvbmFsSG9zdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWRkaXRpb25hbEhvc3RzID0gYWRkaXRpb25hbEhvc3RzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBPdmVycmlkZSBwb3B1bGF0ZUZvcm1EYXRhIHRvIGhhbmRsZSBTSVAtc3BlY2lmaWMgZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBtZXRob2QgZmlyc3QgZm9yIGNvbW1vbiBmaWVsZHNcbiAgICAgICAgc3VwZXIucG9wdWxhdGVGb3JtRGF0YShkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgIC8vIFNJUC1zcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgICAgICQoJyNkdG1mbW9kZScpLnZhbChkYXRhLmR0bWZtb2RlIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5EVE1GX01PREUpO1xuICAgICAgICAgICAgJCgnI3RyYW5zcG9ydCcpLnZhbChkYXRhLnRyYW5zcG9ydCB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuVFJBTlNQT1JUKTtcbiAgICAgICAgICAgICQoJyNmcm9tdXNlcicpLnZhbChkYXRhLmZyb211c2VyIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNmcm9tZG9tYWluJykudmFsKGRhdGEuZnJvbWRvbWFpbiB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjb3V0Ym91bmRfcHJveHknKS52YWwoZGF0YS5vdXRib3VuZF9wcm94eSB8fCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNJUC1zcGVjaWZpYyBjaGVja2JveGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5kaXNhYmxlZnJvbXVzZXIgPT09ICcxJyB8fCBkYXRhLmRpc2FibGVmcm9tdXNlciA9PT0gdHJ1ZSkgJCgnI2Rpc2FibGVmcm9tdXNlcicpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUXVhbGlmeSBmcmVxdWVuY3lcbiAgICAgICAgICAgICQoJyNxdWFsaWZ5ZnJlcScpLnZhbChkYXRhLnF1YWxpZnlmcmVxIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5RVUFMSUZZX0ZSRVEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsZXJJRC9ESUQgZmllbGRzXG4gICAgICAgICAgICAkKCcjY2lkX3NvdXJjZScpLnZhbChkYXRhLmNpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICQoJyNkaWRfc291cmNlJykudmFsKGRhdGEuZGlkX3NvdXJjZSB8fCAnZGVmYXVsdCcpO1xuICAgICAgICAgICAgJCgnI2NpZF9jdXN0b21faGVhZGVyJykudmFsKGRhdGEuY2lkX2N1c3RvbV9oZWFkZXIgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfc3RhcnQnKS52YWwoZGF0YS5jaWRfcGFyc2VyX3N0YXJ0IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX2VuZCcpLnZhbChkYXRhLmNpZF9wYXJzZXJfZW5kIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNjaWRfcGFyc2VyX3JlZ2V4JykudmFsKGRhdGEuY2lkX3BhcnNlcl9yZWdleCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX2N1c3RvbV9oZWFkZXInKS52YWwoZGF0YS5kaWRfY3VzdG9tX2hlYWRlciB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9zdGFydCcpLnZhbChkYXRhLmRpZF9wYXJzZXJfc3RhcnQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfZW5kJykudmFsKGRhdGEuZGlkX3BhcnNlcl9lbmQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoZGF0YS5kaWRfcGFyc2VyX3JlZ2V4IHx8ICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGNpZF9kaWRfZGVidWcgY2hlY2tib3hcbiAgICAgICAgICAgIGlmIChkYXRhLmNpZF9kaWRfZGVidWcgPT09ICcxJyB8fCBkYXRhLmNpZF9kaWRfZGVidWcgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAkKCcjY2lkX2RpZF9kZWJ1ZycpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI2NpZF9kaWRfZGVidWcnKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gdmFsdWVzIGFmdGVyIHNldHRpbmcgaGlkZGVuIGlucHV0c1xuICAgICAgICAgICAgY29uc3QgZHJvcGRvd25VcGRhdGVzID0gW1xuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcuZHRtZi1tb2RlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuZHRtZm1vZGUgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLkRUTUZfTU9ERSB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcudHJhbnNwb3J0LWRyb3Bkb3duJywgdmFsdWU6IGRhdGEudHJhbnNwb3J0IHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5UUkFOU1BPUlQgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiAnLnJlZ2lzdHJhdGlvbi10eXBlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLlJFR0lTVFJBVElPTl9UWVBFIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJy5jYWxsZXJpZC1zb3VyY2UtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5jaWRfc291cmNlIHx8ICdkZWZhdWx0JyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcuZGlkLXNvdXJjZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmRpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnIH1cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRyb3Bkb3duVXBkYXRlcy5mb3JFYWNoKCh7IHNlbGVjdG9yLCB2YWx1ZSB9KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGRpdGlvbmFsIGhvc3RzIC0gcG9wdWxhdGUgYWZ0ZXIgZm9ybSBpcyByZWFkeVxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUFkZGl0aW9uYWxIb3N0cyhkYXRhLmFkZGl0aW9uYWxIb3N0cyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIHN1cGVyLmNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YSBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlkICYmICEkKCcjaWQnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNpZCcpLnZhbChyZXNwb25zZS5kYXRhLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhlIEZvcm0uanMgd2lsbCBoYW5kbGUgdGhlIHJlbG9hZCBhdXRvbWF0aWNhbGx5IGlmIHJlc3BvbnNlLnJlbG9hZCBpcyBwcmVzZW50XG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIFJFU1QgQVBJIHJldHVybnMgcmVsb2FkIHBhdGggbGlrZSBcInByb3ZpZGVycy9tb2RpZnlzaXAvU0lQLVRSVU5LLXh4eFwiXG4gICAgICAgIH1cbiAgICB9XG4gICAgXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHJ1bGVzTWFwID0ge1xuICAgICAgICAgICAgb3V0Ym91bmQ6ICgpID0+IHRoaXMuZ2V0T3V0Ym91bmRSdWxlcygpLFxuICAgICAgICAgICAgaW5ib3VuZDogKCkgPT4gdGhpcy5nZXRJbmJvdW5kUnVsZXMoKSxcbiAgICAgICAgICAgIG5vbmU6ICgpID0+IHRoaXMuZ2V0Tm9uZVJ1bGVzKCksXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBydWxlcyA9IHJ1bGVzTWFwW3JlZ1R5cGVdID8gcnVsZXNNYXBbcmVnVHlwZV0oKSA6IHRoaXMuZ2V0T3V0Ym91bmRSdWxlcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIENhbGxlcklEL0RJRCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIHJldHVybiB0aGlzLmFkZENhbGxlcklkRGlkUnVsZXMocnVsZXMpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgQ2FsbGVySUQvRElEIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcnVsZXMgLSBFeGlzdGluZyBydWxlc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFJ1bGVzIHdpdGggQ2FsbGVySUQvRElEIHZhbGlkYXRpb25cbiAgICAgKi9cbiAgICBhZGRDYWxsZXJJZERpZFJ1bGVzKHJ1bGVzKSB7XG4gICAgICAgIGNvbnN0IGNhbGxlcklkU291cmNlID0gJCgnI2NpZF9zb3VyY2UnKS52YWwoKTtcbiAgICAgICAgY29uc3QgZGlkU291cmNlID0gJCgnI2RpZF9zb3VyY2UnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjdXN0b20gaGVhZGVyIHZhbGlkYXRpb24gd2hlbiBjdXN0b20gc291cmNlIGlzIHNlbGVjdGVkXG4gICAgICAgIGNvbnN0IGN1c3RvbUhlYWRlclJ1bGVzID0ge1xuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckVtcHR5IHx8ICdQbGVhc2Ugc3BlY2lmeSBjdXN0b20gaGVhZGVyIG5hbWUnLFxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bQS1aYS16MC05LV9dKyQvXScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGVDdXN0b21IZWFkZXJGb3JtYXQgfHwgJ0hlYWRlciBuYW1lIGNhbiBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycywgZGFzaCBhbmQgdW5kZXJzY29yZScsXG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKGNhbGxlcklkU291cmNlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgcnVsZXMuY2lkX2N1c3RvbV9oZWFkZXIgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NpZF9jdXN0b21faGVhZGVyJyxcbiAgICAgICAgICAgICAgICAuLi5jdXN0b21IZWFkZXJSdWxlc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGRpZFNvdXJjZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIHJ1bGVzLmRpZF9jdXN0b21faGVhZGVyID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkaWRfY3VzdG9tX2hlYWRlcicsXG4gICAgICAgICAgICAgICAgLi4uY3VzdG9tSGVhZGVyUnVsZXNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlZ2V4IHZhbGlkYXRpb24gaWYgcHJvdmlkZWQgKG9wdGlvbmFsIGZpZWxkcylcbiAgICAgICAgY29uc3QgcmVnZXhWYWxpZGF0aW9uUnVsZSA9IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2NhbGxiYWNrJyxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFsdWUpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFJlZ0V4cCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUludmFsaWRSZWdleCB8fCAnSW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb24nLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkKCcjY2lkX3BhcnNlcl9yZWdleCcpLnZhbCgpKSB7XG4gICAgICAgICAgICBydWxlcy5jaWRfcGFyc2VyX3JlZ2V4ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjaWRfcGFyc2VyX3JlZ2V4JyxcbiAgICAgICAgICAgICAgICAuLi5yZWdleFZhbGlkYXRpb25SdWxlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoKSkge1xuICAgICAgICAgICAgcnVsZXMuZGlkX3BhcnNlcl9yZWdleCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGlkX3BhcnNlcl9yZWdleCcsXG4gICAgICAgICAgICAgICAgLi4ucmVnZXhWYWxpZGF0aW9uUnVsZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJ1bGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRPdXRib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldEluYm91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzhdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igbm9uZSByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXROb25lUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGhvc3QgbGFiZWwgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0TGFiZWwocmVnVHlwZSkge1xuICAgICAgICBjb25zdCAkaG9zdExhYmVsVGV4dCA9ICQoJyNob3N0TGFiZWxUZXh0Jyk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3Qgb3IgSVAgQWRkcmVzcycpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgJGhvc3RMYWJlbFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIHx8ICdSZW1vdGUgSG9zdCBvciBJUCBBZGRyZXNzJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRm9yIGluYm91bmQsIHRoZSBmaWVsZCBpcyBoaWRkZW4gc28gbm8gbmVlZCB0byB1cGRhdGUgbGFiZWxcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHsgXG4gICAgICAgIC8vIEdldCBlbGVtZW50IHJlZmVyZW5jZXNcbiAgICAgICAgY29uc3QgZWxIb3N0ID0gJCgnI2VsSG9zdCcpO1xuICAgICAgICBjb25zdCBlbFVzZXJuYW1lID0gJCgnI2VsVXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgZWxTZWNyZXQgPSAkKCcjZWxTZWNyZXQnKTtcbiAgICAgICAgY29uc3QgZWxQb3J0ID0gJCgnI2VsUG9ydCcpO1xuICAgICAgICBjb25zdCBlbEFkZGl0aW9uYWxIb3N0ID0gJCgnI2VsQWRkaXRpb25hbEhvc3RzJyk7XG4gICAgICAgIGNvbnN0IGVsTmV0d29ya0ZpbHRlciA9ICQoJyNlbE5ldHdvcmtGaWx0ZXInKTtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBnZW5QYXNzd29yZCA9ICQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKTtcblxuICAgICAgICBjb25zdCB2YWxVc2VyTmFtZSA9ICQoJyN1c2VybmFtZScpO1xuICAgICAgICBjb25zdCB2YWxTZWNyZXQgPSB0aGlzLiRzZWNyZXQ7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKTtcblxuICAgICAgICAvLyBSZXNldCB1c2VybmFtZSBvbmx5IHdoZW4gc3dpdGNoaW5nIGZyb20gaW5ib3VuZCB0byBvdGhlciB0eXBlc1xuICAgICAgICBpZiAodmFsVXNlck5hbWUudmFsKCkgPT09IHByb3ZpZGVySWQgJiYgcmVnVHlwZSAhPT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICB2YWxVc2VyTmFtZS52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIHZhbFVzZXJOYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gSGlkZSBwYXNzd29yZCB0b29sdGlwIGJ5IGRlZmF1bHRcbiAgICAgICAgdGhpcy5oaWRlUGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaG9zdCBsYWJlbCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RMYWJlbChyZWdUeXBlKTtcblxuICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgZWxBZGRpdGlvbmFsSG9zdC5zaG93KCk7IC8vIFNob3cgZm9yIGFsbCByZWdpc3RyYXRpb24gdHlwZXNcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5oaWRlKCk7IC8vIE5ldHdvcmsgZmlsdGVyIG5vdCByZWxldmFudCBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoJ25vbmUnKTsgLy8gUmVzZXQgdG8gZGVmYXVsdFxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIaWRlIHBhc3N3b3JkIG1hbmFnZW1lbnQgYnV0dG9ucyBmb3Igb3V0Ym91bmQgcmVnaXN0cmF0aW9uXG4gICAgICAgICAgICAkKCcjZWxTZWNyZXQgLmJ1dHRvbi5jbGlwYm9hcmQnKS5oaWRlKCk7IC8vIEhpZGUgY29weSBidXR0b25cbiAgICAgICAgICAgICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKS5oaWRlKCk7IC8vIEhpZGUgc2hvdy9oaWRlIGJ1dHRvblxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIaWRlIHBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvciBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkU3RyZW5ndGhJbmRpY2F0b3IoKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgIHZhbFVzZXJOYW1lLnZhbChwcm92aWRlcklkKTtcbiAgICAgICAgICAgIHZhbFVzZXJOYW1lLmF0dHIoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvbiBpZiBlbXB0eVxuICAgICAgICAgICAgaWYgKHZhbFNlY3JldC52YWwoKS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVBhc3N3b3JkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGVsSG9zdC5oaWRlKCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5oaWRlKCk7IC8vIFBvcnQgbm90IG5lZWRlZCBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb25cbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5zaG93KCk7IC8vIE5ldHdvcmsgZmlsdGVyIGNyaXRpY2FsIGZvciBpbmJvdW5kIHNlY3VyaXR5XG4gICAgICAgICAgICBnZW5QYXNzd29yZC5zaG93KCk7XG4gICAgICAgICAgICBlbEFkZGl0aW9uYWxIb3N0LnNob3coKTsgLy8gU2hvdyBmb3IgYWxsIHJlZ2lzdHJhdGlvbiB0eXBlc1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IHBhc3N3b3JkIG1hbmFnZW1lbnQgYnV0dG9ucyBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb25cbiAgICAgICAgICAgICQoJyNlbFNlY3JldCAuYnV0dG9uLmNsaXBib2FyZCcpLnNob3coKTsgLy8gU2hvdyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLnNob3coKTsgLy8gU2hvdyBzaG93L2hpZGUgYnV0dG9uXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yIGZvciBpbmJvdW5kXG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFN0cmVuZ3RoSW5kaWNhdG9yKCk7IFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHZhbGlkYXRpb24gZXJyb3JzIGZvciBoaWRkZW4gZmllbGRzXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnaG9zdCcpO1xuICAgICAgICAgICAgJCgnI2hvc3QnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdwb3J0Jyk7XG4gICAgICAgICAgICAkKCcjcG9ydCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgIGVsQWRkaXRpb25hbEhvc3Quc2hvdygpOyAvLyBTaG93IGZvciBhbGwgcmVnaXN0cmF0aW9uIHR5cGVzXG4gICAgICAgICAgICBlbE5ldHdvcmtGaWx0ZXIuc2hvdygpOyAvLyBOZXR3b3JrIGZpbHRlciBjcml0aWNhbCBmb3Igbm9uZSB0eXBlIChubyBhdXRoKVxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IHBhc3N3b3JkIG1hbmFnZW1lbnQgYnV0dG9ucyBmb3Igbm9uZSByZWdpc3RyYXRpb25cbiAgICAgICAgICAgICQoJyNlbFNlY3JldCAuYnV0dG9uLmNsaXBib2FyZCcpLnNob3coKTsgLy8gU2hvdyBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLnNob3coKTsgLy8gU2hvdyBzaG93L2hpZGUgYnV0dG9uXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgdG9vbHRpcCBpY29uIGZvciBwYXNzd29yZCBmaWVsZFxuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yIGZvciBub25lIHR5cGVcbiAgICAgICAgICAgIHRoaXMuc2hvd1Bhc3N3b3JkU3RyZW5ndGhJbmRpY2F0b3IoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZpZWxkIHJlcXVpcmVtZW50cyAtIG1ha2UgcGFzc3dvcmQgb3B0aW9uYWwgaW4gbm9uZSBtb2RlXG4gICAgICAgICAgICAkKCcjZWxTZWNyZXQnKS5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHZhbGlkYXRpb24gcHJvbXB0cyBmb3Igb3B0aW9uYWwgZmllbGRzIGluIG5vbmUgbW9kZVxuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3VzZXJuYW1lJyk7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnc2VjcmV0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZWxlbWVudCB2aXNpYmlsaXR5IGJhc2VkIG9uICdkaXNhYmxlZnJvbXVzZXInIGNoZWNrYm94XG4gICAgICAgIC8vIFVzZSB0aGUgb3V0ZXIgZGl2LmNoZWNrYm94IGNvbnRhaW5lciBpbnN0ZWFkIG9mIGlucHV0IGVsZW1lbnRcbiAgICAgICAgY29uc3QgZWwgPSAkKCdpbnB1dFtuYW1lPVwiZGlzYWJsZWZyb211c2VyXCJdJykuY2xvc2VzdCgnLnVpLmNoZWNrYm94Jyk7XG4gICAgICAgIGNvbnN0IGZyb21Vc2VyID0gJCgnI2RpdkZyb21Vc2VyJyk7XG4gICAgICAgIGlmIChlbC5sZW5ndGggPiAwICYmIGVsLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIGZyb21Vc2VyLmhpZGUoKTtcbiAgICAgICAgICAgIGZyb21Vc2VyLnJlbW92ZUNsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tVXNlci5zaG93KCk7XG4gICAgICAgICAgICBmcm9tVXNlci5hZGRDbGFzcygndmlzaWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgQ2FsbGVySUQgY3VzdG9tIHNldHRpbmdzIHZpc2liaWxpdHkgYmFzZWQgb24gY3VycmVudCBkcm9wZG93biB2YWx1ZVxuICAgICAgICBjb25zdCBjaWREcm9wZG93biA9ICQoJy5jYWxsZXJpZC1zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKGNpZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGNpZFZhbHVlID0gY2lkRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgY2lkQ3VzdG9tU2V0dGluZ3MgPSAkKCcjY2FsbGVyaWQtY3VzdG9tLXNldHRpbmdzJyk7XG4gICAgICAgICAgICBpZiAoY2lkVmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgY2lkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignc2hvdycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBjaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdoaWRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBESUQgY3VzdG9tIHNldHRpbmdzIHZpc2liaWxpdHkgYmFzZWQgb24gY3VycmVudCBkcm9wZG93biB2YWx1ZVxuICAgICAgICBjb25zdCBkaWREcm9wZG93biA9ICQoJy5kaWQtc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgIGlmIChkaWREcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkaWRWYWx1ZSA9IGRpZERyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGRpZEN1c3RvbVNldHRpbmdzID0gJCgnI2RpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgICAgIGlmIChkaWRWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBkaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdzaG93Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGRpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY29tcGxldGlvbiBvZiBob3N0IGFkZHJlc3MgaW5wdXRcbiAgICAgKi9cbiAgICBjYk9uQ29tcGxldGVIb3N0QWRkcmVzcygpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdhZGRpdGlvbmFsLWhvc3QnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IHZhbHVlLm1hdGNoKHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBpbnB1dCB2YWx1ZVxuICAgICAgICAgICAgaWYgKHZhbGlkYXRpb24gPT09IG51bGwgfHwgdmFsaWRhdGlvbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnRyYW5zaXRpb24oJ3NoYWtlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgaG9zdCBhZGRyZXNzIGFscmVhZHkgZXhpc3RzXG4gICAgICAgICAgICBpZiAoJChgLmhvc3Qtcm93W2RhdGEtdmFsdWU9XFxcIiR7dmFsdWV9XFxcIl1gKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkdHIgPSB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUZW1wbGF0ZS5sYXN0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGNsb25lID0gJHRyLmNsb25lKGZhbHNlKTsgLy8gVXNlIGZhbHNlIHNpbmNlIGV2ZW50cyBhcmUgZGVsZWdhdGVkXG4gICAgICAgICAgICAgICAgJGNsb25lXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaG9zdC1yb3ctdHBsJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdob3N0LXJvdycpXG4gICAgICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2RhdGEtdmFsdWUnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgJGNsb25lLmZpbmQoJy5hZGRyZXNzJykuaHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGV4aXN0aW5nSG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgICAgICAgICAgaWYgKCRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJHRyLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmFmdGVyKCRjbG9uZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgaG9zdHMgdGFibGVcbiAgICAgKi9cbiAgICB1cGRhdGVIb3N0c1RhYmxlVmlldygpIHtcbiAgICAgICAgY29uc3QgJGhvc3RSb3dzID0gdGhpcy4kZm9ybU9iai5maW5kKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1cpO1xuICAgICAgICBpZiAoJGhvc3RSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzRHVtbXkuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgcGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yIGFuZCB0cmlnZ2VyIGluaXRpYWwgY2hlY2tcbiAgICAgKi9cbiAgICBzaG93UGFzc3dvcmRTdHJlbmd0aEluZGljYXRvcigpIHtcbiAgICAgICAgY29uc3QgJHBhc3N3b3JkUHJvZ3Jlc3MgPSAkKCcjcGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgaWYgKCRwYXNzd29yZFByb2dyZXNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcHJvZ3Jlc3MgY29tcG9uZW50IGlmIG5vdCBhbHJlYWR5IGRvbmVcbiAgICAgICAgICAgIGlmICghJHBhc3N3b3JkUHJvZ3Jlc3MuaGFzQ2xhc3MoJ3Byb2dyZXNzJykpIHtcbiAgICAgICAgICAgICAgICAkcGFzc3dvcmRQcm9ncmVzcy5wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIHNob3dBY3Rpdml0eTogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHBhc3N3b3JkUHJvZ3Jlc3Muc2hvdygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIHBhc3N3b3JkIHN0cmVuZ3RoIGNoZWNrIGlmIHBhc3N3b3JkIGV4aXN0c1xuICAgICAgICAgICAgaWYgKHRoaXMuJHNlY3JldC52YWwoKSAmJiB0eXBlb2YgUGFzc3dvcmRTY29yZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogdGhpcy4kc2VjcmV0LnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICBiYXI6ICRwYXNzd29yZFByb2dyZXNzLFxuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiAkcGFzc3dvcmRQcm9ncmVzc1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgcGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yXG4gICAgICovXG4gICAgaGlkZVBhc3N3b3JkU3RyZW5ndGhJbmRpY2F0b3IoKSB7XG4gICAgICAgIGNvbnN0ICRwYXNzd29yZFByb2dyZXNzID0gJCgnI3Bhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgIGlmICgkcGFzc3dvcmRQcm9ncmVzcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkcGFzc3dvcmRQcm9ncmVzcy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHthcnJheX0gYWRkaXRpb25hbEhvc3RzIC0gQXJyYXkgb2YgYWRkaXRpb25hbCBob3N0cyBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGFkZGl0aW9uYWxIb3N0cykge1xuICAgICAgICBpZiAoIWFkZGl0aW9uYWxIb3N0cyB8fCAhQXJyYXkuaXNBcnJheShhZGRpdGlvbmFsSG9zdHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGhvc3RzIGZpcnN0IChleGNlcHQgdGVtcGxhdGUgYW5kIGR1bW15KVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNUYWJsZS5maW5kKGB0Ym9keSB0ciR7UHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPV31gKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBlYWNoIGhvc3QgdXNpbmcgdGhlIHNhbWUgbG9naWMgYXMgY2JPbkNvbXBsZXRlSG9zdEFkZHJlc3NcbiAgICAgICAgYWRkaXRpb25hbEhvc3RzLmZvckVhY2goKGhvc3RPYmopID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBib3RoIG9iamVjdCBmb3JtYXQge2lkLCBhZGRyZXNzfSBhbmQgc3RyaW5nIGZvcm1hdFxuICAgICAgICAgICAgY29uc3QgaG9zdEFkZHJlc3MgPSB0eXBlb2YgaG9zdE9iaiA9PT0gJ3N0cmluZycgPyBob3N0T2JqIDogaG9zdE9iai5hZGRyZXNzO1xuICAgICAgICAgICAgaWYgKGhvc3RBZGRyZXNzICYmIGhvc3RBZGRyZXNzLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgc2FtZSBsb2dpYyBhcyBjYk9uQ29tcGxldGVIb3N0QWRkcmVzc1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKGhvc3RBZGRyZXNzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbnNlcnQgdGhlIGNsb25lZCByb3dcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRhYmxlIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgIH1cbn0iXX0=