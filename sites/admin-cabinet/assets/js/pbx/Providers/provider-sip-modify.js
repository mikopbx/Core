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
        saveMethod: 'saveRecord'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc2lwLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlclNJUCIsIiRxdWFsaWZ5VG9nZ2xlIiwiJCIsIiRxdWFsaWZ5RnJlcVRvZ2dsZSIsIiRhZGRpdGlvbmFsSG9zdHNEdW1teSIsIlNJUF9TRUxFQ1RPUlMiLCJBRERJVElPTkFMX0hPU1RTX0RVTU1ZIiwiJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlIiwiQURESVRJT05BTF9IT1NUU19URU1QTEFURSIsIiRhZGRpdGlvbmFsSG9zdHNUYWJsZSIsIkFERElUSU9OQUxfSE9TVFNfVEFCTEUiLCIkYWRkaXRpb25hbEhvc3RJbnB1dCIsIkFERElUSU9OQUxfSE9TVF9JTlBVVCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwib24iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93biIsImluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93biIsImluaXRpYWxpemVDYWxsZXJJZFNvdXJjZURyb3Bkb3duIiwiaW5pdGlhbGl6ZURpZFNvdXJjZURyb3Bkb3duIiwicGFyZW50IiwiUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJpbml0aWFsaXplVGFicyIsImluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzIiwidXBkYXRlSG9zdHNUYWJsZVZpZXciLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJzZWxmIiwia2V5cHJlc3MiLCJlIiwid2hpY2giLCJjYk9uQ29tcGxldGVIb3N0QWRkcmVzcyIsIkRFTEVURV9ST1dfQlVUVE9OIiwicHJldmVudERlZmF1bHQiLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwiJGZpZWxkIiwibGVuZ3RoIiwiJGV4aXN0aW5nRHJvcGRvd24iLCJoYXNDbGFzcyIsImRyb3Bkb3duIiwiY3VycmVudFZhbHVlIiwidmFsIiwiUHJvdmlkZXJCYXNlIiwiREVGQVVMVFMiLCJEVE1GX01PREUiLCJvcHRpb25zIiwidmFsdWUiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiYXV0byIsInJmYzQ3MzMiLCJpbmZvIiwiaW5iYW5kIiwiYXV0b19pbmZvIiwiZHJvcGRvd25IdG1sIiwiZmluZCIsIm8iLCJtYXAiLCJvcHQiLCJqb2luIiwicmVwbGFjZVdpdGgiLCJUUkFOU1BPUlQiLCJvbkNhbGxlcklkU291cmNlQ2hhbmdlIiwicHJfQ2FsbGVySWRTb3VyY2VEZWZhdWx0IiwicHJfQ2FsbGVySWRTb3VyY2VGcm9tIiwicHJfQ2FsbGVySWRTb3VyY2VScGlkIiwicHJfQ2FsbGVySWRTb3VyY2VQYWkiLCJwcl9DYWxsZXJJZFNvdXJjZUN1c3RvbSIsIm9uRGlkU291cmNlQ2hhbmdlIiwicHJfRGlkU291cmNlRGVmYXVsdCIsInByX0RpZFNvdXJjZVRvIiwicHJfRGlkU291cmNlRGl2ZXJzaW9uIiwicHJfRGlkU291cmNlQ3VzdG9tIiwiJGN1c3RvbVNldHRpbmdzIiwidHJhbnNpdGlvbiIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwiJGZvcm1PYmoiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIlByb3ZpZGVyc0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJzZXR0aW5ncyIsInJlc3VsdCIsImRhdGEiLCJ0eXBlIiwicHJvdmlkZXJUeXBlIiwiYWRkaXRpb25hbEhvc3RzIiwiZWFjaCIsImluZGV4IiwiZWxlbWVudCIsImhvc3QiLCJ0cmltIiwicHVzaCIsImFkZHJlc3MiLCJkdG1mbW9kZSIsInRyYW5zcG9ydCIsImZyb211c2VyIiwiZnJvbWRvbWFpbiIsIm91dGJvdW5kX3Byb3h5IiwiZGlzYWJsZWZyb211c2VyIiwicHJvcCIsInF1YWxpZnlmcmVxIiwiUVVBTElGWV9GUkVRIiwiY2lkX3NvdXJjZSIsImRpZF9zb3VyY2UiLCJjaWRfY3VzdG9tX2hlYWRlciIsImNpZF9wYXJzZXJfc3RhcnQiLCJjaWRfcGFyc2VyX2VuZCIsImNpZF9wYXJzZXJfcmVnZXgiLCJkaWRfY3VzdG9tX2hlYWRlciIsImRpZF9wYXJzZXJfc3RhcnQiLCJkaWRfcGFyc2VyX2VuZCIsImRpZF9wYXJzZXJfcmVnZXgiLCJjaWRfZGlkX2RlYnVnIiwiZHJvcGRvd25VcGRhdGVzIiwic2VsZWN0b3IiLCJyZWdpc3RyYXRpb25fdHlwZSIsIlJFR0lTVFJBVElPTl9UWVBFIiwiZm9yRWFjaCIsIiRkcm9wZG93biIsInBvcHVsYXRlQWRkaXRpb25hbEhvc3RzIiwicmVzcG9uc2UiLCJpZCIsInJlZ1R5cGUiLCJydWxlc01hcCIsIm91dGJvdW5kIiwiZ2V0T3V0Ym91bmRSdWxlcyIsImluYm91bmQiLCJnZXRJbmJvdW5kUnVsZXMiLCJub25lIiwiZ2V0Tm9uZVJ1bGVzIiwicnVsZXMiLCJhZGRDYWxsZXJJZERpZFJ1bGVzIiwiY2FsbGVySWRTb3VyY2UiLCJkaWRTb3VyY2UiLCJjdXN0b21IZWFkZXJSdWxlcyIsInByb21wdCIsInByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRW1wdHkiLCJwcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckZvcm1hdCIsImlkZW50aWZpZXIiLCJyZWdleFZhbGlkYXRpb25SdWxlIiwib3B0aW9uYWwiLCJjYWxsYmFjayIsIlJlZ0V4cCIsInByX1ZhbGlkYXRlSW52YWxpZFJlZ2V4IiwiZGVzY3JpcHRpb24iLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5IiwidXNlcm5hbWUiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHkiLCJzZWNyZXQiLCJwb3J0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCIsImFkZGl0aW9uYWxfaG9zdHMiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwicHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IiwiJGhvc3RMYWJlbFRleHQiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsImVsSG9zdCIsImVsVXNlcm5hbWUiLCJlbFNlY3JldCIsImVsUG9ydCIsImVsQWRkaXRpb25hbEhvc3QiLCJlbE5ldHdvcmtGaWx0ZXIiLCJnZW5QYXNzd29yZCIsInZhbFVzZXJOYW1lIiwidmFsU2VjcmV0IiwiJHNlY3JldCIsInByb3ZpZGVySWQiLCJyZW1vdmVBdHRyIiwiaGlkZVBhc3N3b3JkVG9vbHRpcCIsInVwZGF0ZUhvc3RMYWJlbCIsInNob3ciLCJoaWRlIiwiaGlkZVBhc3N3b3JkU3RyZW5ndGhJbmRpY2F0b3IiLCJhdHRyIiwiZ2VuZXJhdGVQYXNzd29yZCIsInNob3dQYXNzd29yZFN0cmVuZ3RoSW5kaWNhdG9yIiwiZm9ybSIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJlbCIsImZyb21Vc2VyIiwiY2lkRHJvcGRvd24iLCJjaWRWYWx1ZSIsImNpZEN1c3RvbVNldHRpbmdzIiwiZGlkRHJvcGRvd24iLCJkaWRWYWx1ZSIsImRpZEN1c3RvbVNldHRpbmdzIiwidmFsaWRhdGlvbiIsIm1hdGNoIiwiJHRyIiwibGFzdCIsIiRjbG9uZSIsImNsb25lIiwiaHRtbCIsIiRleGlzdGluZ0hvc3RSb3dzIiwiSE9TVF9ST1ciLCJhZnRlciIsIiRob3N0Um93cyIsIiRwYXNzd29yZFByb2dyZXNzIiwicHJvZ3Jlc3MiLCJwZXJjZW50Iiwic2hvd0FjdGl2aXR5IiwiUGFzc3dvcmRTY29yZSIsImNoZWNrUGFzc1N0cmVuZ3RoIiwicGFzcyIsImJhciIsInNlY3Rpb24iLCJBcnJheSIsImlzQXJyYXkiLCJob3N0T2JqIiwiaG9zdEFkZHJlc3MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFc7Ozs7O0FBQ0Y7QUFVQSx5QkFBYztBQUFBOztBQUFBOztBQUNWLDhCQUFNLEtBQU47QUFDQSxVQUFLQyxjQUFMLEdBQXNCQyxDQUFDLENBQUMsVUFBRCxDQUF2QjtBQUNBLFVBQUtDLGtCQUFMLEdBQTBCRCxDQUFDLENBQUMsZUFBRCxDQUEzQixDQUhVLENBS1Y7O0FBQ0EsVUFBS0UscUJBQUwsR0FBNkJGLENBQUMsQ0FBQ0YsV0FBVyxDQUFDSyxhQUFaLENBQTBCQyxzQkFBM0IsQ0FBOUI7QUFDQSxVQUFLQyx3QkFBTCxHQUFnQ0wsQ0FBQyxDQUFDRixXQUFXLENBQUNLLGFBQVosQ0FBMEJHLHlCQUEzQixDQUFqQztBQUNBLFVBQUtDLHFCQUFMLEdBQTZCUCxDQUFDLENBQUNGLFdBQVcsQ0FBQ0ssYUFBWixDQUEwQkssc0JBQTNCLENBQTlCO0FBQ0EsVUFBS0Msb0JBQUwsR0FBNEJULENBQUMsQ0FBQ0YsV0FBVyxDQUFDSyxhQUFaLENBQTBCTyxxQkFBM0IsQ0FBN0I7QUFUVTtBQVViO0FBRUQ7QUFDSjtBQUNBOzs7OztXQUNJLHNCQUFhO0FBQUE7O0FBQ1Qsa0ZBRFMsQ0FHVDs7O0FBQ0EsV0FBS1gsY0FBTCxDQUFvQlksUUFBcEIsQ0FBNkI7QUFDekJDLFFBQUFBLFFBQVEsRUFBRSxvQkFBTTtBQUNaLGNBQUks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LFVBRmQsRUFHS3FMLElBSEw7QUFJQW9CLFVBQUFBLE1BQU0sQ0FBQ2pCLElBQVAsQ0FBWSxZQUFaLEVBQTBCb0MsV0FBMUI7QUFDQW5CLFVBQUFBLE1BQU0sQ0FBQ3ZKLElBQVAsQ0FBWSxVQUFaLEVBQXdCeUosSUFBeEIsQ0FBNkJpQixXQUE3QixFQVRtQyxDQVduQzs7QUFDQSxjQUFNaEIsaUJBQWlCLEdBQUcsTUFBSSxDQUFDcEksUUFBTCxDQUFjdEIsSUFBZCxDQUFtQmxFLFdBQVcsQ0FBQ0ssYUFBWixDQUEwQndOLFFBQTdDLENBQTFCOztBQUNBLGNBQUlELGlCQUFpQixDQUFDSixJQUFsQixHQUF5QnpLLE1BQXpCLEtBQW9DLENBQXhDLEVBQTJDO0FBQ3ZDd0ssWUFBQUEsR0FBRyxDQUFDTyxLQUFKLENBQVVMLE1BQVY7QUFDSCxXQUZELE1BRU87QUFDSEcsWUFBQUEsaUJBQWlCLENBQUNKLElBQWxCLEdBQXlCTSxLQUF6QixDQUErQkwsTUFBL0I7QUFDSDtBQUNKO0FBQ0osT0F0QkQsRUFUcUMsQ0FpQ3JDOztBQUNBLFdBQUszTCxvQkFBTDtBQUNIOzs7O0VBemdDcUJ1QixZOztnQkFBcEJyRCxXLG1CQUVxQjtBQUNuQlUsRUFBQUEsc0JBQXNCLEVBQUUseUJBREw7QUFFbkJKLEVBQUFBLHNCQUFzQixFQUFFLGdDQUZMO0FBR25CRSxFQUFBQSx5QkFBeUIsRUFBRSx1Q0FIUjtBQUluQkksRUFBQUEscUJBQXFCLEVBQUUsd0JBSko7QUFLbkI2QixFQUFBQSxpQkFBaUIsRUFBRSxvQkFMQTtBQU1uQm9MLEVBQUFBLFFBQVEsRUFBRTtBQU5TLEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQcm92aWRlckJhc2UsIFByb3ZpZGVyU2lwVG9vbHRpcE1hbmFnZXIsIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIsIGkxOG4gKi9cblxuLyoqXG4gKiBTSVAgcHJvdmlkZXIgbWFuYWdlbWVudCBmb3JtXG4gKiBAY2xhc3MgUHJvdmlkZXJTSVBcbiAqL1xuY2xhc3MgUHJvdmlkZXJTSVAgZXh0ZW5kcyBQcm92aWRlckJhc2UgeyAgXG4gICAgLy8gU0lQLXNwZWNpZmljIHNlbGVjdG9yc1xuICAgIHN0YXRpYyBTSVBfU0VMRUNUT1JTID0ge1xuICAgICAgICBBRERJVElPTkFMX0hPU1RTX1RBQkxFOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUnLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RTX0RVTU1ZOiAnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgLmR1bW15JyxcbiAgICAgICAgQURESVRJT05BTF9IT1NUU19URU1QTEFURTogJyNhZGRpdGlvbmFsLWhvc3RzLXRhYmxlIC5ob3N0LXJvdy10cGwnLFxuICAgICAgICBBRERJVElPTkFMX0hPU1RfSU5QVVQ6ICcjYWRkaXRpb25hbC1ob3N0IGlucHV0JyxcbiAgICAgICAgREVMRVRFX1JPV19CVVRUT046ICcuZGVsZXRlLXJvdy1idXR0b24nLFxuICAgICAgICBIT1NUX1JPVzogJy5ob3N0LXJvdydcbiAgICB9O1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcignU0lQJyk7XG4gICAgICAgIHRoaXMuJHF1YWxpZnlUb2dnbGUgPSAkKCcjcXVhbGlmeScpO1xuICAgICAgICB0aGlzLiRxdWFsaWZ5RnJlcVRvZ2dsZSA9ICQoJyNxdWFsaWZ5LWZyZXEnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNJUC1zcGVjaWZpYyBqUXVlcnkgb2JqZWN0c1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teSA9ICQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5BRERJVElPTkFMX0hPU1RTX0RVTU1ZKTtcbiAgICAgICAgdGhpcy4kYWRkaXRpb25hbEhvc3RzVGVtcGxhdGUgPSAkKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuQURESVRJT05BTF9IT1NUU19URU1QTEFURSk7XG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVFNfVEFCTEUpO1xuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0ID0gJChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkFERElUSU9OQUxfSE9TVF9JTlBVVCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTsgXG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdGhpcy4kcXVhbGlmeVRvZ2dsZS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLiRxdWFsaWZ5VG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kcXVhbGlmeUZyZXFUb2dnbGUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImRpc2FibGVmcm9tdXNlclwiXScpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGRyb3Bkb3duc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEdG1mTW9kZURyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRyYW5zcG9ydERyb3Bkb3duKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNhbGxlcklkU291cmNlRHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGlkU291cmNlRHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVidWcgY2hlY2tib3ggLSB1c2luZyBwYXJlbnQgY29udGFpbmVyIHdpdGggY2xhc3Mgc2VsZWN0b3JcbiAgICAgICAgJCgnI2NpZF9kaWRfZGVidWcnKS5wYXJlbnQoJy5jaGVja2JveCcpLmNoZWNrYm94KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgICAgUHJvdmlkZXJTaXBUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGFicygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTSVAtc3BlY2lmaWMgY29tcG9uZW50c1xuICAgICAgICB0aGlzLmluaXRpYWxpemVTaXBFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgIHRoaXMudXBkYXRlSG9zdHNUYWJsZVZpZXcoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJzKCkge1xuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogKHRhYlBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiB0eXBlb2YgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIHdoZW4gaXQgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmluaXRpYWxpemVEaWFnbm9zdGljc1RhYigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgU0lQLXNwZWNpZmljIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNpcEV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyBzdHJpbmcgdG8gYWRkaXRpb25hbC1ob3N0cy10YWJsZSB0YWJsZVxuICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdElucHV0LmtleXByZXNzKChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS53aGljaCA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBob3N0IGZyb20gYWRkaXRpb25hbC1ob3N0cy10YWJsZSAtIHVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlLm9uKCdjbGljaycsIFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuREVMRVRFX1JPV19CVVRUT04sIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgc2VsZi51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEVE1GIG1vZGUgZHJvcGRvd24gZm9yIFNJUCBwcm92aWRlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHRtZk1vZGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI2R0bWZtb2RlJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygnZHRtZi1tb2RlLWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygnZHRtZi1tb2RlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuRFRNRl9NT0RFO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdhdXRvJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmF1dG8gfHwgJ2F1dG8nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAncmZjNDczMycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5yZmM0NzMzIHx8ICdyZmM0NzMzJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2luZm8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuaW5mbyB8fCAnaW5mbycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdpbmJhbmQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuaW5iYW5kIHx8ICdpbmJhbmQnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnYXV0b19pbmZvJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmF1dG9faW5mbyB8fCAnYXV0b19pbmZvJyB9XG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkcm9wZG93bkh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VsZWN0aW9uIGRyb3Bkb3duIGR0bWYtbW9kZS1kcm9wZG93blwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImR0bWZtb2RlXCIgaWQ9XCJkdG1mbW9kZVwiIHZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke29wdGlvbnMuZmluZChvID0+IG8udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk/LnRleHQgfHwgY3VycmVudFZhbHVlfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgICAgICAgICAgICAgICAgICR7b3B0aW9ucy5tYXAob3B0ID0+IGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdC52YWx1ZX1cIj4ke29wdC50ZXh0fTwvZGl2PmApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAkZmllbGQucmVwbGFjZVdpdGgoZHJvcGRvd25IdG1sKTtcbiAgICAgICAgXG4gICAgICAgICQoJy5kdG1mLW1vZGUtZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRyYW5zcG9ydCBwcm90b2NvbCBkcm9wZG93biBmb3IgU0lQIHByb3ZpZGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUcmFuc3BvcnREcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI3RyYW5zcG9ydCcpO1xuICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbnNpZGUgYSBkcm9wZG93biBzdHJ1Y3R1cmVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkZmllbGQuY2xvc2VzdCgnLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBBbHJlYWR5IGEgZHJvcGRvd24sIGp1c3QgZW5zdXJlIGl0J3MgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIGlmICghJGV4aXN0aW5nRHJvcGRvd24uaGFzQ2xhc3MoJ3RyYW5zcG9ydC1kcm9wZG93bicpKSB7XG4gICAgICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uYWRkQ2xhc3MoJ3RyYW5zcG9ydC1kcm9wZG93bicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkZmllbGQudmFsKCkgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLlRSQU5TUE9SVDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnVURQJywgdGV4dDogJ1VEUCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdUQ1AnLCB0ZXh0OiAnVENQJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ1RMUycsIHRleHQ6ICdUTFMnIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gdHJhbnNwb3J0LWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwidHJhbnNwb3J0XCIgaWQ9XCJ0cmFuc3BvcnRcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtvcHRpb25zLm1hcChvcHQgPT4gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0LnZhbHVlfVwiPiR7b3B0LnRleHR9PC9kaXY+YCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRmaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgJCgnLnRyYW5zcG9ydC1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgQ2FsbGVySUQgc291cmNlIGRyb3Bkb3duXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNhbGxlcklkU291cmNlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoJyNjaWRfc291cmNlJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygnY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygnY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnZGVmYXVsdCc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJ2RlZmF1bHQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VEZWZhdWx0IHx8ICdEZWZhdWx0JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ2Zyb20nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VGcm9tIHx8ICdGUk9NIGhlYWRlcicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdycGlkJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0NhbGxlcklkU291cmNlUnBpZCB8fCAnUmVtb3RlLVBhcnR5LUlEJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ3BhaScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9DYWxsZXJJZFNvdXJjZVBhaSB8fCAnUC1Bc3NlcnRlZC1JZGVudGl0eScgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdjdXN0b20nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfQ2FsbGVySWRTb3VyY2VDdXN0b20gfHwgJ0N1c3RvbSBoZWFkZXInIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gY2FsbGVyaWQtc291cmNlLWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiY2lkX3NvdXJjZVwiIGlkPVwiY2lkX3NvdXJjZVwiIHZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZWZhdWx0IHRleHRcIj4ke29wdGlvbnMuZmluZChvID0+IG8udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk/LnRleHQgfHwgY3VycmVudFZhbHVlfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZW51XCI+XG4gICAgICAgICAgICAgICAgICAgICR7b3B0aW9ucy5tYXAob3B0ID0+IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0LnZhbHVlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPiR7b3B0LnRleHR9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7b3B0LnZhbHVlID09PSAnY3VzdG9tJyA/ICc8aSBjbGFzcz1cInNldHRpbmdzIGljb24gcmlnaHQgZmxvYXRlZFwiPjwvaT4nIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgYCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRmaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgJCgnLmNhbGxlcmlkLXNvdXJjZS1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRElEIHNvdXJjZSBkcm9wZG93blxuICAgICAqL1xuICAgIGluaXRpYWxpemVEaWRTb3VyY2VEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI2RpZF9zb3VyY2UnKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5zaWRlIGEgZHJvcGRvd24gc3RydWN0dXJlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQWxyZWFkeSBhIGRyb3Bkb3duLCBqdXN0IGVuc3VyZSBpdCdzIGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISRleGlzdGluZ0Ryb3Bkb3duLmhhc0NsYXNzKCdkaWQtc291cmNlLWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygnZGlkLXNvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkRpZFNvdXJjZUNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICdkZWZhdWx0JztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnZGVmYXVsdCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9EaWRTb3VyY2VEZWZhdWx0IHx8ICdEZWZhdWx0JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ3RvJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZVRvIHx8ICdUTyBoZWFkZXInIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnZGl2ZXJzaW9uJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnByX0RpZFNvdXJjZURpdmVyc2lvbiB8fCAnRGl2ZXJzaW9uIGhlYWRlcicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdjdXN0b20nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUucHJfRGlkU291cmNlQ3VzdG9tIHx8ICdDdXN0b20gaGVhZGVyJyB9XG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkcm9wZG93bkh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VsZWN0aW9uIGRyb3Bkb3duIGRpZC1zb3VyY2UtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaWRfc291cmNlXCIgaWQ9XCJkaWRfc291cmNlXCIgdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlZmF1bHQgdGV4dFwiPiR7b3B0aW9ucy5maW5kKG8gPT4gby52YWx1ZSA9PT0gY3VycmVudFZhbHVlKT8udGV4dCB8fCBjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtvcHRpb25zLm1hcChvcHQgPT4gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4+JHtvcHQudGV4dH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtvcHQudmFsdWUgPT09ICdjdXN0b20nID8gJzxpIGNsYXNzPVwic2V0dGluZ3MgaWNvbiByaWdodCBmbG9hdGVkXCI+PC9pPicgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICBgKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAkKCcuZGlkLXNvdXJjZS1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uRGlkU291cmNlQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgQ2FsbGVySUQgc291cmNlIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIENhbGxlcklEIHNvdXJjZVxuICAgICAqL1xuICAgIG9uQ2FsbGVySWRTb3VyY2VDaGFuZ2UodmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGN1c3RvbVNldHRpbmdzID0gJCgnI2NhbGxlcmlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICBpZiAodmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIGN1c3RvbSBoZWFkZXIgZmllbGQgcmVxdWlyZWRcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2ZhZGUgZG93bicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSByZXF1aXJlZCBzdGF0dXNcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIGZpZWxkcyB3aGVuIG5vdCBpbiB1c2VcbiAgICAgICAgICAgICQoJyNjaWRfY3VzdG9tX2hlYWRlcicpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9zdGFydCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9lbmQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfcmVnZXgnKS52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBESUQgc291cmNlIGNoYW5nZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIERJRCBzb3VyY2VcbiAgICAgKi9cbiAgICBvbkRpZFNvdXJjZUNoYW5nZSh2YWx1ZSkge1xuICAgICAgICBjb25zdCAkY3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICBpZiAodmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIGN1c3RvbSBoZWFkZXIgZmllbGQgcmVxdWlyZWRcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2ZhZGUgZG93bicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBjdXN0b20gc2V0dGluZ3MgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgJGN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIC8vIFJlbW92ZSByZXF1aXJlZCBzdGF0dXNcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIGZpZWxkcyB3aGVuIG5vdCBpbiB1c2VcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9zdGFydCcpLnZhbCgnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9lbmQnKS52YWwoJycpO1xuICAgICAgICAgICAgJCgnI2RpZF9wYXJzZXJfcmVnZXgnKS52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBQcm92aWRlcnNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCdcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvbW9kaWZ5c2lwL2A7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmFibGUgYXV0b21hdGljIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvblxuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gSU1QT1JUQU5UOiBEb24ndCBvdmVyd3JpdGUgcmVzdWx0LmRhdGEgLSBpdCBhbHJlYWR5IGNvbnRhaW5zIHByb2Nlc3NlZCBjaGVja2JveCB2YWx1ZXNcbiAgICAgICAgLy8gSnVzdCBhZGQvbW9kaWZ5IHNwZWNpZmljIGZpZWxkc1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9IHRoaXMucHJvdmlkZXJUeXBlO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGFkZGl0aW9uYWwgaG9zdHMgZm9yIFNJUCAtIGNvbGxlY3QgZnJvbSB0YWJsZVxuICAgICAgICBjb25zdCBhZGRpdGlvbmFsSG9zdHMgPSBbXTtcbiAgICAgICAgJCgnI2FkZGl0aW9uYWwtaG9zdHMtdGFibGUgdGJvZHkgdHIuaG9zdC1yb3cnKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaG9zdCA9ICQoZWxlbWVudCkuZmluZCgndGQuYWRkcmVzcycpLnRleHQoKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxIb3N0cy5wdXNoKHsgYWRkcmVzczogaG9zdCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBPbmx5IGFkZCBpZiB0aGVyZSBhcmUgaG9zdHNcbiAgICAgICAgaWYgKGFkZGl0aW9uYWxIb3N0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hZGRpdGlvbmFsSG9zdHMgPSBhZGRpdGlvbmFsSG9zdHM7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIE92ZXJyaWRlIHBvcHVsYXRlRm9ybURhdGEgdG8gaGFuZGxlIFNJUC1zcGVjaWZpYyBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IG1ldGhvZCBmaXJzdCBmb3IgY29tbW9uIGZpZWxkc1xuICAgICAgICBzdXBlci5wb3B1bGF0ZUZvcm1EYXRhKGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMucHJvdmlkZXJUeXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgLy8gU0lQLXNwZWNpZmljIGZpZWxkc1xuICAgICAgICAgICAgJCgnI2R0bWZtb2RlJykudmFsKGRhdGEuZHRtZm1vZGUgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLkRUTUZfTU9ERSk7XG4gICAgICAgICAgICAkKCcjdHJhbnNwb3J0JykudmFsKGRhdGEudHJhbnNwb3J0IHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5UUkFOU1BPUlQpO1xuICAgICAgICAgICAgJCgnI2Zyb211c2VyJykudmFsKGRhdGEuZnJvbXVzZXIgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2Zyb21kb21haW4nKS52YWwoZGF0YS5mcm9tZG9tYWluIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNvdXRib3VuZF9wcm94eScpLnZhbChkYXRhLm91dGJvdW5kX3Byb3h5IHx8ICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU0lQLXNwZWNpZmljIGNoZWNrYm94ZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmRpc2FibGVmcm9tdXNlciA9PT0gJzEnIHx8IGRhdGEuZGlzYWJsZWZyb211c2VyID09PSB0cnVlKSAkKCcjZGlzYWJsZWZyb211c2VyJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBRdWFsaWZ5IGZyZXF1ZW5jeVxuICAgICAgICAgICAgJCgnI3F1YWxpZnlmcmVxJykudmFsKGRhdGEucXVhbGlmeWZyZXEgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLlFVQUxJRllfRlJFUSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENhbGxlcklEL0RJRCBmaWVsZHNcbiAgICAgICAgICAgICQoJyNjaWRfc291cmNlJykudmFsKGRhdGEuY2lkX3NvdXJjZSB8fCAnZGVmYXVsdCcpO1xuICAgICAgICAgICAgJCgnI2RpZF9zb3VyY2UnKS52YWwoZGF0YS5kaWRfc291cmNlIHx8ICdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAkKCcjY2lkX2N1c3RvbV9oZWFkZXInKS52YWwoZGF0YS5jaWRfY3VzdG9tX2hlYWRlciB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjY2lkX3BhcnNlcl9zdGFydCcpLnZhbChkYXRhLmNpZF9wYXJzZXJfc3RhcnQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfZW5kJykudmFsKGRhdGEuY2lkX3BhcnNlcl9lbmQgfHwgJycpO1xuICAgICAgICAgICAgJCgnI2NpZF9wYXJzZXJfcmVnZXgnKS52YWwoZGF0YS5jaWRfcGFyc2VyX3JlZ2V4IHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfY3VzdG9tX2hlYWRlcicpLnZhbChkYXRhLmRpZF9jdXN0b21faGVhZGVyIHx8ICcnKTtcbiAgICAgICAgICAgICQoJyNkaWRfcGFyc2VyX3N0YXJ0JykudmFsKGRhdGEuZGlkX3BhcnNlcl9zdGFydCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9lbmQnKS52YWwoZGF0YS5kaWRfcGFyc2VyX2VuZCB8fCAnJyk7XG4gICAgICAgICAgICAkKCcjZGlkX3BhcnNlcl9yZWdleCcpLnZhbChkYXRhLmRpZF9wYXJzZXJfcmVnZXggfHwgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgY2lkX2RpZF9kZWJ1ZyBjaGVja2JveFxuICAgICAgICAgICAgaWYgKGRhdGEuY2lkX2RpZF9kZWJ1ZyA9PT0gJzEnIHx8IGRhdGEuY2lkX2RpZF9kZWJ1ZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICQoJyNjaWRfZGlkX2RlYnVnJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjY2lkX2RpZF9kZWJ1ZycpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB2YWx1ZXMgYWZ0ZXIgc2V0dGluZyBoaWRkZW4gaW5wdXRzXG4gICAgICAgICAgICBjb25zdCBkcm9wZG93blVwZGF0ZXMgPSBbXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJy5kdG1mLW1vZGUtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5kdG1mbW9kZSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuRFRNRl9NT0RFIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJy50cmFuc3BvcnQtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS50cmFuc3BvcnQgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLlRSQU5TUE9SVCB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6ICcucmVnaXN0cmF0aW9uLXR5cGUtZHJvcGRvd24nLCB2YWx1ZTogZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuUkVHSVNUUkFUSU9OX1RZUEUgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiAnLmNhbGxlcmlkLXNvdXJjZS1kcm9wZG93bicsIHZhbHVlOiBkYXRhLmNpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogJy5kaWQtc291cmNlLWRyb3Bkb3duJywgdmFsdWU6IGRhdGEuZGlkX3NvdXJjZSB8fCAnZGVmYXVsdCcgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZHJvcGRvd25VcGRhdGVzLmZvckVhY2goKHsgc2VsZWN0b3IsIHZhbHVlIH0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZGl0aW9uYWwgaG9zdHMgLSBwb3B1bGF0ZSBhZnRlciBmb3JtIGlzIHJlYWR5XG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRlQWRkaXRpb25hbEhvc3RzKGRhdGEuYWRkaXRpb25hbEhvc3RzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgc3VwZXIuY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuaWQgJiYgISQoJyNpZCcpLnZhbCgpKSB7XG4gICAgICAgICAgICAgICAgJCgnI2lkJykudmFsKHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGUgRm9ybS5qcyB3aWxsIGhhbmRsZSB0aGUgcmVsb2FkIGF1dG9tYXRpY2FsbHkgaWYgcmVzcG9uc2UucmVsb2FkIGlzIHByZXNlbnRcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgUkVTVCBBUEkgcmV0dXJucyByZWxvYWQgcGF0aCBsaWtlIFwicHJvdmlkZXJzL21vZGlmeXNpcC9TSVAtVFJVTksteHh4XCJcbiAgICAgICAgfVxuICAgIH1cbiAgICBcblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcnVsZXNNYXAgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDogKCkgPT4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCksXG4gICAgICAgICAgICBpbmJvdW5kOiAoKSA9PiB0aGlzLmdldEluYm91bmRSdWxlcygpLFxuICAgICAgICAgICAgbm9uZTogKCkgPT4gdGhpcy5nZXROb25lUnVsZXMoKSxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJ1bGVzID0gcnVsZXNNYXBbcmVnVHlwZV0gPyBydWxlc01hcFtyZWdUeXBlXSgpIDogdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQ2FsbGVySUQvRElEIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkQ2FsbGVySWREaWRSdWxlcyhydWxlcyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvbiBydWxlc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBydWxlcyAtIEV4aXN0aW5nIHJ1bGVzXG4gICAgICogQHJldHVybnMge29iamVjdH0gUnVsZXMgd2l0aCBDYWxsZXJJRC9ESUQgdmFsaWRhdGlvblxuICAgICAqL1xuICAgIGFkZENhbGxlcklkRGlkUnVsZXMocnVsZXMpIHtcbiAgICAgICAgY29uc3QgY2FsbGVySWRTb3VyY2UgPSAkKCcjY2lkX3NvdXJjZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBkaWRTb3VyY2UgPSAkKCcjZGlkX3NvdXJjZScpLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGN1c3RvbSBoZWFkZXIgdmFsaWRhdGlvbiB3aGVuIGN1c3RvbSBzb3VyY2UgaXMgc2VsZWN0ZWRcbiAgICAgICAgY29uc3QgY3VzdG9tSGVhZGVyUnVsZXMgPSB7XG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlQ3VzdG9tSGVhZGVyRW1wdHkgfHwgJ1BsZWFzZSBzcGVjaWZ5IGN1c3RvbSBoZWFkZXIgbmFtZScsXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cFsvXltBLVphLXowLTktX10rJC9dJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0ZUN1c3RvbUhlYWRlckZvcm1hdCB8fCAnSGVhZGVyIG5hbWUgY2FuIG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkYXNoIGFuZCB1bmRlcnNjb3JlJyxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FsbGVySWRTb3VyY2UgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICBydWxlcy5jaWRfY3VzdG9tX2hlYWRlciA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnY2lkX2N1c3RvbV9oZWFkZXInLFxuICAgICAgICAgICAgICAgIC4uLmN1c3RvbUhlYWRlclJ1bGVzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZGlkU291cmNlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgcnVsZXMuZGlkX2N1c3RvbV9oZWFkZXIgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2RpZF9jdXN0b21faGVhZGVyJyxcbiAgICAgICAgICAgICAgICAuLi5jdXN0b21IZWFkZXJSdWxlc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVnZXggdmFsaWRhdGlvbiBpZiBwcm92aWRlZCAob3B0aW9uYWwgZmllbGRzKVxuICAgICAgICBjb25zdCByZWdleFZhbGlkYXRpb25SdWxlID0ge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAnY2FsbGJhY2snLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgUmVnRXhwKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRlSW52YWxpZFJlZ2V4IHx8ICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbicsXG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKCQoJyNjaWRfcGFyc2VyX3JlZ2V4JykudmFsKCkpIHtcbiAgICAgICAgICAgIHJ1bGVzLmNpZF9wYXJzZXJfcmVnZXggPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NpZF9wYXJzZXJfcmVnZXgnLFxuICAgICAgICAgICAgICAgIC4uLnJlZ2V4VmFsaWRhdGlvblJ1bGVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICgkKCcjZGlkX3BhcnNlcl9yZWdleCcpLnZhbCgpKSB7XG4gICAgICAgICAgICBydWxlcy5kaWRfcGFyc2VyX3JlZ2V4ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkaWRfcGFyc2VyX3JlZ2V4JyxcbiAgICAgICAgICAgICAgICAuLi5yZWdleFZhbGlkYXRpb25SdWxlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG91dGJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldE91dGJvdW5kUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwb3J0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkaXRpb25hbF9ob3N0czoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhZGRpdGlvbmFsLWhvc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25BZGRpdGlvbmFsSG9zdEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbOF0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFkZGl0aW9uYWxfaG9zdHM6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnYWRkaXRpb25hbC1ob3N0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uQWRkaXRpb25hbEhvc3RJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBub25lIHJlZ2lzdHJhdGlvblxuICAgICAqL1xuICAgIGdldE5vbmVSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRpdGlvbmFsX2hvc3RzOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2FkZGl0aW9uYWwtaG9zdCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvbkFkZGl0aW9uYWxIb3N0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaG9zdCBsYWJlbCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RMYWJlbChyZWdUeXBlKSB7XG4gICAgICAgIGNvbnN0ICRob3N0TGFiZWxUZXh0ID0gJCgnI2hvc3RMYWJlbFRleHQnKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICAkaG9zdExhYmVsVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyB8fCAnUHJvdmlkZXIgSG9zdCBvciBJUCBBZGRyZXNzJyk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAkaG9zdExhYmVsVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MgfHwgJ1JlbW90ZSBIb3N0IG9yIElQIEFkZHJlc3MnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGb3IgaW5ib3VuZCwgdGhlIGZpZWxkIGlzIGhpZGRlbiBzbyBubyBuZWVkIHRvIHVwZGF0ZSBsYWJlbFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkgeyBcbiAgICAgICAgLy8gR2V0IGVsZW1lbnQgcmVmZXJlbmNlc1xuICAgICAgICBjb25zdCBlbEhvc3QgPSAkKCcjZWxIb3N0Jyk7XG4gICAgICAgIGNvbnN0IGVsVXNlcm5hbWUgPSAkKCcjZWxVc2VybmFtZScpO1xuICAgICAgICBjb25zdCBlbFNlY3JldCA9ICQoJyNlbFNlY3JldCcpO1xuICAgICAgICBjb25zdCBlbFBvcnQgPSAkKCcjZWxQb3J0Jyk7XG4gICAgICAgIGNvbnN0IGVsQWRkaXRpb25hbEhvc3QgPSAkKCcjZWxBZGRpdGlvbmFsSG9zdHMnKTtcbiAgICAgICAgY29uc3QgZWxOZXR3b3JrRmlsdGVyID0gJCgnI2VsTmV0d29ya0ZpbHRlcicpO1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IGdlblBhc3N3b3JkID0gJCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpO1xuXG4gICAgICAgIGNvbnN0IHZhbFVzZXJOYW1lID0gJCgnI3VzZXJuYW1lJyk7XG4gICAgICAgIGNvbnN0IHZhbFNlY3JldCA9IHRoaXMuJHNlY3JldDtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpO1xuXG4gICAgICAgIC8vIFJlc2V0IHVzZXJuYW1lIG9ubHkgd2hlbiBzd2l0Y2hpbmcgZnJvbSBpbmJvdW5kIHRvIG90aGVyIHR5cGVzXG4gICAgICAgIGlmICh2YWxVc2VyTmFtZS52YWwoKSA9PT0gcHJvdmlkZXJJZCAmJiByZWdUeXBlICE9PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgIHZhbFVzZXJOYW1lLnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsVXNlck5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcblxuICAgICAgICAvLyBIaWRlIHBhc3N3b3JkIHRvb2x0aXAgYnkgZGVmYXVsdFxuICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBob3N0IGxhYmVsIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIHRoaXMudXBkYXRlSG9zdExhYmVsKHJlZ1R5cGUpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBlbGVtZW50IHZpc2liaWxpdHkgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICBlbEFkZGl0aW9uYWxIb3N0LnNob3coKTsgLy8gU2hvdyBmb3IgYWxsIHJlZ2lzdHJhdGlvbiB0eXBlc1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLmhpZGUoKTsgLy8gTmV0d29yayBmaWx0ZXIgbm90IHJlbGV2YW50IGZvciBvdXRib3VuZFxuICAgICAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbCgnbm9uZScpOyAvLyBSZXNldCB0byBkZWZhdWx0XG4gICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhpZGUgcGFzc3dvcmQgbWFuYWdlbWVudCBidXR0b25zIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgICAgICAgICQoJyNlbFNlY3JldCAuYnV0dG9uLmNsaXBib2FyZCcpLmhpZGUoKTsgLy8gSGlkZSBjb3B5IGJ1dHRvblxuICAgICAgICAgICAgJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpLmhpZGUoKTsgLy8gSGlkZSBzaG93L2hpZGUgYnV0dG9uXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhpZGUgcGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yIGZvciBvdXRib3VuZFxuICAgICAgICAgICAgdGhpcy5oaWRlUGFzc3dvcmRTdHJlbmd0aEluZGljYXRvcigpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgdmFsVXNlck5hbWUudmFsKHByb3ZpZGVySWQpO1xuICAgICAgICAgICAgdmFsVXNlck5hbWUuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uIGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsU2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZWxIb3N0LmhpZGUoKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LmhpZGUoKTsgLy8gUG9ydCBub3QgbmVlZGVkIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLnNob3coKTsgLy8gTmV0d29yayBmaWx0ZXIgY3JpdGljYWwgZm9yIGluYm91bmQgc2VjdXJpdHlcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLnNob3coKTtcbiAgICAgICAgICAgIGVsQWRkaXRpb25hbEhvc3Quc2hvdygpOyAvLyBTaG93IGZvciBhbGwgcmVnaXN0cmF0aW9uIHR5cGVzXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgbWFuYWdlbWVudCBidXR0b25zIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvblxuICAgICAgICAgICAgJCgnI2VsU2VjcmV0IC5idXR0b24uY2xpcGJvYXJkJykuc2hvdygpOyAvLyBTaG93IGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJykuc2hvdygpOyAvLyBTaG93IHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBwYXNzd29yZCBzdHJlbmd0aCBpbmRpY2F0b3IgZm9yIGluYm91bmRcbiAgICAgICAgICAgIHRoaXMuc2hvd1Bhc3N3b3JkU3RyZW5ndGhJbmRpY2F0b3IoKTsgXG4gICAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBlcnJvcnMgZm9yIGhpZGRlbiBmaWVsZHNcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdob3N0Jyk7XG4gICAgICAgICAgICAkKCcjaG9zdCcpLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3BvcnQnKTtcbiAgICAgICAgICAgICQoJyNwb3J0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgZWxBZGRpdGlvbmFsSG9zdC5zaG93KCk7IC8vIFNob3cgZm9yIGFsbCByZWdpc3RyYXRpb24gdHlwZXNcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5zaG93KCk7IC8vIE5ldHdvcmsgZmlsdGVyIGNyaXRpY2FsIGZvciBub25lIHR5cGUgKG5vIGF1dGgpXG4gICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgbWFuYWdlbWVudCBidXR0b25zIGZvciBub25lIHJlZ2lzdHJhdGlvblxuICAgICAgICAgICAgJCgnI2VsU2VjcmV0IC5idXR0b24uY2xpcGJvYXJkJykuc2hvdygpOyAvLyBTaG93IGNvcHkgYnV0dG9uXG4gICAgICAgICAgICAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJykuc2hvdygpOyAvLyBTaG93IHNob3cvaGlkZSBidXR0b25cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyB0b29sdGlwIGljb24gZm9yIHBhc3N3b3JkIGZpZWxkXG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBwYXNzd29yZCBzdHJlbmd0aCBpbmRpY2F0b3IgZm9yIG5vbmUgdHlwZVxuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRTdHJlbmd0aEluZGljYXRvcigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZmllbGQgcmVxdWlyZW1lbnRzIC0gbWFrZSBwYXNzd29yZCBvcHRpb25hbCBpbiBub25lIG1vZGVcbiAgICAgICAgICAgICQoJyNlbFNlY3JldCcpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBwcm9tcHRzIGZvciBvcHRpb25hbCBmaWVsZHMgaW4gbm9uZSBtb2RlXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAndXNlcm5hbWUnKTtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdzZWNyZXQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBlbGVtZW50IHZpc2liaWxpdHkgYmFzZWQgb24gJ2Rpc2FibGVmcm9tdXNlcicgY2hlY2tib3hcbiAgICAgICAgLy8gVXNlIHRoZSBvdXRlciBkaXYuY2hlY2tib3ggY29udGFpbmVyIGluc3RlYWQgb2YgaW5wdXQgZWxlbWVudFxuICAgICAgICBjb25zdCBlbCA9ICQoJ2lucHV0W25hbWU9XCJkaXNhYmxlZnJvbXVzZXJcIl0nKS5jbG9zZXN0KCcudWkuY2hlY2tib3gnKTtcbiAgICAgICAgY29uc3QgZnJvbVVzZXIgPSAkKCcjZGl2RnJvbVVzZXInKTtcbiAgICAgICAgaWYgKGVsLmxlbmd0aCA+IDAgJiYgZWwuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgZnJvbVVzZXIuaGlkZSgpO1xuICAgICAgICAgICAgZnJvbVVzZXIucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyb21Vc2VyLnNob3coKTtcbiAgICAgICAgICAgIGZyb21Vc2VyLmFkZENsYXNzKCd2aXNpYmxlJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBDYWxsZXJJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGNpZERyb3Bkb3duID0gJCgnLmNhbGxlcmlkLXNvdXJjZS1kcm9wZG93bicpO1xuICAgICAgICBpZiAoY2lkRHJvcGRvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgY2lkVmFsdWUgPSBjaWREcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBjaWRDdXN0b21TZXR0aW5ncyA9ICQoJyNjYWxsZXJpZC1jdXN0b20tc2V0dGluZ3MnKTtcbiAgICAgICAgICAgIGlmIChjaWRWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHVzaW5nIEZvbWFudGljIFVJIHRyYW5zaXRpb25cbiAgICAgICAgICAgICAgICBjaWRDdXN0b21TZXR0aW5ncy50cmFuc2l0aW9uKCdzaG93Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGNpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ2hpZGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIERJRCBjdXN0b20gc2V0dGluZ3MgdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIGNvbnN0IGRpZERyb3Bkb3duID0gJCgnLmRpZC1zb3VyY2UtZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKGRpZERyb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZFZhbHVlID0gZGlkRHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgZGlkQ3VzdG9tU2V0dGluZ3MgPSAkKCcjZGlkLWN1c3RvbS1zZXR0aW5ncycpO1xuICAgICAgICAgICAgaWYgKGRpZFZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgdXNpbmcgRm9tYW50aWMgVUkgdHJhbnNpdGlvblxuICAgICAgICAgICAgICAgIGRpZEN1c3RvbVNldHRpbmdzLnRyYW5zaXRpb24oJ3Nob3cnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSB1c2luZyBGb21hbnRpYyBVSSB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgZGlkQ3VzdG9tU2V0dGluZ3MudHJhbnNpdGlvbignaGlkZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjb21wbGV0aW9uIG9mIGhvc3QgYWRkcmVzcyBpbnB1dFxuICAgICAqL1xuICAgIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzKCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FkZGl0aW9uYWwtaG9zdCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsdWUubWF0Y2godGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGlucHV0IHZhbHVlXG4gICAgICAgICAgICBpZiAodmFsaWRhdGlvbiA9PT0gbnVsbCB8fCB2YWxpZGF0aW9uLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudHJhbnNpdGlvbignc2hha2UnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBob3N0IGFkZHJlc3MgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIGlmICgkKGAuaG9zdC1yb3dbZGF0YS12YWx1ZT1cXFwiJHt2YWx1ZX1cXFwiXWApLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ciA9IHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RlbXBsYXRlLmxhc3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUoZmFsc2UpOyAvLyBVc2UgZmFsc2Ugc2luY2UgZXZlbnRzIGFyZSBkZWxlZ2F0ZWRcbiAgICAgICAgICAgICAgICAkY2xvbmVcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdob3N0LXJvdy10cGwnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2hvc3Qtcm93JylcbiAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuYXR0cignZGF0YS12YWx1ZScsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmFkZHJlc3MnKS5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkZXhpc3RpbmdIb3N0Um93cyA9IHRoaXMuJGZvcm1PYmouZmluZChQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XKTtcbiAgICAgICAgICAgICAgICBpZiAoJGV4aXN0aW5nSG9zdFJvd3MubGFzdCgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAkdHIuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVIb3N0c1RhYmxlVmlldygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0SW5wdXQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBob3N0cyB0YWJsZVxuICAgICAqL1xuICAgIHVwZGF0ZUhvc3RzVGFibGVWaWV3KCkge1xuICAgICAgICBjb25zdCAkaG9zdFJvd3MgPSB0aGlzLiRmb3JtT2JqLmZpbmQoUHJvdmlkZXJTSVAuU0lQX1NFTEVDVE9SUy5IT1NUX1JPVyk7XG4gICAgICAgIGlmICgkaG9zdFJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiRhZGRpdGlvbmFsSG9zdHNEdW1teS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBwYXNzd29yZCBzdHJlbmd0aCBpbmRpY2F0b3IgYW5kIHRyaWdnZXIgaW5pdGlhbCBjaGVja1xuICAgICAqL1xuICAgIHNob3dQYXNzd29yZFN0cmVuZ3RoSW5kaWNhdG9yKCkge1xuICAgICAgICBjb25zdCAkcGFzc3dvcmRQcm9ncmVzcyA9ICQoJyNwYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpO1xuICAgICAgICBpZiAoJHBhc3N3b3JkUHJvZ3Jlc3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwcm9ncmVzcyBjb21wb25lbnQgaWYgbm90IGFscmVhZHkgZG9uZVxuICAgICAgICAgICAgaWYgKCEkcGFzc3dvcmRQcm9ncmVzcy5oYXNDbGFzcygncHJvZ3Jlc3MnKSkge1xuICAgICAgICAgICAgICAgICRwYXNzd29yZFByb2dyZXNzLnByb2dyZXNzKHtcbiAgICAgICAgICAgICAgICAgICAgcGVyY2VudDogMCxcbiAgICAgICAgICAgICAgICAgICAgc2hvd0FjdGl2aXR5OiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAkcGFzc3dvcmRQcm9ncmVzcy5zaG93KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgcGFzc3dvcmQgc3RyZW5ndGggY2hlY2sgaWYgcGFzc3dvcmQgZXhpc3RzXG4gICAgICAgICAgICBpZiAodGhpcy4kc2VjcmV0LnZhbCgpICYmIHR5cGVvZiBQYXNzd29yZFNjb3JlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFBhc3N3b3JkU2NvcmUuY2hlY2tQYXNzU3RyZW5ndGgoe1xuICAgICAgICAgICAgICAgICAgICBwYXNzOiB0aGlzLiRzZWNyZXQudmFsKCksXG4gICAgICAgICAgICAgICAgICAgIGJhcjogJHBhc3N3b3JkUHJvZ3Jlc3MsXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246ICRwYXNzd29yZFByb2dyZXNzXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBwYXNzd29yZCBzdHJlbmd0aCBpbmRpY2F0b3JcbiAgICAgKi9cbiAgICBoaWRlUGFzc3dvcmRTdHJlbmd0aEluZGljYXRvcigpIHtcbiAgICAgICAgY29uc3QgJHBhc3N3b3JkUHJvZ3Jlc3MgPSAkKCcjcGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgaWYgKCRwYXNzd29yZFByb2dyZXNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRwYXNzd29yZFByb2dyZXNzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBhZGRpdGlvbmFsIGhvc3RzIGZyb20gQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBhZGRpdGlvbmFsSG9zdHMgLSBBcnJheSBvZiBhZGRpdGlvbmFsIGhvc3RzIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVBZGRpdGlvbmFsSG9zdHMoYWRkaXRpb25hbEhvc3RzKSB7XG4gICAgICAgIGlmICghYWRkaXRpb25hbEhvc3RzIHx8ICFBcnJheS5pc0FycmF5KGFkZGl0aW9uYWxIb3N0cykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgaG9zdHMgZmlyc3QgKGV4Y2VwdCB0ZW1wbGF0ZSBhbmQgZHVtbXkpXG4gICAgICAgIHRoaXMuJGFkZGl0aW9uYWxIb3N0c1RhYmxlLmZpbmQoYHRib2R5IHRyJHtQcm92aWRlclNJUC5TSVBfU0VMRUNUT1JTLkhPU1RfUk9XfWApLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGVhY2ggaG9zdCB1c2luZyB0aGUgc2FtZSBsb2dpYyBhcyBjYk9uQ29tcGxldGVIb3N0QWRkcmVzc1xuICAgICAgICBhZGRpdGlvbmFsSG9zdHMuZm9yRWFjaCgoaG9zdE9iaikgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIGJvdGggb2JqZWN0IGZvcm1hdCB7aWQsIGFkZHJlc3N9IGFuZCBzdHJpbmcgZm9ybWF0XG4gICAgICAgICAgICBjb25zdCBob3N0QWRkcmVzcyA9IHR5cGVvZiBob3N0T2JqID09PSAnc3RyaW5nJyA/IGhvc3RPYmogOiBob3N0T2JqLmFkZHJlc3M7XG4gICAgICAgICAgICBpZiAoaG9zdEFkZHJlc3MgJiYgaG9zdEFkZHJlc3MudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBzYW1lIGxvZ2ljIGFzIGNiT25Db21wbGV0ZUhvc3RBZGRyZXNzXG4gICAgICAgICAgICAgICAgY29uc3QgJHRyID0gdGhpcy4kYWRkaXRpb25hbEhvc3RzVGVtcGxhdGUubGFzdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjbG9uZSA9ICR0ci5jbG9uZShmYWxzZSk7IC8vIFVzZSBmYWxzZSBzaW5jZSBldmVudHMgYXJlIGRlbGVnYXRlZFxuICAgICAgICAgICAgICAgICRjbG9uZVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hvc3Qtcm93LXRwbCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnaG9zdC1yb3cnKVxuICAgICAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICAgICAgICAgICRjbG9uZS5hdHRyKCdkYXRhLXZhbHVlJywgaG9zdEFkZHJlc3MpO1xuICAgICAgICAgICAgICAgICRjbG9uZS5maW5kKCcuYWRkcmVzcycpLmh0bWwoaG9zdEFkZHJlc3MpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluc2VydCB0aGUgY2xvbmVkIHJvd1xuICAgICAgICAgICAgICAgIGNvbnN0ICRleGlzdGluZ0hvc3RSb3dzID0gdGhpcy4kZm9ybU9iai5maW5kKFByb3ZpZGVyU0lQLlNJUF9TRUxFQ1RPUlMuSE9TVF9ST1cpO1xuICAgICAgICAgICAgICAgIGlmICgkZXhpc3RpbmdIb3N0Um93cy5sYXN0KCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ci5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRleGlzdGluZ0hvc3RSb3dzLmxhc3QoKS5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGFibGUgdmlzaWJpbGl0eVxuICAgICAgICB0aGlzLnVwZGF0ZUhvc3RzVGFibGVWaWV3KCk7XG4gICAgfVxufSJdfQ==